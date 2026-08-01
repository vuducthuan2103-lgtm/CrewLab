import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

from app.core.db import engine
from app.core.auth import get_current_auth, AuthContext, check_idempotency, save_idempotency
from app.models.content import ContentItem
from app.models.system import TaskLog
from app.models.reviews import HitlReview
from app.services.p01_lite import upsert_agent_memory, determine_agent_for_reject_reason
from app.api.schemas import (
    ApiResponse, ErrorDetail, ContentItemOut, TaskLogOut,
    ApproveRequest, RejectRequest, MarkPostedRequest
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/portal", tags=["portal"])
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# ─── 1. Get Content Items ───────────────────────────────────────────────────
@router.get("/content-items", response_model=ApiResponse[List[ContentItemOut]])
async def list_content_items(
    status: Optional[str] = Query(None),
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(ContentItem).where(ContentItem.client_id == auth.client_id)
    if status:
        stmt = stmt.where(ContentItem.status == status)
    stmt = stmt.order_by(ContentItem.created_at.desc())
    
    res = await db.execute(stmt)
    items = res.scalars().all()
    out = [ContentItemOut.model_validate(i) for i in items]
    return ApiResponse(success=True, data=out)

# ─── 2. Approve Content Item (Gate 2) ─────────────────────────────────────────
@router.post("/content-items/{item_id}/approve", response_model=ApiResponse[dict])
async def approve_content_item(
    item_id: uuid.UUID,
    req: ApproveRequest,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db)
):
    # Idempotency check
    cached = check_idempotency(req.idempotency_key)
    if cached:
        return ApiResponse(success=True, data=cached)

    item = await db.get(ContentItem, item_id)
    if not item or item.client_id != auth.client_id:
        return ApiResponse(success=False, error=ErrorDetail(error_code="404", message="Content item not found"))

    if item.status != "pending_content_approval":
        return ApiResponse(
            success=False,
            error=ErrorDetail(error_code="409", message=f"Item in state '{item.status}', expected 'pending_content_approval'")
        )

    if req.edited_caption:
        item.client_edited_caption = req.edited_caption
        # Trigger P01-lite for D01
        await upsert_agent_memory(
            session=db,
            client_id=auth.client_id,
            content_item_id=item.id,
            agent_code="D01",
            task_type="write_caption",
            input_summary="Client edited caption on approve",
            output_summary=req.edited_caption,
            human_feedback=f"Client edited caption: {req.edited_caption}"
        )

    item.status = "approved_ready_to_post"

    review = HitlReview(
        client_id=auth.client_id,
        gate_type="content_approval",
        target_id=item.id,
        content_item_id=item.id,
        reviewer_id=auth.user_id,
        action="approved",
        edited_caption=req.edited_caption
    )
    db.add(review)
    await db.commit()

    res_data = {"status": "approved", "new_state": "approved_ready_to_post", "review_id": str(review.id)}
    save_idempotency(req.idempotency_key, res_data)
    return ApiResponse(success=True, data=res_data)

# ─── 3. Reject Content Item (Gate 2) ──────────────────────────────────────────
@router.post("/content-items/{item_id}/reject", response_model=ApiResponse[dict])
async def reject_content_item(
    item_id: uuid.UUID,
    req: RejectRequest,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db)
):
    cached = check_idempotency(req.idempotency_key)
    if cached:
        return ApiResponse(success=True, data=cached)

    item = await db.get(ContentItem, item_id)
    if not item or item.client_id != auth.client_id:
        return ApiResponse(success=False, error=ErrorDetail(error_code="404", message="Content item not found"))

    if item.status != "pending_content_approval":
        return ApiResponse(
            success=False,
            error=ErrorDetail(error_code="409", message=f"Item in state '{item.status}', expected 'pending_content_approval'")
        )

    # State -> rejected (Terminal). NO CHANGE to eval_retry_count
    item.status = "rejected"
    item.fix_instructions = f"[{req.reject_reason}] {req.feedback_text}"

    # Route feedback via P01-lite
    target_agent = determine_agent_for_reject_reason(req.reject_reason)
    await upsert_agent_memory(
        session=db,
        client_id=auth.client_id,
        content_item_id=item.id,
        agent_code=target_agent,
        task_type="creative_execution",
        input_summary=f"Client rejected with reason {req.reject_reason}",
        output_summary=item.caption or "",
        human_feedback=f"[{req.reject_reason}] {req.feedback_text}"
    )

    review = HitlReview(
        client_id=auth.client_id,
        gate_type="content_approval",
        target_id=item.id,
        content_item_id=item.id,
        reviewer_id=auth.user_id,
        action="rejected",
        reject_reason=req.reject_reason,
        feedback_text=req.feedback_text
    )
    db.add(review)
    await db.commit()

    res_data = {"status": "rejected", "new_state": "rejected", "review_id": str(review.id)}
    save_idempotency(req.idempotency_key, res_data)
    return ApiResponse(success=True, data=res_data)

# ─── 4. Mark as Posted ───────────────────────────────────────────────────────
@router.post("/content-items/{item_id}/mark-posted", response_model=ApiResponse[dict])
async def mark_posted(
    item_id: uuid.UUID,
    req: MarkPostedRequest,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db)
):
    cached = check_idempotency(req.idempotency_key)
    if cached:
        return ApiResponse(success=True, data=cached)

    item = await db.get(ContentItem, item_id)
    if not item or item.client_id != auth.client_id:
        return ApiResponse(success=False, error=ErrorDetail(error_code="404", message="Content item not found"))

    if item.status != "approved_ready_to_post":
        return ApiResponse(
            success=False,
            error=ErrorDetail(error_code="409", message=f"Item in state '{item.status}', expected 'approved_ready_to_post'")
        )

    item.status = "posted"
    item.posted_at = datetime.now(timezone.utc)

    review = HitlReview(
        client_id=auth.client_id,
        gate_type="content_approval",
        target_id=item.id,
        content_item_id=item.id,
        reviewer_id=auth.user_id,
        action="marked_posted"
    )
    db.add(review)
    await db.commit()

    res_data = {"status": "posted", "posted_at": item.posted_at.isoformat()}
    save_idempotency(req.idempotency_key, res_data)
    return ApiResponse(success=True, data=res_data)

# ─── 5. Task Logs ─────────────────────────────────────────────────────────────
@router.get("/task-logs", response_model=ApiResponse[List[TaskLogOut]])
async def list_task_logs(
    limit: int = Query(50),
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(TaskLog).where(TaskLog.client_id == auth.client_id).order_by(TaskLog.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    logs = res.scalars().all()
    out = [TaskLogOut.model_validate(l) for l in logs]
    return ApiResponse(success=True, data=out)

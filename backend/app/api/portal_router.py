import logging
import hashlib
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, sessionmaker
from datetime import datetime, timezone

from app.core.db import engine
from app.core.celery_app import celery_app
from app.core.auth import get_current_auth, AuthContext, check_idempotency, save_idempotency
from app.models.content import ContentItem, ContentPillar, WorkflowCycle
from app.models.clients import Client, BrandSetting, BrandSettingHistory
from app.models.llm_config import ClientLLMConfig
from app.models.provider_credentials import ClientProviderCredential
from app.core.model_catalog import eligible_models, validate_model_selection
from app.models.assets import BrandAsset, SemanticAssetRecord, VisualSelectionDecision
from app.models.system import TaskLog
from app.models.reviews import AgentMemory, HitlReview
from app.services.a01_chat import list_a01_chat_history, parse_chat_task_type, run_a01_chat
from app.services.task_errors import classify_task_error, log_task_failure
from app.services.asset_service import (
    ImageUploadValidationError,
    find_duplicate_source,
    inspect_image_upload,
)
from app.services.storage import (
    BRAND_ASSETS_BUCKET,
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_BYTES,
    client_asset_path,
    delete_files,
    upload_file,
    get_signed_url,
)
from app.services.p01_lite import upsert_agent_memory, determine_agent_for_reject_reason
from app.api.schemas import (
    ApiResponse, ErrorDetail, ContentItemOut, TaskLogOut,
    ApproveRequest, RejectRequest, MarkPostedRequest,
    ConfirmPillarsRequest, ApproveWeekRequest,
    BrandVoiceUpdate, AgentConfigUpdate,
    PillarOut, BrandAssetOut,
    A01ChatRequest, A01ChatMessageOut,
    PortalBootstrapOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/portal", tags=["portal"])
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def _content_item_out(db: AsyncSession, item: ContentItem) -> ContentItemOut:
    """Project a private derivative path to a short-lived URL at the API edge."""
    output = ContentItemOut.model_validate(item)
    decisions = (
        await db.scalars(
            select(VisualSelectionDecision)
            .where(
                VisualSelectionDecision.client_id == item.client_id,
                VisualSelectionDecision.content_item_id == item.id,
            )
            .order_by(VisualSelectionDecision.run_number.asc())
        )
    ).all()
    output = output.model_copy(update={
        "image_provenance_history": [
            {
                "id": str(decision.id),
                "run_number": decision.run_number,
                "wake_reason": decision.wake_reason,
                "source_asset_id": str(decision.source_asset_id) if decision.source_asset_id else None,
                "derivative_asset_id": str(decision.derivative_asset_id),
                "generation_mode": decision.generation_mode,
                "selection_score": decision.selection_score,
                "selection_rationale": decision.selection_rationale,
                "candidates": decision.candidates or [],
                "eligibility_exclusions": decision.eligibility_exclusions or [],
                "prompt_summary": decision.prompt_summary,
                "technical_validation": decision.technical_validation or {},
                "created_at": decision.created_at.isoformat(),
            }
            for decision in decisions
        ]
    })
    provenance = item.image_provenance or {}
    derivative_id = provenance.get("derivative_asset_id")
    if not derivative_id:
        return output
    try:
        derivative_uuid = uuid.UUID(str(derivative_id))
    except (TypeError, ValueError):
        return output
    derivative = await db.scalar(
        select(BrandAsset).where(
            BrandAsset.id == derivative_uuid,
            BrandAsset.client_id == item.client_id,
        )
    )
    if derivative and derivative.storage_path:
        signed_url = get_signed_url(BRAND_ASSETS_BUCKET, derivative.storage_path)
        if signed_url:
            return output.model_copy(update={"image_url": signed_url})
    return output


@router.get("/bootstrap", response_model=ApiResponse[PortalBootstrapOut])
async def get_portal_bootstrap(
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    client = await db.get(Client, auth.client_id)
    if client is None or not client.is_active:
        raise HTTPException(status_code=403, detail="Portal client is unavailable")

    cycle = await db.scalar(
        select(WorkflowCycle)
        .where(WorkflowCycle.client_id == auth.client_id)
        .order_by(WorkflowCycle.created_at.desc())
        .limit(1)
    )
    task_result = await db.execute(
        select(TaskLog)
        .where(TaskLog.client_id == auth.client_id)
        .order_by(TaskLog.created_at.desc())
        .limit(50)
    )
    content_items = []
    pillars = []
    if cycle is not None:
        content_result = await db.execute(
            select(ContentItem)
            .where(
                ContentItem.client_id == auth.client_id,
                ContentItem.cycle_id == cycle.id,
            )
            .order_by(ContentItem.created_at.desc())
        )
        content_items = [
            await _content_item_out(db, item)
            for item in content_result.scalars().all()
        ]
        pillar_result = await db.execute(
            select(ContentPillar)
            .where(
                ContentPillar.client_id == auth.client_id,
                ContentPillar.cycle_id == cycle.id,
            )
            .order_by(ContentPillar.created_at.asc())
        )
        pillars = [PillarOut.model_validate(item) for item in pillar_result.scalars().all()]

    return ApiResponse(
        success=True,
        data={
            "viewer": {
                "user_id": auth.user_id,
                "email": auth.email,
                "role": auth.role,
            },
            "client": {
                "id": client.id,
                "brand_name": client.brand_name,
            },
            "work_board": {
                "content_items": content_items,
                "task_logs": [
                    TaskLogOut.model_validate(item)
                    for item in task_result.scalars().all()
                ],
                "pillars": pillars,
                "schedule": {
                    "cycle_id": cycle.id if cycle else None,
                    "phase": cycle.phase if cycle else None,
                },
            },
        },
    )


def _a01_chat_message(memory: AgentMemory) -> A01ChatMessageOut:
    action, dispatch_status = parse_chat_task_type(memory.task_type)
    return A01ChatMessageOut(
        id=memory.id,
        user_message=memory.input_summary,
        assistant_message=memory.output_summary,
        action=action,
        content_item_id=memory.content_item_id,
        dispatch_status=dispatch_status,
        created_at=memory.created_at,
    )


@router.get("/a01/messages", response_model=ApiResponse[List[A01ChatMessageOut]])
async def list_a01_messages(
    limit: int = Query(50, ge=1, le=100),
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    history = await list_a01_chat_history(db, auth.client_id, limit=limit)
    return ApiResponse(success=True, data=[_a01_chat_message(message) for message in history])


@router.post("/a01/messages", response_model=ApiResponse[A01ChatMessageOut])
async def send_a01_message(
    req: A01ChatRequest,
    request: Request,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    cached = check_idempotency(
        req.idempotency_key,
        client_id=auth.client_id,
        operation="a01_message",
    )
    if cached:
        return ApiResponse(success=True, data=A01ChatMessageOut.model_validate(cached))

    try:
        memory, _ = await run_a01_chat(db, auth.client_id, req.message)
    except Exception as exc:
        await db.rollback()
        logger.exception("A01 chat failed for client %s", auth.client_id)
        error = classify_task_error(exc)
        support_reference = getattr(request.state, "request_id", None)
        try:
            await log_task_failure(
                db,
                client_id=auth.client_id,
                agent_code="A01",
                task_type="portal_chat",
                wake_reason="task_assigned",
                exc=exc,
            )
        except Exception:
            logger.exception("Could not persist A01 failure task log")
        return ApiResponse(
            success=False,
            error=ErrorDetail(
                error_code=error.code,
                message="A01 chưa thể xử lý yêu cầu. Hãy dùng mã hỗ trợ để kiểm tra chi tiết.",
                details={
                    "provider": error.provider,
                    "provider_request_id": error.provider_request_id,
                    "support_reference": support_reference,
                },
            ),
        )

    data = _a01_chat_message(memory)
    save_idempotency(
        req.idempotency_key,
        data.model_dump(mode="json"),
        client_id=auth.client_id,
        operation="a01_message",
    )
    return ApiResponse(success=True, data=data)

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
    out = [await _content_item_out(db, item) for item in items]
    return ApiResponse(success=True, data=out)


@router.get("/pillars", response_model=ApiResponse[List[PillarOut]])
async def list_pillars(
    cycle_id: Optional[uuid.UUID] = Query(None),
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ContentPillar).where(ContentPillar.client_id == auth.client_id)
    if cycle_id:
        stmt = stmt.where(ContentPillar.cycle_id == cycle_id)
    result = await db.execute(stmt.order_by(ContentPillar.created_at.asc()))
    return ApiResponse(success=True, data=[PillarOut.model_validate(p) for p in result.scalars().all()])


@router.post("/pillars/{pillar_id}/confirm", response_model=ApiResponse[dict])
async def confirm_pillars(
    pillar_id: uuid.UUID,
    req: ConfirmPillarsRequest,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    cached = check_idempotency(
        req.idempotency_key,
        client_id=auth.client_id,
        operation="confirm_pillars",
        target_id=pillar_id,
    )
    if cached:
        return ApiResponse(success=True, data=cached)

    anchor = await db.scalar(
        select(ContentPillar).where(
            ContentPillar.id == pillar_id,
            ContentPillar.client_id == auth.client_id,
        )
    )
    if not anchor:
        return ApiResponse(success=False, error=ErrorDetail(error_code="404", message="Pillar not found"))

    requested_ids = {pillar.id for pillar in req.pillars}
    result = await db.execute(
        select(ContentPillar).where(
            ContentPillar.client_id == auth.client_id,
            ContentPillar.cycle_id == anchor.cycle_id,
            ContentPillar.id.in_(requested_ids),
        )
    )
    current = {pillar.id: pillar for pillar in result.scalars().all()}
    if len(current) != len(requested_ids):
        return ApiResponse(
            success=False,
            error=ErrorDetail(error_code="validation_unknown_pillar", message="One or more pillars are not in this cycle"),
        )

    for item in req.pillars:
        current[item.id].weight = item.weight

    review = HitlReview(
        client_id=auth.client_id,
        gate_type="pillar",
        target_id=anchor.cycle_id,
        reviewer_id=auth.user_id,
        action="approved",
    )
    db.add(review)
    await db.commit()
    data = {"status": "approved", "next_agent": "B03", "cycle_id": str(anchor.cycle_id)}
    save_idempotency(
        req.idempotency_key,
        data,
        client_id=auth.client_id,
        operation="confirm_pillars",
        target_id=pillar_id,
    )
    return ApiResponse(success=True, data=data)


@router.post("/cycles/{cycle_id}/approve-week", response_model=ApiResponse[dict])
async def approve_week(
    cycle_id: uuid.UUID,
    req: ApproveWeekRequest,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    cached = check_idempotency(
        req.idempotency_key,
        client_id=auth.client_id,
        operation="approve_week",
        target_id=cycle_id,
    )
    if cached:
        return ApiResponse(success=True, data=cached)

    cycle = await db.scalar(
        select(WorkflowCycle).where(
            WorkflowCycle.id == cycle_id,
            WorkflowCycle.client_id == auth.client_id,
        )
    )
    if not cycle:
        return ApiResponse(success=False, error=ErrorDetail(error_code="404", message="Workflow cycle not found"))
    if cycle.phase != "strategy":
        return ApiResponse(success=False, error=ErrorDetail(error_code="409", message="This cycle has already passed strategy approval"))
    if req.content_plan_id != cycle_id:
        return ApiResponse(success=False, error=ErrorDetail(error_code="422", message="Content plan does not belong to this cycle"))

    result = await db.execute(
        select(ContentItem).where(
            ContentItem.client_id == auth.client_id,
            ContentItem.cycle_id == cycle_id,
            ContentItem.status == "planned",
        )
    )
    items = result.scalars().all()
    for item in items:
        item.status = "ready_for_generation"
    cycle.phase = "content_production"
    review = HitlReview(
        client_id=auth.client_id,
        gate_type="plan",
        target_id=cycle_id,
        reviewer_id=auth.user_id,
        action="approved",
    )
    db.add(review)
    await db.commit()
    data = {"items_transitioned": len(items), "next_agent": "D01", "cycle_id": str(cycle_id)}
    save_idempotency(
        req.idempotency_key,
        data,
        client_id=auth.client_id,
        operation="approve_week",
        target_id=cycle_id,
    )
    return ApiResponse(success=True, data=data)

# ─── 2. Approve Content Item (Gate 2) ─────────────────────────────────────────
@router.post("/content-items/{item_id}/approve", response_model=ApiResponse[dict])
async def approve_content_item(
    item_id: uuid.UUID,
    req: ApproveRequest,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db)
):
    # Idempotency check
    cached = check_idempotency(
        req.idempotency_key,
        client_id=auth.client_id,
        operation="approve_content_item",
        target_id=item_id,
    )
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
    save_idempotency(
        req.idempotency_key,
        res_data,
        client_id=auth.client_id,
        operation="approve_content_item",
        target_id=item_id,
    )
    return ApiResponse(success=True, data=res_data)

# ─── 3. Reject Content Item (Gate 2) ──────────────────────────────────────────
@router.post("/content-items/{item_id}/reject", response_model=ApiResponse[dict])
async def reject_content_item(
    item_id: uuid.UUID,
    req: RejectRequest,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db)
):
    cached = check_idempotency(
        req.idempotency_key,
        client_id=auth.client_id,
        operation="reject_content_item",
        target_id=item_id,
    )
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
    save_idempotency(
        req.idempotency_key,
        res_data,
        client_id=auth.client_id,
        operation="reject_content_item",
        target_id=item_id,
    )
    return ApiResponse(success=True, data=res_data)

# ─── 4. Mark as Posted ───────────────────────────────────────────────────────
@router.post("/content-items/{item_id}/mark-posted", response_model=ApiResponse[dict])
async def mark_posted(
    item_id: uuid.UUID,
    req: MarkPostedRequest,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db)
):
    cached = check_idempotency(
        req.idempotency_key,
        client_id=auth.client_id,
        operation="mark_posted",
        target_id=item_id,
    )
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
    save_idempotency(
        req.idempotency_key,
        res_data,
        client_id=auth.client_id,
        operation="mark_posted",
        target_id=item_id,
    )
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


@router.get("/assets", response_model=ApiResponse[List[BrandAssetOut]])
async def list_assets(
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BrandAsset).options(selectinload(BrandAsset.semantic_record))
        .where(BrandAsset.client_id == auth.client_id)
        .order_by(BrandAsset.created_at.desc())
    )
    assets = []
    for asset in result.scalars().all():
        signed = get_signed_url(BRAND_ASSETS_BUCKET, asset.storage_path) if asset.storage_path else asset.url
        assets.append(BrandAssetOut(
            id=asset.id, url=signed or asset.url,
            file_name=asset.file_name, storage_path=asset.storage_path, tags=asset.tags,
            source=asset.source, status=asset.status,
            usage_rights=asset.usage_rights, dimensions=asset.dimensions,
            indexing_status=asset.semantic_record.status if asset.semantic_record else "processing",
            indexing_reason=asset.semantic_record.failure_reason if asset.semantic_record else None,
            semantic_summary=asset.semantic_record.semantic_summary if asset.semantic_record else None,
            suggested_tags=asset.semantic_record.suggested_tags if asset.semantic_record else None,
            replaces_asset_id=asset.replaces_asset_id,
            ready_for_d02=(
                asset.status == "approved"
                and bool(asset.usage_rights)
                and asset.usage_rights not in {"unknown", "denied", "expired", "restricted", "none"}
                and asset.semantic_record is not None
                and asset.semantic_record.status == "ready"
            ),
            created_at=asset.created_at,
        ))
    return ApiResponse(success=True, data=assets)


@router.post("/assets/upload", response_model=ApiResponse[BrandAssetOut])
async def upload_portal_asset(
    request: Request,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    content_type = (request.headers.get("content-type") or "").split(";", 1)[0].lower()
    file_name = request.headers.get("x-file-name") or "upload"
    rights_attested = (
        request.headers.get("x-asset-rights-attested") or ""
    ).strip().lower() in {"1", "true", "yes"}
    if content_type not in ALLOWED_IMAGE_TYPES:
        return ApiResponse(success=False, error=ErrorDetail(error_code="invalid_file_type", message="Only JPEG, PNG and WebP images are supported"))
    body = await request.body()
    if not body or len(body) > MAX_IMAGE_BYTES:
        return ApiResponse(success=False, error=ErrorDetail(error_code="invalid_file_size", message="Image must be smaller than 50 MB"))
    try:
        inspection = inspect_image_upload(body, content_type)
    except ImageUploadValidationError as exc:
        return ApiResponse(
            success=False,
            error=ErrorDetail(error_code=exc.code, message=str(exc)),
        )

    content_sha256 = hashlib.sha256(body).hexdigest()
    duplicate = await find_duplicate_source(
        db,
        client_id=auth.client_id,
        content_sha256=content_sha256,
    )
    if duplicate is not None:
        if rights_attested:
            duplicate.status = "approved"
            duplicate.usage_rights = "client_owned"
        semantic_record = await db.scalar(
            select(SemanticAssetRecord).where(
                SemanticAssetRecord.client_id == auth.client_id,
                SemanticAssetRecord.source_asset_id == duplicate.id,
            )
        )
        if semantic_record is None:
            semantic_record = SemanticAssetRecord(
                client_id=auth.client_id,
                source_asset_id=duplicate.id,
                content_fingerprint=duplicate.content_sha256,
                status="processing",
            )
            db.add(semantic_record)
            await db.commit()
        elif rights_attested:
            await db.commit()
        should_retry_index = semantic_record.status == "processing" or (
            semantic_record.status == "failed"
            and semantic_record.failure_reason in {
                "semantic_index_dispatch_failed",
                "semantic_indexing_retries_exhausted",
                "storage_signed_url_unavailable",
            }
        ) or (
            semantic_record.status == "needs_attention"
            and semantic_record.failure_reason == "embedding_provider_unavailable"
        )
        if should_retry_index:
            semantic_record.status = "processing"
            semantic_record.failure_reason = None
            await db.commit()
            try:
                celery_app.send_task(
                    "assets.index_semantic",
                    args=[str(auth.client_id), str(duplicate.id)],
                )
            except Exception:
                semantic_record.status = "failed"
                semantic_record.failure_reason = "semantic_index_dispatch_failed"
                await db.commit()
                logger.exception("Could not re-enqueue semantic indexing for asset=%s", duplicate.id)
        return ApiResponse(success=True, data=BrandAssetOut(
            id=duplicate.id,
            url=get_signed_url(BRAND_ASSETS_BUCKET, duplicate.storage_path) or duplicate.url,
            file_name=duplicate.file_name,
            storage_path=duplicate.storage_path,
            tags=duplicate.tags,
            source=duplicate.source,
            status=duplicate.status,
            usage_rights=duplicate.usage_rights,
            dimensions=duplicate.dimensions,
            indexing_status=semantic_record.status if semantic_record else "processing",
            indexing_reason=semantic_record.failure_reason if semantic_record else None,
            semantic_summary=semantic_record.semantic_summary if semantic_record else None,
            suggested_tags=semantic_record.suggested_tags if semantic_record else None,
            duplicate_of_asset_id=duplicate.id,
            ready_for_d02=(
                duplicate.status == "approved"
                and bool(duplicate.usage_rights)
                and duplicate.usage_rights not in {"unknown", "denied", "expired", "restricted", "none"}
                and semantic_record is not None
                and semantic_record.status == "ready"
            ),
            created_at=duplicate.created_at,
        ))

    asset_id = uuid.uuid4()
    path = client_asset_path(str(auth.client_id), str(asset_id), content_type)
    if not upload_file(BRAND_ASSETS_BUCKET, path, body, content_type):
        return ApiResponse(success=False, error=ErrorDetail(error_code="storage_unavailable", message="Could not upload image"))
    initial_index_status = "processing" if inspection.is_d02_resolution else "needs_attention"
    initial_index_reason = None if inspection.is_d02_resolution else "image_resolution_too_low"
    asset = BrandAsset(
        id=asset_id, client_id=auth.client_id,
        url=path, storage_path=path, file_name=file_name[:255], format=content_type,
        source="client_uploaded",
        status="approved" if rights_attested else "pending_review",
        usage_rights="client_owned" if rights_attested else "unknown",
        dimensions=inspection.dimensions, content_sha256=content_sha256,
    )
    semantic_record = SemanticAssetRecord(
        client_id=auth.client_id,
        source_asset_id=asset_id,
        content_fingerprint=asset.content_sha256,
        status=initial_index_status,
        failure_reason=initial_index_reason,
    )
    db.add(asset)
    db.add(semantic_record)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        delete_files(BRAND_ASSETS_BUCKET, [path])
        raise

    if initial_index_status == "processing":
        try:
            celery_app.send_task("assets.index_semantic", args=[str(auth.client_id), str(asset_id)])
        except Exception:
            logger.exception("Could not enqueue semantic indexing for asset=%s", asset_id)
            semantic_record.status = "failed"
            semantic_record.failure_reason = "semantic_index_dispatch_failed"
            await db.commit()
    return ApiResponse(success=True, data=BrandAssetOut(
        id=asset.id,
        url=get_signed_url(BRAND_ASSETS_BUCKET, path) or path,
        file_name=asset.file_name, storage_path=path, tags=asset.tags,
        source=asset.source, status=asset.status,
        usage_rights=asset.usage_rights, dimensions=asset.dimensions,
        indexing_status=semantic_record.status,
        indexing_reason=semantic_record.failure_reason,
        ready_for_d02=False,
        created_at=asset.created_at,
    ))


@router.post("/assets/{source_asset_id}/replace", response_model=ApiResponse[BrandAssetOut])
async def replace_portal_asset(
    source_asset_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    """Create an immutable replacement; the old source is never overwritten or deleted."""
    old_asset = await db.scalar(
        select(BrandAsset).where(
            BrandAsset.id == source_asset_id,
            BrandAsset.client_id == auth.client_id,
            BrandAsset.source.in_(("client_uploaded", "real_photo", "portal")),
            BrandAsset.source_asset_id.is_(None),
        )
    )
    if old_asset is None:
        raise HTTPException(status_code=404, detail="Source asset not found")

    content_type = (request.headers.get("content-type") or "").split(";", 1)[0].lower()
    file_name = request.headers.get("x-file-name") or "replacement"
    rights_attested = (
        request.headers.get("x-asset-rights-attested") or ""
    ).strip().lower() in {"1", "true", "yes"}
    if content_type not in ALLOWED_IMAGE_TYPES:
        return ApiResponse(success=False, error=ErrorDetail(
            error_code="invalid_file_type", message="Only JPEG, PNG and WebP images are supported"
        ))
    body = await request.body()
    if not body or len(body) > MAX_IMAGE_BYTES:
        return ApiResponse(success=False, error=ErrorDetail(
            error_code="invalid_file_size", message="Image must be smaller than 50 MB"
        ))
    try:
        inspection = inspect_image_upload(body, content_type)
    except ImageUploadValidationError as exc:
        return ApiResponse(success=False, error=ErrorDetail(error_code=exc.code, message=str(exc)))

    content_sha256 = hashlib.sha256(body).hexdigest()
    if content_sha256 == old_asset.content_sha256:
        return ApiResponse(success=False, error=ErrorDetail(
            error_code="replacement_unchanged", message="Replacement bytes are identical to the current asset"
        ))

    replacement_id = uuid.uuid4()
    path = client_asset_path(str(auth.client_id), str(replacement_id), content_type)
    if not upload_file(BRAND_ASSETS_BUCKET, path, body, content_type):
        return ApiResponse(success=False, error=ErrorDetail(
            error_code="storage_unavailable", message="Could not upload replacement image"
        ))

    initial_status = "processing" if inspection.is_d02_resolution else "needs_attention"
    initial_reason = None if inspection.is_d02_resolution else "image_resolution_too_low"
    replacement = BrandAsset(
        id=replacement_id,
        client_id=auth.client_id,
        url=path,
        storage_path=path,
        file_name=file_name[:255],
        format=content_type,
        source="client_uploaded",
        status="approved" if rights_attested else "pending_review",
        usage_rights="client_owned" if rights_attested else "unknown",
        dimensions=inspection.dimensions,
        content_sha256=content_sha256,
        replaces_asset_id=old_asset.id,
    )
    semantic_record = SemanticAssetRecord(
        client_id=auth.client_id,
        source_asset_id=replacement.id,
        content_fingerprint=content_sha256,
        status=initial_status,
        failure_reason=initial_reason,
    )
    db.add_all([replacement, semantic_record])
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        delete_files(BRAND_ASSETS_BUCKET, [path])
        raise

    if initial_status == "processing":
        try:
            celery_app.send_task(
                "assets.index_semantic", args=[str(auth.client_id), str(replacement.id)]
            )
        except Exception:
            semantic_record.status = "failed"
            semantic_record.failure_reason = "semantic_index_dispatch_failed"
            await db.commit()
            logger.exception("Could not enqueue replacement indexing asset=%s", replacement.id)

    return ApiResponse(success=True, data=BrandAssetOut(
        id=replacement.id,
        url=get_signed_url(BRAND_ASSETS_BUCKET, replacement.storage_path) or replacement.url,
        file_name=replacement.file_name,
        storage_path=replacement.storage_path,
        tags=replacement.tags,
        source=replacement.source,
        status=replacement.status,
        usage_rights=replacement.usage_rights,
        dimensions=replacement.dimensions,
        indexing_status=semantic_record.status,
        indexing_reason=semantic_record.failure_reason,
        replaces_asset_id=old_asset.id,
        ready_for_d02=False,
        created_at=replacement.created_at,
    ))


@router.get("/settings", response_model=ApiResponse[dict])
async def get_settings(
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    client_record = await db.get(Client, auth.client_id)
    brand = await db.scalar(
        select(BrandSetting).where(
            BrandSetting.client_id == auth.client_id,
            BrandSetting.is_current.is_(True),
        )
    )
    configs_result = await db.execute(
        select(ClientLLMConfig)
        .where(ClientLLMConfig.client_id == auth.client_id)
        .order_by(ClientLLMConfig.agent_code.asc())
    )
    enabled_provider_rows = await db.scalars(
        select(ClientProviderCredential.provider).where(
            ClientProviderCredential.client_id == auth.client_id,
            ClientProviderCredential.is_enabled.is_(True),
            ClientProviderCredential.validation_status == "valid",
        )
    )
    enabled_providers = set(enabled_provider_rows.all())
    client = await db.scalar(select(WorkflowCycle).where(WorkflowCycle.client_id == auth.client_id).order_by(WorkflowCycle.created_at.desc()))
    return ApiResponse(
        success=True,
        data={
            "client": {
                "id": str(client_record.id) if client_record else str(auth.client_id),
                "brand_name": client_record.brand_name if client_record else "",
            },
            "brand_voice": {
                "tone": brand.tone_of_voice if brand else "",
                "personality_keywords": brand.personality_keywords if brand else [],
                "writing_style": "conversational",
                "avoid_phrases": brand.avoid_phrases if brand else [],
                "brand_colors": brand.brand_colors if brand else {},
            },
            "agent_configs": [
                {
                    "agent_code": cfg.agent_code,
                    "model": cfg.model,
                    "tier": cfg.tier,
                    "budget_usd_month": float(cfg.budget_usd or 0),
                    "is_active": cfg.is_active,
                }
                for cfg in configs_result.scalars().all()
            ],
            "eligible_models": [
                model.public_dict() for model in eligible_models(enabled_providers)
            ],
            "schedule": {
                "cycle_id": str(client.id) if client else None,
                "phase": client.phase if client else None,
            },
        },
    )


@router.patch("/settings/brand-voice", response_model=ApiResponse[dict])
async def update_brand_voice(
    req: BrandVoiceUpdate,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    cached = check_idempotency(
        req.idempotency_key,
        client_id=auth.client_id,
        operation="update_brand_voice",
        target_id=auth.client_id,
    )
    if cached:
        return ApiResponse(success=True, data=cached)
    current = await db.scalar(
        select(BrandSetting).where(
            BrandSetting.client_id == auth.client_id,
            BrandSetting.is_current.is_(True),
        )
    )
    if not current:
        # Clients created before Brand Settings were initialized should be
        # able to save their first Portal configuration without manual repair.
        client = await db.get(Client, auth.client_id)
        if client is None:
            return ApiResponse(success=False, error=ErrorDetail(error_code="404", message="Client not found"))
        updated = BrandSetting(
            client_id=auth.client_id,
            is_current=True,
            brand_voice_short=client.brand_name,
            tone_of_voice=req.tone,
            avoid_phrases=req.avoid_phrases,
            brand_colors=req.brand_colors or {},
            personality_keywords=req.personality_keywords,
            writing_style=req.writing_style,
            sample_captions=[],
        )
        db.add(updated)
        await db.commit()
        data = {
            "tone": updated.tone_of_voice,
            "personality_keywords": updated.personality_keywords,
            "writing_style": updated.writing_style,
        }
        save_idempotency(
            req.idempotency_key,
            data,
            client_id=auth.client_id,
            operation="update_brand_voice",
            target_id=auth.client_id,
        )
        return ApiResponse(success=True, data=data)
    db.add(
        BrandSettingHistory(
            client_id=auth.client_id,
            brand_setting_id=current.id,
            brand_voice_short=current.brand_voice_short,
            tone_of_voice=current.tone_of_voice,
            target_audience=current.target_audience,
            avoid_phrases=current.avoid_phrases,
            brand_colors=current.brand_colors,
            personality_keywords=current.personality_keywords,
            writing_style=current.writing_style,
            sample_captions=current.sample_captions,
            logo_url=current.logo_url,
        )
    )
    current.is_current = False
    updated = BrandSetting(
        client_id=auth.client_id,
        is_current=True,
        brand_voice_short=current.brand_voice_short,
        tone_of_voice=req.tone,
        target_audience=current.target_audience,
        avoid_phrases=req.avoid_phrases,
        brand_colors=req.brand_colors or current.brand_colors,
        personality_keywords=req.personality_keywords,
        writing_style=req.writing_style,
        sample_captions=current.sample_captions,
        logo_url=current.logo_url,
        posting_frequency=current.posting_frequency,
    )
    db.add(updated)
    await db.commit()
    data = {"tone": updated.tone_of_voice, "personality_keywords": updated.personality_keywords, "writing_style": updated.writing_style}
    save_idempotency(
        req.idempotency_key,
        data,
        client_id=auth.client_id,
        operation="update_brand_voice",
        target_id=auth.client_id,
    )
    return ApiResponse(success=True, data=data)


@router.patch("/settings/agent-config", response_model=ApiResponse[dict])
async def update_agent_config(
    req: AgentConfigUpdate,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    cached = check_idempotency(
        req.idempotency_key,
        client_id=auth.client_id,
        operation="update_agent_config",
        target_id=req.agent_code,
    )
    if cached:
        return ApiResponse(success=True, data=cached)
    enabled_provider_rows = await db.scalars(
        select(ClientProviderCredential.provider).where(
            ClientProviderCredential.client_id == auth.client_id,
            ClientProviderCredential.is_enabled.is_(True),
            ClientProviderCredential.validation_status == "valid",
        )
    )
    try:
        model_entry = validate_model_selection(
            model_id=req.model,
            tier=req.tier,
            agent_code=req.agent_code,
            enabled_providers=set(enabled_provider_rows.all()),
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from None
    config = await db.scalar(
        select(ClientLLMConfig).where(
            ClientLLMConfig.client_id == auth.client_id,
            ClientLLMConfig.agent_code == req.agent_code,
        )
    )
    if not config:
        config = ClientLLMConfig(client_id=auth.client_id, agent_code=req.agent_code)
        db.add(config)
    config.provider = model_entry.provider
    config.model = req.model
    config.tier = req.tier
    config.budget_usd = req.budget_usd_month
    config.is_active = True
    await db.commit()
    data = {"agent_code": config.agent_code, "model": config.model, "tier": config.tier, "budget_usd_month": float(config.budget_usd)}
    save_idempotency(
        req.idempotency_key,
        data,
        client_id=auth.client_id,
        operation="update_agent_config",
        target_id=req.agent_code,
    )
    return ApiResponse(success=True, data=data)

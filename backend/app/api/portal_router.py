import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone

from app.core.db import engine
from app.core.auth import get_current_auth, AuthContext, check_idempotency, save_idempotency
from app.models.content import ContentItem, ContentPillar, WorkflowCycle
from app.models.clients import Client, BrandSetting, BrandSettingHistory
from app.models.llm_config import ClientLLMConfig
from app.models.provider_credentials import ClientProviderCredential
from app.core.model_catalog import eligible_models, validate_model_selection
from app.models.assets import AssetRequest, BrandAsset
from app.models.system import TaskLog
from app.models.reviews import AgentMemory, HitlReview
from app.services.a01_chat import list_a01_chat_history, parse_chat_task_type, run_a01_chat
from app.services.storage import BRAND_ASSETS_BUCKET, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, client_asset_path, upload_file, get_signed_url
from app.services.p01_lite import upsert_agent_memory, determine_agent_for_reject_reason
from app.api.schemas import (
    ApiResponse, ErrorDetail, ContentItemOut, TaskLogOut,
    ApproveRequest, RejectRequest, MarkPostedRequest,
    ConfirmPillarsRequest, ApproveWeekRequest, AssetSubmitRequest,
    BrandVoiceUpdate, AgentConfigUpdate,
    PillarOut, AssetRequestOut, BrandAssetOut,
    A01ChatRequest, A01ChatMessageOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/portal", tags=["portal"])
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


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
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    cached = check_idempotency(req.idempotency_key)
    if cached:
        return ApiResponse(success=True, data=A01ChatMessageOut.model_validate(cached))

    try:
        memory, _ = await run_a01_chat(db, auth.client_id, req.message)
    except Exception:
        await db.rollback()
        logger.exception("A01 chat failed for client %s", auth.client_id)
        return ApiResponse(
            success=False,
            error=ErrorDetail(
                error_code="a01_temporarily_unavailable",
                message="A01 đang tạm gián đoạn. Vui lòng thử lại sau ít phút.",
            ),
        )

    data = _a01_chat_message(memory)
    save_idempotency(req.idempotency_key, data.model_dump(mode="json"))
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
    out = [ContentItemOut.model_validate(i) for i in items]
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
    cached = check_idempotency(req.idempotency_key)
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
    save_idempotency(req.idempotency_key, data)
    return ApiResponse(success=True, data=data)


@router.post("/cycles/{cycle_id}/approve-week", response_model=ApiResponse[dict])
async def approve_week(
    cycle_id: uuid.UUID,
    req: ApproveWeekRequest,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    cached = check_idempotency(req.idempotency_key)
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
    save_idempotency(req.idempotency_key, data)
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


@router.get("/asset-requests", response_model=ApiResponse[List[AssetRequestOut]])
async def list_asset_requests(
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AssetRequest)
        .where(AssetRequest.client_id == auth.client_id)
        .order_by(AssetRequest.created_at.desc())
    )
    return ApiResponse(success=True, data=[AssetRequestOut.model_validate(r) for r in result.scalars().all()])


@router.get("/assets", response_model=ApiResponse[List[BrandAssetOut]])
async def list_assets(
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BrandAsset)
        .where(BrandAsset.client_id == auth.client_id)
        .order_by(BrandAsset.created_at.desc())
    )
    assets = []
    for asset in result.scalars().all():
        signed = get_signed_url(BRAND_ASSETS_BUCKET, asset.storage_path) if asset.storage_path else asset.url
        assets.append(BrandAssetOut(
            id=asset.id, asset_request_id=asset.asset_request_id, url=signed or asset.url,
            file_name=asset.file_name, storage_path=asset.storage_path, tags=asset.tags,
            source=asset.source, status=asset.status, created_at=asset.created_at,
        ))
    return ApiResponse(success=True, data=assets)


@router.post("/assets/upload", response_model=ApiResponse[BrandAssetOut])
async def upload_portal_asset(
    request: Request,
    asset_request_id: Optional[uuid.UUID] = Query(None),
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    content_type = (request.headers.get("content-type") or "").split(";", 1)[0].lower()
    file_name = request.headers.get("x-file-name") or "upload"
    if content_type not in ALLOWED_IMAGE_TYPES:
        return ApiResponse(success=False, error=ErrorDetail(error_code="invalid_file_type", message="Only JPEG, PNG and WebP images are supported"))
    body = await request.body()
    if not body or len(body) > MAX_IMAGE_BYTES:
        return ApiResponse(success=False, error=ErrorDetail(error_code="invalid_file_size", message="Image must be smaller than 50 MB"))
    if asset_request_id:
        asset_request = await db.scalar(select(AssetRequest).where(AssetRequest.id == asset_request_id, AssetRequest.client_id == auth.client_id))
        if not asset_request:
            return ApiResponse(success=False, error=ErrorDetail(error_code="404", message="Asset request not found"))
    asset_id = uuid.uuid4()
    path = client_asset_path(str(auth.client_id), str(asset_id), content_type, str(asset_request_id) if asset_request_id else None)
    if not upload_file(BRAND_ASSETS_BUCKET, path, body, content_type):
        return ApiResponse(success=False, error=ErrorDetail(error_code="storage_unavailable", message="Could not upload image"))
    asset = BrandAsset(
        id=asset_id, client_id=auth.client_id, asset_request_id=asset_request_id,
        url=path, storage_path=path, file_name=file_name[:255], format=content_type,
        source="real_photo", status="pending_review",
    )
    db.add(asset)
    await db.commit()
    return ApiResponse(success=True, data=BrandAssetOut(
        id=asset.id, asset_request_id=asset.asset_request_id,
        url=get_signed_url(BRAND_ASSETS_BUCKET, path) or path,
        file_name=asset.file_name, storage_path=path, tags=asset.tags,
        source=asset.source, status=asset.status, created_at=asset.created_at,
    ))


@router.post("/asset-requests/{request_id}/submit", response_model=ApiResponse[dict])
async def submit_asset_request(
    request_id: uuid.UUID,
    req: AssetSubmitRequest,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    cached = check_idempotency(req.idempotency_key)
    if cached:
        return ApiResponse(success=True, data=cached)

    asset_request = await db.scalar(
        select(AssetRequest).where(
            AssetRequest.id == request_id,
            AssetRequest.client_id == auth.client_id,
        )
    )
    if not asset_request:
        return ApiResponse(success=False, error=ErrorDetail(error_code="404", message="Asset request not found"))
    if asset_request.status != "pending":
        return ApiResponse(success=False, error=ErrorDetail(error_code="409", message="Asset request is not pending"))

    if not req.asset_ids:
        return ApiResponse(success=False, error=ErrorDetail(error_code="validation_missing_assets", message="Upload at least one asset before submitting"))
    result = await db.execute(select(BrandAsset).where(
        BrandAsset.id.in_(req.asset_ids), BrandAsset.client_id == auth.client_id,
        BrandAsset.asset_request_id == asset_request.id,
    ))
    assets = result.scalars().all()
    if len(assets) != len(set(req.asset_ids)):
        return ApiResponse(success=False, error=ErrorDetail(error_code="validation_asset_scope", message="One or more assets do not belong to this request"))
    for asset in assets:
        asset.status = "pending_review"
    asset_request.status = "fulfilled"
    item = await db.get(ContentItem, asset_request.content_item_id)
    if item and item.client_id == auth.client_id and item.status in {"waiting_asset", "asset_blocked"}:
        item.status = "evaluating"
    await db.commit()
    data = {"status": "submitted", "asset_ids": [str(asset.id) for asset in assets]}
    save_idempotency(req.idempotency_key, data)
    return ApiResponse(success=True, data=data)


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
    cached = check_idempotency(req.idempotency_key)
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
        save_idempotency(req.idempotency_key, data)
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
    save_idempotency(req.idempotency_key, data)
    return ApiResponse(success=True, data=data)


@router.patch("/settings/agent-config", response_model=ApiResponse[dict])
async def update_agent_config(
    req: AgentConfigUpdate,
    auth: AuthContext = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
):
    cached = check_idempotency(req.idempotency_key)
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
    save_idempotency(req.idempotency_key, data)
    return ApiResponse(success=True, data=data)

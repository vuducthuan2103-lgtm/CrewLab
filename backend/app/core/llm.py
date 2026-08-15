"""
LLM abstraction layer — all agents call call_llm(), never import provider SDKs directly.

Uses litellm (pip install litellm, MIT license) as the routing layer.
See docs/decisions/0004-litellm-abstraction.md for rationale.

Spec 0010: provider credentials are resolved per client from encrypted database
rows. Environment provider keys are intentionally not used as a fallback.
"""
import os
import asyncio
import base64
import time
import json
import uuid
import logging
import hashlib
import io
import math
import re
from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from typing import Optional, Type

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import case
from sqlalchemy.future import select

from app.models.llm_config import ClientLLMConfig
from app.models.provider_credentials import ClientProviderCredential
from app.models.system import TaskLog
from app.core.db import settings, utcnow
from app.core.credentials import get_credential_cipher, sanitize_provider_error
from app.core.model_catalog import catalog_entry, chat_model_for
from app.services.budget_enforcement import (
    BudgetAdmissionError,
    BudgetReservation,
    ReservationStore,
    admit_budget,
    estimate_customer_charge,
    finalize_budget_reservation,
    maximum_embedding_units,
    maximum_image_units,
    maximum_text_units,
)
from app.services.usage_ledger import (
    BeginUsageEventCommand,
    BillingClassification,
    FinalizeUsageEventCommand,
    SessionFactory,
    UsageCategory,
    UsageEventStatus,
    begin_usage_event,
    finalize_usage_event,
    independent_session_factory_for,
    sanitize_error_category,
)

logger = logging.getLogger(__name__)

class LLMResponse(BaseModel):
    """Standardized response from any LLM provider."""
    content: str
    model_used: str
    tokens_in: int
    tokens_out: int
    latency_ms: int
    provider: str


class LLMConfigurationError(RuntimeError):
    """Raised when a client has no usable model/credential configuration."""


class LLMUsageReplayError(RuntimeError):
    """Raised when a stable event identity has already been admitted."""


class ImageGenerationResponse(BaseModel):
    """Provider-neutral result for D02's final visual generation."""
    image_url: str
    image_bytes: bytes | None = None
    model_used: str
    provider: str


class EmbeddingResponse(BaseModel):
    """Tenant-routed embedding result used by the semantic asset index."""

    embedding: list[float]
    model_used: str
    provider: str
    version: str


ASSET_EMBEDDING_DIMENSIONS = 1536
ASSET_EMBEDDING_REPRESENTATION = "semantic-visual-composite-v2"
ASSET_VISUAL_FEATURE_WEIGHT = 0.12
_ASSET_EMBEDDING_MODELS = {
    "openai": "text-embedding-3-small",
    "google": "gemini/gemini-embedding-001",
}


def _mock_embedding(text_value: str) -> list[float]:
    """Stable, normalized feature-hash vector for offline tests only."""
    vector = [0.0] * ASSET_EMBEDDING_DIMENSIONS
    tokens = re.findall(r"[\w-]+", text_value.casefold(), flags=re.UNICODE)
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % ASSET_EMBEDDING_DIMENSIONS
        vector[index] += -1.0 if digest[4] & 1 else 1.0
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def _normalized_vector(values: list[float]) -> list[float]:
    norm = math.sqrt(sum(value * value for value in values)) or 1.0
    return [value / norm for value in values]


def _source_image_features(source_image_bytes: bytes) -> list[float]:
    """Extract a stable 1536-d visual signature from decoded source pixels.

    The representation deliberately uses visible pixel properties instead of
    compressed-file hashes: 16x16 RGB, luminance, saturation and local edge
    magnitude. This keeps identical pixels stable across storage metadata while
    making the asset vector genuinely sensitive to the source image.
    """
    from PIL import Image, ImageOps

    with Image.open(io.BytesIO(source_image_bytes)) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB").resize(
            (16, 16), Image.Resampling.LANCZOS
        )
        rgb_pixels = list(image.get_flattened_data())

    rgb_features = [channel / 127.5 - 1.0 for pixel in rgb_pixels for channel in pixel]
    luminance = [
        (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255.0
        for red, green, blue in rgb_pixels
    ]
    luminance_features = [value * 2.0 - 1.0 for value in luminance]
    saturation_features = []
    edge_features = []
    for index, (red, green, blue) in enumerate(rgb_pixels):
        maximum = max(red, green, blue)
        minimum = min(red, green, blue)
        saturation = 0.0 if maximum == 0 else (maximum - minimum) / maximum
        saturation_features.append(saturation * 2.0 - 1.0)

        x, y = index % 16, index // 16
        right = luminance[y * 16 + min(x + 1, 15)]
        below = luminance[min(y + 1, 15) * 16 + x]
        edge = min(abs(luminance[index] - right) + abs(luminance[index] - below), 1.0)
        edge_features.append(edge * 2.0 - 1.0)

    features = rgb_features + luminance_features + saturation_features + edge_features
    if len(features) != ASSET_EMBEDDING_DIMENSIONS:
        raise ValueError("Visual feature extractor returned an invalid dimension")
    return _normalized_vector(features)


def _compose_asset_embedding(
    semantic_embedding: list[float], source_image_bytes: bytes | None
) -> list[float]:
    semantic = _normalized_vector(semantic_embedding)
    if source_image_bytes is None:
        return semantic
    visual = _source_image_features(source_image_bytes)
    semantic_weight = 1.0 - ASSET_VISUAL_FEATURE_WEIGHT
    return _normalized_vector(
        [
            semantic_weight * semantic_value + ASSET_VISUAL_FEATURE_WEIGHT * visual_value
            for semantic_value, visual_value in zip(semantic, visual)
        ]
    )


def _mock_llm_response(
    agent_code: str,
    messages: list[dict],
    response_format: Optional[Type[BaseModel]] = None,
    mock_key: Optional[str] = None,
) -> LLMResponse:
    """Return a hardcoded mock response for testing without API keys.

    mock_key overrides agent_code for lookup — allows same agent (e.g. D02)
    to have multiple distinct mock responses (D02_tags, D02_select).
    """
    mock_responses = {
        "A01": json.dumps({
            "reply": "Mình đã nhận yêu cầu và sẽ chuyển bài này vào quy trình sáng tạo.",
            "action": "create_content",
            "task_title": "Bài đăng mới theo yêu cầu từ chat A01",
            "task_details": "Tạo nội dung theo yêu cầu người dùng trong cuộc trò chuyện.",
            "platform": "facebook_instagram",
        }),
        "B02": json.dumps({
            "pillars": [
                {"name": "Product Spotlight", "description": "Giới thiệu sản phẩm đặc trưng", "weight": 40, "angles": ["Hương vị đặc trưng", "Ảnh flat lay"]},
                {"name": "Behind the Scenes", "description": "Hậu trường quán", "weight": 30, "angles": ["Quy trình pha chế", "Đội ngũ"]},
                {"name": "Community & Lifestyle", "description": "Phong cách sống cà phê", "weight": 30, "angles": ["Không gian quán", "Khách hàng"]},
            ]
        }),
        "B03": json.dumps({
            "items": [
                {"topic": "Cold Brew mùa hè — hương vị mới", "platform": "facebook", "pillar_name": "Product Spotlight", "scheduled_date": "2026-08-04", "scheduled_time": "18:00"},
                {"topic": "Flat lay bộ sưu tập cà phê đặc sản", "platform": "instagram", "pillar_name": "Product Spotlight", "scheduled_date": "2026-08-05", "scheduled_time": "08:00"},
                {"topic": "Một ngày của barista tại Bardinh", "platform": "facebook", "pillar_name": "Behind the Scenes", "scheduled_date": "2026-08-06", "scheduled_time": "12:00"},
                {"topic": "Góc làm việc yêu thích tại quán", "platform": "instagram", "pillar_name": "Community & Lifestyle", "scheduled_date": "2026-08-07", "scheduled_time": "17:00"},
                {"topic": "Cách pha pour-over tại nhà", "platform": "facebook", "pillar_name": "Behind the Scenes", "scheduled_date": "2026-08-08", "scheduled_time": "09:00"},
            ]
        }),
        "D01": json.dumps({
            "caption": (
                "☀️ Cold Brew mùa hè — Giải nhiệt theo cách của bạn!\n\n"
                "Mùa hè nóng bức cần một thức uống đủ mát, đủ ngon, đủ chill. "
                "Cold Brew BarĐỉnh được ngâm lạnh 12 giờ — đậm đà, mượt mà, không cần đường.\n\n"
                "Ghé BarĐỉnh hôm nay, order ngay Cold Brew yêu thích của bạn! 🦹\n\n"
                "#ColdBrew #BarDinh #CafeSaigon #GiaiNhiet #CafeMuaHe"
            ),
            "image_brief": {
                "description": "Ly Cold Brew trên nền gỗ sáng, ánh nắng tự nhiên chiếu qua cửa sổ tạo bóng đổ nhẹ",
                "mood": "Tươi mát, tự nhiên, summer vibes",
                "suggested_tags": ["cold brew", "cà phê", "flat lay", "mùa hè", "ly đá"],
                "composition_notes": "Ảnh dọc 4:5, close-up ly từ góc 45 độ, xung quanh vài viên đá và lá bạc hà",
                "avoid": ["ảnh mờ", "nền tối", "góc chụp nghiêng nhiều"]
            }
        }),
        "D02_tags": json.dumps({
            "enhanced_tags": ["cold brew", "cà phê đá", "flat lay", "summer drink", "coffee shop", "nước uống", "sản phẩm"],
            "search_priority": ["cold brew", "flat lay", "cà phê", "sản phẩm"]
        }),
        "D02_select": json.dumps({
            "selected_asset_id": "b1000001-0000-0000-0000-000000000001",
            "reason": "Ảnh flat lay ly sản phẩm có ánh sáng tự nhiên, khớp với brief về summer vibes"
        }),
        "D02_asset_semantics": json.dumps({
            "summary": "A client-owned beverage product photo with clear natural light.",
            "primary_subjects": ["beverage"], "secondary_subjects": ["table"],
            "setting": ["cafe"], "actions": [], "composition": ["product close-up"],
            "mood_lighting": ["natural light"], "text_safe_areas": ["upper background"],
            "visible_text": [], "suggested_tags": ["beverage", "cafe", "product photo"],
            "technical_quality": {"usable": True}, "editability": {"score": 0.8},
            "safety": {"safe": True}, "confidence": {"overall": 0.8}
        }),
        "E01": json.dumps({
            "caption_eval": {
                "score": 8.5,
                "passed": True,
                "failed_criteria": [],
                "fix_instructions": ""
            },
            "visual_eval": {
                "score": 4.2,
                "passed": True,
                "failed_criteria": [],
                "fix_instructions": ""
            },
            "overall_passed": True,
            "evaluation_reasoning": "Caption phản ánh đúng brand voice Bardinh Coffee, CTA rõ ràng. Ảnh sản phẩm có ánh sáng tốt và bố cục phù hợp."
        }),
        "E01_fail": json.dumps({
            "caption_eval": {
                "score": 5.5,
                "passed": False,
                "failed_criteria": ["brand_voice", "platform_fit"],
                "fix_instructions": "Giọng văn quá sáo rỗng, thiếu từ ngữ đặc trưng thương hiệu. Thiếu hashtag phù hợp cho Facebook."
            },
            "visual_eval": {
                "score": 2.5,
                "passed": False,
                "failed_criteria": ["mobile_readability", "visual_asset_fit"],
                "fix_instructions": "Ảnh bị rối bố cục, góc chụp không làm nổi bật ly Cold Brew như mô tả trong Image Brief."
            },
            "overall_passed": False,
            "evaluation_reasoning": "Caption chưa đúng brand voice. Ảnh chưa bám sát brief và khó nhìn trên di động."
        }),
    }

    key = mock_key or agent_code
    content = mock_responses.get(key, '{"result": "mock response"}')
    return LLMResponse(
        content=content,
        model_used="mock-model",
        tokens_in=len(str(messages)) // 4,
        tokens_out=len(content) // 4,
        latency_ms=50,
        provider="mock",
    )


def _usage_environment() -> tuple[str, bool]:
    environment = (
        os.environ.get("CREWLAB_ENVIRONMENT")
        or os.environ.get("ENVIRONMENT")
        or "local"
    ).strip().casefold()
    if not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,31}", environment):
        environment = "local"
    return environment, environment == "production"


def _usage_factory(
    session: Optional[AsyncSession], override: SessionFactory | None
) -> SessionFactory | None:
    if override is not None:
        return override
    if session is not None:
        return independent_session_factory_for(session)
    return None


def _new_usage_event_key(prefix: str) -> str:
    return f"{prefix}:{uuid.uuid4()}"


def _provider_value(value: object, name: str) -> object | None:
    if isinstance(value, dict):
        return value.get(name)
    return getattr(value, name, None)


def _provider_evidence(value: object) -> object:
    response = _provider_value(value, "response") or _provider_value(
        value, "litellm_response"
    )
    return response if response is not None else value


def _provider_request_id(value: object) -> str | None:
    evidence = _provider_evidence(value)
    hidden = _provider_value(evidence, "_hidden_params")
    candidates = [
        _provider_value(evidence, "id"),
        _provider_value(evidence, "request_id"),
        _provider_value(hidden, "response_id") if hidden is not None else None,
    ]
    for candidate in candidates:
        normalized = str(candidate or "").strip()
        if normalized and len(normalized) <= 255 and re.fullmatch(
            r"[A-Za-z0-9][A-Za-z0-9._:/-]*", normalized
        ):
            return normalized
    return None


def _provider_reported_cost(value: object) -> Decimal | None:
    evidence = _provider_evidence(value)
    usage = _provider_value(evidence, "usage")
    hidden = _provider_value(evidence, "_hidden_params")
    candidates = [
        _provider_value(evidence, "response_cost"),
        _provider_value(usage, "cost") if usage is not None else None,
        _provider_value(hidden, "response_cost") if hidden is not None else None,
    ]
    for candidate in candidates:
        if candidate is None or isinstance(candidate, bool):
            continue
        try:
            cost = Decimal(str(candidate))
        except (InvalidOperation, TypeError, ValueError):
            continue
        if cost.is_finite() and cost >= 0:
            return cost
    return None


def _usage_count(usage: object, *names: str) -> int:
    for name in names:
        value = _provider_value(usage, name)
        try:
            count = int(value or 0)
        except (TypeError, ValueError):
            continue
        if count >= 0:
            return count
    return 0


def _text_usage_units(value: object) -> dict[str, int]:
    usage = _provider_value(_provider_evidence(value), "usage")
    return {
        "input_tokens": _usage_count(usage, "prompt_tokens", "input_tokens"),
        "output_tokens": _usage_count(
            usage, "completion_tokens", "output_tokens"
        ),
    }


def _message_usage_category(messages: list[dict]) -> UsageCategory:
    def contains_image(value: object) -> bool:
        if isinstance(value, dict):
            payload_type = str(value.get("type") or "").casefold()
            if payload_type in {"image", "image_url", "input_image"}:
                return True
            if "image_url" in value:
                return True
            return any(contains_image(item) for item in value.values())
        if isinstance(value, list):
            return any(contains_image(item) for item in value)
        return False

    return UsageCategory.VISION if contains_image(messages) else UsageCategory.TEXT


async def _admit_usage_request(
    *,
    event_key: str,
    session_factory: SessionFactory | None,
    client_id: uuid.UUID,
    content_item_id: Optional[uuid.UUID],
    parent_event_id: Optional[uuid.UUID],
    trace_id: Optional[str],
    agent_code: str,
    task_type: str,
    wake_reason: str,
    provider: str,
    model: str,
    usage_category: UsageCategory,
    request_mode: str | None = None,
):
    environment, is_production = _usage_environment()
    if provider.casefold() == "mock":
        is_production = False
    admission = await begin_usage_event(
        BeginUsageEventCommand(
            event_key=event_key,
            client_id=client_id,
            content_item_id=content_item_id,
            parent_event_id=parent_event_id,
            trace_id=trace_id,
            agent_code=agent_code,
            task_type=task_type,
            wake_reason=wake_reason,
            provider=provider,
            model=model,
            usage_category=usage_category,
            request_mode=request_mode,
            environment=environment,
            is_production=is_production,
            billing_classification=(
                BillingClassification.CUSTOMER_BILLABLE
                if is_production
                else BillingClassification.INTERNAL_NON_BILLABLE
            ),
        ),
        session_factory=session_factory,
    )
    if not admission.should_call_provider:
        raise LLMUsageReplayError(
            "Usage event was already admitted; provider call was suppressed"
        )
    return admission


async def _finalize_usage_request(
    *,
    usage_event_id: uuid.UUID,
    session_factory: SessionFactory | None,
    evidence: object,
    status: UsageEventStatus,
    usage_units: dict[str, int],
    latency_ms: int,
    error_code: str | None = None,
) -> object:
    return await finalize_usage_event(
        FinalizeUsageEventCommand(
            usage_event_id=usage_event_id,
            provider_request_id=_provider_request_id(evidence),
            status=status,
            usage_units=usage_units,
            latency_ms=max(latency_ms, 0),
            provider_reported_cost_usd=_provider_reported_cost(evidence),
            error_code=error_code,
        ),
        session_factory=session_factory,
    )


def _is_customer_billable(provider: str) -> bool:
    _environment, is_production = _usage_environment()
    return is_production and provider.casefold() != "mock"


async def _admit_budgeted_usage_request(
    *,
    event_key: str,
    session_factory: SessionFactory | None,
    client_id: uuid.UUID,
    content_item_id: Optional[uuid.UUID],
    parent_event_id: Optional[uuid.UUID],
    trace_id: Optional[str],
    agent_code: str,
    task_type: str,
    wake_reason: str,
    provider: str,
    model: str,
    usage_category: UsageCategory,
    maximum_units: dict[str, int],
    budget_reservation_store: ReservationStore | None,
    request_mode: str | None = None,
) -> tuple[object, BudgetReservation | None]:
    admission = await _admit_usage_request(
        event_key=event_key,
        session_factory=session_factory,
        client_id=client_id,
        content_item_id=content_item_id,
        parent_event_id=parent_event_id,
        trace_id=trace_id,
        agent_code=agent_code,
        task_type=task_type,
        wake_reason=wake_reason,
        provider=provider,
        model=model,
        usage_category=usage_category,
        request_mode=request_mode,
    )
    if not _is_customer_billable(provider):
        return admission, None
    if session_factory is None:
        raise LLMConfigurationError(
            "Billable usage requires an independent ledger session factory"
        )
    try:
        async with session_factory() as budget_session:
            estimate = await estimate_customer_charge(
                budget_session,
                provider=provider,
                model=model,
                usage_category=usage_category.value,
                maximum_units=maximum_units,
                multiplier=admission.multiplier_snapshot,
            )
            reservation = await admit_budget(
                budget_session,
                usage_event_id=admission.usage_event_id,
                client_id=client_id,
                agent_code=agent_code,
                estimated_customer_charge_usd=estimate,
                store=budget_reservation_store,
                content_item_id=content_item_id,
            )
        return admission, reservation
    except Exception as error:
        error_code = (
            error.code
            if isinstance(error, BudgetAdmissionError)
            else "budget_admission_unavailable"
        )
        try:
            await _finalize_usage_request(
                usage_event_id=admission.usage_event_id,
                session_factory=session_factory,
                evidence=error,
                status=UsageEventStatus.CANCELLED,
                usage_units={},
                latency_ms=0,
                error_code=error_code,
            )
        except Exception:
            _mark_reconciliation_required(error, admission.usage_event_id)
            logger.exception(
                "Usage ledger finalization failed after budget rejection: event=%s",
                admission.usage_event_id,
            )
        raise


async def _finalize_budgeted_usage_request(
    *,
    reservation: BudgetReservation | None,
    budget_reservation_store: ReservationStore | None,
    **finalize_kwargs,
) -> object:
    result = await _finalize_usage_request(**finalize_kwargs)
    if reservation is not None:
        try:
            await finalize_budget_reservation(
                budget_reservation_store, reservation
            )
        except Exception:
            logger.exception(
                "Budget reservation release failed; TTL recovery is required: id=%s",
                reservation.reservation_id,
            )
    return result


def _mark_reconciliation_required(
    error: BaseException, usage_event_id: uuid.UUID
) -> None:
    setattr(error, "reconciliation_required", True)
    setattr(error, "usage_event_id", usage_event_id)


async def call_llm(
    client_id: uuid.UUID,
    agent_code: str,
    messages: list[dict],
    session: Optional[AsyncSession] = None,
    response_format: Optional[Type[BaseModel]] = None,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    wake_reason: str = "task_assigned",
    content_item_id: Optional[uuid.UUID] = None,
    mock_key: Optional[str] = None,
    usage_event_key: Optional[str] = None,
    parent_usage_event_id: Optional[uuid.UUID] = None,
    trace_id: Optional[str] = None,
    usage_session_factory: SessionFactory | None = None,
    budget_reservation_store: ReservationStore | None = None,
) -> LLMResponse:
    """
    Central LLM call function. All agents use this — never import provider SDKs directly.

    Args:
        client_id: UUID of the client
        agent_code: Agent identifier (A01, B02, B03, D01, D02, E01)
        messages: OpenAI-format message list
        session: Optional DB session for reading config and writing task_logs
        response_format: Optional Pydantic model for structured output
        temperature: LLM temperature
        max_tokens: Max output tokens
        wake_reason: For task_logs observability
        content_item_id: Optional, for task_logs linking
        mock_key: Override key for mock lookup (e.g. "D02_tags", "D02_select").
                  Default=None uses agent_code. Only used in CREWLAB_LLM_MOCK=true mode.

    Returns:
        LLMResponse with content, usage stats, and provider info
    """

    ledger_factory = _usage_factory(session, usage_session_factory)
    root_event_key = usage_event_key or _new_usage_event_key("llm")
    usage_trace_id = trace_id or (
        f"content-item:{content_item_id}" if content_item_id is not None else None
    )
    request_usage_category = _message_usage_category(messages)

    # --- Mock mode ---
    if os.environ.get("CREWLAB_LLM_MOCK", "").lower() in ("true", "1", "yes"):
        logger.info(f"[LLM MOCK] agent={agent_code} mock_key={mock_key or agent_code} client={client_id}")
        admission = await _admit_usage_request(
            event_key=root_event_key,
            session_factory=ledger_factory,
            client_id=client_id,
            content_item_id=content_item_id,
            parent_event_id=parent_usage_event_id,
            trace_id=usage_trace_id,
            agent_code=agent_code,
            task_type="llm_call",
            wake_reason=wake_reason,
            provider="mock",
            model="mock-model",
            usage_category=request_usage_category,
        )
        response = _mock_llm_response(agent_code, messages, response_format, mock_key=mock_key)
        await _finalize_usage_request(
            usage_event_id=admission.usage_event_id,
            session_factory=ledger_factory,
            evidence=response,
            status=UsageEventStatus.SUCCEEDED,
            usage_units={
                "input_tokens": response.tokens_in,
                "output_tokens": response.tokens_out,
            },
            latency_ms=response.latency_ms,
        )
        if session:
            await _log_workflow_task(
                session, client_id, agent_code, response, wake_reason, content_item_id
            )
        return response

    # --- Real mode: resolve both model and credential inside the tenant. ---
    if session is None:
        raise LLMConfigurationError(
            "Real LLM calls require a database session for per-client credential routing"
        )
    config = await session.scalar(
        select(ClientLLMConfig).where(
            ClientLLMConfig.client_id == client_id,
            ClientLLMConfig.agent_code == agent_code,
            ClientLLMConfig.is_active.is_(True),
        )
    )
    if config is None:
        raise LLMConfigurationError(
            f"No active LLM configuration for client={client_id} agent={agent_code}"
        )
    provider = config.provider
    model = config.model
    credential = await session.scalar(
        select(ClientProviderCredential).where(
            ClientProviderCredential.client_id == client_id,
            ClientProviderCredential.provider == provider,
            ClientProviderCredential.is_enabled.is_(True),
            ClientProviderCredential.validation_status == "valid",
        )
    )
    if credential is None:
        raise LLMConfigurationError(
            f"Provider '{provider}' is not enabled with a valid credential for this client"
        )
    api_key = get_credential_cipher().decrypt(credential.encrypted_api_key)

    # --- Call via litellm ---
    import litellm

    # litellm uses "provider/model" format for routing
    provider_call_model = chat_model_for(model)
    if provider == "openai":
        litellm_model = provider_call_model
    elif provider == "qwen":
        litellm_model = f"dashscope/{provider_call_model}"
    else:
        litellm_model = f"{provider}/{provider_call_model}"

    request_messages = list(messages)
    completion_kwargs = {
        "model": litellm_model,
        "messages": request_messages,
        "max_tokens": max_tokens,
        "api_key": api_key,
    }
    if provider == "qwen":
        completion_kwargs["api_base"] = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    # D02 image models use a GPT-5 chat companion for semantic analysis.
    # GPT-5 rejects CrewLab's generic custom temperature (0.7), so let the
    # provider use its supported default unless the caller explicitly uses 1.
    if not provider_call_model.casefold().startswith("gpt-5") or temperature == 1:
        completion_kwargs["temperature"] = temperature
    if response_format is not None:
        if provider in ("deepseek", "qwen"):
            schema = json.dumps(
                response_format.model_json_schema(),
                ensure_ascii=False,
                separators=(",", ":"),
            )
            request_messages.insert(
                0,
                {
                    "role": "system",
                    "content": (
                        "Return only one valid JSON object matching this JSON schema. "
                        f"Do not add markdown or prose outside the JSON object: {schema}"
                    ),
                },
            )
            completion_kwargs["response_format"] = {"type": "json_object"}
        else:
            completion_kwargs["response_format"] = response_format

    admission, reservation = await _admit_budgeted_usage_request(
        event_key=root_event_key,
        session_factory=ledger_factory,
        client_id=client_id,
        content_item_id=content_item_id,
        parent_event_id=parent_usage_event_id,
        trace_id=usage_trace_id,
        agent_code=agent_code,
        task_type="llm_call",
        wake_reason=wake_reason,
        provider=provider,
        model=provider_call_model,
        usage_category=request_usage_category,
        maximum_units=maximum_text_units(request_messages, max_tokens),
        budget_reservation_store=budget_reservation_store,
    )
    start_ms = int(time.time() * 1000)
    try:

        litellm_response = await litellm.acompletion(
            **completion_kwargs,
        )
    except Exception as e:
        failed_at_ms = int(time.time() * 1000)
        try:
            await _finalize_budgeted_usage_request(
                reservation=reservation,
                budget_reservation_store=budget_reservation_store,
                usage_event_id=admission.usage_event_id,
                session_factory=ledger_factory,
                evidence=e,
                status=UsageEventStatus.FAILED,
                usage_units=_text_usage_units(e),
                latency_ms=failed_at_ms - start_ms,
                error_code=sanitize_error_category(e),
            )
        except Exception:
            _mark_reconciliation_required(e, admission.usage_event_id)
            logger.exception(
                "Usage ledger finalization failed after provider error: event=%s",
                admission.usage_event_id,
            )
        safe_error = sanitize_provider_error(str(e), api_key)
        logger.error(
            "LLM call failed: agent=%s model=%s error=%s",
            agent_code,
            model,
            safe_error,
        )
        raise

    end_ms = int(time.time() * 1000)
    await _finalize_budgeted_usage_request(
        reservation=reservation,
        budget_reservation_store=budget_reservation_store,
        usage_event_id=admission.usage_event_id,
        session_factory=ledger_factory,
        evidence=litellm_response,
        status=UsageEventStatus.SUCCEEDED,
        usage_units=_text_usage_units(litellm_response),
        latency_ms=end_ms - start_ms,
    )

    content = litellm_response.choices[0].message.content or ""
    if response_format is not None:
        try:
            content = response_format.model_validate_json(content).model_dump_json()
        except Exception as validation_error:
            logger.warning(
                "Structured LLM output invalid; requesting one repair: agent=%s model=%s error=%s",
                agent_code,
                model,
                type(validation_error).__name__,
            )
            repair_messages = [
                *request_messages,
                {"role": "assistant", "content": content},
                {
                    "role": "user",
                    "content": (
                        "Your previous JSON response was incomplete or invalid. Return the complete "
                        "JSON object again, matching the required schema exactly. Do not add prose."
                    ),
                },
            ]
            repair_kwargs = {
                **completion_kwargs,
                "messages": repair_messages,
                "max_tokens": max(max_tokens, 2048),
            }
            repair_admission, repair_reservation = await _admit_budgeted_usage_request(
                event_key=_new_usage_event_key("llm-repair"),
                session_factory=ledger_factory,
                client_id=client_id,
                content_item_id=content_item_id,
                parent_event_id=admission.usage_event_id,
                trace_id=usage_trace_id,
                agent_code=agent_code,
                task_type="llm_structured_repair",
                wake_reason=wake_reason,
                provider=provider,
                model=provider_call_model,
                usage_category=request_usage_category,
                maximum_units=maximum_text_units(
                    repair_messages, repair_kwargs["max_tokens"]
                ),
                budget_reservation_store=budget_reservation_store,
                request_mode="structured_repair",
            )
            repair_start_ms = int(time.time() * 1000)
            try:
                litellm_response = await litellm.acompletion(**repair_kwargs)
            except Exception as repair_error:
                repair_failed_at_ms = int(time.time() * 1000)
                try:
                    await _finalize_budgeted_usage_request(
                        reservation=repair_reservation,
                        budget_reservation_store=budget_reservation_store,
                        usage_event_id=repair_admission.usage_event_id,
                        session_factory=ledger_factory,
                        evidence=repair_error,
                        status=UsageEventStatus.FAILED,
                        usage_units=_text_usage_units(repair_error),
                        latency_ms=repair_failed_at_ms - repair_start_ms,
                        error_code=sanitize_error_category(repair_error),
                    )
                except Exception:
                    _mark_reconciliation_required(
                        repair_error, repair_admission.usage_event_id
                    )
                    logger.exception(
                        "Usage ledger finalization failed after repair error: event=%s",
                        repair_admission.usage_event_id,
                    )
                raise
            repair_end_ms = int(time.time() * 1000)
            await _finalize_budgeted_usage_request(
                reservation=repair_reservation,
                budget_reservation_store=budget_reservation_store,
                usage_event_id=repair_admission.usage_event_id,
                session_factory=ledger_factory,
                evidence=litellm_response,
                status=UsageEventStatus.SUCCEEDED,
                usage_units=_text_usage_units(litellm_response),
                latency_ms=repair_end_ms - repair_start_ms,
            )
            content = litellm_response.choices[0].message.content or ""
            content = response_format.model_validate_json(content).model_dump_json()

    returned_units = _text_usage_units(litellm_response)
    response = LLMResponse(
        content=content,
        model_used=provider_call_model,
        tokens_in=returned_units["input_tokens"],
        tokens_out=returned_units["output_tokens"],
        latency_ms=end_ms - start_ms,
        provider=provider,
    )

    # --- Auto-log to task_logs (Observability, MVP Scope §1d) ---
    if session:
        await _log_workflow_task(
            session, client_id, agent_code, response, wake_reason, content_item_id
        )

    return response


async def _log_workflow_task(
    session: AsyncSession,
    client_id: uuid.UUID,
    agent_code: str,
    response: LLMResponse,
    wake_reason: str,
    content_item_id: Optional[uuid.UUID] = None,
) -> None:
    """Keep the transition workflow log; this is not the financial ledger."""
    try:
        log_entry = TaskLog(
            client_id=client_id,
            content_item_id=content_item_id,
            agent_code=agent_code,
            task_type="llm_call",
            model_used=response.model_used,
            tokens_in=response.tokens_in,
            tokens_out=response.tokens_out,
            latency_ms=response.latency_ms,
            status="success",
            wake_reason=wake_reason,
        )
        session.add(log_entry)
        # Don't commit here — let the caller's transaction handle it
    except Exception as e:
        logger.error("Failed to write workflow task log: %s", type(e).__name__)


async def create_asset_embedding(
    *,
    session: AsyncSession,
    client_id: uuid.UUID,
    text_value: str,
    source_image_bytes: bytes | None = None,
    content_item_id: Optional[uuid.UUID] = None,
    wake_reason: str = "semantic_asset_indexing",
    usage_event_key: Optional[str] = None,
    parent_usage_event_id: Optional[uuid.UUID] = None,
    trace_id: Optional[str] = None,
    usage_session_factory: SessionFactory | None = None,
    budget_reservation_store: ReservationStore | None = None,
) -> EmbeddingResponse:
    """Create a query-compatible semantic or semantic+visual representation.

    The provider is selected deterministically (OpenAI, then Google) so asset
    and Visual Intent vectors remain compatible even when D02's image model is
    changed. Providers without an embedding API are never given a fabricated
    production vector.
    """
    normalized_text = " ".join(text_value.split())
    if not normalized_text:
        raise ValueError("Cannot embed an empty semantic representation")
    ledger_factory = _usage_factory(session, usage_session_factory)
    root_event_key = usage_event_key or _new_usage_event_key("embedding")
    usage_trace_id = trace_id or (
        f"content-item:{content_item_id}" if content_item_id is not None else None
    )

    if os.environ.get("CREWLAB_LLM_MOCK", "").lower() in ("true", "1", "yes"):
        admission = await _admit_usage_request(
            event_key=root_event_key,
            session_factory=ledger_factory,
            client_id=client_id,
            content_item_id=content_item_id,
            parent_event_id=parent_usage_event_id,
            trace_id=usage_trace_id,
            agent_code="D02",
            task_type="asset_embedding",
            wake_reason=wake_reason,
            provider="mock",
            model="mock-feature-hash",
            usage_category=UsageCategory.EMBEDDING,
        )
        response = EmbeddingResponse(
            embedding=_compose_asset_embedding(
                _mock_embedding(normalized_text), source_image_bytes
            ),
            model_used="mock-feature-hash",
            provider="mock",
            version=(
                f"mock-feature-hash:{ASSET_EMBEDDING_DIMENSIONS}:"
                f"{ASSET_EMBEDDING_REPRESENTATION}"
            ),
        )
        await _finalize_usage_request(
            usage_event_id=admission.usage_event_id,
            session_factory=ledger_factory,
            evidence=response,
            status=UsageEventStatus.SUCCEEDED,
            usage_units={
                "input_tokens": max(len(normalized_text) // 4, 1),
                "dimensions": ASSET_EMBEDDING_DIMENSIONS,
            },
            latency_ms=0,
        )
        return response

    provider_priority = case(
        (ClientProviderCredential.provider == "openai", 0),
        (ClientProviderCredential.provider == "google", 1),
        else_=99,
    )
    credential = await session.scalar(
        select(ClientProviderCredential)
        .where(
            ClientProviderCredential.client_id == client_id,
            ClientProviderCredential.provider.in_(tuple(_ASSET_EMBEDDING_MODELS)),
            ClientProviderCredential.is_enabled.is_(True),
            ClientProviderCredential.validation_status == "valid",
        )
        .order_by(provider_priority)
        .limit(1)
    )
    if credential is None:
        raise LLMConfigurationError(
            "Semantic image indexing requires an enabled OpenAI or Google credential"
        )

    provider = credential.provider
    model = _ASSET_EMBEDDING_MODELS[provider]
    api_key = get_credential_cipher().decrypt(credential.encrypted_api_key)
    import litellm

    admission, reservation = await _admit_budgeted_usage_request(
        event_key=root_event_key,
        session_factory=ledger_factory,
        client_id=client_id,
        content_item_id=content_item_id,
        parent_event_id=parent_usage_event_id,
        trace_id=usage_trace_id,
        agent_code="D02",
        task_type="asset_embedding",
        wake_reason=wake_reason,
        provider=provider,
        model=model,
        usage_category=UsageCategory.EMBEDDING,
        maximum_units=maximum_embedding_units(
            normalized_text, ASSET_EMBEDDING_DIMENSIONS
        ),
        budget_reservation_store=budget_reservation_store,
    )
    start_ms = int(time.time() * 1000)
    try:
        result = await litellm.aembedding(
            model=model,
            input=[normalized_text],
            dimensions=ASSET_EMBEDDING_DIMENSIONS,
            api_key=api_key,
        )
    except Exception as exc:
        failed_at_ms = int(time.time() * 1000)
        try:
            await _finalize_budgeted_usage_request(
                reservation=reservation,
                budget_reservation_store=budget_reservation_store,
                usage_event_id=admission.usage_event_id,
                session_factory=ledger_factory,
                evidence=exc,
                status=UsageEventStatus.FAILED,
                usage_units={"input_tokens": 0, "dimensions": ASSET_EMBEDDING_DIMENSIONS},
                latency_ms=failed_at_ms - start_ms,
                error_code=sanitize_error_category(exc),
            )
        except Exception:
            _mark_reconciliation_required(exc, admission.usage_event_id)
            logger.exception(
                "Usage ledger finalization failed after embedding error: event=%s",
                admission.usage_event_id,
            )
        logger.error(
            "Embedding call failed: client=%s provider=%s model=%s error=%s",
            client_id,
            provider,
            model,
            sanitize_provider_error(str(exc), api_key),
        )
        raise

    try:
        first = result.data[0]
        values = getattr(first, "embedding", None)
        if values is None and isinstance(first, dict):
            values = first.get("embedding")
        embedding = [float(value) for value in (values or [])]
        if len(embedding) != ASSET_EMBEDDING_DIMENSIONS:
            raise ValueError(
                f"Embedding model returned {len(embedding)} dimensions; "
                f"expected {ASSET_EMBEDDING_DIMENSIONS}"
            )
        composed_embedding = _compose_asset_embedding(embedding, source_image_bytes)
    except Exception as exc:
        failed_at_ms = int(time.time() * 1000)
        usage = _provider_value(result, "usage")
        tokens_in = _usage_count(usage, "prompt_tokens", "input_tokens")
        await _finalize_budgeted_usage_request(
            reservation=reservation,
            budget_reservation_store=budget_reservation_store,
            usage_event_id=admission.usage_event_id,
            session_factory=ledger_factory,
            evidence=result,
            status=UsageEventStatus.FAILED,
            usage_units={
                "input_tokens": tokens_in,
                "dimensions": ASSET_EMBEDDING_DIMENSIONS,
            },
            latency_ms=failed_at_ms - start_ms,
            error_code=sanitize_error_category(exc),
        )
        raise

    usage = _provider_value(result, "usage")
    tokens_in = _usage_count(usage, "prompt_tokens", "input_tokens")
    latency_ms = int(time.time() * 1000) - start_ms
    await _finalize_budgeted_usage_request(
        reservation=reservation,
        budget_reservation_store=budget_reservation_store,
        usage_event_id=admission.usage_event_id,
        session_factory=ledger_factory,
        evidence=result,
        status=UsageEventStatus.SUCCEEDED,
        usage_units={
            "input_tokens": max(tokens_in, 0),
            "dimensions": ASSET_EMBEDDING_DIMENSIONS,
        },
        latency_ms=latency_ms,
    )
    await _log_workflow_task(
        session,
        client_id,
        "D02",
        LLMResponse(
            content="",
            model_used=model,
            tokens_in=tokens_in,
            tokens_out=0,
            latency_ms=latency_ms,
            provider=provider,
        ),
        wake_reason,
        content_item_id,
    )
    return EmbeddingResponse(
        embedding=composed_embedding,
        model_used=model,
        provider=provider,
        version=(
            f"{provider}:{model}:{ASSET_EMBEDDING_DIMENSIONS}:"
            f"{ASSET_EMBEDDING_REPRESENTATION}"
        ),
    )


async def generate_image(
    *,
    session: AsyncSession,
    client_id: uuid.UUID,
    prompt: str,
    size: str = "1024x1024",
    content_item_id: Optional[uuid.UUID] = None,
    source_image_bytes: bytes | None = None,
    source_file_name: str = "source.png",
    source_content_type: str = "image/png",
    generation_mode: str = "new_generation",
    usage_event_key: Optional[str] = None,
    parent_usage_event_id: Optional[uuid.UUID] = None,
    trace_id: Optional[str] = None,
    usage_session_factory: SessionFactory | None = None,
    budget_reservation_store: ReservationStore | None = None,
) -> ImageGenerationResponse:
    """Generate D02's final visual through the configured per-client image model."""
    ledger_factory = _usage_factory(session, usage_session_factory)
    root_event_key = usage_event_key or _new_usage_event_key("image")
    usage_trace_id = trace_id or (
        f"content-item:{content_item_id}" if content_item_id is not None else None
    )
    if os.environ.get("CREWLAB_LLM_MOCK", "").lower() in ("true", "1", "yes"):
        admission = await _admit_usage_request(
            event_key=root_event_key,
            session_factory=ledger_factory,
            client_id=client_id,
            content_item_id=content_item_id,
            parent_event_id=parent_usage_event_id,
            trace_id=usage_trace_id,
            agent_code="D02",
            task_type="image_generation",
            wake_reason="visual_generation",
            provider="mock",
            model="mock-image-model",
            usage_category=UsageCategory.IMAGE,
            request_mode=generation_mode,
        )
        response = ImageGenerationResponse(
            image_url=f"mock://generated/{uuid.uuid4()}.png",
            image_bytes=None,
            model_used="mock-image-model",
            provider="mock",
        )
        await _finalize_usage_request(
            usage_event_id=admission.usage_event_id,
            session_factory=ledger_factory,
            evidence=response,
            status=UsageEventStatus.SUCCEEDED,
            usage_units={
                "images": 1,
                "source_images": 1 if source_image_bytes is not None else 0,
                "image_edits": 1 if source_image_bytes is not None else 0,
                "image_generations": 0 if source_image_bytes is not None else 1,
            },
            latency_ms=0,
        )
        return response

    config = await session.scalar(
        select(ClientLLMConfig).where(
            ClientLLMConfig.client_id == client_id,
            ClientLLMConfig.agent_code == "D02",
            ClientLLMConfig.is_active.is_(True),
        )
    )
    if config is None or "image_generation" not in catalog_entry(config.model).capabilities:
        raise LLMConfigurationError("D02 requires an active image-capable model")
    credential = await session.scalar(
        select(ClientProviderCredential).where(
            ClientProviderCredential.client_id == client_id,
            ClientProviderCredential.provider == config.provider,
            ClientProviderCredential.is_enabled.is_(True),
            ClientProviderCredential.validation_status == "valid",
        )
    )
    if credential is None:
        raise LLMConfigurationError("D02 image provider has no valid credential")

    api_key = get_credential_cipher().decrypt(credential.encrypted_api_key)
    import litellm

    if config.provider == "openai":
        provider_model = config.model
    elif config.provider == "qwen":
        provider_model = f"dashscope/{config.model}"
    else:
        provider_model = f"{config.provider}/{config.model}"
    admission, reservation = await _admit_budgeted_usage_request(
        event_key=root_event_key,
        session_factory=ledger_factory,
        client_id=client_id,
        content_item_id=content_item_id,
        parent_event_id=parent_usage_event_id,
        trace_id=usage_trace_id,
        agent_code="D02",
        task_type="image_generation",
        wake_reason="visual_generation",
        provider=config.provider,
        model=config.model,
        usage_category=UsageCategory.IMAGE,
        maximum_units=maximum_image_units(
            has_source_image=source_image_bytes is not None
        ),
        budget_reservation_store=budget_reservation_store,
        request_mode=generation_mode,
    )
    start_ms = int(time.time() * 1000)
    result = None
    try:
        common_kwargs = {
            "model": provider_model,
            "prompt": prompt,
            "size": size,
            "api_key": api_key,
        }
        if source_image_bytes is not None:
            source_stream = io.BytesIO(source_image_bytes)
            source_stream.name = source_file_name
            source_stream.content_type = source_content_type
            result = await litellm.aimage_edit(
                image=source_stream,
                **common_kwargs,
            )
        else:
            if generation_mode != "new_generation":
                raise ValueError(f"{generation_mode} requires immutable source pixels")
            result = await litellm.aimage_generation(**common_kwargs)

        first = result.data[0]
        image_url = getattr(first, "url", None)
        encoded = getattr(first, "b64_json", None)
        if isinstance(first, dict):
            image_url = image_url or first.get("url")
            encoded = encoded or first.get("b64_json")
        image_bytes = base64.b64decode(encoded, validate=True) if encoded else None
        if image_bytes is None and image_url:
            parsed = urlparse(image_url)
            if parsed.scheme != "https":
                raise ValueError("Image provider returned a non-HTTPS output URL")

            def _download() -> bytes:
                request = Request(image_url, headers={"User-Agent": "CrewLab/1.0"})
                with urlopen(request, timeout=30) as response:
                    payload = response.read(50 * 1024 * 1024 + 1)
                if len(payload) > 50 * 1024 * 1024:
                    raise ValueError("Generated image exceeds the 50 MB storage limit")
                return payload

            image_bytes = await asyncio.to_thread(_download)
        if not image_bytes:
            raise ValueError("Image provider returned no retrievable image bytes")
    except Exception as exc:
        failed_at_ms = int(time.time() * 1000)
        has_provider_evidence = result is not None
        try:
            await _finalize_budgeted_usage_request(
                reservation=reservation,
                budget_reservation_store=budget_reservation_store,
                usage_event_id=admission.usage_event_id,
                session_factory=ledger_factory,
                evidence=result if result is not None else exc,
                status=UsageEventStatus.FAILED,
                usage_units={
                    "images": 1 if has_provider_evidence else 0,
                    "source_images": (
                        1
                        if has_provider_evidence and source_image_bytes is not None
                        else 0
                    ),
                    "image_edits": (
                        1
                        if has_provider_evidence and source_image_bytes is not None
                        else 0
                    ),
                    "image_generations": (
                        1
                        if has_provider_evidence and source_image_bytes is None
                        else 0
                    ),
                },
                latency_ms=failed_at_ms - start_ms,
                error_code=sanitize_error_category(exc),
            )
        except Exception:
            _mark_reconciliation_required(exc, admission.usage_event_id)
            logger.exception(
                "Usage ledger finalization failed after image error: event=%s",
                admission.usage_event_id,
            )
        logger.exception("D02 image generation failed for client=%s model=%s", client_id, config.model)
        raise

    await _finalize_budgeted_usage_request(
        reservation=reservation,
        budget_reservation_store=budget_reservation_store,
        usage_event_id=admission.usage_event_id,
        session_factory=ledger_factory,
        evidence=result,
        status=UsageEventStatus.SUCCEEDED,
        usage_units={
            "images": 1,
            "source_images": 1 if source_image_bytes is not None else 0,
            "image_edits": 1 if source_image_bytes is not None else 0,
            "image_generations": 0 if source_image_bytes is not None else 1,
        },
        latency_ms=int(time.time() * 1000) - start_ms,
    )
    return ImageGenerationResponse(
        image_url=image_url or "provider-binary://generated",
        image_bytes=image_bytes,
        model_used=config.model,
        provider=config.provider,
    )

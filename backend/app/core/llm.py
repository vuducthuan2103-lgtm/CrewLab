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

    # --- Mock mode ---
    if os.environ.get("CREWLAB_LLM_MOCK", "").lower() in ("true", "1", "yes"):
        logger.info(f"[LLM MOCK] agent={agent_code} mock_key={mock_key or agent_code} client={client_id}")
        response = _mock_llm_response(agent_code, messages, response_format, mock_key=mock_key)
        if session:
            await _log_task(session, client_id, agent_code, response, wake_reason, content_item_id)
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
    litellm_model = (
        f"{provider}/{provider_call_model}" if provider != "openai" else provider_call_model
    )

    start_ms = int(time.time() * 1000)
    try:
        request_messages = list(messages)
        completion_kwargs = {
            "model": litellm_model,
            "messages": request_messages,
            "max_tokens": max_tokens,
            "api_key": api_key,
        }
        # D02 image models use a GPT-5 chat companion for semantic analysis.
        # GPT-5 rejects CrewLab's generic custom temperature (0.7), so let the
        # provider use its supported default unless the caller explicitly uses 1.
        if not provider_call_model.casefold().startswith("gpt-5") or temperature == 1:
            completion_kwargs["temperature"] = temperature
        if response_format is not None:
            if provider == "deepseek":
                # DeepSeek supports JSON object mode, but not the JSON Schema
                # response_format that LiteLLM derives from a Pydantic class.
                # Give the model the schema in the prompt and validate the
                # returned JSON below before any workflow code can use it.
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

        litellm_response = await litellm.acompletion(
            **completion_kwargs,
        )
    except Exception as e:
        safe_error = sanitize_provider_error(str(e), api_key)
        logger.error(
            "LLM call failed: agent=%s model=%s error=%s",
            agent_code,
            model,
            safe_error,
        )
        raise

    end_ms = int(time.time() * 1000)

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
            litellm_response = await litellm.acompletion(**repair_kwargs)
            content = litellm_response.choices[0].message.content or ""
            content = response_format.model_validate_json(content).model_dump_json()

    response = LLMResponse(
        content=content,
        model_used=provider_call_model,
        tokens_in=litellm_response.usage.prompt_tokens if litellm_response.usage else 0,
        tokens_out=litellm_response.usage.completion_tokens if litellm_response.usage else 0,
        latency_ms=end_ms - start_ms,
        provider=provider,
    )

    # --- Auto-log to task_logs (Observability, MVP Scope §1d) ---
    if session:
        await _log_task(session, client_id, agent_code, response, wake_reason, content_item_id)

    return response


async def _log_task(
    session: AsyncSession,
    client_id: uuid.UUID,
    agent_code: str,
    response: LLMResponse,
    wake_reason: str,
    content_item_id: Optional[uuid.UUID] = None,
) -> None:
    """Write observability record to task_logs table."""
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
        logger.error(f"Failed to log task: {e}")


async def create_asset_embedding(
    *,
    session: AsyncSession,
    client_id: uuid.UUID,
    text_value: str,
    source_image_bytes: bytes | None = None,
    content_item_id: Optional[uuid.UUID] = None,
    wake_reason: str = "semantic_asset_indexing",
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

    if os.environ.get("CREWLAB_LLM_MOCK", "").lower() in ("true", "1", "yes"):
        return EmbeddingResponse(
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

    start_ms = int(time.time() * 1000)
    try:
        result = await litellm.aembedding(
            model=model,
            input=[normalized_text],
            dimensions=ASSET_EMBEDDING_DIMENSIONS,
            api_key=api_key,
        )
    except Exception as exc:
        logger.error(
            "Embedding call failed: client=%s provider=%s model=%s error=%s",
            client_id,
            provider,
            model,
            sanitize_provider_error(str(exc), api_key),
        )
        raise

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

    usage = getattr(result, "usage", None)
    tokens_in = int(getattr(usage, "prompt_tokens", 0) or 0)
    await _log_task(
        session,
        client_id,
        "D02",
        LLMResponse(
            content="",
            model_used=model,
            tokens_in=tokens_in,
            tokens_out=0,
            latency_ms=int(time.time() * 1000) - start_ms,
            provider=provider,
        ),
        wake_reason,
        content_item_id,
    )
    return EmbeddingResponse(
        embedding=_compose_asset_embedding(embedding, source_image_bytes),
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
) -> ImageGenerationResponse:
    """Generate D02's final visual through the configured per-client image model."""
    if os.environ.get("CREWLAB_LLM_MOCK", "").lower() in ("true", "1", "yes"):
        return ImageGenerationResponse(
            image_url=f"mock://generated/{uuid.uuid4()}.png",
            image_bytes=None,
            model_used="mock-image-model",
            provider="mock",
        )

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

    provider_model = f"{config.provider}/{config.model}" if config.provider != "openai" else config.model
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
    except Exception:
        logger.exception("D02 image generation failed for client=%s model=%s", client_id, config.model)
        raise

    return ImageGenerationResponse(
        image_url=image_url or "provider-binary://generated",
        image_bytes=image_bytes,
        model_used=config.model,
        provider=config.provider,
    )

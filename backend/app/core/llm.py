"""
LLM abstraction layer — all agents call call_llm(), never import provider SDKs directly.

Uses litellm (pip install litellm, MIT license) as the routing layer.
See docs/decisions/0004-litellm-abstraction.md for rationale.

Spec 0010: provider credentials are resolved per client from encrypted database
rows. Environment provider keys are intentionally not used as a fallback.
"""
import os
import time
import json
import uuid
import logging
from typing import Optional, Type

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.llm_config import ClientLLMConfig
from app.models.provider_credentials import ClientProviderCredential
from app.models.system import TaskLog
from app.core.db import settings, utcnow
from app.core.credentials import get_credential_cipher, sanitize_provider_error
from app.core.model_catalog import chat_model_for

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
            "temperature": temperature,
            "max_tokens": max_tokens,
            "api_key": api_key,
        }
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

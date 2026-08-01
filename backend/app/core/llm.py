"""
LLM abstraction layer — all agents call call_llm(), never import provider SDKs directly.

Uses litellm (pip install litellm, MIT license) as the routing layer.
See docs/decisions/0004-litellm-abstraction.md for rationale.

Phase 1: API keys resolved via PROVIDER_ENV_MAP (1 set of keys for entire agency).
Phase 6+: will need per-client secret management — see AGENTS.md.
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
from app.models.system import TaskLog
from app.core.db import settings, utcnow

logger = logging.getLogger(__name__)

# --- Provider → Env Var mapping (Phase 1: agency-wide keys) ---
PROVIDER_ENV_MAP = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "google": "GOOGLE_API_KEY",
}


class LLMResponse(BaseModel):
    """Standardized response from any LLM provider."""
    content: str
    model_used: str
    tokens_in: int
    tokens_out: int
    latency_ms: int
    provider: str


def _get_api_key(provider: str) -> str:
    """Resolve API key from environment variable based on provider name."""
    env_var = PROVIDER_ENV_MAP.get(provider)
    if not env_var:
        raise ValueError(f"Unknown provider '{provider}'. Known: {list(PROVIDER_ENV_MAP.keys())}")
    key = os.environ.get(env_var, "")
    if not key:
        raise ValueError(f"Environment variable '{env_var}' not set for provider '{provider}'")
    return key


def _mock_llm_response(
    agent_code: str,
    messages: list[dict],
    response_format: Optional[Type[BaseModel]] = None,
) -> LLMResponse:
    """Return a hardcoded mock response for testing without API keys."""
    mock_responses = {
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
    }

    content = mock_responses.get(agent_code, '{"result": "mock response"}')
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
    
    Returns:
        LLMResponse with content, usage stats, and provider info
    """

    # --- Mock mode ---
    if os.environ.get("CREWLAB_LLM_MOCK", "").lower() in ("true", "1", "yes"):
        logger.info(f"[LLM MOCK] agent={agent_code} client={client_id}")
        response = _mock_llm_response(agent_code, messages, response_format)
        if session:
            await _log_task(session, client_id, agent_code, response, wake_reason, content_item_id)
        return response

    # --- Real mode: read config from DB ---
    provider = "openai"
    model = "gpt-4o"

    if session:
        stmt = select(ClientLLMConfig).where(
            ClientLLMConfig.client_id == client_id,
            ClientLLMConfig.agent_code == agent_code,
            ClientLLMConfig.is_active == True,
        )
        result = await session.execute(stmt)
        config = result.scalar_one_or_none()

        if config:
            provider = config.provider
            model = config.model
        else:
            logger.warning(
                f"No LLM config for client={client_id} agent={agent_code}, using defaults"
            )

    # Resolve API key
    api_key = _get_api_key(provider)

    # --- Call via litellm ---
    import litellm

    # litellm uses "provider/model" format for routing
    litellm_model = f"{provider}/{model}" if provider != "openai" else model

    start_ms = int(time.time() * 1000)
    try:
        litellm_response = await litellm.acompletion(
            model=litellm_model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            api_key=api_key,
        )
    except Exception as e:
        logger.error(f"LLM call failed: agent={agent_code} model={model} error={e}")
        raise

    end_ms = int(time.time() * 1000)

    response = LLMResponse(
        content=litellm_response.choices[0].message.content or "",
        model_used=model,
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

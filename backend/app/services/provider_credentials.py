"""Credential lifecycle and activation rules for Spec 0010."""

from collections.abc import Awaitable, Callable
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.credentials import (
    get_credential_cipher,
    mask_api_key,
    sanitize_provider_error,
)
from app.core.db import utcnow
from app.core.model_catalog import (
    MODEL_CATALOG,
    MVP_AGENT_CODES,
    SUPPORTED_PROVIDERS,
    eligible_models,
)
from app.models.clients import Client
from app.models.llm_config import ClientLLMConfig
from app.models.provider_credentials import ClientProviderCredential
from app.models.system import AuditLog


CredentialValidator = Callable[[str, str], Awaitable[None]]


class ProviderConfigurationError(ValueError):
    def __init__(
        self,
        message: str,
        *,
        code: str = "PROVIDER_CONFIGURATION_INVALID",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.details = details or {}


def normalize_api_key(key: str) -> str:
    """Sanitize API key by stripping quotes, whitespace, zero-width chars, and common prefixes."""
    import re
    cleaned = key.strip().strip("'\"`")
    if cleaned.lower().startswith("bearer "):
        cleaned = cleaned[7:].strip()
    if "=" in cleaned and not cleaned.startswith("sk-"):
        parts = cleaned.split("=", 1)
        if len(parts) == 2 and "key" in parts[0].lower():
            cleaned = parts[1].strip().strip("'\"`")
    return re.sub(r"[\s\u200b\u200c\u200d\uFEFF\u00a0]+", "", cleaned)


async def validate_provider_api_key(provider: str, api_key: str) -> None:
    """Make a minimal real provider request without logging secret material."""
    import litellm

    clean_key = normalize_api_key(api_key)
    validation_models = {
        "openai": "gpt-4.1-mini",
        "anthropic": "anthropic/claude-haiku-4-5-20251001",
        "google": "google/gemini-2.5-flash-lite",
        "deepseek": "deepseek/deepseek-v4-flash",
        "qwen": "dashscope/qwen-turbo",
    }
    model = validation_models.get(provider)
    if model is None:
        raise ValueError("Unsupported provider")

    if provider == "qwen":
        import httpx

        endpoints = [
            "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models",
            "https://dashscope.aliyuncs.com/compatible-mode/v1/models",
            "https://dashscope-us.aliyuncs.com/compatible-mode/v1/models",
        ]
        authenticated = False
        last_error_message = None
        async with httpx.AsyncClient(timeout=8.0) as http_client:
            for url in endpoints:
                try:
                    resp = await http_client.get(
                        url, headers={"Authorization": f"Bearer {clean_key}"}
                    )
                    if resp.status_code in (200, 403):
                        authenticated = True
                        break
                    elif resp.status_code == 401:
                        last_error_message = resp.text
                        continue
                except Exception as exc:
                    last_error_message = str(exc)

        if not authenticated:
            raise ValueError(last_error_message or "API key authentication failed for Qwen")
        return
    else:
        await litellm.acompletion(
            model=model,
            messages=[{"role": "user", "content": "Reply with OK."}],
            max_tokens=2,
            temperature=0,
            api_key=clean_key,
        )


def provider_public_dict(row: ClientProviderCredential) -> dict[str, Any]:
    return {
        "provider": row.provider,
        "key_hint": row.key_hint,
        "is_enabled": row.is_enabled,
        "validation_status": row.validation_status,
        "last_tested_at": row.last_tested_at.isoformat() if row.last_tested_at else None,
        "last_test_error": row.last_test_error,
    }


async def _require_client(session: AsyncSession, client_id: UUID) -> Client:
    client = await session.get(Client, client_id)
    if client is None:
        raise ProviderConfigurationError(
            "Client not found", code="CLIENT_NOT_FOUND"
        )
    return client


def _audit(
    session: AsyncSession,
    *,
    client_id: UUID,
    actor_id: UUID,
    action: str,
    details: dict[str, Any],
) -> None:
    session.add(
        AuditLog(
            client_id=client_id,
            user_id=actor_id,
            action=action,
            details=details,
        )
    )


async def list_provider_credentials(
    session: AsyncSession, client_id: UUID
) -> list[ClientProviderCredential]:
    await _require_client(session, client_id)
    rows = await session.scalars(
        select(ClientProviderCredential)
        .where(ClientProviderCredential.client_id == client_id)
        .order_by(ClientProviderCredential.provider.asc())
    )
    return list(rows.all())


async def save_validated_credential(
    session: AsyncSession,
    client_id: UUID,
    provider: str,
    api_key: str,
    actor_id: UUID,
    *,
    validator: CredentialValidator = validate_provider_api_key,
) -> ClientProviderCredential:
    await _require_client(session, client_id)
    if provider not in SUPPORTED_PROVIDERS:
        raise ProviderConfigurationError(
            f"Provider '{provider}' is not supported", code="PROVIDER_UNSUPPORTED"
        )
    normalized_key = normalize_api_key(api_key)
    if not normalized_key:
        raise ProviderConfigurationError("API key is required", code="CREDENTIAL_REQUIRED")

    try:
        await validator(provider, normalized_key)
    except Exception as exc:
        safe_error = sanitize_provider_error(str(exc), normalized_key)
        raise ProviderConfigurationError(
            f"Credential for {provider} could not be validated: {safe_error}",
            code="CREDENTIAL_INVALID",
        ) from None

    row = await session.scalar(
        select(ClientProviderCredential).where(
            ClientProviderCredential.client_id == client_id,
            ClientProviderCredential.provider == provider,
        )
    )
    action = "provider_credential_replaced" if row else "provider_credential_created"
    hint = mask_api_key(normalized_key)
    encrypted = get_credential_cipher().encrypt(normalized_key)
    now = utcnow()

    if row is None:
        row = ClientProviderCredential(
            client_id=client_id,
            provider=provider,
            encrypted_api_key=encrypted,
            key_hint=hint,
            is_enabled=False,
            validation_status="valid",
            last_tested_at=now,
            created_by=actor_id,
            updated_by=actor_id,
        )
        session.add(row)
    else:
        row.encrypted_api_key = encrypted
        row.key_hint = hint
        row.validation_status = "valid"
        row.last_tested_at = now
        row.last_test_error = None
        row.updated_by = actor_id

    _audit(
        session,
        client_id=client_id,
        actor_id=actor_id,
        action=action,
        details={"provider": provider, "key_hint": hint, "validation_status": "valid"},
    )
    await session.commit()
    await session.refresh(row)
    return row


async def retest_credential(
    session: AsyncSession,
    client_id: UUID,
    provider: str,
    actor_id: UUID,
    *,
    validator: CredentialValidator = validate_provider_api_key,
) -> ClientProviderCredential:
    client = await _require_client(session, client_id)
    row = await session.scalar(
        select(ClientProviderCredential).where(
            ClientProviderCredential.client_id == client_id,
            ClientProviderCredential.provider == provider,
        )
    )
    if row is None:
        raise ProviderConfigurationError(
            "Credential has not been configured", code="CREDENTIAL_NOT_FOUND"
        )
    api_key = get_credential_cipher().decrypt(row.encrypted_api_key)
    try:
        await validator(provider, api_key)
    except Exception as exc:
        row.validation_status = "invalid"
        row.is_enabled = False
        row.last_test_error = sanitize_provider_error(str(exc), api_key)
        row.last_tested_at = utcnow()
        row.updated_by = actor_id
        enabled_count = await session.scalar(
            select(func.count())
            .select_from(ClientProviderCredential)
            .where(
                ClientProviderCredential.client_id == client_id,
                ClientProviderCredential.is_enabled.is_(True),
                ClientProviderCredential.validation_status == "valid",
            )
        )
        if client.is_active and not enabled_count:
            client.is_active = False
        _audit(
            session,
            client_id=client_id,
            actor_id=actor_id,
            action="provider_tested",
            details={"provider": provider, "validation_status": "invalid"},
        )
        await session.commit()
        return row

    row.validation_status = "valid"
    row.last_test_error = None
    row.last_tested_at = utcnow()
    row.updated_by = actor_id
    _audit(
        session,
        client_id=client_id,
        actor_id=actor_id,
        action="provider_tested",
        details={"provider": provider, "validation_status": "valid"},
    )
    await session.commit()
    return row


async def set_provider_enabled(
    session: AsyncSession,
    client_id: UUID,
    provider: str,
    is_enabled: bool,
    actor_id: UUID,
    *,
    confirm_affected_agents: bool = False,
) -> ClientProviderCredential:
    client = await _require_client(session, client_id)
    row = await session.scalar(
        select(ClientProviderCredential).where(
            ClientProviderCredential.client_id == client_id,
            ClientProviderCredential.provider == provider,
        )
    )
    if row is None:
        raise ProviderConfigurationError(
            "Credential has not been configured", code="CREDENTIAL_NOT_FOUND"
        )
    if row.is_enabled == is_enabled:
        return row

    affected_agents: list[str] = []
    if is_enabled:
        if row.validation_status != "valid":
            raise ProviderConfigurationError(
                "Provider credential must be valid before enabling",
                code="CREDENTIAL_NOT_VALID",
            )
        enabled_count = await session.scalar(
            select(func.count())
            .select_from(ClientProviderCredential)
            .where(
                ClientProviderCredential.client_id == client_id,
                ClientProviderCredential.is_enabled.is_(True),
            )
        )
        if enabled_count >= 2:
            raise ProviderConfigurationError(
                "A client can enable at most two providers",
                code="PROVIDER_LIMIT_REACHED",
            )
    else:
        affected_agents = list(
            (
                await session.scalars(
                    select(ClientLLMConfig.agent_code)
                    .where(
                        ClientLLMConfig.client_id == client_id,
                        ClientLLMConfig.provider == provider,
                        ClientLLMConfig.is_active.is_(True),
                    )
                    .order_by(ClientLLMConfig.agent_code.asc())
                )
            ).all()
        )
        if affected_agents and not confirm_affected_agents:
            raise ProviderConfigurationError(
                "Provider is selected by active agents",
                code="PROVIDER_IN_USE",
                details={"affected_agents": affected_agents},
            )
        other_enabled = await session.scalar(
            select(func.count())
            .select_from(ClientProviderCredential)
            .where(
                ClientProviderCredential.client_id == client_id,
                ClientProviderCredential.provider != provider,
                ClientProviderCredential.is_enabled.is_(True),
                ClientProviderCredential.validation_status == "valid",
            )
        )
        if client.is_active and not other_enabled:
            raise ProviderConfigurationError(
                "An active client must keep at least one enabled provider",
                code="LAST_PROVIDER_REQUIRED",
            )
        if affected_agents:
            configs = await session.scalars(
                select(ClientLLMConfig).where(
                    ClientLLMConfig.client_id == client_id,
                    ClientLLMConfig.provider == provider,
                    ClientLLMConfig.is_active.is_(True),
                )
            )
            for config in configs.all():
                config.is_active = False

    row.is_enabled = is_enabled
    row.updated_by = actor_id
    _audit(
        session,
        client_id=client_id,
        actor_id=actor_id,
        action="provider_enabled" if is_enabled else "provider_disabled",
        details={"provider": provider, "affected_agents": affected_agents},
    )
    await session.commit()
    await session.refresh(row)
    return row


def _default_model_for_agent(agent_code: str, providers: set[str]):
    candidates = eligible_models(providers, agent_code=agent_code)
    tier_order = {"standard": 0, "fast": 1, "power": 2}
    return min(candidates, key=lambda item: tier_order[item.tier]) if candidates else None


async def activate_client(
    session: AsyncSession, client_id: UUID, actor_id: UUID
) -> Client:
    client = await _require_client(session, client_id)
    rows = (
        await session.scalars(
            select(ClientProviderCredential).where(
                ClientProviderCredential.client_id == client_id,
                ClientProviderCredential.is_enabled.is_(True),
                ClientProviderCredential.validation_status == "valid",
            )
        )
    ).all()
    if not 1 <= len(rows) <= 2:
        raise ProviderConfigurationError(
            "Client activation requires one or two enabled, valid providers",
            code="ACTIVATION_PROVIDER_COUNT_INVALID",
        )
    providers = {row.provider for row in rows}
    defaults = {
        agent_code: _default_model_for_agent(agent_code, providers)
        for agent_code in MVP_AGENT_CODES
    }
    missing_agents = sorted(code for code, model in defaults.items() if model is None)
    if missing_agents:
        raise ProviderConfigurationError(
            "Enabled providers do not cover all MVP agents: " + ", ".join(missing_agents),
            code="ACTIVATION_MODEL_COVERAGE_MISSING",
            details={"missing_agents": missing_agents},
        )

    existing = {
        config.agent_code: config
        for config in (
            await session.scalars(
                select(ClientLLMConfig).where(ClientLLMConfig.client_id == client_id)
            )
        ).all()
    }
    for agent_code, model in defaults.items():
        config = existing.get(agent_code)
        if config is None:
            config = ClientLLMConfig(client_id=client_id, agent_code=agent_code)
            session.add(config)
        if not config.is_active or config.provider not in providers:
            config.provider = model.provider
            config.model = model.id
            config.tier = model.tier
        config.is_active = True
        if config.budget_usd is None:
            config.budget_usd = 10

    client.is_active = True
    _audit(
        session,
        client_id=client_id,
        actor_id=actor_id,
        action="client_activated",
        details={"providers": sorted(providers)},
    )
    await session.commit()
    await session.refresh(client)
    return client

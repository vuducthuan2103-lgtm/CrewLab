import uuid

import pytest
from cryptography.fernet import Fernet
from sqlalchemy import select

from app.core import db as db_module
from app.models.clients import Client
from app.models.llm_config import ClientLLMConfig
from app.models.provider_credentials import ClientProviderCredential
from app.models.system import AuditLog
from app.services.provider_credentials import (
    ProviderConfigurationError,
    activate_client,
    save_validated_credential,
    set_provider_enabled,
)


async def _client(session, name="Test Client"):
    client = Client(name=name, brand_name=name, is_active=False)
    session.add(client)
    await session.commit()
    return client


async def _valid(_provider: str, _api_key: str) -> None:
    return None


@pytest.mark.asyncio
async def test_save_credential_encrypts_secret_and_audit_is_safe(db_session, monkeypatch):
    monkeypatch.setattr(
        db_module.settings,
        "CREWLAB_CREDENTIAL_ENCRYPTION_KEY",
        Fernet.generate_key().decode(),
    )
    client = await _client(db_session)
    actor = uuid.uuid4()
    secret = "sk-super-secret-123456"

    row = await save_validated_credential(
        db_session, client.id, "openai", secret, actor, validator=_valid
    )

    assert secret not in row.encrypted_api_key
    assert row.key_hint == "••••3456"
    audit = await db_session.scalar(select(AuditLog))
    assert secret not in str(audit.details)


@pytest.mark.asyncio
async def test_invalid_replacement_preserves_existing_credential(db_session, monkeypatch):
    monkeypatch.setattr(
        db_module.settings,
        "CREWLAB_CREDENTIAL_ENCRYPTION_KEY",
        Fernet.generate_key().decode(),
    )
    client = await _client(db_session)
    actor = uuid.uuid4()
    original = await save_validated_credential(
        db_session, client.id, "openai", "sk-valid-1111", actor, validator=_valid
    )
    original_ciphertext = original.encrypted_api_key

    async def invalid(_provider: str, _api_key: str) -> None:
        raise ValueError("invalid credential")

    with pytest.raises(ProviderConfigurationError, match="could not be validated"):
        await save_validated_credential(
            db_session, client.id, "openai", "sk-invalid-2222", actor, validator=invalid
        )

    await db_session.refresh(original)
    assert original.encrypted_api_key == original_ciphertext


@pytest.mark.asyncio
async def test_cannot_enable_third_provider(db_session, monkeypatch):
    monkeypatch.setattr(
        db_module.settings,
        "CREWLAB_CREDENTIAL_ENCRYPTION_KEY",
        Fernet.generate_key().decode(),
    )
    client = await _client(db_session)
    actor = uuid.uuid4()
    for provider in ("openai", "anthropic", "google"):
        await save_validated_credential(
            db_session, client.id, provider, f"key-{provider}-1234", actor, validator=_valid
        )
    await set_provider_enabled(db_session, client.id, "openai", True, actor)
    await set_provider_enabled(db_session, client.id, "anthropic", True, actor)

    with pytest.raises(ProviderConfigurationError, match="two providers"):
        await set_provider_enabled(db_session, client.id, "google", True, actor)


@pytest.mark.asyncio
async def test_activation_seeds_all_six_agent_configs_for_openai(db_session, monkeypatch):
    monkeypatch.setattr(
        db_module.settings,
        "CREWLAB_CREDENTIAL_ENCRYPTION_KEY",
        Fernet.generate_key().decode(),
    )
    client = await _client(db_session)
    actor = uuid.uuid4()
    await save_validated_credential(
        db_session, client.id, "openai", "sk-valid-1234", actor, validator=_valid
    )
    await set_provider_enabled(db_session, client.id, "openai", True, actor)

    await activate_client(db_session, client.id, actor)

    configs = (
        await db_session.execute(
            select(ClientLLMConfig).where(ClientLLMConfig.client_id == client.id)
        )
    ).scalars().all()
    assert {config.agent_code for config in configs} == {
        "A01", "B02", "B03", "D01", "D02", "E01"
    }
    await db_session.refresh(client)
    assert client.is_active is True


@pytest.mark.asyncio
async def test_anthropic_only_cannot_activate_because_d02_has_no_image_model(db_session, monkeypatch):
    monkeypatch.setattr(
        db_module.settings,
        "CREWLAB_CREDENTIAL_ENCRYPTION_KEY",
        Fernet.generate_key().decode(),
    )
    client = await _client(db_session)
    actor = uuid.uuid4()
    await save_validated_credential(
        db_session, client.id, "anthropic", "sk-ant-valid-1234", actor, validator=_valid
    )
    await set_provider_enabled(db_session, client.id, "anthropic", True, actor)

    with pytest.raises(ProviderConfigurationError, match="D02"):
        await activate_client(db_session, client.id, actor)


@pytest.mark.asyncio
async def test_disabling_in_use_provider_requires_confirmation(db_session, monkeypatch):
    monkeypatch.setattr(
        db_module.settings,
        "CREWLAB_CREDENTIAL_ENCRYPTION_KEY",
        Fernet.generate_key().decode(),
    )
    client = await _client(db_session)
    actor = uuid.uuid4()
    for provider in ("openai", "google"):
        await save_validated_credential(
            db_session, client.id, provider, f"key-{provider}-1234", actor, validator=_valid
        )
        await set_provider_enabled(db_session, client.id, provider, True, actor)
    await activate_client(db_session, client.id, actor)

    with pytest.raises(ProviderConfigurationError) as error:
        await set_provider_enabled(db_session, client.id, "openai", False, actor)

    assert error.value.code == "PROVIDER_IN_USE"
    assert error.value.details["affected_agents"]

    await set_provider_enabled(
        db_session,
        client.id,
        "openai",
        False,
        actor,
        confirm_affected_agents=True,
    )
    active_openai_configs = (
        await db_session.scalars(
            select(ClientLLMConfig).where(
                ClientLLMConfig.client_id == client.id,
                ClientLLMConfig.provider == "openai",
                ClientLLMConfig.is_active.is_(True),
            )
        )
    ).all()
    assert active_openai_configs == []

import sys
import types
import uuid

import pytest
from cryptography.fernet import Fernet
from pydantic import BaseModel

from app.core import db as db_module
from app.core.credentials import CredentialCipher
from app.core.llm import LLMConfigurationError, call_llm
from app.models.clients import Client
from app.models.llm_config import ClientLLMConfig
from app.models.provider_credentials import ClientProviderCredential


class StructuredReply(BaseModel):
    reply: str


@pytest.mark.asyncio
async def test_real_llm_call_uses_same_clients_decrypted_key(db_session, monkeypatch):
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "false")
    master_key = Fernet.generate_key().decode()
    monkeypatch.setattr(
        db_module.settings, "CREWLAB_CREDENTIAL_ENCRYPTION_KEY", master_key
    )
    secret = "sk-client-specific-1234"
    client = Client(name="Routing", brand_name="Routing", is_active=True)
    db_session.add(client)
    await db_session.flush()
    db_session.add_all(
        [
            ClientLLMConfig(
                client_id=client.id,
                agent_code="D01",
                provider="openai",
                model="gpt-5-mini",
                tier="standard",
                is_active=True,
            ),
            ClientProviderCredential(
                client_id=client.id,
                provider="openai",
                encrypted_api_key=CredentialCipher(master_key).encrypt(secret),
                key_hint="••••1234",
                is_enabled=True,
                validation_status="valid",
                created_by=uuid.uuid4(),
                updated_by=uuid.uuid4(),
            ),
        ]
    )
    await db_session.commit()
    captured = {}

    async def fake_acompletion(**kwargs):
        captured.update(kwargs)
        return types.SimpleNamespace(
            choices=[types.SimpleNamespace(message=types.SimpleNamespace(content="ok"))],
            usage=None,
        )

    monkeypatch.setitem(
        sys.modules, "litellm", types.SimpleNamespace(acompletion=fake_acompletion)
    )

    response = await call_llm(
        client_id=client.id,
        agent_code="D01",
        messages=[{"role": "user", "content": "test"}],
        session=db_session,
    )

    assert captured["api_key"] == secret
    assert captured["model"] == "gpt-5-mini"
    assert response.model_used == "gpt-5-mini"


@pytest.mark.asyncio
async def test_real_llm_call_never_falls_back_to_environment_key(monkeypatch):
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "false")
    monkeypatch.setenv("OPENAI_API_KEY", "agency-key-must-not-be-used")

    with pytest.raises(LLMConfigurationError, match="database session"):
        await call_llm(
            client_id=uuid.uuid4(),
            agent_code="D01",
            messages=[{"role": "user", "content": "test"}],
        )


@pytest.mark.asyncio
async def test_deepseek_uses_json_object_mode_and_validates_schema(db_session, monkeypatch):
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "false")
    master_key = Fernet.generate_key().decode()
    monkeypatch.setattr(
        db_module.settings, "CREWLAB_CREDENTIAL_ENCRYPTION_KEY", master_key
    )
    client = Client(name="DeepSeek", brand_name="DeepSeek", is_active=True)
    db_session.add(client)
    await db_session.flush()
    db_session.add_all(
        [
            ClientLLMConfig(
                client_id=client.id,
                agent_code="A01",
                provider="deepseek",
                model="deepseek-v4-pro",
                tier="standard",
                is_active=True,
            ),
            ClientProviderCredential(
                client_id=client.id,
                provider="deepseek",
                encrypted_api_key=CredentialCipher(master_key).encrypt("deepseek-key"),
                key_hint="••••-key",
                is_enabled=True,
                validation_status="valid",
                created_by=uuid.uuid4(),
                updated_by=uuid.uuid4(),
            ),
        ]
    )
    await db_session.commit()
    captured = {}

    async def fake_acompletion(**kwargs):
        captured.update(kwargs)
        return types.SimpleNamespace(
            choices=[types.SimpleNamespace(message=types.SimpleNamespace(content='{"reply":"ok"}'))],
            usage=None,
        )

    monkeypatch.setitem(
        sys.modules, "litellm", types.SimpleNamespace(acompletion=fake_acompletion)
    )

    response = await call_llm(
        client_id=client.id,
        agent_code="A01",
        messages=[{"role": "user", "content": "test"}],
        session=db_session,
        response_format=StructuredReply,
    )

    assert captured["response_format"] == {"type": "json_object"}
    assert "JSON schema" in captured["messages"][0]["content"]
    assert StructuredReply.model_validate_json(response.content).reply == "ok"


@pytest.mark.asyncio
async def test_qwen_uses_dashscope_prefix_and_json_object_mode(db_session, monkeypatch):
    monkeypatch.setenv("CREWLAB_LLM_MOCK", "false")
    master_key = Fernet.generate_key().decode()
    monkeypatch.setattr(
        db_module.settings, "CREWLAB_CREDENTIAL_ENCRYPTION_KEY", master_key
    )
    client = Client(name="Qwen Client", brand_name="Qwen Client", is_active=True)
    db_session.add(client)
    await db_session.flush()
    db_session.add_all(
        [
            ClientLLMConfig(
                client_id=client.id,
                agent_code="A01",
                provider="qwen",
                model="qwen-3.8-max",
                tier="power",
                is_active=True,
            ),
            ClientProviderCredential(
                client_id=client.id,
                provider="qwen",
                encrypted_api_key=CredentialCipher(master_key).encrypt("qwen-dashscope-key"),
                key_hint="••••-key",
                is_enabled=True,
                validation_status="valid",
                created_by=uuid.uuid4(),
                updated_by=uuid.uuid4(),
            ),
        ]
    )
    await db_session.commit()
    captured = {}

    async def fake_acompletion(**kwargs):
        captured.update(kwargs)
        return types.SimpleNamespace(
            choices=[types.SimpleNamespace(message=types.SimpleNamespace(content='{"reply":"ok"}'))],
            usage=None,
        )

    monkeypatch.setitem(
        sys.modules, "litellm", types.SimpleNamespace(acompletion=fake_acompletion)
    )

    response = await call_llm(
        client_id=client.id,
        agent_code="A01",
        messages=[{"role": "user", "content": "test"}],
        session=db_session,
        response_format=StructuredReply,
    )

    assert captured["model"] == "dashscope/qwen-3.8-max"
    assert captured["api_key"] == "qwen-dashscope-key"
    assert captured["response_format"] == {"type": "json_object"}
    assert "JSON schema" in captured["messages"][0]["content"]
    assert StructuredReply.model_validate_json(response.content).reply == "ok"


import uuid

import httpx
import pytest
from sqlalchemy import select

from app.api.portal_router import get_current_auth, get_db
from app.core.auth import AuthContext
from app.main import app
from app.models.clients import BrandSetting, Client
from app.models.llm_config import ClientLLMConfig
from app.models.provider_credentials import ClientProviderCredential


@pytest.mark.asyncio
async def test_portal_sees_only_enabled_provider_models_and_never_credentials(db_session):
    client = Client(name="Portal", brand_name="Portal", is_active=True)
    db_session.add(client)
    await db_session.flush()
    db_session.add_all(
        [
            ClientProviderCredential(
                client_id=client.id,
                provider="openai",
                encrypted_api_key="ciphertext-only",
                key_hint="••••1234",
                is_enabled=True,
                validation_status="valid",
                created_by=uuid.uuid4(),
                updated_by=uuid.uuid4(),
            ),
            ClientProviderCredential(
                client_id=client.id,
                provider="anthropic",
                encrypted_api_key="another-ciphertext",
                key_hint="••••5678",
                is_enabled=False,
                validation_status="valid",
                created_by=uuid.uuid4(),
                updated_by=uuid.uuid4(),
            ),
            ClientLLMConfig(
                client_id=client.id,
                agent_code="D01",
                provider="openai",
                model="gpt-5-mini",
                tier="standard",
                budget_usd=10,
                is_active=True,
            ),
        ]
    )
    await db_session.commit()

    async def override_db():
        yield db_session

    async def override_auth():
        return AuthContext(uuid.uuid4(), client.id, "client_admin")

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_auth] = override_auth
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as http:
            response = await http.get("/api/v1/portal/settings")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()["data"]
    assert payload["client"] == {"id": str(client.id), "brand_name": "Portal"}
    assert payload["eligible_models"]
    assert all(model["id"].startswith("gpt-") for model in payload["eligible_models"])
    assert "encrypted_api_key" not in response.text
    assert "key_hint" not in response.text
    assert "provider" not in payload["agent_configs"][0]


@pytest.mark.asyncio
async def test_portal_update_derives_provider_and_rejects_provider_input(db_session):
    client = Client(name="Update", brand_name="Update", is_active=True)
    db_session.add(client)
    await db_session.flush()
    db_session.add(
        ClientProviderCredential(
            client_id=client.id,
            provider="openai",
            encrypted_api_key="ciphertext",
            key_hint="••••1234",
            is_enabled=True,
            validation_status="valid",
            created_by=uuid.uuid4(),
            updated_by=uuid.uuid4(),
        )
    )
    await db_session.commit()

    async def override_db():
        yield db_session

    async def override_auth():
        return AuthContext(uuid.uuid4(), client.id, "client_admin")

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_auth] = override_auth
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as http:
            valid = await http.patch(
                "/api/v1/portal/settings/agent-config",
                json={
                    "agent_code": "D01",
                    "model": "gpt-5-mini",
                    "tier": "standard",
                    "budget_usd_month": 12,
                    "idempotency_key": str(uuid.uuid4()),
                },
            )
            forbidden_field = await http.patch(
                "/api/v1/portal/settings/agent-config",
                json={
                    "agent_code": "D01",
                    "provider": "anthropic",
                    "model": "gpt-5-mini",
                    "tier": "standard",
                    "budget_usd_month": 12,
                    "idempotency_key": str(uuid.uuid4()),
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert valid.status_code == 200
    assert forbidden_field.status_code == 422


@pytest.mark.asyncio
async def test_first_brand_voice_save_creates_missing_brand_settings(db_session):
    client = Client(name="New client", brand_name="New client", is_active=True)
    db_session.add(client)
    await db_session.commit()

    async def override_db():
        yield db_session

    async def override_auth():
        return AuthContext(uuid.uuid4(), client.id, "client_admin")

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_auth] = override_auth
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as http:
            response = await http.patch(
                "/api/v1/portal/settings/brand-voice",
                json={
                    "tone": "Gần gũi, trẻ trung",
                    "personality_keywords": ["gần gũi", "trẻ trung"],
                    "writing_style": "conversational",
                    "avoid_phrases": [],
                    "idempotency_key": str(uuid.uuid4()),
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    setting = await db_session.scalar(
        select(BrandSetting).where(
            BrandSetting.client_id == client.id,
            BrandSetting.is_current.is_(True),
        )
    )
    assert setting is not None
    assert setting.tone_of_voice == "Gần gũi, trẻ trung"
    assert setting.personality_keywords == ["gần gũi", "trẻ trung"]

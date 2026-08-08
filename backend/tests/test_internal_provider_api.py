import uuid

import httpx
import pytest

from app.api.internal_router import get_internal_db
from app.core.auth import AuthContext, require_agency_admin
from app.main import app
from app.models.clients import BrandSetting
from sqlalchemy import select


@pytest.mark.asyncio
async def test_admin_can_create_inactive_client_and_read_masked_provider_slots(db_session):
    async def override_db():
        yield db_session

    async def override_admin():
        return AuthContext(uuid.uuid4(), None, "agency_admin")

    app.dependency_overrides[get_internal_db] = override_db
    app.dependency_overrides[require_agency_admin] = override_admin
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            created = await client.post(
                "/api/v1/internal/clients",
                json={
                    "name": "Bardinh Test",
                    "brand_name": "Bardinh Test",
                    "industry": "Cafe & F&B",
                    "platforms": ["facebook", "instagram"],
                },
            )
            assert created.status_code == 201
            client_id = created.json()["data"]["id"]
            assert created.json()["data"]["is_active"] is False
            initial_brand_settings = await db_session.scalar(
                select(BrandSetting).where(BrandSetting.client_id == uuid.UUID(client_id))
            )
            assert initial_brand_settings is not None
            assert initial_brand_settings.is_current is True
            assert initial_brand_settings.brand_voice_short == "Bardinh Test"

            response = await client.get(
                f"/api/v1/internal/clients/{client_id}/providers"
            )
            assert response.status_code == 200
            providers = response.json()["data"]["providers"]
            assert {item["provider"] for item in providers} == {
                "openai", "anthropic", "google", "deepseek"
            }
            assert all(item["key_hint"] is None for item in providers)
            assert all(isinstance(item["models"], list) for item in providers)
            assert "encrypted_api_key" not in response.text
    finally:
        app.dependency_overrides.clear()

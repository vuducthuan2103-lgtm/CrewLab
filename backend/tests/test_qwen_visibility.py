"""
TC-001 through TC-007: Verify qwen provider is visible for all clients
and the model catalog is correct.
"""
import uuid

import httpx
import pytest

from app.api.internal_router import get_internal_db
from app.core.auth import AuthContext, require_agency_admin
from app.core.model_catalog import MODEL_CATALOG, SUPPORTED_PROVIDERS, eligible_models
from app.main import app


# ---------------------------------------------------------------------------
# TC-001: SUPPORTED_PROVIDERS includes "qwen"
# ---------------------------------------------------------------------------
def test_tc001_qwen_in_supported_providers():
    """TC-001: SUPPORTED_PROVIDERS must contain 'qwen'."""
    assert "qwen" in SUPPORTED_PROVIDERS


# ---------------------------------------------------------------------------
# TC-002: Qwen has exactly 5 models in MODEL_CATALOG
# ---------------------------------------------------------------------------
def test_tc002_qwen_has_five_catalog_models():
    """TC-002: Catalog must have 3 text + 2 image models for qwen."""
    qwen_models = [m for m in MODEL_CATALOG if m.provider == "qwen"]
    assert len(qwen_models) == 5, f"Expected 5 qwen models, found {len(qwen_models)}"


# ---------------------------------------------------------------------------
# TC-003: Correct qwen model IDs
# ---------------------------------------------------------------------------
def test_tc003_qwen_model_ids():
    """TC-003: All expected qwen model IDs must exist in the catalog."""
    qwen_ids = {m.id for m in MODEL_CATALOG if m.provider == "qwen"}
    expected = {
        "qwen-3.7-turbo",
        "qwen-3.7-plus",
        "qwen-3.8-max",
        "qwen-image-2",
        "qwen-image-3",
    }
    assert qwen_ids == expected


# ---------------------------------------------------------------------------
# TC-004: Qwen text models have correct tier assignments
# ---------------------------------------------------------------------------
def test_tc004_qwen_tier_assignments():
    """TC-004: fast=turbo, standard=plus, power=max for text models."""
    qwen_text = {m.id: m.tier for m in MODEL_CATALOG if m.provider == "qwen" and "text" in m.capabilities}
    assert qwen_text.get("qwen-3.7-turbo") == "fast"
    assert qwen_text.get("qwen-3.7-plus") == "standard"
    assert qwen_text.get("qwen-3.8-max") == "power"


# ---------------------------------------------------------------------------
# TC-005: Qwen image models have correct tiers
# ---------------------------------------------------------------------------
def test_tc005_qwen_image_tier_assignments():
    """TC-005: qwen-image-2=fast, qwen-image-3=power."""
    qwen_img = {m.id: m.tier for m in MODEL_CATALOG if m.provider == "qwen" and "image_generation" in m.capabilities}
    assert qwen_img.get("qwen-image-2") == "fast"
    assert qwen_img.get("qwen-image-3") == "power"


# ---------------------------------------------------------------------------
# TC-006: eligible_models returns qwen models when qwen is enabled
# ---------------------------------------------------------------------------
def test_tc006_eligible_models_with_qwen_enabled():
    """TC-006: eligible_models must include qwen models when provider is enabled."""
    models = eligible_models({"qwen"})
    providers = {m.provider for m in models}
    assert "qwen" in providers
    assert len(models) == 5


# ---------------------------------------------------------------------------
# TC-007: API returns qwen for brand-new client (0 credentials in DB)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_tc007_api_returns_qwen_for_new_client(db_session):
    """TC-007: GET /providers returns qwen slot even when client has no credentials."""
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
            # Create client (simulates an "existing" client with no qwen credential)
            created = await client.post(
                "/api/v1/internal/clients",
                json={
                    "name": "Qwen Visibility Test",
                    "brand_name": "Qwen Visibility Test",
                    "industry": "F&B",
                    "platforms": ["facebook"],
                },
            )
            assert created.status_code == 201
            client_id = created.json()["data"]["id"]

            # Fetch providers — qwen must appear as an unconfigured slot
            response = await client.get(f"/api/v1/internal/clients/{client_id}/providers")
            assert response.status_code == 200
            providers = response.json()["data"]["providers"]

            provider_names = {p["provider"] for p in providers}
            assert "qwen" in provider_names, f"qwen missing from {provider_names}"

            qwen = next(p for p in providers if p["provider"] == "qwen")
            assert qwen["key_hint"] is None
            assert qwen["is_enabled"] is False
            assert qwen["validation_status"] == "missing"
            assert len(qwen["models"]) == 5
    finally:
        app.dependency_overrides.clear()

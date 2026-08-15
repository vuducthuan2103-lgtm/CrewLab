import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.portal_router import get_current_auth, get_db
from app.core.auth import AuthContext
from app.main import app
from app.models.clients import Client
from app.models.assets import BrandAsset, SemanticAssetRecord


def _install_portal_overrides(db_session, client_id, email="owner@example.com"):
    async def override_db():
        yield db_session

    async def override_auth():
        context = AuthContext(uuid.uuid4(), client_id, "client_admin")
        context.email = email
        return context

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_auth] = override_auth


@pytest.mark.asyncio
async def test_update_asset_description_and_tags(db_session: AsyncSession):
    client = Client(name="Test Asset Edit Client", brand_name="Brand Edit")
    db_session.add(client)
    await db_session.commit()
    await db_session.refresh(client)

    asset = BrandAsset(
        client_id=client.id,
        url="https://example.com/test.jpg",
        storage_path=f"{client.id}/originals/test.jpg",
        tags=["initial_tag", "tag2"],
        status="approved",
        usage_rights="client_owned",
    )
    db_session.add(asset)
    await db_session.commit()
    await db_session.refresh(asset)

    semantic = SemanticAssetRecord(
        client_id=client.id,
        source_asset_id=asset.id,
        status="ready",
        semantic_summary="Initial summary",
        suggested_tags=["initial_tag", "tag2"],
    )
    db_session.add(semantic)
    await db_session.commit()

    _install_portal_overrides(db_session, client.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.patch(
            f"/api/v1/portal/assets/{asset.id}",
            json={
                "description": "Updated delicious matcha latte",
                "tags": ["matcha", "drink", "seasonal"],
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data"]["semantic_summary"] == "Updated delicious matcha latte"
        assert data["data"]["tags"] == ["matcha", "drink", "seasonal"]
        assert data["data"]["suggested_tags"] == ["matcha", "drink", "seasonal"]

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_delete_asset(db_session: AsyncSession):
    client = Client(name="Test Asset Delete Client", brand_name="Brand Delete")
    db_session.add(client)
    await db_session.commit()
    await db_session.refresh(client)

    asset = BrandAsset(
        client_id=client.id,
        url="https://example.com/delete_me.jpg",
        storage_path=f"{client.id}/originals/delete_me.jpg",
        tags=["temp"],
        status="approved",
        usage_rights="client_owned",
    )
    db_session.add(asset)
    await db_session.commit()
    await db_session.refresh(asset)

    semantic = SemanticAssetRecord(
        client_id=client.id,
        source_asset_id=asset.id,
        status="ready",
        semantic_summary="Temp image",
    )
    db_session.add(semantic)
    await db_session.commit()

    _install_portal_overrides(db_session, client.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.delete(f"/api/v1/portal/assets/{asset.id}")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data"]["deleted_id"] == str(asset.id)

    # Verify DB deleted
    deleted_asset = await db_session.get(BrandAsset, asset.id)
    assert deleted_asset is None

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_asset_cross_tenant_isolation(db_session: AsyncSession):
    client1 = Client(name="Client 1", brand_name="Brand 1")
    client2 = Client(name="Client 2", brand_name="Brand 2")
    db_session.add_all([client1, client2])
    await db_session.commit()

    asset = BrandAsset(
        client_id=client1.id,
        url="https://example.com/client1.jpg",
        storage_path=f"{client1.id}/originals/client1.jpg",
        status="approved",
    )
    db_session.add(asset)
    await db_session.commit()

    # Authenticate as client2
    _install_portal_overrides(db_session, client2.id)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Client 2 tries to update Client 1's asset
        patch_res = await ac.patch(
            f"/api/v1/portal/assets/{asset.id}",
            json={"description": "Hacked"},
        )
        assert patch_res.status_code == 404

        # Client 2 tries to delete Client 1's asset
        del_res = await ac.delete(f"/api/v1/assets/{asset.id}")
        assert del_res.status_code == 404

    app.dependency_overrides.clear()

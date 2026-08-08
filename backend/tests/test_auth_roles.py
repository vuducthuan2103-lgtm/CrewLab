import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.core import auth as auth_module


def _credentials(token: str = "test-access-token") -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token,
    )


@pytest.mark.asyncio
async def test_agency_admin_does_not_need_client_id(monkeypatch):
    user_id = uuid.uuid4()
    user = SimpleNamespace(id=str(user_id), app_metadata={"role": "agency_admin"})
    client = SimpleNamespace(auth=SimpleNamespace(get_user=lambda token: SimpleNamespace(user=user)))
    monkeypatch.setattr(auth_module, "_create_auth_client", lambda: client)

    context = await auth_module.get_auth_context(_credentials())

    assert context.role == "agency_admin"
    assert context.client_id is None


@pytest.mark.asyncio
async def test_missing_backend_supabase_config_returns_service_unavailable(monkeypatch):
    monkeypatch.setattr(auth_module.settings, "SUPABASE_URL", "")
    monkeypatch.setattr(auth_module.settings, "SUPABASE_KEY", "")

    with pytest.raises(HTTPException) as error:
        await auth_module.get_auth_context(_credentials())

    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_portal_auth_requires_client_id():
    context = auth_module.AuthContext(
        user_id=uuid.uuid4(), client_id=None, role="authenticated"
    )

    with pytest.raises(HTTPException) as error:
        await auth_module.require_portal_client(context)

    assert error.value.status_code == 401


@pytest.mark.asyncio
async def test_internal_auth_rejects_client_user():
    context = auth_module.AuthContext(
        user_id=uuid.uuid4(), client_id=uuid.uuid4(), role="client_admin"
    )

    with pytest.raises(HTTPException) as error:
        await auth_module.require_agency_admin(context)

    assert error.value.status_code == 403

import uuid
from types import SimpleNamespace

import pytest
from sqlalchemy import select

from app.models.clients import Client
from app.models.portal_accounts import ClientPortalAdmin
from app.models.system import AuditLog
from app.services.portal_accounts import PortalAccountError, create_portal_admin
from app.api.internal_router import _domain_error


class FakeSupabaseAdmin:
    def __init__(self):
        self.create_calls = []
        self.deleted_user_ids = []

    def create_user(self, payload):
        self.create_calls.append(payload)
        return SimpleNamespace(user=SimpleNamespace(id=str(uuid.uuid4())))

    def delete_user(self, user_id):
        self.deleted_user_ids.append(user_id)


class FakeSupabaseClient:
    def __init__(self):
        self.admin = FakeSupabaseAdmin()
        self.auth = SimpleNamespace(admin=self.admin)


@pytest.mark.asyncio
async def test_creating_portal_admin_assigns_immutable_client_claims_without_storing_password(db_session):
    client = Client(name="Portal Test", brand_name="Portal Test", is_active=True)
    db_session.add(client)
    await db_session.commit()

    fake_auth = FakeSupabaseClient()
    password = "TemporaryPass2026"
    created = await create_portal_admin(
        db_session,
        client_id=client.id,
        email=" Owner@Example.COM ",
        password=password,
        actor_id=uuid.uuid4(),
        auth_client_factory=lambda: fake_auth,
    )

    payload = fake_auth.admin.create_calls[0]
    assert payload["email"] == "owner@example.com"
    assert payload["app_metadata"] == {
        "role": "client_admin",
        "client_id": str(client.id),
    }
    assert "password" not in payload["app_metadata"]
    assert created.email == "owner@example.com"

    account = await db_session.scalar(select(ClientPortalAdmin))
    audit = await db_session.scalar(select(AuditLog))
    assert account.email == "owner@example.com"
    assert password not in str(account.__dict__)
    assert password not in str(audit.details)


@pytest.mark.asyncio
async def test_client_cannot_receive_a_second_different_portal_admin(db_session):
    client = Client(name="Portal Test", brand_name="Portal Test", is_active=True)
    db_session.add(client)
    await db_session.commit()
    fake_auth = FakeSupabaseClient()
    actor_id = uuid.uuid4()

    await create_portal_admin(
        db_session,
        client_id=client.id,
        email="owner@example.com",
        password="TemporaryPass2026",
        actor_id=actor_id,
        auth_client_factory=lambda: fake_auth,
    )

    with pytest.raises(PortalAccountError) as error:
        await create_portal_admin(
            db_session,
            client_id=client.id,
            email="another@example.com",
            password="DifferentPass2026",
            actor_id=actor_id,
            auth_client_factory=lambda: fake_auth,
        )

    assert error.value.code == "PORTAL_ADMIN_ALREADY_EXISTS"
    assert len(fake_auth.admin.create_calls) == 1


@pytest.mark.asyncio
async def test_inactive_client_cannot_receive_portal_account(db_session):
    client = Client(name="Inactive", brand_name="Inactive", is_active=False)
    db_session.add(client)
    await db_session.commit()
    fake_auth = FakeSupabaseClient()

    with pytest.raises(PortalAccountError) as error:
        await create_portal_admin(
            db_session,
            client_id=client.id,
            email="owner@example.com",
            password="TemporaryPass2026",
            actor_id=uuid.uuid4(),
            auth_client_factory=lambda: fake_auth,
        )

    assert error.value.code == "CLIENT_NOT_ACTIVE"
    assert fake_auth.admin.create_calls == []


def test_portal_account_error_is_returned_as_a_safe_api_error():
    response = _domain_error(
        PortalAccountError(
            "Could not create the Portal account. The email may already be in use.",
            code="PORTAL_ACCOUNT_CREATE_FAILED",
        )
    )

    assert response.status_code == 409
    assert b"PORTAL_ACCOUNT_CREATE_FAILED" in response.body

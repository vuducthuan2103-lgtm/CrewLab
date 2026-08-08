"""Create the first client Portal account without ever retaining its password."""

from dataclasses import dataclass
from typing import Any, Callable
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import _create_auth_client
from app.models.clients import Client
from app.models.portal_accounts import ClientPortalAdmin
from app.models.system import AuditLog


class PortalAccountError(ValueError):
    def __init__(
        self,
        message: str,
        *,
        code: str,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.details = details or {}


@dataclass(frozen=True)
class CreatedPortalAdmin:
    auth_user_id: UUID
    email: str


def _normalise_email(email: str) -> str:
    return email.strip().lower()


async def create_portal_admin(
    session: AsyncSession,
    *,
    client_id: UUID,
    email: str,
    password: str,
    actor_id: UUID,
    auth_client_factory: Callable[[], Any] = _create_auth_client,
) -> CreatedPortalAdmin:
    """Create one Portal admin and atomically save its client assignment.

    Supabase Auth is an external system, so a database failure after Auth user
    creation is compensated by deleting the just-created Auth user.
    """
    client = await session.get(Client, client_id)
    if client is None:
        raise PortalAccountError("Client not found", code="CLIENT_NOT_FOUND")
    if not client.is_active:
        raise PortalAccountError(
            "Client must be active before creating a Portal account",
            code="CLIENT_NOT_ACTIVE",
        )

    normalised_email = _normalise_email(email)
    existing = await session.scalar(
        select(ClientPortalAdmin).where(ClientPortalAdmin.client_id == client_id)
    )
    if existing is not None:
        if existing.email == normalised_email:
            return CreatedPortalAdmin(
                auth_user_id=existing.auth_user_id,
                email=existing.email,
            )
        raise PortalAccountError(
            "This client already has a Portal Admin account",
            code="PORTAL_ADMIN_ALREADY_EXISTS",
        )

    auth_client = auth_client_factory()
    try:
        response = auth_client.auth.admin.create_user(
            {
                "email": normalised_email,
                "password": password,
                # The Agency has collected this address directly. We do not
                # depend on transactional email during local onboarding.
                "email_confirm": True,
                "app_metadata": {
                    "role": "client_admin",
                    "client_id": str(client_id),
                },
                "user_metadata": {"brand_name": client.brand_name},
            }
        )
        user = response.user
        auth_user_id = UUID(str(user.id)) if user is not None else None
        if auth_user_id is None:
            raise RuntimeError("Supabase did not return a user")
    except Exception as exc:
        # Do not relay provider details: they can contain email or implementation
        # information, and never contain a useful recovery action for the client.
        raise PortalAccountError(
            "Could not create the Portal account. The email may already be in use.",
            code="PORTAL_ACCOUNT_CREATE_FAILED",
        ) from exc

    account = ClientPortalAdmin(
        client_id=client_id,
        auth_user_id=auth_user_id,
        email=normalised_email,
        created_by=actor_id,
    )
    session.add(account)
    session.add(
        AuditLog(
            client_id=client_id,
            user_id=actor_id,
            action="portal_admin_created",
            details={"auth_user_id": str(auth_user_id), "email": normalised_email},
        )
    )
    try:
        await session.commit()
    except SQLAlchemyError as exc:
        await session.rollback()
        try:
            auth_client.auth.admin.delete_user(str(auth_user_id))
        except Exception:
            # There is no password in this code path and the failure is safely
            # recoverable by a later admin cleanup.
            pass
        raise PortalAccountError(
            "Could not save the Portal account assignment. Please try again.",
            code="PORTAL_ACCOUNT_ASSIGNMENT_FAILED",
        ) from exc

    return CreatedPortalAdmin(auth_user_id=auth_user_id, email=normalised_email)

import logging
from typing import Optional, Dict, Any
from uuid import UUID

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client

from app.core.db import settings

logger = logging.getLogger(__name__)
security = HTTPBearer()

# In-memory fallback store for idempotency keys. Redis-backed persistence can
# replace this without changing endpoint contracts.
IDEMPOTENCY_CACHE: Dict[str, Dict[str, Any]] = {}


class AuthContext:
    def __init__(
        self,
        user_id: UUID,
        client_id: Optional[UUID],
        role: str,
        email: Optional[str] = None,
    ):
        self.user_id = user_id
        self.client_id = client_id
        self.role = role
        self.email = email


def _create_auth_client():
    """Create a server-only Supabase client for token validation."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(
            status_code=503,
            detail="SUPABASE_URL and SUPABASE_KEY must be configured",
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


async def get_auth_context(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> AuthContext:
    """Validate the current Supabase session and read immutable app metadata."""
    try:
        user_response = _create_auth_client().auth.get_user(credentials.credentials)
        user = user_response.user
        if user is None:
            raise HTTPException(status_code=401, detail="Authentication failed")

        app_metadata = user.app_metadata or {}
        user_id_str = user.id
        client_id_str = app_metadata.get("client_id")
        business_role = app_metadata.get("role", "authenticated")

        return AuthContext(
            user_id=UUID(user_id_str),
            client_id=UUID(client_id_str) if client_id_str else None,
            role=business_role,
            email=getattr(user, "email", None),
        )
    except HTTPException:
        raise
    except (TypeError, ValueError):
        logger.warning("JWT contains malformed identity claims")
        raise HTTPException(status_code=401, detail="Authentication failed")
    except Exception:
        logger.warning("Supabase token validation failed")
        raise HTTPException(status_code=401, detail="Authentication failed")


async def require_portal_client(
    auth: AuthContext = Depends(get_auth_context),
) -> AuthContext:
    if auth.client_id is None:
        raise HTTPException(status_code=401, detail="Token is missing client_id")
    return auth


async def require_agency_admin(
    auth: AuthContext = Depends(get_auth_context),
) -> AuthContext:
    if auth.role != "agency_admin":
        raise HTTPException(status_code=403, detail="Agency Admin access required")
    return auth


# Backward-compatible dependency name used by Portal routes.
get_current_auth = require_portal_client


def _scoped_idempotency_key(
    key: str,
    *,
    client_id: UUID,
    operation: str,
    target_id: object | None = None,
) -> str:
    """Namespace an untrusted caller key to one tenant, operation and target."""
    target = str(target_id) if target_id is not None else "_"
    return f"{client_id}:{operation}:{target}:{key}"


def check_idempotency(
    key: str,
    *,
    client_id: UUID,
    operation: str,
    target_id: object | None = None,
) -> Optional[Dict[str, Any]]:
    return IDEMPOTENCY_CACHE.get(
        _scoped_idempotency_key(
            key,
            client_id=client_id,
            operation=operation,
            target_id=target_id,
        )
    )


def save_idempotency(
    key: str,
    response_data: Dict[str, Any],
    *,
    client_id: UUID,
    operation: str,
    target_id: object | None = None,
) -> None:
    IDEMPOTENCY_CACHE[
        _scoped_idempotency_key(
            key,
            client_id=client_id,
            operation=operation,
            target_id=target_id,
        )
    ] = response_data

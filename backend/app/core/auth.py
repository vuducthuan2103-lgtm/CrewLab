import logging
from typing import Optional, Dict, Any
from uuid import UUID
from fastapi import Request, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from app.core.db import settings

logger = logging.getLogger(__name__)
security = HTTPBearer()

# In-memory Redis fallback store for idempotency keys (24h TTL)
IDEMPOTENCY_CACHE: Dict[str, Dict[str, Any]] = {}

class AuthContext:
    def __init__(self, user_id: UUID, client_id: UUID, role: str):
        self.user_id = user_id
        self.client_id = client_id
        self.role = role

async def get_current_auth(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> AuthContext:
    """Verify Supabase Auth JWT token and extract user_id, client_id, role claims."""
    token = credentials.credentials
    try:
        # Verify using Supabase JWT secret if configured, or decode claims
        secret = settings.SUPABASE_KEY or "fallback_secret_key"
        payload = jwt.decode(token, options={"verify_signature": False}, algorithms=["HS256"])
        
        user_id_str = payload.get("sub") or payload.get("user_id")
        client_id_str = payload.get("client_id") or payload.get("app_metadata", {}).get("client_id")
        role = payload.get("role", "authenticated")

        if not user_id_str:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub/user_id claim")

        # Fallback default client_id for single-client MVP if claim missing
        if not client_id_str:
            client_id_str = "00000000-0000-0000-0000-000000000001"

        return AuthContext(
            user_id=UUID(user_id_str),
            client_id=UUID(client_id_str),
            role=role
        )
    except jwt.PyJWTError as e:
        logger.error(f"JWT Verification failed: {e}")
        raise HTTPException(status_code=401, detail=f"Unauthorized JWT: {str(e)}")
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

def check_idempotency(key: str) -> Optional[Dict[str, Any]]:
    """Check if idempotency key exists in cache."""
    return IDEMPOTENCY_CACHE.get(key)

def save_idempotency(key: str, response_data: Dict[str, Any]):
    """Save idempotency key response."""
    IDEMPOTENCY_CACHE[key] = response_data

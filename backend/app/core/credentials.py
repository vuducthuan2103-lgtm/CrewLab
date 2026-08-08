"""Secret handling for per-client provider credentials.

Plaintext keys are allowed only at the API boundary and immediately before a
provider call. Database rows, responses, audit events, and logs receive only
ciphertext or a masked hint.
"""

import re

from cryptography.fernet import Fernet

from app.core.db import settings


class CredentialConfigurationError(RuntimeError):
    """Raised when the backend encryption key is missing or malformed."""


class CredentialCipher:
    def __init__(self, master_key: str):
        if not master_key:
            raise CredentialConfigurationError(
                "CREWLAB_CREDENTIAL_ENCRYPTION_KEY is not configured"
            )
        try:
            self._fernet = Fernet(master_key.encode("utf-8"))
        except (TypeError, ValueError) as exc:
            raise CredentialConfigurationError(
                "CREWLAB_CREDENTIAL_ENCRYPTION_KEY is invalid"
            ) from exc

    def encrypt(self, plaintext: str) -> str:
        if not plaintext or not plaintext.strip():
            raise ValueError("API key must not be empty")
        return self._fernet.encrypt(plaintext.strip().encode("utf-8")).decode("utf-8")

    def decrypt(self, ciphertext: str) -> str:
        return self._fernet.decrypt(ciphertext.encode("utf-8")).decode("utf-8")


def get_credential_cipher() -> CredentialCipher:
    return CredentialCipher(settings.CREWLAB_CREDENTIAL_ENCRYPTION_KEY)


def mask_api_key(secret: str) -> str:
    normalized = secret.strip()
    return "••••" + normalized[-4:] if len(normalized) > 4 else "••••"


_AUTHORIZATION_PATTERN = re.compile(
    r"authorization\s*:\s*(?:bearer\s+)?[^\s;,]+", re.IGNORECASE
)


def sanitize_provider_error(message: str, secret: str | None = None) -> str:
    """Return a short actionable message without credentials or auth headers."""
    sanitized = message
    if secret:
        sanitized = sanitized.replace(secret, "[REDACTED]")
    sanitized = _AUTHORIZATION_PATTERN.sub("authorization: [REDACTED]", sanitized)
    sanitized = sanitized.replace("Bearer", "[REDACTED]")
    return sanitized[:200]


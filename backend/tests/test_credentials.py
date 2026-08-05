import pytest
from cryptography.fernet import Fernet, InvalidToken

from app.core.credentials import CredentialCipher, mask_api_key, sanitize_provider_error


def test_encrypt_round_trip_never_contains_plaintext():
    plaintext = "sk-live-super-secret-1234567890"
    cipher = CredentialCipher(Fernet.generate_key().decode())

    encrypted = cipher.encrypt(plaintext)

    assert plaintext not in encrypted
    assert cipher.decrypt(encrypted) == plaintext


def test_decrypt_rejects_ciphertext_from_another_master_key():
    first = CredentialCipher(Fernet.generate_key().decode())
    second = CredentialCipher(Fernet.generate_key().decode())

    with pytest.raises(InvalidToken):
        second.decrypt(first.encrypt("sk-secret"))


@pytest.mark.parametrize(
    ("secret", "masked"),
    [
        ("sk-ant-api03-abcdefgh", "••••efgh"),
        ("AIzaSyExample1234", "••••1234"),
        ("tiny", "••••"),
    ],
)
def test_mask_api_key_exposes_at_most_last_four(secret, masked):
    assert mask_api_key(secret) == masked


def test_sanitized_provider_error_removes_secret_and_authorization_header():
    secret = "sk-live-do-not-leak"
    raw = f"401 Authorization: Bearer {secret}; invalid api key {secret}"

    sanitized = sanitize_provider_error(raw, secret)

    assert secret not in sanitized
    assert "Bearer" not in sanitized
    assert len(sanitized) <= 200


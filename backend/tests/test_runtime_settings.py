from pathlib import Path

import pytest
from cryptography.fernet import Fernet

from app.core.db import BACKEND_DIR, ENV_FILE_PATH, Settings
from app.core.credentials import CredentialCipher, CredentialConfigurationError
from app.services.task_errors import classify_task_error


def test_settings_reads_the_backend_env_file_independent_of_working_directory():
    """The API can be launched from the monorepo root without losing secrets."""
    assert BACKEND_DIR == Path(__file__).resolve().parents[1]
    assert ENV_FILE_PATH == BACKEND_DIR / ".env"
    assert Path(Settings.model_config["env_file"]) == ENV_FILE_PATH


def test_missing_credential_key_is_reported_as_llm_configuration_error():
    classified = classify_task_error(
        CredentialConfigurationError("CREWLAB_CREDENTIAL_ENCRYPTION_KEY is not configured")
    )

    assert classified.code == "LLM_CONFIGURATION_ERROR"
    assert classified.retryable is False


def test_mismatched_credential_key_is_reported_as_llm_configuration_error():
    ciphertext = CredentialCipher(Fernet.generate_key().decode()).encrypt("provider-secret")

    with pytest.raises(CredentialConfigurationError, match="does not match") as error:
        CredentialCipher(Fernet.generate_key().decode()).decrypt(ciphertext)

    classified = classify_task_error(error.value)
    assert classified.code == "LLM_CONFIGURATION_ERROR"
    assert classified.retryable is False


def test_exhausted_provider_credits_are_not_retried():
    class ProviderCreditsExhausted(Exception):
        status_code = 429
        provider = "openai"

    classified = classify_task_error(
        ProviderCreditsExhausted("You have no credits remaining. Add credits to continue.")
    )

    assert classified.code == "PROVIDER_CREDITS_EXHAUSTED"
    assert classified.retryable is False

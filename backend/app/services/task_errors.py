"""Safe, structured task-failure observability shared by API and Celery tasks."""
from dataclasses import dataclass
from typing import Any
import uuid

from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.credentials import sanitize_provider_error
from app.core.llm import LLMConfigurationError
from app.models.system import TaskLog


class TaskDispatchError(RuntimeError):
    """One or more A01 instructions could not be handed to Celery."""


class InitialDispatchError(TaskDispatchError):
    """An accepted Portal task could not be queued for its first A01 run."""


class PermanentTaskInputError(ValueError):
    """A malformed or cross-tenant task payload that retries cannot repair."""


class InvalidModelOutputError(ValueError):
    """A provider response failed the agent's structured-output contract."""


@dataclass(frozen=True)
class TaskError:
    code: str
    provider: str | None
    provider_request_id: str | None
    message: str
    retryable: bool


def _is_database_connectivity_error(exc: Exception) -> bool:
    """Recognize SQLAlchemy wrappers and direct asyncpg connectivity failures."""
    current: BaseException | None = exc
    seen: set[int] = set()
    asyncpg_names = {
        "CannotConnectNowError",
        "ConnectionDoesNotExistError",
        "ConnectionFailureError",
        "ConnectionRejectionError",
        "PostgresConnectionError",
    }
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, (ConnectionRefusedError, OperationalError, InterfaceError)):
            return True
        if current.__class__.__module__.startswith("asyncpg") and current.__class__.__name__ in asyncpg_names:
            return True
        current = (
            getattr(current, "orig", None)
            or current.__cause__
            or current.__context__
        )
    return False


def classify_task_error(exc: Exception) -> TaskError:
    """Expose a safe category and correlation IDs without exposing credentials."""
    provider = getattr(exc, "provider", None) or getattr(exc, "llm_provider", None)
    request_id = (
        getattr(exc, "request_id", None)
        or getattr(exc, "requestid", None)
        or getattr(getattr(exc, "response", None), "headers", {}).get("x-request-id")
        or getattr(getattr(exc, "response", None), "headers", {}).get("request-id")
    )
    if isinstance(exc, InitialDispatchError):
        code = "DISPATCH_FAILED"
        retryable = True
    elif isinstance(exc, TaskDispatchError):
        code = "TASK_DISPATCH_FAILED"
        retryable = True
    elif isinstance(exc, InvalidModelOutputError):
        code = "INVALID_MODEL_OUTPUT"
        retryable = True
    elif isinstance(exc, PermanentTaskInputError) or exc.__class__.__name__.endswith("TaskInputError"):
        code = "TASK_INPUT_INVALID"
        retryable = False
    elif isinstance(exc, LLMConfigurationError):
        code = "LLM_CONFIGURATION_ERROR"
        retryable = False
    elif _is_database_connectivity_error(exc):
        code = "DATABASE_UNAVAILABLE"
        retryable = True
    elif getattr(exc, "status_code", None) in {401, 403}:
        code = "PROVIDER_AUTH_ERROR"
        retryable = False
    elif getattr(exc, "status_code", None) == 429:
        code = "PROVIDER_RATE_LIMITED"
        retryable = True
    elif getattr(exc, "status_code", None):
        code = "PROVIDER_REQUEST_FAILED"
        retryable = getattr(exc, "status_code", 500) >= 500
    else:
        code = "TASK_EXECUTION_FAILED"
        retryable = True
    return TaskError(
        code=code,
        provider=str(provider) if provider else None,
        provider_request_id=str(request_id) if request_id else None,
        message=sanitize_provider_error(str(exc)),
        retryable=retryable,
    )


async def log_task_failure(
    session: AsyncSession,
    *,
    client_id: uuid.UUID,
    agent_code: str,
    task_type: str,
    wake_reason: str,
    exc: Exception,
    content_item_id: uuid.UUID | None = None,
) -> TaskError:
    error = classify_task_error(exc)
    values = dict(
        client_id=client_id,
        content_item_id=content_item_id,
        agent_code=agent_code,
        task_type=task_type,
        status="failed",
        wake_reason=wake_reason,
        error_code=error.code,
        error_provider=error.provider,
        provider_request_id=error.provider_request_id,
        error_message=error.message,
    )
    # Keep the service compatible while the observability migration is applied.
    if hasattr(TaskLog, "error_retryable"):
        values["error_retryable"] = error.retryable
    session.add(TaskLog(**values))
    await session.commit()
    return error

# Spec 0024a Baseline

**Captured**: 2026-08-15
**Branch**: `feature/0024-full-llm-observability`

## Scope gate

- Feature directory: `specs/0024a-usage-event-ledger`
- Requirements checklist: 7 completed, 0 incomplete
- Extension hooks: none
- Existing dirty files were preserved; no cleanup, checkout, reset, pull, migration execution, or provider call was performed.

## Runtime

- Python: 3.11.9
- SQLAlchemy: 2.0.51
- Alembic: 1.19.0
- Pydantic: 2.13.4
- pytest: 8.4.2

The project target remains Python 3.12. This implementation records evidence on the existing local Python 3.11.9 runtime and must avoid Python-3.12-only syntax.

## Baseline command

From `backend/`:

```powershell
venv\Scripts\python.exe -m pytest tests -q
```

Result: **PASS — 168 passed, 6 warnings in 5.56s**.

Existing warnings:

- Four Pydantic class-based config deprecations in `app/api/schemas.py`.
- One Starlette/httpx deprecation warning in `tests/test_database_connection_errors.py`.
- One sandbox permission warning preventing pytest cache creation.

## Ignore verification

- `.gitignore` already covers Node, Python virtualenv/cache, local logs, environment files, IDE and OS artifacts.
- No Dockerfile exists in the repository root or `backend/`; `.dockerignore` is not required for this sub-spec.

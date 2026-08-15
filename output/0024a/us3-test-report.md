# 0024a US3 Initial RED Verification

## Verdict

FAIL. AC-0024A-08 is merge-blocking and fails for a legacy dataset larger than one 500-row batch: an already-migrated first batch is selected again, so row 501 is never reached.

## Environment

| Component | Version |
|---|---:|
| Python | 3.11.9 |
| pytest | 8.4.2 |
| SQLAlchemy | 2.0.51 |
| Alembic | 1.19.0 |
| Pydantic | 2.13.4 |
| FastAPI | 0.141.1 |

Version command:

```powershell
.\venv\Scripts\python.exe -c "import platform; from importlib.metadata import version; print('python='+platform.python_version()); [print(name+'='+version(name)) for name in ('pytest','SQLAlchemy','alembic','pydantic','fastapi')]"
```

## Test execution

Exact command, run from `D:\01_Dev\active\CrewLab\backend`:

```powershell
.\venv\Scripts\python.exe -m pytest tests/test_usage_ledger_migration.py tests/test_db_schema.py tests/test_portal_a01_chat.py tests/test_portal_bootstrap.py tests/test_dispatch_and_recovery.py tests/test_e01.py tests/test_e01_hardening.py tests/test_qa_spec_0017_contract.py -ra --durations=15
```

The six existing workflow regression files were selected because they import, persist or query `TaskLog`; no real provider or external/staging database was used.

- Exit code: `1`
- Result: `79 passed, 1 failed, 6 warnings`
- Pytest duration: `5.95s`
- Process wall time: `7.30s`
- Failed test: `tests/test_usage_ledger_migration.py::test_backfill_with_more_than_500_rows_advances_past_existing_first_batch`

Concrete failure excerpt:

```text
>       assert result.scanned == 1
E       assert 500 == 1
E        +  where 500 = BackfillResult(scanned=500, eligible=500, created=0,
E           finalized_existing=0, skipped_existing=500, unresolved=0,
E           dry_run=False).scanned
```

Warnings comprised four existing Pydantic class-config deprecations and two `.pytest_cache` permission warnings; none changed the failed assertion.

## Acceptance-criteria mapping

| AC | Result | Execution evidence |
|---|---|---|
| AC-0024A-08 | **FAIL** | Basic rerun idempotency and explicit unresolved-cost tests pass, but the required >500-row forward-progress regression fails because the first 500 migrated rows are scanned again. |
| AC-0024A-09 | PASS in this slice | Additive migration/schema tests and all 75 selected existing schema/workflow/task-log regressions outside the five migration tests passed; the `task_logs` consumer contract remains available. |
| AC-0024A-10 | Deferred, non-blocking | Static support test passed: the new ledger schema contains no short TTL or destructive retention cleanup. A real 24-month elapsed-data retention test remains explicitly deferred by the spec. |

Migration-security assertions also passed: the ledger tables enable RLS and do not grant `anon` or `authenticated` direct access.

## Static-validation note

No source was edited by the verifier. `ruff` is not installed in the project virtual environment and no Ruff/MyPy configuration file was found, so the verifier did not install tools or run an auto-fixer during this read-only RED pass.

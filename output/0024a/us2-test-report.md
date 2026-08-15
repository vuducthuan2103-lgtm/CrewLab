# 0024a US2 Initial RED Verification

## Verdict

FAIL. AC-0024A-06 is merge-blocking and fails because a mocked LLM call executed while `CREWLAB_ENVIRONMENT=production` is persisted as production usage.

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
.\venv\Scripts\python.exe -m pytest tests/test_usage_ledger.py tests/test_llm_usage_instrumentation.py tests/test_usage_costing.py -ra --durations=10
```

- Exit code: `1`
- Result: `16 passed, 1 failed, 2 warnings`
- Pytest duration: `1.15s`
- Process wall time: `2.04s`
- Failed test: `tests/test_usage_costing.py::test_mock_call_is_nonproduction_nonbillable_and_zero_charge`

Concrete failure excerpt:

```text
>       assert event.is_production is False
E       assert True is False
E        +  where True = <app.models.usage.UsageEvent ...>.is_production
```

Both warnings were `PytestCacheWarning` messages caused by denied writes to `.pytest_cache`; they did not change the failed assertion.

## Acceptance-criteria mapping

| AC | Result | Execution evidence |
|---|---|---|
| AC-0024A-01 | PASS in this slice | Usage-event capture and dedup tests passed. |
| AC-0024A-02 | PASS in this slice | Retry/repair event linkage tests passed. |
| AC-0024A-03 | PASS in this slice | Provider-reported cost precedence and reproducible versioned-pricing fallback tests passed with decimal assertions. |
| AC-0024A-04 | PASS in this slice | Default multiplier and effective-dated client override tests passed prospectively. |
| AC-0024A-05 | PASS in this slice | Historical snapshot stability and append-only adjustment behavior passed at service-test level. |
| AC-0024A-06 | **FAIL** | Mock call is stored with `is_production=True`; therefore the required non-production classification is not enforced even though mock/test/internal usage must be non-billable. |
| AC-0024A-07 | PASS in this slice | Failed-billed and failed-unbilled scenarios remained distinct based on cost evidence. |

## Static-validation note

No source was edited by the verifier. `ruff` is not installed in the project virtual environment and no Ruff/MyPy configuration file was found, so the verifier did not install tools or run an auto-fixer during this read-only RED pass.

# 0024a Independent Pass-2 RED Verification

## Verdict

**FAIL — 7 new RED tests remain.** The two original defects, F-0024A-001 and F-0024A-002, are now GREEN.

## Complete targeted-suite execution

Working directory: `D:\01_Dev\active\CrewLab\backend`

Exact command:

```powershell
.\venv\Scripts\python.exe -m pytest tests/test_usage_ledger.py tests/test_llm_usage_instrumentation.py tests/test_usage_costing.py tests/test_usage_ledger_migration.py tests/test_db_schema.py tests/test_asset_vector_pipeline.py -ra --durations=20
```

- Exit code: `1`
- Collected: `80`
- Result: `73 passed, 7 failed, 6 warnings`
- Pytest duration: `5.15s`
- Process wall time: `6.73s`
- Runtime: Python `3.11.9`, pytest `8.4.2`

The warnings were four existing Pydantic class-config deprecations and two `.pytest_cache` permission warnings. They did not alter the failed assertions.

## Original-defect confirmation

Both original regression IDs were included in the complete suite. They were also executed directly with verbose output to make their GREEN state explicit.

Exact confirmation command:

```powershell
.\venv\Scripts\python.exe -m pytest tests/test_usage_costing.py::test_mock_call_is_nonproduction_nonbillable_and_zero_charge tests/test_usage_ledger_migration.py::test_backfill_with_more_than_500_rows_advances_past_existing_first_batch -vv --durations=5
```

- Exit code: `0`
- Result: `2 passed, 0 failed, 1 warning`
- Pytest duration: `0.48s`
- Process wall time: `1.35s`

| Original ID | AC | Exact test ID | Pass-2 result |
|---|---|---|---|
| F-0024A-001 | AC-0024A-06 | `tests/test_usage_costing.py::test_mock_call_is_nonproduction_nonbillable_and_zero_charge` | GREEN |
| F-0024A-002 | AC-0024A-08 | `tests/test_usage_ledger_migration.py::test_backfill_with_more_than_500_rows_advances_past_existing_first_batch` | GREEN |

## New RED reproduction and mapping

### R-0024A-001 — AC-0024A-07 / FR-007

Test ID:

`tests/test_llm_usage_instrumentation.py::test_image_pre_dispatch_validation_failure_records_zero_billable_units`

Excerpt:

```text
>       assert finalizations[0]["usage_units"] == {
E       AssertionError: assert {'image_edits...ce_images': 0} == {'image_edits...ce_images': 0}
E         {'images': 1} != {'images': 0}
E         {'image_generations': 1} != {'image_generations': 0}
```

Interpretation: local validation failed before provider dispatch, but the failed event fabricated one generated/billable image.

### R-0024A-002 — AC-0024A-07 / FR-007 / plan lifecycle section 2

Test ID:

`tests/test_llm_usage_instrumentation.py::test_text_provider_failure_plus_ledger_failure_raises_reconciliation_signal`

Excerpt:

```text
error = ProviderFailure('provider request failed')
>       assert getattr(error, "reconciliation_required", False) is True
E       AssertionError: assert False is True
```

Test ID:

`tests/test_llm_usage_instrumentation.py::test_image_provider_failure_plus_ledger_failure_raises_reconciliation_signal`

Excerpt:

```text
error = ProviderFailure('provider request failed')
>       assert getattr(error, "reconciliation_required", False) is True
E       AssertionError: assert False is True
```

Test ID:

`tests/test_llm_usage_instrumentation.py::test_embedding_provider_failure_plus_ledger_failure_raises_reconciliation_signal`

Excerpt:

```text
error = ProviderFailure('provider request failed')
>       assert getattr(error, "reconciliation_required", False) is True
E       AssertionError: assert False is True
```

Interpretation: text, image and embedding paths log the failed ledger finalization but return the original provider error without an operational reconciliation signal.

### R-0024A-003 — AC-0024A-05 / FR-021

Test ID:

`tests/test_usage_ledger_migration.py::test_migration_and_full_deploy_define_financial_immutability_triggers`

Excerpt:

```text
E       AssertionError: pricing_snapshots requires a DB-level UPDATE/DELETE immutability trigger
E       assert None
```

Test ID:

`tests/test_usage_ledger_migration.py::test_usage_event_trigger_allows_pending_to_terminal_but_locks_finalized_rows`

Excerpt:

```text
>           assert re.search(r"old\.status\s*=\s*'pending'", normalized)
E           assert None
```

Interpretation: migration and full-deploy SQL do not yet enforce append-only financial history at the PostgreSQL layer while permitting the pending-to-terminal transition.

### R-0024A-004 — AC-0024A-06 / FR-002 / FR-006

Test ID:

`tests/test_usage_ledger_migration.py::test_env_example_declares_safe_usage_environment_and_production_instruction`

Excerpt:

```text
>       assert environment_line is not None
E       assert None is not None
```

Interpretation: `backend/.env.example` does not declare `CREWLAB_ENVIRONMENT`, so deployment accounting mode is not explicit in the environment contract.

## Failure summary

| R-ID | Failed tests | AC/requirement mapping | Pass-2 state |
|---|---:|---|---|
| R-0024A-001 | 1 | AC-0024A-07 / FR-007 | RED |
| R-0024A-002 | 3 | AC-0024A-07 / FR-007 / plan lifecycle section 2 | RED |
| R-0024A-003 | 2 | AC-0024A-05 / FR-021 | RED |
| R-0024A-004 | 1 | AC-0024A-06 / FR-002 / FR-006 | RED |

## Isolation statement

No real LLM/image/embedding provider was called and no real, staging or production database was contacted. The suite used test fixtures, monkeypatched provider modules, local SQLite-backed sessions and static migration/config assertions. No migration was applied. The verifier did not edit production code, tests, specs, plans or tasks, and did not install or auto-fix any tool.

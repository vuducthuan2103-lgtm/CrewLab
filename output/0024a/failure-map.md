# 0024a Initial Failure Map

## Merge-blocking failures reproduced by Sub-agent C

| ID | AC | Evidence | Root cause | Assigned fix scope |
|---|---|---|---|---|
| F-0024A-001 | AC-0024A-06 | `us2-test-report.md`: `test_mock_call_is_nonproduction_nonbillable_and_zero_charge`, exit 1 | `_admit_usage_request()` derives production/billable state only from the environment and does not force the `mock` provider to non-production/internal usage | `backend/app/core/llm.py` |
| F-0024A-002 | AC-0024A-08 | `us3-test-report.md`: `test_backfill_with_more_than_500_rows_advances_past_existing_first_batch`, exit 1 | `LIMIT` is applied before excluding task logs already present in `usage_events`, so reruns keep selecting the first migrated batch | `backend/app/services/usage_backfill.py` |

## Independent database/security review backlog

These findings are not counted as passing merely because the two initial RED tests are fixed. They must receive a regression test or an explicit operational disposition in the next loop.

| ID | Related requirement | Finding | Next-loop action |
|---|---|---|---|
| R-0024A-001 | AC-0024A-07 / FR-007 | Image and embedding exception paths can assign service units even when failure occurs before provider dispatch/evidence | Add RED tests that distinguish pre-dispatch failure from provider-returned billed evidence |
| R-0024A-002 | Plan lifecycle §2 / FR-007 | Provider-error paths log and swallow ledger-finalization failure, leaving a billed event pending without an operational reconciliation exception | Add RED tests and propagate a dedicated reconciliation signal |
| R-0024A-003 | AC-0024A-05 / FR-021 | Historical events, pricing snapshots and adjustments are append-only in service code but not protected against direct DB UPDATE/DELETE | Add migration/static tests and database immutability triggers without blocking pending-to-final transition |
| R-0024A-004 | FR-002 / FR-006 | `CREWLAB_ENVIRONMENT` is absent from `backend/.env.example`; production accounting depends on deployment configuration | Document the required variable and keep real-environment runtime verification open until staging is explicitly authorized |
| R-0024A-005 | FR-005 | Provider-request dedup is scoped only by provider, not provider account/credential | Record as a Phase-1 identity assumption unless provider-account identity becomes available without storing credentials |
| R-0024A-006 | Security boundary | FORCE RLS runtime access relies on a backend role with `BYPASSRLS`; no real Supabase role test was authorized | Keep no-direct-client-access static proof; mark backend-role runtime verification pending staging authorization |
| R-0024A-007 | FR-010 / FR-011 | `unit_prices` JSON is flexible and invalid rates can surface only during finalization | Add bounded write/read validation test or record controlled-seeding precondition |

## Initial decision

- Sub-agent A fixes only F-0024A-001 and F-0024A-002 in the first fix pass.
- Sub-agent B then adds post-fix regression variants and RED tests for R-0024A-001 through R-0024A-004 where locally verifiable.
- Sub-agent C reruns targeted and full regression tests. Any new RED result starts another isolated fix pass.
- R-0024A-005 and R-0024A-006 require an explicit identity/deployment premise and are not silently marked verified.

## Pass-2 verifier result

Independent execution in `pass2-test-report.md` confirmed F-0024A-001 and F-0024A-002 GREEN, and reproduced seven RED tests:

| ID | RED tests | Assigned production fix |
|---|---:|---|
| R-0024A-001 | 1 | Zero image/service units when validation fails before provider dispatch; retain measured units only when provider evidence exists |
| R-0024A-002 | 3 | Mark the raised exception with `reconciliation_required=true` and the pending `usage_event_id` when provider failure and ledger finalization failure coincide |
| R-0024A-003 | 2 | Add PostgreSQL immutability functions/triggers to Alembic and `full_deploy.sql`; allow only pending-to-terminal event finalization before locking financial history |
| R-0024A-004 | 1 | Add `CREWLAB_ENVIRONMENT=local` plus an explicit production-setting instruction to `backend/.env.example` |

Pass-2 command result: exit `1`, `73 passed, 7 failed`. These four R-IDs are the complete scope for fix pass 2.

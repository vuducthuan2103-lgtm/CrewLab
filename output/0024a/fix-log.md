# Spec 0024a Fix Pass 1

## F-0024A-001

- Root cause: usage admission derived production and billing state only from `CREWLAB_ENVIRONMENT`, so the mock provider could be recorded as customer-billable in production mode.
- Fix: force `provider=mock` admissions to `is_production=false`; the existing classification branch consequently records `internal_non_billable` and zero customer charge.
- Changed path: `backend/app/core/llm.py`

## F-0024A-002

- Root cause: the legacy query applied `LIMIT` before excluding `task_logs` already represented by `usage_events.source_task_log_id`, repeatedly selecting the first migrated batch.
- Fix: use an indexed correlated anti-existence filter before ordering and limiting. When no unmigrated rows remain, a bounded reporting query preserves the existing small-rerun counters without modifying or deleting `task_logs`.
- Changed path: `backend/app/services/usage_backfill.py`

No tests, provider calls, real migrations, or real database operations were run in this fix pass.

# Spec 0024a Fix Pass 2

## R-0024A-001

- Root cause: image failure finalization always emitted one image operation even when local validation failed before any provider result existed.
- Fix: failed image events emit zero image/service units unless a provider result supplies billing evidence.
- Changed path: `backend/app/core/llm.py`

## R-0024A-002

- Root cause: provider exceptions remained pending when failure finalization also failed, with only a log entry indicating the reconciliation gap.
- Fix: the original text, repair, image, or embedding exception is marked with `reconciliation_required=true` and its admitted `usage_event_id` before it is re-raised.
- Changed path: `backend/app/core/llm.py`

## R-0024A-003

- Root cause: append-only financial history was enforced only by service behavior, not PostgreSQL.
- Fix: equivalent migration and full-deploy triggers reject pricing/adjustment rewrites and lock usage events after the allowed pending-to-terminal finalization. Downgrade removes triggers and functions before tables.
- Changed paths: `backend/alembic/versions/0016_usage_event_ledger.py`, `backend/full_deploy.sql`

## R-0024A-004

- Root cause: the environment template did not declare the accounting environment mode.
- Fix: declare the safe local default and require production deployments to set production explicitly.
- Changed path: `backend/.env.example`

No tests, provider calls, real migrations, or real database operations were run in this fix pass.

# 0024a Staging Deployment Report

## Target

- Supabase project: `CrewLab - Stagging`
- Project ref: `gbpmriiukhfwmjlurkwg`
- Region: `ap-southeast-1`
- PostgreSQL: `17.6`
- Local `backend/.env` database user targets the same project ref.
- Production project was inactive and was not selected.

## Preflight snapshot

- Remote Alembic marker before deployment: `0012`.
- Supabase migration history and schema inspection confirm the logical 0013, 0014 and 0015 changes are already present:
  - `task_logs.error_code` exists.
  - semantic asset records exist.
  - visual selection decisions exist.
  - brand asset fingerprint, source/generation mode and replacement lineage columns exist.
- New 0016 tables were absent before deployment.
- Source rows before deployment: 1 client, 6 LLM configs, 2 provider credentials, 163 task logs.

The Alembic marker drift is metadata-only: later migrations were applied through Supabase migration tooling without stamping `public.alembic_version`. Deployment 0016 will first assert the prerequisite schema and repair the marker from 0012 to 0015 inside the same transaction, then apply the generated 0015→0016 SQL.

## Safety and rollback

- Migration 0016 is additive and does not update/delete `task_logs` or existing business tables.
- Supabase `apply_migration` provides a tracked, transactional DDL application.
- Rollback SQL is migration 0016 downgrade: remove immutability triggers/functions, then drop only `usage_cost_adjustments`, `usage_events`, `charge_multiplier_configs` and `pricing_snapshots`, and restore the Alembic marker to `0015`.
- No production database is touched.

## Existing unrelated advisor findings

- `public.alembic_version` has RLS disabled. This is pre-existing migration metadata and is not auto-remediated because enabling RLS without an explicit migration-tool policy could block schema deployment.
- Supabase Auth leaked-password protection is disabled.
- Existing schema has performance advisor notices for unindexed foreign keys and older RLS policy patterns. These predate 0024a and are not modified in this deployment.

## Deployment evidence

- Applied Supabase migration `usage_event_ledger_0016` to staging at migration-history version `20260815092506`.
- Reconciled the remote Alembic marker from `0012` to `0015` only after asserting the 0013-0015 prerequisite schema, then applied the generated `0015 -> 0016` SQL in the same migration transaction.
- Post-deploy Alembic marker: `0016`.
- Created `pricing_snapshots`, `charge_multiplier_configs`, `usage_events` and `usage_cost_adjustments`; the default multiplier row is `1.10000000`.
- All four tables have FORCE RLS enabled. Direct reads as both `anon` and `authenticated` fail with PostgreSQL `42501` permission denied; backend/service-role access remains available.
- Transactional trigger smoke test passed and was rolled back:
  - pricing snapshot update rejected (`SQLSTATE 55000`);
  - usage event `pending -> succeeded` transition allowed;
  - terminal usage-event update and delete rejected.
- Legacy backfill dry-run: `scanned=65`, `created=65`, `unresolved=65`.
- Legacy backfill apply: `created=65`; source `task_logs` remained intact.
- Idempotency rerun: `created=0`, `skipped_existing=65`, `unresolved=0`.
- Final staging counts: 65 usage events, all 65 tagged `legacy` and `unresolved`, matching 65 source `llm_call` task logs.
- No provider smoke usage event was created because provider credential decryption failed before request admission.

## Provider smoke blocker

- A real D01 DeepSeek call and a real E01 OpenAI call were attempted through the staging client configuration.
- Both attempts connected to staging and loaded the provider configuration, then stopped before sending any provider request because the local `CREWLAB_CREDENTIAL_ENCRYPTION_KEY` cannot decrypt the two stored credentials.
- No plaintext key was printed, changed or replaced. No provider fallback was used.
- To complete the provider E2E gate, restore the encryption key that was used to encrypt the staging credentials, or re-enter both provider keys through the Internal App, then rerun the smoke call.

## Advisor result

- The four new tables report only the expected informational `rls_enabled_no_policy` lint. This is intentional because direct client roles are denied and ledger access is server-side only.
- Newly created indexes report `unused_index` informational notices immediately after deployment, which is expected before production query traffic.
- The pre-existing `public.alembic_version` RLS and Auth leaked-password warnings listed above remain open and were not changed by 0024a.

## Post-deployment regression

- Full backend suite: `213 passed`, `0 failed`, with 5 pre-existing deprecation warnings.
- Alembic script head: `0016 (head)`.
- `git diff --check`: exit `0`; line-ending notices only.
- Secret-pattern review found only the deliberate fake test value `sk-private-provider-key`; no runtime credential or plaintext provider key is included in the patch or reports.

# Spec 0024a Migration Review

**Reviewer**: Main agent
**Date**: 2026-08-15
**Reviewed files**: `backend/alembic/versions/0016_usage_event_ledger.py`, `backend/full_deploy.sql`, `backend/app/models/usage.py`

## Static review result

- PASS: revision `0016` is additive and follows head `0015`.
- PASS: upgrade creates only `pricing_snapshots`, `charge_multiplier_configs`, `usage_events`, and `usage_cost_adjustments` plus their indexes, constraints, seed, RLS and grants.
- PASS: no `ALTER`, `UPDATE`, `DELETE`, `DROP`, or data rewrite targets `task_logs` or another existing application table.
- PASS: downgrade drops only the four new ledger tables in dependency order.
- PASS: `backend/full_deploy.sql` mirrors the four-table schema and enables/forces RLS.
- PASS: ledger tables are revoked from `anon` and `authenticated` and receive no client Data API policy.
- PASS: tenant/time, parent/content correlation, event identity, provider identity, pricing lookup and adjustment lookup indexes are present.
- PASS: currency/multiplier/cost/latency and effective-range constraints use fixed-precision Postgres types.

## Verification still required

- Sub-agent B must test schema inventory, Alembic head, downgrade scope, RLS text and model constraints.
- Sub-agent C must execute isolated migration/schema tests; this review does not authorize or run a staging/production migration.
- Deployment must prove the backend database role can access FORCE-RLS tables through its intended privileged direct connection. No browser/service-role secret may be exposed.

## Current non-blocking review notes

- The seeded global multiplier uses a fixed system UUID and append-only reason, allowing deterministic bootstrap.
- The 24-month retention requirement is represented by absence of TTL/destructive cleanup; elapsed-time proof remains deferred per AC-0024A-10.

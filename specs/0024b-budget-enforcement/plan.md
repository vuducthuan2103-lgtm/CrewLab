# Implementation Plan: Budget Tracking & Enforcement

**Branch**: `feature/0024b-budget-enforcement` | **Date**: 2026-08-15 | **Spec**: [spec.md](spec.md)

## Summary

Track monthly client and agent budgets from the 0024a usage ledger and reject billable work before a provider request overspends. PostgreSQL remains the financial source of truth; Redis coordinates short-lived integer-cent reservations across Celery workers.

## Technical Context

**Language/Version**: Python 3.11 locally; target Python 3.12  
**Primary Dependencies**: FastAPI, SQLAlchemy async, Celery, Redis, pytest  
**Storage**: PostgreSQL ledger and temporary Redis reservation keys  
**Testing**: pytest async unit/service and instrumentation tests  
**Target Platform**: Linux API/worker deployment; Windows local development  
**Project Type**: Backend web service and Celery workers  
**Performance Goals**: one bounded Redis script and indexed ledger aggregation per provider admission  
**Constraints**: customer charge only; cents reservations; provider is never called after failed admission; client-local calendar months; no Portal/Internal UI in this sub-spec  
**Scale/Scope**: one client-total plus six active-agent caps per client

## Constitution Check

PASS. The current MVP scope authorizes A01 plus five content agents, superseding the older five-agent constitution. No prohibited agent, RAG, publisher, analytics, or new service is introduced. Migration is additive and must not be applied to a real database without owner approval.

## Research Decisions

1. Convert conservative estimated customer charge to integer cents with `ROUND_CEILING`.
2. Aggregate finalized customer charge and adjustments in Postgres for the client-local month; Redis contains only active reservations.
3. Atomically reserve both client and agent capacity via one Lua script; it removes expired reservation members before checking capacity.
4. The ledger finalization commits before reservation release. This is conservatively safe during concurrent admission.
5. If a cap is configured but no safe maximum estimate can be obtained from a pricing snapshot, reject with `budget_estimate_unavailable` rather than silently reserve zero.

## Data Model

- Add nullable `clients.monthly_budget_usd` for the client-total cap.
- Continue using nullable `client_llm_configs.budget_usd` for agent caps.
- A status has `charge_usd`, `budget_usd`, `remaining_usd`, `percentage`, and state `normal`, `warning`, `exceeded`, or `not_configured`.
- Redis reservations are keyed by `{client}:{agent}:{YYYY-MM}:{usage_event}` and include amount + expiry. Their counters use cents and expire after the local month plus a bounded grace period.

## Project Structure

```text
backend/
├── alembic/versions/0017_budget_enforcement.py
├── app/models/{clients.py,llm_config.py}
├── app/services/budget_enforcement.py
├── app/core/llm.py
└── tests/{test_budget_enforcement.py,test_llm_budget_admission.py}
```

**Structure Decision**: extend the existing backend and 0024a instrumentation seam. The Redis adapter lives in `budget_enforcement.py`; no daemon, proxy, or public endpoint is added.

## Complexity Tracking

| Added complexity | Why needed | Simpler alternative rejected because |
|---|---|---|
| Redis reservation script | Atomic cross-worker admission | Ledger reads alone allow stale concurrent checks |

## Post-design Constitution Re-check

PASS. The design is additive, uses the approved Redis/Celery stack, maintains tenant boundaries, and does not expose financial data through client-facing surfaces.

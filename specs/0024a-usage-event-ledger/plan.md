# Implementation Plan: Usage Event & Cost Ledger

**Branch**: feature/0024-full-llm-observability | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)

**Input**: FR-001 → FR-022 and AC-0024A-01 → AC-0024A-10.

## Summary

Create a canonical, idempotent usage_events ledger for every provider request and migrate LLM-accounting responsibility away from task_logs. The implementation records a pending event before an external call, finalizes cost in an independent ledger transaction, snapshots provider pricing and the effective customer-charge multiplier, and keeps task_logs available as workflow execution log during transition.

This plan supersedes the PRD C1 physical split between llm_usage and internal_llm_usage; one ledger uses explicit billing classification instead.

## Technical Context

**Language/Version**: Python 3.12 project target. Current local backend/venv reports Python 3.11.9; implementation must avoid 3.12-only behavior until the project runtime is aligned and test reports must record the actual interpreter.

**Primary Dependencies**: FastAPI, SQLAlchemy 2.0.51 async ORM, Alembic 1.19.0, Pydantic 2.13.4, LiteLLM, existing per-client credential/model services.

**Storage**: PostgreSQL/Supabase for canonical ledger, pricing/multiplier snapshots and adjustments. task_logs remains transition workflow log.

**Testing**: pytest 8.4.2; SQLAlchemy/Alembic schema tests; service unit tests; mocked-provider integration tests; migration/backfill idempotency tests.

**Target Platform**: Linux backend/Celery deployment; Windows local development.

**Project Type**: Backend web service + Celery workers in existing monorepo.

**Performance Goals**: A committed usage event becomes queryable within one minute; normal finalization adds no more than two short database transactions per provider request; dedup lookup uses indexed identity.

**Constraints**:

- No provider call if a pending usage event cannot be committed.
- Provider-billed usage must survive workflow transaction rollback.
- No prompt, response, credential or authorization material in financial tables.
- No destructive drop of task_logs or its existing consumer fields in the first PR.
- Cost uses fixed-precision decimals, never binary floats.
- Historical pricing/multiplier snapshots are immutable after finalization.

**Scale/Scope**: N=1 Bardinh pilot now; multi-client compatible. Six MVP agents and text/image/vision/embedding call paths. Twenty-four-month elapsed retention proof is deferred, while schema/policy support is required.

## Constitution Check

*GATE: Pass before research; re-checked after design.*

| Principle | Result | Evidence |
|---|---|---|
| Strict MVP agent scope | PASS | Covers only current six MVP agents and shared call abstraction; adds no full-vision agent |
| No ChromaDB/Hindsight | PASS | PostgreSQL ledger only |
| FSM compliance | PASS | Does not change content FSM |
| Evaluator thresholds/retries | PASS | Captures retry cost without changing retry policy |
| Approved stack | PASS WITH ENVIRONMENT NOTE | Existing FastAPI/SQLAlchemy/Postgres stack; local Python 3.11.9 differs from target 3.12 |
| Feature branch and spec-first | PASS | Feature branch exists; spec precedes plan |
| Schema safety | PASS | Additive migration and idempotent backfill; no first-PR drop |

The stale constitution says five agents while active MVP Scope/AGENTS.md says six including A01. This plan follows the higher-current project source and does not expand beyond those six.

## Architecture Decisions

### 1. One canonical ledger

usage_events replaces llm_usage and internal_llm_usage. billing_classification and nullable client_id distinguish customer-billable from internal non-billable usage.

### 2. Begin/finalize lifecycle in independent transactions

    admission
      -> commit pending usage event
      -> call provider
      -> finalize event in independent short transaction
      -> return provider result to workflow

- If begin fails: abort before provider call.
- If provider fails: finalize failed event with billed-usage evidence when available.
- If finalize fails after provider response: leave pending event and raise an operational reconciliation signal; do not silently treat cost as zero.
- Workflow commit/rollback is independent of ledger persistence.

### 3. Stable event identity

- Caller creates event_key before provider call.
- Unique event_key makes application retry idempotent.
- Partial unique (provider, provider_request_id) deduplicates provider replay when request ID exists.
- Repair/retry uses a new event key and shared parent correlation.

### 4. Cost precedence

1. Provider-reported billed cost.
2. Versioned pricing_snapshots using measured units.
3. unresolved status when neither is sufficient; never final zero by assumption.

### 5. Transition from task_logs

- New model calls write usage_events; workflow events keep task_logs.
- Backfill uses event_key = legacy-task-log:{task_log_id}.
- Legacy cost remains unresolved when provider/rate evidence is insufficient.
- Existing task-log endpoints remain compatible in this sub-spec.

## Project Structure

### Documentation

    specs/0024a-usage-event-ledger/
    ├── spec.md
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── quickstart.md
    ├── contracts/
    │   └── usage-event-ledger.md
    └── tasks.md

tasks.md is generated later by speckit-tasks.

### Source Code

    backend/
    ├── alembic/versions/
    │   └── 00xx_usage_event_ledger.py
    ├── app/
    │   ├── core/
    │   │   └── llm.py
    │   ├── models/
    │   │   ├── system.py
    │   │   └── usage.py
    │   └── services/
    │       ├── usage_ledger.py
    │       └── usage_backfill.py
    └── tests/
        ├── test_usage_ledger.py
        ├── test_usage_ledger_migration.py
        ├── test_usage_costing.py
        └── test_llm_usage_instrumentation.py

**Structure Decision**: Keep ledger models/services in the existing backend. Do not create a new service, daemon or provider proxy.

## Data Migration Sequence

1. Add new tables, constraints, indexes and default global multiplier 1.10.
2. Deploy code capable of reading/writing usage_events while preserving task_logs.
3. Backfill eligible historical LLM rows idempotently.
4. Compare row counts, source IDs and totals; unresolved legacy cost remains explicit.
5. Switch cost/quota consumers to usage_events in dependent specs.
6. Defer removal of obsolete task-log accounting fields to a separate compatibility migration.

Downgrade may remove only new 0024a tables after explicit review. It must not delete or rewrite original task_logs.

## Build Loop & Sub-agent Assignment

The implementation phase must keep independent authorship/evaluation roles:

| Role | Assignment | Allowed work | Must not do |
|---|---|---|---|
| Main agent | Coordinator/reviewer | Own plan/tasks, resolve conflicts, inspect evidence, map final results to AC | Claim pass without runner evidence |
| Sub-agent A | Implementation agent | Implement tasks.md, migration, ledger services, instrumentation and bug fixes | Be sole test author/reporter |
| Sub-agent B | Test-author agent | Generate tests directly from AC and inspect interfaces for missing cases | Modify production code or mark own tests as product pass |
| Sub-agent C | Test-runner/report agent | Run targeted/full tests, migration checks, collect exact commands/output under output/0024a/ | Fix production code or weaken expected results |

Mandatory loop:

    Sub-agent A implements tasks.md
      -> Sub-agent B generates AC-derived tests
      -> Sub-agent C runs tests and writes pass/fail report with logs
      -> Main agent maps failures to AC
      -> Sub-agent A fixes only evidenced defects
      -> Sub-agent B adds regression tests for the fixed region
      -> Sub-agent C reruns targeted tests, then full related suite
      -> repeat until every merge-blocking AC passes

Rules:

- A failure is not closed by code inspection; runner evidence is required.
- New regression tests are mandatory after each bug fix.
- Existing workflow/task-log tests run in every final cycle.
- AC-0024A-10 is reported as deferred elapsed-time verification, not falsely marked runtime-pass.

## Verification Strategy

### Schema and migration

- Upgrade on empty schema and representative existing schema.
- Run backfill twice; second run changes zero rows/totals.
- Verify unique identities, nonnegative constraints, decimal precision and indexes.
- Verify downgrade scope does not touch task_logs.

### Service

- Begin fails before provider call when DB write fails.
- Workflow rollback after provider success does not remove usage event.
- Provider response finalizes cost once.
- Failed billed and failed unbilled calls behave differently.
- Multiplier/price changes do not mutate finalized history.

### Instrumentation

- Text initial + structured repair create two events.
- Image generation/edit and embedding create service-specific events.
- Mock calls are zero-cost/non-production.
- Legacy _log_task no longer acts as financial source.

### Regression

- Existing provider routing and encrypted credential tests.
- Existing D01/D02/E01 tests.
- Existing DB schema and task-log/work-board contract tests.

## Complexity Tracking

| Added complexity | Why needed | Simpler alternative rejected because |
|---|---|---|
| Pending → final event lifecycle | Provider cost must survive workflow rollback and failed calls | Post-call write alone loses evidence on crash/rollback |
| Versioned pricing snapshot | Historical cost must remain reproducible | Repricing old usage with current rates changes history |
| Separate adjustment records | Financial corrections need auditability | Updating finalized rows destroys original evidence |
| Temporary task-log coexistence | Existing workflow UI depends on it | Immediate drop breaks Work Board and failure timelines |

## Post-design Constitution Re-check

PASS. Design stays inside the existing backend/Postgres stack, is additive, preserves tenant boundaries and introduces no prohibited full-vision module. The only environment drift is existing local Python 3.11.9 versus target 3.12; test evidence must state the runtime used.

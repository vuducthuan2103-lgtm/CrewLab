# Tasks: Usage Event & Cost Ledger

**Input**: Design documents from `specs/0024a-usage-event-ledger/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/usage-event-ledger.md`, `quickstart.md`

**Role separation**: Sub-agent A implements production code. Sub-agent B independently authors AC-derived tests. Sub-agent C independently runs tests and writes evidence. The main agent coordinates and maps evidence to acceptance criteria.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it has a disjoint write set and no dependency on an incomplete task.
- **[Story]**: Maps the task to the user story in `spec.md`.
- Every task names the responsible role and exact file path.

## Phase 1: Setup and Baseline

**Purpose**: Confirm the approved context and preserve reproducible pre-change evidence.

- [X] T001 Main agent records branch, interpreter/package versions, checklist status, current test baseline and existing dirty files in `output/0024a/baseline.md`
- [X] T002 Main agent verifies existing Git/Python/Docker ignore coverage without overwriting user rules in `.gitignore` and `.dockerignore`

---

## Phase 2: Foundational Ledger Schema

**Purpose**: Add the canonical additive schema and independent transaction seam required by every user story.

**Critical**: No provider-call instrumentation starts until this phase is complete.

- [X] T003 [P] Sub-agent A defines `UsageEvent`, `PricingSnapshot`, `ChargeMultiplierConfig`, and `UsageCostAdjustment` with fixed-precision constraints and indexes in `backend/app/models/usage.py`
- [X] T004 Sub-agent A exports the new ledger models so metadata/migrations/tests discover them in `backend/app/models/__init__.py`
- [X] T005 Sub-agent A creates additive migration `backend/alembic/versions/0016_usage_event_ledger.py`, mirrors the deploy-time schema in `backend/full_deploy.sql`, seeds global multiplier `1.10`, adds backend-only RLS, and limits downgrade to the four new tables
- [X] T006 [P] Sub-agent A adds typed ledger commands/results, validation enums, sanitized errors, decimal quantization helpers, and an injectable independent-session factory in `backend/app/services/usage_ledger.py`
- [X] T007 Main agent reviews migration upgrade/downgrade and confirms no `task_logs` mutation or destructive existing-schema operation in `backend/alembic/versions/0016_usage_event_ledger.py`

**Checkpoint**: New tables are additive, importable by SQLAlchemy metadata, and do not change existing workflow tables.

---

## Phase 3: User Story 1 — Capture Each Provider Request Exactly Once (P1)

**Goal**: Every real text/image/vision/embedding provider request gets one independently committed event; retries/repairs get linked events and duplicate replay cannot duplicate cost.

**Independent Test**: Initial request plus billed repair produces two linked events; replay of either stable identity produces no third event; a failed begin prevents the provider mock from running.

### Implementation — Sub-agent A

- [X] T008 [US1] Sub-agent A implements idempotent `begin_usage_event` and `finalize_usage_event` lifecycle with independent short transactions and provider-request dedup in `backend/app/services/usage_ledger.py`
- [X] T009 [US1] Sub-agent A instruments mock, real, failure, and structured-repair text calls with separate event identities in `backend/app/core/llm.py`
- [X] T010 [US1] Sub-agent A instruments image generation/edit requests with image units, mode, latency, failures, and independent finalization in `backend/app/core/llm.py`
- [X] T011 [US1] Sub-agent A instruments embedding requests with token/dimension units, failures, and independent finalization in `backend/app/core/llm.py`
- [X] T012 [US1] Sub-agent A keeps prompts, responses, credentials, headers, and raw provider exceptions outside ledger inputs and stores only sanitized error categories in `backend/app/services/usage_ledger.py`

### Independent AC Tests — Sub-agent B

- [X] T013 [P] [US1] Sub-agent B writes lifecycle/idempotency/failure tests for AC-0024A-01, AC-0024A-02, AC-0024A-06, and AC-0024A-07 in `backend/tests/test_usage_ledger.py`
- [X] T014 [P] [US1] Sub-agent B writes mocked text-repair/image/embedding instrumentation tests proving one event per external request in `backend/tests/test_llm_usage_instrumentation.py`

### Independent Execution — Sub-agent C

- [X] T015 [US1] Sub-agent C runs US1 tests, records exact commands/exit codes/failure excerpts, and maps results to AC in `output/0024a/us1-test-report.md`

**Checkpoint**: US1 evidence proves event identity, correlation, fail-before-provider behavior, and no mock/customer charge leakage.

---

## Phase 4: User Story 2 — Reproduce Actual Cost and Customer Charge (P1)

**Goal**: Every resolved event has reproducible actual cost and customer charge from immutable provider or pricing/multiplier evidence.

**Independent Test**: Provider-reported cost wins; snapshot fallback reproduces cost; multiplier/client override changes affect only later events; corrections append rows without mutating originals.

### Implementation — Sub-agent A

- [X] T016 [US2] Sub-agent A implements effective-dated global/client multiplier lookup, default `1.10`, immutable admission snapshot, and client-override precedence in `backend/app/services/usage_ledger.py`
- [X] T017 [US2] Sub-agent A implements provider-cost precedence, versioned pricing-snapshot fallback, unit validation, unresolved handling, and fixed-precision charge calculation in `backend/app/services/usage_ledger.py`
- [X] T018 [US2] Sub-agent A implements append-only `record_usage_adjustment` with actor/reason validation and no original-event mutation in `backend/app/services/usage_ledger.py`
- [X] T019 [US2] Sub-agent A extracts provider request ID, billed cost, and usage units defensively from LiteLLM text responses without assuming all providers expose identical metadata in `backend/app/core/llm.py`

### Independent AC Tests — Sub-agent B

- [X] T020 [P] [US2] Sub-agent B writes cost-source, precision, failed-billed, non-billable, and customer-charge tests for AC-0024A-03, AC-0024A-06, and AC-0024A-07 in `backend/tests/test_usage_costing.py`
- [X] T021 [US2] Sub-agent B writes prospective multiplier/pricing snapshot and append-only adjustment tests for AC-0024A-04 and AC-0024A-05 in `backend/tests/test_usage_costing.py`

### Independent Execution — Sub-agent C

- [X] T022 [US2] Sub-agent C runs US1+US2 tests and writes exact pass/fail evidence with aggregate recomputation checks in `output/0024a/us2-test-report.md`

**Checkpoint**: US2 evidence can reproduce each stored amount from versioned evidence and proves historical rows are immutable.

---

## Phase 5: User Story 3 — Preserve Workflow Logs During Migration (P1)

**Goal**: Backfill eligible legacy LLM rows idempotently while keeping `task_logs` available as workflow execution/status data.

**Independent Test**: Running backfill twice changes no count/totals on the second run; insufficient legacy evidence remains unresolved; existing task-log consumers still pass.

### Implementation — Sub-agent A

- [X] T023 [US3] Sub-agent A implements deterministic, rerunnable `legacy-task-log:{id}` backfill with explicit unresolved cost and no source-row mutation in `backend/app/services/usage_backfill.py`
- [X] T024 [US3] Sub-agent A removes `_log_task` as the financial accounting path while preserving workflow/failure logging contracts in `backend/app/core/llm.py` and `backend/app/services/task_logger.py`
- [X] T025 [US3] Sub-agent A documents safe CLI/service invocation and dry-run/result counters for legacy backfill in `backend/app/services/usage_backfill.py`

### Independent AC Tests — Sub-agent B

- [X] T026 [P] [US3] Sub-agent B writes migration/schema/backfill idempotency and downgrade-scope tests for AC-0024A-08 and deferred AC-0024A-10 support in `backend/tests/test_usage_ledger_migration.py`
- [X] T027 [P] [US3] Sub-agent B extends workflow-log regression tests for AC-0024A-09 in `backend/tests/test_db_schema.py`

### Independent Execution — Sub-agent C

- [X] T028 [US3] Sub-agent C runs US3 plus existing Work Board/task-log tests and records exact evidence in `output/0024a/us3-test-report.md`

**Checkpoint**: Usage accounting reads the new ledger, while workflow consumers retain their existing `task_logs` contract.

---

## Phase 6: Fix, Regression Expansion, and Final Verification

**Purpose**: Close only evidence-backed defects and produce the final merge decision.

- [X] T029 Main agent maps all failures from `output/0024a/us1-test-report.md`, `us2-test-report.md`, and `us3-test-report.md` to AC and assigns concrete defects in `output/0024a/failure-map.md`
- [X] T030 Sub-agent A fixes evidenced production defects only, recording changed paths and failure IDs in `output/0024a/fix-log.md`
- [X] T031 Sub-agent B adds regression cases for every fixed region without weakening expected outcomes in `backend/tests/test_usage_ledger.py`, `backend/tests/test_usage_costing.py`, `backend/tests/test_usage_ledger_migration.py`, or `backend/tests/test_llm_usage_instrumentation.py`
- [X] T032 Sub-agent C reruns targeted tests, full backend regression, static validation, and migration checks; records interpreter/packages, commands, exit codes, AC-0024A-01→09 status, and deferred AC-0024A-10 status in `output/0024a/final-test-report.md`
- [X] T033 Main agent runs `git diff --check`, reviews security/tenant boundaries and forbidden payload handling, then records the final AC sign-off in `output/0024a/acceptance-report.md`
- [X] T034 Main agent marks completed tasks `[X]` in `specs/0024a-usage-event-ledger/tasks.md` only when corresponding code or runner evidence exists

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 has no dependency.
- Phase 2 depends on Phase 1 and blocks every user story.
- US1 depends on Phase 2.
- US2 depends on the US1 lifecycle seam because finalization applies cost evidence.
- US3 depends on the canonical schema/service from US1 and cost-state semantics from US2.
- Final verification depends on all three story reports.

### Mandatory Agent Loop

```text
Sub-agent A implements the story tasks
  -> Sub-agent B independently generates AC-derived tests
  -> Sub-agent C runs tests and reports exact evidence
  -> Main agent maps failures to AC
  -> Sub-agent A fixes evidenced defects
  -> Sub-agent B adds regression tests for fixed regions
  -> Sub-agent C reruns targeted and full related suites
  -> repeat until every merge-blocking AC passes
```

Implementation and evaluation roles must remain separate even when tasks are sequential.

### Parallel Opportunities

- T003 and T006 have disjoint initial write scopes and can start after setup.
- T013 and T014 can be authored in parallel after US1 implementation.
- T020 and T021 are sequential because they share `backend/tests/test_usage_costing.py`.
- T026 and T027 have disjoint test files and can be authored in parallel after US3 implementation.
- 0024b remains blocked until final 0024a acceptance; no UI/Langfuse work belongs in this task.

## Implementation Strategy

1. Build only the additive schema and internal service seam.
2. Deliver US1 provider-request identity and lifecycle, then independently test it.
3. Extend finalization with reproducible costing/customer charge, then independently test it.
4. Migrate legacy accounting responsibility without removing workflow logs.
5. Run the mandatory fix/regression loop until AC-0024A-01→09 pass.
6. Report AC-0024A-10 as deferred elapsed-time verification while proving schema/policy support now.

## Done When

- All tasks T001–T034 are marked `[X]` with evidence or an explicit no-failure record for conditional fix tasks.
- AC-0024A-01 through AC-0024A-09 pass with independent runner evidence.
- AC-0024A-10 is reported only as deferred elapsed-time verification, with current retention-support checks.
- No real provider-cost call or production database migration is executed without separate authorization.
- Existing workflow/task-log and provider-routing regressions pass.

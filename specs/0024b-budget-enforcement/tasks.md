# Tasks: Budget Tracking & Enforcement

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/budget-enforcement.md`, `quickstart.md`

## Phase 1: Baseline

- [ ] T001 Record the branch, prerequisite 0024a commit, test baseline, and Git status in `output/0024b/baseline.md`
- [ ] T002 Verify existing ignore coverage for Python, Node, environment, and Redis-local artifacts in `.gitignore`

## Phase 2: Foundational Schema and Service

- [ ] T003 Add nullable client-total monthly budget model field in `backend/app/models/clients.py`
- [ ] T004 Add additive migration, deploy schema parity, RLS, and downgrade scope in `backend/alembic/versions/0017_budget_enforcement.py` and `backend/full_deploy.sql`
- [ ] T005 Implement client-local month bounds, ledger aggregation, cents conversion, and status contract in `backend/app/services/budget_enforcement.py`
- [ ] T006 Implement Redis atomic dual-scope reservation, idempotent release, expiry cleanup, and injectable test adapter in `backend/app/services/budget_enforcement.py`
- [ ] T007 Write foundational migration/status/reservation tests in `backend/tests/test_budget_enforcement.py`

## Phase 3: User Story 1 — Consistent budget status

- [ ] T008 [US1] Implement status lookup for client total and every agent budget in `backend/app/services/budget_enforcement.py`
- [ ] T009 [US1] Write under-80, 80–99.99, 100, not-configured, adjustment, and timezone tests in `backend/tests/test_budget_enforcement.py`

## Phase 4: User Story 2 — Block before provider call

- [ ] T010 [US2] Derive bounded text, image, vision, and embedding customer-charge estimates from 0024a pricing snapshots in `backend/app/services/budget_enforcement.py`
- [ ] T011 [US2] Integrate admit-before-provider and finalize-then-release into all 0024a call paths in `backend/app/core/llm.py`
- [ ] T012 [US2] Write exhausted-client, exhausted-agent, warning, estimate-missing, and provider-zero-call tests in `backend/tests/test_llm_budget_admission.py`

## Phase 5: User Story 3 — Concurrent admission and recovery

- [ ] T013 [US3] Add concurrent dual-cap admission and post-finalization reconciliation tests in `backend/tests/test_budget_enforcement.py`
- [ ] T014 [US3] Add reservation TTL/crash cleanup and local-month boundary tests in `backend/tests/test_budget_enforcement.py`

## Phase 6: Verification

- [ ] T015 Run targeted tests, existing ledger/instrumentation regressions, static validation, and `git diff --check`; record AC mapping in `output/0024b/final-test-report.md`
- [ ] T016 Mark each completed task with direct evidence in `specs/0024b-budget-enforcement/tasks.md`

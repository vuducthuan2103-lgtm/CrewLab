# Tasks: Portal Bootstrap Performance

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md` in this feature directory.

**Tests**: Required because the specification defines tenant-isolation, failure-isolation, correlation, readiness, and measurable initial-load acceptance criteria.

## Phase 1: Setup and contracts

- [x] T001 Record the bootstrap/deferred-loading architecture in `docs/decisions/0012-portal-bootstrap-and-deferred-page-data.md`
- [x] T002 [P] Add bootstrap and client-side load/error contracts in `backend/app/api/schemas.py` and `portal/lib/types.ts`
- [x] T003 [P] Add request-aware Portal API error typing in `portal/lib/api.ts`

---

## Phase 2: Backend foundation (blocking)

- [x] T004 Write failing bootstrap contract, active-client, empty-state, and cross-client isolation tests in `backend/tests/test_portal_bootstrap.py`
- [x] T005 [P] Write failing request-ID and database-readiness tests in `backend/tests/test_database_connection_errors.py`
- [x] T006 Extend the authenticated context with the validated viewer email while preserving existing callers in `backend/app/core/auth.py`
- [x] T007 Implement the tenant-scoped `GET /api/v1/portal/bootstrap` aggregation in `backend/app/api/portal_router.py`
- [x] T008 Implement server-owned request-ID logging/response headers and `GET /readyz` in `backend/app/main.py`

**Checkpoint**: One authenticated backend request returns the complete first-screen read model, every response is traceable, and readiness checks the database.

---

## Phase 3: User Story 1 — Immediate correct restaurant identity (P1)

**Goal**: A linked user sees the signed-in email immediately and the trusted active restaurant from bootstrap without waiting for settings or assets.

**Independent Test**: Sign in as an active linked client, verify email/client identity, then repeat with a missing/inactive client and confirm no tenant data leaks.

- [x] T009 [US1] Add `apiFetchBootstrap` and support-reference propagation in `portal/lib/api.ts`
- [x] T010 [US1] Replace the six-request session refresh with bootstrap mapping in `portal/lib/store.tsx`
- [x] T011 [US1] Render a precise bootstrap loading/error/retry state in `portal/components/layout/PortalLayout.tsx` and preserve immediate session email in `portal/components/layout/Sidebar.tsx`

---

## Phase 4: User Story 2 — Deferred page data (P1)

**Goal**: The work board loads independently; assets and settings request their own data only when visited.

**Independent Test**: Open the board and observe no asset/settings calls, then visit each page and verify its own loader and data.

- [x] T012 [US2] Add idempotent asset and settings loaders with independent status/error state in `portal/lib/store.tsx`
- [x] T013 [US2] Trigger and render asset-page loading/error/retry in `portal/app/assets/page.tsx` and `portal/components/assets/MediaLibraryGrid.tsx`
- [x] T014 [US2] Trigger and render settings-page loading/error/retry in `portal/app/settings/page.tsx`
- [x] T015 [US2] Refresh only the affected read model after asset mutations in `portal/lib/store.tsx`

---

## Phase 5: User Story 3 — Actionable recoverable failure (P2)

**Goal**: Every tested load failure names its area, offers a safe retry, and shows the server support reference while unrelated Portal areas stay usable.

**Independent Test**: Fail bootstrap, assets, and settings separately and verify each UI state and matching request ID.

- [x] T016 [US3] Centralize user-safe Portal load-error conversion and short support-reference formatting in `portal/lib/api.ts` and `portal/lib/store.tsx`
- [x] T017 [US3] Ensure global bootstrap and page-specific error views expose the affected area, retry action, and support reference without sensitive data

---

## Phase 6: Verification and handoff

- [x] T018 Run targeted and full backend pytest suites and resolve regressions
- [x] T019 [P] Run Portal lint, TypeScript checking, and production build
- [x] T020 Verify FR-001 through FR-009 and SC-001 through SC-005 against automated evidence and the smoke-test checklist
- [x] T021 Update all task checkboxes, review the diff for secrets/scope drift, commit small Conventional Commits, push, and open a Pull Request

## Dependencies and execution order

- Phase 1 establishes contracts before implementation.
- T004 and T005 must fail for the expected missing behavior before T006–T008 implement it.
- Backend foundation blocks all frontend stories.
- US1 bootstrap mapping precedes US2 deferred loaders because the store ownership changes there.
- US2 loaders precede US3 presentation hardening.
- Verification runs only after all three stories are independently usable.

## Implementation strategy

1. Prove backend contract and tenant boundary with tests.
2. Replace only the initial Portal read path with bootstrap.
3. Move optional domains to explicit page loaders.
4. Add correlated, retryable failure presentation.
5. Run full validation and map evidence to every acceptance criterion.

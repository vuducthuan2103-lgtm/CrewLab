# Tasks: Per-client Provider & API Key Management

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, and `contracts/` in this feature directory.

**Tests**: Included because the user explicitly wants to test real agent activity, and the specification has measurable isolation/security acceptance criteria.

## Phase 1: Setup

- [x] T001 Add `cryptography` dependency and credential-encryption setting in `backend/requirements.txt` and `backend/app/core/db.py`
- [x] T002 [P] Add Supabase Auth dependency and environment contract to `internal-app/package.json` and `internal-app/.env.example`
- [x] T003 [P] Create server-owned provider/model catalog in `backend/app/core/model_catalog.py`

---

## Phase 2: Foundational (Blocking)

- [x] T004 Write failing credential encryption/masking tests in `backend/tests/test_credentials.py`
- [x] T005 Write failing catalog eligibility tests in `backend/tests/test_model_catalog.py`
- [x] T006 Implement encryption, decryption, masking, and sanitized error helpers in `backend/app/core/credentials.py`
- [x] T007 Create `ClientProviderCredential` ORM model in `backend/app/models/provider_credentials.py` and export it from `backend/app/models/__init__.py`
- [x] T008 Author additive migration with constraints, indexes, and RLS in `backend/alembic/versions/0010_client_provider_credentials.py`
- [x] T009 Refactor JWT parsing into Portal and Agency Admin authorization dependencies in `backend/app/core/auth.py`
- [x] T010 Register Internal App router in `backend/app/main.py`

**Checkpoint**: Encryption, tenant model, catalog, and role boundaries exist before user-facing workflows.

---

## Phase 3: User Story 1 - Configure providers during onboarding (Priority: P1)

**Goal**: Agency Admin can save/test one or two per-client credentials and activate only a correctly configured client.

**Independent Test**: Create an inactive client, validate and enable one provider, activate it; then verify zero and third-provider cases are blocked.

### Tests

- [x] T011 [US1] Write failing provider service tests for save/test/enable/max-two/activation in `backend/tests/test_provider_credentials.py`
- [x] T012 [US1] Write failing admin authorization and API contract tests in `backend/tests/test_internal_provider_api.py`

### Implementation

- [x] T013 [US1] Implement credential lifecycle, max-two validation, activation rules, and secret-safe auditing in `backend/app/services/provider_credentials.py`
- [x] T014 [US1] Implement admin client/provider endpoints in `backend/app/api/internal_router.py`
- [x] T015 [US1] Implement real Supabase session and authenticated API helper in `internal-app/lib/supabase.ts` and `internal-app/lib/api.ts`
- [x] T016 [US1] Replace mock Internal App login with Supabase authentication in `internal-app/app/login/page.tsx`
- [x] T017 [US1] Replace out-of-scope nine-step onboarding with MVP client/provider onboarding in `internal-app/app/onboarding/page.tsx`
- [x] T018 [US1] Add masked credential cards, validation state, one-to-two provider enforcement, and activation feedback using existing shadcn-compatible primitives in `internal-app/components/`

**Checkpoint**: User Story 1 is independently usable from Internal App without exposing stored keys.

---

## Phase 4: User Story 2 - Client chooses only eligible models (Priority: P1)

**Goal**: Portal chooses model/tier/budget only, from enabled providers, and the next real LLM call uses the client's encrypted credential.

**Independent Test**: With one enabled provider, Portal shows only its compatible models, accepts a valid agent model update, rejects another provider's model, and the next task log records the chosen model.

### Tests

- [x] T019 [US2] Write failing Portal settings contract tests for eligible catalog and provider-free updates in `backend/tests/test_portal_model_settings.py`
- [x] T020 [US2] Write failing per-client LLM routing and no-env-fallback tests in `backend/tests/test_llm_routing.py`

### Implementation

- [x] T021 [US2] Remove provider from `AgentConfigUpdate` and add catalog validation schemas in `backend/app/api/schemas.py`
- [x] T022 [US2] Return eligible models and derive provider server-side in `backend/app/api/portal_router.py`
- [x] T023 [US2] Resolve and decrypt the authenticated client's credential in `backend/app/core/llm.py`, preserving mock mode and safe task logs
- [x] T024 [US2] Remove browser-side provider inference from `portal/lib/api.ts` and update settings types in `portal/lib/types.ts`
- [x] T025 [US2] Render only server-returned eligible models and no provider/key controls in `portal/app/settings/page.tsx`

**Checkpoint**: User Story 2 is independently testable through Portal and a real agent call.

---

## Phase 5: User Story 3 - Safely update or disable a provider (Priority: P2)

**Goal**: Agency Admin can replace a key safely and must confirm before disabling a provider used by agents.

**Independent Test**: Replace a key and see only the new masked hint; attempt disable to receive affected agents; confirm and verify affected new tasks are blocked pending reassignment.

### Tests

- [x] T026 [US3] Write failing replace/disable/affected-agent/audit tests in `backend/tests/test_provider_credentials.py`

### Implementation

- [x] T027 [US3] Implement replace-key invalidation and confirmed disable behavior in `backend/app/services/provider_credentials.py`
- [x] T028 [US3] Add structured 409 affected-agent response handling in `backend/app/api/internal_router.py`
- [x] T029 [US3] Add replace, disable-confirmation, and recovery UI in `internal-app/app/onboarding/page.tsx` and provider components

**Checkpoint**: All three stories function independently and enforce the full Spec 0010 security contract.

---

## Phase 6: Verification and Handoff

- [x] T030 Run backend targeted and full tests; record results against FR-001 through FR-010 in `specs/0010-provider-key-management/checklists/acceptance.md`
- [x] T031 [P] Run Portal lint/build and Internal App lint/build
- [x] T032 Perform secret-leak scan over source/tests/logging paths without reading or printing local `.env` values
- [x] T033 Recheck migration upgrade/downgrade SQL offline, then request explicit user confirmation before applying migration 0010 to Supabase
- [ ] T034 Execute authenticated local smoke test from `quickstart.md`, including one real provider call supplied through Internal App
- [x] T035 Update feature task checkboxes and document remaining limitations, especially any D02 image-generation behavior outside Spec 0010

---

## Dependencies & Execution Order

- Phase 1 precedes Phase 2; Phase 2 blocks all user stories.
- US1 provides credentials and therefore precedes the end-to-end portion of US2.
- US2 can implement Portal/catalog behavior after Phase 2 while US1 UI is unfinished, but real-agent verification needs a valid US1 credential.
- US3 depends on US1 lifecycle and US2 active agent configs.
- Migration 0010 may be authored and tested offline at any time after T007, but must not be applied without explicit user confirmation.

## Implementation Strategy

1. Build and test the backend security boundary first.
2. Make the Internal App onboarding path real and MVP-safe.
3. Remove provider control from Portal and connect eligible models.
4. Route a real agent call with a per-client credential.
5. Verify disable/replace and all acceptance criteria.
6. Only after Spec 0010 is complete, proceed to the user's startup automation, Redis auto-start, test accounts/data, and business checklist.

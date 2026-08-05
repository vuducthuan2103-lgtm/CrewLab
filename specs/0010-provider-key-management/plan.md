# Implementation Plan: Per-client Provider & API Key Management

**Branch**: `feature/0010-provider-key-management` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Approved feature specification in `specs/0010-provider-key-management/spec.md`.

## Summary

Move provider ownership and API-key management into the Agency Admin Internal App while keeping model, tier, and budget selection in the client Portal. Credentials are encrypted at rest with a backend-only master key, returned only as masked metadata, and resolved per client by the existing LiteLLM abstraction. A server-owned model catalog derives the provider from the selected model and prevents the Portal from selecting models outside the client's one or two enabled providers.

## Technical Context

**Language/Version**: Python 3.12; TypeScript 5.5; Node.js/Next.js 14.2  
**Primary Dependencies**: FastAPI, SQLAlchemy 2 async, Alembic, LiteLLM, cryptography/Fernet, Next.js, React 18, Supabase Auth, shadcn/ui primitives  
**Storage**: PostgreSQL on Supabase; encrypted ciphertext in `client_provider_credentials`; existing `client_llm_configs` and `audit_log`  
**Testing**: pytest backend unit/API tests with mocked provider calls; Next.js lint/build; manual authenticated smoke test against local services  
**Target Platform**: Windows local development; Linux backend deployment; Vercel frontends  
**Project Type**: Monorepo web application with FastAPI backend and separate client/admin Next.js apps  
**Performance Goals**: Provider/model settings reads remain interactive; credential lookup adds one indexed query per LLM task; onboarding completes in under five minutes excluding external validation  
**Constraints**: Never expose plaintext credentials; one or two enabled validated providers per active client; six MVP agents only; Portal cannot submit provider; no fallback to agency-wide environment keys in normal mode  
**Scale/Scope**: Phase 1 multi-tenant foundation, three providers, six agents, two frontends, one admin provider workflow

## Constitution Check

*GATE: Pass before implementation; rechecked after design.*

- MVP boundaries: PASS. The design is limited to A01, B02, B03, D01, D02, and E01 and introduces none of ChromaDB, Hindsight, automatic publishing, analytics agents, or long-document RAG.
- FSM behavior: PASS. Provider configuration changes do not alter the approved content FSM.
- Per-client LLM configuration: PASS. Provider credentials and agent model settings are isolated by `client_id` and all LLM calls stay behind `call_llm()`/LiteLLM.
- Simplicity: PASS. One normalized credentials table, a small server-owned catalog, direct SQLAlchemy services, and no new provider SDKs.
- Migration safety: PASS FOR AUTHORING. Migration 0010 is additive and reversible. Per the constitution, applying it to Supabase requires explicit human confirmation.
- Branching: EXCEPTION NOTED. The current workspace contains a large pre-existing, mostly untracked implementation on `feature/0008-e01-hardening`; switching branches would risk mixing or hiding user work. Spec 0010 changes will remain uncommitted until the workspace is made safe for the required feature branch.
- Constitution mismatch: The constitution still says five agents and excludes A01, while the approved Spec 0010, AGENTS.md, and MVP Scope v3.5 require six agents including A01. The current approved sources govern this implementation; the stale constitution wording is recorded below and should be amended separately.

## Project Structure

### Documentation (this feature)

```text
specs/0010-provider-key-management/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- internal-provider-api.md
|   `-- portal-settings-api.md
`-- tasks.md
```

### Source Code (repository root)

```text
backend/
|-- alembic/versions/0010_client_provider_credentials.py
|-- app/api/internal_router.py
|-- app/api/portal_router.py
|-- app/core/auth.py
|-- app/core/credentials.py
|-- app/core/llm.py
|-- app/core/model_catalog.py
|-- app/models/provider_credentials.py
|-- app/services/provider_credentials.py
`-- tests/

portal/
|-- app/settings/page.tsx
|-- lib/api.ts
`-- lib/types.ts

internal-app/
|-- app/login/page.tsx
|-- app/onboarding/page.tsx
|-- components/ui/
`-- lib/
    |-- api.ts
    `-- supabase.ts
```

**Structure Decision**: Extend the existing backend and both existing Next.js apps. Provider secrets remain exclusively in the backend/database; neither frontend receives ciphertext or plaintext after submission.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Constitution text excludes A01 | MVP Scope v3.5 and approved Spec 0010 explicitly define six agents including A01 | Omitting A01 would contradict the active build target and leave the orchestrator without a valid model configuration |
| Work not started on the mandated 0010 branch | Existing workspace has extensive user changes on another branch and most application files are untracked | Switching now could conceal, overwrite, or accidentally combine user-owned work; branch cleanup must be coordinated separately |


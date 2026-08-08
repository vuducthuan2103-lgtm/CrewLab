# Implementation Plan: Portal Bootstrap Performance

**Branch**: `feature/0016-portal-bootstrap-performance` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Approved feature specification in `specs/0016-portal-bootstrap-performance/spec.md`.

## Summary

Replace the Portal's six-request login waterfall with one authenticated bootstrap response containing the viewer, client identity, content items, task logs, pillars, and current workflow-cycle summary. Keep asset requests, media assets, and full client settings behind explicit page loaders. Add a request correlation ID to every backend response and log entry, expose actionable retry states in the Portal, and add a database-aware readiness endpoint. The existing Supabase account-to-client trust model, JWT verification decision, database schema, and MVP FSM remain unchanged.

## Technical Context

**Language/Version**: Python 3.12; TypeScript 5.5; Node.js/Next.js 14.2  
**Primary Dependencies**: FastAPI, SQLAlchemy 2 async, PostgreSQL/Supabase, Supabase Auth, Next.js, React 18, existing shadcn-compatible UI primitives  
**Storage**: Existing PostgreSQL tables only; no migration or new persistent entity  
**Testing**: pytest API/integration tests; TypeScript compiler; Next.js lint/build; authenticated local smoke test  
**Target Platform**: Windows local development; Linux backend deployment; Vercel Portal  
**Project Type**: Monorepo web application with FastAPI backend and a separate client-facing Next.js Portal  
**Performance Goals**: 95% of normal sign-ins show client identity within 2 seconds and the initial work board within 3 seconds  
**Constraints**: One server-derived client scope; no browser-supplied client ID; no JWT signing migration; optional page data cannot block bootstrap; no FSM or publishing behavior change  
**Scale/Scope**: One Portal bootstrap route, two deferred page loaders, one readiness route, request correlation across Portal API traffic

## Constitution Check

*GATE: Pass before implementation; rechecked after Phase 1 design.*

- MVP boundaries: PASS. The design adds no agents, RAG, ChromaDB, Hindsight, automatic publishing, analytics, or full-vision features.
- FSM behavior: PASS. Bootstrap is read-only and existing approval/posting mutations are untouched.
- Tenant isolation: PASS. Every bootstrap and deferred query uses `auth.client_id`; the browser cannot select a tenant.
- Authentication decisions: PASS. Supabase `get_user()` token validation and trusted `app_metadata.client_id` remain as recorded in decisions 0008 and 0009.
- Database safety: PASS. No schema or migration change is required.
- Frontend standard: PASS. Existing shared Button and Lucide components are reused; no component library is added.
- Simplicity: PASS. One aggregation endpoint and explicit page loaders stay inside the existing backend/Portal architecture; no microservice or new cache is introduced.
- Branching: PASS. Work is isolated on `feature/0016-portal-bootstrap-performance`, based on the main commit that merged 0014.
- Constitution mismatch: NOT IMPACTING. The stale constitution wording excludes A01, while current AGENTS.md and MVP Scope define six agents. This read-path feature preserves the existing six-agent data and introduces no agent-scope decision.

## Project Structure

### Documentation (this feature)

```text
specs/0016-portal-bootstrap-performance/
|-- spec.md
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   `-- portal-bootstrap-api.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md
```

### Source Code (repository root)

```text
backend/
|-- app/api/portal_router.py
|-- app/api/schemas.py
|-- app/core/auth.py
|-- app/main.py
`-- tests/
    |-- test_portal_bootstrap.py
    `-- test_database_connection_errors.py

portal/
|-- app/assets/page.tsx
|-- app/settings/page.tsx
|-- components/assets/MediaLibraryGrid.tsx
|-- components/layout/PortalLayout.tsx
|-- lib/api.ts
|-- lib/store.tsx
`-- lib/types.ts

docs/decisions/
`-- 0012-portal-bootstrap-and-deferred-page-data.md
```

**Structure Decision**: Extend the existing Portal router and provider store. The backend returns a single tenant-scoped read model for the first screen; the Portal retains client-side view mapping and adds separate state for bootstrap, asset, and settings loads.

## Complexity Tracking

No constitution violations require a complexity exception.


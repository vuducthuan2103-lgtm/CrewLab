# Feature Specification: Local Test Readiness

**Feature Branch**: `feature/0011-local-test-readiness`  
**Created**: 2026-08-04  
**Status**: Approved by user request

## Goal

Let the two non-technical founders start and test CrewLab locally after a Windows restart without manually launching each service or guessing test data.

## User Stories

### US1 - Start the complete local stack

An operator runs one command and gets Portal, Internal App, backend API, Redis, Celery worker, and Celery Beat, with a clear pass/fail summary and log locations.

**Acceptance Criteria**:

1. The command is safe to run again and does not create duplicate Redis containers.
2. It starts or reuses Redis, Portal, Internal App, backend, worker, and Beat.
3. It handles an occupied backend port without killing an unrelated process.
4. It reports the final URLs and health checks in plain language.

### US2 - Redis starts with Docker

The `crewlab-redis` container uses Docker restart policy `unless-stopped` and is started when Docker Desktop becomes available.

### US3 - Use known test accounts and data

Agency Admin and client test users have documented credentials/roles, a deterministic MVP client dataset exists, and no real provider key is embedded in seed code or docs.

### US4 - Follow a business test checklist

The founders can test onboarding/provider security, Portal model selection, six-agent workflow, FSM/HITL, and tenant isolation in a fixed order with expected outcomes.

## Scope Guards

- Six MVP agents only: A01, B02, B03, D01, D02, E01.
- No ChromaDB, Hindsight, Meta publishing, F01, or analytics agents.
- Provider API keys are entered manually through Internal App and never added to seed files.
- Startup automation is local-development only and does not deploy production services.

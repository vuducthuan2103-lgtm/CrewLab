# Spec 0020 - Backend Environment Resolution

**Status:** Approved by founder on 2026-08-10

## Goal

Ensure the local backend loads `backend/.env` when it is started from either
the backend directory or the monorepo root, so Portal A01 requests can decrypt
the already validated client provider credential.

## In scope

- Resolve the backend env-file path from the backend package location.
- Classify a missing credential-encryption key as an LLM configuration error.
- Add regression coverage for both behaviors.

## Out of scope

- Changing provider keys, client configuration, database schema, or Portal UI.

## Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-0020-01 | Backend settings use `backend/.env` regardless of process working directory. |
| AC-0020-02 | A missing or mismatched encryption key returns `LLM_CONFIGURATION_ERROR`, not a generic task failure. |
| AC-0020-03 | Targeted regression tests pass. |

# Decision 0012 — Portal bootstrap and deferred page data

**Status:** Accepted  
**Date:** 2026-08-08  
**Scope:** MVP Phase 1 Portal read path

## Context

After sign-in, the Portal currently requests content, task logs, pillars, asset requests, media assets, and full settings together. Restaurant identity comes from settings, so repeated authentication and any unrelated slow/failing request make a correctly linked account appear to have no client.

## Decision

1. Add one authenticated `/api/v1/portal/bootstrap` read model for viewer/client identity and the work-board essentials.
2. Load asset requests/media assets only from the assets experience and load full configuration only from settings.
3. Keep tenant identity server-owned through validated Supabase `app_metadata.client_id`; never accept a browser-selected client ID.
4. Keep the token-validation design from decision 0009. Signing/JWKS migration is outside this change.
5. Generate and log a server request ID for every API response so user-facing failures carry a support reference.
6. Keep `/health` for liveness and add database-aware `/readyz` for readiness.

## Consequences

- Initial Portal authentication happens once instead of once per initial domain request.
- Optional storage/provider configuration work cannot delay or blank the work board.
- Page loaders need independent loading/error/retry state.
- Bootstrap duplicates no persistence model and needs no migration.
- Future first-screen fields must be justified as essential before joining the bootstrap contract.

## Rollback

Restore the Portal's individual first-load requests and remove the bootstrap/readiness routes and request-ID middleware. No stored data needs rollback.

## References

- `specs/0016-portal-bootstrap-performance/spec.md`
- `docs/decisions/0008-portal-real-supabase-auth.md`
- `docs/decisions/0009-backend-supabase-token-validation.md`


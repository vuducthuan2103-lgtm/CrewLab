# Research: Portal Bootstrap Performance

## Decision 1: Aggregate the first screen behind one backend route

**Decision**: Add `GET /api/v1/portal/bootstrap` returning trusted viewer/client context plus content items, task logs, pillars, and the latest workflow-cycle summary.

**Rationale**: The current provider starts six requests in parallel. Each request obtains a session token, performs backend authentication, and opens its own API/database path. The restaurant name is coupled to the heaviest settings response, so unrelated provider/model or asset failures make a correctly linked account appear unlinked. One bootstrap request performs authentication once and makes the initial screen an explicit contract.

**Alternatives considered**:

- Keep six requests and only change `Promise.allSettled`: rejected because it improves failure presentation but preserves repeated authentication and client-name coupling.
- Put all Portal data in bootstrap: rejected because signed asset URLs and provider/model configuration are page-specific and would recreate the oversized initial payload.
- Add Redis caching: rejected for this phase because the avoidable request/auth fan-out is the first-order issue and cache invalidation would add operational complexity.

## Decision 2: Preserve trusted Supabase association and token validation

**Decision**: Continue deriving `client_id` from validated Supabase `app_metadata`, never from query parameters or request headers. Add viewer email to `AuthContext` only as display context.

**Rationale**: The reported symptom is a loading-order problem, not evidence that the account-to-client relationship is wrong. Existing decisions 0008/0009 deliberately validate the bearer token with Supabase and use immutable app metadata. Changing token signing or adding a second tenant selector would expand security scope without solving the waterfall.

**Alternatives considered**:

- Link by email in every query: rejected because email is mutable and client identity already has a trusted UUID claim.
- Accept `X-Client-Id`: rejected because it would let the browser attempt cross-client access.
- Switch to local JWKS verification: deferred; that is a separate authentication architecture decision and is not necessary to remove five repeated validations from initial load.

## Decision 3: Explicit deferred loaders with independent state

**Decision**: Asset requests/media assets load when the assets experience mounts; full settings load when settings mounts. Bootstrap, assets, and settings each have independent loading/error/retry state.

**Rationale**: Page ownership prevents optional failures from blanking the work board and makes retries precise. It also ensures media signed-URL generation and provider/model configuration queries do not run for users who only use the board.

**Alternatives considered**:

- Background prefetch immediately after bootstrap: rejected for the first implementation because it still creates unnecessary traffic and can compete with first render.
- A general query-cache dependency: rejected because two explicit loaders are sufficient and avoid adding a state-management library.

## Decision 4: Correlate errors with a response header

**Decision**: Middleware generates a UUID request ID for every backend request, returns it as `X-Request-ID`, and writes it to structured completion/error logs. Portal API errors retain a user-safe message, status/error code, and support reference.

**Rationale**: A response header works for successful and failed responses without changing every response schema. The UI can show a short support reference, while logs retain the full UUID. No token, email, or request body is logged.

**Alternatives considered**:

- Put IDs only in exception bodies: rejected because application-level `success: false` responses and framework errors would diverge.
- Echo browser-provided IDs: rejected to avoid untrusted or malformed correlation values; the server owns the ID.

## Decision 5: Separate liveness from readiness

**Decision**: Keep `/health` as process liveness and add `/readyz` that performs a bounded `SELECT 1` against the configured database. Dependency failure returns HTTP 503 with `status: not_ready`.

**Rationale**: A running FastAPI process cannot serve Portal data if PostgreSQL is unavailable. Separate endpoints let process supervisors and deployment gates make the correct decision.

**Alternatives considered**:

- Change `/health` to query the database: rejected because liveness probes should not restart a healthy process solely because a dependency is temporarily unavailable.


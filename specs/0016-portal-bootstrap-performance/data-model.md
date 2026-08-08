# Data Model: Portal Bootstrap Performance

No PostgreSQL schema change is required. This feature defines transient API/view models over existing tenant-scoped rows.

## PortalBootstrap

- `viewer`
  - `user_id`: authenticated Supabase user UUID
  - `email`: authenticated Supabase email, nullable only for legacy/test auth contexts
  - `role`: business role from validated app metadata
- `client`
  - `id`: trusted client UUID from auth context
  - `brand_name`: restaurant/brand display name from `clients`
- `work_board`
  - `content_items`: existing `ContentItemOut[]`
  - `task_logs`: existing `TaskLogOut[]`, newest 50
  - `pillars`: existing `PillarOut[]`
  - `schedule`
    - `cycle_id`: latest workflow-cycle UUID or null
    - `phase`: latest workflow-cycle phase or null

### Invariants

- The client must exist and be active.
- Every collection is filtered by the same `auth.client_id`.
- Empty collections are valid and must not be represented as an error.
- No credential, provider secret, storage path, or other client's identifier appears in the response.

## PortalLoadError

- `area`: `bootstrap | assets | settings`
- `message`: user-safe Vietnamese message
- `support_reference`: server-generated request UUID from `X-Request-ID`, nullable only when the request never reached the backend
- `retryable`: whether an idempotent reload can be offered
- `status`: HTTP status when available
- `error_code`: server application error code when available

This model is client-side state and is not persisted.

## DeferredLoadState

- `status`: `idle | loading | ready | error`
- `error`: `PortalLoadError | null`
- `loaded_at`: optional in-memory timestamp used only to avoid duplicate mount requests

Asset requests and media assets share one deferred load because they render in the same assets experience. Full brand/model settings use a separate deferred load.

## ReadinessResult

- `status`: `ready | not_ready`
- `dependencies.database`: `ready | unavailable`

This is runtime diagnostic output and is not persisted.


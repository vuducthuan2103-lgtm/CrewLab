# Contract: Portal Bootstrap and Diagnostics API

All Portal routes require the existing Supabase bearer token. The backend derives `client_id` from the validated token; no client selector is accepted.

Every response includes:

```http
X-Request-ID: <server-generated UUID>
```

## `GET /api/v1/portal/bootstrap`

Successful response (`200`):

```json
{
  "success": true,
  "data": {
    "viewer": {
      "user_id": "uuid",
      "email": "owner@example.com",
      "role": "client_admin"
    },
    "client": {
      "id": "uuid",
      "brand_name": "Bardinh Coffee"
    },
    "work_board": {
      "content_items": [],
      "task_logs": [],
      "pillars": [],
      "schedule": {
        "cycle_id": null,
        "phase": null
      }
    }
  }
}
```

Failure behavior:

- `401`: session invalid or client claim missing.
- `403`: claimed client does not exist or is inactive.
- `503`: database dependency unavailable.
- The response never substitutes empty arrays for a failed essential bootstrap query.

## Existing deferred Portal routes

The following contracts remain unchanged but are no longer called during bootstrap:

- `GET /api/v1/portal/assets`
- `GET /api/v1/portal/settings`

Their failures affect only their owning page state.

## `GET /health`

Process liveness, unchanged:

```json
{"status": "ok"}
```

## `GET /readyz`

Ready (`200`):

```json
{"status": "ready", "dependencies": {"database": "ready"}}
```

Not ready (`503`):

```json
{"status": "not_ready", "dependencies": {"database": "unavailable"}}
```


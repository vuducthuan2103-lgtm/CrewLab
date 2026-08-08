# Internal Provider API Contract

Base path: `/api/v1/internal`. All endpoints require a Supabase bearer token with `app_metadata.role = agency_admin`.

## List client providers

`GET /clients/{client_id}/providers`

Returns supported providers, enabled/validation state, masked hint, affected agents, and server-approved model summaries. Never returns plaintext or ciphertext.

## Save or replace credential

`PUT /clients/{client_id}/providers/{provider}`

Request:

```json
{
  "api_key": "provider-secret",
  "idempotency_key": "uuid"
}
```

The backend first makes a minimal validation call. Only a valid key is encrypted and saved; an invalid replacement leaves the working credential unchanged. The response includes only masked metadata. A newly configured provider starts disabled, while a successfully replaced credential preserves its existing enabled state.

## Test credential

`POST /clients/{client_id}/providers/{provider}/test`

Makes a minimal provider request. Returns `validation_status`, `last_tested_at`, and a sanitized error if invalid. It never echoes the key or provider response body.

## Enable or disable provider

`PATCH /clients/{client_id}/providers/{provider}`

Request:

```json
{
  "is_enabled": false,
  "confirm_affected_agents": false,
  "idempotency_key": "uuid"
}
```

Rules:

- Enabling requires `validation_status=valid`.
- Enabling a third provider returns 409 and changes nothing.
- Disabling an in-use provider without confirmation returns 409 with `affected_agents`.
- Confirmed disable marks affected agent configs inactive.
- An active client may not be left with zero valid enabled providers.

## Client activation

`PATCH /clients/{client_id}/activation`

```json
{
  "is_active": true,
  "idempotency_key": "uuid"
}
```

Activation requires one or two enabled+valid providers. Otherwise return 409 with an actionable message.

## Error shape

```json
{
  "success": false,
  "error": {
    "error_code": "PROVIDER_IN_USE",
    "message": "Provider is selected by active agents",
    "details": { "affected_agents": ["A01", "D01"] }
  }
}
```

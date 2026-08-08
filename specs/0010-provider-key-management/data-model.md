# Data Model: Per-client Provider & API Key Management

## `client_provider_credentials` (new)

One row per client/provider credential.

| Column | Type | Rules | Purpose |
|--------|------|-------|---------|
| `id` | UUID | PK | Internal identity |
| `client_id` | UUID | FK `clients.id` ON DELETE CASCADE, NOT NULL | Tenant boundary |
| `provider` | varchar | NOT NULL, check: `openai`, `anthropic`, `google` | Provider identity |
| `encrypted_api_key` | text | NOT NULL | Fernet ciphertext only |
| `key_hint` | varchar(8) | NOT NULL | Masked display suffix, never enough to call provider |
| `is_enabled` | boolean | NOT NULL default false | Eligible for client use after validation |
| `validation_status` | varchar | NOT NULL, check: `untested`, `valid`, `invalid` | Credential health |
| `last_tested_at` | timestamptz | nullable | Last external validation time |
| `last_test_error` | varchar(200) | nullable | Sanitized category/message without secret/provider response body |
| `created_by` | UUID | NOT NULL | Admin audit identity |
| `updated_by` | UUID | NOT NULL | Last admin actor |
| `created_at` | timestamptz | NOT NULL | Creation time |
| `updated_at` | timestamptz | NOT NULL | Last change time |

Constraints and indexes:

- Unique `(client_id, provider)`.
- Index `client_id` for tenant lookup and cascade performance.
- Partial index `(client_id)` where `is_enabled = true` for enabled-provider/model-catalog reads.
- Cross-row maximum-two rule is enforced transactionally in the service; active-client activation rechecks one-to-two enabled+valid rows.

RLS:

- Enable and force RLS.
- No `anon` or ordinary `authenticated` client policy.
- Agency admin access happens through backend authorization/service credentials, not direct browser table access.

## `client_llm_configs` (existing, behavior tightened)

No new column is required. `provider` becomes server-derived from the selected catalog model rather than client input.

Rules:

- Unique client+agent should be guaranteed by migration if missing.
- `agent_code` restricted in application code to A01, B02, B03, D01, D02, E01.
- `provider` must match the server catalog for `model`.
- The provider must have an enabled+valid credential for the same `client_id`.
- `is_active=false` blocks the agent when its provider was disabled; no environment-key fallback.

## `audit_log` (existing)

Provider events use existing rows:

- `action`: `provider_credential_created`, `provider_credential_replaced`, `provider_tested`, `provider_enabled`, `provider_disabled`, `client_activated`.
- `details`: provider, masked hint, validation result, affected agent codes, and non-secret reason fields only.
- Forbidden fields: plaintext key, ciphertext, authorization headers, raw provider response body.

## State transitions

```text
missing --save + validation succeeds--> valid/disabled
missing --validation fails--> missing
valid --enable--> valid/enabled
valid/enabled --valid replacement--> valid/enabled
valid/enabled --invalid replacement--> existing valid/enabled row unchanged
valid/enabled --disable confirmed--> valid/disabled
```

Client activation:

```text
inactive client + 1..2 valid/enabled providers -> active client
inactive client + 0 or >2 valid/enabled providers -> blocked
```

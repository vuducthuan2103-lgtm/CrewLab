# Research: Per-client Provider & API Key Management

## Decision 1: Encrypt credentials in the application before database storage

**Decision**: Use Fernet authenticated encryption from `cryptography`, with a backend-only `CREWLAB_CREDENTIAL_ENCRYPTION_KEY`. Store ciphertext and a non-secret last-four-character hint; never store or return plaintext.

**Rationale**: Supabase/Postgres must not contain directly usable provider keys. Fernet supplies confidentiality and tamper detection, is operationally simple for Phase 1, and avoids adding a separate vault service before deployment infrastructure is ready.

**Alternatives considered**:

- Plaintext database column: rejected because a database read would expose live credentials.
- Environment variables: rejected because they cannot isolate credentials by client and are the scope being replaced.
- External vault/KMS: strongest long-term option, but adds deployment and operational dependencies beyond this Phase 1 scope. The service boundary allows it to replace Fernet later.

## Decision 2: Keep the model catalog on the server

**Decision**: Define a backend-owned catalog mapping model ID to provider, tier, capabilities, and allowed MVP agents. Portal responses contain only the eligible subset for the authenticated client.

**Rationale**: The browser must not decide the provider. Server derivation closes the current `inferProvider()` trust gap and gives one source of truth for validation and UI options.

**Catalog policy**:

- Only stable or explicitly approved generally available models are exposed.
- Provider model-list APIs may be used for credential validation, but they do not automatically expand CrewLab's approved catalog.
- The catalog is code/config, so model lifecycle updates are reviewed and tested.

**Current official references checked on 2026-08-04**:

- OpenAI exposes `/v1/models`; current documented families include GPT-5-class text/reasoning models and `gpt-image-1`/`gpt-image-1-mini` for images.
- Anthropic exposes `/v1/models`; current documented model IDs include Claude Sonnet, Opus/Fable, and Haiku families.
- Google exposes a models list endpoint and distinguishes stable, preview, latest, and experimental names; CrewLab will prefer stable IDs.

## Decision 3: Validate a credential before it can count toward activation

**Decision**: Saving/replacing a key sets status to `untested`. A dedicated admin test endpoint makes a minimal provider request using the submitted client's key and records only `valid` or `invalid` plus a sanitized error category. Only enabled+valid providers count toward activation.

**Rationale**: Format checks alone cannot detect revoked or account-restricted keys. Separating save from test prevents a slow external call from being hidden inside a normal update and gives the admin a clear recovery action.

**Alternatives considered**:

- Validate key prefix only: rejected as unreliable and provider-specific.
- Store first and treat as valid: rejected because onboarding could activate a client that cannot run agents.

## Decision 4: Use admin JWT metadata and explicit backend authorization

**Decision**: Read the business role from Supabase `app_metadata.role`. Portal dependencies require a `client_id`; Internal App endpoints require `agency_admin` and may target a client by URL ID.

**Rationale**: Supabase's top-level JWT `role` is normally the database role (`authenticated`), not CrewLab's business role. Explicit dependencies prevent a client user from reaching provider endpoints even if the UI is bypassed.

## Decision 5: Disable-in-use is a two-step action

**Decision**: A disable request without confirmation returns HTTP 409 with affected MVP agent codes. A confirmed request disables the provider and marks those agent configurations inactive. New work fails clearly until each affected agent receives an eligible replacement model.

**Rationale**: Silently falling back to another key/model violates isolation and makes cost/quality unpredictable. In-flight work uses the credential/config already resolved at task start; subsequent calls re-resolve current configuration.

## Decision 6: Additive migration and admin-only RLS

**Decision**: Migration 0010 only adds `client_provider_credentials`, indexes, constraints, and RLS. Authenticated client users receive no policy on the table. The backend's admin endpoint remains the only product access path.

**Rationale**: The secret table should be invisible to Portal users even if application authorization regresses. Foreign-key and lookup indexes support client/provider checks and RLS performance.


# Feature Specification: Per-client Provider & API Key Management

**Feature Branch**: `feature/0010-provider-key-management`  
**Created**: 2026-08-03  
**Status**: Approved scope — ready for planning  
**Input**: User description: "Đưa quản lý provider/API key theo từng client lên Phase 1. Agency Admin chọn tối đa 2 provider khi onboarding và quản lý key trong Internal App; Portal chỉ cho client đổi model/tier."

## User Scenarios & Testing

### User Story 1 - Set up a client's providers during onboarding (Priority: P1)

An Agency Admin selects one or two supported providers for a new client, enters or updates the corresponding credentials, and confirms the configuration before activating the client.

**Why this priority**: A client cannot safely use models until the agency has selected and configured the permitted providers.

**Independent Test**: An admin can complete onboarding for a client with one provider, then with two providers, and cannot activate a client with zero or more than two enabled providers.

**Acceptance Scenarios**:

1. **Given** a new client, **When** the Agency Admin configures one valid provider and its credential, **Then** the client can be activated.
2. **Given** a new client, **When** the Agency Admin attempts to activate it without a configured provider, **Then** activation is blocked with an actionable explanation.
3. **Given** a client already has two enabled providers, **When** the Agency Admin tries to enable a third provider, **Then** the system rejects the change without altering the existing configuration.

---

### User Story 2 - Client chooses only eligible models (Priority: P1)

A client selects a model and tier for each of the six MVP agents in the Portal, without being able to change providers or access credentials.

**Why this priority**: It preserves client control over quality and cost while keeping provider and secret management with the agency.

**Independent Test**: With two providers enabled for a client, the Portal presents only models from those providers and allows a valid model/tier change for an MVP agent.

**Acceptance Scenarios**:

1. **Given** a client has enabled providers, **When** the client opens Model & Ngân sách, **Then** it sees only eligible models and their tiers for A01, B02, B03, D01, D02 and E01.
2. **Given** the Portal settings page, **When** the client uses it, **Then** no control exists to add, remove or switch a provider, and no API key is exposed.
3. **Given** a client changes an eligible model/tier, **When** its next task begins, **Then** that task uses the newly selected model without affecting another client.

---

### User Story 3 - Safely update a configured provider (Priority: P2)

An Agency Admin replaces a client credential or disables a provider while being warned about the agents that would be affected.

**Why this priority**: Credentials can expire or providers may need to be changed without exposing secrets or silently breaking production work.

**Independent Test**: An admin updates a credential and sees only its masked form afterward; disabling an in-use provider requires an explicit confirmation and updates the eligible model list.

**Acceptance Scenarios**:

1. **Given** a configured provider, **When** the Agency Admin replaces its credential, **Then** the full credential is never displayed again and future tasks use the replacement.
2. **Given** one or more agents use a provider, **When** the Agency Admin requests to disable it, **Then** the system lists affected agents and requires confirmation before making the change.
3. **Given** the provider is disabled after confirmation, **When** the client returns to Portal settings, **Then** its models are no longer selectable and a valid replacement configuration is required before affected new tasks run.

### Edge Cases

- A credential is missing, invalid or expires after onboarding: new tasks using that provider must not start silently and the Agency Admin receives an actionable failure.
- An admin submits a model belonging to a provider that is not enabled for the client: the request is rejected without changing the current agent configuration.
- A client has an in-flight task while an admin changes a provider: the in-flight task retains its captured configuration; the change applies to the next task.
- An unauthorized user tries to access an agency-only provider or credential action: no configuration or secret is returned or changed.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST allow only an Agency Admin to create, view masked status for, replace, enable or disable a provider credential for a specific client.
- **FR-002**: The system MUST require every active client to have at least one and no more than two enabled providers.
- **FR-003**: The onboarding flow MUST require the Agency Admin to configure the client's providers before client activation.
- **FR-004**: The system MUST keep full API credentials secret at all times; it must never expose them to Portal users or include them in logs, responses or audit details.
- **FR-005**: The Portal MUST allow the client to configure only model, tier and budget for the six MVP agents, not provider selection or API credentials.
- **FR-006**: The Portal MUST show only models compatible with providers enabled for the authenticated client.
- **FR-007**: The system MUST reject an agent configuration that selects a model outside the client's enabled providers.
- **FR-008**: Before disabling a provider currently selected by one or more agents, the system MUST identify affected agents and require explicit Agency Admin confirmation.
- **FR-009**: A provider, credential or model configuration change MUST apply to subsequent tasks only and MUST remain isolated to that client.
- **FR-010**: The system MUST record an auditable provider-configuration event without recording the full credential.

### Key Entities

- **Client provider configuration**: A client's enabled provider, masked credential status, activation state and history of administrative changes.
- **Agent model configuration**: A selected model, tier and budget for one of the six MVP agents, limited to the client's enabled providers.
- **Provider configuration event**: A non-secret audit record identifying the admin action, client, provider, affected agents and time.

### Provider Catalog Update — 2026-08-05

- DeepSeek is a supported Phase 1 provider alongside OpenAI, Anthropic and Google.
- The approved DeepSeek text models are `deepseek-v4-flash` (fast) and `deepseek-v4-pro` (power).
- DeepSeek models are eligible for the five text agents only (A01, B02, B03, D01 and E01). D02 remains limited to approved image-capable providers.
- The existing maximum of two enabled providers per client remains unchanged.

## Success Criteria

### Measurable Outcomes

- **SC-001**: An Agency Admin can activate a client with one or two configured providers in under five minutes, excluding external provider verification time.
- **SC-002**: In acceptance testing, 100% of Portal model lists contain no model from an unenabled provider.
- **SC-003**: In acceptance testing, 100% of credential read responses and audit records contain only a masked credential representation or no credential value.
- **SC-004**: In acceptance testing, a valid model/tier change is used by the next task for that client and never changes another client's configuration.
- **SC-005**: In acceptance testing, 100% of attempts to enable a third provider or disable an in-use provider without confirmation are blocked.

## Assumptions

- The supported-provider catalog continues to include the providers already supported by CrewLab's LLM configuration.
- An Agency Admin is responsible for obtaining and entering each client's provider credentials.
- Existing authentication and client isolation rules remain in force.
- This scope does not add non-MVP agents, automatic publishing, analytics agents, ChromaDB or Hindsight.

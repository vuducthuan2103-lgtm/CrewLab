# Feature Specification: Portal Bootstrap Performance

**Feature Branch**: `feature/0016-portal-bootstrap-performance`

**Created**: 2026-08-08

**Status**: Draft

**Input**: Improve the Portal loading flow so a signed-in client immediately sees the correct restaurant, essential work data loads reliably, optional data does not delay the screen, and failures are actionable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the correct restaurant immediately after sign-in (Priority: P1)

As a client Portal user, I see my email and my restaurant name as soon as the Portal opens, so I know I am viewing the right account without waiting for unrelated data.

**Why this priority**: The current experience makes a correctly linked account appear unlinked and blocks trust in the Portal.

**Independent Test**: Sign in with a linked client account and confirm that the Portal identifies the restaurant even when optional sections have no data or fail to load.

**Acceptance Scenarios**:

1. **Given** a signed-in user linked to one active client, **When** the Portal opens, **Then** the sidebar shows that client's restaurant name and the signed-in email without waiting for the image library or Settings page data.
2. **Given** a signed-in user, **When** the restaurant has no content or assets, **Then** the Portal still identifies the restaurant and shows valid empty states.
3. **Given** a signed-in user whose client link is missing or inactive, **When** the Portal opens, **Then** the user receives a clear access message and no other client's data is shown.

---

### User Story 2 - Open the work board without unnecessary waiting (Priority: P1)

As a client Portal user, I can open the work board quickly and see the information needed for today's work, while data needed only on other pages loads when I visit those pages.

**Why this priority**: The Portal currently requests every domain immediately, so one slow or failing domain delays the whole first screen.

**Independent Test**: Sign in with existing workflow data, measure the first work-board view, then navigate to the asset library and Settings separately.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** the work board opens, **Then** the first view contains the current restaurant context, work logs, content work, pillars, and current cycle state.
2. **Given** a signed-in user, **When** the user has not opened the image library or Settings, **Then** those page-specific data sets do not delay the first work-board view.
3. **Given** a signed-in user, **When** the user opens a page that needs additional data, **Then** that page loads its own data and displays a page-specific loading state.

---

### User Story 3 - Understand and recover from a loading failure (Priority: P2)

As a client Portal user, I can see which part failed and retry it, so I do not receive a vague warning that hides the cause.

**Why this priority**: The current banner groups six failures into one message, making support and recovery unnecessarily difficult.

**Independent Test**: Simulate an unavailable dependency or failed data request and verify that the user receives a clear affected area, safe retry action, and support reference.

**Acceptance Scenarios**:

1. **Given** the essential first Portal load fails, **When** the Portal opens, **Then** the user sees a clear error state instead of an apparently empty work board.
2. **Given** a non-essential page data request fails, **When** the user opens that page, **Then** the rest of the Portal remains usable and the failed page explains how to retry.
3. **Given** any failed Portal data request, **When** the user reports the issue, **Then** the displayed support reference allows the team to find the matching server event without exposing sensitive data.

## Edge Cases

- An expired or missing session redirects the user to sign in again rather than showing stale client context.
- A slow optional page request never overwrites the restaurant context or the first work-board data.
- Retrying a failed request does not duplicate actions, workflow records, or notifications.
- A database dependency outage is distinguishable from a healthy server process with unavailable data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST derive the signed-in user's client context from the existing trusted account-to-client relationship and must never accept a client identity chosen by the browser.
- **FR-002**: The Portal MUST show the signed-in email and restaurant name as part of the initial signed-in experience.
- **FR-003**: The initial work-board load MUST provide the restaurant context and only the information required to render the work board.
- **FR-004**: The Portal MUST load image-library and full configuration data only when a user visits the feature that needs it.
- **FR-005**: A failure in non-essential page data MUST not prevent the user from using already loaded Portal features.
- **FR-006**: Every Portal loading failure MUST identify the affected area, provide a retry action where safe, and include a non-sensitive support reference.
- **FR-007**: The system MUST provide a readiness result that distinguishes an available application process from an unavailable required data dependency.
- **FR-008**: The system MUST preserve client isolation for every initial and deferred Portal data request.
- **FR-009**: The system MUST preserve the current MVP workflows, finite-state-machine behavior, and manual posting model.

### Key Entities *(include if feature involves data)*

- **Portal context**: The trusted signed-in identity and the restaurant it is authorized to view.
- **Initial work-board view**: The minimum restaurant-specific information required to render the first Portal screen.
- **Deferred page data**: Information used only by a specific Portal feature after the user opens it.
- **Portal load failure**: A user-safe description of an unavailable Portal area, retry availability, and a support reference.
- **Readiness result**: A service status that reports whether required dependencies for Portal data are available.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the normal local and staging environments, 95% of successful sign-ins show the signed-in email and restaurant name within 2 seconds of entering the Portal.
- **SC-002**: In the normal local and staging environments, 95% of successful first work-board views show essential work data within 3 seconds of entering the Portal.
- **SC-003**: A failure in image-library or full configuration data leaves the work board usable in 100% of tested cases.
- **SC-004**: Support can identify the corresponding server event for 100% of tested Portal loading failures using the displayed support reference.
- **SC-005**: Automated authorization tests confirm that a Portal user cannot receive another client's context or work-board data.

## Assumptions

- Existing Supabase email/password authentication and the trusted client association remain in use.
- The feature does not alter provider-key management, content approval rules, the MVP agent scope, or the manual posting workflow.
- The first Portal screen is the work board shown in the reported issue; image library and Settings remain separate user journeys.
- The existing Portal design system and Vietnamese user-facing language remain in use.

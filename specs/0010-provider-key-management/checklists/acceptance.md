# Spec 0010 Acceptance Report

**Verified**: 2026-08-04  
**Automated result**: 80 backend tests passed; Portal and Internal App production builds passed.

## Functional requirements

- [x] FR-001 — Agency Admin role gates all provider credential actions; reads return masked status only.
- [x] FR-002 — Activation requires one or two enabled, valid providers; a third provider is rejected.
- [x] FR-003 — Internal onboarding configures providers before activation.
- [x] FR-004 — Credentials are encrypted at rest and omitted from Portal responses, logs, and audit details.
- [x] FR-005 — Portal updates model, tier, and budget only for A01, B02, B03, D01, D02, and E01.
- [x] FR-006 — Portal model eligibility is generated from the client's enabled providers.
- [x] FR-007 — A model outside the enabled provider set is rejected server-side.
- [x] FR-008 — Disabling an in-use provider returns affected agents and requires explicit confirmation.
- [x] FR-009 — Provider/model configuration is scoped by client and resolved at the start of a new task.
- [x] FR-010 — Provider changes write audit events without full credentials.

## Manual acceptance still required

- [ ] Enter one real provider API key in Internal App and complete one live six-agent workflow.
- [ ] Confirm the provider dashboard shows the real usage/cost expected from that key.
- [ ] Confirm no full key appears in either UI or `.crewlab/logs` after the live run.

## Known limitation

D02's LLM-based asset tagging/selection runs with the configured provider, but the current MVP path does not generate an image file through an image API. With `allow_ai_images=false`, upload a real brand asset before running the workflow; otherwise the item can correctly enter `waiting_asset`. Implementing paid image generation should be a separate approved spec.

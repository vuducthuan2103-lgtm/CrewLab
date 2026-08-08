# Acceptance Verification: Portal Bootstrap Performance

**Date:** 2026-08-08  
**Branch:** `feature/0016-portal-bootstrap-performance`

## Functional requirements

- [x] **FR-001 — Trusted client context:** Bootstrap accepts no client selector and all queries use validated `auth.client_id`. Cross-client test passes.
- [x] **FR-002 — Email and restaurant in initial experience:** Session email is set before the API await; bootstrap returns viewer and active client in one response. Authenticated visual smoke remains an environment follow-up because the isolated browser had no signed-in test session.
- [x] **FR-003 — Minimal work-board bootstrap:** One response contains client identity, current-cycle content/pillars, newest 50 task logs, and cycle phase.
- [x] **FR-004 — Deferred page data:** Initial store path calls only `/bootstrap`; assets and settings have mount-owned loaders.
- [x] **FR-005 — Optional failure isolation:** Asset/settings status and error state are independent of bootstrap state and the work board.
- [x] **FR-006 — Actionable failures:** Bootstrap/assets/settings views name the area, expose safe retry, and show the short `X-Request-ID` support reference.
- [x] **FR-007 — Dependency readiness:** `/health` stays liveness-only and `/readyz` returns 200/503 from a bounded database check.
- [x] **FR-008 — Tenant isolation:** Backend cross-client tests pass; frontend generation guards discard stale responses after an account change.
- [x] **FR-009 — Preserve MVP workflow:** No mutation contract or FSM transition was changed; the full 102-test backend suite passes.

## Success criteria

- [ ] **SC-001 — 95% identity within 2 seconds:** Implementation removes five initial API/auth paths and immediate email rendering is verified by inspection. Statistical local/staging measurement requires a signed-in test account and repeated browser samples.
- [ ] **SC-002 — 95% board within 3 seconds:** Bootstrap and current-cycle payload are implemented. Statistical local/staging measurement requires a signed-in test account and repeated browser samples.
- [x] **SC-003 — Optional failures keep board usable:** Independent state ownership and render paths verified; optional APIs are absent from initial store loading.
- [x] **SC-004 — Failures traceable:** Middleware uses one UUID for response header and matching completion/error log; targeted tests validate header presence and UI propagates it.
- [x] **SC-005 — Cross-client protection:** Automated bootstrap test proves client, content, task log, pillar, and historical-cycle filtering.

## Automated evidence

- Backend compile and full suite: `102 passed`.
- Targeted bootstrap/readiness suite: `9 passed`.
- Portal lint: pass with pre-existing image/font warnings only.
- TypeScript: `tsc --noEmit --incremental false` pass.
- Next.js production build: pass with test Supabase/API environment values; first work-board route JavaScript is 188 kB.
- React performance audit: 0 critical issues; remaining 11 warnings concern existing static imports/image components outside the login waterfall.
- Local unauthenticated smoke: protected `/` redirects to `/login`; authenticated timing could not be sampled without transmitting a test password.


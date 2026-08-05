# Decision 0010 - Remove manual workflow controls from Phase 1

**Date:** 2026-08-05  
**Status:** Accepted

## Decision

Phase 1 does not expose any of these product actions:

- starting a test workflow from the Internal App client list;
- manually retrying or reopening a content item.

Phase 1 does expose a conversational workspace for A01 in the Portal. Clients
can talk with A01, clarify a request, and assign an actionable content task.
The previous `Tạo Brief Mới` modal and `/api/v1/portal/briefs` endpoint are
replaced by this multi-turn chat flow.

Direct Assign T20 remains deferred. In CrewLab terminology, Direct Assign
means bypassing A01 and assigning work directly to B02, B03, D01, D02, or E01.
Assigning work to A01 is the normal orchestrated workflow, not Direct Assign.

The Phase 1 A01 wake-reason contract is reduced to `scheduled`,
`task_assigned`, and `retry`. Automatic E01 quality retry and automatic Celery
infrastructure retry are not manual controls and remain in scope.

## Consequences

- Weekly cycles still start through the approved scheduler path. When A01
  accepts an on-demand task and no active cycle exists, the backend may create
  the current cycle internally so the item has valid workflow ownership. This
  is not an operator-facing cycle-start or workflow-test control.
- A01 chat history is stored in the existing tenant-scoped `agent_memory`
  table; no database migration is introduced.
- Accepted tasks are routed by A01 to D01 with `task_assigned`. The Portal does
  not choose or invoke a child agent directly.
- Failed/rejected items remain visible for diagnosis but have no manual
  retry/reopen button in Phase 1.
- Internal debug screens are read-only.
- Test operations must validate the scheduled workflow instead of relying on a
  test-only product button.
- Direct Assign to an individual child agent can return only through a future
  approved spec/decision.

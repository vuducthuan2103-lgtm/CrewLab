# 0014 - Remove Manual Workflow Actions and Harden Portal

**Feature Branch**: `feature/0014-remove-manual-workflow-actions`  
**Created**: 2026-08-05  
**Status**: Approved by direct user request

## Goal

Keep the Phase 1 product limited to the approved six-agent workflow and its
Portal gates. Remove test-only and manual recovery controls, replace the old
one-shot brief form with a conversational A01 workspace, then verify the
authenticated Portal flows do not surface unhandled runtime errors.

## Scope

- Remove `Chạy workflow test` from Internal App and delete its backend/API path.
- Remove manual `Chạy lại`/reopen controls for a content item. Internal debug
  views remain read-only.
- Remove `manual` from the MVP `wake_reason` contract. Scheduled dispatch,
  task-assigned dispatch, and automatic infrastructure retry remain supported.
- Replace Portal `Tạo Brief Mới` and its modal form with a ChatGPT-like A01
  conversation screen. A client can discuss work, clarify requirements, and
  assign an actionable content task to A01.
- Persist A01 conversation history in the existing Postgres `agent_memory`
  table. Do not add or alter database schema for this feature.
- When A01 accepts an actionable task, create a planned content item in the
  client's active cycle, creating the current on-demand cycle internally when
  none exists, then dispatch that item through A01 to D01.
- Keep Direct Assign T20 out of Phase 1. In CrewLab terminology, Direct Assign
  means bypassing A01 and assigning work directly to an individual agent.
- Update current PRD, MVP Scope, roadmap, specs, and test instructions so they
  no longer tell operators to use the removed controls.
- Exercise every Portal route and critical in-scope interaction, fixing all
  reproducible errors found during this audit.

## Out of Scope

- Changing the automatic E01 quality retry loop.
- Adding Direct Assign to B02/B03/D01/D02/E01, campaign/event branching, F01
  publishing, analytics, Telegram, ChromaDB, or Hindsight.
- Exposing a manual cycle-start or workflow-test mechanism to operators.

## Acceptance Criteria

| ID | Criterion | Evidence |
|---|---|---|
| AC-0014-01 | Internal App contains no workflow-test button/client API call, and the backend no longer exposes `/api/v1/internal/clients/{client_id}/test-workflow/start`. | Source search + backend route test |
| AC-0014-02 | Internal App contains no manual retry/reopen action for a content item; the debug view is read-only. | Source search + Internal App build |
| AC-0014-03 | Portal replaces `Tạo Brief Mới` and its modal with a dedicated A01 chat screen reachable from the primary navigation and dashboard. | Browser audit + Portal build |
| AC-0014-04 | A01 chat loads persisted tenant-scoped history, supports multi-turn conversation, and displays loading, empty, success, and controlled error states without a runtime overlay. | API tests + browser audit |
| AC-0014-05 | An actionable message is accepted by A01, creates a planned content item even when no active cycle exists, and dispatches through A01 to D01; it never directly dispatches to an agent from the Portal endpoint. | Backend integration tests |
| AC-0014-06 | Direct Assign remains deferred and is defined as bypassing A01 to assign an individual agent. | Spec/PRD review |
| AC-0014-07 | MVP documents define only `scheduled`, `task_assigned`, and `retry` wake reasons; automatic E01/infra retry behavior is unchanged. | Document review + backend tests |
| AC-0014-08 | All Portal routes load without a Next.js runtime-error overlay; authenticated in-scope actions show controlled success/error states. | Browser audit |
| AC-0014-09 | Portal and Internal App lint/build pass and the backend automated test suite passes. | Command output |

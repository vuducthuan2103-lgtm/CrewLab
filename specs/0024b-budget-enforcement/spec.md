# Feature Specification: Budget Tracking & Enforcement

**Feature Branch**: `feature/0024-full-llm-observability`
**Created**: 2026-08-15
**Status**: Approved — blocked by 0024a
**Parent**: `specs/0024-full-llm-observability/spec.md`
**Scope**: Original FR-023 → FR-032

## User Scenarios & Testing

### User Story 1 - Consistent client and agent budget status (Priority: P1)

CrewLab tính month-to-date customer charge, remaining amount, percentage và state ở cả cấp client tổng và agent từ canonical ledger.

**Independent Test**: Seed ledger ở ba ngưỡng dưới 80%, 80–99.99% và từ 100%; xác nhận cùng một kết quả ở mọi consumer.

### User Story 2 - Block overspend before provider call (Priority: P1)

Task billable mới bị từ chối trước external call khi agent cap hoặc client-total cap đã hết.

**Independent Test**: Đưa một cap lên 100%, dispatch task và xác nhận zero provider call mới.

### User Story 3 - Prevent concurrent stale-budget admission (Priority: P1)

Nhiều Celery task cùng lúc không được cùng vượt qua một budget precheck cũ.

**Independent Test**: Dispatch concurrent tasks có combined estimated charge lớn hơn remaining budget; chỉ số task phù hợp reservation được admit.

### Edge Cases

- Budget thiếu: `not_configured`, notify admin, không bịa percentage.
- Budget bằng 0: block billable task.
- Final cost khác reservation: release phần dư hoặc ghi overage rồi block subsequent task.
- Worker crash: reservation hết TTL/recovered deterministically, không giữ chỗ vĩnh viễn.
- Month boundary: reservation và ledger dùng client timezone.

## Requirements

- **FR-023**: System MUST track monthly budgets for client total and each active MVP agent.
- **FR-024**: Budget consumption MUST use customer charge, not actual system cost.
- **FR-025**: Budget percentage MUST equal customer charge divided by configured budget multiplied by 100.
- **FR-026**: System MUST expose charge, budget, remaining, percentage and state (`normal`, `warning`, `exceeded`, `not_configured`) for total and agent budgets.
- **FR-027**: At 80%, system MUST record `quota_warning` and notify Agency Admin without blocking.
- **FR-028**: At 100%, system MUST record `quota_exceeded` and reject new billable tasks before provider request.
- **FR-029**: Task MUST be rejected when either agent or client-total budget is exceeded.
- **FR-030**: Admission MUST account for concurrent in-flight billable work and reconcile reserved versus final charge.
- **FR-031**: Budget or multiplier change MUST affect newly admitted work within five minutes.
- **FR-032**: Month-to-date aggregation MUST use client timezone and calendar-month boundary.

## Required Concurrency Mechanism for Plan

`plan.md` MUST specify an explicit lightweight reservation design; Antigravity must not invent a two-phase protocol during implementation. Approved baseline:

1. At task admission, estimate a maximum customer charge for that call/task.
2. Atomically reserve that amount using Redis `INCRBY`/equivalent integer minor-unit counter scoped by client + agent + billing month, with bounded TTL and idempotency key.
3. Budget check reads committed ledger charge plus active reservation totals.
4. On final ledger write, release reservation and reconcile to actual customer charge.
5. On failure/crash, idempotent cleanup or TTL releases stale reservation; recovery records an operational warning.
6. Postgres ledger remains financial truth; Redis is temporary admission coordination only.

No distributed two-phase commit is required. Plan must define integer precision, idempotency, crash recovery, reconciliation ordering and tests before tasks are generated.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-0024B-01 | Client/agent percentages use customer charge and agree for same month |
| AC-0024B-02 | 80% warns without blocking; 100% blocks before provider call |
| AC-0024B-03 | Either exhausted cap blocks task |
| AC-0024B-04 | Concurrent admission cannot overspend through stale reads |
| AC-0024B-05 | Crash/timeout does not leak permanent reservation |
| AC-0024B-06 | Budget/multiplier update affects admission within five minutes |
| AC-0024B-07 | Client timezone assigns each event/reservation to one month |

## Dependencies

- 0024a canonical usage/cost ledger complete.
- Existing Redis/Celery lifecycle remains available.
- 0024c/0024d consume this sub-spec's budget-status contract.

## Planning Contract

Plan must use separate implementation, AC-test-author and test-runner/reporter roles, then repeat fix → regression-test generation → rerun until all AC pass.

# Feature Specification: Internal Cost Operations & Multiplier Admin

**Feature Branch**: `feature/0024-full-llm-observability`
**Created**: 2026-08-15
**Status**: Approved — blocked by 0024b
**Parent**: `specs/0024-full-llm-observability/spec.md`
**Scope**: Original FR-042 → FR-054

## User Scenarios & Testing

### User Story 1 - Agency sees economics per client (Priority: P1)

Agency Admin xem actual cost, customer charge, chênh lệch và budget status cho từng client và tổng agency.

**Independent Test**: Seed hai client, filter/drill-down/export từng client và xác nhận totals đúng, không trộn tenant.

### User Story 2 - Agency manages multiplier safely (Priority: P1)

Agency Admin quản lý global default và per-client override với confirm, reason và audit history; lịch sử usage không đổi.

**Independent Test**: Đổi default, thêm/remove override, kiểm tra audit và prospective snapshot behavior.

### User Story 3 - Agency investigates one call (Priority: P2)

Admin drill down tới units, latency, status, retry, cost, multiplier snapshot và trace correlation.

### Edge Cases

- Missing/provisional cost được highlight riêng.
- Multiplier 0 được phép, số âm bị reject.
- Export phải redacted secrets.
- Non-admin access bị deny.
- Internal App mock data không được trộn với runtime totals.

## Requirements

- **FR-042**: Internal App MUST provide agency-wide actual cost, customer charge, difference, usage volume and budget states.
- **FR-043**: Internal App MUST show each client with month-to-date actual cost, customer charge, difference, budget percentage and alert state.
- **FR-044**: Admin MUST filter/group by date, client, agent, provider, model, task, category, billing classification, status and environment.
- **FR-045**: Client detail MUST show totals, trends and breakdowns by agent/provider/model/task/category.
- **FR-046**: Call detail MUST show units, latency, status, retries, errors, eval score when available, costs, multiplier snapshot and trace correlation.
- **FR-047**: Internal App MUST separate production, mock/test, customer-billable and internal non-billable usage.
- **FR-048**: Internal App MUST show provisional cost, missing pricing and reconciliation exceptions.
- **FR-049**: Admin MUST export filtered operational data without credentials or unredacted secrets.
- **FR-050**: Admin MUST manage global default and per-client multiplier overrides.
- **FR-051**: Multiplier management MUST show value, source, previous value, changed by/at, reason and scope.
- **FR-052**: Saving multiplier change MUST require confirmation and non-empty reason.
- **FR-053**: Multiplier changes affect subsequent usage only; historical rows retain snapshots.
- **FR-054**: Only Agency Admin may access Internal observability, actual-cost and multiplier data.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-0024D-01 | Internal App shows actual/customer cost per client and agency total |
| AC-0024D-02 | Filters, grouping, drill-down and export reconcile to ledger |
| AC-0024D-03 | Global/client multiplier CRUD requires confirm/reason and writes audit |
| AC-0024D-04 | Historical snapshots remain unchanged after config change |
| AC-0024D-05 | Non-admin access returns no confidential values |
| AC-0024D-06 | Mock/test/non-billable/provisional data are visibly separated |

## Dependencies

- 0024a ledger/multiplier persistence and 0024b budget-status contract complete.
- 0024e trace link may be progressive; absence of Langfuse must not block financial views.

## Planning Contract

Plan must use separate implementation, AC-test-author and Internal-App test-runner/reporter roles, then repeat fix → regression-test generation → rerun until all AC pass.

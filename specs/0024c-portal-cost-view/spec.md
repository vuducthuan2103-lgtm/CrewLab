# Feature Specification: Portal Customer Cost View

**Feature Branch**: `feature/0024-full-llm-observability`
**Created**: 2026-08-15
**Status**: Approved — blocked by 0024b
**Parent**: `specs/0024-full-llm-observability/spec.md`
**Scope**: Original FR-033 → FR-041

## User Scenarios & Testing

### User Story 1 - Client understands payable usage (Priority: P1)

Portal hiển thị chi phí tháng này, budget, còn lại và phần trăm ở cấp tổng và từng agent bằng ngôn ngữ đơn giản.

**Independent Test**: Đăng nhập Bardinh pilot, seed customer-charge data và kiểm tra UI/response chỉ có customer-facing values.

### User Story 2 - Confidential pricing never leaks (Priority: P1)

Portal user không thể thấy actual cost, multiplier, markup, margin, formula, provider price hoặc trace kỹ thuật qua UI, API, export, notification hay lỗi.

**Independent Test**: Schema test + browser network inspection + export scan với denylist field/concept.

### Edge Cases

- Budget missing: show “Chưa cấu hình”, không hiện percentage giả.
- Charge provisional: show neutral “Đang cập nhật” nếu contract cho phép, không lộ cost-source logic.
- Percentage >100: show exceeded state and true customer-facing amount.
- Client attempts Internal endpoint: deny without existence leak.

## Requirements

- **FR-033**: Portal MUST show only customer charge, customer budget, remaining amount, percentage and customer-facing state.
- **FR-034**: Portal MUST provide current-month total and per-agent breakdown for six MVP agents.
- **FR-035**: Portal MAY show customer-charge trends but MUST NOT show tokens, latency, evaluation or trace fields.
- **FR-036**: Portal MUST NOT display or mention actual cost, multiplier, markup, margin, provider price, pricing formula or any relationship between actual cost and customer charge.
- **FR-037**: Portal APIs, bootstrap payloads, exports, notifications, errors and client-accessible logs MUST omit all confidential concepts in FR-036.
- **FR-038**: Portal MUST use neutral labels such as `Chi phí tháng này`, `Ngân sách`, `Còn lại`, `Đã sử dụng`; wording MUST NOT imply multiplier or markup.
- **FR-039**: Portal users MAY edit allowed per-agent budget caps but MUST NOT read/edit multiplier or billing classification.
- **FR-040**: Portal task details MUST hide prompt/response, tokens, `eval_score`, trace and internal errors.
- **FR-041**: Schema-level contract tests MUST verify no Portal-accessible response serializes actual cost, multiplier, margin or internal pricing fields.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-0024C-01 | Portal shows payable amount, budget, remaining and percentage for total/agents |
| AC-0024C-02 | UI labels remain neutral and customer-facing |
| AC-0024C-03 | UI/API/bootstrap/export/notification/error contain zero denylisted internal fields/concepts |
| AC-0024C-04 | Portal task detail exposes no token, trace, prompt/response or eval score |
| AC-0024C-05 | Cross-tenant and Internal endpoint attempts reveal no protected data |

## Assumption

Customer charge shown for Bardinh is forecasting/UI validation only; Bardinh is not billed.

## Dependencies

- 0024a customer-charge ledger and 0024b budget-status contract complete.
- Existing Portal tenant auth remains authoritative.

## Planning Contract

Plan must use separate implementation, AC-test-author and browser/API test-runner roles, then repeat fix → regression-test generation → rerun until all AC pass.

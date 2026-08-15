# Feature Specification: Full LLM Observability Program

**Feature Branch**: `feature/0024-full-llm-observability`
**Created**: 2026-08-15
**Status**: Umbrella specification — split into independently buildable sub-specs
**Decisions**: Decision 0015 (cost/customer charge) and Decision 0016 (Langfuse trace layer)

## Purpose

Spec 0024 là tài liệu điều phối cho full observability program. Nó không còn là một implementation task duy nhất. Toàn bộ 69 FR trước đây được chia thành năm sub-spec, mỗi sub-spec có acceptance criteria và build loop riêng để tuân thủ nguyên tắc “1 task = 1 spec = làm trong một buổi”.

## Sub-spec Map

| Sub-spec | Nội dung | FR gốc | Build dependency |
|---|---|---|---|
| [0024a](../0024a-usage-event-ledger/spec.md) | Usage event capture + actual cost/customer-charge ledger | FR-001 → FR-022 | Nền tảng, làm đầu tiên |
| [0024b](../0024b-budget-enforcement/spec.md) | Budget tracking + warning/block + concurrency reservation | FR-023 → FR-032 | Sau 0024a |
| [0024c](../0024c-portal-cost-view/spec.md) | Portal customer-facing cost/budget view, chống leak | FR-033 → FR-041 | Sau 0024b |
| [0024d](../0024d-internal-cost-ops/spec.md) | Internal App cost operations + multiplier administration | FR-042 → FR-054 | Sau 0024b |
| [0024e](../0024e-langfuse-trace-security/spec.md) | Langfuse trace, security, redaction, retention, reconciliation | FR-055 → FR-069 | Sau 0024a; chạy song song 0024c/0024d |

## Dependency Order

```text
0024a usage/cost ledger
  ├─> 0024b budget tracking/enforcement
  │     ├─> 0024c Portal customer-facing view
  │     └─> 0024d Internal App operations
  └─> 0024e Langfuse trace/security/reconciliation

0024e có thể chạy song song với 0024c và 0024d sau khi contract correlation của 0024a ổn định.
```

## Shared Product Rules

- Postgres usage/cost ledger là nguồn chính thức cho cost, customer charge, quota và budget.
- Langfuse self-hosted là trace layer theo Decision 0016, không thay thế ledger.
- Actual system cost và customer charge là hai số liệu riêng.
- Charge multiplier mặc định là `1.10`; Agency Admin có thể đổi global default hoặc override theo client.
- Budget và phần trăm usage dựa trên customer charge.
- Portal chỉ hiển thị customer charge/budget; không được lộ actual cost, multiplier, formula, margin, provider price, token, prompt/response, eval score hoặc trace.
- Internal App hiển thị đầy đủ actual cost, customer charge, multiplier, usage, errors và trace correlation cho Agency Admin.

## Schema Migration & Relationship Summary

- `usage_events` là canonical per-request ledger mới và **supersede định nghĩa `llm_usage`/`internal_llm_usage` ở PRD C1**. Một trường billing classification thay cho việc tách hai bảng vật lý.
- `task_logs` bị deprecated trong vai trò LLM usage/cost source. Trong transition, bảng này vẫn giữ workflow execution log để không phá Work Board và failure timeline.
- Dữ liệu LLM-call lịch sử trong `task_logs` được backfill sang `usage_events` khi đủ identity/usage; record không đủ dữ liệu được đánh dấu legacy/provisional thay vì bịa cost.
- Sau khi mọi cost/quota consumer chuyển sang `usage_events`, token/cost fields cũ trong `task_logs` không còn authoritative và chỉ được xóa ở migration riêng có compatibility check.

Chi tiết mapping, transition và rollback nằm trong Spec 0024a.

## Shared Build-loop Contract

Mỗi `plan.md` của 0024a–0024e phải định nghĩa vòng lặp sau:

```text
implement theo tasks.md
  → một test-author sub-agent độc lập sinh test cases từ AC
  → một test-runner/reporter sub-agent độc lập chạy test và lưu evidence
  → implementation agent sửa bug nếu fail
  → test-author bổ sung regression cases cho vùng vừa sửa
  → test-runner chạy lại
  → lặp cho tới khi toàn bộ AC pass
```

Implementation agent không được tự là người duy nhất viết test, chạy test và tự kết luận pass cho chính code của mình. Main agent điều phối, review evidence và quyết định completion.

## Assumptions

- USD là currency duy nhất; invoice, tax và payment collection ngoài scope.
- Multiplier changes áp dụng prospective; lịch sử chỉ điều chỉnh bằng append-only correction.
- Client-total budget do Agency Admin quản lý; per-agent budget giữ control hiện tại trên Portal.
- Direct attributable metered AI/service cost nằm trong scope; shared VPS/staff overhead chưa được phân bổ.
- **Customer charge/multiplier được build ở giai đoạn này với mục đích mô hình hoá chi phí (cost forecasting) khi scale sang nhiều client trả phí (Phase 6), không phải để tính tiền Bardinh Coffee ngay — Bardinh là pilot nội bộ, không áp dụng billing thật. Portal hiển thị customer charge cho Bardinh chỉ nhằm test đúng luồng UI/logic trước khi có khách thật.**
- Full observability không cấp quyền triển khai Hindsight, ChromaDB, F01, G01-G04 hoặc module full-vision ngoài scope hiện hành.

## Program-level Done Criteria

- Cả năm sub-spec đạt toàn bộ AC riêng và có test evidence.
- Portal confidentiality tests chứng minh zero internal-cost/multiplier leak.
- Internal App có thể đối soát actual cost/customer charge theo từng client.
- Budget enforcement đọc canonical ledger và không bị stale-concurrency bypass.
- Langfuse outage không làm mất ledger hoặc bỏ qua quota.
- MVP Scope, Decision 0015, Decision 0016 và năm sub-spec không còn mô tả mâu thuẫn.

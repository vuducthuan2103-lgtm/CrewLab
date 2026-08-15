# Feature Specification: Usage Event & Cost Ledger

**Feature Branch**: `feature/0024-full-llm-observability`
**Created**: 2026-08-15
**Status**: Approved — ready for plan
**Parent**: `specs/0024-full-llm-observability/spec.md`
**Scope**: Original FR-001 → FR-022

## User Scenarios & Testing

### User Story 1 - Capture each provider request exactly once (Priority: P1)

CrewLab ghi một usage event độc lập cho từng text/image/vision/embedding request, kể cả retry, repair và fallback, để cost không bị thiếu hoặc đếm trùng.

**Independent Test**: Chạy initial call, billed retry và duplicate replay; xác nhận hai provider request tạo hai event, duplicate replay không tạo cost thứ ba.

**Acceptance Scenarios**:

1. **Given** một provider request thành công, **When** response về, **Then** canonical event có identity, tenant, agent, task, provider/model, units, timing và status.
2. **Given** repair/retry tạo request mới, **When** hoàn tất, **Then** request có event riêng nhưng cùng parent correlation.
3. **Given** cùng identity bị replay, **When** persist lần hai, **Then** ledger trả record cũ hoặc no-op và không duplicate cost.

---

### User Story 2 - Reproduce actual cost and customer charge (Priority: P1)

Agency có thể giải thích actual cost và customer charge của từng usage event từ provider cost hoặc pricing snapshot có version.

**Independent Test**: Tạo một event có provider-reported cost và một event không có cost; xác nhận nguồn giá, precision, multiplier snapshot và tổng tiền tái tính được.

**Acceptance Scenarios**:

1. **Given** provider trả billed cost, **When** event được finalise, **Then** provider value là actual cost source.
2. **Given** provider không trả cost nhưng có usage units, **When** finalise, **Then** versioned pricing snapshot tính provisional/final cost theo policy.
3. **Given** client có multiplier override, **When** event được admit, **Then** multiplier và source được snapshot, không bị thay đổi ngược khi config đổi.

---

### User Story 3 - Preserve workflow logs while migrating ledger data (Priority: P1)

CrewLab chuyển nguồn cost/quota sang `usage_events` mà không làm hỏng Work Board, failure timeline hoặc dữ liệu `task_logs` hiện có.

**Independent Test**: Backfill fixture `task_logs`, kiểm tra event đủ dữ liệu được migrate, event thiếu dữ liệu được đánh dấu provisional, và workflow log vẫn đọc được.

**Acceptance Scenarios**:

1. **Given** legacy LLM row có identity và token data, **When** migration chạy, **Then** một usage event nguồn `legacy_task_log` được tạo idempotently.
2. **Given** legacy row thiếu dữ liệu cần để tính cost, **When** migrate, **Then** record được giữ với trạng thái unresolved/provisional, không bịa final zero.
3. **Given** Portal Work Board hoặc failure timeline còn đọc `task_logs`, **When** migration hoàn tất, **Then** workflow log vẫn hoạt động trong transition.

### Edge Cases

- Provider bills failed/timeout request: actual cost vẫn được ghi.
- Failed request không có billed usage: event giữ error metadata và cost 0 với source rõ ràng.
- Mock/test/local call: production=false, billable=false, actual/customer cost 0.
- Client không xác định: client nullable, internal non-billable.
- Provider price đổi giữa tháng: event cũ giữ price snapshot cũ.
- Multiplier đổi khi request đang chạy: dùng snapshot lúc admit.
- Refund/correction: append adjustment, không update event gốc.
- Legacy row có duplicate provider request ID: migration dedup deterministically.

## Requirements

### Usage Capture & Correlation

- **FR-001**: System MUST create one uniquely identifiable usage event for every external model/service request, including initial calls, retries, repairs, fallbacks, image generation, vision and embeddings.
- **FR-002**: Each event MUST identify attributable client, agent, task type, workflow/content item, provider, model, usage category, time, latency, status, wake reason and environment.
- **FR-003**: Each event MUST capture relevant billing units, including input/output tokens and service-specific units for non-text calls.
- **FR-004**: Retries, repairs and fallbacks MUST be separate events linked to the same parent task/trace.
- **FR-005**: Duplicate cost counting MUST be prevented using stable event identity and provider request identity when available.
- **FR-006**: Mock/test/local calls MUST be separate from production and MUST NOT contribute to customer charge.
- **FR-007**: Failed requests MUST record whether provider reported billable usage; workflow failure MUST NOT imply zero cost.
- **FR-008**: Each event MUST correlate to debug trace without requiring prompt/response content in the financial ledger.

### Actual Cost & Customer Charge

- **FR-009**: Actual system cost and customer charge MUST be maintained as distinct USD values.
- **FR-010**: Actual cost MUST prefer provider-reported billed cost and otherwise use a versioned pricing snapshot appropriate to measured units.
- **FR-011**: Each event MUST record cost source, price version/effective time, measured units and calculation status so cost can be reproduced.
- **FR-012**: Customer charge MUST equal actual system cost multiplied by the charge multiplier snapshot effective for that event.
- **FR-013**: Global default charge multiplier MUST start at `1.10`.
- **FR-014**: Agency Admin MUST be able to change global default and create, change or remove per-client override. CRUD UI/API belongs to 0024d; 0024a owns persistence and snapshot semantics.
- **FR-015**: Per-client override MUST take precedence over global default.
- **FR-016**: Multiplier changes MUST apply prospectively and MUST NOT recalculate historical events.
- **FR-017**: Each event MUST snapshot applied multiplier and source (`global_default` or `client_override`).
- **FR-018**: Multiplier MUST be a non-negative decimal; negative or invalid values MUST be rejected.
- **FR-019**: Billable and internal non-billable usage MUST be classified explicitly. Internal non-billable usage increases agency actual cost but not customer charge/budget.
- **FR-020**: Provider-billed retries, repairs and failed calls classified billable MUST contribute to customer charge.
- **FR-021**: Cost/charge corrections MUST be append-only adjustments linked to original event.
- **FR-022**: Calculations MUST retain aggregation precision; customer-facing monthly totals display USD to two decimals and percentages use unrounded aggregate.

## Schema Migration & Relationship

### Canonical model

- `usage_events` replaces the PRD C1 split-table model `llm_usage` + `internal_llm_usage` as the canonical per-request source of truth.
- A required `billing_classification` (`customer_billable` or `internal_non_billable`) and nullable `client_id` cover both former use cases without two ledgers.
- **This migration supersedes the `llm_usage` and `internal_llm_usage` definitions in PRD C1.** Future specs must not recreate those tables as independent sources.

### `task_logs` transition

- `task_logs` is deprecated only as an LLM usage/cost source.
- It remains temporarily as workflow execution log because existing Work Board, task failure and operational timeline consumers still use it.
- New model-call accounting writes `usage_events`; workflow state/task events may continue writing `task_logs` until their consumers migrate.
- Existing LLM-call rows are backfilled idempotently into `usage_events` where identity/usage is sufficient.
- Insufficient legacy data is retained as `legacy_task_log` + provisional/unresolved cost; no fabricated final cost.
- No column/table drop occurs in the first 0024a PR. Removal of obsolete token/cost fields requires a later compatibility migration after consumer audit.

### Ownership after migration

| Concern | Authoritative source |
|---|---|
| Per-provider-request units and cost | `usage_events` |
| Customer charge and multiplier snapshot | `usage_events` |
| Cost corrections | append-only usage adjustment records |
| Quota/budget aggregates | derived from `usage_events` in 0024b |
| Workflow execution/status timeline | `task_logs` during transition |
| Prompt/response trace | Langfuse via 0024e |

## Acceptance Criteria

| ID | Criterion | Merge blocking |
|---|---|---|
| AC-0024A-01 | One real provider request creates exactly one usage event; replay does not duplicate cost | Yes |
| AC-0024A-02 | Billed retry/repair creates a separate linked event and contributes cost | Yes |
| AC-0024A-03 | Actual cost uses provider cost or reproducible versioned snapshot | Yes |
| AC-0024A-04 | Default multiplier 1.10 and client override snapshot apply only prospectively | Yes |
| AC-0024A-05 | Historical event remains unchanged after multiplier/price configuration changes | Yes |
| AC-0024A-06 | Mock/test/internal non-billable usage does not increase customer charge | Yes |
| AC-0024A-07 | Failed call counts cost only when billed usage/cost evidence exists | Yes |
| AC-0024A-08 | Legacy `task_logs` backfill is idempotent and keeps unresolved cost explicit | Yes |
| AC-0024A-09 | Existing workflow-log consumer contract remains available after migration | Yes |
| AC-0024A-10 | Ledger/multiplier records support 24-month retention | Deferred verification |

### Deferred verification — retention

FR-065 from parent/0024e requires at least 24-month financial retention. 0024a schema must support that policy (no short TTL or destructive cleanup), but elapsed-time verification is **not an acceptance criterion blocking the first 0024a PR** at the N=1 pilot. Verification becomes operational once sufficient real data exists; migration/retention configuration tests remain required now.

## Success Criteria

- 100% acceptance fixtures produce exact event counts and no duplicate cost.
- Actual cost/customer charge recompute to stored precision from snapshots.
- Legacy migration can be rerun without changing totals.
- Existing workflow log reads continue to pass during transition.
- No API key, prompt or response body is stored in financial ledger fields.

## Assumptions

- Customer charge/multiplier currently models Phase-6 scale economics; Bardinh Coffee remains non-billed pilot usage.
- Shared fixed infrastructure cost is not allocated in this sub-spec.
- 0024d later supplies Agency Admin multiplier CRUD; 0024a supplies data rules and read/write service seam.
- Langfuse correlation ID can be nullable until 0024e is implemented.

## Dependencies

- Decision 0004: all model calls route through CrewLab LLM abstraction.
- Decision 0015: actual cost/customer charge semantics.
- Decision 0016: Langfuse is trace layer, not ledger.
- This migration supersedes `llm_usage`/`internal_llm_usage` definitions in PRD C1.

## Planning Contract

`plan.md` MUST assign implementation, AC-derived test generation, test execution/reporting and bug-fix verification to distinct roles/sub-agents. The loop repeats until every merge-blocking AC passes with concrete logs. `tasks.md` is generated only after plan/design review.

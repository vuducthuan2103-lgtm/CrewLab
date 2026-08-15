# Feature Specification: Langfuse Trace, Security & Reconciliation

**Feature Branch**: `feature/0024-full-llm-observability`
**Created**: 2026-08-15
**Status**: Approved — depends on 0024a correlation contract
**Parent**: `specs/0024-full-llm-observability/spec.md`
**ADR**: `docs/decisions/0016-reinstate-langfuse-observability.md`
**Scope**: Original FR-055 → FR-069

## User Scenarios & Testing

### User Story 1 - Correlated trace for every model call (Priority: P1)

Agency Admin theo dõi workflow → call → retry/repair/evaluation bằng Langfuse trace/span correlation.

**Independent Test**: Chạy workflow có repair, xác nhận ledger events và trace spans liên kết đúng.

### User Story 2 - Debug without leaking secrets or tenants (Priority: P1)

Prompt/response được redacted trước khi trace; Portal không truy cập được; tenant isolation bằng zero-leak policy.

**Independent Test**: Inject credential-like fixture, cross-tenant identifiers và Portal auth; xác nhận redaction/deny.

### User Story 3 - Reconcile trace/provider data without weakening ledger (Priority: P1)

Trace outage không làm mất cost/quota; missing cost được reconcile và correction append-only.

### User Story 4 - Operate within staging resource budget (Priority: P1)

Team đo Langfuse resource footprint trên staging shape thực tế trước khi bật lâu dài.

### Edge Cases

- Langfuse unavailable/slow: ledger commits, trace marked pending/failed, budget remains enforced.
- Redaction fails: raw payload is not sent; alert contains no payload.
- Trace retention expires: financial ledger/correlation metadata remain.
- Oracle Free/CAX11 lacks headroom: profile is limited or staging is resized; backend stability wins.

## Requirements

- **FR-055**: Every model call MUST emit correlated trace with client, agent, task, model, usage, latency, status, eval score when available and wake reason.
- **FR-056**: Financial ledger MUST remain usable when Langfuse is unavailable; trace failure MUST NOT lose cost data or permit quota bypass.
- **FR-057**: API keys, authorization headers, ciphertext and secret-like values MUST never be stored in traces, ledger, exports or visible errors.
- **FR-058**: Prompt/response access MUST be Agency Admin-only and redacted before storage/display.
- **FR-059**: Portal users MUST have no endpoint or indirect identifier granting Langfuse/Internal trace access.
- **FR-060**: Reads/exports of raw prompt-response and multiplier/cost corrections MUST be auditable.
- **FR-061**: Tenant isolation MUST apply to usage, cost, budget, trace metadata and exports with zero accepted leakage.
- **FR-062**: System MUST reconcile usage/cost against provider-reported data when available and surface differences.
- **FR-063**: Missing/provisional cost MUST NOT be silently treated as final zero.
- **FR-064**: Aggregates MUST derive from append-only events/adjustments, not overwritten totals.
- **FR-065**: Financial usage, cost, multiplier snapshots and admin audit MUST be retained at least 24 months.
- **FR-066**: Raw prompt/response traces MUST default to 90-day retention; metadata may remain with financial record.
- **FR-067**: Offboarding/trace deletion MUST preserve minimum evidence to reproduce historical totals.
- **FR-068**: Dashboard SHOULD reflect committed usage within one minute and MUST reflect config changes within five minutes.
- **FR-069**: Cost-recording failure MUST alert and fail safely rather than make an untracked billable call.

## Infrastructure Gate

Before persistent staging enablement, plan must benchmark the current official Langfuse self-host stack on the exact Oracle Free or Hetzner CAX11 shape selected. Record idle/peak RAM, CPU, disk growth, trace throughput and impact on backend/Celery/Redis. No pass based only on container health.

## Retention Verification Classification

- 90-day/24-month policy configuration and non-destructive cleanup tests are merge-blocking.
- Waiting 24 real months is not merge-blocking at N=1 pilot; elapsed-time verification is deferred operational evidence.

## Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-0024E-01 | Ledger events correlate with Langfuse spans across retry/repair |
| AC-0024E-02 | Langfuse outage loses zero ledger records and bypasses zero budget checks |
| AC-0024E-03 | Secrets are redacted before trace; Portal trace access is impossible |
| AC-0024E-04 | Cross-client trace access has zero leakage |
| AC-0024E-05 | Missing cost stays provisional and reconciliation is append-only |
| AC-0024E-06 | Retention policies are configured/tested without requiring 24-month elapsed wait |
| AC-0024E-07 | Staging resource report proves safe headroom or records resize/limited-profile decision |

## Dependencies

- Decision 0016.
- 0024a usage-event identity and trace-correlation contract.
- 0024b not required for trace capture, but budget resilience test integrates with it when available.

## Planning Contract

Plan must use separate Langfuse integration, security-test-author and resilience/resource-test-runner roles, then repeat fix → regression-test generation → rerun until all AC pass.

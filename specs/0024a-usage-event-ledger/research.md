# Research: Usage Event & Cost Ledger

## Decision 1 — One ledger replaces two PRD cost tables

**Decision**: Use one usage_events table with billing_classification and nullable client ownership.

**Rationale**: Every provider request needs the same identity, units, cost source, pricing snapshot and correlation fields. Splitting llm_usage/internal_llm_usage duplicates logic and risks double counting.

**Alternatives considered**:

- Keep two tables: rejected because shared dedup/cost logic would be duplicated.
- Use task_logs only: rejected because workflow log and financial event have different lifecycle, retention and precision needs.

## Decision 2 — Preserve task_logs as workflow log during transition

**Decision**: Deprecate only its LLM cost/usage role; do not drop it in 0024a.

**Rationale**: Current Work Board, failure tracking and task timeline still consume task_logs. Immediate removal is a breaking change unrelated to ledger correctness.

**Alternatives considered**:

- Drop and migrate everything at once: rejected due broad consumer risk.
- Dual-write full financial data forever: rejected because it creates two authoritative ledgers.

## Decision 3 — Commit pending event before external call

**Decision**: Begin usage event in an independent transaction before provider request, finalize in another independent transaction.

**Rationale**: Current _log_task shares the workflow transaction. Provider can charge CrewLab even if that transaction later rolls back. A committed pending record preserves evidence and lets reconciliation find incomplete events.

**Alternatives considered**:

- Post-call write only: loses evidence on crash/rollback.
- Same workflow session: repeats current failure mode.
- Separate observability daemon/outbox: unnecessary infrastructure for current scale.

## Decision 4 — Idempotency uses event and provider identities

**Decision**: Unique caller-generated event_key plus partial unique provider/provider_request_id.

**Rationale**: Application retries can be deduplicated before provider ID exists; provider replay can be deduplicated after response.

## Decision 5 — Cost precedence and unresolved state

**Decision**: Provider-reported billed cost wins; otherwise use versioned pricing snapshot; otherwise unresolved.

**Rationale**: Provider billing evidence is closest to actual cost. Price snapshots make fallback reproducible. Missing evidence must not become an invented final zero.

## Decision 6 — Fixed precision and immutable snapshots

**Decision**: Store USD values as fixed-precision decimal, usage units as integers/structured unit map, and snapshot multiplier/rate inputs on each finalized event.

**Rationale**: Floating-point drift is unacceptable for aggregation. Current price/config cannot be used to reinterpret historical events.

## Decision 7 — Append-only financial corrections

**Decision**: Finalized events are immutable; correction/refund uses separate adjustment rows.

**Rationale**: Audit and reconciliation need original and corrected values.

## Decision 8 — No public API in 0024a

**Decision**: 0024a exposes internal service contracts only. Portal/Internal endpoints belong to 0024c/0024d.

**Rationale**: This keeps the first build loop limited to ledger correctness and migration safety.

## Resolved environment note

The project constitution targets Python 3.12; the current local venv reports Python 3.11.9. This plan does not change runtime installation. Implementation and test reports must state the interpreter and avoid 3.12-only syntax until environment alignment is handled separately.

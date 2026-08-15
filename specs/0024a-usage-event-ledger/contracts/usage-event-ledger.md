# Internal Contract: Usage Event Ledger

This is a backend service contract, not a Portal/Internal public API.

## begin_usage_event

Input:

| Field | Required |
|---|---|
| event_key | yes |
| client_id | nullable for internal non-billable |
| agent_code, task_type | yes |
| provider, model, usage_category | yes |
| billing_classification | yes |
| content_item_id, parent_event_id, trace_id | optional |
| environment/is_production | yes |

Behavior:

1. Resolve and snapshot active multiplier.
2. Insert pending event in an independent transaction.
3. On duplicate event_key, return existing event without new provider admission.
4. On database failure, return/raise ledger-unavailable and caller must not call provider.

Output:

- usage_event_id
- event_key
- multiplier_snapshot/source
- status
- should_call_provider boolean

## finalize_usage_event

Input:

- usage_event_id/event_key
- provider_request_id when available
- status and sanitized error category
- usage_units
- latency
- provider-reported cost when available

Behavior:

1. Lock/select the pending event.
2. Deduplicate provider request identity.
3. Resolve cost source: provider cost → pricing snapshot → unresolved.
4. Calculate actual cost and customer charge with stored multiplier.
5. Commit in an independent transaction.
6. If already finalized with the same evidence, return existing row idempotently.
7. Conflicting evidence creates reconciliation error; do not overwrite silently.

Output:

- finalized event identity
- cost_status/source
- actual_cost_usd/customer_charge_usd when resolved
- reconciliation_required boolean

## record_usage_adjustment

Agency-admin/internal reconciliation only.

- Requires original event, signed delta values, reason and actor.
- Appends adjustment; never updates original event.
- Public endpoint/UX is deferred to 0024d/0024e.

## backfill_task_logs

- Select only legacy rows that represent LLM/model usage.
- event_key is legacy-task-log:{id}.
- Rerun is idempotent.
- Missing provider/rate evidence produces unresolved cost.
- Does not modify/delete task_logs.

## Instrumentation obligations

Each actual provider request in call_llm, structured-output repair, image generation/edit and embedding must have its own begin/finalize pair. A parent workflow may therefore own multiple usage events.

## Forbidden payload

No contract accepts or stores prompt text, response text, plaintext/ciphertext keys, authorization headers or full provider error bodies.

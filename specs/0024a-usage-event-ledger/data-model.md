# Data Model: Usage Event & Cost Ledger

All currency columns use fixed-precision decimal. No prompt, response, API key or authorization material is permitted in these tables.

## usage_events

One row per external provider request.

| Field | Rules | Purpose |
|---|---|---|
| id | UUID PK | Internal identity |
| event_key | text, unique, not null | Caller idempotency before provider call |
| client_id | UUID nullable, FK clients | Attributable tenant; null for agency-internal usage |
| content_item_id | UUID nullable, FK content_items | Workflow correlation |
| parent_event_id | UUID nullable, self FK | Retry/repair/fallback relationship |
| trace_id | text nullable | Cross-system trace correlation |
| span_id | text nullable | Provider-call span correlation |
| agent_code | text not null | A01/B02/B03/D01/D02/E01 or approved system source |
| task_type | text not null | Stable task taxonomy |
| provider | text not null | Actual provider called |
| model | text not null | Actual model called |
| usage_category | text not null | text, image, vision, embedding, other_metered_ai |
| usage_units | JSON object, not null | Integer unit map such as input_tokens/output_tokens/images |
| provider_request_id | text nullable | Provider dedup/correlation |
| environment | text not null | local, test, staging, production |
| is_production | boolean not null | Separates mock/test from production |
| billing_classification | text not null | customer_billable or internal_non_billable |
| status | text not null | pending, succeeded, failed, cancelled |
| cost_status | text not null | pending, provisional, final, unresolved |
| cost_source | text nullable | provider_reported, pricing_snapshot, legacy_task_log, none |
| pricing_snapshot_id | UUID nullable | Rate evidence |
| provider_reported_cost_usd | decimal nullable | Provider evidence |
| actual_cost_usd | decimal nullable, nonnegative | CrewLab cost; null while unresolved |
| multiplier_snapshot | decimal not null, nonnegative | Effective multiplier at admission |
| multiplier_source | text not null | global_default or client_override |
| customer_charge_usd | decimal nullable, nonnegative | actual_cost × multiplier |
| latency_ms | integer nullable, nonnegative | Provider request latency |
| error_code | text nullable | Sanitized category only |
| source_task_log_id | UUID nullable, unique | Legacy backfill identity |
| started_at | timestamptz not null | Admission/provider start |
| completed_at | timestamptz nullable | Finalization time |
| created_at | timestamptz not null | Ledger creation |
| updated_at | timestamptz not null | Pending-to-final transition |

### Constraints and indexes

- Unique event_key.
- Partial unique (provider, provider_request_id) when provider_request_id is not null.
- Unique source_task_log_id when present.
- Check all numeric usage units are nonnegative in service validation.
- Check actual_cost_usd, multiplier_snapshot and customer_charge_usd are nonnegative.
- Index (client_id, started_at), (agent_code, started_at), (status, cost_status), trace_id and content_item_id.
- Finalized rows cannot change cost snapshot fields through normal service methods.

### State transitions

    pending/pending
      -> succeeded/final
      -> succeeded/provisional
      -> failed/final
      -> failed/unresolved

Final financial corrections do not reopen the event; they create usage_cost_adjustments.

## pricing_snapshots

Versioned fallback pricing evidence.

| Field | Rules |
|---|---|
| id | UUID PK |
| provider | text not null |
| model | text not null |
| usage_category | text not null |
| currency | USD only in this feature |
| unit_prices | JSON object of fixed-precision decimal strings |
| version | text not null |
| source_reference | text not null |
| effective_from | timestamptz not null |
| effective_to | timestamptz nullable |
| created_at | timestamptz not null |

Unique (provider, model, usage_category, version). Existing snapshots are not edited after use.

## charge_multiplier_configs

Append-only effective-dated multiplier configuration.

| Field | Rules |
|---|---|
| id | UUID PK |
| scope | global_default or client_override |
| client_id | null for global, required for override |
| multiplier | fixed decimal, nonnegative |
| effective_from | timestamptz not null |
| effective_to | timestamptz nullable |
| changed_by | UUID not null |
| reason | text not null |
| created_at | timestamptz not null |

Migration seeds one active global_default row at 1.10. At most one active global default and one active override per client.

## usage_cost_adjustments

Append-only correction/refund record.

| Field | Rules |
|---|---|
| id | UUID PK |
| usage_event_id | FK usage_events, not null |
| actual_cost_delta_usd | fixed decimal, may be negative |
| customer_charge_delta_usd | fixed decimal, may be negative |
| reason | text not null |
| approved_by | UUID not null |
| created_at | timestamptz not null |

No update/delete through application service.

## task_logs relationship

- No table/column drop in 0024a.
- source_task_log_id maps legacy LLM-call rows.
- task_logs remains workflow execution/status source during transition.
- Its token/model fields are compatibility data, not cost/quota authority.

## Superseded PRD tables

Do not create llm_usage or internal_llm_usage. usage_events plus billing_classification replaces both definitions.

## Tenant/security policy

- Service-layer tenant checks are mandatory.
- Direct Portal access to ledger tables is forbidden.
- RLS permits backend-controlled access; client-facing projections are introduced only in 0024c.
- client_id-null records are Agency Admin-only.

# Internal Contract: Budget Enforcement

## `admit_budget`

Inputs: a pending 0024a event, client, agent, conservative estimated customer charge, and the client-local month. Output: a reservation or `BudgetExceeded` / `BudgetEstimateUnavailable`. It completes before the provider call.

## `finalize_budget_reservation`

Inputs: the reservation and the final ledger result. 0024a finalizes first; this idempotently releases temporary capacity.

## `get_budget_status`

Returns backend-only client/agent status. Portal projection is expressly deferred to 0024c.

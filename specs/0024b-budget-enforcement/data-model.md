# Data Model: Budget Enforcement

`clients.monthly_budget_usd` is the nullable client-total monthly cap. `client_llm_configs.budget_usd` is the nullable agent cap. Null means `not_configured` in a status response.

For a client-local calendar month, the service returns client and agent customer charge, configured budget, remaining amount, percentage, and `normal`, `warning`, `exceeded`, or `not_configured` state.

Redis holds only reservation IDs, integer cents, and expiry. A request reserves the same amount in the client-total and agent scopes. Release is idempotent; expiry cleanup never changes the ledger.

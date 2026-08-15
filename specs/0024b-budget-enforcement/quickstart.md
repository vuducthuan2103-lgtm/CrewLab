# Quickstart: Verify 0024b

Use dedicated test database and Redis instances. Never apply the migration to production without explicit owner approval.

1. Run `python -m pytest backend/tests/test_budget_enforcement.py backend/tests/test_llm_budget_admission.py -q`.
2. Seed ledger usage below 80%, from 80% to 99.99%, and at 100%; assert the customer-charge status is consistent for client and agent scopes.
3. Exhaust each cap separately and verify the provider mock has zero calls.
4. Run concurrent admissions exceeding remaining cents; only the capacity-fitting calls may reserve.
5. Advance the test clock past reservation expiry and a client-local month boundary; assert stale capacity is released and events belong to one month.

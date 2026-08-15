# Quickstart: Verify Spec 0024a

## Preconditions

- Review migration and rollback SQL before applying; schema changes require explicit owner approval.
- Use a dedicated local/staging database, never production.
- Backend venv and test dependencies are available.
- Provider interactions are mocked unless a separately authorized real-cost test is being run.

## 1. Static validation

Run:

    git diff --check
    backend\venv\Scripts\python.exe -m pytest backend\tests\test_db_schema.py -q

Expected:

- No whitespace errors.
- Existing task_logs schema/consumer expectations remain valid.

## 2. Migration validation

The test-runner must:

1. Upgrade an empty test database.
2. Upgrade a fixture with representative task_logs rows.
3. Run backfill twice.
4. Compare event count, source_task_log_id uniqueness and cost totals.
5. Verify unresolved legacy rows are not final zero.
6. Inspect downgrade and prove it does not alter task_logs.

Store exact commands and output under output/0024a/.

## 3. Ledger lifecycle validation

Test these paths:

- begin succeeds → provider succeeds → final cost.
- begin fails → provider mock call count remains zero.
- provider succeeds → workflow transaction rolls back → usage event still exists.
- provider fails with billed usage → failed event has cost.
- provider fails without billed usage → failed event records zero/none source correctly.
- finalize called twice → one financial event.
- structured repair → two linked events.
- image/embedding usage → service-specific unit map.

## 4. Snapshot validation

1. Create event under default multiplier 1.10.
2. Change active config fixture.
3. Create second event.
4. Confirm first event is unchanged.
5. Repeat for pricing snapshot change.

## 5. Regression suite

At minimum:

    backend\venv\Scripts\python.exe -m pytest backend\tests\test_llm_routing.py -q
    backend\venv\Scripts\python.exe -m pytest backend\tests\test_d01_d02.py backend\tests\test_e01.py -q
    backend\venv\Scripts\python.exe -m pytest backend\tests\test_db_schema.py backend\tests\test_portal_bootstrap.py -q

## 6. Evidence report

Sub-agent C writes:

- interpreter/package versions;
- migration revision and database fixture;
- every command and exit code;
- AC-0024A-01 → AC-0024A-09 pass/fail mapping;
- concrete failure excerpts;
- AC-0024A-10 marked deferred elapsed-time verification, with current schema/policy checks reported separately.

No completion claim is valid without this report and a final regression run after the last bug fix.

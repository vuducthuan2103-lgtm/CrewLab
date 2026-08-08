# Quickstart: Verify Portal Bootstrap Performance

## Automated checks

From the repository root:

```powershell
backend\.venv\Scripts\python.exe -m pytest backend\tests\test_portal_bootstrap.py backend\tests\test_database_connection_errors.py -q
Set-Location portal
npm run lint
npx tsc --noEmit
npm run build
```

Then run the full backend suite:

```powershell
backend\.venv\Scripts\python.exe -m pytest backend\tests -q
```

## Authenticated smoke test

1. Start the backend and Portal with the existing project scripts.
2. Open browser developer tools, clear the Network list, and sign in with a linked active Portal account.
3. Confirm the sidebar first shows the session email and then the correct restaurant name.
4. Confirm initial Portal data uses one `/api/v1/portal/bootstrap` request and does not request `/assets`, `/asset-requests`, or `/settings`.
5. Open the assets page. Confirm its own loading state and requests to `/assets` plus `/asset-requests`.
6. Open settings. Confirm its own loading state and one `/settings` request.
7. Force one deferred request to fail. Confirm the work board remains usable and the affected page shows retry plus a support reference.
8. Confirm the failed response's `X-Request-ID` matches a backend log entry.

## Readiness check

With the database reachable, `GET /readyz` must return `200` and `database: ready`. With a controlled unavailable database in a test environment, it must return `503`; `/health` must continue to represent process liveness.


# Spec 0024a Acceptance Sign-off

## Verdict

**Accepted for implementation plus staging-ledger scope, with the live-provider gate still blocked by credential decryption.** All merge-blocking AC-0024A-01 through AC-0024A-09 are GREEN. AC-0024A-10 remains explicitly deferred for elapsed-time verification and is schema-supported as required by the spec.

Migration 0016, PostgreSQL immutability behavior, backend access and direct-client denial were exercised on the active staging project. A provider call was attempted through each configured provider, but no request left the backend because the local master key cannot decrypt the stored credentials. Live provider billing metadata therefore remains an explicit PR gate rather than a claimed success.

## Build-loop evidence

| Stage | Evidence |
|---|---|
| Baseline | `baseline.md`: 168 backend tests passed before implementation |
| Initial RED | `us2-test-report.md` and `us3-test-report.md`: mock classification and >500-row backfill failures reproduced |
| Fix pass 1 | `fix-log.md`: F-0024A-001 and F-0024A-002 fixed |
| Independent pass 2 | `pass2-test-report.md`: original failures GREEN; seven review-derived RED tests reproduced |
| Fix pass 2 | `fix-log.md`: R-0024A-001 through R-0024A-004 fixed |
| Final verification | `final-test-report.md`: targeted 86/86, full backend 213/213, migration/security 39/39, Alembic head 0016, compile/import and whitespace checks GREEN |

The production implementer, AC-derived test author, database/security reviewer and final verifier were separate sub-agents. The main agent mapped failures and performed this final security/acceptance review.

## Acceptance criteria

| AC | Status | Final evidence |
|---|---|---|
| AC-0024A-01 | GREEN | Stable event identity, admission-before-provider, provider-request dedup and text/vision/image/edit/embedding instrumentation tests |
| AC-0024A-02 | GREEN | Retry and structured-repair requests create separate parent-linked events; repair failure reconciliation is covered |
| AC-0024A-03 | GREEN | Provider-reported cost precedence, versioned pricing fallback, Decimal precision and invalid-pricing fail-closed behavior |
| AC-0024A-04 | GREEN | Default 1.10 multiplier and effective-dated client override snapshot tests |
| AC-0024A-05 | GREEN | Historical snapshot stability, append-only adjustments and PostgreSQL immutability trigger contract |
| AC-0024A-06 | GREEN | Mock-in-production is forced non-production/internal; local/internal usage produces zero customer charge |
| AC-0024A-07 | GREEN | Billed/unbilled failures, pre-dispatch zero-unit behavior, provider evidence and reconciliation signals across call types |
| AC-0024A-08 | GREEN | Idempotent unresolved legacy backfill, mixed rows and >500-row forward progress without changing `task_logs` |
| AC-0024A-09 | GREEN | Additive migration plus complete backend regression preserves workflow/task-log consumers |
| AC-0024A-10 | DEFERRED | No short TTL/destructive cleanup; real 24-month elapsed retention remains non-blocking and untestable at pilot age |

## Main-agent security and tenant review

- Financial tables contain identifiers, usage units, bounded error categories and cost evidence only. They do not define fields for prompt text, response bodies, credentials, API keys, authorization headers or raw exception messages.
- Tests verify forbidden payload fields are absent and reconciliation signaling does not add sensitive payloads to finalization commands.
- New ledger tables enable and force RLS and revoke direct `anon`/`authenticated` access. No customer Data API policy is created.
- `client_id` attribution is explicit and nullable only for internal non-billable usage; non-production/mock admissions cannot become customer-billable.
- Financial history is protected by database triggers: pricing snapshots and adjustments reject UPDATE/DELETE, while usage events allow only the required pending-to-terminal finalization before becoming immutable.
- Event-key and provider-request dedup are indexed. Provider-request identity currently assumes IDs are globally unique within a provider; adding provider-account/credential fingerprinting is deferred until a non-secret stable account identity is available.
- Backend access under FORCE RLS was proven through the configured staging database role; direct `anon` and `authenticated` reads both fail with PostgreSQL `42501`.

## Staging runtime result and remaining gates

1. **GREEN:** migration 0016 applied transactionally to `CrewLab - Stagging`; Alembic head is `0016` and trigger smoke passed in a rolled-back transaction.
2. **GREEN:** configured backend role can access the ledger while `anon` and `authenticated` cannot.
3. **GREEN:** 65 legacy LLM logs were backfilled without changing source logs; rerun created zero duplicates.
4. **OPEN:** confirm Coolify/staging sets `CREWLAB_ENVIRONMENT=production` once the backend deployment is reachable.
5. **BLOCKED:** restore the original staging credential-encryption key or re-enter provider keys through Internal App, then sample real provider response IDs, usage units and billed-cost metadata.
6. **DEFERRED:** keep AC-0024A-10 in the operational retention checklist until real elapsed data exists.

## Main static sign-off

- `git diff --check`: exit 0; only LF-to-CRLF notices, no whitespace errors.
- Staging migration and backfill were performed; production was not touched.
- The provider smoke stopped before dispatch because credential decryption failed, and no secret was rotated or exposed.

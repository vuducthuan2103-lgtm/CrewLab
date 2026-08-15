# Research: Budget Enforcement

## Cents

Use `ROUND_CEILING` for temporary reservations so the integer amount never under-reserves the estimated customer charge. 0024a keeps precise USD decimals as the accounting record.

## Coordination

Postgres aggregates finalized events and adjustments; Redis atomically admits and releases temporary reservations. Redis is never an accounting source and must not rewrite historical ledger rows.

## Unknown prices

If a cap is configured but the service cannot safely estimate the request from an effective pricing snapshot, reject before the provider call. Zero is not a safe default.

## Calendar boundary

Use `ZoneInfo(client.timezone)` to derive the local month and an UTC range for ledger aggregation. A reservation key keeps a short grace TTL past local month-end so a worker can release it deterministically.

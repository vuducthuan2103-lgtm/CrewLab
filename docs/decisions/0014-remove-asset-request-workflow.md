# 0014 - Remove the Asset Request workflow

Date: 2026-08-09

## Decision

D02 never creates an Asset Request and no content item waits for a client to
provide a specific photograph. Every `visual_required` post produces a final
visual: it starts from the best eligible real client image when available, or
uses a new generation when no suitable source exists.

## Consequences

- Remove Asset Request routes, Portal UI, Celery expiry work, FSM states and
  database relationships.
- Preserve an uploaded image as an immutable `brand_assets` source.
- Create a client-isolated `semantic_asset_records` row for each source. Its
  asynchronous status is `processing`, `ready`, `needs_attention`, `failed`,
  or `superseded`; approval and rights remain independent eligibility checks.
- Existing images are queued for semantic indexing after code and database
  deployment. They are not auto-approved: approval remains the agency's
  explicit safety and usage-right control.

## Migration safety

The migration drops the unused `asset_requests` table and its foreign key only
after application code is deployed. Applying it before the backend release
would make the currently deployed asset-listing code fail.

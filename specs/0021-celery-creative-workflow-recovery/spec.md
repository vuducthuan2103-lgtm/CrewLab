# Spec 0021 - Celery Creative Workflow Recovery

**Status:** Approved by founder on 2026-08-10

## Goal

Restore the local A01 chat workflow so an accepted client request reaches D01,
D02, and E01, producing a caption and final visual for client approval.

## In scope

- Run the local Celery worker with the permissions required to reach the
  existing Redis broker and Supabase database.
- Keep D02 within the tenant-approved candidate set when a model returns an
  unknown asset ID, using the highest-ranked eligible client asset as a guided
  edit source when the requested creative detail can be added during editing.
- Route image evaluation through an enabled vision-capable model instead of a
  text-only evaluator configuration, then recover the affected local request
  without discarding its caption, asset provenance, or attempt history.
- Add a regression test and re-run the existing A01-created item through the
  workflow.

## Out of scope

- Changing provider keys, client content, database schema, or production
  deployment.

## Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-0021-01 | Celery worker replies to `inspect ping` and can read the configured database. |
| AC-0021-02 | An A01 chat-created item proceeds from `planned` to D01 caption generation. |
| AC-0021-03 | A selector ID outside the candidate list never becomes a source asset; D02 uses an eligible tenant-scoped fallback and preserves it for guided editing. |
| AC-0021-04 | The item reaches a final visual and E01 evaluation or records a specific actionable failure. |
| AC-0021-05 | E01 evaluates supplied visuals with a model that supports the multimodal input used by the evaluator. |
| AC-0021-06 | An exhausted provider balance is recorded as a non-retryable, actionable generation or evaluation block rather than an infinite in-progress retry. |
| AC-0021-07 | After the provider is restored, recovery routes a blocked visual generation to D02 and a blocked visual evaluation to E01. |

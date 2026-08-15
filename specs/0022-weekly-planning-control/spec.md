# Spec 0022 - Weekly Planning Control

**Status:** Approved by direct user request on 2026-08-10

## Goal

Let a Portal customer schedule and test the complete weekly planning flow:
create a B02 pillar draft, edit its pillar weights and angles, approve S2,
review the B03 seven-day plan, and approve S3 before creative work begins.

## In scope

- Read and update the tenant-scoped weekly planning day and time.
- Create one test weekly draft through A01, ending at the existing S2 gate.
- Display and persist customer changes to each B02 pillar's name, weight,
  description, and angles without a database migration.
- Make S2 dispatch B03 and make S3 dispatch D01 using the existing A01
  dispatcher and Celery task registry.
- Explain the customer testing path in the Portal UI.

## Out of scope

- Changing publishing to an external social network.
- Bypassing S2, S3, or the existing content-approval gate.
- Adding agents outside the six-agent MVP, or changing provider keys.

## Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-0022-01 | The Portal can save a valid weekly day and `HH:MM` time only for the signed-in client. |
| AC-0022-02 | A test-week action creates at most one active cycle and queues B02 through A01. |
| AC-0022-03 | The customer can see and edit 2-5 pillars, weights totaling 100%, and at least one angle per pillar before S2. |
| AC-0022-04 | S2 queues B03; the generated weekly plan shows each planned post with its date, time, platform, and pillar. |
| AC-0022-05 | S3 queues D01 only after the weekly plan is approved. |
| AC-0022-06 | Backend API tests and Portal lint pass. |

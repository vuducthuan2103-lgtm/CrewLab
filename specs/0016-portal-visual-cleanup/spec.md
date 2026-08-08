# 0016 - Portal Visual Cleanup

**Feature Branch**: `feature/0016-portal-visual-cleanup`
**Status**: Approved by user request

## Goal

Remove decorative emoji labels from the Portal navigation, settings, calendar, and Kanban views while preserving every existing interaction and state indicator.

## Scope

- Use text labels and existing Lucide icons only where they communicate product meaning.
- Remove the redundant day abbreviation inside a calendar day cell; retain the calendar column headers.
- Remove unused Kanban desk emoji props.
- Add a reproducible backend development-test dependency list.

## Out of Scope

- No workflow, API, database, Supabase, or business-rule changes.
- Do not commit Celery schedule files, logs, local environments, or credentials.

## Acceptance Criteria

1. Portal tab, setting, and Kanban desk labels render without decorative emoji.
2. Calendar date cells retain the date and content items; weekday headers remain visible.
3. Portal production build passes.
4. `backend/requirements-dev.txt` lists the packages needed for the current backend test suite.

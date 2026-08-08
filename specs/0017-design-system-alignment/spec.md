# 0017 — DESIGN.md Frontend Alignment

**Feature Branch:** `feature/0017-design-system-alignment`
**Status:** Approved by user request
**Design Source of Truth:** `DESIGN.md`

## Goal

Align the shared visual foundation of both CrewLab frontends with `DESIGN.md` so future UI work consumes one consistent set of design tokens instead of duplicating colors, typography, spacing, radii, and interaction rules in each app.

## Scope

- Track `DESIGN.md` as the canonical visual source of truth.
- Create a shared Tailwind-compatible token module derived from the normative values in `DESIGN.md`.
- Make both `portal/` and `internal-app/` consume the shared colors, typography, spacing, radii, and container values.
- Make both frontend surfaces dark-only and remove theme-toggle UI/state, per Decision 0013.
- Align shared shadcn-style primitives touched by this migration, especially Button and Input, with the documented sizing, focus, disabled, and motion rules.
- Preserve all current routes, API calls, FSM behavior, user interactions, and the visual-cleanup work from Spec 0016.

## Out of Scope

- No backend, database, Supabase, workflow, agent, or API changes.
- No new pages or product features.
- No B01, F01, G01-G04, campaign execution, publishing, analytics, or other post-MVP functionality.
- No broad page-layout rewrite when shared tokens and primitives can provide the required alignment.
- No deployment, commit, push, or pull request unless requested separately.

## Implementation Rules

1. `DESIGN.md` is normative; generated/shared code must not silently invent replacement values.
2. Use shadcn/ui-compatible semantic variables and Lucide icons only.
3. Primary CTA uses Electric Lime `#D4FF00` with Obsidian `#09090B` text on the dark interface.
4. Internal technical cyan uses `#22D3EE` for dark surfaces.
5. Interactive controls target at least 44px height, visible `focus-visible` treatment, explicit disabled behavior, and reduced-motion support.
6. Transitions must target specific properties; new `transition-all` usage is not allowed.

## Acceptance Criteria

| ID | Criterion | Verification |
|---|---|---|
| AC-0017-01 | `DESIGN.md` passes the official DESIGN.md linter with 0 errors and 0 warnings. | `npm run design:lint` or equivalent CLI command |
| AC-0017-02 | Portal and Internal App Tailwind configs import the same shared design-token module. | Static inspection + production build |
| AC-0017-03 | Both apps use Montserrat for UI/headings and JetBrains Mono for technical labels/logs. | Static inspection + production build |
| AC-0017-04 | Both apps are dark-only: their root layout keeps the `dark` class, no light semantic variable set exists, and no theme toggle/state remains. | Static search + token/CSS inspection |
| AC-0017-05 | Shared Button and Input controls have a minimum 44px target, visible focus treatment, and disabled styling. | Component inspection + production build |
| AC-0017-06 | Portal production build succeeds without changing business behavior. | `npm run build` in `portal/` |
| AC-0017-07 | Internal App production build succeeds without changing business behavior. | `npm run build` in `internal-app/` |
| AC-0017-08 | Spec 0016 visual cleanup remains intact: no decorative emoji are reintroduced into Portal navigation, settings, calendar, or Kanban labels. | Targeted text search + inspection |

## Definition of Done

All acceptance criteria pass, only frontend/design-system files and Spec 0017 artifacts are changed, and any remaining page-specific visual drift is reported as follow-up work rather than silently expanding scope.

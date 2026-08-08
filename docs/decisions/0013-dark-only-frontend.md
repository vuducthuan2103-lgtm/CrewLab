# Decision 0013: Dark-only frontend

**Status:** Accepted
**Date:** 2026-08-08
**Supersedes:** The dual-theme requirement in Decision 0002

## Context

Portal and Internal App previously exposed light/dark theme toggles and maintained two parallel semantic color systems. The product direction now requires one consistent dark interface.

## Decision

- Portal and Internal App support dark mode only.
- Both root layouts keep the `dark` class so existing Tailwind `dark:` variants remain active.
- Theme-toggle controls and their client-side state are removed.
- `DESIGN.md` contains only runtime dark-theme colors and machine-readable dark component pairs.
- Electric Lime `#D4FF00` remains the primary CTA color with Obsidian `#09090B` text.
- Internal technical metadata uses Cyan `#22D3EE`.

## Consequences

- There is one semantic variable set to maintain and test.
- The app no longer follows the operating-system color preference and offers no user-selectable light theme.
- Reintroducing light mode requires a new decision and a complete accessible token/component set, not only a toggle.

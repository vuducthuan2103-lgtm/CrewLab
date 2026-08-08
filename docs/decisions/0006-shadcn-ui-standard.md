# Decision 0006 — shadcn/ui as the frontend component standard

## Status

Accepted

## Decision

CrewLab's two Next.js applications, `portal/` and `internal-app/`, use shadcn/ui as the default component system. The shadcn MCP server is available to help discover and add compatible components.

New shared UI primitives should be added through the shadcn CLI/MCP and live under each app's `components/ui/` directory. Existing custom components can remain in place and should be migrated incrementally when they are changed or when a product task requires it.

## Constraints

- Preserve the existing CrewLab brand tokens while using shadcn-compatible CSS variables and Tailwind configuration.
- Use the existing `cn()` utility and app path aliases.
- Prefer Lucide icons for interface icons.
- Do not add another UI component library without a new architecture decision.
- This decision standardizes implementation; it does not expand the current MVP product scope.

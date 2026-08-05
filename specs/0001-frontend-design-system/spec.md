# SPEC-0001: CrewLab Frontend Design System & Next.js Scaffolding

## 1. Context & Business Goal
CrewLab requires two Next.js frontend applications in this monorepo:
1. `portal/`: Client Portal for F&B SME owners to review AI-generated content (Caption D01, Image D02, Evaluation E01), approve or request revisions, and view post status.
2. `internal-app/`: Internal Admin Portal for Agency managers to monitor the 6 AI agents (A01, B02, B03, D01, D02, E01) and FSM state pipeline across clients.

Based on the official CrewLab logo, the design system must follow a **Modern High-Tech AI** aesthetic supporting both **Dark Mode** and **Light Mode**:
- Dark Mode Background: Deep Obsidian (`#09090B` / `zinc-950`), Surface: Dark Charcoal Slate (`#141417` / `zinc-900`)
- Light Mode Background: Soft Zinc (`#FAFAFA` / `zinc-50`), Surface: Pure White (`#FFFFFF`) with subtle `zinc-200` borders
- Primary Accent: **Electric Lime** (`#D4FF00` / `hsl(72, 100%, 50%)`) for CTA buttons in both modes
- Typography: `Plus Jakarta Sans` for UI & headings, `JetBrains Mono` for agent logs
- UI Library: `shadcn/ui` with Tailwind CSS & Lucide React icons

## 2. Acceptance Criteria (AC)
- [x] **AC-1**: Scaffolding of Next.js frontend applications (`portal/` and `internal-app/`) in the monorepo.
- [x] **AC-2**: Integration of `shadcn/ui`, Tailwind CSS, and CSS variables matching the CrewLab logo palette with Dark/Light theme switching.
- [x] **AC-3**: `portal/` contains a responsive Client Portal dashboard supporting dark and light modes with:
  - Header featuring logo branding, branch selector, and Theme Toggle (Sun/Moon icon)
  - Content Post Card preview (D01 caption, D02 image placeholder, E01 evaluation score badge)
  - 5-State FSM Status Badges (`planned`, `evaluating`, `pending_content_approval`, `approved_ready_to_post`, `posted`)
  - HITL Gate Action buttons: Nút **Approve** (Electric Lime `#D4FF00` with glow effect) & Nút **Request Revision** (Outlined with Sheet/Modal feedback form)
- [x] **AC-4**: `internal-app/` contains an Agency Admin dashboard layout supporting dark and light modes with:
  - Header with Theme Toggle (Sun/Moon icon)
  - 6-Agent pipeline status overview (A01, B02, B03, D01, D02, E01)
  - Agent memory & log terminal mockup
- [x] **AC-5**: Zero build errors, clean linting, and working local dev server commands documented in `AGENTS.md`.

## 3. Scope Boundaries
- **In Scope**: Next.js app setup, Tailwind CSS theme configuration, shadcn component setup, Client Portal UI showcase, Internal Agency UI showcase.
- **Out of Scope**: Real PostgreSQL DB connection, ChromaDB/Hindsight (per MVP scope rule), Meta OAuth (per MVP scope rule).

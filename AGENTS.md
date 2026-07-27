# AGENTS.md — CrewLab

> Read this file fully before doing anything else in this repo. If a request conflicts with anything here, stop and ask the human first — do not silently choose for them.

## What this project is

CrewLab is a multi-agent marketing automation platform for Vietnamese F&B SMEs. Full vision and long-term architecture live in `docs/prd/PRD-CrewLab.md`. **That document is reference material, not the current build target.**

## Active build target (read this before writing any code)

Phase 1 is scoped to `docs/prd/CrewLab-MVP-Scope-v3.5.md`:

- **6 agents**: A01 (Orchestrator), B02 (Content Pillar), B03 (Content Plan), D01 (Caption Writer), D02 (Image Design), E01 (Evaluator).
- **No** ChromaDB — brand voice comes from a short form stored directly in Postgres, no semantic search.
- **No** Hindsight — episodic memory is a plain Postgres table `agent_memory(agent_code, client_id, task_type, input_summary, output_summary, human_feedback, created_at)`.
- **No** Docling/Chonkie ingest pipeline — no long-document upload/RAG.
- **No** Meta Graph API / F01 publisher — publishing is manual; there's a "Mark as posted" button instead.
- **No** G01-G04 analytics agents.
- Full 5-state-minus retry FSM: see MVP-Scope §3 (`planned → ... → evaluating → eval_failed ⟲ → pending_content_approval → approved_ready_to_post → posted`).

**Hard rule:** if a task, spec, or chat message references anything that only exists in PRD-CrewLab full vision (Hindsight, ChromaDB, F01, G01-G04, B01 IMC Planner, Meta OAuth, Telegram bot, campaign/event branching, Pixel Office/virtual office), **stop and ask the human to confirm scope** before implementing it. Do not build the bigger version "because the PRD describes it" — the PRD describes two different scopes and only MVP-Scope is currently authorized.

## Team

Two non-technical founders building this with Antigravity as the primary implementation tool. Neither reads code fluently by default.

- Explain technical concepts in plain language when asked.
- Flag risky or irreversible actions before doing them and wait for confirmation: dropping/altering DB schema, force-push, deploying to production, deleting files outside the current task's scope, rotating secrets.
- Never invent business logic that isn't in the spec or the PRD — ask instead of guessing when a rule is ambiguous.

## Source of truth hierarchy

1. `specs/<NNNN>-<name>/spec.md` for the task currently being worked on — most specific, wins.
2. `docs/decisions/*.md` — recorded decisions that override or clarify the PRD.
3. `docs/prd/CrewLab-MVP-Scope-v3.5.md` — current scope.
4. `docs/prd/PRD-CrewLab.md` — long-term vision, background only.

If these conflict, use this order and flag the conflict to the human instead of silently picking one.

## Working agreement

- Every feature starts from `specs/<NNNN>-<name>/spec.md` before any code is written. If no spec folder exists for the current task, create one first (or ask the human to).
- Acceptance Criteria listed in the spec (copied from the PRD) are the definition of done. Before saying a task is complete, verify against each AC explicitly and report the result.
- Never commit or push directly to `main`. Always work on `feature/<spec-number>-<short-name>` and open a Pull Request.
- Keep commits small and frequent. Use Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- Pull `main` before starting any new task.
- When a decision changes scope, architecture, or a PRD default, write a short entry in `docs/decisions/` — do not leave it only in chat.
- Prefer boring, explicit code over clever abstractions — this codebase will be maintained by non-engineers with AI assistance, not by a team of senior developers.

## Stack (MVP target — confirm before assuming otherwise)

- Backend: FastAPI + Celery + Redis, Python
- DB: PostgreSQL (Supabase)
- Frontend: Next.js — separate `portal/` (client-facing) and `internal-app/` (agency admin) folders in this monorepo
- Deploy: backend → Hetzner VPS via Coolify; frontends → Vercel (root directory set per app)
- LLM: per client config, see MVP-Scope for defaults — do not hardcode a single provider

## Commands

- Dev server (backend):
- Dev server (portal): `cd portal && npm run dev` (runs on http://localhost:3000)
- Dev server (internal-app): `cd internal-app && npm run dev` (runs on http://localhost:3001)
- Run migrations:
- Run tests:
- Lint (portal): `cd portal && npm run lint`
- Lint (internal-app): `cd internal-app && npm run lint`

## Reference

- Glossary of PRD-specific terms (FSM, HITL, Gate, Cycle, RAG, etc.): `docs/glossary.md`
- Architecture decisions log: `docs/decisions/`
- Full spec history: `specs/`

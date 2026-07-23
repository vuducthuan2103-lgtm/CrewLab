<!--
SYNC IMPACT REPORT:
- Version change: none -> v1.0.0
- Ratification Date: 2026-07-18
- Last Amended Date: 2026-07-18
- Description: Initial project constitution defined for CrewLab MVP Scope v3.1.
- Modified principles: None (initial setup)
- Added sections: Core Principles, Technical Constraints & Development Workflow, Governance
- Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ Already aligned
  - .specify/templates/spec-template.md: ✅ Already aligned
  - .specify/templates/tasks-template.md: ✅ Already aligned
- Follow-up TODOs: None
-->

# CrewLab Project Constitution

## Core Principles

### I. Strict MVP Agent Scope (5-Agent Limit)
The active build target for CrewLab is strictly limited to 5 agents: B02 (Content Pillar), B03 (Content Plan), D01 (Caption Writer), D02 (Image Design), and E01 (Evaluator). Any request, code, or design referencing other agents from the master PRD (such as A01, B01, F01, or G01-G04) is strictly out of scope and must be rejected unless authorized by explicit user consensus.
*Rationale: To keep the project focused and ship the initial MVP to pilot fast, avoiding scope creep from the long-term vision.*

### II. No ChromaDB & No Hindsight (Simple Storage First)
Brand voice settings and episodic memory must be stored directly in PostgreSQL (Supabase).
- No vector database (ChromaDB) is allowed.
- No Hindsight engine is allowed.
- Episodic memory must use a plain Postgres table `agent_memory(agent_code, client_id, task_type, input_summary, output_summary, human_feedback, created_at)`.
- Context recall must query the 5 most recent records matching the client and agent code.
*Rationale: Simplicity of database architecture and lower operational cost for the initial MVP stage.*

### III. Finite State Machine (FSM) Compliance
All content generation tasks must follow the strictly defined 5-state-minus retry FSM states: `planned` -> `ready_for_generation` -> `caption_generating` -> `visual_matching` -> `waiting_asset` -> `asset_blocked` -> `visual_generating` -> `evaluating` -> `eval_failed` -> `pending_content_approval` -> `approved_ready_to_post` -> `posted`.
- Job `check_asset_request_expiry` (Celery Beat) must run regularly to transition expired waiting items to `asset_blocked` and notify the Admin.
*Rationale: Ensuring consistent state tracking and human-in-the-loop (HITL) gates without automatic publish integrations.*

### IV. Evaluator Thresholds & Targeted Retries
E01 (Evaluator) must enforce the following validation metrics:
- **Pass**: Caption Score >= 7.0/10 AND Visual Score >= 3.5/5.
- **Retry**: Caption Score 5.0–6.9 OR Visual Score 2.5–3.4. Trigger a targeted retry to the failing agent (D01 for captions, D02 for visual assets) up to 3 times before hard failing.
- **Hard Fail**: Caption Score < 5.0 OR Visual Score < 2.5. Alert the Agency Admin immediately.
*Rationale: Ensure high-quality content output while optimizing token consumption by only retrying the failing components.*

### V. Tech Stack Constraints
Development must strictly adhere to the designated stack:
- Backend: FastAPI, Celery, Redis, PostgreSQL (Supabase), Python 3.12.
- Frontend: Next.js (separated into `portal/` for client-facing and `internal-app/` for agency admin).
- Deployment: Backend to Hetzner VPS via Coolify, Frontend to Vercel.
- LLM: Configuration per-client, not hardcoded.
*Rationale: Establish a unified, scalable stack that matches the production and VPS deployment constraints.*

## Technical Constraints & Development Workflow

### Git & Branching
All development must occur on feature branches named `feature/<spec-number>-<short-name>`. Commits must be small, frequent, and follow Conventional Commits (e.g. `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`). Never commit or push directly to `main`.

### Code Simplicity
Code must be boring, explicit, and easy to maintain by non-engineers with AI assistance. Refrain from introducing complex abstractions or unnecessary design patterns.

### Schema Changes
Any database schema changes must be done via migrations, with high caution for irreversible actions (e.g., dropping columns or tables). Always get explicit user confirmation before executing migration files.

## Governance

- **Amendment Procedure**: Amendments to this constitution must be logged under `docs/decisions/` and the version number must be incremented.
- **Compliance Review**: Every implementation plan (`plan.md`) must start with a "Constitution Check" gate. Any violations must be justified under "Complexity Tracking" or rejected.

**Version**: 1.0.0 | **Ratified**: 2026-07-18 | **Last Amended**: 2026-07-18

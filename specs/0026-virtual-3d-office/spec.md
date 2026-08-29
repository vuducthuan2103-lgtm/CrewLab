# Spec 0026 — Virtual 3D Marketing Office (V1)

## 1. Overview & Vision
The **Virtual 3D Marketing Office** converts CrewLab's background AI agents into an inspectable, spatially coherent workplace. Restaurant/cafe owners can see the 6 MVP agents at their workstations, inspect factual task status via direct selection, and seamlessly jump to existing CrewLab workflow screens. The detailed experience source of truth is the design pack in this spec folder and Decision 0018.

This feature is strictly a **visualization and interaction layer** on top of existing CrewLab backend state and portal routing.

---

## 2. In-Scope vs Out-of-Scope

### In-Scope (MVP V1)
- 1 3D virtual office scene in `portal/app/office/page.tsx` (lazy loaded with `ssr: false`).
- 1 authored canonical campus scene with overview, direct agent selection and guided focus camera.
- 6 Agent workstations & characters:
  - **A01** (Orchestrator - Zone 1: Coordination)
  - **B02** (Content Pillar - Zone 2: Strategy)
  - **B03** (Content Plan - Zone 2: Strategy)
  - **D01** (Caption Writer - Zone 3: Creative Production)
  - **D02** (Image Design - Zone 3: Creative Production)
  - **E01** (Evaluator - Zone 4: Quality Control)
- Visual presentation states: `idle`, `working`, `waiting_human`, `reviewing`, `reworking`, `success`, `error`, `rejected`.
- Agent Detail Sheet (shadcn UI) displaying role, current task, status, and CTA redirecting to existing screens.
- Accessible DOM fallback `[Team]` modal/sheet for screen readers, keyboard-only navigation, and non-WebGL environments.
- 5-10s polling state adapter connecting to existing Portal API / mock adapter.

### Out-of-Scope (Forbidden in V1)
- No additional agents (B01, F01, G01-G04, H01).
- No new workflow engine or direct child-agent chat.
- No database migrations or saving presentation state (`agent_animation`, `agent_emotion`) to Postgres.
- No multiplayer, VR, voice chat, lip sync, mini-games, or office customization.

---

## 3. Technology Stack & Dependencies
- **Next.js**: 14 (App Router, Client Portal)
- **3D Engine**: Three.js (`three`), React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`)
- **Runtime character direction**: reusable R3F primitives first; optimized GLB/glTF characters when the licensed asset pipeline is ready.
- **Local State**: `zustand`
- **UI System**: shadcn/ui (Tailwind CSS, Lucide icons)
- **Testing**: Playwright (`e2e`) + Vitest (`unit`)

---

## 4. Acceptance Criteria

### AC-01: Lazy Loaded Route & Accessibility Fallback
- `/office` loads dynamically without increasing initial load bundle of other portal routes.
- When WebGL is unavailable or user clicks `[Team]`, a standard accessible DOM roster opens with full keyboard support and detail panels.

### AC-02: Direct Agent Inspection & Guided Camera
- Desktop users can hover or keyboard-focus an agent, then click, Enter or Space to open its contextual detail surface.
- Mobile users can tap an agent; the detail surface repositions safely without covering the selected agent's essential context.
- There is no controllable CEO avatar, joystick, walk loop, proximity trigger or collision mechanic.

### AC-03: 6 Distinct Agent Workstations
- All 6 agents (A01, B02, B03, D01, D02, E01) have distinct positions, desk setups, and personality-aligned props.
- Agent layout coordinates are defined in a centralized configuration file.

### AC-04: Real-time State & Visual Presentation
- `office-state-adapter` maps CrewLab backend task status into visual presentation states (`idle`, `working`, `waiting_human`, `reviewing`, `success`, `error`).
- When an agent is waiting for customer feedback (e.g. D02 asset or E01 approval), the agent displays an urgent indicator without requiring a player avatar or proximity trigger.

### AC-05: Agent Detail Panel & Workflow Continuity
- Clicking or tapping an agent opens the shadcn Sheet displaying current status, task summary, and CTA link.
- CTA links navigate directly to existing CrewLab views (`/content-hub`, `/approvals`, etc.) without introducing isolated duplicate workflows.

### AC-06: Performance Target
- Maintains steady 50-60 FPS on desktop and 30+ FPS on modern mobile devices by clamping DPR and optimizing lighting/shadows.

---

## 5. Verification & Test Plan
1. **Unit Tests**: State adapter tests verifying correct mapping from backend domain state to visual states.
2. **E2E Tests**: Playwright tests verifying `/office` loads, direct agent interaction, detail sheet rendering, and `[Team]` DOM fallback.

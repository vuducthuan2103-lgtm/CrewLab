# Decision: 0018 — Virtual Office Experience Revision

**Status:** Accepted (Founder Authorized)  
**Date:** 2026-08-26  
**Supersedes:** Interaction and art-direction portions of Decision 0017 and Spec 0026 that require a controllable CEO avatar, a cyber-slate environment, persistent in-world HUD text, or spectacle-first effects.

## Decision

Virtual Office is an **inspectable living workplace**, not a game or an alternate workflow application. The Portal remains the operational source of truth; the scene makes the six MVP agents and their real state easier to understand spatially.

The canonical experience is:

- an authored biophilic, Soft Organic Modern campus viewed from a mild 3/4 overview;
- six persistent, near-realistic stylized agent characters at owned workstations;
- click, tap, or keyboard focus on an agent to use a smart anchored popup and deep-link to the existing Portal object;
- motion and artefact handoffs only when backed by an actual normalized state or event;
- a dark CrewLab shell around a daylight/evening architectural scene.

## Explicit removals from V1 experience

- No controllable CEO avatar, walking loop, proximity triggers, auto-walk, joystick, or Rapier collision requirement.
- No fake task progress, repeated handoffs, ambient task claims, global red alarm treatment, game-like rewards, confetti, holograms, or neon/cyberpunk lighting.
- No in-world paragraphs, dashboard replicas, or per-tenant architectural customization.

## Scope preserved

- Exactly A01, B02, B03, D01, D02 and E01.
- Read-only visualization over client-scoped workflow data; no workflow mutation or database schema change.
- Accessible DOM roster and keyboard-equivalent inspection remain required.
- React Three Fiber remains the recommended renderer, loaded client-only and with graceful WebGL fallback.

## Consequences

Spec 0026 must use the updated design pack in `specs/0026-virtual-3d-office/` as its experience source of truth. The implementation may reuse safe R3F primitives but must remove old game-controller behavior before it is called complete.

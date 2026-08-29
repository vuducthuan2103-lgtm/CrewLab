---
name: crewlab-character-runtime
description: Integrate CrewLab Virtual Office characters into React Three Fiber. Use for GLB loading, scene character components, agent state animation mapping, desk anchors, interaction, LOD, or runtime character performance in portal/features/virtual-office.
---

# CrewLab Character Runtime

Keep the runtime deterministic, inspectable, and separate from asset authoring.

## Required context

Read `docs/virtual-office/character-pipeline.md`, `docs/virtual-office/CHARACTER_BIBLE.md`, and Spec 0026 before changing runtime code.

## Runtime contract

- Load one canonical character component with role-specific asset and identity data.
- Map application state to named clips through a pure mapping layer; do not hide business state inside Three.js objects.
- Use the documented seat, pelvis, foot, hand, keyboard, monitor, and gaze anchors.
- Keep asset loading and preload paths explicit.
- Reuse vectors, quaternions, materials, and mixers; do not allocate them every frame.
- Dispose manually created resources and cancel mixer actions on unmount.
- Clamp DPR and shadow work to the budgets in the Character Bible.
- Preserve direct click/focus inspection of agents and accessible DOM alternatives.

## Forbidden legacy behavior

Do not create a CEO/player avatar, keyboard locomotion, auto-walk, proximity sensors, collision body, CEO attention queue, or CEO-facing head tracking. Urgent agents communicate through their status indicator and panel; the user opens them directly.

## Verification

Run focused virtual-office tests, full Portal tests, lint, and a production build. Then load `/office`, verify every agent renders at its intended desk, exercise state transitions, inspect console errors, and record FPS/draw-call/triangle/texture-memory evidence where browser tooling permits.

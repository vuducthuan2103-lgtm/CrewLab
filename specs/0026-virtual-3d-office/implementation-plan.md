# Virtual Office — Production Plan

## Phase A — Design lock

1. Keep `design-brief.md`, `floor-plan.md`, `art-direction.md`, and `visual-state-contract.md` as the implementation source of truth.
2. Produce five review keyframes: canonical morning overview, selected-agent popup, factual handoff, localized blocked state, and evening overview; include a mobile crop.
3. Record any approved third-party visual asset licences.

## Phase B — Prototype correction

1. Make `/office` a lazy client-only route and link it from Portal navigation.
2. Remove CEO navigation/proximity/game controls and confetti-like effects.
3. Replace cyber-slate/holographic scene vocabulary with the canonical campus scene.
4. Use direct agent selection, keyboard focus and a smart anchored detail surface.
5. Preserve an accessible DOM roster and a static image + DOM fallback for failed WebGL.

## Phase C — Data and motion

1. Introduce one adapter that normalizes client-scoped workflow data into `OfficeVisualAgent` and events.
2. Poll or subscribe only through existing authorized Portal APIs; do not alter backend workflow objects or schema.
3. Make all progress and handoff choreography conditional on factual data.

## Phase D — Quality gate

- Unit-test state mapping and absence-of-data behavior.
- Test mouse, keyboard, touch and reduced-motion interactions.
- Verify `/office` does not add 3D code to unrelated-route initial bundles.
- Test WebGL failure fallback and accessible DOM roster.
- Benchmark DPR/quality tiers; target stable 30 FPS minimum on supported mobile and the best stable desktop pacing possible.

## Release criteria

The office is ready only when its state is client-scoped and factual, each of six agents is identifiable and inspectable without a mouse, no game-controller requirement remains, and every CTA reaches an existing Portal surface.

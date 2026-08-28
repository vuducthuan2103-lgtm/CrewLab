# CrewLab Virtual Office — Archviz v4 Iteration Plan

## Goal
Replace the v3 diorama look with a browser-ready architectural-visualization scene that matches the supplied reference in camera, spatial density, adult scale, materials, vegetation, water, lighting, and workstation detail while preserving the six-agent interactions.

## Tasks
- [x] 1. Lock a visual rubric and six fixed comparison views (overview, workstation, agent, ficus, waterfall, pavilion) → Verify: every view has explicit target notes and a 1–5 score for composition, form, material, light, and scale.
- [x] 2. Generate fresh standalone v4 references for all six views plus seamless material sources → Verify: each image is readable at full size and belongs to one consistent architectural world.
- [x] 3. Rebuild the architectural shell and curving hardscape/water network at adult scale → Verify: overview matches the target's deep atrium perspective and no longer reads as a rectangular tabletop.
- [x] 4. Rebuild one hero workstation and one adult agent to production quality, then instance six role variants → Verify: workstation close-up has layered desk construction, monitor arms, peripherals, cabling, ergonomic chair, hands, face, clothing, and correct proportions.
- [x] 5. Rebuild the ficus, planted islands, waterfall brand wall, and Focus Pavilion from their dedicated references → Verify: each detail render scores at least 4/5 for silhouette and material hierarchy.
- [x] 6. Add a real PBR material stack, UV variation, glazing, water response, emissive screens, practical fixtures, and photographic color management → Verify: no dominant plastic/clay read remains in close-ups.
- [x] 7. Run iteration A (composition), B (asset/material), and C (lighting/runtime), changing one class of variables per loop → Verify: save a render and scorecard for every loop; no regression across the six fixed views.
- [x] 8. Bake/instance/LOD/compress the approved scene for WebGL while retaining a high-quality desktop tier → Verify: bounded draw calls, model size budget, no missing texture, stable frame delivery, and graceful mobile fallback.
- [x] 9. Integrate v4 into the existing R3F interaction layer without changing agent workflow → Verify: six labels, hover/select/focus, inspector, keyboard accessibility, and reset camera all pass.
- [x] 10. Run final tests, lint, production build, HTTP/model checks, visual review, and a scoped Git commit → Verify: only v4 files are committed; the user's existing spec edit remains untouched.

## Done When
- [x] The overview reads as a premium glass-atrium office rather than a diorama.
- [x] The six fixed renders each score at least 4/5 overall; overview composition and human scale score 5/5.
- [x] The runtime remains a real orbitable 3D scene and preserves all current office interactions.

## Notes
- The supplied image is the visual target, not a source mesh; fidelity will be judged by repeatable views and visible evidence rather than claiming pixel identity.
- The reference's UI overlays remain DOM UI. They will not be baked into the GLB.
- Work stays in `D:\CrewLab`, on the current feature branch, and on `localhost:3000`.

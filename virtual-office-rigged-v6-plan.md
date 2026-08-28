# CrewLab Virtual Office — Rigged Character v6

## Goal
Replace every 2.5D employee card with a fully modeled, skinned and animated 3D worker, then tighten the environment against the original cinematic garden-office reference without breaking the six live agent interactions.

## Tasks
- [x] Research a license-safe human pipeline and reject sprite/multi-view impostor approaches → Verify: chosen source supports mesh, skeleton, clothing and redistribution.
- [x] Install MPFB2 plus only the CC0 system and sitting-pose packs into the existing portable Blender toolchain → Verify: Blender 5.2 registers the extension and can enumerate its human/rig operators in background mode.
- [x] Generate six distinct adult Vietnamese/Asian office-worker source characters with role-specific body, hair and outfit variants → Verify: six source scenes contain real geometry, materials and armatures; no image planes.
- [x] Create seated typing, idle-breathing, review/head-turn and success gesture animation clips → Verify: each exported character has a skin, joints and at least three named clips with non-zero keyframes.
- [x] Run front and rear/side character QA in Blender and the live orbit camera → Verify: silhouettes, clothing deformation and face direction remain stable away from the hero view.
- [x] Build the v6 office scene from the accepted v5 architecture, remove all photographic character cards, add modeled chairs/desk props and refine material/plant depth → Verify: six workers remain visible and no billboard/person texture remains in the GLB.
- [x] Integrate skeletal animation with agent visual states in React Three Fiber → Verify: working types, idle breathes, reviewing scans, waiting gestures and success celebrates without per-frame allocations.
- [x] Run hard QA: GLB structure inspection, multi-angle render inspection, performance budget, tests, lint, production build and localhost runtime → Verify: six armatures/skins load, animations advance over time, `/office` and all assets return 200.
- [x] Commit only v6-scoped work on `feature/0026-virtual-3d-office` → Verify: the user's existing spec edit remains unstaged and port 3000 remains the only Portal URL.

## Done When
- [x] There are zero 2D employee cards in the runtime scene.
- [x] Every employee is a real 3D skinned mesh that remains stable when the camera orbits behind and beside them.
- [x] Agent state changes visibly drive appropriate body animation.
- [x] The default composition preserves the original image's ficus, water, waterfall, pavilion, warm dappled light and six-desk hierarchy.

## Notes
- More reference images are useful for art direction, but multi-angle raster images are not accepted as a substitute for geometry.
- MPFB2/MakeHuman core output and bundled system assets are CC0; third-party packs are excluded unless their license is recorded.
- Character source files may be heavier than runtime GLBs; web exports must use texture/mesh budgets and shared animation clips.

# CrewLab Character Pipeline — Phase 0

## Goal
Audit the current A01 character and web runtime with reproducible evidence before selecting or building a production character pipeline.

## Tasks
- [x] Read spec, decisions, runtime architecture, package versions, skills/MCP, Git LFS and asset layout.
- [x] Trace character loading, skeleton animation, agent-state mapping, camera, lighting, interaction and workstation transforms.
- [x] Inspect A01 GLB structure, geometry, rig, materials, morphs, textures and runtime size.
- [x] Measure the current asset/HTTP baseline; record browser FPS as unavailable because the in-app browser policy rejected localhost control.
- [x] Capture A01 overview, focus, face, seated front/side and working-state screenshots.
- [x] Score current face, eyes, hair, hands, clothing, pose, clipping, deformation and close-up quality.
- [x] Decide whether the current source can reach the target and document the canonical pipeline recommendation.
- [x] Write `docs/virtual-office/CHARACTER_PIPELINE_AUDIT.md` and verify every Phase 0 requirement.

## Done When
- [x] The audit contains measured facts, baseline images, explicit blockers and a founder decision gate for A01 only.

## Notes
- Do not install tools, optimize assets, or create B02–E01 during Phase 0.
- Preserve all existing uncommitted pose, turntable and character experiments.

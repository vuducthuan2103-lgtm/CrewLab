# CrewLab Virtual Office — Cinematic Hybrid 3D v5

## Goal
Close the visible gap to the original cinematic office reference while preserving a real orbitable R3F scene, six functional agent hotspots, and the existing Portal workflow.

## Tasks
- [x] 1. Generate a fresh v5 master plus six role-specific seated-worker assets and exterior/foliage layers → Verify: every asset is standalone, full-size, consistent with one late-morning visual world, and stored in the repo.
- [x] 2. Build a deterministic asset-prep pipeline for checker removal, alpha matting, edge cleanup, trim and POT export → Verify: six character textures contain nontrivial alpha, no visible checker pixels and clean silhouettes at 100% zoom.
- [x] 3. Author a v5 Blender overlay that reuses the stable v4 architecture but replaces procedural people/chairs with photoreal alpha cards and adds an exterior depth plate → Verify: a close hero render shows realistic adults and no flat gray background.
- [x] 4. Recompose the camera, stone paths, planted borders and water hierarchy against the v5 master → Verify: exactly six complete desks remain visible; no tabletop edge; foreground occupancy and depth match the target.
- [x] 5. Rebuild the lighting grade with harder dappled sun, darker material range, cool water bounce and controlled glass reflections → Verify: stone grain, wood, skin, foliage and pavilion glass remain distinct without plastic highlights.
- [x] 6. Run H1/H2/H3 render loops, changing one variable family per loop and recording the rejection reason → Verify: final overview scores at least 4/5 for target similarity, composition, material, lighting, people and depth.
- [x] 7. Export and inspect the v5 GLB, then connect it to the existing R3F model/camera/hotspots → Verify: GLB imports cleanly, textures resolve, model stays within a 28 MB desktop budget and all six labels align.
- [x] 8. Verify the actual application with tests, lint, production build, HTTP asset checks and a fresh `/office` interaction → Verify: 25+ tests pass, build succeeds, page/model return 200 and agent inspector still opens.
- [x] 9. Commit only v5-scoped files on `feature/0026-virtual-3d-office` → Verify: the user's existing spec edit remains unstaged and localhost stays on port 3000.

## Done When
- [x] The default view is recognizably the same cinematic garden-office world as the original reference, not a clean procedural diorama.
- [x] Six photoreal adult workers, layered planting, exterior depth, waterfall, pavilion, water and desks all read at normal laptop size.
- [x] The scene remains genuinely 3D and orbitable; image assets enhance surfaces/characters rather than replacing the whole office with one flat screenshot.

## Notes
- The original image is the target for visual hierarchy and realism; UI panels remain live DOM and are never baked into the model.
- Hybrid alpha cards are allowed for people and background foliage because they preserve WebGL performance while the architectural shell, water, camera and interactions remain 3D.
- Every render loop must be compared against both the original target and `references/v5/ref-01-master-overview.png`; success is not inferred from render completion alone.

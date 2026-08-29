# Virtual Office Photoreal Asset Rebuild

## Goal

Replace the rejected low-poly office with a web-ready 3D scene that preserves the supplied reference's cinematic tropical atrium, warm premium materials, organic circular layout, six readable agent stations, and dark operational HUD.

## Visual acceptance gates

- Fixed overview camera reads as a sunlit architectural visualization, not a toy diorama.
- Floor is warm limestone with visible joints and restrained roughness variation; teal is limited to water, glass, screen light, and small accents.
- Hero ficus has a gnarled multi-root trunk, layered branch silhouette, and dense leaf-card canopy with visible light breakup.
- Six stations use curved oak desks, fluted light-stone bases, dark ergonomic chairs, multiple translucent cyan monitors, and small desk props.
- Two background pavilions read as glass/metal architectural volumes; the right pavilion contains a furnished focus lounge.
- Water channels have depth, edge coping, reflections, ripples, and planted borders.
- People have believable seated proportions and distinct silhouettes at the overview distance.
- DOM overlays stay crisp and dark, while hotspot anchors remain attached to their corresponding 3D stations.
- Desktop target: stable interaction at 1440x900; model payload target under 12 MB; no more than 180 draw calls after load.

## Production tasks

1. Generate separate, large reference images for the overview, architecture, workstation, ficus, seated agents, and material/lighting system; save all selected outputs in the repo.
2. Extract a compact art-direction sheet: camera, proportions, palette, material response, silhouette, lighting ratios, and detail priorities.
3. Build a new Blender v3 source with reusable collections for environment, water, architecture, vegetation, furniture, characters, lights, and hotspot anchors.
4. Author web-safe PBR materials and texture atlases; use alpha cards and instancing for foliage instead of sphere canopies.
5. Render fixed Cycles overview and detail views, compare against the visual gates, and iterate before export.
6. Export a versioned glTF/GLB with embedded textures, normalized scale, stable named nodes, and predictable hotspot transforms.
7. Integrate v3 into the existing React Three Fiber scene while preserving focus controls, agent selection, loading fallback, and HUD behavior.
8. Verify payload and draw-call budgets, then test the live office at desktop and compact widths.
9. Run focused tests, lint, and production build; inspect the final cold load for console/network errors.
10. Commit only scoped 0026 files and leave the user's existing spec edit untouched.

## Comparison views

- `overview`: the exact production camera used by the Portal.
- `workstation`: 3/4 close view of one complete agent station.
- `tree-water`: ficus roots, planting, limestone coping, and water interaction.
- `pavilion`: glass, metal, wood shelving, sofa, and practical lighting.

## Explicit exclusions

- No flat full-scene background posing as 3D.
- No low-poly sphere foliage, glossy teal floor slab, or placeholder monitor rectangles.
- No unrelated backend, authentication, database, or workflow changes.
- No new port, worktree, component library, or hosted runtime.

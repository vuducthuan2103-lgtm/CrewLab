# CrewLab Virtual Office — Rooftop Environment Audit

**Phase:** 0 — baseline and implementation map  
**Date:** 2026-09-01  
**Branch:** `feature/0026-virtual-3d-office`  
**Approved invariant:** the six desk positions, six agent anchors, Focus Zone, left feature, radial circulation, selection flow, CTA flow and accessibility flow remain unchanged.

## Executive finding

The active office is a versioned Blender-authored GLB, not the legacy React primitive scene. The visible rainforest comes from two authored layers inside `garden-office-v8.glb`: a 2048×1024 image plane inherited from v5 and a dense 430-card exterior canopy inherited from the base scene. The central tree is also inherited from the original mature ficus and then made denser in v8. Runtime material tuning cannot solve those silhouette and depth problems; the correct seam is a new versioned Blender environment export.

The replacement direction is therefore:

```text
OFFICE → GLASS → NEAR TERRACE GEOMETRY → MID ROOFTOP GARDEN → FAR LOW-DETAIL CITY
```

No third-party asset or new runtime package is required for the approved direction.

## Production render path

| Concern | Active implementation |
| --- | --- |
| Route | `portal/app/office/page.tsx` |
| Browser-only shell | `portal/features/virtual-office/components/VirtualOffice.tsx` |
| WebGL boundary / camera | `portal/features/virtual-office/components/OfficeCanvas.tsx` |
| Lighting / fog / environment | `portal/features/virtual-office/scene/GardenOfficeScene.tsx` |
| GLB loader / material tuning | `portal/features/virtual-office/scene/GardenOfficeModel.tsx` |
| Active environment | `portal/public/virtual-office/garden-office-v8.glb` |
| Environment source | `portal/public/virtual-office/garden-office-v8.blend` |
| Environment authoring entry | `scripts/blender/build_virtual_office_v8.py` |
| Six character seam | `portal/features/virtual-office/scene/RiggedAgentCharacter.tsx` + six v14 GLBs |

`OfficeRoom.tsx`, `OfficeLighting.tsx` and `WorkstationDesk.tsx` are legacy/alternative seams and are not mounted by the active office route.

## Authoring inheritance map

The active environment builder is intentionally layered:

```text
build_virtual_office_v8.py
  → build_virtual_office_v7.py
    → build_virtual_office_v6.py
      → build_virtual_office_v5.py
        → build_virtual_office.py
```

This inheritance explains why v8 still contains art that its own top-level file does not explicitly create.

| Element | Current source |
| --- | --- |
| Heavy central tree | `build_virtual_office.py:create_tree`, then extra v8 branches/cards in `create_tree_v8` |
| Forest image immediately behind glass | `build_virtual_office_v5.py:create_pavilions_v5` (`V5 Exterior Garden Plate`) |
| Dense exterior canopy wall | `build_virtual_office.py:create_pavilions` (`Exterior garden canopy`) |
| Indoor planted beds | `build_virtual_office_v8.py:create_landscape_details_v8` |
| Glass geometry | `build_virtual_office.py:create_pavilions`, extended by v8 pavilion geometry |
| Glass source material | `Low iron architectural glass` in `build_virtual_office.py:make_materials` |
| Workstation geometry and local roots | `build_virtual_office.py:create_station` |
| Monitor geometry | `build_virtual_office.py:create_monitor` |
| Browser light rig | `GardenOfficeScene.tsx` |
| Blender validation light rig | `build_virtual_office_v8.py:create_lighting_and_camera_v8` |

## Baseline asset metrics

### Runtime environment GLB

Measured with `@gltf-transform/core` against the active file.

| Metric | v8 baseline |
| --- | ---: |
| File size | 15,757,876 B |
| Nodes | 37 |
| Meshes | 25 |
| Primitives / potential environment draw calls | 25 |
| Vertices | 206,387 |
| Triangles | 325,458 |
| Materials | 24 |
| Embedded textures | 11 |
| Embedded texture bytes | 7,167,883 B |
| Estimated decoded RGBA texture memory | 52,427,408 B |

The forest backplate alone accounts for 603,065 compressed bytes and approximately 8,388,608 decoded RGBA bytes.

### Authored Blender source

Measured by `scripts/blender/audit_virtual_office_environment.py` before runtime batching/modifier application.

| Category | Objects | Source triangles | Materials |
| --- | ---: | ---: | ---: |
| Whole source scene | 1,051 | 83,638 | 24 |
| Central tree and planter | 103 | 16,316 | 7 |
| Forest backplate + canopy | 2 | 862 | 2 |
| Indoor vegetation | 15 | 1,096 | 2 |
| Six workstation monitor assemblies | 150 | 4,200 | 4 |
| Glass meshes | 26 | 312 | 1 |

The source contains 969 non-water mesh objects that would be shadow-caster candidates if used individually. Runtime batching reduces the environment to 25 primitives, but the current React material pass still marks every non-water environment batch as a shadow caster.

### Six active v14 characters

The characters are outside this art task but are included to explain browser totals.

| Metric | Six-character total |
| --- | ---: |
| File size | 6,333,232 B |
| Triangles | 338,306 |
| Primitives | 219 |
| Materials | 132 |
| Animation clips | 48 |

## Browser baseline

Fixed conditions:

- route: `http://localhost:3000/office`;
- viewport: 1440×900;
- canvas: 1372×900 after the Portal rail;
- default overview camera, no selected agent;
- late-morning scene state;
- warm asset cache after the loading overlay cleared;
- three consecutive 3-second samples from the live R3F renderer.

| Sample | FPS | WebGL draw calls | WebGL triangles |
| --- | ---: | ---: | ---: |
| 1 | 9.6 | 480 | 1,305,880 |
| 2 | 9.4 | 480 | 1,305,880 |
| 3 | 9.5 | 480 | 1,305,880 |

The renderer totals include shadow passes. The approximately 480 calls align with 25 environment primitives + 219 character primitives rendered through the main and shadow passes. Phase 0 therefore records the current 50–60 FPS product target as **not met before this overhaul**. This environment pass must not regress the measured baseline and should reduce environment/shadow cost, while character primitive consolidation remains a separate task.

## Baseline screenshots

- `specs/0026-virtual-3d-office/assets/rooftop-environment/before-default-camera-desktop-1440x900.png`
- `specs/0026-virtual-3d-office/assets/rooftop-environment/before-default-camera.png`
- Machine-readable source metrics: `specs/0026-virtual-3d-office/assets/rooftop-environment/baseline-v8-source-metrics.json`

## Confirmed visual problems

1. The forest plate is approximately 0.7 m behind the rear glass, so it reads as a wall rather than a far landscape.
2. The 430-card exterior canopy reinforces the same wall and removes sky/city negative space.
3. The central ficus uses 17 crown anchors plus 1,280 base canopy cards, 440 v8 detail cards and 132 understory cards. It reads as one dense mass and blocks the exterior.
4. The tree has seven heavy fused stems, thirteen buttress roots and extensive low branching; its silhouette is mature-jungle rather than landscape-architect selected.
5. Indoor beds repeat one atlas-card family with similar silhouette and density.
6. The current world/background is green-gray and the fog shares that cast, reinforcing the greenhouse read.
7. Glass runtime opacity is 0.18, slightly denser than the requested 85–95% visual transparency range.
8. Every non-water environment batch casts real-time shadows, including distant/background content.
9. Monitor screen geometry is offset along workstation-local `-Y`, while the seated operator is on local `+Y`. The visible screen plane therefore faces away from the operator on all six rooted workstation layouts.
10. Screens are emissive, but generic identical strokes and the reversed face make several overview monitors read as black backs.

## Approved implementation seam

Create a new `garden-office-v9` Blender/GLB pair that imports the approved v8 generator but explicitly replaces the inherited forest/tree/planting layers. Keep the six station roots and their exact positions. Correct monitor-facing direction in workstation-local coordinates before the station root rotation is applied. Use source-authored primitives and shared materials so Blender can continue batching by material.

The v9 depth tiers are:

| Tier | Distance behind rear glass | Representation | Shadow policy |
| --- | --- | --- | --- |
| Near | roughly 2–5 m | real stone/deck, low planter geometry, open walkway | selected architecture only |
| Mid | roughly 5–20 m | shared-material planters, lounge, controlled shrubs, 3–5 open-crown trees | only nearest hero forms |
| Far | 20 m+ | low-detail procedural skyline and sky gradient | no dynamic shadows |

## Package, asset and licence decision

- Existing Three/R3F/Drei stack is sufficient.
- Existing Blender 5.2 LTS and project-local scripts are sufficient.
- Existing `@gltf-transform/core` is sufficient for inspection.
- No new package, plugin or MCP is approved or required.
- No external asset is required for v9. New architecture, vegetation, skyline and monitor UI will be project-generated geometry using existing project-owned textures/materials.
- Existing source texture provenance remains project-owned/generated according to the checked-in virtual-office reference records; the forest plate will be removed from runtime.

## Phase 0 gate

- [x] AGENTS, Spec 0026 and Decisions 0017/0018 reviewed.
- [x] Active branch and dirty state inspected; unrelated user changes identified and left untouched.
- [x] Production scene path located with codebase-memory-mcp.
- [x] Tree, backdrop, planters, glass, lighting, camera and loader mapped.
- [x] R3F/Three/Drei and post-processing state inspected.
- [x] Fixed baseline screenshot captured.
- [x] Source/runtime asset metrics recorded.
- [x] Browser FPS/draw-call/triangle baseline measured from the live scene.
- [x] No new dependency installed.

**Phase 0 status: PASS.** The build can proceed to removal of the inherited rainforest layer and the v9 rooftop blockout.

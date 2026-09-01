# Phase 4/5 — Urban rooftop environment quality gate

Date: 2026-09-01

Runtime asset: `garden-office-v9.glb`

Viewport: 1440×900

## Evidence

- Baseline: `before-default-camera-desktop-1440x900.png`
- Final default view: `phase-5-final-default-camera-desktop-1440x900.png`
- Final slight-side view: `phase-5-final-slight-side-desktop-1440x900.png`
- Authored source audit: `phase-5-environment-v9-source-metrics.json`

## Preserved product invariants

- Six desks, six named agents and their existing station roots remain in place.
- Focus Zone, left strategy feature, radial circulation and central A01 hub remain.
- Agent selection, camera focus, inspector, quick navigation and accessibility roster remain functional.
- No CEO or seventh character was introduced.

## Measured result

| Metric | v8 baseline | v9 final | Result |
| --- | ---: | ---: | --- |
| Runtime GLB size | 15,757,876 B | 15,458,276 B | -1.9% |
| Runtime GLB triangles | 325,458 | 340,282 | +4.6%, below 350k gate |
| Runtime primitives | 25 | 30 | at 30-primitive gate |
| Runtime textures | 11 | 11 | unchanged |
| Authored source triangles | 83,638 | 83,870 | +0.3% |
| Forest backdrop objects | 2 | 0 | removed |
| Central-tree source triangles | 16,316 | 7,840 | -52.0% |
| Indoor-vegetation source triangles | 1,096 | 942 | -14.1% total; foliage cards thinned 25% |
| Exterior-vegetation source triangles | 0 | 6,560 | four specimens plus A/B/C planting |
| Skyline source objects / triangles | 0 / 0 | 52 / 1,392 | real low-detail 3D depth layer |
| Minimum monitor-to-operator direction dot | negative before fix | 0.508885 | all six stations pass |

## Browser performance

Conditions match the Phase 0 baseline: warmed asset cache, default overview,
1440×900 viewport and three consecutive three-second R3F samples.

| Sample | FPS | Draw calls | Rendered triangles |
| --- | ---: | ---: | ---: |
| 1 | 15.9 | 496 | 1,353,583 |
| 2 | 16.0 | 496 | 1,353,583 |
| 3 | 15.8 | 496 | 1,353,583 |

The Phase 0 baseline was 9.4–9.6 FPS, 480 calls and 1,305,880 rendered
triangles on the same browser. The final scene improves measured frame rate by
approximately 66% while adding the rooftop, vegetation and city depth layers.
The sixteen extra calls come from five additional environment material batches
and their shadow passes. Micro character meshes no longer cast shadows, DPR is
bounded at 1.25 and the contact-shadow pass is limited to one frame.

The requested 30–60 FPS product aspiration is not met on this machine. The
remaining dominant cost is the unchanged six-character set (219 primitives,
338,306 source triangles), not the 30-primitive environment. Further large
gains require a separate character material/primitive consolidation pass.

## Visual and functional gate

- [x] Rainforest image and dense canopy wall are absent from the runtime GLB.
- [x] The exterior reads as an urban rooftop with near, middle and far depth.
- [x] City towers are grounded by separated low podiums and remain subordinate to the office.
- [x] Exactly four exterior specimen trees use open crowns and do not hide either pavilion.
- [x] The central tree has a lighter umbrella silhouette and visible negative space.
- [x] Interior planting is controlled without moving approved planters.
- [x] Rear/side glass remains transparent; alternating mullions were removed to open the view.
- [x] Daylight is bright neutral blue-white without the previous yellow-green cast.
- [x] Monitor UI faces the seated operator at all six desks.
- [x] Default and slight-side views contain no floating geometry or broken pavilion intersections.
- [x] A01 hotspot opens the live inspector and its close action returns to the overview.
- [x] Browser console contains no warning or error after warm load and interaction.
- [x] Asset tests, complete Portal test suite, TypeScript and lint pass.

Result: **PASS** for the urban rooftop environment overhaul. The environment
is ready for production-build verification and branch publication.

# Phase 3 — Central tree quality gate

Date: 2026-09-01  
Runtime asset: `garden-office-v9.glb`

## Evidence

- Before: `before-default-camera-desktop-1440x900.png`
- New front view: `phase-3-tree-front-desktop-1440x900.png`
- New slight-side view: `phase-3-tree-slight-side-desktop-1440x900.png`
- Source metrics: `phase-3-v9-source-metrics.json`

## Measured change

| Metric | Old tree | New tree | Result |
| --- | ---: | ---: | --- |
| Source objects | 103 | 63 | -38.8% |
| Source triangles | 16,316 | 7,840 | -52.0% |
| Whole GLB size | 15,757,876 B | 14,982,776 B | -4.9% |
| Whole GLB triangles | 325,458 | 325,956 | within 350k budget |
| Whole GLB primitives | 25 | 29 | within 30 budget |
| Textures | 11 before forest removal | 11 | within 12 budget |

The whole-scene triangle comparison includes the new rooftop hardscape, so it
does not isolate the tree. The source-tree measurement does.

## Visual gate

- [x] Tree looks lighter than the old tree.
- [x] Trunk mass is significantly reduced.
- [x] Canopy reads as a horizontal architectural umbrella.
- [x] Visible negative spaces remain between foliage clusters and branches.
- [x] Rooftop is visible through the canopy.
- [x] Future skyline can remain visible behind the canopy.
- [x] A01 remains visible and unobstructed by foliage.
- [x] Tree no longer reads as a jungle specimen.
- [x] Tree remains the visual centerpiece.
- [x] Tree integrates with the existing circular planter.

Result: **PASS**. Phase 4 exterior vegetation may proceed.

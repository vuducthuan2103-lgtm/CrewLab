# Phase 1 — Environment Foundation Milestone

## Status

Implemented and integrated on `feature/0026-virtual-3d-office`. This milestone replaces the active v7 environment with a new versioned v8 asset while leaving the six-agent state, selection, popup, CTA and accessibility paths intact.

## Files changed

- `scripts/blender/build_virtual_office_v8.py`
- `portal/public/virtual-office/garden-office-v8.blend`
- `portal/public/virtual-office/garden-office-v8.glb`
- `portal/public/virtual-office/garden-office-v8-preview.png`
- `portal/public/virtual-office/garden-office-v8-a01-closeup.png`
- `portal/public/virtual-office/garden-office-v8-d02-closeup.png`
- `portal/features/virtual-office/scene/GardenOfficeModel.tsx`
- `portal/features/virtual-office/scene/GardenOfficeScene.tsx`
- `portal/features/virtual-office/components/OfficeCanvas.tsx`
- `portal/tests/virtual-office-environment-asset.test.ts`

## Assets added

- One deterministic Blender source and runtime GLB.
- One 16:9 environment proof plus A01 and D02 workstation proof renders.
- Three project-local art-direction references for environment, workstation and character production.

No third-party models, runtime CDN assets or unrecorded licences were introduced.

## Visual changes

- Layered inner promenades and larger curved water perimeter create foreground/midground/background separation.
- Repeated circular pots are replaced by four smooth integrated beds with rocks and low foliage.
- The left water wall becomes an occupied strategy pavilion; the right Focus Zone receives timber roof language, living-wall depth and stronger architectural framing.
- Hero tree receives warmer bark, secondary branch/crown detail, planter stones and better architectural integration.
- All six desks retain their positions and receive role props: A01 workflow lens, B02 source cards, B03 calendar tiles, D01 manuscripts, D02 pen display/palette, E01 comparison/check surfaces.
- Runtime gains local lightformer reflections, stronger daylight hierarchy, tighter contact shadows, calmer water/screen emission, less vignette and smaller labels.

## Performance

| Metric | v7 baseline | v8 |
| --- | ---: | ---: |
| GLB size | 15,548,808 B | 15,757,876 B |
| Environment triangles | 315,750 | 325,458 |
| Environment primitives | 24 | 25 |
| Materials | 22 | 24 |
| Textures | 12 | 12 |

The environment remains batched to 25 primitives. Six current characters add 105,868 triangles and 406 primitives; character draw-call consolidation remains the largest optimization target for Phase 3.

## Screenshots

- `portal/public/virtual-office/garden-office-v8-preview.png`
- `portal/public/virtual-office/garden-office-v8-a01-closeup.png`
- `portal/public/virtual-office/garden-office-v8-d02-closeup.png`

## Verification

- Blender v8 source generated and exported successfully.
- GLB: 15,757,876 bytes, 325,458 triangles, 25 primitives, 12 textures.
- Portal tests: 38/38 passed before adding the dedicated v8 budget test; the full suite is rerun after this report.
- Lint: no errors; existing unrelated warnings remain.
- Production build: passed.
- Local HTTP: `/office`, v8 GLB and all six v10 character GLBs return 200.
- Browser screenshot/console proof is not claimed: the in-app browser rejected the localhost reload during this run.

## Known issues / next phase

- Current v10 characters are real articulated 3D, but remain an interim rigid-hierarchy tier with no skeletal clip library and too many primitives.
- Workstation furniture is materially improved but still below the generated close-up reference in chair upholstery, screen content and fine junction detail.
- Phase 2 should deepen per-role station silhouettes; Phase 3 should replace/consolidate characters through a licensed optimized humanoid pipeline rather than another procedural body patch.

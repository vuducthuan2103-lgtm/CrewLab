# Phase 7 quality gate — centered camera and balanced blue-hour skyline

## Approved direction

- The default overview camera is centered on the A01/tree axis (`x = 0`).
- Manual orbit is retained after pointer release and is bounded to roughly
  `-76.6° … +76.6°`; there is no 360-degree orbit or automatic return.
- A compact `LocateFixed` control explicitly returns the view to the centered
  overview.
- The exterior uses a cool early-evening blue-hour plate. The middle skyline
  is populated enough to read as a city, while the upper half remains open sky.
- The removed close 3D tower layer is not restored. Rooftop terraces,
  vegetation and furniture remain authored 3D geometry.

## Runtime asset audit

| Check | Result |
| --- | ---: |
| GLB size | 17,663,756 bytes |
| Runtime mesh primitives | 32 |
| Runtime triangles | 357,764 |
| Runtime textures | 13 |
| Source skyline objects | 1 |
| Source skyline triangles | 2 |
| Exterior vegetation | 124 objects / 13,016 triangles |
| Monitor orientation | all face operator; minimum dot 0.508885 |

The skyline is one far-LOD plane, so the denser city composition adds no mesh
or draw-call growth compared with the sparse variant.

## Verification

- `npm.cmd test -- tests/virtual-office-environment-asset.test.ts`: 4/4 passed.
- `npm.cmd test`: 57/57 tests passed across 14 files.
- `npm.cmd exec tsc -- --noEmit`: passed.
- `npm.cmd run lint`: passed with pre-existing image/font warnings only.
- `GET http://localhost:3000/office`: HTTP 200 after a clean dev-server start.
- Center-equivalent Blender QA render: `phase-7-final-centered-balanced-blue-hour.png`.
- Browser automation could not complete pointer-drag replay because the local
  URL was blocked by the browser-control security layer. The interaction
  contract is covered by source assertions and the live route remains
  available for manual inspection.

## Generated background lineage

- Final source plate:
  `portal/public/virtual-office/textures/rooftop-v10/city-skyline-balanced-blue-hour-v5.png`
- The final edit preserves the cool dusk palette and adds a layered central
  skyline of varied-height towers without returning to a wall-to-wall city.
- Earlier v2–v4 generated plates are retained as non-destructive design
  variants.

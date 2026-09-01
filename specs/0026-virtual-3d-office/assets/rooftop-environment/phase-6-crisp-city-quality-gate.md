# Phase 6 — Crisp City Exterior Quality Gate

Date: 2026-09-01  
Runtime asset: `garden-office-v10.glb`  
Source asset: `garden-office-v10.blend`

## Reference gap addressed

- Replaced the pale placeholder skyline with a sharp layered city exterior.
- Added a broad rear timber terrace, four illuminated central steps, six raised
  landscape planters, six multi-lobed topiary trees, layered shrubs, warm
  parapet lighting and two furnished rear lounge clusters.
- Kept the office floor, all six workstations and all six animated agents as
  real 3D geometry.
- Kept a small 3D edge skyline for parallax while using one project-owned city
  panorama only as the furthest LOD layer.
- Raised and deepened the default overview camera so the exterior architecture
  remains visible behind the central tree and pavilions.

## Generated project asset

- Source: built-in image generation tool.
- Project source: `textures/rooftop-v10/city-skyline-daylight-v1.png`.
- Runtime derivative: `textures/rooftop-v10/city-skyline-daylight-v1-2048.jpg`.
- Use: distant city backdrop only; never used for agents, furniture or the
  interactive office layer.
- Direction: premium architectural-visualization skyline, bright neutral
  late-morning light, clear blue-white sky, detailed glass/concrete facade
  rhythm, no people, text, logos, watermark, yellow cast or blur.

## Runtime asset budget

| Metric | V10 result | Gate |
| --- | ---: | ---: |
| GLB bytes | 16,472,760 | `< 18,000,000` |
| Runtime primitives | 35 | `<= 36` |
| Runtime triangles | 360,828 | `< 370,000` |
| Runtime textures | 13 | `<= 13` |
| Runtime images | 11 | `<= 11` |
| Source exterior vegetation | 124 objects / 13,016 tris | recorded |
| Source skyline | 51 objects / 602 tris | `< 1,000 tris` |
| Monitor direction minimum dot | 0.508885 | `> 0.45` |

Full source report: `phase-6-environment-v10-source-metrics.json`.

## Browser QA

- Route: `http://localhost:3000/office`.
- Final evidence: `phase-6-final-default-camera-v10.png`.
- Six visible agent labels present.
- A01 detail region opens from the 3D scene and closes cleanly.
- No console errors occurred after the final clean reload.
- Development probe observed 501–502 draw calls and about 1.38M rendered
  triangles with the six rigged characters. FPS varied by the in-app browser
  run; production-hardware 50–60 FPS remains a separate AC-06 gate and is not
  claimed by this visual quality pass.

## Visual result

PASS for the requested exterior overhaul: the rooftop now has readable depth,
furniture, planting, warm/cool material contrast and a sharp high-rise horizon.
The far skyline is no longer a flat row of low-detail placeholder blocks.

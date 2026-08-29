# 0026 Virtual Office — Rigged Character v6 Addendum

## Scope authorization
The user explicitly requested a genuinely 3D virtual office with animated employees and rejected 2.5D cutout characters. This addendum authorizes rigged human meshes and state-driven animation inside the existing `/office` experience while preserving the six-agent MVP workflow.

## Acceptance criteria
1. The six workers A01, B02, B03, D01, D02 and E01 are skinned 3D meshes with skeletons; no employee is rendered from a flat image plane.
2. Workers have role-distinct hair/outfit/material variants and remain readable from front, side and rear views.
3. Runtime animations cover idle, working/typing, reviewing or waiting, and success; clips loop or transition without visible snapping.
4. Existing agent hotspots, labels, detail inspector and Zustand state remain functional.
5. The environment retains six desks, central ficus, planted islands, water, waterfall and Focus Zone while matching the warm cinematic reference more closely.
6. The exported runtime assets pass structural inspection for skins, joints, animation clips and missing textures.
7. Portal tests, lint, production build and localhost `/office` checks pass before completion is claimed.

## Exclusions
- No user photo likeness or face scan.
- No paid or account-gated asset whose redistribution terms cannot be verified.
- No return to billboard, cutout or multi-angle sprite employees.

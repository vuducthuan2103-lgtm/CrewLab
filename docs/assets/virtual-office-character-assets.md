# Virtual Office Character Asset Register

Every external or generated character source must be recorded here before import or commit. Unknown or ambiguous licensing is a hard stop.

## Active prototype assets

| Agent | Asset | Source | Creator | Licence | Commercial use | Attribution | Modifications | Master file | Runtime file | Triangles | Texture resolution | Runtime size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | ---: |
| A01 | v10 procedural prototype | Project Blender generator | CrewLab project | Project-owned code/output; no third-party character source | Yes, subject to repository ownership | None recorded | Primitive rigid hierarchy | None | `portal/public/virtual-office/characters/v10/a01.glb` | 18,228 | None | 154,376 B |
| B02 | v10 procedural prototype | Project Blender generator | CrewLab project | Same as A01 | Yes | None recorded | Primitive rigid hierarchy | None | `portal/public/virtual-office/characters/v10/b02.glb` | 16,436 | None | 141,928 B |
| B03 | v10 procedural prototype | Project Blender generator | CrewLab project | Same as A01 | Yes | None recorded | Primitive rigid hierarchy | None | `portal/public/virtual-office/characters/v10/b03.glb` | 17,664 | None | 148,552 B |
| D01 | v10 procedural prototype | Project Blender generator | CrewLab project | Same as A01 | Yes | None recorded | Primitive rigid hierarchy | None | `portal/public/virtual-office/characters/v10/d01.glb` | 17,924 | None | 154,532 B |
| D02 | v10 procedural prototype | Project Blender generator | CrewLab project | Same as A01 | Yes | None recorded | Primitive rigid hierarchy | None | `portal/public/virtual-office/characters/v10/d02.glb` | 17,260 | None | 146,792 B |
| E01 | v10 procedural prototype | Project Blender generator | CrewLab project | Same as A01 | Yes | None recorded | Primitive rigid hierarchy | None | `portal/public/virtual-office/characters/v10/e01.glb` | 18,356 | None | 155,960 B |

These files are placeholders and failed the production A01 quality gate. Their presence does not authorize using their primitive source for the final six-character pipeline.

## v11 runtime candidates

A01 has founder approval to open the remaining character pipeline. Each additional character still requires its own seated-contact, animation, GLB round-trip and runtime gates.

| Agent | Asset | Source | Creator | Licence | Commercial use | Attribution | Modifications | Runtime file | Skeleton/actions | Runtime size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| A01 | v11 stylized seated candidate | [Blender official `human_base_meshes__body-stylized.blend`](https://projects.blender.org/blender/blender-assets/media/branch/main/ready/online/base_meshes/human_base_meshes__body-stylized.blend) plus `short03` from the official MakeHuman system-assets pack | Blender asset contributors; MakeHuman Community system-asset authors | CC0 for both graphical sources | Yes; modification and embedded GLB distribution permitted | None required | Custom 27-bone seated rig, five digit bones per hand, regional clothing layers, deterministic eyes, rear-hair fill, workstation anchors, eight authored actions, Meshopt compression | `portal/public/virtual-office/characters/v11/a01.glb` | 27 bones; 9 anchors; 8 actions | 1,424,760 B |
| B02 | v11 stylized seated content-strategist candidate | [Blender official `human_base_meshes__body-stylized.blend`](https://projects.blender.org/blender/blender-assets/media/branch/main/ready/online/base_meshes/human_base_meshes__body-stylized.blend), female collection | Blender asset contributors | CC0 | Yes; modification and embedded GLB distribution permitted | None required | Custom 27-bone seated rig, five digit bones per hand, teal layered blazer and cream trousers, bob silhouette, deterministic iris/brow details, workstation anchors, eight authored actions, Meshopt compression | `portal/public/virtual-office/characters/v11/b02.glb` | 27 bones; 9 anchors; 8 actions | 1,854,328 B |

Blender stylized-base SHA-256: `C982F0B6AD0AD32703127BDA97FF984EFB006DD3A6C827F7A4023B5043DA12DF` (1,253,850 B). The source asset remains outside the repository under the isolated CrewLab 3D toolchain; the reproducible build/export code lives in `scripts/blender/build_a01_stylized_rig_candidate.py` and `scripts/blender/export_a01_stylized_candidate.py`.

Measured seated QA after the 27-bone rig was added: butt-to-horizontal-cushion delta `-0.001 mm` and foot-to-floor delta `+0.283 mm`. Blender round-trip import preserved one armature, 27 bones, 16 meshes, all eight action names, and all nine anchor nodes before and after Meshopt compression.

B02 measured seated QA: butt-to-horizontal-cushion delta below `0.001 mm` and foot-to-floor delta `-2.012 mm`. Blender round-trip import preserved one armature, 27 bones, 21 meshes, all eight action names and all nine anchor nodes after Meshopt compression. Eight action midpoints were rendered without losing seat contact or intersecting the desk.

## Experimental local sources

The machine has an isolated MPFB 2.0.17 toolchain and two official MakeHuman Community packs under `D:/Programs/CrewLab-3D-Toolchain/downloads/`. These downloads were already present; this task installed nothing.

| Item | Local file | Official source | Creator | Licence | Output/commercial use | Current decision |
| --- | --- | --- | --- | --- | --- | --- |
| MPFB 2.0.17 add-on | `mpfb2-latest.zip` | [makehumancommunity/mpfb2](https://github.com/makehumancommunity/mpfb2) | MakeHuman Community / Joel Palmius | Code GPL-3.0-or-later; bundled graphical assets CC0 | The project's licence statement says MPFB output is the user's data and the team makes no claim over exported graphical output | Tool accepted for isolated authoring experiments; add-on code is not copied into CrewLab |
| MakeHuman system assets | `makehuman_system_assets_cc0.zip` | [official system asset pack](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html) | MakeHuman Community and listed asset authors | CC0 | Commercial use, modification and embedded runtime output permitted without attribution | Candidate source components only; visual quality still requires manual art QA |
| MakeHuman poses 01 | `poses01_cc0.zip` | [official asset-pack index](https://static.makehumancommunity.org/assets/assetpacks/index.html) | Listed pose authors | CC0 | Commercial use and modification permitted | Reference/pose starting points only; current retarget results fail seated deformation QA |

Official MPFB licensing separates GPL program code from CC0 graphical assets and states that exported graphical output is not claimed by the project. This resolves the basic commercial/output licence question for the installed official packs, but it does not make their current CrewLab renders production-ready.

Existing experimental masters and exports remain outside the repo at `D:/Programs/CrewLab-3D-Toolchain/output/`. The standing A01 source is more complete than the v10 primitive, but current seated tests have severe hip/leg/arm deformation and fail the Character Bible. They must not be promoted to runtime or copied into the other five roles.

## Internal concept references

| Reference | Provenance | Intended use | Production status |
| --- | --- | --- | --- |
| `docs/virtual-office/concepts/a01-character-turnaround-v1.png` | Generated with the built-in image-generation tool on 2026-08-29 from the founder's office-quality reference and the Character Bible | Identity, silhouette, face, hair, clothing and material direction | Reference only; not a mesh or runtime asset |
| `docs/virtual-office/concepts/a01-seated-action-sheet-v1.png` | Generated with the built-in image-generation tool on 2026-08-29 using the turnaround as identity reference | Seated ergonomics and eight-state animation direction | Reference only; each pose still requires rig/deformation QA |

## A01 final art approval — founder gate passed

| Field | Required value |
| --- | --- |
| Agent | A01 |
| Asset/source name | Blender stylized human base plus MakeHuman `short03` CC0 hair |
| Source URL or supplied-file provenance | Recorded in the A01 v11 candidate row above |
| Creator/vendor | Blender asset contributors and MakeHuman Community system-asset authors |
| Licence name and version | CC0 |
| Commercial product use permitted | Yes |
| Derivative modification permitted | Yes |
| Redistribution as an embedded web GLB permitted | Yes |
| Attribution required | No |
| Source/master redistribution restrictions | None under CC0; keep provenance and hash for internal audit |
| Modifications | Recorded in the A01 v11 candidate row above |
| Master file | `3d-source/characters/A01/A01_MASTER.blend` after approval |
| Runtime files | A01 LOD0/1/2 GLBs after approval |
| Metrics | Measured after export |

Do not interpret access to an asset store, generator or software subscription as permission to redistribute its source or derived runtime model.

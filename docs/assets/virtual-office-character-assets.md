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

## A01 production source — pending

| Field | Required value |
| --- | --- |
| Agent | A01 |
| Asset/source name | TBD |
| Source URL or supplied-file provenance | TBD |
| Creator/vendor | TBD |
| Licence name and version | TBD |
| Commercial product use permitted | Must be explicit |
| Derivative modification permitted | Must be explicit |
| Redistribution as an embedded web GLB permitted | Must be explicit |
| Attribution required | TBD |
| Source/master redistribution restrictions | TBD |
| Modifications | TBD |
| Master file | `3d-source/characters/A01/A01_MASTER.blend` after approval |
| Runtime files | A01 LOD0/1/2 GLBs after approval |
| Metrics | Measured after export |

Do not interpret access to an asset store, generator or software subscription as permission to redistribute its source or derived runtime model.

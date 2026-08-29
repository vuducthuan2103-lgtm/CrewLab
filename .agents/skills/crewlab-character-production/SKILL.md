---
name: crewlab-character-production
description: Produce or revise CrewLab Virtual Office 3D agent characters. Use for Blender source selection, modeling, rigging, wardrobe, identity variants, asset licensing, or any request to create one or more of the six A01/B02/B03/D01/D02/E01 character assets.
---

# CrewLab Character Production

Build one approved master before producing variants.

## Required context

Read these files before editing an asset:

1. `docs/virtual-office/CHARACTER_BIBLE.md`
2. `docs/virtual-office/character-pipeline.md`
3. `docs/assets/virtual-office-character-assets.md`
4. `docs/virtual-office/CHARACTER_PIPELINE_AUDIT.md`

## Workflow

1. Confirm the requested role and whether A01 has passed the visual gate.
2. Stop B02-E01 production if A01 is not approved.
3. Record asset source, author, licence, acquisition URL or path, modification rights, redistribution rights, and date in the asset register before importing it.
4. Work from the canonical A01 Blender master. Do not patch runtime GLBs as the source of truth.
5. Preserve the shared skeleton, animation names, workstation anchors, scale, forward axis, and material conventions in the pipeline document.
6. Differentiate agents through silhouette, face, hair, palette, clothing, and props without changing the canonical rig contract.
7. Export review renders before optimization or browser integration.
8. Invoke `crewlab-character-visual-qa` and `crewlab-animation-qa` for acceptance.
9. Only after approval, invoke `crewlab-gltf-optimization` and update the asset register with the final metrics.

## Hard gates

- Do not add a CEO/player avatar, walking controller, proximity HUD, collision mechanic, or CEO look-at behavior.
- Do not mass-produce six variants from an unapproved A01.
- Do not claim a character is rigged when the GLB has no skin.
- Do not claim animation support when the GLB has no animation clips.
- Do not use an asset without documented redistribution rights.
- Do not overwrite founder-owned experimental Blender files or turntables unless they are explicitly in scope.

## Required output

Report the source and licence, changed files, render views, skeleton/clip/anchor validation, geometry/material/texture metrics, QA score, and explicit pass/fail decision.

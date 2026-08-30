# CrewLab Character Production Pipeline

**Status:** A01 founder gate passed; B02, B03 and D01 v11 integrated; D02 is next
**Canonical master:** Blender `.blend`
**Canonical runtime:** glTF 2.0 binary (`.glb`)

## 1. Pipeline

`licensed source → Blender A01 master → topology/material/rig QA → workstation anchors → authored clips/expressions → visual approval → GLB export → optimization → R3F validation → browser/performance gate`

Never optimize or create variants before the approved master passes visual QA.

## 2. Source decision

The current primitive v10 generator is rejected as a final source. Choose one:

1. Founder-owned Character Creator 4 / AccuRIG source, if already licensed.
2. A commercially licensed premium stylized adult humanoid base.
3. A founder-supplied licensed model that passes topology, rig, face, hand and redistribution review.

Do not purchase, install or import a source until its commercial derivative-use and web-runtime redistribution terms are recorded.

## 3. Directory contract

```text
3d-source/
  characters/
    A01/
      A01_MASTER.blend
      sources/
      textures/
      qa/

portal/public/virtual-office/characters/
  A01/
    A01_LOD0.glb
    A01_LOD1.glb
    A01_LOD2.glb
```

Optimized GLBs are generated outputs, never master editing sources.

## 4. Canonical skeleton

Use one retarget-compatible humanoid armature for all six employees:

- root;
- hips;
- spine, chest, optional upper chest;
- neck, head;
- left/right shoulder, upper arm, lower arm, hand;
- individual thumb/index/middle/ring/little finger chains;
- left/right upper leg, lower leg, foot and optional toe.

Use conventional left/right names consistently. Export only deforming bones plus animation-required controls; authoring-only controllers do not enter the runtime GLB.

Do not keep Rigify, VRM humanoid and a separate custom game skeleton simultaneously. If Rigify is used for authoring, bake to the canonical deform skeleton. Select VRM only when the licensed source and expression/look-at workflow clearly justify it.

## 5. Facial architecture

Prefer morph targets for the minimum expression vocabulary and blinking. Facial bones are acceptable only when the source already provides a clean, stable system. Names must be mapped once in a character manifest rather than hardcoded throughout React components.

Minimum semantic expressions:

`neutral`, `blinkLeft`, `blinkRight`, `smile`, `focused`, `thinking`, `concerned`, `happy`.

## 6. Workstation contract

The A01 master contains a linked or proxy copy of the exact production chair, desk, keyboard and monitor geometry at correct scale. Named anchors use metres and local +Z toward the keyboard:

- `SeatAnchor`
- `PelvisTarget`
- `LeftHandKeyboardTarget`
- `RightHandKeyboardTarget`
- `MonitorPrimaryTarget`
- `MonitorSecondaryTarget`
- `TabletTarget`
- `LeftFootTarget`
- `RightFootTarget`

Anchors are exported as named nodes or a reviewed companion manifest. React reads the manifest; it does not scatter hand-authored coordinates through character components.

## 7. Clip contract

Required clip names:

`seated_idle`, `typing`, `thinking`, `screen_review`, `tablet_work`, `waiting_human`, `success`, `error_rework`.

Rules:

- no root translation that floats the character away from `SeatAnchor`;
- loop only idle/work clips;
- success/error one-shots return through the state controller;
- clean clip ranges, no unused tracks;
- 0.2–0.5 s runtime crossfade starting point;
- active clips are not restarted by React renders;
- animation personality comes from config weights, phase offsets and speed ranges.

## 8. Runtime component contract

```text
AgentCharacter
├─ CharacterAssetLoader
├─ CharacterRig
├─ CharacterLOD
├─ AnimationController
├─ ExpressionController
├─ BlinkController
├─ LookAtController
├─ WorkstationController
├─ AgentStateController
└─ CharacterDebugTools (development only)
```

One config-driven `AgentCharacter` serves all six employees. Business states remain separate from animation clips:

| Presentation state | Desired motion |
| --- | --- |
| idle | seated_idle |
| working A01 | screen_review weighted above typing |
| working B02 | thinking/research |
| working B03 | typing/screen_review |
| working D01 | typing |
| working D02 | tablet_work |
| working E01 | screen_review |
| waiting_human | waiting_human |
| success | success then current state |
| error/rejected/reworking | error_rework or role work loop |

There is no CEO avatar, player location, proximity trigger, auto-walk or collision dependency.

## 9. Export and validation

Before optimization:

1. Open `A01_MASTER.blend` in the pinned Blender version.
2. Run topology, transform, material, skeleton, weights, morph and clip checks.
3. Render all Character Bible QA views.
4. Approve art in the unoptimized asset.
5. Export GLB with one canonical skeleton, reviewed morphs and clips.
6. Inspect GLB structure and render it outside Blender.
7. Integrate A01 alone in `/office` and capture real browser proof.

After approval, optimize in this order:

`inspect → dedup → prune → mesh optimize → texture resize/atlas → KTX2 if supported → animation cleanup → runtime validation`

Compare face, eyes, hair, hands, seams and animation before/after every destructive optimization stage.

## 10. Performance and LOD

Start with the Character Bible budgets. Switch LOD using stable distance thresholds with hysteresis; selected A01 stays at LOD0. Measure actual renderer calls/FPS before changing thresholds.

Optimization priority:

1. unused/hidden geometry;
2. duplicate materials/textures;
3. unnecessary shadow casters;
4. texture dimensions and atlasing;
5. LOD distances;
6. unnecessary bones/morphs;
7. decorative geometry.

Never solve performance first by destroying face, eyes, hair or hands.

## 11. Git and licence gate

Runtime GLBs may remain in normal Git when reasonably small. Evaluate Git LFS narrowly for large `.blend`, `.fbx`, `.vrm` or source GLBs after actual sizes are known. Do not add a blanket LFS rule.

No asset enters the repo until `docs/assets/virtual-office-character-assets.md` contains its source, creator, licence, commercial/derivative/runtime distribution rights, attribution and modifications.

## 12. Current rollout condition

The founder has explicitly accepted A01 as complete and opened the sequential B02 → B03 → D01 → D02 → E01 pipeline. B02 and B03 now have recorded CC0 sources, role-specific silhouettes and outfits, measured cushion/floor contact, 27 bones, nine anchors, eight clips and Meshopt runtime GLBs. The remaining characters may proceed one at a time only after the preceding character passes the same visual, contact, animation, round-trip and Portal gates.

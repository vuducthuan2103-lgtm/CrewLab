# CrewLab Character Bible

**Status:** Approved production direction; source asset not yet selected
**Applies to:** A01 first, then B02, B03, D01, D02 and E01 only after A01 passes every quality gate
**Supersedes:** primitive/mannequin character art as a production target

## 1. Non-negotiable production rule

Build one excellent A01 before creating variants. The order is:

`A01 visual approval → seated approval → face/animation approval → browser approval → performance approval → five variants`

If any A01 gate fails, fix A01 and do not duplicate the asset or runtime architecture.

## 2. Shared visual universe

CrewLab employees are **premium stylized professional adults**: recognizable human anatomy and materials, slightly simplified facial proportions, readable silhouettes and restrained animation. They sit between a simple low-poly character and a photoreal digital human.

They must not read as chibi, anime, block characters, toy figurines, primitive mannequins, generic asset-pack NPCs, hyper-real scans or six unrelated art styles.

### Proportion targets

- Adult body: approximately 7–7.5 heads tall when standing.
- Head: 5–10% larger than strict realism, without childlike cheeks or oversized eyes.
- Hands: slightly simplified surface detail, anatomically credible palm/thumb/five fingers.
- Shoulders, neck, pelvis, knees and wrists must retain believable mass in a seated pose.
- Body variation is subtle; no agent should look like a scaled copy of A01.

### Shape language

- Clean primary silhouette from office overview.
- Secondary read from hair, collar/garment shape and role accessory.
- Tertiary detail appears only in focus mode: seams, cuffs, eye detail, material breakup.
- Avoid noisy micro-detail that flickers or disappears at normal office distance.

## 3. Palette and materials

Primary wardrobe colors:

- charcoal and graphite;
- navy;
- off-white;
- muted blue, green or purple;
- warm dark neutrals.

CrewLab lime `#D4FF00` is a small identifier only: pin, watch mark, headset detail, stitch, shoe accent or badge. Never cover a whole garment in lime.

### PBR language

| Surface | Required read |
| --- | --- |
| Skin | soft, living response; controlled specular; neither wax nor flat paint |
| Eyes | separate cornea/eye response or an equivalent economical shader; clear white/iris/pupil and catchlight |
| Hair | mesh hair with lower/glossier roughness than skin, clean hairline and layered masses |
| Fabric | visibly rougher than skin, subtle normal/fold breakup and garment-specific silhouette |
| Leather/shoes | controlled highlight and edge definition; not chrome |
| Metal accents | sparse, physically plausible and low visual dominance |

Recommended maps where they materially improve the result: BaseColor, Normal, Roughness and AO; Metallic only for actual metal. Do not add maps merely to fill a checklist.

## 4. Face standard

A01 establishes the shared facial topology and material standard:

- readable jaw, cheek and nose silhouette in front, 3/4 and side views;
- actual eyelids and eye sockets;
- separate eyes with white, iris and pupil;
- eyebrows with controlled silhouette;
- mouth/lip loops suitable for subtle expressions;
- believable ears and hairline;
- no facial asymmetry caused by broken topology;
- no flat bar mouth, painted sphere eyes or floating eyebrows.

Minimum expressions: neutral, focused, thinking, concerned, happy/small smile, left blink and right blink. Optional only after these pass: brow up/down, squint, slight mouth open and small frown.

Expressions should remain restrained and professional. There is no lip-sync scope.

## 5. Hair standard

Use optimized stylized mesh hair, never strand groom at runtime.

- One clear overall silhouette.
- Several primary masses and a few secondary forms.
- Full scalp coverage and clean hairline.
- No single sphere/cap, helmet shell, floating clumps or collar penetration.
- Hair roughness/specular differs from skin and fabric.

## 6. Hands and deformation standard

Each hand needs five fingers, credible thumb origin, palm volume, wrist transition and enough topology/bones for typing. Test:

- relaxed hand;
- keyboard pose;
- finger curl;
- wrist flexion/extension;
- thumb opposition;
- contact with keyboard or role prop.

Automatic failure: fused fingers, mitten hand, rigid finger cylinders, wrist collapse or visible desk/keyboard penetration from normal cameras.

## 7. Clothing standard

Garments are modern, premium and role-appropriate. A garment needs an intentional silhouette, collar/neck treatment, cuffs where visible, a few controlled seams/folds and material separation from skin.

Avoid loud fashion, sci-fi armor, neon suits, painted-on clothing and an excessive number of separate materials.

## 8. Agent identities

| Agent | Character read | Wardrobe/accessory | Motion personality | Workstation focus |
| --- | --- | --- | --- | --- |
| A01 | calm, confident senior coordinator | premium navy/graphite outfit, clean hair, optional glasses, smart watch/lime pin | screen review over frantic typing; intentional head movement | primary/secondary workflow monitors |
| B02 | thoughtful, curious strategist | softer professional layers, glasses/tablet optional | research pauses, thinking, notes | source cards and research display |
| B03 | organized, systematic planner | structured outfit, optional restrained headset/planner | controlled typing and longer calendar review | calendar/timeline surfaces |
| D01 | energetic creative writer | modern creative-office casual | faster typing, short idea pauses and edits | text monitor, notebook and keyboard |
| D02 | stylish visual designer | distinctive professional hair, stylus/tablet | tablet work, small wrist strokes, visual checking | pen display and design monitor |
| E01 | analytical, strict reviewer | clean structured outfit, glasses/tablet optional | slow deliberate comparison, approval/rework gesture | comparison screens and checklist |

Identity comes from face, hair, garment silhouette, accessory and timing—not from six saturated outfit colors.

## 9. Seated ergonomics

Character and workstation are authored together in A01's Blender master. The base seated pose requires:

- pelvis fully inside the seat, not perched on its edge;
- mild lumbar curve and slight forward work lean;
- relaxed shoulders;
- natural elbows and wrists;
- thighs/knees without hip pinch;
- both feet grounded;
- hands resting naturally when idle and contacting actual targets when working;
- head/eyes primarily oriented to the active monitor.

Required anchors:

`SeatAnchor`, `PelvisTarget`, `LeftHandKeyboardTarget`, `RightHandKeyboardTarget`, `MonitorPrimaryTarget`, `MonitorSecondaryTarget`, `TabletTarget`, `LeftFootTarget`, `RightFootTarget`.

Optional: elbow-rest targets. There is no CEO/player/proximity target.

## 10. Motion vocabulary

Required clips:

- `seated_idle`
- `typing`
- `thinking`
- `screen_review`
- `tablet_work`
- `waiting_human`
- `success`
- `error_rework`

Motion should use 0.2–0.5 s tuned crossfades and must not restart because React re-rendered.

- Idle: subtle breathing through chest/spine/shoulders/head.
- Typing: 2–4 s phrase, pause, monitor review, resume; fingers lead, wrists/elbows follow slightly.
- Thinking: typing stops, small lean/gaze shift, optional restrained chin gesture, then return.
- Screen review: primary to secondary monitor with a small head/upper-body transition.
- Waiting: complete the current micro-action, pause, look toward the product camera/attention indicator, small gesture; no player tracking.
- Success: small smile/nod/shoulder release for 1–2 s.
- Error/rework: restrained concern, then return to work; no slapstick or alarm animation.

Blink timing is randomized approximately 2.5–6 s with rare double blink. Work gaze usually stays on monitor/keyboard/role prop; selection may strengthen attention toward the focus camera within conservative head/eye clamps.

## 11. Lighting and camera quality

Each focused character needs soft daylight key, subtle screen fill and a restrained rim/environment response. Face features and hair edge must remain legible without hard spotlight, orange/yellow wash or neon glow.

The focus camera must provide an unobstructed 3/4 character view. A separate QA camera captures face close-up. Monitors may frame the character but cannot hide the face or hands in the product focus view.

## 12. Initial runtime budgets

Budgets apply only after visual approval:

| Tier | Use | Triangle target | Texture target |
| --- | --- | ---: | --- |
| LOD0 | selected/focus hero | 35k–60k | face 1–2K; body/clothing atlas 2K |
| LOD1 | normal office | 15k–30k | 1K atlases |
| LOD2 | distant/mobile | 5k–12k | 512 atlases |

These are starting ranges. Face, eyes, hair and hands are protected features; profile before reducing them.

## 13. Quality-gate scorecard

Every item is pass/fail. A01 advances only when all critical rows pass.

| Gate | Required proof |
| --- | --- |
| Face | front + 3/4 + side close-ups; clean topology/silhouette |
| Eyes/blink | live clips showing non-robotic blink and controlled gaze |
| Hair | front/3/4/side/back silhouette with no gaps/clipping |
| Hands | close typing and relaxed pose; five fingers and stable wrist |
| Clothing/material | focus renders under neutral daylight and browser lighting |
| Deformation | shoulder, elbow 90°, wrist, finger curl, seated hip/knee and head/neck tests |
| Ergonomics | seated front/side; pelvis, feet, hand and monitor target distances |
| Animation | idle, typing, thinking, review, waiting, success and rework clips with crossfades |
| Browser | office overview, focus 3/4, face close-up and console check in `/office` |
| Performance | overview/focus FPS, draw calls, visible triangles, memory and load timings |
| Licence | recorded commercial/derivative/runtime distribution rights |

If a critical row fails, do not create B02.

## 14. Required A01 review output

- face: front, 3/4, side;
- full body: front, 3/4, side, back;
- seated: front and side;
- action stills: typing, thinking, screen review, waiting, success, rework;
- browser: overview and selected focus;
- short clips: idle, typing, blink/gaze, success;
- metrics and licence record.

The six-agent lineup is created only after A01 approval.

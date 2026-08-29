---
name: crewlab-animation-qa
description: Validate CrewLab 3D agent rigs and motion. Use for seated poses, idle/typing/reviewing/listening/celebrating/waiting/error clips, AnimationMixer transitions, hand placement, foot placement, gaze, clipping, or animation regression review.
---

# CrewLab Animation QA

Judge motion from rendered evidence and machine-readable GLB facts.

## Preconditions

Read the clip, skeleton, anchor, and ergonomic contracts in `docs/virtual-office/character-pipeline.md` and `docs/virtual-office/CHARACTER_BIBLE.md`.

## Checks

1. Confirm one skin, the canonical skeleton, valid inverse bind matrices, and the expected named clips.
2. Confirm every clip loops or terminates as specified and has no root drift unless explicitly designed.
3. Test idle to typing, typing to reviewing, reviewing to waiting, waiting to success, and error recovery transitions.
4. Inspect front, three-quarter, side, and rear views at the actual office camera distance.
5. Check pelvis-to-seat contact, feet-to-floor contact, knee clearance, elbow angle, wrist neutrality, hand-to-keyboard contact, eye-to-monitor gaze, and chair/desk clipping.
6. Check facial and hand deformation at extreme but expected frames.
7. Verify six simultaneously running mixers do not restart clips every render or leak actions.

## Failure rules

Fail the gate for standing while labeled seated, floating pelvis or feet, persistent hand penetration, broken wrist/shoulder deformation, visible root snapping, missing clips, clip-name mismatch, or a browser state that cannot reach its intended action.

## Evidence

Return clip inventory, transition matrix results, annotated failing frames or render paths, browser reproduction steps, and an unambiguous pass/fail score. Never approve from a single still image.

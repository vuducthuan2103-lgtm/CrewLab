# Virtual Office — Design Brief

## Product intent

CrewLab Office lets a client orient in their AI marketing crew at a glance: who is active, who needs attention, and where to continue in the existing Portal. It is a **living workplace, not a game; operational truth, not a dashboard; future through integration, not spectacle**.

## Audience and job

The client is a non-technical Vietnamese F&B owner. Within a few seconds they must be able to identify the six agents, understand which one needs attention, inspect that agent, and continue to the real task or output.

## Experience principles

1. The scene is an authored campus, not a tenant-customizable game map.
2. The central tree and skylight are the architectural focal point; A01 is central in hierarchy, not a throne.
3. Agent identity is durable: human name first, agent code second, role short.
4. State is true or explicitly unavailable. Never infer a percentage, animate a handoff without an event, or imply surveillance.
5. Product UI owns precise text and critical controls. The 3D world uses silhouettes, workspace signatures, abstracts, and restrained motion.
6. Selection is direct: hover/focus highlights gently; click/tap/Enter opens a smart anchored popup. No avatar locomotion.
7. Accessibility, reduced motion and low-WebGL devices retain the same information and navigation path.

## Visual read

**Soft Organic Modern / biophilic near-future campus**: warm limestone, pale oak, brushed champagne metal, quiet plant greens, soft daylight, and large glazed openings. Character anatomy is near-realistic but art-directed; it must avoid both pixel art and hyperreal uncanny detail. The dark Portal chrome frames the scene; it does not recolor the architecture into a cyberpunk room.

The approved visual target is now further specified by [reference-adaptation-plan.md](reference-adaptation-plan.md): a Garden Operations Campus with planted desk islands, water-edge framing, a central tree and dark translucent CrewLab HUD. It adapts compositional principles from a user-supplied visual reference without reproducing that reference's branded assets, copy or layout.

Design calibration: low visual density, restrained motion, high information clarity. Electric lime is reserved for selection and genuine system/action moments.

## Canonical scene

Morning overview. Three or four agents working, one reviewing/waiting, one idle or briefly at the social hub. No errors. At most one real handoff is visible. Evening is a lighting variant only: warm practical lights, lower exterior light, no neon wash.

## Interaction hierarchy

| Input | Result |
| --- | --- |
| Hover or keyboard focus | Subtle local contrast lift, name + code + short role |
| Click, tap, Enter or Space | Focus camera, open smart anchored popup |
| Escape | Close popup and restore overview context |
| Popup CTA | Deep-link to an existing Portal screen; retain office context for the session |

## Non-goals

No CEO character, multiplayer, voice, direct agent messaging, simulated productivity, gameplay telemetry, social feed, content-hub clone, weather API, third-party 3D assets without a recorded licence, or non-MVP agents.

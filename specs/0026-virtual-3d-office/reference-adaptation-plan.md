# Visual Reference Adaptation Plan — Garden Operations Campus

## Purpose and originality boundary

The supplied reference establishes a target **experience language**, not a screen to reproduce. We may adopt its broad composition principles—sunlit garden campus, spatially legible desks, dark layered operational UI, and a selected-agent inspector—but must not copy its brand, logo, names, scene geometry, artwork, wording, icon arrangement, or exact panel layouts.

CrewLab remains a six-agent client portal: **A01, B02, B03, D01, D02, E01**. All task, status and activity information must be factual, client-scoped and sourced through the normalized visual contract.

## Updated visual target

**Garden Operations Campus** is a high-end, soft-organic, 3/4 isometric workplace. It feels like a landscaped architecture studio rather than a cyberpunk command centre or a game world.

The scene uses a warm daylight palette, pale stone paths, timber desk islands, shallow water edges, dense but curated planting, and one mature central tree. The dark CrewLab shell is a calm control layer around it: translucent charcoal, thin warm-light borders, lime only for focus and actual system actions.

## What translates into CrewLab

| Reference principle | CrewLab adaptation |
| --- | --- |
| Large planted central landmark | Sculptural tree and circular social hub; it is the spatial anchor, not a logo monument. |
| Individual round work islands | Six owned workstations with role-specific props and no repeated desk skin. |
| Aerial 3/4 composition | Default overview camera shows every agent and the circulation loop in one readable frame. |
| Dark translucent operational overlays | Portal header, status capsule, selected-agent popup, factual activity feed and minimap. |
| Selected-agent right inspector | Smart anchored detail popup; moves safely on small screens and deep-links to existing Portal screens. |
| Calm status labels in the world | Hover/focus-only name, code and concise role; critical detail stays in DOM. |

## What must not translate

- No copied logo, waterfall branding, “Focus Zone”, role labels, text, activity names, icons, dialogue/chat, world-map artwork or panel positions from the reference.
- No fake “all systems operational”, task count, percentage, elapsed time, completion estimate or handoff entry.
- No general-purpose global chat, player navigation dock, CEO avatar, minimap controls or game mechanics in V1.
- No visual “Analytics” agent or non-MVP agents.

## Canonical CrewLab layout

```text
                         Daylight glazing / north garden

       B02 research island              D01 copy island
       B03 planning island              D02 visual island
                    \                  /
                     \  A01 hub        /
                      central tree + water edge
                              |
                          E01 quality island

                   south quiet path / authored reserve
```

- A01 is at the inner hub, visually central but offset from the tree.
- B02/B03 form the strategy terrace to the west; D01/D02 form the creative terrace to the east.
- E01 occupies the downstream south island, visible from the overview and connected to the central path.
- Water, planting and furniture frame circulation; they never obscure agents or act as selectable product data.

## HUD and information hierarchy

```text
┌────────── dark Portal header ─────────────────────────── status / time ─┐
│                                                                         │
│ dark nav rail       garden campus overview          selected-agent      │
│ Office / Tasks      A01 + 5 work islands             smart popup        │
│                         ↑ factual hover labels          task / state     │
│                                                         CTA to Portal    │
│ mini-map (optional)                                  factual event list │
└─────────────────────────────────────────────────────────────────────────┘
```

1. **Header:** CrewLab Portal, current surface, a compact factual crew summary, standard account controls. It is not a simulation toolbar.
2. **Navigation rail:** existing Portal destinations only. “Office” remains one entry, not a second application.
3. **System capsule:** only show a concise fact such as “2 đang xử lý · 1 cần bạn xem”; never show “operational” without evidence.
4. **Agent popup:** name, code, role, visual state, current task, local warning if needed and one appropriate deep-link CTA. A desktop popup anchors near the selected workstation; mobile uses a floating safe-position card with a visual connector.
5. **Activity panel:** optional and only event-backed. Limit to 3–5 entries and do not render it until the event adapter exists.
6. **Minimap:** Phase 2 enhancement. It is a small non-interactive orientation diagram, not a game map; omit it if it duplicates direct agent selection.

## Rendering plan

### Phase 1 — Art-directed interactive prototype

- React Three Fiber scene with a locked overview, modest orbit/pinch zoom, six clickable agent hotspots and the new HUD.
- Procedural architectural primitives are acceptable for the first visual proof; vegetation must be clustered/instanced and desk screens abstract.
- Use daylight baked-look lighting, one shadow-casting key light and dynamic DPR cap. No real-time water reflections, particle fields or many point-light shadows.

### Phase 2 — Asset and motion polish

- Replace primitives with licensed, optimized GLB assets: tree, planting kit, desk islands, six fixed characters and a small water-edge kit.
- Add restrained agent micro-motion and real event-driven handoff choreography.
- Produce the five keyframes already required in the production plan: morning overview, selected popup, handoff, blocked state, evening overview, plus a mobile crop.

### Phase 3 — Data integration and quality

- Wire only the normalized `OfficeVisualAgent` and event adapter. Do not expose internal model/token or invented process data in the scene.
- Add actual optional activity panel and minimap only after their data and accessibility contracts are tested.
- Benchmark desktop/mobile tier, WebGL fallback and reduced motion before release.

## Acceptance checks for this direction

- At a glance, a client can locate all six MVP agents and identify a waiting/error state without decoding a dashboard.
- The scene reads as a premium landscaped workplace in daylight, not pixel art, a generic sci-fi control room or Gather-like game map.
- UI panels retain CrewLab dark-only identity while the world remains naturally lit.
- A selected agent gives one clear next action and no fabricated operational fact.
- The mobile crop retains agent context, safe popup placement and the DOM roster path.

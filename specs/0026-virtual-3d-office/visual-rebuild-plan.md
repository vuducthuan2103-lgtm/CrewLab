# Spec 0026 — Cinematic 3D Garden Office Visual Rebuild

## 1. Visual north star

The implementation must read as a premium real-time management-game diorama, not a flat illustration and not a collection of primitive demo shapes. The canonical composition is a sunlit tropical-modern atrium viewed from a high three-quarter isometric camera:

- six distinct agent islands arranged around a central coordination island;
- shallow turquoise water forming the negative space between ivory stone paths;
- warm oak crescent desks with cream ribbed bases and acid-lime light details;
- curved teal glass monitor arrays and restrained holographic status surfaces;
- one sculptural central tree plus two small peripheral planters only;
- curved glass pavilions and brass/bronze architectural trim framing the back of the scene;
- dark graphite operational HUD panels floating above the scene without obscuring it.

Generated art-direction references:

- Overall scene: `C:/Users/Admin/.codex/generated_images/01a03d12-bc14-74e2-abcc-e28a325e76d4/exec-07273fbd-010e-4652-9583-079eda9a407b.png`
- Workstation detail: `C:/Users/Admin/.codex/generated_images/01a03d12-bc14-74e2-abcc-e28a325e76d4/exec-673dfaf5-2635-402a-9220-10e70e428daa.png`

These images define mood, composition, materials and hierarchy. Agent facts and interactions remain sourced from the existing CrewLab state contract.

## 2. Extracted design system

### Composition

- Camera: elevated three-quarter perspective, approximately 38–44° FOV, looking toward the central platform.
- A01 occupies the dominant central platform.
- B02/B03 occupy the upper-left and upper-right platforms.
- D01/D02 occupy the lower-left and lower-center platforms.
- E01 occupies the lower-right quality-gate platform.
- Platforms are connected by short ivory bridges and circular inlaid path rings.
- Water occupies 25–35% of the visible scene to create contrast, reflections and depth.
- Scene geometry remains readable under the Portal sidebar and HUD safe areas.

### Palette

| Token | Value | Use |
| --- | --- | --- |
| CrewLab lime | `#D4FF00` | status LEDs, active rings, selected agent |
| Water teal | `#4F9E9B` | shallow water base |
| Glass cyan | `#7DE3E0` | monitor emission and glass edges |
| Warm oak | `#9A633B` | desktops and cabinetry |
| Ivory limestone | `#D8C8AA` | platforms, bridges and central planter |
| Brass | `#B68A4A` | rails, screen supports and architectural trim |
| Garden green | `#385C43` | the single tree and sparse planters |
| Graphite | `#0C1110` | HUD, chairs and equipment |

### Material language

- Stone: warm, high roughness, subtle color variation and thin brass inlays.
- Wood: medium roughness, warm highlight, visibly thicker than the current flat desktop.
- Water: transparent physical material with animated normal-like surface motion, soft cyan emission and reflected sunlight.
- Glass: low-opacity teal physical material with bright edges; readable but not opaque.
- Metal: restrained bronze/brass, never mirror chrome.
- HUD: graphite glass, white/12 hairlines, lime only for status and action emphasis.

### Lighting

- One shadow-casting warm directional sun from upper-left.
- Hemisphere fill for sky/ground separation.
- Warm ambient base and a small amount of emissive light from screens/LED rings.
- ACES filmic tone mapping, sRGB output and high-quality soft shadows.
- Contact shadows ground desks and avatars; no large dark discs.

## 3. Scene architecture

### Asset pipeline and module boundaries

0. `scripts/blender/build_virtual_office.py`
   - deterministic Blender source generator;
   - produces the `.blend` source, a fixed-camera validation render and an optimized `.glb`;
   - owns architectural bevels, authored material junctions, station proportions and hero-tree silhouette;
   - uses no runtime asset CDN and no full-scene 2D background.

1. `GardenCampusEnvironment`
   - water basin;
   - stone platform and bridge network;
   - curved rear pavilions/glass walls;
   - brass trim and sparse peripheral planters.
2. `SculpturalGardenTree`
   - one central bonsai-like trunk with authored branch silhouette;
   - restrained crown clusters and planter stones.
3. `PremiumAgentStation`
   - circular stone island;
   - crescent oak desk with ribbed cream base;
   - three curved glass screens and desk props;
   - ergonomic chair and stylized seated agent;
   - invisible generous interaction hit box and DOM status tag.
4. `GardenOfficeScene`
   - lighting, shadows, environment and six configured stations.
5. `OfficeCanvas`
   - browser-only Canvas boundary;
   - camera/orbit/focus controller;
   - renderer quality and accessibility fallback.

### Interaction behavior

- Hovering an avatar, desk or status tag highlights the complete station.
- Clicking/tapping selects the agent, opens the existing factual detail panel and eases the camera toward the station.
- Closing the detail restores the authored overview camera.
- Orbit is deliberately constrained; pan remains disabled so the composed scene cannot be lost.
- Keyboard and non-WebGL selection remain available through the existing DOM roster/fallback.

## 4. Performance budget

- Lighting is fully bundled and deterministic; the scene never depends on a runtime CDN.
- Local development may preview `/office` without a Supabase session; production authentication remains unchanged.

- Clamp DPR to `[1, 1.5]`.
- One real-time shadow caster, 1024px shadow map.
- Reuse geometries/material patterns and memoize procedural shapes.
- No allocations inside `useFrame`.
- Animate only water shader offsets, subtle screen pulse and limited avatar micro-motion.
- Avoid physics, post-processing chains and external model downloads in V1.
- Target 50–60 FPS desktop and 30+ FPS modern mobile, matching AC-06.

## 5. Delivery sequence

1. Generate and inspect the fixed 1600×900 Blender validation render.
2. Iterate geometry, composition, materials and lighting until it passes the visual checklist.
3. Export the approved scene to a browser-ready GLB and integrate it through `useGLTF`.
4. Add lightweight runtime sun/fill, screen glow and authored agent hit targets.
5. Restore hover, click selection, focus camera, detail CTA and DOM fallback without changing factual state sources.
6. Tune responsive framing and HUD safe areas at desktop and mobile widths.
7. Verify all 6 agents, selection, camera focus, detail CTA, console, tests, lint and production build.

## 6. Definition of visually done

- A screenshot at 1280×720 is immediately recognizable as the same design family as the generated key visual.
- Water, stone, wood, glass and metal are distinguishable at first glance.
- All six stations are readable without rotating the camera.
- The central tree does not obscure A01 or any status tag.
- Vegetation is visibly reduced to one tree and two small planters.
- The page contains no flat full-scene background image masquerading as 3D.
- The browser console has no new errors after a cold load and a station selection.

### Required visual comparison gates

- Fixed Blender preview and browser screenshot use the same 16:9 high three-quarter camera family.
- Exactly six operator stations are visible: one dominant center, two rear, three foreground/side.
- The five material families are readable without labels: limestone, oak, brass, teal glass and shallow water.
- A single mature tree is the only large vegetation mass; only two small secondary planters remain.
- Workstation close view reads as assembled furniture with bevels, thickness and junctions, not stacked primitive blocks.
- At 1280×720 no HUD panel hides A01, D02 or more than one monitor bank.
- A cold browser load shows the GLB, not the legacy procedural fallback, and reports no asset/decoder errors.

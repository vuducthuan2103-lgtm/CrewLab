# CrewLab Garden Office v4 — Visual Contract

These images are project-owned art-direction references generated with the built-in image generation tool. They are not runtime backplates. The runtime must remain a navigable 3D scene.

## Reference set

- `ref-01-master-overview.png`: source of truth for camera, scale, spatial density and architectural hierarchy.
- `ref-02-workstation.png`: desk, monitor, chair, props and seated posture construction.
- `ref-03-agent.png`: adult Vietnamese worker proportions, clothing and seated pose.
- `ref-04-ficus.png`: trunk fusion, buttress roots, branching, canopy breakup and planter scale.
- `ref-05-waterfall.png`: layered waterfall wall, basin, glazing and cool reflected light.
- `ref-06-focus-pavilion.png`: rounded glass shell, thin roof, steps, warm interior and furniture.
- `ref-07-hardscape-water.png`: organic path/water topology, coping, islands, joints and lantern rhythm.

## Extracted design system

- Camera: 16:9, elevated perspective, approximately 30–34 degrees downward, 42–55 mm equivalent lens; never orthographic.
- Scale: people are realistic adults; worktops approximately 0.74 m; chairs approximately 1.1–1.25 m; pavilion approximately 4.3 m high; ficus approximately 7.5–8.5 m high.
- Palette: warm beige limestone, honey oak, gray-brown bark, champagne bronze, low-iron glass, deep graphite, restrained turquoise water and screen cyan.
- Material hierarchy: varied rough limestone first; wood grain second; transparent glass/water third; metallic edges and emissive practicals as accents only.
- Light: late-morning directional sun, dappled canopy shadows, believable glass-atrium fill, warm practicals and cool water bounce. Avoid uniform studio lighting and bloom.
- Vegetation: one dense hero canopy, restrained understory and planted borders; circulation remains readable.

## Prompt set

All prompts used the supplied office screenshot as style/composition reference and regenerated fresh standalone images. Prompts explicitly required real adult scale, PBR architectural visualization, no UI/text/watermark, and excluded chibi, clay, toy, plastic, orthographic and tabletop/diorama treatments. Individual prompts then isolated the overview, workstation, agent, ficus, waterfall, pavilion, hardscape, limestone, oak and bark.

## Runtime constraints

- UI labels and inspector remain HTML/shadcn UI, never baked into the GLB.
- Six agent hotspots and the existing office state flow must remain intact.
- Desktop gets the authored quality tier; mobile must retain a bounded DPR and shadow budget.

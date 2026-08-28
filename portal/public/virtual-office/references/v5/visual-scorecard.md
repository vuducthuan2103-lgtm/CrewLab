# Virtual Office v5 — visual iteration scorecard

Reference: `ref-01-master-overview.png` and the original supplied CrewLab Portal composition.

Scoring uses a strict 10-point scale. A build is eligible for integration only when no category is below 7.

| Iteration | Composition | Depth | Materials/light | People/workstations | Identity cues | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| H1 | 8.0 | 8.5 | 8.0 | 6.5 | 7.0 | Reject for integration; keep architecture/camera, improve character legibility and Focus Zone identity. |
| H2 | 8.0 | 8.5 | 8.2 | 7.2 | 7.0 | Reject for integration; character lighting passes, but the new sign intersects the pavilion wall and is not visible. |
| H3 | 8.0 | 8.5 | 8.2 | 7.2 | 7.5 | Reject for integration; sign is correctly emissive but its final glyph is cropped by the hero framing. |
| H4 | 8.0 | 8.5 | 8.2 | 7.2 | 7.5 | Reject for integration; reduced scale fits, but left shift lets the bookcase occlude the first glyph. |
| H5 | 8.2 | 8.5 | 8.2 | 7.2 | 8.2 | Accept for integration; full sign is readable, six stations remain clear, and every category clears the threshold. |

## H1 observed defects

- Six workers are present, but dark clothing and low self-light make several read as silhouettes.
- The right pavilion reads as a lounge/showroom because its defining Focus Zone title is absent.
- Central floor remains calmer than the original, but adding more large plants would harm workstation readability; preserve the current restrained planting density.
- Exterior garden, central ficus, water and warm directional lighting pass and should not be reworked in H2.

## Locked for H2

- Camera position and crop.
- Central ficus, waterfall and exterior depth plate.
- Six-station layout and planted-island count.
- Warm late-morning grade.

## H2 changes under test

- Raise photographic character-card emission from `0.035` to `0.14`.
- Add a real emissive 3D `FOCUS ZONE` sign to the pavilion back wall.

## H2 result and H3 change under test

- Accept the character-card material: no halo, no checker contamination and no flat sticker effect at the hero camera.
- Move only the 3D sign from `y=7.49` to `y=7.30`, in front of the pavilion wall's `y=7.37` face.

## H3 result and H4 change under test

- Preserve the correct wall offset and emissive material.
- Reduce sign size from `0.58` to `0.44` and shift its center from `x=6.86` to `x=6.28` so all glyphs remain inside the hero frame.

## H4 result and H5 change under test

- Lock the reduced `0.44` sign size.
- Restore the sign to the pavilion center at `x=6.86`; the smaller width should now retain both edge glyphs without bookcase occlusion.

## Accepted visual contract

- Use H5 as the v5 authored scene and runtime-export source.
- Preserve six interactive station anchors while upgrading their visible occupants to role-specific photographic assets.
- The web UI remains responsible for status labels and side panels; they must not be baked into the 3D scene.
- Known honest limitation: the photographic people are camera-oriented 2.5D cards inside a true 3D environment, not rigged scanned human meshes.

---
name: crewlab-gltf-optimization
description: Optimize and validate CrewLab Virtual Office GLB assets after art approval. Use for geometry simplification, texture atlasing or compression, Draco or Meshopt, KTX2, LOD generation, file-size budgets, GLB inspection, or runtime asset performance.
---

# CrewLab glTF Optimization

Optimize only an art-approved A01 or approved derivatives. Optimization must not disguise an unresolved modeling, rigging, material, or animation defect.

## Baseline first

Record file bytes, nodes, meshes, primitives, vertices, triangles, materials, textures, decoded texture memory, skins, morph targets, animation clips, and render comparison paths before changing the asset.

## Procedure

1. Keep an untouched source Blender file and unoptimized reference GLB.
2. Remove unreachable objects, duplicate materials, unused vertex groups, and unused animation tracks.
3. Preserve skeleton names, clip names, morph target order, anchors, scene scale, forward axis, and authored shading.
4. Apply texture resizing or KTX2 only after visual comparison at the actual office camera distance.
5. Apply Meshopt/Draco only when the Portal loader supports it and decoding is tested.
6. Generate LODs using the budgets in the Character Bible; never substitute a billboard for a primary visible agent.
7. Compare optimized and reference renders, then test all clips and the six-agent scene.

## Acceptance

The optimized asset must load without console warnings, preserve materials and animation, remain within the documented budgets, and show no unacceptable silhouette, face, hand, hair, or clothing degradation. Report before/after metrics and savings; do not report only compressed file size.

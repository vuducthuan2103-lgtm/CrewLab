"""Build CrewLab's photoreal garden office and export a browser-ready GLB.

Run with Blender 5.2+:
  blender --background --python scripts/blender/build_virtual_office.py

The script is the source of truth for the authored 3D asset. Version 3 uses a
project-owned ficus alpha atlas plus deterministic Blender geometry. Reference
boards live beside the atlas and are art-direction inputs, never flat scene
backgrounds.
"""

from __future__ import annotations

import math
import os
import random
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "portal" / "public" / "virtual-office"
REFERENCE_DIR = OUTPUT_DIR / "references" / "v3"
LEAF_ATLAS_PATH = REFERENCE_DIR / "tex-ficus-clusters.png"
TEXTURE_DIR = OUTPUT_DIR / "textures" / "v3"
STONE_TEXTURE_PATH = TEXTURE_DIR / "tex-limestone-albedo.jpg"
OAK_TEXTURE_PATH = TEXTURE_DIR / "tex-oak-albedo.jpg"
BARK_TEXTURE_PATH = TEXTURE_DIR / "tex-ficus-bark-albedo.jpg"
BLEND_PATH = OUTPUT_DIR / "garden-office-v3.blend"
GLB_PATH = OUTPUT_DIR / "garden-office-v3.glb"
PREVIEW_PATH = OUTPUT_DIR / "garden-office-v3-preview.png"

TAU = math.tau


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.materials, bpy.data.curves, bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
        # Keep datablocks that may still be referenced while Blender settles.
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    roughness: float = 0.45,
    metallic: float = 0.0,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
    transmission: float = 0.0,
    alpha: float = 1.0,
    coat: float = 0.0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Alpha"].default_value = alpha
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    if emission:
        bsdf.inputs["Emission Color"].default_value = emission
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1.0 or transmission > 0.0:
        mat.surface_render_method = "DITHERED"
        mat.use_transparency_overlap = False
    return mat


def attach_base_color_texture(mat: bpy.types.Material, path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Missing project texture: {path}")
    image = bpy.data.images.load(str(path), check_existing=True)
    image.colorspace_settings.name = "sRGB"
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = f"{mat.name} albedo"
    texture.image = image
    texture.interpolation = "Linear"
    texture.extension = "REPEAT"
    links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])


STONE = None
STONE_DARK = None
STONE_JOINT = None
OAK = None
OAK_DARK = None
IVORY = None
BRASS = None
GRAPHITE = None
FABRIC = None
GLASS = None
WATER = None
SCREEN = None
LIME = None
LEAF = None
LEAF_LIGHT = None
LEAF_ATLAS = None
TRUNK = None
SKIN = None
WHITE = None
WARM_GLOW = None


def make_materials() -> None:
    global STONE, STONE_DARK, STONE_JOINT, OAK, OAK_DARK, IVORY, BRASS, GRAPHITE, FABRIC
    global GLASS, WATER, SCREEN, LIME, LEAF, LEAF_LIGHT, LEAF_ATLAS, TRUNK, SKIN, WHITE, WARM_GLOW

    STONE = material("Limestone warm", (0.58, 0.48, 0.36, 1), roughness=0.70)
    STONE_DARK = material("Limestone joint", (0.14, 0.13, 0.105, 1), roughness=0.90)
    STONE_JOINT = material("Limestone soft joint", (0.32, 0.275, 0.21, 1), roughness=0.88)
    IVORY = material("Ivory fluted stone", (0.76, 0.68, 0.55, 1), roughness=0.68)
    OAK = material("Quarter sawn oak", (0.34, 0.16, 0.055, 1), roughness=0.38, coat=0.12)
    OAK_DARK = material("Dark oak", (0.105, 0.045, 0.018, 1), roughness=0.44, coat=0.08)
    BRASS = material("Champagne bronze", (0.34, 0.19, 0.058, 1), roughness=0.34, metallic=0.80)
    GRAPHITE = material("Graphite", (0.018, 0.026, 0.025, 1), roughness=0.28, metallic=0.48)
    FABRIC = material("Graphite fabric", (0.025, 0.032, 0.031, 1), roughness=0.88)
    GLASS = material("Low iron architectural glass", (0.055, 0.23, 0.215, 0.20), roughness=0.06, transmission=0.78, alpha=0.20, coat=0.5)
    WATER = material("Shallow turquoise water", (0.028, 0.27, 0.245, 0.68), roughness=0.075, transmission=0.42, alpha=0.72, coat=0.78)
    SCREEN = material(
        "Teal display glass",
        (0.018, 0.13, 0.13, 0.72),
        roughness=0.12,
        metallic=0.14,
        emission=(0.05, 0.95, 0.85, 1),
        emission_strength=1.45,
        alpha=0.82,
        coat=0.5,
    )
    LIME = material(
        "CrewLab lime",
        (0.50, 1.0, 0.0, 1),
        roughness=0.2,
        emission=(0.50, 1.0, 0.0, 1),
        emission_strength=3.5,
    )
    LEAF = material("Deep garden leaf", (0.028, 0.14, 0.045, 1), roughness=0.78)
    LEAF_LIGHT = material("Sunlit garden leaf", (0.09, 0.31, 0.075, 1), roughness=0.74)
    TRUNK = material("Old ficus bark", (0.16, 0.095, 0.052, 1), roughness=0.94)
    SKIN = material("Warm skin", (0.53, 0.255, 0.14, 1), roughness=0.62)
    WHITE = material("Warm ceramic", (0.83, 0.79, 0.68, 1), roughness=0.5)
    WARM_GLOW = material(
        "Warm practical glow",
        (1.0, 0.44, 0.12, 1),
        roughness=0.24,
        emission=(1.0, 0.32, 0.06, 1),
        emission_strength=3.0,
    )

    attach_base_color_texture(STONE, STONE_TEXTURE_PATH)
    attach_base_color_texture(OAK, OAK_TEXTURE_PATH)
    attach_base_color_texture(TRUNK, BARK_TEXTURE_PATH)

    if not LEAF_ATLAS_PATH.exists():
        raise FileNotFoundError(f"Missing project leaf atlas: {LEAF_ATLAS_PATH}")
    leaf_image = bpy.data.images.load(str(LEAF_ATLAS_PATH), check_existing=True)
    LEAF_ATLAS = bpy.data.materials.new("Ficus cluster atlas")
    LEAF_ATLAS.use_nodes = True
    nodes = LEAF_ATLAS.node_tree.nodes
    links = LEAF_ATLAS.node_tree.links
    for node in list(nodes):
        nodes.remove(node)
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    image = nodes.new("ShaderNodeTexImage")
    image.image = leaf_image
    image.interpolation = "Linear"
    bsdf.inputs["Roughness"].default_value = 0.72
    bsdf.inputs["Alpha"].default_value = 1.0
    links.new(image.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(image.outputs["Alpha"], bsdf.inputs["Alpha"])
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    LEAF_ATLAS.surface_render_method = "DITHERED"
    LEAF_ATLAS.use_transparency_overlap = False
    LEAF_ATLAS.use_backface_culling = False


def smooth_and_bevel(obj: bpy.types.Object, bevel: float = 0.04, segments: int = 3) -> bpy.types.Object:
    if hasattr(obj.data, "polygons"):
        for poly in obj.data.polygons:
            poly.use_smooth = True
    if bevel > 0:
        modifier = obj.modifiers.new("Soft architectural edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = segments
    return obj


def cube(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
    bevel: float = 0.04,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    smooth_and_bevel(obj, bevel)
    return obj


def cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    vertices: int = 48,
    rotation: tuple[float, float, float] = (0, 0, 0),
    bevel: float = 0.03,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    smooth_and_bevel(obj, bevel)
    return obj


def uv_sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    segments: int = 24,
    rings: int = 12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    smooth_and_bevel(obj, 0)
    return obj


def torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    mat: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
    major_segments: int = 64,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=major_segments,
        minor_segments=8,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    smooth_and_bevel(obj, 0)
    return obj


def tube_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    mat: bpy.types.Material,
    *,
    vertices: int = 16,
) -> bpy.types.Object:
    a = Vector(start)
    b = Vector(end)
    direction = b - a
    midpoint = (a + b) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=midpoint)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    obj.data.materials.append(mat)
    smooth_and_bevel(obj, 0.015, 2)
    return obj


def tapered_tube_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    start_radius: float,
    end_radius: float,
    mat: bpy.types.Material,
    *,
    vertices: int = 18,
) -> bpy.types.Object:
    """Create a tapered organic segment between two points."""
    a = Vector(start)
    b = Vector(end)
    direction = b - a
    midpoint = (a + b) / 2
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=start_radius,
        radius2=end_radius,
        depth=direction.length,
        location=midpoint,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    obj.data.materials.append(mat)
    smooth_and_bevel(obj, min(start_radius, end_radius) * 0.16, 2)
    return obj


def create_leaf_cards(
    name: str,
    centers: list[tuple[float, float, float]],
    *,
    count: int,
    spread: tuple[float, float, float],
    seed: int,
    size_range: tuple[float, float] = (0.48, 0.82),
) -> bpy.types.Object:
    """Build one compact atlas-mapped mesh from many crossed foliage cards."""
    rng = random.Random(seed)
    verts: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    uvs: list[tuple[float, float]] = []

    for index in range(count):
        anchor = Vector(centers[index % len(centers)])
        # Rejection sampling keeps the crown organic rather than box-shaped.
        while True:
            offset = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)))
            if offset.length_squared <= 1.0:
                break
        center = anchor + Vector((offset.x * spread[0], offset.y * spread[1], offset.z * spread[2]))
        width = rng.uniform(*size_range)
        height = width * rng.uniform(0.78, 1.08)
        yaw = rng.uniform(0, TAU)
        tilt = rng.uniform(-0.34, 0.34)
        right = Vector((math.cos(yaw), math.sin(yaw), 0)) * (width * 0.5)
        up = Vector((-math.sin(yaw) * math.sin(tilt), math.cos(yaw) * math.sin(tilt), math.cos(tilt))) * (height * 0.5)
        base = len(verts)
        verts.extend((tuple(center - right - up), tuple(center + right - up), tuple(center + right + up), tuple(center - right + up)))
        faces.append((base, base + 1, base + 2, base + 3))

        tile = rng.randrange(16)
        col = tile % 4
        row = tile // 4
        gutter = 0.008
        u0 = col / 4 + gutter
        u1 = (col + 1) / 4 - gutter
        # Image rows start at the top; UV rows start at the bottom.
        v0 = (3 - row) / 4 + gutter
        v1 = (4 - row) / 4 - gutter
        uvs.extend(((u0, v0), (u1, v0), (u1, v1), (u0, v1)))

    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            uv_layer.data[loop_index].uv = uvs[mesh.loops[loop_index].vertex_index]
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(LEAF_ATLAS)
    return obj


def annular_sector(
    name: str,
    location: tuple[float, float, float],
    inner_radius: float,
    outer_radius: float,
    depth: float,
    start_angle: float,
    end_angle: float,
    mat: bpy.types.Material,
    segments: int = 32,
) -> bpy.types.Object:
    verts: list[tuple[float, float, float]] = []
    faces: list[tuple[int, ...]] = []
    for z in (-depth / 2, depth / 2):
        for i in range(segments + 1):
            angle = start_angle + (end_angle - start_angle) * i / segments
            verts.append((inner_radius * math.cos(angle), inner_radius * math.sin(angle), z))
            verts.append((outer_radius * math.cos(angle), outer_radius * math.sin(angle), z))
    layer = (segments + 1) * 2
    for i in range(segments):
        base = i * 2
        top = layer + base
        faces.extend(
            [
                (base, base + 2, base + 3, base + 1),
                (top, top + 1, top + 3, top + 2),
                (base, top, top + 2, base + 2),
                (base + 1, base + 3, top + 3, top + 1),
            ]
        )
    faces.extend([(0, 1, layer + 1, layer), (segments * 2, layer + segments * 2, layer + segments * 2 + 1, segments * 2 + 1)])
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    diameter = max(outer_radius * 2, 0.001)
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            uv_layer.data[loop_index].uv = ((vertex.x + outer_radius) / diameter * 2.0, (vertex.y + outer_radius) / diameter * 2.0)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.data.materials.append(mat)
    smooth_and_bevel(obj, 0.05, 3)
    return obj


def create_water_and_plaza() -> None:
    cube("Atrium foundation", (0, 0.2, -0.62), (14.6, 11.4, 0.40), STONE_DARK, bevel=0.72)
    cube("Perimeter water basin", (0, 0.15, -0.16), (14.05, 10.85, 0.16), WATER, bevel=0.96)

    # Limestone is now the dominant read. Water is a recessed perimeter channel
    # rather than the glossy teal slab that made v2 feel like a toy diorama.
    cube("Main limestone plaza", (0, -0.05, 0.09), (9.92, 7.38, 0.27), STONE, bevel=1.18)
    cube("Rear pavilion promenade", (0, 6.96, 0.10), (9.95, 1.05, 0.28), STONE, bevel=0.52)
    cube("Left waterfall walk", (-8.95, 4.25, 0.10), (1.05, 2.20, 0.28), STONE, bevel=0.48)
    cube("Right focus walk", (8.95, 4.25, 0.10), (1.05, 2.20, 0.28), STONE, bevel=0.48)

    torus("Central brass inlay", (0, 0.25, 0.385), 3.08, 0.035, BRASS)
    torus("Outer plaza inlay", (0, 0.15, 0.38), 7.34, 0.026, BRASS, major_segments=96)

    # Fine expansion joints and staggered tile seams establish architectural
    # scale at the production camera distance.
    for index, x in enumerate((-7.8, -5.2, -2.6, 0, 2.6, 5.2, 7.8)):
        cube(f"Limestone vertical joint {index}", (x, -0.10, 0.372), (0.010, 6.65, 0.006), STONE_JOINT, bevel=0)
    for index, y in enumerate((-5.7, -3.8, -1.9, 0.0, 1.9, 3.8, 5.7)):
        cube(f"Limestone horizontal joint {index}", (0, y, 0.374), (8.95, 0.010, 0.006), STONE_JOINT, bevel=0)

    # Water glints and lily pads are real geometry so both the Cycles preview
    # and WebGL runtime retain the same material hierarchy.
    for index, (x, y, length) in enumerate(((-9.7, -3.8, 3.2), (9.65, -3.1, 3.6), (-8.7, 5.6, 1.8), (8.7, 5.6, 1.8))):
        cube(f"Water glint {index}", (x, y, 0.025), (0.018, length, 0.012), SCREEN, bevel=0.01)
    for index, (x, y, radius) in enumerate(((8.9, -5.8, 0.34), (9.7, -5.1, 0.26), (-9.4, -5.5, 0.22), (8.3, -6.5, 0.19))):
        cylinder(f"Lily pad {index}", (x, y, 0.045), radius, 0.025, LEAF_LIGHT, vertices=28, bevel=0.01)


def create_platform(name: str, x: float, y: float, radius: float, *, central: bool = False) -> None:
    cylinder(f"{name} foundation", (x, y, 0.40), radius, 0.14, STONE, vertices=64, bevel=0.045)
    cylinder(f"{name} inner stone", (x, y, 0.485), radius - 0.18, 0.055, IVORY, vertices=64, bevel=0.018)
    torus(f"{name} brass edge", (x, y, 0.52), radius - 0.10, 0.024, BRASS)
    if central:
        torus(f"{name} active lime ring", (x, y, 0.525), radius - 0.40, 0.018, LIME)


def create_monitor(name: str, x: float, y: float, z: float, angle: float, width: float = 0.92) -> None:
    # Screen faces are individually named so runtime can pulse/inspect them.
    cube(f"{name} bezel", (x, y, z), (width / 2, 0.035, 0.33), GRAPHITE, rotation=(0, 0, angle), bevel=0.045)
    # Offset toward the seated operator/camera side.
    offset = Vector((math.sin(angle) * 0.044, -math.cos(angle) * 0.044, 0))
    cube(
        f"{name} Screen",
        (x + offset.x, y + offset.y, z + 0.005),
        (width * 0.455, 0.008, 0.287),
        SCREEN,
        rotation=(0, 0, angle),
        bevel=0.028,
    )
    # A few actual emissive UI strokes keep the display readable in WebGL;
    # they are not a baked screenshot and still react correctly in 3D.
    normal = Vector((math.sin(angle), -math.cos(angle), 0))
    tangent = Vector((math.cos(angle), math.sin(angle), 0))
    for line_index, (local_x, local_z, line_width, line_mat) in enumerate(
        ((-0.22, 0.16, 0.18, LIME), (0.05, 0.16, 0.20, SCREEN), (-0.10, 0.03, 0.31, SCREEN), (0.12, -0.09, 0.22, SCREEN), (-0.20, -0.19, 0.13, SCREEN))
    ):
        line_center = Vector((x, y, z)) + tangent * local_x + normal * 0.056 + Vector((0, 0, local_z))
        cube(
            f"{name} UI line {line_index}",
            tuple(line_center),
            (line_width, 0.006, 0.008),
            line_mat,
            rotation=(0, 0, angle),
            bevel=0.006,
        )
    tube_between(f"{name} lower arm", (x, y + 0.08, z - 0.57), (x, y + 0.03, z - 0.34), 0.034, BRASS)
    tube_between(f"{name} articulated arm", (x, y + 0.03, z - 0.34), (x, y, z - 0.26), 0.026, BRASS)
    cylinder(f"{name} arm joint", (x, y + 0.03, z - 0.34), 0.07, 0.06, BRASS, vertices=20, rotation=(math.radians(90), 0, 0), bevel=0.012)


def create_chair(name: str, x: float, y: float) -> None:
    cylinder(f"{name} chair lift", (x, y, 0.76), 0.055, 0.72, GRAPHITE, vertices=20)
    uv_sphere(f"{name} chair seat", (x, y, 1.05), (0.46, 0.40, 0.11), FABRIC)
    cube(f"{name} chair back frame", (x, y + 0.31, 1.56), (0.43, 0.045, 0.54), GRAPHITE, rotation=(math.radians(-7), 0, 0), bevel=0.13)
    cube(f"{name} chair back mesh", (x, y + 0.255, 1.56), (0.37, 0.025, 0.46), FABRIC, rotation=(math.radians(-7), 0, 0), bevel=0.11)
    cube(f"{name} chair headrest", (x, y + 0.36, 2.03), (0.27, 0.07, 0.14), FABRIC, rotation=(math.radians(-7), 0, 0), bevel=0.09)
    for side in (-1, 1):
        tube_between(f"{name} chair arm post {side}", (x + side * 0.40, y, 1.06), (x + side * 0.40, y - 0.02, 1.38), 0.028, GRAPHITE, vertices=10)
        cube(f"{name} chair arm pad {side}", (x + side * 0.40, y - 0.13, 1.40), (0.055, 0.21, 0.04), FABRIC, bevel=0.035)
    for i in range(5):
        angle = TAU * i / 5
        end = (x + math.cos(angle) * 0.44, y + math.sin(angle) * 0.44, 0.48)
        tube_between(f"{name} chair base {i}", (x, y, 0.52), end, 0.028, GRAPHITE, vertices=10)
        cylinder(f"{name} chair caster {i}", (end[0], end[1], 0.43), 0.052, 0.055, GRAPHITE, vertices=12, rotation=(math.radians(90), 0, 0), bevel=0.015)


def create_person(name: str, x: float, y: float, suit: bpy.types.Material, hair: bpy.types.Material) -> None:
    # Seated, slightly forward-leaning, with distinct anatomical masses rather
    # than a capsule mascot. Hands meet the keyboard plane.
    uv_sphere(f"{name} hips", (x, y - 0.01, 1.17), (0.29, 0.24, 0.18), GRAPHITE)
    uv_sphere(f"{name} torso", (x, y - 0.04, 1.58), (0.34, 0.23, 0.47), suit)
    cube(f"{name} shirt placket", (x, y - 0.267, 1.59), (0.018, 0.012, 0.31), OAK_DARK, bevel=0.008)
    cylinder(f"{name} neck", (x, y - 0.03, 1.96), 0.09, 0.18, SKIN, vertices=20)
    uv_sphere(f"{name} head", (x, y - 0.07, 2.18), (0.22, 0.205, 0.27), SKIN)
    hair_scale = (0.245, 0.222, 0.17) if name in {"B03", "D02"} else (0.232, 0.214, 0.15)
    uv_sphere(f"{name} hair", (x, y - 0.035, 2.31), hair_scale, hair)
    if name in {"B03", "D02"}:
        for side in (-1, 1):
            uv_sphere(f"{name} long hair {side}", (x + side * 0.20, y + 0.01, 2.06), (0.09, 0.10, 0.30), hair, segments=16, rings=8)
    # Nose and small ear details help the close camera read as a person.
    uv_sphere(f"{name} nose", (x, y - 0.274, 2.17), (0.035, 0.04, 0.055), SKIN, segments=16, rings=8)
    uv_sphere(f"{name} left ear", (x - 0.22, y - 0.065, 2.18), (0.04, 0.025, 0.055), SKIN, segments=12, rings=6)
    uv_sphere(f"{name} right ear", (x + 0.22, y - 0.065, 2.18), (0.04, 0.025, 0.055), SKIN, segments=12, rings=6)
    for side in (-1, 1):
        shoulder = (x + side * 0.27, y - 0.06, 1.72)
        elbow = (x + side * 0.37, y - 0.31, 1.43)
        hand = (x + side * 0.24, y - 0.66, 1.38)
        tube_between(f"{name} arm upper {side}", shoulder, elbow, 0.085, suit)
        tube_between(f"{name} arm lower {side}", elbow, hand, 0.072, SKIN)
        uv_sphere(f"{name} hand {side}", hand, (0.09, 0.06, 0.045), SKIN, segments=16, rings=8)
        # Complete seated leg chain and shoes are visible in side/focus views.
        knee = (x + side * 0.18, y - 0.30, 0.91)
        ankle = (x + side * 0.18, y - 0.37, 0.56)
        tube_between(f"{name} thigh {side}", (x + side * 0.15, y, 1.11), knee, 0.115, GRAPHITE)
        tube_between(f"{name} shin {side}", knee, ankle, 0.088, GRAPHITE)
        cube(f"{name} shoe {side}", (x + side * 0.18, y - 0.47, 0.50), (0.12, 0.24, 0.075), OAK_DARK, bevel=0.055)


def create_station(
    code: str,
    x: float,
    y: float,
    suit_color: tuple[float, float, float, float],
    monitors: int = 3,
    scale: float = 1.0,
    rotation_degrees: float = 0.0,
) -> None:
    before = set(bpy.context.scene.objects)

    create_platform(code, x, y, 1.76 * scale, central=code == "A01")

    # Oak crescent desk: thick bullnose top, dark shadow-line, fluted stone
    # carcass and two readable drawer banks from the workstation reference.
    top_z = 1.42
    annular_sector(f"{code} oak crescent", (x, y - 0.08, top_z), 0.74 * scale, 1.52 * scale, 0.18, math.radians(205), math.radians(335), OAK, 38)
    annular_sector(f"{code} dark oak reveal", (x, y - 0.08, top_z - 0.13), 0.81 * scale, 1.47 * scale, 0.08, math.radians(207), math.radians(333), OAK_DARK, 38)

    for i in range(17):
        angle = math.radians(212 + i * (116 / 16))
        radius = 1.28 * scale
        px = x + math.cos(angle) * radius
        py = y - 0.08 + math.sin(angle) * radius
        cylinder(f"{code} fluted cabinet {i:02}", (px, py, 0.91), 0.075, 0.88, IVORY, vertices=12, bevel=0.018)

    # Bronze kick plate and a restrained warm under-desk light.
    annular_sector(f"{code} brass kick", (x, y - 0.08, 0.49), 1.16 * scale, 1.34 * scale, 0.055, math.radians(210), math.radians(330), BRASS, 32)
    annular_sector(f"{code} bronze bullnose", (x, y - 0.08, 1.525), 1.46 * scale, 1.51 * scale, 0.025, math.radians(216), math.radians(324), BRASS, 32)
    for bank_index, bank_x in enumerate((-0.96, 0.96)):
        cube(f"{code} drawer bank {bank_index}", (x + bank_x * scale, y - 0.18, 0.98), (0.31, 0.36, 0.46), OAK, bevel=0.075)
        for drawer in range(3):
            drawer_z = 0.70 + drawer * 0.28
            cube(f"{code} drawer line {bank_index}-{drawer}", (x + bank_x * scale, y - 0.548, drawer_z), (0.24, 0.012, 0.008), OAK_DARK, bevel=0.004)
            cube(f"{code} drawer pull {bank_index}-{drawer}", (x + bank_x * scale, y - 0.565, drawer_z + 0.08), (0.075, 0.012, 0.012), BRASS, bevel=0.008)

    # Monitors sit on the far/inner desk edge and fan toward the operator.
    offsets = [0.0] if monitors == 1 else ([-0.68, 0.0, 0.68] if monitors == 3 else [-0.46, 0.46])
    for index, offset in enumerate(offsets):
        angle = -offset * 0.34
        create_monitor(f"{code} monitor {index + 1}", x + offset * scale, y - 0.34, 2.05, angle, width=0.86 * scale)

    # Desk objects: keyboard, cup, folio and small equipment block.
    cube(f"{code} keyboard", (x, y - 0.62, 1.56), (0.34, 0.13, 0.025), GRAPHITE, bevel=0.03)
    for key_index in range(9):
        key_x = x - 0.27 + (key_index % 5) * 0.135
        key_y = y - 0.68 + (key_index // 5) * 0.12
        cube(f"{code} keyboard key {key_index}", (key_x, key_y, 1.59), (0.045, 0.035, 0.008), IVORY, bevel=0.008)
    cube(f"{code} mouse", (x + 0.46, y - 0.63, 1.59), (0.07, 0.10, 0.025), GRAPHITE, bevel=0.04)
    cylinder(f"{code} ceramic cup", (x + 0.72, y - 0.54, 1.69), 0.105, 0.25, WHITE, vertices=24, bevel=0.025)
    cube(f"{code} notebook", (x - 0.67, y - 0.48, 1.55), (0.22, 0.15, 0.025), IVORY, rotation=(0, 0, math.radians(-8)), bevel=0.018)
    cube(f"{code} compute unit", (x + 1.04, y + 0.10, 0.94), (0.22, 0.33, 0.48), GRAPHITE, bevel=0.07)
    torus(f"{code} compute LED", (x + 1.04, y - 0.236, 0.98), 0.095, 0.018, LIME, rotation=(math.radians(90), 0, 0), major_segments=24)

    create_chair(code, x, y + 0.72)
    suit = material(f"{code} wardrobe", suit_color, roughness=0.56)
    create_person(code, x, y + 0.68, suit, GRAPHITE)

    # Named empty keeps exact interaction coordinates available after GLB export.
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(x, y, 1.6))
    hotspot = bpy.context.object
    hotspot.name = f"AgentHotspot_{code}"
    hotspot.empty_display_size = 0.45

    # Rotate each complete workstation toward the composition center while
    # preserving its authored local proportions and exact hotspot center.
    station_objects = [obj for obj in bpy.context.scene.objects if obj not in before]
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(x, y, 0))
    root = bpy.context.object
    root.name = f"StationRoot_{code}"
    root.empty_display_size = 0.32
    for obj in station_objects:
        obj.parent = root
        obj.matrix_parent_inverse = root.matrix_world.inverted()
    root.rotation_euler.z = math.radians(rotation_degrees)


def create_tree() -> None:
    tx, ty = 0.0, 2.35
    cylinder("Ficus limestone planter", (tx, ty, 0.61), 1.92, 0.38, STONE, vertices=96, bevel=0.075)
    torus("Ficus planter bronze rim", (tx, ty, 0.82), 1.71, 0.038, BRASS, major_segments=96)
    cylinder("Ficus soil", (tx, ty, 0.82), 1.64, 0.065, STONE_DARK, vertices=72, bevel=0.02)

    # Buttress roots radiate across the soil and converge into several fused
    # trunks, matching the mature ficus silhouette in the production board.
    root_starts = ((-0.28, -0.04), (0.02, -0.12), (0.30, 0.0), (-0.14, 0.16), (0.18, 0.18))
    for index in range(13):
        angle = TAU * index / 13 + (index % 3) * 0.08
        sx, sy = root_starts[index % len(root_starts)]
        start = (tx + sx, ty + sy, 0.90 + (index % 2) * 0.05)
        end = (tx + math.cos(angle) * 1.48, ty + math.sin(angle) * 1.34, 0.86)
        tapered_tube_between(f"Ficus buttress root {index:02}", start, end, 0.26, 0.055, TRUNK, vertices=18)

    trunk_paths = [
        ((-0.30, -0.04, 0.90), (-0.20, 0.03, 2.55), (-0.58, -0.08, 4.12)),
        ((-0.05, -0.16, 0.90), (0.02, -0.07, 2.70), (0.30, -0.22, 4.32)),
        ((0.26, -0.04, 0.90), (0.18, 0.06, 2.45), (0.80, 0.05, 4.06)),
        ((-0.18, 0.18, 0.90), (-0.02, 0.18, 2.36), (-0.24, 0.58, 4.22)),
        ((0.12, 0.20, 0.90), (0.08, 0.24, 2.62), (0.48, 0.62, 4.38)),
    ]
    for trunk_index, path in enumerate(trunk_paths):
        world_path = [(tx + px, ty + py, pz) for px, py, pz in path]
        tapered_tube_between(f"Ficus trunk {trunk_index} lower", world_path[0], world_path[1], 0.34, 0.26, TRUNK, vertices=24)
        tapered_tube_between(f"Ficus trunk {trunk_index} upper", world_path[1], world_path[2], 0.26, 0.13, TRUNK, vertices=22)

    branch_specs = [
        ((-0.20, 0.02, 2.60), (-1.55, -0.35, 4.55), 0.24, 0.095),
        ((0.04, -0.04, 2.82), (1.58, -0.28, 4.62), 0.24, 0.095),
        ((-0.06, 0.16, 3.08), (-0.82, 1.18, 5.05), 0.21, 0.075),
        ((0.18, 0.22, 3.15), (0.92, 1.28, 5.16), 0.21, 0.075),
        ((-0.50, -0.02, 3.72), (-2.30, -0.64, 4.88), 0.15, 0.052),
        ((0.52, -0.02, 3.78), (2.35, -0.56, 4.92), 0.15, 0.052),
        ((-0.28, 0.48, 3.86), (-1.65, 1.52, 5.32), 0.14, 0.050),
        ((0.35, 0.52, 3.92), (1.72, 1.58, 5.38), 0.14, 0.050),
        ((-0.10, 0.34, 4.15), (-0.24, 2.05, 5.54), 0.13, 0.045),
        ((0.20, 0.30, 4.18), (0.55, 2.03, 5.50), 0.13, 0.045),
    ]
    world_branches = []
    for index, (start, end, r1, r2) in enumerate(branch_specs):
        a = (tx + start[0], ty + start[1], start[2])
        b = (tx + end[0], ty + end[1], end[2])
        tapered_tube_between(f"Ficus major branch {index:02}", a, b, r1, r2, TRUNK, vertices=18)
        world_branches.append((a, b))
        # Fork each major branch near its tip to keep negative spaces natural.
        branch_vector = Vector(b) - Vector(a)
        fork_start = Vector(a) + branch_vector * 0.68
        side = -1 if index % 2 else 1
        fork_end = Vector(b) + Vector((side * 0.52, 0.32 if index % 3 else -0.28, 0.38))
        tapered_tube_between(f"Ficus fork branch {index:02}", tuple(fork_start), tuple(fork_end), r2 * 0.82, r2 * 0.34, TRUNK, vertices=14)

    crown_centers = [
        (-2.25, -0.40, 5.08), (-1.62, -0.52, 5.42), (-0.86, -0.42, 5.70),
        (0.0, -0.38, 5.86), (0.88, -0.42, 5.72), (1.62, -0.48, 5.44), (2.28, -0.32, 5.10),
        (-1.66, 0.58, 5.48), (-0.88, 0.86, 5.86), (0.0, 0.98, 6.05),
        (0.90, 0.88, 5.90), (1.68, 0.62, 5.50), (-0.58, 1.58, 5.72), (0.52, 1.62, 5.76),
    ]
    crown_centers = [(tx + x, ty + y, z) for x, y, z in crown_centers]
    create_leaf_cards("Ficus photoreal canopy", crown_centers, count=720, spread=(0.76, 0.58, 0.52), seed=2608)

    understory_centers = [
        (tx + math.cos(angle) * 1.18, ty + math.sin(angle) * 1.10, 1.10 + (index % 3) * 0.08)
        for index, angle in enumerate(i * TAU / 14 for i in range(14))
    ]
    create_leaf_cards("Ficus planter understory", understory_centers, count=86, spread=(0.18, 0.18, 0.15), seed=8226, size_range=(0.16, 0.32))


def create_landscape_details() -> None:
    """Add restrained planted islands and warm lantern rhythm."""
    bed_specs = (
        (-3.18, 1.72, 0.84), (3.28, 1.62, 0.86),
        (-3.12, -2.05, 0.72), (3.18, -2.12, 0.74),
        (-2.62, -5.08, 0.78), (2.70, -5.02, 0.80),
        (-8.02, -0.15, 0.72), (8.10, -0.02, 0.72),
    )
    foliage_centers = []
    for index, (x, y, radius) in enumerate(bed_specs):
        cylinder(f"Landscape bed {index}", (x, y, 0.49), radius, 0.24, STONE, vertices=48, bevel=0.065)
        cylinder(f"Landscape soil {index}", (x, y, 0.625), radius - 0.12, 0.055, STONE_DARK, vertices=40, bevel=0.018)
        foliage_centers.extend(
            (
                (x - radius * 0.30, y, 0.92),
                (x + radius * 0.24, y + radius * 0.12, 1.00),
                (x, y - radius * 0.24, 0.86),
            )
        )
    create_leaf_cards("Plaza tropical planting", foliage_centers, count=188, spread=(0.28, 0.24, 0.26), seed=3126, size_range=(0.17, 0.38))

    lanterns = (
        (-3.55, 0.15), (3.62, 0.10), (-3.72, -4.05), (3.78, -4.02),
        (-7.52, 2.18), (7.58, 2.08), (-5.00, 5.30), (4.62, 5.28),
    )
    for index, (x, y) in enumerate(lanterns):
        cylinder(f"Lantern base {index}", (x, y, 0.52), 0.12, 0.14, BRASS, vertices=16, bevel=0.022)
        tube_between(f"Lantern stem {index}", (x, y, 0.57), (x, y, 0.98), 0.026, BRASS, vertices=10)
        cube(f"Lantern glass {index}", (x, y, 1.05), (0.12, 0.12, 0.16), GLASS, bevel=0.035)
        uv_sphere(f"Lantern glow {index}", (x, y, 1.05), (0.055, 0.055, 0.072), WARM_GLOW, segments=12, rings=6)
        cube(f"Lantern cap {index}", (x, y, 1.24), (0.16, 0.16, 0.035), BRASS, bevel=0.025)


def create_pavilions() -> None:
    # Greenhouse envelope gives real architectural depth behind the two hero
    # volumes without turning the office into a closed box.
    cube("Atrium rear glass", (0, 10.15, 4.10), (13.75, 0.055, 3.75), GLASS, bevel=0.02)
    for index, x in enumerate((-13.2, -10.2, -7.65, -5.1, -2.55, 0, 2.55, 5.1, 7.65, 10.2, 13.2)):
        cube(f"Atrium rear mullion {index}", (x, 10.08, 4.05), (0.045, 0.065, 3.70), GRAPHITE, bevel=0.018)
    cube("Atrium rear beam", (0, 10.06, 7.60), (13.78, 0.09, 0.08), GRAPHITE, bevel=0.025)

    # Left signature waterfall wall.
    wx, wy = -7.72, 6.30
    cube("Waterfall limestone core", (wx, wy + 0.24, 2.55), (1.78, 0.34, 2.20), IVORY, bevel=0.20)
    cube("Waterfall glass sheet", (wx, wy - 0.16, 2.52), (1.46, 0.035, 1.78), GLASS, bevel=0.07)
    cube("Waterfall bronze header", (wx, wy - 0.12, 4.38), (1.72, 0.18, 0.13), BRASS, bevel=0.08)
    cube("Waterfall basin", (wx, wy - 0.48, 0.62), (2.06, 0.84, 0.27), STONE, bevel=0.32)
    cube("Waterfall basin water", (wx, wy - 0.68, 0.89), (1.78, 0.58, 0.055), WATER, bevel=0.22)
    for index in range(18):
        x = wx - 1.34 + index * (2.68 / 17)
        cube(f"Waterfall stream {index:02}", (x, wy - 0.205, 2.58), (0.018 + (index % 3) * 0.006, 0.012, 1.62), WATER, bevel=0.008)
    for side in (-1, 1):
        cube(f"Waterfall ribbed pier {side}", (wx + side * 1.62, wy + 0.06, 2.48), (0.20, 0.26, 2.14), STONE, bevel=0.09)
        for rib in range(6):
            cube(f"Waterfall pier flute {side}-{rib}", (wx + side * 1.62 + (rib - 2.5) * 0.052, wy - 0.215, 2.48), (0.012, 0.012, 1.93), STONE_DARK, bevel=0.005)

    # Right signature focus pavilion: curved silhouette, visible furniture and
    # practical lights. Its glass is intentionally thin to keep the interior
    # readable in both Cycles and WebGL.
    px, py = 6.86, 6.28
    cube("Focus pavilion plinth", (px, py, 0.62), (3.15, 1.58, 0.30), STONE, bevel=0.58)
    cube("Focus pavilion oak back", (px, py + 1.25, 2.62), (2.78, 0.16, 1.82), OAK_DARK, bevel=0.30)
    cube("Focus pavilion glass left", (px - 2.86, py, 2.65), (0.04, 1.12, 1.84), GLASS, bevel=0.18)
    cube("Focus pavilion glass right", (px + 2.86, py, 2.65), (0.04, 1.12, 1.84), GLASS, bevel=0.18)
    cube("Focus pavilion bronze roof", (px, py + 0.02, 4.58), (3.08, 1.48, 0.16), BRASS, bevel=0.46)
    cube("Focus pavilion timber ceiling", (px, py + 0.02, 4.38), (2.86, 1.28, 0.08), OAK, bevel=0.32)
    for side in (-1, 1):
        cube(f"Focus pavilion corner post {side}", (px + side * 2.82, py - 1.06, 2.62), (0.055, 0.055, 1.80), BRASS, bevel=0.022)
        cube(f"Focus bookcase {side}", (px + side * 2.18, py + 0.92, 2.51), (0.50, 0.30, 1.48), OAK, bevel=0.10)
        for shelf in range(4):
            cube(f"Focus shelf {side}-{shelf}", (px + side * 2.18, py + 0.58, 1.30 + shelf * 0.70), (0.44, 0.30, 0.038), BRASS, bevel=0.016)
            for book in range(3):
                cube(
                    f"Focus book {side}-{shelf}-{book}",
                    (px + side * (1.86 + book * 0.16), py + 0.52, 1.49 + shelf * 0.70),
                    (0.055, 0.11, 0.16 + (book % 2) * 0.06),
                    LEAF_LIGHT if book == 1 and shelf % 2 else IVORY,
                    bevel=0.018,
                )
    cube("Focus sofa base", (px, py + 0.38, 1.08), (1.45, 0.55, 0.26), OAK, bevel=0.24)
    cube("Focus sofa seat", (px, py + 0.02, 1.34), (1.36, 0.48, 0.17), IVORY, bevel=0.18)
    cube("Focus sofa back", (px, py + 0.67, 1.73), (1.38, 0.18, 0.46), IVORY, rotation=(math.radians(-5), 0, 0), bevel=0.18)
    for side in (-1, 0, 1):
        cube(f"Focus cushion {side}", (px + side * 0.72, py + 0.38, 1.77), (0.30, 0.12, 0.28), FABRIC if side == 0 else WHITE, bevel=0.11)
    cylinder("Focus coffee table", (px, py - 0.42, 1.18), 0.52, 0.09, OAK, vertices=48, bevel=0.035)
    cylinder("Focus coffee table stem", (px, py - 0.42, 0.92), 0.07, 0.48, BRASS, vertices=18, bevel=0.015)
    for light_index, light_x in enumerate((-1.55, 0, 1.55)):
        cylinder(f"Focus ceiling light {light_index}", (px + light_x, py - 0.10, 4.27), 0.10, 0.025, WHITE, vertices=20, bevel=0.012)

    # Restrained planted borders frame the architecture; the tree remains the
    # only dense vegetation mass.
    border_centers = [(-9.2, 6.0, 1.05), (-6.15, 6.05, 1.03), (4.20, 5.22, 1.04), (9.42, 5.35, 1.06)]
    for index, center in enumerate(border_centers):
        cylinder(f"Pavilion planter {index}", (center[0], center[1], 0.62), 0.58, 0.45, STONE, vertices=36, bevel=0.08)
    create_leaf_cards("Pavilion border foliage", border_centers, count=44, spread=(0.34, 0.28, 0.34), seed=9042, size_range=(0.22, 0.42))


def create_lighting_and_camera() -> None:
    world = bpy.context.scene.world or bpy.data.worlds.new("Garden Atrium World")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.16, 0.22, 0.19, 1)
    background.inputs["Strength"].default_value = 0.52

    bpy.ops.object.light_add(type="SUN", location=(-5.0, -8.0, 15.0))
    sun = bpy.context.object
    sun.name = "Late morning atrium sun"
    sun.data.energy = 2.15
    sun.data.angle = math.radians(5.2)
    sun.data.color = (1.0, 0.78, 0.52)
    sun.rotation_euler = (math.radians(24), math.radians(-18), math.radians(-34))

    bpy.ops.object.light_add(type="AREA", location=(-7.5, -8.0, 14.5))
    key = bpy.context.object
    key.name = "Warm atrium key light"
    key.data.energy = 2350
    key.data.shape = "DISK"
    key.data.size = 7.0
    key.data.color = (1.0, 0.83, 0.64)
    key.rotation_euler = (math.radians(25), 0, math.radians(-35))

    bpy.ops.object.light_add(type="AREA", location=(7.5, -2.0, 9.0))
    fill = bpy.context.object
    fill.name = "Cool glass fill"
    fill.data.energy = 1150
    fill.data.size = 8.0
    fill.data.color = (0.48, 0.70, 0.66)
    fill.rotation_euler = (math.radians(40), 0, math.radians(145))

    bpy.ops.object.light_add(type="AREA", location=(0, 8.0, 10.0))
    rim = bpy.context.object
    rim.name = "Pavilion rim light"
    rim.data.energy = 760
    rim.data.size = 6.0
    rim.data.color = (1.0, 0.78, 0.48)
    rim.rotation_euler = (math.radians(8), 0, math.radians(180))

    bpy.ops.object.light_add(type="AREA", location=(6.86, 5.72, 3.55))
    pavilion_light = bpy.context.object
    pavilion_light.name = "Focus pavilion practical light"
    pavilion_light.data.energy = 520
    pavilion_light.data.shape = "RECTANGLE"
    pavilion_light.data.size = 4.2
    pavilion_light.data.size_y = 1.8
    pavilion_light.data.color = (1.0, 0.61, 0.32)
    pavilion_light.rotation_euler = (math.radians(18), 0, math.radians(180))

    bpy.ops.object.light_add(type="AREA", location=(-7.72, 5.75, 3.55))
    waterfall_light = bpy.context.object
    waterfall_light.name = "Waterfall cool light"
    waterfall_light.data.energy = 360
    waterfall_light.data.size = 3.0
    waterfall_light.data.color = (0.30, 0.78, 0.82)
    waterfall_light.rotation_euler = (math.radians(28), 0, math.radians(180))

    bpy.ops.object.camera_add(location=(18.4, -25.8, 20.7))
    camera = bpy.context.object
    camera.name = "CrewLab overview camera"
    camera.data.lens = 52
    camera.data.sensor_width = 36
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = 27.0
    camera.data.dof.aperture_fstop = 10.0
    target = Vector((0, 0.70, 1.32))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera


def configure_render() -> None:
    scene = bpy.context.scene
    # Cycles CPU is used for the deterministic headless validation render.
    # Eevee 5.x requires compute-shader features unavailable on some Windows
    # headless/remote GPUs even though the exported GLB works in WebGL.
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.cycles.preview_samples = 16
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW_PATH)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.resolution_percentage = 100
    scene.render.use_file_extension = True
    scene.view_settings.look = "AgX - Medium High Contrast"

    # Browser export settings benefit from clean transforms and a compact scene.
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0


def point_camera(camera: bpy.types.Object, location: tuple[float, float, float], target: tuple[float, float, float]) -> None:
    camera.location = location
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_comparison_views() -> None:
    """Render fixed visual gates used to review fidelity before Portal swap."""
    scene = bpy.context.scene
    camera = scene.camera
    views = (
        ("workstation", (4.9, -8.1, 4.9), (0.0, -0.82, 1.42)),
        ("tree-water", (-7.0, -5.2, 6.4), (0.0, 2.35, 3.20)),
        ("pavilion", (11.9, -1.8, 6.5), (6.55, 6.18, 2.28)),
    )
    scene.cycles.samples = 18
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 800
    for name, location, target in views:
        point_camera(camera, location, target)
        scene.render.filepath = str(OUTPUT_DIR / f"garden-office-v3-{name}.png")
        bpy.ops.render.render(write_still=True)


def prepare_runtime_meshes() -> None:
    """Bake modifiers/transforms and batch static meshes by material."""
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    for obj in meshes:
        if obj.parent is not None:
            world_matrix = obj.matrix_world.copy()
            obj.parent = None
            obj.matrix_world = world_matrix
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        for modifier in list(obj.modifiers):
            try:
                bpy.ops.object.modifier_apply(modifier=modifier.name)
            except RuntimeError:
                pass

    groups: dict[tuple[str, ...], list[bpy.types.Object]] = {}
    for obj in meshes:
        key = tuple(slot.material.name if slot.material else "None" for slot in obj.material_slots)
        groups.setdefault(key, []).append(obj)

    for key, objects in groups.items():
        if len(objects) < 2:
            continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        active = objects[0]
        bpy.context.view_layer.objects.active = active
        bpy.ops.object.join()
        material_slug = "_".join(key).replace(" ", "_")[:42]
        active.name = f"RuntimeBatch_{material_slug}"
        if "display" in material_slug.lower():
            active.name += "_Screen"


def build_scene() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()
    make_materials()
    create_water_and_plaza()

    station_specs = [
        ("A01", 0.0, -0.85, (0.07, 0.14, 0.28, 1), 3, 1.05, 180),
        ("B02", -5.45, 3.65, (0.05, 0.29, 0.17, 1), 2, 0.91, 56),
        ("B03", 5.45, 3.65, (0.06, 0.30, 0.40, 1), 2, 0.91, -56),
        ("D01", -5.65, -2.75, (0.56, 0.21, 0.035, 1), 3, 0.94, 124),
        ("D02", 0.0, -5.15, (0.30, 0.10, 0.44, 1), 3, 0.96, 180),
        ("E01", 5.65, -2.75, (0.28, 0.10, 0.40, 1), 2, 0.94, -124),
    ]
    for spec in station_specs:
        create_station(*spec)

    create_tree()
    create_landscape_details()
    create_pavilions()
    create_lighting_and_camera()
    configure_render()

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    if os.environ.get("CREWLAB_SKIP_RENDER", "0") != "1":
        bpy.ops.render.render(write_still=True)
        if os.environ.get("CREWLAB_RENDER_DETAILS", "1") != "0":
            render_comparison_views()
    prepare_runtime_meshes()

    # Lights and camera are authored for the validation render; React Three
    # Fiber supplies its own responsive camera and performant runtime lighting.
    export_objects = [obj for obj in bpy.context.scene.objects if obj.type not in {"LIGHT", "CAMERA"}]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in export_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = export_objects[0]
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_animations=False,
    )
    print(f"CREWLAB_BLEND={BLEND_PATH}")
    print(f"CREWLAB_GLB={GLB_PATH}")
    print(f"CREWLAB_PREVIEW={PREVIEW_PATH}")


if __name__ == "__main__":
    build_scene()

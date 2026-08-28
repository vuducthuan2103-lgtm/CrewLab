"""Build CrewLab's reference-driven archviz garden office v4.

Run with Blender 5.2+:
  blender --background --python scripts/blender/build_virtual_office.py

The script is the source of truth for the authored 3D asset. Version 4 follows
six fixed visual references, uses project-owned PBR maps and keeps all UI as
live HTML. Reference images are art-direction inputs, never flat backplates.
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
REFERENCE_DIR = OUTPUT_DIR / "references" / "v4"
LEAF_ATLAS_PATH = OUTPUT_DIR / "references" / "v3" / "tex-ficus-clusters.png"
TEXTURE_DIR = OUTPUT_DIR / "textures" / "v4"
STONE_TEXTURE_PATH = TEXTURE_DIR / "tex-limestone-albedo.jpg"
STONE_NORMAL_PATH = TEXTURE_DIR / "tex-limestone-normal.jpg"
STONE_ROUGHNESS_PATH = TEXTURE_DIR / "tex-limestone-roughness.jpg"
OAK_TEXTURE_PATH = TEXTURE_DIR / "tex-oak-albedo.jpg"
OAK_NORMAL_PATH = TEXTURE_DIR / "tex-oak-normal.jpg"
OAK_ROUGHNESS_PATH = TEXTURE_DIR / "tex-oak-roughness.jpg"
BARK_TEXTURE_PATH = TEXTURE_DIR / "tex-ficus-bark-albedo.jpg"
BARK_NORMAL_PATH = TEXTURE_DIR / "tex-ficus-bark-normal.jpg"
BARK_ROUGHNESS_PATH = TEXTURE_DIR / "tex-ficus-bark-roughness.jpg"
BLEND_PATH = OUTPUT_DIR / "garden-office-v4.blend"
GLB_PATH = OUTPUT_DIR / "garden-office-v4.glb"
PREVIEW_PATH = OUTPUT_DIR / "garden-office-v4-preview.png"

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


def attach_pbr_textures(
    mat: bpy.types.Material,
    albedo_path: Path,
    normal_path: Path,
    roughness_path: Path,
    *,
    normal_strength: float,
) -> None:
    for path in (albedo_path, normal_path, roughness_path):
        if not path.exists():
            raise FileNotFoundError(f"Missing project texture: {path}")
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")

    albedo = nodes.new("ShaderNodeTexImage")
    albedo.name = f"{mat.name} albedo"
    albedo.image = bpy.data.images.load(str(albedo_path), check_existing=True)
    albedo.image.colorspace_settings.name = "sRGB"
    albedo.interpolation = "Linear"
    albedo.extension = "REPEAT"
    links.new(albedo.outputs["Color"], bsdf.inputs["Base Color"])

    roughness = nodes.new("ShaderNodeTexImage")
    roughness.name = f"{mat.name} roughness"
    roughness.image = bpy.data.images.load(str(roughness_path), check_existing=True)
    roughness.image.colorspace_settings.name = "Non-Color"
    roughness.interpolation = "Linear"
    roughness.extension = "REPEAT"
    links.new(roughness.outputs["Color"], bsdf.inputs["Roughness"])

    normal = nodes.new("ShaderNodeTexImage")
    normal.name = f"{mat.name} normal"
    normal.image = bpy.data.images.load(str(normal_path), check_existing=True)
    normal.image.colorspace_settings.name = "Non-Color"
    normal.interpolation = "Linear"
    normal.extension = "REPEAT"
    normal_map = nodes.new("ShaderNodeNormalMap")
    normal_map.inputs["Strength"].default_value = normal_strength
    links.new(normal.outputs["Color"], normal_map.inputs["Color"])
    links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])


STONE = None
STONE_DARK = None
STONE_JOINT = None
OAK = None
OAK_DARK = None
IVORY = None
BRASS = None
GRAPHITE = None
FABRIC = None
HAIR = None
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
    global STONE, STONE_DARK, STONE_JOINT, OAK, OAK_DARK, IVORY, BRASS, GRAPHITE, FABRIC, HAIR
    global GLASS, WATER, SCREEN, LIME, LEAF, LEAF_LIGHT, LEAF_ATLAS, TRUNK, SKIN, WHITE, WARM_GLOW

    STONE = material("Limestone warm", (0.72, 0.66, 0.56, 1), roughness=0.70)
    STONE_DARK = material("Limestone joint", (0.14, 0.13, 0.105, 1), roughness=0.90)
    STONE_JOINT = material("Limestone soft joint", (0.32, 0.275, 0.21, 1), roughness=0.88)
    IVORY = material("Ivory fluted stone", (0.76, 0.68, 0.55, 1), roughness=0.68)
    OAK = material("Quarter sawn oak", (0.52, 0.29, 0.11, 1), roughness=0.42, coat=0.10)
    OAK_DARK = material("Dark oak", (0.105, 0.045, 0.018, 1), roughness=0.44, coat=0.08)
    BRASS = material("Champagne bronze", (0.27, 0.145, 0.045, 1), roughness=0.42, metallic=0.78)
    GRAPHITE = material("Graphite", (0.018, 0.026, 0.025, 1), roughness=0.28, metallic=0.48)
    FABRIC = material("Graphite fabric", (0.025, 0.032, 0.031, 1), roughness=0.88)
    HAIR = material("Natural dark hair", (0.020, 0.014, 0.010, 1), roughness=0.66, metallic=0.0)
    GLASS = material("Low iron architectural glass", (0.20, 0.34, 0.31, 0.12), roughness=0.035, transmission=0.88, alpha=0.12, coat=0.46)
    WATER = material("Shallow turquoise water", (0.025, 0.24, 0.215, 0.62), roughness=0.055, transmission=0.50, alpha=0.66, coat=0.80)
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
    TRUNK = material("Old ficus bark", (0.26, 0.20, 0.14, 1), roughness=0.86)
    SKIN = material("Warm skin", (0.56, 0.31, 0.20, 1), roughness=0.58)
    WHITE = material("Warm ceramic", (0.83, 0.79, 0.68, 1), roughness=0.5)
    WARM_GLOW = material(
        "Warm practical glow",
        (1.0, 0.44, 0.12, 1),
        roughness=0.24,
        emission=(1.0, 0.32, 0.06, 1),
        emission_strength=3.0,
    )

    attach_pbr_textures(STONE, STONE_TEXTURE_PATH, STONE_NORMAL_PATH, STONE_ROUGHNESS_PATH, normal_strength=0.34)
    attach_pbr_textures(OAK, OAK_TEXTURE_PATH, OAK_NORMAL_PATH, OAK_ROUGHNESS_PATH, normal_strength=0.24)
    attach_pbr_textures(TRUNK, BARK_TEXTURE_PATH, BARK_NORMAL_PATH, BARK_ROUGHNESS_PATH, normal_strength=0.58)

    # Cycles detail for the validation render. The GLB keeps the physically
    # based water surface while unsupported procedural ripples are omitted.
    water_nodes = WATER.node_tree.nodes
    water_links = WATER.node_tree.links
    water_bsdf = water_nodes.get("Principled BSDF")
    water_noise = water_nodes.new("ShaderNodeTexNoise")
    water_noise.inputs["Scale"].default_value = 3.2
    water_noise.inputs["Detail"].default_value = 5.0
    water_noise.inputs["Roughness"].default_value = 0.62
    water_bump = water_nodes.new("ShaderNodeBump")
    water_bump.inputs["Strength"].default_value = 0.16
    water_bump.inputs["Distance"].default_value = 0.10
    water_links.new(water_noise.outputs["Fac"], water_bump.inputs["Height"])
    water_links.new(water_bump.outputs["Normal"], water_bsdf.inputs["Normal"])

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


def organic_slab(
    name: str,
    outline: list[tuple[float, float]],
    z: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    bevel: float = 0.12,
) -> bpy.types.Object:
    """Create an extruded freeform slab for paths, water and planted islands."""
    count = len(outline)
    verts = [(x, y, z - depth / 2) for x, y in outline] + [(x, y, z + depth / 2) for x, y in outline]
    faces: list[tuple[int, ...]] = [tuple(range(count - 1, -1, -1)), tuple(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    xs = [point[0] for point in outline]
    ys = [point[1] for point in outline]
    width = max(max(xs) - min(xs), 0.001)
    height = max(max(ys) - min(ys), 0.001)
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            uv_layer.data[loop_index].uv = ((vertex.x - min(xs)) / width * 4.0, (vertex.y - min(ys)) / height * 4.0)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    smooth_and_bevel(obj, bevel, 4)
    return obj


def ellipse_disc(
    name: str,
    location: tuple[float, float, float],
    radius_x: float,
    radius_y: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    bevel: float = 0.04,
) -> bpy.types.Object:
    obj = cylinder(name, location, 1.0, depth, mat, vertices=72, bevel=bevel)
    obj.scale = (radius_x, radius_y, 1.0)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def ellipse_ring(name: str, location: tuple[float, float, float], radius_x: float, radius_y: float, thickness: float, mat: bpy.types.Material) -> bpy.types.Object:
    obj = torus(name, location, 1.0, thickness, mat, major_segments=96)
    obj.scale = (radius_x, radius_y, 1.0)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def create_water_and_plaza() -> None:
    # The stage extends beyond the hero camera so the office reads as a real
    # atrium rather than a finite tabletop. An organic water layer sits below a
    # freeform limestone plate and reappears in recessed pools.
    cube("Atrium structural foundation", (0, 1.0, -0.70), (18.5, 14.2, 0.48), STONE_DARK, bevel=1.25)
    water_outline = [
        (-17.4, -10.7), (-11.0, -12.3), (-4.5, -11.5), (0.0, -12.2), (5.2, -11.4),
        (12.0, -12.0), (17.5, -8.8), (16.6, -2.8), (17.6, 3.6), (15.2, 10.2),
        (9.2, 12.0), (3.4, 11.6), (-2.5, 12.4), (-8.8, 11.7), (-15.6, 8.6), (-17.2, 2.4),
    ]
    organic_slab("Atrium water garden", water_outline, -0.08, 0.34, WATER, bevel=0.44)

    plaza_outline = [
        (-11.2, -7.1), (-8.6, -8.5), (-4.2, -7.9), (-0.2, -9.0), (4.0, -8.0), (8.6, -8.3),
        (11.0, -6.0), (10.1, -3.2), (11.5, -0.1), (10.4, 2.8), (11.2, 5.6), (8.9, 7.8),
        (5.0, 7.2), (2.5, 8.6), (0.0, 7.4), (-3.0, 8.5), (-5.5, 7.0), (-9.2, 7.6),
        (-11.2, 5.0), (-10.3, 2.0), (-11.6, -0.8), (-10.3, -3.8),
    ]
    plaza_outline = [(x * 1.24, y * 1.24) for x, y in plaza_outline]
    organic_slab("Flowing limestone plaza", plaza_outline, 0.18, 0.38, STONE, bevel=0.34)

    # Pool windows break the limestone mass and establish foreground depth.
    pools = (
        ("West garden pool", -10.25, -0.8, 1.42, 3.35),
        ("East garden pool", 10.35, -2.2, 1.52, 3.58),
        ("Rear west pool", -7.65, 7.15, 2.45, 1.18),
        ("Rear east pool", 7.72, 7.10, 2.52, 1.20),
        ("Foreground water court", 7.35, -7.70, 2.65, 1.16),
    )
    for name, x, y, rx, ry in pools:
        ellipse_disc(name, (x, y, 0.405), rx, ry, 0.075, WATER, bevel=0.10)
        ellipse_ring(f"{name} limestone coping", (x, y, 0.455), rx, ry, 0.085, STONE)

    # Architectural inlays and expansion joints follow the radial circulation.
    for radius in (3.05, 6.85):
        torus(f"Plaza bronze inlay {radius}", (0, 0.45, 0.405), radius, 0.022, BRASS, major_segments=112)
    for index, angle in enumerate((0.10, 0.88, 1.68, 2.46, 3.25, 4.03, 4.82, 5.58)):
        start = (math.cos(angle) * 2.1, 0.45 + math.sin(angle) * 2.1, 0.414)
        end = (math.cos(angle) * 9.2, 0.45 + math.sin(angle) * 7.0, 0.414)
        tube_between(f"Radial limestone joint {index}", start, end, 0.010, STONE_JOINT, vertices=8)

    for index, (x, y, radius) in enumerate(((10.0, -4.6, 0.30), (9.7, -5.2, 0.22), (-10.1, -2.2, 0.21), (7.8, -7.5, 0.18))):
        cylinder(f"Lily pad {index}", (x, y, 0.465), radius, 0.018, LEAF_LIGHT, vertices=28, bevel=0.008)


def create_platform(name: str, x: float, y: float, radius: float, *, central: bool = False) -> None:
    # Only the hero workstation receives a readable circular dais. Secondary
    # stations are set directly into the plaza with a hairline floor inlay, as
    # in the architectural reference; six repeated plinths read as a tabletop.
    if central:
        cylinder(f"{name} foundation", (x, y, 0.425), radius, 0.10, STONE, vertices=96, bevel=0.045)
        torus(f"{name} brass edge", (x, y, 0.490), radius - 0.08, 0.014, BRASS, major_segments=96)
        torus(f"{name} active lime ring", (x, y, 0.492), radius - 0.34, 0.006, LIME, major_segments=96)
    else:
        torus(f"{name} floor joint", (x, y, 0.414), radius - 0.10, 0.009, STONE_JOINT, major_segments=72)


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
    cylinder(f"{name} chair lift", (x, y, 0.67), 0.042, 0.45, GRAPHITE, vertices=20)
    uv_sphere(f"{name} chair seat", (x, y, 0.86), (0.39, 0.35, 0.075), FABRIC)
    cube(f"{name} chair back frame", (x, y + 0.285, 1.23), (0.37, 0.035, 0.40), GRAPHITE, rotation=(math.radians(-7), 0, 0), bevel=0.11)
    cube(f"{name} chair back mesh", (x, y + 0.248, 1.23), (0.32, 0.018, 0.34), FABRIC, rotation=(math.radians(-7), 0, 0), bevel=0.09)
    cube(f"{name} chair lumbar", (x, y + 0.205, 1.10), (0.25, 0.030, 0.07), GRAPHITE, rotation=(math.radians(-7), 0, 0), bevel=0.045)
    cube(f"{name} chair headrest", (x, y + 0.33, 1.61), (0.23, 0.055, 0.095), FABRIC, rotation=(math.radians(-7), 0, 0), bevel=0.07)
    for side in (-1, 1):
        tube_between(f"{name} chair arm post {side}", (x + side * 0.34, y, 0.88), (x + side * 0.34, y - 0.02, 1.12), 0.024, GRAPHITE, vertices=10)
        cube(f"{name} chair arm pad {side}", (x + side * 0.34, y - 0.11, 1.14), (0.045, 0.18, 0.032), FABRIC, bevel=0.028)
    for i in range(5):
        angle = TAU * i / 5
        end = (x + math.cos(angle) * 0.39, y + math.sin(angle) * 0.39, 0.47)
        tube_between(f"{name} chair base {i}", (x, y, 0.51), end, 0.024, GRAPHITE, vertices=10)
        cylinder(f"{name} chair caster {i}", (end[0], end[1], 0.425), 0.045, 0.047, GRAPHITE, vertices=12, rotation=(math.radians(90), 0, 0), bevel=0.012)


def create_person(name: str, x: float, y: float, suit: bpy.types.Material, hair: bpy.types.Material) -> None:
    # Realistic adult seated proportions: small head, long limbs and a forward
    # working posture derived from the dedicated v4 character reference.
    uv_sphere(f"{name} hips", (x, y - 0.01, 0.91), (0.24, 0.20, 0.13), GRAPHITE)
    uv_sphere(f"{name} torso", (x, y - 0.06, 1.22), (0.255, 0.16, 0.35), suit)
    cube(f"{name} shirt placket", (x, y - 0.222, 1.22), (0.010, 0.008, 0.23), OAK_DARK, bevel=0.005)
    cylinder(f"{name} neck", (x, y - 0.07, 1.50), 0.055, 0.12, SKIN, vertices=20)
    uv_sphere(f"{name} head", (x, y - 0.10, 1.67), (0.125, 0.112, 0.155), SKIN)
    uv_sphere(f"{name} jaw", (x, y - 0.115, 1.615), (0.100, 0.096, 0.092), SKIN, segments=20, rings=10)
    # Overlapping matte clumps break the plastic helmet silhouette while
    # remaining lightweight enough for six live WebGL characters.
    hair_clumps = (
        (-0.070, 0.018, 0.078, 0.080, 0.085, 0.068),
        (0.000, 0.026, 0.094, 0.084, 0.090, 0.074),
        (0.070, 0.018, 0.075, 0.078, 0.084, 0.065),
        (-0.045, -0.055, 0.062, 0.064, 0.054, 0.060),
        (0.045, -0.058, 0.064, 0.066, 0.052, 0.060),
    )
    for clump_index, (dx, dy, dz, sx, sy, sz) in enumerate(hair_clumps):
        uv_sphere(
            f"{name} hair clump {clump_index}",
            (x + dx, y - 0.075 + dy, 1.70 + dz),
            (sx, sy, sz),
            hair,
            segments=14,
            rings=7,
        )
    uv_sphere(f"{name} hair fringe", (x, y - 0.198, 1.72), (0.096, 0.026, 0.046), hair, segments=16, rings=8)
    if name in {"B03", "D02"}:
        for side in (-1, 1):
            uv_sphere(f"{name} long hair {side}", (x + side * 0.112, y - 0.02, 1.60), (0.048, 0.060, 0.18), hair, segments=16, rings=8)
    uv_sphere(f"{name} nose", (x, y - 0.216, 1.665), (0.019, 0.024, 0.030), SKIN, segments=12, rings=6)
    uv_sphere(f"{name} left ear", (x - 0.127, y - 0.095, 1.67), (0.022, 0.014, 0.032), SKIN, segments=12, rings=6)
    uv_sphere(f"{name} right ear", (x + 0.127, y - 0.095, 1.67), (0.022, 0.014, 0.032), SKIN, segments=12, rings=6)
    for side in (-1, 1):
        uv_sphere(f"{name} eye {side}", (x + side * 0.045, y - 0.208, 1.695), (0.010, 0.006, 0.007), GRAPHITE, segments=10, rings=5)
    for side in (-1, 1):
        shoulder = (x + side * 0.215, y - 0.08, 1.37)
        elbow = (x + side * 0.275, y - 0.30, 1.17)
        hand = (x + side * 0.20, y - 0.61, 1.15)
        tapered_tube_between(f"{name} arm upper {side}", shoulder, elbow, 0.067, 0.055, suit, vertices=14)
        tapered_tube_between(f"{name} arm lower {side}", elbow, hand, 0.053, 0.040, SKIN, vertices=14)
        uv_sphere(f"{name} hand {side}", hand, (0.065, 0.045, 0.028), SKIN, segments=16, rings=8)
        for finger in range(4):
            fx = hand[0] + side * (finger - 1.5) * 0.013
            tube_between(f"{name} finger {side}-{finger}", (fx, hand[1] - 0.018, hand[2]), (fx, hand[1] - 0.080, hand[2] - 0.006), 0.006, SKIN, vertices=8)
        knee = (x + side * 0.16, y - 0.28, 0.72)
        ankle = (x + side * 0.16, y - 0.38, 0.43)
        tapered_tube_between(f"{name} thigh {side}", (x + side * 0.13, y, 0.89), knee, 0.090, 0.074, GRAPHITE, vertices=14)
        tapered_tube_between(f"{name} shin {side}", knee, ankle, 0.073, 0.052, GRAPHITE, vertices=14)
        cube(f"{name} shoe {side}", (x + side * 0.16, y - 0.47, 0.38), (0.085, 0.18, 0.050), OAK_DARK, bevel=0.040)


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

    create_platform(code, x, y, 1.62 * scale, central=code == "A01")

    # Oak crescent desk: thick bullnose top, dark shadow-line, fluted stone
    # carcass and two readable drawer banks from the workstation reference.
    top_z = 1.10
    annular_sector(f"{code} oak crescent", (x, y - 0.08, top_z), 0.67 * scale, 1.40 * scale, 0.14, math.radians(205), math.radians(335), OAK, 44)
    annular_sector(f"{code} dark oak reveal", (x, y - 0.08, top_z - 0.10), 0.73 * scale, 1.36 * scale, 0.055, math.radians(207), math.radians(333), OAK_DARK, 40)

    for i in range(17):
        angle = math.radians(212 + i * (116 / 16))
        radius = 1.18 * scale
        px = x + math.cos(angle) * radius
        py = y - 0.08 + math.sin(angle) * radius
        cylinder(f"{code} fluted cabinet {i:02}", (px, py, 0.79), 0.060, 0.52, IVORY, vertices=12, bevel=0.014)

    # Bronze kick plate and a restrained warm under-desk light.
    annular_sector(f"{code} brass kick", (x, y - 0.08, 0.535), 1.06 * scale, 1.24 * scale, 0.045, math.radians(210), math.radians(330), BRASS, 32)
    annular_sector(f"{code} bronze bullnose", (x, y - 0.08, 1.178), 1.34 * scale, 1.40 * scale, 0.022, math.radians(216), math.radians(324), BRASS, 36)
    for bank_index, bank_x in enumerate((-0.88, 0.88)):
        cube(f"{code} drawer bank {bank_index}", (x + bank_x * scale, y - 0.18, 0.80), (0.27, 0.31, 0.27), OAK, bevel=0.065)
        for drawer in range(3):
            drawer_z = 0.63 + drawer * 0.17
            cube(f"{code} drawer line {bank_index}-{drawer}", (x + bank_x * scale, y - 0.498, drawer_z), (0.21, 0.010, 0.006), OAK_DARK, bevel=0.003)
            cube(f"{code} drawer pull {bank_index}-{drawer}", (x + bank_x * scale, y - 0.510, drawer_z + 0.045), (0.060, 0.010, 0.009), BRASS, bevel=0.006)

    # Monitors sit on the far/inner desk edge and fan toward the operator.
    offsets = [0.0] if monitors == 1 else ([-0.68, 0.0, 0.68] if monitors == 3 else [-0.46, 0.46])
    for index, offset in enumerate(offsets):
        angle = -offset * 0.34
        create_monitor(f"{code} monitor {index + 1}", x + offset * scale, y - 0.34, 1.52, angle, width=0.82 * scale)

    # Desk objects: keyboard, cup, folio and small equipment block.
    cube(f"{code} keyboard", (x, y - 0.62, 1.205), (0.31, 0.115, 0.018), GRAPHITE, bevel=0.025)
    for key_index in range(9):
        key_x = x - 0.27 + (key_index % 5) * 0.135
        key_y = y - 0.68 + (key_index // 5) * 0.12
        cube(f"{code} keyboard key {key_index}", (key_x, key_y, 1.229), (0.041, 0.030, 0.006), IVORY, bevel=0.006)
    cube(f"{code} mouse", (x + 0.42, y - 0.63, 1.225), (0.058, 0.088, 0.020), GRAPHITE, bevel=0.032)
    cylinder(f"{code} ceramic cup", (x + 0.68, y - 0.52, 1.30), 0.078, 0.17, WHITE, vertices=24, bevel=0.020)
    cube(f"{code} notebook", (x - 0.63, y - 0.48, 1.205), (0.19, 0.13, 0.018), IVORY, rotation=(0, 0, math.radians(-8)), bevel=0.014)
    cube(f"{code} tablet", (x - 0.82, y - 0.17, 1.215), (0.18, 0.12, 0.012), GRAPHITE, rotation=(0, 0, math.radians(14)), bevel=0.014)
    cube(f"{code} mouse pad", (x + 0.43, y - 0.61, 1.194), (0.18, 0.14, 0.006), FABRIC, bevel=0.018)
    cylinder(f"{code} desk planter", (x - 0.92, y - 0.31, 1.26), 0.075, 0.13, WHITE, vertices=20, bevel=0.018)
    create_leaf_cards(
        f"{code} desk plant",
        [(x - 0.92, y - 0.31, 1.39)],
        count=10,
        spread=(0.10, 0.09, 0.12),
        seed=400 + sum(ord(char) for char in code),
        size_range=(0.09, 0.16),
    )
    tube_between(f"{code} keyboard cable", (x, y - 0.51, 1.202), (x, y - 0.34, 1.188), 0.006, GRAPHITE, vertices=8)
    cube(f"{code} compute unit", (x + 0.98, y + 0.10, 0.82), (0.18, 0.29, 0.29), GRAPHITE, bevel=0.060)
    torus(f"{code} compute LED", (x + 0.98, y - 0.196, 0.84), 0.070, 0.012, LIME, rotation=(math.radians(90), 0, 0), major_segments=24)

    create_chair(code, x, y + 0.61)
    suit = material(f"{code} wardrobe", suit_color, roughness=0.56)
    create_person(code, x, y + 0.57, suit, HAIR)

    # Named empty keeps exact interaction coordinates available after GLB export.
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(x, y, 1.28))
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
    tx, ty = 0.0, 2.80
    cylinder("Ficus limestone planter", (tx, ty, 0.65), 2.28, 0.48, STONE, vertices=112, bevel=0.095)
    torus("Ficus planter bronze rim", (tx, ty, 0.91), 2.06, 0.032, BRASS, major_segments=112)
    cylinder("Ficus soil", (tx, ty, 0.91), 1.98, 0.070, STONE_DARK, vertices=88, bevel=0.02)

    # Buttress roots radiate across the soil and converge into several fused
    # trunks, matching the mature ficus silhouette in the production board.
    root_starts = ((-0.28, -0.04), (0.02, -0.12), (0.30, 0.0), (-0.14, 0.16), (0.18, 0.18))
    for index in range(13):
        angle = TAU * index / 13 + (index % 3) * 0.08
        sx, sy = root_starts[index % len(root_starts)]
        start = (tx + sx, ty + sy, 0.90 + (index % 2) * 0.05)
        end = (tx + math.cos(angle) * 1.86, ty + math.sin(angle) * 1.68, 0.93)
        tapered_tube_between(f"Ficus buttress root {index:02}", start, end, 0.30, 0.050, TRUNK, vertices=20)

    trunk_paths = [
        ((-0.34, -0.06, 0.94), (-0.25, 0.02, 3.05), (-0.78, -0.10, 5.12)),
        ((-0.08, -0.18, 0.94), (0.02, -0.08, 3.18), (0.34, -0.28, 5.34)),
        ((0.30, -0.05, 0.94), (0.22, 0.08, 2.98), (0.96, 0.02, 5.06)),
        ((-0.22, 0.20, 0.94), (-0.03, 0.20, 2.88), (-0.32, 0.72, 5.24)),
        ((0.14, 0.23, 0.94), (0.10, 0.26, 3.12), (0.58, 0.78, 5.40)),
        ((-0.02, 0.02, 0.96), (-0.44, -0.10, 2.72), (-1.18, 0.42, 4.88)),
        ((0.04, 0.08, 0.96), (0.48, 0.02, 2.74), (1.24, 0.52, 4.92)),
    ]
    for trunk_index, path in enumerate(trunk_paths):
        world_path = [(tx + px, ty + py, pz) for px, py, pz in path]
        tapered_tube_between(f"Ficus trunk {trunk_index} lower", world_path[0], world_path[1], 0.42, 0.30, TRUNK, vertices=26)
        tapered_tube_between(f"Ficus trunk {trunk_index} upper", world_path[1], world_path[2], 0.30, 0.13, TRUNK, vertices=24)

    branch_specs = [
        ((-0.24, 0.02, 3.08), (-1.88, -0.45, 5.72), 0.28, 0.090),
        ((0.06, -0.05, 3.26), (1.92, -0.38, 5.80), 0.28, 0.090),
        ((-0.08, 0.18, 3.42), (-1.02, 1.46, 6.32), 0.24, 0.070),
        ((0.20, 0.24, 3.48), (1.10, 1.58, 6.40), 0.24, 0.070),
        ((-0.64, -0.02, 4.44), (-2.92, -0.82, 6.18), 0.18, 0.050),
        ((0.66, -0.02, 4.48), (3.00, -0.72, 6.24), 0.18, 0.050),
        ((-0.34, 0.60, 4.58), (-2.10, 1.92, 6.62), 0.17, 0.048),
        ((0.42, 0.64, 4.64), (2.18, 2.02, 6.68), 0.17, 0.048),
        ((-0.12, 0.42, 4.82), (-0.34, 2.62, 6.88), 0.16, 0.044),
        ((0.24, 0.38, 4.88), (0.72, 2.58, 6.84), 0.16, 0.044),
        ((-0.92, 0.18, 4.70), (-3.35, 0.72, 6.10), 0.14, 0.040),
        ((0.96, 0.20, 4.74), (3.42, 0.82, 6.14), 0.14, 0.040),
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
        for twig in (-1, 1):
            twig_start = Vector(b) - branch_vector * 0.08
            twig_end = Vector(b) + Vector((side * 0.34, twig * 0.48, 0.42 + (index % 2) * 0.14))
            tapered_tube_between(
                f"Ficus twig {index:02}-{twig}",
                tuple(twig_start),
                tuple(twig_end),
                max(r2 * 0.38, 0.018),
                max(r2 * 0.12, 0.007),
                TRUNK,
                vertices=10,
            )

    crown_centers = [
        (-3.28, -0.58, 6.25), (-2.45, -0.72, 6.62), (-1.35, -0.62, 7.02),
        (0.0, -0.56, 7.28), (1.35, -0.62, 7.04), (2.48, -0.65, 6.66), (3.32, -0.48, 6.28),
        (-2.70, 0.62, 6.70), (-1.52, 1.02, 7.20), (0.0, 1.18, 7.58),
        (1.55, 1.04, 7.24), (2.72, 0.68, 6.74), (-1.02, 2.18, 7.10), (1.04, 2.20, 7.12),
        (-3.15, 1.48, 6.42), (3.18, 1.52, 6.46), (0.0, 2.78, 6.72),
    ]
    crown_centers = [(tx + x, ty + y, z) for x, y, z in crown_centers]
    create_leaf_cards("Ficus photoreal canopy", crown_centers, count=1280, spread=(0.92, 0.72, 0.58), seed=2608, size_range=(0.42, 0.74))

    understory_centers = [
        (tx + math.cos(angle) * 1.54, ty + math.sin(angle) * 1.42, 1.16 + (index % 3) * 0.08)
        for index, angle in enumerate(i * TAU / 14 for i in range(14))
    ]
    create_leaf_cards("Ficus planter understory", understory_centers, count=132, spread=(0.24, 0.22, 0.19), seed=8226, size_range=(0.15, 0.30))


def create_landscape_details() -> None:
    """Add restrained planted islands and warm lantern rhythm."""
    bed_specs = (
        (-3.30, 1.70, 1.12), (3.42, 1.56, 1.10),
        (-3.15, -2.15, 0.96), (3.22, -2.18, 0.98),
        (-8.10, -0.10, 1.06), (8.18, -0.02, 1.06),
    )
    foliage_centers = []
    for index, (x, y, radius) in enumerate(bed_specs):
        rng = random.Random(8200 + index)
        point_count = 13
        stretch_x = 1.0 + rng.uniform(-0.16, 0.22)
        stretch_y = 1.0 + rng.uniform(-0.20, 0.18)
        rotation = rng.uniform(-0.55, 0.55)
        outer_outline = []
        inner_outline = []
        for point_index in range(point_count):
            angle = TAU * point_index / point_count
            wobble = 1.0 + rng.uniform(-0.18, 0.16)
            local_x = math.cos(angle) * radius * stretch_x * wobble
            local_y = math.sin(angle) * radius * stretch_y * wobble
            rotated_x = local_x * math.cos(rotation) - local_y * math.sin(rotation)
            rotated_y = local_x * math.sin(rotation) + local_y * math.cos(rotation)
            outer_outline.append((x + rotated_x, y + rotated_y))
            inner_outline.append((x + rotated_x * 0.78, y + rotated_y * 0.78))
        organic_slab(f"Landscape bed {index}", outer_outline, 0.50, 0.18, STONE, bevel=0.055)
        organic_slab(f"Landscape soil {index}", inner_outline, 0.605, 0.055, STONE_DARK, bevel=0.018)
        foliage_centers.extend(
            (
                (x - radius * 0.30, y, 0.92),
                (x + radius * 0.24, y + radius * 0.12, 1.00),
                (x, y - radius * 0.24, 0.86),
            )
        )
    create_leaf_cards("Plaza tropical planting", foliage_centers, count=252, spread=(0.42, 0.36, 0.40), seed=3126, size_range=(0.18, 0.44))

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
    cube("Atrium rear glass", (0, 11.65, 5.18), (17.0, 0.055, 4.95), GLASS, bevel=0.02)
    rear_mullions = (-16.4, -13.2, -10.0, -6.8, -3.4, 0, 3.4, 6.8, 10.0, 13.2, 16.4)
    for index, x in enumerate(rear_mullions):
        cube(f"Atrium rear mullion {index}", (x, 11.58, 5.10), (0.050, 0.065, 4.88), GRAPHITE, bevel=0.018)
    cube("Atrium rear beam", (0, 11.56, 10.05), (17.1, 0.09, 0.10), GRAPHITE, bevel=0.025)
    for side in (-1, 1):
        x = side * 17.0
        cube(f"Atrium side glass {side}", (x, 0.55, 5.18), (0.055, 11.0, 4.95), GLASS, bevel=0.02)
        for index, y in enumerate((-9.8, -6.4, -3.0, 0.4, 3.8, 7.2, 10.6)):
            cube(f"Atrium side mullion {side}-{index}", (x - side * 0.07, y, 5.10), (0.065, 0.050, 4.88), GRAPHITE, bevel=0.018)

    # Left signature waterfall wall.
    wx, wy = -7.72, 6.30
    cube("Waterfall limestone core", (wx, wy + 0.24, 2.55), (1.78, 0.34, 2.20), IVORY, bevel=0.20)
    cube("Waterfall glass sheet", (wx, wy - 0.16, 2.52), (1.46, 0.035, 1.78), GLASS, bevel=0.07)
    cube("Waterfall bronze header", (wx, wy - 0.12, 4.38), (1.72, 0.18, 0.13), BRASS, bevel=0.08)
    cube("Waterfall basin", (wx, wy - 0.48, 0.62), (2.06, 0.84, 0.27), STONE, bevel=0.32)
    cube("Waterfall basin water", (wx, wy - 0.68, 0.89), (1.78, 0.58, 0.055), WATER, bevel=0.22)
    for index in range(36):
        x = wx - 1.34 + index * (2.68 / 35)
        z_offset = (index % 5) * 0.025
        cube(
            f"Waterfall stream {index:02}",
            (x, wy - 0.205, 2.58 - z_offset),
            (0.006 + (index % 4) * 0.004, 0.010, 1.58 - z_offset),
            WATER,
            bevel=0.004,
        )
    for side in (-1, 1):
        cube(f"Waterfall ribbed pier {side}", (wx + side * 1.62, wy + 0.06, 2.48), (0.20, 0.26, 2.14), STONE, bevel=0.09)
        for rib in range(6):
            cube(f"Waterfall pier flute {side}-{rib}", (wx + side * 1.62 + (rib - 2.5) * 0.052, wy - 0.215, 2.48), (0.012, 0.012, 1.93), STONE_DARK, bevel=0.005)

    # Right signature focus pavilion: curved silhouette, visible furniture and
    # practical lights. Its glass is intentionally thin to keep the interior
    # readable in both Cycles and WebGL.
    px, py = 6.86, 6.28
    cube("Focus pavilion plinth", (px, py, 0.62), (3.15, 1.58, 0.30), STONE, bevel=0.58)
    for index, (step_y, step_z, step_depth) in enumerate(((4.50, 0.48, 0.34), (4.82, 0.58, 0.31), (5.10, 0.68, 0.28))):
        cube(f"Focus pavilion step {index}", (px, step_y, step_z), (2.15 - index * 0.12, step_depth, 0.09), STONE, bevel=0.11)
    cube("Focus pavilion oak back", (px, py + 1.25, 2.62), (2.78, 0.16, 1.82), OAK_DARK, bevel=0.30)
    cube("Focus pavilion glass left", (px - 2.86, py, 2.65), (0.04, 1.12, 1.84), GLASS, bevel=0.18)
    cube("Focus pavilion glass right", (px + 2.86, py, 2.65), (0.04, 1.12, 1.84), GLASS, bevel=0.18)
    for index in range(-4, 5):
        glass_x = px + index * 0.64
        glass_y = py - 1.30 + (index * index) * 0.020
        cube(
            f"Focus curved front glass {index}",
            (glass_x, glass_y, 2.66),
            (0.31, 0.018, 1.78),
            GLASS,
            rotation=(0, 0, math.radians(index * -2.2)),
            bevel=0.055,
        )
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
    exterior_centers = [
        (-14.5, 12.25, 5.4), (-10.0, 12.45, 6.0), (-5.2, 12.25, 5.6),
        (0.0, 12.50, 6.2), (5.2, 12.30, 5.7), (10.0, 12.45, 6.1), (14.6, 12.25, 5.5),
    ]
    create_leaf_cards("Exterior garden canopy", exterior_centers, count=430, spread=(1.75, 0.42, 2.25), seed=4128, size_range=(0.52, 0.92))


def create_lighting_and_camera() -> None:
    world = bpy.context.scene.world or bpy.data.worlds.new("Garden Atrium World")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.30, 0.38, 0.31, 1)
    background.inputs["Strength"].default_value = 0.56

    bpy.ops.object.light_add(type="SUN", location=(-5.0, -8.0, 15.0))
    sun = bpy.context.object
    sun.name = "Late morning atrium sun"
    sun.data.energy = 3.05
    sun.data.angle = math.radians(2.2)
    sun.data.color = (1.0, 0.78, 0.52)
    sun.rotation_euler = (math.radians(24), math.radians(-18), math.radians(-34))

    bpy.ops.object.light_add(type="AREA", location=(-7.5, -8.0, 14.5))
    key = bpy.context.object
    key.name = "Warm atrium key light"
    key.data.energy = 820
    key.data.shape = "DISK"
    key.data.size = 7.0
    key.data.color = (1.0, 0.83, 0.64)
    key.rotation_euler = (math.radians(25), 0, math.radians(-35))

    bpy.ops.object.light_add(type="AREA", location=(7.5, -2.0, 9.0))
    fill = bpy.context.object
    fill.name = "Cool glass fill"
    fill.data.energy = 460
    fill.data.size = 8.0
    fill.data.color = (0.48, 0.70, 0.66)
    fill.rotation_euler = (math.radians(40), 0, math.radians(145))

    bpy.ops.object.light_add(type="AREA", location=(0, 8.0, 10.0))
    rim = bpy.context.object
    rim.name = "Pavilion rim light"
    rim.data.energy = 420
    rim.data.size = 6.0
    rim.data.color = (1.0, 0.78, 0.48)
    rim.rotation_euler = (math.radians(8), 0, math.radians(180))

    bpy.ops.object.light_add(type="AREA", location=(6.86, 5.72, 3.55))
    pavilion_light = bpy.context.object
    pavilion_light.name = "Focus pavilion practical light"
    pavilion_light.data.energy = 300
    pavilion_light.data.shape = "RECTANGLE"
    pavilion_light.data.size = 4.2
    pavilion_light.data.size_y = 1.8
    pavilion_light.data.color = (1.0, 0.78, 0.52)
    pavilion_light.rotation_euler = (math.radians(18), 0, math.radians(180))

    bpy.ops.object.light_add(type="AREA", location=(-7.72, 5.75, 3.55))
    waterfall_light = bpy.context.object
    waterfall_light.name = "Waterfall cool light"
    waterfall_light.data.energy = 360
    waterfall_light.data.size = 3.0
    waterfall_light.data.color = (0.30, 0.78, 0.82)
    waterfall_light.rotation_euler = (math.radians(28), 0, math.radians(180))

    bpy.ops.object.camera_add(location=(16.25, -25.4, 15.6))
    camera = bpy.context.object
    camera.name = "CrewLab overview camera"
    camera.data.lens = 50
    camera.data.sensor_width = 36
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = 28.0
    camera.data.dof.aperture_fstop = 14.0
    target = Vector((0, 1.20, 2.34))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera


def configure_render() -> None:
    scene = bpy.context.scene
    # Cycles CPU is used for the deterministic headless validation render.
    # Eevee 5.x requires compute-shader features unavailable on some Windows
    # headless/remote GPUs even though the exported GLB works in WebGL.
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    draft = os.environ.get("CREWLAB_RENDER_DRAFT", "0") == "1"
    scene.cycles.samples = 8 if draft else 32
    scene.cycles.use_denoising = True
    scene.cycles.preview_samples = 6 if draft else 16
    scene.render.resolution_x = 1280 if draft else 1600
    scene.render.resolution_y = 720 if draft else 900
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
        ("workstation", (4.6, -8.4, 3.15), (0.0, -0.70, 1.12)),
        ("agent", (2.8, -4.7, 2.35), (0.0, -0.15, 1.15)),
        ("ficus", (-7.8, -3.8, 5.2), (0.0, 2.80, 3.80)),
        ("waterfall", (-13.6, -0.6, 4.1), (-7.72, 6.25, 2.45)),
        ("pavilion", (12.8, -0.8, 4.8), (6.86, 6.20, 2.25)),
        ("hardscape", (0.0, -15.8, 14.2), (0.0, 0.5, 0.4)),
    )
    scene.cycles.samples = 8
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 667
    for name, location, target in views:
        point_camera(camera, location, target)
        scene.render.filepath = str(OUTPUT_DIR / f"garden-office-v4-{name}.png")
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


def export_runtime_glb() -> None:
    """Batch and export the approved scene without persisting runtime joins."""
    prepare_runtime_meshes()
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


def finalize_existing_scene() -> None:
    """Render fixed QA views and export an already-approved authored blend."""
    if not BLEND_PATH.exists():
        raise FileNotFoundError(f"Missing approved Blender scene: {BLEND_PATH}")
    bpy.ops.wm.open_mainfile(filepath=str(BLEND_PATH))
    scene = bpy.context.scene
    scene.cycles.samples = 24
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.filepath = str(PREVIEW_PATH)
    bpy.ops.render.render(write_still=True)
    render_comparison_views()
    export_runtime_glb()
    print(f"CREWLAB_BLEND={BLEND_PATH}")
    print(f"CREWLAB_GLB={GLB_PATH}")
    print(f"CREWLAB_PREVIEW={PREVIEW_PATH}")


def build_scene() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()
    make_materials()
    create_water_and_plaza()

    station_specs = [
        ("A01", 0.0, -0.70, (0.07, 0.14, 0.28, 1), 3, 1.02, 180),
        ("B02", -5.90, 3.55, (0.05, 0.29, 0.17, 1), 2, 0.94, 58),
        ("B03", 5.90, 3.55, (0.06, 0.30, 0.40, 1), 2, 0.94, -58),
        ("D01", -5.90, -3.25, (0.34, 0.16, 0.05, 1), 3, 0.96, 124),
        ("D02", 0.0, -5.95, (0.22, 0.10, 0.32, 1), 3, 0.98, 180),
        ("E01", 5.90, -3.25, (0.08, 0.25, 0.28, 1), 2, 0.96, -124),
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
    if os.environ.get("CREWLAB_SKIP_EXPORT", "0") == "1":
        print(f"CREWLAB_BLEND={BLEND_PATH}")
        print(f"CREWLAB_PREVIEW={PREVIEW_PATH}")
        return
    # Lights and camera are authored for the validation render; React Three
    # Fiber supplies its own responsive camera and performant runtime lighting.
    export_runtime_glb()
    print(f"CREWLAB_BLEND={BLEND_PATH}")
    print(f"CREWLAB_GLB={GLB_PATH}")
    print(f"CREWLAB_PREVIEW={PREVIEW_PATH}")


if __name__ == "__main__":
    if os.environ.get("CREWLAB_FINALIZE_EXISTING", "0") == "1":
        finalize_existing_scene()
    else:
        build_scene()

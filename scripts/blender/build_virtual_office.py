"""Build CrewLab's cinematic garden office and export a browser-ready GLB.

Run with Blender 5.2+:
  blender --background --python scripts/blender/build_virtual_office.py

The script is the source of truth for the authored 3D asset. It deliberately
uses only Blender primitives and node materials so the result is deterministic
and does not depend on external model or texture downloads.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "portal" / "public" / "virtual-office"
BLEND_PATH = OUTPUT_DIR / "garden-office-v2.blend"
GLB_PATH = OUTPUT_DIR / "garden-office-v2.glb"
PREVIEW_PATH = OUTPUT_DIR / "garden-office-v2-preview.png"

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


STONE = None
STONE_DARK = None
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
TRUNK = None
SKIN = None
WHITE = None


def make_materials() -> None:
    global STONE, STONE_DARK, OAK, OAK_DARK, IVORY, BRASS, GRAPHITE, FABRIC
    global GLASS, WATER, SCREEN, LIME, LEAF, LEAF_LIGHT, TRUNK, SKIN, WHITE

    STONE = material("Limestone warm", (0.55, 0.48, 0.37, 1), roughness=0.82)
    STONE_DARK = material("Limestone shadow", (0.23, 0.25, 0.22, 1), roughness=0.88)
    IVORY = material("Ivory fluted stone", (0.78, 0.70, 0.57, 1), roughness=0.72)
    OAK = material("Satin oak", (0.40, 0.20, 0.085, 1), roughness=0.34, coat=0.18)
    OAK_DARK = material("Dark oak", (0.15, 0.065, 0.025, 1), roughness=0.38, coat=0.12)
    BRASS = material("Brushed brass", (0.48, 0.29, 0.09, 1), roughness=0.23, metallic=0.82)
    GRAPHITE = material("Graphite", (0.018, 0.026, 0.025, 1), roughness=0.28, metallic=0.48)
    FABRIC = material("Graphite fabric", (0.025, 0.032, 0.031, 1), roughness=0.88)
    GLASS = material("Architectural teal glass", (0.06, 0.32, 0.30, 0.32), roughness=0.08, transmission=0.64, alpha=0.32, coat=0.5)
    WATER = material("Shallow turquoise water", (0.035, 0.36, 0.32, 0.72), roughness=0.10, transmission=0.28, alpha=0.74, coat=0.72)
    SCREEN = material(
        "Teal display glass",
        (0.018, 0.13, 0.13, 0.72),
        roughness=0.12,
        metallic=0.14,
        emission=(0.05, 0.95, 0.85, 1),
        emission_strength=2.2,
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
    LEAF = material("Deep garden leaf", (0.035, 0.19, 0.065, 1), roughness=0.82)
    LEAF_LIGHT = material("Sunlit garden leaf", (0.11, 0.37, 0.10, 1), roughness=0.78)
    TRUNK = material("Old tree bark", (0.22, 0.105, 0.035, 1), roughness=0.93)
    SKIN = material("Warm skin", (0.63, 0.32, 0.18, 1), roughness=0.62)
    WHITE = material("Warm ceramic", (0.83, 0.79, 0.68, 1), roughness=0.5)


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
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.data.materials.append(mat)
    smooth_and_bevel(obj, 0.05, 3)
    return obj


def create_water_and_plaza() -> None:
    cube("Atrium foundation", (0, 0.2, -0.55), (11.7, 9.2, 0.34), STONE_DARK, bevel=0.5)
    cube("Water basin", (0, 0.15, -0.18), (11.15, 8.65, 0.12), WATER, bevel=0.65)

    # Raised limestone promenades create the same clean negative-space rhythm as
    # the visual contract while leaving enough water visible between islands.
    cube("Central promenade vertical", (0, -0.5, 0.02), (1.45, 7.9, 0.20), STONE, bevel=0.7)
    cube("Central promenade horizontal", (0, 0.5, 0.025), (9.9, 1.18, 0.205), STONE, bevel=0.6)
    torus("Central brass inlay", (0, 0.25, 0.245), 3.08, 0.045, BRASS)
    torus("Outer plaza inlay", (0, 0.15, 0.235), 7.45, 0.035, BRASS, major_segments=96)

    # Delicate water highlights add scale without expensive runtime shaders.
    for index, y in enumerate((-6.8, -5.9, 5.95, 6.8)):
        cube(f"Water glint {index}", (0, y, -0.035), (8.6, 0.018, 0.012), SCREEN, bevel=0.01)


def create_platform(name: str, x: float, y: float, radius: float, *, central: bool = False) -> None:
    cylinder(f"{name} foundation", (x, y, 0.08), radius, 0.48, STONE, vertices=64, bevel=0.07)
    cylinder(f"{name} inner stone", (x, y, 0.34), radius - 0.20, 0.075, IVORY, vertices=64, bevel=0.025)
    torus(f"{name} brass edge", (x, y, 0.39), radius - 0.12, 0.035, BRASS)
    if central:
        torus(f"{name} active lime ring", (x, y, 0.405), radius - 0.42, 0.026, LIME)


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
    tube_between(f"{name} arm", (x, y + 0.05, z - 0.52), (x, y, z - 0.30), 0.035, BRASS)


def create_chair(name: str, x: float, y: float) -> None:
    cylinder(f"{name} chair lift", (x, y, 0.76), 0.055, 0.72, GRAPHITE, vertices=20)
    uv_sphere(f"{name} chair seat", (x, y, 1.05), (0.43, 0.38, 0.12), FABRIC)
    cube(f"{name} chair back", (x, y + 0.26, 1.52), (0.42, 0.08, 0.50), FABRIC, rotation=(math.radians(-7), 0, 0), bevel=0.13)
    for i in range(5):
        angle = TAU * i / 5
        end = (x + math.cos(angle) * 0.44, y + math.sin(angle) * 0.44, 0.48)
        tube_between(f"{name} chair base {i}", (x, y, 0.52), end, 0.028, GRAPHITE, vertices=10)


def create_person(name: str, x: float, y: float, suit: bpy.types.Material, hair: bpy.types.Material) -> None:
    # Seated, slightly forward-leaning, with distinct anatomical masses rather
    # than a capsule mascot. Hands meet the keyboard plane.
    uv_sphere(f"{name} torso", (x, y - 0.02, 1.55), (0.32, 0.22, 0.47), suit)
    cylinder(f"{name} neck", (x, y - 0.03, 1.96), 0.09, 0.18, SKIN, vertices=20)
    uv_sphere(f"{name} head", (x, y - 0.07, 2.18), (0.22, 0.205, 0.27), SKIN)
    uv_sphere(f"{name} hair", (x, y - 0.045, 2.30), (0.232, 0.214, 0.16), hair)
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
        # Seated thighs/knees under the worktop.
        tube_between(f"{name} thigh {side}", (x + side * 0.15, y, 1.10), (x + side * 0.18, y - 0.28, 0.86), 0.11, GRAPHITE)


def create_station(code: str, x: float, y: float, suit_color: tuple[float, float, float, float], monitors: int = 3, scale: float = 1.0) -> None:
    collection = bpy.data.collections.new(f"Station {code}")
    bpy.context.scene.collection.children.link(collection)
    prior_collection = bpy.context.collection

    create_platform(code, x, y, 2.08 * scale, central=code == "A01")

    # Oak crescent desk: thick top, dark shadow-line and a rhythm of ivory ribs.
    top_z = 1.42
    annular_sector(f"{code} oak crescent", (x, y - 0.08, top_z), 0.74 * scale, 1.52 * scale, 0.18, math.radians(205), math.radians(335), OAK, 38)
    annular_sector(f"{code} dark oak reveal", (x, y - 0.08, top_z - 0.13), 0.81 * scale, 1.47 * scale, 0.08, math.radians(207), math.radians(333), OAK_DARK, 38)

    for i in range(17):
        angle = math.radians(212 + i * (116 / 16))
        radius = 1.28 * scale
        px = x + math.cos(angle) * radius
        py = y - 0.08 + math.sin(angle) * radius
        cylinder(f"{code} fluted cabinet {i:02}", (px, py, 0.91), 0.075, 0.88, IVORY, vertices=12, bevel=0.018)

    # Brass kick plate and lime task light.
    annular_sector(f"{code} brass kick", (x, y - 0.08, 0.49), 1.16 * scale, 1.34 * scale, 0.055, math.radians(210), math.radians(330), BRASS, 32)
    annular_sector(f"{code} lime task edge", (x, y - 0.08, 1.525), 1.46 * scale, 1.51 * scale, 0.025, math.radians(216), math.radians(324), LIME, 32)

    # Monitors sit on the far/inner desk edge and fan toward the operator.
    offsets = [0.0] if monitors == 1 else ([-0.68, 0.0, 0.68] if monitors == 3 else [-0.46, 0.46])
    for index, offset in enumerate(offsets):
        angle = -offset * 0.34
        create_monitor(f"{code} monitor {index + 1}", x + offset * scale, y + 0.42, 2.05, angle, width=0.86 * scale)

    # Desk objects: keyboard, cup, folio and small equipment block.
    cube(f"{code} keyboard", (x, y - 0.62, 1.56), (0.33, 0.13, 0.025), GRAPHITE, bevel=0.03)
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


def create_tree() -> None:
    # The single hero tree is kept behind A01 so it anchors the composition
    # without blocking the central workstation.
    tx, ty = 0.0, 1.6
    cylinder("Tree planter", (tx, ty, 0.65), 2.0, 0.62, STONE, vertices=64, bevel=0.09)
    torus("Tree planter brass rim", (tx, ty, 0.98), 1.76, 0.055, BRASS)
    cylinder("Tree soil", (tx, ty, 1.00), 1.67, 0.08, STONE_DARK, vertices=64, bevel=0.03)

    # Tapered trunk segments and visible branching silhouette.
    tube_between("Tree trunk main", (tx, ty, 1.0), (tx + 0.12, ty, 4.55), 0.48, TRUNK, vertices=28)
    branches = [
        ((0.05, 1.6, 2.7), (-1.55, 1.28, 4.45), 0.26),
        ((0.08, 1.6, 2.95), (1.62, 1.40, 4.55), 0.27),
        ((0.08, 1.6, 3.30), (-0.72, 2.25, 5.12), 0.22),
        ((0.10, 1.6, 3.50), (0.72, 2.25, 5.35), 0.22),
        ((-1.05, 1.38, 3.95), (-2.20, 0.96, 5.10), 0.14),
        ((1.05, 1.44, 4.05), (2.25, 1.05, 5.15), 0.14),
        ((-0.45, 2.0, 4.55), (-1.15, 2.72, 5.65), 0.13),
        ((0.45, 2.0, 4.65), (1.22, 2.75, 5.75), 0.13),
    ]
    for index, (start, end, radius) in enumerate(branches):
        tube_between(f"Tree branch {index:02}", start, end, radius, TRUNK, vertices=18)

    leaf_centers = [
        (-2.15, 0.95, 5.12), (-1.55, 1.20, 5.45), (-0.85, 1.18, 5.72),
        (0.0, 1.25, 5.82), (0.85, 1.20, 5.72), (1.58, 1.18, 5.50), (2.18, 1.03, 5.15),
        (-1.52, 2.10, 5.48), (-0.78, 2.38, 5.92), (0.0, 2.43, 6.08),
        (0.80, 2.38, 5.92), (1.52, 2.12, 5.48), (-0.55, 3.0, 5.63), (0.55, 3.0, 5.63),
    ]
    for index, (x, y, z) in enumerate(leaf_centers):
        radius = 0.72 + (index % 3) * 0.08
        uv_sphere(
            f"Tree foliage {index:02}",
            (x, y, z),
            (radius * 1.18, radius * 0.82, radius),
            LEAF_LIGHT if index % 3 == 0 else LEAF,
            segments=20,
            rings=10,
        )

    # A layer of smaller, leaf-shaped highlights breaks up the sphere silhouette
    # and produces a mature, sun-dappled crown at the overview camera distance.
    rng = random.Random(2608)
    for index in range(112):
        cx, cy, cz = leaf_centers[index % len(leaf_centers)]
        angle = rng.uniform(0, TAU)
        radial = rng.uniform(0.35, 0.92)
        z_offset = rng.uniform(-0.46, 0.55)
        leaf = uv_sphere(
            f"Tree detail leaf {index:03}",
            (cx + math.cos(angle) * radial, cy + math.sin(angle) * radial * 0.68, cz + z_offset),
            (rng.uniform(0.18, 0.30), rng.uniform(0.07, 0.13), rng.uniform(0.20, 0.34)),
            LEAF_LIGHT if index % 4 == 0 else LEAF,
            segments=12,
            rings=6,
        )
        leaf.rotation_euler = (rng.uniform(-0.7, 0.7), rng.uniform(-0.7, 0.7), angle)

    # A restrained understory, intentionally not a forest.
    for index, angle in enumerate((0.15, 1.7, 3.15, 4.6)):
        x = tx + math.cos(angle) * 1.35
        y = ty + math.sin(angle) * 1.35
        uv_sphere(f"Tree understory {index}", (x, y, 1.33), (0.36, 0.30, 0.42), LEAF_LIGHT, segments=16, rings=8)


def create_pavilions() -> None:
    # Two rear architectural volumes frame, rather than fill, the view.
    for side, x in (("Left", -6.7), ("Right", 6.7)):
        cube(f"{side} pavilion back", (x, 7.12, 2.25), (3.7, 0.16, 2.25), GLASS, bevel=0.18)
        cube(f"{side} pavilion roof", (x, 6.58, 4.58), (3.78, 1.42, 0.14), BRASS, bevel=0.15)
        cube(f"{side} pavilion plinth", (x, 6.45, 0.22), (3.8, 1.55, 0.26), STONE, bevel=0.35)
        for column in (-2.85, 0, 2.85):
            cube(f"{side} pavilion mullion {column}", (x + column, 7.0, 2.32), (0.055, 0.11, 2.15), BRASS, bevel=0.025)

        # Warm built-in lounge volume behind the glass.
        cube(f"{side} lounge banquette", (x, 6.42, 0.94), (2.30, 0.47, 0.34), OAK, bevel=0.20)
        cube(f"{side} lounge cushion", (x, 6.13, 1.25), (2.10, 0.38, 0.18), IVORY, bevel=0.16)
        for lamp_index, lamp_x in enumerate((-1.75, 1.75)):
            tube_between(
                f"{side} pendant cable {lamp_index}",
                (x + lamp_x, 6.15, 4.35),
                (x + lamp_x, 6.15, 3.28),
                0.018,
                GRAPHITE,
                vertices=8,
            )
            uv_sphere(
                f"{side} pendant glow {lamp_index}",
                (x + lamp_x, 6.15, 3.18),
                (0.13, 0.13, 0.17),
                LIME if lamp_index == 0 else WHITE,
                segments=16,
                rings=8,
            )

    # Left brand wall and right focus-zone shelving give the rear depth and
    # recognizable destinations from the reference composition.
    cube("CrewLab brand slab", (-7.55, 6.25, 2.18), (1.55, 0.20, 1.68), STONE_DARK, rotation=(0, 0, math.radians(-7)), bevel=0.22)
    torus("CrewLab brand mark", (-7.55, 6.00, 2.66), 0.48, 0.065, LIME, rotation=(math.radians(90), 0, 0), major_segments=6)
    cube("CrewLab brand wordmark", (-7.55, 5.97, 1.70), (0.95, 0.025, 0.065), SCREEN, bevel=0.03)

    cube("Focus Zone wall", (7.25, 6.20, 2.32), (2.12, 0.20, 1.76), OAK_DARK, rotation=(0, 0, math.radians(7)), bevel=0.24)
    for row in range(3):
        cube(f"Focus shelf {row}", (7.25, 5.94, 1.30 + row * 0.65), (1.64, 0.24, 0.045), BRASS, rotation=(0, 0, math.radians(7)), bevel=0.025)
        for col in range(5):
            cube(
                f"Focus object {row}-{col}",
                (6.15 + col * 0.55, 5.70, 1.49 + row * 0.65),
                (0.10, 0.12, 0.18 + (col % 2) * 0.08),
                LEAF_LIGHT if col in (1, 4) else IVORY,
                bevel=0.04,
            )

    # Only two small secondary planters, per the reduced-vegetation brief.
    for side, x in (("Left", -9.1), ("Right", 9.1)):
        cylinder(f"{side} small planter", (x, 2.6, 0.56), 0.72, 0.70, IVORY, vertices=32, bevel=0.07)
        for i in range(5):
            angle = TAU * i / 5
            end = (x + math.cos(angle) * 0.42, 2.6 + math.sin(angle) * 0.42, 1.42 + (i % 2) * 0.15)
            tube_between(f"{side} plant stem {i}", (x, 2.6, 0.88), end, 0.028, LEAF, vertices=10)
            uv_sphere(f"{side} plant leaf {i}", end, (0.24, 0.12, 0.35), LEAF_LIGHT, segments=12, rings=6)


def create_lighting_and_camera() -> None:
    world = bpy.context.scene.world or bpy.data.worlds.new("Garden Atrium World")
    bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.055, 0.105, 0.095, 1)
    background.inputs["Strength"].default_value = 0.62

    bpy.ops.object.light_add(type="AREA", location=(-7.5, -8.0, 14.5))
    key = bpy.context.object
    key.name = "Warm atrium key light"
    key.data.energy = 3400
    key.data.shape = "DISK"
    key.data.size = 7.0
    key.data.color = (1.0, 0.72, 0.44)
    key.rotation_euler = (math.radians(25), 0, math.radians(-35))

    bpy.ops.object.light_add(type="AREA", location=(7.5, -2.0, 9.0))
    fill = bpy.context.object
    fill.name = "Cool glass fill"
    fill.data.energy = 1750
    fill.data.size = 8.0
    fill.data.color = (0.30, 0.67, 0.62)
    fill.rotation_euler = (math.radians(40), 0, math.radians(145))

    bpy.ops.object.light_add(type="AREA", location=(0, 8.0, 10.0))
    rim = bpy.context.object
    rim.name = "Pavilion rim light"
    rim.data.energy = 950
    rim.data.size = 6.0
    rim.data.color = (1.0, 0.78, 0.48)
    rim.rotation_euler = (math.radians(8), 0, math.radians(180))

    bpy.ops.object.camera_add(location=(17.6, -21.7, 17.2))
    camera = bpy.context.object
    camera.name = "CrewLab overview camera"
    camera.data.lens = 48
    camera.data.sensor_width = 36
    camera.data.dof.use_dof = True
    camera.data.dof.focus_distance = 26.0
    camera.data.dof.aperture_fstop = 9.0
    target = Vector((0, 0.45, 1.25))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera


def configure_render() -> None:
    scene = bpy.context.scene
    # Cycles CPU is used for the deterministic headless validation render.
    # Eevee 5.x requires compute-shader features unavailable on some Windows
    # headless/remote GPUs even though the exported GLB works in WebGL.
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 28
    scene.cycles.use_denoising = True
    scene.cycles.preview_samples = 12
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


def build_scene() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()
    make_materials()
    create_water_and_plaza()

    station_specs = [
        ("A01", 0.0, -0.85, (0.07, 0.14, 0.28, 1), 3, 1.05),
        ("B02", -5.45, 3.65, (0.05, 0.29, 0.17, 1), 2, 0.91),
        ("B03", 5.45, 3.65, (0.06, 0.30, 0.40, 1), 2, 0.91),
        ("D01", -5.65, -2.75, (0.56, 0.21, 0.035, 1), 3, 0.94),
        ("D02", 0.0, -5.15, (0.30, 0.10, 0.44, 1), 3, 0.96),
        ("E01", 5.65, -2.75, (0.28, 0.10, 0.40, 1), 2, 0.94),
    ]
    for spec in station_specs:
        create_station(*spec)

    create_tree()
    create_pavilions()
    create_lighting_and_camera()
    configure_render()

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.render.render(write_still=True)

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

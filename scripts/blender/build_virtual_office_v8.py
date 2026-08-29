"""Build CrewLab's layered biophilic operations campus v8.

V8 is a scene-foundation rebuild, not a runtime prop patch. It preserves the
verified six-station coordinates and the separate v10 character seam while
re-authoring the circulation hierarchy, planted beds, rear architecture,
workstation identities, material balance and neutral daylight.
"""

from __future__ import annotations

import importlib.util
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
V7_SCRIPT = Path(__file__).with_name("build_virtual_office_v7.py")
OUTPUT_DIR = ROOT / "portal" / "public" / "virtual-office"


def load_v7_module():
    spec = importlib.util.spec_from_file_location("crewlab_virtual_office_v7", V7_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load v7 scene generator: {V7_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


v7 = load_v7_module()
base = v7.base
v5 = v7.v5

base.BLEND_PATH = OUTPUT_DIR / "garden-office-v8.blend"
base.GLB_PATH = OUTPUT_DIR / "garden-office-v8.glb"
base.PREVIEW_PATH = OUTPUT_DIR / "garden-office-v8-preview.png"

original_make_materials = base.make_materials
original_water_and_plaza = base.create_water_and_plaza
original_station = base.create_station
original_tree = base.create_tree
original_landscape = v7.original_landscape_details
original_pavilions = v7.original_pavilions
original_lighting_and_camera = base.create_lighting_and_camera

STONE_LIGHT = None
STONE_SHADOW = None
SAGE = None
SAGE_LIGHT = None
SCREEN_BLUE = None
SCREEN_AMBER = None


def make_materials_v8() -> None:
    global STONE_LIGHT, STONE_SHADOW, SAGE, SAGE_LIGHT, SCREEN_BLUE, SCREEN_AMBER
    original_make_materials()

    # Neutral, airy daylight grade. The v7 value compression created the
    # yellow/dark browser read called out in the current-state screenshot.
    v5.grade_textured_material(base.STONE, value=0.84, saturation=0.58)
    v5.grade_textured_material(base.OAK, value=0.82, saturation=0.86)
    v5.grade_textured_material(base.TRUNK, value=0.70, saturation=1.12)

    base.IVORY.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.78, 0.74, 0.66, 1)
    base.IVORY.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.64
    base.WATER.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.025, 0.28, 0.27, 1)
    base.WATER.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.075
    base.LEAF.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.035, 0.22, 0.07, 1)
    base.LEAF_LIGHT.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.16, 0.43, 0.12, 1)
    base.BRASS.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.20, 0.12, 0.055, 1)
    base.BRASS.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.48
    base.BRASS.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.58

    # The source bark maps are intentionally neutral. Add a restrained warm
    # multiply so the hero trunk reads as living wood instead of gray concrete.
    trunk_nodes = base.TRUNK.node_tree.nodes
    trunk_links = base.TRUNK.node_tree.links
    trunk_bsdf = trunk_nodes.get("Principled BSDF")
    if trunk_bsdf and trunk_bsdf.inputs["Base Color"].links:
        source_socket = trunk_bsdf.inputs["Base Color"].links[0].from_socket
        for link in list(trunk_bsdf.inputs["Base Color"].links):
            trunk_links.remove(link)
        tint = trunk_nodes.new("ShaderNodeMixRGB")
        tint.name = "V8 warm ficus tint"
        tint.blend_type = "MULTIPLY"
        tint.inputs["Fac"].default_value = 0.46
        tint.inputs[2].default_value = (0.54, 0.28, 0.12, 1)
        trunk_links.new(source_socket, tint.inputs[1])
        trunk_links.new(tint.outputs["Color"], trunk_bsdf.inputs["Base Color"])

    STONE_LIGHT = base.material("V8 honed limestone", (0.78, 0.75, 0.68, 1), roughness=0.72)
    STONE_SHADOW = base.material("V8 limestone shadow joint", (0.24, 0.23, 0.20, 1), roughness=0.88)
    SAGE = base.material("V8 muted sage", (0.12, 0.29, 0.19, 1), roughness=0.78)
    SAGE_LIGHT = base.material("V8 sunlit sage", (0.28, 0.48, 0.24, 1), roughness=0.74)
    SCREEN_BLUE = base.material(
        "V8 planning display",
        (0.025, 0.18, 0.20, 1),
        roughness=0.18,
        emission=(0.08, 0.64, 0.68, 1),
        emission_strength=1.2,
    )
    SCREEN_AMBER = base.material(
        "V8 review display",
        (0.20, 0.13, 0.04, 1),
        roughness=0.20,
        emission=(0.92, 0.50, 0.12, 1),
        emission_strength=0.72,
    )


def create_water_and_plaza_v8() -> None:
    original_water_and_plaza()

    # A raised inner promenade and two curved water ribbons break the single
    # flat slab into legible architectural layers without changing station Y.
    for name, inner, outer, start, end in (
        ("V8 north promenade", 3.35, 5.25, math.radians(18), math.radians(162)),
        ("V8 south promenade", 3.35, 5.25, math.radians(198), math.radians(342)),
    ):
        base.annular_sector(name, (0, 0.35, 0.445), inner, outer, 0.075, start, end, STONE_LIGHT, 72)

    for name, start, end in (
        ("V8 rear water ribbon", math.radians(26), math.radians(154)),
        ("V8 foreground water ribbon", math.radians(206), math.radians(334)),
    ):
        base.annular_sector(name, (0, 0.55, 0.472), 10.15, 12.35, 0.055, start, end, base.WATER, 88)
        base.annular_sector(f"{name} coping", (0, 0.55, 0.505), 10.02, 10.17, 0.055, start, end, STONE_LIGHT, 88)

def transform_local(x: float, y: float, rotation_degrees: float, dx: float, dy: float) -> tuple[float, float]:
    angle = math.radians(rotation_degrees)
    return (
        x + dx * math.cos(angle) - dy * math.sin(angle),
        y + dx * math.sin(angle) + dy * math.cos(angle),
    )


def add_role_prop(code: str, x: float, y: float, rotation_degrees: float) -> None:
    def point(dx: float, dy: float, z: float) -> tuple[float, float, float]:
        px, py = transform_local(x, y, rotation_degrees, dx, dy)
        return px, py, z

    angle = math.radians(rotation_degrees)
    if code == "A01":
        base.ellipse_disc("A01 workflow lens", point(0.0, -0.03, 1.235), 0.24, 0.18, 0.026, SCREEN_BLUE, bevel=0.035)
        base.torus("A01 workflow orbit", point(0.0, -0.03, 1.276), 0.18, 0.012, base.BRASS, rotation=(0, 0, angle), major_segments=36)
        for index in range(5):
            px, py, pz = point(-0.16 + index * 0.08, -0.03, 1.294)
            base.cube(f"A01 workflow node {index}", (px, py, pz), (0.020, 0.020, 0.012), base.LIME if index == 2 else SCREEN_BLUE, bevel=0.010)
    elif code == "B02":
        for index, height in enumerate((0.15, 0.22, 0.18, 0.26)):
            base.cube(f"B02 research card {index}", point(-0.52 + index * 0.17, -0.02, 1.27 + height / 2), (0.065, 0.018, height / 2), SCREEN_BLUE if index % 2 else base.IVORY, rotation=(0, 0, angle), bevel=0.018)
    elif code == "B03":
        for row in range(2):
            for column in range(4):
                base.cube(
                    f"B03 calendar tile {row}-{column}",
                    point(-0.32 + column * 0.19, -0.02 + row * 0.15, 1.255),
                    (0.075, 0.052, 0.018),
                    SCREEN_BLUE if (row + column) % 3 else base.LIME,
                    rotation=(0, 0, angle),
                    bevel=0.014,
                )
    elif code == "D01":
        for index in range(3):
            base.cube(f"D01 manuscript {index}", point(-0.30 + index * 0.28, -0.02, 1.25 + index * 0.012), (0.12, 0.18, 0.010), base.IVORY, rotation=(0, 0, angle + math.radians(-5 + index * 5)), bevel=0.012)
            for line in range(4):
                base.cube(f"D01 text stroke {index}-{line}", point(-0.30 + index * 0.28, -0.10 + line * 0.05, 1.267 + index * 0.012), (0.075 - line * 0.006, 0.006, 0.004), base.STONE_DARK, rotation=(0, 0, angle), bevel=0.002)
    elif code == "D02":
        base.cube("D02 pen display", point(0.0, -0.04, 1.31), (0.42, 0.27, 0.035), SCREEN_BLUE, rotation=(math.radians(12), 0, angle), bevel=0.045)
        for index, material in enumerate((base.LIME, SCREEN_BLUE, SCREEN_AMBER, SAGE_LIGHT, base.IVORY)):
            px, py, pz = point(-0.28 + index * 0.14, -0.34, 1.255)
            base.cylinder(f"D02 color well {index}", (px, py, pz), 0.045, 0.015, material, vertices=20, bevel=0.008)
        start = point(0.18, -0.16, 1.39)
        end = point(0.34, -0.28, 1.30)
        base.tube_between("D02 stylus", start, end, 0.012, base.GRAPHITE, vertices=10)
    elif code == "E01":
        for side in (-1, 1):
            base.cube(f"E01 comparison plate {side}", point(side * 0.25, -0.02, 1.27), (0.19, 0.23, 0.022), SCREEN_BLUE if side < 0 else SCREEN_AMBER, rotation=(0, 0, angle), bevel=0.026)
        for index in range(3):
            base.torus(f"E01 quality check {index}", point(-0.13 + index * 0.13, -0.24, 1.31), 0.034, 0.008, base.LIME if index < 2 else base.BRASS, rotation=(0, 0, angle), major_segments=20)


def create_station_v8(
    code: str,
    x: float,
    y: float,
    suit_color: tuple[float, float, float, float],
    monitors: int = 3,
    scale: float = 1.0,
    rotation_degrees: float = 0.0,
) -> None:
    original_station(code, x, y, suit_color, monitors, scale, rotation_degrees)
    add_role_prop(code, x, y, rotation_degrees)


def create_tree_v8() -> None:
    original_tree()
    tx, ty = 0.0, 2.80

    # Natural stones and low planting bind the hero trunk to the architecture.
    for index in range(18):
        angle = math.tau * index / 18 + (index % 3) * 0.07
        radius = 1.58 + (index % 4) * 0.10
        base.uv_sphere(
            f"V8 ficus planter stone {index}",
            (tx + math.cos(angle) * radius, ty + math.sin(angle) * radius, 1.00 + (index % 2) * 0.025),
            (0.20 + (index % 3) * 0.035, 0.16 + (index % 2) * 0.04, 0.12 + (index % 4) * 0.018),
            STONE_LIGHT if index % 3 else STONE_SHADOW,
            segments=18,
            rings=9,
        )

    # Extra secondary twigs and offset leaf masses improve the crown silhouette
    # while keeping the trunk visible and the A01 sight line open.
    twig_specs = (
        ((-0.9, 0.3, 4.7), (-2.8, 1.2, 6.4)),
        ((0.8, 0.2, 4.8), (2.9, 1.0, 6.5)),
        ((-0.5, -0.2, 4.6), (-2.4, -1.5, 6.2)),
        ((0.5, -0.2, 4.7), (2.5, -1.4, 6.25)),
    )
    for index, (start, end) in enumerate(twig_specs):
        base.tapered_tube_between(
            f"V8 ficus secondary branch {index}",
            (tx + start[0], ty + start[1], start[2]),
            (tx + end[0], ty + end[1], end[2]),
            0.10,
            0.035,
            base.TRUNK,
            vertices=14,
        )
    crown = [
        (-3.0, -0.8, 6.65), (-2.1, 0.9, 7.02), (-0.8, -1.25, 7.05),
        (0.8, -1.20, 7.08), (2.1, 0.9, 7.02), (3.0, -0.7, 6.68),
        (-1.1, 1.65, 7.10), (1.15, 1.62, 7.12),
    ]
    base.create_leaf_cards("V8 ficus crown detail", [(tx + x, ty + y, z) for x, y, z in crown], count=440, spread=(0.72, 0.58, 0.42), seed=82926, size_range=(0.30, 0.56))


def create_landscape_details_v8() -> None:
    # Four broad, smooth integrated beds replace v7's field of repeated pots
    # and v4's faceted islands. They frame circulation without hiding workers.
    bed_specs = (
        (-3.25, 1.00, 1.42, 0.68, 0.18),
        (3.25, 1.00, 1.42, 0.68, -0.18),
        (-3.35, -3.55, 1.34, 0.62, -0.12),
        (3.35, -3.55, 1.34, 0.62, 0.12),
    )
    plant_centers = []
    for index, (cx, cy, rx, ry, rotation) in enumerate(bed_specs):
        outline = []
        inner = []
        for point_index in range(28):
            angle = math.tau * point_index / 28
            wobble = 1.0 + math.sin(point_index * 2.3 + index) * 0.045
            lx = math.cos(angle) * rx * wobble
            ly = math.sin(angle) * ry * wobble
            x = cx + lx * math.cos(rotation) - ly * math.sin(rotation)
            y = cy + lx * math.sin(rotation) + ly * math.cos(rotation)
            outline.append((x, y))
            inner.append((cx + (x - cx) * 0.82, cy + (y - cy) * 0.72))
        base.organic_slab(f"V8 integrated landscape bed {index}", outline, 0.57, 0.27, STONE_LIGHT, bevel=0.16)
        base.organic_slab(f"V8 integrated landscape soil {index}", inner, 0.725, 0.055, base.STONE_DARK, bevel=0.08)
        plant_centers.extend(((cx - rx * 0.35, cy, 0.91), (cx, cy + ry * 0.08, 1.00), (cx + rx * 0.34, cy - ry * 0.08, 0.90)))
        for rock in range(4):
            rock_angle = math.tau * rock / 4 + rotation
            base.uv_sphere(
                f"V8 bed stone {index}-{rock}",
                (cx + math.cos(rock_angle) * rx * 0.60, cy + math.sin(rock_angle) * ry * 0.58, 0.79),
                (0.17 + rock * 0.018, 0.13 + (rock % 2) * 0.025, 0.09 + (rock % 3) * 0.012),
                STONE_SHADOW if rock == 0 else STONE_LIGHT,
                segments=16,
                rings=8,
            )
    base.create_leaf_cards("V8 integrated layered foliage", plant_centers, count=144, spread=(0.48, 0.32, 0.38), seed=110829, size_range=(0.18, 0.42))


def create_pavilions_v8() -> None:
    original_pavilions()

    # Broad roof faces should read as timber architecture; bronze is reserved
    # for the slim edge/support system.
    focus_roof = bpy.data.objects.get("Focus pavilion bronze roof")
    if focus_roof is not None:
        focus_roof.data.materials.clear()
        focus_roof.data.materials.append(base.OAK)

    # Convert the left water feature into an occupied strategy pavilion with a
    # real roof, side glazing, shelving and a quiet research bench.
    px, py = -7.72, 6.32
    base.cube("V8 strategy pavilion plinth", (px, py + 0.10, 0.55), (3.12, 1.72, 0.25), STONE_LIGHT, bevel=0.56)
    base.cube("V8 strategy pavilion roof", (px, py + 0.12, 4.78), (3.16, 1.62, 0.15), base.OAK, bevel=0.48)
    base.cube("V8 strategy roof bronze edge", (px, py - 1.48, 4.72), (3.00, 0.055, 0.10), base.BRASS, bevel=0.045)
    base.cube("V8 strategy pavilion timber soffit", (px, py + 0.12, 4.59), (2.92, 1.42, 0.07), base.OAK, bevel=0.34)
    for side in (-1, 1):
        base.cube(f"V8 strategy glass side {side}", (px + side * 2.88, py + 0.08, 2.68), (0.035, 1.30, 1.82), base.GLASS, bevel=0.15)
        base.cube(f"V8 strategy corner post {side}", (px + side * 2.84, py - 1.12, 2.60), (0.055, 0.055, 1.78), base.BRASS, bevel=0.022)
    for index in range(-4, 5):
        glass_x = px + index * 0.64
        glass_y = py - 1.38 + index * index * 0.020
        base.cube(f"V8 strategy curved glass {index}", (glass_x, glass_y, 2.70), (0.31, 0.018, 1.76), base.GLASS, rotation=(0, 0, math.radians(index * -2.2)), bevel=0.05)

    for side in (-1, 1):
        bx = px + side * 2.12
        base.cube(f"V8 strategy shelf tower {side}", (bx, py + 0.92, 2.45), (0.48, 0.28, 1.42), base.OAK_DARK, bevel=0.10)
        for shelf in range(4):
            base.cube(f"V8 strategy shelf {side}-{shelf}", (bx, py + 0.61, 1.30 + shelf * 0.66), (0.42, 0.28, 0.035), base.BRASS, bevel=0.015)
            for card in range(3):
                base.cube(
                    f"V8 strategy source card {side}-{shelf}-{card}",
                    (bx + (card - 1) * 0.18, py + 0.55, 1.48 + shelf * 0.66),
                    (0.06, 0.09, 0.14 + (card % 2) * 0.04),
                    SCREEN_BLUE if card == 1 else base.IVORY,
                    bevel=0.016,
                )
    base.cube("V8 strategy bench base", (px, py + 0.46, 1.03), (1.30, 0.46, 0.23), base.OAK, bevel=0.22)
    base.cube("V8 strategy bench seat", (px, py + 0.14, 1.30), (1.24, 0.42, 0.15), base.FABRIC, bevel=0.17)

    # Add vertical planting and warmer depth to the existing Focus Zone.
    fx, fy = 6.86, 6.28
    base.cube("V8 focus roof bronze edge", (fx, fy - 1.42, 4.55), (2.94, 0.055, 0.10), base.BRASS, bevel=0.045)
    for column in range(5):
        x = fx - 1.55 + column * 0.78
        base.cube(f"V8 focus timber fin {column}", (x, fy + 1.40, 2.72), (0.045, 0.09, 1.60), base.OAK, bevel=0.018)
    focus_green = [(fx + 2.15, fy + 1.15, 1.68), (fx + 2.08, fy + 1.18, 2.55), (fx + 2.12, fy + 1.16, 3.36)]
    base.create_leaf_cards("V8 focus living wall", focus_green, count=72, spread=(0.30, 0.18, 0.44), seed=8862, size_range=(0.20, 0.38))


def create_lighting_and_camera_v8() -> None:
    original_lighting_and_camera()
    scene = bpy.context.scene
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.34, 0.43, 0.39, 1)
    background.inputs["Strength"].default_value = 0.46

    sun = bpy.data.objects.get("Late morning atrium sun")
    sun.data.energy = 2.45
    sun.data.angle = math.radians(2.4)
    sun.data.color = (1.0, 0.95, 0.86)

    key = bpy.data.objects.get("Warm atrium key light")
    key.data.energy = 430
    key.data.color = (1.0, 0.91, 0.80)
    fill = bpy.data.objects.get("Cool glass fill")
    fill.data.energy = 285
    fill.data.color = (0.66, 0.82, 0.84)
    rim = bpy.data.objects.get("Pavilion rim light")
    rim.data.energy = 190
    rim.data.color = (1.0, 0.88, 0.72)

    camera = scene.camera
    camera.location = (16.2, -27.0, 17.0)
    camera.data.lens = 51
    camera.data.dof.aperture_fstop = 18.0
    camera.rotation_euler = (Vector((0.0, 1.05, 2.30)) - camera.location).to_track_quat("-Z", "Y").to_euler()


base.make_materials = make_materials_v8
base.create_water_and_plaza = create_water_and_plaza_v8
base.create_station = create_station_v8
base.create_tree = create_tree_v8
base.create_landscape_details = create_landscape_details_v8
base.create_pavilions = create_pavilions_v8
base.create_lighting_and_camera = create_lighting_and_camera_v8


if __name__ == "__main__":
    os.environ.setdefault("CREWLAB_RENDER_DETAILS", "0")
    base.build_scene()

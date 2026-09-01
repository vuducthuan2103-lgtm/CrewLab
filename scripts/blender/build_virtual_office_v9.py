"""Build CrewLab's premium urban rooftop office environment v9.

This file is intentionally advanced in reviewable phases. Phase 1 removed the
inherited rainforest layers. Phase 2 establishes a layered urban rooftop using
light stone, warm timber, architectural concrete and slim graphite details.
The approved v8 interior layout, station roots, pavilions and agent anchors stay
untouched.
"""

from __future__ import annotations

import importlib.util
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
V8_SCRIPT = Path(__file__).with_name("build_virtual_office_v8.py")
OUTPUT_DIR = ROOT / "portal" / "public" / "virtual-office"


def load_v8_module():
    spec = importlib.util.spec_from_file_location("crewlab_virtual_office_v8", V8_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load v8 scene generator: {V8_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


v8 = load_v8_module()
base = v8.base

base.BLEND_PATH = OUTPUT_DIR / "garden-office-v9.blend"
base.GLB_PATH = OUTPUT_DIR / "garden-office-v9.glb"
base.PREVIEW_PATH = OUTPUT_DIR / "garden-office-v9-preview.png"

original_make_materials = base.make_materials
original_pavilions = base.create_pavilions
original_lighting_and_camera = base.create_lighting_and_camera

SKYLINE_HAZE = None
ROOFTOP_STONE = None
ROOFTOP_STONE_LIGHT = None
ROOFTOP_CONCRETE = None
ROOFTOP_SHADOW = None
ROOFTOP_TIMBER = None
ROOFTOP_TIMBER_DARK = None
ROOFTOP_GRAPHITE = None
ROOFTOP_UPHOLSTERY = None
CENTRAL_TREE_FOLIAGE = None


def make_materials_v9() -> None:
    global SKYLINE_HAZE
    global ROOFTOP_STONE, ROOFTOP_STONE_LIGHT, ROOFTOP_CONCRETE, ROOFTOP_SHADOW
    global ROOFTOP_TIMBER, ROOFTOP_TIMBER_DARK, ROOFTOP_GRAPHITE, ROOFTOP_UPHOLSTERY
    global CENTRAL_TREE_FOLIAGE
    original_make_materials()
    SKYLINE_HAZE = base.material(
        "V9 temporary skyline haze",
        (0.54, 0.68, 0.76, 1),
        roughness=1.0,
    )
    # Reuse supporting v8 materials wherever their physical role is the same.
    # This keeps Phase 2 to three new hardscape material batches instead of
    # eight, a material distinction that is invisible at the fixed camera.
    ROOFTOP_STONE = v8.STONE_LIGHT
    ROOFTOP_STONE_LIGHT = base.material(
        "V9 sunlit limestone",
        (0.86, 0.84, 0.78, 1),
        roughness=0.72,
    )
    ROOFTOP_CONCRETE = base.material(
        "V9 architectural concrete",
        (0.34, 0.36, 0.35, 1),
        roughness=0.82,
    )
    ROOFTOP_SHADOW = v8.STONE_SHADOW
    ROOFTOP_TIMBER = base.material(
        "V9 outdoor oak",
        (0.42, 0.24, 0.105, 1),
        roughness=0.62,
    )
    ROOFTOP_TIMBER_DARK = base.OAK_DARK
    ROOFTOP_GRAPHITE = base.GRAPHITE
    ROOFTOP_UPHOLSTERY = base.FABRIC

    # The hero tree keeps the same project-owned foliage atlas, but a dedicated
    # cooler grade separates its sunlit crown from the darker indoor planting.
    CENTRAL_TREE_FOLIAGE = base.LEAF_ATLAS.copy()
    CENTRAL_TREE_FOLIAGE.name = "V9 architectural tree foliage"
    tree_nodes = CENTRAL_TREE_FOLIAGE.node_tree.nodes
    tree_links = CENTRAL_TREE_FOLIAGE.node_tree.links
    tree_bsdf = tree_nodes.get("Principled BSDF")
    if tree_bsdf and tree_bsdf.inputs["Base Color"].links:
        source_socket = tree_bsdf.inputs["Base Color"].links[0].from_socket
        for link in list(tree_bsdf.inputs["Base Color"].links):
            tree_links.remove(link)
        grade = tree_nodes.new("ShaderNodeHueSaturation")
        grade.name = "V9 balanced architectural foliage grade"
        grade.inputs["Saturation"].default_value = 0.86
        grade.inputs["Value"].default_value = 1.08
        tree_links.new(source_socket, grade.inputs["Color"])
        tree_links.new(grade.outputs["Color"], tree_bsdf.inputs["Base Color"])


def remove_rainforest_layers() -> None:
    """Remove the two inherited layers responsible for the forest-wall read."""
    tokens = ("exterior garden plate", "exterior garden canopy")
    for obj in list(bpy.context.scene.objects):
        if any(token in obj.name.lower() for token in tokens):
            bpy.data.objects.remove(obj, do_unlink=True)


def rooftop_joint(name: str, x: float, y: float, length: float, rotation_degrees: float = 0.0) -> None:
    """Add a restrained expansion joint without introducing texture noise."""
    base.cube(
        name,
        (x, y, 0.585),
        (length, 0.020, 0.012),
        ROOFTOP_SHADOW,
        rotation=(0.0, 0.0, math.radians(rotation_degrees)),
        bevel=0.008,
    )


def create_rooftop_lounge_blockout() -> None:
    """Compose only architectural lounge masses; planting arrives in Phase 4."""
    for side in (-1, 1):
        x = side * 8.85
        # Timber deck zones provide the warm/cool material contrast visible in
        # the approved reference while remaining broad enough to read at the
        # fixed isometric camera.
        base.cube(
            f"V9 rooftop timber deck {side}",
            (x, 18.05, 0.79),
            (3.35, 2.16, 0.10),
            ROOFTOP_TIMBER,
            bevel=0.12,
        )
        for slat in range(11):
            slat_x = x - 3.0 + slat * 0.60
            base.cube(
                f"V9 rooftop deck joint {side}-{slat}",
                (slat_x, 18.05, 0.905),
                (0.018, 1.96, 0.010),
                ROOFTOP_TIMBER_DARK,
                bevel=0.006,
            )

        # Low L-shaped lounge composition. It remains subordinate to the six
        # active stations and deliberately avoids human figures or new UI.
        base.cube(
            f"V9 rooftop lounge seat long {side}",
            (x, 18.72, 1.20),
            (2.06, 0.50, 0.30),
            ROOFTOP_UPHOLSTERY,
            bevel=0.24,
        )
        base.cube(
            f"V9 rooftop lounge back long {side}",
            (x, 19.17, 1.66),
            (2.08, 0.16, 0.55),
            ROOFTOP_UPHOLSTERY,
            bevel=0.20,
        )
        base.cube(
            f"V9 rooftop lounge return {side}",
            (x - side * 1.65, 17.63, 1.20),
            (0.48, 0.78, 0.30),
            ROOFTOP_UPHOLSTERY,
            bevel=0.24,
        )
        base.cylinder(
            f"V9 rooftop lounge table {side}",
            (x + side * 0.15, 17.16, 1.30),
            0.66,
            0.10,
            ROOFTOP_STONE_LIGHT,
            vertices=28,
            bevel=0.08,
        )
        base.cylinder(
            f"V9 rooftop lounge table stem {side}",
            (x + side * 0.15, 17.16, 1.05),
            0.09,
            0.24,
            ROOFTOP_GRAPHITE,
            vertices=16,
            bevel=0.025,
        )


def create_rooftop_hardscape_v9() -> None:
    """Build near, middle and far rooftop planes with a clear circulation axis."""
    # Near terrace: visually joins the existing glass atrium to the exterior.
    base.cube(
        "V9 near rooftop terrace",
        (0.0, 14.18, 0.34),
        (15.65, 2.58, 0.20),
        ROOFTOP_STONE_LIGHT,
        bevel=0.22,
    )
    # Middle terrace: a raised level gives the background architectural depth.
    base.cube(
        "V9 middle rooftop terrace",
        (0.0, 19.08, 0.45),
        (17.65, 2.32, 0.31),
        ROOFTOP_STONE,
        bevel=0.24,
    )
    # Far terrace is intentionally darker and higher, so the skyline will sit
    # on a grounded horizon rather than floating in the world background.
    base.cube(
        "V9 far rooftop terrace",
        (0.0, 24.95, 0.70),
        (20.0, 3.55, 0.56),
        ROOFTOP_CONCRETE,
        bevel=0.30,
    )

    # Central pale-stone path and offset connectors keep the original radial
    # office as the compositional hero while leading the eye toward the city.
    base.cube(
        "V9 rooftop central promenade",
        (0.0, 19.05, 0.82),
        (2.05, 6.95, 0.08),
        ROOFTOP_STONE_LIGHT,
        bevel=0.48,
    )
    for side in (-1, 1):
        base.cube(
            f"V9 rooftop diagonal connector {side}",
            (side * 5.0, 15.83, 0.68),
            (3.22, 0.63, 0.07),
            ROOFTOP_STONE_LIGHT,
            rotation=(0.0, 0.0, math.radians(side * 13.5)),
            bevel=0.22,
        )

    # Large integrated planter masses establish the eventual landscape rhythm
    # without adding foliage before the Phase 4 vegetation quality gate.
    planter_specs = (
        (-12.85, 14.55, 2.05, 0.92, -8.0),
        (12.85, 14.55, 2.05, 0.92, 8.0),
        (-5.00, 22.30, 2.35, 0.96, 5.0),
        (5.00, 22.30, 2.35, 0.96, -5.0),
    )
    for index, (x, y, rx, ry, rotation_degrees) in enumerate(planter_specs):
        angle = math.radians(rotation_degrees)
        outline = []
        inner = []
        for point_index in range(32):
            theta = math.tau * point_index / 32
            wobble = 1.0 + math.sin(theta * 3.0 + index) * 0.025
            local_x = math.cos(theta) * rx * wobble
            local_y = math.sin(theta) * ry * wobble
            px = x + local_x * math.cos(angle) - local_y * math.sin(angle)
            py = y + local_x * math.sin(angle) + local_y * math.cos(angle)
            outline.append((px, py))
            inner.append((x + (px - x) * 0.84, y + (py - y) * 0.66))
        base.organic_slab(
            f"V9 rooftop integrated planter {index}",
            outline,
            0.70,
            0.42,
            ROOFTOP_STONE_LIGHT,
            bevel=0.18,
        )
        base.organic_slab(
            f"V9 rooftop planter soil {index}",
            inner,
            1.13,
            0.055,
            ROOFTOP_SHADOW,
            bevel=0.08,
        )

    for joint_index, x in enumerate((-11.8, -6.0, 0.0, 6.0, 11.8)):
        rooftop_joint(f"V9 near terrace expansion joint {joint_index}", x, 14.15, 2.30, 90.0)
    for joint_index, y in enumerate((17.15, 19.05, 20.95)):
        rooftop_joint(f"V9 middle terrace expansion joint {joint_index}", 0.0, y, 16.6)

    # Slim parapet gives the exterior a credible roof edge while keeping the
    # open-sky silhouette needed for the later skyline layer.
    for side in (-1, 1):
        base.cube(
            f"V9 rooftop parapet {side}",
            (side * 19.55, 22.8, 1.70),
            (0.11, 6.55, 0.75),
            ROOFTOP_CONCRETE,
            bevel=0.10,
        )
        base.cube(
            f"V9 rooftop parapet cap {side}",
            (side * 19.55, 22.8, 2.50),
            (0.16, 6.55, 0.07),
            ROOFTOP_GRAPHITE,
            bevel=0.05,
        )

    create_rooftop_lounge_blockout()


def create_tree_v9() -> None:
    """Build a slimmer architectural umbrella tree with intentional voids."""
    tx, ty = 0.0, 2.80
    base.cylinder(
        "V9 Ficus limestone planter",
        (tx, ty, 0.65),
        2.28,
        0.48,
        v8.STONE_LIGHT,
        vertices=96,
        bevel=0.095,
    )
    base.torus(
        "V9 Ficus planter bronze rim",
        (tx, ty, 0.91),
        2.06,
        0.032,
        base.BRASS,
        major_segments=96,
    )
    base.cylinder(
        "V9 Ficus soil",
        (tx, ty, 0.91),
        1.98,
        0.070,
        base.STONE_DARK,
        vertices=72,
        bevel=0.02,
    )

    # Six restrained surface roots communicate age without creating the thick,
    # tentacular base that dominated the previous composition.
    root_origins = ((-0.22, -0.06), (0.0, -0.13), (0.23, -0.02), (-0.15, 0.16), (0.16, 0.17))
    for index in range(6):
        angle = math.tau * index / 6 + 0.10
        sx, sy = root_origins[index % len(root_origins)]
        base.tapered_tube_between(
            f"V9 Ficus slim root {index:02}",
            (tx + sx, ty + sy, 0.96),
            (tx + math.cos(angle) * 1.62, ty + math.sin(angle) * 1.48, 0.96),
            0.20,
            0.035,
            base.TRUNK,
            vertices=16,
        )

    # Five readable stems rise cleanly before branching. Their slight outward
    # drift produces the umbrella silhouette without a single oversized trunk.
    stem_paths = (
        ((-0.28, -0.03, 0.97), (-0.26, 0.00, 3.10), (-0.72, -0.04, 4.92)),
        ((-0.08, -0.14, 0.97), (0.00, -0.08, 3.28), (0.18, -0.26, 5.12)),
        ((0.25, -0.02, 0.97), (0.22, 0.06, 3.14), (0.76, 0.02, 4.96)),
        ((-0.16, 0.17, 0.97), (-0.05, 0.18, 3.20), (-0.34, 0.62, 5.08)),
        ((0.14, 0.19, 0.97), (0.09, 0.22, 3.30), (0.46, 0.70, 5.12)),
    )
    for index, path in enumerate(stem_paths):
        world_path = [(tx + x, ty + y, z) for x, y, z in path]
        base.tapered_tube_between(
            f"V9 Ficus stem {index:02} lower",
            world_path[0],
            world_path[1],
            0.34,
            0.22,
            base.TRUNK,
            vertices=22,
        )
        base.tapered_tube_between(
            f"V9 Ficus stem {index:02} upper",
            world_path[1],
            world_path[2],
            0.22,
            0.095,
            base.TRUNK,
            vertices=18,
        )

    branch_specs = (
        ((-0.25, 0.00, 3.62), (-2.62, -0.58, 5.74), 0.19, 0.052),
        ((0.05, -0.08, 3.74), (2.66, -0.52, 5.78), 0.19, 0.052),
        ((-0.10, 0.20, 3.88), (-1.62, 1.18, 5.98), 0.17, 0.046),
        ((0.11, 0.22, 3.92), (1.68, 1.20, 6.00), 0.17, 0.046),
        ((-0.56, -0.01, 4.38), (-3.26, 0.16, 5.78), 0.145, 0.038),
        ((0.58, 0.02, 4.40), (3.28, 0.22, 5.80), 0.145, 0.038),
        ((-0.28, 0.52, 4.46), (-0.72, 2.02, 6.02), 0.135, 0.035),
        ((0.34, 0.54, 4.48), (0.80, 2.04, 6.04), 0.135, 0.035),
        ((-0.68, -0.03, 4.70), (-2.10, -1.40, 5.84), 0.115, 0.030),
        ((0.72, -0.01, 4.72), (2.16, -1.34, 5.86), 0.115, 0.030),
    )
    for index, (start, end, start_radius, end_radius) in enumerate(branch_specs):
        start_world = Vector((tx + start[0], ty + start[1], start[2]))
        end_world = Vector((tx + end[0], ty + end[1], end[2]))
        base.tapered_tube_between(
            f"V9 Ficus main branch {index:02}",
            tuple(start_world),
            tuple(end_world),
            start_radius,
            end_radius,
            base.TRUNK,
            vertices=15,
        )
        direction = end_world - start_world
        fork_start = start_world + direction * 0.72
        side = -1 if index % 2 else 1
        fork_end = end_world + Vector((side * 0.46, 0.32 if index % 3 else -0.24, 0.24))
        base.tapered_tube_between(
            f"V9 Ficus fork {index:02}",
            tuple(fork_start),
            tuple(fork_end),
            end_radius * 0.78,
            end_radius * 0.28,
            base.TRUNK,
            vertices=11,
        )
        twig_end = end_world + Vector((-side * 0.22, side * 0.42, 0.34))
        base.tapered_tube_between(
            f"V9 Ficus twig {index:02}",
            tuple(end_world - direction * 0.07),
            tuple(twig_end),
            max(end_radius * 0.36, 0.013),
            max(end_radius * 0.10, 0.005),
            base.TRUNK,
            vertices=8,
        )

    # Ten separated crown anchors create readable pockets of sky. The vertical
    # spread is intentionally shallow: an architectural umbrella, not a bush.
    crown_centers = [
        (tx - 3.18, ty - 0.42, 5.98),
        (tx - 2.34, ty - 0.78, 6.25),
        (tx - 1.24, ty - 0.74, 6.42),
        (tx, ty - 0.70, 6.48),
        (tx + 1.24, ty - 0.72, 6.42),
        (tx + 2.36, ty - 0.72, 6.26),
        (tx + 3.18, ty - 0.36, 6.00),
        (tx - 1.72, ty + 0.92, 6.32),
        (tx - 0.46, ty + 1.28, 6.48),
        (tx + 0.86, ty + 1.24, 6.46),
        (tx + 2.02, ty + 0.82, 6.30),
    ]
    previous_leaf_atlas = base.LEAF_ATLAS
    base.LEAF_ATLAS = CENTRAL_TREE_FOLIAGE
    try:
        base.create_leaf_cards(
            "V9 Ficus architectural canopy",
            crown_centers,
            count=560,
            spread=(0.70, 0.55, 0.27),
            seed=90126,
            size_range=(0.34, 0.60),
        )
        understory_centers = [
            (tx + math.cos(angle) * 1.54, ty + math.sin(angle) * 1.40, 1.18 + (index % 2) * 0.08)
            for index, angle in enumerate(point * math.tau / 10 for point in range(10))
        ]
        base.create_leaf_cards(
            "V9 Ficus restrained understory",
            understory_centers,
            count=72,
            spread=(0.22, 0.19, 0.16),
            seed=90127,
            size_range=(0.14, 0.28),
        )
    finally:
        base.LEAF_ATLAS = previous_leaf_atlas

    for index in range(12):
        angle = math.tau * index / 12 + (index % 2) * 0.07
        radius = 1.60 + (index % 3) * 0.10
        base.uv_sphere(
            f"V9 Ficus planter stone {index:02}",
            (tx + math.cos(angle) * radius, ty + math.sin(angle) * radius, 1.02),
            (0.19 + (index % 3) * 0.025, 0.14 + (index % 2) * 0.025, 0.10 + (index % 4) * 0.012),
            v8.STONE_LIGHT if index % 3 else v8.STONE_SHADOW,
            segments=14,
            rings=7,
        )


def create_exterior_tree_v9(
    name: str,
    x: float,
    y: float,
    *,
    height: float,
    crown_radius: float,
    seed: int,
    lean: float = 0.0,
) -> None:
    """Create one compact olive/acacia-like rooftop specimen."""
    base_z = 1.17
    split_z = base_z + height * 0.43
    crown_z = base_z + height * 0.82
    for stem in range(3):
        offset_x = (stem - 1) * 0.10
        offset_y = (0.06, -0.05, 0.04)[stem]
        middle = (
            x + offset_x + lean * 0.34 + (stem - 1) * 0.06,
            y + offset_y,
            split_z,
        )
        tip = (
            x + lean + (stem - 1) * crown_radius * 0.34,
            y + ((stem % 2) * 2 - 1) * crown_radius * 0.15,
            crown_z - abs(stem - 1) * 0.12,
        )
        base.tapered_tube_between(
            f"{name} stem {stem} lower",
            (x + offset_x, y + offset_y, base_z),
            middle,
            0.16,
            0.095,
            base.TRUNK,
            vertices=14,
        )
        base.tapered_tube_between(
            f"{name} stem {stem} upper",
            middle,
            tip,
            0.095,
            0.038,
            base.TRUNK,
            vertices=11,
        )

    canopy_centers = [
        (x + lean - crown_radius * 0.72, y - crown_radius * 0.10, crown_z + 0.02),
        (x + lean - crown_radius * 0.32, y + crown_radius * 0.24, crown_z + 0.18),
        (x + lean + crown_radius * 0.10, y - crown_radius * 0.18, crown_z + 0.22),
        (x + lean + crown_radius * 0.48, y + crown_radius * 0.20, crown_z + 0.12),
        (x + lean + crown_radius * 0.78, y - crown_radius * 0.04, crown_z),
    ]
    base.create_leaf_cards(
        f"{name} open canopy",
        canopy_centers,
        count=138,
        spread=(crown_radius * 0.34, crown_radius * 0.28, crown_radius * 0.17),
        seed=seed,
        size_range=(0.24, 0.42),
    )


def create_grass_cluster_v9(name: str, x: float, y: float, *, scale: float, seed: int) -> None:
    """Add low ornamental grass with geometry already batched by leaf material."""
    for blade in range(7):
        angle = math.tau * blade / 7 + (seed % 5) * 0.11
        start = (x, y, 1.19)
        radius = scale * (0.24 + (blade % 3) * 0.04)
        end = (
            x + math.cos(angle) * radius,
            y + math.sin(angle) * radius,
            1.19 + scale * (0.42 + (blade % 4) * 0.05),
        )
        base.tapered_tube_between(
            f"{name} blade {blade}",
            start,
            end,
            0.018 * scale,
            0.004,
            base.LEAF_LIGHT,
            vertices=6,
        )


def create_rooftop_vegetation_v9() -> None:
    """Populate the rooftop with four specimens and restrained A/B/C planting."""
    tree_specs = (
        ("V9 exterior olive A", -12.82, 14.56, 4.45, 1.42, 90140, 0.18),
        ("V9 exterior olive B", 12.80, 14.58, 4.10, 1.30, 90141, -0.16),
        ("V9 exterior acacia A", -5.02, 22.30, 4.75, 1.55, 90142, -0.10),
        ("V9 exterior acacia B", 5.02, 22.30, 4.55, 1.48, 90143, 0.12),
    )
    for name, x, y, height, crown_radius, seed, lean in tree_specs:
        create_exterior_tree_v9(
            name,
            x,
            y,
            height=height,
            crown_radius=crown_radius,
            seed=seed,
            lean=lean,
        )

    planter_centers = ((-12.85, 14.55), (12.85, 14.55), (-5.00, 22.30), (5.00, 22.30))
    for planter_index, (cx, cy) in enumerate(planter_centers):
        # A: clipped hedge masses, B: round shrubs, C: grasses. All reuse the
        # existing plant material families and therefore add no material batch.
        for hedge in (-1, 1):
            base.uv_sphere(
                f"V9 rooftop hedge A {planter_index}-{hedge}",
                (cx + hedge * 0.82, cy + 0.18, 1.32),
                (0.42, 0.22, 0.22),
                base.LEAF,
                segments=14,
                rings=7,
            )
        for shrub in range(3):
            angle = -0.75 + shrub * 0.70
            base.uv_sphere(
                f"V9 rooftop shrub B {planter_index}-{shrub}",
                (cx + math.sin(angle) * 0.74, cy - 0.46 + math.cos(angle) * 0.12, 1.27),
                (0.25 + shrub * 0.025, 0.22, 0.18 + (shrub % 2) * 0.04),
                base.LEAF_LIGHT if shrub == 1 else base.LEAF,
                segments=12,
                rings=6,
            )
        create_grass_cluster_v9(
            f"V9 rooftop grass C {planter_index}",
            cx + (-0.34 if planter_index % 2 else 0.34),
            cy + 0.54,
            scale=0.74 + planter_index * 0.04,
            seed=90150 + planter_index,
        )

    # Sparse low borders visually stitch lounge and walkway without returning
    # to the wall-of-green effect removed in Phase 1.
    border_centers = (
        (-8.85, 20.25, 0.72), (-7.95, 20.18, 0.58),
        (8.85, 20.25, 0.72), (7.95, 20.18, 0.58),
        (-1.35, 24.20, 0.62), (1.35, 24.20, 0.62),
    )
    for index, (x, y, width) in enumerate(border_centers):
        base.uv_sphere(
            f"V9 rooftop low border {index}",
            (x, y, 1.39),
            (width, 0.30, 0.25),
            base.LEAF if index % 2 else base.LEAF_LIGHT,
            segments=14,
            rings=7,
        )


def create_pavilions_v9() -> None:
    original_pavilions()
    remove_rainforest_layers()
    create_rooftop_hardscape_v9()
    create_rooftop_vegetation_v9()
    base.cube(
        "V9 temporary urban horizon",
        (0.0, 36.5, 8.0),
        (26.0, 0.06, 8.0),
        SKYLINE_HAZE,
        bevel=0.02,
    )


def create_lighting_and_camera_v9() -> None:
    original_lighting_and_camera()
    scene = bpy.context.scene
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.50, 0.66, 0.74, 1)
    background.inputs["Strength"].default_value = 0.62


base.make_materials = make_materials_v9
base.create_tree = create_tree_v9
base.create_pavilions = create_pavilions_v9
base.create_lighting_and_camera = create_lighting_and_camera_v9


if __name__ == "__main__":
    os.environ.setdefault("CREWLAB_RENDER_DETAILS", "0")
    base.build_scene()

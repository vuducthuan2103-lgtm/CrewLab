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


def make_materials_v9() -> None:
    global SKYLINE_HAZE
    global ROOFTOP_STONE, ROOFTOP_STONE_LIGHT, ROOFTOP_CONCRETE, ROOFTOP_SHADOW
    global ROOFTOP_TIMBER, ROOFTOP_TIMBER_DARK, ROOFTOP_GRAPHITE, ROOFTOP_UPHOLSTERY
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


def create_pavilions_v9() -> None:
    original_pavilions()
    remove_rainforest_layers()
    create_rooftop_hardscape_v9()
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
base.create_pavilions = create_pavilions_v9
base.create_lighting_and_camera = create_lighting_and_camera_v9


if __name__ == "__main__":
    os.environ.setdefault("CREWLAB_RENDER_DETAILS", "0")
    base.build_scene()

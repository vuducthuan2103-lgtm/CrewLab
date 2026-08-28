"""Build the cinematic CrewLab garden office v7 environment.

V7 keeps the true-3D v6 character seam while tightening the environment to the
original production board: warmer/darker PBR surfaces, a branded waterfall,
layered planted islands around the workstations and less empty foreground.
"""

from __future__ import annotations

import importlib.util
import math
import os
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
V6_SCRIPT = Path(__file__).with_name("build_virtual_office_v6.py")
OUTPUT_DIR = ROOT / "portal" / "public" / "virtual-office"


def load_v6_module():
    spec = importlib.util.spec_from_file_location("crewlab_virtual_office_v6", V6_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load v6 scene generator: {V6_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


v6 = load_v6_module()
base = v6.base
v5 = v6.v5

base.BLEND_PATH = OUTPUT_DIR / "garden-office-v7.blend"
base.GLB_PATH = OUTPUT_DIR / "garden-office-v7.glb"
base.PREVIEW_PATH = OUTPUT_DIR / "garden-office-v7-preview.png"

original_make_materials = base.make_materials
original_landscape_details = base.create_landscape_details
original_pavilions = base.create_pavilions


def make_materials_v7() -> None:
    original_make_materials()
    # The prior scene read as pale architectural foam under WebGL. Preserve
    # texture detail while shifting the value hierarchy toward oak, bronze and
    # deep garden greens from the reference.
    v5.grade_textured_material(base.STONE, value=0.57, saturation=0.78)
    v5.grade_textured_material(base.OAK, value=0.72, saturation=0.98)
    v5.grade_textured_material(base.TRUNK, value=0.66, saturation=0.78)

    ivory = base.IVORY.node_tree.nodes.get("Principled BSDF")
    ivory.inputs["Base Color"].default_value = (0.55, 0.43, 0.28, 1)
    ivory.inputs["Roughness"].default_value = 0.56
    water = base.WATER.node_tree.nodes.get("Principled BSDF")
    water.inputs["Base Color"].default_value = (0.018, 0.19, 0.16, 1)
    water.inputs["Roughness"].default_value = 0.055
    base.LEAF.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.045, 0.24, 0.055, 1)
    base.LEAF_LIGHT.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.13, 0.42, 0.10, 1)


def create_landscape_details_v7() -> None:
    original_landscape_details()

    # Eight deliberately placed foliage islands fill the empty floor without
    # returning to the overly dense v5 jungle. Their height stays below the
    # agents' faces and monitor sight-lines.
    planter_centers = (
        (-3.25, -1.35, 0.82),
        (3.30, -1.30, 0.82),
        (-3.55, 1.95, 0.84),
        (3.58, 1.90, 0.84),
        (-2.55, -4.65, 0.80),
        (2.55, -4.62, 0.80),
        (-8.15, -0.75, 0.84),
        (8.12, -0.72, 0.84),
    )
    for index, (x, y, z) in enumerate(planter_centers):
        base.cylinder(
            f"V7 layered planter {index}",
            (x, y, 0.58),
            0.66 if index < 6 else 0.54,
            0.34,
            base.STONE,
            vertices=40,
            bevel=0.10,
        )
        base.cylinder(
            f"V7 planter soil {index}",
            (x, y, 0.77),
            0.55 if index < 6 else 0.45,
            0.05,
            base.STONE_DARK,
            vertices=32,
            bevel=0.018,
        )

    base.create_leaf_cards(
        "V7 workstation garden layers",
        planter_centers,
        count=156,
        spread=(0.46, 0.38, 0.46),
        seed=7026,
        size_range=(0.25, 0.53),
    )

    # More readable lily pads/reflections at the two foreground water pockets.
    for index, (x, y, radius) in enumerate(
        ((-8.2, -6.3, 0.34), (-7.35, -6.75, 0.24), (7.7, -6.1, 0.38), (8.55, -5.55, 0.25))
    ):
        base.cylinder(
            f"V7 lily pad {index}",
            (x, y, 0.535 + index * 0.002),
            radius,
            0.018,
            base.LEAF_LIGHT if index % 2 else base.LEAF,
            vertices=28,
            bevel=0.014,
        )


def create_pavilions_v7() -> None:
    original_pavilions()

    sign_material = base.material(
        "V7 waterfall brand glow",
        (0.76, 0.94, 0.82, 1),
        roughness=0.26,
        emission=(0.28, 0.92, 0.72, 1),
        emission_strength=3.1,
    )
    for body, size, z in (("CREWLAB", 0.39, 2.43), ("AI OPERATIONS", 0.15, 1.98)):
        curve = bpy.data.curves.new(f"V7 waterfall {body} curve", type="FONT")
        curve.body = body
        curve.align_x = "CENTER"
        curve.align_y = "CENTER"
        curve.size = size
        curve.extrude = 0.012
        curve.bevel_depth = 0.006
        sign = bpy.data.objects.new(f"V7 Waterfall {body}", curve)
        bpy.context.collection.objects.link(sign)
        sign.location = (-7.72, 6.075, z)
        sign.rotation_euler = (math.radians(90), 0, 0)
        sign.data.materials.append(sign_material)

    # A bronze-and-glass header makes the left feature read as an architectural
    # volume rather than a loose curtain prop.
    base.cube(
        "V7 waterfall canopy",
        (-7.72, 6.28, 4.72),
        (2.12, 0.72, 0.13),
        base.BRASS,
        bevel=0.18,
    )
    for side in (-1, 1):
        base.cube(
            f"V7 waterfall canopy post {side}",
            (-7.72 + side * 2.0, 6.20, 2.70),
            (0.06, 0.12, 1.95),
            base.BRASS,
            bevel=0.028,
        )


base.make_materials = make_materials_v7
base.create_landscape_details = create_landscape_details_v7
base.create_pavilions = create_pavilions_v7


if __name__ == "__main__":
    os.environ.setdefault("CREWLAB_RENDER_DETAILS", "0")
    base.build_scene()

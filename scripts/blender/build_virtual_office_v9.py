"""Build CrewLab's premium urban rooftop office environment v9.

This file is intentionally advanced in reviewable phases. Phase 1 removes the
inherited rainforest layers and provides a clean neutral exterior surface. The
approved v8 interior layout, station roots, pavilions and agent anchors stay
untouched.
"""

from __future__ import annotations

import importlib.util
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


def make_materials_v9() -> None:
    global SKYLINE_HAZE
    original_make_materials()
    SKYLINE_HAZE = base.material(
        "V9 temporary skyline haze",
        (0.43, 0.57, 0.64, 1),
        roughness=1.0,
    )


def remove_rainforest_layers() -> None:
    """Remove the two inherited layers responsible for the forest-wall read."""
    tokens = ("exterior garden plate", "exterior garden canopy")
    for obj in list(bpy.context.scene.objects):
        if any(token in obj.name.lower() for token in tokens):
            bpy.data.objects.remove(obj, do_unlink=True)


def create_pavilions_v9() -> None:
    original_pavilions()
    remove_rainforest_layers()

    # Phase 1 only: a clean temporary surface proves that removing the forest
    # opens the view. Detailed hardscape/landscape is deliberately deferred.
    base.cube(
        "V9 temporary open rooftop",
        (0.0, 18.0, 0.18),
        (18.5, 6.2, 0.18),
        v8.STONE_LIGHT,
        bevel=0.18,
    )
    base.cube(
        "V9 temporary urban horizon",
        (0.0, 35.5, 7.0),
        (24.0, 0.06, 7.0),
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

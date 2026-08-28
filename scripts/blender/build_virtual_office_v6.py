"""Build CrewLab's true-3D garden office environment v6.

V6 keeps the approved cinematic v5 architecture, materials, lighting and
exterior depth, restores modeled chairs, removes every raster character card,
and leaves the six animated skinned humans as separate runtime GLBs.
"""

from __future__ import annotations

import importlib.util
import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
V5_SCRIPT = Path(__file__).with_name("build_virtual_office_v5.py")
OUTPUT_DIR = ROOT / "portal" / "public" / "virtual-office"


def load_v5_module():
    spec = importlib.util.spec_from_file_location("crewlab_virtual_office_v5", V5_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load v5 scene generator: {V5_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


v5 = load_v5_module()
base = v5.base
original_base = v5.load_base_module()

base.BLEND_PATH = OUTPUT_DIR / "garden-office-v6.blend"
base.GLB_PATH = OUTPUT_DIR / "garden-office-v6.glb"
base.PREVIEW_PATH = OUTPUT_DIR / "garden-office-v6-preview.png"


def omit_raster_character(
    _name: str,
    _x: float,
    _y: float,
    _suit,
    _hair,
) -> None:
    """Characters are loaded as separate skinned GLBs in React Three Fiber."""
    return None


# Keep v5's photographic material grade, pavilion, exterior depth and camera.
# Restore the real ergonomic chair and the lighter v4 planting density.
base.create_chair = original_base.create_chair
base.create_person = omit_raster_character
base.create_landscape_details = v5.original_landscape_details
base.create_pavilions = v5.create_pavilions_v5
base.create_lighting_and_camera = v5.create_lighting_and_camera_v5
base.make_materials = v5.make_materials_v5


if __name__ == "__main__":
    os.environ.setdefault("CREWLAB_RENDER_DETAILS", "0")
    base.build_scene()

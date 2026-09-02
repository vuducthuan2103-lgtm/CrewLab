"""Build CrewLab's crisp premium rooftop office environment v10.

V10 keeps the approved six-station interior and v9 architectural tree, then
replaces the placeholder city blocks with a calm rooftop exterior made from:

* real 3D rooftop terraces, stairs, lounge furniture, planters and trees;
* one project-owned, balanced city panorama beyond the glass.

The distant bitmap is deliberately not used for characters or interactive
objects. It is a low-cost LOD layer behind fully modelled foreground geometry.
"""

from __future__ import annotations

import importlib.util
import math
import os
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
V9_SCRIPT = Path(__file__).with_name("build_virtual_office_v9.py")
OUTPUT_DIR = ROOT / "portal" / "public" / "virtual-office"
SKYLINE_TEXTURE_PATH = (
    OUTPUT_DIR
    / "textures"
    / "rooftop-v10"
    / "city-skyline-balanced-blue-hour-v5.png"
)


def load_v9_module():
    spec = importlib.util.spec_from_file_location("crewlab_virtual_office_v9", V9_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load v9 scene generator: {V9_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


v9 = load_v9_module()
base = v9.base

base.BLEND_PATH = OUTPUT_DIR / "garden-office-v10.blend"
base.GLB_PATH = OUTPUT_DIR / "garden-office-v10.glb"
base.PREVIEW_PATH = OUTPUT_DIR / "garden-office-v10-preview.png"

original_make_materials = base.make_materials
original_create_pavilions = base.create_pavilions
original_lighting_and_camera = base.create_lighting_and_camera

CITY_BACKDROP = None
ROOFTOP_EDGE_LIGHT = None
TOPIARY_FOLIAGE = None


def make_materials_v10() -> None:
    global CITY_BACKDROP, ROOFTOP_EDGE_LIGHT, TOPIARY_FOLIAGE
    original_make_materials()

    CITY_BACKDROP = base.material(
        "V10 crisp distant city panorama",
        (1.0, 1.0, 1.0, 1.0),
        roughness=0.92,
        emission=(1.0, 1.0, 1.0, 1.0),
        emission_strength=0.18,
    )
    image = bpy.data.images.load(str(SKYLINE_TEXTURE_PATH), check_existing=True)
    image.colorspace_settings.name = "sRGB"
    nodes = CITY_BACKDROP.node_tree.nodes
    links = CITY_BACKDROP.node_tree.links
    texture = nodes.new("ShaderNodeTexImage")
    texture.name = "V10 generated skyline color"
    texture.image = image
    texture.interpolation = "Linear"
    texture.extension = "CLIP"
    bsdf = nodes.get("Principled BSDF")
    links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(texture.outputs["Color"], bsdf.inputs["Emission Color"])

    ROOFTOP_EDGE_LIGHT = base.material(
        "V10 warm terrace edge light",
        (0.76, 0.56, 0.30, 1.0),
        roughness=0.35,
        emission=(1.0, 0.62, 0.26, 1.0),
        emission_strength=1.40,
    )
    TOPIARY_FOLIAGE = base.material(
        "V10 deep topiary foliage",
        (0.075, 0.245, 0.115, 1.0),
        roughness=0.90,
    )


def remove_v9_skyline() -> None:
    tokens = (
        "v9 far skyline",
        "v9 mid skyline",
        "v9 skyline landmark",
        "v9 skyline podium",
    )
    for obj in list(bpy.context.scene.objects):
        if obj.name.lower().startswith(tokens):
            bpy.data.objects.remove(obj, do_unlink=True)


def create_city_backdrop_v10() -> None:
    """Create a single UV-mapped far LOD behind all authored 3D geometry."""
    width = 72.0
    height = 28.4
    y = 52.0
    bottom_z = -8.0
    mesh = bpy.data.meshes.new("V10 distant city panorama mesh")
    mesh.from_pydata(
        [
            (-width / 2, y, bottom_z),
            (width / 2, y, bottom_z),
            (width / 2, y, bottom_z + height),
            (-width / 2, y, bottom_z + height),
        ],
        [],
        [(0, 1, 2, 3)],
    )
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="V10 skyline UV")
    uv_by_vertex = ((0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0))
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            vertex_index = mesh.loops[loop_index].vertex_index
            uv_layer.data[loop_index].uv = uv_by_vertex[vertex_index]
    obj = bpy.data.objects.new("V10 crisp distant city panorama", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(CITY_BACKDROP)


def create_topiary_v10(name: str, x: float, y: float, height: float, radius: float) -> None:
    ground_z = 1.56
    base.cylinder(
        f"{name} trunk",
        (x, y, ground_z + height * 0.42),
        0.085,
        height * 0.42,
        base.TRUNK,
        vertices=12,
        bevel=0.025,
    )
    crown_specs = (
        (-0.30, 0.00, 0.02, 0.72),
        (0.28, 0.02, 0.06, 0.70),
        (0.00, -0.11, 0.33, 0.64),
    )
    for crown_index, (offset_x, offset_y, offset_z, scale) in enumerate(crown_specs):
        base.uv_sphere(
            f"{name} crown {crown_index}",
            (x + offset_x * radius, y + offset_y * radius, ground_z + height + offset_z * radius),
            (radius * scale, radius * scale * 0.78, radius * scale * 0.86),
            TOPIARY_FOLIAGE,
            segments=16,
            rings=8,
        )


def create_rooftop_detail_v10() -> None:
    """Add stepped terraces, warm edges, lounge clusters and layered planting."""
    # A broad timber deck gives the far terrace the warm, high-end rooftop read
    # of the reference while keeping a pale central circulation route.
    base.cube(
        "V10 rear timber garden deck",
        (0.0, 24.05, 1.21),
        (7.35, 2.10, 0.09),
        v9.ROOFTOP_TIMBER,
        bevel=0.18,
    )
    for slat in range(19):
        slat_x = -6.84 + slat * 0.76
        base.cube(
            f"V10 rear timber deck joint {slat}",
            (slat_x, 24.05, 1.305),
            (0.016, 1.92, 0.009),
            v9.ROOFTOP_TIMBER_DARK,
            bevel=0.004,
        )

    # Central stair makes the exterior levels legible at the fixed camera.
    for index in range(4):
        y = 21.35 + index * 0.52
        z = 0.98 + index * 0.14
        width = 2.35 - index * 0.10
        base.cube(
            f"V10 central terrace step {index}",
            (0.0, y, z),
            (width, 0.30, 0.14),
            v9.ROOFTOP_STONE_LIGHT,
            bevel=0.075,
        )
        base.cube(
            f"V10 central terrace step light {index}",
            (0.0, y - 0.305, z + 0.07),
            (width * 0.88, 0.018, 0.018),
            ROOFTOP_EDGE_LIGHT,
            bevel=0.008,
        )

    # Raised white landscape beds create the terrace structure seen in the
    # reference without filling the view with foliage.
    planter_specs = (
        (-16.0, 25.0, 2.10, 0.72),
        (-11.2, 25.7, 1.70, 0.62),
        (-6.4, 24.9, 1.55, 0.58),
        (6.4, 24.9, 1.55, 0.58),
        (11.2, 25.7, 1.70, 0.62),
        (16.0, 25.0, 2.10, 0.72),
    )
    for index, (x, y, half_width, half_depth) in enumerate(planter_specs):
        base.cube(
            f"V10 raised landscape planter {index}",
            (x, y, 1.33),
            (half_width, half_depth, 0.38),
            v9.ROOFTOP_STONE_LIGHT,
            bevel=0.24,
        )
        base.cube(
            f"V10 raised landscape soil {index}",
            (x, y, 1.72),
            (half_width * 0.82, half_depth * 0.70, 0.045),
            v9.ROOFTOP_SHADOW,
            bevel=0.10,
        )
        create_topiary_v10(
            f"V10 rooftop topiary {index}",
            x,
            y,
            2.05 + (index % 3) * 0.24,
            0.62 + (index % 2) * 0.10,
        )
        for shrub in (-1, 0, 1):
            base.uv_sphere(
                f"V10 rooftop layered shrub {index}-{shrub}",
                (x + shrub * half_width * 0.43, y - 0.10, 1.90),
                (0.34, 0.27, 0.24),
                base.LEAF_LIGHT if (index + shrub) % 2 else base.LEAF,
                segments=12,
                rings=6,
            )
        base.cube(
            f"V10 planter edge light {index}",
            (x, y - half_depth - 0.014, 1.42),
            (half_width * 0.78, 0.016, 0.020),
            ROOFTOP_EDGE_LIGHT,
            bevel=0.008,
        )

    # Two rear lounges add human-scale detail without adding decorative people.
    for side in (-1, 1):
        x = side * 11.0
        y = 23.15
        base.cube(
            f"V10 rear lounge platform {side}",
            (x, y, 1.22),
            (3.15, 1.42, 0.10),
            v9.ROOFTOP_TIMBER,
            bevel=0.18,
        )
        base.cube(
            f"V10 rear lounge sofa seat {side}",
            (x, y + 0.42, 1.67),
            (1.62, 0.48, 0.24),
            v9.ROOFTOP_UPHOLSTERY,
            bevel=0.24,
        )
        base.cube(
            f"V10 rear lounge sofa back {side}",
            (x, y + 0.82, 2.08),
            (1.65, 0.15, 0.54),
            v9.ROOFTOP_UPHOLSTERY,
            bevel=0.20,
        )
        for cushion in (-1, 1):
            base.cube(
                f"V10 rear lounge cushion {side}-{cushion}",
                (x + cushion * 0.73, y + 0.17, 1.92),
                (0.39, 0.12, 0.31),
                v9.ROOFTOP_STONE_LIGHT if cushion > 0 else base.BRASS,
                rotation=(math.radians(-72), 0.0, 0.0),
                bevel=0.12,
            )
        base.cylinder(
            f"V10 rear lounge table {side}",
            (x - side * 2.05, y - 0.20, 1.61),
            0.58,
            0.11,
            v9.ROOFTOP_STONE_LIGHT,
            vertices=28,
            bevel=0.07,
        )

    # Slim illuminated parapet bands define the rooftop silhouette at night
    # while remaining a restrained warm accent in daylight.
    for side in (-1, 1):
        base.cube(
            f"V10 parapet warm edge {side}",
            (side * 19.38, 22.8, 2.38),
            (0.022, 5.80, 0.025),
            ROOFTOP_EDGE_LIGHT,
            bevel=0.008,
        )


def create_pavilions_v10() -> None:
    original_create_pavilions()
    remove_v9_skyline()
    create_rooftop_detail_v10()
    create_city_backdrop_v10()


def create_lighting_and_camera_v10() -> None:
    original_lighting_and_camera()
    scene = bpy.context.scene
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.61, 0.78, 0.88, 1.0)
    background.inputs["Strength"].default_value = 0.72


base.make_materials = make_materials_v10
base.create_pavilions = create_pavilions_v10
base.create_lighting_and_camera = create_lighting_and_camera_v10


if __name__ == "__main__":
    os.environ.setdefault("CREWLAB_RENDER_DETAILS", "0")
    base.build_scene()

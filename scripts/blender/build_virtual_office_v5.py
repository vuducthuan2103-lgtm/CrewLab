"""Build CrewLab's cinematic hybrid garden office v5.

Version 5 deliberately reuses the verified v4 architectural generator and
overlays a higher-fidelity asset tier: photoreal character cards, exterior
garden depth, denser planting, darker materials and a closer cinematic camera.
The office remains true geometry and exports as an orbitable GLB.
"""

from __future__ import annotations

import importlib.util
import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
BASE_SCRIPT = Path(__file__).with_name("build_virtual_office.py")
OUTPUT_DIR = ROOT / "portal" / "public" / "virtual-office"
V5_TEXTURE_DIR = OUTPUT_DIR / "textures" / "v5"
V5_REFERENCE_DIR = OUTPUT_DIR / "references" / "v5"
BLEND_PATH = OUTPUT_DIR / "garden-office-v5.blend"
GLB_PATH = OUTPUT_DIR / "garden-office-v5.glb"
PREVIEW_PATH = OUTPUT_DIR / "garden-office-v5-preview.png"
EXTERIOR_PATH = V5_TEXTURE_DIR / "exterior-garden-depth.jpg"
CAMERA_LOCATION = (13.8, -21.8, 13.2)
CAMERA_TARGET = (0.0, 1.15, 2.42)

STATION_ROTATIONS = {
    "A01": 180.0,
    "B02": 58.0,
    "B03": -58.0,
    "D01": 124.0,
    "D02": 180.0,
    "E01": -124.0,
}


def load_base_module():
    spec = importlib.util.spec_from_file_location("crewlab_virtual_office_v4", BASE_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load base scene generator: {BASE_SCRIPT}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


base = load_base_module()
base.BLEND_PATH = BLEND_PATH
base.GLB_PATH = GLB_PATH
base.PREVIEW_PATH = PREVIEW_PATH
base.REFERENCE_DIR = V5_REFERENCE_DIR

original_make_materials = base.make_materials
original_landscape_details = base.create_landscape_details
original_pavilions = base.create_pavilions
original_lighting_and_camera = base.create_lighting_and_camera


def grade_textured_material(mat: bpy.types.Material, value: float, saturation: float) -> None:
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    image_node = next((node for node in nodes if node.type == "TEX_IMAGE" and "albedo" in node.name.lower()), None)
    if bsdf is None or image_node is None:
        return
    for link in list(bsdf.inputs["Base Color"].links):
        links.remove(link)
    grade = nodes.new("ShaderNodeHueSaturation")
    grade.name = f"{mat.name} v5 photographic grade"
    grade.inputs["Saturation"].default_value = saturation
    grade.inputs["Value"].default_value = value
    links.new(image_node.outputs["Color"], grade.inputs["Color"])
    links.new(grade.outputs["Color"], bsdf.inputs["Base Color"])


def make_materials_v5() -> None:
    original_make_materials()
    grade_textured_material(base.STONE, value=0.68, saturation=0.72)
    grade_textured_material(base.OAK, value=0.76, saturation=0.82)
    grade_textured_material(base.TRUNK, value=0.72, saturation=0.70)
    base.STONE_DARK.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.055, 0.048, 0.036, 1)
    base.GLASS.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.075
    base.WATER.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.09


def image_material(name: str, path: Path, *, alpha: bool, emission_strength: float = 0.0) -> bpy.types.Material:
    if not path.exists():
        raise FileNotFoundError(path)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for node in list(nodes):
        nodes.remove(node)
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(str(path), check_existing=True)
    texture.image.colorspace_settings.name = "sRGB"
    texture.interpolation = "Linear"
    bsdf.inputs["Roughness"].default_value = 0.58
    links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    if emission_strength > 0:
        links.new(texture.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if alpha:
        links.new(texture.outputs["Alpha"], bsdf.inputs["Alpha"])
        mat.surface_render_method = "DITHERED"
        mat.use_transparency_overlap = False
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return mat


def image_plane(
    name: str,
    location: tuple[float, float, float],
    width: float,
    height: float,
    mat: bpy.types.Material,
    *,
    rotation_z: float = 0.0,
) -> bpy.types.Object:
    half_width = width / 2
    half_height = height / 2
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(
        [
            (-half_width, 0, -half_height),
            (half_width, 0, -half_height),
            (half_width, 0, half_height),
            (-half_width, 0, half_height),
        ],
        [],
        [(0, 1, 2, 3)],
    )
    mesh.update()
    uv_layer = mesh.uv_layers.new(name="UVMap")
    uvs = ((0, 0), (1, 0), (1, 1), (0, 1))
    for polygon in mesh.polygons:
        for loop_index in polygon.loop_indices:
            uv_layer.data[loop_index].uv = uvs[mesh.loops[loop_index].vertex_index]
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler.z = rotation_z
    obj.data.materials.append(mat)
    return obj


def create_chair_v5(_name: str, _x: float, _y: float) -> None:
    # Each role-specific alpha card already contains the photoreal ergonomic chair.
    return None


def create_person_v5(
    name: str,
    x: float,
    y: float,
    _suit: bpy.types.Material,
    _hair: bpy.types.Material,
) -> None:
    texture_path = V5_TEXTURE_DIR / f"char-{name.lower()}-alpha.png"
    # A small self-lit contribution keeps skin, hands and role-specific
    # clothing readable under the strong dappled sun without flattening the
    # photographic cards into UI stickers.
    mat = image_material(f"{name} photoreal character", texture_path, alpha=True, emission_strength=0.14)
    direction = Vector((CAMERA_LOCATION[0] - x, CAMERA_LOCATION[1] - y, 0))
    desired_normal_angle = math.atan2(direction.y, direction.x)
    desired_world_rotation = desired_normal_angle + math.pi / 2
    local_rotation = desired_world_rotation - math.radians(STATION_ROTATIONS[name])
    plane = image_plane(
        f"{name} Photoreal Agent Card",
        (x, y, 1.18),
        1.72,
        1.72,
        mat,
        rotation_z=local_rotation,
    )
    plane["crewlab_character_card"] = name


def create_landscape_details_v5() -> None:
    original_landscape_details()
    centers = [
        (-8.8, 2.8, 1.05), (-7.8, -4.8, 0.96), (-4.4, 5.8, 1.12),
        (4.5, 5.9, 1.10), (8.4, 2.7, 1.02), (7.7, -4.7, 0.98),
        (-2.5, 0.9, 0.96), (2.7, 0.8, 0.98),
    ]
    base.create_leaf_cards(
        "V5 layered tropical borders",
        centers,
        count=280,
        spread=(0.72, 0.56, 0.52),
        seed=52826,
        size_range=(0.26, 0.60),
    )


def create_pavilions_v5() -> None:
    original_pavilions()
    exterior_mat = image_material("V5 exterior garden depth", EXTERIOR_PATH, alpha=False, emission_strength=0.16)
    image_plane("V5 Exterior Garden Plate", (0, 12.35, 5.6), 34.0, 12.8, exterior_mat)

    # The reference's glowing pavilion title is a major recognition cue. Keep
    # it as real scene geometry so it remains crisp in the exported GLB.
    sign_mat = base.material(
        "V5 focus sign glow",
        (0.86, 0.94, 0.82, 1),
        roughness=0.34,
        emission=(0.62, 0.92, 0.70, 1),
        emission_strength=2.4,
    )
    font_curve = bpy.data.curves.new("V5 Focus Zone sign curve", type="FONT")
    font_curve.body = "FOCUS ZONE"
    font_curve.align_x = "CENTER"
    font_curve.align_y = "CENTER"
    font_curve.size = 0.44
    font_curve.extrude = 0.012
    font_curve.bevel_depth = 0.006
    sign = bpy.data.objects.new("V5 Focus Zone sign", font_curve)
    bpy.context.collection.objects.link(sign)
    # Front face of the oak back wall is y=7.37; offset toward the camera so
    # the glyphs do not z-fight or disappear inside the wall thickness.
    sign.location = (6.86, 7.30, 3.22)
    sign.rotation_euler = (math.radians(90), 0, 0)
    sign.data.materials.append(sign_mat)


def create_lighting_and_camera_v5() -> None:
    original_lighting_and_camera()
    scene = bpy.context.scene
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.045, 0.07, 0.052, 1)
    background.inputs["Strength"].default_value = 0.24

    sun = bpy.data.objects.get("Late morning atrium sun")
    sun.data.energy = 4.15
    sun.data.angle = math.radians(1.35)
    sun.data.color = (1.0, 0.79, 0.52)

    key = bpy.data.objects.get("Warm atrium key light")
    key.data.energy = 520
    fill = bpy.data.objects.get("Cool glass fill")
    fill.data.energy = 260
    rim = bpy.data.objects.get("Pavilion rim light")
    rim.data.energy = 300

    camera = scene.camera
    camera.location = CAMERA_LOCATION
    camera.data.lens = 52
    camera.data.dof.aperture_fstop = 16.0
    camera.rotation_euler = (Vector(CAMERA_TARGET) - camera.location).to_track_quat("-Z", "Y").to_euler()


base.make_materials = make_materials_v5
base.create_chair = create_chair_v5
base.create_person = create_person_v5
base.create_landscape_details = create_landscape_details_v5
base.create_pavilions = create_pavilions_v5
base.create_lighting_and_camera = create_lighting_and_camera_v5


if __name__ == "__main__":
    os.environ.setdefault("CREWLAB_RENDER_DETAILS", "0")
    base.build_scene()

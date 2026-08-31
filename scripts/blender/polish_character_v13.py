"""Apply the CrewLab v13 premium-stylized polish pass to a seated character.

The script operates on an approved v12 Blender candidate.  It preserves the
canonical skeleton, workstation anchors and authored actions while improving
surface response and adding economical focus-camera details: eyelids, curved
brows, lips, catchlights, layered hair accents and role-specific tailoring.
"""

from __future__ import annotations

import argparse
import bmesh
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


AGENT_STYLE = {
    "A01": {"hair": "short", "glasses": False, "accent": (0.56, 0.82, 0.08, 1), "trim": (0.05, 0.08, 0.12, 1), "shoe": (0.025, 0.022, 0.020, 1)},
    "B02": {"hair": "bob", "glasses": True, "accent": (0.44, 0.88, 0.66, 1), "trim": (0.18, 0.36, 0.32, 1), "shoe": (0.30, 0.18, 0.11, 1)},
    "B03": {"hair": "short", "glasses": False, "accent": (0.28, 0.68, 0.96, 1), "trim": (0.10, 0.14, 0.20, 1), "shoe": (0.68, 0.70, 0.70, 1)},
    "D01": {"hair": "long", "glasses": False, "accent": (0.96, 0.48, 0.22, 1), "trim": (0.36, 0.14, 0.08, 1), "shoe": (0.28, 0.15, 0.09, 1)},
    "D02": {"hair": "ponytail", "glasses": False, "accent": (0.25, 0.60, 1.0, 1), "trim": (0.08, 0.16, 0.42, 1), "shoe": (0.62, 0.64, 0.64, 1)},
    "E01": {"hair": "short", "glasses": True, "accent": (0.60, 0.42, 0.96, 1), "trim": (0.06, 0.08, 0.14, 1), "shoe": (0.12, 0.055, 0.025, 1)},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", choices=sorted(AGENT_STYLE), required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--qa-output", required=True)
    parser.add_argument("--views", default="front,three-quarter,side,face")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def shader_input(shader: bpy.types.Node, name: str, value) -> None:
    socket = shader.inputs.get(name)
    if socket is not None:
        socket.default_value = value


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float,
    *,
    metallic: float = 0.0,
    coat: float = 0.0,
    sheen: float = 0.0,
) -> bpy.types.Material:
    surface = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    surface.diffuse_color = color
    surface.use_nodes = True
    shader = surface.node_tree.nodes.get("Principled BSDF")
    shader_input(shader, "Base Color", color)
    shader_input(shader, "Roughness", roughness)
    shader_input(shader, "Metallic", metallic)
    shader_input(shader, "Coat Weight", coat)
    shader_input(shader, "Sheen Weight", sheen)
    return surface


def tune_existing_materials(agent_code: str) -> dict[str, int]:
    counts = {"skin": 0, "eyes": 0, "hair": 0, "fabric": 0, "shoes": 0, "accent": 0}
    for surface in bpy.data.materials:
        if not surface.use_nodes:
            surface.use_nodes = True
        shader = surface.node_tree.nodes.get("Principled BSDF")
        if shader is None:
            continue
        name = surface.name.lower()
        if "skin" in name:
            shader_input(shader, "Roughness", 0.52)
            shader_input(shader, "Specular IOR Level", 0.28)
            shader_input(shader, "Subsurface Weight", 0.015)
            counts["skin"] += 1
        elif any(token in name for token in ("sclera", "iris", "pupil", "eye")):
            shader_input(shader, "Roughness", 0.22 if "sclera" not in name else 0.28)
            shader_input(shader, "Coat Weight", 0.10)
            counts["eyes"] += 1
        elif any(token in name for token in ("hair", "brow", "eyebrow")):
            dark_hair = (0.008, 0.012, 0.018, 1)
            surface.diffuse_color = dark_hair
            shader_input(shader, "Base Color", dark_hair)
            shader_input(shader, "Roughness", 0.56)
            shader_input(shader, "Coat Weight", 0.0)
            counts["hair"] += 1
        elif any(token in name for token in ("fabric", "top", "trouser", "shirt", "vest", "blouse", "overshirt")):
            shader_input(shader, "Roughness", 0.68)
            shader_input(shader, "Sheen Weight", 0.16)
            counts["fabric"] += 1
        elif "shoe" in name:
            shader_input(shader, "Roughness", 0.30)
            shader_input(shader, "Coat Weight", 0.12)
            counts["shoes"] += 1
        elif "accent" in name or "pin" in name:
            shader_input(shader, "Metallic", 0.42)
            shader_input(shader, "Roughness", 0.26)
            counts["accent"] += 1
    return counts


def smooth_visible_meshes() -> dict[str, int]:
    smoothed = 0
    bevelled = 0
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or obj.hide_render or obj.name.startswith("QA "):
            continue
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        smoothed += 1
        lower = obj.name.lower()
        if any(token in lower for token in ("toplayer", "overshirt", "trouser", "innershirt", "vest", "lapel")):
            if not any(modifier.type == "BEVEL" for modifier in obj.modifiers):
                bevel = obj.modifiers.new("V13 tailored edge", "BEVEL")
                bevel.width = 0.0025
                bevel.segments = 2
                bevel.limit_method = "ANGLE"
                bevelled += 1
    return {"smoothed": smoothed, "bevelled": bevelled}


def hide_rejected_hair_blocks(agent_code: str) -> list[str]:
    hidden: list[str] = []
    for obj in bpy.context.scene.objects:
        if obj.name.startswith(f"{agent_code}_TempleHair_"):
            obj.hide_render = True
            obj.hide_viewport = True
            hidden.append(obj.name)
    return hidden


def add_shoe_shell(agent_code: str, style: dict, rig: bpy.types.Object) -> list[str]:
    body = next(
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH" and obj.name.startswith("GEO-body_") and not obj.hide_render
    )
    shoe = body.copy()
    shoe.data = body.data.copy()
    shoe.name = f"{agent_code}_V13_Shoes"
    bpy.context.scene.collection.objects.link(shoe)
    shoe_surface = make_material(f"{agent_code} v13 shoe leather", style["shoe"], 0.30, coat=0.12)
    shoe.data.materials.clear()
    shoe.data.materials.append(shoe_surface)
    for polygon in shoe.data.polygons:
        polygon.material_index = 0
        polygon.use_smooth = True
    mesh = bmesh.new()
    mesh.from_mesh(shoe.data)
    bmesh.ops.delete(mesh, geom=[vertex for vertex in mesh.verts if vertex.co.z > 0.145], context="VERTS")
    mesh.to_mesh(shoe.data)
    mesh.free()
    solidify = shoe.modifiers.new("V13 shoe upper", "SOLIDIFY")
    solidify.thickness = 0.010
    solidify.offset = 1.0
    bevel = shoe.modifiers.new("V13 shoe softness", "BEVEL")
    bevel.width = 0.003
    bevel.segments = 2
    created = [shoe.name]
    foot_points = [point for point in evaluated_points(body) if point.z < 0.18]
    for suffix, side in (("L", 1), ("R", -1)):
        ankle = rig.pose.bones.get(f"Ankle{suffix}Joint")
        if ankle is None:
            raise RuntimeError(f"Missing Ankle{suffix}Joint for {agent_code}")
        side_points = [point for point in foot_points if point.x * side > 0]
        if not side_points:
            raise RuntimeError(f"Could not measure {agent_code} foot {suffix}")
        minimum = Vector(tuple(min(point[index] for point in side_points) for index in range(3)))
        maximum = Vector(tuple(max(point[index] for point in side_points) for index in range(3)))
        center = (minimum + maximum) * 0.5
        half = (maximum - minimum) * 0.5
        location = center + Vector((0.0, -0.020, 0.008))
        bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=18, radius=1.0, location=location)
        cap = bpy.context.object
        cap.name = f"{agent_code}_V13_ShoeCap_{suffix}"
        cap.scale = (
            min(max(half.x * 1.03, 0.060), 0.090),
            min(max(half.y * 1.08, 0.095), 0.145),
            min(max(half.z * 0.72, 0.032), 0.050),
        )
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        cap.data.materials.append(shoe_surface)
        for polygon in cap.data.polygons:
            polygon.use_smooth = True
        bind_current_pose(cap, rig, f"Ankle{suffix}Joint")
        created.append(cap.name)
    return created


def evaluated_bounds_center(obj: bpy.types.Object) -> Vector:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        if not points:
            return evaluated.matrix_world.translation.copy()
        minimum = Vector(tuple(min(point[index] for point in points) for index in range(3)))
        maximum = Vector(tuple(max(point[index] for point in points) for index in range(3)))
        return (minimum + maximum) * 0.5
    finally:
        evaluated.to_mesh_clear()


def evaluated_points(obj: bpy.types.Object) -> list[Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    finally:
        evaluated.to_mesh_clear()


def bind_current_pose(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    pose_bone = rig.pose.bones[bone_name]
    rest_bone = rig.data.bones[bone_name]
    deform = rig.matrix_world @ pose_bone.matrix @ rest_bone.matrix_local.inverted() @ rig.matrix_world.inverted()
    current_world = obj.matrix_world.copy()
    to_rest = deform.inverted()
    for vertex in obj.data.vertices:
        vertex.co = to_rest @ (current_world @ vertex.co)
    obj.matrix_world = Matrix.Identity(4)
    obj.parent = None
    obj.vertex_groups.clear()
    group = obj.vertex_groups.new(name=bone_name)
    group.add([vertex.index for vertex in obj.data.vertices], 1.0, "REPLACE")
    modifier = obj.modifiers.new(f"{bone_name} v13 skin", "ARMATURE")
    modifier.object = rig


def curve_mesh(
    name: str,
    points: list[Vector],
    radius: float,
    surface: bpy.types.Material,
    rig: bpy.types.Object,
    bone_name: str,
    *,
    cyclic: bool = False,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(f"{name}Curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 3
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    curve.resolution_u = 4
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    spline.use_cyclic_u = cyclic
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(surface)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    bind_current_pose(obj, rig, bone_name)
    return obj


def sphere_detail(
    name: str,
    location: Vector,
    scale: tuple[float, float, float],
    surface: bpy.types.Material,
    rig: bpy.types.Object,
    bone_name: str,
    segments: int = 20,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=max(10, segments // 2), radius=1.0, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(surface)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    bind_current_pose(obj, rig, bone_name)
    return obj


def eye_centers(agent_code: str) -> tuple[Vector, Vector]:
    left = bpy.data.objects.get(f"{agent_code}_Iris_L")
    right = bpy.data.objects.get(f"{agent_code}_Iris_R")
    if left is None or right is None:
        raise RuntimeError(f"Missing iris geometry for {agent_code}")
    return evaluated_bounds_center(left), evaluated_bounds_center(right)


def refine_eye_scale(agent_code: str) -> int:
    """Bring the large source eyes back toward premium adult proportions."""
    scaled = 0
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or obj.hide_render or not obj.name.startswith(f"{agent_code}_"):
            continue
        suffix = obj.name.removeprefix(f"{agent_code}_")
        is_eye_part = (
            suffix.startswith(("Eye_", "Iris_", "Pupil_"))
            or suffix in {"L", "R"}
        )
        if not is_eye_part or not obj.data.vertices:
            continue
        minimum = Vector(tuple(min(vertex.co[index] for vertex in obj.data.vertices) for index in range(3)))
        maximum = Vector(tuple(max(vertex.co[index] for vertex in obj.data.vertices) for index in range(3)))
        center = (minimum + maximum) * 0.5
        for vertex in obj.data.vertices:
            delta = vertex.co - center
            vertex.co = center + Vector((delta.x * 0.90, delta.y * 0.94, delta.z * 0.90))
        scaled += 1
    bpy.context.view_layer.update()
    return scaled


def body_surface_y(agent_code: str, target_z: float, half_height: float, half_width: float) -> float:
    body = next(
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH" and obj.name.startswith("GEO-body_") and not obj.hide_render
    )
    candidates = [
        point.y
        for point in evaluated_points(body)
        if abs(point.z - target_z) <= half_height and abs(point.x) <= half_width
    ]
    if not candidates:
        raise RuntimeError(f"Could not sample {agent_code} face/body surface at z={target_z}")
    return min(candidates)


def add_face_details(agent_code: str, rig: bpy.types.Object, style: dict) -> list[str]:
    left, right = eye_centers(agent_code)
    ordered = sorted((left, right), key=lambda value: value.x)
    eye_mid = (ordered[0] + ordered[1]) * 0.5
    dark = make_material(f"{agent_code} v13 brow lash", (0.010, 0.008, 0.008, 1), 0.42)
    lid = make_material(f"{agent_code} v13 eyelid", (0.23, 0.105, 0.075, 1), 0.52)
    lip = make_material(f"{agent_code} v13 lip", (0.15, 0.035, 0.030, 1), 0.54)
    catchlight = make_material(f"{agent_code} v13 eye catchlight", (0.98, 0.99, 0.96, 1), 0.12, coat=0.22)
    metal = make_material(f"{agent_code} v13 eyewear", (0.055, 0.065, 0.075, 1), 0.23, metallic=0.72, coat=0.12)
    added: list[str] = []

    for index, center in enumerate(ordered):
        suffix = "R" if index == 0 else "L"
        existing_brow = bpy.data.objects.get(f"{agent_code}_Eyebrow_{suffix}")
        if existing_brow is not None:
            existing_brow.hide_render = True
            existing_brow.hide_viewport = True
        upper = [
            center + Vector((-0.027, 0.004, 0.002)),
            center + Vector((-0.014, 0.003, 0.014)),
            center + Vector((0.000, 0.003, 0.018)),
            center + Vector((0.014, 0.003, 0.014)),
            center + Vector((0.027, 0.004, 0.002)),
        ]
        lower = [
            center + Vector((-0.022, 0.005, -0.004)),
            center + Vector((0.000, 0.005, -0.014)),
            center + Vector((0.022, 0.005, -0.004)),
        ]
        added.append(curve_mesh(f"{agent_code}_V13_UpperLid_{suffix}", upper, 0.0028, lid, rig, "HeadJoint").name)
        added.append(curve_mesh(f"{agent_code}_V13_LowerLid_{suffix}", lower, 0.0018, lid, rig, "HeadJoint").name)
        brow = [
            center + Vector((-0.031, 0.010, 0.052)),
            center + Vector((-0.015, 0.008, 0.058)),
            center + Vector((0.005, 0.008, 0.060)),
            center + Vector((0.030, 0.011, 0.050)),
        ]
        added.append(curve_mesh(f"{agent_code}_V13_Brow_{suffix}", brow, 0.0042, dark, rig, "HeadJoint").name)
        light_location = center + Vector((-0.005, -0.006, 0.007))
        added.append(
            sphere_detail(
                f"{agent_code}_V13_Catchlight_{suffix}",
                light_location,
                (0.0037, 0.0018, 0.0037),
                catchlight,
                rig,
                "HeadJoint",
                16,
            ).name
        )

    mouth_z = eye_mid.z - 0.073
    mouth_y = body_surface_y(agent_code, mouth_z, 0.018, 0.065) - 0.003
    lip_line = [
        Vector((-0.036, mouth_y + 0.001, mouth_z)),
        Vector((0.000, mouth_y - 0.001, mouth_z - 0.004)),
        Vector((0.036, mouth_y + 0.001, mouth_z)),
    ]
    added.append(curve_mesh(f"{agent_code}_V13_LipLine", lip_line, 0.0014, lip, rig, "HeadJoint").name)

    if style["glasses"]:
        for index, center in enumerate(ordered):
            suffix = "R" if index == 0 else "L"
            ellipse = [
                center
                + Vector(
                    (
                        math.cos(step / 16 * math.tau) * 0.044,
                        -0.030,
                        math.sin(step / 16 * math.tau) * 0.034,
                    )
                )
                for step in range(16)
            ]
            added.append(
                curve_mesh(
                    f"{agent_code}_V13_Glasses_{suffix}",
                    ellipse,
                    0.0022,
                    metal,
                    rig,
                    "HeadJoint",
                    cyclic=True,
                ).name
            )
        bridge = [
            ordered[0] + Vector((0.044, -0.030, 0.004)),
            eye_mid + Vector((0.000, -0.032, 0.010)),
            ordered[1] + Vector((-0.044, -0.030, 0.004)),
        ]
        added.append(curve_mesh(f"{agent_code}_V13_GlassesBridge", bridge, 0.0024, metal, rig, "HeadJoint").name)
    return added


def add_hair_accents(agent_code: str, rig: bpy.types.Object, hair_style: str) -> list[str]:
    left, right = eye_centers(agent_code)
    eye_mid = (left + right) * 0.5
    hair = make_material(f"{agent_code} v13 hair highlight", (0.018, 0.023, 0.028, 1), 0.31, coat=0.10)
    added: list[str] = []
    if hair_style in {"bob", "long"}:
        length = 0.15 if hair_style == "bob" else 0.25
        for suffix, side in (("L", 1), ("R", -1)):
            start = eye_mid + Vector((0.145 * side, 0.045, 0.165))
            middle = eye_mid + Vector((0.155 * side, 0.028, 0.020))
            end = eye_mid + Vector((0.140 * side, 0.030, -length))
            added.append(curve_mesh(f"{agent_code}_V13_SideLock_{suffix}", [start, middle, end], 0.0052, hair, rig, "HeadJoint").name)
    if hair_style == "ponytail":
        tie_surface = make_material(f"{agent_code} v13 pony tie", AGENT_STYLE[agent_code]["accent"], 0.30, metallic=0.20)
        pony = bpy.data.objects.get(f"{agent_code}_PonyBase")
        if pony is not None:
            center = evaluated_bounds_center(pony)
            bpy.ops.mesh.primitive_torus_add(major_radius=0.068, minor_radius=0.010, major_segments=28, minor_segments=10, location=center)
            tie = bpy.context.object
            tie.name = f"{agent_code}_V13_PonyTie"
            tie.data.materials.append(tie_surface)
            bind_current_pose(tie, rig, "HeadJoint")
            added.append(tie.name)
    return added


def add_tailoring(agent_code: str, rig: bpy.types.Object, style: dict) -> list[str]:
    left_eye, right_eye = eye_centers(agent_code)
    eye_mid = (left_eye + right_eye) * 0.5
    neckline_z = eye_mid.z - 0.235
    chest_y = body_surface_y(agent_code, neckline_z - 0.035, 0.065, 0.22) - 0.006
    trim = make_material(f"{agent_code} v13 tailoring", style["trim"], 0.62, sheen=0.12)
    accent = make_material(f"{agent_code} v13 role accent", style["accent"], 0.28, metallic=0.40, coat=0.08)
    seam = make_material(f"{agent_code} v13 seam", (0.035, 0.040, 0.048, 1), 0.60)
    added: list[str] = []

    collar_left = [
        Vector((-0.015, chest_y, neckline_z)),
        Vector((-0.055, chest_y - 0.003, neckline_z - 0.020)),
        Vector((-0.078, chest_y + 0.001, neckline_z - 0.055)),
    ]
    collar_right = [Vector((-point.x, point.y, point.z)) for point in collar_left]
    added.append(curve_mesh(f"{agent_code}_V13_Collar_L", collar_left, 0.0036, trim, rig, "SpineJoint").name)
    added.append(curve_mesh(f"{agent_code}_V13_Collar_R", collar_right, 0.0036, trim, rig, "SpineJoint").name)

    placket = [
        Vector((0.0, chest_y - 0.004, neckline_z - 0.04)),
        Vector((0.0, chest_y - 0.005, neckline_z - 0.16)),
        Vector((0.0, chest_y - 0.002, neckline_z - 0.28)),
    ]
    added.append(curve_mesh(f"{agent_code}_V13_Placket", placket, 0.0017, seam, rig, "SpineJoint").name)
    for index, z_offset in enumerate((-0.115, -0.185, -0.255)):
        button = sphere_detail(
            f"{agent_code}_V13_Button_{index + 1}",
            Vector((0.0, chest_y - 0.010, neckline_z + z_offset)),
            (0.0075, 0.0035, 0.0075),
            accent if index == 0 else trim,
            rig,
            "SpineJoint",
            16,
        )
        added.append(button.name)

    if agent_code == "D01":
        for suffix, side in (("L", 1), ("R", -1)):
            ear = eye_mid + Vector((0.185 * side, 0.060, -0.025))
            added.append(sphere_detail(f"{agent_code}_V13_Earring_{suffix}", ear, (0.010, 0.006, 0.014), accent, rig, "HeadJoint", 16).name)
    elif agent_code == "E01":
        tie_clip = sphere_detail(
            f"{agent_code}_V13_TieClip",
            Vector((0.0, chest_y - 0.013, neckline_z - 0.20)),
            (0.030, 0.004, 0.006),
            accent,
            rig,
            "SpineJoint",
            16,
        )
        added.append(tie_clip.name)
    return added


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def render_qa(agent_code: str, output: Path, views_csv: str) -> list[str]:
    output.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    camera = scene.camera or bpy.data.objects.get("QA camera")
    if camera is None:
        camera_data = bpy.data.cameras.new("V13 QA camera")
        camera = bpy.data.objects.new("V13 QA camera", camera_data)
        scene.collection.objects.link(camera)
        scene.camera = camera
    camera.data.lens = 62
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 8
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    if scene.world and scene.world.use_nodes:
        background = scene.world.node_tree.nodes.get("Background")
        if background:
            background.inputs["Color"].default_value = (0.78, 0.86, 0.92, 1)
            background.inputs["Strength"].default_value = 0.72

    views = {
        "front": ((0.0, -3.15, 1.03), (0.0, -0.07, 0.84)),
        "three-quarter": ((2.35, -2.55, 1.10), (0.0, -0.07, 0.86)),
        "side": ((3.20, 0.0, 1.05), (0.0, -0.02, 0.86)),
        "back": ((0.0, 3.10, 1.08), (0.0, 0.02, 0.86)),
        "face": ((0.0, -1.18, 1.39), (0.0, -0.02, 1.39)),
    }
    rendered: list[str] = []
    for view in (item.strip() for item in views_csv.split(",") if item.strip()):
        if view not in views:
            raise ValueError(f"Unknown QA view: {view}")
        camera.location = views[view][0]
        look_at(camera, Vector(views[view][1]))
        file_path = output / f"{agent_code.lower()}-v13-{view}.png"
        scene.render.filepath = str(file_path)
        bpy.ops.render.render(write_still=True)
        rendered.append(str(file_path))
        print("CREWLAB_V13_RENDER", agent_code, view, file_path)
    return rendered


def main() -> int:
    args = parse_args()
    agent_code = args.agent
    style = AGENT_STYLE[agent_code]
    rig = bpy.data.objects.get(f"{agent_code}_CharacterRoot")
    if rig is None or rig.type != "ARMATURE":
        raise RuntimeError(f"Missing canonical armature for {agent_code}")
    material_counts = tune_existing_materials(agent_code)
    smoothing = smooth_visible_meshes()
    hidden_hair = hide_rejected_hair_blocks(agent_code)
    shoes = add_shoe_shell(agent_code, style, rig)
    eyes_scaled = refine_eye_scale(agent_code)
    face = add_face_details(agent_code, rig, style)
    hair = add_hair_accents(agent_code, rig, style["hair"])
    tailoring = add_tailoring(agent_code, rig, style)

    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output), check_existing=False)
    renders = render_qa(agent_code, Path(args.qa_output).resolve(), args.views)
    payload = {
        "agent": agent_code,
        "output": str(output),
        "bones": len(rig.data.bones),
        "actions": sorted(action.name for action in bpy.data.actions),
        "anchors": sorted(obj.name for obj in bpy.context.scene.objects if obj.type == "EMPTY" and obj.get("crewlab_anchor_role")),
        "materials_tuned": material_counts,
        "smoothing": smoothing,
        "hidden_hair": hidden_hair,
        "shoe_parts": shoes,
        "eyes_scaled": eyes_scaled,
        "details": {"face": face, "hair": hair, "tailoring": tailoring},
        "renders": renders,
    }
    manifest = output.with_suffix(".v13.json")
    manifest.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("CREWLAB_V13_POLISH", json.dumps(payload))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

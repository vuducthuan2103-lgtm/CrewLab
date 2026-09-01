"""Build the CrewLab v14 character presentation layer from a v13 master.

The pass deliberately leaves the approved skeleton, seated pose, anchors and
eight state actions untouched.  It replaces the most synthetic v13 details
with quieter facial lines, tailored garment panels, ear/hand detail and more
layered role-specific hair treatment.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from polish_character_v13 import (  # noqa: E402
    AGENT_STYLE,
    body_surface_y,
    evaluated_bounds_center,
    eye_centers,
    make_material,
    shader_input,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", choices=sorted(AGENT_STYLE), required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--qa-output", required=True)
    parser.add_argument("--views", default="front,three-quarter,side,back,face")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def hide_v13_artifacts(agent_code: str) -> list[str]:
    rejected_tokens = (
        "_V13_LipLine",
        "_V13_Collar_",
        "_V13_Placket",
        "_V13_Button_",
        "_V13_SideLock_",
        "_V13_Brow_",
    )
    hidden: list[str] = []
    for obj in bpy.context.scene.objects:
        if obj.name.startswith(agent_code) and any(token in obj.name for token in rejected_tokens):
            obj.hide_render = True
            obj.hide_viewport = True
            hidden.append(obj.name)
    return hidden


def tune_materials(agent_code: str) -> dict[str, int]:
    counts = {"skin": 0, "eye": 0, "hair": 0, "fabric": 0, "leather": 0}
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        shader = material.node_tree.nodes.get("Principled BSDF")
        if shader is None:
            continue
        name = material.name.lower()
        if "skin" in name:
            shader_input(shader, "Roughness", 0.58)
            shader_input(shader, "Specular IOR Level", 0.24)
            shader_input(shader, "Subsurface Weight", 0.028)
            counts["skin"] += 1
        elif any(token in name for token in ("eye white", "iris", "pupil", "catchlight")):
            shader_input(shader, "Roughness", 0.18 if "eye white" in name else 0.12)
            shader_input(shader, "Coat Weight", 0.18)
            counts["eye"] += 1
        elif "hair" in name:
            shader_input(shader, "Roughness", 0.60)
            shader_input(shader, "Coat Weight", 0.015)
            counts["hair"] += 1
        elif any(token in name for token in ("cloth", "fabric", "shirt", "trouser", "garment", "tailoring")):
            shader_input(shader, "Roughness", 0.72)
            shader_input(shader, "Sheen Weight", 0.075)
            counts["fabric"] += 1
        elif any(token in name for token in ("shoe", "leather")):
            shader_input(shader, "Roughness", 0.34)
            shader_input(shader, "Coat Weight", 0.10)
            counts["leather"] += 1
    return counts


def parent_to_bone(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.parent_type = "BONE"
    obj.parent_bone = bone_name
    obj.matrix_world = world


def curve_parented(
    name: str,
    points: list[Vector],
    radius: float,
    material: bpy.types.Material,
    rig: bpy.types.Object,
    bone_name: str,
    *,
    cyclic: bool = False,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(f"{name}Curve", "CURVE")
    curve.dimensions = "3D"
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
    obj.data.materials.append(material)
    parent_to_bone(obj, rig, bone_name)
    return obj


def sphere_parented(
    name: str,
    location: Vector,
    scale: tuple[float, float, float],
    material: bpy.types.Material,
    rig: bpy.types.Object,
    bone_name: str,
    segments: int = 16,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=max(8, segments // 2),
        radius=1.0,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    parent_to_bone(obj, rig, bone_name)
    return obj


def add_face_refinement(agent_code: str, rig: bpy.types.Object, style: dict) -> list[str]:
    left, right = sorted(eye_centers(agent_code), key=lambda point: point.x)
    eye_mid = (left + right) * 0.5
    skin_shadow = make_material(f"{agent_code} v14 facial contour", (0.20, 0.075, 0.055, 1), 0.62)
    lip = make_material(f"{agent_code} v14 natural lip", (0.31, 0.095, 0.085, 1), 0.60)
    lip_light = make_material(f"{agent_code} v14 lower lip light", (0.50, 0.19, 0.16, 1), 0.50)
    brow = make_material(f"{agent_code} v14 brow", (0.012, 0.014, 0.018, 1), 0.50)
    added: list[str] = []

    for suffix, center in (("R", left), ("L", right)):
        eyebrow = [
            center + Vector((-0.031, -0.022, 0.050)),
            center + Vector((-0.012, -0.024, 0.058)),
            center + Vector((0.010, -0.024, 0.057)),
            center + Vector((0.031, -0.021, 0.047)),
        ]
        added.append(curve_parented(f"{agent_code}_V14_Brow_{suffix}", eyebrow, 0.0019, brow, rig, "HeadJoint").name)

    mouth_z = eye_mid.z - 0.073
    mouth_y = body_surface_y(agent_code, mouth_z, 0.020, 0.070) - 0.004
    upper_lip = [
        Vector((-0.034, mouth_y, mouth_z)),
        Vector((-0.017, mouth_y - 0.001, mouth_z + 0.002)),
        Vector((0.000, mouth_y - 0.002, mouth_z - 0.001)),
        Vector((0.017, mouth_y - 0.001, mouth_z + 0.002)),
        Vector((0.034, mouth_y, mouth_z)),
    ]
    lower_lip = [
        Vector((-0.026, mouth_y + 0.0005, mouth_z - 0.004)),
        Vector((0.000, mouth_y - 0.001, mouth_z - 0.007)),
        Vector((0.026, mouth_y + 0.0005, mouth_z - 0.004)),
    ]
    added.append(curve_parented(f"{agent_code}_V14_UpperLip", upper_lip, 0.00085, lip, rig, "HeadJoint").name)
    added.append(curve_parented(f"{agent_code}_V14_LowerLip", lower_lip, 0.00055, lip_light, rig, "HeadJoint").name)

    nose_z = eye_mid.z - 0.040
    nose_y = body_surface_y(agent_code, nose_z, 0.018, 0.035) - 0.004
    nose_shadow = [
        Vector((-0.011, nose_y, nose_z - 0.005)),
        Vector((0.000, nose_y - 0.001, nose_z - 0.009)),
        Vector((0.011, nose_y, nose_z - 0.005)),
    ]
    added.append(curve_parented(f"{agent_code}_V14_NoseContour", nose_shadow, 0.00055, skin_shadow, rig, "HeadJoint").name)

    return added


def bone_point(rig: bpy.types.Object, bone_name: str, factor: float) -> Vector:
    bone = rig.pose.bones.get(bone_name)
    if bone is None:
        raise RuntimeError(f"Missing pose bone: {bone_name}")
    return rig.matrix_world @ bone.head.lerp(bone.tail, factor)


def add_hand_details(agent_code: str, rig: bpy.types.Object) -> list[str]:
    nail = make_material(f"{agent_code} v14 nail", (0.64, 0.31, 0.27, 1), 0.48, coat=0.08)
    cuff = make_material(f"{agent_code} v14 cuff seam", AGENT_STYLE[agent_code]["trim"], 0.70)
    added: list[str] = []
    for side in ("L", "R"):
        wrist = bone_point(rig, f"Wrist{side}Joint", 0.84)
        wrist_line = [
            wrist + Vector((-0.025, -0.002, 0.006)),
            wrist + Vector((0.000, -0.004, 0.000)),
            wrist + Vector((0.025, -0.002, -0.006)),
        ]
        added.append(curve_parented(f"{agent_code}_V14_Cuff_{side}", wrist_line, 0.0014, cuff, rig, f"Wrist{side}Joint").name)
        for digit in ("Thumb", "Index", "Middle", "Ring", "Little"):
            bone_name = f"{digit}{side}Joint"
            tip = bone_point(rig, bone_name, 0.88)
            detail = sphere_parented(
                f"{agent_code}_V14_Nail_{digit}{side}",
                tip + Vector((0.0, -0.002, 0.001)),
                (0.0045, 0.0016, 0.0075),
                nail,
                rig,
                bone_name,
                12,
            )
            added.append(detail.name)
    return added


def add_garment_construction(agent_code: str, rig: bpy.types.Object, style: dict) -> list[str]:
    left_eye, right_eye = eye_centers(agent_code)
    eye_mid = (left_eye + right_eye) * 0.5
    neck_z = eye_mid.z - 0.225
    chest_y = body_surface_y(agent_code, neck_z - 0.075, 0.085, 0.235) - 0.009
    trim = make_material(f"{agent_code} v14 garment edge", style["trim"], 0.73, sheen=0.06)
    accent = make_material(f"{agent_code} v14 role mark", style["accent"], 0.34, metallic=0.28, coat=0.05)
    added: list[str] = []

    neckline = [
        Vector((-0.105, chest_y, neck_z - 0.020)),
        Vector((-0.055, chest_y - 0.002, neck_z - 0.050)),
        Vector((0.000, chest_y - 0.003, neck_z - 0.062)),
        Vector((0.055, chest_y - 0.002, neck_z - 0.050)),
        Vector((0.105, chest_y, neck_z - 0.020)),
    ]
    added.append(curve_parented(f"{agent_code}_V14_Neckline", neckline, 0.0019, trim, rig, "SpineJoint").name)
    if agent_code in {"A01", "B02", "E01"}:
        placket = [
            Vector((0.0, chest_y - 0.003, neck_z - 0.060)),
            Vector((0.0, chest_y - 0.004, neck_z - 0.135)),
            Vector((0.0, chest_y - 0.003, neck_z - 0.205)),
        ]
        added.append(curve_parented(f"{agent_code}_V14_Placket", placket, 0.0011, trim, rig, "SpineJoint").name)

    badge = sphere_parented(
        f"{agent_code}_V14_RoleBadge",
        Vector((0.115, chest_y - 0.006, neck_z - 0.115)),
        (0.0085, 0.0030, 0.0085),
        accent,
        rig,
        "SpineJoint",
        16,
    )
    added.append(badge.name)
    return added


def add_hair_layers(agent_code: str, rig: bpy.types.Object, hair_style: str) -> list[str]:
    left, right = eye_centers(agent_code)
    eye_mid = (left + right) * 0.5
    hair = make_material(f"{agent_code} v14 hair layers", (0.009, 0.014, 0.020, 1), 0.58, coat=0.015)
    accent = make_material(f"{agent_code} v14 hair accessory", AGENT_STYLE[agent_code]["accent"], 0.38, metallic=0.12)
    added: list[str] = []

    if hair_style in {"bob", "long"}:
        drop = 0.16 if hair_style == "bob" else 0.27
        for suffix, side in (("L", 1), ("R", -1)):
            outer = [
                eye_mid + Vector((0.135 * side, 0.035, 0.135)),
                eye_mid + Vector((0.154 * side, 0.020, 0.045)),
                eye_mid + Vector((0.150 * side, 0.018, -drop)),
            ]
            inner = [
                eye_mid + Vector((0.108 * side, -0.002, 0.110)),
                eye_mid + Vector((0.126 * side, -0.010, 0.015)),
                eye_mid + Vector((0.120 * side, -0.008, -drop * 0.88)),
            ]
            added.append(curve_parented(f"{agent_code}_V14_HairOuter_{suffix}", outer, 0.0065, hair, rig, "HeadJoint").name)
            added.append(curve_parented(f"{agent_code}_V14_HairInner_{suffix}", inner, 0.0040, hair, rig, "HeadJoint").name)
    elif hair_style == "ponytail":
        pony = bpy.data.objects.get(f"{agent_code}_PonyBase")
        if pony is not None:
            # The rigged pony mesh keeps its object origin at world zero; use
            # evaluated geometry bounds or accessory layers end up on the floor.
            center = evaluated_bounds_center(pony)
            for index, (offset, scale) in enumerate(
                (
                    (Vector((0.0, 0.010, -0.020)), (0.080, 0.055, 0.105)),
                    (Vector((0.0, 0.015, -0.125)), (0.068, 0.050, 0.095)),
                    (Vector((0.0, 0.020, -0.215)), (0.050, 0.042, 0.075)),
                )
            ):
                added.append(
                    sphere_parented(
                        f"{agent_code}_V14_PonyLayer_{index + 1}",
                        center + offset,
                        scale,
                        hair,
                        rig,
                        "HeadJoint",
                        24,
                    ).name
                )
            added.append(
                sphere_parented(
                    f"{agent_code}_V14_PonyBand",
                    center + Vector((0.0, -0.004, 0.060)),
                    (0.060, 0.018, 0.020),
                    accent,
                    rig,
                    "HeadJoint",
                    20,
                ).name
            )
    return added


def refine_existing_hair(agent_code: str, rig: bpy.types.Object) -> list[str]:
    """Keep the approved rigged base hair; v14 adds only lightweight strand detail."""
    return []


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def render_qa(agent_code: str, output: Path, views_csv: str) -> list[str]:
    output.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    camera = bpy.data.objects.get("CrewLabV13QACamera")
    if camera is None:
        bpy.ops.object.camera_add(location=(0.0, -3.1, 1.05))
        camera = bpy.context.object
    camera.name = "CrewLabV14QACamera"
    camera.data.lens = 68
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 8
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    if scene.world and scene.world.use_nodes:
        background = scene.world.node_tree.nodes.get("Background")
        if background:
            background.inputs["Color"].default_value = (0.72, 0.79, 0.84, 1)
            background.inputs["Strength"].default_value = 0.62

    views = {
        "front": ((0.0, -3.00, 1.08), (0.0, -0.04, 0.91)),
        "three-quarter": ((2.20, -2.42, 1.14), (0.0, -0.04, 0.92)),
        "side": ((3.05, -0.05, 1.12), (0.0, -0.02, 0.92)),
        "back": ((0.0, 3.00, 1.10), (0.0, 0.02, 0.92)),
        "face": ((0.0, -1.24, 1.40), (0.0, -0.015, 1.36)),
    }
    rendered: list[str] = []
    for view in (item.strip() for item in views_csv.split(",") if item.strip()):
        if view not in views:
            raise ValueError(f"Unknown QA view: {view}")
        camera.location = views[view][0]
        look_at(camera, Vector(views[view][1]))
        file_path = output / f"{agent_code.lower()}-v14-{view}.png"
        scene.render.filepath = str(file_path)
        bpy.ops.render.render(write_still=True)
        rendered.append(str(file_path))
        print("CREWLAB_V14_RENDER", agent_code, view, file_path)
    return rendered


def main() -> int:
    args = parse_args()
    agent_code = args.agent
    style = AGENT_STYLE[agent_code]
    rig = bpy.data.objects.get(f"{agent_code}_CharacterRoot")
    if rig is None or rig.type != "ARMATURE":
        raise RuntimeError(f"Missing canonical armature for {agent_code}")

    payload = {
        "agent": agent_code,
        "hidden_v13": hide_v13_artifacts(agent_code),
        "materials": tune_materials(agent_code),
        "eyes": "v13 approved scale preserved",
        "face": add_face_refinement(agent_code, rig, style),
        "hands": "v13 five-finger mesh preserved; rejected floating nail pass removed",
        "garment": add_garment_construction(agent_code, rig, style),
        "hair_base": refine_existing_hair(agent_code, rig),
        "hair": add_hair_layers(agent_code, rig, style["hair"]),
        "bones": len(rig.data.bones),
        "actions": sorted(action.name for action in bpy.data.actions),
        "anchors": sorted(
            obj.name
            for obj in bpy.context.scene.objects
            if obj.type == "EMPTY" and obj.get("crewlab_anchor_role")
        ),
    }

    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output), check_existing=False)
    payload["renders"] = render_qa(agent_code, Path(args.qa_output).resolve(), args.views)
    output.with_suffix(".v14.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("CREWLAB_V14_POLISH", json.dumps(payload))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

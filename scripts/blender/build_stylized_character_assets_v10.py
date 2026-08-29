"""Build six stable, articulated stylized-realism CrewLab character GLBs.

The assets use a rigid joint hierarchy instead of fragile imported skin
weights. Overlapping rounded meshes hide the joints at office-view distance,
while named pivots remain available to React Three Fiber for state animation.
"""

from __future__ import annotations

import argparse
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import bpy
from mathutils import Vector


@dataclass(frozen=True)
class Style:
    code: str
    skin: str
    hair: str
    outer: str
    shirt: str
    trousers: str
    shoes: str
    accent: str
    hair_style: str
    outfit: str
    build: float


STYLES = (
    Style("A01", "D69B78", "211915", "52665C", "F2EFE8", "34413B", "181D1B", "D8FF4F", "side_part", "suit", 1.03),
    Style("B02", "EDB28F", "241C1A", "3E7F7B", "FBF5EC", "E8DFD1", "CDBB9F", "78E2D6", "bob", "blazer", 0.94),
    Style("B03", "C98B69", "191615", "E9E4DA", "E9E4DA", "4B5158", "F0EDE7", "6DD3C7", "textured", "polo", 1.00),
    Style("D01", "E5A784", "34211C", "C26849", "F8E3D5", "E9DFD2", "694033", "FFB18C", "long", "blouse", 0.96),
    Style("D02", "D99B78", "271D1A", "426EAA", "F2F5FA", "315786", "EDF1F5", "67C7FF", "ponytail", "designer", 0.93),
    Style("E01", "CF9472", "1E1D1C", "29364B", "F3F4F4", "2C3547", "452A22", "9CB3D6", "crop", "waistcoat", 1.05),
)


def rgba(value: str) -> tuple[float, float, float, float]:
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4)) + (1.0,)


def material(name: str, color: str, roughness: float = 0.58, metallic: float = 0.0) -> bpy.types.Material:
    result = bpy.data.materials.new(name)
    result.diffuse_color = rgba(color)
    result.use_nodes = True
    principled = result.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = rgba(color)
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    return result


def keep_world_parent(child: bpy.types.Object, parent: bpy.types.Object | None) -> None:
    if parent is None:
        return
    world = child.matrix_world.copy()
    child.parent = parent
    child.matrix_world = world


def empty(name: str, location: tuple[float, float, float], parent: bpy.types.Object | None = None) -> bpy.types.Object:
    result = bpy.data.objects.new(name, None)
    result.empty_display_type = "PLAIN_AXES"
    result.empty_display_size = 0.055
    result.location = location
    bpy.context.collection.objects.link(result)
    keep_world_parent(result, parent)
    return result


def smooth(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    parent: bpy.types.Object | None = None,
    segments: int = 24,
    rings: int = 16,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    smooth(obj)
    keep_world_parent(obj, parent)
    return obj


def rounded_box(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    radius: float,
    mat: bpy.types.Material,
    parent: bpy.types.Object | None = None,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("Soft tailoring", "BEVEL")
    bevel.width = radius
    bevel.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.data.materials.append(mat)
    smooth(obj)
    keep_world_parent(obj, parent)
    return obj


def segment(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    mat: bpy.types.Material,
    parent: bpy.types.Object | None,
    end_caps: bool = True,
) -> bpy.types.Object:
    a = Vector(start)
    b = Vector(end)
    direction = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=direction.length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    obj.data.materials.append(mat)
    smooth(obj)
    keep_world_parent(obj, parent)
    if end_caps:
        sphere(f"{name}_cap_a", start, (radius, radius, radius), mat, parent, 18, 12)
        sphere(f"{name}_cap_b", end, (radius, radius, radius), mat, parent, 18, 12)
    return obj


def face(style: Style, head: bpy.types.Object, mats: dict[str, bpy.types.Material]) -> None:
    head_center = Vector((0, -0.012, 1.455))
    sphere("HeadMesh", head_center, (0.158, 0.142, 0.205), mats["skin"], head, 32, 22)
    sphere("EarL", (-0.162, -0.006, 1.455), (0.027, 0.023, 0.048), mats["skin"], head, 16, 10)
    sphere("EarR", (0.162, -0.006, 1.455), (0.027, 0.023, 0.048), mats["skin"], head, 16, 10)
    for side in (-1, 1):
        x = side * 0.055
        sphere(f"EyeWhite_{side}", (x, -0.143, 1.478), (0.032, 0.012, 0.018), mats["eye"], head, 18, 10)
        sphere(f"Iris_{side}", (x, -0.153, 1.478), (0.012, 0.006, 0.012), mats["iris"], head, 16, 8)
        rounded_box(f"Brow_{side}", (x, -0.151, 1.53), (0.043, 0.006, 0.006), 0.004, mats["hair"], head, (0, side * 0.03, side * -0.10))
    sphere("Nose", (0, -0.158, 1.432), (0.025, 0.026, 0.038), mats["skin_shadow"], head, 18, 10)
    rounded_box("Mouth", (0, -0.154, 1.372), (0.046, 0.006, 0.008), 0.005, mats["lip"], head)

    # Hair is layered from rounded clumps, which reads better than a single cap
    # and gives each role a distinct silhouette in the wide office camera.
    sphere("HairCap", (0, 0.014, 1.565), (0.168, 0.149, 0.123), mats["hair"], head, 28, 18)
    if style.hair_style in {"side_part", "crop", "textured"}:
        for index, x in enumerate((-0.11, -0.055, 0.0, 0.055, 0.11)):
            z = 1.615 + (0.018 if index in (1, 2) else 0)
            sphere(f"HairClump_{index}", (x, -0.055 + abs(x) * 0.18, z), (0.061, 0.058, 0.052), mats["hair"], head, 18, 12)
        if style.hair_style == "side_part":
            rounded_box("SideFringe", (-0.08, -0.132, 1.56), (0.105, 0.025, 0.045), 0.018, mats["hair"], head, (0.12, 0.0, -0.24))
    if style.hair_style == "bob":
        for side in (-1, 1):
            rounded_box(f"BobSide_{side}", (side * 0.145, 0.0, 1.43), (0.048, 0.11, 0.19), 0.034, mats["hair"], head, (0, 0, side * 0.03))
        rounded_box("BobBack", (0, 0.10, 1.43), (0.145, 0.055, 0.17), 0.04, mats["hair"], head)
    if style.hair_style == "long":
        rounded_box("LongHairBack", (0, 0.085, 1.30), (0.16, 0.055, 0.30), 0.045, mats["hair"], head)
        for side in (-1, 1):
            segment(f"LongLock_{side}", (side * 0.13, -0.025, 1.48), (side * 0.15, -0.06, 1.20), 0.036, mats["hair"], head)
    if style.hair_style == "ponytail":
        sphere("PonyBase", (0, 0.145, 1.51), (0.075, 0.075, 0.08), mats["hair"], head, 20, 14)
        segment("Ponytail", (0, 0.17, 1.48), (0.03, 0.22, 1.20), 0.05, mats["hair"], head)


def hand(name: str, wrist: tuple[float, float, float], side: int, joint: bpy.types.Object, mats: dict[str, bpy.types.Material]) -> None:
    palm = Vector(wrist) + Vector((0, -0.025, -0.012))
    rounded_box(f"{name}_Palm", palm, (0.055, 0.072, 0.025), 0.018, mats["skin"], joint, (math.radians(8), 0, side * math.radians(5)))
    for index in range(4):
        x = palm.x + side * (-0.033 + index * 0.021)
        start = (x, palm.y - 0.050, palm.z - 0.002)
        end = (x + side * 0.004, palm.y - 0.096 - index * 0.002, palm.z - 0.008)
        segment(f"{name}_Finger_{index}", start, end, 0.008, mats["skin"], joint, False)
    thumb_start = (palm.x + side * 0.05, palm.y - 0.005, palm.z)
    thumb_end = (palm.x + side * 0.072, palm.y - 0.045, palm.z - 0.008)
    segment(f"{name}_Thumb", thumb_start, thumb_end, 0.010, mats["skin"], joint, False)


def build_character(style: Style) -> bpy.types.Object:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for item in tuple(block):
            if item.users == 0:
                block.remove(item)

    mats = {
        "skin": material(f"{style.code}_Skin", style.skin, 0.58),
        "skin_shadow": material(f"{style.code}_SkinShadow", "C98769", 0.60),
        "hair": material(f"{style.code}_Hair", style.hair, 0.72),
        "outer": material(f"{style.code}_Outer", style.outer, 0.50),
        "shirt": material(f"{style.code}_Shirt", style.shirt, 0.62),
        "trousers": material(f"{style.code}_Trousers", style.trousers, 0.58),
        "shoes": material(f"{style.code}_Shoes", style.shoes, 0.36),
        "accent": material(f"{style.code}_Accent", style.accent, 0.38, 0.08),
        "eye": material(f"{style.code}_EyeWhite", "F7F4EE", 0.34),
        "iris": material(f"{style.code}_Iris", "18211F", 0.28),
        "lip": material(f"{style.code}_Lip", "965852", 0.62),
        "sole": material(f"{style.code}_Sole", "D7D9D5", 0.62),
    }

    root = empty(f"{style.code}_CharacterRoot", (0, 0, 0))
    root["agentCode"] = style.code
    root["assetVersion"] = "v10"
    pelvis = empty("PelvisJoint", (0, 0, 0.62), root)
    spine = empty("SpineJoint", (0, 0, 0.72), pelvis)
    head_joint = empty("HeadJoint", (0, 0, 1.29), spine)

    shoulder_l = empty("ShoulderLJoint", (-0.19, 0, 1.18), spine)
    elbow_l = empty("ElbowLJoint", (-0.245, -0.20, 0.96), shoulder_l)
    wrist_l = empty("WristLJoint", (-0.145, -0.43, 0.83), elbow_l)
    shoulder_r = empty("ShoulderRJoint", (0.19, 0, 1.18), spine)
    elbow_r = empty("ElbowRJoint", (0.245, -0.20, 0.96), shoulder_r)
    wrist_r = empty("WristRJoint", (0.145, -0.43, 0.83), elbow_r)

    hip_l = empty("HipLJoint", (-0.13, 0, 0.63), pelvis)
    knee_l = empty("KneeLJoint", (-0.16, -0.34, 0.57), hip_l)
    ankle_l = empty("AnkleLJoint", (-0.16, -0.40, 0.13), knee_l)
    hip_r = empty("HipRJoint", (0.13, 0, 0.63), pelvis)
    knee_r = empty("KneeRJoint", (0.16, -0.34, 0.57), hip_r)
    ankle_r = empty("AnkleRJoint", (0.16, -0.40, 0.13), knee_r)

    build = style.build
    rounded_box("Pelvis", (0, 0, 0.66), (0.205 * build, 0.12, 0.105), 0.07, mats["trousers"], pelvis)
    rounded_box("Torso", (0, 0.005, 0.98), (0.215 * build, 0.118, 0.285), 0.075, mats["outer"], spine)
    rounded_box("ShirtFront", (0, -0.121, 1.025), (0.095, 0.012, 0.215), 0.012, mats["shirt"], spine)
    segment("Neck", (0, 0, 1.245), (0, 0, 1.34), 0.055, mats["skin"], head_joint)

    if style.outfit in {"suit", "blazer", "designer", "waistcoat"}:
        rounded_box("LapelL", (-0.058, -0.143, 1.07), (0.045, 0.012, 0.17), 0.01, mats["outer"], spine, (0, 0, math.radians(-17)))
        rounded_box("LapelR", (0.058, -0.143, 1.07), (0.045, 0.012, 0.17), 0.01, mats["outer"], spine, (0, 0, math.radians(17)))
    if style.outfit == "suit":
        rounded_box("Tie", (0, -0.151, 1.02), (0.026, 0.009, 0.16), 0.006, mats["accent"], spine)
    if style.outfit == "polo":
        rounded_box("PoloCollar", (0, -0.143, 1.17), (0.11, 0.014, 0.035), 0.01, mats["accent"], spine)
    if style.outfit in {"blouse", "waistcoat"}:
        for index, z in enumerate((0.90, 0.99, 1.08)):
            sphere(f"Button_{index}", (0, -0.151, z), (0.011, 0.007, 0.011), mats["accent"], spine, 12, 8)
    rounded_box("Belt", (0, -0.005, 0.72), (0.205, 0.125, 0.025), 0.012, mats["hair"], pelvis)
    rounded_box("Buckle", (0, -0.134, 0.72), (0.035, 0.008, 0.027), 0.006, mats["accent"], pelvis)

    face(style, head_joint, mats)

    segment("UpperArmL", tuple(shoulder_l.matrix_world.translation), tuple(elbow_l.matrix_world.translation), 0.062 * build, mats["outer"], shoulder_l)
    segment("ForearmL", elbow_l.matrix_world.translation, wrist_l.matrix_world.translation, 0.050 * build, mats["shirt"], elbow_l)
    segment("UpperArmR", tuple(shoulder_r.matrix_world.translation), tuple(elbow_r.matrix_world.translation), 0.062 * build, mats["outer"], shoulder_r)
    segment("ForearmR", elbow_r.matrix_world.translation, wrist_r.matrix_world.translation, 0.050 * build, mats["shirt"], elbow_r)
    hand("HandL", tuple(wrist_l.matrix_world.translation), -1, wrist_l, mats)
    hand("HandR", tuple(wrist_r.matrix_world.translation), 1, wrist_r, mats)

    for side, hip, knee, ankle in (("L", hip_l, knee_l, ankle_l), ("R", hip_r, knee_r, ankle_r)):
        segment(f"Thigh{side}", tuple(hip.matrix_world.translation), tuple(knee.matrix_world.translation), 0.082 * build, mats["trousers"], hip)
        segment(f"Calf{side}", tuple(knee.matrix_world.translation), tuple(ankle.matrix_world.translation), 0.070 * build, mats["trousers"], knee)
        x = ankle.matrix_world.translation.x
        rounded_box(f"Shoe{side}", (x, -0.50, 0.095), (0.085 * build, 0.16, 0.052), 0.035, mats["shoes"], ankle, (math.radians(-4), 0, 0))
        rounded_box(f"Sole{side}", (x, -0.51, 0.052), (0.088 * build, 0.165, 0.014), 0.008, mats["sole"], ankle)

    # Author base joint transforms as explicit custom properties for runtime QA.
    for joint in (pelvis, spine, head_joint, shoulder_l, elbow_l, wrist_l, shoulder_r, elbow_r, wrist_r, hip_l, knee_l, ankle_l, hip_r, knee_r, ankle_r):
        joint["crewlabJoint"] = True
    return root


def export_character(root: bpy.types.Object, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=False,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )
    print("CHARACTER_GLB", root.get("agentCode"), output, output.stat().st_size)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    for style in STYLES:
        root = build_character(style)
        export_character(root, output / f"{style.code.lower()}.glb")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

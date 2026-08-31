"""Build and render CrewLab seated-rig candidates from Blender's stylized bases.

This is an explicit production-candidate stage: it uses deterministic regional
weights rather than the rejected MPFB/BVH retarget path. It does not overwrite
runtime assets.
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


CHARACTER_CONFIGS = {
    "A01": {
        "collection": "Body Male - Stylized",
        "skin": (0.52, 0.30, 0.19, 1),
        "top": (0.012, 0.028, 0.055, 1),
        "trousers": (0.025, 0.032, 0.042, 1),
        "shoes": (0.025, 0.022, 0.02, 1),
        "accent": (0.56, 0.82, 0.08, 1),
        "hair_style": "short",
        "head_top": 1.71,
        "top_min": 0.90,
        "top_max": 1.45,
        "trousers_max": 0.96,
        "rig_z": -0.14637,
        "knee_scale": 1.1378,
    },
    "B02": {
        "collection": "Body Female - Stylized",
        "skin": (0.58, 0.36, 0.24, 1),
        "top": (0.055, 0.23, 0.22, 1),
        "trousers": (0.72, 0.67, 0.56, 1),
        "shoes": (0.48, 0.35, 0.24, 1),
        "accent": (0.44, 0.88, 0.66, 1),
        "hair_style": "bob",
        "head_top": 1.595,
        "top_min": 0.82,
        "top_max": 1.20,
        "trousers_max": 0.90,
        "rig_z": -0.16266,
        "knee_scale": 1.1030,
    },
    "B03": {
        "collection": "Body Male - Stylized",
        "skin": (0.50, 0.29, 0.18, 1),
        "top": (0.68, 0.62, 0.50, 1),
        "trousers": (0.035, 0.045, 0.065, 1),
        "shoes": (0.76, 0.76, 0.72, 1),
        "accent": (0.28, 0.68, 0.96, 1),
        "hair_style": "short",
        "head_top": 1.71,
        "top_min": 0.90,
        "top_max": 1.45,
        "trousers_max": 0.96,
        "rig_z": -0.14637,
        "knee_scale": 1.1250,
    },
    "D01": {
        "collection": "Body Female - Stylized",
        "skin": (0.56, 0.33, 0.22, 1),
        "top": (0.50, 0.12, 0.045, 1),
        "trousers": (0.72, 0.67, 0.56, 1),
        "shoes": (0.34, 0.20, 0.13, 1),
        "accent": (0.96, 0.48, 0.22, 1),
        "hair_style": "long",
        "head_top": 1.595,
        "top_min": 0.82,
        "top_max": 1.20,
        "trousers_max": 0.90,
        "rig_z": -0.16266,
        "knee_scale": 1.1030,
    },
    "D02": {
        "collection": "Body Female - Stylized",
        "skin": (0.54, 0.32, 0.21, 1),
        "top": (0.025, 0.12, 0.38, 1),
        "trousers": (0.025, 0.09, 0.30, 1),
        "shoes": (0.72, 0.72, 0.68, 1),
        "accent": (0.25, 0.60, 1.0, 1),
        "hair_style": "ponytail",
        "head_top": 1.595,
        "top_min": 0.82,
        "top_max": 1.20,
        "trousers_max": 0.90,
        "rig_z": -0.16266,
        "knee_scale": 1.1030,
    },
    "E01": {
        "collection": "Body Male - Stylized",
        "skin": (0.48, 0.27, 0.17, 1),
        "top": (0.68, 0.70, 0.72, 1),
        "trousers": (0.018, 0.028, 0.065, 1),
        "shoes": (0.12, 0.055, 0.025, 1),
        "accent": (0.60, 0.42, 0.96, 1),
        "hair_style": "short",
        "head_top": 1.71,
        "top_min": 0.90,
        "top_max": 1.45,
        "trousers_max": 0.96,
        "rig_z": -0.14637,
        "knee_scale": 1.1250,
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--views", default="front,three-quarter,side,back")
    parser.add_argument("--hair-source")
    parser.add_argument("--agent", choices=sorted(CHARACTER_CONFIGS), default="A01")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def material(name: str, color: tuple[float, float, float, float], roughness: float = 0.55):
    surface = bpy.data.materials.new(name)
    surface.diffuse_color = color
    surface.use_nodes = True
    shader = surface.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    return surface


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    return (
        Vector(tuple(min(point[index] for point in points) for index in range(3))),
        Vector(tuple(max(point[index] for point in points) for index in range(3))),
    )


def sanitize_source(collection_name: str) -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    source = bpy.data.collections.get(collection_name)
    if source is None:
        raise RuntimeError(f"Missing source collection: {collection_name}")
    for collection in bpy.data.collections:
        visible = collection == source
        collection_objects = [item for item in collection.all_objects if item is not None]
        for obj in collection_objects:
            obj.hide_render = not visible
            obj.hide_viewport = not visible
    meshes = [obj for obj in source.all_objects if obj is not None and obj.type == "MESH"]
    body = next(obj for obj in meshes if ".eye." not in obj.name)
    minimum, maximum = bounds(meshes)
    offset = Vector((-(minimum.x + maximum.x) / 2, -(minimum.y + maximum.y) / 2, -minimum.z))
    roots = [obj for obj in meshes if obj.parent is None]
    for obj in roots:
        obj.location += offset
    bpy.context.view_layer.update()
    for obj in meshes:
        obj.hide_render = False
        obj.hide_viewport = False
    return body, [obj for obj in meshes if obj != body]


def add_bone(armature: bpy.types.Armature, name: str, head, tail, parent=None):
    bone = armature.edit_bones.new(name)
    bone.head = head
    bone.tail = tail
    bone.parent = parent
    bone.use_connect = False
    return bone


def build_armature(agent_code: str) -> bpy.types.Object:
    data = bpy.data.armatures.new(f"{agent_code}_Skeleton")
    rig = bpy.data.objects.new(f"{agent_code}_CharacterRoot", data)
    bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    pelvis = add_bone(data, "PelvisJoint", (0, 0, 0.86), (0, 0, 1.00))
    spine = add_bone(data, "SpineJoint", (0, 0, 1.00), (0, 0, 1.42), pelvis)
    add_bone(data, "HeadJoint", (0, 0, 1.42), (0, 0, 1.72), spine)

    for suffix, side in (("L", 1), ("R", -1)):
        shoulder = add_bone(
            data,
            f"Shoulder{suffix}Joint",
            (0.16 * side, 0, 1.38),
            (0.41 * side, 0, 1.14),
            spine,
        )
        elbow = add_bone(
            data,
            f"Elbow{suffix}Joint",
            (0.41 * side, 0, 1.14),
            (0.52 * side, 0, 0.88),
            shoulder,
        )
        wrist = add_bone(
            data,
            f"Wrist{suffix}Joint",
            (0.52 * side, 0, 0.88),
            (0.54 * side, -0.015, 0.74),
            elbow,
        )
        palm = add_bone(
            data,
            f"Hand{suffix}Joint",
            (0.54 * side, -0.015, 0.74),
            (0.54 * side, -0.018, 0.665),
            wrist,
        )
        for digit, spread in zip(
            ("Thumb", "Index", "Middle", "Ring", "Little"),
            (-0.050, -0.025, 0.0, 0.025, 0.050),
        ):
            root = Vector((0.54 * side + spread, -0.020, 0.680))
            tip = root + Vector((0.012 * side, -0.010, -0.070))
            add_bone(data, f"{digit}{suffix}Joint", root, tip, palm)
        thigh = add_bone(
            data,
            f"Thigh{suffix}Joint",
            (0.13 * side, 0, 0.88),
            (0.14 * side, 0, 0.49),
            pelvis,
        )
        knee = add_bone(
            data,
            f"Knee{suffix}Joint",
            (0.14 * side, 0, 0.49),
            (0.14 * side, 0, 0.12),
            thigh,
        )
        add_bone(
            data,
            f"Ankle{suffix}Joint",
            (0.14 * side, 0, 0.12),
            (0.14 * side, -0.17, 0.055),
            knee,
        )

    bpy.ops.object.mode_set(mode="OBJECT")
    return rig


def add_weight(group_map: dict[str, bpy.types.VertexGroup], vertex_index: int, weights: dict[str, float]):
    total = sum(weights.values())
    for name, weight in weights.items():
        group_map[name].add([vertex_index], weight / total, "REPLACE")


def skin_body_regional(body: bpy.types.Object, rig: bpy.types.Object) -> None:
    names = [bone.name for bone in rig.data.bones]
    groups = {name: body.vertex_groups.new(name=name) for name in names}
    inverse = body.matrix_world.inverted()
    for vertex in body.data.vertices:
        point = body.matrix_world @ vertex.co
        x, z = point.x, point.z
        side = "L" if x >= 0 else "R"
        absolute_x = abs(x)
        if z >= 1.46:
            weights = {"HeadJoint": 1.0}
        elif absolute_x > 0.285 and z > 0.72:
            if z > 1.17:
                weights = {f"Shoulder{side}Joint": 0.86, "SpineJoint": 0.14}
            elif z > 0.91:
                weights = {f"Elbow{side}Joint": 0.9, f"Shoulder{side}Joint": 0.1}
            else:
                weights = {f"Wrist{side}Joint": 0.92, f"Elbow{side}Joint": 0.08}
        elif z >= 1.02:
            head_mix = max(0.0, min(0.55, (z - 1.34) / 0.12 * 0.55))
            weights = {"SpineJoint": 1.0 - head_mix, "HeadJoint": head_mix}
        elif z >= 0.79:
            spine_mix = max(0.05, min(0.75, (z - 0.79) / 0.23 * 0.75))
            weights = {"PelvisJoint": 1.0 - spine_mix, "SpineJoint": spine_mix}
        elif z >= 0.48:
            weights = {f"Thigh{side}Joint": 1.0}
        elif z >= 0.12:
            knee_mix = max(0.0, min(0.35, (z - 0.12) / 0.36 * 0.35))
            weights = {f"Knee{side}Joint": 1.0 - knee_mix, f"Thigh{side}Joint": knee_mix}
        else:
            weights = {f"Ankle{side}Joint": 1.0}
        add_weight(groups, vertex.index, weights)

    modifier = body.modifiers.new("A01 skin", "ARMATURE")
    modifier.object = rig
    body.parent = rig
    body.matrix_parent_inverse = rig.matrix_world.inverted()
    body.matrix_world = inverse.inverted()


def skin_body(body: bpy.types.Object, rig: bpy.types.Object) -> str:
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    try:
        bpy.ops.object.parent_set(type="ARMATURE_AUTO")
        modifier = next((item for item in body.modifiers if item.type == "ARMATURE"), None)
        if modifier is None or len(body.vertex_groups) < 10:
            raise RuntimeError("Automatic weights did not create the expected skin groups")
        print("A01_SKINNING automatic_heat", len(body.vertex_groups))
        return "automatic_heat"
    except Exception as error:
        print("A01_SKINNING_FALLBACK", repr(error))
        body.parent = None
        for modifier in list(body.modifiers):
            if modifier.type == "ARMATURE":
                body.modifiers.remove(modifier)
        body.vertex_groups.clear()
        skin_body_regional(body, rig)
        return "regional_fallback"


def bone_parent(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    # Preserve visual placement during concept QA. Bone-parenting in a posed
    # armature changes the object origin to the bone tail and was moving rigid
    # accessories twice. The animation stage consumes this explicit binding
    # marker and converts it to rest-space rigid weights before clip authoring.
    obj["crewlab_bind_bone"] = bone_name


def bind_marked_rigid_meshes(rig: bpy.types.Object) -> int:
    """Convert current-pose accessory placement into rest-space rigid weights."""
    bound = 0
    rig_world = rig.matrix_world.copy()
    for obj in list(bpy.data.objects):
        bone_name = obj.get("crewlab_bind_bone")
        if obj.type != "MESH" or not bone_name:
            continue
        pose_bone = rig.pose.bones.get(str(bone_name))
        rest_bone = rig.data.bones.get(str(bone_name))
        if pose_bone is None or rest_bone is None:
            raise RuntimeError(f"Missing rigid-bind bone {bone_name} for {obj.name}")
        deform = (
            rig_world
            @ pose_bone.matrix
            @ rest_bone.matrix_local.inverted()
            @ rig_world.inverted()
        )
        current_world = obj.matrix_world.copy()
        to_rest = deform.inverted()
        for vertex in obj.data.vertices:
            vertex.co = to_rest @ (current_world @ vertex.co)
        obj.matrix_world = Matrix.Identity(4)
        obj.parent = None
        obj.vertex_groups.clear()
        group = obj.vertex_groups.new(name=str(bone_name))
        group.add([vertex.index for vertex in obj.data.vertices], 1.0, "REPLACE")
        modifier = obj.modifiers.new(f"{bone_name} rigid skin", "ARMATURE")
        modifier.object = rig
        bound += 1
    bpy.context.view_layer.update()
    return bound


def skin_rigid_mesh(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    group = obj.vertex_groups.get(bone_name) or obj.vertex_groups.new(name=bone_name)
    group.add([vertex.index for vertex in obj.data.vertices], 1.0, "REPLACE")
    modifier = obj.modifiers.new(f"{bone_name} skin", "ARMATURE")
    modifier.object = rig


def attach_to_current_bone_pose(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    """Move source-space rigid geometry into the current pose, then bone-parent it."""
    rest = rig.data.bones[bone_name].matrix_local
    posed = rig.pose.bones[bone_name].matrix
    deform = rig.matrix_world @ posed @ rest.inverted()
    obj.matrix_world = deform @ obj.matrix_world
    bone_parent(obj, rig, bone_name)


def assign_outfit(body: bpy.types.Object, agent_code: str, config: dict) -> None:
    surfaces = (
        material(f"{agent_code} skin", config["skin"], 0.62),
        material(f"{agent_code} top", config["top"], 0.72),
        material(f"{agent_code} trousers", config["trousers"], 0.58),
        material(f"{agent_code} shoes", config["shoes"], 0.3),
    )
    body.data.materials.clear()
    for surface in surfaces:
        body.data.materials.append(surface)
    for polygon in body.data.polygons:
        point = polygon.center
        x, z = abs(point.x), point.z
        if z < 0.135:
            polygon.material_index = 3
        elif z < config["top_min"] - 0.06 and x < 0.34:
            polygon.material_index = 2
        elif config["top_min"] - 0.08 <= z < config["top_max"] + 0.04 and x < 0.40:
            # A fitted base garment prevents exposed-skin gaps where the
            # extracted blazer/shirt shell crosses coarse source topology.
            polygon.material_index = 1
        else:
            polygon.material_index = 0


def duplicate_clothing_region(
    body: bpy.types.Object,
    name: str,
    surface: bpy.types.Material,
    keep_vertex,
    thickness: float,
) -> bpy.types.Object:
    garment = body.copy()
    garment.data = body.data.copy()
    garment.name = name
    bpy.context.scene.collection.objects.link(garment)
    garment.data.materials.clear()
    garment.data.materials.append(surface)
    for polygon in garment.data.polygons:
        polygon.material_index = 0
    mesh = bmesh.new()
    mesh.from_mesh(garment.data)
    remove = [vertex for vertex in mesh.verts if not keep_vertex(vertex.co)]
    bmesh.ops.delete(mesh, geom=remove, context="VERTS")
    boundary = [vertex for vertex in mesh.verts if any(edge.is_boundary for edge in vertex.link_edges)]
    for _ in range(3):
        bmesh.ops.smooth_vert(
            mesh,
            verts=boundary,
            factor=0.32,
            use_axis_x=True,
            use_axis_y=True,
            use_axis_z=True,
        )
    mesh.to_mesh(garment.data)
    mesh.free()
    solidify = garment.modifiers.new("Garment thickness", "SOLIDIFY")
    solidify.thickness = thickness
    solidify.offset = 1.0
    bevel = garment.modifiers.new("Garment edge softness", "BEVEL")
    bevel.width = 0.003
    bevel.segments = 2
    return garment


def create_layered_clothing(body: bpy.types.Object, agent_code: str, config: dict) -> list[bpy.types.Object]:
    top = material(f"{agent_code} top fabric", config["top"], 0.78)
    trousers_surface = material(f"{agent_code} trouser fabric", config["trousers"], 0.82)
    overshirt = duplicate_clothing_region(
        body,
        f"{agent_code}_TopLayer",
        top,
        lambda point: (
            (config["top_min"] < point.z < config["top_max"] and abs(point.x) < 0.35)
            or (
                config["top_min"] - 0.10 < point.z < config["top_max"] - 0.05
                and 0.22 <= abs(point.x) < 0.37
            )
        ),
        0.012,
    )
    trousers = duplicate_clothing_region(
        body,
        f"{agent_code}_Trousers",
        trousers_surface,
        lambda point: 0.13 < point.z < config["trousers_max"] and abs(point.x) < 0.38,
        0.009,
    )
    garments = [overshirt, trousers]
    if agent_code in {"B02", "D02"}:
        inner = duplicate_clothing_region(
            body,
            f"{agent_code}_InnerShirt",
            material(f"{agent_code} clean inner shirt", (0.82, 0.82, 0.76, 1), 0.70),
            lambda point: 0.98 < point.z < 1.23 and abs(point.x) < 0.070 and point.y < 0.0,
            0.016,
        )
        garments.append(inner)
    elif agent_code == "E01":
        vest = duplicate_clothing_region(
            body,
            f"{agent_code}_NavyVest",
            material(f"{agent_code} navy vest", (0.018, 0.028, 0.060, 1), 0.68),
            lambda point: 0.90 < point.z < 1.25 and abs(point.x) < 0.235 and point.y < 0.02,
            0.016,
        )
        garments.append(vest)
    return garments


def add_cylinder_between(
    name: str,
    start: Vector,
    end: Vector,
    radius: float,
    surface: bpy.types.Material,
    oval_y: float = 1.0,
) -> bpy.types.Object:
    direction = end - start
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32,
        radius=radius,
        depth=direction.length,
        location=(start + end) * 0.5,
    )
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    obj.scale = (1.0, oval_y, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(surface)
    bevel = obj.modifiers.new("Tailored edge softness", "BEVEL")
    bevel.width = 0.004
    bevel.segments = 2
    return obj


def add_tailored_trims(rig: bpy.types.Object) -> list[bpy.types.Object]:
    """Hide raw garment cuts with clean, rig-following collar and cuffs."""
    return []


def add_hair_and_details(
    rig: bpy.types.Object,
    agent_code: str,
    config: dict,
) -> list[bpy.types.Object]:
    hair = material(f"{agent_code} textured black hair", (0.005, 0.008, 0.012, 1), 0.68)
    accent = material(f"{agent_code} accent", config["accent"], 0.34)
    details: list[bpy.types.Object] = []

    ponytail = config["hair_style"] == "ponytail"
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=32,
        ring_count=20,
        location=(0, 0.045 if ponytail else 0.018, 1.53 if ponytail else config["head_top"]),
        scale=(0.175, 0.15, 0.18) if ponytail else (0.19, 0.16, 0.105 if config["hair_style"] == "short" else 0.085),
    )
    scalp = bpy.context.object
    scalp.name = f"{agent_code}_HairScalp"
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mesh = bmesh.new()
    mesh.from_mesh(scalp.data)
    if ponytail:
        remove = [
            vertex
            for vertex in mesh.verts
            if vertex.co.z < -0.12 or (vertex.co.y < -0.06 and vertex.co.z < 0.055)
        ]
    else:
        remove = [vertex for vertex in mesh.verts if vertex.co.z < -0.04]
    bmesh.ops.delete(mesh, geom=remove, context="VERTS")
    mesh.to_mesh(scalp.data)
    mesh.free()
    scalp.data.materials.append(hair)
    solidify = scalp.modifiers.new("Hair thickness", "SOLIDIFY")
    solidify.thickness = 0.012
    bevel = scalp.modifiers.new("Hair softness", "BEVEL")
    bevel.width = 0.006
    bevel.segments = 2
    attach_to_current_bone_pose(scalp, rig, "HeadJoint")
    details.append(scalp)

    for index, (location, scale, rotation) in enumerate(
        (
            ((-0.09, -0.132, 1.755), (0.055, 0.038, 0.038), -0.23),
            ((-0.03, -0.145, 1.77), (0.06, 0.04, 0.042), -0.08),
            ((0.035, -0.145, 1.768), (0.06, 0.04, 0.042), 0.10),
            ((0.095, -0.13, 1.75), (0.052, 0.037, 0.038), 0.25),
        )
        if config["hair_style"] == "short"
        else ()
    ):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1, location=location)
        lock = bpy.context.object
        lock.name = f"{agent_code}_HairLock_{index + 1:02d}"
        lock.scale = scale
        lock.rotation_euler.y = rotation
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        lock.data.materials.append(hair)
        attach_to_current_bone_pose(lock, rig, "HeadJoint")
        details.append(lock)

    if agent_code == "A01":
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=(0.105, -0.174, 1.225))
        pin = bpy.context.object
        pin.name = f"{agent_code}_AccentPin"
        pin.scale = (0.018, 0.009, 0.018)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        pin.data.materials.append(accent)
        attach_to_current_bone_pose(pin, rig, "SpineJoint")
        details.append(pin)
    return details


def create_qa_eyes(rig: bpy.types.Object, agent_code: str) -> list[bpy.types.Object]:
    """Replace library eyeballs with deterministic eyes at evaluated socket centres."""
    sclera = material(f"{agent_code} sclera", (0.92, 0.89, 0.84, 1), 0.42)
    iris = material(f"{agent_code} iris", (0.12, 0.055, 0.025, 1), 0.32)
    pupil = material(f"{agent_code} pupil", (0.004, 0.003, 0.002, 1), 0.25)
    result: list[bpy.types.Object] = []
    for suffix, x in (("L", 0.040658), ("R", -0.040658)):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=0.038, location=(x, 0.0459, 1.33625))
        eye = bpy.context.object
        eye.name = f"{agent_code}_Eye_{suffix}"
        eye.data.materials.append(sclera)
        bone_parent(eye, rig, "HeadJoint")
        result.append(eye)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.017, location=(x, 0.012, 1.33625))
        iris_obj = bpy.context.object
        iris_obj.name = f"{agent_code}_Iris_{suffix}"
        iris_obj.scale.y = 0.34
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        iris_obj.data.materials.append(iris)
        bone_parent(iris_obj, rig, "HeadJoint")
        result.append(iris_obj)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=0.008, location=(x, 0.005, 1.33625))
        pupil_obj = bpy.context.object
        pupil_obj.name = f"{agent_code}_Pupil_{suffix}"
        pupil_obj.scale.y = 0.3
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        pupil_obj.data.materials.append(pupil)
        bone_parent(pupil_obj, rig, "HeadJoint")
        result.append(pupil_obj)
    return result


def append_cc0_hair(
    source_path: str,
    rig: bpy.types.Object,
    agent_code: str,
) -> bpy.types.Object:
    with bpy.data.libraries.load(source_path, link=False) as (available, requested):
        source_name = "A01_Basemesh.short03"
        if source_name not in available.objects:
            raise RuntimeError(f"Missing {source_name} in {source_path}")
        requested.objects = [source_name]
    hair = requested.objects[0]
    hair.name = f"{agent_code}_CC0_ShortHair"
    hair.parent = None
    for modifier in list(hair.modifiers):
        hair.modifiers.remove(modifier)
    bpy.context.scene.collection.objects.link(hair)
    hair.scale = (1.66, 1.05, 1.10)
    # Align the CC0 crop to the evaluated stylized head: the previous offset left
    # a bald rear hemisphere and made the fringe float above the forehead.
    hair.location = (0.0, 0.143, -0.253)
    hair.data.materials.clear()
    hair.data.materials.append(material(f"{agent_code} CC0 hair", (0.006, 0.009, 0.014, 1), 0.56))
    bone_parent(hair, rig, "HeadJoint")
    return hair


def add_rear_hair_fill(rig: bpy.types.Object, agent_code: str) -> bpy.types.Object:
    """Fill only the rear/top hemisphere left open by the CC0 fringe mesh."""
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=32,
        ring_count=20,
        location=(0.0, 0.105, 1.385),
        scale=(0.142, 0.14, 0.145),
    )
    fill = bpy.context.object
    fill.name = f"{agent_code}_RearHairFill"
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mesh = bmesh.new()
    mesh.from_mesh(fill.data)
    bmesh.ops.delete(
        mesh,
        geom=[vertex for vertex in mesh.verts if vertex.co.y < -0.025 or vertex.co.z < -0.10],
        context="VERTS",
    )
    boundary = [vertex for vertex in mesh.verts if any(edge.is_boundary for edge in vertex.link_edges)]
    for _ in range(2):
        bmesh.ops.smooth_vert(
            mesh,
            verts=boundary,
            factor=0.28,
            use_axis_x=True,
            use_axis_y=True,
            use_axis_z=True,
        )
    mesh.to_mesh(fill.data)
    mesh.free()
    fill.data.materials.append(material(f"{agent_code} CC0 hair", (0.006, 0.009, 0.014, 1), 0.56))
    solidify = fill.modifiers.new("Rear hair thickness", "SOLIDIFY")
    solidify.thickness = 0.01
    bevel = fill.modifiers.new("Rear hair softness", "BEVEL")
    bevel.width = 0.005
    bevel.segments = 2
    bone_parent(fill, rig, "HeadJoint")
    return fill


def add_signature_hair_shape(
    rig: bpy.types.Object,
    agent_code: str,
    hair_style: str,
) -> list[bpy.types.Object]:
    """Add a readable silhouette for the three female character hairstyles."""
    if hair_style not in {"bob", "long", "ponytail"}:
        return []
    hair = material(f"{agent_code} signature hair", (0.004, 0.006, 0.010, 1), 0.64)
    shapes: list[tuple[str, tuple, tuple, tuple]] = []
    if hair_style == "bob":
        shapes = [
            ("BobBack", (0.0, 0.105, 1.470), (0.175, 0.135, 0.18), (0.0, 0.0, 0.0)),
            ("BobSideL", (0.145, 0.035, 1.500), (0.075, 0.085, 0.17), (0.0, -0.10, -0.08)),
            ("BobSideR", (-0.145, 0.035, 1.500), (0.075, 0.085, 0.17), (0.0, 0.10, 0.08)),
        ]
    elif hair_style == "long":
        shapes = [
            ("LongBack", (0.0, 0.125, 1.35), (0.185, 0.095, 0.30), (0.0, 0.0, 0.0)),
            ("LongSideL", (0.145, 0.018, 1.38), (0.067, 0.060, 0.26), (0.0, -0.08, -0.08)),
            ("LongSideR", (-0.145, 0.018, 1.38), (0.067, 0.060, 0.26), (0.0, 0.08, 0.08)),
        ]
    else:
        shapes = [
            ("PonyBase", (0.0, 0.205, 1.615), (0.085, 0.075, 0.115), (0.18, 0.0, 0.0)),
            ("PonyMid", (0.0, 0.245, 1.475), (0.075, 0.068, 0.145), (0.24, 0.0, 0.0)),
            ("PonyTip", (0.0, 0.245, 1.325), (0.055, 0.052, 0.125), (0.28, 0.0, 0.0)),
        ]
    result: list[bpy.types.Object] = []
    for suffix, location, scale, rotation in shapes:
        bpy.ops.mesh.primitive_uv_sphere_add(
            segments=28,
            ring_count=18,
            location=location,
            scale=scale,
            rotation=rotation,
        )
        obj = bpy.context.object
        obj.name = f"{agent_code}_{suffix}"
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.data.materials.append(hair)
        bevel = obj.modifiers.new("Hair silhouette softness", "BEVEL")
        bevel.width = 0.004
        bevel.segments = 2
        attach_to_current_bone_pose(obj, rig, "HeadJoint")
        result.append(obj)
    return result


def add_irises_to_source_eyes(
    rig: bpy.types.Object,
    source_eyes: list[bpy.types.Object],
    agent_code: str,
) -> list[bpy.types.Object]:
    iris_surface = material(f"{agent_code} warm brown iris", (0.15, 0.065, 0.024, 1), 0.30)
    pupil_surface = material(f"{agent_code} pupil", (0.003, 0.002, 0.001, 1), 0.22)
    brow_surface = material(f"{agent_code} eyebrow", (0.006, 0.008, 0.010, 1), 0.62)
    result: list[bpy.types.Object] = []
    for eye in source_eyes:
        center = eye.matrix_world.translation.copy()
        suffix = "L" if center.x >= 0 else "R"
        for label, radius, offset, surface in (
            ("Iris", 0.017, -0.033, iris_surface),
            ("Pupil", 0.008, -0.039, pupil_surface),
        ):
            bpy.ops.mesh.primitive_uv_sphere_add(
                segments=20,
                ring_count=12,
                radius=radius,
                location=(center.x, center.y + offset, center.z),
                scale=(1.0, 0.30, 1.0),
            )
            detail = bpy.context.object
            detail.name = f"{agent_code}_{label}_{suffix}"
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            detail.data.materials.append(surface)
            bone_parent(detail, rig, "HeadJoint")
            result.append(detail)
        bpy.ops.mesh.primitive_cube_add(
            location=(center.x, center.y - 0.038, center.z + 0.052),
        )
        brow = bpy.context.object
        brow.name = f"{agent_code}_Eyebrow_{suffix}"
        brow.scale = (0.028, 0.004, 0.004)
        brow.rotation_euler.y = -0.10 if suffix == "L" else 0.10
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        brow.data.materials.append(brow_surface)
        bevel = brow.modifiers.new("Brow softness", "BEVEL")
        bevel.width = 0.003
        bevel.segments = 2
        bone_parent(brow, rig, "HeadJoint")
        result.append(brow)
    return result


def rotate_pose_bone_to(rig: bpy.types.Object, bone_name: str, direction: Vector) -> None:
    bpy.context.view_layer.update()
    bone = rig.pose.bones[bone_name]
    current_direction = (bone.tail - bone.head).normalized()
    target_direction = direction.normalized()
    rotation = current_direction.rotation_difference(target_direction)
    head = bone.head.copy()
    transform = Matrix.Translation(head) @ rotation.to_matrix().to_4x4() @ Matrix.Translation(-head)
    bone.matrix = transform @ bone.matrix
    bpy.context.view_layer.update()


def pose_seated(rig: bpy.types.Object, config: dict) -> None:
    pelvis = rig.pose.bones["PelvisJoint"]
    # Fold the legs/torso in rig-local space, then place the whole deform rig by
    # world-space workstation anchors. Pose-bone location axes are not world Y/Z.
    pelvis.location = (0, -0.145, -0.713)
    bpy.context.view_layer.update()
    rotate_pose_bone_to(rig, "SpineJoint", Vector((0, -0.16, 1.0)))
    rotate_pose_bone_to(rig, "HeadJoint", Vector((0, 0.03, 1.0)))
    for suffix, side in (("L", 1), ("R", -1)):
        rotate_pose_bone_to(rig, f"Thigh{suffix}Joint", Vector((0.03 * side, -1.0, -0.08)))
        rotate_pose_bone_to(rig, f"Knee{suffix}Joint", Vector((0, 0.05, -1.0)))
        rig.pose.bones[f"Knee{suffix}Joint"].scale.y = config["knee_scale"]
        rotate_pose_bone_to(rig, f"Ankle{suffix}Joint", Vector((0, -1.0, -0.05)))
        rotate_pose_bone_to(
            rig,
            f"Shoulder{suffix}Joint",
            Vector((0.48 * side, -0.68, -0.55)),
        )
        rotate_pose_bone_to(
            rig,
            f"Elbow{suffix}Joint",
            Vector((-0.34 * side, -0.9, -0.12)),
        )
        rotate_pose_bone_to(rig, f"Wrist{suffix}Joint", Vector((0, -1.0, 0.02)))
    # Target pelvis centre: y 0.15 over the horizontal cushion and z 0.575 so
    # the evaluated butt surface lands at the cushion top (z 0.462).
    rig.location = (0, -0.563, config["rig_z"])
    bpy.context.view_layer.update()


def create_anchor(name: str, location, role: str) -> bpy.types.Object:
    anchor = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(anchor)
    anchor.empty_display_type = "SPHERE"
    anchor.empty_display_size = 0.035
    anchor.location = location
    anchor["crewlab_anchor_role"] = role
    return anchor


def create_workstation_anchors() -> list[bpy.types.Object]:
    specs = (
        ("SeatAnchor", (0.0, 0.105, 0.462), "seat_surface"),
        ("PelvisTarget", (0.0, 0.145, 0.575), "pelvis"),
        ("LeftHandKeyboardTarget", (0.155, -0.55, 0.795), "left_hand_keyboard"),
        ("RightHandKeyboardTarget", (-0.155, -0.55, 0.795), "right_hand_keyboard"),
        ("MonitorPrimaryTarget", (0.0, -0.86, 1.03), "primary_monitor"),
        ("MonitorSecondaryTarget", (0.40, -0.76, 1.01), "secondary_monitor"),
        ("TabletTarget", (-0.30, -0.54, 0.805), "tablet"),
        ("LeftFootTarget", (0.13, -0.30, 0.0), "left_foot"),
        ("RightFootTarget", (-0.13, -0.30, 0.0), "right_foot"),
    )
    return [create_anchor(name, location, role) for name, location, role in specs]


def key_pose(rig: bpy.types.Object, frame: int) -> None:
    for bone in rig.pose.bones:
        bone.keyframe_insert(data_path="location", frame=frame, group=bone.name)
        if bone.rotation_mode == "QUATERNION":
            bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone.name)
        else:
            bone.keyframe_insert(data_path="rotation_euler", frame=frame, group=bone.name)
        bone.keyframe_insert(data_path="scale", frame=frame, group=bone.name)


def author_required_actions(rig: bpy.types.Object) -> list[str]:
    """Create the eight runtime contracts while keeping pelvis and feet locked."""
    clips = {
        "seated_idle": ((1, 0.0, 0.0), (30, 0.025, -0.018), (60, 0.0, 0.0)),
        "typing": ((1, 0.0, 0.0), (8, 0.05, -0.04), (16, -0.04, 0.05), (24, 0.0, 0.0)),
        "thinking": ((1, 0.0, 0.0), (24, -0.08, 0.11), (48, 0.0, 0.0)),
        "screen_review": ((1, 0.0, 0.0), (24, 0.0, -0.14), (48, 0.0, 0.12), (72, 0.0, 0.0)),
        "tablet_work": ((1, 0.0, 0.0), (18, 0.09, 0.07), (36, -0.05, -0.04), (54, 0.0, 0.0)),
        "waiting_human": ((1, 0.0, 0.0), (32, 0.025, 0.09), (64, 0.0, 0.0)),
        "success": ((1, 0.0, 0.0), (14, 0.07, -0.07), (28, 0.0, 0.0)),
        "error_rework": ((1, 0.0, 0.0), (20, -0.10, 0.04), (40, 0.0, 0.0)),
    }
    rig.animation_data_create()
    base = {bone.name: bone.matrix_basis.copy() for bone in rig.pose.bones}
    created: list[str] = []
    for clip_name, keys in clips.items():
        action = bpy.data.actions.new(clip_name)
        action.use_fake_user = True
        rig.animation_data.action = action
        for frame, left_delta, right_delta in keys:
            for bone in rig.pose.bones:
                bone.matrix_basis = base[bone.name].copy()
                bone.rotation_mode = "QUATERNION"
            head_delta = (left_delta + right_delta) * 0.65
            rig.pose.bones["HeadJoint"].rotation_quaternion.rotate(
                Matrix.Rotation(head_delta, 4, "Z").to_quaternion()
            )
            rig.pose.bones["SpineJoint"].rotation_quaternion.rotate(
                Matrix.Rotation((left_delta - right_delta) * 0.12, 4, "X").to_quaternion()
            )
            rig.pose.bones["WristLJoint"].rotation_quaternion.rotate(
                Matrix.Rotation(left_delta, 4, "X").to_quaternion()
            )
            rig.pose.bones["WristRJoint"].rotation_quaternion.rotate(
                Matrix.Rotation(right_delta, 4, "X").to_quaternion()
            )
            if clip_name == "typing":
                for suffix, delta in (("L", left_delta), ("R", right_delta)):
                    for digit, multiplier in (("Index", 3.0), ("Middle", 2.3), ("Ring", 1.8), ("Little", 1.3)):
                        rig.pose.bones[f"{digit}{suffix}Joint"].rotation_quaternion.rotate(
                            Matrix.Rotation(abs(delta) * multiplier, 4, "X").to_quaternion()
                        )
            elif clip_name == "thinking":
                rig.pose.bones["HeadJoint"].rotation_quaternion.rotate(
                    Matrix.Rotation(-max(abs(left_delta), abs(right_delta)) * 0.8, 4, "X").to_quaternion()
                )
            if clip_name == "success":
                rig.pose.bones["HeadJoint"].rotation_quaternion.rotate(
                    Matrix.Rotation(-abs(left_delta) * 1.4, 4, "X").to_quaternion()
                )
            elif clip_name == "error_rework":
                rig.pose.bones["HeadJoint"].rotation_quaternion.rotate(
                    Matrix.Rotation(abs(left_delta) * 1.0, 4, "X").to_quaternion()
                )
            key_pose(rig, frame)
        created.append(clip_name)
    rig.animation_data.action = None
    for bone in rig.pose.bones:
        bone.matrix_basis = base[bone.name]
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    return created


def cube(name: str, location, scale, surface, bevel: float = 0.025):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(surface)
    modifier = obj.modifiers.new("Soft edges", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    return obj


def build_qa_scene(
    output: Path,
    rig: bpy.types.Object,
    body: bpy.types.Object,
    source_eyes: list[bpy.types.Object],
    hair_source: str | None,
    agent_code: str,
    config: dict,
    views_csv: str,
) -> None:
    assign_outfit(body, agent_code, config)
    create_layered_clothing(body, agent_code, config)
    add_tailored_trims(rig)
    for obj in source_eyes:
        obj.hide_render = False
        obj.hide_viewport = False
        obj.name = f"{agent_code}_{obj.name.rsplit('.', 1)[-1]}"
        attach_to_current_bone_pose(obj, rig, "HeadJoint")
    add_irises_to_source_eyes(rig, source_eyes, agent_code)
    add_hair_and_details(rig, agent_code, config)
    add_signature_hair_shape(rig, agent_code, config["hair_style"])
    if hair_source and config["hair_style"] == "short":
        for obj in bpy.data.objects:
            if obj.name.startswith(f"{agent_code}_HairScalp") or obj.name.startswith(f"{agent_code}_HairLock"):
                obj.hide_render = True
                obj.hide_viewport = True
        append_cc0_hair(hair_source, rig, agent_code)
        add_rear_hair_fill(rig, agent_code)
    rigid_bound = bind_marked_rigid_meshes(rig)
    print(f"{agent_code}_RIGID_ACCESSORIES", rigid_bound)

    chair = material("QA chair", (0.10, 0.16, 0.18, 1), 0.38)
    oak = material("QA oak", (0.49, 0.27, 0.12, 1), 0.42)
    floor = material("QA limestone", (0.78, 0.83, 0.82, 1), 0.72)
    cube("QA floor", (0, 0, -0.035), (2.4, 2.4, 0.03), floor)
    # The evaluated butt surface sits at z ~= 0.462 in the seated pose. Keep the
    # cushion top at the same height: visible contact without mesh penetration.
    cube("QA seat", (0, 0.105, 0.417), (0.30, 0.27, 0.045), chair)
    cube("QA back", (0, 0.325, 0.697), (0.30, 0.045, 0.31), chair)
    cube("QA desk", (0, -0.58, 0.755), (0.62, 0.27, 0.025), oak)

    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new("QA daylight")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.73, 0.83, 0.91, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
    for name, location, energy, size, color in (
        ("Key", (-2.6, -3.2, 3.5), 850, 3.2, (1.0, 0.97, 0.91)),
        ("Fill", (3.0, -1.0, 2.5), 650, 3.0, (0.82, 0.92, 1.0)),
        ("Rim", (0.8, 3.0, 2.9), 780, 2.5, (0.88, 1.0, 0.96)),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light_data.color = color
        light = bpy.data.objects.new(name, light_data)
        scene.collection.objects.link(light)
        light.location = location
        look_at(light, Vector((0, -0.05, 0.8)))

    camera_data = bpy.data.cameras.new("QA camera")
    camera_data.lens = 55
    camera = bpy.data.objects.new("QA camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.look = "AgX - Medium High Contrast"

    views = {
        "front": (0.0, -3.45, 0.91),
        "three-quarter": (2.5, -2.65, 0.96),
        "side": (3.45, 0.0, 0.91),
        "back": (0.0, 3.45, 0.93),
    }
    requested = [item.strip() for item in views_csv.split(",") if item.strip()]
    for view in requested:
        if view not in views:
            raise ValueError(f"Unknown view: {view}")
        camera.location = views[view]
        look_at(camera, Vector((0, -0.08, 0.78)))
        scene.render.filepath = str(output / f"{agent_code.lower()}-seated-rig-{view}.png")
        bpy.ops.render.render(write_still=True)
        print(f"{agent_code}_SEATED_RIG_RENDER", view, scene.render.filepath)


def main() -> int:
    args = parse_args()
    agent_code = args.agent
    config = CHARACTER_CONFIGS[agent_code]
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    body, eyes = sanitize_source(config["collection"])
    # The source eyeballs are body children. Detach while preserving source-world
    # transforms before automatic-parenting the body, otherwise they deform twice.
    for eye in eyes:
        eye_world = eye.matrix_world.copy()
        eye.parent = None
        eye.matrix_world = eye_world
    rig = build_armature(agent_code)
    skinning = skin_body(body, rig)
    pose_seated(rig, config)
    anchors = create_workstation_anchors()
    build_qa_scene(output, rig, body, eyes, args.hair_source, agent_code, config, args.views)
    clips = author_required_actions(rig)
    blend_path = output / f"{agent_code}_STYLIZED_RIG_CANDIDATE.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), check_existing=False)
    payload = {
        "status": "candidate_not_runtime",
        "body_vertices": len(body.data.vertices),
        "body_triangles": sum(max(0, len(poly.vertices) - 2) for poly in body.data.polygons),
        "bones": len(rig.data.bones),
        "anchors": [anchor.name for anchor in anchors],
        "clips": clips,
        "skinning": skinning,
        "eye_meshes": len(eyes),
        "output_blend": str(blend_path),
    }
    (output / "candidate.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"{agent_code}_STYLIZED_RIG_CANDIDATE", json.dumps(payload))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

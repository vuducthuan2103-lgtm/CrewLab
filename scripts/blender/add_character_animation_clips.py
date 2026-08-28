"""Add deterministic CrewLab work-state clips to an MPFB game-engine rig."""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion


ANIMATED_BONES = (
    "spine_02",
    "spine_03",
    "neck_01",
    "head",
    "upperarm_l",
    "upperarm_r",
    "lowerarm_l",
    "lowerarm_r",
    "hand_l",
    "hand_r",
)


def set_delta(
    rig: bpy.types.Object,
    changes: dict[str, tuple[str, float]],
    base_rotations: dict[str, Quaternion],
) -> None:
    for bone_name in ANIMATED_BONES:
        bone = rig.pose.bones.get(bone_name)
        if bone is None:
            continue
        bone.rotation_mode = "QUATERNION"
        axis_name, angle = changes.get(bone_name, ("X", 0.0))
        axis = {
            "X": (1.0, 0.0, 0.0),
            "Y": (0.0, 1.0, 0.0),
            "Z": (0.0, 0.0, 1.0),
        }[axis_name]
        bone.rotation_quaternion = base_rotations[bone_name] @ Quaternion(axis, angle)


def create_clip(
    rig: bpy.types.Object,
    name: str,
    keyframes: list[tuple[int, dict[str, tuple[str, float]]]],
    base_rotations: dict[str, Quaternion],
) -> bpy.types.Action:
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data.action = action
    for frame, changes in keyframes:
        set_delta(rig, changes, base_rotations)
        for bone_name in ANIMATED_BONES:
            bone = rig.pose.bones.get(bone_name)
            if bone is not None:
                bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone_name)
    rig.animation_data.action = None
    return action


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--rig", default="A01_Armature")
    parser.add_argument("--max-texture", type=int, default=1024)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])

    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    rig = bpy.data.objects[args.rig]
    rig.animation_data_create()
    base_rotations = {}
    for bone_name in ANIMATED_BONES:
        bone = rig.pose.bones.get(bone_name)
        if bone is None:
            continue
        bone.rotation_mode = "QUATERNION"
        base_rotations[bone_name] = bone.rotation_quaternion.copy()

    create_clip(
        rig,
        "Idle",
        [
            (1, {}),
            (36, {"spine_03": ("X", math.radians(1.4)), "head": ("Z", math.radians(1.0))}),
            (72, {}),
        ],
        base_rotations,
    )
    create_clip(
        rig,
        "Typing",
        [
            (1, {"lowerarm_l": ("X", math.radians(5)), "lowerarm_r": ("X", math.radians(-5))}),
            (12, {"hand_l": ("Z", math.radians(6)), "hand_r": ("Z", math.radians(-3)), "head": ("X", math.radians(3))}),
            (24, {"hand_l": ("Z", math.radians(-3)), "hand_r": ("Z", math.radians(6)), "head": ("X", math.radians(2))}),
            (36, {"hand_l": ("Z", math.radians(5)), "hand_r": ("Z", math.radians(-4)), "head": ("X", math.radians(3))}),
            (48, {"lowerarm_l": ("X", math.radians(5)), "lowerarm_r": ("X", math.radians(-5))}),
        ],
        base_rotations,
    )
    create_clip(
        rig,
        "Reviewing",
        [
            (1, {"spine_02": ("X", math.radians(2)), "head": ("Z", math.radians(-5))}),
            (32, {"spine_02": ("X", math.radians(3)), "head": ("Z", math.radians(5))}),
            (64, {"spine_02": ("X", math.radians(2)), "head": ("Z", math.radians(-5))}),
        ],
        base_rotations,
    )
    create_clip(
        rig,
        "Success",
        [
            (1, {}),
            (18, {"upperarm_l": ("Z", math.radians(-14)), "upperarm_r": ("Z", math.radians(14)), "head": ("X", math.radians(-5))}),
            (38, {"upperarm_l": ("Z", math.radians(-10)), "upperarm_r": ("Z", math.radians(10)), "head": ("Z", math.radians(3))}),
            (60, {}),
        ],
        base_rotations,
    )

    rig.animation_data.action = bpy.data.actions["Idle"]
    bpy.context.scene.frame_set(1)
    for image in bpy.data.images:
        if image.source != "FILE":
            continue
        if not image.has_data:
            image.reload()
        width, height = image.size
        longest = max(width, height)
        if longest > args.max_texture:
            factor = args.max_texture / longest
            image.scale(max(1, round(width * factor)), max(1, round(height * factor)))
            image.pack()
            print("TEXTURE_RESIZED", image.name, tuple(image.size))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.type in {"MESH", "ARMATURE"}:
            obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=False,
        export_extra_animations=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )
    print("CLIPS", [action.name for action in bpy.data.actions])
    print("OUTPUT", output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

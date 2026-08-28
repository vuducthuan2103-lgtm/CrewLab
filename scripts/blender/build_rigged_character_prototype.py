"""Build one MPFB-based skinned CrewLab character for pipeline validation."""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


def mpfb_services():
    module_name = next(
        module
        for module in bpy.context.preferences.addons.keys()
        if "mpfb" in module.lower()
    )
    module = sys.modules[module_name]
    return __import__(
        f"{module.__name__}.services",
        fromlist=["HumanService", "TargetService"],
    )


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_ik_target(
    rig: bpy.types.Object,
    bone_name: str,
    target_location: tuple[float, float, float],
    pole_location: tuple[float, float, float] | None,
    pole_angle: float = 0.0,
) -> None:
    target = bpy.data.objects.new(f"IK_{bone_name}", None)
    target.location = target_location
    bpy.context.collection.objects.link(target)
    constraint = rig.pose.bones[bone_name].constraints.new("IK")
    constraint.target = target
    constraint.chain_count = 2
    if pole_location is not None:
        pole = bpy.data.objects.new(f"Pole_{bone_name}", None)
        pole.location = pole_location
        bpy.context.collection.objects.link(pole)
        constraint.pole_target = pole
        constraint.pole_angle = pole_angle


def apply_manual_office_pose(rig: bpy.types.Object) -> None:
    def aim_bone(bone_name: str, target: tuple[float, float, float]) -> None:
        bone = rig.pose.bones[bone_name]
        head = bone.head.copy()
        current_direction = (bone.tail - head).normalized()
        target_direction = (Vector(target) - head).normalized()
        correction = current_direction.rotation_difference(target_direction)
        bone.matrix = (
            Matrix.Translation(head)
            @ correction.to_matrix().to_4x4()
            @ Matrix.Translation(-head)
            @ bone.matrix
        )
        bpy.context.view_layer.update()

    # The game rig uses Blender Z as up and -Y as the desk-facing direction.
    # Aim each two-bone chain in armature space so the pose remains independent
    # of bone roll and of small body-proportion differences between agents.
    aim_bone("thigh_l", (0.19, -0.36, -0.04))
    aim_bone("calf_l", (0.20, -0.34, -0.45))
    aim_bone("foot_l", (0.20, -0.50, -0.47))
    aim_bone("thigh_r", (-0.17, -0.33, -0.03))
    aim_bone("calf_r", (-0.18, -0.31, -0.45))
    aim_bone("foot_r", (-0.18, -0.48, -0.47))
    aim_bone("upperarm_l", (0.34, -0.20, 0.31))
    aim_bone("lowerarm_l", (0.24, -0.46, 0.23))
    aim_bone("hand_l", (0.22, -0.53, 0.20))
    aim_bone("upperarm_r", (-0.34, -0.18, 0.32))
    aim_bone("lowerarm_r", (-0.24, -0.45, 0.23))
    aim_bone("hand_r", (-0.22, -0.52, 0.20))
    for bone_name, rotation in {
        "spine_02": (math.radians(5), 0, 0),
        "spine_03": (math.radians(-4), 0, 0),
        "neck_01": (math.radians(8), 0, 0),
        "head": (math.radians(-10), 0, 0),
        "hand_l": (0, math.radians(-12), math.radians(-8)),
        "hand_r": (0, math.radians(12), math.radians(8)),
    }.items():
        bone = rig.pose.bones.get(bone_name)
        if bone:
            bone.rotation_mode = "XYZ"
            bone.rotation_euler = rotation
    bpy.context.view_layer.update()


def retarget_bvh_pose(rig: bpy.types.Object, pose_path: Path) -> None:
    bpy.ops.import_anim.bvh(
        filepath=str(pose_path),
        axis_forward="Y",
        axis_up="Z",
        rotate_mode="QUATERNION",
    )
    source = bpy.context.object
    bpy.context.scene.frame_set(1)
    bpy.context.view_layer.update()
    copied = 0
    for source_bone in source.pose.bones:
        target_bone = rig.pose.bones.get(source_bone.name)
        if target_bone is None:
            continue
        source_rest = source_bone.bone.matrix_local.copy()
        target_rest = target_bone.bone.matrix_local.copy()
        if source_bone.parent is not None:
            source_rest = source_bone.parent.bone.matrix_local.inverted() @ source_rest
        if target_bone.parent is not None:
            target_rest = target_bone.parent.bone.matrix_local.inverted() @ target_rest

        # A BVH pose rotation is expressed in the source bone's rest axes. The
        # MakeHuman rig intentionally has different bone rolls, so copying
        # matrix_basis directly twists limbs. Move the delta into the common
        # parent-rest space, then back into the target bone's rest axes.
        source_rest_rotation = source_rest.to_quaternion()
        target_rest_rotation = target_rest.to_quaternion()
        source_delta = source_bone.matrix_basis.to_quaternion()
        parent_space_delta = (
            source_rest_rotation
            @ source_delta
            @ source_rest_rotation.conjugated()
        )
        target_bone.rotation_mode = "QUATERNION"
        target_bone.rotation_quaternion = (
            target_rest_rotation.conjugated()
            @ parent_space_delta
            @ target_rest_rotation
        )
        copied += 1
    bpy.data.objects.remove(source, do_unlink=True)
    bpy.context.view_layer.update()
    print("RETARGETED_BONES", copied)


def add_studio(render_dir: Path, code_slug: str) -> None:
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -0.81))
    floor = bpy.context.object
    floor.name = "QA_Floor"
    material = bpy.data.materials.new("QA_Floor_Material")
    material.diffuse_color = (0.025, 0.035, 0.04, 1)
    floor.data.materials.append(material)

    world = bpy.context.scene.world or bpy.data.worlds.new("QA_World")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.012, 0.018, 0.022, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.22

    for name, location, energy, color, size in (
        ("Key", (3.5, -4.0, 5.0), 1100, (1.0, 0.76, 0.52), 3.0),
        ("Fill", (-3.0, -1.0, 3.5), 800, (0.32, 0.72, 1.0), 2.5),
        ("Rim", (2.0, 3.5, 4.5), 1000, (0.36, 1.0, 0.78), 2.0),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.color = color
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = location
        look_at(light, Vector((0, 0, 1.05)))

    camera_data = bpy.data.cameras.new("QA_Camera")
    camera = bpy.data.objects.new("QA_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera_data.lens = 62
    bpy.context.scene.camera = camera

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 640
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(render_dir / f"{code_slug}-front.png")
    camera.location = (0, -4.2, 1.5)
    look_at(camera, Vector((0, 0, 1.0)))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--data", required=True)
    parser.add_argument("--pose")
    parser.add_argument("--manual-office-pose", action="store_true")
    parser.add_argument("--code", default="A01")
    parser.add_argument("--gender", choices=("male", "female"), default="male")
    parser.add_argument("--skin")
    parser.add_argument("--hair", default="short03")
    parser.add_argument("--clothes", default="male_elegantsuit01")
    parser.add_argument("--shoes", default="shoes03")
    parser.add_argument("--eyebrow", default="eyebrow004")
    parser.add_argument("--age", type=float, default=0.46)
    parser.add_argument("--muscle", type=float, default=0.52)
    parser.add_argument("--weight", type=float, default=0.48)
    parser.add_argument("--height", type=float, default=0.55)
    parser.add_argument("--proportions", type=float, default=0.52)
    parser.add_argument("--no-render", action="store_true")
    parser.add_argument("--rig", choices=("game_engine", "default"), default="game_engine")
    parser.add_argument("--retarget-pose")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])

    output = Path(args.output).resolve()
    data = Path(args.data).resolve()
    output.mkdir(parents=True, exist_ok=True)
    code = args.code.upper()
    code_slug = code.lower()

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    services = mpfb_services()
    human_service = services.HumanService
    target_service = services.TargetService

    macro = target_service.get_default_macro_info_dict()
    macro["race"].update({"african": 0.0, "asian": 1.0, "caucasian": 0.0})
    macro.update(
        {
            "gender": 0.82 if args.gender == "male" else 0.18,
            "age": args.age,
            "muscle": args.muscle,
            "weight": args.weight,
            "height": args.height,
            "proportions": args.proportions,
        }
    )

    basemesh = human_service.create_human(
        mask_helpers=True,
        detailed_helpers=False,
        extra_vertex_groups=True,
        feet_on_ground=True,
        scale=0.1,
        macro_detail_dict=macro,
    )
    basemesh.name = f"{code}_Basemesh"

    skin_name = args.skin or f"young_asian_{args.gender}"
    skin = data / "skins" / skin_name / f"{skin_name}.mhmat"
    human_service.set_character_skin(
        str(skin), basemesh, skin_type="GAMEENGINE", material_instances=False
    )

    rig = human_service.add_builtin_rig(basemesh, args.rig, import_weights=True)
    rig.name = f"{code}_Armature"

    assets = (
        ("eyes/high-poly/high-poly.mhclo", "Eyes"),
        (f"eyebrows/{args.eyebrow}/{args.eyebrow}.mhclo", "Eyebrows"),
        ("eyelashes/eyelashes01/eyelashes01.mhclo", "Eyelashes"),
        (f"hair/{args.hair}/{args.hair}.mhclo", "Hair"),
        (f"clothes/{args.clothes}/{args.clothes}.mhclo", "Clothes"),
        (f"clothes/{args.shoes}/{args.shoes}.mhclo", "Clothes"),
    )
    for relative_path, asset_type in assets:
        source = data / Path(relative_path)
        if not source.is_file():
            raise FileNotFoundError(source)
        human_service.add_mhclo_asset(
            str(source),
            basemesh,
            asset_type=asset_type,
            subdiv_levels=0,
            material_type="GAMEENGINE",
            set_up_rigging=True,
            interpolate_weights=True,
            import_subrig=True,
            import_weights=True,
        )

    if args.pose:
        services.AnimationService.import_bvh_file_as_pose(
            rig, str(Path(args.pose).resolve())
        )
        bpy.context.view_layer.update()
    elif args.retarget_pose:
        retarget_bvh_pose(rig, Path(args.retarget_pose).resolve())
    elif args.manual_office_pose:
        apply_manual_office_pose(rig)

    character_objects = [
        obj
        for obj in bpy.context.scene.objects
        if obj.type in {"MESH", "ARMATURE"}
    ]
    for obj in character_objects:
        obj.select_set(True)
        if obj.type == "MESH":
            for polygon in obj.data.polygons:
                polygon.use_smooth = True

    bpy.context.view_layer.objects.active = rig
    glb_path = output / f"{code_slug}-source.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
    )

    bpy.ops.wm.save_as_mainfile(filepath=str(output / f"{code_slug}-source.blend"))

    meshes = [obj for obj in character_objects if obj.type == "MESH"]
    for obj in meshes:
        obj.data.calc_loop_triangles()
    print("PROTOTYPE_GLTF", glb_path)
    print("ARMATURE", rig.name, "BONES", len(rig.data.bones))
    print("BONE_NAMES", [bone.name for bone in rig.data.bones])
    print("MESH_COUNT", len(meshes))
    print("VERTICES", sum(len(obj.data.vertices) for obj in meshes))
    print("TRIANGLES", sum(len(obj.data.loop_triangles) for obj in meshes))
    print("OBJECTS", [(obj.name, obj.type, obj.parent.name if obj.parent else None) for obj in character_objects])

    if not args.no_render:
        add_studio(output, code_slug)
        bpy.ops.render.render(write_still=True)
        print("QA_RENDER", output / f"{code_slug}-front.png")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

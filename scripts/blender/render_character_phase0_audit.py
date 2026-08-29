"""Render reproducible Phase 0 QA views of the current A01 runtime GLB.

This script does not modify the production asset. It imports the exact GLB
served by the Portal, places neutral workstation proxies around it, and emits
the audit views required by CHARACTER_PIPELINE_AUDIT.md.
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def make_material(name: str, color: tuple[float, float, float, float], roughness: float = 0.55):
    result = bpy.data.materials.new(name)
    result.diffuse_color = color
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    return result


def rounded_cube(name: str, location, scale, surface, radius: float = 0.025):
    bpy.ops.mesh.primitive_cube_add(location=location)
    result = bpy.context.object
    result.name = name
    result.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    result.data.materials.append(surface)
    bevel = result.modifiers.new("QA soft edges", "BEVEL")
    bevel.width = radius
    bevel.segments = 3
    return result


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def rotate_joint(name: str, x: float = 0.0, y: float = 0.0, z: float = 0.0) -> None:
    joint = bpy.data.objects.get(name)
    if joint is None:
        return
    joint.rotation_mode = "XYZ"
    joint.rotation_euler.rotate_axis("X", x)
    joint.rotation_euler.rotate_axis("Y", y)
    joint.rotation_euler.rotate_axis("Z", z)


def main() -> int:
    args = parse_args()
    source = Path(args.input).resolve()
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))

    floor = make_material("QA limestone", (0.78, 0.82, 0.80, 1.0), 0.72)
    chair = make_material("QA chair", (0.12, 0.18, 0.18, 1.0), 0.40)
    oak = make_material("QA oak", (0.50, 0.28, 0.13, 1.0), 0.44)
    dark = make_material("QA equipment", (0.025, 0.035, 0.04, 1.0), 0.30)
    cyan = make_material("QA screen", (0.08, 0.72, 0.72, 1.0), 0.24)

    rounded_cube("QA floor", (0, 0, -0.035), (2.0, 2.0, 0.03), floor)
    rounded_cube("QA seat", (0, 0.10, 0.63), (0.28, 0.25, 0.045), chair)
    rounded_cube("QA back", (0, 0.31, 0.91), (0.28, 0.045, 0.30), chair)
    rounded_cube("QA desk", (0, -0.59, 0.88), (0.66, 0.25, 0.035), oak)
    rounded_cube("QA keyboard", (0, -0.78, 0.93), (0.26, 0.085, 0.012), dark, 0.008)
    rounded_cube("QA monitor", (0, -0.54, 1.30), (0.42, 0.028, 0.23), dark, 0.018)
    rounded_cube("QA display", (0, -0.574, 1.30), (0.38, 0.008, 0.19), cyan, 0.012)

    scene = bpy.context.scene
    world = scene.world or bpy.data.worlds.new("QA daylight")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.70, 0.80, 0.88, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.58

    for name, location, energy, size, color in (
        ("QA key", (-2.6, -3.0, 4.2), 900, 3.2, (1.0, 0.96, 0.90)),
        ("QA fill", (3.0, -1.4, 3.0), 720, 3.0, (0.82, 0.93, 1.0)),
        ("QA rim", (0.4, 3.0, 3.6), 860, 2.6, (0.88, 1.0, 0.95)),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        data.color = color
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = location
        look_at(light, Vector((0, -0.04, 0.90)))

    camera_data = bpy.data.cameras.new("QA camera")
    camera = bpy.data.objects.new("QA camera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera

    # Headless Eevee requires compute-shader support that is unavailable on
    # some Windows CI/desktop GPUs. CPU Cycles is slower but reproducible.
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 12
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"

    views = {
        "focus": ((2.25, -2.70, 1.55), (0.0, -0.10, 0.94), 62),
        "face-closeup": ((0.28, -1.55, 1.53), (0.0, -0.02, 1.47), 105),
        "seated-front": ((0.0, -3.20, 1.18), (0.0, -0.08, 0.82), 66),
        "seated-side": ((3.20, 0.0, 1.16), (0.0, -0.05, 0.82), 66),
    }
    for name, (position, target, lens) in views.items():
        isolate_face = name == "face-closeup"
        for proxy_name in ("QA desk", "QA keyboard", "QA monitor", "QA display", "QA chair", "QA seat", "QA back"):
            proxy = bpy.data.objects.get(proxy_name)
            if proxy is not None:
                proxy.hide_render = isolate_face
        camera.location = position
        camera.data.lens = lens
        look_at(camera, Vector(target))
        scene.render.filepath = str(output / f"a01-{name}.png")
        bpy.ops.render.render(write_still=True)
        print("PHASE0_AUDIT_RENDER", name, scene.render.filepath)

    # Match the small alternating wrist/elbow deltas used by the browser's
    # working state so that the typing evidence reflects the actual rig design.
    rotate_joint("SpineJoint", x=0.07)
    rotate_joint("HeadJoint", x=0.075)
    rotate_joint("ElbowLJoint", x=0.07)
    rotate_joint("ElbowRJoint", x=-0.07)
    rotate_joint("WristLJoint", x=0.08, y=0.035)
    rotate_joint("WristRJoint", x=-0.08, y=-0.035)
    camera.location = (2.0, -2.55, 1.38)
    camera.data.lens = 72
    look_at(camera, Vector((0.0, -0.22, 0.94)))
    scene.render.filepath = str(output / "a01-typing.png")
    bpy.ops.render.render(write_still=True)
    print("PHASE0_AUDIT_RENDER", "typing", scene.render.filepath)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

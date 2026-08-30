"""Render a neutral QA turntable from Blender's official stylized human base mesh.

The input .blend is an asset-library file with no scene. Run this script by opening
the library file first so Blender has loaded the source collections, for example:

    blender --factory-startup --disable-autoexec -b INPUT.blend \
      --python render_official_stylized_base.py -- --output OUTPUT_DIR
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


MALE_COLLECTION = "Body Male - Stylized"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--views", default="front,three-quarter,side,back")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float,
) -> bpy.types.Material:
    surface = bpy.data.materials.new(name)
    surface.use_nodes = True
    surface.diffuse_color = color
    shader = surface.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    return surface


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def world_bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    corners = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    minimum = Vector(tuple(min(point[index] for point in corners) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in corners) for index in range(3)))
    return minimum, maximum


def main() -> int:
    args = parse_args()
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)

    source = bpy.data.collections.get(MALE_COLLECTION)
    if source is None:
        raise RuntimeError(f"Missing source collection: {MALE_COLLECTION}")

    scene = bpy.context.scene
    for collection in bpy.data.collections:
        visible = collection == source
        collection_objects = [item for item in collection.all_objects if item is not None]
        for obj in collection_objects:
            obj.hide_render = not visible
            obj.hide_viewport = not visible
    if source.name not in {collection.name for collection in scene.collection.children}:
        scene.collection.children.link(source)
    character = [obj for obj in source.all_objects if obj.type == "MESH"]
    if not character:
        raise RuntimeError("The stylized male collection contains no mesh objects")

    minimum, maximum = world_bounds(character)
    offset = Vector((-(minimum.x + maximum.x) / 2, -(minimum.y + maximum.y) / 2, -minimum.z))
    character_names = {obj.name for obj in character}
    roots = [obj for obj in character if obj.parent is None or obj.parent.name not in character_names]
    for obj in roots:
        obj.location += offset
    for obj in character:
        obj.hide_render = False
        obj.hide_viewport = False

    skin = make_material("A01 skin audit", (0.53, 0.31, 0.20, 1), 0.62)
    eye = make_material("A01 eye audit", (0.035, 0.025, 0.020, 1), 0.28)
    for obj in character:
        obj.data.materials.clear()
        obj.data.materials.append(eye if ".eye." in obj.name else skin)

    floor_surface = make_material("QA limestone", (0.77, 0.82, 0.81, 1), 0.72)
    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, -0.006))
    floor = bpy.context.object
    floor.name = "QA floor"
    floor.data.materials.append(floor_surface)

    world = scene.world or bpy.data.worlds.new("QA daylight")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.73, 0.83, 0.91, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.55

    for name, location, energy, size, color in (
        ("Key", (-2.7, -3.4, 4.1), 850, 3.2, (1.0, 0.97, 0.91)),
        ("Fill", (3.2, -1.2, 2.8), 650, 3.0, (0.82, 0.92, 1.0)),
        ("Rim", (0.8, 3.1, 3.3), 780, 2.5, (0.88, 1.0, 0.96)),
    ):
        light_data = bpy.data.lights.new(name, "AREA")
        light_data.energy = energy
        light_data.shape = "DISK"
        light_data.size = size
        light_data.color = color
        light = bpy.data.objects.new(name, light_data)
        scene.collection.objects.link(light)
        light.location = location
        look_at(light, Vector((0, 0, 0.95)))

    camera_data = bpy.data.cameras.new("QA camera")
    camera_data.lens = 66
    camera = bpy.data.objects.new("QA camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 640
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.look = "AgX - Medium High Contrast"

    views = {
        "front": (0.0, -3.2, 1.02),
        "three-quarter": (2.25, -2.35, 1.06),
        "side": (3.2, 0.0, 1.02),
        "back": (0.0, 3.2, 1.04),
    }
    requested_views = [item.strip() for item in args.views.split(",") if item.strip()]
    for view in requested_views:
        if view not in views:
            raise ValueError(f"Unknown view: {view}")
        location = views[view]
        camera.location = location
        look_at(camera, Vector((0, 0, 0.92)))
        scene.render.filepath = str(output / f"a01-official-stylized-{view}.png")
        bpy.ops.render.render(write_still=True)
        print("A01_STYLIZED_BASE_RENDER", view, scene.render.filepath)

    clean_blend = output / "a01-official-stylized-base-audit.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(clean_blend), check_existing=False)
    payload = {
        "source_collection": MALE_COLLECTION,
        "meshes": len(character),
        "vertices": sum(len(obj.data.vertices) for obj in character),
        "triangles": sum(
            sum(max(0, len(poly.vertices) - 2) for poly in obj.data.polygons)
            for obj in character
        ),
        "armatures": 0,
        "embedded_texts": len(bpy.data.texts),
        "output_blend": str(clean_blend),
    }
    (output / "audit.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("A01_STYLIZED_BASE_AUDIT", json.dumps(payload))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

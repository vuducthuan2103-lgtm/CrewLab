"""Measure an authored CrewLab Virtual Office Blender scene.

Run with:
    blender --background path/to/office.blend --python audit_virtual_office_environment.py -- --output metrics.json

The report intentionally uses source-scene object names so environment art can
be budgeted before the runtime export batches meshes by material.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import bpy


AGENT_CODES = ("a01", "b02", "b03", "d01", "d02", "e01")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    argv = []
    if "--" in __import__("sys").argv:
        argv = __import__("sys").argv[__import__("sys").argv.index("--") + 1 :]
    return parser.parse_args(argv)


def triangle_count(obj: bpy.types.Object) -> int:
    if obj.type != "MESH":
        return 0
    return sum(max(0, len(polygon.vertices) - 2) for polygon in obj.data.polygons)


def object_materials(obj: bpy.types.Object) -> set[str]:
    if obj.type != "MESH":
        return set()
    return {slot.material.name for slot in obj.material_slots if slot.material is not None}


def matches_category(name: str, category: str) -> bool:
    lower = name.lower()
    if category == "central_tree":
        return "ficus" in lower
    if category == "forest_backdrop":
        return "exterior garden plate" in lower or "exterior garden canopy" in lower
    if category == "indoor_vegetation":
        tokens = (
            "integrated layered foliage",
            "desk plant",
            "focus living wall",
            "pavilion border foliage",
            "plaza tropical planting",
            "layered tropical borders",
        )
        return any(token in lower for token in tokens)
    if category == "monitor":
        return any(lower.startswith(f"{code} monitor") for code in AGENT_CODES)
    if category == "glass":
        return "glass" in lower
    return False


def summarize(objects: list[bpy.types.Object]) -> dict[str, object]:
    materials: set[str] = set()
    for obj in objects:
        materials.update(object_materials(obj))
    return {
        "objects": len(objects),
        "meshes": sum(obj.type == "MESH" for obj in objects),
        "triangles": sum(triangle_count(obj) for obj in objects),
        "materials": sorted(materials),
    }


def main() -> None:
    args = parse_args()
    objects = list(bpy.context.scene.objects)
    meshes = [obj for obj in objects if obj.type == "MESH"]
    categories = {
        name: summarize([obj for obj in objects if matches_category(obj.name, name)])
        for name in ("central_tree", "forest_backdrop", "indoor_vegetation", "monitor", "glass")
    }
    images = []
    for image in bpy.data.images:
        width, height = image.size[:]
        images.append(
            {
                "name": image.name,
                "width": int(width),
                "height": int(height),
                "source": image.source,
                "filepath": bpy.path.abspath(image.filepath) if image.filepath else None,
                "decoded_rgba_bytes": int(width * height * 4),
            }
        )

    scene = bpy.context.scene
    camera = scene.camera
    report = {
        "blend_file": bpy.data.filepath,
        "scene": {
            "objects": len(objects),
            "meshes": len(meshes),
            "triangles": sum(triangle_count(obj) for obj in meshes),
            "materials": len(bpy.data.materials),
            "images": len(images),
            "lights": sum(obj.type == "LIGHT" for obj in objects),
            "shadow_caster_candidates": sum(
                obj.type == "MESH" and "water" not in obj.name.lower() for obj in objects
            ),
        },
        "categories": categories,
        "textures": images,
        "camera": None
        if camera is None
        else {
            "name": camera.name,
            "location": [round(value, 4) for value in camera.location],
            "rotation_euler": [round(value, 6) for value in camera.rotation_euler],
            "lens_mm": camera.data.lens,
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"CREWLAB_ENV_AUDIT={args.output}")


if __name__ == "__main__":
    main()

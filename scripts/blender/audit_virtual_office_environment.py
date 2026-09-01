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
    if category == "exterior_vegetation":
        tokens = (
            "v9 exterior olive",
            "v9 exterior acacia",
            "v9 rooftop hedge",
            "v9 rooftop shrub",
            "v9 rooftop grass",
            "v9 rooftop low border",
        )
        return any(token in lower for token in tokens)
    if category == "skyline":
        return (
            lower.startswith("v9 far skyline")
            or lower.startswith("v9 mid skyline")
            or lower.startswith("v9 skyline landmark")
            or lower.startswith("v9 skyline podium")
        )
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


def monitor_alignment() -> dict[str, object]:
    """Verify every emissive screen is offset toward its seated operator."""
    direction_dots: dict[str, list[float]] = {}
    for code in AGENT_CODES:
        authored_code = code.upper()
        chair = bpy.data.objects.get(f"{authored_code} chair seat")
        screens = sorted(
            (
                obj
                for obj in bpy.context.scene.objects
                if obj.name.startswith(f"{authored_code} monitor") and obj.name.endswith(" Screen")
            ),
            key=lambda obj: obj.name,
        )
        values: list[float] = []
        if chair is not None:
            chair_position = chair.matrix_world.translation
            for screen in screens:
                bezel = bpy.data.objects.get(screen.name.removesuffix(" Screen") + " bezel")
                if bezel is None:
                    continue
                bezel_position = bezel.matrix_world.translation
                screen_direction = (screen.matrix_world.translation - bezel_position).normalized()
                operator_direction = (chair_position - bezel_position).normalized()
                values.append(round(screen_direction.dot(operator_direction), 6))
        direction_dots[code] = values

    flattened = [value for values in direction_dots.values() for value in values]
    return {
        "direction_dots": direction_dots,
        "minimum_direction_dot": min(flattened) if flattened else None,
        # Side monitors are deliberately fanned, so their bezel-to-screen
        # vector is only partially aligned with the chair vector. A positive
        # dot above 0.45 proves the emissive face is on the operator half-space;
        # the historical reversed screens produce a negative value.
        "all_face_operator": bool(flattened) and all(value > 0.45 for value in flattened),
    }


def main() -> None:
    args = parse_args()
    objects = list(bpy.context.scene.objects)
    meshes = [obj for obj in objects if obj.type == "MESH"]
    categories = {
        name: summarize([obj for obj in objects if matches_category(obj.name, name)])
        for name in (
            "central_tree",
            "forest_backdrop",
            "indoor_vegetation",
            "exterior_vegetation",
            "skyline",
            "monitor",
            "glass",
        )
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
        "monitor_alignment": monitor_alignment(),
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

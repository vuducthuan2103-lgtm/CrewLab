"""Repair exposed torso gaps in existing CrewLab character candidate blends.

Run this against a candidate ``.blend`` before the normal GLB exporter. It
assigns the existing role-specific top material to a fitted body underlayer,
so coarse garment extraction boundaries cannot expose the chest or waist.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy


OUTFIT_RANGES = {
    "A01": {"top_min": 0.90, "top_max": 1.45},
    "B02": {"top_min": 0.82, "top_max": 1.20},
    "B03": {"top_min": 0.90, "top_max": 1.45},
    "D01": {"top_min": 0.82, "top_max": 1.20},
    "D02": {"top_min": 0.82, "top_max": 1.20},
    "E01": {"top_min": 0.90, "top_max": 1.45},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", choices=sorted(OUTFIT_RANGES), required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def find_body() -> bpy.types.Object:
    candidates = [
        obj
        for obj in bpy.context.scene.objects
        if (
            obj.type == "MESH"
            and obj.name.startswith("GEO-body_")
            and ".eye." not in obj.name
            and not obj.hide_render
        )
    ]
    if len(candidates) != 1:
        raise RuntimeError(f"Expected one stylized body mesh, found {[obj.name for obj in candidates]}")
    return candidates[0]


def main() -> int:
    args = parse_args()
    body = find_body()
    if len(body.data.materials) < 4:
        raise RuntimeError(f"{body.name} needs skin, top, trousers and shoe material slots")

    ranges = OUTFIT_RANGES[args.agent]
    counts = {"skin": 0, "top": 0, "trousers": 0, "shoes": 0}
    for polygon in body.data.polygons:
        point = polygon.center
        x, z = abs(point.x), point.z
        if z < 0.135:
            polygon.material_index = 3
            counts["shoes"] += 1
        elif z < ranges["top_min"] - 0.06 and x < 0.34:
            polygon.material_index = 2
            counts["trousers"] += 1
        elif ranges["top_min"] - 0.08 <= z < ranges["top_max"] + 0.04 and x < 0.40:
            polygon.material_index = 1
            counts["top"] += 1
        else:
            polygon.material_index = 0
            counts["skin"] += 1

    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output), check_existing=False)
    print(
        "CREWLAB_OUTFIT_REPAIR",
        json.dumps({"agent": args.agent, "body": body.name, "polygons": counts, "output": str(output)}),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

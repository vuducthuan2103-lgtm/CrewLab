"""Render the midpoint of every required CrewLab character action for visual QA."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy


REQUIRED_ACTIONS = (
    "seated_idle",
    "typing",
    "thinking",
    "screen_review",
    "tablet_work",
    "waiting_human",
    "success",
    "error_rework",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--agent", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def main() -> int:
    args = parse_args()
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    rig = bpy.data.objects.get(f"{args.agent}_CharacterRoot")
    if rig is None:
        raise RuntimeError(f"Missing {args.agent}_CharacterRoot")
    missing = [name for name in REQUIRED_ACTIONS if bpy.data.actions.get(name) is None]
    if missing:
        raise RuntimeError(f"Missing required actions: {missing}")

    scene = bpy.context.scene
    scene.render.resolution_x = 480
    scene.render.resolution_y = 480
    scene.render.resolution_percentage = 100
    if scene.render.engine == "CYCLES":
        scene.cycles.samples = 8
        scene.cycles.use_denoising = True
    rig.animation_data_create()
    for name in REQUIRED_ACTIONS:
        action = bpy.data.actions[name]
        rig.animation_data.action = action
        start, end = action.frame_range
        frame = round((start + end) * 0.5)
        scene.frame_set(frame)
        scene.render.filepath = str(output / f"{args.agent.lower()}-{name}-{frame:03d}.png")
        bpy.ops.render.render(write_still=True)
        print("CREWLAB_ACTION_QA", args.agent, name, frame, scene.render.filepath)
    rig.animation_data.action = None
    scene.frame_set(1)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

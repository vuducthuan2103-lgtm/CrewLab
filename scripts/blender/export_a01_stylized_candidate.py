"""Export an approved CrewLab character candidate from its QA blend to binary glTF."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--agent", default="A01")
    parser.add_argument("--gltfpack", action="store_true")
    parser.add_argument("--meshopt", action="store_true")
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])


def is_character_object(obj: bpy.types.Object, agent_code: str) -> bool:
    if obj.name == f"{agent_code}_CharacterRoot":
        return True
    if obj.type == "EMPTY" and obj.get("crewlab_anchor_role"):
        return True
    if obj.type != "MESH":
        return False
    if obj.name.startswith("QA "):
        return False
    if ".eye." in obj.name:
        return False
    return not obj.hide_render


def main() -> int:
    args = parse_args()
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="DESELECT")
    selected = []
    for obj in bpy.context.scene.objects:
        if is_character_object(obj, args.agent):
            obj.hide_set(False)
            obj.select_set(True)
            selected.append(obj.name)

    rig_name = f"{args.agent}_CharacterRoot"
    rig = bpy.data.objects.get(rig_name)
    if rig is None or rig not in bpy.context.selected_objects:
        raise RuntimeError(f"{rig_name} is missing from export selection")
    bpy.context.view_layer.objects.active = rig

    bpy.ops.export_scene.gltf(
        filepath=str(output),
        check_existing=False,
        export_format="GLB",
        use_selection=True,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
        export_apply=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_def_bones=True,
        export_leaf_bone=False,
        export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_armature=True,
        export_skins=True,
        export_all_influences=False,
        export_morph=False,
        export_draco_mesh_compression_enable=False,
        export_meshopt_compression_enable=args.meshopt,
        export_meshopt_extension="EXT_meshopt_compression",
        export_use_gltfpack=args.gltfpack,
        export_gltfpack_si=0.6,
        export_gltfpack_sa=True,
        export_gltfpack_kn=True,
    )
    payload = {
        "output": str(output),
        "bytes": output.stat().st_size,
        "objects": selected,
        "actions": sorted(action.name for action in bpy.data.actions),
    }
    manifest = output.with_suffix(".json")
    manifest.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"{args.agent}_GLTF_EXPORT", json.dumps(payload))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

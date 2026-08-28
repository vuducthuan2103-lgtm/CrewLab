"""Install and verify the local MPFB Blender extension.

Run with Blender in background mode and the dedicated CrewLab Blender profile.
This deliberately avoids touching a developer's personal Blender configuration.
"""

from __future__ import annotations

import argparse
import sys
import traceback
from pathlib import Path

import bpy


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", required=True, dest="archive")
    parser.add_argument("--repo", default="crewlab_local")
    parser.add_argument("--repo-dir", required=True)
    parser.add_argument("--data-root", required=True)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])

    archive = Path(args.archive).resolve()
    repo_dir = Path(args.repo_dir).resolve()
    data_root = Path(args.data_root).resolve()
    if not archive.is_file():
        raise FileNotFoundError(archive)
    repo_dir.mkdir(parents=True, exist_ok=True)
    data_root.mkdir(parents=True, exist_ok=True)

    matching_repo = next(
        (
            repo
            for repo in bpy.context.preferences.extensions.repos
            if Path(repo.directory).resolve() == repo_dir
        ),
        None,
    )
    if matching_repo is None:
        bpy.ops.preferences.extension_repo_add(
            name="CrewLab Local",
            type="LOCAL",
            use_custom_directory=True,
            custom_directory=str(repo_dir),
        )
        matching_repo = next(
            repo
            for repo in bpy.context.preferences.extensions.repos
            if Path(repo.directory).resolve() == repo_dir
        )

    repo_module = matching_repo.module
    print("CREWLAB_REPO", repo_module, matching_repo.directory)

    print("EXTENSION_REPOS_BEFORE")
    for repo in bpy.context.preferences.extensions.repos:
        print(repo.name, repo.module, repo.directory, repo.source)

    try:
        result = bpy.ops.extensions.package_install_files(
            filepath=str(archive),
            repo=repo_module,
            enable_on_install=True,
            overwrite=True,
        )
        print("INSTALL_RESULT", result)
    except Exception:
        traceback.print_exc()
        return 1

    bpy.ops.wm.save_userpref()

    mpfb_addons = [
        module
        for module in bpy.context.preferences.addons.keys()
        if "mpfb" in module.lower()
    ]
    print("MPFB_ADDONS", mpfb_addons)
    print("MPFB_MODULES", [name for name in sys.modules if "mpfb" in name.lower()][:30])

    if not mpfb_addons:
        print("ERROR: MPFB was installed but is not enabled")
        return 2

    preferences = bpy.context.preferences.addons[mpfb_addons[0]].preferences
    preferences.mpfb_user_data = str(data_root)
    preferences.mh_auto_user_data = False
    bpy.ops.wm.save_userpref()
    print("MPFB_USER_DATA", preferences.mpfb_user_data)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

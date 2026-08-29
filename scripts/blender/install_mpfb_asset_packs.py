"""Install official MakeHuman CC0 asset packs into CrewLab's MPFB data root."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("archives", nargs="+")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :])

    addon_module = next(
        module
        for module in bpy.context.preferences.addons.keys()
        if "mpfb" in module.lower()
    )
    addon = sys.modules[addon_module]
    services = __import__(f"{addon.__name__}.services", fromlist=["AssetService", "LocationService"])
    asset_service = services.AssetService
    location_service = services.LocationService

    print("MPFB_USER_HOME", location_service.get_user_home())
    print("MPFB_USER_DATA", location_service.get_user_data())

    for archive_arg in args.archives:
        archive = Path(archive_arg).resolve()
        if not archive.is_file():
            raise FileNotFoundError(archive)
        validation_error = asset_service.check_asset_pack_zip(str(archive))
        if validation_error is None:
            result = bpy.ops.mpfb.load_pack(filepath=str(archive))
        else:
            print("PACK_REQUIRES_NORMALIZATION", archive.name, validation_error)
            fix_error = asset_service.fix_and_extract_asset_pack_zip(
                str(archive), location_service.get_user_data()
            )
            if fix_error is not None:
                raise RuntimeError(f"Could not install {archive.name}: {fix_error}")
            asset_service.update_all_asset_lists()
            result = {"FINISHED"}
        print("PACK_INSTALLED", archive.name, result)

    asset_service.update_all_asset_lists()
    print("PACK_NAMES", asset_service.get_pack_names())
    print(
        "SYSTEM_ASSETS",
        asset_service.check_if_modern_makehuman_system_assets_installed(),
    )
    return 0 if asset_service.system_assets_pack_is_installed() else 2


if __name__ == "__main__":
    raise SystemExit(main())

"""Build compact v4 PBR texture maps from project-owned image sources."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageOps


ROOT = Path(__file__).resolve().parents[2]
TEXTURE_DIR = ROOT / "portal" / "public" / "virtual-office" / "textures" / "v4"
SIZE = (1024, 1024)


def normal_from_height(image: Image.Image, strength: float) -> Image.Image:
    height = ImageOps.autocontrast(ImageOps.grayscale(image))
    left = ImageOps.expand(height, border=1).crop((0, 1, height.width, height.height + 1))
    right = ImageOps.expand(height, border=1).crop((2, 1, height.width + 2, height.height + 1))
    up = ImageOps.expand(height, border=1).crop((1, 0, height.width + 1, height.height))
    down = ImageOps.expand(height, border=1).crop((1, 2, height.width + 1, height.height + 2))
    nx = ImageChops.subtract(left, right, scale=1.0 / strength, offset=128)
    ny = ImageChops.subtract(down, up, scale=1.0 / strength, offset=128)
    nz = Image.new("L", height.size, 246)
    return Image.merge("RGB", (nx, ny, nz))


def build_material(slug: str, *, normal_strength: float, roughness: float) -> None:
    source_path = TEXTURE_DIR / f"tex-{slug}-albedo-source.png"
    source = Image.open(source_path).convert("RGB").resize(SIZE, Image.Resampling.LANCZOS)
    source.save(TEXTURE_DIR / f"tex-{slug}-albedo.jpg", quality=90, optimize=True, progressive=True)

    normal_from_height(source, normal_strength).save(
        TEXTURE_DIR / f"tex-{slug}-normal.jpg", quality=90, optimize=True
    )

    rough = ImageOps.grayscale(source)
    rough = ImageOps.autocontrast(rough, cutoff=2)
    rough = ImageEnhance.Contrast(rough).enhance(0.32)
    # Pull the range toward the authored scalar while retaining fine variation.
    target = int(max(0.0, min(1.0, roughness)) * 255)
    rough = Image.blend(Image.new("L", SIZE, target), rough, 0.18)
    rough.save(TEXTURE_DIR / f"tex-{slug}-roughness.jpg", quality=88, optimize=True)


def main() -> None:
    build_material("limestone", normal_strength=1.25, roughness=0.72)
    build_material("oak", normal_strength=0.82, roughness=0.43)
    build_material("ficus-bark", normal_strength=1.75, roughness=0.84)
    print(f"CREWLAB_V4_TEXTURES={TEXTURE_DIR}")


if __name__ == "__main__":
    main()

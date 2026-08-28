"""Prepare generated v5 image references for deterministic Blender/WebGL use.

The image generator sometimes visualizes transparency as a pale checkerboard in
an RGB image. This script reconstructs a soft alpha matte, removes the pale
background contamination and writes power-of-two runtime textures.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[2]
CHARACTER_DIR = ROOT / "portal" / "public" / "virtual-office" / "characters" / "v5"
REFERENCE_DIR = ROOT / "portal" / "public" / "virtual-office" / "references" / "v5"
RUNTIME_DIR = ROOT / "portal" / "public" / "virtual-office" / "textures" / "v5"
CHARACTER_CODES = ("A01", "B02", "B03", "D01", "D02", "E01")


def checker_alpha(image: Image.Image) -> Image.Image:
    """Return a soft foreground matte for pale low-chroma checker backgrounds."""
    rgb = image.convert("RGB")
    red, green, blue = rgb.split()
    minimum = ImageChops.darker(ImageChops.darker(red, green), blue)
    maximum = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    chroma = ImageChops.subtract(maximum, minimum)

    # Dark content becomes opaque at min=166 and pale checker becomes clear at
    # min=226. Saturated skin/clothing stays opaque even where sunlit.
    darkness = minimum.point(lambda value: max(0, min(255, round((226 - value) * 255 / 60))))
    saturation = chroma.point(lambda value: max(0, min(255, round(value * 255 / 34))))
    alpha = ImageChops.lighter(darkness, saturation)
    # Remove pale neutral cast shadows/checker cells before connectivity cleanup.
    neutral_light = Image.new("L", rgb.size)
    neutral_pixels = neutral_light.load()
    min_pixels = minimum.load()
    chroma_pixels = chroma.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            neutral_pixels[x, y] = 0 if min_pixels[x, y] > 145 and chroma_pixels[x, y] < 16 else 255
    alpha = ImageChops.multiply(alpha, neutral_light)
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.7))
    alpha = ImageEnhance.Contrast(alpha).enhance(1.18)
    return keep_largest_component(alpha)


def keep_largest_component(alpha: Image.Image, threshold: int = 22) -> Image.Image:
    """Discard disconnected checker/color noise while retaining soft edge alpha."""
    width, height = alpha.size
    values = alpha.tobytes()
    visited = bytearray(width * height)
    largest: list[int] = []
    for start, value in enumerate(values):
        if value <= threshold or visited[start]:
            continue
        visited[start] = 1
        queue = deque([start])
        component: list[int] = []
        while queue:
            index = queue.popleft()
            component.append(index)
            x = index % width
            y = index // width
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if nx < 0 or nx >= width or ny < 0 or ny >= height:
                    continue
                neighbor = ny * width + nx
                if not visited[neighbor] and values[neighbor] > threshold:
                    visited[neighbor] = 1
                    queue.append(neighbor)
        if len(component) > len(largest):
            largest = component
    if not largest:
        raise ValueError("No foreground component found")
    cleaned = bytearray(width * height)
    for index in largest:
        cleaned[index] = values[index]
    result = Image.frombytes("L", (width, height), bytes(cleaned))
    return result.filter(ImageFilter.GaussianBlur(0.45))


def decontaminate_white(rgb: Image.Image, alpha: Image.Image) -> Image.Image:
    """Undo white/checker spill on semi-transparent silhouette edges."""
    source = rgb.convert("RGB")
    output = Image.new("RGB", source.size)
    src_pixels = source.load()
    alpha_pixels = alpha.load()
    out_pixels = output.load()
    for y in range(source.height):
        for x in range(source.width):
            a = alpha_pixels[x, y] / 255.0
            if a <= 0.02:
                out_pixels[x, y] = (0, 0, 0)
                continue
            out_pixels[x, y] = tuple(
                max(0, min(255, round((channel - 255 * (1.0 - a)) / a)))
                for channel in src_pixels[x, y]
            )
    return output


def place_on_pot_canvas(image: Image.Image, size: int = 1024) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.point(lambda value: 255 if value > 12 else 0).getbbox()
    if bbox is None:
        raise ValueError("Character alpha matte is empty")
    cropped = image.crop(bbox)
    max_height = round(size * 0.94)
    max_width = round(size * 0.92)
    scale = min(max_width / cropped.width, max_height / cropped.height)
    resized = cropped.resize(
        (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - resized.width) // 2
    y = size - resized.height - round(size * 0.025)
    canvas.alpha_composite(resized, (x, y))
    return canvas


def prepare_character(code: str) -> None:
    source_path = CHARACTER_DIR / f"{code}.png"
    if not source_path.exists():
        raise FileNotFoundError(source_path)
    source = Image.open(source_path).convert("RGB")
    alpha = checker_alpha(source)
    cleaned_rgb = decontaminate_white(source, alpha)
    rgba = cleaned_rgb.convert("RGBA")
    rgba.putalpha(alpha)
    runtime = place_on_pot_canvas(rgba)
    output_path = RUNTIME_DIR / f"char-{code.lower()}-alpha.png"
    runtime.save(output_path, optimize=True)
    extrema = runtime.getchannel("A").getextrema()
    if extrema != (0, 255):
        raise ValueError(f"Unexpected alpha extrema for {code}: {extrema}")
    print(f"CHARACTER={code} SIZE={runtime.size} ALPHA={extrema} OUTPUT={output_path}")


def prepare_exterior() -> None:
    source_path = REFERENCE_DIR / "ref-02-exterior-garden.png"
    source = Image.open(source_path).convert("RGB")
    target_ratio = 2.0
    source_ratio = source.width / source.height
    if source_ratio > target_ratio:
        target_width = round(source.height * target_ratio)
        left = (source.width - target_width) // 2
        source = source.crop((left, 0, left + target_width, source.height))
    else:
        target_height = round(source.width / target_ratio)
        top = (source.height - target_height) // 2
        source = source.crop((0, top, source.width, top + target_height))
    exterior = source.resize((2048, 1024), Image.Resampling.LANCZOS)
    exterior = ImageEnhance.Contrast(exterior).enhance(0.92)
    output_path = RUNTIME_DIR / "exterior-garden-depth.jpg"
    exterior.save(output_path, quality=88, optimize=True, progressive=True)
    print(f"EXTERIOR SIZE={exterior.size} OUTPUT={output_path}")


def main() -> None:
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    for code in CHARACTER_CODES:
        prepare_character(code)
    prepare_exterior()


if __name__ == "__main__":
    main()

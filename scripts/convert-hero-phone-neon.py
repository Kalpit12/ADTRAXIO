"""Bake neon-black hero art from the pink studio reference JPG."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "images" / "realistic-phone-studio-social-media-concept.jpg"
OUTPUT_WEBP = ROOT / "public" / "images" / "hero-phone-social-neon.webp"
OUTPUT_PNG = ROOT / "public" / "images" / "hero-phone-social-neon.png"

BG = (5, 5, 6)
ACCENT = (158, 205, 58)


def is_studio_pink(r: int, g: int, b: int) -> bool:
    if r < 120 or b < 100:
        return False
    if g > 210:
        return False
    pink_score = r - g
    return pink_score > 25 and r > g > b - 40


def grade_subject(r: int, g: int, b: int) -> tuple[int, int, int]:
    r, g, b = r * 0.78, g * 0.78, b * 0.82
    lum = (r + g + b) / 3.0
    if lum > 90:
        mix = min(1.0, (lum - 90) / 120.0)
        r = r * (1 - mix) + ACCENT[0] * mix * 0.35
        g = g * (1 - mix) + ACCENT[1] * mix * 0.45
        b = b * (1 - mix) + ACCENT[2] * mix * 0.2
    r = min(255, r * 1.08)
    g = min(255, g * 1.12)
    b = min(255, b * 1.05)
    return int(r), int(g), int(b)


def add_vignette(img: Image.Image) -> Image.Image:
    w, h = img.size
    vignette = Image.new("L", (w, h), 0)
    px = vignette.load()
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    max_d = (cx * cx + cy * cy) ** 0.5
    for y in range(h):
        for x in range(w):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / max_d
            px[x, y] = int(max(0, min(255, 255 * (1.0 - d**2 * 0.55))))
    dark = Image.new("RGB", (w, h), BG)
    return Image.composite(img, dark, vignette)


def add_accent_glow(img: Image.Image) -> Image.Image:
    w, h = img.size
    glow = Image.new("RGB", (w, h), BG)
    px = glow.load()
    cx, cy = w * 0.62, h * 0.42
    max_d = w * 0.55
    for y in range(h):
        for x in range(w):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / max_d
            t = max(0.0, 1.0 - d) ** 2
            px[x, y] = (
                int(BG[0] + (ACCENT[0] - BG[0]) * t * 0.22),
                int(BG[1] + (ACCENT[1] - BG[1]) * t * 0.28),
                int(BG[2] + (ACCENT[2] - BG[2]) * t * 0.12),
            )
    return Image.blend(img, glow, alpha=0.42)


def convert() -> None:
    if not SOURCE.is_file():
        raise FileNotFoundError(SOURCE)

    img = Image.open(SOURCE).convert("RGB")
    graded = Image.new("RGB", img.size)
    src_px = img.load()
    out_px = graded.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b = src_px[x, y]
            if is_studio_pink(r, g, b):
                out_px[x, y] = BG
            else:
                out_px[x, y] = grade_subject(r, g, b)

    graded = ImageEnhance.Contrast(graded).enhance(1.18)
    graded = ImageEnhance.Color(graded).enhance(1.12)
    graded = graded.filter(ImageFilter.UnsharpMask(radius=1.2, percent=90, threshold=3))
    graded = add_vignette(graded)
    graded = add_accent_glow(graded)

    OUTPUT_WEBP.parent.mkdir(parents=True, exist_ok=True)
    graded.save(OUTPUT_WEBP, format="WEBP", quality=88, method=6)
    graded.save(OUTPUT_PNG, format="PNG", optimize=True)
    print(f"Wrote {OUTPUT_WEBP}")
    print(f"Wrote {OUTPUT_PNG}")


if __name__ == "__main__":
    convert()

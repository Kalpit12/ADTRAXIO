"""Generate social icon and phone screen textures (neon black theme)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from theme_colors import (
    ACCENT,
    ACCENT_BRIGHT,
    BACKGROUND_ALT,
    FACEBOOK_GLYPH,
    FACEBOOK_TILE,
    INSTAGRAM_GLYPH,
    INSTAGRAM_TINT,
    SURFACE_ELEVATED,
    TWITTER_GLYPH,
    TWITTER_TILE,
    hex_to_rgb,
)

OUT_DIR = Path(__file__).resolve().parent / "textures"
SIZE = 512


def _save(name: str, img: Image.Image) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    img.save(path, format="PNG")
    return path


def _radial_glow(base_hex: str, glow_hex: str, glow_strength: float = 0.35) -> Image.Image:
    img = Image.new("RGB", (SIZE, SIZE), hex_to_rgb(base_hex))
    px = img.load()
    br, bg, bb = hex_to_rgb(base_hex)
    gr, gg, gb = hex_to_rgb(glow_hex)
    cx = cy = (SIZE - 1) / 2
    max_d = (cx * cx + cy * cy) ** 0.5
    for y in range(SIZE):
        for x in range(SIZE):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / max_d
            t = max(0.0, 1.0 - d) ** 2 * glow_strength
            px[x, y] = (
                int(br + (gr - br) * t),
                int(bg + (gg - bg) * t),
                int(bb + (gb - bb) * t),
            )
    return img


def _draw_neon_frame(draw: ImageDraw.ImageDraw, color: tuple[int, int, int]) -> None:
    inset = 18
    draw.rounded_rectangle(
        (inset, inset, SIZE - inset, SIZE - inset),
        radius=42,
        outline=color,
        width=6,
    )


def draw_instagram_glyph(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float) -> None:
    s = scale
    color = hex_to_rgb(INSTAGRAM_GLYPH)
    outer = int(118 * s)
    inner = int(78 * s)
    draw.rounded_rectangle(
        (cx - outer, cy - outer, cx + outer, cy + outer),
        radius=int(36 * s),
        outline=color,
        width=max(8, int(14 * s)),
    )
    draw.ellipse(
        (cx - inner, cy - inner, cx + inner, cy + inner),
        outline=color,
        width=max(8, int(14 * s)),
    )
    dot = int(18 * s)
    draw.ellipse(
        (
            cx + int(52 * s) - dot,
            cy - int(52 * s) - dot,
            cx + int(52 * s) + dot,
            cy - int(52 * s) + dot,
        ),
        fill=color,
    )


def draw_twitter_bird(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float) -> None:
    s = scale
    color = hex_to_rgb(TWITTER_GLYPH)
    body = [
        (cx - int(70 * s), cy + int(10 * s)),
        (cx - int(20 * s), cy - int(30 * s)),
        (cx + int(20 * s), cy - int(40 * s)),
        (cx + int(80 * s), cy - int(50 * s)),
        (cx + int(40 * s), cy - int(10 * s)),
        (cx + int(90 * s), cy + int(30 * s)),
        (cx + int(10 * s), cy + int(20 * s)),
        (cx - int(30 * s), cy + int(50 * s)),
        (cx - int(80 * s), cy + int(30 * s)),
    ]
    draw.polygon(body, fill=color)


def draw_facebook_f(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float) -> None:
    s = scale
    color = hex_to_rgb(FACEBOOK_GLYPH)
    try:
        font = ImageFont.truetype("arial.ttf", int(220 * s))
    except OSError:
        font = ImageFont.load_default()
    draw.text((cx - int(55 * s), cy - int(120 * s)), "f", fill=color, font=font)


def draw_play_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: float) -> None:
    s = scale
    accent = hex_to_rgb(ACCENT_BRIGHT)
    side = int(150 * s)
    draw.rounded_rectangle(
        (cx - side, cy - side, cx + side, cy + side),
        radius=int(34 * s),
        outline=accent,
        width=max(6, int(10 * s)),
    )
    tri = [
        (cx - int(30 * s), cy - int(50 * s)),
        (cx - int(30 * s), cy + int(50 * s)),
        (cx + int(62 * s), cy),
    ]
    draw.polygon(tri, fill=accent)


def make_tile(base: Image.Image, draw_fn, frame_color: tuple[int, int, int] | None = None) -> Image.Image:
    img = base.copy()
    draw = ImageDraw.Draw(img)
    if frame_color:
        _draw_neon_frame(draw, frame_color)
    draw_fn(draw, SIZE // 2, SIZE // 2, 1.0)
    return img


def main() -> None:
    accent_frame = hex_to_rgb(ACCENT)

    ig_base = _radial_glow(SURFACE_ELEVATED, INSTAGRAM_TINT, 0.55)
    _save(
        "instagram.png",
        make_tile(ig_base, draw_instagram_glyph, frame_color=accent_frame),
    )

    tw_base = _radial_glow(TWITTER_TILE, ACCENT, 0.12)
    _save("twitter.png", make_tile(tw_base, draw_twitter_bird, frame_color=accent_frame))

    fb_base = _radial_glow(FACEBOOK_TILE, ACCENT, 0.1)
    _save("facebook.png", make_tile(fb_base, draw_facebook_f, frame_color=accent_frame))

    screen = _radial_glow(BACKGROUND_ALT, ACCENT, 0.45)
    _save("phone_screen.png", make_tile(screen, draw_play_icon))

    print(f"Wrote neon-themed textures to {OUT_DIR}")


if __name__ == "__main__":
    main()

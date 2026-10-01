"""ADTRAXIO / aurevo-web design tokens (see src/app/globals.css)."""

from __future__ import annotations


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.lstrip("#")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def hex_to_rgba01(hex_color: str, alpha: float = 1.0) -> tuple[float, float, float, float]:
    r, g, b = hex_to_rgb(hex_color)
    return r / 255.0, g / 255.0, b / 255.0, alpha


# Marketing / auth aurora palette
BACKGROUND = "#050506"
BACKGROUND_ALT = "#080809"
SURFACE = "#141418"
SURFACE_ELEVATED = "#1c1c24"
SURFACE_TINT = "#101810"
SURFACE_TINT_DEEP = "#142010"
ACCENT = "#9ecd3a"
ACCENT_BRIGHT = "#a8d636"
FOREGROUND = "#f2f2ec"

# Brand icon accents on dark tiles (slightly lifted for neon-on-black)
INSTAGRAM_TINT = "#3d1f32"
TWITTER_TILE = "#0c1a24"
FACEBOOK_TILE = "#0a1528"
TWITTER_GLYPH = "#4db8ff"
FACEBOOK_GLYPH = "#4d8cff"
INSTAGRAM_GLYPH = "#ffb8e0"

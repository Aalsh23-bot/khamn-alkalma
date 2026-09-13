#!/usr/bin/env python3
"""Generate App Store / Capacitor icon + splash from the خمسة mark."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/workspace")
RES = ROOT / "resources"
RES.mkdir(parents=True, exist_ok=True)

CREAM = (243, 238, 228)
GREEN = (106, 170, 100)
INK = (251, 248, 241)


def rounded_rect(draw: ImageDraw.ImageDraw, box, radius: int, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def load_font(size: int) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size=size)
    return ImageFont.load_default()


def paint_mark(img: Image.Image, tile_ratio: float = 0.70) -> None:
    w, h = img.size
    side = int(min(w, h) * tile_ratio)
    x0 = (w - side) // 2
    y0 = (h - side) // 2
    radius = max(24, int(side * 0.16))
    draw = ImageDraw.Draw(img)
    rounded_rect(draw, [x0, y0, x0 + side, y0 + side], radius, GREEN)
    font = load_font(int(side * 0.62))
    text = "5"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = x0 + (side - tw) / 2 - bbox[0]
    ty = y0 + (side - th) / 2 - bbox[1] - side * 0.02
    draw.text((tx, ty), text, font=font, fill=INK)


def save_icon(path: Path, size: int, tile_ratio: float = 0.70) -> None:
    img = Image.new("RGB", (size, size), CREAM)
    paint_mark(img, tile_ratio=tile_ratio)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG")


def save_splash(path: Path, size: int) -> None:
    img = Image.new("RGB", (size, size), CREAM)
    paint_mark(img, tile_ratio=0.28)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG")


def main() -> None:
    save_icon(RES / "icon.png", 1024, 0.72)
    save_icon(RES / "icon-foreground.png", 1024, 0.62)
    bg = Image.new("RGB", (1024, 1024), CREAM)
    bg.save(RES / "icon-background.png", "PNG")
    save_splash(RES / "splash.png", 2732)
    # Also keep web PWA icons in sync
    save_icon(ROOT / "public" / "icon-512.png", 512, 0.72)
    save_icon(ROOT / "public" / "icon-192.png", 192, 0.72)
    print("wrote resources/icon.png, splash.png and public icons")


if __name__ == "__main__":
    main()

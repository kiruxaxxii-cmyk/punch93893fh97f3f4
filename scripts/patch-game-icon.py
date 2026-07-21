#!/usr/bin/env python3
"""Blur + resize source image and patch UIEngine games[0] + img_for_versions[0] in images.h"""

from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(
    r"C:\Users\devsc\.cursor\projects\c-Users-devsc-punch-client-site\assets"
    r"\c__Users_devsc_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images"
    r"_photo_2026-07-10_19-57-24-13f9c918-4386-44ed-97d7-0f77b4d78a2d.png"
)
IMAGES_H = ROOT / "UIEngine" / "framework" / "data" / "images.h"


def prepare(w: int, h: int, blur: int) -> bytes:
    img = Image.open(SRC).convert("RGBA")
    img = img.resize((w, h), Image.Resampling.LANCZOS)
    img = img.filter(ImageFilter.GaussianBlur(radius=blur))
    tint = Image.new("RGBA", img.size, (124, 58, 237, 38))
    return Image.alpha_composite(img, tint)


def to_c_array(data: bytes) -> str:
    lines = []
    row = []
    for b in data:
        row.append(f"0x{b:02X}")
        if len(row) == 16:
            lines.append("\t" + ", ".join(row) + ",")
            row = []
    if row:
        lines.append("\t" + ", ".join(row))
    return "\n".join(lines)


def patch_slot(text: str, array_name: str, slot: int, slot_size: int, png_bytes: bytes) -> str:
    if len(png_bytes) > slot_size:
        raise SystemExit(f"{array_name}[{slot}] PNG too large: {len(png_bytes)} > {slot_size}")
    marker = f"unsigned char {array_name}"
    pos = text.find(marker)
    if pos == -1:
        raise SystemExit(f"{array_name} not found")
    pos = text.find("{", pos)
    for _ in range(slot):
        depth = 0
        while pos < len(text):
            ch = text[pos]
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    pos += 1
                    break
            pos += 1
    entry_start = text.find("{", pos) + 1
    depth = 1
    i = entry_start
    while i < len(text) and depth:
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
        i += 1
    entry_end = i
    padded = png_bytes + b"\x00" * (slot_size - len(png_bytes))
    replacement = "\n" + to_c_array(padded) + "\n\t}"
    return text[:entry_start] + replacement + text[entry_end:]


def main():
    card = prepare(448, 252, 6)
    icon = prepare(24, 24, 4)
    card_png = ROOT / "UIEngine" / "framework" / "data" / "punch_1214_card.png"
    icon_png = ROOT / "UIEngine" / "framework" / "data" / "punch_1214_icon.png"
    card.save(card_png, format="PNG", optimize=True)
    icon.save(icon_png, format="PNG", optimize=True)
    card_bytes = card_png.read_bytes()
    icon_bytes = icon_png.read_bytes()

    text = IMAGES_H.read_text(encoding="utf-8")
    text = patch_slot(text, "games[6][241296]", 0, 241296, card_bytes)
    text = patch_slot(text, "img_for_versions[5][2022]", 0, 2022, icon_bytes)
    IMAGES_H.write_text(text, encoding="utf-8")
    print(f"Patched games[0]={len(card_bytes)}B, img_for_versions[0]={len(icon_bytes)}B")


if __name__ == "__main__":
    main()

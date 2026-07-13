#!/usr/bin/env python3
"""Build a Phaser bitmap font atlas from Press Start 2P."""

from __future__ import annotations

import math
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONT_PATH = ROOT / "assets" / "fonts" / "PressStart2P-Regular.ttf"
OUT_DIR = ROOT / "assets" / "fonts"
OUT_PNG = OUT_DIR / "world-label.png"
OUT_XML = OUT_DIR / "world-label.xml"

FONT_SIZE = 16
PADDING = 1
CHARS = "".join(chr(code) for code in range(32, 127))


def measure_char(draw, font, char: str) -> tuple[int, int, int, int, int]:
    bbox = draw.textbbox((0, 0), char, font=font)
    width = max(1, bbox[2] - bbox[0])
    height = max(1, bbox[3] - bbox[1])
    xoffset = bbox[0]
    yoffset = bbox[1]
    advance = width + 1
    return width, height, xoffset, yoffset, advance


def main() -> None:
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError as exc:
        raise SystemExit("Install Pillow first: python -m pip install pillow") from exc

    if not FONT_PATH.exists():
        raise SystemExit(f"Missing font file: {FONT_PATH}")

    font = ImageFont.truetype(str(FONT_PATH), FONT_SIZE)
    probe = Image.new("RGBA", (4, 4), (0, 0, 0, 0))
    probe_draw = ImageDraw.Draw(probe)

    glyph_data = []
    max_height = 0
    max_advance = 0

    for char in CHARS:
        width, height, xoffset, yoffset, advance = measure_char(probe_draw, font, char)
        max_height = max(max_height, height)
        max_advance = max(max_advance, advance)
        glyph_data.append(
            {
                "char": char,
                "width": width,
                "height": height,
                "xoffset": xoffset,
                "yoffset": yoffset,
                "advance": advance,
            }
        )

    cell_w = max_advance + PADDING * 2
    cell_h = max_height + PADDING * 2
    columns = 16
    rows = math.ceil(len(glyph_data) / columns)
    atlas_w = columns * cell_w
    atlas_h = rows * cell_h

    atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(atlas)

    font_elem = ET.Element("font")
    info = ET.SubElement(
        font_elem,
        "info",
        {
            "face": "Press Start 2P",
            "size": str(FONT_SIZE),
            "bold": "0",
            "italic": "0",
            "charset": "",
            "unicode": "1",
            "stretchH": "100",
            "smooth": "0",
            "aa": "1",
            "padding": "0,0,0,0",
            "spacing": "0,0",
        },
    )
    info.attrib["face"] = "Press Start 2P"

    line_height = cell_h
    ET.SubElement(
        font_elem,
        "common",
        {
            "lineHeight": str(line_height),
            "base": str(max_height),
            "scaleW": str(atlas_w),
            "scaleH": str(atlas_h),
            "pages": "1",
            "packed": "0",
            "alphaChnl": "0",
            "redChnl": "4",
            "greenChnl": "4",
            "blueChnl": "4",
        },
    )

    pages = ET.SubElement(font_elem, "pages")
    ET.SubElement(pages, "page", {"id": "0", "file": OUT_PNG.name})

    chars_elem = ET.SubElement(font_elem, "chars", {"count": str(len(glyph_data))})

    for index, glyph in enumerate(glyph_data):
        column = index % columns
        row = index // columns
        cell_x = column * cell_w + PADDING
        cell_y = row * cell_h + PADDING

        draw.text(
            (cell_x - glyph["xoffset"], cell_y - glyph["yoffset"]),
            glyph["char"],
            font=font,
            fill=(255, 255, 255, 255),
        )

        ET.SubElement(
            chars_elem,
            "char",
            {
                "id": str(ord(glyph["char"])),
                "x": str(column * cell_w),
                "y": str(row * cell_h),
                "width": str(glyph["width"]),
                "height": str(glyph["height"]),
                "xoffset": str(glyph["xoffset"]),
                "yoffset": str(glyph["yoffset"]),
                "xadvance": str(glyph["advance"]),
                "page": "0",
                "chnl": "15",
            },
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT_PNG)
    ET.ElementTree(font_elem).write(OUT_XML, encoding="utf-8", xml_declaration=True)
    print(f"Wrote {OUT_PNG} ({atlas_w}x{atlas_h})")
    print(f"Wrote {OUT_XML}")


if __name__ == "__main__":
    main()

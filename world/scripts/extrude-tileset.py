#!/usr/bin/env python3
"""Add extrusion gutters to a tile spritesheet for Phaser/Tiled tilemaps."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

TILE_SIZE = 16
EXTRUDE = 1


def is_outline_pixel(pixel: tuple[int, int, int, int]) -> bool:
    if pixel[3] == 0:
        return True
    return pixel[0] < 20 and pixel[1] < 20 and pixel[2] < 20


def clean_tile_edges(tile):
    cleaned = tile.copy()
    pixels = cleaned.load()
    width, height = cleaned.size

    for _pass in range(2):
        for y in range(height):
            for x in range(width):
                if not is_outline_pixel(pixels[x, y]):
                    continue

                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < width and 0 <= ny < height and not is_outline_pixel(pixels[nx, ny]):
                        pixels[x, y] = pixels[nx, ny]
                        break

    return cleaned


def pick_edge_pixel(tile, x: int, y: int) -> tuple[int, int, int, int]:
    width, height = tile.size
    x = max(0, min(width - 1, x))
    y = max(0, min(height - 1, y))
    pixel = tile.getpixel((x, y))
    if not is_outline_pixel(pixel):
        return pixel

    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)):
        nx = x + dx
        ny = y + dy
        if 0 <= nx < width and 0 <= ny < height:
            neighbor = tile.getpixel((nx, ny))
            if not is_outline_pixel(neighbor):
                return neighbor

    return pixel


def extrude_tileset(
    input_png: Path,
    output_png: Path,
    tile_size: int = TILE_SIZE,
    extrude: int = EXTRUDE,
) -> tuple[int, int]:
    try:
        from PIL import Image
    except ImportError as exc:
        raise SystemExit("Install Pillow first: python -m pip install pillow") from exc

    spacing = extrude * 2
    slot = tile_size + spacing

    source = Image.open(input_png).convert("RGBA")
    cols = source.width // tile_size
    rows = source.height // tile_size
    output = Image.new("RGBA", (cols * slot, rows * slot), (0, 0, 0, 0))

    for row in range(rows):
        for col in range(cols):
            left = col * tile_size
            top = row * tile_size
            tile = source.crop((left, top, left + tile_size, top + tile_size))
            tile = clean_tile_edges(tile)
            dest_x = col * slot
            dest_y = row * slot

            output.paste(tile, (dest_x, dest_y))

            for gutter in range(spacing):
                for py in range(tile_size):
                    edge = pick_edge_pixel(tile, tile_size - 1, py)
                    output.putpixel((dest_x + tile_size + gutter, dest_y + py), edge)

                for px in range(tile_size):
                    edge = pick_edge_pixel(tile, px, tile_size - 1)
                    output.putpixel((dest_x + px, dest_y + tile_size + gutter), edge)

                corner = pick_edge_pixel(tile, tile_size - 1, tile_size - 1)
                output.putpixel((dest_x + tile_size + gutter, dest_y + tile_size + gutter), corner)

    output_png.parent.mkdir(parents=True, exist_ok=True)
    output.save(output_png)
    return cols, rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    default_dir = Path(__file__).resolve().parent.parent / "assets" / "tilesets"
    parser.add_argument("--input", type=Path, default=default_dir / "monkeyboy-tiles.png")
    parser.add_argument("--output", type=Path, default=default_dir / "monkeyboy-tiles-extruded.png")
    parser.add_argument("--tile-size", type=int, default=TILE_SIZE)
    parser.add_argument("--extrude", type=int, default=EXTRUDE)
    args = parser.parse_args()

    if not args.input.exists():
        raise SystemExit(f"Missing tileset: {args.input}")

    cols, rows = extrude_tileset(args.input, args.output, args.tile_size, args.extrude)
    print(f"Created {args.output} ({cols}x{rows} tiles, {args.extrude}px extrusion)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

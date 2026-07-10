#!/usr/bin/env python3
"""Build a Tiled tileset spritesheet from Monkey Boy tile PNGs."""

from __future__ import annotations

import argparse
import math
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

REPO_RAW = "https://raw.githubusercontent.com/Jamesha123/Monkey_Boy/main"
TILE_COUNT = 122
TILE_SIZE = 16
COLUMNS = 11


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return
    print(f"Downloading {url}")
    urllib.request.urlretrieve(url, dest)


def load_collision_flags(source_dir: Path) -> list[bool]:
    tiledata_path = source_dir / "Map" / "tiledata.txt"
    if not tiledata_path.exists():
        download(f"{REPO_RAW}/res/Map/tiledata.txt", tiledata_path)

    lines = tiledata_path.read_text(encoding="utf-8").splitlines()
    flags: list[bool] = []
    i = 0
    while i < len(lines) and len(flags) < TILE_COUNT:
        if not lines[i].strip().endswith(".png"):
            i += 1
            continue
        collision = lines[i + 1].strip().lower() == "true" if i + 1 < len(lines) else False
        flags.append(collision)
        i += 2
    while len(flags) < TILE_COUNT:
        flags.append(False)
    return flags


def ensure_tiles(source_dir: Path) -> Path:
    tiles_dir = source_dir / "Tiles"
    tiles_dir.mkdir(parents=True, exist_ok=True)
    for index in range(TILE_COUNT):
        filename = f"{index:03d}.png"
        download(f"{REPO_RAW}/res/Tiles/{filename}", tiles_dir / filename)
    return tiles_dir


def build_spritesheet(tiles_dir: Path, output_png: Path) -> tuple[int, int]:
    try:
        from PIL import Image
    except ImportError as exc:
        raise SystemExit("Install Pillow first: python -m pip install pillow") from exc

    rows = math.ceil(TILE_COUNT / COLUMNS)
    sheet = Image.new("RGBA", (COLUMNS * TILE_SIZE, rows * TILE_SIZE), (0, 0, 0, 0))

    for index in range(TILE_COUNT):
        tile_path = tiles_dir / f"{index:03d}.png"
        if not tile_path.exists():
            raise FileNotFoundError(f"Missing tile: {tile_path}")
        tile = Image.open(tile_path).convert("RGBA")
        if tile.size != (TILE_SIZE, TILE_SIZE):
            tile = tile.resize((TILE_SIZE, TILE_SIZE), Image.NEAREST)
        col = index % COLUMNS
        row = index // COLUMNS
        sheet.paste(tile, (col * TILE_SIZE, row * TILE_SIZE))

    output_png.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_png)
    return COLUMNS, rows


def write_tsx(output_tsx: Path, image_name: str, columns: int, rows: int, collisions: list[bool]) -> None:
    tilecount = columns * rows
    width = columns * TILE_SIZE
    height = rows * TILE_SIZE

    tileset = ET.Element(
        "tileset",
        {
            "version": "1.10",
            "tiledversion": "1.11.2",
            "name": "monkeyboy",
            "tilewidth": str(TILE_SIZE),
            "tileheight": str(TILE_SIZE),
            "tilecount": str(tilecount),
            "columns": str(columns),
        },
    )

    image = ET.SubElement(
        tileset,
        "image",
        {
            "source": image_name,
            "width": str(width),
            "height": str(height),
        },
    )

    for tile_id in range(TILE_COUNT):
        tile = ET.SubElement(tileset, "tile", {"id": str(tile_id)})
        props = ET.SubElement(tile, "properties")
        ET.SubElement(
            props,
            "property",
            {"name": "collides", "type": "bool", "value": "true" if collisions[tile_id] else "false"},
        )

    tree = ET.ElementTree(tileset)
    ET.indent(tree, space=" ")
    output_tsx.parent.mkdir(parents=True, exist_ok=True)
    tree.write(output_tsx, encoding="utf-8", xml_declaration=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "monkeyboy-source",
        help="Folder for Monkey Boy tile PNGs and tiledata.txt",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "assets" / "tilesets",
        help="Output folder for spritesheet + tsx",
    )
    args = parser.parse_args()

    tiles_dir = ensure_tiles(args.source)
    collisions = load_collision_flags(args.source)
    png_path = args.out / "monkeyboy-tiles.png"
    tsx_path = args.out / "monkeyboy.tsx"
    columns, rows = build_spritesheet(tiles_dir, png_path)
    write_tsx(tsx_path, "monkeyboy-tiles.png", columns, rows, collisions)

    extruded_path = args.out / "monkeyboy-tiles-extruded.png"
    extrude_script = Path(__file__).resolve().parent / "extrude-tileset.py"
    if extrude_script.exists():
        import subprocess

        result = subprocess.run(
            [sys.executable, str(extrude_script), "--input", str(png_path), "--output", str(extruded_path)],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            print(result.stdout.strip())
        else:
            print(f"Warning: could not create extruded tileset: {result.stderr.strip()}", file=sys.stderr)

    print(f"Created {png_path}")
    print(f"Created {tsx_path}")
    print(f"Tiles: {TILE_COUNT}, grid: {columns}x{rows}, tile size: {TILE_SIZE}px")
    print("Collision flags imported from tiledata.txt")
    return 0


if __name__ == "__main__":
    sys.exit(main())

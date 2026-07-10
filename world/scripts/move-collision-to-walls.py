#!/usr/bin/env python3
"""Move colliding tiles from Ground layer to Walls layer in portfolio.tmx."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from pathlib import Path

GRASS_GID = 2  # Monkey Boy grass tile (walkable floor under walls)


def load_colliding_ids(tsx_path: Path) -> set[int]:
    root = ET.parse(tsx_path).getroot()
    colliding: set[int] = set()
    for tile in root.findall("tile"):
        tile_id = int(tile.attrib["id"])
        props = tile.find("properties")
        if props is None:
            continue
        for prop in props.findall("property"):
            if prop.attrib.get("name") == "collides" and prop.attrib.get("value", "").lower() == "true":
                colliding.add(tile_id + 1)  # Tiled gids are 1-based
    return colliding


def parse_csv(text: str) -> list[int]:
    return [int(v.strip()) for v in text.replace("\n", ",").split(",") if v.strip()]


def format_csv(values: list[int], width: int) -> str:
    lines = []
    for row in range(0, len(values), width):
        chunk = values[row : row + width]
        lines.append(",".join(str(v) for v in chunk) + ",")
    return "\n".join(lines) + "\n"


def move_collision_to_walls(tmx_path: Path) -> tuple[int, int]:
    root = ET.parse(tmx_path).getroot()
    width = int(root.attrib["width"])
    tsx_path = (tmx_path.parent / "../tilesets/monkeyboy.tsx").resolve()
    colliding_gids = load_colliding_ids(tsx_path)

    ground_layer = None
    walls_layer = None
    for layer in root.findall("layer"):
        name = layer.attrib["name"]
        if name == "Ground":
            ground_layer = layer
        elif name == "Walls":
            walls_layer = layer

    if ground_layer is None or walls_layer is None:
        raise SystemExit("Map must have Ground and Walls tile layers.")

    ground = parse_csv(ground_layer.find("data").text or "")
    walls = parse_csv(walls_layer.find("data").text or "")

    moved = 0
    grass_fill = 0
    for index, gid in enumerate(ground):
        if gid == 0 or gid not in colliding_gids:
            continue
        if walls[index] == 0:
            walls[index] = gid
            moved += 1
        ground[index] = GRASS_GID
        grass_fill += 1

    ground_layer.find("data").text = format_csv(ground, width)
    walls_layer.find("data").text = format_csv(walls, width)

    tree = ET.ElementTree(root)
    ET.indent(tree, space=" ")
    tree.write(tmx_path, encoding="utf-8", xml_declaration=True)
    return moved, grass_fill


if __name__ == "__main__":
    map_path = Path(__file__).resolve().parent.parent / "assets" / "maps" / "portfolio.tmx"
    moved, filled = move_collision_to_walls(map_path)
    print(f"Moved {moved} wall tiles to Walls layer.")
    print(f"Replaced {filled} ground cells with grass (gid {GRASS_GID}).")
    print("Run export-map.py next to update world.json.")

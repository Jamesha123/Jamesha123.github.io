#!/usr/bin/env python3
"""Export Tiled maps to Phaser-compatible JSON."""

from __future__ import annotations

import json
from datetime import datetime
import xml.etree.ElementTree as ET
from pathlib import Path

MAP_EXPORTS = [
    ("portfolio", "world.json"),
    ("house-interior", "house-interior.json"),
]


def parse_csv_data(text: str, width: int, height: int) -> list[int]:
    values = [int(v.strip()) for v in text.replace("\n", ",").split(",") if v.strip()]
    if len(values) != width * height:
        raise ValueError(f"Expected {width * height} tiles, got {len(values)}")
    return values


def load_tileset(tsx_path: Path, firstgid: int) -> dict | None:
    root = ET.parse(tsx_path).getroot()
    image = root.find("image")
    if image is None:
        return None

    columns = int(root.attrib["columns"])
    tilecount = int(root.attrib["tilecount"])
    tilewidth = int(root.attrib["tilewidth"])
    tileheight = int(root.attrib["tileheight"])

    tiles = []
    for tile in root.findall("tile"):
        tile_id = int(tile.attrib["id"])
        props = {}
        properties = tile.find("properties")
        if properties is not None:
            for prop in properties.findall("property"):
                name = prop.attrib["name"]
                value = prop.attrib.get("value", "")
                if prop.attrib.get("type") == "bool":
                    value = value.lower() == "true"
                props[name] = value
        if props:
            tiles.append(
                {
                    "id": tile_id,
                    "properties": [
                        {
                            "name": k,
                            "type": "bool" if isinstance(v, bool) else "string",
                            "value": v,
                        }
                        for k, v in props.items()
                    ],
                }
            )

    return {
        "firstgid": firstgid,
        "name": root.attrib["name"],
        "image": "monkeyboy-tiles.png",
        "imagewidth": int(image.attrib["width"]),
        "imageheight": int(image.attrib["height"]),
        "tilewidth": tilewidth,
        "tileheight": tileheight,
        "tilecount": tilecount,
        "columns": columns,
        "tiles": tiles,
    }


def convert_tmx(tmx_path: Path, output_path: Path) -> None:
    root = ET.parse(tmx_path).getroot()
    width = int(root.attrib["width"])
    height = int(root.attrib["height"])

    tilesets = []
    for tileset in root.findall("tileset"):
        if "source" in tileset.attrib:
            tsx_path = (tmx_path.parent / tileset.attrib["source"]).resolve()
            loaded = load_tileset(tsx_path, int(tileset.attrib["firstgid"]))
            if loaded:
                tilesets.append(loaded)

    layers = []
    for layer in root:
        tag = layer.tag
        if tag == "layer":
            data_el = layer.find("data")
            data = parse_csv_data(data_el.text or "", width, height)
            layers.append(
                {
                    "id": int(layer.attrib["id"]),
                    "name": layer.attrib["name"],
                    "type": "tilelayer",
                    "visible": True,
                    "opacity": 1,
                    "x": 0,
                    "y": 0,
                    "width": width,
                    "height": height,
                    "data": data,
                }
            )
        elif tag == "objectgroup":
            objects = []
            for obj in layer.findall("object"):
                item = {
                    "id": int(obj.attrib["id"]),
                    "name": obj.attrib.get("name", ""),
                    "x": float(obj.attrib["x"]),
                    "y": float(obj.attrib["y"]),
                    "width": float(obj.attrib.get("width", 0)),
                    "height": float(obj.attrib.get("height", 0)),
                    "visible": True,
                    "rotation": 0,
                }
                props = []
                properties = obj.find("properties")
                if properties is not None:
                    for prop in properties.findall("property"):
                        props.append(
                            {
                                "name": prop.attrib["name"],
                                "type": prop.attrib.get("type", "string"),
                                "value": prop.attrib.get("value", ""),
                            }
                        )
                if props:
                    item["properties"] = props
                if "gid" in obj.attrib:
                    item["gid"] = int(obj.attrib["gid"])
                objects.append(item)
            layers.append(
                {
                    "id": int(layer.attrib["id"]),
                    "name": layer.attrib["name"],
                    "type": "objectgroup",
                    "visible": True,
                    "opacity": 1,
                    "x": 0,
                    "y": 0,
                    "objects": objects,
                }
            )

    output = {
        "compressionlevel": -1,
        "height": height,
        "width": width,
        "infinite": False,
        "layers": layers,
        "nextlayerid": int(root.attrib.get("nextlayerid", len(layers) + 1)),
        "nextobjectid": int(root.attrib.get("nextobjectid", 1)),
        "orientation": root.attrib.get("orientation", "orthogonal"),
        "renderorder": root.attrib.get("renderorder", "right-down"),
        "tiledversion": root.attrib.get("tiledversion", "1.12.2"),
        "tileheight": int(root.attrib["tileheight"]),
        "tilewidth": int(root.attrib["tilewidth"]),
        "tilesets": tilesets,
        "type": "map",
        "version": root.attrib.get("version", "1.10"),
    }

    output_path.write_text(json.dumps(output, indent=2), encoding="utf-8")


def export_map(source_path: Path, output_path: Path) -> None:
    convert_tmx(source_path, output_path)


if __name__ == "__main__":
    maps_dir = Path(__file__).resolve().parent.parent / "assets" / "maps"

    for map_name, output_name in MAP_EXPORTS:
        source_path = maps_dir / f"{map_name}.tmx"
        output_path = maps_dir / output_name
        if not source_path.exists():
            raise FileNotFoundError(f"Missing map file: {source_path.name}")

        export_map(source_path, output_path)
        modified = datetime.fromtimestamp(source_path.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        print(f"Exported {output_path.name} from {source_path.name} ({modified})")

    print("Refresh the browser to see map changes.")

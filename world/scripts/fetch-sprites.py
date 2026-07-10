#!/usr/bin/env python3
"""Download Monkey Boy character sprites for the portfolio world."""

from __future__ import annotations

import urllib.request
from pathlib import Path

REPO_RAW = "https://raw.githubusercontent.com/Jamesha123/Monkey_Boy/main/res"

PLAYER_FILES = [
    f"NPC/oldman_{direction}_{frame}.png"
    for direction in ("down", "up", "left", "right")
    for frame in (1, 2)
]

MONKEY_BOY_FILES = [
    f"Player/Walking sprites/boy_{direction}_{frame}.png"
    for direction, frames in (
        ("down", (1, 2)),
        ("up", (1, 2)),
        ("left", (1, 2, 3)),
        ("right", (1, 2, 3)),
    )
    for frame in frames
]


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return
    print(f"Downloading {dest.name}")
    urllib.request.urlretrieve(url, dest)


def main() -> int:
    base = Path(__file__).resolve().parent.parent / "assets" / "sprites"
    player_dir = base / "player"
    monkey_dir = base / "monkey-boy"

    for rel in PLAYER_FILES:
        name = Path(rel).name
        download(f"{REPO_RAW}/{rel.replace(' ', '%20')}", player_dir / name)

    for rel in MONKEY_BOY_FILES:
        name = Path(rel).name
        download(f"{REPO_RAW}/{rel.replace(' ', '%20')}", monkey_dir / name)

    print(f"Player sprites: {player_dir}")
    print(f"Monkey Boy sprites: {monkey_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

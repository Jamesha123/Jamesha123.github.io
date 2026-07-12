"""Build stickyNote.png with a real alpha channel (no baked white background)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "monkeyboy-source" / "Tiles_Interactive" / "stickyNote.png"

W = H = 16
T = (0, 0, 0, 0)
OUTLINE = (42, 30, 18, 255)
SHADOW = (176, 138, 36, 255)
NOTE = (252, 220, 84, 255)
HIGHLIGHT = (255, 236, 132, 255)
FOLD = (224, 186, 58, 255)
LINE = (118, 88, 38, 255)

pixels = [[T for _ in range(W)] for _ in range(H)]

for y in range(2, 14):
    for x in range(3, 13):
        pixels[y][x] = NOTE

for y in range(3, 13):
    pixels[y][3] = HIGHLIGHT

for x in range(10, 13):
    pixels[2][x] = FOLD
pixels[2][12] = OUTLINE
pixels[3][12] = FOLD
pixels[3][11] = SHADOW

outline: list[tuple[int, int]] = []
for y in range(2, 14):
    for x in range(3, 13):
        if pixels[y][x][3] == 0:
            continue
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and pixels[ny][nx][3] == 0:
                outline.append((ny, nx))
for y, x in outline:
    pixels[y][x] = OUTLINE

for x in range(5, 11):
    pixels[6][x] = LINE
    pixels[9][x] = LINE
for x in range(5, 9):
    pixels[12][x] = LINE

image = Image.new("RGBA", (W, H), T)
px = image.load()
for y in range(H):
    for x in range(W):
        px[x, y] = pixels[y][x]

OUT.parent.mkdir(parents=True, exist_ok=True)
image.save(OUT)

transparent = sum(1 for y in range(H) for x in range(W) if px[x, y][3] == 0)
print(f"Wrote {OUT} ({W}x{H}), transparent pixels: {transparent}/{W * H}")

#!/usr/bin/env python3
"""Crop memoji tiles from the assistant-avatar screenshot.

Input:  /home/ngray/Documents/IMG_1166.jpg (1748x794 JPEG of an iOS memoji keyboard panel)
Output:
  public/avatars/_grid/r{R}c{C}.png  -- every tile (4 rows x 14 cols)
  public/avatars/<mood>.png          -- 7 picked tiles for the curated mood set

Re-run with adjusted GRID_* constants if the picks land on the wrong tile, or
manually `cp _grid/r{R}c{C}.png <mood>.png` once you eyeball the grid.
"""

from pathlib import Path
from PIL import Image

SRC = Path("/home/ngray/Documents/IMG_1166.jpg")
OUT = Path("/home/ngray/Code/cxmngr-glass/public/avatars")
GRID = OUT / "_grid"

# Grid geometry (estimated from a 1748x794 iOS memoji panel screenshot).
# Adjust if the tiles look misaligned -- everything below derives from these.
GRID_X0 = 0       # left edge of column 1
GRID_Y0 = 100     # top edge of row 1 (below the search bar)
GRID_W  = 1748    # full grid width
GRID_H  = 600     # full 4-row grid height
COLS    = 14
ROWS    = 4
INSET   = 6       # px inset inside each cell to avoid neighbours

# (row, col) -> mood-name picks. Numbers are 1-indexed and verified visually
# against the cropped tiles in public/avatars/_grid/.
PICKS = {
    "neutral":     (2,  3),  # calm, mouth-closed, looking slightly down
    "thinking":    (1, 11),  # hand on chin, eyes up
    "working":     (2, 12),  # peeking over a laptop
    "happy":       (2,  1),  # thumbs-up + smile
    "surprised":   (1, 13),  # wide-eyed open-mouth shock
    "sad":         (2, 14),  # frowning, no tear
    "celebrating": (2,  6),  # party hat + confetti
}


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"source image not found: {SRC}")
    OUT.mkdir(parents=True, exist_ok=True)
    GRID.mkdir(parents=True, exist_ok=True)

    img = Image.open(SRC).convert("RGB")
    cell_w = GRID_W / COLS
    cell_h = GRID_H / ROWS

    # Slice every cell into the reference _grid/ folder.
    for r in range(1, ROWS + 1):
        for c in range(1, COLS + 1):
            x0 = int(GRID_X0 + (c - 1) * cell_w) + INSET
            y0 = int(GRID_Y0 + (r - 1) * cell_h) + INSET
            x1 = int(GRID_X0 + c * cell_w) - INSET
            y1 = int(GRID_Y0 + r * cell_h) - INSET
            tile = img.crop((x0, y0, x1, y1))
            tile.save(GRID / f"r{r}c{c}.png", format="PNG", optimize=True)

    # Copy picks to mood-named files.
    for mood, (r, c) in PICKS.items():
        src = GRID / f"r{r}c{c}.png"
        dst = OUT / f"{mood}.png"
        Image.open(src).save(dst, format="PNG", optimize=True)

    print(f"Wrote {ROWS * COLS} tiles to {GRID}")
    print(f"Wrote {len(PICKS)} mood images to {OUT}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""textures.py — the paper textures, made in code (so they are yours to use and sell, no stock licence).

    uv run --with numpy --with pillow python tools/textures.py

Writes public/textures/
    paper-grid-16x9.jpg   1920×1080 off-white grid paper (45-px cells)
    paper-grid-9x16.jpg   1080×1920 off-white grid paper (80-px cells — the approved vertical look)
    paper-grid-1x1.jpg    1080×1080 off-white grid paper (60-px cells)
    grain.png             512×512 tileable mid-grey print grain (blended "overlay" by PrintFinish)
Deterministic (fixed seeds): re-running gives the same files.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/textures"
BASE = np.array([237, 232, 221], dtype=np.float64)  # warm off-white
GRID = np.array([192, 193, 188], dtype=np.float64)


def blurred_noise(rng, w, h, radius):
    """smooth noise in −1…1 (gaussian-blurred white noise, renormalised)."""
    n = rng.standard_normal((h, w)).astype(np.float32)
    im = Image.fromarray(((n - n.min()) / (np.ptp(n) or 1) * 255).astype(np.uint8))
    b = np.asarray(im.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float64)
    b -= b.mean()
    return b / (np.abs(b).max() or 1)


def paper(w, h, cell, seed):
    rng = np.random.default_rng(seed)
    img = np.ones((h, w, 3)) * BASE
    # mottling: large soft clouds + medium blotches (a few levels, slightly warm)
    img += blurred_noise(rng, w, h, 140)[..., None] * np.array([5.0, 5.0, 6.5])
    img += blurred_noise(rng, w, h, 28)[..., None] * 2.6
    # paper fibre: fine grain + short streaks
    img += rng.standard_normal((h, w))[..., None] * 2.2
    img += blurred_noise(rng, w, h, 1.2)[..., None] * 3.0
    # grid lines: 2 px, their strength wavers along the line (printed ink on fibre)
    ys, xs = np.mgrid[0:h, 0:w]
    off = cell // 3
    on = ((xs - off) % cell < 2) | ((ys - off) % cell < 2)
    waver = 0.55 + 0.45 * (blurred_noise(rng, w, h, 18) * 0.5 + 0.5)
    a = on * 0.3 * waver
    img = img * (1 - a[..., None]) + GRID * a[..., None]
    # specks: a few soft dark fibres and dust
    dust = np.zeros((h, w))
    for _ in range(int(w * h / 14000)):
        x, y = rng.integers(0, w - 3), rng.integers(0, h - 3)
        dust[y : y + rng.integers(1, 3), x : x + rng.integers(1, 4)] = rng.uniform(40, 90)
    dust = np.asarray(Image.fromarray(dust.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float64)
    img -= dust[..., None] * np.array([0.8, 0.8, 0.75])
    # aged edges: a warm darkening that creeps in from the borders
    edge = np.minimum(np.minimum(xs, w - 1 - xs), np.minimum(ys, h - 1 - ys)).astype(np.float64)
    e = np.clip(1 - edge / (0.06 * min(w, h)), 0, 1) ** 2 * (0.6 + 0.4 * (blurred_noise(rng, w, h, 60) * 0.5 + 0.5))
    img -= e[..., None] * np.array([16.0, 18.0, 24.0])
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def grain(size=512, seed=7):
    rng = np.random.default_rng(seed)
    n = rng.standard_normal((size, size))
    # a touch of clumping, computed with wrap-around so the tile repeats seamlessly
    k = (n + np.roll(n, 1, 0) + np.roll(n, 1, 1) + np.roll(np.roll(n, 1, 0), 1, 1)) / 2 + n
    k = (k - k.mean()) / k.std()
    return Image.fromarray(np.clip(128 + k * 18, 0, 255).astype(np.uint8), "L")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    paper(1920, 1080, 45, 11).save(OUT / "paper-grid-16x9.jpg", quality=92)
    paper(1080, 1920, 80, 12).save(OUT / "paper-grid-9x16.jpg", quality=92)
    paper(1080, 1080, 60, 13).save(OUT / "paper-grid-1x1.jpg", quality=92)
    grain().save(OUT / "grain.png", optimize=True)
    for f in sorted(OUT.iterdir()):
        print(f"{f.relative_to(ROOT)}  {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()

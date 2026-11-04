#!/usr/bin/env python3
"""halftone.py — turn an image into the look's cut-out: black-and-white HALFTONE print + a thin white paper border.
Use it on the user's own images (a transparent PNG of an object, a product, an animal…) or on generated images
that came out too clean / too colourful. Never use it on a real person's face, a logo or a screenshot.

    uv run --with numpy --with pillow python tools/halftone.py <in.png> <out.png> [--cell 9] [--angle 45] [--border 14] [--max 900]

  needs a TRANSPARENT background to cut along (run tools/cutout.py first if it has a flat one); without alpha the
  whole rectangle becomes a halftone print (fine for a photo on a torn print).
  --cell    halftone dot spacing in px (smaller = finer)  --angle  screen angle  --border  white paper edge in px
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--cell", type=float, default=9)
    ap.add_argument("--angle", type=float, default=45)
    ap.add_argument("--border", type=int, default=14)
    ap.add_argument("--max", type=int, default=900)
    a = ap.parse_args()
    im = Image.open(a.src).convert("RGBA")
    s = a.max / max(im.size)
    if s < 1:
        im = im.resize((round(im.size[0] * s), round(im.size[1] * s)), Image.LANCZOS)
    pad = a.border * 2
    canvas = Image.new("RGBA", (im.size[0] + pad * 2, im.size[1] + pad * 2), (0, 0, 0, 0))
    canvas.paste(im, (pad, pad))
    arr = np.asarray(canvas).astype(np.float64) / 255
    alpha = arr[..., 3]
    # luminance with print contrast (darks crushed, highlights opened)
    lum = arr[..., 0] * 0.299 + arr[..., 1] * 0.587 + arr[..., 2] * 0.114
    lum = np.clip((lum - 0.08) / 0.84, 0, 1) ** 1.15
    h, w = lum.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    th = np.deg2rad(a.angle)
    u = (xx * np.cos(th) + yy * np.sin(th)) / a.cell
    v = (-xx * np.sin(th) + yy * np.cos(th)) / a.cell
    # distance to the nearest dot centre, 0 … ~0.71
    d = np.sqrt((u - np.round(u)) ** 2 + (v - np.round(v)) ** 2)
    radius = np.sqrt(np.clip(1 - lum, 0, 1) / np.pi) * 1.05  # dot area ∝ darkness
    ink = np.clip((radius - d) * a.cell * 0.9 + 0.5, 0, 1)  # anti-aliased dot edge
    paper = np.array([0.965, 0.955, 0.93])
    rgb = paper * (1 - ink[..., None]) + np.array([0.09, 0.085, 0.08]) * ink[..., None]
    # the white paper border: the object's silhouette grown by `border` px, slightly ragged
    sil = Image.fromarray((alpha > 0.5).astype(np.uint8) * 255)
    grown = sil.filter(ImageFilter.MaxFilter(a.border * 2 + 1)).filter(ImageFilter.GaussianBlur(1.2))
    edge = np.asarray(grown).astype(np.float64) / 255
    rng = np.random.default_rng(3)
    edge = np.clip(edge + (rng.random(edge.shape) - 0.5) * 0.25 * (edge > 0.05) * (edge < 0.95), 0, 1)
    inside = alpha > 0.5
    out_rgb = np.where(inside[..., None], rgb, paper)
    out_a = np.where(inside, 1.0, edge)
    out = np.dstack([out_rgb, out_a])
    ys, xs = np.where(out_a > 0.02)
    out = out[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    Path(a.dst).parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8), "RGBA").save(a.dst, optimize=True)
    print(f"{a.dst}  {out.shape[1]}×{out.shape[0]}")


if __name__ == "__main__":
    main()

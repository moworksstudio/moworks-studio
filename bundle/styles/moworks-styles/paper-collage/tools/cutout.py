#!/usr/bin/env python3
"""cutout.py — make any generated or supplied image a clean collage cut-out (transparent PNG, crisp edge, trimmed).

    uv run --with numpy --with pillow python tools/cutout.py <in.png | folder> <out.png | folder> [--key auto|none|green|white] [--max 900]

  --key none   the image is already transparent: re-shape its alpha (kills the soft glow halo many image models
               leave: smoothstep 120 → 225), trim, size
  --key green  it was generated on a flat GREEN background (#00B140-ish) because the model can't do transparency:
               key the green out (distance in colour space, smooth edge, de-spill), then as above
  --key white  a flat WHITE background (only for objects WITHOUT a white paper border — a white border would vanish)
  --key auto   (default) transparent → none; otherwise look at the corners: green-ish → green, near-white → white
Keep the originals (projects/<slug>/img-originals/); write the cleaned files to public/library/ (reusable) or
public/graphics/<slug>/ (this graphic only). Look at the result on the paper in a still before using it.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def smooth(k):
    k = np.clip(k, 0, 1)
    return k * k * (3 - 2 * k)


def key_alpha(rgb, key):
    """alpha from the distance to the key colour (0 = background, 1 = subject), with a soft edge."""
    d = np.sqrt(((rgb - key) ** 2).sum(-1))
    return smooth((d - 60) / 70)


def clean(src, dst, mode, mx):
    im = np.array(Image.open(src).convert("RGBA")).astype(np.float32)
    rgb, a = im[..., :3], im[..., 3]
    if mode == "auto":
        if (a < 250).mean() > 0.02:
            mode = "none"
        else:
            corners = np.concatenate([rgb[:12, :12].reshape(-1, 3), rgb[:12, -12:].reshape(-1, 3), rgb[-12:, :12].reshape(-1, 3), rgb[-12:, -12:].reshape(-1, 3)])
            c = corners.mean(0)
            mode = "green" if c[1] > c[0] + 40 and c[1] > c[2] + 40 else "white" if c.min() > 225 else "none"
        print(f"  {src.name}: --key {mode}")
    if mode == "none":
        k = smooth((a - 120) / 105)
    else:
        corners = np.concatenate([rgb[:12, :12].reshape(-1, 3), rgb[-12:, -12:].reshape(-1, 3)])
        key = corners.mean(0) if mode == "green" else np.array([255.0, 255.0, 255.0])
        k = key_alpha(rgb, key)
        if mode == "green":  # de-spill: pull green down to the other channels on the edge
            g = rgb[..., 1]
            cap = np.maximum(rgb[..., 0], rgb[..., 2])
            rgb[..., 1] = np.where(g > cap, cap + (g - cap) * k, g)
    im[..., :3] = rgb
    im[..., 3] = k * 255
    ys, xs = np.where(k > 0.02)
    if not len(ys):
        print(f"✗ {src}: nothing left after keying — wrong --key?")
        return
    m = 6
    im = im[max(ys.min() - m, 0) : ys.max() + m, max(xs.min() - m, 0) : xs.max() + m]
    out = Image.fromarray(np.clip(im, 0, 255).astype(np.uint8), "RGBA")
    s = mx / max(out.size)
    if s < 1:
        out = out.resize((round(out.size[0] * s), round(out.size[1] * s)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    out.save(dst, optimize=True)
    print(f"{dst}  {out.size[0]}×{out.size[1]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--key", default="auto", choices=["auto", "none", "green", "white"])
    ap.add_argument("--max", type=int, default=900)
    a = ap.parse_args()
    src, dst = Path(a.src), Path(a.dst)
    files = sorted([*src.glob("*.png"), *src.glob("*.jpg"), *src.glob("*.jpeg"), *src.glob("*.webp")]) if src.is_dir() else [src]
    for f in files:
        out = dst / (f.stem + ".png") if (src.is_dir() or not dst.suffix) else dst
        clean(f, out, a.key, a.max)


if __name__ == "__main__":
    main()

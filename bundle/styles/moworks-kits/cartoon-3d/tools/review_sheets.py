#!/usr/bin/env python3
"""review_sheets.py — labelled contact sheets for the render review (called by tools/review-frames.mjs).

    uv run --with pillow python tools/review_sheets.py <outDir> <fps> <every> <video> <WxH>

Reads <outDir>/frames/f_<frame>.png, writes <outDir>/sheets/sheet_<nn>.jpg (6 consecutive frames each: 3×2 tiles for
16:9, 6×1 for 9:16, each labelled "t <s>  f <frame>") and <outDir>/INDEX.md.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def font(size):
    try:
        return ImageFont.load_default(size=size)  # Pillow ≥ 10.1: a scalable built-in font
    except TypeError:
        return ImageFont.load_default()


def main():
    out, fps, every, video, size = Path(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), sys.argv[4], sys.argv[5]
    w, h = map(int, size.split("x"))
    portrait = h > w
    tw, th = (360, 640) if portrait else (640, 360)
    cols = 6 if portrait else 3
    frames = sorted((out / "frames").glob("f_*.png"))
    (out / "sheets").mkdir(parents=True, exist_ok=True)
    f = font(22)
    lines = [
        "# Render review material",
        "",
        f"Video: `{video}` · {size} · {fps:g} fps · a frame every {every:g} s ({len(frames)} frames)",
        "",
        "| Sheet | Frames | Time |",
        "|---|---|---|",
    ]
    for s in range(0, len(frames), 6):
        group = frames[s : s + 6]
        sheet = Image.new("RGB", (cols * tw, (6 // cols) * th), (0, 0, 0))
        nums = []
        for i, p in enumerate(group):
            n = int(p.stem[2:])
            nums.append(n)
            im = Image.open(p).convert("RGB").resize((tw, th))
            d = ImageDraw.Draw(im)
            label = f"t {n / fps:.2f}s  f {n}"
            box = d.textbbox((8, 8), label, font=f)
            d.rectangle([box[0] - 6, box[1] - 6, box[2] + 6, box[3] + 6], fill=(0, 0, 0))
            d.text((8, 8), label, fill=(255, 255, 255), font=f)
            sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
        name = f"sheet_{s // 6:02d}.jpg"
        sheet.save(out / "sheets" / name, quality=85)
        lines.append(f"| sheets/{name} | {nums[0]}–{nums[-1]} | {nums[0] / fps:.2f}–{nums[-1] / fps:.2f} s |")
    (out / "INDEX.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""sheet.py — a contact sheet of a rendered video: frames at given times, each labelled with its time. For checking a
render WITHOUT playing it (never play media with sound to check it).

    uv run --with pillow python tools/sheet.py <video> <out.jpg> [--n 18] [--cols 9] [--times 0.3 1.4 …]
"""
import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FFMPEG = shutil.which("ffmpeg") or str(Path.home() / ".local/bin/ffmpeg")
FFPROBE = shutil.which("ffprobe") or str(Path.home() / ".local/bin/ffprobe")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("--n", type=int, default=18)
    ap.add_argument("--cols", type=int, default=9)
    ap.add_argument("--width", type=int, default=300, help="width of each thumbnail")
    ap.add_argument("--times", type=float, nargs="*")
    a = ap.parse_args()
    dur = float(subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.video], capture_output=True, text=True, check=True).stdout)
    times = a.times or [round(0.15 + (dur - 0.4) * i / max(1, a.n - 1), 2) for i in range(a.n)]
    thumbs = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, t in enumerate(times):
            f = Path(tmp) / f"{i:03d}.png"
            subprocess.run([FFMPEG, "-v", "error", "-y", "-ss", str(t), "-i", a.video, "-an", "-frames:v", "1", "-vf", f"scale={a.width}:-2", str(f)], check=True)
            im = Image.open(f).convert("RGB")
            d = ImageDraw.Draw(im)
            label = f"{t:.2f}s"
            d.rectangle([0, 0, 8 + 9 * len(label), 22], fill=(0, 0, 0))
            d.text((4, 4), label, fill=(255, 255, 255), font=ImageFont.load_default())
            thumbs.append(im)
    w, h = thumbs[0].size
    cols = min(a.cols, len(thumbs))
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 6) - 6, rows * (h + 6) - 6), (0, 0, 0))
    for i, im in enumerate(thumbs):
        sheet.paste(im, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(a.out, quality=88)
    print(a.out)


if __name__ == "__main__":
    main()

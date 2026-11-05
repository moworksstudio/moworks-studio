#!/usr/bin/env python3
"""tighten-voice.py — shorten the long pauses of a voice-over (generated voices often leave 0.5–1 s gaps), without
touching a single word. Only silence is shortened; 10-ms crossfades at every cut.

    uv run --with numpy --with scipy python tools/tighten-voice.py <in.wav|mp3> <out.wav> [--pause 0.25] [--lead 0.15]
        [--tail 0.4] [--keep 14.4-15.4:0.45] [--keep …]

  --pause   what every pause becomes (s)            --lead / --tail  silence kept before the first / after the last word
  --keep    a dramatic beat to keep longer: "<from>-<to>:<seconds>" (source times), e.g. the pause inside "Wait… really?"
  --min     only silences at least this long are touched (default 0.2 s) · --db  silence threshold (default −45 dB)
Run it BEFORE tools/vo-words.mjs (the word times must come from the final voice file).
"""
import argparse
import shutil
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile

SR = 48000
FFMPEG = shutil.which("ffmpeg") or str(Path.home() / ".local/bin/ffmpeg")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--pause", type=float, default=0.25)
    ap.add_argument("--lead", type=float, default=0.15)
    ap.add_argument("--tail", type=float, default=0.4)
    ap.add_argument("--min", type=float, default=0.2)
    ap.add_argument("--db", type=float, default=-45)
    ap.add_argument("--keep", action="append", default=[])
    a = ap.parse_args()
    keeps = []
    for k in a.keep:
        span, target = k.split(":")
        f, t = span.split("-")
        keeps.append((float(f), float(t), float(target)))
    raw = subprocess.run([FFMPEG, "-v", "error", "-i", a.src, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
    mono = x.mean(axis=1)
    hop = int(0.01 * SR)
    rms = np.sqrt(np.convolve(mono**2, np.ones(hop) / hop, "same"))
    silent = 20 * np.log10(rms + 1e-9) < a.db
    runs, i = [], 0
    while i < len(silent):
        if silent[i]:
            j = i
            while j < len(silent) and silent[j]:
                j += 1
            if (j - i) / SR >= a.min:
                runs.append((i, j))
            i = j
        else:
            i += 1
    out, pos, fade = [], 0, int(0.01 * SR)
    for s0, s1 in runs:
        dur = (s1 - s0) / SR
        mid = (s0 + s1) / 2 / SR
        if s0 == 0:
            target = a.lead
        elif s1 >= len(mono) - 1:
            target = a.tail
        else:
            target = next((k[2] for k in keeps if k[0] <= mid <= k[1]), a.pause)
        target = min(target, dur)
        half = int(target * SR / 2)
        if s0 == 0:
            cut_a, cut_b = 0, s1 - int(target * SR)
        elif s1 >= len(mono) - 1:
            cut_a, cut_b = s0 + int(target * SR), len(mono)
        else:
            cut_a, cut_b = s0 + half, s1 - half
        seg = x[pos:cut_a].copy()
        if out and len(seg) > fade:
            seg[:fade] *= np.linspace(0, 1, fade)[:, None]
        if len(seg) > fade:
            seg[-fade:] *= np.linspace(1, 0, fade)[:, None]
        out.append(seg)
        pos = cut_b
        print(f"pause {s0 / SR:6.2f}–{s1 / SR:6.2f} ({dur:.2f}s) → {target:.2f}s")
    seg = x[pos:].copy()
    if len(seg) > fade:
        seg[:fade] *= np.linspace(0, 1, fade)[:, None]
    out.append(seg)
    y = np.concatenate(out)
    if a.tail > 0 and (not runs or runs[-1][1] < len(mono) - 1):
        y = np.concatenate([y, np.zeros((int(a.tail * SR), 2))])
    Path(a.dst).parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(a.dst, SR, (np.clip(y, -1, 1) * 32767).astype(np.int16))
    print(f"{len(x) / SR:.2f}s → {len(y) / SR:.2f}s  {a.dst}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""voice_clarity.py — how clearly the voice sits over the effects + music: the level difference (dB) between the voice
and everything else, in 400 ms windows where the voice is speaking, inside the speech band (150–6000 Hz).

    uv run --with numpy --with scipy python tools/sfx/voice_clarity.py <voice.wav> <bed.wav> [--json]

<bed.wav> is out/<Comp>/<Comp>.sfx.wav (tools/sfx/mix.py writes it at the same relative level as the voice).
Targets: median ≥ 12 dB, 10th percentile ≥ 6 dB (margins are capped at 40 dB: a silent bed reads as 40). Below that, move hits into the pauses, shorten tails, duck the music.
"""
import json
import subprocess
import shutil
import sys
from pathlib import Path

import numpy as np
from scipy import signal

SR = 48000
FFMPEG = shutil.which("ffmpeg") or str(Path.home() / ".local/bin/ffmpeg")


def load(p):
    raw = subprocess.run([FFMPEG, "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def main():
    v, b = load(sys.argv[1]), load(sys.argv[2])
    n = max(len(v), len(b))
    v, b = np.pad(v, (0, n - len(v))), np.pad(b, (0, n - len(b)))
    sos = signal.butter(4, [150, 6000], btype="bandpass", fs=SR, output="sos")
    v, b = signal.sosfilt(sos, v), signal.sosfilt(sos, b)
    w = int(0.4 * SR)
    k = n // w
    rms = lambda x: 10 * np.log10(np.mean(x[: k * w].reshape(k, w) ** 2, axis=1) + 1e-12)  # noqa: E731
    vd, bd = rms(v), rms(b)
    bd = np.maximum(bd, vd - 40)  # a near-silent bed counts as 40 dB under the voice (more is not more clear)
    speaking = vd > vd.max() - 30
    m = (vd - bd)[speaking]
    res = {"windows": int(speaking.sum()), "median": round(float(np.median(m)), 1), "p10": round(float(np.percentile(m, 10)), 1), "min": round(float(m.min()), 1)} if speaking.any() else {"windows": 0}
    if "--json" in sys.argv:
        print(json.dumps(res))
    else:
        print(f"voice over bed: median {res.get('median')} dB · 10th pct {res.get('p10')} dB · min {res.get('min')} dB  ({res['windows']} speaking windows)")


if __name__ == "__main__":
    main()

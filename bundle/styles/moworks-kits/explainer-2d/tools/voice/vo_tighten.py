"""Shared helpers for the voice tools: read any audio file as 48 kHz mono, and find the speech
islands (the stretches between pauses) of a narration.

Used by align_whisper_islands.py. ffmpeg comes from the FFMPEG environment variable (the kit's Node
tools set it), else from PATH.
"""
from __future__ import annotations

import os
import subprocess

import numpy as np

SR = 48000
FFMPEG = os.environ.get("FFMPEG") or "ffmpeg"


def load(path):
    """Any audio file -> mono float32 at SR."""
    raw = subprocess.run(
        [FFMPEG, "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, np.float32).copy()


def islands(x, thresh_db=-38.0, min_sil=0.07, hop=0.005):
    """Speech islands [[start_s, end_s], …] from a 5 ms RMS envelope: everything louder than
    `thresh_db` under the loudest moment, with pauses shorter than `min_sil` bridged. Each island is
    padded a little so consonant onsets and tails stay inside."""
    h = int(SR * hop)
    n = len(x) // h
    env = np.sqrt(np.mean(x[: n * h].reshape(n, h) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(env / env.max())
    on = db > thresh_db
    segs, start = [], None
    for i, v in enumerate(on):
        if v and start is None:
            start = i
        if not v and start is not None:
            segs.append([start * hop, i * hop])
            start = None
    if start is not None:
        segs.append([start * hop, n * hop])
    merged = []
    for s in segs:
        if merged and s[0] - merged[-1][1] < min_sil:
            merged[-1][1] = s[1]
        else:
            merged.append(s)
    return [[max(0, a - 0.025), b + 0.04] for a, b in merged]

#!/usr/bin/env python3
"""Narration from one clean take, edited ONLY inside true silences, so no audio can repeat or be lost.

    node tools/py.mjs tools/voice/build_vo_silence.py <take.wav> <take transcript.json> <out vo.wav>

Silences: smoothed 10 ms RMS below -50 dB for at least 0.10 s. Every speech chunk is copied once, in
order; only the silences between them change length:
  after a sentence end (. ? !)  0.45-0.85 s
  after a comma (, ; :)         0.20-0.45 s
  anywhere else                 unchanged, at most 0.25 s
0.9 s of silence before the first word and 0.6 s after the last. The transcript only says which
punctuation precedes each silence; its word times never decide where audio is cut.
Writes 48 kHz (the take's rate) stereo 24-bit.
"""
import json
import sys

import numpy as np
import soundfile as sf


def main():
    if len(sys.argv) != 4:
        sys.exit("usage: build_vo_silence.py <take.wav> <transcript.json> <out.wav>")
    take, tx, out = sys.argv[1:4]
    X, sr = sf.read(take, always_2d=True)
    X = X[:, :2] if X.shape[1] >= 2 else np.repeat(X, 2, axis=1)
    m = X.mean(1)
    hop = 0.01
    h = int(sr * hop)
    e = np.array([20 * np.log10(np.sqrt(np.mean(m[i * h:(i + 1) * h] ** 2)) + 1e-9) for i in range(len(m) // h)])
    es = np.convolve(e, np.ones(3) / 3, mode="same")
    loud = np.nonzero(es > -45)[0]
    if len(loud) == 0:
        sys.exit("✗ the take is silent (nothing above -45 dBFS). Check the file.")
    quiet = es < -50
    if not quiet.any():
        sys.exit("✗ the take has no silences below -50 dBFS: room noise or music sits under the voice."
                 " Record a dry take in a quiet room.")
    # silent runs >= 0.10 s
    runs, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if (j - i) * hop >= 0.10:
                runs.append((i * hop, j * hop))
            i = j
        else:
            i += 1
    first = loud[0] * hop
    last = (loud[-1] + 1) * hop
    inner = [(a, b) for a, b in runs if a > first and b < last]
    raw = json.load(open(tx, encoding="utf-8"))
    raw = raw if isinstance(raw, list) else raw.get("words", [])
    words = [(str(w["text"]).strip(), float(w["start"]), float(w["end"])) for w in raw]

    def kind(a, b):
        """punctuation of the last word that starts before the middle of this silence"""
        mid = (a + b) / 2
        before = [w for w in words if w[1] < mid]
        if not before or not before[-1][0]:
            return ""
        p = before[-1][0][-1:]
        return "." if p in ".?!" else "," if p in ",;:" else ""

    def pad(s):
        return np.zeros((int(round(s * sr)), 2))

    pieces, cursor, log = [pad(0.9)], max(0.0, first - 0.03), []
    for a, b in inner:
        pieces.append(X[int(cursor * sr):int((a + 0.02) * sr)])  # speech up to just inside the silence
        gap = b - a - 0.04                                        # the silence being replaced
        k = kind(a, b)
        new = min(max(gap, 0.45), 0.85) if k == "." else min(max(gap, 0.20), 0.45) if k == "," else min(gap, 0.25)
        pieces.append(pad(new))
        log.append((round(a, 2), round(b, 2), k or "-", round(gap, 2), round(new, 2)))
        cursor = b - 0.02
    pieces.append(X[int(cursor * sr):int((last + 0.05) * sr)])
    pieces.append(pad(0.6))
    Y = np.concatenate(pieces)
    sf.write(out, Y, sr, subtype="PCM_24")
    print(f"silences edited: {len(inner)}  (start-end s, after, was, now)")
    for r in log:
        print("  ", *r)
    print(f"take speech {first:.2f}-{last:.2f} s; vo.wav {len(Y) / sr:.2f} s")


if __name__ == "__main__":
    main()

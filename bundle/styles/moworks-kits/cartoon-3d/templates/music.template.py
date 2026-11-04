#!/usr/bin/env python3
"""music_<slug>.py — ORIGINAL music for "<title>", composed in code (numpy + scipy). Made only because the user asked.
Writes public/music/<slug>/score.wav, exactly as long as the video, composed to its shot list (shots.ts) and word times.

    uv run --with numpy --with scipy python tools/music/music_<slug>.py

Then in the composition's SOUND: music: { src: "public/music/<slug>/score.wav", keys: [[t, dB], …] }
(ride it about −8 to −10 dB under a voice; let it open up in the gaps and on the title).
Instruments come from tools/sfx/sfxlib.py: piano() (felt piano), string_ks() (plucked strings), pad-like sines, sub_kick().
Never copy or imitate a known song: write your own progression and melody.
"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "sfx"))
import sfxlib as K  # noqa: E402
from sfxlib import NOTE, SR, pan, piano, put, space, tt  # noqa: E402

SLUG = "<slug>"
SECONDS = 20.0  # = the video's length
OUT = K.ROOT / f"public/music/{SLUG}/score.wav"


def score(rng):
    n = int(SECONDS * SR)
    dry = np.zeros((n, 2))

    def play(m, at, dur, vel, p=0.0):
        """one piano note: MIDI number, start (s), length (s), velocity 0..1, pan −1..1"""
        put(dry, pan(piano(NOTE(m), dur, vel, rng), p), at)

    # write YOUR progression here, timed to the video's beats. An example shape (a minor key, a bar per 3.33 s,
    # quarter-note arpeggios; faster notes when time speeds up; a hard stop when the story stops):
    bar = 10 / 3
    prog = [(38, [62, 65, 69, 65]), (34, [62, 65, 70, 65]), (41, [60, 65, 69, 65]), (36, [64, 67, 72, 67])]
    b = 0
    while 0.25 + b * bar < SECONDS - 1:
        bass, arp = prog[b % 4]
        t0 = 0.25 + b * bar
        play(bass, t0, bar + 1.2, 0.5, -0.25)
        for k in range(4):
            play(arp[k], t0 + k * bar / 4, 1.6, 0.36, 0.25)
        b += 1

    t = tt(SECONDS)
    dry *= np.clip((SECONDS - t) / 0.65, 0, 1)[:, None]  # end with the picture
    L = space(rng, dry[:, 0], wet=0.32, dur=2.6, tau=0.9, bright=3500)
    R = space(rng, dry[:, 1], wet=0.32, dur=2.6, tau=0.9, bright=3500)
    return np.stack([L[:, 0], R[:, 1]], 1)[:n]


def main():
    st = score(np.random.default_rng(1))
    st = st * (10 ** ((-19 - K.momentary_max(st)) / 20))  # designed level; the mix rides it with music keys
    st = st * min(1.0, 10 ** (K.PEAK_CAP_DB / 20) / np.max(np.abs(st)))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    K.write_wav(OUT, st)
    print(f"{OUT}  {len(st) / SR:.2f} s  M-max {K.momentary_max(st):.1f} LUFS")


if __name__ == "__main__":
    main()

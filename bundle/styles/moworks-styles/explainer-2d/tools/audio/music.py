#!/usr/bin/env python3
"""Calm, warm, wondrous music bed, synthesised in numpy.

    python music.py --cues project/cues.json --out-dir project/audio/

Dmaj9 - Gmaj9#11 - Em9 - A9sus4 (D lydian-ish colour), cycled to fill [0, title_t)
so the last chord before the title is always the sus4; the final Dadd9 RESOLVES
exactly at `title_t`, the bed swells +5 dB under the title and rings out to
`duration`. Soft detuned-saw pads through an evolving low-pass, a soft sub, a
sparse celesta motif with ping-pong echo, high shimmer, and a long
decaying-noise convolution reverb. 1 s fade-in. Output <out-dir>/music.wav.
"""
from __future__ import annotations

import argparse
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audio_common as ac  # noqa: E402

PROG = [
    dict(name="Dmaj9", pad=[50, 57, 61, 64, 66], bell=[69, 73, 76, 78, 81], sub=38),
    dict(name="Gmaj9#11", pad=[55, 59, 61, 66, 69], bell=[67, 71, 73, 78, 81], sub=31),
    dict(name="Em9", pad=[52, 55, 59, 62, 66], bell=[67, 71, 74, 78, 79], sub=28),
    dict(name="A9sus4", pad=[52, 57, 59, 62, 64], bell=[69, 71, 74, 76, 81], sub=33),
]
FINAL = dict(name="Dadd9", pad=[50, 57, 62, 66, 69, 76], bell=[74, 78, 81, 86, 90], sub=38)

CHORD_LEN_TARGET = 3.2  # s (about 75 bpm, 4 beats per chord)
SWELL_DB = 5.0     # measured loudness rise under the title vs the bed just before
SWELL_PRE = 1.2    # crescendo starts this long before title_t ...
SWELL_POST = 0.5   # ... and is complete this long after
LOUDNESS_TARGET = -18.0  # LUFS of the written stem (mix.py re-levels it anyway)

CELESTA = [(1.0, 1.0, 1.3), (2.0, 0.22, 0.6), (3.0, 0.05, 0.35), (4.0, 0.10, 0.12), (5.43, 0.035, 0.06)]


# --------------------------------------------------------------------------- building blocks
def saw_blep(freq, sr, phase0):
    """Band-limited-ish saw (polyBLEP). freq: per-sample array."""
    dt = freq / sr
    ph = (phase0 + np.cumsum(dt)) % 1.0
    y = 2.0 * ph - 1.0
    m1 = ph < dt
    x = ph[m1] / dt[m1]
    y[m1] -= 2 * x - x * x - 1
    m2 = ph > 1.0 - dt
    x = (ph[m2] - 1.0) / dt[m2]
    y[m2] -= x * x + 2 * x + 1
    return y


def seg_env(n_tot, sr, s, e, attack, release, end_hard=None):
    """Envelope over global time: raised-cos attack from s, sustain, raised-cos
    release from e lasting `release`. Returns (i0, env) for the active span."""
    i0 = max(0, int(s * sr))
    i1 = min(n_tot, int((e + release) * sr))
    if end_hard is not None:
        i1 = min(i1, int(end_hard * sr))
    if i1 <= i0:
        return i0, np.zeros(0)
    t = np.arange(i0, i1) / sr
    a = np.clip((t - s) / max(attack, 1e-4), 0, 1)
    r = np.clip((t - e) / max(release, 1e-4), 0, 1)
    env = (0.5 - 0.5 * np.cos(np.pi * a)) * (0.5 + 0.5 * np.cos(np.pi * r))
    return i0, env


def smooth_random(n, sr, rng, rate_hz=1.4, lo=0.0, hi=1.0):
    k = int(n / sr * rate_hz) + 3
    pts = rng.uniform(lo, hi, k)
    xs = np.linspace(0, n, k)
    y = np.interp(np.arange(n), xs, pts)
    w = int(sr / rate_hz)
    c = np.concatenate([[0], np.cumsum(np.concatenate([np.full(w, y[0]), y, np.full(w, y[-1])]))])
    sm = (c[w:] - c[:-w]) / w
    return sm[w // 2: w // 2 + n]


def pan_gains(p):
    th = (p + 1.0) * np.pi / 4.0
    return np.cos(th) / np.cos(np.pi / 4), np.sin(th) / np.sin(np.pi / 4)


def struck(n, sr, f, partials, rng, att=0.003):
    tt = np.arange(n) / sr
    y = np.zeros(n)
    for r, a, tau in partials:
        if f * r < sr * 0.45:
            y += a * np.sin(2 * np.pi * f * r * tt + rng.uniform(0, 2 * np.pi)) * np.exp(-tt / tau)
    na = max(1, int(att * sr))
    y[:na] *= 0.5 - 0.5 * np.cos(np.pi * np.arange(na) / na)
    fo = int(0.3 * sr)
    y[-fo:] *= np.linspace(1, 0, fo)
    return y


def add_at(bus, i0, sig2):
    """bus (n, 2) += sig2 (m, 2) at i0, clipped."""
    n = len(bus)
    m = min(len(sig2), n - i0)
    if m > 0 and i0 >= 0:
        bus[i0:i0 + m] += sig2[:m]


# --------------------------------------------------------------------------- arrangement
def plan(duration, title_t):
    if title_t is None:
        title_t = max(0.0, duration - min(3.0, 0.2 * duration))
    title_t = float(np.clip(title_t, 0.0, duration))
    segs = []
    if title_t >= 1.5:
        cycle = len(PROG) * CHORD_LEN_TARGET
        if title_t >= 0.75 * cycle:
            # whole cycles: start on the tonic, end on the sus4
            N = len(PROG) * max(1, int(round(title_t / cycle)))
        else:
            N = max(1, int(round(title_t / CHORD_LEN_TARGET)))  # tail of the cycle
        L = title_t / N
        for i in range(N):
            segs.append((i * L, (i + 1) * L, PROG[(i - N) % len(PROG)]))
    segs.append((title_t, duration, FINAL))
    return title_t, segs


def render(cfg, seed):
    sr, n, dur = cfg["sr"], cfg["n"], cfg["duration"]
    rng = np.random.default_rng([seed, 99])
    title_t, segs = plan(dur, cfg["title_t"])
    final_rel = min(2.2, max(0.5, dur - title_t - 0.2))

    pads = np.zeros((n, 2))
    sub = np.zeros(n)
    bells = np.zeros((n, 2))
    shimmer = np.zeros((n, 2))

    # ---- pads + sub + shimmer, per chord
    for k, (s, e, ch) in enumerate(segs):
        final = ch is FINAL
        attack = 0.12 if final else (1.6 if k == 0 else 1.2)
        release = final_rel if final else 1.9
        e_rel = (dur - final_rel) if final else e
        i0, env = seg_env(n, sr, s, e_rel, attack, release, end_hard=dur)
        m = len(env)
        if m == 0:
            continue
        t = np.arange(i0, i0 + m) / sr
        for j, note in enumerate(ch["pad"]):
            f0 = float(ac.mtof(note))
            amp = 0.11 / (1 + 0.12 * j)
            for v, (det, pan) in enumerate(((-9.0, -0.55), (0.0, 0.0), (9.0, 0.55))):
                drift = 3.0 * np.sin(2 * np.pi * rng.uniform(0.07, 0.17) * t + rng.uniform(0, 6.28))
                f = f0 * 2 ** ((det + rng.uniform(-2, 2) + drift) / 1200)
                y = saw_blep(f, sr, rng.uniform()) * env * amp
                gl, gr = pan_gains(pan)
                pads[i0:i0 + m, 0] += y * gl
                pads[i0:i0 + m, 1] += y * gr
        # soft sub on the chord root
        sa = 0.06 if final else (1.5 if k == 0 else 0.7)
        si0, senv = seg_env(n, sr, s, e_rel, sa, 1.0 if not final else final_rel, end_hard=dur)
        st = np.arange(si0, si0 + len(senv)) / sr
        fs = float(ac.mtof(ch["sub"]))
        sub[si0:si0 + len(senv)] += (np.sin(2 * np.pi * fs * st) + 0.12 * np.sin(4 * np.pi * fs * st)) * senv
        # shimmer: top chord tones two octaves up with slowly wandering levels
        for note in ch["pad"][-3:]:
            fsh = float(ac.mtof(note + 24))
            wob = smooth_random(m, sr, rng, rate_hz=0.8, lo=0.15, hi=1.0)
            y = np.sin(2 * np.pi * fsh * t + rng.uniform(0, 6.28)) * wob * env * 0.03
            gl, gr = pan_gains(rng.uniform(-0.7, 0.7))
            shimmer[i0:i0 + m, 0] += y * gl
            shimmer[i0:i0 + m, 1] += y * gr

    # evolving low-pass on the pads (opens up under the title)
    tg = np.arange(n) / sr
    cutoff = 1000.0 * 2 ** (0.5 * np.sin(2 * np.pi * tg / 9.0 + 0.3))
    cutoff *= 1 + 1.4 * ac.smoothstep((tg - (title_t - 0.6)) / 1.2)
    pads = ac.sos_filter(pads, "high", 110.0, sr, 2)
    pads = ac.tv_lowpass(pads, np.clip(cutoff, 300, 6000), sr, q=0.65)

    # ---- celesta motif
    patterns = [[(0, 0), (2, 2), (3, 4), (5, 3)], [(0, 1), (2, 3), (3, 4), (6, 2)]]
    note_len = int(4.0 * sr)
    pre_segs = [sg for sg in segs if sg[2] is not FINAL]
    for k, (s, e, ch) in enumerate(pre_segs):
        step = (e - s) / 8.0
        pat = list(patterns[k % 2])
        if rng.random() < 0.3:
            pat.append((7, int(rng.integers(0, 5))))
        for stp, idx in pat:
            if k == 0 and stp < 2:
                continue
            if k == len(pre_segs) - 1 and stp >= 6:
                continue  # leave a breath before the resolution
            midi = ch["bell"][idx] + 12 + (12 if rng.random() < 0.12 else 0)
            vel = (1.0 if stp == 0 else rng.uniform(0.6, 0.85))
            y = struck(note_len, sr, float(ac.mtof(midi)), CELESTA, rng) * vel
            gl, gr = pan_gains(float(np.clip((midi - 84) / 14.0, -0.5, 0.5)))
            add_at(bells, int((s + stp * step) * sr), np.stack([y * gl, y * gr], axis=1))
    # resolution: Dadd9 struck together exactly on title_t (humanised < 4 ms),
    # then two late ringing notes
    for j, midi in enumerate(FINAL["bell"]):
        y = struck(note_len + int(sr), sr, float(ac.mtof(midi)),
                   [(r, a, tau * 1.6) for r, a, tau in CELESTA], rng) * (1.0 - 0.08 * j)
        gl, gr = pan_gains((j / 4.0 - 0.5) * 0.7)
        off = (0.0, 0.003, 0.001, 0.004, 0.002)[j % 5]
        add_at(bells, int(round((title_t + off) * sr)), np.stack([y * gl, y * gr], axis=1))
    for dt_, midi in ((1.6, 93), (2.5, 86)):
        if title_t + dt_ < dur - 0.8:
            y = struck(note_len, sr, float(ac.mtof(midi)), CELESTA, rng) * 0.45
            add_at(bells, int((title_t + dt_) * sr), np.stack([y, y], axis=1) * 0.8)
    # ping-pong echo (dotted rhythm of the motif grid)
    step0 = (pre_segs[0][1] - pre_segs[0][0]) / 8.0 if pre_segs else 0.4
    D = int(1.5 * step0 * sr)
    mono = bells.mean(axis=1)
    echo = np.zeros((n, 2))
    for k in range(1, 5):
        sh = k * D
        if sh >= n:
            break
        echo[sh:, k % 2] += mono[:n - sh] * (0.34 ** k)
    echo = ac.sos_filter(echo, "low", 3500.0, sr, 2)
    bells = bells + echo * 0.9

    # ---- reverb + sum
    sub2 = np.stack([sub, sub], axis=1) * 0.2
    send = pads * 0.45 + bells * 0.7 + shimmer * 1.0
    ir = ac.make_ir(sr, seed + 31, length=5.5, t60=(5.0, 4.0, 2.8, 1.6), predelay=0.03, brightness=8000)
    wet = ac.convolve_stereo(send, ir)
    out = pads + bells * 0.55 + shimmer * 0.3 + sub2 + wet * 0.55

    # ---- automation: fade-in, title swell, ring-out fade
    g = np.ones(n)
    fi = int(1.0 * sr)
    g[:fi] *= np.sin(np.linspace(0, np.pi / 2, fi)) ** 2
    fo = int(min(0.5, dur * 0.1) * sr)
    g[n - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    # crescendo into the resolution; its depth is calibrated so the MEASURED
    # loudness under the title is SWELL_DB above the bed just before it (the new
    # chord's own onset already adds a few dB).
    ramp = ac.smoothstep((tg - (title_t - SWELL_PRE)) / (SWELL_PRE + SWELL_POST))
    swell = SWELL_DB
    before, after = swell_report(out * g[:, None], sr, title_t, dur)
    if np.isfinite(before) and np.isfinite(after):
        swell = float(np.clip(SWELL_DB - (after - before), 0.0, 9.0))
        for _ in range(2):
            b2, a2 = swell_report(out * (g * ac.db2lin(swell * ramp))[:, None], sr, title_t, dur)
            swell = float(np.clip(swell + SWELL_DB - (a2 - b2), 0.0, 9.0))
    g *= ac.db2lin(swell * ramp)
    out *= g[:, None]

    lufs = ac.integrated_lufs(out, sr)
    out *= ac.db2lin(LOUDNESS_TARGET - lufs)
    tp = ac.true_peak_db(out)
    if tp > -1.0:
        out *= ac.db2lin(-1.0 - tp)
    return out, title_t, segs, swell


def swell_report(out, sr, title_t, dur):
    curve = ac.loudness_curve(out, sr, 0.4)

    def mean_db(a, b):
        a, b = max(0.0, a), min(dur, b)
        if b - a < 0.2:
            return float("nan")
        seg = curve[int(a * sr):int(b * sr)]
        return float(10 * np.log10(np.mean(10 ** (seg / 10))))

    return (mean_db(title_t - SWELL_PRE - 1.8, title_t - SWELL_PRE),
            mean_db(title_t + SWELL_POST, title_t + SWELL_POST + 1.2))


def main(argv=None):
    p = argparse.ArgumentParser(description="Synthesise the music bed from cues.json -> music.wav")
    p.add_argument("--cues", required=True, help="path to cues.json")
    p.add_argument("--out-dir", help="output directory (default: <cues dir>/audio)")
    p.add_argument("--seed", type=int, help="override seed (default: cues.json 'seed' or 1234)")
    a = p.parse_args(argv)
    t0 = time.time()
    cfg = ac.load_cues(a.cues)
    out_dir = a.out_dir or ac.default_out_dir(cfg)
    seed = a.seed if a.seed is not None else cfg["seed"]
    out, title_t, segs, swell = render(cfg, seed)
    path = os.path.join(out_dir, "music.wav")
    ac.write_wav(path, out, cfg["sr"])
    before, after = swell_report(out, cfg["sr"], title_t, cfg["duration"])
    chords = "  ".join(f"{s:.2f}s {c['name']}" for s, _, c in segs)
    print(f"music.py: {path}  ({cfg['duration']:.2f}s, {ac.integrated_lufs(out, cfg['sr']):.1f} LUFS, "
          f"peak {ac.true_peak_db(out):.1f} dBTP, {time.time() - t0:.1f}s)")
    print(f"  chords: {chords}")
    print(f"  resolution at {title_t:.3f}s; loudness before {before:.1f} -> under title {after:.1f} LUFS "
          f"({after - before:+.1f} dB; swell automation {swell:+.1f} dB)")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Effects + clinic room tone for "Where the Needle Stops" -> scratch sfx_*_raw (+ event log).

    run by build.mjs: sfx_inj.py --scratch DIR

Reads audio/cues.json (cues_inj.py) and audio/vo.wav (optional). Every effect is synthesised here
from oscillators and noise (seeded, deterministic), given its reverb, then scaled so its isolated
max momentary loudness sits at the cue's "lu" re the voice's integrated loudness (with no narrator,
re a virtual voice; see injsynth.VIRTUAL_VO_LUFS). Where each effect lands on its cue time
is listed in LAND (hit = transient on t, peak = swell peaks on t, start = begins on t).
Long layers that run under words get a speech-band carve keyed from the voice so the
narration stays clear.

Palette: warm, soft and small (a calming medical topic): glassy glints, soft swishes, tiny
pitched drips and pops in F major (the score's key), gentle liquid sounds, no harsh edges.

The room tone (quiet air + a faint low hum) follows the shots: full in the clinic and
arm shots and under the title, muffled and lower inside the body (shots 3-10), faded in
over the first 0.6 s and out over the last 1.2 s.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import injsynth as L  # noqa: E402
from injsynth import SR, ns, tvec, db, env_ad, osc, lp, hp, bp, widen, pan, to_stereo, mtof  # noqa: E402

GLASS = [(1.0, 1.0, 0.55), (2.76, 0.30, 0.18), (5.40, 0.10, 0.07), (8.93, 0.035, 0.03)]
F_PENT = [65, 67, 69, 72, 74]  # F G A C D (F major pentatonic, octave 4)

# lowest frequency of the speech-band carve per kind (default 700 Hz); the
# long low layers that run under words are carved from 250 Hz so the voice's first formant
# stays clear too
CARVE_LO = {"plunger": 250.0, "bubble_bed": 250.0, "slide_drop": 250.0, "needle_slide": 400.0}

# how each kind lands on its cue time (tools/audio/verify_mix.py checks these)
LAND = {
    "glint": "hit", "prick": "hit", "drip": "hit", "pop": "hit", "gulp": "hit", "splash": "hit",
    "snip": "hit", "thud": "hit", "tick": "hit", "clock_tick": "hit", "sparkle": "hit", "heartbeat": "hit",
    "swish": "peak",
    "plunger": "start", "slide_drop": "start", "bubble_bed": "start", "fizz": "start",
    "bright_whoosh": "start", "needle_slide": "start", "fast_whoosh": "start", "shimmer": "start",
    "soft_slide": "start",
}


# ============================================================================ small helpers
def glass_tone(n, f, rng, start=0, att=0.002, decay_scale=1.0, punch=(0.35, 0.05)):
    parts = [(r, a, tau * decay_scale) for r, a, tau in GLASS]
    return L.additive(n, float(f), parts, rng, start=start, att=att, punch=punch)


def stereo_band(n, rng, fc, bw, corr=0.5):
    """Band noise (time-varying centre fc) with partial L/R correlation."""
    a, b = np.sqrt(corr), np.sqrt(1 - corr)
    common = L.band_noise_tv(n, rng, fc, bw)
    return np.stack([a * common + b * L.band_noise_tv(n, rng, fc, bw) for _ in range(2)], axis=1)


def span_env(n, D, att, rel, start=0):
    """Raised-cosine attack, hold to D, raised-cosine release of `rel` s ending at D + rel."""
    tt = tvec(n) - start / SR
    a = np.clip(tt / max(att, 1e-4), 0, 1)
    r = np.clip((tt - D) / max(rel, 1e-4), 0, 1)
    e = (0.5 - 0.5 * np.cos(np.pi * a)) * (0.5 + 0.5 * np.cos(np.pi * r))
    e[tt < 0] = 0.0
    return e


def bubbles(n, rng, rate, f_lo, f_hi, tau=(0.010, 0.035), rise=(0.3, 0.9), curve=None, spread=0.6,
            amp_sigma=0.5):
    """Field of liquid bubbles (Poisson), stereo."""
    out = np.zeros((n, 2))
    dur = n / SR
    if curve is None:
        times = np.sort(rng.uniform(0, dur, rng.poisson(rate * dur)))
    else:  # thinning by a 0..1 density curve
        cand = np.sort(rng.uniform(0, dur, rng.poisson(rate * dur)))
        keep = rng.random(len(cand)) < np.interp(cand, tvec(n), curve)
        times = cand[keep]
    for t0 in times:
        f0 = np.exp(rng.uniform(np.log(f_lo), np.log(f_hi)))
        ta = rng.uniform(*tau)
        m = ns(min(6 * ta, 0.25))
        b = L.bubble(m, f0, rng, tau=ta, rise=rng.uniform(*rise)) * rng.lognormal(0, amp_sigma)
        b *= (300.0 / f0) ** 0.25  # small bubbles a little quieter
        L.place(out, pan(b, rng.uniform(-spread, spread)), ns(t0))
    return out


def thump(n, rng, start, f_hi, f_lo, tau, amp):
    """Soft heartbeat-style thump."""
    m = n - start
    if m <= 0:
        return np.zeros(n)
    tt = tvec(m)
    f = f_lo + (f_hi - f_lo) * np.exp(-tt / 0.025)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(m, 0.006, tau)
    s += 0.6 * lp(rng.standard_normal(m), 180, 4) * env_ad(m, 0.004, tau * 0.6) * 3.0
    s += 0.05 * bp(rng.standard_normal(m), 150, 500) * env_ad(m, 0.002, 0.02)
    s = L.soft_sat(1.3 * s, 1.6) * amp
    out = np.zeros(n)
    out[start:] = s
    return out


# ============================================================================ generators
# Each returns (y (n,) or (n,2), anchor_sample, ir_name or None, send, carve_db, carve_after_s)

def g_glint(rng, c):
    """Glassy glint on the needle tip: a three-note glass 'ting' + a soft bright shing with a
    little twinkle on the tail. ANCHOR: the strike."""
    n = ns(1.5)
    tt = tvec(n)
    s0 = ns(0.0015)
    y = np.zeros(n)
    for m, amp, d in ((96, 1.0, 0.0), (105, 0.42, 0.016), (101, 0.30, 0.034)):  # C7, A7, F7
        y += amp * glass_tone(n, mtof(m), rng, start=ns(d), att=0.0015, decay_scale=0.75)
    trem = 1 - 0.3 * (0.5 + 0.5 * np.sin(2 * np.pi * 13.0 * tt)) * np.clip((tt - 0.06) / 0.1, 0, 1)
    y *= trem
    shing = L.band_noise_tv(n, rng, 5200 * 2.0 ** np.clip(tt / 0.07, 0, 1), 0.7) * env_ad(n, 0.0015, 0.028) * 0.30
    y = hp(lp(y + shing, 12000), 1500)
    return widen(y, rng, 0.35), s0, "air", 0.30, 0.0, 0.0


def g_swish(rng, c):
    """Soft, low-ish swish (warm band noise fly-by), short rise so it stays off the word
    before it, decaying into the pause after. ANCHOR: peak."""
    D = float(c.get("dur", 0.4))
    pre, post = 0.4 * D, 0.5 * D + 0.1
    a = ns(pre)
    n = a + ns(post)
    e = L.flyby(n, a, 0.08 * D, 0.14 * D, p=1.5)
    rise = np.arange(n) < a
    fc = np.where(rise, 450 * (1900 / 450) ** e, 700 * (1900 / 700) ** e)
    nz = stereo_band(n, rng, fc, 1.3, corr=0.55)
    air = stereo_band(n, rng, 6000, 1.0, corr=0.3) * (0.10 * e)[:, None]
    y = (nz + air) * e[:, None]
    y = lp(y, 5000)
    p0, p1 = (0.45, 0.05) if c.get("id") == "syringe arrives" else (-0.25, 0.25)
    pc = p0 + (p1 - p0) * (0.5 + 0.5 * np.tanh((np.arange(n) - a) / (0.12 * D * SR)))
    return pan(y, pc), a, "room", 0.10, 0.0, 0.0


def g_prick(rng, c):
    """Tiny prick: a pin-point tick, a little pitched pip and a soft skin dimple. ANCHOR: tick."""
    n = ns(0.5)
    tt = tvec(n)
    s0 = ns(0.001)
    tick = bp(rng.standard_normal(n), 2500, 7000) * env_ad(n, 0.0006, 0.0022, s0)
    f = 2093.0 * (1 - 0.18 * (1 - np.exp(-tt / 0.02)))  # C7 easing down a touch
    pip = osc(f) * env_ad(n, 0.001, 0.028, s0) * 0.45
    dimple = osc(110 + 200 * np.exp(-tt / 0.04)) * env_ad(n, 0.004, 0.05, s0) * 0.55
    squish = lp(bp(rng.standard_normal(n), 300, 1800), 1500) * env_ad(n, 0.006, 0.03, s0) * 0.18
    y = 0.40 * tick + pip + dimple + squish
    return widen(y, rng, 0.15), s0, "room", 0.12, 0.0, 0.0


def g_plunger(rng, c):
    """Plunger push: a soft rubber squeak as it starts, a smooth low liquid push under the
    words with a few small bubbles, and a soft rubbery 'thup' as it bottoms out at the span
    end. ANCHOR: start (the squeak)."""
    D = float(c.get("dur", 2.3))
    n = ns(D + 0.6)
    tt = tvec(n)
    # rubber squeak (stick-slip): rounded pulse at a wobbling, slightly rising pitch
    f = (430 + 140 * np.clip(tt / 0.16, 0, 1)) * (1 + 0.03 * L.smooth_noise(n, rng, 45))
    sq = L.soft_sat(2.4 * osc(f), 2.0) + 0.25 * osc(2 * f)
    sq = bp(sq, 500, 2400) * (1 + 0.35 * L.smooth_noise(n, rng, 70))
    sq *= env_ad(n, 0.012, 0.04, 0, hold=0.11)
    # small second squeak as the stopper settles
    s2 = ns(0.24)
    f2 = 520 * (1 + 0.03 * L.smooth_noise(n, rng, 40))
    sq2 = bp(L.soft_sat(2.0 * osc(f2), 2.0), 500, 2200) * env_ad(n, 0.01, 0.03, s2, hold=0.04) * 0.4
    # liquid push: smooth low flow with a gentle swell, plus a few bubbles
    flow_env = span_env(n, D - 0.12, 0.25, 0.12, ns(0.12))
    flow = np.stack([lp(L.brown(n, rng), 420, 2) + 0.25 * bp(rng.standard_normal(n), 300, 900) for _ in range(2)],
                    axis=1)
    flow *= ((1 + 0.25 * L.smooth_noise(n, rng, 2.5)) * flow_env * 0.24)[:, None]
    bub = bubbles(n, rng, 7, 300, 800, tau=(0.015, 0.035), rise=(0.4, 0.8), curve=flow_env, spread=0.3)
    bub *= 0.24
    # end: soft rubbery thup as the plunger reaches the bottom
    se = ns(D)
    th = osc(70 + 80 * np.exp(-np.maximum(tt - D, 0) / 0.02)) * env_ad(n, 0.004, 0.05, se) * 0.5
    th += 0.12 * bp(rng.standard_normal(n), 400, 2000) * env_ad(n, 0.001, 0.008, se)
    y = to_stereo(0.55 * sq + sq2 + th) + flow + bub
    y = lp(y, 6000)
    return pan(y, 0.15), 0, "room", 0.12, 6.0, 0.3


def g_drip(rng, c):
    """One tiny drip tick, pitched up a step for every drop (G5 .. F7, F major pentatonic).
    ANCHOR: the plip."""
    k = int(c.get("k", 0))
    m = [79, 81, 84, 86, 89, 91, 93, 96, 98, 101][k % 10]
    f0 = float(mtof(m))
    n = ns(0.25)
    s0 = ns(0.0008)
    y = np.zeros(n)
    y[s0:] = L.bubble(n - s0, f0 / 1.25, rng, tau=0.013, rise=0.3, att=0.0008)
    y += 0.22 * L.additive(n, 2 * f0, [(1.0, 1.0, 0.018)], rng, start=s0, att=0.0006)
    y += 0.05 * bp(rng.standard_normal(n), 3000, 6500) * env_ad(n, 0.0003, 0.0008, s0)
    y = lp(y, 7000)
    return pan(widen(y, rng, 0.1), -0.45 + 0.1 * k), s0, "room", 0.16, 0.0, 0.0


def g_pop(rng, c):
    """Soft pitched bubble pop (label pills, title words); plaster: + a soft sticky press.
    ANCHOR: end of the 4 ms attack."""
    f = float(mtof(c.get("note", 72)))
    title = bool(c.get("title"))
    plaster = bool(c.get("plaster"))
    n = ns(0.6)
    tt = tvec(n)
    att = 0.004
    glide = 0.70 + 0.30 * (1 - np.exp(-tt / 0.014))
    ph = 2 * np.pi * np.cumsum(f * glide) / SR
    y = np.sin(ph) * env_ad(n, att, 0.09 if title else 0.07)
    y += 0.10 * np.sin(2 * ph + 0.4) * env_ad(n, att, 0.03)
    y += 0.04 * np.sin(3 * ph + 1.0) * env_ad(n, att, 0.016)
    y += 0.28 * osc(140 + 170 * np.exp(-tt / 0.02)) * env_ad(n, 0.003, 0.04)
    if title:
        y += 0.26 * np.sin(ph / 2 + 0.2) * env_ad(n, 0.005, 0.15)
    if plaster:  # pressed-on plaster: a soft low 'thup' and a tiny sticky tick
        y += 0.45 * osc(95 + 90 * np.exp(-tt / 0.018)) * env_ad(n, 0.003, 0.06)
        y += 0.06 * bp(rng.standard_normal(n), 1500, 6000) * env_ad(n, 0.0005, 0.004, ns(0.012))
    y = lp(y, 4200, 4)
    return widen(y, rng, 0.18), ns(att), "room", 0.20, 0.0, 0.0


def g_gulp(rng, c):
    """Soft gulp: a rounded down-gliding 'glk' plus a small bubble right after. ANCHOR: glk."""
    n = ns(0.6)
    tt = tvec(n)
    s0 = ns(0.003)
    f = 140 + 250 * np.exp(-tt / 0.035)
    body = np.tanh(1.8 * osc(f)) * env_ad(n, 0.003, 0.065, s0)
    body = bp(body, 110, 1300)
    b2 = np.zeros(n)
    s2 = ns(0.085)
    b2[s2:] = L.bubble(n - s2, 220, rng, tau=0.035, rise=0.7, att=0.003)
    th = osc(85 + 60 * np.exp(-tt / 0.02)) * env_ad(n, 0.003, 0.06, s0)
    y = 0.8 * body + 0.45 * b2 + 0.45 * th
    y = lp(y, 2500)
    return widen(y, rng, 0.12), s0, "body", 0.22, 0.0, 0.0


def g_slide_drop(rng, c):
    """The blob slides down to the stomach: a soft, airy downward glide, then a little plop on
    the span end (stomach). ANCHOR: start."""
    D = float(c.get("dur", 1.15))
    n = ns(D + 0.6)
    tt = tvec(n)
    u = np.clip(tt / D, 0, 1)
    f = 720 * (250 / 720) ** (u ** 0.85)
    vib = 1 + 0.010 * np.sin(2 * np.pi * 5.5 * tt)
    tone = osc(f * vib) + 0.22 * osc(2 * f * vib, phase=0.3)
    e = span_env(n, D - 0.05, 0.14, 0.06) * (1.0 - 0.35 * u)
    air = L.band_noise_tv(n, rng, 2.2 * f, 1.1) * 0.55
    glide = lp((0.5 * tone + air) * e, 3000)
    sp = ns(D)
    plop = np.zeros(n)
    plop[sp:] = L.bubble(n - sp, 240, rng, tau=0.04, rise=0.8, att=0.003) * 1.4
    plop += osc(80 + 70 * np.exp(-np.maximum(tt - D, 0) / 0.02)) * env_ad(n, 0.003, 0.05, sp) * 0.6
    y = glide + plop
    pc = 0.1 - 0.15 * u
    return pan(y, pc), 0, "body", 0.25, 4.0, 0.0


def g_bubble_bed(rng, c):
    """Stomach acid: gentle low bubbling with a soft gurgle and a faint surface fizz, for the
    whole shot (span end = the next cut). ANCHOR: start."""
    D = float(c.get("dur", 5.0))
    n = ns(D + 0.3)
    tt = tvec(n)
    e = span_env(n, D - 0.12, 0.2, 0.12)
    dens = 0.6 + 0.4 * (0.5 + 0.5 * L.smooth_noise(n, rng, 0.8))
    bub = bubbles(n, rng, 22, 150, 620, tau=(0.012, 0.045), rise=(0.4, 0.9), curve=dens, spread=0.65)
    gur = np.stack([lp(L.brown(n, rng), 200, 2) for _ in range(2)], axis=1)
    gur *= (0.55 + 0.45 * np.clip(L.smooth_noise(n, rng, 3.0), -1, 1))[:, None] * 0.35
    pops = np.stack([bp(L.sparse_impulses(n, rng, 45, 0.7), 2500, 8000) for _ in range(2)], axis=1) * 0.25
    fizz = np.stack([lp(hp(rng.standard_normal(n), 3500), 9000) for _ in range(2)], axis=1) * 0.02
    y = (bub + gur + pops + fizz) * e[:, None]
    return y, 0, "body", 0.30, 6.0, 0.0


def g_splash(rng, c):
    """Gentle liquid splash (size 0..1): plunk + body + a short soft spray + droplets falling
    back. ANCHOR: the plunk."""
    size = float(c.get("size", 0.8))
    n = ns(1.2)
    tt = tvec(n)
    s0 = ns(0.002)
    plunk = np.zeros(n)
    plunk[s0:] = L.bubble(n - s0, 300 - 110 * size, rng, tau=0.045 + 0.03 * size, rise=0.9, att=0.002)
    body = osc(70 + 30 * (1 - size) + 90 * np.exp(-tt / 0.02)) * env_ad(n, 0.003, 0.05 + 0.04 * size, s0)
    spray = stereo_band(n, rng, 3200 - 600 * size, 1.6, corr=0.3) * env_ad(n, 0.004, 0.07 + 0.05 * size, s0)[:, None]
    dcur = env_ad(n, 0.02, 0.25, s0 + ns(0.05))
    drops = bubbles(n, rng, 40 * (0.6 + size), 900, 2600, tau=(0.004, 0.010), rise=(0.3, 0.6), curve=dcur,
                    spread=0.7)
    y = to_stereo(0.8 * plunk + 0.5 * body) + 0.22 * spray + 0.30 * drops
    y = lp(y, 9000)
    return pan(y, 0.1 if size < 0.8 else -0.1), s0, "body", 0.25, 0.0, 0.0


def g_snip(rng, c):
    """Little enzyme snip: two small metallic blade clicks 16 ms apart and a tiny body.
    ANCHOR: first click."""
    k = int(c.get("k", 0))
    n = ns(0.3)
    tt = tvec(n)
    s0 = ns(0.010)
    f = 3000 * (1 + 0.05 * ((k * 3) % 5 - 2))
    modes = [(1.0, 1.0, 0.009), (1.71, 0.55, 0.006), (2.63, 0.28, 0.004)]
    pre = L.band_noise_tv(n, rng, 5000, 1.0) * np.where(np.arange(n) < s0, (np.arange(n) / s0) ** 2, 0.0) * 0.08
    cl1 = L.additive(n, f, modes, rng, start=s0, att=0.0003)
    cl2 = 0.45 * L.additive(n, f * 1.09, modes, rng, start=s0 + ns(0.016), att=0.0003)
    bod = 0.30 * osc(500 + 300 * np.exp(-np.maximum(tt - s0 / SR, 0) / 0.004)) * env_ad(n, 0.0005, 0.008, s0)
    y = hp(lp(pre + cl1 + cl2 + bod, 11000), 400)
    return pan(widen(y, rng, 0.1), [-0.35, 0.3, -0.15, 0.4, -0.4, 0.15][k % 6]), s0, "body", 0.15, 0.0, 0.0


def g_fizz(rng, c):
    """Soft fizz over a span. mode: 'slow' (fat: sparse, soft, slow swell), 'fast' (muscle:
    denser, brighter, quicker), 'digest' (stomach: dissolving fizz). ANCHOR: start."""
    D = float(c.get("dur", 2.0))
    mode = c.get("mode", "slow")
    P = {"slow": dict(rate=10, f=(800, 2400), att=0.35, rel=0.25, hiss=0.05, hc=3500, tau=(0.006, 0.014)),
         "fast": dict(rate=42, f=(1100, 3400), att=0.25, rel=0.2, hiss=0.07, hc=5000, tau=(0.004, 0.010)),
         "digest": dict(rate=32, f=(900, 3000), att=0.15, rel=0.15, hiss=0.07, hc=4500, tau=(0.004, 0.012))}[mode]
    n = ns(D + 0.5)
    tt = tvec(n)
    e = span_env(n, D - P["rel"], P["att"], P["rel"])
    u = np.clip(tt / D, 0, 1)
    if mode == "digest":  # dissolving: builds toward the pause before the cut
        e = e * (0.25 + 0.75 * u ** 3.0)
    dens = e * ((0.6 + 0.4 * u) if mode == "fast" else (0.8 + 0.2 * np.sin(np.pi * u)))
    bub = bubbles(n, rng, P["rate"], *P["f"], tau=P["tau"], rise=(0.3, 0.7), curve=dens, spread=0.7)
    hiss = stereo_band(n, rng, P["hc"], 1.4, corr=0.2) * (P["hiss"] * e * (1 + 0.3 * L.smooth_noise(n, rng, 4)))[:, None]
    y = bub * 0.5 + hiss
    drift = 0.3 * L.smooth_noise(n, rng, 0.4)
    return pan(y, drift), 0, "body", 0.25, 5.0, 0.0


def g_thud(rng, c):
    """Dull, soft felt thud. ANCHOR: the hit."""
    n = ns(0.8)
    tt = tvec(n)
    s0 = ns(0.003)
    body = osc(55 + 50 * np.exp(-tt / 0.03)) * env_ad(n, 0.004, 0.13, s0)
    felt = lp(L.brown(n, rng), 300, 4) * env_ad(n, 0.003, 0.06, s0) * 0.8
    knock = bp(rng.standard_normal(n), 200, 900) * env_ad(n, 0.002, 0.018, s0) * 0.25
    y = L.soft_sat(1.3 * (body + felt + knock), 1.5)
    y = lp(y, 900)
    return widen(y, rng, 0.08), s0, "room", 0.15, 0.0, 0.0


def g_bright_whoosh(rng, c):
    """Bright airy whoosh for the shortcut arrow: a rising band sweep that starts with the
    arrow and peaks as it reaches the vessels (+0.40 s, the end of "shortcut"), a glassy
    F-major run climbing with it and a sheen, panned from the arm into the vessels.
    ANCHOR: start."""
    pk = 0.40
    n = ns(1.6)
    tt = tvec(n)
    e = np.where(tt < pk, (tt / pk) ** 2.0, np.exp(-(tt - pk) / 0.16))
    e[:ns(0.015)] *= L.rc_fade(ns(0.015))
    e = np.maximum(e, 0.10 * L.rc_fade(n, False) * (tt < pk))  # a soft breath of air from the start
    fc = 800 * (4800 / 800) ** np.clip(tt / (pk + 0.05), 0, 1)
    nz = stereo_band(n, rng, fc, 1.1, corr=0.45) * e[:, None]
    run = np.zeros(n)
    for j, m in enumerate((89, 93, 96, 101)):  # F6 A6 C7 F7, the last on the peak
        run += glass_tone(n, mtof(m), rng, start=ns(pk - 0.27 + 0.09 * j), att=0.002, decay_scale=0.6) * (0.55 + 0.15 * j)
    sheen = stereo_band(n, rng, 7000, 0.8, corr=0.2) * (0.08 * e ** 2)[:, None]
    y = 0.85 * nz + to_stereo(0.24 * run) + sheen
    y = lp(y, 9000)
    pc = -0.5 + 0.9 * np.clip(tt / 0.6, 0, 1)
    return pan(y, pc), 0, "air", 0.25, 4.0, 0.0


def g_needle_slide(rng, c):
    """Soft needle slide into tissue: a quiet 'shff' gliding slightly down as it goes deeper,
    stopping on the span end. ANCHOR: start."""
    k = int(c.get("k", 0))
    D = float(c.get("dur", 0.4))
    n = ns(D + 0.3)
    tt = tvec(n)
    u = np.clip(tt / D, 0, 1)
    e = span_env(n, D - 0.03, 0.02, 0.03) * (0.75 + 0.25 * u)
    fc = (1900 - 300 * k) * 0.72 ** u
    nz = L.band_noise_tv(n, rng, fc, 1.1)
    tone = 0.10 * osc((640 - 90 * k) * (1 - 0.12 * u))
    y = (nz + tone) * e
    return pan(widen(y, rng, 0.15), [-0.35, 0.0, 0.35][k % 3]), 0, "room", 0.10, 5.0, 0.0


def g_tick(rng, c):
    """Soft glassy-woody tick as a needle stops (lower for the deeper ones). ANCHOR: attack."""
    k = int(c.get("k", 0))
    n = ns(0.15)
    base = [2100.0, 1760.0, 1480.0][k % 3]
    modes = [(1.0, 1.0, 0.012), (2.31, 0.40, 0.006), (3.9, 0.15, 0.003)]
    y = L.additive(n, base, modes, rng, att=0.0007)
    y += 0.10 * lp(rng.standard_normal(n), 4500) * env_ad(n, 0.0004, 0.001)
    y = lp(y, 7000)
    return pan(widen(y, rng, 0.1), [-0.35, 0.0, 0.35][k % 3]), ns(0.0007), "room", 0.15, 0.0, 0.0


def g_clock_tick(rng, c):
    """Soft woody clock tick (tock lower). ANCHOR: attack."""
    n = ns(0.15)
    base = 1500.0 if c.get("tock") else 1950.0
    modes = [(1.0, 1.0, 0.014), (2.31, 0.42, 0.007), (3.9, 0.18, 0.004), (5.6, 0.07, 0.003)]
    y = L.additive(n, base, modes, rng, att=0.0007)
    y += 0.12 * lp(rng.standard_normal(n), 4500) * env_ad(n, 0.0004, 0.001)
    y = lp(y, 6500)
    return widen(y, rng, 0.1), ns(0.0007), "room", 0.15, 0.0, 0.0


def g_fast_whoosh(rng, c):
    """Fast whoosh as the medicine races off along the vein: starts with the word, accelerates
    and peaks in the pause after it (+0.30 s), soft doppler 'zoom', panned left to right.
    ANCHOR: start."""
    pk = 0.30
    n = ns(1.0)
    tt = tvec(n)
    e = np.where(tt < pk, 0.08 + 0.92 * (tt / pk) ** 2.4, np.exp(-(tt - pk) / 0.10))
    e[:ns(0.02)] *= L.rc_fade(ns(0.02))
    fc = np.where(tt < pk, 600 * (4000 / 600) ** (tt / pk) ** 1.5,
                  4000 * (1400 / 4000) ** np.clip((tt - pk) / 0.3, 0, 1))
    nz = stereo_band(n, rng, fc, 1.3, corr=0.5) * e[:, None]
    fz = np.where(tt < pk, 400 * (860 / 400) ** (tt / pk) ** 1.5, 860 * (540 / 860) ** np.clip((tt - pk) / 0.2, 0, 1))
    zoom = (osc(fz) + 0.3 * osc(2 * fz, phase=0.5)) * e * 0.10
    y = nz + to_stereo(lp(zoom, 3000))
    pc = -0.6 + 1.3 * np.clip(tt / 0.5, 0, 1)
    return pan(y, pc), 0, "room", 0.12, 4.0, 0.0


def g_heartbeat(rng, c):
    """Soft, warm lub-dub at c['bpm'] (75), from the cue until the span end. ANCHOR: first lub."""
    D = float(c.get("dur", 2.0))
    period = 60.0 / float(c.get("bpm", 75.0))
    beats = [k * period for k in range(40) if k * period < D - 0.05]
    n = ns(D + 0.7)
    y = np.zeros(n)
    for b in beats:
        y += thump(n, rng, ns(b), 90, 48, 0.085, 1.0)
        y += thump(n, rng, ns(b + 0.16), 110, 60, 0.055, 0.68)
    y = lp(y, 380, 4)
    return widen(y, rng, 0.05), ns(0.006), "room", 0.06, 0.0, 0.0


def g_shimmer(rng, c):
    """Rising shimmer as the medicine spreads: tremolo glass notes of an F-major arpeggio
    entering one by one, airy noise rising, a few sparkle ticks; peaks on the span end and
    lets go. ANCHOR: start."""
    D = float(c.get("dur", 1.8))
    n = ns(D + 1.0)
    tt = tvec(n)
    u = np.clip(tt / D, 0, 1)
    e = np.where(tt <= D, 0.15 + 0.85 * u ** 1.6, np.exp(-(tt - D) / 0.2))
    e[:ns(0.06)] *= L.rc_fade(ns(0.06))
    y = np.zeros((n, 2))
    for j, (m, at) in enumerate(((89, 0.0), (93, 0.28), (96, 0.52), (101, 0.76))):  # F6 A6 C7 F7
        f = float(mtof(m))
        ne = np.clip((u - at) / 0.12, 0, 1) if at > 0 else np.ones(n)
        ne = 0.5 - 0.5 * np.cos(np.pi * ne)
        trem = 1 - 0.5 * (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(9, 12) * tt + rng.uniform(0, 6.28)))
        tone = np.sin(2 * np.pi * f * tt + rng.uniform(0, 6.28)) + 0.05 * np.sin(2 * np.pi * 2.76 * f * tt)
        y += pan(tone * trem * ne * 0.16, -0.5 + 0.33 * j)
    air = stereo_band(n, rng, 2400 * (6500 / 2400) ** u, 1.1, corr=0.2) * 0.13
    tk = np.stack([bp(L.sparse_impulses(n, rng, 30, 0.6, 0.2 + u), 3000, 7000) for _ in range(2)], axis=1) * 0.2
    y = lp((y + air + tk) * e[:, None], 10000)
    return y, 0, "air", 0.30, 6.0, 0.0


def g_soft_slide(rng, c):
    """Needle withdrawing: a short soft slide out (rising band noise). ANCHOR: start."""
    n = ns(0.8)
    tt = tvec(n)
    pk = 0.14
    e = np.where(tt < pk, 0.5 - 0.5 * np.cos(np.pi * tt / pk), np.exp(-(tt - pk) / 0.12))
    fc = 1100 * (2600 / 1100) ** np.clip(tt / 0.3, 0, 1)
    nz = L.band_noise_tv(n, rng, fc, 1.0)
    tone = 0.08 * osc(520 * (1 + 0.25 * np.clip(tt / 0.3, 0, 1)))
    y = (nz + tone) * e
    return pan(widen(y, rng, 0.15), 0.25 - 0.4 * np.clip(tt / 0.3, 0, 1)), 0, "room", 0.10, 3.0, 0.0


def g_sparkle(rng, c):
    """Glassy cascade in F major pentatonic plus a breath of air. It starts small on the cue
    (the plaster lands on "sting") and blooms as the word ends: the chimes climb and grow
    over 0.45 s. ANCHOR: first chime."""
    n = ns(2.0)
    offs = [0.0, 0.06, 0.12, 0.19, 0.26, 0.34, 0.43]
    notes = [84, 86, 89, 91, 93, 96, 98]  # C6 D6 F6 G6 A6 C7 D7
    amps = [0.30, 0.34, 0.42, 0.55, 0.72, 0.90, 1.0]
    y = np.zeros((n, 2))
    for k, (o, m, am) in enumerate(zip(offs, notes, amps)):
        tone = glass_tone(n, mtof(m), rng, start=ns(o), att=0.001, decay_scale=0.9) * am
        y += pan(tone, rng.uniform(-0.5, 0.5))
    air = np.stack([hp(rng.standard_normal(n), 6500) for _ in range(2)], axis=1) * env_ad(n, 0.25, 0.3)[:, None] * 0.05
    y = lp(y + air, 13000)
    return y, ns(0.001), "air", 0.40, 0.0, 0.0


GEN = {
    "glint": g_glint, "swish": g_swish, "prick": g_prick, "plunger": g_plunger, "drip": g_drip,
    "pop": g_pop, "gulp": g_gulp, "slide_drop": g_slide_drop, "bubble_bed": g_bubble_bed,
    "splash": g_splash, "snip": g_snip, "fizz": g_fizz, "thud": g_thud, "bright_whoosh": g_bright_whoosh,
    "needle_slide": g_needle_slide, "tick": g_tick, "clock_tick": g_clock_tick, "fast_whoosh": g_fast_whoosh,
    "heartbeat": g_heartbeat, "shimmer": g_shimmer, "soft_slide": g_soft_slide, "sparkle": g_sparkle,
}


# ============================================================================ room tone
CLINIC = ("clinic", "arm", "title")  # scenes with the open room tone; the rest are inside the body
ROOM_LU = -29.0                      # open room tone re voice (integrated over a steady stretch)
BODY_LU = -35.0                      # muffled version inside the body


def room_raw(n, rng):
    """Quiet clinic air (soft pink hiss, dark, slowly breathing) + a faint low hum (F-ish, so
    it never fights the score) with a little drift."""
    tt = tvec(n)
    air = L.pink(n, rng, 2)
    air = lp(hp(air, 110, 2), 2400, 2) + 0.12 * lp(hp(L.pink(n, rng, 2), 4000, 2), 9000, 2)
    air *= db(0.8 * L.smooth_noise(n, rng, 0.12))[:, None]
    drift = 1 + 0.002 * L.smooth_noise(n, rng, 0.2)
    hum = np.zeros(n)
    for h, a in ((1, 1.0), (2, 0.55), (3, 0.22), (4, 0.08)):
        hum += a * np.sin(2 * np.pi * np.cumsum(43.65 * 2 * h * drift) / SR + h)
    hum *= 1 + 0.08 * L.smooth_noise(n, rng, 0.3)
    hum = lp(hum, 400, 2) * np.std(air) * 0.30
    return air + to_stereo(hum)


def room_automation(doc, n):
    """Per-sample linear gain (1 = ROOM_LU / BODY_LU re voice) for the open and the muffled
    room tone: each shot picks one of them, swapped with a 60 ms equal-gain crossfade at
    the cut (the two are filtered copies of one signal)."""
    x = 0.03  # half-width of a cut crossfade
    full, muf = [], []
    for i, (t0, _shot, scene) in enumerate(L.cut_times(doc)):
        vf, vm = (1.0, 0.0) if scene in CLINIC else (0.0, 1.0)
        if i == 0:
            full.append((0.0, vf))
            muf.append((0.0, vm))
        else:
            full += [(t0 - x, full[-1][1]), (t0 + x, vf)]
            muf += [(t0 - x, muf[-1][1]), (t0 + x, vm)]
    return L.keyframes(n, full), L.keyframes(n, muf)


def render_room(doc, n, seed, vo_int):
    rng = L.rng_for(seed, "room")
    raw = room_raw(n, rng)
    muf = lp(raw, 520, 2) + 0.1 * lp(raw, 1500, 2)
    ref = ns(20.0)
    g_full = db(vo_int + ROOM_LU - L.integrated(raw[:ref]))
    g_muf = db(vo_int + BODY_LU - L.integrated(muf[:ref]))
    a_full, a_muf = room_automation(doc, n)
    out = raw * (g_full * a_full)[:, None] + muf * (g_muf * a_muf)[:, None]
    # the open: an exact 0.6 s raised-cosine fade-in from silence; the end: cos^2 over fade_s
    fi = ns(0.6)
    out[:fi] *= L.rc_fade(fi)[:, None]
    fo = ns(float(doc.get("fade_s", 1.2)))
    out[-fo:] *= (np.cos(np.linspace(0, np.pi / 2, fo)) ** 2)[:, None]
    return out


# ============================================================================ render
def render_events(doc, seed, vo_int, key, n, keep_isolated=False):
    out = np.zeros((n, 2))
    placed = []
    for i, c in enumerate(doc["cues"]):
        kind = c["kind"]
        if kind not in GEN:
            continue
        rng = L.rng_for(seed, i, kind)
        y, anchor, irn, send, carve, carve_after = GEN[kind](rng, c)
        y = to_stereo(y).copy()
        fo = min(len(y) // 4, ns(0.4))  # every dry event ends at exactly zero
        y[-fo:] *= L.rc_fade(fo, False)[:, None]
        if irn:
            wet = L.reverb(y, irn) * send
            y = np.concatenate([y, np.zeros((len(wet) - len(y), 2))]) + wet
            env = np.abs(y).max(axis=1)  # trim the inaudible end of the tail
            last = np.nonzero(env > env.max() * db(-70))[0]
            y = y[: (last[-1] + ns(0.05)) if len(last) else len(y)]
            fo = min(ns(0.05), len(y))
            y[-fo:] *= L.rc_fade(fo, False)[:, None]
        loud = L.max_momentary(y)
        y = y * db(vo_int + float(c["lu"]) - loud)
        start = ns(c["t"]) - anchor
        if carve > 0:
            k = np.zeros(len(y))
            s0, s1 = max(0, start), min(n, start + len(y))
            if s1 > s0:
                k[s0 - start:s1 - start] = key[s0:s1]
            k[: max(0, anchor + ns(carve_after))] = 0.0
            ramp = ns(0.08)
            j = anchor + ns(carve_after)
            k[j:j + ramp] *= L.rc_fade(len(k[j:j + ramp]))
            y = L.speech_carve(y, k, carve, lo=CARVE_LO.get(kind, 700.0))
        L.place(out, y, start)
        placed.append({"i": i, "t": c["t"], "kind": kind, "id": c.get("id", ""), "lu": c["lu"],
                       "row": c.get("row", ""), "dur": c.get("dur"), "land": LAND[kind],
                       "start": start / SR, "len": len(y) / SR, "anchor": anchor / SR,
                       **({"y": y, "s": start} if keep_isolated else {})})
    return out, placed


def isolated_events(doc, vo, n):
    """Every effect rendered alone, at its level before mastering (for tools/audio/verify_mix.py --events)."""
    seed = int(doc.get("seed", 1234))
    vo = np.zeros((n, 2)) if vo is None else vo
    _, placed = render_events(doc, seed, L.voice_level(vo), L.voice_key(vo), n, keep_isolated=True)
    return placed


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--scratch", required=True, help="dir for the raw effects/room renders and the event log")
    a = p.parse_args(argv)
    t0 = time.time()
    doc = L.load_cues()
    seed = int(doc.get("seed", 1234))
    n = ns(doc["duration"])
    vo = L.read_vo(n)
    vo_int = L.voice_level(vo)  # the virtual voice's level when there is no narrator
    key = L.voice_key(vo)       # zero when there is no narrator: no speech-band carve
    events, placed = render_events(doc, seed, vo_int, key, n)
    # nothing may sound after the end of the film; effects fade with the bed over the last 1.2 s
    fo = ns(float(doc.get("fade_s", 1.2)))
    events[-fo:] *= (np.cos(np.linspace(0, np.pi / 2, fo)) ** 2)[:, None]
    room = render_room(doc, n, seed, vo_int)
    room = L.speech_carve(room, key, 3.0)
    os.makedirs(a.scratch, exist_ok=True)
    L.ac.write_wav(os.path.join(a.scratch, "sfx_events_raw.wav"), events, SR)
    L.ac.write_wav(os.path.join(a.scratch, "sfx_room_raw.wav"), room, SR)
    np.save(os.path.join(a.scratch, "sfx_events_raw.npy"), events.astype(np.float32))
    np.save(os.path.join(a.scratch, "sfx_room_raw.npy"), room.astype(np.float32))
    json.dump({"vo_int": vo_int, "events": placed}, open(os.path.join(a.scratch, "sfx_log.json"), "w"), indent=1)
    who = "voice" if L.has_voice(vo) else "no voice; virtual voice"
    print(f"sfx_inj: {len(placed)} events + room tone, {who} {vo_int:.1f} LUFS ({time.time() - t0:.1f}s)")
    for e in placed:
        print(f"  {e['t']:7.3f}  {e['kind']:13s} {e['lu']:+5.1f} LU  span {e['start']:.2f}-{e['start'] + e['len']:.2f}"
              f"  {e['id']}")


if __name__ == "__main__":
    main()

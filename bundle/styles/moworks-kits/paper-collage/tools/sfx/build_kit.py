#!/usr/bin/env python3
"""build_kit.py — EVERY sound effect of the paper-collage look, designed in code (numpy + scipy). No samples, no
sound libraries, no licences: the sounds are generated, deterministic (fixed seeds) and yours.

    uv run --with numpy --with scipy python tools/sfx/build_kit.py              # → public/sfx/kit/*.wav + INDEX.md
    uv run --with numpy --with scipy python tools/sfx/build_kit.py --audition out/kit-audition.wav

The look wants PHYSICAL, analogue sounds — paper, ink, string, rubber stamps, a soft sub hit — built from many small
grains and damped tones. Every file is levelled by loudness (BS.1770 momentary max) to its target in SOUNDS, peak
≤ −1 dBFS, so a cue's gain in a composition means the same thing for every sound.
The whooshes and the zoom at the end of SOUNDS are OPT-IN: never the default for a transition (that is "tear"); use them
only when the user asks for whooshes or approves them for a fast camera move.
To design a new sound: add a function built from noise grains, damped tones and filters, add it to SOUNDS with a
loudness target and a one-line use, re-run. See .claude/skills/motion-graphic/references/SOUND.md.
"""
import argparse
import json
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
PEAK_CAP_DB = -1.0
ROOT = Path(__file__).resolve().parents[2]

# ── ingredients ──────────────────────────────────────────────────────────────────────────────────


def tt(dur):
    return np.arange(int(round(dur * SR))) / SR


def zeros(dur):
    return np.zeros(int(round(dur * SR)))


def sos(kind, f, order=2):
    return signal.butter(order, f, btype=kind, fs=SR, output="sos")


def bp(x, lo, hi, order=2):
    return signal.sosfilt(sos("bandpass", [lo, hi], order), x)


def lp(x, f, order=4):
    return signal.sosfilt(sos("lowpass", f, order), x)


def hp(x, f, order=2):
    return signal.sosfilt(sos("highpass", f, order), x)


def norm(x, target=1.0):
    m = np.max(np.abs(x))
    return x * (target / m) if m > 0 else x


def tail(x, dur):
    n = min(len(x), int(dur * SR))
    x = np.array(x, dtype=np.float64)
    x[len(x) - n :] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, n))
    return x


def place(buf, x, at, gain=1.0):
    i = int(round(at * SR))
    n = min(len(x), len(buf) - i)
    if n > 0:
        buf[i : i + n] += gain * x[:n]
    return buf


def osc(f, t, phase=0.0):
    return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(f, t.shape)) / SR + phase)


def fm(fc, ratio, index, t):
    """2-operator FM: index may be an envelope array."""
    mod = np.sin(2 * np.pi * fc * ratio * t)
    return np.sin(2 * np.pi * fc * t + index * mod)


def click(rng, dur=0.004, lo=2000, hi=12000):
    t = tt(dur)
    return norm(bp(rng.standard_normal(len(t)) * np.exp(-t / (dur / 4)), lo, hi))


def sub_kick(t, f0=150, f1=45, tau_f=0.04, tau_a=0.35):
    return osc(f1 + (f0 - f1) * np.exp(-t / tau_f), t) * (1 - np.exp(-t / 0.002)) * np.exp(-t / tau_a)


def env_ad(t, a, d):
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


def bell(f, t, rng, decay=0.5):
    return sum(
        a * np.exp(-t / (decay * d)) * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6.28))
        for r, a, d in [(1, 1, 1), (2.0, 0.35, 0.6), (3.01, 0.18, 0.4), (4.17, 0.1, 0.25)]
    ) * np.minimum(1, t / 0.002)


def silence(dur):
    return np.zeros(int(round(dur * SR)))


def tone(f, t, phase=0.0):
    """sine with a (possibly time-varying) frequency array f — phase-accumulated, no clicks."""
    f = np.broadcast_to(f, t.shape)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)


def modes(t, parts, rng):
    """struck-object body: a sum of damped sines [(freq, amp, tau), …]."""
    return sum(a * np.exp(-t / tau) * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi)) for f, a, tau in parts)


def transient(rng, dur=0.008, tau=0.001, lo=2000, hi=10000):
    """the 'tick' of any click: a few ms of band-passed noise with a very fast decay."""
    t = tt(dur)
    return bp(rng.standard_normal(len(t)) * np.exp(-t / tau), lo, hi)


def peak(x, target=1.0):
    m = np.max(np.abs(x))
    return x * (target / m) if m > 0 else x


def grain(rng, lo, hi, dur):
    """one paper fibre snapping: a 0.5–3 ms band-passed noise tick."""
    t = tt(dur)
    return norm(bp(rng.standard_normal(len(t)) * np.exp(-t / (dur / 3)), lo, hi))


def strokes(t, spans):
    """marker friction envelope: smooth (hann) bumps over the given (start, end) spans."""
    env = np.zeros(len(t))
    for a, b in spans:
        m = (t >= a) & (t < b)
        env[m] += np.sin(np.pi * (t[m] - a) / (b - a)) ** 1.5
    return env


def moving_band(x, centers, q=1.6, block=256):
    """band-pass noise whose centre frequency follows `centers` (one value per sample), block-wise biquads"""
    y = np.zeros_like(x)
    zi = np.zeros((1, 2))
    for i in range(0, len(x), block):
        fc = float(np.clip(centers[min(i + block // 2, len(x) - 1)], 80, 16000))
        lo, hi = fc / (1 + 1 / q), fc * (1 + 1 / q)
        sos = signal.butter(1, [lo, min(hi, 0.45 * SR)], btype="bandpass", fs=SR, output="sos")
        seg, zi = signal.sosfilt(sos, x[i : i + block], zi=zi)
        y[i : i + block] = seg
    return y


# ── stereo space ─────────────────────────────────────────────────────────────────────────────────


def room(rng, dur=1.0, tau=0.28, bright=5000):
    """two decorrelated impulse responses: exponentially decaying noise, darker as it decays."""
    t = tt(dur)
    irs = []
    for _ in range(2):
        n = rng.standard_normal(len(t)) * np.exp(-t / tau)
        dark = lp(n, 1800)
        mix = np.exp(-t / (tau * 0.6))
        irs.append(lp(n, bright) * mix + dark * (1 - mix))
    pre = int(0.012 * SR)
    irs = [tail(ir, dur * 0.35) for ir in irs]  # no truncated reverb tail
    return [np.concatenate([np.zeros(pre), ir]) / np.sqrt(np.sum(ir**2)) for ir in irs]


def space(rng, dry, wet=0.18, dur=1.0, tau=0.28, bright=5000, width=1.0, pingpong=None):
    """mono dry → stereo: centred dry + room (and optional ping-pong echoes: (delay_s, feedback, level))."""
    L = np.copy(dry)
    R = np.copy(dry)
    irL, irR = room(rng, dur, tau, bright)
    n = len(dry) + len(irL)
    L = np.pad(L, (0, n - len(L)))
    R = np.pad(R, (0, n - len(R)))
    rv = [signal.fftconvolve(dry, ir)[:n] for ir in (irL, irR)]
    rv = [np.pad(r, (0, n - len(r))) for r in rv]
    mid = (rv[0] + rv[1]) / 2
    side = (rv[0] - rv[1]) / 2 * width
    L += wet * (mid + side)
    R += wet * (mid - side)
    if pingpong:
        d, fb, lvl = pingpong
        k = int(d * SR)
        for i in range(1, 6):
            g = lvl * fb ** (i - 1)
            tgt = L if i % 2 else R
            echo = lp(dry, 6000 - 700 * i)
            place(tgt, echo, i * d, g)
    return np.stack([L, R], axis=1)


# ── paper & ink ──────────────────────────────────────────────────────────────────────────────────


def s_paper_land(rng):
    """a cut-out lands on the page: soft body thump + paper slap + a few crinkle grains."""
    t = tt(0.4)
    y = 0.55 * osc(140 - 50 * (1 - np.exp(-t / 0.03)), t) * (1 - np.exp(-t / 0.002)) * np.exp(-t / 0.05)
    slap = bp(rng.standard_normal(len(t)), 600, 4200) * np.exp(-t / 0.016)
    y += 0.8 * norm(slap)
    for _ in range(9):
        at = rng.uniform(0.004, 0.09)
        place(y, grain(rng, 2200, 7500, rng.uniform(0.0008, 0.0025)), at, rng.uniform(0.08, 0.3) * np.exp(-at / 0.05))
    return space(rng, y, wet=0.1, dur=0.5, tau=0.1, bright=6000, width=0.8)


def s_tear(rng):
    """a sheet of paper tearing across (scene change): ~140 fibre grains whose density builds, then a clean stop."""
    dur = 0.46
    t = tt(dur)
    y = zeros(dur)
    for _ in range(140):
        at = 0.36 * rng.beta(2.2, 1.3)  # more snaps toward the end of the rip
        g = rng.uniform(0.15, 1.0) * (0.35 + 0.65 * at / 0.36)
        place(y, grain(rng, rng.uniform(1300, 2600), rng.uniform(5000, 9000), rng.uniform(0.0006, 0.003)), at, g)
    dens = np.clip(t / 0.36, 0, 1) ** 1.4 * (t < 0.37)
    body = bp(rng.standard_normal(len(t)), 250, 1100) * dens
    y = norm(y) + 0.22 * norm(body)
    return space(rng, y, wet=0.1, dur=0.4, tau=0.09, bright=7000, width=1.0)


def s_stamp(rng):
    """a rubber stamp hits the page: dull wooden knock + paper slap."""
    t = tt(0.35)
    knock = osc(165, t) * (1 - np.exp(-t / 0.0015)) * np.exp(-t / 0.045)
    wood = bp(rng.standard_normal(len(t)), 380, 900, order=4) * np.exp(-t / 0.03)
    slap = bp(rng.standard_normal(len(t)), 900, 5000) * np.exp(-t / 0.01)
    y = 0.8 * knock + 0.5 * norm(wood) + 0.45 * norm(slap)
    return space(rng, y, wet=0.1, dur=0.4, tau=0.1, bright=5000)


def s_scribble(rng):
    """a felt marker strikes a word out: three quick back-and-forth strokes with a little squeak."""
    dur = 0.5
    t = tt(dur)
    env = strokes(t, [(0.0, 0.14), (0.13, 0.27), (0.26, 0.42)])
    fric = bp(rng.standard_normal(len(t)), 1800, 6500) * env
    squeak = osc(2350 + 160 * np.sin(2 * np.pi * 7 * t), t) * env**3
    tip = lp(rng.standard_normal(len(t)), 900) * env
    y = norm(fric) + 0.07 * squeak + 0.18 * norm(tip)
    return space(rng, y, wet=0.08, dur=0.3, tau=0.07, bright=8000)


def s_circle(rng):
    """a marker draws one loop around something: a single stroke that swells and lifts off."""
    dur = 0.55
    t = tt(dur)
    env = strokes(t, [(0.0, 0.48)]) * (0.75 + 0.25 * np.sin(2 * np.pi * 4.2 * t))
    fric = bp(rng.standard_normal(len(t)), 2000, 6000) * env
    tip = lp(rng.standard_normal(len(t)), 800) * env
    y = norm(fric) + 0.2 * norm(tip) + 0.05 * osc(2600 + 120 * t, t) * env**3
    return space(rng, y, wet=0.08, dur=0.3, tau=0.07, bright=8000)


def s_pluck(rng):
    """the bowstring lets go: a short damped string (Karplus-Strong, ~98 Hz) + a wooden tock on the limb."""
    n = int(0.6 * SR)
    period = int(SR / 98)
    buf = rng.uniform(-1, 1, period)
    out = np.zeros(n)
    for i in range(n):
        v = buf[i % period]
        out[i] = v
        buf[i % period] = 0.5 * (v + buf[(i + 1) % period]) * 0.985
    t = tt(0.6)
    string = lp(out, 3500) * np.exp(-t / 0.13)
    tock = bp(rng.standard_normal(len(t)), 700, 1300, order=4) * np.exp(-t / 0.012)
    thump = osc(70, t) * (1 - np.exp(-t / 0.003)) * np.exp(-t / 0.06)
    y = 0.8 * norm(string) + 0.45 * norm(tock) + 0.35 * thump
    y = place(zeros(0.62), y, 0.0)
    return space(rng, y, wet=0.12, dur=0.6, tau=0.14, bright=5000)


def s_shot(rng):
    """a flintlock shot: the pan flashes (crackle), 55 ms later the charge: crack + blast + low boom + sub, a slap echo."""
    dur = 1.3
    t = tt(dur)
    y = zeros(dur)
    pan = zeros(0.05)
    for _ in range(18):
        place(pan, grain(rng, 3000, 9000, rng.uniform(0.0005, 0.0018)), rng.uniform(0, 0.045), rng.uniform(0.2, 0.6))
    place(y, pan, 0.0, 0.35)
    at = 0.055
    tb = tt(dur - at)
    crack = hp(click(rng, 0.003, 1500, 16000), 900)
    blast = lp(rng.standard_normal(len(tb)), 2600) * (1 - np.exp(-tb / 0.001)) * np.exp(-tb / 0.08)
    boom = lp(rng.standard_normal(len(tb)), 320) * (1 - np.exp(-tb / 0.004)) * np.exp(-tb / 0.32)
    sub = sub_kick(tb, 115, 36, 0.03, 0.3)
    main = 0.9 * norm(blast) + 0.7 * norm(boom) + 0.75 * sub
    place(main, crack, 0.0, 1.0)
    place(y, main, at)
    place(y, lp(main, 1800), at + 0.19, 0.16)  # slap echo off a far wall
    return space(rng, y, wet=0.22, dur=1.2, tau=0.42, bright=3500, width=1.0)


def s_launch(rng):
    """a rocket ignites and climbs away: ignition thump, a crackling roar that only decays and darkens (no riser)."""
    dur = 1.9
    t = tt(dur)
    thump = sub_kick(t, 95, 30, 0.04, 0.45)
    roar = rng.standard_normal(len(t)) * (1 - np.exp(-t / 0.04)) * np.exp(-t / 0.62)
    # the roar darkens as it climbs away: crossfade a bright and a dark copy
    bright, dark = lp(roar, 1400), lp(roar, 380)
    k = np.clip(t / 1.2, 0, 1)
    roar = bright * (1 - k) + dark * k
    crackle = zeros(dur)
    for _ in range(90):
        at = rng.exponential(0.35)
        if at < dur - 0.01:
            place(crackle, grain(rng, 900, 4000, rng.uniform(0.001, 0.004)), at, rng.uniform(0.1, 0.5) * np.exp(-at / 0.5))
    y = 0.8 * thump + 0.85 * norm(roar) + 0.35 * norm(crackle)
    return space(rng, y, wet=0.2, dur=1.4, tau=0.5, bright=3000, width=1.0)


def s_strike(r):
    """one confident felt-marker stroke across a word (0.3 s): a fast swipe with a squeaky tail"""
    dur = 0.34
    t = tt(dur)
    env = np.clip(t / 0.015, 0, 1) * np.exp(-np.maximum(t - 0.17, 0) / 0.05) * (t < 0.3)
    fric = moving_band(r.standard_normal(len(t)), np.linspace(2200, 4200, len(t)), 1.2) * env
    sq = osc(2700 + 900 * t / dur, t) * env**3 * 0.08
    tip = lp(r.standard_normal(len(t)), 600) * env * 0.25
    return space(r, norm(fric) + sq + norm(tip) * 0.3, wet=0.08, dur=0.3, tau=0.07, bright=9000)


def s_marker_long(r):
    """a felt marker drawing one long line across the page (1.6 s), pressure breathing as it goes"""
    dur = 1.6
    t = tt(dur)
    env = np.clip(t / 0.05, 0, 1) * np.clip((dur - t) / 0.12, 0, 1) * (0.7 + 0.3 * np.sin(2 * np.pi * 2.3 * t) ** 2)
    fric = bp(r.standard_normal(len(t)), 1900, 6200) * env
    tip = lp(r.standard_normal(len(t)), 700) * env
    sq = osc(2450 + 150 * np.sin(2 * np.pi * 0.8 * t), t) * env**4 * 0.05
    return space(r, norm(fric) + 0.2 * norm(tip) + sq, wet=0.08, dur=0.3, tau=0.07, bright=8000)


def s_slam(r):
    """a heavy word slams onto paper: deep sub thump, a dry wooden knock, a paper slap, short room"""
    t = tt(1.1)
    sub = sub_kick(t, 110, 38, 0.03, 0.32)
    knock = osc(150, t) * (1 - np.exp(-t / 0.002)) * np.exp(-t / 0.05)
    slap = bp(r.standard_normal(len(t)), 800, 6000) * np.exp(-t / 0.012)
    y = 0.95 * sub + 0.6 * knock + 0.55 * norm(slap)
    return space(r, y, wet=0.18, dur=0.8, tau=0.25, bright=4000)


def s_cash(r):
    """a heavy bundle of notes lands: dull thump + paper slap + riffle"""
    t = tt(0.5)
    th = sub_kick(t, 120, 55, 0.02, 0.09)
    slap = bp(r.standard_normal(len(t)), 700, 5000) * np.exp(-t / 0.018)
    y = 0.7 * th + 0.8 * norm(slap)
    for _ in range(14):
        a = r.uniform(0.01, 0.12)
        g = bp(r.standard_normal(int(0.002 * SR)), 2500, 8000)
        place(y, norm(g), a, r.uniform(0.05, 0.22))
    return space(r, y, wet=0.1, dur=0.4, tau=0.09, bright=6000)


def s_scatter(r):
    """a pile of notes bursts and flutters out to the crowd: dozens of tiny paper flicks spreading in stereo"""
    dur = 0.9
    L, R = zeros(dur), zeros(dur)
    for _ in range(70):
        at = r.exponential(0.16)
        if at > dur - 0.05:
            continue
        g = bp(r.standard_normal(int(0.006 * SR)), 2000, 9000) * np.exp(-tt(0.006) / 0.0015)
        pan = r.uniform(-1, 1)
        a = (pan + 1) * np.pi / 4
        amp = r.uniform(0.2, 0.7) * np.exp(-at / 0.35)
        place(L, norm(g), at, amp * np.cos(a))
        place(R, norm(g), at, amp * np.sin(a))
    thump = sub_kick(tt(dur), 130, 60, 0.02, 0.08) * 0.5
    return np.stack([L + thump, R + thump], 1)


def s_flip(r):
    """a split-flap year counter running 2026 → 2048: 22 flaps, quick then slowing, the last one heavier"""
    gaps = 0.022 + 0.06 * (np.linspace(0, 1, 22) ** 2.2)
    dur = float(gaps.sum()) + 0.3
    y = zeros(dur)
    at = 0.0
    for i, g in enumerate(gaps):
        flap = bp(r.standard_normal(int(0.012 * SR)), 1200, 7000) * np.exp(-tt(0.012) / 0.0025)
        body = osc(900 + 200 * r.random(), tt(0.02)) * np.exp(-tt(0.02) / 0.004) * 0.35
        g_ = 0.55 + 0.45 * (i == len(gaps) - 1)
        place(y, norm(flap), at, g_)
        place(y, body, at, g_)
        at += g
    return space(r, y, wet=0.1, dur=0.4, tau=0.08, bright=8000)


def s_ticker(r):
    """a debt clock spinning up: mechanical clicks that start fast and settle into a steady tick"""
    dur = 0.9
    y = zeros(dur)
    at, gap = 0.0, 0.018
    while at < dur - 0.03:
        c = bp(r.standard_normal(int(0.004 * SR)), 2500, 9000) * np.exp(-tt(0.004) / 0.0009)
        body = osc(1900 + 300 * r.random(), tt(0.012)) * np.exp(-tt(0.012) / 0.003) * 0.4
        place(y, norm(c), at, 0.7 * (1 - at / dur * 0.5))
        place(y, body, at, 0.5)
        at += gap
        gap = min(0.07, gap * 1.13)
    return space(r, y, wet=0.1, dur=0.4, tau=0.08, bright=8000)


# ── screen graphics ──────────────────────────────────────────────────────────────────────────────


def s_impact(rng):
    """title hit — sub kick (150→45 Hz), transient click, a mid 'crack', saturated, room tail."""
    t = tt(0.9)
    y = sub_kick(t, 150, 45, 0.035, 0.32)
    crack = np.zeros(len(t))
    c = bp(rng.standard_normal(int(0.05 * SR)), 900, 4500) * np.exp(-tt(0.05) / 0.012)
    crack[: len(c)] = norm(c)
    k = click(rng, 0.004, 2500, 14000)
    y = y + 0.45 * crack
    y[: len(k)] += 0.5 * k
    y = np.tanh(1.8 * norm(y)) / np.tanh(1.8)
    return space(rng, tail(y, 0.1), wet=0.22, dur=1.4, tau=0.35, bright=3500)


def s_count(rng, dur=0.72, steps=16):
    """a count-up roll — ticks that start fast and slow into the final value, pitch climbing in steps
    (discrete notes, never a smooth riser)."""
    out = zeros(dur + 0.12)
    u = np.linspace(0, 1, steps)
    times = (1 - (1 - u) ** 2.2) * (dur - 0.02)  # dense at first, easing out like the number
    scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]
    t = tt(0.035)
    for i, at in enumerate(times):
        semi = scale[min(len(scale) - 1, int(i / steps * len(scale)))]
        f = 1760 * 2 ** (semi / 12)
        y = osc(f, t) * np.exp(-t / 0.006) + 0.25 * np.pad(click(rng, 0.002, 4000, 14000), (0, len(t)))[: len(t)]
        place(out, y, at, 0.55 + 0.45 * i / steps)
    return space(rng, out, wet=0.12, dur=0.5, tau=0.1, bright=9000)


def s_lock(rng):
    """value locks in — two FM-bell notes a fifth apart over a soft thump, with ping-pong echoes."""
    out = zeros(1.0)
    t = tt(0.9)
    place(out, bell(1318.5, t, rng, 0.35), 0.0, 0.7)
    place(out, bell(1975.5, t, rng, 0.45), 0.075, 1.0)
    place(out, 0.5 * sub_kick(tt(0.3), 120, 60, 0.02, 0.07), 0.0)
    return space(rng, tail(out, 0.2), wet=0.2, dur=1.0, tau=0.3, bright=8000, pingpong=(0.14, 0.45, 0.25))


def s_chip(rng):
    """a chip / label pops on — a rounded double blip (up a fourth)."""
    out = zeros(0.18)
    t = tt(0.06)
    for i, f in enumerate([1046.5, 1396.9]):
        y = osc(f, t) * env_ad(t, 0.002, 0.018) + 0.15 * osc(f * 2, t) * env_ad(t, 0.001, 0.008)
        place(out, y, 0.045 * i, 0.7 + 0.3 * i)
    return space(rng, tail(out, 0.02), wet=0.15, dur=0.5, tau=0.1, bright=9000, pingpong=(0.09, 0.4, 0.18))


def s_tick(rng):
    """one data tick — a 6 ms high sine burst with a hair of noise."""
    t = tt(0.03)
    y = osc(3600, t) * np.exp(-t / 0.004)
    k = click(rng, 0.003, 5000, 14000)
    y[: len(k)] += 0.2 * k
    return space(rng, tail(y, 0.005), wet=0.1, dur=0.4, tau=0.08, bright=9000)


# ── foley / UI (mono) ────────────────────────────────────────────────────────────────────────────


def s_click(rng):
    """mouse click — press, then a lighter release 75 ms later (plastic body + tiny thump)."""
    out = silence(0.2)

    def one(pitch):
        t = tt(0.06)
        y = modes(t, [(2350 * pitch, 0.4, 0.007), (4100 * pitch, 0.2, 0.0035), (1150 * pitch, 0.25, 0.01)], rng)
        y += 0.16 * np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.01)
        x = transient(rng, 0.008, 0.0009, 2000, 10000)
        y[: len(x)] += peak(x, 0.9)
        return y

    place(out, one(1.0), 0.001)
    place(out, one(1.08), 0.076, 0.42)
    return out


def s_pop(rng):
    """a cutout appearing — a sine that jumps up in pitch (260 → 900 Hz) plus a tiny click."""
    t = tt(0.16)
    y = tone(260 + 640 * (1 - np.exp(-t / 0.012)), t) * (1 - np.exp(-t / 0.0015)) * np.exp(-t / 0.04)
    x = transient(rng, 0.004, 0.0006, 3000, 12000)
    y[: len(x)] += peak(x, 0.3)
    return y


def s_ding(rng):
    """glass ding — inharmonic partials (E6) with a faint shimmer and a light strike."""
    t = tt(1.45)
    f0 = 1318.5
    shimmer = 1 + 0.0025 * np.sin(2 * np.pi * 3.1 * t)
    y = sum(
        a * np.exp(-t / tau) * tone(f0 * r * shimmer, t, rng.uniform(0, 2 * np.pi))
        for r, a, tau in [(1, 1, 0.55), (2.32, 0.45, 0.32), (4.25, 0.22, 0.18), (6.63, 0.12, 0.1), (9.38, 0.06, 0.06)]
    )
    y += 0.35 * np.exp(-t / 0.5) * tone(f0 * 1.0012, t)  # slow beating against the fundamental
    y *= np.minimum(1, t / 0.002)
    x = transient(rng, 0.006, 0.001, 3000, 12000)
    y[: len(x)] += peak(x, 0.25)
    return tail(y, 0.3)


def keystroke(rng, space=False):
    t = tt(0.07)
    p = rng.uniform(0.88, 1.14) * (0.78 if space else 1.0)
    thock = peak(bp(rng.standard_normal(len(t)), 350 * p, 1400 * p) * np.exp(-t / (0.02 if space else 0.014)), 0.7)
    y = thock + modes(t, [(1900 * p, 0.25, 0.004), (620 * p, 0.3, 0.008)], rng)
    x = transient(rng, 0.005, 0.0008, 2000, 10000)
    y[: len(x)] += peak(x, 0.8)
    return y


def s_typing(rng):
    """1.5 s of typing — irregular keystrokes, every sixth one a deeper space bar, an occasional pause."""
    out = silence(1.5)
    at, i = 0.02, 0
    while at < 1.38:
        space = i % 6 == 5
        place(out, keystroke(rng, space), at, rng.uniform(0.62, 1.0))
        at += rng.uniform(0.065, 0.14) + (rng.random() < 0.12) * rng.uniform(0.08, 0.16)
        i += 1
    return np.tanh(4 * peak(out)) / np.tanh(4)  # tame the tick peaks so the keys can sit as loud as the old file


# ── opt-in only (see the header) ─────────────────────────────────────────────────────────────────


def whoosh(dur=0.55, f0=350, fpk=2600, f1=700, peak=0.58, width=1.0, seed=0):
    r = np.random.default_rng(seed)
    t = tt(dur)
    k = t / dur
    # centre frequency: up to the peak, then down (a body passing by)
    cen = np.where(k < peak, f0 * (fpk / f0) ** (k / peak), fpk * (f1 / fpk) ** ((k - peak) / (1 - peak)))
    env = np.where(k < peak, (k / peak) ** 2.2, ((1 - k) / (1 - peak)) ** 1.6)
    n = r.standard_normal(len(t))
    body = moving_band(n, cen, 1.4) * env
    air = hp(r.standard_normal(len(t)), 5000) * env**2 * 0.18
    low = lp(r.standard_normal(len(t)), 220) * env * 0.35
    mono = norm(body) + air + 0.6 * norm(low)
    # pan sweep left → right as it passes
    pan = -0.8 * width + 1.6 * width * k
    a = (pan + 1) * np.pi / 4
    st = np.stack([mono * np.cos(a), mono * np.sin(a)], 1)
    return st


def s_zoom(r):
    """the chart camera dives in: an airy swell that peaks as the zoom lands, then clears (0.9 s)"""
    return whoosh(0.9, 220, 3400, 1800, 0.72, 0.4, 7)


# name: (builder, loudness target — momentary max, LUFS —, fixed random seed, stereo?, when to use it)
SOUNDS = {
    # paper & ink — the core of the look
    "paper-land": (s_paper_land, -21, 3821514066, True, "a cut-out / card / panel lands on the page"),
    "tear": (s_tear, -22, 3199154429, True, "a torn-paper sheet comes in (scene change) — THE transition sound"),
    "stamp": (s_stamp, -20, 3597294940, True, "a stamp / verdict / power word hits the page"),
    "scribble": (s_scribble, -24, 2952650972, True, "a marker scribbles over a word (three strokes)"),
    "strike": (s_strike, -22, 231155648, True, "one confident marker stroke strikes a word out"),
    "circle": (s_circle, -25, 3090338902, True, "a marker circles something"),
    "marker-long": (s_marker_long, -26, 567279722, True, "a long marker line drawing across a chart / map (1.6 s)"),
    "slam": (s_slam, -15, 1457956137, True, "the payoff word slams down (heavy)"),
    "cash": (s_cash, -21, 112846265, True, "a bundle of notes / a heavy stack lands"),
    "scatter": (s_scatter, -21, 2080001652, True, "a pile bursts and flutters out (notes, papers, confetti)"),
    "flip": (s_flip, -22, 2600395861, True, "a split-flap counter runs (a year / number flipping through)"),
    "ticker": (s_ticker, -24, 2126710934, True, "a counter / clock spins up"),
    "pluck": (s_pluck, -21, 195999538, True, "a string / cord / bowstring lets go"),
    "shot": (s_shot, -15, 1547705260, True, "a gunshot / cannon (historical, loud — rare)"),
    "launch": (s_launch, -16, 355657434, True, "a rocket / missile launches and climbs away"),
    # screen graphics
    "impact": (s_impact, -14, 3711300398, True, "a big hit under a power moment (layer it quietly under stamp/slam)"),
    "count": (s_count, -21, 3587972340, True, "a number counts up (0.72-s roll)"),
    "lock": (s_lock, -19, 2275815806, True, "a value locks in / is highlighted"),
    "chip": (s_chip, -23, 2852132555, True, "a small label / chip pops on"),
    "tick": (s_tick, -26, 377893564, True, "one tick (a dot, a step)"),
    # foley / UI
    "click": (s_click, -25, 3136733728, False, "a button pressed, a cursor click"),
    "pop": (s_pop, -23, 433108758, False, "ideas / items burst out, a sticker pops on"),
    "ding": (s_ding, -18, 4205772085, False, "done / approved / a tick appears"),
    "typing": (s_typing, -18, 3508702763, False, "1.5 s of typing (a typed receipt / note — not for every typed label)"),
    # opt-in only
    "whoosh": (lambda r: whoosh(0.55, 350, 2600, 700, 0.58, 1.0, 1), -20, 1762789441, True, "OPT-IN: an object flying past"),
    "whoosh-up": (lambda r: whoosh(0.38, 500, 4200, 3000, 0.82, 0.6, 3), -22, 2275536112, True, "OPT-IN: something shoots up (a bar, a curve)"),
    "whoosh-deep": (lambda r: whoosh(0.8, 160, 1300, 260, 0.6, 0.7, 2), -19, 1176397071, True, "OPT-IN: a big dark sheet rises (an ending)"),
    "zoom": (s_zoom, -20, 3073079668, True, "OPT-IN: a fast camera dive into a chart"),
}

# BS.1770 K-weighting (48 kHz): high-shelf pre-filter + RLB high-pass
K1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
K2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])

def momentary_max(st):
    st = np.atleast_2d(st.T).T if st.ndim == 1 else st
    pw = 0
    for ch in range(st.shape[1]):
        y = signal.lfilter(*K2, signal.lfilter(*K1, np.concatenate([st[:, ch], np.zeros(SR)])))
        w = int(0.4 * SR)
        c = np.cumsum(np.concatenate([[0.0], y * y]))
        pw = pw + (c[w:] - c[:-w]) / w
    return -0.691 + 10 * np.log10(pw.max() + 1e-12)


def finish_stereo(st, target):
    st = np.stack([hp(st[:, 0], 25), hp(st[:, 1], 25)], axis=1)
    # trim trailing near-silence (reverb tails below -70 dB)
    env = np.max(np.abs(st), axis=1)
    keep = np.nonzero(env > 10 ** (-70 / 20) * env.max())[0]
    st = st[: keep[-1] + 1] if len(keep) else st
    st = np.stack([tail(st[:, 0], 0.02), tail(st[:, 1], 0.02)], axis=1)
    st = st * 10 ** ((target - momentary_max(st)) / 20)
    return st * min(1.0, 10 ** (PEAK_CAP_DB / 20) / np.max(np.abs(st)))


def finish_mono(x, target):
    x = hp(np.asarray(x, dtype=np.float64), 25)  # DC block
    x = tail(x, min(0.03, len(x) / SR / 10))  # no click at the end
    x = x * 10 ** ((target - momentary_max(x)) / 20)
    cap = 10 ** (PEAK_CAP_DB / 20)
    return x * min(1.0, cap / np.max(np.abs(x)))


def build(name):
    fn, target, seed, stereo, _ = SOUNDS[name]
    x = fn(np.random.default_rng(seed))
    return finish_stereo(x, target) if stereo else finish_mono(x, target)


def write_wav(path, st):
    path.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(path, SR, np.round(np.clip(st, -1, 1) * 32767).astype(np.int16))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "public/sfx/kit"))
    ap.add_argument("--only", default="", help="comma-separated names to (re)build")
    ap.add_argument("--audition", default="", help="WAV: every sound in a row, 0.5 s apart (+ a .txt of times)")
    args = ap.parse_args()
    out = Path(args.out)
    names = [n for n in SOUNDS if not args.only or n in args.only.split(",")]
    built = {n: build(n) for n in names}
    for n, x in built.items():
        write_wav(out / f"{n}.wav", x)
    index = [
        {"name": n, "seconds": round(len(x) / SR, 3), "lufs_m": round(momentary_max(x), 1), "peak_db": round(20 * np.log10(np.max(np.abs(x))), 1), "use": SOUNDS[n][4]}
        for n, x in built.items()
    ]
    if not args.only:
        (out / "index.json").write_text(json.dumps(index, indent=2) + "\n")
        rows = "\n".join(f"| `{r['name']}` | {r['seconds']:.2f} s | {r['lufs_m']} | {r['use']} |" for r in index)
        (out / "INDEX.md").write_text(
            "# Sound kit (generated by tools/sfx/build_kit.py — do not edit by hand)\n\n"
            "48 kHz 16-bit, levelled by loudness (momentary max), peak ≤ −1 dBFS.\n\n"
            "| name | length | loudness (M max, LUFS) | use |\n|---|---|---|---|\n" + rows + "\n"
        )
    for r in index:
        print(f"{r['name']:12s} {r['seconds']:.2f}s  M-max {r['lufs_m']} LUFS  peak {r['peak_db']} dB")
    if args.audition:
        parts, at, lines = [], 0.0, []
        for n, x in built.items():
            st = np.stack([x, x], axis=1) if x.ndim == 1 else x
            lines.append(f"{at:6.2f}s  {n}")
            parts += [st, np.zeros((int(0.5 * SR), 2))]
            at += len(st) / SR + 0.5
        write_wav(Path(args.audition), np.concatenate(parts))
        Path(args.audition).with_suffix(".txt").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()

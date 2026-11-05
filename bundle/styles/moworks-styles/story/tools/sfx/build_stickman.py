#!/usr/bin/env python3
"""build_stickman.py — the sound-effect library of the Stickman Explainer style, designed in code (numpy + scipy).
Writes public/sfx/stickman/<name>.wav + INDEX.md. Run it once at setup; re-run after adding or changing a design.

    uv run --with numpy --with scipy python tools/sfx/build_stickman.py [name,name]

The style's sound is cinematic and soft: glassy UI blips and marimba tags for labels, a deep sub boom for the title,
small physical foley (papers, steps, a mat landing, frost, breath, a bite), city and sky beds (traffic, wind, a prop
plane, an airliner, birds) and gentle "done" chimes. Every effect is levelled by loudness (momentary max), so a cue's
gain means the same thing for every sound. Sounds marked OPT-IN are whooshes: use them only when the user asks.
NO MUSIC lives here. Music is composed only when the user asks for it (.claude/skills/original-music).
To add a sound: write an s_<name>(rng) from the ingredients in sfxlib.py, add it to SOUNDS, re-run.
"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sfxlib as K  # noqa: E402
from sfxlib import SR, bp, click, fm_bell, hp, lp, moving_band, norm, osc, space, sub_kick, tail, tone, transient, tt  # noqa: E402,F401

OUT = K.ROOT / "public/sfx/stickman"


# ── interface + reveal sounds ────────────────────────────────────────────────────────────────────────────────────
def s_screen_on(rng):
    """a phone screen wakes: a soft rising glass blip (two partials) with a short shimmer"""
    t = tt(0.9)
    f = 620 + 520 * (1 - np.exp(-t / 0.05))
    y = np.exp(-t / 0.22) * (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.35 * np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR))
    y *= 1 - np.exp(-t / 0.006)
    y += 0.25 * fm_bell(2350, t, 0.25, 0.8, 2.0)
    return space(rng, tail(y, 0.1), wet=0.3, dur=1.0, tau=0.3, bright=7000)


def s_snap_out(rng):
    """the snap zoom-out: a short airy rush that falls in pitch + a soft low thump (0.45 s)"""
    t = tt(0.55)
    n = rng.standard_normal(len(t))
    centers = 4200 * np.exp(-t / 0.12) + 500
    y = moving_band(n, centers, q=1.2) * np.exp(-((t - 0.07) ** 2) / 0.006)
    y = norm(y) + 0.6 * norm(sub_kick(t, 110, 45, 0.04, 0.12))
    return space(rng, tail(y, 0.08), wet=0.2, dur=0.8, tau=0.25, bright=6000)


def s_chip_seat(rng):
    """tweezers seat a chip: a tiny metallic tick, then a plastic click into the socket"""
    t = tt(0.35)
    y = np.zeros(len(t))
    tick = K.modes(tt(0.08), [(5200, 1, 0.012), (8300, 0.5, 0.008)], rng)
    y[: len(tick)] += 0.6 * norm(tick)
    k = transient(rng, 0.01, 0.0015, 1500, 7000)
    i = int(0.06 * SR)
    y[i : i + len(k)] += norm(k)
    body = K.modes(tt(0.1), [(900, 1, 0.02), (1650, 0.4, 0.012)], rng)
    y[i : i + len(body)] += 0.5 * norm(body)
    return space(rng, y, wet=0.12, dur=0.5, tau=0.15, bright=8000)


def s_led(rng):
    """an LED comes on: a clean digital bip with a quiet echo"""
    t = tt(0.5)
    y = np.exp(-t / 0.06) * osc(1760, t) * (1 - np.exp(-t / 0.002))
    y += 0.4 * np.exp(-t / 0.05) * osc(3520, t)
    return space(rng, y, wet=0.2, dur=0.6, tau=0.2, bright=9000, pingpong=(0.11, 0.35, 0.3))


def s_wire(rng):
    """a thin wire bent with a fingertip: a short metallic creak that rises, then a small tink"""
    t = tt(0.75)
    n = rng.standard_normal(len(t))
    centers = 1800 + 1600 * np.clip(t / 0.45, 0, 1)
    creak = moving_band(n, centers, q=6) * np.sin(np.pi * np.clip(t / 0.5, 0, 1)) ** 2
    creak *= 0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 38 * t))  # stick-slip grain
    y = 0.5 * norm(creak)
    tink = fm_bell(2900, tt(0.25), 0.07, 1.2, 2.7)
    i = int(0.48 * SR)
    y[i : i + len(tink)] += 0.7 * norm(tink)
    return space(rng, y, wet=0.15, dur=0.6, tau=0.2, bright=8000)


def s_door(rng):
    """elevator doors slide shut: a low rumbling glide and a soft rubber thud"""
    t = tt(1.2)
    n = rng.standard_normal(len(t))
    glide = lp(bp(n, 120, 900), 700) * np.sin(np.pi * np.clip(t / 0.75, 0, 1)) ** 1.5
    y = norm(glide) * 0.6
    thud = sub_kick(tt(0.4), 120, 50, 0.03, 0.12)
    i = int(0.72 * SR)
    y[i : i + len(thud)] += 0.7 * norm(thud)
    return space(rng, y, wet=0.2, dur=0.8, tau=0.25, bright=3000)


def s_signal(rng):
    """full signal: three soft bell notes climbing (E5 → A5 → C#6), quick and bright"""
    t = tt(1.4)
    y = np.zeros(len(t))
    for k, f in enumerate([659.3, 880.0, 1108.7]):
        i = int(k * 0.075 * SR)
        n = fm_bell(f, tt(1.4 - k * 0.075), 0.35, 1.1, 2.0)
        y[i : i + len(n)] += n * (0.8 + 0.1 * k)
    return space(rng, y, wet=0.3, dur=1.2, tau=0.35, bright=9000)


def s_boom(rng):
    """the title hit: a deep cinematic sub boom with a soft transient, a low chord bloom and a long dark tail"""
    t = tt(4.5)
    y = sub_kick(t, 95, 32, 0.08, 0.9) * 1.0
    k = transient(rng, 0.012, 0.003, 400, 3000)
    y[: len(k)] += 0.5 * norm(k)
    bloom = sum(a * np.exp(-t / 1.8) * (1 - np.exp(-t / 0.04)) * osc(f, t) for f, a in [(110, 0.5), (164.8, 0.3), (220, 0.22), (329.6, 0.1)])
    y = norm(y) + 0.45 * norm(bloom)
    y = np.tanh(1.4 * norm(y)) / np.tanh(1.4)
    return space(rng, tail(y, 0.4), wet=0.35, dur=3.0, tau=0.9, bright=2500)


def s_swell(rng):
    """a soft reversed swell into the next scene (0.7 s), airy, no pitch sweep"""
    t = tt(0.7)
    n = rng.standard_normal(len(t))
    y = bp(n, 300, 5000) * (t / 0.7) ** 3
    y += 0.4 * (t / 0.7) ** 2 * (osc(220, t) + 0.5 * osc(330, t))
    y[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return space(rng, norm(y), wet=0.3, dur=0.6, tau=0.25, bright=5000)


def s_shimmer(rng):
    """the curve drawing across: a bright glassy shimmer, a cluster of soft bells that fades in and out (1.1 s)"""
    t = tt(1.4)
    y = np.zeros(len(t))
    notes = [1318.5, 1567.9, 1975.5, 2637.0, 2093.0, 1760.0]
    for k, f in enumerate(notes):
        i = int(k * 0.13 * SR)
        n = fm_bell(f, tt(1.4 - k * 0.13), 0.5, 0.6, 2.0)
        y[i : i + len(n)] += n * 0.5
    y *= np.sin(np.pi * np.clip(t / 1.4, 0, 1))
    return space(rng, y, wet=0.4, dur=1.5, tau=0.45, bright=10000)


def s_ui(rng):
    """a label appears: one small round blip (soft, high)"""
    t = tt(0.35)
    y = np.exp(-t / 0.045) * (osc(1318.5, t) + 0.3 * osc(2637, t)) * (1 - np.exp(-t / 0.003))
    return space(rng, y, wet=0.2, dur=0.4, tau=0.15, bright=9000)


def s_crack(rng):
    """the ruler snaps: a sharp wooden crack, a splintery crackle, a low knock"""
    t = tt(0.6)
    y = np.zeros(len(t))
    c = K.modes(tt(0.12), [(1250, 1, 0.018), (2700, 0.7, 0.012), (4100, 0.4, 0.008)], rng)
    y[: len(c)] += norm(c)
    k = transient(rng, 0.006, 0.0012, 2500, 12000)
    y[: len(k)] += norm(k)
    for _ in range(26):
        g = K.grain(rng, 2000, 9000, rng.uniform(0.0008, 0.002))
        i = int(rng.uniform(0.004, 0.12) * SR)
        y[i : i + len(g)] += norm(g) * rng.uniform(0.15, 0.45)
    knock = sub_kick(tt(0.3), 160, 70, 0.02, 0.07)
    y[: len(knock)] += 0.5 * norm(knock)
    return space(rng, y, wet=0.18, dur=0.7, tau=0.2, bright=6000)


def s_fly(rng):
    """the whip along the empty axis (≈1.9 s): a wide noise rush that climbs fast, roars past, then falls away"""
    t = tt(2.4)
    n = rng.standard_normal(len(t))
    centers = 300 + 3800 * np.exp(-(((t - 0.75) / 0.42) ** 2))
    y = moving_band(n, centers, q=0.9)
    env = np.clip(t / 0.5, 0, 1) ** 2 * np.exp(-np.clip(t - 0.8, 0, None) / 0.45)
    y = norm(y * env)
    rum = lp(rng.standard_normal(len(t)), 140) * env
    y = y + 0.6 * norm(rum)
    left = np.roll(y, int(0.004 * SR))
    st = np.stack([left, y], axis=1)
    rv = space(rng, norm(y) * 0.3, wet=0.3, dur=1.2, tau=0.4, bright=4000)
    out = np.zeros((max(len(st), len(rv)), 2))
    out[: len(st)] += st
    out[: len(rv)] += rv
    return out


def s_reveal(rng):
    """the big number lights up: a soft sub boom under a warm major-ninth bell chord that rings out"""
    t = tt(4.0)
    y = 0.8 * norm(sub_kick(t, 80, 34, 0.07, 0.8))
    chord = sum(fm_bell(f, t, 1.6, 0.9, 2.0) * a for f, a in [(440, 0.6), (554.4, 0.45), (659.3, 0.4), (987.8, 0.3), (1318.5, 0.18)])
    y += 0.7 * norm(chord)
    return space(rng, tail(y, 0.4), wet=0.4, dur=3.2, tau=1.0, bright=6000)


def env(t, a, d):
    return np.clip(t / max(a, 1e-4), 0, 1) * np.exp(-np.clip(t - a, 0, None) / d)


def pan(y, p):
    """mono → stereo with an equal-power pan p ∈ [-1, 1] (array or scalar)"""
    p = np.broadcast_to(np.asarray(p, dtype=float), y.shape)
    a = (p + 1) * np.pi / 4
    return np.stack([y * np.cos(a), y * np.sin(a)], axis=1)


def fit(st, n):
    out = np.zeros((n, 2))
    m = min(n, len(st))
    out[:m] = st[:m]
    return out


def put(y, x, i):
    """add x into y at sample i, clipped to y's length"""
    m = max(0, min(len(x), len(y) - i))
    if m:
        y[i : i + m] += x[:m]


def add_at(buf, x, at):
    i = int(at * SR)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    m = min(len(x), len(buf) - i)
    if m > 0:
        buf[i : i + m] += x[:m]


# ── effects (scenes) ─────────────────────────────────────────────────────────────────────────────────────────────────────
def s_traffic(rng):
    """gridlock: a bed of idling engines (low rumble, ~30 Hz throb), tyre hiss, a far siren-less city hum"""
    t = tt(3.8)
    rum = lp(rng.standard_normal(len(t)), 220) * (0.7 + 0.3 * np.sin(2 * np.pi * 28 * t)) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.7 * t))
    idle = sum(a * osc(f, t) * (0.6 + 0.4 * np.sin(2 * np.pi * r * t + ph)) for f, a, r, ph in [(46, 0.5, 13, 0), (61, 0.35, 17, 1), (38, 0.4, 11, 2)])
    hiss = bp(rng.standard_normal(len(t)), 900, 4000) * 0.08
    y = norm(rum) + 0.6 * norm(idle) + hiss
    y *= np.clip(t / 0.4, 0, 1) * np.clip((3.8 - t) / 0.5, 0, 1)
    return space(rng, y, wet=0.25, dur=1.2, tau=0.4, bright=3000, width=1.0)


def s_honk(rng):
    """a car horn: two detuned buzzy tones, two toots"""
    t = tt(0.9)
    y = np.zeros(len(t))
    for start, dur in [(0.0, 0.28), (0.36, 0.42)]:
        tt_ = t - start
        m = (tt_ > 0) & (tt_ < dur)
        g = np.clip(tt_ / 0.01, 0, 1) * np.clip((dur - tt_) / 0.03, 0, 1) * m
        z = np.sign(np.sin(2 * np.pi * 415 * tt_)) * 0.5 + np.sign(np.sin(2 * np.pi * 498 * tt_)) * 0.5
        y += g * z
    y = bp(y, 300, 3200)
    return space(rng, norm(y), wet=0.35, dur=1.0, tau=0.35, bright=4000)


def s_office(rng):
    """an office before nine: soft air-con room tone, a wall clock ticking, two far keyboard taps"""
    t = tt(2.0)
    room = lp(rng.standard_normal(len(t)), 900) * 0.25
    y = room
    for k in range(3):
        c = transient(rng, 0.004, 0.0008, 3000, 9000)
        i = int((0.15 + k * 0.6) * SR)
        put(y, 0.9 * norm(c), i)
    for k in [0.5, 0.62, 1.4]:
        c = K.modes(tt(0.05), [(2400, 1, 0.006), (4100, 0.5, 0.004)], rng)
        i = int(k * SR)
        put(y, 0.25 * norm(c), i)
    return space(rng, y, wet=0.3, dur=0.8, tau=0.3, bright=6000)


def chirp(t, f0, f1, d):
    f = f0 + (f1 - f0) * np.clip(t / d, 0, 1)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.005, d * 0.5) * (t < d)


def s_dawn(rng):
    """dawn at the window: a breeze through the curtains, a few small birds"""
    t = tt(2.2)
    breeze = moving_band(rng.standard_normal(len(t)), 500 + 300 * np.sin(2 * np.pi * 0.6 * t), q=0.8) * np.sin(np.pi * t / 2.2)
    y = norm(breeze) * 0.6
    for k in range(7):
        st = rng.uniform(0.1, 1.9)
        f0 = rng.uniform(3000, 4200)
        c = chirp(tt(0.09), f0, f0 * rng.uniform(1.15, 1.4), 0.08)
        i = int(st * SR)
        put(y, 0.25 * c, i)
    return space(rng, y, wet=0.3, dur=1.0, tau=0.35, bright=8000)


def s_takeoff(rng):
    """the launch: a deep push-off thump, cloth snapping, a rising rush of air"""
    t = tt(1.4)
    th = sub_kick(t, 95, 38, 0.05, 0.22)
    rush = moving_band(rng.standard_normal(len(t)), 300 + 5200 * np.clip(t / 0.9, 0, 1) ** 1.5, q=1.0) * np.clip(t / 0.15, 0, 1) * np.exp(-np.clip(t - 0.85, 0, None) / 0.18)
    flap = np.zeros(len(t))
    for k in range(5):
        b = bp(rng.standard_normal(int(0.03 * SR)), 300, 2500) * np.exp(-tt(0.03) / 0.008)
        i = int((0.05 + k * 0.07) * SR)
        put(flap, norm(b) * (1 - k * 0.15), i)
    y = 0.9 * norm(th) + 0.7 * norm(rush) + 0.35 * flap
    return space(rng, tail(y, 0.1), wet=0.25, dur=1.0, tau=0.3, bright=6000)


def s_papers(rng):
    """loose papers lifting and fluttering"""
    t = tt(1.3)
    y = np.zeros(len(t))
    for k in range(40):
        g = bp(rng.standard_normal(int(rng.uniform(0.01, 0.04) * SR)), 1200, 6000)
        g *= np.hanning(len(g))
        i = int(rng.uniform(0, 1.1) * SR)
        put(y, g * rng.uniform(0.2, 1.0) * (1 - i / len(t)) ** 0.5, i)
    return space(rng, norm(y), wet=0.2, dur=0.6, tau=0.2, bright=8000)


def s_wind(rng):
    """flying: a full rush of wind with the hoodie flapping (~13 Hz flutter that comes and goes)"""
    t = tt(3.6)
    c = 700 + 400 * np.sin(2 * np.pi * 0.35 * t) + 200 * np.sin(2 * np.pi * 1.3 * t)
    w = moving_band(rng.standard_normal(len(t)), c, q=0.7)
    lo = lp(rng.standard_normal(len(t)), 180) * 0.8
    flut = 1 + 0.35 * np.sin(2 * np.pi * 13 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * t))
    y = (norm(w) + 0.5 * norm(lo)) * flut
    y *= np.clip(t / 0.25, 0, 1) * np.clip((3.6 - t) / 0.4, 0, 1)
    l = np.roll(y, int(0.006 * SR))
    return np.stack([l, y], 1) * 0.8


def s_pass(rng):
    """something zips past: a whoosh that rises, peaks and drops (doppler), panned left → right"""
    t = tt(1.1)
    c = 600 + 3600 * np.exp(-(((t - 0.45) / 0.18) ** 2))
    y = moving_band(rng.standard_normal(len(t)), c, q=1.1) * np.exp(-(((t - 0.45) / 0.22) ** 2))
    return pan(norm(y), np.clip((t - 0.1) / 0.7 * 2 - 1, -1, 1))


def s_pigeon(rng):
    """the pigeon: a startled wing flap, then a low puzzled coo"""
    t = tt(1.4)
    y = np.zeros(len(t))
    for k in range(4):
        b = bp(rng.standard_normal(int(0.06 * SR)), 200, 1800) * np.exp(-tt(0.06) / 0.02)
        i = int((0.02 + k * 0.08) * SR)
        put(y, norm(b) * 0.8, i)
    tc = tt(0.8)
    f = 290 + 60 * np.exp(-tc / 0.15) + 12 * np.sin(2 * np.pi * 7 * tc)
    coo = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(tc, 0.06, 0.35)
    coo += 0.3 * bp(rng.standard_normal(len(tc)), 250, 900) * env(tc, 0.05, 0.3)
    i = int(0.45 * SR)
    put(y, 0.7 * norm(coo), i)
    return space(rng, y, wet=0.2, dur=0.6, tau=0.2, bright=5000)


def s_pop(rng):
    """a small cartoon pop (a question mark appears)"""
    t = tt(0.3)
    f = 380 + 700 * (1 - np.exp(-t / 0.02))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.003, 0.06)
    c = transient(rng, 0.004, 0.001, 2000, 8000)
    y[: len(c)] += 0.5 * norm(c)
    return space(rng, y, wet=0.15, dur=0.4, tau=0.12, bright=8000)


def s_timer(rng):
    """the clock racing to 1:30: a ratchet of ticks that speeds up and lands"""
    t = tt(0.9)
    y = np.zeros(len(t))
    times = 0.82 * (np.linspace(0, 1, 34) ** 0.75)
    for k, tk in enumerate(times):
        c = K.modes(tt(0.03), [(2600 + 20 * k, 1, 0.004), (4300, 0.4, 0.003)], rng)
        i = int(tk * SR)
        put(y, norm(c) * (0.5 + 0.5 * k / len(times)), i)
    return space(rng, y, wet=0.15, dur=0.5, tau=0.15, bright=9000)


def s_ding(rng):
    """done: a bright two-partial bell"""
    t = tt(1.4)
    y = fm_bell(1567.98, t, 0.5, 0.9, 2.0) + 0.4 * fm_bell(2349.3, t, 0.35, 0.6, 2.0)
    return space(rng, y, wet=0.3, dur=1.2, tau=0.4, bright=10000)


def s_swish(rng):
    """a quick cloth swish (a shrug, a jump)"""
    t = tt(0.45)
    y = moving_band(rng.standard_normal(len(t)), 1500 + 2500 * np.sin(np.pi * np.clip(t / 0.3, 0, 1)), q=1.2) * np.sin(np.pi * np.clip(t / 0.3, 0, 1)) ** 2
    return space(rng, norm(y), wet=0.15, dur=0.4, tau=0.12, bright=7000)


def s_crowd(rng):
    """a stadium murmur: many far voices (band-limited babble with slow swells)"""
    t = tt(3.4)
    b = np.zeros(len(t))
    for k in range(10):
        c = rng.uniform(350, 1400)
        b += bp(rng.standard_normal(len(t)), c * 0.7, c * 1.3) * (0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(1.5, 4) * t + rng.uniform(0, 6)))
    y = norm(b) * np.clip(t / 0.3, 0, 1) * np.clip((3.4 - t) / 0.4, 0, 1)
    return space(rng, y, wet=0.45, dur=1.5, tau=0.6, bright=3500, width=1.0)


def s_steps(rng):
    """running steps on a track: soft thuds speeding up"""
    t = tt(0.8)
    y = np.zeros(len(t))
    for k, tk in enumerate([0.0, 0.17, 0.32, 0.45, 0.56, 0.65]):
        th = sub_kick(tt(0.08), 160, 80, 0.01, 0.03) + 0.3 * bp(rng.standard_normal(int(0.08 * SR)), 1500, 5000) * np.exp(-tt(0.08) / 0.01)
        i = int(tk * SR)
        put(y, norm(th) * (0.6 + 0.08 * k), i)
    return space(rng, y, wet=0.2, dur=0.5, tau=0.15, bright=5000)


def s_thud(rng):
    """landing on a crash mat: a soft heavy whump"""
    t = tt(0.7)
    y = sub_kick(t, 120, 55, 0.03, 0.12) + 0.4 * lp(rng.standard_normal(len(t)), 1200) * np.exp(-t / 0.06)
    return space(rng, norm(y), wet=0.2, dur=0.6, tau=0.2, bright=3000)


def s_cheer(rng):
    """the crowd erupts: applause grains + a swell of voices"""
    t = tt(2.0)
    swell = np.sin(np.pi * np.clip(t / 1.8, 0, 1)) ** 0.7
    voices = norm(bp(rng.standard_normal(len(t)), 500, 2500)) * swell
    clap = np.zeros(len(t))
    for k in range(260):
        g = bp(rng.standard_normal(int(0.012 * SR)), 1000, 6000) * np.exp(-tt(0.012) / 0.003)
        i = int(rng.uniform(0.05, 1.8) * SR)
        put(clap, g * rng.uniform(0.3, 1), i)
    y = 0.6 * voices + 0.6 * norm(clap) * swell
    return space(rng, y, wet=0.4, dur=1.4, tau=0.5, bright=6000, width=1.0)


def s_up(rng):
    """the camera whips straight up: a fast rising whoosh"""
    t = tt(0.8)
    c = 300 + 5600 * np.clip(t / 0.55, 0, 1) ** 2
    y = moving_band(rng.standard_normal(len(t)), c, q=1.0) * np.sin(np.pi * np.clip(t / 0.62, 0, 1)) ** 1.5
    y += 0.25 * np.sin(2 * np.pi * np.cumsum(200 + 900 * np.clip(t / 0.6, 0, 1)) / SR) * np.sin(np.pi * np.clip(t / 0.62, 0, 1))
    return space(rng, norm(y), wet=0.2, dur=0.6, tau=0.2, bright=8000)


def s_prop(rng):
    """a small prop plane droning past: buzzy blade-rate tone, doppler drop, left → right"""
    t = tt(2.4)
    dop = 1 + 0.06 * np.tanh((1.2 - t) * 2.5)
    f = 88 * dop
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = sum(np.sin(h * ph) / h for h in range(1, 12))
    y *= 0.7 + 0.3 * np.sin(2 * np.pi * 26 * dop * t)
    y = lp(y, 1600) + 0.2 * bp(rng.standard_normal(len(t)), 300, 2000)
    y *= np.exp(-(((t - 1.2) / 0.75) ** 2))
    return pan(norm(y), np.clip((t - 0.2) / 2.0 * 2 - 1, -1, 1))


def s_jet(rng):
    """an airliner passing high: a broad roar with a faint turbine whine and doppler, right → left"""
    t = tt(2.4)
    roar = moving_band(rng.standard_normal(len(t)), 600 + 900 * np.exp(-(((t - 1.0) / 0.5) ** 2)), q=0.5)
    whine = np.sin(2 * np.pi * np.cumsum(1300 * (1 + 0.08 * np.tanh((1.0 - t) * 3))) / SR) * 0.12
    y = (norm(roar) + whine) * np.exp(-(((t - 1.0) / 0.7) ** 2))
    y += 0.5 * norm(lp(rng.standard_normal(len(t)), 150)) * np.exp(-(((t - 1.05) / 0.6) ** 2))
    return pan(norm(y), np.clip(1 - (t - 0.2) / 2.0 * 2, -1, 1))


def s_cloud(rng):
    """climbing through the cloud deck: a soft airy whoosh that swells and opens out"""
    t = tt(2.2)
    c = 400 + 2200 * np.clip(t / 1.4, 0, 1)
    y = moving_band(rng.standard_normal(len(t)), c, q=0.6) * np.sin(np.pi * np.clip(t / 2.0, 0, 1)) ** 1.2
    shimmer = sum(fm_bell(f, np.clip(t - 1.15, 0, None), 0.6, 0.4, 2.0) * (t > 1.15) for f in [1318.5, 1760, 2637]) * 0.12
    return space(rng, norm(y) + shimmer, wet=0.45, dur=1.6, tau=0.6, bright=7000)


def s_bite(rng):
    """a crunchy bite of a sandwich: crust crackle, a soft chomp"""
    t = tt(0.5)
    y = np.zeros(len(t))
    for k in range(40):
        g = bp(rng.standard_normal(int(rng.uniform(0.002, 0.006) * SR)), 2000, 9000)
        i = int(rng.uniform(0.0, 0.14) * SR)
        put(y, norm(g) * rng.uniform(0.2, 1), i)
    y += 0.6 * norm(sub_kick(t, 180, 90, 0.01, 0.04))
    return space(rng, y, wet=0.12, dur=0.4, tau=0.1, bright=9000)


def s_frost(rng):
    """ice creeping over fabric: tiny crystalline crackles and glassy tinkles"""
    t = tt(1.8)
    y = np.zeros(len(t))
    for k in range(70):
        g = bp(rng.standard_normal(int(0.003 * SR)), 4000, 12000)
        i = int((1.6 * rng.uniform(0, 1) ** 0.7) * SR)
        put(y, g * rng.uniform(0.2, 1), i)
    for k in range(9):
        b = fm_bell(rng.uniform(2800, 5200), tt(0.4), 0.12, 0.5, 2.7)
        i = int(rng.uniform(0.1, 1.5) * SR)
        put(y, 0.35 * b, i)
    return space(rng, norm(y), wet=0.4, dur=1.2, tau=0.4, bright=12000)


def s_chatter(rng):
    """teeth chattering in the cold"""
    t = tt(1.2)
    y = np.zeros(len(t))
    for k in range(int(1.1 * 17)):
        c = K.modes(tt(0.02), [(2100, 1, 0.003), (3500, 0.5, 0.002)], rng)
        i = int((k / 17 + rng.uniform(-0.004, 0.004)) * SR)
        put(y, norm(c) * (0.7 + 0.3 * rng.uniform()), i)
    return space(rng, y, wet=0.1, dur=0.3, tau=0.08, bright=8000)


def s_breath(rng):
    """one cold breath out"""
    t = tt(0.7)
    y = bp(rng.standard_normal(len(t)), 400, 2200) * env(t, 0.12, 0.22)
    return space(rng, norm(y), wet=0.15, dur=0.4, tau=0.15, bright=5000)


def s_thermo(rng):
    """the thermometer plunging: a soft falling glide"""
    t = tt(0.9)
    f = 1200 * np.exp(-t / 0.35) + 260
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(t, 0.01, 0.4)
    return space(rng, y, wet=0.25, dur=0.8, tau=0.3, bright=7000)


def s_chime(rng):
    """a cabin chime: a clean high-low bing-bong"""
    t = tt(1.8)
    y = fm_bell(1046.5, t, 0.7, 0.25, 1.0)
    t2 = np.clip(t - 0.42, 0, None)
    y += fm_bell(784.0, t2, 0.8, 0.25, 1.0) * (t > 0.42)
    return space(rng, y, wet=0.3, dur=1.2, tau=0.4, bright=8000)


def s_flock(rng):
    """a flock arriving: dozens of wingbeats and a few calls"""
    t = tt(1.4)
    y = np.zeros(len(t))
    for k in range(120):
        b = bp(rng.standard_normal(int(0.025 * SR)), 250, 2200) * np.exp(-tt(0.025) / 0.008)
        i = int(rng.uniform(0, 1.2) * SR)
        put(y, norm(b) * rng.uniform(0.2, 1), i)
    for k in range(5):
        c = chirp(tt(0.12), rng.uniform(1800, 2600), rng.uniform(1400, 1900), 0.11)
        i = int(rng.uniform(0.1, 1.1) * SR)
        put(y, 0.3 * c, i)
    return space(rng, norm(y), wet=0.3, dur=0.8, tau=0.3, bright=7000, width=1.0)


def s_ping(rng):
    """a radar/sonar ping with its echo"""
    t = tt(1.6)
    y = np.sin(2 * np.pi * 1480 * t) * env(t, 0.004, 0.35)
    y += 0.3 * np.sin(2 * np.pi * 2960 * t) * env(t, 0.004, 0.12)
    return space(rng, y, wet=0.35, dur=1.4, tau=0.5, bright=9000, pingpong=(0.28, 0.4, 0.35))


def s_alert(rng):
    """an alert: two short square beeps"""
    t = tt(0.75)
    y = np.zeros(len(t))
    for st in [0.0, 0.22]:
        tt_ = t - st
        m = (tt_ > 0) & (tt_ < 0.13)
        y += np.sign(np.sin(2 * np.pi * 880 * tt_)) * m * np.clip(tt_ / 0.004, 0, 1) * np.clip((0.13 - tt_) / 0.01, 0, 1)
    y = lp(y, 5000)
    return space(rng, y, wet=0.2, dur=0.5, tau=0.15, bright=6000)


def marimba(f, rng):
    """a soft felt-mallet marimba note: warm fundamental, a quiet octave shimmer, the bar's own overtone, a soft tap"""
    t = tt(1.1)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.34)
    y += 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.16)
    y += 0.1 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.045)
    y *= 1 - np.exp(-t / 0.0025)
    tap = lp(rng.standard_normal(int(0.014 * SR)), 1600) * np.exp(-tt(0.014) / 0.003)
    put(y, 0.18 * norm(tap), 0)
    return space(rng, y, wet=0.22, dur=0.9, tau=0.3, bright=6000)


def s_tag_d(rng):
    """a label lands: marimba D4 (in the score's key)"""
    return marimba(293.66, rng)


def s_tag_fs(rng):
    """a label lands: marimba F#4"""
    return marimba(369.99, rng)


def s_tag_a(rng):
    """a label lands: marimba A4"""
    return marimba(440.0, rng)


SOUNDS = {
    # name: (fn, loudness target (momentary max, LUFS), seed, what for)
    "screen-on": (s_screen_on, -20, 501, "a phone screen wakes up"),
    "snap-out": (s_snap_out, -20, 502, "OPT-IN (whoosh family): snap zoom out of a close-up (opt-in whoosh family)"),
    "chip-seat": (s_chip_seat, -20, 503, "tweezers seat a chip / a part clicks into place"),
    "led": (s_led, -22, 504, "an LED or indicator comes on"),
    "wire": (s_wire, -22, 505, "a wire bent by a fingertip"),
    "door": (s_door, -20, 506, "elevator / sliding doors close"),
    "signal": (s_signal, -20, 507, "success chime: full signal, it worked"),
    "boom": (s_boom, -14, 508, "title hit: deep cinematic boom"),
    "swell": (s_swell, -22, 509, "soft reversed swell into a reveal"),
    "shimmer": (s_shimmer, -22, 510, "a line or chart draws on"),
    "ui": (s_ui, -24, 511, "a value label appears"),
    "crack": (s_crack, -16, 512, "something snaps: a ruler / stick breaks"),
    "flythrough": (s_fly, -14, 513, "OPT-IN (whoosh family): the fast camera fly-through (opt-in whoosh family)"),
    "reveal": (s_reveal, -15, 514, "the big number / hero reveal"),
    "traffic": (s_traffic, -20, 701, "gridlock bed"),
    "honk": (s_honk, -18, 702, "a car horn"),
    "office": (s_office, -28, 703, "office room tone, clock, keys"),
    "dawn": (s_dawn, -24, 704, "breeze + small birds at a window"),
    "takeoff": (s_takeoff, -14, 705, "launch: thump + rising rush"),
    "papers": (s_papers, -22, 706, "papers fluttering"),
    "wind": (s_wind, -18, 707, "flying wind with cloth flutter"),
    "pass": (s_pass, -18, 708, "OPT-IN (whoosh family): zip past, doppler"),
    "pigeon": (s_pigeon, -20, 709, "wing flap + coo"),
    "pop": (s_pop, -22, 710, "cartoon pop"),
    "timer": (s_timer, -22, 711, "racing timer ticks"),
    "ding": (s_ding, -20, 712, "done ding"),
    "swish": (s_swish, -22, 713, "OPT-IN (whoosh family): cloth swish"),
    "crowd": (s_crowd, -26, 714, "stadium murmur"),
    "steps": (s_steps, -22, 715, "running steps"),
    "thud": (s_thud, -18, 716, "mat landing"),
    "cheer": (s_cheer, -20, 717, "crowd cheer"),
    "up": (s_up, -16, 718, "OPT-IN (whoosh family): whip up"),
    "prop": (s_prop, -20, 719, "prop plane pass"),
    "jet": (s_jet, -18, 720, "airliner pass"),
    "cloud": (s_cloud, -18, 721, "through the clouds"),
    "bite": (s_bite, -18, 722, "sandwich bite"),
    "frost": (s_frost, -22, 723, "frost crackle"),
    "chatter": (s_chatter, -24, 724, "teeth chatter"),
    "breath": (s_breath, -26, 725, "cold breath"),
    "thermo": (s_thermo, -24, 726, "thermometer drop"),
    "chime": (s_chime, -20, 727, "cabin chime"),
    "flock": (s_flock, -20, 728, "flock of birds"),
    "ping": (s_ping, -20, 729, "radar ping"),
    "alert": (s_alert, -22, 730, "alert beeps"),
    "tag-d": (s_tag_d, -24, 732, "a label lands (marimba D4)"),
    "tag-fs": (s_tag_fs, -24, 733, "a label lands (marimba F#4)"),
    "tag-a": (s_tag_a, -24, 734, "a label lands (marimba A4)"),
}


def main():
    only = sys.argv[1].split(",") if len(sys.argv) > 1 else None
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for name, (fn, target, seed, use) in SOUNDS.items():
        if only and name not in only:
            continue
        x = fn(np.random.default_rng(seed))
        x = np.stack([x, x], 1) if x.ndim == 1 else x
        st = K.finish_stereo(x, target)
        K.write_wav(OUT / f"{name}.wav", st)
        m = K.momentary_max(st)
        rows.append(f"| `{name}` | {len(st) / SR:.2f} s | {m:.1f} | {use} |")
        print(f"{name:12s} {len(st) / SR:5.2f}s  M-max {m:6.1f} LUFS")
    if not only:
        (OUT / "INDEX.md").write_text(
            "# Stickman Explainer sounds (generated by tools/sfx/build_stickman.py — do not edit by hand)\n\n"
            "| name | length | loudness (M max, LUFS) | use |\n|---|---|---|---|\n" + "\n".join(rows) + "\n"
        )


if __name__ == "__main__":
    main()

"""Moworks Studio's own sound recipes, written with the owner's sfxlib (the ingredients of the owner's Story Animation source skill, pinned in
bundle/styles/moworks-styles/story/tools/sfx/sfxlib.py and imported from there as it ships). Nothing here is a sample: every sound is
made from noise, damped modes, filters and envelopes, seeded, so the same seed always gives the same sound.

Each recipe is r_<name>(rng, p) -> a mono array (or stereo (n, 2)) at sfxlib.SR. p holds the recipe's parameters (the entry's own in
packages/sfx/code-recipes.json, and the film's: dur for a sound that lasts as long as its motion). make.py levels, trims and writes
every one the same way (pitch, brightness and the take's seed are applied there).

The recipes are named by what is heard: the thing and its material ("impact" of wood, metal, glass…), the action ("roll", "scrape",
"creak"), the tool ("writing" with a crayon, a marker, a pencil, chalk). Written 04/11/2026 for the app (owner #888, #889, #910).
"""
import numpy as np
from scipy import signal

import sfxlib as K
from sfxlib import SR, bp, hp, lp, modes, moving_band, norm, space, sub_kick, tail, transient, tt

TAU = 2 * np.pi


def _f(p, key, default):
    v = p.get(key, default)
    return default if v is None else v


def put(buf, x, at, gain=1.0):
    """add mono x into mono buf at second `at` (clipped)"""
    i = int(round(at * SR))
    if i >= len(buf) or i < 0:
        return buf
    n = min(len(x), len(buf) - i)
    buf[i : i + n] += gain * x[:n]
    return buf


def env(t, a, d):
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)


def hann_env(t, dur):
    return np.sin(np.pi * np.clip(t / max(dur, 1e-3), 0, 1)) ** 2


def nz(rng, dur):
    return rng.standard_normal(len(tt(dur)))


def safe_bp(x, lo, hi, order=2):
    lo = max(20.0, lo)
    hi = min(0.45 * SR, hi)
    return bp(x, lo, hi, order) if hi > lo * 1.05 else lp(x, hi)


def chirp_tone(f0, f1, dur, tau):
    t = tt(dur)
    f = f1 + (f0 - f1) * np.exp(-t / tau)
    return np.sin(TAU * np.cumsum(f) / SR)


def bubble(rng, f0=None, dur=0.06):
    """one water bubble: a damped sine whose pitch rises as it closes (Minnaert)"""
    f0 = f0 or rng.uniform(500, 1400)
    t = tt(dur)
    f = f0 * (1 + 0.9 * (t / dur) ** 1.5)
    return np.sin(TAU * np.cumsum(f) / SR) * env(t, 0.001, dur / 4)


# ── materials: the struck body of each ────────────────────────────────────────────────────────────────────────────
# f: the lowest mode (Hz, a range), modes: (ratio, amp, tau s), noise: the strike's band and its decay, sub: a low thump, wet: room
MAT = {
    "wood": dict(f=(230, 420), modes=[(1, 1, 0.035), (2.32, 0.55, 0.022), (3.91, 0.32, 0.013), (5.6, 0.15, 0.008)], noise=(900, 5200, 0.004), sub=0.35, wet=0.14),
    "metal": dict(f=(520, 980), modes=[(1, 1, 0.45), (2.76, 0.6, 0.3), (5.40, 0.35, 0.18), (8.93, 0.2, 0.1)], noise=(2500, 11000, 0.002), sub=0.15, wet=0.22),
    "brass": dict(f=(700, 1200), modes=[(1, 1, 0.6), (2.41, 0.5, 0.4), (4.6, 0.3, 0.22), (7.1, 0.15, 0.12)], noise=(3000, 12000, 0.0015), sub=0.05, wet=0.22),
    "glass": dict(f=(1700, 2900), modes=[(1, 1, 0.3), (2.32, 0.5, 0.2), (4.25, 0.25, 0.12), (6.6, 0.12, 0.07)], noise=(4000, 14000, 0.001), sub=0.0, wet=0.2),
    "ceramic": dict(f=(1100, 1900), modes=[(1, 1, 0.12), (1.61, 0.6, 0.09), (2.93, 0.35, 0.06), (4.1, 0.2, 0.04)], noise=(3000, 11000, 0.0015), sub=0.05, wet=0.16),
    "stone": dict(f=(300, 600), modes=[(1, 1, 0.018), (1.83, 0.6, 0.012), (3.1, 0.4, 0.008)], noise=(600, 4500, 0.006), sub=0.45, wet=0.18),
    "plastic": dict(f=(800, 1500), modes=[(1, 1, 0.02), (2.1, 0.5, 0.013), (3.7, 0.25, 0.008)], noise=(2000, 9000, 0.002), sub=0.1, wet=0.1),
    "soft": dict(f=(90, 150), modes=[(1, 1, 0.03)], noise=(150, 1600, 0.012), sub=0.9, wet=0.08),
    "paper": dict(f=(180, 320), modes=[(1, 0.4, 0.015)], noise=(500, 6500, 0.007), sub=0.35, wet=0.1),
    "cardboard": dict(f=(150, 260), modes=[(1, 1, 0.03), (1.9, 0.4, 0.02)], noise=(400, 4000, 0.008), sub=0.5, wet=0.12),
    "body": dict(f=(80, 130), modes=[(1, 0.6, 0.04)], noise=(200, 2500, 0.01), sub=1.0, wet=0.1),
    "rubber": dict(f=(140, 260), modes=[(1, 1, 0.05), (2.6, 0.3, 0.03)], noise=(300, 3000, 0.004), sub=0.6, wet=0.08),
}


def struck(rng, material="wood", weight=0.5, f_scale=1.0):
    """the body of one strike, mono: damped modes + the strike's noise + a thump"""
    m = MAT.get(material, MAT["wood"])
    f0 = rng.uniform(*m["f"]) * f_scale * (1.0 - 0.3 * (weight - 0.5))
    longest = max(tau for _, _, tau in m["modes"]) * (0.7 + 0.8 * weight)
    dur = min(2.5, 0.12 + 6 * longest)
    t = tt(dur)
    parts = [(f0 * r * rng.uniform(0.985, 1.015), a, tau * (0.7 + 0.8 * weight)) for r, a, tau in m["modes"] if f0 * r < 0.45 * SR]
    y = norm(modes(t, parts, rng)) * np.minimum(1, t / 0.0008)
    lo, hi, ntau = m["noise"]
    n = safe_bp(rng.standard_normal(len(t)) * np.exp(-t / (ntau * (0.6 + weight))), lo, hi)
    y = y + 0.8 * norm(n)
    if m["sub"] > 0:
        y = y + m["sub"] * (0.4 + weight) * sub_kick(t, 150 * f_scale, 50 * f_scale, 0.015, 0.05 + 0.15 * weight)
    return norm(y)


def r_impact(rng, p):
    """one object hits another: the struck body of its material, heavier = lower, longer, with a room"""
    mat, w = _f(p, "material", "wood"), _f(p, "weight", 0.5)
    y = struck(rng, mat, w)
    return space(rng, y, wet=MAT.get(mat, MAT["wood"])["wet"] + 0.12 * w, dur=0.5 + 0.6 * w, tau=0.12 + 0.25 * w, bright=7000)


def r_knock(rng, p):
    """knuckles on a door or a table: two or three knocks, each a little different"""
    mat, n = _f(p, "material", "wood"), int(_f(p, "n", 3))
    gap = _f(p, "gap", 0.17)
    y = np.zeros(int((gap * n + 0.6) * SR))
    for k in range(n):
        at = k * gap * rng.uniform(0.92, 1.08)
        put(y, struck(rng, mat, 0.45, f_scale=rng.uniform(0.95, 1.05)) * (1 - 0.12 * k), at)
        if mat == "wood":  # a door panel's hollow body under the knuckle
            t = tt(0.25)
            put(y, 0.5 * np.sin(TAU * rng.uniform(110, 170) * t) * np.exp(-t / 0.05) * np.minimum(1, t / 0.001), at)
    return space(rng, norm(y), wet=0.18, dur=0.6, tau=0.22, bright=6000)


def r_tap(rng, p):
    """a fingertip or a small thing taps a surface: a light, bright strike"""
    y = struck(rng, _f(p, "material", "wood"), 0.15, f_scale=1.4)
    return space(rng, y, wet=0.08, dur=0.3, tau=0.08, bright=9000)


def r_clink(rng, p):
    """two glasses, a spoon on a cup: one or two small bright touches that ring"""
    mat, n = _f(p, "material", "glass"), int(_f(p, "n", 2))
    y = np.zeros(int(1.4 * SR))
    for k in range(n):
        put(y, struck(rng, mat, 0.2, f_scale=rng.uniform(1.1, 1.5)) * (1 - 0.3 * k), k * rng.uniform(0.07, 0.14))
    return space(rng, norm(y), wet=0.2, dur=0.8, tau=0.25, bright=11000)


def r_rattle(rng, p):
    """loose small things shaken: many tiny strikes"""
    mat, dur = _f(p, "material", "metal"), _f(p, "dur", 0.8)
    y = np.zeros(int((dur + 0.4) * SR))
    for _ in range(int(_f(p, "density", 28) * dur)):
        put(y, struck(rng, mat, 0.05, f_scale=rng.uniform(1.2, 2.2)) * rng.uniform(0.2, 1.0), rng.uniform(0, dur))
    return space(rng, norm(y) * hann_env(tt(dur + 0.4), dur + 0.4) ** 0.3, wet=0.15, dur=0.5, tau=0.15, bright=9000)


def r_jingle(rng, p):
    """keys or coins jingling: small metal rings that touch"""
    dur = _f(p, "dur", 0.7)
    y = np.zeros(int((dur + 0.8) * SR))
    for _ in range(int(22 * dur) + 4):
        t = tt(0.5)
        f = rng.uniform(2500, 6500)
        ring = modes(t, [(f, 1, 0.12), (f * 2.7, 0.4, 0.06)], rng) * np.minimum(1, t / 0.0005)
        put(y, ring * rng.uniform(0.2, 1.0), rng.uniform(0, dur))
    return space(rng, norm(y), wet=0.2, dur=0.6, tau=0.2, bright=12000)


def r_shatter(rng, p):
    """glass or china breaks: an impact and a spray of bright shards settling"""
    mat = _f(p, "material", "glass")
    y = np.zeros(int(1.6 * SR))
    put(y, struck(rng, mat, 0.7), 0)
    for _ in range(70):
        at = 0.01 + rng.exponential(0.18)
        if at < 1.2:
            put(y, struck(rng, mat, 0.03, f_scale=rng.uniform(1.3, 3.0)) * rng.uniform(0.1, 0.7) * np.exp(-at / 0.5), at)
    n = hp(nz(rng, 1.6), 3000) * np.exp(-tt(1.6) / 0.12)
    return space(rng, norm(norm(y) + 0.4 * n), wet=0.25, dur=0.9, tau=0.3, bright=12000)


def r_roll(rng, p):
    """a ball or a marble rolls: a steady rumble of its material and tiny bumps at its turn, fading as it slows"""
    mat, dur = _f(p, "material", "wood"), _f(p, "dur", 2.0)
    t = tt(dur)
    m = MAT.get(mat, MAT["wood"])
    rate = rng.uniform(14, 26) * (1 - 0.45 * t / dur)
    phase = np.cumsum(rate) / SR
    bumps = np.zeros(len(t))
    for k in range(1, int(phase[-1])):
        i = int(np.searchsorted(phase, k + rng.uniform(-0.15, 0.15)))
        if i < len(t):
            put(bumps, struck(rng, mat, 0.02, f_scale=rng.uniform(1.2, 1.8)) * rng.uniform(0.15, 0.5), i / SR)
    lo, hi = (150, 1400) if mat in ("wood", "stone", "paper", "cardboard") else (600, 5000)
    rumble = safe_bp(rng.standard_normal(len(t)), lo, hi) * (0.7 + 0.3 * np.sin(TAU * rate * t / 3))
    # the rail's or the tube's ring for metal
    ring = 0
    if mat in ("metal", "brass", "glass"):
        f = rng.uniform(*m["f"]) * 1.3
        ring = 0.25 * np.sin(TAU * f * t) * (0.5 + 0.5 * np.sin(TAU * 0.7 * t))
    shape = np.minimum(1, t / 0.08) * np.clip((dur - t) / (0.35 * dur), 0, 1) ** 0.8
    y = (0.6 * norm(rumble) + norm(bumps) + ring) * shape
    return space(rng, norm(y), wet=0.14, dur=0.5, tau=0.18, bright=7000)


def stick_slip(rng, dur, rate=(40, 140), center=(500, 1400), q=6.0, jitter=0.3):
    """friction: a train of tiny catches whose rate wanders, rung through a resonance (a creak, a scrape)"""
    t = tt(dur)
    r = np.interp(t, np.linspace(0, dur, 6), rng.uniform(*rate, 6))
    r = r * (1 + jitter * signal.sosfilt(K.sos("lowpass", 8), rng.standard_normal(len(t))))
    ph = np.cumsum(np.clip(r, 5, 600)) / SR
    pulses = np.zeros(len(t))
    idx = np.nonzero(np.diff(np.floor(ph)) > 0)[0]
    pulses[idx] = rng.uniform(0.4, 1.0, len(idx))
    fc = np.interp(t, np.linspace(0, dur, 5), rng.uniform(*center, 5))
    y = moving_band(pulses + 0.05 * rng.standard_normal(len(t)), fc, q=q)
    return y


def r_creak(rng, p):
    """a hinge, a floorboard, a ladder creaks: slow catches of friction rung through the wood (or the metal)"""
    mat, dur = _f(p, "material", "wood"), _f(p, "dur", 0.9)
    center = (350, 900) if mat == "wood" else (900, 2600)
    y = stick_slip(rng, dur, rate=(25, 90) if mat == "wood" else (60, 200), center=center, q=8 if mat == "wood" else 12)
    y = norm(y) * hann_env(tt(dur), dur) ** 0.5
    return space(rng, y, wet=0.2, dur=0.6, tau=0.22, bright=5000)


def r_scrape(rng, p):
    """a chair or a box drags on a floor: rough friction with grit, as long as the move"""
    mat, dur = _f(p, "material", "wood"), _f(p, "dur", 0.8)
    fric = stick_slip(rng, dur, rate=(80, 260), center=(300, 1200) if mat in ("wood", "stone", "cardboard") else (1200, 4000), q=3)
    grit = safe_bp(nz(rng, dur), 800, 6000) * (0.5 + 0.5 * rng.random(len(tt(dur))) ** 4)
    y = (norm(fric) + 0.35 * norm(grit)) * np.minimum(1, tt(dur) / 0.04) * np.clip((dur - tt(dur)) / 0.12, 0, 1)
    return space(rng, norm(y), wet=0.15, dur=0.5, tau=0.18, bright=6000)


def r_slide(rng, p):
    """a smooth thing slides on a surface: a soft even friction that rises and settles"""
    surface, dur = _f(p, "material", "wood"), _f(p, "dur", 0.6)
    lo, hi = {"paper": (1500, 7000), "metal": (2000, 9000), "glass": (2500, 10000), "stone": (500, 4000)}.get(surface, (400, 3500))
    t = tt(dur)
    fc = np.exp(np.interp(t, [0, dur], [np.log(hi * 0.55), np.log(lo * 1.4)]))
    y = moving_band(rng.standard_normal(len(t)), fc, q=1.0) * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.8
    end = struck(rng, "paper" if surface == "paper" else surface, 0.1)
    out = np.zeros(len(t) + int(0.3 * SR))
    put(out, norm(y), 0)
    put(out, 0.35 * end, dur * 0.92)
    return space(rng, norm(out), wet=0.1, dur=0.4, tau=0.12, bright=8000)


def r_slime(rng, p):
    """a snail's soft wet slide: a slow damp smear with tiny sticky pops"""
    dur = _f(p, "dur", 1.8)
    t = tt(dur)
    smear = moving_band(rng.standard_normal(len(t)), 500 + 350 * np.sin(TAU * 0.35 * t + rng.uniform(0, 6)), q=1.4)
    smear = lp(smear, 2400) * (0.55 + 0.45 * np.sin(TAU * rng.uniform(0.6, 1.1) * t) ** 2)
    pops = np.zeros(len(t))
    for _ in range(int(7 * dur)):
        put(pops, bubble(rng, rng.uniform(350, 900), 0.04) * rng.uniform(0.2, 0.6), rng.uniform(0, dur))
    y = (0.8 * norm(smear) + 0.5 * pops) * np.minimum(1, t / 0.25) * np.clip((dur - t) / 0.35, 0, 1)
    return space(rng, norm(y), wet=0.1, dur=0.4, tau=0.12, bright=4000)


# ── paper, writing ─────────────────────────────────────────────────────────────────────────────────────────────────


def grains(rng, dur, density, lo=1500, hi=9000, size=(0.0006, 0.003), amp=(0.2, 1.0), shape=None):
    """paper fibres snapping: density grains a second, each a few ms of band-passed noise"""
    y = np.zeros(int(dur * SR) + int(0.01 * SR))
    for _ in range(int(density * dur)):
        at = rng.uniform(0, dur)
        g = K.grain(rng, lo * rng.uniform(0.8, 1.2), hi * rng.uniform(0.8, 1.1), rng.uniform(*size))
        w = shape(at) if shape else 1.0
        put(y, g * rng.uniform(*amp) * w, at)
    return y


def r_paper(rng, p):
    """paper handled, by its action: slide, flip (a page turn), fold, unfold (a letter opened), crumple, rustle, tear, land, flutter"""
    act, dur = _f(p, "action", "rustle"), _f(p, "dur", None)
    if act == "slide":
        return r_slide(rng, {"material": "paper", "dur": dur or 0.5})
    if act == "land":
        t = tt(0.4)
        y = safe_bp(rng.standard_normal(len(t)) * np.exp(-t / 0.012), 300, 5000) + 0.5 * sub_kick(t, 140, 70, 0.01, 0.03)
        y = norm(y)
        put(y, 0.3 * norm(grains(rng, 0.06, 300)), 0)  # the sheet's edge settling
        return space(rng, norm(y), wet=0.08, dur=0.3, tau=0.08, bright=7000)
    if act == "slap":
        t = tt(0.3)
        y = safe_bp(rng.standard_normal(len(t)) * np.exp(-t / 0.006), 900, 8000) + 0.3 * sub_kick(t, 180, 90, 0.008, 0.02)
        return space(rng, norm(y), wet=0.1, dur=0.3, tau=0.1, bright=9000)
    if act == "flip":
        d = dur or 0.6
        t = tt(d)
        fc = 1200 + 4200 * np.sin(np.pi * np.clip((t - 0.1) / 0.35, 0, 1))
        swish = moving_band(rng.standard_normal(len(t)), fc, q=1.1) * np.sin(np.pi * np.clip((t - 0.05) / 0.45, 0, 1)) ** 2
        y = norm(swish) + 0.5 * norm(grains(rng, d, 160, shape=lambda a: np.exp(-((a - 0.15) / 0.12) ** 2) + 0.4))[: len(t)]
        put(y, 0.25 * norm(safe_bp(nz(rng, 0.05) * np.exp(-tt(0.05) / 0.01), 400, 4000)), d * 0.82)
        return space(rng, norm(y), wet=0.1, dur=0.4, tau=0.12, bright=9000)
    if act in ("fold", "unfold"):
        d = dur or (0.5 if act == "fold" else 1.1)
        t = tt(d)
        # creases cracking open one after another, between them the sheet moving through the air
        opens = [0.05, 0.38, 0.72] if act == "unfold" else [0.05, 0.3]
        y = 0.5 * norm(moving_band(rng.standard_normal(len(t)), 900 + 2500 * np.abs(np.sin(TAU * 0.9 * t)), q=1.3)) * (0.35 + 0.65 * hann_env(t, d))
        for k, a in enumerate(opens):
            if a < d:
                put(y, norm(grains(rng, 0.12, 900, lo=1200, hi=8000)) * (0.9 - 0.15 * k), a * d / 1.1 if act == "unfold" else a)
        return space(rng, norm(y), wet=0.1, dur=0.4, tau=0.12, bright=9000)
    if act == "crumple":
        d = dur or 0.9
        bursts = lambda a: 0.3 + np.sin(TAU * 3.1 * a) ** 2  # noqa: E731
        y = norm(grains(rng, d, 1600, lo=800, hi=9000, shape=bursts)) + 0.3 * norm(safe_bp(nz(rng, d + 0.01), 500, 4000)) * 0.4
        y = y[: len(tt(d))] * np.minimum(1, tt(d) / 0.03) * np.clip((d - tt(d)) / 0.1, 0, 1)
        return space(rng, norm(y), wet=0.1, dur=0.4, tau=0.12, bright=9000)
    if act == "tear":
        d = dur or 0.7
        t = tt(d)
        dens = lambda a: 0.2 + 1.6 * (a / d)  # noqa: E731
        rip = moving_band(rng.standard_normal(len(t)), 1800 + 2500 * t / d, q=0.9) * (0.4 + 0.6 * (t / d)) * np.clip((d - t) / 0.04, 0, 1)
        y = norm(rip) * 0.6 + norm(grains(rng, d, 2200, lo=1500, hi=9000, shape=dens))[: len(t)]
        return space(rng, norm(y), wet=0.1, dur=0.4, tau=0.12, bright=9000)
    if act == "flutter":
        d = dur or 1.0
        t = tt(d)
        flap = (0.5 + 0.5 * np.sin(TAU * rng.uniform(9, 15) * t + rng.uniform(0, 6))) ** 3
        y = moving_band(rng.standard_normal(len(t)), 1800 + 1200 * np.sin(TAU * 0.8 * t), q=1.2) * flap * hann_env(t, d) ** 0.4
        return space(rng, norm(y), wet=0.12, dur=0.4, tau=0.12, bright=8000)
    # rustle: a sheet or a pile handled
    d = dur or 0.8
    y = norm(grains(rng, d, 500, lo=1200, hi=8000, amp=(0.1, 0.8))) + 0.4 * norm(safe_bp(nz(rng, d + 0.01), 1500, 6000))
    y = y[: len(tt(d))] * hann_env(tt(d), d) ** 0.5
    return space(rng, norm(y), wet=0.1, dur=0.4, tau=0.12, bright=8000)


def strokes_of(rng, dur, kind):
    """when the tool touches the page: [(start, end)] for a line, a scribble, a hatching, a dot"""
    if kind == "dot":
        return [(0.0, 0.05)]
    if kind == "line":
        return [(0.0, dur)]
    if kind == "hatch":
        n = max(3, int(dur / 0.12))
        return [(k * dur / n, k * dur / n + dur / n * 0.75) for k in range(n)]
    if kind == "scribble":
        out, a = [], 0.0
        while a < dur:
            b = min(dur, a + rng.uniform(0.07, 0.16))
            out.append((a, b))
            a = b + rng.uniform(0.0, 0.03)
        return out
    # writing: words of a few strokes, small gaps, a longer one between words
    out, a = [], 0.0
    while a < dur:
        b = min(dur, a + rng.uniform(0.06, 0.22))
        out.append((a, b))
        a = b + (rng.uniform(0.12, 0.25) if rng.random() < 0.2 else rng.uniform(0.02, 0.06))
    return out


TOOLS = {
    # band of its friction, grain (wax, graphite, grit), its squeak (marker), a tap at each touch
    "pencil": dict(lo=2500, hi=10000, grain=0.25, squeak=0.0, tap=0.15, level=0.7),
    "crayon": dict(lo=500, hi=3800, grain=0.9, squeak=0.0, tap=0.3, level=1.0),
    "marker": dict(lo=1400, hi=6500, grain=0.1, squeak=0.35, tap=0.2, level=0.9),
    "chalk": dict(lo=900, hi=7500, grain=0.7, squeak=0.05, tap=0.6, level=1.0),
    "pen": dict(lo=2800, hi=9500, grain=0.15, squeak=0.0, tap=0.1, level=0.6),
    "brush": dict(lo=400, hi=2600, grain=0.05, squeak=0.0, tap=0.0, level=0.6),
}


def r_writing(rng, p):
    """a tool on paper (or chalk on a board): its friction while it touches, by stroke: a line, writing, a scribble, hatching, a dot"""
    tool, kind = _f(p, "tool", "pencil"), _f(p, "stroke", "write")
    dur = _f(p, "dur", 0.05 if kind == "dot" else 1.2)
    T = TOOLS.get(tool, TOOLS["pencil"])
    t = tt(dur + 0.1)
    spans = strokes_of(rng, dur, kind)
    e = K.strokes(t, spans)
    speed = 1 + 0.5 * np.abs(np.gradient(e)) * SR / 50
    fc = np.sqrt(T["lo"] * T["hi"]) * (0.8 + 0.4 * np.clip(speed, 0, 2) / 2)
    fric = moving_band(rng.standard_normal(len(t)), fc, q=0.9) * e
    if T["grain"]:
        tex = rng.random(len(t)) ** (6 - 4 * T["grain"])
        fric = fric * (1 - T["grain"] + T["grain"] * 2 * tex)
    y = norm(fric)
    if T["squeak"]:
        f = rng.uniform(1800, 2800) * (1 + 0.04 * np.sin(TAU * 7 * t))
        y = y + T["squeak"] * np.sin(TAU * np.cumsum(f) / SR) * e * (rng.random() < 0.8) * (t > spans[0][0] + 0.05)
    for a, _b in spans:
        if T["tap"]:
            put(y, T["tap"] * struck(rng, "paper", 0.05, f_scale=2.5) * 0.5, a)
    if kind == "dot":
        y = np.zeros(int(0.25 * SR))
        put(y, struck(rng, "paper", 0.1, f_scale=2.0), 0)
        put(y, 0.5 * norm(safe_bp(nz(rng, 0.04), T["lo"], T["hi"]) * np.exp(-tt(0.04) / 0.01)), 0.002)
    return space(rng, norm(y) * T["level"], wet=0.06, dur=0.3, tau=0.08, bright=10000)


def r_cloth(rng, p):
    """fabric moved: rustle (a sleeve, a coat), swish (a quick move), flap (a flag, a cape, a scarf)"""
    act, dur = _f(p, "action", "rustle"), _f(p, "dur", None)
    if act == "swish":
        d = dur or 0.4
        t = tt(d)
        y = moving_band(rng.standard_normal(len(t)), 900 + 1800 * np.sin(np.pi * np.clip(t / d, 0, 1)), q=1.0) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
        return space(rng, lp(norm(y), 6000), wet=0.1, dur=0.3, tau=0.1, bright=6000)
    if act == "flap":
        d = dur or 1.0
        t = tt(d)
        flap = (0.5 + 0.5 * np.sin(TAU * rng.uniform(6, 11) * t + rng.uniform(0, 6))) ** 4
        snaps = np.zeros(len(t))
        for k in range(int(d * 4)):
            put(snaps, struck(rng, "soft", 0.2) * 0.4, rng.uniform(0, d))
        y = lp(moving_band(rng.standard_normal(len(t)), 700 + 900 * flap, q=1.0), 5000) * (0.3 + 0.7 * flap) + snaps
        return space(rng, norm(y) * hann_env(t, d) ** 0.3, wet=0.1, dur=0.3, tau=0.1, bright=5000)
    d = dur or 0.7
    t = tt(d)
    y = lp(moving_band(rng.standard_normal(len(t)), 1000 + 1400 * np.abs(np.sin(TAU * rng.uniform(1.5, 3) * t)), q=1.2), 6000)
    y = y * (0.4 + 0.6 * np.abs(np.sin(TAU * rng.uniform(2, 4) * t + rng.uniform(0, 3)))) + 0.15 * norm(grains(rng, d, 120, lo=800, hi=4000))[: len(t)]
    return space(rng, norm(y) * hann_env(t, d) ** 0.5, wet=0.08, dur=0.3, tau=0.1, bright=6000)


# ── air ─────────────────────────────────────────────────────────────────────────────────────────────────────────────


def r_whoosh(rng, p):
    """air moved by a thing passing: soft, big, quick (a swish), up, down (a dive), past (left to right)"""
    kind, d = _f(p, "size", "soft"), _f(p, "dur", None)
    d = d or {"soft": 0.6, "big": 1.1, "quick": 0.3, "up": 0.5, "down": 0.7, "past": 0.9, "long": 1.6}.get(kind, 0.6)
    t = tt(d)
    pk = {"up": 0.75, "down": 0.35, "quick": 0.5}.get(kind, 0.55)
    shape = np.where(t / d < pk, (t / (d * pk)) ** 2, np.clip((1 - t / d) / (1 - pk), 0, 1) ** 1.4)
    lo, hi = {"big": (180, 2200), "soft": (300, 2800), "quick": (600, 5000), "up": (400, 5200), "down": (1800, 220), "past": (350, 3200), "long": (250, 2600)}.get(kind, (300, 2800))
    fc = lo + (hi - lo) * shape if kind != "down" else lo + (hi - lo) * (t / d)
    y = moving_band(rng.standard_normal(len(t)), fc, q=0.9 if kind != "quick" else 1.3) * shape
    if kind == "big":
        y = y + 0.4 * lp(rng.standard_normal(len(t)), 300) * shape
    if kind == "past":
        st = K.pan(norm(y), np.linspace(-0.8, 0.8, len(t)))
        return st * 0.9
    return space(rng, norm(y), wet=0.12, dur=0.5, tau=0.15, bright=8000, width=0.8)


def r_puff(rng, p):
    """a short breath of air: a candle blown out, a puff of smoke, a felt pad"""
    t = tt(0.35)
    y = lp(rng.standard_normal(len(t)), 1800) * env(t, 0.02, 0.07)
    return space(rng, norm(y), wet=0.1, dur=0.3, tau=0.1, bright=4000)


# ── appear, pop, click, tick ──────────────────────────────────────────────────────────────────────────────────────


def r_pop(rng, p):
    """something appears: soft (a round blip), bubble (a water pop), plop (falls in), cork (a lid off), boing (a cartoon spring)"""
    kind = _f(p, "kind", "soft")
    if kind == "bubble":
        y = np.zeros(int(0.2 * SR))
        put(y, bubble(rng, rng.uniform(700, 1200), 0.05), 0)
        put(y, 0.3 * norm(transient(rng, 0.003, 0.0006, 2000, 9000)), 0)
        return space(rng, norm(y), wet=0.1, dur=0.2, tau=0.08, bright=9000)
    if kind == "plop":
        y = chirp_tone(rng.uniform(700, 900), 220, 0.18, 0.04) * env(tt(0.18), 0.002, 0.05)
        return space(rng, norm(y), wet=0.12, dur=0.3, tau=0.1, bright=6000)
    if kind == "cork":
        t = tt(0.25)
        y = norm(safe_bp(rng.standard_normal(len(t)) * np.exp(-t / 0.004), 400, 3000)) + 0.6 * np.sin(TAU * rng.uniform(380, 480) * t) * np.exp(-t / 0.03)
        return space(rng, norm(y), wet=0.12, dur=0.3, tau=0.1, bright=7000)
    if kind == "boing":
        t = tt(0.55)
        f = 180 + 140 * np.exp(-t / 0.2) * (1 + 0.25 * np.sin(TAU * 22 * t))
        y = np.sin(TAU * np.cumsum(f) / SR) * env(t, 0.003, 0.2)
        return space(rng, norm(y), wet=0.1, dur=0.3, tau=0.1, bright=5000)
    t = tt(0.25)
    f = 360 + 600 * (1 - np.exp(-t / 0.018))
    y = np.sin(TAU * np.cumsum(f) / SR) * env(t, 0.003, 0.05)
    y[: int(0.004 * SR)] += 0.4 * norm(transient(rng, 0.004, 0.001, 2000, 8000))
    return space(rng, norm(y), wet=0.12, dur=0.3, tau=0.1, bright=8000)


def r_click(rng, p):
    """a press: button (a key, a mouse), switch (a light switch, a toggle), shutter (a camera), pen (a click pen), latch, lock (a key turns)"""
    kind = _f(p, "kind", "button")
    y = np.zeros(int(0.6 * SR))
    if kind == "switch":
        put(y, struck(rng, "plastic", 0.4, f_scale=0.8), 0)
        put(y, 0.5 * norm(transient(rng, 0.006, 0.0008, 2500, 10000)), 0.0)
    elif kind == "shutter":
        put(y, struck(rng, "metal", 0.05, f_scale=2.5) * 0.7, 0)
        whirr = safe_bp(nz(rng, 0.06), 1500, 6000) * np.sin(np.pi * np.linspace(0, 1, int(0.06 * SR)))
        put(y, 0.25 * norm(whirr), 0.01)
        put(y, struck(rng, "metal", 0.08, f_scale=2.0), 0.075)
    elif kind == "pen":
        put(y, struck(rng, "plastic", 0.1, f_scale=2.2), 0)
        put(y, 0.6 * struck(rng, "metal", 0.05, f_scale=3.0), 0.03)
    elif kind == "latch":
        put(y, struck(rng, "metal", 0.25, f_scale=1.2), 0)
        put(y, 0.7 * struck(rng, "metal", 0.35, f_scale=0.9), rng.uniform(0.06, 0.1))
    elif kind == "lock":
        for k, at in enumerate([0, 0.08, 0.16]):
            put(y, struck(rng, "metal", 0.15 + 0.15 * k, f_scale=1.6 - 0.2 * k) * (0.6 + 0.2 * k), at + rng.uniform(-0.01, 0.01))
        put(y, 0.6 * struck(rng, "stone", 0.4), 0.2)
    else:
        put(y, struck(rng, "plastic", 0.15, f_scale=1.6), 0)
        put(y, 0.6 * struck(rng, "plastic", 0.1, f_scale=2.0), rng.uniform(0.03, 0.05))
    return space(rng, norm(y), wet=0.08, dur=0.3, tau=0.08, bright=10000)


def r_tick(rng, p):
    """one tick: clock (a wall clock's tick), tock (its lower beat), watch (a small high one), wood (a woodblock), ui (a soft interface tick)"""
    kind = _f(p, "kind", "clock")
    t = tt(0.25)
    if kind == "watch":
        y = modes(t, [(rng.uniform(4200, 5200), 1, 0.006), (rng.uniform(7000, 8200), 0.5, 0.004)], rng) * np.minimum(1, t / 0.0003)
        return space(rng, norm(y), wet=0.06, dur=0.2, tau=0.06, bright=12000)
    if kind in ("clock", "tock"):
        f = rng.uniform(1700, 2100) * (0.72 if kind == "tock" else 1.0)
        y = modes(t, [(f, 1, 0.012), (f * 1.62, 0.5, 0.008), (f * 2.9, 0.25, 0.005)], rng) * np.minimum(1, t / 0.0004)
        y = norm(y) + 0.3 * norm(np.sin(TAU * rng.uniform(180, 240) * t) * np.exp(-t / 0.03))  # the case's body
        return space(rng, norm(y), wet=0.15, dur=0.4, tau=0.15, bright=9000)
    if kind == "wood":
        return r_tap(rng, {"material": "wood"})
    y = np.sin(TAU * rng.uniform(1800, 2400) * t) * env(t, 0.0005, 0.008)
    return space(rng, norm(y), wet=0.08, dur=0.2, tau=0.06, bright=10000)


def r_ticking(rng, p):
    """a clock ticking (or a ratchet, a counter, gears turning): a run of ticks at a rate, speeding up when it races"""
    dur, rate, kind = _f(p, "dur", 2.0), _f(p, "rate", 2.0), _f(p, "kind", "clock")
    y = np.zeros(int((dur + 0.4) * SR))
    k, at = 0, 0.0
    while at < dur:
        sub = "tock" if (kind == "clock" and k % 2) else ("watch" if kind == "ratchet" else kind)
        x = r_tick(rng, {"kind": sub})
        put(y, norm(x[:, 0] if x.ndim == 2 else x) * (0.7 + 0.3 * rng.random()), at)
        r = rate * (1 + (_f(p, "accel", 0.0) * at / dur))
        at += 1 / max(r, 0.5) * rng.uniform(0.97, 1.03)
        k += 1
    return space(rng, norm(y), wet=0.12, dur=0.4, tau=0.15, bright=9000)


# ── bells, chimes, glass ──────────────────────────────────────────────────────────────────────────────────────────


def r_bell(rng, p):
    """a bell by its kind: ding (a desk bell, done), ting (a tiny bell, a spoon on glass), chime (a two-note bing-bong), shop (a door's
    little bells), gong, toll (a big bell rings out), clock (a clock strikes, three notes down)"""
    kind = _f(p, "kind", "ding")
    f = _f(p, "f", None)
    if kind == "ting":
        t = tt(1.2)
        y = K.fm_bell(f or rng.uniform(2800, 3600), t, 0.35, 0.7, 2.76)
        return space(rng, y, wet=0.25, dur=0.9, tau=0.3, bright=12000)
    if kind == "chime":
        t = tt(1.8)
        y = np.zeros(len(t))
        a = f or rng.choice([659.3, 698.5, 784.0])
        put(y, K.fm_bell(a, tt(1.4), 0.7, 0.8, 2.0), 0)
        put(y, 0.9 * K.fm_bell(a * 0.794, tt(1.4), 0.8, 0.8, 2.0), 0.32)
        return space(rng, y, wet=0.3, dur=1.2, tau=0.45, bright=10000)
    if kind == "shop":
        y = np.zeros(int(1.6 * SR))
        for _ in range(9):
            put(y, K.fm_bell(rng.uniform(2200, 3800), tt(0.9), 0.25, 0.9, 2.9) * rng.uniform(0.3, 1), rng.uniform(0, 0.45))
        return space(rng, norm(y), wet=0.25, dur=0.9, tau=0.3, bright=12000)
    if kind == "gong":
        t = tt(4.0)
        f0 = f or rng.uniform(90, 140)
        y = modes(t, [(f0, 1, 2.2), (f0 * 1.47, 0.7, 1.6), (f0 * 2.09, 0.5, 1.2), (f0 * 2.56, 0.4, 0.9), (f0 * 3.37, 0.3, 0.6)], rng)
        y = y * (1 + 0.15 * np.sin(TAU * 3 * t)) * np.minimum(1, t / 0.01)
        y = norm(y) + 0.3 * norm(safe_bp(nz(rng, 4.0) * np.exp(-tt(4.0) / 0.05), 300, 3000))
        return space(rng, norm(y), wet=0.35, dur=2.0, tau=0.9, bright=5000)
    if kind == "toll":
        t = tt(4.0)
        f0 = f or rng.uniform(220, 300)
        y = modes(t, [(f0 * 0.5, 0.6, 2.6), (f0, 1, 2.0), (f0 * 1.19, 0.6, 1.4), (f0 * 1.5, 0.5, 1.2), (f0 * 2.0, 0.6, 0.9), (f0 * 2.5, 0.3, 0.6)], rng)
        return space(rng, norm(y * np.minimum(1, t / 0.003)), wet=0.35, dur=2.0, tau=1.0, bright=6000)
    if kind == "clock":
        y = np.zeros(int(3.2 * SR))
        base = f or rng.choice([523.3, 587.3])
        for k, r in enumerate([1.0, 0.891, 0.749]):
            put(y, K.fm_bell(base * r, tt(1.8), 0.9, 0.7, 2.0) * (1 - 0.1 * k), k * 0.45)
        return space(rng, norm(y), wet=0.35, dur=1.4, tau=0.5, bright=8000)
    t = tt(1.5)
    f0 = f or rng.uniform(1400, 1800)
    y = K.fm_bell(f0, t, 0.6, 0.9, 2.0) + 0.35 * K.fm_bell(f0 * 1.5, t, 0.4, 0.6, 2.0)
    return space(rng, norm(y), wet=0.28, dur=1.0, tau=0.35, bright=11000)


def r_glass_ring(rng, p):
    """a wet finger round a glass's rim: one pure tone that swells and fades"""
    dur = _f(p, "dur", 2.0)
    t = tt(dur)
    f = rng.uniform(800, 1300) * (1 + 0.003 * np.sin(TAU * 4 * t))
    y = (np.sin(TAU * np.cumsum(f) / SR) + 0.2 * np.sin(2 * TAU * np.cumsum(f) / SR)) * hann_env(t, dur) ** 0.6
    return space(rng, norm(y), wet=0.3, dur=1.0, tau=0.4, bright=10000)


# ── water, fire, weather ─────────────────────────────────────────────────────────────────────────────────────────


def r_water(rng, p):
    """water by its action: drop (one plink), drip (drops falling), splash, pour (a stream into a cup), bubbles, trickle"""
    act, dur = _f(p, "action", "drop"), _f(p, "dur", None)
    if act == "drop":
        y = np.zeros(int(0.35 * SR))
        put(y, bubble(rng, rng.uniform(900, 1600), 0.07), 0.003)
        put(y, 0.25 * norm(transient(rng, 0.004, 0.0008, 1500, 7000)), 0)
        return space(rng, norm(y), wet=0.25, dur=0.6, tau=0.25, bright=8000)
    if act == "drip":
        d = dur or 1.5
        y = np.zeros(int((d + 0.4) * SR))
        at = 0.0
        while at < d:
            put(y, bubble(rng, rng.uniform(900, 1700), 0.06) * rng.uniform(0.5, 1), at)
            at += rng.uniform(0.35, 0.7)
        return space(rng, norm(y), wet=0.3, dur=0.7, tau=0.3, bright=8000)
    if act == "splash":
        t = tt(0.9)
        body = lp(rng.standard_normal(len(t)), 3500) * env(t, 0.004, 0.09)
        y = norm(body) + 0.3 * norm(safe_bp(nz(rng, 0.9), 2000, 9000) * env(t, 0.002, 0.05))
        for _ in range(30):
            put(y, bubble(rng, rng.uniform(500, 2200), 0.05) * rng.uniform(0.1, 0.5), rng.exponential(0.12))
        return space(rng, norm(y), wet=0.18, dur=0.6, tau=0.2, bright=8000)
    if act in ("pour", "trickle"):
        d = dur or 2.0
        t = tt(d)
        stream = safe_bp(rng.standard_normal(len(t)), 300, 3500 if act == "pour" else 6000) * (0.7 + 0.3 * np.sin(TAU * rng.uniform(3, 7) * t) ** 2)
        y = norm(stream) * (0.5 if act == "pour" else 0.25)
        # a cup filling: the bubbles rise in pitch as the air above shortens
        for _ in range(int((60 if act == "pour" else 25) * d)):
            at = rng.uniform(0, d)
            put(y, bubble(rng, rng.uniform(400, 900) * (1 + 0.8 * at / d), 0.04) * rng.uniform(0.15, 0.6), at)
        y = y * np.minimum(1, t / 0.08) * np.clip((d - t) / 0.2, 0, 1)
        return space(rng, norm(y), wet=0.12, dur=0.4, tau=0.15, bright=8000)
    d = dur or 1.2
    y = np.zeros(int((d + 0.2) * SR))
    for _ in range(int(30 * d)):
        put(y, bubble(rng, rng.uniform(300, 1300), 0.05) * rng.uniform(0.2, 1), rng.uniform(0, d))
    return space(rng, norm(y), wet=0.15, dur=0.4, tau=0.15, bright=8000)


def r_fire(rng, p):
    """fire by its kind: crackle (a fire, a candle burning), strike (a match struck and lit), snuff (put out), sizzle (a wick, a pan)"""
    kind, dur = _f(p, "kind", "crackle"), _f(p, "dur", None)
    if kind == "strike":
        d = 1.3
        t = tt(d)
        y = np.zeros(len(t))
        put(y, norm(safe_bp(nz(rng, 0.14), 1500, 9000) * (rng.random(len(tt(0.14))) ** 2)) * 0.8, 0)
        flare = lp(rng.standard_normal(len(t)), 2200) * env(t, 0.03, 0.25)
        put(y, 0.9 * norm(flare), 0.12)
        put(y, 0.4 * norm(grains(rng, 0.9, 25, lo=1500, hi=8000)), 0.3)
        return space(rng, norm(y), wet=0.1, dur=0.4, tau=0.12, bright=7000)
    if kind == "snuff":
        t = tt(0.8)
        y = norm(lp(rng.standard_normal(len(t)), 1500) * env(t, 0.02, 0.08)) + 0.25 * norm(hp(rng.standard_normal(len(t)), 4000) * env(t, 0.05, 0.3))
        return space(rng, norm(y), wet=0.1, dur=0.4, tau=0.12, bright=6000)
    if kind == "sizzle":
        d = dur or 1.2
        t = tt(d)
        y = hp(rng.standard_normal(len(t)), 3500) * (0.5 + 0.5 * rng.random(len(t)) ** 3) * hann_env(t, d) ** 0.4
        return space(rng, norm(y), wet=0.08, dur=0.3, tau=0.1, bright=12000)
    d = dur or 2.0
    t = tt(d)
    roar = lp(rng.standard_normal(len(t)), 500) * (0.6 + 0.4 * np.sin(TAU * 0.7 * t + rng.uniform(0, 6)))
    y = 0.35 * norm(roar) + norm(grains(rng, d, 18, lo=1200, hi=9000, size=(0.001, 0.006)))[: len(t)]
    return space(rng, norm(y) * np.minimum(1, t / 0.2) * np.clip((d - t) / 0.3, 0, 1), wet=0.12, dur=0.4, tau=0.15, bright=8000)


def r_wind(rng, p):
    """wind by its kind: gust (a gust that swells and passes), steady (a breeze that lasts), howl (a strong wind whistling)"""
    kind, dur = _f(p, "kind", "gust"), _f(p, "dur", None)
    d = dur or (1.6 if kind == "gust" else 4.0)
    t = tt(d)
    swell = hann_env(t, d) ** (0.8 if kind == "gust" else 0.15)
    slow = signal.sosfilt(K.sos("lowpass", 1.5), rng.standard_normal(len(t)))
    slow = 0.6 + 0.4 * slow / (np.max(np.abs(slow)) + 1e-9)
    fc = (350 if kind != "howl" else 700) + 500 * swell * slow
    y = moving_band(rng.standard_normal(len(t)), fc, q=1.2 if kind != "howl" else 6) * swell * slow
    y = norm(y) + 0.3 * norm(lp(rng.standard_normal(len(t)), 250)) * swell
    return space(rng, norm(y), wet=0.2, dur=0.6, tau=0.25, bright=4000, width=1.0)


def r_rain(rng, p):
    """rain: patter (a light shower: drops on a roof or leaves), steady, heavy (a downpour), thunder (a far roll)"""
    kind, dur = _f(p, "kind", "patter"), _f(p, "dur", 3.0)
    t = tt(dur)
    if kind == "thunder":
        d = max(dur, 3.0)
        t = tt(d)
        y = lp(rng.standard_normal(len(t)), 180) * (env(t, 0.08, 0.9) * (0.7 + 0.3 * np.sin(TAU * 1.3 * t) ** 2))
        put(y, 0.4 * norm(lp(nz(rng, 0.4), 1200) * env(tt(0.4), 0.005, 0.08)), 0.05)
        return space(rng, norm(y), wet=0.4, dur=1.5, tau=0.8, bright=2000)
    dens = {"patter": 60, "steady": 160, "heavy": 420}.get(kind, 120)
    y = 0.5 * norm(hp(rng.standard_normal(len(t)), 2500)) * (0.2 + 0.4 * dens / 420)
    drops = np.zeros(len(t))
    for _ in range(int(dens * dur)):
        put(drops, K.grain(rng, 1200, 9000, rng.uniform(0.0008, 0.002)) * rng.uniform(0.1, 1), rng.uniform(0, dur))
    y = (y + 0.7 * norm(drops)) * np.minimum(1, t / 0.4) * np.clip((dur - t) / 0.4, 0, 1)
    return space(rng, norm(y), wet=0.2, dur=0.6, tau=0.25, bright=9000)


# ── steps ────────────────────────────────────────────────────────────────────────────────────────────────────────
SURF = {
    # the heel's strike, the ground's texture (grain density, band), its weight
    "wood": dict(mat="wood", tex=0, band=(800, 4000), creak=0.25),
    "concrete": dict(mat="stone", tex=140, band=(2000, 9000), creak=0),
    "stone": dict(mat="stone", tex=120, band=(2000, 9000), creak=0),
    "grass": dict(mat="soft", tex=900, band=(1500, 7000), creak=0),
    "gravel": dict(mat="stone", tex=1800, band=(1200, 7000), creak=0),
    "sand": dict(mat="soft", tex=600, band=(2500, 9000), creak=0),
    "snow": dict(mat="soft", tex=1500, band=(900, 5000), creak=0),
    "carpet": dict(mat="soft", tex=60, band=(600, 2500), creak=0),
    "metal": dict(mat="metal", tex=0, band=(2000, 8000), creak=0),
    "wet": dict(mat="soft", tex=0, band=(800, 4000), creak=0),
}


def one_step(rng, surface, weight=0.5):
    s = SURF.get(surface, SURF["wood"])
    y = np.zeros(int(0.45 * SR))
    heel = struck(rng, s["mat"], 0.3 + 0.4 * weight, f_scale=rng.uniform(0.85, 1.1) * (0.8 if s["mat"] == "wood" else 1.0))
    put(y, heel * (0.9 if s["mat"] != "metal" else 0.5), 0)
    put(y, 0.6 * heel * rng.uniform(0.5, 0.8), rng.uniform(0.05, 0.09))  # the toe after the heel
    if s["tex"]:
        g = grains(rng, 0.18, s["tex"], lo=s["band"][0], hi=s["band"][1], amp=(0.1, 0.7), shape=lambda a: np.exp(-a / 0.06))
        put(y, 0.6 * norm(g), 0.005)
    if surface == "wet":
        for _ in range(6):
            put(y, bubble(rng, rng.uniform(400, 1200), 0.04) * 0.3, rng.uniform(0.0, 0.1))
        put(y, 0.4 * norm(lp(nz(rng, 0.15), 3000) * env(tt(0.15), 0.003, 0.03)), 0.01)
    if s["creak"] and rng.random() < s["creak"]:
        put(y, 0.25 * norm(stick_slip(rng, 0.2, rate=(40, 80), center=(400, 800), q=8)), 0.05)
    if surface == "carpet":
        y = lp(y, 1800)
    return norm(y)


def r_steps(rng, p):
    """footsteps on a surface: one step, or a run of them (a walk, a run: n steps, faster for a run)"""
    surface, n, pace = _f(p, "surface", "wood"), int(_f(p, "n", 1)), _f(p, "pace", 0.5)
    weight = _f(p, "weight", 0.5)
    y = np.zeros(int((n * pace + 0.6) * SR))
    for k in range(n):
        put(y, one_step(rng, surface, weight) * rng.uniform(0.75, 1.0) * (1 - 0.3 * k / max(1, n) * _f(p, "fade", 0)), k * pace * rng.uniform(0.94, 1.06))
    return space(rng, norm(y), wet=0.14 if surface in ("wood", "concrete", "stone", "metal") else 0.06, dur=0.5, tau=0.15, bright=7000)


# ── doors, drawers, lids ──────────────────────────────────────────────────────────────────────────────────────────


def r_door(rng, p):
    """a door by its action: open (the handle and a short creak), close (the latch and a soft thud), slam, creak (a slow old hinge),
    drawer (out on its runners), lid (a box's lid), metal (a heavy metal door)"""
    act, mat = _f(p, "action", "open"), _f(p, "material", "wood")
    y = np.zeros(int(2.0 * SR))
    if act == "open":
        put(y, norm(r_click(rng, {"kind": "latch"})[:, 0]) * 0.6, 0)
        put(y, 0.6 * norm(stick_slip(rng, 0.6, rate=(30, 80), center=(450, 1000), q=8)) * hann_env(tt(0.6), 0.6) ** 0.5, 0.12)
        put(y, 0.3 * norm(lp(nz(rng, 0.6), 600)) * hann_env(tt(0.6), 0.6), 0.1)  # the air of the room
    elif act == "close":
        put(y, 0.3 * norm(lp(nz(rng, 0.25), 500)) * hann_env(tt(0.25), 0.25), 0)
        put(y, struck(rng, mat, 0.6), 0.22)
        put(y, 0.6 * norm(r_click(rng, {"kind": "latch"})[:, 0]), 0.23)
    elif act == "slam":
        put(y, struck(rng, mat, 1.0), 0)
        put(y, 0.4 * norm(r_rattle(rng, {"material": "metal", "dur": 0.25, "density": 40})[:, 0]), 0.02)
    elif act == "creak":
        return r_creak(rng, {"material": mat, "dur": _f(p, "dur", 1.4)})
    elif act == "drawer":
        put(y, norm(r_scrape(rng, {"material": "wood", "dur": 0.45})[:, 0]) * 0.7, 0)
        put(y, struck(rng, "wood", 0.3), 0.45)
        put(y, 0.3 * norm(r_rattle(rng, {"material": "metal", "dur": 0.2, "density": 30})[:, 0]), 0.46)
    elif act == "lid":
        put(y, struck(rng, mat if mat != "wood" else "cardboard", 0.3), 0)
        put(y, 0.4 * norm(lp(nz(rng, 0.2), 1200)) * hann_env(tt(0.2), 0.2), 0.03)
    elif act == "metal":
        put(y, struck(rng, "metal", 0.95, f_scale=0.5), 0)
        put(y, 0.5 * norm(r_rattle(rng, {"material": "metal", "dur": 0.3, "density": 50})[:, 0]), 0.03)
    return space(rng, norm(y), wet=0.25, dur=0.9, tau=0.3, bright=6000)


# ── machines, electronics ──────────────────────────────────────────────────────────────────────────────────────────


def r_motor(rng, p):
    """a motor by its kind: hum (an electric fan, a transformer), whirr (a small servo, a lens motor), engine (a small engine putters),
    spin_up, spin_down"""
    kind, dur = _f(p, "kind", "hum"), _f(p, "dur", 2.0)
    t = tt(dur)
    if kind == "whirr":
        f = rng.uniform(700, 1100) * (1 + 0.3 * np.sin(np.pi * np.clip(t / dur, 0, 1)))
        ph = np.cumsum(f) / SR
        y = sum(np.sin(TAU * k * ph) / k ** 1.3 for k in range(1, 7)) + 0.3 * safe_bp(rng.standard_normal(len(t)), 2000, 7000)
        return space(rng, norm(y) * np.minimum(1, t / 0.05) * np.clip((dur - t) / 0.08, 0, 1), wet=0.08, dur=0.3, tau=0.1, bright=9000)
    if kind == "engine":
        rate = rng.uniform(16, 26)
        ph = np.cumsum(np.full(len(t), rate) * (1 + 0.05 * np.sin(TAU * 0.4 * t))) / SR
        pulses = np.exp(-((ph % 1) / 0.12)) * (0.7 + 0.3 * rng.random(len(t)))
        y = lp(pulses * rng.standard_normal(len(t)) * 0.5 + pulses, 900)
        return space(rng, norm(y) * np.minimum(1, t / 0.2) * np.clip((dur - t) / 0.3, 0, 1), wet=0.15, dur=0.5, tau=0.2, bright=3000)
    spin = {"spin_up": np.clip(t / dur, 0, 1), "spin_down": np.clip(1 - t / dur, 0, 1)}.get(kind, np.ones(len(t)))
    f0 = rng.uniform(48, 62)
    ph = np.cumsum(f0 * (0.2 + 0.8 * spin)) / SR
    hum = sum(np.sin(TAU * k * ph) * (0.6 / k) for k in range(1, 9))
    blade = 0.5 + 0.5 * np.sin(TAU * ph * 0.25 * rng.integers(3, 6))
    air = lp(rng.standard_normal(len(t)), 900) * blade * spin
    y = 0.5 * norm(hum) * (0.3 + 0.7 * spin) + 0.6 * norm(air)
    return space(rng, norm(y) * np.minimum(1, t / 0.15) * np.clip((dur - t) / 0.2, 0, 1), wet=0.15, dur=0.5, tau=0.2, bright=4000)


def r_gears(rng, p):
    """gears turning, a clockwork wound up, a ratchet: metal teeth clicking with a soft whirr under them"""
    dur, kind = _f(p, "dur", 1.4), _f(p, "kind", "gears")
    rate = {"ratchet": 14, "wind": 9, "gears": 22}.get(kind, 18)
    y = np.zeros(int((dur + 0.3) * SR))
    at = 0.0
    while at < dur:
        put(y, struck(rng, "metal", 0.05, f_scale=rng.uniform(1.6, 2.3)) * rng.uniform(0.5, 1), at)
        at += 1 / rate * rng.uniform(0.9, 1.1)
    whirr = safe_bp(nz(rng, dur + 0.3), 800, 4000) * 0.15
    y = norm(y) + whirr * hann_env(tt(dur + 0.3), dur + 0.3)
    return space(rng, norm(y), wet=0.12, dur=0.4, tau=0.12, bright=9000)


def r_keys(rng, p):
    """typing: keyboard (plastic keys at a typist's pace), typewriter (heavy metal strikes, its bell and the carriage's ratchet at the end),
    printer (a dot-matrix head buzzing along its lines)"""
    kind, dur = _f(p, "kind", "keyboard"), _f(p, "dur", 1.5)
    y = np.zeros(int((dur + 1.2) * SR))
    if kind == "printer":
        at = 0.0
        while at < dur:
            line = rng.uniform(0.35, 0.6)
            t = tt(line)
            buzz = (np.sin(TAU * rng.uniform(900, 1300) * t) > 0.6) * safe_bp(rng.standard_normal(len(t)), 1500, 6000)
            put(y, norm(buzz) * 0.8, at)
            put(y, 0.4 * norm(stick_slip(rng, 0.12, rate=(150, 300), center=(800, 2000), q=4)), at + line)
            at += line + 0.15
        return space(rng, norm(y), wet=0.12, dur=0.4, tau=0.12, bright=8000)
    at = 0.0
    while at < dur:
        if kind == "typewriter":
            put(y, struck(rng, "metal", 0.4, f_scale=rng.uniform(0.6, 0.8)), at)
            put(y, 0.4 * struck(rng, "wood", 0.5), at)  # the platen under the type bar
            at += rng.uniform(0.09, 0.2)
        else:
            space_bar = rng.random() < 0.15
            put(y, struck(rng, "plastic", 0.4 if space_bar else 0.15, f_scale=0.8 if space_bar else rng.uniform(1.3, 1.8)) * rng.uniform(0.5, 1), at)
            at += rng.uniform(0.07, 0.16) + (0.2 if rng.random() < 0.08 else 0)
    if kind == "typewriter" and _f(p, "bell", True):
        put(y, 0.4 * norm(K.fm_bell(rng.uniform(2300, 2700), tt(0.8), 0.25, 0.7, 2.0)), dur)
        put(y, 0.6 * norm(r_gears(rng, {"kind": "ratchet", "dur": 0.4})[:, 0]), dur + 0.15)
    return space(rng, norm(y), wet=0.1, dur=0.3, tau=0.1, bright=9000)


def r_electronic(rng, p):
    """an electronic sound: blip_up, blip_down, beep (one or two), static (a burst of noise), glitch (a stutter), power_on, power_down,
    zap, hum (an electric buzz), scan (a sweeping tone), notify (a soft two-tone ping)"""
    kind, dur = _f(p, "kind", "blip_up"), _f(p, "dur", None)
    if kind in ("blip_up", "blip_down"):
        f0, f1 = (rng.uniform(700, 900), rng.uniform(1600, 2000)) if kind == "blip_up" else (rng.uniform(1500, 1800), rng.uniform(600, 800))
        t = tt(0.12)
        f = f0 + (f1 - f0) * np.clip(t / 0.08, 0, 1)
        y = np.sin(TAU * np.cumsum(f) / SR + 0.8 * np.sin(TAU * np.cumsum(f * 2) / SR)) * env(t, 0.002, 0.04)
        return space(rng, norm(y), wet=0.15, dur=0.4, tau=0.15, bright=10000)
    if kind == "beep":
        n = int(_f(p, "n", 1))
        y = np.zeros(int((0.25 * n + 0.2) * SR))
        f = rng.uniform(900, 1300)
        for k in range(n):
            t = tt(0.12)
            sq = np.sign(np.sin(TAU * f * t)) * env(t, 0.003, 0.08) * np.clip((0.12 - t) / 0.01, 0, 1)
            put(y, lp(sq, 4000), k * 0.22)
        return space(rng, norm(y), wet=0.1, dur=0.3, tau=0.1, bright=8000)
    if kind == "static":
        d = dur or 0.6
        t = tt(d)
        y = hp(rng.standard_normal(len(t)), 1500) * (0.4 + 0.6 * (rng.random(len(t)) > 0.97)) + 0.3 * norm(grains(rng, d, 300, lo=2000, hi=10000))[: len(t)]
        return space(rng, norm(y) * np.minimum(1, t / 0.01) * np.clip((d - t) / 0.05, 0, 1), wet=0.05, dur=0.2, tau=0.05, bright=12000)
    if kind == "glitch":
        y = np.zeros(int(0.6 * SR))
        chunk = safe_bp(nz(rng, 0.05), 300, 6000) + np.sign(np.sin(TAU * rng.uniform(200, 600) * tt(0.05)))
        for k in range(rng.integers(4, 8)):
            put(y, norm(chunk) * rng.uniform(0.4, 1), k * rng.uniform(0.04, 0.07))
        return space(rng, norm(y), wet=0.05, dur=0.2, tau=0.05, bright=12000)
    if kind in ("power_on", "power_down"):
        d = dur or 0.9
        t = tt(d)
        up = kind == "power_on"
        f = (80 + 900 * (t / d) ** 2) if up else (900 * (1 - t / d) ** 2 + 60)
        y = np.sin(TAU * np.cumsum(f) / SR) * (np.clip(t / d, 0, 1) if up else np.clip(1 - t / d, 0, 1)) ** 0.5
        y = y + 0.3 * np.sin(TAU * np.cumsum(f * 2.01) / SR) * 0.5
        if up:
            put(y, 0.4 * norm(r_electronic(rng, {"kind": "blip_up"})[:, 0]), d * 0.9)
        return space(rng, norm(y), wet=0.15, dur=0.5, tau=0.2, bright=8000)
    if kind == "zap":
        t = tt(0.4)
        f = 3000 * np.exp(-t / 0.06) + 200
        y = np.sin(TAU * np.cumsum(f) / SR + 4 * np.sin(TAU * 60 * t)) * env(t, 0.001, 0.1) + 0.4 * hp(rng.standard_normal(len(t)), 3000) * env(t, 0.001, 0.03)
        return space(rng, norm(y), wet=0.12, dur=0.3, tau=0.1, bright=12000)
    if kind == "hum":
        d = dur or 2.0
        t = tt(d)
        y = sum((0.8 / k) * np.sin(TAU * 100 * k * t + rng.uniform(0, 6)) for k in range(1, 12)) * (0.85 + 0.15 * np.sin(TAU * 0.5 * t))
        y = lp(np.tanh(1.5 * y), 3000)
        return space(rng, norm(y) * np.minimum(1, t / 0.1) * np.clip((d - t) / 0.2, 0, 1), wet=0.1, dur=0.3, tau=0.1, bright=5000)
    if kind == "scan":
        d = dur or 0.8
        t = tt(d)
        f = 600 + 1800 * (0.5 - 0.5 * np.cos(TAU * t / d))
        y = np.sin(TAU * np.cumsum(f) / SR) * hann_env(t, d) ** 0.6 * (0.7 + 0.3 * np.sin(TAU * 30 * t))
        return space(rng, norm(y), wet=0.2, dur=0.5, tau=0.2, bright=10000)
    t = tt(0.6)
    y = np.zeros(len(t))
    f = rng.uniform(1100, 1400)
    put(y, np.sin(TAU * f * tt(0.3)) * env(tt(0.3), 0.002, 0.08), 0)
    put(y, np.sin(TAU * f * 1.335 * tt(0.4)) * env(tt(0.4), 0.002, 0.12), 0.11)
    return space(rng, norm(y), wet=0.2, dur=0.5, tau=0.2, bright=10000)


def r_magic(rng, p):
    """a glow, a sparkle: sparkle (tiny glassy chimes), shimmer (a soft cluster that lasts), swell (a warm rising glow), twinkle (one star)"""
    kind, dur = _f(p, "kind", "sparkle"), _f(p, "dur", None)
    if kind == "twinkle":
        y = K.fm_bell(rng.uniform(3500, 4800), tt(0.9), 0.3, 0.6, 3.5)
        return space(rng, y, wet=0.35, dur=0.9, tau=0.35, bright=14000)
    if kind == "swell":
        d = dur or 1.4
        t = tt(d)
        y = sum(np.sin(TAU * f * t + rng.uniform(0, 6)) * (0.5 + 0.5 * np.sin(TAU * rng.uniform(4, 7) * t)) for f in rng.choice([523.3, 659.3, 784.0, 987.8, 1174.7], 4, replace=False))
        y = y * np.clip(t / d, 0, 1) ** 1.5 * np.clip((d - t) / 0.25, 0, 1)
        return space(rng, norm(y), wet=0.4, dur=1.2, tau=0.5, bright=10000)
    d = dur or (0.9 if kind == "sparkle" else 1.6)
    y = np.zeros(int((d + 1.0) * SR))
    n = 7 if kind == "sparkle" else int(14 * d)
    scale = [1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0, 2349.3, 2637.0]
    for k in range(n):
        at = (k / n) * d * 0.7 + rng.uniform(0, 0.05) if kind == "sparkle" else rng.uniform(0, d)
        put(y, K.fm_bell(rng.choice(scale) * rng.choice([1, 2]), tt(0.7), 0.25, 0.5, 3.5) * rng.uniform(0.3, 1), at)
    air = hp(nz(rng, d + 1.0), 6000) * hann_env(tt(d + 1.0), d) * 0.08
    return space(rng, norm(y) + air, wet=0.4, dur=1.0, tau=0.4, bright=14000)


# ── living things ────────────────────────────────────────────────────────────────────────────────────────────────


def r_animal(rng, p):
    """small living sounds: chirp (a small bird), birds (several), frog (a croak), crickets (a night's chirping), bee (a buzz that wanders)"""
    kind, dur = _f(p, "kind", "chirp"), _f(p, "dur", None)
    if kind in ("chirp", "birds"):
        d = dur or (0.4 if kind == "chirp" else 3.0)
        y = np.zeros(int((d + 0.4) * SR))
        n = 1 if kind == "chirp" else int(3 * d)
        for _ in range(n):
            at = 0.0 if kind == "chirp" else rng.uniform(0, d)
            for j in range(rng.integers(2, 5)):
                cd = rng.uniform(0.04, 0.09)
                t = tt(cd)
                f = rng.uniform(2800, 4200) + rng.uniform(-1500, 1500) * (t / cd)
                put(y, np.sin(TAU * np.cumsum(f) / SR) * np.sin(np.pi * t / cd) * rng.uniform(0.3, 1) * (0.25 if kind == "birds" and rng.random() < 0.5 else 1), at + j * cd * 1.3)
        return space(rng, norm(y), wet=0.3, dur=0.8, tau=0.3, bright=12000)
    if kind == "frog":
        t = tt(0.45)
        pulses = (np.sin(TAU * rng.uniform(16, 24) * t) > 0) * 1.0
        y = safe_bp(np.sign(np.sin(TAU * rng.uniform(110, 160) * t)) * pulses, 200, 1400) * hann_env(t, 0.45) ** 0.4
        return space(rng, norm(y), wet=0.2, dur=0.5, tau=0.2, bright=4000)
    if kind == "crickets":
        d = dur or 4.0
        t = tt(d)
        y = np.zeros(len(t))
        for _ in range(4):
            f, rate = rng.uniform(4000, 5200), rng.uniform(1.5, 3)
            gate = (np.sin(TAU * rate * t + rng.uniform(0, 6)) > 0.6) * (np.sin(TAU * 60 * t) > 0)
            y += np.sin(TAU * f * t) * gate * rng.uniform(0.3, 1)
        return space(rng, norm(lp(y, 8000)), wet=0.35, dur=1.0, tau=0.4, bright=9000)
    d = dur or 1.5
    t = tt(d)
    f = rng.uniform(200, 240) * (1 + 0.06 * np.sin(TAU * 1.3 * t))
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    y = lp(saw, 2500) * (0.6 + 0.4 * np.sin(TAU * 0.6 * t)) * hann_env(t, d) ** 0.3
    return K.pan(norm(y), np.sin(TAU * 0.3 * t) * 0.7) * 0.9


def r_body(rng, p):
    """the body: heartbeat (lub-dub), breath (in or out), clap (one hand clap), snap (fingers), gulp, sigh"""
    kind = _f(p, "kind", "heartbeat")
    if kind == "heartbeat":
        n = int(_f(p, "n", 2))
        y = np.zeros(int((n * 0.85 + 0.4) * SR))
        for k in range(n):
            put(y, sub_kick(tt(0.18), 90, 45, 0.02, 0.05), k * 0.85)
            put(y, 0.7 * sub_kick(tt(0.15), 80, 40, 0.02, 0.04), k * 0.85 + 0.24)
        return space(rng, norm(lp(y, 600)), wet=0.05, dur=0.3, tau=0.1, bright=1500)
    if kind in ("breath", "sigh"):
        d = 1.2 if kind == "breath" else 1.6
        t = tt(d)
        y = safe_bp(rng.standard_normal(len(t)), 500, 3500) * hann_env(t, d) ** (0.7 if kind == "breath" else 0.5)
        return space(rng, norm(y), wet=0.06, dur=0.3, tau=0.1, bright=5000)
    if kind == "clap":
        t = tt(0.25)
        y = sum(safe_bp(rng.standard_normal(len(t)) * np.exp(-np.maximum(0, t - d) / 0.008) * (t >= d), 800, 3500) for d in (0, 0.006, 0.013))
        return space(rng, norm(y), wet=0.2, dur=0.4, tau=0.15, bright=7000)
    if kind == "snap":
        t = tt(0.2)
        y = norm(transient(rng, 0.01, 0.0015, 1500, 8000))
        z = np.zeros(len(t))
        put(z, y, 0)
        put(z, 0.4 * modes(tt(0.05), [(rng.uniform(2200, 2800), 1, 0.006)], rng), 0)
        return space(rng, norm(z), wet=0.15, dur=0.3, tau=0.12, bright=10000)
    # gulp: a low wet bubble in the throat
    y = bubble(rng, rng.uniform(250, 380), 0.12)
    return space(rng, norm(y), wet=0.05, dur=0.2, tau=0.08, bright=3000)


def r_crowd(rng, p):
    """people: murmur (a room of voices, no words), cheer (an audience cheers), applause"""
    kind, dur = _f(p, "kind", "murmur"), _f(p, "dur", 3.0)
    t = tt(dur)
    if kind == "applause":
        y = np.zeros(len(t))
        for _ in range(int(140 * dur)):
            put(y, norm(r_body(rng, {"kind": "clap"})[:, 0])[: int(0.05 * SR)] * rng.uniform(0.1, 0.6), rng.uniform(0, dur))
        return space(rng, norm(y) * hann_env(t, dur) ** 0.3, wet=0.3, dur=0.8, tau=0.3, bright=7000)
    b = np.zeros(len(t))
    for _ in range(12):
        c = rng.uniform(300, 1300)
        b += bp(rng.standard_normal(len(t)), c * 0.75, c * 1.3) * (0.5 + 0.5 * np.sin(TAU * rng.uniform(2, 5) * t + rng.uniform(0, 6)) ** 2)
    if kind == "cheer":
        b = b * np.clip(t / 0.4, 0, 1) * (0.6 + 0.4 * hann_env(t, dur))
        b = b + 0.4 * norm(r_crowd(rng, {"kind": "applause", "dur": dur})[: len(t), 0])
    return space(rng, norm(b) * np.minimum(1, t / 0.3) * np.clip((dur - t) / 0.4, 0, 1), wet=0.4, dur=1.0, tau=0.5, bright=4000)


RECIPES = {
    "impact": r_impact, "knock": r_knock, "tap": r_tap, "clink": r_clink, "rattle": r_rattle, "jingle": r_jingle, "shatter": r_shatter,
    "roll": r_roll, "creak": r_creak, "scrape": r_scrape, "slide": r_slide, "slime": r_slime, "paper": r_paper, "writing": r_writing,
    "cloth": r_cloth, "whoosh": r_whoosh, "puff": r_puff, "pop": r_pop, "click": r_click, "tick": r_tick, "ticking": r_ticking,
    "bell": r_bell, "glass_ring": r_glass_ring, "water": r_water, "fire": r_fire, "wind": r_wind, "rain": r_rain, "steps": r_steps,
    "door": r_door, "motor": r_motor, "gears": r_gears, "keys": r_keys, "electronic": r_electronic, "magic": r_magic,
    "animal": r_animal, "body": r_body, "crowd": r_crowd,
}

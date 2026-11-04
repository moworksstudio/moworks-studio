#!/usr/bin/env python3
"""Synthesised, peak-aligned sound effects for the explainer pipeline.

    python sfx.py --cues project/cues.json --out-dir project/audio/

Every cue {"t", "kind", ["gain_db"], ["dur"], ["pan"], ["pitch"], ["align"]}
becomes one synthesised event whose transient / peak lands exactly on `t`
(risers END on `t`). Output: <out-dir>/sfx.wav, 48 kHz stereo, 24-bit.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
import zlib

import numpy as np
from scipy.signal import istft, stft

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audio_common as ac  # noqa: E402

REF_LUFS = -20.0  # every event's max momentary loudness before trims

# --------------------------------------------------------------------------- primitives


def _t(n, sr):
    return np.arange(n) / sr


def attack_ramp(n_att):
    n_att = max(1, int(n_att))
    return 0.5 - 0.5 * np.cos(np.pi * np.arange(n_att) / n_att)


def env_ad(n, sr, att, tau, start=0):
    """Raised-cosine attack of `att` s starting at sample `start`, then exp decay.
    Peak (1.0) at sample start + att*sr."""
    out = np.zeros(n)
    na = max(1, int(round(att * sr)))
    m = n - start
    if m <= 0:
        return out
    tt = np.arange(m) / sr
    e = np.exp(-np.maximum(tt - na / sr, 0.0) / tau)
    k = min(na, m)
    e[:k] *= attack_ramp(na)[:k]
    out[start:] = e
    return out


def osc(freq, sr, n=None, phase=0.0):
    f = np.asarray(freq, dtype=float)
    if f.ndim == 0:
        f = np.full(n, float(f))
    return np.sin(phase + 2 * np.pi * np.cumsum(f) / sr)


def band_noise(n, sr, rng, fc, bw_oct, nfft=1024):
    """Noise with a time-varying gaussian (log-frequency) band. fc, bw_oct: scalar
    or per-sample arrays. Constant power over time (shape it with an envelope)."""
    hop = nfft // 4
    x = rng.standard_normal(n + nfft)
    f, tf, Z = stft(x, fs=sr, nperseg=nfft, noverlap=nfft - hop)
    grid = np.arange(n)
    fc_a = np.broadcast_to(np.asarray(fc, dtype=float), (n,)) if np.ndim(fc) == 0 else np.asarray(fc)
    bw_a = np.broadcast_to(np.asarray(bw_oct, dtype=float), (n,)) if np.ndim(bw_oct) == 0 else np.asarray(bw_oct)
    pos = np.clip(tf * sr, 0, n - 1)
    cf = np.interp(pos, grid, fc_a)
    bw = np.interp(pos, grid, bw_a)
    lf = np.log2(np.maximum(f, 20.0))[:, None]
    G = np.exp(-0.5 * ((lf - np.log2(cf)[None, :]) / (bw[None, :] / 2.0)) ** 2)
    G /= np.sqrt((G ** 2).sum(axis=0, keepdims=True)) + 1e-12
    _, y = istft(Z * G, fs=sr, nperseg=nfft, noverlap=nfft - hop)
    y = y[:n]
    if len(y) < n:
        y = np.concatenate([y, np.zeros(n - len(y))])
    return y / (np.std(y) + 1e-12)


def stereo_band_noise(n, sr, rng, fc, bw_oct, corr=0.6):
    """(2, n) band noise with partial L/R correlation (subtle width)."""
    c = band_noise(n, sr, rng, fc, bw_oct)
    a = np.sqrt(corr)
    b = np.sqrt(1 - corr)
    L = a * c + b * band_noise(n, sr, rng, fc, bw_oct)
    R = a * c + b * band_noise(n, sr, rng, fc, bw_oct)
    return np.stack([L, R])


def flyby_env(n, sr, anchor, w_pre, w_post, p=1.0, fade_in=0.3, fade_out=0.35):
    """Pointy, smooth fly-by envelope (Lorentzian) with its maximum exactly at
    `anchor`; edges are faded to zero over `fade_in`/`fade_out` of each side."""
    tt = (np.arange(n) - anchor) / sr
    w = np.where(tt < 0, w_pre, w_post)
    e = 1.0 / (1.0 + (tt / w) ** 2) ** p
    fi = int(anchor * fade_in)
    if fi > 1:
        e[:fi] *= np.sin(np.linspace(0, np.pi / 2, fi)) ** 2
    fo = int((n - anchor) * fade_out)
    if fo > 1:
        e[n - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    return e


def pan_stereo(y2, pan):
    """Equal-power pan of a (2, n) signal; pan scalar or per-sample, -1..1."""
    th = (np.asarray(pan) + 1.0) * np.pi / 4.0
    gl = np.cos(th) / np.cos(np.pi / 4)
    gr = np.sin(th) / np.sin(np.pi / 4)
    return np.stack([y2[0] * gl, y2[1] * gr])


def mono2(y):
    return np.stack([y, y])


def soft_sat(x, drive=1.5):
    return np.tanh(drive * x) / np.tanh(drive)


def lp(x, f, sr, order=2):
    return ac.sos_filter(x, "low", f, sr, order)


def hp(x, f, sr, order=2):
    return ac.sos_filter(x, "high", f, sr, order)


def bp(x, lo, hi, sr, order=2):
    return ac.sos_filter(x, "band", (lo, hi), sr, order)


def partials_tone(n, sr, f, partials, rng, att=0.002, start=0, punch=None):
    """Additive struck tone. partials: [(ratio, amp, tau_s), ...].
    punch=(k, tau): extra fast 'strike' decay so the onset is the loudest point
    (envelope multiplied by (1-k) + k*exp(-t/tau))."""
    y = np.zeros(n)
    m = n - start
    if m <= 0:
        return y
    tt = np.arange(m) / sr
    acc = np.zeros(m)
    for r, a, tau in partials:
        fr = f * r
        if fr >= sr * 0.45:
            continue
        acc += a * np.sin(2 * np.pi * fr * tt + rng.uniform(0, 2 * np.pi)) * np.exp(-tt / tau)
    if punch is not None:
        k, tp = punch
        acc *= (1 - k) + k * np.exp(-tt / tp)
    na = max(1, int(att * sr))
    acc[:na] *= attack_ramp(na)[: min(na, m)]
    y[start:] = acc
    return y


def warm_tone(n, sr, f, rng, harmonics=8, tilt=1.7, detune_cents=4.0):
    """Soft harmonic tone (detuned pair), unit-ish amplitude, no envelope."""
    tt = _t(n, sr)
    y = np.zeros(n)
    for d in (-detune_cents, detune_cents):
        fd = f * 2 ** (d / 1200)
        for h in range(1, harmonics + 1):
            if fd * h > sr * 0.45:
                break
            y += np.sin(2 * np.pi * fd * h * tt + rng.uniform(0, 2 * np.pi)) / h ** tilt
    return y / 2.0


GLASS = [(1.0, 1.0, 0.45), (2.76, 0.38, 0.16), (5.40, 0.14, 0.06), (8.93, 0.05, 0.03)]
WARM_BELL = [(1.0, 1.0, 2.6), (2.0, 0.32, 1.3), (3.0, 0.10, 0.6), (4.07, 0.07, 0.25), (0.5, 0.18, 2.0)]


def pent_note(rng, lo_midi, hi_midi):
    """Random note from D-major pentatonic within [lo, hi]."""
    notes = [m for m in range(lo_midi, hi_midi + 1)
             if (m - ac.KEY_ROOT_MIDI) % 12 in ac.D_PENTATONIC]
    return notes[int(rng.integers(len(notes)))]


def place(dst, src, start):
    """Add (2, m) src into (2, n) dst at sample `start` (clipped to bounds)."""
    n = dst.shape[1]
    m = src.shape[1]
    s0 = max(0, start)
    s1 = min(n, start + m)
    if s1 > s0:
        dst[:, s0:s1] += src[:, s0 - start:s1 - start]


# --------------------------------------------------------------------------- effects
# Each generator returns (signal, anchor_sample). signal is (n,) mono or (2, n).


def g_pop(rng, sr, cue):
    n = int(0.28 * sr)
    tt = _t(n, sr)
    note = cue.get("pitch")
    midi = (ac.KEY_ROOT_MIDI + 7 + float(note)) if note is not None else pent_note(rng, 69, 78)
    fn = float(ac.mtof(midi))
    att = 0.0018
    f = fn * (0.55 + 0.45 * (1 - np.exp(-tt / 0.013)))  # bubbly upward chirp
    body = osc(f, sr) * env_ad(n, sr, att, 0.048)
    body += 0.16 * osc(2.0 * f, sr, phase=0.7) * env_ad(n, sr, att, 0.022)
    thup = 0.32 * osc(170 * np.exp(-tt / 0.06) + 90, sr) * env_ad(n, sr, att, 0.028)
    click = 0.10 * lp(rng.standard_normal(n), 3500, sr) * env_ad(n, sr, 0.0004, 0.0012)
    y = lp(body + thup + click, 7000, sr)
    return y, int(round(att * sr))


def g_pop_big(rng, sr, cue):
    pre = 0.14
    a = int(pre * sr)
    n = a + int(1.1 * sr)
    tt = np.maximum(_t(n, sr) - pre, 0.0)
    att = 0.0025
    st = a - int(att * sr)  # attack starts so its peak lands on `a`
    on = (np.arange(n) >= st).astype(float)
    thump = soft_sat(osc((44 + 120 * np.exp(-tt / 0.03)) * on, sr) * env_ad(n, sr, att, 0.24, st), 1.8)
    note = cue.get("pitch")
    midi = (ac.KEY_ROOT_MIDI - 5 + float(note)) if note is not None else pent_note(rng, 57, 64)
    fn = float(ac.mtof(midi))
    fb = fn * (0.55 + 0.45 * (1 - np.exp(-tt / 0.02)))
    body = 0.55 * osc(fb * on, sr) * env_ad(n, sr, att, 0.085, st)
    body += 0.14 * osc(2 * fb * on, sr, phase=1.1) * env_ad(n, sr, att, 0.04, st)
    trans = 0.16 * bp(rng.standard_normal(n), 900, 4500, sr) * env_ad(n, sr, 0.0006, 0.0025, st)
    air = 0.07 * bp(rng.standard_normal(n), 2000, 8000, sr) * env_ad(n, sr, 0.002, 0.05, st)
    # little airy pre-swell that "sucks in" to the slam
    u = np.clip(np.arange(n) / a, 0, 1)
    sw = (u ** 3) * (np.arange(n) <= a)
    tail = np.arange(n) - a
    sw = np.where(tail > 0, np.exp(-np.maximum(tail, 0) / (0.006 * sr)), sw)
    pre_sw = 0.10 * band_noise(n, sr, rng, 1400, 1.4) * sw
    y = lp(thump + body + trans + air + pre_sw, 9000, sr)
    return y, a


def tick_sound(rng, sr, n, base, start=0, amp=1.0, glass=0.08):
    modes = [(1.0, 1.0, 0.016), (2.57, 0.40, 0.008), (4.30, 0.16, 0.0045), (7.10, glass, 0.006)]
    y = partials_tone(n, sr, base, modes, rng, att=0.0004, start=start)
    m = n - start
    if m > 0:
        exc = lp(rng.standard_normal(m), 6000, sr) * np.exp(-np.arange(m) / (0.0008 * sr))
        y[start:] += 0.22 * exc
    return amp * y


def g_tick(rng, sr, cue):
    n = int(0.09 * sr)
    base = 1400.0 * 2 ** (float(cue.get("pitch", 0)) / 12) * (1 + rng.uniform(-0.03, 0.03))
    y = lp(tick_sound(rng, sr, n, base), 9000, sr)
    return y, int(round(0.0004 * sr))


def g_counter_roll(rng, sr, cue):
    dur = float(cue.get("dur", 1.0))
    r0, r1 = 7.0, 26.0  # ticks per second, accelerating
    acc = (r1 - r0) / (2 * dur)
    total_phase = r0 * dur + acc * dur * dur
    ks = np.arange(int(np.floor(total_phase)) + 1)
    times = (-r0 + np.sqrt(r0 * r0 + 4 * acc * ks)) / (2 * acc)
    times = times[times < dur - 0.6 / r1]
    tail = 0.25
    n = int((dur + tail) * sr)
    out = np.zeros((2, n))
    tick_n = int(0.09 * sr)
    att = int(round(0.0004 * sr))
    for i, tk in enumerate(times):
        u = tk / dur
        base = 1400.0 * 2 ** ((3.0 * u + float(cue.get("pitch", 0))) / 12) * (1 + rng.uniform(-0.025, 0.025))
        s = tick_sound(rng, sr, tick_n, base, amp=0.62 + 0.33 * u)
        p = 0.15 if i % 2 == 0 else -0.15
        place(out, pan_stereo(mono2(s), p), int(round(tk * sr)) - att)
    # final accent tick (brighter, with a small glassy ring)
    base = 1400.0 * 2 ** ((5.0 + float(cue.get("pitch", 0))) / 12)
    s = tick_sound(rng, sr, int(0.25 * sr), base, amp=1.1, glass=0.2)
    s += 0.22 * partials_tone(len(s), sr, base * 2, [(1.0, 1.0, 0.07)], rng, att=0.0006)
    place(out, mono2(s), int(round(dur * sr)) - att)
    out = np.stack([lp(out[0], 9000, sr), lp(out[1], 9000, sr)])
    align = cue.get("align", "start")
    anchor = int(round(dur * sr)) if align == "end" else int(round(times[0] * sr)) if len(times) else 0
    return out, anchor


def g_whoosh_pullback(rng, sr, cue):
    D = float(cue.get("dur", 1.2))
    pre, post = 0.62 * D, 0.38 * D + 0.25
    a = int(pre * sr)
    n = a + int(post * sr)
    e = flyby_env(n, sr, a, 0.26 * D, 0.17 * D)
    rise = np.arange(n) < a
    fc = np.where(rise, 350 * (2600 / 350) ** e, 750 * (2600 / 750) ** e)
    bw = 1.9 - 0.6 * e
    nz = stereo_band_noise(n, sr, rng, fc, bw, corr=0.55) * e
    air = 0.22 * stereo_band_noise(n, sr, rng, 7000, 1.0, corr=0.3) * e ** 2
    pan = 0.35 * np.tanh((np.arange(n) - a) / (0.2 * D * sr))
    y = pan_stereo(nz + air, pan)
    sub_e = flyby_env(n, sr, a, 0.36 * D, 0.26 * D, fade_in=0.5, fade_out=0.5)
    sub = 0.38 * osc(55.0, sr, n) * sub_e
    y = y + mono2(sub)
    return y, a


def g_whoosh_dive(rng, sr, cue):
    D = float(cue.get("dur", 1.1))
    pre, post = 0.55 * D, 0.45 * D + 0.3
    a = int(pre * sr)
    n = a + int(post * sr)
    e = flyby_env(n, sr, a, 0.22 * D, 0.2 * D)
    x = (np.arange(n) - a) / (0.18 * D * sr)
    sig = 1 / (1 + np.exp(-x))
    fc = 150 * (1300 / 150) ** (1 - sig)  # falling: ~1.3k -> ~450 at t -> 150
    nz = stereo_band_noise(n, sr, rng, fc, 1.5, corr=0.55) * e
    nz = np.stack([lp(nz[0], 3000, sr), lp(nz[1], 3000, sr)])
    pan = -0.3 * np.tanh((np.arange(n) - a) / (0.2 * D * sr))
    y = pan_stereo(nz, pan)
    sub_f = 38 + 50 / (1 + np.exp(x * 0.18 * D / 0.15))
    sub_e = flyby_env(n, sr, a, 0.3 * D, 0.32 * D, fade_in=0.5, fade_out=0.5)
    y = y + mono2(0.5 * osc(sub_f, sr) * sub_e)
    return y, a


def g_impact(rng, sr, cue):
    pre = 0.25
    a = int(pre * sr)
    tail = float(cue.get("dur", 2.2))
    n = a + int(tail * sr)
    s = tail / 2.2
    att = 0.003
    st = a - int(att * sr)
    tt = np.maximum(_t(n, sr) - pre, 0.0)
    on = (np.arange(n) >= st).astype(float)
    punch = 0.55 * env_ad(n, sr, att, 0.045, st) + 0.45 * env_ad(n, sr, att, 0.5 * s, st)
    fb = (34 + 60 * np.exp(-tt / 0.06)) * on
    boom = osc(fb, sr, phase=np.pi / 2) * punch * on
    boom += 0.2 * osc(2 * fb, sr, phase=np.pi / 2) * env_ad(n, sr, att, 0.25 * s, st) * on
    boom = soft_sat(boom, 1.4)
    thud = 0.4 * osc((70 + 50 * np.exp(-tt / 0.03)) * on, sr) * env_ad(n, sr, att, 0.08, st)
    body = 0.5 * lp(rng.standard_normal(n), 180, sr, 4) * env_ad(n, sr, att, 0.25 * s, st) * 3.0
    trans = 0.22 * lp(bp(rng.standard_normal(n), 800, 3500, sr), 2500, sr) * env_ad(n, sr, 0.0008, 0.004, st)
    u = np.clip(np.arange(n) / a, 0, 1)
    sw = np.where(np.arange(n) <= a, u ** 3, np.exp(-(np.arange(n) - a) / (0.01 * sr)))
    suck = 0.12 * band_noise(n, sr, rng, 600, 1.6) * sw
    y = lp(boom + thud + body + trans + suck, 6000, sr)
    return y, a


def g_reveal(rng, sr, cue):
    R = float(cue.get("dur", 2.0))  # riser length, ends on t
    a = int(R * sr)
    bloom = 3.4
    n = a + int(bloom * sr)
    idx = np.arange(n)
    u = np.clip(idx / a, 0, 1)
    cut = np.where(idx <= a, 1.0, np.exp(-(idx - a) / (0.008 * sr)))
    # rising airy noise
    fc = 700 * (7000 / 700) ** u
    rz = stereo_band_noise(n, sr, rng, fc, 1.2, corr=0.4) * (u ** 3) * cut
    hiss = 0.6 * stereo_band_noise(n, sr, rng, 9000, 0.9, corr=0.3) * (u ** 10) * cut
    # shimmering chord with accelerating tremolo
    tt = _t(n, sr)
    shim = np.zeros((2, n))
    for j, m in enumerate([74, 78, 81, 86, 88, 93]):
        f = float(ac.mtof(m))
        rate = 4.0 + 10.0 * u ** 1.5
        ph = 2 * np.pi * np.cumsum(rate) / sr + rng.uniform(0, 2 * np.pi)
        trem = 1 - 0.6 * (0.5 + 0.5 * np.sin(ph))
        for c, d in enumerate((-5.0, 5.0)):
            fd = f * 2 ** (d / 1200)
            shim[c] += np.sin(2 * np.pi * fd * tt + rng.uniform(0, 6.28)) * trem / (1 + 0.25 * j)
    shim *= (u ** 2.2) * cut * 0.22
    # bloom: warm chord, soft boom, bells, air
    b = idx - a
    on = (b >= 0)
    bt = np.maximum(b, 0) / sr
    chord_env = np.where(on, (0.55 * np.exp(-bt / 0.25) + 0.45 * np.exp(-bt / 1.8)), 0.0)
    chord_env *= np.where(on, np.minimum(1.0, bt / 0.012 + 1e-9) ** 0.5, 0.0)
    chord = np.zeros((2, n))
    for j, m in enumerate([50, 57, 62, 66, 69, 76]):
        wt = warm_tone(n, sr, float(ac.mtof(m)), rng, harmonics=6, tilt=1.9)
        p = (j / 5.0 - 0.5) * 0.6
        chord += pan_stereo(mono2(wt), p) * 0.28
    chord *= chord_env
    chord = np.stack([lp(chord[0], 3200, sr), lp(chord[1], 3200, sr)])
    boom = 0.55 * osc((38 + 18 * np.exp(-bt / 0.12)), sr) * np.where(on, np.exp(-bt / 0.6), 0.0) * \
        np.where(on, np.minimum(1.0, bt / 0.006), 0.0)
    bells = np.zeros(n)
    for m, amp in ((86, 0.22), (93, 0.12)):
        bells += amp * partials_tone(n, sr, float(ac.mtof(m)), GLASS, rng, att=0.002, start=a)
    air = 0.18 * stereo_band_noise(n, sr, rng, 5000, 1.5, corr=0.3) * \
        np.where(on, np.exp(-bt / 0.7) * np.minimum(1.0, bt / 0.01), 0.0)
    y = rz * 0.5 + hiss * 0.5 + shim + chord + mono2(boom + bells) + air
    return y, a


def g_light_hit(rng, sr, cue):
    pre = 0.3
    a = int(pre * sr)
    tail = float(cue.get("dur", 2.4))
    n = a + int(tail * sr)
    s = tail / 2.4
    idx = np.arange(n)
    att = 0.006
    st = a - int(att * sr)
    u = np.clip(idx / max(st, 1), 0, 1)
    swell = np.where(idx < st, u ** 3, 0.0)
    hit_env = env_ad(n, sr, att, 0.5 * s, st)
    air = stereo_band_noise(n, sr, rng, 6500, 1.6, corr=0.35)
    air = air * (0.55 * hit_env + 0.35 * swell)
    shim = np.zeros((2, n))
    for j, m in enumerate([86, 90, 93, 98, 100, 105]):
        f = float(ac.mtof(m))
        tau = rng.uniform(1.0, 1.8) * s
        rate = rng.uniform(6.0, 11.0)
        e = env_ad(n, sr, 0.008, tau, st)
        trem = 1 - 0.5 * (0.5 + 0.5 * np.sin(2 * np.pi * rate * _t(n, sr) + rng.uniform(0, 6.28)))
        tone = np.sin(2 * np.pi * f * _t(n, sr) + rng.uniform(0, 6.28)) * e * trem
        p = rng.uniform(-0.5, 0.5)
        shim += pan_stereo(mono2(tone), p) * (0.16 / (1 + 0.3 * j))
    warmth = 0.12 * osc(float(ac.mtof(62)), sr, n) * env_ad(n, sr, 0.01, 0.6 * s, st)
    y = air + shim + mono2(warmth)
    return y, a


def g_sparkle(rng, sr, cue):
    n = int(1.3 * sr)
    out = np.zeros((2, n))
    offs = [0.0, 0.055, 0.10, 0.165, 0.245]
    amps = [1.0, 0.42, 0.33, 0.26, 0.2]
    shift = float(cue.get("pitch", 0))
    notes = sorted({pent_note(rng, 86, 105) for _ in range(9)})
    up = rng.random() < 0.5
    seq = notes[: len(offs)] if up else notes[::-1][: len(offs)]
    while len(seq) < len(offs):
        seq.append(seq[-1])
    for o, amp, m in zip(offs, amps, seq):
        f = float(ac.mtof(m + shift))
        st = int(o * sr)
        parts = [(r, pa, tau * 0.7) for r, pa, tau in GLASS]
        tone = partials_tone(n, sr, f, parts, rng, att=0.001, start=st, punch=(0.4, 0.04)) * amp
        out += pan_stereo(mono2(tone), rng.uniform(-0.35, 0.35))
    out = np.stack([lp(out[0], 12000, sr), lp(out[1], 12000, sr)])
    return out, int(round(0.001 * sr))


def g_swish(rng, sr, cue):
    D = float(cue.get("dur", 0.4))
    pre, post = 0.55 * D, 0.45 * D + 0.08
    a = int(pre * sr)
    n = a + int(post * sr)
    e = flyby_env(n, sr, a, 0.17 * D, 0.13 * D)
    rise = np.arange(n) < a
    fc = np.where(rise, 900 * (3200 / 900) ** e, 1400 * (3200 / 1400) ** e)
    nz = stereo_band_noise(n, sr, rng, fc, 1.3, corr=0.55) * e
    air = 0.2 * stereo_band_noise(n, sr, rng, 7500, 1.0, corr=0.3) * e ** 2
    pan = 0.2 * np.tanh((np.arange(n) - a) / (0.15 * D * sr))
    return pan_stereo(nz + air, pan), a


def g_title(rng, sr, cue):
    pre = 0.6
    a = int(pre * sr)
    ring = float(cue.get("dur", 4.0))
    n = a + int(ring * sr)
    s = ring / 4.0
    idx = np.arange(n)
    u = np.clip(idx / a, 0, 1)
    # soft pad swelling into the strike, then blooming
    pad_env = np.where(idx <= a, 0.3 * u ** 2,
                       0.3 + 0.12 * (1 - np.exp(-(idx - a) / (0.15 * sr))))
    pad_env *= np.where(idx <= a, 1.0, np.exp(-(idx - a) / (2.2 * s * sr)))
    pad = np.zeros((2, n))
    for j, m in enumerate([50, 57, 64, 66, 69]):
        wt = warm_tone(n, sr, float(ac.mtof(m)), rng, harmonics=6, tilt=2.0, detune_cents=6.0)
        pad += pan_stereo(mono2(wt), (j / 4.0 - 0.5) * 0.7) * 0.22
    pad *= pad_env
    pad = np.stack([lp(pad[0], 2600, sr), lp(pad[1], 2600, sr)])
    # warm bell chord strike (humanised by <4 ms, no audible roll) on t
    bells = np.zeros((2, n))
    for j, (m, amp) in enumerate(((62, 0.55), (69, 0.45), (74, 0.42), (78, 0.30), (88, 0.16))):
        st = a + int((0, 3, 1, 4, 2)[j] * 0.001 * sr) - int(0.002 * sr)
        parts = [(r, pa, tau * s) for r, pa, tau in WARM_BELL]
        tone = partials_tone(n, sr, float(ac.mtof(m)), parts, rng, att=0.002, start=st,
                             punch=(0.5, 0.07)) * amp
        bells += pan_stereo(mono2(tone), (j / 4.0 - 0.5) * 0.5)
    low = 0.3 * osc(float(ac.mtof(38)), sr, n) * env_ad(n, sr, 0.01, 1.5 * s, a - int(0.01 * sr))
    y = pad + bells + mono2(low)
    return y, a


GENERATORS = {
    "pop": g_pop,
    "pop_big": g_pop_big,
    "tick": g_tick,
    "counter_roll": g_counter_roll,
    "whoosh_pullback": g_whoosh_pullback,
    "whoosh_dive": g_whoosh_dive,
    "impact": g_impact,
    "reveal": g_reveal,
    "light_hit": g_light_hit,
    "sparkle": g_sparkle,
    "swish": g_swish,
    "title": g_title,
}

# stereo width for mono-generated kinds (side/mid ratio of the decorrelated layer)
WIDTH = {"pop": 0.22, "pop_big": 0.2, "tick": 0.15, "impact": 0.18}
# reverb send per kind
SEND = {
    "pop": 0.12, "pop_big": 0.18, "tick": 0.06, "counter_roll": 0.08, "whoosh_pullback": 0.15,
    "whoosh_dive": 0.18, "impact": 0.30, "reveal": 0.35, "light_hit": 0.35, "sparkle": 0.38,
    "swish": 0.10, "title": 0.40,
}


def widen(y, rng, sr, width):
    """mono (n,) -> (2, n): mid + decorrelated, high-passed side."""
    h = ac.decorrelator(rng, sr)
    side = np.convolve(y, h)[: len(y)]
    side = hp(side, 250, sr) * width
    return np.stack([y + side, y - side])


# kinds whose anchor is a transient: snap it onto the measured envelope peak
TRANSIENT = {"pop", "pop_big", "tick", "counter_roll", "impact", "sparkle", "light_hit", "title"}


def refine_anchor(y, anchor, sr, before=0.003, after=0.012):
    """Move the anchor to the 1 ms-RMS envelope maximum near the designed one."""
    m = np.abs(y).max(axis=0)
    w = max(1, int(0.001 * sr))
    e = np.convolve(m * m, np.ones(w) / w, mode="same")
    a = max(0, anchor - int(before * sr))
    b = min(len(e), anchor + int(after * sr) + 1)
    return a + int(np.argmax(e[a:b])) if b > a else anchor


def render_event(cue, sr, seed, index):
    """Return (stereo (2, m) event, anchor sample) normalised to its loudness target."""
    kind = cue["kind"]
    rng = np.random.default_rng([seed, index, zlib.crc32(kind.encode())])
    y, anchor = GENERATORS[kind](rng, sr, cue)
    if y.ndim == 1:
        y = widen(y, rng, sr, WIDTH.get(kind, 0.2))
    if "pan" in cue:
        y = pan_stereo(y, float(np.clip(cue["pan"], -1, 1)))
    if kind in TRANSIENT:
        anchor = refine_anchor(y, anchor, sr)
    loud = ac.max_momentary(y.T, sr)
    target = REF_LUFS + ac.SFX_TRIM_LU.get(kind, 0.0) + float(cue.get("gain_db", 0.0))
    y = y * ac.db2lin(target - loud)
    return y, int(anchor)


def render(cfg, seed):
    sr, n = cfg["sr"], cfg["n"]
    dry = np.zeros((2, n))
    send = np.zeros((2, n))
    placed = []
    for i, cue in enumerate(cfg["cues"]):
        kind = cue.get("kind")
        if kind not in GENERATORS:
            print(f"  ! skipping unknown kind {kind!r} at t={cue.get('t')}")
            continue
        y, anchor = render_event(cue, sr, seed, i)
        start = int(round(float(cue["t"]) * sr)) - anchor
        if start < 0:
            print(f"  ! {kind} at {cue['t']}s starts {-start / sr:.2f}s before 0; its lead-in is clipped")
        place(dry, y, start)
        place(send, y * SEND.get(kind, 0.15), start)
        placed.append((float(cue["t"]), kind, start, y.shape[1]))
    ir = ac.make_ir(sr, seed + 7, length=2.6, t60=(2.2, 1.7, 1.1, 0.6), predelay=0.018)
    wet = ac.convolve_stereo(send.T, ir).T
    out = (dry + wet).T
    tp = ac.true_peak_db(out)
    if tp > -1.0:
        out *= ac.db2lin(-1.0 - tp)
    return out, placed


def main(argv=None):
    p = argparse.ArgumentParser(description="Synthesise peak-aligned SFX from cues.json -> sfx.wav")
    p.add_argument("--cues", help="path to cues.json (required unless --list)")
    p.add_argument("--out-dir", help="output directory (default: <cues dir>/audio)")
    p.add_argument("--seed", type=int, help="override seed (default: cues.json 'seed' or 1234)")
    p.add_argument("--list", action="store_true", help="print the supported kinds and exit")
    a = p.parse_args(argv)
    if a.list:
        print("\n".join(GENERATORS))
        return
    if not a.cues:
        p.error("--cues is required")
    t0 = time.time()
    cfg = ac.load_cues(a.cues)
    out_dir = a.out_dir or ac.default_out_dir(cfg)
    seed = a.seed if a.seed is not None else cfg["seed"]
    out, placed = render(cfg, seed)
    path = os.path.join(out_dir, "sfx.wav")
    ac.write_wav(path, out, cfg["sr"])
    print(f"sfx.py: {len(placed)} events -> {path}  ({cfg['duration']:.2f}s, "
          f"peak {ac.true_peak_db(out):.1f} dBTP, {time.time() - t0:.1f}s)")
    for t, kind, start, m in placed:
        print(f"  {t:7.3f}s  {kind:16s} span {start / cfg['sr']:.3f}-{(start + m) / cfg['sr']:.3f}s")


if __name__ == "__main__":
    main()

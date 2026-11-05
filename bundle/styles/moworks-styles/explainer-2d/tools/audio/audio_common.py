"""Shared helpers for the explainer audio tools (sfx.py, music.py, mix.py).

Pure numpy/scipy. Everything is deterministic given a seed.
"""
from __future__ import annotations

import json
import os

import numpy as np
import soundfile as sf
from scipy.ndimage import maximum_filter1d
from scipy.signal import butter, lfilter, oaconvolve, resample_poly, sosfilt

# ffmpeg: tools/*.mjs pass the one they found in FFMPEG; otherwise the one on PATH
FFMPEG = os.environ.get("FFMPEG") or "ffmpeg"

# ----------------------------------------------------------------------------- key
# Everything musical (music bed, title chord, chimes, pops) lives in D major so
# the effects never clash with the bed.
KEY_ROOT_MIDI = 62  # D4
D_PENTATONIC = [0, 2, 4, 7, 9]  # D E F# A B (semitones above D)

# Loudness trims per SFX kind, in LU, relative to the common event level.
# sfx.py normalises every event to REF + trim + gain_db; mix.py undoes trim +
# gain_db when it measures where the effects sit relative to the voice.
SFX_TRIM_LU = {
    "pop": -3.0,
    "pop_big": 0.0,
    "tick": -7.0,
    "counter_roll": -4.0,
    "whoosh_pullback": -1.0,
    "whoosh_dive": -1.0,
    "impact": 1.0,
    "reveal": 1.0,
    "light_hit": -1.0,
    "sparkle": -4.0,
    "swish": -3.0,
    "title": 0.0,
}


def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69.0) / 12.0)


def db2lin(db):
    return 10.0 ** (np.asarray(db, dtype=float) / 20.0)


def lin2db(x, floor=1e-12):
    return 20.0 * np.log10(np.maximum(np.abs(x), floor))


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3.0 - 2.0 * x)


# ----------------------------------------------------------------------------- io
def load_cues(path):
    """Read cues.json and resolve paths. Returns a dict with absolute paths."""
    path = os.path.abspath(path)
    with open(path) as f:
        data = json.load(f)
    base = os.path.dirname(path)
    sr = int(data.get("sr", 48000))
    duration = float(data["duration"])
    vo = data.get("vo")
    vo_abs = None
    if vo:
        vo_abs = vo if os.path.isabs(vo) else os.path.normpath(os.path.join(base, vo))
    title_t = data.get("title_t")
    cues = sorted(data.get("cues", []), key=lambda c: float(c.get("t", 0.0)))
    return {
        "path": path,
        "base": base,
        "sr": sr,
        "duration": duration,
        "n": int(round(duration * sr)),
        "vo": vo_abs,
        "title_t": None if title_t is None else float(title_t),
        "cues": cues,
        "seed": int(data.get("seed", 1234)),
        "raw": data,
    }


def default_out_dir(cfg):
    return os.path.join(cfg["base"], "audio")


def write_wav(path, x, sr):
    """x: (n, 2) or (n,) float. Written as 24-bit PCM."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    sf.write(path, np.clip(x, -1.0, 1.0), sr, subtype="PCM_24")


def read_audio(path, sr):
    """Read any soundfile-readable file to (n, 2) float64 at `sr`."""
    x, fsr = sf.read(path, dtype="float64", always_2d=True)
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    elif x.shape[1] > 2:
        x = x[:, :2]
    if fsr != sr:
        from math import gcd

        g = gcd(int(sr), int(fsr))
        x = resample_poly(x, sr // g, fsr // g, axis=0)
    return x


def fit_length(x, n):
    if len(x) >= n:
        return x[:n]
    pad = np.zeros((n - len(x),) + x.shape[1:])
    return np.concatenate([x, pad], axis=0)


# ----------------------------------------------------------------------------- loudness
def _k_filters(sr):
    from pyloudnorm.iirfilter import IIRfilter

    hs = IIRfilter(4.0, 1 / np.sqrt(2), 1500.0, sr, "high_shelf")
    hp = IIRfilter(0.0, 0.5, 38.0, sr, "high_pass")
    return [(hs.b, hs.a), (hp.b, hp.a)]


def k_weight(x, sr):
    y = np.asarray(x, dtype=np.float64)
    for b, a in _k_filters(sr):
        y = lfilter(b, a, y, axis=0)
    return y


def integrated_lufs(x, sr):
    import pyloudnorm

    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    if len(x) < int(0.5 * sr):
        x = fit_length(x, int(0.5 * sr))
    with np.errstate(divide="ignore"):
        v = pyloudnorm.Meter(sr).integrated_loudness(x)
    return float(v)


def loudness_curve(x, sr, win=0.4):
    """Per-sample K-weighted loudness (LUFS) over a centred window of `win` s.
    win=0.4 -> EBU momentary, win=3.0 -> short-term."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    y = k_weight(x, sr)
    p = (y * y).sum(axis=1)
    w = max(1, int(round(win * sr)))
    c = np.concatenate([[0.0], np.cumsum(p)])
    half = w // 2
    idx = np.arange(len(p))
    lo = np.clip(idx - half, 0, len(p))
    hi = np.clip(idx - half + w, 0, len(p))
    ms = (c[hi] - c[lo]) / w
    with np.errstate(divide="ignore"):
        return -0.691 + 10.0 * np.log10(np.maximum(ms, 1e-20))


def max_momentary(x, sr):
    return float(loudness_curve(x, sr, 0.4).max())


def true_peak_db(x):
    """4x-oversampled peak (BS.1770 style), dBTP."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    up = resample_poly(x, 4, 1, axis=0)
    return float(lin2db(max(np.abs(up).max(), np.abs(x).max())))


def true_peak_per_sample(x):
    """Per-sample true-peak estimate (max over channels and 4 oversampled points)."""
    n = len(x)
    up = resample_poly(x, 4, 1, axis=0)
    up = np.abs(up[: 4 * n]).max(axis=1)
    if len(up) < 4 * n:
        up = np.concatenate([up, np.zeros(4 * n - len(up))])
    tp = up.reshape(n, 4).max(axis=1)
    # neighbouring oversampled points just before the sample
    tp = np.maximum(tp, np.concatenate([[0.0], tp[:-1]]))
    return np.maximum(tp, np.abs(x).max(axis=1))


# ----------------------------------------------------------------------------- dsp
def sos_filter(x, kind, freq, sr, order=2):
    """kind: 'low'|'high'|'band' (freq=(lo,hi))."""
    nyq = sr / 2.0
    if kind == "band":
        lo, hi = freq
        hi = min(hi, nyq * 0.95)
        sos = butter(order, [lo / nyq, hi / nyq], btype="band", output="sos")
    else:
        f = min(freq, nyq * 0.95)
        sos = butter(order, f / nyq, btype=kind, output="sos")
    return sosfilt(sos, x, axis=0)


def biquad_lowpass_coeffs(fc, q, sr):
    w0 = 2 * np.pi * min(fc, sr * 0.45) / sr
    alpha = np.sin(w0) / (2 * q)
    cw = np.cos(w0)
    b = np.array([(1 - cw) / 2, 1 - cw, (1 - cw) / 2])
    a = np.array([1 + alpha, -2 * cw, 1 - alpha])
    return b / a[0], a / a[0]


def tv_lowpass(x, cutoff, sr, q=0.707, block=256):
    """Time-varying 2-pole low-pass. x: (n,) or (n, ch); cutoff: (n,) Hz."""
    x2 = x if x.ndim == 2 else x[:, None]
    n, ch = x2.shape
    y = np.empty_like(x2)
    zi = np.zeros((2, ch))
    for s in range(0, n, block):
        e = min(n, s + block)
        b, a = biquad_lowpass_coeffs(float(cutoff[(s + e) // 2]), q, sr)
        for c in range(ch):
            y[s:e, c], zi[:, c] = lfilter(b, a, x2[s:e, c], zi=zi[:, c])
    return y if x.ndim == 2 else y[:, 0]


def decorrelator(rng, sr, ms=6.0):
    """Flat-magnitude, random-phase FIR (all-pass-ish) for stereo decorrelation."""
    n = int(2 ** np.ceil(np.log2(ms * 1e-3 * sr)))
    spec = np.exp(1j * rng.uniform(-np.pi, np.pi, n // 2 + 1))
    spec[0] = 1.0
    spec[-1] = 1.0
    h = np.fft.irfft(spec, n)
    h *= np.hanning(n) ** 0.5
    return h / np.sqrt((h * h).sum())


def make_ir(sr, seed, length=3.0, t60=(2.5, 1.8, 1.2, 0.6), predelay=0.02, fade_in=0.015,
            brightness=9000.0):
    """Stereo decaying-noise impulse response with frequency-dependent decay.

    t60: decay times for bands <300 Hz, 300-1.5k, 1.5k-5k, >5k.
    Returns (m, 2) normalised to unit energy per channel.
    """
    rng = np.random.default_rng(seed)
    m = int(length * sr)
    t = np.arange(m) / sr
    edges = [(None, 300.0), (300.0, 1500.0), (1500.0, 5000.0), (5000.0, None)]
    out = np.zeros((m, 2))
    for ch in range(2):
        nz = rng.standard_normal(m)
        acc = np.zeros(m)
        for (lo, hi), T in zip(edges, t60):
            if lo is None:
                b = sos_filter(nz, "low", hi, sr, 4)
            elif hi is None:
                b = sos_filter(nz, "high", lo, sr, 4)
            else:
                b = sos_filter(nz, "band", (lo, hi), sr, 3)
            acc += b * np.exp(-6.91 * t / T)
        acc = sos_filter(acc, "low", brightness, sr, 2)
        out[:, ch] = acc
    fi = int(fade_in * sr)
    if fi > 0:
        out[:fi] *= (np.sin(np.linspace(0, np.pi / 2, fi)) ** 2)[:, None]
    tail = int(0.05 * sr)
    out[-tail:] *= np.linspace(1, 0, tail)[:, None]
    out /= np.sqrt((out ** 2).sum(axis=0, keepdims=True))
    pd = int(predelay * sr)
    return np.concatenate([np.zeros((pd, 2)), out], axis=0)


def convolve_stereo(x, ir):
    """x: (n, 2); ir: (m, 2) -> (n, 2) (tail truncated to n)."""
    n = len(x)
    out = np.zeros((n, 2))
    for c in range(2):
        out[:, c] = oaconvolve(x[:, c], ir[:, c])[:n]
    return out


def sliding_max_forward(a, size):
    """out[k] = max(a[k : k+size])."""
    if size <= 1:
        return a.copy()
    c = maximum_filter1d(a, size=size, mode="constant", cval=0.0)
    h = size // 2
    return np.concatenate([c[h:], np.full(h, c[-1] if len(c) else 0.0)])[: len(a)]


def sliding_max_backward(a, size):
    """out[k] = max(a[k-size+1 : k+1])."""
    if size <= 1:
        return a.copy()
    c = maximum_filter1d(a, size=size, mode="nearest")
    s = size - 1 - size // 2
    return np.concatenate([np.full(s, a[0]), c[: len(a) - s]])[: len(a)]


def ffmpeg_ebur128(path):
    """Run ffmpeg ebur128 (with true peak) on a file -> dict(I, LRA, TP)."""
    import re
    import subprocess

    p = subprocess.run(
        [FFMPEG, "-hide_banner", "-nostats", "-i", path, "-filter_complex",
         "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True, text=True)
    txt = p.stderr
    summ = txt[txt.rfind("Summary:"):] if "Summary:" in txt else txt

    def grab(pattern):
        mm = re.search(pattern, summ)
        return float(mm.group(1)) if mm else float("nan")

    return {
        "I": grab(r"I:\s+(-?[\d.]+|-inf) LUFS"),
        "LRA": grab(r"LRA:\s+(-?[\d.]+) LU"),
        "TP": grab(r"Peak:\s+(-?[\d.]+|-inf) dBFS"),
    }

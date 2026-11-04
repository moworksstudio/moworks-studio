"""Shared DSP for the sound of "Where the Needle Stops" (cues_inj.py, music_inj.py, sfx_inj.py,
mix_inj.py). Builds on the kit's audio tools (tools/audio: audio_common.py, sfx.py, mix.py, music.py)
and adds the building blocks this film needs. Pure numpy/scipy, deterministic for a given seed.
Signals are (n,) mono or (n, 2) stereo float64 at SR.

The kit folder comes from KIT_ROOT (tools/sound.mjs and build.mjs set it), else three folders up
(<kit>/examples/<film>/sound or <kit>/videos/<film>/sound).
"""
from __future__ import annotations

import json
import os
import re
import sys
import zlib

import numpy as np
from scipy.signal import sosfilt, sosfiltfilt, butter, oaconvolve

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.normpath(os.path.join(HERE, ".."))
KIT = os.path.normpath(os.environ.get("KIT_ROOT") or os.path.join(PROJ, "..", ".."))
TOOLS = os.path.join(KIT, "tools", "audio")
if not os.path.exists(os.path.join(TOOLS, "audio_common.py")):
    sys.exit(f"✗ the kit's audio tools are not at {TOOLS}: run this through node tools/sound.mjs <video> --bespoke")
sys.path.insert(0, TOOLS)
import audio_common as ac  # noqa: E402

SR = 48000
NYQ = SR / 2.0
AUDIO = os.path.join(PROJ, "audio")


# ----------------------------------------------------------------------------- film
def film_length():
    """The film length in seconds, from index.html's root (data-duration): the one source of it."""
    html = open(os.path.join(PROJ, "index.html"), encoding="utf-8").read()
    tag = re.search(r"<[a-zA-Z]+\b[^>]*\bid\s*=\s*[\"']root[\"'][^>]*>", html)
    m = re.search(r"\bdata-duration\s*=\s*[\"']?([\d.]+)", tag.group(0) if tag else "")
    if not m:
        sys.exit("✗ index.html: the root element has no data-duration")
    return float(m.group(1))


# ----------------------------------------------------------------------------- cues
def load_cues():
    return json.load(open(os.path.join(AUDIO, "cues.json")))


def cut_times(doc):
    """[(t, shot, scene)] in order."""
    return sorted((c["t"], c["shot"], c["scene"]) for c in doc["cues"] if c["kind"] == "cut")


def cue_t(doc, kind, **match):
    for c in doc["cues"]:
        if c["kind"] == kind and all(c.get(k) == v for k, v in match.items()):
            return c["t"]
    raise KeyError((kind, match))


def rng_for(seed, *keys):
    parts = [int(seed)]
    for k in keys:
        parts.append(zlib.crc32(str(k).encode()) if not isinstance(k, (int, np.integer)) else int(k))
    return np.random.default_rng(parts)


# ----------------------------------------------------------------------------- basics
def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=float) - 69.0) / 12.0)


def db(x):
    return 10.0 ** (np.asarray(x, dtype=float) / 20.0)


def tvec(n):
    return np.arange(n) / SR


def ns(sec):
    return int(round(sec * SR))


def sos(kind, f, order=2):
    if kind == "band":
        lo, hi = f
        return butter(order, [max(lo, 5.0) / NYQ, min(hi, NYQ * 0.95) / NYQ], btype="band", output="sos")
    return butter(order, min(f, NYQ * 0.95) / NYQ, btype=kind, output="sos")


def lp(x, f, order=2):
    return sosfilt(sos("low", f, order), x, axis=0)


def hp(x, f, order=2):
    return sosfilt(sos("high", f, order), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(sos("band", (lo, hi), order), x, axis=0)


def rc_fade(n, rising=True):
    """Raised-cosine fade of n samples."""
    if n <= 0:
        return np.zeros(0)
    u = np.arange(n) / n
    e = 0.5 - 0.5 * np.cos(np.pi * u)
    return e if rising else e[::-1]


def env_ad(n, att, tau, start=0, hold=0.0):
    """Raised-cosine attack (att s) from `start`, optional hold, then exp decay (tau s)."""
    out = np.zeros(n)
    if start >= n:
        return out
    m = n - start
    tt = np.arange(m) / SR
    na = max(1, ns(att))
    e = np.exp(-np.maximum(tt - att - hold, 0.0) / max(tau, 1e-5))
    k = min(na, m)
    e[:k] *= rc_fade(na)[:k]
    out[start:] = e
    return out


def osc(freq, n=None, phase=0.0):
    f = np.asarray(freq, dtype=float)
    if f.ndim == 0:
        f = np.full(n, float(f))
    return np.sin(phase + 2 * np.pi * np.cumsum(f) / SR)


def smooth_noise(n, rng, rate_hz, lo=-1.0, hi=1.0):
    """Slow random curve (cosine-interpolated random points `rate_hz` apart)."""
    k = int(n / SR * rate_hz) + 3
    pts = rng.uniform(lo, hi, k)
    x = np.arange(n) / SR * rate_hz
    i = np.floor(x).astype(int)
    f = x - i
    w = 0.5 - 0.5 * np.cos(np.pi * f)
    return pts[i] * (1 - w) + pts[i + 1] * w


def pink(n, rng, ch=1):
    """Pink noise (1/f power) via spectral shaping, unit RMS per channel."""
    out = np.zeros((n, ch))
    m = int(2 ** np.ceil(np.log2(n + 16)))
    f = np.fft.rfftfreq(m, 1 / SR)
    shape = 1.0 / np.sqrt(np.maximum(f, 15.0))
    for c in range(ch):
        X = np.fft.rfft(rng.standard_normal(m)) * shape
        y = np.fft.irfft(X, m)[:n]
        out[:, c] = y / (np.std(y) + 1e-12)
    return out if ch > 1 else out[:, 0]


def brown(n, rng, ch=1, hp_hz=18.0):
    out = np.zeros((n, ch))
    for c in range(ch):
        y = np.cumsum(rng.standard_normal(n))
        y = hp(y, hp_hz, 2)
        out[:, c] = y / (np.std(y) + 1e-12)
    return out if ch > 1 else out[:, 0]


def soft_sat(x, drive=1.5):
    return np.tanh(drive * x) / np.tanh(drive)


def to_stereo(x):
    x = np.asarray(x, dtype=float)
    return np.stack([x, x], axis=1) if x.ndim == 1 else x


def pan(x, p):
    """Equal-power pan of mono (n,) or stereo (n,2) by p in -1..1 (scalar or per sample)."""
    x = to_stereo(x)
    th = (np.clip(np.asarray(p, dtype=float), -1, 1) + 1.0) * np.pi / 4.0
    gl = np.cos(th) / np.cos(np.pi / 4)
    gr = np.sin(th) / np.sin(np.pi / 4)
    return np.stack([x[:, 0] * gl, x[:, 1] * gr], axis=1)


def widen(x, rng, width=0.3, hp_hz=300.0):
    """Mono -> stereo: mid + decorrelated, high-passed side."""
    x = np.asarray(x, dtype=float)
    if x.ndim == 2:
        x = x.mean(axis=1)
    h = ac.decorrelator(rng, SR, 8.0)
    side = np.convolve(x, h)[: len(x)]
    side = hp(side, hp_hz, 2) * width
    return np.stack([x + side, x - side], axis=1)


def place(dst, src, start):
    src = to_stereo(src)
    n, m = len(dst), len(src)
    s0, s1 = max(0, start), min(n, start + m)
    if s1 > s0:
        dst[s0:s1] += src[s0 - start:s1 - start]


def sparse_impulses(n, rng, rate, amp_sigma=0.8, rate_curve=None):
    """Poisson impulse train (rate per s, optionally scaled per sample by rate_curve),
    log-normal amplitudes with random sign."""
    if rate_curve is None:
        mask = rng.random(n) < rate / SR
    else:
        mask = rng.random(n) < (rate * np.asarray(rate_curve)) / SR
    y = np.zeros(n)
    k = int(mask.sum())
    y[mask] = rng.lognormal(0.0, amp_sigma, k) * rng.choice([-1.0, 1.0], k)
    return y


def additive(n, f0, partials, rng, start=0, att=0.002, punch=None):
    """Struck tone. partials [(ratio, amp, tau)]; f0 Hz."""
    y = np.zeros(n)
    m = n - start
    if m <= 0:
        return y
    tt = np.arange(m) / SR
    acc = np.zeros(m)
    for r, a, tau in partials:
        fr = f0 * r
        if fr > NYQ * 0.9:
            continue
        acc += a * np.sin(2 * np.pi * fr * tt + rng.uniform(0, 2 * np.pi)) * np.exp(-tt / tau)
    if punch is not None:
        k, tp = punch
        acc *= (1 - k) + k * np.exp(-tt / tp)
    na = max(1, ns(att))
    acc[: min(na, m)] *= rc_fade(na)[: min(na, m)]
    y[start:] = acc
    return y


def bubble(m, f0, rng, tau=0.02, rise=0.5, att=0.0015):
    """One liquid bubble: a sine whose pitch rises as it decays (Minnaert-style blip)."""
    tt = tvec(m)
    f = f0 * (1.0 + rise * (1.0 - np.exp(-tt / (tau * 1.5))))
    return np.sin(2 * np.pi * np.cumsum(f) / SR + rng.uniform(0, 6.28)) * env_ad(m, att, tau)


def flyby(n, anchor, w_pre, w_post, p=1.0):
    """Smooth Lorentzian swell with its max at `anchor` (samples); w in s."""
    tt = (np.arange(n) - anchor) / SR
    w = np.where(tt < 0, w_pre, w_post)
    e = 1.0 / (1.0 + (tt / w) ** 2) ** p
    fi = max(2, int(anchor * 0.3))
    e[:fi] *= rc_fade(fi)
    fo = max(2, int((n - anchor) * 0.3))
    e[n - fo:] *= rc_fade(fo, rising=False)
    return e


def band_noise_tv(n, rng, fc, bw_oct, nfft=1024):
    """Noise with a time-varying gaussian log-frequency band (re-uses tools/audio/sfx.py)."""
    import sfx as tsfx  # tools/audio/sfx.py
    return tsfx.band_noise(n, SR, rng, fc, bw_oct, nfft)


def keyframes(n, pts):
    """pts [(t, value)] (sorted) -> per-sample value, linear between points, held at the ends."""
    return np.interp(np.arange(n) / SR, [p[0] for p in pts], [p[1] for p in pts])


# ----------------------------------------------------------------------------- reverb
_IR_CACHE = {}


def ir(name, seed=7):
    """Named impulse responses (stereo, unit energy)."""
    key = (name, seed)
    if key in _IR_CACHE:
        return _IR_CACHE[key]
    if name == "room":     # clinic treatment room: small, soft, a little bright
        h = ac.make_ir(SR, seed, length=1.2, t60=(0.7, 0.6, 0.5, 0.35), predelay=0.010, brightness=8000)
    elif name == "body":   # inside the body: short, dark and wet
        h = ac.make_ir(SR, seed, length=1.4, t60=(1.1, 0.9, 0.5, 0.25), predelay=0.006, brightness=3500)
    elif name == "air":    # sparkles and shimmers: longer, airy
        h = ac.make_ir(SR, seed, length=3.0, t60=(2.2, 2.0, 1.8, 1.4), predelay=0.018, brightness=11000)
    elif name == "hall":   # music: long warm hall
        h = ac.make_ir(SR, seed, length=5.5, t60=(4.2, 3.6, 2.8, 1.6), predelay=0.026, brightness=7500)
    else:
        raise KeyError(name)
    _IR_CACHE[key] = h
    return h


def reverb(x, name, seed=7):
    """Wet signal only, same length as x plus the IR tail."""
    x = to_stereo(x)
    h = ir(name, seed)
    out = np.zeros((len(x) + len(h) - 1, 2))
    for c in range(2):
        out[:, c] = oaconvolve(x[:, c], h[:, c])
    return out


# ----------------------------------------------------------------------------- loudness
def max_momentary(x):
    x = to_stereo(x)
    if len(x) < ns(0.4):
        x = np.concatenate([x, np.zeros((ns(0.4) - len(x), 2))])
    return ac.max_momentary(x, SR)


def integrated(x):
    return ac.integrated_lufs(to_stereo(x), SR)


def momentary_curve(x, win=0.4):
    return ac.loudness_curve(to_stereo(x), SR, win)


# ----------------------------------------------------------------------------- voice
VIRTUAL_VO_LUFS = -16.0  # with no narrator, every level is set against a virtual voice this loud


def vo_path():
    return os.path.join(AUDIO, "vo.wav")


def read_vo(n):
    """audio/vo.wav (starts at t = 0), zero-padded / cut to n samples; silence when there is no voice."""
    if not os.path.exists(vo_path()):
        return np.zeros((n, 2))
    vo = ac.read_audio(vo_path(), SR)
    return ac.fit_length(vo, n)


def has_voice(vo):
    return bool(np.abs(vo).max() > 1e-6 and np.isfinite(integrated(vo)))


def voice_level(vo):
    """Integrated loudness of the voice, or the virtual voice's when there is none."""
    return integrated(vo) if has_voice(vo) else VIRTUAL_VO_LUFS


def voice_key(vo):
    """0..1 'voice present' curve with 40 ms attack / 300 ms release (tools/audio/mix.py); 0 with no voice."""
    if not has_voice(vo):
        return np.zeros(len(vo))
    import mix as tmix  # tools/audio/mix.py
    return tmix.duck_curve(vo, SR)


def speech_carve(x, key, depth_db, lo=700.0):
    """Duck only the speech band (above `lo` Hz) of x by depth_db * key.
    Low band = zero-phase low-pass, high = x - low, so the split is exact."""
    x = to_stereo(x)
    low = sosfiltfilt(sos("low", lo, 4), x, axis=0)
    high = x - low
    g = db(-depth_db * key)[:, None]
    return low + high * g

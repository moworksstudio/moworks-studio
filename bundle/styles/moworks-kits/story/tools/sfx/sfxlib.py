#!/usr/bin/env python3
"""sfxlib.py — the shared ingredients for designing sound in code (numpy + scipy). Every tools/sfx/build_*.py imports it.

  ingredients   tt · bp/lp/hp filters · noise transients and grains · damped modes · sub kicks · FM bells · moving
                band-pass · a synthetic room reverb (room, space)
  levels        momentary_max (BS.1770 loudness) · finish_stereo / finish_mono (level to a target, peak ≤ −1 dBFS)
  instruments   piano() (felt piano) · string_ks() (plucked string) · NOTE (MIDI → Hz) · put/pan helpers
                for composing ORIGINAL music when the user asks for it (.claude/skills/original-music)

Nothing here is a sample: every sound is generated, deterministic (fixed seeds) and yours.
"""
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
PEAK_CAP_DB = -1.0
ROOT = Path(__file__).resolve().parents[2]

# ── ingredients ──────────────────────────────────────────────────────────────────────────────────────────────────


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


# ── levels ───────────────────────────────────────────────────────────────────────────────────────────────────────
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


def write_wav(path, st):
    path.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(path, SR, np.round(np.clip(st, -1, 1) * 32767).astype(np.int16))


# ── bells, instruments ───────────────────────────────────────────────────────────────────────────────────────────
def fm_bell(f, t, decay=0.8, index=1.6, ratio=3.5):
    env = np.exp(-t / decay)
    return env * np.sin(2 * np.pi * f * t + index * env * np.sin(2 * np.pi * f * ratio * t))


NOTE = lambda m: 440.0 * 2 ** ((m - 69) / 12)  # noqa: E731  MIDI note → Hz


def put(buf, x, at, gain=1.0):
    """add mono or stereo x into the stereo buffer at time `at` (s), clipped to the buffer"""
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    i = int(round(at * SR))
    m = max(0, min(len(x), len(buf) - i))
    if m:
        buf[i : i + m] += x[:m] * gain


def pan(x, p):
    """mono → stereo with an equal-power pan p ∈ [-1, 1] (a number, or an array per sample)"""
    p = np.broadcast_to(np.asarray(p, dtype=float), x.shape)
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], 1)


def piano(f, dur, vel=0.6, rng=None):
    """felt piano: slightly inharmonic partials, two detuned strings, a soft hammer, darker as it decays"""
    t = tt(dur)
    B = 0.00035
    y = np.zeros(len(t))
    t0 = 3.2 * (220 / f) ** 0.35  # low notes ring longer
    for k in range(1, 12):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 9000:
            break
        a = vel ** (0.6 + 0.25 * k) / k**1.15
        tau = t0 / (1 + 0.55 * (k - 1))
        for det in (-0.7, 0.7):  # cents — the slow beating of a real unison
            y += a * np.exp(-t / tau) * (0.65 + 0.35 * np.exp(-t / 0.35)) * np.sin(2 * np.pi * fk * 2 ** (det / 1200) * t + k)
    att = np.clip(t / 0.006, 0, 1)
    y *= att
    if rng is not None:
        ham = rng.standard_normal(int(0.012 * SR)) * np.exp(-np.arange(int(0.012 * SR)) / SR / 0.003)
        y[: len(ham)] += lp(ham, 1800) * 0.06 * vel
    y = lp(y, 2200 + 2600 * vel)  # felt: soft top end
    rel = np.clip((dur - t) / 0.25, 0, 1)
    return y * rel


def string_ks(f, dur, rng, bright=0.6, decay=0.996):
    """Karplus–Strong string as an IIR comb (scipy lfilter: fast); fractional pitch via a short allpass"""
    p = SR / f
    d = int(p)
    n = int(dur * SR)
    burst = rng.uniform(-1, 1, d)
    burst = lp(burst, 1500 + 6000 * bright, 2)
    x = np.zeros(n)
    x[:d] = burst
    a = np.zeros(d + 2)
    a[0] = 1.0
    a[d] -= decay * 0.5
    a[d + 1] -= decay * 0.5
    y = signal.lfilter([1.0], a, x)
    # the comb's pitch is SR / (d + 0.5): retune by resampling the tiny error away
    actual = SR / (d + 0.5)
    if abs(actual / f - 1) > 1e-4:
        y = signal.resample(y, int(len(y) * actual / f))[:n]
        y = np.pad(y, (0, max(0, n - len(y))))
    return y

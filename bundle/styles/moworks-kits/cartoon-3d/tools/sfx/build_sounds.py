#!/usr/bin/env python3
"""build_sounds.py — the kit's sound effects, designed in code (numpy + scipy), stereo, deterministic.

    uv run --with numpy --with scipy python tools/sfx/build_sounds.py                 # → public/sfx/kit/*.wav + INDEX.md
    uv run --with numpy --with scipy python tools/sfx/build_sounds.py --audition out/kit-audition.wav   # all in a row
    uv run --with numpy --with scipy --with matplotlib python tools/sfx/build_sounds.py --sheet out/kit-sheet.png

Made for screen animation: sub-weighted impacts, a metallic clang, FM blips, data-tick count rolls whose pitch climbs
in steps, bell lock-ins, a chord-stab winner stinger, glitch stutters, a blade slice, a soft click. Every sound gets a
stereo image: a centred dry signal plus a short synthetic room (two decorrelated noise impulse responses), and on some,
a ping-pong delay. Fixed seeds (crc32 of the name), so every run writes the same files. Levelled by loudness
(BS.1770 momentary max) with peak <= -1 dBFS. No samples, no downloads, no licences: the sounds belong to whoever
runs this. There is deliberately no whoosh / swish / whip / riser: movement is sold with tonal and rhythmic detail.
To add a sound: write an s_<name>(rng) builder from the ingredients below, add a SOUNDS row, re-run.
"""
import argparse
import json
import zlib
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
PEAK_CAP_DB = -1.0
ROOT = Path(__file__).resolve().parents[2]


# ── ingredients ──────────────────────────────────────────────────────────────────────────────────
def rng_for(name):
    return np.random.default_rng(zlib.crc32(("mg/" + name).encode()))  # fixed seed per sound


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


def saw(f, t, rng):
    """band-limited-ish saw: additive, 1/k partials up to 9 kHz."""
    out = np.zeros(len(t))
    ph = 2 * np.pi * np.cumsum(np.broadcast_to(f, t.shape)) / SR + rng.uniform(0, 2 * np.pi)
    fmax = np.max(f)
    for k in range(1, int(9000 / fmax) + 1):
        out += np.sin(k * ph) / k
    return out


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


# ── the kit ──────────────────────────────────────────────────────────────────────────────────────
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


def s_vs(rng):
    """the VS slam — an inharmonic metallic clang (FM, index decaying) over a sub kick."""
    t = tt(1.2)
    idx = 6 * np.exp(-t / 0.08) + 0.8
    clang = fm(196, 1.414, idx, t) * env_ad(t, 0.001, 0.32)
    clang += 0.5 * fm(196 * 2.76, 1.17, idx * 0.6, t) * env_ad(t, 0.001, 0.18)
    y = 0.75 * norm(hp(clang, 120)) + 0.9 * sub_kick(t, 130, 42, 0.03, 0.28)
    k = click(rng, 0.005, 1500, 12000)
    y[: len(k)] += 0.6 * k
    y = np.tanh(1.5 * norm(y)) / np.tanh(1.5)
    return space(rng, tail(y, 0.2), wet=0.3, dur=1.6, tau=0.45, bright=6000, pingpong=(0.16, 0.5, 0.18))


def s_blip(rng, f0, f1, dur=0.09, ratio=2.0):
    """UI blip — FM sine that slides f0→f1 with a brief bright attack."""
    t = tt(dur)
    f = f1 + (f0 - f1) * np.exp(-t / (dur / 4))
    ph = 2 * np.pi * np.cumsum(f) / SR
    idx = 2.2 * np.exp(-t / 0.012)
    y = np.sin(ph + idx * np.sin(ratio * ph)) * env_ad(t, 0.002, dur / 3)
    return space(rng, tail(y, 0.015), wet=0.16, dur=0.6, tau=0.12, bright=8000, pingpong=(0.11, 0.45, 0.22))


def s_tick(rng):
    """one data tick — a 6 ms high sine burst with a hair of noise."""
    t = tt(0.03)
    y = osc(3600, t) * np.exp(-t / 0.004)
    k = click(rng, 0.003, 5000, 14000)
    y[: len(k)] += 0.2 * k
    return space(rng, tail(y, 0.005), wet=0.1, dur=0.4, tau=0.08, bright=9000)


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


def bell(f, t, rng, decay=0.5):
    return sum(
        a * np.exp(-t / (decay * d)) * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6.28))
        for r, a, d in [(1, 1, 1), (2.0, 0.35, 0.6), (3.01, 0.18, 0.4), (4.17, 0.1, 0.25)]
    ) * np.minimum(1, t / 0.002)


def s_lock(rng):
    """value locks in — two FM-bell notes a fifth apart over a soft thump, with ping-pong echoes."""
    out = zeros(1.0)
    t = tt(0.9)
    place(out, bell(1318.5, t, rng, 0.35), 0.0, 0.7)
    place(out, bell(1975.5, t, rng, 0.45), 0.075, 1.0)
    place(out, 0.5 * sub_kick(tt(0.3), 120, 60, 0.02, 0.07), 0.0)
    return space(rng, tail(out, 0.2), wet=0.2, dur=1.0, tau=0.3, bright=8000, pingpong=(0.14, 0.45, 0.25))


def s_win(rng):
    """the winner stinger — a detuned saw chord stab (A major add9) whose filter opens and closes, a sub hit
    under it and a sparkle on top."""
    t = tt(1.2)
    chord = [220.0, 277.18, 329.63, 440.0, 493.88, 659.25]
    y = sum(saw(f * (1 + d), t, rng) for f in chord for d in (-0.004, 0.0, 0.005))
    cutoff = 600 + 5200 * np.exp(-t / 0.12)
    # time-varying low-pass: process in 5 ms blocks with the block's cutoff
    out = np.zeros(len(t))
    blk = int(0.005 * SR)
    zi = None
    for i in range(0, len(t), blk):
        s_ = signal.butter(2, min(cutoff[i], SR / 2 - 100), fs=SR, output="sos")
        if zi is None:
            zi = signal.sosfilt_zi(s_) * 0
        out[i : i + blk], zi = signal.sosfilt(s_, y[i : i + blk], zi=zi)
    stab = norm(out) * env_ad(t, 0.004, 0.32)
    spark = sum(bell(f, t, rng, 0.3) * 0.3 for f in (1760, 2217.46, 2637.02))
    y = stab + 0.8 * sub_kick(t, 120, 50, 0.03, 0.25) + 0.35 * norm(spark)
    y = np.tanh(1.4 * norm(y)) / np.tanh(1.4)
    return space(rng, tail(y, 0.25), wet=0.28, dur=1.5, tau=0.4, bright=7000, pingpong=(0.18, 0.4, 0.15))


def s_glitch(rng):
    """digital glitch stutter (0.32 s) — chopped square / noise / sine shards, sample-and-hold crushed,
    each shard panned to a random side."""
    dur = 0.32
    L, R = zeros(dur), zeros(dur)
    at = 0.0
    while at < dur - 0.02:
        ln = rng.uniform(0.012, 0.045)
        t = tt(ln)
        kind = rng.integers(0, 3)
        f = rng.choice([110, 220, 330, 440, 880, 1320, 1760])
        if kind == 0:
            y = np.sign(osc(f, t))
        elif kind == 1:
            y = rng.standard_normal(len(t))
        else:
            y = osc(f, t) * osc(f * 3.01, t)
        hold = int(rng.choice([4, 8, 16, 32]))  # sample-rate reduction
        y = np.repeat(y[::hold], hold)[: len(t)]
        y = np.round(y * 6) / 6  # bit crush
        y = tail(y * rng.uniform(0.4, 1.0), 0.003)
        pan = rng.uniform(-0.9, 0.9)
        place(L, y, at, np.sqrt((1 - pan) / 2))
        place(R, y, at, np.sqrt((1 + pan) / 2))
        at += ln + (rng.random() < 0.3) * rng.uniform(0.005, 0.02)
    st = np.stack([lp(L, 9000), lp(R, 9000)], axis=1)
    return st


def s_slice(rng):
    """a blade slice — a crisp noise snap and a short tonal zap dropping 2.4 kHz → 500 Hz (for cutting a
    value in half)."""
    t = tt(0.25)
    snap = np.zeros(len(t))
    s_ = hp(rng.standard_normal(int(0.03 * SR)), 3000) * np.exp(-tt(0.03) / 0.006)
    snap[: len(s_)] = norm(s_)
    zap = osc(500 + 1900 * np.exp(-t / 0.03), t) * env_ad(t, 0.001, 0.05)
    y = 0.7 * snap + 0.8 * zap + 0.4 * sub_kick(t, 160, 70, 0.02, 0.06)
    return space(rng, tail(y, 0.03), wet=0.2, dur=0.8, tau=0.2, bright=7000, width=1.0)


def s_chip(rng):
    """a chip / label pops on — a rounded double blip (up a fourth)."""
    out = zeros(0.18)
    t = tt(0.06)
    for i, f in enumerate([1046.5, 1396.9]):
        y = osc(f, t) * env_ad(t, 0.002, 0.018) + 0.15 * osc(f * 2, t) * env_ad(t, 0.001, 0.008)
        place(out, y, 0.045 * i, 0.7 + 0.3 * i)
    return space(rng, tail(out, 0.02), wet=0.15, dur=0.5, tau=0.1, bright=9000, pingpong=(0.09, 0.4, 0.18))


def s_resolve(rng):
    """the end card — a low, warm bell chord that rings out (no swell, it starts on the hit)."""
    t = tt(2.2)
    y = sum(bell(f, t, rng, 1.0) * a for f, a in [(220, 1.0), (329.63, 0.7), (440, 0.6), (554.37, 0.4)])
    y += 0.6 * sub_kick(t, 110, 48, 0.03, 0.4)
    return space(rng, tail(norm(y), 0.4), wet=0.32, dur=2.0, tau=0.6, bright=5000, pingpong=(0.24, 0.35, 0.12))




def s_click(rng):
    """a SMOOTH CLICK (premium UI): a rounded 'tk' (damped sine at 1.6 kHz with a half-millisecond raised-cosine
    attack, so no harsh edge), a short soft low body (240 Hz, ~10 ms) that only rounds it and a hair of band-limited
    noise for definition; low-passed at 7 kHz, a tiny room."""
    t = tt(0.12)
    att = 0.5 - 0.5 * np.cos(np.pi * np.minimum(1, t / 0.0006))
    tick = np.sin(2 * np.pi * 1600 * t) * np.exp(-t / 0.0045) * att
    body = np.sin(2 * np.pi * 240 * t) * np.exp(-t / 0.010) * (0.5 - 0.5 * np.cos(np.pi * np.minimum(1, t / 0.002)))
    grit = norm(bp(rng.standard_normal(len(t)), 2500, 6000) * np.exp(-t / 0.0015))
    y = lp(0.9 * tick + 0.4 * body + 0.12 * grit, 7000)  # the click leads; the body only rounds it
    return space(rng, tail(y, 0.03), wet=0.08, dur=0.3, tau=0.05, bright=7000)



SOUNDS = {
    # name: (builder, loudness target (momentary max, LUFS), use)
    "impact": (s_impact, -14, "a physical hit that IS the beat: a kick, a door landing, a fall, the title hit"),
    "vs": (s_vs, -14, "a metallic clang: two things square off, a hard stop"),
    "blip-up": (lambda r: s_blip(r, 900, 1800), -22, "the power switches on, a screen or panel appears"),
    "blip-down": (lambda r: s_blip(r, 1500, 700), -22, "something goes wrong: a burn shows, a machine dies"),
    "tick": (s_tick, -26, "one small key action: a jab, a switch, a step"),
    "count": (s_count, -21, "a number counts up / many things land (0.72 s roll, eases into the value)"),
    "lock": (s_lock, -19, "a value locks in, an object transforms"),
    "win": (s_win, -15, "a win that helps someone: a rescue lands, a pour for the team"),
    "glitch": (s_glitch, -19, "a digital glitch, a malfunction"),
    "slice": (s_slice, -18, "something is cut in half (a price, a rope)"),
    "chip": (s_chip, -23, "a verdict object pops on: a diagnosis card, a scoreboard, a label"),
    "resolve": (s_resolve, -17, "the end card / the final still"),
    "click": (s_click, -23, "a press: a button, a cursor click on an in-world screen"),
}

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


def finish(st, target):
    st = np.stack([hp(st[:, 0], 25), hp(st[:, 1], 25)], axis=1)
    # trim trailing near-silence (reverb tails below -70 dB)
    env = np.max(np.abs(st), axis=1)
    keep = np.nonzero(env > 10 ** (-70 / 20) * env.max())[0]
    st = st[: keep[-1] + 1] if len(keep) else st
    st = np.stack([tail(st[:, 0], 0.02), tail(st[:, 1], 0.02)], axis=1)
    st = st * 10 ** ((target - momentary_max(st)) / 20)
    return st * min(1.0, 10 ** (PEAK_CAP_DB / 20) / np.max(np.abs(st)))


def build(name):
    fn, target, _ = SOUNDS[name]
    return finish(fn(rng_for(name)), target)


def write_wav(path, st):
    path.parent.mkdir(parents=True, exist_ok=True)
    wavfile.write(path, SR, np.round(np.clip(st, -1, 1) * 32767).astype(np.int16))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "public/sfx/kit"))
    ap.add_argument("--sheet", default="")
    ap.add_argument("--audition", default="")
    args = ap.parse_args()
    out = Path(args.out)
    built = {n: build(n) for n in SOUNDS}
    for n, st in built.items():
        write_wav(out / f"{n}.wav", st)
    index = [
        {"name": n, "seconds": round(len(st) / SR, 3), "lufs_m": round(momentary_max(st), 1), "peak_db": round(20 * np.log10(np.max(np.abs(st))), 1), "use": SOUNDS[n][2]}
        for n, st in built.items()
    ]
    (out / "index.json").write_text(json.dumps(index, indent=2) + "\n")
    rows = "\n".join(f"| `{r['name']}` | {r['seconds']:.2f} s | {r['lufs_m']} | {r['peak_db']} | {r['use']} |" for r in index)
    (out / "INDEX.md").write_text(
        "# Sound kit (generated — do not edit by hand)\n\n"
        "Built by `tools/sfx/build_sounds.py` (numpy + scipy, fixed seeds, 48 kHz STEREO, levelled by loudness, peak ≤ -1 dBFS).\n"
        "No whoosh/swish/whip/riser.\n\n| name | length | loudness (M max, LUFS) | peak (dBFS) | use |\n|---|---|---|---|---|\n" + rows + "\n"
    )
    print(f"wrote {len(built)} sounds → {out}")
    if args.audition:
        parts, at, lines = [], 0.0, []
        for n, st in built.items():
            lines.append(f"{at:6.2f}s  {n}")
            parts += [st, np.zeros((int(0.5 * SR), 2))]
            at += len(st) / SR + 0.5
        write_wav(Path(args.audition), np.concatenate(parts))
        Path(args.audition).with_suffix(".txt").write_text("\n".join(lines) + "\n")
    if args.sheet:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        cols, rows_ = 3, -(-len(built) // 3)
        fig, axes = plt.subplots(rows_ * 2, cols, figsize=(cols * 5.2, rows_ * 3.0), gridspec_kw={"height_ratios": [1, 2] * rows_})
        for k, (n, st) in enumerate(built.items()):
            r, c = 2 * (k // cols), k % cols
            tx = np.arange(len(st)) / SR
            axes[r, c].plot(tx, st[:, 0], lw=0.4, color="#1a56d6")
            axes[r, c].plot(tx, st[:, 1], lw=0.4, color="#fd7317", alpha=0.6)
            axes[r, c].set_title(f"{n} ({len(st) / SR:.2f} s)", fontsize=10, loc="left")
            axes[r, c].set_xlim(0, tx[-1])
            axes[r, c].set_ylim(-1, 1)
            axes[r, c].axis("off")
            axes[r + 1, c].specgram(st[:, 0] + st[:, 1], NFFT=1024, Fs=SR, noverlap=896, cmap="magma", vmin=-130)
            axes[r + 1, c].set_ylim(0, 12000)
            axes[r + 1, c].tick_params(labelsize=7)
        for k in range(len(built), rows_ * cols):
            axes[2 * (k // cols), k % cols].axis("off")
            axes[2 * (k // cols) + 1, k % cols].axis("off")
        fig.tight_layout()
        fig.savefig(args.sheet, dpi=75)


if __name__ == "__main__":
    main()

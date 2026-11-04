#!/usr/bin/env python3
"""build_inner_voice.py — the sound-effect library of the Inner Voice Short style, designed in code (numpy + scipy).
Writes public/sfx/inner-voice/<name>.wav + INDEX.md. Run it once at setup; re-run after adding or changing a design.

    uv run --with numpy --with scipy python tools/sfx/build_inner_voice.py [name,name]

The style's sound is quiet and close: room tone, a thumb on a phone, a clock (and the clock spinning through a
time-skip), an alarm, breath under the red inner-voice words, guitar sounds, and one dark swell when the shadow
arrives. Every effect is levelled by loudness (momentary max), so a cue's gain means the same thing for every sound.
NO MUSIC lives here. Music is composed only when the user asks for it (.claude/skills/original-music).
To add a sound: write an s_<name>(rng) from the ingredients in sfxlib.py, add it to SOUNDS, re-run. A sound that
must follow one video's timing goes in its own tools/sfx/build_<slug>.py instead.
"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sfxlib as K  # noqa: E402
from sfxlib import NOTE, SR, bp, hp, lp, moving_band, space, string_ks, transient, tt  # noqa: E402

OUT = K.ROOT / "public/sfx/inner-voice"


# ── effects ─────────────────────────────────────────────────────────────────────────────────────────────────────
def s_room(rng):
    """room tone, 20 s: a faint dark air with a low hum (fades in 0.8 s, out 0.6 s); lay it under a whole scene"""
    d = 20.0
    t = tt(d)
    n = lp(rng.standard_normal(len(t)), 420) * 0.6 + lp(rng.standard_normal(len(t)), 2200) * 0.08
    hum = 0.05 * np.sin(2 * np.pi * 55 * t) + 0.02 * np.sin(2 * np.pi * 110 * t)
    y = (n + hum) * np.clip(t / 0.8, 0, 1) * np.clip((d - t) / 0.6, 0, 1)
    return np.stack([y, np.roll(y, 911) * 0.9], 1)


def s_alarm(rng):
    """a bedside alarm clock: four square-ish beeps near 2.8 kHz, a pause, again (3 rounds, 2.9 s)"""
    out = np.zeros(int(2.9 * SR))
    for r in range(3):
        for k in range(4):
            t = tt(0.075)
            sq = np.sign(np.sin(2 * np.pi * 2790 * t)) * 0.5 + np.sin(2 * np.pi * 2790 * t) * 0.5
            b = lp(sq, 6000) * np.clip(t / 0.003, 0, 1) * np.clip((0.075 - t) / 0.004, 0, 1)
            i = int((r * 0.95 + k * 0.14) * SR)
            out[i : i + len(b)] += b
    return space(rng, out * 0.6, wet=0.12, dur=0.5, tau=0.12)


def s_tap(rng):
    """a thumb flicks the phone glass: a tiny glassy tick and a soft pad"""
    y = transient(rng, 0.012, 0.0012, 2500, 9000) * 0.6
    t = tt(0.04)
    pad = np.sin(2 * np.pi * 310 * t) * np.exp(-t / 0.008) * 0.25
    out = np.zeros(len(t))
    out[: len(y)] += y
    return out + pad


def s_harm(rng):
    """the guitar on the stand answers his glance: two natural harmonics (B4, E5), barely touched"""
    d = 3.2
    y = np.zeros(int(d * SR))
    for f, at, a in [(NOTE(71), 0.0, 1.0), (NOTE(76), 0.07, 0.8)]:
        t = tt(d - at)
        tone = (np.sin(2 * np.pi * f * t) + 0.12 * np.sin(4 * np.pi * f * t)) * np.exp(-t / 0.9) * np.clip(t / 0.004, 0, 1)
        i = int(at * SR)
        y[i : i + len(tone)] += tone * a
    return space(rng, y * 0.5, wet=0.35, dur=2.0, tau=0.6, bright=4000)


def s_whisper(rng):
    """the inner voice under the red words: breath shaped into soft syllables (not words)"""
    d = 1.1
    t = tt(d)
    syl = np.zeros(len(t))
    pos = 0.02
    while pos < d - 0.15:
        ln = rng.uniform(0.09, 0.17)
        m = (t >= pos) & (t < pos + ln)
        syl[m] += np.sin(np.pi * (t[m] - pos) / ln) ** 2
        pos += ln + rng.uniform(0.02, 0.06)
    centers = 1800 + 900 * np.sin(2 * np.pi * 3.3 * t + 1) + 500 * np.sin(2 * np.pi * 7.1 * t)
    y = moving_band(rng.standard_normal(len(t)), centers, q=2.2) * syl
    y = hp(y, 900) * np.clip((d - t) / 0.2, 0, 1)
    return np.stack([y, np.roll(y, 240) * 0.85], 1)


def s_ticks(rng):
    """the clock spins 9:10 → 1:40: ticks follow the hands — slow, a blur in the middle, slow again"""
    d = 2.6
    span = 2.3
    out = np.zeros(int(d * SR))
    ease = lambda u: 4 * u**3 if u < 0.5 else 1 - (-2 * u + 2) ** 3 / 2  # noqa: E731
    u = np.linspace(0, 1, 4000)
    prog = np.array([ease(v) for v in u])
    N = 42
    for k in range(1, N):
        tk = u[np.searchsorted(prog, k / N)] * span
        t = tt(0.05)
        body = np.sin(2 * np.pi * 2900 * t) * np.exp(-t / 0.004) * 0.5 + np.sin(2 * np.pi * 1450 * t) * np.exp(-t / 0.006) * 0.3
        tick = body + np.pad(transient(rng, 0.006, 0.0007, 3000, 11000), (0, len(t) - int(0.006 * SR))) * 0.5
        lvl = 0.75 + 0.25 * rng.random()
        i = int(tk * SR)
        out[i : i + len(tick)] += tick[: len(out) - i] * lvl
    return space(rng, out, wet=0.12, dur=0.6, tau=0.15)


def s_strum(rng):
    """the first chord: a G shape with every string a little wrong, one fret buzzing — and choked at 0.70 s"""
    d = 1.4
    n = int(d * SR)
    # (midi, cents off) — the tuning is the joke
    strings = [(43, +38), (47, -55), (50, +22), (55, -72), (59, +47), (67, -18)]
    y = np.zeros(n)
    for i, (m, c) in enumerate(strings):
        f = NOTE(m) * 2 ** (c / 1200)
        s = string_ks(f, d, rng, bright=0.75, decay=0.9975)
        if i == 3:  # the buzzing string: rattles against a fret
            s = s + 0.35 * np.sign(s) * (np.abs(s) > 0.25 * np.max(np.abs(s))) * rng.uniform(0.3, 1.0, n) * np.exp(-tt(d) / 0.18)
        at = int(i * 0.016 * SR)  # a downstroke, low string first
        y[at:] += s[: n - at] * (0.8 + 0.1 * i / 5)
    pick = np.zeros(n)
    tr = transient(rng, 0.02, 0.004, 1500, 7000)
    pick[: len(tr)] += tr * 0.35
    y = y + pick
    # the guitar body: a little low-mid warmth
    y = y + 0.6 * bp(y, 90, 260)
    choke = np.clip(1 - (tt(d) - 0.70) / 0.07, 0, 1)
    y = y * choke
    return space(rng, y, wet=0.2, dur=1.0, tau=0.3, bright=5000)


def s_mute(rng):
    """his hand slaps the strings quiet: a dull thump, the strings choking, a short squeak"""
    d = 0.4
    t = tt(d)
    thump = np.sin(2 * np.pi * (110 + 60 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.05)
    chk = bp(rng.standard_normal(len(t)), 300, 2500) * np.exp(-t / 0.012) * 0.6
    sq = np.zeros(len(t))
    ts = tt(0.09)
    sq_tone = bp(rng.standard_normal(len(ts)), 1600, 3200) * np.sin(np.pi * ts / 0.09) ** 2 * 0.25
    i = int(0.03 * SR)
    sq[i : i + len(ts)] += sq_tone
    return space(rng, (thump + chk + sq) * 0.8, wet=0.15, dur=0.6, tau=0.2)


def s_dread(rng):
    """the shadow arrives: a low D swell, a faint high minor-second shimmer, dark air; gone by the fade (3.8 s)"""
    d = 3.8
    t = tt(d)
    swell = np.clip(t / 1.1, 0, 1) ** 1.6 * np.clip((d - t) / 0.65, 0, 1)
    low = np.sin(2 * np.pi * 36.71 * t) + 0.6 * np.sin(2 * np.pi * 55.0 * t + 1) + 0.25 * np.sin(2 * np.pi * 73.42 * t + 2)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.3 * t)
    hi = (np.sin(2 * np.pi * NOTE(86) * t) + np.sin(2 * np.pi * NOTE(87) * t)) * 0.035 * trem
    air = lp(hp(rng.standard_normal(len(t)), 150), 900) * 0.25
    y = (low * 0.55 + hi + air) * swell
    return np.stack([y, np.roll(y, 523) * 0.95], 1)


SOUNDS = {
    # name: (fn, loudness target (momentary max, LUFS), seed, what for)
    "room": (s_room, -44, 901, "room tone, 20 s, under a whole scene"),
    "tap": (s_tap, -34, 902, "a thumb flicks a phone"),
    "alarm": (s_alarm, -24, 910, "a bedside alarm clock beeping (2.9 s)"),
    "harmonics": (s_harm, -28, 903, "two guitar harmonics ring (an object 'calls' the hero)"),
    "whisper": (s_whisper, -34, 904, "breath under the red inner-voice words (1.1 s)"),
    "clock-spin": (s_ticks, -27, 905, "a clock spinning through a time-skip (2.3 s, fastest in the middle)"),
    "strum-sour": (s_strum, -15, 906, "a badly tuned first chord, one string buzzing, clamped at 0.70 s"),
    "string-mute": (s_mute, -24, 907, "a hand clamps the strings: thump, choke, squeak"),
    "dread": (s_dread, -21, 908, "the shadow arrives: a low swell (3.8 s)"),
}
KEEP_LENGTH = {"room"}  # never trimmed


def main():
    only = sys.argv[1].split(",") if len(sys.argv) > 1 else None
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for name, (fn, target, seed, use) in SOUNDS.items():
        if only and name not in only:
            continue
        x = fn(np.random.default_rng(seed))
        x = np.stack([x, x], 1) if x.ndim == 1 else x
        if name in KEEP_LENGTH:
            st = x * (10 ** ((target - K.momentary_max(x)) / 20))
            st = st * min(1.0, 10 ** (K.PEAK_CAP_DB / 20) / np.max(np.abs(st)))
        else:
            st = K.finish_stereo(x, target)
        K.write_wav(OUT / f"{name}.wav", st)
        m = K.momentary_max(st)
        rows.append(f"| `{name}` | {len(st) / SR:.2f} s | {m:.1f} | {use} |")
        print(f"{name:11s} {len(st) / SR:5.2f}s  M-max {m:6.1f} LUFS  peak {20 * np.log10(np.max(np.abs(st)) + 1e-12):5.1f} dB")
    if not only:
        (OUT / "INDEX.md").write_text(
            "# Inner Voice Short sounds (generated by tools/sfx/build_inner_voice.py — do not edit by hand)\n\n"
            "| name | length | loudness (M max, LUFS) | use |\n|---|---|---|---|\n" + "\n".join(rows) + "\n"
        )


if __name__ == "__main__":
    main()

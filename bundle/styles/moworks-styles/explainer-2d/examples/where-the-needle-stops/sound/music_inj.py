#!/usr/bin/env python3
"""Music for "Where the Needle Stops" -> scratch music_raw.npy/.wav.

    run by build.mjs: music_inj.py --scratch DIR

A score written for this film: no drums, held pads on a soft sub, airy glass on top, a long warm
hall. Warm, curious and gently playful: F major, soft round pads (mostly sine, a low filter), a
sparse celesta motif that asks a little question in the gaps between phrases and answers it under
the title, and a few kalimba "bloops" in the stomach. Chords change on the picture cuts read from
audio/cues.json; the bass climbs G - A - Bb - C through the vein and heart shots (the lift:
brighter, louder, a soft 75 bpm swell under the heartbeat) and falls a fifth to F for the
title, which strikes a warm F(add9) bell chord.

  shot  1  clinic, worried     Dm(add9)          wistful, E-F rub
  shot  2  arm close-up        Bbmaj9(#11)       curious (lydian)
  shot  3  x-ray               Gm9
  shot  4  stomach             C9sus4            hanging, playful bloops
  shot  5  shortcut            F(add9)           the "aha", brighter
  shot  6  cross-section       Am11              curious
  shot  7  fat (slow)          Bbmaj9            dark and slow
  shot  8  muscle              Gm11
  shot  9  vein                Fmaj7/A           lift begins
  shot 10  heart               Bbmaj9(#11)       lift peak, 75 bpm swell
  shot 11  arm, sting          C9sus4            dominant, waiting
  shot 12  title               F(add9)           bell chord + celesta answer, +13 dB
  end                          fade over the last 1.2 s
"""
from __future__ import annotations

import argparse
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import injsynth as L  # noqa: E402
from injsynth import SR, ns, db, env_ad, lp, hp, pan, to_stereo, mtof  # noqa: E402

import music as tmusic  # noqa: E402  (tools/audio/music.py: saw_blep)

TITLE_LIFT_DB = 13.0   # bus lift under the title vs the narration bed
TITLE_LIFT_ALONE_DB = 3.0  # the same with no narrator (the bed is already the main layer)


def title_lift():
    return TITLE_LIFT_DB if os.path.exists(L.vo_path()) else TITLE_LIFT_ALONE_DB

# per shot: chord name, sub bass, pad notes, high glass notes, attack of new notes, release of old
CHORDS = {
    1: ("Dm(add9)", 38, [50, 57, 64, 65, 69], [], 2.2, 0.0),
    2: ("Bbmaj9(#11)", 34, [46, 53, 57, 60, 64], [81], 0.9, 1.2),
    3: ("Gm9", 31, [43, 50, 57, 58, 65], [], 0.7, 0.9),
    4: ("C9sus4", 36, [48, 55, 58, 62, 65], [], 0.8, 1.0),
    5: ("F(add9)", 41, [48, 55, 57, 60, 65, 67], [81, 84], 0.5, 0.8),
    6: ("Am11", 33, [45, 52, 55, 60, 62], [76], 0.8, 0.9),
    7: ("Bbmaj9", 34, [46, 53, 57, 60, 62, 65], [81], 1.2, 1.0),
    8: ("Gm11", 31, [43, 50, 55, 58, 60, 65], [77], 0.7, 0.9),
    9: ("Fmaj7/A", 33, [45, 53, 57, 60, 64, 69], [81, 84, 88], 0.5, 0.7),
    10: ("Bbmaj9(#11)", 34, [46, 53, 57, 60, 62, 64, 69], [77, 81, 84, 88], 0.5, 0.7),
    11: ("C9sus4", 36, [48, 55, 58, 62, 65, 67], [79, 84], 0.6, 0.8),
    12: ("F(add9)", 29, [41, 48, 53, 55, 57, 60, 65, 69, 72], [77, 79, 81, 84], 0.03, 0.3),
}


def sections(doc):
    cuts = {shot: t for t, shot, _ in L.cut_times(doc)}
    S = []
    for shot in sorted(cuts):
        name, bass, pad, high, att, rel = CHORDS[shot]
        S.append(dict(t=cuts[shot], shot=shot, name=name, bass=bass, pad=pad, high=high, att=att, rel=rel))
    return S, cuts


def automation(doc, cuts, n):
    """Bus gain (dB) and pad low-pass cutoff (Hz) over time; each change glides in over
    ~0.6 s after its cut."""
    T = cuts
    dur = doc["duration"]
    tt_ = T[12]
    lvl = {1: 0.0, 2: 0.0, 3: 0.0, 4: -0.5, 5: 1.0, 6: 0.0, 7: -0.5, 8: 0.0, 9: 1.5, 10: 2.0, 11: 0.5}
    cut = {1: 800, 2: 950, 3: 900, 4: 800, 5: 1300, 6: 1050, 7: 850, 8: 1050, 9: 1500, 10: 1900, 11: 1250}
    g, c = [(0.0, 0.0)], [(0.0, 800.0)]
    for s in range(2, 12):
        if s == 11:  # the heart lift eases back before the soft "all" that ends shot 10
            g += [(T[s] - 0.7, lvl[10]), (T[s] - 0.25, lvl[11])]
            c += [(T[s] - 0.7, cut[10]), (T[s] - 0.25, cut[11])]
            continue
        g += [(T[s], lvl[s - 1]), (T[s] + 0.6, lvl[s])]
        c += [(T[s], cut[s - 1]), (T[s] + 0.6, cut[s])]
    g += [(tt_ - 0.04, lvl[11]), (tt_ + 0.02, title_lift()), (dur, title_lift())]
    c += [(tt_ - 0.02, cut[11]), (tt_ + 0.05, 2400.0), (tt_ + 2.5, 2000.0), (dur, 1800.0)]
    tt = np.arange(n) / SR
    gain = np.interp(tt, [p[0] for p in g], [p[1] for p in g])
    for cu in doc["cues"]:  # short rides of the bed under very soft words (0.12 s ramps)
        if cu["kind"] == "music_dip":
            t0, t1, r = cu["t"], cu["t"] + cu["dur"], 0.12
            gain += np.interp(tt, [t0 - r, t0, t1, t1 + r], [0.0, cu["db"], cu["db"], 0.0])
    cutoff = np.exp(np.interp(tt, [p[0] for p in c], np.log([p[1] for p in c])))
    return gain, cutoff


def note_spans(S, layer, dur):
    """Merge consecutive sections holding the same note: [(midi, start, end, att, rel)]."""
    spans = []
    open_ = {}
    for i, s in enumerate(S):
        notes = s[layer] if layer != "bass" else [s["bass"]]
        end_t = S[i + 1]["t"] if i + 1 < len(S) else dur
        rel_next = S[i + 1]["rel"] if i + 1 < len(S) else 0.05
        for m in notes:
            if m in open_:
                open_[m]["end"], open_[m]["rel"] = end_t, rel_next
            else:
                open_[m] = dict(midi=m, start=s["t"], end=end_t, att=s["att"], rel=rel_next)
        for m in list(open_):
            if m not in notes:
                spans.append(open_.pop(m))
    spans.extend(open_.values())
    return spans


def span_env(start, end, att, rel, n):
    i0 = max(0, ns(start))
    i1 = min(n, ns(end + rel) + 1)
    t = np.arange(i0, i1) / SR
    a = np.clip((t - start) / max(att, 1e-3), 0, 1)
    r = np.clip((t - end) / max(rel, 1e-3), 0, 1)
    return i0, (0.5 - 0.5 * np.cos(np.pi * a)) * (0.5 + 0.5 * np.cos(np.pi * r))


# --------------------------------------------------------------------------- voices
def pad_voice(rng, m, env):
    """Warm pad: a soft detuned saw pair under a stronger sine + a quiet octave-up sine,
    slow drift and breathing (a round, soft pad)."""
    k = len(env)
    f = float(mtof(m))
    out = np.zeros((k, 2))
    breathe = 1 + 0.12 * L.smooth_noise(k, rng, 0.15)
    for c, dets in enumerate(((-6.0, 3.0), (-3.0, 6.0))):
        drift = 2 ** (2.0 * L.smooth_noise(k, rng, 0.25) / 1200)
        for d in dets:
            out[:, c] += 0.32 * tmusic.saw_blep(f * 2 ** (d / 1200) * drift, SR, rng.uniform())
        ph = 2 * np.pi * np.cumsum(f * drift) / SR + rng.uniform(0, 6.28)
        out[:, c] += 0.75 * np.sin(ph) + 0.10 * np.sin(2 * ph + 0.7)
    w = np.interp(m, [36, 48, 60, 72], [1.0, 0.9, 0.55, 0.32])
    return out * (env * breathe * w)[:, None]


def glass_voice(rng, m, env):
    k = len(env)
    f = float(mtof(m))
    tt = np.arange(k) / SR
    out = np.zeros((k, 2))
    trem = 1 - 0.14 * (0.5 + 0.5 * np.sin(2 * np.pi * rng.uniform(4.0, 5.5) * tt + rng.uniform(0, 6.28)))
    for c, d in enumerate((-4.0, 4.0)):
        ph = 2 * np.pi * f * 2 ** (d / 1200) * tt + rng.uniform(0, 6.28)
        out[:, c] = np.sin(ph) + 0.08 * np.sin(2 * ph) + 0.03 * np.sin(3 * ph)
    return out * (env * trem * 0.30)[:, None]


def sub_voice(rng, m, env):
    k = len(env)
    f = float(mtof(m))
    ph = 2 * np.pi * f * np.arange(k) / SR + rng.uniform(0, 6.28)
    y = np.sin(ph) + 0.30 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    y = L.soft_sat(0.8 * y, 1.2)
    return to_stereo(y * env)


def celesta(n, rng, t0, m, amp=1.0):
    parts = [(1.0, 1.0, 1.3), (2.0, 0.26, 0.55), (3.0, 0.07, 0.28), (4.07, 0.05, 0.14), (0.5, 0.08, 1.1)]
    return L.additive(n, float(mtof(m)), parts, rng, start=ns(t0), att=0.002, punch=(0.4, 0.06)) * amp


def kalimba(n, rng, t0, m, amp=1.0):
    """Soft plucked tine: warm fundamental, inharmonic overtones that die fast."""
    parts = [(1.0, 1.0, 0.42), (2.0, 0.08, 0.15), (5.4, 0.10, 0.035), (8.9, 0.03, 0.015)]
    return L.additive(n, float(mtof(m)), parts, rng, start=ns(t0), att=0.003, punch=(0.5, 0.03)) * amp


# --------------------------------------------------------------------------- the motif
def motif_notes(doc, cuts):
    """(t, midi, instrument, amp). Celesta in the gaps between phrases; kalimba bloops in the
    stomach. Times relative to the cuts / known pauses in the narration."""
    T = cuts
    tt_ = T[12]
    notes = [
        # opening question, before the first word (0.91 s): C6 - A5 - D6
        (0.10, 84, "cel", 0.55), (0.38, 81, "cel", 0.45), (0.66, 86, "cel", 0.40),
        # stomach: a playful call and answer in the pauses after "medicines," and "insulin,"
        (T[4] + 1.80, 74, "kal", 0.55), (T[4] + 1.92, 77, "kal", 0.45),
        (T[4] + 2.92, 72, "kal", 0.50), (T[4] + 3.04, 70, "kal", 0.42),
        # "...how fast it works." -> rising A5 C6 D6 in the long pause before the fat shot
        (T[7] - 0.58, 81, "cel", 0.45), (T[7] - 0.40, 84, "cel", 0.42), (T[7] - 0.22, 86, "cel", 0.40),
        # fat: one slow note in the comma pause
        (T[7] + 1.53, 81, "cel", 0.38),
        # muscle -> vein: two quick notes
        (T[9] - 0.29, 84, "cel", 0.40), (T[9] - 0.17, 86, "cel", 0.38),
        # vein -> heart: the lift, F6 A6 C7
        (T[10] - 0.35, 89, "cel", 0.40), (T[10] - 0.23, 93, "cel", 0.36), (T[10] - 0.11, 96, "cel", 0.34),
        # title answer after the word pops: C6 A5 D6 ... F6 (resolved), F5 under the last note
        (tt_ + 1.10, 84, "cel", 0.55), (tt_ + 1.36, 81, "cel", 0.50), (tt_ + 1.62, 86, "cel", 0.50),
        (tt_ + 2.05, 89, "cel", 0.55), (tt_ + 2.05, 77, "cel", 0.35),
    ]
    return notes


# --------------------------------------------------------------------------- render
def render(doc, seed):
    dur = doc["duration"]
    n = ns(dur)
    rng = L.rng_for(seed, "music")
    S, cuts = sections(doc)
    gain, cutoff = automation(doc, cuts, n)
    tt = np.arange(n) / SR

    pad = np.zeros((n, 2))
    for sp in note_spans(S, "pad", dur):
        i0, env = span_env(sp["start"], sp["end"], sp["att"], sp["rel"], n)
        pad[i0:i0 + len(env)] += pad_voice(rng, sp["midi"], env)
    pad = L.ac.tv_lowpass(pad, cutoff, SR, q=0.7)
    pad = L.ac.tv_lowpass(pad, cutoff * 1.5, SR, q=0.6)
    pad = hp(pad, 60, 2)
    # heart shot: the pad swells softly with each heartbeat (75 bpm from "heart")
    try:
        t_heart = L.cue_t(doc, "heartbeat")
        beats = t_heart + np.arange(0, 8) * 0.8
        beats = beats[beats < cuts[11] - 0.4]
        sw = np.zeros(n)
        for b in beats:
            sw += np.where(tt >= b, np.exp(-np.maximum(tt - b, 0) / 0.28) * np.clip((tt - b) / 0.04, 0, 1), 0.0)
        pad *= (1 + 0.10 * sw)[:, None]
    except KeyError:
        pass

    glass = np.zeros((n, 2))
    for sp in note_spans(S, "high", dur):
        title = sp["start"] >= cuts[12]
        i0, env = span_env(sp["start"], sp["end"], 0.05 if title else max(sp["att"], 1.2), sp["rel"], n)
        glass[i0:i0 + len(env)] += pan(glass_voice(rng, sp["midi"], env), rng.uniform(-0.5, 0.5))

    sub = np.zeros((n, 2))
    for sp in note_spans(S, "bass", dur):
        title = sp["start"] >= cuts[12]
        i0, env = span_env(sp["start"], sp["end"], 0.03 if title else max(sp["att"], 0.5), sp["rel"], n)
        sub[i0:i0 + len(env)] += sub_voice(rng, sp["midi"], env)
    sub = lp(sub, 180, 2)

    cel = np.zeros(n)
    kal = np.zeros(n)
    for t0, m, inst, amp in motif_notes(doc, cuts):
        if inst == "cel":
            cel += celesta(n, rng, t0, m, amp)
        else:
            kal += kalimba(n, rng, t0, m, amp)
    cel = pan(cel, 0.15)
    cel = cel + 0.22 * np.roll(pan(cel[:, 0], -0.6), ns(0.30))  # soft ping-pong echo
    kal = pan(lp(kal, 4000), -0.2)

    dry = 0.85 * pad + 0.5 * glass + 1.4 * sub + 0.30 * cel + 0.32 * kal
    dry = dry * db(gain)[:, None]

    # title: warm F(add9) bell chord + a soft low bloom, with a short airy swell into it
    hit = np.zeros((n, 2))
    t12 = cuts[12]
    a = ns(t12)
    ta = np.maximum(tt - t12, 0.0)
    for j, (m, amp) in enumerate(((65, 0.50), (72, 0.42), (77, 0.40), (81, 0.30), (84, 0.20), (79, 0.12))):
        parts = [(1.0, 1.0, 2.8), (2.0, 0.30, 1.3), (3.0, 0.09, 0.6), (4.07, 0.06, 0.25), (0.5, 0.16, 2.2)]
        b = L.additive(n, float(mtof(m)), parts, rng, start=a + ns(0.001 * (0, 3, 1, 4, 2, 5)[j]), att=0.003,
                       punch=(0.45, 0.08))
        hit += pan(b * amp, (j / 5.0 - 0.5) * 0.6)
    fb = (43.65 + 25 * np.exp(-ta / 0.10)) * (np.arange(n) >= a)
    bloom = np.sin(2 * np.pi * np.cumsum(fb) / SR) * env_ad(n, 0.02, 1.1, a)
    hit += to_stereo(L.soft_sat(bloom, 1.2) * 0.55)
    pre = ns(0.5)
    u = np.clip((np.arange(n) - (a - pre)) / pre, 0, 1) * (np.arange(n) < a)
    swell = np.stack([L.band_noise_tv(n, rng, 700 + 4500 * u, 1.4) for _ in range(2)], axis=1)
    hit += swell * (u ** 3 * 0.07)[:, None]
    dry = dry + hit * db(title_lift() - 4.0)

    wet = L.reverb(dry * 0.55, "hall", seed + 3)[:n]
    out = dry + wet * 0.6
    fade = float(doc.get("fade_s", 1.2))
    fo = ns(fade)
    out[-fo:] *= (np.cos(np.linspace(0, np.pi / 2, fo)) ** 2)[:, None]
    fi = ns(0.01)
    out[:fi] *= L.rc_fade(fi)[:, None]
    return out, S


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--scratch", required=True)
    a = p.parse_args(argv)
    t0 = time.time()
    doc = L.load_cues()
    seed = int(doc.get("seed", 1234))
    out, S = render(doc, seed)
    pre = L.integrated(out[: ns(doc["title_t"] - 1.2)])
    out *= db(-30.0 - pre)
    os.makedirs(a.scratch, exist_ok=True)
    np.save(os.path.join(a.scratch, "music_raw.npy"), out.astype(np.float32))
    L.ac.write_wav(os.path.join(a.scratch, "music_raw.wav"), out, SR)
    print(f"music_inj: {doc['duration']:.1f}s, bed set to -30 LUFS pre-title ({time.time() - t0:.1f}s)")
    for s in S:
        print(f"  {s['t']:7.3f}  shot {s['shot']:2d}  {s['name']}")


if __name__ == "__main__":
    main()

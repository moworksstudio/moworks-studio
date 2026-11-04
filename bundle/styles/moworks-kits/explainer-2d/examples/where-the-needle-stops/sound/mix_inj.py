#!/usr/bin/env python3
"""Mix "Where the Needle Stops": voice + music + effects/room tone -> audio/mix.wav (+ stems).

    run by build.mjs: mix_inj.py --scratch DIR

Balance (BS.1770 K-weighting, relative to the voice's integrated loudness, or to a virtual voice
when the film has no narrator):
  * music bed integrated over [0, title - 1.2 s], as heard after the duck, at --music-lu
    (-21 LU) with a gentle 3 dB voice-keyed duck (tools/audio/mix.py sidechain, 40/300 ms),
  * effects and room tone arrive already levelled by sfx_inj.py (per-event "lu" re the voice),
  * master: static gain + tools/audio/mix.py's 5 ms look-ahead true-peak limiter to -14.0 LUFS
    integrated (with or without a voice); the ceiling is lowered until an AAC 256k encode
    measures below --tp-limit (-1.0 dBTP, with a small margin).
Writes audio/mix.wav (the film length from index.html, 48 kHz stereo, 24-bit, starting at t = 0
like vo.wav, which is zero-padded to the film length) and the stems audio/music.wav and
audio/sfx.wav exactly as they sit in the mix (master gain and the limiter's gain curve applied),
so vo' + music + sfx = mix. audio/mix.json tells tools/audio/verify_mix.py so.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import injsynth as L  # noqa: E402
from injsynth import SR, ns, db  # noqa: E402

import mix as tmix  # noqa: E402  (tools/audio/mix.py)


def aac_check(wav, m4a, bitrate="256k"):
    subprocess.run([L.ac.FFMPEG, "-y", "-hide_banner", "-loglevel", "error", "-i", wav, "-c:a", "aac",
                    "-b:a", bitrate, m4a], check=True)
    return L.ac.ffmpeg_ebur128(m4a)


def word_clarity(vo, bg, words, n):
    """Per word: voice minus background, momentary (400 ms) median over the voiced part of the
    word. Returns sorted [(LU, word, start)]."""
    Mv = L.momentary_curve(vo)
    Mb = L.momentary_curve(bg)
    hop = ns(0.01)
    v10 = np.repeat(L.ac.lin2db(np.sqrt(np.mean((vo[: len(vo) // hop * hop].mean(axis=1) ** 2)
                                                .reshape(-1, hop), axis=1))), hop)
    vact = np.zeros(n, bool)
    vact[: len(v10)] = v10 > (v10.max() - 40)
    out = []
    for w in words:
        s0, s1 = ns(w["start"]), ns(max(w["end"], w["start"] + 0.08))
        mk = vact[s0:s1]
        if mk.mean() < 0.3:
            continue
        out.append((float(np.median((Mv[s0:s1] - Mb[s0:s1])[mk])), w["word"], w["start"]))
    return sorted(out)


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--scratch", required=True)
    p.add_argument("--music-lu", type=float, default=-21.0)
    p.add_argument("--music-lu-alone", type=float, default=-12.0,
                   help="bed re the virtual voice when the film has no narrator (the bed is then the main layer)")
    p.add_argument("--duck-music", type=float, default=3.0)
    p.add_argument("--target-lufs", type=float, default=-14.0)
    p.add_argument("--ceiling", type=float, default=-1.8)
    p.add_argument("--tp-limit", type=float, default=-1.0)
    p.add_argument("--tp-margin", type=float, default=0.15, help="AAC true peak must sit this far under --tp-limit")
    a = p.parse_args(argv)
    t0 = time.time()
    doc = L.load_cues()
    n = ns(doc["duration"])
    vo = L.read_vo(n)  # vo.wav starts at t = 0; zero-padded to the film length (silence: no narrator)
    has_vo = L.has_voice(vo)
    vo_int = L.voice_level(vo)
    if not has_vo:
        a.music_lu = a.music_lu_alone
    mus = np.load(os.path.join(a.scratch, "music_raw.npy")).astype(np.float64)
    ev = np.load(os.path.join(a.scratch, "sfx_events_raw.npy")).astype(np.float64)
    room = np.load(os.path.join(a.scratch, "sfx_room_raw.npy")).astype(np.float64)
    mus, ev, room = (L.ac.fit_length(x, n) for x in (mus, ev, room))

    # bed level as heard (after the duck) over [0, title - 1.2 s]
    bed_end = ns(doc["title_t"] - 1.2)
    key = L.voice_key(vo)
    duck = db(-a.duck_music * key)[:, None]
    g_m = (vo_int + a.music_lu) - L.integrated((mus * duck)[:bed_end])
    mus = mus * db(g_m)
    mus_d = mus * duck
    # static gain the master will need; then peak-control the voice and the effects bus on
    # their own so the master limiter barely acts (it would otherwise modulate the bed)
    G0 = a.target_lufs - L.integrated(vo + mus_d + ev + room)
    vo_gr = 0.0
    if has_vo:
        vo, vo_gr, _ = tmix.limiter(vo, SR, a.ceiling - G0 - 0.3, lookahead=0.004, release_db_s=40.0)
    ev, ev_gr, _ = tmix.limiter(ev, SR, a.ceiling - G0 - 2.5, lookahead=0.002, release_db_s=60.0)
    sfx = ev + room

    pre = vo + mus_d + sfx
    ceiling = a.ceiling
    out_wav = os.path.join(L.AUDIO, "mix.wav")
    m4a = os.path.join(a.scratch, "mix_aac256.m4a")
    for _attempt in range(6):
        y, G, gr, curve = tmix.master(pre, SR, a.target_lufs, ceiling)
        L.ac.write_wav(out_wav, y, SR)
        aac = aac_check(out_wav, m4a)
        if aac["TP"] <= a.tp_limit - a.tp_margin:
            break
        ceiling -= (aac["TP"] - (a.tp_limit - a.tp_margin)) + 0.1
        print(f"  ! AAC true peak {aac['TP']:.2f} dBTP; ceiling -> {ceiling:.2f}")
    gl = curve[:, None]
    L.ac.write_wav(os.path.join(L.AUDIO, "music.wav"), mus_d * gl, SR)
    L.ac.write_wav(os.path.join(L.AUDIO, "sfx.wav"), sfx * gl, SR)
    wav_ff = L.ac.ffmpeg_ebur128(out_wav)

    # ---------------------------------------------------------------- report
    I_v = L.integrated(vo * gl) if has_vo else float("nan")
    ref_v = I_v if has_vo else vo_int + G  # the voice, or the virtual one, as it sits in the mix
    I_bed = L.integrated((mus * gl)[:bed_end])
    I_bed_d = L.integrated((mus_d * gl)[:bed_end])
    rep = {
        "mix_I": L.integrated(y), "mix_TP_4x": L.ac.true_peak_db(y), "ffmpeg_wav": wav_ff, "aac256": aac,
        "ceiling": ceiling, "master_gain_db": G, "limiter_max_gr_db": gr, "has_voice": has_vo,
        "voice_I": I_v if has_vo else None, "bed_pre_title_re_voice": I_bed - ref_v,
        "bed_after_duck_re_voice": I_bed_d - ref_v,
        "music_gain_db": g_m, "samples": len(y), "duration_s": len(y) / SR, "fx_bus_max_gr_db": ev_gr,
        "voice_peak_limit_max_gr_db": vo_gr,
    }
    if has_vo:
        Mv = L.momentary_curve(vo * gl)
        Mb = L.momentary_curve((mus_d + sfx) * gl)
        act = (key > 0.5) & (Mv > I_v - 10)
        d = (Mv - Mb)[act]
        words = json.load(open(os.path.join(L.PROJ, "story/words.json"), encoding="utf-8"))
        worst = word_clarity(vo * gl, (mus_d + sfx) * gl, words, n)
        rep["tightest_words"] = worst[:12]
        rep["speech_over_background_LU"] = {"p5": float(np.percentile(d, 5)), "p25": float(np.percentile(d, 25)),
                                            "median": float(np.median(d)), "min": float(d.min())}
    # room tone and music per shot
    Mr = L.momentary_curve(room * gl)
    Mm = L.momentary_curve(mus_d * gl)
    Me = L.momentary_curve(ev * gl)
    sc = []
    cuts = L.cut_times(doc) + [(doc["duration"], 0, "end")]
    for (t1, shot, scene), (t2, _, _) in zip(cuts[:-1], cuts[1:]):
        m = slice(ns(t1 + 0.2), ns(t2 - 0.2))
        pw = lambda c: float(10 * np.log10(np.mean(10 ** (c[m] / 10)) + 1e-20))  # noqa: E731
        sc.append({"shot": shot, "scene": scene, "t": t1, "room_re_voice": pw(Mr) - ref_v,
                   "music_re_voice": pw(Mm) - ref_v, "fx_re_voice": pw(Me) - ref_v})
    rep["scenes"] = sc
    json.dump(rep, open(os.path.join(a.scratch, "mix_report.json"), "w"), indent=1)
    # for tools/audio/verify_mix.py: music.wav and sfx.wav are written as they sit in the mix
    side = {"route": "stems", "vo": "vo.wav" if has_vo else None, "has_vo": has_vo, "master_gain_db": G,
            "ceiling_final": ceiling,
            "settings": {"target_lufs": a.target_lufs, "music_lu": a.music_lu, "duck_music": a.duck_music,
                         "tp_limit": a.tp_limit, "fade_out": float(doc.get("fade_s", 1.2)),
                         "normalize": not has_vo}}
    json.dump(side, open(os.path.join(L.AUDIO, "mix.json"), "w"), indent=1)

    print(f"mix_inj: {out_wav}  ({time.time() - t0:.1f}s)")
    who = f"voice {I_v:.1f} LUFS" if has_vo else f"no voice (virtual voice {ref_v:.1f} LUFS in the mix)"
    print(f"  {who} | bed pre-title {I_bed - ref_v:+.1f} LU before duck,"
          f" {I_bed_d - ref_v:+.1f} after (target {a.music_lu:+.1f})")
    print(f"  master gain {G:+.2f} dB, limiter max GR {gr:.2f} dB, ceiling {ceiling:.2f} dBTP;"
          f" voice peak control max {vo_gr:.1f} dB, effects-bus peak catch max {ev_gr:.1f} dB")
    print(f"  mix.wav: I {rep['mix_I']:.2f} LUFS, TP(4x) {rep['mix_TP_4x']:.2f} dBTP; ffmpeg I {wav_ff['I']:.1f},"
          f" TP {wav_ff['TP']:.2f}, LRA {wav_ff['LRA']:.1f}")
    print(f"  AAC 256k: I {aac['I']:.1f} LUFS, TP {aac['TP']:.2f} dBTP (limit {a.tp_limit})")
    if has_vo:
        s_ = rep["speech_over_background_LU"]
        print(f"  speech over background (momentary, voice active): median {s_['median']:+.1f}, p5 {s_['p5']:+.1f},"
              f" min {s_['min']:+.1f} LU")
        print("  tightest words (voice minus background, momentary median over the word):")
        print("    " + ", ".join(f"{w}@{t:.2f} {d:+.1f}" for d, w, t in rep["tightest_words"]))
    for r in sc:
        print(f"    shot {r['shot']:2d} {r['scene']:8s} @{r['t']:6.2f}: room {r['room_re_voice']:+6.1f}"
              f"  music {r['music_re_voice']:+6.1f}  fx {r['fx_re_voice']:+6.1f} LU")
    print(f"  {len(y)} samples = {len(y) / SR:.3f} s")


if __name__ == "__main__":
    main()

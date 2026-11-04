#!/usr/bin/env python3
"""Sound cue list for "Where the Needle Stops", keyed to narration words -> audio/cues.json.

Run by build.mjs (node tools/sound.mjs <video> --bespoke). Every event follows the "Event cues" table in
STORYBOARD.md. W(word, n, offset) = start of the n-th occurrence of that word + offset, matched the way
EX.cue matches (case and punctuation ignored), so picture and sound always agree; T(t) = an absolute
time. The film length comes from index.html's root; the title starts 0.6 s after the last word, as
in story.js. tools/audio/build_cues.py resolves the words into seconds.

Kinds "cut" carry picture structure that the music (chord changes) and the room tone read;
"music_dip" is a short ride of the music bed (under the very soft "all"); every other kind is a sound
effect. "lu" is the effect's target loudness: max momentary (400 ms) loudness re the voice's
integrated loudness, measured on the isolated event.
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import injsynth as L  # noqa: E402  (paths, the film length, the kit's tools on sys.path)
import build_cues  # noqa: E402  (tools/audio/build_cues.py)

PROJ = L.PROJ
WORDS = json.load(open(os.path.join(PROJ, "story/words.json"), encoding="utf-8"))
DURATION = L.film_length()
TITLE_T = round(WORDS[-1]["end"] + 0.6, 3)   # the title cut, 0.6 s after the last word
TITLE_WORDS_T0 = round(TITLE_T + 0.15, 3)    # title words pop at TITLE_WORDS_T0 + 0.2 s * i
TITLE_WORDS = ["WHERE", "THE", "NEEDLE", "STOPS"]
FADE_S = 1.2             # room tone and music fade over the last 1.2 s
SEED = 20261103


def W(word, n=1, offset=0.0):
    return {"word": word, "n": n, "offset": offset}


def T(t):
    return {"t": t}


# fmt: off
# (anchor, kind, extra fields)
EVENTS = [
    # ---- shots (picture cuts, from the storyboard's "Cut:" rows) ----------------------------
    (T(0.0),                   "cut", {"shot": 1, "scene": "clinic"}),
    (W("in", 1, -0.05),        "cut", {"shot": 2, "scene": "arm"}),
    (W("you", 1, -0.05),       "cut", {"shot": 3, "scene": "xray"}),
    (W("stomach", 1, -0.05),   "cut", {"shot": 4, "scene": "stomach"}),
    (W("so", 1, -0.05),        "cut", {"shot": 5, "scene": "xray"}),
    (W("where", 1, -0.05),     "cut", {"shot": 6, "scene": "section"}),
    (W("in", 2, -0.05),        "cut", {"shot": 7, "scene": "fat"}),
    (W("in", 3, -0.05),        "cut", {"shot": 8, "scene": "muscle"}),
    (W("and", 2, -0.05),       "cut", {"shot": 9, "scene": "vein"}),
    (W("then", 1, -0.05),      "cut", {"shot": 10, "scene": "heart"}),
    (W("from", 1, -0.05),      "cut", {"shot": 11, "scene": "arm"}),
    (T(TITLE_T),               "cut", {"shot": 12, "scene": "title"}),
    # ---- effects --------------------------------------------------------------------------------
    (W("needle", 1, 0.0),      "glint", {"lu": -17.0, "id": "needle glint"}),
    (W("arm", 1, 0.0),         "swish", {"lu": -21.0, "dur": 0.30, "id": "syringe arrives"}),
    (W("second", 1, 0.0),      "prick", {"lu": -19.0, "id": "needle in"}),
    (W("push", 1, 0.0),        "plunger", {"lu": -19.5, "end": W("skin", 1, 0.3), "id": "plunger"}),
] + [
    (W("ten", 1, round(0.1 * k, 2)), "drip", {"lu": -25.0, "k": k, "id": f"drop {k + 1}"})
    for k in range(10)
] + [
    (W("ten", 1, 0.1),         "pop", {"lu": -20.0, "note": 72, "id": "0.5 mL pill"}),
    (W("drops", 1, 0.3),       "pop", {"lu": -23.0, "note": 77, "id": "10 drops pill"}),
    (W("you", 1, -0.05),       "swish", {"lu": -21.0, "dur": 0.30, "id": "x-ray cut"}),
    (W("swallow", 1, 0.0),     "gulp", {"lu": -18.0, "id": "gulp"}),
    (W("swallow", 1, 0.2),     "slide_drop", {"lu": -22.5, "end": W("stomach", 1, 0.0), "id": "sliding drop"}),
    (W("stomach", 1, 0.0),     "bubble_bed", {"lu": -22.0, "end": W("so", 1, -0.05), "id": "acid bubbling"}),
    (W("insulin", 1, 0.0),     "splash", {"lu": -17.0, "size": 0.55, "id": "insulin splash"}),
    (W("same", 1, 0.0),        "splash", {"lu": -16.5, "size": 1.0, "id": "sandwich splash"}),
] + [
    (W("digests", 1, round(0.22 * k, 2)), "snip", {"lu": -24.5, "k": k, "id": f"snip {k + 1}"})
    for k in range(6)  # 13.51 .. 14.61, last one before so(1) - 0.1
] + [
    (W("digests", 1, 0.0),     "fizz", {"lu": -22.0, "mode": "digest", "end": W("so", 1, -0.1), "id": "digest fizz"}),
    (W("take", 1, 0.0),        "thud", {"lu": -16.5, "id": "cross thud"}),
    (W("shortcut", 1, 0.0),    "bright_whoosh", {"lu": -16.5, "id": "shortcut whoosh"}),
] + [
    (W("needle", 2, round(0.15 * k, 2)), "needle_slide", {"lu": -21.0, "k": k, "end": W("stops", 1, 0.0),
                                                         "id": f"needle slide {k + 1}"})
    for k in range(3)
] + [
    (W("stops", 1, round(0.05 * k, 2)), "tick", {"lu": -22.0, "k": k, "id": f"needle stop {k + 1}"})
    for k in range(3)
] + [
    (W("decides", 1, round(0.12 * k, 2)), "pop", {"lu": -18.0, "note": [72, 76, 79][k],
                                                  "id": ["fat pill", "muscle pill", "vein pill"][k]})
    for k in range(3)
] + [
    (W("seeps", 1, 0.0),       "fizz", {"lu": -23.0, "mode": "slow", "end": W("in", 3, 0.0), "id": "seep fizz"}),
    (W("hours", 1, 0.0),       "pop", {"lu": -18.0, "note": 74, "id": "hours pill"}),
    (W("hours", 1, 0.16),      "clock_tick", {"lu": -22.0, "id": "clock tick"}),
    (W("hours", 1, 0.44),      "clock_tick", {"lu": -24.0, "tock": True, "id": "clock tock"}),
    (W("packed", 1, 0.0),      "fizz", {"lu": -22.0, "mode": "fast", "end": W("minutes", 1, 0.6), "id": "soak fizz"}),
    (W("minutes", 1, 0.0),     "pop", {"lu": -18.0, "note": 77, "id": "minutes pill"}),
    (W("vein", 1, 0.0),        "fast_whoosh", {"lu": -17.0, "id": "vein race"}),
    (W("seconds", 1, 0.0),     "pop", {"lu": -18.0, "note": 81, "id": "seconds pill"}),
    (W("heart", 1, 0.0),       "heartbeat", {"lu": -17.0, "bpm": 75.0, "end": W("from", 1, -0.05), "id": "heartbeat"}),
    (W("pumps", 1, 0.0),       "shimmer", {"lu": -21.0, "end": W("minute", 1, 0.0), "id": "spread shimmer"}),
    (W("body", 1, 0.0),        "pop", {"lu": -18.0, "note": 84, "id": "~1 min pill"}),
    (W("all", 1, -0.08),       "music_dip", {"db": -3.0, "dur": 0.36, "note": "ride the bed under the soft 'all'"}),
    (W("from", 1, 0.1),        "soft_slide", {"lu": -20.0, "id": "needle out"}),
    (W("sting", 1, 0.0),       "pop", {"lu": -22.0, "note": 65, "plaster": True, "id": "plaster pop"}),
    (W("sting", 1, 0.03),      "sparkle", {"lu": -19.0, "id": "plaster sparkle"}),
] + [
    (T(round(TITLE_WORDS_T0 + 0.2 * i, 3)), "pop", {"lu": -13.5, "note": [69, 72, 74, 77][i], "title": True,
                                                    "id": f"title word {i + 1}"})
    for i in range(len(TITLE_WORDS))
]
# fmt: on


# storyboard "Event cues" row each effect belongs to (levels are judged per row)
ROWS = {
    "needle glint": "Needle glint", "syringe arrives": "Syringe arrives", "needle in": "Needle in",
    "plunger": "Plunger", "0.5 mL pill": "Pills", "10 drops pill": "Pills", "x-ray cut": "Cut: x-ray",
    "gulp": "Swallow", "sliding drop": "Swallow", "acid bubbling": "Acid", "insulin splash": "Insulin in",
    "sandwich splash": "Sandwich in", "digest fizz": "Digest", "cross thud": "Cross",
    "shortcut whoosh": "Shortcut", "fat pill": "Layer pills", "muscle pill": "Layer pills",
    "vein pill": "Layer pills", "seep fizz": "Seep", "hours pill": "Hours", "clock tick": "Hours",
    "clock tock": "Hours", "soak fizz": "Soak", "minutes pill": "Minutes", "vein race": "Race",
    "seconds pill": "Seconds", "heartbeat": "Heart", "spread shimmer": "Spread", "~1 min pill": "~1 min",
    "needle out": "Withdraw", "plaster pop": "Plaster", "plaster sparkle": "Plaster",
}


def row_of(ident):
    for pre, row in (("drop ", "Drops"), ("snip", "Digest"), ("needle slide", "Needles in"),
                     ("needle stop", "Needles stop"), ("title word", "Title words")):
        if ident.startswith(pre):
            return row
    return ROWS[ident]


def main():
    cues = []
    for ref, kind, extra in EVENTS:
        c = dict(ref)
        c["kind"] = kind
        if "lu" in extra:
            c["row"] = row_of(extra["id"])
        for k, v in extra.items():
            if k == "end":
                c["dur_to"] = v  # the span ends on this word (build_cues stores it as "dur")
            else:
                c[k] = v
        cues.append(c)
    spec = {"duration": DURATION, "vo": "vo.wav", "title": {"t": TITLE_T}, "cues": cues}
    try:
        doc = build_cues.build(spec, WORDS, DURATION)
    except ValueError as e:
        sys.exit(f"✗ {e}")
    doc["seed"] = SEED
    doc["fade_s"] = FADE_S
    doc["title_words"] = [{"t": round(TITLE_WORDS_T0 + 0.2 * i, 3), "word": w} for i, w in enumerate(TITLE_WORDS)]
    audio = os.path.join(PROJ, "audio")
    os.makedirs(audio, exist_ok=True)
    json.dump(doc, open(os.path.join(audio, "cues.json"), "w"), indent=1)
    print(f"wrote {os.path.join(audio, 'cues.json')}: {len(doc['cues'])} cues, {DURATION} s, title at {doc['title_t']} s")
    for c in doc["cues"]:
        extra = f"  dur {c['dur']:.2f}" if "dur" in c else ""
        print(f"  {c['t']:7.3f}  {c['kind']:14s} {c.get('id', c.get('scene', ''))}{extra}")


if __name__ == "__main__":
    main()

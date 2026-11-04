#!/usr/bin/env python3
"""Build audio/cues.json (absolute times) from the word-anchored cue sheet story/sound.json.

story/sound.json:
{
  "duration": 40.0, "vo": "vo.wav",
  "title": { "word": "sting", "edge": "end", "offset": 0.6 },
  "cues": [
    { "word": "needle", "kind": "sparkle" },
    { "word": "in", "n": 2, "offset": -0.05, "kind": "swish" },
    { "word": "one", "kind": "counter_roll", "dur_to": "minute" },
    { "t": 0.5, "kind": "sparkle" }
  ]
}

- "word" matches story/words.json the same way EX.cue does: lower case, every character outside
  [a-z0-9'] removed. "n" is the occurrence (1 = first), "edge" is "start" (default) or "end",
  "offset" is added in seconds.
- "t" is an absolute time in seconds. A film with no voice uses only "t" cues and needs no
  words.json.
- "dur_to" sets "dur" so the cue ends on that word's start. It takes a word, or an anchor
  like {"word": "minute", "n": 1, "edge": "end", "offset": 0.1}.
- "title" is where the music resolves. Leave it out and the music picks a point near the end.
- Every other field of a cue (gain_db, pan, pitch, align, dur, lu, id …) is passed through.

Usage:
  node tools/py.mjs tools/audio/build_cues.py <video dir> [--duration S] [--spec FILE] [--out FILE]
--duration overrides the sheet's "duration" (tools/sound.mjs passes the length from index.html).
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys


def norm(word):
    """The EX.cue key of a word: lower case, only [a-z0-9'] kept."""
    return re.sub(r"[^a-z0-9']", "", str(word).lower())


def resolver(words):
    keyed = [(norm(w["word"]), w) for w in (words or [])]

    def at(ref, what="cue"):
        if isinstance(ref, str):
            ref = {"word": ref}
        if "t" in ref:
            return float(ref["t"]) + float(ref.get("offset", 0.0))
        if "word" not in ref:
            raise ValueError(f"{what} has neither 't' nor 'word': {ref}")
        if not keyed:
            raise ValueError(f"{what} uses the word {ref['word']!r} but story/words.json is missing "
                             "(time the voice first, or use absolute 't' cues)")
        key, n = norm(ref["word"]), int(ref.get("n", 1))
        hits = [w for k, w in keyed if k == key]
        if len(hits) < n:
            raise ValueError(f"cue word not found: {ref['word']!r} #{n} (the words have {len(hits)})")
        return float(hits[n - 1][ref.get("edge", "start")]) + float(ref.get("offset", 0.0))

    return at


def build(spec, words, duration=None):
    """Resolve a sound.json dict against words.json -> the cues.json dict."""
    at = resolver(words)
    drop = ("word", "n", "edge", "offset", "dur_to")
    cues = []
    for c in spec.get("cues", []):
        out = {k: v for k, v in c.items() if k not in drop}
        out["t"] = round(at(c), 3)
        if "dur_to" in c:
            out["dur"] = round(at(c["dur_to"], "dur_to") - out["t"], 3)
        cues.append(out)
    cues.sort(key=lambda c: c["t"])
    dur = float(duration if duration is not None else spec["duration"])
    doc = {"duration": dur, "sr": 48000, "vo": spec.get("vo", "vo.wav")}
    if spec.get("title") is not None:
        doc["title_t"] = round(at(spec["title"], "title"), 3)
    for k in ("seed", "fade_s"):
        if k in spec:
            doc[k] = spec[k]
    doc["cues"] = cues
    late = [c for c in cues if c["t"] > dur]
    if late:
        print(f"  ! {len(late)} cue(s) after the end of the film ({dur} s): "
              + ", ".join(f"{c['kind']}@{c['t']}" for c in late[:5]))
    return doc


def main(argv=None):
    p = argparse.ArgumentParser(description="story/sound.json + story/words.json -> audio/cues.json")
    p.add_argument("video", help="the video folder")
    p.add_argument("--duration", type=float, help="film length in s (default: the sheet's 'duration')")
    p.add_argument("--spec", help="cue sheet (default: <video>/story/sound.json)")
    p.add_argument("--out", help="output (default: <video>/audio/cues.json)")
    a = p.parse_args(argv)
    spec_p = a.spec or os.path.join(a.video, "story", "sound.json")
    out_p = a.out or os.path.join(a.video, "audio", "cues.json")
    words_p = os.path.join(a.video, "story", "words.json")
    if not os.path.exists(spec_p):
        sys.exit(f"✗ {spec_p} is missing (write the cue sheet: see tools/audio/AUDIO.md)")
    spec = json.load(open(spec_p, encoding="utf-8"))
    words = json.load(open(words_p, encoding="utf-8")) if os.path.exists(words_p) else None
    try:
        doc = build(spec, words, a.duration)
    except ValueError as e:
        sys.exit(f"✗ {e}")
    os.makedirs(os.path.dirname(os.path.abspath(out_p)), exist_ok=True)
    json.dump(doc, open(out_p, "w", encoding="utf-8"), indent=1)
    title = f", title at {doc['title_t']} s" if "title_t" in doc else ""
    print(f"wrote {out_p}: {len(doc['cues'])} cues, {doc['duration']} s{title}")


if __name__ == "__main__":
    main()

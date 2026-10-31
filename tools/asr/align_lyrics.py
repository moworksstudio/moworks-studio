# Known lyrics -> a time for every sung word, with the app's Whisper (Turbo). Called by packages/voice/lyrics.mjs.
# The app transcribes speech, not singing: Whisper hears only part of a sung line, so the user gives the lyrics and this script finds their
# times. Adapted from the Moworks Motion kit's engine/audio/align.py (the Moworks kit; method and numbers of its lyric film, 07-08/10/2026):
#   1. Whisper with word times hears the song twice: one pass with its voice filter, then 8 s windows every 4 s without it (singing is
#      not speech), with the lyrics as Whisper's prompt (a section's own lines when the lyrics mark sections, else all of them);
#   2. the heard words are matched to the lyric words in order (global alignment on the words without tone marks, so "mua" = "múa");
#      per line only the largest group of matches within 3 s is kept; a matched lyric word takes the heard time ("heard");
#   3. the words in between ("placed") go on the song's attacks (librosa onsets) inside the sung time of their gap, a run of the same word
#      on consecutive beats; prompted words where nothing is sung are dropped (Whisper "hears" its prompt over an instrumental).
# Lyrics text: one sung line per line, repeats written out; "[17.5] line" or "[0:17.5] line" marks a rough section start (a script table's
# times), "#" headings and blank lines are skipped. Words in parentheses are backing vocals: a layer of their own, sung over the main line, so they stay out of its
# order; each takes a heard time near its place, or the attacks after the main word before it, and is marked "layer": "backing".
# A run of the same word keeps its count in the text; when Whisper heard another count in that stretch, "repeats" says so (never fitted quietly). Prints JSON lines: info, then
# {"type": "words", "words": [...], "lines": n, "heard": n, "placed": n, "dropped": n, "repeats": [{line, word, text, heard, attacks}]}.
# Usage: python -I align_lyrics.py <model dir> <audio 16 kHz mono WAV> <lyrics.txt> [--rhythm-audio plain.wav] [--language vi|auto]
#        [--device auto|cpu|cuda]
import argparse
import bisect
import json
import os
import re
import sys
import unicodedata
from difflib import SequenceMatcher

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from whisper_transcribe import STOCK, emit, load  # noqa: E402

SR = 16000
MARK = re.compile(r"^\[(?:(\d+):)?(\d+(?:[.,]\d+)?)\]\s*")
WHISPER_LAG = 0.08   # kit: Whisper's word starts land about 80 ms after the sung attack


def tokens(s):
    """a line's words as (word, backing?): what stands inside parentheses is backing vocals"""
    out = []
    for part in re.split(r"(\([^)]*\))", s):
        back = part.startswith("(") and part.endswith(")")
        out += [(w.strip("()"), back) for w in part.split() if re.search(r"\w", w)]
    return out


def lyric_lines(text):
    """the sung lines: each a list of main words, backing vocals left out (backing_after has them); a line of backing vocals alone is no line of the main order"""
    return [[w for w, b in t if not b] for t in _lines(text) if any(not b for _, b in t)]


def _lines(text):
    out = []
    for raw in text.splitlines():
        s = MARK.sub("", raw.strip())
        if not s or s.startswith("#") or set(s) <= set("-|: "):
            continue
        s = re.sub(r"^(?:[-*•]\s+|\d+[.)]\s+)", "", s)
        t = tokens(s)
        if t:
            out.append(t)
    return out


def backing_of(text):
    """the backing words in order, each with the number of main words sung before it: [(word, main words before)]"""
    out, n = [], 0
    for t in _lines(text):
        for w, b in t:
            if b:
                out.append((w, n))
            else:
                n += 1
    return out


def place_backing(text, words, H, onsets, eighth, dur):
    """backing words go after the main word they follow: on a word heard within 2 s of there, else on the next attacks, an eighth apart at most"""
    out, used = [], set()
    for w, before in backing_of(text):
        anchor = words[before - 1]["end"] if before > 0 else (words[0]["start"] if words else 0.0)
        if out and out[-1]["after"] == before:
            anchor = max(anchor, out[-1]["start"] + 0.12)
        best = None
        for i, h in enumerate(H):
            if i not in used and key(h["text"]) == key(w) and abs(h["start"] - anchor) <= 2.0 and (best is None or abs(h["start"] - anchor) < abs(H[best]["start"] - anchor)):
                best = i
        if best is not None:
            used.add(best)
            t, sure = max(0.0, H[best]["start"] - WHISPER_LAG), "heard"
        else:
            ons = [o for o in onsets if anchor <= o <= anchor + eighth * 1.6]
            t, sure = (ons[0] if ons else anchor), "placed"
        out.append({"text": w, "line": words[before - 1]["line"] if before > 0 else 1, "start": round(min(t, dur), 3), "end": round(min(t + eighth * 2, dur), 3), "sure": sure, "layer": "backing", "after": before})
    return out


def repeats_of(words, H, onsets):
    """runs of the same word (3 or more) whose count Whisper heard differently in their stretch: never fitted quietly, the owner is told"""
    out, i, n = [], 0, len(words)
    while i < n:
        j = i
        while j + 1 < n and key(words[j + 1]["text"]) == key(words[i]["text"]):
            j += 1
        if j - i + 1 >= 3:
            a = words[i - 1]["end"] if i > 0 else max(0.0, words[i]["start"] - 0.5)
            b = words[j + 1]["start"] if j + 1 < n else words[j]["end"] + 0.5
            k = key(words[i]["text"])
            heard = sum(1 for h in H if a - 0.1 <= h["start"] <= b + 0.1 and key(h["text"]) == k)
            attacks = sum(1 for o in onsets if a - 0.1 <= o <= b + 0.1)
            if heard and heard != j - i + 1:
                out.append({"line": words[i]["line"], "word": words[i]["text"], "text": j - i + 1, "heard": heard, "attacks": attacks})
        i = j + 1
    return out


def section_marks(text):
    """{line number: seconds} from "[17.5] ..." / "[0:17.5] ..." at the start of lyric lines"""
    out, n = {}, 0
    for raw in text.splitlines():
        s = raw.strip()
        m = MARK.match(s)
        if m:
            s = s[m.end():]
        if lyric_lines(s):
            n += 1
            if m:
                out[n] = round(int(m.group(1) or 0) * 60 + float(m.group(2).replace(",", ".")), 3)
    return out


def key(w):
    """lower case, no tone marks or punctuation: Whisper often drops or swaps Vietnamese tones on sung words"""
    w = unicodedata.normalize("NFD", w.lower().replace("đ", "d"))
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in w if unicodedata.category(c) != "Mn"))


def _sim(a, b):
    if a == b:
        return 2.0
    if not a or not b:
        return -1.0
    return 1.0 if SequenceMatcher(None, a, b).ratio() >= 0.75 else -1.0


def match(L, R):
    """global alignment (Needleman-Wunsch) of lyric keys L and heard keys R -> {lyric index: heard index}"""
    n, m, G = len(L), len(R), -0.6
    S = [[0.0] * (m + 1) for _ in range(n + 1)]
    T = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        S[i][0], T[i][0] = i * G, 1
    for j in range(1, m + 1):
        S[0][j], T[0][j] = j * G, 2
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            opts = (S[i - 1][j - 1] + _sim(L[i - 1], R[j - 1]), S[i - 1][j] + G, S[i][j - 1] + G)
            k = max(range(3), key=lambda x: opts[x])
            S[i][j], T[i][j] = opts[k], k
    pairs, i, j = {}, n, m
    while i > 0 or j > 0:
        k = T[i][j] if i > 0 and j > 0 else (1 if i > 0 else 2)
        if k == 0:
            if _sim(L[i - 1], R[j - 1]) > 0:
                pairs[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif k == 1:
            i -= 1
        else:
            j -= 1
    return pairs


def anchors(words, H):
    """the global match, then per line only the largest group of matches within 3 s of each other (a line is sung in one go), a lone
    match only on a line of 1-2 words, then in time order and not faster than about 8 words a second"""
    pairs = match([key(w["text"]) for w in words], [key(h["text"]) for h in H])
    byline, nline = {}, {}
    for i, j in sorted(pairs.items()):
        byline.setdefault(words[i]["line"], []).append((i, j))
    for w in words:
        nline[w["line"]] = nline.get(w["line"], 0) + 1
    good = []
    for ln, ps in byline.items():
        groups = []
        for i, j in sorted(ps, key=lambda x: H[x[1]]["start"]):
            if groups and H[j]["start"] - H[groups[-1][0][1]]["start"] <= 3.0:
                groups[-1].append((i, j))
            else:
                groups.append([(i, j)])
        g = max(groups, key=len)
        if len(g) >= 2 or nline[ln] <= 2:
            good += g
    keep = []
    for i, j in sorted(good):
        if keep and (H[j]["start"] <= H[keep[-1][1]]["start"] or H[j]["start"] - H[keep[-1][1]]["start"] < 0.12 * (i - keep[-1][0])):
            continue
        keep.append((i, j))
    return keep


def heard(model, y, lang, prompt=None, window=None):
    """every word Whisper hears: the part with its voice filter, then 8 s windows (4 s apart) without it; words under 25 % sure and
    Whisper's stock lines dropped; the same word twice within 0.15 s kept once. Also the sung regions (Silero voice activity)."""
    from faster_whisper.vad import VadOptions, get_speech_timestamps
    off0 = 0.0
    if window:
        a0, b0 = max(0, int(window[0] * SR)), min(len(y), int(window[1] * SR))
        y, off0 = y[a0:b0], a0 / SR
    out = []

    def take(segs, off):
        for s in segs:
            if STOCK.search(s.text):
                continue
            for w in s.words or []:
                t = w.word.strip()
                if t and (w.probability or 0) >= 0.25:
                    out.append({"text": t, "start": round(off0 + off + w.start, 3), "end": round(off0 + off + w.end, 3), "prompted": bool(prompt)})

    segs, info = model.transcribe(y, word_timestamps=True, language=lang, vad_filter=True, beam_size=5, condition_on_previous_text=False,
                                  initial_prompt=prompt)
    take(segs, 0.0)
    W, Hp = 8 * SR, 4 * SR
    for a in range(0, max(1, len(y) - Hp), Hp):
        segs, _ = model.transcribe(y[a:a + W], word_timestamps=True, language=info.language, vad_filter=False, beam_size=5,
                                   condition_on_previous_text=False, initial_prompt=prompt)
        take(segs, a / SR)
    out.sort(key=lambda w: w["start"])
    ded = []
    for w in out:
        if ded and key(ded[-1]["text"]) == key(w["text"]) and abs(ded[-1]["start"] - w["start"]) < 0.15:
            continue
        ded.append(w)
    vad = [(off0 + r["start"] / SR, off0 + r["end"] / SR) for r in get_speech_timestamps(y, VadOptions(min_silence_duration_ms=300, speech_pad_ms=120))]
    return ded, info, vad


def echo_filter(H, onsets, vad):
    """words from a pass that had the lyrics as Whisper's prompt are kept only where something is sung: an attack within 0.15 s or voice activity"""
    ons, keep = sorted(onsets), []
    for h in H:
        if h.get("prompted"):
            k = bisect.bisect_left(ons, h["start"] - 0.15)
            near = k < len(ons) and ons[k] <= h["start"] + 0.15
            sung = any(x - 0.1 <= h["start"] <= z + 0.1 for x, z in vad)
            if not (near or sung):
                continue
        keep.append(h)
    return keep, len(H) - len(keep)


def place(words, onsets, dur, eighth, vad, t0=0.0, beats=None):
    """times for the words not heard, gap by gap between heard words: the gap's sung time is shared by its lines in proportion to their
    word counts; inside its share a line is sung on consecutive attacks, at most an eighth apart; a run of the same word (3 or more) goes
    on consecutive beats; voice activity covering under a third of the gap is ignored (singing over a synth)"""
    n, i, T0 = len(words), 0, t0
    while i < n:
        if words[i].get("start") is not None:
            i += 1
            continue
        j = i
        while j < n and words[j].get("start") is None:
            j += 1
        a = words[i - 1]["end"] if i > 0 else T0
        b = words[j]["start"] if j < n else dur
        span = [(max(a, x), min(b, z)) for x, z in vad if min(b, z) - max(a, x) > 0.1]
        if not span or sum(z - x for x, z in span) < (b - a) / 3:
            span = [(a, max(b, a + 0.05))]
        tot = sum(z - x for x, z in span)
        groups = []
        for k in range(i, j):
            if groups and words[groups[-1][-1]]["line"] == words[k]["line"]:
                groups[-1].append(k)
            else:
                groups.append([k])
        per, acc, chain = tot / (j - i), 0.0, None

        def at(q):
            for x, z in span:
                if q <= z - x:
                    return x + q
                q -= z - x
            return span[-1][1]
        for g in groups:
            s0, s1 = acc, acc + per * len(g)
            acc = s1
            g0t, g1t = at(s0), at(s1)
            if chain is not None:
                g0t, chain = min(g0t, chain), None
            prev = words[g[0] - 1]["start"] + 0.12 if g[0] > 0 and words[g[0] - 1].get("start") is not None else g0t
            g0t = max(g0t, prev)
            run = 1
            while run < len(g) and key(words[g[run]]["text"]) == key(words[g[0]]["text"]):
                run += 1
            if run >= 3 and beats:
                limit = b - 0.05
                step = next((s for s in (beats[1] - beats[0] if len(beats) > 1 else 2 * eighth, eighth, eighth / 2)
                             if g0t + s * (run - 1) <= max(limit, g1t)), eighth / 2)
                grid = [beats[0] + k * step for k in range(int((dur - beats[0]) / step) + 2)]
                gs = next((x for x in grid if x >= g0t - 0.06), g0t)
                for q in range(run):
                    words[g[q]].update(start=round(gs + q * step, 3), sure="placed")
                t = gs + run * step
                rest = g[run:]
                if not rest:
                    chain = t
            else:
                ons = [o for o in onsets if g0t - 0.02 <= o <= max(g1t, g0t + 0.3)]
                t = max(ons[0], prev) if ons else g0t
                rest = g
            for k in rest:
                words[k].update(start=round(t, 3), sure="placed")
                nxt = [o for o in onsets if t + 0.12 <= o <= t + eighth * 1.6]
                t = nxt[0] if nxt else t + min(eighth, max(0.12, (g1t - g0t) / len(g)))
            for q, k in enumerate(g):
                e = words[g[q + 1]]["start"] if q + 1 < len(g) else min(b, words[k]["start"] + eighth * 2)
                words[k]["end"] = round(max(words[k]["start"] + 0.05, e), 3)
        i = j
    return repair(words, dur, T0)


def repair(words, dur, t0=0.0):
    """placed words that ran past the next fixed word: spread evenly between their fixed neighbours"""
    n, i = len(words), 0
    while i < n:
        if words[i]["sure"] != "placed":
            i += 1
            continue
        j = i
        while j < n and words[j]["sure"] == "placed":
            j += 1
        a = words[i - 1]["start"] if i > 0 else t0
        b = words[j]["start"] if j < n else dur
        ts = [words[k]["start"] for k in range(i, j)]
        if any(t <= a for t in ts) or any(t >= b for t in ts) or any(ts[k] >= ts[k + 1] for k in range(len(ts) - 1)):
            for q, k in enumerate(range(i, j)):
                words[k]["start"] = round(a + (b - a) * (q + 1) / (j - i + 1), 3)
        i = j
    for k in range(n):
        words[k]["end"] = round(min(words[k]["end"], words[k + 1]["start"]) if k + 1 < n else words[k]["end"], 3)
    for w in words:
        w["end"] = max(w["end"], round(w["start"] + 0.05, 3))
    return words


def rhythm(y):
    """onsets (attacks) and beats with librosa"""
    import librosa
    import numpy as np
    oe = librosa.onset.onset_strength(y=y.astype(np.float32), sr=SR)
    onsets = [round(float(t), 3) for t in librosa.onset.onset_detect(onset_envelope=oe, sr=SR, backtrack=True, units="time")]
    tempo, frames = librosa.beat.beat_track(onset_envelope=oe, sr=SR)
    beats = [round(float(t), 3) for t in librosa.frames_to_time(frames, sr=SR)]
    bpm = float(np.atleast_1d(tempo)[0]) or 120.0
    return onsets, beats, 30.0 / bpm


def align(model, y, text, lang, y_rhythm=None):
    """y: what Whisper hears (the voice band); y_rhythm: the plain mix for beats and attacks (the kick is under the voice band)"""
    lines = lyric_lines(text)
    if not lines:
        raise SystemExit("no lyric lines")
    words = [{"text": w, "line": li + 1, "start": None} for li, ws in enumerate(lines) for w in ws]
    dur = len(y) / SR
    onsets, beats, eighth = rhythm(y if y_rhythm is None else y_rhythm)
    # each section alone: its window, its own lines as Whisper's prompt, its words matched and placed inside it. With no marks the whole
    # song is one section, so the lyrics are always the prompt (the kit prompted only with sections; on a long megamix test,
    # Turbo heard 0/86 words without the prompt and 32/86 with it)
    marks = section_marks(text)
    marks.setdefault(1, 0.0)
    dropped, info, allH = 0, None, []
    m = sorted(marks.items())
    for k, (ln, t) in enumerate(m):
        ln2 = m[k + 1][0] if k + 1 < len(m) else len(lines) + 1
        a, bb = max(0.0, t - 1.0), min(dur, (m[k + 1][1] + 1.0) if k + 1 < len(m) else dur)
        idx = [i for i, w in enumerate(words) if ln <= w["line"] < ln2]
        sub = [words[i] for i in idx]
        Hk, info, vk = heard(model, y, lang, " ".join(" ".join(lines[i - 1]) for i in range(ln, ln2)), (a, bb))
        Hk, nd = echo_filter([h for h in Hk if a <= h["start"] <= bb], onsets, vk)
        dropped += nd
        allH += Hk
        for i, j in anchors(sub, Hk):     # Whisper's lag taken off first, so the words placed between keep their order
            sub[i].update(start=round(max(0.0, Hk[j]["start"] - WHISPER_LAG), 3), end=Hk[j]["end"], sure="heard")
        end = m[k + 1][1] if k + 1 < len(m) else dur
        sub = place(sub, onsets, end, eighth, vk, max(0.0, t - 0.5), beats)
        for i, w in zip(idx, sub):
            words[i] = w
    for k in range(1, len(words)):       # in order: never at or before the word sung before it
        if words[k]["start"] <= words[k - 1]["start"]:
            words[k]["start"] = round(words[k - 1]["start"] + 0.05, 3)
    for k, w in enumerate(words):        # each word ends after it starts and not after the next one starts
        nxt = words[k + 1]["start"] if k + 1 < len(words) else w["start"] + 0.5
        w["end"] = round(min(max(w["end"], w["start"] + 0.05), nxt), 3)
    repeats = repeats_of(words, allH, onsets)
    backing = place_backing(text, words, allH, onsets, eighth, dur)
    return words, info, len(lines), dropped, repeats, backing


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("model")
    ap.add_argument("audio")
    ap.add_argument("lyrics")
    ap.add_argument("--rhythm-audio", default=None, help="the plain mix (16 kHz mono WAV) for beats and attacks; default: <audio>")
    ap.add_argument("--language", default="auto")
    ap.add_argument("--device", default="auto")
    a = ap.parse_args()
    import wave
    import numpy as np

    def wav(path):
        with wave.open(path, "rb") as w:
            return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    with open(a.lyrics, encoding="utf-8-sig") as f:
        text = f.read()
    model, device = load(a.model, a.device)
    y = wav(a.audio)
    words, info, nlines, dropped, repeats, backing = align(model, y, text, None if a.language == "auto" else a.language,
                                                           wav(a.rhythm_audio) if a.rhythm_audio else None)
    emit({"type": "info", "language": info.language, "probability": round(info.language_probability, 3), "duration": round(len(y) / SR, 3), "device": device})
    emit({"type": "words", "words": words, "backing": backing, "lines": nlines, "heard": sum(w["sure"] == "heard" for w in words),
          "placed": sum(w["sure"] == "placed" for w in words), "dropped": dropped, "repeats": repeats})


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Word times for the script, from the final narration (vo.wav) and its transcript.

    node tools/py.mjs tools/voice/align_whisper_islands.py <vo.wav> <script.txt> <transcript.json> <words.json>
    node tools/py.mjs tools/voice/align_whisper_islands.py --count <script.txt>

Align (default): every script word goes to the speech island holding its transcript start (or the
next island when that start falls in a pause). Inside an island the words are spread by syllable
weight, and each boundary snaps to the deepest energy dip within 70 ms. Writes
[{"word", "start", "end"}, …], one entry per script word, in script order.

--count: prints the number of script words (the length words.json must have).

Script words are the runs of letters, digits and apostrophes in script.txt (a number such as
"1,250" or "3.5" or "10%" is one word). Matching ignores case and punctuation and reads numbers the
way they are spoken: a transcript's "109" matches the script's "one hundred and nine" (or "one
hundred nine"), "1990" matches "nineteen ninety", "10%" matches "ten percent", "3rd" matches
"third", and the same works the other way round. British and American spellings match
(colour/color, realise/realize, centre/center).
"""
from __future__ import annotations

import difflib
import json
import os
import re
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# --------------------------------------------------------------------------- words and numbers
TOKEN = re.compile(r"[$£€]?\d+(?:[.,]\d+)*(?:%|st|nd|rd|th|s)?|[A-Za-z0-9']+|&")
ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven",
        "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
SCALES = [(10 ** 12, "trillion"), (10 ** 9, "billion"), (10 ** 6, "million"), (1000, "thousand")]
ORD = {"one": "first", "two": "second", "three": "third", "five": "fifth", "eight": "eighth",
       "nine": "ninth", "twelve": "twelfth"}
SAME = {"ok": "okay", "mr": "mister", "mrs": "missus", "dr": "doctor", "vs": "versus", "&": "and"}
CURRENCY = {"$": "dollars", "£": "pounds", "€": "euros"}


def tokens(text):
    """Script or transcript text -> words as written (curly apostrophes made straight)."""
    text = text.replace("’", "'").replace("‘", "'")
    out = []
    for t in TOKEN.findall(text):
        t = t.strip("'")
        if t and re.search(r"[A-Za-z0-9&]", t):
            out.append(t)
    return out


def under_100(n):
    if n < 20:
        return [ONES[n]]
    t, o = divmod(n, 10)
    return [TENS[t]] + ([ONES[o]] if o else [])


def under_1000(n, use_and):
    h, r = divmod(n, 100)
    out = []
    if h:
        out += [ONES[h], "hundred"]
        if r and use_and:
            out.append("and")
    if r or not h:
        out += under_100(r)
    return out


def cardinal(n, use_and=True):
    if n == 0:
        return ["zero"]
    out = []
    for value, name in SCALES:
        if n >= value:
            q, n = divmod(n, value)
            out += cardinal(q, use_and) + [name]
    if n:
        if out and n < 100 and use_and:
            out.append("and")
        out += under_1000(n, use_and)
    return out


def ordinal(words):
    last = words[-1]
    if last in ORD:
        return words[:-1] + [ORD[last]]
    if last.endswith("y"):
        return words[:-1] + [last[:-1] + "ieth"]
    return words[:-1] + [last + "th"]


def year(n):
    """1990 -> nineteen ninety, 2024 -> twenty twenty four, 1905 -> nineteen oh five"""
    hi, lo = divmod(n, 100)
    if lo == 0:
        return under_100(hi) + ["hundred"]
    return under_100(hi) + (["oh", ONES[lo]] if lo < 10 else under_100(lo))


def spoken(tok):
    """Ways a written word can be spoken: a list of word lists (the first is the default)."""
    low = tok.lower()
    if low in SAME:
        return [[SAME[low]]]
    m = re.fullmatch(r"([$£€]?)(\d+(?:[.,]\d+)*)(%|st|nd|rd|th|s)?", low)
    if not m:
        return [[low]]
    cur, num, suf = m.group(1), m.group(2), m.group(3) or ""
    if re.fullmatch(r"\d{1,3}(,\d{3})+", num):
        num = num.replace(",", "")
    whole, frac = (num.split(".", 1) + [""])[:2] if "." in num else (num.replace(",", ""), "")
    if not whole.isdigit():
        return [[low]]
    n = int(whole)
    forms = [cardinal(n, True), cardinal(n, False)]
    if 1100 <= n <= 2099 and not frac and n % 1000:
        forms.insert(0 if not suf and 1100 <= n <= 1999 else 2, year(n))
        if 2001 <= n <= 2009:
            forms.append(["two", "thousand", "and", ONES[n - 2000]])
    if n == 0:
        forms.append(["oh"])
    for f in list(forms):  # "a hundred", "a thousand", "a million"
        if len(f) > 1 and f[0] == "one" and f[1] in ("hundred", "thousand", "million", "billion"):
            forms.append(["a"] + f[1:])
    if frac:
        forms = [f + ["point"] + [ONES[int(d)] for d in frac] for f in forms]
    if suf in ("st", "nd", "rd", "th"):
        forms = [ordinal(f) for f in forms]
    elif suf == "s" and not frac:  # the 1990s
        forms = [f[:-1] + [f[-1][:-1] + "ies" if f[-1].endswith("y") else f[-1] + "s"] for f in forms]
    elif suf == "%":
        forms = [f + ["percent"] for f in forms]
    if cur:
        forms = [f + [CURRENCY[cur]] for f in forms]
    uniq = []
    for f in forms:
        if f not in uniq:
            uniq.append(f)
    return uniq


def canon(w):
    """Lower case, letters/digits/apostrophes only, one spelling for British/American pairs."""
    w = re.sub(r"[^a-z0-9']", "", w.lower()).strip("'")
    if len(w) >= 6:
        w = re.sub(r"our(s?)$", r"or\1", w)
        w = re.sub(r"is(e|ed|es|ing|ation|ations)$", r"iz\1", w)
        w = re.sub(r"ys(e|ed|es|ing)$", r"yz\1", w)
    if len(w) >= 5:
        w = re.sub(r"tre(s?)$", r"ter\1", w)
    return {"grey": "gray", "aluminium": "aluminum"}.get(w, w)


class Seq:
    """A run of written words, each with its spoken forms; flat() spells them out word by word."""

    def __init__(self, toks):
        self.toks = toks
        self.forms = [[[canon(x) for x in f] for f in spoken(t)] for t in toks]
        self.pick = [0] * len(toks)

    def flat(self):
        out = []
        for i, fs in enumerate(self.forms):
            f = fs[self.pick[i]]
            for q, w in enumerate(f):
                out.append((i, q, len(f), w))
        return out


def match(a, b):
    """SequenceMatcher over the spelled-out words, choosing for each number the spoken form that
    matches the other side best. Returns (flat a, flat b, opcodes)."""
    def run():
        fa, fb = a.flat(), b.flat()
        sm = difflib.SequenceMatcher(None, [x[3] for x in fa], [x[3] for x in fb], autojunk=False)
        return fa, fb, sm

    fa, fb, sm = run()
    best = sum(m.size for m in sm.get_matching_blocks())
    # only numbers whose spelled-out words did not all match need another spoken form
    hit_a, hit_b = set(), set()
    for m in sm.get_matching_blocks():
        hit_a.update(range(m.a, m.a + m.size))
        hit_b.update(range(m.b, m.b + m.size))
    todo = []
    for seq, flat, hit in ((a, fa, hit_a), (b, fb, hit_b)):
        miss = {x[0] for k, x in enumerate(flat) if k not in hit}
        todo += [(seq, i) for i in sorted(miss) if len(seq.forms[i]) > 1]
    for seq, i in todo:
        keep = seq.pick[i]
        for k in range(len(seq.forms[i])):
            if k == keep:
                continue
            seq.pick[i] = k
            _, _, sm2 = run()
            score = sum(m.size for m in sm2.get_matching_blocks())
            if score > best:
                best, keep = score, k
        seq.pick[i] = keep
    fa, fb, sm = run()
    return fa, fb, sm


def read_transcript(path):
    raw = json.load(open(path, encoding="utf-8"))
    raw = raw if isinstance(raw, list) else raw.get("words", [])
    toks, times = [], []
    for w in raw:
        sub = tokens(str(w.get("text", w.get("word", ""))))
        s, e = float(w["start"]), float(w["end"])
        for q, t in enumerate(sub):
            toks.append(t)
            times.append(s + (e - s) * q / len(sub))
    return toks, times


def read_script(path):
    return tokens(open(path, encoding="utf-8").read())


# --------------------------------------------------------------------------- align
def syl(w):
    w = w.lower().strip("'")
    n = len(re.findall(r"[aeiouy]+", w))
    if w.endswith("e") and not w.endswith(("le", "ee")) and n > 1:
        n -= 1
    return max(1, n) + (0.35 if len(w) > 6 else 0)


def align(vo_p, script_p, tx_p, out_p):
    from vo_tighten import SR, islands, load

    x = load(vo_p)
    H = 0.005
    h = int(SR * H)
    e = np.array([20 * np.log10(np.sqrt(np.mean(x[i * h:(i + 1) * h] ** 2)) + 1e-9) for i in range(len(x) // h)])
    es = np.convolve(e, np.ones(4) / 4, mode="same")
    isl = islands(x, min_sil=0.05)
    script = read_script(script_p)
    if not script:
        sys.exit(f"✗ {script_p} has no words")
    toks, times = read_transcript(tx_p)
    if not toks:
        sys.exit(f"✗ {tx_p} has no words (was the narration silent?)")
    sw, hw = Seq(script), Seq(toks)
    fa, fb, sm = match(sw, hw)
    ws = [None] * len(script)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            i = fa[blk.a + k][0]
            if ws[i] is None:
                ws[i] = times[fb[blk.b + k][0]]
    known = [i for i, v in enumerate(ws) if v is not None]
    if not known:
        sys.exit("✗ the transcript shares no words with the script (wrong take or wrong script?)")
    for i in range(len(ws)):
        if ws[i] is None:
            prev = next((ws[j] for j in range(i - 1, -1, -1) if ws[j] is not None), None)
            nxt = next((ws[j] for j in range(i + 1, len(ws)) if ws[j] is not None), None)
            ws[i] = (prev + nxt) / 2 if prev is not None and nxt is not None else \
                (nxt - 0.05 if nxt is not None else prev + 0.05)

    def island_of(t):
        for j, (a, b) in enumerate(isl):
            if t <= b:
                return j
        return len(isl) - 1

    asg, cur = [], 0
    for t in ws:
        cur = max(island_of(t), cur)
        asg.append(cur)
    weight = [sum(syl(w) for w in sw.forms[i][sw.pick[i]]) for i in range(len(script))]
    out = [None] * len(script)
    for j in sorted(set(asg)):
        idx = [i for i in range(len(script)) if asg[i] == j]
        a, b = isl[j]
        wt = np.array([weight[i] for i in idx])
        cum = np.r_[0, np.cumsum(wt)] / wt.sum()
        st = [a]
        for q in range(1, len(idx)):
            est = a + (b - a) * cum[q]
            lo = max(int((est - 0.07) / H), int((st[-1] + 0.07) / H))
            hi = max(int((est + 0.07) / H), lo + 1)
            lo, hi = min(lo, len(es) - 1), min(hi, len(es))
            st.append((lo + int(np.argmin(es[lo:hi]))) * H if hi > lo else st[-1] + 0.07)
        for q, i in enumerate(idx):
            out[i] = {"word": script[i], "start": round(st[q], 3), "end": round(st[q + 1] if q + 1 < len(idx) else b, 3)}
    json.dump(out, open(out_p, "w", encoding="utf-8"), indent=1)
    for a, b in isl:
        line = " ".join(w["word"] for w in out if a - 1e-6 <= w["start"] <= b)
        if line:
            print(f"{a:6.2f}-{b:6.2f}  {line}")
    print(f"wrote {out_p}: {len(out)} words, speech {out[0]['start']:.2f}-{out[-1]['end']:.2f} s")


def main():
    a = sys.argv[1:]
    if a[:1] == ["--count"] and len(a) == 2:
        print(len(read_script(a[1])))
        return
    if len(a) != 4:
        sys.exit(__doc__.split("\n\n")[1])
    align(*a)


if __name__ == "__main__":
    main()

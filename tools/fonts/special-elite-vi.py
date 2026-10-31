# Special Elite (Astigmatic, Apache-2.0, google/fonts apache/specialelite) with the Vietnamese letters added, for the Map Explainer style.
# The font's own letters and marks are composed; the three marks it lacks (hook above, horn, dot below) are drawn from its own comma and
# period, so they keep its worn edge. Apache-2.0 allows this; the name changes to "Special Elite VN" and the file says it was modified.
# Usage: python special-elite-vi.py <SpecialElite-Regular.ttf> <out.ttf>
import sys
import unicodedata

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

BASES = "aăâeêioôơuưyAĂÂEÊIOÔƠUƯY"
TONES = {"̀": "grave", "́": "acute", "̃": "tilde", "̉": "hook", "̣": "dotbelow"}
PLAIN = {"ă": ("a", "breve"), "â": ("a", "circumflex"), "ê": ("e", "circumflex"), "ô": ("o", "circumflex"), "ơ": ("o", "horn"), "ư": ("u", "horn"),
         "Ă": ("A", "breve"), "Â": ("A", "circumflex"), "Ê": ("E", "circumflex"), "Ô": ("O", "circumflex"), "Ơ": ("O", "horn"), "Ư": ("U", "horn")}
GAP = 70          # font units between a letter and the mark above it
HORN_ROOM = 130   # the wider advance of a letter with a horn: the font is proportional, so the next letter keeps clear of it


def outline(gs, name):
    pen = DecomposingRecordingPen(gs)
    gs[name].draw(pen)
    return pen.value


def bounds(gs, value):
    pen = BoundsPen(gs)
    play(value, pen)
    return pen.bounds


def play(value, pen):
    for op, args in value:
        getattr(pen, op)(*args)


def place(value, matrix):
    out = []
    from fontTools.pens.recordingPen import RecordingPen
    rec = RecordingPen()
    tp = TransformPen(rec, matrix)
    play(value, tp)
    out = rec.value
    return out


def stroke_mark(points, thick, thin):
    """A pen stroke through the points, thick at the start and thin at the end, as a closed outline."""
    left, right = [], []
    n = len(points)
    for i, (x, y) in enumerate(points):
        ax, ay = points[max(i - 1, 0)]
        bx, by = points[min(i + 1, n - 1)]
        dx, dy = bx - ax, by - ay
        ln = (dx * dx + dy * dy) ** 0.5 or 1
        w = (thick + (thin - thick) * i / (n - 1)) / 2
        left.append((x - dy / ln * w, y + dx / ln * w))
        right.append((x + dy / ln * w, y - dx / ln * w))
    pts = left + right[::-1]
    return [("moveTo", (pts[0],))] + [("lineTo", (p,)) for p in pts[1:]] + [("closePath", ())]


def main(src, dst):
    f = TTFont(src)
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    hmtx = f["hmtx"]
    glyf = f["glyf"]
    G = lambda ch: cmap[ord(ch)]

    def centre(b):
        return (b[0] + b[2]) / 2

    marks = {}
    for name, cp in (("grave", 0x60), ("acute", 0xB4), ("tilde", 0x2DC), ("circumflex", 0x2C6), ("breve", 0x2D8)):
        if cp not in cmap:
            raise SystemExit(f"no {name}")
        marks[name] = outline(gs, cmap[cp])
    comma, period = outline(gs, G(",")), outline(gs, G("."))
    cb, pb = bounds(gs, comma), bounds(gs, period)
    # dot below: the font's period, smaller; horn and hook above: drawn with a pen, the horn leaving the letter's shoulder
    k = 0.8
    marks["dotbelow"] = place(period, (k, 0, 0, k, 0, 0))
    marks["horn"] = stroke_mark([(-160, -170), (10, -110), (130, 0), (190, 150)], 66, 128)
    marks["hook"] = stroke_mark([(-130, 330), (-50, 430), (90, 440), (150, 340), (80, 250), (5, 200), (0, 80)], 84, 46)

    def compose(parts, width):
        pen = TTGlyphPen(None)
        for v in parts:
            play(v, pen)
        return pen.glyph(), width

    def on_top(letter_v, mark, *, lift=0, shift=0):
        lb, mb = bounds(gs, letter_v), bounds(gs, marks[mark])
        dx = centre(lb) - centre(mb) + shift
        dy = lb[3] + GAP + lift - mb[1]
        return place(marks[mark], (1, 0, 0, 1, dx, dy))

    def built(base, mark):
        v = outline(gs, G(base))
        if mark == "horn":
            lb = bounds(gs, v)
            return v + place(marks["horn"], (1, 0, 0, 1, lb[2] - 50, lb[3] - 30))
        return v + on_top(v, mark)

    new = {}

    def add(ch, value, width):
        new[ch] = compose([value], width)

    for ch, (base, mark) in PLAIN.items():
        if ord(ch) not in cmap:
            add(ch, built(base, mark), hmtx[G(base)][0] + (HORN_ROOM if mark == "horn" else 0))
    for ch, (lo, up) in {"đ": ("d", None), "Đ": ("D", None)}.items():
        if ord(ch) not in cmap:
            v = outline(gs, G(lo))
            b = bounds(gs, v)
            hy = b[1] + (b[3] - b[1]) * (0.78 if ch == "đ" else 0.5)
            hx = b[2] - (b[2] - b[0]) * 0.3 if ch == "đ" else b[0] + (b[2] - b[0]) * 0.22
            h = outline(gs, G("-"))
            hb = bounds(gs, h)
            sx = (b[2] - b[0]) * 0.46 / (hb[2] - hb[0])
            sy = 0.72
            bar = place(h, (sx, 0, 0, sy, hx - (hb[0] + hb[2]) / 2 * sx, hy - (hb[1] + hb[3]) / 2 * sy))
            add(ch, v + bar, hmtx[G(lo)][0])

    # the letters with a tone: the base letter (itself maybe new) and the tone, the tone beside a circumflex's peak as Vietnamese print sets it
    def base_outline(ch):
        if ord(ch) in cmap:
            return outline(gs, G(ch))
        b, m = PLAIN[ch]
        return built(b, m)

    for b in BASES:
        for comb, tone in TONES.items():
            ch = unicodedata.normalize("NFC", b + comb)
            if len(ch) != 1 or ord(ch) in cmap:
                continue
            v = base_outline(b)
            plain = outline(gs, G(unicodedata.normalize("NFD", b)[0]))
            width = hmtx[G(unicodedata.normalize("NFD", b)[0])][0] + (HORN_ROOM if b in "ơưƠƯ" else 0)
            if tone == "dotbelow":
                lb, mb = bounds(gs, plain), bounds(gs, marks["dotbelow"])
                add(ch, v + place(marks["dotbelow"], (1, 0, 0, 1, centre(lb) - centre(mb), lb[1] - 60 - mb[3])), width)
                continue
            # a horn is beside the letter, not over it: the tone sits on the letter itself
            lb, mb = bounds(gs, plain if b in "ơưƠƯ" else v), bounds(gs, marks[tone])
            hat = b in "âêôÂÊÔ"
            br = b in "ăĂ"
            dx = centre(bounds(gs, plain)) - centre(mb)
            if hat:
                dx += (lb[2] - lb[0]) * 0.28 if tone != "grave" else -(lb[2] - lb[0]) * 0.28
            lift = -130 if hat else GAP
            dy = lb[3] + lift - mb[1] if not br else lb[3] + 30 - mb[1]
            add(ch, v + place(marks[tone], (1, 0, 0, 1, dx, dy)), width)

    for ch, (g, w) in new.items():
        name = f"uni{ord(ch):04X}"
        glyf[name] = g
        g.recalcBounds(glyf)
        hmtx[name] = (int(w), int(g.xMin))
        for t in f["cmap"].tables:
            if t.isUnicode():
                t.cmap[ord(ch)] = name
    f.setGlyphOrder(glyf.glyphOrder)

    # the kerning, the hints and the shaping tables speak of the original glyphs only; they stay valid for those, and new glyphs have none
    for rec in f["name"].names:
        s = rec.toUnicode()
        if rec.nameID in (1, 3, 4, 16):
            rec.string = s.replace("Special Elite", "Special Elite VN")
        elif rec.nameID == 6:
            rec.string = s.replace("SpecialElite", "SpecialEliteVN")
        elif rec.nameID == 0:
            rec.string = s + " Vietnamese letters added by Moworks Studio, 2026 (a modified version)."
    f.save(dst)
    print(f"added {len(new)} letters: {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

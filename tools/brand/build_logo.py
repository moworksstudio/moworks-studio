# Builds the Moworks app logo files from the brand .ai (PDF-compatible): the badge as vector paths, and the wordmark
# "MOWORKS production studio" on one line from the glyph outlines of the fonts embedded in the file (Bebas Neue Bold, Maven Pro Regular).
# Source variant: the large lockup on the artboard (badge at x 101-197, words at x 207-340).
import io, json, sys
sys.path.insert(0, sys.argv[1])
import pymupdf
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

doc = pymupdf.open(sys.argv[2])
out = sys.argv[3]
page = doc[0]
DESC_SCALE = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0   # size of "production studio" relative to the original lockup

# ---- badge: the two dark paths of the large variant
def path_d(d):
    parts, cur = [], None
    f = lambda p: f"{p.x:.3f} {p.y:.3f}"
    for it in d["items"]:
        op = it[0]
        if op == "l":
            a, b = it[1], it[2]
            if cur is None or abs(cur.x - a.x) > 1e-3 or abs(cur.y - a.y) > 1e-3:
                parts.append("M" + f(a))
            parts.append("L" + f(b)); cur = b
        elif op == "c":
            a, c1, c2, b = it[1], it[2], it[3], it[4]
            if cur is None or abs(cur.x - a.x) > 1e-3 or abs(cur.y - a.y) > 1e-3:
                parts.append("M" + f(a))
            parts.append("C" + f(c1) + " " + f(c2) + " " + f(b)); cur = b
        else:
            raise SystemExit("unexpected item " + op)
    if d.get("closePath"):
        parts.append("Z")
    return "".join(parts)

badge = [d for d in page.get_drawings() if d["rect"].x0 >= 100 and d["rect"].x1 <= 197 and d["rect"].y0 >= 396 and d["rect"].y1 <= 486]
assert len(badge) == 2, len(badge)
bx0 = min(d["rect"].x0 for d in badge); by0 = min(d["rect"].y0 for d in badge)
bx1 = max(d["rect"].x1 for d in badge); by1 = max(d["rect"].y1 for d in badge)
badge_d = [path_d(d) for d in badge]

# ---- glyphs from the embedded fonts
fonts = {}
for f in page.get_fonts(full=True):
    name, ext, typ, buf = doc.extract_font(f[0])
    fonts[f[3].split("+")[-1]] = TTFont(io.BytesIO(buf))

def glyphs(span_font, size, chars, dx=0.0, dy=0.0, scale=1.0, ox=None, oy=None):
    font = fonts[span_font]
    order = font.getGlyphOrder(); gs = font.getGlyphSet(); upem = font["head"].unitsPerEm
    s = size * scale / upem
    x0 = chars[0][2][0] if ox is None else ox
    y0 = chars[0][2][1] if oy is None else oy
    paths, bounds = [], []
    for ch, gid, (x, y) in chars:
        g = gs[order[gid]]
        tx = x0 + (x - chars[0][2][0]) * scale + dx
        t = (s, 0, 0, -s, tx, y0 + dy)
        pen = SVGPathPen(gs); g.draw(TransformPen(pen, t))
        if pen.getCommands():
            paths.append(pen.getCommands())
            bp = BoundsPen(gs); g.draw(TransformPen(bp, t))
            if bp.bounds: bounds.append(bp.bounds)
    return paths, bounds

big = [t for t in page.get_texttrace() if 400 <= t["bbox"][1] <= 470 and 200 <= t["bbox"][0] <= 345]
caps = [c for t in big if t["font"] == "BebasNeue-Bold" for c in t["chars"]]
caps = [(chr(c[0]), c[1], c[2]) for c in sorted(caps, key=lambda c: c[2][0])]
desc_t = next(t for t in big if t["font"] == "MavenPro-Regular")
desc = [(chr(c[0]), c[1], c[2]) for c in desc_t["chars"]]
cap_size = next(t for t in big if t["font"] == "BebasNeue-Bold")["size"]

cap_paths, cap_bounds = glyphs("BebasNeue-Bold", cap_size, caps)
cap_right = max(b[2] for b in cap_bounds); cap_top = min(b[1] for b in cap_bounds); baseline = caps[0][2][1]
cap_h = baseline - cap_top
gap = cap_h * 0.32                                                 # space between the two words on one line
desc_paths, desc_bounds = glyphs("MavenPro-Regular", desc_t["size"], desc, scale=DESC_SCALE, ox=cap_right + gap, oy=baseline)
# the descriptor starts at the left edge of its first glyph ink, not its origin
first_ink = min(b[0] for b in desc_bounds)
shift = (cap_right + gap) - first_ink
desc_paths, desc_bounds = glyphs("MavenPro-Regular", desc_t["size"], desc, scale=DESC_SCALE, ox=cap_right + gap + shift, oy=baseline)

allb = cap_bounds + desc_bounds
wx0 = min(b[0] for b in cap_bounds); wy0 = min(b[1] for b in allb); wx1 = max(b[2] for b in allb); wy1 = max(b[3] for b in allb)
W, H = wx1 - wx0, wy1 - wy0
def svg_wordmark(fill_caps, fill_desc):
    t = f"translate({-wx0:.3f} {-wy0:.3f})"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.3f} {H:.3f}">\n'
            f'  <!-- Moworks wordmark, one line. Glyphs from Bebas Neue Bold and Maven Pro Regular as embedded in "Moworks Logo.ai" (outlined). -->\n'
            f'  <g transform="{t}">\n    <path fill="{fill_caps}" d="{"".join(cap_paths)}"/>\n    <path fill="{fill_desc}" d="{"".join(desc_paths)}"/>\n  </g>\n</svg>\n')

def svg_badge(fill, size=64, pad=8, bg=None, rx=14):
    bw, bh = bx1 - bx0, by1 - by0
    k = (size - 2 * pad) / max(bw, bh)
    tx = (size - bw * k) / 2 - bx0 * k; ty = (size - bh * k) / 2 - by0 * k
    rect = f'  <rect width="{size}" height="{size}" rx="{rx}" fill="{bg}"/>\n' if bg else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">\n'
            f'  <!-- Moworks badge from "Moworks Logo.ai" -->\n{rect}'
            f'  <g transform="matrix({k:.5f} 0 0 {k:.5f} {tx:.4f} {ty:.4f})" fill="{fill}">\n' +
            "".join(f'    <path d="{d}"/>\n' for d in badge_d) + "  </g>\n</svg>\n")

open(f"{out}/wordmark.svg", "w").write(svg_wordmark("#FFFFFF", "#FFFFFF"))
open(f"{out}/logo-mark.svg", "w").write(svg_badge("#14110A", bg="#F4B82E", pad=8))
open(f"{out}/favicon.svg", "w").write(svg_badge("#14110A", bg="#F4B82E", pad=6, rx=14))
print(json.dumps({"wordmark": [round(W, 2), round(H, 2)], "ratio": round(W / H, 3), "capHeightShare": round(cap_h / H, 3),
                  "badge": [round(bx1 - bx0, 2), round(by1 - by0, 2)], "descScale": DESC_SCALE}))

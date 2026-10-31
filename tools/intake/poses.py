# Read a pre-rendered product sequence (numbered pictures) before a film uses it. Written from the idea of the Moworks Motion kit's engine/qa/poses.py
# (Moworks, commit 0a4a0a3): a rest pose = pictures that barely change (mean difference under 0.4 % at 96 px, at least 4 in a row), a slow point = a single
# picture where a turn eases out and back (under 0.6 %, a local minimum), a portal = rest poses that show the same picture (closest pictures under 0.4 %),
# the product's box = the opaque part of each picture (alpha > 8), as fractions of it.
# Usage: python -I poses.py <list file: "<number>\t<path>" per line> <out folder> [--every 8]
# Writes in <out>: POSES.md (for Claude), poses.json + thumbs.bin (for the app's checks), sheet.jpg (numbered), rests.jpg. Prints one JSON line.
import json, sys
from pathlib import Path

REST, SLOW, MIN_RUN, THUMB = 0.004, 0.006, 4, 32


def done(obj):
    print(json.dumps(obj, ensure_ascii=False)); sys.exit(0)


def box_of(im):
    """the opaque part of a picture as fractions of it; a picture with no alpha is all of it"""
    w, h = im.size
    if im.mode not in ("RGBA", "LA", "PA") and "transparency" not in im.info: return [0.0, 0.0, 1.0, 1.0]
    bb = im.convert("RGBA").getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    return [round(bb[0] / w, 4), round(bb[1] / h, 4), round(bb[2] / w, 4), round(bb[3] / h, 4)] if bb else [0.0, 0.0, 0.0, 0.0]


def label(a, b): return f"{a}-{b}" if a != b else str(a)


def run(listing, out, every=8):
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    fr = []
    for line in Path(listing).read_text(encoding="utf-8").splitlines():
        if "\t" in line: n, f = line.split("\t", 1); fr.append((int(n), f))
    if len(fr) < 2: done({"ok": False, "error": "no sequence"})
    out.mkdir(parents=True, exist_ok=True)
    small, thumbs, boxes, tiny = [], {}, [], bytearray()
    size = None
    for n, f in fr:
        with Image.open(f) as raw:
            boxes.append(box_of(raw)); im = raw.convert("RGBA")
        size = size or im.size
        s = np.asarray(im.resize((96, max(1, round(im.height * 96 / im.width)))), dtype=np.float32) / 255.0
        small.append(np.concatenate([s[..., :3] * s[..., 3:4], s[..., 3:4]], axis=2))    # premultiplied: a transparent margin counts as equal
        t = im.resize((THUMB, max(1, round(im.height * THUMB / im.width))))
        a = np.asarray(t, dtype=np.float32) / 255.0
        tiny += (np.concatenate([a[..., :3] * a[..., 3:4], a[..., 3:4]], axis=2) * 255).astype(np.uint8).tobytes()
        thumbs[n] = im.resize((160, round(im.height * 160 / im.width)))
    diff = [0.0] + [float(np.abs(small[i] - small[i - 1]).mean()) for i in range(1, len(small))]
    still = [d < REST for d in diff]
    rests, i = [], 0
    while i < len(fr):
        j = i
        while j + 1 < len(fr) and still[j + 1]: j += 1
        if j - i + 1 >= MIN_RUN: rests.append((fr[i][0], fr[j][0]))
        i = j + 1
    inrest = lambda n: any(a <= n <= b for a, b in rests)
    for i in range(1, len(fr) - 1):
        n = fr[i][0]
        if diff[i] < SLOW and diff[i] <= diff[i - 1] and diff[i] <= diff[i + 1] and not inrest(n) and not any(abs(n - a) <= 3 for a, _ in rests): rests.append((n, n))
    rests.sort()
    # portals: every rest pose, the first and the last picture; two match where their closest pictures differ under 0.4 %
    idx = {n: i for i, (n, _) in enumerate(fr)}
    cands = sorted(set(rests) | {(n, n) for n in (fr[0][0], fr[-1][0]) if not inrest(n)})
    stack = [np.stack([small[idx[n]] for n in range(a, b + 1, max(1, (b - a) // 12 or 1)) if n in idx]) for a, b in cands]
    group = {c: {c} for c in cands}
    for x in range(len(cands)):
        for y in range(x + 1, len(cands)):
            A, B = stack[x], stack[y]
            if A.shape[1:] != B.shape[1:]: continue
            if float(np.abs(A[:, None] - B[None, :]).mean(axis=(2, 3, 4)).min()) < REST:
                g = group[cands[x]] | group[cands[y]]
                for c in g: group[c] = g
    portals = [[label(*c) for c in g] for g in sorted({tuple(sorted(g)) for g in group.values() if len(g) > 1})]
    # the sheets
    try: font = ImageFont.truetype("arial.ttf", 14)
    except OSError: font = ImageFont.load_default()
    pick = sorted(set([n for n, _ in fr][::max(1, every)] + [(a + b) // 2 for a, b in rests]))
    th = max(t.height for t in thumbs.values()); cols = 10; rows = -(-len(pick) // cols)
    sheet = Image.new("RGB", (cols * 170 + 10, rows * (th + 30) + 10), (235, 235, 235)); dr = ImageDraw.Draw(sheet)
    for k, n in enumerate(pick):
        x, y = 10 + (k % cols) * 170, 10 + (k // cols) * (th + 30)
        bg = Image.new("RGB", thumbs[n].size, (200, 200, 205)); bg.paste(thumbs[n], (0, 0), thumbs[n]); sheet.paste(bg, (x, y + 20))
        if inrest(n): dr.rectangle([x - 3, y + 17, x + 162, y + 22 + thumbs[n].height], outline=(40, 170, 80), width=3)
        dr.text((x, y + 2), str(n), fill=(20, 20, 20), font=font)
    sheet.save(out / "sheet.jpg", quality=82)
    if rests:
        byn = dict(fr); big = {}
        for a, b in rests:
            with Image.open(byn[(a + b) // 2]) as im: im = im.convert("RGBA"); big[(a, b)] = im.resize((280, round(im.height * 280 / im.width)))
        bh = max(x.height for x in big.values()); cols = min(6, len(big)); rows = -(-len(big) // cols)
        rs = Image.new("RGB", (cols * 290 + 10, rows * (bh + 30) + 10), (235, 235, 235)); dr = ImageDraw.Draw(rs)
        for k, ((a, b), im) in enumerate(big.items()):
            x, y = 10 + (k % cols) * 290, 10 + (k // cols) * (bh + 30)
            bg = Image.new("RGB", im.size, (200, 200, 205)); bg.paste(im, (0, 0), im); rs.paste(bg, (x, y + 22))
            dr.text((x, y + 2), label(a, b), fill=(20, 20, 20), font=font)
        rs.save(out / "rests.jpg", quality=82)
    numbers = [n for n, _ in fr]; bx = dict(zip(numbers, boxes))
    wid = {n: b[2] - b[0] for n, b in bx.items() if b[2] > b[0]}
    pct = lambda b: f"x {b[0] * 100:.0f}-{b[2] * 100:.0f} %, y {b[1] * 100:.0f}-{b[3] * 100:.0f} %"
    u = [max(0.0, b[2] - b[0]) for b in boxes]; wmax = max(wid, key=wid.get) if wid else None; wmin = min(wid, key=wid.get) if wid else None
    hmax = max(numbers, key=lambda n: bx[n][3] - bx[n][1]) if wid else None
    (out / "thumbs.bin").write_bytes(bytes(tiny))
    (out / "poses.json").write_text(json.dumps({"v": 1, "count": len(fr), "first": numbers[0], "last": numbers[-1], "width": size[0], "height": size[1],
        "thumb": [THUMB, max(1, round(size[1] * THUMB / size[0]))], "numbers": numbers, "boxes": boxes, "diff": [round(d, 5) for d in diff], "rests": rests, "portals": portals, "widest": wmax, "narrowest": wmin}), encoding="utf-8")
    slow = [i for i in range(len(rests)) if rests[i][0] == rests[i][1]]
    md = [f"# The poses of this image sequence ({Path(fr[0][1]).name} .. {Path(fr[-1][1]).name})", "",
          f"{len(fr)} pictures, {size[0]} x {size[1]}. The app read every picture. Pictures of the whole sequence, numbered, rest poses framed in green: `sheet.jpg`; each rest pose large: `rests.jpg`, both beside this file. "
          "Open them before you plan a frame, and note for each pose you use: open or closed, which face, which way up (a pose seen upside down is only passed through).", "",
          "Only these may be held (`.moworks/rules/moworks-alive/sequence.md`). Everywhere else the sequence plays at least 1 picture a film frame, and never blends two pictures.", "",
          "| Rest pose (pictures) | Kind | The product's box in the picture |", "|---|---|---|"]
    md += [f"| {label(a, b)} | {'a slow point (a turn eases out and back)' if a == b else 'a still run'} | {pct(bx[(a + b) // 2])} |" for a, b in rests]
    if not rests: md += ["| none found | | |"]
    if portals: md += ["", "**Portals** (these poses show the same picture, so a jump between them is invisible; one product can run through every pose of the film): " + "; ".join(" = ".join(g) for g in portals) + "."]
    if wid: md += ["", f"**The product's box** (the opaque part, by alpha; on screen: the element's box, contained, times these): widest at picture {wmax} ({pct(bx[wmax])}), narrowest at {wmin} ({pct(bx[wmin])}), tallest at {hmax} ({pct(bx[hmax])}). "
                       "Place the product by its widest and tallest pose of the shot, so the whole of it stays inside the frame."]
    (out / "POSES.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    done({"ok": True, "count": len(fr), "rests": len(rests), "slow": len(slow), "portals": len(portals), "md": "POSES.md", "sheet": "sheet.jpg", "restsSheet": "rests.jpg" if rests else None, "json": "poses.json"})


if __name__ == "__main__":
    if len(sys.argv) < 3: done({"ok": False, "error": "usage: poses.py <list> <out>"})
    e = int(sys.argv[sys.argv.index("--every") + 1]) if "--every" in sys.argv else 8
    try: run(sys.argv[1], Path(sys.argv[2]), e)
    except SystemExit: raise
    except Exception as x: done({"ok": False, "error": f"{type(x).__name__}: {x}"})

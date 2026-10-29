// TakayuStudio, Swap (batch 3.3): one word becoming another (slot reels, flips, split-flap boards, rolls, blurs, goo, cubes, cascades,
// retyping only what changed), written here from the site's ideas and numbers (no code of the site). Letters are graphemes (Vietnamese
// marks stay on their letter); swaps run there and back so a preview loops.
import { T } from "../../takayu/define.mjs";
import { headline, demo } from "../../takayu/stages.mjs";

const GR = `var seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;
var gr = function (s) { s = String(s).normalize("NFC"); if (!seg) return Array.from(s); var out = [], it = seg.segment(s)[Symbol.iterator](), r; while (!(r = it.next()).done) out.push(r.value.segment); return out; };`;
const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .sw { position: absolute; inset: 0; display: grid; place-items: center; }`;
const W = (html, run, duration, css = "") => ({ css: `${BG}\n${css}`, html: `<div class="sw">${html}</div>`, run, duration });
const mk = (body) => new Function("el", "tl", "at", "o", GR + "\n" + body);

export default [
  T("text/glyph-slot-roll", {
    uses: ["drive", "rand"],
    fn: mk(`var A = gr(o.from), B = gr(o.to), n = Math.max(A.length, B.length), r = MW.rand(o.seed), pool = gr(o.pool), bk = gsap.parseEase("back.out(0.5)"), reels = [];
el.textContent = ""; el.style.display = "inline-flex"; el.style.gap = o.gap + "px";
for (var i = 0; i < n; i++) {
  var w = document.createElement("span"); w.style.cssText = "display:inline-block;width:1.2em;height:1.7em;overflow:hidden;position:relative;border-radius:0.12em;background:" + o.cell + ";";
  var s = document.createElement("span"); s.style.cssText = "display:block;text-align:center;line-height:1.43em;padding-top:0.135em;";
  var seq = [A[i] || " "]; for (var k = 0; k < 4; k++) seq.push(pool[Math.floor(r() * pool.length)]); seq.push(B[i] || " "); for (var k2 = 0; k2 < 4; k2++) seq.push(pool[Math.floor(r() * pool.length)]); seq.push(A[i] || " ");
  seq.forEach(function (g) { var e = document.createElement("span"); e.style.display = "block"; e.textContent = g; s.appendChild(e); }); w.appendChild(s); el.appendChild(w); reels.push(s);
}
var row = function (i, t) { var d = 0.75 + 0.1 * i, a = Math.max(0, Math.min(1, (t - o.at) / d)), b = Math.max(0, Math.min(1, (t - o.backAt) / d)); return 5 * bk(a) + 5 * bk(b); };
return MW.drive(tl, at, o.backAt + 0.75 + 0.1 * n + 0.2, function (t) {
  reels.forEach(function (s, i) { var y = row(i, t), v = Math.abs(row(i, t + 0.01) - row(i, t - 0.01)) / 0.02, sy = 1 + Math.min(0.5, 0.03 * v), sx = 1 / Math.sqrt(sy); gsap.set(s, { y: -y * 1.43 + "em" }); Array.prototype.forEach.call(s.children, function (e) { e.style.transform = "scale(" + sx + "," + sy + ")"; }); });
});`),
    options: { from: "the first word", to: "the second (same letter count)", pool: "letters the reels pass through", at: "s (0.3): reel i stops 0.75 + 0.1 i s later, back.out(0.5)", backAt: "s the reels roll back (2.4)", gap: "px between windows (24)", cell: "window colour", seed: "the passing letters" },
    defaults: { from: "BẮC", to: "NAM", pool: "ABCDEGHIKLMNOPQRSTUVXYĐĂÂÊÔƠƯ", at: 0.3, backAt: 2.4, gap: 24, cell: "#151a28", seed: 3 },
    demo: W(`<div class="gs" style="font-size:180px;font-weight:900">BẮC</div>`, `MW.textGlyphSlotRoll(q(".gs"), tl, 0, {});`, 4.2),
  }),

  T("text/letter-flip", {
    uses: ["drive", "eases"],
    fn: mk(`var A = gr(o.from), B = gr(o.to), n = Math.max(A.length, B.length), io = MW.ez("in-out"), cells = [];
el.textContent = ""; for (var i = 0; i < n; i++) { var s = document.createElement("span"); s.style.cssText = "display:inline-block;transform-origin:50% 55%;"; s.textContent = A[i] || " "; el.appendChild(s); cells.push(s); }
var col = getComputedStyle(el).color;
return MW.drive(tl, at, o.backAt + o.duration + o.backStagger * n, function (t) {
  cells.forEach(function (s, i) {
    var f = io(Math.max(0, Math.min(1, (t - o.at - i * o.stagger) / o.duration))), b = io(Math.max(0, Math.min(1, (t - o.backAt - i * o.backStagger) / o.duration))), th = 180 * (f - b), toB = th >= 90;
    s.textContent = (toB ? B[i] : A[i]) || " "; s.style.color = toB ? o.accent : col; s.style.transform = "scaleY(" + Math.abs(Math.cos(th * Math.PI / 180)) + ")";
  });
});`),
    options: { from: "first word", to: "second (same letter count)", duration: "s per letter (0.3; the recipe 0.4)", stagger: "s (0.07)", backStagger: "s on the way back (0.05)", at: "s (0.6)", backAt: "s (2.2)", accent: "colour of the new letters" },
    defaults: { from: "XANH", to: "VÀNG", duration: 0.3, stagger: 0.07, backStagger: 0.05, at: 0.6, backAt: 2.2, accent: "#ffd23d" },
    demo: W(`<div class="lf" style="font-size:220px;font-weight:900">XANH</div>`, `MW.textLetterFlip(q(".lf"), tl, 0, {});`, 3),
  }),

  T("text/split-flap-board", {
    uses: ["drive", "rand"],
    fn: mk(`var target = gr(o.text), r = MW.rand(o.seed), cells = [], pin = gsap.parseEase("power1.in"), pout = gsap.parseEase("power1.out");
var cls = function (g) { return /[0-9]/.test(g) ? "0123456789" : /[A-ZĐĂÂÊÔƠƯÀ-Ỹ]/i.test(g) ? "ABCDEGHIKLMNOPQRSTUVXY" : ":-. "; };
el.textContent = ""; el.style.display = "inline-flex"; el.style.gap = o.gap + "px";
target.forEach(function (g, i) {
  var c = document.createElement("span"); c.style.cssText = "position:relative;display:inline-block;width:0.78em;height:1.03em;perspective:" + o.perspective + "px;";
  var mkHalf = function (top) { var h = document.createElement("span"); h.style.cssText = "position:absolute;left:0;right:0;height:50%;overflow:hidden;background:" + o.card + ";" + (top ? "top:0;border-radius:0.08em 0.08em 0 0;transform-origin:50% 100%;" : "bottom:0;border-radius:0 0 0.08em 0.08em;transform-origin:50% 0;"); var t = document.createElement("span"); t.style.cssText = "position:absolute;left:0;right:0;height:1.03em;line-height:1.03em;text-align:center;" + (top ? "top:0;" : "bottom:0;"); h.appendChild(t); c.appendChild(h); return { h: h, t: t }; };
  var parts = { topNext: mkHalf(true), botCur: mkHalf(false), flapTop: mkHalf(true), flapBot: mkHalf(false) };
  var seq = [" "], steps = 3 + Math.floor(r() * 4), pool = cls(g); for (var k = 0; k < steps; k++) seq.push(pool[Math.floor(r() * pool.length)]); seq.push(g); if (g === " ") seq = [" ", " "];
  el.appendChild(c); cells.push({ p: parts, seq: seq, i: i });
});
var n = cells.length, st = Math.min(o.stagger, 1 / Math.max(1, n - 1));
return MW.drive(tl, at, o.blankAt + 0.03 * n + 0.2, function (t) {
  cells.forEach(function (cell) {
    var seq = cell.seq, F = o.flip, t0 = o.start + cell.i * st, blank = t >= o.blankAt + 0.03 * cell.i, k = Math.floor((t - t0) / F), u = ((t - t0) / F) - k;
    var cur, nxt, phase;
    if (blank) { cur = nxt = " "; phase = -1; } else if (t < t0) { cur = nxt = seq[0]; phase = -1; } else if (k >= seq.length - 1) { cur = nxt = seq[seq.length - 1]; phase = -1; } else { cur = seq[k]; nxt = seq[k + 1]; phase = u; }
    var P = cell.p; P.topNext.t.textContent = nxt; P.botCur.t.textContent = phase < 0 ? nxt : cur; P.flapTop.t.textContent = cur; P.flapBot.t.textContent = nxt;
    if (phase < 0) { P.flapTop.h.style.visibility = "hidden"; P.flapBot.h.style.visibility = "hidden"; return; }
    var a1 = phase < 0.5 ? -90 * pin(phase / 0.5) : -90, a2 = phase < 0.5 ? 90 : 90 * (1 - pout((phase - 0.5) / 0.5));
    P.flapTop.h.style.visibility = phase < 0.5 ? "visible" : "hidden"; P.flapTop.h.style.transform = "rotateX(" + a1 + "deg)"; P.flapTop.h.style.filter = "brightness(" + (1 - 0.3 * Math.min(1, phase / 0.5)) + ")";
    P.flapBot.h.style.visibility = phase >= 0.5 ? "visible" : "hidden"; P.flapBot.h.style.transform = "rotateX(" + a2 + "deg)";
  });
});`),
    options: { text: "the board line", flip: "s per flip (0.085)", stagger: "s between cells (0.06, ≤ 1 s)", start: "s (0.3)", blankAt: "s the board clears (3.4; 0.03 s per cell)", gap: "px (10)", perspective: "px (1600)", card: "flap colour", seed: "passing characters" },
    defaults: { text: "GA HÀ NỘI 09:40", flip: 0.085, stagger: 0.06, start: 0.3, blankAt: 3.4, gap: 10, perspective: 1600, card: "#1d2232", seed: 7 },
    demo: W(`<div class="sf" style="font-size:140px;font-weight:800;color:#ffd23d">GA HÀ NỘI 09:40</div>`, `MW.textSplitFlapBoard(q(".sf"), tl, 0, {});`, 4.2, ".sf > span::after { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 4px; margin-top: -2px; background: #0b0d12; }"),
  }),

  T("text/rotating-letters-pill", {
    uses: ["drive", "spring"],
    fn: mk(`var pill = el, sp = MW.spring(o.k, o.c), words = o.words.map(gr), layers = [], fs = parseFloat(getComputedStyle(el).fontSize);
pill.textContent = ""; pill.style.position = "relative"; pill.style.overflow = "hidden"; pill.style.display = "inline-block"; pill.style.verticalAlign = "bottom";
words.forEach(function (w) { var d = document.createElement("span"); d.style.cssText = "position:absolute;left:" + o.pad + "px;top:0.09em;white-space:pre;display:inline-flex;"; w.forEach(function (g) { var s = document.createElement("span"); s.textContent = g; s.style.display = "inline-block"; s.style.whiteSpace = "pre"; d.appendChild(s); }); pill.appendChild(d); layers.push(d); });
var widths = layers.map(function (d) { return d.offsetWidth + 2 * o.pad; }), H = fs * 1.18 + 0.18 * fs;
pill.style.height = H + "px";
return MW.drive(tl, at, o.loop, function (t) {
  var k = 0; o.swaps.forEach(function (s, i) { if (t >= s) k = i + 1; }); k = k % words.length;
  var w = widths[0]; for (var i = 0; i < o.swaps.length; i++) if (t >= o.swaps[i] + 0.22) { var to = widths[(i + 1) % words.length], from = widths[i % words.length]; w += (to - from) * sp.at(t - o.swaps[i] - 0.22); }
  pill.style.width = w + "px";
  layers.forEach(function (d, li) {
    var ch = d.children;
    Array.prototype.forEach.call(ch, function (s, ci) {
      var y = li === 0 ? 0 : 120, a = li === 0 ? 1 : 0;
      o.swaps.forEach(function (sw, i) { var outI = i % words.length, inI = (i + 1) % words.length, d0 = t - sw - 0.03 * ci;
        if (li === outI && d0 >= 0) { var v = Math.min(1.2, sp.at(d0)); y = -120 * v; a = Math.max(0, 1 - v); }
        if (li === inI && d0 - 0.22 >= 0) { var v2 = sp.at(d0 - 0.22); y = 100 * (1 - v2); a = Math.min(1, v2); } });
      gsap.set(s, { yPercent: y }); s.style.opacity = String(a);
    });
  });
});`),
    options: { words: "the words in turn", swaps: "s of each swap ([0.7, 2.7])", k: "spring stiffness (300)", c: "damping (25)", pad: "px (56)", loop: "s (4)" },
    defaults: { words: ["nhanh hơn", "đẹp hơn"], swaps: [0.7, 2.7], k: 300, c: 25, pad: 56, loop: 4 },
    demo: W(`<div style="font-size:120px;font-weight:800">Làm video <span class="rp" style="background:#8b7bff;color:#151a28;border-radius:40px">nhanh hơn</span></div>`, `MW.textRotatingLettersPill(q(".rp"), tl, 0, {});`, 4),
  }),

  T("text/vertical-word-roll", {
    uses: ["drive", "eases"],
    fn: mk(`var A = gr(o.from), B = gr(o.to), io = MW.ez("in-out"), wrap = document.createElement("span");
el.textContent = ""; el.style.display = "inline-block"; el.style.overflow = "hidden"; el.style.position = "relative"; el.style.verticalAlign = "bottom"; el.style.height = "1.33em"; el.style.paddingTop = "0.12em";
var row = function (g) { var d = document.createElement("span"); d.style.cssText = "display:inline-flex;white-space:pre;"; return g.map(function (c) { var s = document.createElement("span"); s.textContent = c; s.style.display = "inline-block"; s.style.whiteSpace = "pre"; d.appendChild(s); return s; }).concat([d]); };
var ra = row(A), rb = row(B), da = ra.pop(), db = rb.pop(); db.style.position = "absolute"; db.style.left = "0"; db.style.top = "0.12em"; el.appendChild(da); el.appendChild(db);
var st = function (n) { return Math.min(0.02, 0.25 / Math.max(1, n - 1)); };
return MW.drive(tl, at, o.backAt + o.duration + 0.3, function (t) {
  var p = function (i, n, t0) { return io(Math.max(0, Math.min(1, (t - t0 - i * st(n)) / o.duration))); };
  ra.forEach(function (s, i) { var u = p(i, ra.length, o.at) - p(i, ra.length, o.backAt); gsap.set(s, { yPercent: -110 * u }); });
  rb.forEach(function (s, i) { var u = p(i, rb.length, o.at) - p(i, rb.length, o.backAt); gsap.set(s, { yPercent: 110 * (1 - u) }); });
  el.style.width = Math.max(da.offsetWidth, db.offsetWidth) + "px";
});`),
    options: { from: "word shown first", to: "word it rolls to", duration: "s (0.5), in-out", at: "s (0.6)", backAt: "s it rolls back (2.3)" }, defaults: { from: "thiết kế", to: "sản xuất", duration: 0.5, at: 0.6, backAt: 2.3 },
    demo: W(`<div style="font-size:130px;font-weight:800">Chúng tôi <span class="vr" style="color:#a99bff">thiết kế</span></div>`, `MW.textVerticalWordRoll(q(".vr"), tl, 0, {});`, 3.6),
  }),

  T("text/flip-words-blur", {
    uses: ["drive", "spring"],
    fn: mk(`var words = o.words.map(gr), layers = [], p2 = gsap.parseEase("power2.out"), sp = MW.spring(100, 10);
el.textContent = ""; el.style.position = "relative"; el.style.display = "inline-block";
words.forEach(function (w, wi) { var d = document.createElement("span"); d.style.cssText = (wi ? "position:absolute;left:0;top:0;" : "") + "display:inline-flex;white-space:pre;"; w.forEach(function (g) { var s = document.createElement("span"); s.textContent = g; s.style.display = "inline-block"; s.style.whiteSpace = "pre"; d.appendChild(s); }); el.appendChild(d); layers.push(d); });
return MW.drive(tl, at, o.loop, function (t) {
  var k = 0; o.swaps.forEach(function (s, i) { if (t >= s) k = i + 1; });
  layers.forEach(function (d, li) {
    var cur = k % words.length, prev = (k - 1 + words.length) % words.length, ts = k ? o.swaps[k - 1] : -9;
    if (li === cur) { var rise = k ? 10 * o.unit * (1 - sp.at(t - ts)) : 0; gsap.set(d, { x: 0, y: rise, scale: 1 }); d.style.filter = ""; d.style.opacity = "1";
      Array.prototype.forEach.call(d.children, function (s, ci) { var u = k ? p2(Math.max(0, Math.min(1, (t - ts - 0.1 - 0.05 * ci) / 0.2))) : 1; s.style.opacity = String(u); gsap.set(s, { y: 10 * o.unit * (1 - u) }); s.style.filter = u < 1 ? "blur(" + 8 * o.unit / 2 * (1 - u) + "px)" : ""; }); }
    else if (li === prev && k) { var e = p2(Math.max(0, Math.min(1, (t - ts) / 0.45))); gsap.set(d, { x: 40 * o.unit * e, y: -40 * o.unit * e, scale: 1 + e }); d.style.filter = "blur(" + 8 * o.unit / 2 * e + "px)"; d.style.opacity = String(1 - e); }
    else d.style.opacity = "0";
  });
});`),
    options: { words: "the words in turn", swaps: "s of each swap ([0.5, 2.7])", unit: "px per reference unit (4)", loop: "s (4.4)" }, defaults: { words: ["tươi mới", "rực rỡ", "tươi mới"], swaps: [0.5, 2.7], unit: 4, loop: 4.4 },
    demo: W(`<div style="font-size:130px;font-weight:800">Mùa hè <span class="fw" style="color:#ffd23d">tươi mới</span></div>`, `MW.textFlipWordsBlur(q(".fw"), tl, 0, {});`, 4.4),
  }),

  T("text/gooey-morph", {
    uses: ["drive"],
    fn: mk(`var NS = "http://www.w3.org/2000/svg", id = "mwgm" + Math.round(at * 1000), svg = document.createElementNS(NS, "svg"), f = document.createElementNS(NS, "filter"), cm = document.createElementNS(NS, "feColorMatrix");
svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute"; f.setAttribute("id", id); cm.setAttribute("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140"); f.appendChild(cm); svg.appendChild(f); el.appendChild(svg);
var words = o.words, a = document.createElement("span"), b = document.createElement("span"); el.style.position = "relative"; el.style.filter = "url(#" + id + ")";
[a, b].forEach(function (s, i) { s.textContent = words[i]; s.style.cssText = "position:absolute;left:50%;top:0;transform:translateX(-50%);white-space:nowrap;"; el.appendChild(s); });
var blur = function (f2) { return f2 <= 0 ? 100 : Math.min(o.maxBlur, 8 / f2 - 8); };
return MW.drive(tl, at, o.backAt + o.morph + 0.5, function (t) {
  var f1 = Math.max(0, Math.min(1, (t - o.at) / o.morph)), f2 = Math.max(0, Math.min(1, (t - o.backAt) / o.morph)), fb = f1 - f2;
  b.style.opacity = String(Math.pow(fb, 0.4)); b.style.filter = fb >= 1 ? "" : "blur(" + blur(fb) + "px)"; a.style.opacity = String(Math.pow(1 - fb, 0.4)); a.style.filter = fb <= 0 ? "" : "blur(" + blur(1 - fb) + "px)";
});`),
    options: { words: "the pair", morph: "s (1.5)", at: "s (0.3)", backAt: "s it morphs back (2.6)", maxBlur: "px (18)" }, defaults: { words: ["Lửa", "Nước"], morph: 1.5, at: 0.3, backAt: 2.6, maxBlur: 18 },
    notes: "Liquid look: the two blurred words pass through an alpha threshold (feColorMatrix alpha × 255 − 140).",
    demo: W(`<div class="gmo" style="font-size:260px;font-weight:900;color:#a99bff;width:1200px;height:340px"></div>`, `MW.textGooeyMorph(q(".gmo"), tl, 0, {});`, 4.6),
  }),

  T("text/blur-crossfade", {
    uses: ["drive", "eases"],
    fn: mk(`var a = el.querySelector(o.a), b = el.querySelector(o.b), io = MW.ez("in-out");
return MW.drive(tl, at, o.backAt + o.duration, function (t) {
  var p = io(Math.max(0, Math.min(1, (t - o.at) / o.duration))) - io(Math.max(0, Math.min(1, (t - o.backAt) / o.duration)));
  a.style.opacity = String(1 - p); a.style.filter = p > 0.001 ? "blur(" + o.blur * p + "px)" : ""; b.style.opacity = String(p); b.style.filter = p < 0.999 ? "blur(" + o.blur * (1 - p) + "px)" : "";
});`),
    options: { a: "the word shown first", b: "the word in the same spot", duration: "s (0.6)", blur: "px (30)", at: "s (0.8)", backAt: "s (2.6)" }, defaults: { a: ".bc-a", b: ".bc-b", duration: 0.6, blur: 30, at: 0.8, backAt: 2.6 },
    demo: W(`<div class="bc" style="position:relative;font-size:220px;font-weight:900"><span class="bc-a">Ngày</span><span class="bc-b" style="position:absolute;left:50%;top:0;transform:translateX(-50%);color:#a99bff;opacity:0;white-space:nowrap">Đêm</span></div>`, `MW.textBlurCrossfade(q(".bc"), tl, 0, {});`, 3.6),
  }),

  T("text/cube-rotate-swap", {
    uses: ["drive", "eases"],
    fn: mk(`var A = gr(o.from), B = gr(o.to), n = Math.max(A.length, B.length), io = MW.ez("in-out"), fs = parseFloat(getComputedStyle(el).fontSize), d = o.depth * fs, faces = [];
el.textContent = "";
for (var i = 0; i < n; i++) { var c = document.createElement("span"); c.style.cssText = "display:inline-block;position:relative;white-space:pre;"; var f = document.createElement("span"), b = document.createElement("span"); f.textContent = A[i] || " "; b.textContent = B[i] || " "; f.style.cssText = "display:inline-block;white-space:pre;"; b.style.cssText = "position:absolute;left:0;top:0;white-space:pre;color:" + o.accent + ";"; c.appendChild(f); c.appendChild(b); el.appendChild(c); faces.push([f, b]); }
var st = Math.min(o.stagger, 0.4 / Math.max(1, n - 1));
return MW.drive(tl, at, o.backAt + o.duration + 0.4, function (t) {
  faces.forEach(function (F, i) {
    var a = 90 * (io(Math.max(0, Math.min(1, (t - o.at - i * st) / o.duration))) - io(Math.max(0, Math.min(1, (t - o.backAt - i * st) / o.duration)))), pp = o.perspective;
    F[0].style.transform = "perspective(" + pp + "px) translateZ(" + (-d) + "px) rotateX(" + a + "deg) translateZ(" + d + "px)"; F[0].style.opacity = String(1 - 0.75 * a / 90);
    F[1].style.transform = "perspective(" + pp + "px) translateZ(" + (-d) + "px) rotateX(" + (a - 90) + "deg) translateZ(" + d + "px)"; F[1].style.opacity = String(a < 0.5 ? 0 : 0.25 + 0.75 * a / 90);
  });
});`),
    options: { from: "first word", to: "second (same length)", duration: "s (0.6), in-out", stagger: "s (0.067, ≤ 0.4 s)", depth: "em behind the face the cube turns about (0.6)", perspective: "px (2400)", at: "s (0.4)", backAt: "s (2.2)", accent: "new face colour" },
    defaults: { from: "MỞ BÁN", to: "HẾT HÀ", duration: 0.6, stagger: 0.067, depth: 0.6, perspective: 2400, at: 0.4, backAt: 2.2, accent: "#ffd23d" },
    demo: W(`<div class="cr" style="font-size:200px;font-weight:900">MỞ BÁN</div>`, `MW.textCubeRotateSwap(q(".cr"), tl, 0, {});`, 3.6),
  }),

  T("text/skew-swipe", {
    uses: ["drive"],
    fn: mk(`var a = el.querySelector(o.a), b = el.querySelector(o.b), p3 = gsap.parseEase("power3.in"), ex = gsap.parseEase("expo.out"), p2 = gsap.parseEase("power2.out"), lines = [];
for (var i = 0; i < 4; i++) { var l = document.createElement("span"); l.style.cssText = "position:absolute;height:8px;border-radius:4px;background:" + o.accent + ";opacity:0;pointer-events:none;"; el.appendChild(l); lines.push(l); }
var swap = function (outEl, inEl, t0, t) {
  var u = Math.max(0, Math.min(1, (t - t0) / 0.3)), e = p3(u); gsap.set(outEl, { x: -o.out * e, skewX: -o.skew * e }); outEl.style.opacity = String(t < t0 ? 1 : 1 - e);
  var t1 = t0 + 0.3 - 0.18, v = Math.max(0, Math.min(1, (t - t1) / 0.4)), x = o.in * (1 - ex(v)), sk = v < 0.5 ? -o.skew : -o.skew * (1 - p2((v - 0.5) / 0.5));
  gsap.set(inEl, { x: x, skewX: t < t1 ? -o.skew : sk }); inEl.style.opacity = String(t < t1 ? 0 : Math.min(1, v * 3));
  return [v, x, inEl];
};
return MW.drive(tl, at, o.backAt + 1, function (t) {
  var s = t < o.backAt ? swap(a, b, o.at, t) : swap(b, a, o.backAt, t);
  var v = s[0], fast = v > 0 && v < 0.45;
  lines.forEach(function (l, i) { l.style.opacity = fast ? String(0.7 * (1 - v / 0.45)) : "0"; l.style.width = (120 + 60 * i) + "px"; l.style.left = (s[2].offsetLeft + s[2].offsetWidth + s[1] * 0.5 + 30) + "px"; l.style.top = (s[2].offsetTop + s[2].offsetHeight * (0.25 + 0.17 * i)) + "px"; });
});`),
    options: { a: "first word", b: "second word", skew: "degrees (20)", out: "px the old word leaves (1200)", in: "px the new comes from (880)", at: "s (0.5)", backAt: "s (2.0)", accent: "speed line colour" },
    defaults: { a: ".ss-a", b: ".ss-b", skew: 20, out: 1200, in: 880, at: 0.5, backAt: 2.0, accent: "#a99bff" },
    demo: W(`<div class="ssw" style="position:relative;font-size:220px;font-weight:900;width:1200px;height:280px"><span class="ss-a" style="position:absolute;left:0;right:0;text-align:center">NHANH</span><span class="ss-b" style="position:absolute;left:0;right:0;text-align:center;color:#a99bff;opacity:0">GỌN</span></div>`, `MW.textSkewSwipe(q(".ssw"), tl, 0, {});`, 3.4),
  }),

  T("text/letter-cascade-swap", {
    uses: ["drive", "rand"],
    fn: mk(`var A = gr(o.from), B = gr(o.to), r = MW.rand(o.seed), pin = gsap.parseEase("power2.in"), pout = gsap.parseEase("power2.out"), col = getComputedStyle(el).color;
el.textContent = ""; el.style.position = "relative"; el.style.display = "inline-block";
var mkRow = function (g, abs) { var d = document.createElement("span"); d.style.cssText = (abs ? "position:absolute;left:50%;top:0;transform:translateX(-50%);" : "") + "display:inline-flex;white-space:pre;"; var arr = g.map(function (c) { var s = document.createElement("span"); s.textContent = c; s.style.display = "inline-block"; s.style.whiteSpace = "pre"; d.appendChild(s); return { s: s, tilt: (r() * 2 - 1) * 8.6 }; }); el.appendChild(d); return arr; };
var ra = mkRow(A, false), rb = mkRow(B, true);
var st = function (n) { return Math.min(o.stagger, 0.5 / Math.max(1, n - 1)); };
var outIn = function (outR, inR, t0, t) {
  outR.forEach(function (c, i) { var u = pin(Math.max(0, Math.min(1, (t - t0 - i * st(outR.length)) / 0.35))); gsap.set(c.s, { y: o.drop * u, rotation: c.tilt * u }); c.s.style.opacity = String(1 - u); });
  inR.forEach(function (c, i) { var v = Math.max(0, Math.min(1, (t - t0 - 0.15 - i * st(inR.length)) / 0.45)), e = pout(v); gsap.set(c.s, { y: -o.drop * (1 - e), rotation: 0 }); c.s.style.opacity = String(e); c.s.style.color = v > 0 && v < 1 ? o.accent : col; });
};
return MW.drive(tl, at, o.backAt + 1.2, function (t) { if (t < o.backAt) outIn(ra, rb, o.at, t); else outIn(rb, ra, o.backAt, t); });`),
    options: { from: "first word", to: "second word", drop: "px (160)", stagger: "s (0.05, ≤ 0.5 s)", at: "s (0.4)", backAt: "s (2.0)", accent: "colour while falling in", seed: "tilts" },
    defaults: { from: "MƯA", to: "NẮNG", drop: 160, stagger: 0.05, at: 0.4, backAt: 2.0, accent: "#ffd23d", seed: 4 },
    demo: W(`<div class="lc" style="font-size:240px;font-weight:900">MƯA</div>`, `MW.textLetterCascadeSwap(q(".lc"), tl, 0, {});`, 3.6),
  }),

  T("text/diff-retype", {
    uses: ["drive"],
    fn: mk(`var A = gr(o.from), B = gr(o.to), pre = 0, suf = 0; while (pre < A.length && pre < B.length && A[pre] === B[pre]) pre++; while (suf < A.length - pre && suf < B.length - pre && A[A.length - 1 - suf] === B[B.length - 1 - suf]) suf++;
var mid = Math.max(A.length, B.length) - pre - suf, oldMid = A.slice(pre, A.length - suf), newMid = B.slice(pre, B.length - suf), per = Math.min(o.perChar, 1.2 / Math.max(1, Math.max(oldMid.length, newMid.length)));
el.textContent = ""; var head = document.createElement("span"), body = document.createElement("span"), tail = document.createElement("span"), caret = document.createElement("span");
head.textContent = A.slice(0, pre).join(""); tail.textContent = A.slice(A.length - suf).join(""); [head, body, tail].forEach(function (s) { s.style.whiteSpace = "pre"; el.appendChild(s); }); el.insertBefore(caret, tail);
caret.style.cssText = "display:inline-block;width:6px;height:1em;vertical-align:-0.1em;background:" + o.accent + ";margin:0 1px;";
var col = getComputedStyle(el).color, render = function (from, to, k, dt) { body.innerHTML = ""; var L = Math.max(from.length, to.length);
  for (var i = 0; i < L; i++) { var s = document.createElement("span"); s.style.cssText = "display:inline-block;white-space:pre;"; if (i < k) { if (i >= to.length) continue; s.textContent = to[i]; s.style.color = o.accent; s.style.textDecoration = "underline " + o.underline + "px"; s.style.textUnderlineOffset = "0.2em"; if (i === k - 1) { var u = Math.min(1, dt / 0.12); s.style.transform = "scale(" + (1.25 - 0.25 * u) + ")"; } } else { if (i >= from.length) continue; s.textContent = from[i]; s.style.opacity = "0.5"; } body.appendChild(s); }
  body.appendChild(caret); };
return MW.drive(tl, at, o.backAt + per * mid + 0.6, function (t) {
  var fwd = t < o.backAt, t0 = fwd ? o.at : o.backAt, from = fwd ? oldMid : newMid, to = fwd ? newMid : oldMid, steps = Math.max(from.length, to.length), d = t - t0, k = Math.max(0, Math.min(steps, Math.floor(d / per) + (d >= 0 ? 1 : 0)));
  if (!fwd && d < 0) { render(oldMid, newMid, newMid.length + 9, 1); } else render(from, to, d < 0 ? 0 : k, d - (k - 1) * per);
  caret.style.visibility = (d >= 0 && k < steps) ? "visible" : "hidden"; void col;
});`),
    options: { from: "text before", to: "text after (the shared start and end stay still)", perChar: "s per changed character (0.14, ≤ 1.2 s)", at: "s (0.6)", backAt: "s it changes back (2.8)", underline: "px (4)", accent: "colour of new characters" },
    defaults: { from: "Giá 980.000₫", to: "Giá 1.250.000₫", perChar: 0.14, at: 0.6, backAt: 2.8, underline: 4, accent: "#ffd23d" },
    demo: W(`<div class="dr" style="font-size:150px;font-weight:800;font-variant-numeric:tabular-nums">Giá 980.000₫</div>`, `MW.textDiffRetype(q(".dr"), tl, 0, {});`, 4),
  }),
];

// TakayuStudio, Typing & Decoding and Web Scroll (batch 3.4): typewriters, scrambles and decoders on graphemes (Vietnamese letters stay
// whole; the code-point shift works on the base letter and keeps the marks), and scroll-driven page motions with a scripted scroll on
// the film's clock, written here from the site's ideas and numbers (no code of the site).
import { T } from "../../takayu/define.mjs";
import { headline, demo } from "../../takayu/stages.mjs";
import { LANDSCAPE } from "../../demo-media.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const MONO = "'JetBrains Mono', monospace";
const H = (text, run, duration = 3.4, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);
const CV = (name, duration = 4, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
const GR = `var seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;
var gr = function (s) { s = String(s).normalize("NFC"); if (!seg) return Array.from(s); var out = [], it = seg.segment(s)[Symbol.iterator](), r; while (!(r = it.next()).done) out.push(r.value.segment); return out; };
var cells = function (el, text) { el.textContent = ""; var word = null; return gr(text).map(function (g) { var s = document.createElement("span"); s.textContent = g; s.style.display = "inline-block"; s.style.whiteSpace = "pre";
  if (g === " ") { word = null; el.appendChild(s); } else { if (!word) { word = document.createElement("span"); word.style.display = "inline-block"; word.style.whiteSpace = "nowrap"; el.appendChild(word); } word.appendChild(s); } return s; }); };`;
const mk = (body) => new Function("el", "tl", "at", "o", GR + "\n" + body);
const U = ["drive", "rand"];

export default [
  T("text/terminal-decode", {
    uses: U,
    fn: mk(`var target = gr(o.text), cs = cells(el, o.text), caret = document.createElement("span"), noise = gr(o.glyphs);
el.style.position = "relative"; caret.style.cssText = "position:absolute;height:0.12em;width:0.62em;background:" + o.accent + ";bottom:-0.08em;"; el.appendChild(caret);
cs.forEach(function (c) { c.style.width = "0.72em"; c.style.textAlign = "center"; });
return MW.drive(tl, at, o.loop, function (t) {
  var f = Math.floor(t * o.fps), back = t >= o.backAt, nextI = -1;
  cs.forEach(function (c, i) {
    var lockT = o.start + o.step * i, b = back ? (t - o.backAt) / 0.25 > (i / cs.length) : false, locked = t >= lockT && !b;
    if (target[i] === " ") { c.textContent = " "; return; }
    if (locked) { var u = Math.min(1, (t - lockT) / 0.12); c.textContent = target[i]; c.style.color = o.accent; c.style.fontWeight = "700"; c.style.transform = "scale(" + (1.18 - 0.18 * u) + ")"; }
    else { var r = MW.rand(o.seed * 131 + i * 977 + f); c.textContent = noise[Math.floor(r() * noise.length)]; c.style.color = o.mute; c.style.fontWeight = "500"; c.style.transform = ""; if (nextI < 0) nextI = i; }
  });
  var done = nextI < 0, tgt = done ? cs[cs.length - 1] : cs[nextI]; caret.style.left = (tgt.offsetLeft + (done ? tgt.offsetWidth : 0) + (tgt.offsetWidth - 0.62 * parseFloat(getComputedStyle(el).fontSize)) / 2 * (done ? 0 : 1)) + "px";
  caret.style.opacity = done ? (Math.floor(t * 4) % 2 ? "0" : "1") : "1";
});`),
    options: { text: "the word (mono)", glyphs: "noise characters", fps: "noise changes a second (20)", start: "s the first letter locks (0.8)", step: "s per letter (0.3)", backAt: "s it falls back to noise (3.7)", accent: "locked colour", mute: "noise colour", loop: "s (4.2)", seed: "noise" },
    defaults: { text: "THÀNH CÔNG", glyphs: "#%&?*01<>/=_7Q", fps: 20, start: 0.8, step: 0.3, backAt: 3.7, accent: "#3ddc84", mute: "#6c778b", loop: 4.2, seed: 2 },
    demo: { css: `${BG}\n.td { position: absolute; left: 50%; top: 50%; width: 1500px; height: 560px; margin: -280px 0 0 -750px; border-radius: 30px; background: #0a0c12; border: 3px solid #2a3350; font-family: ${MONO}; }
.td-b { height: 70px; border-bottom: 2px solid #1d2232; display: flex; align-items: center; gap: 14px; padding: 0 30px; } .td-b i { width: 22px; height: 22px; border-radius: 50%; background: #3a4466; }
.td-p { padding: 40px 60px; font-size: 44px; color: #8f9ab3; } .td-w { margin: 30px 60px; font-size: 140px; }`,
      html: `<div class="td"><div class="td-b"><i></i><i></i><i></i></div><div class="td-p">$ decode --msg</div><div class="td-w">THÀNH CÔNG</div></div>`, run: `MW.textTerminalDecode(q(".td-w"), tl, 0, {});`, duration: 4.2 },
  }),

  T("text/typewriter-steps", {
    uses: ["drive"],
    fn: mk(`var cs = cells(el, el.textContent), n = cs.length, per = Math.min(o.per, o.fit / Math.max(1, n));
return MW.drive(tl, at, o.clearAt + 0.1, function (t) { cs.forEach(function (c, i) { c.style.visibility = t >= o.start + i * per && t < o.clearAt ? "visible" : "hidden"; }); });`),
    options: { per: "s per character (0.083: 12 a second)", fit: "s a long line is fitted into (1.6)", start: "s (0.35)", clearAt: "s the line clears (2.95)" }, defaults: { per: 0.083, fit: 1.6, start: 0.35, clearAt: 2.95 },
    demo: H("Ngày xửa ngày xưa, ở một ngôi làng nhỏ", `MW.textTypewriterSteps(q(".tk-head"), tl, 0, {});`, 3.2, { size: 90, weight: 600 }, ".tk-head { text-align: left; }"),
  }),

  T("text/caret-typewriter", {
    uses: ["drive"],
    fn: mk(`var cs = cells(el, el.textContent), n = cs.length, per = Math.min(o.per, o.fit / Math.max(1, n)), caret = document.createElement("span");
caret.style.cssText = "display:inline-block;width:" + o.caret + "em;height:1em;vertical-align:-0.12em;margin-left:0.06em;background:" + o.accent + ";"; el.appendChild(caret);
return MW.drive(tl, at, o.clearAt + 0.1, function (t) {
  var shown = 0; cs.forEach(function (c, i) { var v = t >= o.start + i * per && t < o.clearAt; c.style.display = v ? "inline-block" : "none"; if (v) shown++; });
  var typing = shown < n && t >= o.start, idle = t - (o.start + n * per); caret.style.visibility = t >= o.clearAt ? "hidden" : typing || idle < 0 ? "visible" : (Math.floor(idle / (o.blink / 2)) % 2 ? "hidden" : "visible");
});`),
    options: { per: "s per character (0.07)", fit: "s at most (1.5)", start: "s (0.4)", caret: "em wide (0.12)", blink: "s per blink when idle (0.75, step)", clearAt: "s (3.45)", accent: "caret colour" },
    defaults: { per: 0.07, fit: 1.5, start: 0.4, caret: 0.12, blink: 0.75, clearAt: 3.45, accent: "#a99bff" },
    demo: H("&gt; viết kịch bản cho tôi", `MW.textCaretTypewriter(q(".tk-head"), tl, 0, {});`, 3.75, { size: 100, weight: 600, font: "JetBrains Mono" }, ".tk-head { text-align: left; letter-spacing: 0; }"),
  }),

  T("text/type-backspace-loop", {
    uses: ["drive"],
    fn: mk(`var slot = el.querySelector(o.slot), caret = document.createElement("span"), words = o.words.map(gr);
caret.style.cssText = "display:inline-block;width:0.08em;height:1em;vertical-align:-0.12em;margin-left:0.04em;background:" + o.accent + ";"; slot.parentNode.insertBefore(caret, slot.nextSibling);
// the plan: for each word, type, hold, delete (except the last), pause
var plan = [], t0 = o.start; words.forEach(function (w, i) { var tp = Math.min(o.type, o.maxWord / w.length); plan.push({ w: w, a: t0, b: t0 + tp * w.length, tp: tp }); t0 += tp * w.length; var hold = Math.max(o.hold, 0.7); plan[i].h = t0 + hold; t0 += hold; if (i < words.length - 1) { plan[i].d = t0 + o.back * w.length; t0 = plan[i].d + o.pause; } else plan[i].d = 1e9; });
return MW.drive(tl, at, o.loop, function (t) {
  var txt = "", busy = false, idleSince = 0;
  plan.forEach(function (p) { if (t < p.a) return; if (t < p.b) { txt = p.w.slice(0, Math.floor((t - p.a) / p.tp) + 1).join(""); busy = true; } else if (t < p.h) { txt = p.w.join(""); idleSince = p.b; busy = false; } else if (t < p.d) { var k = Math.max(0, p.w.length - Math.floor((t - p.h) / o.back) - 1); txt = p.w.slice(0, k).join(""); busy = true; } else { txt = ""; idleSince = p.d; busy = false; } });
  slot.textContent = txt; var ph = (t - idleSince) / 0.5; caret.style.opacity = busy || t < o.start ? "1" : String(0.15 + 0.85 * (0.5 + 0.5 * Math.cos(Math.PI * ph)));
});`),
    options: { words: "words typed in turn", type: "s per character typing (0.06)", back: "s per character deleting (0.03)", hold: "s held before deleting (1.0, at least 0.7)", pause: "s before the next word (0.28)", maxWord: "s a word may take to type (0.9)", start: "s (0.3)", slot: "the element typed into", accent: "caret colour", loop: "s (5.4)" },
    defaults: { words: ["video", "phim ngắn", "quảng cáo"], type: 0.06, back: 0.03, hold: 1.0, pause: 0.28, maxWord: 0.9, start: 0.3, slot: ".tb", accent: "#a99bff", loop: 5.4 },
    demo: { css: `${BG}\n.tbw { position: absolute; inset: 0; display: grid; place-items: center; font-size: 120px; font-weight: 800; } .tb { color: #a99bff; }`, html: `<div class="tbw"><div>Chúng tôi làm <span class="tb"></span></div></div>`, run: `MW.textTypeBackspaceLoop(q(".tbw"), tl, 0, {});`, duration: 5.4 },
  }),

  T("text/human-typewriter", {
    uses: U,
    fn: mk(`var g = gr(el.textContent), r = MW.rand(o.seed), times = [], t0 = 0, caret = document.createElement("span");
for (var i = 0; i < g.length; i++) { times.push(t0); var d = o.base * (1 + (r() * 2 - 1) * o.variance); if (/[,.!?…、。]/.test(g[i])) d += o.pause; if (g[i] === " ") { var w = ""; for (var j = i + 1; j < g.length && g[j] !== " "; j++) w += g[j]; if (w.length >= 6) d += o.longWord; } t0 += d; }
var k = o.fit ? o.fit / t0 : 1, cs = cells(el, el.textContent);
caret.style.cssText = "display:inline-block;width:0.06em;height:1em;vertical-align:-0.12em;margin-left:0.03em;background:" + o.accent + ";"; el.appendChild(caret);
return MW.drive(tl, at, o.clearAt + 0.1, function (t) {
  var last = -1; cs.forEach(function (c, i) { var v = t >= o.start + times[i] * k && t < o.clearAt; c.style.display = v ? "inline-block" : "none"; if (v) last = i; });
  var typing = last < cs.length - 1, sinceKey = last >= 0 ? t - (o.start + times[last] * k) : 0, idle = !typing || sinceKey > 0.3;
  caret.style.visibility = t >= o.clearAt ? "hidden" : idle ? (Math.floor(t / 0.5) % 2 ? "hidden" : "visible") : "visible";
});`),
    options: { base: "s per key (0.085)", variance: "± share (0.5)", pause: "s added after punctuation (0.32)", longWord: "s before a word of 6+ letters (0.12)", fit: "s the line is scaled to (2.6; 0: natural)", start: "s (0.3)", clearAt: "s (3.75)", accent: "caret", seed: "the rhythm" },
    defaults: { base: 0.085, variance: 0.5, pause: 0.32, longWord: 0.12, fit: 2.6, start: 0.3, clearAt: 3.75, accent: "#a99bff", seed: 7 },
    demo: H("Chào bạn, hôm nay mình kể một chuyện nhỏ.", `MW.textHumanTypewriter(q(".tk-head"), tl, 0, {});`, 4, { size: 88, weight: 600 }, ".tk-head { text-align: left; }"),
  }),

  T("text/terminal-type-scroll", {
    kind: "block",
    uses: ["drive"],
    fn: mk(`var body = el.querySelector(o.body), lh = parseFloat(getComputedStyle(body).fontSize) * 1.6, rows = [], t0 = o.start, out = gsap.parseEase("power2.out");
o.lines.forEach(function (l) { var d = document.createElement("div"); d.style.cssText = "position:absolute;left:0;right:0;height:" + lh + "px;line-height:" + lh + "px;white-space:pre;"; var cmd = l.charAt(0) === "$";
  if (cmd) { var p = document.createElement("span"); p.textContent = "$ "; p.style.color = o.accent; d.appendChild(p); var tx = document.createElement("span"); d.appendChild(tx); rows.push({ d: d, cmd: true, text: gr(l.slice(2)), tx: tx, t: t0 }); t0 += (l.length - 2) / o.cps + 0.12; }
  else { d.textContent = l.replace(/^\\+ /, "OK "); if (/^\\+ /.test(l)) d.style.color = "#3ddc84"; else d.style.color = "#8f9ab3"; rows.push({ d: d, cmd: false, t: t0 }); t0 += 0.17; }
  body.appendChild(d); });
var cur = document.createElement("span"); cur.style.cssText = "display:inline-block;width:0.6em;height:1.2em;vertical-align:middle;background:#e8ebf3;margin-left:2px;";
return MW.drive(tl, at, o.loop, function (t) {
  var shown = rows.filter(function (r) { return t >= r.t; }), n = shown.length, scroll = 0;
  shown.forEach(function (r, i) { if (i >= o.rows) scroll += out(Math.min(1, (t - r.t) / 0.14)); });
  var active = null;
  rows.forEach(function (r, i) { var on = t >= r.t; r.d.style.visibility = on ? "visible" : "hidden"; r.d.style.top = ((i - scroll) * lh) + "px"; r.d.style.opacity = i - scroll < -0.5 ? "0" : "1";
    if (r.cmd && on) { var k = Math.min(r.text.length, Math.floor((t - r.t) * o.cps) + 1); r.tx.textContent = r.text.slice(0, k).join(""); if (k < r.text.length) active = r; } });
  var last = shown[n - 1]; var host = active || (last && last.cmd ? last : null);
  if (host) { host.d.appendChild(cur); cur.style.visibility = active ? "visible" : (Math.floor(t) % 2 ? "hidden" : "visible"); } else cur.style.visibility = "hidden";
});`),
    options: { lines: "lines; '$ ' starts a typed command, '+ ' a success line", cps: "characters a second typing (60)", rows: "visible rows (4)", start: "s (0.3)", body: "the panel's text area", accent: "prompt colour", loop: "s (5)" },
    defaults: { lines: ["$ moworks new 'Phim giới thiệu'", "Tạo dự án trong thư mục projects/", "+ Đã tạo kịch bản mẫu", "$ moworks render --draft", "Đang dựng 24 khung hình mỗi giây...", "+ Xuất xong phim-gioi-thieu.mp4"], cps: 60, rows: 4, start: 0.3, body: ".tt-b", accent: "#a99bff", loop: 5 },
    demo: { css: `${BG}\n.tt { position: absolute; left: 50%; top: 50%; width: 1500px; height: 600px; margin: -300px 0 0 -750px; border-radius: 30px; background: #0a0c12; border: 3px solid #2a3350; font-family: ${MONO}; overflow: hidden; }
.tt-h { height: 70px; border-bottom: 2px solid #1d2232; display: flex; align-items: center; gap: 14px; padding: 0 30px; } .tt-h i { width: 22px; height: 22px; border-radius: 50%; background: #3a4466; }
.tt-b { position: relative; margin: 30px 50px; height: ${4 * 60 * 1.6}px; font-size: 60px; overflow: hidden; }`,
      html: `<div class="tt"><div class="tt-h"><i></i><i></i><i></i></div><div class="tt-b"></div></div>`, run: `MW.textTerminalTypeScroll(q(".tt"), tl, 0, {});`, duration: 5 },
  }),

  T("text/scramble-decode", {
    uses: U,
    fn: mk(`var target = gr(el.textContent), cs = cells(el, el.textContent), n = cs.length, col = getComputedStyle(el).color, span = Math.min(o.span, 0.09 * n);
var cls = function (g) { return /[0-9]/.test(g) ? "0123456789" : g === g.toLowerCase() && g !== g.toUpperCase() ? "abcdeghiklmnopqrstuvxyđ" : "ABCDEGHIKLMNOPQRSTUVXYĐ"; };
return MW.drive(tl, at, o.loop, function (t) {
  var f = Math.floor(t * o.fps), fade = 1 - Math.max(0, Math.min(1, (t - o.fadeAt) / 0.2));
  cs.forEach(function (c, i) {
    if (target[i] === " ") return; var lock = o.start + o.delay + span * i / Math.max(1, n - 1), unlock = o.backAt + 0.25 * (n - 1 - i) / Math.max(1, n - 1), locked = t >= lock && t < unlock;
    if (locked) { c.textContent = target[i]; c.style.color = col; } else { var r = MW.rand(o.seed * 7 + i * 131 + f), pool = cls(target[i]); c.textContent = pool[Math.floor(r() * pool.length)]; c.style.color = o.accent; }
  });
  el.style.opacity = String(t < o.start ? 0 : fade);
});`),
    options: { delay: "s before letters start to lock (0.5)", span: "s the locking spreads over (1.1)", fps: "noise rate (25)", start: "s (0.25)", backAt: "s it scrambles again from the right (2.95)", fadeAt: "s (3.2)", accent: "noise colour", loop: "s (3.4)", seed: "noise" },
    defaults: { delay: 0.5, span: 1.1, fps: 25, start: 0.25, backAt: 2.95, fadeAt: 3.2, accent: "rgba(169,155,255,0.9)", loop: 3.4, seed: 5 },
    demo: H("GIẢI MÃ THÀNH CÔNG", `MW.textScrambleDecode(q(".tk-head"), tl, 0, {});`, 3.4, { size: 130, weight: 900 }),
  }),

  T("text/decrypt-center", {
    uses: U,
    fn: mk(`var target = gr(el.textContent), cs = cells(el, el.textContent), n = cs.length, mid = (n - 1) / 2, ranks = Math.ceil(n / 2), step = Math.max(0.05, Math.min(0.2, o.span / ranks)), noise = gr(o.glyphs), col = getComputedStyle(el).color;
el.style.fontFamily = o.font;
return MW.drive(tl, at, o.loop, function (t) {
  var k = Math.floor(t / o.interval);
  cs.forEach(function (c, i) {
    if (target[i] === " ") return; var rank = Math.floor(Math.abs(i - mid) + 0.01), lock = o.start + rank * step, back = o.backAt + (ranks - 1 - rank) * (0.35 / ranks), locked = t >= lock && t < back;
    if (locked) { c.textContent = target[i]; c.style.color = col; c.style.fontWeight = ""; } else { var r = MW.rand(o.seed * 3 + i * 97 + k); c.textContent = noise[Math.floor(r() * noise.length)]; c.style.color = o.cipher; c.style.fontWeight = "600"; }
  });
});`),
    options: { interval: "s between cipher redraws (0.05)", span: "s the reveal takes (1.2), 0.05-0.2 s per rank from the centre", start: "s (0.6)", backAt: "s the outer letters scramble again (2.95)", glyphs: "cipher symbols", cipher: "cipher colour", font: "font for the line (mono)", loop: "s (3.4)", seed: "cipher" },
    defaults: { interval: 0.05, span: 1.2, start: 0.6, backAt: 2.95, glyphs: "!<>-_\\/[]{}=+*^?#%&$@", cipher: "rgba(61,160,255,0.85)", font: MONO, loop: 3.4, seed: 8 },
    demo: H("MẬT KHẨU ĐÚNG", `MW.textDecryptCenter(q(".tk-head"), tl, 0, {});`, 3.4, { size: 130, weight: 800, font: "JetBrains Mono" }),
  }),

  T("text/char-flicker-in", {
    uses: U,
    fn: mk(`var target = gr(el.textContent), cs = cells(el, el.textContent), n = cs.length, d = Math.min(o.delay, o.fit / Math.max(1, n)), noise = gr(o.glyphs), col = getComputedStyle(el).color, ul = document.createElement("span");
el.style.position = "relative"; ul.style.cssText = "position:absolute;height:6px;bottom:-0.1em;background:" + o.accent + ";"; el.appendChild(ul);
return MW.drive(tl, at, o.fadeAt + 0.3, function (t) {
  var active = null;
  cs.forEach(function (c, i) {
    if (target[i] === " ") return; var s0 = o.start + i * d, u = t - s0, r = MW.rand(o.seed + i * 17);
    if (u < 0) { c.textContent = "·"; c.style.color = "rgba(108,119,139,0.5)"; } else if (u < 0.05) { c.textContent = noise[Math.floor(r() * noise.length)]; c.style.color = o.accent; active = c; }
    else if (u < 0.08) { c.textContent = " "; active = c; } else if (u < 0.13) { r(); c.textContent = noise[Math.floor(r() * noise.length)]; c.style.color = o.accent; active = c; } else { c.textContent = target[i]; c.style.color = col; }
  });
  ul.style.visibility = active ? "visible" : "hidden"; if (active) { ul.style.left = active.offsetLeft + "px"; ul.style.width = active.offsetWidth + "px"; }
  el.style.opacity = String(1 - Math.max(0, Math.min(1, (t - o.fadeAt) / 0.25)));
});`),
    options: { delay: "s between letters (0.18)", fit: "s the line is fitted into (1.6)", start: "s (0.3)", glyphs: "flash symbols", accent: "flash colour", fadeAt: "s (3.05)", seed: "symbols" },
    defaults: { delay: 0.18, fit: 1.6, start: 0.3, glyphs: "#%&*+=?@$!<>/|^~", accent: "#a99bff", fadeAt: 3.05, seed: 3 },
    demo: H("Tín hiệu đã tới", `MW.textCharFlickerIn(q(".tk-head"), tl, 0, {});`, 3.4, { size: 150, weight: 800 }),
  }),

  T("text/slot-shuffle", {
    uses: U,
    fn: mk(`var target = gr(el.textContent), r = MW.rand(o.seed), out = gsap.parseEase("power2.out"), reels = [];
var cls = function (g) { return /[0-9]/.test(g) ? "0123456789" : "ABCDEGHIKLMNOPQRSTUVXYĐ"; };
el.textContent = ""; el.style.display = "inline-flex"; el.style.gap = "0.08em";
target.forEach(function (g, i) {
  var w = document.createElement("span"); w.style.cssText = "position:relative;display:inline-block;height:1.4em;overflow:hidden;border-radius:0.1em;padding:0 0.08em;background:" + (g === " " ? "transparent" : o.card) + ";";
  var s = document.createElement("span"); s.style.cssText = "display:block;line-height:1.4em;text-align:center;"; var pool = cls(g), seq = [];
  for (var k = 0; k < o.rows; k++) seq.push(g === " " ? " " : pool[Math.floor(r() * pool.length)]); seq.push(g);
  var down = i % 2 === 0; if (down) seq.reverse();
  seq.forEach(function (c) { var e = document.createElement("span"); e.style.display = "block"; e.textContent = c; s.appendChild(e); }); w.appendChild(s);
  var ul = document.createElement("span"); ul.style.cssText = "position:absolute;left:10%;right:10%;bottom:0.06em;height:0.05em;background:" + o.accent + ";opacity:0;"; w.appendChild(ul); el.appendChild(w); reels.push({ s: s, ul: ul, down: down, i: i, sp: g === " " });
});
var n = reels.length, st = Math.min(o.stagger, 1 / Math.max(1, n - 1));
return MW.drive(tl, at, o.fadeAt + 0.3, function (t) {
  reels.forEach(function (q) {
    var u = Math.max(0, Math.min(1, (t - o.start - q.i * st) / o.duration)), p = out(u), row = q.down ? o.rows * (1 - p) : o.rows * p, v = Math.abs(out(Math.min(1, u + 0.02)) - out(Math.max(0, u - 0.02))) / 0.04 * o.rows / o.duration;
    gsap.set(q.s, { y: -row * 1.4 + "em" }); var sy = 1 + Math.min(0.45, o.stretch * v); Array.prototype.forEach.call(q.s.children, function (e) { e.style.transform = "scale(" + (1 / Math.sqrt(sy)) + "," + sy + ")"; });
    q.ul.style.opacity = u >= 1 && !q.sp ? "1" : "0";
  });
  el.style.opacity = String(1 - Math.max(0, Math.min(1, (t - o.fadeAt) / 0.3)));
});`),
    options: { rows: "random letters before the target (6)", duration: "s per reel (0.8)", stagger: "s (0.06, ≤ 1 s)", start: "s (0.35)", stretch: "stretch per row a second (0.035)", card: "window colour", accent: "landing underline", fadeAt: "s (3.0)", seed: "letters" },
    defaults: { rows: 6, duration: 0.8, stagger: 0.06, start: 0.35, stretch: 0.035, card: "#151a28", accent: "#a99bff", fadeAt: 3.0, seed: 4 },
    demo: H("MAY MẮN", `MW.textSlotShuffle(q(".tk-head"), tl, 0, {});`, 3.4, { size: 190, weight: 900 }),
  }),

  T("text/char-offset-cycle", {
    uses: ["drive"],
    fn: mk(`var target = gr(el.textContent), cs = cells(el, el.textContent), n = cs.length, st = Math.min(o.stagger, 0.9 / Math.max(1, n)), p1o = gsap.parseEase("power1.out"), p1i = gsap.parseEase("power1.in"), col = getComputedStyle(el).color;
var CL = [["a", 26], ["A", 26], ["0", 10]];
var shift = function (g, k) { var d = g.normalize("NFD"), base = d.charAt(0), marks = d.slice(1); for (var c = 0; c < CL.length; c++) { var s = CL[c][0].charCodeAt(0), L = CL[c][1], code = base.charCodeAt(0); if (code >= s && code < s + L) return (String.fromCharCode(s + ((code - s + k) % L + L) % L) + marks).normalize("NFC"); } return g; };
return MW.drive(tl, at, o.loop, function (t) {
  cs.forEach(function (c, i) { var p = p1o(Math.max(0, Math.min(1, (t - o.start - i * st) / o.duration))), b = p1i(Math.max(0, Math.min(1, (t - o.backAt) / 0.5))), k = Math.ceil(o.offset * Math.max(1 - p, b)); c.textContent = shift(target[i], k); c.style.color = k > 0 ? o.accent : col; });
});`),
    options: { offset: "steps it starts shifted by (10)", duration: "s per letter (1), ease-out quad", stagger: "s (0.12, ≤ 0.9 s)", start: "s (0.4)", backAt: "s it shifts away again (3.0)", accent: "colour while shifted", loop: "s (3.6)" },
    defaults: { offset: 10, duration: 1, stagger: 0.12, start: 0.4, backAt: 3, accent: "#a99bff", loop: 3.6 },
    demo: H("CHUYỂN ĐỘNG", `MW.textCharOffsetCycle(q(".tk-head"), tl, 0, {});`, 3.6, { size: 170, weight: 800, font: "JetBrains Mono" }),
  }),

  T("text/placeholder-replace", {
    uses: ["drive"],
    fn: mk(`var cs = cells(el, el.textContent), n = cs.length, per = Math.min(o.per, 1.2 / Math.max(1, n)), col = getComputedStyle(el).color;
cs.forEach(function (c) { c.style.position = "relative"; var b = document.createElement("span"); b.className = "mw-ph"; b.style.cssText = "position:absolute;left:8%;right:8%;top:0.14em;bottom:0.1em;border-radius:0.06em;background:" + o.block + ";"; if (c.textContent === " ") b.style.display = "none"; c.appendChild(b); c.__b = b; });
return MW.drive(tl, at, o.backAt + 0.03 * n + 0.2, function (t) {
  cs.forEach(function (c, i) { var rev = t >= o.start + i * per && t < o.backAt + 0.03 * (n - 1 - i); c.__b.style.visibility = rev ? "hidden" : "visible"; c.style.color = rev ? (t - o.start - i * per < 0.14 ? o.accent : col) : "transparent"; });
});`),
    options: { per: "s per character (0.09, ≤ 1.2 s)", start: "s (0.45)", backAt: "s the blocks return from the last letter (3.15)", block: "block colour", accent: "flash of a revealed letter (0.14 s)" },
    defaults: { per: 0.09, start: 0.45, backAt: 3.15, block: "#3a4466", accent: "#ffd23d" },
    demo: H("Đáp án: Hà Nội", `MW.textPlaceholderReplace(q(".tk-head"), tl, 0, {});`, 3.6, { size: 150, weight: 800 }),
  }),

  T("ui/scroll-reveal-feed", {
    kind: "block",
    uses: ["drive", "draw", "plot", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), out = gsap.parseEase("power2.out"), vx = 92, vy = 20, cols = ["#3dd6f5", "#a693ff", "#ffd23d", "#ff5d8f", "#3ddc84"];
      return MW.drive(tl, at, 3.6, function (t) {
        S.clear(); var sc = 300 * (io(MW.span(t, 0.3, 2.3)) - io(MW.span(t, 2.7, 3.35)));
        c.save(); MW.rr(c, vx, vy, 136, 160, 10); c.fillStyle = "#10131d"; c.fill(); c.clip();
        c.fillStyle = "#222a42"; MW.rr(c, vx + 11, vy + 14 - sc, 80, 8, 4); c.fill(); MW.rr(c, vx + 11, vy + 28 - sc, 110, 6, 3); c.fill();
        for (var i = 0; i < 5; i++) { var y0 = 80 + 80 * i, y = y0 - sc, maxSc = 0; for (var s = 0; s <= t; s += 0.05) maxSc = Math.max(maxSc, 300 * (io(MW.span(s, 0.3, 2.3)) - io(MW.span(s, 2.7, 3.35)))); var reached = y0 - maxSc, p = out(Math.max(0, Math.min(1, (160 - reached) / 76)));
          c.globalAlpha = p; MW.rr(c, vx + 11, vy + y + 20 * (1 - p), 114, 56, 8); c.fillStyle = "#1b2130"; c.fill(); c.fillStyle = cols[i]; MW.rr(c, vx + 19, vy + y + 8 + 20 * (1 - p), 40, 40, 6); c.fill(); c.fillStyle = "#3a4466"; c.fillRect(vx + 66, vy + y + 14 + 20 * (1 - p), 50, 6); c.fillRect(vx + 66, vy + y + 26 + 20 * (1 - p), 34, 6); c.globalAlpha = 1; }
        c.restore(); c.fillStyle = "#222a42"; MW.rr(c, vx + 140, vy, 4, 160, 2); c.fill(); c.fillStyle = "#8b7bff"; MW.rr(c, vx + 140, vy + 120 * sc / 300, 4, 40, 2); c.fill();
      });
    },
    options: {}, defaults: {},
    notes: "Plays once: a card that has been revealed stays while the page scrolls back.",
    demo: CV("uiScrollRevealFeed", 3.6),
  }),

  T("motion/parallax-layers", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll("[data-travel]"));
      return MW.drive(tl, at, o.duration * o.passes, function (t) { var p = (t / o.duration) % 1; Ls.forEach(function (l) { var tr = parseFloat(l.getAttribute("data-travel")) * o.unit; gsap.set(l, { y: tr * (0.45 - p) }); }); });
    },
    options: { duration: "s per pass, linear (1.2)", passes: "(3)", unit: "px per reference unit (5); each layer's travel in data-travel (40 / 25 / 10)" }, defaults: { duration: 1.2, passes: 3, unit: 5 },
    demo: { css: `${BG}\n.pl { position: absolute; left: 50%; top: 50%; width: 1300px; height: 780px; margin: -390px 0 0 -650px; border-radius: 30px; background: #10131d; border: 3px solid #2a3350; overflow: hidden;
  background-image: linear-gradient(#1b2130 2px, transparent 2px), linear-gradient(90deg, #1b2130 2px, transparent 2px); background-size: 80px 80px; } .pl > div { position: absolute; border-radius: 40px; }`,
      html: `<div class="pl"><div data-travel="10" style="left:140px;top:120px;width:520px;height:520px;border-radius:50%;background:#2a2350"></div><div data-travel="25" style="left:560px;top:250px;width:440px;height:300px;background:#3a3566"></div><div data-travel="40" style="left:380px;top:330px;width:380px;height:240px;background:linear-gradient(160deg,#a693ff,#6a4cf0)"></div></div>`,
      run: `MW.motionParallaxLayers(q(".pl"), tl, 0, {});`, duration: 3.6 },
  }),

  T("ui/sticky-pin-section", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var subj = el.querySelector(o.subject), caps = Array.prototype.slice.call(el.querySelectorAll(o.captions));
      return MW.drive(tl, at, o.pass * caps.length, function (t) {
        var k = Math.min(caps.length - 1, Math.floor(t / o.pass)), p = (t / o.pass) - k;
        gsap.set(subj, { scale: 0.96 + 0.08 * Math.sin(Math.PI * p) });
        caps.forEach(function (c, i) { if (i !== k) { c.style.opacity = "0"; return; } var y = p < 0.35 ? 62 + (-4 - 62) * p / 0.35 : -4 + (-72 + 4) * (p - 0.35) / 0.65, a = p < 0.35 ? p / 0.35 : 1 - (p - 0.35) / 0.65; gsap.set(c, { y: y * o.unit }); c.style.opacity = String(a); });
      });
    },
    options: { pass: "s per caption pass, linear (1.1)", unit: "px per reference unit (5)", subject: "the pinned subject", captions: "the caption blocks" }, defaults: { pass: 1.1, unit: 5, subject: ".sp-s", captions: ".sp-c" },
    demo: { css: `${BG}\n.sp { position: absolute; left: 50%; top: 50%; width: 1500px; height: 820px; margin: -410px 0 0 -750px; border-radius: 30px; background: #10131d; border: 3px solid #2a3350; overflow: hidden; }
.sp-s { position: absolute; left: 160px; top: 160px; width: 500px; height: 500px; border-radius: 60px; background: linear-gradient(160deg, #a693ff, #6a4cf0); } .sp-c { position: absolute; left: 780px; top: 340px; width: 600px; font-size: 64px; font-weight: 800; opacity: 0; } .sp-c span { display: block; font-size: 34px; font-weight: 500; color: #9aa3b8; margin-top: 16px; }`,
      html: `<div class="sp"><div class="sp-s"></div><div class="sp-c">Nhẹ hơn<span>Chỉ 180 gam</span></div><div class="sp-c">Bền hơn<span>Vỏ nhôm nguyên khối</span></div><div class="sp-c">Lâu hơn<span>Pin dùng cả ngày</span></div></div>`, run: `MW.uiStickyPinSection(q(".sp"), tl, 0, {});`, duration: 3.3 },
  }),

  T("ui/scroll-progress-bar", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      el.style.transformOrigin = "0 50%";
      return MW.drive(tl, at, o.duration, function (t) { gsap.set(el, { scaleX: t / o.duration }); });
    },
    options: { duration: "s it fills, linear (follows the scroll in a page)" }, defaults: { duration: 1 },
    demo: { css: `${BG}\n.spb { position: absolute; left: 50%; top: 50%; width: 1400px; height: 800px; margin: -400px 0 0 -700px; border-radius: 30px; background: #10131d; border: 3px solid #2a3350; overflow: hidden; padding: 80px 90px; box-sizing: border-box; }
.spb-bar { position: absolute; left: 0; top: 0; height: 14px; width: 100%; background: #8b7bff; transform: scaleX(0); } .spb i { display: block; height: 36px; border-radius: 18px; background: #1b2130; margin-bottom: 34px; } .spb b { display: block; height: 260px; border-radius: 30px; background: #222a42; margin-bottom: 40px; }`,
      html: `<div class="spb"><div class="spb-bar"></div><b></b><i></i><i style="width:80%"></i><i></i><i style="width:60%"></i></div>`, run: `MW.uiScrollProgressBar(q(".spb-bar"), tl, 0.3, { duration: 2.2 });`, duration: 3 },
  }),

  T("ui/horizontal-scrub", {
    kind: "block",
    uses: ["drive", "draw", "plot", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, cols = ["#3dd6f5", "#a693ff", "#ffd23d", "#ff5d8f", "#3ddc84"];
      return MW.drive(tl, at, 3.6, function (t) {
        S.clear(); var p = MW.span(t, 0.3, 1.7) - MW.span(t, 2.1, 3.5), x = -324 * p, vx = 52, vy = 50;
        c.save(); MW.rr(c, vx, vy, 248, 100, 10); c.fillStyle = "#10131d"; c.fill(); c.clip();
        for (var i = 0; i < 5; i++) { var cx = vx + 12 + 112 * i + x; MW.rr(c, cx, vy + 12, 100, 76, 10); c.fillStyle = "#1b2130"; c.fill(); c.fillStyle = cols[i]; MW.rr(c, cx + 8, vy + 20, 84, 36, 6); c.fill(); c.fillStyle = "#3a4466"; c.fillRect(cx + 8, vy + 64, 60, 6); }
        c.restore(); c.fillStyle = "#222a42"; MW.rr(c, 34, vy, 6, 100, 3); c.fill(); c.fillStyle = "#8b7bff"; MW.rr(c, 34, vy + 70 * p, 6, 30, 3); c.fill();
        MW.rr(c, vx, vy + 112, 248, 6, 3); c.fillStyle = "#222a42"; c.fill(); MW.rr(c, vx, vy + 112, 248 * p, 6, 3); c.fillStyle = "#8b7bff"; c.fill();
      });
    },
    options: {}, defaults: {},
    demo: CV("uiHorizontalScrub", 3.6),
  }),

  T("ui/vertical-pager-snap", {
    kind: "block",
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), p3 = gsap.parseEase("power3.out"), cols = ["#6a4cf0", "#1580b8", "#b37a1c"];
      var Y = function (t) { if (t < 0.3) return 0; if (t < 0.8) return 50 * io((t - 0.3) / 0.5); if (t < 1.65) return 50 * (1 - p3((t - 0.8) / 0.85)); if (t < 1.85) return 0; if (t < 2.35) return 100 * io((t - 1.85) / 0.5); if (t < 3.2) return 100 + 60 * p3((t - 2.35) / 0.85); if (t < 3.9) return 160; return 160 * (1 - io(Math.min(1, (t - 3.9) / 0.4))); };
      return MW.drive(tl, at, 4.4, function (t) {
        S.clear(); var y = Y(t), vx = 112, vy = 20;
        c.save(); MW.rr(c, vx, vy, 96, 160, 14); c.fillStyle = "#10131d"; c.fill(); c.clip();
        for (var i = 0; i < 3; i++) { var py = vy + i * 160 - y; c.fillStyle = cols[i]; c.fillRect(vx, py, 96, 160); MW.txt(c, String(i + 1), vx + 48, py + 70, 40, "#fff", 900); MW.txt(c, ["Mở đầu", "Nội dung", "Kết"][i], vx + 48, py + 110, 9, "rgba(255,255,255,0.8)", 700); }
        c.restore(); c.strokeStyle = "#3a4466"; c.lineWidth = 2; MW.rr(c, vx, vy, 96, 160, 14); c.stroke();
        var drag = (t > 0.2 && t < 0.9) || (t > 1.75 && t < 2.45), fa = drag ? 1 : 0; if (fa) { var fy = t < 1 ? 130 - y : 130 - (y - 0); c.globalAlpha = 0.85; c.fillStyle = "#e8ebf3"; c.beginPath(); c.arc(vx + 60, vy + Math.max(20, fy), 9, 0, 2 * Math.PI); c.fill(); c.globalAlpha = 1; }
        for (var k = 0; k < 3; k++) { MW.rr(c, 230, 60 + k * 26, 24, 22, 4); c.fillStyle = Math.round(y / 160) === k ? "#8b7bff" : "#222a42"; c.fill(); }
      });
    },
    options: {}, defaults: {},
    notes: "Released under half a panel it springs back; over half it snaps to the next panel (0.85 s power3.out).",
    demo: CV("uiVerticalPagerSnap", 4.4),
  }),

  T("text/scroll-resolve-letters", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars;
      return MW.drive(tl, at, (ch.length - 1) * o.each + o.duration, function (t) {
        ch.forEach(function (c, i) { var u = Math.max(0, Math.min(1, (t - i * o.each) / o.duration)); gsap.set(c, { y: o.rise * (1 - u) }); c.style.opacity = String(o.from + (1 - o.from) * u); c.style.filter = u < 1 ? "blur(" + o.blur * (1 - u) + "px)" : ""; });
      });
    },
    options: { each: "s between letters (0.1)", duration: "s per letter, linear (0.35)", from: "opacity at the start (0.18)", blur: "px (15)", rise: "px (40)" }, defaults: { each: 0.1, duration: 0.35, from: 0.18, blur: 15, rise: 40 },
    demo: H("Rõ dần khi cuộn", `MW.textScrollResolveLetters(q(".tk-head"), tl, 0.3, {});`, 2.6, { size: 160, weight: 800 }),
  }),

  T("motion/depth-zoom-in", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var io = gsap.parseEase("power2.inOut"), host = el.parentNode, shade = document.createElement("div"), guide = document.createElement("div");
      shade.style.cssText = "position:absolute;inset:0;background:#000;border-radius:inherit;pointer-events:none;"; el.appendChild(shade);
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      guide.style.cssText = "position:absolute;pointer-events:none;border:3px dashed rgba(233,235,243,0.4);border-radius:40px;"; host.appendChild(guide);
      return MW.drive(tl, at, o.backAt == null ? o.duration : o.backAt + 0.6, function (t) {
        var p = io(Math.max(0, Math.min(1, t / o.duration))); if (o.backAt != null) p *= 1 - io(Math.max(0, Math.min(1, (t - o.backAt) / 0.6)));
        gsap.set(el, { scale: o.from + (1 - o.from) * p }); shade.style.opacity = String(0.3 * (1 - p));
        guide.style.left = el.offsetLeft + "px"; guide.style.top = el.offsetTop + "px"; guide.style.width = el.offsetWidth + "px"; guide.style.height = el.offsetHeight + "px"; guide.style.opacity = String(1 - p);
      });
    },
    options: { from: "start scale (0.78)", duration: "s (1.2), in-out", backAt: "s after the start to go back (null)" }, defaults: { from: 0.78, duration: 1.2, backAt: null },
    assets: [{ path: "shot.svg", data: LANDSCAPE }],
    demo: { css: `${BG}\n.dz { position: absolute; inset: 0; display: grid; place-items: center; } .dz-c { position: relative; width: 1120px; height: 670px; border-radius: 40px; background: url(assets/shot.svg) center / cover; }`, html: `<div class="dz"><div class="dz-c"></div></div>`, run: `MW.motionDepthZoomIn(q(".dz-c"), tl, 0.3, { backAt: 2.3 });`, duration: 3.4 },
  }),

  T("ui/pinned-story-steps", {
    kind: "block",
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut");
      var s = function (t) { return MW.path([[0, 0, 0], [0.4, 0, 0], [1.1, 1, 0], [1.8, 1, 0], [2.5, 2, 0], [3.4, 2, 0], [3.9, 0, 0]], t, io)[0]; };
      var N = [[206, 60], [246, 104], [214, 148]];
      return MW.drive(tl, at, 4.2, function (t) {
        S.clear(); var v = s(t);
        c.save(); c.beginPath(); c.rect(20, 25, 142, 150); c.clip();
        o.steps.forEach(function (st, i) { var y = 100 + (i - v) * 60, act = Math.max(0, 1 - Math.abs(i - v)); c.globalAlpha = 0.28 + 0.72 * act; MW.txt(c, "0" + (i + 1), 40, y - 10, 14, act > 0.5 ? "#a99bff" : "#6c778b", 900, "left"); MW.txt(c, st[0], 40, y + 8, 10, "#e8ebf3", 800, "left"); MW.txt(c, st[1], 40, y + 22, 7, "#8f9ab3", 600, "left"); }); c.restore(); c.globalAlpha = 1;
        c.fillStyle = "#8b7bff"; c.fillRect(26, 84, 3, 44);
        MW.rr(c, 170, 30, 136, 140, 12); c.fillStyle = "#151a28"; c.fill(); c.strokeStyle = "#2a3350"; c.lineWidth = 1; c.stroke();
        c.strokeStyle = "#2a3142"; c.lineWidth = 4; c.beginPath(); c.moveTo(N[0][0], N[0][1]); c.lineTo(N[1][0], N[1][1]); c.lineTo(N[2][0], N[2][1]); c.stroke();
        c.strokeStyle = "#8b7bff"; c.beginPath(); c.moveTo(N[0][0], N[0][1]); var a = Math.min(1, v), b = Math.max(0, v - 1); c.lineTo(N[0][0] + (N[1][0] - N[0][0]) * a, N[0][1] + (N[1][1] - N[0][1]) * a); if (b > 0) c.lineTo(N[1][0] + (N[2][0] - N[1][0]) * b, N[1][1] + (N[2][1] - N[1][1]) * b); c.stroke();
        N.forEach(function (n, i) { var act = Math.max(0, 1 - Math.abs(i - v)), passed = v >= i - 0.01; c.fillStyle = passed ? "#8b7bff" : "#222a42"; c.beginPath(); c.arc(n[0], n[1], 13 + 3 * act, 0, 2 * Math.PI); c.fill(); MW.txt(c, String(i + 1), n[0], n[1] + 0.5, 10, "#fff", 900); });
        for (var k = 0; k < 3; k++) { c.fillStyle = Math.round(v) === k ? "#a99bff" : "#3a4466"; c.beginPath(); c.arc(224 + k * 12, 180, 3, 0, 2 * Math.PI); c.fill(); }
      });
    },
    options: { steps: "[[title, line], ...] (3)" }, defaults: { steps: [["Ý tưởng", "Viết ra điều muốn nói"], ["Phân cảnh", "Chia thành từng khung"], ["Dựng phim", "Ghép hình và tiếng"]] },
    demo: CV("uiPinnedStorySteps", 4.2),
  }),

  T("title/marquee-band", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var track = el.querySelector(o.track), unit = track.firstElementChild, w = 0;
      var copies = 6; for (var i = 1; i < copies; i++) track.appendChild(unit.cloneNode(true));
      return MW.drive(tl, at, o.period * o.loops, function (t) { if (!w) w = unit.offsetWidth; gsap.set(track, { x: -w * ((t / o.period) % 1) }); });
    },
    options: { period: "s per unit width, linear (2.5): a seamless wrap", loops: "(2)", track: "the moving row (its first child is one unit)" }, defaults: { period: 2.5, loops: 2, track: ".mb-t" },
    demo: { css: `${BG}\n.mb { position: absolute; left: 0; right: 0; top: 50%; height: 220px; margin-top: -110px; background: #8b7bff; overflow: hidden; } .mb::before, .mb::after { content: ""; position: absolute; left: 0; right: 0; height: 2px; background: #3a4466; }
.mb::before { top: -40px; } .mb::after { bottom: -40px; } .mb-t { position: absolute; left: 0; top: 0; height: 100%; width: max-content; display: flex; white-space: nowrap; } .mb-u { flex: none; display: flex; align-items: center; gap: 80px; padding-right: 80px; font-size: 130px; font-weight: 800; color: #0b0d12; }
.mb-u svg { width: 80px; height: 80px; }`,
      html: `<div class="mb"><div class="mb-t"><div class="mb-u"><span>CHUYỂN ĐỘNG</span><svg viewBox="-8 -8 16 16"><path d="M0 -8 L2.2 -2.2 L8 0 L2.2 2.2 L0 8 L-2.2 2.2 L-8 0 L-2.2 -2.2 Z" fill="#0b0d12"/></svg><span>CUỘN TRANG</span><svg viewBox="-8 -8 16 16"><path d="M0 -8 L2.2 -2.2 L8 0 L2.2 2.2 L0 8 L-2.2 2.2 L-8 0 L-2.2 -2.2 Z" fill="#0b0d12"/></svg></div></div></div>`,
      run: `MW.titleMarqueeBand(q(".mb"), tl, 0, {});`, duration: 5 },
  }),

  T("motion/clip-open", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var io = gsap.parseEase("power2.inOut"), pin = gsap.parseEase("power2.in");
      return MW.drive(tl, at, o.closeAt == null ? o.duration : o.closeAt + 0.5, function (t) {
        var p = io(Math.max(0, Math.min(1, t / o.duration))); if (o.closeAt != null && t > o.closeAt) p = 1 - pin(Math.min(1, (t - o.closeAt) / 0.5));
        el.style.clipPath = "inset(" + o.insetY * (1 - p) + "% " + o.insetX * (1 - p) + "% round " + (o.radius[0] + (o.radius[1] - o.radius[0]) * p) + "px)";
      });
    },
    options: { insetY: "% at the start, top and bottom (12)", insetX: "% left and right (42)", radius: "[start, end] px ([110, 30])", duration: "s (1.2), in-out", closeAt: "s after the start to close in 0.5 s (null)" },
    defaults: { insetY: 12, insetX: 42, radius: [110, 30], duration: 1.2, closeAt: null },
    assets: [{ path: "shot.svg", data: LANDSCAPE }],
    demo: { css: `${BG}\n.co { position: absolute; inset: 0; display: grid; place-items: center; } .co-p { width: 1440px; height: 816px; background: url(assets/shot.svg) center / cover; }`, html: `<div class="co"><div class="co-p"></div></div>`, run: `MW.motionClipOpen(q(".co-p"), tl, 0.4, { closeAt: 2.2 });`, duration: 3.2 },
  }),

  T("ui/velocity-skew-feed", {
    kind: "block",
    uses: ["drive", "draw", "plot", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), cols = ["#3dd6f5", "#a693ff", "#ffd23d", "#ff5d8f", "#3ddc84", "#ffb547", "#8b7bff"], dt = 1 / 240;
      var Y = function (t) { return 190 * (io(MW.span(t, 0.3, 0.85)) - io(MW.span(t, 1.6, 2.15))); };
      return MW.drive(tl, at, 2.8, function (t) {
        S.clear(); var sk = 0, v = 0; for (var s = 0; s < t; s += dt) { var sp = (Y(s + dt) - Y(s)) / dt, target = Math.max(-9, Math.min(9, sp * o.factor)), a = o.k * (target - sk) - o.c * v; v += a * dt; sk += v * dt; }
        var vx = 80, vy = 21; c.save(); MW.rr(c, vx, vy, 160, 158, 14); c.fillStyle = "#10131d"; c.fill(); c.clip();
        for (var i = 0; i < 7; i++) { var y = vy + 10 + 62 * i - Y(t); c.save(); c.translate(vx + 80, y + 25); c.transform(1, Math.tan(sk * Math.PI / 180), 0, 1, 0, 0); MW.rr(c, -64, -25, 128, 50, 8); c.fillStyle = "#1b2130"; c.fill(); c.fillStyle = cols[i]; MW.rr(c, -56, -17, 34, 34, 6); c.fill(); c.fillStyle = "#3a4466"; c.fillRect(-14, -12, 60, 6); c.fillRect(-14, 2, 40, 6); c.restore(); }
        c.restore(); c.strokeStyle = "#3a4466"; c.lineWidth = 2; MW.rr(c, vx, vy, 160, 158, 14); c.stroke();
      });
    },
    options: { factor: "degrees per unit/s of scroll speed (0.012), ±9°", k: "spring stiffness (520)", c: "damping (30)" }, defaults: { factor: 0.012, k: 520, c: 30 },
    demo: CV("uiVelocitySkewFeed", 2.8),
  }),
];

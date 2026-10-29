// TakayuStudio, Japanese (batch 3.5): phrase and punctuation timing, vertical writing, ruby, IME conversion, stroke order and brush
// writing (stroke paths drawn here by hand, no KanjiVG data), manga and lyric telops, comments and subtitle rules, each shown with
// Vietnamese text where the idea carries over; written here from the site's ideas and numbers (no code of the site).
import { T } from "../../takayu/define.mjs";
import { headline, demo, ui } from "../../takayu/stages.mjs";
import { LANDSCAPE } from "../../demo-media.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; }`;
const FT = `${BG}\n.ft { position: absolute; inset: 0; background: url(assets/shot.svg) center / cover; } .ft::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.55)); }`;
const SHOT = [{ path: "shot.svg", data: LANDSCAPE }];
const ST = `.st { position: absolute; inset: 0; display: grid; place-items: center; }`;
const H = (text, run, duration = 3, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);
const OUT = (w, col) => `-webkit-text-stroke: ${w}em ${col}; paint-order: stroke fill;`;
const GR = `var seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;
var gr = function (s) { s = String(s).normalize("NFC"); if (!seg) return Array.from(s); var out = [], it = seg.segment(s)[Symbol.iterator](), r; while (!(r = it.next()).done) out.push(r.value.segment); return out; };
var cells = function (el, text) { el.textContent = ""; var word = null; return gr(text).map(function (g) { var s = document.createElement("span"); s.textContent = g; s.style.display = "inline-block"; s.style.whiteSpace = "pre";
  if (g === " ") { word = null; el.appendChild(s); } else { if (!word) { word = document.createElement("span"); word.style.display = "inline-block"; word.style.whiteSpace = "nowrap"; el.appendChild(word); } word.appendChild(s); } return s; }); };`;
const mk = (body) => new Function("el", "tl", "at", "o", GR + "\n" + body);
// 木 (four strokes) and "Phúc" in calligraphic strokes, both drawn here by hand
const MOC = ["M17 37 C35 35 62 34 84 33", "M50 10 C50 40 51 70 50 93", "M48 37 C42 55 30 70 14 80", "M52 38 C60 55 72 68 88 78"];
const PHUC = [["M44 34 C46 72 44 110 40 142", "stop"], ["M46 36 C92 18 118 62 74 82 C64 86 54 86 46 84", "sweep"], ["M134 22 C136 70 134 110 130 142", "stop"], ["M134 98 C146 70 180 66 182 100 C183 122 182 132 188 142", "hook"],
  ["M212 84 C210 110 214 136 236 138 C256 140 268 120 270 92", "sweep"], ["M270 88 C270 110 272 128 278 142", "stop"], ["M240 46 C246 38 252 30 260 22", "dot"], ["M352 92 C336 78 304 86 302 112 C300 136 326 146 356 132", "sweep"]];

export default [
  T("text/phrase-reveal", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = el.querySelectorAll(o.chunk).length ? Array.prototype.slice.call(el.querySelectorAll(o.chunk)) : MW.split(el, "words").words, n = ch.length, st = Math.min(o.stagger, o.cap / Math.max(1, n - 1)), ex = gsap.parseEase("expo.out"), pin = gsap.parseEase("power2.in"), fs = parseFloat(getComputedStyle(el).fontSize), br = [];
      ch.forEach(function (c) { c.style.display = "inline-block"; c.style.whiteSpace = "nowrap"; c.style.position = "relative"; if (!o.bracket) { br.push(null); return; } var b = document.createElement("span"); b.style.cssText = "position:absolute;left:4%;right:4%;bottom:-0.08em;height:0.035em;background:" + o.accent + ";opacity:0;";
        ["left", "right"].forEach(function (s) { var k = document.createElement("span"); k.style.cssText = "position:absolute;" + s + ":0;bottom:0;width:0.035em;height:0.11em;background:" + o.accent + ";"; b.appendChild(k); }); c.appendChild(b); br.push(b); });
      return MW.drive(tl, at, o.loop, function (t) {
        var x = pin(Math.max(0, Math.min(1, (t - o.exitAt) / 0.3)));
        ch.forEach(function (c, i) { var u = ex(Math.max(0, Math.min(1, (t - o.start - i * st) / o.duration))); gsap.set(c, { y: o.rise * fs * (1 - u) }); c.style.opacity = String(u * (1 - x)); if (br[i]) br[i].style.opacity = String(u); });
      });
    },
    options: { chunk: "elements that are the phrases (if none, the words)", rise: "em (0.5)", duration: "s (0.6, expo.out)", stagger: "s (0.12)", cap: "s the phrases start within (1)", bracket: "an underline bracket under each phrase", start: "s (0.35)", exitAt: "s (2.95)", accent: "", loop: "s (3.4)" },
    defaults: { chunk: ".ch", rise: 0.5, duration: 0.6, stagger: 0.12, cap: 1, bracket: true, start: 0.35, exitAt: 2.95, accent: "#8b7bff", loop: 3.4 },
    notes: "Lines break only between phrases (BudouX or Intl.Segmenter for Japanese; words and compounds for Vietnamese).",
    demo: H(`<span class="ch">Mùa thu</span> <span class="ch">Hà Nội</span> <span class="ch">có</span> <span class="ch">hương</span> <span class="ch">hoa sữa</span>`, `MW.textPhraseReveal(q(".tk-head"), tl, 0, {});`, 3.4, { size: 120 }, ".tk-head { line-height: 1.6; } .ch { opacity: 0; }"),
  }),

  T("text/punctuation-pause-type", {
    uses: ["drive"],
    fn: mk(`var g = gr(el.textContent), cs = cells(el, el.textContent), T0 = [], t0 = 0, caret = document.createElement("span");
if (getComputedStyle(el).position === "static") el.style.position = "relative";
for (var i = 0; i < g.length; i++) { var close = /^[”’)\\]»」』"]$/.test(g[i]); if (close && i) { T0.push(T0[i - 1]); } else { T0.push(t0); t0 += o.per; }
  if (/^[、,，]$/.test(g[i])) t0 += o.comma; else if (/^[。.！!？?]$/.test(g[i])) t0 += o.stop; else if (close && i && /^[。.！!？?、,，]$/.test(g[i - 1])) {} }
var k = T0[T0.length - 1] > o.fit ? o.fit / T0[T0.length - 1] : 1;
caret.style.cssText = "position:absolute;width:" + o.caret + "px;background:" + o.accent + ";"; el.appendChild(caret);
return MW.drive(tl, at, o.loop, function (t) {
  var last = null, end = o.start + T0[T0.length - 1] * k, x = Math.max(0, Math.min(1, (t - o.exitAt) / 0.3));
  cs.forEach(function (c, i) { var u = Math.max(0, Math.min(1, (t - o.start - T0[i] * k) / 0.06)); c.style.opacity = String(u * (1 - x)); gsap.set(c, { y: o.rise * (1 - u) }); if (u > 0) last = c; });
  var ref = last || cs[0]; caret.style.left = (last ? ref.offsetLeft + ref.offsetWidth + 6 : ref.offsetLeft) + "px"; caret.style.top = ref.offsetTop + ref.offsetHeight * 0.12 + "px"; caret.style.height = ref.offsetHeight * 0.76 + "px";
  var typing = t < end + 0.06, blink = ((t - end) % 0.5) / 0.5 < 0.55; caret.style.opacity = String((t < o.start ? 0 : typing || blink ? 1 : 0) * (1 - x));
});`),
    options: { per: "s per character (0.06)", comma: "s added after a comma (0.2)", stop: "s after . ! ? (0.4)", fit: "s the line is compressed into if longer (1.9)", rise: "px (12)", caret: "px (10)", start: "s (0.35)", exitAt: "s (3.1)", accent: "", loop: "s (3.6)" },
    defaults: { per: 0.06, comma: 0.2, stop: 0.4, fit: 1.9, rise: 12, caret: 10, start: 0.35, exitAt: 3.1, accent: "#8b7bff", loop: 3.6 },
    notes: "Closing quotes and brackets come with the character before them, and the pause falls after them.",
    demo: H("Khoan đã, nghe mình nói. Được chứ?", `MW.textPunctuationPauseType(q(".tk-head"), tl, 0, {});`, 3.6, { size: 100, weight: 700 }, ".tk-head { text-align: left; }"),
  }),

  T("text/tategaki-reveal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var cols = el.textContent.split("|").map(function (s) { return s.trim().split(/\s+/); }), ex = gsap.parseEase("expo.out"), pin = gsap.parseEase("power2.in"), U = [];
      el.textContent = ""; el.style.display = "flex"; el.style.flexDirection = "row-reverse"; el.style.gap = o.gap + "em"; el.style.alignItems = "flex-start";
      cols.forEach(function (ws) { var c = document.createElement("div"); c.style.cssText = "display:flex;flex-direction:column;align-items:center;"; ws.forEach(function (w) { var s = document.createElement("span"); s.textContent = w; s.style.cssText = "display:block;line-height:1.2;white-space:nowrap;opacity:0;"; c.appendChild(s); U.push(s); }); el.appendChild(c); });
      var col = getComputedStyle(el).color, st = Math.min(o.stagger, o.cap / Math.max(1, U.length - 1));
      return MW.drive(tl, at, o.loop, function (t) {
        var x = pin(Math.max(0, Math.min(1, (t - o.exitAt) / 0.3)));
        U.forEach(function (s, i) { var u = ex(Math.max(0, Math.min(1, (t - o.start - i * st) / o.duration))); gsap.set(s, { y: -o.drop * (1 - u) }); s.style.opacity = String(u * (1 - x)); s.style.color = u > 0 && u < 0.98 ? o.accent : col; });
      });
    },
    options: { drop: "px (80)", duration: "s (0.5, expo.out)", stagger: "s (0.05)", cap: "s all units start within (1.4)", gap: "em between columns (1.5)", start: "s (0.35)", exitAt: "s (2.95)", accent: "colour while moving", loop: "s (3.4)" },
    defaults: { drop: 80, duration: 0.5, stagger: 0.05, cap: 1.4, gap: 1.5, start: 0.35, exitAt: 2.95, accent: "#ffb547", loop: 3.4 },
    notes: "Columns run right to left, top to bottom; for Vietnamese each syllable is one unit (Japanese uses writing-mode: vertical-rl).",
    demo: { css: `${BG}\n${ST} .tg { font-size: 84px; font-weight: 800; color: #ffe2a8; } .tg-p { padding: 60px 90px; border-radius: 30px; background: linear-gradient(180deg, #b3122e, #7a0b1f); box-shadow: 0 40px 100px rgba(0,0,0,0.5); }`,
      html: `<div class="st"><div class="tg-p"><div class="tg">Thịt mỡ dưa hành câu đối đỏ | Cây nêu tràng pháo bánh chưng xanh</div></div></div>`, run: `MW.textTategakiReveal(q(".tg"), tl, 0, {});`, duration: 3.4 },
  }),

  T("text/ruby-sync", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var U = Array.prototype.slice.call(el.querySelectorAll(o.unit)), n = U.length, st = Math.min(o.stagger, o.cap / Math.max(1, n - 1)), p2 = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in"), fs = parseFloat(getComputedStyle(el).fontSize), R = [];
      U.forEach(function (u) { u.style.display = "inline-block"; u.style.position = "relative"; var r = document.createElement("span"); r.textContent = u.getAttribute("data-r") || ""; r.style.cssText = "position:absolute;left:50%;bottom:100%;transform:translateX(-50%);white-space:nowrap;font-family:Inter,sans-serif;font-weight:700;font-size:" + o.size + "em;color:" + o.accent + ";opacity:0;"; u.appendChild(r); R.push(r); });
      return MW.drive(tl, at, o.loop, function (t) {
        var x = pin(Math.max(0, Math.min(1, (t - o.exitAt) / 0.3)));
        U.forEach(function (u, i) { var s0 = o.start + i * st, a = p2(Math.max(0, Math.min(1, (t - s0) / o.duration))), b = p2(Math.max(0, Math.min(1, (t - s0 - o.delay) / o.duration))); gsap.set(u, { y: o.rise * fs * (1 - a) }); u.style.opacity = String(a * (1 - x)); R[i].style.opacity = String(b); });
      });
    },
    options: { unit: "base units with data-r = the reading", rise: "em (0.4)", duration: "s (0.6, power2.out)", stagger: "s (0.16)", cap: "s (1)", delay: "s the reading trails (0.08)", size: "em of the reading (0.34)", start: "s (0.35)", exitAt: "s (2.95)", accent: "", loop: "s (3.4)" },
    defaults: { unit: ".rb", rise: 0.4, duration: 0.6, stagger: 0.16, cap: 1, delay: 0.08, size: 0.34, start: 0.35, exitAt: 2.95, accent: "#ffb547", loop: 3.4 },
    notes: "The Hán characters use the system's CJK font.",
    demo: { css: `${BG}\n${ST} .rs { font-size: 190px; font-weight: 700; line-height: 1.75; display: flex; gap: 70px; } .rb { opacity: 0; }`,
      html: `<div class="st"><div class="rs"><span class="rb" data-r="phúc">福</span><span class="rb" data-r="lộc">祿</span><span class="rb" data-r="thọ">壽</span><span class="rb" data-r="an">安</span><span class="rb" data-r="khang">康</span></div></div>`, run: `MW.textRubySync(q(".rs"), tl, 0, {});`, duration: 3.4 },
  }),

  T("ui/ime-conversion", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var tx = el.querySelector(o.text), win = el.querySelector(o.window), caret = el.querySelector(o.caret), n = o.states.length, typeEnd = o.start + Math.min(o.per * n, 1.6), sp = typeEnd + 0.3, en = sp + 1, rows = win ? Array.prototype.slice.call(win.children) : [];
      return MW.drive(tl, at, o.loop, function (t) {
        var x = Math.max(0, Math.min(1, (t - o.exitAt) / 0.3)); el.style.opacity = String(1 - x);
        if (t < sp) { var k = Math.max(-1, Math.min(n - 1, Math.floor((t - o.start) / (Math.min(o.per * n, 1.6) / n)))); tx.innerHTML = k < 0 ? "" : '<span style="border-bottom:4px dotted #8f9ab3">' + o.states[k] + "</span>"; }
        else { var parts = o.converted.map(function (s, i) { var f = t - sp - i * 0.08, flash = f >= 0 && f < 0.3 && t < en, ul = t < en ? (i === 0 ? "border-bottom:10px solid " + o.accent : "border-bottom:4px solid #8f9ab3") : ""; return '<span style="padding:0 6px;' + ul + ";" + (flash ? "background:" + o.accent + ";color:#0b0d12;" : "") + '">' + s + "</span>"; }); tx.innerHTML = parts.join(""); }
        if (win) { var w = Math.max(0, Math.min(1, (t - sp - 0.1) / 0.15)) * (t < en ? 1 : 0); win.style.opacity = String(w); rows.forEach(function (r, i) { r.style.background = i === 0 ? o.accent : "transparent"; r.style.color = i === 0 ? "#0b0d12" : ""; }); }
        if (caret) { var c = tx.getBoundingClientRect(), b = el.getBoundingClientRect(); caret.style.left = (c.right - b.left + 6) + "px"; caret.style.opacity = (Math.floor(t / 0.5) % 2 === 0 || (t > o.start && t < typeEnd)) ? "1" : "0"; }
      });
    },
    options: { states: "what the field shows after each key (Telex here; kana for Japanese)", converted: "the segments after Space", per: "s per key (0.09)", start: "s (0.35)", text: "", window: "the candidate window (its children are the rows)", caret: "", accent: "", exitAt: "s (4.45)", loop: "s (5)" },
    defaults: { states: ["t", "ti", "tie", "tiê", "tiên", "tiêng", "tiếng", "tiếng v", "tiếng vi", "tiếng vie", "tiếng viê", "tiếng viêt", "tiếng việt"], converted: ["Tiếng", "Việt"], per: 0.09, start: 0.35, text: ".im-t", window: ".im-w", caret: ".im-c", accent: "#8b7bff", exitAt: 4.45, loop: 5 },
    notes: "Space turns the composition into segments that flash 0.3 s, 0.08 s apart, and opens three candidates; Enter, a second later, commits and clears the underlines.",
    demo: { ...ui(`<div class="im"><div class="ui-field im-f"><span class="im-t"></span><i class="im-c"></i></div><div class="im-w"><div>Tiếng Việt</div><div>tiếng việt</div><div>TIẾNG VIỆT</div></div></div>`,
      `.im { position: relative; width: 1120px; height: 640px; } .im-f { position: absolute; left: 0; top: 140px; width: 1120px; height: 150px; font-size: 70px; box-sizing: border-box; } .im-c { position: absolute; top: 34px; width: 8px; height: 82px; background: #8b7bff; }
.im-w { position: absolute; left: 30px; top: 320px; width: 520px; border-radius: 26px; background: #1b2130; border: 3px solid #2a3350; padding: 14px; opacity: 0; } .im-w div { padding: 18px 26px; border-radius: 16px; font-size: 46px; font-weight: 600; }`),
      run: `MW.uiImeConversion(q(".im"), tl, 0, {});`, duration: 5 },
  }),

  T("text/stroke-order", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), io = gsap.parseEase("power1.inOut"), W = el.clientWidth, k = W / 100;
      svg.setAttribute("viewBox", "0 0 100 100"); svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;overflow:visible;"; if (getComputedStyle(el).position === "static") el.style.position = "relative";
      svg.innerHTML = '<path d="M50 0 V100 M0 50 H100" stroke="#3a4466" stroke-width="0.6" stroke-dasharray="2 2" fill="none"/>'; el.appendChild(svg);
      var mkp = function (d, col, w) { var p = document.createElementNS(ns, "path"); p.setAttribute("d", d); p.setAttribute("fill", "none"); p.setAttribute("stroke", col); p.setAttribute("stroke-width", w); p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round"); svg.appendChild(p); return p; };
      o.strokes.forEach(function (d) { mkp(d, "#2a3142", o.width); });
      var S = o.strokes.map(function (d, i) { var p = mkp(d, o.accent, o.width), L = p.getTotalLength(), b = document.createElementNS(ns, "g"), q = p.getPointAtLength(0); p.style.strokeDasharray = L + " " + L; p.style.strokeDashoffset = String(L);
        b.innerHTML = '<circle r="4.2" fill="' + o.accent + '"/><text y="1.6" text-anchor="middle" font-size="5" font-weight="800" fill="#0b0d12" font-family="Inter, sans-serif">' + (i + 1) + "</text>"; b.setAttribute("transform", "translate(" + (q.x - 5) + " " + (q.y - 5) + ")"); b.style.opacity = "0"; svg.appendChild(b); return { p: p, L: L, b: b, d: Math.max(0.16, L * k / 4 * 0.003) }; });
      var head = document.createElementNS(ns, "path"); head.setAttribute("d", "M0 -3.4 L5.5 0 L0 3.4 Z"); head.setAttribute("fill", o.accent); svg.appendChild(head);
      var tot = S.reduce(function (a, s) { return a + s.d; }, 0) + o.gap * (S.length - 1), f = tot > o.fit ? o.fit / tot : 1, t0 = o.start; S.forEach(function (s) { s.t = t0; s.d *= f; t0 += s.d + o.gap * f; });
      return MW.drive(tl, at, o.loop, function (t) {
        var x = Math.max(0, Math.min(1, (t - o.exitAt) / 0.3)), act = null; svg.style.opacity = String(1 - x);
        S.forEach(function (s) { var u = io(Math.max(0, Math.min(1, (t - s.t) / s.d))); s.p.style.strokeDashoffset = String(s.L * (1 - u)); s.p.setAttribute("stroke", u >= 1 ? o.ink : o.accent); s.b.style.opacity = t >= s.t ? "1" : "0"; if (u > 0 && u < 1) act = { s: s, u: u }; });
        if (act) { var l = act.s.L * act.u, a = act.s.p.getPointAtLength(l), b = act.s.p.getPointAtLength(Math.max(0, l - 1)); head.setAttribute("transform", "translate(" + a.x + " " + a.y + ") rotate(" + (Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI) + ")"); head.style.opacity = "1"; } else head.style.opacity = "0";
      });
    },
    options: { strokes: "SVG path data per stroke in a 100 × 100 box, in writing order (木 here, drawn by hand)", width: "stroke width in box units (5.5)", gap: "s between strokes (0.1)", fit: "s the strokes are fitted into (3.6)", start: "s (0.35)", exitAt: "s (4.55)", accent: "the stroke being written", ink: "finished strokes", loop: "s (5)" },
    defaults: { strokes: MOC, width: 5.5, gap: 0.1, fit: 3.6, start: 0.35, exitAt: 4.55, accent: "#ff5d8f", ink: "#e8ebf3", loop: 5 },
    notes: "Each stroke takes max(0.16 s, its length × 3 ms per px of a 136 px box), power1.inOut; a numbered badge marks where each starts.",
    demo: { css: `${BG}\n${ST} .so { position: relative; width: 640px; height: 640px; border-radius: 30px; background: #121722; border: 3px solid #262c3a; }`, html: `<div class="st"><div class="so"></div></div>`, run: `MW.textStrokeOrder(q(".so"), tl, 0, {});`, duration: 5 },
  }),

  T("text/brush-write-on", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var ns = "http://www.w3.org/2000/svg", meas = document.createElementNS(ns, "svg"), cv = document.createElement("canvas"), W = el.clientWidth, Hh = el.clientHeight, e = MW.ez(o.ease), p1o = gsap.parseEase("power1.out"), p1i = gsap.parseEase("power1.in");
      if (getComputedStyle(el).position === "static") el.style.position = "relative"; meas.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;"; el.appendChild(meas);
      cv.width = W; cv.height = Hh; cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;"; el.appendChild(cv); var c = cv.getContext("2d"), k = Math.min(W / o.box[0], Hh / o.box[1]), ox = (W - o.box[0] * k) / 2, oy = (Hh - o.box[1] * k) / 2;
      var S = o.strokes.map(function (s) { var p = document.createElementNS(ns, "path"); p.setAttribute("d", s[0]); meas.appendChild(p); var L = p.getTotalLength(), pts = []; for (var d = 0; d <= L; d += 0.8) { var q = p.getPointAtLength(d); pts.push([ox + q.x * k, oy + q.y * k]); } return { pts: pts, L: L, type: s[1], d: Math.max(0.18, L * 0.0032 * 140 / o.box[1]) }; });
      var tot = S.reduce(function (a, s) { return a + s.d; }, 0) + o.gap * (S.length - 1), f = tot > o.fit ? o.fit / tot : 1, t0 = o.start; S.forEach(function (s) { s.t = t0; s.d *= f; t0 += s.d + o.gap * f; });
      var R = o.brush * k, rad = function (u, type) { if (type === "dot") return R * (0.45 + 0.8 * u); var r = u < 0.12 ? R * (0.55 + 0.6 * p1o(u / 0.12)) : u < 0.42 ? R * (1.15 - 0.2 * (u - 0.12) / 0.3) : R * 0.95;
        if (type === "sweep" && u > 0.42) r *= 1 - 0.95 * p1i((u - 0.42) / 0.58); if (type === "hook" && u > 0.84) r *= 1 - 0.85 * (u - 0.84) / 0.16; if (type === "stop" && u > 0.85) r *= 1 + 0.16 * Math.sin(Math.PI * (u - 0.85) / 0.3); return r; };
      return MW.drive(tl, at, o.loop, function (t) {
        c.clearRect(0, 0, W, Hh); var x = Math.max(0, Math.min(1, (t - o.exitAt) / 0.35)), tip = null; c.globalAlpha = 1 - x; c.fillStyle = o.ink;
        S.forEach(function (s) { var u = e(Math.max(0, Math.min(1, (t - s.t) / s.d))), m = Math.floor((s.pts.length - 1) * u); if (u <= 0) return;
          for (var i = 0; i <= m; i++) { var r = rad(i / (s.pts.length - 1), s.type); c.beginPath(); c.arc(s.pts[i][0], s.pts[i][1], Math.max(0.3, r), 0, 2 * Math.PI); c.fill(); } if (u < 1) tip = s.pts[m]; });
        if (tip) { c.strokeStyle = o.accent; c.lineWidth = 3; c.beginPath(); c.arc(tip[0], tip[1], R * 1.9, 0, 2 * Math.PI); c.stroke(); } c.globalAlpha = 1;
      });
    },
    options: { strokes: "[[SVG path data, 'stop' | 'sweep' | 'hook' | 'dot'], ...] in writing order ('Phúc' here, drawn by hand)", box: "[w, h] of the stroke coordinates ([400, 160])", brush: "brush radius in box units (7)", gap: "s between strokes (0.08)", fit: "s (3.6)", start: "s (0.35)", ease: "(cubic-bezier(.65,0,.35,1))", exitAt: "s (4.5)", ink: "", accent: "ring at the brush tip", loop: "s (5)" },
    defaults: { strokes: PHUC, box: [400, 160], brush: 7, gap: 0.08, fit: 3.6, start: 0.35, ease: "cubic-bezier(.65,0,.35,1)", exitAt: 4.5, ink: "#1b1410", accent: "#c8102e", loop: 5 },
    notes: "The brush grows from 0.55 R to 1.15 R in the first 12 % of a stroke; sweeps taper off, hooks flick, stops swell at the end, dots grow.",
    demo: { css: `${BG}\n${ST} .bw { position: relative; width: 1400px; height: 620px; border-radius: 20px; background: linear-gradient(160deg, #f6eedc, #eadcbf); box-shadow: 0 50px 120px rgba(0,0,0,0.5); } .bw i { position: absolute; right: 60px; bottom: 50px; width: 90px; height: 90px; border-radius: 10px; border: 6px solid #c8102e; }`,
      html: `<div class="st"><div class="bw"><i></i></div></div>`, run: `MW.textBrushWriteOn(q(".bw"), tl, 0, {});`, duration: 5 },
  }),

  T("hand/onomatopoeia-impact", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, bg = o.bg ? document.querySelector(o.bg) : null, cv = document.createElement("canvas"), fl = document.createElement("div"), txt = el.textContent, pin = gsap.parseEase("power2.in");
      if (getComputedStyle(host).position === "static") host.style.position = "relative"; var CW = host.clientWidth, CH = host.clientHeight;
      cv.width = CW; cv.height = CH; cv.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;width:" + CW + "px;height:" + CH + "px;"; host.insertBefore(cv, el); var c = cv.getContext("2d");
      fl.style.cssText = "position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;"; host.appendChild(fl);
      el.textContent = ""; el.style.position = "relative"; el.style.display = "inline-block";
      [[o.outer, o.accent], [o.inner, o.dark], [0, null]].forEach(function (s, i) { var sp = document.createElement("span"); sp.textContent = txt; sp.style.cssText = "display:block;white-space:nowrap;" + (i ? "position:absolute;left:0;top:0;" : "") + (s[1] ? "-webkit-text-stroke:" + s[0] + "em " + s[1] + ";paint-order:stroke fill;color:" + s[1] + ";" : "color:" + o.fill + ";"); el.appendChild(sp); });
      return MW.drive(tl, at, o.exitAt + 0.35, function (t) {
        var f = Math.floor(t * 24), s = f < 0 ? 0 : f < 4 ? 3 - 2 * (f / 4) : 1, land = f - 4, k = land >= 0 && land < 8 ? 1 - land / 8 : 0, r = MW.rand(o.seed + f * 17), sx = (r() * 2 - 1) * o.shake * k, sy = (r() * 2 - 1) * o.shake * k, x = pin(Math.max(0, Math.min(1, (t - o.exitAt) / 0.3)));
        if (bg) gsap.set(bg, { x: sx, y: sy }); gsap.set(el, { scale: s * (1 + 0.15 * x), skewX: o.skew, rotation: o.angle, x: sx / 2, y: sy / 2 }); el.style.opacity = String(t > 0 ? 1 - x : 0); fl.style.opacity = land === 0 ? String(o.flash) : "0";
        c.clearRect(0, 0, CW, CH); if (land >= 0 && x < 1) { var rr = MW.rand(o.seed * 5 + f); c.fillStyle = "rgba(200,205,215," + (0.85 * (1 - x)).toFixed(3) + ")"; for (var i = 0; i < o.rays; i++) { var th = i / o.rays * 2 * Math.PI + rr() * 0.04, w = 0.012 + rr() * 0.02, ri = o.inner2[0] + rr() * (o.inner2[1] - o.inner2[0]), R = Math.hypot(CW, CH);
          c.beginPath(); c.moveTo(CW / 2 + ri * Math.cos(th), CH / 2 + 0.7 * ri * Math.sin(th)); c.lineTo(CW / 2 + R * Math.cos(th - w), CH / 2 + R * Math.sin(th - w)); c.lineTo(CW / 2 + R * Math.cos(th + w), CH / 2 + R * Math.sin(th + w)); c.closePath(); c.fill(); } }
      });
    },
    options: { outer: "em of the coloured outline (0.38)", inner: "em of the dark inner outline (0.11)", fill: "", accent: "", dark: "", skew: "degrees (−7)", angle: "degrees (−3.4)", shake: "± px for 8 frames (40)", flash: "light flash on the landing frame (0.22)", rays: "(64)", inner2: "[min, max] px of the clear ellipse ([370, 600])", bg: "the shot that shakes", exitAt: "s after the start (1.65)", seed: "(3)" },
    defaults: { outer: 0.38, inner: 0.11, fill: "#ffffff", accent: "#ff3b4f", dark: "#14091c", skew: -7, angle: -3.4, shake: 40, flash: 0.22, rays: 64, inner2: [370, 600], bg: ".ft", exitAt: 1.65, seed: 3 },
    notes: "Stepped at 24 fps: 3 → 1 in four frames, a flash on the landing frame, then a seeded shake fading over eight frames.",
    assets: SHOT,
    demo: { css: `${FT}\n${ST} .om { font-size: 280px; font-weight: 900; letter-spacing: 0.02em; opacity: 0; }`, html: `<div class="ft"></div><div class="st"><div class="om">RẦM!</div></div>`, run: `MW.handOnomatopoeiaImpact(q(".om"), tl, 0.4, {});`, duration: 2.6 },
  }),

  T("text/tame-tsume", {
    uses: ["split", "drive", "eases", "rand"],
    fn: function (el, tl, at, o) {
      var w = MW.split(el, "words").words, units = w.length >= 3 ? w : MW.split(el, "chars").chars, n = units.length, e = MW.ez(o.ease), r = MW.rand(o.seed), beat = Math.min(o.beat, o.cap / Math.max(1, n - 1)), col = getComputedStyle(el).color, fs = parseFloat(getComputedStyle(el).fontSize);
      var D = [[-o.dist, 0, -20], [0, -o.dist * 0.66, 14], [o.dist, 0, 20], [0, o.dist * 0.66, -14]], REST = units.map(function () { return [(r() * 2 - 1) * 0.03 * fs, (r() * 2 - 1) * 0.07 * fs, (r() * 2 - 1) * 3]; });
      return MW.drive(tl, at, o.loop, function (t) {
        var q = Math.floor(t * o.fps) / o.fps, cut = t >= o.cutAt;
        units.forEach(function (c, i) { var b = o.start + i * beat, u = e(Math.max(0, Math.min(1, (q - (b - o.move)) / o.move))), d = D[i % 4], rs = REST[i];
          gsap.set(c, { x: d[0] * (1 - u) + rs[0] * u, y: d[1] * (1 - u) + rs[1] * u, rotation: d[2] * (1 - u) + rs[2] * u, scale: 1.25 - 0.25 * u }); c.style.opacity = !cut && q >= b - o.move ? "1" : "0"; c.style.color = q >= b && q < b + 2 / o.fps ? o.accent : col; });
      });
    },
    options: { beat: "s between beats (0.32)", cap: "s all beats fall within (1.9)", move: "s each word comes in before its beat (0.3)", ease: "(cubic-bezier(.9,0,.1,1)): held, then snapped", dist: "px it comes from (280)", fps: "frame rate the time is stepped to (12)", start: "s of the first beat (0.55)", cutAt: "s (3.25)", accent: "flash on the beat (two frames)", seed: "rest offsets", loop: "s (3.6)" },
    defaults: { beat: 0.32, cap: 1.9, move: 0.3, ease: "cubic-bezier(.9,0,.1,1)", dist: 280, fps: 12, start: 0.55, cutAt: 3.25, accent: "#ffd23d", seed: 8, loop: 3.6 },
    notes: "Words come from the left, top, right, bottom in turn, scale 1.25 → 1, to a small seeded rest offset.",
    demo: H("Em ơi, Hà Nội phố, ta còn em", `MW.textTameTsume(q(".tk-head"), tl, 0, {});`, 3.6, { size: 130, weight: 900 }, ".tk-head .mw-w { opacity: 0; }"),
  }),

  T("social/danmaku-comments", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var W = el.clientWidth, lh = el.clientHeight / o.lanes, C = o.comments.map(function (c, i) { var s = document.createElement("span"); s.textContent = c[1]; s.style.cssText = "position:absolute;left:0;white-space:nowrap;font-weight:800;font-size:" + o.size + "px;-webkit-text-stroke:0.2em #0b0d12;paint-order:stroke fill;color:" + (i === 0 ? o.accent : "#fff") + ";top:" + (c[0] * lh + (lh - o.size * 1.2) / 2) + "px;"; el.appendChild(s); return { s: s, st: c[2], w: s.offsetWidth }; });
      return MW.drive(tl, at, o.cycle * o.loops, function (t) {
        C.forEach(function (q) { var u = (((t - q.st) % o.cycle) + o.cycle) % o.cycle, on = u < o.cross; gsap.set(q.s, { x: W - (W + q.w) * Math.min(1, u / o.cross) }); q.s.style.visibility = on ? "visible" : "hidden"; });
      });
    },
    options: { comments: "[[lane, text, s], ...] in one cycle", lanes: "(6)", cross: "s every comment takes to cross (3.5), whatever its length", cycle: "s (4)", loops: "(1)", size: "px (52)", accent: "the first comment" },
    defaults: { comments: [[0, "Đẹp quá trời!", 0], [2, "Chỗ này ở đâu vậy", 0.3], [4, "8888", 0.7], [1, "Ước gì được đi", 1.1], [3, "Nhạc hay ghê", 1.5], [5, "Lần đầu xem kênh", 1.9], [0, "Bình minh luôn", 2.2], [2, "Cho xin tên bài", 2.5], [4, "Like mạnh!", 2.9], [5, "Quay bằng gì thế?", 3.3]], lanes: 6, cross: 3.5, cycle: 4, loops: 1, size: 52, accent: "#ffd23d" },
    assets: SHOT,
    demo: { css: `${FT}\n.dm { position: absolute; left: 0; right: 0; top: 40px; height: 820px; overflow: hidden; }`, html: `<div class="ft"></div><div class="dm"></div>`, run: `MW.socialDanmakuComments(q(".dm"), tl, 0, {});`, duration: 4 },
  }),

  T("text/mincho-cut-cards", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var cards = o.cards.map(function (c) { return [el.querySelector(c[0]), c[1], c[2]]; });
      return MW.drive(tl, at, o.loop, function (t) { var f = Math.floor(t * o.fps + 1e-6) % Math.round(o.loop * o.fps); cards.forEach(function (c) { if (c[0]) c[0].style.visibility = f >= c[1] && f < c[2] ? "visible" : "hidden"; }); });
    },
    options: { cards: "[[selector, from frame, to frame], ...] hard cuts", fps: "(24)", loop: "s (3)" },
    defaults: { cards: [[".mc-1", 6, 12], [".mc-2", 12, 16], [".mc-3", 16, 24], [".mc-4", 24, 62]], fps: 24, loop: 3 },
    notes: "Hard cuts, no easing; only the last card stays long enough to read. Serif 900, condensed with scaleX 0.62–0.78.",
    demo: { css: `#demo { background: #000; color: #fff; font-family: 'Playfair Display', serif; } .mc { position: absolute; inset: 0; } .mc > div { position: absolute; inset: 0; visibility: hidden; } .mc b { position: absolute; font-weight: 900; white-space: nowrap; line-height: 1; }`,
      html: `<div class="mc"><div class="mc-1"><b style="left:50%;top:50%;font-size:300px;transform:translate(-50%,-50%) scaleX(0.62)">MỘT NGÀY</b></div><div class="mc-2"><b style="right:180px;bottom:180px;font-size:140px;transform:scaleX(0.7);transform-origin:100% 100%">KHÔNG QUÊN</b></div>
<div class="mc-3"><b style="left:140px;top:120px;font-size:170px;transform:scaleX(0.72);transform-origin:0 0">MỘT NGÀY KHÔNG</b><b style="right:200px;top:120px;font-size:150px;writing-mode:vertical-rl;text-orientation:upright;transform:scaleX(0.78)">QUÊN</b></div>
<div class="mc-4"><b style="left:330px;top:330px;font-size:90px;transform:scaleX(0.72);transform-origin:0 0">MỘT</b><b style="left:50%;top:54%;font-size:176px;transform:translate(-50%,-50%) scaleX(0.66)">NGÀY KHÔNG QUÊN</b></div></div>`,
      run: `MW.textMinchoCutCards(q(".mc"), tl, 0, {});`, duration: 3 },
  }),

  T("text/subtitle-cps-timing", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var sub = el.querySelector(o.sub), meta = o.meta ? el.querySelector(o.meta) : null, t0 = o.start, plan = o.cues.map(function (c) { var n = Array.from(c.replace(/\s+/g, " ")).length, d = Math.max(o.min, n / o.rate); return { c: c, n: n, d: d }; });
      var tot = plan.reduce(function (a, p) { return a + p.d; }, 0) + o.gap * (plan.length - 1), k = tot > o.loop - o.start - 0.2 ? (o.loop - o.start - 0.2) / tot : 1; plan.forEach(function (p) { p.t = t0; t0 += p.d * k + o.gap * k; });
      return MW.drive(tl, at, o.loop, function (t) {
        var cur = null; plan.forEach(function (p) { if (t >= p.t && t < p.t + p.d * k) cur = p; }); sub.innerHTML = cur ? cur.c.replace(/\n/g, "<br>") : ""; sub.style.visibility = cur ? "visible" : "hidden";
        if (meta) meta.textContent = cur ? cur.n + " ký tự · " + (cur.d * k).toFixed(1) + " s" : "";
      });
    },
    options: { cues: "subtitle lines (a newline breaks the line; two lines at most)", rate: "characters a second (17 for Vietnamese; 4 for Japanese)", min: "s (0.5)", gap: "s between cues (0.12: three frames at 24 fps)", start: "s (0.35)", sub: "the subtitle element", meta: "an optional readout of the timing", loop: "s (4.6)" },
    defaults: { cues: ["Sáng nay cả nhà dậy thật sớm\nđể kịp chuyến tàu ra biển.", "Ai cũng háo hức."], rate: 17, min: 0.5, gap: 0.12, start: 0.35, sub: ".cs-s", meta: ".cs-m", loop: 4.6 },
    notes: "Cue length = max(0.5 s, characters ÷ rate), cut in and out; the plan is scaled to fit when longer.",
    assets: SHOT,
    demo: { css: `${FT}\n.cs { position: absolute; inset: 0; } .cs-s { position: absolute; left: 0; right: 0; bottom: 90px; text-align: center; font-size: 60px; font-weight: 700; line-height: 1.35; color: #fff; -webkit-text-stroke: 0.24em #0b0d12; paint-order: stroke fill; }
.cs-m { position: absolute; right: 60px; top: 50px; font-family: 'JetBrains Mono', monospace; font-size: 30px; color: rgba(255,255,255,0.75); background: rgba(0,0,0,0.45); padding: 10px 18px; border-radius: 10px; }`,
      html: `<div class="ft"></div><div class="cs"><div class="cs-s"></div><div class="cs-m"></div></div>`, run: `MW.textSubtitleCpsTiming(q(".cs"), tl, 0, {});`, duration: 4.6 },
  }),

  T("text/subtitle-reposition", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var sub = el.querySelector(o.sub), burn = el.querySelector(o.burned);
      return MW.drive(tl, at, o.loop, function (t) {
        var on = t >= o.start && t < o.offAt, moved = t >= o.moveAt; sub.style.visibility = on ? "visible" : "hidden"; sub.style.top = moved ? o.top + "px" : ""; sub.style.bottom = moved ? "" : o.bottom + "px"; if (burn) burn.style.visibility = t >= o.burnAt ? "visible" : "hidden";
      });
    },
    options: { sub: "", burned: "text that is part of the picture", start: "s (0.3)", burnAt: "s it appears (1.4)", moveAt: "s the subtitle cuts to the top (1.95)", offAt: "s (3.75)", top: "px from the top when moved (70)", bottom: "px from the bottom (90)", loop: "s (4.2)" },
    defaults: { sub: ".sr-s", burned: ".sr-b", start: 0.3, burnAt: 1.4, moveAt: 1.95, offAt: 3.75, top: 70, bottom: 90, loop: 4.2 },
    notes: "A cut, no transition. Japanese moves to vertical columns at the right edge; for Vietnamese films, to the top of the frame.",
    assets: SHOT,
    demo: { css: `${FT}\n.sr { position: absolute; inset: 0; } .sr-s { position: absolute; left: 0; right: 0; text-align: center; font-size: 58px; font-weight: 700; color: #fff; -webkit-text-stroke: 0.24em #0b0d12; paint-order: stroke fill; visibility: hidden; }
.sr-b { position: absolute; left: 50%; bottom: 60px; transform: translateX(-50%); padding: 20px 60px; background: #ffd23d; color: #2a1600; font-size: 74px; font-weight: 900; letter-spacing: 0.08em; border-radius: 8px; visibility: hidden; }`,
      html: `<div class="ft"></div><div class="sr"><div class="sr-b">KHAI TRƯƠNG</div><div class="sr-s">Cửa hàng mở cửa từ tám giờ sáng.</div></div>`, run: `MW.textSubtitleReposition(q(".sr"), tl, 0, {});`, duration: 4.2 },
  }),

  T("text/handwritten-subtitle", {
    uses: ["drive", "rand"],
    fn: mk(`var sub = el.querySelector(o.sub), stage = o.stage ? document.querySelector(o.stage) : null, cv = document.createElement("canvas"), W = el.clientWidth, Hh = el.clientHeight, r = MW.rand(o.seed), t0 = o.start;
cv.width = W; cv.height = Hh; cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"; el.appendChild(cv); var c = cv.getContext("2d");
var plan = o.cues.map(function (q) { var n = gr(q).length, d = Math.max(o.min, Math.min(o.max, n / o.rate)), p = { q: q, t: t0, d: d }; t0 += d + o.gap; return p; });
var cur = null, CS = [];
var show = function (p) { cur = p; if (!p) { sub.textContent = ""; CS = []; return; } CS = cells(sub, p.q); CS.forEach(function (s) { s.style.textShadow = o.shadow[0] + "px " + o.shadow[1] + "px 0 rgba(0,0,0,0.7)"; gsap.set(s, { rotation: (r() * 2 - 1) * o.tilt, scaleX: 0.86 + r() * 0.12, scaleY: 0.92 + r() * 0.16, x: (r() * 2 - 1) * o.jitter[0], y: (r() * 2 - 1) * o.jitter[1], skewX: (r() * 2 - 1) * 3.4 }); }); };
return MW.drive(tl, at, o.loop, function (t) {
  var p = null; plan.forEach(function (q) { if (t >= q.t && t < q.t + q.d) p = q; }); if (p !== cur) { r = MW.rand(o.seed + (p ? plan.indexOf(p) * 97 : 0)); show(p); }
  var f = Math.floor(t * 24), g = MW.rand(o.seed * 13 + f); if (stage) gsap.set(stage, { x: (g() * 2 - 1) * o.weave, y: (g() * 2 - 1) * o.weave });
  c.clearRect(0, 0, W, Hh); c.fillStyle = "rgba(255,255,255,0.08)"; for (var i = 0; i < 260; i++) c.fillRect(g() * W, g() * Hh, 2, 2); c.fillStyle = "rgba(0,0,0,0.12)"; for (var j = 0; j < 160; j++) c.fillRect(g() * W, g() * Hh, 2, 2);
});`),
    options: { cues: "", rate: "characters a second (17 for Vietnamese; 4 for Japanese)", min: "s (1)", max: "s (1.7)", gap: "s (0.25)", start: "s (0.35)", tilt: "± degrees per letter (4)", jitter: "[x, y] ± px ([2.8, 6.4])", shadow: "[x, y] px of the dark copy ([2.4, 3.2])", weave: "± px of gate weave each 24 fps frame (1.6)", sub: "", stage: "the picture that weaves", seed: "(6)", loop: "s (4.4)" },
    defaults: { cues: ["Anh vẫn nhớ con đường ấy.", "Mùa hoa sữa năm nào.", "Em có về không?"], rate: 17, min: 1, max: 1.7, gap: 0.25, start: 0.35, tilt: 4, jitter: [2.8, 6.4], shadow: [2.4, 3.2], weave: 1.6, sub: ".hw-s", stage: ".ft", seed: 6, loop: 4.4 },
    notes: "Each glyph is seeded once per cue (rotation, scale, offset, skew), so the line looks written by hand; cuts in and out.",
    assets: SHOT,
    demo: { css: `${FT}\n.ft { filter: brightness(0.45) saturate(0.7); } .hw { position: absolute; inset: 0; } .hw::before, .hw::after { content: ""; position: absolute; left: 0; right: 0; height: 70px; background: #000; z-index: 3; } .hw::before { top: 0; } .hw::after { bottom: 0; }
.hw-s { position: absolute; left: 0; right: 0; bottom: 130px; text-align: center; font-size: 84px; font-weight: 500; letter-spacing: 0.04em; color: #f4efe2; }`,
      html: `<div class="ft"></div><div class="hw"><div class="hw-s"></div></div>`, run: `MW.textHandwrittenSubtitle(q(".hw"), tl, 0, {});`, duration: 4.4 },
  }),
];

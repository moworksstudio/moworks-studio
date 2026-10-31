// Loops & Ambient and Reveal (batch 3.8): seamless loops, floats, marquees, a conic ring, noise wobble, line boil and a hold that keeps
// moving; and text reveals by line, word, letter and grapheme (masks, ghosts, cues, stretch, unfold, converge, scatter, tilt, smear,
// springs, a soft range sweep, random sparkle and tracking); written here (distances in em so they follow the type size).
import { T } from "../../moworks/define.mjs";
import { headline, demo } from "../../moworks/stages.mjs";
import { PRODUCT } from "../../demo-media.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const ST = `.st { position: absolute; inset: 0; display: grid; place-items: center; }`;
const CV = (name, duration) => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, {});`, duration });
const CP = `var S = MW.stage320(el), c = S.ctx, fr = function (x) { return x - Math.floor(x); }, A = "#8b7bff";`;
const mk = (body) => new Function("el", "tl", "at", "o", CP + "\n" + body);
const K = (id, d) => T(id, { uses: ["drive", "draw", "stage320"], ...d, demo: CV(id.replace(/[/-]([a-z0-9])/g, (m, ch) => ch.toUpperCase()), d.defaults.loop) });
// text helpers: split, clamps, eases, a capped stagger, the loop's closing fade, child lines in their own masks, a seeded order
const TX = `var split = function (mode) { return MW.split(el, mode)[mode]; }, pin = function (u) { return Math.max(0, Math.min(1, u)); }, fs = parseFloat(getComputedStyle(el).fontSize), ic = function (u) { return u * u * u; };
var cap = function (st, total, n) { return n > 1 ? Math.min(st, total / (n - 1)) : 0; }, fade = function (t, a, d) { return 1 - ic(pin((t - a) / d)); };
var lines = function (sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); }, mask = function (ln) { var w = document.createElement("span"); w.style.display = "inline-block"; while (ln.firstChild) w.appendChild(ln.firstChild); ln.appendChild(w); ln.style.overflow = "hidden"; ln.style.padding = "0.2em 0.1em 0.1em"; ln.style.margin = "-0.2em -0.1em -0.1em"; return w; };
var shuffle = function (n, seed) { var r = MW.rand(seed), a = []; for (var i = 0; i < n; i++) a.push(i); for (var i = n - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } var rank = []; a.forEach(function (q, k) { rank[q] = k; }); return rank; };`;
const mt = (body) => new Function("el", "tl", "at", "o", TX + "\n" + body);
const TU = ["drive", "split", "eases", "rand"];
const H = (text, run, duration = 3, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);
const OUT = "cubic-bezier(.215,.61,.355,1)";
const LINES = (cls, rows, css = "") => ({ css: `${BG}\n${ST} .${cls} { font-size: 116px; font-weight: 800; line-height: 1.22; letter-spacing: -0.02em; } ${css}`, html: `<div class="st"><div class="${cls}">${rows.map((r) => `<div>${r}</div>`).join("")}</div></div>` });

export default [
  K("motion/seamless-loop", {
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) { S.clear(); var u = fr(t / o.loop + 1e-9);
  for (var i = 0; i < o.dots; i++) { var a = 2 * Math.PI * (u + i / o.dots) - Math.PI / 2, r = 6 + 4 * Math.sin(2 * 2 * Math.PI * u + i); c.fillStyle = i % 2 ? "#a99bff" : A; c.beginPath(); c.arc(160 + o.radius * Math.cos(a), 92 + o.radius * Math.sin(a), Math.max(0.5, r), 0, 2 * Math.PI); c.fill(); }
  MW.rr(c, 100, 172, 120, 4, 2); c.fillStyle = "#262c3a"; c.fill(); MW.rr(c, 100, 172, Math.max(4, 120 * u), 4, 2); c.fillStyle = A; c.fill(); MW.txt(c, (u * o.loop).toFixed(2).replace(".", ",") + " s", 228, 174.5, 6, "#8f9ab3", 700, "left"); });`),
    options: { loop: "s (2): every period divides it (2 / 1 / 0.5 s), so the last frame meets the first", dots: "(8)", radius: "px (60)" }, defaults: { loop: 2, dots: 8, radius: 60 },
  }),

  T("motion/float-shadow", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var sh = o.shadow ? document.querySelector(o.shadow) : null;
      return MW.drive(tl, at, o.duration, function (t) { var lift = o.amp * Math.sin(2 * Math.PI * t / o.period), k = lift / o.amp; gsap.set(el, { y: -lift }); if (sh) { gsap.set(sh, { scaleX: 1 - o.shrink * k }); sh.style.opacity = String(o.shadowOpacity * (1 - 0.4 * o.shrink * k)); } });
    },
    options: { amp: "px (40; 6 at UI size)", period: "s (3), sine", shrink: "how much the shadow narrows at the top (0.15)", shadow: "the shadow element (optional)", shadowOpacity: "(0.85)", duration: "s (6)" },
    defaults: { amp: 40, period: 3, shrink: 0.15, shadow: null, shadowOpacity: 0.85, duration: 6 },
    notes: "The shadow narrows as the object rises (physically it shrinks).",
    assets: [{ path: "p.svg", data: PRODUCT }],
    demo: { css: `${BG}\n${ST} .fs-w { display: grid; justify-items: center; gap: 80px; } .fs { width: 440px; height: 440px; border-radius: 64px; background: url(assets/p.svg) center / cover; } .fs-sh { width: 380px; height: 64px; border-radius: 50%; background: radial-gradient(closest-side, rgba(0,0,0,0.8), rgba(0,0,0,0)); }`,
      html: `<div class="st"><div class="fs-w"><div class="fs"></div><div class="fs-sh"></div></div></div>`, run: `MW.motionFloatShadow(q(".fs"), tl, 0, { shadow: ".fs-sh" });`, duration: 6 },
  }),

  T("motion/marquee-loop", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var row = el.firstElementChild, wrap = document.createElement("div"); wrap.style.cssText = "display:flex;width:max-content;"; el.insertBefore(wrap, row); wrap.appendChild(row); row.style.flex = "none"; el.style.overflow = "hidden";
      var W = row.getBoundingClientRect().width, need = Math.ceil(el.clientWidth / Math.max(1, W)) + 1; for (var i = 0; i < need; i++) { var cp = row.cloneNode(true); cp.setAttribute("aria-hidden", "true"); wrap.appendChild(cp); }
      return MW.drive(tl, at, o.duration, function (t) { var p = (t / o.period) % 1; gsap.set(wrap, { x: o.direction === "right" ? -W * (1 - p) : -W * p }); });
    },
    options: { period: "s per copy (3), linear", direction: "left | right", duration: "s (6)" }, defaults: { period: 3, direction: "left", duration: 6 },
    notes: "Apply to a band whose first child is one copy of the row; copies are added until the band is covered, and the row moves one copy's width per period, so it never breaks.",
    demo: { css: `${BG}\n.mq { position: absolute; left: -100px; right: -100px; top: 430px; height: 220px; background: #8b7bff; transform: rotate(-3deg); display: flex; align-items: center; } .mq-r { display: flex; align-items: center; gap: 70px; padding-right: 70px; font-size: 110px; font-weight: 900; color: #0b0d12; white-space: nowrap; } .mq-r i { font-style: normal; font-size: 80px; }`,
      html: `<div class="mq"><div class="mq-r"><span>CHUYỂN ĐỘNG</span><i>✦</i><span>NHỊP ĐIỆU</span><i>✦</i><span>CẢM XÚC</span><i>✦</i></div></div>`, run: `MW.motionMarqueeLoop(q(".mq"), tl, 0, {});`, duration: 6 },
  }),

  K("line/conic-ring-spin", {
    fn: mk(`return MW.drive(tl, at, o.loop, function (t) { S.clear(); var a0 = 2 * Math.PI * t / o.period - Math.PI / 2, r = o.radius - o.width / 2;
  c.fillStyle = "#151a24"; c.beginPath(); c.arc(160, 100, o.radius - o.width - 4, 0, 2 * Math.PI); c.fill();
  var g = c.createConicGradient(a0, 160, 100); g.addColorStop(0, A); g.addColorStop(0.3, "#ffd23d"); g.addColorStop(0.6, "rgba(139,123,255,0)"); g.addColorStop(1, A); c.strokeStyle = g; c.lineWidth = o.width; c.beginPath(); c.arc(160, 100, r, 0, 2 * Math.PI); c.stroke();
  c.fillStyle = "#e8ebf3"; c.beginPath(); c.moveTo(153, 88); c.lineTo(153, 112); c.lineTo(173, 100); c.closePath(); c.fill(); });`),
    options: { radius: "px outer (50)", width: "px (8)", period: "s a turn (2), linear", loop: "s (4)" }, defaults: { radius: 50, width: 8, period: 2, loop: 4 },
    notes: "A conic gradient accent → yellow (30 %) → transparent (60 %) → accent whose start angle turns.",
  }),

  T("motion/noise-wobble", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var it = o.items ? Array.prototype.slice.call(el.querySelectorAll(o.items)) : [el], P = it.map(function (_, i) { var r = MW.rand(o.seed + 17 * i), f = []; for (var j = 0; j < 9; j++) f.push(r() * 2 * Math.PI); return f; });
      var nz = function (ph, t, k) { var u = 2 * Math.PI * t / o.loop; return 0.6 * Math.sin(u + ph[k]) + 0.3 * Math.sin(2 * u + ph[k + 1]) + 0.1 * Math.sin(3 * u + ph[k + 2]); };
      return MW.drive(tl, at, o.duration, function (t) { it.forEach(function (x, i) { var ph = P[i]; gsap.set(x, { x: o.amp * nz(ph, t, 0), y: o.amp * nz(ph, t, 3), rotation: o.rotate * nz(ph, t, 6) }); }); });
    },
    options: { items: "children to wobble (null: the element itself)", amp: "± px (14; 2 at UI size)", rotate: "± degrees (6)", loop: "s the wobble repeats (4)", seed: "(3)", duration: "s (8)" },
    defaults: { items: null, amp: 14, rotate: 6, loop: 4, seed: 3, duration: 8 },
    notes: "Smooth noise made of three sines with whole cycles per loop, a different seed per element, so it loops seamlessly.",
    demo: { css: `${BG}\n${ST} .nw { display: flex; gap: 90px; } .nw i { width: 260px; height: 260px; border-radius: 60px; display: grid; place-items: center; font-style: normal; font-size: 72px; font-weight: 900; color: #0b0d12; box-shadow: 0 16px 40px rgba(0,0,0,0.4); }`,
      html: `<div class="st"><div class="nw"><i style="background:#ffd23d">Mới</i><i style="background:#a99bff">Hay</i><i style="background:#75e4d2">Vui</i></div></div>`, run: `MW.motionNoiseWobble(q(".nw"), tl, 0, { items: "i" });`, duration: 8 },
  }),

  T("hand/line-boil", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      window.__mwBoil = (window.__mwBoil || 0) + 1; var id = "mw-boil-" + window.__mwBoil, ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"); svg.setAttribute("width", "0"); svg.setAttribute("height", "0"); svg.style.position = "absolute";
      svg.innerHTML = '<filter id="' + id + '" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="' + o.frequency + '" numOctaves="2" seed="1"/><feDisplacementMap in="SourceGraphic" scale="' + 2 * o.amp + '" xChannelSelector="R" yChannelSelector="G"/></filter>';
      var tb = svg.querySelector("feTurbulence"), dm = svg.querySelector("feDisplacementMap"); dm.setAttribute("in2", "n"); tb.setAttribute("result", "n"); el.parentNode.insertBefore(svg, el); el.style.filter = "url(#" + id + ")";
      return MW.drive(tl, at, o.duration, function (t) { tb.setAttribute("seed", String(1 + o.seed * 7 + Math.floor(t * o.fps + 1e-6) % o.variants)); });
    },
    options: { fps: "drawings a second (12)", amp: "± px (6; 1.5 at UI size)", variants: "drawings it cycles through (3)", frequency: "of the noise (0.02)", seed: "(1)", duration: "s (4)" },
    defaults: { fps: 12, amp: 6, variants: 3, frequency: 0.02, seed: 1, duration: 4 },
    notes: "An SVG displacement filter whose noise seed changes 12 times a second, cycling a few variants, so any drawing or text boils like hand animation.",
    demo: { css: `${BG}\n${ST} .lb { width: 620px; height: 620px; }`, html: `<div class="st"><svg class="lb" viewBox="0 0 200 200"><g fill="none" stroke="#e8ebf3" stroke-width="4" stroke-linecap="round"><circle cx="100" cy="100" r="78"/><path d="M62 118 Q100 150 138 118"/><path d="M70 74 L70 88 M130 74 L130 88"/></g><circle cx="100" cy="100" r="78" fill="#8b7bff" opacity="0.18"/></svg></div>`,
      run: `MW.handLineBoil(q(".lb"), tl, 0, {});`, duration: 4 },
  }),

  T("motion/hold-cycle", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var eo = gsap.parseEase("expo.out"), ei = gsap.parseEase("expo.in"), ex = o.enter + o.hold;
      return MW.drive(tl, at, ex + o.exit, function (t) { var x = t < o.enter ? -o.distance * (1 - eo(t / o.enter)) : t < ex ? 0 : o.distance * ei(Math.min(1, (t - ex) / o.exit)), h = t >= o.enter && t < ex ? Math.max(0, Math.min(1, (t - o.enter) / 0.2, (ex - t) / 0.2)) : 0, d = t - o.enter;
        gsap.set(el, { x: x, rotation: h * o.rock * Math.sin(2 * Math.PI * d / o.rockPeriod), scale: 1 + h * o.pulse * Math.sin(2 * Math.PI * d / o.pulsePeriod) }); el.style.opacity = String(Math.min(1, t / 0.15) * (1 - Math.max(0, Math.min(1, (t - ex - o.exit + 0.2) / 0.2)))); });
    },
    options: { enter: "s (0.6, expo.out)", hold: "s (1.8)", exit: "s (0.6, expo.in)", distance: "px (700)", rock: "± degrees while held (3.4)", rockPeriod: "s (0.785)", pulse: "± scale while held (0.03)", pulsePeriod: "s (1)" },
    defaults: { enter: 0.6, hold: 1.8, exit: 0.6, distance: 700, rock: 3.4, rockPeriod: 0.785, pulse: 0.03, pulsePeriod: 1 },
    notes: "Action → hold → action: the hold keeps a small rock and pulse so the frame never goes dead.",
    demo: { css: `${BG}\n${ST} .hc { width: 420px; height: 420px; position: relative; display: grid; place-items: center; } .hc svg { position: absolute; inset: 0; } .hc b { position: relative; font-size: 84px; font-weight: 900; color: #0b0d12; }`,
      html: `<div class="st"><div class="hc"><svg viewBox="-50 -50 100 100"><path d="${Array.from({ length: 24 }, (_, i) => { const a = Math.PI * i / 12 - Math.PI / 2, r = i % 2 ? 40 : 49; return `${i ? "L" : "M"}${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`; }).join(" ")}Z" fill="#ffd23d"/></svg><b>MỚI</b></div></div>`,
      run: `MW.motionHoldCycle(q(".hc"), tl, 0, {});`, duration: 3.2 },
  }),

  T("text/line-by-line-reveal", {
    uses: TU,
    fn: mt(`var L = lines(o.lines).map(mask), e = MW.ez(o.ease);
return MW.drive(tl, at, o.loop, function (t) { L.forEach(function (w, i) { var p = e(pin((t - o.start - i * o.stagger) / o.duration)), q = ic(pin((t - o.outAt - i * 0.06) / 0.25)); gsap.set(w, { y: o.y * fs * (1 - p) - o.exitY * fs * q }); w.style.opacity = o.fadeIn ? String(p) : ""; }); });`),
    options: { lines: "the line elements (each gets its own mask)", start: "s (0.3)", stagger: "s (0.24)", duration: "s per line (0.55)", y: "em (1.08)", exitY: "em they leave upward (1.3, 0.25 s ease-in cubic)", outAt: "s (2.2)", fadeIn: "also fade in (the DOM version)", ease: "(ease-out cubic)", loop: "s (2.8)" },
    defaults: { lines: ":scope > *", start: 0.3, stagger: 0.24, duration: 0.55, y: 1.08, exitY: 1.3, outAt: 2.2, fadeIn: false, ease: OUT, loop: 2.8 },
    demo: { ...LINES("lbl", ["Một ý tưởng", "thành chuyển động", "trong ba giây"], ".lbl > div:nth-child(2) { color: #a99bff; }"), run: `MW.textLineByLineReveal(q(".lbl"), tl, 0, {});`, duration: 2.8 },
  }),

  T("text/word-ghost-slide", {
    uses: TU,
    fn: mt(`var w = split("words"), e = MW.ez(o.ease);
return MW.drive(tl, at, o.loop, function (t) { var f = 1 - pin((t - o.outAt) / 0.3); w.forEach(function (x, i) { var d = o.distances[Math.min(i, o.distances.length - 1)], p = e(pin((t - o.start - i * o.stagger) / o.duration)); gsap.set(x, { x: d * fs * (1 - p) }); x.style.opacity = String(p * f); }); });`),
    options: { distances: "em each word slides in from the right ([13.8, 4.6, 2.3, 0.96, 0.46]; the last repeats)", start: "s (0.3)", stagger: "s (0.15)", duration: "s (0.33, expo.out)", ease: "", outAt: "s (2.5)", loop: "s (3)" },
    defaults: { distances: [13.8, 4.6, 2.3, 0.96, 0.46], start: 0.3, stagger: 0.15, duration: 0.33, ease: "cubic-bezier(.16,1,.3,1)", outAt: 2.5, loop: 3 },
    demo: H("Làm chuyển động có chủ đích", `MW.textWordGhostSlide(q(".tk-head"), tl, 0, {});`, 3, { size: 120 }, ".tk-head .mw-w:first-child { color: #a99bff; }"),
  }),

  T("text/verb-cue-lines", {
    uses: TU,
    fn: mt(`var L = lines(o.lines), e = gsap.parseEase(o.ease);
return MW.drive(tl, at, o.loop, function (t) { var f = 1 - pin((t - o.outAt) / 0.3); L.forEach(function (ln, i) { var p = e(pin((t - o.cues[Math.min(i, o.cues.length - 1)]) / o.duration)); gsap.set(ln, { y: o.y * fs * (1 - p) }); ln.style.opacity = String(p * f); }); });`),
    options: { lines: "", cues: "s each line's verb is spoken ([0.3, 0.75, 1.2, 1.65])", y: "em (1.17)", duration: "s (0.3, power3.out)", ease: "", outAt: "s (3)", loop: "s (3.4)" },
    defaults: { lines: ":scope > *", cues: [0.3, 0.75, 1.2, 1.65], y: 1.17, duration: 0.3, ease: "power3.out", outAt: 3, loop: 3.4 },
    notes: "Take the cue times from the voice-over's word timestamps, one line per verb.",
    demo: { ...LINES("vc", ["Mở máy quay,", "dựng khung hình,", "thêm âm thanh,", "xuất bản ngay."], ".vc { text-align: left; font-size: 96px; } .vc > div:last-child { color: #a99bff; }"), run: `MW.textVerbCueLines(q(".vc"), tl, 0, {});`, duration: 3.4 },
  }),

  T("text/fade-up-chars", {
    uses: TU,
    fn: mt(`var ch = split("chars"), st = cap(o.stagger, o.cap, ch.length), e = MW.ez(o.ease);
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3); ch.forEach(function (c, i) { var p = e(pin((t - o.start - i * st) / o.duration)); gsap.set(c, { y: o.y * fs * (1 - p) }); c.style.opacity = String(p * f); }); });`),
    options: { y: "em (0.8)", duration: "s (0.9)", stagger: "s (0.05)", cap: "s all starts fit in (1)", start: "s (0.3)", outAt: "s (2.8)", ease: "(ease-out cubic)", loop: "s (3.2)" },
    defaults: { y: 0.8, duration: 0.9, stagger: 0.05, cap: 1, start: 0.3, outAt: 2.8, ease: OUT, loop: 3.2 },
    demo: H("Nổi lên từng chữ", `MW.textFadeUpChars(q(".tk-head"), tl, 0, {});`, 3.2, { size: 170 }),
  }),

  T("text/fade-up-words", {
    uses: TU,
    fn: mt(`var w = split("words"), st = cap(o.stagger, o.cap, w.length), e = MW.ez(o.ease);
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3); w.forEach(function (x, i) { var p = e(pin((t - o.start - i * st) / o.duration)); gsap.set(x, { y: o.y * fs * (1 - p) }); x.style.opacity = String(p * f); }); });`),
    options: { y: "em (0.45)", duration: "s (0.5)", stagger: "s (0.12)", cap: "s (0.9)", start: "s (0.3)", outAt: "s (2.6)", ease: "(ease-out cubic)", loop: "s (3)" },
    defaults: { y: 0.45, duration: 0.5, stagger: 0.12, cap: 0.9, start: 0.3, outAt: 2.6, ease: OUT, loop: 3 },
    demo: H("Từng từ nhẹ nhàng hiện ra", `MW.textFadeUpWords(q(".tk-head"), tl, 0, {});`, 3, { size: 130 }),
  }),

  T("text/slide-down-chars", {
    uses: TU,
    fn: mt(`var ch = split("chars"), n = ch.length, st = n > 1 ? o.spread / (n - 1) : 0, e = MW.ez(o.ease);
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3); ch.forEach(function (c, i) { var u = pin((t - o.start - i * st) / o.duration), p = e(u); gsap.set(c, { y: -o.drop * fs * (1 - p) }); c.style.opacity = String(pin(1.6 * u) * f); }); });`),
    options: { drop: "em (1.2)", duration: "s per letter (0.55)", spread: "s the starts spread over (0.45: the build takes 1 s)", start: "s (0.3)", outAt: "s (2.6)", ease: "(ease-out cubic)", loop: "s (3)" },
    defaults: { drop: 1.2, duration: 0.55, spread: 0.45, start: 0.3, outAt: 2.6, ease: OUT, loop: 3 },
    demo: H("Rơi vào đúng chỗ", `MW.textSlideDownChars(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/alternating-line-reveal", {
    uses: TU,
    fn: mt(`var L = lines(o.lines).map(mask), e = MW.ez(o.ease), eo = MW.ez("cubic-bezier(.215,.61,.355,1)"), C = [], r = MW.rand(o.seed);
L.forEach(function (w) { MW.split(w, "chars").chars.forEach(function (c) { C.push([c, (r() * 2 - 1) * o.jitter]); }); });
var rank = shuffle(C.length, o.seed + 1), all = o.start + (L.length - 1) * o.stagger + o.duration, cs = C.length > 1 ? o.settle / (C.length - 1) : 0;
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3); L.forEach(function (w, j) { var p = e(pin((t - o.start - j * o.stagger) / o.duration)); gsap.set(w, { yPercent: (j % 2 ? -100 : 100) * (1 - p) }); w.style.opacity = String(f); });
  C.forEach(function (q, k) { var p = eo(pin((t - all - rank[k] * cs) / 0.3)); gsap.set(q[0], { y: q[1] * fs * (1 - p) }); }); });`),
    options: { lines: "", start: "s (0.3)", stagger: "s between lines (0.125)", duration: "s (0.65)", ease: "(ease-in-out cubic)", jitter: "± em the letters start off (0.22)", settle: "s the letters settle over, in a seeded order (0.35)", seed: "(4)", outAt: "s (3.15)", loop: "s (3.6)" },
    defaults: { lines: ":scope > *", start: 0.3, stagger: 0.125, duration: 0.65, ease: "cubic-bezier(.65,0,.35,1)", jitter: 0.22, settle: 0.35, seed: 4, outAt: 3.15, loop: 3.6 },
    notes: "Odd lines rise from below, even lines drop from above, each in its own mask; then the jittered letters settle (0.3 s ease-out cubic).",
    demo: { ...LINES("al", ["Dòng đầu đi lên", "dòng hai đi xuống", "rồi chốt lại"], ".al > div:nth-child(3) { color: #a99bff; }"), run: `MW.textAlternatingLineReveal(q(".al"), tl, 0, {});`, duration: 3.6 },
  }),

  T("text/stretch-rise", {
    uses: TU,
    fn: mt(`var ch = split("chars"), st = cap(o.stagger, o.cap, ch.length), e = gsap.parseEase(o.ease);
MW.split(el, "chars").words.forEach(function (w) { w.style.clipPath = "inset(-1.5em -0.3em 0 -0.3em)"; }); ch.forEach(function (c) { gsap.set(c, { transformOrigin: "50% 0%" }); });
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3); ch.forEach(function (c, i) { var u = pin((t - o.start - i * st) / o.duration), p = e(u); gsap.set(c, { yPercent: o.y * (1 - p), scaleY: o.sy + (1 - o.sy) * p, scaleX: o.sx + (1 - o.sx) * p }); c.style.opacity = String(pin(1.6 * u) * f); }); });`),
    options: { y: "% of the letter it rises (120)", sy: "scaleY at the start (2.3)", sx: "scaleX at the start (0.7)", duration: "s (0.9, back.inOut(2))", stagger: "s (0.05)", cap: "s (0.7)", ease: "", start: "s (0.3)", outAt: "s (2.65)", loop: "s (3)" },
    defaults: { y: 120, sy: 2.3, sx: 0.7, duration: 0.9, stagger: 0.05, cap: 0.7, ease: "back.inOut(2)", start: 0.3, outAt: 2.65, loop: 3 },
    notes: "Pivot at the top; letters are hidden below a floor at the word's bottom edge, and the overshoot reads as a brief squash.",
    demo: H("Bật lên nào!", `MW.textStretchRise(q(".tk-head"), tl, 0, {});`, 3, { size: 190 }),
  }),

  T("text/scale-y-unfold", {
    uses: TU,
    fn: mt(`var ch = split("chars"), st = cap(o.stagger, o.cap, ch.length), e = gsap.parseEase(o.ease), B = [];
ch.forEach(function (c) { gsap.set(c, { transformOrigin: "50% 0%" }); var w = c.parentNode; if (getComputedStyle(w).position === "static") w.style.position = "relative"; var b = document.createElement("i"); b.style.cssText = "position:absolute;height:0.05em;border-radius:0.025em;pointer-events:none;background:" + o.accent + ";"; w.appendChild(b); B.push(b); });
return MW.drive(tl, at, o.loop, function (t) { ch.forEach(function (c, i) { var p = e(pin((t - o.start - i * st) / o.duration)), q = ic(pin((t - o.outAt - i * st * 0.6) / 0.35)), s = Math.max(0, p * (1 - q)); gsap.set(c, { scaleY: s });
  var b = B[i]; b.style.left = c.offsetLeft + "px"; b.style.width = c.offsetWidth + "px"; b.style.top = c.offsetTop + fs * 0.14 + "px"; b.style.opacity = String(Math.max(0, 1 - 3 * Math.min(1, s))); }); });`),
    options: { duration: "s (0.6, back.out(1.7))", stagger: "s (0.07)", cap: "s (0.6)", ease: "", accent: "the bar that marks a folded letter", start: "s (0.3)", outAt: "s they fold back (2.3, 0.35 s ease-in cubic)", loop: "s (3)" },
    defaults: { duration: 0.6, stagger: 0.07, cap: 0.6, ease: "back.out(1.7)", accent: "#8b7bff", start: 0.3, outAt: 2.3, loop: 3 },
    demo: H("Mở ra như rèm", `MW.textScaleYUnfold(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/converge-from-spread", {
    uses: TU,
    fn: mt(`var ch = split("chars"), n = ch.length, mid = (n - 1) / 2, mx = Math.max(1, Math.ceil(mid)), st = Math.min(o.stagger, o.cap / mx), e = gsap.parseEase(o.ease); el.style.clipPath = "inset(-0.5em 0 -0.5em 0)";
return MW.drive(tl, at, o.loop, function (t) { ch.forEach(function (c, i) { var a = Math.abs(i - mid), p = e(pin((t - o.start - a * st) / o.duration)), q = e(pin((t - o.outAt - (mx - a) * o.outStagger) / o.outDuration)), s = p * (1 - q); gsap.set(c, { x: o.spread * fs * (i - mid) * (1 - s) }); c.style.opacity = String(o.dim + (1 - o.dim) * s); }); });`),
    options: { spread: "em per step from the centre (1.5)", duration: "s (1, power1.inOut)", stagger: "s from the centre out (0.08)", cap: "s (0.6)", ease: "", dim: "opacity when spread (0.35)", start: "s (0.3)", outAt: "s (2.6)", outDuration: "s (0.65)", outStagger: "s, edges first (0.04)", loop: "s (3.5)" },
    defaults: { spread: 1.5, duration: 1, stagger: 0.08, cap: 0.6, ease: "power1.inOut", dim: 0.35, start: 0.3, outAt: 2.6, outDuration: 0.65, outStagger: 0.04, loop: 3.5 },
    demo: H("Dồn về giữa", `MW.textConvergeFromSpread(q(".tk-head"), tl, 0, {});`, 3.5, { size: 170 }),
  }),

  T("text/center-out-reveal", {
    uses: TU,
    fn: mt(`var ch = split("chars"), n = ch.length, mid = (n - 1) / 2, st = Math.min(o.stagger, o.cap / Math.max(1, mid)), e = MW.ez(o.ease);
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3); ch.forEach(function (c, i) { var p = e(pin((t - o.start - Math.abs(i - mid) * st) / o.duration)); gsap.set(c, { scale: o.from + (1 - o.from) * p }); c.style.opacity = String(p * f); }); });`),
    options: { from: "scale (0.86)", duration: "s (0.45)", stagger: "s per step from the centre (0.06)", cap: "s the outermost starts by (0.5)", ease: "(ease-out cubic)", start: "s (0.3)", outAt: "s (2.65)", loop: "s (3)" },
    defaults: { from: 0.86, duration: 0.45, stagger: 0.06, cap: 0.5, ease: OUT, start: 0.3, outAt: 2.65, loop: 3 },
    demo: H("Lan từ giữa ra", `MW.textCenterOutReveal(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/scatter-assemble", {
    uses: TU,
    fn: mt(`var ch = split("chars"), n = ch.length, r = MW.rand(o.seed), V = ch.map(function () { return [(r() * 2 - 1) * o.spread[0], (r() * 2 - 1) * o.spread[1]]; }), rank = shuffle(n, o.seed + 3), rank2 = shuffle(n, o.seed + 5), st = cap(o.stagger, o.cap, n), e = gsap.parseEase(o.ease);
return MW.drive(tl, at, o.loop, function (t) { ch.forEach(function (c, i) { var p = e(pin((t - o.start - rank[i] * st) / o.duration)), q = e(pin((t - o.outAt - rank2[i] * 0.03) / 0.55)), s = p * (1 - q); gsap.set(c, { x: V[i][0] * fs * (1 - s), y: V[i][1] * fs * (1 - s) }); c.style.opacity = String(o.dim + (1 - o.dim) * s); }); });`),
    options: { spread: "± em [x, y] of the start ([2.6, 1.6])", duration: "s (1, power1.inOut)", stagger: "s in a seeded order (0.07)", cap: "s (0.7)", ease: "", dim: "opacity when scattered (0.3)", seed: "(9)", start: "s (0.3)", outAt: "s they scatter back (2.55, 0.55 s, 30 ms apart)", loop: "s (3.4)" },
    defaults: { spread: [2.6, 1.6], duration: 1, stagger: 0.07, cap: 0.7, ease: "power1.inOut", dim: 0.3, seed: 9, start: 0.3, outAt: 2.55, loop: 3.4 },
    demo: H("Bay về đúng chỗ", `MW.textScatterAssemble(q(".tk-head"), tl, 0, {});`, 3.4, { size: 170 }),
  }),

  T("text/random-tilt-scale-in", {
    uses: TU,
    fn: mt(`var ch = split("chars"), r = MW.rand(o.seed), R = ch.map(function () { return (r() * 2 - 1) * o.tilt; }), st = cap(o.stagger, o.cap, ch.length), e = gsap.parseEase(o.ease);
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3); ch.forEach(function (c, i) { var u = pin((t - o.start - i * st) / o.duration), p = e(u); gsap.set(c, { scale: o.from + (1 - o.from) * p, rotation: R[i] * (1 - p) }); c.style.opacity = String(pin(2.5 * u) * f); }); });`),
    options: { tilt: "± degrees, seeded (20)", from: "scale (0.6)", duration: "s (0.9, power4.out)", stagger: "s (0.08)", cap: "s (0.7)", ease: "", seed: "(6)", start: "s (0.3)", outAt: "s (2.65)", loop: "s (3)" },
    defaults: { tilt: 20, from: 0.6, duration: 0.9, stagger: 0.08, cap: 0.7, ease: "power4.out", seed: 6, start: 0.3, outAt: 2.65, loop: 3 },
    demo: H("Đứng thẳng dậy", `MW.textRandomTiltScaleIn(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/smear-stretch-in", {
    uses: TU,
    fn: mt(`var ch = split("chars"), n = ch.length, st = cap(o.stagger, o.cap, n), e = gsap.parseEase(o.ease), base = getComputedStyle(el).color; ch.forEach(function (c) { gsap.set(c, { transformOrigin: "100% 50%" }); });
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3); ch.forEach(function (c, i) { var u = pin((t - o.start - (n - 1 - i) * st) / o.duration), p = e(u); gsap.set(c, { xPercent: o.x * (1 - p), rotation: o.rotate * (1 - p), scaleX: o.scaleX + (1 - o.scaleX) * p }); c.style.opacity = String(pin(u / 0.15) * f);
  c.style.color = p < 1 ? "color-mix(in srgb, " + o.accent + " " + Math.round(70 * (1 - p)) + "%, " + base + ")" : ""; }); });`),
    options: { x: "% of the letter's width it starts left (−250)", rotate: "degrees (45)", scaleX: "at the start (6)", duration: "s (0.8, power2.out)", stagger: "s from the last letter back (0.08)", cap: "s (0.7)", ease: "", accent: "the smear's tint", start: "s (0.3)", outAt: "s (2.65)", loop: "s (3)" },
    defaults: { x: -250, rotate: 45, scaleX: 6, duration: 0.8, stagger: 0.08, cap: 0.7, ease: "power2.out", accent: "#8b7bff", start: 0.3, outAt: 2.65, loop: 3 },
    notes: "Pivot at the right edge; the accent tint (70 % → 0) stands in for a ghost copy at the same transform.",
    demo: H("Kéo vệt bay vào", `MW.textSmearStretchIn(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/scale-pop-in", {
    uses: [...TU, "spring"],
    fn: mt(`var ch = split("chars"), st = cap(o.stagger, o.cap, ch.length), s = MW.spring(o.stiffness, o.damping, o.mass); ch.forEach(function (c) { gsap.set(c, { transformOrigin: o.origin }); });
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3); ch.forEach(function (c, i) { var d = t - o.start - i * st; gsap.set(c, { scale: d <= 0 ? 0 : Math.max(0, s.at(d)) }); c.style.opacity = String((d > 0 ? 1 : 0) * f); }); });`),
    options: { stiffness: "(300)", damping: "(18)", mass: "(1): ζ ≈ 0.52, peak ≈ 1.15 at 0.21 s", stagger: "s (0.05)", cap: "s (0.6)", origin: "(50% 60%)", start: "s (0.3)", outAt: "s (2.65)", loop: "s (3)" },
    defaults: { stiffness: 300, damping: 18, mass: 1, stagger: 0.05, cap: 0.6, origin: "50% 60%", start: 0.3, outAt: 2.65, loop: 3 },
    demo: H("Bung ra lò xo", `MW.textScalePopIn(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/range-soft-wave", {
    uses: TU,
    fn: mt(`var ch = split("chars"), x0 = Infinity, x1 = -Infinity, U = []; ch.forEach(function (c) { var r = c.getBoundingClientRect(); U.push(r.left + r.width / 2); x0 = Math.min(x0, r.left); x1 = Math.max(x1, r.right); }); U = U.map(function (x) { return (x - x0) / Math.max(1, x1 - x0); });
var sm = function (x) { x = pin(x); return x * x * (3 - 2 * x); };
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3), h = pin((t - o.start) / o.sweep) * (1 + o.width); ch.forEach(function (c, i) { var v = sm((h - U[i]) / o.width); gsap.set(c, { y: (1 - v) * o.y * fs }); c.style.opacity = String(v * f); }); });`),
    options: { sweep: "s the ramp crosses the line (1.8), linear", width: "of the line the soft ramp covers (0.3)", y: "em (0.35)", start: "s (0.3)", outAt: "s (2.85)", loop: "s (3.2)" },
    defaults: { sweep: 1.8, width: 0.3, y: 0.35, start: 0.3, outAt: 2.85, loop: 3.2 },
    notes: "Like After Effects' Range Selector with a Ramp Up shape: each letter's amount is a smoothstep of its place in the moving ramp.",
    demo: H("Làn sóng mềm quét qua", `MW.textRangeSoftWave(q(".tk-head"), tl, 0, {});`, 3.2, { size: 140 }),
  }),

  T("text/random-order-fade", {
    uses: TU,
    fn: mt(`var ch = split("chars"), n = ch.length, rank = shuffle(n, o.seed), st = cap(o.stagger, o.cap, n), e = gsap.parseEase("power1.out"), SP = [];
if (o.sparkle) ch.forEach(function (c) { var w = c.parentNode; if (getComputedStyle(w).position === "static") w.style.position = "relative"; var s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "-10 -10 20 20"); s.style.cssText = "position:absolute;width:0.34em;height:0.34em;margin:-0.17em 0 0 -0.17em;pointer-events:none;overflow:visible;opacity:0;";
  s.innerHTML = '<path d="M0 -10 Q1.5 -1.5 10 0 Q1.5 1.5 0 10 Q-1.5 1.5 -10 0 Q-1.5 -1.5 0 -10Z" fill="' + o.accent + '"/>'; w.appendChild(s); SP.push(s); });
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3); ch.forEach(function (c, i) { var d = t - o.start - rank[i] * st; c.style.opacity = String(e(pin(d / o.duration)) * f);
  var s = SP[i]; if (s) { var u = pin(d / 0.5), k = u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; s.style.left = c.offsetLeft + c.offsetWidth * 0.95 + "px"; s.style.top = c.offsetTop + c.offsetHeight * 0.22 + "px"; s.style.opacity = String(k * f); gsap.set(s, { scale: k, rotation: 90 * u }); } }); });`),
    options: { duration: "s per letter (0.3, ease-out quad)", stagger: "s in a seeded order (0.12)", cap: "s (0.8)", seed: "(11)", sparkle: "a small four-point sparkle at each letter's top right", accent: "", start: "s (0.3)", outAt: "s (2.65)", loop: "s (3)" },
    defaults: { duration: 0.3, stagger: 0.12, cap: 0.8, seed: 11, sparkle: true, accent: "#ffd23d", start: 0.3, outAt: 2.65, loop: 3 },
    demo: H("Lấp lánh như sao", `MW.textRandomOrderFade(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/tracking-in-expand", {
    uses: TU,
    fn: mt(`var ch = split("chars"), mid = (ch.length - 1) / 2, e = MW.ez(o.ease);
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3), u = pin((t - o.start) / o.duration), p = e(u); ch.forEach(function (c, i) { gsap.set(c, { x: (i - mid) * o.from * fs * (1 - p) }); c.style.opacity = String(pin(u / 0.7) * f); }); });`),
    options: { from: "em of tracking at the start (−0.5: letters piled at the centre)", duration: "s (0.7)", ease: "(ease-out cubic)", start: "s (0.3)", outAt: "s (2.65)", loop: "s (3)" },
    defaults: { from: -0.5, duration: 0.7, ease: OUT, start: 0.3, outAt: 2.65, loop: 3 },
    notes: "Layout-free: each letter moves by (i − centre) × tracking instead of changing letter-spacing, so nothing reflows.",
    demo: H("Giãn ra đúng nhịp", `MW.textTrackingInExpand(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/grapheme-pop", {
    uses: [...TU, "spring"],
    fn: mt(`var ch = split("chars"), st = cap(o.stagger, o.cap, ch.length), s = MW.spring(o.stiffness, o.damping, o.mass); ch.forEach(function (c) { gsap.set(c, { transformOrigin: o.origin }); });
return MW.drive(tl, at, o.loop, function (t) { var f = fade(t, o.outAt, 0.3); ch.forEach(function (c, i) { var d = t - o.start - i * st; gsap.set(c, { scale: d <= 0 ? 0 : Math.max(0, s.at(d)) }); c.style.opacity = String(f); }); });`),
    options: { stiffness: "(400)", damping: "(20)", mass: "(1): ζ 0.5, peak ≈ 1.16 at 0.18 s", stagger: "s (0.06)", cap: "s (0.7)", origin: "(50% 60%)", start: "s (0.3)", outAt: "s (2.65)", loop: "s (3)" },
    defaults: { stiffness: 400, damping: 20, mass: 1, stagger: 0.06, cap: 0.7, origin: "50% 60%", start: 0.3, outAt: 2.65, loop: 3 },
    notes: "Split by grapheme (Intl.Segmenter), so emoji with joiners, flags and Vietnamese stacked marks stay one unit.",
    demo: H("Chúc mừng 🎉 cả nhà 👨‍👩‍👧", `MW.textGraphemePop(q(".tk-head"), tl, 0, {});`, 3, { size: 120 }),
  }),
];

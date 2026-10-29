// TakayuStudio, Colour & Light and Path & Shape (batch 3.6): fills clipped to the letters (gradients, aurora, conic, bands), per-letter
// colour, neon, glow and shadow effects, and text laid on circles, waves, spirals and shapes by arc length (graphemes kept whole);
// written here from the site's ideas and numbers (no code of the site).
import { T } from "../../takayu/define.mjs";
import { headline, demo } from "../../takayu/stages.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const ST = `.st { position: absolute; inset: 0; display: grid; place-items: center; }`;
const H = (text, run, duration = 3, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);
const CLIP = `-webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent;`;
// graphemes, glyph spans and an arc-length rail for text on paths
const PT = `var seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;
var gr = function (s) { s = String(s).normalize("NFC"); if (!seg) return Array.from(s); var out = [], it = seg.segment(s)[Symbol.iterator](), r; while (!(r = it.next()).done) out.push(r.value.segment); return out; };
var rail = function (pts, closed) { var L = [0]; for (var i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); var tot = L[L.length - 1];
  return { len: tot, at: function (s) { s = closed ? ((s % tot) + tot) % tot : Math.max(0, Math.min(tot, s)); var lo = 0, hi = L.length - 1; while (hi - lo > 1) { var m = (lo + hi) >> 1; if (L[m] <= s) lo = m; else hi = m; } var f = (s - L[lo]) / ((L[hi] - L[lo]) || 1), a = pts[lo], b = pts[hi]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } }; };
var ang = function (R, s, ch) { var a = R.at(s - ch), b = R.at(s + ch); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
var glyphs = function (host, list, fs, sepColor) { return list.map(function (g) { var s = document.createElement("span"); s.textContent = g; s.style.cssText = "position:absolute;left:0;top:0;white-space:pre;line-height:1;font-size:" + fs + "px;" + (g === "•" && sepColor ? "color:" + sepColor + ";" : ""); host.appendChild(s); return { s: s, w: s.offsetWidth, h: s.offsetHeight }; }); };
var place = function (q, x, y, a, op) { gsap.set(q.s, { x: x - q.w / 2, y: y - q.h * 0.8, rotation: a * 180 / Math.PI, transformOrigin: "50% 80%" }); q.s.style.opacity = op == null ? "1" : String(op); };`;
const mk = (body) => new Function("el", "tl", "at", "o", PT + "\n" + body);

export default [
  T("text/shine-sweep", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var e = MW.ez(o.ease); el.style.backgroundImage = "linear-gradient(" + o.angle + "deg, " + o.dim + " 0%, " + o.dim + " 38%, " + o.accent + " 44%, #ffffff 50%, " + o.accent + " 56%, " + o.dim + " 62%, " + o.dim + " 100%)"; el.style.backgroundSize = "300% 100%";
      return MW.drive(tl, at, o.cycle * o.loops, function (t) { var u = e(Math.max(0, Math.min(1, ((t % o.cycle) - o.start) / o.duration))); el.style.backgroundPosition = (100 - 100 * u).toFixed(2) + "% 0"; });
    },
    options: { angle: "degrees (120)", duration: "s per sweep (2)", start: "s into each cycle (0.4)", cycle: "s (3.6; 2–8 s)", loops: "(1)", ease: "(cubic-bezier(.6,.6,0,1))", dim: "the letters at rest", accent: "flanks of the band" },
    defaults: { angle: 120, duration: 2, start: 0.4, cycle: 3.6, loops: 1, ease: "cubic-bezier(.6,.6,0,1)", dim: "#6f7890", accent: "#b9adff" },
    notes: "The band is 30 % of the text's width, a background clipped to the letters.",
    demo: H("Hạng Kim Cương", `MW.textShineSweep(q(".tk-head"), tl, 0, {});`, 3.6, { size: 170, weight: 900 }, `.tk-head { ${CLIP} }`),
  }),

  T("text/gradient-flow", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var W = el.getBoundingClientRect().width; el.style.backgroundImage = "linear-gradient(" + o.angle + "deg, " + o.colors.concat([o.colors[0]]).join(", ") + ")"; el.style.backgroundSize = 3 * W + "px 100%"; el.style.backgroundRepeat = "repeat-x";
      return MW.drive(tl, at, o.period * o.loops, function (t) { el.style.backgroundPosition = (-3 * W * ((t / o.period) % 1)).toFixed(1) + "px 0"; });
    },
    options: { colors: "three colours (the first repeats at the end)", angle: "degrees (90)", period: "s per colour cycle (4), linear and seamless", loops: "(1)" },
    defaults: { colors: ["#ff6fb5", "#8b7bff", "#3dd6f5"], angle: 90, period: 4, loops: 1 },
    demo: H("Màu chảy trong chữ", `MW.textGradientFlow(q(".tk-head"), tl, 0, {});`, 4, { size: 170, weight: 900 }, `.tk-head { ${CLIP} }`),
  }),

  T("text/takayu-aurora-text", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var r = el.getBoundingClientRect(), W = r.width, Hh = r.height, R = Math.max(46 * 5, 0.42 * W);
      return MW.drive(tl, at, o.cycle * o.loops, function (t) {
        var w = 2 * Math.PI * t / o.cycle, rot = o.rotate * Math.sin(2 * w) * Math.PI / 180, sc = 1 - 0.1 * Math.cos(2 * w), layers = [];
        o.colors.forEach(function (c, i) { var ph = i * Math.PI / 2, x = 0.42 * W * Math.sin(w + ph), y = 0.6 * Hh * Math.sin(2 * w + ph * 1.3), xr = (x * Math.cos(rot) - y * Math.sin(rot)) * sc + W / 2, yr = (x * Math.sin(rot) + y * Math.cos(rot)) * sc + Hh / 2;
          layers.push("radial-gradient(circle " + (R * sc).toFixed(0) + "px at " + xr.toFixed(0) + "px " + yr.toFixed(0) + "px, " + c + " 0%, " + c + "00 70%)"); });
        layers.push("linear-gradient(" + o.base + ", " + o.base + ")"); el.style.backgroundImage = layers.join(", ");
      });
    },
    options: { colors: "four aurora colours (6-digit hex)", base: "tint under them", cycle: "s per drift (6)", rotate: "± degrees (5), 2 per cycle", loops: "(1)" },
    defaults: { colors: ["#8b7bff", "#3dd6f5", "#3ddc84", "#ffd23d"], base: "#5a4fb0", cycle: 6, rotate: 5, loops: 1 },
    notes: "Four soft blobs on Lissajous paths (1× and 2× the cycle), the layer turning ±5° and breathing 0.9 ↔ 1.1; the letters stay still.",
    demo: H("Cực quang phương Bắc", `MW.textTakayuAuroraText(q(".tk-head"), tl, 0, {});`, 6, { size: 160, weight: 900 }, `.tk-head { ${CLIP} }`),
  }),

  T("text/conic-spin", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var cs = o.colors.concat([o.colors[0]]).map(function (c, i, a) { return c + " " + (100 * i / (a.length - 1)).toFixed(1) + "%"; }).join(", ");
      return MW.drive(tl, at, o.duration * o.loops, function (t) { el.style.backgroundImage = "conic-gradient(from " + (360 * t / o.duration).toFixed(2) + "deg at 50% 50%, " + cs + ")"; });
    },
    options: { colors: "three colours (the first repeats at the end)", duration: "s per turn (4), linear", loops: "(1)" }, defaults: { colors: ["#ff6fb5", "#ffd23d", "#3dd6f5"], duration: 4, loops: 1 },
    demo: H("XOAY MÀU", `MW.textConicSpin(q(".tk-head"), tl, 0, {});`, 4, { size: 220, weight: 900 }, `.tk-head { ${CLIP} }`),
  }),

  T("text/color-band-sweep", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var e = MW.ez(o.ease), W = el.getBoundingClientRect().width, hw = Math.max(o.minBand, o.band * W) / W * 100;
      return MW.drive(tl, at, o.loop, function (t) {
        var p = -20 + 140 * e(Math.max(0, Math.min(1, (t - o.start) / o.duration))), f = Math.max(0, Math.min(1, (t - o.resetAt) / 0.4)); if (f > 0.5) p = -20;
        el.style.backgroundImage = "linear-gradient(90deg, " + o.final + " 0%, " + o.final + " " + (p - hw).toFixed(2) + "%, " + o.tint + " " + p.toFixed(2) + "%, " + o.grey + " " + (p + hw).toFixed(2) + "%, " + o.grey + " 100%)"; el.style.opacity = String(1 - Math.sin(Math.PI * f));
      });
    },
    options: { duration: "s (1.5)", start: "s (0.3)", ease: "(cubic-bezier(.65,0,.35,1))", band: "half width as a share of the text (0.15)", minBand: "px (64)", final: "colour left behind", tint: "the band", grey: "start colour", resetAt: "s (3.0)", loop: "s (3.6)" },
    defaults: { duration: 1.5, start: 0.3, ease: "cubic-bezier(.65,0,.35,1)", band: 0.15, minBand: 64, final: "#a99bff", tint: "#fff3c4", grey: "#6c778b", resetAt: 3, loop: 3.6 },
    demo: H("Nhuộm màu từng phần", `MW.textColorBandSweep(q(".tk-head"), tl, 0, {});`, 3.6, { size: 160, weight: 900 }, `.tk-head { ${CLIP} }`),
  }),

  T("text/hue-cycle", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars;
      return MW.drive(tl, at, o.loop, function (t) { ch.forEach(function (c, i) { c.style.color = "hsl(" + ((o.base + o.step * i + o.speed * t) % 360).toFixed(1) + "," + o.sat + "%," + o.light + "%)"; }); });
    },
    options: { base: "start hue (0)", step: "degrees per letter (20)", speed: "degrees a second (90: a turn per 4 s)", sat: "% (85)", light: "% (67)", loop: "s (4)" }, defaults: { base: 0, step: 20, speed: 90, sat: 85, light: 67, loop: 4 },
    demo: H("Cầu vồng", `MW.textHueCycle(q(".tk-head"), tl, 0, {});`, 4, { size: 240, weight: 900 }),
  }),

  T("text/palette-color-pop", {
    uses: ["split", "drive", "rand"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, r = MW.rand(o.seed), P = o.palette, st = Math.min(o.stagger, o.cap / Math.max(1, n - 1)), io = gsap.parseEase("power2.inOut");
      var C = ch.map(function () { var a = Math.floor(r() * P.length), b = (a + 1 + Math.floor(r() * (P.length - 1))) % P.length; return [P[a], P[b]]; });
      return MW.drive(tl, at, o.loop, function (t) {
        ch.forEach(function (c, i) { var k = 0, pulse = 0; o.switches.forEach(function (s, j) { var u = (t - s - i * st) / o.duration; if (u >= 1) k = j + 1; else if (u > 0) { k = j + io(u); pulse = Math.sin(Math.PI * u); } });
          var from = C[i][Math.floor(k) % 2], to = C[i][(Math.floor(k) + 1) % 2]; c.style.color = gsap.utils.interpolate(from, to, k - Math.floor(k));
          gsap.set(c, { y: -o.lift * pulse, scale: 1 + 0.03 * pulse }); c.style.opacity = String(1 - 0.2 * pulse); c.style.filter = pulse > 0.01 ? "blur(" + (5 * pulse).toFixed(2) + "px)" : ""; });
      });
    },
    options: { palette: "five colours", switches: "s each change starts ([0.4, 1.9]; every 5 s in the source)", duration: "s per change (0.5, ease-in-out)", stagger: "s per letter (0.05)", cap: "s (0.9)", lift: "px at the peak (16)", seed: "start colours", loop: "s (3.2)" },
    defaults: { palette: ["#ff6fb5", "#ffd23d", "#3ddc84", "#3dd6f5", "#a693ff"], switches: [0.4, 1.9], duration: 0.5, stagger: 0.05, cap: 0.9, lift: 16, seed: 6, loop: 3.2 },
    demo: H("Rực rỡ sắc màu", `MW.textPaletteColorPop(q(".tk-head"), tl, 0, {});`, 3.2, { size: 180, weight: 900 }),
  }),

  T("text/neon-flicker", {
    uses: ["split", "drive", "rand"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, r = MW.rand(o.seed), wall = o.wall ? document.querySelector(o.wall) : null, off = gsap.utils.interpolate(o.accent, o.bg)(0.82), mix = gsap.utils.interpolate(off, o.core);
      var PAT = [[[0, 1], [0.16, 0.15], [0.24, 1], [0.52, 0.35], [0.6, 1]], [[0, 0.6], [0.1, 0], [0.22, 1], [0.38, 0.2], [0.5, 1]], [[0, 1], [0.08, 0.3], [0.3, 0.9], [0.44, 0.1], [0.66, 1]]], pat = ch.map(function () { return PAT[Math.floor(r() * 3)]; });
      return MW.drive(tl, at, o.loop, function (t) {
        var sum = 0, on = t < o.offAt ? 1 : 1 - Math.min(1, (t - o.offAt) / 0.25);
        ch.forEach(function (c, i) { var u = t - o.start - i * o.stagger, L = 0; if (u >= 0) { L = 1; pat[i].forEach(function (k) { if (u >= k[0]) L = k[1]; }); } L *= on; sum += L;
          c.style.color = mix(L); c.style.webkitTextStroke = L < 0.5 ? "1.2px rgba(139,123,255,0.6)" : "0"; var a = L.toFixed(3); c.style.textShadow = L > 0.02 ? "0 0 12px rgba(255,93,200," + a + "), 0 0 33px rgba(255,93,200," + a + "), 0 0 57px rgba(255,93,200," + (0.8 * L).toFixed(3) + "), 0 0 120px rgba(255,93,200," + (0.5 * L).toFixed(3) + ")" : "none"; });
        if (wall) wall.style.opacity = String(o.wallGlow * sum / ch.length);
      });
    },
    options: { stagger: "s between letters (0.08)", start: "s (0.35)", accent: "neon colour", core: "lit core colour", bg: "wall colour", offAt: "s (3.0)", wall: "a glow layer on the wall", wallGlow: "(0.22) × the average level", seed: "which flicker pattern each letter takes", loop: "s (3.6)" },
    defaults: { stagger: 0.08, start: 0.35, accent: "#ff5dc8", core: "#fff4fb", bg: "#14101c", offAt: 3, wall: ".nf-w", wallGlow: 0.22, seed: 4, loop: 3.6 },
    notes: "Under three flashes a second; each letter settles lit after about 0.6 s.",
    demo: { css: `#demo { background: #14101c; font-family: Inter, sans-serif; } ${ST} .nf-w { position: absolute; inset: 0; background: radial-gradient(50% 40% at 50% 50%, rgba(255,93,200,1), rgba(255,93,200,0)); opacity: 0; } .nf { font-size: 230px; font-weight: 800; letter-spacing: 0.04em; }`,
      html: `<div class="nf-w"></div><div class="st"><div class="nf">MỞ CỬA</div></div>`, run: `MW.textNeonFlicker(q(".nf"), tl, 0, {});`, duration: 3.6 },
  }),

  T("text/glow-pulse", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var p2 = gsap.parseEase("power2.out"), fs = parseFloat(getComputedStyle(el).fontSize), core = gsap.utils.interpolate(o.color, "#ffffff"), per = 1 / o.rate;
      return MW.drive(tl, at, o.loop, function (t) {
        var x = (t % per) / per, v = x < 0.15 ? p2(x / 0.15) : Math.pow(1 - (x - 0.15) / 0.85, 2.5), b = o.blur[0] + (o.blur[1] - o.blur[0]) * v, a = 0.55 + 0.45 * v;
        el.style.color = core(0.35 * v); el.style.textShadow = "0 0 " + b.toFixed(1) + "px rgba(169,155,255," + a.toFixed(3) + "), 0 0 " + (2 * b).toFixed(1) + "px rgba(139,123,255," + (0.6 * a).toFixed(3) + ")";
        el.style.webkitTextStroke = (o.outline * fs * v).toFixed(2) + "px rgba(255,255,255,0.5)";
      });
    },
    options: { rate: "beats a second (1.5)", blur: "[rest, peak] px of glow ([12, 48])", outline: "share of the font size at the peak (0.08)", color: "", loop: "s (2: three beats)" },
    defaults: { rate: 1.5, blur: [12, 48], outline: 0.08, color: "#c9c0ff", loop: 2 },
    notes: "Each beat: a 15 % attack (ease-out quad), then a fall as (1 − x)^2.5, fast at first with a slow tail.",
    demo: H("NHỊP ĐẬP", `MW.textGlowPulse(q(".tk-head"), tl, 0, {});`, 2, { size: 230, weight: 900 }, ".tk-head { color: #c9c0ff; paint-order: stroke fill; }"),
  }),

  T("text/stripe-shadow", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, fs = parseFloat(getComputedStyle(el).fontSize), pitch = o.pitch * fs, g = el.cloneNode(true), br = el.getBoundingClientRect();
      if (getComputedStyle(host).position === "static") host.style.position = "relative"; if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.zIndex = "1";
      g.removeAttribute("id"); g.style.cssText += ";position:absolute;margin:0;pointer-events:none;box-sizing:border-box;left:" + (el.offsetLeft + o.offset * fs) + "px;top:" + (el.offsetTop + o.offset * fs) + "px;width:" + (br.width + 0.5) + "px;-webkit-text-stroke:0;-webkit-text-fill-color:transparent;color:transparent;-webkit-background-clip:text;background-clip:text;";
      g.style.backgroundImage = "repeating-linear-gradient(45deg, " + o.color + " 0, " + o.color + " " + (pitch * o.line).toFixed(2) + "px, transparent " + (pitch * o.line).toFixed(2) + "px, transparent " + pitch.toFixed(2) + "px)"; host.insertBefore(g, el);
      var px = pitch * Math.SQRT2;
      return MW.drive(tl, at, o.loop, function (t) { g.style.backgroundPosition = (px * o.pitches * (t / o.loop)).toFixed(2) + "px 0"; });
    },
    options: { offset: "em the shadow sits down-right (0.09)", pitch: "em between stripes (0.14)", line: "share of the pitch that is stripe (0.42)", pitches: "pitches the stripes travel per loop (3)", color: "", loop: "s (3)" },
    defaults: { offset: 0.09, pitch: 0.14, line: 0.42, pitches: 3, color: "#8b7bff", loop: 3 },
    demo: H("Bóng sọc chéo", `MW.textStripeShadow(q(".tk-head"), tl, 0, {});`, 3, { size: 190, weight: 900 }, ".tk-head { -webkit-text-stroke: 6px #0b0d12; paint-order: stroke fill; }"),
  }),

  T("text/long-shadow", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var p2 = gsap.parseEase("power2.out"), mix = gsap.utils.interpolate(o.color, o.bg);
      return MW.drive(tl, at, o.retractAt + 0.4, function (t) {
        var L = o.length * (p2(Math.max(0, Math.min(1, t / o.duration))) - Math.pow(Math.max(0, Math.min(1, (t - o.retractAt) / 0.4)), 3)), sh = [];
        for (var k = o.step; k <= L; k += o.step) sh.push(k.toFixed(1) + "px " + k.toFixed(1) + "px 0 " + mix(0.3 + 0.55 * k / o.length)); el.style.textShadow = sh.length ? sh.join(", ") : "none";
      });
    },
    options: { length: "px (144)", step: "px between copies (3)", duration: "s it grows (0.8, power2.out)", retractAt: "s after the start (2.2, 0.4 s ease-in cubic)", color: "shadow colour", bg: "the background it fades into" },
    defaults: { length: 144, step: 3, duration: 0.8, retractAt: 2.2, color: "#8b7bff", bg: "#12141f" },
    notes: "A colour fade with distance (30 % → 85 % toward the background), not opacity.",
    demo: H("BÓNG DÀI", `MW.textLongShadow(q(".tk-head"), tl, 0.3, {});`, 3.2, { size: 240, weight: 900 }),
  }),

  T("text/blend-overlap", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, io = gsap.parseEase("power2.inOut"); ch.forEach(function (c, i) { c.style.color = o.colors[i % o.colors.length]; c.style.mixBlendMode = o.blend; });
      return MW.drive(tl, at, o.backAt + o.duration, function (t) { var p = io(Math.max(0, Math.min(1, t / o.duration))) - io(Math.max(0, Math.min(1, (t - o.backAt) / o.duration))); el.style.letterSpacing = (o.tracking * p).toFixed(4) + "em"; gsap.set(el, { scale: 1 + (o.scale - 1) * p }); });
    },
    options: { tracking: "em (−0.3)", scale: "(1.12)", duration: "s each way (0.9, power2.inOut)", backAt: "s after the start (2.2)", blend: "screen on dark, multiply on light", colors: "" },
    defaults: { tracking: -0.3, scale: 1.12, duration: 0.9, backAt: 2.2, blend: "screen", colors: ["#7d64ff", "#22bdd6", "#f2c84b"] },
    demo: H("HOÀ SẮC", `MW.textBlendOverlap(q(".tk-head"), tl, 0.4, {});`, 3.6, { size: 260, weight: 900 }, ".tk-head { letter-spacing: 0; }"),
  }),

  T("text/circle-spin", {
    uses: ["drive", "eases"],
    fn: mk(`var unit = gr(o.text + " • "), R = o.radius, probe = glyphs(el, unit, o.size, o.sep), uw = probe.reduce(function (a, q) { return a + q.w; }, 0); probe.forEach(function (q) { q.s.remove(); });
var m = Math.max(1, Math.round(2 * Math.PI * R / uw)), fs = o.size * 2 * Math.PI * R / (m * uw), list = []; for (var i = 0; i < m; i++) list = list.concat(unit);
var G = glyphs(el, list, fs, o.sep), e = MW.ez(o.ease), s0 = 0; if (getComputedStyle(el).position === "static") el.style.position = "relative";
var cx = el.clientWidth / 2, cy = el.clientHeight / 2; G.forEach(function (q) { q.a = (s0 + q.w / 2) / R; s0 += q.w; });
var spd = function (t) { return 1 + (o.boost - 1) * (e(Math.max(0, Math.min(1, (t - o.boostAt[0]) / (o.boostAt[1] - o.boostAt[0])))) - e(Math.max(0, Math.min(1, (t - o.boostAt[2]) / (o.boostAt[3] - o.boostAt[2]))))); };
return MW.drive(tl, at, o.loop, function (t) {
  var A = 0, dt = 1 / 240; for (var s = 0; s < t; s += dt) A += spd(s) * dt; A *= 2 * Math.PI / o.turn;
  G.forEach(function (q) { var a = q.a + A; gsap.set(q.s, { x: cx + R * Math.sin(a) - q.w / 2, y: cy - R * Math.cos(a) - q.h * 0.8, rotation: a * 180 / Math.PI, transformOrigin: "50% 80%" }); });
});`),
    options: { text: "", radius: "px (232)", size: "px at most (96), fitted so the ring closes", turn: "s per turn (10), linear", boost: "speed-up factor (4)", boostAt: "[in from, in to, out from, out to] s ([1.5, 1.9, 3.1, 3.5])", ease: "(cubic-bezier(.65,0,.35,1))", sep: "separator colour", loop: "s (5)" },
    defaults: { text: "MOWORKS STUDIO", radius: 232, size: 96, turn: 10, boost: 4, boostAt: [1.5, 1.9, 3.1, 3.5], ease: "cubic-bezier(.65,0,.35,1)", sep: "#8b7bff", loop: 5 },
    notes: "Letters are placed by arc length with their tops outward; the turn is the integral of the speed.",
    demo: { css: `${BG}\n${ST} .cs { position: relative; width: 620px; height: 620px; font-weight: 800; } .cs-l { position: absolute; left: 50%; top: 50%; width: 260px; height: 260px; margin: -130px 0 0 -130px; border-radius: 50%; background: linear-gradient(150deg, #a693ff, #6a4cf0); display: grid; place-items: center; font-size: 120px; font-weight: 900; color: #fff; }`,
      html: `<div class="st"><div class="cs"><div class="cs-l">M</div></div></div>`, run: `MW.textCircleSpin(q(".cs"), tl, 0, {});`, duration: 5 },
  }),

  T("text/curved-marquee", {
    uses: ["drive"],
    fn: mk(`var W = el.clientWidth, Hh = el.clientHeight, pts = []; for (var i = 0; i <= 200; i++) { var u = i / 200, x = -o.margin + (W + 2 * o.margin) * u; pts.push([x, Hh / 2 + o.amp * Math.sin(2 * Math.PI * 0.9 * u - 0.5)]); }
var R = rail(pts, false), unit = gr(o.text + " • "), probe = glyphs(el, unit, o.size, o.sep), uw = probe.reduce(function (a, q) { return a + q.w; }, 0); probe.forEach(function (q) { q.s.remove(); });
var reps = Math.ceil(R.len / uw) + 2, list = []; for (var k = 0; k < reps; k++) list = list.concat(unit); var G = glyphs(el, list, o.size, o.sep), s0 = 0; G.forEach(function (q) { q.o = s0 + q.w / 2; s0 += q.w; });
var speed = Math.max(1, Math.round(o.loop * o.speed / uw)) * uw / o.loop;
return MW.drive(tl, at, o.loop, function (t) {
  var off = (speed * t) % uw; G.forEach(function (q) { var s = q.o - uw + off, p = R.at(s), a = ang(R, s, 18), fade = Math.min(1, (p[0] + 0) / o.fade, (W - p[0]) / o.fade); place(q, p[0], p[1], a, s < 0 || s > R.len ? 0 : Math.max(0, fade)); });
});`),
    options: { text: "", size: "px (110)", amp: "px of the wave (150)", margin: "px past each side (150)", speed: "px a second (540), rounded so the loop is seamless", fade: "px at each edge (200)", sep: "separator colour", loop: "s (4)" },
    defaults: { text: "Làm phim cùng Moworks", size: 110, amp: 150, margin: 150, speed: 540, fade: 200, sep: "#8b7bff", loop: 4 },
    demo: { css: `${BG}\n.cm { position: absolute; inset: 0; font-weight: 800; }`, html: `<div class="cm"></div>`, run: `MW.textCurvedMarquee(q(".cm"), tl, 0, {});`, duration: 4 },
  }),

  T("text/path-run", {
    uses: ["drive"],
    fn: mk(`var W = el.clientWidth, Hh = el.clientHeight, pts = []; for (var i = 0; i <= 200; i++) { var u = i / 200; pts.push([-o.margin + (W + 2 * o.margin) * u, Hh / 2 + o.amp * Math.sin(2 * Math.PI * u)]); }
var R = rail(pts, false), list = gr(o.text), probe = glyphs(el, list, 100, null), tw = probe.reduce(function (a, q) { return a + q.w; }, 0); probe.forEach(function (q) { q.s.remove(); });
var fs = 100 * o.fit / tw, G = glyphs(el, list, fs, null), s0 = 0; G.forEach(function (q, i) { q.o = s0 + q.w / 2; s0 += q.w; if (i === G.length - 1) q.s.style.color = o.accent; }); var TW = s0, p2 = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in");
var A = -TW / 2 - 20, M = R.len / 2, B = R.len + TW / 2 + 20;
return MW.drive(tl, at, o.loop, function (t) {
  var c = t < o.holdAt ? A + (M - A) * p2(Math.max(0, Math.min(1, (t - o.start) / o.inTime))) : M + (B - M) * pin(Math.max(0, Math.min(1, (t - o.outAt) / o.outTime)));
  G.forEach(function (q) { var s = c - TW / 2 + q.o, p = R.at(s); place(q, p[0], p[1], ang(R, s, 36), s < 0 || s > R.len ? 0 : 1); });
});`),
    options: { text: "", fit: "px of text (1000)", amp: "px of the wave (200)", margin: "px past each side (250)", start: "s (0.3)", inTime: "s (1.2, power2.out)", holdAt: "s it holds from (1.5)", outAt: "s (2.6)", outTime: "s (1.1, power2.in)", accent: "the last letter", loop: "s (4)" },
    defaults: { text: "Theo dòng sóng", fit: 1000, amp: 200, margin: 250, start: 0.3, inTime: 1.2, holdAt: 1.5, outAt: 2.6, outTime: 1.1, accent: "#ffd23d", loop: 4 },
    demo: { css: `${BG}\n.pr { position: absolute; inset: 0; font-weight: 900; }`, html: `<div class="pr"></div>`, run: `MW.textPathRun(q(".pr"), tl, 0, {});`, duration: 4 },
  }),

  T("text/tracking-inertia", {
    uses: ["drive"],
    fn: mk(`var W = el.clientWidth, Hh = el.clientHeight, cx = W / 2, pts = []; for (var i = 0; i <= 200; i++) { var x = -400 + (W + 800) * i / 200; pts.push([x, Hh * 0.42 + o.curve * (x - cx) * (x - cx)]); }
var R = rail(pts, false), list = gr(o.text), G = glyphs(el, list, o.size, null), s0 = 0; G.forEach(function (q) { q.o = s0 + q.w / 2; s0 += q.w; }); var TW = s0, n = G.length, p1 = gsap.parseEase("power1.out");
var stopS = R.len / 2 + TW / 2, startS = stopS - o.run, ease = function (u) { return 0.5 * u + 0.5 * p1(u); };
return MW.drive(tl, at, o.loop, function (t) {
  var head = startS + (stopS - startS) * ease(Math.max(0, Math.min(1, (t - o.start) / o.duration))), u = t - o.start - o.duration, gap = u > 0 ? -o.amp * o.size * Math.sin(2 * Math.PI * o.freq * u) * Math.exp(-o.decay * u) : 0, f = 1 - Math.max(0, Math.min(1, (t - o.fadeAt) / 0.4));
  G.forEach(function (q, i) { var s = head - (TW - q.o) - gap * (n - 1 - i), p = R.at(s); place(q, p[0], p[1], ang(R, s, 30), (t < o.start ? 0 : 1) * f); });
});`),
    options: { text: "", size: "px (130)", run: "px the head runs (2040)", duration: "s (0.9): half linear, half power1.out", start: "s (0.3)", amp: "em of tracking swing (0.25)", freq: "Hz (3)", decay: "per second (6)", curve: "the U path, y = curve × (x − centre)² (0.00012)", fadeAt: "s (3.4)", loop: "s (4.2)" },
    defaults: { text: "Phanh gấp!", size: 130, run: 2040, duration: 0.9, start: 0.3, amp: 0.25, freq: 3, decay: 6, curve: 0.00012, fadeAt: 3.4, loop: 4.2 },
    notes: "From the stop the gap between letters swings −amp × sin(2π freq t) × e^(−decay t), more for the letters further back.",
    demo: { css: `${BG}\n.ti { position: absolute; inset: 0; font-weight: 900; }`, html: `<div class="ti"></div>`, run: `MW.textTrackingInertia(q(".ti"), tl, 0, {});`, duration: 4.2 },
  }),

  T("text/outline-draw-fill", {
    uses: ["drive", "eases"],
    fn: mk(`var ns = "http://www.w3.org/2000/svg", txt = el.textContent, fs = parseFloat(getComputedStyle(el).fontSize), fw = getComputedStyle(el).fontWeight, svg = document.createElementNS(ns, "svg"), list = gr(txt), e = MW.ez(o.ease), p2 = gsap.parseEase("power2.out");
el.textContent = ""; el.appendChild(svg); svg.style.overflow = "visible"; var x = 0, G = [];
list.forEach(function (g) { var mkT = function () { var t = document.createElementNS(ns, "text"); t.textContent = g; t.setAttribute("x", x); t.setAttribute("y", fs * 0.9); t.setAttribute("font-size", fs); t.setAttribute("font-weight", fw); t.setAttribute("font-family", "Inter, sans-serif"); svg.appendChild(t); return t; };
  var faint = mkT(), fill = mkT(), line = mkT(); faint.setAttribute("fill", "none"); faint.setAttribute("stroke", "rgba(233,235,243,0.25)"); faint.setAttribute("stroke-width", "2"); fill.setAttribute("fill", o.ink); fill.style.opacity = "0";
  line.setAttribute("fill", "none"); line.setAttribute("stroke", o.accent); line.setAttribute("stroke-width", o.stroke); var L = fs * 7; line.style.strokeDasharray = L + " " + L; line.style.strokeDashoffset = String(L);
  var w = g === " " ? fs * 0.28 : fill.getComputedTextLength(); G.push({ faint: faint, fill: fill, line: line, L: L, sp: g === " " }); x += w; });
svg.setAttribute("width", x); svg.setAttribute("height", fs * 1.2); svg.style.display = "block"; svg.style.margin = "0 auto";
var n = G.length, st = Math.min(o.stagger, o.cap / Math.max(1, n - 1));
return MW.drive(tl, at, o.loop, function (t) {
  var out = 1 - Math.max(0, Math.min(1, (t - o.fadeAt) / 0.4)); svg.style.opacity = String(out);
  G.forEach(function (q, i) { if (q.sp) return; var s = o.start + i * st, d = e(Math.max(0, Math.min(1, (t - s) / o.draw))), f = p2(Math.max(0, Math.min(1, (t - s - o.draw + 0.1) / o.fill))); q.line.style.strokeDashoffset = String(q.L * (1 - d)); q.line.style.opacity = d > 0 ? "1" : "0"; q.fill.style.opacity = String(f); q.faint.style.opacity = String(1 - f); });
});`),
    options: { draw: "s per letter (1.3)", stagger: "s (0.1)", cap: "s all letters start within (0.7)", fill: "s (0.5, power2.out), starting 0.1 s before the stroke ends", stroke: "px (6)", ease: "(cubic-bezier(.65,0,.35,1))", start: "s (0.3)", fadeAt: "s (3.8)", accent: "stroke colour", ink: "fill colour", loop: "s (4.4)" },
    defaults: { draw: 1.3, stagger: 0.1, cap: 0.7, fill: 0.5, stroke: 6, ease: "cubic-bezier(.65,0,.35,1)", start: 0.3, fadeAt: 3.8, accent: "#a99bff", ink: "#e8ebf3", loop: 4.4 },
    demo: H("Vẽ nét chữ", `MW.textOutlineDrawFill(q(".tk-head"), tl, 0, {});`, 4.4, { size: 220, weight: 900 }),
  }),

  T("text/handwrite-mask", {
    uses: ["drive"],
    fn: mk(`var ns = "http://www.w3.org/2000/svg", txt = el.textContent, fs = parseFloat(getComputedStyle(el).fontSize), fw = getComputedStyle(el).fontWeight, svg = document.createElementNS(ns, "svg"), list = gr(txt), si = gsap.parseEase("sine.inOut");
el.textContent = ""; el.appendChild(svg); svg.style.overflow = "visible"; svg.style.display = "block"; svg.style.margin = "0 auto"; window.__mwHW = (window.__mwHW || 0) + 1; var id = "mw-hw-" + window.__mwHW, x = 0, G = [], base = fs * 0.92;
var defs = document.createElementNS(ns, "defs"), mask = document.createElementNS(ns, "mask"); mask.setAttribute("id", id); mask.setAttribute("maskUnits", "userSpaceOnUse"); defs.appendChild(mask); svg.appendChild(defs);
var mute = document.createElementNS(ns, "g"), ink = document.createElementNS(ns, "g"); ink.setAttribute("mask", "url(#" + id + ")"); svg.appendChild(mute); svg.appendChild(ink);
var mkT = function (g, parent, col) { var t = document.createElementNS(ns, "text"); t.textContent = g; t.setAttribute("x", x); t.setAttribute("y", base); t.setAttribute("font-size", fs); t.setAttribute("font-weight", fw); t.setAttribute("font-family", "Inter, sans-serif"); t.setAttribute("fill", col); parent.appendChild(t); return t; };
list.forEach(function (g) { var m = mkT(g, mute, o.mute), f = mkT(g, ink, o.ink), w = g === " " ? fs * 0.28 : f.getComputedTextLength(); if (g !== " ") { var step = o.step * fs, pts = [], top = base - fs * 0.95, bot = base + fs * 0.2, k = 0; for (var xx = x - step * 0.3; xx <= x + w + step * 0.3; xx += step) { pts.push((xx + (k % 2 ? 1 : -1) * o.slant * fs).toFixed(1) + "," + (k % 2 ? bot : top).toFixed(1)); k++; }
    var pl = document.createElementNS(ns, "polyline"); pl.setAttribute("points", pts.join(" ")); pl.setAttribute("fill", "none"); pl.setAttribute("stroke", "#fff"); pl.setAttribute("stroke-width", (1.7 * step + 1).toFixed(1)); pl.setAttribute("stroke-linecap", "round"); pl.setAttribute("stroke-linejoin", "round"); mask.appendChild(pl); var L = pl.getTotalLength(); pl.style.strokeDasharray = L + " " + L; pl.style.strokeDashoffset = String(L); G.push({ pl: pl, L: L, w: w }); }
  x += w; });
svg.setAttribute("width", x); svg.setAttribute("height", fs * 1.25); var bl = document.createElementNS(ns, "line"); bl.setAttribute("x1", 0); bl.setAttribute("x2", x); bl.setAttribute("y1", base + fs * 0.08); bl.setAttribute("y2", base + fs * 0.08); bl.setAttribute("stroke", "rgba(233,235,243,0.18)"); bl.setAttribute("stroke-width", 3); svg.insertBefore(bl, mute);
var pen = document.createElementNS(ns, "g"); pen.innerHTML = '<line x1="0" y1="0" x2="' + fs * 0.25 + '" y2="' + -fs * 0.35 + '" stroke="#c9d2ea" stroke-width="5" stroke-linecap="round"/><circle r="' + fs * 0.05 + '" fill="' + o.accent + '"/>'; svg.appendChild(pen);
var tw = G.reduce(function (a, q) { return a + q.w; }, 0), t0 = o.start; G.forEach(function (q) { q.t = t0; q.d = o.total * q.w / tw; t0 += q.d; });
return MW.drive(tl, at, o.loop, function (t) {
  var out = 1 - Math.max(0, Math.min(1, (t - o.fadeAt) / 0.4)), head = null; svg.style.opacity = String(out);
  G.forEach(function (q) { var u = si(Math.max(0, Math.min(1, (t - q.t) / q.d))); q.pl.style.strokeDashoffset = String(q.L * (1 - u)); if (u > 0 && u < 1) head = q.pl.getPointAtLength(q.L * u); });
  if (head) { pen.setAttribute("transform", "translate(" + head.x + " " + head.y + ")"); pen.style.opacity = "1"; } else pen.style.opacity = "0";
});`),
    options: { total: "s of writing, split by letter width (2.2)", step: "em between zig-zag strokes (0.17)", slant: "em (0.07)", start: "s (0.3)", fadeAt: "s (3.6)", ink: "", mute: "the faint copy under it", accent: "pen tip", loop: "s (4.2)" },
    defaults: { total: 2.2, step: 0.17, slant: 0.07, start: 0.3, fadeAt: 3.6, ink: "#e8ebf3", mute: "rgba(233,235,243,0.12)", accent: "#ffd23d", loop: 4.2 },
    notes: "Each letter is revealed by a thick zig-zag stroke drawn as a mask (sine.inOut), with a pen riding its head.",
    demo: H("Viết tay từng chữ", `MW.textHandwriteMask(q(".tk-head"), tl, 0, {});`, 4.2, { size: 170, weight: 700 }),
  }),

  T("text/spiral-flow", {
    uses: ["drive"],
    fn: mk(`var cx = el.clientWidth / 2, cy = el.clientHeight / 2, F = 100, unit = gr(o.text + " • "), probe = glyphs(el, unit, F, o.sep), uem = probe.map(function (q) { return q.w / F; }); probe.forEach(function (q) { q.s.remove(); });
var ua = uem.reduce(function (a, b) { return a + b; }, 0) * o.size, TH = 2 * Math.PI * o.turns, reps = Math.ceil(TH / ua) + 2, list = [], A = []; for (var k = 0; k < reps; k++) { list = list.concat(unit); A = A.concat(uem); }
var G = glyphs(el, list, F, o.sep), a0 = 0; G.forEach(function (q, i) { q.o = a0 + A[i] * o.size / 2; a0 += A[i] * o.size; });
var speed = Math.max(1, Math.round(o.flow / ua)) * ua / o.loop;
return MW.drive(tl, at, o.loop, function (t) {
  var off = (speed * t) % ua; G.forEach(function (q) { var th = TH - (q.o - ua + off), r = o.radius * th / TH; if (th <= 0 || th > TH) { q.s.style.opacity = "0"; return; }
    var a = th, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a), sc = o.size * r / F, fade = Math.min(1, (TH - th) / 1.4, (r - o.inner[0]) / (o.inner[1] - o.inner[0]));
    gsap.set(q.s, { x: x - q.w / 2, y: y - q.h * 0.8, rotation: a * 180 / Math.PI - 90, scale: sc, transformOrigin: "50% 80%" }); q.s.style.opacity = String(Math.max(0, fade)); });
});`),
    options: { text: "", turns: "(3.2)", radius: "px at the outer end (360)", size: "letter size as a share of the radius (0.24)", flow: "radians of spiral per loop (1.8), rounded to whole units", inner: "[gone, full] px near the centre ([30, 140])", sep: "", loop: "s (5)" },
    defaults: { text: "Moworks Studio", turns: 3.2, radius: 360, size: 0.24, flow: 1.8, inner: [30, 140], sep: "#8b7bff", loop: 5 },
    notes: "An Archimedean spiral; since the size grows with the radius, each letter takes a constant angle.",
    demo: { css: `${BG}\n${ST} .sf { position: relative; width: 860px; height: 860px; font-weight: 800; }`, html: `<div class="st"><div class="sf"></div></div>`, run: `MW.textSpiralFlow(q(".sf"), tl, 0, {});`, duration: 5 },
  }),

  T("text/path-morph-ride", {
    uses: ["drive", "eases"],
    fn: mk(`var W = el.clientWidth, Hh = el.clientHeight, cx = W / 2, cy = Hh * 0.55, N = 120, e = MW.ez(o.ease), Lr = o.rail;
var line = [], wave = [], arch = []; for (var i = 0; i <= N; i++) { var u = i / N, x = cx - Lr / 2 + Lr * u; line.push([x, cy]); wave.push([x, cy - o.amp * Math.sin(2 * Math.PI * u)]); var a = Math.PI + o.arc + (Math.PI - 2 * o.arc) * u; arch.push([cx + o.radius * Math.cos(a), cy + o.radius * Math.sin(a) + o.radius * Math.sin(o.arc)]); }
var list = gr(o.text), probe = glyphs(el, list, 100, null), tw = probe.reduce(function (a, q) { return a + q.w; }, 0); probe.forEach(function (q) { q.s.remove(); }); var G = glyphs(el, list, 100 * o.fit / tw, null), s0 = 0; G.forEach(function (q) { q.o = s0 + q.w / 2; s0 += q.w; }); var TW = s0;
var mix = function (A, B, f) { return A.map(function (p, i) { return [p[0] + (B[i][0] - p[0]) * f, p[1] + (B[i][1] - p[1]) * f]; }); };
return MW.drive(tl, at, o.loop, function (t) {
  var k = o.keys, P = line; if (t < k[1]) P = mix(line, wave, e(Math.max(0, Math.min(1, (t - k[0]) / (k[1] - k[0]))))); else if (t < k[2]) P = wave; else if (t < k[3]) P = mix(wave, arch, e((t - k[2]) / (k[3] - k[2]))); else if (t < k[4]) P = arch; else P = mix(arch, line, e(Math.min(1, (t - k[4]) / (k[5] - k[4]))));
  var R = rail(P, false), c = R.len / 2; G.forEach(function (q) { var s = c - TW / 2 + q.o, p = R.at(s); place(q, p[0], p[1], ang(R, s, 24), 1); });
});`),
    options: { text: "", fit: "px of text (1200)", rail: "px long (1440)", amp: "px of the wave (120)", radius: "px of the arch (744)", arc: "radians cut from each end of the arch (0.62)", keys: "s: line → wave, wave → arch, arch → line ([0.4, 1.9, 2.6, 4.1, 4.9, 6.2])", ease: "(cubic-bezier(.65,0,.35,1))", loop: "s (6.4)" },
    defaults: { text: "Đường cong đổi dáng", fit: 1200, rail: 1440, amp: 120, radius: 744, arc: 0.62, keys: [0.4, 1.9, 2.6, 4.1, 4.9, 6.2], ease: "cubic-bezier(.65,0,.35,1)", loop: 6.4 },
    notes: "The shapes share one point count, so the rail morphs point by point and the letters are laid on it again every frame.",
    demo: { css: `${BG}\n.pm { position: absolute; inset: 0; font-weight: 900; }`, html: `<div class="pm"></div>`, run: `MW.textPathMorphRide(q(".pm"), tl, 0, {});`, duration: 6.4 },
  }),

  T("text/shape-contour", {
    uses: ["drive"],
    fn: mk(`var ns = "http://www.w3.org/2000/svg", W = el.clientWidth, Hh = el.clientHeight, k = o.height / 34, pts = [], d = "";
for (var i = 0; i <= 400; i++) { var a = i / 400 * 2 * Math.PI, x = W / 2 + k * 16 * Math.pow(Math.sin(a), 3), y = Hh / 2 - k * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) - k * 2; pts.push([x, y]); d += (i ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1); }
var svg = document.createElementNS(ns, "svg"); svg.setAttribute("width", W); svg.setAttribute("height", Hh); svg.style.cssText = "position:absolute;left:0;top:0;"; svg.innerHTML = '<path d="' + d + ' Z" fill="' + o.fill + '" stroke="' + o.line + '" stroke-width="4"/>'; el.appendChild(svg);
var R = rail(pts, true), unit = gr(o.text + " • "), probe = glyphs(el, unit, o.size, o.sep), uw = probe.reduce(function (a, q) { return a + q.w; }, 0); probe.forEach(function (q) { q.s.remove(); });
var m = Math.max(1, Math.round(R.len / uw)), fs = Math.min(o.size, o.size * R.len / (m * uw)), list = []; for (var j = 0; j < m; j++) list = list.concat(unit);
var G = glyphs(el, list, fs, o.sep), s0 = 0; G.forEach(function (q) { q.o = s0 + q.w / 2; s0 += q.w; }); var per = s0 / m;
return MW.drive(tl, at, o.loop, function (t) { var off = per * (t / o.loop) * o.repeats; G.forEach(function (q) { var s = q.o + off, p = R.at(s); place(q, p[0], p[1], ang(R, s, 1.1 * fs), 1); }); });`),
    options: { text: "", height: "px of the heart (610)", size: "px at most (90), fitted so the text closes the outline", repeats: "repeats it moves per loop (1)", fill: "", line: "", sep: "", loop: "s (5)" },
    defaults: { text: "Yêu thương lan toả", height: 610, size: 90, repeats: 1, fill: "#151a24", line: "#3a4466", sep: "#ff5d8f", loop: 5 },
    notes: "Each letter's angle comes from a chord of ±1.1 em, so the cusps of the outline stay smooth.",
    demo: { css: `${BG}\n.sc { position: absolute; inset: 0; font-weight: 800; }`, html: `<div class="sc"></div>`, run: `MW.textShapeContour(q(".sc"), tl, 0, {});`, duration: 5 },
  }),
];

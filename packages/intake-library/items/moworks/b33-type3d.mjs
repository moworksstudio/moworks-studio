// 3D & Depth and Glyph Physics (batch 3.3): letters in 3D and letters with weight (springs, falls, bounces, chains), written here.
// Per-letter motions split by grapheme (Vietnamese marks stay on their letter); 3D uses CSS perspective, folding to 90° and swapping rather
// than relying on back faces. Sizes: a 320 px frame × 4-5.
import { T } from "../../moworks/define.mjs";
import { headline, demo, CURSOR } from "../../moworks/stages.mjs";

const H = (text, run, duration = 3.4, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);
const FLOOR = ".tk-stage::after { content: ''; position: absolute; left: 300px; right: 300px; top: 640px; height: 4px; border-radius: 2px; background: #2a3350; }";

export default [
  T("background/type-tunnel", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var word = el.querySelector(o.word), copies = [];
      for (var i = 0; i < o.copies; i++) { var c = word.cloneNode(true); c.style.position = "absolute"; c.style.left = "50%"; c.style.top = "50%"; c.style.whiteSpace = "nowrap"; el.appendChild(c); copies.push(c); }
      word.style.display = "none";
      return MW.drive(tl, at, o.loop, function (t) {
        copies.forEach(function (c, i) {
          var z = (((i + 2 * t / o.loop) / o.copies) % 1 + 1) % 1, sc = 0.3 * Math.pow(22, z), a = Math.min(1, 6 * z) * Math.pow(1 - z, 1.8), fill = z < 0.4;
          gsap.set(c, { xPercent: -50, yPercent: -50, scale: sc });
          c.style.color = fill ? o.color : "transparent"; c.style.webkitTextStroke = fill ? "0" : (1.6 * 4 / sc) + "px " + o.color; c.style.opacity = String(Math.min(1, fill ? a : a * 1.2)); c.style.zIndex = String(Math.round(z * 100));
        });
      });
    },
    options: { word: "the word element", copies: "(4); one enters every loop ÷ 2 s", loop: "s (4.2): each copy crosses in 2 × loop", color: "fill and outline colour" },
    defaults: { word: ".tt-w", copies: 4, loop: 4.2, color: "#a99bff" },
    demo: { css: `#demo { background: #06070c; color: #e8ebf3; font-family: Inter, sans-serif; } .tt { position: absolute; inset: 0; overflow: hidden; } .tt-w { font-size: 170px; font-weight: 900; letter-spacing: -0.02em; }`,
      html: `<div class="tt"><div class="tt-w">TƯƠNG LAI</div></div>`, run: `MW.backgroundTypeTunnel(q(".tt"), tl, 0, {});`, duration: 4.2 },
  }),

  T("text/flip-up-3d", {
    uses: ["split"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, st = Math.min(o.stagger, 1 / Math.max(1, n - 1)), fs = parseFloat(getComputedStyle(el).fontSize);
      ch.forEach(function (c, i) {
        gsap.set(c, { transformOrigin: "50% 100%", transformPerspective: o.perspective * fs });
        tl.fromTo(c, { rotationX: -90, yPercent: 25 }, { rotationX: 0, yPercent: 0, duration: o.duration, ease: "expo.out", immediateRender: true }, at + i * st);
        tl.fromTo(c, { opacity: 0 }, { opacity: 1, duration: o.duration * 0.4, ease: "none", immediateRender: true }, at + i * st);
        if (o.exit != null) tl.to(c, { opacity: 0, duration: 0.35, ease: "power2.in" }, at + o.exit);
      });
      return at + o.duration + (n - 1) * st;
    },
    options: { duration: "s per letter (0.8), expo.out", stagger: "s (0.04, ≤ 1 s in all)", perspective: "em (9)", exit: "s after the start to fade out (null: stay)" },
    defaults: { duration: 0.8, stagger: 0.04, perspective: 9, exit: null },
    demo: H("Lật dựng từng chữ", `MW.textFlipUp3d(q(".tk-head"), tl, 0.3, { exit: 2.2 });`, 3, { size: 160 }),
  }),

  T("text/swing-door", {
    uses: ["split"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, st = Math.min(o.stagger, 1.1 / Math.max(1, n - 1));
      ch.forEach(function (c, i) {
        var k = n - 1 - i; gsap.set(c, { transformOrigin: "90% 50%", transformPerspective: o.perspective });
        tl.fromTo(c, { rotationY: -90, z: o.depth, opacity: 0 }, { rotationY: 0, z: 0, opacity: 1, duration: o.duration, ease: "expo.out", immediateRender: true }, at + k * st);
        if (o.exit != null) tl.to(c, { opacity: 0, duration: 0.3, ease: "power2.in" }, at + o.exit);
      });
      return at + o.duration + (n - 1) * st;
    },
    options: { duration: "s per letter (1), expo.out", stagger: "s, from the last letter (0.06, ≤ 1.1 s)", depth: "px of z at the start (−300)", perspective: "px (2000)", exit: "s after the start to fade (null)" },
    defaults: { duration: 1, stagger: 0.06, depth: -300, perspective: 2000, exit: null },
    demo: H("Mở cửa từng chữ", `MW.textSwingDoor(q(".tk-head"), tl, 0.3, { exit: 2.4 });`, 3.2, { size: 160 }),
  }),

  T("text/depth-fly-in", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, layers = [], bk = gsap.parseEase("back.out(1.2)"), pi = gsap.parseEase("power2.in");
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      host.style.perspective = o.perspective + "px";
      [0.03, 0.06, 0.09].forEach(function (lag, j) { var c = el.cloneNode(true); c.removeAttribute("id"); c.style.position = "absolute"; c.style.left = el.offsetLeft + "px"; c.style.top = el.offsetTop + "px"; c.style.width = el.offsetWidth + "px"; c.style.margin = "0"; c.style.color = o.color; c.style.pointerEvents = "none"; host.insertBefore(c, el); layers.push({ ch: MW.split(c, "chars").chars, lag: lag, a: [0.24, 0.18, 0.12][j] }); });
      var ch = MW.split(el, "chars").chars, n = ch.length, st = Math.min(o.stagger, 0.9 / Math.max(1, n - 1));
      var Z = function (i, t) { var u = Math.max(0, Math.min(1, (t - i * st) / o.duration)); return o.depth * (1 - bk(u)); };
      return MW.drive(tl, at, (o.exit == null ? o.duration + (n - 1) * st : o.exit + 0.35), function (t) {
        var e = o.exit != null ? 1 - pi(Math.max(0, Math.min(1, (t - o.exit) / 0.35))) : 1;
        ch.forEach(function (c, i) { var z = Z(i, t); gsap.set(c, { z: z }); c.style.opacity = t >= i * st ? String((0.2 + 0.8 * (1 - Math.min(1, z / o.depth))) * e) : "0"; });
        layers.forEach(function (L) { L.ch.forEach(function (c, i) { var tt = t - L.lag, z = Z(i, tt), moving = tt >= i * st && Math.abs(z) > 2; gsap.set(c, { z: z }); c.style.opacity = moving ? String(L.a * e) : "0"; }); });
      });
    },
    options: { depth: "z at the start, px (−800)", perspective: "px (1000)", duration: "s (0.9), back.out(1.2)", stagger: "s (0.04, ≤ 0.9 s)", color: "trail colour", exit: "s after the start to fade (null)" },
    defaults: { depth: -800, perspective: 1000, duration: 0.9, stagger: 0.04, color: "#8b7bff", exit: null },
    demo: H("Lao tới từ xa", `MW.textDepthFlyIn(q(".tk-head"), tl, 0.3, { exit: 2.1 });`, 3.2, { size: 170 }),
  }),

  T("text/tumble-in-3d", {
    uses: ["split", "drive", "rand"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, st = Math.min(o.stagger, 0.8 / Math.max(1, n - 1)), r = MW.rand(o.seed), io = gsap.parseEase("power1.inOut"), pi = gsap.parseEase("power2.in");
      var P = ch.map(function () { return { z: -600 - 900 * r(), rx: -200 - 300 * r() }; });
      el.parentNode.style.perspective = o.perspective + "px";
      return MW.drive(tl, at, o.exit == null ? o.duration + (n - 1) * st : o.exit + 0.35, function (t) {
        var e = o.exit != null ? 1 - pi(Math.max(0, Math.min(1, (t - o.exit) / 0.35))) : 1;
        ch.forEach(function (c, i) { var u = Math.max(0, Math.min(1, (t - i * st) / o.duration)), p = io(u), rx = P[i].rx * (1 - p);
          gsap.set(c, { z: P[i].z * (1 - p), rotationX: rx, transformOrigin: "50% 50%" }); c.style.opacity = String(Math.min(1, u / 0.33) * e);
          c.style.filter = Math.cos(rx * Math.PI / 180) < 0 ? "brightness(0.45)" : ""; });
      });
    },
    options: { duration: "s (1.3), power1.inOut", stagger: "s (0.05, ≤ 0.8 s)", perspective: "px (2000)", seed: "depths and turns", exit: "s after the start (null)" },
    defaults: { duration: 1.3, stagger: 0.05, perspective: 2000, seed: 4, exit: null },
    demo: H("Lộn nhào bay về", `MW.textTumbleIn3d(q(".tk-head"), tl, 0.3, { exit: 2.5 });`, 3.4, { size: 160 }),
  }),

  T("text/cube-roll", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, dl = Math.min(0.03, 0.6 / Math.max(1, n - 1)), io = gsap.parseEase("power2.inOut"), fs = parseFloat(getComputedStyle(el).fontSize), faces = [];
      ch.forEach(function (c) {
        var g = c.textContent; c.textContent = ""; c.style.position = "relative"; c.style.transformStyle = "preserve-3d";
        var f = document.createElement("span"), b = document.createElement("span"); f.textContent = g; b.textContent = g; f.style.display = "inline-block"; b.style.cssText = "position:absolute;left:0;top:0;width:100%;text-align:center;font-family:" + o.font + ";font-weight:700;color:" + o.color + ";";
        c.appendChild(f); c.appendChild(b); faces.push([f, b]);
      });
      var d = 0.5 * fs * 0.62;
      return MW.drive(tl, at, o.back + 0.4 + 0.6, function (t) {
        faces.forEach(function (F, i) {
          var a = 90 * io(Math.max(0, Math.min(1, (t - o.at - dl * i) / 0.4))) * (1 - io(Math.max(0, Math.min(1, (t - o.back - dl * i) / 0.4)))), u = a / 90, pp = o.perspective * fs;
          F[0].style.transform = "perspective(" + pp + "px) translateZ(" + (-d) + "px) rotateX(" + a + "deg) translateZ(" + d + "px)"; F[0].style.opacity = String(1 - 0.7 * u);
          F[1].style.transform = "perspective(" + pp + "px) translateZ(" + (-d) + "px) rotateX(" + (a - 90) + "deg) translateZ(" + d + "px)"; F[1].style.opacity = String(u < 0.01 ? 0 : 0.3 + 0.7 * u);
        });
      });
    },
    options: { at: "s each cube turns (0.55; 0.03 s apart, ≤ 0.6 s)", back: "s they turn back (2.15)", font: "the second face's font (a serif)", color: "its colour", perspective: "em (11)" },
    defaults: { at: 0.55, back: 2.15, font: "'Playfair Display', serif", color: "#a99bff", perspective: 11 },
    demo: { ...demo(headline("Lăn đổi mặt", { size: 180 }), `MW.textCubeRoll(q(".tk-head"), tl, 0, {});
var c = q(".ui-cursor"); tl.fromTo(c, { x: 1400, y: 900 }, { x: 980, y: 560, duration: 0.4, ease: "power2.inOut", immediateRender: true }, 0.1); tl.to(c, { x: 1400, y: 900, duration: 0.4, ease: "power2.inOut" }, 1.9);`, 3.4,
      ".ui-cursor { position: absolute; left: 0; top: 0; z-index: 30; }"), html: headline("Lăn đổi mặt", { size: 180 }).html + CURSOR },
  }),

  T("text/cylinder-ring", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el, txt = o.text + o.sep, R = o.radius, spans = [], fs = o.size;
      var meas = document.createElement("span"); meas.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font-size:" + fs + "px;font-weight:800;"; host.appendChild(meas); meas.textContent = txt; var w = meas.offsetWidth; host.removeChild(meas);
      var reps = Math.max(1, Math.floor(2 * Math.PI * R / w)), seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;
      var gr = function (s) { if (!seg) return Array.from(s); var out = [], it = seg.segment(s)[Symbol.iterator](), r; while (!(r = it.next()).done) out.push(r.value.segment); return out; };
      var all = []; for (var k = 0; k < reps; k++) gr(txt.normalize("NFC")).forEach(function (g, j) { all.push({ g: g, sep: j >= gr(o.text.normalize("NFC")).length }); });
      all.forEach(function (a) { var s = document.createElement("span"); s.textContent = a.g; s.style.cssText = "position:absolute;left:0;top:0;white-space:pre;font-size:" + fs + "px;font-weight:800;" + (a.sep ? "color:" + o.accent + ";" : ""); host.appendChild(s); spans.push(s); });
      var N = all.length;
      return MW.drive(tl, at, o.period * o.turns, function (t) {
        var W = host.offsetWidth, Hh = host.offsetHeight, rot = -2 * Math.PI * t / o.period;
        spans.forEach(function (s, i) {
          var a = rot + i / N * 2 * Math.PI, x = R * Math.sin(a), z = R * Math.cos(a), y = -z * Math.sin(o.tilt), ps = o.perspective / (o.perspective - z), f = (z / R + 1) / 2;
          gsap.set(s, { x: W / 2 + x * ps, y: Hh / 2 + y * ps, xPercent: -50, yPercent: -50, scaleX: Math.cos(a) * ps, scaleY: ps }); s.style.opacity = String(0.18 + 0.82 * f); s.style.zIndex = String(Math.round(f * 100) + 10);
          if (!all[i].sep) s.style.color = z < 0 ? o.mute : "";
        });
      });
    },
    options: { text: "the phrase", sep: "separator", radius: "px (600, 31 % of the width)", size: "px (110)", tilt: "radians seen from above (0.26)", perspective: "px (2300)", period: "s per turn (6)", turns: "(1)", accent: "separator colour", mute: "colour of letters at the back" },
    defaults: { text: "Chuyển động tự nhiên", sep: "  •  ", radius: 600, size: 110, tilt: 0.26, perspective: 2300, period: 6, turns: 1, accent: "#a99bff", mute: "#4a5478" },
    demo: { css: `#demo { background: radial-gradient(100% 100% at 50% 50%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .cy { position: absolute; inset: 0; overflow: hidden; }
.cy-p { position: absolute; left: 50%; top: 50%; width: 300px; height: 520px; margin: -260px 0 0 -150px; border-radius: 80px 80px 40px 40px; background: linear-gradient(90deg, #3a2f7a, #8b7bff 45%, #3a2f7a); z-index: 50; box-shadow: 0 40px 100px rgba(0,0,0,0.5); }`,
      html: `<div class="cy"><div class="cy-p"></div></div>`, run: `MW.textCylinderRing(q(".cy"), tl, 0, {});`, duration: 6 },
  }),

  T("text/layered-extrude", {
    uses: ["drive", "eases", "draw"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, copies = [], io = MW.ez("in-out"), cur = o.cursor ? MW.el(o.cursor) : null, dt = 1 / 240;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      for (var i = o.layers; i >= 1; i--) { var c = el.cloneNode(true); c.removeAttribute("id"); c.style.position = "absolute"; c.style.margin = "0"; c.style.left = el.offsetLeft + "px"; c.style.top = el.offsetTop + "px"; c.style.width = el.offsetWidth + "px"; c.style.whiteSpace = "nowrap"; c.style.color = i % 4 === 0 ? o.accent2 : o.accent; c.style.opacity = String(0.95 - 0.65 * (i - 1) / (o.layers - 1)); c.style.pointerEvents = "none"; host.insertBefore(c, el); copies.push({ c: c, i: i }); }
      el.style.position = "relative"; el.style.whiteSpace = "nowrap";
      var P = [[0, 0, 0], [0.4, 0, 0], [1.0, 1, -1], [1.9, -1, 1], [2.7, 1, 0], [3.3, 0, 0]];
      return MW.drive(tl, at, 4, function (t) {
        var ry = 0, rx = 0, vy = 0, vx = 0; for (var s = 0; s < t; s += dt) { var p = MW.path(P, s, io); var ay = o.k * (p[0] - ry) - o.c * vy, ax = o.k * (p[1] - rx) - o.c * vx; vy += ay * dt; vx += ax * dt; ry += vy * dt; rx += vx * dt; }
        var RY = ry * o.tilt * Math.PI / 180, RX = rx * o.tilt * Math.PI / 180, sx = Math.cos(RY), sy = Math.cos(RX), u = o.unit;
        gsap.set(el, { scaleX: sx, scaleY: sy });
        copies.forEach(function (q) { gsap.set(q.c, { x: q.i * (0.55 + 3.2 * Math.sin(RY)) * u, y: q.i * (0.55 - 3.2 * Math.sin(RX)) * u, scaleX: sx, scaleY: sy }); });
        if (cur) { var pp = MW.path(P, t, io); cur.style.left = (host.offsetWidth / 2 + pp[0] * 420) + "px"; cur.style.top = (host.offsetHeight / 2 - pp[1] * 260) + "px"; }
      });
    },
    options: { layers: "copies behind (12)", tilt: "degrees at full lean (15)", k: "spring stiffness (120)", c: "damping (16)", unit: "px per reference unit (4)", accent: "the stack's colour", accent2: "every 4th copy", cursor: "the cursor the tilt follows" },
    defaults: { layers: 12, tilt: 15, k: 120, c: 16, unit: 4, accent: "#8b7bff", accent2: "#3dd6f5", cursor: null },
    demo: { css: `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .le { position: absolute; inset: 0; display: grid; place-items: center; }
.le h1 { margin: 0; font-size: 200px; font-weight: 900; letter-spacing: -0.02em; } .ui-cursor { position: absolute; z-index: 30; }`,
      html: `<div class="le"><h1>NỔI KHỐI</h1>${CURSOR}</div>`, run: `MW.textLayeredExtrude(q(".le h1"), tl, 0, { cursor: ".ui-cursor" });`, duration: 4 },
  }),

  T("text/paper-fold", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var W = el.offsetWidth, H = el.offsetHeight, ph = H / o.panels, html = el.innerHTML, bg = getComputedStyle(el).backgroundColor, p1 = gsap.parseEase("power1.out"), pio = gsap.parseEase("power1.inOut"), panels = [];
      var cs = getComputedStyle(el); el.innerHTML = ""; el.style.background = "transparent"; el.style.border = "none"; el.style.boxShadow = "none"; el.style.perspective = o.perspective * H + "px";
      var parent = el;
      for (var k = 0; k < o.panels; k++) {
        var p = document.createElement("div"); p.style.cssText = "position:absolute;left:0;top:" + (k ? ph : 0) + "px;width:" + W + "px;height:" + ph + "px;transform-origin:50% 0;transform-style:preserve-3d;";
        var face = document.createElement("div"); face.style.cssText = "position:absolute;inset:0;overflow:hidden;background:" + bg + ";border-radius:" + (k === 0 ? cs.borderRadius + " " + cs.borderRadius + " 0 0" : k === o.panels - 1 ? "0 0 " + cs.borderRadius + " " + cs.borderRadius : "0") + ";";
        var inner = document.createElement("div"); inner.innerHTML = html; inner.style.cssText = "position:absolute;left:0;top:" + (-k * ph) + "px;width:" + W + "px;height:" + H + "px;box-sizing:border-box;padding:" + cs.padding + ";display:" + cs.display + ";place-items:" + cs.placeItems + ";";
        var shade = document.createElement("div"); shade.style.cssText = "position:absolute;inset:0;background:" + o.shade + ";opacity:0;";
        face.appendChild(inner); face.appendChild(shade); p.appendChild(face); parent.appendChild(p); panels.push({ p: p, shade: shade, k: k }); parent = p;
      }
      return MW.drive(tl, at, o.refoldAt + 0.45 + 0.08 * o.panels, function (t) {
        panels.forEach(function (q) {
          var sgn = q.k % 2 ? -1 : 1, open = p1(Math.max(0, Math.min(1, (t - o.start - 0.12 * q.k) / 0.7))), ref = pio(Math.max(0, Math.min(1, (t - o.refoldAt - 0.08 * (o.panels - 1 - q.k)) / 0.45))), a = sgn * o.angle * (1 - open * (1 - ref));
          // each panel hangs from the one above: angles add up along the chain
          q.p.style.transform = "rotateX(" + a + "deg)"; q.shade.style.opacity = String(Math.abs(Math.sin(a * Math.PI / 180)) * (q.k % 2 ? 0.75 : 0.25));
        });
        el.style.opacity = t < o.start ? "0" : "1";
      });
    },
    options: { panels: "(4)", angle: "degrees folded (81)", start: "s (0.35; 0.12 s apart, 0.7 s ease-out quad)", refoldAt: "s (2.65)", perspective: "× the card's height (2.3)", shade: "shade colour" },
    defaults: { panels: 4, angle: 81, start: 0.35, refoldAt: 2.65, perspective: 2.3, shade: "#0b0d12" },
    demo: { css: `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #151a28; font-family: Inter, sans-serif; } .pf-w { position: absolute; inset: 0; display: grid; place-items: center; }
.pf { position: relative; width: 1300px; height: 560px; border-radius: 20px; background: #f4f1ea; display: grid; place-items: center; padding: 0; } .pf h2 { margin: 0; font-size: 150px; font-weight: 900; letter-spacing: -0.02em; text-align: center; } .pf i { position: absolute; left: 100px; right: 100px; bottom: 90px; height: 4px; background: #8b7bff; }`,
      html: `<div class="pf-w"><div class="pf"><h2>Mở ra từng nếp</h2><i></i></div></div>`, run: `MW.textPaperFold(q(".pf"), tl, 0, {});`, duration: 3.6 },
  }),

  T("text/falloff-sweep", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, col = getComputedStyle(el).color, mix = gsap.utils.interpolate(col, o.tint), dt = 1 / 240;
      return MW.drive(tl, at, o.loop, function (t) {
        var W = el.parentNode.offsetWidth, R = o.radius;
        ch.forEach(function (c) {
          var cx = c.getBoundingClientRect(), hb = el.parentNode.getBoundingClientRect(), x = cx.left - hb.left + cx.width / 2, v = 0, vv = 0;
          for (var s = 0; s < t; s += dt) { var ts = Math.floor(s / 0.07) * 0.07, fx = -o.margin + (W + 2 * o.margin) * Math.max(0, Math.min(1, (ts - 0.35) / 1.7)), d = Math.abs(fx - x), q = Math.max(0, 1 - d / R), w = q * q * (3 - 2 * q); var a = o.k * (w - v) - o.c * vv; vv += a * dt; v += vv * dt; if (v < -0.2) { v = -0.2; vv = 0; } }
          gsap.set(c, { y: -o.rise * v, scale: 1 + 0.16 * v, rotation: 20 * v }); c.style.color = mix(0.55 * Math.max(0, v));
          var sh = []; for (var k = 1; k <= 9; k++) { var off = k * 0.9 * (1 + 0.8 * v) * o.unit; sh.push(off + "px " + off + "px 0 rgba(139,123,255," + (0.95 - 0.4 * (k - 1) / 8) + ")"); } c.style.textShadow = sh.join(",");
        });
      });
    },
    options: { radius: "px of the falloff (230)", margin: "px the sweep starts before / ends past the frame (350)", rise: "px (70)", k: "spring stiffness (140)", c: "damping (9)", unit: "px per extrusion step unit (4)", tint: "colour inside the falloff", loop: "s (3.4)" },
    defaults: { radius: 230, margin: 350, rise: 70, k: 140, c: 9, unit: 4, tint: "#ffd23d", loop: 3.4 },
    demo: H("Vùng quét đi qua", `MW.textFalloffSweep(q(".tk-head"), tl, 0, {});`, 3.4, { size: 190, weight: 900 }),
  }),

  T("text/char-magnetize", {
    uses: ["split", "drive", "spring", "eases"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, sp = MW.spring(o.k, o.c), io = MW.ez("in-out"), fs = parseFloat(getComputedStyle(el).fontSize), tilts = [-0.8, 0.9, -0.5, 0.7, -0.9];
      var off = ch.map(function (c, i) { return [((i * 37) % 7 / 7 * 0.6 + 1.2) * fs * (i % 2 ? 1 : -1), ((i * 53) % 5 / 5 * 0.6 + 1.2) * fs * (i % 3 ? -1 : 1), tilts[i % 5]]; });
      if (o.accent) ch[0].style.color = o.accent;
      return MW.drive(tl, at, o.loop, function (t) {
        ch.forEach(function (c, i) {
          var p = t < o.start + i * 0.07 ? 0 : sp.at(t - o.start - i * 0.07), back = io(Math.max(0, Math.min(1, (t - 3.3) / 0.7))), q = Math.min(1.2, p) * (1 - back) + 0 * back, fl = o.float * (1 - Math.min(1, q));
          gsap.set(c, { x: off[i][0] * (1 - q) + fl * Math.sin(2 * Math.PI * t / 4.2 + i), y: off[i][1] * (1 - q) + fl * Math.cos(2 * Math.PI * t / 4.2 + i), rotation: off[i][2] * 57.3 * (1 - q) });
        });
      });
    },
    options: { k: "spring stiffness (220)", c: "damping (20)", start: "s (0.5; 0.07 s apart, left to right)", float: "px of the drift while unsettled (16)", accent: "first letter's colour", loop: "s (4.2): back to the scatter 3.3-4.0 s" },
    defaults: { k: 220, c: 20, start: 0.5, float: 16, accent: "#a99bff", loop: 4.2 },
    demo: H("NGAY HÀNG", `MW.textCharMagnetize(q(".tk-head"), tl, 0, {});`, 4.2, { size: 200, weight: 900 }),
  }),

  T("text/letter-collision", {
    uses: ["drive", "canvas"],
    fn: function (el, tl, at, o) {
      var A = el.querySelector(o.a), B = el.querySelector(o.b), fs = parseFloat(getComputedStyle(A).fontSize), pin = gsap.parseEase("power1.in"), p2 = gsap.parseEase("power2.out"), cv = MW.canvas(el), c = cv.ctx;
      A.style.transformOrigin = B.style.transformOrigin = "50% 100%";
      return MW.drive(tl, at, 4.1, function (t) {
        var x = -o.run * fs * (1 - pin(Math.max(0, Math.min(1, (t - 0.4) / 0.6)))), d = t - 1.0, tri = Math.max(0, 1 - Math.abs(d) / 0.07), rec = d > 0 && d < 0.25 ? 4 * o.unit * Math.sin(Math.PI * d / 0.25) * Math.exp(-6 * d) : 0;
        var fade = t < 3.3 ? 1 : t < 3.6 ? 1 - (t - 3.3) / 0.3 : t < 3.8 ? 0 : (t - 3.8) / 0.3;
        gsap.set(A, { x: x - rec, scaleX: 1 - 0.2 * tri, scaleY: 1 + 0.2 * tri }); gsap.set(B, { x: o.slide * fs * p2(Math.max(0, Math.min(1, d / 0.7))), scaleX: 1 + 0.12 * tri, scaleY: 1 - 0.12 * tri });
        if (t >= 3.6) { gsap.set(A, { x: -o.run * fs }); gsap.set(B, { x: 0 }); } A.style.opacity = B.style.opacity = String(Math.max(0, Math.min(1, fade)));
        c.clearRect(0, 0, cv.w, cv.h); if (d > 0 && d < 0.25) { var r = B.getBoundingClientRect(), hb = el.getBoundingClientRect(), px = r.left - hb.left - o.slide * fs * p2(Math.min(1, d / 0.7)), py = r.top - hb.top + r.height * 0.45, u = d / 0.25;
          c.strokeStyle = "rgba(255,210,61," + (1 - u) + ")"; c.lineWidth = 8; c.lineCap = "round"; for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 - 0.9 + i * 0.45; c.beginPath(); c.moveTo(px + Math.cos(a) * (40 + 60 * u), py + Math.sin(a) * (40 + 60 * u)); c.lineTo(px + Math.cos(a) * (80 + 90 * u), py + Math.sin(a) * (80 + 90 * u)); c.stroke(); } }
      });
    },
    options: { a: "the moving letter", b: "the letter it hits", run: "em A travels (1.8)", slide: "em B slides (1.9)", unit: "px per reference unit (5)" }, defaults: { a: ".lc-a", b: ".lc-b", run: 1.8, slide: 1.9, unit: 5 },
    demo: { css: `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .lc { position: absolute; inset: 0; }
.lc span { position: absolute; top: 400px; font-size: 240px; font-weight: 900; line-height: 1; } .lc-a { left: 800px; color: #a99bff; } .lc-b { left: 1050px; } .lc::after { content: ""; position: absolute; left: 260px; right: 260px; top: 650px; height: 4px; background: #2a3350; }`,
      html: `<div class="lc"><span class="lc-a">Đ</span><span class="lc-b">Ơ</span></div>`, run: `MW.textLetterCollision(q(".lc"), tl, 0, {});`, duration: 4.1 },
  }),

  T("text/inertia-letters", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, p2 = gsap.parseEase("power2.out");
      if (o.accent) ch[0].style.color = o.accent; ch.forEach(function (c) { c.style.transformOrigin = "50% 90%"; });
      return MW.drive(tl, at, o.loop, function (t) {
        ch.forEach(function (c, i) { var s0 = o.start + i * o.stagger, u = Math.max(0, Math.min(1, (t - s0) / 0.25)), d = t - s0 - 0.25, th = d > 0 ? o.swing * Math.exp(-d / o.decay) * Math.sin(30 * d) : 0;
          gsap.set(c, { y: (i % 2 ? -1 : 1) * o.distance * (1 - p2(u)), rotation: th * 57.3 }); c.style.opacity = t >= s0 ? "1" : "0"; });
      });
    },
    options: { distance: "px it flies in from (480)", start: "s (0.3)", stagger: "s (0.08)", swing: "radians after landing (0.5)", decay: "s (0.25)", accent: "first letter colour", loop: "s (3)" },
    defaults: { distance: 480, start: 0.3, stagger: 0.08, swing: 0.5, decay: 0.25, accent: "#a99bff", loop: 3 },
    demo: H("QUÁN TÍNH", `MW.textInertiaLetters(q(".tk-head"), tl, 0, {});`, 3, { size: 200, weight: 900 }),
  }),

  T("text/drop-bounce", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, st = Math.min(o.stagger, 1.2 / Math.max(1, n - 1)), bo = gsap.parseEase("bounce.out"), pi = gsap.parseEase("power2.in"), sh = [];
      if (o.accent) ch[0].style.color = o.accent;
      if (o.shadow) ch.forEach(function (c) { var s = document.createElement("span"); s.style.cssText = "position:absolute;left:5%;width:90%;bottom:-0.08em;height:0.2em;border-radius:50%;background:#000;pointer-events:none;"; c.style.position = "relative"; c.appendChild(s); sh.push(s); });
      return MW.drive(tl, at, o.exitAt + 0.3, function (t) {
        var e = pi(Math.max(0, Math.min(1, (t - o.exitAt) / 0.3)));
        ch.forEach(function (c, i) { var u = Math.max(0, Math.min(1, (t - i * st) / o.duration)), h = o.height * (1 - bo(u)); gsap.set(c, { y: -h + e * o.drop }); c.style.opacity = t >= i * st ? String(1 - e) : "0";
          if (sh[i]) { gsap.set(sh[i], { y: h, scaleX: Math.max(0.2, 1 - h / o.height), scaleY: 0.9 }); sh[i].style.opacity = String(Math.max(0, 0.28 * (1 - h / (o.height * 0.8))) * (1 - e)); } });
      });
    },
    options: { height: "px it drops from (800)", duration: "s (0.9), bounce.out", stagger: "s (0.04, all start within 1.2 s)", shadow: "a floor shadow under each letter", drop: "px it sinks on the exit (120)", exitAt: "s after the start (2.85)", accent: "first letter colour" },
    defaults: { height: 800, duration: 0.9, stagger: 0.04, shadow: true, drop: 120, exitAt: 2.85, accent: "#a99bff" },
    demo: H("Nảy trên sàn", `MW.textDropBounce(q(".tk-head"), tl, 0.3, {});`, 3.6, { size: 190, weight: 900 }, FLOOR),
  }),

  T("text/rain-letters", {
    uses: ["split", "drive", "rand"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, r = MW.rand(o.seed), p2 = gsap.parseEase("power2.out"), pi = gsap.parseEase("power2.in");
      var order = ch.map(function (_, i) { return i; }).sort(function () { return r() - 0.5; }), out = ch.map(function (_, i) { return i; }).sort(function () { return r() - 0.5; }), s0 = [], s1 = [];
      order.forEach(function (ci, k) { s0[ci] = o.start + o.spread * k / Math.max(1, n - 1); }); out.forEach(function (ci, k) { s1[ci] = o.exitAt + 0.55 * k / Math.max(1, n - 1); });
      var Y = function (i, t) { if (t < s0[i]) return null; if (t < s1[i]) return -o.drop * (1 - p2(Math.min(1, (t - s0[i]) / 0.5))); return o.drop * pi(Math.min(1, (t - s1[i]) / 0.45)); };
      return MW.drive(tl, at, o.exitAt + 1.1, function (t) {
        ch.forEach(function (c, i) {
          var y = Y(i, t); if (y == null) { c.style.opacity = "0"; return; } gsap.set(c, { y: y }); c.style.opacity = t >= s1[i] ? String(1 - Math.min(1, y / o.drop)) : "1";
          var sh = []; [[0.033, 0.5], [0.066, 0.35], [0.099, 0.2]].forEach(function (q) { var yp = Y(i, t - q[0]); if (yp == null) return; var dy = yp - y; if (Math.abs(dy) > 6) sh.push("0 " + dy + "px 0 rgba(139,123,255," + q[1] + ")"); }); c.style.textShadow = sh.join(",") || "none";
        });
      });
    },
    options: { drop: "px (600)", start: "s (0.3)", spread: "s the starts spread over (1)", exitAt: "s (2.85)", seed: "the orders" }, defaults: { drop: 600, start: 0.3, spread: 1, exitAt: 2.85, seed: 3 },
    demo: H("Mưa chữ rơi", `MW.textRainLetters(q(".tk-head"), tl, 0, {});`, 4, { size: 190, weight: 900 }),
  }),

  T("text/falling-pile", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var words = el.textContent.trim().split(/\s+/), r = MW.rand(o.seed), W = el.offsetWidth, fs = parseFloat(getComputedStyle(el).fontSize), floor = el.offsetHeight, pills = [];
      el.textContent = ""; el.style.position = "relative";
      words.forEach(function (w, i) { var p = document.createElement("span"); p.textContent = w; p.style.cssText = "position:absolute;left:0;top:0;white-space:nowrap;padding:0.15em 0.35em;border-radius:0.39em;line-height:1;" + (i === 0 ? "background:" + o.accent + ";color:#fff;" : "background:#e8ebf3;color:#151a28;"); el.appendChild(p); pills.push({ p: p, w: p.offsetWidth, h: p.offsetHeight }); });
      // rest slots: rows from the floor up, centred, 4-unit gaps, odd rows shifted, upper rows tilted a little
      var row = 0, x = 0, rows = [[]]; pills.forEach(function (q) { if (x + q.w > W * 0.9 && rows[row].length) { row++; rows.push([]); x = 0; } rows[row].push(q); x += q.w + o.gap; });
      rows.forEach(function (rw, ri) { var tot = rw.reduce(function (s, q) { return s + q.w; }, 0) + o.gap * (rw.length - 1), xx = (W - tot) / 2 + (ri % 2 ? o.shift : 0); rw.forEach(function (q) { q.sx = xx; q.sy = floor - (ri + 1) * (q.h + 2); q.rot = ri ? (r() * 2 - 1) * 4 : 0; q.ri = ri; xx += q.w + o.gap; }); });
      var n = pills.length, step = Math.min(0.2, 1.5 / n), g = o.gravity, e = o.restitution;
      pills.forEach(function (q, i) { q.t0 = o.start + step * i; q.h0 = (30 + 50 * r()) * o.unit; q.dx = (r() * 2 - 1) * 25 * o.unit; q.tilt = (r() * 2 - 1) * 0.6; });
      var fallY = function (h0, d) { var v = Math.sqrt(2 * g * h0), tt = v / g; if (d < tt) return h0 - 0.5 * g * d * d; d -= tt; var vv = v * e; for (var k = 0; k < 4; k++) { var air = 2 * vv / g; if (d < air) return vv * d - 0.5 * g * d * d; d -= air; vv *= e; } return 0; };
      var land = function (q) { return Math.sqrt(2 * q.h0 / g); };
      return MW.drive(tl, at, o.exitAt + 0.6, function (t) {
        var ex = Math.max(0, t - o.exitAt);
        pills.forEach(function (q, i) {
          var d = t - q.t0; if (d < 0) { q.p.style.opacity = "0"; return; } var h = fallY(q.h0, d), p1 = gsap.parseEase("power1.out")(Math.min(1, d / 0.6)), td = Math.max(0, d - land(q)), tilt = q.tilt * Math.exp(-7 * td) * Math.cos(16 * td);
          var dip = 0; pills.forEach(function (u) { if (u.ri === q.ri - 1 && Math.abs(u.sx - q.sx) < q.w) { var du = t - u.t0 - land(u); if (du > 0) dip += 2.4 * o.unit * Math.exp(-12 * du) * Math.sin(34 * du); } });
          var fy = ex > 0 ? 0.5 * g * ex * ex : 0; gsap.set(q.p, { x: q.sx + q.dx * (1 - p1), y: q.sy - h + dip + fy, rotation: q.rot + tilt * 57.3 }); q.p.style.opacity = String(1 - Math.max(0, Math.min(1, (t - o.exitAt - 0.1) / 0.4)));
        });
      });
    },
    options: { gravity: "px/s² (6000)", restitution: "(0.4)", gap: "px (16)", shift: "px odd rows shift (24)", unit: "px per reference unit (4)", start: "s (0.3)", exitAt: "s (3.75)", accent: "first pill", seed: "drops" },
    defaults: { gravity: 6000, restitution: 0.4, gap: 16, shift: 24, unit: 4, start: 0.3, exitAt: 3.75, accent: "#8b7bff", seed: 6 },
    demo: { css: `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); font-family: Inter, sans-serif; } .fp-w { position: absolute; left: 260px; right: 260px; top: 160px; height: 560px; }
.fp { width: 100%; height: 100%; font-size: 92px; font-weight: 800; } .fp-w::after { content: ""; position: absolute; left: 0; right: 0; top: 562px; height: 6px; background: #2a3350; }`,
      html: `<div class="fp-w"><div class="fp">Mọi ý tưởng đều có chỗ đứng của nó</div></div>`, run: `MW.textFallingPile(q(".fp"), tl, 0, {});`, duration: 4.3 },
  }),

  T("text/pendulum-letters", {
    uses: ["split", "drive", "spring"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, st = Math.min(o.stagger, 0.9 / Math.max(1, n - 1)), sp = MW.spring(o.k, o.c), bi = gsap.parseEase("back.in");
      el.style.letterSpacing = "0.08em"; ch.forEach(function (c) { c.style.transformOrigin = "50% 0%"; });
      return MW.drive(tl, at, o.exitAt + 0.6, function (t) {
        var e = bi(Math.max(0, Math.min(1, (t - o.exitAt) / 0.6)));
        ch.forEach(function (c, i) { var d = t - o.start - i * st, a = d < 0 ? 90 : 90 * (1 - sp.at(d)); a = a + (90 - a) * e; gsap.set(c, { rotation: a }); });
      });
    },
    options: { k: "spring stiffness (90)", c: "damping (4.5)", start: "s (0.35)", stagger: "s (0.06, ≤ 0.9 s)", exitAt: "s they swing back up (3.55)" }, defaults: { k: 90, c: 4.5, start: 0.35, stagger: 0.06, exitAt: 3.55 },
    demo: H("ĐUNG ĐƯA", `MW.textPendulumLetters(q(".tk-head"), tl, 0, {});`, 4.2, { size: 190, weight: 900 }, ".tk-stage::before { content: ''; position: absolute; left: 380px; right: 380px; top: 448px; height: 6px; border-radius: 3px; background: #4a5478; }"),
  }),

  T("text/squash-hop", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, st = Math.min(o.stagger, 1 / Math.max(1, n - 1)), fs = parseFloat(getComputedStyle(el).fontSize), p1o = gsap.parseEase("power1.out"), p1i = gsap.parseEase("power1.in"), el2 = gsap.parseEase("elastic.out(1, 0.3)");
      ch.forEach(function (c) { c.style.transformOrigin = "50% 92%"; });
      var pose = function (d) {
        if (d < 0) return [0, 1, 1]; if (d < 0.08) { var s = Math.sin(Math.PI * d / 0.08); return [0, 1 + 0.08 * s, 1 - 0.1 * s]; }
        if (d < 0.34) { var u = p1o((d - 0.08) / 0.26); return [-o.height * fs * u, 0.85 + 0.15 * u, 1.2 - 0.2 * u]; }
        if (d < 0.54) { var v = p1i((d - 0.34) / 0.2); return [-o.height * fs * (1 - v), 1 - 0.15 * v, 1 + 0.2 * v]; }
        if (d < 0.62) { var w = p1o((d - 0.54) / 0.08); return [0, 0.85 + 0.4 * w, 1.2 - 0.5 * w]; }
        var q = el2(Math.min(1, (d - 0.62) / 0.5)); return [0, 1.25 - 0.25 * q, 0.7 + 0.3 * q];
      };
      return MW.drive(tl, at, o.loop, function (t) { ch.forEach(function (c, i) { var p = pose(t - o.start - i * st); gsap.set(c, { y: p[0], scaleX: p[1], scaleY: p[2] }); }); });
    },
    options: { height: "em of the hop (0.6)", start: "s (0.35)", stagger: "s (0.06, ≤ 1 s)", loop: "s (2.9)" }, defaults: { height: 0.6, start: 0.35, stagger: 0.06, loop: 2.9 },
    demo: H("Nhún bật bẹp", `MW.textSquashHop(q(".tk-head"), tl, 0, {});`, 2.9, { size: 190, weight: 900 }, FLOOR),
  }),

  T("text/spring-chain", {
    uses: ["split", "drive", "eases"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, io = MW.ez("in-out"), fs = parseFloat(getComputedStyle(el).fontSize), rest = ch.map(function (c) { return c.offsetLeft; });
      return MW.drive(tl, at, o.loop, function (t) {
        var X = ch.map(function () { return 0; }), Y = X.slice(), VX = X.slice(), VY = X.slice(), steps = Math.floor(t * 60);
        for (var f = 0; f <= steps; f++) {
          var s = f / 60, e = io(Math.max(0, Math.min(1, (s - o.start) / o.duration))), lx = o.ax * fs * Math.sin(2 * Math.PI * e), ly = -o.ay * fs * Math.sin(Math.PI * e), PX = X.slice(), PY = Y.slice();
          X[0] = lx; Y[0] = ly;
          for (var i = 1; i < n; i++) { VX[i] = (VX[i] + (PX[i - 1] - X[i]) * o.stiffness) * o.damping; VY[i] = (VY[i] + (PY[i - 1] - Y[i]) * o.stiffness) * o.damping; X[i] += VX[i]; Y[i] += VY[i]; }
        }
        ch.forEach(function (c, i) { var ang = i ? Math.atan2(Y[i] - Y[i - 1], (rest[i] + X[i]) - (rest[i - 1] + X[i - 1])) : 0; gsap.set(c, { x: X[i], y: Y[i], rotation: Math.max(-0.7, Math.min(0.7, ang)) * 57.3 }); });
      });
    },
    options: { ax: "em the lead swings sideways (0.85)", ay: "em up (1.35)", start: "s (0.35)", duration: "s of the lead's path (1.9)", stiffness: "per frame at 60 fps (0.2)", damping: "(0.6)", loop: "s (4.2)" },
    defaults: { ax: 0.85, ay: 1.35, start: 0.35, duration: 1.9, stiffness: 0.2, damping: 0.6, loop: 4.2 },
    demo: H("Chuỗi lò xo", `MW.textSpringChain(q(".tk-head"), tl, 0, {});`, 4.2, { size: 190, weight: 900 }),
  }),

  T("text/zero-gravity", {
    uses: ["split", "drive", "rand", "eases"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, r = MW.rand(o.seed), io = MW.ez("in-out"), P = ch.map(function () { return [3 + 3 * r(), 3 + 3 * r(), 3 + 3 * r(), r() * 6.28, r() * 6.28, r() * 6.28]; });
      el.style.letterSpacing = "0.1em";
      return MW.drive(tl, at, o.loop, function (t) {
        var a = io(Math.max(0, Math.min(1, (t - 0.3) / 1.2))) * (1 - io(Math.max(0, Math.min(1, (t - (o.loop - 1.4)) / 1.2)))); gsap.set(el, { y: -o.lift * a });
        ch.forEach(function (c, i) { var p = P[i], w = 2 * Math.PI * t; gsap.set(c, { x: a * o.drift * Math.sin(w / p[0] + p[3]), y: a * o.drift * Math.sin(w / p[1] + p[4]), rotation: a * o.turn * Math.sin(w / p[2] + p[5]) }); });
      });
    },
    options: { drift: "px (48)", turn: "degrees (15)", lift: "px the line lifts (24)", loop: "s (6)", seed: "periods and phases" }, defaults: { drift: 48, turn: 15, lift: 24, loop: 6, seed: 8 },
    demo: H("Không trọng lực", `MW.textZeroGravity(q(".tk-head"), tl, 0, {});`, 6, { size: 170, weight: 900 }),
  }),

  T("text/domino-topple", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, fs = parseFloat(getComputedStyle(el).fontSize), p1 = gsap.parseEase("power1.in"), bk = gsap.parseEase("back.out"), ball = o.ball ? MW.el(o.ball) : null, step = Math.min(0.12, 1.6 / Math.max(1, n - 1));
      el.style.letterSpacing = o.spacing + "em"; ch.forEach(function (c) { c.style.transformOrigin = "100% 92%"; });
      var contact = Math.asin(Math.min(1, o.spacing / 0.72)) * 57.3, fin = ch.map(function (_, j) { return j === n - 1 ? 86 : contact + 18 * j / Math.max(1, n - 1); });
      var A = function (j, t) { var d = t - 0.7 - j * step; if (d < 0) return 0; if (j === n - 1) { if (d < 0.3) return 86 * p1(d / 0.3); var dd = d - 0.3; return 86 - 7 * Math.exp(-7 * dd) * Math.abs(Math.sin(14 * dd)); } var a = contact * p1(Math.min(1, d / 0.12)); var nx = A(j + 1, t) / fin[j + 1]; return a + (fin[j] - contact) * Math.min(1, Math.max(0, nx)); };
      return MW.drive(tl, at, 4.2, function (t) {
        var rs = t > 3.45 ? 1 - bk(Math.min(1, (t - 3.45) / 0.5)) : 1;
        ch.forEach(function (c, j) { gsap.set(c, { rotation: A(j, t) * rs }); });
        if (ball) { var u = p1(Math.max(0, Math.min(1, (t - 0.25) / 0.45))), r0 = ch[0].getBoundingClientRect(), hb = el.parentNode.getBoundingClientRect(); gsap.set(ball, { x: -500 * (1 - u), rotation: 360 * u }); ball.style.left = (r0.left - hb.left - ball.offsetWidth) + "px"; ball.style.opacity = t < 3.45 ? "1" : String(1 - (t - 3.45) / 0.3); }
      });
    },
    options: { spacing: "letter spacing, em (0.42)", ball: "the ball that pushes the first letter" }, defaults: { spacing: 0.42, ball: null },
    demo: H("DOMINO", `MW.textDominoTopple(q(".tk-head"), tl, 0, { ball: ".dm-ball" });`, 4.2, { size: 190, weight: 900 }, `${FLOOR} .dm-ball { position: absolute; top: 540px; width: 100px; height: 100px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #c9bfff, #7357f5); }`),
  }),

  T("text/particle-gather", {
    kind: "block",
    uses: ["drive", "rand", "canvas"],
    async: "the text is sampled once its font has loaded",
    fn: function (el, tl, at, o) {
      var cv = MW.canvas(el), c = cv.ctx, r = MW.rand(o.seed), pts = [], ex = gsap.parseEase("expo.out"), pi = gsap.parseEase("power2.in"), om = o.omega, z = o.zeta;
      var sample = function () {
        var off = document.createElement("canvas"); off.width = cv.w; off.height = cv.h; var x = off.getContext("2d"); x.font = "900 " + o.size + "px Inter, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#000"; x.fillText(o.text, cv.w / 2, cv.h / 2);
        var d = x.getImageData(0, 0, cv.w, cv.h).data;
        for (var yy = 0, row = 0; yy < cv.h; yy += o.step, row++) for (var xx = (row % 2) * o.step / 2; xx < cv.w; xx += o.step) if (d[(Math.floor(yy) * cv.w + Math.floor(xx)) * 4 + 3] > 128) pts.push({ x: xx, y: yy, sx: r() * cv.w, sy: r() * cv.h, t0: 0.2 + 0.35 * r(), ex: 4.55 + 0.25 * r(), n: r() * 6.28 });
      };
      MW.pending = MW.pending || []; MW.pending.push(document.fonts && document.fonts.load ? document.fonts.load("900 " + o.size + "px Inter").then(sample, sample) : Promise.resolve(sample()));
      var cur = function (t) { var u = Math.max(0, Math.min(1, (t - 1.9) / 1.7)); return [cv.w + 100 - (cv.w + 200) * u, cv.h / 2 + 120 * Math.sin(u * 6)]; };
      return MW.drive(tl, at, o.loop, function (t) {
        c.clearRect(0, 0, cv.w, cv.h);
        pts.forEach(function (p) {
          var g = ex(Math.max(0, Math.min(1, (t - p.t0) / 0.9))), out = pi(Math.max(0, Math.min(1, (t - p.ex) / 0.6))), x = p.sx + (p.x - p.sx) * g, y = p.sy + (p.y - p.sy) * g, push = 0, ang = 0;
          if (t > 1.9 && t < 4.2) { var s = 1.9, dx = 0, v = 0, dt = 1 / 60; for (; s < t; s += dt) { var cc = cur(s), dd = Math.hypot(p.x - cc[0], p.y - cc[1]), target = dd < o.radius ? Math.min(o.push, o.push * Math.pow(1 - dd / o.radius, 2) * 3) : 0; var a = om * om * (target - dx) - 2 * z * om * v; v += a * dt; dx += v * dt; } var c2 = cur(t); ang = Math.atan2(p.y - c2[1], p.x - c2[0]); push = dx; }
          x += Math.cos(ang) * push + 1.6 * Math.sin(t * 3 + p.n); y += Math.sin(ang) * push + 1.6 * Math.cos(t * 3 + p.n);
          x = x + (p.sx - x) * out; y = y + (p.sy - y) * out;
          c.globalAlpha = 0.35 + 0.65 * g; c.fillStyle = push > 4 ? o.accent : o.color; c.fillRect(x - 4, y - 4, 8, 8);
        });
        c.globalAlpha = 1; if (t > 1.9 && t < 3.6) { var p2 = cur(t); c.save(); c.translate(p2[0], p2[1]); c.scale(4, 4); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 16); c.lineTo(4, 12.5); c.lineTo(6.5, 18); c.lineTo(9, 17); c.lineTo(6.5, 11.5); c.lineTo(11.5, 11.5); c.closePath(); c.fillStyle = "#fff"; c.fill(); c.restore(); }
      });
    },
    options: { text: "the word", size: "px (420)", step: "px between samples (12)", radius: "px the cursor pushes (152)", push: "px at most (136)", omega: "spring (10)", zeta: "(0.45)", color: "dot colour", accent: "pushed dots", loop: "s (5.4)", seed: "scatter" },
    defaults: { text: "HẠT", size: 420, step: 12, radius: 152, push: 136, omega: 10, zeta: 0.45, color: "#e8ebf3", accent: "#a99bff", loop: 5.4, seed: 2 },
    demo: { css: `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); } .pg { position: absolute; inset: 0; }`, html: `<div class="pg"></div>`, run: `MW.textParticleGather(q(".pg"), tl, 0, {});`, duration: 5.4 },
  }),
];

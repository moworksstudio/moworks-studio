// Material & Surface Motion (batch 3.5): liquids, gels, glass, foil, paper, cloth, frost, sand, ink and chrome, mostly drawn on a 320 x 200
// frame, a few on the element itself; written here.
import { T } from "../../moworks/define.mjs";
import { CURSOR, ui } from "../../moworks/stages.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const CV = (name, duration = 4, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
const C2 = ["drive", "draw", "plot", "stage320"];

export default [
  T("ui/liquid-tab-bridge", {
    uses: C2,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), pin = gsap.parseEase("power2.in"), p2 = gsap.parseEase("power2.out"), X = [96, 160, 224], cy = 100, R = 15;
      var icon = function (i, col) { var x = X[i]; c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 2.2; c.beginPath(); if (i === 0) { c.arc(x, cy, 6, 0, 2 * Math.PI); c.stroke(); } else if (i === 1) { MW.rr(c, x - 6, cy - 6, 12, 12, 2.5); c.stroke(); } else { c.moveTo(x, cy - 7); c.lineTo(x + 7, cy + 5); c.lineTo(x - 7, cy + 5); c.closePath(); c.stroke(); } };
      var trip = function (t, t0, a, b) { var u = Math.max(0, Math.min(1, (t - t0) / o.travel)), x = a + (b - a) * io(u), v = Math.abs(io(Math.min(1, u + 0.01)) - io(Math.max(0, u - 0.01))) / 0.02 * Math.abs(b - a) / o.travel, dir = b > a ? 1 : -1;
        var snap = o.snap * o.travel, ts = t - t0 - snap, dr = u < o.snap ? R + (6 - R) * (u / o.snap) : 6 * (1 - pin(Math.max(0, Math.min(1, ts / 0.32)))), neck = u < o.snap ? 11 + (2 - 11) * (u / o.snap) : 0, tail = u >= o.snap ? 22 * (1 - p2(Math.max(0, Math.min(1, ts / 0.18)))) : 0;
        var sx = 1 + Math.min(0.42, v / o.speedFull), land = t - t0 - o.travel; if (land > 0) sx = 1 + o.wobble * Math.exp(-7 * land) * Math.sin(26 * land);
        return { x: x, sx: sx, a: a, dr: u > 0 ? dr : 0, neck: u > 0 ? neck : 0, tail: tail, dir: dir }; };
      return MW.drive(tl, at, o.loop, function (t) {
        var s = t < o.backAt ? trip(t, o.start, X[0], X[2]) : trip(t, o.backAt, X[2], X[0]);
        S.clear(); MW.rr(c, 56, 74, 208, 52, 26); c.fillStyle = "#151a24"; c.fill(); c.strokeStyle = "#262c3a"; c.lineWidth = 1; c.stroke();
        for (var i = 0; i < 3; i++) icon(i, "#8f9ab3");
        var blob = function () { c.beginPath(); c.ellipse(s.x, cy, R * s.sx, R / s.sx, 0, 0, 2 * Math.PI); if (s.dr > 0.3) { c.moveTo(s.a + s.dr, cy); c.arc(s.a, cy, s.dr, 0, 2 * Math.PI); }
          if (s.neck > 0.3) { var x0 = s.a, x1 = s.x - s.dir * R * s.sx * 0.6; c.moveTo(x0, cy - s.neck / 2); c.lineTo(x1, cy - s.neck / 2); c.lineTo(x1, cy + s.neck / 2); c.lineTo(x0, cy + s.neck / 2); c.closePath(); }
          if (s.tail > 0.3) { var bx = s.x - s.dir * R * s.sx * 0.8; c.moveTo(bx, cy - 4); c.lineTo(bx - s.dir * s.tail, cy); c.lineTo(bx, cy + 4); c.closePath(); } };
        c.fillStyle = o.accent; blob(); c.fill(); c.save(); blob(); c.clip(); for (var j = 0; j < 3; j++) icon(j, "#0b0d12"); c.restore();
      });
    },
    options: { travel: "s (0.9, power2.inOut) for 128 units", speedFull: "units a second for the full stretch (600)", snap: "share of the trip the neck snaps (0.88)", wobble: "landing wobble (0.16 × e^(−7 t) × sin 26 t)", start: "s (0.4)", backAt: "s it goes back (2.5)", accent: "", loop: "s (4)" },
    defaults: { travel: 0.9, speedFull: 600, snap: 0.88, wobble: 0.16, start: 0.4, backAt: 2.5, accent: "#8b7bff", loop: 4 },
    demo: CV("uiLiquidTabBridge", 4),
  }),

  T("effect/gel-split", {
    uses: ["drive", "draw", "plot", "spring", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, p2 = gsap.parseEase("power2.out"), p1 = gsap.parseEase("power1.in"), A = MW.spring(260, 12), Wb = MW.spring(300, 9), J = MW.spring(200, 22), cx = 160, cy = 100;
      return MW.drive(tl, at, o.loop, function (t) {
        var d = 22, sx = 1, nk = 22;
        if (t < 0.3) d = 22; else if (t < 0.5) { var u = p2((t - 0.3) / 0.2); d = 22 - 4 * u; sx = 1 - 0.06 * u; } else if (t < 1.3) { var w = p1((t - 0.5) / 0.8); d = 18 + 36 * w; sx = 0.94 + 0.22 * w; }
        else if (t < o.rejoin) { d = 54 + 20 * A.at(t - 1.3); sx = 1 + 0.16 * (1 - Wb.at(t - 1.3)); } else { var j = J.at(t - o.rejoin); d = 74 - 52 * j; sx = 1 + 0.05 * Math.sin(Math.PI * Math.min(1, (t - o.rejoin) / 0.4)); }
        var sy = 1 / Math.sqrt(sx); if (t >= 0.5 && t < 1.3) nk = 22 * sy * Math.pow(Math.max(0, 1 - (d - 22) / 32), 1.4); else if (t >= 1.3 && t < o.rejoin + 0.18) nk = 0; else if (t >= o.rejoin + 0.18) nk = 22 * Math.min(1, (t - o.rejoin - 0.18) / 0.2);
        S.clear(); var w2 = 30 * sx, h2 = 22 * sy; c.fillStyle = o.accent;
        [-1, 1].forEach(function (s) { MW.rr(c, cx + s * d - w2, cy - h2, 2 * w2, 2 * h2, h2); c.fill(); });
        if (nk > 0.3) { c.fillRect(cx - d, cy - nk / 2, 2 * d, nk); }
        var split = t >= 1.3 && t < o.rejoin + 0.3; c.globalAlpha = split ? Math.min(1, (t - 1.3) / 0.2) : 1;
        if (split) { MW.txt(c, "A", cx - d, cy + 0.5, 16, "#fff", 900); MW.txt(c, "B", cx + d, cy + 0.5, 16, "#fff", 900); } else MW.txt(c, o.label, cx, cy + 0.5, 13, "#fff", 900);
        c.globalAlpha = 1;
      });
    },
    options: { rejoin: "s the halves pull back together (3.0)", label: "text on the joined button", accent: "", loop: "s (4.2)" }, defaults: { rejoin: 3, label: "TÁCH", accent: "#8b7bff", loop: 4.2 },
    notes: "Squeeze to ±18 (power2.out), pull apart to ±54 (power1.in) with the neck 22 × scaleY × (1 − (d − 22) / 32)^1.4, split, then springs k260 c12 (centres) and k300 c9 (wobble); rejoin on k200 c22.",
    demo: CV("effectGelSplit", 4.2),
  }),

  T("effect/glass-lens-window", {
    uses: ["drive", "draw", "plot", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase(o.ease), wy = 92;
      var content = function () { MW.rr(c, 40, 30, 240, 140, 14); c.fillStyle = "#151a24"; c.fill(); MW.txt(c, o.title, 56, 50, 11, "#e8ebf3", 800, "left"); c.fillStyle = "#3a4466"; [150, 120, 170].forEach(function (w, i) { MW.rr(c, 56, 64 + i * 10, w, 4, 2); c.fill(); });
        [32, 48, 26, 58, 44, 70, 52].forEach(function (h, i) { c.fillStyle = i === 5 ? "#8b7bff" : "#2f3a5c"; MW.rr(c, 60 + i * 30, 158 - h, 18, h, 3); c.fill(); }); c.strokeStyle = "#262c3a"; c.lineWidth = 1; c.beginPath(); c.moveTo(56, 158.5); c.lineTo(266, 158.5); c.stroke(); };
      return MW.drive(tl, at, o.loop, function (t) {
        var x = 96 + 128 * (io(MW.span(t, 0.4, 1.8)) - io(MW.span(t, 2.6, 3.8))), L = x - 50, Tp = wy - 35;
        S.clear(); content();
        c.save(); MW.rr(c, L, Tp, 100, 70, 16); c.clip(); c.fillStyle = "#0b0d12"; c.fillRect(L, Tp, 100, 70); c.translate(x, wy); c.scale(o.zoom, o.zoom); c.translate(-x, -wy); content(); c.restore();
        c.save(); MW.rr(c, L, Tp, 100, 70, 16); c.clip(); c.fillStyle = "rgba(255,255,255,0.07)"; c.fillRect(L, Tp, 100, 70);
        c.fillStyle = "rgba(255,255,255,0.22)"; c.beginPath(); c.moveTo(L + 8, Tp + 70); c.lineTo(L + 28, Tp); c.lineTo(L + 48, Tp); c.lineTo(L + 28, Tp + 70); c.closePath(); c.fill();
        c.fillStyle = "rgba(255,255,255,0.55)"; c.fillRect(L + 14, Tp + 4, 72, 0.8); c.restore();
        c.strokeStyle = o.accent; c.lineWidth = 1.5; MW.rr(c, L, Tp, 100, 70, 16); c.stroke(); MW.cursor(c, x + 30, wy + 22, 0.9);
      });
    },
    options: { zoom: "(1.4)", ease: "(power2.inOut)", title: "the card's heading", accent: "rim colour", loop: "s (4.2)" }, defaults: { zoom: 1.4, ease: "power2.inOut", title: "Doanh thu quý", accent: "#8b7bff", loop: 4.2 },
    demo: CV("effectGlassLensWindow", 4.2),
  }),

  T("effect/ink-drip", {
    uses: C2,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, p1 = gsap.parseEase("power1.in"), p2 = gsap.parseEase("power2.out"), sy = 92, ex = 232, x0 = 160, py = 172;
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var fade = 1 - MW.span(t, 3.45, 3.95); c.globalAlpha = 1;
        c.fillStyle = "#262c3a"; c.fillRect(88, sy, ex - 88, 6); c.fillStyle = "#1b2130"; c.fillRect(70, py, 180, 26); c.fillStyle = "#2a3350"; c.fillRect(70, py, 180, 1.5);
        c.globalAlpha = fade; c.fillStyle = o.ink;
        if (t < 0.75) { var u = p1(MW.span(t, 0.3, 0.75)), y = 10 + (sy - 11 - 10) * u, st = 1 + 0.38 * u; c.beginPath(); c.ellipse(x0, y, 11 / Math.sqrt(st), 11 * st, 0, 0, 2 * Math.PI); c.fill(); }
        else { var a = p2(MW.span(t, 0.75, 0.87)), b = p2(MW.span(t, 0.87, 1.57)), wob = t > 0.87 ? 2.5 * Math.exp(-6 * (t - 0.87)) * Math.sin(24 * (t - 0.87)) : 0, hw = 27 * a + (Math.max(27, ex - x0) - 27) * b, hh = 7 - 3 * b + wob * 0.4;
          var left = x0 - 27 - 8 * b, right = Math.min(ex, x0 + hw); MW.rr(c, left, sy - hh, right - left + wob, hh, Math.min(3.5, hh / 2)); c.fill(); }
        if (t > 1.4 && t < 2.12) { var g = MW.span(t, 1.4, 2.0), r = 8 * g, nk = 2.6 * (1 - MW.span(t, 1.9, 2.12)); c.fillRect(ex - 2 - nk / 2, sy + 6, nk, 4 + 10 * g); c.beginPath(); c.arc(ex - 2, sy + 10 + 10 * g, Math.max(0.5, r), 0, 2 * Math.PI); c.fill(); }
        if (t >= 2.12 && t < 2.45) { var f = p1(MW.span(t, 2.12, 2.45)); c.beginPath(); c.ellipse(ex - 2, sy + 20 + (py - sy - 20) * f, 7, 9, 0, 0, 2 * Math.PI); c.fill(); }
        if (t >= 2.45) { var rt = t - 2.45, rr = 130 * rt * 0.4, amp = 5 * Math.exp(-2.4 * rt); c.fillStyle = o.ink; c.fillRect(70, py - Math.min(5, 5 * rt * 2), 180, Math.min(5, 5 * rt * 2) + 1.5);
          for (var k = 0; k < 3; k++) { var R = rr - k * 10; if (R <= 0) continue; c.strokeStyle = "rgba(160,150,255," + (0.6 * amp / 5).toFixed(3) + ")"; c.lineWidth = 1.2; c.beginPath(); c.ellipse(ex - 2, py, R, R * 0.12, 0, 0, 2 * Math.PI); c.stroke(); } }
        c.globalAlpha = 1;
      });
    },
    options: { ink: "ink colour", loop: "s (4)" }, defaults: { ink: "#6f5cff", loop: 4 },
    notes: "Fall 0.3–0.75 s (power1.in, stretching to 1.38), squash to 54 × 7, spread to the shelf edge in 0.7 s with a 2.5 × e^(−6 t) × sin 24 t wobble, a drip forms 1.4–2.0 s, drops at 2.12 s, ripples in the pool.",
    demo: CV("effectInkDrip", 4),
  }),

  T("effect/foil-sheen-tilt", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden";
      var io = gsap.parseEase("power2.inOut"), band = document.createElement("div"), dark = document.createElement("div");
      band.style.cssText = "position:absolute;top:-10%;bottom:-10%;width:" + o.band + "%;pointer-events:none;mix-blend-mode:screen;transform:skewX(-" + o.skew + "deg);background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.28) 30%,rgba(255,255,255,0.1) 45%,rgba(255,255,255,0.75) 52%,rgba(255,255,255,0.1) 58%,rgba(255,255,255,0.5) 70%,rgba(255,255,255,0) 100%);";
      dark.style.cssText = "position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;"; el.appendChild(band); el.appendChild(dark);
      var K = [[0, 0], [0.3, 0], [1.2, -o.tilt], [1.6, -o.tilt], [2.7, o.tilt], [3.1, o.tilt], [3.9, 0]];
      var A = function (t) { if (t <= 0) return 0; for (var i = 1; i < K.length; i++) if (t <= K[i][0]) return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * io((t - K[i - 1][0]) / (K[i][0] - K[i - 1][0])); return 0; };
      return MW.drive(tl, at, 3.9, function (t) {
        var a = A(t); gsap.set(el, { rotationY: a, transformPerspective: o.perspective }); band.style.left = (58 - (a / o.tilt) * 34 - o.band / 2).toFixed(2) + "%"; dark.style.opacity = String((0.7 * Math.abs(a) * Math.PI / 180).toFixed(3));
      });
    },
    options: { tilt: "degrees each way (24)", perspective: "px (1900)", band: "% width of the light band (60)", skew: "degrees (12)" }, defaults: { tilt: 24, perspective: 1900, band: 60, skew: 12 },
    notes: "Tilts to −24°, holds, to +24°, holds, back to 0 (power2.inOut); the band sits at 58 % − (tilt / 24°) × 34 %, so it moves against the tilt; the face darkens 0.7 × |tilt in radians|.",
    demo: { css: `${BG}\n.st { position: absolute; inset: 0; display: grid; place-items: center; } .fo { position: relative; width: 720px; height: 460px; border-radius: 40px; padding: 60px; box-sizing: border-box; color: #fff;
  background: linear-gradient(135deg, rgba(139,123,255,0.95), rgba(90,70,220,0.8)); box-shadow: 0 60px 90px rgba(0,0,0,0.5); } .fo i { display: block; width: 110px; height: 80px; border-radius: 16px; border: 4px solid rgba(255,255,255,0.7); margin-bottom: 70px; } .fo b { font-size: 64px; letter-spacing: 0.12em; } .fo span { display: block; margin-top: 18px; font-size: 32px; letter-spacing: 0.1em; opacity: 0.8; }`,
      html: `<div class="st"><div class="fo"><i></i><b>HỘI VIÊN</b><span>THẺ NHŨ BẠC</span></div></div>`, run: `MW.effectFoilSheenTilt(q(".fo"), tl, 0, {});`, duration: 4.1 },
  }),

  T("ui/soft-body-toggle", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var kn = el.querySelector(o.knob), p2 = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), sp = MW.spring(o.k, o.c), mix = gsap.utils.interpolate(o.off, o.on);
      var one = function (t, t0, dir) { var u = t - t0; if (u <= 0) return null; var sx = 1, sy, x, origin = "50% 50%";
        if (u < 0.15) { var a = p2(u / 0.15); sx = 1 + 0.12 * a; sy = 1 - 0.15 * a; x = 0; }
        else if (u < 0.15 + o.travel) { var p = io((u - 0.15) / o.travel); x = p; sx = 1.12 * (1 - p) + p + 0.4 * Math.sin(Math.PI * p); sy = 1 / sx; }
        else { x = 1; sx = 0.78 + 0.22 * sp.at(u - 0.15 - o.travel); sy = 1 / sx; origin = dir > 0 ? "100% 50%" : "0% 50%"; }
        return { x: x, sx: sx, sy: sy, origin: origin }; };
      return MW.drive(tl, at, o.backAt + 0.15 + o.travel + sp.duration, function (t) {
        var b = one(t, o.backAt, -1), f = one(t, o.pressAt, 1), s = b || f || { x: 0, sx: 1, sy: 1, origin: "50% 50%" }, pos = b ? 1 - b.x : s.x;
        gsap.set(kn, { x: o.distance * pos, scaleX: s.sx, scaleY: s.sy, transformOrigin: s.origin }); el.style.background = mix(Math.max(0, Math.min(1, pos)));
      });
    },
    options: { knob: "", distance: "px of travel (260)", travel: "s (0.33, power2.inOut)", k: "landing spring stiffness (420)", c: "damping (11)", pressAt: "s (0.4)", backAt: "s (2.4)", on: "track colour on", off: "track colour off" },
    defaults: { knob: ".sb-k", distance: 260, travel: 0.33, k: 420, c: 11, pressAt: 0.4, backAt: 2.4, on: "#8b7bff", off: "#2a3142" },
    notes: "Press: 1.12 × 0.85 in 0.15 s; travel with scaleX + 0.4 × sin(π progress); lands squashed to 0.78 against the far edge, then springs back; scaleY = 1 / scaleX.",
    demo: { css: `${BG}\n.st { position: absolute; inset: 0; display: grid; place-items: center; } .sb { position: relative; width: 520px; height: 240px; border-radius: 120px; background: #2a3142; } .sb-k { position: absolute; left: 35px; top: 35px; width: 170px; height: 170px; border-radius: 50%; background: #fff; box-shadow: 0 12px 30px rgba(0,0,0,0.35); }`,
      html: `<div class="st"><div class="sb"><div class="sb-k"></div></div></div>`, run: `MW.uiSoftBodyToggle(q(".sb"), tl, 0, {});`, duration: 3.6 },
  }),

  T("ui/viscous-progress", {
    uses: ["drive", "draw", "plot", "springs", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, x0 = 43, W = 234, cy = 118, keys = o.steps.map(function (s) { return [s[0], s[1] / 100]; }), Hd = MW.springTo(220, 16, keys), Bd = MW.springTo(70, 16, keys);
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var f = 1 - MW.span(t, 3.4, 3.8); c.globalAlpha = f;
        MW.rr(c, 28, 52, 264, 104, 14); c.fillStyle = "#151a24"; c.fill(); MW.txt(c, o.title, 44, 74, 10, "#e8ebf3", 800, "left"); MW.txt(c, o.sub, 44, 89, 7, "#6c778b", 600, "left");
        MW.rr(c, x0, cy - 7, W, 14, 7); c.fillStyle = "#262c3a"; c.fill();
        var h = Math.max(0, Hd(t)), b = Math.max(0, Math.min(1, Bd(t))), hx = x0 + 7 + (W - 14) * Math.min(1.02, h), bx = x0 + 7 + (W - 14) * b, v = (Hd(t + 0.01) - Hd(t - 0.01)) / 0.02 * (W - 14), sx = 1 + Math.max(-0.2, Math.min(0.6, v / 900)), syy = 1 / Math.sqrt(sx);
        c.fillStyle = o.accent; MW.rr(c, x0, cy - 7, Math.max(14, bx - x0 + 7), 14, 7); c.fill();
        var gap = hx - bx; if (gap > 1) { var nk = Math.max(2, 7 - gap / 10); c.beginPath(); c.moveTo(bx, cy - 7); c.quadraticCurveTo((bx + hx) / 2, cy - nk / 2, hx, cy - 11 * syy); c.lineTo(hx, cy + 11 * syy); c.quadraticCurveTo((bx + hx) / 2, cy + nk / 2, bx, cy + 7); c.closePath(); c.fill(); }
        c.beginPath(); c.ellipse(hx, cy, 11 * sx, 11 * syy, 0, 0, 2 * Math.PI); c.fill(); MW.txt(c, Math.round(b * 100) + "%", hx, cy - 22, 9, "#c9c0ff", 800);
        c.globalAlpha = 1;
      });
    },
    options: { steps: "[[s, %], ...]", title: "", sub: "", accent: "", loop: "s (4)" },
    defaults: { steps: [[0, 0], [0.4, 28], [1, 50], [1.5, 64], [2, 100]], title: "Đang tải lên", sub: "phim-gioi-thieu.mp4 · 240 MB", accent: "#8b7bff", loop: 4 },
    notes: "The head follows the steps on springs k220 c16 (it may overshoot), the body on springs k70 c16 (it lags), joined by a liquid neck; the head stretches with its speed.",
    demo: CV("uiViscousProgress", 4),
  }),

  T("effect/speed-chroma-edge", {
    uses: C2,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), X = function (t) { return 104 + 112 * (io(MW.span(t, 0.4, 1.3)) - io(MW.span(t, 2.3, 3.2))); };
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); for (var i = 0; i < 14; i++) { c.fillStyle = i % 2 ? "#1b2130" : "#2a2350"; c.fillRect(20 + i * 20, 30, 10, 140); }
        var x = X(t), v = (X(t + 0.01) - X(t - 0.01)) / 0.02, off = o.max * Math.min(1, Math.abs(v) / o.speed) * Math.sign(v), L = x - 56, Tp = 60;
        MW.rr(c, L, Tp, 112, 80, 14); c.fillStyle = "rgba(21,26,36,0.6)"; c.fill(); MW.txt(c, o.title, L + 14, Tp + 22, 10, "#e8ebf3", 800, "left"); c.fillStyle = "#3a4466"; MW.rr(c, L + 14, Tp + 38, 70, 5, 2.5); c.fill(); MW.rr(c, L + 14, Tp + 50, 50, 5, 2.5); c.fill();
        c.save(); c.globalCompositeOperation = "lighter"; c.lineWidth = 2; c.strokeStyle = o.colors[0]; MW.rr(c, L - off, Tp, 112, 80, 14); c.stroke(); c.strokeStyle = o.colors[1]; MW.rr(c, L + off, Tp, 112, 80, 14); c.stroke(); c.restore();
        c.globalAlpha = Math.max(0, 1 - Math.abs(off) / 3); c.strokeStyle = o.accent; c.lineWidth = 2; MW.rr(c, L, Tp, 112, 80, 14); c.stroke(); c.globalAlpha = 1;
      });
    },
    options: { max: "units of split at full speed (6)", speed: "units a second for the full split (230)", colors: "[yellow, blue] outlines, added", title: "", accent: "outline at rest", loop: "s (3.6)" },
    defaults: { max: 6, speed: 230, colors: ["#ffd23d", "#3d9bff"], title: "Kính màu", accent: "#8b7bff", loop: 3.6 },
    demo: CV("effectSpeedChromaEdge", 3.6),
  }),

  T("motion/paper-fold", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var cv = el.querySelector(o.cover), bk = el.querySelector(o.back), base = el.querySelector(o.base), e = gsap.parseEase(o.ease), dk1 = document.createElement("div"), dk2 = document.createElement("div"), sh = document.createElement("div");
      [dk1, dk2].forEach(function (d, i) { d.style.cssText = "position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;border-radius:inherit;"; (i ? bk : cv).appendChild(d); });
      sh.style.cssText = "position:absolute;inset:0;pointer-events:none;opacity:0;background:linear-gradient(90deg,rgba(0,0,0,0.9),rgba(0,0,0,0.2));"; if (base) base.appendChild(sh);
      gsap.set(cv, { transformOrigin: "0% 50%" }); gsap.set(bk, { transformOrigin: "100% 50%" });
      return MW.drive(tl, at, o.closeAt == null ? o.duration : o.closeAt + o.duration, function (t) {
        var A = 180 * e(Math.max(0, Math.min(1, t / o.duration))); if (o.closeAt != null) A -= 180 * e(Math.max(0, Math.min(1, (t - o.closeAt) / o.duration)));
        var s = Math.sin(A * Math.PI / 180), front = A <= 90;
        gsap.set(cv, { rotationY: -A, transformPerspective: o.perspective }); gsap.set(bk, { rotationY: 180 - A, transformPerspective: o.perspective });
        cv.style.visibility = front ? "visible" : "hidden"; bk.style.visibility = front ? "hidden" : "visible"; dk1.style.opacity = dk2.style.opacity = String(o.darken * s); sh.style.opacity = String(o.shadow * s);
      });
    },
    options: { duration: "s (1.1, power2.inOut)", ease: "", perspective: "px (2100)", darken: "at 90° (0.55)", shadow: "cast on the page under it (0.45)", closeAt: "s after the start to fold back (null)", cover: "the flap's front (on the right half)", back: "the flap's back (laid over the left half)", base: "the page under the flap" },
    defaults: { duration: 1.1, ease: "power2.inOut", perspective: 2100, darken: 0.55, shadow: 0.45, closeAt: null, cover: ".pf-c", back: ".pf-k", base: ".pf-r" },
    notes: "Folds toward the viewer about the centre crease; the faces swap at 90°, so neither reads mirrored.",
    demo: { css: `${BG}\n.st { position: absolute; inset: 0; display: grid; place-items: center; } .pf { position: relative; width: 800px; height: 480px; } .pf > div { position: absolute; top: 0; width: 400px; height: 480px; box-sizing: border-box; padding: 50px; overflow: hidden; }
.pf-l { left: 0; background: #e9e4ff; border-radius: 30px 0 0 30px; color: #2a2350; } .pf-r { left: 400px; background: #f4f1ff; border-radius: 0 30px 30px 0; color: #2a2350; } .pf-l b, .pf-r b { display: block; font-size: 46px; font-weight: 900; margin-bottom: 30px; } .pf i { display: block; height: 18px; border-radius: 9px; background: #c9c0ff; margin-top: 20px; }
.pf-c { left: 400px; background: linear-gradient(150deg, #a693ff, #6a4cf0); border-radius: 0 30px 30px 0; display: grid; place-items: center; font-size: 80px; font-weight: 900; color: #fff; } .pf-k { left: 0; background: #ddd6ff; border-radius: 30px 0 0 30px; visibility: hidden; }`,
      html: `<div class="st"><div class="pf"><div class="pf-l"><b>Chào mừng</b><i></i><i style="width:70%"></i></div><div class="pf-r"><b>BÊN TRONG</b><i></i><i style="width:80%"></i><i style="width:60%"></i></div><div class="pf-k"><i></i><i style="width:60%"></i><i style="width:80%"></i></div><div class="pf-c">MỞ</div></div></div>`,
      run: `MW.motionPaperFold(q(".pf"), tl, 0.4, { closeAt: 2.2 });`, duration: 3.8 },
  }),

  T("effect/cloth-wave", {
    uses: C2,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), n = o.strips, sw = 198 / n, X0 = 61, Y0 = 56, k = S.k, off = document.createElement("canvas");
      off.width = Math.ceil(198 * k); off.height = Math.ceil(88 * k); var g = off.getContext("2d"); g.scale(k, k);
      var gr = g.createLinearGradient(0, 0, 198, 88); gr.addColorStop(0, "#a693ff"); gr.addColorStop(1, "#5b3fe0"); g.fillStyle = gr; g.fillRect(0, 0, 198, 88);
      g.fillStyle = "#fff"; g.beginPath(); g.arc(44, 44, 20, 0, 2 * Math.PI); g.fill(); g.fillStyle = "#6a4cf0"; g.beginPath(); g.moveTo(38, 34); g.lineTo(54, 44); g.lineTo(38, 54); g.closePath(); g.fill();
      g.font = "900 17px Inter, sans-serif"; g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText(o.text, 76, 40); g.font = "600 9px Inter, sans-serif"; g.fillStyle = "rgba(255,255,255,0.8)"; g.fillText(o.sub, 77, 60);
      var Y = function (i, t) { var tau = t - o.start - o.lag * i, ramp = Math.max(0, Math.min(1, tau / 0.35)), dec = 1 - io(MW.span(t, o.settle[0], o.settle[1])); return tau > 0 ? o.amp * ramp * dec * Math.sin(2 * Math.PI * tau / o.period) : 0; };
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); c.fillStyle = "#3a4466"; c.fillRect(X0 - 5, Y0 - 6, 3, 130);
        for (var i = 0; i < n; i++) { var a = Y(i, t), b = Y(i + 1, t), sl = (b - a) / sw, x = X0 + i * sw;
          c.save(); c.translate(x, Y0 + a); c.transform(1, sl, 0, 1 + 0.25 * a / 88, 0, 0); c.drawImage(off, i * sw * k, 0, sw * k + 1, 88 * k, 0, 0, sw + 0.4, 88);
          c.fillStyle = sl < 0 ? "rgba(255,255,255," + Math.min(0.4, -sl * 1.4).toFixed(3) + ")" : "rgba(0,0,0," + Math.min(0.5, sl * 1.6).toFixed(3) + ")"; c.fillRect(0, 0, sw + 0.4, 88); c.fillStyle = "rgba(0,0,0,0.12)"; c.fillRect(0, 0, 0.35, 88); c.restore(); }
      });
    },
    options: { strips: "(18)", amp: "units (9)", period: "s (0.85)", lag: "s per strip (0.045)", start: "s (0.3)", settle: "[from, to] s the wave dies down ([1.4, 2.3])", text: "", sub: "", loop: "s (2.8)" },
    defaults: { strips: 18, amp: 9, period: 0.85, lag: 0.045, start: 0.3, settle: [1.4, 2.3], text: "MOWORKS", sub: "Phim ngắn cho thương hiệu", loop: 2.8 },
    demo: CV("effectClothWave", 2.8),
  }),

  T("effect/bubble-merge", {
    uses: ["drive", "draw", "plot", "spring", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, p1 = gsap.parseEase("power1.in"), p2 = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in"), sp = MW.spring(220, 16), cx = 160, cy = 100;
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); c.fillStyle = o.accent;
        var pill = t >= 1.25 && t < 3.25;
        if (pill) { var s = sp.at(t - 1.25), sh = t >= 3 ? pin(MW.span(t, 3, 3.25)) : 0, w = (86 + 70 * s) * (1 - sh) + 86 * sh, h = (48 + 10 * s) * (1 - sh) + 48 * sh; MW.rr(c, cx - w / 2, cy - h / 2, w, h, h / 2); c.fill();
          c.globalAlpha = MW.span(t, 1.45, 1.7) * (1 - MW.span(t, 3, 3.15)); MW.txt(c, o.label, cx, cy + 0.5, 15, "#fff", 900); c.globalAlpha = 1; return; }
        var d, sq = 1, nk = 0;
        if (t < 1.1) { var u = p1(MW.span(t, 0.3, 1.1)); d = 88 - 64 * u; sq = 1 - 0.08 * Math.sin(Math.PI * u); } else if (t < 1.25) { var v = p2(MW.span(t, 1.1, 1.25)); d = 24 - 5 * v; nk = 40 * v; }
        else { var b = MW.span(t, 3.25, 3.4); d = 19 + 69 * p2(MW.span(t, 3.4, 4)); nk = 40 * (1 - b); }
        [-1, 1].forEach(function (k) { c.beginPath(); c.ellipse(cx + k * d, cy, 24 / sq, 24 * sq, 0, 0, 2 * Math.PI); c.fill(); });
        if (nk > 0.5) c.fillRect(cx - d, cy - nk / 2, 2 * d, nk);
        MW.txt(c, "A", cx - d, cy + 0.5, 15, "#fff", 900); MW.txt(c, "B", cx + d, cy + 0.5, 15, "#fff", 900);
      });
    },
    options: { label: "text on the merged pill", accent: "", loop: "s (4.4)" }, defaults: { label: "A + B", accent: "#8b7bff", loop: 4.4 },
    notes: "Approach 0.3–1.1 s (power1.in, 8 % squash), a neck at contact, then one pill 86 → 156 wide and 48 → 58 tall on a spring k220 c16; split back 3.0–4.0 s.",
    demo: CV("effectBubbleMerge", 4.4),
  }),

  T("effect/frost-melt", {
    uses: ["drive", "draw", "plot", "noise", "rand", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, e = gsap.parseEase("power1.inOut"), nz = MW.noise(o.seed), r = MW.rand(o.seed + 3), L = 80, Tp = 50, W = 160, H = 100, cx = 160, cy = 100, flakes = [];
      for (var i = 0; i < 16; i++) flakes.push([L + 8 + r() * (W - 16), Tp + 8 + r() * (H - 16), 2.5 + r() * 4, r() * 6.28]);
      var lock = function (x, y, col, open) { c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath(); if (open) c.arc(x - 5, y - 6, 6, Math.PI, 2 * Math.PI); else c.arc(x, y - 6, 6, Math.PI, 2 * Math.PI); c.stroke(); c.fillStyle = col; MW.rr(c, x - 9, y - 6, 18, 14, 3); c.fill(); };
      var mask = function (R, t) { c.beginPath(); for (var k = 0; k <= 64; k++) { var a = k / 64 * 2 * Math.PI, rr = R * (1 + o.rough * nz(a * 1.6 + t * 0.4 + 10)), x = cx + rr * Math.cos(a), y = cy + rr * o.aspect * Math.sin(a); if (!k) c.moveTo(x, y); else c.lineTo(x, y); } c.closePath(); };
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); MW.rr(c, L, Tp, W, H, 12); c.fillStyle = "#151a24"; c.fill(); lock(cx, cy - 6, o.accent, true); MW.txt(c, o.open, cx, cy + 22, 9, "#c9c0ff", 800);
        var R = 112 * (1 - e(MW.span(t, 0.45, 2.1))), back = MW.span(t, 3.3, 3.8);
        c.save(); MW.rr(c, L, Tp, W, H, 12); c.clip(); if (back > 0) { c.globalAlpha = back; c.beginPath(); c.rect(L, Tp, W, H); } else mask(R, t);
        c.save(); c.clip(); c.fillStyle = "#8fa3c2"; c.fillRect(L, Tp, W, H); c.fillStyle = "rgba(255,255,255,0.25)"; c.fillRect(L, Tp, W, H / 2);
        flakes.forEach(function (f) { c.strokeStyle = "rgba(255,255,255,0.75)"; c.lineWidth = 0.8; for (var j = 0; j < 3; j++) { var a = f[3] + j * Math.PI / 3; c.beginPath(); c.moveTo(f[0] - f[2] * Math.cos(a), f[1] - f[2] * Math.sin(a)); c.lineTo(f[0] + f[2] * Math.cos(a), f[1] + f[2] * Math.sin(a)); c.stroke(); } });
        lock(cx, cy - 6, "#4a5a78", false); MW.txt(c, o.locked, cx, cy + 22, 9, "#4a5a78", 800); c.restore();
        if (!back && R > 0.5) { mask(R, t); c.strokeStyle = "rgba(255,255,255,0.7)"; c.lineWidth = 1.5; c.stroke(); } c.restore(); c.globalAlpha = 1;
      });
    },
    options: { rough: "± share of the edge noise (0.16)", aspect: "vertical share of the round mask (0.78)", locked: "", open: "", accent: "", seed: "flakes and edge", loop: "s (4)" },
    defaults: { rough: 0.16, aspect: 0.78, locked: "ĐANG KHOÁ", open: "ĐÃ MỞ KHOÁ", accent: "#8b7bff", seed: 6, loop: 4 },
    notes: "The frost's mask shrinks from radius 112 to 0 over 1.65 s (power1.inOut), so the lock in the middle is the last thing covered; the frost comes back by a fade.",
    demo: CV("effectFrostMelt", 4),
  }),

  T("shape/membrane", {
    uses: ["drive", "draw", "plot", "spring", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), sp = MW.spring(o.k, o.c), x0 = 56, x1 = 264, y0 = 96;
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var D = t < o.release ? o.dip * io(MW.span(t, 0.5, 1)) : o.dip * (1 - sp.at(t - o.release));
        var P = function (x) { var u = (x - 160) / 104; return y0 + D * (1 - u * u) * (1 - 0.25 * u * u); };
        c.beginPath(); c.moveTo(x0, y0); for (var x = x0; x <= x1; x += 2) c.lineTo(x, P(x)); c.lineTo(x1, y0 + 60); c.lineTo(x0, y0 + 60); c.closePath(); c.fillStyle = "rgba(139,123,255,0.14)"; c.fill();
        c.beginPath(); c.moveTo(x0, y0); for (var z = x0; z <= x1; z += 2) c.lineTo(z, P(z)); c.strokeStyle = o.accent; c.lineWidth = 4; c.lineCap = "round"; c.stroke();
        [x0, x1].forEach(function (px) { c.fillStyle = "#3a4466"; MW.rr(c, px - 4, y0 - 4, 8, 64, 3); c.fill(); c.fillStyle = "#e8ebf3"; c.beginPath(); c.arc(px, y0, 4, 0, 2 * Math.PI); c.fill(); });
        var down = MW.span(t, 0.15, 0.5), lift = MW.span(t, o.release, o.release + 0.35), fy = (t < o.release ? 30 + (P(160) - 11 - 30) * io(down) : P(160) - 11 - 50 * lift);
        c.globalAlpha = Math.min(1, down * 3) * (1 - lift); c.fillStyle = "#ffd9c2"; c.beginPath(); c.arc(160, Math.min(fy, P(160) - 11), 11, 0, 2 * Math.PI); c.fill(); c.fillRect(154, Math.min(fy, P(160) - 11) - 40, 12, 40); c.globalAlpha = 1;
      });
    },
    options: { dip: "units (36)", release: "s (1.4)", k: "spring stiffness (180)", c: "damping (5): a strong wobble", accent: "", loop: "s (3.4)" }, defaults: { dip: 36, release: 1.4, k: 180, c: 5, accent: "#8b7bff", loop: 3.4 },
    notes: "Profile depth × (1 − u²)(1 − 0.25 u²) across the span.",
    demo: CV("shapeMembrane", 3.4),
  }),

  T("effect/sand-dissolve", {
    uses: ["drive", "draw", "plot", "rand", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, k = S.k, r = MW.rand(o.seed), cols = 18, rows = 9, g = 7, W = cols * g, H = rows * g, L = 160 - W / 2, Tp = 100 - H / 2, off = document.createElement("canvas"), G = [];
      off.width = Math.ceil(W * k); off.height = Math.ceil(H * k); var x = off.getContext("2d"); x.scale(k, k); x.fillStyle = "#1b2130"; x.beginPath(); x.moveTo(10, 0); x.arcTo(W, 0, W, H, 10); x.arcTo(W, H, 0, H, 10); x.arcTo(0, H, 0, 0, 10); x.arcTo(0, 0, W, 0, 10); x.fill();
      x.fillStyle = "#ffb547"; x.beginPath(); x.arc(20, H / 2, 9, 0, 2 * Math.PI); x.fill(); x.font = "800 10px Inter, sans-serif"; x.fillStyle = "#e8ebf3"; x.textBaseline = "middle"; x.fillText(o.before, 36, H / 2 - 6); x.font = "600 7px Inter, sans-serif"; x.fillStyle = "#8f9ab3"; x.fillText(o.beforeSub, 36, H / 2 + 8);
      for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) G.push({ i: i, j: j, s: 0.5 + 0.06 * i + r() * 0.22, dx: (r() * 2 - 1) * 18, ph: r() * 6.28 });
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); MW.rr(c, L, Tp, W, H, 10); c.fillStyle = "#13261d"; c.fill(); c.fillStyle = "#3ddc84"; c.beginPath(); c.arc(L + 20, 100, 9, 0, 2 * Math.PI); c.fill(); c.strokeStyle = "#0b2a18"; c.lineWidth = 2; c.beginPath(); c.moveTo(L + 15.5, 100.5); c.lineTo(L + 19, 104); c.lineTo(L + 25, 96.5); c.stroke();
        MW.txt(c, o.after, L + 36, 94, 10, "#e8ebf3", 800, "left"); MW.txt(c, o.afterSub, L + 36, 108, 7, "#8f9ab3", 600, "left");
        G.forEach(function (q) { var tau = t - q.s - 0.15, ref = t - 3.3 - 0.02 * q.i, back = Math.max(0, Math.min(1, ref / 0.25)), gx = L + q.i * g, gy = Tp + q.j * g, a = 1, dx = 0, dy = 0, sh = 0;
          if (t > q.s && tau < 0) { dx = 0.6 * Math.sin(70 * t + q.ph); } else if (tau >= 0 && back <= 0) { dy = 300 * tau * tau; dx = q.dx * tau; sh = 1.5 * Math.min(1, tau / 0.6); a = 1 - Math.max(0, Math.min(1, (tau - 0.25) / 0.35)); }
          if (back > 0) { a = back; dx = 0; dy = 0; sh = 0; } if (a <= 0.01) return;
          c.globalAlpha = a; c.drawImage(off, q.i * g * k, q.j * g * k, g * k, g * k, gx + dx + sh / 2, gy + dy + sh / 2, g - sh, g - sh); });
        c.globalAlpha = 1;
      });
    },
    options: { before: "", beforeSub: "", after: "", afterSub: "", seed: "(12)", loop: "s (3.9)" },
    defaults: { before: "Đang chờ duyệt", beforeSub: "Gửi lúc 9:40", after: "Đã duyệt", afterSub: "Sẵn sàng xuất bản", seed: 12, loop: 3.9 },
    notes: "18 × 9 grains of 7 units; column i starts at 0.5 s + 0.06 s × i + up to 0.22 s, trembles 0.15 s, then falls 300 τ² with a sideways drift, shrinking and fading; reforms from 3.3 s.",
    demo: CV("effectSandDissolve", 3.9),
  }),

  T("effect/iridescent-select", {
    uses: ["drive", "draw", "plot", "noise", "spring", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, sp = MW.spring(160, 14), nx = MW.noise(o.seed), L = 88, Tp = 36, W = 144, H = 128, rowY = function (i) { return Tp + 20 + i * 30; }, cols = ["#ff8fb1", "#ffd23d", "#7af0b0", "#3dd6f5", "#a693ff"];
      var bands = function (alpha, t) { c.globalAlpha = alpha; c.lineWidth = 2; for (var k = -30; k < 40; k++) { c.strokeStyle = cols[((k % 5) + 5) % 5]; c.beginPath(); for (var x = L - 10; x <= L + W + 10; x += 6) { var y = Tp + k * 8 + (x - L) * 0.45 - (t / 4.2) * 40 + 5 * Math.sin(x / 18 + t); if (x === L - 10) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); } c.globalAlpha = 1; };
      var blob = function (cx, cy, a, b, t) { c.beginPath(); for (var k = 0; k <= 72; k++) { var th = k / 72 * 2 * Math.PI, cs = Math.cos(th), sn = Math.sin(th), ra = a + 5 * nx(th * 1.3 + t * 0.5), rb = b + 3.5 * nx(th * 1.3 + t * 0.5 + 40), x = cx + ra * Math.sign(cs) * Math.pow(Math.abs(cs), 0.5), y = cy + rb * Math.sign(sn) * Math.pow(Math.abs(sn), 0.5); if (!k) c.moveTo(x, y); else c.lineTo(x, y); } c.closePath(); };
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); MW.rr(c, L, Tp, W, H, 12); c.fillStyle = "#151a24"; c.fill(); c.save(); MW.rr(c, L, Tp, W, H, 12); c.clip(); bands(0.07, t);
        var out = 1 - MW.span(t, 3.55, 3.95), g = t > o.at ? sp.at(t - o.at) : 0, cy = rowY(o.row);
        if (g > 0 && out > 0) { var a = 62 * (0.8 + 0.2 * g), b = 16 * (0.6 + 0.4 * g); c.globalAlpha = out; blob(L + W / 2, cy, a, b, t); c.save(); c.clip(); c.fillStyle = "#1b2130"; c.fillRect(L, cy - 30, W, 60); bands(0.5 * out, t); c.restore(); c.globalAlpha = out; blob(L + W / 2, cy, a, b, t); c.strokeStyle = o.accent; c.lineWidth = 1.5; c.stroke(); c.globalAlpha = 1; }
        o.rows.forEach(function (s, i) { var y = rowY(i); c.fillStyle = "#2a3350"; c.beginPath(); c.arc(L + 18, y, 5, 0, 2 * Math.PI); c.fill(); MW.txt(c, s, L + 30, y + 0.5, 8, i === o.row && g > 0.5 && out > 0.5 ? "#fff" : "#c9d2ea", 700, "left"); });
        c.restore(); var cp = MW.path([[0, 290, 190], [o.at - 0.12, L + 110, rowY(o.row) + 4], [o.at + 0.4, L + 110, rowY(o.row) + 4], [o.at + 1, 292, 172]], t, "power2.inOut"); MW.cursor(c, cp[0], cp[1], Math.abs(t - o.at) < 0.06 ? 0.85 : 1);
      });
    },
    options: { rows: "the list rows", row: "index selected (1)", at: "s (0.55)", accent: "outline", seed: "edge noise", loop: "s (4.2)" },
    defaults: { rows: ["Bản nháp", "Đang dựng", "Đã duyệt", "Lưu trữ"], row: 1, at: 0.55, accent: "#8b7bff", seed: 4, loop: 4.2 },
    notes: "A superellipse (exponent 4) grows on a spring k160 c14 with a slowly drifting edge; five-colour diagonal bands flow inside it at 50 % and over the card at 7 %.",
    demo: CV("effectIridescentSelect", 4.2),
  }),

  T("effect/ferro-badge", {
    uses: ["drive", "draw", "plot", "springs", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), K = MW.springTo(140, 9, [[0, 0], [0.55, 1], [2.85, 0]]), bx = 130, by = 100;
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var mx = 300 - 74 * (io(MW.span(t, 0.3, 1.1)) - io(MW.span(t, 2.7, 3.4))), k = Math.max(0, K(t)), cx = bx + 3 * k;
        if (k > 0.05) { c.save(); c.setLineDash([3, 4]); c.lineDashOffset = -t * 20; c.strokeStyle = "rgba(139,123,255," + (0.5 * Math.min(1, k)).toFixed(3) + ")"; c.lineWidth = 1; [-18, 0, 18].forEach(function (d) { c.beginPath(); c.moveTo(cx + 26, by + d * 0.4); c.quadraticCurveTo((cx + mx) / 2, by + d * 1.6, mx - 18, by + d * 0.9); c.stroke(); }); c.restore(); }
        c.fillStyle = o.accent;
        for (var i = 0; i < 18; i++) { var th = i / 18 * 2 * Math.PI, len = (2 + 34 * Math.pow(Math.max(0, Math.cos(th)), 3)) * k * (1 + 0.08 * Math.sin(t * 14 + i)); if (len < 0.5) continue;
          c.beginPath(); c.moveTo(cx + 22 * Math.cos(th - 0.17), by + 22 * Math.sin(th - 0.17)); c.lineTo(cx + (24 + len) * Math.cos(th), by + (24 + len) * Math.sin(th)); c.lineTo(cx + 22 * Math.cos(th + 0.17), by + 22 * Math.sin(th + 0.17)); c.closePath(); c.fill(); }
        c.beginPath(); c.ellipse(cx, by, 24 * (1 + 0.06 * k), 24 * (1 - 0.04 * k), 0, 0, 2 * Math.PI); c.fill(); MW.txt(c, o.count, cx, by + 0.5, 16, "#fff", 900);
        c.lineWidth = 11; c.lineCap = "butt"; c.strokeStyle = "#c2c8d8"; c.beginPath(); c.arc(mx + 4, by, 16, Math.PI / 2, 3 * Math.PI / 2, true); c.stroke(); c.strokeStyle = "#ff5d8f"; c.beginPath(); c.moveTo(mx - 12, by - 16); c.lineTo(mx - 22, by - 16); c.stroke(); c.strokeStyle = "#3d9bff"; c.beginPath(); c.moveTo(mx - 12, by + 16); c.lineTo(mx - 22, by + 16); c.stroke();
        c.strokeStyle = "#c2c8d8"; c.beginPath(); c.moveTo(mx + 4, by - 16); c.lineTo(mx - 12, by - 16); c.moveTo(mx + 4, by + 16); c.lineTo(mx - 12, by + 16); c.stroke();
      });
    },
    options: { count: "the badge number", accent: "", loop: "s (3.8)" }, defaults: { count: "9", accent: "#8b7bff", loop: 3.8 },
    notes: "Spike length = (2 + 34 × max(0, cos θ)³) × k, θ from the magnet's direction, k on springs k140 c9.",
    demo: CV("effectFerroBadge", 3.8),
  }),

  T("effect/crack", {
    uses: ["drive", "draw", "plot", "rand", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, r = MW.rand(o.seed), p2 = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), L = 70, Tp = 40, W = 180, H = 120, cx = 168, cy = 96, rays = [];
      var edge = function (a) { var dx = Math.cos(a), dy = Math.sin(a), tx = dx > 0 ? (L + W - cx) / dx : (L - cx) / dx, ty = dy > 0 ? (Tp + H - cy) / dy : (Tp - cy) / dy; return Math.min(Math.abs(tx), Math.abs(ty)); };
      for (var i = 0; i < 7; i++) { var a = i / 7 * 2 * Math.PI + (r() * 2 - 1) * 0.25, len = edge(a) * (0.72 + r() * 0.2), pts = [[cx, cy]], x = cx, y = cy, tot = 0;
        for (var s = 0; s < 4; s++) { var h = a + (r() * 2 - 1) * 0.27; x += Math.cos(h) * len / 4; y += Math.sin(h) * len / 4; pts.push([x, y]); }
        var br = null; if (i % 2) { var bh = a + 0.7 * (r() > 0.5 ? 1 : -1), bl = 14 + r() * 10; br = [pts[2], [pts[2][0] + Math.cos(bh) * bl, pts[2][1] + Math.sin(bh) * bl]]; }
        for (var q = 1; q < pts.length; q++) tot += Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]); rays.push({ pts: pts, tot: tot, br: br }); }
      var part = function (pts, upto) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); var d = 0; for (var q = 1; q < pts.length; q++) { var sg = Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1]); if (d + sg >= upto) { var f = (upto - d) / sg; c.lineTo(pts[q - 1][0] + (pts[q][0] - pts[q - 1][0]) * f, pts[q - 1][1] + (pts[q][1] - pts[q - 1][1]) * f); break; } c.lineTo(pts[q][0], pts[q][1]); d += sg; } c.stroke(); };
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var u = t - o.impact, sh = u > 0 ? 3 * Math.exp(-10 * u) * Math.sin(70 * u) : 0; c.save(); c.translate(sh, 0);
        MW.rr(c, L, Tp, W, H, 14); var g = c.createLinearGradient(L, Tp, L + W, Tp + H); g.addColorStop(0, "#1e2742"); g.addColorStop(1, "#141a2c"); c.fillStyle = g; c.fill(); c.strokeStyle = "#2a3350"; c.lineWidth = 1; c.stroke();
        MW.txt(c, o.title, L + 16, Tp + 22, 10, "#c9d2ea", 800, "left"); c.fillStyle = "#2a3350"; MW.rr(c, L + 16, Tp + 36, 90, 5, 2.5); c.fill();
        c.save(); MW.rr(c, L, Tp, W, H, 14); c.clip(); c.strokeStyle = o.accent; c.lineWidth = 1.6; c.lineJoin = "round";
        rays.forEach(function (ry, i) { var dr = p2(Math.max(0, Math.min(1, (u - i * 0.03) / 0.4))), rp = io(Math.max(0, Math.min(1, (t - 2.1 - (6 - i) * 0.03) / 0.42))), q = dr * (1 - rp); if (q <= 0) return; part(ry.pts, ry.tot * q); if (ry.br && q > 0.55) part(ry.br, Math.hypot(ry.br[1][0] - ry.br[0][0], ry.br[1][1] - ry.br[0][1]) * Math.min(1, (q - 0.55) / 0.3)); });
        if (u > 0 && u < 0.4) { var k = u / 0.4; c.strokeStyle = "rgba(233,235,243," + (1 - k).toFixed(3) + ")"; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy, 4 + 26 * p2(k), 0, 2 * Math.PI); c.stroke(); }
        var sw = MW.span(t, 2.85, 3.35); if (sw > 0 && sw < 1) { var sx = L - 40 + (W + 80) * io(sw); c.fillStyle = "rgba(255,255,255,0.16)"; c.beginPath(); c.moveTo(sx, Tp); c.lineTo(sx + 26, Tp); c.lineTo(sx - 14, Tp + H); c.lineTo(sx - 40, Tp + H); c.closePath(); c.fill(); }
        c.restore(); c.restore();
      });
    },
    options: { impact: "s (0.55)", title: "", accent: "crack colour", seed: "the cracks (5)", loop: "s (3.6)" }, defaults: { impact: 0.55, title: "Màn hình khoá", accent: "#a99bff", seed: 5, loop: 3.6 },
    notes: "Seven jagged rays of four segments draw out in 0.4 s, 0.03 s apart, with a branch on every second one; they retract in reverse order 2.1–2.7 s, then a light sweep.",
    demo: CV("effectCrack", 3.6),
  }),

  T("line/neon-sign-draw", {
    uses: C2,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, O = []; for (var k = 0; k <= 40; k++) { var a = -Math.PI / 2 + k / 40 * 2 * Math.PI; O.push([190 + 22 * Math.cos(a), 100 + 30 * Math.sin(a)]); }
      var ST = [[[58, 130], [58, 70], [98, 130], [98, 70]], [[150, 70], [118, 70], [118, 130], [150, 130]], [[118, 100], [144, 100]], O, [[232, 130], [232, 70], [272, 130], [272, 70]]], LN = ST.map(function (s) { var d = 0; for (var i = 1; i < s.length; i++) d += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return d; }), TOT = LN.reduce(function (a, b) { return a + b; }, 0);
      var path = function (s, upto) { c.beginPath(); c.moveTo(s[0][0], s[0][1]); var d = 0, head = s[0]; for (var i = 1; i < s.length; i++) { var sg = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); if (d + sg >= upto) { var f = (upto - d) / sg; head = [s[i - 1][0] + (s[i][0] - s[i - 1][0]) * f, s[i - 1][1] + (s[i][1] - s[i - 1][1]) * f]; c.lineTo(head[0], head[1]); return head; } c.lineTo(s[i][0], s[i][1]); d += sg; head = s[i]; } return head; };
      var FL = [1, 0.35, 1, 0.5, 1];
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); c.strokeStyle = "rgba(255,255,255,0.03)"; c.lineWidth = 1; for (var y = 20; y < 200; y += 14) { c.beginPath(); c.moveTo(0, y); c.lineTo(320, y); c.stroke(); }
        c.lineCap = "round"; c.lineJoin = "round"; ST.forEach(function (s, i) { c.strokeStyle = "#2a2f3d"; c.lineWidth = 6; path(s, LN[i]); c.stroke(); c.strokeStyle = "#3a4054"; c.lineWidth = 2; path(s, LN[i]); c.stroke(); });
        var dist = TOT * Math.max(0, Math.min(1, (t - o.start) / o.draw)), fk = t >= 2.4 && t < 2.65 ? FL[Math.min(4, Math.floor((t - 2.4) / 0.05))] : 1, off = 1 - MW.span(t, 3.55, 3.8);
        c.globalAlpha = fk * off; var left = dist, head = null;
        ST.forEach(function (s, i) { if (left <= 0) return; var d = Math.min(left, LN[i]); c.save(); c.shadowColor = o.accent; c.shadowBlur = 14 * S.k; c.strokeStyle = o.accent; c.lineWidth = 4.5; head = path(s, d); c.stroke(); c.restore(); c.strokeStyle = "rgba(255,255,255,0.7)"; c.lineWidth = 1.2; path(s, d); c.stroke(); left -= LN[i]; });
        if (head && dist < TOT && dist > 0) { c.save(); c.shadowColor = "#fff"; c.shadowBlur = 10 * S.k; c.fillStyle = "#fff"; c.beginPath(); c.arc(head[0], head[1], 3.5, 0, 2 * Math.PI); c.fill(); c.restore(); }
        c.globalAlpha = 1;
      });
    },
    options: { draw: "s at a constant speed (2)", start: "s (0.35)", accent: "neon colour", loop: "s (4)" }, defaults: { draw: 2, start: 0.35, accent: "#ff5dc8", loop: 4 },
    notes: "Two flickers on completion (opacity 1, 0.35, 1, 0.5, 1 in 0.05 s steps), lights off 3.55–3.8 s.",
    demo: CV("lineNeonSignDraw", 4),
  }),

  T("effect/chrome-ripple", {
    uses: C2,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, p2 = gsap.parseEase("power2.out"), L = 46, Tp = 40, W = 228, H = 120, tx = o.point[0], ty = o.point[1];
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); c.save(); MW.rr(c, L, Tp, W, H, 14); c.clip(); var g = c.createLinearGradient(0, Tp, 0, Tp + H); g.addColorStop(0, "#5a6275"); g.addColorStop(0.3, "#d7dce6"); g.addColorStop(0.55, "#4a5162"); g.addColorStop(0.8, "#c3c9d6"); g.addColorStop(1, "#3a4050"); c.fillStyle = g; c.fillRect(L, Tp, W, H);
        MW.txt(c, o.label, 160, 70, 14, "rgba(20,24,34,0.8)", 900);
        var dm = MW.span(t, 0.55, 1.2); if (dm > 0 && dm < 1) { var dg = c.createRadialGradient(tx, ty, 0, tx, ty, 7); dg.addColorStop(0, "rgba(0,0,0," + (0.5 * Math.sin(Math.PI * dm)).toFixed(3) + ")"); dg.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = dg; c.beginPath(); c.arc(tx, ty, 7, 0, 2 * Math.PI); c.fill(); }
        for (var k = 0; k < o.rings; k++) { var u = (t - o.at - k * o.gap) / o.duration; if (u <= 0 || u >= 1) continue; var p = p2(u), R = o.radius * p, a = (1 - p) * (1 - 0.18 * k);
          c.strokeStyle = "rgba(10,12,18," + (0.55 * a).toFixed(3) + ")"; c.lineWidth = 3.5; c.beginPath(); c.arc(tx, ty, R, 0, 2 * Math.PI); c.stroke();
          c.strokeStyle = k === 0 ? o.accent : "rgba(255,255,255," + a.toFixed(3) + ")"; c.globalAlpha = k === 0 ? a : 1; c.lineWidth = k === 0 ? 2.2 : 1.4; c.beginPath(); c.arc(tx, ty, R + 3, 0, 2 * Math.PI); c.stroke(); c.globalAlpha = 1;
          c.strokeStyle = "rgba(255,255,255," + (0.3 * a).toFixed(3) + ")"; c.lineWidth = 0.8; c.beginPath(); c.arc(tx, ty, Math.max(0, R - 3), 0, 2 * Math.PI); c.stroke(); }
        c.restore(); var cp = MW.path([[0, 300, 196], [o.at - 0.12, tx, ty], [o.at + 0.3, tx, ty], [o.at + 0.9, 300, 180]], t, "power2.inOut"); MW.cursor(c, cp[0], cp[1], Math.abs(t - o.at) < 0.06 ? 0.85 : 1);
      });
    },
    options: { at: "s of the tap (0.6)", point: "[x, y] in the 320 frame ([144, 98])", rings: "(4)", gap: "s between rings (0.14)", radius: "units (170)", duration: "s (1.8, power2.out)", label: "", accent: "the first ring", loop: "s (3.2)" },
    defaults: { at: 0.6, point: [144, 98], rings: 4, gap: 0.14, radius: 170, duration: 1.8, label: "CHROME", accent: "#8b7bff", loop: 3.2 },
    demo: CV("effectChromeRipple", 3.2),
  }),

  T("motion/squash-hop", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var p2 = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), sp = MW.spring(o.k, o.c), sh = o.shadow ? el.parentNode.querySelector(o.shadow) : null, half = el.offsetWidth / 2, hh = el.offsetHeight / 2; gsap.set(el, { transformOrigin: "50% 50%" });
      var air = o.air;
      return MW.drive(tl, at, o.hops[o.hops.length - 1] + 0.3 + air + sp.duration, function (t) {
        var y = 0, sx = 1, sy = 1, rot = 0, m = 0;
        o.hops.forEach(function (T0, i) { var u = t - T0, mm = io(Math.max(0, Math.min(1, (u - 0.36) / 0.56))), r = i % 2 ? o.radius + (half - o.radius) * (1 - mm) : o.radius + (half - o.radius) * mm; if (u <= 0) return; m = r; rot = 90 * i + 90 * io(Math.max(0, Math.min(1, (u - 0.3) / air)));
          if (u < 0.3) { sy = 1 - (1 - o.windup) * p2(u / 0.3); sx = 1 / sy; y = 0; } else if (u < 0.3 + air) { var a = (u - 0.3) / air; y = -o.apex * 4 * a * (1 - a); sy = 1 + (o.stretch - 1) * (1 - Math.min(1, a / 0.4)); sx = 1 / sy; }
          else { y = 0; sy = o.land + (1 - o.land) * sp.at(u - 0.3 - air); sx = 1 / sy; } });
        el.style.borderRadius = (m || o.radius).toFixed(1) + "px"; gsap.set(el, { y: y + (1 - sy) * hh, scaleX: sx, scaleY: sy, rotation: rot }); if (sh) { var f = 1 + y / o.apex * 0.5; gsap.set(sh, { scaleX: f }); sh.style.opacity = String(0.4 + 0.6 * f); }
      });
    },
    options: { hops: "s each hop starts (wind-up)", windup: "scaleY (0.72, 0.3 s power2.out)", air: "s in the air (0.66)", apex: "px (310)", stretch: "at take-off (1.14)", land: "scaleY on landing (0.8)", k: "landing spring (320)", c: "damping (11)", radius: "px corner of the square (40)", shadow: "a floor shadow" },
    defaults: { hops: [0.3, 2.4], windup: 0.72, air: 0.66, apex: 310, stretch: 1.14, land: 0.8, k: 320, c: 11, radius: 40, shadow: null },
    notes: "It spins 90° in the air and turns from a square into a circle on the first hop, back on the second.",
    demo: { css: `${BG}\n.fl { position: absolute; left: 400px; right: 400px; top: 860px; height: 4px; border-radius: 2px; background: #262c3a; } .sh { position: absolute; left: 50%; top: 846px; width: 300px; height: 30px; margin-left: -150px; border-radius: 50%; background: rgba(0,0,0,0.55); filter: blur(10px); }
.sq { position: absolute; left: 50%; top: 590px; width: 270px; height: 270px; margin-left: -135px; border-radius: 40px; background: linear-gradient(150deg, #ffb18f, #ff6f61); box-shadow: inset -14px -18px 30px rgba(0,0,0,0.18), inset 14px 14px 26px rgba(255,255,255,0.35); }`,
      html: `<div class="fl"></div><div class="sh"></div><div class="sq"></div>`, run: `MW.motionSquashHop(q(".sq"), tl, 0, { shadow: ".sh" });`, duration: 4.2 },
  }),
];

// Data Storytelling (batch 3.2): charts that tell one point (a flow, a threshold, a forecast, a comparison, a ranking), written here.
// Charts draw on a canvas in a 320 x 200 units (MW.stage320); a few that a film applies to its own elements are DOM. Times are seconds from
// `at`.
import { T } from "../../moworks/define.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 40%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const CV = (name, duration = 4, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
const U = ["drive", "draw", "plot", "stage320"];

export default [
  T("data/sankey", {
    kind: "block", uses: U,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, ex = gsap.parseEase("expo.out"), sp = MW.span;
      var rib = function (y0, y1, ty0, ty1) { c.beginPath(); c.moveTo(70, y0); c.bezierCurveTo(160, y0, 160, ty0, 250, ty0); c.lineTo(250, ty1); c.bezierCurveTo(160, ty1, 160, y1, 70, y1); c.closePath(); };
      return MW.drive(tl, at, 4, function (t) {
        S.clear(); var f = 1 - sp(t, 3.6, 3.95); c.globalAlpha = f;
        var h = 100 * ex(sp(t, 0.2, 0.6)); c.fillStyle = "#c9d2ea"; c.fillRect(60, 100 - h / 2, 10, h);
        var X = 70 + 180 * sp(t, 0.6, 2.2);
        c.save(); c.beginPath(); c.rect(70, 0, X - 70, 200); c.clip();
        rib(50, 110, 30, 90); c.fillStyle = "rgba(139,123,255,0.55)"; c.fill(); rib(110, 150, 120, 160); c.fillStyle = "rgba(61,214,245,0.5)"; c.fill();
        c.setLineDash([2, 9]); c.lineDashOffset = -t * 26; c.strokeStyle = "rgba(255,255,255,0.7)"; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(70, 80); c.bezierCurveTo(160, 80, 160, 60, 250, 60); c.stroke(); c.beginPath(); c.moveTo(70, 130); c.bezierCurveTo(160, 130, 160, 140, 250, 140); c.stroke(); c.setLineDash([]); c.restore();
        var a = 60 * ex(sp(t, 2.05, 2.45)), b = 40 * ex(sp(t, 2.15, 2.55)); c.fillStyle = "#8b7bff"; c.fillRect(250, 60 - a / 2, 10, a); c.fillStyle = "#3dd6f5"; c.fillRect(250, 140 - b / 2, 10, b);
        var lb = sp(t, 2.3, 2.6); c.globalAlpha = f * lb; MW.txt(c, "60", 276, 60, 11, "#e8ebf3", 800); MW.txt(c, "40", 276, 140, 11, "#e8ebf3", 800); c.globalAlpha = f * sp(t, 0.6, 0.9); MW.txt(c, "100", 44, 100, 11, "#e8ebf3", 800);
        c.globalAlpha = f * sp(t, 2.7, 3.0); MW.txt(c, "60 + 40 = 100", 160, 188, 11, "#ffd23d", 800); c.globalAlpha = 1;
      });
    },
    options: {}, defaults: {},
    demo: CV("dataSankey", 4),
  }),

  T("data/odometer-cascade", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = gsap.parseEase("power2.out"), digits = String(o.value).split(""), reels = [];
      el.textContent = ""; el.style.display = "inline-flex"; el.style.fontVariantNumeric = "tabular-nums";
      digits.forEach(function (d, i) {
        var w = document.createElement("span"); w.style.cssText = "display:inline-block;position:relative;overflow:hidden;height:1.2em;border-radius:0.12em;";
        var s = document.createElement("span"); s.style.cssText = "display:block;line-height:1.2em;"; var steps = +d + (o.laps[i] || 1) * 10;
        for (var j = 0; j <= steps; j++) { var e = document.createElement("span"); e.style.display = "block"; e.textContent = String(j % 10); s.appendChild(e); }
        w.appendChild(s); el.appendChild(w); reels.push({ w: w, s: s, steps: steps, stop: o.stops[i] });
      });
      if (o.suffix) { var k = document.createElement("span"); k.textContent = o.suffix; el.appendChild(k); }
      return MW.drive(tl, at, o.stops[o.stops.length - 1] + 0.6, function (t) {
        reels.forEach(function (r) {
          var u = Math.max(0, Math.min(1, (t - o.start) / (r.stop - o.start))), pos = r.steps * out(u), d = t - r.stop, sp = u > 0 && u < 1 ? r.steps * 2 * (1 - u) / (r.stop - o.start) : 0;
          if (d > 0) pos = r.steps + 0.2 * Math.sin(20 * d) * Math.exp(-10 * d);
          gsap.set(r.s, { y: -pos * 1.2 + "em" }); r.w.style.filter = sp > 6 ? "blur(" + Math.min(6, sp / 6) + "px)" : "";
          var g = d > 0 && d < 0.35 ? 1 - d / 0.35 : 0; r.w.style.boxShadow = g ? "0 0 0 " + (4 * (1 - g) + 2) + "px rgba(139,123,255," + g + ")" : "none";
        });
      });
    },
    options: { value: "digits (128)", suffix: "fixed text after (K)", laps: "extra turns per digit, left to right ([1, 2, 3])", start: "s (0.35)", stops: "s each digit stops ([1.25, 1.75, 2.25])" },
    defaults: { value: "128", suffix: "K", laps: [1, 2, 3], start: 0.35, stops: [1.25, 1.75, 2.25] },
    demo: { css: `${BG}\n.oc { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; } .oc-n { font-size: 300px; font-weight: 900; } .oc p { margin: 10px 0 0; font-size: 50px; color: #9aa3b8; }`,
      html: `<div class="gm oc"><div><div class="oc-n">128K</div><p>người theo dõi</p></div></div>`, run: `MW.dataOdometerCascade(q(".oc-n"), tl, 0, {});`, duration: 3 },
  }),

  T("data/threshold-alert", {
    kind: "block", uses: U,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, sp = MW.span, out = gsap.parseEase("power2.out"), bk = gsap.parseEase("back.out"), V = o.values, P = V.map(function (v, i) { return [40 + i * 40, 170 - v * 1.4]; }), ty = 170 - o.threshold * 1.4;
      var cx = 0; for (var i = 1; i < P.length; i++) if (V[i - 1] < o.threshold && V[i] >= o.threshold) { var u = (o.threshold - V[i - 1]) / (V[i] - V[i - 1]); cx = P[i - 1][0] + (P[i][0] - P[i - 1][0]) * u; break; }
      var tc = 0.3 + 2.1 * (cx - P[0][0]) / (P[P.length - 1][0] - P[0][0]);
      return MW.drive(tl, at, 4, function (t) {
        S.clear(); var f = 1 - sp(t, 3.6, 3.95); c.globalAlpha = f; c.strokeStyle = "#262c3a"; c.lineWidth = 1; for (var g = 0; g < 5; g++) { c.beginPath(); c.moveTo(30, 30 + g * 35); c.lineTo(290, 30 + g * 35); c.stroke(); }
        c.setLineDash([5, 4]); c.strokeStyle = "#ffd23d"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(30, ty); c.lineTo(290, ty); c.stroke(); c.setLineDash([]); MW.txt(c, "Ngưỡng " + o.threshold, 286, ty - 7, 7.5, "#ffd23d", 700, "right");
        var X = P[0][0] + (P[P.length - 1][0] - P[0][0]) * sp(t, 0.3, 2.4); c.lineWidth = 2.5; c.lineJoin = "round";
        c.save(); c.beginPath(); c.rect(0, 0, cx, 200); c.clip(); c.strokeStyle = "#8b7bff"; MW.polyToX(c, P, X); c.stroke(); c.restore();
        c.save(); c.beginPath(); c.rect(cx, 0, 320, 200); c.clip(); c.strokeStyle = "#ff5d6c"; var h = MW.polyToX(c, P, X); c.stroke(); c.restore();
        if (t > 0.3) { c.fillStyle = "#fff"; c.beginPath(); c.arc(h[0], h[1], 3.5, 0, 2 * Math.PI); c.fill(); MW.txt(c, String(Math.round((170 - h[1]) / 1.4)), h[0], h[1] - 10, 8, "#e8ebf3", 800); }
        var d = t - tc; if (d > 0) { c.fillStyle = "#ff5d6c"; c.beginPath(); c.arc(cx, ty, 4.5 * bk(Math.min(1, d / 0.3)), 0, 2 * Math.PI); c.fill();
          for (var r = 0; r < 3; r++) { var u2 = (d - 0.28 * r) / 1; if (u2 < 0 || u2 > 1) continue; c.globalAlpha = f * (1 - u2); c.strokeStyle = "#ff5d6c"; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, ty, 5 + 34 * out(u2), 0, 2 * Math.PI); c.stroke(); }
          c.globalAlpha = f * sp(d, 0.15, 0.4); MW.rr(c, cx - 30, ty - 34, 60, 16, 8); c.fillStyle = "#ff5d6c"; c.fill(); MW.txt(c, "VƯỢT NGƯỠNG", cx, ty - 25.5, 7, "#fff", 900); }
        c.globalAlpha = 1;
      });
    },
    options: { values: "the 7 points", threshold: "(60)" }, defaults: { values: [30, 42, 38, 52, 66, 74, 70], threshold: 60 },
    demo: CV("dataThresholdAlert", 4),
  }),

  T("data/forecast-band", {
    kind: "block", uses: U,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, sp = MW.span, io = gsap.parseEase("power2.inOut"), out = gsap.parseEase("power2.out"), A = [[30, 140], [70, 120], [110, 128], [150, 100], [180, 92]], F = [[180, 92], [220, 80], [260, 66], [290, 56]];
      return MW.drive(tl, at, 4, function (t) {
        S.clear(); var f = 1 - sp(t, 3.6, 3.95); c.globalAlpha = f; c.strokeStyle = "#262c3a"; c.lineWidth = 1; [40, 80, 120, 160].forEach(function (y) { c.beginPath(); c.moveTo(24, y); c.lineTo(296, y); c.stroke(); });
        var fx = 180 + 110 * out(sp(t, 1.5, 2.8));
        if (t > 1.5) { [1, 0.72, 0.46, 0.22].forEach(function (w) { c.fillStyle = "rgba(255,210,61,0.11)"; c.beginPath(); var x, n = 24; for (x = 0; x <= n; x++) { var xx = 180 + (fx - 180) * x / n, hw = 34 * w * (xx - 180) / 110; if (x === 0) c.moveTo(xx, MW.yAt(F, xx) - hw); else c.lineTo(xx, MW.yAt(F, xx) - hw); } for (x = n; x >= 0; x--) { var x2 = 180 + (fx - 180) * x / n, h2 = 34 * w * (x2 - 180) / 110; c.lineTo(x2, MW.yAt(F, x2) + h2); } c.closePath(); c.fill(); });
          c.setLineDash([5, 4]); c.strokeStyle = "#ffd23d"; c.lineWidth = 2; MW.polyToX(c, F, fx); c.stroke(); c.setLineDash([]); }
        c.strokeStyle = "#8b7bff"; c.lineWidth = 2.5; var h = MW.polyToX(c, A, 30 + 150 * io(sp(t, 0.3, 1.3))); c.stroke(); if (t > 1.3) { c.fillStyle = "#fff"; c.beginPath(); c.arc(180, 92, 3.5, 0, 2 * Math.PI); c.fill(); }
        c.globalAlpha = f * sp(t, 1.2, 1.5); c.strokeStyle = "#4a5478"; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(180, 24); c.lineTo(180, 176); c.stroke(); c.setLineDash([]); MW.txt(c, "Hôm nay", 180, 18, 8, "#c9d2ea", 800); MW.txt(c, "Thực tế", 100, 182, 8, "#8b7bff", 700); MW.txt(c, "Dự báo", 240, 182, 8, "#ffd23d", 700);
        c.globalAlpha = f * sp(t, 2.6, 2.9); c.strokeStyle = "#ffd23d"; c.lineWidth = 1; c.beginPath(); c.moveTo(298, 22); c.lineTo(298, 90); c.stroke(); MW.txt(c, "±34", 306, 56, 7, "#ffd23d", 700); c.globalAlpha = 1; void h;
      });
    },
    options: {}, defaults: {},
    demo: CV("dataForecastBand", 4),
  }),

  T("map/signal-pulse", {
    kind: "block", uses: U,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, sp = MW.span, out = gsap.parseEase("power2.out"), bk = gsap.parseEase("back.out"), P = o.places;
      return MW.drive(tl, at, 4, function (t) {
        S.clear(); var f = 1 - sp(t, 3.6, 3.9); c.globalAlpha = f;
        c.fillStyle = "#1b2233"; [[60, 40, 70, 34], [150, 60, 90, 40], [90, 110, 120, 34], [220, 120, 60, 30]].forEach(function (b) { c.beginPath(); c.ellipse(b[0] + b[2] / 2, b[1] + b[3] / 2, b[2] / 2, b[3] / 2, 0, 0, 2 * Math.PI); c.fill(); });
        c.fillStyle = "#2a3350"; for (var gx = 30; gx < 300; gx += 10) for (var gy = 30; gy < 160; gy += 10) { c.fillRect(gx, gy, 1, 1); }
        P.forEach(function (p, i) { var d = t - (0.4 + 0.4 * i); if (d < 0) return; c.fillStyle = "#8b7bff"; c.beginPath(); c.arc(p[0], p[1], 4 * bk(Math.min(1, d / 0.3)), 0, 2 * Math.PI); c.fill();
          [0, 0.22].forEach(function (lag) { var u = (d - lag) / 0.9; if (u < 0 || u > 1) return; c.globalAlpha = f * 0.9 * (1 - u); c.strokeStyle = "#a99bff"; c.lineWidth = 1.2; c.beginPath(); c.arc(p[0], p[1], 4 + 26 * out(u), 0, 2 * Math.PI); c.stroke(); c.globalAlpha = f; });
          MW.txt(c, p[2], p[0], p[1] + 12, 7, "#c9d2ea", 700); });
        c.strokeStyle = "#2a3350"; c.lineWidth = 2; c.beginPath(); c.moveTo(60, 178); c.lineTo(260, 178); c.stroke();
        P.forEach(function (p, i) { var x = 60 + 50 * i; c.fillStyle = t >= 0.4 + 0.4 * i ? "#8b7bff" : "#2a3350"; c.beginPath(); c.arc(x, 178, 3.5, 0, 2 * Math.PI); c.fill(); }); c.globalAlpha = 1;
      });
    },
    options: { places: "[[x, y, name], ...] in 320 units (5)" }, defaults: { places: [[96, 56, "Hà Nội"], [196, 74, "Huế"], [130, 124, "Đà Nẵng"], [248, 136, "Nha Trang"], [168, 150, "Cần Thơ"]] },
    demo: CV("mapSignalPulse", 4),
  }),

  T("data/delta-compare", {
    kind: "block", uses: U,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, sp = MW.span, ex = gsap.parseEase("expo.out"), out = gsap.parseEase("power2.out"), bk = gsap.parseEase("back.out"), pin = gsap.parseEase("power2.in"), base = 170, k = 2;
      return MW.drive(tl, at, 4, function (t) {
        S.clear(); var f = 1 - pin(sp(t, 3.5, 3.85)); c.globalAlpha = f; c.strokeStyle = "#3a4466"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(70, base); c.lineTo(250, base); c.stroke();
        var a = o.a * ex(sp(t, 0.3, 1.1)), b = o.b * ex(sp(t, 0.4, 1.2)), da = o.b - o.a;
        c.fillStyle = "#3a4466"; c.fillRect(100, base - a * k, 40, a * k); MW.txt(c, String(Math.round(a)), 120, base - a * k - 8, 9, "#c9d2ea", 800); MW.txt(c, o.labels[0], 120, base + 10, 8, "#8f9ab3", 700);
        var acc = sp(t, 1.7, 2.0); c.fillStyle = "#4a5478"; c.fillRect(180, base - b * k, 40, b * k); c.fillStyle = gsap.utils.interpolate("#4a5478", "#8b7bff", acc); c.fillRect(180, base - b * k, 40, Math.min(b, da) * k * (b / o.b));
        MW.txt(c, String(Math.round(b)), 200, base - b * k - 8, 9, "#e8ebf3", 800); MW.txt(c, o.labels[1], 200, base + 10, 8, "#8f9ab3", 700);
        var g = out(sp(t, 1.4, 1.8)); c.setLineDash([3, 3]); c.strokeStyle = "#8f9ab3"; c.lineWidth = 1; c.beginPath(); c.moveTo(140, base - o.a * k); c.lineTo(140 + 40 * g, base - o.a * k); c.stroke(); c.setLineDash([]);
        var br = out(sp(t, 1.8, 2.15)); if (br > 0) { c.strokeStyle = "#a99bff"; c.lineWidth = 1.5; var y0 = base - o.a * k, y1 = y0 - da * k * br; c.beginPath(); c.moveTo(226, y0); c.lineTo(230, y0); c.lineTo(230, y1); c.lineTo(226, y1); c.stroke(); }
        var p = sp(t, 2.1, 2.45); if (p > 0) { c.save(); c.translate(256, base - (o.a + da / 2) * k); c.scale(bk(p), bk(p)); MW.txt(c, "+" + da, 0, 0, 14, "#a99bff", 900); c.restore(); } c.globalAlpha = 1;
      });
    },
    options: { a: "(40)", b: "(64)", labels: "bar labels" }, defaults: { a: 40, b: 64, labels: ["Năm ngoái", "Năm nay"] },
    demo: CV("dataDeltaCompare", 4),
  }),

  T("data/timeline-scrub", {
    kind: "block", uses: U,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, sp = MW.span, io = gsap.parseEase("power2.inOut"), P = [[40, 120], [100, 90], [160, 104], [220, 64], [280, 76]], V = [42, 58, 50, 74, 68];
      return MW.drive(tl, at, 4, function (t) {
        S.clear(); var x = MW.path([[0, 40, 0], [0.65, 40, 0], [1.55, 160, 0], [1.85, 160, 0], [2.75, 280, 0], [3.45, 280, 0], [3.95, 40, 0]], t, "none")[0];
        if (t > 3.45) x = 280 - 240 * io(sp(t, 3.45, 3.95));
        c.strokeStyle = "#2a3142"; c.lineWidth = 2; MW.polyToX(c, P, 280); c.stroke();
        c.strokeStyle = "#8b7bff"; c.lineWidth = 3.5; c.lineJoin = "round"; var h = MW.polyToX(c, P, x); c.stroke();
        c.fillStyle = "#fff"; c.beginPath(); c.arc(h[0], h[1], 4, 0, 2 * Math.PI); c.fill();
        var i = Math.min(3, Math.floor((x - 40) / 60)), u = (x - 40 - i * 60) / 60, v = Math.round(V[i] + (V[i + 1] - V[i]) * u); MW.rr(c, h[0] - 16, h[1] - 26, 32, 16, 8); c.fillStyle = "#8b7bff"; c.fill(); MW.txt(c, String(v), h[0], h[1] - 17.5, 8, "#fff", 900);
        c.setLineDash([2, 3]); c.strokeStyle = "#4a5478"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, h[1] + 6); c.lineTo(x, 160); c.stroke(); c.setLineDash([]);
        MW.rr(c, 40, 160, 240, 6, 3); c.fillStyle = "#222a42"; c.fill(); MW.rr(c, 40, 160, x - 40, 6, 3); c.fillStyle = "#4a3f7a"; c.fill(); c.fillStyle = "#e8ebf3"; c.beginPath(); c.arc(x, 163, 6, 0, 2 * Math.PI); c.fill();
        ["T1", "T2", "T3", "T4", "T5"].forEach(function (m, k) { MW.txt(c, m, 40 + 60 * k, 180, 7, "#6c778b", 700); }); MW.cursor(c, x + 2, 166, 1);
      });
    },
    options: {}, defaults: {},
    demo: CV("dataTimelineScrub", 4),
  }),

  T("data/network-bloom", {
    kind: "block", uses: U,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, out = gsap.parseEase("power2.out"), bk = gsap.parseEase("back.out"), pin = gsap.parseEase("power2.in"), N = [[160, 40, "B"], [236, 78, "C"], [214, 156, "D"], [106, 156, "E"], [84, 78, "F"]];
      return MW.drive(tl, at, 4, function (t) {
        S.clear();
        N.forEach(function (n, i) {
          var s0 = 0.3 + 0.28 * i, g = out(MW.span(t, s0, s0 + 0.32)), ret = pin(MW.span(t, 3.4 + 0.05 * (N.length - 1 - i), 3.7 + 0.05 * (N.length - 1 - i))), L = g * (1 - ret), dx = n[0] - 160, dy = n[1] - 100, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
          if (L <= 0) return; var x0 = 160 + ux * 18, y0 = 100 + uy * 18, x1 = x0 + (d - 31) * L * ux, y1 = y0 + (d - 31) * L * uy;
          c.strokeStyle = "#4a5478"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); if (g < 1) { c.fillStyle = "#8b7bff"; c.beginPath(); c.arc(x1, y1, 2.5, 0, 2 * Math.PI); c.fill(); }
          var p = t - s0 - 0.32; if (p > 0) { var s = bk(Math.min(1, p / 0.3)) * (1 - ret); c.fillStyle = "#1b2130"; c.beginPath(); c.arc(n[0], n[1], 13 * s, 0, 2 * Math.PI); c.fill(); c.strokeStyle = "#3a4466"; c.stroke(); if (s > 0.5) MW.txt(c, n[2], n[0], n[1] + 0.5, 10 * s, "#e8ebf3", 900);
            if (p < 0.6) { c.globalAlpha = 1 - p / 0.6; c.strokeStyle = "#8b7bff"; c.beginPath(); c.arc(n[0], n[1], 13 + 12 * out(p / 0.6), 0, 2 * Math.PI); c.stroke(); c.globalAlpha = 1; } }
        });
        c.fillStyle = "#8b7bff"; c.beginPath(); c.arc(160, 100, 18, 0, 2 * Math.PI); c.fill(); MW.txt(c, "A", 160, 100.5, 14, "#fff", 900);
      });
    },
    options: {}, defaults: {},
    demo: CV("dataNetworkBloom", 4),
  }),

  T("data/milestone-progress", {
    kind: "block", uses: U.concat(["rand"]),
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), out = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in"), r = MW.rand(o.seed), drift = []; for (var i = 0; i < 8; i++) drift.push((r() * 2 - 1) * 5);
      var X0 = 50, W = 220, fill = function (t) { return o.value / 100 * io(MW.span(t, 0.4, 2.4)) * (1 - pin(MW.span(t, 3.5, 3.9))); };
      return MW.drive(tl, at, 4, function (t) {
        S.clear(); var v = fill(t), x = X0 + W * v;
        MW.rr(c, X0, 96, W, 8, 4); c.fillStyle = "#222a42"; c.fill(); MW.rr(c, X0, 96, Math.max(0.1, W * v), 8, 4); c.fillStyle = "#8b7bff"; c.fill();
        [0, 25, 50, 75, 100].forEach(function (m) { var mx = X0 + W * m / 100; c.fillStyle = v * 100 >= m - 0.01 && t > 0.4 ? "#8b7bff" : "#2a3142"; c.beginPath(); c.arc(mx, 100, 6, 0, 2 * Math.PI); c.fill(); MW.txt(c, m + "%", mx, 120, 7, "#6c778b", 700); });
        for (var k = 1; k <= 8; k++) { var vv = fill(t - 0.07 * k); if (vv >= v - 0.0001 || t > 3.5) continue; c.globalAlpha = 1 - k / 9; c.fillStyle = "#ffd23d"; c.beginPath(); c.arc(X0 + W * vv, 100 + drift[k - 1] * k / 8, 2.4 * (1 - k / 10), 0, 2 * Math.PI); c.fill(); } c.globalAlpha = 1;
        if (t > 0.4) { c.save(); c.shadowColor = "#8b7bff"; c.shadowBlur = 14; c.fillStyle = "#8b7bff"; c.beginPath(); c.arc(x, 100, 7, 0, 2 * Math.PI); c.fill(); c.restore(); c.fillStyle = "#151a28"; c.beginPath(); c.arc(x, 100, 3, 0, 2 * Math.PI); c.fill();
          MW.rr(c, x - 16, 70, 32, 16, 8); c.fillStyle = "#222a42"; c.fill(); MW.txt(c, Math.round(v * 100) + "%", x, 78.5, 8, "#e8ebf3", 900); }
        var d = t - 2.4; if (d > 0 && d < 0.7) { c.globalAlpha = 1 - d / 0.7; c.strokeStyle = "#a99bff"; c.lineWidth = 1.5; c.beginPath(); c.arc(x, 100, 8 + 26 * out(d / 0.7), 0, 2 * Math.PI); c.stroke(); c.globalAlpha = 1; }
        MW.txt(c, "Tiến độ dự án", 160, 50, 11, "#e8ebf3", 800);
      });
    },
    options: { value: "% (75)", seed: "spark drift" }, defaults: { value: 75, seed: 3 },
    demo: CV("dataMilestoneProgress", 4),
  }),

  T("data/heatmap-ripple", {
    kind: "block", uses: U.concat(["rand", "spring"]),
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, r = MW.rand(o.seed), sp = MW.spring(260, 18), V = [];
      for (var i = 0; i < 40; i++) V.push(0.15 + 0.85 * r());
      var fx = o.focus[0], fy = o.focus[1], x0 = 55, y0 = 40;
      return MW.drive(tl, at, 3.6, function (t) {
        S.clear();
        for (var j = 0; j < 5; j++) for (var i2 = 0; i2 < 8; i2++) {
          var d = Math.max(Math.abs(i2 - fx), Math.abs(j - fy)), s = 1, ol = 0;
          if (d === 0) { s = t >= 0.95 ? 1 + 0.18 * sp.at(t - 0.95) : 1; ol = t >= 0.95 ? 1 : 0; }
          else { var u = (t - 1.05 - 0.12 * d) / 0.45; if (u > 0 && u < 1) { s = 1 + 0.14 * Math.sin(Math.PI * u); ol = 1 - u; } }
          var cx = x0 + 30 * i2, cy = y0 + 30 * j; c.save(); c.translate(cx, cy); c.scale(s, s); MW.rr(c, -13, -13, 26, 26, 4); c.fillStyle = "rgba(139,123,255," + V[j * 8 + i2] + ")"; c.fill();
          if (ol > 0) { c.strokeStyle = "rgba(233,235,243," + ol + ")"; c.lineWidth = d === 0 ? 2 : 1; c.stroke(); } c.restore();
        }
        var tg = MW.span(t, 1.1, 1.35); if (tg > 0) { var tx = x0 + 30 * fx, ty = y0 + 30 * fy - 26; c.globalAlpha = tg; MW.rr(c, tx - 20, ty - 9, 40, 18, 9); c.fillStyle = "#e8ebf3"; c.fill(); MW.txt(c, Math.round(V[fy * 8 + fx] * 100) + "", tx, ty + 0.5, 9, "#151a28", 900); c.globalAlpha = 1; }
        var cp = MW.path([[0, 280, 190], [0.3, 280, 190], [0.9, x0 + 30 * fx + 4, y0 + 30 * fy + 4]], t); MW.cursor(c, cp[0], cp[1], t > 0.95 && t < 1.05 ? 0.9 : 1);
      });
    },
    options: { focus: "[col, row] clicked ([5, 2])", seed: "values" }, defaults: { focus: [5, 2], seed: 9 },
    demo: CV("dataHeatmapRipple", 3.6),
  }),

  T("data/stream-graph", {
    kind: "block", uses: U,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut");
      var phase = function (t) { return io(MW.span(t, 0.4, 1.8)) * (1 - io(MW.span(t, 2.6, 4.0))); };
      return MW.drive(tl, at, 4, function (t) {
        S.clear(); var p = phase(t), n = 60, top = [], mid = [], bot = [];
        for (var i = 0; i <= n; i++) {
          var x = 20 + 280 * i / n, s = 0.5 + 0.5 * Math.sin(i / n * 2 * Math.PI * 1.1 + 0.6), s2 = 0.5 + 0.5 * Math.sin(i / n * 2 * Math.PI * 0.9 + 2.1), cy = 100 + 8 * (p - 0.5) * Math.sin(i / n * Math.PI * 2);
          var A = (4 + 24 * s) * (1 - p) + (20 + 20 * s) * p, B = (18 + 20 * s2) * (1 - p) + (6 + 16 * s2) * p; top.push([x, cy - A]); mid.push([x, cy]); bot.push([x, cy + B]);
        }
        var band = function (a, b, col) { c.beginPath(); c.moveTo(a[0][0], a[0][1]); a.forEach(function (q) { c.lineTo(q[0], q[1]); }); for (var k = b.length - 1; k >= 0; k--) c.lineTo(b[k][0], b[k][1]); c.closePath(); c.fillStyle = col; c.fill(); };
        band(top, mid, "rgba(139,123,255,0.85)"); band(mid, bot, "rgba(61,214,245,0.8)");
        c.strokeStyle = "#141826"; c.lineWidth = 1.5; c.beginPath(); mid.forEach(function (q, k) { if (k) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); }); c.stroke();
        var ri = Math.round(0.71 * n), ta = mid[ri][1] - top[ri][1], tb = bot[ri][1] - mid[ri][1], pa = Math.round(100 * ta / (ta + tb)), rx = top[ri][0];
        c.fillStyle = "#fff"; [top[ri], bot[ri]].forEach(function (q) { c.beginPath(); c.arc(q[0], q[1], 2.5, 0, 2 * Math.PI); c.fill(); });
        MW.txt(c, "A " + pa + "%", rx, top[ri][1] - 10, 9, "#a99bff", 900); MW.txt(c, "B " + (100 - pa) + "%", rx, bot[ri][1] + 11, 9, "#3dd6f5", 900);
      });
    },
    options: {}, defaults: {},
    demo: CV("dataStreamGraph", 4),
  }),

  T("data/rank-overtake", {
    kind: "block", uses: U.concat(["spring"]),
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, out = gsap.parseEase("power2.out"), R = [["Nhóm A", 84, 0, 200, 0.1], ["Nhóm B", 78, 1, 210, 0.16], ["Nhóm C", 71, 2, 220, 0]], to = { 0: 1, 1: 2, 2: 0 };
      return MW.drive(tl, at, 3.2, function (t) {
        S.clear(); var cs = 71 + 19 * out(MW.span(t, 0.35, 0.85));
        R.forEach(function (r, i) { var y0 = 60 + 40 * r[2], y1 = 60 + 40 * to[i], k = t >= 1.1 + r[4] ? MW.spring(r[3], 24).at(t - 1.1 - r[4]) : 0, y = y0 + (y1 - y0) * k, isC = i === 2, side = isC ? 26 * Math.sin(Math.PI * Math.min(1, Math.max(0, k))) : 0, s = isC ? 1 + 0.04 * Math.sin(Math.PI * Math.min(1, Math.max(0, k))) : 1;
          if (isC && k > 0 && k < 1.05) { c.globalAlpha = Math.sin(Math.PI * Math.min(1, k)) * 0.8; c.setLineDash([3, 3]); c.strokeStyle = "#4a5478"; MW.rr(c, 62, y0 - 15, 196, 30, 7); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; }
          c.save(); c.translate(160 + side, y); c.scale(s, s); MW.rr(c, -98, -15, 196, 30, 7); c.fillStyle = isC ? "#2a2550" : "#1b2130"; c.fill(); c.strokeStyle = isC ? "#8b7bff" : "#2a3350"; c.lineWidth = 1; c.stroke();
          var sc = isC ? cs : r[1], rank = Math.round(r[2] + (to[i] - r[2]) * Math.min(1, Math.max(0, k))) + 1; MW.txt(c, "#" + rank, -84, 0.5, 9, "#8f9ab3", 900); MW.txt(c, r[0], -62, 0.5, 9, "#e8ebf3", 800, "left");
          c.fillStyle = isC ? "#8b7bff" : "#4a5478"; MW.rr(c, 0, -3, sc * 1.0, 6, 3); c.fill(); MW.txt(c, String(Math.round(sc)), 92, 0.5, 9, "#e8ebf3", 900, "right");
          var dl = MW.span(t, 1.8, 2.1); if (dl > 0) { c.globalAlpha = dl; MW.txt(c, isC ? "▲2" : "▼1", 112, 0.5, 8, isC ? "#3ddc84" : "#ff5d6c", 900, "left"); c.globalAlpha = 1; } c.restore(); });
      });
    },
    options: {}, defaults: {},
    demo: CV("dataRankOvertake", 3.2),
  }),

  T("data/dot-merge", {
    kind: "block", uses: U,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), D = [];
      for (var i = 0; i < 9; i++) D.push({ x: 60 + 16 * (i % 3), y: 84 + 16 * Math.floor(i / 3), g: 0 });
      [[0, 0], [16, 0], [-16, 0], [8, 14], [-8, 14], [8, -14], [-8, -14]].forEach(function (q) { D.push({ x: 244 + q[0], y: 100 + q[1], g: 1 }); });
      D.forEach(function (d, j) { var r = 8 * Math.sqrt(j + 0.5), a = j * 137.5 * Math.PI / 180; d.tx = 160 + r * Math.cos(a); d.ty = 100 + r * Math.sin(a); });
      return MW.drive(tl, at, 3.2, function (t) {
        S.clear();
        D.forEach(function (d, j) { var u = io(MW.span(t, 0.9 + 0.045 * j, 1.65 + 0.045 * j)), x = d.x + (d.tx - d.x) * u, y = d.y + (d.ty - d.y) * u + (d.g ? 14 : -14) * Math.sin(Math.PI * u); c.fillStyle = d.g ? "#3dd6f5" : "#8b7bff"; c.beginPath(); c.arc(x, y, 5, 0, 2 * Math.PI); c.fill(); });
        var a = 1 - MW.span(t, 0.7, 1.0); c.globalAlpha = a; MW.txt(c, "A  9", 76, 60, 11, "#a99bff", 900); MW.txt(c, "B  7", 244, 70, 11, "#3dd6f5", 900);
        var b = MW.span(t, 2.0, 2.3); c.globalAlpha = b; c.strokeStyle = "#4a5478"; c.lineWidth = 1.2; c.beginPath(); c.arc(160, 100, 42, 0, 2 * Math.PI); c.stroke(); MW.txt(c, "9 + 7 = 16", 160, 160, 12, "#e8ebf3", 900); c.globalAlpha = 1;
      });
    },
    options: {}, defaults: {},
    demo: CV("dataDotMerge", 3.2),
  }),

  T("flow/step-domino", {
    kind: "block", uses: U,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, bk = gsap.parseEase("back.out"), out = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in"), n = o.steps.length, x0 = 160 - 70 * (n - 1) / 2;
      return MW.drive(tl, at, o.exitAt + 0.5, function (t) {
        S.clear(); c.strokeStyle = "#3a4466"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(40, 130); c.lineTo(280, 130); c.stroke();
        for (var i = 0; i < n; i++) {
          var s0 = 0.35 + 0.62 * i, d = t - s0, fold = pin(MW.span(t, o.exitAt + 0.05 * (n - 1 - i), o.exitAt + 0.05 * (n - 1 - i) + 0.3)), sy = d < 0 ? 0 : (0.08 + 0.92 * bk(Math.min(1, d / 0.32))) * (1 - fold), x = x0 + 70 * i;
          if (sy > 0.01) { c.save(); c.translate(x, 130); c.scale(1, sy); MW.rr(c, -25, -56, 50, 56, 7); c.fillStyle = d < 0.4 ? "#8b7bff" : "#1b2130"; c.fill(); c.strokeStyle = "#3a4466"; c.lineWidth = 1; c.stroke(); c.restore();
            if (sy > 0.6) MW.txt(c, o.steps[i], x, 102, 8, "#e8ebf3", 800); MW.txt(c, String(i + 1), x, 86 + 56 * (1 - sy), 12, d < 0.4 ? "#fff" : "#8f9ab3", 900); }
          if (d > 0.4 && fold < 1) { var g = bk(Math.min(1, (d - 0.4) / 0.22)) * (1 - fold); c.fillStyle = "#3ddc84"; c.beginPath(); c.arc(x + 22, 76, 7 * g, 0, 2 * Math.PI); c.fill(); if (g > 0.5) { c.strokeStyle = "#0b2a17"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x + 19, 76); c.lineTo(x + 21.5, 78.5); c.lineTo(x + 25.5, 73.5); c.stroke(); } }
          if (i < n - 1 && d > 0.42 && fold < 1) { var a = out(MW.span(d, 0.42, 0.58)) * (1 - fold); c.strokeStyle = "#8f9ab3"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x + 28, 104); c.lineTo(x + 28 + 14 * a, 104); c.stroke(); if (a > 0.9) { c.beginPath(); c.moveTo(x + 38, 100); c.lineTo(x + 42, 104); c.lineTo(x + 38, 108); c.stroke(); } }
        }
      });
    },
    options: { steps: "the step labels (4)", exitAt: "s the boxes fold down in reverse (3.4)" }, defaults: { steps: ["Ý tưởng", "Kịch bản", "Dựng", "Xuất"], exitAt: 3.4 },
    demo: CV("flowStepDomino", 4),
  }),

  T("effect/spotlight-relay", {
    kind: "block", uses: U.concat(["springs"]),
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, X = [70.4, 160, 249.6], pos = MW.springTo(170, 24, [[0, X[0]], [1.35, X[1]], [2.45, X[2]], [3.6, X[0]]]), K = o.cards;
      return MW.drive(tl, at, 3.8, function (t) {
        S.clear(); var on = MW.span(t, 0.2, 0.45) * (1 - MW.span(t, 3.35, 3.6)), x = pos(t);
        K.forEach(function (k, i) { var lit = Math.max(0, 1 - Math.abs(x - X[i]) / 56) * on; c.globalAlpha = 0.45 + 0.55 * lit; MW.rr(c, X[i] - 37, 92, 74, 58, 8); c.fillStyle = "#1b2130"; c.fill(); c.strokeStyle = lit > 0.5 ? "#8b7bff" : "#2a3350"; c.lineWidth = lit > 0.5 ? 1.8 : 1; c.stroke();
          MW.txt(c, k[0], X[i], 114, 15, "#e8ebf3", 900); MW.txt(c, k[1], X[i], 134, 7, "#8f9ab3", 700); c.globalAlpha = 1; });
        if (on > 0) { c.globalAlpha = on; var g = c.createLinearGradient(0, 30, 0, 160); g.addColorStop(0, "rgba(139,123,255,0.14)"); g.addColorStop(1, "rgba(139,123,255,0.04)"); c.fillStyle = g; c.beginPath(); c.moveTo(x - 6, 34); c.lineTo(x + 6, 34); c.lineTo(x + 46, 160); c.lineTo(x - 46, 160); c.closePath(); c.fill();
          c.fillStyle = "rgba(139,123,255,0.3)"; c.beginPath(); c.ellipse(x, 162, 46, 7, 0, 0, 2 * Math.PI); c.fill(); c.fillStyle = "#c9d2ea"; MW.rr(c, x - 10, 24, 20, 12, 4); c.fill(); c.globalAlpha = 1; }
      });
    },
    options: { cards: "[[value, label], ...] (3)" }, defaults: { cards: [["2,4 tr", "Lượt xem"], ["38%", "Chuyển đổi"], ["4,8★", "Đánh giá"]] },
    demo: CV("effectSpotlightRelay", 3.8),
  }),

  T("data/donut-bloom", {
    kind: "block", uses: U,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), bk = gsap.parseEase("back.out"), pin = gsap.parseEase("power2.in"), cols = ["#8b7bff", "#3dd6f5", "#ffd23d"], win = [[0.35, 1.15], [1.25, 1.75], [1.85, 2.2]];
      return MW.drive(tl, at, 4, function (t) {
        S.clear(); var ex = pin(MW.span(t, 3.55, 3.9)), sc = 1 - 0.06 * ex; c.save(); c.translate(160, 100); c.scale(sc, sc); c.globalAlpha = 1 - ex;
        c.strokeStyle = "#222a42"; c.lineWidth = 18; c.beginPath(); c.arc(0, 0, 50, 0, 2 * Math.PI); c.stroke();
        var a0 = -Math.PI / 2, tot = 0;
        o.parts.forEach(function (p, i) { var u = io(MW.span(t, win[i][0], win[i][1])), a1 = a0 + 2 * Math.PI * p / 100 * u; tot += p * u;
          if (u > 0) { c.strokeStyle = cols[i]; c.beginPath(); c.arc(0, 0, 50, a0, a1); c.stroke(); c.strokeStyle = "#141826"; c.lineWidth = 2; c.beginPath(); c.moveTo(Math.cos(a0) * 41, Math.sin(a0) * 41); c.lineTo(Math.cos(a0) * 59, Math.sin(a0) * 59); c.stroke(); c.lineWidth = 18; }
          var lt = (t - win[i][1] + 0.05) / 0.3; if (lt > 0) { var ae = a0 + 2 * Math.PI * p / 100, s = bk(Math.min(1, lt)); c.save(); c.translate(Math.cos(ae - Math.PI * p / 100) * 76, Math.sin(ae - Math.PI * p / 100) * 76); c.scale(s, s); MW.txt(c, p + "%", 0, 0, 11, cols[i], 900); c.restore(); }
          a0 += 2 * Math.PI * p / 100; });
        var pp = MW.span(t, 2.2, 2.5), ps = 1 + 0.12 * Math.sin(Math.PI * pp); c.save(); c.scale(ps, ps); MW.txt(c, String(Math.round(tot)), 0, -3, 22, "#e8ebf3", 900); MW.txt(c, "ngân sách", 0, 14, 7, "#8f9ab3", 700); c.restore();
        c.restore(); c.globalAlpha = 1;
      });
    },
    options: { parts: "% (50 / 30 / 20)" }, defaults: { parts: [50, 30, 20] },
    demo: CV("dataDonutBloom", 4),
  }),

  T("data/calendar-heatmap", {
    kind: "block", uses: U.concat(["rand"]),
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, out = gsap.parseEase("power2.out"), r = MW.rand(o.seed), V = []; for (var i = 0; i < 35; i++) V.push(r());
      var X0 = 160 - 33 * 3 - 15, Y0 = 52, days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
      return MW.drive(tl, at, 4, function (t) {
        S.clear(); var f = 1 - MW.span(t, 3.6, 3.9); c.globalAlpha = f;
        days.forEach(function (d, i) { MW.txt(c, d, X0 + 33 * i + 15, Y0 - 12, 7, "#8f9ab3", 800); });
        var day = 1, active = -1;
        for (var row = 0; row < 5; row++) { var rs = 0.35 + 0.42 * row; if (t >= rs) active = row;
          for (var col = 0; col < 7; col++) { var idx = row * 7 + col; if (idx < 2 || day > 30) continue; var s0 = rs + 0.015 * col, u = out(MW.span(t, s0, s0 + 0.35)), we = col >= 5 ? 0.45 : 1;
            if (u > 0) { c.globalAlpha = f * u; MW.rr(c, X0 + 33 * col, Y0 + 25 * row + 8 * (1 - u), 30, 21, 4); c.fillStyle = "rgba(139,123,255," + (0.1 + 0.9 * V[idx] * we) + ")"; c.fill(); MW.txt(c, String(day), X0 + 33 * col + 6, Y0 + 25 * row + 7 + 8 * (1 - u), 6, "#e8ebf3", 700, "left"); }
            day++; } }
        c.globalAlpha = f; for (var w = 0; w < 5; w++) MW.txt(c, "Tuần " + (w + 1), X0 - 8, Y0 + 25 * w + 10.5, 6.5, w === active ? "#a99bff" : "#4a5478", 800, "right");
        [0.1, 0.4, 0.7, 1].forEach(function (a, i) { MW.rr(c, 190 + i * 16, 182, 12, 8, 2); c.fillStyle = "rgba(139,123,255," + a + ")"; c.fill(); }); MW.txt(c, "Ít", 182, 186, 6.5, "#8f9ab3", 700, "right"); MW.txt(c, "Nhiều", 256, 186, 6.5, "#8f9ab3", 700, "left");
        c.globalAlpha = 1;
      });
    },
    options: { seed: "the month's values" }, defaults: { seed: 13 },
    demo: CV("dataCalendarHeatmap", 4),
  }),

  T("motion/queue-compress", {
    uses: ["drive", "spring", "plot"],
    fn: function (el, tl, at, o) {
      var items = Array.prototype.slice.call(el.querySelectorAll(o.items)), bar = items[0].querySelector(".qbar"), io = gsap.parseEase("power2.inOut"), pin = gsap.parseEase("power2.in"), sp = MW.spring(240, 24), cnt = o.counter ? MW.el(o.counter) : null, pitch = o.pitch;
      return MW.drive(tl, at, 2.8, function (t) {
        if (bar) bar.style.width = (100 * io(MW.span(t, 0.4, 1.1))) + "%";
        items[0].style.borderColor = t >= 1.1 ? "#3ddc84" : ""; if (bar) bar.style.background = t >= 1.1 ? "#3ddc84" : "";
        var e = pin(MW.span(t, 1.3, 1.6)); gsap.set(items[0], { y: -o.lift * e }); items[0].style.opacity = String(1 - e);
        items.slice(1).forEach(function (it, i) { var s0 = 1.65 + 0.06 * i, k = t >= s0 ? sp.at(t - s0) : 0; gsap.set(it, { x: -pitch * k }); });
        if (cnt) cnt.textContent = t >= 1.6 ? String(items.length - 1) : String(items.length);
      });
    },
    options: { items: "selector of the queue cards, first first", pitch: "px between slots (320)", lift: "px the done card rises (200)", counter: "the counter" }, defaults: { items: ".qc", pitch: 320, lift: 200, counter: null },
    notes: "Order matters: the finished card has left before the others move up.",
    demo: { css: `${BG}\n.q { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; gap: 70px; } .qc { position: relative; width: 250px; height: 220px; border-radius: 30px; background: #1b2130; border: 4px solid #2a3350; display: grid; place-items: center; font-size: 70px; font-weight: 900; }
.qc .qt { position: absolute; left: 30px; right: 30px; bottom: 30px; height: 14px; border-radius: 7px; background: #222a42; overflow: hidden; } .qbar { height: 100%; width: 0; background: #8b7bff; }
.qn { position: absolute; left: 50%; top: 220px; transform: translateX(-50%); font-size: 46px; color: #9aa3b8; font-weight: 700; } .qn b { color: #fff; }`,
      html: `<div class="gm"><div class="qn">Đang chờ: <b class="qcnt">4</b></div><div class="q"><div class="qc">01<div class="qt"><div class="qbar"></div></div></div><div class="qc">02</div><div class="qc">03</div><div class="qc">04</div></div></div>`,
      run: `MW.motionQueueCompress(q(".q"), tl, 0, { counter: ".qcnt" });`, duration: 2.8 },
  }),

  T("data/sentiment-scale", {
    kind: "block", uses: U.concat(["spring"]),
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, s1 = MW.spring(70, 11), s2 = MW.spring(160, 26), X = function (v) { return 160 + 120 * v; };
      return MW.drive(tl, at, 4, function (t) {
        S.clear(); var v = t < 0.45 ? o.from : o.from + (o.to - o.from) * s1.at(t - 0.45); if (t > 3.3) v = o.to + (o.from - o.to) * s2.at(t - 3.3);
        var g = c.createLinearGradient(40, 0, 280, 0); g.addColorStop(0, "#ffd23d"); g.addColorStop(0.5, "#3a4466"); g.addColorStop(1, "#8b7bff"); MW.rr(c, 40, 110, 240, 10, 5); c.fillStyle = g; c.fill();
        [-1, -0.5, 0, 0.5, 1].forEach(function (k) { c.fillStyle = "#6c778b"; c.fillRect(X(k) - 0.5, 124, 1, 6); MW.txt(c, (k > 0 ? "+" : "") + k, X(k), 138, 7, "#8f9ab3", 700); });
        MW.txt(c, "Tiêu cực", 40, 152, 7, "#ffd23d", 800, "left"); MW.txt(c, "Tích cực", 280, 152, 7, "#a99bff", 800, "right");
        var gh = MW.span(t, 0.45, 0.7); if (gh > 0 && t < 3.3) { c.globalAlpha = gh * 0.5; c.fillStyle = "#c9d2ea"; c.fillRect(X(o.from) - 1, 96, 2, 26); c.globalAlpha = 1; }
        var col = Math.abs(v) < 0.05 ? "#8f9ab3" : v > 0 ? "#a99bff" : "#ffd23d", x = X(v); c.fillStyle = "#fff"; c.fillRect(x - 1, 96, 2, 28); c.beginPath(); c.moveTo(x - 6, 88); c.lineTo(x + 6, 88); c.lineTo(x, 96); c.closePath(); c.fill();
        MW.rr(c, x - 22, 66, 44, 18, 9); c.fillStyle = col; c.fill(); MW.txt(c, (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2), x, 75.5, 9, "#151a28", 900);
        MW.txt(c, "Cảm xúc người xem", 160, 40, 11, "#e8ebf3", 800);
      });
    },
    options: { from: "(−0.30)", to: "(+0.60), spring k70 d11", }, defaults: { from: -0.3, to: 0.6 },
    demo: CV("dataSentimentScale", 4),
  }),

  T("data/goal-projection", {
    kind: "block", uses: U,
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), out = gsap.parseEase("power2.out"), A = [[30, 150], [70, 136], [110, 140], [150, 118], [180, 108]], G = [276, 52];
      return MW.drive(tl, at, 4, function (t) {
        S.clear(); var f = 1 - MW.span(t, 3.6, 3.95); c.globalAlpha = f; c.strokeStyle = "#262c3a"; c.lineWidth = 1; [60, 100, 140].forEach(function (y) { c.beginPath(); c.moveTo(24, y); c.lineTo(296, y); c.stroke(); });
        c.setLineDash([4, 4]); c.strokeStyle = "#4a5478"; c.beginPath(); c.moveTo(24, G[1]); c.lineTo(296, G[1]); c.stroke(); c.setLineDash([]); MW.txt(c, "Mục tiêu " + o.goal, 30, G[1] - 9, 8, "#c9d2ea", 800, "left");
        c.strokeStyle = "#ffd23d"; c.lineWidth = 1.5; c.beginPath(); c.arc(G[0], G[1], 8, 0, 2 * Math.PI); c.stroke(); c.fillStyle = "#ffd23d"; c.beginPath(); c.arc(G[0], G[1], 3, 0, 2 * Math.PI); c.fill();
        c.strokeStyle = "#8b7bff"; c.lineWidth = 2.5; MW.polyToX(c, A, 30 + 150 * io(MW.span(t, 0.3, 1.3))); c.stroke(); if (t > 1.3) { c.fillStyle = "#fff"; c.beginPath(); c.arc(180, 108, 3.5, 0, 2 * Math.PI); c.fill(); }
        c.globalAlpha = f * MW.span(t, 1.2, 1.5); c.setLineDash([2, 3]); c.strokeStyle = "#4a5478"; c.beginPath(); c.moveTo(180, 30); c.lineTo(180, 170); c.stroke(); c.setLineDash([]); MW.txt(c, "Hiện tại", 180, 180, 8, "#c9d2ea", 700); c.globalAlpha = f;
        var u = io(MW.span(t, 1.5, 2.6)); if (u > 0) { c.setLineDash([5, 4]); c.strokeStyle = "#ffd23d"; c.lineWidth = 2; c.beginPath(); var n = 30, hx = 180, hy = 108; for (var i = 0; i <= n * u; i++) { var q = i / n, x = 180 + (G[0] - 180) * q, y = 108 + (G[1] - 108) * q - 24 * Math.sin(Math.PI * q); if (i) c.lineTo(x, y); else c.moveTo(x, y); hx = x; hy = y; } c.stroke(); c.setLineDash([]);
          c.strokeStyle = "#ffd23d"; c.lineWidth = 1.5; c.fillStyle = "#141826"; c.beginPath(); c.arc(hx, hy, 3.5, 0, 2 * Math.PI); c.fill(); c.stroke(); }
        var d = t - 2.6; if (d > 0 && d < 0.7) { c.globalAlpha = f * (1 - d / 0.7); c.strokeStyle = "#ffd23d"; c.beginPath(); c.arc(G[0], G[1], 9 + 20 * out(d / 0.7), 0, 2 * Math.PI); c.stroke(); }
        c.globalAlpha = 1;
      });
    },
    options: { goal: "(120)" }, defaults: { goal: 120 },
    demo: CV("dataGoalProjection", 4),
  }),

  T("data/stat-card", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var num = el.querySelector(o.number), bar = el.querySelector(o.fill), ex = gsap.parseEase("expo.out");
      return MW.drive(tl, at, o.start + o.duration + 0.2, function (t) { var p = ex(Math.max(0, Math.min(1, (t - o.start) / o.duration))); num.textContent = "+" + Math.round(o.value * p) + "%"; bar.style.width = (o.bar * p) + "%"; });
    },
    options: { value: "% (40)", bar: "% the bar fills (80)", start: "s (0.3)", duration: "s (1.1), expo.out, one curve for both", number: "the number", fill: "the bar's fill" },
    defaults: { value: 40, bar: 80, start: 0.3, duration: 1.1, number: ".sc-n", fill: ".sc-fill" },
    demo: { css: `${BG}\n.sc { position: absolute; left: 50%; top: 50%; width: 1000px; height: 600px; margin: -300px 0 0 -500px; border-radius: 60px; background: #151a28; border: 3px solid #2a3350; padding: 80px 90px; box-sizing: border-box; }
.sc-n { font-size: 230px; font-weight: 600; color: #a99bff; font-variant-numeric: tabular-nums; line-height: 1; } .sc p { font-size: 46px; color: #9aa3b8; margin: 20px 0 50px; } .sc-t { height: 30px; border-radius: 15px; background: #222a42; } .sc-fill { height: 100%; width: 0; border-radius: 15px; background: #8b7bff; }`,
      html: `<div class="gm"><div class="sc"><div class="sc-n">+0%</div><p>doanh thu so với năm ngoái</p><div class="sc-t"><div class="sc-fill"></div></div></div></div>`, run: `MW.dataStatCard(q(".sc"), tl, 0, {});`, duration: 2.4 },
  }),

  T("map/pin-drop", {
    kind: "block", uses: U.concat(["rand"]),
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, r = MW.rand(o.seed), bo = gsap.parseEase("bounce.out"), P = []; for (var i = 0; i < o.pins; i++) P.push([50 + r() * 220, 50 + r() * 110]);
      return MW.drive(tl, at, 0.4 + o.stagger * o.pins + 0.6, function (t) {
        S.clear(); MW.rr(c, 30, 26, 260, 150, 12); c.fillStyle = "#151c2e"; c.fill();
        c.strokeStyle = "#232c44"; c.lineWidth = 3; c.beginPath(); c.moveTo(30, 120); c.bezierCurveTo(100, 90, 160, 150, 290, 100); c.stroke(); c.lineWidth = 1; for (var g = 0; g < 6; g++) { c.beginPath(); c.moveTo(30 + g * 52, 26); c.lineTo(30 + g * 52, 176); c.stroke(); }
        P.forEach(function (p, i) { var u = MW.span(t, 0.3 + o.stagger * i, 0.7 + o.stagger * i); if (u <= 0) return; var y = p[1] - 40 * (1 - bo(u)); c.globalAlpha = Math.min(1, u * 3); var col = i % 3 === 0 ? "#8b7bff" : "#e8ebf3";
          c.fillStyle = "rgba(0,0,0,0.35)"; c.beginPath(); c.ellipse(p[0], p[1] + 1, 4, 1.5, 0, 0, 2 * Math.PI); c.fill();
          c.fillStyle = col; c.beginPath(); c.moveTo(p[0], y); c.bezierCurveTo(p[0] - 8, y - 9, p[0] - 7, y - 19, p[0], y - 19); c.bezierCurveTo(p[0] + 7, y - 19, p[0] + 8, y - 9, p[0], y); c.fill(); c.fillStyle = "#151c2e"; c.beginPath(); c.arc(p[0], y - 13, 2.5, 0, 2 * Math.PI); c.fill(); c.globalAlpha = 1; });
      });
    },
    options: { pins: "(9)", stagger: "s (0.1; 0.06 in the recipe)", seed: "pin spots" }, defaults: { pins: 9, stagger: 0.1, seed: 21 },
    demo: CV("mapPinDrop", 2.4),
  }),

  T("data/scatter-reveal", {
    kind: "block", uses: U.concat(["rand"]),
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, r = MW.rand(o.seed), out = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), P = [];
      for (var i = 0; i < o.points; i++) { var x = 50 + 230 * (i + r()) / o.points, y = 160 - (x - 50) * 0.42 + (r() * 2 - 1) * 22; P.push([x, y]); }
      var lineAt = 0.3 + 0.03 * o.points + 0.5;
      return MW.drive(tl, at, lineAt + 1, function (t) {
        S.clear(); c.strokeStyle = "#3a4466"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(40, 30); c.lineTo(40, 170); c.lineTo(290, 170); c.stroke();
        P.forEach(function (p, i) { var u = out(MW.span(t, 0.3 + 0.03 * i, 0.8 + 0.03 * i)); if (u <= 0) return; c.fillStyle = "#c9d2ea"; c.beginPath(); c.arc(p[0], 170 + (p[1] - 170) * u, 4, 0, 2 * Math.PI); c.fill(); });
        var l = io(MW.span(t, lineAt, lineAt + 0.55)); if (l > 0) { c.strokeStyle = "#8b7bff"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(46, 162); c.lineTo(46 + (288 - 46) * l, 162 - (288 - 46) * 0.42 * l); c.stroke(); }
      });
    },
    options: { points: "(24)", seed: "the points" }, defaults: { points: 24, seed: 17 },
    demo: CV("dataScatterReveal", 2.8),
  }),
];

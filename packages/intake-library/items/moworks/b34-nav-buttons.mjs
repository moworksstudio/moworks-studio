// Navigation & Overlays and UI Buttons (batch 3.4): hero expands, sheets, page transitions and the press, fill, morph and feedback motions
// of a button, each with an optional scripted cursor on the film's clock, written here.
import { T } from "../../moworks/define.mjs";
import { CURSOR, ui } from "../../moworks/stages.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const CV = (name, duration = 4, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
const BCSS = `.bw { position: relative; width: 1400px; height: 760px; display: grid; place-items: center; }
.b { position: relative; display: inline-grid; place-items: center; box-sizing: border-box; height: 184px; padding: 0 110px; border-radius: 56px; font-size: 60px; font-weight: 800; letter-spacing: 0.02em; white-space: nowrap; }
.b-acc { background: linear-gradient(180deg, #9c88ff, #7357f5); color: #fff; box-shadow: 0 24px 50px rgba(115, 87, 245, 0.35); } .b-out { background: #10131d; border: 6px solid #8b7bff; color: #c9c0ff; }
.ck { display: inline-block; width: 0.3em; height: 0.55em; border: solid currentColor; border-width: 0 0.12em 0.12em 0; transform: rotate(45deg); margin: 0 0.45em 0.12em 0; }`;
const BTN = (inner, css = "", cursor = true) => ui(`<div class="bw">${inner}${cursor ? CURSOR : ""}</div>`, `${BCSS}\n${css}`);
// a scripted cursor: cursorPlan([[s, x share, y share, hold s, node?], ...]) once, cursorAt(t) on every frame (pressed while held)
const PRE = `var host = el.parentNode; if (getComputedStyle(host).position === "static") host.style.position = "relative";
var cur = o.cursor ? (host.querySelector(o.cursor) || document.querySelector(o.cursor)) : null, curKeys = null;
var cursorPlan = function (clicks) { if (!cur) return; var base = (cur.offsetParent || host).getBoundingClientRect(), k = [];
  clicks.forEach(function (c, i) { var r = (c[4] || el).getBoundingClientRect(), x = r.left - base.left + r.width * c[1], y = r.top - base.top + r.height * c[2];
    if (!i) k.push([0, x + o.approach[0], y + o.approach[1]]); k.push([Math.max(0.01, c[0] - o.lead), x, y]); k.push([c[0] + (c[3] || 0.12) + 0.3, x, y]); });
  var z = k[k.length - 1]; k.push([z[0] + 0.5, z[1] + o.approach[0] * 0.6, z[2] + o.approach[1] * 0.6]); curKeys = { k: k, c: clicks }; };
var cursorAt = function (t) { if (!cur || !curKeys) return; var p = MW.path(curKeys.k, t, "power2.inOut"), dn = 0; curKeys.c.forEach(function (c) { var u = t - c[0]; if (u >= 0 && u < (c[3] || 0.12)) dn = 1; });
  gsap.set(cur, { x: p[0] - 12, y: p[1] - 6, scale: dn ? 0.86 : 1, transformOrigin: "20% 10%" }); };`;
const mk = (body) => new Function("el", "tl", "at", "o", PRE + "\n" + body);
const CD = { cursor: null, approach: [260, 200], lead: 0.12 };
const CO = { cursor: "an optional cursor that makes the clicks", approach: "[x, y] px the cursor comes from", lead: "s it arrives before a click" };
const U = ["drive", "draw"];

export default [
  T("ui/thumbnail-to-hero", {
    uses: ["drive", "draw", "plot", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), p2 = gsap.parseEase("power2.out"), wx = 70, wy = 19, WW = 180, WH = 162;
      var TH = [[12, 24, "#ff8a5c", "#c2185b"], [96, 24, "#3dd6f5", "#1565c0"], [12, 90, "#7af0b0", "#128a4c"], [96, 90, "#ffd23d", "#e07b00"]];
      var grad = function (x, y, w, h, a, b) { var g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var g = io(MW.span(t, 0.45, 1.15)) - io(MW.span(t, 2.0, 2.55)), d = p2(MW.span(t, 0.95, 1.25)) * (1 - MW.span(t, 1.92, 2.05));
        c.save(); MW.rr(c, wx, wy, WW, WH, 10); c.fillStyle = "#10131d"; c.fill(); c.clip(); c.fillStyle = "#1b2130"; c.fillRect(wx, wy, WW, 12);
        [0, 1, 2].forEach(function (i) { c.fillStyle = "#3a4466"; c.beginPath(); c.arc(wx + 8 + i * 7, wy + 6, 2, 0, 2 * Math.PI); c.fill(); });
        TH.forEach(function (q, i) { c.globalAlpha = 1 - g; if (i) { MW.rr(c, wx + q[0], wy + q[1], 72, 50, 6); c.fillStyle = grad(wx + q[0], wy + q[1], 72, 50, q[2], q[3]); c.fill(); MW.txt(c, o.places[i], wx + q[0] + 6, wy + q[1] + 43, 7, "#fff", 900, "left"); }
          MW.txt(c, o.posts, wx + q[0], wy + q[1] + 58, 6, "#6c778b", 600, "left"); }); c.globalAlpha = 1;
        var q = TH[0], x = q[0] * (1 - g), y = q[1] + (12 - q[1]) * g, w = 72 + (WW - 72) * g, h = 50 + 30 * g;
        MW.rr(c, wx + x, wy + y, w, h, Math.max(0.01, 6 * (1 - g))); c.fillStyle = grad(wx + x, wy + y, w, h, q[2], q[3]); c.fill();
        var fs = 8 + 7 * g, ins = 6 + 6 * g; MW.txt(c, o.places[0], wx + x + ins, wy + y + h - ins - fs * 0.4, fs, "#fff", 900, "left");
        if (d > 0) { c.globalAlpha = d; var dy = 8 * (1 - d); MW.txt(c, o.title, wx + 12, wy + 106 + dy, 11, "#e8ebf3", 800, "left"); c.fillStyle = "#2a3350"; [150, 132, 96].forEach(function (lw, i) { MW.rr(c, wx + 12, wy + 120 + i * 11 + dy, lw, 5, 2.5); c.fill(); }); c.globalAlpha = 1; }
        c.restore(); c.strokeStyle = "#2a3350"; c.lineWidth = 1; MW.rr(c, wx, wy, WW, WH, 10); c.stroke();
        var cp = MW.path([[0, 280, 196], [0.28, wx + 52, wy + 52], [0.6, wx + 52, wy + 52], [1.1, 292, 150]], t, "power2.inOut"); MW.cursor(c, cp[0], cp[1], t > 0.34 && t < 0.46 ? 0.85 : 1);
      });
    },
    options: { places: "the four thumbnails' captions", posts: "line under each thumbnail", title: "the detail heading", loop: "s (3)" },
    defaults: { places: ["SA PA", "HẠ LONG", "ĐÀ LẠT", "HUẾ"], posts: "4 bài viết", title: "Sa Pa mùa lúa chín", loop: 3 },
    demo: CV("uiThumbnailToHero", 3),
  }),

  T("ui/sheet-spring-dim", {
    uses: ["drive", "draw", "plot", "spring", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, sp = MW.spring(o.k, o.c), pin = gsap.parseEase("power2.in"), sx = 110, sy = 8, SW = 100, SH = 184, cols = ["#ff8a5c", "#3dd6f5", "#7af0b0", "#ffd23d"];
      var ck = [[0, 260, 200], [o.openAt - 0.18, sx + 52, sy + 156], [o.openAt + 0.2, sx + 52, sy + 156], [o.openAt + 0.8, 262, 168], [o.closeAt - 0.45, 262, 168], [o.closeAt - 0.08, sx + 72, sy + 46], [o.closeAt + 0.3, sx + 72, sy + 46], [o.closeAt + 0.8, 262, 168]];
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var v = t > o.openAt ? sp.at(t - o.openAt) : 0, p = v * (1 - pin(MW.span(t, o.closeAt, o.closeAt + o.close))), top = 196 + (o.rest - 196) * p;
        c.save(); MW.rr(c, sx, sy, SW, SH, 14); c.fillStyle = "#10131d"; c.fill(); c.clip();
        MW.txt(c, "Thư viện", sx + 8, sy + 18, 10, "#e8ebf3", 800, "left");
        for (var i = 0; i < 4; i++) { MW.rr(c, sx + 8, sy + 32 + i * 26, 84, 20, 5); c.fillStyle = "#1b2130"; c.fill(); c.fillStyle = cols[i]; MW.rr(c, sx + 12, sy + 35 + i * 26, 16, 14, 3); c.fill(); c.fillStyle = "#3a4466"; c.fillRect(sx + 34, sy + 38 + i * 26, 40, 4); c.fillRect(sx + 34, sy + 45 + i * 26, 26, 3); }
        MW.rr(c, sx + 24, sy + 146, 56, 20, 10); c.fillStyle = "#8b7bff"; c.fill(); MW.txt(c, "Mở", sx + 52, sy + 156.5, 8, "#fff", 800);
        c.fillStyle = "rgba(0,0,0," + (o.dim * Math.max(0, Math.min(1, p))).toFixed(3) + ")"; c.fillRect(sx, sy, SW, SH);
        var x0 = sx + 4; MW.rr(c, x0, top, 92, 150, 14); c.fillStyle = "#1e2436"; c.fill(); c.fillStyle = "#4a5470"; MW.rr(c, x0 + 36, top + 6, 20, 3, 1.5); c.fill();
        MW.txt(c, "Chi tiết cảnh", x0 + 8, top + 22, 9, "#e8ebf3", 800, "left"); c.fillStyle = "#3a4466"; [70, 62, 48].forEach(function (w, j) { MW.rr(c, x0 + 8, top + 34 + j * 10, w, 4, 2); c.fill(); });
        MW.rr(c, x0 + 8, top + 72, 76, 18, 9); c.fillStyle = "#8b7bff"; c.fill(); MW.txt(c, "Dùng cảnh này", x0 + 46, top + 81.5, 7, "#fff", 800);
        c.restore(); c.strokeStyle = "#2a3350"; c.lineWidth = 1.5; MW.rr(c, sx, sy, SW, SH, 14); c.stroke();
        var cp = MW.path(ck, t, "power2.inOut"); MW.cursor(c, cp[0], cp[1], Math.abs(t - (o.openAt - 0.08)) < 0.06 || Math.abs(t - (o.closeAt - 0.02)) < 0.06 ? 0.85 : 1);
      });
    },
    options: { k: "spring stiffness (260)", c: "damping (20): about 8 % overshoot", rest: "the sheet's top at rest in the 320 frame (92)", dim: "(0.6)", openAt: "s (0.4)", closeAt: "s (2.1)", close: "s (0.3, power2.in)", loop: "s (3)" },
    defaults: { k: 260, c: 20, rest: 92, dim: 0.6, openAt: 0.4, closeAt: 2.1, close: 0.3, loop: 3 },
    demo: CV("uiSheetSpringDim", 3),
  }),

  T("motion/moworks-card-flip", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var f = el.querySelector(o.front), b = el.querySelector(o.back), e = gsap.parseEase(o.ease), back = o.duration + o.hold;
      return MW.drive(tl, at, o.returns ? back + o.duration : o.duration, function (t) {
        var A = 180 * e(Math.max(0, Math.min(1, t / o.duration))); if (o.returns) A -= 180 * e(Math.max(0, Math.min(1, (t - back) / o.duration)));
        var face = A > 90 ? 1 : 0; gsap.set(el, { rotationY: face ? A - 180 : A, scaleY: 1 + o.bulge * Math.sin(A * Math.PI / 180), transformPerspective: o.perspective });
        f.style.visibility = face ? "hidden" : "visible"; b.style.visibility = face ? "visible" : "hidden";
      });
    },
    options: { duration: "s per flip (0.7)", hold: "s on the back (0.65)", bulge: "scaleY added mid-flip (0.06)", ease: "(power2.inOut)", perspective: "px (1600)", returns: "flip back after the hold", front: "", back: "" },
    defaults: { duration: 0.7, hold: 0.65, bulge: 0.06, ease: "power2.inOut", perspective: 1600, returns: true, front: ".kf-f", back: ".kf-b" },
    notes: "The face turned away is hidden, so the text is never seen mirrored.",
    demo: { css: `${BG}\n.st { position: absolute; inset: 0; display: grid; place-items: center; } .kf { position: relative; width: 700px; height: 440px; } .kf > div { position: absolute; inset: 0; border-radius: 40px; padding: 56px 60px; box-sizing: border-box; color: #fff; }
.kf-f { background: linear-gradient(135deg, #a693ff, #5b3fe0); } .kf-f b { display: block; font-size: 44px; letter-spacing: 0.06em; } .kf-f i { display: block; width: 110px; height: 80px; border-radius: 16px; background: linear-gradient(135deg, #ffe08a, #d9a400); margin: 50px 0 40px; } .kf-f span { font-size: 48px; font-weight: 700; letter-spacing: 0.1em; }
.kf-b { background: #1b2130; visibility: hidden; padding: 0; } .kf-b i { display: block; height: 90px; background: #0b0d12; margin-top: 60px; } .kf-b b { display: block; margin: 50px 60px 10px; font-size: 44px; letter-spacing: 0.06em; } .kf-b span { margin: 0 60px; font-size: 32px; color: #8f9ab3; letter-spacing: 0.08em; }`,
      html: `<div class="st"><div class="kf"><div class="kf-f"><b>THẺ MOWORKS</b><i></i><span>•••• 2026</span></div><div class="kf-b"><i></i><b>MẶT SAU</b><span>CHI TIẾT</span></div></div></div>`, run: `MW.motionMoworksCardFlip(q(".kf"), tl, 0.4, {});`, duration: 2.9 },
  }),

  T("transition/fab-circle-reveal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, fab = o.from ? host.querySelector(o.from) : null, e = gsap.parseEase(o.ease), ring = document.createElement("div");
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      var er = el.getBoundingClientRect(), hr = host.getBoundingClientRect(), fr = fab ? fab.getBoundingClientRect() : { left: er.right - 90, top: er.bottom - 90, width: 0, height: 0 };
      var cx = fr.left + fr.width / 2 - er.left, cy = fr.top + fr.height / 2 - er.top, R = Math.max(Math.hypot(cx, cy), Math.hypot(er.width - cx, cy), Math.hypot(cx, er.height - cy), Math.hypot(er.width - cx, er.height - cy)), r0 = fr.width / 2, hx = fr.left + fr.width / 2 - hr.left, hy = fr.top + fr.height / 2 - hr.top;
      ring.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;opacity:0;z-index:30;border:" + o.ringWidth + "px solid rgba(255,255,255,0.85);"; host.appendChild(ring);
      return MW.drive(tl, at, o.backAt == null ? o.delay + o.duration : o.backAt + o.back, function (t) {
        var p = e(Math.max(0, Math.min(1, (t - o.delay) / o.duration))); if (o.backAt != null && t > o.backAt) p = 1 - e(Math.min(1, (t - o.backAt) / o.back));
        var r = R * p; el.style.clipPath = "circle(" + r.toFixed(1) + "px at " + cx.toFixed(1) + "px " + cy.toFixed(1) + "px)"; el.style.visibility = r > 0.5 ? "visible" : "hidden";
        if (fab) fab.style.opacity = String(1 - Math.max(0, Math.min(1, (r - r0) / (r0 * 1.7 || 1))));
        var u = t / 0.32, rr = 10 + o.ringR * u; ring.style.width = ring.style.height = 2 * rr + "px"; ring.style.left = hx - rr - o.ringWidth + "px"; ring.style.top = hy - rr - o.ringWidth + "px"; ring.style.opacity = t > 0 && u < 1 ? String(1 - u) : "0";
      });
    },
    options: { from: "the floating button the circle grows from", delay: "s after the tap (0.08)", duration: "s (0.7)", ease: "(power2.inOut)", backAt: "s after the start to shrink back (null)", back: "s (0.5)", ringR: "px the touch ring grows (50)", ringWidth: "px (4)" },
    defaults: { from: ".fab", delay: 0.08, duration: 0.7, ease: "power2.inOut", backAt: null, back: 0.5, ringR: 50, ringWidth: 4 },
    notes: "The radius grows to the farthest corner, so the new page covers the screen exactly when it ends.",
    demo: { css: `${BG}\n.st { position: absolute; inset: 0; display: grid; place-items: center; } .ph { position: relative; width: 520px; height: 956px; border-radius: 70px; overflow: hidden; background: #10131d; border: 4px solid #2a3350; }
.pg { position: absolute; inset: 0; padding: 90px 40px; box-sizing: border-box; } .pg h3 { margin: 0 0 40px; font-size: 52px; } .pg .r { height: 110px; border-radius: 24px; background: #1b2130; margin-bottom: 24px; }
.pg-b { background: linear-gradient(160deg, #a693ff, #6a4cf0); } .pg-b .r { background: rgba(255,255,255,0.18); } .fab { position: absolute; right: 46px; bottom: 60px; width: 114px; height: 114px; border-radius: 50%; background: #8b7bff; z-index: 5; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
.fab::before, .fab::after { content: ""; position: absolute; left: 50%; top: 50%; width: 46px; height: 9px; margin: -4.5px 0 0 -23px; border-radius: 5px; background: #fff; } .fab::after { transform: rotate(90deg); }`,
      html: `<div class="st"><div class="ph"><div class="pg"><h3>Ghi chú</h3><div class="r"></div><div class="r"></div><div class="r"></div><div class="r"></div></div><div class="pg pg-b"><h3>Ghi chú mới</h3><div class="r" style="height:300px"></div></div><div class="fab"></div></div></div>`,
      run: `MW.transitionFabCircleReveal(q(".pg-b"), tl, 0.32, { backAt: 1.63 });`, duration: 3 },
  }),

  T("transition/parallax-push", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, out = o.from ? host.querySelector(o.from) : null, e = gsap.parseEase(o.ease), dim = document.createElement("div"), edge = document.createElement("div"), ring = document.createElement("div"), W = el.offsetWidth;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      dim.style.cssText = "position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;"; if (out) { if (getComputedStyle(out).position === "static") out.style.position = "relative"; out.appendChild(dim); }
      edge.style.cssText = "position:absolute;top:0;bottom:0;pointer-events:none;opacity:0;left:-" + o.shadow + "px;width:" + o.shadow + "px;background:linear-gradient(90deg,rgba(0,0,0,0),rgba(0,0,0,1));"; el.appendChild(edge);
      ring.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;opacity:0;z-index:30;border:" + o.ringWidth + "px solid rgba(255,255,255,0.85);"; host.appendChild(ring);
      return MW.drive(tl, at, o.backAt == null ? o.delay + o.duration : o.backAt + o.duration, function (t) {
        var p = e(Math.max(0, Math.min(1, (t - o.delay) / o.duration))); if (o.backAt != null && t > o.backAt) p = 1 - e(Math.min(1, (t - o.backAt) / o.duration));
        gsap.set(el, { x: W * (1 - p) }); if (out) gsap.set(out, { x: -o.under * W * p }); dim.style.opacity = String(o.dim * p); edge.style.opacity = String(o.edge * p);
        if (o.tap) { var u = t / 0.32, rr = 10 + 50 * u; ring.style.width = ring.style.height = 2 * rr + "px"; ring.style.left = host.clientWidth * o.tap[0] - rr - o.ringWidth + "px"; ring.style.top = host.clientHeight * o.tap[1] - rr - o.ringWidth + "px"; ring.style.opacity = t > 0 && u < 1 ? String(1 - u) : "0"; }
      });
    },
    options: { from: "the outgoing page", delay: "s after the tap (0.08)", duration: "s (0.7)", ease: "(power2.inOut)", under: "share the old page moves back (0.3)", dim: "(0.4)", shadow: "px of edge shadow (30)", edge: "its opacity at the end (0.5)", backAt: "s after the start to go back, the exact reverse (null)", tap: "[x, y] share of the screen where a touch ring shows at the start (null)", ringWidth: "px (4)" },
    defaults: { from: ".pp-a", delay: 0.08, duration: 0.7, ease: "power2.inOut", under: 0.3, dim: 0.4, shadow: 30, edge: 0.5, backAt: null, tap: null, ringWidth: 4 },
    demo: { css: `${BG}\n.st { position: absolute; inset: 0; display: grid; place-items: center; } .ph { position: relative; width: 520px; height: 956px; border-radius: 70px; overflow: hidden; background: #10131d; border: 4px solid #2a3350; }
.pg { position: absolute; inset: 0; padding: 90px 40px; box-sizing: border-box; background: #10131d; } .pg h3 { margin: 0 0 40px; font-size: 52px; } .pg .r { height: 110px; border-radius: 24px; background: #1b2130; margin-bottom: 24px; } .pg .r.on { background: #2a3350; }
.pp-b { background: #151a28; } .pp-b .hero { height: 360px; border-radius: 30px; background: linear-gradient(160deg, #ffd27a, #ff9b3d); margin-bottom: 30px; }`,
      html: `<div class="st"><div class="ph"><div class="pg pp-a"><h3>Dự án</h3><div class="r"></div><div class="r on"></div><div class="r"></div><div class="r"></div></div><div class="pg pp-b"><h3>Phim mùa hè</h3><div class="hero"></div><div class="r"></div></div></div></div>`,
      run: `MW.transitionParallaxPush(q(".pp-b"), tl, 0.4, { tap: [0.5, 0.37], backAt: 1.6 });`, duration: 3 },
  }),

  T("ui/list-stagger-reveal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var it = Array.prototype.slice.call(el.querySelectorAll(o.items)), p2 = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in");
      return MW.drive(tl, at, o.exitAt == null ? (it.length - 1) * o.each + o.duration : o.exitAt + o.out, function (t) {
        var x = o.exitAt != null && t > o.exitAt ? pin(Math.min(1, (t - o.exitAt) / o.out)) : 0;
        it.forEach(function (r, i) { var u = p2(Math.max(0, Math.min(1, (t - i * o.each) / o.duration))); gsap.set(r, { y: o.rise * (1 - u) }); r.style.opacity = String(u * (1 - x)); });
      });
    },
    options: { items: "rows in reading order", rise: "px (48)", duration: "s per row (0.35, power2.out)", each: "s between rows (0.06)", exitAt: "s after the start to fade all out (null)", out: "s (0.2)" },
    defaults: { items: ".ui-row", rise: 48, duration: 0.35, each: 0.06, exitAt: null, out: 0.2 },
    demo: { ...ui(`<div class="ui-card ls"><p class="ui-h">Thực đơn</p><div class="ui-row"><div class="ui-dot"></div>Dự án gần đây</div><div class="ui-row"><div class="ui-dot"></div>Thư viện chuyển động</div><div class="ui-row"><div class="ui-dot"></div>Âm thanh</div><div class="ui-row"><div class="ui-dot"></div>Cài đặt</div></div>`, `.ls { width: 760px; box-sizing: border-box; } .ls .ui-row { opacity: 0; }`),
      run: `MW.uiListStaggerReveal(q(".ls"), tl, 0.4, { exitAt: 1.9 });`, duration: 2.7 },
  }),

  T("ui/press-bounce", {
    uses: U,
    fn: mk(`var p2 = gsap.parseEase("power2.out"), p1 = gsap.parseEase("power1.out"), io = gsap.parseEase("power2.inOut"); cursorPlan([[o.press, 0.55, 0.6, o.release - o.press]]);
return MW.drive(tl, at, o.release + 0.16 + o.settle + 0.6, function (t) {
  var s = 1, a = t - o.press, r = t - o.release;
  if (a > 0 && r <= 0) s = 1 - (1 - o.down) * p2(Math.min(1, a / 0.1)); else if (r > 0 && r < 0.16) s = o.down + (o.up - o.down) * p1(r / 0.16); else if (r >= 0.16) s = o.up + (1 - o.up) * io(Math.min(1, (r - 0.16) / o.settle));
  gsap.set(el, { scale: s }); cursorAt(t);
});`),
    options: { press: "s (0.7)", release: "s (1.25)", down: "scale when pressed, 0.1 s power2.out (0.92)", up: "rebound on release, 0.16 s power1.out (1.05)", settle: "s back to 1 (0.3, power2.inOut)", ...CO },
    defaults: { press: 0.7, release: 1.25, down: 0.92, up: 1.05, settle: 0.3, ...CD },
    demo: { ...BTN(`<div class="b b-acc pb">Bắt đầu</div>`), run: `MW.uiPressBounce(q(".pb"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.6 },
  }),

  T("motion/jelly-squash", {
    uses: U,
    fn: mk(`var p1 = gsap.parseEase("power1.out"); gsap.set(el, { transformOrigin: "50% 100%" }); cursorPlan([[o.press, 0.5, 0.55, 0.15]]);
return MW.drive(tl, at, o.press + o.fadeEnd, function (t) {
  var u = t - o.press, d = 0; if (u > 0) d = o.amp * Math.exp(-o.decay * u) * Math.cos(o.freq * u) * p1(Math.min(1, u / 0.05)) * (1 - Math.max(0, Math.min(1, (u - o.fadeStart) / (o.fadeEnd - o.fadeStart))));
  gsap.set(el, { scaleX: 1 + d, scaleY: 1 / (1 + d) }); cursorAt(t);
});`),
    options: { press: "s (0.55)", amp: "(0.2)", freq: "rad/s (17)", decay: "(3.4)", fadeStart: "s after the press the wobble fades from (1.6)", fadeEnd: "(2.0)", ...CO },
    defaults: { press: 0.55, amp: 0.2, freq: 17, decay: 3.4, fadeStart: 1.6, fadeEnd: 2, ...CD },
    notes: "d(t) = amp × e^(−decay t) × cos(freq t); scaleX = 1 + d, scaleY = 1 / (1 + d), so the area is kept; about a spring k 290, damping 6.8.",
    demo: { ...BTN(`<div class="b b-acc js">Thạch rung</div>`), run: `MW.motionJellySquash(q(".js"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.6 },
  }),

  T("ui/tap-ripple", {
    uses: U,
    fn: mk(`if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden";
var p2 = gsap.parseEase("power2.out"), W = el.offsetWidth, Hh = el.offsetHeight, R = [];
o.taps.forEach(function (tp) { var x = W * tp[1], y = Hh * tp[2], ink = document.createElement("div"), dot = document.createElement("div");
  ink.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;opacity:0;background:" + o.ink + ";"; dot.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;opacity:0;box-sizing:border-box;border:4px solid rgba(255,255,255,0.85);width:" + 2 * o.dot + "px;height:" + 2 * o.dot + "px;left:" + (x - o.dot) + "px;top:" + (y - o.dot) + "px;background:radial-gradient(circle, #fff 0 " + o.dot / 2.4 + "px, transparent " + (o.dot / 2.4 + 1) + "px);";
  el.appendChild(ink); el.appendChild(dot); R.push({ t: tp[0], x: x, y: y, far: Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, Hh - y), Math.hypot(W - x, Hh - y)), ink: ink, dot: dot }); });
cursorPlan(o.taps.map(function (tp) { return [tp[0], tp[1], tp[2], 0.12]; }));
return MW.drive(tl, at, o.taps[o.taps.length - 1][0] + o.fade[1] + 0.1, function (t) {
  R.forEach(function (q) { var u = t - q.t, r = q.far * p2(Math.max(0, Math.min(1, u / o.grow))); q.ink.style.width = q.ink.style.height = 2 * r + "px"; q.ink.style.left = q.x - r + "px"; q.ink.style.top = q.y - r + "px";
    q.ink.style.opacity = u > 0 ? String(o.opacity * (1 - Math.max(0, Math.min(1, (u - o.fade[0]) / (o.fade[1] - o.fade[0]))))) : "0"; q.dot.style.opacity = u > 0 && u < 0.35 ? String(1 - u / 0.35) : "0"; });
  cursorAt(t);
});`),
    options: { taps: "[[s, x share, y share], ...]", grow: "s to the farthest corner (0.55, power2.out)", opacity: "(0.38)", fade: "[from, to] s after the tap ([0.2, 0.75])", ink: "ripple colour", dot: "px radius of the touch mark (30)", ...CO },
    defaults: { taps: [[0.55, 0.3, 0.68], [1.65, 0.76, 0.3]], grow: 0.55, opacity: 0.38, fade: [0.2, 0.75], ink: "#e8ebf3", dot: 30, ...CD },
    demo: { ...BTN(`<div class="b b-acc tr" style="padding:0 150px">Chạm vào đây</div>`, "", false), run: `MW.uiTapRipple(q(".tr"), tl, 0, {});`, duration: 2.6 },
  }),

  T("ui/pulse-glow", {
    uses: U,
    fn: mk(`var lb = o.label ? el.querySelector(o.label) : null, p2 = gsap.parseEase("power2.out"), rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, H = [], c = o.rgb.join(","), L = el.offsetLeft, Tp = el.offsetTop, W = el.offsetWidth, Hh = el.offsetHeight;
o.halos.forEach(function () { var h = document.createElement("div"); h.style.cssText = "position:absolute;pointer-events:none;opacity:0;box-sizing:border-box;border:" + o.haloWidth + "px solid rgba(" + c + ",1);"; host.insertBefore(h, el); H.push(h); });
return MW.drive(tl, at, o.period * o.cycles, function (t) {
  var ph = t % o.period, I = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph / o.period);
  el.style.boxShadow = "inset 0 0 0 " + (o.border[0] + o.border[1] * I).toFixed(2) + "px rgba(" + c + "," + (0.25 + 0.75 * I).toFixed(3) + "), 0 0 " + (o.glow * I).toFixed(1) + "px rgba(" + c + "," + (0.85 * I).toFixed(3) + ")"; if (lb) lb.style.opacity = String(0.55 + 0.45 * I);
  H.forEach(function (h, i) { var u = (ph - o.halos[i]) / o.haloTime, d = o.grow[0] + (o.grow[1] - o.grow[0]) * p2(Math.max(0, Math.min(1, u))); h.style.left = L - d + "px"; h.style.top = Tp - d + "px"; h.style.width = W + 2 * d + "px"; h.style.height = Hh + 2 * d + "px"; h.style.borderRadius = rad + d + "px"; h.style.opacity = u > 0 && u < 1 ? String(0.7 * (1 - u)) : "0"; });
});`),
    options: { period: "s per breath (2.8)", cycles: "(2)", border: "[base, added] px of the outline ([6, 4])", glow: "px of blur at the peak (72)", halos: "s into each breath the two halos start ([1.0, 1.35])", haloTime: "s (1.2, power2.out)", grow: "[from, to] px out from the edge ([12, 108])", haloWidth: "px (6)", rgb: "accent as [r, g, b]", label: "the label (breathes 0.55–1)", ...CO },
    defaults: { period: 2.8, cycles: 2, border: [6, 4], glow: 72, halos: [1, 1.35], haloTime: 1.2, grow: [12, 108], haloWidth: 6, rgb: [139, 123, 255], label: "span", ...CD },
    demo: { ...BTN(`<div class="b pg" style="background:#10131d;color:#c9c0ff"><span>Sẵn sàng</span></div>`, "", false), run: `MW.uiPulseGlow(q(".pg"), tl, 0, {});`, duration: 5.6 },
  }),

  T("motion/moworks-error-shake", {
    uses: U,
    fn: mk(`var err = o.error ? host.querySelector(o.error) : null, ok = o.button ? host.querySelector(o.button) : null, b0 = getComputedStyle(el).borderColor;
cursorPlan([[o.press, 0.5, 0.55, 0.12, ok || el]]);
return MW.drive(tl, at, o.clearAt + 0.55, function (t) {
  var u = t - o.press - 0.1, x = u > 0 ? o.amp * Math.exp(-o.decay * u) * Math.sin(o.freq * u) * (1 - Math.max(0, Math.min(1, (u - 0.45) / 0.15))) : 0;
  var e = Math.max(0, Math.min(1, (t - o.press - 0.08) / 0.07)) * (1 - Math.max(0, Math.min(1, (t - o.clearAt) / 0.25)));
  gsap.set(el, { x: x }); el.style.borderColor = e > 0.5 ? o.accent : b0; el.style.boxShadow = "0 0 0 " + (8 * e).toFixed(1) + "px rgba(255,93,143," + (0.3 * e).toFixed(3) + ")"; if (err) err.style.opacity = String(e);
  cursorAt(t);
});`),
    options: { press: "s the OK is clicked (0.55)", amp: "px (36)", freq: "rad/s (44)", decay: "(6)", clearAt: "s the error clears (2.25)", accent: "error colour", error: "the error line", button: "the button clicked", ...CO },
    defaults: { press: 0.55, amp: 36, freq: 44, decay: 6, clearAt: 2.25, accent: "#ff5d8f", error: ".es-e", button: ".es-b", ...CD },
    notes: "x = amp × e^(−decay t) × sin(freq t) from 0.1 s after the click, faded to 0 between 0.45 and 0.6 s, so it always lands at 0.",
    demo: { ...BTN(`<div class="ui-field es-f">••••••</div><div class="b b-acc es-b" style="height:112px;padding:0 60px;border-radius:26px;font-size:40px">OK</div><div class="es-e">Mật khẩu chưa đúng</div>`,
      `.es-f { position: absolute; left: 230px; top: 300px; letter-spacing: 0.3em; font-size: 44px; } .es-b { position: absolute; left: 1030px; top: 300px; } .es-e { position: absolute; left: 236px; top: 446px; font-size: 34px; font-weight: 700; color: #ff5d8f; opacity: 0; }`),
      run: `MW.motionMoworksErrorShake(q(".es-f"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.8 },
  }),

  T("ui/fill-sweep-select", {
    uses: U,
    fn: mk(`if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden";
var lb = el.querySelector(o.label), io = gsap.parseEase("power2.inOut"), p2 = gsap.parseEase("power2.out"), bo = gsap.parseEase("back.out(2)"), t0 = lb.textContent, W = el.offsetWidth;
var fill = document.createElement("div"), fl = document.createElement("div"), ck = document.createElement("span"), txt = document.createElement("span"), line = document.createElement("div");
fill.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;background:" + o.accent + ";color:" + o.ink + ";"; fl.style.cssText = "display:inline-flex;align-items:center;";
ck.style.cssText = "display:inline-block;width:0.3em;height:0.55em;border:solid currentColor;border-width:0 0.12em 0.12em 0;margin:0 0.5em 0.12em 0;"; txt.textContent = t0; fl.appendChild(ck); fl.appendChild(txt); fill.appendChild(fl); el.appendChild(fill);
line.style.cssText = "position:absolute;top:0;bottom:0;pointer-events:none;opacity:0;background:#e8ebf3;width:" + o.line + "px;margin-left:-" + o.line / 2 + "px;"; el.appendChild(line);
cursorPlan([[o.press, 0.5, 0.55, 0.12]]);
return MW.drive(tl, at, o.backAt + 0.45, function (t) {
  var p = io(Math.max(0, Math.min(1, (t - o.press) / o.sweep))), b = Math.max(0, Math.min(1, (t - o.backAt) / 0.25)), u = t - o.press - o.sweep, done = u >= 0;
  fill.style.clipPath = "inset(0 " + (100 * (1 - p)).toFixed(2) + "% 0 0)"; fill.style.opacity = String(1 - b); line.style.left = W * p + "px"; line.style.opacity = p > 0 && p < 1 ? "1" : "0";
  txt.textContent = done ? o.doneText : t0; gsap.set(txt, { x: done ? -o.slide * (1 - p2(Math.min(1, u / 0.2))) : 0 }); ck.style.display = done ? "inline-block" : "none"; ck.style.transform = "rotate(45deg) scale(" + (done ? bo(Math.min(1, u / 0.25)) : 0).toFixed(3) + ")";
  cursorAt(t);
});`),
    options: { press: "s (0.55)", sweep: "s (0.5, power2.inOut)", backAt: "s it fades back (2.3)", accent: "", ink: "label colour inside the fill", line: "px of the moving front (6)", slide: "px the new label slides in (32)", label: "the label", doneText: "", ...CO },
    defaults: { press: 0.55, sweep: 0.5, backAt: 2.3, accent: "#8b7bff", ink: "#0b0d12", line: 6, slide: 32, label: "span", doneText: "ĐÃ CHỌN", ...CD },
    demo: { ...BTN(`<div class="b b-out fs" style="min-width:620px"><span>CHỌN</span></div>`), run: `MW.uiFillSweepSelect(q(".fs"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.9 },
  }),

  T("ui/send-morph", {
    uses: U,
    fn: mk(`if (getComputedStyle(el).position === "static") el.style.position = "relative";
var lb = el.querySelector(o.label), io = gsap.parseEase("power2.inOut"), p2 = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in"), bo = gsap.parseEase("back.out(2)"), p1 = gsap.parseEase("power1.out"), W0 = el.offsetWidth, Hh = el.offsetHeight, ns = "http://www.w3.org/2000/svg";
var green = document.createElement("div"); green.style.cssText = "position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;background:" + o.success + ";"; el.appendChild(green);
var tick = document.createElementNS(ns, "svg"), TS = Hh * 0.56; tick.setAttribute("viewBox", "0 0 100 100"); tick.style.cssText = "position:absolute;left:50%;top:50%;overflow:visible;pointer-events:none;width:" + TS + "px;height:" + TS + "px;margin:-" + TS / 2 + "px 0 0 -" + TS / 2 + "px;";
tick.innerHTML = '<path d="M24 52 L43 70 L77 33" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>'; el.appendChild(tick); var tp = tick.firstChild, TL = tp.getTotalLength(); tp.style.strokeDasharray = String(TL); tp.style.strokeDashoffset = String(TL);
var PS = Hh * 0.5, plane = document.createElement("div"); plane.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;opacity:0;z-index:5;width:" + PS + "px;height:" + PS + "px;";
plane.innerHTML = '<svg viewBox="-12 -12 24 24" width="100%" height="100%"><path d="M11 0 L-10 -9 L-5 0 L-10 9 Z" fill="#fff"/><path d="M-5 0 L11 0" stroke="#c9c0ff" stroke-width="1.5"/></svg>'; host.appendChild(plane);
var trail = []; for (var i = 0; i < 4; i++) { var d = document.createElement("div"); d.style.cssText = "position:absolute;left:0;top:0;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:#c9c0ff;opacity:0;pointer-events:none;"; host.appendChild(d); trail.push(d); }
var cx0 = el.offsetLeft + W0 / 2, cy0 = el.offsetTop + Hh / 2, FL = Math.hypot(o.fly[0], o.fly[1]), CX = o.fly[0] / 2 - o.fly[1] / FL * 2 * o.bulge, CY = o.fly[1] / 2 + o.fly[0] / FL * 2 * o.bulge;
var P = function (u) { var b = 2 * (1 - u) * u, q = u * u; return [b * CX + q * o.fly[0], b * CY + q * o.fly[1]]; }, D = function (u) { return [2 * (1 - u) * CX + 2 * u * (o.fly[0] - CX), 2 * (1 - u) * CY + 2 * u * (o.fly[1] - CY)]; };
var T = function (a, b, t) { return Math.max(0, Math.min(1, (t - a) / (b - a))); };
cursorPlan([[o.press, 0.5, 0.55, 0.12]]);
return MW.drive(tl, at, 2.95, function (t) {
  el.style.width = (W0 + (Hh - W0) * io(T(0.38, 0.68, t)) * (1 - p2(T(2.3, 2.65, t)))).toFixed(1) + "px"; lb.style.opacity = String(Math.min(1, 1 - T(0.36, 0.46, t) + T(2.45, 2.65, t)));
  var pop = T(0.62, 0.74, t), fly = pin(T(0.84, 1.32, t)), pos = fly > 0 ? P(fly) : [-o.pull * p1(T(0.74, 0.84, t)), 0], dir = D(Math.max(0.001, fly));
  plane.style.opacity = pop > 0 && fly < 1 ? "1" : "0"; gsap.set(plane, { x: cx0 + pos[0] - PS / 2, y: cy0 + pos[1] - PS / 2, rotation: Math.atan2(dir[1], dir[0]) * 180 / Math.PI, scale: bo(pop) });
  trail.forEach(function (d, i) { var f = pin(T(0.84, 1.32, t - 0.03 * (i + 1))), q = P(f); d.style.left = cx0 + q[0] + "px"; d.style.top = cy0 + q[1] + "px"; d.style.opacity = fly > 0 && fly < 1 && f > 0 ? String(0.5 * (1 - i / 4)) : "0"; });
  green.style.opacity = String(T(1.5, 1.62, t) * (1 - T(2.3, 2.45, t))); gsap.set(el, { scale: 1 + 0.12 * Math.sin(Math.PI * T(1.5, 1.75, t)) });
  tp.style.strokeDashoffset = String(TL * (1 - p2(T(1.6, 1.85, t)))); tick.style.opacity = String(1 - T(2.3, 2.4, t));
  cursorAt(t);
});`),
    options: { press: "s the button is clicked (0.3); the rest follows its own timing", fly: "[x, y] px of the flight ([632, −296])", bulge: "px the curve sags below the straight line (104)", pull: "px the plane pulls back first (16)", success: "colour on success", label: "the label", ...CO },
    defaults: { press: 0.3, fly: [632, -296], bulge: 104, pull: 16, success: "#22c06e", label: "span", ...CD },
    demo: { ...BTN(`<div class="b b-acc sm" style="width:560px;padding:0;overflow:hidden"><span>GỬI</span></div>`), run: `MW.uiSendMorph(q(".sm"), tl, 0, { cursor: ".ui-cursor" });`, duration: 3 },
  }),

  T("ui/press-3d", {
    uses: ["drive", "draw", "spring"],
    fn: mk(`var p2 = gsap.parseEase("power2.out"), sp = MW.spring(o.k, o.c), d0 = o.depth[0], d1 = o.depth[1]; cursorPlan([[o.press, 0.5, 0.5, o.release - o.press]]);
return MW.drive(tl, at, o.release + sp.duration + 0.4, function (t) {
  var d = d0; if (t > o.press && t <= o.release) d = d0 + (d1 - d0) * p2(Math.min(1, (t - o.press) / 0.1)); else if (t > o.release) d = d1 + (d0 - d1) * sp.at(t - o.release);
  gsap.set(el, { y: d0 - d }); el.style.boxShadow = "0 " + d.toFixed(2) + "px 0 " + o.side + (o.shadow ? ", " + o.shadow : ""); cursorAt(t);
});`),
    options: { depth: "[rest, pressed] px of the side band ([32, 8])", press: "s (0.7, 0.1 s power2.out)", release: "s (1.3)", k: "spring stiffness on release (420)", c: "damping (24)", side: "side band colour", shadow: "an extra shadow under it", ...CO },
    defaults: { depth: [32, 8], press: 0.7, release: 1.3, k: 420, c: 24, side: "#4b3d99", shadow: "0 50px 60px rgba(0,0,0,0.35)", ...CD },
    demo: { ...BTN(`<div class="b p3" style="background:#8b7bff;color:#fff">Nhấn mạnh</div>`), run: `MW.uiPress3d(q(".p3"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.4 },
  }),

  T("effect/confetti-button", {
    uses: ["drive", "draw", "rand"],
    fn: mk(`var lb = el.querySelector(o.label), r = MW.rand(o.seed), P = [], t0 = lb.innerHTML, flash = document.createElement("div"), rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, L = el.offsetLeft, Tp = el.offsetTop, W = el.offsetWidth, Hh = el.offsetHeight, cx = L + W / 2, cy = Tp + Hh / 2;
flash.style.cssText = "position:absolute;pointer-events:none;opacity:0;box-sizing:border-box;border:6px solid " + o.accent + ";"; host.insertBefore(flash, el);
for (var i = 0; i < o.pieces; i++) { var d = document.createElement("div"); d.style.cssText = "position:absolute;left:0;top:0;border-radius:4px;opacity:0;pointer-events:none;width:" + o.size[0] + "px;height:" + o.size[1] + "px;margin:-" + o.size[1] / 2 + "px 0 0 -" + o.size[0] / 2 + "px;background:" + o.colors[i % o.colors.length] + ";"; host.appendChild(d);
  var a = (-90 + (r() * 2 - 1) * 75) * Math.PI / 180, v = o.speed[0] + r() * (o.speed[1] - o.speed[0]); P.push({ d: d, x0: cx + (r() * 2 - 1) * o.spread, vx: v * Math.cos(a), vy: v * Math.sin(a), fl: 5 + r() * 8, ph: r() * 6.28, sp: (r() * 2 - 1) * 2, wb: r() * 6.28 }); }
cursorPlan([[o.press, 0.5, 0.55, 0.12]]);
return MW.drive(tl, at, o.press + o.fadeEnd + 0.2, function (t) {
  var u = t - o.press, on = u >= 0; el.style.background = on ? o.accent : ""; el.style.color = on ? o.ink : ""; lb.innerHTML = on ? o.doneHtml : t0; gsap.set(el, { scale: on && u < 0.22 ? 1 + 0.1 * Math.sin(Math.PI * u / 0.22) : 1 });
  var f = Math.max(0, Math.min(1, u / 0.3)), fd = o.flash * f; flash.style.left = L - fd + "px"; flash.style.top = Tp - fd + "px"; flash.style.width = W + 2 * fd + "px"; flash.style.height = Hh + 2 * fd + "px"; flash.style.borderRadius = rad + fd + "px"; flash.style.opacity = on && f < 1 ? String(1 - f) : "0";
  P.forEach(function (q) { if (!on) { q.d.style.opacity = "0"; return; } var k = (1 - Math.exp(-1.8 * u)) / 1.8, x = q.x0 + q.vx * k + o.wobble * Math.sin(q.wb + 6 * u), y = cy + q.vy * k + o.gravity * u * u;
    q.d.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + ((q.sp * u + q.ph) * 57.3).toFixed(1) + "deg) scaleX(" + Math.cos(q.fl * u + q.ph).toFixed(3) + ")"; q.d.style.opacity = String(1 - Math.max(0, Math.min(1, (u - o.fadeStart) / (o.fadeEnd - o.fadeStart)))); });
  cursorAt(t);
});`),
    options: { press: "s (0.62)", pieces: "(28)", speed: "[min, max] px a second ([440, 800]), with drag: x = v (1 − e^(−1.8 s)) / 1.8", spread: "± px from the centre (200)", gravity: "px added as gravity × s² (360)", wobble: "± px (16)", size: "[w, h] px ([32, 20])", fadeStart: "s after the launch (1.0)", fadeEnd: "(1.5)", seed: "(61)", flash: "px the outline flash grows (40)", colors: "", accent: "", ink: "label colour when filled", label: "the label", doneHtml: "the label when done", ...CO },
    defaults: { press: 0.62, pieces: 28, speed: [440, 800], spread: 200, gravity: 360, wobble: 16, size: [32, 20], fadeStart: 1, fadeEnd: 1.5, seed: 61, flash: 40, colors: ["#8b7bff", "#3dd6f5", "#ffd23d", "#3ddc84"], accent: "#8b7bff", ink: "#0b0d12", label: "span", doneHtml: '<span class="ck"></span>XONG', ...CD },
    demo: { ...BTN(`<div class="b b-out cf" style="min-width:600px"><span>HOÀN TẤT</span></div>`), run: `MW.effectConfettiButton(q(".cf"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.6 },
  }),

  T("ui/hold-fill-button", {
    uses: U,
    fn: mk(`if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden";
var lb = el.querySelector(o.label), t0 = lb.textContent, hint = o.hint ? host.querySelector(o.hint) : null, bar = o.bar ? host.querySelector(o.bar) : null, p2 = gsap.parseEase("power2.out"), bo = gsap.parseEase("back.out(2)");
var fill = document.createElement("div"), fl = document.createElement("span"), ck = document.createElement("span"); fill.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;background:" + o.accent + ";color:" + o.ink + ";";
fl.textContent = t0; ck.style.cssText = "display:inline-block;width:0.3em;height:0.55em;border:solid currentColor;border-width:0 0.12em 0.12em 0;margin:0 0.5em 0.12em 0;"; fill.appendChild(ck); fill.appendChild(fl); el.appendChild(fill);
cursorPlan(o.presses.map(function (p) { return [p[0], 0.5, 0.55, p[1] - p[0]]; }));
var doneAt = null; o.presses.forEach(function (p) { if (doneAt == null && p[1] - p[0] >= o.hold) doneAt = p[0] + o.hold; });
var F = function (t) { var f = 0; o.presses.forEach(function (p) { if (t < p[0]) return; var v = Math.min(1, (Math.min(t, p[1]) - p[0]) / o.hold); f = v >= 1 || t <= p[1] ? v : v * (1 - p2(Math.min(1, (t - p[1]) / o.cancel))); }); return f; };
return MW.drive(tl, at, o.resetAt + 0.45, function (t) {
  var f = F(t), done = doneAt != null && t >= doneAt, rs = Math.max(0, Math.min(1, (t - o.resetAt) / 0.25));
  fill.style.clipPath = "inset(0 " + (100 * (1 - f)).toFixed(2) + "% 0 0)"; fill.style.opacity = String(1 - rs); fl.textContent = done ? o.doneText : t0;
  ck.style.display = done ? "inline-block" : "none"; ck.style.transform = "rotate(45deg) scale(" + (done ? bo(Math.min(1, (t - doneAt) / 0.22)) : 0).toFixed(3) + ")";
  if (bar) gsap.set(bar, { scaleX: f * (1 - rs), transformOrigin: "0% 50%" });
  if (hint) { var h = 0; o.presses.forEach(function (p) { var u = t - p[1]; if (p[1] - p[0] < o.hold && u > 0 && u < 0.7) h = Math.min(1, u / 0.15, (0.7 - u) / 0.15); }); hint.style.opacity = String(h); }
  cursorAt(t);
});`),
    options: { hold: "s to fill, linear (1.2)", cancel: "s the fill runs back after an early release (0.25, power2.out)", presses: "[[s down, s up], ...]", resetAt: "s it fades back (3.55)", accent: "", ink: "label colour in the fill", label: "the label", hint: "a line shown after an early release", bar: "a thin bar that mirrors the fill", doneText: "", ...CO },
    defaults: { hold: 1.2, cancel: 0.25, presses: [[0.4, 1], [1.6, 3]], resetAt: 3.55, accent: "#8b7bff", ink: "#0b0d12", label: "span", hint: ".hf-h", bar: ".hf-b", doneText: "ĐÃ XÁC NHẬN", ...CD },
    demo: { ...BTN(`<div class="b b-out hf" style="min-width:700px"><span>GIỮ ĐỂ XÁC NHẬN</span></div><div class="hf-t"><div class="hf-b"></div></div><div class="hf-h">Đã thả tay: huỷ</div>`,
      `.hf-t { position: absolute; left: 500px; top: 600px; width: 400px; height: 16px; border-radius: 8px; background: #262c3a; overflow: hidden; } .hf-b { width: 100%; height: 100%; background: #8b7bff; transform: scaleX(0); }
.hf-h { position: absolute; left: 0; right: 0; top: 160px; text-align: center; font-size: 36px; font-weight: 700; color: #ffb547; opacity: 0; }`),
      run: `MW.uiHoldFillButton(q(".hf"), tl, 0, { cursor: ".ui-cursor" });`, duration: 4 },
  }),

  T("ui/focus-ring-draw", {
    uses: U,
    fn: mk(`var key = o.key ? host.querySelector(o.key) : null, io = gsap.parseEase("power2.inOut"), pin = gsap.parseEase("power2.in"), p2 = gsap.parseEase("power2.out"), ns = "http://www.w3.org/2000/svg", rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
var L = el.offsetLeft - o.offset, Tp = el.offsetTop - o.offset, W = el.offsetWidth + 2 * o.offset, Hh = el.offsetHeight + 2 * o.offset, R = Math.min(rad + o.offset, W / 2, Hh / 2);
var rp = function (x, y, w, h, r) { return "M" + (x + w / 2) + " " + y + " H" + (x + w - r) + " A" + r + " " + r + " 0 0 1 " + (x + w) + " " + (y + r) + " V" + (y + h - r) + " A" + r + " " + r + " 0 0 1 " + (x + w - r) + " " + (y + h) + " H" + (x + r) + " A" + r + " " + r + " 0 0 1 " + x + " " + (y + h - r) + " V" + (y + r) + " A" + r + " " + r + " 0 0 1 " + (x + r) + " " + y + " Z"; };
var svg = document.createElementNS(ns, "svg"), ring = document.createElementNS(ns, "path"), fl = document.createElementNS(ns, "path"), dot = document.createElementNS(ns, "circle");
svg.setAttribute("width", host.clientWidth); svg.setAttribute("height", host.clientHeight); svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;pointer-events:none;"; ring.setAttribute("d", rp(L, Tp, W, Hh, R));
[ring, fl].forEach(function (p) { p.setAttribute("fill", "none"); p.setAttribute("stroke", o.accent); p.setAttribute("stroke-width", o.stroke); p.setAttribute("stroke-linecap", "round"); svg.appendChild(p); }); dot.setAttribute("r", o.dot); dot.setAttribute("fill", o.accent); svg.appendChild(dot); host.appendChild(svg);
var PL = ring.getTotalLength(); ring.style.strokeDasharray = PL + " " + PL;
return MW.drive(tl, at, o.outAt + 0.35, function (t) {
  var p = io(Math.max(0, Math.min(1, (t - o.drawAt) / o.draw))), x = pin(Math.max(0, Math.min(1, (t - o.outAt) / 0.25))), f = Math.max(0, Math.min(1, (t - o.drawAt - o.draw) / 0.3)), d = o.flash * p2(f);
  ring.style.strokeDashoffset = String(PL * (1 - p)); ring.style.opacity = String((p > 0 ? 1 : 0) * (1 - x));
  if (p > 0 && p < 1) { var q = ring.getPointAtLength(PL * p); dot.setAttribute("cx", q.x); dot.setAttribute("cy", q.y); dot.style.opacity = "1"; } else dot.style.opacity = "0";
  fl.setAttribute("d", rp(L - d, Tp - d, W + 2 * d, Hh + 2 * d, R + d)); fl.style.opacity = f > 0 && f < 1 ? String(1 - f) : "0";
  if (key) { var k = t > o.keyAt && t < o.keyAt + 0.15 ? 1 : 0; gsap.set(key, { y: 8 * k }); key.style.filter = k ? "brightness(0.75)" : ""; }
  cursorAt(t);
});`),
    options: { offset: "px outside the button (20)", stroke: "px (8)", draw: "s (0.8, power2.inOut), clockwise from the top centre", drawAt: "s (0.45)", outAt: "s (2.25, 0.25 s power2.in)", flash: "px the closing flash grows (24)", dot: "px radius of the drawing head (9)", accent: "", key: "a key cap pressed first", keyAt: "s (0.3)", ...CO },
    defaults: { offset: 20, stroke: 8, draw: 0.8, drawAt: 0.45, outAt: 2.25, flash: 24, dot: 9, accent: "#8b7bff", key: ".fr-k", keyAt: 0.3, ...CD },
    demo: { ...BTN(`<div class="b fr" style="background:#1b2130;color:#e8ebf3;border-radius:48px">Gửi bài</div><div class="fr-k">Tab</div>`,
      `.fr-k { position: absolute; left: 600px; top: 600px; width: 200px; height: 100px; border-radius: 22px; background: #2a3142; box-shadow: 0 8px 0 #151a24; display: grid; place-items: center; font-size: 38px; font-weight: 700; color: #c9d2ea; }`, false),
      run: `MW.uiFocusRingDraw(q(".fr"), tl, 0, {});`, duration: 2.7 },
  }),

  T("ui/button-shine", {
    uses: U,
    fn: mk(`if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden";
var io = gsap.parseEase(o.ease), W = el.offsetWidth, a = document.createElement("div"), b = document.createElement("div"), span = W + o.slant + o.band + o.ahead + 60;
[[a, o.band, o.light[0]], [b, o.thin, o.light[1]]].forEach(function (q) { q[0].style.cssText = "position:absolute;top:0;left:0;height:100%;pointer-events:none;opacity:0;width:" + (q[1] + o.slant) + "px;background:rgba(255,255,255," + q[2] + ");clip-path:polygon(" + o.slant + "px 0,100% 0," + q[1] + "px 100%,0 100%);"; el.appendChild(q[0]); });
return MW.drive(tl, at, o.times[o.times.length - 1] + o.duration, function (t) {
  var x = -o.slant - o.band - o.ahead - 30, on = false; o.times.forEach(function (s) { var u = (t - s) / o.duration; if (u > 0 && u < 1) { x += span * io(u); on = true; } });
  gsap.set(a, { x: x }); gsap.set(b, { x: x + o.band + o.ahead }); a.style.opacity = b.style.opacity = on ? "1" : "0";
});`),
    options: { duration: "s per pass (0.7)", ease: "(power2.inOut)", times: "s each pass starts", band: "px (72)", thin: "px (24)", slant: "px the top edge leads (112)", ahead: "px the thin band leads (104)", light: "[band, thin] white opacity", ...CO },
    defaults: { duration: 0.7, ease: "power2.inOut", times: [0.6, 2], band: 72, thin: 24, slant: 112, ahead: 104, light: [0.5, 0.35], ...CD },
    demo: { ...BTN(`<div class="b b-acc bs" style="padding:0 140px">NÂNG CẤP</div>`, "", false), run: `MW.uiButtonShine(q(".bs"), tl, 0, {});`, duration: 3 },
  }),

  T("ui/loading-to-success", {
    uses: U,
    fn: mk(`if (getComputedStyle(el).position === "static") el.style.position = "relative";
var ns = "http://www.w3.org/2000/svg", lb = o.label ? host.querySelector(o.label) : null, io = gsap.parseEase("power2.inOut"), p2 = gsap.parseEase("power2.out"), bo = gsap.parseEase("back.out(2)"), R = o.r, S = 2 * (R + o.width + 30), t0 = lb ? lb.textContent : "";
var svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", (-S / 2) + " " + (-S / 2) + " " + S + " " + S); svg.style.cssText = "position:absolute;left:50%;top:50%;overflow:visible;pointer-events:none;width:" + S + "px;height:" + S + "px;margin:-" + S / 2 + "px 0 0 -" + S / 2 + "px;";
svg.innerHTML = '<path class="a" fill="none" stroke-linecap="round"/><circle class="d" r="0"/><path class="k" d="M' + (-R * 0.42) + ' ' + (R * 0.02) + ' L' + (-R * 0.1) + ' ' + (R * 0.34) + ' L' + (R * 0.48) + ' ' + (-R * 0.3) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; el.appendChild(svg);
var arc = svg.querySelector(".a"), disc = svg.querySelector(".d"), tk = svg.querySelector(".k"); arc.setAttribute("stroke", o.accent); arc.setAttribute("stroke-width", o.width); disc.setAttribute("fill", o.accent); tk.setAttribute("stroke", o.ink); tk.setAttribute("stroke-width", o.width);
var KL = tk.getTotalLength(); tk.style.strokeDasharray = String(KL);
var A = function (a0, a1) { if (a1 - a0 >= 2 * Math.PI - 0.001) return "M" + R + " 0 A" + R + " " + R + " 0 1 1 " + (-R) + " 0 A" + R + " " + R + " 0 1 1 " + R + " 0"; return "M" + (R * Math.cos(a0)).toFixed(2) + " " + (R * Math.sin(a0)).toFixed(2) + " A" + R + " " + R + " 0 " + (a1 - a0 > Math.PI ? 1 : 0) + " 1 " + (R * Math.cos(a1)).toFixed(2) + " " + (R * Math.sin(a1)).toFixed(2); };
return MW.drive(tl, at, o.loop, function (t) {
  var rot = 2 * Math.PI * t / o.spin, len = o.arc[0] + (o.arc[1] - o.arc[0]) * (0.5 - 0.5 * Math.cos(Math.PI * t / o.breath)), end = o.closeAt + o.close, cl = t > o.resetAt ? 0 : io(Math.max(0, Math.min(1, (t - o.closeAt) / o.close)));
  len += (2 * Math.PI - len) * cl; arc.setAttribute("d", A(rot - len / 2, rot + len / 2)); arc.style.opacity = String(t < o.resetAt ? 1 - Math.max(0, Math.min(1, (t - end) / 0.1)) : Math.max(0, Math.min(1, (t - o.resetAt - 0.15) / 0.3)));
  var rs = Math.max(0, Math.min(1, (t - o.resetAt) / 0.2)); disc.setAttribute("r", Math.max(0, (R + 8) * bo(Math.max(0, Math.min(1, (t - end) / 0.25))) * (1 - rs)).toFixed(2));
  tk.style.strokeDashoffset = String(KL * (1 - p2(Math.max(0, Math.min(1, (t - end - 0.1) / 0.25))))); tk.style.opacity = String(1 - rs); if (lb) lb.textContent = t >= end && t < o.resetAt ? o.doneText : t0;
  cursorAt(t);
});`),
    options: { r: "px spinner radius (44)", width: "px stroke (12)", spin: "s per turn, linear (0.7)", arc: "[short, long] radians ([0.7, 3.7])", breath: "s each way (0.7)", closeAt: "s the arc closes (1.3)", close: "s (0.3, power2.inOut)", resetAt: "s (2.35)", loop: "s (3)", accent: "", ink: "tick colour", label: "a line under the button", doneText: "", ...CO },
    defaults: { r: 44, width: 12, spin: 0.7, arc: [0.7, 3.7], breath: 0.7, closeAt: 1.3, close: 0.3, resetAt: 2.35, loop: 3, accent: "#8b7bff", ink: "#0b0d12", label: ".ld-l", doneText: "Xong", ...CD },
    demo: { ...BTN(`<div class="b b-out ld" style="width:560px"></div><div class="ld-l">Đang xử lý</div>`, `.ld-l { position: absolute; left: 0; right: 0; top: 560px; text-align: center; font-size: 40px; font-weight: 700; color: #8f9ab3; }`, false),
      run: `MW.uiLoadingToSuccess(q(".ld"), tl, 0, {});`, duration: 3 },
  }),

  T("ui/icon-swap-rotate", {
    uses: U,
    fn: mk(`var pl = el.querySelector(o.plus), ck = el.querySelector(o.check), lb = o.label ? host.querySelector(o.label) : null, pin = gsap.parseEase("power2.in"), bo = gsap.parseEase("back.out(1.7)"), t0 = lb ? lb.textContent : "", T = function (a, b, t) { return Math.max(0, Math.min(1, (t - a) / (b - a))); };
var c1 = o.clicks[0], c2 = o.clicks[1], mix = gsap.utils.interpolate(o.off, o.on); cursorPlan(o.clicks.map(function (c) { return [c, 0.5, 0.55, 0.12]; }));
return MW.drive(tl, at, c2 + 0.83, function (t) {
  var f = T(c1 + 0.15, c1 + 0.35, t) * (1 - T(c2 + 0.15, c2 + 0.35, t)); el.style.backgroundColor = mix(f); el.style.color = f > 0.5 ? o.ink : "";
  var po = pin(T(c1 + 0.1, c1 + 0.3, t)), ci = bo(T(c1 + 0.23, c1 + 0.53, t)), co = pin(T(c2 + 0.1, c2 + 0.3, t)), pi = bo(T(c2 + 0.23, c2 + 0.53, t)), back = t >= c2;
  gsap.set(pl, { scale: back ? pi : 1 - po, rotation: back ? -90 * (1 - pi) : 90 * po }); gsap.set(ck, { scale: back ? 1 - co : ci, rotation: back ? 90 * co : -90 * (1 - ci) });
  if (lb) lb.textContent = t >= c1 + 0.2 && t < c2 + 0.2 ? o.doneText : t0;
  cursorAt(t);
});`),
    options: { clicks: "[s on, s off] ([0.45, 1.85])", plus: "the plus", check: "the check", label: "a label under it", on: "fill when added", off: "fill before", ink: "icon colour when filled", doneText: "", ...CO },
    defaults: { clicks: [0.45, 1.85], plus: ".is-p", check: ".is-c", label: ".is-l", on: "#8b7bff", off: "#10131d", ink: "#0b0d12", doneText: "ĐÃ THÊM", ...CD },
    demo: { ...BTN(`<div class="is"><i class="is-p"><b></b><b></b></i><i class="is-c"></i></div><div class="is-l">THÊM</div>`,
      `.is { position: relative; width: 224px; height: 224px; border-radius: 64px; border: 6px solid #8b7bff; background: #10131d; color: #c9c0ff; box-sizing: border-box; } .is i { position: absolute; left: 50%; top: 50%; width: 0; height: 0; }
.is-p b { position: absolute; width: 88px; height: 16px; margin: -8px 0 0 -44px; border-radius: 8px; background: currentColor; } .is-p b + b { transform: rotate(90deg); }
.is-c::before { content: ""; position: absolute; width: 34px; height: 64px; margin: -42px 0 0 -18px; border: solid currentColor; border-width: 0 16px 16px 0; transform: rotate(45deg); } .is-c { transform: scale(0); }
.is-l { position: absolute; left: 0; right: 0; top: 560px; text-align: center; font-size: 44px; font-weight: 800; letter-spacing: 0.06em; color: #c9d2ea; }`),
      run: `MW.uiIconSwapRotate(q(".is"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.9 },
  }),

  T("motion/heartbeat", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var p1 = gsap.parseEase("power1.out"), io = gsap.parseEase("power2.inOut");
      return MW.drive(tl, at, o.period * o.cycles, function (t) {
        var ph = t % o.period, s = 1; o.beats.forEach(function (b, i) { var u = ph - b, a = o.amp[i]; if (u > 0 && u < o.rise) s = 1 + (a - 1) * p1(u / o.rise); else if (u >= o.rise && u < o.rise + o.fall) s = a + (1 - a) * io((u - o.rise) / o.fall); }); gsap.set(el, { scale: s });
      });
    },
    options: { period: "s (1.4)", beats: "s into each period ([0.15, 0.45])", amp: "peak scales ([1.2, 1.1])", rise: "s (0.08, power1.out)", fall: "s (0.22, power2.inOut)", cycles: "(3)" },
    defaults: { period: 1.4, beats: [0.15, 0.45], amp: [1.2, 1.1], rise: 0.08, fall: 0.22, cycles: 3 },
    demo: { css: `${BG}\n.st { position: absolute; inset: 0; display: grid; place-items: center; } .hb { width: 380px; height: 380px; filter: drop-shadow(0 30px 60px rgba(255, 93, 143, 0.4)); }`,
      html: `<div class="st"><svg class="hb" viewBox="0 0 24 24"><path d="M12 21 C5 15.5 2 12.3 2 8.6 C2 5.6 4.3 3.5 7 3.5 C9 3.5 10.9 4.6 12 6.4 C13.1 4.6 15 3.5 17 3.5 C19.7 3.5 22 5.6 22 8.6 C22 12.3 19 15.5 12 21 Z" fill="#ff5d8f"/></svg></div>`,
      run: `MW.motionHeartbeat(q(".hb"), tl, 0, {});`, duration: 4.2 },
  }),

  T("motion/wobble-tilt", {
    uses: U,
    fn: mk(`gsap.set(el, { transformOrigin: "50% 100%" }); cursorPlan([[o.tap, 0.5, 0.5, 0.12]]);
return MW.drive(tl, at, o.tap + o.fadeEnd, function (t) {
  var u = t - o.tap, a = u > 0 ? o.amp * Math.exp(-o.decay * u) * Math.sin(o.freq * u) * (1 - Math.max(0, Math.min(1, (u - o.fadeStart) / (o.fadeEnd - o.fadeStart)))) : 0;
  gsap.set(el, { rotation: a * 180 / Math.PI }); cursorAt(t);
});`),
    options: { tap: "s (0.5)", amp: "rad (0.24)", freq: "rad/s (9)", decay: "(2.4)", fadeStart: "s after the tap (1.5)", fadeEnd: "(1.9)", ...CO },
    defaults: { tap: 0.5, amp: 0.24, freq: 9, decay: 2.4, fadeStart: 1.5, fadeEnd: 1.9, ...CD },
    notes: "angle = amp × e^(−decay t) × sin(freq t) about the bottom centre; about a spring k 144, damping 5.6.",
    demo: { ...BTN(`<div class="b b-acc wt">Lật đật</div>`), run: `MW.motionWobbleTilt(q(".wt"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.6 },
  }),

  T("motion/elastic-drag", {
    uses: ["drive", "draw", "spring"],
    fn: mk(`var io = gsap.parseEase("power2.inOut"), sp = MW.spring(o.k, o.c), ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), ln = document.createElementNS(ns, "line"), hm = document.createElement("div"), hx = el.offsetLeft + el.offsetWidth / 2, hy = el.offsetTop + el.offsetHeight / 2;
svg.setAttribute("width", host.clientWidth); svg.setAttribute("height", host.clientHeight); svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;pointer-events:none;"; ln.setAttribute("stroke", o.accent); ln.setAttribute("stroke-linecap", "round"); ln.setAttribute("opacity", "0.55"); svg.appendChild(ln); host.insertBefore(svg, el);
hm.style.cssText = "position:absolute;pointer-events:none;box-sizing:border-box;border:4px dashed #3a4466;left:" + el.offsetLeft + "px;top:" + el.offsetTop + "px;width:" + el.offsetWidth + "px;height:" + el.offsetHeight + "px;border-radius:" + getComputedStyle(el).borderRadius + ";"; host.insertBefore(hm, svg);
var D = function (t) { if (t > o.release) { var s = sp.at(t - o.release); return [o.to[0] * (1 - s), o.to[1] * (1 - s)]; } var u = io(Math.max(0, Math.min(1, (t - o.dragAt) / o.drag))); return [o.to[0] * u, o.to[1] * u - o.bow * Math.sin(Math.PI * u)]; };
var dk = [[0, hx + o.approach[0], hy + o.approach[1]], [o.grab - 0.06, hx, hy]];
return MW.drive(tl, at, o.release + sp.duration + 0.3, function (t) {
  var p = D(t), d = Math.hypot(p[0], p[1]); gsap.set(el, { x: p[0], y: p[1] });
  ln.setAttribute("x1", hx); ln.setAttribute("y1", hy); ln.setAttribute("x2", hx + p[0]); ln.setAttribute("y2", hy + p[1]); ln.setAttribute("stroke-width", (o.tether[0] + o.tether[1] / (1 + d / o.tether[2])).toFixed(2)); ln.style.opacity = d > 2 ? "1" : "0";
  if (cur) { var c = t < o.grab ? MW.path(dk, t, "power2.out") : t <= o.release ? [hx + p[0], hy + p[1]] : [hx + o.to[0] + 120 * Math.min(1, (t - o.release) / 0.5), hy + o.to[1] + 160 * Math.min(1, (t - o.release) / 0.5)]; gsap.set(cur, { x: c[0] - 12, y: c[1] - 6, scale: t >= o.grab && t <= o.release ? 0.86 : 1, transformOrigin: "20% 10%" }); }
});`),
    options: { grab: "s (0.42)", dragAt: "s (0.5)", drag: "s (0.75, power2.inOut)", release: "s (1.45)", to: "[x, y] px dragged ([690, −184])", bow: "px the drag bows upward (54)", k: "spring stiffness home (180)", c: "damping (11): about 24 % overshoot", tether: "[base, extra, falloff px]: width = base + extra / (1 + distance / falloff) ([8, 32, 160])", accent: "", ...CO },
    defaults: { grab: 0.42, dragAt: 0.5, drag: 0.75, release: 1.45, to: [690, -184], bow: 54, k: 180, c: 11, tether: [8, 32, 160], accent: "#8b7bff", ...CD },
    demo: { ...BTN(`<div class="b b-acc ed" style="height:150px;padding:0 70px;border-radius:44px;font-size:48px">Kéo tôi</div>`, `.ed { position: absolute; left: 260px; top: 420px; }`),
      run: `MW.motionElasticDrag(q(".ed"), tl, 0, { cursor: ".ui-cursor" });`, duration: 3 },
  }),

  T("ui/press-inset", {
    uses: U,
    fn: mk(`var p2 = gsap.parseEase(o.ease); cursorPlan([[o.press, 0.5, 0.55, o.release - o.press]]);
return MW.drive(tl, at, o.release + o.up + 0.5, function (t) {
  var k = 0; if (t > o.press && t <= o.release) k = p2(Math.min(1, (t - o.press) / o.down)); else if (t > o.release) k = 1 - p2(Math.min(1, (t - o.release) / o.up));
  gsap.set(el, { y: o.y * k }); el.style.filter = k > 0.001 ? "brightness(" + (1 - 0.12 * k).toFixed(3) + ")" : "";
  el.style.boxShadow = "inset 0 " + (o.inset * k).toFixed(1) + "px " + (o.inset * k * 1.2).toFixed(1) + "px rgba(0,0,0," + (0.45 * k).toFixed(3) + "), inset 0 4px 0 rgba(255,255,255," + (0.4 * (1 - k)).toFixed(3) + "), inset 0 -4px 0 rgba(255,255,255," + (0.3 * k).toFixed(3) + ")" + (o.shadow ? ", " + o.shadow : "");
  cursorAt(t);
});`),
    options: { press: "s (0.7)", release: "s (1.6)", down: "s (0.12)", up: "s (0.25)", inset: "px of inner shadow when pressed (32)", y: "px it sinks (4)", ease: "(power2.out)", shadow: "its outer shadow", ...CO },
    defaults: { press: 0.7, release: 1.6, down: 0.12, up: 0.25, inset: 32, y: 4, ease: "power2.out", shadow: "0 24px 50px rgba(115,87,245,0.35)", ...CD },
    demo: { ...BTN(`<div class="b pi" style="background:#8b7bff;color:#fff">Ấn vào</div>`), run: `MW.uiPressInset(q(".pi"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.6 },
  }),

  T("ui/color-splash", {
    uses: U,
    fn: mk(`if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden";
var lb = el.querySelector(o.label), p2 = gsap.parseEase("power2.out"), W = el.offsetWidth, Hh = el.offsetHeight, cs = getComputedStyle(el), oldBg = cs.backgroundColor, oldInk = cs.color, rims = [], dots = [];
var layer = function (bg, ink) { var d = document.createElement("div"); d.style.cssText = "position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;background:" + bg + ";color:" + ink + ";"; d.appendChild(lb.cloneNode(true)); el.appendChild(d); return d; };
var Ls = [layer(o.on, o.onInk), layer(oldBg, oldInk)];
o.taps.forEach(function () { var r = document.createElement("div"); r.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;opacity:0;box-sizing:border-box;border:" + o.rim + "px solid #e8ebf3;"; el.appendChild(r); rims.push(r); var d = document.createElement("div"); d.style.cssText = "position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:#fff;pointer-events:none;opacity:0;"; el.appendChild(d); dots.push(d); });
var far = function (x, y) { return Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, Hh - y), Math.hypot(W - x, Hh - y)); };
cursorPlan(o.taps.map(function (tp) { return [tp[0], tp[1], tp[2], 0.12]; }));
return MW.drive(tl, at, o.taps[o.taps.length - 1][0] + o.grow + 0.4, function (t) {
  Ls.forEach(function (Ly, i) { var tp = o.taps[i]; if (!tp) { Ly.style.clipPath = "circle(0px at 0 0)"; return; } var x = W * tp[1], y = Hh * tp[2], u = p2(Math.max(0, Math.min(1, (t - tp[0]) / o.grow))), r = far(x, y) * u + (u >= 1 ? 2 : 0), rm = rims[i], dv = t - tp[0];
    Ly.style.clipPath = "circle(" + r.toFixed(1) + "px at " + x.toFixed(1) + "px " + y.toFixed(1) + "px)"; rm.style.width = rm.style.height = 2 * r + "px"; rm.style.left = x - r + "px"; rm.style.top = y - r + "px"; rm.style.opacity = u > 0 && u < 1 ? "1" : "0";
    dots[i].style.left = x + "px"; dots[i].style.top = y + "px"; dots[i].style.opacity = dv > 0 && dv < 0.3 ? String(1 - dv / 0.3) : "0"; });
  cursorAt(t);
});`),
    options: { taps: "[[s, x share, y share], ...]: the first brings the new state, the second the old one back", grow: "s to the farthest corner (0.5, power2.out), hard edge", rim: "px light rim while it grows (6)", on: "new background", onInk: "new label colour", label: "the label", ...CO },
    defaults: { taps: [[0.5, 0.25, 0.7], [1.7, 0.8, 0.3]], grow: 0.5, rim: 6, on: "#8b7bff", onInk: "#0b0d12", label: "span", ...CD },
    demo: { ...BTN(`<div class="b cs" style="background:#151a24;color:#e8ebf3;border:3px solid #2a3350;min-width:680px"><span>Đổi trạng thái</span></div>`), run: `MW.uiColorSplash(q(".cs"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.8 },
  }),

  T("ui/breathing-gradient", {
    uses: U,
    fn: mk(`var halo = document.createElement("div"), rad = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, L = el.offsetLeft, Tp = el.offsetTop, W = el.offsetWidth, Hh = el.offsetHeight;
halo.style.cssText = "position:absolute;pointer-events:none;box-sizing:border-box;border:" + o.halo + "px solid " + o.colors[1] + ";"; host.insertBefore(halo, el);
return MW.drive(tl, at, o.period * o.cycles, function (t) {
  var I = 0.5 - 0.5 * Math.cos(2 * Math.PI * t / o.period), cx = W / 2 + o.drift * Math.sin(2 * Math.PI * t / o.period), d = o.offset[0] + o.offset[1] * I;
  el.style.background = "radial-gradient(" + o.radius + "px " + o.radius + "px at " + cx.toFixed(1) + "px 50%, " + o.colors[0] + " 0%, " + o.colors[1] + " 55%, " + o.colors[2] + " 100%)"; el.style.boxShadow = "0 0 " + (o.glow[0] + o.glow[1] * I).toFixed(1) + "px " + o.colors[1];
  halo.style.left = L - d + "px"; halo.style.top = Tp - d + "px"; halo.style.width = W + 2 * d + "px"; halo.style.height = Hh + 2 * d + "px"; halo.style.borderRadius = rad + d + "px"; halo.style.opacity = String(0.15 + 0.35 * I);
});`),
    options: { period: "s, a seamless loop (2.8)", cycles: "(2)", drift: "± px the centre drifts (160)", radius: "px of the gradient (360)", glow: "[base, added] px of shadow blur ([16, 56])", halo: "px ring width (5)", offset: "[base, added] px ring offset ([24, 16])", colors: "[centre, middle, edge]", ...CO },
    defaults: { period: 2.8, cycles: 2, drift: 160, radius: 360, glow: [16, 56], halo: 5, offset: [24, 16], colors: ["#ffd23d", "#8b7bff", "#3d9bff"], ...CD },
    demo: { ...BTN(`<div class="b bg" style="color:#0b0d12;border-radius:64px;padding:0 130px">Khám phá</div>`, "", false), run: `MW.uiBreathingGradient(q(".bg"), tl, 0, {});`, duration: 5.6 },
  }),

  T("ui/press", {
    uses: ["drive", "draw", "spring"],
    fn: mk(`var p2 = gsap.parseEase("power2.out"), sp = MW.spring(o.k, o.c); cursorPlan([[o.press, 0.5, 0.55, o.release - o.press]]);
return MW.drive(tl, at, o.release + sp.duration + 0.5, function (t) {
  var s = 1; if (t > o.press && t <= o.release) s = 1 - (1 - o.down) * p2(Math.min(1, (t - o.press) / o.downTime)); else if (t > o.release) { var d0 = 1 - (1 - o.down) * p2(Math.min(1, (o.release - o.press) / o.downTime)); s = d0 + (1 - d0) * sp.at(t - o.release); }
  gsap.set(el, { scale: s }); cursorAt(t);
});`),
    options: { press: "s (0.6)", release: "s (0.75)", down: "(0.95)", downTime: "s (0.08, power2.out)", k: "spring stiffness on release (300)", c: "damping (14): about 1.3 % overshoot", ...CO },
    defaults: { press: 0.6, release: 0.75, down: 0.95, downTime: 0.08, k: 300, c: 14, ...CD, approach: [240, 160] },
    notes: "The recipe's variant releases with 0.2 s back.out.",
    demo: { ...BTN(`<div class="b b-acc pr">Tiếp tục</div>`), run: `MW.uiPress(q(".pr"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2 },
  }),

  T("ui/shape-state-morph", {
    uses: ["drive", "springs"],
    fn: function (el, tl, at, o) {
      var S = o.states, n = S.length, K = function (j) { return S.map(function (s) { return [s[0], s[j]]; }); }, W = MW.springTo(o.k, o.c, K(1)), Hh = MW.springTo(o.k, o.c, K(2)), R = MW.springTo(o.k, o.c, K(3));
      var cols = S.map(function (s) { return gsap.utils.splitColor(s[5]); }), CR = [0, 1, 2].map(function (ch) { return MW.springTo(o.k, o.c, S.map(function (s, i) { return [s[0], cols[i][ch]]; })); });
      var parts = S.map(function (s) { return s[4] ? el.querySelector(s[4]) : null; }), spin = o.spin ? el.querySelector(o.spin) : null;
      return MW.drive(tl, at, o.loop, function (t) {
        el.style.width = W(t).toFixed(1) + "px"; el.style.height = Hh(t).toFixed(1) + "px"; el.style.borderRadius = Math.max(0, R(t)).toFixed(1) + "px";
        el.style.backgroundColor = "rgb(" + CR.map(function (f) { return Math.round(Math.max(0, Math.min(255, f(t)))); }).join(",") + ")";
        var k = 0; for (var i = 0; i < n; i++) if (t >= S[i][0]) k = i; el.style.borderColor = S[k][6] || "transparent";
        var A = new Map(); parts.forEach(function (p, i) { if (!p) return; var st = S[i][0], en = i + 1 < n ? S[i + 1][0] : 1e9, a = 0;
          if (t >= st && t < en) a = (i === 0 ? 1 : Math.max(0, Math.min(1, (t - st - o.fade[0]) / (o.fade[1] - o.fade[0])))) * (1 - Math.max(0, Math.min(1, (t - (en - o.fade[2])) / (o.fade[2] - o.fade[3]))));
          A.set(p, Math.max(A.get(p) || 0, a)); });
        A.forEach(function (a, p) { p.style.opacity = String(a); p.style.filter = a > 0 && a < 1 ? "blur(" + (6 * (1 - a)).toFixed(1) + "px)" : ""; });
        if (spin) gsap.set(spin, { rotation: 360 * t / 0.8 });
      });
    },
    options: { states: "[[s, width, height, radius, content, colour, border], ...]", k: "spring stiffness (300)", c: "damping (26)", fade: "[in from, in to, out from, out to]: in after the state starts, out before the next ([0.25, 0.4, 0.15, 0.05])", spin: "part that turns (the loader)", loop: "s (5)" },
    defaults: { states: [[0, 480, 176, 88, ".sm-1", "#8b7bff", "transparent"], [1.2, 176, 176, 88, ".sm-2", "#8b7bff", "transparent"], [2.2, 224, 224, 112, ".sm-3", "#22c06e", "transparent"], [3.2, 800, 480, 56, ".sm-4", "#151a24", "#3a4466"], [4.4, 480, 176, 88, ".sm-1", "#8b7bff", "transparent"]], k: 300, c: 26, fade: [0.25, 0.4, 0.15, 0.05], spin: ".sm-2 svg", loop: 5 },
    notes: "One element, never cut: only its size, radius and colour change, each on a sum of springs; the content swaps with a short blur.",
    demo: { css: `${BG}\n.st { position: absolute; inset: 0; display: grid; place-items: center; } .sm { position: relative; box-sizing: border-box; border: 4px solid transparent; overflow: hidden; width: 480px; height: 176px; border-radius: 88px; background: #8b7bff; }
.sm > div { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); opacity: 0; } .sm-1 { font-size: 60px; font-weight: 800; color: #fff; white-space: nowrap; } .sm-2 svg { width: 100px; height: 100px; display: block; } .sm-3 svg { width: 120px; height: 120px; display: block; }
.sm-4 { width: 680px; } .sm-4 b { display: block; font-size: 52px; margin-bottom: 34px; } .sm-4 i { display: block; height: 22px; border-radius: 11px; background: #2a3350; margin-top: 22px; }`,
      html: `<div class="st"><div class="sm"><div class="sm-1">Gửi đi</div><div class="sm-2"><svg viewBox="-12 -12 24 24"><path d="M0 -9 A9 9 0 0 1 9 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></div>
<div class="sm-3"><svg viewBox="0 0 100 100"><path d="M24 52 L43 70 L77 33" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="sm-4"><b>Đã gửi tới nhóm</b><i></i><i style="width:70%"></i></div></div></div>`,
      run: `MW.uiShapeStateMorph(q(".sm"), tl, 0, {});`, duration: 5 },
  }),
];

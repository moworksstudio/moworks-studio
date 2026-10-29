// TakayuStudio, Layout & Navigation (batch 3.2): interface transitions (shared elements, modals, drawers, menus, page changes), written here
// from the site's ideas and numbers (no code of the site). Interface mock-ups that only show the idea draw on a canvas in the reference's
// 320 x 200 units (MW.stage320); motions a film applies to its own elements (page transitions, a popover, a modal) are DOM.
import { T } from "../../takayu/define.mjs";
import { scenes, demo, CURSOR } from "../../takayu/stages.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 40%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }
.ui-cursor { position: absolute; left: 0; top: 0; z-index: 30; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5)); }`;
const CV = (name, duration = 3.2, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
// a DOM app screen for the page transitions' demos
const APP = (cls, title, theme = "dark", accent = "#8b7bff") => `<section class="${cls} app ${theme}"><div class="app-bar"><b></b><span>${title}</span></div>
<div class="app-body"><div class="app-hero" style="background:${accent}"></div><div class="app-row"></div><div class="app-row" style="width:70%"></div><div class="app-row" style="width:85%"></div></div></section>`;
const APP_CSS = `.app { position: absolute; inset: 0; overflow: hidden; } .app.dark { background: #121624; color: #e8ebf3; } .app.light { background: #f3f4f8; color: #151a28; }
.app-bar { height: 150px; display: flex; align-items: center; gap: 40px; padding: 0 90px; font-size: 60px; font-weight: 800; } .app-bar b { width: 70px; height: 70px; border-radius: 20px; background: currentColor; opacity: 0.2; }
.app-body { padding: 30px 90px; } .app-hero { height: 380px; border-radius: 40px; margin-bottom: 50px; } .app-row { height: 54px; border-radius: 27px; background: currentColor; opacity: 0.14; margin-bottom: 34px; }`;

export default [
  T("ui/shared-element-hero", {
    kind: "block",
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut");
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var p = io(Math.max(0, Math.min(1, (t - o.at) / o.duration))) * (1 - io(Math.max(0, Math.min(1, (t - o.backAt) / o.duration))));
        MW.rr(c, 30, 22, 260, 156, 10); c.fillStyle = "#151a28"; c.fill(); c.strokeStyle = "#2a3350"; c.lineWidth = 1; c.stroke(); c.fillStyle = "#222a42"; c.fillRect(30, 22, 260, 14);
        [0, 1, 2].forEach(function (i) { c.fillStyle = "#3a4466"; c.beginPath(); c.arc(40 + i * 8, 29, 2.5, 0, 2 * Math.PI); c.fill(); });
        c.setLineDash([3, 3]); c.strokeStyle = "#4a5478"; MW.rr(c, 160 - 88 - 21, 100 + 20 - 16, 42, 32, 6); c.stroke(); MW.rr(c, 160 + 54 - 36, 100 - 17 - 27.5, 72, 55, 6); c.stroke(); c.setLineDash([]);
        c.globalAlpha = 0.5 * (1 - p); c.strokeStyle = "#6c778b"; c.beginPath(); c.moveTo(100, 104); c.quadraticCurveTo(140, 80, 168, 84); c.stroke(); c.globalAlpha = 1;
        for (var r = 0; r < 3; r++) { c.fillStyle = "#222a42"; MW.rr(c, 100, 130 + r * 12 - 20, 60, 6, 3); c.globalAlpha = 1 - p; c.fill(); } c.globalAlpha = p; c.fillStyle = "#2a3350"; MW.rr(c, 186, 120, 90, 7, 3.5); c.fill(); MW.rr(c, 186, 134, 60, 7, 3.5); c.fill(); c.globalAlpha = 1;
        var x = 160 + (-88 + 142 * p), y = 100 + (20 - 37 * p), s = 0.55 + 0.9 * p, w = 44 * s, h = 34 * s;
        MW.rr(c, x - w / 2, y - h / 2, w, h, 12 + (5 - 12) * p); var g = c.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2); g.addColorStop(0, "#a693ff"); g.addColorStop(1, "#6a4cf0"); c.fillStyle = g; c.fill();
      });
    },
    options: { at: "s (0.4)", duration: "s (0.65), in-out", backAt: "s it flies back (1.9)", loop: "s (3.2)" }, defaults: { at: 0.4, duration: 0.65, backAt: 1.9, loop: 3.2 },
    demo: CV("uiSharedElementHero", 3.2),
  }),

  T("transition/takayu-crossfade", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, io = gsap.parseEase(o.ease);
      return MW.drive(tl, at, o.duration, function (t) { var p = io(t / o.duration); el.style.opacity = String(p); el.style.visibility = p > 0 ? "visible" : "hidden"; if (out) out.style.opacity = String(1 - p); });
    },
    options: { duration: "s (0.52)", ease: "power2.inOut", from: "the outgoing scene" }, defaults: { duration: 0.52, ease: "power2.inOut", from: null },
    notes: "Unlike the dissolve, the outgoing scene fades out at the same time (no movement, no empty frame).",
    demo: demo(scenes(), `MW.transitionTakayuCrossfade(q(".tk-b"), tl, 1.2, {});`, 3),
  }),

  T("motion/flip-reorder", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var tiles = Array.prototype.slice.call(el.children), io = MW.ez("in-out"), pos = tiles.map(function (t) { return [t.offsetLeft, t.offsetTop]; }), order = o.order || tiles.map(function (_, i) { return tiles.length - 1 - i; });
      // tile i goes to the slot order[i] held, at once (FLIP: measured before, moved by transforms)
      return MW.drive(tl, at, o.duration + (o.backAt == null ? 0 : o.backAt - o.duration + o.duration), function (t) {
        var p = io(Math.max(0, Math.min(1, t / o.duration))); if (o.backAt != null) p *= 1 - io(Math.max(0, Math.min(1, (t - o.backAt) / o.duration)));
        tiles.forEach(function (tt, i) { var a = pos[i], b = pos[order[i]]; gsap.set(tt, { x: (b[0] - a[0]) * p, y: (b[1] - a[1]) * p }); });
      });
    },
    options: { order: "the slot each tile moves to (default: reversed)", duration: "s (1.19)", backAt: "s after the start to move back (null: stay)" }, defaults: { order: null, duration: 1.19, backAt: null },
    demo: { css: `${BG}\n.fr { position: absolute; left: 50%; top: 50%; display: grid; grid-template-columns: repeat(3, 290px); gap: 60px; transform: translate(-50%, -50%); }
.fr div { height: 184px; border-radius: 32px; background: #1b2130; border: 3px solid #2a3350; display: grid; place-items: center; font-size: 80px; font-weight: 900; font-variant-numeric: tabular-nums; } .fr div:first-child { background: linear-gradient(160deg, #a693ff, #6a4cf0); border-color: transparent; }`,
      html: `<div class="gm"><div class="fr">${["01", "02", "03", "04", "05", "06"].map((n) => `<div>${n}</div>`).join("")}</div></div>`, run: `MW.motionFlipReorder(q(".fr"), tl, 0.31, { backAt: 2.2 });`, duration: 3.8 },
  }),

  T("ui/card-to-modal", {
    kind: "block",
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), out = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in"), cols = ["#a693ff", "#3dd6f5", "#ffd23d", "#ff5d8f"];
      var cl = function (a, b, t) { return Math.max(0, Math.min(1, (t - a) / (b - a))); }, L = function (a, b, p) { return a + (b - a) * p; };
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var m = io(cl(0.55, 1.15, t)) * (1 - io(cl(2.25, 2.65, t))), bd = 0.66 * out(cl(0.65, 1.12, t)) * (1 - pin(cl(2.25, 2.55, t))), ct = cl(1.0, 1.28, t) * (1 - cl(2.06, 2.2, t));
        for (var i = 0; i < 4; i++) { if (i === 0) continue; MW.rr(c, 22 + 72 * i, 62, 60, 72, 6); c.fillStyle = "#1b2130"; c.fill(); c.fillStyle = cols[i]; MW.rr(c, 28 + 72 * i, 68, 48, 28, 4); c.fill(); c.fillStyle = "#3a4466"; c.fillRect(28 + 72 * i, 104, 36, 5); c.fillRect(28 + 72 * i, 114, 26, 5); }
        c.fillStyle = "rgba(5,6,10," + bd + ")"; c.fillRect(0, 0, 320, 200);
        var x = L(22, 60, m), y = L(62, 26, m), w = L(60, 200, m), h = L(72, 144, m), r = L(6, 12, m), pd = L(6, 12, m), ih = L(28, 52, m), tb = L(36, 96, m);
        MW.rr(c, x, y, w, h, r); c.fillStyle = "#1b2130"; c.fill(); c.strokeStyle = m > 0.01 ? "#3a4466" : "transparent"; c.stroke();
        c.fillStyle = cols[0]; MW.rr(c, x + pd, y + pd, w - 2 * pd, ih, 4 + 4 * m); c.fill(); c.fillStyle = "#c9d2ea"; MW.rr(c, x + pd, y + pd + ih + 8, tb, 6, 3); c.fill();
        if (ct > 0) { c.globalAlpha = ct; var dy = 6 * (1 - ct); c.fillStyle = "#3a4466"; c.fillRect(x + pd, y + pd + ih + 22 + dy, 150, 5); c.fillRect(x + pd, y + pd + ih + 32 + dy, 110, 5); c.fillStyle = "#8b7bff"; MW.rr(c, x + w - pd - 50, y + h - pd - 16 + dy, 50, 16, 8); c.fill(); MW.txt(c, "Mua", x + w - pd - 25, y + h - pd - 8 + dy, 7, "#fff", 800);
          c.strokeStyle = "#e8ebf3"; c.lineWidth = 1.5; var X = x + w - 14, Y = y + 14 + dy; c.beginPath(); c.moveTo(X - 4, Y - 4); c.lineTo(X + 4, Y + 4); c.moveTo(X + 4, Y - 4); c.lineTo(X - 4, Y + 4); c.stroke(); c.globalAlpha = 1; }
        var cur = MW.path([[0, 250, 180], [0.1, 250, 180], [0.4, 50, 96], [1.5, 50, 96], [2.0, 246, 40], [2.6, 246, 40], [3.2, 250, 180]], t); MW.cursor(c, cur[0], cur[1], (t > 0.42 && t < 0.52) || (t > 2.04 && t < 2.14) ? 0.9 : 1);
      });
    },
    options: { loop: "s (3.4)" }, defaults: { loop: 3.4 },
    demo: CV("uiCardToModal", 3.4),
  }),

  T("ui/tab-indicator-stretch", {
    kind: "block",
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, out = gsap.parseEase("power2.out"), X = [100, 160, 220], names = o.labels, W = [];
      c.font = "800 12px Inter, sans-serif"; names.forEach(function (n) { W.push(c.measureText(n).width); });
      var moves = [[0.4, 0, 1], [1.5, 1, 2], [2.6, 2, 0]], edge = function (i) { return [X[i] - W[i] / 2, X[i] + W[i] / 2]; };
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); MW.rr(c, 50, 40, 220, 130, 12); c.fillStyle = "#151a28"; c.fill(); c.strokeStyle = "#2a3350"; c.lineWidth = 1; c.stroke();
        var L = edge(0)[0], R = edge(0)[1], cur = 0, last = -9, from = 0;
        moves.forEach(function (m) { if (t < m[0]) return; var a = edge(m[1]), b = edge(m[2]), right = m[2] > m[1], lead = out(Math.min(1, (t - m[0]) / 0.34)), trail = out(Math.max(0, Math.min(1, (t - m[0] - 0.14) / 0.38)));
          if (right) { R = a[1] + (b[1] - a[1]) * lead; L = a[0] + (b[0] - a[0]) * trail; } else { L = a[0] + (b[0] - a[0]) * lead; R = a[1] + (b[1] - a[1]) * trail; } cur = m[2]; last = m[0]; from = m[1]; });
        var mid = (L + R) / 2;
        names.forEach(function (n, i) { var near = Math.abs(mid - X[i]) < 46 ? 1 - Math.abs(mid - X[i]) / 46 : 0; MW.txt(c, n, X[i], 62, 12, gsap.utils.interpolate("#6c778b", "#ffffff", near), 800); });
        c.fillStyle = "#8b7bff"; MW.rr(c, L, 72, R - L, 3, 1.5); c.fill(); c.fillStyle = "#222a42"; c.fillRect(50, 76, 220, 1);
        var d = t - last, show = function (k, a) { c.globalAlpha = a; [[0, 120], [1, 90], [2, 105]].forEach(function (r) { c.fillStyle = k === 0 ? "#3a4466" : k === 1 ? "#4a3f7a" : "#2f4a55"; MW.rr(c, 70, 92 + r[0] * 20, r[1] - k * 10, 10, 5); c.fill(); }); c.globalAlpha = 1; };
        if (last < 0) show(0, 1); else { if (d < 0.12) show(from, 1 - d / 0.12); show(cur, Math.max(0, Math.min(1, (d - 0.1) / 0.22))); }
        var cp = MW.path([[0, 160, 150], [0.15, 160, 150], [0.3, 160, 64], [1.2, 160, 64], [1.4, 220, 64], [2.3, 220, 64], [2.5, 100, 64]], t); MW.cursor(c, cp[0] + 4, cp[1] + 4, 1);
      });
    },
    options: { labels: "the three tabs", loop: "s (3.6)" }, defaults: { labels: ["TỔNG QUAN", "DỰ ÁN", "NHÓM"], loop: 3.6 },
    demo: CV("uiTabIndicatorStretch", 3.6),
  }),

  T("ui/filter-reflow-grid", {
    kind: "block",
    uses: ["drive", "spring", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, sp = MW.spring(220, 22), pin = gsap.parseEase("power2.in"), bk = gsap.parseEase("back.out");
      var slot = function (k) { return [64 + 68 * (k % 3), 70 + 52 * Math.floor(k / 3)]; }, keep = [0, 2, 3, 5];
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear();
        var on = t >= 0.3 && t < 2.2; MW.rr(c, 52, 22, 64, 20, 10); c.fillStyle = on ? "#8b7bff" : "#222a42"; c.fill(); MW.txt(c, "LỌC", 84, 32.5, 9, "#fff", 800);
        MW.rr(c, 124, 22, 74, 20, 10); c.fillStyle = !on ? "#3a4466" : "#222a42"; c.fill(); MW.txt(c, "TẤT CẢ", 161, 32.5, 9, "#fff", 800);
        for (var i = 0; i < 6; i++) {
          var k = keep.indexOf(i), p = slot(i), a = 1, s = 1, accent = false;
          if (k < 0) { var u = pin(Math.max(0, Math.min(1, (t - 0.4) / 0.22))), b = Math.max(0, Math.min(1, (t - 2.6) / 0.3)); s = t < 2.6 ? 1 - 0.3 * u : 0.7 + 0.3 * bk(b); a = t < 2.6 ? 1 - u : Math.min(1, (t - 2.6) / 0.15); }
          else { var q = slot(k), g = t >= 0.62 + 0.04 * k ? sp.at(t - 0.62 - 0.04 * k) : 0, back = t >= 2.35 + 0.04 * k ? sp.at(t - 2.35 - 0.04 * k) : 0, f = g * (1 - back); p = [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]; accent = f > 0.5; }
          if (a <= 0) continue; c.globalAlpha = a; c.save(); c.translate(p[0], p[1]); c.scale(s, s); MW.rr(c, -28, -20, 56, 40, 6); c.fillStyle = accent ? "#6a4cf0" : "#1b2130"; c.fill(); c.strokeStyle = accent ? "#a693ff" : "#2a3350"; c.lineWidth = 1; c.stroke();
          MW.txt(c, "0" + (i + 1), 0, 0.5, 13, "#e8ebf3", 900); c.restore(); c.globalAlpha = 1;
        }
        var cp = MW.path([[0, 250, 170], [0.1, 250, 170], [0.26, 84, 34], [2.0, 84, 34], [2.2, 160, 34]], t); MW.cursor(c, cp[0] + 3, cp[1] + 3, (t > 0.26 && t < 0.36) || (t > 2.2 && t < 2.3) ? 0.9 : 1);
      });
    },
    options: { loop: "s (3.4)" }, defaults: { loop: 3.4 },
    demo: CV("uiFilterReflowGrid", 3.4),
  }),

  T("transition/route-slide", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, io = gsap.parseEase("power2.inOut"), div = document.createElement("div");
      div.style.cssText = "position:absolute;left:0;top:0;bottom:0;width:5px;background:rgba(255,255,255,0.25);"; el.appendChild(div);
      return MW.drive(tl, at, o.backAt == null ? o.duration : o.backAt + o.duration, function (t) {
        var p = io(Math.max(0, Math.min(1, t / o.duration))); if (o.backAt != null) p *= 1 - io(Math.max(0, Math.min(1, (t - o.backAt) / o.duration)));
        gsap.set(el, { xPercent: 100 * (1 - p) }); if (out) { if (o.parallax) { gsap.set(out, { xPercent: -18 * p }); out.style.opacity = String(1 - 0.6 * p); } else gsap.set(out, { xPercent: -100 * p }); }
      });
    },
    options: { duration: "s (0.6), in-out", backAt: "s after the start to slide back the same way (null: stay)", parallax: "true: the old page moves only −18 % and dims (the push variant)", from: "the outgoing page" },
    defaults: { duration: 0.6, backAt: null, parallax: false, from: null },
    demo: { css: `${BG}\n${APP_CSS}\n.rs-win { position: absolute; inset: 0; overflow: hidden; }`, html: `<div class="gm rs-win">${APP("pg1", "Hộp thư")}${APP("pg2", "Chi tiết thư", "dark", "#3dd6f5")}</div>${CURSOR}`,
      run: `var c = q(".ui-cursor"); tl.fromTo(c, { x: 1500, y: 900 }, { x: 700, y: 820, duration: 0.3, ease: "power2.inOut", immediateRender: true }, 0); tl.to(c, { x: 150, y: 70, duration: 0.5, ease: "power2.inOut" }, 1.2);
MW.transitionRouteSlide(q(".pg2"), tl, 0.4, { backAt: 1.5 });`, duration: 3 },
  }),

  T("transition/cover-wipe", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, ease = MW.ez(o.ease), panel = document.createElement("div"), T = o.duration;
      panel.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:8;background:" + o.color + ";transform:scaleX(0);"; el.parentNode.appendChild(panel);
      return MW.drive(tl, at, T, function (t) {
        var a = 0.48 * T, sw = 0.5 * T, b = 0.52 * T, s, org;
        if (t < a) { s = ease(t / a); org = "0% 50%"; } else if (t < b) { s = 1; org = "100% 50%"; } else { s = 1 - ease((t - b) / (T - b)); org = "100% 50%"; }
        panel.style.transformOrigin = org; panel.style.transform = "scaleX(" + (t <= 0 || t >= T ? 0 : s) + ")";
        el.style.visibility = t >= sw ? "visible" : "hidden"; if (out) out.style.visibility = t >= sw ? "hidden" : "visible";
      });
    },
    options: { duration: "s (0.78): covers left to right, the scenes swap while covered, then it leaves to the right", color: "panel colour", ease: "house, cubic-bezier(.83,0,.17,1) (ease-in-out quint)", from: "the outgoing scene" },
    defaults: { duration: 0.78, color: "#8b7bff", ease: "house", from: null },
    demo: demo(scenes(), `MW.transitionCoverWipe(q(".tk-b"), tl, 1.1, {});`, 3),
  }),

  T("ui/sidebar-drawer", {
    kind: "block",
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, out = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in");
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); c.save(); MW.rr(c, 40, 27, 240, 146, 10); c.clip(); c.fillStyle = "#151a28"; c.fillRect(40, 27, 240, 146);
        c.fillStyle = "#222a42"; c.fillRect(40, 27, 240, 22); c.strokeStyle = "#c9d2ea"; c.lineWidth = 1.6; [33, 38, 43].forEach(function (y) { c.beginPath(); c.moveTo(50, y); c.lineTo(62, y); c.stroke(); });
        MW.txt(c, "Dự án của tôi", 120, 38.5, 9, "#e8ebf3", 800);
        c.fillStyle = "#1b2130"; MW.rr(c, 54, 60, 104, 100, 8); c.fill(); MW.rr(c, 166, 60, 100, 100, 8); c.fill(); c.fillStyle = "#3dd6f5"; MW.rr(c, 62, 68, 88, 44, 5); c.fill(); c.fillStyle = "#ffd23d"; MW.rr(c, 174, 68, 84, 44, 5); c.fill();
        var p = out(Math.max(0, Math.min(1, (t - 0.45) / 0.65))) * (1 - pin(Math.max(0, Math.min(1, (t - 2.05) / 0.4)))), bd = 0.62 * out(Math.max(0, Math.min(1, (t - 0.53) / 0.65))) * (1 - pin(Math.max(0, Math.min(1, (t - 2.05) / 0.35))));
        c.fillStyle = "rgba(5,6,10," + bd + ")"; c.fillRect(40, 27, 240, 146);
        var x = 40 - 104 * (1 - p); c.fillStyle = "#1b2130"; c.fillRect(x, 27, 104, 146); c.fillStyle = "#8b7bff"; MW.rr(c, x + 8, 36, 88, 18, 9); c.fill(); MW.txt(c, "MENU", x + 52, 45.5, 8, "#fff", 900);
        for (var i = 0; i < 4; i++) { c.fillStyle = "#3a4466"; MW.rr(c, x + 12, 66 + i * 20, 10, 10, 3); c.fill(); MW.rr(c, x + 28, 68 + i * 20, 50 - i * 6, 6, 3); c.fill(); }
        c.restore(); var cp = MW.path([[0, 200, 180], [0.1, 200, 180], [0.3, 56, 38], [1.6, 56, 38], [1.9, 230, 120], [2.6, 230, 120], [3.2, 200, 180]], t); MW.cursor(c, cp[0], cp[1], (t > 0.3 && t < 0.4) || (t > 1.9 && t < 2.0) ? 0.9 : 1);
      });
    },
    options: { loop: "s (3.2)" }, defaults: { loop: 3.2 },
    demo: CV("uiSidebarDrawer", 3.2),
  }),

  T("ui/command-palette", {
    kind: "block",
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, out = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in");
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); c.fillStyle = "#151a28"; MW.rr(c, 20, 16, 280, 168, 10); c.fill(); for (var r = 0; r < 5; r++) { c.fillStyle = "#1b2130"; MW.rr(c, 36, 40 + r * 26, 248, 16, 6); c.fill(); }
        var d = t - o.at, p = out(Math.max(0, Math.min(1, d / 0.52))), q = 1 - pin(Math.max(0, Math.min(1, (t - o.closeAt) / 0.2))), a = p * q;
        if (a <= 0) return; c.fillStyle = "rgba(5,6,10," + 0.5 * a + ")"; c.fillRect(20, 16, 280, 168);
        var w = 230, h = 140, x = 45, y = 30;
        c.save(); c.translate(160, y - 18 * (1 - p)); c.scale(0.94 + 0.06 * p, 0.35 + 0.65 * p); c.globalAlpha = a; MW.rr(c, -w / 2, 0, w, h, 9); c.fillStyle = "#222a42"; c.fill(); c.strokeStyle = "#3a4466"; c.lineWidth = 1; c.stroke(); c.restore();
        c.globalAlpha = a; MW.rr(c, x + 10, y + 10, w - 20, 22, 7); c.fillStyle = "#151a28"; c.fill(); MW.txt(c, "Tìm lệnh…", x + 22, y + 21.5, 9, "#8f9ab3", 600, "left");
        ["Tạo dự án mới", "Mở thư viện chuyển động", "Xuất video"].forEach(function (s, i) { var u = Math.max(0, Math.min(1, (d - 0.156 - 0.036 * i) / 0.13)) * q; c.globalAlpha = u; var yy = y + 46 + i * 28 + 6 * (1 - u); MW.rr(c, x + 10, yy, w - 20, 22, 6); c.fillStyle = i === 0 ? "#3a3566" : "#1b2130"; c.fill(); MW.txt(c, s, x + 22, yy + 11.5, 9, "#e8ebf3", 700, "left"); });
        c.globalAlpha = 1;
      });
    },
    options: { at: "s it opens (0.4)", closeAt: "s (2.6)", loop: "s (3.2)" }, defaults: { at: 0.4, closeAt: 2.6, loop: 3.2 },
    demo: CV("uiCommandPalette", 3.2),
  }),

  T("ui/dropdown-menu", {
    kind: "block",
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, out = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in");
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var x = 100, y = 36, m = out(Math.max(0, Math.min(1, (t - 0.4) / 0.48))) * (1 - pin(Math.max(0, Math.min(1, (t - 1.92) / 0.26)))), open = t > 0.35 && t < 2.1;
        MW.rr(c, x, y, 120, 28, 8); c.fillStyle = "#8b7bff"; c.fill(); MW.txt(c, "Sắp xếp theo", x + 12, y + 14.5, 10, "#fff", 800, "left");
        c.save(); c.translate(x + 104, y + 14); c.rotate(Math.PI * Math.min(1, m * 1.2)); c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(-4, -2); c.lineTo(0, 2); c.lineTo(4, -2); c.stroke(); c.restore();
        if (m > 0.005) { c.save(); c.translate(0, y + 32); c.scale(1, 0.08 + 0.92 * m); c.globalAlpha = m; MW.rr(c, x, 0, 120, 100, 8); c.fillStyle = "#222a42"; c.fill(); c.strokeStyle = "#3a4466"; c.stroke(); c.restore();
          ["Mới nhất", "Phổ biến", "Tên A–Z", "Dung lượng"].forEach(function (s, i) { var u = Math.max(0, Math.min(1, (t - 0.62 - 0.024 * i) / 0.18)) * (1 - Math.max(0, Math.min(1, (t - 1.88) / 0.08))); if (u <= 0) return; c.globalAlpha = u; var yy = y + 36 + 22 * i + 4 * (1 - u) + 4;
            if (i === 1 && t > 1.66) { c.fillStyle = "#3a3566"; MW.rr(c, x + 4, yy - 2, 112, 20, 5); c.fill(); }
            MW.txt(c, s, x + 24, yy + 8, 9, "#e8ebf3", 700, "left"); if (i === 0) { c.strokeStyle = "#a693ff"; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x + 10, yy + 8); c.lineTo(x + 13, yy + 11); c.lineTo(x + 18, yy + 4); c.stroke(); } c.globalAlpha = 1; }); }
        var cp = MW.path([[0, 250, 170], [0.1, 250, 170], [0.32, 180, 52], [1.4, 180, 52], [1.66, 150, 104]], t); MW.cursor(c, cp[0], cp[1], t > 0.32 && t < 0.42 ? 0.9 : 1); void open;
      });
    },
    options: { loop: "s (2.6)" }, defaults: { loop: 2.6 },
    demo: CV("uiDropdownMenu", 2.6),
  }),

  T("ui/list-to-detail", {
    kind: "block",
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), L = function (a, b, p) { return a + (b - a) * p; }, cols = ["#3dd6f5", "#a693ff", "#ffd23d"];
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var m = io(Math.max(0, Math.min(1, (t - 0.45) / 0.82))) * (1 - io(Math.max(0, Math.min(1, (t - 2.15) / 0.6))));
        [0, 2].forEach(function (i) { c.globalAlpha = 1 - 0.75 * m; MW.rr(c, 24, 40 + 46 * i, 128, 38, 8); c.fillStyle = "#1b2130"; c.fill(); c.fillStyle = cols[i]; MW.rr(c, 29, 45 + 46 * i, 28, 28, 5); c.fill(); c.fillStyle = "#c9d2ea"; MW.rr(c, 64, 50 + 46 * i, 60, 6, 3); c.fill(); c.fillStyle = "#3a4466"; MW.rr(c, 64, 62 + 46 * i, 44, 5, 2.5); c.fill(); }); c.globalAlpha = 1;
        if (m > 0.01) { c.setLineDash([3, 3]); c.strokeStyle = "#4a5478"; MW.rr(c, 24, 86, 128, 38, 8); c.stroke(); c.setLineDash([]); }
        var x = L(24, 64, m), y = L(86, 24, m), w = L(128, 192, m), h = L(38, 148, m), r = L(8, 15, m), pd = L(5, 10, m), tw = L(28, w - 2 * pd, m), th = L(28, 64, m);
        MW.rr(c, x, y, w, h, r); c.fillStyle = "#1b2130"; c.fill(); c.strokeStyle = m > 0.01 ? "#3a4466" : "transparent"; c.lineWidth = 1; c.stroke();
        c.fillStyle = cols[1]; MW.rr(c, x + pd, y + pd, tw, th, L(5, 9, m)); c.fill();
        var tx = L(x + 40, x + pd, m), ty = L(y + 10, y + pd + th + 10, m); c.fillStyle = "#c9d2ea"; MW.rr(c, tx, ty, L(60, 100, m), 6, 3); c.fill();
        var bl = Math.max(0, (m - 0.7) / 0.3); if (bl > 0) { c.globalAlpha = bl; c.fillStyle = "#3a4466"; [0, 1, 2].forEach(function (k) { MW.rr(c, x + pd, ty + 16 + k * 12, [160, 140, 120][k], 5, 2.5); c.fill(); }); c.globalAlpha = 1; }
        var cp = MW.path([[0, 250, 170], [0.1, 250, 170], [0.32, 120, 108], [1.9, 120, 108], [2.15, 250, 30]], t); MW.cursor(c, cp[0], cp[1], t > 0.34 && t < 0.44 ? 0.9 : 1);
      });
    },
    options: { loop: "s (3.2)" }, defaults: { loop: 3.2 },
    demo: CV("uiListToDetail", 3.2),
  }),

  T("ui/popover-anchor", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in");
      el.style.transformOrigin = o.origin;
      return MW.drive(tl, at, o.closeAt + 0.36, function (t) {
        var p = out(Math.max(0, Math.min(1, t / 0.52))), q = 1 - pin(Math.max(0, Math.min(1, (t - o.closeAt) / 0.36))), k = p * q;
        gsap.set(el, { scale: 0.94 + 0.06 * k }); el.style.opacity = String(k); el.style.visibility = t > 0 && (t < o.closeAt + 0.36) ? "visible" : "hidden";
      });
    },
    options: { origin: "the anchored corner (0% 100%: bottom-left)", closeAt: "s after opening to close (1.4); 0.36 s ease-in, then hidden" }, defaults: { origin: "0% 100%", closeAt: 1.4 },
    demo: { css: `${BG}\n${APP_CSS}\n.pa-btn { position: absolute; left: 860px; top: 690px; width: 130px; height: 130px; border-radius: 50%; background: #222a42; display: grid; place-items: center; font-size: 34px; font-weight: 900; color: #c9d2ea; z-index: 3; letter-spacing: 4px; }
.pa-pop { position: absolute; left: 925px; top: 290px; width: 640px; height: 370px; border-radius: 50px; background: #222a42; border: 3px solid #3a4466; padding: 40px; box-sizing: border-box; visibility: hidden; z-index: 4; box-shadow: 0 30px 80px rgba(0,0,0,0.5); }
.pa-pop i { display: block; height: 60px; border-radius: 30px; background: #8b7bff; margin-bottom: 36px; width: 70%; } .pa-pop b { display: block; height: 30px; border-radius: 15px; background: #3a4466; margin-bottom: 26px; }`,
      html: `<div class="gm">${APP("pa-app", "Thư viện")}<div class="pa-btn">•••</div><div class="pa-pop"><i></i><b></b><b style="width:80%"></b><b style="width:60%"></b></div></div>${CURSOR}`,
      run: `var c = q(".ui-cursor"); tl.fromTo(c, { x: 1400, y: 1000 }, { x: 930, y: 760, duration: 0.3, ease: "power2.inOut", immediateRender: true }, 0); MW.uiPopoverAnchor(q(".pa-pop"), tl, 0.4, {});`, duration: 2.6 },
  }),

  T("ui/dialog-backdrop", {
    kind: "block",
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, out = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in");
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); MW.rr(c, 30, 20, 260, 160, 10); c.fillStyle = "#151a28"; c.fill(); MW.txt(c, "Cài đặt", 50, 40, 11, "#e8ebf3", 800, "left"); for (var r = 0; r < 4; r++) { c.fillStyle = "#1b2130"; MW.rr(c, 46, 56 + r * 24, 140, 14, 6); c.fill(); }
        c.fillStyle = "#8b7bff"; MW.rr(c, 214, 140, 60, 24, 12); c.fill(); MW.txt(c, "Mở", 244, 152.5, 10, "#fff", 800);
        var dlg = out(Math.max(0, Math.min(1, (t - 0.4) / 0.62))) * (1 - pin(Math.max(0, Math.min(1, (t - 2.22) / 0.2)))), bd = 0.65 * Math.max(0, Math.min(1, (t - 0.4) / 0.75)) * (1 - Math.max(0, Math.min(1, (t - 2.22) / 0.3)));
        c.fillStyle = "rgba(5,6,10," + bd + ")"; MW.rr(c, 30, 20, 260, 160, 10); c.fill();
        if (dlg > 0) { c.globalAlpha = dlg; var y = 58 + 18 * (1 - dlg); MW.rr(c, 85, y, 150, 84, 10); c.fillStyle = "#222a42"; c.fill(); c.strokeStyle = "#3a4466"; c.lineWidth = 1; c.stroke();
          MW.txt(c, "Xoá dự án?", 97, y + 16, 10, "#e8ebf3", 800, "left"); c.fillStyle = "#3a4466"; MW.rr(c, 97, y + 30, 120, 5, 2.5); c.fill(); MW.rr(c, 97, y + 40, 90, 5, 2.5); c.fill();
          MW.rr(c, 125, y + 58, 48, 18, 9); c.fillStyle = "#1b2130"; c.fill(); MW.txt(c, "Huỷ", 149, y + 67.5, 8, "#c9d2ea", 800); MW.rr(c, 179, y + 58, 46, 18, 9); c.fillStyle = "#8b7bff"; c.fill(); MW.txt(c, "OK", 202, y + 67.5, 8, "#fff", 900);
          var fr = Math.max(0, Math.min(1, (t - 1.02) / 0.14)); if (fr > 0) { c.globalAlpha = dlg * fr; c.strokeStyle = "#d6ccff"; c.lineWidth = 1.5; MW.rr(c, 176, y + 55, 52, 24, 12); c.stroke(); } c.globalAlpha = 1; }
        var cp = MW.path([[0, 250, 190], [0.1, 250, 190], [0.28, 244, 152], [1.4, 244, 152], [1.7, 60, 160], [1.9, 60, 160], [2.12, 150, 140]], t); MW.cursor(c, cp[0], cp[1], (t > 0.3 && t < 0.4) || (t > 1.7 && t < 1.8) || (t > 2.12 && t < 2.22) ? 0.9 : 1);
      });
    },
    options: { loop: "s (2.8)" }, defaults: { loop: 2.8 },
    notes: "The backdrop runs on its own linear rate; a click on it does nothing (the dialog is modal); focus sits on OK.",
    demo: CV("uiDialogBackdrop", 2.8),
  }),

  T("transition/circle-reveal-click", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, io = gsap.parseEase("power2.inOut");
      return MW.drive(tl, at, o.backAt == null ? o.duration : o.backAt + o.duration, function (t) {
        var W = el.offsetWidth, H = el.offsetHeight, cx = o.x * W, cy = o.y * H, R = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
        var p = io(Math.max(0, Math.min(1, t / o.duration))), q = o.backAt != null ? io(Math.max(0, Math.min(1, (t - o.backAt) / o.duration))) : 0;
        if (q > 0 && out) { el.style.clipPath = "none"; el.style.visibility = "visible"; out.style.zIndex = "3"; out.style.visibility = "visible"; out.style.clipPath = q >= 1 ? "none" : "circle(" + R * q + "px at " + cx + "px " + cy + "px)"; }
        else { if (out) { out.style.zIndex = ""; out.style.clipPath = "none"; } el.style.zIndex = "2"; el.style.clipPath = p >= 1 ? "none" : "circle(" + R * p + "px at " + cx + "px " + cy + "px)"; el.style.visibility = t > 0 ? "visible" : "hidden"; }
      });
    },
    options: { x: "click point, 0-1 of the width (0.82)", y: "(0.24)", duration: "s (0.76), in-out", backAt: "s after the start: the old page comes back the same way (null: stay)", from: "the outgoing page" },
    defaults: { x: 0.82, y: 0.24, duration: 0.76, backAt: null, from: null },
    demo: { css: `${BG}\n${APP_CSS}\n.tg { position: absolute; left: 1520px; top: 205px; width: 140px; height: 70px; border-radius: 35px; background: #3a4466; z-index: 9; } .tg::after { content: ""; position: absolute; left: 10px; top: 10px; width: 50px; height: 50px; border-radius: 50%; background: #ffd23d; }`,
      html: `<div class="gm">${APP("cr-a", "Giao diện tối")}${APP("cr-b", "Giao diện sáng", "light", "#ffb547")}<div class="tg"></div></div>${CURSOR}`,
      run: `var c = q(".ui-cursor"); tl.fromTo(c, { x: 1300, y: 800 }, { x: 1580, y: 240, duration: 0.35, ease: "power2.inOut", immediateRender: true }, 0); MW.transitionCircleRevealClick(q(".cr-b"), tl, 0.45, { backAt: 1.6 });`, duration: 3 },
  }),

  T("motion/exit-fade-shrink", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var pin = gsap.parseEase("power2.in"), out = gsap.parseEase("power2.out");
      return MW.drive(tl, at, o.returnAt == null ? o.duration : o.returnAt + 0.4, function (t) {
        var e = pin(Math.max(0, Math.min(1, t / o.duration))), back = o.returnAt != null && t >= o.returnAt, r = back ? out(Math.min(1, (t - o.returnAt) / 0.4)) : 0;
        if (!back) { gsap.set(el, { scale: 1 - (1 - o.scale) * e, y: o.drop * e }); el.style.opacity = String(1 - e); el.style.display = e >= 1 ? "none" : ""; }
        else { el.style.display = ""; gsap.set(el, { scale: o.scale + (1 - o.scale) * r, y: 0 }); el.style.opacity = String(r); }
      });
    },
    options: { duration: "s (0.48), ease-in", scale: "(0.96)", drop: "px (40)", returnAt: "s after the start to come back (0.4 s ease-out, no drop; null: stay hidden)" },
    defaults: { duration: 0.48, scale: 0.96, drop: 40, returnAt: null },
    notes: "After the exit the element is display: none (out of the layout), as a discrete property ends a CSS exit.",
    demo: { css: `${BG}\n.ex { position: absolute; left: 50%; top: 50%; width: 760px; height: 340px; transform: translate(-50%, -50%); } .ex-slot { position: absolute; inset: 0; border-radius: 50px; border: 4px dashed #3a4466; }
.ex-card { position: absolute; inset: 0; border-radius: 50px; background: #1b2130; border: 3px solid #2a3350; padding: 60px; box-sizing: border-box; } .ex-card b { display: block; font-size: 52px; margin-bottom: 20px; } .ex-card span { font-size: 36px; color: #9aa3b8; }
.ex-x { position: absolute; right: 40px; top: 40px; width: 70px; height: 70px; border-radius: 50%; background: #2a3142; } .ex-x::before, .ex-x::after { content: ""; position: absolute; left: 33px; top: 17px; width: 5px; height: 36px; background: #c9d2ea; transform: rotate(45deg); } .ex-x::after { transform: rotate(-45deg); }`,
      html: `<div class="gm"><div class="ex"><div class="ex-slot"></div><div class="ex-card"><div class="ex-x"></div><b>Đã lưu bản nháp</b><span>Tự động lưu lúc 14:20</span></div></div></div>${CURSOR}`,
      run: `var c = q(".ui-cursor"); tl.fromTo(c, { x: 1500, y: 900 }, { x: 1278, y: 395, duration: 0.35, ease: "power2.inOut", immediateRender: true }, 0); MW.motionExitFadeShrink(q(".ex-card"), tl, 0.5, { returnAt: 1.5 });`, duration: 2.6 },
  }),

  T("ui/height-expand", {
    kind: "block",
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut");
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var p = io(Math.max(0, Math.min(1, (t - 0.4) / 0.55))) * (1 - io(Math.max(0, Math.min(1, (t - 2.0) / 0.45)))), h = 66 * p;
        MW.rr(c, 60, 20, 200, 26, 7); c.fillStyle = "#222a42"; c.fill(); MW.txt(c, "CHI TIẾT DỰ ÁN", 72, 33.5, 9, "#e8ebf3", 900, "left");
        c.save(); c.translate(246, 33); c.rotate(Math.PI * p); c.strokeStyle = "#c9d2ea"; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-4, -2); c.lineTo(0, 2); c.lineTo(4, -2); c.stroke(); c.restore();
        c.save(); c.beginPath(); c.rect(60, 50, 200, h); c.clip(); c.fillStyle = "#8b7bff"; c.fillRect(64, 54, 3, 58); MW.txt(c, "Thời hạn: 12/11", 74, 62, 9, "#e8ebf3", 800, "left"); c.fillStyle = "#3a4466"; MW.rr(c, 74, 76, 160, 5, 2.5); c.fill(); MW.rr(c, 74, 88, 120, 5, 2.5); c.fill(); MW.rr(c, 74, 100, 140, 5, 2.5); c.fill(); c.restore();
        var y = 54 + h; MW.rr(c, 60, y, 200, 26, 7); c.fillStyle = "#1b2130"; c.fill(); MW.txt(c, "MỤC TIẾP THEO", 72, y + 13.5, 9, "#8f9ab3", 900, "left"); c.fillStyle = "#1b2130"; MW.rr(c, 60, y + 34, 200, 8, 4); c.fill(); MW.rr(c, 60, y + 48, 150, 8, 4); c.fill();
        var cp = MW.path([[0, 250, 170], [0.1, 250, 170], [0.3, 240, 36], [2.6, 240, 36]], t); MW.cursor(c, cp[0], cp[1], (t > 0.3 && t < 0.4) || (t > 1.9 && t < 2.0) ? 0.9 : 1);
      });
    },
    options: { loop: "s (2.8)" }, defaults: { loop: 2.8 },
    notes: "The content keeps its own height (66 units): only the clip opens; the rows below move down by the same amount; text is never scaled.",
    demo: CV("uiHeightExpand", 2.8),
  }),

  T("transition/stack-push-up", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = o.from ? MW.el(o.from) : el.previousElementSibling, io = gsap.parseEase("power2.inOut"), dim = document.createElement("div");
      dim.style.cssText = "position:absolute;inset:0;background:#000;pointer-events:none;opacity:0;"; if (out) out.appendChild(dim);
      el.style.borderRadius = o.radius + "px " + o.radius + "px 0 0";
      return MW.drive(tl, at, o.backAt == null ? o.duration : o.backAt + o.duration, function (t) {
        var p = io(Math.max(0, Math.min(1, t / o.duration))); if (o.backAt != null) p *= 1 - io(Math.max(0, Math.min(1, (t - o.backAt) / o.duration)));
        gsap.set(el, { yPercent: 100 * (1 - p) }); el.style.visibility = p > 0 ? "visible" : "hidden";
        if (out) { gsap.set(out, { scale: 1 - (1 - o.scale) * p, y: -o.rise * p }); dim.style.opacity = String(o.dim * p); }
      });
    },
    options: { duration: "s (0.72), in-out", scale: "the old page shrinks to (0.94)", rise: "px it rises (50)", dim: "it darkens to (0.45)", radius: "px of the new page's top corners (50)", backAt: "s after the start for the exact reverse (null: stay)", from: "the outgoing page" },
    defaults: { duration: 0.72, scale: 0.94, rise: 50, dim: 0.45, radius: 50, backAt: null, from: null },
    demo: { css: `${BG}\n${APP_CSS}\n.sp-win { position: absolute; inset: 0; overflow: hidden; background: #05060a; }`, html: `<div class="gm sp-win">${APP("sp1", "Danh sách")}${APP("sp2", "Chi tiết", "dark", "#ff5d8f")}</div>`,
      run: `MW.transitionStackPushUp(q(".sp2"), tl, 0.5, { backAt: 1.6 });`, duration: 3.2 },
  }),

  T("ui/modal-spring", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var sp = MW.spring(280, 28), ei = gsap.parseEase(o.closeEase), bd = o.backdrop ? MW.el(o.backdrop) : null;
      return MW.drive(tl, at, o.closeAt + 0.22, function (t) {
        var k = t > 0 ? sp.at(t) : 0; if (t > o.closeAt) k *= 1 - ei(Math.min(1, (t - o.closeAt) / 0.22));
        el.style.opacity = String(Math.max(0, Math.min(1, k))); gsap.set(el, { y: o.rise * (1 - k), scale: 0.96 + 0.04 * k }); if (bd) bd.style.opacity = String(o.dim * Math.max(0, Math.min(1, k)));
      });
    },
    options: { rise: "px (80)", closeAt: "s after opening (1.9)", closeEase: "expo.in (the recipe power3.in)", backdrop: "the dim layer", dim: "(0.65)" },
    defaults: { rise: 80, closeAt: 1.9, closeEase: "expo.in", backdrop: null, dim: 0.65 },
    demo: { css: `${BG}\n${APP_CSS}\n.ms-bd { position: absolute; inset: 0; background: #05060a; opacity: 0; } .ms { position: absolute; left: 50%; top: 50%; width: 970px; height: 600px; margin: -300px 0 0 -485px; border-radius: 64px; background: #222a42; border: 3px solid #3a4466; padding: 70px; box-sizing: border-box; opacity: 0; box-shadow: 0 40px 100px rgba(0,0,0,0.5); }
.ms b { display: block; font-size: 64px; margin-bottom: 30px; } .ms p { font-size: 38px; color: #9aa3b8; margin: 0 0 60px; } .ms i { display: inline-block; padding: 26px 70px; border-radius: 50px; background: #8b7bff; font-style: normal; font-size: 40px; font-weight: 800; }`,
      html: `<div class="gm">${APP("ms-app", "Bảng điều khiển")}<div class="ms-bd"></div><div class="ms"><b>Chào mừng trở lại</b><p>Bạn có 3 dự án đang chờ duyệt.</p><i>Xem ngay</i></div></div>`,
      run: `MW.uiModalSpring(q(".ms"), tl, 0.3, { backdrop: ".ms-bd" });`, duration: 2.8 },
  }),
];

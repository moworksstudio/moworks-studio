// Spatial UI & Depth (batch 3.1): interface pieces with depth, written here. Diagram-like blocks draw on a canvas in a 320 x 200 units
// (MW.stage320); pieces a film keeps as real elements (cards, panels, a notification) are DOM with CSS 3D. Times are seconds from `at`;
// loops close on their own length.
import { T } from "../../moworks/define.mjs";
import { CURSOR } from "../../moworks/stages.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 40%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }
.ui-cursor { position: absolute; left: 0; top: 0; z-index: 20; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5)); }`;
const CV = (name, duration = 4, opt = "{}", extraHtml = "", css = "") => ({ css: `${BG}\n${css}`, html: `<div class="gm">${extraHtml}</div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });

export default [
  T("card/cursor-depth-pull", {
    kind: "block",
    uses: ["drive", "springs", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), card = el.querySelector(o.card), cur = el.querySelector(".ui-cursor"), k = S.k, eng = MW.springTo(140, 18, [[0, 0], [0.75, 1], [2.75, 0]]);
      S.put(card, 160, 100); card.style.transformPerspective = 420 * k;
      var P = [[0, 300, 186], [0.35, 300, 186], [1.15, 214, 128], [1.7, 202, 116], [2.5, 210, 124], [3.25, 304, 190]];
      return MW.drive(tl, at, o.loop, function (t) {
        var p = eng(t), c = MW.path(P, t), cl = function (v) { return Math.max(-1, Math.min(1, v)); };
        gsap.set(card, { rotationY: cl((c[0] - 160) / 90) * 19.5 * p, rotationX: -cl((c[1] - 100) / 70) * 16 * p, scale: 1 + 0.1 * p, transformPerspective: 420 * k });
        card.style.borderColor = p > 0.3 ? "#8b7bff" : ""; card.style.boxShadow = "0 " + (20 + 40 * p) + "px " + (60 + 80 * p) + "px rgba(0,0,0," + (0.35 + 0.2 * p) + ")";
        if (cur) { cur.style.left = (S.ox + c[0] * k) + "px"; cur.style.top = (S.oy + c[1] * k) + "px"; }
      });
    },
    options: { card: "selector of the card (.dp)", loop: "s (3.6)" }, defaults: { card: ".dp", loop: 3.6 },
    demo: { css: `${BG}\n.dp { width: 756px; height: 486px; border-radius: 44px; background: linear-gradient(160deg, #222a42, #151a28); border: 4px solid #2a3350; padding: 60px; box-sizing: border-box; }
.dp h3 { margin: 0 0 20px; font-size: 64px; } .dp p { margin: 0; font-size: 34px; color: #9aa3b8; } .dp .bar { height: 26px; border-radius: 13px; background: #2a3350; margin-top: 40px; width: 70%; }`,
      html: `<div class="gm"><div class="dp"><h3>Bộ sưu tập mới</h3><p>12 mẫu chuyển động cho mùa hè</p><div class="bar"></div><div class="bar" style="width:46%"></div></div>${CURSOR}</div>`,
      run: `MW.cardCursorDepthPull(q(".gm"), tl, 0, {});`, duration: 3.6 },
  }),

  T("transition/focus-portal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, rim = document.createElement("div"), card = o.content ? el.querySelector(o.content) : el.firstElementChild, q5 = gsap.parseEase("power4.out"), inn = gsap.parseEase("power2.in");
      rim.style.cssText = "position:absolute;pointer-events:none;border-radius:50%;box-sizing:border-box;border:" + o.rim + "px solid #8b7bff;z-index:9;"; host.appendChild(rim);
      return MW.drive(tl, at, o.closeAt + 0.6, function (t) {
        var W = el.offsetWidth, Hh = el.offsetHeight, cx = o.x * W, cy = o.y * Hh;
        var u = Math.max(0, Math.min(1, (t - o.openAt) / 0.7)), c = t > o.closeAt + 0.1 ? 1 - inn(Math.min(1, (t - o.closeAt - 0.1) / 0.45)) : 1, r = (o.from + (o.to - o.from) * q5(u)) * c;
        el.style.clipPath = "circle(" + r + "px at " + cx + "px " + cy + "px)"; el.style.visibility = t >= o.openAt && r > 0.5 ? "visible" : "hidden";
        rim.style.left = (cx - r) + "px"; rim.style.top = (cy - r) + "px"; rim.style.width = rim.style.height = 2 * r + "px"; rim.style.opacity = el.style.visibility === "visible" ? "1" : "0";
        if (card) { var v = Math.max(0, Math.min(1, (t - o.openAt - 0.12) / 0.7)), cc = t > o.closeAt ? 1 - inn(Math.min(1, (t - o.closeAt) / 0.4)) : 1; gsap.set(card, { scale: (0.6 + 0.4 * q5(v)) * (0.6 + 0.4 * cc) }); card.style.opacity = String(q5(v) * cc); }
      });
    },
    options: { x: "focus point, 0-1 of the width (0.5)", y: "0-1 of the height (0.5)", from: "px radius at the start (54)", to: "px when open (390; 72 of 320)", rim: "px (6)", openAt: "s (0.45)", closeAt: "s (3.0)", content: "the card inside the portal" },
    defaults: { x: 0.5, y: 0.5, from: 54, to: 390, rim: 6, openAt: 0.45, closeAt: 3, content: null },
    demo: { css: `${BG}\n.grid { position: absolute; inset: 120px 200px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; } .grid div { border-radius: 30px; background: #1b2130; border: 3px solid #262c3a; }
.portal { position: absolute; inset: 0; background: #241f45; display: grid; place-items: center; z-index: 5; } .portal .pc { width: 580px; height: 430px; border-radius: 40px; background: linear-gradient(160deg, #a693ff, #6a4cf0); display: grid; place-items: center; font-size: 64px; font-weight: 800; }`,
      html: `<div class="gm"><div class="grid">${"<div></div>".repeat(8)}</div><div class="portal"><div class="pc">Nội dung mới</div></div></div>`,
      run: `MW.transitionFocusPortal(q(".portal"), tl, 0, { content: ".pc" });`, duration: 3.8 },
  }),

  T("ui/radial-bloom", {
    kind: "block",
    uses: ["drive", "spring", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, sp = MW.spring(260, 18), inn = gsap.parseEase("power2.in"), cols = ["#3dd6f5", "#ffd23d", "#ff5d8f", "#3ddc84", "#ffb547"];
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear();
        var cur = MW.path([[0, 250, 170], [0.1, 250, 170], [0.42, 164, 104]], t);
        for (var i = 0; i < o.items; i++) {
          var a = -Math.PI / 2 + i * 2 * Math.PI / o.items, s0 = o.openAt + 0.05 * i, open = t >= s0 ? sp.at(t - s0) : 0, ci = o.closeAt + 0.03 * (o.items - 1 - i);
          if (t >= ci) open *= 1 - inn(Math.min(1, (t - ci) / 0.22));
          var R = o.radius * open, x = 160 + R * Math.cos(a), y = 100 + R * Math.sin(a), sc = Math.min(1.3, Math.max(0, open));
          if (open <= 0.01) continue;
          c.globalAlpha = Math.min(1, open); c.strokeStyle = "#4a5478"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(160, 100); c.lineTo(x, y); c.stroke();
          c.fillStyle = "#222a42"; c.beginPath(); c.arc(x, y, 15 * sc, 0, 2 * Math.PI); c.fill(); c.strokeStyle = cols[i]; c.lineWidth = 2; c.stroke();
          c.fillStyle = cols[i]; c.beginPath(); c.arc(x, y, 5 * sc, 0, 2 * Math.PI); c.fill(); c.globalAlpha = 1;
        }
        var press = t > 0.45 && t < 0.55 ? 0.9 : 1, rot = (t >= 0.5 ? sp.at(t - 0.5) : 0) * 45 * (t >= o.closeAt ? 1 - inn(Math.min(1, (t - o.closeAt) / 0.3)) : 1);
        c.save(); c.translate(160, 100); c.scale(press, press); c.fillStyle = "#8b7bff"; c.beginPath(); c.arc(0, 0, 19, 0, 2 * Math.PI); c.fill();
        c.rotate(rot * Math.PI / 180); c.fillStyle = "#fff"; c.fillRect(-8, -1.6, 16, 3.2); c.fillRect(-1.6, -8, 3.2, 16); c.restore();
        MW.cursor(c, cur[0], cur[1], 1.1);
      });
    },
    options: { items: "commands (5), 72° apart, the first straight up", radius: "units (64 of 320)", openAt: "s (0.55; 0.05 s apart, spring k260 d18)", closeAt: "s (2.95; reverse order 0.03 s apart, 0.22 s ease-in)", loop: "s (3.8)" },
    defaults: { items: 5, radius: 64, openAt: 0.55, closeAt: 2.95, loop: 3.8 },
    demo: CV("uiRadialBloom", 3.8),
  }),

  T("card/depth-breadcrumb", {
    kind: "block",
    uses: ["drive", "springs", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, lv = MW.springTo(180, 24, [[0, 0]].concat(o.levels));
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var cur = lv(t), chips = [];
        c.globalAlpha = 0.35; for (var r = 0; r < 6; r++) { MW.rr(c, 30, 30 + r * 26, 260, 18, 5); c.fillStyle = "#151a28"; c.fill(); } c.globalAlpha = 1;
        o.names.forEach(function (n, i) { var d = cur - i, s = 360 / (360 + 180 * d); chips.push({ n: n, i: i, d: d, s: s, x: 160 - 150 * d * s, y: 100 + (-66 * d + 40) * s }); });
        c.setLineDash([3, 3]); c.strokeStyle = "#4a5478"; c.lineWidth = 1; c.beginPath(); chips.forEach(function (q, i) { if (i) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); }); c.stroke(); c.setLineDash([]);
        chips.slice().sort(function (a, b) { return b.d - a.d; }).forEach(function (q) {
          var a = q.d < 0 ? Math.max(0, 1 + q.d) : Math.max(0.1, 1 - 0.28 * q.d), act = Math.abs(q.d) < 0.5;
          c.globalAlpha = a; c.save(); c.translate(q.x, q.y); c.scale(q.s, q.s); MW.rr(c, -48, -18, 96, 36, 10); c.fillStyle = act ? "#8b7bff" : "#222a42"; c.fill(); c.strokeStyle = act ? "#b9adff" : "#3a4466"; c.lineWidth = 1.5; c.stroke();
          MW.txt(c, q.n, 0, 0.5, 13, act ? "#fff" : "#c9d2ea", 800); c.restore(); c.globalAlpha = 1;
        });
      });
    },
    options: { names: "the levels (['TRANG CHỦ', 'TỆP', 'MỤC'])", levels: "[[s, level], ...] (spring k180 d24): [[0.4, 1], [1.5, 2], [3.3, 0]]", loop: "s (4.2)" },
    defaults: { names: ["TRANG CHỦ", "TỆP", "MỤC"], levels: [[0.4, 1], [1.5, 2], [3.3, 0]], loop: 4.2 },
    demo: CV("cardDepthBreadcrumb", 4.2),
  }),

  T("ui/dock-magnify", {
    kind: "block",
    uses: ["drive", "springs", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, on = MW.springTo(220, 24, [[0, 0], [0.55, 1], [3.35, 0]]), cols = ["#3dd6f5", "#3ddc84", "#ffd23d", "#8b7bff", "#ff5d8f", "#ffb547", "#9aa3b8"];
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var cx = MW.path([[0, 26, 0], [0.35, 26, 0], [1.4, 160, 0], [2.7, 160, 0], [3.6, 296, 0]], t)[0], v = on(t), sc = [], tot = 0;
        for (var i = 0; i < 7; i++) { var sx = 160 + 33 * (i - 3), s = 1 + (o.max - 1) * v * Math.exp(-Math.pow((sx - cx) / 40, 2)); sc.push(s); tot += 26 * s; }
        tot += 7 * 6; var x = 160 - tot / 2;
        MW.rr(c, x - 7, 154, tot + 14, 38, 12); c.fillStyle = "rgba(34,42,66,0.85)"; c.fill(); c.strokeStyle = "#3a4466"; c.lineWidth = 1; c.stroke();
        sc.forEach(function (s, i) { var w = 26 * s, kk = (s - 1) / (o.max - 1), lift = 10 * kk * kk; MW.rr(c, x, 186 - w - lift, w, w, 0.26 * w); c.fillStyle = cols[i]; c.fill(); x += w + 7; });
        MW.cursor(c, cx, 168, 1);
      });
    },
    options: { max: "largest scale (1.7)", loop: "s (3.9)" }, defaults: { max: 1.7, loop: 3.9 },
    demo: CV("uiDockMagnify", 3.9),
  }),

  T("motion/hinge", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var io = gsap.parseEase("power2.inOut"), shade = document.createElement("div"), back = o.back ? el.querySelector(o.back) : null;
      shade.style.cssText = "position:absolute;inset:0;border-radius:inherit;background:#05060a;pointer-events:none;opacity:0;"; el.appendChild(shade);
      el.parentNode.style.perspective = o.perspective + "px";
      return MW.drive(tl, at, o.closeAt + o.close, function (t) {
        var p = t < o.openAt ? 0 : t < o.openAt + o.open ? io((t - o.openAt) / o.open) : t < o.closeAt ? 1 : 1 - io(Math.min(1, (t - o.closeAt) / o.close)), a = o.angle * p;
        gsap.set(el, { rotationY: a, transformOrigin: "0% 50%" });
        var showBack = Math.abs(a) > 90;
        shade.style.opacity = String(showBack ? 0 : 0.5 * Math.sin(Math.abs(a) * Math.PI / 180));
        Array.prototype.forEach.call(el.children, function (ch) { if (ch !== shade && ch !== back) ch.style.visibility = showBack ? "hidden" : "visible"; });
        if (back) { back.style.visibility = showBack ? "visible" : "hidden"; back.style.transform = "scaleX(-1)"; }
      });
    },
    options: { angle: "degrees about the left edge (−140)", open: "s (0.9)", openAt: "s (0.4)", closeAt: "s (3.0)", close: "s (0.65)", perspective: "px (3000)", back: "the panel's back face (shown past 90°)" },
    defaults: { angle: -140, open: 0.9, openAt: 0.4, closeAt: 3, close: 0.65, perspective: 3000, back: null },
    demo: { css: `${BG}\n.hs { position: absolute; left: 600px; top: 200px; width: 720px; height: 580px; }
.hs > div { position: absolute; inset: 0; border-radius: 40px; box-sizing: border-box; padding: 50px; } .low { background: #151a28; border: 3px solid #2a3350; }
.low .b { position: absolute; bottom: 60px; width: 70px; border-radius: 14px 14px 0 0; background: linear-gradient(180deg, #a693ff, #6a4cf0); }
.top { background: linear-gradient(160deg, #2a3350, #1b2130); border: 3px solid #3a4466; } .top h3 { margin: 0 0 14px; font-size: 56px; } .top p { margin: 0; font-size: 32px; color: #9aa3b8; }
.top .bk { position: absolute; inset: 0; border-radius: 40px; background: #10131d; border: 4px solid #8b7bff; visibility: hidden; } .top .bk i { position: absolute; left: 60px; top: 60px; width: 300px; height: 24px; border-radius: 12px; background: #2a3142; }`,
      html: `<div class="gm"><div class="hs"><div class="low"><h3 style="margin:0;font-size:44px">Doanh thu quý</h3>${[160, 260, 210, 340, 300].map((h, i) => `<div class="b" style="left:${90 + i * 110}px;height:${h}px"></div>`).join("")}</div>
<div class="top"><h3>Tổng quan</h3><p>Mở để xem chi tiết bên dưới</p><div class="bk"><i></i></div></div></div></div>`,
      run: `MW.motionHinge(q(".top"), tl, 0, { back: ".bk" });`, duration: 3.8 },
  }),

  T("motion/edge-aware-placement", {
    kind: "block",
    uses: ["drive", "springs", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, ang = MW.springTo(170, 22, [[0, -90], [0.95, 90], [2.5, 180], [3.55, 270]]);
      var P = [[0, 150, 104], [0.3, 150, 104], [0.85, 150, 52], [1.85, 150, 52], [2.4, 256, 112], [3.3, 256, 112], [3.85, 150, 104]];
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var p = MW.path(P, t), a = ang(t) * Math.PI / 180, lx = p[0] + 66 * Math.cos(a), ly = p[1] + 36 * Math.sin(a);
        c.setLineDash([4, 4]); c.strokeStyle = "#4a5478"; c.lineWidth = 1; c.strokeRect(20, 20, 280, 160); c.setLineDash([]);
        c.strokeStyle = "#8b7bff"; c.lineWidth = 3; if (p[1] < 70) { c.globalAlpha = Math.min(1, (70 - p[1]) / 15); c.beginPath(); c.moveTo(20, 20); c.lineTo(300, 20); c.stroke(); }
        if (p[0] > 230) { c.globalAlpha = Math.min(1, (p[0] - 230) / 20); c.beginPath(); c.moveTo(300, 20); c.lineTo(300, 180); c.stroke(); } c.globalAlpha = 1;
        c.fillStyle = "#3dd6f5"; c.beginPath(); c.arc(p[0], p[1], 13, 0, 2 * Math.PI); c.fill();
        var dx = p[0] - lx, dy = p[1] - ly, m = Math.hypot(dx, dy) || 1; c.fillStyle = "#e8ebf3"; c.beginPath(); c.moveTo(lx + dx / m * 20, ly + dy / m * 20); c.lineTo(lx + dx / m * 10 - dy / m * 5, ly + dy / m * 10 + dx / m * 5); c.lineTo(lx + dx / m * 10 + dy / m * 5, ly + dy / m * 10 - dx / m * 5); c.fill();
        MW.rr(c, lx - 39, ly - 12, 78, 24, 6); c.fill(); MW.txt(c, "Chú thích", lx, ly + 0.5, 11, "#151a28", 800);
      });
    },
    options: { loop: "s (4.2)" }, defaults: { loop: 4.2 },
    notes: "A lesson: the label orbits its anchor on springs and moves to the side that has room when the anchor nears an edge; the text stays upright.",
    demo: CV("motionEdgeAwarePlacement", 4.2),
  }),

  T("effect/magnifier", {
    uses: ["drive", "draw"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, lens = document.createElement("div"), inner = el.cloneNode(true), handle = document.createElement("div"), pill = document.createElement("div"), R = o.radius;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      lens.style.cssText = "position:absolute;width:" + 2 * R + "px;height:" + 2 * R + "px;border-radius:50%;overflow:hidden;z-index:6;box-shadow:0 0 0 " + o.rim + "px #8b7bff, 0 20px 50px rgba(0,0,0,0.5);background:" + o.fill + ";";
      inner.removeAttribute("id"); inner.style.position = "absolute"; inner.style.left = "0"; inner.style.top = "0"; inner.style.margin = "0"; inner.style.transformOrigin = "0 0"; lens.appendChild(inner); host.appendChild(lens);
      handle.style.cssText = "position:absolute;width:" + R * 0.7 + "px;height:" + o.rim * 4 + "px;border-radius:" + o.rim * 2 + "px;background:#8b7bff;z-index:5;transform-origin:0 50%;transform:rotate(45deg);"; host.appendChild(handle);
      pill.style.cssText = "position:absolute;z-index:7;padding:6px 18px;border-radius:20px;background:#8b7bff;color:#fff;font:800 28px Inter,sans-serif;"; pill.textContent = o.zoom + "×"; host.appendChild(pill);
      return MW.drive(tl, at, o.loop, function (t) {
        var k = el.offsetWidth / 320, p = MW.path(o.path, t), x = el.offsetLeft + p[0] * k, y = el.offsetTop + p[1] * k;
        lens.style.left = (x - R) + "px"; lens.style.top = (y - R) + "px";
        gsap.set(inner, { x: -(p[0] * k * o.zoom - R), y: -(p[1] * k * o.zoom - R), scale: o.zoom });
        handle.style.left = (x + R * 0.68) + "px"; handle.style.top = (y + R * 0.68 - o.rim * 2) + "px"; pill.style.left = (x - 36) + "px"; pill.style.top = (y - R - 64) + "px";
      });
    },
    options: { zoom: "× inside the lens (2)", radius: "px (190)", rim: "px (8)", fill: "the lens' plain fill", path: "[[s, x, y], ...] in the content's 320-wide units", loop: "s (4.2)" },
    defaults: { zoom: 2, radius: 190, rim: 8, fill: "#10131d", path: [[0, 92, 92], [0.3, 92, 92], [1.0, 196, 124], [1.9, 196, 124], [2.6, 236, 72], [3.4, 236, 72], [4.1, 92, 92]], loop: 4.2 },
    demo: { css: `${BG}\n.mp { position: absolute; left: 160px; top: 90px; width: 1600px; height: 900px; border-radius: 30px; overflow: hidden; background-color: #10131d;
  background-image: linear-gradient(#262c3a 2px, transparent 2px), linear-gradient(90deg, #262c3a 2px, transparent 2px); background-size: 80px 80px; }
.mp i { position: absolute; width: 22px; height: 22px; border-radius: 50%; } .mp span { position: absolute; font-size: 22px; color: #9aa3b8; font-weight: 700; }`,
      html: `<div class="gm"><div class="mp">${[[300, 320, "#3dd6f5", "Ga Hà Nội"], [700, 520, "#ffd23d", "Hồ Gươm"], [1010, 300, "#ff5d8f", "Phố cổ"], [1210, 400, "#3ddc84", "Cầu Long Biên"], [500, 700, "#8b7bff", "Văn Miếu"], [1300, 700, "#ffb547", "Nhà hát lớn"]].map(([x, y, c, n]) => `<i style="left:${x}px;top:${y}px;background:${c}"></i><span style="left:${x + 34}px;top:${y - 4}px">${n}</span>`).join("")}</div></div>`,
      run: `MW.effectMagnifier(q(".mp"), tl, 0, {});`, duration: 4.2 },
  }),

  T("data/magnetic-converge", {
    kind: "block",
    uses: ["drive", "spring", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, sp = MW.spring(120, 15), io = gsap.parseEase("power2.inOut"), N = [[96, 58], [150, 34], [222, 52], [246, 110], [204, 160], [118, 156], [72, 112]];
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var g = t < o.pullAt ? 0 : t < o.releaseAt ? sp.at(t - o.pullAt) : sp.at(o.releaseAt - o.pullAt) * (1 - io(Math.min(1, (t - o.releaseAt) / 0.7))), pts = N.map(function (n) { return [n[0] + (160 - n[0]) * o.pull * g, n[1] + (100 - n[1]) * o.pull * g]; });
        N.forEach(function (n, i) { c.globalAlpha = 0.4; c.strokeStyle = "#4a5478"; c.lineWidth = 1; c.beginPath(); c.arc(n[0], n[1], 7, 0, 2 * Math.PI); c.stroke(); c.setLineDash([2, 3]); c.beginPath(); c.moveTo(n[0], n[1]); c.lineTo(pts[i][0], pts[i][1]); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; });
        c.strokeStyle = "#3a4466"; c.lineWidth = 1.2; c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); c.stroke();
        [0, 2, 4, 5].forEach(function (i) { c.beginPath(); c.moveTo(160, 100); c.lineTo(pts[i][0], pts[i][1]); c.stroke(); });
        if (g > 0.05 && t < o.releaseAt) for (var k = 0; k < 3; k++) { var u = ((t - o.pullAt) / 0.7 - k) ; if (u < 0) continue; u = u % 3; if (u > 1) continue; c.globalAlpha = 1 - u; c.strokeStyle = "#8b7bff"; c.lineWidth = 1.5; c.beginPath(); c.arc(160, 100, 8 + 40 * u, 0, 2 * Math.PI); c.stroke(); }
        c.globalAlpha = 1; pts.forEach(function (p) { c.fillStyle = "#e8ebf3"; c.beginPath(); c.arc(p[0], p[1], 5, 0, 2 * Math.PI); c.fill(); });
        c.fillStyle = "#8b7bff"; c.beginPath(); c.arc(160, 100, 8, 0, 2 * Math.PI); c.fill();
      });
    },
    options: { pull: "share of each node's distance it moves (0.55)", pullAt: "s (0.45), one spring k120 c15", releaseAt: "s (2.9)", loop: "s (4)" },
    defaults: { pull: 0.55, pullAt: 0.45, releaseAt: 2.9, loop: 4 },
    demo: CV("dataMagneticConverge", 4),
  }),

  T("motion/canvas-hop", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var world = el.querySelector(o.world), mini = o.minimap ? el.querySelector(o.minimap) : null, vp = mini ? mini.querySelector(".vp") : null, io = gsap.parseEase("power2.inOut"), A = o.from, B = o.to;
      return MW.drive(tl, at, o.loop, function (t) {
        var W = el.offsetWidth, Hh = el.offsetHeight, u = io(Math.max(0, Math.min(1, (t - o.at) / o.duration))), z = o.zoom * Math.pow(0.21, Math.sin(Math.PI * u));
        var cx = A[0] + (B[0] - A[0]) * u, cy = A[1] + (B[1] - A[1]) * u;
        world.style.transformOrigin = "0 0"; world.style.transform = "translate(" + W / 2 + "px," + Hh / 2 + "px) scale(" + z + ") translate(" + (-cx) + "px," + (-cy) + "px)";
        if (vp) { var mw = mini.offsetWidth / o.worldSize[0]; vp.style.left = (cx - W / z / 2) * mw + "px"; vp.style.top = (cy - Hh / z / 2) * mw + "px"; vp.style.width = W / z * mw + "px"; vp.style.height = Hh / z * mw + "px"; }
        el.style.opacity = t > o.fadeAt ? String(Math.max(0, 1 - (t - o.fadeAt) / 0.3)) : "1";
      });
    },
    options: { world: "the canvas inside (.cw)", from: "[x, y] world px of frame A", to: "[x, y] of frame B (3120 px across, 660 down: 520 / 110 of the small demo × 6)", zoom: "zoom at both ends (2); 0.42 mid-way", at: "s (0.45)", duration: "s (1.8)", minimap: "the minimap (with a .vp viewport box)", worldSize: "[w, h] world px", fadeAt: "s (3.55)", loop: "s (3.9)" },
    defaults: { world: ".cw", from: [900, 900], to: [4020, 1560], zoom: 2, at: 0.45, duration: 1.8, minimap: null, worldSize: [5000, 2500], fadeAt: 3.55, loop: 3.9 },
    demo: { css: `${BG}\n.cv { position: absolute; inset: 0; overflow: hidden; } .cw { position: absolute; left: 0; top: 0; width: 5000px; height: 2500px; background-color: #10131d; background-image: radial-gradient(#2a3142 3px, transparent 3px); background-size: 60px 60px; }
.cw .fr { position: absolute; width: 420px; height: 264px; margin: -132px 0 0 -210px; border-radius: 24px; display: grid; place-items: center; font-size: 60px; font-weight: 800; }
.cw .fl { position: absolute; width: 300px; height: 190px; border-radius: 20px; background: #1b2130; border: 3px solid #262c3a; }
.mm { position: absolute; right: 70px; bottom: 60px; width: 420px; height: 210px; border-radius: 16px; background: rgba(21,26,40,0.9); border: 3px solid #3a4466; overflow: hidden; } .mm .vp { position: absolute; border: 3px solid #8b7bff; border-radius: 4px; }
.mm b { position: absolute; width: 34px; height: 22px; border-radius: 4px; }`,
      html: `<div class="gm cv"><div class="cw">${[[400, 400], [1500, 300], [2200, 1100], [2800, 500], [3400, 1900], [1300, 1700], [4300, 700], [600, 1900]].map(([x, y]) => `<div class="fl" style="left:${x}px;top:${y}px"></div>`).join("")}
<div class="fr" style="left:900px;top:900px;background:linear-gradient(160deg,#3dd6f5,#1580b8)">Khung A</div><div class="fr" style="left:4020px;top:1560px;background:linear-gradient(160deg,#a693ff,#6a4cf0)">Khung B</div></div>
<div class="mm"><b style="left:${900 * 0.084 - 17}px;top:${900 * 0.084 - 11}px;background:#3dd6f5"></b><b style="left:${4020 * 0.084 - 17}px;top:${1560 * 0.084 - 11}px;background:#8b7bff"></b><div class="vp"></div></div></div>`,
      run: `MW.motionCanvasHop(q(".cv"), tl, 0, { minimap: ".mm" });`, duration: 3.9 },
  }),

  T("ui/notification-from-depth", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var sp = MW.spring(200, 15), inn = gsap.parseEase("power2.in"), app = o.behind ? MW.el(o.behind) : null;
      return MW.drive(tl, at, o.exitAt + 0.3, function (t) {
        var x = t < o.at ? 0 : sp.at(t - o.at), z = o.depth * (1 - x);
        if (t > o.exitAt) z = o.depth * inn(Math.min(1, (t - o.exitAt) / 0.3));
        var s = 360 / (360 + z), a = t < o.at ? 0 : t > o.exitAt ? 1 - inn(Math.min(1, (t - o.exitAt) / 0.3)) : Math.min(1, 1.6 * x);
        gsap.set(el, { scale: s }); el.style.opacity = String(a);
        if (app) { var d = Math.min(1, Math.max(0, x)) * (t > o.exitAt ? 1 - Math.min(1, (t - o.exitAt) / 0.3) : 1); gsap.set(app, { scale: 1 - 0.03 * d }); app.style.filter = d > 0.01 ? "brightness(" + (1 - o.dim * d) + ")" : ""; }
      });
    },
    options: { depth: "z it comes from (400; scale 360 / (360 + z))", at: "s (0.4), spring k200 c15", exitAt: "s (3.0; 0.3 s ease-in back into depth)", behind: "the app window that dims and recedes", dim: "(0.35)" },
    defaults: { depth: 400, at: 0.4, exitAt: 3, behind: null, dim: 0.35 },
    demo: { css: `${BG}\n.app { position: absolute; inset: 110px 260px; border-radius: 40px; background: #151a28; border: 3px solid #262c3a; padding: 60px; box-sizing: border-box; }
.app .r { height: 70px; border-radius: 18px; background: #1b2130; margin-bottom: 26px; } .nt { position: absolute; left: 50%; top: 170px; width: 900px; height: 230px; margin-left: -450px; border-radius: 56px; background: #f2f3f8; color: #151a28;
  display: flex; align-items: center; gap: 40px; padding: 0 60px; box-sizing: border-box; box-shadow: 0 40px 100px rgba(0,0,0,0.5); opacity: 0; }
.nt .ck { width: 120px; height: 120px; border-radius: 50%; background: #8b7bff; flex: none; position: relative; } .nt .ck::after { content: ""; position: absolute; left: 44px; top: 24px; width: 26px; height: 52px; border: solid #fff; border-width: 0 12px 12px 0; transform: rotate(45deg); }
.nt b { display: block; font-size: 48px; } .nt span { font-size: 32px; color: #5a6275; }`,
      html: `<div class="gm"><div class="app"><div class="r" style="width:60%"></div><div class="r"></div><div class="r"></div><div class="r" style="width:80%"></div><div class="r"></div></div>
<div class="nt"><div class="ck"></div><div><b>Đã xuất video</b><span>Phim của bạn đã sẵn sàng</span></div></div></div>`,
      run: `MW.uiNotificationFromDepth(q(".nt"), tl, 0, { behind: ".app" });`, duration: 3.6 },
  }),

  T("motion/dolly-layers", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll("[data-z]")), io = gsap.parseEase("power2.inOut");
      return MW.drive(tl, at, o.backAt + 0.9, function (t) {
        var cam = t < o.at ? 0 : t < o.at + o.duration ? o.cam * io((t - o.at) / o.duration) : t < o.backAt ? o.cam : o.cam * (1 - io(Math.min(1, (t - o.backAt) / 0.9)));
        Ls.forEach(function (l) { var z = +l.getAttribute("data-z"), s = o.focal / (o.focal + z - cam), dx = +(l.getAttribute("data-x") || 0), dy = +(l.getAttribute("data-y") || 0); gsap.set(l, { scale: s, x: dx * s, y: dy * s }); });
      });
    },
    options: { cam: "camera z it moves to (110)", focal: "(360)", at: "s (0.4)", duration: "s (1.5)", backAt: "s (3.0)" },
    defaults: { cam: 110, focal: 360, at: 0.4, duration: 1.5, backAt: 3 },
    notes: "Layers carry data-z (depth) and data-x / data-y (offset from the centre, px); scale = focal / (focal + z − camera z), offsets scale the same.",
    demo: { css: `${BG}\n.dl { position: absolute; inset: 0; } .dl > div { position: absolute; left: 50%; top: 50%; border-radius: 40px; box-sizing: border-box; }
.bk { width: 918px; height: 594px; margin: -297px 0 0 -459px; background: #1b2130; border: 4px solid #2a3350; padding: 50px; font-size: 46px; font-weight: 700; color: #9aa3b8; }
.fr { width: 648px; height: 400px; margin: -200px 0 0 -324px; background: linear-gradient(160deg, #a693ff, #6a4cf0); display: grid; place-items: center; font-size: 64px; font-weight: 800; box-shadow: 0 40px 90px rgba(0,0,0,0.5); }`,
      html: `<div class="gm dl"><div class="bk" data-z="260" data-x="-216" data-y="-130">Bảng phía sau</div><div class="fr" data-z="0" data-x="238" data-y="140">Lớp phía trước</div></div>`,
      run: `MW.motionDollyLayers(q(".dl"), tl, 0, {});`, duration: 4 },
  }),

  T("ui/layer-explode", {
    kind: "block",
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var P = Array.prototype.slice.call(el.querySelectorAll(o.panels)), sp = MW.spring(200, 20), io = gsap.parseEase("power2.inOut"), labs = el.querySelectorAll(".ly");
      P.forEach(function (p) { p.firstElementChild.style.transform = "perspective(" + o.perspective + "px) rotateX(" + o.rotX + "deg) rotateY(" + o.rotY + "deg)"; });
      var starts = [o.at + 0.06, o.at, o.at + 0.1], targets = [-o.spread, 0, o.spread];
      return MW.drive(tl, at, o.collapseAt + 0.5, function (t) {
        var col = t > o.collapseAt ? io(Math.min(1, (t - o.collapseAt) / 0.45)) : 0;
        P.forEach(function (p, i) { var s = t >= starts[i] ? sp.at(t - starts[i]) : 0, y = (targets[i] * s + 4 * (i - 1)) * (1 - col); gsap.set(p, { y: y }); if (labs[i]) { labs[i].firstChild.nodeValue = "y " + Math.round(y / 5.4); gsap.set(labs[i], { y: y }); } });
      });
    },
    options: { panels: "selector of the panel wrappers, top first", spread: "px (302; 56 of 320)", rotX: "(−57)", rotY: "(−29)", perspective: "px (2800)", at: "s (0.45)", collapseAt: "s (2.9)" },
    defaults: { panels: ".lp", spread: 302, rotX: -57, rotY: -29, perspective: 2800, at: 0.45, collapseAt: 2.9 },
    demo: { css: `${BG}\n.le { position: absolute; inset: 0; } .lp { position: absolute; left: 50%; top: 50%; width: 810px; height: 497px; margin: -248px 0 0 -405px; }
.lp > div { width: 100%; height: 100%; border-radius: 40px; display: grid; place-items: center; font-size: 80px; font-weight: 900; box-sizing: border-box; }
.lp.a > div { background: linear-gradient(160deg, #a693ff, #6a4cf0); } .lp.b > div { background: #222a42; border: 4px solid #3a4466; } .lp.c > div { background: #171c2b; border: 4px solid #2a3350; color: #9aa3b8; }
.ly { position: absolute; left: 1500px; top: 520px; font-size: 34px; color: #8f9ab3; font-weight: 700; }`,
      html: `<div class="gm le"><div class="lp c"><div>BA</div></div><div class="lp b"><div>HAI</div></div><div class="lp a"><div>MỘT</div></div><div class="ly">y 0</div><div class="ly">y 0</div><div class="ly">y 0</div></div>`,
      run: `MW.uiLayerExplode(q(".le"), tl, 0, { panels: ".lp.a, .lp.b, .lp.c" });`, duration: 3.6 },
  }),

  T("motion/parallax-pan", {
    uses: ["drive", "draw"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll("[data-depth]"));
      return MW.drive(tl, at, o.keys[o.keys.length - 1][0], function (t) {
        var x = MW.path(o.keys.map(function (k) { return [k[0], k[1], 0]; }), t)[0];
        Ls.forEach(function (l) { gsap.set(l, { x: x * parseFloat(l.getAttribute("data-depth")) }); });
      });
    },
    options: { keys: "[[s, x px], ...] of the swing (±238: 44 of 320 × 5.4), eased in-out per move", factors: "by data-depth (0.25 / 0.6 / 1)" },
    defaults: { keys: [[0, 0], [0.35, 0], [1.05, 238], [1.85, 238], [2.75, -238], [3.45, -238], [4.15, 0]] },
    demo: { css: `${BG}\n.pp { position: absolute; inset: 0; } .pp > div { position: absolute; left: 50%; top: 50%; border-radius: 36px; box-sizing: border-box; }
.l1 { width: 1015px; height: 562px; margin: -330px 0 0 -560px; background: linear-gradient(180deg, #2a3a78, #4a2d5c); } .l2 { width: 864px; height: 454px; margin: -190px 0 0 -380px; background: #1b2130; border: 4px solid #2a3350; padding: 50px; font-size: 44px; font-weight: 700; color: #c9d2ea; }
.l3 { width: 648px; height: 346px; margin: -40px 0 0 -120px; background: linear-gradient(160deg, #a693ff, #6a4cf0); display: grid; place-items: center; font-size: 56px; font-weight: 800; box-shadow: 0 40px 90px rgba(0,0,0,0.5); }`,
      html: `<div class="gm pp"><div class="l1" data-depth="0.25"></div><div class="l2" data-depth="0.6">Nội dung bài viết</div><div class="l3" data-depth="1">Giao diện</div></div>`,
      run: `MW.motionParallaxPan(q(".pp"), tl, 0, {});`, duration: 4.3 },
  }),

  T("ui/search-results-fly", {
    kind: "block",
    uses: ["drive", "spring", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, sp = MW.spring(220, 22), inn = gsap.parseEase("power2.in"), cols = ["#3dd6f5", "#8b7bff", "#ffd23d", "#ff5d8f", "#3ddc84", "#ffb547"];
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear();
        var foc = t > 0.15 && t < o.closeAt + 0.4, n = Math.round(Math.max(0, Math.min(1, (t - 0.25) / 0.5)) * o.query.length), q = o.query.slice(0, n);
        MW.rr(c, 50, 22, 220, 30, 15); c.fillStyle = "#151a28"; c.fill(); c.strokeStyle = foc ? "#8b7bff" : "#3a4466"; c.lineWidth = 1.5; c.stroke();
        c.strokeStyle = "#9aa3b8"; c.lineWidth = 1.5; c.beginPath(); c.arc(66, 37, 5, 0, 2 * Math.PI); c.stroke(); c.beginPath(); c.moveTo(70, 41); c.lineTo(74, 45); c.stroke();
        MW.txt(c, q, 82, 37.5, 12, "#e8ebf3", 600, "left");
        if (foc && Math.floor(t * 2.5) % 2 === 0) { c.font = "600 12px Inter, sans-serif"; var w = c.measureText(q).width; c.fillStyle = "#e8ebf3"; c.fillRect(83 + w, 30, 1.2, 15); }
        for (var i = 0; i < 6; i++) {
          var s0 = 1 + 0.07 * i, v = t >= s0 ? sp.at(t - s0) : 0, cs = o.closeAt + 0.03 * (5 - i);
          if (t >= cs) v *= 1 - inn(Math.min(1, (t - cs) / 0.25));
          if (v <= 0.001) continue;
          var gx = 76 + (i % 3) * 84, gy = 96 + Math.floor(i / 3) * 52, x = 160 + (gx - 160) * v, y = 37 + (gy - 37) * v, s = 0.3 + 0.7 * v;
          c.globalAlpha = Math.min(1, 2 * v); c.save(); c.translate(x, y); c.scale(s, s); MW.rr(c, -34, -22, 68, 44, 7); c.fillStyle = "#1b2130"; c.fill(); c.strokeStyle = "#2a3350"; c.stroke();
          c.fillStyle = cols[i]; MW.rr(c, -28, -16, 22, 22, 4); c.fill(); c.fillStyle = "#3a4466"; c.fillRect(0, -14, 26, 4); c.fillRect(0, -6, 18, 4); c.restore(); c.globalAlpha = 1;
        }
      });
    },
    options: { query: "the typed words ('thiết kế')", closeAt: "s results fly back (3.15)", loop: "s (3.8)" },
    defaults: { query: "thiết kế", closeAt: 3.15, loop: 3.8 },
    demo: CV("uiSearchResultsFly", 3.8),
  }),

  T("ui/orbit-context-menu", {
    kind: "block",
    uses: ["drive", "spring", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, sp = MW.spring(150, 17), inn = gsap.parseEase("power2.in"), slots = [-150, -90, -30], cols = ["#3dd6f5", "#ffd23d", "#ff5d8f"], R = 62;
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var cur = MW.path([[0, 250, 170], [0.1, 250, 170], [0.42, 168, 108]], t);
        slots.forEach(function (sl, i) {
          var s0 = o.openAt + 0.08 * i, v = t >= s0 ? sp.at(t - s0) : 0, ce = o.closeAt + 0.05 * i, ex = t >= ce ? inn(Math.min(1, (t - ce) / 0.35)) : 0;
          if (v <= 0.001) return; var ang = (sl - 130 * (1 - v) + 78 * ex) * Math.PI / 180, x = 160 + R * Math.cos(ang), y = 100 + R * Math.sin(ang), s = 0.6 + 0.4 * Math.min(1, v);
          var trail = t < 2 ? Math.max(0, 1 - (t - s0) / (2 - s0)) : 0;
          if (trail > 0) { c.globalAlpha = trail * 0.7; c.strokeStyle = "#8b7bff"; c.lineWidth = 2; c.beginPath(); c.arc(160, 100, R, (sl - 130) * Math.PI / 180, ang); c.stroke(); }
          c.globalAlpha = 1 - ex; c.fillStyle = "#222a42"; c.beginPath(); c.arc(x, y, 15 * s, 0, 2 * Math.PI); c.fill(); c.strokeStyle = cols[i]; c.lineWidth = 2; c.stroke();
          c.fillStyle = cols[i]; MW.rr(c, x - 5 * s, y - 5 * s, 10 * s, 10 * s, 2); c.fill(); c.globalAlpha = 1;
        });
        c.fillStyle = "#8b7bff"; c.beginPath(); c.arc(160, 100, t > 0.45 && t < 0.55 ? 20 : 22, 0, 2 * Math.PI); c.fill(); MW.txt(c, "SỬA", 160, 100.5, 11, "#fff", 900);
        MW.cursor(c, cur[0], cur[1], 1.1);
      });
    },
    options: { openAt: "s (0.55; 0.08 s apart, spring k150 d17)", closeAt: "s (2.95)", loop: "s (3.6)" },
    defaults: { openAt: 0.55, closeAt: 2.95, loop: 3.6 },
    demo: CV("uiOrbitContextMenu", 3.6),
  }),

  T("card/depth-cycle", {
    kind: "block",
    uses: ["drive", "spring", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, sp = MW.spring(220, 22), io = gsap.parseEase("power2.inOut"), cols = ["#a693ff", "#3dd6f5", "#ffd23d"];
      return MW.drive(tl, at, o.cycle * o.cycles, function (t) {
        S.clear(); var n = Math.min(o.cycles - 1, Math.floor(t / o.cycle)), u = t - n * o.cycle, cards = [];
        for (var j = 0; j < 3; j++) {
          var id = (j + n) % 3, slot = j, x = 0, hl = 0;
          if (j === 0) { var out = io(Math.max(0, Math.min(1, (u - 0.2) / 0.35))), sink = io(Math.max(0, Math.min(1, (u - 0.45) / 0.45))), back = io(Math.max(0, Math.min(1, (u - 0.78) / 0.34)));
            x = 142 * out * (1 - back); slot = 2 * sink; hl = u > 0.05 && u < 0.45 ? 1 : 0; }
          else slot = j - (u >= 0.5 ? Math.min(1, sp.at(u - 0.5)) : 0);
          cards.push({ id: id, slot: slot, x: x, hl: hl });
        }
        cards.sort(function (a, b) { return b.slot - a.slot; }).forEach(function (q) {
          var s = 1 - 0.14 * q.slot; c.save(); c.translate(160 + q.x, 112 - 21 * q.slot); c.rotate(0.0015 * q.x); c.scale(s, s);
          MW.rr(c, -60, -37, 120, 74, 9); c.fillStyle = "#1b2130"; c.fill(); c.strokeStyle = q.hl ? "#8b7bff" : "#2a3350"; c.lineWidth = q.hl ? 2.5 : 1.2; c.stroke();
          c.fillStyle = cols[q.id]; MW.rr(c, -50, -27, 30, 30, 6); c.fill(); c.fillStyle = "#3a4466"; c.fillRect(-12, -24, 54, 6); c.fillRect(-12, -12, 36, 6);
          c.fillStyle = "rgba(5,6,10," + (0.27 * q.slot) + ")"; MW.rr(c, -60, -37, 120, 74, 9); c.fill(); c.restore();
        });
      });
    },
    options: { cycle: "s per card (1.6)", cycles: "cards cycled (3)" }, defaults: { cycle: 1.6, cycles: 3 },
    demo: CV("cardDepthCycle", 4.8),
  }),

  T("motion/calendar-flip", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var io = gsap.parseEase("power2.inOut"), shade = document.createElement("div"), back = document.createElement("div");
      shade.style.cssText = "position:absolute;inset:0;background:#05060a;pointer-events:none;opacity:0;border-radius:inherit;"; el.appendChild(shade);
      back.style.cssText = "position:absolute;inset:0;background:#d9d6cc;border-radius:inherit;visibility:hidden;"; el.appendChild(back);
      el.parentNode.style.perspective = o.perspective + "px";
      return MW.drive(tl, at, o.backAt + 0.45, function (t) {
        var p = t < o.at ? 0 : t < o.at + o.duration ? io((t - o.at) / o.duration) : t < o.backAt ? 1 : 1 - io(Math.min(1, (t - o.backAt) / 0.45)), a = o.angle * p, aa = Math.abs(a);
        gsap.set(el, { rotationX: a, transformOrigin: "50% 0%" });
        var over = aa > 90; back.style.visibility = over ? "visible" : "hidden"; shade.style.opacity = over ? "0" : String(o.shade * Math.sin(aa * Math.PI / 180));
        el.style.opacity = aa < 110 ? "1" : String(Math.max(0, 1 - (aa - 110) / 48));
      });
    },
    options: { angle: "degrees about the top edge (−170)", duration: "s (0.8)", at: "s (0.45)", backAt: "s (3.05)", shade: "darkest shade (0.45)", perspective: "px (2300)" },
    defaults: { angle: -170, duration: 0.8, at: 0.45, backAt: 3.05, shade: 0.45, perspective: 2300 },
    demo: { css: `${BG}\n.cal { position: absolute; left: 50%; top: 170px; width: 604px; margin-left: -302px; } .cal .hd { height: 150px; border-radius: 40px 40px 0 0; background: linear-gradient(180deg, #9c88ff, #7357f5); display: grid; place-items: center; font-size: 60px; font-weight: 900; letter-spacing: 0.1em; position: relative; }
.cal .hd i { position: absolute; top: -26px; width: 28px; height: 70px; border-radius: 14px; background: #c9d2ea; } .pgs { position: relative; height: 500px; }
.pg2 { position: absolute; inset: 0; border-radius: 0 0 40px 40px; background: #f4f1ea; color: #2a2a35; display: grid; place-items: center; text-align: center; }
.pg2 b { display: block; font-size: 260px; line-height: 1; } .pg2 span { font-size: 48px; font-weight: 800; letter-spacing: 0.08em; color: #8b7bff; }`,
      html: `<div class="gm"><div class="cal"><div class="hd">THÁNG 10<i style="left:140px"></i><i style="right:140px"></i></div><div class="pgs"><div class="pg2"><div><b>25</b><span>THỨ SÁU · RA MẮT</span></div></div><div class="pg2 top"><div><b>24</b><span style="color:#5a6275">THỨ NĂM</span></div></div></div></div></div>`,
      run: `MW.motionCalendarFlip(q(".top"), tl, 0, {});`, duration: 3.8 },
  }),

  T("cursor/raycast-select", {
    kind: "block",
    uses: ["drive", "spring", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, out = gsap.parseEase("power2.out"), inn = gsap.parseEase("power2.in"), sp = MW.spring(300, 14), cards = [[96, 64, 0.7, "#3dd6f5"], [196, 100, 1, "#8b7bff"], [262, 58, 0.82, "#ffd23d"]];
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var O = [40, 160], B = cards[1], g = Math.max(0, Math.min(1, (t - o.clickAt) / 0.45)), head = out(g), tail = t > 2.9 ? inn(Math.min(1, (t - 2.9) / 0.3)) : 0, hit = t >= o.clickAt + 0.45, sel = hit && t < 3.1 + 0.3 * 0;
        cards.forEach(function (q, i) {
          var s = q[2] * (i === 1 && hit && t < 3.4 ? 1 + 0.06 * (1 - sp.at(t - o.clickAt - 0.45)) : 1), on = i === 1 && hit && t < 3.1 + 0.3 * Math.min(1, Math.max(0, (t - 3.1) / 0.3));
          c.save(); c.translate(q[0], q[1]); c.scale(s, s); MW.rr(c, -40, -24, 80, 48, 7); c.fillStyle = "#1b2130"; c.fill(); c.strokeStyle = on ? "#8b7bff" : "#2a3350"; c.lineWidth = on ? 2.5 : 1.2; c.stroke();
          c.fillStyle = q[3]; MW.rr(c, -32, -16, 18, 18, 4); c.fill(); c.fillStyle = "#3a4466"; c.fillRect(-8, -14, 36, 5); c.fillRect(-8, -4, 24, 5);
          if (on) { c.strokeStyle = "rgba(139,123,255,0.5)"; c.lineWidth = 1; MW.rr(c, -47, -31, 94, 62, 10); c.stroke(); } c.restore();
        });
        if (g > 0 && tail < 1) { var x0 = O[0] + (B[0] - O[0]) * tail, y0 = O[1] + (B[1] - O[1]) * tail, x1 = O[0] + (B[0] - O[0]) * head, y1 = O[1] + (B[1] - O[1]) * head;
          c.strokeStyle = "#8b7bff"; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.fillStyle = "#d6ccff"; c.beginPath(); c.arc(x1, y1, 3, 0, 2 * Math.PI); c.fill(); }
        var d = t - o.clickAt - 0.45; if (d > 0 && d < 0.4) { c.globalAlpha = 1 - d / 0.4; c.strokeStyle = "#8b7bff"; c.lineWidth = 2; c.beginPath(); c.arc(B[0], B[1], 6 + 26 * out(d / 0.4), 0, 2 * Math.PI); c.stroke(); c.globalAlpha = 1; }
        c.fillStyle = "#e8ebf3"; c.beginPath(); c.arc(O[0], O[1], 7, 0, 2 * Math.PI); c.fill(); c.strokeStyle = "#4a5478"; c.lineWidth = 1.5; c.beginPath(); c.arc(O[0], O[1], 12, 0, 2 * Math.PI); c.stroke();
        MW.cursor(c, O[0] + 6, O[1] + 4, t > o.clickAt - 0.05 && t < o.clickAt + 0.1 ? 0.9 : 1);
      });
    },
    options: { clickAt: "s (0.5); the ray reaches the target in 0.45 s ease-out", loop: "s (3.6)" }, defaults: { clickAt: 0.5, loop: 3.6 },
    demo: CV("cursorRaycastSelect", 3.6),
  }),

  T("effect/sonar-locator", {
    kind: "block",
    uses: ["drive", "springs", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, P = [[0, 228, 52], [2.0, 228, 52], [2.6, 86, 78], [3.6, 86, 78], [4.2, 228, 52]];
      var bearing = function (p) { return Math.atan2(p[2] - 100, p[1] - 160); }, br = MW.springTo(120, 18, [[0, bearing(P[0])], [2.0, bearing(P[2])], [3.6, bearing(P[4])]]);
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); [32, 58, 84].forEach(function (r) { c.strokeStyle = "#262c3a"; c.lineWidth = 1; c.beginPath(); c.arc(160, 100, r, 0, 2 * Math.PI); c.stroke(); });
        c.beginPath(); c.moveTo(70, 100); c.lineTo(250, 100); c.moveTo(160, 10); c.lineTo(160, 190); c.stroke();
        var reach = 0;
        for (var k = Math.max(0, Math.floor((t - 1.4) / o.emit)); k * o.emit <= t; k++) {
          var t0 = k * o.emit, age = t - t0; if (age < 0 || age > 1.4) continue; var sp = MW.path(P, t0), r = 90 * age, d = Math.hypot(sp[0] - 160, sp[1] - 100);
          if (Math.abs(r - d) < 6) reach = Math.max(reach, 1 - Math.abs(r - d) / 6);
          c.globalAlpha = 1 - age / 1.4; c.strokeStyle = "#8b7bff"; c.lineWidth = 1.5; c.beginPath(); c.arc(sp[0], sp[1], r, 0, 2 * Math.PI); c.stroke();
        }
        c.globalAlpha = 1; var p = MW.path(P, t), b = br(t);
        c.fillStyle = "#3dd6f5"; c.beginPath(); c.arc(p[0], p[1], 7, 0, 2 * Math.PI); c.fill();
        c.strokeStyle = reach > 0 ? "#d6ccff" : "#8b7bff"; c.lineWidth = 4 + 3 * reach; c.lineCap = "round"; c.beginPath(); c.arc(160, 100, 20, b - 0.45, b + 0.45); c.stroke(); c.lineCap = "butt";
        c.fillStyle = "#e8ebf3"; c.beginPath(); c.arc(160, 100, 5, 0, 2 * Math.PI); c.fill();
      });
    },
    options: { emit: "s between pings (0.6); each grows 90 units/s and fades over 1.4 s", loop: "s (4.3)" }, defaults: { emit: 0.6, loop: 4.3 },
    demo: CV("effectSonarLocator", 4.3),
  }),
];

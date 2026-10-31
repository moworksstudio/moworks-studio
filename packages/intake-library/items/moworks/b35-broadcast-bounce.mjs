// Broadcast & Telop and Bounce & Reaction (batch 3.5): lower thirds, tickers, banners, credits and Japanese-TV style telops (outlines drawn
// with paint-order so the stroke sits outside the fill), and bounces, recoils, springs and shakes on the element itself; written here.
import { T } from "../../moworks/define.mjs";
import { CURSOR } from "../../moworks/stages.mjs";
import { LANDSCAPE } from "../../demo-media.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const FT = `${BG}\n.ft { position: absolute; inset: 0; background: url(assets/shot.svg) center / cover; } .ft::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.55)); }`;
const SHOT = [{ path: "shot.svg", data: LANDSCAPE }];
const ST = `.st { position: absolute; inset: 0; display: grid; place-items: center; }`;
const FLOOR = `.fl { position: absolute; left: 260px; right: 260px; top: 860px; height: 4px; border-radius: 2px; background: #262c3a; }`;
const TEL = (w, col) => `-webkit-text-stroke: ${w}em ${col}; paint-order: stroke fill;`;
const CV = (name, duration = 4, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });

export default [
  T("lower/name-role-tag", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var bar = el.querySelector(o.bar), np = el.querySelector(o.name), rp = el.querySelector(o.role), nt = np.firstElementChild, rt = rp.firstElementChild, ex = gsap.parseEase("expo.out"), pin = gsap.parseEase("power2.in"), d = o.start - 0.3, e = o.outAt - 4.3;
      var S = function (t, a, b, f) { return (f || ex)(Math.max(0, Math.min(1, (t - a - d) / (b - a)))); }, O = function (t, a, b) { return pin(Math.max(0, Math.min(1, (t - a - e) / (b - a)))); };
      gsap.set(bar, { transformOrigin: "50% 50%" });
      return MW.drive(tl, at, 4.75 + e + 0.1, function (t) {
        gsap.set(bar, { scaleY: S(t, 0.3, 0.55) * (1 - O(t, 4.5, 4.75)) });
        var n1 = S(t, 0.35, 0.75), n2 = O(t, 4.42, 4.72), r1 = S(t, 0.52, 0.92); np.style.clipPath = "inset(0 " + (100 * (1 - n1)).toFixed(2) + "% 0 " + (100 * n2).toFixed(2) + "%)"; rp.style.clipPath = "inset(0 " + (100 * (1 - r1)).toFixed(2) + "% 0 " + (100 * n2).toFixed(2) + "%)";
        var tf = 1 - Math.max(0, Math.min(1, (t - 4.3 - e) / 0.15)), a = S(t, 0.45, 0.7), b = S(t, 0.62, 0.85); nt.style.opacity = String(a * tf); gsap.set(nt, { x: -o.slide[0] * (1 - a) }); rt.style.opacity = String(b * tf); gsap.set(rt, { x: -o.slide[1] * (1 - b) });
      });
    },
    options: { bar: "", name: "the name plate (its first child is the text)", role: "the role tag", start: "s (0.3)", outAt: "s the text starts to leave (4.3; hold 5–7 s in a film)", slide: "[name, role] px the text slides in ([72, 56])" },
    defaults: { bar: ".lt-bar", name: ".lt-n", role: ".lt-r", start: 0.3, outAt: 4.3, slide: [72, 56] },
    notes: "The role tag comes in about five frames after the name plate; plates wipe in from the left and off to the right (expo.out in, power2.in out).",
    assets: SHOT,
    demo: { css: `${FT}\n.lt { position: absolute; left: 160px; bottom: 200px; width: 1200px; height: 200px; } .lt-bar { position: absolute; left: 0; top: 0; width: 16px; height: 200px; background: #8b7bff; }
.lt-n { position: absolute; left: 32px; top: 0; height: 120px; padding: 0 48px; background: rgba(12,14,20,0.92); border-radius: 8px; display: flex; align-items: center; font-size: 76px; font-weight: 800; white-space: nowrap; }
.lt-r { position: absolute; left: 88px; top: 136px; height: 64px; padding: 0 32px; background: #8b7bff; display: flex; align-items: center; font-size: 40px; font-weight: 700; color: #fff; white-space: nowrap; } .lt span { display: block; }`,
      html: `<div class="ft"></div><div class="lt"><i class="lt-bar"></i><div class="lt-n"><span>Nguyễn Minh Anh</span></div><div class="lt-r"><span>Đạo diễn hình ảnh</span></div></div>`, run: `MW.lowerNameRoleTag(q(".lt"), tl, 0, {});`, duration: 5 },
  }),

  T("lower/news-crawl", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var tr = el.querySelector(o.track), unit = tr.firstElementChild, fr = Math.round(o.loop * 60), w = unit.offsetWidth, px = Math.max(o.minPx, Math.ceil(w / fr)), W = px * fr;
      unit.style.paddingRight = (W - w + (parseFloat(getComputedStyle(unit).paddingRight) || 0)) + "px"; unit.style.boxSizing = "content-box"; var w2 = unit.offsetWidth, k = W / w2;
      for (var i = 0; i < 3; i++) tr.appendChild(unit.cloneNode(true));
      return MW.drive(tl, at, o.loop * o.loops, function (t) { var pos = (Math.floor(t * 60 + 1e-6) * px) % W; gsap.set(tr, { x: -pos / (k || 1) }); });
    },
    options: { track: "the moving row (its first child is one headline unit)", loop: "s for one unit (4): the speed is a whole number of px per 60 fps frame", minPx: "px a frame at least (8)", loops: "(1)" },
    defaults: { track: ".nc-t", loop: 4, minPx: 8, loops: 1 },
    notes: "Position = floor(t × 60) × px, never fractional, so the crawl never judders; the unit is padded so the loop is seamless.",
    assets: SHOT,
    demo: { css: `${FT}\n.nc { position: absolute; left: 0; right: 0; bottom: 70px; height: 120px; background: rgba(10,12,18,0.94); border-top: 8px solid #8b7bff; overflow: hidden; } .nc-l { position: absolute; left: 0; top: 0; bottom: 0; width: 232px; z-index: 2; background: #8b7bff; display: grid; place-items: center; font-size: 46px; font-weight: 800; color: #fff; }
.nc-v { position: absolute; left: 232px; right: 0; top: 0; bottom: 0; overflow: hidden; } .nc-t { position: absolute; left: 0; top: 0; height: 100%; display: flex; white-space: nowrap; } .nc-u { display: flex; align-items: center; height: 100%; font-size: 58px; font-weight: 700; padding-left: 40px; }
.nc-u i { width: 22px; height: 22px; border-radius: 50%; background: #8b7bff; margin: 0 40px; flex: none; }`,
      html: `<div class="ft"></div><div class="nc"><div class="nc-l">TIN MỚI</div><div class="nc-v"><div class="nc-t"><div class="nc-u">Hà Nội đón đợt không khí lạnh đầu mùa<i></i>Giá vé tàu Tết bắt đầu mở bán<i></i></div></div></div></div>`,
      run: `MW.lowerNewsCrawl(q(".nc"), tl, 0, {});`, duration: 4 },
  }),

  T("lower/breaking-banner", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var b = el.querySelector(o.banner), tx = b.firstElementChild, ln = o.line ? el.querySelector(o.line) : null, p2 = gsap.parseEase("power2.out"), ex = gsap.parseEase("expo.out"), pin = gsap.parseEase("power2.in"), W = b.offsetWidth;
      gsap.set(b, { transformOrigin: "0% 50%" }); if (ln) gsap.set(ln, { transformOrigin: "0% 50%" });
      var wipe = o.frames / 30, we = o.start + wipe;
      return MW.drive(tl, at, o.outAt + 0.3 + 0.05, function (t) {
        var s = p2(Math.max(0, Math.min(1, (t - o.start) / wipe))), x = pin(Math.max(0, Math.min(1, (t - o.outAt) / 0.3)));
        gsap.set(b, { scaleX: s, x: W * 1.1 * x }); if (ln) gsap.set(ln, { scaleX: s, x: W * 1.1 * x });
        var fl = t >= we && t < we + 0.75 ? Math.floor((t - we) / 0.125) % 2 : 0; b.style.background = fl ? o.light : o.accent; tx.style.color = fl ? o.accent : o.light;
        var u = ex(Math.max(0, Math.min(1, (t - we - o.delay / 30) / 0.2))); gsap.set(tx, { x: o.slide * (1 - u) + o.textOut * x, skewX: o.skew * (1 - u) }); tx.style.visibility = t >= we + o.delay / 30 ? "visible" : "hidden";
      });
    },
    options: { banner: "the banner (its first child is the headline)", line: "a thin line above it", start: "s (0.3)", frames: "frames at 30 fps of the wipe (8)", delay: "frames before the headline (6)", slide: "px the headline slides from (560)", skew: "degrees at the start (17)", outAt: "s (3.05, 0.3 s power2.in off to the right)", textOut: "px the text travels on the way out (1200)", accent: "", light: "" },
    defaults: { banner: ".bb-b", line: ".bb-l", start: 0.3, frames: 8, delay: 6, slide: 560, skew: 17, outAt: 3.05, textOut: 1200, accent: "#ff3b4f", light: "#ffffff" },
    notes: "After the wipe the banner flashes accent and light every 0.125 s for 0.75 s (4 Hz, three times), the text colour inverted.",
    assets: SHOT,
    demo: { css: `${FT}\n.bb { position: absolute; left: 160px; bottom: 210px; } .bb-l { position: absolute; left: 0; top: -28px; width: 1168px; height: 8px; background: #0b0d12; } .bb-b { position: relative; width: 1168px; height: 176px; border-radius: 8px; overflow: hidden; display: flex; align-items: center; padding-left: 56px; box-sizing: border-box; }
.bb-b span { font-size: 104px; font-weight: 900; white-space: nowrap; letter-spacing: -0.01em; }`,
      html: `<div class="ft"></div><div class="bb"><i class="bb-l"></i><div class="bb-b"><span>TIN NÓNG: BÃO SỐ 9</span></div></div>`, run: `MW.lowerBreakingBanner(q(".bb"), tl, 0, {});`, duration: 3.5 },
  }),

  T("title/credits-roll", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var col = el.querySelector(o.column), unit = col.firstElementChild, fr = Math.round(o.loop * 60), h = unit.offsetHeight, px = Math.max(o.minPx, Math.ceil(h / fr)), H = px * fr;
      unit.style.paddingBottom = (H - h) + "px"; col.appendChild(unit.cloneNode(true)); col.appendChild(unit.cloneNode(true));
      return MW.drive(tl, at, o.loop * o.loops, function (t) { gsap.set(col, { y: -((Math.floor(t * 60 + 1e-6) * px) % H) }); });
    },
    options: { column: "the moving column (its first child is one pass of the list)", loop: "s for one pass (6)", minPx: "px a frame at least (4)", loops: "(1)" },
    defaults: { column: ".cr-c", loop: 6, minPx: 4, loops: 1 },
    notes: "A whole number of px per 60 fps frame, never fractional; recipe colours #ebebeb on #101010.",
    demo: { css: `#demo { background: #101010; color: #ebebeb; font-family: Inter, sans-serif; } .cr { position: absolute; inset: 0; overflow: hidden; } .cr-c { position: absolute; left: 0; right: 0; top: 0; text-align: center; }
.cr-c > div { padding-top: 120px; } .cr-c p { margin: 0 0 90px; } .cr-c b { display: block; font-family: 'JetBrains Mono', monospace; font-size: 36px; font-weight: 500; letter-spacing: 0.12em; color: #8a8a8a; margin-bottom: 20px; } .cr-c span { font-size: 68px; font-weight: 700; }`,
      html: `<div class="cr"><div class="cr-c"><div>${[["ĐẠO DIỄN", "Trần Bảo Ngọc"], ["BIÊN KỊCH", "Lê Hoàng Phúc"], ["QUAY PHIM", "Phạm Quốc Huy"], ["DỰNG PHIM", "Võ Thanh Hà"], ["ÂM THANH", "Đỗ Minh Khoa"], ["SẢN XUẤT", "Moworks Studio"]].map(([r, n]) => `<p><b>${r}</b><span>${n}</span></p>`).join("")}</div></div></div>`,
      run: `MW.titleCreditsRoll(q(".cr"), tl, 0, {});`, duration: 6 },
  }),

  T("text/led-matrix", {
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, R = o.rows, P = o.pitch, V = o.cols, off = document.createElement("canvas"), g = off.getContext("2d");
      g.font = "800 " + o.font + "px Inter, sans-serif"; var tw = Math.ceil(g.measureText(o.text).width) + 2; off.width = tw; off.height = R; g.font = "800 " + o.font + "px Inter, sans-serif"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText(o.text, 1, R / 2 + 1);
      var px = g.getImageData(0, 0, tw, R).data, lit = function (x, y) { return x >= 0 && x < tw && px[(y * tw + x) * 4 + 3] > 100; }, total = tw + o.gap, W = V * P, H = R * P, L = 160 - W / 2, Tp = 100 - H / 2;
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); MW.rr(c, L - 8, Tp - 8, W + 16, H + 16, 6); c.fillStyle = "#0c0d10"; c.fill();
        var step = Math.floor(t / o.step);
        for (var col = 0; col < V; col++) { var bx = ((col + step - V) % total + total) % total; for (var y = 0; y < R; y++) { var on = lit(bx, y), x = L + col * P + P / 2, yy = Tp + y * P + P / 2;
          if (on) { c.save(); c.shadowColor = o.lamp; c.shadowBlur = 8 * S.k / 2; c.fillStyle = o.lamp; c.beginPath(); c.arc(x, yy, 2.3, 0, 2 * Math.PI); c.fill(); c.restore(); } else { c.fillStyle = "#2a2a2a"; c.beginPath(); c.arc(x, yy, 1.9, 0, 2 * Math.PI); c.fill(); } } }
      });
    },
    options: { text: "", rows: "(16; the small demo 14, 8–16 allowed: room for Vietnamese marks)", font: "px used to draw the bitmap (11)", pitch: "units (6.2)", cols: "visible columns (44)", step: "s per column (0.045), it never glides", gap: "empty columns between repeats (12)", lamp: "lit colour", loop: "s (4.6)" },
    defaults: { text: "Chào mừng quý khách", rows: 16, font: 11, pitch: 6.2, cols: 44, step: 0.045, gap: 12, lamp: "#ff8a3d", loop: 4.6 },
    demo: CV("textLedMatrix", 4.6),
  }),

  T("text/telop-double-outline", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var txt = el.textContent, p1 = gsap.parseEase("power1.out"); el.textContent = ""; if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.display = "inline-block";
      [[o.outer * 2, o.shadow, o.shadow, o.offset], [o.outer * 2, o.accent, o.accent, 0], [o.inner * 2, o.light, o.fill, 0]].forEach(function (s, i) { var sp = document.createElement("span"); sp.textContent = txt; sp.style.cssText = "display:block;white-space:nowrap;" + (i ? "position:absolute;left:0;top:0;" : "") + "-webkit-text-stroke:" + s[0] + "em " + s[1] + ";paint-order:stroke fill;color:" + s[2] + ";" + (s[3] ? "transform:translate(" + s[3] + "em," + s[3] + "em);" : ""); el.appendChild(sp); });
      var a = 4 / 30, b = a + 6 / 30;
      return MW.drive(tl, at, o.offAt + 0.05, function (t) {
        var s = t <= 0 ? 0 : t < a ? 1.1 * p1(t / a) : t < b ? 1.1 - 0.1 * p1((t - a) / (b - a)) : 1; gsap.set(el, { scale: s }); el.style.visibility = t > 0 && t < o.offAt ? "visible" : "hidden";
      });
    },
    options: { inner: "em of light outline (0.18)", outer: "em of coloured outline (0.34)", offset: "em of the hard shadow (0.05)", fill: "", light: "", accent: "outer outline", shadow: "", offAt: "s after the start it cuts off (1.95)" },
    defaults: { inner: 0.18, outer: 0.34, offset: 0.05, fill: "#ffe14d", light: "#ffffff", accent: "#ff4f8b", shadow: "#1b1030", offAt: 1.95 },
    notes: "0 → 110 % in 4 frames and back to 100 % in 6 (30 fps), power1.out between the keys; cut, not faded.",
    assets: SHOT,
    demo: { css: `${FT}\n${ST} .td { font-size: 150px; font-weight: 900; letter-spacing: 0.03em; visibility: hidden; }`, html: `<div class="ft"></div><div class="st"><div class="td">Thật luôn hả?!</div></div>`, run: `MW.textTelopDoubleOutline(q(".td"), tl, 0.35, {});`, duration: 2.6 },
  }),

  T("text/telop-shiver", {
    uses: ["split", "drive", "noise"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, nz = MW.noise(o.seed);
      // the outlines go on a copy underneath, so one letter's stroke never covers its neighbour's fill
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      var under = el.cloneNode(true); under.removeAttribute("id"); under.style.cssText = "position:absolute;left:0;top:0;width:100%;margin:0;pointer-events:none;opacity:1;filter:none;"; el.insertBefore(under, el.firstChild);
      var uc = Array.prototype.slice.call(under.querySelectorAll(".mw-ch")); ch.forEach(function (c) { c.style.webkitTextStroke = "0"; });
      return MW.drive(tl, at, o.offAt + 0.05, function (t) {
        var q = Math.floor(t * 24) / 24; el.style.opacity = String(Math.max(0, Math.min(1, t / 0.12)) * (t < o.offAt ? 1 : 0));
        ch.forEach(function (c, i) { var p = q * o.rate + i * o.phase, s = { x: o.amp * nz(p), y: o.amp * nz(p + 61), rotation: o.rot * nz(p + 137) }; gsap.set(c, s); if (uc[i]) gsap.set(uc[i], s); });
      });
    },
    options: { amp: "± px (12)", rot: "± degrees (3)", rate: "noise units a second (10), sampled at 24 fps", phase: "noise offset between neighbours (2.59: about 30 % alike)", offAt: "s (2.4)", seed: "(5)" },
    defaults: { amp: 12, rot: 3, rate: 10, phase: 2.59, offAt: 2.4, seed: 5 },
    assets: SHOT,
    demo: { css: `${FT}\n${ST} .ts { font-size: 150px; font-weight: 900; letter-spacing: 0.03em; color: #f4f4f8; ${TEL(0.6, "#3d9bff")} filter: drop-shadow(8px 8px 0 #0b0d22); opacity: 0; }`, html: `<div class="ft"></div><div class="st"><div class="ts">Run quá trời!</div></div>`, run: `MW.textTelopShiver(q(".ts"), tl, 0.3, {});`, duration: 3 },
  }),

  T("lower/telop-plate-wipe", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var pl = el.querySelector(o.plate), tx = el.querySelector(o.text), ex = gsap.parseEase("expo.out"), pin = gsap.parseEase("power2.in"), w = o.frames / 30; gsap.set(pl, { transformOrigin: "0% 50%" });
      return MW.drive(tl, at, o.outAt + 0.17 + w + 0.05, function (t) {
        var s = ex(Math.max(0, Math.min(1, t / w))), u = ex(Math.max(0, Math.min(1, (t - w - o.delay / 30) / 0.3))), f = 1 - Math.max(0, Math.min(1, (t - o.outAt) / 0.15)), x = pin(Math.max(0, Math.min(1, (t - o.outAt - 0.17) / w)));
        pl.style.clipPath = "inset(0 0 0 " + (100 * x).toFixed(2) + "%)"; gsap.set(pl, { scaleX: s }); tx.style.opacity = String(u * f); gsap.set(tx, { x: -o.slide * (1 - u) });
      });
    },
    options: { plate: "", text: "", frames: "frames at 30 fps per wipe (7)", delay: "frames before the text (3)", slide: "px (56)", outAt: "s after the start the text fades (2.3)" },
    defaults: { plate: ".zp-p", text: ".zp-t", frames: 7, delay: 3, slide: 56, outAt: 2.3 },
    notes: "Exit: the text fades first, then the plate wipes off to the right.",
    assets: SHOT,
    demo: { css: `${FT}\n.zp { position: absolute; left: 50%; bottom: 150px; transform: translateX(-50%); overflow: hidden; padding: 24px 64px; } .zp-p { position: absolute; inset: 0; background: #8b7bff; border-radius: 12px; } .zp-t { position: relative; display: block; font-size: 104px; font-weight: 900; color: #fff; white-space: nowrap; opacity: 0; }`,
      html: `<div class="ft"></div><div class="zp"><i class="zp-p"></i><span class="zp-t">Bí quyết nấu phở ngon</span></div>`, run: `MW.lowerTelopPlateWipe(q(".zp"), tl, 0.35, {});`, duration: 3.4 },
  }),

  T("hand/tsukkomi-slam", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, bg = o.bg ? document.querySelector(o.bg) : null, p1 = gsap.parseEase("power1.in"), cv = document.createElement("canvas");
      if (getComputedStyle(host).position === "static") host.style.position = "relative"; var CW = host.clientWidth, CH = host.clientHeight, X0 = CW / 2, Y0 = CH / 2;
      cv.width = CW; cv.height = CH; cv.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;width:" + CW + "px;height:" + CH + "px;"; host.insertBefore(cv, el); var c = cv.getContext("2d"), imp = 3 / 30;
      return MW.drive(tl, at, o.offAt + 0.05, function (t) {
        var s = t <= 0 ? 0 : t < imp ? 2.5 - 1.5 * p1(t / imp) : 1, u = t - imp, f = Math.floor(u * 24), k = u > 0 && f < 8 ? 1 - f / 8 : 0, r = MW.rand(o.seed + f * 31), sx = (r() * 2 - 1) * o.shake * k, sy = (r() * 2 - 1) * o.shake * k;
        if (bg) gsap.set(bg, { x: sx, y: sy }); gsap.set(el, { scale: s, rotation: o.angle, x: sx / 2, y: sy / 2 }); el.style.visibility = t > 0 && t < o.offAt ? "visible" : "hidden";
        c.clearRect(0, 0, CW, CH); var a = u > 0 ? 0.75 * (1 - Math.max(0, Math.min(1, (u - 0.1) / 0.4))) : 0;
        if (a > 0 && t < o.offAt) { c.fillStyle = "rgba(255,255,255," + a.toFixed(3) + ")"; var rr = MW.rand(o.seed * 7 + f); for (var i = 0; i < o.rays; i++) { var th = i / o.rays * 2 * Math.PI + rr() * 0.05, w = 0.02 + rr() * 0.02, ri = o.inner[0] + rr() * (o.inner[1] - o.inner[0]);
          c.beginPath(); c.moveTo(X0 + ri * Math.cos(th), Y0 + 0.7 * ri * Math.sin(th)); c.lineTo(X0 + o.outer * Math.cos(th - w), Y0 + o.outer * Math.sin(th - w)); c.lineTo(X0 + o.outer * Math.cos(th + w), Y0 + o.outer * Math.sin(th + w)); c.closePath(); c.fill(); } }
      });
    },
    options: { angle: "degrees (−8)", shake: "± px for 8 frames at 24 fps, fading (48); the text moves half as much", rays: "speed-line wedges (40)", inner: "[min, max] px of the inner ellipse ([360, 560])", outer: "px (1400)", bg: "the shot that shakes", offAt: "s after the start (1.9)", seed: "(9)" },
    defaults: { angle: -8, shake: 48, rays: 40, inner: [360, 560], outer: 1400, bg: ".ft", offAt: 1.9, seed: 9 },
    notes: "Scale 2.5 → 1 in 3 frames (power1.in); the wedges re-jitter every 24 fps frame and fade 0.1–0.5 s after the hit.",
    assets: SHOT,
    demo: { css: `${FT}\n${ST} .tk { font-size: 176px; font-weight: 900; color: #fff; ${TEL(0.64, "#ff3b4f")} filter: drop-shadow(16px 16px 0 #12081c); visibility: hidden; }`, html: `<div class="ft"></div><div class="st"><div class="tk">Sao lại thế!</div></div>`,
      run: `MW.handTsukkomiSlam(q(".tk"), tl, 0.35, {});`, duration: 2.6 },
  }),

  T("text/telop-sparkle-burst", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, bo = gsap.parseEase("back.out(1.7)"), p2 = gsap.parseEase("power2.out"), r = MW.rand(o.seed), S = [], cols = o.colors, W = el.offsetWidth, Hh = el.offsetHeight, cx = el.offsetLeft + W / 2, cy = el.offsetTop + Hh / 2;
      if (getComputedStyle(host).position === "static") host.style.position = "relative"; if (getComputedStyle(el).position === "static") el.style.position = "relative";
      var star = function () { var d = document.createElement("div"); d.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;opacity:0;"; d.innerHTML = '<svg viewBox="-10 -10 20 20" width="100%" height="100%"><path d="M0 -10 L2.4 -2.4 L10 0 L2.4 2.4 L0 10 L-2.4 2.4 L-10 0 L-2.4 -2.4 Z" fill="currentColor"/></svg>'; host.appendChild(d); return d; };
      for (var i = 0; i < o.stars; i++) S.push({ d: star(), st: r() * 0.12, life: 0.7 + r() * 0.4, a: r() * 2 * Math.PI, far: 1.15 + r() * 0.5, size: o.size[0] + r() * (o.size[1] - o.size[0]), col: cols[i % cols.length] });
      var corner = [[-0.48, -0.6], [0.5, -0.55], [0.46, 0.62]].map(function (p, i) { return { d: star(), p: p, ph: i * 0.37 }; });
      var sw = el.cloneNode(true); sw.removeAttribute("id"); sw.style.cssText += ";position:absolute;left:0;top:0;margin:0;pointer-events:none;-webkit-text-stroke:0;color:transparent;-webkit-text-fill-color:transparent;-webkit-background-clip:text;background-clip:text;"; sw.style.backgroundImage = "linear-gradient(97deg, transparent 40%, rgba(255,255,255,0.75) 47%, rgba(255,255,255,0.75) 53%, transparent 60%)"; sw.style.backgroundSize = "300% 100%"; el.appendChild(sw);
      return MW.drive(tl, at, o.outAt + 0.25, function (t) {
        var s = 0.7 + 0.3 * bo(Math.max(0, Math.min(1, t / (7 / 30)))), x = Math.max(0, Math.min(1, (t - o.outAt) / 0.25)); gsap.set(el, { scale: s }); el.style.opacity = String(Math.min(1, t / 0.12) * (1 - x));
        S.forEach(function (q) { var u = (t - q.st) / q.life, p = p2(Math.max(0, Math.min(1, u))), f = 0.6 + (q.far - 0.6) * p, z = q.size * Math.sin(Math.PI * Math.max(0, Math.min(1, u)));
          q.d.style.width = q.d.style.height = z + "px"; q.d.style.color = q.col; gsap.set(q.d, { x: cx + Math.cos(q.a) * W / 2 * f - z / 2, y: cy + Math.sin(q.a) * Hh / 2 * f * 1.4 - z / 2, rotation: 2 * p * 57.3 }); q.d.style.opacity = u > 0 && u < 1 ? "1" : "0"; });
        corner.forEach(function (q) { var v = (t - 1 - q.ph) / 0.6, on = t > 1 && t < 2.7 - x * 0.1, z = 30 * Math.max(0, Math.sin(Math.PI * (v - Math.floor(v)))); q.d.style.width = q.d.style.height = z + "px"; q.d.style.color = "#ffe14d"; gsap.set(q.d, { x: cx + q.p[0] * W - z / 2, y: cy + q.p[1] * Hh - z / 2 }); q.d.style.opacity = on && t < o.outAt ? "1" : "0"; });
        var g = Math.max(0, Math.min(1, (t - o.sweepAt) / 0.6)); sw.style.backgroundPosition = (100 - 100 * g).toFixed(1) + "% 0"; sw.style.opacity = g > 0 && g < 1 ? "1" : "0";
      });
    },
    options: { stars: "(16)", size: "[min, max] px ([16, 36])", colors: "", sweepAt: "s the light band crosses (1.05, 0.6 s)", outAt: "s (2.6)", seed: "(4)" },
    defaults: { stars: 16, size: [16, 36], colors: ["#ffe14d", "#ffffff", "#3dd6f5"], sweepAt: 1.05, outAt: 2.6, seed: 4 },
    assets: SHOT,
    demo: { css: `${FT}\n${ST} .sb { font-size: 150px; font-weight: 900; color: #a99bff; ${TEL(0.48, "#160d33")} opacity: 0; }`, html: `<div class="ft"></div><div class="st"><div><div class="sb">Đẹp lung linh</div></div></div>`, run: `MW.textTelopSparkleBurst(q(".sb"), tl, 0.3, {});`, duration: 3 },
  }),

  T("text/speaker-color-captions", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var L = Array.prototype.slice.call(el.querySelectorAll(o.lines)), bo = gsap.parseEase("back.out(1.7)"), n = L.length;
      L.forEach(function (l) { l.style.webkitTextStrokeColor = l.getAttribute("data-color") || o.colors[0]; var b = l.querySelector(o.badge); if (b) b.style.background = l.getAttribute("data-color") || o.colors[0]; });
      return MW.drive(tl, at, n * o.turn, function (t) {
        L.forEach(function (l, i) { var st = i * o.turn + 0.1, u = (t - st) / (5 / 30), nx = (i + 1) * o.turn, out = i < n - 1 ? Math.max(0, Math.min(1, (t - (nx - 0.28)) / 0.15)) : 0;
          gsap.set(l, { scale: 0.85 + 0.15 * bo(Math.max(0, Math.min(1, u))) }); l.style.opacity = String(Math.max(0, Math.min(1, u * 3)) * (1 - out)); });
      });
    },
    options: { lines: "the caption lines, in order (each with data-color)", badge: "the speaker badge in a line", turn: "s per line (2.2; hold at least chars ÷ 4 s)", colors: "fallback outline colours" },
    defaults: { lines: ".sc-l", badge: ".sc-b", turn: 2.2, colors: ["#3d9bff"] },
    notes: "Each line pops 0.1 s after its turn starts (0.85 → 1 in 5 frames, back.out), all in the same place, and fades over 0.15 s ending 0.13 s before the next.",
    assets: SHOT,
    demo: { css: `${FT}\n.sc { position: absolute; left: 0; right: 0; bottom: 140px; height: 160px; } .sc-l { position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: center; align-items: center; gap: 30px; font-size: 92px; font-weight: 900; color: #fff; -webkit-text-stroke: 0.6em #3d9bff; paint-order: stroke fill; filter: drop-shadow(8px 8px 0 #0b0d22); opacity: 0; }
.sc-b { width: 72px; height: 72px; border-radius: 50%; display: grid; place-items: center; font-size: 40px; -webkit-text-stroke: 0; color: #fff; flex: none; }`,
      html: `<div class="ft"></div><div class="sc"><div class="sc-l" data-color="#3d9bff"><span class="sc-b">H</span>Hôm nay mình đi chợ sớm</div><div class="sc-l" data-color="#ff5d8f"><span class="sc-b">M</span>Mua được gì ngon không?</div><div class="sc-l" data-color="#3d9bff"><span class="sc-b">H</span>Cá tươi lắm, về kho liền</div></div>`,
      run: `MW.textSpeakerColorCaptions(q(".sc"), tl, 0, {});`, duration: 6.6 },
  }),

  T("lower/side-super", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var A = el.querySelector(o.a), B = el.querySelector(o.b), e = MW.ez(o.ease), d = o.frames / 30;
      return MW.drive(tl, at, o.loop, function (t) {
        var p = e(Math.max(0, Math.min(1, (t - o.swaps[0]) / d))) - e(Math.max(0, Math.min(1, (t - o.swaps[1]) / d)));
        A.style.opacity = String(1 - p); gsap.set(A, { y: -o.shift * p }); B.style.opacity = String(p); gsap.set(B, { y: o.shift * (1 - p) });
      });
    },
    options: { a: "the first segment plate", b: "the next", swaps: "s each swap starts ([1.0, 4.4])", frames: "frames at 30 fps per swap (10)", shift: "px (32)", ease: "(cubic-bezier(.65,0,.35,1))", loop: "s (5.2)" },
    defaults: { a: ".ss-a", b: ".ss-b", swaps: [1, 4.4], frames: 10, shift: 32, ease: "cubic-bezier(.65,0,.35,1)", loop: 5.2 },
    notes: "The show plate (top left) never moves; only the segment plate changes.",
    assets: SHOT,
    demo: { css: `${FT}\n.ss-s { position: absolute; left: 80px; top: 70px; height: 80px; padding: 0 30px; display: flex; align-items: center; background: rgba(10,12,18,0.9); border-left: 12px solid #8b7bff; border-radius: 8px; font-size: 44px; font-weight: 700; }
.ss { position: absolute; right: 80px; top: 70px; } .ss > div { position: absolute; right: 0; top: 0; padding: 18px 32px; background: rgba(10,12,18,0.9); border-right: 12px solid #3dd6f5; border-radius: 8px; font-size: 56px; font-weight: 800; text-align: right; white-space: nowrap; } .ss-b { opacity: 0; }`,
      html: `<div class="ft"></div><div class="ss-s">CHUYẾN ĐI CUỐI TUẦN</div><div class="ss"><div class="ss-a">Phần 1: Lên đường</div><div class="ss-b">Phần 2: Bản làng</div></div>`, run: `MW.lowerSideSuper(q(".ss"), tl, 0, {});`, duration: 5.2 },
  }),

  T("motion/overshoot", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var p2 = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), a = o.duration * 0.717;
      return MW.drive(tl, at, o.backAt == null ? o.duration : o.backAt + o.back, function (t) {
        var x = t < a ? o.distance * (1 + o.over) * p2(t / a) : o.distance * (1 + o.over - o.over * io(Math.min(1, (t - a) / (o.duration - a)))); if (o.backAt != null && t > o.backAt) x = o.distance * (1 - io(Math.min(1, (t - o.backAt) / o.back)));
        gsap.set(el, { x: x });
      });
    },
    options: { distance: "px (880)", over: "share past the end (0.08)", duration: "s (0.6): 72 % power2.out out, the rest power2.inOut back", backAt: "s after the start to return (null)", back: "s (0.4)" },
    defaults: { distance: 880, over: 0.08, duration: 0.6, backAt: null, back: 0.4 },
    demo: { css: `${BG}\n.os-t { position: absolute; left: 400px; width: 1120px; top: 640px; height: 6px; border-radius: 3px; background: #262c3a; } .os-m { position: absolute; left: 1400px; top: 380px; width: 4px; height: 300px; background: #3dd6f5; } .os-ml { position: absolute; left: 1360px; top: 330px; font-size: 32px; font-weight: 800; color: #3dd6f5; }
.os { position: absolute; left: 320px; top: 420px; width: 200px; height: 200px; border-radius: 30px; background: linear-gradient(150deg, #a693ff, #6a4cf0); }`,
      html: `<div class="os-t"></div><div class="os-m"></div><div class="os-ml">100 %</div><div class="os"></div>`, run: `MW.motionOvershoot(q(".os"), tl, 0.3, { backAt: 1.5 });`, duration: 2.4 },
  }),

  T("motion/bounce-land", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var sh = o.shadow ? el.parentNode.querySelector(o.shadow) : null, C = [o.fall], h = o.heights, d = o.durations; gsap.set(el, { transformOrigin: "50% 100%" });
      for (var i = 0; i < d.length; i++) C.push(C[i] + d[i]); var end = C[C.length - 1];
      return MW.drive(tl, at, Math.max(end + 0.05, o.driftTime), function (t) {
        var y = 0; if (t < o.fall) { var u = t / o.fall; y = -o.drop * (1 - u * u); } else for (var k = 0; k < d.length; k++) if (t < C[k + 1]) { var v = (t - C[k]) / d[k]; y = -h[k] * 4 * v * (1 - v); break; }
        var sq = 0; C.forEach(function (c, k) { var w = 1 - Math.abs(t - c) / 0.05; if (w > 0 && t > 0.01) sq = Math.max(sq, o.squash[k] * w); });
        gsap.set(el, { y: y, x: o.drift * Math.min(1, t / o.driftTime), scaleY: 1 - sq, scaleX: 1 / (1 - sq) });
        if (sh) { var f = 1 + y / o.drop; gsap.set(sh, { x: o.drift * Math.min(1, t / o.driftTime), scaleX: 0.4 + 0.6 * f }); sh.style.opacity = String(0.3 + 0.7 * f); }
      });
    },
    options: { drop: "px (424)", fall: "s (0.266)", heights: "px of each bounce ([208, 88, 32])", durations: "s of each bounce ([0.225, 0.142, 0.086])", squash: "at each contact ([0.32, 0.2, 0.1, 0.04]), a 0.1 s triangle", drift: "px to the right (560)", driftTime: "s, linear (0.78)", shadow: "" },
    defaults: { drop: 424, fall: 0.266, heights: [208, 88, 32], durations: [0.225, 0.142, 0.086], squash: [0.32, 0.2, 0.1, 0.04], drift: 560, driftTime: 0.78, shadow: null },
    notes: "The last contact lands at 0.719 s, the bounce.out timing.",
    demo: { css: `${BG}\n${FLOOR} .bl { position: absolute; left: 560px; top: 660px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #9af2ff, #2bb7e6 60%, #1278ad); } .bl-s { position: absolute; left: 540px; top: 846px; width: 240px; height: 28px; border-radius: 50%; background: rgba(0,0,0,0.6); filter: blur(8px); }`,
      html: `<div class="fl"></div><div class="bl-s"></div><div class="bl"></div>`, run: `MW.motionBounceLand(q(".bl"), tl, 0.3, { shadow: ".bl-s" });`, duration: 1.8 },
  }),

  T("motion/spring-follow", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var dots = Array.prototype.slice.call(el.querySelectorAll(o.dots)), sp = MW.spring(o.k, o.c), ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), pl = document.createElementNS(ns, "polyline");
      if (getComputedStyle(el).position === "static") el.style.position = "relative"; svg.setAttribute("width", el.clientWidth); svg.setAttribute("height", el.clientHeight); svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;pointer-events:none;"; pl.setAttribute("fill", "none"); pl.setAttribute("stroke", o.line); pl.setAttribute("stroke-width", "4"); svg.appendChild(pl); el.insertBefore(svg, el.firstChild);
      var home = dots.map(function (d) { return [d.offsetLeft + d.offsetWidth / 2, d.offsetTop + d.offsetHeight / 2]; });
      return MW.drive(tl, at, o.backAt + sp.duration + o.delay * (dots.length - 1), function (t) {
        var pts = []; dots.forEach(function (d, i) { var s0 = t - i * o.delay, a = s0 > 0 ? sp.at(s0) : 0, b = s0 - o.backAt > 0 ? sp.at(s0 - o.backAt) : 0, x = o.distance * (a - b); gsap.set(d, { x: x }); if (i) d.style.opacity = String(o.alphas[i - 1]); pts.push((home[i][0] + x).toFixed(1) + "," + home[i][1]); }); pl.setAttribute("points", pts.join(" "));
      });
    },
    options: { dots: "leader first", k: "spring stiffness (80)", c: "damping (10): about 12 % overshoot", delay: "s between followers (0.07)", distance: "px (900)", alphas: "followers' opacity", backAt: "s it all goes back (1.6)", line: "link colour" },
    defaults: { dots: ".sf-d", k: 80, c: 10, delay: 0.07, distance: 900, alphas: [0.82, 0.64, 0.46], backAt: 1.6, line: "#3a4466" },
    demo: { css: `${BG}\n.sf { position: absolute; inset: 0; } .sf-d { position: absolute; left: 420px; width: 90px; height: 90px; margin: -45px 0 0 -45px; border-radius: 50%; background: #8b7bff; } .sf-m { position: absolute; left: 1320px; top: 300px; width: 4px; height: 520px; background: #3dd6f5; opacity: 0.6; }`,
      html: `<div class="sf"><div class="sf-m"></div>${[360, 480, 600, 720].map((y) => `<div class="sf-d" style="top:${y}px"></div>`).join("")}</div>`, run: `MW.motionSpringFollow(q(".sf"), tl, 0.2, {});`, duration: 3.2 },
  }),

  T("motion/rubber-stretch", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, cur = o.cursor ? (host.querySelector(o.cursor) || document.querySelector(o.cursor)) : null, io = gsap.parseEase("power2.inOut"), sp = MW.spring(o.k, o.c), W = el.offsetWidth; gsap.set(el, { transformOrigin: "0% 50%" });
      var gx = el.offsetLeft + W, gy = el.offsetTop + el.offsetHeight / 2, rel = o.pullAt + o.pull;
      return MW.drive(tl, at, o.backAt + o.back + 0.2, function (t) {
        var x1 = Math.max(0, o.distance - (o.stretch - 1) * W), x = 0, s = 1; if (t > o.pullAt && t <= rel) { var u = io((t - o.pullAt) / o.pull); x = x1 * u; s = 1 + (o.stretch - 1) * u; } else if (t > rel) { var v = sp.at(t - rel); x = x1 + (o.rest - x1) * v; s = o.stretch + (1 - o.stretch) * v; }
        if (t > o.backAt) { var b = io(Math.min(1, (t - o.backAt) / o.back)); x = o.rest * (1 - b); s = 1; }
        gsap.set(el, { x: x, scaleX: s, scaleY: 1 / Math.sqrt(s) });
        if (cur) { var held = t > o.pullAt - 0.08 && t <= rel, cx = t <= o.pullAt ? gx + 260 * (1 - Math.min(1, t / o.pullAt)) : t <= rel ? el.offsetLeft + x + W * s : gx + (o.stretch - 1) * W + 140 * Math.min(1, (t - rel) / 0.5); gsap.set(cur, { x: cx - 30, y: gy - 6 + (t <= o.pullAt ? 160 * (1 - Math.min(1, t / o.pullAt)) : 0), scale: held ? 0.86 : 1, transformOrigin: "20% 10%" }); }
      });
    },
    options: { pullAt: "s (0.4)", pull: "s (0.38, power2.inOut)", stretch: "scaleX at full pull (1.8)", distance: "px the front end is pulled (525)", rest: "px of the new rest (185)", k: "spring stiffness on release (300)", c: "damping (11): about 35 % overshoot", backAt: "s it returns to its first slot (2.0)", back: "s (0.4)", cursor: "an optional cursor" },
    defaults: { pullAt: 0.4, pull: 0.38, stretch: 1.8, distance: 525, rest: 185, k: 300, c: 11, backAt: 2, back: 0.4, cursor: null },
    notes: "Stretched toward the pull from its left end; on release one spring brings the stretch back (dipping to about 0.72) and carries it to a new rest.",
    demo: { css: `${BG}\n.rs-w { position: absolute; inset: 0; } .rs { position: absolute; left: 520px; top: 470px; width: 380px; height: 140px; border-radius: 70px; background: linear-gradient(180deg, #9c88ff, #7357f5); } .ui-cursor { position: absolute; left: 0; top: 0; z-index: 20; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.5)); }`,
      html: `<div class="rs-w"><div class="rs"></div>${CURSOR}</div>`, run: `MW.motionRubberStretch(q(".rs"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.6 },
  }),

  T("motion/recoil", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, p3 = gsap.parseEase("power3.out"), p2 = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), K = o.keys, a = o.times[0], b = a + o.times[1], c = b + o.times[2], lines = [], sparks = [];
      if (getComputedStyle(host).position === "static") host.style.position = "relative"; gsap.set(el, { transformOrigin: "100% 50%" });
      for (var i = 0; i < 3; i++) { var l = document.createElement("div"); l.style.cssText = "position:absolute;height:8px;border-radius:4px;background:" + o.accent + ";opacity:0;pointer-events:none;"; host.appendChild(l); lines.push(l); }
      for (var j = 0; j < 5; j++) { var s = document.createElement("div"); s.style.cssText = "position:absolute;height:6px;width:60px;border-radius:3px;background:#ffd23d;opacity:0;pointer-events:none;transform-origin:0 50%;"; host.appendChild(s); sparks.push(s); }
      var X = function (t) { if (t <= 0) return K[0]; if (t < a) return K[0] + (K[1] - K[0]) * p3(t / a); if (t < b) return K[1] + (K[2] - K[1]) * p2((t - a) / (b - a)); if (t < c) return K[2] + (K[3] - K[2]) * io((t - b) / (c - b)); return K[3]; };
      var L0 = el.offsetLeft, T0 = el.offsetTop, W = el.offsetWidth, Hh = el.offsetHeight;
      return MW.drive(tl, at, Math.max(c, a + 0.22) + 0.1, function (t) {
        var x = X(t), w = 1 - Math.abs(t - a) / 0.06, sx = w > 0 ? 1 - (1 - o.squash) * w : 1; gsap.set(el, { x: x, scaleX: sx, scaleY: 1 / sx });
        var v = (X(t + 0.005) - X(t - 0.005)) / 0.01; lines.forEach(function (l, i) { var len = Math.min(220, v * 0.06) * (1 - i * 0.2); l.style.width = Math.max(0, len) + "px"; l.style.left = L0 + x - len - 30 - i * 20 + "px"; l.style.top = T0 + Hh * (0.3 + 0.2 * i) + "px"; l.style.opacity = t < a && v > 200 ? String(0.7 - 0.15 * i) : "0"; });
        var u = (t - a) / 0.22; sparks.forEach(function (s, i) { var ang = 180 + (i - 2) * 28; s.style.left = L0 + K[1] + W + "px"; s.style.top = T0 + Hh / 2 - 3 + "px"; s.style.transform = "rotate(" + ang + "deg) translateX(" + (30 + 80 * u) + "px) scaleX(" + (1 - u).toFixed(3) + ")"; s.style.opacity = u > 0 && u < 1 ? String(1 - u) : "0"; });
      });
    },
    options: { keys: "x px at each key ([0, 680, 530, 590])", times: "s of each leg ([0.26 power3.out, 0.114 power2.out, 0.146 power2.inOut])", squash: "scaleX at the wall (0.82)", accent: "speed lines" },
    defaults: { keys: [0, 680, 530, 590], times: [0.26, 0.114, 0.146], squash: 0.82, accent: "#a99bff" },
    demo: { css: `${BG}\n${FLOOR} .rc-w { position: absolute; left: 1280px; top: 520px; width: 30px; height: 344px; border-radius: 6px; background: #3a4466; } .rc { position: absolute; left: 400px; top: 660px; width: 200px; height: 200px; border-radius: 26px; background: linear-gradient(150deg, #ffd27a, #ff9b3d); }`,
      html: `<div class="fl"></div><div class="rc-w"></div><div class="rc"></div>`, run: `MW.motionRecoil(q(".rc"), tl, 0.4, {});`, duration: 1.6 },
  }),

  T("motion/double-bounce", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, ck = o.check ? el.querySelector(o.check) : null, CL = ck ? ck.getTotalLength() : 0, p2 = gsap.parseEase("power2.out"), ring = document.createElement("div"), d = o.durations, h = [o.drop].concat(o.heights), C = [d[0], d[0] + d[1], d[0] + d[1] + d[2]];
      if (getComputedStyle(host).position === "static") host.style.position = "relative"; if (ck) ck.style.strokeDasharray = String(CL); gsap.set(el, { transformOrigin: "50% 100%" });
      ring.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;opacity:0;box-sizing:border-box;border:6px solid " + o.accent + ";"; host.appendChild(ring);
      return MW.drive(tl, at, C[2] + 0.5, function (t) {
        var y = 0; if (t < C[0]) { var u = t / C[0]; y = -o.drop * (1 - u * u); } else if (t < C[1]) { var v = (t - C[0]) / d[1]; y = -h[1] * 4 * v * (1 - v); } else if (t < C[2]) { var w = (t - C[1]) / d[2]; y = -h[2] * 4 * w * (1 - w); }
        var sq = 0; C.forEach(function (c, k) { var q = 1 - Math.abs(t - c) / 0.05; if (q > 0) sq = Math.max(sq, o.squash[k] * q); }); gsap.set(el, { y: y, scaleY: 1 - sq, scaleX: 1 / (1 - sq) });
        if (ck) ck.style.strokeDashoffset = String(CL * (1 - p2(Math.max(0, Math.min(1, (t - C[2]) / 0.26)))));
        var r = (t - C[2]) / 0.48, W = el.offsetWidth, R = W / 2 + o.ping * p2(Math.max(0, Math.min(1, r))); ring.style.width = ring.style.height = 2 * R + "px"; ring.style.left = el.offsetLeft + W / 2 - R + "px"; ring.style.top = el.offsetTop + el.offsetHeight / 2 - R + "px"; ring.style.opacity = r > 0 && r < 1 ? String(1 - r) : "0";
      });
    },
    options: { drop: "px (400)", heights: "px of the two bounces ([220, 100])", durations: "s of fall, bounce, bounce ([0.287, 0.287, 0.246])", squash: "at the three contacts ([0.3, 0.18, 0.08])", check: "a path drawn after the last contact", ping: "px the ring grows (72)", accent: "" },
    defaults: { drop: 400, heights: [220, 100], durations: [0.287, 0.287, 0.246], squash: [0.3, 0.18, 0.08], check: "path", ping: 72, accent: "#3ddc84" },
    demo: { css: `${BG}\n.db-c { position: absolute; left: 560px; top: 160px; width: 800px; height: 760px; border-radius: 50px; background: #151a24; border: 3px solid #262c3a; } .db-f { position: absolute; left: 640px; right: 640px; top: 720px; height: 4px; background: #262c3a; }
.db-p { position: absolute; left: 640px; top: 800px; width: 640px; height: 20px; border-radius: 10px; background: #262c3a; overflow: hidden; } .db-p i { display: block; width: 100%; height: 100%; background: #3ddc84; } .db { position: absolute; left: 860px; top: 520px; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #7af0b0, #22c06e 60%, #128a4c); display: grid; place-items: center; } .db svg { width: 110px; height: 110px; }`,
      html: `<div class="db-c"></div><div class="db-f"></div><div class="db-p"><i></i></div><div class="db"><svg viewBox="0 0 100 100"><path d="M24 52 L43 70 L77 33" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`,
      run: `MW.motionDoubleBounce(q(".db"), tl, 0.3, {});`, duration: 1.8 },
  }),

  T("motion/snap-back", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, cur = o.cursor ? (host.querySelector(o.cursor) || document.querySelector(o.cursor)) : null, io = gsap.parseEase("power2.inOut"), sx = MW.spring(o.k, o.cx), ss = MW.spring(o.k, o.cs), ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), ln = document.createElementNS(ns, "line"), gh = [];
      if (getComputedStyle(host).position === "static") host.style.position = "relative"; gsap.set(el, { transformOrigin: "0% 50%" });
      svg.setAttribute("width", host.clientWidth); svg.setAttribute("height", host.clientHeight); svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;pointer-events:none;"; ln.setAttribute("stroke", "#6c778b"); ln.setAttribute("stroke-linecap", "round"); svg.appendChild(ln); host.insertBefore(svg, el);
      for (var i = 0; i < 4; i++) { var g = el.cloneNode(true); g.removeAttribute("id"); g.style.position = "absolute"; g.style.margin = "0"; g.style.pointerEvents = "none"; g.style.opacity = "0"; g.style.left = el.offsetLeft + "px"; g.style.top = el.offsetTop + "px"; g.style.width = el.offsetWidth + "px"; g.style.height = el.offsetHeight + "px"; host.insertBefore(g, el); gh.push(g); }
      var W = el.offsetWidth, ax = el.offsetLeft - o.anchor, ay = el.offsetTop + el.offsetHeight / 2, rel = o.pullAt + o.pull + o.hold;
      var P = function (t) { if (t <= o.pullAt) return [0, 1]; if (t <= o.pullAt + o.pull) { var u = io((t - o.pullAt) / o.pull); return [o.distance * u, 1 + (o.stretch - 1) * u]; } if (t <= rel) return [o.distance + o.tremble * Math.sin(t * 90), o.stretch]; var r = t - rel; return [o.distance * (1 - sx.at(r)), o.stretch + (1 - o.stretch) * ss.at(r)]; };
      return MW.drive(tl, at, rel + Math.max(sx.duration, ss.duration) + 0.2, function (t) {
        var p = P(t); gsap.set(el, { x: p[0], scaleX: p[1], scaleY: 1 / p[1] });
        gh.forEach(function (g, i) { var tt = t - 0.018 * (i + 1), q = P(tt), on = t > rel && t < rel + 0.3; gsap.set(g, { x: q[0], scaleX: q[1], scaleY: 1 / q[1], transformOrigin: "0% 50%" }); g.style.opacity = on ? String(0.25 - i * 0.05) : "0"; });
        var ex = el.offsetLeft + p[0], d = Math.max(1, ex - ax); ln.setAttribute("x1", ax); ln.setAttribute("y1", ay); ln.setAttribute("x2", ex); ln.setAttribute("y2", ay); ln.setAttribute("stroke-width", (4 + 14 / (1 + d / 120)).toFixed(2));
        if (cur) { var held = t > o.pullAt - 0.08 && t <= rel, cx = t <= o.pullAt ? el.offsetLeft + W + 260 * (1 - Math.min(1, t / o.pullAt)) : t <= rel ? el.offsetLeft + p[0] + W * p[1] - 30 : el.offsetLeft + o.distance + W * o.stretch + 120 * Math.min(1, (t - rel) / 0.5); gsap.set(cur, { x: cx - 12, y: ay - 6, scale: held ? 0.86 : 1, transformOrigin: "20% 10%" }); }
      });
    },
    options: { pullAt: "s (0.3)", pull: "s (0.55, power2.inOut)", hold: "s (0.2, trembling)", tremble: "± px (2.4)", distance: "px (490)", stretch: "(1.5)", k: "spring stiffness (420)", cx: "damping of the position (20)", cs: "damping of the stretch (12: dips to about 0.8)", anchor: "px from the anchor to the pill (200)", cursor: "an optional cursor" },
    defaults: { pullAt: 0.3, pull: 0.55, hold: 0.2, tremble: 2.4, distance: 490, stretch: 1.5, k: 420, cx: 20, cs: 12, anchor: 200, cursor: null },
    demo: { css: `${BG}\n.sn-w { position: absolute; inset: 0; } .sn-a { position: absolute; left: 270px; top: 510px; width: 60px; height: 60px; border-radius: 50%; background: #3a4466; } .sn { position: absolute; left: 500px; top: 470px; width: 340px; height: 140px; border-radius: 70px; background: linear-gradient(180deg, #9c88ff, #7357f5); }
.ui-cursor { position: absolute; left: 0; top: 0; z-index: 20; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.5)); }`,
      html: `<div class="sn-w"><div class="sn-a"></div><div class="sn"></div>${CURSOR}</div>`, run: `MW.motionSnapBack(q(".sn"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2 },
  }),

  T("motion/after-shake", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, ball = o.ball ? host.querySelector(o.ball) : null, p1 = gsap.parseEase("power1.in"), p2 = gsap.parseEase("power2.out"), fl = document.createElement("div");
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      fl.style.cssText = "position:absolute;width:90px;height:90px;margin:-45px 0 0 -45px;pointer-events:none;opacity:0;color:#ffd23d;"; fl.innerHTML = '<svg viewBox="-10 -10 20 20" width="100%" height="100%"><path d="M0 -10 L2.4 -2.4 L10 0 L2.4 2.4 L0 10 L-2.4 2.4 L-10 0 L-2.4 -2.4 Z" fill="currentColor"/></svg>'; host.appendChild(fl);
      var hx = el.offsetLeft, hy = el.offsetTop + el.offsetHeight / 2, b0 = ball ? ball.offsetLeft + ball.offsetWidth : 0;
      return MW.drive(tl, at, o.hit + 0.8, function (t) {
        var u = t - o.hit, x = u > 0 ? o.amp * Math.exp(-o.decay * u) * Math.sin(2 * Math.PI * u * o.freq) : 0; gsap.set(el, { x: x });
        if (ball) { var bx = u < 0 ? (hx - b0) * p1(Math.max(0, t / o.hit)) : (hx - b0) - 300 * p2(Math.min(1, u / 0.5)); gsap.set(ball, { x: bx }); }
        fl.style.left = hx + "px"; fl.style.top = hy + "px"; fl.style.opacity = u > 0 && u < 0.14 ? "1" : "0"; fl.style.transform = "scale(" + (0.6 + 2.5 * Math.max(0, u)).toFixed(3) + ")";
      });
    },
    options: { amp: "px (80)", freq: "Hz (5)", decay: "per second (6)", hit: "s the ball arrives (0.5)", ball: "the thing that hits it" },
    defaults: { amp: 80, freq: 5, decay: 6, hit: 0.5, ball: ".as-b" },
    notes: "x = amp × e^(−decay t) × sin(2π freq t): peaks about +0.75, −0.42, +0.22 of amp; one axis, no rotation.",
    demo: { css: `${BG}\n.as-c { position: absolute; left: 900px; top: 360px; width: 640px; height: 360px; border-radius: 40px; background: linear-gradient(150deg, #a693ff, #6a4cf0); display: grid; place-items: center; font-size: 70px; font-weight: 900; color: #fff; } .as-b { position: absolute; left: 180px; top: 480px; width: 120px; height: 120px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffe2a8, #ffb547 60%, #d98a00); }`,
      html: `<div class="as-b"></div><div class="as-c">BỊ VA!</div>`, run: `MW.motionAfterShake(q(".as-c"), tl, 0, {});`, duration: 1.6 },
  }),

  T("motion/settle-drop", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, p1 = gsap.parseEase("power1.in"), p2 = gsap.parseEase("power2.out"), sh = o.shadow ? host.querySelector(o.shadow) : null, dust = []; if (getComputedStyle(host).position === "static") host.style.position = "relative"; gsap.set(el, { transformOrigin: "50% 100%" });
      for (var i = 0; i < 8; i++) { var d = document.createElement("div"), z = 18 + (i % 3) * 8; d.style.cssText = "position:absolute;border-radius:50%;background:#8f9ab3;opacity:0;pointer-events:none;width:" + z + "px;height:" + z + "px;margin:-" + z / 2 + "px 0 0 -" + z / 2 + "px;"; host.appendChild(d); dust.push(d); }
      var bx = el.offsetLeft, bw = el.offsetWidth, by = el.offsetTop + el.offsetHeight;
      return MW.drive(tl, at, o.fall + o.squashIn + o.recover + 0.1, function (t) {
        var y = 0, sx = 1, sy = 1; if (t < o.fall) { var u = t / o.fall; y = -o.drop * (1 - p1(u)); sy = 1 + 0.1 * u; sx = 1 / sy; } else if (t < o.fall + o.squashIn) { var v = p2((t - o.fall) / o.squashIn); sx = 1 / 1.1 + (o.squash[0] - 1 / 1.1) * v; sy = 1.1 + (o.squash[1] - 1.1) * v; } else { var w = p2(Math.min(1, (t - o.fall - o.squashIn) / o.recover)); sx = o.squash[0] + (1 - o.squash[0]) * w; sy = o.squash[1] + (1 - o.squash[1]) * w; }
        gsap.set(el, { y: y, scaleX: sx, scaleY: sy }); if (sh) { var f = 1 + y / o.drop; gsap.set(sh, { scaleX: (0.5 + 0.5 * f) * (t > o.fall ? sx : 1) }); sh.style.opacity = String(0.3 + 0.7 * f); }
        var q = (t - o.fall) / 0.5; dust.forEach(function (d, i) { var side = i < 4 ? -1 : 1, k = i % 4, dist = o.dust[0] + (o.dust[1] - o.dust[0]) * (k / 3); d.style.left = bx + bw / 2 + side * (bw / 2 + dist * p2(Math.max(0, Math.min(1, q)))) + "px"; d.style.top = by - 14 - k * 10 * Math.max(0, q) + "px"; d.style.opacity = q > 0 && q < 1 ? String(0.7 * (1 - q)) : "0"; });
      });
    },
    options: { drop: "px (440)", fall: "s (0.32, power1.in)", squash: "[scaleX, scaleY] at the bottom ([1.45, 0.62])", squashIn: "s (0.06)", recover: "s (0.55, power2.out, no overshoot)", dust: "[min, max] px beyond each side ([56, 164])", shadow: "" },
    defaults: { drop: 440, fall: 0.32, squash: [1.45, 0.62], squashIn: 0.06, recover: 0.55, dust: [56, 164], shadow: null },
    demo: { css: `${BG}\n${FLOOR} .sd { position: absolute; left: 820px; top: 600px; width: 280px; height: 260px; border-radius: 30px 30px 14px 14px; background: linear-gradient(180deg, #5a6275, #2f3546); display: grid; place-items: center; font-size: 90px; font-weight: 900; color: #e8ebf3; } .sd-s { position: absolute; left: 790px; top: 846px; width: 340px; height: 30px; border-radius: 50%; background: rgba(0,0,0,0.6); filter: blur(8px); }`,
      html: `<div class="fl"></div><div class="sd-s"></div><div class="sd">kg</div>`, run: `MW.motionSettleDrop(q(".sd"), tl, 0.3, { shadow: ".sd-s" });`, duration: 1.8 },
  }),

  T("motion/drag-resistance", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, cur = o.cursor ? (host.querySelector(o.cursor) || document.querySelector(o.cursor)) : null, io = gsap.parseEase("power2.inOut"), sp = MW.spring(o.k, o.c), W = el.offsetWidth; gsap.set(el, { transformOrigin: "0% 50%" });
      var Rr = function (t) { return o.pull * io(Math.max(0, Math.min(1, (t - o.grab) / o.duration))); }, rel = o.grab + o.duration + o.lag;
      var E = function (t) { if (t <= rel) { var r = Rr(t), l = Rr(t - o.lag), w = Math.max(W * 0.8, Math.min(W * o.max, W + r - l)); return [r + W - w, r]; } var s = sp.at(t - rel), rr = o.pull * (1 - s); return [rr, rr]; };
      return MW.drive(tl, at, rel + sp.duration + 0.2, function (t) {
        var e = E(t), v = (E(t + 0.005)[1] - E(t - 0.005)[1]) / 0.01, st = t > rel ? 1 + Math.min(0.18, Math.abs(v) / 6000) : (W + e[1] - e[0]) / W;
        gsap.set(el, { x: e[0], scaleX: st, scaleY: 1 / Math.sqrt(st) });
        if (cur) { var held = t > o.grab - 0.08 && t <= o.grab + o.duration, gx = el.offsetLeft + W - 40, gy = el.offsetTop + el.offsetHeight / 2, cx = t <= o.grab ? gx + 240 * (1 - Math.min(1, t / o.grab)) : gx + Rr(Math.min(t, o.grab + o.duration)) + (t > o.grab + o.duration ? 120 * Math.min(1, (t - o.grab - o.duration) / 0.5) : 0); gsap.set(cur, { x: cx - 12, y: gy - 6 + (t <= o.grab ? 160 * (1 - Math.min(1, t / o.grab)) : 0), scale: held ? 0.86 : 1, transformOrigin: "20% 10%" }); }
      });
    },
    options: { grab: "s (0.3)", pull: "px the front edge moves (460)", duration: "s (0.6, power2.inOut)", lag: "s the back edge trails (0.1)", max: "stretch at most (1.35)", k: "spring stiffness back (220)", c: "damping (16)", cursor: "an optional cursor on the front edge" },
    defaults: { grab: 0.3, pull: 460, duration: 0.6, lag: 0.1, max: 1.35, k: 220, c: 16, cursor: null },
    demo: { css: `${BG}\n.dr-w { position: absolute; inset: 0; } .dr-s { position: absolute; left: 600px; top: 470px; width: 380px; height: 140px; border-radius: 70px; border: 5px dashed #3a4466; box-sizing: border-box; } .dr { position: absolute; left: 600px; top: 470px; width: 380px; height: 140px; border-radius: 70px; background: linear-gradient(180deg, #9c88ff, #7357f5); }
.ui-cursor { position: absolute; left: 0; top: 0; z-index: 20; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.5)); }`,
      html: `<div class="dr-w"><div class="dr-s"></div><div class="dr"></div>${CURSOR}</div>`, run: `MW.motionDragResistance(q(".dr"), tl, 0, { cursor: ".ui-cursor" });`, duration: 2.2 },
  }),

  T("motion/follow-chain", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, io = gsap.parseEase("power2.inOut"), ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), pl = document.createElementNS(ns, "polyline"), tip = document.createElementNS(ns, "circle"), dt = 1 / 240, n = o.segments;
      if (getComputedStyle(host).position === "static") host.style.position = "relative"; svg.setAttribute("width", host.clientWidth); svg.setAttribute("height", host.clientHeight); svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;pointer-events:none;";
      pl.setAttribute("fill", "none"); pl.setAttribute("stroke", o.color); pl.setAttribute("stroke-width", "10"); pl.setAttribute("stroke-linecap", "round"); pl.setAttribute("stroke-linejoin", "round"); tip.setAttribute("r", "18"); tip.setAttribute("fill", o.tip); svg.appendChild(pl); svg.appendChild(tip); host.appendChild(svg);
      var bx = el.offsetLeft + el.offsetWidth / 2, by = el.offsetTop, X = function (t) { return o.distance * (io(Math.max(0, Math.min(1, t / o.move))) - io(Math.max(0, Math.min(1, (t - o.backAt) / o.move)))); };
      return MW.drive(tl, at, o.backAt + o.move + 1, function (t) {
        var p = [], v = [], i; for (i = 0; i < n; i++) { p.push(0); v.push(0); }
        for (var s = 0; s <= t; s += dt) { var x = X(s); for (i = 0; i < n; i++) { var k = o.k / (1 + 0.8 * i), c = 2 * o.ratio * Math.sqrt(k); v[i] += (k * (x - p[i]) - c * v[i]) * dt; p[i] += v[i] * dt; } }
        var bxx = X(t); gsap.set(el, { x: bxx }); var px = bx + bxx, py = by, pts = [px.toFixed(1) + "," + py.toFixed(1)], ang = 0;
        for (i = 0; i < n; i++) { ang = Math.max(-o.limit, Math.min(o.limit, o.lean * (p[i] - bxx))) * Math.PI / 180; px += o.seg * Math.sin(ang); py -= o.seg * Math.cos(ang); pts.push(px.toFixed(1) + "," + py.toFixed(1)); }
        pl.setAttribute("points", pts.join(" ")); tip.setAttribute("cx", px); tip.setAttribute("cy", py);
      });
    },
    options: { segments: "(5)", seg: "px per segment (50)", k: "stiffness of the first segment (240), softer up the chain", ratio: "damping ratio (0.26)", lean: "degrees per px of lag (0.46)", limit: "± degrees (66)", distance: "px (900)", move: "s (0.88, power2.inOut)", backAt: "s it comes back (2.0)", color: "", tip: "" },
    defaults: { segments: 5, seg: 50, k: 240, ratio: 0.26, lean: 0.46, limit: 66, distance: 900, move: 0.88, backAt: 2, color: "#c9d2ea", tip: "#ff5d8f" },
    notes: "Each segment tracks the body on its own spring; the lean follows the lag, so the tip trails, overshoots after the stop and settles.",
    demo: { css: `${BG}\n${FLOOR} .fc { position: absolute; left: 400px; top: 660px; width: 200px; height: 200px; border-radius: 30px; background: linear-gradient(150deg, #a693ff, #6a4cf0); }`,
      html: `<div class="fl"></div><div class="fc"></div>`, run: `MW.motionFollowChain(q(".fc"), tl, 0.2, {});`, duration: 4 },
  }),
];

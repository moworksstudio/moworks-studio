// TakayuStudio, Entrance & Exit, Movement and Exit (batch 3.7): fades, wipes, irises, folds and trails on the element; travels with
// eases, arcs, anticipation, heavy stops, paths, magnets, zigzags, drifts and hops; and text exits by letter or word (graphemes kept
// whole); written here from the site's ideas and numbers (no code of the site; distances scaled from the site's 320-wide demos).
import { T } from "../../takayu/define.mjs";
import { CURSOR, headline, demo, ui } from "../../takayu/stages.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; }`;
const ST = `.st { position: absolute; inset: 0; display: grid; place-items: center; }`;
const FLOOR = `.fl { position: absolute; left: 160px; right: 160px; top: 760px; height: 4px; border-radius: 2px; background: #262c3a; }`;
const H = (text, run, duration = 3, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);
const CARD = `<div class="cd"><b></b><i></i><i style="width:60%"></i></div>`;
const CCSS = `.cd { width: 760px; height: 440px; border-radius: 40px; background: #1b2130; border: 3px solid #2a3350; padding: 60px; box-sizing: border-box; } .cd b { display: block; width: 50%; height: 50px; border-radius: 25px; background: #8b7bff; margin-bottom: 50px; } .cd i { display: block; height: 30px; border-radius: 15px; background: #3a4466; margin-top: 30px; }`;
const SQ = (cls, x, y = 560, s = 200, col = "linear-gradient(150deg, #a693ff, #6a4cf0)") => `.${cls} { position: absolute; left: ${x}px; top: ${y}px; width: ${s}px; height: ${s}px; border-radius: ${Math.round(s * 0.18)}px; background: ${col}; }`;
const GH = `var host = el.parentNode; if (getComputedStyle(host).position === "static") host.style.position = "relative";
var ghost = function () { var g = el.cloneNode(true); g.removeAttribute("id"); g.style.position = "absolute"; g.style.margin = "0"; g.style.pointerEvents = "none"; g.style.opacity = "0"; g.style.left = el.offsetLeft + "px"; g.style.top = el.offsetTop + "px"; g.style.width = el.offsetWidth + "px"; g.style.height = el.offsetHeight + "px"; host.insertBefore(g, el); return g; };
var add = function (css) { var d = document.createElement("div"); d.style.cssText = "position:absolute;pointer-events:none;" + css; host.appendChild(d); return d; };
var cx0 = el.offsetLeft + el.offsetWidth / 2, cy0 = el.offsetTop + el.offsetHeight / 2;`;
const mk = (body) => new Function("el", "tl", "at", "o", GH + "\n" + body);
// text helpers: grapheme letters or words, their order, and a canvas raster of the text
const TX = `var split = function (mode) { return MW.split(el, mode)[mode]; }, pin = function (u) { return Math.max(0, Math.min(1, u)); };
var raster = function (m) { var host = el.parentNode; if (getComputedStyle(host).position === "static") host.style.position = "relative"; var cs = getComputedStyle(el), W = el.offsetWidth + 2 * m, Hh = el.offsetHeight + 2 * m, cv = document.createElement("canvas"), off = document.createElement("canvas"); cv.width = off.width = W; cv.height = off.height = Hh;
  cv.style.cssText = "position:absolute;pointer-events:none;left:" + (el.offsetLeft - m) + "px;top:" + (el.offsetTop - m) + "px;width:" + W + "px;height:" + Hh + "px;"; host.insertBefore(cv, el.nextSibling);
  var g = off.getContext("2d"); g.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily; if ("letterSpacing" in g) g.letterSpacing = cs.letterSpacing; g.fillStyle = cs.color; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(el.textContent, W / 2, Hh / 2 + parseFloat(cs.fontSize) * 0.04); el.style.visibility = "hidden"; return { cv: cv, c: cv.getContext("2d"), off: off, W: W, H: Hh }; };`;
const mt = (body) => new Function("el", "tl", "at", "o", TX + "\n" + body);
const TXU = ["split", "drive", "eases", "rand"];

export default [
  T("motion/fade-slide", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var e = MW.ez(o.ease), pin = gsap.parseEase("power2.in");
      return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + o.exit, function (t) { var p = e(Math.min(1, t / o.duration)), x = o.exitAt != null ? pin(Math.max(0, Math.min(1, (t - o.exitAt) / o.exit))) : 0; gsap.set(el, { y: o.y * (1 - p) }); el.style.opacity = String(p * (1 - x)); });
    },
    options: { duration: "s (0.6)", y: "px (96; 12–32 at UI size)", ease: "(cubic-bezier(.33,1,.68,1))", exitAt: "s after the start to fade out, no move (null)", exit: "s (0.42, power2.in)" },
    defaults: { duration: 0.6, y: 96, ease: "cubic-bezier(.33,1,.68,1)", exitAt: null, exit: 0.42 },
    demo: { css: `${BG}\n${ST} ${CCSS} .cd { opacity: 0; }`, html: `<div class="st">${CARD}</div>`, run: `MW.motionFadeSlide(q(".cd"), tl, 0.3, { exitAt: 1.6 });`, duration: 2.4 },
  }),

  T("motion/mask-wipe", {
    uses: ["drive"],
    fn: mk(`var e = gsap.parseEase("power4.inOut"), pin = gsap.parseEase("power2.in"), W = el.offsetWidth, L = el.offsetLeft, Tp = el.offsetTop, Hh = el.offsetHeight;
var line = add("width:" + o.edge + "px;height:" + Hh + "px;top:" + Tp + "px;background:" + o.accent + ";opacity:0;"), mark = add("width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-top:18px solid " + o.accent + ";top:" + (Tp - 24) + "px;opacity:0;");
return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + 0.32, function (t) { var p = 1.15 * e(Math.min(1, t / o.duration)), vis = Math.min(1, p); el.style.clipPath = "inset(0 " + (100 * (1 - vis)).toFixed(2) + "% 0 0)"; var x = o.exitAt != null ? pin(Math.max(0, Math.min(1, (t - o.exitAt) / 0.32))) : 0; el.style.opacity = String(1 - x);
  var on = p > 0 && p < 1; line.style.left = L + W * p - o.edge / 2 + "px"; mark.style.left = L + W * p - 14 + "px"; line.style.opacity = mark.style.opacity = on ? "1" : "0"; });`),
    options: { duration: "s (0.7, power4.inOut): the edge travels 0 → 115 % of the width", edge: "px of the line (8; 0 to hide)", accent: "", exitAt: "s after the start to fade (null)" }, defaults: { duration: 0.7, edge: 8, accent: "#8b7bff", exitAt: null },
    demo: { css: `${BG}\n${ST} .mw { padding: 60px 80px; border-radius: 30px; background: #151a24; } .mw h2 { margin: 0 0 40px; font-size: 110px; font-weight: 900; } .mw i { display: block; height: 30px; border-radius: 15px; background: #3a4466; margin-top: 24px; }`,
      html: `<div class="st"><div class="mw"><h2>Ra mắt mùa mới</h2><i></i><i style="width:60%"></i></div></div>`, run: `MW.motionMaskWipe(q(".mw"), tl, 0.3, { exitAt: 1.7 });`, duration: 2.4 },
  }),

  T("motion/iris-open", {
    uses: ["drive"],
    fn: mk(`var e = gsap.parseEase("power3.out"), bo = gsap.parseEase("back.out(1.7)"), W = el.offsetWidth, Hh = el.offsetHeight, px = W * o.x, py = Hh * o.y, R = 1.5 * Math.hypot(W, Hh) / 2, far = Math.max(Math.hypot(px, py), Math.hypot(W - px, py), Math.hypot(px, Hh - py), Math.hypot(W - px, Hh - py));
var ring = add("border-radius:50%;box-sizing:border-box;border:" + o.rim + "px solid " + o.accent + ";opacity:0;"), dot = add("width:" + o.dot + "px;height:" + o.dot + "px;margin:-" + o.dot / 2 + "px 0 0 -" + o.dot / 2 + "px;border-radius:50%;background:" + o.accent + ";left:" + (el.offsetLeft + px) + "px;top:" + (el.offsetTop + py) + "px;opacity:0;");
return MW.drive(tl, at, o.exitAt == null ? o.pre + o.duration : o.exitAt + 0.32, function (t) { var d = bo(Math.max(0, Math.min(1, t / 0.25))), u = Math.max(0, Math.min(1, (t - o.pre) / o.duration)), r = R * e(u), x = o.exitAt != null ? Math.max(0, Math.min(1, (t - o.exitAt) / 0.32)) : 0;
  el.style.clipPath = "circle(" + r.toFixed(1) + "px at " + px.toFixed(1) + "px " + py.toFixed(1) + "px)"; el.style.opacity = String(1 - x); dot.style.opacity = String(t > 0 ? Math.max(0, 1 - Math.max(0, (t - o.pre) / 0.15)) : 0); dot.style.transform = "scale(" + d.toFixed(3) + ")";
  ring.style.width = ring.style.height = 2 * r + "px"; ring.style.left = el.offsetLeft + px - r + "px"; ring.style.top = el.offsetTop + py - r + "px"; ring.style.opacity = u > 0 && r < far ? "1" : "0"; });`),
    options: { duration: "s (0.76, ease-out quart)", pre: "s the centre dot shows first (0.25)", x: "centre share (0.5)", y: "(0.5)", rim: "px (6)", dot: "px (16)", accent: "", exitAt: "s (null)" }, defaults: { duration: 0.76, pre: 0.25, x: 0.5, y: 0.5, rim: 6, dot: 16, accent: "#a99bff", exitAt: null },
    demo: { css: `${BG}\n${ST} ${CCSS}`, html: `<div class="st">${CARD}</div>`, run: `MW.motionIrisOpen(q(".cd"), tl, 0.3, { exitAt: 1.8 });`, duration: 2.5 },
  }),

  T("motion/soft-rise", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var e = MW.ez(o.ease), si = gsap.parseEase("sine.in");
      return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + 0.35, function (t) { var p = e(Math.min(1, t / o.duration)), x = o.exitAt != null ? si(Math.max(0, Math.min(1, (t - o.exitAt) / 0.35))) : 0; gsap.set(el, { y: o.y * (1 - p) }); el.style.filter = p < 1 ? "blur(" + (o.blur * (1 - p)).toFixed(2) + "px)" : ""; el.style.opacity = String(p * (1 - x)); });
    },
    options: { duration: "s (0.9)", y: "px (96)", blur: "px (24)", ease: "(cubic-bezier(.61,1,.88,1): sine.out)", exitAt: "s (null; 0.35 s sine.in fade)" }, defaults: { duration: 0.9, y: 96, blur: 24, ease: "cubic-bezier(.61,1,.88,1)", exitAt: null },
    demo: H("Lặng lẽ hiện lên", `MW.motionSoftRise(q(".tk-head"), tl, 0.3, { exitAt: 1.8 });`, 2.5, { size: 160 }, ".tk-head { opacity: 0; } .tk-head::after { content: ''; display: block; width: 240px; height: 14px; border-radius: 7px; margin: 40px auto 0; background: #8b7bff; }"),
  }),

  T("motion/snap-in", {
    uses: ["drive", "eases", "draw"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, btn = o.button ? host.querySelector(o.button) : null, cur = o.cursor ? host.querySelector(o.cursor) : null, e = MW.ez(o.ease), p2 = gsap.parseEase("power2.out"), lines = [];
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      for (var i = 0; i < 2; i++) { var l = document.createElement("div"); l.style.cssText = "position:absolute;height:6px;border-radius:3px;background:#a99bff;pointer-events:none;opacity:0;"; host.appendChild(l); lines.push(l); }
      var br = btn ? btn.getBoundingClientRect() : null, hb = host.getBoundingClientRect(), bx = br ? br.left - hb.left + br.width * 0.5 : 0, by = br ? br.top - hb.top + br.height * 0.55 : 0, L = el.offsetLeft, Tp = el.offsetTop, Hh = el.offsetHeight;
      return MW.drive(tl, at, o.exitAt == null ? o.press + 0.1 + o.duration : o.exitAt + 0.25, function (t) {
        if (btn) { var d = t - o.press, s = d < 0 ? 1 : d < 0.06 ? 1 - 0.06 * d / 0.06 : 0.94 + 0.06 * p2(Math.min(1, (d - 0.06) / 0.14)); gsap.set(btn, { scale: s }); }
        var u = Math.max(0, Math.min(1, (t - o.press - 0.1) / o.duration)), p = e(u), x = o.exitAt != null ? Math.max(0, Math.min(1, (t - o.exitAt) / 0.25)) : 0; gsap.set(el, { x: o.from * (1 - p) }); el.style.opacity = String(Math.min(1, p) * (1 - x));
        lines.forEach(function (l, i) { var len = 120 * (1 - p); l.style.width = len + "px"; l.style.left = L + o.from * (1 - p) - len - 20 + "px"; l.style.top = Tp + Hh * (0.35 + 0.3 * i) + "px"; l.style.opacity = u > 0 && u < 0.9 ? String(1 - u / 0.9) : "0"; });
        if (cur) { var c = MW.path([[0, bx + 240, by + 180], [o.press - 0.06, bx, by], [o.press + 0.5, bx, by], [o.press + 1, bx + 160, by + 140]], t, "power2.inOut"); gsap.set(cur, { x: c[0] - 12, y: c[1] - 6, scale: t > o.press && t < o.press + 0.1 ? 0.86 : 1, transformOrigin: "20% 10%" }); }
      });
    },
    options: { from: "px (−172)", duration: "s (0.38)", ease: "(cubic-bezier(.16,1,.3,1): expo.out)", press: "s the button is pressed (0.5)", button: "", cursor: "", exitAt: "s (null)" }, defaults: { from: -172, duration: 0.38, ease: "cubic-bezier(.16,1,.3,1)", press: 0.5, button: ".sn-b", cursor: ".ui-cursor", exitAt: null },
    demo: { ...ui(`<div class="sn"><div class="ui-btn sn-b">Lưu</div><div class="sn-t">Đã lưu thay đổi</div>${CURSOR}</div>`, `.sn { position: relative; width: 1200px; height: 600px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 80px; } .sn-t { padding: 40px 90px; border-radius: 70px; background: #e8ebf3; color: #0b0d12; font-size: 60px; font-weight: 800; opacity: 0; } .sn .sn-b { font-size: 60px; height: 150px; padding: 0 110px; border-radius: 40px; }`),
      run: `MW.motionSnapIn(q(".sn-t"), tl, 0, { exitAt: 1.9 });`, duration: 2.4 },
  }),

  T("motion/split-reveal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var io = gsap.parseEase("power2.inOut"), P = []; if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden";
      [-1, 1].forEach(function (s) { var p = document.createElement("div"); p.style.cssText = "position:absolute;top:0;bottom:0;width:50%;pointer-events:none;background:" + o.color + ";" + (s < 0 ? "left:0;" : "right:0;"); var e = document.createElement("i"); e.style.cssText = "position:absolute;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.25);" + (s < 0 ? "right:0;" : "left:0;"); var g = document.createElement("b"); g.style.cssText = "position:absolute;top:50%;width:12px;height:96px;margin-top:-48px;border-radius:6px;background:rgba(255,255,255,0.4);" + (s < 0 ? "right:40px;" : "left:40px;"); p.appendChild(e); p.appendChild(g); el.appendChild(p); P.push([p, s]); });
      return MW.drive(tl, at, o.closeAt == null ? o.duration : o.closeAt + o.close, function (t) { var u = io(Math.max(0, Math.min(1, t / o.duration))); if (o.closeAt != null && t > o.closeAt) u = 1 - io(Math.min(1, (t - o.closeAt) / o.close)); P.forEach(function (q) { q[0].style.transform = "translateX(" + (q[1] * 105 * u).toFixed(2) + "%)"; }); });
    },
    options: { duration: "s (0.72, power2.inOut)", close: "s (0.45)", closeAt: "s after the start to close again (null)", color: "panel colour" }, defaults: { duration: 0.72, close: 0.45, closeAt: null, color: "#2a3142" },
    demo: { css: `${BG}\n${ST} .sr { width: 1080px; height: 720px; border-radius: 50px; background: radial-gradient(circle at 50% 40%, #2a2350, #10131d); display: grid; place-items: center; } .sr i { width: 280px; height: 280px; border-radius: 70px; background: linear-gradient(150deg, #a693ff, #6a4cf0); display: grid; place-items: center; font-style: normal; font-size: 160px; font-weight: 900; color: #fff; }`,
      html: `<div class="st"><div class="sr"><i>M</i></div></div>`, run: `MW.motionSplitReveal(q(".sr"), tl, 0.4, { closeAt: 1.7 });`, duration: 2.7 },
  }),

  T("motion/trail-exit", {
    uses: ["drive"],
    fn: mk(`var e = gsap.parseEase("power3.in"), p2 = gsap.parseEase("power2.out"), G = []; for (var i = 0; i < o.copies; i++) G.push(ghost());
return MW.drive(tl, at, o.fadeIn + o.duration + o.copies * o.delay + 0.1, function (t) { var a = p2(Math.min(1, t / o.fadeIn)), X = function (tt) { return e(Math.max(0, Math.min(1, (tt - o.fadeIn - 0.1) / o.duration))); }, u = X(t);
  gsap.set(el, { x: o.x * u }); el.style.opacity = String(a * (1 - u)); G.forEach(function (g, i) { var v = X(t - o.delay * (i + 1)); gsap.set(g, { x: o.x * v }); g.style.opacity = v > 0 ? String(o.weights[i] * (1 - v)) : "0"; }); });`),
    options: { x: "px (1050)", duration: "s (0.52, ease-in quart)", copies: "(3)", delay: "s each (0.032)", weights: "opacity of each copy ([0.42, 0.24, 0.12])", fadeIn: "s it fades in first (0.25)" }, defaults: { x: 1050, duration: 0.52, copies: 3, delay: 0.032, weights: [0.42, 0.24, 0.12], fadeIn: 0.25 },
    demo: { css: `${BG}\n${FLOOR} ${SQ("te", 360)} .te { opacity: 0; }`, html: `<div class="fl"></div><div class="te"></div>`, run: `MW.motionTrailExit(q(".te"), tl, 0.3, {});`, duration: 1.8 },
  }),

  T("motion/collapse-away", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var e = MW.ez(o.ease), p2 = gsap.parseEase("power2.out"); gsap.set(el, { transformOrigin: o.origin });
      return MW.drive(tl, at, o.returnAt == null ? o.duration : o.returnAt + 0.45, function (t) { var u = e(Math.min(1, t / o.duration)), s = 1 - (1 - o.to) * u, a = 1 - Math.max(0, Math.min(1, u)); if (o.returnAt != null && t > o.returnAt) { var r = p2(Math.min(1, (t - o.returnAt) / 0.45)); s = o.to + (1 - o.to) * r; a = r; } gsap.set(el, { scaleY: s }); el.style.opacity = String(Math.max(0, a)); });
    },
    options: { duration: "s (0.56)", to: "scaleY left (0.05)", origin: "(50% 100%: the bottom edge)", ease: "(cubic-bezier(.36,0,.66,-.56): back.in, it first stretches to about 1.09)", returnAt: "s after the start to come back (null)" },
    defaults: { duration: 0.56, to: 0.05, origin: "50% 100%", ease: "cubic-bezier(.36,0,.66,-.56)", returnAt: null },
    demo: { css: `${BG}\n${ST} ${CCSS} .ca-l { position: absolute; left: 400px; right: 400px; top: 764px; height: 4px; background: #262c3a; }`, html: `<div class="ca-l"></div><div class="st">${CARD}</div>`, run: `MW.motionCollapseAway(q(".cd"), tl, 0.4, { returnAt: 1.5 });`, duration: 2.4 },
  }),

  T("motion/diagonal-wipe", {
    uses: ["drive"],
    fn: mk(`var e = gsap.parseEase("power4.inOut"), pin = gsap.parseEase("power2.in"), line = add("left:" + el.offsetLeft + "px;top:" + el.offsetTop + "px;width:" + el.offsetWidth + "px;height:" + el.offsetHeight + "px;border-radius:" + getComputedStyle(el).borderRadius + ";opacity:0;");
return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + 0.32, function (t) { var p = 100 * e(Math.min(1, t / o.duration)), x = o.exitAt != null ? pin(Math.max(0, Math.min(1, (t - o.exitAt) / 0.32))) : 0, m = "linear-gradient(" + o.angle + "deg, #000 " + p.toFixed(2) + "%, transparent " + (p + 0.01).toFixed(2) + "%)";
  el.style.webkitMaskImage = el.style.maskImage = p >= 100 ? "none" : m; el.style.opacity = String(1 - x); line.style.background = "linear-gradient(" + o.angle + "deg, transparent " + (p - 0.6).toFixed(2) + "%, rgba(255,255,255,0.9) " + p.toFixed(2) + "%, transparent " + (p + 0.6).toFixed(2) + "%)"; line.style.opacity = p > 0 && p < 100 ? "1" : "0"; });`),
    options: { duration: "s (0.68, power4.inOut)", angle: "degrees of the gradient (45: from the lower left to the upper right)", exitAt: "s (null)" }, defaults: { duration: 0.68, angle: 45, exitAt: null },
    demo: { css: `${BG}\n${ST} .dw { width: 1000px; height: 600px; border-radius: 40px; overflow: hidden; background: linear-gradient(180deg, #ffb18f 0%, #ff8fab 55%, #6a4cf0 100%); position: relative; } .dw::before { content: ""; position: absolute; left: 640px; top: 120px; width: 180px; height: 180px; border-radius: 50%; background: #fff3c4; }
.dw::after { content: ""; position: absolute; left: -100px; right: -100px; bottom: -260px; height: 520px; border-radius: 50%; background: #3a2a6b; box-shadow: 380px -60px 0 -40px #4a3a8b; }`, html: `<div class="st"><div class="dw"></div></div>`, run: `MW.motionDiagonalWipe(q(".dw"), tl, 0.3, { exitAt: 1.7 });`, duration: 2.4 },
  }),

  T("motion/fold-in-3d", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var p2 = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in"), sh = document.createElement("div"); if (getComputedStyle(el).position === "static") el.style.position = "relative";
      sh.style.cssText = "position:absolute;inset:0;border-radius:inherit;background:#000;pointer-events:none;opacity:0;"; el.appendChild(sh); gsap.set(el, { transformOrigin: "50% 0%" });
      return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + 0.4, function (t) { var p = p2(Math.min(1, t / o.duration)); if (o.exitAt != null && t > o.exitAt) p = 1 - pin(Math.min(1, (t - o.exitAt) / 0.4)); var a = o.from * (1 - p);
        gsap.set(el, { rotationX: a, transformPerspective: o.perspective }); el.style.opacity = String(Math.min(1, t / 0.15)); sh.style.opacity = String((0.7 * (1 - Math.cos(a * Math.PI / 180))).toFixed(3)); });
    },
    options: { from: "degrees (−82)", duration: "s (0.76, power2.out)", perspective: "px (2100)", exitAt: "s after the start to fold back (null, 0.4 s power2.in)" }, defaults: { from: -82, duration: 0.76, perspective: 2100, exitAt: null },
    demo: { css: `${BG}\n${ST} ${CCSS} .cd { opacity: 0; }`, html: `<div class="st">${CARD}</div>`, run: `MW.motionFoldIn3d(q(".cd"), tl, 0.3, { exitAt: 1.8 });`, duration: 2.6 },
  }),

  T("motion/shrink-fade-exit", {
    uses: ["drive"],
    fn: mk(`var pin = gsap.parseEase("power2.in"), p2 = gsap.parseEase("power2.out"), dot = add("width:" + o.dot + "px;height:" + o.dot + "px;margin:-" + o.dot / 2 + "px 0 0 -" + o.dot / 2 + "px;border-radius:50%;background:" + o.accent + ";left:" + cx0 + "px;top:" + cy0 + "px;opacity:0;");
return MW.drive(tl, at, o.returnAt == null ? o.duration + 0.5 : o.returnAt + 0.4, function (t) { var u = pin(Math.min(1, t / o.duration)), s = 1 - (1 - o.to) * u, a = 1 - u, b = o.blur * u; if (o.returnAt != null && t > o.returnAt) { var r = p2(Math.min(1, (t - o.returnAt) / 0.4)); s = 0.9 + 0.1 * r; a = r; b = 0; }
  gsap.set(el, { scale: s }); el.style.opacity = String(a); el.style.filter = b > 0.01 ? "blur(" + b.toFixed(2) + "px)" : ""; var dv = t > o.duration * 0.75 && t < o.duration + 0.5 && (o.returnAt == null || t < o.returnAt); dot.style.opacity = dv ? "1" : "0"; });`),
    options: { to: "end scale (0.22)", blur: "px (9)", duration: "s (0.52, power2.in)", dot: "px mark at the vanishing point (10)", accent: "", returnAt: "s after the start to come back (null)" }, defaults: { to: 0.22, blur: 9, duration: 0.52, dot: 10, accent: "#a99bff", returnAt: null },
    demo: { css: `${BG}\n${ST} .sf { width: 320px; height: 320px; border-radius: 80px; background: linear-gradient(150deg, #3dd6f5, #1580b8); display: grid; place-items: center; } .sf svg { width: 170px; }`,
      html: `<div class="st"><div class="sf"><svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="3" fill="#fff"/><path d="M3 7 L12 13 L21 7" fill="none" stroke="#1580b8" stroke-width="2"/></svg></div></div>`, run: `MW.motionShrinkFadeExit(q(".sf"), tl, 0.5, { returnAt: 1.6 });`, duration: 2.4 },
  }),

  T("motion/linear-travel", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      return MW.drive(tl, at, o.fadeIn + o.duration + o.hold + o.fadeOut, function (t) { var u = Math.max(0, Math.min(1, (t - o.fadeIn) / o.duration)); gsap.set(el, { x: o.x * u }); el.style.opacity = String(Math.min(1, t / o.fadeIn) * (1 - Math.max(0, Math.min(1, (t - o.fadeIn - o.duration - o.hold) / o.fadeOut)))); });
    },
    options: { x: "px (1200)", duration: "s (0.8), ease none: equal spacing every frame", fadeIn: "s (0.2)", hold: "s (0.6)", fadeOut: "s (0.25)" }, defaults: { x: 1200, duration: 0.8, fadeIn: 0.2, hold: 0.6, fadeOut: 0.25 },
    notes: "For spins, drifts and marquees.",
    demo: { css: `${BG}\n.lt-t { position: absolute; left: 300px; width: 1320px; top: 538px; height: 4px; background: #262c3a; } .lt { position: absolute; left: 300px; top: 480px; width: 120px; height: 120px; margin-left: -60px; border-radius: 50%; background: #8b7bff; opacity: 0; }`, html: `<div class="lt-t"></div><div class="lt"></div>`, run: `MW.motionLinearTravel(q(".lt"), tl, 0.2, {});`, duration: 2.2 },
  }),

  T("motion/smooth-arrival", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var io = gsap.parseEase(o.ease);
      return MW.drive(tl, at, o.fadeAt + 0.2 + 0.25, function (t) { var u = io(Math.max(0, Math.min(1, t / o.duration))), f = Math.max(0, Math.min(1, (t - o.fadeAt) / 0.2)), back = Math.max(0, Math.min(1, (t - o.fadeAt - 0.2) / 0.25)); gsap.set(el, { x: back > 0 ? 0 : o.x * u }); el.style.opacity = String(back > 0 ? back : 1 - f); });
    },
    options: { x: "px (1200)", duration: "s (0.76)", ease: "(power2.inOut: fastest mid-way)", fadeAt: "s it fades to reappear at the start (1.65)" }, defaults: { x: 1200, duration: 0.76, ease: "power2.inOut", fadeAt: 1.65 },
    demo: { css: `${BG}\n.sa-s { position: absolute; top: 440px; width: 200px; height: 200px; border-radius: 36px; border: 5px dashed #3a4466; box-sizing: border-box; } ${SQ("sa", 300, 440)}`, html: `<div class="sa-s" style="left:300px"></div><div class="sa-s" style="left:1500px"></div><div class="sa"></div>`, run: `MW.motionSmoothArrival(q(".sa"), tl, 0.3, {});`, duration: 2.4 },
  }),

  T("motion/arc-travel", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var e = gsap.parseEase(o.ease);
      return MW.drive(tl, at, o.duration + o.hold, function (t) { var u = e(Math.max(0, Math.min(1, t / o.duration))), b = 2 * (1 - u) * u, q = u * u; gsap.set(el, { x: b * o.control[0] + q * o.to[0], y: b * o.control[1] + q * o.to[1] }); });
    },
    options: { to: "[x, y] px of the end ([1080, 0])", control: "[x, y] px of the Bézier control point ([540, −840]: the apex about −420)", duration: "s (0.8)", ease: "(sine.inOut)", hold: "s held at the end (0.6)" }, defaults: { to: [1080, 0], control: [540, -840], duration: 0.8, ease: "sine.inOut", hold: 0.6 },
    notes: "The square keeps its orientation along the arc.",
    demo: { css: `${BG}\n${SQ("at", 360, 720, 160)} .at-g { position: absolute; inset: 0; }`, html: `<svg class="at-g" viewBox="0 0 1920 1080"><path d="M440 800 Q980 -40 1520 800" fill="none" stroke="#3a4466" stroke-width="4" stroke-dasharray="14 14"/></svg><div class="at"></div>`, run: `MW.motionArcTravel(q(".at"), tl, 0.3, {});`, duration: 1.8 },
  }),

  T("motion/anticipation-move", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var p1 = gsap.parseEase("power1.out"), io = gsap.parseEase("power2.inOut"), a = o.pullTime; gsap.set(el, { transformOrigin: "50% 100%" });
      var X = function (t) { if (t <= 0) return 0; if (t < a) return o.pull * p1(t / a); return o.pull + (o.x - o.pull) * io(Math.min(1, (t - a) / (o.duration - a))); };
      return MW.drive(tl, at, o.fadeAt + 0.45, function (t) { var x = X(t), v = (X(t + 0.005) - X(t - 0.005)) / 0.01, sx = 1 - 0.12 * (t > 0 && t < 0.2 ? Math.sin(Math.PI * t / 0.2) : 0) + Math.min(o.stretch, Math.max(0, v) / o.speedFull * o.stretch), f = Math.max(0, Math.min(1, (t - o.fadeAt) / 0.2)), back = Math.max(0, Math.min(1, (t - o.fadeAt - 0.2) / 0.25));
        gsap.set(el, { x: back > 0 ? 0 : x, scaleX: back > 0 ? 1 : sx, scaleY: back > 0 ? 1 : 1 / sx }); el.style.opacity = String(back > 0 ? back : 1 - f); });
    },
    options: { pull: "px back first (−150)", pullTime: "s (0.148, power1.out)", x: "px it reaches (810)", duration: "s in all (0.82, power2.inOut after the pull)", stretch: "at most (0.28)", speedFull: "px a second for the full stretch (2500)", fadeAt: "s (1.8)" },
    defaults: { pull: -150, pullTime: 0.148, x: 810, duration: 0.82, stretch: 0.28, speedFull: 2500, fadeAt: 1.8 },
    demo: { css: `${BG}\n${FLOOR} ${SQ("am", 420)}`, html: `<div class="fl"></div><div class="am"></div>`, run: `MW.motionAnticipationMove(q(".am"), tl, 0.3, {});`, duration: 2.6 },
  }),

  T("motion/heavy-stop", {
    uses: ["drive"],
    fn: mk(`var p3 = gsap.parseEase("power3.out"), io = gsap.parseEase("power2.inOut"), dust = []; gsap.set(el, { transformOrigin: "100% 100%" }); for (var i = 0; i < o.dust; i++) dust.push(add("width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:#8f9ab3;opacity:0;"));
var ar = 0.462, bx = el.offsetLeft + el.offsetWidth, by = el.offsetTop + el.offsetHeight;
return MW.drive(tl, at, 1.2, function (t) { var x = t < ar ? o.x * p3(t / ar) : o.x + (o.x - o.over - o.x) * io(Math.min(1, (t - ar) / (0.68 - ar))), sq = 0;
  if (t > 0.32 && t < ar) { var q = (t - 0.32) / (ar - 0.32); sq = o.squash * q * q; } else if (t >= ar) { var w = t - ar; sq = o.squash * Math.exp(-11 * w) * Math.cos(26 * w); } gsap.set(el, { x: x, scaleX: 1 - sq, scaleY: 1 + sq });
  dust.forEach(function (d, i) { var u = (t - 0.4) / 0.55; if (u <= 0 || u >= 1) { d.style.opacity = "0"; return; } var a = -Math.PI * (0.15 + 0.7 * i / (o.dust - 1)); d.style.left = bx + o.x + Math.cos(a) * 140 * u + "px"; d.style.top = by - 10 + Math.sin(a) * 80 * u + "px"; d.style.opacity = String(0.7 * (1 - u)); }); });`),
    options: { x: "px (1092)", over: "px of overshoot (42)", squash: "(0.18)", dust: "(6)" }, defaults: { x: 1092, over: 42, squash: 0.18, dust: 6 },
    notes: "0.462 s power3.out to the line, then back the overshoot by 0.68 s; squashed along the travel at arrival, then a damped wobble e^(−11 t) cos 26 t; the pivot is the bottom leading corner.",
    demo: { css: `${BG}\n${FLOOR} ${SQ("hs", 260, 560, 200, "linear-gradient(180deg, #5a6275, #2f3546)")} .hs-l { position: absolute; left: 1560px; top: 460px; height: 300px; border-left: 4px dashed #ffd23d; }`, html: `<div class="fl"></div><div class="hs-l"></div><div class="hs"></div>`, run: `MW.motionHeavyStop(q(".hs"), tl, 0.3, {});`, duration: 1.8 },
  }),

  T("motion/takayu-path-follow", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var e = gsap.parseEase(o.ease), tr = o.trail ? document.querySelector(o.trail) : null, L = tr ? tr.getTotalLength() : 0; if (tr) { tr.style.strokeDasharray = L + " " + L; tr.style.strokeDashoffset = String(L); }
      return MW.drive(tl, at, o.duration + o.hold, function (t) { var u = e(Math.max(0, Math.min(1, t / o.duration))), b = 2 * (1 - u) * u, q = u * u, dx = 2 * (1 - u) * o.control[0] + 2 * u * (o.to[0] - o.control[0]), dy = 2 * (1 - u) * o.control[1] + 2 * u * (o.to[1] - o.control[1]);
        gsap.set(el, { x: b * o.control[0] + q * o.to[0], y: b * o.control[1] + q * o.to[1], rotation: o.rotate ? Math.atan2(dy, dx) * 180 / Math.PI : 0 }); if (tr) tr.style.strokeDashoffset = String(L * (1 - u)); });
    },
    options: { to: "[x, y] px ([1080, 0])", control: "[x, y] px ([540, −840])", duration: "s (1.0)", ease: "(sine.inOut)", rotate: "turn with the tangent", trail: "an SVG path on the same curve that draws behind it", hold: "s (0.6)" },
    defaults: { to: [1080, 0], control: [540, -840], duration: 1, ease: "sine.inOut", rotate: true, trail: ".pf-t", hold: 0.6 },
    demo: { css: `${BG}\n.pf-g { position: absolute; inset: 0; } .pf { position: absolute; left: 380px; top: 740px; width: 120px; height: 120px; margin: -60px 0 0 -60px; display: grid; place-items: center; }`,
      html: `<svg class="pf-g" viewBox="0 0 1920 1080"><path d="M380 740 Q920 -100 1460 740" fill="none" stroke="#3a4466" stroke-width="4" stroke-dasharray="14 14"/><path class="pf-t" d="M380 740 Q920 -100 1460 740" fill="none" stroke="#8b7bff" stroke-width="8"/></svg><div class="pf"><svg viewBox="-12 -12 24 24" width="120" height="120"><path d="M-10 -7 L11 0 L-10 7 L-5 0 Z" fill="#ffd23d"/></svg></div>`,
      run: `MW.motionTakayuPathFollow(q(".pf"), tl, 0.3, {});`, duration: 2 },
  }),

  T("motion/stagger-follow", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var it = Array.prototype.slice.call(el.querySelectorAll(o.items)), p2 = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in");
      return MW.drive(tl, at, o.backAt == null ? (it.length - 1) * o.stagger + o.duration : o.backAt + (it.length - 1) * o.stagger + 0.55, function (t) { it.forEach(function (x, i) { var u = p2(Math.max(0, Math.min(1, (t - i * o.stagger) / o.duration))); if (o.backAt != null && t > o.backAt) u = 1 - pin(Math.max(0, Math.min(1, (t - o.backAt - i * o.stagger) / 0.55))); gsap.set(x, { x: o.x * u }); }); });
    },
    options: { items: "", x: "px (1140)", duration: "s each (0.9, power2.out)", stagger: "s (0.055)", backAt: "s after the start to return (null, 0.55 s power2.in)" }, defaults: { items: "i", x: 1140, duration: 0.9, stagger: 0.055, backAt: null },
    demo: { css: `${BG}\n.sfl { position: absolute; left: 280px; top: 320px; } .sfl i { display: block; width: 300px; height: 108px; border-radius: 54px; background: #8b7bff; margin-bottom: 40px; } .sfl::before { content: ""; position: absolute; left: 0; right: -1440px; top: 0; bottom: 0; background: repeating-linear-gradient(180deg, transparent 0 52px, rgba(58,68,102,0.5) 52px 56px, transparent 56px 148px); }`,
      html: `<div class="sfl"><i></i><i style="opacity:.72"></i><i style="opacity:.5"></i><i style="opacity:.32"></i></div>`, run: `MW.motionStaggerFollow(q(".sfl"), tl, 0.3, { backAt: 1.6 });`, duration: 2.8 },
  }),

  T("motion/magnetic-snap", {
    uses: ["drive"],
    fn: mk(`var si = gsap.parseEase("sine.inOut"), pin = gsap.parseEase("power2.in"), p2 = gsap.parseEase("power2.out"), tg = o.target ? host.querySelector(o.target) : null, tx = tg ? tg.offsetLeft + tg.offsetWidth / 2 : cx0 + o.keys[3], ty = tg ? tg.offsetTop + tg.offsetHeight / 2 : cy0, R = [];
for (var i = 0; i < 3; i++) R.push(add("border-radius:50%;box-sizing:border-box;border:3px solid " + o.accent + ";opacity:0;width:" + (160 + i * 90) + "px;height:" + (160 + i * 90) + "px;left:" + (tx - 80 - i * 45) + "px;top:" + (ty - 80 - i * 45) + "px;")); var pulse = add("border-radius:50%;box-sizing:border-box;border:4px solid " + o.accent + ";opacity:0;");
var K = o.keys, X = function (t) { if (t <= 0) return 0; if (t < 0.26) return K[1] * si(t / 0.26); if (t < 0.484) return K[1] + (K[2] - K[1]) * pin((t - 0.26) / 0.224); return K[2] + (K[3] - K[2]) * p2(Math.min(1, (t - 0.484) / 0.136)); };
return MW.drive(tl, at, 1.2, function (t) { var x = X(t), s = t > 0.44 && t < 0.64 ? Math.sin(Math.PI * (t - 0.44) / 0.2) : 0; gsap.set(el, { x: x, scaleX: 1 - 0.14 * s, scaleY: 1 + 0.14 * s }); var near = Math.max(0, Math.min(1, 1 - Math.abs(cx0 + x - tx) / Math.max(1, K[3])));
  R.forEach(function (r) { r.style.opacity = String(0.15 + 0.5 * near * near); }); var u = (t - 0.484) / 0.47, rr = 72 + 120 * (1 - Math.pow(1 - Math.max(0, Math.min(1, u)), 3)); pulse.style.width = pulse.style.height = 2 * rr + "px"; pulse.style.left = tx - rr + "px"; pulse.style.top = ty - rr + "px"; pulse.style.opacity = u > 0 && u < 1 ? String(1 - u) : "0"; });`),
    options: { keys: "[start, creep, past, rest] px ([0, 216, 1152, 1050])", target: "the slot it snaps into", accent: "" }, defaults: { keys: [0, 216, 1152, 1050], target: ".ms-s", accent: "#8b7bff" },
    notes: "Creeps (sine.inOut), is pulled in past the slot (power2.in), settles back (power2.out) with a squash; the slot's rings brighten with proximity² and pulse once.",
    demo: { css: `${BG}\n${SQ("ms", 300, 440)} .ms-s { position: absolute; left: 1350px; top: 440px; width: 200px; height: 200px; border-radius: 36px; border: 5px dashed #3a4466; box-sizing: border-box; }`, html: `<div class="ms-s"></div><div class="ms"></div>`, run: `MW.motionMagneticSnap(q(".ms"), tl, 0.3, {});`, duration: 1.8 },
  }),

  T("motion/zigzag-travel", {
    uses: ["drive"],
    fn: mk(`var si = gsap.parseEase(o.ease), P = o.points, ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), pl = document.createElementNS(ns, "polyline"), dl = document.createElementNS(ns, "polyline"), D = [];
svg.setAttribute("width", host.clientWidth); svg.setAttribute("height", host.clientHeight); svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;pointer-events:none;"; host.insertBefore(svg, el);
var abs = P.map(function (p) { return (cx0 + p[0]) + "," + (cy0 + p[1]); }).join(" "); dl.setAttribute("points", abs); dl.setAttribute("fill", "none"); dl.setAttribute("stroke", "#3a4466"); dl.setAttribute("stroke-width", "4"); dl.setAttribute("stroke-dasharray", "12 12"); pl.setAttribute("fill", "none"); pl.setAttribute("stroke", o.accent); pl.setAttribute("stroke-width", "8"); svg.appendChild(dl); svg.appendChild(pl);
P.forEach(function (p) { var d = document.createElementNS(ns, "rect"); d.setAttribute("x", cx0 + p[0] - 18); d.setAttribute("y", cy0 + p[1] - 18); d.setAttribute("width", 36); d.setAttribute("height", 36); d.setAttribute("transform", "rotate(45 " + (cx0 + p[0]) + " " + (cy0 + p[1]) + ")"); d.setAttribute("fill", "#10131d"); d.setAttribute("stroke", o.accent); d.setAttribute("stroke-width", "4"); svg.appendChild(d); D.push(d); });
var Y = function (x) { for (var i = 1; i < P.length; i++) if (x <= P[i][0]) { var a = P[i - 1], b = P[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return P[P.length - 1][1]; };
return MW.drive(tl, at, o.duration + 0.6, function (t) { var x = P[P.length - 1][0] * si(Math.max(0, Math.min(1, t / o.duration))), y = Y(x); gsap.set(el, { x: x, y: y }); var pts = []; P.forEach(function (p, i) { if (p[0] <= x) pts.push((cx0 + p[0]) + "," + (cy0 + p[1])); D[i].setAttribute("fill", p[0] <= x + 0.01 ? o.accent : "#10131d"); }); pts.push((cx0 + x) + "," + (cy0 + y)); pl.setAttribute("points", pts.join(" ")); });`),
    options: { points: "[[x, y] px, ...] of the polyline", duration: "s (0.92)", ease: "(sine.inOut) on x; y follows the line", accent: "" }, defaults: { points: [[0, 0], [380, -190], [770, 165], [1200, 0]], duration: 0.92, ease: "sine.inOut", accent: "#8b7bff" },
    demo: { css: `${BG}\n.zz { position: absolute; left: 360px; top: 540px; width: 90px; height: 90px; margin: -45px 0 0 -45px; border-radius: 50%; background: #ffd23d; z-index: 2; }`, html: `<div class="zz"></div>`, run: `MW.motionZigzagTravel(q(".zz"), tl, 0.3, {});`, duration: 1.8 },
  }),

  T("motion/momentum-drift", {
    uses: ["drive"],
    fn: mk(`var p2 = gsap.parseEase("power2.out"), so = gsap.parseEase("sine.out"), io = gsap.parseEase("power2.inOut"), K = o.keys, cur = o.cursor ? host.querySelector(o.cursor) : null, lines = []; for (var i = 0; i < 3; i++) lines.push(add("height:8px;border-radius:4px;background:#a99bff;opacity:0;"));
var s0 = o.flickAt, X = function (t) { if (t < s0 - 0.3) return 0; if (t < s0) return o.nudge * Math.sin(Math.PI / 2 * (t - s0 + 0.3) / 0.3); var u = t - s0; if (u < 0.598) return o.nudge + (K[0] - o.nudge) * p2(u / 0.598); if (u < 0.739) return K[0] + (K[1] - K[0]) * so((u - 0.598) / 0.141); return K[1] + (K[2] - K[1]) * io(Math.min(1, (u - 0.739) / 0.141)); };
var L = el.offsetLeft, Tp = el.offsetTop, Hh = el.offsetHeight;
return MW.drive(tl, at, s0 + 1.5, function (t) { var x = X(t), v = (X(t + 0.005) - X(t - 0.005)) / 0.01; gsap.set(el, { x: x }); lines.forEach(function (l, i) { var len = Math.min(260, Math.max(0, v) * 0.12) * (1 - i * 0.25); l.style.width = len + "px"; l.style.left = L + x - len - 30 + "px"; l.style.top = Tp + Hh * (0.3 + 0.2 * i) + "px"; l.style.opacity = v > 200 ? "0.7" : "0"; });
  if (cur) { var held = t > s0 - 0.35 && t < s0, cx = L + 80 + (t < s0 - 0.35 ? 300 * (1 - Math.min(1, t / (s0 - 0.35))) : t < s0 ? x : o.nudge + 140 * Math.min(1, (t - s0) / 0.3)); gsap.set(cur, { x: cx, y: Tp + Hh * 0.6 + (t < s0 - 0.35 ? 200 * (1 - t / (s0 - 0.35)) : 0), scale: held ? 0.86 : 1, transformOrigin: "20% 10%" }); } });`),
    options: { keys: "[fast, past, rest] px ([1040, 1140, 1085])", nudge: "px under the pressed cursor first (60)", flickAt: "s (0.6)", cursor: "" }, defaults: { keys: [1040, 1140, 1085], nudge: 60, flickAt: 0.6, cursor: ".ui-cursor" },
    demo: { ...ui(`<div class="md-w"><div class="md">Hất đi</div>${CURSOR}</div>`, `.md-w { position: absolute; inset: 0; } .md { position: absolute; left: 200px; top: 440px; width: 340px; height: 200px; border-radius: 36px; background: linear-gradient(150deg, #a693ff, #6a4cf0); display: grid; place-items: center; font-size: 54px; font-weight: 900; }`),
      run: `MW.motionMomentumDrift(q(".md"), tl, 0, {});`, duration: 2.2 },
  }),

  T("motion/waypoint-hop", {
    uses: ["drive"],
    fn: mk(`var pts = Array.prototype.slice.call(host.querySelectorAll(o.points)), line = o.line ? host.querySelector(o.line) : null, p2 = gsap.parseEase("power2.out"), bo = gsap.parseEase("back.out(2)"), X = pts.map(function (p) { return p.offsetLeft + p.offsetWidth / 2 - cx0; }), step = o.hop + o.land;
gsap.set(el, { transformOrigin: "50% 100%" }); if (line) gsap.set(line, { transformOrigin: "0% 50%" });
return MW.drive(tl, at, (X.length - 1) * step + 0.6, function (t) { var k = Math.min(X.length - 2, Math.floor(t / step)), u = t - k * step, q = Math.min(1, u / o.hop), x = X[k] + (X[k + 1] - X[k]) * p2(q), y = u < o.hop ? -o.height * Math.sin(Math.PI * q) : 0, land = Math.sin(Math.PI * Math.max(0, Math.min(1, (u - o.hop) / 0.12)));
  if (t >= (X.length - 1) * step) { x = X[X.length - 1]; y = 0; } gsap.set(el, { x: x, y: y, scaleY: 1 - 0.08 * (u >= o.hop ? land : 0) });
  pts.forEach(function (p, i) { var r = i === 0 ? 1 : bo(Math.max(0, Math.min(1, (t - (i - 1) * step - o.hop) / 0.2))); gsap.set(p, { scale: 0.7 + 0.3 * r }); p.style.background = r > 0.01 ? o.accent : ""; }); if (line) gsap.set(line, { scaleX: Math.max(0, Math.min(1, (x - X[0]) / (X[X.length - 1] - X[0]))) }); });`),
    options: { points: "the waypoints", line: "a progress line that fills", hop: "s per hop (0.25, x power2.out)", land: "s on the ground (0.05)", height: "px of the arc (150)", accent: "" }, defaults: { points: ".wh-p", line: ".wh-l", hop: 0.25, land: 0.05, height: 150, accent: "#8b7bff" },
    demo: { css: `${BG}\n.wh-t, .wh-l { position: absolute; left: 360px; width: 1200px; top: 596px; height: 8px; border-radius: 4px; background: #262c3a; } .wh-l { background: #8b7bff; transform: scaleX(0); } .wh-p { position: absolute; top: 560px; width: 80px; height: 80px; margin-left: -40px; border-radius: 50%; background: #2a3142; border: 6px solid #10131d; box-sizing: border-box; }
.wh { position: absolute; left: 360px; top: 440px; width: 70px; height: 110px; margin-left: -35px; } .wh::before { content: ""; position: absolute; inset: 0; border-radius: 50% 50% 50% 50% / 40% 40% 60% 60%; background: #ffd23d; } `,
      html: `<div class="wh-t"></div><div class="wh-l"></div>${[360, 760, 1160, 1560].map((x) => `<div class="wh-p" style="left:${x}px"></div>`).join("")}<div class="wh"></div>`, run: `MW.motionWaypointHop(q(".wh"), tl, 0.3, {});`, duration: 1.8 },
  }),

  T("text/char-exit-up", {
    uses: TXU,
    fn: mt(`var ch = split("chars"), n = ch.length, st = Math.min(o.stagger, o.cap / Math.max(1, n - 1)), e = MW.ez(o.ease), ex = gsap.parseEase("expo.out"), fs = parseFloat(getComputedStyle(el).fontSize);
MW.split(el, "chars").words.forEach(function (w) { w.style.overflow = "hidden"; w.style.padding = "0.18em 0.04em 0.06em"; w.style.margin = "-0.18em -0.04em -0.06em"; w.style.verticalAlign = "top"; });
return MW.drive(tl, at, o.loop, function (t) { ch.forEach(function (c, i) { var a = e(pin((t - o.outAt - i * st) / o.duration)), b = ex(pin((t - o.backAt - i * st) / 0.6)), y = t < o.backAt ? -o.dist * fs * a : o.dist * fs * (1 - b); gsap.set(c, { yPercent: 0, y: y }); c.style.opacity = String(t < o.backAt ? 1 - a : b); }); });`),
    options: { duration: "s (0.5)", stagger: "s (0.04)", cap: "s (0.5)", dist: "em of travel, one mask height (1.24)", ease: "(cubic-bezier(.55,.055,.675,.19): ease-in cubic)", outAt: "s (0.8)", backAt: "s they come back up from below (1.75)", loop: "s (3)" },
    defaults: { duration: 0.5, stagger: 0.04, cap: 0.5, dist: 1.24, ease: "cubic-bezier(.55,.055,.675,.19)", outAt: 0.8, backAt: 1.75, loop: 3 },
    demo: H("Hẹn gặp cảnh sau", `MW.textCharExitUp(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/fade-down-out", {
    uses: TXU,
    fn: mt(`var ch = split("chars"), n = ch.length, st = Math.min(o.stagger, o.cap / Math.max(1, n - 1)), e = MW.ez(o.ease), fs = parseFloat(getComputedStyle(el).fontSize);
return MW.drive(tl, at, o.loop, function (t) { var back = pin((t - o.backAt) / 0.5); ch.forEach(function (c, i) { var a = e(pin((t - o.outAt - (n - 1 - i) * st) / o.duration)) * (1 - back); gsap.set(c, { y: o.dist * fs * a * (back > 0 ? 0 : 1) }); c.style.opacity = String(back > 0 ? back : 1 - a); }); });`),
    options: { duration: "s (0.6)", stagger: "s from the last letter (0.06)", cap: "s (0.6)", dist: "em (0.6)", ease: "(cubic-bezier(.55,.085,.68,.53): ease-in quad)", outAt: "s (0.9)", backAt: "s it fades back in place (2.4)", loop: "s (3)" },
    defaults: { duration: 0.6, stagger: 0.06, cap: 0.6, dist: 0.6, ease: "cubic-bezier(.55,.085,.68,.53)", outAt: 0.9, backAt: 2.4, loop: 3 },
    demo: H("Chìm dần xuống", `MW.textFadeDownOut(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/blur-evaporate-out", {
    uses: TXU,
    fn: mt(`var w = split("words"), n = w.length, st = Math.min(o.stagger, o.cap / Math.max(1, n - 1)), e = MW.ez(o.ease), fs = parseFloat(getComputedStyle(el).fontSize), r = MW.rand(o.seed), dust = [];
if (getComputedStyle(el).position === "static") el.style.position = "relative";
w.forEach(function (x, i) { x.style.position = "relative"; for (var k = 0; k < o.dust; k++) { var d = document.createElement("span"), z = 4 + r() * 6; d.style.cssText = "position:absolute;border-radius:50%;background:#8f9ab3;pointer-events:none;opacity:0;width:" + z + "px;height:" + z + "px;left:" + (r() * 100) + "%;top:" + (20 + r() * 60) + "%;"; x.appendChild(d); dust.push({ d: d, i: i, h: 0.5 + r() * 0.8 }); } });
return MW.drive(tl, at, o.loop, function (t) { var back = pin((t - o.backAt) / 0.5); w.forEach(function (x, i) { var a = e(pin((t - o.outAt - (n - 1 - i) * st) / o.duration)) * (back > 0 ? 0 : 1); gsap.set(x, { y: -o.rise * fs * a }); x.style.filter = a > 0.01 ? "blur(" + (o.blur * a).toFixed(2) + "px)" : ""; x.style.opacity = String(back > 0 ? back : 1 - a); });
  dust.forEach(function (q) { var a = e(pin((t - o.outAt - (n - 1 - q.i) * st) / o.duration)); q.d.style.opacity = back > 0 ? "0" : String(0.8 * Math.sin(Math.PI * a)); q.d.style.transform = "translateY(" + (-q.h * fs * a).toFixed(1) + "px)"; }); });`),
    options: { duration: "s (0.7, ease-out quad)", stagger: "s from the last word (0.15)", cap: "s (0.6)", blur: "px (20)", rise: "em (0.4)", ease: "(power1.out)", dust: "dots per word (7)", outAt: "s (0.9)", backAt: "s (2.4)", seed: "(5)", loop: "s (3)" },
    defaults: { duration: 0.7, stagger: 0.15, cap: 0.6, blur: 20, rise: 0.4, ease: "power1.out", dust: 7, outAt: 0.9, backAt: 2.4, seed: 5, loop: 3 },
    demo: H("Tan vào hư không", `MW.textBlurEvaporateOut(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/explode-scatter-out", {
    uses: TXU,
    fn: mt(`var ch = split("chars"), n = ch.length, mid = (n - 1) / 2, st = Math.min(o.stagger, o.cap / Math.max(1, Math.ceil(n / 2))), p3 = gsap.parseEase("power3.out"), r = MW.rand(o.seed), V = ch.map(function () { return [(r() * 2 - 1) * o.spread[0], (r() * 2 - 1) * o.spread[1], (r() * 2 - 1) * o.rotate]; });
var host = el.parentNode; if (getComputedStyle(host).position === "static") host.style.position = "relative"; var ring = document.createElement("div"); ring.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;opacity:0;box-sizing:border-box;border:solid " + o.accent + ";"; host.appendChild(ring); var cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2;
return MW.drive(tl, at, o.loop, function (t) { var back = pin((t - o.backAt) / 0.5); ch.forEach(function (c, i) { var u = pin((t - o.outAt - Math.abs(i - mid) * st) / o.duration), p = p3(u) * (back > 0 ? 0 : 1), v = V[i]; gsap.set(c, { x: v[0] * p, y: v[1] * p, rotation: v[2] * p }); c.style.opacity = String(back > 0 ? back : 1 - u); });
  var q = pin((t - o.outAt) / 0.45), R = o.ring[0] + (o.ring[1] - o.ring[0]) * p3(q); ring.style.width = ring.style.height = 2 * R + "px"; ring.style.left = cx - R + "px"; ring.style.top = cy - R + "px"; ring.style.borderWidth = (8 - 7 * q).toFixed(1) + "px"; ring.style.opacity = q > 0 && q < 1 ? String(1 - q) : "0"; });`),
    options: { spread: "[x, y] ± px ([600, 400])", rotate: "± degrees (180)", duration: "s (0.8, power3.out)", stagger: "s from the centre out (0.015)", cap: "s (0.15)", ring: "[from, to] px of the burst ring ([30, 450])", accent: "", outAt: "s (0.9)", backAt: "s (2.4)", seed: "(7)", loop: "s (3)" },
    defaults: { spread: [600, 400], rotate: 180, duration: 0.8, stagger: 0.015, cap: 0.15, ring: [30, 450], accent: "#a99bff", outAt: 0.9, backAt: 2.4, seed: 7, loop: 3 },
    demo: H("Nổ tung tứ phía", `MW.textExplodeScatterOut(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/gravity-drop-out", {
    uses: TXU,
    fn: mt(`var ch = split("chars"), n = ch.length, r = MW.rand(o.seed), ord = ch.map(function (_, i) { return i; }), st = Math.min(o.stagger, o.cap / Math.max(1, n - 1)); for (var i = n - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), x = ord[i]; ord[i] = ord[j]; ord[j] = x; }
var rank = []; ord.forEach(function (c, k) { rank[c] = k; }); var V = ch.map(function () { return [(r() * 2 - 1) * o.rotate, (r() * 2 - 1) * o.drift]; });
return MW.drive(tl, at, o.loop, function (t) { var back = pin((t - o.backAt) / 0.5); ch.forEach(function (c, i) { var s0 = o.start + rank[i] * st, w = pin((t - s0) / o.wobble), u = t - s0 - o.wobble;
  if (back > 0) { gsap.set(c, { x: 0, y: 0, rotation: 0 }); c.style.opacity = String(back); return; } c.style.opacity = "1";
  if (u <= 0) { gsap.set(c, { x: 0, y: 0, rotation: t > s0 ? Math.sin(18 * w) * 0.06 * w * 57.3 : 0 }); return; } gsap.set(c, { y: 0.5 * o.gravity * u * u, x: V[i][1] * u, rotation: V[i][0] * Math.min(1, u / 0.7) }); }); });`),
    options: { gravity: "px a second² (4500)", rotate: "± degrees (40)", drift: "± px a second (75)", stagger: "s in a seeded order (0.12)", cap: "s (0.8)", wobble: "s each letter wobbles first (0.22)", start: "s (0.8)", backAt: "s (2.6)", seed: "(3)", loop: "s (3.2)" },
    defaults: { gravity: 4500, rotate: 40, drift: 75, stagger: 0.12, cap: 0.8, wobble: 0.22, start: 0.8, backAt: 2.6, seed: 3, loop: 3.2 },
    demo: H("Rơi khỏi dòng", `MW.textGravityDropOut(q(".tk-head"), tl, 0, {});`, 3.2, { size: 170 }, ".tk-stage { overflow: hidden; }"),
  }),

  T("text/scale-down-vanish", {
    uses: TXU,
    fn: mt(`var ch = split("chars"), n = ch.length, st = Math.min(o.stagger, o.cap / Math.max(1, n - 1)), e = MW.ez(o.ease), X = [];
ch.forEach(function (c) { c.style.position = "relative"; var m = document.createElement("span"); m.textContent = "+"; m.style.cssText = "position:absolute;left:50%;top:50%;transform:translate(-50%,-55%);font-size:0.3em;color:" + o.accent + ";opacity:0;pointer-events:none;"; c.parentNode.insertBefore(m, c.nextSibling); m.style.position = "absolute"; X.push(m); });
return MW.drive(tl, at, o.loop, function (t) { var back = pin((t - o.backAt) / 0.5); ch.forEach(function (c, i) { var u = e(pin((t - o.outAt - i * st) / o.duration)); gsap.set(c, { scale: back > 0 ? 1 : 1 - u }); c.style.opacity = String(back > 0 ? back : 1); var m = X[i]; m.style.left = c.offsetLeft + c.offsetWidth / 2 + "px"; m.style.top = c.offsetTop + c.offsetHeight / 2 + "px"; m.style.opacity = back > 0 ? "0" : String(u); }); });`),
    options: { duration: "s per letter (0.35)", stagger: "s (0.05)", cap: "s (0.5)", ease: "(cubic-bezier(.55,.085,.68,.53))", accent: "the mark left at each vanishing point", outAt: "s (0.9)", backAt: "s (2.4)", loop: "s (3)" },
    defaults: { duration: 0.35, stagger: 0.05, cap: 0.5, ease: "cubic-bezier(.55,.085,.68,.53)", accent: "#a99bff", outAt: 0.9, backAt: 2.4, loop: 3 },
    demo: H("Thu nhỏ biến mất", `MW.textScaleDownVanish(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }, ".tk-head { position: relative; } .tk-head .mw-w { position: relative; }"),
  }),

  T("text/reverse-erase", {
    uses: TXU,
    fn: mt(`var ch = split("chars"), n = ch.length, st = Math.min(o.stagger, o.cap / Math.max(1, n - 1)), p3 = gsap.parseEase("power3.out"), fs = parseFloat(getComputedStyle(el).fontSize), span = (n - 1) * st + o.duration;
return MW.drive(tl, at, o.loop, function (t) { var tt = t < o.exitAt ? t - o.start : span - (t - o.exitAt); ch.forEach(function (c, i) { var u = p3(pin((tt - i * st) / o.duration)); gsap.set(c, { y: o.dist * fs * (1 - u) }); c.style.opacity = String(u); }); });`),
    options: { duration: "s per letter (0.5, ease-out cubic)", stagger: "s (0.06)", cap: "s (0.5)", dist: "em (0.5)", start: "s (0.3)", exitAt: "s the entrance plays backward (2.2)", loop: "s (3.6)" },
    defaults: { duration: 0.5, stagger: 0.06, cap: 0.5, dist: 0.5, start: 0.3, exitAt: 2.2, loop: 3.6 },
    notes: "The exit is the entrance played backward: the last letter leaves first, each on the time-reversed curve.",
    demo: H("Xoá ngược lại", `MW.textReverseErase(q(".tk-head"), tl, 0, {});`, 3.6, { size: 170 }),
  }),

  T("text/collapse-to-center", {
    uses: TXU,
    fn: mt(`var ch = split("chars"), n = ch.length, mid = (n - 1) / 2, st = Math.min(o.stagger, o.cap / Math.max(1, Math.ceil(n / 2))), e = MW.ez(o.ease), host = el.parentNode; if (getComputedStyle(host).position === "static") host.style.position = "relative";
var br = el.getBoundingClientRect(), C = ch.map(function (c) { var r = c.getBoundingClientRect(); return [br.left + br.width / 2 - (r.left + r.width / 2), br.top + br.height / 2 - (r.top + r.height / 2)]; }), cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2;
var dot = document.createElement("div"), ring = document.createElement("div"); dot.style.cssText = "position:absolute;border-radius:50%;background:" + o.accent + ";pointer-events:none;opacity:0;"; ring.style.cssText = "position:absolute;border-radius:50%;box-sizing:border-box;border:4px solid " + o.accent + ";pointer-events:none;opacity:0;"; host.appendChild(dot); host.appendChild(ring);
return MW.drive(tl, at, o.loop, function (t) { var back = pin((t - o.backAt) / 0.5), tot = 0; ch.forEach(function (c, i) { var u = e(pin((t - o.outAt - (mid - Math.abs(i - mid)) * st) / o.duration)) * (back > 0 ? 0 : 1); tot += u; gsap.set(c, { x: C[i][0] * u, y: C[i][1] * u, scale: 1 - u }); c.style.opacity = String(back > 0 ? back : 1 - u); });
  var k = tot / n, d = (6 + 16 * k) * (t < o.ringAt + 0.45 ? 1 : 0) * (back > 0 ? 0 : 1); dot.style.width = dot.style.height = d + "px"; dot.style.left = cx - d / 2 + "px"; dot.style.top = cy - d / 2 + "px"; dot.style.opacity = k > 0.02 ? "1" : "0";
  var q = pin((t - o.ringAt) / 0.45), R = 24 + 88 * (1 - Math.pow(1 - q, 3)); ring.style.width = ring.style.height = 2 * R + "px"; ring.style.left = cx - R + "px"; ring.style.top = cy - R + "px"; ring.style.opacity = q > 0 && q < 1 ? String(1 - q) : "0"; });`),
    options: { duration: "s per letter (0.5)", stagger: "s from both ends inward (0.05)", cap: "s (0.4)", ease: "(cubic-bezier(.55,.055,.675,.19))", accent: "", outAt: "s (0.9)", ringAt: "s the ring pulses (1.45)", backAt: "s (2.4)", loop: "s (3)" },
    defaults: { duration: 0.5, stagger: 0.05, cap: 0.4, ease: "cubic-bezier(.55,.055,.675,.19)", accent: "#a99bff", outAt: 0.9, ringAt: 1.45, backAt: 2.4, loop: 3 },
    demo: H("Hút về một điểm", `MW.textCollapseToCenter(q(".tk-head"), tl, 0, {});`, 3, { size: 170 }),
  }),

  T("text/noise-dissolve", {
    uses: ["drive", "noise", "rand", "split"],
    fn: mt(`var R = raster(10), c = R.c, cs = o.cell, cols = Math.ceil(R.W / cs), rows = Math.ceil(R.H / cs), img = R.off.getContext("2d").getImageData(0, 0, R.W, R.H).data, nz = MW.noise(o.seed), hz = MW.rand(o.seed + 9), N = [], ON = [];
for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) { var a = img[((Math.min(R.H - 1, y * cs + cs / 2)) * R.W + Math.min(R.W - 1, x * cs + cs / 2)) * 4 + 3]; ON.push(a > 20); var v = 0.6 * (0.5 + 0.5 * nz(x * cs * o.freq + 0.37 * y) * 0.5 + 0.25 * nz(y * cs * o.freq + 50 + 0.21 * x)) + 0.4 * hz(); N.push(v); }
return MW.drive(tl, at, o.loop, function (t) { var th = -0.06 + 1.1 * pin((t - o.start) / o.duration), back = pin((t - o.backAt) / 0.5); c.clearRect(0, 0, R.W, R.H); if (back > 0) { c.globalAlpha = back; c.drawImage(R.off, 0, 0); c.globalAlpha = 1; return; } if (t < o.start) { c.drawImage(R.off, 0, 0); return; }
  c.drawImage(R.off, 0, 0); c.fillStyle = o.accent; for (var i = 0; i < N.length; i++) { if (!ON[i]) continue; var x = (i % cols) * cs, y = Math.floor(i / cols) * cs; if (N[i] < th) c.clearRect(x, y, cs, cs); else if (N[i] < th + o.rim) c.fillRect(x, y, cs, cs); } });`),
    options: { cell: "px per noise cell (6)", freq: "noise frequency per px (0.02)", rim: "how wide the burning rim is (0.07)", start: "s (1.0)", duration: "s the threshold rises (1.2), linear", accent: "the rim", backAt: "s (2.6)", seed: "(3)", loop: "s (3.2)" },
    defaults: { cell: 6, freq: 0.02, rim: 0.07, start: 1, duration: 1.2, accent: "#ff8a3d", backAt: 2.6, seed: 3, loop: 3.2 },
    notes: "A fixed noise mask: cells under the rising threshold are cut, those just above it burn in the accent colour.",
    demo: H("Tan thành tro", `MW.textNoiseDissolve(q(".tk-head"), tl, 0, {});`, 3.2, { size: 170, weight: 900 }),
  }),
];

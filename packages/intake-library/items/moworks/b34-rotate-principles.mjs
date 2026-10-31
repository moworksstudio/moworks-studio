// Rotation and Principles (batch 3.4): turns, spins, flips and swings on the element's own transform, and the animation principles (squash
// and stretch, anticipation, staging, follow-through, arcs, timing, appeal...) as effects or small lessons drawn on a 320 x 200 frame,
// written here.
import { T } from "../../moworks/define.mjs";
import { CURSOR, ui } from "../../moworks/stages.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;
const CV = (name, duration = 4, opt = "{}") => ({ css: BG, html: `<div class="gm"></div>`, run: `MW.${name}(q(".gm"), tl, 0, ${opt});`, duration });
const ST = `.st { position: absolute; inset: 0; display: grid; place-items: center; }`;
const TILE = `width: 300px; height: 300px; border-radius: 64px; background: linear-gradient(150deg, #a693ff, #6a4cf0); display: grid; place-items: center; box-shadow: 0 40px 100px rgba(106, 76, 240, 0.35);`;
const ARROW = `<svg viewBox="0 0 24 24" width="170" height="170"><path d="M12 2.5 L20.5 12.5 H15 V21.5 H9 V12.5 H3.5 Z" fill="#fff"/></svg>`;
const FLOOR = `.fl { position: absolute; left: 260px; right: 260px; top: 860px; height: 4px; border-radius: 2px; background: #262c3a; }`;
const STAR = `<svg viewBox="-10 -10 20 20" width="100%" height="100%"><path d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z" fill="currentColor"/></svg>`;
// ghost copies: clones laid over the element's box in its parent (the parent becomes positioned if it was not)
const GHOSTS = `var host = el.parentNode; if (getComputedStyle(host).position === "static") host.style.position = "relative";
var ghost = function () { var g = el.cloneNode(true); g.removeAttribute("id"); g.style.position = "absolute"; g.style.margin = "0"; g.style.pointerEvents = "none"; g.style.opacity = "0";
  g.style.left = el.offsetLeft + "px"; g.style.top = el.offsetTop + "px"; g.style.width = el.offsetWidth + "px"; g.style.height = el.offsetHeight + "px"; host.insertBefore(g, el); return g; };`;
const mk = (body) => new Function("el", "tl", "at", "o", GHOSTS + "\n" + body);

export default [
  T("motion/simple-turn", {
    uses: ["drive"],
    fn: mk(`var e = gsap.parseEase(o.ease), gh = []; for (var i = 0; i < o.ghosts; i++) gh.push(ghost());
var ang = function (t) { var a = 0; for (var k = 0; k < o.turns; k++) a += o.rotation * e(Math.max(0, Math.min(1, (t - k * (o.duration + o.hold)) / o.duration))); return a; };
return MW.drive(tl, at, o.turns * (o.duration + o.hold), function (t) {
  var a = ang(t); gsap.set(el, { rotation: a });
  gh.forEach(function (g, i) { var b = ang(t - o.gap * (i + 1)); gsap.set(g, { rotation: b }); g.style.opacity = Math.abs(a - b) > 0.5 ? String(o.ghostOpacity) : "0"; });
});`),
    options: { duration: "s per turn (0.7; the small demo 0.8)", rotation: "degrees a turn (180)", ease: "(power2.inOut)", ghosts: "trailing copies (3)", gap: "s between copies (0.035)", ghostOpacity: "(0.12)", turns: "turns in a row (2)", hold: "s between turns (0.8)" },
    defaults: { duration: 0.7, rotation: 180, ease: "power2.inOut", ghosts: 3, gap: 0.035, ghostOpacity: 0.12, turns: 2, hold: 0.8 },
    demo: { css: `${BG}\n${ST} .st-g { position: absolute; left: 50%; top: 50%; width: 560px; height: 560px; margin: -280px 0 0 -280px; border-radius: 50%; border: 3px dashed #2a3350; } .st-t { ${TILE} }`,
      html: `<div class="st"><div class="st-g"></div><div class="st-t">${ARROW}</div></div>`, run: `MW.motionSimpleTurn(q(".st-t"), tl, 0.3, { duration: 0.8 });`, duration: 3.5 },
  }),

  T("motion/spin-stop", {
    uses: ["drive", "eases"],
    fn: mk(`var e = MW.ez(o.ease), gh = [], ring = document.createElement("div"), mk = o.marker ? host.querySelector(o.marker) : null; for (var i = 0; i < o.copies; i++) gh.push(ghost());
ring.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;opacity:0;border:" + o.ringWidth + "px solid " + o.accent + ";"; host.appendChild(ring);
var cx = mk ? mk.offsetLeft + mk.offsetWidth / 2 : el.offsetLeft + el.offsetWidth / 2, cy = mk ? mk.offsetTop + mk.offsetHeight / 2 : el.offsetTop + el.offsetHeight / 2, p2 = gsap.parseEase("power2.out");
var A = function (t) { return o.turns * 360 * e(Math.max(0, Math.min(1, t / o.duration))); }, ping = o.duration * o.pingAt;
return MW.drive(tl, at, Math.max(o.duration, ping + o.ringTime), function (t) {
  var a = A(t), v = (a - A(t - 0.02)) / 0.02; gsap.set(el, { rotation: a });
  gh.forEach(function (g, i) { gsap.set(g, { rotation: A(t - o.gap * (i + 1)) }); g.style.opacity = String(Math.min(o.copyOpacity, o.copyOpacity * v / 600) * (1 - i / o.copies)); });
  var u = (t - ping) / o.ringTime, r = o.ring[0] + (o.ring[1] - o.ring[0]) * p2(Math.max(0, Math.min(1, u)));
  ring.style.width = ring.style.height = 2 * r + "px"; ring.style.left = cx - r - o.ringWidth + "px"; ring.style.top = cy - r - o.ringWidth + "px"; ring.style.opacity = u > 0 && u < 1 ? String(1 - u) : "0";
});`),
    options: { turns: "(2)", duration: "s (0.85; the small demo 1.2)", ease: "(power3.out; the demo cubic-bezier(.3,.45,.15,1))", copies: "motion copies (5)", gap: "s between copies (0.012)", copyOpacity: "at full speed (0.16)", marker: "the stop marker (a ring pings there)", ring: "[from, to] px radius ([25, 95])", ringWidth: "px (6)", ringTime: "s (0.43)", pingAt: "share of the spin when the ring pings (0.7)", accent: "ring colour" },
    defaults: { turns: 2, duration: 0.85, ease: "power3.out", copies: 5, gap: 0.012, copyOpacity: 0.16, marker: null, ring: [25, 95], ringWidth: 6, ringTime: 0.43, pingAt: 0.7, accent: "#ffd23d" },
    demo: { css: `${BG}\n${ST} .ss-m { position: absolute; left: 50%; top: 270px; width: 36px; height: 36px; margin-left: -18px; border-radius: 50%; background: #ffd23d; } .ss-t { ${TILE} }`,
      html: `<div class="st"><div class="ss-m"></div><div class="ss-t">${ARROW}</div></div>`,
      run: `MW.motionSpinStop(q(".ss-t"), tl, 0.3, { duration: 1.2, ease: "cubic-bezier(.3,.45,.15,1)", marker: ".ss-m" }); MW.motionSpinStop(q(".ss-t"), tl, 2.1, { duration: 1.2, ease: "cubic-bezier(.3,.45,.15,1)", marker: ".ss-m" });`, duration: 3.8 },
  }),

  T("motion/pendulum-wobble", {
    uses: ["keys"],
    fn: function (el, tl, at, o) {
      gsap.set(el, { transformOrigin: "50% " + (-o.pivot) + "px" });
      return MW.keys(tl, el, at, { rotation: o.angles.map(function (a, i) { return [o.times[i] * o.duration, a]; }) }, o.ease);
    },
    options: { angles: "degrees at each key ([-27, 18, -11, 6, -2, 0])", times: "share of the length at each key ([0, .22, .42, .6, .76, .9])", duration: "s (2.2; the recipe 1 s)", pivot: "px above the top edge (70)", ease: "between keys (cubic-bezier(.45,.05,.2,1))" },
    defaults: { angles: [-27, 18, -11, 6, -2, 0], times: [0, 0.22, 0.42, 0.6, 0.76, 0.9], duration: 2.2, pivot: 70, ease: "cubic-bezier(.45,.05,.2,1)" },
    demo: { css: `${BG}\n.pw-pin { position: absolute; left: 50%; top: 290px; width: 30px; height: 30px; margin: -15px 0 0 -15px; border-radius: 50%; background: #e8ebf3; z-index: 2; }
.pw-c { position: absolute; left: 50%; top: 360px; width: 560px; height: 300px; margin-left: -280px; border-radius: 34px; background: #151a24; border: 4px solid #8b7bff; display: grid; place-items: center; font-size: 96px; font-weight: 900; letter-spacing: 0.02em; }
.pw-c svg { position: absolute; left: 0; top: -70px; width: 100%; height: 70px; overflow: visible; }`,
      html: `<div class="pw-pin"></div><div class="pw-c"><svg viewBox="0 0 560 70" preserveAspectRatio="none"><path d="M280 0 L70 70 M280 0 L490 70" stroke="#6c778b" stroke-width="5" fill="none"/></svg>MỞ CỬA</div>`,
      run: `MW.motionPendulumWobble(q(".pw-c"), tl, 0.3, {});`, duration: 2.8 },
  }),

  T("motion/card-flip", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var f = el.querySelector(o.front), b = el.querySelector(o.back), e = gsap.parseEase(o.ease), rot = o.axis === "x" ? "rotationX" : "rotationY", n = 180 * o.turns;
      return MW.drive(tl, at, o.returnAt == null ? o.duration : o.returnAt + o.duration, function (t) {
        var A = n * e(Math.max(0, Math.min(1, t / o.duration))); if (o.returnAt != null) A -= n * e(Math.max(0, Math.min(1, (t - o.returnAt) / o.duration)));
        var face = ((Math.floor((A + 90) / 180) % 2) + 2) % 2, shown = A - 180 * Math.round(A / 180), s = {}; s[rot] = shown; s.transformPerspective = o.perspective; gsap.set(el, s);
        f.style.visibility = face === 0 ? "visible" : "hidden"; b.style.visibility = face === 1 ? "visible" : "hidden";
      });
    },
    options: { duration: "s per flip (0.76)", ease: "(power2.inOut)", axis: "x | y", perspective: "px (1000)", turns: "half turns (1)", returnAt: "s after the start to flip back (null)", front: "front face", back: "back face" },
    defaults: { duration: 0.76, ease: "power2.inOut", axis: "y", perspective: 1000, turns: 1, returnAt: null, front: ".cf-f", back: ".cf-b" },
    notes: "Folds to 90°, swaps the faces and unfolds from −90°, so the back reads unmirrored without backface-visibility.",
    demo: { css: `${BG}\n${ST} .cf { position: relative; width: 640px; height: 440px; } .cf > div { position: absolute; inset: 0; border-radius: 44px; display: grid; place-items: center; font-size: 84px; font-weight: 900; color: #fff; }
.cf-f { background: linear-gradient(150deg, #a693ff, #6a4cf0); } .cf-b { background: linear-gradient(150deg, #5a49b0, #3a2a8a); visibility: hidden; }`,
      html: `<div class="st"><div class="cf"><div class="cf-f">MẶT TRƯỚC</div><div class="cf-b">MẶT SAU</div></div></div>`, run: `MW.motionCardFlip(q(".cf"), tl, 0.3, { returnAt: 1.6 });`, duration: 3.1 },
  }),

  T("motion/orbit", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      return MW.drive(tl, at, o.duration * o.laps, function (t) { var a = o.direction * 2 * Math.PI * t / o.duration - Math.PI / 2; gsap.set(el, { x: o.radius * Math.cos(a), y: o.radius * Math.sin(a) }); });
    },
    options: { duration: "s per lap, linear (1.1; the small demo 2.6)", radius: "px (215)", direction: "1 clockwise, -1 the other way", laps: "(2)" }, defaults: { duration: 1.1, radius: 215, direction: 1, laps: 2 },
    demo: { css: `${BG}\n${ST} .ob-g { position: absolute; left: 50%; top: 50%; width: 430px; height: 430px; margin: -215px 0 0 -215px; border-radius: 50%; border: 3px solid #262c3a; }
.ob-c { position: absolute; left: 50%; top: 50%; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 50%; background: #3a4466; } .ob-d { width: 90px; height: 90px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #9af2ff, #2bb7e6 60%, #1278ad); box-shadow: 0 0 60px rgba(61, 214, 245, 0.45); }`,
      html: `<div class="st"><div class="ob-g"></div><div class="ob-c"></div><div class="ob-d"></div></div>`, run: `MW.motionOrbit(q(".ob-d"), tl, 0, { duration: 2 });`, duration: 4 },
  }),

  T("motion/tilt-reaction", {
    uses: ["drive", "draw"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, sh = o.shadow ? host.querySelector(o.shadow) : null, cur = o.cursor ? host.querySelector(o.cursor) : null, p2 = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), k = o.duration / 0.48;
      var one = function (u) { u /= k; if (u <= 0) return 0; if (u < 0.12) return 16 * p2(u / 0.12); if (u < 0.3) return 16 - 19 * io((u - 0.12) / 0.18); if (u < 0.48) return -3 + 3 * io((u - 0.3) / 0.18); return 0; };
      var pt = function (side) { return [el.offsetLeft + el.offsetWidth * (side === "left" ? 0.18 : 0.82), el.offsetTop + el.offsetHeight * 0.55]; };
      var keys = [[0, el.offsetLeft + el.offsetWidth * 1.15, el.offsetTop + el.offsetHeight * 1.2]]; o.taps.forEach(function (p) { var q = pt(p[1]); keys.push([p[0] - 0.08, q[0], q[1]]); keys.push([p[0] + 0.25, q[0], q[1]]); });
      var last = o.taps[o.taps.length - 1][0];
      return MW.drive(tl, at, last + o.duration + 0.2, function (t) {
        var r = 0; o.taps.forEach(function (p) { r += (p[1] === "left" ? -1 : 1) * one(t - p[0]) * o.angle / 16; }); gsap.set(el, { rotation: r });
        if (sh) gsap.set(sh, { scaleX: 1 + 0.006 * Math.abs(r) });
        if (cur) { var c = MW.path(keys, t, "power2.inOut"), press = 0; o.taps.forEach(function (p) { var u = (t - p[0] + 0.04) / 0.16; if (u > 0 && u < 1) press = Math.sin(Math.PI * u); }); gsap.set(cur, { x: c[0] - 12, y: c[1] - 6, scale: 1 - 0.15 * press, transformOrigin: "20% 10%" }); }
      });
    },
    options: { angle: "degrees (16)", duration: "s per reaction (0.48)", taps: "[[s, 'left' | 'right'], ...]", shadow: "contact shadow (widens 0.6 % a degree)", cursor: "an optional cursor that makes the taps" },
    defaults: { angle: 16, duration: 0.48, taps: [[0.5, "right"], [1.6, "left"]], shadow: null, cursor: null },
    demo: { ...ui(`<div class="tr"><div class="tr-sh"></div><div class="ui-card tr-c"><p class="ui-h">Bấm vào thẻ</p><p class="ui-p">Thẻ nghiêng về phía bị bấm</p></div>${CURSOR}</div>`,
      `.tr { position: relative; width: 900px; height: 520px; } .tr-c { position: absolute; left: 90px; top: 60px; width: 720px; height: 340px; box-sizing: border-box; }
.tr-sh { position: absolute; left: 170px; top: 430px; width: 560px; height: 40px; border-radius: 50%; background: rgba(0, 0, 0, 0.5); filter: blur(14px); }`),
      run: `MW.motionTiltReaction(q(".tr-c"), tl, 0, { shadow: ".tr-sh", cursor: ".ui-cursor" });`, duration: 2.6 },
  }),

  T("motion/tumble-in", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var p2 = gsap.parseEase("power2.out"), p1 = gsap.parseEase("power1.out"), h = el.offsetHeight / 2;
      return MW.drive(tl, at, o.duration, function (t) {
        var m = Math.min(1, t / o.move), x = -o.x * (1 - p2(m)), r = t < o.move ? o.from + (o.settle - o.from) * p1(m) : o.settle * (1 - p2(Math.min(1, (t - o.move) / (o.duration - o.move))));
        var th = r * Math.PI / 180; gsap.set(el, { x: x, y: -(h * (Math.abs(Math.cos(th)) + Math.abs(Math.sin(th))) - h), rotation: r });
      });
    },
    options: { x: "px it rolls in from the left (875)", from: "start angle (−180°)", settle: "angle when it stops moving (−24°)", move: "s of travel (0.672), power2.out", duration: "s (0.82)" },
    defaults: { x: 875, from: -180, settle: -24, move: 0.672, duration: 0.82 },
    notes: "Its lowest corner stays on the floor: lift = half the size × (|cos θ| + |sin θ|) − half the size.",
    demo: { css: `${BG}\n${FLOOR} .ti-s { position: absolute; left: 1220px; top: 660px; width: 200px; height: 200px; border: 4px dashed #3a4466; border-radius: 22px; box-sizing: border-box; }
.ti { position: absolute; left: 1220px; top: 660px; width: 200px; height: 200px; border-radius: 22px; background: linear-gradient(150deg, #ffd27a, #ff9b3d); }`,
      html: `<div class="fl"></div><div class="ti-s"></div><div class="ti"></div>`, run: `MW.motionTumbleIn(q(".ti"), tl, 0.3, {});`, duration: 2.4 },
  }),

  T("motion/counter-rotate", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var a = el.querySelector(o.outer), b = el.querySelector(o.inner), e = gsap.parseEase(o.ease);
      return MW.drive(tl, at, o.loop * o.loops, function (t) { var k = Math.floor(t / o.loop), u = e(Math.min(1, (t - k * o.loop) / o.duration)); gsap.set(a, { rotation: o.outerTurn * u }); gsap.set(b, { rotation: o.innerTurn * u }); });
    },
    options: { duration: "s (1)", outerTurn: "degrees (360)", innerTurn: "degrees (−360)", ease: "(sine.inOut)", loop: "s per cycle (2)", loops: "(2)", outer: "the outer ring", inner: "the inner shape" },
    defaults: { duration: 1, outerTurn: 360, innerTurn: -360, ease: "sine.inOut", loop: 2, loops: 2, outer: ".cr-o", inner: ".cr-i" },
    demo: { css: `${BG}\n${ST} .cr { position: relative; width: 680px; height: 680px; } .cr-o { position: absolute; inset: 0; } .cr-o i { position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; background: #3dd6f5; }
.cr-o i.big { width: 76px; height: 76px; margin: -38px 0 0 -38px; background: #ffd23d; } .cr-i { position: absolute; left: 50%; top: 50%; width: 250px; height: 250px; margin: -125px 0 0 -125px; border-radius: 40px; background: linear-gradient(150deg, #a693ff, #6a4cf0); }`,
      html: `<div class="st"><div class="cr"><div class="cr-o">${Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * 2 * Math.PI - Math.PI / 2; return `<i${i === 0 ? ` class="big"` : ""} style="left:${(340 + 310 * Math.cos(a)).toFixed(1)}px;top:${(340 + 310 * Math.sin(a)).toFixed(1)}px"></i>`; }).join("")}</div><div class="cr-i"></div></div></div>`,
      run: `MW.motionCounterRotate(q(".cr"), tl, 0.2, {});`, duration: 4.2 },
  }),

  T("motion/coin-spin", {
    uses: ["drive"],
    fn: mk(`var f = el.querySelector(o.front), b = el.querySelector(o.back), edge = document.createElement("div"), e = gsap.parseEase(o.ease), sh = o.shadow ? host.querySelector(o.shadow) : null;
edge.style.cssText = "position:absolute;pointer-events:none;border-radius:50%;opacity:0;background:" + o.edgeColor + ";left:" + el.offsetLeft + "px;top:" + el.offsetTop + "px;width:" + el.offsetWidth + "px;height:" + el.offsetHeight + "px;"; host.insertBefore(edge, el);
return MW.drive(tl, at, o.duration, function (t) {
  var a = o.turns * 2 * Math.PI * e(Math.max(0, Math.min(1, t / o.duration))), c = Math.cos(a), s = Math.sin(a), w = Math.max(0.02, Math.abs(c));
  gsap.set(el, { scaleX: w }); f.style.visibility = c >= 0 ? "visible" : "hidden"; b.style.visibility = c >= 0 ? "hidden" : "visible";
  gsap.set(edge, { scaleX: w, x: o.edge * s }); edge.style.opacity = Math.abs(s) > 0.02 ? "1" : "0"; if (sh) gsap.set(sh, { scaleX: 0.55 + 0.45 * Math.abs(c) });
});`),
    options: { turns: "(3)", duration: "s (0.9)", ease: "(power3.out)", edge: "px of edge at a quarter turn (35)", edgeColor: "", front: "front face", back: "back face", shadow: "contact shadow (scales 0.55–1)" },
    defaults: { turns: 3, duration: 0.9, ease: "power3.out", edge: 35, edgeColor: "#b07600", front: ".cs-f", back: ".cs-b", shadow: null },
    notes: "Drawn flat: width × |cos|, the face swapped at each quarter turn, the edge as an offset disc behind it.",
    demo: { css: `${BG}\n${ST} .cs-w { position: relative; width: 380px; height: 380px; } .cs { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff1b0, #ffc633 60%, #d99400); }
.cs > div { position: absolute; inset: 70px; display: grid; place-items: center; color: #9a5d00; } .cs-b { visibility: hidden; } .cs-b i { width: 200px; height: 200px; border-radius: 50%; border: 26px solid #9a5d00; box-sizing: border-box; }
.cs-sh { position: absolute; left: 50%; top: 860px; width: 340px; height: 44px; margin-left: -170px; border-radius: 50%; background: rgba(0, 0, 0, 0.55); filter: blur(12px); }`,
      html: `<div class="cs-sh"></div><div class="st"><div class="cs-w"><div class="cs"><div class="cs-f">${STAR}</div><div class="cs-b"><i></i></div></div></div></div>`,
      run: `MW.motionCoinSpin(q(".cs"), tl, 0.3, { shadow: ".cs-sh" }); MW.motionCoinSpin(q(".cs"), tl, 1.9, { shadow: ".cs-sh", turns: 2.5 });`, duration: 3.4 },
  }),

  T("shape/gyroscope", {
    uses: ["drive", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, si = gsap.parseEase("sine.inOut"), cx = 160, cy = 92;
      var ring = function (r, plane) { var pts = []; for (var i = 0; i <= 96; i++) { var a = i / 96 * 2 * Math.PI; pts.push(plane ? [0, r * Math.sin(a), r * Math.cos(a)] : [r * Math.cos(a), r * Math.sin(a), 0]); } return pts; };
      var R = [[ring(o.rings[0], 0), o.strokes[0], "#8b7bff"], [ring(o.rings[1], 1), o.strokes[1], "#3dd6f5"]];
      var proj = function (p, ry, rx) { var x = p[0] * Math.cos(ry) + p[2] * Math.sin(ry), z = -p[0] * Math.sin(ry) + p[2] * Math.cos(ry), y = p[1], y2 = y * Math.cos(rx) - z * Math.sin(rx), z2 = y * Math.sin(rx) + z * Math.cos(rx), k = o.perspective / (o.perspective + z2); return [cx + x * k, cy + y2 * k, z2]; };
      var per = o.duration + o.hold;
      return MW.drive(tl, at, o.cycles * per, function (t) {
        S.clear(); var u = Math.min(1, (t % per) / o.duration), ry = 2 * Math.PI * si(u), rx = (o.tilt * Math.PI / 180) * (u < 0.5 ? si(u * 2) : 1 - si((u - 0.5) * 2));
        var g = c.createRadialGradient(cx, 170, 2, cx, 170, 60); g.addColorStop(0, "rgba(0,0,0,0.5)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.save(); c.translate(cx, 170); c.scale(1, 0.16); c.beginPath(); c.arc(0, 0, 60, 0, 2 * Math.PI); c.restore(); c.fill();
        var segs = []; R.forEach(function (q) { var P = q[0].map(function (p) { return proj(p, ry, rx); }); for (var i = 0; i < P.length - 1; i++) segs.push({ a: P[i], b: P[i + 1], z: (P[i][2] + P[i + 1][2]) / 2, w: q[1], col: q[2] }); });
        var draw = function (back) { c.lineCap = "round"; segs.forEach(function (s) { if ((s.z > 0.01) !== back) return; c.globalAlpha = back ? 0.3 : 1; c.strokeStyle = s.col; c.lineWidth = s.w; c.beginPath(); c.moveTo(s.a[0], s.a[1]); c.lineTo(s.b[0], s.b[1]); c.stroke(); }); c.globalAlpha = 1; };
        draw(true); c.fillStyle = "#ffd23d"; c.beginPath(); c.arc(cx, cy, 5, 0, 2 * Math.PI); c.fill(); draw(false);
        var m = proj([o.rings[0] * Math.cos(-Math.PI / 4), o.rings[0] * Math.sin(-Math.PI / 4), 0], ry, rx); if (m[2] <= 0.01) { c.fillStyle = "#fff"; c.beginPath(); c.arc(m[0], m[1], 4, 0, 2 * Math.PI); c.fill(); }
      });
    },
    options: { rings: "radii in the 320 frame ([58, 44])", strokes: "([4, 3])", tilt: "degrees at the middle (55)", perspective: "(360)", duration: "s per turn (1.1)", hold: "s between turns (0.6)", cycles: "(2)" },
    defaults: { rings: [58, 44], strokes: [4, 3], tilt: 55, perspective: 360, duration: 1.1, hold: 0.6, cycles: 2 },
    demo: CV("shapeGyroscope", 3.4),
  }),

  T("motion/rotate-reveal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var e = gsap.parseEase(o.ease), pin = gsap.parseEase("power2.in"); gsap.set(el, { transformOrigin: "0% 50%" });
      return MW.drive(tl, at, o.closeAt == null ? o.duration : o.closeAt + o.close, function (t) {
        var p = e(Math.min(1, t / o.duration)); if (o.closeAt != null && t > o.closeAt) p = 1 - pin(Math.min(1, (t - o.closeAt) / o.close));
        gsap.set(el, { rotationY: o.from * (1 - p), transformPerspective: o.perspective }); el.style.opacity = String(0.2 + 0.8 * p);
      });
    },
    options: { from: "degrees (−88)", duration: "s (0.72)", ease: "(power2.out)", perspective: "px (1800)", closeAt: "s after the start to close (null)", close: "s (0.45, power2.in)" },
    defaults: { from: -88, duration: 0.72, ease: "power2.out", perspective: 1800, closeAt: null, close: 0.45 },
    demo: { ...ui(`<div class="ui-card rr"><p class="ui-h">Ưu đãi tháng này</p><p class="ui-p">Giảm 20 % cho đơn đầu tiên</p><div class="ui-btn" style="margin-top:40px">Xem ngay</div></div>`, `.rr { width: 760px; box-sizing: border-box; }`),
      run: `MW.motionRotateReveal(q(".rr"), tl, 0.3, { closeAt: 1.8 });`, duration: 2.9 },
  }),

  T("motion/squash-stretch", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var gh = o.ghost ? el.parentNode.querySelector(o.ghost) : null; gsap.set(el, { transformOrigin: "50% 100%" });
      return MW.drive(tl, at, o.period * o.bounces, function (t) {
        var m = t % o.period, s = 2 * m / o.period - 1, y = -o.height * (1 - s * s), sy = 1 + o.stretch * s * s, sx = 1 / sy, dc = Math.min(m, o.period - m);
        if (t > 0 && dc < o.contact / 2) { sx = o.squash[0]; sy = o.squash[1]; y = 0; }
        gsap.set(el, { y: y, scaleX: sx, scaleY: sy }); if (gh) gsap.set(gh, { y: y });
      });
    },
    options: { height: "px of the bounce (448)", period: "s per bounce (1.1)", stretch: "scaleY = 1 + stretch × speed² (0.22)", squash: "[scaleX, scaleY] on the floor ([1.36, 0.72])", contact: "s in the squash pose (0.11)", bounces: "(3)", ghost: "an undeformed copy that moves the same" },
    defaults: { height: 448, period: 1.1, stretch: 0.22, squash: [1.36, 0.72], contact: 0.11, bounces: 3, ghost: null },
    notes: "The recipe: a 0.3 s fall power1.in stretching to 1.2 / 0.85, 2–4 frames at 0.75 / 1.33 on the floor, a 0.3–0.55 s rise power1.out.",
    demo: { css: `${BG}\n${FLOOR} .sq { position: absolute; top: 660px; width: 200px; height: 200px; border-radius: 50%; } .sq-a { left: 720px; background: radial-gradient(circle at 35% 30%, #9af2ff, #2bb7e6 60%, #1278ad); }
.sq-g { left: 1000px; border: 4px dashed #6c778b; box-sizing: border-box; } .sq-l { position: absolute; top: 900px; width: 300px; text-align: center; font-size: 32px; color: #8f9ab3; }`,
      html: `<div class="fl"></div><div class="sq sq-a"></div><div class="sq sq-g"></div><div class="sq-l" style="left:670px">Bẹp và giãn</div><div class="sq-l" style="left:950px">Không biến dạng</div>`,
      run: `MW.motionSquashStretch(q(".sq-a"), tl, 0, { ghost: ".sq-g" });`, duration: 3.3 },
  }),

  T("motion/anticipation", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var io = gsap.parseEase("power2.inOut"); gsap.set(el, { transformOrigin: "50% 100%" });
      return MW.drive(tl, at, o.backAt == null ? o.pullTime + o.duration : o.backAt + o.back, function (t) {
        var x, sx = 1;
        if (t < o.pullTime) { var u = t / o.pullTime; x = -o.pull * io(u); sx = 1 - o.squeeze * Math.sin(Math.PI * u); }
        else if (t < o.pullTime + o.duration) { var w = (t - o.pullTime) / o.duration; x = -o.pull + (o.distance + o.pull) * io(w); sx = 1 + o.stretch * Math.sin(Math.PI * w); }
        else { x = o.distance; if (o.backAt != null && t > o.backAt) x = o.distance * (1 - io(Math.min(1, (t - o.backAt) / o.back))); }
        gsap.set(el, { x: x, scaleX: sx, scaleY: 1 / sx });
      });
    },
    options: { pull: "px back first (64; 10–20 % of the move)", pullTime: "s (0.35)", distance: "px (872)", duration: "s of the dash (0.3)", squeeze: "scaleX taken off in the pull (0.1)", stretch: "scaleX added in the dash (0.25)", backAt: "s after the start to go back (null)", back: "s (0.6)" },
    defaults: { pull: 64, pullTime: 0.35, distance: 872, duration: 0.3, squeeze: 0.1, stretch: 0.25, backAt: null, back: 0.6 },
    notes: "The recipe: about 8 px back in 0.1 s, then to the target by 0.4 s expo.out; a button scales 0.95 → 1.",
    demo: { css: `${BG}\n${FLOOR} .an-s { position: absolute; left: 1252px; top: 660px; width: 200px; height: 200px; border: 4px dashed #3a4466; border-radius: 22px; box-sizing: border-box; }
.an { position: absolute; left: 380px; top: 660px; width: 200px; height: 200px; border-radius: 22px; background: linear-gradient(150deg, #a693ff, #6a4cf0); }`,
      html: `<div class="fl"></div><div class="an-s"></div><div class="an"></div>`, run: `MW.motionAnticipation(q(".an"), tl, 0.4, { backAt: 1.7 });`, duration: 3 },
  }),

  T("motion/staging-focus", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var it = Array.prototype.slice.call(el.querySelectorAll(o.items)), hero = it[o.hero < 0 ? Math.floor(it.length / 2) : o.hero], e = gsap.parseEase(o.ease), r = gsap.parseEase("power2.inOut");
      return MW.drive(tl, at, o.hold == null ? o.duration : o.duration + o.hold + o.back, function (t) {
        var p = e(Math.min(1, t / o.duration)); if (o.hold != null && t > o.duration + o.hold) p = 1 - r(Math.min(1, (t - o.duration - o.hold) / o.back));
        it.forEach(function (x) { if (x === hero) gsap.set(x, { scale: o.from + (1 - o.from) * p }); else { gsap.set(x, { scale: o.from }); x.style.opacity = String(1 - (1 - o.dim) * p); } });
      });
    },
    options: { items: "the cards", hero: "index of the hero (−1: the middle)", from: "everyone's scale (0.9)", dim: "opacity of the rest (0.4)", duration: "s (0.3; the recipe 0.2 s power2.out)", ease: "(expo.out)", hold: "s held before going back (1.2; null: stay)", back: "s (0.3)" },
    defaults: { items: ".sf-c", hero: -1, from: 0.9, dim: 0.4, duration: 0.3, ease: "expo.out", hold: 1.2, back: 0.3 },
    demo: { css: `${BG}\n${ST} .sf { display: flex; gap: 40px; } .sf-c { width: 280px; height: 380px; border-radius: 36px; background: #1b2130; border: 3px solid #2a3350; display: grid; place-items: center; font-size: 110px; font-weight: 900; color: #3a4466; transform: scale(0.9); }
.sf-c.h { background: linear-gradient(150deg, #a693ff, #6a4cf0); color: #fff; border-color: transparent; }`,
      html: `<div class="st"><div class="sf"><div class="sf-c">1</div><div class="sf-c">2</div><div class="sf-c h">3</div><div class="sf-c">4</div><div class="sf-c">5</div></div></div>`, run: `MW.motionStagingFocus(q(".sf"), tl, 0.4, {});`, duration: 2.6 },
  }),

  T("motion/pose-vs-straight", {
    uses: ["drive", "draw", "noise", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, io = gsap.parseEase("power2.inOut"), nx = MW.noise(o.seed), ny = MW.noise(o.seed + 11), K = [[45, 70], [118, 112], [62, 158]];
      var pose = function (t) { var m = t / o.move, i = Math.floor(m), u = io(m - i), a = K[i % 3], b = K[(i + 1) % 3]; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; };
      var wand = function (t) { return [240 + o.wander[0] * nx(t * o.rates[0] + 3), 112 + o.wander[1] * ny(t * o.rates[1] + 7)]; };
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); c.strokeStyle = "#262c3a"; c.lineWidth = 1; c.beginPath(); c.moveTo(160, 30); c.lineTo(160, 190); c.stroke();
        MW.txt(c, "Tư thế chính", 80, 22, 10, "#c9d2ea", 800); MW.txt(c, "Vẽ nối tiếp", 240, 22, 10, "#c9d2ea", 800);
        K.forEach(function (k, i) { c.strokeStyle = "#3a4466"; c.lineWidth = 1.2; c.beginPath(); c.arc(k[0], k[1], 9, 0, 2 * Math.PI); c.stroke(); MW.txt(c, String(i + 1), k[0] + 14, k[1] - 9, 7, "#6c778b", 800); });
        var p = pose(t); c.fillStyle = "#8b7bff"; c.beginPath(); c.arc(p[0], p[1], 6, 0, 2 * Math.PI); c.fill();
        for (var s = o.trail; s > 0; s -= 0.025) { if (t - s < 0) continue; var q = wand(t - s); c.globalAlpha = 0.5 * (1 - s / o.trail); c.fillStyle = "#3dd6f5"; c.beginPath(); c.arc(q[0], q[1], 2.2, 0, 2 * Math.PI); c.fill(); }
        c.globalAlpha = 1; var w = wand(t); c.fillStyle = "#3dd6f5"; c.beginPath(); c.arc(w[0], w[1], 6, 0, 2 * Math.PI); c.fill();
      });
    },
    options: { move: "s per move between key poses (1), power2.inOut", wander: "[x, y] reach of the wandering dot ([75, 60])", rates: "noise rates a second ([1.3, 1.1])", trail: "s of trail (1.2)", seed: "the wander", loop: "s (6)" },
    defaults: { move: 1, wander: [75, 60], rates: [1.3, 1.1], trail: 1.2, seed: 3, loop: 6 },
    notes: "A lesson: key poses with in-betweens (UI, logos) against frame-by-frame motion (particles, liquids); the wander is seeded noise, a pure function of time.",
    demo: CV("motionPoseVsStraight", 6),
  }),

  T("motion/follow-overlap", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var sp = MW.spring(o.k, o.c), host = el.parentNode, sh = o.shadow ? host.querySelector(o.shadow) : null, parts = o.parts.map(function (p) { return [el.querySelector(p[0]), p[1]]; }).filter(function (p) { return p[0]; });
      var Y = function (t) { return o.y * (1 - (t > 0 ? sp.at(t) : 0)); }, end = sp.duration + Math.max.apply(null, o.parts.map(function (p) { return p[1]; }).concat([o.shadowDelay]));
      return MW.drive(tl, at, o.exitAt == null ? end : o.exitAt + o.exit, function (t) {
        var x = o.exitAt != null && t > o.exitAt ? Math.min(1, (t - o.exitAt) / o.exit) : 0, lift = -o.rise * gsap.parseEase("power2.in")(x), y = Y(t);
        gsap.set(el, { y: y + lift }); el.style.opacity = String(Math.min(1, t / 0.12) * (1 - x));
        parts.forEach(function (p) { gsap.set(p[0], { y: Y(t - p[1]) - y }); });
        if (sh) { var v = t - o.shadowDelay > 0 ? sp.at(t - o.shadowDelay) : 0; gsap.set(sh, { scaleX: 0.6 + 0.4 * v }); sh.style.opacity = String(Math.min(1, v) * (1 - x)); }
      });
    },
    options: { k: "spring stiffness (170)", c: "damping (18): about 5 % overshoot", y: "px it drops from (−240)", parts: "[[selector, delay s], ...] inside the card", shadow: "its shadow", shadowDelay: "s (0.05)", exitAt: "s after the start to leave (null)", rise: "px up on the way out (120)", exit: "s (0.3)" },
    defaults: { k: 170, c: 18, y: -240, parts: [[".fo-t", 0.06], [".fo-l1", 0.1], [".fo-l2", 0.14]], shadow: null, shadowDelay: 0.05, exitAt: null, rise: 120, exit: 0.3 },
    demo: { ...ui(`<div class="fo"><div class="fo-sh"></div><div class="ui-card fo-c"><div class="fo-t">Lịch quay tuần này</div><div class="fo-l1">Thứ hai: phỏng vấn khách mời</div><div class="fo-l2">Thứ tư: quay cảnh ngoài trời</div></div></div>`,
      `.fo { position: relative; width: 900px; height: 520px; } .fo-c { position: absolute; left: 60px; top: 40px; width: 780px; box-sizing: border-box; } .fo-t { font-size: 52px; font-weight: 800; margin-bottom: 30px; padding-bottom: 24px; border-bottom: 3px solid #262c3a; }
.fo-l1, .fo-l2 { font-size: 34px; color: #9aa3b8; margin-top: 14px; } .fo-sh { position: absolute; left: 140px; top: 440px; width: 620px; height: 50px; border-radius: 50%; background: rgba(0, 0, 0, 0.55); filter: blur(16px); }`),
      run: `MW.motionFollowOverlap(q(".fo-c"), tl, 0.3, { shadow: ".fo-sh", exitAt: 1.9 });`, duration: 2.7 },
  }),

  T("motion/slow-in-out", {
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, e = gsap.parseEase(o.ease), x0 = 40, x1 = 40 + o.distance;
      var P = function (t, f) { var u = Math.max(0, Math.min(1, (t - o.start) / o.duration)), b = Math.max(0, Math.min(1, (t - o.start - o.duration - o.hold) / o.duration)); return x0 + (x1 - x0) * (f(u) - f(b)); };
      var lin = function (u) { return u; };
      return MW.drive(tl, at, o.start + 2 * o.duration + o.hold + 0.3, function (t) {
        S.clear(); [[66, lin, "#6c778b", "Đều tốc: trông máy móc"], [140, e, "#8b7bff", "Chậm vào, chậm ra: tự nhiên"]].forEach(function (r) {
          MW.txt(c, r[3], x0, r[0] - 22, 9, "#c9d2ea", 700, "left"); c.strokeStyle = "#262c3a"; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, r[0]); c.lineTo(x1, r[0]); c.stroke();
          for (var i = 0; i <= 10; i++) { var tx = x0 + (x1 - x0) * r[1](i / 10); c.fillStyle = "#3a4466"; c.fillRect(tx - 0.6, r[0] + 10, 1.2, 8); }
          c.fillStyle = r[2]; c.beginPath(); c.arc(P(t, r[1]), r[0], 8, 0, 2 * Math.PI); c.fill();
        });
      });
    },
    options: { duration: "s (1.3; the recipe 1.2)", distance: "units in the 320 frame (240)", ease: "(power2.inOut)", start: "s (0.3)", hold: "s before going back (0.6)" },
    defaults: { duration: 1.3, distance: 240, ease: "power2.inOut", start: 0.3, hold: 0.6 },
    notes: "Rule: entrances ease out, exits ease in, moves on screen ease in and out. The ticks show where the dot is at 11 equal steps of time.",
    demo: CV("motionSlowInOut", 3.8),
  }),

  T("motion/arc-move", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var e = gsap.parseEase(o.ease), L = Math.hypot(o.dx, o.dy) || 1, nx = -o.dy / L, ny = o.dx / L, cx = o.dx / 2 + nx * 2 * o.bend, cy = o.dy / 2 + ny * 2 * o.bend, cmp = o.compare ? el.parentNode.querySelector(o.compare) : null;
      var pt = function (u) { var b = 2 * (1 - u) * u, q = u * u; return [b * cx + q * o.dx, b * cy + q * o.dy]; };
      return MW.drive(tl, at, o.backAt == null ? o.duration : o.backAt + o.duration, function (t) {
        var u = e(Math.min(1, t / o.duration)); if (o.backAt != null && t > o.backAt) u = 1 - e(Math.min(1, (t - o.backAt) / o.duration));
        var p = pt(u); gsap.set(el, { x: p[0], y: p[1] }); if (cmp) gsap.set(cmp, { x: o.dx * u, y: o.dy * u });
      });
    },
    options: { dx: "px to the end (−1080)", dy: "px (−540)", bend: "px the mid-point sits off the straight line (270; the recipe 10–20)", duration: "s (1.2; the recipe 0.9 s sine.inOut)", ease: "(power2.inOut)", compare: "a second element that goes straight", backAt: "s after the start to come back (null)" },
    defaults: { dx: -1080, dy: -540, bend: 270, duration: 1.2, ease: "power2.inOut", compare: null, backAt: null },
    demo: { css: `${BG}\n.am { position: absolute; left: 1494px; top: 804px; width: 120px; height: 120px; border-radius: 50%; } .am-a { background: radial-gradient(circle at 35% 30%, #c4b8ff, #8b7bff 60%, #5b46d8); z-index: 2; } .am-b { background: #3a4466; }
.am-g { position: absolute; inset: 0; } .am-l { position: absolute; font-size: 32px; color: #8f9ab3; }`,
      html: `<svg class="am-g" viewBox="0 0 1920 1080"><path d="M1554 864 Q1255 111 474 324" fill="none" stroke="#3a3566" stroke-width="4" stroke-dasharray="14 14"/><path d="M1554 864 L474 324" fill="none" stroke="#262c3a" stroke-width="4" stroke-dasharray="14 14"/></svg>
<div class="am am-b"></div><div class="am am-a"></div><div class="am-l" style="left:960px;top:250px;color:#a99bff">Theo cung</div><div class="am-l" style="left:1060px;top:680px">Đường thẳng</div>`,
      run: `MW.motionArcMove(q(".am-a"), tl, 0.3, { compare: ".am-b", backAt: 2 });`, duration: 3.6 },
  }),

  T("motion/secondary-action", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var ic = el.querySelector(o.icon), out = gsap.parseEase(o.ease), bo = gsap.parseEase("back.out(1.7)"), st = [];
      for (var i = 0; i < o.sparkles; i++) { var s = document.createElement("div"); s.style.cssText = "position:absolute;width:" + (i % 2 ? 34 : 48) + "px;height:" + (i % 2 ? 34 : 48) + "px;left:" + (8 + 80 * i / Math.max(1, o.sparkles - 1)) + "%;top:" + (-14 - (i % 3) * 6) + "%;color:" + o.accent + ";opacity:0;pointer-events:none;";
        s.innerHTML = '<svg viewBox="-10 -10 20 20" width="100%" height="100%"><path d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z" fill="currentColor"/></svg>'; el.appendChild(s); st.push(s); }
      return MW.drive(tl, at, Math.max(o.duration, o.delay + o.iconTime, 0.2 + o.sparkles * 0.06 + 0.5), function (t) {
        gsap.set(el, { y: o.rise * (1 - out(Math.min(1, t / o.duration))) }); el.style.opacity = String(Math.min(1, t / 0.15));
        if (ic) gsap.set(ic, { rotation: o.turn * bo(Math.max(0, Math.min(1, (t - o.delay) / o.iconTime))) });
        st.forEach(function (s, i) { var u = Math.max(0, Math.min(1, (t - 0.2 - i * 0.06) / 0.5)); gsap.set(s, { y: -o.drift * u }); s.style.opacity = u > 0 && u < 1 ? String(Math.sin(Math.PI * u)) : "0"; });
      });
    },
    options: { rise: "px the card rises (520)", duration: "s (0.6)", ease: "(expo.out)", icon: "the icon that turns", turn: "degrees (90)", delay: "s behind the card (0.1)", iconTime: "s (0.6, back.out)", sparkles: "(6)", drift: "px up (72)", accent: "sparkle colour" },
    defaults: { rise: 520, duration: 0.6, ease: "expo.out", icon: ".sa-i", turn: 90, delay: 0.1, iconTime: 0.6, sparkles: 6, drift: 72, accent: "#ffd23d" },
    demo: { ...ui(`<div class="ui-card sa"><div class="sa-i"><i></i><i></i></div><p class="ui-h">Thêm cảnh mới</p><p class="ui-p">Kéo thả để sắp xếp</p></div>`,
      `.sa { width: 680px; box-sizing: border-box; overflow: visible; } .sa-i { position: relative; width: 120px; height: 120px; border-radius: 34px; background: linear-gradient(160deg, #a693ff, #6a4cf0); margin-bottom: 34px; }
.sa-i i { position: absolute; left: 50%; top: 50%; width: 56px; height: 12px; margin: -6px 0 0 -28px; border-radius: 6px; background: #fff; } .sa-i i + i { transform: rotate(90deg); }`),
      run: `MW.motionSecondaryAction(q(".sa"), tl, 0.3, {});`, duration: 2.2 },
  }),

  T("motion/timing-weight", {
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, bo = gsap.parseEase("back.out(1.7)"), ex = gsap.parseEase("expo.out");
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var f = 1 - Math.max(0, Math.min(1, (t - (o.loop - 0.45)) / 0.3)), b = bo(Math.max(0, Math.min(1, (t - o.start) / o.small))), p = ex(Math.max(0, Math.min(1, (t - o.start) / o.large)));
        c.globalAlpha = f; c.save(); c.translate(64, 96); c.scale(b, b); c.fillStyle = "#ff5d8f"; c.beginPath(); c.arc(0, 0, 14, 0, 2 * Math.PI); c.fill(); MW.txt(c, "3", 0, 0.5, 13, "#fff", 900); c.restore();
        MW.txt(c, o.small * 1000 + "ms", 64, 128, 9, "#ff8fb1", 800);
        c.globalAlpha = f * Math.min(1, p * 1.6); var x = 118 + 240 * (1 - p); MW.rr(c, x, 36, 180, 120, 12); c.fillStyle = "#1b2130"; c.fill(); c.strokeStyle = "#8b7bff"; c.lineWidth = 2; c.stroke();
        c.fillStyle = "#2a3350"; MW.rr(c, x + 14, 52, 90, 10, 5); c.fill(); MW.rr(c, x + 14, 70, 140, 8, 4); c.fill(); MW.rr(c, x + 14, 84, 120, 8, 4); c.fill(); MW.txt(c, o.large * 1000 + "ms", x + 90, 132, 12, "#a99bff", 800);
        c.globalAlpha = 1; MW.txt(c, "Nhỏ: nhanh · Lớn: chậm", 160, 180, 9, "#6c778b", 700);
      });
    },
    options: { small: "s for the badge (0.15)", large: "s for the panel (0.5)", start: "s (0.4)", loop: "s (2.6)" }, defaults: { small: 0.15, large: 0.5, start: 0.4, loop: 2.6 },
    notes: "Rule: small 0.1–0.25 s, medium 0.2–0.4 s, large 0.4–0.8 s.",
    demo: CV("motionTimingWeight", 2.6),
  }),

  T("motion/exaggerated-pop", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var e = MW.ez(o.ease), ck = o.check ? el.querySelector(o.check) : null, L = ck && ck.getTotalLength ? ck.getTotalLength() : 0, p2 = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in");
      if (ck) ck.style.strokeDasharray = String(L);
      return MW.drive(tl, at, o.exitAt == null ? Math.max(o.duration, o.checkAt + o.checkTime) : o.exitAt + 0.3, function (t) {
        var s = e(Math.min(1, t / o.duration)); if (o.exitAt != null && t > o.exitAt) s *= 1 - pin(Math.min(1, (t - o.exitAt) / 0.3));
        gsap.set(el, { scale: s }); if (ck) ck.style.strokeDashoffset = String(L * (1 - p2(Math.max(0, Math.min(1, (t - o.checkAt) / o.checkTime)))));
      });
    },
    options: { duration: "s (0.5)", ease: "(cubic-bezier(.34,1.56,.64,1): peaks near 1.1)", check: "a path drawn after it (the check)", checkAt: "s (0.25)", checkTime: "s (0.35, power2.out)", exitAt: "s after the start to shrink away (null)" },
    defaults: { duration: 0.5, ease: "cubic-bezier(.34,1.56,.64,1)", check: "path", checkAt: 0.25, checkTime: 0.35, exitAt: null },
    notes: "The recipe: 0 → 1.15 at 0.3 s → 1 at 0.45 s (back.out). Rule: overshoot 10–20 %.",
    demo: { css: `${BG}\n${ST} .ep { width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #7af0b0, #22c06e 60%, #128a4c); display: grid; place-items: center; box-shadow: 0 40px 120px rgba(34, 192, 110, 0.35); transform: scale(0); }
.ep-l { position: absolute; left: 0; right: 0; top: 820px; text-align: center; font-size: 44px; font-weight: 700; }`,
      html: `<div class="st"><div class="ep"><svg viewBox="0 0 100 100" width="230" height="230"><path d="M24 52 L43 70 L77 33" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div><div class="ep-l">Đã lưu xong</div>`,
      run: `MW.motionExaggeratedPop(q(".ep"), tl, 0.3, { exitAt: 2 });`, duration: 2.8 },
  }),

  T("motion/depth-tilt", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var sh = o.shadow ? el.parentNode.querySelector(o.shadow) : null;
      return MW.drive(tl, at, o.period * o.cycles, function (t) { var a = o.angle * Math.sin(2 * Math.PI * t / o.period); gsap.set(el, { rotationY: a, transformPerspective: o.perspective }); if (sh) gsap.set(sh, { x: -o.shift * a * Math.PI / 180 }); });
    },
    options: { angle: "degrees each way (8)", period: "s (3)", cycles: "(1.5)", perspective: "px (1400)", shadow: "the shadow under it", shift: "px of shadow per radian, the other way (600)" },
    defaults: { angle: 8, period: 3, cycles: 1.5, perspective: 1400, shadow: null, shift: 600 },
    demo: { ...ui(`<div class="dt"><div class="dt-sh"></div><div class="ui-card dt-c"><p class="ui-h">Thẻ có độ dày</p><p class="ui-p">Bóng đổ trượt ngược chiều nghiêng</p></div></div>`,
      `.dt { position: relative; width: 900px; height: 560px; } .dt-c { position: absolute; left: 90px; top: 60px; width: 720px; height: 360px; box-sizing: border-box; } .dt-sh { position: absolute; left: 150px; top: 470px; width: 600px; height: 56px; border-radius: 50%; background: rgba(0, 0, 0, 0.6); filter: blur(18px); }`),
      run: `MW.motionDepthTilt(q(".dt-c"), tl, 0, { shadow: ".dt-sh" });`, duration: 4.5 },
  }),

  T("ui/toggle-appeal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var kn = el.querySelector(o.knob), lb = o.label ? el.parentNode.querySelector(o.label) : null, p2 = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), mix = gsap.utils.interpolate(o.off, o.on), w0 = kn.offsetWidth;
      return MW.drive(tl, at, o.period * o.flips, function (t) {
        var k = Math.floor(t / o.period), u = t - k * o.period, from = k % 2 === 1, m = Math.min(1, u / o.knobTime), pos = from ? 1 - p2(m) : p2(m), cv = io(Math.max(0, Math.min(1, (u - o.colorDelay) / o.knobTime))), ex = o.stretch * Math.sin(Math.PI * m);
        gsap.set(kn, { x: o.travel * pos - ex / 2, width: w0 + ex }); el.style.background = mix(from ? 1 - cv : cv);
        if (lb) { var on = u >= o.colorDelay + o.knobTime / 2 ? !from : from; lb.textContent = on ? o.onText : o.offText; lb.style.color = on ? o.on : "#8f9ab3"; }
      });
    },
    options: { knob: "", label: "the ON / OFF label", travel: "px (280)", knobTime: "s (0.18, power2.out)", colorDelay: "s the colour and label follow (0.04)", stretch: "px wider mid-move (32)", period: "s between flips (1)", flips: "(4)", on: "track colour on", off: "track colour off", onText: "", offText: "" },
    defaults: { knob: ".tg-k", label: null, travel: 280, knobTime: 0.18, colorDelay: 0.04, stretch: 32, period: 1, flips: 4, on: "#8b7bff", off: "#2a3142", onText: "BẬT", offText: "TẮT" },
    demo: { css: `${BG}\n${ST} .tg-w { display: flex; flex-direction: column; align-items: center; gap: 60px; } .tg { position: relative; width: 480px; height: 200px; border-radius: 100px; background: #2a3142; }
.tg-k { position: absolute; left: 32px; top: 32px; width: 136px; height: 136px; border-radius: 68px; background: #fff; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35); } .tg-l { font-size: 64px; font-weight: 900; letter-spacing: 0.08em; color: #8f9ab3; }`,
      html: `<div class="st"><div class="tg-w"><div class="tg"><div class="tg-k"></div></div><div class="tg-l">TẮT</div></div></div>`, run: `MW.uiToggleAppeal(q(".tg"), tl, 0.3, { label: ".tg-l" });`, duration: 4.3 },
  }),

  T("motion/domino-chain", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var ds = Array.prototype.slice.call(el.querySelectorAll(o.items)), pin = gsap.parseEase("power2.in"), io = gsap.parseEase("power2.inOut"); ds.forEach(function (d) { gsap.set(d, { transformOrigin: "100% 100%" }); });
      var fall = (ds.length - 1) * o.stagger + o.each;
      return MW.drive(tl, at, o.standAt == null ? fall : o.standAt + o.stand, function (t) {
        var up = o.standAt != null && t > o.standAt ? io(Math.min(1, (t - o.standAt) / o.stand)) : 0;
        ds.forEach(function (d, i) { gsap.set(d, { rotation: o.angle * pin(Math.max(0, Math.min(1, (t - i * o.stagger) / o.each))) * (1 - up) }); });
      });
    },
    options: { items: "the dominoes, in order", angle: "degrees (66)", each: "s per fall (0.25, power2.in)", stagger: "s (0.12)", standAt: "s after the start to stand back up (null)", stand: "s (0.3)" },
    defaults: { items: ".dm", angle: 66, each: 0.25, stagger: 0.12, standAt: null, stand: 0.3 },
    demo: { css: `${BG}\n${FLOOR} .dm { position: absolute; top: 610px; width: 40px; height: 250px; border-radius: 8px; background: linear-gradient(180deg, #c4b8ff, #8b7bff); }`,
      html: `<div class="fl"></div>${Array.from({ length: 9 }, (_, i) => `<div class="dm" style="left:${340 + 150 * i}px"></div>`).join("")}`, run: `MW.motionDominoChain(q("#demo"), tl, 0.3, { standAt: 2.1 });`, duration: 2.8 },
  }),

  T("motion/stagger-jitter", {
    uses: ["drive", "rand", "spring"],
    fn: function (el, tl, at, o) {
      var it = Array.prototype.slice.call(el.querySelectorAll(o.items)), sp = MW.spring(o.k, o.c), r = MW.rand(o.seed), J = it.map(function () { return [(r() * 2 - 1) * o.jitter, 1 + (r() * 2 - 1) * o.size]; });
      var end = o.jitter * 2 + (it.length - 1) * o.stagger + sp.duration;
      return MW.drive(tl, at, o.exitAt == null ? end : o.exitAt + 0.3, function (t) {
        var f = o.exitAt != null && t > o.exitAt ? 1 - Math.min(1, (t - o.exitAt) / 0.3) : 1;
        it.forEach(function (e, i) { var s = t - (o.jitter + i * o.stagger + J[i][0]), v = s > 0 ? sp.at(s) : 0; gsap.set(e, { y: o.rise * (1 - v), scale: J[i][1] }); e.style.opacity = String((s > 0 ? Math.min(1, s / 0.12) : 0) * f); });
      });
    },
    options: { items: "", k: "spring stiffness (220)", c: "damping (20)", stagger: "s (0.07)", jitter: "± s per item (0.045; the recipe 0.016–0.033)", size: "± scale (0.04; the recipe 0.03)", rise: "px (160)", seed: "(7)", exitAt: "s after the start to fade (null)" },
    defaults: { items: ".sj", k: 220, c: 20, stagger: 0.07, jitter: 0.045, size: 0.04, rise: 160, seed: 7, exitAt: null },
    demo: { css: `${BG}\n.sj-r { position: absolute; left: 0; right: 0; display: flex; justify-content: center; gap: 44px; } .sj { width: 150px; height: 150px; border-radius: 30px; opacity: 0; }
.sj-a .sj { background: #3a4466; } .sj-b .sj { background: linear-gradient(150deg, #a693ff, #6a4cf0); } .sj-c { position: absolute; left: 260px; font-size: 34px; font-weight: 700; color: #8f9ab3; }`,
      html: `<div class="sj-c" style="top:180px">Đều nhau: máy móc</div><div class="sj-r sj-a" style="top:250px">${"<div class=\"sj\"></div>".repeat(7)}</div><div class="sj-c" style="top:560px">Lệch nhịp: tự nhiên</div><div class="sj-r sj-b" style="top:630px">${"<div class=\"sj\"></div>".repeat(7)}</div>`,
      run: `MW.motionStaggerJitter(q(".sj-a"), tl, 0.3, { jitter: 0, size: 0, exitAt: 2.4 }); MW.motionStaggerJitter(q(".sj-b"), tl, 0.3, { exitAt: 2.4 });`, duration: 3 },
  }),

  T("motion/three-layers", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var hero = el.querySelector(o.hero), sec = el.querySelector(o.second), ex = gsap.parseEase("expo.out"), p2 = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), r = MW.rand(o.seed), W = el.clientWidth, Hh = el.clientHeight, dots = [];
      for (var i = 0; i < o.dots; i++) { var d = document.createElement("div"), z = 14 + r() * 12; d.style.cssText = "position:absolute;left:0;top:0;border-radius:50%;width:" + z + "px;height:" + z + "px;background:" + o.dotColor + ";"; el.insertBefore(d, el.firstChild); dots.push({ d: d, x: r() * W, y: r() * Hh, v: o.drift[0] + r() * (o.drift[1] - o.drift[0]) }); }
      var c = function (v) { return Math.max(0, Math.min(1, v)); }, back = o.start + o.heroTime + o.hold;
      return MW.drive(tl, at, o.loop, function (t) {
        dots.forEach(function (q) { gsap.set(q.d, { x: ((q.x + q.v * t) % W + W) % W, y: q.y }); });
        var hp = ex(c((t - o.start) / o.heroTime)) - io(c((t - back) / 0.6)), sp = p2(c((t - o.start - o.delay) / o.secTime)) - io(c((t - back - o.delay) / 0.6));
        gsap.set(hero, { x: o.heroMove * hp }); gsap.set(sec, { x: o.secMove * sp });
      });
    },
    options: { hero: "the main subject", second: "the secondary one", heroMove: "px (550)", heroTime: "s (0.6, expo.out)", secMove: "px (150, about 30 % of the hero)", secTime: "s (0.55, power2.out)", delay: "s behind the hero (0.15)", hold: "s before both return (0.8)", start: "s (0.3)", dots: "background dots (14)", drift: "[min, max] px a second ([40, 80])", dotColor: "", seed: "(5)", loop: "s (3.4)" },
    defaults: { hero: ".tl-h", second: ".tl-s", heroMove: 550, heroTime: 0.6, secMove: 150, secTime: 0.55, delay: 0.15, hold: 0.8, start: 0.3, dots: 14, drift: [40, 80], dotColor: "rgba(233,235,243,0.16)", seed: 5, loop: 3.4 },
    notes: "Rule: at most two or three things move at once.",
    demo: { css: `${BG}\n.tl { position: absolute; inset: 0; overflow: hidden; } .tl-h { position: absolute; left: 520px; top: 400px; width: 280px; height: 280px; border-radius: 44px; background: linear-gradient(150deg, #a693ff, #6a4cf0); }
.tl-s { position: absolute; left: 1150px; top: 480px; width: 120px; height: 120px; border-radius: 50%; background: #3dd6f5; }`,
      html: `<div class="tl"><div class="tl-h"></div><div class="tl-s"></div></div>`, run: `MW.motionThreeLayers(q(".tl"), tl, 0, {});`, duration: 3.4 },
  }),

  T("motion/no-dead-frames", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var ti = el.querySelector(o.title), r = MW.rand(o.seed), W = el.clientWidth, Hh = el.clientHeight, dots = [], p2 = gsap.parseEase("power2.out"), pin = gsap.parseEase("power2.in");
      for (var i = 0; i < o.dots; i++) { var d = document.createElement("div"), z = 8 + r() * 10; d.style.cssText = "position:absolute;left:0;top:0;border-radius:50%;width:" + z + "px;height:" + z + "px;background:" + o.dotColor + ";"; el.insertBefore(d, el.firstChild); dots.push({ d: d, x: r() * W, y: r() * Hh, v: o.drift[0] + r() * (o.drift[1] - o.drift[0]) }); }
      return MW.drive(tl, at, o.loop, function (t) {
        dots.forEach(function (q) { gsap.set(q.d, { x: q.x, y: ((q.y - q.v * t) % Hh + Hh) % Hh }); });
        var e = p2(Math.min(1, t / o.enter)), x = t > o.loop - o.exit ? 1 - pin(Math.min(1, (t - (o.loop - o.exit)) / o.exit)) : 1, b = 1 + o.breathe * Math.sin(2 * Math.PI * t / o.period);
        gsap.set(ti, { scale: b * (0.94 + 0.06 * e), y: 40 * (1 - e) }); ti.style.opacity = String(e * x);
      });
    },
    options: { title: "the held text", breathe: "± scale (0.015)", period: "s (2)", dots: "(18)", drift: "[min, max] px a second up ([55, 110])", enter: "s (0.6)", exit: "s (0.6)", dotColor: "", seed: "(9)", loop: "s (4)" },
    defaults: { title: ".nd-t", breathe: 0.015, period: 2, dots: 18, drift: [55, 110], enter: 0.6, exit: 0.6, dotColor: "rgba(169,155,255,0.22)", seed: 9, loop: 4 },
    notes: "Rule: no fully still frame; holds take 40–60 % of the film.",
    demo: { css: `${BG}\n.nd { position: absolute; inset: 0; overflow: hidden; display: grid; place-items: center; } .nd-t { font-size: 300px; font-weight: 900; letter-spacing: -0.02em; text-align: center; line-height: 1; }
.nd-t span { display: block; font-size: 40px; font-weight: 600; color: #8f9ab3; letter-spacing: 0; margin-top: 40px; }`,
      html: `<div class="nd"><div class="nd-t">GIỮ<span>Không khung hình nào đứng im</span></div></div>`, run: `MW.motionNoDeadFrames(q(".nd"), tl, 0, {});`, duration: 4 },
  }),

  T("motion/counter-motion", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var hero = el.querySelector(o.hero), bg = el.querySelector(o.bg), e = gsap.parseEase(o.ease), pin = gsap.parseEase("power2.in");
      return MW.drive(tl, at, o.exitAt == null ? o.duration : o.exitAt + o.exit, function (t) {
        var p = e(Math.min(1, t / o.duration)); if (o.exitAt != null && t > o.exitAt) p = 1 - pin(Math.min(1, (t - o.exitAt) / o.exit));
        gsap.set(hero, { x: o.heroX * (1 - p) }); hero.style.opacity = String(Math.min(1, p * 3)); gsap.set(bg, { x: o.bgX * p });
      });
    },
    options: { hero: "", bg: "the background layer", heroX: "px it enters from (−800)", bgX: "px the background moves the other way (200: 20–30 % of the hero)", duration: "s (0.8)", ease: "(expo.out; the recipe power2.out)", exitAt: "s after the start to reverse (null)", exit: "s (0.4, power2.in)" },
    defaults: { hero: ".cm-h", bg: ".cm-bg", heroX: -800, bgX: 200, duration: 0.8, ease: "expo.out", exitAt: null, exit: 0.4 },
    demo: { css: `${BG}\n.cm { position: absolute; inset: 0; overflow: hidden; } .cm-bg { position: absolute; left: -400px; right: -400px; top: 0; bottom: 0; background: repeating-linear-gradient(-55deg, #141a2a 0 60px, #1d2438 60px 120px); }
.cm-h { position: absolute; left: 50%; top: 50%; width: 760px; height: 400px; margin: -200px 0 0 -380px; border-radius: 44px; background: linear-gradient(150deg, #a693ff, #6a4cf0); display: grid; place-items: center; font-size: 92px; font-weight: 900; box-shadow: 0 50px 120px rgba(0, 0, 0, 0.45); }`,
      html: `<div class="cm"><div class="cm-bg"></div><div class="cm-h">RA MẮT</div></div>`, run: `MW.motionCounterMotion(q(".cm"), tl, 0.3, { exitAt: 1.9 });`, duration: 2.8 },
  }),
];

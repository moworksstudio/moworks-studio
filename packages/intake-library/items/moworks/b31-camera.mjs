// Camera (batch 3.1): camera moves as a vocabulary, written here. Called on the camera root; its layers carry data-depth (far 0.2, middle
// 0.55, subject 1, foreground 1.6) and move by their depth, so a push, truck or crane shows parallax and a pan or a lens zoom does not.
// Distances are in film pixels (a 320 px frame × 3).
import { T } from "../../moworks/define.mjs";
import { layers, demo, C } from "../../moworks/stages.mjs";
import { LANDSCAPE } from "../../demo-media.mjs";

const CAM = (run, duration = 3.2, opts = {}, css = "") => demo(layers(opts), run, duration, css);
const L = "[data-depth]";

export default [
  T("motion/camera-push-in", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll(o.layers)), ease = gsap.parseEase(o.ease);
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration);
        Ls.forEach(function (l) { var d = o.flat ? 1 : parseFloat(l.getAttribute("data-depth") || "1"); gsap.set(l, { scale: 1 + (o.scale - 1) * d * p }); });
      });
    },
    options: { duration: "s (1.6)", scale: "the subject's scale at the end (1.12); a layer scales by 0.12 × its depth", flat: "true: every layer the same (a lens zoom)", layers: "selector of the layers (with data-depth)", ease: "power2.inOut" },
    defaults: { duration: 1.6, scale: 1.12, flat: false, layers: L, ease: "power2.inOut" },
    demo: CAM(`MW.motionCameraPushIn(q(".tk-cam"), tl, 0.6, { duration: 2.2, scale: 1.2 });`),
  }),

  T("motion/camera-pull-out", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll(o.layers)), ease = gsap.parseEase(o.ease);
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration);
        Ls.forEach(function (l) { var d = parseFloat(l.getAttribute("data-depth") || "1"); gsap.set(l, { scale: 1 + (o.scale - 1) * d * (1 - p) }); });
      });
    },
    options: { duration: "s (1.6)", scale: "the subject's scale at the start (1.3); a layer starts at 1 + 0.3 × its depth", layers: "selector of the layers", ease: "power2.inOut" },
    defaults: { duration: 1.6, scale: 1.3, layers: L, ease: "power2.inOut" },
    demo: CAM(`MW.motionCameraPullOut(q(".tk-cam"), tl, 0.6, { duration: 2.2 });`),
  }),

  T("motion/camera-truck", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll(o.layers)), ease = gsap.parseEase(o.ease);
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration);
        Ls.forEach(function (l) { var d = parseFloat(l.getAttribute("data-depth") || "1"); gsap.set(l, { x: -o.distance * d * p }); });
      });
    },
    options: { duration: "s (2)", distance: "px at the subject's depth (360; 120 on the small frame); a layer moves distance × its depth", layers: "selector of the layers", ease: "sine.inOut" },
    defaults: { duration: 2, distance: 360, layers: L, ease: "sine.inOut" },
    demo: CAM(`MW.motionCameraTruck(q(".tk-cam"), tl, 0.5, { duration: 2.4 });`),
  }),

  T("motion/camera-pan", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll(o.layers)), ease = gsap.parseEase(o.ease);
      if (o.angle) el.parentNode.style.perspective = "2200px";
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration);
        // the camera turns: every layer shifts by the same amount (no parallax), or the whole box turns a few degrees
        if (o.angle) gsap.set(el, { rotationY: o.angle * p });
        else Ls.forEach(function (l) { gsap.set(l, { x: o.distance * (p - 0.5) }); });
      });
    },
    options: { duration: "s (2; the small demo 2.6)", distance: "px every layer travels, centred (360)", angle: "degrees instead: the box turns (≤ 6; 0 = shift)", layers: "selector of the layers", ease: "sine.inOut" },
    defaults: { duration: 2, distance: 360, angle: 0, layers: L, ease: "sine.inOut" },
    demo: CAM(`MW.motionCameraPan(q(".tk-cam"), tl, 0.3, { duration: 2.6 });`),
  }),

  T("motion/camera-pedestal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll(o.layers)), ease = gsap.parseEase(o.ease);
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration);
        Ls.forEach(function (l) { var d = parseFloat(l.getAttribute("data-depth") || "1"); gsap.set(l, { y: -o.distance * d * p }); });
      });
    },
    options: { duration: "s (2)", distance: "px at the subject's depth (240; 80 on the small frame); negative to go the other way", layers: "selector of the layers", ease: "sine.inOut" },
    defaults: { duration: 2, distance: 240, layers: L, ease: "sine.inOut" },
    demo: CAM(`MW.motionCameraPedestal(q(".tk-cam"), tl, 0.5, { duration: 2.4 });`),
  }),

  T("motion/camera-roll", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = gsap.parseEase("power2.out");
      return MW.drive(tl, at, o.decay + o.attack, function (t) {
        var r = t < o.attack ? o.angle * (t / o.attack) : o.angle * (1 - out(Math.min(1, (t - o.attack) / o.decay)));
        gsap.set(el, { rotation: t >= o.attack + o.decay ? 0 : r, scale: o.overscan });
      });
    },
    options: { angle: "degrees at the hit (0.9)", attack: "s to reach it (0.06)", decay: "s back to level, ease-out cubic (0.24)", overscan: "scale that hides the edges (1.04)" },
    defaults: { angle: 0.9, attack: 0.06, decay: 0.24, overscan: 1.04 },
    notes: "Call it once per hit. The demo exaggerates the angle (2.5°) so the roll reads on a small preview, as the small demo does.",
    demo: CAM(`[0.6, 1.5, 2.4].forEach(function (h, i) { MW.motionCameraRoll(q(".tk-cam"), tl, h, { angle: i % 2 ? -2.5 : 2.5 }); });`, 3.2),
  }),

  T("motion/camera-flat-zoom", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll(o.layers)), ease = gsap.parseEase(o.ease);
      return MW.drive(tl, at, o.duration, function (t) { var s = 1 + (o.scale - 1) * ease(t / o.duration); Ls.forEach(function (l) { gsap.set(l, { scale: s }); }); });
    },
    options: { duration: "s (1.6; the small demo 2.3)", scale: "every layer's end scale (1.2; demo 1.3)", layers: "selector of the layers", ease: "power2.inOut" },
    defaults: { duration: 1.6, scale: 1.2, layers: L, ease: "power2.inOut" },
    demo: CAM(`MW.motionCameraFlatZoom(q(".tk-cam"), tl, 0.4, { duration: 2.3, scale: 1.3 });`),
  }),

  T("motion/dolly-zoom", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll(o.layers)), ease = gsap.parseEase(o.ease), minD = 1;
      Ls.forEach(function (l) { minD = Math.min(minD, parseFloat(l.getAttribute("data-depth") || "1")); });
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration);
        // the subject (depth 1) keeps its size; layers behind it shrink toward bgScale (the farthest reaches it), layers in front grow
        Ls.forEach(function (l) { var d = parseFloat(l.getAttribute("data-depth") || "1"), w = (d - 1) / (1 - minD || 1); gsap.set(l, { scale: Math.max(0.05, 1 + (1 - o.bgScale) * w * p) }); });
      });
    },
    options: { duration: "s (2)", bgScale: "the farthest layer's end scale (0.6)", layers: "selector of the layers (the subject at depth 1)", ease: "power2.inOut" },
    defaults: { duration: 2, bgScale: 0.6, layers: L, ease: "power2.inOut" },
    demo: CAM(`MW.motionDollyZoom(q(".tk-cam"), tl, 0.5, { duration: 2.2 });`, 3.2, {}, ".tk-far, .tk-mid { inset: -42%; } .tk-mid svg { bottom: 30%; height: 34%; }"),
  }),

  T("motion/camera-crane", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll(o.layers)), ease = gsap.parseEase(o.ease);
      el.parentNode.style.perspective = "2400px";
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration);
        Ls.forEach(function (l) { var d = parseFloat(l.getAttribute("data-depth") || "1"); gsap.set(l, { y: o.rise * d * p, scale: 1 + o.push * p }); });
        gsap.set(el, { rotationX: o.tilt * p, scale: 1 + 0.12 * p, transformOrigin: "50% 60%" });
      });
    },
    options: { duration: "s (2)", rise: "px the camera rises (300; 100 on the small frame): layers move down by rise × depth", tilt: "degrees it tilts to look down (8)", push: "push while rising (0.1)", layers: "selector of the layers", ease: "power2.inOut" },
    defaults: { duration: 2, rise: 300, tilt: 8, push: 0.1, layers: L, ease: "power2.inOut" },
    demo: CAM(`MW.motionCameraCrane(q(".tk-cam"), tl, 0.5, { duration: 2.4 });`),
  }),

  T("motion/camera-whip", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var ease = MW.ez(o.ease), sel = o.layers, ghosts = [];
      var Ls = Array.prototype.slice.call(el.querySelectorAll(sel));
      for (var k = 1; k <= 3; k++) { var g = el.cloneNode(true); g.removeAttribute("id"); g.style.pointerEvents = "none"; g.style.opacity = "0"; el.parentNode.insertBefore(g, el.nextSibling); ghosts.push({ g: g, k: k, Ls: Array.prototype.slice.call(g.querySelectorAll(sel)) }); }
      var place = function (list, x) { list.forEach(function (l) { var d = parseFloat(l.getAttribute("data-depth") || "1"); gsap.set(l, { x: x * d }); }); };
      return MW.drive(tl, at, o.duration, function (t) {
        var u = t / o.duration, x = o.start + o.distance * ease(u), sm = Math.sin(Math.PI * u);
        place(Ls, x);
        // three trailing copies, 36 px apart, opacity 0.25 × sin(πu): a smear only mid-swing; the landing frame is sharp
        ghosts.forEach(function (h) { place(h.Ls, x + h.k * 36 * (o.distance > 0 ? -1 : 1)); h.g.style.opacity = u > 0 && u < 1 ? String(0.25 * sm) : "0"; });
      });
    },
    options: { duration: "s (0.45)", distance: "px at depth 1 (600; 200 on the small frame), each layer by its depth", start: "px the camera starts from (0; the swing back starts where the last ended)", ease: "whip, cubic-bezier(.9,0,.1,1)", layers: "selector of the layers" },
    defaults: { duration: 0.45, distance: -600, start: 0, ease: "whip", layers: L },
    demo: CAM(`MW.motionCameraWhip(q(".tk-cam"), tl, 0.9, {}); MW.motionCameraWhip(q(".tk-cam"), tl, 2.3, { start: -600, distance: 600 });`, 3.2),
  }),

  T("motion/orbit-turntable", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var cards = Array.prototype.slice.call(el.children), n = cards.length, W = el.offsetWidth, H = el.offsetHeight;
      return MW.drive(tl, at, o.period * o.turns, function (t) {
        var base = (t / o.period) * 2 * Math.PI;
        cards.forEach(function (c, i) {
          var a = base + (i / n) * 2 * Math.PI, z = Math.sin(a), f = (z + 1) / 2;
          // x on the circle, y on its flattened ellipse; nearer cards larger, brighter and drawn later
          gsap.set(c, { x: W / 2 + o.radius * Math.cos(a) - c.offsetWidth / 2, y: H / 2 + o.radius * o.tilt * z - c.offsetHeight / 2, scale: 0.6 + 0.4 * f, zIndex: Math.round(f * 100) });
          c.style.opacity = String(0.45 + 0.55 * f);
        });
      });
    },
    options: { radius: "px (550; 110 on the small frame)", tilt: "the circle's flattening, y radius ÷ x radius (0.2)", period: "s per turn (4), linear", turns: "turns (1)" },
    defaults: { radius: 550, tilt: 0.2, period: 4, turns: 1 },
    demo: {
      duration: 4,
      css: `#demo { background: radial-gradient(90% 90% at 50% 45%, #1b2033, #0b0d12); }
.orbit { position: absolute; inset: 0; }
.orbit > div { position: absolute; left: 0; top: 0; width: 220px; height: 300px; border-radius: 28px; background: linear-gradient(160deg, #2a3350, #171c2b); border: 2px solid rgba(255, 255, 255, 0.12);
  display: grid; place-items: center; font-size: 72px; font-weight: 800; color: #c9d2ea; box-shadow: 0 30px 70px rgba(0, 0, 0, 0.4); }
.orbit > div.acc { background: linear-gradient(160deg, #a693ff, #6a4cf0); color: #fff; }`,
      html: `<div class="orbit"><div class="acc">1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div></div>`,
      run: `MW.motionOrbitTurntable(q(".orbit"), tl, 0, {});`,
    },
  }),

  T("motion/rack-focus", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll(o.layers)), ease = gsap.parseEase(o.ease);
      return MW.drive(tl, at, o.duration, function (t) {
        var p = ease(t / o.duration);
        Ls.forEach(function (l) {
          var near = parseFloat(l.getAttribute("data-depth") || "1") >= o.split, b = o.toFar ? (near ? o.blur * p : o.blur * (1 - p)) : (near ? o.blur * (1 - p) : o.blur * p);
          l.style.filter = b > 0.05 ? "blur(" + b + "px)" : "";
        });
      });
    },
    options: { duration: "s (0.65; 12-20 frames)", blur: "px of the soft layer (8; 2.6 on the small frame)", toFar: "false: focus comes to the near layers (default); true: it goes to the far ones", split: "depth from which a layer is near (1)", layers: "selector of the layers", ease: "power2.inOut" },
    defaults: { duration: 0.65, blur: 8, toFar: false, split: 1, layers: L, ease: "power2.inOut" },
    demo: CAM(`MW.motionRackFocus(q(".tk-cam"), tl, 0.6, { duration: 0.8, blur: 12 }); MW.motionRackFocus(q(".tk-cam"), tl, 2.0, { duration: 0.8, blur: 12, toFar: true });`, 3.2),
  }),

  T("motion/handheld-drift", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      return MW.drive(tl, at, o.duration, function (t) {
        var a = o.amp;
        gsap.set(el, { x: a * (2 * Math.sin(1.7 * t) + Math.sin(3.1 * t)), y: a * (1.33 * Math.sin(2.3 * t) + 0.67 * Math.sin(4.7 * t)), rotation: o.roll * Math.sin(1.3 * t), scale: o.overscan });
      });
    },
    options: { duration: "s it drifts", amp: "px scale of the sines (9: x = 18 sin 1.7t + 9 sin 3.1t, y = 12 sin 2.3t + 6 sin 4.7t)", roll: "degrees (0.57)", overscan: "scale hiding the edges (1.05)" },
    defaults: { duration: 4, amp: 9, roll: 0.57, overscan: 1.05 },
    demo: CAM(`MW.motionHandheldDrift(q(".tk-cam"), tl, 0, { duration: 4 });`, 4),
  }),

  T("motion/hit-shake", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      return MW.drive(tl, at, o.duration, function (d) {
        var k = d >= o.duration ? 0 : o.amp * Math.exp(-o.decay * d);
        gsap.set(el, { x: Math.sin(97 * d) * k, y: Math.cos(83 * d) * k, scale: d >= o.duration ? 1 : o.overscan });
      });
    },
    options: { amp: "px at the hit (30; 10 on the small frame)", decay: "per second, k = amp × e^(−decay·t) (9)", duration: "s (0.45)", overscan: "scale hiding the edges (1.04)" },
    defaults: { amp: 30, decay: 9, duration: 0.45, overscan: 1.04 },
    notes: "Call once per hit.",
    demo: CAM(`MW.motionHitShake(q(".tk-cam"), tl, 0.5, {}); MW.motionHitShake(q(".tk-cam"), tl, 2.0, {});`, 3),
  }),

  T("motion/beat-punch-in", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var beat = 60 / o.bpm;
      return MW.drive(tl, at, beat * o.beats, function (t) {
        var k = Math.floor(t / beat + 1e-6), d = t - k * beat, A = k >= o.dropAt ? o.ampDrop : o.amp;
        gsap.set(el, { scale: t >= beat * o.beats ? 1 : 1 + A * Math.exp(-d / o.tau) });
      });
    },
    options: { bpm: "tempo (120)", beats: "number of beats (6)", amp: "scale jump on a beat (0.03)", ampDrop: "after the drop (0.07)", dropAt: "beat index where the drop starts (0: every beat as after a drop, as the small demo)", tau: "s, decay time constant (0.11)" },
    defaults: { bpm: 120, beats: 6, amp: 0.03, ampDrop: 0.07, dropAt: 0, tau: 0.11 },
    demo: CAM(`MW.motionBeatPunchIn(q(".tk-cam"), tl, 0.3, { beats: 6 });`, 3.5),
  }),

  T("motion/ken-burns-drift", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      return MW.drive(tl, at, o.duration, function (t) { var p = t / o.duration; gsap.set(el, { scale: 1 + (o.scale - 1) * p, x: o.x * p }); });
    },
    options: { duration: "s (4), linear", scale: "end scale (1.1; the small demo 1.12)", x: "px drift (−60; −20 on the small frame)" },
    defaults: { duration: 4, scale: 1.1, x: -60 },
    assets: [{ path: "photo.svg", data: LANDSCAPE }],
    demo: {
      duration: 4,
      css: `#demo { background: #0b0d12; } .kb-frame { position: absolute; inset: 0; overflow: hidden; } .kb { position: absolute; inset: -4%; background: url(assets/photo.svg) center / cover; }`,
      html: `<div class="kb-frame"><div class="kb"></div></div>`,
      run: `MW.motionKenBurnsDrift(q(".kb"), tl, 0, { scale: 1.12 });`,
    },
  }),

  T("motion/camera-parallax", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var Ls = Array.prototype.slice.call(el.querySelectorAll(o.layers));
      return MW.drive(tl, at, o.duration, function (t) {
        var x = o.loop ? o.distance * Math.sin((2 * Math.PI * t) / o.duration) : o.distance * (t / o.duration);
        Ls.forEach(function (l) { var d = parseFloat(l.getAttribute("data-depth") || "1"); gsap.set(l, { x: x * d }); });
      });
    },
    options: { distance: "px the front travels (180; 60 on the small frame); middle half, back a fifth (by data-depth)", duration: "s (4)", loop: "true: a seamless sine there and back (the small demo); false: constant speed", layers: "selector of the layers" },
    defaults: { distance: 180, duration: 4, loop: true, layers: L },
    demo: demo(layers({ fore: false }), `MW.motionCameraParallax(q(".tk-cam"), tl, 0, {});`, 4,
      `.tk-near .card { width: 360px; height: 300px; margin: -150px 0 0 -180px; font-size: 54px; }`),
  }),

  T("motion/camera-follow", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var ball = el.querySelector(o.subject), Ls = Array.prototype.slice.call(el.querySelectorAll(o.layers)), dt = 1 / 240;
      var X = function (t) { return o.swing * Math.sin((2 * Math.PI * t) / o.period); }, V = function (t) { return o.swing * (2 * Math.PI / o.period) * Math.cos((2 * Math.PI * t) / o.period); };
      return MW.drive(tl, at, o.duration, function (t) {
        // the camera chases target = subject + velocity × lookahead (capped) on a spring, integrated from the start up to this frame
        var c = X(0), v = 0;
        for (var s = 0; s < t; s += dt) { var target = X(s) + Math.max(-o.cap, Math.min(o.cap, V(s) * o.lookahead)); var a = o.k * (target - c) - o.c * v; v += a * dt; c += v * dt; }
        gsap.set(ball, { x: X(t) });
        Ls.forEach(function (l) { var d = parseFloat(l.getAttribute("data-depth") || "1"); gsap.set(l, { x: -c * d }); });
      });
    },
    options: { subject: "selector of the subject inside the world (.ball)", swing: "px the subject swings (660)", period: "s per swing (3)", lookahead: "s of velocity the camera looks ahead (0.47)", cap: "px max lead (138; 46 on the small frame)", k: "spring stiffness (120)", c: "damping (20)", duration: "s", layers: "selector of the layers" },
    defaults: { subject: ".ball", swing: 660, period: 3, lookahead: 0.47, cap: 138, k: 120, c: 20, duration: 4, layers: L },
    demo: {
      duration: 4,
      css: `#demo { background: linear-gradient(180deg, #161c3a, #2a2350); overflow: hidden; }
.fw { position: absolute; inset: 0; } .fw > div { position: absolute; top: 0; bottom: 0; left: -1200px; right: -1200px; }
.fw .hills { background: radial-gradient(60% 40% at 30% 100%, #3b2f6b 60%, transparent 61%), radial-gradient(50% 35% at 75% 100%, #3b2f6b 60%, transparent 61%); }
.fw .ground { top: 720px; bottom: 0; background: #1a1838; border-top: 4px solid #3b3570; }
.fw .post { position: absolute; top: 640px; width: 14px; height: 80px; border-radius: 7px; background: #6c778b; }
.fw .ball { position: absolute; left: 50%; top: 520px; width: 200px; height: 200px; margin-left: -100px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #9af2ff, #2bb7e6 60%, #1278ad); }
.fw-cap { position: absolute; left: 0; right: 0; top: 860px; text-align: center; font-size: 34px; color: ${C.mute}; }`,
      html: `<div class="fw"><div class="hills" data-depth="0.4"></div><div class="world" data-depth="1"><div class="ground"></div>${Array.from({ length: 16 }, (_, i) => `<div class="post" style="left:${i * 300}px"></div>`).join("")}<div class="ball"></div></div></div><div class="fw-cap">Máy quay bám theo, đi trước một chút theo hướng chạy</div>`,
      run: `MW.motionCameraFollow(q(".fw"), tl, 0, {});`,
    },
  }),
];

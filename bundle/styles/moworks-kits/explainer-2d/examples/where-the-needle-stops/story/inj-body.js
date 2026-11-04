/* inj-body.js: the x-ray body (shots 3, 5, 10) and the inside of the stomach (shot 4) for
 * "Where the Needle Stops". Classic script: loads after ex/ex-core.js, ex/house-pal.js and
 * story/inj-pal.js. Every draw is a pure function of its options (no state between calls);
 * static geometry (silhouette, vessel network, wall folds) is generated once in init() with a
 * seeded generator and cached in offscreen canvases. No text is drawn.
 *
 *   await HOUSE.body.init()
 *
 *   HOUSE.body.xray(ctx, { t, cam, gut = 1, swallow = 0, cross = 0, shortcut = 0, circ = 0,
 *                       heart = 0, bpm = 75 })
 *     Full frame (paints its own background). The red-hoodie hero as a translucent x-ray figure,
 *     front view: head to mid-thigh fills the frame height at cam zoom 1, centred slightly left
 *     (x ~900). Cool glowing rim, cel shadow, faint lungs and brain; inside, the digestive tract
 *     (pink) and the vessel network (red arteries, blue-violet veins, capillary fringes), faint
 *     at rest. Ambient life: breathing (~0.6 %), a faint lub-dub with a pulse wave running out
 *     along the arteries, blood cells streaming along the big vessels, drifting motes.
 *       gut       0..1 brightness of the digestive tract
 *       swallow   0..1 an aqua blob enters at the mouth, slides down the oesophagus (0.1-0.7),
 *                 drops into the stomach (0.86) and settles as a sloshing pool (1)
 *       cross     0..1 the gut route dims and a rounded red cross draws on over the stomach
 *                 (first stroke 0-0.45, second 0.35-0.8, then it sits)
 *       shortcut  0..1 the injection site on the screen-right deltoid lights up and a bright aqua
 *                 arrow runs from it into the nearest (cephalic) vein and on to the heart
 *                 (1 = arrived; the stream then stays lit)
 *       circ      0..1 aqua medicine spreads from the heart through the arteries, then the veins,
 *                 by path distance (head ~0.4, fingertips ~0.85, everything incl. feet at 1)
 *       heart     0..1 heart emphasis: brighter, ~12 % bigger, full lub-dub (faint at 0)
 *       bpm       heart rate of the lub-dub and the pulse wave
 *   HOUSE.body.xrayAnchors(opts) -> { mouth, stomach, heart, site, head, handL, handR }
 *     screen px [x, y] after cam and breathing (handL / handR = screen-left / screen-right).
 *
 *   HOUSE.body.stomach(ctx, { t, cam, insulin = 0, sandwich = 0, digest = 0, meds = 0 })
 *     Full frame inside the stomach: a tunnel of folded pink walls (rugae) running to a glowing
 *     far end, dark foreground folds framing the corners, a pool of glowing green acid across the
 *     lower third (surface y ~700) with rising and popping bubbles, foam, caustics and mist,
 *     mucus drips and four violet enzyme critters swimming slowly.
 *       insulin   0..1 a golden 12-bead chain falls in from above the frame (0), splashes into
 *                 the acid at 0.42 and bobs to a float (1) at x ~760
 *       sandwich  0..1 the same for a small cartoon sandwich at x ~1250
 *       digest    0..1 the enzymes swim to both and snip: bites (0.05-0.25), links snap
 *                 (0.14-0.5), beads and crumbs drift apart, shrink and fade (mostly gone by 1)
 *       meds      0..1 garnish: four aqua drops fall in (0-0.3) and dissolve in swirls (to 0.9)
 *   HOUSE.body.stomachAnchors(opts) -> { insulin, sandwich, acid } screen px after cam.
 *
 *   cam = { zoom = 1, x = 0, y = 0 }: zoom about the frame centre, then pan in screen px
 *   (screen = centre + (p - centre) * zoom + (x, y)). Margins cover zoom >= 0.9 and pans of
 *   +-60 px.
 *
 * Local colours that are not in HOUSE.pal live in the LOCAL block below.
 */
(function () {
  "use strict";
  const HOUSE = (window.HOUSE = window.HOUSE || {});
  const BODY = (HOUSE.body = HOUSE.body || {});
  const W = 1920;
  const H = 1080;
  const CX = W / 2;
  const CY = H / 2;
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const N1 = (x, s) => EX.noise1(x, s);
  const HS = (i, j = 0, k = 0) => EX.hash(i, j, k);
  const hex = (h) => (Array.isArray(h) ? h : EX.hex(h));
  const rgba = (c, a) => {
    c = hex(c);
    return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a < 0 ? 0 : a > 1 ? 1 : a})`;
  };
  const mixc = (a, b, k) => {
    a = hex(a);
    b = hex(b);
    return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  };
  const angDiff = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return d;
  };
  const KEY = (() => {
    const k = (HOUSE.light && HOUSE.light.key) || [-0.6, -0.8];
    const l = Math.hypot(k[0], k[1]) || 1;
    return [k[0] / l, k[1] / l];
  })();
  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  // ------------------------------------------------------------------ LOCAL colours
  const LOCAL = {
    fieldTop: "#0e0234", // x-ray field gradient (gridBg family), top -> bottom
    fieldMid: "#170444",
    fieldBot: "#1d0550",
    gridDot: "#7a68e0",
    xrShadow: "#3c0d74", // cel shadow inside the x-ray figure (xray hue-shifted to magenta)
    xrHair: "#120845",
    xrRimHot: "#d6f6ff",
    xrRimCool: "#6d7cff",
    veinRest: "#6c6cff", // blue-violet between HOUSE.pal.vein and veinLight
    gutHi: "#ffe3f0",
    crossHi: "#ffb3c0",
    wallFar: "#2a0954", // stomach tunnel: far end, grooves (mid, near)
    grooveMid: "#5c1668",
    grooveNear: "#8a2873",
    ridgeMid: "#c04c8e",
    ridgeShMid: "#8c2f7e",
    ridgeFar: "#4c1468",
    ridgeRim: "#ffc8de",
    fgBase: "#4e0f4e", // foreground folds (darker than the walls, lit toward the centre)
    fgLit: "#9a3480",
    fgRim: "#ff8fbf",
    acidDeep: "#2a7a4c",
    acidBottom: "#133a40",
    mucus: "#ffd9ec",
    enzymeLight: "#e6a6ff",
    enzymeMouth: "#3a0c55",
    pupil: "#24072e",
    insulinHi: "#fff2a8",
    breadLight: "#ffd88f",
    crust: "#b8742e",
    lettuceShade: "#2f9f58",
    lettuceVein: "#a6f0a0",
    tomatoShade: "#cf2a4a",
    seed: "#ffd6a0",
    cheeseShade: "#e6ad28",
  };

  // ------------------------------------------------------------------ camera
  function camOf(o) {
    const c = (o && o.cam) || {};
    return { z: c.zoom == null ? 1 : c.zoom, x: c.x || 0, y: c.y || 0 };
  }
  function applyCam(ctx, m) {
    ctx.translate(CX + m.x, CY + m.y);
    ctx.scale(m.z, m.z);
    ctx.translate(-CX, -CY);
  }
  const camPt = (m, x, y) => [CX + (x - CX) * m.z + m.x, CY + (y - CY) * m.z + m.y];

  // ------------------------------------------------------------------ paths
  const KS = 1 / 6;
  // closed Catmull-Rom spline through [x, y, sharp?] points (sharp = zero tangent)
  function splTo(path, p, dx = 0, dy = 0) {
    const n = p.length;
    path.moveTo(p[0][0] + dx, p[0][1] + dy);
    for (let i = 0; i < n; i++) {
      const a = p[(i + n - 1) % n];
      const b = p[i];
      const c = p[(i + 1) % n];
      const d = p[(i + 2) % n];
      const kb = b[2] ? 0 : KS;
      const kc = c[2] ? 0 : KS;
      path.bezierCurveTo(
        b[0] + (c[0] - a[0]) * kb + dx,
        b[1] + (c[1] - a[1]) * kb + dy,
        c[0] - (d[0] - b[0]) * kc + dx,
        c[1] - (d[1] - b[1]) * kc + dy,
        c[0] + dx,
        c[1] + dy,
      );
    }
    path.closePath();
    return path;
  }
  const P2 = (p) => splTo(new Path2D(), p);
  // open Catmull-Rom resampled to ~step spacing
  function crOpen(p, step = 0.35) {
    const out = [];
    const n = p.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = p[Math.max(0, i - 1)];
      const p1 = p[i];
      const p2 = p[i + 1];
      const p3 = p[Math.min(n - 1, i + 2)];
      const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const m = Math.max(1, Math.ceil(L / step));
      for (let j = 0; j < m; j++) {
        const u = j / m;
        const u2 = u * u;
        const u3 = u2 * u;
        const f = (k) =>
          0.5 *
          (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3);
        out.push([f(0), f(1)]);
      }
    }
    out.push([p[n - 1][0], p[n - 1][1]]);
    return out;
  }
  function cumLen(pts) {
    const c = new Float32Array(pts.length);
    for (let i = 1; i < pts.length; i++) c[i] = c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return c;
  }
  function polyAt(pts, c, s) {
    const n = c.length;
    s = clamp(s, 0, c[n - 1]);
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (c[mid] <= s) lo = mid;
      else hi = mid;
    }
    const seg = c[hi] - c[lo] || 1;
    const u = (s - c[lo]) / seg;
    const a = pts[lo];
    const b = pts[hi];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0])];
  }
  // add the sub-polyline between arc lengths s0..s1 to the current path
  function subPoly(ctx, pts, c, s0, s1) {
    const n = c.length;
    s0 = Math.max(0, s0);
    s1 = Math.min(c[n - 1], s1);
    if (s1 <= s0) return;
    const a = polyAt(pts, c, s0);
    ctx.moveTo(a[0], a[1]);
    for (let i = 0; i < n; i++) if (c[i] > s0 && c[i] < s1) ctx.lineTo(pts[i][0], pts[i][1]);
    const b = polyAt(pts, c, s1);
    ctx.lineTo(b[0], b[1]);
  }
  function polyPath(pts) {
    const p = new Path2D();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
    return p;
  }
  // inside the current clip: fill everything except `path` shifted by (dx, dy)
  function cres(g, path, dx, dy, fill) {
    const p = new Path2D();
    p.rect(-5000, -5000, 10000, 10000);
    p.addPath(path, new DOMMatrix([1, 0, 0, 1, dx, dy]));
    g.fillStyle = fill;
    g.fill(p, "evenodd");
  }

  // ------------------------------------------------------------------ sprites
  const SPR = {};
  function glowSprite(col, size = 128, k = [1, 0.42, 0.1]) {
    const c = canvas(size, size);
    const g = c.getContext("2d");
    const r = size / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, rgba(col, k[0]));
    gr.addColorStop(0.22, rgba(col, k[1]));
    gr.addColorStop(0.55, rgba(col, k[2]));
    gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }
  function starSprite(col, size = 96) {
    const c = canvas(size, size);
    const g = c.getContext("2d");
    const r = size / 2;
    let gr = g.createRadialGradient(r, r, 0, r, r, r * 0.6);
    gr.addColorStop(0, rgba(col, 0.75));
    gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    g.fillStyle = "#ffffff";
    g.beginPath();
    const a = r * 0.95;
    const b = r * 0.1;
    g.moveTo(r, r - a);
    g.quadraticCurveTo(r + b, r - b, r + a, r);
    g.quadraticCurveTo(r + b, r + b, r, r + a);
    g.quadraticCurveTo(r - b, r + b, r - a, r);
    g.quadraticCurveTo(r - b, r - b, r, r - a);
    g.fill();
    return c;
  }
  function bubbleSprite(rim, size = 64) {
    const c = canvas(size, size);
    const g = c.getContext("2d");
    const r = size / 2;
    const gr = g.createRadialGradient(r * 0.85, r * 0.8, 0, r, r, r * 0.92);
    gr.addColorStop(0, rgba(rim, 0.06));
    gr.addColorStop(0.75, rgba(rim, 0.16));
    gr.addColorStop(0.9, rgba(rim, 0.75));
    gr.addColorStop(1, rgba(rim, 0));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(r, r, r * 0.95, 0, TAU);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.beginPath();
    g.ellipse(r * 0.66, r * 0.62, r * 0.2, r * 0.13, -0.7, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(r * 1.3, r * 1.32, r * 0.07, 0, TAU);
    g.fill();
    return c;
  }
  // a cel-shaded sphere (lit fill, hard shadow crescent, rim, specular) for beads and drops
  function ballSprite(base, shade, rim, size = 96) {
    const c = canvas(size, size);
    const g = c.getContext("2d");
    const r = size * 0.4;
    const o = size / 2;
    const ball = new Path2D();
    ball.arc(o, o, r, 0, TAU);
    g.fillStyle = rgba(base, 1);
    g.fill(ball);
    g.save();
    g.clip(ball);
    cres(g, ball, KEY[0] * r * 0.55, KEY[1] * r * 0.55, rgba(shade, 1));
    cres(g, ball, -KEY[0] * r * 0.12, -KEY[1] * r * 0.12, rgba(rim, 0.95));
    g.restore();
    g.fillStyle = "rgba(255,255,255,0.92)";
    g.beginPath();
    g.ellipse(o - r * 0.36, o - r * 0.4, r * 0.26, r * 0.17, -0.7, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(o + r * 0.42, o + r * 0.38, r * 0.07, 0, TAU);
    g.fill();
    return c;
  }

  // ================================================================== X-RAY: figure geometry
  // Body units are the hero's (house-hero.js): x right, y down, feet at 0, top of the hair -102.
  const HEADY = -86.8;
  const HIP = -43;
  const FIG = { x: 900, y: 1382, s: 13 }; // feet centre at zoom 1 (px) and px per unit
  const ARM_A = 0.13; // arms swing out a little so the arm vessels read
  const PIV = [-14.2, -69.5];
  function armXY(side, x, y) {
    const c = Math.cos(ARM_A);
    const s = Math.sin(ARM_A);
    const dx = x - PIV[0];
    const dy = y - PIV[1];
    const X = PIV[0] + dx * c - dy * s;
    const Y = PIV[1] + dx * s + dy * c;
    return side < 0 ? [X, Y] : [-X, Y];
  }
  const armPts = (side, p) => p.map((q) => armXY(side, q[0], q[1]).concat(q.length > 2 ? [q[2]] : []));
  const headPts = (p) => p.map((q) => [q[0], q[1] + HEADY, q[2]]);
  const mir = (p) => p.map((q) => [-q[0], q[1], q[2]]);

  const TORSO = [
    [-4.8, -74.4], [-9.6, -73.1], [-13.4, -70.9], [-15.1, -67.2], [-14.7, -58], [-13.7, -48],
    [-13.0, -43.3], [-12.0, -41.1], [0, -40.6], [12.0, -41.1], [13.0, -43.3], [13.7, -48],
    [14.7, -58], [15.1, -67.2], [13.4, -70.9], [9.6, -73.1], [4.8, -74.4], [0, -72.6],
  ];
  const SLEEVE = [
    [-12.0, -72.0], [-15.4, -71.3], [-17.7, -68.2], [-18.5, -62.0], [-18.7, -55.6], [-18.6, -50.0],
    [-18.3, -47.6], [-17.6, -46.2, 1], [-17.45, -43.0], [-15.85, -42.3], [-14.25, -42.9], [-14.1, -46.2, 1],
    [-13.5, -47.8], [-13.6, -52.0], [-13.6, -56.5], [-13.2, -61.5], [-12.4, -66.5],
  ];
  const HAND = [
    [-17.5, -43.4], [-18.0, -41.0], [-17.8, -38.6], [-16.8, -37.0], [-15.3, -36.8],
    [-14.2, -37.8], [-13.9, -39.6], [-14.1, -41.4], [-14.25, -43.4],
  ];
  const LEG = [
    [-11.6, -46, 1], [-0.25, -46, 1], [-0.45, -38.6], [-1.15, -24], [-1.45, -11], [-1.6, -5.0, 1],
    [-8.4, -5.0, 1], [-8.45, -12], [-8.95, -24], [-10.3, -36],
  ];
  const FOOT = [[-9.2, -1.5], [-9.0, -4.2], [-7.6, -6.2], [-5.1, -6.8], [-2.6, -6.2], [-1.2, -4.2], [-1.0, -1.5], [-0.6, 0.05, 1], [-9.6, 0.05, 1]];
  const FACE = headPts([
    [0, -10.6], [5.4, -9.6], [7.55, -5.6], [7.75, -0.6], [7.25, 3.5], [5.7, 6.9], [2.85, 9.05], [0, 9.65],
    [-2.85, 9.05], [-5.7, 6.9], [-7.25, 3.5], [-7.75, -0.6], [-7.55, -5.6], [-5.4, -9.6],
  ]);
  const HAIR = headPts([
    [-7.85, -0.6, 1], [-8.3, -3.6], [-8.55, -6.4], [-8.5, -8.4], [-9.75, -9.5, 1], [-8.4, -11.6], [-5.8, -14.0],
    [-1.8, -15.3], [2.4, -15.5], [4.7, -14.3], [5.4, -13.4, 1], [6.7, -13.1], [8.3, -10.9], [8.85, -7.2],
    [8.7, -3.6], [8.05, -0.8, 1], [7.3, -1.0, 1], [7.1, -4.8], [5.6, -6.9], [2.4, -7.8], [-0.8, -7.4],
    [-2.6, -6.5], [-3.7, -4.5, 1], [-4.6, -5.6], [-6.3, -3.3, 1], [-6.9, -4.4], [-7.15, -0.9, 1],
  ]);
  const NECK = [[-3.15, -81.6], [3.15, -81.6], [3.35, -76.6], [3.6, -72.6, 1], [-3.6, -72.6, 1], [-3.35, -76.6]];
  const HOODB = [[-9.0, -75.8], [-8.7, -79.0], [-6.0, -81.2], [0, -82.0], [6.0, -81.2], [8.7, -79.0], [9.0, -75.8], [3.8, -74.8], [-3.8, -74.8]];
  const ROLL = [
    [-3.95, -79.4], [-6.7, -79.0], [-9.3, -76.4], [-9.2, -73.2], [-6.6, -71.3], [-3.2, -70.2],
    [-0.2, -69.8], [1.3, -70.3, 1], [0.15, -71.9], [-2.2, -73.3], [-3.55, -75.3], [-3.95, -77.6],
  ];
  const POCKET = [[-6.8, -57.0], [6.8, -57.0], [9.7, -45.4], [-9.7, -45.4]];

  function bodyParts() {
    const parts = [P2(HOODB), P2(TORSO), P2(NECK)];
    for (const s of [-1, 1]) {
      parts.push(P2(armPts(s, SLEEVE)), P2(armPts(s, HAND)));
      parts.push(P2(s < 0 ? LEG : mir(LEG)), P2(s < 0 ? FOOT : mir(FOOT)), P2(s < 0 ? ROLL : mir(ROLL)));
      const e = new Path2D();
      e.ellipse(s * 7.45, HEADY + 0.9, 1.4, 2.25, s * 0.12, 0, TAU);
      parts.push(e);
    }
    parts.push(P2(FACE), P2(HAIR));
    return parts;
  }

  // organ geometry (body units)
  const HC = [3.7, -62.1]; // heart centre
  const HR = 3.7; // heart half-width
  const OES = [[0, -80.2], [0.05, -78.6], [-0.2, -76.0], [-0.5, -72.5], [-0.7, -68.5], [-0.55, -64.5], [-0.1, -61.0], [0.8, -58.7], [1.8, -57.6], [2.6, -57.0]];
  const STOM = [
    [2.2, -57.5], [2.9, -58.9], [4.7, -59.5], [6.7, -58.8], [7.9, -56.9], [8.3, -54.2], [7.8, -51.7], [6.3, -50.3],
    [4.1, -49.9], [1.9, -50.2], [0.3, -50.8], [-0.7, -51.5], [-0.6, -52.6], [0.6, -52.8], [2.4, -52.6], [3.7, -53.6],
    [3.8, -55.4], [3.1, -56.6],
  ];
  const STOM_MID = [[3.0, -57.7], [4.9, -58.2], [6.7, -56.9], [7.3, -54.1], [6.7, -51.7], [4.7, -50.9], [2.3, -51.3], [0.4, -51.7]];
  const SW_TAIL = [[3.6, -56.4], [4.8, -55.2], [5.5, -53.8], [5.6, -52.4]];
  const STOMACH_PT = [5.4, -54.4];
  const CROSS_C = [4.6, -54.3];
  const COLON = [
    [-6.6, -42.2], [-7.3, -44.5], [-7.4, -47.2], [-7.0, -49.1], [-5.0, -49.6], [-1.0, -49.4], [3.0, -49.7],
    [6.6, -49.6], [7.7, -48.6], [7.9, -45.8], [7.6, -42.8], [6.2, -41.1], [3.6, -40.9], [1.6, -41.2], [0.5, -40.5], [0.2, -39.4],
  ];
  function smallGutPts() {
    // duodenum C-loop from the pylorus, then two bands of tight switchback coils
    const pts = [[-0.6, -52.0], [-1.8, -51.5], [-2.8, -50.6], [-3.9, -49.7], [-5.3, -49.1]];
    const bands = [
      [-48.7, -45.9, -5.4, 5.6],
      [-45.2, -42.5, 5.6, -5.4],
    ];
    const dx = 1.0;
    bands.forEach(([ya, yb, xa, xb], bi) => {
      const n = Math.round(Math.abs(xb - xa) / dx);
      const sd = Math.sign(xb - xa);
      for (let i = 0; i <= n; i++) {
        const x = xa + sd * i * dx + 0.18 * Math.sin(i * 2.3 + bi);
        const top = ya + 0.32 * HS(i, bi, 91);
        const bot = yb - 0.32 * HS(i, bi, 92);
        const down = (i + bi) % 2 === 0;
        const [y0, y1] = down ? [top, bot] : [bot, top];
        pts.push([x, y0], [x + 0.12 * Math.sin(i * 1.7), (y0 + y1) / 2], [x, y1]);
        if (i < n) pts.push([x + sd * dx * 0.5, y1 + (down ? 0.42 : -0.42)]);
      }
      if (bi === 0) pts.push([xb + 0.5, (yb + bands[1][0]) / 2 + 0.2]);
    });
    pts.push([-6.2, -42.4], [-6.6, -42.1]);
    return pts;
  }
  const SITE = armXY(1, -16.4, -65.6); // deltoid of the screen-right arm
  const HAND_C = [armXY(-1, -15.9, -40.0), armXY(1, -15.9, -40.0)];

  // ------------------------------------------------------------------ figure cache
  const FB = { x0: -25, x1: 25, y0: -106, y1: 2 };
  const FQ = FIG.s * 1.6; // cache px per unit (sharp up to a ~1.6x push)
  function figCanvas(q) {
    const c = canvas((FB.x1 - FB.x0) * q, (FB.y1 - FB.y0) * q);
    const g = c.getContext("2d");
    g.setTransform(q, 0, 0, q, -FB.x0 * q, -FB.y0 * q);
    return [c, g];
  }
  const XR = {};

  function buildFigure(parts) {
    const P = HOUSE.pal;
    const q = FQ;
    const [M, mg] = figCanvas(q);
    mg.fillStyle = "#fff";
    for (const p of parts) mg.fill(p);
    const w = M.width;
    const h = M.height;
    const id = (g) => g.setTransform(1, 0, 0, 1, 0, 0);
    // outside of the silhouette
    const [O, og] = figCanvas(q);
    id(og);
    og.fillStyle = "#fff";
    og.fillRect(0, 0, w, h);
    og.globalCompositeOperation = "destination-out";
    og.drawImage(M, 0, 0);
    // crisp rim band: the outside dilated by rpx, kept inside the mask
    const [R, rg] = figCanvas(q);
    id(rg);
    const rpx = 0.2 * q;
    rg.drawImage(O, 0, 0);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      rg.drawImage(O, Math.cos(a) * rpx, Math.sin(a) * rpx);
    }
    rg.globalCompositeOperation = "destination-in";
    rg.drawImage(M, 0, 0);
    rg.globalCompositeOperation = "source-in";
    rg.setTransform(q, 0, 0, q, -FB.x0 * q, -FB.y0 * q);
    let gr = rg.createLinearGradient(-22, -102, 18, -30);
    gr.addColorStop(0, LOCAL.xrRimHot);
    gr.addColorStop(0.45, P.xrayRim);
    gr.addColorStop(1, LOCAL.xrRimCool);
    rg.fillStyle = gr;
    rg.fillRect(FB.x0, FB.y0, FB.x1 - FB.x0, FB.y1 - FB.y0);
    // second, wider and softer rim on the key-light side
    const [R2, r2g] = figCanvas(q);
    id(r2g);
    r2g.drawImage(M, 0, 0);
    r2g.globalCompositeOperation = "destination-out";
    r2g.drawImage(M, -KEY[0] * 0.55 * q, -KEY[1] * 0.55 * q);
    r2g.globalCompositeOperation = "source-in";
    r2g.fillStyle = rgba(LOCAL.xrRimHot, 0.42);
    r2g.fillRect(0, 0, w, h);
    // soft inner glow
    const [G, gg] = figCanvas(q);
    id(gg);
    gg.filter = `blur(${(1.1 * q).toFixed(1)}px)`;
    gg.drawImage(O, 0, 0);
    gg.filter = "none";
    gg.globalCompositeOperation = "destination-in";
    gg.drawImage(M, 0, 0);
    gg.globalCompositeOperation = "source-in";
    gg.fillStyle = rgba(P.xrayRim, 0.5);
    gg.fillRect(0, 0, w, h);
    // cel shadow band (lower right of every form)
    const [S, sg] = figCanvas(q);
    id(sg);
    sg.drawImage(M, 0, 0);
    sg.globalCompositeOperation = "destination-out";
    sg.drawImage(M, KEY[0] * 1.5 * q, KEY[1] * 1.5 * q);
    sg.globalCompositeOperation = "source-in";
    sg.fillStyle = rgba(LOCAL.xrShadow, 0.62);
    sg.fillRect(0, 0, w, h);

    // ---- the fill
    const [F, fg] = figCanvas(q);
    id(fg);
    fg.drawImage(M, 0, 0);
    fg.globalCompositeOperation = "source-in";
    fg.fillStyle = rgba(P.xray, 0.76);
    fg.fillRect(0, 0, w, h);
    fg.globalCompositeOperation = "source-atop";
    fg.setTransform(q, 0, 0, q, -FB.x0 * q, -FB.y0 * q);
    // faint inner gradients: chest and head pools, legs deeper
    const pool = (x, y, r, col, a) => {
      const g2 = fg.createRadialGradient(x, y, 0, x, y, r);
      g2.addColorStop(0, rgba(col, a));
      g2.addColorStop(1, rgba(col, 0));
      fg.fillStyle = g2;
      fg.fillRect(x - r, y - r, 2 * r, 2 * r);
    };
    pool(-1, -62, 22, [110, 80, 235], 0.38);
    pool(0, -88, 13, [120, 96, 240], 0.3);
    pool(0, -48, 16, [150, 60, 200], 0.18);
    gr = fg.createLinearGradient(0, -40, 0, 0);
    gr.addColorStop(0, "rgba(14,4,50,0)");
    gr.addColorStop(1, "rgba(14,4,50,0.45)");
    fg.fillStyle = gr;
    fg.fillRect(FB.x0, -40, FB.x1 - FB.x0, 42);
    // hair: a deeper tone with violet sheen bands
    const hairP = P2(HAIR);
    fg.fillStyle = rgba(LOCAL.xrHair, 0.72);
    fg.fill(hairP);
    fg.save();
    fg.clip(hairP);
    fg.lineCap = "round";
    fg.strokeStyle = rgba(P.hairSheen, 0.55);
    fg.lineWidth = 0.9;
    fg.beginPath();
    fg.moveTo(-7.6, HEADY - 10.6);
    fg.quadraticCurveTo(-4.6, HEADY - 14.4, -1.8, HEADY - 14.6);
    fg.moveTo(-0.6, HEADY - 14.9);
    fg.quadraticCurveTo(1.6, HEADY - 15.1, 3.8, HEADY - 14.6);
    fg.stroke();
    fg.strokeStyle = rgba(P.xrayRim, 0.16);
    fg.lineWidth = 0.22;
    fg.beginPath();
    fg.moveTo(4.8, HEADY - 13.6);
    fg.quadraticCurveTo(0.5, HEADY - 9.0, -3.5, HEADY - 4.9);
    fg.moveTo(3.0, HEADY - 14.8);
    fg.quadraticCurveTo(-2.0, HEADY - 9.5, -6.2, HEADY - 3.8);
    fg.moveTo(0.2, HEADY - 15.0);
    fg.quadraticCurveTo(-5.0, HEADY - 13.0, -9.0, HEADY - 9.7);
    fg.moveTo(6.0, HEADY - 12.8);
    fg.quadraticCurveTo(7.6, HEADY - 10.0, 8.0, HEADY - 7.6);
    fg.stroke();
    fg.restore();
    // lungs (faint) with a bronchial tree
    const LUNG_L = [[-2.0, -70.2], [-5.6, -71.4], [-9.7, -69.8], [-11.8, -65.0], [-12.2, -59.6], [-10.9, -57.0], [-6.5, -57.6], [-2.8, -59.4], [-1.6, -64.0]];
    const LUNG_R = [[2.0, -70.2], [5.6, -71.4], [9.7, -69.8], [11.8, -65.0], [12.2, -59.6], [10.9, -57.0], [7.6, -57.4], [6.6, -60.4], [4.8, -63.8], [2.8, -65.4]];
    for (const L of [LUNG_L, LUNG_R]) {
      const lp = P2(L);
      fg.fillStyle = "rgba(130,104,255,0.13)";
      fg.fill(lp);
      fg.save();
      fg.clip(lp);
      cres(fg, lp, KEY[0] * 1.6, KEY[1] * 1.6, "rgba(60,16,120,0.22)");
      fg.restore();
      fg.strokeStyle = rgba(P.xrayRim, 0.2);
      fg.lineWidth = 0.16;
      fg.stroke(lp);
    }
    fg.lineCap = "round";
    fg.strokeStyle = rgba(P.xrayRim, 0.17);
    const twig = (pts, wdt) => {
      fg.lineWidth = wdt;
      fg.stroke(polyPath(crOpen(pts, 0.3)));
    };
    twig([[0, -79.0], [0, -74.0], [0, -70.6]], 0.7);
    for (const s of [-1, 1]) {
      twig([[0, -70.6], [s * 1.6, -69.2], [s * 3.6, -67.2]], 0.45);
      twig([[s * 3.6, -67.2], [s * 5.8, -66.4], [s * 8.4, -66.8]], 0.26);
      twig([[s * 3.6, -67.2], [s * 4.8, -64.0], [s * 6.4, -61.0]], 0.26);
      twig([[s * 3.6, -67.2], [s * 4.2, -69.0], [s * 5.6, -70.0]], 0.2);
      twig([[s * 5.8, -66.4], [s * 7.0, -68.6]], 0.14);
      twig([[s * 6.4, -61.0], [s * 8.6, -59.6]], 0.14);
      twig([[s * 6.4, -61.0], [s * 6.8, -58.6]], 0.14);
      twig([[s * 8.4, -66.8], [s * 10.2, -64.6]], 0.12);
    }
    // diaphragm
    fg.strokeStyle = rgba(P.xrayRim, 0.12);
    fg.lineWidth = 0.22;
    fg.beginPath();
    fg.moveTo(-13.2, -55.8);
    fg.bezierCurveTo(-9, -59.6, -3, -57.4, 0, -57.2);
    fg.bezierCurveTo(3, -57.4, 9, -59.8, 13.2, -55.8);
    fg.stroke();
    // brain (faint)
    const brain = new Path2D();
    brain.ellipse(0, HEADY - 5.0, 6.4, 4.6, 0, 0, TAU);
    fg.fillStyle = "rgba(255,127,184,0.08)";
    fg.fill(brain);
    fg.strokeStyle = "rgba(255,170,215,0.16)";
    fg.lineWidth = 0.16;
    fg.stroke(brain);
    fg.beginPath();
    for (let i = 0; i < 7; i++) {
      const y = HEADY - 8.6 + i * 1.15;
      const hw = 6.0 * Math.sqrt(Math.max(0, 1 - Math.pow((y - (HEADY - 5.0)) / 4.6, 2)));
      for (let x = -hw + 0.4; x < hw - 0.4; x += 0.25) {
        const yy = y + 0.32 * Math.sin(x * 2.6 + i * 1.9);
        if (x === -hw + 0.4) fg.moveTo(x, yy);
        else fg.lineTo(x, yy);
      }
    }
    fg.strokeStyle = "rgba(255,170,215,0.1)";
    fg.lineWidth = 0.12;
    fg.stroke();
    fg.beginPath();
    fg.moveTo(0, HEADY - 9.4);
    fg.lineTo(0, HEADY - 0.6);
    fg.strokeStyle = "rgba(255,170,215,0.14)";
    fg.lineWidth = 0.14;
    fg.stroke();
    // cel shadow band
    id(fg);
    fg.drawImage(S, 0, 0);
    fg.setTransform(q, 0, 0, q, -FB.x0 * q, -FB.y0 * q);
    // ghost lines of the hoodie, face and hands (so the figure reads as the hero)
    fg.globalCompositeOperation = "source-over";
    fg.lineCap = "round";
    fg.lineJoin = "round";
    const ghost = (path, a, wdt) => {
      fg.strokeStyle = rgba(P.xrayRim, a);
      fg.lineWidth = wdt;
      fg.stroke(path);
    };
    ghost(P2(ROLL), 0.28, 0.2);
    ghost(P2(mir(ROLL)), 0.28, 0.2);
    ghost(P2(HOODB), 0.1, 0.16);
    const pk = new Path2D();
    pk.moveTo(-6.8, -57.0);
    pk.lineTo(6.8, -57.0);
    pk.lineTo(9.7, -45.4);
    pk.moveTo(-9.7, -45.4);
    pk.lineTo(-6.8, -57.0);
    ghost(pk, 0.13, 0.16);
    const hem = new Path2D();
    hem.moveTo(-13.1, -44.9);
    hem.quadraticCurveTo(0, -45.3, 13.1, -44.9);
    ghost(hem, 0.18, 0.18);
    for (const s of [-1, 1]) {
      ghost(polyPath(armPts(s, [[-18.5, -46.6], [-16.0, -46.4], [-13.5, -46.6]])), 0.2, 0.18);
      ghost(polyPath(armPts(s, [[-17.5, -43.2], [-15.85, -42.5], [-14.3, -43.0]])), 0.12, 0.14);
      const dsx = s * 1.3;
      const st = new Path2D();
      st.moveTo(dsx, -71.1);
      st.quadraticCurveTo(s * 1.6, -66.4, s * 1.85, -61.6);
      ghost(st, 0.24, 0.17);
      // eyes: soft glints
      fg.fillStyle = "rgba(8,2,34,0.55)";
      fg.beginPath();
      fg.ellipse(s * 3.1, HEADY + 0.6, 0.9, 1.3, 0, 0, TAU);
      fg.fill();
      fg.strokeStyle = rgba(P.xrayRim, 0.3);
      fg.lineWidth = 0.12;
      fg.stroke();
      fg.fillStyle = "rgba(220,248,255,0.7)";
      fg.beginPath();
      fg.ellipse(s * 3.1 - 0.3, HEADY + 0.1, 0.3, 0.3, 0, 0, TAU);
      fg.fill();
      // brows
      fg.strokeStyle = rgba(P.xrayRim, 0.2);
      fg.lineWidth = 0.32;
      fg.beginPath();
      fg.moveTo(s * 1.6, HEADY - 3.0);
      fg.quadraticCurveTo(s * 3.3, HEADY - 3.9, s * 4.8, HEADY - 3.3);
      fg.stroke();
      // ear inner
      fg.strokeStyle = rgba(P.xrayRim, 0.16);
      fg.lineWidth = 0.15;
      fg.beginPath();
      fg.ellipse(s * 7.3, HEADY + 1.0, 0.6, 1.3, s * 0.12, 0, TAU);
      fg.stroke();
      // thumb crease
      ghost(polyPath(armPts(s, [[-14.75, -42.8], [-14.9, -40.6], [-14.95, -39.0]])), 0.14, 0.13);
      // knee hint
      ghost(polyPath([[s * 2.4, -25.4], [s * 4.9, -24.8], [s * 7.4, -25.4]]), 0.12, 0.15);
    }
    const chin = new Path2D();
    chin.moveTo(-6.9, HEADY + 4.6);
    chin.bezierCurveTo(-4.8, HEADY + 8.8, -2.0, HEADY + 9.7, 0, HEADY + 9.7);
    chin.bezierCurveTo(2.0, HEADY + 9.7, 4.8, HEADY + 8.8, 6.9, HEADY + 4.6);
    ghost(chin, 0.2, 0.16);
    const nose = new Path2D();
    nose.moveTo(-0.6, HEADY + 3.9);
    nose.quadraticCurveTo(0.4, HEADY + 4.5, 1.0, HEADY + 3.7);
    ghost(nose, 0.16, 0.15);
    const gap = new Path2D();
    gap.moveTo(0, -42.4);
    gap.lineTo(0, -36.0);
    ghost(gap, 0.1, 0.14);
    id(fg);
    fg.drawImage(G, 0, 0);
    fg.drawImage(R2, 0, 0);
    fg.drawImage(R, 0, 0);
    XR.fill = F;

    // ---- outer halo (lower resolution, blurred mask)
    const hq = q * 0.3;
    const [HL, hg] = figCanvas(hq);
    id(hg);
    hg.filter = `blur(${(3.2 * hq).toFixed(1)}px)`;
    hg.globalAlpha = 0.7;
    hg.drawImage(M, 0, 0, HL.width, HL.height);
    hg.filter = `blur(${(0.9 * hq).toFixed(1)}px)`;
    hg.globalAlpha = 0.85;
    hg.drawImage(M, 0, 0, HL.width, HL.height);
    hg.filter = "none";
    hg.globalAlpha = 1;
    hg.globalCompositeOperation = "source-in";
    hg.setTransform(hq, 0, 0, hq, -FB.x0 * hq, -FB.y0 * hq);
    gr = hg.createLinearGradient(-20, -100, 20, -20);
    gr.addColorStop(0, "#7fe6ff");
    gr.addColorStop(1, "#6a62ff");
    hg.fillStyle = gr;
    hg.fillRect(FB.x0, FB.y0, FB.x1 - FB.x0, FB.y1 - FB.y0);
    id(hg);
    const hd = hg.getImageData(0, 0, HL.width, HL.height);
    for (let i = 3; i < hd.data.length; i += 4) hd.data[i] = Math.max(0, (hd.data[i] - 6) * 1.025) | 0;
    hg.putImageData(hd, 0, 0);
    XR.halo = HL;

    // ---- depth field (units inside the silhouette) for the vessel generator
    const DQ = 5;
    const [DC, dg] = figCanvas(DQ);
    dg.fillStyle = "#fff";
    for (const p of parts) dg.fill(p);
    const dw = DC.width;
    const dh = DC.height;
    const img = dg.getImageData(0, 0, dw, dh).data;
    const d = new Float32Array(dw * dh);
    const BIG = 1e6;
    for (let i = 0; i < dw * dh; i++) d[i] = img[i * 4 + 3] > 127 ? BIG : 0;
    for (let y = 0; y < dh; y++)
      for (let x = 0; x < dw; x++) {
        const i = y * dw + x;
        if (d[i] === 0) continue;
        let v = d[i];
        if (x > 0) v = Math.min(v, d[i - 1] + 3);
        if (y > 0) {
          v = Math.min(v, d[i - dw] + 3);
          if (x > 0) v = Math.min(v, d[i - dw - 1] + 4);
          if (x < dw - 1) v = Math.min(v, d[i - dw + 1] + 4);
        }
        d[i] = v;
      }
    for (let y = dh - 1; y >= 0; y--)
      for (let x = dw - 1; x >= 0; x--) {
        const i = y * dw + x;
        if (d[i] === 0) continue;
        let v = d[i];
        if (x < dw - 1) v = Math.min(v, d[i + 1] + 3);
        if (y < dh - 1) {
          v = Math.min(v, d[i + dw] + 3);
          if (x < dw - 1) v = Math.min(v, d[i + dw + 1] + 4);
          if (x > 0) v = Math.min(v, d[i + dw - 1] + 4);
        }
        d[i] = v;
      }
    for (let i = 0; i < dw * dh; i++) d[i] = d[i] / 3 / DQ;
    XR.depth = { d, w: dw, h: dh, q: DQ };
  }
  function depthAt(x, y) {
    const D = XR.depth;
    const fx = (x - FB.x0) * D.q - 0.5;
    const fy = (y - FB.y0) * D.q - 0.5;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    if (i < 0 || j < 0 || i >= D.w - 1 || j >= D.h - 1) return -1;
    const u = fx - i;
    const v = fy - j;
    const k = j * D.w + i;
    const a = D.d[k];
    const b = D.d[k + 1];
    const c = D.d[k + D.w];
    const e = D.d[k + D.w + 1];
    return lerp(lerp(a, b, u), lerp(c, e, u), v);
  }
  function gradAt(x, y) {
    const h = 0.4;
    return [depthAt(x + h, y) - depthAt(x - h, y), depthAt(x, y + h) - depthAt(x, y - h)];
  }

  // ------------------------------------------------------------------ vessel network
  const BW = [0.5, 0.34, 0.22, 0.14, 0.075]; // stroke width per bucket (units)
  const NET = { chains: [], A: [[], [], [], [], []], V: [[], [], [], [], []] };
  function addChain(type, b, pts, d0, parent, attach) {
    const n = pts.length;
    const xy = new Float32Array(n * 2);
    const d = new Float32Array(n);
    let acc = d0;
    for (let i = 0; i < n; i++) {
      if (i > 0) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      xy[i * 2] = pts[i][0];
      xy[i * 2 + 1] = pts[i][1];
      d[i] = acc;
    }
    const ch = { type, b, xy, d, n, parent, attach, len: acc - d0 };
    NET.chains.push(ch);
    NET[type][b].push(ch);
    return ch;
  }
  function nearestIdx(ch, x, y) {
    let best = 0;
    let bd = 1e9;
    for (let i = 0; i < ch.n; i++) {
      const dd = (ch.xy[i * 2] - x) ** 2 + (ch.xy[i * 2 + 1] - y) ** 2;
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    }
    return best;
  }
  function idxAtArc(ch, s) {
    const target = ch.d[0] + s;
    let i = 0;
    while (i < ch.n - 1 && ch.d[i + 1] <= target) i++;
    return i;
  }
  function chainAng(ch, i) {
    const a = Math.max(0, i - 1);
    const b = Math.min(ch.n - 1, i + 1);
    return Math.atan2(ch.xy[b * 2 + 1] - ch.xy[a * 2 + 1], ch.xy[b * 2] - ch.xy[a * 2]);
  }
  // a hand-placed trunk: raw control points, attached to the nearest vertex of its parent
  function trunk(type, b, raw, parent) {
    let d0 = 0;
    let attach = -1;
    if (parent) {
      attach = nearestIdx(parent, raw[0][0], raw[0][1]);
      raw = [[parent.xy[attach * 2], parent.xy[attach * 2 + 1]]].concat(raw.slice(1));
      d0 = parent.d[attach];
    }
    return addChain(type, b, crOpen(raw, 0.35), d0, parent, attach);
  }
  const MARGIN = 0.42;
  function grow(type, x, y, a, len, b, d0, parent, attach, lvl, rng, o) {
    const pts = [[x, y]];
    const step = 0.32;
    let tr = 0;
    const curl = (rng() - 0.5) * 0.08 + (o.curl ? o.curl * (Math.cos(a) >= 0 ? 1 : -1) : 0);
    while (tr < len) {
      a += curl + (rng() - 0.5) * 0.2;
      let nx = x + Math.cos(a) * step;
      let ny = y + Math.sin(a) * step;
      let dep = depthAt(nx, ny);
      if (dep < MARGIN) {
        const g = gradAt(x, y);
        const ga = Math.atan2(g[1], g[0]);
        const t1 = ga + Math.PI / 2;
        const t2 = ga - Math.PI / 2;
        const tg = Math.abs(angDiff(a, t1)) < Math.abs(angDiff(a, t2)) ? t1 : t2;
        a = tg + angDiff(tg, ga) * 0.3;
        nx = x + Math.cos(a) * step;
        ny = y + Math.sin(a) * step;
        dep = depthAt(nx, ny);
        if (dep < MARGIN * 0.5) break;
      }
      x = nx;
      y = ny;
      tr += step;
      pts.push([x, y]);
    }
    if (pts.length < 4) return null;
    const ch = addChain(type, b, pts, d0, parent, attach);
    if (lvl > 0 && tr > 2.2) {
      sprout(ch, rng, { gap: [1.1, 2.0], len: [len * 0.32, len * 0.55], ang: [0.45, 0.95], b: Math.min(4, b + 1), lvl: lvl - 1, from: 0.7 });
    }
    fringe(ch, rng);
    return ch;
  }
  function fringe(ch, rng) {
    const i = ch.n - 1;
    const x0 = ch.xy[i * 2];
    const y0 = ch.xy[i * 2 + 1];
    const a0 = chainAng(ch, i);
    const n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      let a = a0 + (k - (n - 1) / 2) * 0.48 + (rng() - 0.5) * 0.3;
      let x = x0;
      let y = y0;
      const pts = [[x, y]];
      const L = 0.45 + rng() * 0.8;
      for (let s = 0; s < L; s += 0.22) {
        a += (rng() - 0.5) * 0.5;
        const nx = x + Math.cos(a) * 0.22;
        const ny = y + Math.sin(a) * 0.22;
        if (depthAt(nx, ny) < 0.12) break;
        x = nx;
        y = ny;
        pts.push([x, y]);
      }
      if (pts.length >= 2) {
        const tw = addChain(ch.type, 4, pts, ch.d[i], ch, i);
        if (rng() < 0.45 && pts.length >= 3) {
          // a tiny fork off the twig
          const j = tw.n - 1;
          const b2 = a + (rng() < 0.5 ? 0.6 : -0.6);
          const p2 = [[tw.xy[j * 2], tw.xy[j * 2 + 1]]];
          let xx = p2[0][0];
          let yy = p2[0][1];
          for (let s = 0; s < 0.5; s += 0.22) {
            xx += Math.cos(b2) * 0.22;
            yy += Math.sin(b2) * 0.22;
            if (depthAt(xx, yy) < 0.1) break;
            p2.push([xx, yy]);
          }
          if (p2.length >= 2) addChain(ch.type, 4, p2, tw.d[j], tw, j);
        }
      }
    }
  }
  // side branches along a chain. o: { gap, len, ang, b, lvl, from, to, yMin, yMax, side, curl }
  function sprout(ch, rng, o) {
    const L = ch.len;
    const s1 = Math.min(o.to == null ? L : o.to, L - 0.3);
    let s = (o.from || 0) + o.gap[0] * rng();
    let k = Math.floor(rng() * 2);
    while (s < s1) {
      const i = idxAtArc(ch, s);
      const x = ch.xy[i * 2];
      const y = ch.xy[i * 2 + 1];
      const okY = (o.yMin == null || y >= o.yMin) && (o.yMax == null || y <= o.yMax);
      if (okY) {
        const sides = o.pair ? [-1, 1] : [o.side || (k % 2 ? 1 : -1)];
        for (const sd of sides) {
          const a = chainAng(ch, i) + sd * lerp(o.ang[0], o.ang[1], rng());
          grow(ch.type, x, y, a, lerp(o.len[0], o.len[1], rng()), o.b, ch.d[i], ch, i, o.lvl, rng, o);
        }
      }
      k++;
      s += lerp(o.gap[0], o.gap[1], rng());
    }
  }

  function buildNet() {
    const rng = EX.rng(20251103);
    const A = (p) => armPts(-1, p);
    const Ar = (p) => armPts(1, p);
    const mx = (p) => p.map((q) => [-q[0], q[1]]);
    const ARM_ART = [[-14.6, -67.6], [-15.0, -63.5], [-15.2, -58.0], [-15.4, -53.5], [-15.8, -49.8], [-16.1, -46.6], [-16.3, -44.0], [-16.5, -41.8]];
    const ARM_ULN = [[-15.4, -53.5], [-14.9, -49.4], [-14.8, -46.2], [-15.0, -44.0], [-15.3, -41.6]];
    const ARM_BAS = [[-14.4, -67.4], [-14.3, -62.0], [-14.4, -56.5], [-14.5, -51.5], [-14.7, -47.0], [-14.8, -44.2], [-14.7, -41.9]];
    const ARM_CEPH = [[-16.0, -70.0], [-17.2, -67.4], [-17.8, -63.0], [-18.0, -58.0], [-17.9, -53.0], [-17.6, -49.4], [-17.0, -46.6], [-16.9, -44.0], [-17.1, -41.6]];
    const DIG_A = [
      [[-16.5, -41.8], [-17.2, -39.8], [-17.3, -38.4]],
      [[-16.5, -41.8], [-16.4, -39.4], [-16.3, -37.5]],
      [[-15.3, -41.6], [-15.4, -39.3], [-15.3, -37.3]],
      [[-15.3, -41.6], [-14.7, -39.8], [-14.6, -38.1]],
    ];
    // ---------------- arteries
    const aorta = trunk("A", 0, [[3.3, -63.4], [3.0, -65.6], [2.6, -68.2], [2.9, -70.3], [3.8, -70.8], [4.5, -69.8], [4.4, -67.4], [3.7, -64.2], [2.8, -60.0], [2.0, -55.0], [1.4, -50.0], [0.9, -46.2], [0.6, -44.4]], null);
    const brach = trunk("A", 1, [[2.7, -69.4], [1.4, -70.9], [-0.6, -71.6], [-3.8, -72.5], [-7.6, -72.4], [-10.8, -71.4], [-13.0, -69.9]].concat(A(ARM_ART)), aorta);
    const lsub = trunk("A", 1, [[4.3, -70.2], [6.4, -71.9], [9.6, -72.3], [12.0, -71.3], [13.4, -69.8]].concat(Ar(ARM_ART)), aorta);
    const CAR = [[-0.6, -71.6], [-1.3, -73.6], [-1.6, -76.4], [-2.0, -79.2], [-3.3, -81.6], [-5.0, -83.0], [-6.0, -85.4], [-6.2, -88.0]];
    const rcar = trunk("A", 1, CAR, brach);
    const lcar = trunk("A", 1, [[3.3, -70.7], [2.2, -73.4]].concat(mx(CAR).slice(2)), aorta);
    const FAC = [[-3.3, -81.6], [-4.4, -82.9], [-4.1, -84.4], [-2.8, -85.2], [-1.6, -86.8]];
    const rfac = trunk("A", 2, FAC, rcar);
    const lfac = trunk("A", 2, mx(FAC), lcar);
    const STA_F = [[-6.2, -88.0], [-5.6, -91.4], [-4.0, -94.6], [-1.6, -97.4]];
    const STA_P = [[-6.2, -88.0], [-7.3, -91.6], [-6.9, -95.2], [-5.0, -98.8]];
    const SUPRA = [[-1.6, -86.8], [-1.9, -89.6], [-1.3, -92.8]];
    const scalpA = [
      trunk("A", 2, STA_F, rcar), trunk("A", 2, mx(STA_F), lcar),
      trunk("A", 3, STA_P, rcar), trunk("A", 3, mx(STA_P), lcar),
      trunk("A", 3, SUPRA, rfac), trunk("A", 3, mx(SUPRA), lfac),
    ];
    const ILA = [[0.6, -44.4], [-1.6, -43.0], [-3.8, -41.2], [-5.4, -38.6], [-6.0, -33.0], [-5.9, -26.0], [-5.6, -18.0], [-5.4, -11.0], [-5.3, -6.4], [-5.4, -3.6]];
    const ilaL = trunk("A", 1, ILA, aorta);
    const ilaR = trunk("A", 1, mx(ILA).map((q, i) => (i === 0 ? [0.6, -44.4] : [q[0] + 0.4, q[1]])), aorta);
    const ulnL = trunk("A", 2, A(ARM_ULN), brach);
    const ulnR = trunk("A", 2, Ar(ARM_ULN), lsub);
    const digs = [];
    for (const s of [-1, 1]) {
      const rad = s < 0 ? brach : lsub;
      const uln = s < 0 ? ulnL : ulnR;
      DIG_A.forEach((p, k) => digs.push(trunk("A", 3, armPts(s, p), k < 2 ? rad : uln)));
    }
    // ---------------- veins
    const svc = trunk("V", 0, [[1.6, -63.4], [1.2, -66.0], [0.7, -68.6], [0.4, -70.3]], null);
    const BCV = [[0.4, -70.3], [-1.6, -71.6], [-3.4, -72.6], [-6.8, -73.2], [-10.4, -72.8], [-12.8, -71.6], [-14.0, -70.3]];
    const bcvR = trunk("V", 1, BCV.concat(A(ARM_BAS)), svc);
    const bcvL = trunk("V", 1, mx(BCV).concat(Ar(ARM_BAS)), svc);
    const cephR = trunk("V", 1, [[-12.8, -71.6], [-14.6, -71.0]].concat(A(ARM_CEPH)), bcvR);
    const cephL = trunk("V", 1, mx([[-12.8, -71.6], [-14.6, -71.0]]).concat(Ar(ARM_CEPH)), bcvL);
    const JUG = [[-3.4, -72.6], [-2.8, -74.8], [-2.6, -78.4], [-3.8, -81.2], [-6.0, -82.6], [-7.0, -85.0], [-7.3, -87.6]];
    const jugR = trunk("V", 1, JUG, bcvR);
    const jugL = trunk("V", 1, mx(JUG), bcvL);
    const SCV = [[-7.3, -87.6], [-6.4, -92.2], [-4.8, -96.0], [-2.6, -98.8]];
    const SCV2 = [[-7.3, -87.6], [-8.0, -91.0], [-7.6, -94.2]];
    const scalpV = [trunk("V", 2, SCV, jugR), trunk("V", 2, mx(SCV), jugL), trunk("V", 3, SCV2, jugR), trunk("V", 3, mx(SCV2), jugL)];
    trunk("V", 2, A([[-17.9, -53.4], [-16.6, -52.5], [-15.0, -51.2]]), cephR);
    trunk("V", 2, Ar([[-17.9, -53.4], [-16.6, -52.5], [-15.0, -51.2]]), cephL);
    for (const s of [-1, 1]) {
      const ce = s < 0 ? cephR : cephL;
      const ba = s < 0 ? bcvR : bcvL;
      trunk("V", 3, armPts(s, [[-17.1, -41.6], [-17.3, -39.6], [-17.0, -38.0]]), ce);
      trunk("V", 3, armPts(s, [[-14.7, -41.9], [-14.9, -39.6], [-14.9, -37.8]]), ba);
      trunk("V", 3, armPts(s, [[-14.7, -41.9], [-15.8, -40.2], [-15.9, -37.4]]), ba);
    }
    const ivc = trunk("V", 0, [[1.8, -60.2], [0.6, -58.6], [-0.6, -55.6], [-0.9, -51.0], [-0.8, -46.6], [-0.4, -44.6]], null);
    const ILV = [[-0.4, -44.6], [-2.4, -43.4], [-4.0, -41.6], [-4.6, -38.6], [-4.6, -33.0], [-4.5, -26.0], [-4.2, -18.0], [-4.1, -11.0], [-4.2, -6.4], [-4.4, -3.6]];
    const ilvL = trunk("V", 1, ILV, ivc);
    const ilvR = trunk("V", 1, ILV.map((q, i) => (i === 0 ? q : [-q[0] - 0.4, q[1]])), ivc);
    const SAPH = [[-4.6, -38.6], [-3.0, -35.6], [-2.3, -30.0], [-2.2, -22.0], [-2.6, -14.0], [-3.0, -8.0]];
    const saL = trunk("V", 2, SAPH, ilvL);
    const saR = trunk("V", 2, SAPH.map((q) => [-q[0] - 0.4, q[1]]), ilvR);

    // ---------------- procedural branches
    const head = { gap: [1.5, 2.4], len: [2.6, 4.8], ang: [0.45, 1.0], b: 3, lvl: 1, yMax: -81.5 };
    const arm = { gap: [1.5, 2.6], len: [2.0, 4.0], ang: [0.32, 0.75], b: 3, lvl: 1 };
    const leg = { gap: [2.0, 3.2], len: [2.6, 5.0], ang: [0.28, 0.65], b: 3, lvl: 1, yMin: -38 };
    // thorax: intercostal-like pairs off the descending aorta, curving down like ribs
    sprout(aorta, rng, { gap: [2.0, 2.5], len: [8.5, 11.5], ang: [1.3, 1.5], b: 3, lvl: 0, yMin: -66.5, yMax: -56.5, pair: true, curl: 0.035, from: 8 });
    // abdomen: mesenteric fan and renal branches
    sprout(aorta, rng, { gap: [1.5, 2.3], len: [3.5, 6.0], ang: [0.6, 1.35], b: 3, lvl: 1, yMin: -55.5, yMax: -45.5, from: 8 });
    // shoulders and upper chest off the subclavians
    sprout(brach, rng, { gap: [2.2, 3.2], len: [3.0, 5.0], ang: [0.9, 1.4], b: 3, lvl: 1, from: 3, to: 15 });
    sprout(lsub, rng, { gap: [2.2, 3.2], len: [3.0, 5.0], ang: [0.9, 1.4], b: 3, lvl: 1, from: 3, to: 12 });
    sprout(brach, rng, { ...arm, from: 16 });
    sprout(lsub, rng, { ...arm, from: 13 });
    sprout(ulnL, rng, { ...arm, len: [1.6, 3.0], from: 1.5 });
    sprout(ulnR, rng, { ...arm, len: [1.6, 3.0], from: 1.5 });
    for (const c of [rcar, lcar]) sprout(c, rng, { ...head, from: 6 });
    for (const c of [rfac, lfac]) sprout(c, rng, { ...head, len: [1.6, 3.0], from: 1 });
    for (const c of scalpA) sprout(c, rng, { ...head, gap: [2.0, 3.0], len: [1.6, 3.0], from: 1.0, yMax: -84, lvl: 0 });
    for (const c of scalpA) fringe(c, rng);
    for (const c of [ilaL, ilaR]) sprout(c, rng, { ...leg, from: 6 });
    for (const c of digs) fringe(c, rng);
    // veins
    sprout(bcvR, rng, { gap: [2.4, 3.4], len: [3.0, 5.5], ang: [0.9, 1.4], b: 3, lvl: 1, from: 4, to: 14 });
    sprout(bcvL, rng, { gap: [2.4, 3.4], len: [3.0, 5.5], ang: [0.9, 1.4], b: 3, lvl: 1, from: 4, to: 14 });
    sprout(bcvR, rng, { ...arm, from: 16 });
    sprout(bcvL, rng, { ...arm, from: 16 });
    sprout(cephR, rng, { ...arm, gap: [1.8, 3.0], from: 5 });
    sprout(cephL, rng, { ...arm, gap: [1.8, 3.0], from: 5 });
    for (const c of [jugR, jugL]) sprout(c, rng, { ...head, gap: [1.6, 2.6], yMax: -81 });
    for (const c of scalpV) sprout(c, rng, { ...head, gap: [2.4, 3.4], len: [1.6, 2.8], from: 1.2, yMax: -84, lvl: 0 });
    for (const c of scalpV) fringe(c, rng);
    sprout(ivc, rng, { gap: [1.6, 2.4], len: [4.0, 7.0], ang: [0.9, 1.4], b: 3, lvl: 1, yMin: -58, yMax: -46, from: 2 });
    for (const c of [ilvL, ilvR]) sprout(c, rng, { ...leg, gap: [2.4, 3.6], from: 6 });
    for (const c of [saL, saR]) sprout(c, rng, { ...leg, gap: [2.6, 3.8], len: [1.8, 3.2] });
    for (const c of NET.V[3].slice()) if (c.n > 2 && c.parent && (c.parent === cephR || c.parent === cephL || c.parent === bcvR || c.parent === bcvL)) fringe(c, rng);

    // ---------------- static paths, flow chains, distance ranges
    NET.rest = { A: [], V: [] };
    for (const T of ["A", "V"])
      for (let b = 0; b < 5; b++) {
        const p = new Path2D();
        for (const ch of NET[T][b]) {
          p.moveTo(ch.xy[0], ch.xy[1]);
          for (let i = 1; i < ch.n; i++) p.lineTo(ch.xy[i * 2], ch.xy[i * 2 + 1]);
        }
        NET.rest[T][b] = p;
      }
    const range = (T, upper) => {
      let m = 0;
      for (const ch of NET.chains) {
        if (ch.type !== T) continue;
        for (let i = 0; i < ch.n; i++) if (!upper || ch.xy[i * 2 + 1] < -30) m = Math.max(m, ch.d[i]);
      }
      return m;
    };
    NET.dA = [range("A", true), range("A", false)];
    NET.dV = [range("V", true), range("V", false)];
    NET.flow = NET.chains.filter((c) => c.b <= 1);
    NET.ceph = cephL;
    NET.svc = svc;

    // ---------------- the shortcut route: site -> nearest stretch of the cephalic vein -> heart
    const i0 = nearestIdx(cephL, SITE[0], SITE[1]);
    const ie = Math.max(1, idxAtArc(cephL, Math.max(0.5, cephL.d[i0] - cephL.d[0] - 2.2)));
    const route = [];
    const ex = cephL.xy[ie * 2];
    const ey = cephL.xy[ie * 2 + 1];
    const cx = (SITE[0] + ex) / 2 + 0.9;
    const cy = (SITE[1] + ey) / 2 + 0.6;
    for (let k = 0; k <= 8; k++) {
      const u = k / 8;
      route.push([(1 - u) * (1 - u) * SITE[0] + 2 * (1 - u) * u * cx + u * u * ex, (1 - u) * (1 - u) * SITE[1] + 2 * (1 - u) * u * cy + u * u * ey]);
    }
    let c = cephL;
    let i = ie - 1;
    while (c) {
      for (let k = i; k >= 0; k--) route.push([c.xy[k * 2], c.xy[k * 2 + 1]]);
      if (!c.parent) break;
      i = c.attach;
      c = c.parent;
    }
    route.push([HC[0] - 0.6, HC[1] + 0.2]);
    const dec = [route[0]];
    for (const p of route) {
      const l = dec[dec.length - 1];
      if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 0.9) dec.push(p);
    }
    const rp = crOpen(dec, 0.25);
    NET.route = { pts: rp, c: cumLen(rp) };
  }

  // ------------------------------------------------------------------ x-ray background
  const BGM = 170;
  function buildXrayBg() {
    const c = canvas(W + 2 * BGM, H + 2 * BGM);
    const g = c.getContext("2d");
    g.translate(BGM, BGM);
    const gr = g.createLinearGradient(0, -BGM, 0, H + BGM);
    gr.addColorStop(0, LOCAL.fieldTop);
    gr.addColorStop(0.55, LOCAL.fieldMid);
    gr.addColorStop(1, LOCAL.fieldBot);
    g.fillStyle = gr;
    g.fillRect(-BGM, -BGM, W + 2 * BGM, H + 2 * BGM);
    const pool = (x, y, r, col, a) => {
      const p = g.createRadialGradient(x, y, 0, x, y, r);
      p.addColorStop(0, rgba(col, a));
      p.addColorStop(0.5, rgba(col, a * 0.35));
      p.addColorStop(1, rgba(col, 0));
      g.fillStyle = p;
      g.fillRect(x - r, y - r, 2 * r, 2 * r);
    };
    pool(900, 540, 760, [96, 60, 230], 0.34);
    pool(900, 600, 420, [120, 90, 255], 0.14);
    pool(1600, 920, 620, [214, 46, 170], 0.15);
    pool(230, 140, 560, [64, 150, 255], 0.1);
    pool(1660, 160, 500, [120, 80, 255], 0.1);
    pool(240, 980, 520, [150, 40, 190], 0.1);
    // a faint diagram grid of dots and small plus marks, fading toward the frame edges
    for (let y = -BGM + 12; y < H + BGM; y += 48)
      for (let x = -BGM + 12; x < W + BGM; x += 48) {
        const f = clamp(1.25 - Math.hypot((x - 900) / 1150, (y - 540) / 760));
        if (f <= 0.02) continue;
        const plus = Math.round((x + BGM - 12) / 48) % 4 === 0 && Math.round((y + BGM - 12) / 48) % 4 === 0;
        if (plus) {
          g.fillStyle = rgba(LOCAL.gridDot, 0.3 * f);
          g.fillRect(x - 5, y - 0.8, 10, 1.6);
          g.fillRect(x - 0.8, y - 5, 1.6, 10);
        } else {
          g.fillStyle = rgba(LOCAL.gridDot, 0.2 * f);
          g.beginPath();
          g.arc(x, y, 1.4, 0, TAU);
          g.fill();
        }
      }
    return c;
  }

  // ------------------------------------------------------------------ heart shapes (local, r = 1)
  const HEART = {};
  function buildHeart() {
    const body = new Path2D();
    body.moveTo(-0.56, -0.3);
    body.bezierCurveTo(-0.86, -0.02, -0.66, 0.5, 0.14, 0.96);
    body.bezierCurveTo(0.58, 0.64, 0.88, 0.3, 0.8, -0.12);
    body.bezierCurveTo(0.74, -0.44, 0.42, -0.52, 0.16, -0.4);
    body.bezierCurveTo(-0.04, -0.5, -0.36, -0.5, -0.56, -0.3);
    body.closePath();
    HEART.body = body;
    const shade = new Path2D();
    shade.moveTo(0.4, -0.6);
    shade.bezierCurveTo(0.2, -0.1, 0.32, 0.42, 0.02, 1.15);
    shade.lineTo(1.3, 1.2);
    shade.lineTo(1.3, -0.7);
    shade.closePath();
    HEART.shade = shade;
    const deep = new Path2D();
    deep.moveTo(0.9, -0.25);
    deep.bezierCurveTo(0.84, 0.36, 0.5, 0.78, 0.0, 1.06);
    deep.lineTo(1.3, 1.3);
    deep.lineTo(1.3, -0.3);
    deep.closePath();
    HEART.deep = deep;
    const lit = new Path2D();
    lit.moveTo(-0.38, -0.2);
    lit.bezierCurveTo(-0.6, 0.05, -0.42, 0.42, 0.04, 0.66);
    lit.bezierCurveTo(0.12, 0.38, 0.14, 0.05, 0.08, -0.22);
    lit.bezierCurveTo(-0.04, -0.34, -0.24, -0.34, -0.38, -0.2);
    lit.closePath();
    HEART.lit = lit;
    const groove = new Path2D();
    groove.moveTo(0.13, -0.38);
    groove.bezierCurveTo(0.2, -0.05, 0.3, 0.38, 0.22, 0.84);
    groove.moveTo(-0.3, -0.27);
    groove.bezierCurveTo(-0.5, -0.12, -0.58, 0.1, -0.52, 0.3);
    HEART.groove = groove;
    const twig = new Path2D();
    twig.moveTo(0.19, -0.06);
    twig.quadraticCurveTo(0.06, 0.06, -0.06, 0.22);
    twig.moveTo(0.25, 0.3);
    twig.quadraticCurveTo(0.4, 0.34, 0.52, 0.45);
    twig.moveTo(0.22, 0.12);
    twig.quadraticCurveTo(0.38, 0.06, 0.55, 0.1);
    HEART.twig = twig;
    const pa = new Path2D();
    pa.moveTo(-0.06, -0.34);
    pa.bezierCurveTo(-0.08, -0.6, -0.2, -0.72, -0.42, -0.74);
    HEART.pa = pa;
    const arch = new Path2D();
    arch.moveTo(0.02, -0.3);
    arch.bezierCurveTo(-0.02, -0.62, -0.1, -0.84, -0.2, -1.0);
    HEART.arch = arch;
  }
  // lub-dub contraction 0..~1 (lub right after the beat, a smaller dub ~0.27 s later)
  const bump = (u, w) => (u <= 0 ? 0 : (u / w) * Math.exp(1 - u / w));
  function beatClock(t, bpm) {
    const T = 60 / Math.max(20, bpm || 75);
    const ph = (((t + 0.1) / T) % 1 + 1) % 1;
    return { T, s: ph * T };
  }
  function pulse(t, bpm) {
    const { s } = beatClock(t, bpm);
    return clamp(bump(s - 0.02, 0.07) + 0.55 * bump(s - 0.27, 0.06), 0, 1.2);
  }

  // ------------------------------------------------------------------ gut paths (Path2D, units)
  const GUT = {};
  function buildGut() {
    GUT.oes = crOpen(OES, 0.25);
    GUT.oesP = polyPath(GUT.oes);
    GUT.stom = P2(STOM);
    GUT.si = crOpen(smallGutPts(), 0.2);
    GUT.siP = polyPath(GUT.si);
    GUT.siC = cumLen(GUT.si);
    GUT.colon = crOpen(COLON, 0.2);
    GUT.colonP = polyPath(GUT.colon);
    GUT.colonC = cumLen(GUT.colon);
    // rugae inside the stomach: wavy lines parallel to its mid line
    const mid = crOpen(STOM_MID, 0.2);
    const rug = new Path2D();
    for (const k of [-1.15, -0.45, 0.25, 0.95]) {
      for (let i = 0; i < mid.length; i++) {
        const a = mid[Math.max(0, i - 1)];
        const b = mid[Math.min(mid.length - 1, i + 1)];
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const off = k * (0.75 + 0.25 * Math.sin(i * 0.15)) + 0.16 * Math.sin(i * 0.9 + k * 4);
        const x = mid[i][0] - Math.sin(ang) * off;
        const y = mid[i][1] + Math.cos(ang) * off;
        if (i === 0) rug.moveTo(x, y);
        else rug.lineTo(x, y);
      }
    }
    GUT.rugae = rug;
    // haustra pinches across the colon
    const hp = new Path2D();
    const L = GUT.colonC[GUT.colonC.length - 1];
    for (let s = 0.8; s < L - 0.6; s += 1.05) {
      const p = polyAt(GUT.colon, GUT.colonC, s);
      const nx = -Math.sin(p[2]);
      const ny = Math.cos(p[2]);
      hp.moveTo(p[0] - nx * 0.62, p[1] - ny * 0.62);
      hp.quadraticCurveTo(p[0] + Math.cos(p[2]) * 0.22, p[1] + Math.sin(p[2]) * 0.22, p[0] + nx * 0.62, p[1] + ny * 0.62);
    }
    GUT.haustra = hp;
    const sw = crOpen(OES.concat(SW_TAIL), 0.2);
    GUT.sw = sw;
    GUT.swC = cumLen(sw);
    GUT.swOesEnd = cumLen(GUT.oes)[GUT.oes.length - 1];
  }

  // ================================================================== X-RAY draw
  function breathe(t) {
    const b = Math.sin(TAU * 0.25 * t + 0.6);
    return [1 + 0.0035 * b, 1 + 0.006 * b];
  }
  function bodyTransform(ctx, t) {
    const [bx, by] = breathe(t);
    ctx.translate(FIG.x, FIG.y);
    ctx.scale(FIG.s, FIG.s);
    ctx.translate(0, HIP);
    ctx.scale(bx, by);
    ctx.translate(0, -HIP);
  }
  function bodyPt(o, x, y) {
    const t = o.t || 0;
    const [bx, by] = breathe(t);
    const ux = x * bx;
    const uy = HIP + (y - HIP) * by;
    return camPt(camOf(o), FIG.x + ux * FIG.s, FIG.y + uy * FIG.s);
  }

  function xrBackground(ctx, t, cm) {
    ctx.save();
    ctx.fillStyle = LOCAL.fieldMid;
    ctx.fillRect(0, 0, W, H);
    const pz = 1 + (cm.z - 1) * 0.35;
    ctx.translate(CX + cm.x * 0.4, CY + cm.y * 0.4);
    ctx.scale(pz, pz);
    ctx.translate(-CX, -CY);
    ctx.drawImage(XR.bg, -BGM, -BGM);
    ctx.globalCompositeOperation = "lighter";
    // breathing light pools
    const b1 = 0.5 + 0.5 * Math.sin(t * 0.55);
    const b2 = 0.5 + 0.5 * Math.sin(t * 0.43 + 2.1);
    ctx.globalAlpha = 0.1 + 0.06 * b1;
    ctx.drawImage(SPR.violet, 900 - 700, 520 - 700, 1400, 1400);
    ctx.globalAlpha = 0.06 + 0.05 * b2;
    ctx.drawImage(SPR.cyan, 1500 - 500, 260 - 500, 1000, 1000);
    // drifting motes
    for (let i = 0; i < 54; i++) {
      const sp = 4 + 10 * HS(i, 2);
      const x = ((HS(i, 1) * 2300 + t * sp) % 2300) - 190;
      const y = HS(i, 3) * 1180 - 50 + 18 * Math.sin(t * (0.2 + 0.2 * HS(i, 7)) + i);
      const s = 3 + 9 * HS(i, 4) * HS(i, 4);
      const tw = 0.55 + 0.45 * Math.sin(t * (0.6 + HS(i, 6)) + i * 1.7);
      ctx.globalAlpha = (0.18 + 0.4 * HS(i, 5)) * tw;
      ctx.drawImage(HS(i, 8) < 0.6 ? SPR.cyan : SPR.violet, x - s, y - s, s * 2, s * 2);
    }
    ctx.restore();
  }

  function vesselsRest(ctx, t, beat, bpm) {
    const P = HOUSE.pal;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const life = 0.9 + 0.1 * beat;
    // halos
    ctx.globalCompositeOperation = "lighter";
    for (let b = 0; b <= 2; b++) {
      ctx.lineWidth = BW[b] * 3.4;
      ctx.strokeStyle = rgba(P.veinLight, 0.07 * life);
      ctx.stroke(NET.rest.V[b]);
      ctx.strokeStyle = rgba(P.artery, 0.08 * life);
      ctx.stroke(NET.rest.A[b]);
    }
    ctx.globalCompositeOperation = "source-over";
    const aV = [0.62, 0.56, 0.5, 0.46, 0.36];
    const aA = [0.7, 0.62, 0.56, 0.5, 0.4];
    for (let b = 4; b >= 0; b--) {
      ctx.lineWidth = BW[b];
      ctx.strokeStyle = rgba(LOCAL.veinRest, aV[b] * life);
      ctx.stroke(NET.rest.V[b]);
    }
    for (let b = 4; b >= 0; b--) {
      ctx.lineWidth = BW[b];
      ctx.strokeStyle = rgba(P.artery, aA[b] * life);
      ctx.stroke(NET.rest.A[b]);
    }
    // tube highlight on the big vessels
    ctx.save();
    ctx.translate(-0.07, -0.07);
    for (let b = 0; b <= 1; b++) {
      ctx.lineWidth = BW[b] * 0.32;
      ctx.strokeStyle = rgba(P.veinLight, 0.42);
      ctx.stroke(NET.rest.V[b]);
      ctx.strokeStyle = "rgba(255,170,180,0.5)";
      ctx.stroke(NET.rest.A[b]);
    }
    ctx.restore();
    // the pulse wave running out along the arteries on every beat
    const { T, s } = beatClock(t, bpm);
    ctx.globalCompositeOperation = "lighter";
    for (const age of [s, s + T]) {
      const P0 = age * 34;
      const fade = Math.exp(-P0 / 38) * (1 - sstep(1.3 * T, 2 * T, age)) * sstep(0, 0.04, age);
      if (fade < 0.05) continue;
      for (let b = 0; b <= 3; b++) {
        ctx.beginPath();
        for (const ch of NET.A[b]) {
          if (ch.d[0] > P0 || ch.d[ch.n - 1] < P0 - 3.2) continue;
          windowPath(ctx, ch, P0 - 3.2, P0);
        }
        ctx.lineWidth = BW[b] * 1.6;
        ctx.strokeStyle = `rgba(255,140,160,${(0.42 * fade).toFixed(3)})`;
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }
  // add the part of a chain with d in [d0, d1] to the current path
  function windowPath(ctx, ch, d0, d1) {
    const n = ch.n;
    const d = ch.d;
    const xy = ch.xy;
    let started = false;
    for (let i = 0; i < n - 1; i++) {
      const a = d[i];
      const b = d[i + 1];
      if (b < d0 || a > d1) continue;
      const u0 = a < d0 ? (d0 - a) / (b - a || 1) : 0;
      const u1 = b > d1 ? (d1 - a) / (b - a || 1) : 1;
      const x0 = xy[i * 2] + (xy[i * 2 + 2] - xy[i * 2]) * u0;
      const y0 = xy[i * 2 + 1] + (xy[i * 2 + 3] - xy[i * 2 + 1]) * u0;
      const x1 = xy[i * 2] + (xy[i * 2 + 2] - xy[i * 2]) * u1;
      const y1 = xy[i * 2 + 1] + (xy[i * 2 + 3] - xy[i * 2 + 1]) * u1;
      if (!started) {
        ctx.moveTo(x0, y0);
        started = true;
      }
      ctx.lineTo(x1, y1);
    }
  }
  // blood cells streaming along the big vessels (aqua-white where the medicine has arrived)
  function bloodCells(ctx, t, DA, DV) {
    const P = HOUSE.pal;
    const paths = { a: new Path2D(), v: new Path2D(), m: new Path2D() };
    for (const ch of NET.flow) {
      const L = ch.len;
      const sp = 1.5;
      const n = Math.floor(L / sp);
      const v = ch.type === "A" ? 7 : -4.5;
      const off = HS(ch.n, ch.b, 5) * sp;
      for (let k = 0; k < n; k++) {
        let s = (k * sp + off + t * v) % L;
        if (s < 0) s += L;
        const i = idxAtArcFast(ch, s);
        const u = (ch.d[0] + s - ch.d[i]) / (ch.d[i + 1] - ch.d[i] || 1);
        const x = ch.xy[i * 2] + (ch.xy[i * 2 + 2] - ch.xy[i * 2]) * u;
        const y = ch.xy[i * 2 + 1] + (ch.xy[i * 2 + 3] - ch.xy[i * 2 + 1]) * u;
        const lit = ch.d[0] + s < (ch.type === "A" ? DA : DV);
        const p = lit ? paths.m : ch.type === "A" ? paths.a : paths.v;
        const r = (ch.b === 0 ? 0.15 : 0.12) * sstep(0, 1.0, s) * sstep(0, 1.0, L - s);
        if (r < 0.02) continue;
        p.moveTo(x + r, y);
        p.arc(x, y, r, 0, TAU);
      }
    }
    ctx.fillStyle = "rgba(255,190,200,0.62)";
    ctx.fill(paths.a);
    ctx.fillStyle = "rgba(196,204,255,0.55)";
    ctx.fill(paths.v);
    ctx.fillStyle = rgba(P.medGlow, 0.95);
    ctx.fill(paths.m);
  }
  function idxAtArcFast(ch, s) {
    const target = ch.d[0] + s;
    let lo = 0;
    let hi = ch.n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ch.d[mid] <= target) lo = mid;
      else hi = mid;
    }
    return Math.min(lo, ch.n - 2);
  }

  // the medicine front: distances reached for a circ value
  function circDist(circ, d) {
    const up = d[0];
    const all = d[1];
    if (circ <= 0) return -1;
    if (circ < 0.9) return (circ / 0.9) * up;
    return up + ((circ - 0.9) / 0.1) * (all - up) + 0.5;
  }
  function litNetwork(ctx, t, DA, DV) {
    const P = HOUSE.pal;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const tips = [];
    for (const [T, D] of [["V", DV], ["A", DA]]) {
      if (D <= 0) continue;
      for (let b = 4; b >= 0; b--) {
        ctx.beginPath();
        for (const ch of NET[T][b]) {
          if (ch.d[0] >= D) continue;
          const n = ch.n;
          ctx.moveTo(ch.xy[0], ch.xy[1]);
          if (ch.d[n - 1] <= D) {
            for (let i = 1; i < n; i++) ctx.lineTo(ch.xy[i * 2], ch.xy[i * 2 + 1]);
          } else {
            let i = 1;
            while (i < n && ch.d[i] <= D) {
              ctx.lineTo(ch.xy[i * 2], ch.xy[i * 2 + 1]);
              i++;
            }
            const a = ch.d[i - 1];
            const u = (D - a) / (ch.d[i] - a || 1);
            const x = ch.xy[(i - 1) * 2] + (ch.xy[i * 2] - ch.xy[(i - 1) * 2]) * u;
            const y = ch.xy[(i - 1) * 2 + 1] + (ch.xy[i * 2 + 1] - ch.xy[(i - 1) * 2 + 1]) * u;
            ctx.lineTo(x, y);
            if (b <= 3) tips.push([x, y, b]);
          }
        }
        ctx.globalCompositeOperation = "lighter";
        ctx.lineWidth = Math.max(0.3, BW[b] * 3.6);
        ctx.strokeStyle = rgba(P.medGlow, b >= 3 ? 0.14 : 0.2);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        ctx.lineWidth = BW[b] * 1.08;
        ctx.strokeStyle = rgba(P.med, b === 4 ? 0.8 : 0.95);
        ctx.stroke();
        if (b <= 1) {
          ctx.lineWidth = BW[b] * 0.36;
          ctx.strokeStyle = "rgba(235,255,252,0.85)";
          ctx.stroke();
        }
      }
    }
    // glowing heads of the fronts
    ctx.globalCompositeOperation = "lighter";
    for (const [x, y, b] of tips) {
      const s = b <= 1 ? 1.5 : b === 2 ? 1.1 : 0.75;
      ctx.drawImage(SPR.aquaHot, x - s, y - s, s * 2, s * 2);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function gutDraw(ctx, t, g) {
    if (g <= 0.005) return;
    const P = HOUSE.pal;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // glow
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(P.gut, 0.07 * g);
    ctx.lineWidth = 2.4;
    ctx.stroke(GUT.oesP);
    ctx.lineWidth = 3.2;
    ctx.stroke(GUT.siP);
    ctx.lineWidth = 3.8;
    ctx.stroke(GUT.colonP);
    ctx.lineWidth = 2.6;
    ctx.stroke(GUT.stom);
    ctx.fillStyle = rgba(P.gut, 0.12 * g);
    ctx.fill(GUT.stom);
    ctx.globalCompositeOperation = "source-over";
    const tube = (path, w, a) => {
      ctx.save();
      ctx.translate(0.12, 0.14);
      ctx.lineWidth = w;
      ctx.strokeStyle = rgba(P.stomachDeep, 0.5 * a);
      ctx.stroke(path);
      ctx.restore();
      ctx.lineWidth = w;
      ctx.strokeStyle = rgba(P.stomachShade, 0.62 * a);
      ctx.stroke(path);
      ctx.lineWidth = w * 0.7;
      ctx.strokeStyle = rgba(P.gut, 0.62 * a);
      ctx.stroke(path);
      ctx.lineWidth = w * 0.24;
      ctx.strokeStyle = rgba(P.stomachDeep, 0.38 * a);
      ctx.stroke(path);
      ctx.save();
      ctx.translate(-w * 0.17, -w * 0.17);
      ctx.lineWidth = w * 0.13;
      ctx.strokeStyle = rgba(LOCAL.gutHi, 0.62 * a);
      ctx.stroke(path);
      ctx.restore();
    };
    tube(GUT.colonP, 1.45, g);
    ctx.lineWidth = 0.13;
    ctx.strokeStyle = rgba(P.stomachDeep, 0.6 * g);
    ctx.stroke(GUT.haustra);
    tube(GUT.siP, 0.8, g);
    // a slow peristaltic glint travelling along the small intestine
    const L = GUT.siC[GUT.siC.length - 1];
    const ps = ((t * 4.2) % (L + 8)) - 4;
    ctx.beginPath();
    subPoly(ctx, GUT.si, GUT.siC, ps - 2.2, ps);
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = rgba(LOCAL.gutHi, 0.4 * g);
    ctx.stroke();
    tube(GUT.oesP, 0.74, g);
    // mouth
    ctx.fillStyle = rgba(P.stomachShade, 0.75 * g);
    ctx.beginPath();
    ctx.ellipse(0, -80.45, 1.5, 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(P.gut, 0.75 * g);
    ctx.beginPath();
    ctx.ellipse(0, -80.6, 1.1, 0.28, 0, 0, TAU);
    ctx.fill();
    // stomach: translucent fill, cel shadow, rugae, rim
    const S = GUT.stom;
    ctx.fillStyle = rgba(P.gut, 0.42 * g);
    ctx.fill(S);
    ctx.save();
    ctx.clip(S);
    cres(ctx, S, KEY[0] * 1.0, KEY[1] * 1.0, rgba(P.stomachDeep, 0.5 * g));
    cres(ctx, S, -KEY[0] * 0.35, -KEY[1] * 0.35, rgba(LOCAL.gutHi, 0.45 * g));
    ctx.lineWidth = 0.17;
    ctx.strokeStyle = rgba(P.stomachShade, 0.75 * g);
    ctx.stroke(GUT.rugae);
    ctx.translate(-0.08, -0.1);
    ctx.lineWidth = 0.07;
    ctx.strokeStyle = rgba(LOCAL.gutHi, 0.45 * g);
    ctx.stroke(GUT.rugae);
    ctx.restore();
    ctx.lineWidth = 0.2;
    ctx.strokeStyle = rgba(LOCAL.gutHi, 0.72 * g);
    ctx.stroke(S);
    // specular
    ctx.fillStyle = rgba("#ffffff", 0.55 * g);
    ctx.beginPath();
    ctx.ellipse(4.0, -58.4, 0.9, 0.32, -0.3, 0, TAU);
    ctx.fill();
  }

  function medBlob(ctx, x, y, rx, ry, ang, a) {
    const P = HOUSE.pal;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.85 * a;
    const gs = Math.max(rx, ry) * 3.4;
    ctx.drawImage(SPR.aqua, x - gs, y - gs, gs * 2, gs * 2);
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.globalAlpha = a;
    const e = new Path2D();
    e.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fillStyle = P.med;
    ctx.fill(e);
    ctx.save();
    ctx.clip(e);
    const k = Math.min(rx, ry);
    const lp = new Path2D();
    lp.ellipse(0, 0, rx, ry, 0, 0, TAU);
    // shadow on the lower side (world-down), light on the upper side
    const lx = Math.cos(-ang) * KEY[0] - Math.sin(-ang) * KEY[1];
    const ly = Math.sin(-ang) * KEY[0] + Math.cos(-ang) * KEY[1];
    cres(ctx, lp, lx * k * 0.5, ly * k * 0.5, P.medDeep);
    cres(ctx, lp, -lx * k * 0.16, -ly * k * 0.16, P.medGlow);
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(-rx * 0.35, -ry * 0.38, rx * 0.22, ry * 0.18, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function swallowDraw(ctx, t, sw, g) {
    if (sw <= 0.001) return;
    const P = HOUSE.pal;
    const ARR = 0.86;
    const pts = GUT.sw;
    const c = GUT.swC;
    const L = c[c.length - 1];
    // pool settling in the bottom of the stomach
    const lev = sstep(0.8, 1, sw);
    if (lev > 0) {
      ctx.save();
      ctx.clip(GUT.stom);
      const top = -50.6 - 1.4 * lev;
      const tilt = 0.32 * Math.sin(t * 2.3) * (0.6 + 0.4 * (1 - sstep(0.95, 1, sw)));
      const wave = (x) => top + tilt * (x - 4) / 4 + 0.12 * Math.sin(x * 2.4 + t * 3.1);
      const pool = new Path2D();
      pool.moveTo(-1.5, wave(-1.5));
      for (let x = -1.5; x <= 9; x += 0.25) pool.lineTo(x, wave(x));
      pool.lineTo(9, -47);
      pool.lineTo(-1.5, -47);
      pool.closePath();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = rgba(P.med, 0.25 * lev);
      ctx.fill(pool);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = rgba(P.med, 0.72 * lev);
      ctx.fill(pool);
      ctx.save();
      ctx.clip(pool);
      cres(ctx, pool, 0, -0.55, rgba(P.medDeep, 0.6 * lev));
      ctx.restore();
      ctx.beginPath();
      for (let x = -1.5; x <= 9; x += 0.25) {
        if (x === -1.5) ctx.moveTo(x, wave(x));
        else ctx.lineTo(x, wave(x));
      }
      ctx.lineWidth = 0.18;
      ctx.strokeStyle = rgba(P.medGlow, 0.95 * lev);
      ctx.stroke();
      // bubbles of medicine in the pool
      for (let i = 0; i < 6; i++) {
        const ph = (t * (0.35 + 0.2 * HS(i, 41)) + HS(i, 42)) % 1;
        const bx = 1.2 + HS(i, 43) * 6;
        const by = lerp(-50.3, wave(bx) + 0.2, ph);
        ctx.fillStyle = rgba(P.medGlow, 0.7 * lev * Math.sin(Math.PI * ph));
        ctx.beginPath();
        ctx.arc(bx, by, 0.12 + 0.1 * HS(i, 44), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    if (sw < 0.995) {
      // the blob itself
      const u = clamp(sw / ARR);
      const s = u * L;
      const p = polyAt(pts, c, s);
      const inTube = sstep(1.2, 3.0, s) * (1 - sstep(GUT.swOesEnd - 1.5, GUT.swOesEnd + 0.4, s));
      const fade = 1 - sstep(0.88, 0.99, sw);
      const shrink = 1 - 0.5 * sstep(ARR, 0.99, sw);
      const rx = (0.95 + 0.55 * inTube) * shrink;
      const ry = (0.95 - 0.38 * inTube) * shrink;
      // trail of medicine smeared along the oesophagus wall
      ctx.save();
      ctx.lineCap = "round";
      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 8; k++) {
        ctx.beginPath();
        subPoly(ctx, pts, c, s - (k + 1) * 0.9, s - k * 0.9);
        ctx.lineWidth = 0.55 - k * 0.04;
        ctx.strokeStyle = rgba(P.med, 0.36 * (1 - k / 8) * fade);
        ctx.stroke();
      }
      ctx.restore();
      // the oesophagus bulges around the blob
      if (inTube > 0.05 && g > 0.01) {
        ctx.save();
        ctx.translate(p[0], p[1]);
        ctx.rotate(p[2]);
        ctx.fillStyle = rgba(P.gut, 0.55 * inTube * Math.max(0.4, g));
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * 1.35, ry + 0.42, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      const dropY = sstep(ARR, 0.97, sw) * 0.6;
      medBlob(ctx, p[0], p[1] + dropY, rx, ry, p[2], fade);
    }
    // splash ring as it lands
    const k = (sw - ARR) / (1 - ARR);
    if (k > 0 && k < 0.8) {
      ctx.save();
      ctx.clip(GUT.stom);
      ctx.strokeStyle = rgba(P.medGlow, 0.8 * (1 - k / 0.8));
      ctx.lineWidth = 0.14;
      ctx.beginPath();
      ctx.ellipse(5.4, -51.7, 0.6 + 3 * k, 0.25 + 0.7 * k, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function heartDraw(ctx, t, hk, beat, med) {
    const P = HOUSE.pal;
    const r = HR * (1 + 0.12 * hk);
    const p = beat;
    const x = HC[0];
    const y = HC[1];
    // warm glow
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gs = r * (2.4 + 0.5 * hk + 0.3 * p);
    ctx.globalAlpha = clamp((0.3 + 0.55 * hk) * (0.8 + 0.3 * p));
    ctx.drawImage(SPR.red, x - gs, y - gs + r * 0.1, gs * 2, gs * 2);
    if (med > 0) {
      ctx.globalAlpha = 0.6 * med * (0.75 + 0.35 * p);
      const ms = r * 2.2;
      ctx.drawImage(SPR.aqua, x - ms, y - ms, ms * 2, ms * 2);
    }
    ctx.restore();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(r, r);
    ctx.rotate(-0.08 + 0.03 * Math.sin(t * 0.9));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const cool = 0.3 * (1 - hk); // at rest the heart sits a little into the x-ray tint
    const col = (c) => rgba(mixc(c, [120, 60, 190], cool), 1);
    // atria and vessel stubs behind
    ctx.save();
    ctx.translate(0, 0.02 * p);
    ctx.lineWidth = 0.2;
    ctx.strokeStyle = col([66, 82, 210]);
    ctx.stroke(HEART.pa);
    ctx.lineWidth = 0.13;
    ctx.strokeStyle = col([110, 128, 255]);
    ctx.stroke(HEART.pa);
    ctx.restore();
    ctx.translate(0.05, 0.2);
    ctx.scale(1 - 0.075 * p, 1 - 0.06 * p);
    ctx.translate(-0.05, -0.2);
    const blob = (bx, by, rx, ry, rot, c) => {
      ctx.fillStyle = col(c);
      ctx.beginPath();
      ctx.ellipse(bx, by, rx, ry, rot, 0, TAU);
      ctx.fill();
    };
    blob(-0.52, -0.3, 0.31, 0.3, 0, [198, 38, 70]);
    blob(-0.58, -0.36, 0.2, 0.17, 0, [222, 58, 82]);
    blob(0.62, -0.34, 0.21, 0.13, -0.5, [190, 34, 66]);
    blob(0.58, -0.39, 0.13, 0.07, -0.5, [228, 70, 90]);
    ctx.fillStyle = col(hex(P.heart));
    ctx.fill(HEART.body);
    ctx.save();
    ctx.clip(HEART.body);
    ctx.fillStyle = col(hex(P.heartShade));
    ctx.fill(HEART.shade);
    ctx.fillStyle = col([134, 18, 58]);
    ctx.fill(HEART.deep);
    ctx.fillStyle = col([248, 90, 102]);
    ctx.fill(HEART.lit);
    ctx.lineWidth = 0.055;
    ctx.strokeStyle = col([168, 22, 60]);
    ctx.stroke(HEART.groove);
    ctx.save();
    ctx.translate(-0.012, -0.01);
    ctx.lineWidth = 0.024;
    ctx.strokeStyle = col([255, 120, 100]);
    ctx.stroke(HEART.groove);
    ctx.lineWidth = 0.016;
    ctx.stroke(HEART.twig);
    ctx.restore();
    blob(0.0, -0.36, 0.06, 0.035, 0.3, [246, 196, 110]);
    blob(0.1, -0.33, 0.045, 0.03, -0.2, [246, 196, 110]);
    // medicine inside: an aqua glow pulsing with the beat
    if (med > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.5 * med * (0.7 + 0.4 * p);
      ctx.drawImage(SPR.aqua, -1.1, -0.9, 2.2, 2.2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    // rim light on the upper-left edge
    ctx.save();
    ctx.beginPath();
    ctx.rect(-1.2, -1, 1.05, 2.2);
    ctx.clip();
    ctx.lineWidth = 0.07;
    ctx.strokeStyle = med > 0.3 ? rgba(P.medGlow, 0.9) : "rgba(255,160,150,0.88)";
    ctx.stroke(HEART.body);
    ctx.restore();
    ctx.restore();
    ctx.fillStyle = "rgba(255,222,228,0.88)";
    ctx.beginPath();
    ctx.ellipse(-0.36, -0.08, 0.11, 0.055, -0.9, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-0.27, 0.06, 0.03, 0.02, -0.9, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function shortcutDraw(ctx, t, sc) {
    if (sc <= 0.001) return;
    const P = HOUSE.pal;
    const on = sstep(0, 0.12, sc);
    const [sx, sy] = SITE;
    // the injection site lights up: glow, a puncture mark and ripples
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = on * (0.8 + 0.2 * Math.sin(t * 5));
    ctx.drawImage(SPR.aqua, sx - 2.6, sy - 2.6, 5.2, 5.2);
    ctx.globalAlpha = on;
    ctx.lineWidth = 0.12;
    for (let k = 0; k < 2; k++) {
      const ph = (t * 0.9 + k * 0.5) % 1;
      ctx.strokeStyle = rgba(P.medGlow, 0.7 * (1 - ph) * sstep(0, 0.12, ph) * on);
      ctx.beginPath();
      ctx.arc(sx, sy, 0.6 + 2.2 * ph, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = on * (0.7 + 0.3 * Math.sin(t * 7.3));
    ctx.drawImage(SPR.star, sx - 1.4, sy - 1.4, 2.8, 2.8);
    ctx.restore();
    ctx.fillStyle = rgba("#ffffff", on);
    ctx.beginPath();
    ctx.arc(sx, sy, 0.22, 0, TAU);
    ctx.fill();
    // the stream
    const R = NET.route;
    const L = R.c[R.c.length - 1];
    const s = clamp(sc) * L;
    if (s < 0.05) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    subPoly(ctx, R.pts, R.c, 0, s);
    ctx.lineWidth = 3.0;
    ctx.strokeStyle = rgba(P.medGlow, 0.16);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = rgba(P.med, 0.32);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 0.95;
    ctx.strokeStyle = P.med;
    ctx.stroke();
    ctx.lineWidth = 0.36;
    ctx.strokeStyle = "rgba(235,255,252,0.95)";
    ctx.stroke();
    // flow dashes racing toward the heart
    ctx.setLineDash([0.5, 1.4]);
    ctx.lineDashOffset = -t * 9;
    ctx.lineWidth = 0.34;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.stroke();
    ctx.setLineDash([]);
    // arrow head
    const ah = 1 - sstep(0.94, 1, sc);
    if (ah > 0.01) {
      const p = polyAt(R.pts, R.c, s);
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(p[2]);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = ah;
      ctx.drawImage(SPR.aquaHot, -3.2, -3.2, 6.4, 6.4);
      ctx.globalCompositeOperation = "source-over";
      ctx.scale(1.45, 1.45);
      const hp = new Path2D();
      hp.moveTo(1.05, 0);
      hp.lineTo(-0.75, -0.95);
      hp.lineTo(-0.4, 0);
      hp.lineTo(-0.75, 0.95);
      hp.closePath();
      ctx.lineWidth = 0.32;
      ctx.strokeStyle = P.med;
      ctx.fillStyle = P.med;
      ctx.fill(hp);
      ctx.stroke(hp);
      ctx.fillStyle = "rgba(240,255,253,0.95)";
      ctx.beginPath();
      ctx.moveTo(0.7, 0);
      ctx.lineTo(-0.35, -0.5);
      ctx.lineTo(-0.15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function crossDraw(ctx, k) {
    if (k <= 0.001) return;
    const P = HOUSE.pal;
    const [x, y] = CROSS_C;
    const h = 4.3;
    const a1 = sstep(0, 0.45, k);
    const a2 = sstep(0.35, 0.8, k);
    const pop = 1 + 0.08 * Math.sin(clamp((k - 0.75) / 0.25) * Math.PI);
    const strokes = [
      [x - h, y - h, x + h, y + h, a1],
      [x + h, y - h, x - h, y + h, a2],
    ];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pop, pop);
    ctx.translate(-x, -y);
    ctx.lineCap = "round";
    const path = new Path2D();
    for (const [x0, y0, x1, y1, a] of strokes) {
      if (a <= 0.001) continue;
      path.moveTo(x0, y0);
      path.lineTo(lerp(x0, x1, a), lerp(y0, y1, a));
    }
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = rgba(P.artery, 0.22);
    ctx.stroke(path);
    ctx.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.translate(0.18, 0.22);
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = rgba(P.muscleDeep, 0.55);
    ctx.stroke(path);
    ctx.restore();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = P.artery;
    ctx.stroke(path);
    ctx.translate(-0.16, -0.16);
    ctx.lineWidth = 0.38;
    ctx.strokeStyle = LOCAL.crossHi;
    ctx.stroke(path);
    ctx.restore();
  }

  BODY.xray = function (ctx, o) {
    o = o || {};
    if (!READY) return;
    const t = o.t || 0;
    const cm = camOf(o);
    const cross = clamp(o.cross || 0);
    const gut = clamp(o.gut == null ? 1 : o.gut) * (1 - 0.35 * cross);
    const sw = clamp(o.swallow || 0);
    const sc = clamp(o.shortcut || 0);
    const circ = clamp(o.circ || 0);
    const hk = clamp(o.heart || 0);
    const bpm = o.bpm || 75;
    const beat = pulse(t, bpm) * (0.22 + 0.78 * hk);
    const DA = circDist(circ, NET.dA);
    const DV = circDist(clamp((circ - 0.07) / 0.93), NET.dV);
    const med = Math.max(0.7 * sstep(0.9, 1, sc), sstep(0, 0.12, circ));
    ctx.save();
    xrBackground(ctx, t, cm);
    applyCam(ctx, cm);
    bodyTransform(ctx, t);
    const fw = FB.x1 - FB.x0;
    const fh = FB.y1 - FB.y0;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.5 + 0.06 * Math.sin(t * 0.8);
    ctx.drawImage(XR.halo, FB.x0, FB.y0, fw, fh);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.drawImage(XR.fill, FB.x0, FB.y0, fw, fh);
    vesselsRest(ctx, t, beat, bpm);
    if (circ > 0) litNetwork(ctx, t, DA, DV);
    bloodCells(ctx, t, DA, DV);
    gutDraw(ctx, t, gut);
    swallowDraw(ctx, t, sw, gut);
    shortcutDraw(ctx, t, sc);
    heartDraw(ctx, t, hk, beat, med);
    crossDraw(ctx, cross);
    ctx.restore();
  };

  BODY.xrayAnchors = function (o) {
    o = o || {};
    const B = (x, y) => bodyPt(o, x, y);
    return {
      mouth: B(0, -80.45),
      stomach: B(STOMACH_PT[0], STOMACH_PT[1]),
      heart: B(HC[0], HC[1]),
      site: B(SITE[0], SITE[1]),
      head: B(0, HEADY - 2),
      handL: B(HAND_C[0][0], HAND_C[0][1]),
      handR: B(HAND_C[1][0], HAND_C[1][1]),
    };
  };

  // ================================================================== STOMACH
  const SURF = 700;
  const VP = [985, 405];
  const SMM = 180; // wall cache margin
  const ST = {};
  function surfY(x, t) {
    return SURF + 5 * Math.sin(x * 0.0072 + t * 1.25) + 3.2 * Math.sin(x * 0.019 - t * 1.85 + 1.3) + 2.6 * N1(x * 0.006 + t * 0.35, 7);
  }

  function buildWalls() {
    const P = HOUSE.pal;
    const c = canvas(W + 2 * SMM, H + 2 * SMM);
    const g = c.getContext("2d");
    g.translate(SMM, SMM);
    const rad = (stops, r = 1250) => {
      const gr = g.createRadialGradient(VP[0], VP[1], 0, VP[0], VP[1], r);
      for (const [k, col] of stops) gr.addColorStop(k, typeof col === "string" ? col : rgba(col, 1));
      return gr;
    };
    g.fillStyle = rad([[0, LOCAL.wallFar], [0.07, "#3a0d5c"], [0.25, LOCAL.grooveMid], [0.65, LOCAL.grooveNear], [1, "#7a2069"]]);
    g.fillRect(-SMM, -SMM, W + 2 * SMM, H + 2 * SMM);
    // the far end glows softly (light from deeper in the tunnel)
    let gr = g.createRadialGradient(VP[0], VP[1], 0, VP[0], VP[1], 420);
    gr.addColorStop(0, "rgba(255,140,205,0.0)");
    gr.addColorStop(0.18, "rgba(255,140,205,0.30)");
    gr.addColorStop(0.45, "rgba(200,80,180,0.14)");
    gr.addColorStop(1, "rgba(160,60,170,0)");
    g.fillStyle = gr;
    g.fillRect(VP[0] - 420, VP[1] - 420, 840, 840);
    gr = g.createRadialGradient(VP[0], VP[1], 0, VP[0], VP[1], 150);
    gr.addColorStop(0, "rgba(255,170,225,0.38)");
    gr.addColorStop(0.5, "rgba(220,110,200,0.14)");
    gr.addColorStop(1, "rgba(180,80,180,0)");
    g.fillStyle = gr;
    g.fillRect(VP[0] - 150, VP[1] - 150, 300, 300);
    // gastric pits on the grooves (small detail)
    const rng = EX.rng(77);
    for (let i = 0; i < 900; i++) {
      const a = rng() * TAU;
      const r = 80 + Math.pow(rng(), 0.7) * 1300;
      const x = VP[0] + Math.cos(a) * r;
      const y = VP[1] + Math.sin(a) * r;
      const s = 1 + (r / 1300) * 3.5 * (0.5 + rng());
      g.fillStyle = `rgba(40,6,60,${(0.18 + 0.2 * rng()).toFixed(3)})`;
      g.beginPath();
      g.ellipse(x, y, s, s * 0.7, a, 0, TAU);
      g.fill();
    }
    // ridges (rugae) radiating from the far end: main folds plus shorter ones that start mid-way
    const ridges = [];
    const specs = [];
    const NR = 15;
    for (let i = 0; i < NR; i++) {
      const th = (i / NR) * TAU + (rng() - 0.5) * 0.22;
      const down = Math.sin(th);
      if (down > 0.5) continue; // the acid hides these anyway
      specs.push({ th, r0: 120 + rng() * 120, wk: 0.8 + rng() * 0.45 });
    }
    for (let i = 0; i < 9; i++) {
      const th = ((i + 0.5) / 9) * TAU + (rng() - 0.5) * 0.3;
      if (Math.sin(th) > 0.45) continue;
      specs.push({ th, r0: 330 + rng() * 220, wk: 0.5 + rng() * 0.3 });
    }
    specs.forEach((sp, i) => {
      const { th, r0, wk } = sp;
      const r1 = 1750;
      const amp = 0.08 + rng() * 0.08;
      const fr = 0.003 + rng() * 0.003;
      const ph = rng() * TAU;
      const cen = [];
      const wid = [];
      const n = 80;
      for (let j = 0; j <= n; j++) {
        const r = r0 + (r1 - r0) * Math.pow(j / n, 1.3);
        const ang = th + amp * Math.sin(r * fr + ph) * Math.min(1, r / 700) + 0.05 * N1(r * 0.003, i + 3);
        cen.push([VP[0] + Math.cos(ang) * r * 1.08, VP[1] + Math.sin(ang) * r * 0.92]);
        wid.push(wk * (4 + 0.088 * r) * sstep(r0 - 10, r0 + 170, r) * (1 + 0.16 * Math.sin(r * 0.014 + ph * 2)));
      }
      const left = [];
      const right = [];
      const nrm = [];
      for (let j = 0; j <= n; j++) {
        const a = cen[Math.max(0, j - 1)];
        const b = cen[Math.min(n, j + 1)];
        const tx = b[0] - a[0];
        const ty = b[1] - a[1];
        const l = Math.hypot(tx, ty) || 1;
        const nx = -ty / l;
        const ny = tx / l;
        nrm.push([nx, ny]);
        left.push([cen[j][0] + nx * wid[j], cen[j][1] + ny * wid[j]]);
        right.push([cen[j][0] - nx * wid[j], cen[j][1] - ny * wid[j]]);
      }
      const path = new Path2D();
      path.moveTo(cen[0][0], cen[0][1]);
      for (const p of left) path.lineTo(p[0], p[1]);
      for (let j = right.length - 1; j >= 0; j--) path.lineTo(right[j][0], right[j][1]);
      path.closePath();
      ridges.push({ path, cen, wid, nrm, i });
    });
    // short ones first so the main folds overlap them
    ridges.reverse();
    const lit = rad([[0, LOCAL.ridgeFar], [0.12, "#7a2478"], [0.42, LOCAL.ridgeMid], [0.78, P.stomach], [1, P.stomach]]);
    const sh = rad([[0, "#300a58"], [0.12, "#4a1262"], [0.42, LOCAL.ridgeShMid], [0.78, P.stomachShade], [1, P.stomachShade]]);
    const dp = rad([[0, "#240748"], [0.15, "#3a0c58"], [0.5, "#6a1f70"], [0.85, P.stomachDeep], [1, P.stomachDeep]]);
    const rim = rad([[0, "rgba(255,190,230,0.15)"], [0.2, "rgba(255,190,225,0.45)"], [0.7, rgba(LOCAL.ridgeRim, 0.9)], [1, rgba(LOCAL.ridgeRim, 0.95)]]);
    const green = g.createLinearGradient(0, SURF - 330, 0, SURF + 10);
    green.addColorStop(0, "rgba(182,240,74,0)");
    green.addColorStop(0.7, "rgba(182,240,74,0.32)");
    green.addColorStop(1, "rgba(214,255,120,0.65)");
    const glints = [];
    for (const R of ridges) {
      const meanW = R.wid.reduce((a, b) => a + b, 0) / R.wid.length;
      g.fillStyle = lit;
      g.fill(R.path);
      g.save();
      g.clip(R.path);
      cres(g, R.path, KEY[0] * meanW * 0.75, KEY[1] * meanW * 0.75, sh);
      cres(g, R.path, KEY[0] * meanW * 0.25, KEY[1] * meanW * 0.25, dp);
      const deep = 0.32 * HS(R.i, 3, 17) * HS(R.i, 4, 17);
      if (deep > 0.02) {
        g.fillStyle = `rgba(52,8,78,${deep.toFixed(3)})`;
        g.fill(R.path);
      }
      cres(g, R.path, -KEY[0] * Math.max(3, meanW * 0.09), -KEY[1] * Math.max(3, meanW * 0.09), rim);
      cres(g, R.path, 0, -Math.max(4, meanW * 0.22), green);
      g.restore();
      // wet speculars along the lit side of the crest
      for (let j = 6; j < R.cen.length - 3; j += 2) {
        const [cx0, cy0] = R.cen[j];
        if (cx0 < -SMM || cx0 > W + SMM || cy0 < -SMM || cy0 > H + SMM) continue;
        const hsh = HS(R.i, j, 11);
        if (hsh < 0.5) continue;
        const nx = R.nrm[j][0];
        const ny = R.nrm[j][1];
        const sd = nx * -KEY[0] + ny * -KEY[1] > 0 ? 1 : -1;
        const w0 = R.wid[j];
        const k = sstep(60, 700, Math.hypot(cx0 - VP[0], cy0 - VP[1]));
        const j2 = Math.min(R.cen.length - 1, j + 1 + Math.floor(hsh * 3));
        const ax = cx0 + nx * sd * w0 * 0.5;
        const ay = cy0 + ny * sd * w0 * 0.5;
        const bx = R.cen[j2][0] + R.nrm[j2][0] * sd * R.wid[j2] * 0.5;
        const by = R.cen[j2][1] + R.nrm[j2][1] * sd * R.wid[j2] * 0.5;
        const th = Math.max(1.2, w0 * 0.07);
        g.fillStyle = `rgba(255,255,255,${(0.25 + 0.55 * k).toFixed(3)})`;
        g.beginPath();
        g.moveTo(ax, ay);
        g.quadraticCurveTo((ax + bx) / 2 + nx * sd * th, (ay + by) / 2 + ny * sd * th, bx, by);
        g.quadraticCurveTo((ax + bx) / 2 - nx * sd * th, (ay + by) / 2 - ny * sd * th, ax, ay);
        g.fill();
        if (hsh > 0.82 && k > 0.3) {
          g.beginPath();
          g.arc(bx + (bx - ax) * 0.35, by + (by - ay) * 0.35, th * 0.7, 0, TAU);
          g.fill();
          if (by < SURF - 40) glints.push([bx, by, 0.6 + 0.8 * k]);
        }
      }
      // small lighter dots on the ridge (texture)
      for (let j = 4; j < R.cen.length; j += 1) {
        if (HS(R.i, j, 19) < 0.55) continue;
        const [cx0, cy0] = R.cen[j];
        const w0 = R.wid[j];
        const o = (HS(R.i, j, 23) - 0.5) * w0 * 1.3;
        const k = sstep(60, 700, Math.hypot(cx0 - VP[0], cy0 - VP[1]));
        g.fillStyle = `rgba(255,214,232,${(0.12 + 0.2 * k).toFixed(3)})`;
        g.beginPath();
        g.arc(cx0 + R.nrm[j][0] * o, cy0 + R.nrm[j][1] * o, 0.8 + w0 * 0.035, 0, TAU);
        g.fill();
      }
    }
    // mucus strands sagging between neighbouring folds near the top, each with a bead
    g.lineCap = "round";
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI * (0.18 + 0.64 * HS(k, 31));
      const r = 300 + 380 * HS(k, 32);
      const x = VP[0] + Math.cos(a) * r * 1.08;
      const y = VP[1] + Math.sin(a) * r * 0.92;
      const len = 26 + 30 * HS(k, 33);
      const da = a + Math.PI / 2;
      const x0 = x - Math.cos(da) * len;
      const y0 = y - Math.sin(da) * len;
      const x1 = x + Math.cos(da) * len;
      const y1 = y + Math.sin(da) * len;
      const sag = 26 + 22 * HS(k, 35);
      g.strokeStyle = "rgba(255,214,236,0.22)";
      g.lineWidth = 3 + 2 * HS(k, 34);
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(x, Math.max(y0, y1) + sag, x1, y1);
      g.stroke();
      g.fillStyle = "rgba(255,226,242,0.55)";
      g.beginPath();
      g.ellipse(x, Math.max(y0, y1) + sag * 0.55, 4, 5.5, 0, 0, TAU);
      g.fill();
    }
    const shore = (n, y0, hMin, hMax, col, seed) => {
      for (let k = 0; k < n; k++) {
        const x = 300 + (k + 0.5) * (1340 / n) + (HS(k, seed, 1) - 0.5) * 60;
        const w = 120 + 90 * HS(k, seed, 2);
        const h = lerp(hMin, hMax, HS(k, seed, 3));
        const hump = new Path2D();
        hump.moveTo(x - w, y0 + 30);
        hump.bezierCurveTo(x - w, y0 - h * 0.7, x - w * 0.45, y0 - h, x, y0 - h);
        hump.bezierCurveTo(x + w * 0.45, y0 - h, x + w, y0 - h * 0.7, x + w, y0 + 30);
        hump.closePath();
        g.fillStyle = col[0];
        g.fill(hump);
        g.save();
        g.clip(hump);
        cres(g, hump, KEY[0] * w * 0.35, KEY[1] * w * 0.35, col[1]);
        cres(g, hump, -KEY[0] * 4, -KEY[1] * 4, col[2]);
        cres(g, hump, 0, -h * 0.4, green);
        g.restore();
        if (HS(k, seed, 4) > 0.55) {
          g.fillStyle = "rgba(255,235,245,0.4)";
          g.beginPath();
          g.ellipse(x - w * 0.35, y0 - h * 0.78, w * 0.16, 2.6, -0.35, 0, TAU);
          g.fill();
        }
      }
    };
    for (const [vx, vy, vr] of [[-120, -160, 900], [W + 120, -160, 900], [CX, -420, 760]]) {
      const vg = g.createRadialGradient(vx, vy, 0, vx, vy, vr);
      vg.addColorStop(0, "rgba(34,6,58,0.55)");
      vg.addColorStop(0.55, "rgba(34,6,58,0.2)");
      vg.addColorStop(1, "rgba(34,6,58,0)");
      g.fillStyle = vg;
      g.fillRect(vx - vr, vy - vr, vr * 2, vr * 2);
    }
    shore(9, SURF + 4, 70, 120, ["#561662", "#3a0d56", "rgba(230,120,200,0.45)"], 1);
    shore(12, SURF + 8, 36, 70, ["#6e2070", "#4c1462", "rgba(255,150,210,0.55)"], 2);
    ST.walls = c;
    ST.glints = glints.filter((p) => p[0] > 40 && p[0] < W - 40 && p[1] > 30).slice(0, 40);

    // ---- foreground folds framing the corners (separate layer, more parallax)
    const f = canvas(W + 2 * SMM, H + 2 * SMM);
    const fg = f.getContext("2d");
    fg.translate(SMM, SMM);
    const lobes = [
      [[-260, -260], [560, -260], [520, -150], [430, -60], [300, 0], [170, 60], [70, 150], [-30, 240], [-260, 330]],
      [[1360, -260], [2180, -260], [2180, 330], [2040, 260], [1900, 170], [1770, 100], [1640, 30], [1520, -50], [1430, -140]],
    ];
    lobes.forEach((pts, li) => {
      const path = P2(pts);
      let cxm = 0;
      let cym = 0;
      for (const p of pts) {
        cxm += p[0] / pts.length;
        cym += p[1] / pts.length;
      }
      const dx = CX - cxm;
      const dy = CY - cym;
      const dl = Math.hypot(dx, dy) || 1;
      const ux = dx / dl;
      const uy = dy / dl;
      fg.fillStyle = LOCAL.fgLit;
      fg.fill(path);
      fg.save();
      fg.clip(path);
      cres(fg, path, ux * 90, uy * 90, LOCAL.fgBase);
      cres(fg, path, ux * 34, uy * 34, "#310839");
      // a softer fold line inside the lobe
      const fold = P2(pts.map((q) => [lerp(q[0], cxm, 0.42) + ux * 30, lerp(q[1], cym, 0.42) + uy * 30]));
      fg.fillStyle = "rgba(40,6,52,0.3)";
      fg.fill(fold);
      cres(fg, path, -ux * 9, -uy * 9, LOCAL.fgRim);
      fg.restore();
      // speculars on the lit edge
      for (let k = 0; k < 5; k++) {
        const i = 2 + Math.floor(HS(li, k, 51) * (pts.length - 4));
        const a = pts[i];
        const b = pts[i + 1];
        const m = 0.2 + 0.5 * HS(li, k, 52);
        const x = lerp(a[0], b[0], m) + ux * 18;
        const y = lerp(a[1], b[1], m) + uy * 18;
        if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        fg.fillStyle = "rgba(255,240,248,0.7)";
        fg.beginPath();
        fg.ellipse(x, y, 16 + 22 * HS(li, k, 53), 3.2, ang, 0, TAU);
        fg.fill();
      }
    });
    ST.fg = f;
  }

  // ---------------- objects: falling in, splashing, floating
  const IMPACT = 0.42;
  function fallState(p, home, yFloat, t, seed) {
    const out = { x: home, y: -260, rot: -0.5, splash: -1, impactX: home };
    if (p <= 0) return out;
    if (p < IMPACT) {
      const u = p / IMPACT;
      const yImp = yFloat - 26;
      out.y = lerp(-260, yImp, Math.pow(u, 1.55));
      out.x = home + 40 * (1 - u);
      out.rot = (-0.5 + 0.35 * u) * (seed % 2 ? -1 : 1);
      return out;
    }
    const u = (p - IMPACT) / (1 - IMPACT);
    const A = 26 / Math.sin(0.5);
    out.y = yFloat + A * Math.sin(u * 9 - 0.5) * Math.exp(-3 * u);
    out.x = home;
    out.rot = (-0.15 * Math.exp(-3 * u) * Math.cos(u * 10)) * (seed % 2 ? -1 : 1);
    out.splash = u;
    // idle bobbing once afloat
    const k = sstep(0.3, 1, u);
    out.y += k * 4 * Math.sin(t * 1.5 + seed);
    out.rot += k * 0.035 * Math.sin(t * 1.1 + seed * 2);
    out.x += k * 6 * Math.sin(t * 0.37 + seed);
    return out;
  }
  const INS_HOME = 760;
  const SAN_HOME = 1255;
  const INS_FLOAT = SURF + 14;
  const SAN_FLOAT = SURF - 14;
  const INS_BEADS = (() => {
    const p = [];
    for (let i = 0; i < 6; i++) p.push([-96 + i * 38, -22 + 6 * Math.sin(i * 1.3)]);
    p.push([120, 2]);
    for (let i = 0; i < 5; i++) p.push([92 - i * 38, 27 + 6 * Math.sin(i * 1.7 + 1)]);
    return p;
  })();
  const INS_BRIDGES = [[1, 11, 0.24], [4, 8, 0.34]];
  const INS_LINK_T = [0.3, 0.2, 0.42, 0.14, 0.36, 0.48, 0.26, 0.4, 0.18, 0.46, 0.32];
  function beadFree(i) {
    let f = 0;
    if (i > 0) f = Math.max(f, INS_LINK_T[i - 1]);
    if (i < INS_BEADS.length - 1) f = Math.max(f, INS_LINK_T[i]);
    for (const [a, b, tb] of INS_BRIDGES) if (a === i || b === i) f = Math.max(f, tb);
    return f;
  }
  function insulinBeads(o, t) {
    const st = fallState(o.insulin, INS_HOME, INS_FLOAT, t, 1);
    const dg = clamp(o.digest || 0);
    const c = Math.cos(st.rot);
    const s = Math.sin(st.rot);
    const out = [];
    for (let i = 0; i < INS_BEADS.length; i++) {
      let [x, y] = INS_BEADS[i];
      x += 2.2 * N1(t * 0.9 + i * 1.7, 61);
      y += 2.2 * N1(t * 0.8 + i * 2.3, 62);
      const f = beadFree(i);
      const e = sstep(f, f + 0.42, dg);
      const len = Math.hypot(x, y) || 1;
      const vx = (x / len) * (40 + 30 * HS(i, 71)) + (HS(i, 72) - 0.5) * 30;
      const vy = (y / len) * 18 + 40 + 30 * HS(i, 73);
      x += vx * e;
      y += vy * e;
      const shrink = 1 - sstep(f + 0.1, f + 0.46, dg);
      out.push({ x: st.x + x * c - y * s, y: st.y + x * s + y * c, r: 17 * Math.max(0, shrink), a: shrink, f });
    }
    return { st, beads: out, dg };
  }

  function drawInsulin(ctx, o, t) {
    if (!(o.insulin > 0.001)) return;
    const P = HOUSE.pal;
    const { beads, dg } = insulinBeads(o, t);
    ctx.save();
    // golden halo
    ctx.globalCompositeOperation = "lighter";
    for (const b of beads) {
      if (b.r < 0.5) continue;
      ctx.globalAlpha = 0.35 * b.a;
      const g = b.r * 2.8;
      ctx.drawImage(SPR.gold, b.x - g, b.y - g, g * 2, g * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    // links (backbone) and the two bridges between the strands
    ctx.lineCap = "round";
    const link = (a, b, w, col) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    };
    for (const [ia, ib, tb] of INS_BRIDGES) {
      if (dg >= tb) continue;
      ctx.setLineDash([4, 5]);
      link(beads[ia], beads[ib], 4, rgba(P.insulinShade, 0.95));
      ctx.setLineDash([]);
    }
    for (let i = 0; i < beads.length - 1; i++) {
      if (dg >= INS_LINK_T[i]) continue;
      link(beads[i], beads[i + 1], 11, P.insulinShade);
      link(beads[i], beads[i + 1], 5, P.insulin);
      link(beads[i], beads[i + 1], 1.6, LOCAL.insulinHi);
    }
    for (const b of beads) {
      if (b.r < 0.5) continue;
      ctx.globalAlpha = clamp(b.a * 1.4);
      const s = b.r / 0.4;
      ctx.drawImage(SPR.bead, b.x - s / 2, b.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    // snip sparks where links break
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < beads.length - 1; i++) {
      const k = (dg - INS_LINK_T[i]) / 0.07;
      if (k <= 0 || k >= 1) continue;
      const x = (beads[i].x + beads[i + 1].x) / 2;
      const y = (beads[i].y + beads[i + 1].y) / 2;
      const s = 18 + 26 * k;
      ctx.globalAlpha = 1 - k;
      ctx.drawImage(SPR.star, x - s, y - s, s * 2, s * 2);
    }
    ctx.restore();
  }

  // ---------------- the sandwich
  function sandwichArt(g) {
    const P = HOUSE.pal;
    const cel = (path, base, shade, lt, dsh = 8) => {
      g.fillStyle = base;
      g.fill(path);
      g.save();
      g.clip(path);
      cres(g, path, KEY[0] * dsh, KEY[1] * dsh, shade);
      cres(g, path, -KEY[0] * 2.5, -KEY[1] * 2.5, lt);
      g.restore();
    };
    const rr = (x, y, w, h, r) => {
      const p = new Path2D();
      p.roundRect(x, y, w, h, r);
      return p;
    };
    // bottom bread
    const bb = rr(-96, 18, 192, 36, 15);
    cel(bb, P.bread, P.breadShade, LOCAL.breadLight, 10);
    g.save();
    g.clip(bb);
    g.fillStyle = LOCAL.crust;
    g.fillRect(-100, 46, 200, 10);
    g.restore();
    // lettuce, frilly over the edges
    const lt = new Path2D();
    lt.moveTo(-106, 10);
    for (let x = -106; x <= 106; x += 4) lt.lineTo(x, 6 + 2 * Math.sin(x * 0.2));
    for (let x = 106; x >= -106; x -= 4) lt.lineTo(x, 22 + 7 * Math.abs(Math.sin(x * 0.085)) + (Math.abs(x) > 96 ? 6 : 0));
    lt.closePath();
    cel(lt, P.lettuce, LOCAL.lettuceShade, LOCAL.lettuceVein, 6);
    g.strokeStyle = rgba(LOCAL.lettuceVein, 0.7);
    g.lineWidth = 1.6;
    for (let k = 0; k < 6; k++) {
      const x = -84 + k * 33;
      g.beginPath();
      g.moveTo(x, 10);
      g.quadraticCurveTo(x + 6, 18, x + 2, 26);
      g.stroke();
    }
    // tomato slices
    for (const [x0, x1] of [[-74, -6], [8, 78]]) {
      const tp = rr(x0, -3, x1 - x0, 14, 7);
      cel(tp, P.tomato, LOCAL.tomatoShade, "#ff9a8a", 5);
      g.fillStyle = rgba(LOCAL.seed, 0.9);
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.ellipse(x0 + 10 + k * ((x1 - x0 - 20) / 3), 4, 2.6, 1.6, 0.3, 0, TAU);
        g.fill();
      }
    }
    // cheese with a drip
    const ch = new Path2D();
    ch.moveTo(-102, -12);
    ch.lineTo(98, -12);
    ch.lineTo(100, 0);
    ch.lineTo(96, 3);
    ch.quadraticCurveTo(92, 24, 86, 24);
    ch.quadraticCurveTo(80, 22, 80, 3);
    ch.lineTo(-96, 3);
    ch.lineTo(-106, -2);
    ch.closePath();
    cel(ch, P.cheese, LOCAL.cheeseShade, "#fff1a0", 5);
    g.fillStyle = rgba(LOCAL.cheeseShade, 0.85);
    for (const [hx, hy, hr] of [[-60, -5, 3.4], [-20, -6, 2.4], [30, -5, 3.0], [62, -6, 2.2]]) {
      g.beginPath();
      g.ellipse(hx, hy, hr * 1.4, hr, 0, 0, TAU);
      g.fill();
    }
    // top bread: domed slice with a crust and seeds
    const tb = new Path2D();
    tb.moveTo(-100, -8);
    tb.lineTo(-99, -36);
    tb.bezierCurveTo(-97, -58, -70, -68, 0, -69);
    tb.bezierCurveTo(70, -68, 97, -58, 99, -36);
    tb.lineTo(100, -8);
    tb.quadraticCurveTo(0, -4, -100, -8);
    tb.closePath();
    cel(tb, P.bread, P.breadShade, LOCAL.breadLight, 12);
    g.save();
    g.clip(tb);
    const crust = new Path2D();
    crust.moveTo(-104, -30);
    crust.bezierCurveTo(-100, -62, -70, -74, 0, -75);
    crust.bezierCurveTo(70, -74, 100, -62, 104, -30);
    crust.lineTo(104, -80);
    crust.lineTo(-104, -80);
    crust.closePath();
    g.translate(0, 9);
    g.fillStyle = LOCAL.crust;
    g.fill(crust);
    g.restore();
    g.fillStyle = "rgba(255,255,255,0.65)";
    g.beginPath();
    g.ellipse(-52, -50, 22, 5, -0.3, 0, TAU);
    g.fill();
    g.fillStyle = "#fff0cc";
    for (const [sx, sy, a] of [[-40, -62, -0.4], [-8, -66, 0.1], [26, -64, 0.5], [56, -57, 0.8], [-66, -54, -0.8], [6, -58, -0.2]]) {
      g.beginPath();
      g.ellipse(sx, sy, 3.6, 1.8, a, 0, TAU);
      g.fill();
    }
  }
  const SAN_BITES = [
    [-100, -24, 26, 0.06],
    [100, 26, 24, 0.1],
    [-30, 58, 22, 0.15],
    [64, -64, 24, 0.19],
    [-80, 40, 18, 0.22],
  ];
  const CRUMBS = (() => {
    const out = [];
    const rng = EX.rng(4242);
    const add = (n, kind, y0, y1, s0, s1) => {
      for (let i = 0; i < n; i++)
        out.push({ kind, x: -90 + rng() * 180, y: lerp(y0, y1, rng()), s: lerp(s0, s1, rng()), a: rng() * TAU, h: rng(), v: rng() });
    };
    add(9, "bread", -60, -18, 20, 34);
    add(5, "bread", 22, 50, 18, 28);
    add(5, "lettuce", 8, 24, 14, 22);
    add(4, "tomato", -2, 10, 12, 18);
    add(4, "cheese", -12, 2, 12, 18);
    return out;
  })();
  function sandwichState(o, t) {
    return fallState(o.sandwich, SAN_HOME, SAN_FLOAT, t, 2);
  }
  function drawSandwich(ctx, o, t) {
    if (!(o.sandwich > 0.001)) return;
    const P = HOUSE.pal;
    const st = sandwichState(o, t);
    const dg = clamp(o.digest || 0);
    const whole = 1 - sstep(0.27, 0.42, dg);
    const SC = 0.94;
    if (whole > 0.002) {
      const g = ST.sandG;
      const c = ST.sand;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.clearRect(0, 0, c.width, c.height);
      g.translate(c.width / 2, c.height / 2);
      sandwichArt(g);
      g.globalCompositeOperation = "destination-out";
      for (const [bx, by, br, t0] of SAN_BITES) {
        const k = sstep(t0, t0 + 0.08, dg);
        if (k <= 0) continue;
        const r = br * k;
        const ang = Math.atan2(by, bx);
        for (let m = -1; m <= 1; m++) {
          g.beginPath();
          g.arc(bx + Math.cos(ang + Math.PI / 2) * m * r * 0.75, by + Math.sin(ang + Math.PI / 2) * m * r * 0.75, r * 0.72, 0, TAU);
          g.fill();
        }
      }
      ctx.save();
      ctx.translate(st.x, st.y);
      ctx.rotate(st.rot);
      ctx.scale(SC, SC);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.18 * whole;
      ctx.drawImage(SPR.warm, -170, -150, 340, 300);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = whole;
      ctx.drawImage(c, -c.width / 2, -c.height / 2);
      ctx.restore();
    }
    // crumbs drifting apart, shrinking and fading
    const cv = sstep(0.26, 0.36, dg);
    if (cv > 0.002) {
      const cs = Math.cos(st.rot);
      const sn = Math.sin(st.rot);
      for (let i = 0; i < CRUMBS.length; i++) {
        const cb = CRUMBS[i];
        const e = sstep(0.29, 0.92, dg);
        const len = Math.hypot(cb.x, cb.y + 10) || 1;
        let lx = cb.x + (cb.x / len) * (60 + 70 * cb.v) * e + 8 * Math.sin(t * 1.3 + i) * e;
        let ly = lerp(cb.y, 40 + 90 * cb.h, e) + 5 * Math.sin(t * 1.7 + i * 2) * e;
        lx *= SC;
        ly *= SC;
        const x = st.x + lx * cs - ly * sn;
        const y = st.y + lx * sn + ly * cs;
        const fade = 1 - sstep(0.6 + 0.22 * cb.h, 0.95 + 0.04 * cb.h, dg);
        const s = cb.s * SC * (0.35 + 0.65 * fade);
        if (s < 0.5) continue;
        ctx.save();
        ctx.globalAlpha = cv * clamp(fade * 1.3);
        ctx.translate(x, y);
        ctx.rotate(cb.a + e * (cb.h - 0.5) * 3);
        crumb(ctx, cb.kind, s, P);
        ctx.restore();
      }
    }
  }
  function crumb(ctx, kind, s, P) {
    const base = kind === "bread" ? P.bread : kind === "lettuce" ? P.lettuce : kind === "tomato" ? P.tomato : P.cheese;
    const shade = kind === "bread" ? P.breadShade : kind === "lettuce" ? LOCAL.lettuceShade : kind === "tomato" ? LOCAL.tomatoShade : LOCAL.cheeseShade;
    const p = new Path2D();
    if (kind === "lettuce") {
      p.moveTo(-s, 0);
      p.quadraticCurveTo(-s * 0.5, -s * 0.9, 0, -s * 0.5);
      p.quadraticCurveTo(s * 0.6, -s * 0.9, s, 0);
      p.quadraticCurveTo(s * 0.4, s * 0.8, 0, s * 0.5);
      p.quadraticCurveTo(-s * 0.5, s * 0.8, -s, 0);
    } else if (kind === "tomato") {
      p.ellipse(0, 0, s * 0.8, s * 0.6, 0, 0, TAU);
    } else {
      p.roundRect(-s * 0.6, -s * 0.5, s * 1.2, s, s * (kind === "bread" ? 0.3 : 0.12));
    }
    ctx.fillStyle = base;
    ctx.fill(p);
    ctx.save();
    ctx.clip(p);
    cres(ctx, p, KEY[0] * s * 0.35, KEY[1] * s * 0.35, shade);
    if (kind === "bread") cres(ctx, p, 0, -s * 0.2, LOCAL.crust);
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(-s * 0.25, -s * 0.2, s * 0.18, s * 0.1, -0.5, 0, TAU);
    ctx.fill();
  }

  // ---------------- enzymes
  const ENZ = [
    { x: 420, y: 860, ax: 95, ay: 34, fx: 0.19, fy: 0.31, ph: 0.3, r: 48, tgt: "ins", tx: -100, ty: 50 },
    { x: 930, y: 915, ax: 110, ay: 30, fx: 0.15, fy: 0.27, ph: 2.1, r: 44, tgt: "ins", tx: 120, ty: 58 },
    { x: 1420, y: 885, ax: 90, ay: 36, fx: 0.17, fy: 0.29, ph: 4.0, r: 50, tgt: "san", tx: -130, ty: 36 },
    { x: 1650, y: 800, ax: 70, ay: 40, fx: 0.21, fy: 0.24, ph: 5.2, r: 42, tgt: "san", tx: 122, ty: 60 },
  ];
  function enzymeState(e, i, o, t) {
    const ix = e.x + e.ax * Math.sin(t * e.fx + e.ph) + 22 * N1(t * 0.2 + i * 5, 80 + i);
    const iy = e.y + e.ay * Math.sin(t * e.fy + e.ph * 1.3) + 12 * N1(t * 0.25 + i * 3, 90 + i);
    const ivx = e.ax * e.fx * Math.cos(t * e.fx + e.ph);
    const ivy = e.ay * e.fy * Math.cos(t * e.fy + e.ph * 1.3);
    const dg = clamp(o.digest || 0);
    const objP = e.tgt === "ins" ? o.insulin || 0 : o.sandwich || 0;
    const obj = e.tgt === "ins" ? fallState(objP, INS_HOME, INS_FLOAT, t, 1) : fallState(objP, SAN_HOME, SAN_FLOAT, t, 2);
    const landed = objP > IMPACT ? sstep(0.55, 1, objP) : 0;
    const att = Math.max(0.28 * landed, sstep(0, 0.2, dg) * landed) * (1 - 0.65 * sstep(0.75, 1, dg));
    // the target slides along the object as the snipping goes on
    const slide = sstep(0.15, 0.7, dg);
    const tx = obj.x + e.tx * (1 - 0.45 * slide) + 10 * Math.sin(t * 2.2 + i);
    const ty = obj.y + e.ty + 6 * Math.sin(t * 2.7 + i * 2);
    const x = lerp(ix, tx, att);
    const y = lerp(iy, ty, att);
    const toward = Math.sign(obj.x - x) || 1;
    const idleFace = Math.tanh(ivx / 4);
    // turning: the body narrows through a quick 3D-ish flip instead of popping
    let face = Math.tanh(3.5 * lerp(idleFace, toward, sstep(0.12, 0.6, att)));
    if (Math.abs(face) < 0.14) face = face < 0 ? -0.14 : 0.14;
    const vy = lerp(ivy * 3, (obj.y - y) * 0.5, att);
    const tilt = clamp(Math.atan2(vy, 120) * 0.5, -0.28, 0.28) * Math.sign(face);
    const snip = dg > 0.04 && dg < 0.92 && att > 0.4;
    const open = snip ? Math.abs(Math.sin(t * TAU * 2.6 + i * 1.3)) : 0.3 + 0.22 * Math.sin(t * 1.6 + i * 2);
    const look = [(obj.x - x) / 400, (obj.y - y) / 400];
    return { x, y, face, tilt, open, r: e.r, look: att > 0.2 ? look : [Math.sign(ivx) * 0.6, 0.1] };
  }
  // a friendly lumpy protein blob with a little snipping mouth, two eyes and waving cilia
  function drawEnzyme(ctx, s, t, i) {
    const P = HOUSE.pal;
    const r = s.r;
    const wob = (k) => 1 + 0.022 * N1(t * 1.1 + k * 3.1 + i * 7, 100 + i);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.34;
    ctx.drawImage(SPR.violet, -r * 2.3, -r * 2.3, r * 4.6, r * 4.6);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.rotate(s.tilt);
    const fs = s.face;
    ctx.scale(fs, 1);
    const sg = fs < 0 ? -1 : 1;
    // cilia at the back, waving
    ctx.strokeStyle = P.enzymeShade;
    ctx.lineCap = "round";
    ctx.lineWidth = r * 0.09;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI + (k - 1.5) * 0.42;
      const ph = t * 6.5 + k * 1.1 + i;
      const x0 = Math.cos(a) * r * 0.86;
      const y0 = Math.sin(a) * r * 0.8;
      const L = r * (0.42 + 0.06 * k);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + Math.cos(a) * L * 0.5 - Math.sin(a) * L * 0.35 * Math.sin(ph), y0 + Math.sin(a) * L * 0.5 + Math.cos(a) * L * 0.35 * Math.sin(ph), x0 + Math.cos(a) * L + Math.sin(ph + 1) * L * 0.2, y0 + Math.sin(a) * L);
      ctx.stroke();
    }
    // lumpy body outline with the mouth notch at the front (+x)
    const m = 0.12 + 0.5 * s.open;
    const pts = [];
    const N = 22;
    for (let k = 0; k <= N; k++) {
      const a = m + (k / N) * (TAU - 2 * m);
      const rr = r * (1 + 0.07 * Math.sin(3 * a + 0.6) + 0.04 * Math.sin(5 * a + 1.3)) * wob(k % 5);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.88]);
    }
    const body = new Path2D();
    body.moveTo(r * 0.16, 0);
    body.lineTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1];
      const b = pts[k];
      body.quadraticCurveTo(a[0] * 1.03, a[1] * 1.03, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    body.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    body.closePath();
    // inside of the mouth peeks out behind the jaws
    ctx.fillStyle = "#6a1fa0";
    ctx.beginPath();
    ctx.ellipse(r * 0.55, 0, r * 0.42, r * 0.6 * Math.min(1, m * 2), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.enzyme;
    ctx.fill(body);
    ctx.save();
    ctx.clip(body);
    cres(ctx, body, KEY[0] * r * 0.42 * sg, KEY[1] * r * 0.42, P.enzymeShade);
    cres(ctx, body, KEY[0] * r * 0.14 * sg, KEY[1] * r * 0.14, rgba("#5a1a9a", 0.6));
    cres(ctx, body, -KEY[0] * r * 0.1 * sg, -KEY[1] * r * 0.1, LOCAL.enzymeLight);
    // a few darker spots (small detail)
    ctx.fillStyle = rgba(P.enzymeShade, 0.55);
    for (const [sx, sy, sr] of [[-0.45, 0.1, 0.1], [-0.2, 0.42, 0.07], [-0.62, -0.22, 0.06]]) {
      ctx.beginPath();
      ctx.arc(sx * r, sy * r, sr * r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // tiny white blade tips on both jaws (the snippers)
    ctx.fillStyle = "#ffffff";
    for (const sd of [-1, 1]) {
      const ax = Math.cos(m) * r * 0.94;
      const ay = sd * Math.sin(m) * r * 0.82;
      ctx.beginPath();
      ctx.moveTo(ax - r * 0.2, ay - sd * r * 0.02);
      ctx.lineTo(ax + r * 0.04, ay);
      ctx.lineTo(ax - r * 0.14, ay - sd * r * 0.12);
      ctx.closePath();
      ctx.fill();
    }
    // two eyes, the far one slightly smaller
    const lx = clamp(s.look[0] * sg, -1, 1) * r * 0.06;
    const ly = clamp(s.look[1], -1, 1) * r * 0.06;
    for (const [ex, ey, k] of [[r * 0.05, -r * 0.4, 0.85], [r * 0.4, -r * 0.36, 1]]) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.17 * k, r * 0.21 * k, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = LOCAL.pupil;
      ctx.beginPath();
      ctx.ellipse(ex + lx + r * 0.03, ey + ly + r * 0.02, r * 0.1 * k, r * 0.13 * k, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ex + lx - r * 0.01, ey + ly - r * 0.04, r * 0.04 * k, 0, TAU);
      ctx.fill();
    }
    // cheek blush and a specular
    ctx.fillStyle = "rgba(255,120,210,0.45)";
    ctx.beginPath();
    ctx.ellipse(r * 0.3, -r * 0.08, r * 0.12, r * 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, -r * 0.55, r * 0.17, r * 0.08, -0.5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-r * 0.18, -r * 0.66, r * 0.035, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ---------------- splashes
  function splash(ctx, x, u, seed, scale = 1) {
    if (u < 0 || u > 0.7) return;
    const P = HOUSE.pal;
    const k = u / 0.7;
    ctx.save();
    // ring on the surface
    ctx.strokeStyle = rgba(P.acidGlow, 0.85 * (1 - k));
    ctx.lineWidth = 3 * (1 - k) + 1;
    ctx.beginPath();
    ctx.ellipse(x, SURF + 4, (40 + 300 * k) * scale, (8 + 40 * k) * scale, 0, 0, TAU);
    ctx.stroke();
    // crown droplets
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI / 2 + (HS(i, seed, 1) - 0.5) * 2.4;
      const v = (420 + 380 * HS(i, seed, 2)) * scale;
      const tt = u * 1.1;
      const dx = Math.cos(a) * v * tt * 0.75;
      const dy = Math.sin(a) * v * tt + 1500 * tt * tt;
      const y = SURF + dy;
      if (y > SURF + 6) continue;
      const r = (4 + 5 * HS(i, seed, 3)) * scale * (1 - k * 0.6);
      const vx = Math.cos(a) * v * 0.75;
      const vy = Math.sin(a) * v + 3000 * tt;
      const ang = Math.atan2(vy, vx);
      ctx.save();
      ctx.translate(x + dx, y);
      ctx.rotate(ang);
      ctx.fillStyle = rgba(P.acid, 0.95);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.7, r, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(P.acidGlow, 0.95);
      ctx.beginPath();
      ctx.ellipse(r * 0.3, -r * 0.3, r * 0.6, r * 0.35, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // central column
    if (k < 0.5) {
      const hgt = 90 * scale * Math.sin((k / 0.5) * Math.PI);
      const w = 13 * scale;
      ctx.fillStyle = rgba(P.acid, 0.9);
      ctx.beginPath();
      ctx.moveTo(x - w * 2, SURF + 4);
      ctx.bezierCurveTo(x - w * 0.7, SURF, x - w, SURF - hgt + w, x, SURF - hgt);
      ctx.bezierCurveTo(x + w, SURF - hgt + w, x + w * 0.7, SURF, x + w * 2, SURF + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = rgba(P.acidGlow, 0.9);
      ctx.beginPath();
      ctx.ellipse(x - w * 0.3, SURF - hgt + w * 0.9, w * 0.25, w * 0.6, 0, 0, TAU);
      ctx.fill();
      // a drop pinching off the top
      const dy = SURF - hgt - 18 * scale - 60 * scale * k;
      ctx.fillStyle = rgba(P.acid, 0.95);
      ctx.beginPath();
      ctx.ellipse(x, dy, w * 0.6, w * 0.75, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------------- medicine drops (garnish)
  const MEDS = [
    [610, 0.0, 0],
    [1030, 0.07, 1],
    [1420, 0.13, 2],
    [880, 0.2, 3],
  ];
  function drawMeds(ctx, o, t, phase) {
    const m = clamp(o.meds || 0);
    if (m <= 0.001) return;
    const P = HOUSE.pal;
    for (const [x0, d, i] of MEDS) {
      const k = m - d;
      if (k <= 0) continue;
      const fallEnd = 0.16;
      const x = x0 + 14 * Math.sin(t * 0.8 + i);
      if (k < fallEnd) {
        if (phase !== "above") continue;
        const u = k / fallEnd;
        const y = lerp(-80, SURF, u * u);
        medDropScreen(ctx, x, y, 15, 1.7, 1);
        continue;
      }
      const u = clamp((k - fallEnd) / (0.72 - fallEnd));
      if (phase === "above") {
        splash(ctx, x, (k - fallEnd) * 1.4, 40 + i, 0.45);
        continue;
      }
      if (u >= 1) continue;
      const y = SURF + 30 + 140 * Math.sqrt(u);
      const r = 15 * (1 - u);
      // dissolving swirl
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (let s = 0; s < 3; s++) {
        ctx.strokeStyle = rgba(P.med, 0.5 * (1 - u) * (1 - s * 0.25));
        ctx.lineWidth = 5 - s;
        ctx.beginPath();
        for (let j = 0; j <= 20; j++) {
          const q = j / 20;
          const rr = (12 + 70 * u) * q * (1 + 0.3 * s);
          const a = q * 5 + t * 1.5 + s * 2.1 + i;
          const px = x + Math.cos(a) * rr * 1.3;
          const py = y - 20 * q + Math.sin(a) * rr * 0.45;
          if (j === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
      if (r > 0.6) medDropScreen(ctx, x, y, r, 1, 1 - u * 0.5);
    }
  }
  function medDropScreen(ctx, x, y, r, stretch, a) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.7 * a;
    ctx.drawImage(SPR.aqua, x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    ctx.scale(1 / Math.sqrt(stretch), stretch);
    const s = (r / 0.4) * 1.0;
    ctx.drawImage(SPR.medBall, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  // ---------------- bubbles, drips, particles
  const BUB = (() => {
    const out = [];
    for (let i = 0; i < 46; i++) {
      out.push({ x: -100 + HS(i, 1, 9) * 2120, r: 3 + Math.pow(HS(i, 2, 9), 2) * 13, P: 3.2 + HS(i, 3, 9) * 5, ph: HS(i, 4, 9), w: HS(i, 5, 9) });
    }
    return out;
  })();
  const DRIPS = [
    [520, 168, 4.2, 0.1],
    [1150, 120, 5.0, 0.55],
    [1480, 230, 3.7, 0.3],
    [300, 300, 4.8, 0.8],
  ];

  function acidBody(ctx, t) {
    const P = HOUSE.pal;
    const x0 = -SMM - 40;
    const x1 = W + SMM + 40;
    const path = new Path2D();
    path.moveTo(x0, surfY(x0, t));
    for (let x = x0; x <= x1; x += 24) path.lineTo(x, surfY(x, t));
    path.lineTo(x1, H + SMM + 40);
    path.lineTo(x0, H + SMM + 40);
    path.closePath();
    const gr = ctx.createLinearGradient(0, SURF - 10, 0, H + 60);
    gr.addColorStop(0, P.acidGlow);
    gr.addColorStop(0.035, P.acid);
    gr.addColorStop(0.12, P.acidShade);
    gr.addColorStop(0.42, LOCAL.acidDeep);
    gr.addColorStop(1, LOCAL.acidBottom);
    ctx.fillStyle = gr;
    ctx.fill(path);
    return path;
  }

  BODY.stomach = function (ctx, o) {
    o = o || {};
    if (!READY) return;
    const P = HOUSE.pal;
    const t = o.t || 0;
    const cm = camOf(o);
    ctx.save();
    ctx.fillStyle = LOCAL.wallFar;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    applyCam(ctx, cm);
    // walls, gently squeezing (peristalsis)
    const br = 1 + 0.007 * Math.sin((TAU * t) / 6.5);
    ctx.save();
    ctx.translate(VP[0], VP[1]);
    ctx.scale(br, br * (1 + 0.003 * Math.sin((TAU * t) / 6.5 + 1)));
    ctx.translate(-VP[0], -VP[1]);
    ctx.drawImage(ST.walls, -SMM, -SMM);
    ctx.restore();
    ctx.globalCompositeOperation = "lighter";
    // the far end breathes light
    ctx.globalAlpha = 0.18 + 0.08 * Math.sin(t * 0.7);
    ctx.drawImage(SPR.pink, VP[0] - 360, VP[1] - 360, 720, 720);
    // acid light on the lower walls, flickering
    ctx.globalAlpha = 0.34 + 0.06 * Math.sin(t * 2.3) + 0.04 * N1(t * 3, 5);
    ctx.drawImage(SPR.green, CX - 1300, SURF - 360, 2600, 720);
    // twinkling wet glints on the folds
    for (let i = 0; i < ST.glints.length; i++) {
      const [gx, gy, gk] = ST.glints[i];
      const tw = Math.pow(Math.max(0, Math.sin(t * (0.6 + 0.5 * HS(i, 3, 3)) + i * 2.3)), 6);
      if (tw < 0.02) continue;
      ctx.globalAlpha = tw;
      const s = 10 + 14 * gk;
      ctx.drawImage(SPR.star, gx - s, gy - s, s * 2, s * 2);
    }
    // floating specks in the air
    for (let i = 0; i < 40; i++) {
      const x = ((HS(i, 1, 4) * 2200 + t * (6 + 10 * HS(i, 2, 4))) % 2200) - 140;
      const y = 60 + HS(i, 3, 4) * (SURF - 120) + 16 * Math.sin(t * 0.4 + i) + 22 * Math.sin(t * 0.13 * (1 + HS(i, 6, 4)) + i * 2);
      const s = 2 + 5 * HS(i, 4, 4);
      ctx.globalAlpha = (0.25 + 0.35 * HS(i, 5, 4)) * (0.6 + 0.4 * Math.sin(t + i));
      ctx.drawImage(SPR.pinkHot, x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    // mucus drips from the ceiling folds
    for (let i = 0; i < DRIPS.length; i++) {
      const [dx, dy, per, ph] = DRIPS[i];
      const u = ((t / per + ph) % 1 + 1) % 1;
      const grow = sstep(0, 0.55, u);
      ctx.fillStyle = rgba(LOCAL.mucus, 0.75);
      if (u < 0.62) {
        const r = 1 + 7 * grow;
        ctx.beginPath();
        ctx.ellipse(dx, dy + r * 0.9, r * 0.8, r * (1 + 0.4 * grow), 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.arc(dx - r * 0.3, dy + r * 0.6, r * 0.25, 0, TAU);
        ctx.fill();
      } else {
        const fu = (u - 0.62) / 0.38;
        const fallT = fu * 0.9;
        const y = dy + 12 + 1100 * fallT * fallT;
        if (y < surfY(dx, t)) {
          const v = 2200 * fallT;
          const st2 = 1 + Math.min(2.2, v / 400);
          ctx.beginPath();
          ctx.ellipse(dx, y, 5 / Math.sqrt(st2), 5 * st2, 0, 0, TAU);
          ctx.fill();
        } else {
          const tImp = Math.sqrt((surfY(dx, t) - dy - 12) / 1100);
          const k = (fallT - tImp) / 0.3;
          if (k < 1) {
            ctx.strokeStyle = rgba(P.acidGlow, 0.7 * (1 - k));
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(dx, SURF + 3, 8 + 40 * k, 2 + 7 * k, 0, 0, TAU);
            ctx.stroke();
          }
        }
      }
    }
    // mist hanging over the acid (behind the surface line)
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 8; i++) {
      const sp = (i % 2 ? 1 : -1) * (10 + 8 * HS(i, 1, 6));
      const x = ((HS(i, 2, 6) * 2600 + t * sp) % 2600 + 2600) % 2600 - 340;
      const y = SURF - 40 - 70 * HS(i, 3, 6);
      ctx.globalAlpha = 0.06 + 0.04 * Math.sin(t * 0.5 + i);
      ctx.drawImage(SPR.mist, x - 260, y - 50, 520, 100);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // ---- the acid
    const acid = acidBody(ctx, t);
    ctx.save();
    ctx.clip(acid);
    // caustic light lines
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let k = 0; k < 7; k++) {
      const y0 = SURF + 28 + k * 44 + 6 * Math.sin(t * 0.6 + k);
      ctx.strokeStyle = rgba(P.acidGlow, 0.16 - k * 0.018);
      ctx.lineWidth = 3 - k * 0.25;
      ctx.beginPath();
      for (let x = -SMM; x <= W + SMM; x += 30) {
        const y = y0 + 9 * Math.sin(x * 0.011 + t * (0.9 + 0.1 * k) + k * 1.3) + 5 * Math.sin(x * 0.027 - t * 1.4);
        if (x === -SMM) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.setLineDash([60 + 20 * k, 40 + 10 * k]);
      ctx.lineDashOffset = -t * (20 + 6 * k);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // soft light pools drifting in the acid
    for (let i = 0; i < 5; i++) {
      const x = ((HS(i, 3, 12) * 2800 + t * (9 + 6 * HS(i, 4, 12))) % 2800) - 440;
      const y = SURF + 90 + 170 * HS(i, 5, 12) + 20 * Math.sin(t * 0.3 + i);
      ctx.globalAlpha = 0.16 + 0.08 * Math.sin(t * 0.5 + i * 2);
      ctx.drawImage(SPR.green, x - 300, y - 120, 600, 240);
    }
    // glowing sparkles in the depth
    for (let i = 0; i < 40; i++) {
      const x = ((HS(i, 7, 2) * 2100 + t * (4 + 6 * HS(i, 8, 2))) % 2100) - 90;
      const ry = (((HS(i, 9, 2) * 340 - t * (5 + 9 * HS(i, 10, 2))) % 340) + 340) % 340;
      const y = SURF + 40 + ry;
      const s = 2 + 4 * HS(i, 11, 2);
      ctx.globalAlpha = (0.3 + 0.4 * Math.sin(t * 1.3 + i * 1.7) ** 2) * sstep(0, 40, ry) * sstep(340, 300, ry);
      ctx.drawImage(SPR.greenHot, x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    // rising bubbles
    for (let i = 0; i < BUB.length; i++) {
      const b = BUB[i];
      const u = ((t / b.P + b.ph) % 1 + 1) % 1;
      const x = b.x + 7 * Math.sin(t * (1.6 + b.w) + i);
      const top = surfY(x, t);
      const yb = H + 40 + b.w * 80;
      if (u < 0.93) {
        const y = lerp(yb, top + b.r * 0.6, u / 0.93);
        const s = b.r * (0.75 + 0.35 * (u / 0.93));
        ctx.globalAlpha = 0.85;
        ctx.drawImage(SPR.bubble, x - s, y - s, s * 2, s * 2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    // ---- things in the acid
    drawMeds(ctx, o, t, "in");
    const es = ENZ.map((e, i) => enzymeState(e, i, o, t));
    // enzymes deeper than the objects go first
    es.forEach((s, i) => {
      if (s.y > SURF + 60) drawEnzyme(ctx, s, t, i);
    });
    drawInsulin(ctx, o, t);
    drawSandwich(ctx, o, t);
    // fizz: the acid works on whatever floats in it
    const fizzOf = (p, x0, y0, seed) => {
      if (!(p > IMPACT)) return;
      const dg = clamp(o.digest || 0);
      const act = 0.35 + 0.65 * sstep(0, 0.2, dg) * (1 - sstep(0.85, 1, dg));
      ctx.save();
      for (let i = 0; i < 14; i++) {
        const u = (t * (0.7 + 0.5 * HS(i, seed, 1)) + HS(i, seed, 2)) % 1;
        const x = x0 + (HS(i, seed, 3) - 0.5) * 220 + 6 * Math.sin(t * 3 + i);
        const y = y0 + 40 - u * 90;
        if (y < SURF - 6) continue;
        const s = 2 + 4 * HS(i, seed, 4);
        ctx.globalAlpha = act * Math.sin(Math.PI * u) * 0.9;
        ctx.drawImage(SPR.bubble, x - s, y - s, s * 2, s * 2);
      }
      ctx.restore();
    };
    const ins = fallState(o.insulin || 0, INS_HOME, INS_FLOAT, t, 1);
    const san = sandwichState(o, t);
    fizzOf(o.insulin, ins.x, ins.y, 5);
    fizzOf(o.sandwich, san.x, san.y, 6);
    es.forEach((s, i) => {
      if (s.y <= SURF + 60) drawEnzyme(ctx, s, t, i);
    });
    // a translucent acid veil over everything below the surface
    ctx.save();
    ctx.clip(acid);
    ctx.fillStyle = rgba(P.acid, 0.2);
    ctx.fillRect(-SMM - 40, SURF - 30, W + 2 * SMM + 80, H + SMM);
    const vg = ctx.createLinearGradient(0, SURF, 0, SURF + 60);
    vg.addColorStop(0, rgba(P.acidGlow, 0.35));
    vg.addColorStop(1, rgba(P.acidGlow, 0));
    ctx.fillStyle = vg;
    ctx.fillRect(-SMM - 40, SURF - 30, W + 2 * SMM + 80, 100);
    ctx.restore();
    // the surface: glowing meniscus, foam and popping bubbles
    ctx.save();
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let x = -SMM - 40; x <= W + SMM + 40; x += 16) {
      const y = surfY(x, t);
      if (x === -SMM - 40) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(P.acidGlow, 0.22);
    ctx.lineWidth = 18;
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = P.acidGlow;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    for (let i = 0; i < 70; i++) {
      const x = ((HS(i, 1, 13) * 2200 + t * 8 * (HS(i, 2, 13) - 0.5)) % 2200 + 2200) % 2200 - 140;
      const s = 2 + 5 * HS(i, 3, 13) ** 2;
      const y = surfY(x, t) - s * 0.4;
      ctx.globalAlpha = 0.7;
      ctx.drawImage(SPR.bubble, x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < BUB.length; i++) {
      const b = BUB[i];
      const u = ((t / b.P + b.ph) % 1 + 1) % 1;
      if (u < 0.93) continue;
      const k = (u - 0.93) / 0.07;
      const x = b.x + 7 * Math.sin(t * (1.6 + b.w) + i);
      const y = surfY(x, t);
      ctx.strokeStyle = rgba(P.acidGlow, 0.9 * (1 - k));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, b.r * (0.8 + 2.4 * k), b.r * (0.25 + 0.6 * k), 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = rgba(P.acidGlow, 0.9 * (1 - k));
      for (let j = 0; j < 3; j++) {
        const a = -Math.PI / 2 + (j - 1) * 0.7;
        const d = b.r * (1 + 3 * k);
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d - 10 * k * (1 - k) * 4, 1.6, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    // splashes (above the surface)
    if (ins.splash >= 0) splash(ctx, ins.x, ins.splash * 0.9, 21, 1);
    if (san.splash >= 0) splash(ctx, san.x, san.splash * 0.9, 22, 1.15);
    drawMeds(ctx, o, t, "above");
    // near mist, low over the surface
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const x = ((HS(i, 5, 7) * 2600 + t * (14 + 6 * HS(i, 6, 7))) % 2600) - 340;
      const y = SURF - 16 + 10 * Math.sin(t * 0.4 + i);
      ctx.globalAlpha = 0.1 + 0.05 * Math.sin(t * 0.6 + i * 2);
      ctx.drawImage(SPR.mist, x - 330, y - 60, 660, 120);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
    // foreground folds with a little extra parallax
    ctx.save();
    const fz = 1 + (cm.z - 1) * 1.25;
    ctx.translate(CX + cm.x * 1.25, CY + cm.y * 1.25);
    ctx.scale(fz, fz);
    ctx.translate(-CX, -CY);
    const fb = 1 + 0.01 * Math.sin((TAU * t) / 6.5 + 0.5);
    ctx.translate(CX, CY);
    ctx.scale(fb, fb);
    ctx.translate(-CX, -CY);
    ctx.drawImage(ST.fg, -SMM, -SMM);
    ctx.restore();
    ctx.restore();
  };

  BODY.stomachAnchors = function (o) {
    o = o || {};
    const t = o.t || 0;
    const cm = camOf(o);
    const ins = fallState(o.insulin || 0, INS_HOME, INS_FLOAT, t, 1);
    const san = sandwichState(o, t);
    return {
      insulin: camPt(cm, ins.x, ins.y),
      sandwich: camPt(cm, san.x, san.y),
      acid: camPt(cm, 520, 880),
    };
  };

  // ================================================================== init
  let READY = false;
  let INIT = null;
  BODY.init = function () {
    if (INIT) return INIT;
    INIT = new Promise((resolve) => {
      const P = HOUSE.pal;
      SPR.aqua = glowSprite(P.med);
      SPR.aquaHot = glowSprite(mixc(P.medGlow, [255, 255, 255], 0.4), 64, [1, 0.6, 0.15]);
      SPR.red = glowSprite([255, 70, 100], 128, [0.8, 0.35, 0.08]);
      SPR.violet = glowSprite([150, 90, 255], 128, [0.7, 0.3, 0.07]);
      SPR.cyan = glowSprite([110, 200, 255], 64, [0.9, 0.35, 0.08]);
      SPR.pink = glowSprite([255, 140, 210], 128, [0.8, 0.35, 0.08]);
      SPR.pinkHot = glowSprite([255, 210, 235], 32, [1, 0.5, 0.1]);
      SPR.green = glowSprite(P.acid, 128, [0.7, 0.32, 0.08]);
      SPR.greenHot = glowSprite(P.acidGlow, 32, [1, 0.5, 0.1]);
      SPR.gold = glowSprite(P.insulin, 64, [0.85, 0.35, 0.08]);
      SPR.warm = glowSprite([255, 200, 120], 64, [0.6, 0.3, 0.06]);
      SPR.star = starSprite("#ffffff");
      SPR.bubble = bubbleSprite(P.acidGlow);
      SPR.bead = ballSprite(P.insulin, P.insulinShade, LOCAL.insulinHi);
      SPR.medBall = ballSprite(P.med, P.medDeep, P.medGlow);
      // a soft horizontal haze for mist
      const mc = canvas(256, 64);
      const mg = mc.getContext("2d");
      mg.translate(128, 32);
      mg.scale(1, 0.25);
      const mgr = mg.createRadialGradient(0, 0, 0, 0, 0, 128);
      mgr.addColorStop(0, rgba(P.acidGlow, 0.9));
      mgr.addColorStop(0.5, rgba(P.acidGlow, 0.35));
      mgr.addColorStop(1, rgba(P.acidGlow, 0));
      mg.fillStyle = mgr;
      mg.fillRect(-128, -128, 256, 256);
      SPR.mist = mc;
      // x-ray
      const parts = bodyParts();
      buildFigure(parts);
      buildNet();
      buildHeart();
      buildGut();
      XR.bg = buildXrayBg();
      // stomach
      buildWalls();
      ST.sand = canvas(300, 240);
      ST.sandG = ST.sand.getContext("2d");
      READY = true;
      resolve();
    });
    return INIT;
  };
})();

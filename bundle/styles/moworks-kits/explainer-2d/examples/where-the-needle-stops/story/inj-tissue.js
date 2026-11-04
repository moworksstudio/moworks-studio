/* inj-tissue.js: the tissue shots of "Where the Needle Stops" (shots 6-9): the arm cross-section
 * with three needles, and the fat, muscle and vein close-ups that carry the film's idea
 * (fat: hours, muscle: minutes, vein: seconds).
 * Classic script; loads after ex/ex-core.js, ex/house-pal.js and story/inj-pal.js. Every draw is a
 * pure function of its options (no state between calls); static geometry and painted layers are
 * built once in init() from seeded generators.
 *
 *   await HOUSE.tissue.init();
 *
 *   Common options: t = seconds (ambient life), cam = { zoom = 1, x = 0, y = 0 }: zoom about the frame
 *   centre, then pan in screen px (cam.x > 0 moves the view right, i.e. the picture slides left).
 *   Every scene paints the whole 1920x1080 frame (opaque) with margin for zoom <= 1.1 and pan +-60 px.
 *
 *   HOUSE.tissue.section(ctx, { t, cam, needles = [0, 0, 0], glow = 0 })
 *       Side cut through the upper arm, horizontal bands: dark clinic wall above the skin (top ~19 %),
 *       epidermis with tiny hairs, dermis (follicles, sebaceous and sweat glands, capillary loops),
 *       subcutaneous fat (lobules of round cells, ~27 %), a superficial vein in the lower fat (it runs
 *       in from the right edge and dives through the fascia as a perforator at x ~ 1050, so the IM
 *       needle never crosses it; blood streams slowly leftwards inside), a glossy fascia, muscle
 *       fascicles with striations to the bottom. Three needles, syringe barrels with aqua medicine:
 *         [0] subcutaneous: 45 deg from the upper left, enters x ~ 392, tip stops in the fat (585, 393)
 *         [1] intramuscular: 90 deg at x = 960, tip stops deep in the muscle (960, 850)
 *         [2] intravenous: 25 deg from the upper right, enters x ~ 1780, tip in the vein lumen (1200, 470)
 *             (its barrel sits in the top-right corner, mostly off frame: the angle is shallow)
 *       needles[i] 0..1 = insertion (0 = tip just above the skin, 1 = at its stop; linear in depth, the
 *       story eases). The skin dimples as a tip arrives, tissue parts around each shaft (fat cells are
 *       pushed aside, a slit opens in dermis/muscle), the vein wall dents before the IV tip pierces it.
 *       glow 0..1 = aqua bloom + droplet of medicine at each tip (the IV one drifts downstream).
 *   HOUSE.tissue.sectionAnchors(opts) -> { tips: [[x, y] x3], layers: { skin, fat, muscle, vein } }
 *       Screen points (cam applied). tips follow needles[]; layer points sit in clear areas between the
 *       needles (skin = on the surface, vein = on its centre line).
 *
 *   HOUSE.tissue.fat(ctx, { t, cam, k = 0 })
 *       Close-up inside the fat: big glossy cells packed like soap bubbles (cel shaded, specular,
 *       pale membrane, flattened nucleus at the edge), dark gaps with pale connective strands, three
 *       thin capillaries with slow single-file blood cells. A glowing aqua pool sits in a hollow at the
 *       centre. k 0..1: the pool shrinks and the medicine creeps outward through the gaps (soft,
 *       irregular front); the front reaches the capillaries late and only a few aqua specks are
 *       carried off, slowly. Built to feel lazy: "hours".
 *   HOUSE.tissue.fatAnchors(opts) -> { deposit: [x, y] }
 *
 *   HOUSE.tissue.muscle(ctx, { t, cam, k = 0 })
 *       Close-up of muscle: diagonal red fascicles of striated fibres with sheen, wrapped in a dense
 *       capillary web with streaming red cells. An aqua pool in the middle; k 0..1: it soaks into the
 *       many nearby capillaries quickly (glowing streams carried off at blood speed). "minutes".
 *   HOUSE.tissue.muscleAnchors(opts) -> { deposit: [x, y] }
 *
 *   HOUSE.tissue.vein(ctx, { t, cam, k = 0 })
 *       Along a wide vein (gentle diagonal, flow left -> right): translucent blue-violet wall with a
 *       valve, tumbling biconcave red cells streaming fast with motion streaks. A needle pierces the
 *       top wall at the upper left. k 0..1: aqua medicine jets from the bevel and races downstream with
 *       the cells (front speed ~2200 px per unit k); after k = 1 the stream keeps flowing (t); k > 1 is fine. "seconds".
 *   HOUSE.tissue.veinAnchors(opts) -> { stream: [x, y], tip: [x, y] }   (stream = just above the stream ~560 px downstream)
 *
 * Local colours not in HOUSE.pal (gap darks, membranes, fascia sheen) are in the C table below.
 */
(function () {
  "use strict";
  const HOUSE = (window.HOUSE = window.HOUSE || {});
  const TS = (HOUSE.tissue = HOUSE.tissue || {});
  const W = 1920;
  const H = 1080;
  const TAU = Math.PI * 2;
  const MG = 150; // margin painted around every cached layer (zoom 1.1 + pan 60 px)
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };
  const hex = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgba = (c, a = 1) => "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
  const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const mk = (w, h) => {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };
  const hash = (i, j, k) => EX.hash(i, j, k);
  const noise = (x, s) => EX.noise1(x, s);
  const fbm = (x, seed, oct = 3) => {
    let a = 0;
    let amp = 1;
    let n = 0;
    let f = 1;
    for (let i = 0; i < oct; i++) {
      a += noise(x * f, seed + i * 31) * amp;
      n += amp;
      amp *= 0.5;
      f *= 2.07;
    }
    return a / n;
  };

  // ------------------------------------------------------------------ colours
  let P = null; // palette as rgb arrays, filled in init()
  const C = {
    // local additions (not in HOUSE.pal)
    gapFat: [58, 14, 54], // dark warm violet between fat cells
    gapFatDeep: [34, 8, 40],
    membrane: [255, 244, 200], // pale fat-cell border
    nucleus: [176, 74, 112], // flattened nucleus (magenta-brown)
    nucleusLight: [236, 136, 150],
    septum: [168, 62, 98], // fibrous septa between fat lobules (section)
    septumDeep: [116, 32, 80],
    strand: [255, 190, 200], // connective strands
    fascia: [246, 214, 255],
    fasciaShade: [176, 120, 214],
    gapMuscle: [64, 6, 44],
    gapMuscleDeep: [36, 4, 34],
    plasma: [92, 14, 62],
    plasmaDeep: [46, 8, 46],
    lumenBack: [118, 26, 86],
    fatShadow: [232, 128, 74], // fat shade pushed toward magenta
    fatShadowDeep: [196, 82, 86],
    rbcDeep: [140, 14, 58],
    rbcLight: [255, 130, 130],
    hairC: [74, 40, 94],
    hairRim: [170, 140, 220],
    tissueBg: [26, 8, 52],
  };

  // ------------------------------------------------------------------ camera
  function camOf(o) {
    const c = (o && o.cam) || {};
    return { z: c.zoom || 1, x: c.x || 0, y: c.y || 0 };
  }
  function applyCam(ctx, o) {
    const c = camOf(o);
    ctx.translate(W / 2 - c.x, H / 2 - c.y);
    ctx.scale(c.z, c.z);
    ctx.translate(-W / 2, -H / 2);
  }
  function toScreen(o, p) {
    const c = camOf(o);
    return [W / 2 - c.x + (p[0] - W / 2) * c.z, H / 2 - c.y + (p[1] - H / 2) * c.z];
  }

  // ------------------------------------------------------------------ sprites
  const SPR = {};
  function radialSprite(size, stops) {
    const c = mk(size, size);
    const g = c.getContext("2d");
    const h = size / 2;
    const gr = g.createRadialGradient(h, h, 0, h, h, h);
    for (const s of stops) gr.addColorStop(s[0], s[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }
  function flareSprite(size, col, glow, thin = 0.08) {
    const c = mk(size, size);
    const g = c.getContext("2d");
    const h = size / 2;
    let gr = g.createRadialGradient(h, h, 0, h, h, h * 0.6);
    gr.addColorStop(0, rgba(glow, 0.55));
    gr.addColorStop(0.4, rgba(glow, 0.16));
    gr.addColorStop(1, rgba(glow, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    const L = h * 0.96;
    const w = h * thin;
    g.fillStyle = rgba(col, 1);
    g.beginPath();
    g.moveTo(h - L, h);
    g.quadraticCurveTo(h - w, h - w, h, h - L);
    g.quadraticCurveTo(h + w, h - w, h + L, h);
    g.quadraticCurveTo(h + w, h + w, h, h + L);
    g.quadraticCurveTo(h - w, h + w, h - L, h);
    g.fill();
    gr = g.createRadialGradient(h, h, 0, h, h, h * 0.2);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }
  function buildSprites() {
    const med = P.med;
    const mg = P.medGlow;
    SPR.medGlow = radialSprite(128, [
      [0, rgba([235, 255, 252], 1)],
      [0.1, rgba(mg, 0.9)],
      [0.25, rgba(med, 0.5)],
      [0.55, rgba(P.medDeep, 0.14)],
      [1, rgba(P.medDeep, 0)],
    ]);
    SPR.medSoft = radialSprite(128, [
      [0, rgba(med, 0.55)],
      [0.4, rgba(med, 0.22)],
      [1, rgba(P.medDeep, 0)],
    ]);
    SPR.medDot = radialSprite(32, [
      [0, "rgba(255,255,255,1)"],
      [0.2, rgba(mg, 1)],
      [0.45, rgba(med, 0.55)],
      [1, rgba(med, 0)],
    ]);
    SPR.soft = radialSprite(64, [
      [0, "rgba(255,255,255,1)"],
      [0.45, "rgba(255,255,255,0.35)"],
      [1, "rgba(255,255,255,0)"],
    ]);
    SPR.warmDot = radialSprite(32, [
      [0, "rgba(255,246,220,1)"],
      [0.3, "rgba(255,200,140,0.6)"],
      [1, "rgba(255,150,120,0)"],
    ]);
    SPR.pinkDot = radialSprite(32, [
      [0, "rgba(255,236,246,1)"],
      [0.3, "rgba(255,150,200,0.5)"],
      [1, "rgba(255,90,170,0)"],
    ]);
    SPR.lavDot = radialSprite(32, [
      [0, "rgba(240,234,255,1)"],
      [0.3, "rgba(180,160,255,0.5)"],
      [1, "rgba(130,100,230,0)"],
    ]);
    SPR.redGlow = radialSprite(64, [
      [0, "rgba(255,120,130,0.6)"],
      [0.5, "rgba(255,60,100,0.18)"],
      [1, "rgba(255,40,90,0)"],
    ]);
    SPR.flareAqua = flareSprite(96, [236, 255, 252], mg);
    SPR.flareWhite = flareSprite(96, [255, 255, 255], [200, 190, 255]);
    SPR.bokehWarm = radialSprite(64, [
      [0, "rgba(255,190,120,0.5)"],
      [0.6, "rgba(255,170,110,0.32)"],
      [0.85, "rgba(255,150,110,0.1)"],
      [1, "rgba(255,140,110,0)"],
    ]);
    SPR.bokehLav = radialSprite(64, [
      [0, "rgba(120,96,230,0.45)"],
      [0.6, "rgba(120,96,230,0.28)"],
      [1, "rgba(120,96,230,0)"],
    ]);
  }
  function spr(ctx, img, x, y, r, a = 1) {
    if (a <= 0.003 || r <= 0.2) return;
    const pa = ctx.globalAlpha;
    ctx.globalAlpha = pa * Math.min(1, a);
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = pa;
  }

  // ------------------------------------------------------------------ geometry helpers
  // Polygon clip by half-plane (p . n <= d)
  function clipHalf(poly, nx, ny, d) {
    const out = [];
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % n];
      const da = a[0] * nx + a[1] * ny - d;
      const db = b[0] * nx + b[1] * ny - d;
      if (da <= 0) out.push(a);
      if (da <= 0 !== db <= 0) {
        const u = da / (da - db);
        out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
      }
    }
    return out;
  }
  // inset Voronoi cells: sites [[x,y]], gap = px between neighbours, box = [x0,y0,x1,y1]
  function voronoi(sites, gap, box, reach = 600) {
    const cells = [];
    for (let i = 0; i < sites.length; i++) {
      const s = sites[i];
      let poly = [
        [box[0], box[1]],
        [box[2], box[1]],
        [box[2], box[3]],
        [box[0], box[3]],
      ];
      for (let j = 0; j < sites.length && poly.length; j++) {
        if (j === i) continue;
        const o = sites[j];
        const dx = o[0] - s[0];
        const dy = o[1] - s[1];
        const d = Math.hypot(dx, dy);
        if (d > reach || d < 1e-6) continue;
        const nx = dx / d;
        const ny = dy / d;
        poly = clipHalf(poly, nx, ny, s[0] * nx + s[1] * ny + d / 2 - gap / 2);
      }
      cells.push(poly);
    }
    return cells;
  }
  function centroid(poly) {
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const c = p[0] * q[1] - q[0] * p[1];
      a += c;
      cx += (p[0] + q[0]) * c;
      cy += (p[1] + q[1]) * c;
    }
    if (Math.abs(a) < 1e-6) return [poly[0][0], poly[0][1], 0];
    return [cx / (3 * a), cy / (3 * a), Math.abs(a / 2)];
  }
  function chaikin(poly, it, closed = true) {
    let p = poly;
    for (let k = 0; k < it; k++) {
      const q = [];
      const n = p.length;
      const m = closed ? n : n - 1;
      if (!closed) q.push(p[0]);
      for (let i = 0; i < m; i++) {
        const a = p[i];
        const b = p[(i + 1) % n];
        q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
        q.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      if (!closed) q.push(p[n - 1]);
      p = q;
    }
    return p;
  }
  function polyPath(poly, closed = true) {
    const p = new Path2D();
    p.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) p.lineTo(poly[i][0], poly[i][1]);
    if (closed) p.closePath();
    return p;
  }
  // Catmull-Rom through points, sampled every `step` px (approx.) -> uniform polyline track
  function track(pts, step = 4) {
    const dense = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2));
      for (let j = 0; j < n; j++) {
        const u = j / n;
        const u2 = u * u;
        const u3 = u2 * u;
        const f = (a, b, c, d) =>
          0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
        dense.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    dense.push(pts[pts.length - 1]);
    // resample uniformly
    const cum = [0];
    for (let i = 1; i < dense.length; i++)
      cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const len = cum[cum.length - 1];
    const n = Math.max(2, Math.round(len / step));
    const xs = new Float32Array(n + 1);
    const ys = new Float32Array(n + 1);
    let j = 0;
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * len;
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const u = (s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]);
      xs[i] = lerp(dense[j][0], dense[j + 1][0], u);
      ys[i] = lerp(dense[j][1], dense[j + 1][1], u);
    }
    const T = { xs, ys, n, len, step: len / n };
    T.path = new Path2D();
    T.path.moveTo(xs[0], ys[0]);
    for (let i = 1; i <= n; i++) T.path.lineTo(xs[i], ys[i]);
    return T;
  }
  // point + unit tangent at arc length s (clamped)
  function at(T, s) {
    const f = clamp(s / T.step, 0, T.n - 1e-4);
    const i = Math.floor(f);
    const u = f - i;
    const x = lerp(T.xs[i], T.xs[i + 1], u);
    const y = lerp(T.ys[i], T.ys[i + 1], u);
    let tx = T.xs[i + 1] - T.xs[i];
    let ty = T.ys[i + 1] - T.ys[i];
    const l = Math.hypot(tx, ty) || 1;
    return [x, y, tx / l, ty / l];
  }
  // sub-path of a track between arc lengths
  function subPath(ctx, T, s0, s1) {
    const i0 = clamp(Math.floor(s0 / T.step), 0, T.n);
    const i1 = clamp(Math.ceil(s1 / T.step), 0, T.n);
    if (i1 <= i0) return false;
    ctx.beginPath();
    ctx.moveTo(T.xs[i0], T.ys[i0]);
    for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(T.xs[i], T.ys[i]);
    return true;
  }
  function nearestOnTrack(T, x, y) {
    let best = 1e18;
    let bi = 0;
    for (let i = 0; i <= T.n; i++) {
      const d = (T.xs[i] - x) ** 2 + (T.ys[i] - y) ** 2;
      if (d < best) {
        best = d;
        bi = i;
      }
    }
    return [bi * T.step, Math.sqrt(best)];
  }
  // cel tube along a path: shadow body, lit body shifted toward the light, thin highlight
  function tube(ctx, path, w, base, shade, hi, alpha = 1) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = alpha;
    ctx.lineWidth = w;
    ctx.strokeStyle = rgba(shade);
    ctx.stroke(path);
    ctx.save();
    ctx.translate(-w * 0.08, -w * 0.1);
    ctx.lineWidth = w * 0.72;
    ctx.strokeStyle = rgba(base);
    ctx.stroke(path);
    ctx.translate(-w * 0.12, -w * 0.13);
    ctx.lineWidth = Math.max(1, w * 0.2);
    ctx.strokeStyle = rgba(hi, 0.9);
    ctx.stroke(path);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  // drifting faint particles (closed form: base position + slow drift + noise wander), additive
  function driftField(ctx, t, o) {
    const { n, seed, box, img, rMin = 1.5, rMax = 4, a = 0.5, vx = 0, vy = -6, wander = 18 } = o;
    const bw = box[2] - box[0];
    const bh = box[3] - box[1];
    for (let i = 0; i < n; i++) {
      const h1 = hash(i, seed, 1);
      const h2 = hash(i, seed, 2);
      const h3 = hash(i, seed, 3);
      const sp = 0.6 + h3 * 0.8;
      let x = box[0] + ((((h1 * bw + vx * sp * t + noise(t * 0.13 + i, seed + 5) * wander) % bw) + bw) % bw);
      let y = box[1] + ((((h2 * bh + vy * sp * t + noise(t * 0.11 + i * 1.7, seed + 9) * wander) % bh) + bh) % bh);
      const tw = 0.55 + 0.45 * Math.sin(t * (1.1 + h3 * 1.7) + i * 2.3);
      const r = lerp(rMin, rMax, hash(i, seed, 4)) * 2.2;
      spr(ctx, img, x, y, r, a * tw * (0.4 + 0.6 * hash(i, seed, 5)));
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ init
  let ready = false;
  let initP = null;
  TS.init = function () {
    if (initP) return initP;
    initP = new Promise((resolve) => {
      const pal = HOUSE.pal;
      P = {};
      for (const k in pal) if (typeof pal[k] === "string" && pal[k][0] === "#") P[k] = hex(pal[k]);
      buildSprites();
      buildSection();
      buildFat();
      buildMuscle();
      buildVein();
      ready = true;
      resolve();
    });
    return initP;
  };

  // ==================================================================== SECTION (shot 6)
  const SEC = {};
  const SKIN = 200; // skin surface (world y)
  const X0 = -MG;
  const X1 = W + MG;
  const junction = (x) => 223 + 3.6 * Math.sin(x * 0.131 + 0.6 + 0.8 * noise(x / 90, 77)) + 2.4 * fbm(x / 34, 78, 2); // epidermis/dermis
  const fatTop = (x) => 306 + 9 * fbm(x / 95, 41, 3) + 4 * Math.sin(x / 210); // dermis/fat
  const fasciaY = (x) => 594 + 5 * Math.sin(x / 300 + 0.8) + 3 * fbm(x / 160, 43, 2); // fascia top
  const FASCIA_H = 10;
  // needles: E = skin entry, D = direction into tissue, L = travel to the stop, ex = exposed shaft at stop
  const NEEDLES = (() => {
    const mkN = (deg, tip, ex, hw) => {
      const a = (deg * Math.PI) / 180;
      const D = [Math.cos(a), Math.sin(a)];
      const L = (tip[1] - SKIN) / D[1];
      return { D, L, E: [tip[0] - D[0] * L, SKIN], ex, hw, tipStop: tip, ang: a };
    };
    return [
      mkN(45, [585, 393], 96, 5.4), // subcutaneous
      mkN(90, [960, 850], 72, 6), // intramuscular
      mkN(155, [1200, 470], 92, 5.4), // intravenous, 25 deg to the skin, from the upper right
    ];
  })();
  function needleTip(i, p) {
    const n = NEEDLES[i];
    const l = -7 + (n.L + 7) * clamp(p);
    return [n.E[0] + n.D[0] * l, n.E[1] + n.D[1] * l, l];
  }

  function buildSection() {
    const R = EX.rng(9101);
    const cw = W + 2 * MG;
    const ch = H + 2 * MG;
    const cv = mk(cw, ch);
    const g = cv.getContext("2d");
    g.translate(MG, MG);
    // ---- the wall above the skin
    let gr = g.createLinearGradient(0, -MG, 0, SKIN + 40);
    gr.addColorStop(0, HOUSE.pal.wall[0]);
    gr.addColorStop(0.55, HOUSE.pal.wall[1]);
    gr.addColorStop(1, HOUSE.pal.wall[2]);
    g.fillStyle = gr;
    g.fillRect(X0, -MG, X1 - X0, SKIN + 40 + MG);
    const pool = (x, y, r, c, a) => {
      const q = g.createRadialGradient(x, y, 0, x, y, r);
      q.addColorStop(0, rgba(c, a));
      q.addColorStop(1, rgba(c, 0));
      g.fillStyle = q;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    g.save();
    g.beginPath();
    g.rect(X0, -MG, X1 - X0, SKIN + 30 + MG);
    g.clip();
    pool(250, 40, 420, [120, 80, 230], 0.3);
    pool(1500, 10, 520, [120, 80, 230], 0.26);
    pool(-60, -40, 380, P.lamp, 0.16); // warm lamp from the upper left
    pool(960, SKIN + 30, 900, [255, 120, 150], 0.1); // the skin's warm spill
    for (let i = 0; i < 16; i++) {
      const x = R() * W;
      const y = R() * (SKIN - 30);
      const r = 14 + R() * 40;
      g.globalAlpha = 0.25 + R() * 0.35;
      g.drawImage(R() < 0.7 ? SPR.bokehLav : SPR.bokehWarm, x - r, y - r, r * 2, r * 2);
    }
    g.globalAlpha = 1;
    g.restore();

    // ---- dermis
    const top = [];
    for (let x = X0; x <= X1; x += 4) top.push([x, junction(x) - 4]);
    const fatT = [];
    for (let x = X0; x <= X1; x += 6) fatT.push([x, fatTop(x)]);
    const dermPoly = top.concat(fatT.slice().reverse().map((p) => [p[0], p[1] + 6]));
    const dermPath = polyPath(dermPoly);
    gr = g.createLinearGradient(0, 215, 0, 315);
    gr.addColorStop(0, rgba(mixc(P.dermis, P.epidermisLight, 0.22)));
    gr.addColorStop(0.45, rgba(P.dermis));
    gr.addColorStop(1, rgba(mixc(P.dermis, P.dermisShade, 0.75)));
    g.fillStyle = gr;
    g.fill(dermPath);
    g.save();
    g.clip(dermPath);
    // collagen bundles: wavy light and dark strands
    for (let i = 0; i < 170; i++) {
      const x = X0 + R() * (X1 - X0);
      const y = 240 + R() * 70;
      const len = 40 + R() * 90;
      const light = R() < 0.55;
      g.strokeStyle = light ? "rgba(255,190,190,0.28)" : "rgba(150,40,80,0.2)";
      g.lineWidth = 1.5 + R() * 2.5;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(x, y);
      const a = (R() - 0.5) * 0.5;
      g.bezierCurveTo(x + len * 0.33, y + Math.sin(a) * len + 6 * (R() - 0.5), x + len * 0.66, y - 6 * (R() - 0.5), x + len, y + Math.sin(a) * len * 0.5);
      g.stroke();
    }
    // subpapillary plexus: thin artery + vein lines
    const plex = (y0, col, sh, seed) => {
      const pts = [];
      for (let x = X0; x <= X1; x += 60) pts.push([x, y0 + 4 * noise(x / 80, seed)]);
      const T = track(pts, 6);
      tube(g, T.path, 3.2, col, sh, [255, 200, 210]);
    };
    plex(256, P.capillary, P.rbcShade, 3);
    plex(262, P.veinLight, P.veinShade, 5);
    // capillary loops rising into each papilla (the junction's high points)
    for (let x = X0; x < X1; x += 2) {
      const y = junction(x);
      if (y < junction(x - 2) && y <= junction(x + 2) && hash(x | 0, 5, 1) < 0.45) {
        const x0 = x - 4;
        const p = new Path2D();
        p.moveTo(x0 - 2, 257);
        p.bezierCurveTo(x0 - 3, y + 14, x0 - 2, y + 3, x0 + 2, y + 3);
        p.bezierCurveTo(x0 + 7, y + 3, x0 + 8, y + 14, x0 + 7, 261);
        tube(g, p, 2.3, P.capillary, P.rbcShade, [255, 190, 200], 0.75);
      }
    }
    g.restore();

    // ---- fat band background (septa colour)
    const fatPoly = fatT.concat(
      (() => {
        const b = [];
        for (let x = X1; x >= X0; x -= 6) b.push([x, fasciaY(x) + 2]);
        return b;
      })()
    );
    const fatPath = polyPath(fatPoly);
    gr = g.createLinearGradient(0, 300, 0, 600);
    gr.addColorStop(0, rgba(mixc(C.septumDeep, P.dermisShade, 0.35)));
    gr.addColorStop(1, rgba(mixc(C.septumDeep, C.gapFat, 0.5)));
    g.fillStyle = gr;
    g.fill(fatPath);
    // septa: wavy fibrous walls between lobules, roughly vertical, plus a few diagonals
    SEC.septa = [];
    g.save();
    g.clip(fatPath);
    let sx = X0 + 40;
    while (sx < X1) {
      const pts = [];
      const bend = (R() - 0.5) * 120;
      for (let k = 0; k <= 6; k++) {
        const u = k / 6;
        const x = sx + bend * Math.sin(u * Math.PI) + (R() - 0.5) * 30;
        pts.push([x, lerp(fatTop(sx) - 6, fasciaY(sx) + 6, u)]);
      }
      const T = track(pts, 6);
      SEC.septa.push(T);
      g.lineCap = "round";
      g.lineJoin = "round";
      g.strokeStyle = rgba(C.septum);
      g.lineWidth = 7;
      g.stroke(T.path);
      g.strokeStyle = rgba(mixc(C.septum, C.strand, 0.4), 0.7);
      g.lineWidth = 2;
      g.save();
      g.translate(-1.5, -1);
      g.stroke(T.path);
      g.restore();
      sx += 150 + R() * 140;
    }
    g.restore();

    // ---- fascia
    const fT = [];
    for (let x = X0; x <= X1; x += 6) fT.push([x, fasciaY(x)]);
    const fB = fT.map((p) => [p[0], p[1] + FASCIA_H]).reverse();
    const fasciaPath = polyPath(fT.concat(fB));

    // ---- muscle fascicles
    const mTop = 594;
    let y = mTop - 4;
    SEC.gaps = [];
    const stri = mk(7, 8);
    {
      const s = stri.getContext("2d");
      s.fillStyle = "rgba(255,170,190,0.2)";
      s.fillRect(0, 0, 2, 8);
      s.fillStyle = "rgba(90,0,50,0.16)";
      s.fillRect(3.5, 0, 1.5, 8);
    }
    const striPat = g.createPattern(stri, "repeat");
    g.fillStyle = rgba(C.gapMuscleDeep);
    g.fillRect(X0, mTop, X1 - X0, H + MG - mTop);
    let fi = 0;
    while (y < H + MG) {
      const hgt = 54 + R() * 34;
      const ph = R() * 10;
      const ph2 = R() * 10;
      const y0 = y;
      const topE = (x) => y0 + 3.5 * Math.sin(x / 260 + ph) + 2 * fbm(x / 120, 50 + fi, 2);
      const botE = (x) => y0 + hgt + 3.5 * Math.sin(x / 240 + ph2) + 2 * fbm(x / 110, 70 + fi, 2);
      const pts = [];
      for (let x = X0; x <= X1; x += 8) pts.push([x, fi === 0 ? Math.max(topE(x), fasciaY(x) + 6) : topE(x)]);
      for (let x = X1; x >= X0; x -= 8) pts.push([x, botE(x)]);
      const path = polyPath(pts);
      g.save();
      g.clip(path);
      gr = g.createLinearGradient(0, y0, 0, y0 + hgt);
      const tone = R() < 0.5 ? mixc(P.muscle, P.muscleShade, R() * 0.3) : mixc(P.muscle, P.muscleLight, R() * 0.15);
      gr.addColorStop(0, rgba(mixc(tone, P.muscleLight, 0.35)));
      gr.addColorStop(0.5, rgba(tone));
      gr.addColorStop(1, rgba(mixc(P.muscle, P.muscleShade, 0.6)));
      g.fillStyle = gr;
      g.fillRect(X0, y0 - 10, X1 - X0, hgt + 20);
      // hard cel shadow band and deep fold along the bottom
      const band = (f0, col, a) => {
        g.fillStyle = rgba(col, a);
        g.beginPath();
        g.moveTo(X0, y0 + hgt * f0 + 2 * Math.sin(X0 / 180 + ph));
        for (let x = X0; x <= X1; x += 10) g.lineTo(x, y0 + hgt * f0 + 2.5 * Math.sin(x / 180 + ph) + 1.5 * fbm(x / 70, fi + 90, 2));
        g.lineTo(X1, y0 + hgt + 20);
        g.lineTo(X0, y0 + hgt + 20);
        g.closePath();
        g.fill();
      };
      band(0.66, P.muscleShade, 1);
      band(0.88, P.muscleDeep, 1);
      // fibres
      for (let k = 1; k < 6; k++) {
        const fy = y0 + (hgt * k) / 6 + (R() - 0.5) * 4;
        g.strokeStyle = k < 4 ? "rgba(140,10,60,0.32)" : "rgba(70,0,40,0.32)";
        g.lineWidth = 1.4;
        g.beginPath();
        for (let x = X0; x <= X1; x += 12) {
          const yy = fy + 2.2 * Math.sin(x / 140 + k + ph);
          if (x === X0) g.moveTo(x, yy);
          else g.lineTo(x, yy);
        }
        g.stroke();
      }
      // striations
      g.save();
      g.translate((R() * 7) | 0, 0);
      g.fillStyle = striPat;
      g.fillRect(X0 - 10, y0 - 10, X1 - X0 + 20, hgt + 20);
      g.restore();
      // highlight band at the top + bright rim
      g.fillStyle = rgba(mixc(P.muscle, P.muscleLight, 0.75), 0.9);
      g.beginPath();
      for (let x = X0; x <= X1; x += 10) g.lineTo(x, topE(x) + 7 + 1.5 * Math.sin(x / 90 + ph));
      g.lineTo(X1, y0 - 20);
      g.lineTo(X0, y0 - 20);
      g.fill();
      // sheen streaks
      for (let k = 0; k < 9; k++) {
        const x = X0 + R() * (X1 - X0);
        g.fillStyle = "rgba(255,200,210,0.32)";
        g.beginPath();
        g.ellipse(x, y0 + hgt * (0.2 + R() * 0.12), 40 + R() * 80, 2 + R() * 1.6, 0, 0, TAU);
        g.fill();
      }
      g.restore();
      // capillary in the gap under this fascicle
      const gp = [];
      for (let x = X0; x <= X1; x += 80) gp.push([x, botE(x) + 2]);
      SEC.gaps.push(track(gp, 6));
      y += hgt + 6 + R() * 4;
      fi++;
    }
    for (const T of SEC.gaps) tube(g, T.path, 3.4, P.capillary, P.rbcShade, [255, 180, 190], 0.85);
    gr = g.createLinearGradient(0, 640, 0, H + MG);
    gr.addColorStop(0, "rgba(40,0,50,0)");
    gr.addColorStop(1, "rgba(40,0,50,0.42)");
    g.fillStyle = gr;
    g.fillRect(X0, 600, X1 - X0, H + MG - 600);
    // soft light pools across the tissue (depth, not flat)
    g.globalCompositeOperation = "lighter";
    for (const [x, y, r, a] of [[420, 420, 520, 0.07], [1500, 760, 640, 0.05], [700, 900, 520, 0.04]]) {
      const q = g.createRadialGradient(x, y, 0, x, y, r);
      q.addColorStop(0, "rgba(255,160,150," + a + ")");
      q.addColorStop(1, "rgba(255,160,150,0)");
      g.fillStyle = q;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.globalCompositeOperation = "source-over";
    // fascia drawn over the first fascicle's top
    g.fillStyle = rgba(mixc(C.gapFatDeep, C.fasciaShade, 0.25));
    g.save();
    g.translate(0, 3);
    g.fill(fasciaPath);
    g.restore();
    g.fillStyle = rgba(C.fasciaShade);
    g.fill(fasciaPath);
    g.save();
    g.clip(fasciaPath);
    g.fillStyle = rgba(C.fascia);
    g.translate(0, -3);
    g.fill(fasciaPath);
    g.restore();
    g.strokeStyle = "rgba(255,255,255,0.85)";
    g.lineWidth = 1.6;
    g.beginPath();
    for (let x = X0; x <= X1; x += 6) g.lineTo(x, fasciaY(x) + 2);
    g.stroke();
    for (let i = 0; i < 26; i++) {
      const x = X0 + R() * (X1 - X0);
      g.fillStyle = "rgba(255,255,255,0.7)";
      g.beginPath();
      g.ellipse(x, fasciaY(x) + 3.5, 10 + R() * 26, 1.3, 0, 0, TAU);
      g.fill();
    }

    // ---- hair follicles, glands (in the dermis, cached)
    SEC.hairs = [];
    const fx = [130, 300, 700, 820, 1110, 1330, 1560, 1880, -60];
    for (let i = 0; i < fx.length; i++) {
      const x0 = fx[i] + (R() - 0.5) * 30;
      const lean = 0.55 + R() * 0.25; // angle from vertical (rad), leaning right
      const len = 92 + R() * 26;
      const dx = Math.sin(lean);
      const dy = Math.cos(lean);
      const bx = x0 - dx * len;
      const by = SKIN + dy * len;
      SEC.hairs.push({ x: x0, lean, len: 40 + R() * 34, ph: R() * 10 });
      // outer root sheath: a tapered tube, wider toward the bulb, cel shaded
      const sh = new Path2D();
      sh.moveTo(x0, SKIN + 2);
      sh.lineTo(bx, by);
      const nx = dy;
      const ny = dx;
      const tw0 = 5;
      const tw1 = 10;
      const sheath = new Path2D();
      sheath.moveTo(x0 - nx * tw0, SKIN + 2 + ny * tw0);
      sheath.lineTo(bx - nx * tw1, by + ny * tw1);
      sheath.lineTo(bx + nx * tw1, by - ny * tw1);
      sheath.lineTo(x0 + nx * tw0, SKIN + 2 - ny * tw0);
      sheath.closePath();
      g.fillStyle = rgba(mixc(P.dermisShade, C.septumDeep, 0.25));
      g.fill(sheath);
      g.save();
      g.clip(sheath);
      g.translate(-2.5, -1.5);
      g.fillStyle = rgba(mixc(P.dermis, P.epidermisLight, 0.45));
      g.fill(sheath);
      g.restore();
      g.lineCap = "round";
      // sebaceous gland
      for (let k = 0; k < 3; k++) {
        const gx = x0 - dx * len * 0.42 + 10 + k * 5;
        const gy = SKIN + dy * len * 0.42 - 4 + k * 7;
        g.fillStyle = rgba(P.fatShade);
        g.beginPath();
        g.arc(gx, gy, 7 - k, 0, TAU);
        g.fill();
        g.fillStyle = rgba(P.fatLight);
        g.beginPath();
        g.arc(gx - 1.5, gy - 1.5, 4.2 - k * 0.8, 0, TAU);
        g.fill();
      }
      // arrector pili (thin muscle strand)
      g.strokeStyle = "rgba(214,70,110,0.75)";
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(x0 - dx * len * 0.7, SKIN + dy * len * 0.7);
      g.quadraticCurveTo(x0 - dx * len * 0.3 + 30, SKIN + dy * len * 0.6, x0 + 34, junction(x0 + 34) + 3);
      g.stroke();
      // hair shaft + bulb
      g.strokeStyle = rgba([118, 58, 112]);
      g.lineWidth = 3.4;
      g.stroke(sh);
      g.strokeStyle = rgba([190, 140, 210], 0.7);
      g.lineWidth = 1;
      g.save();
      g.translate(-1, -0.6);
      g.stroke(sh);
      g.restore();
      g.fillStyle = rgba(mixc(P.dermisShade, C.hairC, 0.25));
      g.beginPath();
      g.ellipse(bx, by, 10, 12.5, -lean, 0, TAU);
      g.fill();
      g.fillStyle = rgba(mixc(P.dermisShade, [255, 190, 200], 0.25));
      g.beginPath();
      g.ellipse(bx - 2, by - 2, 6, 8, -lean, 0, TAU);
      g.fill();
      g.fillStyle = rgba(P.epidermisLight);
      g.beginPath();
      g.ellipse(bx + dx * 2, by + dy * 5, 3.5, 4.5, -lean, 0, TAU);
      g.fill();
    }
    // sweat glands: coiled tubes low in the dermis
    for (const sx2 of [520, 1020, 1440, 1720]) {
      const cy = 300;
      g.lineCap = "round";
      for (let k = 0; k < 2; k++) {
        g.strokeStyle = k === 0 ? rgba(C.septumDeep) : rgba([236, 130, 170]);
        g.lineWidth = k === 0 ? 5.5 : 3;
        g.beginPath();
        for (let a = 0; a < 5.5 * TAU; a += 0.25) {
          const r = 10 + 4 * Math.sin(a * 0.7);
          g.lineTo(sx2 + Math.cos(a) * r + a * 1.4 - 20 - k, cy + Math.sin(a) * r * 0.6 - k);
        }
        g.stroke();
      }
      g.strokeStyle = "rgba(236,130,170,0.7)";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(sx2 - 18, cy - 6);
      g.bezierCurveTo(sx2 - 30, 270, sx2 - 6, 250, sx2 - 14, junction(sx2 - 14) + 2);
      g.stroke();
    }
    SEC.cache = cv;

    // ---- fat cells (Poisson-ish dart throwing inside the fat band, away from septa and the vein)
    SEC.vein = track(
      [
        [2100, 456],
        [1700, 462],
        [1380, 466],
        [1190, 470],
        [1110, 486],
        [1072, 520],
        [1056, 575],
        [1050, 640],
      ],
      4
    );
    const cells = [];
    const grid = new Map();
    const GS = 34;
    const key = (i, j) => i * 10007 + j;
    const near = (x, y, r) => {
      const gi = Math.floor(x / GS);
      const gj = Math.floor(y / GS);
      for (let i = gi - 1; i <= gi + 1; i++)
        for (let j = gj - 1; j <= gj + 1; j++) {
          const L = grid.get(key(i, j));
          if (!L) continue;
          for (const c of L) if ((c.x - x) ** 2 + (c.y - y) ** 2 < (c.r + r + 0.5) ** 2) return true;
        }
      return false;
    };
    const septaD = (x, y) => {
      let best = 1e9;
      for (const T of SEC.septa) {
        if (Math.abs(T.xs[0] - x) > 140) continue;
        for (let i = 0; i <= T.n; i += 2) best = Math.min(best, Math.hypot(T.xs[i] - x, T.ys[i] - y));
      }
      return best;
    };
    const veinD = (x, y) => {
      if (x < 980 || y < 400) return 1e9;
      let best = 1e9;
      for (let i = 0; i <= SEC.vein.n; i += 2) best = Math.min(best, Math.hypot(SEC.vein.xs[i] - x, SEC.vein.ys[i] - y));
      return best;
    };
    for (let tries = 0; tries < 26000; tries++) {
      const x = X0 + R() * (X1 - X0);
      const y = 300 + R() * 300;
      const r = 9 + R() * 8;
      if (y - r < fatTop(x) + 3 || y + r > fasciaY(x) - 2) continue;
      if (septaD(x, y) < r + 4.5) continue;
      if (veinD(x, y) < r + 36) continue;
      if (near(x, y, r)) continue;
      const c = { x, y, r, a: R() * TAU, tint: (R() * 3) | 0, ph: R() * 10 };
      cells.push(c);
      const kk = key(Math.floor(x / GS), Math.floor(y / GS));
      if (!grid.has(kk)) grid.set(kk, []);
      grid.get(kk).push(c);
    }
    cells.sort((a, b) => a.y - b.y);
    SEC.cells = cells;
    // fat cell sprites: 3 tints x 8 nucleus angles
    SEC.cellSpr = [];
    const tints = [
      [P.fat, P.fatLight, C.fatShadow],
      [mixc(P.fat, P.fatShade, 0.35), P.fatLight, C.fatShadowDeep],
      [mixc(P.fat, P.fatLight, 0.3), [255, 246, 200], C.fatShadow],
    ];
    for (let ti = 0; ti < 3; ti++) {
      SEC.cellSpr.push([]);
      for (let ai = 0; ai < 8; ai++) SEC.cellSpr[ti].push(cellSprite(28, tints[ti], (ai / 8) * TAU));
    }
    // epidermis flecks
    SEC.flecks = [];
    for (let i = 0; i < 90; i++) SEC.flecks.push([X0 + R() * (X1 - X0), 0.25 + R() * 0.6, 3 + R() * 7]);
    // red cells in the vein
    SEC.rbc = [];
    for (let i = 0; i < 44; i++) SEC.rbc.push({ ph: R(), lane: (R() - 0.5) * 30, sp: 0.75 + R() * 0.5, tu: R() * TAU });
  }

  // a glossy fat cell sprite of radius r (canvas 2.4 r), lit from the upper left, nucleus at angle a
  function cellSprite(r, tint, a) {
    const s = Math.ceil(r * 2.4);
    const c = mk(s, s);
    const g = c.getContext("2d");
    const h = s / 2;
    const [base, light, shadow] = tint;
    g.fillStyle = rgba(C.membrane, 0.95);
    g.beginPath();
    g.arc(h, h, r, 0, TAU);
    g.fill();
    g.save();
    g.beginPath();
    g.arc(h, h, r - 1.6, 0, TAU);
    g.clip();
    g.fillStyle = rgba(shadow);
    g.fillRect(0, 0, s, s);
    g.fillStyle = rgba(light);
    g.beginPath();
    g.arc(h - r * 0.13, h - r * 0.15, r - 1.6, 0, TAU);
    g.fill();
    const gr = g.createRadialGradient(h - r * 0.3, h - r * 0.35, r * 0.1, h - r * 0.05, h - r * 0.05, r);
    gr.addColorStop(0, rgba(mixc(base, light, 0.35)));
    gr.addColorStop(1, rgba(base));
    g.fillStyle = gr;
    g.beginPath();
    g.arc(h - r * 0.06, h - r * 0.07, r - 3.2, 0, TAU);
    g.fill();
    // nucleus pressed against the membrane
    const nx = h + Math.cos(a) * (r - 5.5);
    const ny = h + Math.sin(a) * (r - 5.5);
    g.fillStyle = rgba(C.nucleus);
    g.beginPath();
    g.ellipse(nx, ny, r * 0.3, r * 0.11, a + Math.PI / 2, 0, TAU);
    g.fill();
    g.fillStyle = rgba(C.nucleusLight, 0.9);
    g.beginPath();
    g.ellipse(nx - 1, ny - 1, r * 0.13, r * 0.04, a + Math.PI / 2, 0, TAU);
    g.fill();
    g.restore();
    // specular
    g.fillStyle = "rgba(255,255,255,0.92)";
    g.beginPath();
    g.ellipse(h - r * 0.4, h - r * 0.42, r * 0.24, r * 0.12, -0.75, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(h - r * 0.12, h - r * 0.62, r * 0.06, 0, TAU);
    g.fill();
    return c;
  }

  // the needle in the section: steel shaft with bevel, hub, glass barrel with aqua medicine
  function drawNeedle(ctx, i, p, t) {
    const n = NEEDLES[i];
    const [tx, ty, l] = needleTip(i, p);
    const hw = n.hw;
    const sl = n.L + n.ex; // shaft length
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(n.ang);
    // local +x points into the tissue; shaft runs from -sl to 0. Which local side faces the light?
    const litUp = -Math.sin(n.ang) * -0.6 + Math.cos(n.ang) * -0.8 > 0 ? 1 : -1; // sign of local +y toward light
    const bev = hw * 4.2;
    // shaft (shadow side, lit side, highlight)
    ctx.fillStyle = rgba(P.steelShade);
    ctx.beginPath();
    ctx.moveTo(-sl, -hw);
    ctx.lineTo(-bev, -hw);
    ctx.lineTo(0, hw * litUp * 0.9);
    ctx.lineTo(-bev * 0.2, hw);
    ctx.lineTo(-sl, hw);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(P.steel);
    ctx.beginPath();
    ctx.moveTo(-sl, litUp * hw);
    ctx.lineTo(-bev * 0.5, litUp * hw);
    ctx.lineTo(0, hw * litUp * 0.9);
    ctx.lineTo(-bev * 0.6, -litUp * hw * 0.15);
    ctx.lineTo(-sl, -litUp * hw * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillRect(-sl, litUp > 0 ? hw * 0.35 : -hw * 0.75, sl - bev * 0.7, hw * 0.4);
    // bevel face
    ctx.fillStyle = rgba(mixc(P.steelShade, [60, 50, 110], 0.5));
    ctx.beginPath();
    ctx.moveTo(-bev, -litUp * hw);
    ctx.lineTo(0, litUp * hw * 0.9);
    ctx.lineTo(-bev * 0.45, -litUp * hw * 0.2);
    ctx.closePath();
    ctx.fill();
    // hub
    const hx = -sl;
    ctx.fillStyle = rgba(mixc(P.plunger, P.med, 0.25));
    ctx.beginPath();
    ctx.moveTo(hx + 4, -hw - 2);
    ctx.lineTo(hx - 26, -hw - 9);
    ctx.lineTo(hx - 42, -hw - 9);
    ctx.lineTo(hx - 42, hw + 9);
    ctx.lineTo(hx - 26, hw + 9);
    ctx.lineTo(hx + 4, hw + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(P.plungerShade);
    ctx.fillRect(hx - 42, -litUp * (hw + 9), 38, litUp * 5);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(hx - 40, litUp * (hw + 3.5), 34, litUp * 2.5);
    // barrel
    const bx = hx - 42;
    const BR = 26;
    const BL = 900;
    ctx.fillStyle = rgba(P.glass, 0.26);
    ctx.beginPath();
    ctx.moveTo(bx, -10);
    ctx.lineTo(bx - 16, -BR);
    ctx.lineTo(bx - BL, -BR);
    ctx.lineTo(bx - BL, BR);
    ctx.lineTo(bx - 16, BR);
    ctx.lineTo(bx, 10);
    ctx.closePath();
    ctx.fill();
    // medicine column with meniscus
    const ml = 300;
    ctx.fillStyle = rgba(P.medDeep);
    ctx.beginPath();
    ctx.moveTo(bx - 2, -7);
    ctx.lineTo(bx - 17, -BR + 4);
    ctx.lineTo(bx - ml, -BR + 4);
    ctx.quadraticCurveTo(bx - ml - 10, 0, bx - ml, BR - 4);
    ctx.lineTo(bx - 17, BR - 4);
    ctx.lineTo(bx - 2, 7);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = rgba(P.med);
    ctx.fillRect(bx - ml - 20, litUp > 0 ? -BR * 0.1 : -BR, ml + 20, BR * 1.1);
    ctx.fillStyle = rgba(P.medGlow, 0.9);
    ctx.fillRect(bx - ml - 20, litUp > 0 ? BR * 0.45 : -BR * 0.75, ml + 20, 6);
    // tiny bubbles
    for (let k = 0; k < 5; k++) {
      const u = (hash(k, i, 3) * ml + t * 6 * (0.5 + hash(k, i, 4))) % ml;
      ctx.fillStyle = "rgba(235,255,252,0.85)";
      ctx.beginPath();
      ctx.arc(bx - 20 - u, (hash(k, i, 5) - 0.5) * BR * 1.2, 1.5 + hash(k, i, 6) * 2.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // glass edges and ticks
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(bx - BL, -BR, BL - 16, 3);
    ctx.fillRect(bx - BL, BR - 3, BL - 16, 3);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(bx - BL, litUp * BR * 0.55 - 4, BL - 30, 5);
    for (let k = 1; k < 30; k++) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(bx - 30 - k * 24, -litUp * BR, 2, -litUp * -(k % 5 === 0 ? 16 : 9));
    }
    ctx.restore();
  }

  // slit opened in the tissue around the inserted part of a needle
  function drawSlit(ctx, i, p) {
    const n = NEEDLES[i];
    const [tx, ty, l] = needleTip(i, p);
    if (l <= 2) return;
    const s0 = Math.min(l, 14);
    ctx.save();
    ctx.translate(n.E[0], n.E[1]);
    ctx.rotate(n.ang);
    const w = n.hw + 3.2;
    ctx.fillStyle = "rgba(40,4,30,0.8)";
    ctx.beginPath();
    ctx.moveTo(s0 * 0.3, 0);
    ctx.quadraticCurveTo(s0, -w, l * 0.5, -w);
    ctx.lineTo(l - 10, -w * 0.9);
    ctx.quadraticCurveTo(l + 6, -w * 0.3, l + 12, 0);
    ctx.quadraticCurveTo(l + 6, w * 0.3, l - 10, w * 0.9);
    ctx.lineTo(l * 0.5, w);
    ctx.quadraticCurveTo(s0, w, s0 * 0.3, 0);
    ctx.fill();
    ctx.fillStyle = "rgba(255,200,215,0.45)";
    ctx.fillRect(s0, -w - 1.5, Math.max(0, l - s0 - 8), 1.5);
    ctx.fillRect(s0, w, Math.max(0, l - s0 - 8), 1.5);
    ctx.restore();
  }

  // displacement of a point by the inserted needles: returns [dx, dy, squeeze]
  function part(x, y, r, needles) {
    let dx = 0;
    let dy = 0;
    let sq = 0;
    for (let i = 0; i < 3; i++) {
      const p = needles[i] || 0;
      if (p <= 0) continue;
      const n = NEEDLES[i];
      const l = -7 + (n.L + 7) * clamp(p);
      const ex = x - n.E[0];
      const ey = y - n.E[1];
      const u = ex * n.D[0] + ey * n.D[1];
      if (u < -r || u > l + r * 1.6) continue;
      const v = -ex * n.D[1] + ey * n.D[0];
      const av = Math.abs(v);
      const cl = r + n.hw + 1.5;
      if (av > cl + 60) continue;
      const f = sstep(-r * 1.3, r * 0.5, l - u);
      const push = (Math.max(0, cl - av) + 5 * Math.exp(-Math.max(0, av - cl) / 20)) * f;
      const sg = v === 0 ? 1 : Math.sign(v);
      dx += -n.D[1] * sg * push;
      dy += n.D[0] * sg * push;
      sq = Math.max(sq, 0.14 * Math.exp(-Math.max(0, av - cl) / 14) * f);
    }
    return [dx, dy, sq];
  }

  // skin dimple from each needle: depth at x
  function dimple(x, needles) {
    let d = 0;
    for (let i = 0; i < 3; i++) {
      const p = needles[i] || 0;
      if (p <= 0) continue;
      const n = NEEDLES[i];
      const l = -7 + (n.L + 7) * clamp(p);
      // pushes in as the tip arrives, relaxes after it pierces
      const amt = 9 * sstep(-7, 3, l) * (1 - 0.7 * sstep(3, 40, l));
      // the dimple centre sits at the tip while it is shallow, at the entry once through
      const cx = n.E[0] + n.D[0] * Math.max(0, Math.min(l, 6));
      const sig = 26 + 10 * Math.abs(n.D[0]);
      d += amt * Math.exp(-(((x - cx) / sig) ** 2));
    }
    return d;
  }

  TS.section = function (ctx, o = {}) {
    if (!ready) return;
    const t = o.t || 0;
    const nd = o.needles || [0, 0, 0];
    const glow = clamp(o.glow || 0);
    ctx.save();
    applyCam(ctx, o);
    ctx.drawImage(SEC.cache, -MG, -MG);
    // breathing light pools and dust above the skin
    ctx.globalCompositeOperation = "lighter";
    spr(ctx, SPR.soft, 300, 60, 380, 0.05 + 0.03 * Math.sin(t * 0.7));
    spr(ctx, SPR.soft, 1560, 40, 460, 0.045 + 0.03 * Math.sin(t * 0.55 + 2));
    driftField(ctx, t, { n: 40, seed: 3, box: [X0, -MG, X1, SKIN - 8], img: SPR.lavDot, rMin: 1.2, rMax: 3.2, a: 0.55, vx: 4, vy: -5 });
    ctx.globalCompositeOperation = "source-over";
    // blood in the muscle capillaries
    for (let gi = 0; gi < SEC.gaps.length; gi++) {
      const T = SEC.gaps[gi];
      const dir = gi % 2 ? 1 : -1;
      const sp = 26;
      const off = ((t * 60 * dir) % sp + sp) % sp;
      ctx.fillStyle = rgba(P.rbc);
      for (let s = off + (gi * 7) % sp; s < T.len; s += sp) {
        const q = at(T, s);
        if (q[0] < X0 || q[0] > X1) continue;
        ctx.beginPath();
        ctx.ellipse(q[0], q[1] - 0.5, 3.2, 1.9, Math.atan2(q[3], q[2]), 0, TAU);
        ctx.fill();
      }
    }
    // slits in dermis / muscle
    for (let i = 0; i < 3; i++) drawSlit(ctx, i, nd[i]);
    // fat cells
    const spr8 = SEC.cellSpr;
    for (const c of SEC.cells) {
      const [dx, dy, sq] = part(c.x, c.y, c.r, nd);
      const wob = 1 + 0.022 * Math.sin(t * 1.3 + c.ph) - sq;
      const r = c.r * wob;
      const x = c.x + dx + 0.8 * Math.sin(t * 0.7 + c.ph * 2);
      const y = c.y + dy + 0.8 * Math.cos(t * 0.6 + c.ph);
      const ai = ((Math.round((c.a / TAU) * 8) % 8) + 8) % 8;
      const img = spr8[c.tint][ai];
      const s = (r / 28) * img.width * 0.5;
      ctx.drawImage(img, x - s, y - s, s * 2, s * 2);
    }
    drawSectionVein(ctx, t, nd, glow);
    // epidermis (live: dimples) and hairs
    drawEpidermis(ctx, t, nd);
    // needles
    for (let i = 0; i < 3; i++) drawNeedle(ctx, i, nd[i], t);
    // medicine blooms at the tips
    if (glow > 0.001) {
      for (let i = 0; i < 3; i++) {
        const [tx, ty] = needleTip(i, nd[i]);
        const n = NEEDLES[i];
        const br = 1 + 0.06 * Math.sin(t * 3 + i);
        // droplet that pools just past the tip
        const px = tx + n.D[0] * 6;
        const py = ty + n.D[1] * 6;
        const rr = (6 + 12 * glow) * br;
        ctx.fillStyle = rgba(P.medDeep);
        ctx.beginPath();
        ctx.ellipse(px, py, rr * 1.15, rr, n.ang, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgba(P.med);
        ctx.beginPath();
        ctx.ellipse(px - rr * 0.12, py - rr * 0.14, rr * 1.0, rr * 0.86, n.ang, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.ellipse(px - rr * 0.38, py - rr * 0.4, rr * 0.3, rr * 0.16, -0.7, 0, TAU);
        ctx.fill();
        ctx.globalCompositeOperation = "lighter";
        spr(ctx, SPR.medGlow, px, py, (60 + 40 * glow) * br, 0.85 * glow);
        spr(ctx, SPR.flareAqua, px - rr * 0.3, py - rr * 0.3, 22 + 10 * Math.sin(t * 2.3 + i), 0.7 * glow);
        ctx.globalCompositeOperation = "source-over";
      }
      // the IV dose drifts away with the blood (leftwards inside the vein)
      const [vx, vy] = needleTip(2, nd[2]);
      if (nd[2] > 0.9) {
        ctx.globalCompositeOperation = "lighter";
        const [s0] = nearestOnTrack(SEC.vein, vx, vy);
        for (let k = 0; k < 18; k++) {
          const u = ((hash(k, 7, 1) + t * 0.35) % 1) * 240;
          const q = at(SEC.vein, s0 + u);
          const lane = (hash(k, 7, 2) - 0.5) * 22 * (0.4 + u / 240);
          spr(ctx, SPR.medDot, q[0] - q[3] * lane, q[1] + q[2] * lane, 6 + 4 * hash(k, 7, 3), glow * (1 - u / 260) * sstep(0.9, 1, nd[2]));
        }
        ctx.globalCompositeOperation = "source-over";
      }
    }
    // faint particles drifting in the tissue
    ctx.globalCompositeOperation = "lighter";
    driftField(ctx, t, { n: 50, seed: 11, box: [X0, 230, X1, H + MG], img: SPR.warmDot, rMin: 1, rMax: 2.6, a: 0.35, vx: 3, vy: -2 });
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  function drawEpidermis(ctx, t, nd) {
    const top = [];
    for (let x = X0; x <= X1; x += 6) top.push([x, SKIN + 1.2 * Math.sin(x / 70) + dimple(x, nd)]);
    const bot = [];
    for (let x = X1; x >= X0; x -= 6) bot.push([x, junction(x) + 1]);
    const path = polyPath(top.concat(bot));
    ctx.fillStyle = rgba(P.epidermis);
    ctx.fill(path);
    ctx.save();
    ctx.clip(path);
    // basal layer: deeper tone along the junction
    ctx.strokeStyle = rgba(mixc(P.epidermis, P.dermisShade, 0.55), 0.9);
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (const q of bot) ctx.lineTo(q[0], q[1] - 1);
    ctx.stroke();
    // flecks
    ctx.fillStyle = rgba(P.epidermisLight, 0.75);
    for (const f of SEC.flecks) {
      const x = f[0];
      const y = lerp(SKIN + dimple(x, nd), junction(x), f[1]);
      ctx.fillRect(x, y, f[2], 1.6);
    }
    // stratum corneum: lighter top band + bright rim
    ctx.fillStyle = rgba(P.epidermisLight);
    ctx.beginPath();
    for (const q of top) ctx.lineTo(q[0], q[1] + 5.5);
    for (let i = top.length - 1; i >= 0; i--) ctx.lineTo(top[i][0], top[i][1] - 4);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(255,236,222,0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const q of top) ctx.lineTo(q[0], q[1] + 0.5);
    ctx.stroke();
    // hairs swaying above the skin
    ctx.lineCap = "round";
    for (const h of SEC.hairs) {
      const y0 = SKIN + dimple(h.x, nd);
      const sway = 0.12 * Math.sin(t * 0.9 + h.ph) + 0.05 * Math.sin(t * 2.1 + h.ph * 2);
      const a = h.lean + 0.25 + sway;
      const ex = h.x + Math.sin(a) * h.len;
      const ey = y0 - Math.cos(a) * h.len;
      const cx = h.x + Math.sin(h.lean) * h.len * 0.5;
      const cy = y0 - Math.cos(h.lean) * h.len * 0.55;
      ctx.strokeStyle = rgba([92, 48, 112]);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(h.x, y0 + 2);
      ctx.quadraticCurveTo(cx, cy, ex, ey);
      ctx.stroke();
      ctx.strokeStyle = rgba(C.hairRim, 0.95);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(h.x - 1, y0);
      ctx.quadraticCurveTo(cx - 1.2, cy - 0.8, ex - 1, ey);
      ctx.stroke();
    }
  }

  let VLAYER = null;
  function drawSectionVein(ctx0, t, nd, glow) {
    // drawn into a scratch layer so the perforator can fade out where it dives under the fascia
    const m = ctx0.getTransform();
    const cw = ctx0.canvas.width;
    const chh = ctx0.canvas.height;
    if (!VLAYER || VLAYER.width !== cw || VLAYER.height !== chh) VLAYER = mk(cw, chh);
    const ctx = VLAYER.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, cw, chh);
    ctx.setTransform(m);
    const T = SEC.vein;
    const RV = 31;
    const WALL = 7.5;
    // IV tip dents the top wall before it pierces it
    const [tx, ty, l] = needleTip(2, nd[2]);
    const n2 = NEEDLES[2];
    const hitL = n2.L - (470 - (466 - RV)) / n2.D[1] - 4; // travel when the tip reaches the wall
    const dent = 9 * sstep(hitL - 40, hitL, l) * (1 - 0.65 * sstep(hitL, hitL + 18, l));
    const dentX = n2.E[0] + n2.D[0] * Math.min(l, hitL);
    const edge = (side, r) => {
      const pts = [];
      for (let i = 0; i <= T.n; i += 2) {
        const nx = -T.ys[Math.min(T.n, i + 1)] + T.ys[Math.max(0, i - 1)];
        const ny = T.xs[Math.min(T.n, i + 1)] - T.xs[Math.max(0, i - 1)];
        const ln = Math.hypot(nx, ny) || 1;
        // normal pointing to the upper side
        let ux = nx / ln;
        let uy = ny / ln;
        if (uy > 0) {
          ux = -ux;
          uy = -uy;
        }
        let x = T.xs[i] + ux * r * side;
        let y = T.ys[i] + uy * r * side;
        if (side > 0 && dent > 0) y += dent * Math.exp(-(((x - dentX) / 30) ** 2)) * (r / RV);
        pts.push([x, y]);
      }
      return pts;
    };
    const outerTop = edge(1, RV);
    const outerBot = edge(-1, RV);
    const outer = polyPath(outerTop.concat(outerBot.slice().reverse()));
    const inTop = edge(1, RV - WALL);
    const inBot = edge(-1, RV - WALL);
    const lumen = polyPath(inTop.concat(inBot.slice().reverse()));
    ctx.save();
    ctx.fillStyle = rgba(P.veinShade);
    ctx.fill(outer);
    ctx.save();
    ctx.clip(outer);
    ctx.fillStyle = rgba(P.vein);
    ctx.translate(0, -3.5);
    ctx.fill(outer);
    ctx.restore();
    let gr = ctx.createLinearGradient(0, 440, 0, 500);
    gr.addColorStop(0, rgba(C.lumenBack));
    gr.addColorStop(0.5, rgba(C.plasma));
    gr.addColorStop(1, rgba(C.plasmaDeep));
    ctx.fillStyle = gr;
    ctx.fill(lumen);
    ctx.save();
    ctx.clip(lumen);
    // red cells streaming leftwards (toward the perforator)
    const L = T.len;
    for (let j = 0; j < SEC.rbc.length; j++) {
      const c = SEC.rbc[j];
      const s = ((((c.ph * L - t * 75 * c.sp) % L) + L) % L);
      const q = at(T, s);
      const x = q[0] - q[3] * c.lane * 0.5;
      const y = q[1] + q[2] * c.lane * 0.5;
      const ang = Math.atan2(q[3], q[2]);
      const tu = Math.abs(Math.cos(c.tu + t * 1.6 * c.sp));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang + 0.3 * Math.sin(c.tu + t));
      ctx.fillStyle = rgba(P.rbcShade);
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 2.2 + 3.2 * tu, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(P.rbc);
      ctx.beginPath();
      ctx.ellipse(-0.6, -0.7, 6, 1.6 + 2.8 * tu, 0, 0, TAU);
      ctx.fill();
      if (tu > 0.45) {
        ctx.fillStyle = rgba(C.rbcDeep, 0.7);
        ctx.beginPath();
        ctx.ellipse(0.4, 0.3, 3, 1.2 * tu, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    // translucent film + soft highlight inside
    ctx.fillStyle = rgba(P.veinLight, 0.1);
    ctx.fill(lumen);
    ctx.restore();
    // valve flaps (pointing downstream = left)
    const vs = nearestOnTrack(T, 1560, 462)[0];
    const q = at(T, vs);
    for (const sd of [1, -1]) {
      const flut = 0.08 * Math.sin(t * 2.2 + sd);
      ctx.fillStyle = rgba(P.veinLight, 0.6);
      ctx.beginPath();
      ctx.moveTo(q[0] + 6, q[1] - sd * (RV - WALL));
      ctx.quadraticCurveTo(q[0] - 10, q[1] - sd * 12, q[0] - 26, q[1] - sd * (4 + 3 * flut * 10));
      ctx.lineTo(q[0] - 22, q[1] - sd * (10 + 3 * flut * 10));
      ctx.quadraticCurveTo(q[0] - 6, q[1] - sd * 18, q[0] + 14, q[1] - sd * (RV - WALL));
      ctx.fill();
    }
    // wall highlights
    ctx.strokeStyle = rgba(P.veinLight, 0.95);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (const p of outerTop) ctx.lineTo(p[0], p[1] + 1.5);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const p of inTop) ctx.lineTo(p[0], p[1] + 4);
    ctx.stroke();
    ctx.restore();
    // fade the dive end out below the fascia
    const fade = ctx.createLinearGradient(0, 588, 0, 640);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = fade;
    ctx.fillRect(990, 580, 140, 100);
    ctx.globalCompositeOperation = "source-over";
    ctx0.save();
    ctx0.setTransform(1, 0, 0, 1, 0, 0);
    ctx0.drawImage(VLAYER, 0, 0);
    ctx0.restore();
    // dark opening in the fascia where the perforator dives through
    const qd = at(T, nearestOnTrack(T, 1052, 600)[0]);
    ctx0.fillStyle = "rgba(40,6,40,0.55)";
    ctx0.beginPath();
    ctx0.ellipse(qd[0], fasciaY(qd[0]) + 6, 34, 7, 0, 0, TAU);
    ctx0.fill();
  }

  TS.sectionAnchors = function (o = {}) {
    const nd = o.needles || [0, 0, 0];
    const tips = [0, 1, 2].map((i) => {
      const q = needleTip(i, nd[i]);
      return toScreen(o, [q[0], q[1]]);
    });
    return {
      tips,
      layers: {
        skin: toScreen(o, [760, SKIN]),
        fat: toScreen(o, [760, 452]),
        muscle: toScreen(o, [760, 790]),
        vein: toScreen(o, [1480, 464]),
      },
    };
  };

  // ==================================================================== FAT close-up (shot 7)
  const FAT = {};
  const FO = [960, 540]; // deposit centre
  const FHOLE = 158; // hollow the pool sits in
  const FAT_V = 70; // blood speed in the capillaries, px/s (slow)

  function buildFat() {
    const R = EX.rng(7702);
    const box = [-MG - 60, -MG - 60, W + MG + 60, H + MG + 60];
    // sites: dart throwing with varied radii, none inside the hollow
    const sites = [];
    const rad = [];
    for (let tries = 0; tries < 9000 && sites.length < 140; tries++) {
      const x = lerp(box[0], box[2], R());
      const y = lerp(box[1], box[3], R());
      const r = 92 + R() * 58;
      const dO = Math.hypot(x - FO[0], y - FO[1]);
      if (dO < FHOLE + r * 0.55) continue;
      let ok = true;
      for (let i = 0; i < sites.length; i++) {
        if (Math.hypot(sites[i][0] - x, sites[i][1] - y) < (rad[i] + r) * 0.9) {
          ok = false;
          break;
        }
      }
      if (ok) {
        sites.push([x, y]);
        rad.push(r);
      }
    }
    // one relaxation step toward the centroids keeps sizes varied but shapes even
    let raw = voronoi(sites, 0, box);
    for (let i = 0; i < sites.length; i++) {
      const c = centroid(raw[i]);
      if (raw[i].length > 2) {
        const nx = lerp(sites[i][0], c[0], 0.5);
        const ny = lerp(sites[i][1], c[1], 0.5);
        if (Math.hypot(nx - FO[0], ny - FO[1]) > FHOLE + 60) sites[i] = [nx, ny];
      }
    }
    raw = voronoi(sites, 0, box);
    const inset = voronoi(sites, 15, box);
    FAT.cells = [];
    for (let i = 0; i < sites.length; i++) {
      let poly = inset[i];
      if (poly.length < 3) continue;
      // carve the hollow: keep the side of a tangent line facing away from the centre
      const c0 = centroid(poly);
      const dx = c0[0] - FO[0];
      const dy = c0[1] - FO[1];
      const d = Math.hypot(dx, dy);
      if (d < FHOLE + 260) {
        const nx = -dx / d;
        const ny = -dy / d;
        poly = clipHalf(poly, nx, ny, FO[0] * nx + FO[1] * ny - FHOLE);
        // round the carved side a little more by clipping two rotated tangents too
        for (const da of [-0.38, 0.38]) {
          const ca = Math.cos(da);
          const sa = Math.sin(da);
          const mx = nx * ca - ny * sa;
          const my = nx * sa + ny * ca;
          poly = clipHalf(poly, mx, my, FO[0] * mx + FO[1] * my - FHOLE - 6);
        }
      }
      if (poly.length < 3) continue;
      const sm = chaikin(poly, 3);
      const [cx, cy, area] = centroid(sm);
      if (area < 2500) continue;
      const r = Math.sqrt(area / Math.PI);
      // local path around the centroid (so wobble can scale it in place)
      const local = sm.map((p) => [p[0] - cx, p[1] - cy]);
      const a = R() * TAU;
      // boundary distance along the nucleus angle
      let rb = r;
      for (let k = 0; k < local.length; k++) {
        const p = local[k];
        const ang = Math.atan2(p[1], p[0]);
        let dd = Math.abs(ang - a);
        if (dd > Math.PI) dd = TAU - dd;
        if (dd < 0.06) rb = Math.min(rb, Math.hypot(p[0], p[1]));
      }
      const bubbles = [];
      const nb = (R() * 4) | 0;
      for (let k = 0; k < nb; k++) bubbles.push([(R() - 0.5) * r * 0.9, (R() - 0.2) * r * 0.8, 2 + R() * 4.5]);
      FAT.cells.push({
        x: cx,
        y: cy,
        r,
        path: polyPath(local),
        a,
        rb: Math.max(r * 0.6, rb - 9),
        ph: R() * 10,
        tint: R(),
        bubbles,
        dO: Math.hypot(cx - FO[0], cy - FO[1]),
      });
    }
    // gap graph from the raw Voronoi edges (capillaries and seeping specks live in the gaps)
    const V = new Map();
    const vkey = (p) => Math.round(p[0] * 2) + "," + Math.round(p[1] * 2);
    const verts = [];
    const vid = (p) => {
      const k = vkey(p);
      if (!V.has(k)) {
        V.set(k, verts.length);
        verts.push({ x: p[0], y: p[1], adj: new Set() });
      }
      return V.get(k);
    };
    for (const poly of raw) {
      for (let i = 0; i < poly.length; i++) {
        const a = vid(poly[i]);
        const b = vid(poly[(i + 1) % poly.length]);
        if (a !== b) {
          verts[a].adj.add(b);
          verts[b].adj.add(a);
        }
      }
    }
    FAT.gapPts = [];
    for (let i = 0; i < verts.length; i++) {
      for (const j of verts[i].adj) {
        if (j < i) continue;
        const a = verts[i];
        const b = verts[j];
        const L = Math.hypot(b.x - a.x, b.y - a.y);
        const n = Math.max(1, Math.floor(L / 46));
        for (let k = 0; k < n; k++) {
          const u = (k + 0.5) / n;
          const x = lerp(a.x, b.x, u);
          const y = lerp(a.y, b.y, u);
          FAT.gapPts.push({ x, y, ex: (b.x - a.x) / L, ey: (b.y - a.y) / L, d: Math.hypot(x - FO[0], y - FO[1]), h: R() });
        }
      }
    }
    FAT.gapPts.sort((p, q) => p.d - q.d);
    const route = (sy, ey, avoid) => {
      // Dijkstra from the vertex nearest (box left, sy) to the one nearest (box right, ey)
      const near = (x, y) => {
        let b = 0;
        let bd = 1e18;
        verts.forEach((v, i) => {
          const d = (v.x - x) ** 2 + (v.y - y) ** 2;
          if (d < bd) {
            bd = d;
            b = i;
          }
        });
        return b;
      };
      const s = near(-MG - 30, sy);
      const e = near(W + MG + 30, ey);
      const dist = new Float64Array(verts.length).fill(1e18);
      const prev = new Int32Array(verts.length).fill(-1);
      const done = new Uint8Array(verts.length);
      dist[s] = 0;
      for (;;) {
        let u = -1;
        let ud = 1e18;
        for (let i = 0; i < verts.length; i++) if (!done[i] && dist[i] < ud) {
          ud = dist[i];
          u = i;
        }
        if (u < 0 || u === e) break;
        done[u] = 1;
        for (const v of verts[u].adj) {
          const a = verts[u];
          const b = verts[v];
          let w = Math.hypot(b.x - a.x, b.y - a.y);
          const dc = Math.hypot((a.x + b.x) / 2 - FO[0], (a.y + b.y) / 2 - FO[1]);
          if (dc < avoid) w *= 40;
          // prefer staying near the straight line between the ends
          const yl = lerp(sy, ey, clamp(((a.x + b.x) / 2 + MG) / (W + 2 * MG)));
          w *= 1 + Math.abs((a.y + b.y) / 2 - yl) / 160;
          if (dist[u] + w < dist[v]) {
            dist[v] = dist[u] + w;
            prev[v] = u;
          }
        }
      }
      const pts = [];
      for (let v = e; v >= 0; v = prev[v]) pts.unshift([verts[v].x, verts[v].y]);
      return track(chaikin(pts, 3, false), 3);
    };
    FAT.caps = [route(260, 120, 330), route(860, 980, 330), route(1100, 600, 560)];
    FAT.capInfo = FAT.caps.map((T, i) => {
      const [s, d] = nearestOnTrack(T, FO[0], FO[1]);
      return { s, d, dir: i === 1 ? -1 : 1 };
    });
    // painted background: dark gaps, blurred deep cells (depth), a fine strand web
    const cv = mk(W + 2 * MG, H + 2 * MG);
    const g = cv.getContext("2d");
    g.translate(MG, MG);
    let gr = g.createRadialGradient(FO[0], FO[1], 0, FO[0], FO[1], 1300);
    gr.addColorStop(0, rgba(mixc(C.gapFat, [110, 30, 70], 0.4)));
    gr.addColorStop(0.5, rgba(C.gapFat));
    gr.addColorStop(1, rgba(C.gapFatDeep));
    g.fillStyle = gr;
    g.fillRect(-MG, -MG, W + 2 * MG, H + 2 * MG);
    g.filter = "blur(7px)";
    for (let i = 0; i < 70; i++) {
      const x = -MG + R() * (W + 2 * MG);
      const y = -MG + R() * (H + 2 * MG);
      const r = 40 + R() * 70;
      g.fillStyle = rgba(mixc([170, 90, 50], C.gapFat, 0.35 + R() * 0.3), 0.8);
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
      g.fillStyle = rgba([230, 160, 90], 0.25);
      g.beginPath();
      g.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, TAU);
      g.fill();
    }
    g.filter = "none";
    g.lineCap = "round";
    for (const poly of raw) {
      for (let i = 0; i < poly.length; i++) {
        if (R() < 0.35) continue;
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const nx = -(b[1] - a[1]) / (L || 1);
        const ny = (b[0] - a[0]) / (L || 1);
        for (let k = 0; k < 2; k++) {
          const o = (R() - 0.5) * 8;
          const w = (R() - 0.5) * 16;
          g.strokeStyle = rgba(C.strand, 0.22 + R() * 0.3);
          g.lineWidth = 1 + R() * 1.6;
          g.beginPath();
          g.moveTo(a[0] + nx * o, a[1] + ny * o);
          g.quadraticCurveTo((a[0] + b[0]) / 2 + nx * w, (a[1] + b[1]) / 2 + ny * w, b[0] - nx * o, b[1] - ny * o);
          g.stroke();
        }
        // bridging strands across the gap
        if (R() < 0.5) {
          const u = R();
          const x = lerp(a[0], b[0], u);
          const y = lerp(a[1], b[1], u);
          g.strokeStyle = rgba(C.strand, 0.45);
          g.lineWidth = 1.2;
          g.beginPath();
          g.moveTo(x - nx * 14, y - ny * 14);
          g.quadraticCurveTo(x + (b[0] - a[0]) * 0.03, y + (b[1] - a[1]) * 0.03, x + nx * 14, y + ny * 14);
          g.stroke();
        }
      }
    }
    FAT.bg = cv;
    // capillary tubes, painted once
    const cc = mk(W + 2 * MG, H + 2 * MG);
    const c2 = cc.getContext("2d");
    c2.translate(MG, MG);
    for (const T of FAT.caps) {
      c2.lineCap = "round";
      c2.lineJoin = "round";
      c2.strokeStyle = rgba([60, 6, 40], 0.6);
      c2.lineWidth = 26;
      c2.save();
      c2.translate(4, 6);
      c2.stroke(T.path);
      c2.restore();
      c2.strokeStyle = rgba(P.rbcShade);
      c2.lineWidth = 21;
      c2.stroke(T.path);
      c2.strokeStyle = rgba(mixc(P.capillary, [255, 200, 210], 0.25));
      c2.lineWidth = 17;
      c2.save();
      c2.translate(-1, -1.5);
      c2.stroke(T.path);
      c2.restore();
      c2.strokeStyle = rgba(mixc(P.blood, [120, 10, 60], 0.3));
      c2.lineWidth = 11;
      c2.stroke(T.path);
    }
    FAT.capCache = cc;
    // seeded specks
    FAT.specks = [];
    for (let i = 0; i < 70; i++) FAT.specks.push({ g: (R() * Math.min(FAT.gapPts.length, 600)) | 0, ph: R() * 10, s: 0.5 + R() });
  }

  // radius of the seep front in direction ang
  function fatFront(k, ang, t) {
    const base = FHOLE - 20 + 470 * Math.pow(clamp(k), 0.85);
    return base * (1 + 0.16 * fbm(ang * 1.3 + 3, 61, 3) + 0.05 * Math.sin(ang * 5 + t * 0.4));
  }

  function fatCell(ctx, c, t, med, ox = 0, oy = 0) {
    const wob = 1 + 0.02 * Math.sin(t * 0.9 + c.ph) + 0.008 * Math.sin(t * 2.3 + c.ph * 3);
    const r = c.r * wob;
    ctx.save();
    ctx.translate(c.x + ox + 1.5 * Math.sin(t * 0.5 + c.ph), c.y + oy + 1.5 * Math.cos(t * 0.43 + c.ph));
    ctx.scale(wob, wob * (1 - 0.012 * Math.sin(t * 0.9 + c.ph)));
    const path = c.path;
    // pale membrane
    ctx.save();
    ctx.scale(1 + 4 / c.r, 1 + 4 / c.r);
    ctx.fillStyle = rgba(C.membrane, 0.9);
    ctx.fill(path);
    ctx.restore();
    ctx.fillStyle = rgba(C.fatShadowDeep);
    ctx.fill(path);
    ctx.save();
    ctx.clip(path);
    ctx.save();
    ctx.translate(-c.r * 0.035, -c.r * 0.045);
    ctx.fillStyle = rgba(c.tint < 0.3 ? mixc(C.fatShadow, C.fatShadowDeep, 0.3) : C.fatShadow);
    ctx.fill(path);
    ctx.translate(-c.r * 0.06, -c.r * 0.075);
    const base = c.tint < 0.3 ? mixc(P.fat, P.fatShade, 0.3) : c.tint > 0.8 ? mixc(P.fat, P.fatLight, 0.25) : P.fat;
    const gr = ctx.createRadialGradient(-c.r * 0.3, -c.r * 0.35, c.r * 0.05, 0, 0, c.r * 1.05);
    gr.addColorStop(0, rgba(mixc(base, P.fatLight, 0.6)));
    gr.addColorStop(0.55, rgba(base));
    gr.addColorStop(1, rgba(mixc(base, P.fatShade, 0.35)));
    ctx.fillStyle = gr;
    ctx.fill(path);
    ctx.restore();
    // highlight crescent on the upper-left edge
    const hp = new Path2D();
    hp.addPath(path);
    hp.addPath(path, new DOMMatrix([1, 0, 0, 1, c.r * 0.045, c.r * 0.06]));
    ctx.fillStyle = rgba([255, 246, 196], 0.95);
    ctx.fill(hp, "evenodd");
    // aqua rim on the side facing the medicine
    if (med > 0.01) {
      const dx = c.x - FO[0];
      const dy = c.y - FO[1];
      const dl = Math.hypot(dx, dy) || 1;
      const mp = new Path2D();
      mp.addPath(path);
      mp.addPath(path, new DOMMatrix([1, 0, 0, 1, (dx / dl) * c.r * 0.07, (dy / dl) * c.r * 0.07]));
      ctx.fillStyle = rgba(P.medGlow, 0.85 * med);
      ctx.fill(mp, "evenodd");
    }
    // flattened nucleus pressed against the membrane
    const nx = Math.cos(c.a) * c.rb;
    const ny = Math.sin(c.a) * c.rb;
    ctx.save();
    ctx.translate(nx, ny);
    ctx.rotate(c.a + Math.PI / 2);
    ctx.fillStyle = rgba(mixc(C.nucleus, [110, 30, 80], 0.4));
    ctx.beginPath();
    ctx.ellipse(0, 1.5, c.r * 0.26, c.r * 0.075, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(C.nucleus);
    ctx.beginPath();
    ctx.ellipse(-0.5, 0, c.r * 0.25, c.r * 0.065, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(C.nucleusLight, 0.9);
    ctx.beginPath();
    ctx.ellipse(-c.r * 0.05, -1, c.r * 0.09, c.r * 0.02, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // tiny oil bubbles
    for (const b of c.bubbles) {
      ctx.fillStyle = rgba(P.fatLight, 0.8);
      ctx.beginPath();
      ctx.arc(b[0], b[1], b[2], 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(b[0] - b[2] * 0.35, b[1] - b[2] * 0.35, b[2] * 0.35, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // glossy speculars
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(-c.r * 0.42, -c.r * 0.42, c.r * 0.2, c.r * 0.085, -0.78, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-c.r * 0.18, -c.r * 0.6, c.r * 0.04, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(c.r * 0.35, c.r * 0.38, c.r * 0.12, c.r * 0.04, -0.78, 0, TAU);
    ctx.fill();
    ctx.restore();
    return r;
  }

  TS.fat = function (ctx, o = {}) {
    if (!ready) return;
    const t = o.t || 0;
    const k = clamp(o.k || 0);
    ctx.save();
    applyCam(ctx, o);
    ctx.drawImage(FAT.bg, -MG, -MG);
    // medicine seeping through the gaps (drawn under the cells, so only the gaps glow)
    const front = [];
    const NF = 72;
    for (let i = 0; i < NF; i++) {
      const a = (i / NF) * TAU;
      const rr = fatFront(k, a, t);
      front.push([FO[0] + Math.cos(a) * rr, FO[1] + Math.sin(a) * rr]);
    }
    const fp = polyPath(chaikin(front, 1));
    const Rf = FHOLE - 20 + 470 * Math.pow(k, 0.85);
    const fade = 1 - 0.35 * k; // the dose thins out as it spreads
    let gr = ctx.createRadialGradient(FO[0], FO[1], 0, FO[0], FO[1], Rf * 1.2);
    gr.addColorStop(0, rgba(P.med, 0.95 - 0.4 * k));
    gr.addColorStop(0.55, rgba(P.med, 0.8 * fade - 0.25 * k));
    gr.addColorStop(0.78, rgba(P.medGlow, 0.85 * fade));
    gr.addColorStop(0.9, rgba(P.medDeep, 0.4 * fade));
    gr.addColorStop(1, rgba(P.medDeep, 0));
    ctx.fillStyle = gr;
    ctx.fill(fp);
    ctx.globalCompositeOperation = "lighter";
    spr(ctx, SPR.medSoft, FO[0], FO[1], Rf * 1.5, 0.55);
    ctx.globalCompositeOperation = "source-over";
    // cells
    for (const c of FAT.cells) {
      if (c.x + c.r * 1.3 < -MG || c.x - c.r * 1.3 > W + MG || c.y + c.r * 1.3 < -MG || c.y - c.r * 1.3 > H + MG) continue;
      const med = clamp(1 - (c.dO - c.r * 0.6) / (Rf * 1.1)) * fade;
      // as the pool drains, the cells around the hollow slowly relax into it
      const pull = 46 * Math.pow(k, 0.8) * Math.exp(-Math.max(0, c.dO - FHOLE - 80) / 170);
      fatCell(ctx, c, t, med, ((FO[0] - c.x) / c.dO) * pull, ((FO[1] - c.y) / c.dO) * pull);
    }
    // capillaries + slow single-file blood
    ctx.drawImage(FAT.capCache, -MG, -MG);
    for (let ci = 0; ci < FAT.caps.length; ci++) {
      const T = FAT.caps[ci];
      const info = FAT.capInfo[ci];
      const sp = 30;
      const off = (((t * FAT_V * info.dir) % sp) + sp) % sp;
      for (let s = off; s < T.len; s += sp) {
        const slot = Math.floor((s - off) / sp);
        if (hash(slot, ci, 9) < 0.18) continue;
        const q = at(T, s);
        if (q[0] < -MG || q[0] > W + MG || q[1] < -MG || q[1] > H + MG) continue;
        const tu = 0.45 + 0.45 * Math.abs(Math.sin(t * 1.2 + slot));
        ctx.save();
        ctx.translate(q[0], q[1]);
        ctx.rotate(Math.atan2(q[3], q[2]) + Math.PI / 2);
        ctx.fillStyle = rgba([150, 10, 50]);
        ctx.beginPath();
        ctx.ellipse(0, 0, 8.5, 5 * tu + 2.5, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgba(P.rbc);
        ctx.beginPath();
        ctx.ellipse(-0.8, -0.8, 7, 4 * tu + 1.8, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "rgba(255,190,190,0.9)";
        ctx.beginPath();
        ctx.ellipse(-3, -1.5, 2.6, 1, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      // gloss over the tube
      ctx.save();
      ctx.translate(-3, -4);
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(255,226,232,0.55)";
      ctx.lineWidth = 2.6;
      ctx.stroke(T.path);
      ctx.restore();
      // the few specks that make it in drift away with the blood
      const kc = clamp((info.d - (FHOLE - 20)) / 470) ** (1 / 0.85) - 0.05;
      if (k > kc) {
        const reach = (k - kc) * 520;
        // faint aqua tint in the vessel downstream
        if (subPath(ctx, T, info.dir > 0 ? info.s : info.s - reach, info.dir > 0 ? info.s + reach : info.s)) {
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = rgba(P.med, 0.16);
          ctx.lineWidth = 12;
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.globalCompositeOperation = "lighter";
        const msp = 105;
        const moff = (((t * FAT_V) % msp) + msp) % msp;
        for (let d = moff; d < reach; d += msp) {
          const s = info.s + info.dir * d;
          const q = at(T, s);
          const a = sstep(reach, reach - 90, d) * sstep(0, 25, d) * (0.6 + 0.4 * Math.sin(t * 3 + d));
          spr(ctx, SPR.medGlow, q[0], q[1], 34, a * 0.5);
          spr(ctx, SPR.medDot, q[0], q[1], 17, a);
        }
        ctx.globalCompositeOperation = "source-over";
      }
    }
    // the pool in the hollow, shrinking as the dose seeps away
    const pr = (FHOLE - 16) * (1 - 0.5 * Math.pow(k, 0.8));
    const pts = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * TAU;
      const w = 1 + 0.045 * Math.sin(a * 3 + t * 0.8) + 0.03 * Math.sin(a * 5 - t * 1.1) + 0.03 * fbm(a * 2, 64, 2);
      pts.push([FO[0] + Math.cos(a) * pr * w, FO[1] + Math.sin(a) * pr * w * 0.94]);
    }
    const pool = polyPath(pts);
    const pa = 0.92 - 0.3 * k;
    ctx.globalAlpha = pa;
    ctx.fillStyle = rgba(P.medDeep);
    ctx.fill(pool);
    ctx.save();
    ctx.clip(pool);
    ctx.translate(FO[0], FO[1]);
    ctx.save();
    ctx.translate(-pr * 0.06, -pr * 0.08);
    ctx.translate(-FO[0], -FO[1]);
    gr = ctx.createRadialGradient(FO[0] - pr * 0.3, FO[1] - pr * 0.35, pr * 0.1, FO[0], FO[1], pr);
    gr.addColorStop(0, rgba(P.medGlow));
    gr.addColorStop(0.6, rgba(P.med));
    gr.addColorStop(1, rgba(mixc(P.med, P.medDeep, 0.3)));
    ctx.fillStyle = gr;
    ctx.fill(pool);
    ctx.restore();
    // drifting bubbles inside the pool
    for (let i = 0; i < 9; i++) {
      const bx = (hash(i, 3, 1) - 0.5) * pr * 1.4 + 10 * Math.sin(t * 0.4 + i);
      const by = ((((hash(i, 3, 2) * 2 - 1) * pr - t * 9 * (0.5 + hash(i, 3, 3))) % pr) + pr) % (pr * 1.6) - pr * 0.8;
      const br = 3 + hash(i, 3, 4) * 7;
      ctx.fillStyle = "rgba(220,255,250,0.55)";
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // pool highlight and specular
    const hp = new Path2D();
    hp.addPath(pool);
    hp.addPath(pool, new DOMMatrix([1, 0, 0, 1, pr * 0.05, pr * 0.06]));
    ctx.fillStyle = "rgba(230,255,252,0.9)";
    ctx.fill(hp, "evenodd");
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.ellipse(FO[0] - pr * 0.42, FO[1] - pr * 0.45, pr * 0.22, pr * 0.08, -0.75, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(FO[0] - pr * 0.15, FO[1] - pr * 0.62, pr * 0.04, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "lighter";
    spr(ctx, SPR.medGlow, FO[0], FO[1], pr * 2.4 * (1 + 0.04 * Math.sin(t * 1.4)), 0.42 * pa);
    // lazy specks creeping along the gaps behind the front
    const nG = FAT.gapPts.length;
    for (let i = 0; i < FAT.specks.length; i++) {
      const sk = FAT.specks[i];
      const gpt = FAT.gapPts[sk.g % nG];
      const a = Math.atan2(gpt.y - FO[1], gpt.x - FO[0]);
      const fr = fatFront(k, a, t);
      if (gpt.d > fr + 10) continue;
      const wv = 16 * Math.sin(t * 0.35 * sk.s + sk.ph);
      const x = gpt.x + gpt.ex * wv;
      const y = gpt.y + gpt.ey * wv;
      const al = sstep(fr + 10, fr - 50, gpt.d) * (0.55 + 0.45 * Math.sin(t * 1.3 + sk.ph));
      spr(ctx, SPR.medDot, x, y, 8 + 5 * sk.s, al);
    }
    // ambient: warm motes drifting slowly
    driftField(ctx, t, { n: 46, seed: 21, box: [-MG, -MG, W + MG, H + MG], img: SPR.warmDot, rMin: 1.5, rMax: 4.5, a: 0.4, vx: 5, vy: -4, wander: 24 });
    spr(ctx, SPR.flareAqua, FO[0] - pr * 0.42, FO[1] - pr * 0.45, 30 + 8 * Math.sin(t * 1.7), 0.55 * pa);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  TS.fatAnchors = function (o = {}) {
    return { deposit: toScreen(o, FO) };
  };

  // ==================================================================== MUSCLE close-up (shot 8)
  const MUS = {};
  const MO = [960, 540]; // deposit centre (sits in a gap between two fascicles)
  const MANG = -0.42; // fibre direction (rad): lower-left to upper-right
  const MUS_V = 150; // blood speed in the capillaries, px/s
  const MED_V = 300; // medicine carried off, px/s (also the stream front speed per k: 800 px)

  function buildMuscle() {
    const R = EX.rng(5303);
    const ca = Math.cos(MANG);
    const sa = Math.sin(MANG);
    const toW = (u, v) => [MO[0] + u * ca - v * sa, MO[1] + u * sa + v * ca];
    const U0 = -1300;
    const U1 = 1300;
    // fascicles stacked across v; a gap is centred on v = 0 for the deposit
    const bundles = [];
    let v = 14;
    while (v < 1000) {
      const w = 150 + R() * 70;
      bundles.push({ v0: v, v1: v + w });
      v += w + 28 + R() * 14;
    }
    v = -14;
    while (v > -1000) {
      const w = 150 + R() * 70;
      bundles.push({ v0: v - w, v1: v });
      v -= w + 28 + R() * 14;
    }
    bundles.sort((a, b) => a.v0 - b.v0);
    // the deposit pushes the two fascicles around v = 0 apart
    const bulge = (u) => 58 * Math.exp(-((u / 210) ** 2));
    for (const b of bundles) {
      b.ph = R() * 10;
      b.ph2 = R() * 10;
      b.tone = R();
      b.top = (u) => b.v0 + 6 * Math.sin(u / 330 + b.ph) + 3 * fbm(u / 140, (b.ph * 10) | 0, 2) + (Math.abs(b.v0 - 14) < 1 ? bulge(u) : 0);
      b.bot = (u) => b.v1 + 6 * Math.sin(u / 310 + b.ph2) + 3 * fbm(u / 150, (b.ph2 * 10) | 0, 2) - (Math.abs(b.v1 + 14) < 1 ? bulge(u) : 0);
    }
    MUS.bundles = bundles;
    const cv = mk(W + 2 * MG, H + 2 * MG);
    const g = cv.getContext("2d");
    g.translate(MG, MG);
    // dark ground between the fascicles
    let gr = g.createRadialGradient(MO[0], MO[1], 0, MO[0], MO[1], 1300);
    gr.addColorStop(0, rgba(mixc(C.gapMuscle, [120, 20, 70], 0.3)));
    gr.addColorStop(1, rgba(C.gapMuscleDeep));
    g.fillStyle = gr;
    g.fillRect(-MG, -MG, W + 2 * MG, H + 2 * MG);
    g.save();
    g.translate(MO[0], MO[1]);
    g.rotate(MANG);
    // connective strands in the gaps
    g.lineCap = "round";
    for (let i = 0; i < 140; i++) {
      const u = U0 + R() * (U1 - U0);
      const vv = -1000 + R() * 2000;
      g.strokeStyle = rgba(C.strand, 0.12 + R() * 0.18);
      g.lineWidth = 1 + R() * 1.5;
      g.beginPath();
      g.moveTo(u, vv);
      g.bezierCurveTo(u + 60, vv + (R() - 0.5) * 30, u + 140, vv + (R() - 0.5) * 30, u + 200 + R() * 100, vv + (R() - 0.5) * 20);
      g.stroke();
    }
    const stri = mk(9, 8);
    {
      const s = stri.getContext("2d");
      s.fillStyle = "rgba(255,190,205,0.22)";
      s.fillRect(0, 0, 2.5, 8);
      s.fillStyle = "rgba(100,0,50,0.2)";
      s.fillRect(4.5, 0, 2, 8);
    }
    const pat = g.createPattern(stri, "repeat");
    for (const b of bundles) {
      const pts = [];
      for (let u = U0; u <= U1; u += 12) pts.push([u, b.top(u)]);
      for (let u = U1; u >= U0; u -= 12) pts.push([u, b.bot(u)]);
      const path = polyPath(pts);
      const wv = b.v1 - b.v0;
      // drop shadow onto the ground
      g.save();
      g.translate(6, 10);
      g.fillStyle = "rgba(20,0,24,0.45)";
      g.fill(path);
      g.restore();
      g.save();
      g.clip(path);
      const mb = mixc(P.muscle, P.muscleShade, 0.4);
      const tone = b.tone < 0.4 ? mixc(mb, P.muscleShade, 0.25) : b.tone > 0.8 ? mixc(mb, P.muscle, 0.6) : mb;
      gr = g.createLinearGradient(0, b.v0, 0, b.v1);
      gr.addColorStop(0, rgba(mixc(tone, P.muscleLight, 0.3)));
      gr.addColorStop(0.45, rgba(tone));
      gr.addColorStop(1, rgba(mixc(tone, P.muscleShade, 0.5)));
      g.fillStyle = gr;
      g.fillRect(U0, b.v0 - 80, U1 - U0, wv + 160);
      // individual fibres: subtle cylinders separated by fine dark lines, each with its own striations
      const nf = Math.round(wv / 24);
      for (let f = 0; f < nf; f++) {
        const fv0 = b.v0 + (wv * f) / nf;
        const fv1 = b.v0 + (wv * (f + 1)) / nf;
        const ph = R() * 10;
        const edge = (u, fv) => fv + 3 * Math.sin(u / 260 + ph) + (fv - b.v0) / wv * (b.bot(u) - b.v1) + (1 - (fv - b.v0) / wv) * (b.top(u) - b.v0);
        const fp = [];
        for (let u = U0; u <= U1; u += 20) fp.push([u, edge(u, fv0)]);
        for (let u = U1; u >= U0; u -= 20) fp.push([u, edge(u, fv1)]);
        const fpath = polyPath(fp);
        g.save();
        g.clip(fpath);
        g.fillStyle = "rgba(255,150,170,0.1)";
        g.fillRect(U0, fv0 + (fv1 - fv0) * 0.2, U1 - U0, (fv1 - fv0) * 0.3);
        g.save();
        g.translate((R() * 9) | 0, 0);
        g.fillStyle = pat;
        g.fillRect(U0 - 20, fv0 - 20, U1 - U0 + 40, fv1 - fv0 + 40);
        g.restore();
        g.restore();
        g.strokeStyle = "rgba(90,0,45,0.35)";
        g.lineWidth = 1.6;
        g.beginPath();
        for (let u = U0; u <= U1; u += 20) g.lineTo(u, edge(u, fv1));
        g.stroke();
      }
      // cel shadow band + deep fold along the bottom, lit band + rim along the top
      const band = (f0, col, a, below) => {
        g.fillStyle = rgba(col, a);
        g.beginPath();
        for (let u = U0; u <= U1; u += 14) {
          const vb = lerp(b.top(u), b.bot(u), f0) + 4 * Math.sin(u / 170 + b.ph) + 2 * fbm(u / 60, 9, 2);
          g.lineTo(u, vb);
        }
        g.lineTo(U1, below ? b.v1 + 120 : b.v0 - 120);
        g.lineTo(U0, below ? b.v1 + 120 : b.v0 - 120);
        g.fill();
      };
      band(0.7, P.muscleShade, 0.92, true);
      band(0.9, P.muscleDeep, 0.95, true);
      band(0.13, mixc(P.muscle, P.muscleLight, 0.8), 0.92, false);
      g.restore();
      g.strokeStyle = rgba([255, 170, 180], 0.9);
      g.lineWidth = 2.6;
      g.beginPath();
      for (let u = U0; u <= U1; u += 12) g.lineTo(u, b.top(u) + 2);
      g.stroke();
      // sheen streaks and sparkles
      g.save();
      g.clip(path);
      for (let i = 0; i < 7; i++) {
        const u = U0 + R() * (U1 - U0);
        const vv = lerp(b.top(u), b.bot(u), 0.2 + R() * 0.15);
        g.fillStyle = "rgba(255,215,225,0.38)";
        g.beginPath();
        g.ellipse(u, vv, 60 + R() * 120, 3 + R() * 2.5, 0, 0, TAU);
        g.fill();
      }
      for (let i = 0; i < 10; i++) {
        const u = U0 + R() * (U1 - U0);
        g.fillStyle = "rgba(255,255,255,0.75)";
        g.beginPath();
        g.ellipse(u, lerp(b.top(u), b.bot(u), 0.12 + R() * 0.12), 4 + R() * 9, 1.6, 0, 0, TAU);
        g.fill();
      }
      g.restore();
    }
    g.restore();
    // capillary web: one along every gap, one riding on every fascicle, organic links over the fascicles
    const caps = [];
    const gapsV = [];
    for (let i = 0; i < bundles.length - 1; i++) gapsV.push([bundles[i], bundles[i + 1]]);
    const along = (vf, amp, seed) => {
      const pts = [];
      const ph = R() * 10;
      for (let u = U0 - 60; u <= U1 + 60; u += 70) {
        pts.push(toW(u, vf(u) + amp * Math.sin(u / (230 + seed * 40) + ph) + amp * 0.5 * fbm(u / 90, seed, 2)));
      }
      return pts;
    };
    for (const [a, b] of gapsV) caps.push({ pts: along((u) => (a.bot(u) + b.top(u)) / 2, 4, 3), w: 22 });
    for (const b of bundles) {
      const f = 0.3 + R() * 0.4;
      caps.push({ pts: along((u) => lerp(b.top(u), b.bot(u), f), 18, 7), w: 17 });
    }
    for (let i = 0; i < gapsV.length; i++) {
      // links climb over fascicle b (from the gap above it to the gap below it), curvy, some forked
      const b = bundles[i + 1];
      for (let u = U0 + R() * 200; u < U1; u += 200 + R() * 260) {
        const du = (R() - 0.5) * 360;
        const v0 = b.top(u) - 10;
        const v1 = b.bot(u + du) + 10;
        const wig = (R() - 0.5) * 140;
        const sd = R() < 0.5 ? -1 : 1;
        const pts = [toW(u - 40 * sd, v0 - 4), toW(u, v0 + 2)];
        for (let k = 1; k < 3; k++) {
          const f = k / 3;
          pts.push(toW(u + du * f + wig * Math.sin(f * Math.PI), lerp(v0, v1, f)));
        }
        pts.push(toW(u + du, v1 - 2), toW(u + du + 40 * sd, v1 + 4));
        caps.push({ pts, w: 15 + R() * 3 });
      }
    }
    MUS.caps = [];
    const gl = mk(W + 2 * MG, H + 2 * MG); // gloss over the vessels (drawn above the moving cells)
    const g2 = gl.getContext("2d");
    g2.translate(MG, MG);
    for (const c of caps) {
      const T = track(c.pts, 4);
      T.w = c.w;
      T.dir = R() < 0.5 ? 1 : -1;
      T.ph = R() * 40;
      const [s, d] = nearestOnTrack(T, MO[0], MO[1]);
      T.ms = s;
      T.md = d;
      MUS.caps.push(T);
      g.lineCap = "round";
      g.lineJoin = "round";
      g.save();
      g.translate(3, 6);
      g.strokeStyle = "rgba(30,0,30,0.4)";
      g.lineWidth = c.w + 5;
      g.stroke(T.path);
      g.restore();
      // solid glossy vessel: shadow body, lit body, a warmer core where the blood shows through
      g.strokeStyle = rgba([176, 24, 70]);
      g.lineWidth = c.w + 3;
      g.stroke(T.path);
      g.save();
      g.translate(-c.w * 0.08, -c.w * 0.12);
      g.strokeStyle = rgba([255, 92, 116]);
      g.lineWidth = c.w;
      g.stroke(T.path);
      g.restore();
      g.strokeStyle = rgba([236, 58, 92]);
      g.lineWidth = c.w * 0.42;
      g.stroke(T.path);
      g2.lineCap = "round";
      g2.lineJoin = "round";
      g2.save();
      g2.translate(-c.w * 0.17, -c.w * 0.22);
      g2.strokeStyle = "rgba(255,225,230,0.7)";
      g2.lineWidth = Math.max(1.6, c.w * 0.15);
      g2.stroke(T.path);
      g2.restore();
    }
    // a soft warm light pool over the middle of the field
    g.globalCompositeOperation = "lighter";
    {
      const q = g.createRadialGradient(MO[0] - 100, MO[1] - 80, 0, MO[0] - 100, MO[1] - 80, 1000);
      q.addColorStop(0, "rgba(255,120,150,0.13)");
      q.addColorStop(1, "rgba(255,120,150,0)");
      g.fillStyle = q;
      g.fillRect(-MG, -MG, W + 2 * MG, H + 2 * MG);
    }
    g.globalCompositeOperation = "source-over";
    MUS.cache = cv;
    MUS.gloss = gl;
    // red cell sprite (side view, cel shaded)
    const rc = mk(24, 16);
    {
      const s = rc.getContext("2d");
      s.fillStyle = rgba([120, 6, 44]);
      s.beginPath();
      s.ellipse(12, 8, 10, 7, 0, 0, TAU);
      s.fill();
      s.fillStyle = rgba([196, 22, 62]);
      s.beginPath();
      s.ellipse(11.2, 7.2, 8.4, 5.6, 0, 0, TAU);
      s.fill();
      s.fillStyle = rgba([150, 10, 50]);
      s.beginPath();
      s.ellipse(12.2, 8.2, 4.2, 2.6, 0, 0, TAU);
      s.fill();
      s.fillStyle = "rgba(255,150,160,0.95)";
      s.beginPath();
      s.ellipse(8.5, 4.4, 3.4, 1.3, 0, 0, TAU);
      s.fill();
    }
    MUS.rbc = rc;
  }

  TS.muscle = function (ctx, o = {}) {
    if (!ready) return;
    const t = o.t || 0;
    const k = clamp(o.k || 0);
    ctx.save();
    applyCam(ctx, o);
    // a very slow breath of the whole tissue
    const br = 1 + 0.004 * Math.sin(t * 0.8);
    ctx.translate(MO[0], MO[1]);
    ctx.scale(br, br);
    ctx.translate(-MO[0], -MO[1]);
    ctx.drawImage(MUS.cache, -MG, -MG);
    // the soak: tissue around the deposit takes on an aqua glow that spreads fast
    {
      const rs = 240 + 560 * Math.pow(k, 0.7);
      const q = ctx.createRadialGradient(MO[0], MO[1], 0, MO[0], MO[1], rs);
      q.addColorStop(0, rgba(P.med, 0.32));
      q.addColorStop(0.5, rgba(P.medDeep, 0.16));
      q.addColorStop(1, rgba(P.medDeep, 0));
      ctx.fillStyle = q;
      ctx.fillRect(MO[0] - rs, MO[1] - rs, rs * 2, rs * 2);
    }
    // blood streaming through the web
    const m = ctx.getTransform();
    const img = MUS.rbc;
    for (let ci = 0; ci < MUS.caps.length; ci++) {
      const T = MUS.caps[ci];
      const sp = T.w > 20 ? 28 : 26;
      const cw = T.w * 0.78;
      const off = ((((t * MUS_V + T.ph) * T.dir) % sp) + sp) % sp;
      for (let s = off; s < T.len; s += sp) {
        const slot = Math.round((s - off) / sp);
        if (hash(slot, ci, 5) < 0.22) continue;
        const f = clamp(s / T.step, 0, T.n - 1e-4);
        const i = f | 0;
        const u = f - i;
        const x = T.xs[i] + (T.xs[i + 1] - T.xs[i]) * u;
        const y = T.ys[i] + (T.ys[i + 1] - T.ys[i]) * u;
        if (x < -MG || x > W + MG || y < -MG || y > H + MG) continue;
        let tx = T.xs[i + 1] - T.xs[i];
        let ty = T.ys[i + 1] - T.ys[i];
        const l = Math.hypot(tx, ty) || 1;
        tx /= l;
        ty /= l;
        ctx.setTransform(m.a * tx + m.c * ty, m.b * tx + m.d * ty, -m.a * ty + m.c * tx, -m.b * ty + m.d * tx, m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f);
        ctx.drawImage(img, -cw * 0.55, -cw * 0.42, cw * 1.1, cw * 0.84);
      }
    }
    ctx.setTransform(m);
    // medicine carried off in many capillaries: aqua fills the vessel, a cool halo around it
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const streams = [];
    for (let ci = 0; ci < MUS.caps.length; ci++) {
      const T = MUS.caps[ci];
      const kc = 0.02 + T.md / 1000;
      if (k <= kc || T.md > 760) continue;
      streams.push([T, (k - kc) * 1100, kc]);
    }
    for (const [T, reach] of streams) {
      const seg = 40;
      for (let d = 0; d < reach; d += seg) {
        const s0 = T.ms + T.dir * d;
        const s1 = T.ms + T.dir * Math.min(reach, d + seg + 2);
        if (!subPath(ctx, T, Math.min(s0, s1), Math.max(s0, s1))) continue;
        const a = Math.exp(-d / 700) * sstep(reach, reach - 100, d);
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = rgba(P.medDeep, 0.35 * a);
        ctx.lineWidth = T.w + 16;
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = rgba(P.med, 0.9 * a);
        ctx.lineWidth = T.w - 3;
        ctx.stroke();
      }
    }
    ctx.drawImage(MUS.gloss, -MG, -MG);
    ctx.globalCompositeOperation = "lighter";
    for (const [T, reach, kc] of streams) {
      const msp = 22;
      const moff = (((t * MED_V + T.ph) % msp) + msp) % msp;
      for (let d = moff; d < reach; d += msp) {
        const q = at(T, T.ms + T.dir * d);
        const a = sstep(reach, reach - 90, d) * Math.exp(-d / 900) * 0.8;
        spr(ctx, SPR.medDot, q[0], q[1], 7 + 2 * Math.sin(d * 0.3 + t * 4), a);
      }
      const q0 = at(T, T.ms);
      spr(ctx, SPR.medGlow, q0[0], q0[1], 30, 0.55 * sstep(kc, kc + 0.1, k) * (1 - 0.6 * k));
    }
    ctx.globalCompositeOperation = "source-over";
    // the deposit, draining quickly
    const pk = 1 - 0.8 * sstep(0, 0.75, k);
    {
      const L = 205 * (0.35 + 0.65 * pk);
      const Wd = 52 * (0.4 + 0.6 * pk);
      ctx.save();
      ctx.translate(MO[0], MO[1]);
      ctx.rotate(MANG);
      const pts = [];
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * TAU;
        const w = 1 + 0.06 * Math.sin(a * 3 + t * 1.3) + 0.04 * Math.sin(a * 5 - t);
        pts.push([Math.cos(a) * L * w, Math.sin(a) * Wd * w]);
      }
      const pool = polyPath(pts);
      ctx.globalAlpha = 0.35 + 0.6 * pk;
      ctx.fillStyle = rgba(P.medDeep);
      ctx.fill(pool);
      ctx.save();
      ctx.clip(pool);
      ctx.translate(-L * 0.03, -Wd * 0.14);
      const gr = ctx.createLinearGradient(0, -Wd, 0, Wd);
      gr.addColorStop(0, rgba(P.medGlow));
      gr.addColorStop(0.5, rgba(P.med));
      gr.addColorStop(1, rgba(mixc(P.med, P.medDeep, 0.4)));
      ctx.fillStyle = gr;
      ctx.fill(pool);
      ctx.restore();
      const hp = new Path2D();
      hp.addPath(pool);
      hp.addPath(pool, new DOMMatrix([1, 0, 0, 1, 0, Wd * 0.12]));
      ctx.fillStyle = "rgba(235,255,252,0.9)";
      ctx.fill(hp, "evenodd");
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.ellipse(-L * 0.4, -Wd * 0.42, L * 0.2, Wd * 0.12, 0, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const bx = ((hash(i, 8, 1) * 2 - 1) * L * 0.7 + t * 20 * (hash(i, 8, 2) - 0.5)) % (L * 0.8);
        const by = (hash(i, 8, 3) - 0.5) * Wd;
        ctx.fillStyle = "rgba(230,255,250,0.7)";
        ctx.beginPath();
        ctx.arc(bx, by, 2.5 + hash(i, 8, 4) * 4, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      ctx.globalCompositeOperation = "lighter";
      spr(ctx, SPR.medGlow, MO[0], MO[1], 230 * (0.5 + 0.5 * pk), 0.5 * pk + 0.15);
      ctx.globalCompositeOperation = "source-over";
    }
    // ambient: pink motes, a slow sheen sweeping along the fibres
    ctx.globalCompositeOperation = "lighter";
    const sw = ((t * 0.07) % 1.4) - 0.2;
    spr(ctx, SPR.soft, lerp(-200, W + 200, sw), lerp(H + 100, -100, sw), 420, 0.06);
    driftField(ctx, t, { n: 50, seed: 31, box: [-MG, -MG, W + MG, H + MG], img: SPR.pinkDot, rMin: 1.5, rMax: 4, a: 0.4, vx: 8, vy: -5, wander: 20 });
    if (k > 0) driftField(ctx, t, { n: 26, seed: 33, box: [MO[0] - 420, MO[1] - 300, MO[0] + 420, MO[1] + 300], img: SPR.medDot, rMin: 2, rMax: 4.5, a: 0.8 * sstep(0, 0.2, k) * (1 - 0.5 * k), vx: 20, vy: -10, wander: 40 });
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  TS.muscleAnchors = function (o = {}) {
    return { deposit: toScreen(o, MO) };
  };

  // ==================================================================== VEIN close-up (shot 9)
  const VEI = {};
  const VC = [960, 585]; // vein centre on screen
  const VANG = -0.085; // gentle diagonal: rising to the right; blood flows to +u (right)
  const VR = 252; // outer radius
  const VWALL = 30;
  const VRL = VR - VWALL; // lumen radius
  const VMAX = 820; // centre-line blood speed, px/s
  const VALVE_U = 360;
  const VNEED = { ang: 0.47, pierceU: -540, len: 285, hw: 21 }; // needle in the vein frame
  const vRad = (u) => VR + 20 * Math.exp(-(((u - VALVE_U + 60) / 150) ** 2)); // sinus bulge at the valve
  const vToW = (u, v) => {
    const c = Math.cos(VANG);
    const s = Math.sin(VANG);
    return [VC[0] + u * c - v * s, VC[1] + u * s + v * c];
  };
  function veinTip() {
    const pu = VNEED.pierceU;
    const pv = -vRad(pu) + 4;
    return [pu + Math.cos(VNEED.ang) * VNEED.len, pv + Math.sin(VNEED.ang) * VNEED.len];
  }
  // centre line of the medicine stream at distance d downstream of the tip (vein frame)
  function jetAt(d) {
    const [tu, tv] = veinTip();
    // starts along the needle, bends into the flow over ~120 px, settles a little below the tip
    const a = VNEED.ang * Math.exp(-d / 110);
    // closed form of the integral of (cos a, sin a) is messy; a smooth fit is enough here
    const bend = 110 * VNEED.ang * (1 - Math.exp(-d / 110));
    return [tu + d * (1 - 0.06 * Math.exp(-d / 200)), tv + bend + 0.02 * d, a];
  }

  function buildVein() {
    const R = EX.rng(4411);
    const U0 = -1350;
    const U1 = 1350;
    // ---- background tissue + the back wall of the lumen (one painted layer)
    const cv = mk(W + 2 * MG, H + 2 * MG);
    const g = cv.getContext("2d");
    g.translate(MG, MG);
    let gr = g.createLinearGradient(0, -MG, 0, H + MG);
    gr.addColorStop(0, rgba([30, 10, 70]));
    gr.addColorStop(0.5, rgba([44, 12, 82]));
    gr.addColorStop(1, rgba([24, 8, 60]));
    g.fillStyle = gr;
    g.fillRect(-MG, -MG, W + 2 * MG, H + 2 * MG);
    const pool = (x, y, r, c, a) => {
      const q = g.createRadialGradient(x, y, 0, x, y, r);
      q.addColorStop(0, rgba(c, a));
      q.addColorStop(1, rgba(c, 0));
      g.fillStyle = q;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    };
    pool(1500, 80, 600, [150, 60, 200], 0.35);
    pool(300, 1050, 600, [190, 50, 140], 0.28);
    pool(200, 60, 420, [90, 80, 230], 0.3);
    // out-of-focus fat cells and vessels in the surrounding tissue (depth)
    g.filter = "blur(10px)";
    for (let i = 0; i < 26; i++) {
      const top = i % 2 === 0;
      const x = -MG + R() * (W + 2 * MG);
      const y = top ? -MG + R() * 260 : H - 120 + R() * 260;
      const r = 50 + R() * 80;
      g.fillStyle = rgba(mixc([210, 140, 70], [60, 20, 90], 0.45 + R() * 0.25), 0.75);
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
      g.fillStyle = rgba([255, 210, 140], 0.18);
      g.beginPath();
      g.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, TAU);
      g.fill();
    }
    g.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = rgba([150, 30, 80], 0.6);
      g.lineWidth = 16 + R() * 14;
      g.beginPath();
      const y0 = i < 2 ? 40 + R() * 120 : H - 80 + R() * 100;
      g.moveTo(-MG, y0);
      g.bezierCurveTo(500, y0 + (R() - 0.5) * 200, 1300, y0 + (R() - 0.5) * 200, W + MG, y0 + (R() - 0.5) * 100);
      g.stroke();
    }
    g.filter = "none";
    // connective strands
    for (let i = 0; i < 60; i++) {
      const x = -MG + R() * (W + 2 * MG);
      const y = R() < 0.5 ? R() * 300 - MG : H - 260 + R() * 400;
      g.strokeStyle = rgba(C.strand, 0.1 + R() * 0.16);
      g.lineWidth = 1 + R() * 2;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + 80, y + (R() - 0.5) * 60, x + 160, y + (R() - 0.5) * 60, x + 240, y + (R() - 0.5) * 40);
      g.stroke();
    }
    // vein-frame layers
    g.save();
    g.translate(VC[0], VC[1]);
    g.rotate(VANG);
    const outline = (r0) => {
      const p = new Path2D();
      for (let u = U0; u <= U1; u += 10) p.lineTo(u, -vRad(u) + r0);
      for (let u = U1; u >= U0; u -= 10) p.lineTo(u, vRad(u) - r0);
      p.closePath();
      return p;
    };
    VEI.outer = outline(0);
    VEI.lumen = outline(VWALL);
    // cool glow around the vessel
    g.save();
    g.filter = "blur(26px)";
    g.fillStyle = rgba([110, 110, 255], 0.35);
    g.fill(VEI.outer);
    g.filter = "none";
    g.restore();
    // back wall seen through the lumen: deep plasma with a violet cast at the edges
    g.fillStyle = rgba(P.veinShade);
    g.fill(VEI.outer);
    gr = g.createLinearGradient(0, -VRL, 0, VRL);
    gr.addColorStop(0, rgba([70, 20, 92]));
    gr.addColorStop(0.18, rgba([116, 22, 82]));
    gr.addColorStop(0.5, rgba([142, 26, 80]));
    gr.addColorStop(0.82, rgba([96, 16, 72]));
    gr.addColorStop(1, rgba([52, 14, 80]));
    g.fillStyle = gr;
    g.fill(VEI.lumen);
    g.save();
    g.clip(VEI.lumen);
    // endothelial cobblestones on the far wall
    for (let row = -VRL; row < VRL; row += 34) {
      const off = R() * 90;
      for (let u = U0 - off; u < U1; u += 80 + R() * 30) {
        g.fillStyle = rgba([170, 50, 120], 0.16 + R() * 0.1);
        g.beginPath();
        g.ellipse(u, row + (R() - 0.5) * 8, 34 + R() * 10, 11 + R() * 3, 0, 0, TAU);
        g.fill();
        g.fillStyle = rgba([200, 90, 160], 0.18);
        g.beginPath();
        g.ellipse(u + 6, row, 6, 3, 0, 0, TAU);
        g.fill();
      }
    }
    g.restore();
    g.restore();
    VEI.bg = cv;

    // ---- front wall: translucent film, thick silhouette bands, speculars (transparent layer)
    const fc = mk(W + 2 * MG, H + 2 * MG);
    const f = fc.getContext("2d");
    f.translate(MG, MG);
    f.save();
    f.translate(VC[0], VC[1]);
    f.rotate(VANG);
    // fresnel film over the lumen: stronger toward the edges
    gr = f.createLinearGradient(0, -VRL, 0, VRL);
    gr.addColorStop(0, rgba(P.veinLight, 0.42));
    gr.addColorStop(0.16, rgba(P.vein, 0.14));
    gr.addColorStop(0.5, rgba(P.vein, 0.05));
    gr.addColorStop(0.84, rgba(P.veinShade, 0.18));
    gr.addColorStop(1, rgba(P.veinShade, 0.5));
    f.fillStyle = gr;
    f.fill(VEI.lumen);
    // the wall bands (top lit, bottom in shadow), cel steps
    const band = (side) => {
      const p = new Path2D();
      for (let u = U0; u <= U1; u += 10) p.lineTo(u, side * vRad(u));
      for (let u = U1; u >= U0; u -= 10) p.lineTo(u, side * (vRad(u) - VWALL - 2));
      p.closePath();
      return p;
    };
    const top = band(-1);
    const bot = band(1);
    f.fillStyle = rgba(P.vein);
    f.fill(top);
    f.save();
    f.clip(top);
    f.fillStyle = rgba(P.veinLight);
    for (let u = U0; u <= U1; u += 10) f.fillRect(u, -vRad(u), 11, 9);
    f.fillStyle = rgba(P.veinShade, 0.75);
    for (let u = U0; u <= U1; u += 10) f.fillRect(u, -vRad(u) + VWALL - 9, 11, 12);
    f.restore();
    f.fillStyle = rgba(P.veinShade);
    f.fill(bot);
    f.save();
    f.clip(bot);
    f.fillStyle = rgba([60, 36, 150]);
    for (let u = U0; u <= U1; u += 10) f.fillRect(u, vRad(u) - 12, 11, 13);
    f.fillStyle = rgba(P.vein, 0.9);
    for (let u = U0; u <= U1; u += 10) f.fillRect(u, vRad(u) - VWALL - 2, 11, 8);
    f.restore();
    // rims: cool on top, magenta below (the light rig)
    f.strokeStyle = rgba([214, 222, 255], 0.95);
    f.lineWidth = 3;
    f.beginPath();
    for (let u = U0; u <= U1; u += 10) f.lineTo(u, -vRad(u) + 1.5);
    f.stroke();
    f.strokeStyle = rgba([255, 95, 160], 0.8);
    f.lineWidth = 3;
    f.beginPath();
    for (let u = U0; u <= U1; u += 10) f.lineTo(u, vRad(u) - 1.5);
    f.stroke();
    // long glossy speculars on the near wall
    for (const [v0, h, a] of [[-VRL + 34, 12, 0.5], [-VRL + 58, 4, 0.35], [VRL - 40, 5, 0.18]]) {
      f.fillStyle = "rgba(255,255,255," + a + ")";
      for (let i = 0; i < 4; i++) {
        const u0 = U0 + 100 + i * 700 + R() * 200;
        const L = 260 + R() * 260;
        f.beginPath();
        f.ellipse(u0, v0 + 3 * Math.sin(u0), L, h, 0, 0, TAU);
        f.fill();
      }
    }
    for (let i = 0; i < 14; i++) {
      f.fillStyle = "rgba(255,255,255,0.7)";
      f.beginPath();
      f.ellipse(U0 + R() * (U1 - U0), -VRL + 20 + R() * 60, 3 + R() * 8, 1.5 + R() * 1.5, 0, 0, TAU);
      f.fill();
    }
    f.restore();
    VEI.front = fc;

    // ---- red cells: lane, depth, phase, tumble
    VEI.cells = [];
    for (let i = 0; i < 96; i++) {
      const z = R();
      const size = 24 + 18 * z + R() * 4;
      const lane = (R() * 2 - 1) * (VRL - size * 0.7);
      const prof = 1 - 0.62 * (lane / VRL) ** 2;
      VEI.cells.push({
        z,
        size,
        lane,
        sp: VMAX * prof * (0.9 + 0.2 * R()),
        ph: R(),
        tu: R() * TAU,
        tw: 1.5 + R() * 2.5,
        rot: R() * TAU,
        rw: (R() - 0.5) * 1.6,
        wob: R() * 10,
      });
    }
    VEI.cells.sort((a, b) => a.z - b.z);
    // streak sprites
    const streak = (col) => {
      const c = mk(128, 32);
      const s = c.getContext("2d");
      const q = s.createLinearGradient(0, 0, 128, 0);
      q.addColorStop(0, rgba(col, 0));
      q.addColorStop(1, rgba(col, 0.75));
      s.fillStyle = q;
      s.beginPath();
      s.moveTo(0, 16);
      s.quadraticCurveTo(64, 4, 128, 2);
      s.lineTo(128, 30);
      s.quadraticCurveTo(64, 28, 0, 16);
      s.fill();
      return c;
    };
    VEI.streakRed = streak([255, 90, 110]);
    VEI.streakAqua = streak(P.med);
    VEI.streakWhite = streak([255, 255, 255]);
    VEI.med = [];
    for (let i = 0; i < 190; i++) VEI.med.push({ ph: R(), ln: R() - 0.5, sp: 0.8 + 0.25 * R(), r: 5 + R() * 9, tw: R() * 10 });
  }

  function drawRbc(ctx, c, u, v, t, shade) {
    const tu = Math.abs(Math.cos(c.tu + t * c.tw));
    const rx = c.size;
    const ry = c.size * Math.max(0.3, tu);
    const rot = c.rot + t * c.rw + 0.25 * Math.sin(t * 1.3 + c.wob);
    // motion streak (in the flow direction, not rotated with the cell)
    const L = c.sp * 0.075 * (0.6 + 0.4 * c.z);
    const pa = ctx.globalAlpha;
    ctx.globalAlpha = pa * (0.55 + 0.3 * c.z);
    ctx.drawImage(VEI.streakRed, u - L - rx * 0.4, v - ry * 0.9, L + rx * 0.4, ry * 1.8);
    ctx.globalAlpha = pa;
    ctx.save();
    ctx.translate(u, v);
    ctx.rotate(rot);
    const cs = Math.cos(-rot);
    const sn = Math.sin(-rot);
    // light from the upper left, expressed in the cell's rotated frame
    const lx = -0.6 * cs + 0.8 * sn;
    const ly = -0.6 * sn - 0.8 * cs;
    const base = mixc([255, 74, 94], C.plasma, shade);
    const sh = mixc(P.rbcShade, C.plasma, shade);
    const deep = mixc([206, 34, 74], C.plasmaDeep, shade);
    ctx.fillStyle = rgba(sh);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(base);
    ctx.beginPath();
    ctx.ellipse(lx * rx * 0.09, ly * ry * 0.1, rx * 0.9, ry * 0.86, 0, 0, TAU);
    ctx.fill();
    if (tu > 0.32) {
      // the dimple: a shaded hollow with its lit edge on the far side
      const k2 = sstep(0.32, 0.7, tu);
      ctx.fillStyle = rgba(mixc([255, 128, 132], C.plasma, shade), 0.75 * k2);
      ctx.beginPath();
      ctx.ellipse(-lx * rx * 0.07, -ly * ry * 0.07, rx * 0.56, ry * 0.54, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(deep, k2);
      ctx.beginPath();
      ctx.ellipse(lx * rx * 0.06, ly * ry * 0.06, rx * 0.46, ry * 0.43, 0, 0, TAU);
      ctx.fill();
    }
    // rim light + specular
    ctx.fillStyle = rgba(mixc([255, 190, 190], C.plasma, shade), 0.9);
    ctx.beginPath();
    ctx.ellipse(lx * rx * 0.62, ly * ry * 0.62, rx * 0.22, Math.max(1.2, ry * 0.12), Math.atan2(ly, lx) + Math.PI / 2, 0, TAU);
    ctx.fill();
    if (shade < 0.4) {
      ctx.fillStyle = "rgba(255,255,255," + (0.85 * (1 - shade * 2)) + ")";
      ctx.beginPath();
      ctx.ellipse(lx * rx * 0.55, ly * ry * 0.5, rx * 0.11, Math.max(1, ry * 0.07), Math.atan2(ly, lx) + Math.PI / 2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawVeinNeedle(ctx, t) {
    const [tu, tv] = veinTip();
    const hw = VNEED.hw;
    const sl = 1400;
    ctx.save();
    ctx.translate(tu, tv);
    ctx.rotate(VNEED.ang);
    const bev = hw * 4.6;
    // shaft: lit top (toward the key light), shaded bottom, highlight, cool reflected rim
    ctx.fillStyle = rgba(P.steelShade);
    ctx.beginPath();
    ctx.moveTo(-sl, -hw);
    ctx.lineTo(-bev, -hw);
    ctx.lineTo(0, hw * 0.85);
    ctx.lineTo(-sl, hw);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba(P.steel);
    ctx.beginPath();
    ctx.moveTo(-sl, -hw);
    ctx.lineTo(-bev, -hw);
    ctx.lineTo(-bev * 0.45, hw * 0.05);
    ctx.lineTo(-sl, hw * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillRect(-sl, -hw * 0.62, sl - bev * 0.95, hw * 0.24);
    ctx.fillStyle = rgba([180, 190, 255], 0.8);
    ctx.fillRect(-sl, hw * 0.62, sl - bev * 0.25, hw * 0.18);
    // bevel face with the dark lumen opening
    ctx.fillStyle = rgba(mixc(P.steel, [255, 255, 255], 0.3));
    ctx.beginPath();
    ctx.moveTo(-bev, -hw);
    ctx.lineTo(0, hw * 0.85);
    ctx.lineTo(-bev * 0.5, -hw * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rgba([40, 30, 90]);
    ctx.beginPath();
    ctx.ellipse(-bev * 0.5, -hw * 0.06, bev * 0.36, hw * 0.42, Math.atan2(hw * 1.85, bev), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  TS.vein = function (ctx, o = {}) {
    if (!ready) return;
    const t = o.t || 0;
    const k = Math.max(0, o.k || 0);
    const kk = clamp(k);
    ctx.save();
    applyCam(ctx, o);
    ctx.drawImage(VEI.bg, -MG, -MG);
    ctx.save();
    ctx.translate(VC[0], VC[1]);
    ctx.rotate(VANG);
    ctx.save();
    ctx.clip(VEI.lumen);
    // speed lines in the plasma
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 26; i++) {
      const L = 140 + hash(i, 41, 1) * 220;
      const v = (hash(i, 41, 2) * 2 - 1) * VRL * 0.9;
      const sp = VMAX * (1 - 0.6 * (v / VRL) ** 2) * 1.1;
      const u = ((((hash(i, 41, 3) * 3200 + t * sp) % 3200) + 3200) % 3200) - 1600;
      const pa = ctx.globalAlpha;
      ctx.globalAlpha = 0.12 + 0.1 * hash(i, 41, 4);
      ctx.drawImage(VEI.streakWhite, u - L, v - 2, L, 4);
      ctx.globalAlpha = pa;
    }
    ctx.globalCompositeOperation = "source-over";
    const LW = 3000;
    const cellPos = (c) => {
      const u = ((((c.ph * LW + t * c.sp) % LW) + LW) % LW) - LW / 2;
      const v = c.lane + 10 * Math.sin(t * 0.9 + c.wob) + 6 * Math.sin(u / 260 + c.wob);
      return [u, v];
    };
    // far half of the cells
    const nC = VEI.cells.length;
    for (let i = 0; i < nC * 0.55; i++) {
      const c = VEI.cells[i];
      const [u, v] = cellPos(c);
      if (u < -1300 || u > 1300) continue;
      drawRbc(ctx, c, u, v, t, 0.55 * (1 - c.z));
    }
    // valve: two cusps pointing downstream, fluttering in the stream
    for (const sd of [-1, 1]) {
      const fl = 12 * Math.sin(t * 6.3 + sd) + 6 * Math.sin(t * 11.1);
      const r0 = vRad(VALVE_U - 120) - VWALL;
      const p = new Path2D();
      p.moveTo(VALVE_U - 150, sd * r0);
      p.quadraticCurveTo(VALVE_U - 30, sd * (r0 - 40), VALVE_U + 90, sd * (78 + fl));
      p.quadraticCurveTo(VALVE_U + 40, sd * (r0 - 70 + fl * 0.5), VALVE_U - 70, sd * (r0 + 4));
      p.closePath();
      ctx.fillStyle = rgba(P.veinLight, 0.42);
      ctx.fill(p);
      ctx.save();
      ctx.clip(p);
      ctx.fillStyle = rgba([200, 210, 255], 0.35);
      ctx.translate(-14, -sd * 16);
      ctx.fill(p);
      ctx.restore();
      ctx.strokeStyle = rgba([220, 228, 255], 0.9);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(VALVE_U - 150, sd * r0);
      ctx.quadraticCurveTo(VALVE_U - 30, sd * (r0 - 40), VALVE_U + 90, sd * (78 + fl));
      ctx.stroke();
    }
    // near half of the cells (pass in front of the needle and the jet)
    for (let i = Math.ceil(nC * 0.55); i < nC; i++) {
      const c = VEI.cells[i];
      const [u, v] = cellPos(c);
      if (u < -1300 || u > 1300) continue;
      drawRbc(ctx, c, u, v, t, 0);
    }
    ctx.restore(); // lumen clip
    ctx.restore(); // vein frame
    // front wall over everything inside
    ctx.drawImage(VEI.front, -MG, -MG);
    ctx.save();
    ctx.translate(VC[0], VC[1]);
    ctx.rotate(VANG);
    // the needle (it sits just under the near wall where it enters), lightly filmed inside the lumen
    drawVeinNeedle(ctx, t);
    // the wall stays in front of the shaft where it pierces it (translucent), dimpled inward
    {
      const pu = VNEED.pierceU;
      const bandP = new Path2D();
      for (let u = pu - 110; u <= pu + 150; u += 10) bandP.lineTo(u, -vRad(u));
      for (let u = pu + 150; u >= pu - 110; u -= 10) bandP.lineTo(u, -vRad(u) + VWALL + 2);
      bandP.closePath();
      const fadeX = ctx.createLinearGradient(pu - 110, 0, pu + 150, 0);
      fadeX.addColorStop(0, rgba(P.vein, 0));
      fadeX.addColorStop(0.3, rgba(P.vein, 0.78));
      fadeX.addColorStop(0.7, rgba(P.vein, 0.78));
      fadeX.addColorStop(1, rgba(P.vein, 0));
      ctx.fillStyle = fadeX;
      ctx.fill(bandP);
      const wy = -vRad(pu) + VWALL;
      ctx.fillStyle = rgba(P.vein, 0.7);
      ctx.beginPath();
      ctx.ellipse(pu + 48, wy + 4, 70, 9, VNEED.ang * 0.3, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = rgba(P.veinLight, 0.9);
      ctx.beginPath();
      ctx.ellipse(pu + 48, wy + 8, 54, 3, VNEED.ang * 0.3, 0, Math.PI);
      ctx.fill();
    }
    ctx.save();
    ctx.clip(VEI.lumen);
    // medicine: jet from the bevel, then particles racing downstream with the blood
    const [tu, tv] = veinTip();
    const on = sstep(0, 0.06, k);
    if (on > 0) {
      const Lj = Math.min(900, 120 + 2600 * kk) * on;
      // ribbon
      const left = [];
      const right = [];
      for (let d = 0; d <= Lj; d += 12) {
        const [x, y] = jetAt(d);
        const r = (10 + d * 0.07) * (1 + 0.18 * Math.sin(d / 26 - t * 22));
        left.push([x, y - r]);
        right.push([x, y + r]);
      }
      if (left.length > 1) {
        const rib = polyPath(left.concat(right.reverse()));
        const fadeG = ctx.createLinearGradient(tu, 0, tu + Lj, 0);
        fadeG.addColorStop(0, rgba(P.med, 0.95));
        fadeG.addColorStop(0.6, rgba(P.med, 0.6));
        fadeG.addColorStop(1, rgba(P.med, 0));
        ctx.fillStyle = fadeG;
        ctx.fill(rib);
        ctx.globalCompositeOperation = "lighter";
        const coreG = ctx.createLinearGradient(tu, 0, tu + Lj * 0.7, 0);
        coreG.addColorStop(0, rgba(P.medGlow, 0.9));
        coreG.addColorStop(1, rgba(P.medGlow, 0));
        ctx.strokeStyle = coreG;
        ctx.lineCap = "round";
        ctx.lineWidth = 7;
        ctx.beginPath();
        for (let d = 0; d <= Lj * 0.8; d += 12) {
          const [x, y] = jetAt(d);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        // bright dashes racing along the jet
        for (let i = 0; i < 9; i++) {
          const d = ((i * 97 + t * 1300) % 900);
          if (d > Lj) continue;
          const [x, y] = jetAt(d);
          const pa = ctx.globalAlpha;
          ctx.globalAlpha = 0.8 * (1 - d / 900);
          ctx.drawImage(VEI.streakWhite, x - 70, y - 3, 70, 6);
          ctx.globalAlpha = pa;
        }
        ctx.globalCompositeOperation = "source-over";
      }
    }
    // medicine particles carried by the stream (front races ~2000 px per unit of k; keeps flowing after k = 1)
    if (k > 0) {
      ctx.globalCompositeOperation = "lighter";
      const reach = k * 2200 + 40;
      const LP = 2400;
      for (let i = 0; i < VEI.med.length; i++) {
        const m = VEI.med[i];
        const sp = VMAX * m.sp;
        const d = (((m.ph * LP + t * sp) % LP) + LP) % LP;
        if (d > reach) continue;
        const [x, yc] = jetAt(d);
        if (x > 1350) continue;
        const spread = 20 + d * 0.16;
        const y = clamp(yc + m.ln * 2 * spread, -VRL + 14, VRL - 14);
        const a = sstep(reach, reach - 220, d) * (0.95 - 0.35 * Math.min(1, d / 1600)) * sstep(0, 30, d);
        const L = sp * 0.07;
        const pa = ctx.globalAlpha;
        ctx.globalAlpha = a * 0.8;
        ctx.drawImage(VEI.streakAqua, x - L, y - m.r * 0.6, L, m.r * 1.2);
        ctx.globalAlpha = pa;
        spr(ctx, SPR.medDot, x, y, m.r * (0.9 + 0.2 * Math.sin(t * 5 + m.tw)), a);
      }
      // bloom at the bevel
      spr(ctx, SPR.medGlow, tu + 10, tv + 6, 120 + 14 * Math.sin(t * 7), 0.75 * on);
      spr(ctx, SPR.flareAqua, tu - 6, tv - 4, 46 + 8 * Math.sin(t * 5), 0.7 * on);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore(); // lumen clip
    ctx.restore(); // vein frame
    // ambient sparkle in the surrounding tissue
    ctx.globalCompositeOperation = "lighter";
    driftField(ctx, t, { n: 40, seed: 51, box: [-MG, -MG, W + MG, H + MG], img: SPR.lavDot, rMin: 1.5, rMax: 4, a: 0.45, vx: 14, vy: -3, wander: 20 });
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  TS.veinAnchors = function (o = {}) {
    const [tu, tv] = veinTip();
    const [su, sv] = jetAt(560);
    return { stream: toScreen(o, vToW(su, sv - 40)), tip: toScreen(o, vToW(tu, tv)) };
  };

})();

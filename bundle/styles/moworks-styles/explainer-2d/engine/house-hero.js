/* house-hero.js: the house character, a kid in a red hoodie, jeans and white sneakers.
 * Classic script; loads after ex/ex-core.js, ex/house-pal.js and story/film-pal.js; attaches to
 * window.HOUSE.hero. Colours come from HOUSE.pal (hoodie, jeans, shoes, skin, hair …) and the
 * light from HOUSE.light, so a film can re-colour the character in story/film-pal.js.
 *
 *   await HOUSE.hero.init()
 *   HOUSE.hero.draw(ctx, {
 *     t,                 seconds: breathing (0.25 Hz, ~0.6 %), seeded blinks (every 2.5-5 s,
 *                        0.12 s long), a small head roll and nod, hair-tip and drawstring sway
 *     x, y,              feet centre on screen (px)
 *     h,                 full standing height in px (60 in wide shots ... 3000+ in close-ups;
 *                        close-ups simply put the feet below the frame)
 *     view,              'front' | 'back' | 'profile'   (profile faces LEFT)
 *     look = [0, 0],     eye direction -1..1, screen space (ly < 0 looks up)
 *     headUp = 0,        0..1 head tilts up toward the sky
 *     headTurn = 0,      -1..1 front: slight 3/4 turn (+ = toward screen right);
 *                        back: a sliver of cheek, ear and nose tip shows on that side
 *     worry = 0,         0..1 brows tilt up in the middle, mouth bends down and opens a little
 *     mouth = 0,         -1..1 frown .. smile (combines with worry)
 *     flash = 0,         0..1 a bright flash: colours lift, the lit side gets a white-lavender rim
 *     flashSide = -1,    side the flash comes from (-1 left, +1 right)
 *     rimSide = -1,      side of the magenta horizon glow (warm pink rim on that side)
 *     wet = 0,           0..1 rain: droplets beading on hood, shoulders and hair, wet sheen streaks,
 *                        a few beads sliding down the sleeves
 *     alpha = 1, seed = 0,
 *     blink,             optional 0..1 eyelid override (default: seeded blinks from t)
 *     breathe = 1,       optional breathing amplitude multiplier
 *     wind = 1,          optional sway amplitude multiplier
 *   })
 *   HOUSE.hero.anchors(opts) -> { head, headR, eye, eyeL, eyeR, brain, neck, chest,
 *                                 shoulderL, shoulderR, handL, handR, top, feet }   (screen px)
 *     Pass the same opts as draw. eye is the eye nearest the camera (front: the one on the turn
 *     side; profile: the visible one; back: where the hidden eye is). shoulderL/R and handL/R are
 *     screen-left/right. Use the anchors to place labels and props, never fixed px.
 *   HOUSE.hero.blink(t, seed) -> 0..1 eyelid closure used by draw (handy to time a blink).
 *
 * Built only from flat fills: every form gets a lit fill, one hard-edged cel shadow (key light
 * from HOUSE.light.key, shadow hue-shifted toward magenta), translucent deep-fold tones, a warm
 * pink rim on the horizon side and a cool lavender rim on top. No outlines. Levels of detail by
 * size (h < 90: silhouette, < 300: medium, >= 300: full, >= 800: micro detail such as ribbing,
 * stitching and droplet speculars). Pure function of its options, no state between calls.
 * Cost: a few ms per draw; anything off the canvas is skipped.
 */
(function () {
  const HOUSE = (window.HOUSE = window.HOUSE || {});
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const N1 = (x, s) => EX.noise1(x, s);

  // ---------------------------------------------------------------- affine 2D
  // matrices in canvas order [a b c d e f]: (x, y) -> (a x + c y + e, b x + d y + f)
  const mmul = (m, n) => [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
  const mT = (x, y) => [1, 0, 0, 1, x, y];
  const mS = (x, y = x) => [x, 0, 0, y, 0, 0];
  const mR = (a) => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [c, s, -s, c, 0, 0];
  };
  const mAp = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const useM = (ctx, m) => ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);

  // ---------------------------------------------------------------- path helpers
  // Closed Catmull-Rom spline through points [x, y, sharp?]; sharp points get zero tangents.
  const K = 1 / 6;
  function spl(ctx, p, dx, dy) {
    const n = p.length;
    ctx.moveTo(p[0][0] + dx, p[0][1] + dy);
    for (let i = 0; i < n; i++) {
      const a = p[(i + n - 1) % n];
      const b = p[i];
      const c = p[(i + 1) % n];
      const d = p[(i + 2) % n];
      const kb = b[2] ? 0 : K;
      const kc = c[2] ? 0 : K;
      ctx.bezierCurveTo(
        b[0] + (c[0] - a[0]) * kb + dx,
        b[1] + (c[1] - a[1]) * kb + dy,
        c[0] - (d[0] - b[0]) * kc + dx,
        c[1] - (d[1] - b[1]) * kc + dy,
        c[0] + dx,
        c[1] + dy,
      );
    }
    ctx.closePath();
  }
  const S = (p) => (ctx, dx = 0, dy = 0) => spl(ctx, p, dx, dy);
  const E = (x, y, rx, ry, rot = 0) => (ctx, dx = 0, dy = 0) => {
    ctx.moveTo(x + dx + rx * Math.cos(rot), y + dy + rx * Math.sin(rot));
    ctx.ellipse(x + dx, y + dy, rx, ry, rot, 0, TAU);
    ctx.closePath();
  };
  const mirror = (p) => p.map((q) => [-q[0], q[1], q[2]]);
  const shift = (p, dx, dy) => p.map((q) => [q[0] + dx, q[1] + dy, q[2]]);

  // A crescent / lens from A to B: centre line bows by bend/2, thickness w (normal = A->B turned +90deg)
  function lens(ctx, ax, ay, bx, by, bend, w) {
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    let nx = -(by - ay);
    let ny = bx - ax;
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(mx + nx * (bend + w), my + ny * (bend + w), bx, by);
    ctx.quadraticCurveTo(mx + nx * (bend - w), my + ny * (bend - w), ax, ay);
    ctx.closePath();
  }
  function fLens(ctx, col, ax, ay, bx, by, bend, w) {
    ctx.beginPath();
    lens(ctx, ax, ay, bx, by, bend, w);
    ctx.fillStyle = col;
    ctx.fill();
  }
  function fEll(ctx, col, x, y, rx, ry, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.001, rx), Math.max(0.001, ry), rot, 0, TAU);
    ctx.fillStyle = col;
    ctx.fill();
  }
  // rounded polygon (arcTo at every corner)
  function rpoly(ctx, pts, r, dx = 0, dy = 0) {
    const n = pts.length;
    const P = (i) => pts[(i + n) % n];
    ctx.moveTo((P(0)[0] + P(-1)[0]) / 2 + dx, (P(0)[1] + P(-1)[1]) / 2 + dy);
    for (let i = 0; i < n; i++) {
      const a = P(i);
      const b = P(i + 1);
      ctx.arcTo(a[0] + dx, a[1] + dy, (a[0] + b[0]) / 2 + dx, (a[1] + b[1]) / 2 + dy, a[2] != null ? a[2] : r);
    }
    ctx.closePath();
  }
  const RP = (pts, r) => (ctx, dx = 0, dy = 0) => rpoly(ctx, pts, r, dx, dy);
  // quadratic point
  const q2 = (a, c, b, t) => [
    (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
    (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
  ];

  // ---------------------------------------------------------------- colours
  const H = (c) => (Array.isArray(c) ? c : EX.hex(c));
  const css = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const WHITE = [255, 255, 255];
  const matCache = new Map();
  function mats(flash) {
    const q = Math.round(clamp(flash) * 32);
    let C = matCache.get(q);
    if (C) return C;
    const f = q / 32;
    const p = HOUSE.pal;
    const F = H(p.flash);
    const cool = EX.mix(H(HOUSE.light.cool), WHITE, 0.3);
    const warm = H(HOUSE.light.rim);
    const lit = (c, k = 0.2) => EX.mix(H(c), F, k * f);
    const mix = (a, b, k) => EX.mix(H(a), H(b), k);
    const FR = EX.mix(F, H(p.boltRim), 0.18);
    function mat(base, sh, deep, lt, rimFrom, rimK, topFrom, topK) {
      const B = lit(base);
      const Sh = lit(sh, 0.06);
      const D = lit(deep, 0.03);
      const Lt = lit(lt);
      const Rm = lit(mix(rimFrom, warm, rimK), 0.6);
      const Tp = lit(mix(topFrom, cool, topK), 0.5);
      // flash: a broad flash-lit band (base pushed toward lavender-white) and a thin white rim
      const FA = EX.mix(H(base), EX.mix(H(lt), F, 0.55), 0.85 * f);
      const FB = EX.mix(H(base), FR, Math.min(1, f * 1.4));
      return {
        base: css(B), sh: css(Sh), deep: css(D), lt: css(Lt), rim: css(Rm), top: css(Tp),
        flA: css(FA), flB: css(FB),
        B, Sh, D, Lt,
        dA: (a) => rgba(D, a),
        sA: (a) => rgba(Sh, a),
        lA: (a) => rgba(Lt, a),
      };
    }
    const hood = mat(p.hoodie, p.hoodieShade, p.hoodieDeep, p.hoodieLight, p.hoodieLight, 0.5, p.hoodieLight, 0.42);
    const ribBase = mix(p.hoodie, p.hoodieShade, 0.42);
    const rib = mat(ribBase, mix(p.hoodieShade, p.hoodieDeep, 0.35), p.hoodieDeep, p.hoodie, p.hoodieLight, 0.5, p.hoodie, 0.4);
    const lining = mat(p.hoodieDeep, mix(p.hoodieDeep, p.eye, 0.35), mix(p.hoodieDeep, p.eye, 0.6), p.hoodieShade, p.hoodieShade, 0.5, p.hoodieShade, 0.4);
    const skin = mat(p.skin, p.skinShade, p.skinDeep, mix(p.skin, WHITE, 0.2), p.skin, 0.55, p.skin, 0.4);
    const hair = mat(p.hair, mix(p.hair, p.eye, 0.6), p.eye, p.hairSheen, p.hairSheen, 0.5, p.hairSheen, 0.5);
    const jeans = mat(p.jeans, p.jeansShade, mix(p.jeansShade, p.eye, 0.38), mix(p.jeans, cool, 0.32), p.jeans, 0.5, p.jeans, 0.45);
    const shoe = mat(p.shoes, p.shoesShade, mix(p.shoesShade, p.soles, 0.35), WHITE, p.shoes, 0.3, p.shoes, 0.25);
    const sole = mat(p.soles, mix(p.soles, p.eye, 0.5), p.eye, mix(p.soles, cool, 0.35), p.soles, 0.55, p.soles, 0.5);
    const patch = mat(p.strings, mix(p.strings, p.shoesShade, 0.75), mix(p.shoesShade, p.hoodieShade, 0.3), WHITE, p.strings, 0.3, p.strings, 0.2);
    C = {
      f,
      hood, rib, lining, skin, hair, jeans, shoe, sole, patch,
      string: css(lit(p.strings)),
      stringSh: css(lit(mix(p.strings, p.shoesShade, 0.8), 0.2)),
      aglet: css(lit(mix(p.shoesShade, p.rainFar, 0.5), 0.3)),
      agletHi: css(lit(mix(p.shoes, WHITE, 0.5))),
      brow: css(lit(mix(p.hair, p.eye, 0.3), 0.1)),
      eye: css(lit(p.eye, 0.05)),
      eyeHi: "#ffffff",
      mouth: css(lit(p.mouth, 0.15)),
      tongue: css(lit(mix(p.mouth, p.hoodieLight, 0.5), 0.2)),
      teeth: css(lit(mix(p.shoes, WHITE, 0.6))),
      blush: rgba(H(p.hoodie), 0.2),
      noseHi: css(lit(mix(p.skin, WHITE, 0.22))),
      dropBody: css(lit(mix(p.hoodie, cool, 0.42))),
      dropCaustic: css(lit(mix(p.hoodieLight, WHITE, 0.5))),
      dropShadow: rgba(H(p.hoodieDeep), 0.55),
      hairDrop: css(mix(cool, WHITE, 0.55)),
      hairDropA: rgba(mix(cool, WHITE, 0.4), 0.9),
      skinDrop: css(lit(mix(p.skin, cool, 0.45))),
      sheen: rgba(mix(p.hoodieLight, WHITE, 0.25), 0.55),
      flash: css(EX.mix(F, H(p.boltRim), 0.22)),
    };
    matCache.set(q, C);
    return C;
  }

  // ---------------------------------------------------------------- shading core
  // cres: inside the current clip (the part), fill part \ (part shifted by d): the band on the
  // side opposite to d. Needs single-contour shapes (they are built that way).
  function cres(ctx, Sh, dx, dy, col) {
    ctx.beginPath();
    ctx.rect(-600, -600, 1200, 1200);
    Sh(ctx, dx, dy);
    ctx.fillStyle = col;
    ctx.fill("evenodd");
  }
  /* part(): lit fill, cel shadow crescent away from the key light, art-directed extras, then
   * cool top rim, warm horizon rim and the flash rim.
   * o: { ds | sd:[dx,dy], rim, top, fl (booleans, default true), rk (rim width k), extra(ctx), base } */
  function part(ctx, R, Sh, m, o = {}) {
    ctx.beginPath();
    Sh(ctx, 0, 0);
    ctx.fillStyle = o.base || m.base;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const ds = o.ds == null ? 2 : o.ds;
    const sd = o.sd || [R.L[0] * ds, R.L[1] * ds];
    if (ds !== 0) cres(ctx, Sh, sd[0], sd[1], o.shc || m.sh);
    if (o.extra && R.lod >= 1) o.extra(ctx);
    if (R.lod >= 1 || o.rimAlways) {
      const rw = R.rw * (o.rk || 1);
      if (o.top !== false) cres(ctx, Sh, 0, rw * 0.8, m.top);
      if (o.rim !== false) cres(ctx, Sh, -R.rimSide * rw, rw * 0.2, m.rim);
    }
    if (R.flash > 0.02 && o.fl !== false) {
      // the flash lights a broad side of each form (hard cel edge), with a thin hot rim on it
      const dsz = o.sd ? Math.hypot(sd[0], sd[1]) : ds;
      const fa = Math.max(dsz, 0.8) * (0.55 + 0.35 * R.flash);
      cres(ctx, Sh, -R.FD[0] * fa, -R.FD[1] * fa, m.flA);
      const fb = R.rw * (0.6 + 0.7 * R.flash) * (o.rk || 1);
      cres(ctx, Sh, -R.FD[0] * fb, -R.FD[1] * fb, m.flB);
    }
    ctx.restore();
  }

  // a water bead sitting on fabric (r in units)
  function drop(ctx, R, x, y, r, a = 1) {
    const C = R.C;
    if (r * R.s < 1.6) {
      fEll(ctx, C.dropCaustic, x, y, r * 0.9, r * 0.9);
      return;
    }
    ctx.globalAlpha *= a;
    fEll(ctx, C.dropShadow, x + r * 0.22, y + r * 0.32, r, r * 0.92);
    fEll(ctx, C.dropBody, x, y, r, r * 0.94);
    fLens(ctx, C.dropCaustic, x - r * 0.75, y + r * 0.35, x + r * 0.8, y + r * 0.1, r * 0.75, r * 0.38);
    fEll(ctx, C.eyeHi, x - r * 0.36, y - r * 0.38, r * 0.3, r * 0.26);
    ctx.globalAlpha /= a;
  }

  // ---------------------------------------------------------------- timing helpers
  const lid = (u) => {
    if (u <= 0 || u >= 0.125) return 0;
    return u < 0.05 ? sstep(0, 0.05, u) : 1 - sstep(0.05, 0.125, u);
  };
  /** eyelid closure 0..1 at time t: blinks every 2.5-5 s (seeded), some doubled */
  function blinkAt(t, seed = 0) {
    const P = 3.75;
    const k0 = Math.floor(t / P);
    let v = 0;
    for (let k = k0 - 1; k <= k0 + 1; k++) {
      const T = (k + 0.5) * P + (EX.hash(k, seed, 5) - 0.5) * 1.25;
      v = Math.max(v, lid(t - T));
      if (EX.hash(k, seed, 9) < 0.2) v = Math.max(v, lid(t - T - 0.26));
    }
    return v;
  }

  // ---------------------------------------------------------------- rig
  const HIP = -43; // breathing pivot line (units; feet at 0, top of hair at about -102)
  const NECK = -78.6; // head pivot
  const HEADY = -86.8; // head centre
  const UNITS = 102.2; // units in the full standing height (h)
  const KEY = (() => {
    const k = (HOUSE.light && HOUSE.light.key) || [-0.6, -0.8];
    const l = Math.hypot(k[0], k[1]) || 1;
    return [k[0] / l, k[1] / l];
  })();

  function rig(o) {
    const t = o.t || 0;
    const seed = (o.seed || 0) | 0;
    const h = Math.max(4, o.h || 300);
    const s = h / UNITS;
    const view = o.view === "back" || o.view === "profile" ? o.view : "front";
    const breathe = o.breathe == null ? 1 : o.breathe;
    const wind = o.wind == null ? 1 : o.wind;
    const b = Math.sin(TAU * 0.25 * t + EX.hash(seed, 3) * TAU) * breathe;
    const W = mmul(mT(o.x || 0, o.y || 0), mS(s));
    const sy = 1 + 0.006 * b;
    const sx = 1 + 0.0035 * b;
    const Bm = [sx, 0, 0, sy, 0, HIP - HIP * sy];
    const B = mmul(W, Bm);
    const up = clamp(o.headUp || 0);
    const turn = clamp(o.headTurn || 0, -1, 1);
    // idle life: tiny head roll and nod (pure functions of t)
    const roll = N1(t * 0.19 + 3.7, seed + 41) * 0.02 + N1(t * 0.07, seed + 43) * 0.012;
    const nod = N1(t * 0.27 + 1.3, seed + 47) * 0.14;
    let Hl;
    if (view === "profile") {
      const px = 1.2;
      const py = NECK + 0.6;
      Hl = mmul(mT(px, py), mmul(mR(up * 0.34 + roll), mT(-px, HEADY - py + nod)));
    } else if (view === "back") {
      Hl = mmul(mT(0, NECK), mmul(mR(roll), mT(turn * 0.2, HEADY - NECK + up * 1.5 + nod)));
    } else {
      Hl = mmul(mT(0, NECK), mmul(mR(roll + turn * 0.03), mT(turn * 0.3, HEADY - NECK - up * 0.9 + nod)));
    }
    const look = o.look || [0, 0];
    const lx = clamp((look[0] || 0) + N1(t * 0.45 + 9, seed + 51) * 0.07, -1.2, 1.2);
    const ly = clamp((look[1] || 0) + N1(t * 0.4 + 4, seed + 53) * 0.05, -1.2, 1.2);
    const lod = s < 0.9 ? 0 : s < 3 ? 1 : s < 8 ? 2 : 3;
    const flash = clamp(o.flash || 0);
    const fs = o.flashSide == null ? -1 : Math.sign(o.flashSide) || -1;
    const fd = [fs * 0.78, -0.62];
    return {
      t, seed, s, h, view, b, W, B, Bm, Hl, H: mmul(B, Hl),
      up, turn, theta: turn * 0.42, lx, ly,
      worry: clamp(o.worry || 0),
      mouth: clamp(o.mouth || 0, -1, 1),
      blink: o.blink == null ? blinkAt(t, seed) : clamp(o.blink),
      flash, FD: fd,
      rimSide: o.rimSide == null ? -1 : Math.sign(o.rimSide) || -1,
      wet: o.wet == null ? 0 : clamp(o.wet),
      wind,
      lod,
      L: KEY,
      rw: clamp(1.9 / Math.sqrt(s), 0.3, 1.3),
      C: mats(flash),
    };
  }

  // ---------------------------------------------------------------- shared garments
  // torso contour (front and back share it), units
  const TORSO = [
    [-4.8, -74.4], [-9.6, -73.1], [-13.4, -70.9], [-15.1, -67.2], [-14.7, -58], [-13.7, -48],
    [-13.0, -43.3], [-12.0, -41.1], [0, -40.6], [12.0, -41.1], [13.0, -43.3], [13.7, -48],
    [14.7, -58], [15.1, -67.2], [13.4, -70.9], [9.6, -73.1], [4.8, -74.4], [0, -72.6],
  ];
  const SLEEVE_L = [
    [-12.0, -72.0], [-15.4, -71.3], [-17.7, -68.2], [-18.5, -62.0], [-18.7, -55.6], [-18.6, -50.0],
    [-18.3, -47.6], [-17.6, -46.2, 1], [-17.45, -43.0], [-15.85, -42.3], [-14.25, -42.9], [-14.1, -46.2, 1],
    [-13.5, -47.8], [-13.6, -52.0], [-13.6, -56.5], [-13.2, -61.5], [-12.4, -66.5],
  ];
  const SLEEVE_R = mirror(SLEEVE_L);
  const LEG_L = [
    [-11.6, -46, 1], [-0.25, -46, 1], [-0.45, -38.6], [-1.15, -24], [-1.45, -11], [-1.6, -5.0, 1],
    [-8.4, -5.0, 1], [-8.45, -12], [-8.95, -24], [-10.3, -36],
  ];
  const LEG_R = mirror(LEG_L);

  function ribs(ctx, R, col, x0, x1, y0, y1, step, w) {
    if (R.lod < 3) return;
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += step) ctx.rect(x - w / 2, y0, w, y1 - y0);
    ctx.fill();
  }
  function stitch(ctx, R, col, pts, dash, w) {
    if (R.lod < 3) return;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.setLineDash([dash, dash * 0.9]);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.restore();
  }

  function legs(ctx, R, back) {
    const C = R.C;
    const J = C.jeans;
    // shoes first, jeans hems overlap their tops
    for (const side of [-1, 1]) shoe(ctx, R, side, back);
    for (const side of [-1, 1]) {
      const P = side < 0 ? LEG_L : LEG_R;
      const cx = side * 4.9;
      part(ctx, R, S(P), J, {
        sd: [-1.9, -0.5],
        rim: side === R.rimSide,
        top: false,
        rk: 0.9,
        extra: (c) => {
          // knee creases
          fLens(c, J.dA(0.45), cx - 2.6, -25.6, cx + 1.4, -24.6, 0.6, 0.38);
          fLens(c, J.dA(0.35), cx - 1.8, -22.8, cx + 1.0, -22.3, 0.5, 0.28);
          // ankle stacking
          fLens(c, J.dA(0.5), cx - 3.0, -9.4, cx + 1.2, -8.6, 0.9, 0.42);
          fLens(c, J.dA(0.4), cx - 2.0, -7.1, cx + 2.6, -7.4, 0.7, 0.36);
          // hem band
          c.fillStyle = J.dA(0.35);
          c.fillRect(cx - 5, -6.3, 10, 1.3);
          if (!back) {
            // faded thigh (whiskers / wear)
            fLens(c, J.lA(0.55), cx - side * 1.6 - 0.8, -39.5, cx - side * 1.2 + 0.4, -30.5, -side * 0.6, 0.9);
            fLens(c, J.lA(0.35), cx - 2.2, -36.5, cx + 1.4, -35.4, -0.4, 0.22);
            fLens(c, J.lA(0.3), cx - 2.0, -34.6, cx + 1.2, -33.7, -0.4, 0.18);
          } else {
            // back pockets peeking under the hoodie hem
            c.beginPath();
            rpoly(c, [[cx - 3.4, -46], [cx + 3.4, -46], [cx + 3.1, -37.6], [cx, -36.6], [cx - 3.1, -37.6]], 0.8);
            c.fillStyle = J.sA(0.55);
            c.fill();
            stitch(c, R, J.lA(0.45), [[cx - 2.7, -46], [cx - 2.5, -38.2], [cx, -37.3], [cx + 2.5, -38.2], [cx + 2.7, -46]], 0.35, 0.12);
            // creases behind the knee
            fLens(c, J.dA(0.4), cx - 2.4, -27.6, cx + 2.2, -27.4, 0.5, 0.3);
          }
          // outer seam
          stitch(c, R, J.lA(0.4), [[cx + side * 5.5, -45], [cx + side * 4.0, -24], [cx + side * 3.1, -5]], 0.4, 0.14);
        },
      });
    }
  }

  function shoe(ctx, R, side, back) {
    const C = R.C;
    const cx = side * 5.1;
    const out = side * 0.6; // toes point slightly outward
    const up = [
      [cx - 4.0 + out * 0.4, -1.5], [cx - 3.9 + out * 0.2, -4.2], [cx - 2.5, -6.2], [cx, -6.8], [cx + 2.5, -6.2],
      [cx + 3.9 + out * 0.2, -4.2], [cx + 4.0 + out * 0.4, -1.5],
    ];
    part(ctx, R, S(up), C.shoe, {
      sd: [-1.5, -0.7],
      rim: side === R.rimSide,
      rk: 0.8,
      extra: (c) => {
        if (!back) {
          // toe box (the rounded front facing camera), tongue and laces
          fEll(c, C.shoe.sA(0.55), cx + out * 1.1, -2.05, 3.35, 1.55);
          fEll(c, C.shoe.base, cx + out * 1.1 - 0.3, -2.35, 3.0, 1.25);
          fEll(c, C.shoe.lt, cx + out - 1.2, -2.7, 1.1, 0.42, -0.1);
          if (R.lod >= 1) {
            fEll(c, C.shoe.sA(0.45), cx + out * 0.5, -4.9, 1.7, 1.1);
            c.fillStyle = C.shoe.sA(0.95);
            for (let i = 0; i < 3; i++) c.fillRect(cx + out * 0.5 - 1.25 + i * 0.1, -5.7 + i * 0.62, 2.5 - i * 0.2, 0.34);
          }
        } else {
          // heel counter and a red heel tab
          fLens(c, C.shoe.sA(0.6), cx - 3.0, -2.9, cx + 3.0, -2.9, 1.1, 0.6);
          c.beginPath();
          rpoly(c, [[cx - 0.7, -7.0], [cx + 0.7, -7.0], [cx + 0.65, -4.2], [cx - 0.65, -4.2]], 0.32);
          c.fillStyle = C.hood.base;
          c.fill();
        }
      },
    });
    const ox = out * 0.4;
    const so = [[cx - 4.5 + ox, -2.0], [cx + 4.5 + ox, -2.0], [cx + 4.5 + ox, 0.05], [cx - 4.5 + ox, 0.05]];
    part(ctx, R, RP(so, 0.9), C.sole, {
      sd: [-0.9, 0],
      rim: side === R.rimSide,
      rk: 0.6,
      extra: (c) => {
        // a light foxing stripe on the sole edge
        c.fillStyle = C.shoe.sA(0.55);
        c.fillRect(cx - 5 + ox, -2.0, 10, 0.55);
      },
    });
  }

  function hand(ctx, R, side, back) {
    const C = R.C;
    const x = (v) => side * v;
    // relaxed hand, palm toward the body; from the front the thumb sits on the inner side
    const P = [
      [x(-17.5), -43.4], [x(-18.0), -41.0], [x(-17.8), -38.6], [x(-16.8), -37.0], [x(-15.3), -36.8],
      [x(-14.2), -37.8], [x(-13.9), -39.6], [x(-14.1), -41.4], [x(-14.25), -43.4],
    ];
    part(ctx, R, S(P), C.skin, {
      sd: [-1.1, -0.9],
      rim: side === R.rimSide,
      top: false,
      rk: 0.7,
      extra: (c) => {
        if (!back) {
          // thumb along the inner side, finger tips curled under
          fLens(c, C.skin.dA(0.5), x(-14.75), -42.8, x(-14.95), -39.0, side * 0.5, 0.3);
          fLens(c, C.skin.lA(0.55), x(-14.35), -42.4, x(-14.2), -39.6, -side * 0.2, 0.34);
          if (R.lod >= 2) {
            fLens(c, C.skin.dA(0.35), x(-17.4), -38.9, x(-16.4), -38.3, -side * 0.2, 0.16);
            fLens(c, C.skin.dA(0.35), x(-16.3), -38.1, x(-15.3), -37.7, -side * 0.2, 0.16);
          }
        } else {
          fLens(c, C.skin.dA(0.35), x(-17.4), -40.6, x(-14.6), -40.9, 0.4, 0.22);
          fLens(c, C.skin.dA(0.25), x(-17.0), -39.0, x(-14.8), -39.2, 0.3, 0.16);
        }
      },
    });
  }

  function sleeve(ctx, R, side, back) {
    const C = R.C;
    const M = C.hood;
    const P = side < 0 ? SLEEVE_L : SLEEVE_R;
    const x = (v) => side * v; // mirror helper (shapes authored for the left sleeve)
    // idle sway about the shoulder: breathing plus a slow wind drift
    const a = side * (0.004 * R.b) + N1(R.t * 0.31 + side * 2.3, R.seed + 81) * 0.012 * R.wind;
    ctx.save();
    ctx.translate(x(-14.2), -69.5);
    ctx.rotate(a);
    ctx.translate(-x(-14.2), 69.5);
    part(ctx, R, S(P), M, {
      sd: [-1.8, -0.9],
      rim: side === R.rimSide,
      extra: (c) => {
        // dropped-shoulder seam
        if (R.lod >= 2) fLens(c, M.dA(0.28), x(-12.6), -71.4, x(-14.4), -62.5, side * 0.6, 0.16);
        // long drape fold from the shoulder and elbow creases
        fLens(c, M.dA(0.32), x(-15.2), -64.5, x(-16.0), -56.5, side * 0.5, 0.5);
        fLens(c, M.dA(0.45), x(-18.2), -55.8, x(-15.4), -54.2, side * 0.6, 0.42);
        fLens(c, M.dA(0.38), x(-18.4), -52.6, x(-15.8), -51.6, side * 0.5, 0.34);
        fLens(c, M.dA(0.3), x(-14.0), -57.5, x(-15.2), -53.0, -side * 0.4, 0.26);
        // ribbed cuff, with the sleeve bunching over it
        c.beginPath();
        c.rect(x(-19), -46.3, side * 6, 5);
        c.fillStyle = C.rib.base;
        c.fill();
        ribs(c, R, C.rib.dA(0.28), Math.min(x(-18.0), x(-13.9)), Math.max(x(-18.0), x(-13.9)), -46.3, -42, 0.55, 0.18);
        fLens(c, C.rib.dA(0.4), x(-17.8), -43.0, x(-14.0), -43.0, 0.5, 0.35);
        fLens(c, M.sA(0.95), x(-18.6), -47.0, x(-13.4), -47.0, 0.2, 0.75);
        fLens(c, M.dA(0.4), x(-18.4), -46.6, x(-13.6), -46.6, 0.5, 0.26);
        fLens(c, M.dA(0.35), x(-18.1), -49.4, x(-16.6), -47.6, side * 0.4, 0.22);
        // wet sheen on the upper arm
        if (R.wet > 0 && R.lod >= 2) {
          c.globalAlpha = R.wet;
          fLens(c, C.sheen, x(-16.6), -69.2, x(-17.8), -63.4, -side * 0.5, 0.32);
          fLens(c, C.sheen, x(-17.6), -61.8, x(-17.9), -59.4, -side * 0.2, 0.18);
          c.globalAlpha = 1;
        }
        if (back) fLens(c, M.dA(0.3), x(-17.8), -58.5, x(-15.0), -56.2, side * 0.6, 0.3);
      },
    });
    hand(ctx, R, side, back);
    ctx.restore();
  }

  function hem(c, R) {
    const C = R.C;
    c.beginPath();
    c.rect(-16, -44.9, 32, 6);
    c.fillStyle = C.rib.base;
    c.fill();
    ribs(c, R, C.rib.dA(0.25), -13, 13, -44.9, -40, 0.85, 0.24);
    fLens(c, C.hood.sA(0.9), -13.2, -45.2, 13.2, -45.2, 0, 0.55);
    // folds above the hem band
    fLens(c, C.hood.dA(0.38), -7.6, -50.5, -6.6, -45.3, 0.4, 0.42);
    fLens(c, C.hood.dA(0.3), 1.0, -49.2, 1.6, -45.3, -0.3, 0.32);
    fLens(c, C.hood.dA(0.36), 7.2, -50.0, 7.8, -45.3, -0.5, 0.4);
  }

  function torso(ctx, R, back) {
    const C = R.C;
    const M = C.hood;
    part(ctx, R, S(TORSO), M, {
      sd: [-3.6, -0.7],
      rk: 1.1,
      extra: (c) => {
        // armpit pull folds
        fLens(c, M.dA(0.35), -12.6, -64.0, -8.2, -58.4, -0.6, 0.38);
        fLens(c, M.dA(0.35), 12.6, -64.0, 8.2, -58.4, 0.6, 0.38);
        if (!back) {
          // kangaroo pocket
          const pk = [[-6.8, -57.0], [6.8, -57.0], [9.7, -45.4], [-9.7, -45.4]];
          c.beginPath();
          rpoly(c, pk, 0.9, 0.35, 0.55);
          c.fillStyle = M.dA(0.3);
          c.fill();
          c.beginPath();
          rpoly(c, pk, 0.9);
          c.fillStyle = M.base;
          c.fill();
          // the torso's cel shadow continues across the pocket
          c.save();
          c.beginPath();
          rpoly(c, pk, 0.9);
          c.clip();
          cres(c, S(TORSO), -3.6, -0.7, M.sh);
          c.restore();
          fLens(c, M.lA(0.55), -6.4, -56.9, 6.4, -56.9, -0.15, 0.42);
          // hand openings
          fLens(c, M.dA(0.75), -6.75, -56.6, -9.25, -48.3, -0.9, 0.55);
          fLens(c, M.dA(0.75), 6.75, -56.6, 9.25, -48.3, 0.9, 0.55);
          fLens(c, M.dA(0.3), -2.0, -46.6, 2.6, -46.4, 0.4, 0.3);
          stitch(c, R, M.dA(0.32), [[-6.2, -56.2], [6.2, -56.2]], 0.4, 0.12);
          stitch(c, R, M.dA(0.32), [[-9.0, -48.0], [-9.2, -46.1], [9.2, -46.1], [9.0, -48.0]], 0.4, 0.12);
          // collar rolls cast a shadow on the chest
          c.save();
          c.translate(0.5, 1.3);
          c.beginPath();
          spl(c, rollPts(-1), 0, 0);
          spl(c, rollPts(1), 0, 0);
          c.fillStyle = M.sA(0.85);
          c.fill();
          c.restore();
          // small white woven patch on the chest
          patchFront(c, R, 6.9, -64.6);
          // chest drape
          fLens(c, M.dA(0.22), -4.0, -66.5, -1.0, -60.5, 0.6, 0.3);
          fLens(c, M.dA(0.2), 2.4, -66.0, 3.4, -60.0, -0.4, 0.25);
        } else {
          // the hood lying on the back casts a shadow
          c.save();
          c.translate(0.6, 1.5);
          c.beginPath();
          spl(c, HOOD_BACK, 0, 0);
          c.fillStyle = M.sA(0.9);
          c.fill();
          c.restore();
          fLens(c, M.dA(0.22), 0.2, -57.0, 0.5, -46.5, 0.3, 0.3);
          fLens(c, M.dA(0.28), -6.0, -55.0, -4.0, -48.0, 0.6, 0.35);
          fLens(c, M.dA(0.24), 6.4, -54.0, 5.0, -48.6, -0.6, 0.3);
        }
        hem(c, R);
        if (R.wet > 0 && R.lod >= 2) {
          c.globalAlpha = R.wet;
          fLens(c, C.sheen, -10.4, -71.8, -13.6, -68.6, -0.4, 0.28);
          c.globalAlpha = 1;
        }
      },
    });
  }

  function patchFront(c, R, x, y) {
    const C = R.C;
    // a small white woven label, slightly tilted, with two thin woven bars (no brand)
    const P = [[x - 1.0, y - 1.15], [x + 1.05, y - 1.05], [x + 1.0, y + 1.15], [x - 1.05, y + 1.05]];
    part(c, R, RP(P, 0.3), C.patch, {
      sd: [-0.4, -0.3],
      rim: false,
      top: false,
      fl: false,
      extra: (cc) => {
        stitch(cc, R, C.patch.dA(0.55), [[x - 0.72, y - 0.82], [x + 0.77, y - 0.75], [x + 0.72, y + 0.84], [x - 0.77, y + 0.76], [x - 0.72, y - 0.82]], 0.2, 0.08);
        cc.fillStyle = C.hood.sh;
        cc.fillRect(x - 0.5, y - 0.38, 1.0, 0.24);
        cc.fillRect(x - 0.5, y + 0.12, 0.7, 0.2);
      },
    });
  }

  // collar rolls (the hood's edge wrapping round the neck, meeting in a V at the front)
  function rollPts(side) {
    const P = [
      [-3.95, -79.4], [-6.7, -79.0], [-9.3, -76.4], [-9.2, -73.2], [-6.6, -71.3], [-3.2, -70.2],
      [-0.2, -69.8], [1.3, -70.3, 1], [0.15, -71.9], [-2.2, -73.3], [-3.55, -75.3], [-3.95, -77.6],
    ];
    return side < 0 ? P : mirror(P);
  }

  function collarFront(ctx, R) {
    const C = R.C;
    const M = C.hood;
    for (const side of [-1, 1]) {
      const P = rollPts(side);
      part(ctx, R, S(P), M, {
        sd: [-0.9, -1.1],
        rim: side === R.rimSide,
        rk: 0.85,
        extra: (c) => {
          // hood opening / lining along the inner edge
          fLens(c, C.lining.base, side * 4.2, -78.2, side * 0.3, -71.5, side * 0.9, 0.8);
          fLens(c, M.dA(0.35), side * 8.7, -75.4, side * 4.0, -71.1, -side * 0.6, 0.35);
          fLens(c, M.lA(0.35), side * 7.6, -78.0, side * 8.9, -75.0, -side * 0.3, 0.28);
          if (R.wet > 0 && R.lod >= 2) {
            c.globalAlpha = R.wet;
            fLens(c, C.sheen, side * 8.9, -75.6, side * 6.2, -78.3, side * 0.3, 0.22);
            c.globalAlpha = 1;
          }
        },
      });
    }
    // eyelets
    if (R.lod >= 1) {
      for (const side of [-1, 1]) {
        fEll(ctx, C.aglet, side * 1.3, -71.25, 0.48, 0.4);
        fEll(ctx, C.lining.deep, side * 1.3, -71.2, 0.25, 0.2);
      }
    }
  }

  function hoodBehindFront(ctx, R) {
    const C = R.C;
    const P = [[-9.0, -75.8], [-8.7, -79.0], [-6.0, -81.2], [0, -82.0], [6.0, -81.2], [8.7, -79.0], [9.0, -75.8], [3.8, -74.8], [-3.8, -74.8]];
    part(ctx, R, S(P), C.lining, {
      ds: 0,
      rk: 0.8,
      base: C.hood.sh,
      extra: (c) => {
        fEll(c, C.lining.base, 0, -78.7, 5.4, 2.1);
        fEll(c, C.lining.sh, 0.6, -78.3, 4.2, 1.6);
      },
    });
  }

  function stringsFront(ctx, R) {
    if (R.lod < 1) return;
    const C = R.C;
    const t = R.t;
    for (const side of [-1, 1]) {
      const sw = (N1(t * 0.55 + side * 3.1, R.seed + 11) * 0.75 + Math.sin(t * 1.3 + side * 1.7) * 0.18) * R.wind;
      const A = [side * 1.3, -71.1];
      const Bp = [side * 1.85 + sw, -61.6 + Math.abs(sw) * 0.2];
      const Cc = [side * 1.5 + sw * 0.25, -66.4];
      const w = 0.5;
      // shadow on the hoodie
      ctx.lineCap = "round";
      ctx.strokeStyle = C.hood.dA(0.35);
      ctx.lineWidth = w * 1.1;
      ctx.beginPath();
      ctx.moveTo(A[0] + 0.35, A[1] + 0.5);
      ctx.quadraticCurveTo(Cc[0] + 0.45, Cc[1] + 0.4, Bp[0] + 0.45, Bp[1] + 0.35);
      ctx.stroke();
      // string (cel: shade half on the right)
      ctx.strokeStyle = C.string;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.quadraticCurveTo(Cc[0], Cc[1], Bp[0], Bp[1]);
      ctx.stroke();
      if (R.lod >= 2) {
        ctx.strokeStyle = C.stringSh;
        ctx.lineWidth = w * 0.42;
        ctx.beginPath();
        ctx.moveTo(A[0] + 0.14, A[1]);
        ctx.quadraticCurveTo(Cc[0] + 0.14, Cc[1], Bp[0] + 0.14, Bp[1]);
        ctx.stroke();
      }
      // aglet
      const a0 = q2(A, Cc, Bp, 0.83);
      ctx.strokeStyle = C.aglet;
      ctx.lineWidth = w * 1.35;
      ctx.beginPath();
      ctx.moveTo(a0[0], a0[1]);
      ctx.lineTo(Bp[0], Bp[1]);
      ctx.stroke();
      if (R.lod >= 2) {
        ctx.strokeStyle = C.agletHi;
        ctx.lineWidth = w * 0.35;
        ctx.beginPath();
        ctx.moveTo(a0[0] - 0.15, a0[1] + 0.2);
        ctx.lineTo(lerp(a0[0], Bp[0], 0.6) - 0.15, lerp(a0[1], Bp[1], 0.6));
        ctx.stroke();
      }
    }
  }

  // droplets on the hoodie (front/back), positions in units, seeded
  const DROPS_FRONT = (() => {
    const out = [];
    const r = EX.rng(1234);
    const zones = [
      // [x0, x1, y0, y1, count]
      [-16.6, -11.0, -70.4, -67.4, 3], [11.0, 16.6, -70.4, -67.4, 3], // shoulders
      [-8.4, -5.4, -76.4, -73.6, 2], [5.4, 8.4, -76.4, -73.6, 2], // collar rolls
      [-17.8, -14.8, -66.0, -58.5, 2], [14.8, 17.8, -66.0, -58.5, 2], // upper arms
      [-10.0, 10.0, -67.0, -61.0, 2], // chest
    ];
    for (const z of zones) for (let i = 0; i < z[4]; i++) out.push([lerp(z[0], z[1], r()), lerp(z[2], z[3], r()), 0.2 + r() * 0.26, r()]);
    return out;
  })();
  const DROPS_BACK = (() => {
    const out = [];
    const r = EX.rng(4321);
    const zones = [
      [-16.6, -11.0, -70.4, -67.4, 3], [11.0, 16.6, -70.4, -67.4, 3],
      [-7.5, 7.5, -76.0, -63.0, 6], // the hood
      [-17.8, -14.8, -66.0, -58.5, 2], [14.8, 17.8, -66.0, -58.5, 2],
    ];
    for (const z of zones) for (let i = 0; i < z[4]; i++) out.push([lerp(z[0], z[1], r()), lerp(z[2], z[3], r()), 0.2 + r() * 0.28, r()]);
    return out;
  })();
  function dropsBody(ctx, R, list) {
    if (R.wet <= 0 || R.s < 6.5) return; // beads only read from medium-close sizes up
    for (let i = 0; i < list.length; i++) {
      const d = list[i];
      if (d[3] > R.wet) continue;
      const tw = 0.85 + 0.15 * Math.sin(R.t * 0.9 + i * 2.1);
      drop(ctx, R, d[0], d[1], d[2] * tw, 1);
    }
    // a few beads slowly sliding down the sleeves (pure function of t)
    for (let k = 0; k < 3; k++) {
      const side = k === 1 ? 1 : -1;
      const per = 5.5 + k * 1.3;
      const u = ((R.t + k * 2.3) / per) % 1;
      const yy = -64 + u * 15;
      const xx = side * (16.9 - k * 0.6) + Math.sin(u * 5 + k) * 0.25;
      const a = sstep(0, 0.12, u) * (1 - sstep(0.8, 1, u)) * R.wet;
      if (a <= 0.01) continue;
      ctx.globalAlpha = a * 0.6;
      fLens(ctx, R.C.sheen, xx, yy - 3.2, xx, yy - 0.2, 0, 0.16);
      ctx.globalAlpha = 1;
      drop(ctx, R, xx, yy, 0.32, a);
    }
  }

  // ---------------------------------------------------------------- neck
  function neck(ctx, R, view) {
    const C = R.C;
    const Hl = R.Hl;
    let P;
    let chin;
    if (view === "profile") {
      const a = mAp(Hl, -2.2, 7.6);
      const b = mAp(Hl, 4.6, 3.6);
      P = [a, b, [4.4, -76], [4.2, -72.6, 1], [-3.8, -72.2, 1], [-3.4, -75.5]];
      chin = mAp(Hl, -1.2, 8.8);
    } else {
      const a = mAp(Hl, -3.15, 5.2);
      const b = mAp(Hl, 3.15, 5.2);
      P = [a, b, [3.35, -76.6], [3.6, -72.6, 1], [-3.6, -72.6, 1], [-3.35, -76.6]];
      chin = mAp(Hl, 0, 9.2);
    }
    part(ctx, R, S(P), C.skin, {
      sd: [-1.5, -0.3],
      top: false,
      rk: 0.8,
      extra: (c) => {
        if (view === "back") {
          fLens(c, C.skin.dA(0.3), -0.2, -82.5, 0.2, -76.5, 0.2, 0.35);
        } else if (view === "profile") {
          fEll(c, C.skin.sh, chin[0] + 1.5, chin[1] + 0.2, 4.6, 2.9, -0.35);
          fLens(c, C.skin.dA(0.3), 1.0, -80.5, 0.0, -75.5, 0.4, 0.3);
        } else {
          fEll(c, C.skin.sh, chin[0] + 0.25, chin[1] + 0.35, 4.7, 2.7);
          if (R.lod >= 2) fLens(c, C.skin.dA(0.25), -1.6, -77.2, 1.6, -77.2, 0.5, 0.2);
        }
      },
    });
  }

  // ---------------------------------------------------------------- FRONT head
  function hairFrontPts(R) {
    const t = R.t;
    const th = R.theta;
    const hu = -1.9 * R.up;
    const n = (k, f, a) => N1(t * f + k * 3.3, R.seed + 60 + k) * a * R.wind;
    const s1 = n(1, 0.85, 0.32);
    const s1y = n(2, 0.7, 0.16);
    const s2 = n(3, 0.95, 0.3);
    const s2y = n(4, 0.8, 0.16);
    const fl = n(5, 0.75, 0.38);
    const fly = n(6, 0.6, 0.3);
    const top = n(7, 0.5, 0.22);
    const fx = (x) => 8.3 * Math.sin(Math.asin(clamp(x / 8.3, -1, 1)) + th); // hairline wraps the skull
    return [
      [-7.85, -0.6, 1], [-8.3, -3.6], [-8.55, -6.4], [-8.5, -8.4],
      [-9.75 + fl, -9.5 + fly, 1], // the swoop ends in a lock flicking out at the left temple
      [-8.4, -11.6], [-5.8, -14.0 + top * 0.5], [-1.8, -15.3 + top], [2.4, -15.5 + top], [4.7, -14.3],
      [5.4, -13.4, 1], // parting
      [6.7, -13.1], [8.3, -10.9], [8.85, -7.2], [8.7, -3.6], [8.05, -0.8, 1],
      [7.3, -1.0, 1], [7.1, -4.8 + hu * 0.5], [fx(5.6), -6.9 + hu], [fx(2.4), -7.8 + hu], [fx(-0.8), -7.4 + hu],
      [fx(-2.6), -6.5 + hu], [fx(-3.7) + s1, -4.5 + hu + s1y, 1], [fx(-4.6), -5.6 + hu],
      [fx(-6.3) + s2, -3.3 + hu * 0.7 + s2y, 1], [-6.9, -4.4 + hu * 0.4], [-7.15, -0.9, 1],
    ];
  }

  function headFront(ctx, R) {
    const C = R.C;
    const M = C.skin;
    const th = R.theta;
    const up = R.up;
    const lod = R.lod;
    const fy = -2.2 * up; // features slide up as the head tilts back
    const cs = 1.4 * Math.sin(th);
    const face = [
      [0, -10.6], [5.4, -9.6], [7.55, -5.6], [7.75, -0.6], [7.25 + cs * 0.2, 3.5], [5.7 + cs * 0.5, 6.9],
      [2.85 + cs * 0.8, 9.05 - up * 0.7], [cs, 9.65 - up * 0.9], [-2.85 + cs * 0.8, 9.05 - up * 0.7],
      [-5.7 + cs * 0.5, 6.9], [-7.25 + cs * 0.2, 3.5], [-7.75, -0.6], [-7.55, -5.6], [-5.4, -9.6],
    ];
    const hairP = hairFrontPts(R);
    // ears: the one the face turns away from slides onto the face; the other hides behind
    const earY = 0.9 + up * 1.2;
    const near = th > 0 ? -1 : 1; // side that becomes visible
    const k = Math.abs(R.turn);
    const ear = (side) => {
      const ex = side * (7.45 - (side === near ? 0.6 * k : 0.9 * k));
      const Sh = E(ex, earY, 1.4 + (side === near ? 0.2 * k : -0.25 * k), 2.25, side * 0.12);
      part(ctx, R, Sh, M, {
        sd: [-0.7, -0.5],
        top: false,
        rim: side === R.rimSide,
        rk: 0.6,
        extra: (c) => {
          fEll(c, M.dA(0.55), ex - side * 0.2, earY + 0.15, 0.62, 1.3, side * 0.12);
          fEll(c, M.base, ex - side * 0.45, earY + 0.55, 0.3, 0.6, side * 0.2);
        },
      });
    };
    for (const side of [-1, 1]) if (!(k > 0.15 && side === near)) ear(side);
    // face
    part(ctx, R, S(face), M, {
      sd: [-2.1 + th * 1.2, -0.45],
      rk: 1,
      extra: (c) => {
        // shadow the hair casts on the forehead
        c.beginPath();
        spl(c, hairP, 0.55, 1.2);
        c.fillStyle = M.sh;
        c.fill();
        if (lod < 2) return;
        // cheeks
        const cx = (x) => 7.6 * Math.sin(Math.asin(clamp(x / 7.6, -1, 1)) + th);
        fEll(c, C.blush, cx(-4.6), 3.5 + fy * 0.8, 1.4, 0.78);
        fEll(c, C.blush, cx(4.6), 3.5 + fy * 0.8, 1.4 * Math.cos(th * 1.6), 0.78);
        // nose: a small cel shadow under and beside the tip, a warm tip highlight
        const nx = 8.0 * Math.sin(th);
        const ny = 3.4 + fy * 0.9;
        const nd = th > 0.2 ? -1 : 1; // the shadow flips side when the face turns toward the light
        c.beginPath();
        spl(c, [[nx + nd * 0.25, ny - 1.4], [nx + nd * 1.15, ny + 0.25], [nx + nd * 0.6, ny + 1.0], [nx - nd * 0.8, ny + 0.92]], 0, 0);
        c.fillStyle = M.sh;
        c.fill();
        fEll(c, C.noseHi, nx - nd * 0.3, ny + 0.2, 0.42, 0.34);
        // a soft crease under the lower lip and a chin highlight
        fLens(c, M.dA(0.22), cs * 0.9 - 0.75, 7.75 + fy * 0.7, cs * 0.9 + 0.75, 7.75 + fy * 0.7, 0.3, 0.15);
      },
    });
    if (k > 0.15) ear(near);
    eyesFront(ctx, R, fy);
    mouthFront(ctx, R, 7.3 * Math.sin(th) * 0.95, 6.2 + fy * 0.75);
    hairFront(ctx, R, hairP);
    // brows go over the hair edge so they always read
    if (lod >= 1) browsFront(ctx, R, fy);
    if (R.wet > 0 && R.s >= 6.5) hairDrops(ctx, R, HAIR_DROPS_FRONT);
  }

  const HAIR_DROPS_FRONT = [[-6.4, -10.6], [-1.4, -12.8], [3.6, -13.2], [7.2, -9.4], [-3.6, -8.6], [6.4, -5.4]];
  const HAIR_DROPS_BACK = [[-6.2, -10.4], [-1.6, -12.6], [3.8, -12.0], [6.8, -6.2], [-6.6, -2.4], [2.2, -5.6], [-2.6, 2.6]];
  const HAIR_DROPS_PROF = [[-4.8, -11.0], [0.4, -12.8], [5.2, -11.0], [8.2, -4.6], [2.2, -8.4], [-3.0, -8.0]];
  function hairDrops(ctx, R, list) {
    const C = R.C;
    for (let i = 0; i < list.length; i++) {
      if (EX.hash(i, 77) > R.wet) continue;
      const [x, y] = list[i];
      const r = 0.16 + EX.hash(i, 78) * 0.14;
      const tw = 0.55 + 0.45 * Math.max(0, Math.sin(R.t * (0.7 + EX.hash(i, 79)) + i * 1.9));
      fEll(ctx, C.hairDropA, x, y, r, r);
      fEll(ctx, C.eyeHi, x - r * 0.28, y - r * 0.3, r * 0.45 * tw, r * 0.45 * tw);
    }
  }

  function eyesFront(ctx, R, fy) {
    const C = R.C;
    const th = R.theta;
    const lid = R.blink;
    for (const side of [-1, 1]) {
      const x0 = side * 3.1;
      const ph = Math.asin(x0 / 7.7) + th;
      const ex = 7.7 * Math.sin(ph) + R.lx * 0.48;
      const kx = clamp(Math.cos(ph) / Math.cos(Math.asin(x0 / 7.7)), 0.45, 1.1);
      const ey = 0.6 + fy + R.ly * 0.42;
      const rx = 0.98 * kx * (1 + 0.05 * R.worry);
      const ry = 1.4 * (1 + 0.07 * R.worry);
      if (R.lod === 0) {
        fEll(ctx, C.eye, ex, ey, Math.max(rx, 0.9 / R.s), Math.max(ry * (1 - lid * 0.85), 0.9 / R.s));
        continue;
      }
      if (lid > 0.02) {
        // the lid closes from the top: the eye flattens into a soft downward arc
        const k = 1 - lid * 0.88;
        const ry2 = Math.max(ry * k, 0.24);
        const yb = ey + (ry - ry2) * 0.75;
        fEll(ctx, C.eye, ex, yb, rx * (1 + lid * 0.15), ry2);
        if (lid < 0.5) fEll(ctx, C.eyeHi, ex - rx * 0.33, yb - ry2 * 0.4, rx * 0.36 * (1 - lid), rx * 0.36 * (1 - lid));
        continue;
      }
      fEll(ctx, C.eye, ex, ey, rx, ry);
      fEll(ctx, C.eyeHi, ex - rx * 0.34, ey - ry * 0.4, rx * 0.36, rx * 0.36);
      if (R.lod >= 2) fEll(ctx, C.eyeHi, ex + rx * 0.4, ey + ry * 0.4, rx * 0.14, rx * 0.14);
    }
  }

  // a tapered, gently arched brow: centre line I -> O bowing by `arch` (negative = up)
  function brow(ctx, col, I, O, arch, t0, t1) {
    const cx = (I[0] + O[0]) / 2;
    const cy = (I[1] + O[1]) / 2 + arch * 2;
    const N = 8;
    const top = [];
    const bot = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const p = q2(I, [cx, cy], O, u);
      const d = [2 * (1 - u) * (cx - I[0]) + 2 * u * (O[0] - cx), 2 * (1 - u) * (cy - I[1]) + 2 * u * (O[1] - cy)];
      const l = Math.hypot(d[0], d[1]) || 1;
      const nx = -d[1] / l;
      const ny = d[0] / l;
      const w = lerp(t0, t1, u) / 2;
      top.push([p[0] + nx * w, p[1] + ny * w]);
      bot.push([p[0] - nx * w, p[1] - ny * w]);
    }
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    for (let i = 1; i <= N; i++) ctx.lineTo(top[i][0], top[i][1]);
    ctx.arc(O[0], O[1], t1 / 2, Math.atan2(top[N][1] - O[1], top[N][0] - O[0]), Math.atan2(bot[N][1] - O[1], bot[N][0] - O[0]), true);
    for (let i = N; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.arc(I[0], I[1], t0 / 2, Math.atan2(bot[0][1] - I[1], bot[0][0] - I[0]), Math.atan2(top[0][1] - I[1], top[0][0] - I[0]), true);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  }

  function browsFront(ctx, R, fy) {
    const C = R.C;
    const th = R.theta;
    const w = R.worry;
    const lift = -0.45 * R.up;
    const wx = (x) => 7.7 * Math.sin(Math.asin(clamp(x / 7.7, -1, 1)) + th);
    for (const side of [-1, 1]) {
      const I = [wx(side * (1.5 - 0.15 * w)), -3.25 + fy + lift - 1.4 * w];
      const O = [wx(side * 4.8), -3.45 + fy + lift + 0.35 * w];
      const kx = Math.cos(Math.asin(clamp((side * 3.2) / 7.7, -1, 1)) + th);
      const sc = clamp(0.75 + kx * 0.3, 0.75, 1.05);
      // drawn inner -> outer; the arch flattens as worry tilts the brow
      const a = -0.38 * (1 - 0.8 * w);
      if (side < 0) brow(ctx, C.brow, O, I, a, 0.74 * sc, 1.02 * sc);
      else brow(ctx, C.brow, I, O, a, 1.02 * sc, 0.74 * sc);
    }
  }

  function mouthFront(ctx, R, mx, my) {
    const C = R.C;
    if (R.lod === 0) return;
    const w = R.worry;
    const m = clamp(R.mouth - 0.85 * w, -1, 1);
    const hw = (1.3 + 0.25 * Math.max(0, m) - 0.2 * w) * clamp(Math.cos(R.theta), 0.7, 1);
    const asym = 0.18 * w; // a slightly lopsided worried mouth
    const cyL = -0.55 * m + asym;
    const cyR = -0.55 * m - asym * 0.4;
    const ty = -0.1 - 0.35 * Math.max(0, -m) * (1 - 0.3 * w);
    const open = 0.42 + 0.6 * Math.max(0, m) + 0.42 * w;
    const by = ty + open - 0.25 * Math.max(0, -m) * (1 - w);
    const L = [mx - hw, my + cyL];
    const Rr = [mx + hw, my + cyR];
    const cy = (L[1] + Rr[1]) / 2;
    const path = (c) => {
      c.moveTo(L[0], L[1]);
      c.quadraticCurveTo(mx, 2 * (my + ty) - cy, Rr[0], Rr[1]);
      c.quadraticCurveTo(mx, 2 * (my + by) - cy, L[0], L[1]);
      c.closePath();
    };
    ctx.beginPath();
    path(ctx);
    ctx.fillStyle = C.mouth;
    ctx.fill();
    if (R.lod >= 2 && open > 0.6) {
      ctx.save();
      ctx.beginPath();
      path(ctx);
      ctx.clip();
      if (m > 0.3) {
        ctx.fillStyle = C.teeth;
        ctx.fillRect(mx - hw, my + ty - 1, hw * 2, 1 + open * 0.32);
      }
      fEll(ctx, C.tongue, mx + 0.2, my + by + 0.1, hw * 0.62, open * 0.42);
      ctx.restore();
    }
  }

  function hairFront(ctx, R, P) {
    const C = R.C;
    const M = C.hair;
    const hu = -1.9 * R.up;
    const th = R.theta;
    const fx = (x) => 8.3 * Math.sin(Math.asin(clamp(x / 8.3, -1, 1)) + th);
    const s = N1(R.t * 0.85 + 3.3, R.seed + 61) * 0.32 * R.wind;
    part(ctx, R, S(P), M, {
      sd: [-1.0, -1.1],
      rk: 1,
      extra: (c) => {
        // violet sheen in broken bands that follow the clumps (lit from the upper left)
        fLens(c, M.lt, -8.4, -10.4, -2.2, -14.7, -0.9, 0.85);
        fLens(c, M.lA(0.75), -1.0, -15.0, 3.8, -14.9, -0.4, 0.5);
        fLens(c, M.lA(0.65), -9.0, -9.7, -7.8, -11.5, 0.15, 0.24);
        fLens(c, M.lA(0.45), 6.3, -12.8, 8.2, -9.6, -0.3, 0.22);
        // strands sweeping from the parting over to the left
        fLens(c, M.dA(0.75), 4.8, -13.6, fx(-3.5) + s, -4.9 + hu, 2.0, 0.34);
        fLens(c, M.dA(0.65), 3.0, -14.8, fx(-6.2), -3.8 + hu * 0.7, 2.6, 0.3);
        fLens(c, M.dA(0.6), 0.2, -15.0, -9.0, -9.7, 1.6, 0.26);
        fLens(c, M.dA(0.55), 6.0, -12.8, 8.0, -7.6, -0.6, 0.24);
        fLens(c, M.lA(0.45), 1.4, -12.6, fx(-4.6), -6.4 + hu, 1.6, 0.18);
        fLens(c, M.dA(0.45), -7.4, -8.6, -7.8, -3.2, 0.4, 0.2);
      },
    });
  }

  // ---------------------------------------------------------------- BACK head
  const HOOD_BACK = [
    [-9.0, -77.6], [-10.2, -73.0], [-9.6, -66.6], [-7.2, -61.4], [-3.5, -58.8], [0, -58.4], [3.5, -58.8],
    [7.2, -61.4], [9.6, -66.6], [10.2, -73.0], [9.0, -77.6], [5.8, -80.4], [2.6, -79.8], [0, -79.4],
    [-2.6, -79.8], [-5.8, -80.4],
  ];

  function hoodBack(ctx, R) {
    const C = R.C;
    const M = C.hood;
    part(ctx, R, S(HOOD_BACK), M, {
      sd: [-1.9, -1.5],
      rk: 1,
      extra: (c) => {
        // the rim of the hood opening shows its lining where it wraps the neck
        fLens(c, C.lining.base, -6.1, -79.7, 6.1, -79.7, 2.1, 1.0);
        fLens(c, C.lining.sh, -3.4, -79.2, 3.4, -79.2, 1.3, 0.5);
        // centre seam and the drape folds of the hood
        fLens(c, M.dA(0.5), 0, -77.6, 0.2, -59.4, 0.3, 0.32);
        fLens(c, M.dA(0.4), -8.0, -75.4, -3.2, -61.2, 1.6, 0.5);
        fLens(c, M.dA(0.4), 8.0, -75.4, 3.2, -61.2, -1.6, 0.5);
        fLens(c, M.dA(0.3), -9.0, -70.0, -6.6, -63.0, 0.6, 0.3);
        fLens(c, M.lA(0.4), -6.6, -74.0, -3.8, -65.0, 0.4, 0.4);
        if (R.wet > 0 && R.lod >= 2) {
          c.globalAlpha = R.wet;
          fLens(c, C.sheen, -8.4, -72.0, -6.8, -66.2, 0.3, 0.26);
          fLens(c, C.sheen, 4.0, -77.0, 7.0, -76.4, -0.3, 0.2);
          c.globalAlpha = 1;
        }
      },
    });
  }

  function headBack(ctx, R) {
    const C = R.C;
    const M = C.skin;
    const k = Math.abs(R.turn);
    const sd = R.turn >= 0 ? 1 : -1;
    const x = (v) => sd * v;
    // cheek, jaw and nose tip sliver on the turn side (drawn behind the hair)
    if (k > 0.03) {
      const cheek = [
        [x(4.0), -5.4], [x(6.9 + 1.3 * k), -4.2], [x(7.6 + 1.6 * k), -1.0], [x(8.0 + 1.7 * k), 2.2],
        [x(7.0 + 1.1 * k), 5.0], [x(4.8 + 0.4 * k), 6.8], [x(2.0), 6.2],
      ];
      part(ctx, R, S(cheek), M, {
        sd: [sd > 0 ? -1.1 : 0.5, -0.6],
        top: false,
        rim: sd === R.rimSide,
        rk: 0.8,
        extra: (c) => {
          if (R.lod >= 2) fEll(c, C.blush, x(7.6 + 1.5 * k), 3.6, 1.0, 0.65);
        },
      });
      if (k > 0.35) {
        const nk = sstep(0.35, 1, k);
        part(ctx, R, E(x(7.7 + 2.5 * k), 2.4, 0.75 * nk + 0.25, 0.85 * nk + 0.25, 0), M, {
          ds: 0.45,
          top: false,
          rk: 0.6,
          rim: sd === R.rimSide,
        });
      }
      if (k > 0.5 && R.lod >= 1) {
        // the outer tips of a brow and an eye peeking past the hair
        const ek = sstep(0.5, 1, k);
        brow(ctx, C.brow, [x(7.4 + 0.8 * k), -2.9 - 0.9 * R.worry], [x(7.6 + 1.7 * k * ek), -3.15 + 0.2 * R.worry], -0.2, 0.85, 0.7);
        fEll(ctx, C.eye, x(7.9 + 1.25 * k * ek), 0.8, 0.3 * ek + 0.02, 0.95 * ek + 0.02);
      }
    }
    const ear = (side) => {
      const near = side === sd && k > 0.2;
      const ex = side * (7.45 - (side === sd ? 1.15 * k : 0.5 * k));
      part(ctx, R, E(ex, 0.9, 1.4, 2.25, -side * 0.15), M, {
        sd: [-0.8, -0.5],
        top: false,
        rim: side === R.rimSide,
        rk: 0.6,
        extra: (c) => {
          fLens(c, M.dA(0.35), ex + side * 0.5, -0.9, ex + side * 0.4, 2.6, side * 0.5, 0.3);
          if (near) fEll(c, M.dA(0.45), ex + side * 0.25, 1.0, 0.55, 1.2, -side * 0.15);
        },
      });
    };
    ear(-sd);
    if (k <= 0.2) ear(sd);
    // hair from behind: the swoop's flick shows at the right temple, a whorl on the crown
    const t = R.t;
    const n = (i, f, a) => N1(t * f + i * 3.3, R.seed + 70 + i) * a * R.wind;
    const fl = n(1, 0.75, 0.38);
    const fly = n(2, 0.6, 0.3);
    const tp = n(3, 0.5, 0.22);
    const nap = n(4, 0.9, 0.25);
    let P = [
      [-7.95, -1.2], [-8.75, -5.4], [-8.8, -9.0], [-7.6, -12.2], [-5.4, -14.0 + tp * 0.5], [-1.8, -15.3 + tp],
      [2.2, -15.4 + tp], [5.8, -14.0], [8.4, -11.6], [9.75 - fl, -9.5 + fly, 1], [8.5, -8.4], [8.75, -5.4],
      [8.6, -2.4], [7.7, 1.4], [6.2, 4.4], [4.3, 5.8], [2.2, 6.4 + nap * 0.3, 1], [1.0, 5.4],
      [-0.4, 6.6 + nap * 0.3, 1], [-1.9, 5.5], [-3.8, 6.2, 1], [-5.9, 4.6], [-7.4, 1.8],
    ];
    // as the head turns, the hair edge on that side pulls in to reveal the cheek
    if (k > 0.01) P = P.map((p) => (p[0] * sd > 4 && p[1] > -10 ? [p[0] - sd * 1.4 * k * sstep(-10, -4, p[1]), p[1], p[2]] : p));
    const M2 = C.hair;
    part(ctx, R, S(P), M2, {
      sd: [-1.2, -1.2],
      extra: (c) => {
        fLens(c, M2.lt, -8.4, -6.4, -1.0, -14.8, -2.2, 1.15);
        fLens(c, M2.lA(0.6), 1.0, -15.0, 6.0, -13.2, -0.5, 0.4);
        fLens(c, M2.lA(0.55), 8.6, -11.0, 9.4, -9.6, 0.2, 0.22);
        // crown whorl and strands flowing to the nape
        fLens(c, M2.dA(0.8), 1.2, -10.4, -5.6, -2.2, -1.4, 0.32);
        fLens(c, M2.dA(0.8), 1.6, -10.0, 6.2, -1.6, 1.2, 0.3);
        fLens(c, M2.dA(0.7), 1.4, -9.8, 0.6, 4.0, 0.6, 0.3);
        fLens(c, M2.dA(0.75), 0.2, -11.2, 2.9, -9.8, -0.9, 0.3);
        fLens(c, M2.dA(0.6), 2.8, -9.6, 1.0, -8.6, -0.6, 0.22);
        fLens(c, M2.dA(0.6), 2.2, -12.0, 8.6, -9.8, -1.4, 0.26);
        fLens(c, M2.lA(0.5), -1.4, -9.4, -5.6, -5.0, -0.5, 0.2);
        fLens(c, M2.dA(0.55), -3.6, -1.4, -3.6, 5.0, 0.5, 0.24);
        fLens(c, M2.dA(0.55), 4.0, -1.4, 3.2, 4.8, -0.4, 0.22);
      },
    });
    if (k > 0.2) ear(sd);
    if (R.wet > 0 && R.s >= 6.5) hairDrops(ctx, R, HAIR_DROPS_BACK);
  }

  // ---------------------------------------------------------------- PROFILE (faces left)
  function headProfile(ctx, R) {
    const C = R.C;
    const M = C.skin;
    const w = R.worry;
    const t = R.t;
    const face = [
      [0.5, -10.8], [5.6, -9.4], [8.2, -5.4], [8.3, -0.6], [7.2, 3.2], [5.0, 5.6], [2.0, 7.4],
      [-2.5, 9.15], [-5.0, 9.45], [-6.55, 8.55], [-6.85, 7.3], [-6.5, 6.55], [-7.1, 5.85],
      [-6.85, 5.2, 1], [-7.3, 4.6], [-7.15, 4.0], [-7.95, 3.6], [-9.2, 3.15], [-8.9, 2.25],
      [-7.6, 0.4], [-7.05, -1.2], [-7.2, -2.7], [-6.9, -6.0], [-4.6, -9.5],
    ];
    const n1 = N1(t * 0.85, R.seed + 61) * 0.3 * R.wind;
    const n2 = N1(t * 0.95 + 5, R.seed + 63) * 0.3 * R.wind;
    const n3 = N1(t * 0.5 + 9, R.seed + 67) * 0.22 * R.wind;
    const hu = -1.2 * R.up;
    const hairP = [
      [0.6, 1.0, 1], [-0.2, -2.6], [-2.4, -5.0], [-4.2, -5.6 + hu * 0.3], [-5.5 + n1 * 0.6, -3.9 + n1 * 0.3, 1],
      [-5.9, -5.3], [-7.5 + n1, -4.3 + n1 * 0.4, 1], [-7.5, -6.5], [-8.3, -7.6],
      [-9.7 + n2, -9.4 + n2 * 0.5, 1], [-8.2, -10.9], [-6.4, -13.2 + n3 * 0.5], [-2.6, -15.0 + n3],
      [2.0, -15.0 + n3], [5.6, -13.4], [8.2, -10.6], [9.3, -6.6], [9.25, -2.0], [8.3, 2.4], [6.6, 5.0, 1],
      [5.6, 3.0], [4.4, 2.5, 1], [4.3, -1.2], [3.4, -2.7], [1.6, -2.7], [0.9, -1.4],
    ];
    part(ctx, R, S(face), M, {
      sd: [-1.6, -1.4],
      rk: 1,
      extra: (c) => {
        c.beginPath();
        spl(c, hairP, 0.7, 1.1);
        c.fillStyle = M.sh;
        c.fill();
        if (R.lod < 2) return;
        fEll(c, C.blush, -3.9, 3.3, 1.5, 0.85);
        // nostril and the shadow under the nose
        fLens(c, M.dA(0.6), -8.1, 3.05, -7.3, 2.6, -0.3, 0.3);
        fLens(c, M.sA(0.9), -7.9, 3.75, -6.9, 3.95, 0.2, 0.3);
        fEll(c, C.noseHi, -8.4, 2.1, 0.4, 0.3);
        fLens(c, M.dA(0.25), -6.6, 7.1, -5.4, 7.0, 0.3, 0.15);
      },
    });
    // eye
    const lid = R.blink;
    const ex = -4.95 + Math.min(0, R.lx) * 0.25;
    const ey = 0.1 + R.ly * 0.4;
    const rx = 0.72;
    const ry = 1.25 * (1 + 0.08 * w);
    if (R.lod === 0) fEll(ctx, C.eye, ex, ey, Math.max(rx, 0.9 / R.s), Math.max(ry, 0.9 / R.s));
    else if (lid > 0.02) {
      const k = 1 - lid * 0.9;
      fEll(ctx, C.eye, ex, ey + ry * (1 - k) * 0.7, rx * 1.05, Math.max(ry * k, 0.2));
    } else {
      fEll(ctx, C.eye, ex, ey, rx, ry);
      fEll(ctx, C.eyeHi, ex - rx * 0.32, ey - ry * 0.4, rx * 0.4, rx * 0.4);
    }
    // mouth (a small filled wedge at the lips)
    if (R.lod >= 1) {
      const m = clamp(R.mouth - 0.85 * w, -1, 1);
      const open = 0.25 + 0.4 * w + 0.35 * Math.max(0, m);
      const backY = 5.3 - 0.55 * m + 0.25 * w;
      ctx.beginPath();
      ctx.moveTo(-7.0, 5.0 - open * 0.25);
      ctx.quadraticCurveTo(-6.1, 5.0 - open * 0.3 - 0.25 * m, -5.4, backY);
      ctx.quadraticCurveTo(-6.1, 5.25 + open * 0.75 - 0.2 * m, -7.0, 5.15 + open * 0.55);
      ctx.closePath();
      ctx.fillStyle = C.mouth;
      ctx.fill();
    }
    // hair
    const M2 = C.hair;
    part(ctx, R, S(hairP), M2, {
      sd: [-1.1, -1.2],
      extra: (c) => {
        fLens(c, M2.lt, -8.6, -10.2, -0.6, -14.9, -1.6, 1.1);
        fLens(c, M2.lA(0.6), 0.6, -15.0, 5.6, -13.2, -0.5, 0.45);
        fLens(c, M2.lA(0.6), -9.2, -9.4, -7.8, -10.6, 0.2, 0.24);
        fLens(c, M2.dA(0.6), -9.0, -9.2, -6.4, -7.2, 0.5, 0.26);
        fLens(c, M2.dA(0.75), 7.4, -10.4, -6.6, -6.9, -2.4, 0.34);
        fLens(c, M2.dA(0.65), 4.8, -13.2, -8.4 + n2, -8.0, -1.8, 0.3);
        fLens(c, M2.dA(0.55), 1.0, -14.2, -6.2 + n1, -5.0, -1.0, 0.24);
        fLens(c, M2.dA(0.6), 8.8, -4.6, 6.6, 4.0, 0.8, 0.28);
        fLens(c, M2.lA(0.5), 1.4, -11.0, -5.6, -7.6, -0.8, 0.2);
        fLens(c, M2.dA(0.5), 2.6, -6.4, 0.4, -2.4, 0.4, 0.22);
      },
    });
    // ear (over the hair edge)
    part(ctx, R, E(2.25, 0.7, 1.55, 2.35, 0.12), M, {
      sd: [-0.8, -0.6],
      top: false,
      rk: 0.6,
      extra: (c) => {
        fLens(c, M.dA(0.6), 1.7, -0.9, 1.9, 2.0, -0.6, 0.45);
        fEll(c, M.dA(0.35), 2.0, 1.9, 0.35, 0.3);
      },
    });
    // brow
    if (R.lod >= 1) {
      const lift = -0.45 * R.up;
      ctx.lineCap = "round";
      ctx.strokeStyle = C.brow;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(-6.75, -3.0 + lift - 1.1 * w);
      ctx.quadraticCurveTo(-5.2, -3.9 + lift - 0.4 * w, -3.8, -3.25 + lift + 0.3 * w);
      ctx.stroke();
    }
    if (R.wet > 0 && R.s >= 6.5) hairDrops(ctx, R, HAIR_DROPS_PROF);
  }

  function bodyProfile(ctx, R) {
    const C = R.C;
    const M = C.hood;
    const t = R.t;
    // torso
    const T = [
      [-3.4, -76.0], [-6.0, -73.6], [-7.4, -68.0], [-7.7, -62.0], [-7.5, -56.2], [-8.2, -51.0], [-7.9, -45.5],
      [-7.3, -42.2], [-5.0, -40.9], [0.0, -40.7], [5.2, -41.1], [6.7, -42.6], [7.1, -48.0], [7.5, -58.0],
      [7.7, -66.0], [6.8, -72.0], [4.2, -76.6],
    ];
    part(ctx, R, S(T), M, {
      sd: [-2.6, -0.8],
      extra: (c) => {
        // pocket bulge and opening
        fLens(c, M.dA(0.6), -7.4, -56.6, -5.0, -48.6, 1.0, 0.5);
        fLens(c, M.lA(0.4), -7.9, -56.0, -8.1, -47.0, -0.4, 0.35);
        c.beginPath();
        c.rect(-10, -44.9, 20, 6);
        c.fillStyle = C.rib.base;
        c.fill();
        ribs(c, R, C.rib.dA(0.25), -8, 8, -44.9, -40, 0.85, 0.24);
        fLens(c, M.sA(0.9), -8.2, -45.2, 7.4, -45.2, 0, 0.55);
        // hood shadow on the back
        fLens(c, M.sA(0.9), 2.4, -66.0, 7.8, -63.0, 1.0, 1.2);
        fLens(c, M.dA(0.3), 5.4, -60.0, 6.0, -48.0, 0.4, 0.4);
      },
    });
    // hood bunched behind the neck
    const HD = [
      [2.2, -81.8], [5.9, -81.3], [8.7, -78.4], [9.9, -74.0], [9.5, -69.2], [7.8, -64.8, 1], [6.5, -68.6],
      [4.8, -73.4], [3.0, -77.6],
    ];
    part(ctx, R, S(HD), M, {
      sd: [-1.6, -1.2],
      extra: (c) => {
        fLens(c, C.lining.base, 2.4, -81.0, 3.4, -74.0, 1.0, 0.85);
        fLens(c, M.dA(0.45), 9.0, -75.0, 7.2, -66.4, -0.8, 0.42);
        fLens(c, M.dA(0.3), 6.2, -79.4, 6.4, -71.0, -0.6, 0.3);
        fLens(c, M.lA(0.4), 5.6, -80.2, 8.6, -76.6, -0.4, 0.3);
        if (R.wet > 0 && R.lod >= 2) {
          c.globalAlpha = R.wet;
          fLens(c, C.sheen, 4.8, -80.4, 8.8, -77.6, -0.4, 0.24);
          c.globalAlpha = 1;
        }
      },
    });
    // collar roll round the front of the neck
    const CR = [[2.4, -80.6], [-1.3, -78.2], [-4.6, -75.8], [-6.7, -73.5], [-6.3, -71.8], [-3.6, -72.9], [-0.5, -74.8], [2.8, -77.0]];
    part(ctx, R, S(CR), M, {
      sd: [-0.8, -1.0],
      rk: 0.8,
      extra: (c) => {
        fLens(c, C.lining.base, 2.0, -79.6, -4.4, -74.9, -0.6, 0.45);
        fLens(c, M.dA(0.35), 1.6, -77.4, -5.4, -72.6, 0.6, 0.3);
      },
    });
    // drawstring in front of the chest
    if (R.lod >= 1) {
      const sw = (N1(t * 0.55, R.seed + 11) * 0.8 + Math.sin(t * 1.3) * 0.2) * R.wind;
      const A = [-5.7, -72.5];
      const Bp = [-6.6 + sw, -63.4];
      const Cc = [-6.2 + sw * 0.3, -67.9];
      ctx.lineCap = "round";
      ctx.strokeStyle = C.string;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.quadraticCurveTo(Cc[0], Cc[1], Bp[0], Bp[1]);
      ctx.stroke();
      const a0 = q2(A, Cc, Bp, 0.83);
      ctx.strokeStyle = C.aglet;
      ctx.lineWidth = 0.68;
      ctx.beginPath();
      ctx.moveTo(a0[0], a0[1]);
      ctx.lineTo(Bp[0], Bp[1]);
      ctx.stroke();
    }
    // near arm
    const A = [
      [-2.0, -71.6], [1.8, -72.4], [3.9, -69.0], [4.3, -62.0], [3.7, -54.0], [2.8, -47.0], [2.6, -43.4],
      [0.3, -42.6], [-1.9, -43.2], [-2.1, -46.8], [-2.7, -54.0], [-3.2, -62.0], [-3.5, -68.4],
    ];
    part(ctx, R, S(A), M, {
      sd: [-1.8, -0.9],
      extra: (c) => {
        fLens(c, M.dA(0.45), -2.4, -55.2, 2.6, -53.6, 0.8, 0.45);
        fLens(c, M.dA(0.38), -2.4, -52.4, 2.2, -51.4, 0.7, 0.34);
        fLens(c, M.dA(0.3), 1.0, -66.0, 0.0, -57.0, 0.5, 0.4);
        c.beginPath();
        c.rect(-4, -46.7, 8, 5);
        c.fillStyle = C.rib.base;
        c.fill();
        ribs(c, R, C.rib.dA(0.28), -2.4, 3.0, -46.7, -42, 0.62, 0.2);
        fLens(c, M.sA(0.9), -2.2, -47.0, 2.9, -47.0, 0, 0.5);
        if (R.wet > 0 && R.lod >= 2) {
          c.globalAlpha = R.wet;
          fLens(c, C.sheen, -1.4, -70.8, -2.8, -64.6, -0.4, 0.3);
          c.globalAlpha = 1;
        }
      },
    });
    // hand
    const HP = [[-1.6, -43.3], [-2.3, -40.8], [-1.7, -38.0], [-0.1, -37.0], [1.4, -37.9], [2.0, -40.6], [2.0, -43.3]];
    part(ctx, R, S(HP), C.skin, {
      sd: [-0.9, -0.8],
      top: false,
      rk: 0.7,
      extra: (c) => {
        fLens(c, C.skin.dA(0.5), -1.3, -42.4, -1.9, -39.4, 0.4, 0.32);
        if (R.lod >= 2) fLens(c, C.skin.dA(0.3), -1.0, -38.6, 0.8, -38.4, 0.3, 0.16);
      },
    });
    // droplets: shoulder, hood, arm top
    if (R.wet > 0 && R.s >= 6.5) {
      const D = [[0.4, -71.0], [2.6, -70.6], [-1.8, -70.4], [5.4, -77.0], [7.6, -75.4], [8.8, -71.2], [-4.4, -72.6], [3.4, -66.0], [-2.2, -62.0], [0.8, -58.4]];
      for (let i = 0; i < D.length; i++) {
        if (EX.hash(i, 91) > R.wet) continue;
        drop(ctx, R, D[i][0], D[i][1], 0.22 + EX.hash(i, 92) * 0.22);
      }
      const u = (t / 6.2) % 1;
      const a = sstep(0, 0.12, u) * (1 - sstep(0.8, 1, u)) * R.wet;
      if (a > 0.01) drop(ctx, R, 3.5 - u * 0.6, -66 + u * 14, 0.3, a);
    }
  }

  function legsProfile(ctx, R) {
    const C = R.C;
    const J = C.jeans;
    const leg = (dx) => [
      [-5.9 + dx, -46, 1], [6.3 + dx, -46, 1], [6.1 + dx, -40.0], [4.5 + dx, -33.0], [3.0 + dx, -24.6],
      [3.6 + dx, -16.0], [3.0 + dx, -5.0, 1], [-3.4 + dx, -5.0, 1], [-3.6 + dx, -14.0], [-4.3 + dx, -25.0],
      [-5.5 + dx, -36.0],
    ];
    // a chunky sneaker pointing left: rounded toe with a little spring, padded collar at the heel
    const sh = (dx, far) => {
      const P = [
        [-8.3 + dx, -2.0], [-8.5 + dx, -3.6], [-7.4 + dx, -5.0], [-4.9 + dx, -5.9], [-2.2 + dx, -6.9],
        [0.6 + dx, -7.7], [3.3 + dx, -7.7], [4.5 + dx, -6.2], [4.6 + dx, -2.0],
      ];
      part(ctx, R, S(P), C.shoe, {
        sd: [-0.9, -1.0],
        rk: 0.8,
        base: far ? C.shoe.deep : undefined,
        rim: !far,
        extra: (c) => {
          if (far) return;
          // toe cap and the side panel
          fLens(c, C.shoe.sA(0.6), -8.1 + dx, -2.4, -4.9 + dx, -5.4, -1.0, 0.55);
          fLens(c, C.shoe.sA(0.35), -3.6 + dx, -2.6, 2.6 + dx, -3.0, 0.8, 0.45);
          if (R.lod >= 1) {
            // laces along the instep
            c.fillStyle = C.shoe.sA(0.95);
            for (let i = 0; i < 3; i++) {
              c.save();
              c.translate(-3.6 + dx + i * 1.25, -6.1 - i * 0.42);
              c.rotate(-0.36);
              c.fillRect(-0.5, -0.2, 1.0, 0.4);
              c.restore();
            }
          }
          // red heel tab
          c.beginPath();
          rpoly(c, [[3.4 + dx, -7.9], [4.7 + dx, -7.6], [4.8 + dx, -5.0], [3.6 + dx, -5.2]], 0.32);
          c.fillStyle = C.hood.base;
          c.fill();
        },
      });
      const so = [[-9.0 + dx, -2.3], [4.9 + dx, -2.3], [4.9 + dx, 0.05], [-8.2 + dx, 0.05]];
      part(ctx, R, RP(so, 0.95), C.sole, {
        sd: [-0.6, 0],
        rk: 0.6,
        rim: !far,
        base: far ? C.sole.sh : undefined,
        extra: (c) => {
          c.fillStyle = far ? C.shoe.sA(0.35) : C.shoe.sA(0.6);
          c.fillRect(-10 + dx, -2.3, 16, 0.6);
        },
      });
    };
    // far leg, a touch forward and in shadow
    sh(-0.9, true);
    part(ctx, R, S(leg(-1.0)), J, { ds: 0, base: J.sh, rim: false, top: false });
    sh(0.4, false);
    part(ctx, R, S(leg(0.4)), J, {
      sd: [-1.8, -0.4],
      extra: (c) => {
        fLens(c, J.dA(0.45), -4.4, -25.2, 3.2, -24.2, 0.9, 0.4);
        fLens(c, J.dA(0.45), -3.4, -9.2, 3.4, -8.4, 0.9, 0.42);
        fLens(c, J.dA(0.35), -3.2, -7.0, 3.4, -7.2, 0.7, 0.32);
        fLens(c, J.lA(0.45), -5.2, -40.0, -4.2, -30.0, 0.6, 0.7);
        c.fillStyle = J.dA(0.35);
        c.fillRect(-5, -6.3, 10, 1.3);
        stitch(c, R, J.lA(0.45), [[0.6, -45], [0.2, -24], [-0.2, -6]], 0.4, 0.14);
        // back pocket
        c.beginPath();
        rpoly(c, [[3.4, -46], [6.4, -46], [6.2, -38.0], [3.8, -38.4]], 0.6);
        c.fillStyle = J.sA(0.55);
        c.fill();
      },
    });
  }

  // ---------------------------------------------------------------- views
  function drawView(ctx, R, vis) {
    const view = R.view;
    if (view === "front" || view === "back") {
      const back = view === "back";
      if (vis.legs) {
        ctx.save();
        useM(ctx, R.W);
        legs(ctx, R, back);
        ctx.restore();
      }
      if (vis.body) {
        ctx.save();
        useM(ctx, R.B);
        if (!back) {
          hoodBehindFront(ctx, R);
          neck(ctx, R, "front");
          torso(ctx, R, false);
          for (const side of [-1, 1]) sleeve(ctx, R, side, false);
          collarFront(ctx, R);
          stringsFront(ctx, R);
          dropsBody(ctx, R, DROPS_FRONT);
        } else {
          torso(ctx, R, true);
          for (const side of [-1, 1]) sleeve(ctx, R, side, true);
          neck(ctx, R, "back");
          hoodBack(ctx, R);
          dropsBody(ctx, R, DROPS_BACK);
        }
        ctx.restore();
      }
      if (vis.head) {
        ctx.save();
        useM(ctx, R.H);
        if (back) headBack(ctx, R);
        else headFront(ctx, R);
        ctx.restore();
      }
    } else {
      if (vis.legs) {
        ctx.save();
        useM(ctx, R.W);
        legsProfile(ctx, R);
        ctx.restore();
      }
      if (vis.body) {
        ctx.save();
        useM(ctx, R.B);
        neck(ctx, R, "profile");
        bodyProfile(ctx, R);
        ctx.restore();
      }
      if (vis.head) {
        ctx.save();
        useM(ctx, R.H);
        headProfile(ctx, R);
        ctx.restore();
      }
    }
  }

  // what is on screen (in the caller's coordinates): skip legs/body/head that are off-canvas
  function visibility(ctx, R) {
    const vis = { legs: true, body: true, head: true, any: true };
    let inv;
    try {
      inv = ctx.getTransform().inverse();
    } catch (e) {
      return vis;
    }
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const pts = [[0, 0], [cw, 0], [0, ch], [cw, ch]].map((p) => {
      const q = inv.transformPoint({ x: p[0], y: p[1] });
      return [q.x, q.y];
    });
    const minX = Math.min(...pts.map((p) => p[0]));
    const maxX = Math.max(...pts.map((p) => p[0]));
    const minY = Math.min(...pts.map((p) => p[1]));
    const maxY = Math.max(...pts.map((p) => p[1]));
    const box = (m, x0, y0, x1, y1) => {
      const c = [mAp(m, x0, y0), mAp(m, x1, y0), mAp(m, x0, y1), mAp(m, x1, y1)];
      const bx0 = Math.min(...c.map((p) => p[0]));
      const bx1 = Math.max(...c.map((p) => p[0]));
      const by0 = Math.min(...c.map((p) => p[1]));
      const by1 = Math.max(...c.map((p) => p[1]));
      return bx1 >= minX && bx0 <= maxX && by1 >= minY && by0 <= maxY;
    };
    vis.legs = box(R.W, -12, -47, 12, 1);
    vis.body = box(R.B, -21, -81, 21, -36);
    vis.head = box(R.H, -11, -16, 11, 11);
    vis.any = vis.legs || vis.body || vis.head;
    return vis;
  }

  let layer = null;
  function draw(ctx, o) {
    const alpha = o.alpha == null ? 1 : clamp(o.alpha);
    if (alpha <= 0.001) return;
    const R = rig(o);
    const vis = visibility(ctx, R);
    if (!vis.any) return;
    if (alpha >= 0.999) {
      ctx.save();
      drawView(ctx, R, vis);
      ctx.restore();
      return;
    }
    // fade as one flat layer (no see-through overlaps between parts)
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    if (!layer) layer = document.createElement("canvas");
    if (layer.width !== cw || layer.height !== ch) {
      layer.width = cw;
      layer.height = ch;
    }
    const lc = layer.getContext("2d");
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.clearRect(0, 0, cw, ch);
    lc.setTransform(ctx.getTransform());
    drawView(lc, R, vis);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha *= alpha;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }

  function anchors(o) {
    const R = rig(o);
    const Hm = R.H;
    const B = R.B;
    const view = R.view;
    const out = {};
    out.head = mAp(Hm, 0, -1.5);
    out.headR = 11.5 * R.s;
    out.top = mAp(Hm, 0, -14);
    out.feet = mAp(R.W, 0, 0);
    out.neck = mAp(B, 0, -76);
    out.chest = mAp(B, view === "profile" ? -3 : 0, -62);
    out.shoulderL = mAp(B, view === "profile" ? -1.5 : -14.6, -69.5);
    out.shoulderR = mAp(B, view === "profile" ? 4.5 : 14.6, -69.5);
    out.handL = mAp(B, view === "profile" ? 0 : -15.7, -39.5);
    out.handR = mAp(B, view === "profile" ? 0 : 15.7, -39.5);
    out.brain = mAp(Hm, view === "profile" ? 1.2 : 0, -5.2);
    const fy = -2.2 * R.up;
    if (view === "front") {
      const ep = (side) => {
        const x0 = side * 3.05;
        const ph = Math.asin(x0 / 7.7) + R.theta;
        return mAp(Hm, 7.7 * Math.sin(ph) + R.lx * 0.48, 0.55 + fy + R.ly * 0.42);
      };
      out.eyeL = ep(-1);
      out.eyeR = ep(1);
      out.eye = R.theta > 0 ? out.eyeL : R.theta < 0 ? out.eyeR : out.eyeL;
    } else if (view === "profile") {
      out.eye = mAp(Hm, -4.95 + Math.min(0, R.lx) * 0.25, 0.1 + R.ly * 0.4);
      out.eyeL = out.eye;
      out.eyeR = out.eye;
    } else {
      const sd = R.turn >= 0 ? 1 : -1;
      out.eye = mAp(Hm, sd * (5.5 + 2.5 * Math.abs(R.turn)), 0.6);
      out.eyeL = mAp(Hm, -3.05, 0.6);
      out.eyeR = mAp(Hm, 3.05, 0.6);
    }
    return out;
  }

  HOUSE.hero = {
    init: () => Promise.resolve(mats(0)),
    draw,
    anchors,
    blink: blinkAt,
  };
})();

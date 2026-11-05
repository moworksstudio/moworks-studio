/* inj-clinic.js: the night clinic, the syringe, the arm close-up and the medicine drop of
 * "Where the Needle Stops". Classic script; loads after ex/ex-core.js, ex/house-pal.js and
 * story/inj-pal.js (and before the story). Every draw is a pure function of its options.
 *
 *   await HOUSE.clinic.init()    pre-renders the static layers (both rooms, the night sky seen through
 *                             the window, the blurred close-up background, the arm and rolled sleeve,
 *                             the foreground tray and leaves) and the glow sprites. Idempotent.
 *
 *   HOUSE.clinic.back(ctx, { t, shot, push = 0, cam })
 *       full-frame clinic room at night, drawn behind the hero.
 *       shot 'medium' (shot 1): hero waist-up left of centre; X-ray lightbox, blood-pressure gauge,
 *       warm wall lamp and a potted plant on the left; a big window (night city, stars, moon, a
 *       blinking mast, a passing plane) behind his right shoulder; glass cabinet, tiled backsplash
 *       and a counter with jars and boxes on the right.
 *       shot 'wide' (shot 12, title): the same room wider; hero full-length, centred low, in front
 *       of the window; exam couch, clock, lightbox, lamp, cabinet, plant, glossy floor. The top
 *       third (y < 360) is a calm dark wall for the title.
 *       push 0..1 = slow push-in over the shot. Layers part like a dolly about the hero's head:
 *       sky 1 -> 1.02, room 1 -> 1.04, hero 1 -> 1.06, foreground 1 -> 1.09 (wide: .015/.03/.05/.08).
 *       cam (optional) = { zoom = 1, x = 0, y = 0 }: screen = C + (p - C) * zoom + (x, y), C = frame
 *       centre (x, y move the picture). Margins cover zoom >= 1 with pans up to +-60 px.
 *       Ambient life: stars twinkle, city windows switch on and off and TVs flicker, a mast beacon
 *       blinks, a plane crosses, the lamp glow breathes, the lightbox hums, dust motes drift, the
 *       wall clock's second hand ticks (wide).
 *   HOUSE.clinic.front(ctx, { t, shot, push = 0, cam })
 *       in front of the hero. 'medium': the soft-focus edge of a steel tray with cotton balls, an
 *       alcohol wipe packet and a glowing vial at the bottom right; 'wide': dark out-of-focus leaves
 *       in the two bottom corners and a few motes.
 *   HOUSE.clinic.heroAt(shot, push = 0, cam) -> { x, y, h, rimSide }
 *       where to draw HOUSE.hero (x, y = feet centre, h = standing height), same push/cam as back().
 *       medium: { x: 700, y: 1846, h: 1700 } at push 0 ({ 700, 1933, 1802 } at push 1);
 *       wide:   { x: 960, y: 1000, h: 404 } at push 0 ({ 960, 1009, 424 } at push 1).
 *       rimSide = -1 in both (the warm lamp is screen-left). back('wide') draws his floor shadow.
 *   HOUSE.clinic.syringe(ctx, { t, x, y, angle, scale = 1, plunger = 0, fill = 1, glint = 0,
 *                            hand = true, alpha = 1, grip = 'thumb', flip })
 *       (x, y) = needle tip; angle = direction the needle points (0 = right, PI/2 = down).
 *       At scale 1: needle 96 px (bevelled), pink hub, glass barrel 260 x 48 px with white mL ticks,
 *       flange, rod and thumb pad 651 px behind the tip at plunger 0 (475 at plunger 1).
 *       grip 'thumb' (default): index and middle fingers hooked round the barrel at the flange, the
 *       thumb on the pad (it bends as plunger goes 0 -> 1); the glove cuff and a lab-coat sleeve run
 *       off behind. grip 'dart': four fingers round the middle of the barrel, thumb pinching from
 *       behind (the close-up uses it). flip = which side the hand is on; default keeps the hand on
 *       the screen-upper side. plunger slides the rubber stopper to the nozzle and the glowing aqua
 *       column shrinks; fill = share of the space in front of the stopper holding medicine (rest is
 *       air, with a meniscus). glint 0..1 = a star sparkle running down the needle to the tip
 *       (0 or 1 = none). alpha < 1 fades the whole syringe as one flat layer.
 *   HOUSE.clinic.armClose(ctx, { t, cam, press = 0, plunger = 0, withdraw = 0, plaster = 0, sting = 0 })
 *       full-frame extreme close-up: the hero's bare deltoid across the lower frame (cel-shaded skin,
 *       fine hairs, freckles, warm rim), the red sleeve rolled up at the shoulder on the left, the
 *       clinic out of focus behind (bokeh, breathing lamp glow, motes; it moves at half the cam).
 *       The gloved hand and syringe (scale 2.65, dart grip) come from the upper right, needle about
 *       8 deg off the skin's normal. press: 0 = tip 40 px above the skin, 0.2 = touching with a dimple,
 *       1 = in to 88 % of the needle (the buried part is hidden; soft entry ring and a little
 *       redness). Its shadow on the skin closes in on the tip as it lands. plunger pushes.
 *       withdraw 0..1: the needle is out by 0.3 (a pin-prick dot shows), then the hand leaves
 *       up-right off-frame by 1; it works whatever press is. plaster 0..1: a plaster pops on
 *       (HOUSE.backOut over 0..0.62) with a sparkle peaking near 0.6 and gone by 1. sting 0..1: pinch
 *       flash, ripple rings and pinch marks at the site; peaks at 0.12 and is gone by 1.
 *   HOUSE.clinic.armCloseAnchors(opts) -> { site, barrel, barrelTo, dropsRow, tip }
 *       screen points under opts.cam (same opts as armClose). site = injection point (880, 677);
 *       barrel = a point on the barrel's right edge by the medicine column (moves with press and
 *       withdraw; (1059, 453) at press 1); barrelTo = a clear spot for that label's pill, below the
 *       hand and above the arm (barrel + (250, 120)); dropsRow = (620, 292), the centre of a clear
 *       560 x 120 band above the sleeve for ten drops 54 px apart (room for a pill 92 px above);
 *       tip = needle tip (may be under the skin).
 *   HOUSE.clinic.drop(ctx, { x, y, r = 22, k = 1, t })
 *       one glowing aqua medicine drop: (x, y) = centre of its round bottom, the point reaches
 *       y - 2.15 r. Pops in with a back.out overshoot and a ring as k goes 0 -> 1; wobbles and bobs
 *       gently with t (pass t + i * 0.37 to desync a row).
 *   HOUSE.clinic.shots   per-shot constants (hero placement, pivots, push rates)
 *
 * Local colours (not in HOUSE.pal): plant leaves (LEAF*), the moon (MOON*), the nurse's lab-coat
 * sleeve (COAT*), the needle-hub plastic (HUB*). Everything else reads HOUSE.pal / HOUSE.light.
 * No text is drawn. No Math.random / Date.now / state between calls (EX.hash / EX.noise1 / EX.rng).
 */
(function () {
  "use strict";
  const HOUSE = (window.HOUSE = window.HOUSE || {});
  const W = 1920;
  const H = 1080;
  const CX = W / 2;
  const CY = H / 2;
  const TAU = Math.PI * 2;
  const M = 72; // margin of the static layers around the frame (design px)
  const RS = 1.12; // static layers are rendered 12 % larger than the frame so pushes stay sharp

  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };
  const fract = (x) => x - Math.floor(x);
  const hsh = (i, j = 0, k = 0) => EX.hash(i, j, k);
  const nz = (x, s = 0) => EX.noise1(x, s);
  const HX = (c) => (Array.isArray(c) ? c : EX.hex(c));
  const mix = (a, b, k) => EX.mix(HX(a), HX(b), clamp(k));
  const rgba = (c, a = 1) => EX.rgba(HX(c), a);
  const css = (c) => rgba(c, 1);
  const P = () => HOUSE.pal;
  const WHITE = [255, 255, 255];
  const mkc = (w, h) => {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };
  const KEY = (() => {
    const k = (HOUSE.light && HOUSE.light.key) || [-0.6, -0.8];
    const l = Math.hypot(k[0], k[1]) || 1;
    return [k[0] / l, k[1] / l];
  })();

  // local colours (see header)
  const LEAF = "#2a9a8e";
  const LEAF_SH = "#1c607c";
  const LEAF_DEEP = "#173d68";
  const LEAF_RIM = "#9cf5d6";
  const LEAF_VEIN = "#62d6b6";
  const MOON = "#fff1da";
  const MOON_SH = "#f1cfae";
  const COAT = "#e2dcff";
  const COAT_SH = "#a495e8";
  const COAT_DEEP = "#7563c9";
  const HUB = "#ff6fc4";
  const HUB_SH = "#c93a9e";
  const HUB_LT = "#ffc0ea";

  // ---------------------------------------------------------------- path helpers
  function rrect(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  const RR = (x, y, w, h, r) => (g, dx = 0, dy = 0) => rrect(g, x + dx, y + dy, w, h, r);
  const ELL = (x, y, rx, ry, rot = 0) => (g, dx = 0, dy = 0) => {
    g.moveTo(x + dx + rx * Math.cos(rot), y + dy + rx * Math.sin(rot));
    g.ellipse(x + dx, y + dy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
    g.closePath();
  };
  const POLY = (pts) => (g, dx = 0, dy = 0) => {
    g.moveTo(pts[0][0] + dx, pts[0][1] + dy);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] + dx, pts[i][1] + dy);
    g.closePath();
  };
  // closed Catmull-Rom spline through [x, y, sharp?]
  function splPath(g, p, dx = 0, dy = 0) {
    const n = p.length;
    const K = 1 / 6;
    g.moveTo(p[0][0] + dx, p[0][1] + dy);
    for (let i = 0; i < n; i++) {
      const a = p[(i + n - 1) % n];
      const b = p[i];
      const c = p[(i + 1) % n];
      const d = p[(i + 2) % n];
      const kb = b[2] ? 0 : K;
      const kc = c[2] ? 0 : K;
      g.bezierCurveTo(
        b[0] + (c[0] - a[0]) * kb + dx, b[1] + (c[1] - a[1]) * kb + dy,
        c[0] - (d[0] - b[0]) * kc + dx, c[1] - (d[1] - b[1]) * kc + dy,
        c[0] + dx, c[1] + dy,
      );
    }
    g.closePath();
  }
  const SPL = (p) => (g, dx = 0, dy = 0) => splPath(g, p, dx, dy);
  // a capsule along a polyline with per-point widths (round caps)
  function capsule(g, pts, ws, dx = 0, dy = 0) {
    const n = pts.length;
    const Lp = [];
    const Rp = [];
    for (let i = 0; i < n; i++) {
      let nx = 0;
      let ny = 0;
      if (i > 0) {
        const ax = pts[i][0] - pts[i - 1][0];
        const ay = pts[i][1] - pts[i - 1][1];
        const l = Math.hypot(ax, ay) || 1;
        nx += -ay / l;
        ny += ax / l;
      }
      if (i < n - 1) {
        const ax = pts[i + 1][0] - pts[i][0];
        const ay = pts[i + 1][1] - pts[i][1];
        const l = Math.hypot(ax, ay) || 1;
        nx += -ay / l;
        ny += ax / l;
      }
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      const w = ws[i] / 2;
      Lp.push([pts[i][0] + nx * w + dx, pts[i][1] + ny * w + dy]);
      Rp.push([pts[i][0] - nx * w + dx, pts[i][1] - ny * w + dy]);
    }
    g.moveTo(Lp[0][0], Lp[0][1]);
    for (let i = 1; i < n; i++) {
      if (i < n - 1) {
        const mx = (Lp[i][0] + Lp[i + 1][0]) / 2;
        const my = (Lp[i][1] + Lp[i + 1][1]) / 2;
        g.quadraticCurveTo(Lp[i][0], Lp[i][1], mx, my);
      } else g.lineTo(Lp[i][0], Lp[i][1]);
    }
    const e = [pts[n - 1][0] + dx, pts[n - 1][1] + dy];
    const ae = Math.atan2(Lp[n - 1][1] - e[1], Lp[n - 1][0] - e[0]);
    g.arc(e[0], e[1], ws[n - 1] / 2, ae, ae - Math.PI, true);
    for (let i = n - 2; i >= 0; i--) {
      if (i > 0) {
        const mx = (Rp[i][0] + Rp[i - 1][0]) / 2;
        const my = (Rp[i][1] + Rp[i - 1][1]) / 2;
        g.quadraticCurveTo(Rp[i][0], Rp[i][1], mx, my);
      } else g.lineTo(Rp[i][0], Rp[i][1]);
    }
    const s = [pts[0][0] + dx, pts[0][1] + dy];
    const as = Math.atan2(Rp[0][1] - s[1], Rp[0][0] - s[0]);
    g.arc(s[0], s[1], ws[0] / 2, as, as - Math.PI, true);
    g.closePath();
  }
  const CAP = (pts, ws) => (g, dx = 0, dy = 0) => capsule(g, pts, ws, dx, dy);
  // a lens from A to B bowing by bend, thickness w
  function lens(g, ax, ay, bx, by, bend, w) {
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    let nx = -(by - ay);
    let ny = bx - ax;
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    g.moveTo(ax, ay);
    g.quadraticCurveTo(mx + nx * (bend + w), my + ny * (bend + w), bx, by);
    g.quadraticCurveTo(mx + nx * (bend - w), my + ny * (bend - w), ax, ay);
    g.closePath();
  }
  function fLens(g, col, ax, ay, bx, by, bend, w) {
    g.beginPath();
    lens(g, ax, ay, bx, by, bend, w);
    g.fillStyle = col;
    g.fill();
  }
  function fEll(g, col, x, y, rx, ry, rot = 0) {
    g.beginPath();
    g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
    g.fillStyle = col;
    g.fill();
  }
  function fRR(g, col, x, y, w, h, r) {
    g.beginPath();
    rrect(g, x, y, w, h, r);
    g.fillStyle = col;
    g.fill();
  }

  // ---------------------------------------------------------------- cel shading
  // fill shape \ (shape shifted by d) inside the current clip: the band on the side opposite to d
  function cres(g, shape, dx, dy, col) {
    g.beginPath();
    g.rect(-6000, -6000, 12000, 12000);
    shape(g, dx, dy);
    g.fillStyle = col;
    g.fill("evenodd");
  }
  /** lit fill, one hard shadow away from the light (L points toward it), extras, cool rim on the
   * shadow edge, warm/bright rim on the lit edge. m = { base, sh, deep?, rim?, cool? } */
  function cel(g, shape, m, o = {}) {
    const L = o.L || KEY;
    g.beginPath();
    shape(g, 0, 0);
    g.fillStyle = m.base;
    g.fill();
    g.save();
    g.clip();
    const ds = o.ds == null ? 6 : o.ds;
    if (ds && m.sh) cres(g, shape, L[0] * ds, L[1] * ds, m.sh);
    if (o.dd && m.deep) cres(g, shape, L[0] * o.dd, L[1] * o.dd, m.deep);
    if (o.extra) o.extra(g);
    const rw = o.rw == null ? 2.5 : o.rw;
    if (rw && m.cool) cres(g, shape, L[0] * rw * 0.8, L[1] * rw * 0.8, m.cool);
    if (rw && m.rim) cres(g, shape, -L[0] * rw, -L[1] * rw, m.rim);
    g.restore();
  }
  const MAT = {};
  function mats() {
    const p = P();
    const cool = mix(HOUSE.light.cool, WHITE, 0.25);
    const warm = mix(p.lamp, HOUSE.light.rim, 0.35);
    MAT.furn = { base: css(p.furniture), sh: css(p.furnitureShade), rim: css(p.furnitureRim), cool: rgba(cool, 0.35) };
    MAT.furnLit = { base: css(mix(p.furniture, p.furnitureRim, 0.22)), sh: css(p.furniture), rim: css(mix(p.furnitureRim, WHITE, 0.25)), cool: rgba(cool, 0.3) };
    MAT.plastic = { base: css(p.plunger), sh: css(p.plungerShade), deep: css(mix(p.plungerShade, p.rubber, 0.4)), rim: css(WHITE), cool: rgba(mix(p.screen, WHITE, 0.4), 0.8) };
    MAT.leaf = { base: css(LEAF), sh: css(LEAF_SH), deep: css(LEAF_DEEP), rim: css(LEAF_RIM), cool: rgba(mix(LEAF_SH, cool, 0.5), 0.8) };
    MAT.glove = { base: css(p.glove), sh: css(p.gloveShade), deep: css(p.gloveDeep), rim: css(mix(p.gloveLight, WHITE, 0.45)), cool: rgba(mix(p.gloveShade, p.sparkCyan, 0.55), 0.95) };
    MAT.coat = { base: css(COAT), sh: css(COAT_SH), deep: css(COAT_DEEP), rim: css(WHITE), cool: rgba(mix(COAT_SH, p.sparkCyan, 0.4), 0.9) };
    MAT.hub = { base: css(HUB), sh: css(HUB_SH), rim: css(HUB_LT), cool: rgba(mix(HUB_SH, p.sparkCyan, 0.4), 0.8) };
    MAT.hood = { base: css(p.hoodie), sh: css(p.hoodieShade), deep: css(p.hoodieDeep), rim: css(mix(p.hoodieLight, warm, 0.3)), cool: rgba(mix(p.hoodieShade, cool, 0.45), 0.9) };
    MAT.rib = { base: css(mix(p.hoodie, p.hoodieShade, 0.42)), sh: css(mix(p.hoodieShade, p.hoodieDeep, 0.35)), deep: css(p.hoodieDeep), rim: css(p.hoodieLight), cool: rgba(mix(p.hoodieShade, cool, 0.45), 0.9) };
    MAT.steel = { base: css(p.steel), sh: css(p.steelShade), rim: css(WHITE), cool: rgba(mix(p.steelShade, p.sparkCyan, 0.5), 0.9) };
    MAT.warm = warm;
    MAT.cool = cool;
  }

  // ---------------------------------------------------------------- sprites
  const SPR = {};
  function radial(size, stops) {
    const c = mkc(size, size);
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [o, col] of stops) gr.addColorStop(o, col);
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }
  const glowSpr = (col, a = 1) =>
    radial(128, [[0, rgba(col, a)], [0.18, rgba(col, 0.6 * a)], [0.45, rgba(col, 0.2 * a)], [0.75, rgba(col, 0.05 * a)], [1, rgba(col, 0)]]);
  function glintSprite(col) {
    const s = 128;
    const c = mkc(s, s);
    const g = c.getContext("2d");
    const h = s / 2;
    const core = g.createRadialGradient(h, h, 0, h, h, h * 0.42);
    core.addColorStop(0, "rgba(255,255,255,0.95)");
    core.addColorStop(0.12, rgba(col, 0.75));
    core.addColorStop(0.4, rgba(col, 0.18));
    core.addColorStop(1, rgba(col, 0));
    g.fillStyle = core;
    g.fillRect(0, 0, s, s);
    for (const dx of [1, 0]) {
      const gr = dx ? g.createLinearGradient(0, h, s, h) : g.createLinearGradient(h, 0, h, s);
      gr.addColorStop(0, rgba(col, 0));
      gr.addColorStop(0.34, rgba(col, 0.55));
      gr.addColorStop(0.5, "rgba(255,255,255,1)");
      gr.addColorStop(0.66, rgba(col, 0.55));
      gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr;
      g.beginPath();
      if (dx) {
        g.moveTo(0, h);
        g.lineTo(h, h - 2.4);
        g.lineTo(s, h);
        g.lineTo(h, h + 2.4);
      } else {
        g.moveTo(h, 0);
        g.lineTo(h + 2.4, h);
        g.lineTo(h, s);
        g.lineTo(h - 2.4, h);
      }
      g.closePath();
      g.fill();
    }
    return c;
  }
  function bokehSprite(col) {
    const s = 128;
    const c = mkc(s, s);
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, rgba(col, 0.42));
    gr.addColorStop(0.7, rgba(col, 0.5));
    gr.addColorStop(0.88, rgba(col, 0.72));
    gr.addColorStop(0.95, rgba(col, 0.45));
    gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
    return c;
  }

  // ---------------------------------------------------------------- static layers
  function layer(x0, y0, x1, y1, rs = RS) {
    const c = mkc((x1 - x0) * rs, (y1 - y0) * rs);
    const g = c.getContext("2d");
    g.setTransform(rs, 0, 0, rs, -x0 * rs, -y0 * rs);
    return { c, g, x0, y0, x1, y1 };
  }
  function blit(ctx, L) {
    ctx.drawImage(L.c, L.x0, L.y0, L.x1 - L.x0, L.y1 - L.y0);
  }
  /** screen transform [a, e, f] (uniform scale a): push zoom z about pivot, then the cam. */
  function xf(z, pv, cam) {
    const cz = (cam && cam.zoom) || 1;
    const cx = (cam && cam.x) || 0;
    const cy = (cam && cam.y) || 0;
    return [cz * z, cz * pv[0] * (1 - z) + CX * (1 - cz) + cx, cz * pv[1] * (1 - z) + CY * (1 - cz) + cy];
  }
  const ap = (T, x, y) => [T[0] * x + T[1], T[0] * y + T[2]];
  const setT = (ctx, T) => ctx.setTransform(T[0], 0, 0, T[0], T[1], T[2]);

  // ---------------------------------------------------------------- shot constants
  const SHOTS = {
    medium: {
      hero: { x: 700, y: 1846, h: 1700 },
      pivot: [700, 400],
      z: { sky: 0.02, room: 0.04, hero: 0.06, front: 0.09 },
      rimSide: -1,
    },
    wide: {
      hero: { x: 960, y: 1000, h: 404 },
      pivot: [960, 820],
      z: { sky: 0.015, room: 0.03, hero: 0.05, front: 0.08 },
      rimSide: -1,
    },
  };

  // ================================================================ the night sky (window)
  function buildSky(win, seed, k) {
    const p = P();
    const m = 110;
    const L = layer(win.x0 - m, win.y0 - m, win.x1 + m, win.y1 + m);
    const g = L.g;
    const X0 = L.x0;
    const Y0 = L.y0;
    const X1 = L.x1;
    const Y1 = L.y1;
    const Wd = X1 - X0;
    const Hd = Y1 - Y0;
    const base = win.y1 + 26 * k; // building feet, hidden by the sill
    const hz = win.y1 - 70 * k; // where the city glow is hottest
    const rel = (y) => clamp((y - Y0) / Hd);
    let gr = g.createLinearGradient(0, Y0, 0, Y1);
    gr.addColorStop(0, p.sky[0]);
    gr.addColorStop(rel(win.y0 + (hz - win.y0) * 0.35), p.sky[1]);
    gr.addColorStop(rel(win.y0 + (hz - win.y0) * 0.7), p.sky[3]);
    gr.addColorStop(rel(hz - 60 * k), css(mix(p.sky[3], p.glow[1], 0.7)));
    gr.addColorStop(rel(hz + 30 * k), p.glow[2]);
    gr.addColorStop(1, p.glow[2]);
    g.fillStyle = gr;
    g.fillRect(X0, Y0, Wd, Hd);
    // sky pool, upper right
    g.save();
    g.translate(X0 + Wd * 0.7, Y0 + Hd * 0.25);
    g.scale(1.4, 1);
    let rg = g.createRadialGradient(0, 0, 0, 0, 0, Wd * 0.4);
    rg.addColorStop(0, p.skyPool);
    rg.addColorStop(1, "rgba(70,40,190,0)");
    g.fillStyle = rg;
    g.fillRect(-Wd, -Wd, Wd * 2, Wd * 2);
    g.restore();
    // horizon glow, hottest left of centre
    g.save();
    g.translate(X0 + Wd * 0.34, hz);
    g.scale(1, 0.55);
    rg = g.createRadialGradient(0, 0, 0, 0, 0, Wd * 0.75);
    rg.addColorStop(0, rgba(p.glow[4], 0.95));
    rg.addColorStop(0.1, rgba(p.glow[3], 0.8));
    rg.addColorStop(0.3, rgba(p.glow[2], 0.5));
    rg.addColorStop(0.62, rgba(p.glow[1], 0.18));
    rg.addColorStop(1, rgba(p.glow[1], 0));
    g.fillStyle = rg;
    g.fillRect(-Wd * 2, -Wd * 2, Wd * 4, Wd * 4);
    g.restore();

    const r = EX.rng(seed);
    // stars
    const tw = [];
    for (let i = 0; i < 190; i++) {
      const x = X0 + r() * Wd;
      const y = Y0 + Math.pow(r(), 1.45) * (hz - 150 * k - Y0);
      const s = (0.55 + r() * r() * 1.7) * k;
      const c = p.star[Math.min(2, Math.floor(r() * 3))];
      g.fillStyle = rgba(c, 0.45 + 0.55 * r());
      g.beginPath();
      g.arc(x, y, s, 0, TAU);
      g.fill();
      if (r() < 0.1) tw.push({ x, y, s: (9 + r() * 16) * k, ph: r() * TAU, w: 0.5 + r() * 1.3, c: r() < 0.35 ? 1 : 0 });
    }
    // soft cloud wisps
    for (let i = 0; i < 4; i++) {
      const cx = X0 + Wd * (0.1 + 0.8 * r());
      const cy = win.y0 + (hz - win.y0) * (0.3 + 0.35 * r());
      const w = (200 + 160 * r()) * k;
      g.save();
      g.translate(cx, cy);
      g.scale(1, 0.12);
      rg = g.createRadialGradient(0, 0, 0, 0, 0, w);
      rg.addColorStop(0, rgba(p.cloudMid, 0.55));
      rg.addColorStop(0.6, rgba(p.cloudMid, 0.25));
      rg.addColorStop(1, rgba(p.cloudMid, 0));
      g.fillStyle = rg;
      g.fillRect(-w, -w, 2 * w, 2 * w);
      g.translate(0, 0.35 * w);
      rg = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.8);
      rg.addColorStop(0, rgba(p.glow[3], 0.18));
      rg.addColorStop(1, rgba(p.glow[3], 0));
      g.fillStyle = rg;
      g.fillRect(-w, -w, 2 * w, 2 * w);
      g.restore();
    }
    // moon: warm crescent with earthshine and a soft halo
    const mx = X0 + Wd * 0.74;
    const my = win.y0 + (hz - win.y0) * 0.24;
    const mr = 30 * k;
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.5;
    g.drawImage(SPR.moonGlow, mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.save();
    g.beginPath();
    g.arc(mx, my, mr, 0, TAU);
    g.clip();
    g.fillStyle = MOON;
    g.fill();
    fEll(g, rgba(MOON_SH, 0.7), mx - mr * 0.35, my + mr * 0.3, mr * 0.18, mr * 0.15);
    fEll(g, rgba(MOON_SH, 0.6), mx - mr * 0.62, my - mr * 0.12, mr * 0.11, mr * 0.1);
    fEll(g, rgba(MOON_SH, 0.5), mx - mr * 0.1, my + mr * 0.66, mr * 0.12, mr * 0.09);
    fEll(g, css(mix(p.sky[1], p.sky[3], 0.45)), mx + mr * 0.44, my - mr * 0.3, mr * 0.96, mr * 0.96);
    g.restore();

    // far skyline (lit by the glow from the left: pink ridge on the tops)
    const farCol = css(mix(p.hillFar, p.glow[1], 0.35));
    const farPath = new Path2D();
    const farRim = new Path2D();
    const farDots = [];
    let x = X0 - 10;
    while (x < X1) {
      const w = (16 + r() * 34) * k;
      const hh = (80 + r() * r() * 150) * k;
      const top = base - 100 * k - hh;
      farPath.rect(x, top, w + 1, base - top);
      farRim.rect(x, top, w, 2.2 * k);
      if (r() < 0.18) {
        farPath.moveTo(x + w / 2 - 2 * k, top);
        farPath.lineTo(x + w / 2, top - 30 * k);
        farPath.lineTo(x + w / 2 + 2 * k, top);
        farPath.closePath();
      }
      for (let j = 0; j < 3; j++) if (r() < 0.6) farDots.push([x + r() * w, top + 8 * k + r() * hh]);
      x += w + r() * 3 * k;
    }
    g.fillStyle = farCol;
    g.fill(farPath);
    g.fillStyle = rgba(p.hillFarRidge, 0.85);
    g.fill(farRim);
    g.fillStyle = rgba(p.window[0], 0.55);
    for (const d of farDots) g.fillRect(d[0], d[1], 2.2 * k, 2.4 * k);
    // haze between the layers
    gr = g.createLinearGradient(0, base - 260 * k, 0, base - 60 * k);
    gr.addColorStop(0, rgba(p.glow[2], 0));
    gr.addColorStop(1, rgba(p.glow[2], 0.42));
    g.fillStyle = gr;
    g.fillRect(X0, base - 260 * k, Wd, 200 * k);

    // near skyline with windows, rooftop props, beacons
    const wins = [];
    const beacons = [];
    const nearCol = css(p.hillMid);
    const nearRim = css(p.hillMidRim);
    const sideRim = css(mix(p.hillNearRim, p.glow[3], 0.3));
    x = X0 - 20;
    let bi = 0;
    while (x < X1) {
      const w = (44 + r() * 70) * k;
      const edge = Math.min(Math.abs(x - X0), Math.abs(X1 - x)) / Wd;
      const hh = (70 + r() * 120 + 90 * sstep(0.3, 0, edge)) * k;
      const top = base - hh;
      const cut = r() < 0.3 ? 8 * k : 0;
      // body
      g.fillStyle = nearCol;
      g.beginPath();
      g.moveTo(x, base);
      g.lineTo(x, top + cut);
      g.lineTo(x + cut, top);
      g.lineTo(x + w, top);
      g.lineTo(x + w, base);
      g.closePath();
      g.fill();
      // shadow side (right) and rims
      g.fillStyle = rgba(p.hillNear, 0.55);
      g.fillRect(x + w * 0.72, top, w * 0.28, base - top);
      g.fillStyle = nearRim;
      g.fillRect(x + cut, top, w - cut, 2.4 * k);
      g.fillStyle = sideRim;
      g.fillRect(x, top + cut, 2 * k, base - top - cut);
      // windows
      const cols = Math.max(1, Math.floor((w - 10 * k) / (11 * k)));
      const rows = Math.max(1, Math.floor((hh - 18 * k) / (14 * k)));
      const ox = x + (w - cols * 11 * k) / 2 + 3 * k;
      for (let c = 0; c < cols; c++) {
        for (let rr = 0; rr < rows; rr++) {
          const wx = ox + c * 11 * k;
          const wy = top + 10 * k + rr * 14 * k;
          if (wy > base - 30 * k) continue;
          const v = r();
          const lit = v < 0.3;
          const col = r() < 0.72 ? p.window[0] : r() < 0.5 ? p.window[1] : r() < 0.6 ? p.sparkCyan : p.sparkPink;
          if (lit) {
            g.fillStyle = css(col);
            g.fillRect(wx, wy, 5 * k, 6.5 * k);
          } else {
            g.fillStyle = rgba(p.hillMidRim, 0.4);
            g.fillRect(wx, wy, 5 * k, 6.5 * k);
          }
          if (r() < 0.16) wins.push({ x: wx, y: wy, w: 5 * k, h: 6.5 * k, c: col, id: wins.length + seed * 1000, tv: r() < 0.12, lit });
        }
      }
      // rooftop props
      const prop = r();
      if (prop < 0.22 && hh > 120 * k) {
        // antenna mast with a beacon
        const ax = x + w * (0.3 + 0.4 * r());
        const ah = (40 + 30 * r()) * k;
        g.fillStyle = nearCol;
        g.fillRect(ax - 1.4 * k, top - ah, 2.8 * k, ah);
        g.fillRect(ax - 7 * k, top - ah * 0.55, 14 * k, 1.6 * k);
        beacons.push({ x: ax, y: top - ah, ph: r() * TAU, id: bi++ });
      } else if (prop < 0.4) {
        // water tower
        const tx = x + w * (0.2 + 0.5 * r());
        g.fillStyle = nearCol;
        g.fillRect(tx - 9 * k, top - 10 * k, 2 * k, 10 * k);
        g.fillRect(tx + 7 * k, top - 10 * k, 2 * k, 10 * k);
        g.beginPath();
        rrect(g, tx - 11 * k, top - 30 * k, 22 * k, 21 * k, 3 * k);
        g.fill();
        g.beginPath();
        g.moveTo(tx - 12 * k, top - 30 * k);
        g.lineTo(tx, top - 38 * k);
        g.lineTo(tx + 12 * k, top - 30 * k);
        g.closePath();
        g.fill();
        g.fillStyle = nearRim;
        g.fillRect(tx - 11 * k, top - 30 * k, 2 * k, 21 * k);
      } else if (prop < 0.6) {
        g.fillStyle = nearCol;
        g.fillRect(x + w * 0.15, top - 9 * k, w * 0.28, 9 * k);
        g.fillStyle = nearRim;
        g.fillRect(x + w * 0.15, top - 9 * k, w * 0.28, 1.8 * k);
      }
      x += w + (2 + r() * 10) * k;
    }
    return { L, tw, wins, beacons, win, k, plane: { y: win.y0 + (hz - win.y0) * 0.14, x0: X0, x1: X1 } };
  }

  function drawSkyLive(ctx, S, t) {
    const p = P();
    blit(ctx, S.L);
    ctx.globalCompositeOperation = "lighter";
    for (const s of S.tw) {
      const v = 0.5 + 0.5 * Math.sin(t * s.w * 2.1 + s.ph);
      const sz = s.s * (0.55 + 0.55 * v);
      ctx.globalAlpha = 0.25 + 0.75 * v;
      ctx.drawImage(SPR.glint[s.c], s.x - sz, s.y - sz, sz * 2, sz * 2);
    }
    // city windows switching on and off (each on its own slow clock), a few TVs flicker
    for (const w of S.wins) {
      const per = 2.6 + 5 * hsh(w.id, 3);
      const off = hsh(w.id, 4) * per;
      const u = (t + off) / per;
      const sl = Math.floor(u);
      const on = (n) => (hsh(w.id, n, 7) < (w.lit ? 0.75 : 0.35) ? 1 : 0);
      const v = lerp(on(sl - 1), on(sl), sstep(0, 0.25 / per, u - sl));
      if (v <= 0.01) continue;
      let a = v;
      let col = w.c;
      if (w.tv) {
        a *= 0.55 + 0.45 * nz(t * 9 + w.id, 5);
        col = mix(p.sparkCyan, WHITE, 0.3);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = a;
      ctx.fillStyle = css(col);
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.4 * a;
      const hs = w.w * 4.2;
      ctx.drawImage(SPR.winHalo, w.x + w.w / 2 - hs, w.y + w.h / 2 - hs, hs * 2, hs * 2);
    }
    // aircraft beacons on the masts
    for (const b of S.beacons) {
      const ph = fract(t * 0.62 + b.ph / TAU);
      const v = ph < 0.18 ? Math.sin((ph / 0.18) * Math.PI) : 0;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.5 + 0.5 * v;
      ctx.fillStyle = css(mix(p.artery, WHITE, 0.2 * v));
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.4 * S.k, 0, TAU);
      ctx.fill();
      if (v > 0.02) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = v * 0.9;
        const hs = 16 * S.k;
        ctx.drawImage(SPR.redHalo, b.x - hs, b.y - hs, hs * 2, hs * 2);
      }
    }
    // a plane crossing slowly, strobe + nav lights
    const pl = S.plane;
    const u = fract(t / 46 + 0.32);
    const px = lerp(pl.x0, pl.x1, u);
    const py = pl.y - 30 * S.k * u;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = css(p.star[2]);
    ctx.fillRect(px - 1.2 * S.k, py - 1, 2.4 * S.k, 2);
    const st = fract(t * 1.1) < 0.08 ? 1 : 0;
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.5 + 0.5 * st;
    const hs = (6 + 10 * st) * S.k;
    ctx.drawImage(SPR.glint[0], px - hs, py - hs, hs * 2, hs * 2);
    ctx.globalAlpha = 0.8;
    ctx.drawImage(SPR.redHalo, px - 7 * S.k - 5 * S.k, py - 5 * S.k, 10 * S.k, 10 * S.k);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  // ================================================================ room props
  function pool(g, x, y, r, col, a, sy = 1) {
    g.save();
    g.translate(x, y);
    g.scale(1, sy);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, r);
    rg.addColorStop(0, rgba(col, a));
    rg.addColorStop(0.3, rgba(col, a * 0.5));
    rg.addColorStop(0.65, rgba(col, a * 0.14));
    rg.addColorStop(1, rgba(col, 0));
    g.fillStyle = rg;
    g.fillRect(-r, -r, r * 2, r * 2);
    g.restore();
  }
  function wallFill(g, x0, y0, x1, y1, floorY) {
    const p = P();
    const gr = g.createLinearGradient(0, y0, 0, floorY);
    gr.addColorStop(0, p.wall[0]);
    gr.addColorStop(0.5, p.wall[1]);
    gr.addColorStop(1, p.wall[2]);
    g.fillStyle = gr;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  // vertical panel seams and a dado rail with a lower panel
  function wallPanels(g, x0, x1, y0, railY, y1, k, seamStep) {
    const p = P();
    g.fillStyle = rgba(p.wall[0], 0.28);
    for (let x = x0 + seamStep * 0.5; x < x1; x += seamStep) g.fillRect(x, y0, 2.2 * k, railY - y0);
    g.fillStyle = rgba(p.furnitureRim, 0.07);
    for (let x = x0 + seamStep * 0.5; x < x1; x += seamStep) g.fillRect(x + 2.2 * k, y0, 1.4 * k, railY - y0);
    // lower panel
    const gr = g.createLinearGradient(0, railY, 0, y1);
    gr.addColorStop(0, css(mix(p.wall[2], p.furniture, 0.55)));
    gr.addColorStop(1, css(mix(p.wall[2], p.furnitureShade, 0.6)));
    g.fillStyle = gr;
    g.fillRect(x0, railY, x1 - x0, y1 - railY);
    // rail: lit top face, front, shadow under
    g.fillStyle = rgba(p.wall[0], 0.45);
    g.fillRect(x0, railY + 12 * k, x1 - x0, 7 * k);
    g.fillStyle = css(p.furniture);
    g.fillRect(x0, railY, x1 - x0, 12 * k);
    g.fillStyle = css(mix(p.furnitureRim, WHITE, 0.15));
    g.fillRect(x0, railY, x1 - x0, 2.4 * k);
    // lower panel mouldings
    g.strokeStyle = rgba(p.furnitureRim, 0.16);
    g.lineWidth = 2 * k;
    for (let x = x0 + seamStep * 0.08; x < x1 - seamStep * 0.3; x += seamStep * 0.62) {
      g.beginPath();
      rrect(g, x, railY + 36 * k, seamStep * 0.5, y1 - railY - 70 * k, 6 * k);
      g.stroke();
    }
  }

  // ---- window: frame, reveals, mullions, blind, glass sheen, sill; cuts the panes out of the layer
  function windowFrame(g, R, k, o = {}) {
    const p = P();
    const ft = 24 * k;
    const ox0 = R.x0 + ft;
    const oy0 = R.y0 + ft;
    const ox1 = R.x1 - ft;
    const oy1 = R.y1 - ft;
    // drop shadow on the wall
    g.fillStyle = rgba(p.wall[0], 0.5);
    g.beginPath();
    rrect(g, R.x0 + 12 * k, R.y0 + 16 * k, R.x1 - R.x0, R.y1 - R.y0, 6 * k);
    g.fill();
    // frame body
    const outer = RR(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0, 6 * k);
    cel(g, outer, MAT.furnLit, { ds: 6 * k, rw: 3 * k });
    // cut the opening
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = "#000";
    g.fillRect(ox0, oy0, ox1 - ox0, oy1 - oy0);
    g.globalCompositeOperation = "source-over";
    // reveals: top/left faces in shadow, bottom/right faces lit
    const rv = 11 * k;
    g.fillStyle = css(p.furnitureShade);
    g.beginPath();
    g.moveTo(ox0, oy0);
    g.lineTo(ox1, oy0);
    g.lineTo(ox1 - rv, oy0 + rv);
    g.lineTo(ox0 + rv, oy0 + rv);
    g.closePath();
    g.fill();
    g.fillStyle = css(mix(p.furnitureShade, p.furniture, 0.5));
    g.beginPath();
    g.moveTo(ox0, oy0);
    g.lineTo(ox0 + rv, oy0 + rv);
    g.lineTo(ox0 + rv, oy1 - rv);
    g.lineTo(ox0, oy1);
    g.closePath();
    g.fill();
    g.fillStyle = css(mix(p.furniture, p.furnitureRim, 0.45));
    g.beginPath();
    g.moveTo(ox0, oy1);
    g.lineTo(ox0 + rv, oy1 - rv);
    g.lineTo(ox1 - rv, oy1 - rv);
    g.lineTo(ox1, oy1);
    g.closePath();
    g.fill();
    g.fillStyle = css(mix(p.furniture, p.furnitureRim, 0.3));
    g.beginPath();
    g.moveTo(ox1, oy0);
    g.lineTo(ox1, oy1);
    g.lineTo(ox1 - rv, oy1 - rv);
    g.lineTo(ox1 - rv, oy0 + rv);
    g.closePath();
    g.fill();
    const ix0 = ox0 + rv;
    const iy0 = oy0 + rv;
    const ix1 = ox1 - rv;
    const iy1 = oy1 - rv;
    // glass sheen streaks (on the cut-out panes)
    g.save();
    g.beginPath();
    g.rect(ix0, iy0, ix1 - ix0, iy1 - iy0);
    g.clip();
    g.fillStyle = "rgba(255,255,255,0.045)";
    g.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
    const sw = ix1 - ix0;
    for (const [a, b, al] of [[0.08, 0.2, 0.07], [0.25, 0.3, 0.05], [0.58, 0.7, 0.06], [0.75, 0.78, 0.045]]) {
      g.fillStyle = `rgba(255,255,255,${al})`;
      g.beginPath();
      g.moveTo(ix0 + sw * a, iy1);
      g.lineTo(ix0 + sw * b, iy1);
      g.lineTo(ix0 + sw * b + (iy1 - iy0) * 0.55, iy0);
      g.lineTo(ix0 + sw * a + (iy1 - iy0) * 0.55, iy0);
      g.closePath();
      g.fill();
    }
    g.restore();
    // mullion and transom
    const mw = 14 * k;
    const mx = (ix0 + ix1) / 2;
    const ty = iy0 + (iy1 - iy0) * 0.36;
    cel(g, RR(mx - mw / 2, iy0, mw, iy1 - iy0, 2 * k), MAT.furnLit, { ds: 3 * k, rw: 2 * k });
    cel(g, RR(ix0, ty - mw / 2, ix1 - ix0, mw, 2 * k), MAT.furnLit, { ds: 3 * k, rw: 2 * k });
    // latch on the mullion
    cel(g, RR(mx - 4 * k, ty + 26 * k, 8 * k, 34 * k, 3 * k), MAT.plastic, { ds: 2 * k, rw: 1.2 * k });
    // roller blind, pulled a little way down
    const bh = (iy1 - iy0) * (o.blind == null ? 0.12 : o.blind);
    const bl = { base: css(mix(p.wall[2], p.glow[1], 0.32)), sh: css(mix(p.wall[1], p.glow[1], 0.2)), rim: css(mix(p.furnitureRim, p.glow[3], 0.3)), cool: rgba(MAT.cool, 0.25) };
    cel(g, RR(ix0, iy0, ix1 - ix0, bh, 0), bl, { ds: 0, rw: 0 });
    g.fillStyle = rgba(p.wall[0], 0.22);
    for (let y = iy0 + 10 * k; y < iy0 + bh - 6 * k; y += 11 * k) g.fillRect(ix0, y, ix1 - ix0, 1.6 * k);
    g.fillStyle = rgba(p.glow[3], 0.12);
    g.fillRect(ix0, iy0 + bh - 18 * k, ix1 - ix0, 12 * k);
    cel(g, RR(ix0 - 2 * k, iy0 + bh - 6 * k, ix1 - ix0 + 4 * k, 9 * k, 3 * k), MAT.furnLit, { ds: 2 * k, rw: 1.6 * k });
    cel(g, RR(ox0 - 4 * k, oy0 - 2 * k, ox1 - ox0 + 8 * k, 16 * k, 5 * k), MAT.furn, { ds: 4 * k, rw: 2 * k });
    // pull cord with a bead
    const cx = ix0 + (ix1 - ix0) * 0.8;
    g.strokeStyle = css(mix(p.plunger, p.furnitureRim, 0.4));
    g.lineWidth = 1.6 * k;
    g.beginPath();
    g.moveTo(cx, iy0 + bh);
    g.lineTo(cx, iy0 + bh + 70 * k);
    g.stroke();
    cel(g, ELL(cx, iy0 + bh + 76 * k, 4.5 * k, 6.5 * k), MAT.plastic, { ds: 1.5 * k, rw: 1 * k });
    // sill
    const sy = R.y1 - 4 * k;
    g.fillStyle = rgba(p.wall[0], 0.55);
    g.fillRect(R.x0 - 10 * k, sy + 20 * k, R.x1 - R.x0 + 40 * k, 10 * k);
    cel(g, RR(R.x0 - 22 * k, sy, R.x1 - R.x0 + 44 * k, 22 * k, 4 * k), MAT.furnLit, { ds: 5 * k, rw: 2.5 * k });
    g.fillStyle = css(mix(p.furnitureRim, WHITE, 0.3));
    g.fillRect(R.x0 - 18 * k, sy + 1 * k, R.x1 - R.x0 + 36 * k, 2.2 * k);
    // a little cactus and a cup on the sill
    if (o.sillProps) {
      const k2 = k;
      const px = R.x0 + (R.x1 - R.x0) * 0.86;
      cel(g, RR(px - 18 * k2, sy - 26 * k2, 36 * k2, 27 * k2, 5 * k2), MAT.plastic, { ds: 3 * k2, rw: 1.5 * k2 });
      cel(g, SPL([[px - 10 * k2, sy - 24 * k2], [px - 12 * k2, sy - 52 * k2], [px, sy - 68 * k2], [px + 12 * k2, sy - 52 * k2], [px + 10 * k2, sy - 24 * k2]]), MAT.leaf, { ds: 3 * k2, rw: 2 * k2 });
      cel(g, SPL([[px + 8 * k2, sy - 40 * k2], [px + 22 * k2, sy - 46 * k2], [px + 24 * k2, sy - 58 * k2], [px + 16 * k2, sy - 56 * k2], [px + 9 * k2, sy - 48 * k2]]), MAT.leaf, { ds: 2 * k2, rw: 1.5 * k2 });
      g.fillStyle = rgba(LEAF_RIM, 0.7);
      for (let i = 0; i < 6; i++) g.fillRect(px - 6 * k2 + (i % 3) * 6 * k2, sy - 60 * k2 + Math.floor(i / 3) * 14 * k2, 1.4 * k2, 1.4 * k2);
    }
    return { ix0, iy0, ix1, iy1, ty, mx };
  }

  // ---- wall sconce: light pools and cones (on the wall) and the lamp body
  function lampLight(g, x, y, k) {
    const p = P();
    g.globalCompositeOperation = "lighter";
    pool(g, x, y + 30 * k, 520 * k, p.lampGlow, 0.22, 1);
    pool(g, x, y + 10 * k, 260 * k, p.lamp, 0.35, 1);
    // cones up and down
    const up = g.createLinearGradient(0, y - 60 * k, 0, y - 520 * k);
    up.addColorStop(0, rgba(p.lamp, 0.34));
    up.addColorStop(1, rgba(p.lamp, 0));
    g.fillStyle = up;
    g.beginPath();
    g.moveTo(x - 54 * k, y - 58 * k);
    g.lineTo(x + 54 * k, y - 58 * k);
    g.lineTo(x + 190 * k, y - 520 * k);
    g.lineTo(x - 190 * k, y - 520 * k);
    g.closePath();
    g.fill();
    const dn = g.createLinearGradient(0, y + 40 * k, 0, y + 640 * k);
    dn.addColorStop(0, rgba(p.lamp, 0.3));
    dn.addColorStop(1, rgba(p.lamp, 0));
    g.fillStyle = dn;
    g.beginPath();
    g.moveTo(x - 86 * k, y + 40 * k);
    g.lineTo(x + 86 * k, y + 40 * k);
    g.lineTo(x + 330 * k, y + 640 * k);
    g.lineTo(x - 330 * k, y + 640 * k);
    g.closePath();
    g.fill();
    g.globalCompositeOperation = "source-over";
  }
  function lampBody(g, x, y, k) {
    const p = P();
    // backplate and stem
    cel(g, RR(x - 15 * k, y - 120 * k, 30 * k, 64 * k, 8 * k), MAT.furnLit, { ds: 4 * k, rw: 2 * k });
    cel(g, RR(x - 4 * k, y - 96 * k, 8 * k, 44 * k, 3 * k), MAT.steel, { ds: 2 * k, rw: 1.2 * k });
    // shade: a drum lit from inside
    const sh = POLY([[x - 58 * k, y - 60 * k], [x + 58 * k, y - 60 * k], [x + 88 * k, y + 42 * k], [x - 88 * k, y + 42 * k]]);
    g.beginPath();
    sh(g);
    const gr = g.createLinearGradient(0, y - 60 * k, 0, y + 42 * k);
    gr.addColorStop(0, css(mix(p.lamp, p.lampGlow, 0.35)));
    gr.addColorStop(0.7, css(mix(p.lamp, WHITE, 0.25)));
    gr.addColorStop(1, css(mix(p.lamp, WHITE, 0.55)));
    g.fillStyle = gr;
    g.fill();
    g.save();
    g.clip();
    // darker right side (the drum turns away), pleats, a glow core
    g.fillStyle = rgba(p.lampGlow, 0.5);
    g.beginPath();
    g.moveTo(x + 30 * k, y - 60 * k);
    g.lineTo(x + 70 * k, y - 60 * k);
    g.lineTo(x + 110 * k, y + 42 * k);
    g.lineTo(x + 46 * k, y + 42 * k);
    g.closePath();
    g.fill();
    g.strokeStyle = rgba(p.lampGlow, 0.22);
    g.lineWidth = 2 * k;
    for (let i = -4; i <= 4; i++) {
      g.beginPath();
      g.moveTo(x + i * 13 * k, y - 60 * k);
      g.lineTo(x + i * 19.5 * k, y + 42 * k);
      g.stroke();
    }
    pool(g, x - 10 * k, y - 4 * k, 70 * k, "#ffffff", 0.35, 0.8);
    g.restore();
    // top and bottom rims (bright openings)
    fEll(g, css(mix(p.lamp, WHITE, 0.4)), x, y - 60 * k, 58 * k, 7 * k);
    fEll(g, css(mix(p.lamp, p.lampGlow, 0.25)), x, y - 58 * k, 50 * k, 4 * k);
    fEll(g, css(mix(p.lamp, WHITE, 0.75)), x, y + 42 * k, 88 * k, 12 * k);
    fEll(g, "#fffaf0", x, y + 44 * k, 70 * k, 7 * k);
    g.fillStyle = rgba(WHITE, 0.8);
    g.fillRect(x - 56 * k, y - 58 * k, 112 * k, 2 * k);
  }

  // ---- lightbox with a glowing shoulder X-ray
  function lightbox(g, x, y, w, h, k) {
    const p = P();
    g.globalCompositeOperation = "lighter";
    pool(g, x + w / 2, y + h / 2, Math.max(w, h) * 0.95, p.screen, 0.16, 1);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = rgba(p.wall[0], 0.5);
    g.beginPath();
    rrect(g, x + 10 * k, y + 14 * k, w, h, 8 * k);
    g.fill();
    cel(g, RR(x, y, w, h, 8 * k), MAT.plastic, { ds: 5 * k, rw: 2.5 * k });
    const px = x + 14 * k;
    const py = y + 14 * k;
    const pw = w - 28 * k;
    const ph = h - 28 * k;
    let gr = g.createRadialGradient(px + pw / 2, py + ph / 2, 0, px + pw / 2, py + ph / 2, Math.max(pw, ph) * 0.7);
    gr.addColorStop(0, css(mix(p.screen, WHITE, 0.6)));
    gr.addColorStop(1, css(mix(p.screen, p.pill.cyan, 0.35)));
    g.fillStyle = gr;
    g.fillRect(px, py, pw, ph);
    // the film
    const fx = px + 12 * k;
    const fy = py + 16 * k;
    const fw = pw - 24 * k;
    const fh = ph - 28 * k;
    g.fillStyle = "rgba(10,14,58,0.9)";
    g.fillRect(fx, fy, fw, fh);
    g.save();
    g.beginPath();
    g.rect(fx, fy, fw, fh);
    g.clip();
    // soft-tissue silhouette
    g.fillStyle = "rgba(90,150,255,0.16)";
    g.beginPath();
    splPath(g, [[fx + fw * 0.05, fy + fh * 0.05], [fx + fw * 0.7, fy + fh * 0.02], [fx + fw * 0.95, fy + fh * 0.3], [fx + fw * 0.86, fy + fh * 1.05], [fx + fw * 0.3, fy + fh * 1.05], [fx + fw * 0.2, fy + fh * 0.4]]);
    g.fill();
    // bones (glow then core)
    const bone = (gl) => {
      g.beginPath();
      // humerus: ball, neck, shaft
      g.ellipse(fx + fw * 0.52, fy + fh * 0.22, fw * 0.16, fw * 0.15, 0, 0, TAU);
      g.moveTo(fx + fw * 0.44, fy + fh * 0.3);
      g.quadraticCurveTo(fx + fw * 0.5, fy + fh * 0.6, fx + fw * 0.46, fy + fh * 1.05);
      g.lineTo(fx + fw * 0.6, fy + fh * 1.05);
      g.quadraticCurveTo(fx + fw * 0.6, fy + fh * 0.6, fx + fw * 0.66, fy + fh * 0.3);
      g.closePath();
      // scapula blade and clavicle
      g.moveTo(fx + fw * 0.3, fy + fh * 0.12);
      g.lineTo(fx + fw * 0.08, fy + fh * 0.3);
      g.lineTo(fx + fw * 0.16, fy + fh * 0.62);
      g.lineTo(fx + fw * 0.36, fy + fh * 0.3);
      g.closePath();
      g.moveTo(fx - fw * 0.05, fy + fh * 0.04);
      g.quadraticCurveTo(fx + fw * 0.3, fy + fh * 0.0, fx + fw * 0.46, fy + fh * 0.08);
      g.lineTo(fx + fw * 0.45, fy + fh * 0.12);
      g.quadraticCurveTo(fx + fw * 0.3, fy + fh * 0.05, fx - fw * 0.05, fy + fh * 0.1);
      g.closePath();
      g.fillStyle = gl;
      g.fill();
    };
    g.save();
    g.shadowColor = rgba(p.screen, 0.9);
    g.shadowBlur = 16 * k * RS;
    bone("rgba(200,244,255,0.55)");
    g.restore();
    bone("rgba(226,250,255,0.82)");
    // marrow lines and ribs
    g.strokeStyle = "rgba(130,190,255,0.45)";
    g.lineWidth = 3 * k;
    g.beginPath();
    g.moveTo(fx + fw * 0.53, fy + fh * 0.4);
    g.quadraticCurveTo(fx + fw * 0.55, fy + fh * 0.7, fx + fw * 0.53, fy + fh);
    g.stroke();
    g.strokeStyle = "rgba(180,230,255,0.28)";
    g.lineWidth = 5 * k;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.moveTo(fx - fw * 0.02, fy + fh * (0.45 + i * 0.15));
      g.quadraticCurveTo(fx + fw * 0.15, fy + fh * (0.38 + i * 0.15), fx + fw * 0.3, fy + fh * (0.48 + i * 0.15));
      g.stroke();
    }
    g.restore();
    // film clips
    for (const cxp of [0.3, 0.7]) cel(g, RR(x + w * cxp - 10 * k, py + 4 * k, 20 * k, 18 * k, 4 * k), MAT.steel, { ds: 2 * k, rw: 1 * k });
    // inner bevel shadow
    g.fillStyle = rgba(p.plungerShade, 0.5);
    g.fillRect(px, py, pw, 4 * k);
    g.fillRect(px, py, 4 * k, ph);
    // switch
    cel(g, RR(x + w - 26 * k, y + h - 12 * k, 14 * k, 7 * k, 2 * k), MAT.steel, { ds: 1, rw: 0.8 * k });
  }

  // ---- shelf items (bx = centre x, by = base y)
  function jar(g, bx, by, w, h, k, content, lid) {
    const p = P();
    const x = bx - w / 2;
    const y = by - h;
    g.fillStyle = rgba(p.glass, 0.14);
    g.beginPath();
    rrect(g, x, y, w, h, w * 0.16);
    g.fill();
    g.save();
    g.beginPath();
    rrect(g, x + 2 * k, y + 2 * k, w - 4 * k, h - 4 * k, w * 0.14);
    g.clip();
    if (content === "cotton") {
      for (let i = 0; i < 14; i++) {
        const cx = x + w * (0.15 + 0.7 * hsh(i, 11)) ;
        const cy = by - h * 0.08 - h * 0.62 * hsh(i, 12);
        const r = w * (0.13 + 0.06 * hsh(i, 13));
        fEll(g, css(mix(p.glass, p.plungerShade, 0.35)), cx + r * 0.2, cy + r * 0.25, r, r * 0.9);
        fEll(g, css(mix(p.glass, WHITE, 0.6)), cx, cy, r * 0.92, r * 0.84);
      }
    } else if (content === "sticks") {
      for (let i = 0; i < 9; i++) {
        const sx = x + w * (0.18 + 0.64 * (i / 8)) + (hsh(i, 5) - 0.5) * 4 * k;
        g.save();
        g.translate(sx, by - 2 * k);
        g.rotate((hsh(i, 6) - 0.5) * 0.25);
        g.fillStyle = css(mix(p.plasterPad, p.plaster, 0.45));
        g.fillRect(-2.5 * k, -h * 1.12, 5 * k, h * 1.12);
        g.fillStyle = css(p.plasterShade);
        g.fillRect(0.8 * k, -h * 1.12, 1.7 * k, h * 1.12);
        g.restore();
      }
    } else if (content === "gauze") {
      for (let i = 0; i < 3; i++) {
        const gy = by - 4 * k - (i + 1) * h * 0.26;
        cel(g, RR(x + 5 * k, gy, w - 10 * k, h * 0.24, 6 * k), MAT.plastic, { ds: 3 * k, rw: 1.5 * k, extra: (c) => {
          c.fillStyle = rgba(p.plungerShade, 0.4);
          for (let j = 1; j < 5; j++) c.fillRect(x + 5 * k, gy + (h * 0.24 * j) / 5, w - 10 * k, 1 * k);
        } });
      }
    } else if (content === "swabs") {
      for (let i = 0; i < 10; i++) {
        const sx = x + w * (0.2 + 0.6 * (i / 9));
        const ang = (hsh(i, 8) - 0.5) * 0.3;
        g.save();
        g.translate(sx, by - 2 * k);
        g.rotate(ang);
        g.fillStyle = css(p.plunger);
        g.fillRect(-1.2 * k, -h * 1.15, 2.4 * k, h * 1.15);
        fEll(g, css(mix(p.glass, WHITE, 0.6)), 0, -h * 1.15, 4.5 * k, 7 * k);
        g.restore();
      }
    }
    g.restore();
    // glass edges and sheen
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.fillRect(x + 3 * k, y + h * 0.18, 3 * k, h * 0.7);
    g.fillStyle = "rgba(255,255,255,0.18)";
    g.fillRect(x + w * 0.3, y + h * 0.18, 5 * k, h * 0.6);
    g.fillStyle = rgba(p.sparkCyan, 0.35);
    g.fillRect(x + w - 5 * k, y + h * 0.2, 2.4 * k, h * 0.7);
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(x + 4 * k, by - 4 * k, w - 8 * k, 2 * k);
    // lid
    const lidMat = { base: css(lid), sh: css(mix(lid, p.furnitureShade, 0.45)), rim: css(mix(lid, WHITE, 0.5)), cool: rgba(MAT.cool, 0.4) };
    cel(g, RR(x - 2 * k, y - 10 * k, w + 4 * k, 16 * k, 4 * k), lidMat, { ds: 3 * k, rw: 1.6 * k });
    fEll(g, css(mix(lid, WHITE, 0.25)), bx, y - 11 * k, w * 0.22, 4 * k);
  }
  function bottle(g, bx, by, w, h, k, col, capCol) {
    const p = P();
    const x = bx - w / 2;
    const body = SPL([[x, by, 1], [x, by - h * 0.62], [bx - w * 0.22, by - h * 0.8], [bx - w * 0.18, by - h * 0.92, 1], [bx + w * 0.18, by - h * 0.92, 1], [bx + w * 0.22, by - h * 0.8], [x + w, by - h * 0.62], [x + w, by, 1]]);
    const m = { base: rgba(col, 0.85), sh: rgba(mix(col, p.furnitureShade, 0.5), 0.9), rim: rgba(mix(col, WHITE, 0.6), 0.9), cool: rgba(MAT.cool, 0.4) };
    cel(g, body, m, { ds: 4 * k, rw: 2 * k, extra: (c) => {
      c.fillStyle = rgba(WHITE, 0.75);
      c.fillRect(x + w * 0.16, by - h * 0.55, w * 0.68, h * 0.3);
      c.fillStyle = rgba(col, 0.6);
      c.fillRect(x + w * 0.16, by - h * 0.46, w * 0.68, h * 0.06);
      c.fillStyle = rgba(WHITE, 0.5);
      c.fillRect(x + w * 0.12, by - h * 0.85, 2.5 * k, h * 0.75);
    } });
    const cm = { base: css(capCol), sh: css(mix(capCol, p.furnitureShade, 0.4)), rim: css(mix(capCol, WHITE, 0.4)) };
    cel(g, RR(bx - w * 0.24, by - h - 6 * k, w * 0.48, h * 0.1 + 6 * k, 3 * k), cm, { ds: 2 * k, rw: 1.2 * k });
  }
  function boxItem(g, bx, by, w, h, k, col) {
    const p = P();
    const x = bx - w / 2;
    const m = { base: css(col), sh: css(mix(col, p.furnitureShade, 0.45)), rim: css(mix(col, WHITE, 0.45)), cool: rgba(MAT.cool, 0.35) };
    cel(g, RR(x, by - h, w, h, 3 * k), m, { ds: 5 * k, rw: 1.8 * k, extra: (c) => {
      c.fillStyle = rgba(WHITE, 0.62);
      c.fillRect(x + w * 0.14, by - h * 0.62, w * 0.72, h * 0.26);
      c.fillStyle = rgba(mix(col, p.furnitureShade, 0.3), 0.8);
      c.fillRect(x, by - h * 0.18, w, h * 0.07);
    } });
  }
  function vialRack(g, bx, by, n, k) {
    const p = P();
    for (let i = 0; i < n; i++) {
      const x = bx + (i - (n - 1) / 2) * 20 * k;
      g.fillStyle = rgba(p.glass, 0.2);
      g.beginPath();
      rrect(g, x - 7 * k, by - 40 * k, 14 * k, 40 * k, 4 * k);
      g.fill();
      g.fillStyle = rgba(p.med, 0.92);
      g.beginPath();
      rrect(g, x - 5.5 * k, by - 26 * k, 11 * k, 24 * k, 3.5 * k);
      g.fill();
      g.fillStyle = rgba(p.medGlow, 0.9);
      g.fillRect(x - 4 * k, by - 24 * k, 2.4 * k, 19 * k);
      cel(g, RR(x - 7.5 * k, by - 48 * k, 15 * k, 10 * k, 2.5 * k), MAT.steel, { ds: 1.5 * k, rw: 1 * k });
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 0.5;
      g.drawImage(SPR.medHalo, x - 26 * k, by - 40 * k, 52 * k, 52 * k);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    }
    cel(g, RR(bx - n * 11 * k, by - 14 * k, n * 22 * k, 14 * k, 3 * k), MAT.furnLit, { ds: 3 * k, rw: 1.5 * k });
  }
  function gloveBox(g, bx, by, w, h, k) {
    const p = P();
    const x = bx - w / 2;
    const col = mix(p.plunger, p.glove, 0.25);
    const m = { base: css(col), sh: css(mix(col, p.furnitureShade, 0.45)), rim: css(WHITE), cool: rgba(MAT.cool, 0.4) };
    cel(g, RR(x, by - h, w, h, 4 * k), m, { ds: 5 * k, rw: 2 * k, extra: (c) => {
      c.fillStyle = css(p.glove);
      c.fillRect(x, by - h * 0.32, w, h * 0.12);
      fEll(c, css(p.gloveDeep), bx, by - h * 0.66, w * 0.3, h * 0.12);
    } });
    // glove tips poking out
    for (const [dx, a, l] of [[-0.12, -0.4, 0.5], [0.02, -0.1, 0.6], [0.14, 0.3, 0.45]]) {
      const sx = bx + dx * w;
      const sy = by - h * 0.66;
      cel(g, CAP([[sx, sy], [sx + Math.sin(a) * h * l, sy - Math.cos(a) * h * l]], [16 * k, 12 * k]), MAT.glove, { ds: 3 * k, rw: 1.6 * k });
    }
  }
  function pumpBottle(g, bx, by, w, h, k) {
    const p = P();
    const col = mix(p.sparkPink, p.plunger, 0.5);
    bottle(g, bx, by, w, h, k, col, p.plunger);
    cel(g, RR(bx - 3 * k, by - h - 26 * k, 6 * k, 22 * k, 2 * k), MAT.plastic, { ds: 1.5 * k, rw: 1 * k });
    cel(g, RR(bx - 4 * k, by - h - 32 * k, 26 * k, 9 * k, 3 * k), MAT.plastic, { ds: 2 * k, rw: 1 * k });
  }
  function sharpsBin(g, bx, by, w, h, k) {
    const p = P();
    const x = bx - w / 2;
    const col = mix(p.plunger, WHITE, 0.2);
    const m = { base: css(col), sh: css(p.plungerShade), rim: css(WHITE), cool: rgba(MAT.cool, 0.4) };
    cel(g, RR(x, by - h, w, h, 6 * k), m, { ds: 5 * k, rw: 2 * k });
    const lid = { base: css(p.pill.magenta), sh: css(mix(p.pill.magenta, p.furnitureShade, 0.45)), rim: css(p.sparkPink) };
    cel(g, RR(x - 4 * k, by - h - 4 * k, w + 8 * k, h * 0.26, 6 * k), lid, { ds: 3 * k, rw: 1.6 * k });
    fRR(g, css(mix(p.pill.magenta, p.rubber, 0.6)), bx - w * 0.22, by - h + 3 * k, w * 0.44, 5 * k, 2.5 * k);
  }

  // ---- glass wall cabinet with shelves of jars, boxes and bottles, cool LED strip
  function cabinet(g, x, y, w, h, k, seed) {
    const p = P();
    g.fillStyle = rgba(p.wall[0], 0.5);
    g.beginPath();
    rrect(g, x + 14 * k, y + 18 * k, w, h, 8 * k);
    g.fill();
    cel(g, RR(x, y, w, h, 8 * k), MAT.furnLit, { ds: 8 * k, rw: 3 * k });
    const ix = x + 16 * k;
    const iy = y + 18 * k;
    const iw = w - 32 * k;
    const ih = h - 36 * k;
    g.fillStyle = css(mix(p.furnitureShade, p.wall[0], 0.35));
    g.fillRect(ix, iy, iw, ih);
    // LED wash from the top
    g.save();
    g.beginPath();
    g.rect(ix, iy, iw, ih);
    g.clip();
    let gr = g.createLinearGradient(0, iy, 0, iy + ih);
    gr.addColorStop(0, rgba(p.screen, 0.28));
    gr.addColorStop(0.35, rgba(p.screen, 0.08));
    gr.addColorStop(1, rgba(p.screen, 0.02));
    g.fillStyle = gr;
    g.fillRect(ix, iy, iw, ih);
    const shelves = [0.31, 0.6, 0.86].map((f) => iy + ih * f);
    let top = iy + 12 * k;
    const r = EX.rng(seed);
    shelves.forEach((sy, si) => {
      // shelf glow from the strip above each shelf
      gr = g.createLinearGradient(0, top, 0, sy);
      gr.addColorStop(0, rgba(p.screen, 0.14));
      gr.addColorStop(1, rgba(p.screen, 0));
      g.fillStyle = gr;
      g.fillRect(ix, top, iw, sy - top);
      const gap = sy - top;
      // items
      let cx = ix + 14 * k;
      let n = 0;
      while (cx < ix + iw - 30 * k && n < 9) {
        const pick = (si * 5 + n + Math.floor(r() * 3)) % 7;
        let wv = 0;
        if (pick === 0) {
          wv = 64 * k;
          jar(g, cx + wv / 2, sy, wv, gap * 0.62, k, "cotton", p.sparkPink);
        } else if (pick === 1) {
          wv = 30 * k;
          bottle(g, cx + wv / 2, sy, wv, gap * 0.58, k, mix(p.enzyme, p.plunger, 0.25), p.plunger);
        } else if (pick === 2) {
          wv = 58 * k;
          boxItem(g, cx + wv / 2, sy, wv, gap * 0.46, k, mix(p.pill.cyan, p.plunger, 0.35));
        } else if (pick === 3) {
          wv = 54 * k;
          jar(g, cx + wv / 2, sy, wv, gap * 0.5, k, "swabs", mix(p.pill.cyan, WHITE, 0.2));
        } else if (pick === 4) {
          wv = 80 * k;
          vialRack(g, cx + wv / 2, sy, 3, k);
        } else if (pick === 5) {
          wv = 52 * k;
          jar(g, cx + wv / 2, sy, wv, gap * 0.56, k, "gauze", mix(p.furnitureRim, WHITE, 0.3));
        } else {
          wv = 34 * k;
          bottle(g, cx + wv / 2, sy, wv, gap * 0.66, k, mix(p.sparkPink, p.pill.magenta, 0.3), WHITE);
        }
        cx += wv + (10 + r() * 10) * k;
        n++;
      }
      // the shelf board (glass shelf with a bright front edge)
      g.fillStyle = rgba(p.wall[0], 0.4);
      g.fillRect(ix, sy + 8 * k, iw, 10 * k);
      g.fillStyle = css(mix(p.furniture, p.furnitureRim, 0.4));
      g.fillRect(ix, sy, iw, 8 * k);
      g.fillStyle = css(mix(p.screen, WHITE, 0.4));
      g.fillRect(ix, sy, iw, 2 * k);
      top = sy + 12 * k;
    });
    // LED strip
    g.fillStyle = css(mix(p.screen, WHITE, 0.6));
    g.fillRect(ix, iy, iw, 4 * k);
    g.restore();
    // glass doors: stiles, rails, reflections, handles
    const dw = (w - 12 * k) / 2;
    for (const d of [0, 1]) {
      const dx = x + 6 * k + d * dw;
      g.save();
      g.beginPath();
      g.rect(dx + 8 * k, y + 12 * k, dw - 16 * k, h - 24 * k);
      g.clip();
      g.fillStyle = "rgba(255,255,255,0.05)";
      g.fillRect(dx, y, dw, h);
      for (const [a, b, al] of [[0.05, 0.22, 0.08], [0.3, 0.36, 0.06], [0.7, 0.78, 0.05]]) {
        g.fillStyle = `rgba(255,255,255,${al})`;
        g.beginPath();
        g.moveTo(dx + dw * a, y + h);
        g.lineTo(dx + dw * b, y + h);
        g.lineTo(dx + dw * b + h * 0.45, y);
        g.lineTo(dx + dw * a + h * 0.45, y);
        g.closePath();
        g.fill();
      }
      g.restore();
      g.strokeStyle = css(mix(p.furniture, p.furnitureRim, 0.3));
      g.lineWidth = 9 * k;
      g.beginPath();
      rrect(g, dx + 4.5 * k, y + 8 * k, dw - 9 * k, h - 16 * k, 4 * k);
      g.stroke();
      g.strokeStyle = rgba(mix(p.furnitureRim, WHITE, 0.3), 0.8);
      g.lineWidth = 1.8 * k;
      g.beginPath();
      g.moveTo(dx + 1 * k, y + h - 10 * k);
      g.lineTo(dx + 1 * k, y + 8 * k);
      g.lineTo(dx + dw - 6 * k, y + 8 * k);
      g.stroke();
      const hx = d === 0 ? dx + dw - 22 * k : dx + 14 * k;
      cel(g, RR(hx, y + h * 0.46, 8 * k, 64 * k, 4 * k), MAT.steel, { ds: 2 * k, rw: 1.2 * k });
    }
    // crown moulding
    cel(g, RR(x - 10 * k, y - 14 * k, w + 20 * k, 18 * k, 4 * k), MAT.furnLit, { ds: 4 * k, rw: 2 * k });
  }

  // ---- tiled backsplash, counter with doors and its items
  function backsplash(g, x0, x1, y0, y1, k) {
    const p = P();
    g.fillStyle = css(mix(p.wall[2], p.furniture, 0.4));
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    const ts = 34 * k;
    for (let y = y0; y < y1; y += ts) {
      for (let x = x0; x < x1; x += ts) {
        const v = hsh(Math.round(x), Math.round(y), 3);
        g.fillStyle = rgba(mix(p.furnitureRim, p.wall[2], 0.55), 0.18 + 0.12 * v);
        g.fillRect(x + 2 * k, y + 2 * k, ts - 4 * k, ts - 4 * k);
        g.fillStyle = rgba(WHITE, 0.08);
        g.fillRect(x + 3 * k, y + 3 * k, ts * 0.4, 2 * k);
      }
    }
    g.fillStyle = rgba(p.wall[0], 0.35);
    for (let y = y0; y < y1; y += ts) g.fillRect(x0, y, x1 - x0, 2 * k);
  }
  function counter(g, x0, x1, top, y1, k) {
    const p = P();
    // worktop
    cel(g, RR(x0, top - 6 * k, x1 - x0, 26 * k, 5 * k), MAT.furnLit, { ds: 5 * k, rw: 2.5 * k });
    g.fillStyle = css(mix(p.furnitureRim, WHITE, 0.35));
    g.fillRect(x0 + 4 * k, top - 5 * k, x1 - x0 - 8 * k, 2.5 * k);
    // doors
    const dy = top + 26 * k;
    g.fillStyle = rgba(p.wall[0], 0.6);
    g.fillRect(x0 + 6 * k, dy - 6 * k, x1 - x0 - 12 * k, 10 * k);
    const dwid = 210 * k;
    for (let x = x0 + 10 * k; x < x1 - 20 * k; x += dwid) {
      const w = Math.min(dwid - 10 * k, x1 - 10 * k - x);
      cel(g, RR(x, dy, w, y1 - dy, 6 * k), MAT.furn, { ds: 6 * k, rw: 2.5 * k, extra: (c) => {
        c.strokeStyle = rgba(p.furnitureRim, 0.18);
        c.lineWidth = 2 * k;
        c.beginPath();
        rrect(c, x + 16 * k, dy + 18 * k, w - 32 * k, y1 - dy, 5 * k);
        c.stroke();
      } });
      cel(g, RR(x + w / 2 - 30 * k, dy + 22 * k, 60 * k, 8 * k, 4 * k), MAT.steel, { ds: 2 * k, rw: 1.2 * k });
    }
  }

  // ---- potted plant with big two-tone leaves
  function leaf(g, x, y, ang, len, wid, k, seed) {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    const sh = (c, dx = 0, dy = 0) => {
      c.moveTo(dx, dy);
      c.bezierCurveTo(len * 0.22 + dx, -wid * 0.95 + dy, len * 0.72 + dx, -wid * 0.75 + dy, len + dx, dy);
      c.bezierCurveTo(len * 0.7 + dx, wid * 0.7 + dy, len * 0.22 + dx, wid * 0.9 + dy, dx, dy);
      c.closePath();
    };
    // light in leaf space
    const L = [ca * KEY[0] + sa * KEY[1], -sa * KEY[0] + ca * KEY[1]];
    const shadeTop = L[1] > 0; // which half is in shade
    cel(g, sh, MAT.leaf, { L, ds: 4 * k, rw: 2.2 * k, extra: (c) => {
      // two-tone halves split by the midrib
      c.fillStyle = css(LEAF_SH);
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(len * 0.5, (shadeTop ? -1 : 1) * wid * 0.06, len, 0);
      c.lineTo(len, (shadeTop ? -1 : 1) * wid * 2);
      c.lineTo(0, (shadeTop ? -1 : 1) * wid * 2);
      c.closePath();
      c.fill();
      // veins
      c.strokeStyle = rgba(LEAF_VEIN, 0.55);
      c.lineWidth = 2 * k;
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(len * 0.5, (shadeTop ? -1 : 1) * wid * 0.06, len * 0.96, 0);
      c.stroke();
      c.lineWidth = 1.2 * k;
      c.strokeStyle = rgba(LEAF_VEIN, 0.28);
      for (let i = 1; i < 6; i++) {
        const u = i / 6.5;
        for (const sd of [-1, 1]) {
          c.beginPath();
          c.moveTo(len * u, 0);
          c.quadraticCurveTo(len * (u + 0.08), sd * wid * 0.35, len * (u + 0.16), sd * wid * 0.62 * (1 - u * 0.6));
          c.stroke();
        }
      }
      // a dewy speck
      if (hsh(seed, 3) < 0.5) fEll(c, rgba(WHITE, 0.6), len * 0.55, (shadeTop ? 1 : -1) * wid * 0.25, 2.2 * k, 1.6 * k);
    } });
    g.restore();
  }
  function plant(g, x, base, k, seed, potCol) {
    const p = P();
    const r = EX.rng(seed);
    // stems + leaves, back to front
    const leaves = [];
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.2 + (r() - 0.5) * 0.25;
      const len = (150 + r() * 90) * k;
      const sl = (120 + r() * 140) * k;
      leaves.push({ a, len, sl, wid: (52 + r() * 22) * k, seed: i, z: r() });
    }
    leaves.sort((A, B) => A.z - B.z);
    const sx = x;
    const sy = base - 200 * k;
    for (const L of leaves) {
      const ex = sx + Math.cos(L.a) * L.sl;
      const ey = sy + Math.sin(L.a) * L.sl;
      g.strokeStyle = css(mix(LEAF_SH, LEAF_DEEP, 0.4));
      g.lineWidth = 5 * k;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(sx + (L.z - 0.5) * 30 * k, sy + 40 * k);
      g.quadraticCurveTo(sx + Math.cos(L.a) * L.sl * 0.4, sy + Math.sin(L.a) * L.sl * 0.6, ex, ey);
      g.stroke();
      leaf(g, ex, ey, L.a + (r() - 0.5) * 0.5, L.len, L.wid, k, L.seed + seed * 13);
    }
    // pot
    const pw = 210 * k;
    const ph = 190 * k;
    const pot = POLY([[x - pw / 2, sy + 10 * k], [x + pw / 2, sy + 10 * k], [x + pw * 0.4, base], [x - pw * 0.4, base]]);
    const pm = { base: css(potCol), sh: css(mix(potCol, P().furnitureShade, 0.5)), deep: css(mix(potCol, P().furnitureShade, 0.75)), rim: css(mix(potCol, WHITE, 0.5)), cool: rgba(MAT.cool, 0.45) };
    cel(g, pot, pm, { ds: 18 * k, rw: 3 * k, extra: (c) => {
      c.fillStyle = rgba(p.furnitureShade, 0.25);
      c.fillRect(x - pw, sy + 70 * k, pw * 2, 14 * k);
      c.fillStyle = rgba(WHITE, 0.25);
      c.fillRect(x - pw * 0.38, sy + 26 * k, 8 * k, ph * 0.6);
    } });
    cel(g, RR(x - pw / 2 - 10 * k, sy, pw + 20 * k, 30 * k, 6 * k), pm, { ds: 5 * k, rw: 2.5 * k });
    fEll(g, css(mix(LEAF_DEEP, p.furnitureShade, 0.5)), x, sy + 4 * k, pw * 0.44, 7 * k);
  }

  // ---- wall blood-pressure gauge with its coiled tube, cuff and bulb
  function bpGauge(g, x, y, k) {
    const p = P();
    const r = 46 * k;
    // coiled tube hanging to the cuff
    g.strokeStyle = css(mix(p.rubber, p.furnitureShade, 0.3));
    g.lineWidth = 5 * k;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(x, y + r);
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      g.lineTo(x + 14 * k * Math.sin(u * TAU * 5) + 30 * k * u, y + r + u * 150 * k);
    }
    g.stroke();
    g.strokeStyle = rgba(p.furnitureRim, 0.5);
    g.lineWidth = 1.6 * k;
    g.stroke();
    const cm = { base: css(mix(p.glove, p.furniture, 0.55)), sh: css(mix(p.gloveDeep, p.furnitureShade, 0.5)), rim: css(mix(p.gloveLight, WHITE, 0.2)), cool: rgba(MAT.cool, 0.4) };
    cel(g, RR(x + 6 * k, y + r + 140 * k, 72 * k, 92 * k, 14 * k), cm, { ds: 6 * k, rw: 2 * k, extra: (c) => {
      c.fillStyle = rgba(p.gloveDeep, 0.4);
      for (let i = 0; i < 4; i++) c.fillRect(x + 6 * k, y + r + 156 * k + i * 18 * k, 72 * k, 3 * k);
    } });
    cel(g, ELL(x + 96 * k, y + r + 196 * k, 16 * k, 22 * k), { base: css(mix(p.rubber, p.furnitureRim, 0.3)), sh: css(p.rubber), rim: css(p.furnitureRim) }, { ds: 4 * k, rw: 1.6 * k });
    // the dial
    g.fillStyle = rgba(p.wall[0], 0.5);
    g.beginPath();
    g.arc(x + 8 * k, y + 10 * k, r + 6 * k, 0, TAU);
    g.fill();
    cel(g, ELL(x, y, r + 6 * k, r + 6 * k), MAT.steel, { ds: 4 * k, rw: 2 * k });
    cel(g, ELL(x, y, r, r), { base: css(mix(p.glass, WHITE, 0.5)), sh: css(p.plunger), rim: css(WHITE) }, { ds: 3 * k, rw: 1.4 * k });
    g.fillStyle = css(p.rubber);
    for (let i = 0; i < 30; i++) {
      const a = Math.PI * 0.75 + (i / 29) * Math.PI * 1.5;
      const l = i % 5 === 0 ? 9 * k : 5 * k;
      g.save();
      g.translate(x + Math.cos(a) * (r - 6 * k), y + Math.sin(a) * (r - 6 * k));
      g.rotate(a);
      g.fillRect(-l, -0.9 * k, l, 1.8 * k);
      g.restore();
    }
    g.fillStyle = rgba(p.pill.crimson, 0.85);
    g.beginPath();
    g.arc(x, y, r - 16 * k, Math.PI * 0.75 + Math.PI * 1.2, Math.PI * 0.75 + Math.PI * 1.5);
    g.arc(x, y, r - 11 * k, Math.PI * 0.75 + Math.PI * 1.5, Math.PI * 0.75 + Math.PI * 1.2, true);
    g.closePath();
    g.fill();
    g.save();
    g.translate(x, y);
    g.rotate(Math.PI * 0.75 + Math.PI * 0.55);
    g.fillStyle = css(p.rubber);
    g.beginPath();
    g.moveTo(0, -2.4 * k);
    g.lineTo(r - 10 * k, 0);
    g.lineTo(0, 2.4 * k);
    g.closePath();
    g.fill();
    g.restore();
    fEll(g, css(p.steelShade), x, y, 5 * k, 5 * k);
    fLens(g, rgba(WHITE, 0.6), x - r * 0.7, y - r * 0.2, x - r * 0.15, y - r * 0.75, -r * 0.12, r * 0.05);
  }
  // ---- wall clock: static face (the second hand is drawn live in back())
  function wallClock(g, x, y, r, k) {
    const p = P();
    g.fillStyle = rgba(p.wall[0], 0.5);
    g.beginPath();
    g.arc(x + 8 * k, y + 10 * k, r + 7 * k, 0, TAU);
    g.fill();
    cel(g, ELL(x, y, r + 7 * k, r + 7 * k), MAT.furnLit, { ds: 4 * k, rw: 2 * k });
    cel(g, ELL(x, y, r, r), { base: css(mix(p.glass, WHITE, 0.45)), sh: css(p.plunger), rim: css(WHITE) }, { ds: 4 * k, rw: 1.6 * k });
    g.fillStyle = css(p.rubber);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const l = i % 3 === 0 ? 8 * k : 4.5 * k;
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillRect(-1.1 * k, -r + 4 * k, 2.2 * k, l);
      g.restore();
    }
    // hour and minute hands: ten past nine at night
    const hand = (a, len, w) => {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillStyle = css(p.rubber);
      g.beginPath();
      rrect(g, -w / 2, -len, w, len + 4 * k, w / 2);
      g.fill();
      g.restore();
    };
    hand(((9 + 10 / 60) / 12) * TAU, r * 0.5, 4 * k);
    hand((10 / 60) * TAU, r * 0.76, 3 * k);
  }
  function clockSecond(ctx, x, y, r, k, t) {
    const p = P();
    const s = Math.floor(t);
    const f = t - s;
    // ticks once a second with a tiny spring overshoot
    const a = ((s + 44 + Math.min(1, EX.spring(f, 0.35, 34))) / 60) * TAU;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = css(p.pill.crimson);
    ctx.fillRect(-0.8 * k, -r * 0.84, 1.6 * k, r * 1.04);
    ctx.restore();
    fEll(ctx, css(p.pill.crimson), x, y, 3.4 * k, 3.4 * k);
  }
  function dispenser(g, x, y, k) {
    const p = P();
    cel(g, RR(x - 24 * k, y, 48 * k, 74 * k, 8 * k), MAT.plastic, { ds: 4 * k, rw: 1.6 * k, extra: (c) => {
      c.fillStyle = rgba(p.sparkPink, 0.7);
      c.fillRect(x - 14 * k, y + 30 * k, 28 * k, 26 * k);
      c.fillStyle = rgba(WHITE, 0.7);
      c.fillRect(x - 12 * k, y + 32 * k, 4 * k, 22 * k);
    } });
    cel(g, RR(x - 10 * k, y + 72 * k, 20 * k, 9 * k, 3 * k), MAT.steel, { ds: 2 * k, rw: 1 * k });
  }

  // ---- exam couch (wide)
  function couch(g, x0, x1, top, floorY, k) {
    const p = P();
    const up = { base: css(mix(p.furnitureRim, p.furniture, 0.45)), sh: css(mix(p.furniture, p.furnitureShade, 0.3)), deep: css(p.furnitureShade), rim: css(mix(p.furnitureRim, WHITE, 0.35)), cool: rgba(MAT.cool, 0.4) };
    // base cabinet with drawers
    cel(g, RR(x0 + 30 * k, top + 34 * k, x1 - x0 - 60 * k, floorY - top - 34 * k, 6 * k), MAT.furn, { ds: 6 * k, rw: 2 * k, extra: (c) => {
      for (let i = 0; i < 3; i++) {
        const dx = x0 + 44 * k + i * ((x1 - x0 - 88 * k) / 3);
        c.strokeStyle = rgba(p.furnitureRim, 0.22);
        c.lineWidth = 2 * k;
        c.beginPath();
        rrect(c, dx, top + 52 * k, (x1 - x0 - 100 * k) / 3, 44 * k, 4 * k);
        c.stroke();
        fRR(c, css(p.steel), dx + (x1 - x0 - 100 * k) / 6 - 14 * k, top + 70 * k, 28 * k, 5 * k, 2.5 * k);
      }
    } });
    // padded top + raised head end
    cel(g, RR(x0, top, x1 - x0, 40 * k, 14 * k), up, { ds: 8 * k, rw: 3 * k });
    g.save();
    g.translate(x0 + 6 * k, top + 26 * k);
    g.rotate(-0.24);
    cel(g, RR(0, -46 * k, 176 * k, 46 * k, 14 * k), up, { L: [Math.cos(0.24) * KEY[0] - Math.sin(0.24) * KEY[1], Math.sin(0.24) * KEY[0] + Math.cos(0.24) * KEY[1]], ds: 8 * k, rw: 3 * k, extra: (c) => {
      c.strokeStyle = rgba(p.furnitureShade, 0.5);
      c.lineWidth = 2 * k;
      c.beginPath();
      c.moveTo(10 * k, -16 * k);
      c.lineTo(166 * k, -16 * k);
      c.stroke();
    } });
    g.restore();
    // paper sheet
    const pap = { base: rgba(p.plasterPad, 0.92), sh: rgba(p.plunger, 0.9), rim: css(WHITE), cool: rgba(MAT.cool, 0.4) };
    cel(g, RR(x0 + 130 * k, top - 4 * k, x1 - x0 - 150 * k, 16 * k, 4 * k), pap, { ds: 3 * k, rw: 1.4 * k });
    cel(g, ELL(x1 - 14 * k, top + 12 * k, 14 * k, 16 * k), pap, { ds: 4 * k, rw: 1.4 * k });
  }

  // ---- floor (wide): glossy, with reflections of the light sources
  function floorFill(g, x0, x1, fy, y1, k, refl) {
    const p = P();
    const gr = g.createLinearGradient(0, fy, 0, y1);
    gr.addColorStop(0, css(mix(p.floor, p.furniture, 0.45)));
    gr.addColorStop(0.35, p.floor);
    gr.addColorStop(1, css(mix(p.floor, p.sky[0], 0.4)));
    g.fillStyle = gr;
    g.fillRect(x0, fy, x1 - x0, y1 - fy);
    g.globalCompositeOperation = "lighter";
    for (const [rx, rw, col, a] of refl) {
      pool(g, rx, fy + 30 * k, rw * 0.62, col, a, 0.32);
      pool(g, rx, fy + 60 * k, rw * 0.3, col, a * 0.7, 0.9);
    }
    g.globalCompositeOperation = "source-over";
    // floor tile seams in perspective
    g.strokeStyle = rgba(p.floorRim, 0.18);
    g.lineWidth = 1.5 * k;
    for (let i = -10; i <= 10; i++) {
      g.beginPath();
      g.moveTo(CX + i * 120 * k, fy);
      g.lineTo(CX + i * 420 * k, y1);
      g.stroke();
    }
    for (const fyy of [fy + 30 * k, fy + 80 * k, fy + 150 * k]) {
      g.beginPath();
      g.moveTo(x0, fyy);
      g.lineTo(x1, fyy);
      g.stroke();
    }
    // baseboard
    cel(g, RR(x0, fy - 18 * k, x1 - x0, 20 * k, 2 * k), MAT.furn, { ds: 4 * k, rw: 2 * k });
    g.fillStyle = css(p.floorRim);
    g.fillRect(x0, fy + 2 * k, x1 - x0, 2.5 * k);
  }

  // ================================================================ the rooms
  const ROOM = {};
  function buildMedium() {
    const p = P();
    const L = layer(-M, -M, W + M, H + M);
    const g = L.g;
    wallFill(g, -M, -M, W + M, H + M, H + M);
    wallPanels(g, -M, 1010, -M, 846, H + M, 1, 300);
    backsplash(g, 990, W + M, 742, 870, 1);
    // light pools
    lampLight(g, 330, 470, 1);
    g.globalCompositeOperation = "lighter";
    pool(g, 1240, 760, 520, p.glow[2], 0.12, 0.6); // window light falling on the counter
    pool(g, 1250, 420, 520, p.glow[2], 0.14, 0.9); // spill around the window
    g.globalCompositeOperation = "source-over";
    lightbox(g, 26, 58, 216, 300, 1);
    bpGauge(g, 348, 84, 0.9);
    const win = windowFrame(g, { x0: 950, y0: 50, x1: 1550, y1: 724 }, 1, { blind: 0.13, sillProps: true });
    cabinet(g, 1618, 34, 420, 760, 1, 7);
    counter(g, 990, W + M, 878, H + M, 1);
    // counter items (right of the hero)
    gloveBox(g, 1112, 872, 150, 74, 1);
    jar(g, 1262, 872, 86, 104, 1, "cotton", p.sparkPink);
    pumpBottle(g, 1366, 872, 46, 98, 1);
    boxItem(g, 1458, 872, 96, 60, 1, mix(p.pill.cyan, p.plunger, 0.3));
    boxItem(g, 1450, 812, 74, 40, 1, mix(p.sparkPink, p.plunger, 0.35));
    sharpsBin(g, 1590, 872, 96, 104, 1);
    jar(g, 1720, 872, 70, 90, 1, "sticks", mix(p.furnitureRim, WHITE, 0.3));
    vialRack(g, 1846, 872, 4, 1);
    // plant bottom-left
    plant(g, 150, 1150, 1, 3, mix(p.plunger, p.furnitureRim, 0.25));
    lampBody(g, 330, 470, 1);
    ROOM.medium = { L, win, lamp: [330, 470], lightbox: [134, 208], cab: [1618, 34, 420, 760] };
    ROOM.medium.sky = buildSky({ x0: win.ix0, y0: win.iy0, x1: win.ix1, y1: win.iy1 }, 11, 1);
  }
  function buildWide() {
    const p = P();
    const L = layer(-M, -M, W + M, H + M);
    const g = L.g;
    const fy = 866;
    wallFill(g, -M, -M, W + M, fy, fy);
    wallPanels(g, -M, W + M, -M, 676, fy, 0.62, 230);
    backsplash(g, 1280, 1712, 706, 772, 0.6);
    pool(g, 960, 250, 980, [120, 80, 230], 0.2, 0.45);
    lampLight(g, 520, 520, 0.62);
    g.globalCompositeOperation = "lighter";
    pool(g, 960, 760, 520, p.glow[2], 0.1, 0.5);
    pool(g, 960, 590, 420, p.glow[2], 0.16, 0.8);
    g.globalCompositeOperation = "source-over";
    lightbox(g, 210, 418, 150, 200, 0.62);
    wallClock(g, 102, 470, 40, 0.8);
    bpGauge(g, 410, 444, 0.55);
    dispenser(g, 1275, 560, 0.62);
    const win = windowFrame(g, { x0: 690, y0: 394, x1: 1230, y1: 780 }, 0.62, { blind: 0.12, sillProps: true });
    cabinet(g, 1320, 404, 330, 302, 0.62, 9);
    counter(g, 1280, 1712, 776, fy, 0.62);
    jar(g, 1350, 772, 52, 62, 0.62, "cotton", p.sparkPink);
    gloveBox(g, 1440, 772, 90, 46, 0.62);
    pumpBottle(g, 1520, 772, 28, 60, 0.62);
    sharpsBin(g, 1600, 772, 58, 64, 0.62);
    vialRack(g, 1672, 772, 3, 0.62);
    floorFill(g, -M, W + M, fy, H + M, 1, [
      [960, 640, p.glow[3], 0.26],
      [520, 300, p.lamp, 0.22],
      [285, 180, p.screen, 0.12],
      [1480, 380, p.screen, 0.07],
    ]);
    g.globalCompositeOperation = "lighter";
    pool(g, 960, 1000, 380, mix(p.glow[2], p.furnitureRim, 0.4), 0.22, 0.22);
    // window light streaks across the floor
    for (const [x0, w0, a] of [[760, 70, 0.07], [900, 110, 0.09], [1080, 80, 0.07]]) {
      const gg = g.createLinearGradient(0, fy, 0, H + M);
      gg.addColorStop(0, rgba(p.glow[3], a));
      gg.addColorStop(1, rgba(p.glow[3], 0));
      g.fillStyle = gg;
      g.beginPath();
      g.moveTo(x0, fy);
      g.lineTo(x0 + w0, fy);
      g.lineTo(x0 + w0 * 1.8 + 120, H + M);
      g.lineTo(x0 + 60, H + M);
      g.closePath();
      g.fill();
    }
    g.globalCompositeOperation = "source-over";
    couch(g, 40, 560, 716, fy, 0.9);
    plant(g, 1800, 900, 0.66, 5, mix(p.furniture, p.furnitureRim, 0.5));
    lampBody(g, 520, 520, 0.62);
    ROOM.wide = { L, win, lamp: [520, 520], lightbox: [285, 518], cab: [1320, 404, 330, 302], clock: [102, 470, 40, 0.8] };
    ROOM.wide.sky = buildSky({ x0: win.ix0, y0: win.iy0, x1: win.ix1, y1: win.iy1 }, 23, 0.68);
  }

  // dust motes floating in a light pool (live), positions in design coords
  function motes(ctx, t, n, cx, cy, rx, ry, seed, col, size) {
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < n; i++) {
      const bx = cx + (hsh(i, seed, 1) - 0.5) * 2 * rx;
      const by = cy + (hsh(i, seed, 2) - 0.5) * 2 * ry;
      const sp = 6 + 10 * hsh(i, seed, 3);
      const x = bx + 26 * nz(t * 0.11 + i * 1.7, seed + 1) + sp * Math.sin(t * 0.21 + i);
      const ph = fract(hsh(i, seed, 4) + t * 0.008 * sp);
      const y = by - ph * 120 + 60 + 14 * nz(t * 0.13 + i * 2.3, seed + 2);
      const fall = (1 - Math.pow(Math.abs(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2), 1.2)) * Math.sin(Math.PI * ph);
      if (fall <= 0) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * (1.2 + hsh(i, seed, 5)) + i * 3.1);
      ctx.globalAlpha = clamp(fall) * (0.3 + 0.7 * tw);
      const s = size * (0.6 + 0.8 * hsh(i, seed, 6));
      ctx.drawImage(col, x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  // ================================================================ back / front / heroAt
  function shotOf(o) {
    return o && o.shot === "wide" ? "wide" : "medium";
  }
  function back(ctx, o = {}) {
    if (!ready) return;
    const name = shotOf(o);
    const S = SHOTS[name];
    const R = ROOM[name];
    const t = o.t || 0;
    const push = clamp(o.push || 0);
    const pv = S.pivot;
    ctx.save();
    // 1. sky (deepest layer)
    const Ts = xf(1 + S.z.sky * push, pv, o.cam);
    setT(ctx, Ts);
    drawSkyLive(ctx, R.sky, t);
    // 2. the room with the window panes cut out
    const Tr = xf(1 + S.z.room * push, pv, o.cam);
    setT(ctx, Tr);
    blit(ctx, R.L);
    // 3. living light: the lamp breathes, the lightbox hums, the cabinet strip shimmers
    const p = P();
    const k = name === "wide" ? 0.62 : 1;
    const br = 0.82 + 0.1 * Math.sin(t * 1.25) + 0.08 * nz(t * 0.9, 3);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.4 * br;
    const lr = 330 * k;
    ctx.drawImage(SPR.lampGlow, R.lamp[0] - lr, R.lamp[1] - lr, lr * 2, lr * 2);
    ctx.globalAlpha = 0.55 * br;
    const lr2 = 120 * k;
    ctx.drawImage(SPR.lampCore, R.lamp[0] - lr2, R.lamp[1] + 20 * k - lr2 * 0.6, lr2 * 2, lr2 * 1.2);
    const hum = 0.75 + 0.15 * Math.sin(t * 2.3) + 0.1 * nz(t * 6, 9);
    ctx.globalAlpha = 0.22 * hum;
    const bw = 230 * k;
    ctx.drawImage(SPR.screenGlow, R.lightbox[0] - bw, R.lightbox[1] - bw, bw * 2, bw * 2);
    const cb = R.cab;
    ctx.globalAlpha = 0.18 + 0.05 * Math.sin(t * 0.8 + 1);
    ctx.drawImage(SPR.screenGlow, cb[0] + cb[2] * 0.1, cb[1] - cb[3] * 0.1, cb[2] * 0.8, cb[3] * 0.4);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (R.clock) clockSecond(ctx, R.clock[0], R.clock[1], R.clock[2], R.clock[3], t);
    // 4. dust motes in the lamp light and the window light
    motes(ctx, t, name === "wide" ? 22 : 34, R.lamp[0], R.lamp[1] + 120 * k, 300 * k, 330 * k, 4, SPR.moteWarm, 3.2 * k + 1);
    motes(ctx, t, name === "wide" ? 12 : 16, (R.win.ix0 + R.win.ix1) / 2, (R.win.iy0 + R.win.iy1) / 2 + 80 * k, 300 * k, 260 * k, 8, SPR.moteCool, 2.6 * k + 1);
    // 5. the hero's contact shadow on the floor (wide)
    if (name === "wide") {
      const at = heroAt(name, push, o.cam);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const s = at.h / 404;
      ctx.globalAlpha = 0.8;
      ctx.drawImage(SPR.shadow, at.x - 110 * s, at.y - 15 * s, 220 * s, 30 * s);
      ctx.globalAlpha = 0.4;
      ctx.drawImage(SPR.shadow, at.x - 20 * s, at.y - 14 * s, 340 * s, 30 * s);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function front(ctx, o = {}) {
    if (!ready) return;
    const name = shotOf(o);
    const S = SHOTS[name];
    const t = o.t || 0;
    const push = clamp(o.push || 0);
    const Tf = xf(1 + S.z.front * push, S.pivot, o.cam);
    ctx.save();
    setT(ctx, Tf);
    const F = FRONT[name];
    blit(ctx, F.L);
    const p = P();
    if (name === "medium") {
      // a slow glint sliding along the tray rim, glow on the vial
      ctx.globalCompositeOperation = "lighter";
      const u = fract(t * 0.09 + 0.2);
      const gx = lerp(1250, 1900, u);
      ctx.globalAlpha = 0.55 * Math.sin(u * Math.PI);
      ctx.drawImage(SPR.glint[1], gx - 30, 950 - 30, 60, 60);
      ctx.globalAlpha = 0.35 + 0.1 * Math.sin(t * 1.7);
      ctx.drawImage(SPR.medHalo, F.vial[0] - 90, F.vial[1] - 60, 180, 120);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    } else {
      motes(ctx, t, 10, 960, 760, 760, 300, 12, SPR.moteWarm, 3.4);
    }
    ctx.restore();
  }

  function heroAt(shot, push = 0, cam) {
    const name = shot === "wide" ? "wide" : "medium";
    const S = SHOTS[name];
    const T = xf(1 + S.z.hero * clamp(push), S.pivot, cam);
    const q = ap(T, S.hero.x, S.hero.y);
    return { x: q[0], y: q[1], h: S.hero.h * T[0], rimSide: S.rimSide };
  }

  // ================================================================ foregrounds
  const FRONT = {};
  function buildFronts() {
    const p = P();
    // medium: the edge of a steel tray at the bottom right, soft focus
    {
      const L = layer(1100, 840, W + M, H + M, 1);
      const tmp = layer(1100, 840, W + M, H + M, 1);
      const g = tmp.g;
      g.translate(0, -54);
      const tray = { base: css(mix(p.steel, p.furniture, 0.3)), sh: css(mix(p.steelShade, p.furniture, 0.35)), rim: css(WHITE), cool: rgba(mix(p.sparkCyan, WHITE, 0.3), 0.9) };
      // tray floor and rim (we look down into it)
      cel(g, RR(1180, 986, 900, 220, 26), tray, { ds: 10, rw: 3 });
      const fl = { base: css(mix(p.steelShade, p.furniture, 0.45)), sh: css(mix(p.steelShade, p.furnitureShade, 0.6)), rim: rgba(WHITE, 0.6) };
      cel(g, RR(1204, 1006, 860, 200, 18), fl, { ds: -8, rw: 2 });
      g.fillStyle = rgba(WHITE, 0.8);
      g.fillRect(1200, 988, 860, 3);
      // cotton balls
      const cotton = (x, y, r) => {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU + hsh(i, x | 0) * 0.6;
          const cx = x + Math.cos(a) * r * 0.42;
          const cy = y + Math.sin(a) * r * 0.32;
          fEll(g, css(mix(p.glass, p.plungerShade, 0.45)), cx + 4, cy + 5, r * 0.55, r * 0.5);
        }
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU + hsh(i, x | 0) * 0.6;
          const cx = x + Math.cos(a) * r * 0.42;
          const cy = y + Math.sin(a) * r * 0.32;
          fEll(g, css(mix(p.glass, WHITE, 0.5)), cx, cy, r * 0.52, r * 0.46);
        }
        fEll(g, css(WHITE), x - r * 0.15, y - r * 0.2, r * 0.45, r * 0.36);
        fEll(g, rgba(mix(p.lamp, WHITE, 0.5), 0.6), x - r * 0.45, y - r * 0.2, r * 0.18, r * 0.25);
      };
      cotton(1310, 1046, 58);
      cotton(1408, 1060, 50);
      cotton(1352, 1100, 46);
      // alcohol wipe packet
      g.save();
      g.translate(1590, 1060);
      g.rotate(-0.12);
      const pk = { base: css(mix(p.glass, WHITE, 0.4)), sh: css(mix(p.plunger, p.plungerShade, 0.5)), rim: css(WHITE), cool: rgba(MAT.cool, 0.5) };
      cel(g, RR(-92, -60, 184, 120, 8), pk, { ds: 6, rw: 2.5, extra: (c) => {
        c.fillStyle = css(p.pill.cyan);
        c.fillRect(-92, -16, 184, 26);
        c.fillStyle = rgba(WHITE, 0.9);
        c.fillRect(-10, -12, 20, 18);
        c.fillStyle = css(p.pill.cyan);
        c.fillRect(-3, -9, 6, 12);
        c.fillRect(-7, -5, 14, 4);
        c.fillStyle = rgba(p.plungerShade, 0.6);
        for (let i = -88; i < 90; i += 8) {
          c.fillRect(i, -58, 4, 5);
          c.fillRect(i, 53, 4, 5);
        }
      } });
      g.restore();
      // a small vial lying down
      g.save();
      g.translate(1790, 1050);
      g.rotate(0.35);
      g.fillStyle = rgba(p.glass, 0.25);
      g.beginPath();
      rrect(g, -70, -24, 140, 48, 12);
      g.fill();
      g.fillStyle = rgba(p.med, 0.95);
      g.beginPath();
      rrect(g, -60, -16, 110, 32, 9);
      g.fill();
      g.fillStyle = rgba(p.medGlow, 0.95);
      g.fillRect(-56, -12, 100, 7);
      cel(g, RR(56, -27, 34, 54, 6), MAT.steel, { ds: 4, rw: 2 });
      g.fillStyle = "rgba(255,255,255,0.8)";
      g.fillRect(-64, -22, 120, 4);
      g.restore();
      // soften (out of focus) into the final layer
      L.g.setTransform(1, 0, 0, 1, 0, 0);
      L.g.filter = "blur(2.5px)";
      L.g.drawImage(tmp.c, 0, 0);
      L.g.filter = "none";
      FRONT.medium = { L, vial: [1790, 996] };
    }
    // wide: dark soft leaves in both bottom corners
    {
      const L = layer(-M, 700, W + M, H + M, 1);
      const tmp = layer(-M, 700, W + M, H + M, 1);
      const g = tmp.g;
      const dark = { base: css(mix(LEAF_DEEP, p.sky[0], 0.25)), sh: css(mix(LEAF_DEEP, p.sky[0], 0.6)), rim: rgba(mix(LEAF_RIM, p.lamp, 0.25), 0.9), cool: rgba(mix(LEAF_SH, MAT.cool, 0.4), 0.6) };
      const big = (x, y, a, len, wid) => {
        g.save();
        g.translate(x, y);
        g.rotate(a);
        cel(g, (c, dx = 0, dy = 0) => {
          c.moveTo(dx, dy);
          c.bezierCurveTo(len * 0.22 + dx, -wid + dy, len * 0.72 + dx, -wid * 0.8 + dy, len + dx, dy);
          c.bezierCurveTo(len * 0.7 + dx, wid * 0.7 + dy, len * 0.22 + dx, wid * 0.9 + dy, dx, dy);
          c.closePath();
        }, dark, { L: [Math.cos(a) * KEY[0] + Math.sin(a) * KEY[1], -Math.sin(a) * KEY[0] + Math.cos(a) * KEY[1]], ds: 8, rw: 3 });
        g.restore();
      };
      big(-70, 1160, -0.85, 270, 74);
      big(-50, 1130, -0.42, 300, 82);
      big(40, 1180, -1.2, 240, 64);
      big(1990, 1170, -2.35, 240, 66);
      big(1990, 1130, -2.8, 270, 74);
      L.g.setTransform(1, 0, 0, 1, 0, 0);
      L.g.filter = "blur(3px)";
      L.g.drawImage(tmp.c, 0, 0);
      L.g.filter = "none";
      FRONT.wide = { L };
    }
  }

  // ================================================================ the syringe
  const SG = { NL: 96, NW: 3.4, BEV: 12, HUB0: -96, HUB1: -122, BX0: -138, BL: 260, BR: 24, WALL: 3.2, FLT: 9, FLH: 54, STOP: 24, TRAVEL: 176, ROD: 300, PADT: 9, PADH: 36 };
  SG.BX1 = SG.BX0 - SG.BL;
  function syrGeom(plunger, fill) {
    const xs = SG.BX0 - 4 - SG.TRAVEL * (1 - plunger);
    const xp = xs - SG.STOP - SG.ROD;
    const front = SG.BX0 - SG.WALL;
    const medEnd = front - (front - xs) * clamp(fill);
    return { xs, xp, front, medEnd };
  }
  // two-bone IK: joint for a chain a -> j -> b
  function ik(a, b, l1, l2, bend) {
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    let d = Math.hypot(dx, dy) || 0.001;
    const dmax = l1 + l2 - 0.5;
    if (d > dmax) {
      dx *= dmax / d;
      dy *= dmax / d;
      d = dmax;
    }
    const ca = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const ang = Math.atan2(dy, dx) + bend * Math.acos(ca);
    return [a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1];
  }
  function finger(ctx, pts, ws, L, sheen = true) {
    const sh = CAP(pts, ws);
    cel(ctx, sh, MAT.glove, { L, ds: ws[0] * 0.22, rw: 2.2, extra: (c) => {
      if (!sheen) return;
      // nitrile sheen: a soft lens on the lit side of each segment
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const nx = -(b[1] - a[1]);
        const ny = b[0] - a[0];
        const l = Math.hypot(nx, ny) || 1;
        const sd = (nx * L[0] + ny * L[1]) / l > 0 ? 1 : -1;
        const off = (ws[i] * 0.26 * sd) / 1;
        fLens(c, rgba(P().gloveLight, 0.55), a[0] + (nx / l) * off, a[1] + (ny / l) * off, b[0] + (nx / l) * off, b[1] + (ny / l) * off, 0, ws[i] * 0.07);
      }
      // knuckle crease
      if (pts.length > 2) {
        const j = pts[1];
        fEll(c, rgba(P().gloveDeep, 0.4), j[0], j[1], ws[1] * 0.3, ws[1] * 0.08, Math.atan2(pts[2][1] - pts[0][1], pts[2][0] - pts[0][0]) + Math.PI / 2);
      }
    } });
  }
  // the nurse's arm: lab-coat sleeve, glove wrist and the rolled lip of the glove cuff
  // clip to the half-plane on the side `sg` (+1 ahead, -1 behind) of a line through q, normal d
  function halfClip(ctx, q, d, sg) {
    const B = 3000;
    const n = [-d[1], d[0]];
    ctx.beginPath();
    ctx.moveTo(q[0] + n[0] * B, q[1] + n[1] * B);
    ctx.lineTo(q[0] - n[0] * B, q[1] - n[1] * B);
    ctx.lineTo(q[0] - n[0] * B + sg * d[0] * B, q[1] - n[1] * B + sg * d[1] * B);
    ctx.lineTo(q[0] + n[0] * B + sg * d[0] * B, q[1] + n[1] * B + sg * d[1] * B);
    ctx.closePath();
    ctx.clip();
  }
  function wrist(ctx, L, w0, dir, wW) {
    const p = P();
    const at = (d) => [w0[0] + dir[0] * d, w0[1] + dir[1] * d];
    const hem = at(wW * 1.02);
    ctx.save();
    halfClip(ctx, hem, dir, 1);
    cel(ctx, CAP([at(wW * 0.6), at(wW * 9)], [wW * 1.5, wW * 1.75]), MAT.coat, { L, ds: wW * 0.22, rw: 3.5, extra: (c) => {
      const a = at(wW * 1.8);
      const b = at(wW * 3.4);
      fLens(c, rgba(COAT_DEEP, 0.4), a[0] - dir[1] * wW * 0.5, a[1] + dir[0] * wW * 0.5, b[0] - dir[1] * wW * 0.1, b[1] + dir[0] * wW * 0.1, wW * 0.08, wW * 0.06);
      const e = at(wW * 1.2);
      fLens(c, rgba(COAT_DEEP, 0.5), e[0] - dir[1] * wW * 0.75, e[1] + dir[0] * wW * 0.75, e[0] + dir[1] * wW * 0.75, e[1] - dir[0] * wW * 0.75, -wW * 0.1, wW * 0.05);
    } });
    ctx.restore();
    ctx.save();
    halfClip(ctx, hem, dir, -1);
    cel(ctx, CAP([w0, at(wW * 1.6)], [wW, wW * 1.1]), MAT.glove, { L, ds: wW * 0.16, rw: 2.6 });
    ctx.restore();
    // rolled lip of the cuff: a band across the wrist
    const m = at(wW * 1.02);
    const a = Math.atan2(dir[1], dir[0]);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const Lr = [ca * L[0] + sa * L[1], -sa * L[0] + ca * L[1]];
    ctx.save();
    ctx.translate(m[0], m[1]);
    ctx.rotate(a);
    cel(ctx, RR(-wW * 0.1, -wW * 0.6, wW * 0.2, wW * 1.2, wW * 0.09), MAT.glove, { L: Lr, ds: wW * 0.05, rw: 2.2, extra: (c) => {
      c.fillStyle = rgba(p.gloveLight, 0.55);
      c.fillRect(-wW * 0.07, -wW * 0.6, wW * 0.035, wW * 1.2);
    } });
    ctx.restore();
  }
  function palmShape(ctx, pts, L, kn) {
    const p = P();
    cel(ctx, SPL(pts), MAT.glove, { L, ds: 12, rw: 2.8, extra: (c) => {
      // tendon sheen and knuckle bumps on the back of the hand
      for (const k of kn) fEll(c, rgba(p.gloveLight, 0.4), k[0], k[1], 10, 6, k[2] || 0);
      fLens(c, rgba(p.gloveLight, 0.35), kn[0][0] - 60, kn[0][1] - 30, kn[kn.length - 1][0] - 30, kn[kn.length - 1][1] - 40, -8, 5);
    } });
  }
  function handThumb(ctx, G, L) {
    const BR = SG.BR;
    const F = SG.BX1; // flange front face
    const pad = G.xp - SG.PADT; // outer face of the thumb pad
    // wrist and sleeve leave back and up from the back of the hand
    wrist(ctx, L, [F - 136, -BR - 36], [-0.8, -0.6], 80);
    // back of the hand, wrapped round the rod behind the flange
    palmShape(ctx, [[F + 8, -BR - 6], [F + 6, -BR - 40], [F - 24, -BR - 64], [F - 96, -BR - 70], [F - 150, -BR - 52], [F - 164, -BR - 6], [F - 140, BR - 4], [F - 70, BR + 2], [F - 6, BR - 6]], L,
      [[F - 6, -BR - 30, 0.4], [F - 10, -BR - 6, 0.4], [F - 12, BR - 18, 0.4]]);
    // thumb: from the top of the hand to the pad's back face; it bends as the plunger goes in
    const tb = [F - 136, -BR - 34];
    const tt = [pad - 13, -2];
    const j1 = ik(tb, tt, 66, 60, 1);
    const j2 = ik(tb, tt, 66, 60, -1);
    const tj = j1[1] < j2[1] ? j1 : j2; // the knuckle pops up, away from the rod
    finger(ctx, [tb, tj, tt], [40, 33, 28], L);
    fEll(ctx, rgba(P().gloveLight, 0.5), tt[0] - 2, tt[1] - 8, 7, 4, Math.atan2(tt[1] - tj[1], tt[0] - tj[0]));
    // index and middle fingers hooked round the barrel just in front of the flange
    finger(ctx, [[F - 4, BR - 10], [F + 30, BR + 14], [F + 44, BR - 8]], [28, 26, 23], L);
    finger(ctx, [[F - 4, -BR - 24], [F + 22, -BR - 4], [F + 30, BR + 2]], [30, 28, 25], L);
  }
  // dart grip: four fingers wrapped over the barrel near its middle, thumb pinching from behind
  const DART_GX = SG.BX0 - SG.BL * 0.44;
  function handDartBehind(ctx, G, L) {
    const BR = SG.BR;
    const gx = DART_GX;
    finger(ctx, [[gx - 96, BR - 14], [gx - 30, BR + 10], [gx + 34, BR + 8]], [36, 33, 29], L);
  }
  function handDart(ctx, G, L) {
    const BR = SG.BR;
    const gx = DART_GX;
    wrist(ctx, L, [gx - 86, -BR - 82], [-0.72, -0.7], 82);
    palmShape(ctx, [[gx + 40, -BR - 14], [gx + 36, -BR - 52], [gx - 6, -BR - 90], [gx - 76, -BR - 104], [gx - 126, -BR - 76], [gx - 118, -BR - 26], [gx - 72, -BR - 6]], L,
      [[gx + 28, -BR - 34], [gx + 2, -BR - 40], [gx - 24, -BR - 38], [gx - 48, -BR - 32]]);
    finger(ctx, [[gx - 54, -BR - 24], [gx - 48, -BR + 6], [gx - 44, BR * 0.25]], [24, 22, 19], L);
    finger(ctx, [[gx - 28, -BR - 28], [gx - 20, -BR + 4], [gx - 16, BR * 0.62]], [28, 26, 23], L);
    finger(ctx, [[gx - 2, -BR - 30], [gx + 6, -BR + 2], [gx + 10, BR + 2]], [30, 28, 25], L);
    finger(ctx, [[gx + 24, -BR - 26], [gx + 32, -BR + 2], [gx + 36, BR - 4]], [29, 27, 24], L);
  }

  function syringeBody(ctx, G, o, L, U, t) {
    const p = P();
    const BR = SG.BR;
    const ri = BR - SG.WALL;
    const { xs, xp, front, medEnd } = G;
    const fill = clamp(o.fill == null ? 1 : o.fill);
    const hasMed = fill > 0.001 && medEnd < front - 0.5;
    // medicine halo (additive), behind the glass
    if (hasMed) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.6;
      ctx.drawImage(SPR.medHalo, medEnd - 50, -BR - 46, front - medEnd + 100 + 30, 2 * BR + 92);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    // needle
    const nw = SG.NW / 2;
    const needle = POLY([[SG.HUB0 - 2, -nw], [-SG.BEV, -nw], [0, nw], [SG.HUB0 - 2, nw]]);
    ctx.beginPath();
    needle(ctx);
    ctx.fillStyle = css(p.steel);
    ctx.fill();
    ctx.fillStyle = css(p.steelShade);
    ctx.fillRect(SG.HUB0 - 2, U < 0 ? nw * 0.15 : -nw, SG.NL - SG.BEV + 2, nw * 0.85);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(SG.HUB0 - 2, U < 0 ? -nw : nw * 0.25, SG.NL - SG.BEV * 0.6, nw * 0.6);
    // bevel facet and lumen
    ctx.fillStyle = css(mix(p.steel, WHITE, 0.6));
    ctx.beginPath();
    ctx.moveTo(-SG.BEV, -nw);
    ctx.lineTo(0, nw);
    ctx.lineTo(-SG.BEV * 0.45, -nw);
    ctx.closePath();
    ctx.fill();
    fLens(ctx, rgba(p.steelShade, 0.9), -SG.BEV * 0.7, -nw * 0.4, -SG.BEV * 0.2, nw * 0.5, 0, nw * 0.25);
    // hub (pink plastic) with fins
    const hub = POLY([[SG.HUB0, -4.4], [SG.HUB0 - 7, -5.6], [SG.HUB1 + 5, -9], [SG.HUB1, -10.5], [SG.HUB1, 10.5], [SG.HUB1 + 5, 9], [SG.HUB0 - 7, 5.6], [SG.HUB0, 4.4]]);
    cel(ctx, hub, MAT.hub, { L, ds: 3, rw: 1.2, extra: (c) => {
      c.fillStyle = rgba(HUB_SH, 0.6);
      for (let i = 0; i < 3; i++) c.fillRect(SG.HUB1 + 4 + i * 5, -12, 1.6, 24);
      c.fillStyle = rgba(WHITE, 0.6);
      c.fillRect(SG.HUB0 - 20, U * 5.5 - 0.8, 14, 1.6);
    } });
    cel(ctx, RR(SG.HUB1 + 2, -13.5, 6, 27, 2), MAT.hub, { L, ds: 1.5, rw: 1 });
    // nozzle (glass) with medicine in its channel
    const nzx0 = SG.HUB1 - 1;
    ctx.fillStyle = rgba(p.glass, 0.35);
    ctx.fillRect(SG.BX0 - 2, -6.5, nzx0 - SG.BX0 + 2, 13);
    if (hasMed) {
      ctx.fillStyle = rgba(p.med, 0.95);
      ctx.fillRect(SG.BX0 - 2, -3, nzx0 - SG.BX0 + 2, 6);
    }
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(SG.BX0 - 2, U < 0 ? -6.5 : 5, nzx0 - SG.BX0 + 2, 1.5);
    // barrel back glass
    const barrel = RR(SG.BX1, -BR, SG.BL, BR * 2, 7);
    ctx.beginPath();
    barrel(ctx);
    ctx.fillStyle = rgba(p.glass, 0.13);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    rrect(ctx, SG.BX1 + 1, -ri, SG.BL - SG.WALL - 1, ri * 2, 5);
    ctx.clip();
    // far-wall shading: a darker band on the shadow side
    ctx.fillStyle = rgba(p.rubber, 0.22);
    ctx.fillRect(SG.BX1, U < 0 ? ri * 0.35 : -ri, SG.BL, ri * 0.65);
    // medicine column
    if (hasMed) {
      const x0 = medEnd;
      const x1 = front + 1;
      ctx.fillStyle = rgba(p.med, 0.93);
      ctx.fillRect(x0, -ri, x1 - x0, ri * 2);
      ctx.fillStyle = rgba(p.medDeep, 0.85);
      ctx.fillRect(x0, U < 0 ? ri * 0.45 : -ri, x1 - x0, ri * 0.55);
      // bright caustic core
      fLens(ctx, rgba(p.medGlow, 0.85), x0 + 6, -U * ri * 0.15, x1 - 6, -U * ri * 0.15, 0, ri * 0.22);
      ctx.fillStyle = rgba(WHITE, 0.6);
      ctx.fillRect(x0 + 4, -U * ri * 0.18 - 0.8, (x1 - x0) * 0.6, 1.6);
      // meniscus when the column does not reach the stopper
      if (fill < 0.999) {
        fEll(ctx, rgba(p.medGlow, 0.9), x0, 0, 4, ri);
      }
      // tiny bubbles drifting slowly back toward the stopper
      const n = 6;
      for (let i = 0; i < n; i++) {
        const u = fract(hsh(i, 41) - t * (0.025 + 0.02 * hsh(i, 42)));
        const bx = x1 - 6 - u * (x1 - x0 - 12);
        if (bx < x0 + 3) continue;
        const by = (hsh(i, 43) - 0.5) * ri * 1.4 + Math.sin(t * 2 + i) * 1.2;
        const br = 1.4 + 2.2 * hsh(i, 44);
        const ba = Math.sin(Math.PI * u);
        ctx.strokeStyle = rgba(WHITE, 0.75 * ba);
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, TAU);
        ctx.stroke();
        fEll(ctx, rgba(WHITE, 0.9 * ba), bx - br * 0.35, by - br * 0.35, br * 0.35, br * 0.3);
      }
    }
    // stopper (rubber) with ribs
    const sx0 = xs - SG.STOP;
    ctx.fillStyle = css(p.rubber);
    ctx.beginPath();
    ctx.moveTo(sx0, -ri);
    ctx.lineTo(xs - 2, -ri);
    ctx.quadraticCurveTo(xs + 6, 0, xs - 2, ri);
    ctx.lineTo(sx0, ri);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = css(mix(p.rubber, p.furnitureShade, 0.5));
    ctx.fillRect(sx0 + 7, -ri, 4, ri * 2);
    ctx.fillRect(sx0 + 15, -ri, 3, ri * 2);
    ctx.fillStyle = css(mix(p.rubber, p.plunger, 0.38));
    ctx.fillRect(sx0, U < 0 ? -ri : ri * 0.35, SG.STOP, ri * 0.65);
    ctx.fillStyle = rgba(WHITE, 0.55);
    ctx.fillRect(sx0 + 1, U < 0 ? -ri * 0.75 : ri * 0.6, SG.STOP - 4, 1.6);
    // rod inside the barrel (seen through the glass)
    const rh = ri - 3;
    ctx.fillStyle = rgba(p.plunger, 0.85);
    ctx.fillRect(SG.BX1 - 2, -rh, sx0 - SG.BX1 + 2, rh * 2);
    ctx.fillStyle = rgba(p.plungerShade, 0.8);
    ctx.fillRect(SG.BX1 - 2, U < 0 ? rh * 0.2 : -rh, sx0 - SG.BX1 + 2, rh * 0.8);
    ctx.fillStyle = rgba(p.plungerShade, 0.9);
    ctx.fillRect(SG.BX1 - 2, -1.5, sx0 - SG.BX1 + 2, 3);
    ctx.fillStyle = rgba(p.plunger, 0.95);
    ctx.fillRect(sx0 - 5, -ri + 1, 5, ri * 2 - 2);
    ctx.restore();
    // glass front: tint, edges, speculars, ticks
    ctx.beginPath();
    barrel(ctx);
    ctx.fillStyle = rgba(p.glass, 0.08);
    ctx.fill();
    ctx.lineCap = "round";
    ctx.strokeStyle = css(p.glassEdge);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(SG.BX1 + 4, U * (BR - 1.2));
    ctx.lineTo(SG.BX0 - 6, U * (BR - 1.2));
    ctx.stroke();
    ctx.strokeStyle = rgba(mix(p.sparkCyan, WHITE, 0.4), 0.85);
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(SG.BX1 + 4, -U * (BR - 1));
    ctx.lineTo(SG.BX0 - 6, -U * (BR - 1));
    ctx.stroke();
    // front shoulder and back lip
    ctx.strokeStyle = rgba(WHITE, 0.85);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(SG.BX0 - 6, U * (BR - 1.2));
    ctx.quadraticCurveTo(SG.BX0, U * (BR - 1.2), SG.BX0, U * (BR - 8));
    ctx.lineTo(SG.BX0, -U * (BR - 8));
    ctx.stroke();
    ctx.strokeStyle = rgba(WHITE, 0.5);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(SG.BX1 + 1, -BR + 3);
    ctx.lineTo(SG.BX1 + 1, BR - 3);
    ctx.stroke();
    // specular streaks on the lit side
    fRR(ctx, rgba(WHITE, 0.78), SG.BX1 + 18, U < 0 ? -BR + 4.5 : BR - 8.5, SG.BL - 48, 4, 2);
    fRR(ctx, rgba(WHITE, 0.92), SG.BX0 - 44, U < 0 ? -BR + 4 : BR - 8, 26, 4, 2);
    fRR(ctx, rgba(WHITE, 0.1), SG.BX1 + 10, U < 0 ? -BR + 10 : BR - 18, SG.BL - 24, 8, 4);
    fRR(ctx, rgba(WHITE, 0.35), SG.BX1 + 30, -U * (BR - 5) - 1, SG.BL * 0.4, 2, 1);
    // ticks (white mL graduations, no numbers), on the side away from the speculars
    ctx.fillStyle = rgba(WHITE, 0.92);
    for (let i = 0; i <= 20; i++) {
      const tx = SG.BX0 - 10 - i * 11;
      const len = i % 10 === 0 ? 16 : i % 5 === 0 ? 12 : 6.5;
      const y0 = -U * (BR - 2.5);
      ctx.fillRect(tx - 0.8, U < 0 ? y0 - len : y0, 1.6, len);
    }
    // flange
    cel(ctx, RR(SG.BX1 - SG.FLT, -SG.FLH, SG.FLT, SG.FLH * 2, 4.5), MAT.plastic, { L, ds: 3, rw: 1.4 });
    fRR(ctx, rgba(WHITE, 0.8), SG.BX1 - SG.FLT + 2, -SG.FLH + 5, 2, SG.FLH * 2 - 10, 1);
    // rod outside the barrel and the thumb pad
    const rx1 = SG.BX1 - SG.FLT;
    if (rx1 > xp) {
      cel(ctx, RR(xp, -(ri - 4), rx1 - xp, (ri - 4) * 2, 2), MAT.plastic, { L, ds: 3, rw: 1.2, extra: (c) => {
        c.fillStyle = rgba(p.plungerShade, 0.85);
        c.fillRect(xp, -2, rx1 - xp, 4);
        c.fillStyle = rgba(WHITE, 0.7);
        c.fillRect(xp, U < 0 ? -(ri - 5) : ri - 7, rx1 - xp, 1.6);
      } });
    }
    cel(ctx, RR(xp - SG.PADT, -SG.PADH, SG.PADT, SG.PADH * 2, 3.5), MAT.plastic, { L, ds: 2.5, rw: 1.2 });
  }

  let sLayer = null;
  function syringe(ctx, o = {}) {
    if (!ready) return;
    const alpha = o.alpha == null ? 1 : clamp(o.alpha);
    if (alpha <= 0.001) return;
    if (alpha < 0.999) {
      // draw once into a scratch layer, then fade as one flat image
      const cw = ctx.canvas.width;
      const ch = ctx.canvas.height;
      if (!sLayer) sLayer = mkc(cw, ch);
      if (sLayer.width !== cw || sLayer.height !== ch) {
        sLayer.width = cw;
        sLayer.height = ch;
      }
      const lc = sLayer.getContext("2d");
      lc.setTransform(1, 0, 0, 1, 0, 0);
      lc.clearRect(0, 0, cw, ch);
      lc.setTransform(ctx.getTransform());
      syringe(lc, { ...o, alpha: 1 });
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha *= alpha;
      ctx.drawImage(sLayer, 0, 0);
      ctx.restore();
      return;
    }
    const p = P();
    const t = o.t || 0;
    const s = o.scale == null ? 1 : o.scale;
    const ang = o.angle || 0;
    const plunger = clamp(o.plunger || 0);
    const fill = o.fill == null ? 1 : clamp(o.fill);
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    // default: the hand on the screen-upper side of the syringe
    const flip = o.flip == null ? ca < 0 : !!o.flip;
    let lx = ca * KEY[0] + sa * KEY[1];
    let ly = -sa * KEY[0] + ca * KEY[1];
    if (flip) ly = -ly;
    const L = [lx, ly];
    const U = ly < 0 ? -1 : 1;
    const G = syrGeom(plunger, fill);
    ctx.save();
    ctx.translate(o.x || 0, o.y || 0);
    ctx.rotate(ang);
    ctx.scale(s, flip ? -s : s);
    if (o.hand !== false && o.grip === "dart") handDartBehind(ctx, G, L);
    syringeBody(ctx, G, { fill }, L, U, t);
    if (o.hand !== false) {
      if (o.grip === "dart") handDart(ctx, G, L);
      else handThumb(ctx, G, L);
    }
    // the glint: a star sparkle running down the needle to the tip
    const gl = o.glint || 0;
    if (gl > 0 && gl < 1) {
      const gx = lerp(SG.HUB0, -2, Math.pow(gl, 0.8));
      const a = sstep(0, 0.12, gl) * (1 - sstep(0.82, 1, gl));
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a;
      // streak on the steel
      const sl = 36;
      const gr = ctx.createLinearGradient(gx - sl, 0, gx + 8, 0);
      gr.addColorStop(0, "rgba(255,255,255,0)");
      gr.addColorStop(1, "rgba(255,255,255,1)");
      ctx.fillStyle = gr;
      ctx.fillRect(gx - sl, -SG.NW, sl + 8, SG.NW * 2);
      ctx.save();
      ctx.translate(gx, 0);
      ctx.rotate(-ang + gl * 0.8);
      const sz = (30 + 34 * gl + 26 * sstep(0.7, 0.9, gl)) / s;
      ctx.drawImage(SPR.glint[0], -sz, -sz, sz * 2, sz * 2);
      ctx.rotate(Math.PI / 4);
      ctx.globalAlpha = a * 0.5;
      ctx.drawImage(SPR.glint[1], -sz * 0.55, -sz * 0.55, sz * 1.1, sz * 1.1);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  }

  // ================================================================ the arm close-up
  const AC = {
    sx: 880,
    angle: Math.atan2(Math.cos(0.45), -Math.sin(0.45)), // needle points down-left, 26 deg off vertical
    scale: 2.65,
    drops: [620, 292],
    hover: 40,
  };
  AC.dir = [Math.cos(AC.angle), Math.sin(AC.angle)];
  // top contour of the arm: the deltoid's dome near the sleeve, sloping toward the elbow, a soft dip
  // where the muscle inserts
  const armTop = (x) =>
    640 - 42 * Math.exp(-(((x - 560) / 300) ** 2)) + 0.00036 * Math.max(0, x - 560) ** 2 + 10 * Math.exp(-(((x - 1320) / 110) ** 2));
  const armSlope = (x) => (armTop(x + 1) - armTop(x - 1)) / 2;
  AC.site = [AC.sx, armTop(AC.sx) + 14];
  AC.tan = Math.atan(armSlope(AC.sx));
  function armPath(g) {
    g.moveTo(-M - 40, armTop(-M - 40));
    for (let x = -M; x <= W + M + 40; x += 12) g.lineTo(x, armTop(x));
    g.lineTo(W + M + 40, H + M + 400);
    g.lineTo(-M - 40, H + M + 400);
    g.closePath();
  }
  // the rolled-up sleeve: the hoodie over the shoulder, two bunched rolls and the ribbed cuff.
  // Each roll wraps the arm, so from the side it is a ")"-curved band with a rounded top.
  const YC = 960; // centre of the arm's cross-section under the sleeve
  const RTH = 0.62; // how far round the arm the bands are traced (past the frame bottom)
  const rollAt = (R, th, u) => [R.cx + R.e * Math.cos(th) + u * (0.62 + 0.38 * Math.cos(th)), YC + (YC - R.top) * Math.sin(th)];
  function rollPts(R) {
    const n = 14;
    const Lp = [];
    const Rp = [];
    for (let i = 0; i <= n; i++) {
      const th = -Math.PI / 2 + (i / n) * Math.PI * RTH;
      Lp.push(rollAt(R, th, -R.w / 2));
      Rp.push(rollAt(R, th, R.w / 2));
    }
    return [[R.cx, R.top - R.w * 0.12], ...Rp.slice(1), [Rp[n][0], 1420, 1], [Lp[n][0], 1420, 1], ...Lp.slice(1).reverse()];
  }
  const ROLLS = {
    r1: { cx: 196, top: 446, w: 172, e: 46 },
    r2: { cx: 312, top: 464, w: 142, e: 54 },
    cuff: { cx: 414, top: 488, w: 104, e: 60 },
  };
  const SLV = {
    shoulder: [[-220, 430], [-60, 396], [110, 398], [200, 440], [240, 600], [250, 900], [250, 1320], [-220, 1320]],
    r1: rollPts(ROLLS.r1),
    r2: rollPts(ROLLS.r2),
    cuff: rollPts(ROLLS.cuff),
  };

  function buildArm() {
    const p = P();
    const L = layer(-M, -M, W + M, H + M, 1.05);
    const g = L.g;
    const lit = css(mix(p.skin, "#ffd6b4", 0.4));
    const skin = css(p.skin);
    const shade = css(p.skinShade);
    const deep = css(p.skinDeep);
    const band = (off) => {
      g.beginPath();
      g.moveTo(-M - 40, H + M + 400);
      for (let x = -M - 40; x <= W + M + 40; x += 12) g.lineTo(x, armTop(x) + off(x));
      g.lineTo(W + M + 40, H + M + 400);
      g.closePath();
    };
    g.save();
    g.beginPath();
    armPath(g);
    g.fillStyle = lit;
    g.fill();
    g.clip();
    // main tone below the lit top plane, then the cel shadow and the deep tone
    band((x) => 84 + 26 * Math.sin(x * 0.004 + 1) - 0.035 * Math.max(0, x - 900));
    g.fillStyle = skin;
    g.fill();
    // soft roll-off toward the shadow side (big-shape gradient)
    const gr = g.createLinearGradient(0, 700, 0, 1100);
    gr.addColorStop(0, rgba(p.skinShade, 0));
    gr.addColorStop(1, rgba(p.skinShade, 0.35));
    g.fillStyle = gr;
    g.fillRect(-M - 40, 600, W + 2 * M + 80, 700);
    band((x) => 300 + 24 * Math.sin(x * 0.0035 + 0.6) + 0.06 * Math.max(0, x - 700));
    g.fillStyle = shade;
    g.fill();
    band((x) => 470 + 18 * Math.sin(x * 0.005));
    g.fillStyle = deep;
    g.fill();
    // the deltoid's soft front edge (a broad soft shadow) and the bloom on its dome
    g.save();
    g.translate(1010, 930);
    g.rotate(0.3);
    g.globalAlpha = 0.28;
    g.drawImage(SPR.skinShadow, -420, -70, 840, 140);
    g.restore();
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.16;
    g.drawImage(SPR.skinSpec, 430, 590, 380, 120);
    g.globalAlpha = 0.11;
    g.drawImage(SPR.skinSpec, 800, 670, 300, 90);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    // translucent warm band and the rim along the top contour
    g.lineJoin = "round";
    g.beginPath();
    for (let x = 260; x <= W + M + 40; x += 12) (x === 260 ? g.moveTo : g.lineTo).call(g, x, armTop(x));
    g.strokeStyle = rgba(p.lampGlow, 0.28);
    g.lineWidth = 50;
    g.stroke();
    g.strokeStyle = css(mix(HOUSE.light.rim, "#ffd0a0", 0.45));
    g.lineWidth = 9;
    g.stroke();
    g.strokeStyle = rgba(WHITE, 0.55);
    g.lineWidth = 3;
    g.stroke();
    // the sleeve's cast shadow on the skin (hard, magenta-shifted)
    g.fillStyle = css(mix(p.skinShade, p.hoodieShade, 0.25));
    g.beginPath();
    splPath(g, SLV.cuff, 58, 24);
    g.fill();
    g.fillStyle = css(mix(p.skinDeep, p.hoodieDeep, 0.3));
    g.beginPath();
    splPath(g, SLV.cuff, 20, 8);
    g.fill();
    // fine hairs, freckles, a small mole
    const r = EX.rng(77);
    g.lineCap = "round";
    for (let i = 0; i < 80; i++) {
      const x = 500 + r() * 1300;
      const y = armTop(x) + 26 + r() * 520;
      if (y > H + 40) continue;
      const len = 12 + r() * 16;
      const a = 0.35 + armSlope(x) * 0.8 + (r() - 0.5) * 0.5;
      g.strokeStyle = rgba(p.skinDeep, 0.22 + r() * 0.25);
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.6 - 3, x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const x = 560 + r() * 1100;
      const y = armTop(x) + 60 + r() * 420;
      fEll(g, rgba(p.skinDeep, 0.16 + r() * 0.2), x, y, 2 + r() * 2.6, 1.8 + r() * 2);
    }
    fEll(g, rgba(p.skinDeep, 0.55), 1236, 900, 5.5, 5);
    fEll(g, rgba(WHITE, 0.3), 1234, 898, 1.6, 1.4);
    g.restore();
    // hairs sticking out of the silhouette, rim-lit
    for (let i = 0; i < 16; i++) {
      const x = 600 + i * 72 + r() * 30;
      const y = armTop(x) + 2;
      const len = 10 + r() * 12;
      const a = -Math.PI / 2 + 0.7 + armSlope(x) + (r() - 0.5) * 0.4;
      g.strokeStyle = rgba(mix(p.skin, "#ffe2c8", 0.6), 0.75);
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + 2, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len + 4, y + Math.sin(a) * len + 2);
      g.stroke();
    }

    // the sleeve: shoulder fabric, two rolls and the ribbed cuff (each roll shades the next)
    const along = (c, R, u, th0, th1, col, w) => {
      c.strokeStyle = col;
      c.lineWidth = w;
      c.beginPath();
      for (let i = 0; i <= 16; i++) {
        const q = rollAt(R, lerp(th0, th1, i / 16), u);
        if (i) c.lineTo(q[0], q[1]);
        else c.moveTo(q[0], q[1]);
      }
      c.stroke();
    };
    const folds = (c, R, seed) => {
      c.lineCap = "round";
      // the roll's lamp-side bulge catches light; a fold valley runs along it
      along(c, R, -R.w * 0.3, -1.45, 0.4, rgba(p.hoodieLight, 0.32), R.w * 0.12);
      // compression folds: short V creases across the roll
      for (let i = 0; i < 4; i++) {
        const th = -1.22 + i * 0.36 + (hsh(i, seed) - 0.5) * 0.1;
        const a = rollAt(R, th, -R.w * 0.48);
        const m = rollAt(R, th + 0.05 * (i % 2 ? 1 : -1), -R.w * 0.05);
        const b = rollAt(R, th - 0.02, R.w * 0.3);
        c.strokeStyle = rgba(p.hoodieDeep, 0.5);
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(a[0], a[1]);
        c.quadraticCurveTo(m[0], m[1], b[0], b[1]);
        c.stroke();
        c.strokeStyle = rgba(p.hoodieLight, 0.3);
        c.lineWidth = 2.2;
        c.beginPath();
        c.moveTo(a[0], a[1] - 8);
        c.quadraticCurveTo(m[0], m[1] - 8, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 8);
        c.stroke();
      }
      // the rounded top catches the lamp
      const t0 = rollAt(R, -1.5, -R.w * 0.3);
      const t1 = rollAt(R, -1.5, R.w * 0.22);
      fLens(c, rgba(p.hoodieLight, 0.6), t0[0], t0[1] + 8, t1[0], t1[1] + 4, -12, 4);
    };
    cel(g, SPL(SLV.shoulder), MAT.hood, { ds: 24, dd: 70, rw: 6, extra: (c) => {
      c.fillStyle = rgba(p.hoodieDeep, 0.22);
      c.fillRect(-400, 300, 800, 1100);
      // long folds running from the rolls up over the shoulder
      fLens(c, rgba(p.hoodieDeep, 0.5), 200, 470, -160, 560, -20, 9);
      fLens(c, rgba(p.hoodieDeep, 0.4), 210, 640, -160, 760, -24, 8);
      fLens(c, rgba(p.hoodieDeep, 0.35), 200, 860, -160, 960, -20, 7);
      fLens(c, rgba(p.hoodieLight, 0.4), -180, 420, 120, 404, -12, 5);
      // shoulder seam stitching
      c.save();
      c.strokeStyle = rgba(p.hoodieLight, 0.5);
      c.lineWidth = 2.2;
      c.setLineDash([9, 8]);
      c.beginPath();
      c.moveTo(-200, 470);
      c.quadraticCurveTo(-40, 440, 120, 452);
      c.stroke();
      c.restore();
    } });
    cel(g, SPL(SLV.r1), MAT.hood, { ds: 22, dd: 46, rw: 6, extra: (c) => folds(c, ROLLS.r1, 1) });
    cel(g, SPL(SLV.r2), MAT.hood, { ds: 20, dd: 40, rw: 6, extra: (c) => {
      c.fillStyle = rgba(p.hoodieDeep, 0.7);
      c.beginPath();
      splPath(c, SLV.r1, 16, 10);
      c.fill();
      folds(c, ROLLS.r2, 2);
    } });
    cel(g, SPL(SLV.cuff), MAT.rib, { ds: 18, dd: 36, rw: 5, extra: (c) => {
      c.fillStyle = rgba(p.hoodieDeep, 0.7);
      c.beginPath();
      splPath(c, SLV.r2, 14, 9);
      c.fill();
      // ribbing following the roll
      c.lineCap = "butt";
      const R = ROLLS.cuff;
      for (let u = -R.w / 2 + 4; u < R.w / 2; u += 8.5) along(c, R, u, -1.62, 0.45, rgba(p.hoodieDeep, 0.36), 3.2);
      for (let u = -R.w / 2 + 8; u < R.w / 2; u += 8.5) along(c, R, u, -1.62, 0.45, rgba(p.hoodieLight, 0.14), 1.6);
      const t0 = rollAt(R, -1.5, -R.w * 0.3);
      const t1 = rollAt(R, -1.5, R.w * 0.22);
      fLens(c, rgba(p.hoodieLight, 0.6), t0[0], t0[1] + 8, t1[0], t1[1] + 4, -10, 4);
    } });
    // a loose thread on the cuff
    g.strokeStyle = rgba(p.hoodieLight, 0.75);
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(462, 530);
    g.bezierCurveTo(480, 510, 486, 530, 500, 514);
    g.stroke();
    ARM.L = L;
  }

  function buildArmBg() {
    const p = P();
    const s = 0.5;
    const L = layer(-M - 60, -M - 60, W + M + 60, H + M + 60, s);
    const tmp = layer(-M - 60, -M - 60, W + M + 60, H + M + 60, s);
    const g = tmp.g;
    wallFill(g, tmp.x0, tmp.y0, tmp.x1, tmp.y1, H + M);
    // lamp glow, upper left
    g.globalCompositeOperation = "lighter";
    pool(g, 230, 150, 620, p.lampGlow, 0.35);
    pool(g, 230, 150, 260, p.lamp, 0.7);
    g.globalCompositeOperation = "source-over";
    fEll(g, css(mix(p.lamp, WHITE, 0.5)), 230, 160, 120, 70);
    // window on the right: night sky, glow, city lights
    const wx0 = 1240;
    const wy0 = -120;
    const wx1 = 2060;
    const wy1 = 640;
    let gr = g.createLinearGradient(0, wy0, 0, wy1);
    gr.addColorStop(0, p.sky[0]);
    gr.addColorStop(0.55, p.sky[3]);
    gr.addColorStop(0.85, p.glow[1]);
    gr.addColorStop(1, p.glow[2]);
    g.fillStyle = gr;
    g.fillRect(wx0, wy0, wx1 - wx0, wy1 - wy0);
    g.globalCompositeOperation = "lighter";
    pool(g, 1560, 600, 460, p.glow[3], 0.55, 0.5);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = css(p.hillMid);
    for (let x = wx0; x < wx1; x += 70) {
      const h = 80 + 120 * hsh(x, 2);
      g.fillRect(x, wy1 - h, 64, h);
    }
    g.fillStyle = css(p.window[0]);
    for (let i = 0; i < 60; i++) g.fillRect(wx0 + hsh(i, 5) * (wx1 - wx0), wy1 - 20 - hsh(i, 6) * 160, 10, 12);
    // frame and mullion
    g.fillStyle = css(mix(p.furniture, p.furnitureRim, 0.22));
    g.fillRect(wx0 - 40, wy0, 40, wy1 - wy0 + 40);
    g.fillRect(1640, wy0, 30, wy1 - wy0);
    g.fillRect(wx0 - 40, 260, wx1 - wx0 + 40, 26);
    g.fillRect(wx0 - 60, wy1, wx1 - wx0 + 80, 40);
    // cabinet glow below the window on the right
    g.globalCompositeOperation = "lighter";
    pool(g, 1700, 860, 380, p.screen, 0.28, 0.7);
    g.globalCompositeOperation = "source-over";
    g.fillStyle = css(mix(p.furniture, p.furnitureRim, 0.3));
    g.fillRect(1440, 700, 600, 20);
    g.fillRect(1440, 900, 600, 20);
    for (let i = 0; i < 9; i++) {
      const jx = 1470 + i * 62;
      g.fillStyle = rgba(i % 3 === 0 ? p.med : i % 3 === 1 ? p.plunger : p.sparkPink, 0.65);
      g.fillRect(jx, 620 + 20 * hsh(i, 3), 40, 80 - 20 * hsh(i, 3));
      g.fillRect(jx + 10, 820 + 10 * hsh(i, 4), 34, 80 - 10 * hsh(i, 4));
    }
    // lightbox far left, cyan
    g.globalCompositeOperation = "lighter";
    pool(g, -40, 640, 300, p.screen, 0.4);
    g.globalCompositeOperation = "source-over";
    // hero's hoodie body far below left (warm red mass out of focus)
    gr = g.createRadialGradient(-80, 1100, 0, -80, 1100, 520);
    gr.addColorStop(0, rgba(p.hoodieShade, 0.8));
    gr.addColorStop(1, rgba(p.hoodieShade, 0));
    g.fillStyle = gr;
    g.fillRect(-600, 600, 1100, 900);
    L.g.setTransform(1, 0, 0, 1, 0, 0);
    L.g.filter = "blur(16px)";
    L.g.drawImage(tmp.c, 0, 0);
    L.g.filter = "none";
    ARM.bg = L;
    // bokeh discs (live)
    const r = EX.rng(31);
    const cols = [0, 1, 2, 3];
    ARM.bokeh = [];
    for (let i = 0; i < 22; i++) {
      let x;
      let y;
      do {
        x = r() * W;
        y = r() * 700 - 40;
      } while (y > armTop(x) - 80);
      const c = x < 700 ? (r() < 0.7 ? 0 : 1) : x > 1300 ? (r() < 0.5 ? 2 : r() < 0.5 ? 3 : 1) : cols[Math.floor(r() * 4)];
      ARM.bokeh.push({ x, y, r: 26 + r() * r() * 110, c, ph: r() * TAU, a: 0.18 + 0.3 * r() });
    }
  }
  const ARM = {};

  // syringe state in the close-up (design coords)
  function armState(o) {
    const press = clamp(o.press || 0);
    const wd = clamp(o.withdraw || 0);
    const NL = SG.NL * AC.scale;
    // depth of the tip below the skin surface along the needle (negative = above)
    let d;
    if (press <= 0.2) d = lerp(-AC.hover, 10, sstep(0, 0.2, press));
    else d = lerp(10, NL * 0.88, (press - 0.2) / 0.8);
    // withdraw: the needle comes out by 0.3, then the hand leaves up-right
    const out = sstep(0, 0.3, wd);
    d = lerp(d, -AC.hover * 1.2, out);
    const leave = Math.pow(sstep(0.28, 1, wd), 1.5);
    const dir = AC.dir;
    const tip = [AC.site[0] + dir[0] * (d - 1500 * leave) + 320 * leave, AC.site[1] + dir[1] * (d - 1500 * leave)];
    const dimple = sstep(0.1, 0.2, press) * (1 - 0.75 * sstep(0.2, 0.34, press)) * (1 - out);
    return { press, wd, d, tip, dimple, inside: d > 0 && wd < 0.3 ? d : 0, out, leave };
  }
  function armCam(o) {
    return xf(1, [CX, CY], o.cam);
  }

  function armClose(ctx, o = {}) {
    if (!ready) return;
    const p = P();
    const t = o.t || 0;
    const st = armState(o);
    const T = armCam(o);
    const cz = (o.cam && o.cam.zoom) || 1;
    ctx.save();
    // background, half the camera move for depth
    const Tb = xf(1, [CX, CY], { zoom: 1 + (cz - 1) * 0.5, x: ((o.cam && o.cam.x) || 0) * 0.5, y: ((o.cam && o.cam.y) || 0) * 0.5 });
    setT(ctx, Tb);
    blit(ctx, ARM.bg);
    // bokeh discs and the breathing lamp
    ctx.globalCompositeOperation = "lighter";
    for (const b of ARM.bokeh) {
      const x = b.x + 14 * nz(t * 0.07 + b.ph, 3);
      const y = b.y + 10 * nz(t * 0.06 + b.ph, 4);
      ctx.globalAlpha = b.a * (0.75 + 0.25 * Math.sin(t * 0.5 + b.ph));
      ctx.drawImage(SPR.bokeh[b.c], x - b.r, y - b.r, b.r * 2, b.r * 2);
    }
    const br = 0.85 + 0.1 * Math.sin(t * 1.25) + 0.06 * nz(t * 0.9, 3);
    ctx.globalAlpha = 0.35 * br;
    ctx.drawImage(SPR.lampGlow, 230 - 520, 150 - 520, 1040, 1040);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    motes(ctx, t, 26, 600, 300, 700, 340, 21, SPR.moteWarm, 4.5);
    // the arm and sleeve
    setT(ctx, T);
    blit(ctx, ARM.L);
    const S = AC.site;
    const tn = AC.tan;
    const NL = SG.NL * AC.scale;
    const dir = AC.dir;
    // the syringe's soft shadow on the skin (falls down-right, converges on the tip as it lands)
    const fade = (1 - sstep(0.3, 0.55, st.wd)) * (1 - st.leave);
    if (fade > 0.01) {
      const hgt = Math.max(0, -st.d); // tip height above the skin
      const sd = [0.86, 0.5];
      const s0 = [S[0] + hgt * sd[0] * 0.7, S[1] + hgt * sd[1] * 0.7];
      const len = 560;
      const s1 = [s0[0] + len * sd[0], s0[1] + len * sd[1]];
      const nn = [-sd[1], sd[0]];
      ctx.save();
      ctx.beginPath();
      armPath(ctx);
      ctx.clip();
      const gq = ctx.createLinearGradient(s0[0], s0[1], s1[0], s1[1]);
      const sc = mix(p.skinDeep, p.hoodieDeep, 0.35);
      gq.addColorStop(0, rgba(sc, 0.42 * fade));
      gq.addColorStop(0.5, rgba(sc, 0.22 * fade));
      gq.addColorStop(1, rgba(sc, 0));
      ctx.fillStyle = gq;
      const quad = (w0, w1) => {
        ctx.beginPath();
        ctx.moveTo(s0[0] + nn[0] * w0, s0[1] + nn[1] * w0);
        ctx.lineTo(s1[0] + nn[0] * w1, s1[1] + nn[1] * w1);
        ctx.lineTo(s1[0] - nn[0] * w1, s1[1] - nn[1] * w1);
        ctx.lineTo(s0[0] - nn[0] * w0, s0[1] - nn[1] * w0);
        ctx.closePath();
        ctx.fill();
      };
      quad(4, 26);
      quad(10, 70);
      ctx.restore();
    }
    // dimple, entry ring, redness, puncture (all on the skin: clipped to the arm)
    ctx.save();
    ctx.beginPath();
    armPath(ctx);
    ctx.clip();
    if (st.dimple > 0.01) {
      const dm = st.dimple;
      ctx.save();
      ctx.translate(S[0], S[1]);
      ctx.rotate(tn);
      fEll(ctx, rgba(p.skinShade, 0.45 * dm), 0, 0, 62 * dm + 10, 20 * dm + 4);
      fEll(ctx, rgba(mix(p.skinShade, p.skinDeep, 0.5), 0.7 * dm), -8, -4, 40 * dm + 6, 12 * dm + 3);
      fEll(ctx, rgba(mix(p.skin, "#ffd6b4", 0.6), 0.75 * dm), 12, 8, 34 * dm + 6, 7 * dm + 2);
      ctx.strokeStyle = rgba(p.skinShade, 0.35 * dm);
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 10);
        ctx.lineTo(Math.cos(a) * (60 + 14 * dm), Math.sin(a) * (20 + 5 * dm));
        ctx.stroke();
      }
      ctx.restore();
    }
    const inK = sstep(0.2, 0.3, st.press) * (1 - st.out);
    const redK = Math.max(inK, sstep(0.2, 0.4, st.press) * 0.7) * (1 - clamp(o.plaster || 0) * 0.6);
    if (redK > 0.01) {
      ctx.globalAlpha = 0.28 * redK;
      ctx.drawImage(SPR.blush, S[0] - 70, S[1] - 34, 140, 68);
      ctx.globalAlpha = 1;
    }
    if (inK > 0.01) {
      ctx.save();
      ctx.translate(S[0], S[1]);
      ctx.rotate(tn);
      fEll(ctx, rgba(p.skinDeep, 0.45 * inK), 2, 1, 26, 9);
      fEll(ctx, rgba(p.skinShade, 0.5 * inK), 0, 0, 16, 5.5);
      fLens(ctx, rgba(mix(p.skin, "#ffd6b4", 0.7), 0.8 * inK), -20, 6, 20, 6, 4, 2);
      ctx.restore();
    }
    const punct = sstep(0.28, 0.4, st.wd) * (1 - sstep(0.05, 0.3, o.plaster || 0));
    if (punct > 0.01) {
      fEll(ctx, rgba(p.blood, 0.85 * punct), S[0], S[1], 4.2, 3.4);
      fEll(ctx, rgba(WHITE, 0.6 * punct), S[0] - 1.2, S[1] - 1.2, 1.2, 1);
    }
    ctx.restore();
    // plaster
    const pk = clamp(o.plaster || 0);
    if (pk > 0) drawPlaster(ctx, S, tn, pk, t);
    // the syringe (the part under the skin is hidden)
    if (st.leave < 0.999) {
      ctx.save();
      if (st.d > 0) {
        // keep only the half-plane outside the skin (behind the entry point along the needle)
        const nx = dir[0];
        const ny = dir[1];
        const px = -ny;
        const py = nx;
        const BIG = 4000;
        ctx.beginPath();
        ctx.moveTo(S[0] + px * BIG, S[1] + py * BIG);
        ctx.lineTo(S[0] - px * BIG, S[1] - py * BIG);
        ctx.lineTo(S[0] - px * BIG - nx * BIG, S[1] - py * BIG - ny * BIG);
        ctx.lineTo(S[0] + px * BIG - nx * BIG, S[1] + py * BIG - ny * BIG);
        ctx.closePath();
        ctx.clip();
      }
      syringe(ctx, { t, x: st.tip[0], y: st.tip[1], angle: AC.angle, scale: AC.scale, plunger: o.plunger || 0, fill: 1, grip: "dart", flip: false });
      ctx.restore();
      // a short soft skin ring over the needle at the entry so it sinks in
      if (st.d > 0 && inK > 0.01) {
        ctx.save();
        ctx.translate(S[0], S[1]);
        ctx.rotate(tn);
        ctx.globalAlpha = 0.85 * inK;
        fLens(ctx, css(mix(p.skin, "#ffd6b4", 0.35)), -16, 1, 16, 1, 3.5, 2.5);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }
    // sting: a pinch flash and a ripple ring, peaking early
    const sg = clamp(o.sting || 0);
    if (sg > 0 && sg < 1) {
      const pk2 = sg < 0.12 ? sg / 0.12 : Math.pow(1 - (sg - 0.12) / 0.88, 1.4);
      ctx.save();
      ctx.translate(S[0], S[1]);
      ctx.rotate(tn);
      ctx.strokeStyle = rgba(mix(p.sparkPink, WHITE, 0.5), 0.9 * pk2);
      ctx.lineWidth = 6 * (1 - sg) + 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 26 + 150 * Math.pow(sg, 0.6), (26 + 150 * Math.pow(sg, 0.6)) * 0.36, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = rgba(WHITE, 0.6 * pk2);
      ctx.lineWidth = 3 * (1 - sg) + 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14 + 90 * Math.pow(sg, 0.7), (14 + 90 * Math.pow(sg, 0.7)) * 0.36, 0, 0, TAU);
      ctx.stroke();
      // pinch marks
      ctx.lineCap = "round";
      ctx.strokeStyle = rgba(WHITE, 0.95 * pk2);
      ctx.lineWidth = 5;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.48;
        const r0 = 46 + 70 * sg;
        const r1 = r0 + 34 * (1 - sg * 0.6);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 0.75 - 16);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 * 0.75 - 16);
        ctx.stroke();
      }
      ctx.restore();
      const fk = 1 - sstep(0, 0.35, sg);
      if (fk > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = fk * Math.min(1, sg / 0.05);
        const z = 70 + 60 * sg;
        ctx.drawImage(SPR.glint[2], S[0] - z, S[1] - z, z * 2, z * 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    }
    ctx.restore();
  }
  function drawPlaster(ctx, S, tn, k, t) {
    const p = P();
    const sc = 1.2 * HOUSE.backOut(clamp(k / 0.62));
    const a = clamp(k / 0.1);
    ctx.save();
    ctx.translate(S[0] - Math.sin(tn) * 12, S[1] + Math.cos(tn) * 12);
    ctx.rotate(tn);
    ctx.globalAlpha = a;
    // soft shadow on the skin
    ctx.globalAlpha = 0.35 * a;
    fRR(ctx, css(mix(p.skinDeep, p.hoodieDeep, 0.3)), -66 * sc + 8, -31 * sc + 10, 132 * sc, 62 * sc, 26 * sc);
    ctx.globalAlpha = a;
    ctx.scale(sc, sc * 0.8);
    const pm = { base: css(p.plaster), sh: css(p.plasterShade), rim: css(mix(p.plaster, WHITE, 0.6)), cool: rgba(MAT.cool, 0.4) };
    cel(ctx, RR(-66, -38, 132, 76, 30), pm, { ds: 7, rw: 2.6, extra: (c) => {
      // perforation dots on the adhesive wings
      c.fillStyle = rgba(p.plasterShade, 0.7);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
          c.beginPath();
          c.arc(-56 + i * 9, -16 + j * 15, 1.6, 0, TAU);
          c.arc(30 + i * 9, -16 + j * 15, 1.6, 0, TAU);
          c.fill();
        }
      }
    } });
    const pad = { base: css(p.plasterPad), sh: css(mix(p.plasterPad, p.plasterShade, 0.45)), rim: css(WHITE) };
    cel(ctx, RR(-24, -26, 48, 52, 10), pad, { ds: 4, rw: 2 });
    fRR(ctx, rgba(WHITE, 0.8), -52, -32, 40, 4, 2);
    ctx.restore();
    // sparkle (peaks around k 0.6, gone by 1)
    const sk = Math.sin(Math.PI * clamp((k - 0.3) / 0.62));
    if (sk > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = sk;
      const z = 46 + 30 * sk;
      ctx.drawImage(SPR.glint[0], S[0] + 58 - z, S[1] - 44 - z, z * 2, z * 2);
      ctx.globalAlpha = sk * 0.8;
      const z2 = 22 * sk;
      ctx.drawImage(SPR.glint[1], S[0] - 70 - z2, S[1] - 20 - z2, z2 * 2, z2 * 2);
      ctx.drawImage(SPR.glint[0], S[0] + 20 - z2 * 0.7, S[1] - 64 - z2 * 0.7, z2 * 1.4, z2 * 1.4);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
  }

  function armCloseAnchors(o = {}) {
    const T = armCam(o);
    const st = armState(o);
    const dir = AC.dir;
    const s = AC.scale;
    // a point on the barrel's right edge, near the nozzle end of the medicine column
    const along = -(SG.BX0 - SG.BL * 0.2) * s; // distance back from the tip
    const bx = st.tip[0] - dir[0] * along;
    const by = st.tip[1] - dir[1] * along;
    const nr = [-dir[1], dir[0]]; // screen-right normal of the barrel (local -y side, the hand side)
    const side = nr[0] > 0 ? 1 : -1;
    const e = [bx + side * nr[0] * SG.BR * s, by + side * nr[1] * SG.BR * s];
    return {
      site: ap(T, AC.site[0], AC.site[1]),
      barrel: ap(T, e[0], e[1]),
      barrelTo: ap(T, e[0] + 250, e[1] + 120),
      dropsRow: ap(T, AC.drops[0], AC.drops[1]),
      tip: ap(T, st.tip[0], st.tip[1]),
    };
  }

  // ================================================================ the medicine drop
  function tear(g, r, dx = 0, dy = 0) {
    g.moveTo(dx, -2.15 * r + dy);
    g.bezierCurveTo(0.42 * r + dx, -1.45 * r + dy, r + dx, -0.85 * r + dy, r + dx, dy);
    g.arc(dx, dy, r, 0, Math.PI);
    g.bezierCurveTo(-r + dx, -0.85 * r + dy, -0.42 * r + dx, -1.45 * r + dy, dx, -2.15 * r + dy);
    g.closePath();
  }
  function drop(ctx, o = {}) {
    if (!ready) return;
    const k = clamp(o.k == null ? 1 : o.k);
    if (k <= 0) return;
    const p = P();
    const r = o.r || 22;
    const t = o.t || 0;
    const sc = HOUSE.backOut(k);
    const a = clamp(k * 5);
    const w = Math.sin(t * 3.4) * 0.035;
    const bob = Math.sin(t * 1.9 + 0.5) * r * 0.06 + nz(t * 0.7, 9) * r * 0.04;
    ctx.save();
    ctx.translate(o.x || 0, (o.y || 0) + bob);
    // pop ring
    if (k < 0.85) {
      const rk = k / 0.85;
      ctx.strokeStyle = rgba(p.medGlow, 0.8 * (1 - rk));
      ctx.lineWidth = 3 * (1 - rk) + 0.5;
      ctx.beginPath();
      ctx.arc(0, -r * 0.7, r * (0.8 + 1.8 * rk), 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = a;
    ctx.scale(sc * (1 + w), sc * (1 - w));
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = a * 0.7;
    ctx.drawImage(SPR.medHalo, -r * 3.4, -r * 4.2, r * 6.8, r * 6.8);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = a;
    const sh = (g, dx = 0, dy = 0) => tear(g, r, dx, dy);
    const m = { base: css(p.med), sh: css(p.medDeep), rim: css(p.medGlow), cool: rgba(mix(p.medDeep, p.vein, 0.4), 0.9) };
    cel(ctx, sh, m, { L: KEY, ds: r * 0.28, rw: r * 0.08, extra: (c) => {
      fEll(c, rgba(p.medGlow, 0.65), -r * 0.18, -r * 0.4, r * 0.55, r * 0.75, -0.2);
      fLens(c, rgba(WHITE, 0.55), r * 0.05, r * 0.72, r * 0.78, r * 0.18, -r * 0.12, r * 0.06);
    } });
    fEll(ctx, "rgba(255,255,255,0.95)", -r * 0.4, -r * 0.55, r * 0.17, r * 0.3, -0.45);
    fEll(ctx, "rgba(255,255,255,0.8)", -r * 0.18, -r * 1.2, r * 0.07, r * 0.11, -0.4);
    ctx.restore();
  }

  // ================================================================ init
  let ready = false;
  let initP = null;
  function init() {
    if (initP) return initP;
    initP = new Promise((res) => {
      const p = P();
      mats();
      SPR.glint = [glintSprite(p.star[1]), glintSprite(mix(p.sparkCyan, p.star[1], 0.4)), glintSprite(mix(p.sparkPink, WHITE, 0.3))];
      SPR.winHalo = glowSpr(p.window[0], 1);
      SPR.redHalo = glowSpr(p.artery, 1);
      SPR.moonGlow = glowSpr(mix(MOON, p.star[1], 0.4), 1);
      SPR.medHalo = glowSpr(p.med, 1);
      SPR.lampGlow = radial(256, [[0, rgba(p.lamp, 0.85)], [0.2, rgba(p.lamp, 0.45)], [0.5, rgba(p.lampGlow, 0.14)], [1, rgba(p.lampGlow, 0)]]);
      SPR.lampCore = glowSpr(mix(p.lamp, WHITE, 0.5), 1);
      SPR.screenGlow = glowSpr(p.screen, 1);
      SPR.moteWarm = radial(32, [[0, rgba(mix(p.lamp, WHITE, 0.5), 1)], [0.4, rgba(p.lamp, 0.45)], [1, rgba(p.lamp, 0)]]);
      SPR.moteCool = radial(32, [[0, rgba(mix(p.star[1], WHITE, 0.5), 1)], [0.4, rgba(p.star[1], 0.45)], [1, rgba(p.star[1], 0)]]);
      SPR.shadow = radial(128, [[0, "rgba(6,2,30,0.9)"], [0.5, "rgba(6,2,30,0.45)"], [1, "rgba(6,2,30,0)"]]);
      SPR.skinShadow = radial(128, [[0, rgba(p.skinShade, 1)], [0.55, rgba(p.skinShade, 0.5)], [1, rgba(p.skinShade, 0)]]);
      SPR.skinSpec = radial(128, [[0, "rgba(255,240,225,1)"], [0.5, "rgba(255,230,210,0.4)"], [1, "rgba(255,230,210,0)"]]);
      SPR.blush = radial(128, [[0, rgba(p.capillary, 0.9)], [0.5, rgba(p.capillary, 0.35)], [1, rgba(p.capillary, 0)]]);
      SPR.bokeh = [bokehSprite(p.lamp), bokehSprite(p.sparkPink), bokehSprite(p.screen), bokehSprite(mix(p.furnitureRim, WHITE, 0.2))];
      buildMedium();
      buildWide();
      buildFronts();
      buildArm();
      buildArmBg();
      ready = true;
      res();
    });
    return initP;
  }

  HOUSE.clinic = { init, back, front, heroAt, syringe, armClose, armCloseAnchors, drop, shots: SHOTS };
})();

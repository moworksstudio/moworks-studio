/* house-ui.js: the house labels. Pills, leader callouts, the title, framed panels, a time bar, a
 * magnifier lens, a dotted signal line, a split-screen divider and the "not to scale" tag.
 * Classic script; loads after ex/ex-core.js, ex/house-pal.js and story/film-pal.js; attaches to
 * window.HOUSE.ui. Every call is a pure function of the times passed in (now / t / k): no state
 * between calls. Font: Figtree 600/700 (ex/fonts/figtree-latin-600|700-normal.woff2).
 *
 * Size: the canvas is EX.W × EX.H (read from index.html's root). Built-in sizes are given for the
 * 1080 px short side and multiplied by EX.U = min(W, H) / 1080, so a label is the same size in
 * 16:9 (1920×1080) and 9:16 (1080×1920). Coordinates and px options you pass (x, y, w, h, r,
 * elbow, labelSize, spacing, …) are canvas px and used as given; `size` is a multiplier.
 *
 * API (times in seconds):
 *   HOUSE.ui.init() -> Promise<boolean>          waits for Figtree, measures cap heights
 *   HOUSE.ui.safe() -> { x0, y0, x1, y1, cx, cy } where text may sit. 16:9: the whole frame.
 *       9:16: x 60..W-120, y 250..H-470 (x 60–960, y 250–1450 at 1080×1920), clear of the
 *       Shorts / Reels / TikTok buttons and captions.
 *   HOUSE.ui.pill(ctx, { text, x, y, color, t0, now, out, origin, icon, size, alpha, flash,
 *                        scale, textColor })
 *       near-square label. color: pill key (crimson magenta orange cyan purple violet green)
 *       or a hex. origin 'center' (x,y = centre) | 'left' | 'right' (x,y = attach edge middle)
 *       | 'top' | 'bottom'. icon 'clock' | null. Pops in with back.out(1.7) over 0.5 s from the
 *       origin, scales out to 0 in 0.125 s (power-in) at `out`. t0 omitted = fully shown.
 *       size 1 = 68 px tall at EX.U 1. flash (0..1) lifts the fill toward HOUSE.pal.flash.
 *       Returns { x, y, w, h, s } of the drawn box (unscaled) or null when invisible.
 *   HOUSE.ui.pillSize(ctx, { text, icon, size }) -> { w, h }   layout helper
 *   HOUSE.ui.callout(ctx, { from:[x,y], to:[x,y], text, color, t0, now, out, icon, size, elbow,
 *                           side, lineColor, lineDur, pillDelay, flash })
 *       anchor dot at `from`, a 4 px white leader: diagonal to an elbow, then a short horizontal
 *       run (elbow, default 44 px) ending at `to`, where the pill attaches by its near edge.
 *       Dot pops at t0, line draws in 0.1 s, pill starts 0.067 s after the line. Exit at `out`
 *       takes 0.21 s: the pill shrinks (0.125 s) while riding the line end as the line reels
 *       back into the dot (0.17 s), then the dot pops away. Fire `out` >= 0.21 s before a cut.
 *   HOUSE.ui.notToScale(ctx, { alpha, t0, now, text, color })   top-right tag (16:9: 46 / 41 px
 *       insets; 9:16: the top-right corner of the safe zone)
 *   HOUSE.ui.title(ctx, { lines, t0, now, y, x, size, capH, pitch, tracking, wordGap, stagger,
 *                         dur, out, flash, color, fit })
 *       uppercase Figtree 700, cap height 8.1 % of min(W, H) (87 px); words pop one at a time
 *       (0.2 s apart, back.out 1.7 over 0.5 s) from their own centres. y = centre of the block:
 *       default 202 px in 16:9 and about 600 px in 9:16 (202·U + 0.475 · (H − min(W, H))).
 *       x = centre: default the middle of the safe zone. fit (default true) shrinks the type
 *       when the widest line would leave the safe zone. Soft glow + faint drop shadow.
 *   HOUSE.ui.panel(ctx, { x, y, w, h, t0, now, out, draw, rim, bg })
 *       white-rimmed frame (x,y = outer top-left). Pops from its centre. draw(ctx, rect) paints
 *       the content clipped to the inner rect { x, y, w, h, s }. w/h may animate freely.
 *   HOUSE.ui.timebar(ctx, { x, y, w, h, t, k, t0, now, label, sub, rightLabel, rightK,
 *                           labelSize (44), subSize (36), labelGap (116), subGap (48) })
 *       glowing bar: x = left tick, y = band centre, w = tick to tick, h = band height (125).
 *       k = build-in progress 0..1 (or pass t0/now). t drives the sparkles (they stream right).
 *       Labels sit under the left end; rightLabel under the right end (rightK pops it 0..1).
 *   HOUSE.ui.lens(ctx, { x, y, r, t0, now, out, draw, rim, bg, bgHi })
 *       white-rimmed magnifier circle; draw(ctx, { x, y, r, s }) paints inside a circular clip.
 *   HOUSE.ui.dotted(ctx, { from, to, k, k0, t, spacing, r, color, flow, head })
 *       dotted signal line; k = head progress 0..1, k0 = tail progress (to consume it).
 *   HOUSE.ui.divider(ctx, { x, k, w, y0, y1, from, ease, color })   vertical divider wiping in
 *   HOUSE.ui.popScale(now, t0, out, inDur?, outDur?) -> s   the shared entrance/exit curve
 */
(function () {
  const HOUSE = (window.HOUSE = window.HOUSE || {});
  const EX = window.EX;
  const TAU = Math.PI * 2;
  const FONT = '"Figtree", system-ui, sans-serif';
  const IN_DUR = 0.5; // entrance: back.out(1.7) over 0.5 s
  const OUT_DUR = 0.125; // exit: power-in (exponent 2.3) to 0 over 0.125 s
  const OUT_POW = 2.3;

  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const outCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);
  const inOutCubic = (t) => {
    t = clamp(t);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };
  const backOut = (t, s = 1.7) => HOUSE.backOut(t, s);
  const isHex = (c) => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c);
  const rgba = (c, a) => (isHex(c) ? EX.rgba(c, a) : c);
  const mixA = (c1, c2, k, a = 1) => (isHex(c1) && isHex(c2) ? EX.rgba(EX.mix(c1, c2, clamp(k)), a) : c1);
  const font = (size, weight) => `${weight} ${size}px ${FONT}`;
  const toHex = (a) => "#" + a.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");

  const ui = (HOUSE.ui = {});
  ui.FONT = FONT;
  ui.IN_DUR = IN_DUR;
  ui.OUT_DUR = OUT_DUR;
  // pill fills: the shared palette plus a vivid violet
  ui.colors = Object.assign({}, HOUSE.pal.pill, { violet: "#7a10e6" });
  const pillColor = (c) => (c && ui.colors[c]) || c || ui.colors.magenta;
  const RIM = "#f1e6ff"; // white-lavender rim of frames, lens and divider
  const RIM_SHADE = "#dccbff";

  // metrics (cap height / ascender as a fraction of the font size); refined by init()
  const M = { cap600: 0.7, cap700: 0.7, asc700: 0.74, trailing: true };

  ui.init = async () => {
    if (document.fonts && document.fonts.load) {
      try {
        await Promise.all([document.fonts.load('600 38px "Figtree"'), document.fonts.load('700 120px "Figtree"')]);
      } catch (e) {
        /* fall back to the system font */
      }
    }
    const c = document.createElement("canvas").getContext("2d");
    c.font = font(100, 600);
    M.cap600 = c.measureText("H").actualBoundingBoxAscent / 100 || M.cap600;
    c.font = font(100, 700);
    M.cap700 = c.measureText("H").actualBoundingBoxAscent / 100 || M.cap700;
    M.asc700 = c.measureText("tl").actualBoundingBoxAscent / 100 || M.asc700;
    // does measureText include the trailing letter-spacing? (Chrome: yes)
    c.letterSpacing = "0px";
    const a = c.measureText("ab").width;
    c.letterSpacing = "10px";
    const b = c.measureText("ab").width;
    c.letterSpacing = "0px";
    M.trailing = b - a > 15;
    ui.fontOK = !!(document.fonts && document.fonts.check('600 38px "Figtree"'));
    return ui.fontOK;
  };

  /** Where text may sit. 16:9 (landscape): the whole frame. 9:16 (portrait): the platform safe
   *  zone, x 60..W-120 and y 250..H-470 in 1080-wide units (x 60–960, y 250–1450 at 1080×1920). */
  ui.safe = () => {
    const W = EX.W;
    const H = EX.H;
    const U = EX.U;
    if (W >= H) return { x0: 0, y0: 0, x1: W, y1: H, cx: W / 2, cy: H / 2 };
    const x0 = 60 * U;
    const x1 = W - 120 * U;
    const y0 = 250 * U;
    const y1 = H - 470 * U;
    return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };

  /** Shared entrance (back.out 1.7 over 0.5 s) and exit (power-in to 0 over 0.125 s). */
  const popScale = (now, t0, out, inDur = IN_DUR, outDur = OUT_DUR) => {
    if (t0 === undefined || t0 === null) t0 = -1e9;
    if (now < t0) return 0;
    let s = backOut((now - t0) / inDur);
    if (out !== undefined && out !== null && now >= out) s *= 1 - Math.pow(clamp((now - out) / outDur), OUT_POW);
    return s;
  };
  ui.popScale = popScale;

  /** Text width with tracking, without the trailing letter-space. */
  const textW = (ctx, text, ls) => {
    ctx.letterSpacing = ls + "px";
    const w = ctx.measureText(text).width;
    return M.trailing ? w - ls : w;
  };

  const rr = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else {
      r = Math.min(r, w / 2, h / 2);
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  };

  const noShadow = (ctx) => {
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  // ---------------------------------------------------------------- pill
  const pillLayout = (ctx, o) => {
    const size = (o.size || 1) * EX.U; // effective size: the multiplier times the UI unit
    const h = 2 * Math.round(34 * size); // 68 px at size 1
    const fs = 38 * size;
    const ls = 0.25 * size; // a hair of tracking keeps Figtree 600 crisp and open at 38 px
    const pad = Math.round(0.42 * h);
    ctx.font = font(fs, 600);
    const tw = textW(ctx, o.text || "", ls);
    const icon = o.icon === "clock" ? 31 * size : 0;
    const gap = icon ? 13 * size : 0;
    const w = 2 * Math.round((pad * 2 + icon + gap + tw) / 2);
    return { w, h, fs, ls, pad, icon, gap, tw, size };
  };
  ui.pillSize = (ctx, o) => {
    ctx.save();
    const L = pillLayout(ctx, o);
    ctx.restore();
    return { w: L.w, h: L.h };
  };

  /** Filled-shape clock: ring, two rounded hands, hub. The minute hand sweeps once on entry. */
  const clock = (ctx, cx, cy, d, sweep) => {
    const r = d / 2;
    const th = Math.max(2.4 * EX.U, d * 0.105);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.arc(cx, cy, r - th, 0, TAU, true);
    ctx.fill();
    const hand = (ang, len, wid) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      rr(ctx, -wid / 2, -len, wid, len + wid / 2, wid / 2);
      ctx.fill();
      ctx.restore();
    };
    hand(-sweep * TAU, r * 0.6, th * 0.95); // minute hand ends at 12
    hand(TAU * (4 / 12) - (sweep * TAU) / 12, r * 0.42, th * 0.95); // hour hand ends at 4
    ctx.beginPath();
    ctx.arc(cx, cy, th * 0.75, 0, TAU);
    ctx.fill();
  };

  ui.pill = (ctx, o) => {
    const now = o.now === undefined ? (o.t === undefined ? 0 : o.t) : o.now;
    const s = popScale(now, o.t0, o.out) * (o.scale === undefined ? 1 : o.scale);
    const alpha = o.alpha === undefined ? 1 : o.alpha;
    if (s <= 0.002 || alpha <= 0) return null;
    ctx.save();
    const L = pillLayout(ctx, o);
    const { w, h } = L;
    const fl = clamp(o.flash || 0);
    const pc = pillColor(o.color);
    const c = fl > 0 && isHex(pc) ? toHex(EX.mix(pc, HOUSE.pal.flash, 0.3 * fl)) : pc;
    const origin = o.origin || "center";
    // box relative to the pivot (x, y)
    let bx = -w / 2;
    let by = -h / 2;
    if (origin === "left") bx = 0;
    else if (origin === "right") bx = -w;
    else if (origin === "top") by = 0;
    else if (origin === "bottom") by = -h;
    let px = o.x;
    let py = o.y;
    if (Math.abs(s - 1) < 0.002) {
      px = Math.round(px);
      py = Math.round(py);
    }
    ctx.translate(px, py);
    ctx.scale(s, s);
    ctx.globalAlpha *= alpha;
    const rad = 2.5 * L.size;

    // soft same-hue glow under the pill
    ctx.shadowColor = mixA(c, "#ffffff", 0.18, 0.55);
    ctx.shadowBlur = 26 * s * L.size;
    ctx.shadowOffsetY = 5 * s * L.size;
    // body: flat fill with a barely-there vertical lift so it reads luminous, not plastic
    const g = ctx.createLinearGradient(0, by, 0, by + h);
    g.addColorStop(0, mixA(c, "#ffffff", 0.07));
    g.addColorStop(0.55, rgba(c, 1));
    g.addColorStop(1, mixA(c, "#100030", 0.07));
    ctx.fillStyle = g;
    rr(ctx, bx, by, w, h, rad);
    ctx.fill();
    noShadow(ctx);
    // hairline top light
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(bx + rad, by + EX.U, w - 2 * rad, 1.5 * L.size);

    // contents: white text centred on the cap height, optional clock icon
    const capH = M.cap600 * L.fs;
    const midY = by + h / 2;
    const darker = mixA(c, "#0a0020", 0.55, 0.5);
    ctx.shadowColor = darker;
    ctx.shadowBlur = 3 * s * L.size;
    ctx.shadowOffsetY = 1.5 * s * L.size;
    ctx.fillStyle = o.textColor || HOUSE.pal.text;
    let tx = bx + L.pad;
    if (L.icon) {
      const sweep = 1 - outCubic((now - (o.t0 === undefined ? -1e9 : o.t0) - 0.03) / 0.8);
      clock(ctx, tx + L.icon / 2, midY, L.icon, sweep);
      tx += L.icon + L.gap;
    }
    ctx.font = font(L.fs, 600);
    ctx.letterSpacing = L.ls + "px";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(o.text || "", tx, midY + capH / 2);
    ctx.restore();
    return { x: o.x + bx, y: o.y + by, w, h, s };
  };

  // ---------------------------------------------------------------- callout
  ui.callout = (ctx, o) => {
    const U = EX.U;
    const now = o.now === undefined ? 0 : o.now;
    const t0 = o.t0 === undefined ? -1e9 : o.t0;
    if (now < t0) return null;
    const T = now - t0;
    const [ax, ay] = o.from;
    const [tx, ty] = o.to;
    const dir = o.side ? (o.side === "left" ? -1 : 1) : tx >= ax ? 1 : -1;
    const elbow = o.elbow === undefined ? 44 * U : o.elbow;
    const ex = tx - dir * elbow;
    const ey = ty;
    const L1 = Math.hypot(ex - ax, ey - ay);
    const L2 = Math.abs(tx - ex);
    const Ltot = L1 + L2;
    const hasOut = o.out !== undefined && o.out !== null;
    const D = hasOut ? now - o.out : -1;
    if (D > 0.22) return null;

    const pointAt = (d) =>
      d <= L1 ? (L1 > 1e-6 ? [lerp(ax, ex, d / L1), lerp(ay, ey, d / L1)] : [ex, ey]) : [ex + dir * (d - L1), ey];
    // line end b: its distance along the path from the anchor. On exit the line reels back into the
    // dot (power-in over 0.17 s) and the shrinking pill rides its end, so nothing detaches.
    let b = Ltot * outCubic(T / (o.lineDur || 0.1));
    if (D >= 0) b *= 1 - Math.pow(clamp(D / 0.17), 2);
    const lw = 4 * (o.size || 1) * U;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (b > 0.5) {
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      if (b > L1) ctx.lineTo(ex, ey);
      const [bx, by] = pointAt(b);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = o.lineColor || "#ffffff";
      ctx.lineWidth = lw;
      ctx.shadowColor = "rgba(200,180,255,0.45)";
      ctx.shadowBlur = 8 * U;
      ctx.stroke();
      noShadow(ctx);
    }

    // anchor dot: pops (back.out over 0.3 s) with a one-off ring ripple; pops away last on exit
    let ds = backOut(T / 0.3, 2.2);
    if (D >= 0) ds *= 1 - Math.pow(clamp((D - 0.13) / 0.08), OUT_POW);
    const dr = 6 * (o.size || 1) * U;
    if (ds > 0.01) {
      const rip = clamp(T / 0.4);
      if (rip < 1 && D < 0) {
        ctx.beginPath();
        ctx.arc(ax, ay, dr + 20 * U * outCubic(rip), 0, TAU);
        ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - rip) * (1 - rip)})`;
        ctx.lineWidth = 2.5 * U * (1 - 0.5 * rip);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(ax, ay, dr * ds, 0, TAU);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(210,190,255,0.7)";
      ctx.shadowBlur = 12 * U * ds;
      ctx.fill();
    }
    ctx.restore();

    // pill attaches by its near edge at the end of the line
    const [px, py] = D >= 0 ? pointAt(b) : [tx, ty];
    return ui.pill(ctx, {
      text: o.text,
      x: px,
      y: py,
      color: o.color,
      icon: o.icon,
      size: o.size,
      origin: dir > 0 ? "left" : "right",
      t0: t0 + (o.pillDelay === undefined ? 0.067 : o.pillDelay),
      now,
      out: o.out,
      flash: o.flash,
    });
  };

  // ---------------------------------------------------------------- not to scale
  ui.notToScale = (ctx, o = {}) => {
    const U = EX.U;
    let a = o.alpha === undefined ? 1 : o.alpha;
    if (o.t0 !== undefined && o.now !== undefined) a *= clamp((o.now - o.t0) / 0.25);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    const fs = 28 * U;
    ctx.font = font(fs, 700);
    const ls = 0;
    const text = o.text || "not to scale";
    const w = textW(ctx, text, ls);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = o.color || HOUSE.pal.notToScale;
    if (EX.W >= EX.H) ctx.fillText(text, EX.W - 46 * U - w, 41 * U + M.asc700 * fs);
    else {
      const S = ui.safe();
      ctx.fillText(text, S.x1 - w, S.y0 + M.asc700 * fs);
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- title
  ui.title = (ctx, o) => {
    const U = EX.U;
    const now = o.now === undefined ? 0 : o.now;
    const t0 = o.t0 === undefined ? 0 : o.t0;
    if (now < t0) return;
    const S = ui.safe();
    const lines = (o.lines || []).map((l) => (Array.isArray(l) ? l : String(l).split(/\s+/)));
    let capH = o.capH || 0.081 * Math.min(EX.W, EX.H); // 87.5 px
    let size = o.size || capH / M.cap700;
    const tracking = o.tracking === undefined ? 0.022 : o.tracking;
    const wordGap = o.wordGap === undefined ? 0.06 : o.wordGap;
    const cx = o.x === undefined ? S.cx : o.x;
    const cy = o.y === undefined ? 202 * U + 0.475 * (EX.H - Math.min(EX.W, EX.H)) : o.y;
    const stagger = o.stagger === undefined ? 0.2 : o.stagger;
    const dur = o.dur || IN_DUR;
    const n = lines.length;
    const flash = o.flash || 0;
    ctx.save();
    // fit: shrink the type (never grow it) when the widest line would leave the safe zone
    const widest = (sz) => {
      ctx.font = font(sz, 700);
      const l = tracking * sz;
      const sp = textW(ctx, " ", 0) + l + wordGap * sz;
      return Math.max(0, ...lines.map((line) => line.reduce((a, wd) => a + textW(ctx, wd, l), 0) + sp * (line.length - 1)));
    };
    if (o.fit !== false) {
      const room = 2 * Math.min(cx - S.x0, S.x1 - cx) - 2 * 24 * U;
      const wNow = widest(size);
      if (room > 0 && wNow > room) {
        const k = room / wNow;
        size *= k;
        capH *= k;
      }
    }
    const ls = tracking * size;
    const pitch = o.pitch || capH * 1.43; // 125 px: two tight lines
    const top0 = cy - (capH + pitch * (n - 1)) / 2;
    ctx.font = font(size, 700);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const space = textW(ctx, " ", 0) + ls + wordGap * size;
    // lay out every word: centre x, cap-top, width, start time
    const words = [];
    let idx = 0;
    lines.forEach((line, li) => {
      const ws = line.map((wd) => textW(ctx, wd, ls));
      const total = ws.reduce((a, b) => a + b, 0) + space * (line.length - 1);
      let x = cx - total / 2;
      line.forEach((wd, wi) => {
        words.push({ text: wd, x, w: ws[wi], top: top0 + li * pitch, i: idx++ });
        x += ws[wi] + space;
      });
    });
    const count = words.length;
    const draws = [];
    for (const wd of words) {
      const ts = t0 + wd.i * stagger;
      let s = popScale(now, ts, null, dur);
      if (o.out !== undefined && o.out !== null) {
        const d = now - (o.out + (count - 1 - wd.i) * 0.017);
        if (d > 0) s *= 1 - Math.pow(clamp(d / OUT_DUR), OUT_POW);
      }
      if (s <= 0.002) continue;
      const T = now - ts;
      const flare = Math.exp(-Math.pow((T - 0.3) / 0.18, 2)); // glow swells as the word lands
      draws.push({ wd, s, flare });
    }
    const breathe = 0.04 * Math.sin(now * 1.4);
    // pass 1: faint indigo drop shadow so the title reads over clouds and stars
    // pass 2: gentle lavender glow
    for (let pass = 0; pass < 2; pass++) {
      for (const { wd, s, flare } of draws) {
        const px = wd.x + wd.w / 2;
        const py = wd.top + capH / 2;
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(s, s);
        if (pass === 0) {
          ctx.shadowColor = "rgba(8,0,40,0.5)";
          ctx.shadowBlur = 22 * U * s;
          ctx.shadowOffsetY = 7 * U * s;
        } else {
          const ga = clamp(0.26 + breathe + 0.3 * flare + 0.45 * flash, 0, 0.95);
          ctx.shadowColor = `rgba(196,176,255,${ga})`;
          ctx.shadowBlur = (32 + 10 * flare + 24 * flash) * U * s;
        }
        ctx.fillStyle = flash > 0 ? mixA("#ffffff", "#f3eeff", flash) : o.color || "#ffffff";
        ctx.letterSpacing = ls + "px";
        ctx.fillText(wd.text, -wd.w / 2, capH / 2);
        ctx.restore();
      }
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- panel
  ui.panel = (ctx, o) => {
    const U = EX.U;
    const now = o.now === undefined ? 0 : o.now;
    const s = popScale(now, o.t0, o.out);
    if (s <= 0.002) return null;
    const { x, y, w, h } = o;
    const rim = o.rim === undefined ? 11 * U : o.rim;
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    // lift: soft indigo drop shadow, then a lavender glow around the rim
    const rg = ctx.createLinearGradient(x, y, x + w * 0.35, y + h);
    rg.addColorStop(0, "#ffffff");
    rg.addColorStop(0.5, RIM);
    rg.addColorStop(1, RIM_SHADE);
    ctx.fillStyle = rg;
    ctx.shadowColor = "rgba(6,0,30,0.6)";
    ctx.shadowBlur = 44 * U * s;
    ctx.shadowOffsetY = 16 * U * s;
    rr(ctx, x, y, w, h, 5 * U);
    ctx.fill();
    ctx.shadowColor = "rgba(170,140,255,0.42)";
    ctx.shadowBlur = 28 * U * s;
    ctx.shadowOffsetY = 0;
    ctx.fill();
    noShadow(ctx);
    // content, clipped to the inner rect
    const ix = x + rim;
    const iy = y + rim;
    const iw = Math.max(0, w - 2 * rim);
    const ih = Math.max(0, h - 2 * rim);
    ctx.save();
    rr(ctx, ix, iy, iw, ih, 2 * U);
    ctx.clip();
    ctx.fillStyle = o.bg || HOUSE.pal.sky[1];
    ctx.fillRect(ix, iy, iw, ih);
    if (o.draw) {
      ctx.save();
      o.draw(ctx, { x: ix, y: iy, w: iw, h: ih, s });
      ctx.restore();
    }
    // inner bevel: a thin shade under the rim so the picture sits inside the frame
    const sh = 14 * U;
    let g = ctx.createLinearGradient(0, iy, 0, iy + sh);
    g.addColorStop(0, "rgba(10,0,40,0.45)");
    g.addColorStop(1, "rgba(10,0,40,0)");
    ctx.fillStyle = g;
    ctx.fillRect(ix, iy, iw, sh);
    g = ctx.createLinearGradient(ix, 0, ix + sh, 0);
    g.addColorStop(0, "rgba(10,0,40,0.35)");
    g.addColorStop(1, "rgba(10,0,40,0)");
    ctx.fillStyle = g;
    ctx.fillRect(ix, iy, sh, ih);
    ctx.restore();
    ctx.restore();
    return { x: ix, y: iy, w: iw, h: ih, s };
  };

  // ---------------------------------------------------------------- time bar
  ui.timebar = (ctx, o) => {
    const U = EX.U;
    const t = o.t === undefined ? (o.now === undefined ? 0 : o.now) : o.t;
    let k = o.k;
    if (k === undefined) k = o.t0 === undefined ? 1 : clamp(((o.now === undefined ? t : o.now) - o.t0) / 0.8);
    if (k <= 0) return;
    const { x, y } = o;
    const w = Math.max(0, o.w);
    const h = o.h || 125 * U;
    const top = y - h / 2;
    const hb = h * 0.78; // luminous upper band
    const shelf = h - hb; // darker lower face
    const coreY = top + hb / 2;
    const tickOver = h * 0.16;
    const kt = backOut(k / 0.45);
    const kb = inOutCubic((k - 0.12) / 0.6);
    const kl = clamp((k - 0.5) / 0.5);
    ctx.save();

    if (kb > 0) {
      const bw = w * kb;
      // band glow + body
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 60 * U, top - 80 * U, bw + 60 * U, h + 160 * U);
      ctx.clip();
      const bg = ctx.createLinearGradient(0, top, 0, top + hb);
      bg.addColorStop(0, "#5726d4");
      bg.addColorStop(0.5, "#6a36ef");
      bg.addColorStop(1, "#4d1fc4");
      ctx.fillStyle = bg;
      ctx.shadowColor = "rgba(120,70,255,0.5)";
      ctx.shadowBlur = 48 * U;
      ctx.fillRect(x, top, w, hb);
      noShadow(ctx);
      const sg = ctx.createLinearGradient(0, top + hb, 0, top + h);
      sg.addColorStop(0, "#2f0f94");
      sg.addColorStop(1, "#260b7c");
      ctx.fillStyle = sg;
      ctx.fillRect(x, top + hb, w, shelf);
      ctx.fillStyle = "rgba(160,130,255,0.35)";
      ctx.fillRect(x, top + hb, w, 2 * U);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, top - 40 * U, bw, h + 80 * U);
      ctx.clip();
      // light pool around the core
      const lg = ctx.createLinearGradient(0, top, 0, top + hb);
      lg.addColorStop(0, "rgba(190,160,255,0)");
      lg.addColorStop(0.5, "rgba(190,160,255,0.24)");
      lg.addColorStop(1, "rgba(190,160,255,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = lg;
      ctx.fillRect(x, top, w, hb);
      ctx.globalCompositeOperation = "source-over";

      // sparkles: fixed density per pixel, streaming slowly to the right, twinkling
      const sp = 9 * U;
      const flow = 34 * U; // px/s
      const nS = Math.ceil((w + sp) / sp) + 1;
      const shift = Math.floor((t * flow) / sp);
      const off = t * flow - shift * sp;
      for (let i = -1; i < nS; i++) {
        const id = i - shift; // identity travels with the flow
        const h1 = EX.hash(id, 71);
        const h2 = EX.hash(id, 72);
        const h3 = EX.hash(id, 73);
        if (EX.hash(id, 74) < 0.22) continue;
        const sx = x + i * sp + off + (h1 - 0.5) * sp;
        if (sx < x + 4 * U || sx > x + w - 4 * U) continue;
        const edge = clamp(Math.min(sx - x, x + w - sx) / (26 * U));
        const sy = top + 7 * U + h2 * (hb - 14 * U);
        const tw = 0.7 + 0.3 * Math.sin(t * (2.2 + 3.5 * h3) + h1 * TAU);
        const r = (1.8 + 3.6 * h3 * h3) * U;
        const a = edge * tw * (0.7 + 0.3 * h2);
        ctx.fillStyle = h1 > 0.65 ? `rgba(255,255,255,${a})` : `rgba(217,204,255,${a})`;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, TAU);
        ctx.fill();
        if (r > 4.6 * U) {
          // four-point glint on the biggest ones
          const gl = r * 2.4 * tw;
          ctx.fillStyle = `rgba(244,238,255,${a * 0.75})`;
          ctx.beginPath();
          ctx.moveTo(sx, sy - gl);
          ctx.quadraticCurveTo(sx, sy, sx + gl, sy);
          ctx.quadraticCurveTo(sx, sy, sx, sy + gl);
          ctx.quadraticCurveTo(sx, sy, sx - gl, sy);
          ctx.quadraticCurveTo(sx, sy, sx, sy - gl);
          ctx.fill();
        }
      }

      // core: white capsule, hard lavender rim, soft glow beneath
      const cth = Math.max(8 * U, hb * 0.17);
      const c0 = x + 12 * U;
      const c1 = Math.max(c0, x + w - 12 * U);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(c0, coreY);
      ctx.lineTo(c1, coreY);
      ctx.strokeStyle = "rgba(150,115,255,0.6)";
      ctx.lineWidth = cth + 16 * U;
      ctx.shadowColor = "rgba(190,160,255,0.9)";
      ctx.shadowBlur = 30 * U;
      ctx.stroke();
      noShadow(ctx);
      ctx.strokeStyle = "#ab93ff";
      ctx.lineWidth = cth + 11 * U;
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = cth;
      ctx.stroke();
      // a slow sheen travelling along the rim
      if (c1 - c0 > 40 * U) {
        const sheenX = c0 + (((t * 0.32) % 1.5) - 0.25) * (c1 - c0);
        const shg = ctx.createLinearGradient(sheenX - 140 * U, 0, sheenX + 140 * U, 0);
        shg.addColorStop(0, "rgba(255,240,255,0)");
        shg.addColorStop(0.5, "rgba(255,240,255,0.45)");
        shg.addColorStop(1, "rgba(255,240,255,0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = shg;
        ctx.lineWidth = cth + 11 * U;
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      }
      // glowing wipe front while the bar builds
      if (kb < 1) {
        const fx = x + bw;
        const fr = 70 * U;
        const fg = ctx.createRadialGradient(fx, coreY, 0, fx, coreY, fr);
        fg.addColorStop(0, "rgba(255,255,255,0.9)");
        fg.addColorStop(0.25, "rgba(210,190,255,0.5)");
        fg.addColorStop(1, "rgba(150,110,255,0)");
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = fg;
        ctx.fillRect(fx - fr, coreY - fr, 2 * fr, 2 * fr);
      }
      ctx.restore();
    }

    // end ticks: white rounded bars that grow from the centre
    if (kt > 0) {
      const th = (h + 2 * tickOver) * kt;
      const tw = 8 * U;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(200,180,255,0.8)";
      ctx.shadowBlur = 14 * U;
      for (const tx of [x, x + w]) {
        rr(ctx, tx - tw / 2, y - th / 2, tw, th, tw / 2);
        ctx.fill();
      }
      noShadow(ctx);
    }

    // labels under the left end; a right-end label (e.g. "10 minutes") pops separately
    const labelBase = top + h + (o.labelGap === undefined ? 116 * U : o.labelGap);
    const rise = (p, x0, base, text, size, weight, color, align) => {
      if (p <= 0 || !text) return;
      const e = backOut(p, 1.4);
      ctx.save();
      ctx.globalAlpha *= clamp(p * 2.2);
      ctx.font = font(size, weight);
      const ls = 0.3 * U;
      const tw = textW(ctx, text, ls);
      ctx.textAlign = "left";
      ctx.fillStyle = color;
      ctx.shadowColor = "rgba(8,0,40,0.5)";
      ctx.shadowBlur = 10 * U;
      ctx.shadowOffsetY = 3 * U;
      ctx.fillText(text, align === "right" ? x0 - tw : x0, base + (1 - e) * 18 * U);
      ctx.restore();
    };
    const labelSize = o.labelSize || 44 * U;
    rise(kl, x, labelBase, o.label, labelSize, 700, "#ffffff");
    rise(clamp((k - 0.62) / 0.38), x, labelBase + (o.subGap || 48 * U), o.sub, o.subSize || 36 * U, 600, "#9478f4");
    if (o.rightLabel) {
      const rk = o.rightK === undefined ? kl : clamp(o.rightK);
      rise(rk, x + w, labelBase, o.rightLabel, labelSize, 700, "#ffffff", "right");
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- lens
  ui.lens = (ctx, o) => {
    const U = EX.U;
    const now = o.now === undefined ? 0 : o.now;
    const s = popScale(now, o.t0, o.out);
    if (s <= 0.002) return null;
    const { x, y, r } = o;
    const rim = o.rim === undefined ? 9 * U : o.rim;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.translate(-x, -y);
    const rg = ctx.createLinearGradient(x - r, y - r, x + r * 0.6, y + r);
    rg.addColorStop(0, "#ffffff");
    rg.addColorStop(0.55, RIM);
    rg.addColorStop(1, RIM_SHADE);
    ctx.fillStyle = rg;
    ctx.shadowColor = "rgba(6,0,30,0.55)";
    ctx.shadowBlur = 36 * U * s;
    ctx.shadowOffsetY = 12 * U * s;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.shadowColor = "rgba(180,150,255,0.5)";
    ctx.shadowBlur = 26 * U * s;
    ctx.shadowOffsetY = 0;
    ctx.fill();
    noShadow(ctx);
    const ir = r - rim;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, ir, 0, TAU);
    ctx.clip();
    const bg = ctx.createRadialGradient(x - ir * 0.25, y - ir * 0.3, 0, x, y, ir);
    bg.addColorStop(0, o.bgHi || "#3a1576");
    bg.addColorStop(1, o.bg || "#22094f");
    ctx.fillStyle = bg;
    ctx.fillRect(x - ir, y - ir, ir * 2, ir * 2);
    if (o.draw) {
      ctx.save();
      o.draw(ctx, { x, y, r: ir, s });
      ctx.restore();
    }
    // glass: inner shade ring and a soft highlight arc at the upper left
    const sg = ctx.createRadialGradient(x, y, ir * 0.82, x, y, ir);
    sg.addColorStop(0, "rgba(12,0,40,0)");
    sg.addColorStop(1, "rgba(12,0,40,0.42)");
    ctx.fillStyle = sg;
    ctx.fillRect(x - ir, y - ir, ir * 2, ir * 2);
    ctx.beginPath();
    ctx.arc(x, y, ir * 0.86, Math.PI * 1.08, Math.PI * 1.42);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = Math.max(3 * U, ir * 0.045);
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
    ctx.restore();
    return { x, y, r: ir, s };
  };

  // ---------------------------------------------------------------- dotted signal line
  ui.dotted = (ctx, o) => {
    const U = EX.U;
    const [x0, y0] = o.from;
    const [x1, y1] = o.to;
    const k = clamp(o.k === undefined ? 1 : o.k);
    const k0 = clamp(o.k0 || 0);
    if (k <= k0) return;
    const t = o.t || 0;
    const L = Math.hypot(x1 - x0, y1 - y0);
    if (L < 1) return;
    const ux = (x1 - x0) / L;
    const uy = (y1 - y0) / L;
    const sp = o.spacing || 26.5 * U;
    const r = o.r || 4.6 * U;
    const color = o.color || "#ece2ff";
    const flow = o.flow === undefined ? 22 * U : o.flow;
    const head = k * L;
    const tail = k0 * L;
    const off = (((t * flow) % sp) + sp) % sp;
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = "rgba(200,180,255,0.6)";
    ctx.shadowBlur = 8 * U;
    const n = Math.ceil(L / sp) + 1;
    for (let i = 0; i <= n; i++) {
      const d = i * sp + off;
      if (d > head || d < tail || d > L) continue;
      // dots are laid down behind the head (pop) and fade in at the start / out at the end
      let sc = backOut((head - d) / (sp * 2.2), 2.0);
      sc *= clamp((d - tail) / (sp * 0.9)) * clamp((L - d) / (sp * 0.6) + 0.15);
      if (sc <= 0.02) continue;
      ctx.beginPath();
      ctx.arc(x0 + ux * d, y0 + uy * d, r * sc, 0, TAU);
      ctx.fill();
    }
    noShadow(ctx);
    // the signal head: a bright travelling spark with a short comet tail
    if ((o.head === undefined || o.head) && k < 1) {
      const hx = x0 + ux * head;
      const hy = y0 + uy * head;
      ctx.globalCompositeOperation = "lighter";
      const tl = Math.min(110 * U, head - tail);
      const tg = ctx.createLinearGradient(hx - ux * tl, hy - uy * tl, hx, hy);
      tg.addColorStop(0, "rgba(180,150,255,0)");
      tg.addColorStop(1, "rgba(220,205,255,0.55)");
      ctx.strokeStyle = tg;
      ctx.lineWidth = r * 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(hx - ux * tl, hy - uy * tl);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 6);
      hg.addColorStop(0, "rgba(255,255,255,0.95)");
      hg.addColorStop(0.25, "rgba(220,200,255,0.6)");
      hg.addColorStop(1, "rgba(160,120,255,0)");
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(hx, hy, r * 6, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- divider
  ui.divider = (ctx, o) => {
    const U = EX.U;
    const k = clamp(o.k === undefined ? 1 : o.k);
    if (k <= 0) return;
    const e = o.ease === false ? k : outCubic(k);
    const w = o.w || 9 * U;
    const y0 = o.y0 === undefined ? 0 : o.y0;
    const y1 = o.y1 === undefined ? EX.H : o.y1;
    const from = o.from || "top";
    let a = y0;
    let b = y1;
    if (from === "top") b = lerp(y0, y1, e);
    else if (from === "bottom") a = lerp(y1, y0, e);
    else {
      const m = (y0 + y1) / 2;
      a = lerp(m, y0, e);
      b = lerp(m, y1, e);
    }
    const x = o.x;
    ctx.save();
    ctx.fillStyle = o.color || RIM;
    ctx.shadowColor = "rgba(190,165,255,0.6)";
    ctx.shadowBlur = 22 * U;
    ctx.fillRect(x - w / 2, a, w, b - a);
    noShadow(ctx);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(x - w / 2 + w * 0.3, a, w * 0.3, b - a);
    if (e < 1) {
      // glowing leading tip(s) while it wipes
      ctx.globalCompositeOperation = "lighter";
      const tips = from === "top" ? [b] : from === "bottom" ? [a] : [a, b];
      const tr = 46 * U;
      for (const ty of tips) {
        const g = ctx.createRadialGradient(x, ty, 0, x, ty, tr);
        g.addColorStop(0, "rgba(255,255,255,0.9)");
        g.addColorStop(0.3, "rgba(200,175,255,0.45)");
        g.addColorStop(1, "rgba(150,110,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - tr, ty - tr, 2 * tr, 2 * tr);
      }
    }
    ctx.restore();
  };
})();

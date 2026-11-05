/* story.js: the setup demo. 5.0 s at 60 fps, no voice. The same file runs in demos/demo-wide (1920×1080)
 * and demos/demo-tall (1080×1920): the layout table L picks the positions for the page's size.
 *
 * A night hillside in the house look: indigo sky with stars, a moon and a faint band of dust, a one-sided
 * magenta horizon glow, far hills with trees and lit windows, a fenced mid hill, a grassy near hill with
 * fireflies, and the red-hoodie hero breathing and blinking on top. The camera pushes 1.00 → 1.04 with a
 * little sway, each layer by its depth.
 *   1.0 s  a pill pops beside the hero's head          (sound: pop)
 *   2.2 s  a callout runs from the hero's hand to a pill (sound: swish)
 *   3.0 s  both labels leave so the title has the frame
 *   3.2 s  the title, two lines, words 0.2 s apart        (sound: title)
 *   4.4 s  fade to black until 5.0 s
 * No words are spoken, so the times are constants (a narrated film uses EX.cue instead). The scenery is
 * drawn here because the demo has no art modules; a film draws it in story/<module>.js files.
 */
(function () {
  const { clamp, lerp } = EX;
  const S = HOUSE.smooth;
  const P = HOUSE.pal;
  const ui = HOUSE.ui;
  const TAU = EX.TAU;

  const DUR = Number(document.getElementById("root").dataset.duration);
  const WIDE = EX.W > EX.H;
  const W = EX.W;
  const H = EX.H;
  EX.setWords(window.STORY_WORDS || []); // empty: this demo has no voice

  // ---------- times (seconds) ----------
  const T = { pill: 1.0, callout: 2.2, labelsOut: 3.0, title: 3.2, fade: 4.4 };

  // ---------- layout table ----------
  // y of each hill at x: a base height plus a few slow waves (k = waves across the frame)
  const waves = (base, parts) => (x) => base + parts.reduce((y, [a, k, ph]) => y + a * Math.sin((TAU * k * x) / W + ph), 0);
  const L = WIDE
    ? {
        hero: { x: 1300, y: 1000, h: 520 },
        focus: [1250, 700], // the camera pushes toward this point
        glow: [-80, 700, 1500], // x, y, radius of the one-sided horizon glow
        moon: [300, 178, 46],
        pool: [1180, 170, 900],
        band: [[-100, 520], [2050, 40]], // the faint band of dust across the sky
        clouds: [[1490, 440, 175], [1820, 330, 105], [430, 480, 135]], // x, base y, half-length
        far: waves(688, [[30, 1.3, 0.8], [14, 3.1, 2.1], [5, 7.3, 0.3]]),
        mid: waves(818, [[28, 0.9, 2.6], [11, 2.7, 1.2]]),
        near: (x) => 1000 + 0.00013 * (x - 1340) * (x - 1340) + 5 * Math.sin((TAU * 2.3 * (x - 1300)) / W),
        trees: [[470, 720, 7], [1450, 1640, 6], [1830, 1960, 3]],
        houses: [[790, 1], [905, 0.85], [1735, 0.9]],
        fence: [140, 780],
        oak: [600, 1.0], // a lone tree on the mid hill: x, size
        banks: [[-60, 580, (x) => 940 + 0.0006 * (x + 20) * (x + 20)]], // dark grass banks in front: x0, x1, y(x)
        sky: 640, // stars live above this y
        meteor: [[1560, 60], [1180, 250]],
      }
    : {
        hero: { x: 540, y: 1500, h: 760 },
        focus: [540, 900],
        titleY: 585,
        glow: [-120, 1160, 1500],
        moon: [228, 318, 54],
        pool: [700, 380, 820],
        band: [[-100, 980], [1180, 120]],
        clouds: [[830, 985, 140], [150, 150, 85], [875, 215, 105]],
        far: waves(1150, [[26, 0.9, 0.8], [12, 2.2, 2.1], [5, 5.1, 0.3]]),
        mid: waves(1290, [[22, 0.7, 2.6], [10, 1.9, 1.2]]),
        near: (x) => 1500 + 0.00035 * (x - 560) * (x - 560) + 6 * Math.sin((TAU * 1.7 * (x - 540)) / W),
        trees: [[40, 240, 5], [700, 900, 5]],
        houses: [[330, 0.9], [960, 0.8]],
        fence: [690, 1140],
        oak: [955, 1.05],
        banks: [
          [-60, 470, (x) => 1745 + 0.0011 * (x + 20) * (x + 20)],
          [600, 1140, (x) => 1770 + 0.0012 * (x - 1100) * (x - 1100)],
        ],
        sky: 1110,
        meteor: [[930, 150], [700, 330]],
      };

  // ---------- camera: a slow push with a little sway; each layer moves by its depth ----------
  function camAt(t) {
    const zoom = lerp(1.0, 1.04, EX.ease.inOutSine(clamp(t / DUR)));
    return { zoom, sx: 9 * EX.noise1(t * 0.12, 7), sy: 6 * EX.noise1(t * 0.1, 9) };
  }
  function layer(ctx, cam, depth, fn) {
    const z = 1 + (cam.zoom - 1) * depth;
    const [fx, fy] = L.focus;
    ctx.save();
    ctx.translate(fx + cam.sx * depth, fy + cam.sy * depth);
    ctx.scale(z, z);
    ctx.translate(-fx, -fy);
    fn();
    ctx.restore();
  }
  // where a point of the depth-1 layer lands on screen (the hero and its labels)
  const onScreen = (cam, x, y) => [L.focus[0] + cam.sx + (x - L.focus[0]) * cam.zoom, L.focus[1] + cam.sy + (y - L.focus[1]) * cam.zoom];

  // ---------- cached layouts (built once in init; drawing reads them as constants) ----------
  let STARS = [];
  let TREES = [];
  let BLADES = [];
  let FLIES = [];
  let FLOWERS = [];
  let TUFTS = [];
  function init() {
    const r = EX.rng(2024);
    const area = (W * L.sky) / (1920 * 640);
    STARS = [];
    const [[bx0, by0], [bx1, by1]] = L.band;
    for (let i = 0; i < Math.round(330 * area); i++) {
      let x;
      let y;
      if (r() < 0.32) {
        // a third of the stars crowd along the dust band
        const u = r();
        x = lerp(bx0, bx1, u) + (r() - 0.5) * 120;
        y = lerp(by0, by1, u) + (r() - 0.5) * 150;
      } else {
        x = r() * (W + 120) - 60;
        y = r() * (L.sky + 40) - 40;
      }
      const k = r();
      const size = k < 0.72 ? 0.7 + r() * 0.7 : k < 0.95 ? 1.5 + r() * 0.9 : 2.6 + r() * 1.3;
      const c = r();
      const color = c < 0.08 ? P.sparkCyan : c < 0.13 ? P.sparkPink : P.star[Math.floor(r() * 3)];
      STARS.push({ x, y, size, color, f: 0.8 + r() * 2.6, ph: r() * TAU, glint: k > 0.95 });
    }
    TREES = [];
    for (const [x0, x1, n] of L.trees) {
      for (let i = 0; i < n; i++) {
        const x = lerp(x0, x1, (i + 0.5 * r()) / n);
        TREES.push({ x, h: 22 + r() * 26, w: 12 + r() * 9, pine: r() < 0.45, lean: (r() - 0.5) * 0.08 });
      }
    }
    BLADES = [];
    for (let x = -60; x < W + 60; x += 9 + r() * 7) {
      if (r() < 0.25) continue;
      BLADES.push({ x, h: 9 + r() * 16, lean: (r() - 0.5) * 0.7, ph: r() * 10, n: 2 + Math.floor(r() * 3) });
    }
    FLIES = [];
    for (let i = 0; i < 18; i++) {
      const front = i % 3 === 0;
      FLIES.push({
        x: r() * W,
        y: lerp(front ? L.hero.y - L.hero.h * 0.9 : L.far(0) - 30, front ? L.hero.y + 40 : L.mid(0) + 60, r()),
        front,
        color: [P.window[1], P.sparkCyan, P.sparkPink][Math.floor(r() * 3)],
        f: 0.6 + r() * 0.9,
        ph: r() * TAU,
        r: 2 + r() * 2,
      });
    }
    TUFTS = [];
    for (let i = 0; i < 190; i++) {
      TUFTS.push({ x: r() * (W + 100) - 50, u: r(), near: r() < 0.5, ph: r() * 10, n: 2 + Math.floor(r() * 2), lean: (r() - 0.5) * 0.8 });
    }
    FLOWERS = [];
    for (let i = 0; i < 9; i++) {
      const side = i % 2 ? 1 : -1;
      const dx = side * (L.hero.h * 0.22 + r() * L.hero.h * 0.55);
      FLOWERS.push({ x: L.hero.x + dx, h: 14 + r() * 16, color: r() < 0.5 ? P.sparkCyan : P.sparkPink, ph: r() * TAU });
    }
    return Promise.resolve();
  }

  // ---------- drawing helpers ----------
  const fillHill = (ctx, fy, x0, x1, bottom) => {
    ctx.beginPath();
    ctx.moveTo(x0, bottom);
    for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, fy(x));
    ctx.lineTo(x1, fy(x1));
    ctx.lineTo(x1, bottom);
    ctx.closePath();
  };
  const halo = (ctx, x, y, rad, color, a) => {
    if (a <= 0.003) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, EX.rgba(color, a));
    g.addColorStop(0.35, EX.rgba(color, a * 0.35));
    g.addColorStop(1, EX.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  const glint = (ctx, x, y, len, a, color) => {
    ctx.fillStyle = EX.rgba(color, a);
    ctx.beginPath();
    ctx.moveTo(x, y - len);
    ctx.quadraticCurveTo(x, y, x + len, y);
    ctx.quadraticCurveTo(x, y, x, y + len);
    ctx.quadraticCurveTo(x, y, x - len, y);
    ctx.quadraticCurveTo(x, y, x, y - len);
    ctx.fill();
  };

  // ---------- the sky ----------
  function sky(ctx, t, cam) {
    const g = ctx.createLinearGradient(0, 0, 0, L.sky + 160);
    P.sky.forEach((c, i) => g.addColorStop(i / (P.sky.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    layer(ctx, cam, 0.12, () => {
      // a soft light pool high in the sky, breathing
      const [px, py, pr] = L.pool;
      const pg = ctx.createRadialGradient(px, py, 0, px, py, pr);
      pg.addColorStop(0, P.skyPool.replace(/[\d.]+\)$/, `${0.3 + 0.05 * Math.sin(t * 0.7)})`));
      pg.addColorStop(1, "rgba(70,40,190,0)");
      ctx.fillStyle = pg;
      ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      // a faint band of dust across the sky
      ctx.globalCompositeOperation = "lighter";
      const [[bx0, by0], [bx1, by1]] = L.band;
      for (let i = 0; i <= 9; i++) {
        const u = i / 9;
        halo(ctx, lerp(bx0, bx1, u), lerp(by0, by1, u) + 18 * Math.sin(i * 1.7), 210 + 60 * Math.sin(i * 2.3), "#b9a6ff", 0.045);
      }
      // stars: three sizes, twinkling; the biggest carry a four-point glint
      for (const s of STARS) {
        const tw = 0.55 + 0.45 * Math.sin(t * s.f + s.ph);
        const fadeLow = clamp((L.sky + 30 - s.y) / 180);
        const a = (0.45 + 0.55 * tw) * fadeLow;
        if (a <= 0.02) continue;
        ctx.fillStyle = EX.rgba(s.color, a);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * EX.U, 0, TAU);
        ctx.fill();
        if (s.glint) {
          halo(ctx, s.x, s.y, s.size * 7, s.color, 0.22 * a);
          glint(ctx, s.x, s.y, s.size * (2.6 + 1.6 * tw), 0.7 * a, P.star[2]);
        }
      }
      ctx.globalCompositeOperation = "source-over";
      moon(ctx, t);
      meteor(ctx, t);
    });
  }

  function moon(ctx, t) {
    const [x, y, r] = L.moon;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    halo(ctx, x, y, r * 5.5, "#8f7dff", 0.2 + 0.02 * Math.sin(t * 0.9));
    halo(ctx, x, y, r * 2.2, "#e2d6ff", 0.32);
    ctx.globalCompositeOperation = "source-over";
    // the disc: a lit fill, a hard cel shade away from the light (lower right), a few flat craters
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, "#fbf7ff");
    g.addColorStop(1, "#e4dbff");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.beginPath();
    ctx.rect(x - r * 2, y - r * 2, r * 4, r * 4);
    ctx.arc(x - r * 0.16, y - r * 0.16, r, 0, TAU, true);
    ctx.fillStyle = "#b9a6ff";
    ctx.fill();
    for (const [cx, cy, cr] of [[-0.3, 0.22, 0.19], [0.28, -0.22, 0.12], [0.08, 0.46, 0.08], [-0.42, -0.32, 0.07], [0.42, 0.18, 0.06]]) {
      ctx.beginPath();
      ctx.arc(x + cx * r, y + cy * r, cr * r, 0, TAU);
      ctx.fillStyle = "rgba(170,150,240,0.45)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + cx * r + cr * r * 0.25, y + cy * r + cr * r * 0.25, cr * r * 0.7, 0, TAU);
      ctx.fillStyle = "rgba(205,190,255,0.5)";
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }

  function meteor(ctx, t) {
    const u = (t - 0.2) / 0.7;
    if (u <= 0 || u >= 1) return;
    const [[x0, y0], [x1, y1]] = L.meteor;
    const p = EX.ease.outQuad(u);
    const hx = lerp(x0, x1, p);
    const hy = lerp(y0, y1, p);
    const len = 170 * Math.sin(Math.PI * u);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const d = Math.hypot(dx, dy);
    const a = Math.sin(Math.PI * u);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const tg = ctx.createLinearGradient(hx - (dx / d) * len, hy - (dy / d) * len, hx, hy);
    tg.addColorStop(0, "rgba(201,184,255,0)");
    tg.addColorStop(1, `rgba(243,236,255,${0.85 * a})`);
    ctx.strokeStyle = tg;
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hx - (dx / d) * len, hy - (dy / d) * len);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    halo(ctx, hx, hy, 16, "#f3ecff", 0.7 * a);
    ctx.restore();
  }

  // flat-based clouds: opaque puffs (a union), a warm rim on top, a cel shade on the lower part
  const PUFFS = [[-1.0, 0.02, 0.13], [-0.78, 0.08, 0.22], [-0.45, 0.2, 0.32], [-0.05, 0.3, 0.4], [0.36, 0.22, 0.33], [0.7, 0.1, 0.24], [0.95, 0.03, 0.15]];
  function clouds(ctx, t, cam) {
    layer(ctx, cam, 0.2, () => {
      L.clouds.forEach(([cx, base, half], i) => {
        const x = cx + t * 6 * (i % 2 ? -1 : 1);
        const puffs = (dx, dy) => {
          ctx.beginPath();
          for (const [u, v, r] of PUFFS) {
            const px = x + u * half + dx;
            const py = base - v * half + dy;
            const R = r * half;
            ctx.moveTo(px + R, py);
            ctx.arc(px, py, R, 0, TAU);
          }
        };
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - half * 2, base - half * 2, half * 4, half * 2); // the flat base
        ctx.clip();
        puffs(-1.5, -3.5);
        ctx.fillStyle = EX.rgba(EX.mix(P.cloudRim, P.cloudTop, 0.35));
        ctx.fill();
        puffs(0, 0);
        ctx.fillStyle = P.cloudTop;
        ctx.fill();
        ctx.clip();
        puffs(half * 0.05, half * 0.2);
        ctx.fillStyle = P.cloudMid;
        ctx.fill();
        const g = ctx.createLinearGradient(0, base - half * 0.22, 0, base);
        g.addColorStop(0, EX.rgba(P.cloudBack, 0));
        g.addColorStop(1, EX.rgba(P.cloudBack, 0.85));
        ctx.fillStyle = g;
        ctx.fillRect(x - half * 1.5, base - half * 0.22, half * 3, half * 0.22);
        ctx.restore();
      });
    });
  }

  function horizonGlow(ctx, t, cam) {
    layer(ctx, cam, 0.3, () => {
      const [gx, gy, gr] = L.glow;
      const br = 1 + 0.035 * Math.sin(t * 0.8);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(gx, gy);
      ctx.scale(1, 0.58);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, gr * br);
      const [c0, c1, c2, c3, c4] = P.glow;
      g.addColorStop(0, EX.rgba(c4, 0.85));
      g.addColorStop(0.1, EX.rgba(c3, 0.72));
      g.addColorStop(0.28, EX.rgba(c2, 0.46));
      g.addColorStop(0.52, EX.rgba(c1, 0.26));
      g.addColorStop(0.78, EX.rgba(c0, 0.12));
      g.addColorStop(1, EX.rgba(c0, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-gr * 1.1, -gr * 1.1, gr * 2.2, gr * 2.2);
      ctx.restore();
    });
  }

  // ---------- the hills ----------
  function farHill(ctx, t, cam) {
    layer(ctx, cam, 0.35, () => {
      const x0 = -300;
      const x1 = W + 300;
      // trees and houses stand on the ridge, behind the hill's rim
      for (const tr of TREES) treeShape(ctx, tr, L.far(tr.x));
      for (const [hx, k] of L.houses) house(ctx, t, hx, L.far(hx) + 6, k);
      // rim: a bright ridge facing the glow (left), fading to the hill colour on the right
      const rim = ctx.createLinearGradient(0, 0, W, 0);
      rim.addColorStop(0, P.ridge);
      rim.addColorStop(0.35, P.hillFarRidge);
      rim.addColorStop(0.8, EX.rgba(P.hillFarRidge, 0.35));
      rim.addColorStop(1, P.hillFar);
      fillHill(ctx, L.far, x0, x1, H + 300);
      ctx.fillStyle = P.hillFar;
      ctx.fill();
      ctx.fillStyle = rim;
      ctx.fill();
      ctx.save();
      ctx.translate(0, 3.5);
      fillHill(ctx, L.far, x0, x1, H + 300);
      const body = ctx.createLinearGradient(0, 0, W, 0);
      body.addColorStop(0, EX.rgba(EX.mix(P.hillFar, P.glow[2], 0.32)));
      body.addColorStop(0.45, P.hillFar);
      body.addColorStop(1, P.hillFar);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.restore();
      // haze at the hill's foot so the mid hill reads in front
      const hz = ctx.createLinearGradient(0, L.far(W / 2) + 20, 0, L.mid(W / 2) + 10);
      hz.addColorStop(0, EX.rgba(P.hillFar, 0));
      hz.addColorStop(1, EX.rgba(P.glow[1], 0.28));
      ctx.fillStyle = hz;
      ctx.fillRect(x0, L.far(W / 2) + 20, x1 - x0, L.mid(W / 2) - L.far(W / 2) + 120);
    });
  }

  function treeShape(ctx, tr, groundY) {
    const { x, h, w, pine, lean } = tr;
    ctx.save();
    ctx.translate(x, groundY + 4);
    ctx.transform(1, 0, lean, 1, 0, 0);
    const body = (dx) => {
      ctx.beginPath();
      if (pine) {
        ctx.moveTo(dx, -h - 4);
        ctx.lineTo(dx + w * 0.62, -h * 0.25);
        ctx.lineTo(dx + w * 0.2, -h * 0.25);
        ctx.lineTo(dx + w * 0.75, 2);
        ctx.lineTo(dx - w * 0.75, 2);
        ctx.lineTo(dx - w * 0.2, -h * 0.25);
        ctx.lineTo(dx - w * 0.62, -h * 0.25);
        ctx.closePath();
      } else {
        ctx.rect(dx - 1.6, -h * 0.4, 3.2, h * 0.4 + 2);
        ctx.moveTo(dx + w * 0.6, -h * 0.62);
        ctx.arc(dx, -h * 0.62, w * 0.6, 0, TAU);
        ctx.moveTo(dx - w * 0.15 + w * 0.42, -h * 0.85);
        ctx.arc(dx - w * 0.15, -h * 0.85, w * 0.42, 0, TAU);
      }
    };
    body(-1.6); // rim on the glow side
    ctx.fillStyle = EX.rgba(P.hillFarRidge, 0.85);
    ctx.fill();
    body(0);
    ctx.fillStyle = P.treeFar;
    ctx.fill();
    ctx.restore();
  }

  function house(ctx, t, x, groundY, k) {
    const w = 34 * k;
    const h = 22 * k;
    ctx.save();
    ctx.translate(x, groundY);
    // walls and roof as one silhouette, with a cool rim on the roof's left slope
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2, -h);
    ctx.lineTo(-w / 2 - 4 * k, -h);
    ctx.lineTo(0, -h - 17 * k);
    ctx.lineTo(w / 2 + 4 * k, -h);
    ctx.lineTo(w / 2, -h);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fillStyle = P.props;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 4 * k, -h);
    ctx.lineTo(0, -h - 17 * k);
    ctx.lineTo(0, -h - 13 * k);
    ctx.lineTo(-w / 2 - 1 * k, -h);
    ctx.closePath();
    ctx.fillStyle = EX.rgba(P.hillFarRidge, 0.75);
    ctx.fill();
    // lit windows with a soft halo that breathes
    const glowA = 0.5 + 0.08 * Math.sin(t * 1.3 + x);
    ctx.globalCompositeOperation = "lighter";
    for (const wx of [-w * 0.22, w * 0.22]) halo(ctx, wx, -h * 0.5, 22 * k, P.window[0], glowA * 0.55);
    ctx.globalCompositeOperation = "source-over";
    for (const wx of [-w * 0.22, w * 0.22]) {
      ctx.fillStyle = P.window[0];
      ctx.fillRect(wx - 4 * k, -h * 0.5 - 4.5 * k, 8 * k, 9 * k);
      ctx.fillStyle = P.window[1];
      ctx.fillRect(wx - 4 * k, -h * 0.5 - 4.5 * k, 8 * k, 3 * k);
    }
    ctx.restore();
  }

  function midHill(ctx, t, cam) {
    layer(ctx, cam, 0.6, () => {
      const x0 = -300;
      const x1 = W + 300;
      fence(ctx);
      fillHill(ctx, L.mid, x0, x1, H + 300);
      const rim = ctx.createLinearGradient(0, 0, W, 0);
      rim.addColorStop(0, EX.rgba(EX.mix(P.hillMidRim, P.ridge, 0.45)));
      rim.addColorStop(0.5, P.hillMidRim);
      rim.addColorStop(1, EX.rgba(P.hillMidRim, 0.6));
      ctx.fillStyle = rim;
      ctx.fill();
      ctx.save();
      ctx.translate(0, 4.5);
      fillHill(ctx, L.mid, x0, x1, H + 300);
      const body = ctx.createLinearGradient(0, L.mid(0) - 30, 0, H);
      body.addColorStop(0, EX.rgba(EX.mix(P.hillMid, P.hillMidRim, 0.18)));
      body.addColorStop(0.35, P.hillMid);
      body.addColorStop(1, EX.rgba(EX.mix(P.hillMid, P.fore, 0.55)));
      ctx.fillStyle = body;
      ctx.fill();
      ctx.restore();
      // the glow lights the ground on its side: a soft pink pool
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(L.glow[0] + 120, L.mid(0) + 70);
      ctx.scale(1, 0.35);
      halo(ctx, 0, 0, W * 0.55, P.glow[2], 0.16 + 0.02 * Math.sin(t * 0.8));
      ctx.restore();
      tufts(ctx, t, false);
      oak(ctx, t);
    });
  }

  // a lone round tree on the mid hill, back-lit by the glow: cel-shaded canopy, pink rim on the left
  function oak(ctx, t) {
    const [ox, k] = L.oak;
    const gy = L.mid(ox) + 6;
    const s = 1 + 0.012 * EX.noise1(t * 0.4, 61); // the canopy breathes in the wind
    const blobs = [[0, -118, 52], [-40, -96, 40], [38, -92, 42], [-18, -150, 38], [24, -140, 34], [-58, -70, 26], [56, -66, 28]];
    ctx.save();
    ctx.translate(ox, gy);
    ctx.scale(k, k);
    // trunk with a fork
    ctx.beginPath();
    ctx.moveTo(-7, 2);
    ctx.quadraticCurveTo(-5, -40, -14, -78);
    ctx.lineTo(-6, -80);
    ctx.quadraticCurveTo(0, -55, 6, -84);
    ctx.lineTo(13, -80);
    ctx.quadraticCurveTo(6, -40, 7, 2);
    ctx.closePath();
    ctx.fillStyle = EX.rgba(EX.mix(P.props, P.fore, 0.3));
    ctx.fill();
    ctx.fillStyle = EX.rgba(P.hillFarRidge, 0.55);
    ctx.fillRect(-7, -60, 2.2, 60); // rim on the trunk
    const canopy = (dx, dy, grow) => {
      ctx.beginPath();
      for (const [bx, by, r] of blobs) {
        const R = r * s + grow;
        ctx.moveTo(bx + dx + R, by + dy);
        ctx.arc(bx + dx, by + dy, R, 0, TAU);
      }
    };
    canopy(-4, -2, 0); // warm rim on the side facing the glow
    ctx.fillStyle = EX.rgba(EX.mix(P.hillFarRidge, P.ridge, 0.4));
    ctx.fill();
    canopy(0, 0, 0); // the lit fill (moonlight from the upper left)
    ctx.fillStyle = EX.rgba(EX.mix(P.hillMid, P.hillMidRim, 0.62));
    ctx.fill();
    ctx.save();
    ctx.clip();
    canopy(9, 11, 0); // one hard-edged cel shade away from the light
    ctx.fillStyle = EX.rgba(EX.mix(P.hillMid, P.hillMidRim, 0.2));
    ctx.fill();
    canopy(22, 26, -6); // the deep fold
    ctx.fillStyle = EX.rgba(EX.mix(P.hillMid, P.fore, 0.3), 0.6);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function fence(ctx) {
    const [x0, x1] = L.fence;
    const tops = [];
    for (let x = x0; x <= x1; x += 46) {
      const y = L.mid(x) + 4;
      tops.push([x, y - 26]);
      ctx.fillStyle = P.props;
      ctx.fillRect(x - 2.5, y - 26, 5, 30);
      ctx.fillStyle = EX.rgba(P.hillMidRim, 0.9);
      ctx.fillRect(x - 2.5, y - 26, 1.6, 30); // rim on the left side
    }
    ctx.strokeStyle = EX.rgba(P.props, 1);
    ctx.lineWidth = 1.8;
    for (const dy of [3, 13]) {
      ctx.beginPath();
      tops.forEach(([x, y], i) => {
        const yy = y + dy;
        if (i === 0) ctx.moveTo(x, yy);
        else ctx.quadraticCurveTo((x + tops[i - 1][0]) / 2, (yy + tops[i - 1][1] + dy) / 2 + 3.5, x, yy);
      });
      ctx.stroke();
    }
  }

  function nearHill(ctx, t, cam) {
    layer(ctx, cam, 1, () => {
      const x0 = -300;
      const x1 = W + 300;
      fillHill(ctx, L.near, x0, x1, H + 300);
      const rim = ctx.createLinearGradient(0, 0, W, 0);
      rim.addColorStop(0, EX.rgba(EX.mix(P.hillNearRim, P.ridge, 0.5)));
      rim.addColorStop(0.55, P.hillNearRim);
      rim.addColorStop(1, EX.rgba(P.hillNearRim, 0.7));
      ctx.fillStyle = rim;
      ctx.fill();
      ctx.save();
      ctx.translate(0, 5.5);
      fillHill(ctx, L.near, x0, x1, H + 300);
      const top = L.hero.y;
      const body = ctx.createLinearGradient(0, top - 20, 0, top + (WIDE ? 160 : 420));
      body.addColorStop(0, EX.rgba(EX.mix(P.hillNear, P.hillNearRim, 0.16)));
      body.addColorStop(1, P.fore);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.restore();
      // contact shadow under the hero
      const { x, y, h } = L.hero;
      ctx.save();
      ctx.translate(x, y + 3);
      ctx.scale(1, 0.18);
      const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 0.2);
      sg.addColorStop(0, "rgba(6,0,26,0.55)");
      sg.addColorStop(1, "rgba(6,0,26,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(-h * 0.2, -h * 0.2, h * 0.4, h * 0.4);
      ctx.restore();
      tufts(ctx, t, true);
      grass(ctx, t, L.near, 1);
      flowers(ctx, t);
    });
  }

  // small grass tufts scattered over a hill's body: bigger lower down (closer), swaying a little
  function tufts(ctx, t, near) {
    for (const tf of TUFTS) {
      if (tf.near !== near) continue;
      const top = (near ? L.near(tf.x) : L.mid(tf.x)) + 26;
      const bottom = near ? H + 10 : Math.min(H + 10, L.near(tf.x) - 6);
      if (bottom - top < 30) continue;
      const y = lerp(top, bottom, Math.pow(tf.u, 1.25));
      const k = clamp((y - top) / Math.max(1, H - top));
      const hh = (near ? 9 : 6) + (near ? 15 : 9) * k;
      const sway = 1.6 * Math.sin(t * 1.1 + tf.ph);
      const base = near ? P.hillNear : P.hillMid;
      for (let i = 0; i < tf.n; i++) {
        const bx = tf.x + (i - (tf.n - 1) / 2) * hh * 0.28;
        const tip = bx + (tf.lean + (i - 0.5) * 0.5) * hh * 0.5 + sway * (hh / 16);
        ctx.beginPath();
        ctx.moveTo(bx - hh * 0.12, y);
        ctx.quadraticCurveTo(bx, y - hh * 0.55, tip, y - hh);
        ctx.quadraticCurveTo(bx + hh * 0.04, y - hh * 0.5, bx + hh * 0.12, y);
        ctx.closePath();
        ctx.fillStyle = EX.rgba(EX.mix(base, P.hillNearRim, i % 2 ? 0.42 : 0.24));
        ctx.fill();
      }
    }
  }

  function grass(ctx, t, fy, k) {
    for (const b of BLADES) {
      const gy = fy(b.x) + 3;
      if (gy > H + 40) continue;
      const sway = 3.2 * EX.noise1(t * 0.55 + b.ph, 5) + 1.5 * Math.sin(t * 1.3 + b.ph);
      for (let i = 0; i < b.n; i++) {
        const bx = b.x + (i - (b.n - 1) / 2) * 3.2;
        const hh = b.h * k * (0.75 + 0.25 * Math.sin(i * 2.1 + b.ph));
        const tipX = bx + (b.lean + (i - 1) * 0.35) * hh * 0.6 + sway * (hh / 20);
        ctx.beginPath();
        ctx.moveTo(bx - 2, gy);
        ctx.quadraticCurveTo(bx, gy - hh * 0.55, tipX, gy - hh);
        ctx.quadraticCurveTo(bx + 0.6, gy - hh * 0.5, bx + 2, gy);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? P.hillNearRim : EX.rgba(EX.mix(P.hillNearRim, P.hillNear, 0.45));
        ctx.fill();
      }
    }
  }

  function flowers(ctx, t) {
    for (const f of FLOWERS) {
      const gy = L.near(f.x) + 2;
      const sway = 2.5 * Math.sin(t * 1.1 + f.ph);
      const tx = f.x + sway;
      const ty = gy - f.h;
      ctx.strokeStyle = EX.rgba(P.hillNearRim, 0.9);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(f.x, gy);
      ctx.quadraticCurveTo(f.x + sway * 0.2, gy - f.h * 0.5, tx, ty);
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      halo(ctx, tx, ty, 16, f.color, 0.35 + 0.1 * Math.sin(t * 2 + f.ph));
      ctx.restore();
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(tx, ty, 3.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(tx - 0.9, ty - 0.9, 1.1, 0, TAU);
      ctx.fill();
    }
  }

  function fireflies(ctx, t, cam, front) {
    layer(ctx, cam, front ? 1.1 : 0.75, () => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      FLIES.forEach((f, i) => {
        if (f.front !== front) return;
        const x = f.x + 46 * EX.noise1(t * 0.16 * f.f + i * 3.1, 31);
        const y = f.y + 30 * EX.noise1(t * 0.14 * f.f + i * 1.7, 37) - 6 * t;
        const a = 0.25 + 0.75 * Math.pow(Math.max(0, Math.sin(t * 2.1 * f.f + f.ph)), 2);
        halo(ctx, x, y, f.r * 12, f.color, 0.55 * a);
        ctx.fillStyle = EX.rgba("#ffffff", 0.9 * a);
        ctx.beginPath();
        ctx.arc(x, y, f.r * 0.8, 0, TAU);
        ctx.fill();
      });
      ctx.restore();
    });
  }

  function foreground(ctx, t, cam) {
    layer(ctx, cam, 1.25, () => {
      L.banks.forEach(([x0, x1, fy], bi) => {
        ctx.beginPath();
        ctx.moveTo(x0, H + 200);
        for (let x = x0; x <= x1; x += 6) ctx.lineTo(x, fy(x));
        ctx.lineTo(x1, fy(x1));
        ctx.lineTo(x1, H + 200);
        ctx.closePath();
        ctx.fillStyle = EX.rgba(EX.mix(P.fore, P.hillNearRim, 0.4));
        ctx.fill();
        ctx.save();
        ctx.translate(0, 4);
        ctx.fillStyle = P.fore;
        ctx.fill();
        ctx.restore();
        // tall dark grass blades against the hills, swaying
        for (let i = 0; i < 16; i++) {
          const x = lerp(x0 + 40, x1 - 40, EX.hash(i, 3 + bi * 7));
          const gy = fy(x) + 4;
          if (gy > H + 20) continue;
          const hh = 34 + 44 * EX.hash(i, 4 + bi * 7);
          const sway = 4 * EX.noise1(t * 0.5 + i, 12 + bi);
          const tip = x + (EX.hash(i, 5 + bi * 7) - 0.5) * 30 + sway;
          ctx.beginPath();
          ctx.moveTo(x - 3.5, gy);
          ctx.quadraticCurveTo(x, gy - hh * 0.6, tip, gy - hh);
          ctx.quadraticCurveTo(x + 1, gy - hh * 0.5, x + 3.5, gy);
          ctx.closePath();
          ctx.fillStyle = i % 3 ? P.fore : EX.rgba(EX.mix(P.fore, P.hillNearRim, 0.3));
          ctx.fill();
        }
      });
    });
  }

  // ---------- the hero and the labels ----------
  function heroOpts(t, cam) {
    const [x, y] = onScreen(cam, L.hero.x, L.hero.y);
    // looks at the moon, then at the pill, then at the callout, then up at the title
    const lookAt = (a, b, t0) => [lerp(a[0], b[0], S(t0, t0 + 0.35, t)), lerp(a[1], b[1], S(t0, t0 + 0.35, t))];
    let look = [-0.45, -0.35];
    look = lookAt(look, [0.85, -0.15], T.pill - 0.05);
    look = lookAt(look, [-0.75, 0.3], T.callout - 0.1);
    look = lookAt(look, [0, -0.7], T.title - 0.1);
    return {
      t,
      x,
      y,
      h: L.hero.h * cam.zoom,
      view: "front",
      rimSide: -1,
      look,
      headUp: 0.12 * S(0, 0.6, t) * (1 - S(T.pill - 0.1, T.pill + 0.3, t)) + 0.22 * S(T.title - 0.1, T.title + 0.4, t),
      headTurn: 0.15 * S(T.pill, T.pill + 0.4, t) * (1 - S(T.callout - 0.1, T.callout + 0.3, t)) - 0.12 * S(T.callout - 0.1, T.callout + 0.3, t) * (1 - S(T.title - 0.1, T.title + 0.3, t)),
      mouth: 0.3 + 0.45 * S(T.title, T.title + 0.5, t),
      wind: 0.6,
    };
  }

  function labels(ctx, t, A) {
    const U = EX.U;
    // the pill beside the head
    ui.pill(ctx, {
      text: "ALL SET",
      x: A.head[0] + A.headR * 1.75,
      y: A.head[1] - A.headR * 0.35,
      origin: "left",
      color: "magenta",
      t0: T.pill,
      now: t,
      out: T.labelsOut,
    });
    // the callout from the hand (screen-left) up and out to a pill
    const hand = A.handL;
    ui.callout(ctx, {
      from: hand,
      to: [hand[0] - (WIDE ? 190 : 150) * U, hand[1] - (WIDE ? 135 : 150) * U],
      text: "60 FPS",
      color: "cyan",
      t0: T.callout,
      now: t,
      out: T.labelsOut,
    });
  }

  // ---------- draw ----------
  function draw(ctx, t) {
    const cam = camAt(t);
    sky(ctx, t, cam);
    clouds(ctx, t, cam);
    horizonGlow(ctx, t, cam);
    farHill(ctx, t, cam);
    midHill(ctx, t, cam);
    fireflies(ctx, t, cam, false);
    nearHill(ctx, t, cam);
    const hero = heroOpts(t, cam);
    HOUSE.hero.draw(ctx, hero);
    fireflies(ctx, t, cam, true);
    foreground(ctx, t, cam);
    labels(ctx, t, HOUSE.hero.anchors(hero));
    ui.title(ctx, { lines: [["YOUR", "FIRST"], ["EXPLAINER"]], t0: T.title, now: t, y: L.titleY }); // y undefined = the house default
    // fade to black over the last 0.6 s
    const end = S(T.fade, DUR, t);
    if (end > 0) {
      ctx.fillStyle = `rgba(4,1,18,${end})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  EX.run({
    id: "main",
    duration: DUR,
    fonts: ['600 38px "Figtree"', '700 120px "Figtree"'],
    build: async () => {
      await HOUSE.hero.init();
      await HOUSE.ui.init();
      await init();
    },
    draw,
  });
})();

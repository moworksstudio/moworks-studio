/* EX engine — finishing & event effects: vignette, film grain, flash, shockwave ring,
 * speed streaks, light flood. All pure functions of time.
 */
(function () {
  const EX = window.EX;
  const { clamp, ease } = EX;
  EX.fx = {};
  const F = EX.fx;

  let grainTiles = [];
  let vignetteCanvas = null;

  /** Build cached assets (grain tiles, vignette). Call once in build(). */
  F.init = () => {
    const N = 12;
    const S = 384;
    grainTiles = [];
    for (let k = 0; k < N; k++) {
      const c = document.createElement("canvas");
      c.width = c.height = S;
      const g = c.getContext("2d");
      const img = g.createImageData(S, S);
      const r = EX.rng(9001 + k * 77);
      for (let i = 0; i < S * S; i++) {
        const v = (r() * 255) | 0;
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grainTiles.push(c);
    }
    vignetteCanvas = document.createElement("canvas");
    vignetteCanvas.width = EX.W;
    vignetteCanvas.height = EX.H;
    const v = vignetteCanvas.getContext("2d");
    const grad = v.createRadialGradient(EX.W / 2, EX.H / 2, Math.min(EX.W, EX.H) * 0.38, EX.W / 2, EX.H / 2, Math.max(EX.W, EX.H) * 0.62);
    grad.addColorStop(0, "rgba(4,4,20,0)");
    grad.addColorStop(1, "rgba(4,4,20,0.45)");
    v.fillStyle = grad;
    v.fillRect(0, 0, EX.W, EX.H);
  };

  F.vignette = (ctx, strength = 1) => {
    if (!vignetteCanvas) return;
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.drawImage(vignetteCanvas, 0, 0);
    ctx.restore();
  };

  /** Film grain re-randomized `fps` times per second from seeded tiles. amount 0.06 = 6%. */
  F.grain = (ctx, tAmb, amount = 0.06, fps = 24) => {
    if (!grainTiles.length) return;
    const k = Math.floor(tAmb * fps);
    const tile = grainTiles[k % grainTiles.length];
    const ox = Math.floor(EX.hash(k, 1) * 384);
    const oy = Math.floor(EX.hash(k, 2) * 384);
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = amount * 1.6;
    const pat = ctx.createPattern(tile, "repeat");
    ctx.translate(-ox, -oy);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, EX.W + 384, EX.H + 384);
    ctx.restore();
  };

  /** White (or tinted) flash: dt seconds since trigger, quick in, exp out. */
  F.flash = (ctx, dt, strength = 0.85, color = "255,255,255", decay = 5) => {
    if (dt < 0 || dt > 1.5) return;
    const a = strength * (dt < 0.04 ? dt / 0.04 : Math.exp(-decay * (dt - 0.04)));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(${color},${a})`;
    ctx.fillRect(0, 0, EX.W, EX.H);
    ctx.restore();
  };

  /** Expanding shockwave ring at screen (x, y). */
  F.ring = (ctx, x, y, dt, o = {}) => {
    const dur = o.dur || 1.1;
    if (dt < 0 || dt > dur) return;
    const p = ease.outCubic(dt / dur);
    const r = (o.r0 || 40) + ((o.r1 || 900) - (o.r0 || 40)) * p;
    const a = (1 - p) * (o.alpha || 0.7);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(${o.color || "255,255,255"},${a})`;
    ctx.lineWidth = (o.width || 18) * (1 - p * 0.7);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, EX.TAU);
    ctx.stroke();
    ctx.lineWidth *= 3;
    ctx.strokeStyle = `rgba(${o.color || "255,255,255"},${a * 0.25})`;
    ctx.stroke();
    ctx.restore();
  };

  /** Horizontal/directional speed streaks across the frame. dir = [dx, dy] unit; k = intensity 0..1. */
  F.streaks = (ctx, tAmb, k, dir = [1, 0], o = {}) => {
    if (k <= 0.001) return;
    const n = o.count || 46;
    const ang = Math.atan2(dir[1], dir[0]);
    ctx.save();
    ctx.translate(EX.W / 2, EX.H / 2);
    ctx.rotate(ang);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const y = (EX.hash(i, 3) - 0.5) * EX.H * 1.4;
      const len = 120 + EX.hash(i, 4) * 420;
      const speed = 2600 + EX.hash(i, 5) * 2600;
      const span = EX.W * 1.6 + len;
      const x = ((((EX.hash(i, 6) * span + tAmb * speed) % span) + span) % span) - span / 2;
      ctx.strokeStyle = `rgba(${o.color || "200,235,255"},${(0.06 + EX.hash(i, 7) * 0.12) * k})`;
      ctx.lineWidth = 1.5 + EX.hash(i, 8) * 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - len, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  /** Warm light flood from a screen point: a big light source switching on or coming into view. */
  F.lightFlood = (ctx, x, y, r, a, color = "255,190,110") => {
    if (a <= 0.001) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${a})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, EX.W, EX.H);
    ctx.restore();
  };
})();

/* EX engine — core: time, easing, springs, seeded randomness, camera, stage.
 * Every frame is a pure function of time. No Date.now, no Math.random, no rAF.
 * Classic script; attaches everything to window.EX. Load it after the #root element.
 *
 * Size: the film's size lives in one place, index.html's root
 *   <div id="root" data-width="1920" data-height="1080" data-fps="60" …>.
 * At load this file reads it into EX.W / EX.H / EX.FPS (fallback 1920×1080 at 60 fps) and sets
 * EX.U = min(W, H) / 1080, the type and UI unit: 1 in 16:9 (1920×1080) and in 9:16 (1080×1920).
 * Multiply every UI size (px) by EX.U so labels keep their size in either format.
 */
(function () {
  const EX = (window.EX = window.EX || {});
  const root = typeof document !== "undefined" ? document.getElementById("root") : null;
  const attr = (name) => (root && root.dataset ? Number(root.dataset[name]) : NaN);
  EX.W = attr("width") > 0 ? attr("width") : 1920;
  EX.H = attr("height") > 0 ? attr("height") : 1080;
  EX.FPS = attr("fps") > 0 ? attr("fps") : 60;
  EX.U = Math.min(EX.W, EX.H) / 1080;

  // ---------- math ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const invLerp = (a, b, x) => clamp((x - a) / (b - a));
  EX.clamp = clamp;
  EX.lerp = lerp;
  EX.invLerp = invLerp;
  EX.TAU = Math.PI * 2;

  EX.ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    inOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
    inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outBack: (t) => {
      const s = 1.70158;
      return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
    },
  };

  /** Eased progress of t through the window [t0, t0 + dur]. */
  EX.prog = (t, t0, dur, ease = EX.ease.linear) => ease(clamp((t - t0) / dur));

  /** Damped-spring step response 0 → 1 (overshoots). dt = seconds since trigger.
   *  damping = zeta (0.42–0.5 for pops), freq = natural angular frequency (12–16). */
  EX.spring = (dt, damping = 0.45, freq = 14) => {
    if (dt <= 0) return 0;
    const z = damping;
    const w = freq;
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * dt) * (Math.cos(wd * dt) + ((z * w) / wd) * Math.sin(wd * dt));
  };
  EX.springTo = (dt, a, b, damping, freq) => a + (b - a) * EX.spring(dt, damping, freq);

  /** Decaying wobble 0 → ±1 → 0, for squash & stretch / jolts. */
  EX.wobble = (dt, damping = 0.42, freq = 16) => {
    if (dt <= 0) return 0;
    const z = damping;
    const wd = freq * Math.sqrt(1 - z * z);
    return Math.exp(-z * freq * dt) * Math.sin(wd * dt);
  };
  /** Area-preserving squash & stretch: returns [sx, sy]. amount ~0.15–0.3. */
  EX.squash = (dt, amount = 0.22, damping = 0.42, freq = 16) => {
    const k = 1 + amount * EX.wobble(dt, damping, freq);
    return [1 / Math.sqrt(k), Math.sqrt(k)];
  };

  // ---------- seeded randomness ----------
  /** mulberry32 PRNG: EX.rng(seed)() → [0,1). */
  EX.rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  /** Stateless integer hash → [0,1). */
  EX.hash = (i, j = 0, k = 0) => {
    let h = (i | 0) * 374761393 + (j | 0) * 668265263 + (k | 0) * 2147483647;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  /** Smooth 1D value noise in [-1, 1]. */
  EX.noise1 = (x, seed = 0) => {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    const a = EX.hash(i, seed) * 2 - 1;
    const b = EX.hash(i + 1, seed) * 2 - 1;
    return a + (b - a) * u;
  };

  // ---------- color ----------
  EX.hex = (h) => {
    const n = parseInt(h.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  EX.rgba = (h, a = 1) => {
    const [r, g, b] = Array.isArray(h) ? h : EX.hex(h);
    return `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  };
  EX.mix = (h1, h2, t) => {
    const a = Array.isArray(h1) ? h1 : EX.hex(h1);
    const b = Array.isArray(h2) ? h2 : EX.hex(h2);
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  };

  // ---------- camera ----------
  /**
   * Camera = { x, y, zoom } where zoom is screen px per world unit.
   * EX.cameraAt(t, start, moves) applies moves in order:
   *   move = { t0, t1, x?, y?, zoom?, ease? }  (ease defaults to inOutCubic)
   * Zoom interpolates in log space so pull-backs feel linear to the eye.
   * opts.drift adds a slow seeded float; opts.creep is zoom creep per second (0.0025 = 0.25%/s).
   */
  EX.cameraAt = (t, start, moves, opts = {}) => {
    const cam = { x: start.x, y: start.y, zoom: start.zoom };
    for (const m of moves) {
      if (t <= m.t0) break;
      const p = (m.ease || EX.ease.inOutCubic)(clamp((t - m.t0) / (m.t1 - m.t0)));
      const fx = cam.x;
      const fy = cam.y;
      const fz = cam.zoom;
      if (m.x !== undefined) cam.x = lerp(fx, m.x, p);
      if (m.y !== undefined) cam.y = lerp(fy, m.y, p);
      if (m.zoom !== undefined) cam.zoom = Math.exp(lerp(Math.log(fz), Math.log(m.zoom), p));
    }
    const drift = opts.drift === undefined ? 1 : opts.drift;
    if (drift) {
      // drift in screen px, converted to world units so it reads the same at any zoom
      cam.x += (EX.noise1(t * 0.23, 11) * 6 * drift) / cam.zoom;
      cam.y += (EX.noise1(t * 0.19, 12) * 4 * drift) / cam.zoom;
    }
    cam.zoom *= 1 + (opts.creep === undefined ? 0.0025 : opts.creep) * t;
    return cam;
  };

  /** Camera shake in screen px: decaying noise after each trigger time. */
  EX.shake = (t, triggers, amp = 14, decay = 7) => {
    let sx = 0;
    let sy = 0;
    for (const t0 of triggers) {
      const dt = t - t0;
      if (dt < 0 || dt > 1.2) continue;
      const k = amp * Math.exp(-decay * dt);
      sx += EX.noise1(dt * 38, 21 + t0 * 7) * k;
      sy += EX.noise1(dt * 41, 37 + t0 * 7) * k;
    }
    return [sx, sy];
  };

  /** World → screen. cam may carry sx/sy shake offsets (px). */
  EX.toScreen = (cam, wx, wy) => [
    EX.W / 2 + (wx - cam.x) * cam.zoom + (cam.sx || 0),
    EX.H / 2 + (wy - cam.y) * cam.zoom + (cam.sy || 0),
  ];

  // ---------- clocks ----------
  /**
   * Story clock: maps composition time to story time through segments, so a
   * rewind can play the story backwards while ambient time keeps running.
   * segs = [{ t0, t1, s0, s1, ease? }] — outside segments story time = t + offset of last seg.
   */
  EX.storyTime = (t, segs = []) => {
    let offset = 0;
    for (const s of segs) {
      if (t < s.t0) break;
      if (t <= s.t1) {
        const p = (s.ease || EX.ease.inOutCubic)((t - s.t0) / (s.t1 - s.t0));
        return lerp(s.s0, s.s1, p);
      }
      offset = s.s1 - s.t1;
    }
    return t + offset;
  };

  /** Integrated spin: angle = ∫ω dt with constant-deceleration brakes (never jumps).
   *  phases = [{ t, w }] ordered; between phase changes ω ramps linearly over `ramp` s. */
  EX.integrateSpin = (t, w0, changes = []) => {
    // piecewise-linear ω(t); integrate analytically
    let angle = 0;
    let tPrev = 0;
    let w = w0;
    for (const c of changes) {
      const ramp = c.ramp || 0.18;
      const tA = c.t;
      const tB = c.t + ramp;
      if (t <= tA) break;
      angle += w * (tA - tPrev);
      const tt = Math.min(t, tB);
      const T = tt - tA;
      angle += w * T + ((c.w - w) * T * T) / (2 * ramp);
      if (t <= tB) return angle;
      w = c.w;
      tPrev = tB;
    }
    return angle + w * (t - tPrev);
  };

  // ---------- word cues ----------
  /** Load word timings: [{ word, start, end }] (story/words.js sets window.STORY_WORDS).
   *  EX.cue("needle") → start of the first "needle"; EX.cue("in", 2) → start of the 2nd "in";
   *  EX.cue("arm", 1, "end") → its end. Matching ignores case and punctuation. A missing word
   *  returns 0 and logs "[EX] missing cue", so the event would fire at the start of the film. */
  EX.setWords = (words) => {
    EX._words = words.map((w) => ({ ...w, key: w.word.toLowerCase().replace(/[^a-z0-9']/g, "") }));
  };
  EX.cue = (word, n = 1, which = "start") => {
    const key = word.toLowerCase().replace(/[^a-z0-9']/g, "");
    let seen = 0;
    for (const w of EX._words || []) {
      if (w.key === key && ++seen === n) return w[which];
    }
    console.warn("[EX] missing cue", word, n);
    return 0;
  };

  // ---------- stage ----------
  /**
   * EX.run({ id, duration, draw(ctx, t), build?: async () => void, fonts?: [css font strings] })
   * Wires a paused GSAP timeline whose proxy drives draw(t); registers it once the async build
   * (fonts, textures) resolves; exposes window.seek(t) for debugging.
   */
  EX.run = ({ id = "main", duration, draw, build, fonts = [] }) => {
    const canvas = document.getElementById("ex-stage");
    canvas.width = EX.W;
    canvas.height = EX.H;
    const ctx = canvas.getContext("2d");
    EX.ctx = ctx;
    const proxy = { t: 0 };
    const render = (t) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      draw(ctx, t);
    };
    window.seek = render;
    window.__hf = window.__hf || {};
    window.__hf.buildReady = window.__hf.buildReady || {};
    window.__hf.buildReady["ex-" + id] = (async () => {
      await Promise.all(fonts.map((f) => document.fonts.load(f)));
      if (build) await build();
      const tl = gsap.timeline({ paused: true });
      tl.to(proxy, { t: duration, duration, ease: "none", onUpdate: () => render(proxy.t) }, 0);
      render(0);
      window.__timelines[id] = tl;
      if (window.__hfForceTimelineRebind) window.__hfForceTimelineRebind();
    })();
  };
})();

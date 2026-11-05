/* story.js: the film. Every frame is draw(ctx, t), a pure function of the time t in seconds.
 * It follows STORYBOARD.md: one entry in C per row of its "Event cues" table, one function per shot.
 *
 *   1. size and length   read from index.html's root (EX.W, EX.H, DUR); never typed here
 *   2. cue table C       when each word is spoken (EX.cue on story/words.js)
 *   3. cuts and shots    a hard cut lands 0.05 s before its word; the title ~0.6 s after the last word
 *   4. layout table L    every position, once for 16:9 and once for 9:16 (WIDE picks one)
 *   5. shot functions    a background (art module), the hero, labels through HOUSE.ui
 *   6. draw(ctx, t)      picks the shot, then fades the last 0.6 s to black
 *   7. EX.run            waits for the fonts and every module's init(), then registers the timeline
 *
 * Rules: no Math.random / Date.now / timers / state between frames (frames render out of order);
 * no text except through HOUSE.ui; a label never starts in the last 0.3 s of a shot, and fire a
 * label's `out` at least 0.21 s before the next cut.
 */
(function () {
  const { ease: E, clamp, lerp } = EX;
  const S = HOUSE.smooth; // S(a, b, t): 0 before a, 1 after b, smooth in between
  const P = HOUSE.pal;
  const ui = HOUSE.ui;

  // ---------- 1. size and length (tools/set-duration.mjs changes the length) ----------
  const DUR = Number(document.getElementById("root").dataset.duration);
  const WIDE = EX.W > EX.H; // 16:9 → true, 9:16 → false

  // ---------- 2. cue table ----------
  const WORDS = window.STORY_WORDS || [];
  EX.setWords(WORDS);
  const VOICE = WORDS.length > 0;
  // q(word, n, edge, fallback): the time the n-th `word` starts (edge "end": ends). Matching ignores
  // case and punctuation. Before the voice is timed (no words yet) it returns `fallback`, so the
  // picture can be built and snapshotted first. A word that isn't in the script returns 0 and logs
  // "[EX] missing cue": check the console when a label fires at the very start.
  const q = (word, n = 1, edge = "start", fallback = 0) => (VOICE ? EX.cue(word, n, edge) : fallback);
  const FIRST = VOICE ? WORDS[0].start : 0.9; // the first word (the voice starts after a short lead-in)
  const LAST = VOICE ? WORDS[WORDS.length - 1].end : Math.max(FIRST, DUR - 5.4); // the last word ends
  const C = {
    // One line per event, named after what happens, e.g.:
    //   needle: q("needle", 1, "start", 1.0),
    //   in1: q("in", 1, "start", 3.2),
    //   hours: q("hours", 1, "start", 23.1),
    first: FIRST,
    last: LAST,
  };

  // ---------- 3. cuts and shots ----------
  const CUT = {
    // a hard cut lands 0.05 s before its word, e.g.  arm: C.in1 - 0.05,
    title: LAST + 0.6, // the title shot starts about 0.6 s after the last word
  };
  const SHOTS = [
    [0, "open"],
    // [CUT.arm, "arm"],
    [CUT.title, "title"],
  ];
  const shotAt = (t) => {
    let s = SHOTS[0];
    for (const x of SHOTS) if (t >= x[0]) s = x;
    return s;
  };
  window.STORY_CUES = { ...C, CUT }; // handy in the browser console

  // ---------- 4. layout table (16:9 and 9:16) ----------
  // 9:16 keeps text inside ui.safe(): x 60–960 and y 250–1450; rows of labels become columns.
  const L = WIDE
    ? { hero: { x: 1300, y: 1000, h: 520 }, horizon: 760, glow: [-120, 760] }
    : { hero: { x: 540, y: 1500, h: 760 }, horizon: 1230, glow: [-160, 1230] };

  // ---------- helpers ----------
  const ramp = (a, b, t) => clamp((t - a) / (b - a));
  const ioc = (x) => E.inOutCubic(clamp(x));
  const ooc = (x) => E.outCubic(clamp(x)); // eased progress for things that arrive
  // per-shot camera: a slow push between zoom0 and zoom1 (1.00–1.06) with a little seeded sway.
  // Art modules take this `cam` ({ zoom about the frame centre, x / y pan in px }).
  const drift = (t, t0, t1, zoom0, zoom1, seed) => ({
    zoom: lerp(zoom0, zoom1, ioc(ramp(t0, t1, t))),
    x: 10 * EX.noise1(t * 0.12, seed),
    y: 7 * EX.noise1(t * 0.1, seed + 3),
  });
  // a point drawn inside camera `cam` → where it lands on screen (labels are drawn on screen)
  const onScreen = (cam, p) => [EX.W / 2 + (p[0] - EX.W / 2) * cam.zoom + cam.x, EX.H / 2 + (p[1] - EX.H / 2) * cam.zoom + cam.y];
  // the hero drawn inside a camera: same feet, scaled by the zoom
  const heroIn = (cam, o) => {
    const [x, y] = onScreen(cam, [o.x, o.y]);
    return { ...o, x, y, h: o.h * cam.zoom };
  };
  // the page title in capitals, as two balanced lines (or write the lines out by hand)
  const twoLines = (text) => {
    const w = text.toUpperCase().split(/\s+/).filter(Boolean);
    if (w.length < 3) return [w];
    let best = 1;
    let score = Infinity;
    for (let i = 1; i < w.length; i++) {
      const d = Math.abs(w.slice(0, i).join(" ").length - w.slice(i).join(" ").length);
      if (d < score) [best, score] = [i, d];
    }
    return [w.slice(0, best), w.slice(best)];
  };
  const TITLE = twoLines(document.title);

  // A placeholder background: the night sky and a one-sided horizon glow from HOUSE.pal.
  // Replace it with your art modules (e.g. HOUSE.clinic.back(ctx, { t, cam })).
  function backdrop(ctx, t, cam) {
    const sky = ctx.createLinearGradient(0, 0, 0, EX.H);
    P.sky.forEach((c, i) => sky.addColorStop(i / (P.sky.length - 1), c));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, EX.W, EX.H);
    const [gx, gy] = onScreen(cam, L.glow);
    const r = Math.max(EX.W, EX.H) * 0.75 * cam.zoom;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    const glow = P.glow.slice().reverse(); // hot core → outer
    const breathe = 0.92 + 0.08 * Math.sin(t * 0.8);
    glow.forEach((c, i) => g.addColorStop((i / glow.length) * 0.9, EX.rgba(c, 0.6 * (1 - i / glow.length) * breathe)));
    g.addColorStop(1, EX.rgba(P.glow[0], 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, EX.W, EX.H);
    const [, hy] = onScreen(cam, [0, L.horizon]);
    ctx.fillStyle = P.hillNear;
    ctx.fillRect(0, hy, EX.W, EX.H - hy);
    ctx.fillStyle = P.hillNearRim;
    ctx.fillRect(0, hy, EX.W, 3 * EX.U * cam.zoom);
  }

  // ---------- 5. shots ----------
  // Open: the hero, front view, on the night backdrop. Labels key to cues, e.g.
  //   ui.pill(ctx, { text: "10 drops", x, y, color: "cyan", t0: C.drops + 0.3, now: t, out: CUT.arm - 0.22 });
  //   ui.callout(ctx, { from: A.handR, to: [A.handR[0] + 200 * EX.U, A.handR[1] - 140 * EX.U], text: "0.5 mL",
  //                     color: "cyan", t0: C.ten + 0.1, now: t, out: CUT.arm - 0.22 });
  function shotOpen(ctx, t) {
    const cam = drift(t, 0, CUT.title, 1.0, 1.04, 11);
    backdrop(ctx, t, cam);
    const hero = heroIn(cam, { t, ...L.hero, view: "front", rimSide: -1, look: [0.2, 0], worry: 0.2 });
    HOUSE.hero.draw(ctx, hero);
    // const A = HOUSE.hero.anchors(hero);   head, eye, handL, handR … in screen px: place labels from these
  }

  // Title: the hero relaxed; the title pops word by word (0.2 s apart) from CUT.title + 0.15.
  function shotTitle(ctx, t) {
    const cam = drift(t, CUT.title, DUR, 1.0, 1.03, 97);
    backdrop(ctx, t, cam);
    HOUSE.hero.draw(ctx, heroIn(cam, { t, ...L.hero, view: "front", rimSide: -1, mouth: 0.7, look: [0, -0.2] }));
    ui.title(ctx, { lines: TITLE, t0: CUT.title + 0.15, now: t });
  }

  const DRAW = { open: shotOpen, title: shotTitle };

  // ---------- 6. draw ----------
  function draw(ctx, t) {
    const [, name] = shotAt(t);
    DRAW[name](ctx, t);
    // fade to black over the last 0.6 s
    const end = S(DUR - 0.6, DUR, t);
    if (end > 0) {
      ctx.fillStyle = `rgba(4,1,18,${end})`;
      ctx.fillRect(0, 0, EX.W, EX.H);
    }
  }

  // ---------- 7. run ----------
  EX.run({
    id: "main",
    duration: DUR,
    fonts: ['600 38px "Figtree"', '700 120px "Figtree"'],
    build: async () => {
      await HOUSE.hero.init();
      await HOUSE.ui.init();
      // await HOUSE.clinic.init();   one line per art module
    },
    draw,
  });
})();

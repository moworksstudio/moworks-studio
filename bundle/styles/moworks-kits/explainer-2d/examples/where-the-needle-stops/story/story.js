/* "Where the Needle Stops": how injections work. 60 fps; every frame is draw(ctx, t).
 * Shots follow STORYBOARD.md. Every cut and event is keyed to a narration word with EX.cue
 * (story/words.js), the same cues the sound uses ("Event cues" table), so a new voice take
 * re-times the whole film. The film length comes from index.html's root (data-duration); the
 * title starts 0.6 s after the last word.
 * Modules: HOUSE.clinic (room, syringe, arm close-up, drops), HOUSE.hero (red hoodie), HOUSE.body
 * (x-ray figure, stomach), HOUSE.tissue (cross-section, fat, muscle, vein), HOUSE.ui (pills,
 * callouts, title).
 */
(function () {
  const { ease: E, clamp, lerp } = EX;
  const DUR = Number(document.getElementById("root").dataset.duration) || 40;
  const S = HOUSE.smooth;

  const WORDS = window.STORY_WORDS;
  EX.setWords(WORDS);
  const LAST = WORDS[WORDS.length - 1].end; // end of the last spoken word
  const q = (w, n, e) => EX.cue(w, n, e);
  const C = {
    needle1: q("needle"), arm: q("arm"), in1: q("in", 1), second: q("second"), push: q("push"),
    ten: q("ten"), drops: q("drops"), skin1: q("skin"), you1: q("you"), swallow: q("swallow"),
    because: q("because"), stomach: q("stomach"), digest: q("digest"), medicines: q("medicines"),
    insulin: q("insulin"), same: q("same"), digests: q("digests"), lunch: q("lunch"),
    so: q("so"), take: q("take"), shortcut: q("shortcut"), where: q("where"), needle2: q("needle", 2),
    stops: q("stops"), decides: q("decides"), fast: q("fast"),
    in2: q("in", 2), seeps: q("seeps"), hours: q("hours"),
    in3: q("in", 3), packed: q("packed"), minutes: q("minutes"),
    and2: q("and", 2), vein: q("vein"), seconds: q("seconds"),
    then: q("then"), heart: q("heart"), pumps: q("pumps"), body: q("body"), minute: q("minute"),
    from: q("from"), sting: q("sting"),
  };
  // cuts (a cut lands just before its word)
  const CUT = {
    arm: C.in1 - 0.05,
    xray: C.you1 - 0.05,
    stomach: C.stomach - 0.05,
    shortcut: C.so - 0.05,
    section: C.where - 0.05,
    fat: C.in2 - 0.05,
    muscle: C.in3 - 0.05,
    vein: C.and2 - 0.05,
    circ: C.then - 0.05,
    plaster: C.from - 0.05,
    title: Math.round((LAST + 0.6) * 1000) / 1000, // 0.6 s after the last word
  };
  window.STORY_CUES = { ...C, CUT };

  const SHOTS = [
    [0, "clinic"], [CUT.arm, "arm"], [CUT.xray, "swallow"], [CUT.stomach, "stomach"],
    [CUT.shortcut, "shortcut"], [CUT.section, "section"], [CUT.fat, "fat"], [CUT.muscle, "muscle"],
    [CUT.vein, "vein"], [CUT.circ, "circ"], [CUT.plaster, "plaster"], [CUT.title, "title"],
  ];
  const shotAt = (t) => {
    let s = SHOTS[0];
    for (const x of SHOTS) if (t >= x[0]) s = x;
    return s;
  };

  // ---------- helpers ----------
  const P = HOUSE.pal;
  const pulse = (t, t0, up, hold, down) => {
    if (t < t0) return 0;
    const a = t - t0;
    if (a < up) return a / up;
    if (a < up + hold) return 1;
    return clamp(1 - (a - up - hold) / down);
  };
  const ramp = (a, b, t) => clamp((t - a) / (b - a));
  const ioc = (x) => E.inOutCubic(clamp(x));
  const ooc = (x) => E.outCubic(clamp(x));
  // camera drift for full-frame diagram scenes: slow push plus a little noise sway
  const drift = (t, t0, zoom0, zoom1, t1, seed) => ({
    zoom: lerp(zoom0, zoom1, ioc(ramp(t0, t1, t))),
    x: 10 * EX.noise1(t * 0.12, seed),
    y: 7 * EX.noise1(t * 0.1, seed + 3),
  });
  const HERO = { wet: 0, wind: 0.15 };

  /** The comparison row that builds over the fat, muscle and vein shots and stays until the cut. */
  function speedRow(ctx, t, current) {
    const out = CUT.circ - 0.22;
    const row = [
      ["fat · hours", P.pill.orange, C.hours],
      ["muscle · minutes", P.pill.crimson, C.minutes],
      ["vein · seconds", "violet", C.seconds],
    ];
    row.forEach(([text, color, t0], i) => {
      const alpha = i === current ? 1 : 0.62;
      HOUSE.ui.pill(ctx, { text, x: 520 + 440 * i, y: 976, color, t0, now: t, out, alpha, size: 1.05 });
    });
  }

  // ---------- shots ----------
  // 1. Clinic, medium: the hero, worried, as a gloved hand brings the syringe in.
  function shotClinic(ctx, t) {
    const push = ramp(0, CUT.arm, t);
    HOUSE.clinic.back(ctx, { t, shot: "medium", push });
    const at = HOUSE.clinic.heroAt("medium", push);
    const come = ooc(ramp(0.35, C.arm + 0.1, t));
    const hero = {
      t, x: at.x, y: at.y, h: at.h, view: "front", rimSide: at.rimSide ?? 1, ...HERO,
      look: [lerp(0.15, 0.7, S(0.6, 1.6, t)), 0.15 * S(1.2, 2.4, t)],
      headTurn: 0.25 * S(0.8, 1.8, t),
      worry: lerp(0.25, 0.85, S(C.needle1, C.arm, t)),
      mouth: -0.25,
    };
    HOUSE.hero.draw(ctx, hero);
    const A = HOUSE.hero.anchors(hero);
    const sh = A.shoulderR;
    const tip = [lerp(EX.W + 420, sh[0] + 10, come), lerp(sh[1] - 230, sh[1] - 4, come)];
    const glint = clamp((t - C.needle1) / 0.6);
    HOUSE.clinic.syringe(ctx, { t, x: tip[0], y: tip[1], angle: Math.PI - 0.32, scale: 1.25, glint: glint > 0 && glint < 1 ? glint : 0 });
    HOUSE.clinic.front(ctx, { t, shot: "medium", push });
  }

  // 2. Arm close-up: the needle goes in, the plunger pushes, ten drops pop.
  function shotArm(ctx, t) {
    const u = t - CUT.arm;
    const press = 0.2 * ooc(ramp(CUT.arm, C.second - 0.05, t)) + 0.8 * ioc(ramp(C.second, C.second + 0.5, t));
    const plunger = ioc(ramp(C.push, C.skin1 + 0.3, t));
    const sting = ramp(C.second, C.second + 0.6, t);
    const o = { t, cam: { zoom: 1 + 0.01 * u, x: 0, y: 0 }, press, plunger, sting };
    HOUSE.clinic.armClose(ctx, o);
    const A = HOUSE.clinic.armCloseAnchors(o);
    const out = CUT.xray - 0.22;
    const [rx, ry] = A.dropsRow;
    for (let i = 0; i < 10; i++) {
      const k = clamp((t - (C.ten + 0.1 * i)) / 0.45);
      if (k > 0) HOUSE.clinic.drop(ctx, { x: rx + (i - 4.5) * 54, y: ry, r: 20, k: t < out ? k : k * (1 - ramp(out, out + 0.15, t)), t: t + i * 0.37 });
    }
    HOUSE.ui.callout(ctx, { from: A.barrel, to: A.barrelTo, text: "0.5 mL", color: P.pill.cyan, t0: C.ten + 0.1, now: t, out });
    HOUSE.ui.pill(ctx, { text: "10 drops", x: rx, y: ry - 92, color: P.pill.cyan, t0: C.drops + 0.3, now: t, out });
  }

  // 3. X-ray figure: the medicine is swallowed and slides to the stomach; push toward it.
  function shotSwallow(ctx, t) {
    const p = ioc(ramp(C.because - 0.2, CUT.stomach, t));
    const base = { t, gut: 1, swallow: ioc(ramp(C.swallow - 0.05, C.stomach - 0.15, t)) };
    const st = HOUSE.body.xrayAnchors({ ...base, cam: { zoom: 1, x: 0, y: 0 } }).stomach;
    const zoom = 1 + 0.55 * p;
    const cam = { zoom, x: -(st[0] - EX.W / 2) * zoom * 0.85 * p, y: -(st[1] - EX.H / 2) * zoom * 0.85 * p };
    HOUSE.body.xray(ctx, { ...base, cam });
  }

  // 4. Inside the stomach: acid, enzymes, insulin and a sandwich digested alike.
  function shotStomach(ctx, t) {
    const o = {
      t,
      cam: drift(t, CUT.stomach, 1.04, 1.0, CUT.shortcut, 41),
      meds: ramp(C.medicines - 0.1, C.medicines + 1.2, t),
      insulin: ooc(ramp(C.insulin - 0.15, C.insulin + 0.75, t)),
      sandwich: ooc(ramp(C.same - 0.15, C.same + 0.75, t)),
      digest: ramp(C.digests, CUT.shortcut - 0.1, t),
    };
    HOUSE.body.stomach(ctx, o);
    const A = HOUSE.body.stomachAnchors(o);
    const out = CUT.shortcut - 0.22;
    HOUSE.ui.callout(ctx, { from: A.acid, to: [A.acid[0] - 110, A.acid[1] - 175], text: "stomach acid", color: P.pill.green, t0: C.digest, now: t, out });
    HOUSE.ui.callout(ctx, { from: A.insulin, to: [A.insulin[0] + 210, A.insulin[1] - 140], text: "insulin", color: P.pill.orange, t0: C.insulin + 0.35, now: t, out });
  }

  // 5. X-ray figure, wider: the swallow route is crossed out; the shortcut runs from the arm.
  function shotShortcut(ctx, t) {
    const o = {
      t,
      cam: drift(t, CUT.shortcut, 1.0, 1.03, CUT.section, 52),
      gut: lerp(1, 0.35, S(C.take, C.take + 0.6, t)),
      cross: ioc(ramp(C.take, C.take + 0.5, t)),
      shortcut: ioc(ramp(C.shortcut - 0.05, CUT.section - 0.05, t)),
    };
    HOUSE.body.xray(ctx, o);
  }

  // 6. Cross-section: three needles, three depths.
  function shotSection(ctx, t) {
    const needles = [0, 1, 2].map((i) => ooc(ramp(C.needle2 - 0.05 + 0.15 * i, C.stops + 0.05 + 0.1 * i, t)));
    const o = { t, cam: drift(t, CUT.section, 1.0, 1.04, CUT.fat, 63), needles, glow: S(C.decides, C.fast + 0.3, t) };
    HOUSE.tissue.section(ctx, o);
    const A = HOUSE.tissue.sectionAnchors(o);
    const out = CUT.fat - 0.22;
    const labels = [["fat", P.pill.orange], ["muscle", P.pill.crimson], ["vein", "violet"]];
    labels.forEach(([text, color], i) => {
      const tip = A.tips[i];
      const drop = i === 2 ? 190 : 110; // the vein label goes down-right, clear of the middle needle
      HOUSE.ui.callout(ctx, { from: tip, to: [tip[0] + 170, tip[1] + drop], text, color, t0: C.decides + 0.12 * i, now: t, out });
    });
  }

  // 7-9. Fat (slow), muscle (faster), vein (fastest); the comparison row builds underneath.
  function shotFat(ctx, t) {
    HOUSE.tissue.fat(ctx, { t, cam: drift(t, CUT.fat, 1.0, 1.05, CUT.muscle, 74), k: ramp(C.seeps - 0.4, CUT.muscle, t) });
    speedRow(ctx, t, 0);
  }
  function shotMuscle(ctx, t) {
    HOUSE.tissue.muscle(ctx, { t, cam: drift(t, CUT.muscle, 1.0, 1.05, CUT.vein, 85), k: ooc(ramp(C.packed - 0.1, C.minutes + 0.6, t)) });
    speedRow(ctx, t, 1);
  }
  function shotVein(ctx, t) {
    HOUSE.tissue.vein(ctx, { t, cam: drift(t, CUT.vein, 1.0, 1.04, CUT.circ, 96), k: ooc(ramp(C.vein - 0.05, C.vein + 0.8, t)) });
    speedRow(ctx, t, 2);
  }

  // 10. X-ray figure: the heart pumps the medicine around the whole body.
  function shotCirc(ctx, t) {
    const o = {
      t,
      cam: drift(t, CUT.circ, 1.06, 1.0, CUT.plaster, 107),
      gut: 0.25,
      shortcut: 1,
      heart: S(C.heart - 0.1, C.heart + 0.3, t),
      circ: ioc(ramp(C.pumps - 0.05, C.minute + 0.1, t)),
    };
    HOUSE.body.xray(ctx, o);
    const A = HOUSE.body.xrayAnchors(o);
    HOUSE.ui.callout(ctx, { from: A.heart, to: [A.heart[0] + 260, A.heart[1] - 170], text: "~1 min", icon: "clock", color: P.pill.cyan, t0: C.body, now: t, out: CUT.plaster - 0.22 });
  }

  // 11. Arm close-up again: the needle comes out, a plaster pops on.
  function shotPlaster(ctx, t) {
    const u = t - CUT.plaster;
    HOUSE.clinic.armClose(ctx, {
      t,
      cam: { zoom: 1.02 - 0.01 * u, x: 0, y: 0 },
      press: 1 - ioc(ramp(C.from + 0.05, C.from + 0.5, t)),
      plunger: 1,
      withdraw: ioc(ramp(C.from + 0.05, C.sting - 0.1, t)),
      plaster: ramp(C.sting - 0.05, C.sting + 0.45, t),
    });
  }

  // 12. Title over the clinic, the hero relieved.
  function shotTitle(ctx, t) {
    const push = ramp(CUT.title, DUR, t);
    HOUSE.clinic.back(ctx, { t, shot: "wide", push });
    const at = HOUSE.clinic.heroAt("wide", push);
    HOUSE.hero.draw(ctx, { t, x: at.x, y: at.y, h: at.h, view: "front", rimSide: at.rimSide ?? 1, ...HERO, mouth: 0.7, worry: 0, look: [0, -0.1] });
    HOUSE.clinic.front(ctx, { t, shot: "wide", push });
    HOUSE.ui.title(ctx, { lines: [["WHERE", "THE"], ["NEEDLE", "STOPS"]], t0: CUT.title + 0.15, now: t });
  }

  const DRAW = {
    clinic: shotClinic, arm: shotArm, swallow: shotSwallow, stomach: shotStomach, shortcut: shotShortcut,
    section: shotSection, fat: shotFat, muscle: shotMuscle, vein: shotVein, circ: shotCirc,
    plaster: shotPlaster, title: shotTitle,
  };

  function draw(ctx, t) {
    const [, name] = shotAt(t);
    DRAW[name](ctx, t);
    // fade out over the last 0.6 s
    const end = S(DUR - 0.6, DUR, t);
    if (end > 0) {
      ctx.fillStyle = `rgba(4,1,18,${end})`;
      ctx.fillRect(0, 0, EX.W, EX.H);
    }
  }

  EX.run({
    id: "main",
    duration: DUR,
    fonts: ['600 38px "Figtree"', '700 120px "Figtree"'],
    build: async () => {
      await HOUSE.hero.init();
      await HOUSE.ui.init();
      await HOUSE.clinic.init();
      await HOUSE.body.init();
      await HOUSE.tissue.init();
    },
    draw,
  });
})();

/* test.js: the test page for one art module (story/__MODULE__.js, which attaches HOUSE.__KEY__).
 *
 * It draws one STATE per second of the page; t keeps running inside each second, so ambient motion
 * (wobble, drift, blinks) shows up when you snapshot two times a few frames apart. A strip at the
 * bottom names the state, its options and the module's cost per draw (ms), and every anchor the
 * module returns is marked with a white dot. In 9:16 a thin frame marks the text safe zone.
 *
 * Edit STATES: one line per thing to check, e.g. each scene at its start and end progress, a
 * camera push (cam: { zoom: 1.08, x: 40, y: -40 }) to prove no edge shows, and k past 1.
 * Then set data-duration in index.html to at least STATES.length and snapshot:
 *   node tools/snapshot.mjs videos/<slug>/tests/__MODULE__ --every 1
 * After every edit of story/__MODULE__.js, refresh the copies here first:
 *   node tools/new-module-test.mjs videos/<slug> __MODULE__
 * The timing text uses performance.now(), so this page is not deterministic; films never do this.
 */
(function () {
  const KEY = "__KEY__"; // the module's name on window.HOUSE
  const M = window.HOUSE && window.HOUSE[KEY];
  const DUR = Number(document.getElementById("root").dataset.duration) || 8;

  // [function name on the module, options]; t is added for you. Empty = every draw function once.
  const STATES = [
    // ["scene", { k: 0 }],
    // ["scene", { k: 1 }],
    // ["scene", { k: 0.5, cam: { zoom: 1.08, x: 40, y: -40 } }],
  ];

  const isDraw = (name) => M && typeof M[name] === "function" && name !== "init" && !/Anchors$/.test(name);
  const states = STATES.length ? STATES : M ? Object.keys(M).filter(isDraw).map((name) => [name, {}]) : [];
  const TIMES = {};

  /** every [x, y] pair inside an anchors result (arrays, nested objects) */
  const points = (a, out = []) => {
    if (!a || typeof a !== "object") return out;
    if (Array.isArray(a) && a.length === 2 && typeof a[0] === "number" && typeof a[1] === "number") out.push(a);
    else for (const v of Array.isArray(a) ? a : Object.values(a)) points(v, out);
    return out;
  };

  function strip(ctx, text) {
    const U = EX.U;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, EX.H - 44 * U, EX.W, 44 * U);
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 ${20 * U}px "Figtree", system-ui, sans-serif`;
    ctx.fillText(text, 16 * U, EX.H - 15 * U);
    ctx.restore();
  }

  function safeFrame(ctx) {
    if (EX.W >= EX.H) return;
    const s = HOUSE.ui.safe();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x0, s.y0, s.x1 - s.x0, s.y1 - s.y0);
    ctx.restore();
  }

  function draw(ctx, t) {
    ctx.fillStyle = HOUSE.pal.sky[0];
    ctx.fillRect(0, 0, EX.W, EX.H);
    if (!M) {
      strip(ctx, `HOUSE.${KEY} not found: does story/__MODULE__.js load and attach HOUSE.${KEY}? (t = ${t.toFixed(2)})`);
      return;
    }
    if (!states.length) {
      strip(ctx, `HOUSE.${KEY} has no draw functions yet`);
      return;
    }
    const i = Math.max(0, Math.min(states.length - 1, Math.floor(t + 1e-6)));
    const [name, opts] = states[i];
    const o = Object.assign({ t }, opts);
    ctx.save();
    M[name](ctx, o);
    ctx.restore();
    const anchors = M[name + "Anchors"];
    if (anchors) {
      ctx.save();
      ctx.fillStyle = "#ffffff";
      for (const p of points(anchors(o))) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 5 * EX.U, 0, EX.TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    safeFrame(ctx);
    const ms = Object.entries(TIMES)
      .map(([k, v]) => `${k} ${v.toFixed(1)} ms`)
      .join("   ");
    strip(ctx, `${i + 1}/${states.length}  ${name} ${JSON.stringify(opts)}  t=${t.toFixed(3)}    ${ms}`);
  }

  EX.run({
    id: "main",
    duration: DUR,
    fonts: ['600 38px "Figtree"', '700 120px "Figtree"'],
    build: async () => {
      await HOUSE.hero.init();
      await HOUSE.ui.init();
      if (M && M.init) await M.init();
      // cost per draw: 5 warm-up draws, then the mean of 20 (budget: well under 60 ms)
      const c = document.createElement("canvas");
      c.width = EX.W;
      c.height = EX.H;
      const ctx = c.getContext("2d");
      for (const name of [...new Set(states.map((s) => s[0]))]) {
        const opts = states.find((s) => s[0] === name)[1];
        for (let i = 0; i < 5; i++) M[name](ctx, Object.assign({ t: i * 0.1 }, opts));
        const t0 = performance.now();
        for (let i = 0; i < 20; i++) M[name](ctx, Object.assign({ t: 1 + i / 60 }, opts));
        ctx.getImageData(0, 0, 1, 1); // wait for the GPU
        TIMES[name] = (performance.now() - t0) / 20;
      }
    },
    draw,
  });
})();

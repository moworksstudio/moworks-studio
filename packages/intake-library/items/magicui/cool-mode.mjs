// Magic UI cool-mode (apps/www/registry/magicui/cool-mode.tsx at efe76fc): while a button is pressed, a particle is spawned every 30 ms
// (at most 45 alive) at the pointer: size 15 / 20 / 25 / 35 / 45 px, speedHorz 0-10 and speedUp 0-25 px a frame, spin 0-360° plus 0-35°
// a frame either way, direction +-1; each frame left -= speedHorz x direction, top -= speedUp, speedUp = min(size, speedUp - 1); a circle
// hsl(random, 70 %, 50 %), an emoji / text (font x 3, scale 3) or a round image. Port: presses become [t, x, y, seconds] on the film;
// every particle is seeded and its place after n frames computed from the same recurrence.
export default {
  id: "cool-mode",
  kind: "motion",
  title: "Cool Mode",
  sub: "Vòi hạt phun lên khi bấm",
  desc: "While a button is pressed, a fountain of coloured circles or emoji shoots up from the press point, spins and falls: a 'tap to like' beat.",
  category: "Effects & overlays",
  tags: ["particles", "fountain", "emoji", "press", "like", "burst", "magicui"],
  source: { path: "apps/www/registry/magicui/cool-mode.tsx" },
  notes: "el is a full-frame layer (position absolute, overflow hidden) over the scene. presses: [[t, x, y, holdSeconds], ...] in px of el. particle: 'circle' or any text / emoji (remote images are not taken).",
  options: { presses: "[[0, 960, 700, 1]]", particle: "circle | text / emoji (circle)", size: "fixed px (random of 15-45)", speedHorz: "fixed (random 0-10)", speedUp: "fixed (random 0-25)", hold: "seconds (4)", seed: "1" },
  defaults: { presses: [[0, 960, 700, 1]], particle: "circle", size: 0, speedHorz: 0, speedUp: 0, hold: 4, seed: 1 },
  uses: ["rand"],
  css: `.mw-cool-mode { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 50; }
.mw-cool-mode > div { position: absolute; will-change: transform; left: 0; top: 0; }`,
  markup: `<div class="mw-cool-mode"></div>`,
  fn: function (el, tl, at, o) {
    var NS = "http://www.w3.org/2000/svg", sizes = [15, 20, 25, 35, 45], r = MW.rand(o.seed * 6113), parts = [], H = el.clientHeight;
    o.presses.forEach(function (pr) {
      for (var t = 0; t < pr[3]; t += 0.03) {
        var size = o.size || sizes[Math.floor(r() * sizes.length)], p = { t0: pr[0] + t, x: pr[1], y: pr[2], size: size, speedHorz: o.speedHorz || r() * 10, speedUp: o.speedUp || r() * 25,
          spin: r() * 360, spinSpeed: r() * 35 * (r() <= 0.5 ? -1 : 1), dir: r() <= 0.5 ? -1 : 1, hue: r() * 360 };
        var d = document.createElement("div");
        if (o.particle === "circle") {
          var s = document.createElementNS(NS, "svg"), c = document.createElementNS(NS, "circle");
          c.setAttribute("cx", size / 2); c.setAttribute("cy", size / 2); c.setAttribute("r", size / 2); c.setAttribute("fill", "hsl(" + p.hue + ", 70%, 50%)");
          s.appendChild(c); s.setAttribute("width", size); s.setAttribute("height", size); d.appendChild(s);
        } else {
          var tx = document.createElement("div"); tx.textContent = o.particle;
          tx.style.cssText = "font-size:" + size * 3 + "px;line-height:1;text-align:center;width:" + size + "px;height:" + size + "px;display:flex;align-items:center;justify-content:center;transform:scale(3);transform-origin:center";
          d.appendChild(tx);
        }
        d.style.opacity = 0; el.appendChild(d); p.el = d; parts.push(p);
      }
    });
    // at most 45 alive, as upstream: a particle is spawned only if fewer than 45 are still on screen
    var s2 = { t: 0 }, set = function () {
      var alive = 0;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], n = Math.floor((s2.t - p.t0) * 60);
        if (n < 0) { p.el.style.opacity = 0; continue; }
        var left = p.x - p.size / 2, top = p.y - p.size / 2, up = p.speedUp;
        for (var k = 0; k < n; k++) { left -= p.speedHorz * p.dir; top -= up; up = Math.min(p.size, up - 1); }
        var gone = top >= H + p.size;
        if (!gone) alive++;
        p.el.style.opacity = gone || alive > 45 ? 0 : 1;
        p.el.style.transform = "translate(" + left + "px, " + top + "px) rotate(" + (p.spin + p.spinSpeed * n) + "deg)";
      }
    };
    set();
    tl.fromTo(s2, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 6,
    css: `.like { position: absolute; left: 50%; top: 66%; transform: translate(-50%, -50%); padding: 30px 64px; border-radius: 999px; background: #fafafa; color: #09090b; font-size: 52px; font-weight: 700; }`,
    html: `<div class="like">❤️ Thích</div><div class="mw-cool-mode a"></div><div class="mw-cool-mode b"></div>`,
    run: `MW.coolMode(q(".a"), tl, 0, { presses: [[0.3, 960, 713, 1.3]], hold: 3 });
MW.coolMode(q(".b"), tl, 2.8, { presses: [[0.2, 960, 713, 1.3]], particle: "❤️", hold: 3.2, seed: 5 });`,
  },
};

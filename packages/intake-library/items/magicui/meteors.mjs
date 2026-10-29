// Magic UI meteors (apps/www/registry/magicui/meteors.tsx at efe76fc): `number` (20) meteors, each a 2 x 2 px round head (zinc-500, a
// faint white ring) with a 50 x 1 px tail fading to transparent, at top -5 % and a random left, rotated 215°, running the registry keyframe
// "meteor" (translateX 0 -> -500 px, opacity 1 until 70 % then -> 0) linear forever, with a random delay 0.2-1.2 s and a whole-second
// duration of 2-10 s. The class rotate-(--angle) is the CSS rotate property, so the angle applies twice (-430°: a steep fall to the
// lower left, tail behind). Port: the same spans; delays, durations and lefts seeded; each meteor's state from the film's time.
export default {
  id: "meteors",
  kind: "motion",
  title: "Meteors",
  sub: "Sao băng vụt chéo qua khung",
  desc: "Thin meteors with fading tails streak diagonally across the frame on random delays and speeds, endlessly.",
  category: "Backgrounds",
  tags: ["meteor", "shooting star", "space", "night", "background", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/meteors.tsx" },
  notes: "el is a full-frame layer (position relative, overflow hidden). Upstream spreads lefts over the window width: here over el's width.",
  options: { number: "20", minDelay: "s (0.2)", maxDelay: "s (1.2)", minDuration: "s (2)", maxDuration: "s (10)", angle: "deg (215)", hold: "seconds (10)", seed: "1" },
  defaults: { number: 20, minDelay: 0.2, maxDelay: 1.2, minDuration: 2, maxDuration: 10, angle: 215, hold: 10, seed: 1 },
  uses: ["rand"],
  css: `.mw-meteors { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.mw-meteors > .mw-meteor { position: absolute; width: 2px; height: 2px; border-radius: 9999px; background: #71717b; box-shadow: 0 0 0 1px #ffffff10; }
.mw-meteors > .mw-meteor::before { content: ""; position: absolute; top: 50%; width: 50px; height: 1px; transform: translateY(-50%); background: linear-gradient(to right, #71717b, transparent); }`,
  markup: `<div class="mw-meteors"></div>`,
  fn: function (el, tl, at, o) {
    var r = MW.rand(o.seed * 4099), W = el.offsetWidth, list = [];
    for (var i = 0; i < o.number; i++) {
      var m = document.createElement("span"); m.className = "mw-meteor";
      var left = Math.floor(r() * W), delay = r() * (o.maxDelay - o.minDelay) + o.minDelay, dur = Math.floor(r() * (o.maxDuration - o.minDuration) + o.minDuration);
      m.style.top = "-5%"; m.style.left = left + "px";
      m.style.rotate = -o.angle + "deg";          // Tailwind rotate-(--angle) sets the rotate property, which adds to the keyframe's rotate()
      el.appendChild(m); list.push({ m: m, delay: delay, dur: dur });
    }
    var s = { t: 0 };
    var set = function () {
      for (var i = 0; i < list.length; i++) {
        var L = list[i], u = s.t - L.delay, x = 0, op = 1;
        if (u < 0) { op = 1; x = 0; }                              // during its delay a CSS-animated span shows its own style: in place, visible
        else { var f = (u % L.dur) / L.dur; x = -500 * f; op = f < 0.7 ? 1 : 1 - (f - 0.7) / 0.3; }
        L.m.style.transform = "rotate(" + -o.angle + "deg) translateX(" + x + "px)";
        L.m.style.opacity = op;
      }
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    css: `.sky { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 120%, #1e1b4b 0%, #09090b 60%); }
.mw-meteor { transform-origin: 0 0; } .mw-meteors > .mw-meteor { width: 4px; height: 4px; background: #a1a1aa; } .mw-meteors > .mw-meteor::before { width: 120px; height: 2px; background: linear-gradient(to right, #a1a1aa, transparent); }`,
    html: `<div class="sky"></div><div class="mw-meteors"></div><div class="center"><div class="h1">Đêm sao băng</div></div>`,
    run: `MW.meteors(q(".mw-meteors"), tl, 0, { number: 30, hold: 8 });`,
  },
};

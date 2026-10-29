// Magic UI aurora-text (apps/www/registry/magicui/aurora-text.tsx at efe76fc): a word filled with linear-gradient(135deg, #FF0080,
// #7928CA, #0070F3, #38bdf8, #FF0080) at 200 % auto, keyframe "aurora" (background-position 0% 50% -> 50% 100% -> 100% 50% -> 50% 0% ->
// 0% 50%), duration 10 / speed s (inline style), ease-in-out per segment, infinite alternate. Upstream's rotate / scale wobble targets an
// inline span, so browsers ignore it: off by default here (wobble: true turns it on, documented as not visible upstream).
export default {
  id: "aurora-text",
  kind: "motion",
  title: "Aurora Text",
  sub: "Chữ cực quang nhiều màu trôi",
  desc: "A word filled with a 135° pink-purple-blue-sky gradient that drifts back and forth (10 s / speed, ease-in-out, alternate).",
  category: "Text & titles",
  tags: ["gradient", "aurora", "text", "colour", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/aurora-text.tsx" },
  notes: "Only the x part of background-position moves (auto height = 100 %). The wobble (rotate -5/5/-3/3 deg, scale .9/1.1/.95/1.05) is off by default because upstream's inline span never shows it.",
  options: { colors: "list (#FF0080, #7928CA, #0070F3, #38bdf8)", speed: "1 (10 s per pass)", wobble: "false", hold: "seconds (10)" },
  defaults: { colors: ["#FF0080", "#7928CA", "#0070F3", "#38bdf8"], speed: 1, wobble: false, hold: 10 },
  uses: ["bezier"],
  css: `.mw-aurora-text { display: inline-block; padding: 0.12em 0.02em; margin: -0.12em -0.02em; color: transparent; background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }`,
  markup: `<span class="mw-aurora-text">Cực quang</span>`,
  fn: function (el, tl, at, o) {
    el.style.backgroundImage = "linear-gradient(135deg, " + o.colors.join(", ") + ", " + o.colors[0] + ")";
    var D = 10 / o.speed, seg = D / 4, e = MW.bezier.apply(null, MW.CSS_EASE.easeInOut);
    // keyframes [x %, y %, rotate, scale]; only x shows (auto height = 100 %), kept as written
    var K = [[0, 50, -5, 0.9], [50, 100, 5, 1.1], [100, 50, -3, 0.95], [50, 0, 3, 1.05], [0, 50, -5, 0.9]];
    var s = { t: 0 };
    var set = function () {
      var c = Math.floor(s.t / D), f = (s.t - c * D) / D;
      if (c % 2 === 1) f = 1 - f;                          // infinite alternate
      var i = Math.min(3, Math.floor(f * 4)), u = e(f * 4 - i), a = K[i], b = K[i + 1];
      el.style.backgroundPosition = (a[0] + (b[0] - a[0]) * u) + "% " + (a[1] + (b[1] - a[1]) * u) + "%";
      if (o.wobble) el.style.transform = "rotate(" + (a[2] + (b[2] - a[2]) * u) + "deg) scale(" + (a[3] + (b[3] - a[3]) * u) + ")";
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 10,
    html: `<div class="center"><div class="h1" style="font-size:150px">Trải nghiệm <span class="mw-aurora-text">cực quang</span></div></div>`,
    run: `MW.auroraText(q(".mw-aurora-text"), tl, 0, { speed: 2, hold: 10 });`,
  },
};

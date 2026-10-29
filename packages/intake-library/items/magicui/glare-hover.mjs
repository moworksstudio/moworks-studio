// Magic UI glare-hover (apps/www/registry/magicui/glare-hover.tsx at efe76fc): a ::before layer with linear-gradient(angle -45°,
// transparent 60 %, rgba(colour #fff, opacity 0.5) 70 %, transparent, transparent 100 %) at size 250 % (plus a 100 % layer), sitting at
// background-position -100 % -100 %; on hover it moves to 100 % 100 % over 650 ms ease-in-out (and back when the pointer leaves).
// Port: the layer is a real element; each "hover" is a start time on the film's timeline (`sweeps`), with the same transition.
export default {
  id: "glare-hover",
  kind: "motion",
  title: "Glare Hover",
  sub: "Vệt loá chéo lướt qua thẻ",
  desc: "A diagonal glare band sweeps across a card, as when the pointer passes over it (0.65 s, ease-in-out), and back on leaving.",
  category: "Effects & overlays",
  tags: ["glare", "shine", "sweep", "card", "hover", "magicui"],
  source: { path: "apps/www/registry/magicui/glare-hover.tsx" },
  notes: "sweeps: [[enter, leave], ...] in s after `at` (leave null = stays; playOnce: no sweep back). The element gets position relative and overflow hidden.",
  options: { color: "#ffffff", opacity: "0.5", angle: "deg (-45)", size: "% (250)", duration: "s (0.65)", playOnce: "false", sweeps: "[[0, 1.2]]" },
  defaults: { color: "#ffffff", opacity: 0.5, angle: -45, size: 250, duration: 0.65, playOnce: false, sweeps: [[0, 1.2]] },
  uses: ["bezier"],
  css: `.mw-glare-hover { position: relative; overflow: hidden; }
.mw-glare-hover > .mw-gh { pointer-events: none; position: absolute; inset: 0; z-index: 10; background-repeat: no-repeat; }`,
  markup: `<div class="mw-glare-hover card">…</div>`,
  fn: function (el, tl, at, o) {
    var hex = o.color.replace("#", ""), P = function (h) { return parseInt(h, 16); };
    var rgba = hex.length === 6 ? "rgba(" + P(hex.slice(0, 2)) + "," + P(hex.slice(2, 4)) + "," + P(hex.slice(4, 6)) + "," + o.opacity + ")" : o.color;
    var g = document.createElement("div"); g.className = "mw-gh"; el.appendChild(g);
    g.style.backgroundImage = "linear-gradient(" + o.angle + "deg, transparent 60%, " + rgba + " 70%, transparent, transparent 100%)";
    g.style.backgroundSize = o.size + "% " + o.size + "%, 100% 100%";
    var e = MW.bezier.apply(null, MW.CSS_EASE.easeInOut), D = o.duration, s = { t: 0 }, end = 0;
    o.sweeps.forEach(function (w) { end = Math.max(end, (w[1] == null ? w[0] : w[1]) + D); });
    var set = function () {
      var p = 0;                                            // 0 = -100 %, 1 = 100 %: replay the transitions in order
      for (var i = 0; i < o.sweeps.length; i++) {
        var on = o.sweeps[i][0], off = o.sweeps[i][1];
        if (s.t < on) break;
        var from = p, k = Math.min(1, (s.t - on) / D);
        if (off == null || s.t < off) { p = from + (1 - from) * e(k); continue; }
        var top = from + (1 - from) * e(Math.min(1, (off - on) / D));
        p = o.playOnce ? (s.t - off < 0 ? top : 0) : top * (1 - e(Math.min(1, (s.t - off) / D)));
      }
      var v = -100 + 200 * p;
      g.style.backgroundPosition = v + "% " + v + "%, 0 0";
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 5,
    css: `.feature { width: 720px; height: 460px; padding: 56px; display: flex; flex-direction: column; justify-content: flex-end; gap: 14px; background: linear-gradient(160deg, #1e1b4b, #111114); }
.feature h3 { margin: 0; font-size: 56px; } .feature p { margin: 0; font-size: 30px; opacity: .65; }`,
    html: `<div class="center"><div class="card feature mw-glare-hover"><h3>Xuất 4K</h3><p>Video nét căng, màu chuẩn thương hiệu.</p></div></div>`,
    run: `MW.glareHover(q(".mw-glare-hover"), tl, 0.5, { sweeps: [[0, 1.6], [2.6, 3.8]], opacity: 0.35 });`,
  },
};

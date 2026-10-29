// Magic UI neon-gradient-card (apps/www/registry/magicui/neon-gradient-card.tsx at efe76fc): a card with a sharp two-colour border
// (::before, borderSize 2 px, radius 20) and a blurred copy behind it as a glow (::after, blur = card width / 3, opacity 0.8), both
// linear-gradient(0deg, #ff00aa, #00FFF1) at 100 % x 200 %, background-position sliding top center -> bottom center over 3 s, CSS default
// ease, infinite alternate (registry keyframe background-position-spin). Port: the two layers are real elements; the slide is a function
// of the film's time.
export default {
  id: "neon-gradient-card",
  kind: "motion",
  title: "Neon Gradient Card",
  sub: "Viền neon hai màu, quầng sáng sau thẻ",
  desc: "A card with a thin two-colour neon border and a large blurred glow behind it, the gradient sliding up and down (3 s each way).",
  category: "Effects & overlays",
  tags: ["neon", "glow", "border", "card", "gradient", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/neon-gradient-card.tsx" },
  notes: "el is the card (its content gets the inner panel). Docs say a 5 px border: the code has 2 px (the code wins).",
  options: { borderSize: "px (2)", borderRadius: "px (20)", firstColor: "#ff00aa", secondColor: "#00FFF1", panel: "inner colour (#171717)", hold: "seconds (6)" },
  defaults: { borderSize: 2, borderRadius: 20, firstColor: "#ff00aa", secondColor: "#00FFF1", panel: "#171717", hold: 6 },
  uses: ["bezier"],
  css: `.mw-neon-gradient-card { position: relative; z-index: 10; }
.mw-neon-gradient-card > .mw-ng-panel { position: relative; width: 100%; height: 100%; padding: 24px; box-sizing: border-box; }
.mw-neon-gradient-card .mw-ng-edge, .mw-neon-gradient-card .mw-ng-glow { position: absolute; z-index: -10; display: block; background-size: 100% 200%; }`,
  markup: `<div class="mw-neon-gradient-card">…</div>`,
  fn: function (el, tl, at, o) {
    var W = el.offsetWidth, H = el.offsetHeight, b = o.borderSize, panel = document.createElement("div"); panel.className = "mw-ng-panel";
    while (el.firstChild) panel.appendChild(el.firstChild);
    el.appendChild(panel);
    el.style.borderRadius = o.borderRadius + "px"; panel.style.borderRadius = (o.borderRadius - b) + "px"; panel.style.background = o.panel;
    var grad = "linear-gradient(0deg, " + o.firstColor + ", " + o.secondColor + ")", layers = [];
    ["mw-ng-edge", "mw-ng-glow"].forEach(function (c) {
      var d = document.createElement("div"); d.className = c; d.style.top = d.style.left = -b + "px"; d.style.width = W + b * 2 + "px"; d.style.height = H + b * 2 + "px";
      d.style.borderRadius = o.borderRadius + "px"; d.style.backgroundImage = grad; if (c === "mw-ng-glow") { d.style.filter = "blur(" + W / 3 + "px)"; d.style.opacity = 0.8; }
      panel.insertBefore(d, panel.firstChild); layers.push(d);
    });
    var e = MW.bezier.apply(null, MW.CSS_EASE.ease), s = { t: 0 }, set = function () {
      var k = Math.floor(s.t / 3), f = (s.t - k * 3) / 3; if (k % 2) f = 1 - f;
      var y = 100 * e(f);
      for (var i = 0; i < layers.length; i++) layers[i].style.backgroundPosition = "center " + y + "%";
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 6,
    css: `.mw-neon-gradient-card { width: 820px; height: 480px; } .mw-ng-panel { display: flex; align-items: center; justify-content: center; text-align: center; }
.big { font-size: 96px; font-weight: 800; letter-spacing: -0.03em; background: linear-gradient(to bottom right, #ff2975, #00FFF1); -webkit-background-clip: text; background-clip: text; color: transparent; padding: 0.1em 0; }`,
    html: `<div class="center"><div class="mw-neon-gradient-card"><div class="big">Thẻ Neon</div></div></div>`,
    run: `MW.neonGradientCard(q(".mw-neon-gradient-card"), tl, 0, { borderSize: 4, borderRadius: 28, hold: 6 });`,
  },
};

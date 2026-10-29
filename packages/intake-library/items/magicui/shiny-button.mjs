// Magic UI shiny-button (apps/www/registry/magicui/shiny-button.tsx at efe76fc): an outlined button (radius 8, padding 8 x 24, backdrop
// blur) that pops in (scale 0.8 -> 1, spring stiffness 200, damping 5, mass 0.5) while its uppercase label carries a gleam: a mask
// linear-gradient(-75deg, colour calc(x + 20 %), transparent calc(x + 30 %), colour calc(x + 100 %)) with --x 100 % -> -100 % on a spring
// (stiffness 20, damping 15, mass 2), repeating with a 1 s pause. The border gleam upstream writes is invalid CSS (var(--primary)/10 %,
// calc without spaces), so browsers never show it: left out here, as noted. Port: both springs solved in closed form on the film's time.
export default {
  id: "shiny-button",
  kind: "motion",
  title: "Shiny Button",
  sub: "Nút viền có ánh lấp lánh quét nhãn",
  desc: "An outlined button that pops in with a bounce while a gleam sweeps across its label again and again.",
  category: "UI & mockups",
  tags: ["button", "cta", "shine", "gleam", "pop", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/shiny-button.tsx" },
  notes: "el is the button. Upstream's border gleam does not render (invalid CSS) and is not ported.",
  options: { color: "label colour (rgba(255,255,255,0.9))", hold: "seconds (8)" },
  defaults: { color: "rgba(255,255,255,0.9)", hold: 8 },
  uses: ["spring"],
  css: `.mw-shiny-button { position: relative; display: inline-block; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); padding: 8px 24px; font-weight: 500; backdrop-filter: blur(24px);
  background: radial-gradient(circle at 50% 0%, rgba(250,250,250,0.1) 0%, transparent 60%); }
.mw-shiny-button > .mw-sh-label { position: relative; display: block; letter-spacing: 0.025em; text-transform: uppercase; font-weight: 300; }`,
  markup: `<div class="mw-shiny-button">Shiny Button</div>`,
  fn: function (el, tl, at, o) {
    var label = document.createElement("span"); label.className = "mw-sh-label"; label.style.color = o.color;
    while (el.firstChild) label.appendChild(el.firstChild); el.appendChild(label);
    var pop = MW.spring(200, 5, 0.5), gleam = MW.spring(20, 15, 2), cycle = gleam.duration + 1;
    tl.fromTo(el, { scale: 0.8 }, { scale: 1, duration: pop.duration, ease: pop.ease, immediateRender: true }, at);
    var s = { t: 0 }, set = function () {
      var f = s.t % cycle, x = f < gleam.duration ? 100 - 200 * gleam.ease(f / gleam.duration) : -100;
      label.style.webkitMaskImage = label.style.maskImage = "linear-gradient(-75deg, #000 calc(" + x + "% + 20%), transparent calc(" + x + "% + 30%), #000 calc(" + x + "% + 100%))";
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    css: `.mw-shiny-button { font-size: 52px; padding: 22px 64px; border-radius: 16px; }`,
    html: `<div class="center"><div class="mw-shiny-button">Khám phá ngay</div></div>`,
    run: `MW.shinyButton(q(".mw-shiny-button"), tl, 0.3, { hold: 7.5 });`,
  },
};

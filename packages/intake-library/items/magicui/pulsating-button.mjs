// Magic UI pulsating-button (apps/www/registry/magicui/pulsating-button.tsx at efe76fc): a button (radius 8, padding 8 x 16) whose inner
// span (bg-inherit) throws a box-shadow halo: "pulse" 0 0 0 0 -> 0 0 0 distance (8 px) -> 0 in pulseColor (else the button colour at
// 50 % alpha), 1.5 s ease-out, forever; "ripple" 0 -> distance with alpha 1 -> 0, 1.5 s cubic-bezier(0.16, 1, 0.3, 1). Port: the same
// shadow, computed from the film's time (the button colour read once).
export default {
  id: "pulsating-button",
  kind: "motion",
  title: "Pulsating Button",
  sub: "Nút có quầng sáng đập nhịp",
  desc: "A button with a soft halo that pulses out from its edge (pulse) or a ring that expands and fades (ripple), every 1.5 s: a waiting call to action, a live dot, a map pin.",
  category: "UI & mockups",
  tags: ["button", "cta", "pulse", "halo", "attention", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/pulsating-button.tsx" },
  notes: "el is the button; its background colour is the pulse colour unless pulseColor is given.",
  options: { pulseColor: "colour (the button's at 50 %)", duration: "s (1.5)", distance: "px (8)", variant: "pulse | ripple (pulse)", hold: "seconds (6)" },
  defaults: { pulseColor: null, duration: 1.5, distance: 8, variant: "pulse", hold: 6 },
  uses: ["bezier"],
  css: `.mw-pulsating-button { position: relative; display: flex; align-items: center; justify-content: center; border-radius: 8px; padding: 8px 16px; text-align: center; }
.mw-pulsating-button > .mw-pb-label { position: relative; z-index: 10; }
.mw-pulsating-button > .mw-pb-halo { pointer-events: none; position: absolute; inset: 0; border-radius: inherit; background: inherit; }`,
  markup: `<div class="mw-pulsating-button" style="background:#fafafa;color:#09090b">Tham gia</div>`,
  fn: function (el, tl, at, o) {
    var label = document.createElement("span"); label.className = "mw-pb-label"; while (el.firstChild) label.appendChild(el.firstChild);
    var halo = document.createElement("span"); halo.className = "mw-pb-halo"; el.appendChild(label); el.appendChild(halo);
    var probe = document.createElement("canvas").getContext("2d"); probe.fillStyle = o.pulseColor || getComputedStyle(el).backgroundColor; probe.fillRect(0, 0, 1, 1);
    var px = probe.getImageData(0, 0, 1, 1).data, rgb = px[0] + ", " + px[1] + ", " + px[2];
    var out = MW.bezier.apply(null, MW.CSS_EASE.easeOut), rip = MW.bezier(0.16, 1, 0.3, 1), D = o.duration, s = { t: 0 };
    var set = function () {
      var f = (s.t % D) / D, d, a;
      if (o.variant === "ripple") { d = o.distance * rip(f); a = 1 - rip(f); }
      else { d = f < 0.5 ? o.distance * out(f * 2) : o.distance * (1 - out(f * 2 - 1)); a = o.pulseColor ? px[3] / 255 : 0.5; }
      halo.style.boxShadow = "0 0 0 " + d + "px rgba(" + rgb + ", " + a + ")";
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 6,
    css: `.mw-pulsating-button { font-size: 48px; font-weight: 600; padding: 26px 56px; border-radius: 18px; }`,
    html: `<div class="center"><div class="row" style="gap:140px"><div class="mw-pulsating-button p1" style="background:#fafafa;color:#09090b">Đặt lịch ngay</div><div class="mw-pulsating-button p2" style="background:#60a5fa;color:#fff">Phát trực tiếp</div></div></div>`,
    run: `MW.pulsatingButton(q(".p1"), tl, 0, { distance: 22, hold: 6 });
MW.pulsatingButton(q(".p2"), tl, 0, { variant: "ripple", distance: 30, hold: 6 });`,
  },
};

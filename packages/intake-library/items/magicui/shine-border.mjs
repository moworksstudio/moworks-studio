// Magic UI shine-border (apps/www/registry/magicui/shine-border.tsx at efe76fc): an overlay on a card's border ring (padding =
// borderWidth, mask content-box xor) filled with radial-gradient(transparent, transparent, colours, transparent, transparent) at 300 % x
// 300 %, its background-position sliding 0 0 -> 100 % 100 % -> 0 0 over 14 s, linear, forever (registry keyframe "shine"). Port: the same
// overlay; the keyframe as a function of the film's time.
export default {
  id: "shine-border",
  kind: "motion",
  title: "Shine Border",
  sub: "Viền thẻ ánh màu trôi chậm",
  desc: "A card's border lit by a soft multi-colour glow that slides slowly around it (one pass every 14 s).",
  category: "Lines & beams",
  tags: ["border", "glow", "shine", "card", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/shine-border.tsx" },
  notes: "Put .mw-shine-border inside the card (position: relative; border-radius inherited).",
  options: { borderWidth: "px (1)", duration: "s (14)", shineColor: "a colour or a list (#000000)", hold: "seconds (14)" },
  defaults: { borderWidth: 1, duration: 14, shineColor: "#000000", hold: 14 },
  css: `.mw-shine-border { pointer-events: none; position: absolute; inset: 0; width: 100%; height: 100%; border-radius: inherit; background-size: 300% 300%;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#fff 0 0) content-box exclude, linear-gradient(#fff 0 0); }`,
  markup: `<div class="card" style="position:relative"><div class="mw-shine-border"></div></div>`,
  fn: function (el, tl, at, o) {
    var colors = Array.isArray(o.shineColor) ? o.shineColor.join(",") : o.shineColor;
    el.style.backgroundImage = "radial-gradient(transparent,transparent, " + colors + ",transparent,transparent)";
    el.style.padding = o.borderWidth + "px";
    var s = { t: 0 }, D = o.duration;
    var set = function () { var f = (s.t % D) / D, p = (f < 0.5 ? f * 2 : 2 - f * 2) * 100; el.style.backgroundPosition = p + "% " + p + "%"; };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 7,
    css: `.plan { width: 680px; height: 520px; padding: 56px; display: flex; flex-direction: column; gap: 22px; }
.plan h3 { margin: 0; font-size: 46px; } .plan .price { font-size: 96px; font-weight: 800; letter-spacing: -0.03em; } .plan p { margin: 0; font-size: 28px; opacity: .6; }`,
    html: `<div class="center"><div class="card plan"><h3>Gói Studio</h3><div class="price">499k</div><p>Không giới hạn video, xuất 4K, chữ tiếng Việt chuẩn.</p><div class="mw-shine-border"></div></div></div>`,
    run: `MW.shineBorder(q(".mw-shine-border"), tl, 0, { borderWidth: 4, duration: 7, shineColor: ["#A07CFE", "#FE8FB5", "#FFBE7B"], hold: 7 });`,
  },
};

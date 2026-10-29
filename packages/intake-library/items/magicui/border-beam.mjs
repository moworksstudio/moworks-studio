// Magic UI border-beam (apps/www/registry/magicui/border-beam.tsx at efe76fc): a short gradient beam that travels the border of its
// parent along offset-path rect(... round size), linear, endlessly. Port: the same element and CSS; motion/react's repeat becomes one linear
// tween of offset-distance per lap on the film's timeline, repeated over `hold`; `delay` keeps upstream's meaning (a negative start).
export default {
  id: "border-beam",
  kind: "motion",
  title: "Border Beam",
  sub: "Vệt sáng chạy quanh viền thẻ",
  desc: "A short gradient beam (#ffaa40 to #9c40ff) travels around the border of a card or button, one lap every 6 s, linear, looping for as long as the shot holds.",
  category: "Effects & overlays",
  tags: ["border", "beam", "glow", "card", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/border-beam.tsx" },
  notes: "Put .mw-border-beam inside any element with position: relative and a border-radius; it inherits the radius. AE: pictures (gradient on a path).",
  options: { size: "beam length in px (50)", duration: "seconds per lap (6)", delay: "seconds the lap is advanced (0)", reverse: "run the other way (false)",
    initialOffset: "start point, % of the lap (0)", borderWidth: "px (1)", colorFrom: "#ffaa40", colorTo: "#9c40ff", hold: "seconds it runs in the film (10)" },
  defaults: { size: 50, duration: 6, delay: 0, reverse: false, initialOffset: 0, borderWidth: 1, colorFrom: "#ffaa40", colorTo: "#9c40ff", hold: 10 },
  css: `.mw-border-beam { position: absolute; inset: 0; border-radius: inherit; border: var(--mw-bb-width, 1px) solid transparent; pointer-events: none;
  -webkit-mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0) border-box; -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) padding-box exclude, linear-gradient(#000 0 0) border-box; }
.mw-border-beam > i { position: absolute; aspect-ratio: 1; width: var(--mw-bb-size, 50px); background: linear-gradient(to left, var(--mw-bb-from), var(--mw-bb-to), transparent);
  offset-path: rect(0 auto auto 0 round var(--mw-bb-size, 50px)); offset-distance: 0%; }`,
  markup: `<div class="card" style="position:relative;border-radius:16px"><div class="mw-border-beam"><i></i></div></div>`,
  fn: function (el, tl, at, o) {
    var beam = el.querySelector("i") || el.appendChild(document.createElement("i"));
    el.style.setProperty("--mw-bb-width", o.borderWidth + "px");
    el.style.setProperty("--mw-bb-size", o.size + "px");
    el.style.setProperty("--mw-bb-from", o.colorFrom);
    el.style.setProperty("--mw-bb-to", o.colorTo);
    var a = o.reverse ? 100 - o.initialOffset : o.initialOffset, b = o.reverse ? -o.initialOffset : 100 + o.initialOffset;
    // one linear lap every `duration` s; upstream's delay advances the lap (motion's delay: -delay)
    var s = { t: 0 };
    var set = function () { var p = ((s.t + o.delay) / o.duration) % 1; beam.style.offsetDistance = (a + (b - a) * p) + "%"; };
    set();
    tl.to(s, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    css: `.login { width: 760px; height: 560px; padding: 56px; display: flex; flex-direction: column; gap: 28px; }
.login h3 { margin: 0; font-size: 48px; font-weight: 700; } .login p { margin: 0; font-size: 26px; opacity: .6; }
.field { height: 72px; border-radius: 14px; border: 2px solid var(--line); padding: 0 24px; display: flex; align-items: center; font-size: 26px; opacity: .55; }
.btns { display: flex; justify-content: space-between; margin-top: auto; } .btn { height: 72px; padding: 0 40px; border-radius: 14px; display: flex; align-items: center; font-size: 26px; font-weight: 600; border: 2px solid var(--line); }
.btn.primary { background: var(--fg); color: var(--bg); border-color: var(--fg); }`,
    html: `<div class="center"><div class="card login" style="border-radius:24px">
  <h3>Đăng nhập</h3><p>Nhập thông tin để vào tài khoản của bạn.</p>
  <div class="field">Email</div><div class="field">Mật khẩu</div>
  <div class="btns"><div class="btn">Đăng ký</div><div class="btn primary">Đăng nhập</div></div>
  <div class="mw-border-beam"><i></i></div>
</div></div>`,
    run: `MW.borderBeam(q(".login .mw-border-beam"), tl, 0, { duration: 8, size: 200, borderWidth: 3, hold: 8 });`,
  },
};

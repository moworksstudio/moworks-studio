// Magic UI pointer (apps/www/registry/magicui/pointer.tsx at efe76fc): inside its parent, the mouse cursor is replaced by a custom element
// (default: a small arrow, viewBox 16, 24 px, rotate(-70deg), black fill with a white stroke) centred on the pointer, popping in (scale
// 0 -> 1, opacity 0 -> 1, motion's defaults) when the pointer enters and out when it leaves. Port: enter / leave times and a path
// [t, x, y]; the pop as motion's default transform spring (stiffness 500, damping 25) and opacity tween (0.3 s).
export default {
  id: "pointer",
  kind: "motion",
  title: "Pointer",
  sub: "Con trỏ tuỳ chọn bật ra, đi theo",
  desc: "A custom pointer (an arrow, an emoji, any element) pops in over an area and follows a path, popping out at the end.",
  category: "Movement & loops",
  tags: ["cursor", "pointer", "emoji", "follow", "pop", "magicui"],
  source: { path: "apps/www/registry/magicui/pointer.tsx" },
  notes: "el is a layer over the area (position absolute, inset 0); put your own element inside it with class mw-pt-item, or leave it empty for the arrow. path: [[t, x, y], ...] px of el (linear).",
  options: { path: "[[t, x, y], ...]", enter: "s (path start)", leave: "s (path end)", size: "px (24)" },
  defaults: { path: [[0, 300, 300], [2, 1200, 600]], enter: null, leave: null, size: 24 },
  uses: ["spring", "bezier"],
  css: `.mw-pointer { position: absolute; inset: 0; pointer-events: none; z-index: 50; }
.mw-pointer > .mw-pt-item { position: absolute; left: 0; top: 0; }`,
  markup: `<div class="mw-pointer"></div>`,
  fn: function (el, tl, at, o) {
    var item = el.querySelector(".mw-pt-item");
    if (!item) {
      item = document.createElement("div"); item.className = "mw-pt-item";
      item.innerHTML = '<svg stroke="white" fill="black" stroke-width="1" viewBox="0 0 16 16" height="' + o.size + '" width="' + o.size + '" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(-70deg);display:block">' +
        '<path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z"/></svg>';
      el.appendChild(item);
    }
    var P = o.path, enter = o.enter == null ? P[0][0] : o.enter, leave = o.leave == null ? P[P.length - 1][0] : o.leave;
    var at2 = function (t) {
      if (t <= P[0][0]) return [P[0][1], P[0][2]];
      for (var k = 1; k < P.length; k++) if (t <= P[k][0]) { var a = P[k - 1], b = P[k], f = (t - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
      return [P[P.length - 1][1], P[P.length - 1][2]];
    };
    var pop = MW.spring(500, 25, 1), fade = MW.bezier(0.25, 0.1, 0.35, 1), W = item.offsetWidth, H = item.offsetHeight, s = { t: 0 };
    var set = function () {
      var q = at2(s.t), k = 0, op = 0;
      if (s.t >= enter && s.t < leave) { var u = s.t - enter; k = u < pop.duration ? pop.ease(u / pop.duration) : 1; op = fade(Math.min(1, u / 0.3)); }
      else if (s.t >= leave) { var v = s.t - leave; k = v < pop.duration ? 1 - pop.ease(v / pop.duration) : 0; op = 1 - fade(Math.min(1, v / 0.3)); }
      item.style.transform = "translate(" + (q[0] - W / 2) + "px, " + (q[1] - H / 2) + "px) scale(" + Math.max(0, k) + ")";
      item.style.opacity = op;
    };
    set();
    var end = leave + Math.max(0.3, pop.duration);
    tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 6,
    css: `.panel { width: 1300px; height: 700px; border-radius: 36px; background: linear-gradient(135deg, #1e1b4b, #312e81); display: grid; place-items: center; } .panel .h2 { opacity: .9; }
.mw-pt-item.emoji { font-size: 90px; line-height: 1; }`,
    html: `<div class="center"><div class="panel"><div class="h2">Di chuột vào đây</div></div></div><div class="mw-pointer a"></div><div class="mw-pointer b"><div class="mw-pt-item emoji">👆</div></div>`,
    run: `MW.pointer(q(".a"), tl, 0.3, { size: 72, path: [[0, 500, 300], [1.2, 900, 500], [2.4, 700, 760]] });
MW.pointer(q(".b"), tl, 3, { path: [[0, 1300, 700], [1.2, 1000, 420], [2.2, 1250, 330]] });`,
  },
};

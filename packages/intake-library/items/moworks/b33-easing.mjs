// Easing (batch 3.3): the named eases as motions, written here. Each moves one property of an element with its curve; GSAP's own names are
// used where they are the native form, the rest as exact cubic béziers (MW.ez). An optional `graph` canvas draws the curve and a dot riding
// it (a teaching guide), off by default.
import { T } from "../../moworks/define.mjs";

// one function for the curve family: o.ease is a GSAP name, a cubic-bezier(...) or one of the drawn curves (steps, slowmo, rough)
const EASE_FN = function (el, tl, at, o) {
  var curve;
  if (o.ease === "steps") curve = function (p) { return p >= 1 ? 1 : Math.min(1, Math.floor(p * o.steps) / (o.steps - 1)); };
  else if (o.ease === "slowmo") curve = function (p) { var a = 0.745, b = -0.35, e = 0.15; if (p < e) { var u = p / e; return a * u + b * u * u; } if (p > 1 - e) { var w = (1 - p) / e; return 1 - (a * w + b * w * w); } return 0.35 + 0.3 * p; };
  else if (o.ease === "rough") { var nz = MW.noise(o.seed); curve = function (p) { return Math.max(-0.1, Math.min(1.1, p + (nz(22 * p) / 2) * 0.18 * Math.sin(Math.PI * p))); }; }
  else curve = MW.ez(o.ease);
  var g = o.graph ? MW.el(o.graph) : null, gc = g ? g.getContext("2d") : null;
  return MW.drive(tl, at, o.duration, function (t) {
    var p = Math.max(0, Math.min(1, t / o.duration)), v = curve(p), s = {}; s[o.prop] = o.from + (o.to - o.from) * v; gsap.set(el, s);
    if (gc) {
      var W = g.width, H = g.height, m = 40, X = function (q) { return m + (W - 2 * m) * q; }, Y = function (q) { return H - m - (H - 2 * m) * 0.7 * q - (H - 2 * m) * 0.15; };
      gc.clearRect(0, 0, W, H); gc.strokeStyle = "#2a3350"; gc.lineWidth = 2; gc.strokeRect(m, m, W - 2 * m, H - 2 * m);
      gc.setLineDash([6, 8]); gc.beginPath(); gc.moveTo(m, Y(0)); gc.lineTo(W - m, Y(0)); gc.moveTo(m, Y(1)); gc.lineTo(W - m, Y(1)); gc.stroke(); gc.setLineDash([]);
      gc.strokeStyle = "#a99bff"; gc.lineWidth = 5; gc.beginPath(); for (var i = 0; i <= 200; i++) { var q = i / 200; if (i) gc.lineTo(X(q), Y(curve(q))); else gc.moveTo(X(q), Y(curve(q))); } gc.stroke();
      for (var k = 0; k <= 12; k++) { var qq = k / 12; gc.fillStyle = "#4a5478"; gc.beginPath(); gc.arc(X(qq), H - m / 2, 5, 0, 2 * Math.PI); gc.fill(); gc.fillStyle = "#6c778b"; gc.fillRect(X(0) + (W - 2 * m) * curve(qq) - 2, m / 2 - 8, 4, 16); }
      gc.fillStyle = "#fff"; gc.beginPath(); gc.arc(X(p), Y(v), 11, 0, 2 * Math.PI); gc.fill();
    }
  });
};
const STAGE = (title) => ({ css: `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; }
.ez-g { position: absolute; left: 120px; top: 190px; width: 700px; height: 700px; } .ez-t { position: absolute; left: 920px; top: 490px; width: 880px; height: 100px; }
.ez-t::before { content: ""; position: absolute; left: 0; right: 0; top: 46px; height: 8px; border-radius: 4px; background: #222a42; } .ez-b { position: absolute; left: 0; top: 0; width: 100px; height: 100px; border-radius: 26px; background: linear-gradient(160deg, #a693ff, #6a4cf0); }
.ez-n { position: absolute; left: 920px; top: 330px; font-size: 64px; font-weight: 800; } .ez-n span { display: block; font-size: 34px; font-weight: 600; color: #8f9ab3; margin-top: 10px; }`,
  html: `<canvas class="ez-g" width="700" height="700"></canvas><div class="ez-n">${title}</div><div class="ez-t"><div class="ez-b"></div></div>` });
const E = (name, ease, duration, title, opts = {}, extraDefaults = {}) => T(name, {
  uses: ["drive", "eases", "noise"], fn: EASE_FN,
  options: { duration: `s (${duration})`, ease: `the curve (${ease})`, prop: "the property moved (x)", from: "start value (0)", to: "end value (780 px here)", graph: "a canvas to draw the curve on (a teaching guide; none by default)", ...opts },
  defaults: { duration, ease, prop: "x", from: 0, to: 780, graph: null, steps: 6, seed: 3, ...extraDefaults },
  demo: { ...STAGE(title), run: `MW.${name.replace("/", "-").replace(/[^a-z0-9]+([a-z0-9])/gi, (_, c) => c.toUpperCase())}(q(".ez-b"), tl, 0.5, { duration: 1.2, graph: ".ez-g" });`, duration: 2.6 },
});

export default [
  E("motion/ease-linear", "none", 1.2, "Linear<span>đều tốc, cho xoay, trôi, chữ chạy</span>"),
  E("motion/ease-out-expo", "cubic-bezier(.16,1,.3,1)", 0.4, "Ease-out expo<span>cú vào chuẩn khi còn phân vân</span>"),
  E("motion/ease-in-expo", "cubic-bezier(.7,0,.84,0)", 0.25, "Ease-in expo<span>tăng tốc rời khung</span>"),
  E("motion/ease-in-out-cubic", "cubic-bezier(.65,0,.35,1)", 0.35, "In-out cubic<span>đi từ A tới B</span>"),
  E("motion/ease-house", "house", 0.6, "House curve<span>dồn chậm, vụt giữa, đáp mềm</span>"),
  E("motion/ease-whip", "whip", 0.5, "Whip<span>vụt qua ở giữa</span>"),
  E("motion/ease-glide", "glide", 0.3, "Glide<span>mềm kiểu Material</span>"),
  E("motion/ease-out-quint", "cubic-bezier(.22,1,.36,1)", 0.7, "Ease-out quint<span>cú vào dài, mượt</span>"),
  E("motion/ease-md3-standard", "md3", 0.3, "Material 3 chuẩn<span>giao diện sản phẩm</span>"),
  E("motion/ease-md3-emphasized", "md3-emph", 0.5, "Material 3 nhấn mạnh<span>khoảnh khắc chính</span>"),
  E("motion/ease-md3-accelerate", "md3-acc", 0.2, "Material 3 tăng tốc<span>cú thoát</span>"),
  E("motion/ease-apple", "css-ease", 0.35, "Kiểu Apple<span>bằng CSS ease</span>"),
  E("motion/ease-back-out", "back.out(1.7)", 0.5, "Back out<span>vượt rồi về</span>"),
  E("motion/ease-back-in", "back.in(1.7)", 0.4, "Back in<span>lấy đà rồi lao đi</span>"),
  E("motion/ease-back-in-out", "back.inOut(1.7)", 0.6, "Back in-out<span>vượt cả hai đầu</span>"),
  T("motion/ease-sine-loop", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var si = gsap.parseEase("sine.inOut");
      return MW.drive(tl, at, o.half * 2 * o.cycles, function (t) { var u = (t / o.half) % 2, v = si(u < 1 ? u : 2 - u), s = {}; s[o.prop] = o.from + (o.to - o.from) * v; gsap.set(el, s); });
    },
    options: { half: "s each way (2)", cycles: "there-and-back cycles (1)", prop: "(y)", from: "(0)", to: "(−120 px)" }, defaults: { half: 2, cycles: 1, prop: "y", from: 0, to: -120 },
    demo: { ...STAGE("Sine in-out<span>nhịp thở, trôi nổi</span>"), run: `MW.motionEaseSineLoop(q(".ez-b"), tl, 0, { prop: "x", to: 780, half: 1.5 });`, duration: 3 },
  }),
  E("motion/ease-circ-out", "circ.out", 0.4, "Circ out<span>mạnh đầu, dừng gắt</span>"),
  E("motion/ease-elastic-out", "elastic.out(1, 0.3)", 1, "Elastic out<span>lò xo cao su</span>"),
  E("motion/ease-bounce-out", "bounce.out", 0.8, "Bounce out<span>nảy trên sàn</span>"),
  E("motion/ease-steps", "steps", 0.5, "Steps<span>giật nấc 6 bước</span>", { steps: "holds (6); the small demo's levels 0, 0.2 … 1, reaching 1 at 5/6 of the time" }),
  E("motion/ease-slowmo", "slowmo", 1.2, "SlowMo<span>nhanh, chậm, nhanh</span>", {}, {}),
  E("motion/ease-rough", "rough", 1.2, "Rough<span>tiến lên rung giật</span>", { seed: "the wobble (3)" }),
  T("motion/ease-expo-scale", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var inner = gsap.parseEase(o.inner);
      return MW.drive(tl, at, o.duration, function (t) { var p = inner(Math.max(0, Math.min(1, t / o.duration))); gsap.set(el, { scale: o.from * Math.pow(o.to / o.from, p) }); });
    },
    options: { from: "start scale (1)", to: "end scale (8)", duration: "s (1.8)", inner: "ease of the progress (none)" }, defaults: { from: 1, to: 8, duration: 1.8, inner: "none" },
    notes: "Scale interpolated in log space, so every doubling takes the same time; as a 0-1 ease for a 1 → 8 scale: (8^p − 1) / 7.",
    demo: { css: `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .xs { position: absolute; top: 0; bottom: 0; width: 50%; display: grid; place-items: center; overflow: hidden; }
.xs.a { left: 0; border-right: 3px solid #222a42; } .xs.b { right: 0; } .xs i { width: 60px; height: 60px; border-radius: 10px; background: #8b7bff; border: 4px solid #d6ccff; box-sizing: border-box; } .xs b { position: absolute; top: 80px; font-size: 46px; }`,
      html: `<div class="xs a"><i class="lin"></i><b>Tuyến tính</b></div><div class="xs b"><i class="exp"></i><b>Theo hàm mũ</b></div>`,
      run: `tl.fromTo(q(".lin"), { scale: 1 }, { scale: 8, duration: 1.8, ease: "none", immediateRender: true }, 0.5); MW.motionEaseExpoScale(q(".exp"), tl, 0.5, {});`, duration: 2.8 },
  }),
  T("motion/ease-wiggle", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      return MW.drive(tl, at, o.duration, function (t) { var p = Math.max(0, Math.min(1, t / o.duration)), d = o.decay === "exp" ? Math.exp(-4 * p) * (1 - p) : 1 - p, s = {}; s[o.prop] = o.amp * Math.sin(o.wiggles * 2 * Math.PI * p) * d; gsap.set(el, s); });
    },
    options: { wiggles: "swings (6)", amp: "amplitude (28.6° or px)", duration: "s (0.6; the small demo's bell 0.9)", prop: "rotation, x or y", decay: "linear (default) or exp" },
    defaults: { wiggles: 6, amp: 28.6, duration: 0.6, prop: "rotation", decay: "linear" },
    demo: { css: `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); } .wg { position: absolute; inset: 0; display: grid; place-items: center; } .wg div { transform-origin: 50% 8%; }`,
      html: `<div class="wg"><div class="bell"><svg viewBox="0 0 48 48" width="320" height="320"><path d="M24 6c-7 0-12 5.5-12 12.5V27l-4 6h32l-4-6v-8.5C36 11.5 31 6 24 6z" fill="#ffd27a"/><circle cx="24" cy="38" r="4.5" fill="#ffb547"/></svg></div></div>`,
      run: `MW.motionEaseWiggle(q(".bell"), tl, 0.4, { duration: 0.9 }); MW.motionEaseWiggle(q(".bell"), tl, 1.8, { duration: 0.9 });`, duration: 3 },
  }),
  T("motion/bounce-squash", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var bo = gsap.parseEase("bounce.out");
      el.style.transformOrigin = "50% 100%";
      return MW.drive(tl, at, o.duration, function (t) {
        var p = Math.max(0, Math.min(1, t / o.duration)), v = bo(p), h = o.drop * (1 - v), near = 1 - v < 0.04 && p > 0.05, sq = near ? o.squash * (1 - p) : 0, vel = (bo(Math.min(1, p + 0.01)) - bo(Math.max(0, p - 0.01))) / 0.02, st = !near ? Math.min(0.12, Math.abs(vel) * 0.03) : 0;
        gsap.set(el, { y: -h, scaleY: 1 - sq + st, scaleX: 1 + sq - st * 0.6 });
      });
    },
    options: { drop: "px (560)", duration: "s (1.6), bounce.out (contacts at 36 / 73 / 91 %)", squash: "at the first contact (0.32 here; 0.5 × (1 − p))" }, defaults: { drop: 560, duration: 1.6, squash: 0.5 },
    demo: { css: `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); } .bs { position: absolute; left: 50%; top: 820px; width: 180px; height: 180px; margin: -180px 0 0 -90px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #9af2ff, #2bb7e6 60%, #1278ad); }
.fl { position: absolute; left: 560px; right: 560px; top: 820px; height: 6px; background: #2a3350; border-radius: 3px; }`, html: `<div class="fl"></div><div class="bs"></div>`, run: `MW.motionBounceSquash(q(".bs"), tl, 0.3, {});`, duration: 2.4 },
  }),
];

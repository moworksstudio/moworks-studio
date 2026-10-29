// Magic UI scroll-progress (apps/www/registry/magicui/scroll-progress.tsx at efe76fc): a 1 px bar along the top of the page,
// linear-gradient to right #A97CF8 -> #F38CB8 -> #FDCC92, scaleX = the page's scroll progress (origin left). Port: the scroll progress
// becomes the film's time over `duration` (or keys), so the bar can follow a read-through or a voice-over.
export default {
  id: "scroll-progress",
  kind: "motion",
  title: "Scroll Progress",
  sub: "Thanh tiến độ gradient ở mép trên",
  desc: "A thin gradient bar along the top edge (purple, pink, peach) filling from left to right as the scene plays, like a reading progress bar.",
  category: "Lines & beams",
  tags: ["progress", "bar", "line", "gradient", "reading", "magicui"],
  source: { path: "apps/www/registry/magicui/scroll-progress.tsx" },
  notes: "Scroll -> film time. progress: [[t, 0..1], ...] for uneven reading (linear between keys); else linear over duration. height 1 px as upstream; thicker reads better on video.",
  options: { duration: "s (5)", progress: "[[t, p], ...] (none)", height: "px (1)" },
  defaults: { duration: 5, progress: null, height: 1 },
  css: `.mw-scroll-progress { position: absolute; left: 0; right: 0; top: 0; z-index: 50; transform-origin: left; background: linear-gradient(to right, #A97CF8, #F38CB8, #FDCC92); }`,
  markup: `<div class="mw-scroll-progress"></div>`,
  fn: function (el, tl, at, o) {
    el.style.height = o.height + "px";
    if (!o.progress) { tl.fromTo(el, { scaleX: 0 }, { scaleX: 1, duration: o.duration, ease: "none", immediateRender: true }, at); return at + o.duration; }
    var K = o.progress, s = { t: 0 }, set = function () {
      var p = K[0][1];
      for (var k = 1; k < K.length; k++) if (s.t <= K[k][0]) { var a = K[k - 1], b = K[k]; p = a[1] + (b[1] - a[1]) * (s.t - a[0]) / (b[0] - a[0]); break; } else p = K[k][1];
      el.style.transform = "scaleX(" + p + ")";
    };
    set();
    var end = K[K.length - 1][0];
    tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 6,
    css: `.article { width: 1300px; } .article h1 { margin: 0 0 30px; font-size: 80px; } .article p { font-size: 34px; line-height: 1.6; opacity: .7; margin: 0 0 24px; }`,
    html: `<div class="mw-scroll-progress"></div><div class="center"><div class="article"><h1>Cách làm video giải thích</h1>
<p>Bắt đầu từ câu chuyện: một vấn đề, một giải pháp, một lời kêu gọi. Mỗi cảnh chỉ nói một ý.</p><p>Chuyển động phải phục vụ ý nghĩa: chữ vào khi giọng đọc nhắc tới, hình ảnh rời đi khi ý đã xong.</p></div></div>`,
    run: `MW.scrollProgress(q(".mw-scroll-progress"), tl, 0.3, { height: 10, progress: [[0, 0], [1.5, 0.3], [2.5, 0.35], [4.5, 0.9], [5.4, 1]] });`,
  },
};

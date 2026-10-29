// Magic UI animated-list (apps/www/registry/magicui/animated-list.tsx at efe76fc): a live feed: every `delay` (1000 ms) the next item
// appears at the top (newest first) and pushes the others down; each item enters with scale 0 -> 1 and opacity 0 -> 1 from its top edge
// (originY 0) on a spring (stiffness 350, damping 40, mass 1), and motion's layout animation moves the older ones with the same spring;
// it stops at the last item; gap 16 px. Port: entry times on the film's timeline; the push is each item's y following the spring as the
// heights above it grow (measured once).
export default {
  id: "animated-list",
  kind: "block",
  title: "Animated List",
  sub: "Danh sách sự kiện đổ về liên tục",
  desc: "A live activity feed: every second a new notification pops in at the top and pushes the older ones down (payments, sign-ups, messages).",
  category: "UI & mockups",
  tags: ["list", "feed", "notifications", "activity", "stack", "saas", "magicui"],
  source: { path: "apps/www/registry/magicui/animated-list.tsx" },
  notes: "el holds the items in the order they arrive (first child first). Upstream's demo row (40 px icon tile, name · time, a line) is the demo here, with Vietnamese text and emoji.",
  options: { delay: "s between items (1)", gap: "px (16)" },
  defaults: { delay: 1, gap: 16 },
  uses: ["spring"],
  css: `.mw-animated-list { position: relative; }
.mw-animated-list > * { position: absolute; left: 0; right: 0; top: 0; margin: 0 auto; transform-origin: 50% 0%; }`,
  markup: `<div class="mw-animated-list"><div>…</div><div>…</div></div>`,
  fn: function (el, tl, at, o) {
    var items = Array.prototype.slice.call(el.children), H = items.map(function (n) { return n.offsetHeight; }), sp = MW.spring(350, 40, 1), n = items.length;
    var s = { t: 0 }, set = function () {
      // scale of item i (entered at i x delay) on the spring; its top is the sum of the scaled heights (and gaps) of the newer items above it
      var k = items.map(function (_, i) { var u = s.t - i * o.delay; return u <= 0 ? 0 : u >= sp.duration ? 1 : sp.ease(u / sp.duration); });
      for (var i = 0; i < n; i++) {
        var y = 0;
        for (var j = i + 1; j < n; j++) y += (H[j] + o.gap) * k[j];
        items[i].style.transform = "translateY(" + y + "px) scale(" + k[i] + ")";
        items[i].style.opacity = Math.min(1, k[i]);
      }
    };
    set();
    var end = (n - 1) * o.delay + sp.duration;
    tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 8,
    css: `.feed { position: relative; width: 860px; height: 900px; overflow: hidden; }
.feed::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 25%; background: linear-gradient(to top, var(--bg), transparent); }
.note { width: 820px; border-radius: 26px; padding: 26px; display: flex; gap: 22px; align-items: center; background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.1); box-shadow: inset 0 -20px 80px -20px #ffffff1f; }
.note i { flex: none; width: 80px; height: 80px; border-radius: 26px; display: grid; place-items: center; font-style: normal; font-size: 40px; }
.note b { font-size: 34px; font-weight: 600; } .note b small { font-size: 22px; font-weight: 400; opacity: .5; margin-left: 10px; } .note p { margin: 6px 0 0; font-size: 26px; opacity: .65; }`,
    html: `<div class="center"><div class="feed"><div class="mw-animated-list">
<div class="note"><i style="background:#00C9A7">💸</i><div><b>Đã nhận thanh toán<small>15 phút trước</small></b><p>Moworks Studio</p></div></div>
<div class="note"><i style="background:#FFB800">👤</i><div><b>Người dùng mới<small>10 phút trước</small></b><p>Đăng ký từ Đà Nẵng</p></div></div>
<div class="note"><i style="background:#FF3D71">💬</i><div><b>Tin nhắn mới<small>5 phút trước</small></b><p>Khách hàng hỏi về gói Studio</p></div></div>
<div class="note"><i style="background:#1E86FF">🗞️</i><div><b>Sự kiện mới<small>2 phút trước</small></b><p>Ra mắt bản cập nhật tháng 10</p></div></div>
<div class="note"><i style="background:#00C9A7">💸</i><div><b>Đã nhận thanh toán<small>vừa xong</small></b><p>Gói doanh nghiệp</p></div></div>
<div class="note"><i style="background:#FFB800">👤</i><div><b>Người dùng mới<small>vừa xong</small></b><p>Đăng ký từ Hà Nội</p></div></div>
</div></div></div>`,
    run: `MW.animatedList(q(".mw-animated-list"), tl, 0.3, { delay: 1 });`,
  },
};

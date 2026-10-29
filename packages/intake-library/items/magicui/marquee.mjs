// Magic UI marquee (apps/www/registry/magicui/marquee.tsx at efe76fc): the children repeated `repeat` (4) times, each copy translating
// 0 -> calc(-100% - gap) over --duration (40 s), linear, forever (vertical: translateY; reverse: animation-direction reverse); gap 1rem,
// padding 8 px. Port: the same copies; the offset is a function of the film's time, so any frame seeks exactly.
export default {
  id: "marquee",
  kind: "motion",
  title: "Marquee",
  sub: "Dải nội dung chạy ngang vô tận",
  desc: "An endless row (or column) of items, such as logos, review cards or words, scrolling at a constant speed; two rows in opposite directions for a wall.",
  category: "Movement & loops",
  tags: ["marquee", "ticker", "logos", "testimonials", "loop", "row", "magicui"],
  source: { path: "apps/www/registry/magicui/marquee.tsx" },
  notes: "el is the marquee box; its children are the items. pauseOnHover has no meaning in a film. Upstream's demo avatars and logos (remote) are not taken.",
  options: { duration: "s per copy (40)", gap: "px (16)", repeat: "copies (4)", reverse: "false", vertical: "false", hold: "seconds (10)" },
  defaults: { duration: 40, gap: 16, repeat: 4, reverse: false, vertical: false, hold: 10 },
  css: `.mw-marquee { display: flex; overflow: hidden; padding: 8px; gap: var(--mw-mq-gap, 16px); }
.mw-marquee.vertical { flex-direction: column; }
.mw-marquee > .mw-mq-copy { display: flex; flex-shrink: 0; justify-content: space-around; gap: var(--mw-mq-gap, 16px); }
.mw-marquee.vertical > .mw-mq-copy { flex-direction: column; }`,
  markup: `<div class="mw-marquee"><div>A</div><div>B</div><div>C</div></div>`,
  fn: function (el, tl, at, o) {
    el.style.setProperty("--mw-mq-gap", o.gap + "px");
    if (o.vertical) el.classList.add("vertical");
    var items = Array.prototype.slice.call(el.children), first = document.createElement("div");
    first.className = "mw-mq-copy"; items.forEach(function (n) { first.appendChild(n); }); el.appendChild(first);
    var copies = [first];
    for (var i = 1; i < o.repeat; i++) { var c = first.cloneNode(true); c.setAttribute("aria-hidden", "true"); el.appendChild(c); copies.push(c); }
    var size = (o.vertical ? first.offsetHeight : first.offsetWidth) + o.gap;          // calc(-100% - gap)
    var s = { t: 0 };
    var set = function () {
      var f = (s.t % o.duration) / o.duration; if (o.reverse) f = 1 - f;
      var v = -size * f, tr = o.vertical ? "translateY(" + v + "px)" : "translateX(" + v + "px)";
      for (var i = 0; i < copies.length; i++) copies[i].style.transform = tr;
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    css: `.wall { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; gap: 24px; }
.review { width: 520px; padding: 32px; border-radius: 22px; border: 2px solid rgba(250,250,250,.1); background: rgba(250,250,250,.04); }
.review .who { display: flex; align-items: center; gap: 18px; margin-bottom: 16px; } .review i { width: 64px; height: 64px; border-radius: 50%; display: block; }
.review b { font-size: 30px; display: block; } .review small { font-size: 24px; opacity: .5; } .review p { margin: 0; font-size: 28px; line-height: 1.4; opacity: .85; }
.fade { position: absolute; top: 0; bottom: 0; width: 25%; pointer-events: none; z-index: 2; } .fade.l { left: 0; background: linear-gradient(to right, var(--bg), transparent); } .fade.r { right: 0; background: linear-gradient(to left, var(--bg), transparent); }`,
    html: `<div class="wall">
  <div class="mw-marquee r1">
    <div class="review"><div class="who"><i style="background:linear-gradient(135deg,#f97316,#ec4899)"></i><div><b>Minh Anh</b><small>@minhanh</small></div></div><p>Làm video nhanh gấp ba, chữ tiếng Việt đẹp.</p></div>
    <div class="review"><div class="who"><i style="background:linear-gradient(135deg,#22d3ee,#6366f1)"></i><div><b>Quốc Bảo</b><small>@quocbao</small></div></div><p>Chuyển động mượt, khách hàng rất thích.</p></div>
    <div class="review"><div class="who"><i style="background:linear-gradient(135deg,#a3e635,#14b8a6)"></i><div><b>Thu Hà</b><small>@thuha</small></div></div><p>Không cần After Effects cho video ngắn.</p></div>
  </div>
  <div class="mw-marquee r2">
    <div class="review"><div class="who"><i style="background:linear-gradient(135deg,#facc15,#f43f5e)"></i><div><b>Đức Huy</b><small>@duchuy</small></div></div><p>Thư viện chuyển động phong phú, dễ dùng.</p></div>
    <div class="review"><div class="who"><i style="background:linear-gradient(135deg,#c084fc,#0ea5e9)"></i><div><b>Ngọc Lan</b><small>@ngoclan</small></div></div><p>Xuất video 4K trong vài phút.</p></div>
    <div class="review"><div class="who"><i style="background:linear-gradient(135deg,#fb7185,#fbbf24)"></i><div><b>Văn Tùng</b><small>@vantung</small></div></div><p>Đội ngũ hỗ trợ nhiệt tình.</p></div>
  </div>
</div><div class="fade l"></div><div class="fade r"></div>`,
    run: `MW.marquee(q(".r1"), tl, 0, { duration: 20, gap: 24, hold: 8 });
MW.marquee(q(".r2"), tl, 0, { duration: 20, gap: 24, reverse: true, hold: 8 });`,
  },
};

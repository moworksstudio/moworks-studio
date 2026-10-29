// Magic UI avatar-circles (apps/www/registry/magicui/avatar-circles.tsx at efe76fc): a row of round avatars (40 px, 2 px white / gray-800
// border) overlapping by 16 px (-space-x-4), ending in a "+N" bubble (black, white text xs medium). Static upstream; its demo avatars are
// real people's GitHub pictures (not taken). Port: the same row with the film's pictures (or drawn initials); `enter` (this port's
// option) lifts them in one by one.
export default {
  id: "avatar-circles",
  kind: "block",
  title: "Avatar Circles",
  sub: "Hàng avatar chồng nhau và +N",
  desc: "A row of overlapping round avatars ending in a '+N' bubble, for social proof ('joined by 2,000 creators').",
  category: "Social & ads",
  tags: ["avatars", "people", "social proof", "users", "row", "magicui"],
  source: { path: "apps/www/registry/magicui/avatar-circles.tsx" },
  notes: "el holds the avatars (img or any element) in order; numPeople adds the +N bubble. enter: null (static, as upstream) | pop (each 0.08 s apart).",
  options: { numPeople: "0", size: "px (40)", enter: "null | pop", each: "s (0.08)" },
  defaults: { numPeople: 0, size: 40, enter: null, each: 0.08 },
  uses: ["spring"],
  css: `.mw-avatar-circles { position: relative; z-index: 10; display: flex; }
.mw-avatar-circles > * { border-radius: 9999px; border: 2px solid #1f2937; object-fit: cover; flex: none; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.mw-avatar-circles > * + * { margin-left: -16px; }
.mw-avatar-circles > .mw-ac-more { background: #fff; color: #000; font-weight: 500; text-align: center; }`,
  markup: `<div class="mw-avatar-circles"><img src="a.png" alt=""><img src="b.png" alt=""></div>`,
  fn: function (el, tl, at, o) {
    var list = Array.prototype.slice.call(el.children);
    if (o.numPeople > 0) { var m = document.createElement("div"); m.className = "mw-ac-more"; m.textContent = "+" + o.numPeople; m.style.fontSize = o.size * 0.3 + "px"; el.appendChild(m); list.push(m); }
    list.forEach(function (n) { n.style.width = n.style.height = o.size + "px"; });
    if (!o.enter) return at;
    var sp = MW.spring(500, 25, 1);
    list.forEach(function (n, i) { tl.fromTo(n, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: sp.duration, ease: sp.ease, immediateRender: true }, at + i * o.each); });
    return at + (list.length - 1) * o.each + sp.duration;
  },
  demo: {
    duration: 4,
    css: `.proof { display: flex; flex-direction: column; align-items: center; gap: 40px; } .proof p { margin: 0; font-size: 44px; font-weight: 600; }
.mw-avatar-circles > i { font-style: normal; color: #fff; font-weight: 700; }`,
    html: `<div class="center"><div class="proof"><div class="mw-avatar-circles">
<i style="background:linear-gradient(135deg,#f97316,#ec4899);font-size:48px">A</i><i style="background:linear-gradient(135deg,#22d3ee,#6366f1);font-size:48px">B</i>
<i style="background:linear-gradient(135deg,#a3e635,#14b8a6);font-size:48px">H</i><i style="background:linear-gradient(135deg,#facc15,#f43f5e);font-size:48px">L</i>
<i style="background:linear-gradient(135deg,#c084fc,#0ea5e9);font-size:48px">M</i><i style="background:linear-gradient(135deg,#fb7185,#fbbf24);font-size:48px">T</i></div>
<p>Hơn 2.000 nhà sáng tạo đã tham gia</p></div></div>`,
    run: `MW.avatarCircles(q(".mw-avatar-circles"), tl, 0.4, { numPeople: 99, size: 140, enter: "pop" });`,
  },
};

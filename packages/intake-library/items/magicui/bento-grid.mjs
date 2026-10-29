// Magic UI bento-grid (apps/www/registry/magicui/bento-grid.tsx at efe76fc): a 3-column grid (auto rows 22rem, gap 16 px) of feature
// cards (radius 12; dark: inset 0 -20px 80px -20px #ffffff1f and a 1 px white/10 border) of uneven spans, each with a live background, an
// icon (48 px), a title (xl semibold) and a description; on hover (300 ms, cubic-bezier(0.4, 0, 0.2, 1)) the text lifts 40 px, the icon
// shrinks to 0.75 (origin left), a "Learn more" link rises from +40 px and fades in, an overlay darkens 3 %. Port: the grid and cards;
// the hover becomes a scripted focus pass card by card (`focus`: [[t, card index, seconds]]); backgrounds are any of the film's content.
export default {
  id: "bento-grid",
  kind: "block",
  title: "Bento Grid",
  sub: "Lưới thẻ tính năng kiểu bento",
  desc: "A bento grid of feature cards with uneven spans, each lifting its text and revealing a 'learn more' link when it gets the focus, card by card.",
  category: "UI & mockups",
  tags: ["bento", "grid", "features", "cards", "saas", "layout", "magicui"],
  source: { path: "apps/www/registry/magicui/bento-grid.tsx" },
  notes: "el is the grid; each card has .mw-bg-bg (background), .mw-bg-icon, h3, p and .mw-bg-cta inside. focus: [[t, index, seconds], ...] in s after `at`.",
  options: { focus: "[[t, card, seconds], ...]" },
  defaults: { focus: [] },
  uses: ["bezier"],
  css: `.mw-bento-grid { display: grid; width: 100%; grid-auto-rows: 22rem; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.mw-bento-grid > .mw-bento-card { position: relative; display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden; border-radius: 12px; background: #0a0a0a;
  box-shadow: inset 0 -20px 80px -20px #ffffff1f; border: 1px solid rgba(255,255,255,0.1); }
.mw-bento-card > .mw-bg-bg { position: absolute; inset: 0; }
.mw-bento-card > .mw-bg-body { position: relative; z-index: 10; display: flex; flex-direction: column; gap: 4px; padding: 16px; pointer-events: none; }
.mw-bento-card .mw-bg-icon { width: 48px; height: 48px; transform-origin: left; color: #d4d4d4; }
.mw-bento-card h3 { margin: 0; font-size: 20px; font-weight: 600; color: #d4d4d4; } .mw-bento-card p { margin: 0; max-width: 32rem; color: #a3a3a3; }
.mw-bento-card > .mw-bg-cta { position: absolute; bottom: 0; z-index: 10; padding: 16px; opacity: 0; font-size: 14px; font-weight: 500; }
.mw-bento-card > .mw-bg-shade { position: absolute; inset: 0; pointer-events: none; }`,
  markup: `<div class="mw-bento-grid"><div class="mw-bento-card"><div class="mw-bg-bg"></div><div class="mw-bg-body"><svg class="mw-bg-icon"></svg><h3>…</h3><p>…</p></div><div class="mw-bg-cta">Learn more →</div></div></div>`,
  fn: function (el, tl, at, o) {
    var cards = Array.prototype.slice.call(el.querySelectorAll(":scope > .mw-bento-card")), e = MW.bezier(0.4, 0, 0.2, 1), end = at;
    cards.forEach(function (c) { if (!c.querySelector(".mw-bg-shade")) { var s = document.createElement("div"); s.className = "mw-bg-shade"; c.appendChild(s); } });
    o.focus.forEach(function (f) {
      var c = cards[f[1]], body = c.querySelector(".mw-bg-body"), icon = c.querySelector(".mw-bg-icon"), cta = c.querySelector(".mw-bg-cta"), shade = c.querySelector(".mw-bg-shade"), t0 = at + f[0], t1 = t0 + f[2];
      var on = { duration: 0.3, ease: e }, ins = [[body, { y: 0 }, { y: -40 }], [icon, { scale: 1 }, { scale: 0.75 }], [cta, { y: 40, opacity: 0 }, { y: 0, opacity: 1 }], [shade, { backgroundColor: "rgba(0,0,0,0)" }, { backgroundColor: "rgba(38,38,38,0.1)" }]];
      ins.forEach(function (p) { tl.fromTo(p[0], p[1], Object.assign({}, p[2], on, { immediateRender: false }), t0); tl.fromTo(p[0], p[2], Object.assign({}, p[1], on, { immediateRender: false }), t1); });
      gsap.set(cta, { y: 40 });
      end = Math.max(end, t1 + 0.3);
    });
    return end;
  },
  demo: {
    duration: 8,
    css: `.mw-bento-grid { width: 1700px; grid-auto-rows: 400px; gap: 24px; } .mw-bento-card { border-radius: 24px !important; } .mw-bg-body { padding: 34px !important; gap: 10px !important; }
.mw-bento-card h3 { font-size: 40px; } .mw-bento-card p { font-size: 26px; } .mw-bento-card .mw-bg-icon { width: 72px; height: 72px; } .mw-bg-cta { padding: 34px !important; font-size: 26px !important; }
.span2 { grid-column: span 2; } .mw-bg-bg.g1 { background: radial-gradient(circle at 80% 20%, rgba(124,58,237,.45), transparent 60%); } .mw-bg-bg.g2 { background: radial-gradient(circle at 20% 20%, rgba(14,165,233,.4), transparent 60%); }
.mw-bg-bg.g3 { background: radial-gradient(circle at 70% 30%, rgba(236,72,153,.4), transparent 60%); } .mw-bg-bg.g4 { background: radial-gradient(circle at 30% 30%, rgba(34,197,94,.35), transparent 60%); }`,
    html: `<div class="center"><div class="mw-bento-grid">
<div class="mw-bento-card"><div class="mw-bg-bg g1"></div><div class="mw-bg-body"><svg class="mw-bg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16v12H4zM8 20h8"/></svg><h3>Lưu tự động</h3><p>Mọi thay đổi được ghi lại.</p></div><div class="mw-bg-cta">Tìm hiểu thêm →</div></div>
<div class="mw-bento-card span2"><div class="mw-bg-bg g2"></div><div class="mw-bg-body"><svg class="mw-bg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18"/></svg><h3>Xuất đa định dạng</h3><p>16:9, 9:16, 1:1 trong một lần bấm.</p></div><div class="mw-bg-cta">Tìm hiểu thêm →</div></div>
<div class="mw-bento-card span2"><div class="mw-bg-bg g3"></div><div class="mw-bg-body"><svg class="mw-bg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3l2.5 6 6.5.5-5 4.2 1.6 6.3L12 16.7 6.4 20 8 13.7 3 9.5 9.5 9z"/></svg><h3>Thư viện chuyển động</h3><p>Hàng trăm mẫu có ghi công rõ ràng.</p></div><div class="mw-bg-cta">Tìm hiểu thêm →</div></div>
<div class="mw-bento-card"><div class="mw-bg-bg g4"></div><div class="mw-bg-body"><svg class="mw-bg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12h4l3 7 4-14 3 7h2"/></svg><h3>Phụ đề tiếng Việt</h3><p>Tách dòng đúng chữ.</p></div><div class="mw-bg-cta">Tìm hiểu thêm →</div></div>
</div></div>`,
    run: `MW.bentoGrid(q(".mw-bento-grid"), tl, 0.3, { focus: [[0.3, 0, 1.3], [1.9, 1, 1.3], [3.5, 2, 1.3], [5.1, 3, 1.3]] });`,
  },
};

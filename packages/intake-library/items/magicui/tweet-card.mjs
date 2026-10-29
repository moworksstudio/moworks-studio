// Magic UI tweet-card (apps/www/registry/magicui/tweet-card.tsx at efe76fc): a static card for one post fetched from X by id (react-tweet):
// rounded-xl border, padding, a 40 px round avatar, the name with a verified badge and the handle, the X bird at the right, the text at
// 15 px relaxed, then photos (h-64, rounded-xl) or a video. Port: no network at render (the film's CSP forbids it): the post is given as
// options; the X bird and X's verified mark (trademarks) are replaced by a neutral check badge; `enter` (this port's option) slides it in.
export default {
  id: "tweet-card",
  kind: "block",
  title: "Tweet Card",
  sub: "Thẻ bài đăng X tĩnh",
  desc: "A social post card (avatar, name, badge, handle, text, optional picture) built from the post's own text, for testimonial and social-proof scenes.",
  category: "Social & ads",
  tags: ["social", "post", "tweet", "x", "testimonial", "card", "magicui"],
  source: { path: "apps/www/registry/magicui/tweet-card.tsx" },
  notes: "Upstream fetches the post from X at runtime: here everything is an option. The X logo and X's verified mark are trademarks and are not drawn. avatar: a picture path (or a colour for drawn initials).",
  options: { name: "display name", handle: "@handle", text: "post text", avatar: "picture path or CSS colour", verified: "true", image: "picture path (none)", enter: "null | rise", enterDuration: "s (0.8)" },
  defaults: { name: "Moworks Studio", handle: "@moworks", text: "", avatar: "linear-gradient(135deg,#6366f1,#ec4899)", verified: true, image: null, enter: null, enterDuration: 0.8 },
  css: `.mw-tweet-card { position: relative; display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 32rem; overflow: hidden; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); padding: 16px; background: #0a0a0a; }
.mw-tweet-card .mw-tc-head { display: flex; align-items: flex-start; justify-content: space-between; }
.mw-tweet-card .mw-tc-who { display: flex; align-items: center; gap: 12px; }
.mw-tweet-card .mw-tc-av { width: 40px; height: 40px; flex: none; border-radius: 9999px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); display: grid; place-items: center; color: #fff; font-weight: 700; }
.mw-tweet-card .mw-tc-av img { width: 100%; height: 100%; object-fit: cover; }
.mw-tweet-card .mw-tc-name { display: flex; align-items: center; font-weight: 500; white-space: nowrap; }
.mw-tweet-card .mw-tc-name svg { margin-left: 4px; width: 16px; height: 16px; }
.mw-tweet-card .mw-tc-handle { font-size: 14px; opacity: .55; }
.mw-tweet-card .mw-tc-text { font-size: 15px; line-height: 1.625; overflow-wrap: break-word; }
.mw-tweet-card .mw-tc-img { height: 16rem; width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); object-fit: cover; }`,
  markup: `<div class="mw-tweet-card"></div>`,
  fn: function (el, tl, at, o) {
    var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
    var av = /\.(png|jpe?g|svg|webp)$/i.test(o.avatar) ? '<img src="' + esc(o.avatar) + '" alt="">' : esc(o.name.trim().charAt(0).toUpperCase());
    el.innerHTML = '<div class="mw-tc-head"><div class="mw-tc-who"><div class="mw-tc-av"' + (/\.(png|jpe?g|svg|webp)$/i.test(o.avatar) ? "" : ' style="background:' + esc(o.avatar) + '"') + '>' + av + '</div>' +
      '<div><div class="mw-tc-name">' + esc(o.name) + (o.verified ? '<svg viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 2l2.4 2.2 3.2-.4.9 3.1 2.9 1.5-1 3.1 1 3.1-2.9 1.5-.9 3.1-3.2-.4L12 22l-2.4-2.2-3.2.4-.9-3.1-2.9-1.5 1-3.1-1-3.1 2.9-1.5.9-3.1 3.2.4z"/><path d="m8 12 3 3 5-6" stroke="#fff" stroke-width="2" fill="none"/></svg>' : "") +
      '</div><div class="mw-tc-handle">' + esc(o.handle) + '</div></div></div></div><div class="mw-tc-text">' + esc(o.text) + "</div>" + (o.image ? '<img class="mw-tc-img" src="' + esc(o.image) + '" alt="">' : "");
    if (!o.enter) return at;
    tl.fromTo(el, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: o.enterDuration, ease: "power3.out", immediateRender: true }, at);
    return at + o.enterDuration;
  },
  assets: [{ path: "picture.svg", data: (await import("../../demo-media.mjs")).LANDSCAPE }],
  demo: {
    duration: 4,
    css: `.mw-tweet-card { max-width: none; width: 1000px; padding: 40px; gap: 30px; border-radius: 30px; } .mw-tweet-card .mw-tc-av { width: 96px; height: 96px; font-size: 44px; }
.mw-tweet-card .mw-tc-name { font-size: 38px; } .mw-tweet-card .mw-tc-name svg { width: 36px; height: 36px; } .mw-tweet-card .mw-tc-handle { font-size: 30px; }
.mw-tweet-card .mw-tc-text { font-size: 38px; } .mw-tweet-card .mw-tc-img { height: 340px; border-radius: 24px; }`,
    html: `<div class="center"><div class="mw-tweet-card"></div></div>`,
    run: `MW.tweetCard(q(".mw-tweet-card"), tl, 0.3, { name: "Ngọc Lan", handle: "@ngoclan.design", avatar: "linear-gradient(135deg,#f97316,#ec4899)", text: "Vừa làm xong video ra mắt sản phẩm trong một buổi chiều. Chuyển động mượt, chữ tiếng Việt đẹp, khách duyệt ngay 🎉", image: "assets/picture.svg", enter: "rise" });`,
  },
};

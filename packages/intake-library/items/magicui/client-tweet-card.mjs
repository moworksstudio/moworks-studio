// Magic UI client-tweet-card (apps/www/registry/magicui/client-tweet-card.tsx at efe76fc): the tweet card fetched in the browser
// (react-tweet's useTweet) with a skeleton while it loads: a 40 px circle and lines (h-10, h-20, pulsing) in the card's shape, replaced by the
// post when it arrives. Port: no network at render: the "load" is a time; the skeleton pulses (Tailwind's animate-pulse: opacity 1 -> 0.5
// -> 1, 2 s, cubic-bezier(0.4, 0, 0.6, 1)) until `loaded`, then the post (built like tweet-card) fades in.
export default {
  id: "client-tweet-card",
  kind: "block",
  title: "Client Tweet Card",
  sub: "Thẻ bài đăng X có khung chờ",
  desc: "A social post card that first shows a pulsing loading skeleton, then the post appears: avatar, name, handle and text.",
  category: "Social & ads",
  tags: ["social", "post", "tweet", "skeleton", "loading", "card", "magicui"],
  source: { path: "apps/www/registry/magicui/client-tweet-card.tsx" },
  notes: "No fetch: the post is given as options and `loaded` is when it appears. The X logo and X's verified mark are trademarks and are not drawn.",
  options: { name: "display name", handle: "@handle", text: "post text", avatar: "CSS colour or picture", loaded: "s after `at` (1.6)" },
  defaults: { name: "Moworks Studio", handle: "@moworks", text: "", avatar: "linear-gradient(135deg,#22d3ee,#6366f1)", loaded: 1.6 },
  uses: ["bezier"],
  css: `.mw-client-tweet-card { position: relative; width: 100%; max-width: 32rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); padding: 16px; background: #0a0a0a; }
.mw-client-tweet-card .mw-ct-skel, .mw-client-tweet-card .mw-ct-post { display: flex; flex-direction: column; gap: 16px; }
.mw-client-tweet-card .mw-ct-post { position: absolute; inset: 16px; opacity: 0; }
.mw-client-tweet-card .mw-ct-row { display: flex; align-items: center; gap: 12px; }
.mw-client-tweet-card .mw-ct-skel i { display: block; border-radius: 6px; background: rgba(255,255,255,0.1); }
.mw-client-tweet-card .mw-ct-av { width: 40px; height: 40px; border-radius: 9999px; flex: none; display: grid; place-items: center; color: #fff; font-weight: 700; }
.mw-client-tweet-card .mw-ct-name { font-weight: 500; } .mw-client-tweet-card .mw-ct-handle { font-size: 14px; opacity: .55; } .mw-client-tweet-card .mw-ct-text { font-size: 15px; line-height: 1.625; }`,
  markup: `<div class="mw-client-tweet-card"></div>`,
  fn: function (el, tl, at, o) {
    var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
    el.innerHTML = '<div class="mw-ct-skel"><div class="mw-ct-row"><i style="width:40px;height:40px;border-radius:9999px"></i><div style="flex:1;display:flex;flex-direction:column;gap:6px"><i style="height:14px;width:40%"></i><i style="height:12px;width:25%"></i></div></div>' +
      '<i style="height:40px;width:100%"></i><i style="height:80px;width:100%"></i></div>' +
      '<div class="mw-ct-post"><div class="mw-ct-row"><div class="mw-ct-av" style="background:' + esc(o.avatar) + '">' + esc(o.name.trim().charAt(0).toUpperCase()) + '</div>' +
      '<div><div class="mw-ct-name">' + esc(o.name) + '</div><div class="mw-ct-handle">' + esc(o.handle) + '</div></div></div><div class="mw-ct-text">' + esc(o.text) + "</div></div>";
    var skel = el.querySelector(".mw-ct-skel"), post = el.querySelector(".mw-ct-post"), pulse = MW.bezier(0.4, 0, 0.6, 1), s = { t: 0 };
    var set = function () {
      var f = (s.t % 2) / 2, op = f < 0.5 ? 1 - 0.5 * pulse(f * 2) : 0.5 + 0.5 * pulse(f * 2 - 1);
      var k = Math.max(0, Math.min(1, (s.t - o.loaded) / 0.3));
      skel.style.opacity = s.t < o.loaded ? op : op * (1 - k); post.style.opacity = k;
    };
    set();
    var end = o.loaded + 0.3;
    tl.fromTo(s, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 5,
    css: `.mw-client-tweet-card { max-width: none; width: 1000px; padding: 40px; border-radius: 30px; } .mw-client-tweet-card .mw-ct-post { inset: 40px; }
.mw-ct-skel, .mw-ct-post { gap: 30px !important; } .mw-ct-av, .mw-ct-skel .mw-ct-row > i { width: 96px !important; height: 96px !important; font-size: 44px; }
.mw-ct-skel i[style*="height:40px;width:100%"] { height: 90px !important; } .mw-ct-skel i[style*="height:80px"] { height: 160px !important; }
.mw-ct-name { font-size: 38px; } .mw-ct-handle { font-size: 30px !important; } .mw-ct-text { font-size: 38px !important; }`,
    html: `<div class="center"><div class="mw-client-tweet-card"></div></div>`,
    run: `MW.clientTweetCard(q(".mw-client-tweet-card"), tl, 0.2, { name: "Quốc Bảo", handle: "@quocbao.dev", text: "Moworks Studio giúp team mình ra video tính năng mỗi tuần. Không còn chờ dựng hình nữa.", loaded: 2.4 });`,
  },
};

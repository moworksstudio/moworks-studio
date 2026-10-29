// TakayuStudio, Titles & Film and Layout & Reflow (batch 3.2): film titles, credits and text that reflows, written here from the site's
// ideas and numbers (no code of the site). Sizes are the reference's 320 px frame × 5 unless an option says otherwise; times are seconds
// from `at`. Vietnamese marks get room above and below wherever text is clipped.
import { T } from "../../takayu/define.mjs";
import { headline, demo, CURSOR } from "../../takayu/stages.mjs";
import { LANDSCAPE, ABSTRACT } from "../../demo-media.mjs";

const H = (text, run, duration = 4, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);
const DARK = `#demo { background: #0b0d12; color: #e8ebf3; font-family: Inter, sans-serif; }`;

export default [
  T("text/ribbon-banner", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var band = el.querySelector(".rb-band"), txt = el.querySelector(".rb-text"), tails = el.querySelectorAll(".rb-tail"), ex = gsap.parseEase("expo.out"), ei = gsap.parseEase("expo.in"), p2 = gsap.parseEase("power2.out"), pi = gsap.parseEase("power2.in"), bk = gsap.parseEase("back.out(1.7)");
      var cl = function (a, b, t) { return Math.max(0, Math.min(1, (t - a) / (b - a))); };
      return MW.drive(tl, at, 4.2, function (t) {
        var b = ex(cl(0.3, 0.9, t)) * (1 - ei(cl(3.55, 3.9, t))), x = p2(cl(0.65, 1.05, t)) * (1 - pi(cl(3.4, 3.6, t))), tl2 = bk(cl(1.05, 1.5, t)) * (1 - pi(cl(3.25, 3.5, t)));
        gsap.set(band, { scaleX: b }); gsap.set(txt, { y: (1 - x) * o.rise }); txt.style.opacity = String(x);
        tails.forEach(function (tt, i) { gsap.set(tt, { scaleX: tl2, transformOrigin: i ? "0% 50%" : "100% 50%" }); tt.style.opacity = tl2 > 0.01 ? "1" : "0"; });
      });
    },
    options: { rise: "px the text rises inside the band (110)" }, defaults: { rise: 110 },
    notes: "Markup: .rb-band holding .rb-text, and two .rb-tail (left, right) behind the band's ends.",
    demo: { css: `${DARK}\n.rb { position: absolute; left: 50%; top: 50%; width: 1000px; height: 180px; margin: -90px 0 0 -500px; }
.rb-band { position: absolute; inset: 0; border-radius: 10px; background: linear-gradient(180deg, #9c88ff, #7357f5); overflow: hidden; display: grid; place-items: center; z-index: 2; padding: 30px 0; box-sizing: border-box; }
.rb-text { font-size: 90px; font-weight: 900; color: #f6f1e4; letter-spacing: 0.02em; white-space: nowrap; }
.rb-tail { position: absolute; top: 45px; width: 220px; height: 180px; background: #5a3fd0; opacity: 0.6; z-index: 1; }
.rb-tail.l { left: -150px; clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 27% 50%); } .rb-tail.r { right: -150px; clip-path: polygon(0 0, 100% 0, 73% 50%, 100% 100%, 0 100%); }
.rb-tail::after { content: ""; position: absolute; top: 0; width: 70px; height: 45px; background: #241a5e; } .rb-tail.l::after { right: 0; } .rb-tail.r::after { left: 0; }`,
      html: `<div class="rb"><div class="rb-tail l"></div><div class="rb-tail r"></div><div class="rb-band"><div class="rb-text">KHAI TRƯƠNG</div></div></div>`,
      run: `MW.textRibbonBanner(q(".rb"), tl, 0, {});`, duration: 4.2 },
  }),

  T("text/tracking-contract", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, p3 = gsap.parseEase("power3.out"), so = gsap.parseEase("sine.out");
      return MW.drive(tl, at, o.outAt + 0.45, function (t) {
        var fs = parseFloat(getComputedStyle(el).fontSize), max = Math.max(0.22, Math.min(o.spread, (el.parentNode.offsetWidth * 0.9 - el.offsetWidth) / Math.max(1, n - 1) / fs)) * fs;
        var e = max * (1 - p3(Math.max(0, Math.min(1, (t - o.start) / o.duration)))), a = so(Math.max(0, Math.min(1, (t - o.start) / (o.duration * 0.3))));
        if (t > o.outAt) a *= 1 - Math.min(1, (t - o.outAt) / 0.45);
        ch.forEach(function (c, i) { gsap.set(c, { x: (i - (n - 1) / 2) * e }); });
        el.style.opacity = String(a); el.style.filter = a < 0.999 ? "blur(" + (12 * (1 - a)) + "px)" : "";
      });
    },
    options: { spread: "extra spacing per gap at the start, em (0.9; at least 0.22, less when it would not fit)", start: "s (0.3)", duration: "s (2.8), power3.out", outAt: "s of the fade-out (3.75)" },
    defaults: { spread: 0.9, start: 0.3, duration: 2.8, outAt: 3.75 },
    demo: H("HÀNH TRÌNH", `MW.textTrackingContract(q(".tk-head"), tl, 0, {});`, 4.4, { size: 200 }),
  }),

  T("text/slow-tracking-expand", {
    uses: ["split", "drive", "eases"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, so = gsap.parseEase("sine.out"), io = MW.ez("in-out");
      return MW.drive(tl, at, o.start + o.duration, function (t) {
        var fs = parseFloat(getComputedStyle(el).fontSize), e = o.spread * fs * Math.max(0, Math.min(1, (t - o.start) / o.duration)), end = o.start + o.duration;
        var a = so(Math.max(0, Math.min(1, (t - o.start) / 0.5))) * (1 - io(Math.max(0, Math.min(1, (t - end + 0.55) / 0.55))));
        ch.forEach(function (c, i) { gsap.set(c, { x: (i - (n - 1) / 2) * e }); }); el.style.opacity = String(a);
      });
    },
    options: { spread: "extra spacing per gap at the end, em (0.3; a film title 0.15)", start: "s (0.2)", duration: "s, linear (4.95)" },
    defaults: { spread: 0.3, start: 0.2, duration: 4.95 },
    demo: H("MÙA THU HÀ NỘI", `MW.textSlowTrackingExpand(q(".tk-head"), tl, 0, {});`, 5.6, { size: 170 }),
  }),

  T("text/fade-black-card", {
    kind: "block",
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var black = el.querySelector(o.black), title = el.querySelector(o.title), A = o.from ? el.querySelector(o.from) : null, B = o.to ? el.querySelector(o.to) : null, io = MW.ez("in-out"), si = gsap.parseEase("sine.inOut");
      var words = (title.textContent || "").trim().split(/\s+/).length, hold = Math.max(o.hold, words * 0.6), tIn = o.fade + 0.05, tOut = tIn + o.fade + hold;
      var cl = function (a, d, t) { return Math.max(0, Math.min(1, (t - a) / d)); };
      return MW.drive(tl, at, tOut + o.fade * 2 + 0.1 + 0.2, function (t) {
        var b = io(cl(0.2, o.fade, t)) * (1 - io(cl(tOut + o.fade + 0.1, o.fade, t))), ti = si(cl(tIn + 0.2, o.fade, t)) * (1 - si(cl(tOut, o.fade, t)));
        black.style.opacity = String(b); title.style.opacity = String(ti);
        if (A && B) { var sw = t >= tIn + 0.2 + o.fade; A.style.visibility = sw ? "hidden" : "visible"; B.style.visibility = sw ? "visible" : "hidden"; }
      });
    },
    options: { fade: "s each fade (0.5; 12-24 frames)", hold: "s the card holds at least (1.5; and words × 0.6 s, readable twice)", black: "the black layer", title: "the title", from: "the scene before", to: "the scene after" },
    defaults: { fade: 0.5, hold: 1.5, black: ".fb-black", title: ".fb-title", from: ".fb-a", to: ".fb-b" },
    assets: [{ path: "a.svg", data: LANDSCAPE }, { path: "b.svg", data: ABSTRACT }],
    demo: { css: `${DARK}\n.fb { position: absolute; inset: 0; } .fb > div { position: absolute; inset: 0; } .fb-a { background: url(assets/a.svg) center / cover; } .fb-b { background: url(assets/b.svg) center / cover; visibility: hidden; }
.fb-black { background: #000; opacity: 0; } .fb-title { display: grid; place-items: center; font-size: 110px; font-weight: 300; letter-spacing: 0.08em; opacity: 0; color: #f2efe6; }`,
      html: `<div class="fb"><div class="fb-a"></div><div class="fb-b"></div><div class="fb-black"></div><div class="fb-title">MƯỜI NĂM SAU</div></div>`,
      run: `MW.textFadeBlackCard(q(".fb"), tl, 0, {});`, duration: 5.2 },
  }),

  T("text/slam-in-blur", {
    uses: ["drive", "rand", "eases"],
    fn: function (el, tl, at, o) {
      var host = o.stage ? MW.el(o.stage) : el.parentNode, ease = MW.ez("cubic-bezier(.7,0,1,1)"), ghosts = [], flash = document.createElement("div"), dashes = [], out = gsap.parseEase("power2.out");
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      [0.3, 0.2, 0.1].forEach(function (a, i) { var g = el.cloneNode(true); g.removeAttribute("id"); g.style.position = "absolute"; g.style.left = el.offsetLeft + "px"; g.style.top = el.offsetTop + "px"; g.style.width = el.offsetWidth + "px"; g.style.margin = "0"; g.style.color = o.color; g.style.pointerEvents = "none"; el.parentNode.insertBefore(g, el); ghosts.push({ g: g, a: a, lag: 0.14 * (i + 1) / 3 }); });
      flash.style.cssText = "position:absolute;inset:-60px;background:#fff;pointer-events:none;opacity:0;z-index:9;"; host.appendChild(flash);
      for (var i = 0; i < 14; i++) { var d = document.createElement("div"); d.style.cssText = "position:absolute;left:50%;top:50%;height:10px;width:90px;margin:-5px 0 0 0;border-radius:5px;background:" + o.color + ";transform-origin:0 50%;pointer-events:none;opacity:0;z-index:8;"; host.appendChild(d); dashes.push({ d: d, a: i / 14 * 2 * Math.PI }); }
      var land = o.start + 0.2;
      return MW.drive(tl, at, o.exitAt + 0.3, function (t) {
        var u = Math.max(0, Math.min(1, (t - o.start) / 0.2)), s = 3 - 2 * ease(u), ex = t > o.exitAt ? Math.min(1, (t - o.exitAt) / 0.3) : 0;
        gsap.set(el, { scale: s * (1 - 0.3 * ex) }); el.style.opacity = String(Math.min(1, (t - o.start) / 0.05) * (1 - ex)); el.style.filter = u < 1 && t >= o.start ? "blur(" + (o.blur * (1 - u)) + "px)" : "";
        ghosts.forEach(function (g) { var v = Math.max(0, Math.min(1, (t - o.start) / 0.2 - g.lag)); gsap.set(g.g, { scale: 3 - 2 * ease(v) }); g.g.style.opacity = t >= o.start && u < 1 ? String(g.a) : "0"; g.g.style.filter = "blur(" + o.blur * 0.6 + "px)"; });
        var d = t - land, f = Math.floor(d * 24); flash.style.opacity = d >= 0 && f === 0 ? "0.2" : "0";
        dashes.forEach(function (q) { var p = d > 0 && d < 0.4 ? out(d / 0.4) : 0, R = 380 + 420 * p; gsap.set(q.d, { x: Math.cos(q.a) * R, y: Math.sin(q.a) * R * 0.55, rotation: q.a * 57.3, scaleX: 1 - 0.6 * p }); q.d.style.opacity = d > 0 && d < 0.4 ? String(1 - p) : "0"; });
        var r = MW.rand(o.seed + f), k = f; gsap.set(host, d >= 0 && f < 4 ? { x: (r() * 2 - 1) * o.shake * (1 - k / 4), y: (r() * 2 - 1) * o.shake * (1 - k / 4) } : { x: 0, y: 0 });
      });
    },
    options: { start: "s (0.35); the slam takes 0.2 s, cubic-bezier(.7,0,1,1)", blur: "px while flying (20)", shake: "px of the 4-frame shake at 24 fps (24)", color: "ghosts and dashes", stage: "what shakes (the title's parent)", exitAt: "s (2.2)", seed: "shake pattern" },
    defaults: { start: 0.35, blur: 20, shake: 24, color: "#8b7bff", stage: null, exitAt: 2.2, seed: 9 },
    demo: H("BÙNG NỔ", `MW.textSlamInBlur(q(".tk-head"), tl, 0, {});`, 2.6, { size: 230, weight: 900 }),
  }),

  T("text/flash-frame-cut", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var cards = Array.prototype.slice.call(el.querySelectorAll(o.cards)), flash = document.createElement("div"), n = cards.length, each = o.duration / n;
      flash.style.cssText = "position:absolute;inset:0;background:#fff;pointer-events:none;opacity:0;z-index:9;"; el.appendChild(flash);
      return MW.drive(tl, at, o.duration, function (t) {
        var i = Math.min(n - 1, Math.floor(t / each)), u = t - i * each, f = Math.floor(u * 24);
        cards.forEach(function (c, j) { c.style.visibility = j === i ? "visible" : "hidden"; if (j === i) gsap.set(c, { scale: 1 + 0.05 * (u / each) }); });
        flash.style.opacity = i > 0 || t > 0 ? String(f === 0 ? 1 : f === 1 ? 0.55 : f === 2 ? 0.2 : 0) : "0";
      });
    },
    options: { duration: "s for all the cards (4.2)", cards: "selector of the cards (shown one by one, hard cuts)" }, defaults: { duration: 4.2, cards: ".ff" },
    demo: { css: `${DARK}\n.fc { position: absolute; inset: 0; } .ff { position: absolute; inset: 0; display: grid; place-items: center; font-size: 180px; font-weight: 900; letter-spacing: -0.02em; visibility: hidden; } .ff.acc { color: #a99bff; }`,
      html: `<div class="fc"><div class="ff">MỘT GIẤC MƠ</div><div class="ff">MỘT HÀNH TRÌNH</div><div class="ff acc">SẮP RA MẮT</div></div>`,
      run: `MW.textFlashFrameCut(q(".fc"), tl, 0, {});`, duration: 4.2 },
  }),

  T("title/opening-crawl", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var plane = el.querySelector(o.plane), body = plane.firstElementChild;
      plane.style.transformOrigin = "50% 100%"; plane.style.transform = "perspective(" + o.perspective + "px) rotateX(" + o.tilt + "deg)";
      return MW.drive(tl, at, o.duration, function (t) { var H = plane.offsetHeight, B = body.offsetHeight, p = t / o.duration; gsap.set(body, { y: H - (H + B) * p }); });
    },
    options: { tilt: "degrees the plane leans back (25)", perspective: "px (1200)", duration: "s for the whole text to pass (60 in a film; the demo 9)", plane: "the tilted plane (.oc-plane), holding the text" },
    defaults: { tilt: 25, perspective: 1200, duration: 60, plane: ".oc-plane" },
    demo: { css: `${DARK}\n.oc { position: absolute; inset: 0; overflow: hidden; background: #03040a; } .oc i { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #fff; opacity: 0.7; }
.oc-plane { position: absolute; left: 50%; bottom: -40px; width: 1000px; height: 1300px; margin-left: -500px; overflow: hidden; -webkit-mask-image: linear-gradient(0deg, #000 55%, transparent 92%); mask-image: linear-gradient(0deg, #000 55%, transparent 92%); }
.oc-plane > div { color: #ffd23d; font-size: 52px; font-weight: 700; line-height: 1.5; text-align: justify; } .oc-plane h2 { text-align: center; font-size: 80px; margin: 0 0 40px; letter-spacing: 0.06em; } .oc-plane p { margin: 0 0 50px; }`,
      html: `<div class="oc">${Array.from({ length: 46 }, (_, i) => `<i style="left:${(i * 397) % 1920}px;top:${(i * 233) % 1080}px"></i>`).join("")}<div class="oc-plane"><div><h2>PHẦN MỘT</h2><p>Ngày xửa ngày xưa, ở một ngôi làng ven sông, có một xưởng phim nhỏ làm những thước phim bằng tay.</p><p>Họ mơ về một cỗ máy biết kể chuyện, biết dựng cảnh và biết lắng nghe từng ý tưởng.</p><p>Rồi một ngày, cỗ máy ấy thức dậy, và mọi khung hình bắt đầu chuyển động.</p><p>Đây là câu chuyện của họ.</p></div></div></div>`,
      run: `MW.titleOpeningCrawl(q(".oc"), tl, 0, { duration: 9 });`, duration: 6 },
  }),

  T("lower/racing-credits", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var k = o.unit, bars = el.querySelectorAll(".rc-bar"), role = el.querySelector(".rc-role"), name = el.querySelector(".rc-name"), ul = el.querySelector(".rc-ul"), vs = el.querySelectorAll(".rc-v"), p2 = gsap.parseEase("power2.out");
      var lin = function (a, d, t) { return Math.max(0, Math.min(1, (t - a) / d)); };
      return MW.drive(tl, at, o.exitAt + 0.4, function (t) {
        var e = t > o.exitAt ? lin(o.exitAt, 0.16, t) : 0;
        vs.forEach(function (v, i) { var c = Math.abs(i - (vs.length - 1) / 2); gsap.set(v, { scaleY: p2(lin(0.05 + 0.03 * c, 0.4, t)) }); });
        gsap.set(bars[0], { x: (200 - 620 * lin(0.5, 0.4, t)) * k }); bars[0].style.opacity = t > 0.5 && t < 0.9 ? "1" : "0";
        gsap.set(bars[1], { x: (-200 + 620 * lin(0.85, 0.4, t)) * k }); bars[1].style.opacity = t > 0.85 && t < 1.25 ? "1" : "0";
        gsap.set(role, { x: (260 * (1 - lin(0.6, 0.27, t)) - 600 * e) * k }); role.style.opacity = t >= 0.6 ? "1" : "0";
        gsap.set(name, { x: (-300 * (1 - lin(0.95, 0.27, t)) + 600 * e) * k }); name.style.opacity = t >= 0.95 ? "1" : "0";
        if (ul) gsap.set(ul, { scaleX: p2(lin(0.87, 0.23, t)) * (1 - e) });
      });
    },
    options: { unit: "px per reference unit (5)", exitAt: "s (3.2): out at the same speed, opposite ways" }, defaults: { unit: 5, exitAt: 3.2 },
    demo: { css: `${DARK}\n.rc { position: absolute; inset: 0; transform: skewY(-11.3deg); overflow: hidden; } .rc-v { position: absolute; top: -200px; width: 2px; height: 1500px; background: rgba(139,123,255,0.18); transform-origin: 50% 0; }
.rc-h { position: absolute; left: 0; right: 0; height: 2px; background: rgba(139,123,255,0.12); } .rc-bar { position: absolute; left: 50%; width: 550px; height: 20px; margin-left: -275px; background: #8b7bff; }
.rc-role { position: absolute; left: 0; right: 0; top: 400px; text-align: center; font-size: 75px; font-weight: 800; color: #a99bff; letter-spacing: 0.1em; } .rc-name { position: absolute; left: 0; right: 0; top: 520px; text-align: center; font-size: 160px; font-weight: 900; letter-spacing: -0.01em; }
.rc-ul { position: absolute; left: 50%; top: 495px; width: 520px; height: 8px; margin-left: -260px; background: #8b7bff; transform-origin: 0 50%; }`,
      html: `<div class="rc">${Array.from({ length: 15 }, (_, i) => `<div class="rc-v" style="left:${i * 130 + 50}px"></div>`).join("")}${Array.from({ length: 10 }, (_, i) => `<div class="rc-h" style="top:${i * 120}px"></div>`).join("")}
<div class="rc-bar" style="top:425px"></div><div class="rc-bar" style="top:600px"></div><div class="rc-role">ĐẠO DIỄN</div><div class="rc-ul"></div><div class="rc-name">Nguyễn Minh Anh</div></div>`,
      run: `MW.lowerRacingCredits(q(".rc"), tl, 0, {});`, duration: 3.6 },
  }),

  T("text/slice-in", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var html = el.innerHTML, n = o.slices, strips = [], bars = [], ex = gsap.parseEase("expo.out"), ei = gsap.parseEase("expo.in");
      el.innerHTML = ""; el.style.position = "relative";
      var base = document.createElement("span"); base.innerHTML = html; base.style.visibility = "hidden"; base.style.display = "block"; el.appendChild(base);
      for (var i = 0; i < n; i++) { var s = document.createElement("span"); s.innerHTML = html; s.style.cssText = "display:block;position:absolute;left:0;top:0;width:100%;"; el.appendChild(s); strips.push(s);
        var b = document.createElement("span"); b.style.cssText = "position:absolute;left:50%;height:" + o.bar + "px;width:" + o.barWidth + "px;margin-left:-" + o.barWidth / 2 + "px;background:" + o.color + ";pointer-events:none;"; el.appendChild(b); bars.push(b); }
      return MW.drive(tl, at, o.exitAt + 0.04 * n + 0.4, function (t) {
        var Hh = el.offsetHeight, fs = parseFloat(getComputedStyle(el).fontSize), top = -0.25 * fs, sh = (Hh - top + 0.1 * fs) / n;
        strips.forEach(function (s, k) {
          var dir = k % 2 ? 1 : -1, y0 = top + k * sh, u = Math.max(0, Math.min(1, (t - o.start - 0.06 * k) / 0.7)), ue = Math.max(0, Math.min(1, (t - o.exitAt - 0.04 * k) / 0.4));
          var jolt = t > 1.6 && t < 1.9 ? Math.sin(Math.PI * (t - 1.6) / 0.3) * o.jolt * dir : 0, x = dir * o.distance * (1 - ex(u)) - dir * o.distance * ei(ue) + jolt;
          s.style.clipPath = "inset(" + y0 + "px -40px " + Math.max(0, Hh - y0 - sh - 4) + "px -40px)"; gsap.set(s, { x: x }); s.style.visibility = u > 0 ? "visible" : "hidden";
          var bu = Math.max(0, Math.min(1, (t - o.start - 0.06 * k + 0.1) / 0.6)); bars[k].style.top = y0 + "px"; gsap.set(bars[k], { x: dir * o.distance * (1 - ex(bu)) });
          bars[k].style.opacity = bu > 0 ? String(1 - Math.max(0, Math.min(1, (t - 0.7 - 0.06 * k) / 0.3))) : "0";
        });
      });
    },
    options: { slices: "strips (6)", distance: "px each slides in from (2300, ≈120 % of the frame)", start: "s (0.32; 0.06 s apart, 0.7 s expo.out)", jolt: "px (25) at 1.6-1.9 s", bar: "px of the accent bar (10)", barWidth: "px (1600)", color: "bar colour", exitAt: "s (2.55): on through to the other side" },
    defaults: { slices: 6, distance: 2300, start: 0.32, jolt: 25, bar: 10, barWidth: 1600, color: "#8b7bff", exitAt: 2.55 },
    demo: H("BẢN TIN TỐI", `MW.textSliceIn(q(".tk-head"), tl, 0, {});`, 3.4, { size: 220, weight: 900 }),
  }),

  T("hand/film-jitter", {
    uses: ["split", "drive", "rand", "canvas"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, host = el.parentNode, ghost = el.cloneNode(true), dark = document.createElement("div"), cv = MW.canvas(host), c = cv.ctx;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      ghost.removeAttribute("id"); ghost.style.position = "absolute"; ghost.style.left = el.offsetLeft + "px"; ghost.style.top = el.offsetTop + "px"; ghost.style.width = el.offsetWidth + "px"; ghost.style.margin = "0"; ghost.style.color = o.ghost; ghost.style.opacity = "0.35"; ghost.style.pointerEvents = "none";
      host.insertBefore(ghost, el); dark.style.cssText = "position:absolute;inset:0;background:#000;pointer-events:none;opacity:0;"; host.appendChild(dark); cv.cv.style.zIndex = "5";
      var vis = [[0.3, 0.38], [0.5, 0.62], [0.75, 0.8], [0.92, o.loop - 0.4]];
      return MW.drive(tl, at, o.loop, function (t) {
        var f = Math.floor(t * 24), r = MW.rand(o.seed * 1000 + f), on = vis.some(function (v) { return t >= v[0] && t < v[1]; });
        el.style.visibility = ghost.style.visibility = on ? "visible" : "hidden";
        gsap.set(el, { x: (r() * 2 - 1) * o.jitter, y: (r() * 2 - 1) * o.jitter });
        ch.forEach(function (q) { gsap.set(q, { x: (r() * 2 - 1) * o.letter, y: (r() * 2 - 1) * o.letter, rotation: (r() * 2 - 1) * 1.7 }); });
        var fl = 0.85 + 0.15 * r(); el.style.opacity = String(fl); dark.style.opacity = String((1 - fl)); var off = 10 + r() * 15; gsap.set(ghost, { x: off, y: -off / 2 });
        c.clearRect(0, 0, cv.w, cv.h); if (!on) return;
        c.fillStyle = "rgba(230,225,210,0.55)"; for (var i = 0; i < 50; i++) { c.beginPath(); c.arc(r() * cv.w, r() * cv.h, 1 + r() * 2.5, 0, 2 * Math.PI); c.fill(); }
        if (r() < 0.25) { c.beginPath(); c.arc(r() * cv.w, r() * cv.h, 8 + r() * 14, 0, 2 * Math.PI); c.fill(); }
        var ns = Math.floor(r() * 3); c.strokeStyle = "rgba(230,225,210,0.4)"; c.lineWidth = 2; for (var s = 0; s < ns; s++) { var x = r() * cv.w; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + (r() - 0.5) * 30, cv.h); c.stroke(); }
      });
    },
    options: { jitter: "px of the block (10)", letter: "px per letter (7.5), ±1.7°", ghost: "colour of the double exposure (35 %, offset 10-25 px)", loop: "s (3.2)", seed: "the frame pattern" },
    defaults: { jitter: 10, letter: 7.5, ghost: "#6c778b", loop: 3.2, seed: 6 },
    demo: H("NGÀY XƯA ẤY", `MW.handFilmJitter(q(".tk-head"), tl, 0, {});`, 3.2, { size: 190, weight: 800 }, "#demo { background: #15120e; } .tk-head { color: #efe6d2; }"),
  }),

  T("text/stamp-pop", {
    uses: ["split", "drive", "rand"],
    fn: function (el, tl, at, o) {
      var S = MW.split(el, "words"), units = S.words.length > 1 ? S.words : MW.split(el, "chars").chars, n = units.length, beat = Math.min(o.beat, 1.7 / n), card = o.card ? MW.el(o.card) : el.parentNode, r = MW.rand(o.seed);
      var tilts = units.map(function () { return (r() * 2 - 1) * 3.4; }), shapes = o.shapes ? Array.prototype.slice.call(document.querySelectorAll(o.shapes)) : [];
      // ink voids: small holes punched out of the letters (a mask of many soft-edged dots, intersected)
      var holes = []; for (var i = 0; i < 90; i++) { var x = (r() * 100).toFixed(1), y = (r() * 100).toFixed(1), d = (0.12 + r() * 0.35).toFixed(2); holes.push("radial-gradient(circle at " + x + "% " + y + "%, transparent " + d + "%, #000 " + (+d + 0.15).toFixed(2) + "%)"); }
      el.style.webkitMaskImage = el.style.maskImage = holes.join(","); el.style.webkitMaskComposite = "source-in"; el.style.maskComposite = "intersect";
      return MW.drive(tl, at, o.loop, function (t) {
        var T12 = Math.floor(t * 12) / 12, b = Math.floor((T12 - o.start) / beat + 1e-6), on = t >= o.start && t < o.offAt;
        units.forEach(function (u, i) { var d = Math.round((T12 - (o.start + i * beat)) * 12); u.style.visibility = on && d >= 0 ? "visible" : "hidden"; gsap.set(u, { scale: d <= 0 ? 1.18 : d === 1 ? 0.95 : 1, rotation: tilts[i] }); });
        if (card) card.style.backgroundColor = on && b >= 0 ? o.colors[Math.min(n - 1, b) % o.colors.length] : o.base;
        shapes.forEach(function (s, i) { s.style.visibility = on && b >= i + 1 ? "visible" : "hidden"; });
      });
    },
    options: { beat: "s between words (0.36, at most 1.7 s ÷ words)", start: "s (0.4)", offAt: "s all off (3.42)", colors: "background per beat", base: "background before", card: "the background card (the text's parent)", shapes: "flat shapes stamped on beats 1, 2", loop: "s (3.8)", seed: "tilts and ink voids" },
    defaults: { beat: 0.36, start: 0.4, offAt: 3.42, colors: ["#8b7bff", "#3dd6f5", "#ffd23d"], base: "#151a28", card: null, shapes: null, loop: 3.8, seed: 8 },
    demo: { css: `${DARK}\n.sp { position: absolute; inset: 0; display: grid; place-items: center; background: #151a28; } .sp h1 { margin: 0; font-size: 210px; font-weight: 900; color: #0b0d12; letter-spacing: -0.02em; }
.sp .s1 { position: absolute; left: 380px; top: 260px; width: 80px; height: 80px; border-radius: 50%; background: #0b0d12; visibility: hidden; } .sp .s2 { position: absolute; right: 360px; bottom: 260px; width: 160px; height: 60px; background: #0b0d12; visibility: hidden; }`,
      html: `<div class="sp"><div class="s1"></div><div class="s2"></div><h1>ĐẬP MẠNH NÀO</h1></div>`,
      run: `MW.textStampPop(q(".sp h1"), tl, 0, { shapes: ".sp .s1, .sp .s2" });`, duration: 3.8 },
  }),

  T("text/light-leak-burn", {
    kind: "block",
    uses: ["drive", "noise", "eases"],
    fn: function (el, tl, at, o) {
      var title = el.querySelector(o.title), blobs = [], white = document.createElement("div"), io = MW.ez("in-out"), out = gsap.parseEase("power2.out"), nz = MW.noise(o.seed);
      [["255,214,120", 0.2, 0.35], ["139,123,255", 0.6, 0.55], ["255,190,90", 0.85, 0.3]].forEach(function (b, i) { var d = document.createElement("div"); d.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;mix-blend-mode:screen;background:radial-gradient(circle, rgba(" + b[0] + ",0.95), rgba(" + b[0] + ",0) 70%);"; el.appendChild(d); blobs.push({ d: d, x: b[1], y: b[2], i: i }); });
      white.style.cssText = "position:absolute;inset:0;background:#fff;pointer-events:none;opacity:0;"; el.appendChild(white); el.appendChild(title);
      var cl = function (a, b, t) { return Math.max(0, Math.min(1, (t - a) / (b - a))); };
      return MW.drive(tl, at, o.loop, function (t) {
        var leak = io(cl(0.25, 0.9, t)) * (1 - io(cl(3.15, 3.65, t))), burn = t < 1 ? io(cl(0.55, 1.0, t)) : 1 - io(cl(1.0, 1.55, t)), s = 0.35 * leak + 0.55 * burn, W = el.offsetWidth, Hh = el.offsetHeight;
        blobs.forEach(function (b) { var R = (420 + 600 * burn) * (0.8 + 0.2 * b.i), x = (b.x + 0.08 * nz(t * 0.6 + b.i * 10)) * W, y = (b.y + 0.08 * nz(t * 0.6 + b.i * 10 + 5)) * Hh; b.d.style.width = b.d.style.height = 2 * R + "px"; b.d.style.left = (x - R) + "px"; b.d.style.top = (y - R) + "px"; b.d.style.opacity = String(Math.min(1, s * 1.4)); });
        white.style.opacity = String(0.85 * burn);
        var on = t >= o.cutAt && t < o.offAt + 0.45, g = 18 - 14 * out(cl(o.cutAt, o.cutAt + 0.9, t)), f = 1 - cl(o.offAt, o.offAt + 0.45, t);
        title.style.opacity = on ? String(f) : "0"; title.style.textShadow = "0 0 " + g * 3 + "px " + o.glow + ", 0 0 " + g + "px " + o.glow;
      });
    },
    options: { cutAt: "s the title cuts in, at the burn's peak (1.0)", offAt: "s (3.15)", glow: "accent glow colour (18 → 4 px, ×3 here)", title: "the title", loop: "s (3.8)", seed: "drift" },
    defaults: { cutAt: 1, offAt: 3.15, glow: "#8b7bff", title: ".lb-title", loop: 3.8, seed: 3 },
    demo: { css: `${DARK}\n.lb { position: absolute; inset: 0; overflow: hidden; background: radial-gradient(100% 100% at 50% 60%, #1c1a2c, #07070c); } .lb-title { position: absolute; inset: 0; display: grid; place-items: center; font-size: 200px; font-weight: 800; color: #fff; z-index: 3; opacity: 0; letter-spacing: -0.02em; }`,
      html: `<div class="lb"><div class="lb-title">BÌNH MINH</div></div>`, run: `MW.textLightLeakBurn(q(".lb"), tl, 0, {});`, duration: 3.8 },
  }),

  T("effect/letterbox-reveal", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var bars = [document.createElement("div"), document.createElement("div")], title = o.title ? MW.el(o.title) : null, io = MW.ez("in-out");
      bars.forEach(function (b, i) { b.style.cssText = "position:absolute;left:0;right:0;background:#000;pointer-events:none;z-index:6;" + (i ? "bottom:0;" : "top:0;"); el.appendChild(b); });
      var cl = function (a, b, t) { return Math.max(0, Math.min(1, (t - a) / (b - a))); };
      return MW.drive(tl, at, o.closeAt + 0.6, function (t) {
        var W = el.offsetWidth, Hh = el.offsetHeight, bar = Math.max(0, (Hh - W / o.ratio) / 2), p = io(cl(0.35, 1.15, t)) * (1 - io(cl(o.closeAt, o.closeAt + 0.6, t))), h = Hh / 2 - (Hh / 2 - bar) * p;
        bars.forEach(function (b) { b.style.height = h + "px"; });
        if (title) title.style.opacity = String(io(cl(0.85, 1.35, t)) * (1 - io(cl(o.closeAt - 0.25, o.closeAt + 0.05, t))));
      });
    },
    options: { ratio: "aspect it opens to (2.39)", title: "the title (fades in 0.5 s into the open)", closeAt: "s the bars close (2.85)" }, defaults: { ratio: 2.39, title: null, closeAt: 2.85 },
    assets: [{ path: "shot.svg", data: LANDSCAPE }],
    demo: { css: `${DARK}\n.lr { position: absolute; inset: 0; background: url(assets/shot.svg) center / cover; } .lr-t { position: absolute; inset: 0; display: grid; place-items: center; font-size: 150px; font-weight: 300; letter-spacing: 0.2em; color: #fff; z-index: 7; opacity: 0; text-shadow: 0 6px 30px rgba(0,0,0,0.5); }`,
      html: `<div class="lr"><div class="lr-t">VỀ NHÀ</div></div>`, run: `MW.effectLetterboxReveal(q(".lr"), tl, 0, { title: ".lr-t" });`, duration: 3.6 },
  }),

  T("text/line-reflow", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var card = el, words = Array.prototype.slice.call(card.querySelectorAll(".lr-w")), io = MW.ez("in-out"), p2 = gsap.parseEase("power2.out"), cur = o.cursor ? MW.el(o.cursor) : null;
      var ws = words.map(function (w) { return w.offsetWidth; }), gap = o.gap, pad = o.pad, Wd = function (t) { return o.wide + (o.narrow - o.wide) * (io(Math.max(0, Math.min(1, (t - 0.4) / 0.7))) - io(Math.max(0, Math.min(1, (t - 2.5) / 0.7)))); };
      var layout = function (w) { var x = pad, line = 0, out = []; ws.forEach(function (ww, i) { if (i && x + ww > w - pad) { line++; x = pad; } out.push([x, pad + line * o.pitch]); x += ww + gap; }); return out; };
      // the times each word changes line, from the width over the whole loop (sampled), so a moved word glides FLIP from its last slot
      var hist = words.map(function () { return []; }), prev = layout(Wd(0));
      for (var s = 0; s <= o.loop; s += 1 / 240) { var L = layout(Wd(s)); L.forEach(function (p, i) { if (p[1] !== prev[i][1]) hist[i].push([s, prev[i], p]); }); prev = L; }
      return MW.drive(tl, at, o.loop, function (t) {
        var w = Wd(t), L = layout(w); card.style.width = w + "px";
        words.forEach(function (el2, i) {
          var p = L[i], x = p[0], y = p[1], fl = 0;
          hist[i].forEach(function (h) { var k = (t - h[0]) / 0.48; if (k >= 0 && k < 1) { var q = p2(k); x = h[1][0] + (h[2][0] - h[1][0]) * q; y = h[1][1] + (h[2][1] - h[1][1]) * Math.pow(q, 0.35); fl = 0.9 * Math.sin(Math.PI * q); } });
          gsap.set(el2, { x: x, y: y }); el2.style.outline = fl > 0.02 ? Math.max(1, 5 * fl) + "px solid rgba(139,123,255," + fl + ")" : "none";
        });
        if (cur) { cur.style.left = (card.offsetLeft + w - 14) + "px"; cur.style.top = (card.offsetTop + card.offsetHeight / 2) + "px"; }
      });
    },
    options: { wide: "px of the card at rest (1350)", narrow: "px narrowed (850)", pad: "px (60)", gap: "px between words (40)", pitch: "px line pitch (190)", cursor: "the cursor riding the edge", loop: "s (4.2)" },
    defaults: { wide: 1350, narrow: 850, pad: 60, gap: 40, pitch: 190, cursor: null, loop: 4.2 },
    demo: { css: `${DARK}\n.lrc { position: absolute; left: 285px; top: 260px; height: 460px; border-radius: 40px; background: #151a28; border: 3px solid #2a3350; overflow: hidden; }
.lrc::after { content: ""; position: absolute; right: 14px; top: 50%; width: 30px; height: 120px; margin-top: -60px; border-radius: 15px; background: #4a5478; }
.lr-w { position: absolute; left: 0; top: 0; font-size: 130px; font-weight: 900; line-height: 1.2; white-space: nowrap; border-radius: 10px; } .ui-cursor { position: absolute; z-index: 20; }`,
      html: `<div class="lrc"><span class="lr-w">LÀM</span><span class="lr-w">NÓ</span><span class="lr-w" style="color:#a99bff">BAY</span></div>${CURSOR}`,
      run: `MW.textLineReflow(q(".lrc"), tl, 0, { cursor: ".ui-cursor" });`, duration: 4.2 },
  }),

  T("text/counterweight-seesaw", {
    kind: "block",
    uses: ["drive", "spring", "eases"],
    fn: function (el, tl, at, o) {
      var beam = el.querySelector(".cw-beam"), L = el.querySelector(".cw-l"), R = el.querySelector(".cw-r"), sp = MW.spring(o.k, o.c, 1), io = MW.ez("in-out"), a0 = o.angle;
      return MW.drive(tl, at, o.loop, function (t) {
        var a = t < o.start ? a0 : a0 * (1 - sp.at(t - o.start)); if (t > 3.55) a = a0 * io(Math.min(1, (t - 3.55) / 0.55));
        var rad = a * Math.PI / 180, d = o.arm, h = o.lift;
        gsap.set(beam, { rotation: a });
        gsap.set(L, { x: -d * Math.cos(rad) + h * Math.sin(rad), y: -d * Math.sin(rad) - h * Math.cos(rad) });
        gsap.set(R, { x: d * Math.cos(rad) + h * Math.sin(rad), y: d * Math.sin(rad) - h * Math.cos(rad) });
      });
    },
    options: { angle: "degrees, the heavy side down (13)", k: "spring stiffness (70)", c: "damping (6)", start: "s (0.4)", arm: "px from the pivot (420)", lift: "px above the beam (120)", loop: "s (4.2)" },
    defaults: { angle: 13, k: 70, c: 6, start: 0.4, arm: 420, lift: 120, loop: 4.2 },
    demo: { css: `${DARK}\n.cw { position: absolute; left: 50%; top: 560px; width: 0; height: 0; } .cw-beam { position: absolute; left: -570px; top: -15px; width: 1140px; height: 30px; border-radius: 15px; background: #c9d2ea; }
.cw-f { position: absolute; left: -70px; top: 15px; width: 140px; height: 150px; background: #4a5478; clip-path: polygon(50% 0, 100% 100%, 0 100%); }
.cw-l, .cw-r { position: absolute; left: 0; top: 0; font-size: 110px; font-weight: 900; white-space: nowrap; transform: translate(-50%, -50%); } .cw-r { color: #a99bff; }`,
      html: `<div class="cw"><div class="cw-f"></div><div class="cw-beam"></div><div class="cw-l">NHẸ</div><div class="cw-r">NẶNG</div></div>`,
      run: `MW.textCounterweightSeesaw(q(".cw"), tl, 0, {});`, duration: 4.2 },
  }),

  T("text/fit-width-title", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var card = o.card ? MW.el(o.card) : el.parentNode, io = MW.ez("in-out"), cur = o.cursor ? MW.el(o.cursor) : null;
      el.style.whiteSpace = "nowrap"; el.style.fontSize = "100px"; var w100 = el.scrollWidth;
      return MW.drive(tl, at, o.loop, function (t) {
        var w = o.wide + (o.narrow - o.wide) * (io(Math.max(0, Math.min(1, (t - 0.4) / 0.8))) - io(Math.max(0, Math.min(1, (t - 2.2) / 0.8))));
        card.style.width = w + "px"; el.style.fontSize = Math.min(o.cap, 100 * (w - 2 * o.pad) / w100) + "px";
        if (cur) { cur.style.left = (card.offsetLeft + w - 10) + "px"; cur.style.top = (card.offsetTop + card.offsetHeight - 10) + "px"; }
      });
    },
    options: { pad: "px each side (70)", cap: "largest font size, px (460)", wide: "card px (1400)", narrow: "px (750)", card: "the box it fits (the title's parent)", cursor: "the cursor dragging the corner", loop: "s (4.2)" },
    defaults: { pad: 70, cap: 460, wide: 1400, narrow: 750, card: null, cursor: null, loop: 4.2 },
    notes: "fontSize = min(cap, size × (box width − 2 × pad) ÷ measured width), re-measured every frame; one line.",
    demo: { css: `${DARK}\n.fw { position: absolute; left: 260px; top: 300px; height: 480px; border-radius: 40px; background: #151a28; border: 3px solid #2a3350; display: grid; place-items: center; overflow: hidden; }
.fw h1 { margin: 0; font-weight: 900; letter-spacing: -0.02em; } .ui-cursor { position: absolute; z-index: 20; }`,
      html: `<div class="fw"><h1>VỪA KHÍT</h1></div>${CURSOR}`, run: `MW.textFitWidthTitle(q(".fw h1"), tl, 0, { cursor: ".ui-cursor" });`, duration: 4.2 },
  }),

  T("text/fit-stack", {
    uses: ["split", "drive"],
    fn: function (el, tl, at, o) {
      var ws = MW.split(el, "words").words, cv = document.createElement("canvas").getContext("2d"), cs = getComputedStyle(el), fam = cs.fontFamily, wt = cs.fontWeight, p2 = gsap.parseEase("power2.out"), pi = gsap.parseEase("power2.in");
      el.style.position = "relative"; el.style.height = o.height + "px"; el.style.width = o.width + "px";
      var rows = ws.map(function (w, i) {
        cv.font = wt + " 100px " + fam; var m = cv.measureText(w.textContent), ink = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, size = Math.min(o.cap, 100 * o.width / ink);
        w.style.cssText += ";position:absolute;left:50%;top:0;white-space:nowrap;line-height:1;font-size:" + size + "px;"; if (i === ws.length - 1) w.style.color = o.accent;
        return { w: w, size: size, h: size * 0.86 };
      });
      var total = rows.reduce(function (s, r) { return s + r.h; }, 0) + o.gap * (rows.length - 1);
      if (total > o.height) { var f = o.height / total; rows.forEach(function (r) { r.size *= f; r.h *= f; r.w.style.fontSize = r.size + "px"; }); }
      return MW.drive(tl, at, o.exitAt + 0.35, function (t) {
        var y = 0, shown = 0, ys = [];
        rows.forEach(function (r, i) { var e = p2(Math.max(0, Math.min(1, (t - o.start - i * o.each) / 0.3))); ys.push(y); y += (r.h + (i ? o.gap : 0)) * e; shown += 0; r.e = e; });
        var off = (o.height - y) / 2, ex = pi(Math.max(0, Math.min(1, (t - o.exitAt) / 0.35)));
        rows.forEach(function (r, i) { gsap.set(r.w, { xPercent: -50, y: off + ys[i] + (i ? o.gap * r.e : 0) - r.h * 0.12 + (1 - r.e) * o.rise - ex * o.rise / 2.6 }); r.w.style.opacity = String(r.e * (1 - ex)); });
      });
    },
    options: { width: "px every word spans (840)", height: "px the stack fits in (680)", cap: "largest font size (550)", gap: "px between lines (30)", start: "s (0.3)", each: "s per word (0.45)", rise: "px a word rises in (130)", accent: "the last word's colour", exitAt: "s (3.75)" },
    defaults: { width: 840, height: 680, cap: 550, gap: 30, start: 0.3, each: 0.45, rise: 130, accent: "#a99bff", exitAt: 3.75 },
    demo: H("LÀM ÍT MÀ HAY", `MW.textFitStack(q(".tk-head"), tl, 0, {});`, 4.4, { size: 100, weight: 900 }),
  }),

  T("text/word-swap-reflow", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var slot = el.querySelector(o.slot), sp = MW.spring(300, 30), ex = gsap.parseEase("expo.out"), pi = gsap.parseEase("power2.in"), spans = [], pad = o.pad;
      slot.textContent = ""; slot.style.display = "inline-block"; slot.style.position = "relative"; slot.style.overflow = "hidden"; slot.style.verticalAlign = "bottom";
      o.words.forEach(function (w) { var s = document.createElement("span"); s.textContent = w; s.style.cssText = "position:absolute;left:" + pad + "px;top:0.15em;white-space:nowrap;"; slot.appendChild(s); spans.push(s); });
      var widths = spans.map(function (s) { return s.offsetWidth + 2 * pad; }), Hh = slot.offsetHeight || 1;
      return MW.drive(tl, at, o.loop, function (t) {
        var k = 0; o.swaps.forEach(function (s, i) { if (t >= s) k = i + 1; }); k = Math.min(k, spans.length - 1);
        var w = widths[0]; for (var i = 1; i <= k; i++) w += (widths[i] - widths[i - 1]) * sp.at(t - o.swaps[i - 1]);
        slot.style.width = w + "px"; var sh = slot.offsetHeight;
        spans.forEach(function (s, i) {
          var tin = i ? o.swaps[i - 1] : -9, tout = o.swaps[i] != null && i < spans.length - 1 ? o.swaps[i] : 1e9, y = 0, a = 0;
          if (t >= tin && t < tout) { var u = ex(Math.min(1, (t - tin) / 0.35)); y = (1 - u) * 0.7 * sh; a = u; if (i === 0) { y = 0; a = 1; } }
          else if (t >= tout && t < tout + 0.25) { var v = pi((t - tout) / 0.25); y = -v * 0.7 * sh; a = 1 - v; }
          gsap.set(s, { y: y }); s.style.opacity = String(a);
        });
      });
    },
    options: { words: "the slot's words in order", swaps: "seconds of each swap ([0.4, 2.0, 3.6]); the slot's width follows on a spring k300 c30", pad: "px each side (24)", slot: "the slot element", loop: "s (5)" },
    defaults: { words: ["thiết kế", "dựng", "kể chuyện", "thiết kế"], swaps: [0.4, 2.0, 3.6], pad: 24, slot: ".ws-slot", loop: 5 },
    demo: { css: `${DARK}\n.ws { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 60px 80px; border-radius: 40px; background: #151a28; border: 3px solid #2a3350; font-size: 100px; font-weight: 800; white-space: nowrap; }
.ws-slot { border-radius: 30px; box-shadow: inset 0 0 0 5px #8b7bff; color: #a99bff; height: 1.45em; margin: 0 6px; }`,
      html: `<div class="ws">Chúng tôi <span class="ws-slot">thiết kế</span> cho bạn</div>`, run: `MW.textWordSwapReflow(q(".ws"), tl, 0, {});`, duration: 5 },
  }),

  T("text/anagram-flip", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("vi", { granularity: "grapheme" }) : null;
      var gr = function (s) { s = s.normalize("NFC"); if (!seg) return Array.from(s); var out = [], it = seg.segment(s)[Symbol.iterator](), r; while (!(r = it.next()).done) out.push(r.value.segment); return out; };
      var lay = function (s) { var box = document.createElement("div"); box.style.cssText = "position:absolute;left:0;top:0;visibility:hidden;white-space:pre;"; el.appendChild(box); var pos = gr(s).map(function (g) { var sp = document.createElement("span"); sp.textContent = g; box.appendChild(sp); return sp; }).map(function (sp) { return { g: sp.textContent, x: sp.offsetLeft }; }); var w = box.offsetWidth; el.removeChild(box); return { pos: pos, w: w }; };
      var A = lay(o.from), B = lay(o.to), used = {}, pairs = [], ease = MW.ez("cubic-bezier(.2,.8,.2,1)");
      el.textContent = ""; el.style.position = "relative"; el.style.width = Math.max(A.w, B.w) + "px"; el.style.height = "1.3em"; el.style.display = "inline-block";
      var offA = (Math.max(A.w, B.w) - A.w) / 2, offB = (Math.max(A.w, B.w) - B.w) / 2;
      A.pos.forEach(function (a) { if (a.g === " ") return; var j = -1; for (var i = 0; i < B.pos.length; i++) if (!used[i] && B.pos[i].g === a.g) { j = i; break; } if (j >= 0) used[j] = 1; pairs.push({ g: a.g, x0: a.x + offA, x1: j >= 0 ? B.pos[j].x + offB : null }); });
      B.pos.forEach(function (b, i) { if (!used[i] && b.g !== " ") pairs.push({ g: b.g, x0: null, x1: b.x + offB }); });
      pairs.forEach(function (p, i) { var s = document.createElement("span"); s.textContent = p.g; s.style.cssText = "position:absolute;left:0;top:0;white-space:pre;"; el.appendChild(s); p.s = s; p.i = i; });
      var col = getComputedStyle(el).color, tint = gsap.utils.interpolate(col, o.tint), fs = parseFloat(getComputedStyle(el).fontSize);
      return MW.drive(tl, at, o.backAt + o.duration + 0.5, function (t) {
        pairs.forEach(function (p) {
          var u = Math.max(0, Math.min(1, (t - o.at - p.i * o.stagger) / o.duration)), v = Math.max(0, Math.min(1, (t - o.backAt - p.i * o.stagger) / o.duration)), q = ease(u) * (1 - ease(v));
          if (p.x0 != null && p.x1 != null) {
            var dx = p.x1 - p.x0, h = Math.min(0.4 * fs, 0.16 * fs + 0.18 * Math.abs(dx)) * (dx > 0 ? -1 : 1);
            gsap.set(p.s, { x: p.x0 + dx * q, y: h * Math.sin(Math.PI * q) }); p.s.style.opacity = "1"; p.s.style.color = tint(Math.sin(Math.PI * q));
          } else if (p.x0 != null) { gsap.set(p.s, { x: p.x0, y: -0.1 * fs * q }); p.s.style.opacity = String(1 - q); }
          else { gsap.set(p.s, { x: p.x1, y: 0.1 * fs * (1 - q) }); p.s.style.opacity = String(q); }
        });
      });
    },
    options: { from: "first word(s)", to: "second word(s) sharing letters", at: "s (0.4)", duration: "s per letter (0.6), cubic-bezier(.2,.8,.2,1)", stagger: "s (0.02)", backAt: "s it goes back (2.3)", tint: "accent mid-flight" },
    defaults: { from: "SÔNG NÚI", to: "NÚI SÔNG", at: 0.4, duration: 0.6, stagger: 0.02, backAt: 2.3, tint: "#a99bff" },
    demo: H("SÔNG NÚI", `MW.textAnagramFlip(q(".tk-head"), tl, 0, {});`, 4.2, { size: 200, weight: 900 }),
  }),

  T("text/balanced-reflow", {
    uses: ["lines", "drive", "eases"],
    fn: function (el, tl, at, o) {
      var card = o.card ? MW.el(o.card) : el.parentNode, html = el.innerHTML, io = MW.ez("in-out"), ex = gsap.parseEase("expo.out");
      var mk = function (w) { var d = document.createElement("div"); d.innerHTML = html; d.style.cssText = "position:absolute;left:" + o.pad + "px;top:" + o.pad + "px;width:" + (w - 2 * o.pad) + "px;text-wrap:balance;"; card.appendChild(d);
        var L = MW.lines(d, "words").lines; L.forEach(function (l) { var s = document.createElement("span"); s.style.display = "inline-block"; while (l.firstChild) s.appendChild(l.firstChild); l.appendChild(s); l.style.overflow = "hidden"; l.style.padding = "0.2em 0.05em"; l.style.margin = "-0.2em -0.05em"; }); return { d: d, L: L }; };
      el.style.display = "none"; var A = mk(o.wide), B = mk(o.narrow), plain = document.createElement("div");
      plain.innerHTML = html; plain.style.cssText = "position:absolute;left:" + o.pad + "px;top:" + o.pad + "px;text-wrap:balance;opacity:0.45;"; card.appendChild(plain);
      var rise = function (X, t0, t) { X.L.forEach(function (l, i) { var u = ex(Math.max(0, Math.min(1, (t - t0 - i * 0.08) / 0.6))); gsap.set(l.firstChild, { yPercent: (1 - u) * 130 }); }); };
      return MW.drive(tl, at, o.loop, function (t) {
        var w = o.wide + (o.narrow - o.wide) * (io(Math.max(0, Math.min(1, (t - 1.7) / 0.6))) - io(Math.max(0, Math.min(1, (t - 4.2) / 0.3)))); card.style.width = w + "px"; plain.style.width = (w - 2 * o.pad) + "px";
        var phase = t < 1.7 ? 0 : t < 2.45 ? 1 : 2, fade = 1 - Math.max(0, Math.min(1, (t - 4.2) / 0.25));
        A.d.style.visibility = phase === 0 ? "visible" : "hidden"; plain.style.visibility = phase === 1 ? "visible" : "hidden"; B.d.style.visibility = phase === 2 ? "visible" : "hidden"; B.d.style.opacity = String(fade);
        rise(A, 0.3, t); rise(B, 2.45, t);
      });
    },
    options: { wide: "card px (1120)", narrow: "px (640)", pad: "px (60)", card: "the card (the text's parent)", loop: "s (4.8)" },
    defaults: { wide: 1120, narrow: 640, pad: 60, card: null, loop: 4.8 },
    notes: "Lines are balanced (text-wrap: balance); after the box changes, the new lines rise again (a 150 ms debounce).",
    demo: { css: `${DARK}\n.br { position: absolute; left: 400px; top: 250px; height: 580px; border-radius: 40px; background: #151a28; border: 3px solid #2a3350; font-size: 64px; font-weight: 700; line-height: 1.3; }`,
      html: `<div class="br"><div class="brt">Mỗi dòng chữ được chia đều chiều dài để đoạn văn trông cân đối và dễ đọc hơn</div></div>`,
      run: `MW.textBalancedReflow(q(".brt"), tl, 0, {});`, duration: 4.8 },
  }),

  T("text/line-spacing-collapse", {
    uses: ["lines", "drive", "eases"],
    fn: function (el, tl, at, o) {
      var L = MW.lines(el, "words").lines, n = L.length, io = MW.ez("in-out");
      if (o.accent) L[n - 1].style.color = o.accent;
      var cl = function (a, b, t) { return Math.max(0, Math.min(1, (t - a) / (b - a))); };
      return MW.drive(tl, at, o.loop, function (t) {
        var fs = parseFloat(getComputedStyle(el).fontSize), e = o.spread * fs * (1 - io(cl(o.start, o.start + o.duration, t)) + io(cl(3.38, 3.75, t)));
        L.forEach(function (l, i) { gsap.set(l, { y: (i - (n - 1) / 2) * e }); });
        el.style.opacity = String(cl(0.1, 0.45, t) * (1 - cl(3.0, 3.35, t)));
      });
    },
    options: { spread: "extra space per gap at the start, em (1.5)", start: "s (0.6)", duration: "s (1)", accent: "the last line's colour", loop: "s (3.8)" },
    defaults: { spread: 1.5, start: 0.6, duration: 1, accent: "#a99bff", loop: 3.8 },
    demo: H("Ít chữ hơn<br>nhiều ý hơn<br>rõ ràng hơn", `MW.textLineSpacingCollapse(q(".tk-head"), tl, 0, {});`, 3.8, { size: 120 }, ".tk-head { line-height: 1.12; }"),
  }),

  T("text/kinetic-camera", {
    kind: "block",
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var world = el.querySelector(o.world), P = Array.prototype.slice.call(world.children), ease = MW.ez("cubic-bezier(.8,0,.2,1)"), p1 = gsap.parseEase("power1.out");
      var x = 0, y = 0, boxes = [];
      P.forEach(function (p, i) {
        p.style.position = "absolute"; p.style.whiteSpace = "nowrap"; var w = p.offsetWidth, h = p.offsetHeight, rot = i % 2 ? 90 : 0, bw = rot ? h : w, bh = rot ? w : h, b;
        if (i === 0) b = { x: 0, y: 0 }; else if (rot) b = { x: boxes[i - 1].x + boxes[i - 1].w + o.gap, y: boxes[i - 1].y }; else b = { x: boxes[i - 1].x, y: boxes[i - 1].y + boxes[i - 1].h + o.gap };
        b.w = bw; b.h = bh; b.rot = rot; b.cx = b.x + bw / 2; b.cy = b.y + bh / 2; boxes.push(b);
        p.style.left = (b.cx - w / 2) + "px"; p.style.top = (b.cy - h / 2) + "px"; p.style.transform = "rotate(" + rot + "deg)";
      });
      var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9; boxes.forEach(function (b) { minX = Math.min(minX, b.x); minY = Math.min(minY, b.y); maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h); });
      var W = el.offsetWidth, Hh = el.offsetHeight, cams = boxes.map(function (b) { return { x: b.cx, y: b.cy, r: -b.rot, z: Math.min(W * 0.69 / b.w, Hh * 0.35 / b.h, 3) }; });
      cams.push({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, r: 0, z: Math.min(W * 0.85 / (maxX - minX), Hh * 0.8 / (maxY - minY)) });
      var land = function (i) { return o.start + o.each * i; };
      return MW.drive(tl, at, o.fadeAt + 0.4, function (t) {
        var c = cams[0];
        for (var i = 1; i < cams.length; i++) { var t1 = i < P.length ? land(i) : land(P.length - 1) + 0.7 + 0.55, d = i < P.length ? 0.4 : 0.55; if (t >= t1 - d) { var u = ease(Math.min(1, (t - t1 + d) / d)), a = cams[i - 1], b = cams[i]; c = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, r: a.r + (b.r - a.r) * u, z: Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * u) }; } }
        world.style.transformOrigin = "0 0"; world.style.transform = "translate(" + W / 2 + "px," + Hh / 2 + "px) rotate(" + c.r + "deg) scale(" + c.z + ") translate(" + (-c.x) + "px," + (-c.y) + "px)";
        P.forEach(function (p, i) { var d = t - land(i), s = d < 0 ? 0 : d < 0.12 ? 0.5 + 0.58 * p1(d / 0.12) : d < 0.24 ? 1.08 - 0.08 * p1((d - 0.12) / 0.12) : 1; p.style.opacity = d >= 0 ? "1" : "0"; p.style.transform = "rotate(" + boxes[i].rot + "deg) scale(" + s + ")"; });
        el.style.opacity = String(1 - Math.max(0, Math.min(1, (t - o.fadeAt) / 0.4)));
      });
    },
    options: { world: "the plane holding the phrases", start: "s the first phrase lands (0.3)", each: "s between phrases (0.85)", gap: "px (40)", fadeAt: "s (5.2)" },
    defaults: { world: ".kc-w", start: 0.3, each: 0.85, gap: 40, fadeAt: 5.2 },
    demo: { css: `${DARK}\n.kc { position: absolute; inset: 0; overflow: hidden; } .kc-w { position: absolute; left: 0; top: 0; } .kc-w span { font-weight: 900; letter-spacing: -0.02em; line-height: 1; }`,
      html: `<div class="kc"><div class="kc-w"><span style="font-size:176px">Mỗi ngày</span><span style="font-size:120px;color:#a99bff">một</span><span style="font-size:224px">câu chuyện</span><span style="font-size:144px;color:#3dd6f5">mới</span></div></div>`,
      run: `MW.textKineticCamera(q(".kc"), tl, 0, {});`, duration: 5.6 },
  }),

  T("ui/read-more-expand", {
    kind: "block",
    uses: ["lines", "drive", "eases", "draw"],
    fn: function (el, tl, at, o) {
      var body = el.querySelector(o.body), link = el.querySelector(o.link), below = o.below ? MW.el(o.below) : null, io = MW.ez("in-out"), L = MW.lines(body, "words").lines, cur = o.cursor ? MW.el(o.cursor) : null;
      var lh = L[0].offsetHeight, n = L.length, ell = document.createElement("span"); ell.textContent = "…"; ell.style.cssText = "position:absolute;right:0;top:0;padding-left:30px;background:linear-gradient(90deg, rgba(21,26,40,0), #151a28 30px);";
      body.style.position = "relative"; body.style.overflow = "hidden"; body.appendChild(ell);
      return MW.drive(tl, at, o.loop, function (t) {
        var p = io(Math.max(0, Math.min(1, (t - o.openAt) / 0.45))) * (1 - io(Math.max(0, Math.min(1, (t - o.closeAt) / 0.45)))), h = lh * (1 + (n - 1) * p);
        body.style.height = h + "px"; ell.style.opacity = String(Math.max(0, 1 - 2 * p));
        L.forEach(function (l, i) { l.style.opacity = i === 0 ? "1" : String(Math.max(0, Math.min(1, (h - i * lh) / lh))); });
        link.firstChild.nodeValue = p > 0.5 ? o.less : o.more; link.classList.toggle("open", p > 0.5);
        if (below) gsap.set(below, { y: (n - 1) * lh * p });
        if (cur) { var c = MW.path([[0, 1300, 900], [0.6, 1300, 900], [1.0, link.offsetLeft + el.offsetLeft + 60, link.offsetTop + el.offsetTop + 30], [3.1, link.offsetLeft + el.offsetLeft + 60, link.offsetTop + el.offsetTop + 30]], t); cur.style.left = c[0] + "px"; cur.style.top = (c[1] + (t > 1.6 ? (n - 1) * lh * p : 0)) + "px"; gsap.set(cur, { scale: (t > 1.0 && t < 1.2) || (t > 3.5 && t < 3.7) ? 0.9 : 1 }); }
      });
    },
    options: { openAt: "s (1.1), 0.45 s in-out", closeAt: "s (3.6)", body: "the paragraph (clamped to one line)", link: "the link", more: "label", less: "label when open", below: "the element pushed down", cursor: "the cursor", loop: "s (4.8)" },
    defaults: { openAt: 1.1, closeAt: 3.6, body: ".rm-body", link: ".rm-link", more: "Xem thêm", less: "Thu gọn", below: null, cursor: null, loop: 4.8 },
    demo: { css: `${DARK}\n.rm { position: absolute; left: 390px; top: 140px; width: 1140px; border-radius: 40px; background: #151a28; border: 3px solid #2a3350; padding: 50px 60px; box-sizing: border-box; }
.rm h3 { margin: 0 0 24px; font-size: 52px; } .rm-body { font-size: 40px; font-weight: 600; line-height: 1.5; color: #c9d2ea; } .rm-link { display: inline-block; margin-top: 30px; font-size: 40px; font-weight: 800; color: #a99bff; position: relative; padding-right: 44px; }
.rm-link::after { content: ""; position: absolute; right: 6px; top: 12px; width: 14px; height: 14px; border: solid #a99bff; border-width: 0 5px 5px 0; transform: rotate(45deg); } .rm-link.open::after { top: 22px; transform: rotate(-135deg); }
.rm-next { position: absolute; left: 390px; top: 540px; width: 1140px; height: 220px; border-radius: 40px; background: #1b2130; border: 3px solid #262c3a; } .ui-cursor { position: absolute; z-index: 20; }`,
      html: `<div class="rm"><h3>Về dự án</h3><div class="rm-body">Moworks Studio giúp bạn làm video từ ý tưởng đến bản dựng cuối cùng, với thư viện chuyển động phong phú, giọng đọc tiếng Việt tự nhiên và công cụ kiểm tra trước khi xuất.</div><div class="rm-link">Xem thêm</div></div><div class="rm-next"></div>${CURSOR}`,
      run: `MW.uiReadMoreExpand(q(".rm"), tl, 0, { below: ".rm-next", cursor: ".ui-cursor" });`, duration: 4.8 },
  }),
];

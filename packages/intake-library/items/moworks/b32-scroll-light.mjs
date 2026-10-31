// Scroll and Light & Glow (batch 3.2): scroll-driven text (a scripted progress stands in for the scroll, on the film's clock) and light
// effects, written here. Sizes: a 320 px frame × 4-5.
import { T } from "../../moworks/define.mjs";
import { headline, demo, CURSOR } from "../../moworks/stages.mjs";
import { LANDSCAPE } from "../../demo-media.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 40%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }
.ui-cursor { position: absolute; left: 0; top: 0; z-index: 30; filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5)); }`;
const H = (text, run, duration = 3.8, opt = {}, css = "") => demo(headline(text, opt), run, duration, css);

export default [
  T("data/chapter-scrub-reel", {
    uses: ["drive", "draw", "eases"],
    fn: function (el, tl, at, o) {
      var reel = el.querySelector(o.reel), thumb = el.querySelector(o.thumb), fill = el.querySelector(o.fill), cur = o.cursor ? MW.el(o.cursor) : null, io = MW.ez("in-out");
      var K = [[0, 0, 0], [0.5, 0, 0], [1.1, 0.3, 0], [1.4, 0.38, 0], [2.3, 1, 0], [2.9, 1, 0], [3.6, 0, 0]];
      return MW.drive(tl, at, 3.8, function (t) {
        var p = MW.path(K, t, io)[0], n = reel.children.length, pitch = reel.firstElementChild.offsetHeight;
        gsap.set(reel, { y: -p * (n - 1) * pitch }); var W = thumb.parentNode.offsetWidth; gsap.set(thumb, { x: p * W, scale: t > 0.4 && t < 3.7 ? 1.15 : 1 }); fill.style.width = (p * 100) + "%";
        if (cur) { var r = thumb.getBoundingClientRect(), b = el.parentNode.getBoundingClientRect(); cur.style.left = (r.left - b.left + r.width / 2) + "px"; cur.style.top = (r.top - b.top + r.height / 2) + "px"; }
      });
    },
    options: { reel: "the column of chapter numbers", thumb: "the slider thumb", fill: "the track's fill", cursor: "the cursor holding the thumb" },
    defaults: { reel: ".cs-reel", thumb: ".cs-th", fill: ".cs-fill", cursor: null },
    demo: { css: `${BG}\n.cs { position: absolute; left: 50%; top: 50%; width: 1200px; height: 700px; margin: -350px 0 0 -600px; border-radius: 50px; background: #151a28; border: 3px solid #2a3350; }
.cs-win { position: absolute; left: 50%; top: 110px; width: 480px; height: 320px; margin-left: -240px; border-radius: 40px; background: #0d1018; overflow: hidden; } .cs-reel div { height: 320px; display: grid; place-items: center; font-size: 220px; font-weight: 800; color: #a99bff; font-variant-numeric: tabular-nums; }
.cs-tr { position: absolute; left: 100px; right: 100px; top: 560px; height: 12px; border-radius: 6px; background: #222a42; } .cs-fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 6px; background: #8b7bff; }
.cs-tr i { position: absolute; top: -14px; width: 4px; height: 40px; background: #3a4466; } .cs-th { position: absolute; left: -35px; top: -29px; width: 70px; height: 70px; border-radius: 50%; background: #fff; }
.cs-lab { position: absolute; left: 0; right: 0; top: 40px; text-align: center; font-size: 40px; color: #9aa3b8; letter-spacing: 0.2em; font-weight: 700; }`,
      html: `<div class="gm"><div class="cs"><div class="cs-lab">CHƯƠNG</div><div class="cs-win"><div class="cs-reel"><div>01</div><div>02</div><div>03</div><div>04</div></div></div>
<div class="cs-tr"><div class="cs-fill"></div><i style="left:0"></i><i style="left:33.3%"></i><i style="left:66.6%"></i><i style="left:100%"></i><div class="cs-th"></div></div></div>${CURSOR}</div>`,
      run: `MW.dataChapterScrubReel(q(".cs"), tl, 0, { cursor: ".ui-cursor" });`, duration: 3.8 },
  }),

  T("text/scroll-word-highlight", {
    uses: ["split", "drive", "eases"],
    fn: function (el, tl, at, o) {
      var ws = MW.split(el, "words").words, n = ws.length, ease = MW.ez("cubic-bezier(.4,0,.6,1)"), col = getComputedStyle(el).color, mix = gsap.utils.interpolate(col, o.accent);
      return MW.drive(tl, at, o.backAt + 0.4, function (t) {
        var p = ease(Math.max(0, Math.min(1, (t - 0.3) / 2.2))) * (1 - ease(Math.max(0, Math.min(1, (t - o.backAt) / 0.4))));
        ws.forEach(function (w, k) { var s = 0.8 * k / Math.max(1, n - 1), q = Math.max(0, Math.min(1, (p - s) / 0.2)); w.style.opacity = String(o.dim + (1 - o.dim) * q); w.style.color = mix(0.9 * Math.sin(Math.PI * q)); });
      });
    },
    options: { dim: "opacity before (0.15)", accent: "the flash as a word lights", backAt: "s (3.15)" }, defaults: { dim: 0.15, accent: "#a99bff", backAt: 3.15 },
    demo: H("Mỗi từ sáng lên theo đúng nhịp đọc, như khi bạn cuộn trang xuống", `MW.textScrollWordHighlight(q(".tk-head"), tl, 0, {});`, 3.8, { size: 92, weight: 700 }, ".tk-head { text-align: left; max-width: 1400px; }"),
  }),

  T("text/view-word-reveal", {
    uses: ["split", "drive", "eases"],
    fn: function (el, tl, at, o) {
      var ws = MW.split(el, "words").words, page = o.page ? MW.el(o.page) : el.parentNode, io = MW.ez("in-out"), out = gsap.parseEase("power2.out"), fs = parseFloat(getComputedStyle(el).fontSize);
      return MW.drive(tl, at, 3.8, function (t) {
        var s = io(Math.max(0, Math.min(1, (t - 0.3) / 1.6))) * (1 - io(Math.max(0, Math.min(1, (t - 2.9) / 0.6)))); gsap.set(page, { y: o.scroll * (1 - s) });
        ws.forEach(function (w, k) { var q = Math.max(0, Math.min(1, (s - 0.03 * k) / (0.35 - 0.03 * k > 0.05 ? 0.35 - 0.03 * k : 0.05))); gsap.set(w, { y: 0.4 * fs * (1 - out(q)) }); w.style.opacity = String(0.1 + 0.9 * q); });
      });
    },
    options: { scroll: "px the page travels up into view (400)", page: "the scrolling page (the text's parent)" }, defaults: { scroll: 400, page: null },
    demo: { css: `${BG}\n.vw { position: absolute; left: 50%; top: 50%; width: 1000px; height: 790px; margin: -395px 0 0 -500px; border-radius: 40px; background: #10131d; border: 4px solid #2a3350; overflow: hidden; }
.vw-p { position: absolute; left: 60px; right: 60px; top: 60px; } .vw-p i { display: block; height: 50px; border-radius: 25px; background: #1b2130; margin-bottom: 30px; } .vw-p h2 { margin: 50px 0; font-size: 84px; line-height: 1.25; font-weight: 800; }`,
      html: `<div class="gm"><div class="vw"><div class="vw-p"><i></i><i style="width:70%"></i><h2>Chuyển động dẫn mắt người xem tới đúng chỗ</h2><i></i><i style="width:80%"></i><i></i></div></div></div>`,
      run: `MW.textViewWordReveal(q(".vw-p h2"), tl, 0, {});`, duration: 3.8 },
  }),

  T("text/scroll-blur-tilt", {
    uses: ["split", "drive", "eases"],
    fn: function (el, tl, at, o) {
      var ws = MW.split(el, "words").words, n = ws.length, ease = MW.ez("cubic-bezier(.4,0,.6,1)"), st = Math.min(0.05, 0.5 / Math.max(1, n - 1));
      el.style.transformOrigin = "0% 50%";
      return MW.drive(tl, at, 3.5, function (t) {
        var p = ease(Math.max(0, Math.min(1, (t - 0.3) / 1.9))) * (1 - ease(Math.max(0, Math.min(1, (t - 3.0) / 0.5)))); gsap.set(el, { rotation: o.tilt * (1 - p) });
        ws.forEach(function (w, k) { var q = Math.max(0, Math.min(1, (p - k * st) / (1 - st * (n - 1)))); w.style.opacity = String(0.1 + 0.9 * q); w.style.filter = q < 1 ? "blur(" + o.blur * (1 - q) + "px)" : ""; });
      });
    },
    options: { tilt: "degrees at the start (3)", blur: "px (12)" }, defaults: { tilt: 3, blur: 12 },
    demo: H("Đoạn chữ thẳng dần và rõ dần từng từ khi người xem cuộn tới", `MW.textScrollBlurTilt(q(".tk-head"), tl, 0, {});`, 3.8, { size: 92, weight: 700 }, ".tk-head { text-align: left; max-width: 1400px; }"),
  }),

  T("text/clip-wipe-on", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var io = MW.ez("in-out"), ghost = el.cloneNode(true), line = document.createElement("div");
      el.style.position = "relative"; ghost.removeAttribute("id"); ghost.style.cssText = "position:absolute;left:0;top:0;width:100%;margin:0;opacity:" + o.ghost + ";pointer-events:none;"; el.parentNode.insertBefore(ghost, el); ghost.style.left = el.offsetLeft + "px"; ghost.style.top = el.offsetTop + "px"; ghost.style.width = el.offsetWidth + "px";
      line.style.cssText = "position:absolute;top:-0.4em;bottom:-0.3em;width:" + o.line + "px;background:" + o.color + ";pointer-events:none;"; el.appendChild(line);
      return MW.drive(tl, at, 3.4, function (t) {
        var s = io(Math.max(0, Math.min(1, (t - 0.3) / 2.0))), w = Math.max(0, Math.min(1, (s - 0.3) / 0.4)); if (t > 2.95) w *= 1 - io(Math.min(1, (t - 2.95) / 0.45));
        var W = el.offsetWidth; el.style.clipPath = "inset(-0.4em " + (W * (1 - w) - 2) + "px -0.3em -2px)"; line.style.left = (W * w - o.line / 2) + "px"; line.style.opacity = w > 0 && w < 1 ? "1" : "0";
      });
    },
    options: { ghost: "opacity of the ghost text (0.07)", line: "px of the accent edge (6)", color: "edge colour" }, defaults: { ghost: 0.07, line: 6, color: "#8b7bff" },
    demo: H("Chữ hiện theo vệt quét", `MW.textClipWipeOn(q(".tk-head"), tl, 0, {});`, 3.6, { size: 150 }),
  }),

  T("text/velocity-marquee", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var bands = Array.prototype.slice.call(el.querySelectorAll(o.bands)), p1 = gsap.parseEase("power1.out"), dt = 1 / 120;
      bands.forEach(function (b) { var t0 = b.innerHTML; b.innerHTML = ""; var s = document.createElement("span"); s.style.cssText = "display:inline-block;white-space:nowrap;"; for (var i = 0; i < 12; i++) s.innerHTML += t0; b.appendChild(s); b.__w = s.offsetWidth / 12; b.__s = s; });
      var boost = function (t) { var v = 0; o.boosts.forEach(function (q) { var d = t - q[0]; if (d < 0) return; v += q[1] * (d < 0.25 ? p1(d / 0.25) : Math.exp(-4 * (d - 0.25))); }); return v; };
      var dir = function (t) { var d = -1; o.boosts.forEach(function (q) { if (t >= q[0] && q[2]) d = -d; }); return d; };
      var I = function (T) { var x = 0; for (var s = 0; s < T; s += dt) x += dir(s) * (1 + boost(s)) * dt; return x; }, tot = I(o.loop);
      return MW.drive(tl, at, o.loop, function (t) {
        var x = I(t);
        bands.forEach(function (b, i) { var sp = o.speeds[i] || o.speeds[0], whole = Math.max(1, Math.round(Math.abs(tot * sp) / b.__w)) * b.__w * Math.sign(tot || 1), k = tot ? whole / tot : 0, X = x * k * (i % 2 ? -1 : 1);
          var m = ((X % b.__w) + b.__w) % b.__w; gsap.set(b.__s, { x: -b.__w * 3 + m }); });
      });
    },
    options: { bands: "selector of the bands", speeds: "base px/s per band ([230, 200])", boosts: "[[s, strength, flips direction], ...] ([[0.6, 4, 0], [2.3, 4, 1], [3.9, 2.5, 1]])", loop: "s (5); the travel is rounded to whole copies so it loops" },
    defaults: { bands: ".vm-b", speeds: [230, 200], boosts: [[0.6, 4, 0], [2.3, 4, 1], [3.9, 2.5, 1]], loop: 5 },
    demo: { css: `${BG}\n.vm { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; gap: 70px; overflow: hidden; } .vm-b { white-space: nowrap; }
.vm-b.a { font-size: 230px; font-weight: 900; } .vm-b.b { font-size: 120px; font-weight: 900; color: transparent; -webkit-text-stroke: 4px #a99bff; }`,
      html: `<div class="gm vm"><div class="vm-b a">Làm video nhanh hơn  ·  </div><div class="vm-b b">Kể chuyện hay hơn  ·  </div></div>`, run: `MW.textVelocityMarquee(q(".vm"), tl, 0, {});`, duration: 5 },
  }),

  T("motion/velocity-skew", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var io = MW.ez("in-out"), dt = 1 / 240, Y = function (t) { return -o.distance * (io(Math.max(0, Math.min(1, (t - 0.3) / 0.5))) - io(Math.max(0, Math.min(1, (t - 2.0) / 0.5)))); };
      var V = function (t) { return (Y(t + 0.002) - Y(t - 0.002)) / 0.004; };
      return MW.drive(tl, at, 3.8, function (t) {
        var x = 0, v = 0; for (var s = 0; s < t; s += dt) { var sv = Math.max(-1, Math.min(1, V(s) / o.vmax)); var a = o.k * (sv - x) - o.c * v; v += a * dt; x += v * dt; }
        gsap.set(el, { y: Y(t), skewY: Math.max(-o.clamp, Math.min(o.clamp, -o.max * x)) });
      });
    },
    options: { distance: "px it moves (230)", vmax: "px/s that gives full skew (875)", max: "degrees at full speed (16)", clamp: "degrees (20)", k: "follow spring stiffness (150)", c: "damping (11)" },
    defaults: { distance: 230, vmax: 875, max: 16, clamp: 20, k: 150, c: 11 },
    demo: { css: `${BG}\n.vs { position: absolute; left: 50%; top: 50%; width: 1300px; transform: translate(-50%, -50%); } .vs i { display: block; height: 50px; border-radius: 25px; background: #1b2130; margin: 40px 0; }
.vs h2 { margin: 0; font-size: 170px; font-weight: 900; letter-spacing: -0.02em; }`,
      html: `<div class="gm"><div class="vs"><i></i><i style="width:60%"></i><h2>Nghiêng theo tốc độ</h2><i style="width:80%"></i><i></i></div></div>`, run: `MW.motionVelocitySkew(q(".vs h2"), tl, 0, {});`, duration: 3.8 },
  }),

  T("text/letter-drop-slide", {
    uses: ["split", "drive", "eases"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, n = ch.length, ease = MW.ez("cubic-bezier(.3,0,.5,1)"), bk = gsap.parseEase("back.out(2)"), each = Math.min(0.05, 0.4 / Math.max(1, n - 1)), fs = parseFloat(getComputedStyle(el).fontSize);
      ch.forEach(function (c) { c.style.transformOrigin = "50% 85%"; });
      return MW.drive(tl, at, 3.8, function (t) {
        var p = ease(Math.max(0, Math.min(1, (t - 0.3) / 2.0))); if (t > 3.1) p *= 1 - ease(Math.min(1, (t - 3.1) / 0.6));
        gsap.set(el, { x: (el.offsetWidth + o.gap) * (1 - Math.min(1, p / 0.7)) });
        ch.forEach(function (c, i) { var q = Math.max(0, Math.min(1, (p - 0.12 - i * each) / 0.45)), b = bk(q); gsap.set(c, { y: -o.drop * fs * (1 - b), scale: Math.max(0.2, 3 - 2 * b) }); c.style.opacity = String(Math.min(1, q / 0.25)); });
      });
    },
    options: { drop: "em each letter falls (2.9)", gap: "px beyond its width the title slides in from (200)" }, defaults: { drop: 2.9, gap: 200 },
    demo: H("RƠI ĐÚNG CHỖ", `MW.textLetterDropSlide(q(".tk-head"), tl, 0, {});`, 4, { size: 200, weight: 900 }, ".tk-stage::after { content: ''; position: absolute; left: 300px; right: 300px; top: 650px; height: 4px; background: #2a3350; }"),
  }),

  T("text/wave-columns", {
    kind: "block",
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var cols = [o.words, o.words.slice().reverse()], io = MW.ez("in-out"), items = [];
      cols.forEach(function (list, ci) { list.forEach(function (w, i) { var s = document.createElement("div"); s.textContent = w; s.style.cssText = "position:absolute;left:0;top:0;white-space:nowrap;font-weight:800;"; el.appendChild(s); items.push({ s: s, c: ci, i: i }); }); });
      return MW.drive(tl, at, 4, function (t) {
        var W = el.offsetWidth, Hh = el.offsetHeight, k = Hh / 200, step = io(Math.max(0, Math.min(1, (t - 0.3) / 0.5))) + io(Math.max(0, Math.min(1, (t - 1.3) / 0.5))) - io(Math.max(0, Math.min(1, (t - 2.3) / 0.5))) - io(Math.max(0, Math.min(1, (t - 3.3) / 0.5)));
        items.forEach(function (it) {
          var n = cols[it.c].length, dy = (it.i - (n - 1) / 2 - step * (it.c ? -1 : 1)) * 32, h = Math.max(0, 1 - Math.abs(dy) / 32), cx = (it.c ? 0.71 : 0.29) * W, x = cx + (it.c ? -1 : 1) * 20 * k * Math.sin(0.032 * dy + 1.1);
          it.s.style.fontSize = (16 + 10 * h) * k + "px"; it.s.style.color = h > 0.5 ? o.accent : ""; var edge = Math.min(1, Math.max(0, (100 - Math.abs(dy)) / 26));
          it.s.style.opacity = String((0.35 + 0.65 * h) * edge); gsap.set(it.s, { x: x, y: Hh / 2 + dy * k, xPercent: -50, yPercent: -50 });
        });
      });
    },
    options: { words: "the list (the second column runs it reversed)", accent: "colour of the word at the centre" },
    defaults: { words: ["Ý tưởng", "Kịch bản", "Phân cảnh", "Giọng đọc", "Âm nhạc", "Dựng phim", "Xuất bản"], accent: "#a99bff" },
    demo: { css: `${BG}\n.wc { position: absolute; inset: 0; overflow: hidden; }`, html: `<div class="gm wc"></div>`, run: `MW.textWaveColumns(q(".wc"), tl, 0, {});`, duration: 4 },
  }),

  T("text/echo-fan", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var io = MW.ez("in-out"), copies = [], host = el.parentNode, fs = parseFloat(getComputedStyle(el).fontSize);
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      [1, 2, 3].forEach(function (m) { [-1, 1].forEach(function (sd) { var c = el.cloneNode(true); c.removeAttribute("id"); c.style.position = "absolute"; c.style.margin = "0"; c.style.left = el.offsetLeft + "px"; c.style.top = el.offsetTop + "px"; c.style.width = el.offsetWidth + "px"; c.style.color = "transparent"; c.style.webkitTextStroke = o.stroke + "px " + (m === 1 ? o.accent : o.mute); c.style.pointerEvents = "none"; c.style.transformOrigin = "50% " + (el.offsetHeight + o.pivot * fs) + "px"; host.insertBefore(c, el); copies.push({ c: c, m: m, sd: sd }); }); });
      return MW.drive(tl, at, 3.6, function (t) {
        var p = io(Math.max(0, Math.min(1, (t - 0.4) / 1.0))) * (1 - io(Math.max(0, Math.min(1, (t - 2.3) / 0.9))));
        copies.forEach(function (q) { gsap.set(q.c, { rotation: q.sd * q.m * o.angle * p, scale: 1 - 0.04 * q.m * p }); q.c.style.opacity = String((1 - q.m / 4) * p); });
      });
    },
    options: { angle: "degrees per copy (7)", pivot: "em below the text where the fan turns (2.8)", stroke: "px (3)", accent: "the nearest pair's colour", mute: "the others'" },
    defaults: { angle: 7, pivot: 2.8, stroke: 3, accent: "#8b7bff", mute: "#4a5478" },
    demo: H("TIẾNG VỌNG", `MW.textEchoFan(q(".tk-head"), tl, 0, {});`, 3.6, { size: 220, weight: 900 }),
  }),

  T("transition/zoom-through-letter", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var word = el.querySelector(o.word), full = el.querySelector(o.picture), io = MW.ez("in-out"), mid = null;
      return MW.drive(tl, at, 3.9, function (t) {
        if (!mid) { var r = word.getBoundingClientRect(), b = el.getBoundingClientRect(); mid = [r.left - b.left + r.width * o.focus[0], r.top - b.top + r.height * o.focus[1]]; word.style.transformOrigin = (r.width * o.focus[0]) + "px " + (r.height * o.focus[1]) + "px"; }
        var z = t < 3.25 ? io(Math.max(0, Math.min(1, (t - 0.5) / 1.7))) : 0, s = Math.pow(o.scale, z), W = el.offsetWidth, Hh = el.offsetHeight;
        gsap.set(word, { x: (W / 2 - mid[0]) * z, y: (Hh / 2 - mid[1]) * z, scale: s });
        var f = t < 3.25 ? Math.max(0, Math.min(1, (t - 1.95) / 0.35)) : 1 - Math.max(0, Math.min(1, (t - 3.3) / 0.6)); full.style.opacity = String(f);
      });
    },
    options: { scale: "zoom reached (60), exponential: scale = 60^z", focus: "the point zoomed into, 0-1 of the word's box (the thickest stroke of the middle letter)", word: "the word filled with the next picture", picture: "the full picture that takes over" },
    defaults: { scale: 60, focus: [0.5, 0.55], word: ".zt-w", picture: ".zt-full" },
    assets: [{ path: "next.svg", data: LANDSCAPE }],
    demo: { css: `${BG}\n.zt { position: absolute; inset: 0; overflow: hidden; background: #0b0d12; display: grid; place-items: center; } .zt-w { font-size: 460px; font-weight: 900; letter-spacing: -0.03em; line-height: 1; color: transparent;
  background: url(assets/next.svg) center / cover; -webkit-background-clip: text; background-clip: text; -webkit-text-stroke: 3px rgba(255,255,255,0.35); padding: 0.2em 0.05em 0.05em; }
.zt-full { position: absolute; inset: 0; background: url(assets/next.svg) center / cover; opacity: 0; }`,
      html: `<div class="gm zt"><div class="zt-w">BIỂN</div><div class="zt-full"></div></div>`, run: `MW.transitionZoomThroughLetter(q(".zt"), tl, 0, {});`, duration: 3.9 },
  }),

  T("text/sticky-shrink", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var io = MW.ez("in-out"), rows = o.rows ? MW.el(o.rows) : null, slot = o.slot ? MW.el(o.slot) : null, x0 = el.offsetLeft, y0 = el.offsetTop, fit = Math.min(o.scale, o.maxWidth / el.offsetWidth);
      el.style.transformOrigin = "0 0";
      return MW.drive(tl, at, 3.6, function (t) {
        var p = io(Math.max(0, Math.min(1, (t - 0.4) / 1.4))) * (1 - io(Math.max(0, Math.min(1, (t - 2.9) / 0.6))));
        gsap.set(el, { x: (o.inset[0] - x0) * p, y: (o.inset[1] - y0) * p, scale: 1 + (fit - 1) * p }); if (rows) gsap.set(rows, { y: -o.scroll * p }); if (slot) slot.style.opacity = String(p);
      });
    },
    options: { scale: "end scale (0.15)", maxWidth: "px it may span in the header (800)", inset: "[x, y] px of its spot in the header ([60, 30])", rows: "the page rows that scroll up", scroll: "px (450)", slot: "the dashed slot outline" },
    defaults: { scale: 0.15, maxWidth: 800, inset: [60, 30], rows: null, scroll: 450, slot: null },
    demo: { css: `${BG}\n.ss { position: absolute; left: 50%; top: 50%; width: 1460px; height: 840px; margin: -420px 0 0 -730px; border-radius: 30px; background: #10131d; border: 4px solid #2a3350; overflow: hidden; }
.ss-hd { position: absolute; left: 0; right: 0; top: 0; height: 120px; background: #151a28; z-index: 3; } .ss-hd b { position: absolute; top: 40px; width: 110px; height: 40px; border-radius: 20px; background: #2a3350; }
.ss-slot { position: absolute; left: 56px; top: 26px; width: 520px; height: 70px; border: 3px dashed #4a5478; border-radius: 12px; opacity: 0; z-index: 4; } .ss-h { position: absolute; left: 80px; top: 200px; font-size: 220px; font-weight: 900; line-height: 1.05; letter-spacing: -0.03em; z-index: 5; margin: 0; }
.ss-rows { position: absolute; left: 80px; right: 80px; top: 690px; } .ss-rows i { display: block; height: 50px; border-radius: 25px; background: #1b2130; margin-bottom: 36px; }`,
      html: `<div class="gm"><div class="ss"><div class="ss-hd"><b style="right:300px"></b><b style="right:170px"></b><b style="right:40px"></b></div><div class="ss-slot"></div><h1 class="ss-h">Bản tin<br>buổi sáng</h1><div class="ss-rows"><i></i><i style="width:70%"></i><i></i><i style="width:85%"></i><i></i></div></div></div>`,
      run: `MW.textStickyShrink(q(".ss-h"), tl, 0, { rows: ".ss-rows", slot: ".ss-slot" });`, duration: 3.8 },
  }),

  T("text/line-parallax", {
    uses: ["lines", "drive", "eases", "draw"],
    fn: function (el, tl, at, o) {
      var L = MW.lines(el, "words").lines, io = MW.ez("in-out"), K = [[0, 0.5, 0], [0.3, 0.5, 0], [1.2, 1, 0], [1.7, 1, 0], [2.8, 0, 0], [3.3, 0, 0], [4.0, 0.5, 0]];
      L.forEach(function (l, i) { if (o.speeds[i] === Math.max.apply(null, o.speeds)) l.style.color = o.accent; if (o.speeds[i] === Math.min.apply(null, o.speeds)) l.style.opacity = "0.75"; });
      return MW.drive(tl, at, 4, function (t) { var p = MW.path(K, t, io)[0]; L.forEach(function (l, i) { gsap.set(l, { y: -(p - 0.5) * 2 * o.amp * (o.speeds[i] || 1) }); }); });
    },
    options: { speeds: "per line ([1.4, 1, 0.6])", amp: "px (90)", accent: "the fastest line's colour" }, defaults: { speeds: [1.4, 1, 0.6], amp: 90, accent: "#a99bff" },
    demo: H("Dòng nhanh ở gần<br>dòng vừa ở giữa<br>dòng chậm ở xa", `MW.textLineParallax(q(".tk-head"), tl, 0, {});`, 4, { size: 110 }, ".tk-head { text-align: left; line-height: 1.7; }"),
  }),

  T("effect/glow-pulse", {
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var ring = document.createElement("div"), e = MW.ez("cubic-bezier(.45,.05,.2,1)"), host = el.parentNode;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      ring.style.cssText = "position:absolute;pointer-events:none;border-radius:50%;box-sizing:border-box;border:" + o.ring + "px solid " + o.color + ";"; host.insertBefore(ring, el);
      return MW.drive(tl, at, o.period * o.cycles, function (t) {
        var u = (t / o.period) % 1, k = u < 0.5 ? e(u * 2) : 1 - e((u - 0.5) * 2), R = el.offsetWidth * 4 / 3;
        el.style.boxShadow = "0 0 " + (o.glow[0] + (o.glow[1] - o.glow[0]) * k) + "px " + o.color; el.style.filter = "brightness(" + (0.92 + 0.3 * k) + ")"; gsap.set(el, { scale: 0.98 + 0.05 * k });
        ring.style.width = ring.style.height = R + "px"; ring.style.left = (el.offsetLeft + el.offsetWidth / 2 - R / 2) + "px"; ring.style.top = (el.offsetTop + el.offsetHeight / 2 - R / 2) + "px";
        gsap.set(ring, { scale: 0.9 + 0.45 * k }); ring.style.opacity = String(0.28 + 0.62 * k); ring.style.filter = "blur(" + (5 + 5 * k) + "px)";
      });
    },
    options: { period: "s per cycle (1.1)", cycles: "(3)", glow: "px of the glow, rest to peak ([32, 104])", ring: "px of the ring's border (30)", color: "glow colour" },
    defaults: { period: 1.1, cycles: 3, glow: [32, 104], ring: 30, color: "#8b7bff" },
    demo: { css: `${BG}\n.gp { position: absolute; inset: 0; display: grid; place-items: center; } .gp-d { position: relative; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #c9bfff, #7357f5); }`,
      html: `<div class="gm gp"><div class="gp-d"></div></div>`, run: `MW.effectGlowPulse(q(".gp-d"), tl, 0, {});`, duration: 3.3 },
  }),

  T("effect/neon-flicker", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var lit = el.querySelector(o.lit) || el, wash = o.wash ? el.querySelector(o.wash) : null, S = [[0, 0.2], [0.09, 1], [0.14, 0.35], [0.22, 1], [0.31, 0.55], [0.42, 1]];
      return MW.drive(tl, at, o.duration + 0.2, function (t) {
        var u = t / o.duration, a = 0; if (t > 0) S.forEach(function (s) { if (u >= s[0]) a = s[1]; });
        lit.style.opacity = String(a); if (wash) wash.style.opacity = String(0.16 * a);
      });
    },
    options: { duration: "s it takes to come on (0.9): held steps 20 / 100 / 35 / 100 / 55 / 100 %", lit: "the lit layer (the dim tube stays under it)", wash: "the soft glow behind" },
    defaults: { duration: 0.9, lit: ".nf-lit", wash: ".nf-wash" },
    demo: { css: `${BG}\n#demo { background: #07080d; } .nf { position: absolute; left: 50%; top: 50%; width: 1100px; height: 460px; margin: -230px 0 0 -550px; }
.nf > div { position: absolute; inset: 0; border-radius: 60px; display: grid; place-items: center; font-size: 200px; font-weight: 800; letter-spacing: 0.08em; }
.nf-dim { border: 10px solid rgba(255,93,143,0.18); color: transparent; -webkit-text-stroke: 6px rgba(255,93,143,0.2); }
.nf-lit { border: 10px solid #ff7aa8; color: transparent; -webkit-text-stroke: 6px #ffd0e1; text-shadow: 0 0 20px #ff5d8f, 0 0 60px #ff5d8f; box-shadow: 0 0 40px #ff5d8f, inset 0 0 40px #ff5d8f; opacity: 0; }
.nf-wash { inset: -300px !important; background: radial-gradient(closest-side, rgba(255,93,143,1), rgba(255,93,143,0)); opacity: 0; }`,
      html: `<div class="gm"><div class="nf"><div class="nf-wash"></div><div class="nf-dim">MỞ CỬA</div><div class="nf-lit">MỞ CỬA</div></div></div>`, run: `MW.effectNeonFlicker(q(".nf"), tl, 0.4, {});`, duration: 2.4 },
  }),

  T("effect/light-sweep", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var band = document.createElement("div"), io = gsap.parseEase("power2.inOut");
      if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden";
      band.style.cssText = "position:absolute;top:-30%;bottom:-30%;width:" + o.width + "px;pointer-events:none;mix-blend-mode:plus-lighter;background:linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,1), rgba(255,255,255,0));filter:blur(" + o.width / 10 + "px);"; el.appendChild(band);
      return MW.drive(tl, at, o.duration, function (t) {
        var W = el.offsetWidth, p = io(t / o.duration), x = -o.pad - o.width / 2 + (W + 2 * o.pad + o.width) * p, d = x - W / 2;
        gsap.set(band, { x: x - o.width / 2, skewX: -o.angle }); band.style.opacity = t > 0 && t < o.duration ? String(o.strength * (0.3 + 0.7 * Math.exp(-Math.pow(d / (W / 3.3), 2)))) : "0";
      });
    },
    options: { duration: "s (0.95)", width: "px of the band (400)", angle: "degrees (20)", strength: "at the middle (0.9)", pad: "px before and past the element (250)" },
    defaults: { duration: 0.95, width: 400, angle: 20, strength: 0.9, pad: 250 },
    demo: { css: `${BG}\n.ls { position: absolute; inset: 0; display: grid; place-items: center; } .ls-p { width: 1000px; height: 360px; border-radius: 180px; background: linear-gradient(180deg, #ffe39a, #e2a93a 55%, #b37a1c); display: grid; place-items: center; font-size: 150px; font-weight: 900; color: #5a3a06; letter-spacing: 0.06em; }`,
      html: `<div class="gm ls"><div class="ls-p">VÀNG</div></div>`, run: `MW.effectLightSweep(q(".ls-p"), tl, 0.5, {}); MW.effectLightSweep(q(".ls-p"), tl, 1.9, {});`, duration: 3.2 },
  }),

  T("effect/bloom-reveal", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, q4 = gsap.parseEase("power3.out"), halos = [];
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      [[30, 0.8, 0.9], [44, 1, 0.6]].forEach(function (h) { var d = document.createElement("div"); d.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;mix-blend-mode:plus-lighter;background:radial-gradient(circle, " + o.color + ", rgba(0,0,0,0) 70%);"; host.insertBefore(d, el); halos.push({ d: d, r: h[0], k: h[1], a: h[2] }); });
      return MW.drive(tl, at, o.duration, function (t) {
        var u = t / o.duration, p = q4(u), g = t < 0.54 / 0.78 * o.duration ? 38 - 30 * (t / (0.54 / 0.78 * o.duration)) : 8 * (1 - (t - 0.54 / 0.78 * o.duration) / (0.24 / 0.78 * o.duration));
        if (t <= 0) g = 38; g = Math.max(0, g);
        gsap.set(el, { scale: 0.82 + 0.18 * p }); el.style.filter = "brightness(" + (3 - 2 * p) + ") blur(" + (o.blur * (1 - p)) + "px)"; el.style.opacity = t > 0 ? "1" : "0";
        halos.forEach(function (h) { var R = (h.r + h.k * g) * o.unit; h.d.style.width = h.d.style.height = 2 * R + "px"; h.d.style.left = (el.offsetLeft + el.offsetWidth / 2 - R) + "px"; h.d.style.top = (el.offsetTop + el.offsetHeight / 2 - R) + "px"; h.d.style.opacity = t > 0 ? String(h.a * g / 38) : "0"; h.d.style.filter = "blur(" + g / 2 * o.unit / 2 + "px)"; });
      });
    },
    options: { duration: "s (0.78), power3.out", blur: "px at the start (12)", unit: "px per reference unit for the halo (5)", color: "halo colour" }, defaults: { duration: 0.78, blur: 12, unit: 5, color: "#d6ccff" },
    demo: { css: `${BG}\n.br { position: absolute; inset: 0; display: grid; place-items: center; } .br-t { position: relative; width: 360px; height: 360px; border-radius: 90px; background: linear-gradient(160deg, #a693ff, #6a4cf0); opacity: 0; }
.br-t::after { content: ""; position: absolute; left: 140px; top: 105px; border-left: 120px solid #fff; border-top: 75px solid transparent; border-bottom: 75px solid transparent; }`,
      html: `<div class="gm br"><div class="br-t"></div></div>`, run: `MW.effectBloomReveal(q(".br-t"), tl, 0.5, {});`, duration: 2.2 },
  }),

  T("effect/rim-glow", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, ring = document.createElement("div");
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      ring.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;box-sizing:border-box;border:4px solid " + o.color + ";"; host.appendChild(ring);
      return MW.drive(tl, at, o.period * o.cycles, function (t) {
        var k = 0.5 - 0.5 * Math.cos(2 * Math.PI * t / o.period), sw = o.stroke[0] + (o.stroke[1] - o.stroke[0]) * k, gl = (o.glow[0] + (o.glow[1] - o.glow[0]) * k) * 0.8;
        el.style.boxShadow = "0 0 0 " + sw + "px " + o.color + ", 0 0 " + gl + "px " + sw + "px " + o.color;
        var R = el.offsetWidth / 2 + sw + 14; ring.style.width = ring.style.height = 2 * R + "px"; ring.style.left = (el.offsetLeft + el.offsetWidth / 2 - R) + "px"; ring.style.top = (el.offsetTop + el.offsetHeight / 2 - R) + "px"; ring.style.opacity = String(0.5 * k);
      });
    },
    options: { stroke: "px, rest to peak ([8, 16])", glow: "px ([40, 88]), drawn at 0.8 ×", period: "s (1)", cycles: "(3)", color: "rim colour" }, defaults: { stroke: [8, 16], glow: [40, 88], period: 1, cycles: 3, color: "#8b7bff" },
    demo: { css: `${BG}\n#demo { background: #05060c; } .rg { position: absolute; inset: 0; display: grid; place-items: center; } .rg-d { position: relative; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle at 60% 60%, #0d0f1a, #05060c); }
.rg i { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: #fff; opacity: 0.6; }`,
      html: `<div class="gm rg">${Array.from({ length: 40 }, (_, i) => `<i style="left:${(i * 421) % 1920}px;top:${(i * 257) % 1080}px"></i>`).join("")}<div class="rg-d"></div></div>`, run: `MW.effectRimGlow(q(".rg-d"), tl, 0, {});`, duration: 3 },
  }),

  T("effect/energy-charge", {
    kind: "block",
    uses: ["drive", "rand", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, pin = gsap.parseEase("power2.in"), ex = gsap.parseEase("expo.out"), r = MW.rand(o.seed), P = [];
      for (var i = 0; i < 18; i++) P.push({ a: r() * 2 * Math.PI, ph: r(), sp: 1.8 + r() * 0.8 });
      return MW.drive(tl, at, o.charge + 0.8, function (t) {
        S.clear(); var u = Math.min(1, t / o.charge), e = pin(u), d = t - o.charge;
        if (d < 0.12) { var ra = d > 0 ? 1 - d / 0.12 : 1; [24, 33, 42].forEach(function (R, i) { c.save(); c.translate(160, 100); c.rotate((i % 2 ? -1 : 1) * 540 * e * Math.PI / 180); var s = 1.6 - 0.8 * e; c.scale(s, s); c.globalAlpha = (0.35 + 0.65 * e) * ra; c.setLineDash([6, 5]); c.strokeStyle = "#a99bff"; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, R, 0, 2 * Math.PI); c.stroke(); c.restore(); }); c.setLineDash([]); }
        if (d < 0) { P.forEach(function (p) { var f = (u * p.sp + p.ph) % 1, R = 80 - 66 * f; c.globalAlpha = Math.min(1, f * 4) * (1 - f * 0.3); c.fillStyle = "#e8ebf3"; c.beginPath(); c.arc(160 + R * Math.cos(p.a), 100 + R * Math.sin(p.a), 1.4, 0, 2 * Math.PI); c.fill(); });
          c.globalAlpha = 1; c.save(); c.shadowColor = "#8b7bff"; c.shadowBlur = (3 + 15 * e) * S.k; c.fillStyle = "#d6ccff"; c.beginPath(); c.arc(160, 100, 8 + 7 * e, 0, 2 * Math.PI); c.fill(); c.restore(); MW.txt(c, Math.round(5 + 25 * e) + "", 160, 150, 9, "#8f9ab3", 800); }
        else if (d < 0.45) { var q = ex(d / 0.45); c.globalAlpha = 1 - d / 0.45; c.strokeStyle = "#d6ccff"; c.lineWidth = 3 * (1 - q) + 0.5; c.beginPath(); c.arc(160, 100, 10 + 80 * q, 0, 2 * Math.PI); c.stroke();
          for (var k = 0; k < 10; k++) { var a = k / 10 * 2 * Math.PI; c.strokeStyle = k % 2 ? "#ffd23d" : "#a99bff"; c.lineWidth = 2; c.beginPath(); c.moveTo(160 + (12 + 6 * q) * Math.cos(a) + 50 * q * Math.cos(a), 100 + (12 + 6 * q + 50 * q) * Math.sin(a)); c.lineTo(160 + (18 + 76 * q) * Math.cos(a), 100 + (18 + 76 * q) * Math.sin(a)); c.stroke(); } }
        c.globalAlpha = 1;
      });
    },
    options: { charge: "s (1.2), power2.in", seed: "particles" }, defaults: { charge: 1.2, seed: 7 },
    demo: { css: BG, html: `<div class="gm"></div>`, run: `MW.effectEnergyCharge(q(".gm"), tl, 0.3, {});`, duration: 2.4 },
  }),

  T("motion/light-trail", {
    uses: ["drive", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, out = gsap.parseEase("power2.out"), X = function (u) { var p = out(Math.max(0, Math.min(1, u))); return [68 + o.width * p, 120 - o.arc * Math.sin(Math.PI * p)]; };
      return MW.drive(tl, at, o.duration + 0.5, function (t) {
        S.clear(); c.setLineDash([3, 4]); c.strokeStyle = "#2a3350"; c.lineWidth = 1; c.beginPath(); for (var i = 0; i <= 40; i++) { var q = X(i / 40); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); } c.stroke(); c.setLineDash([]);
        var u = t / o.duration, h = X(u);
        if (u > 0 && u < 1) { var g = c.createLinearGradient(X(u - 0.1)[0], 0, h[0], 0); g.addColorStop(0, "rgba(139,123,255,0)"); g.addColorStop(1, "rgba(214,204,255,0.9)"); c.strokeStyle = g; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); for (var k = 0; k <= 10; k++) { var qq = X(u - 0.1 + 0.01 * k); if (k) c.lineTo(qq[0], qq[1]); else c.moveTo(qq[0], qq[1]); } c.stroke(); }
        [[0.036, 0.45, 6], [0.072, 0.3, 5], [0.108, 0.18, 4]].forEach(function (g2) { var q = X((t - g2[0]) / o.duration); c.globalAlpha = g2[1]; c.fillStyle = "#a99bff"; c.beginPath(); c.arc(q[0], q[1], g2[2], 0, 2 * Math.PI); c.fill(); });
        c.globalAlpha = 1; c.save(); c.shadowColor = "#8b7bff"; c.shadowBlur = 12 * S.k; c.fillStyle = "#8b7bff"; c.beginPath(); c.arc(h[0], h[1], 7, 0, 2 * Math.PI); c.fill(); c.restore(); c.fillStyle = "#fff"; c.beginPath(); c.arc(h[0], h[1], 3, 0, 2 * Math.PI); c.fill();
      });
    },
    options: { width: "units of the arc (185 of 320)", arc: "units high (34)", duration: "s (0.9), power2.out" }, defaults: { width: 185, arc: 34, duration: 0.9 },
    demo: { css: BG, html: `<div class="gm"></div>`, run: `MW.motionLightTrail(q(".gm"), tl, 0.4, {});`, duration: 2 },
  }),

  T("effect/scan-line", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var line = document.createElement("div"), tail = document.createElement("div");
      if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden";
      tail.style.cssText = "position:absolute;left:-6px;right:-6px;height:" + o.tail + "px;pointer-events:none;background:linear-gradient(180deg, rgba(139,123,255,0), rgba(139,123,255,0.28));";
      line.style.cssText = "position:absolute;left:-6px;right:-6px;height:" + o.line + "px;pointer-events:none;background:" + o.color + ";box-shadow:0 0 " + o.glow + "px " + o.color + ";";
      el.appendChild(tail); el.appendChild(line);
      return MW.drive(tl, at, o.pass * o.passes, function (t) { var u = (t / o.pass) % 1, y = (-0.1 + 1.2 * u) * el.offsetHeight; line.style.top = y + "px"; tail.style.top = (y - o.tail) + "px"; });
    },
    options: { pass: "s per pass, linear (1.1)", passes: "(3)", line: "px (8)", glow: "px (48)", tail: "px (120)", color: "line colour" }, defaults: { pass: 1.1, passes: 3, line: 8, glow: 48, tail: 120, color: "#8b7bff" },
    demo: { css: `${BG}\n.sl { position: absolute; inset: 0; display: grid; place-items: center; } .sl-c { position: relative; width: 1000px; height: 620px; border-radius: 40px; background: #151a28; border: 3px solid #2a3350; padding: 70px; box-sizing: border-box; display: flex; gap: 60px; }
.sl-c .ph { width: 300px; height: 380px; border-radius: 30px; background: linear-gradient(160deg, #3a4466, #222a42); } .sl-c b { display: block; font-size: 60px; margin-bottom: 30px; } .sl-c i { display: block; height: 30px; border-radius: 15px; background: #2a3350; margin-bottom: 26px; width: 420px; }
.sl-k { position: absolute; width: 70px; height: 70px; border: 0 solid #a99bff; } .sl-k.a { left: 20px; top: 20px; border-left-width: 6px; border-top-width: 6px; } .sl-k.b { right: 20px; top: 20px; border-right-width: 6px; border-top-width: 6px; } .sl-k.c { left: 20px; bottom: 20px; border-left-width: 6px; border-bottom-width: 6px; } .sl-k.d { right: 20px; bottom: 20px; border-right-width: 6px; border-bottom-width: 6px; }`,
      html: `<div class="gm sl"><div class="sl-c"><div class="ph"></div><div><b>THẺ NHÂN VIÊN</b><i></i><i style="width:300px"></i><i style="width:360px"></i></div><div class="sl-k a"></div><div class="sl-k b"></div><div class="sl-k c"></div><div class="sl-k d"></div></div></div>`,
      run: `MW.effectScanLine(q(".sl-c"), tl, 0, {});`, duration: 3.3 },
  }),

  T("effect/aurora-glow", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, G = [];
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      [[o.colors[0], 0.55, 1], [o.colors[1], 0.5, -1]].forEach(function (g) { var d = document.createElement("div"); d.style.cssText = "position:absolute;border-radius:50%;pointer-events:none;mix-blend-mode:plus-lighter;background:" + g[0] + ";opacity:" + g[1] + ";filter:blur(" + o.blur + "px);"; host.insertBefore(d, el); G.push({ d: d, s: g[2] }); });
      return MW.drive(tl, at, o.period * 2 * o.cycles, function (t) {
        var k = Math.sin(Math.PI * t / o.period - Math.PI / 2), ang = o.swing * k, hue = o.hue * (0.5 + 0.5 * k), cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2;
        G.forEach(function (g) { var x = cx + g.s * o.offset[0] * Math.cos(ang), y = cy + g.s * o.offset[1] * Math.sin(ang); g.d.style.width = g.d.style.height = 2 * o.radius + "px"; g.d.style.left = (x - o.radius) + "px"; g.d.style.top = (y - o.radius) + "px"; g.d.style.filter = "blur(" + o.blur + "px) hue-rotate(" + (g.s > 0 ? hue : -hue) + "deg)"; });
      });
    },
    options: { colors: "the two glows", radius: "px (205)", blur: "px (56)", offset: "[x, y] px ([120, 90])", swing: "radians (1.3)", period: "s each way (1.5)", hue: "degrees of hue drift (70)", cycles: "(1)" },
    defaults: { colors: ["#ff4d6d", "#3d7bff"], radius: 205, blur: 56, offset: [120, 90], swing: 1.3, period: 1.5, hue: 70, cycles: 1 },
    demo: { css: `${BG}\n#demo { background: #06070c; } .ag { position: absolute; inset: 0; display: grid; place-items: center; } .ag-t { position: relative; width: 420px; height: 420px; border-radius: 100px; background: #151a28; border: 3px solid rgba(255,255,255,0.12); display: grid; place-items: center; font-size: 220px; font-weight: 900; }`,
      html: `<div class="gm ag"><div class="ag-t">A</div></div>`, run: `MW.effectAuroraGlow(q(".ag-t"), tl, 0, {});`, duration: 3 },
  }),

  T("effect/radial-flash", {
    uses: ["drive", "canvas"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, cv = MW.canvas(host), c = cv.ctx, ex = gsap.parseEase("expo.out"); cv.cv.style.zIndex = "1"; el.style.position = el.style.position || "relative"; el.style.zIndex = "2";
      return MW.drive(tl, at, 0.6, function (t) {
        var cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2, k = o.unit, bump = t < 0.32 ? Math.pow(Math.sin(Math.PI * t / 0.32), 0.7) : 0, sc = t < Math.PI / 22 ? 1 + 0.14 * Math.exp(-7 * t) * Math.sin(22 * t) : 1;
        el.style.filter = "brightness(" + (1 + 1.2 * bump) + ") drop-shadow(0 0 " + 40 * bump + "px " + o.color + ")"; gsap.set(el, { scale: sc });
        c.clearRect(0, 0, cv.w, cv.h); var d = t - 0.06;
        if (d > 0 && d < 0.5) { var q = ex(d / 0.5); c.globalAlpha = 0.9 * (1 - d / 0.5); c.strokeStyle = o.color; c.lineWidth = (4 - 3 * q) * k / 2; c.beginPath(); c.arc(cx, cy, (0.2 + 2.1 * q) * 40 * k, 0, 2 * Math.PI); c.stroke(); }
        if (t < 0.35) { var r2 = ex(t / 0.35); c.globalAlpha = 1 - t / 0.35; for (var i = 0; i < 12; i++) { var a = i / 12 * 2 * Math.PI, R0 = (i % 2 ? 36 : 30) * k, R1 = (i % 2 ? 88 : 60) * k; c.strokeStyle = i % 2 ? o.color2 : o.color; c.lineWidth = 2 * k / 2; c.lineCap = "round"; c.beginPath(); c.moveTo(cx + Math.cos(a) * (R0 + (R1 - R0) * r2 * 0.6), cy + Math.sin(a) * (R0 + (R1 - R0) * r2 * 0.6)); c.lineTo(cx + Math.cos(a) * (R0 + (R1 - R0) * r2), cy + Math.sin(a) * (R0 + (R1 - R0) * r2)); c.stroke(); } }
        c.globalAlpha = 1;
      });
    },
    options: { unit: "px per reference unit (5)", color: "flash colour", color2: "second ray colour" }, defaults: { unit: 5, color: "#ffd23d", color2: "#a99bff" },
    notes: "Call once per hit.",
    demo: { css: `${BG}\n.rf { position: absolute; inset: 0; display: grid; place-items: center; } .rf-s { width: 300px; height: 300px; background: linear-gradient(160deg, #ffe39a, #ffb547); clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); }`,
      html: `<div class="gm rf"><div class="rf-s"></div></div>`, run: `MW.effectRadialFlash(q(".rf-s"), tl, 0.5, {}); MW.effectRadialFlash(q(".rf-s"), tl, 1.6, {});`, duration: 2.4 },
  }),

  T("effect/lens-flare-sweep", {
    uses: ["drive", "canvas"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, cv = MW.canvas(host), c = cv.ctx, io = gsap.parseEase("power2.inOut"), col = getComputedStyle(el).color, mix = gsap.utils.interpolate(col, o.tint); cv.cv.style.zIndex = "5"; cv.cv.style.mixBlendMode = "plus-lighter";
      return MW.drive(tl, at, o.duration, function (t) {
        var p = io(t / o.duration), k = o.unit, off = (-155 + 310 * p) * k, env = Math.pow(Math.sin(Math.PI * t / o.duration), 0.5), g = Math.exp(-Math.pow(off / (60 * k), 2)), cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2, x = cx + off;
        c.clearRect(0, 0, cv.w, cv.h); el.style.color = mix(0.35 * g * env); if (t <= 0 || t >= o.duration) return;
        var disc = function (X, R, a, cc) { var gr = c.createRadialGradient(X, cy, 0, X, cy, R); gr.addColorStop(0, "rgba(" + cc + "," + a + ")"); gr.addColorStop(1, "rgba(" + cc + ",0)"); c.fillStyle = gr; c.beginPath(); c.arc(X, cy, R, 0, 2 * Math.PI); c.fill(); };
        disc(x, (12 + 8 * g) * k, 0.8 * env, "214,204,255"); disc(x, (4 + 3 * g) * k, env, "255,255,255");
        c.save(); c.translate(x, cy); c.scale(1, 0.06); var sr = (70 + 40 * g) * k, sg = c.createRadialGradient(0, 0, 0, 0, 0, sr); sg.addColorStop(0, "rgba(255,255,255," + 0.9 * env + ")"); sg.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = sg; c.beginPath(); c.arc(0, 0, sr, 0, 2 * Math.PI); c.fill(); c.restore();
        [[0.7, 10, 0.35], [-0.7, 7, 0.25], [-0.4, 14, 0.2]].forEach(function (q) { disc(cx + off * q[0] * -1, q[1] * k, q[2] * env, q[0] > 0 ? "139,123,255" : "61,214,245"); });
      });
    },
    options: { duration: "s (1.05), in-out", unit: "px per reference unit (5)", tint: "title tint at the peak (35 %)" }, defaults: { duration: 1.05, unit: 5, tint: "#d6ccff" },
    demo: H("RA MẮT MÙA THU", `MW.effectLensFlareSweep(q(".tk-head"), tl, 0.5, {}); MW.effectLensFlareSweep(q(".tk-head"), tl, 1.9, {});`, 3.2, { size: 170, weight: 900 }),
  }),

  T("effect/holo-sheen", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var band = document.createElement("div"), si = gsap.parseEase("sine.inOut");
      if (getComputedStyle(el).position === "static") el.style.position = "relative"; el.style.overflow = "hidden";
      band.style.cssText = "position:absolute;top:-60%;bottom:-60%;width:" + o.width + "px;pointer-events:none;mix-blend-mode:plus-lighter;z-index:0;background:linear-gradient(90deg, transparent, #ff4d6d, #ffd23d, #3ddc84, #3d7bff, transparent);";
      el.insertBefore(band, el.firstChild); Array.prototype.forEach.call(el.children, function (ch) { if (ch !== band && getComputedStyle(ch).position === "static") { ch.style.position = "relative"; ch.style.zIndex = "1"; } });
      return MW.drive(tl, at, o.duration, function (t) {
        var p = si(t / o.duration), W = el.offsetWidth, x = (-0.5 + 1.7 * p) * W;
        gsap.set(band, { x: x - o.width / 2, rotation: o.angle }); band.style.opacity = t > 0 && t < o.duration ? String(o.opacity * Math.pow(Math.sin(Math.PI * t / o.duration), 0.4)) : "0"; band.style.filter = "hue-rotate(" + o.hue * Math.sin(Math.PI * t / o.duration) + "deg)";
      });
    },
    options: { duration: "s (1.3), sine.inOut", width: "px (260)", angle: "degrees (29)", opacity: "(0.55)", hue: "degrees (55)" }, defaults: { duration: 1.3, width: 260, angle: 29, opacity: 0.55, hue: 55 },
    notes: "The band runs under the card's content: only the background shimmers.",
    demo: { css: `${BG}\n.hs { position: absolute; inset: 0; display: grid; place-items: center; } .hs-c { width: 1000px; height: 600px; border-radius: 50px; background: linear-gradient(135deg, #2a3350, #151a28); border: 3px solid #3a4466; padding: 70px; box-sizing: border-box; }
.hs-c b { display: block; font-size: 64px; } .hs-c span { display: block; font-size: 40px; color: #9aa3b8; margin-top: 20px; } .hs-c strong { display: block; font-size: 130px; margin-top: 90px; }`,
      html: `<div class="gm hs"><div class="hs-c"><b>THẺ HỘI VIÊN</b><span>Hạng Bạch Kim</span><strong>990.000₫</strong></div></div>`, run: `MW.effectHoloSheen(q(".hs-c"), tl, 0.4, {}); MW.effectHoloSheen(q(".hs-c"), tl, 2.0, {});`, duration: 3.6 },
  }),
];

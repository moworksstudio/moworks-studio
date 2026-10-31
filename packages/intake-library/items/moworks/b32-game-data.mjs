// Game Cinematics and Numbers & Data (batch 3.2): game title cards and numbers that count, roll and flip, written here. Sizes: a 320 px
// frame × 5; numbers use tabular figures.
import { T } from "../../moworks/define.mjs";
import { LANDSCAPE } from "../../demo-media.mjs";

const BG = `#demo { background: radial-gradient(100% 100% at 50% 40%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; } .gm { position: absolute; inset: 0; }`;

export default [
  T("ui/lucky-wheel-spin", {
    kind: "block",
    uses: ["drive", "draw", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, q3 = gsap.parseEase("power3.out"), bk = gsap.parseEase("back.out"), io = gsap.parseEase("power2.inOut"), res = el.querySelector(".lw-res"), n = o.labels.length, seg = 2 * Math.PI / n;
      var total = (o.turns * 360 + o.extra) * Math.PI / 180, fin = total % (2 * Math.PI), win = ((Math.round((-fin / seg) - 0.5) % n) + n) % n;
      if (res) { S.put(res, 160, 186); res.textContent = o.labels[win].toUpperCase(); }
      return MW.drive(tl, at, o.loop, function (t) {
        S.clear(); var u = Math.max(0, Math.min(1, (t - o.start) / o.spin)), p = q3(u), rw = io(Math.max(0, Math.min(1, (t - 3.4) / 0.35))), a = total * p * (1 - rw), s = u > 0 && u < 1 ? 4 * Math.pow(1 - p, 0.75) : 0;
        c.save(); c.translate(160, 96); c.rotate(a);
        for (var i = 0; i < n; i++) {
          var a0 = -Math.PI / 2 + i * seg; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 60, a0, a0 + seg); c.closePath();
          c.fillStyle = i === win && t >= 2.4 && rw < 1 ? gsap.utils.interpolate(i % 2 ? "#2a3142" : "#363f57", "#8b7bff", Math.min(1, (t - 2.4) / 0.15)) : i % 2 ? "#2a3142" : "#363f57"; c.fill(); c.strokeStyle = "#0b0d12"; c.lineWidth = 1.2; c.stroke();
          c.save(); c.rotate(a0 + seg / 2); c.translate(40, 0); c.rotate(Math.PI / 2); c.globalAlpha = 1 - 0.8 * Math.max(0, Math.min(1, s - 1)); MW.txt(c, o.labels[i], 0, 0, 7.5, "#e8ebf3", 800); c.restore();
        }
        c.restore(); c.fillStyle = "#e8ebf3"; c.beginPath(); c.arc(160, 96, 8, 0, 2 * Math.PI); c.fill();
        var f = ((a % seg) + seg) % seg / seg, tilt = 0.5 * Math.min(1, s) * Math.exp(-6 * f);
        c.save(); c.translate(160, 30); c.rotate(-tilt); c.fillStyle = "#ffd23d"; c.beginPath(); c.moveTo(-7, -6); c.lineTo(7, -6); c.lineTo(0, 10); c.closePath(); c.fill(); c.restore();
        if (res) { var v = Math.max(0, Math.min(1, (t - 2.45) / 0.25)); gsap.set(res, { xPercent: -50, yPercent: -50, scale: (0.8 + 0.2 * bk(v)) * (1 - rw) }); res.style.opacity = String(Math.min(1, v * 3) * (1 - rw)); }
      });
    },
    options: { labels: "the prizes (6)", turns: "full turns (3)", extra: "degrees more (100)", start: "s (0.3)", spin: "s (2.05), power3.out", loop: "s (3.8)" },
    defaults: { labels: ["10 điểm", "Quà", "50 điểm", "Thêm lượt", "100 điểm", "Mất lượt"], turns: 3, extra: 100, start: 0.3, spin: 2.05, loop: 3.8 },
    demo: { css: `${BG}\n.lw-res { font-size: 80px; font-weight: 900; color: #ffd23d; white-space: nowrap; opacity: 0; }`, html: `<div class="gm"><div class="lw-res">TRÚNG THƯỞNG!</div></div>`, run: `MW.uiLuckyWheelSpin(q(".gm"), tl, 0, {});`, duration: 3.8 },
  }),

  T("data/countdown-go", {
    uses: ["drive", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), c = S.ctx, digits = Array.prototype.slice.call(el.querySelectorAll(".cg-d")), go = el.querySelector(".cg-go"), ex = gsap.parseEase("expo.out"), bk = gsap.parseEase("back.out"), out = gsap.parseEase("power2.out"), pi = gsap.parseEase("power2.in");
      digits.concat([go]).forEach(function (d) { S.put(d, 160, 96); });
      var goAt = o.start + o.beat * digits.length;
      return MW.drive(tl, at, o.outAt + 0.25, function (t) {
        S.clear(); var fade = 1 - pi(Math.max(0, Math.min(1, (t - o.outAt) / 0.25))); c.globalAlpha = fade;
        c.strokeStyle = "#2a3142"; c.lineWidth = 4; c.beginPath(); c.arc(160, 96, 52, 0, 2 * Math.PI); c.stroke();
        var k = Math.floor((t - o.start) / o.beat);
        if (t >= o.start && t < goAt) { var u = (t - o.start - k * o.beat) / o.beat; c.strokeStyle = "#8b7bff"; c.beginPath(); c.arc(160, 96, 52, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (1 - u)); c.stroke(); }
        if (t >= goAt) { c.strokeStyle = "#8b7bff"; c.beginPath(); c.arc(160, 96, 52, 0, 2 * Math.PI); c.stroke(); var d = t - goAt; if (d < 0.5) { var q = out(d / 0.5); c.globalAlpha = fade * (1 - q); c.lineWidth = 3.5 - 3 * q; c.beginPath(); c.arc(160, 96, 52 + 30 * q, 0, 2 * Math.PI); c.stroke(); c.globalAlpha = fade; } }
        for (var i = 0; i < 4; i++) { c.fillStyle = t >= o.start + i * o.beat ? "#8b7bff" : "#2a3142"; c.beginPath(); c.arc(136 + i * 16, 166, 3.5, 0, 2 * Math.PI); c.fill(); }
        c.globalAlpha = 1;
        digits.forEach(function (d, i) { var b = t - o.start - i * o.beat, on = b >= 0 && b < o.beat; var s = b < 0.25 ? 1.5 - 0.5 * ex(Math.max(0, b) / 0.25) : b > 0.7 * o.beat / 0.8 ? 1 - 0.15 * Math.min(1, (b - 0.7) / 0.1) : 1;
          gsap.set(d, { xPercent: -50, yPercent: -50, scale: s }); d.style.opacity = on ? String(Math.min(1, b / 0.08) * (b > 0.7 ? Math.max(0, 1 - (b - 0.7) / 0.1) : 1)) : "0"; });
        var g = t - goAt; gsap.set(go, { xPercent: -50, yPercent: -50, scale: g >= 0 ? bk(Math.min(1, g / 0.3)) : 0 }); go.style.opacity = g >= 0 ? String(fade) : "0";
      });
    },
    options: { start: "s (0.3)", beat: "s per number (0.8)", outAt: "s (3.55)" }, defaults: { start: 0.3, beat: 0.8, outAt: 3.55 },
    notes: "Markup: one .cg-d per number (3, 2, 1) and the final .cg-go word.",
    demo: { css: `${BG}\n.cg-d, .cg-go { font-size: 300px; font-weight: 900; line-height: 1; white-space: nowrap; font-variant-numeric: tabular-nums; } .cg-go { font-size: 150px; color: #a99bff; }`,
      html: `<div class="gm"><div class="cg-d">3</div><div class="cg-d">2</div><div class="cg-d">1</div><div class="cg-go">BẮT ĐẦU!</div></div>`, run: `MW.dataCountdownGo(q(".gm"), tl, 0, {});`, duration: 3.8 },
  }),

  T("title/boss-warning-bands", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var bands = el.querySelectorAll(".bw-band"), sil = el.querySelector(".bw-sil"), title = el.querySelector(".bw-title"), tint = el.querySelector(".bw-tint"), ex = gsap.parseEase("expo.out"), ei = gsap.parseEase("expo.in"), out = gsap.parseEase("power2.out");
      return MW.drive(tl, at, o.outAt + 0.6, function (t) {
        var W = el.offsetWidth, p = ex(Math.max(0, Math.min(1, (t - o.inAt) / 0.4))), e = ei(Math.max(0, Math.min(1, (t - o.outAt) / 0.25)));
        gsap.set(bands[0], { x: -W * (1 - p) + W * e }); gsap.set(bands[1], { x: W * (1 - p) - W * e });
        bands[0].style.backgroundPosition = (t * o.drift) + "px 0"; bands[1].style.backgroundPosition = (-t * o.drift) + "px 0";
        if (tint) tint.style.opacity = String(Math.min(1, t / 0.3) * (1 - e));
        if (sil) { sil.style.opacity = String(0.5 * Math.max(0, Math.min(1, (t - 0.4) / 0.6)) * (1 - e)); gsap.set(sil, { scale: 0.92 + 0.08 * Math.min(1, t / 2.3) }); }
        var r = out(Math.max(0, Math.min(1, (t - 0.75) / 0.3))), w = title.offsetWidth; title.style.clipPath = "inset(-0.3em " + (w / 2) * (1 - r) + "px -0.3em " + (w / 2) * (1 - r) + "px)"; title.style.opacity = String(1 - e);
      });
    },
    options: { inAt: "s (0.3)", drift: "px/s the stripes run (110)", outAt: "s (2.3)" }, defaults: { inAt: 0.3, drift: 110, outAt: 2.3 },
    demo: { css: `${BG}\n.bw { position: absolute; inset: 0; overflow: hidden; } .bw-tint { position: absolute; inset: 0; background: rgba(139,123,255,0.1); opacity: 0; }
.bw-band { position: absolute; left: 0; right: 0; height: 100px; background: repeating-linear-gradient(-45deg, #ffd23d 0 45px, #1a1500 45px 90px); }
.bw-sil { position: absolute; left: 50%; top: 50%; width: 700px; height: 700px; margin: -350px; border-radius: 46% 46% 30% 30%; background: radial-gradient(circle at 50% 40%, #3a2066, #0b0d12 70%); opacity: 0; }
.bw-title { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); text-align: center; white-space: nowrap; } .bw-title b { display: block; font-size: 170px; font-weight: 900; color: #ff5d6c; letter-spacing: 0.06em; } .bw-title span { font-size: 54px; font-weight: 800; letter-spacing: 0.3em; }`,
      html: `<div class="gm bw"><div class="bw-tint"></div><div class="bw-sil"></div><div class="bw-band" style="top:130px"></div><div class="bw-band" style="top:780px"></div><div class="bw-title"><b>CẢNH BÁO</b><span>TRÙM ĐANG TỚI</span></div></div>`,
      run: `MW.titleBossWarningBands(q(".bw"), tl, 0, {});`, duration: 2.9 },
  }),

  T("text/victory-tracking-title", {
    uses: ["split", "drive", "rand"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, host = el.parentNode, rule = document.createElement("div"), sub = o.sub ? MW.el(o.sub) : null, r = MW.rand(o.seed), ex = gsap.parseEase("expo.out"), out = gsap.parseEase("power2.out"), pi = gsap.parseEase("power2.in"), sparks = [];
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      rule.style.cssText = "position:absolute;left:50%;height:8px;width:" + 2 * o.rule + "px;margin-left:-" + o.rule + "px;background:" + o.color + ";border-radius:4px;transform:scaleX(0);"; host.appendChild(rule);
      for (var i = 0; i < 16; i++) { var s = document.createElement("div"); s.style.cssText = "position:absolute;left:50%;width:40px;height:40px;margin:-20px;background:#ffd23d;clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%);opacity:0;pointer-events:none;"; host.appendChild(s); sparks.push({ s: s, x: (r() * 2 - 1) * o.rule, rise: 200 + r() * 250, t0: 0.95 + r() * 0.25, life: 0.9 + r() * 0.4, sc: 0.5 + r() * 0.7 }); }
      var mid = function (c) { return c.offsetLeft + c.offsetWidth / 2; }, cx = null;
      return MW.drive(tl, at, o.outAt + 0.25, function (t) {
        if (cx == null) { var L = ch[0].offsetLeft, R = ch[ch.length - 1].offsetLeft + ch[ch.length - 1].offsetWidth; cx = (L + R) / 2; }
        var p = ex(Math.max(0, Math.min(1, (t - 0.25) / 0.7))), f = 1 - pi(Math.max(0, Math.min(1, (t - o.outAt) / 0.25)));
        ch.forEach(function (c) { gsap.set(c, { x: (mid(c) - cx) * (o.from - 1) * (1 - p) }); }); el.style.opacity = String(Math.min(1, 1.6 * p) * f);
        rule.style.top = (el.offsetTop + el.offsetHeight + 10) + "px"; gsap.set(rule, { scaleX: ex(Math.max(0, Math.min(1, (t - 0.85) / 0.4))) }); rule.style.opacity = String(f);
        if (sub) sub.style.opacity = String(Math.max(0, Math.min(1, (t - 1.1) / 0.3)) * f);
        sparks.forEach(function (q) { var u = (t - q.t0) / q.life; if (u < 0 || u > 1) { q.s.style.opacity = "0"; return; } var e = out(u); q.s.style.top = (el.offsetTop + el.offsetHeight + 10 - q.rise * e) + "px"; gsap.set(q.s, { x: q.x, scale: q.sc, rotation: 90 * e }); q.s.style.opacity = String((1 - u) * f); });
      });
    },
    options: { from: "letter spacing at the start, × (2.6), closing in 0.7 s expo.out", rule: "px each side (550)", color: "rule colour", sub: "the subtitle (fades in 1.1-1.4 s)", outAt: "s (2.45)", seed: "sparkles" },
    defaults: { from: 2.6, rule: 550, color: "#8b7bff", sub: null, outAt: 2.45, seed: 12 },
    demo: { css: `${BG}\n.vt { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; } .vt h1 { margin: 0; font-size: 210px; font-weight: 900; color: #a99bff; } .vt p { margin: 60px 0 0; font-size: 50px; color: #c9d2ea; opacity: 0; }`,
      html: `<div class="gm vt"><div><h1>CHIẾN THẮNG</h1><p>Màn 3 · Thời gian 02:41</p></div></div>`, run: `MW.textVictoryTrackingTitle(q(".vt h1"), tl, 0, { sub: ".vt p" });`, duration: 3 },
  }),

  T("text/letter-dissolve-out", {
    uses: ["split", "drive", "rand"],
    fn: function (el, tl, at, o) {
      var ch = MW.split(el, "chars").chars, host = el.parentNode, r = MW.rand(o.seed), bits = [], pin = gsap.parseEase("power1.in"), out = gsap.parseEase("power2.out"), bk = gsap.parseEase("back.out"), btn = o.button ? MW.el(o.button) : null;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      ch.forEach(function (c, i) { for (var k = 0; k < o.bits; k++) { var b = document.createElement("div"); b.style.cssText = "position:absolute;width:15px;height:15px;background:" + o.color + ";opacity:0;pointer-events:none;"; host.appendChild(b); bits.push({ b: b, c: c, i: i, k: k, dx: (r() * 2 - 1) * 55, dy: r() * 130, up: 120 + r() * 100, side: (r() * 2 - 1) * 40 }); } });
      return MW.drive(tl, at, o.outAt + 0.25, function (t) {
        var e = Math.max(0, Math.min(1, (t - 0.05) / 0.3)), f = 1 - Math.max(0, Math.min(1, (t - o.outAt) / 0.2));
        gsap.set(el, { y: (1 - e) * 30 }); el.style.opacity = String(e);
        ch.forEach(function (c, i) { var u = pin(Math.max(0, Math.min(1, (t - o.leaveAt - i * o.stagger) / 0.55))); gsap.set(c, { y: -o.rise * u, scaleX: 1 - 0.15 * u, scaleY: 1 - 0.35 * u, transformOrigin: "50% 100%" }); c.style.opacity = String(1 - u); });
        bits.forEach(function (q) { var u = (t - o.leaveAt - q.i * o.stagger - q.k * 0.03) / 0.7; if (u < 0 || u > 1) { q.b.style.opacity = "0"; return; } var p = out(u), cx = q.c.offsetLeft + el.offsetLeft + q.c.offsetWidth / 2, cy = el.offsetTop + q.c.offsetTop + q.c.offsetHeight * 0.8;
          q.b.style.left = (cx + q.dx + q.side * p) + "px"; q.b.style.top = (cy - q.dy - q.up * p) + "px"; q.b.style.opacity = String(0.8 * (1 - p)); });
        if (btn) { var v = Math.max(0, Math.min(1, (t - o.buttonAt) / 0.35)); gsap.set(btn, { y: 40 * (1 - bk(v)) }); btn.style.opacity = String(Math.min(1, v * 2) * f); }
      });
    },
    options: { leaveAt: "s the letters start to go (1.0)", stagger: "s (0.09)", rise: "px (100)", bits: "squares shed per letter (6)", color: "their colour", button: "the retry button", buttonAt: "s (1.6)", outAt: "s (2.55)", seed: "bits" },
    defaults: { leaveAt: 1, stagger: 0.09, rise: 100, bits: 6, color: "#6c778b", button: null, buttonAt: 1.6, outAt: 2.55, seed: 4 },
    demo: { css: `${BG}\n.ld { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; } .ld h1 { margin: 0; font-size: 200px; font-weight: 900; color: #c9d2ea; }
.ld .bt { display: inline-block; margin-top: 70px; padding: 30px 80px; border-radius: 60px; background: #8b7bff; color: #fff; font-size: 54px; font-weight: 800; opacity: 0; }`,
      html: `<div class="gm ld"><div><h1>THẤT BẠI</h1><div class="bt">THỬ LẠI</div></div></div>`, run: `MW.textLetterDissolveOut(q(".ld h1"), tl, 0, { button: ".ld .bt" });`, duration: 3 },
  }),

  T("title/chapter-intro", {
    kind: "block",
    uses: ["drive", "eases"],
    fn: function (el, tl, at, o) {
      var lab = el.querySelector(".ci-lab"), rule = el.querySelector(".ci-rule"), dia = el.querySelectorAll(".ci-dia"), title = el.querySelector(".ci-title"), out = gsap.parseEase("power2.out"), io = MW.ez("in-out"), ex = gsap.parseEase("expo.out"), pi = gsap.parseEase("power2.in");
      var c = function (a, b, t) { return Math.max(0, Math.min(1, (t - a) / (b - a))); };
      return MW.drive(tl, at, o.outAt + 0.3, function (t) {
        var f = 1 - pi(c(o.outAt, o.outAt + 0.3, t)), a = out(c(0.3, 0.8, t)), r = io(c(0.62, 1.12, t)), x = ex(c(0.95, 1.55, t));
        gsap.set(lab, { y: 30 * (1 - a) }); lab.style.opacity = String(a * f);
        gsap.set(rule, { scaleX: r }); rule.style.opacity = String(f); dia.forEach(function (d, i) { gsap.set(d, { x: (i ? 1 : -1) * o.rule * r, rotation: 45 }); d.style.opacity = String(r > 0 ? f : 0); });
        gsap.set(title, { y: 180 * (1 - x) }); title.style.opacity = String(f);
      });
    },
    options: { rule: "px each side (360)", outAt: "s (2.3)" }, defaults: { rule: 360, outAt: 2.3 },
    demo: { css: `${BG}\n.ci { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; } .ci-lab { font-size: 55px; font-weight: 800; letter-spacing: 0.3em; opacity: 0; } .ci-lab b { color: #a99bff; }
.ci-mid { position: relative; height: 40px; margin: 40px 0; } .ci-rule { position: absolute; left: 50%; top: 18px; width: 720px; height: 4px; margin-left: -360px; background: #c9d2ea; transform: scaleX(0); }
.ci-dia { position: absolute; left: 50%; top: 8px; width: 25px; height: 25px; margin-left: -12px; background: #a99bff; opacity: 0; } .ci-clip { overflow: hidden; padding: 0.25em 0.1em; } .ci-title { font-size: 130px; font-weight: 800; letter-spacing: -0.01em; }`,
      html: `<div class="gm ci"><div><div class="ci-lab">CHƯƠNG <b>04</b></div><div class="ci-mid"><div class="ci-rule"></div><div class="ci-dia"></div><div class="ci-dia"></div></div><div class="ci-clip"><div class="ci-title">Thành phố đã mất</div></div></div></div>`,
      run: `MW.titleChapterIntro(q(".ci"), tl, 0, {});`, duration: 2.8 },
  }),

  T("title/raid-start-lineup", {
    kind: "block",
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var cards = Array.prototype.slice.call(el.querySelectorAll(".rs-card")), title = el.querySelector(".rs-title"), rules = el.querySelectorAll(".rs-rule"), sp = MW.spring(260, 20), ex = gsap.parseEase("expo.out"), pi = gsap.parseEase("power2.in");
      return MW.drive(tl, at, o.outAt + 0.3, function (t) {
        var f = 1 - pi(Math.max(0, Math.min(1, (t - o.outAt) / 0.3))), hop = t > 1.2 && t < 1.45 ? 30 * Math.sin(Math.PI * (t - 1.2) / 0.25) : 0;
        cards.forEach(function (c, i) { var s0 = o.start + i * o.stagger, v = t >= s0 ? sp.at(t - s0) : 0, dir = i % 2 ? 1 : -1; gsap.set(c, { y: dir * 800 * (1 - v) - hop }); c.style.opacity = String((t >= s0 ? 1 : 0) * f);
          var rd = c.querySelector(".rs-ready"); if (rd) rd.style.opacity = String(Math.max(0, Math.min(1, (t - s0 - 0.3) / 0.15))); });
        var u = Math.max(0, Math.min(1, (t - o.goAt) / 0.22)); gsap.set(title, { scale: 1.6 - 0.6 * ex(u) }); title.style.opacity = String(Math.min(1, (t - o.goAt) / 0.11) * f * (t >= o.goAt ? 1 : 0));
        rules.forEach(function (r, i) { var g = ex(Math.max(0, Math.min(1, (t - o.goAt - 0.05) / 0.4))); gsap.set(r, { scaleX: g }); r.style.opacity = String(f); });
      });
    },
    options: { start: "s (0.3)", stagger: "s (0.14), spring k260 d20, alternating from above and below", goAt: "s the title slams (1.25)", outAt: "s (2.4)" },
    defaults: { start: 0.3, stagger: 0.14, goAt: 1.25, outAt: 2.4 },
    demo: { css: `${BG}\n.rs { position: absolute; inset: 0; } .rs-row { position: absolute; left: 50%; top: 200px; display: flex; gap: 80px; transform: translateX(-50%); }
.rs-card { width: 240px; height: 320px; border-radius: 40px; background: #1b2130; border: 3px solid #2a3350; overflow: hidden; position: relative; opacity: 0; } .rs-card i { display: block; height: 40px; }
.rs-card b { display: block; text-align: center; margin-top: 60px; font-size: 44px; } .rs-ready { position: absolute; bottom: 30px; left: 0; right: 0; text-align: center; font-size: 28px; font-weight: 800; color: #3ddc84; letter-spacing: 0.1em; opacity: 0; }
.rs-title { position: absolute; left: 0; right: 0; top: 640px; text-align: center; font-size: 120px; font-weight: 900; opacity: 0; } .rs-rule { position: absolute; top: 710px; width: 300px; height: 8px; background: #8b7bff; transform: scaleX(0); }`,
      html: `<div class="gm rs"><div class="rs-row">${[["#ff5d6c", "Tank"], ["#3dd6f5", "Phép"], ["#3ddc84", "Hồi máu"], ["#ffd23d", "Cung"]].map(([c, n]) => `<div class="rs-card"><i style="background:${c}"></i><b>${n}</b><div class="rs-ready">SẴN SÀNG</div></div>`).join("")}</div>
<div class="rs-rule" style="left:120px;transform-origin:100% 50%"></div><div class="rs-rule" style="right:120px;transform-origin:0 50%"></div><div class="rs-title">BẮT ĐẦU ĐỘT KÍCH</div></div>`,
      run: `MW.titleRaidStartLineup(q(".rs"), tl, 0, {});`, duration: 2.9 },
  }),

  T("effect/letterbox-push", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var scene = el.querySelector(o.scene), cap = o.caption ? el.querySelector(o.caption) : null, bars = [document.createElement("div"), document.createElement("div")], io = gsap.parseEase("power2.inOut");
      bars.forEach(function (b, i) { b.style.cssText = "position:absolute;left:0;right:0;height:0;background:#000;z-index:5;" + (i ? "bottom:0;" : "top:0;"); el.appendChild(b); }); if (cap) el.appendChild(cap);
      scene.style.transformOrigin = (o.x * 100) + "% " + (o.y * 100) + "%";
      return MW.drive(tl, at, o.backAt + 0.4, function (t) {
        var p = io(Math.max(0, Math.min(1, (t - o.at) / o.duration))) * (1 - io(Math.max(0, Math.min(1, (t - o.backAt) / 0.4)))), Hh = el.offsetHeight;
        bars.forEach(function (b) { b.style.height = (o.bars * Hh * p) + "px"; }); gsap.set(scene, { scale: 1 + (o.scale - 1) * p });
        if (cap) cap.style.opacity = String(Math.max(0, Math.min(1, (t - 1.2) / 0.3)) * (1 - Math.max(0, Math.min(1, (t - 2.2) / 0.15))));
      });
    },
    options: { bars: "each bar, share of the height (0.15)", scale: "push (1.14)", x: "focus, 0-1 (0.625)", y: "(0.54)", at: "s (0.3)", duration: "s (1.1), same curve for both", backAt: "s (2.3)", scene: "the picture", caption: "the caption on the bottom bar" },
    defaults: { bars: 0.15, scale: 1.14, x: 0.625, y: 0.54, at: 0.3, duration: 1.1, backAt: 2.3, scene: ".lp-scene", caption: null },
    assets: [{ path: "shot.svg", data: LANDSCAPE }],
    demo: { css: `${BG}\n.lp { position: absolute; inset: 0; overflow: hidden; } .lp-scene { position: absolute; inset: 0; background: url(assets/shot.svg) center / cover; }
.lp-cap { position: absolute; left: 0; right: 0; bottom: 40px; text-align: center; font-size: 56px; font-weight: 800; letter-spacing: 0.3em; color: #fff; z-index: 6; opacity: 0; }`,
      html: `<div class="gm lp"><div class="lp-scene"></div><div class="lp-cap">CHƯƠNG MỚI</div></div>`, run: `MW.effectLetterboxPush(q(".lp"), tl, 0, { caption: ".lp-cap" });`, duration: 2.9 },
  }),

  T("data/digit-odometer", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var A = String(o.from), B = String(o.to), win = [], out = gsap.parseEase("power2.out"), k = 0;
      el.textContent = ""; el.style.fontVariantNumeric = "tabular-nums"; el.style.display = "inline-flex";
      for (var i = 0; i < B.length; i++) {
        var a = A[i], b = B[i];
        if (!/\d/.test(b)) { var s = document.createElement("span"); s.textContent = b; el.appendChild(s); continue; }
        var w = document.createElement("span"); w.style.cssText = "display:inline-block;overflow:hidden;height:1.37em;position:relative;"; var strip = document.createElement("span"); strip.style.cssText = "display:block;line-height:1.16em;padding-top:0.105em;";
        var ad = +a, bd = +b, spins = k % 2 ? 2 : 1, n1 = ((bd - ad + 10) % 10) + 10 * spins, n2 = ((ad - bd + 10) % 10) + 10;
        for (var j = 0; j <= n1 + n2; j++) { var d = document.createElement("span"); d.style.display = "block"; d.textContent = String((ad + j) % 10); strip.appendChild(d); }
        w.appendChild(strip); el.appendChild(w); win.push({ strip: strip, n1: n1, n2: n2, k: k }); k++;
      }
      return MW.drive(tl, at, o.loop, function (t) {
        win.forEach(function (q) { var e1 = 1.1 + 0.12 * q.k, e2 = 3.2 + 0.1 * q.k, r = q.n1 * out(Math.max(0, Math.min(1, (t - o.start) / (e1 - o.start)))) + q.n2 * out(Math.max(0, Math.min(1, (t - 2.7) / (e2 - 2.7)))); gsap.set(q.strip, { y: -r * 1.16 + "em" }); });
      });
    },
    options: { from: "start value as text (03,481)", to: "end value, same layout (12,907)", start: "s (0.4); digit k stops at 1.1 + 0.12 k s, spinning 1 or 2 extra turns", loop: "s (4.2): rolls on back to the start value from 2.7 s" },
    defaults: { from: "03,481", to: "12,907", start: 0.4, loop: 4.2 },
    demo: { css: `${BG}\n.od { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; } .od-n { font-size: 230px; font-weight: 800; } .od p { margin: 30px 0 0; font-size: 48px; color: #9aa3b8; }`,
      html: `<div class="gm od"><div><div class="od-n">03,481</div><p>lượt xem trong tuần</p></div></div>`, run: `MW.dataDigitOdometer(q(".od-n"), tl, 0, {});`, duration: 4.2 },
  }),

  T("data/count-up-expo", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var ex = gsap.parseEase("expo.out"), fmt = new Intl.NumberFormat(o.locale, { minimumFractionDigits: o.decimals, maximumFractionDigits: o.decimals }), col = getComputedStyle(el).color, mix = gsap.utils.interpolate(col, o.tint);
      el.style.fontVariantNumeric = "tabular-nums"; el.style.display = "inline-block"; el.style.textAlign = "right"; el.textContent = fmt.format(o.to); el.style.minWidth = el.offsetWidth + "px";
      return MW.drive(tl, at, o.loop, function (t) {
        var u = Math.max(0, Math.min(1, (t - o.start) / o.duration)), v = o.from + (o.to - o.from) * ex(u), m = Math.pow(10, o.decimals);
        el.textContent = fmt.format(Math.round(v * m) / m); el.style.color = u > 0 && u < 1 ? mix(0.35) : col; el.style.opacity = String(1 - Math.max(0, Math.min(1, (t - o.resetAt) / 0.45)));
      });
    },
    options: { from: "(0)", to: "(12480)", duration: "s (2), expo.out", decimals: "(0)", locale: "grouping (vi-VN: 12.480)", tint: "accent while counting (35 %)", start: "s (0.3)", resetAt: "s (3.15)", loop: "s (3.6)" },
    defaults: { from: 0, to: 12480, duration: 2, decimals: 0, locale: "vi-VN", tint: "#8b7bff", start: 0.3, resetAt: 3.15, loop: 3.6 },
    demo: { css: `${BG}\n.cu { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; } .cu-n { font-size: 260px; font-weight: 900; } .cu p { margin: 20px 0 0; font-size: 52px; color: #9aa3b8; }`,
      html: `<div class="gm cu"><div><div class="cu-n">0</div><p>khách hàng tin dùng</p></div></div>`, run: `MW.dataCountUpExpo(q(".cu-n"), tl, 0, {});`, duration: 3.6 },
  }),

  T("data/odometer-roll", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var q3 = gsap.parseEase("power3.out"), A = o.values[0], cols = [], col = getComputedStyle(el).color, mix = gsap.utils.interpolate(col, o.tint);
      el.textContent = ""; el.style.fontVariantNumeric = "tabular-nums"; el.style.display = "inline-flex";
      for (var i = 0; i < A.length; i++) {
        if (!/\d/.test(A[i])) { var s = document.createElement("span"); s.textContent = A[i]; el.appendChild(s); cols.push(null); continue; }
        var w = document.createElement("span"); w.style.cssText = "display:inline-block;overflow:hidden;height:1.4em;-webkit-mask-image:linear-gradient(transparent, #000 0.25em, #000 1.15em, transparent);mask-image:linear-gradient(transparent, #000 0.25em, #000 1.15em, transparent);";
        var strip = document.createElement("span"); strip.style.cssText = "display:block;line-height:1.4em;"; for (var j = 0; j < 30; j++) { var d = document.createElement("span"); d.style.display = "block"; d.textContent = String(j % 10); strip.appendChild(d); }
        w.appendChild(strip); el.appendChild(w); cols.push({ strip: strip, w: w });
      }
      // each change: the digits that differ roll forward (value up) or backward (value down) to the new digit, 0.75 s ease-out quart
      var num = function (s) { return +s.replace(/[^\d]/g, ""); }, steps = [];
      for (var c = 1; c < o.values.length; c++) steps.push({ t: o.times[c - 1], up: num(o.values[c]) > num(o.values[c - 1]), a: o.values[c - 1], b: o.values[c] });
      return MW.drive(tl, at, o.loop, function (t) {
        cols.forEach(function (q, i) {
          if (!q) return; var row = 10 + +A[i], roll = false;
          steps.forEach(function (s) { var da = +s.a[i], db = +s.b[i]; if (da === db) return; var n = s.up ? (db - da + 10) % 10 : -((da - db + 10) % 10), u = Math.max(0, Math.min(1, (t - s.t) / o.duration)); row += n * q3(u); if (u > 0 && u < 1) roll = true; });
          gsap.set(q.strip, { y: -((row % 10) + 10) * 1.4 + "em" }); q.w.style.color = roll ? mix(1) : col;
        });
      });
    },
    options: { values: "the values as text, same layout (['1.024', '2.048', '1.024'])", times: "s of each change ([0.4, 2.45])", duration: "s per roll (0.75)", tint: "accent while rolling", loop: "s (4.4)" },
    defaults: { values: ["1.024", "2.048", "1.024"], times: [0.4, 2.45], duration: 0.75, tint: "#a99bff", loop: 4.4 },
    demo: { css: `${BG}\n.or { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; } .or-n { font-size: 260px; font-weight: 900; } .or p { margin: 10px 0 0; font-size: 50px; color: #9aa3b8; }`,
      html: `<div class="gm or"><div><div class="or-n">1.024</div><p>người đăng ký mới</p></div></div>`, run: `MW.dataOdometerRoll(q(".or-n"), tl, 0, {});`, duration: 4.4 },
  }),

  T("data/ticker-flash", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var V = o.values, n = V[0].length, cells = [], out = gsap.parseEase("power2.out"), pq = gsap.parseEase("power1.out"), tri = o.arrow ? MW.el(o.arrow) : null, col = getComputedStyle(el).color;
      el.textContent = ""; el.style.fontVariantNumeric = "tabular-nums"; el.style.display = "inline-flex"; el.style.position = "relative";
      for (var i = 0; i < n; i++) { var w = document.createElement("span"); w.style.cssText = "display:inline-block;position:relative;overflow:hidden;padding:0.08em 0;border-radius:12px;"; var a = document.createElement("span"), b = document.createElement("span"); a.style.display = "inline-block"; b.style.cssText = "position:absolute;left:0;top:0.08em;"; a.textContent = V[0][i]; w.appendChild(a); w.appendChild(b); el.appendChild(w); cells.push({ w: w, a: a, b: b }); }
      var num = function (s) { return parseFloat(s.replace(/\./g, "").replace(",", ".")); };
      return MW.drive(tl, at, o.loop, function (t) {
        var k = 0; o.times.forEach(function (tt, i) { if (t >= tt) k = i + 1; });
        var cur = V[k], prev = V[Math.max(0, k - 1)], up = num(cur) >= num(prev), d = k ? t - o.times[k - 1] : 9, cl = up ? o.up : o.down;
        cells.forEach(function (c, i) {
          var ch = k && cur[i] !== prev[i], u = out(Math.min(1, d / 0.35)), fl = 0.32 * (1 - pq(Math.min(1, d / 0.6)));
          if (ch && d < 0.35) { c.a.textContent = prev[i]; c.b.textContent = cur[i]; var s = up ? 1 : -1; gsap.set(c.a, { yPercent: -s * 30 * u }); c.a.style.opacity = String(1 - u); gsap.set(c.b, { yPercent: s * 30 * (1 - u) }); c.b.style.opacity = String(u); }
          else { c.a.textContent = cur[i]; gsap.set(c.a, { yPercent: 0 }); c.a.style.opacity = "1"; c.b.style.opacity = "0"; }
          var lit = k && cur[i] !== prev[i] && d < 0.6; c.w.style.backgroundColor = lit ? "rgba(" + (up ? "61,220,132" : "255,93,108") + "," + fl + ")" : "transparent"; c.w.style.color = lit ? gsap.utils.interpolate(col, cl, fl / 0.32) : col;
        });
        if (tri) { tri.style.borderColor = "transparent"; tri.style[up ? "borderBottomColor" : "borderTopColor"] = cl; tri.style.marginTop = up ? "-30px" : "30px"; }
      });
    },
    options: { values: "price texts, same length", times: "s of each change ([0.4, 1.6, 2.8])", up: "colour for a rise", down: "for a fall", arrow: "the triangle element (CSS borders)", loop: "s (3.6)" },
    defaults: { values: ["1.284,5", "1.292,8", "1.279,1", "1.284,5"], times: [0.4, 1.6, 2.8], up: "#3ddc84", down: "#ff5d6c", arrow: null, loop: 3.6 },
    demo: { css: `${BG}\n.tf { position: absolute; inset: 0; display: grid; place-items: center; } .tf-box { display: flex; align-items: center; gap: 50px; padding: 60px 90px; border-radius: 40px; background: #151a28; border: 3px solid #2a3350; }
.tf-lab { font-size: 60px; font-weight: 700; color: #9aa3b8; } .tf-n { font-size: 170px; font-weight: 900; } .tf-tri { width: 0; height: 0; border: 40px solid transparent; }
.tf-line { position: absolute; left: 50%; top: 760px; width: 900px; height: 120px; margin-left: -450px; }`,
      html: `<div class="gm tf"><div class="tf-box"><div class="tf-lab">VN-Index</div><div class="tf-n">1.284,5</div><div class="tf-tri"></div></div>
<svg class="tf-line" viewBox="0 0 300 40"><polyline points="0,30 30,26 60,28 90,18 120,22 150,12 180,16 210,10 240,20 270,14 300,8" fill="none" stroke="#3ddc84" stroke-width="2.5"/></svg></div>`,
      run: `MW.dataTickerFlash(q(".tf-n"), tl, 0, { arrow: ".tf-tri" });`, duration: 3.6 },
  }),

  T("data/score-flip", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var pin = gsap.parseEase("power1.in"), pout = gsap.parseEase("power1.out"), dot = o.dot ? MW.el(o.dot) : null, base = getComputedStyle(el).backgroundColor, col = getComputedStyle(el).color;
      el.parentNode.style.perspective = "1200px";
      return MW.drive(tl, at, o.loop, function (t) {
        var k = 0; o.times.forEach(function (tt, i) { if (t >= tt) k = i + 1; });
        var d = k ? t - o.times[k - 1] : 9, prev = o.values[Math.max(0, k - 1)], cur = o.values[k], ang = 0, txt = cur;
        if (k && d < 0.35) { if (d < 0.175) { ang = -90 * pin(d / 0.175); txt = prev; } else { ang = 90 * (1 - pout((d - 0.175) / 0.175)); } }
        el.textContent = String(txt); gsap.set(el, { rotationX: ang });
        var f = d - 0.35, lit = k && f >= 0 && ((f < 0.15) || (f >= 0.3 && f < 0.45));
        el.style.backgroundColor = lit ? o.flash : base; el.style.color = lit ? base : col;
        if (dot) dot.style.opacity = k && d < 1.1 && o.dots && o.dots[k - 1] ? "1" : "0";
      });
    },
    options: { values: "the cell's values in order", times: "s of each change", flash: "flash colour (twice, 0.15 s on / off)", dot: "the small dot shown above the scoring cell", dots: "which changes show the dot", loop: "s (4.2)" },
    defaults: { values: [1, 2, 1], times: [0.7, 3.8], flash: "#8b7bff", dot: null, dots: [true, false], loop: 4.2 },
    demo: { css: `${BG}\n.sf { position: absolute; inset: 0; display: grid; place-items: center; } .sf-box { display: flex; align-items: center; gap: 46px; padding: 60px 80px; border-radius: 40px; background: #151a28; border: 3px solid #2a3350; font-size: 70px; font-weight: 800; }
.sf-c { position: relative; width: 170px; height: 200px; border-radius: 24px; background: #222a42; display: grid; place-items: center; font-size: 140px; font-weight: 900; font-variant-numeric: tabular-nums; } .sf-sep { color: #6c778b; }
.sf-dot { position: absolute; top: -40px; left: 50%; width: 22px; height: 22px; margin-left: -11px; border-radius: 50%; background: #ffd23d; opacity: 0; } .sf-w { position: relative; }`,
      html: `<div class="gm sf"><div class="sf-box"><span>Hà Nội</span><div class="sf-w"><div class="sf-dot d1"></div><div class="sf-c h">1</div></div><span class="sf-sep">-</span><div class="sf-w"><div class="sf-dot d2"></div><div class="sf-c a">1</div></div><span>Sài Gòn</span></div></div>`,
      run: `MW.dataScoreFlip(q(".sf-c.h"), tl, 0, { values: [1, 2, 1], times: [0.7, 3.8], dot: ".d1" }); MW.dataScoreFlip(q(".sf-c.a"), tl, 0, { values: [1, 2, 1], times: [2.1, 3.8], dot: ".d2" });`, duration: 4.2 },
  }),

  T("data/number-scramble", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var txt = el.textContent, spans = [], col = getComputedStyle(el).color, mix = gsap.utils.interpolate(o.tint, col);
      el.textContent = ""; el.style.fontVariantNumeric = "tabular-nums";
      for (var i = 0; i < txt.length; i++) { var s = document.createElement("span"); s.textContent = txt[i]; s.style.display = "inline-block"; el.appendChild(s); if (/\d/.test(txt[i])) spans.push({ s: s, d: txt[i] }); }
      var n = spans.length, step = Math.min(o.lock, 1.6 / n);
      return MW.drive(tl, at, o.loop, function (t) {
        var tick = Math.floor(t / o.tick), r = MW.rand(o.seed * 7919 + tick);
        spans.forEach(function (q, i) {
          var lockT = o.start + (i + 1) * step, unT = o.rescramble + (n - 1 - i) * 0.025, locked = t >= lockT && t < unT, rnd = String(Math.floor(r() * 10));
          q.s.textContent = locked ? q.d : rnd; var u = locked ? Math.min(1, (t - lockT) / 0.18) : 0;
          gsap.set(q.s, { scale: locked ? 1.14 - 0.14 * u : 1 }); q.s.style.color = locked ? mix(u) : o.tint; q.s.style.opacity = locked ? "1" : "0.75";
        });
      });
    },
    options: { tick: "s between random digits (0.04)", lock: "s per digit, left to right (0.12; at most 1.6 s in all)", start: "s (0.3)", tint: "colour while scrambling", rescramble: "s the digits scramble again from the right (2.95)", loop: "s (3.4)", seed: "the digits" },
    defaults: { tick: 0.04, lock: 0.12, start: 0.3, tint: "#a99bff", rescramble: 2.95, loop: 3.4, seed: 5 },
    demo: { css: `${BG}\n.ns { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; } .ns-n { font-size: 260px; font-weight: 900; } .ns p { margin: 10px 0 0; font-size: 52px; color: #9aa3b8; }`,
      html: `<div class="gm ns"><div><div class="ns-n">98,6%</div><p>đơn hàng giao đúng hẹn</p></div></div>`, run: `MW.dataNumberScramble(q(".ns-n"), tl, 0, {});`, duration: 3.4 },
  }),

  T("data/percent-ring", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var arc = el.querySelector(".pr-arc"), dot = el.querySelector(".pr-dot"), num = el.querySelector(".pr-num"), pq = gsap.parseEase("power1.out"), R = +arc.getAttribute("r"), C = 2 * Math.PI * R;
      arc.setAttribute("stroke-dasharray", C + " " + C);
      return MW.drive(tl, at, o.loop, function (t) {
        var v = o.value * pq(Math.max(0, Math.min(1, (t - o.start) / o.duration))), f = 1 - Math.max(0, Math.min(1, (t - o.resetAt) / 0.55)), a = -Math.PI / 2 + 2 * Math.PI * v / 100;
        arc.setAttribute("stroke-dashoffset", String(C * (1 - v / 100))); dot.setAttribute("cx", 300 + R * Math.cos(a)); dot.setAttribute("cy", 300 + R * Math.sin(a)); dot.style.opacity = v > 0.5 ? "1" : "0";
        num.firstChild.nodeValue = String(Math.round(v)); el.style.opacity = String(f);
      });
    },
    options: { value: "% (87)", duration: "s (1.6), ease-out quad", start: "s (0.3)", resetAt: "s (3.05)", loop: "s (3.6)" }, defaults: { value: 87, duration: 1.6, start: 0.3, resetAt: 3.05, loop: 3.6 },
    demo: { css: `${BG}\n.pr { position: absolute; left: 660px; top: 170px; width: 600px; height: 600px; } .pr-c { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
.pr-num { font-size: 190px; font-weight: 900; font-variant-numeric: tabular-nums; } .pr-num small { font-size: 95px; color: #8f9ab3; } .pr-lab { position: absolute; left: 0; right: 0; top: 640px; text-align: center; font-size: 54px; color: #9aa3b8; }`,
      html: `<div class="pr"><svg viewBox="0 0 600 600" width="600" height="600"><circle cx="300" cy="300" r="270" fill="none" stroke="#222a42" stroke-width="34"/><circle class="pr-arc" cx="300" cy="300" r="270" fill="none" stroke="#8b7bff" stroke-width="34" stroke-linecap="round" transform="rotate(-90 300 300)"/><circle class="pr-dot" cx="300" cy="30" r="10" fill="#fff"/></svg>
<div class="pr-c"><div class="pr-num">0<small>%</small></div></div><div class="pr-lab">khách hàng hài lòng</div></div>`,
      run: `MW.dataPercentRing(q(".pr"), tl, 0, {});`, duration: 3.6 },
  }),

  T("data/countdown-zoom", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var nums = Array.prototype.slice.call(el.querySelectorAll(".cz-n")), fin = el.querySelector(".cz-fin"), arc = el.querySelector(".cz-arc"), bk = gsap.parseEase("back.out(1.7)"), pq = gsap.parseEase("power1.in"), R = +arc.getAttribute("r"), C = 2 * Math.PI * R;
      arc.setAttribute("stroke-dasharray", C + " " + C);
      return MW.drive(tl, at, o.loop, function (t) {
        nums.forEach(function (n, i) { var d = t - o.start - i * o.per; if (d < 0 || d >= o.per) { n.style.opacity = "0"; return; } var s = d < 0.15 ? 0.6 + 0.4 * bk(d / 0.15) : 1 + 1.2 * pq((d - 0.15) / (o.per - 0.15)); gsap.set(n, { scale: s }); n.style.opacity = String(Math.min(1, d / 0.1) * (d < 0.15 ? 1 : 1 - pq((d - 0.15) / (o.per - 0.15)))); });
        var k = (t - o.start) / o.per, on = k >= 0 && k < nums.length; arc.setAttribute("stroke-dashoffset", String(on ? C * (1 - (k % 1)) : C)); arc.style.opacity = on ? "1" : "0";
        if (fin) { var f = t - o.start - nums.length * o.per; gsap.set(fin, { scale: f >= 0 ? 0.6 + 0.4 * bk(Math.min(1, f / 0.25)) : 0.6 }); fin.style.opacity = f >= 0 ? "1" : "0"; }
      });
    },
    options: { start: "s (0.2)", per: "s per number (1)", loop: "s (4.2)" }, defaults: { start: 0.2, per: 1, loop: 4.2 },
    demo: { css: `${BG}\n.cz { position: absolute; inset: 0; } .cz svg { position: absolute; left: 50%; top: 50%; width: 800px; height: 800px; margin: -400px; }
.cz-n, .cz-fin { position: absolute; inset: 0; display: grid; place-items: center; font-size: 320px; font-weight: 900; opacity: 0; } .cz-fin { font-size: 170px; color: #a99bff; }`,
      html: `<div class="gm cz"><svg viewBox="0 0 800 800"><circle cx="400" cy="400" r="360" fill="none" stroke="#222a42" stroke-width="12"/><circle class="cz-arc" cx="400" cy="400" r="360" fill="none" stroke="#8b7bff" stroke-width="12" transform="rotate(-90 400 400)"/></svg>
<div class="cz-n">3</div><div class="cz-n">2</div><div class="cz-n">1</div><div class="cz-fin">BẮT ĐẦU</div></div>`, run: `MW.dataCountdownZoom(q(".cz"), tl, 0, {});`, duration: 4.2 },
  }),

  T("data/seven-segment", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var NS = "http://www.w3.org/2000/svg", MASK = { "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg", "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g" };
      var w = o.width, h = w * 1.8, th = w * 0.17, gap = w * 0.35, svg = document.createElementNS(NS, "svg"), digits = [], colon = [];
      var seg = function (x, y, len, vert) { var p = document.createElementNS(NS, "polygon"), a = th / 2, pts = vert ? [[x, y], [x + a, y + a], [x + a, y + len - a], [x, y + len], [x - a, y + len - a], [x - a, y + a]] : [[x, y], [x + a, y - a], [x + len - a, y - a], [x + len, y], [x + len - a, y + a], [x + a, y + a]]; p.setAttribute("points", pts.map(function (q) { return q.join(","); }).join(" ")); p.setAttribute("fill", o.color); return p; };
      var x = th, cnt = o.format.length;
      svg.setAttribute("width", cnt * (w + gap) + th * 2); svg.setAttribute("height", h + th * 2); svg.style.overflow = "visible"; svg.style.transform = "skewX(" + (-4.6) + "deg)";
      for (var i = 0; i < cnt; i++) {
        if (o.format[i] === ":") { [h * 0.32, h * 0.68].forEach(function (yy) { var c = document.createElementNS(NS, "circle"); c.setAttribute("cx", x + th / 2); c.setAttribute("cy", yy + th); c.setAttribute("r", th * 0.55); c.setAttribute("fill", o.color); svg.appendChild(c); colon.push(c); }); x += th * 2 + gap * 0.6; continue; }
        var y0 = th, m = h / 2, S = { a: seg(x + th / 2, y0, w - th, false), b: seg(x + w, y0 + th / 2, m - th, true), c: seg(x + w, y0 + m + th / 2, m - th, true), d: seg(x + th / 2, y0 + h, w - th, false), e: seg(x, y0 + m + th / 2, m - th, true), f: seg(x, y0 + th / 2, m - th, true), g: seg(x + th / 2, y0 + m, w - th, false) };
        for (var k in S) svg.appendChild(S[k]); digits.push(S); x += w + gap;
      }
      el.appendChild(svg); svg.style.filter = "drop-shadow(0 0 8px " + o.color + ")";
      var at0 = function (v, i) { return String(v)[i]; };
      return MW.drive(tl, at, o.loop, function (t) {
        var n = Math.max(0, Math.floor((t - o.start) / o.every) + 1), cur = o.from + (t >= o.start ? n : 0), prev = cur - 1, d = t >= o.start ? (t - o.start) % o.every : 9, pow = 1 - Math.max(0, Math.min(1, (t - o.powerOffAt) / 0.22));
        var fmt = function (v) { var mm = Math.floor(v / 100) % 100, ss = v % 100; ss = ss % 60; return ("0" + Math.floor(v / 100)).slice(-2) + ("0" + (v % 100)).slice(-2); };
        var A = fmt(prev), B = fmt(cur), k2 = Math.min(1, d / o.fade);
        digits.forEach(function (S, i) { for (var s in S) { var on1 = MASK[A[i]].indexOf(s) >= 0, on2 = MASK[B[i]].indexOf(s) >= 0, v = on1 === on2 ? (on2 ? 1 : o.off) : (on2 ? o.off + (1 - o.off) * k2 : 1 - (1 - o.off) * k2); S[s].setAttribute("opacity", String(Math.max(o.off * pow, v * pow))); } });
        colon.forEach(function (c) { c.setAttribute("opacity", String((Math.floor(t * 2) % 2 ? o.off : 1) * pow)); });
      });
    },
    options: { from: "the shown value as hhmm (1234)", start: "s it starts counting (0.5)", every: "s per step (0.45)", fade: "s a segment changes (0.06)", off: "unlit opacity (0.08)", width: "px per digit (150)", color: "LED colour", format: "digit layout ('dd:dd')", powerOffAt: "s (3.4)", loop: "s (4)" },
    defaults: { from: 1234, start: 0.5, every: 0.45, fade: 0.06, off: 0.08, width: 150, color: "#ff5d6c", format: "dd:dd", powerOffAt: 3.4, loop: 4 },
    demo: { css: `${BG}\n.ss { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; } .ss-box { padding: 70px 90px; border-radius: 40px; background: #0d0f16; border: 3px solid #222a42; } .ss p { margin: 40px 0 0; font-size: 46px; color: #9aa3b8; }`,
      html: `<div class="gm ss"><div><div class="ss-box"><div class="ss-d"></div></div><p>Giờ mở bán</p></div></div>`, run: `MW.dataSevenSegment(q(".ss-d"), tl, 0, {});`, duration: 4 },
  }),
];

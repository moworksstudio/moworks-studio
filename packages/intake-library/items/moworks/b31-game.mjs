// Game Impact FX (batch 3.1): hit, slam and burst effects for game-like motion, written here. Most draw on a canvas laid over the host in a
// 320 x 200 units (MW.stage320), so the numbers read as the spec gives them; Vietnamese words stay DOM text. Times are seconds from `at`,
// the start of the effect's own timeline.
import { T } from "../../moworks/define.mjs";

const G = (inner = "", css = "", duration = 4) => ({ css: `#demo { background: radial-gradient(100% 100% at 50% 40%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; }
.gm { position: absolute; inset: 0; } .gm .w { font-weight: 900; letter-spacing: -0.02em; white-space: nowrap; } .gm .lab { font-size: 34px; font-weight: 700; color: #8f9ab3; letter-spacing: 0.08em; white-space: nowrap; }
${css}`, html: `<div class="gm">${inner}</div>`, duration });
const run = (name, d = 4, opt = "{}") => `MW.${name}(q(".gm"), tl, 0, ${opt});`;

export default [
  T("motion/hit-stop-hold", {
    uses: ["keys", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), a = el.querySelector(".atk"), b = el.querySelector(".tgt"), lab = el.querySelector(".lab"), k = S.k, c = o.contactAt, h = o.hold;
      S.put(a, 70, 132); S.put(b, 200, 132); S.put(lab, 160, 60);
      var ctx = S.ctx; S.clear(); ctx.strokeStyle = "#3a4260"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, 152); ctx.lineTo(300, 152); ctx.stroke();
      MW.keys(tl, a, at, { x: [[0, 0], [c - 0.68, 0], [c, o.travel * k], [c + h, o.travel * k], [c + h + 0.68, (o.travel + 24) * k]] }, "none");
      MW.keys(tl, b, at, { x: [[0, 0], [c + h, 0], [c + h + 0.68, o.push * k]], rotation: [[0, 0], [c + h, 0], [c + h + 0.68, o.rotate]] }, "none");
      tl.fromTo(lab, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05, immediateRender: true }, at + c); tl.to(lab, { autoAlpha: 0, duration: 0.1 }, at + c + h);
      return at + c + h + 0.68;
    },
    options: { contactAt: "s to contact (1.16)", hold: "s both stand still (0.56; a real game holds 3-6 frames)", travel: "units the attacker travels (81 of 320)", push: "units the target is pushed (36)", rotate: "degrees it turns (15)" },
    defaults: { contactAt: 1.16, hold: 0.56, travel: 81, push: 36, rotate: 15 },
    demo: { ...G(`<div class="atk" style="width:200px;height:200px;border-radius:30px;background:linear-gradient(160deg,#a693ff,#6a4cf0)"></div><div class="tgt" style="width:200px;height:200px;border-radius:30px;background:#2a3350;border:4px solid #4a5478"></div><div class="lab">CHẠM · KHỰNG</div>`), run: run("motionHitStopHold"), duration: 3 },
  }),

  T("text/shockwave-type", {
    uses: ["drive", "spring", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), w = el.querySelector(".w"), ctx = S.ctx, out = gsap.parseEase("power2.out"), sp = MW.spring(300, 16), bk = gsap.parseEase("back.in");
      S.put(w, 160, 100);
      var P = o.peakAt, dash = []; for (var i = 0; i < 10; i++) dash.push((i / 10) * 2 * Math.PI + 0.3);
      return MW.drive(tl, at, o.exitAt + 0.3, function (t) {
        var s = t < P - 0.23 ? 0 : t < P ? o.peak * out((t - (P - 0.23)) / 0.23) : o.peak + (1 - o.peak) * sp.at(t - P);
        if (t > o.exitAt) s *= 1 - bk(Math.min(1, (t - o.exitAt) / 0.3));
        var sh = t >= P && t < P + 0.16 ? 4 * S.k * (1 - (t - P) / 0.16) : 0;
        gsap.set(w, { scale: s, x: sh * Math.sin(t * 157), y: sh * Math.cos(t * 131) });
        S.clear();
        [[0.02, "#8b7bff", 7], [0.1, "#e8ebf3", 3.5]].forEach(function (r) {
          var u = t - P - r[0]; if (u < 0 || u > 1.2 || t > o.exitAt) return; var q = out(u / 1.2), R = 34 + (204 - 34) * q;
          ctx.globalAlpha = 1 - q * q; ctx.strokeStyle = r[1]; ctx.lineWidth = r[2] + (1 - r[2]) * q; ctx.beginPath(); ctx.ellipse(160, 100, R / 2, R / 2 * o.flat, 0, 0, 2 * Math.PI); ctx.stroke();
        });
        var d = t - P; if (d > 0 && d < 0.4) { var q2 = out(d / 0.4); ctx.globalAlpha = 1 - q2; ctx.strokeStyle = "#ffd23d"; ctx.lineWidth = 2.5; dash.forEach(function (a) { var r0 = 30 + 30 * q2, r1 = 30 + 60 * q2; ctx.beginPath(); ctx.moveTo(160 + r0 * Math.cos(a), 100 + r0 * Math.sin(a) * 0.7); ctx.lineTo(160 + r1 * Math.cos(a), 100 + r1 * Math.sin(a) * 0.7); ctx.stroke(); }); }
        ctx.globalAlpha = 1;
      });
    },
    options: { peakAt: "s when the word peaks (0.58)", peak: "overshoot scale (1.28), then a spring k300 d16 to 1", flat: "ring height ÷ width (0.62)", exitAt: "s of the back.in exit (3.6)" },
    defaults: { peakAt: 0.58, peak: 1.28, flat: 0.62, exitAt: 3.6 },
    demo: { ...G(`<div class="w" style="font-size:250px;color:#fff">BÙM!</div>`), run: run("textShockwaveType"), duration: 4 },
  }),

  T("text/slash-reveal", {
    uses: ["drive", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), w = el.querySelector(".w"), ctx = S.ctx, io = gsap.parseEase("power2.inOut"), out = gsap.parseEase("power2.out"), tn = Math.tan(o.tilt * Math.PI / 180), k = S.k;
      S.put(w, 160, 96);
      return MW.drive(tl, at, o.outAt + 0.35, function (t) {
        var u = Math.max(0, Math.min(1, (t - o.at) / o.duration)), X = -80 + 480 * io(u);
        // the word shows only on the side the slash has passed (its edge on the line, leaning by the tilt)
        var r = w.getBoundingClientRect(), hb = el.getBoundingClientRect(), wx = (r.left - hb.left - S.ox) / k, wy = (r.top - hb.top - S.oy) / k, wh = r.height / k;
        var xt = X + (wy - 100) * tn, xb = X + (wy + wh - 100) * tn;
        var cl = t >= o.outAt ? Math.min(1, (t - o.outAt) / 0.35) : 0;
        w.style.clipPath = "polygon(" + [[-50, -20], [(xt - wx) * k, -20], [(xb - wx) * k, wh * k + 20], [-50, wh * k + 20]].map(function (p) { return p[0] + "px " + p[1] + "px"; }).join(",") + ")";
        if (u >= 1) w.style.clipPath = "none"; w.style.opacity = String(1 - cl);
        S.clear();
        var line = function (x, a, wd, col) { ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(x - 110 * tn, -10); ctx.lineTo(x + 110 * tn, 210); ctx.stroke(); };
        if (u > 0 && u < 1) {
          ctx.globalAlpha = 0.25; ctx.fillStyle = "#8b7bff"; ctx.beginPath(); ctx.moveTo(X - 110 * tn - o.band, -10); ctx.lineTo(X - 110 * tn, -10); ctx.lineTo(X + 110 * tn, 210); ctx.lineTo(X + 110 * tn - o.band, 210); ctx.fill();
          line(X, 1, 3, "#8b7bff"); line(X, 1, 1, "#e8ebf3");
          for (var s = 0; s < 4; s++) { var yy = 40 + s * 38, xx = X + (yy - 100) * tn; ctx.globalAlpha = 1; ctx.fillStyle = "#ffd23d"; ctx.fillRect(xx - 2 - s * 3, yy - 1, 4, 2); }
        }
        if (t > o.at + 0.35 && t < 1.25) { var g = Math.max(0, Math.min(1, (t - 0.85) / 0.4)); line(400 + 30 * g - 80 + 0, (1 - g) * 0.6, 2, "#8b7bff"); }
        var ul = Math.max(0, Math.min(1, (t - 0.9) / 0.3)); if (ul > 0 && cl < 1) { ctx.globalAlpha = 1 - cl; ctx.fillStyle = "#8b7bff"; var L = 96 * out(ul); ctx.fillRect(160 - L / 2, 128, L, 3); }
        ctx.globalAlpha = 1;
      });
    },
    options: { at: "s of the slash (0.5)", duration: "s it takes (0.35), in-out cubic", tilt: "degrees from vertical (24)", band: "units of the trailing band (70)", outAt: "s of the exit (3.5)" },
    defaults: { at: 0.5, duration: 0.35, tilt: 24, band: 70, outAt: 3.5 },
    demo: { ...G(`<div class="w" style="font-size:260px;color:#fff">CHÉM</div>`), run: run("textSlashReveal"), duration: 4 },
  }),

  T("effect/freeze-color-drain", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = gsap.parseEase("power2.out"), inn = gsap.parseEase("power2.in"), lab = o.label ? MW.el(o.label) : null, fr = o.frame ? MW.el(o.frame) : null, span = o.resumeAt - o.freezeAt;
      // the scene's own motion reads its time from el.__mwTime(t): it runs, stands still from freezeAt, and resumes from the same frame
      el.__mwTime = function (t) { return t < at + o.freezeAt ? t - at : t < at + o.resumeAt ? o.freezeAt : t - at - span; };
      return MW.drive(tl, at, o.resumeAt + 0.2, function (t) {
        var g = t < o.freezeAt ? 0 : t < o.freezeAt + o.drain ? out((t - o.freezeAt) / o.drain) : t < o.resumeAt - o.back ? 1 : t < o.resumeAt ? 1 - inn((t - o.resumeAt + o.back) / o.back) : 0;
        el.style.filter = g > 0.001 ? "saturate(" + (1 - g) + ")" : "";
        if (lab) lab.style.opacity = String(g); if (fr) fr.style.opacity = String(g);
      });
    },
    options: { freezeAt: "s (1.3)", resumeAt: "s (3.1)", drain: "s for the colour to drain, ease-out (0.15)", back: "s for it to return, ease-in, ending as time resumes (0.2)", label: "the PAUSED title (fades with the drain)", frame: "the corner brackets" },
    defaults: { freezeAt: 1.3, resumeAt: 3.1, drain: 0.15, back: 0.2, label: null, frame: null },
    notes: "Time freeze: the scene's own animation must read its time from el.__mwTime(t) (the demo's orbiting shapes do).",
    demo: {
      duration: 4.2,
      css: `#demo { background: #0b0d12; color: #e8ebf3; font-family: Inter, sans-serif; }
.fz { position: absolute; inset: 0; background: radial-gradient(90% 90% at 50% 45%, #233064, #0f1430); }
.fz .o { position: absolute; left: 50%; top: 50%; border-radius: 50%; }
.fz .o1 { width: 200px; height: 200px; margin: -100px; background: radial-gradient(circle at 35% 30%, #ffe08a, #ff8a3d); }
.fz .o2 { width: 130px; height: 130px; margin: -65px; background: radial-gradient(circle at 35% 30%, #9af2ff, #2bb7e6); }
.fz .o3 { width: 90px; height: 90px; margin: -45px; background: radial-gradient(circle at 35% 30%, #ffb3d1, #ff5d8f); }
.fzl { position: absolute; left: 0; right: 0; top: 140px; text-align: center; font-size: 96px; font-weight: 900; letter-spacing: 0.12em; opacity: 0; }
.fzb { position: absolute; inset: 70px 84px 130px 84px; opacity: 0; } .fzb i { position: absolute; width: 84px; height: 84px; border: 0 solid #fff; }
.fzb i:nth-child(1) { left: 0; top: 0; border-left-width: 10px; border-top-width: 10px; } .fzb i:nth-child(2) { right: 0; top: 0; border-right-width: 10px; border-top-width: 10px; }
.fzb i:nth-child(3) { left: 0; bottom: 0; border-left-width: 10px; border-bottom-width: 10px; } .fzb i:nth-child(4) { right: 0; bottom: 0; border-right-width: 10px; border-bottom-width: 10px; }`,
      html: `<div class="fz"><div class="o o1"></div><div class="o o2"></div><div class="o o3"></div><div class="fzl">TẠM DỪNG</div><div class="fzb"><i></i><i></i><i></i><i></i></div></div>`,
      run: `var sc = q(".fz"); MW.effectFreezeColorDrain(sc, tl, 0, { label: ".fzl", frame: ".fzb" });
var orb = qa(".fz .o"); MW.drive(tl, 0, 4.2, function (t) { var s = sc.__mwTime(t); orb.forEach(function (e, i) { var a = s * (1.4 + i * 0.6) + i * 2.1, r = 140 + i * 130; gsap.set(e, { x: r * Math.cos(a), y: r * 0.55 * Math.sin(a) }); }); });`,
    },
  }),

  T("ui/combo-heat-gauge", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var num = el.querySelector(".cnum"), bar = el.querySelector(".cbar"), labs = el.querySelectorAll(".cst"), sparks = el.querySelector(".csp"), sp = MW.spring(260, 22), cols = ["#3dd6f5", "#ffd23d", "#8b7bff"];
      var stage = function (n) { return n <= 2 ? 0 : n <= 4 ? 1 : 2; };
      return MW.drive(tl, at, o.resetAt + 0.6, function (t) {
        var n = 0, g = 0, last = -1;
        o.hits.forEach(function (h, i) { if (t >= h) { n = i + 1; last = h; g += (1 / o.hits.length) * sp.at(t - h); } });
        if (t >= o.resetAt) g *= 1 - sp.at(t - o.resetAt);
        var pop = last >= 0 ? 1 + 0.35 * Math.exp(-12 * (t - last)) * Math.cos(20 * (t - last)) : 1, st = stage(n), prev = stage(Math.max(0, n - 1));
        var mix = last >= 0 ? Math.min(1, (t - last) / 0.15) : 1, col = gsap.utils.interpolate(cols[prev], cols[st], st !== prev ? mix : 1);
        num.firstChild.nodeValue = String(Math.max(1, n)); gsap.set(num, { scale: n ? pop : 0.001 }); num.style.color = col; num.style.opacity = t >= o.resetAt ? String(Math.max(0, 1 - (t - o.resetAt) / 0.4)) : n ? "1" : "0";
        bar.style.width = (Math.max(0, g) * 100) + "%"; bar.style.background = col;
        labs.forEach(function (l, i) { l.style.color = n && i === st && t < o.resetAt ? cols[i] : "#4a5270"; });
        sparks.style.opacity = n >= 5 && t < o.resetAt ? "1" : "0";
        Array.prototype.forEach.call(sparks.children, function (s, i) { var ph = (t * 0.9 + i / 10) % 1; gsap.set(s, { y: -150 * ph, opacity: 1 - ph }); });
      });
    },
    options: { hits: "seconds of each hit ([0.35, 0.8, 1.15, 1.45, 1.7, 1.9])", resetAt: "s the gauge returns to 0 (3.4)" },
    defaults: { hits: [0.35, 0.8, 1.15, 1.45, 1.7, 1.9], resetAt: 3.4 },
    demo: {
      duration: 4,
      css: `#demo { background: radial-gradient(100% 100% at 50% 40%, #1a1f33, #0b0d12); color: #e8ebf3; font-family: Inter, sans-serif; }
.cb { position: absolute; left: 460px; top: 230px; width: 1000px; }
.cnum { font-size: 260px; font-weight: 900; line-height: 1; text-align: center; transform-origin: 50% 60%; } .chit { font-size: 64px; font-weight: 800; letter-spacing: 0.1em; text-align: center; color: #8f9ab3; margin-bottom: 50px; }
.cg { position: relative; height: 60px; border-radius: 30px; background: #1d2234; overflow: hidden; } .cbar { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 30px; }
.cg i { position: absolute; top: 0; bottom: 0; width: 6px; background: #0b0d12; } .cls { display: flex; justify-content: space-around; margin-top: 26px; font-size: 40px; font-weight: 800; letter-spacing: 0.08em; }
.csp { position: absolute; right: 40px; top: 380px; width: 300px; height: 10px; } .csp b { position: absolute; bottom: 0; width: 12px; height: 12px; border-radius: 50%; background: #ffd23d; box-shadow: 0 0 14px #ffb547; }`,
      html: `<div class="cb"><div class="cnum">1</div><div class="chit">HIT</div><div class="cg"><div class="cbar"></div><i style="left:33.3%"></i><i style="left:66.6%"></i></div>
<div class="cls"><span class="cst">LẠNH</span><span class="cst">ẤM</span><span class="cst">NÓNG</span></div><div class="csp">${Array.from({ length: 10 }, (_, i) => `<b style="left:${i * 30}px"></b>`).join("")}</div></div>`,
      run: `MW.uiComboHeatGauge(q(".cb"), tl, 0, {});`,
    },
  }),

  T("effect/edge-damage-pulse", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var edges = [], out = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut"), hp = o.readout ? MW.el(o.readout) : null, bar = o.bar ? MW.el(o.bar) : null, lag = o.lag ? MW.el(o.lag) : null;
      ["top", "bottom", "left", "right"].forEach(function (side) { var d = document.createElement("div"); d.style.cssText = "position:absolute;pointer-events:none;z-index:8;" + side + ":0;" + (side === "top" || side === "bottom" ? "left:0;right:0;" : "top:0;bottom:0;"); el.appendChild(d); edges.push([d, side]); });
      return MW.drive(tl, at, o.healAt + 0.5, function (t) {
        var d = t - o.hitAt, a = d < 0 ? 0 : d < o.rise ? out(d / o.rise) : Math.exp(-(d - o.rise) / o.decay), depth = (o.depth + 14 / 44 * o.depth * a);
        edges.forEach(function (e) {
          var dir = { top: "180deg", bottom: "0deg", left: "90deg", right: "270deg" }[e[1]];
          e[0].style[e[1] === "top" || e[1] === "bottom" ? "height" : "width"] = depth + "px";
          e[0].style.background = "linear-gradient(" + dir + ", " + o.color + ", rgba(255,40,60,0))"; e[0].style.opacity = String(o.peak * a);
        });
        if (hp) { var sh = d > 0 && d < 0.2 ? 9 * (1 - d / 0.2) : 0; gsap.set(hp, { x: sh * Math.sin(t * 190), y: sh * Math.cos(t * 170) }); hp.style.color = d > 0 && t < o.healAt ? o.color : ""; hp.firstChild.nodeValue = d > 0 && t < o.healAt + 0.25 ? o.after : o.before; }
        var heal = t > o.healAt ? io(Math.min(1, (t - o.healAt) / 0.5)) : 0, lv = d > 0 ? o.toHp : o.fromHp;
        if (bar) bar.style.width = (lv + (o.fromHp - lv) * heal) + "%";
        if (lag) { var lg = d < 0.35 ? o.fromHp : d < 0.8 ? o.fromHp + (o.toHp - o.fromHp) * io((d - 0.35) / 0.45) : o.toHp; lag.style.width = (lg + (o.fromHp - lg) * heal) + "%"; }
      });
    },
    options: { hitAt: "s (0.5)", peak: "edge opacity (0.85)", rise: "s (0.08)", decay: "s, time constant (0.55)", depth: "px of the edge band (264; 44 of 320), +32 % at the peak", color: "edge colour", readout: "HP text", bar: "HP bar", lag: "the lag bar", fromHp: "% (56)", toHp: "% (24)", before: "readout text before", after: "readout text after", healAt: "s (3.4)" },
    defaults: { hitAt: 0.5, peak: 0.85, rise: 0.08, decay: 0.55, depth: 264, color: "#ff2d4a", readout: null, bar: null, lag: null, fromHp: 56, toHp: 24, before: "MÁU 56", after: "MÁU 24", healAt: 3.4 },
    demo: {
      duration: 4,
      css: `#demo { background: radial-gradient(100% 100% at 50% 45%, #233064, #0f1430); color: #e8ebf3; font-family: Inter, sans-serif; }
.ed { position: absolute; inset: 0; } .hud { position: absolute; left: 110px; bottom: 110px; width: 700px; } .hpt { font-size: 56px; font-weight: 900; margin-bottom: 20px; letter-spacing: 0.04em; }
.hpb { position: relative; height: 40px; border-radius: 20px; background: #1d2234; overflow: hidden; } .hpb div { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 20px; }
.lag { background: rgba(255, 210, 61, 0.55); width: 56%; } .hpv { background: linear-gradient(90deg, #3ddc84, #2bb36a); width: 56%; }
.ed .sun { position: absolute; left: 50%; top: 42%; width: 340px; height: 340px; margin: -170px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffe08a, #ff8a3d); opacity: 0.85; }`,
      html: `<div class="ed"><div class="sun"></div><div class="hud"><div class="hpt">MÁU 56</div><div class="hpb"><div class="lag"></div><div class="hpv"></div></div></div></div>`,
      run: `MW.effectEdgeDamagePulse(q(".ed"), tl, 0, { readout: ".hpt", bar: ".hpv", lag: ".lag" });`,
    },
  }),

  T("effect/crack-spread", {
    uses: ["drive", "rand", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), ctx = S.ctx, r = MW.rand(o.seed), ex = gsap.parseEase("expo.out"), out = gsap.parseEase("power2.out"), inn = gsap.parseEase("power2.in"), br = [];
      for (var i = 0; i < o.branches; i++) {
        var a = (i / o.branches) * 2 * Math.PI + (r() * 2 - 1) * 0.3, pts = [[o.x, o.y]], len = 0;
        for (var s = 0; s < 4; s++) { a += (r() * 2 - 1) * 0.35; var L = 12.5 + r() * 7.5, p = pts[pts.length - 1]; pts.push([p[0] + L * Math.cos(a), p[1] + L * Math.sin(a)]); len += L; }
        var root = 1 + Math.floor(r() * 2), ta = a + (r() > 0.5 ? 0.8 : -0.8), tw = [pts[root]], tl2 = 14 + r() * 12;
        for (var j = 0; j < 2; j++) { var q = tw[tw.length - 1]; ta += 0.3; tw.push([q[0] + tl2 / 2 * Math.cos(ta), q[1] + tl2 / 2 * Math.sin(ta)]); }
        br.push({ pts: pts, len: len, tw: tw, root: root / 4 });
      }
      var path = function (pts, f, w) { var n = pts.length - 1, m = f * n; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i <= n; i++) { if (i - 1 >= m) break; var p0 = pts[i - 1], p1 = pts[i], g = Math.min(1, m - (i - 1)); ctx.lineTo(p0[0] + (p1[0] - p0[0]) * g, p0[1] + (p1[1] - p0[1]) * g); } ctx.stroke(); };
      return MW.drive(tl, at, o.fadeAt + 0.4, function (t) {
        var d = t - o.hitAt, sh = d > 0 && d < 0.18 ? 3 * S.k * (1 - d / 0.18) : 0;
        gsap.set(el, { x: sh * Math.sin(t * 180), y: sh * Math.cos(t * 150) });
        S.clear(); if (d < 0) return;
        ctx.globalAlpha = t > o.fadeAt ? 1 - inn(Math.min(1, (t - o.fadeAt) / 0.4)) : 1; ctx.strokeStyle = "#8b7bff"; ctx.lineCap = "round"; ctx.lineJoin = "round";
        var f = ex(Math.min(1, d / o.spread));
        br.forEach(function (b) { path(b.pts, f, 2.2); if (f > b.root) path(b.tw, (f - b.root) / (1 - b.root), 1.3); });
        ctx.fillStyle = "#e8ebf3"; ctx.beginPath(); ctx.arc(o.x, o.y, 5, 0, 2 * Math.PI); ctx.fill();
        if (d < 0.35) { var q = out(d / 0.35); ctx.globalAlpha = 1 - q; ctx.strokeStyle = "#e8ebf3"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(o.x, o.y, 6 + 26 * q, 0, 2 * Math.PI); ctx.stroke(); }
        ctx.globalAlpha = 1;
      });
    },
    options: { hitAt: "s (0.62)", branches: "main branches (6)", spread: "s to draw outward, expo.out (0.3)", x: "hit point, of 320 (118)", y: "of 200 (84)", seed: "the crack pattern", fadeAt: "s (3.5)" },
    defaults: { hitAt: 0.62, branches: 6, spread: 0.3, x: 118, y: 84, seed: 5, fadeAt: 3.5 },
    demo: { ...G("", `.gm { left: 360px; right: 360px; top: 140px; bottom: 140px; border-radius: 60px; background: linear-gradient(160deg, #2a3350, #151a28); border: 4px solid #3a4466; }`), run: run("effectCrackSpread"), duration: 4 },
  }),

  T("motion/squeeze-rebound", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var inn = gsap.parseEase("power2.in"), out = gsap.parseEase("power2.out"), sp = MW.spring(260, 14), lab = o.label ? MW.el(o.label) : null, bk = gsap.parseEase("back.out");
      return MW.drive(tl, at, o.outAt + 0.3, function (t) {
        var d = t - o.at, sx = d < 0 ? 1 : d < 0.15 ? 1 - (1 - o.squeeze) * inn(d / 0.15) : d < 0.29 ? o.squeeze + (o.rebound - o.squeeze) * out((d - 0.15) / 0.14) : o.rebound + (1 - o.rebound) * sp.at(d - 0.29);
        gsap.set(el, { scaleX: sx, scaleY: 1 + (1 - sx) * o.volume });
        if (lab) { var u = Math.max(0, Math.min(1, (d - 0.29) / 0.2)), e = t > o.outAt ? 1 - Math.min(1, (t - o.outAt) / 0.3) : 1; gsap.set(lab, { scale: bk(u) * e, opacity: Math.min(1, u * 3) * e }); }
      });
    },
    options: { at: "s of the squeeze (0.45)", squeeze: "scaleX (0.72)", rebound: "scaleX (1.14), then a spring k260 d14", volume: "scaleY = 1 + (1 − scaleX) × this (0.45)", label: "the title that pops after (0.2 s back.out)", outAt: "s the label leaves (3.6)" },
    defaults: { at: 0.45, squeeze: 0.72, rebound: 1.14, volume: 0.45, label: null, outAt: 3.6 },
    demo: {
      duration: 4,
      css: `#demo { background: #0b0d12; color: #e8ebf3; font-family: Inter, sans-serif; } .sq { position: absolute; inset: 0; background: radial-gradient(90% 90% at 50% 50%, #2a1f55, #0b0d12); display: grid; place-items: center; }
.burst { width: 620px; height: 620px; background: conic-gradient(from 0deg, #ffd23d 0 10deg, transparent 10deg 30deg, #ffd23d 30deg 40deg, transparent 40deg 60deg, #ffd23d 60deg 70deg, transparent 70deg 90deg, #ffd23d 90deg 100deg, transparent 100deg 120deg, #ffd23d 120deg 130deg, transparent 130deg 150deg, #ffd23d 150deg 160deg, transparent 160deg 180deg, #ffd23d 180deg 190deg, transparent 190deg 210deg, #ffd23d 210deg 220deg, transparent 220deg 240deg, #ffd23d 240deg 250deg, transparent 250deg 270deg, #ffd23d 270deg 280deg, transparent 280deg 300deg, #ffd23d 300deg 310deg, transparent 310deg 330deg, #ffd23d 330deg 340deg, transparent 340deg); border-radius: 50%; opacity: 0.55; }
.crit { position: absolute; font-size: 200px; font-weight: 900; color: #fff; text-shadow: 0 0 40px #ff5d8f; opacity: 0; letter-spacing: -0.02em; }`,
      html: `<div class="sq"><div class="burst"></div><div class="crit">CHÍ MẠNG</div></div>`,
      run: `MW.motionSqueezeRebound(q(".sq"), tl, 0, { label: ".crit" });`,
    },
  }),

  T("effect/panel-tile-shatter", {
    uses: ["drive", "stage320"],
    fn: function (el, tl, at, o) {
      var panel = el.querySelector(".pn"), next = el.querySelector(".nx"), ul = el.querySelector(".nxu"), S = MW.stage320(el), ctx = S.ctx, k = S.k, out = gsap.parseEase("power2.out"), bk = gsap.parseEase("back.out");
      var W = 160 * k, Hh = 90 * k, cols = 3, rows = 2, tiles = [];
      S.put(panel, 160, 100); S.put(next, 160, 96); if (ul) S.put(ul, 160, 120);
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
        var c = panel.cloneNode(true); c.className = "pn-tile"; c.style.clipPath = "inset(" + (j * Hh / rows) + "px " + (W - (i + 1) * W / cols) + "px " + (Hh - (j + 1) * Hh / rows) + "px " + (i * W / cols) + "px)";
        c.style.visibility = "hidden"; el.appendChild(c); S.put(c, 160, 100);
        var cx = (i + 0.5) / cols - 0.5, cy = (j + 0.5) / rows - 0.5, a = Math.atan2(cy * 0.7, cx), sp = 110 + ((i * 7 + j * 3) % 5) / 4 * 70;
        tiles.push({ c: c, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 60, rot: (i + j) % 2 ? 3.5 : -3.5, ox: (i + 0.5) * W / cols, oy: (j + 0.5) * Hh / rows });
      }
      return MW.drive(tl, at, o.nextAt + 0.6, function (t) {
        var broke = t >= o.breakAt, jit = t >= o.crackAt && !broke ? (Math.floor(t * 40) % 2 ? 1 : -1) * k : 0;
        panel.style.visibility = broke ? "hidden" : "visible"; gsap.set(panel, { x: jit });
        S.clear();
        if (t >= o.crackAt && !broke) {
          var f = out(Math.min(1, (t - o.crackAt) / 0.3)); ctx.strokeStyle = "#0b0d12"; ctx.lineWidth = 2;
          [[133.3, 55, 133.3, 55 + 90 * f], [186.7, 145, 186.7, 145 - 90 * f], [80, 100, 80 + 160 * f, 100]].forEach(function (l) { ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); ctx.stroke(); });
        }
        tiles.forEach(function (q) {
          var d = t - o.breakAt; q.c.style.visibility = d >= 0 && d < 0.85 ? "visible" : "hidden"; if (d < 0) return;
          var u = Math.min(1, d / 0.85); q.c.style.transformOrigin = q.ox + "px " + q.oy + "px";
          gsap.set(q.c, { x: q.vx * d * k, y: (q.vy * d + 260 * d * d) * k, rotation: q.rot * d * 57.3, scale: 1 - 0.3 * u }); q.c.style.opacity = String(1 - u);
        });
        var v = Math.max(0, Math.min(1, (t - o.nextAt) / 0.4)); gsap.set(next, { scale: 0.85 + 0.15 * bk(v) }); next.style.opacity = String(Math.min(1, v * 2));
        if (ul) ul.style.width = (140 * k * out(Math.max(0, Math.min(1, (t - o.nextAt - 0.15) / 0.4)))) + "px";
      });
    },
    options: { crackAt: "s (0.55)", breakAt: "s (0.95)", nextAt: "s the next title pops (1.85)" },
    defaults: { crackAt: 0.55, breakAt: 0.95, nextAt: 1.85 },
    demo: { ...G(`<div class="pn" style="width:800px;height:450px;border-radius:40px;background:linear-gradient(160deg,#a693ff,#6a4cf0);display:grid;place-items:center;font-size:110px;font-weight:900">GIAI ĐOẠN 1</div>
<div class="nx w" style="font-size:150px;opacity:0">GIAI ĐOẠN 2</div><div class="nxu" style="height:12px;border-radius:6px;background:#ffd23d;width:0"></div>`, ".pn-tile { pointer-events: none; }"), run: run("effectPanelTileShatter"), duration: 3 },
  }),

  T("background/speed-lines-tunnel", {
    kind: "block",
    uses: ["drive", "rand", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), ctx = S.ctx, w = el.querySelector(".w"), r = MW.rand(o.seed), io = gsap.parseEase("power2.inOut"), L = [];
      for (var i = 0; i < o.lines; i++) L.push({ a: (i / o.lines) * 2 * Math.PI + (r() * 2 - 1) * 0.06, ph: r(), acc: i % 6 === 0 });
      if (w) S.put(w, 160, 100);
      var v = function (t) { return 0.2 + 0.8 * (io(Math.max(0, Math.min(1, (t - 0.3) / 0.8))) - io(Math.max(0, Math.min(1, (t - 3.2) / 0.7)))); };
      var dt = 1 / 120, tot = 0; for (var s = 0; s < o.loop; s += dt) tot += v(s) * dt; var c = o.cycles / tot;
      return MW.drive(tl, at, o.loop, function (t) {
        var ph = 0; for (var s = 0; s < t; s += dt) ph += v(s) * dt * c; var vv = v(t);
        S.clear();
        L.forEach(function (l) {
          var u = (ph + l.ph) % 1, R = 16 + 190 * u * u, len = (6 + 70 * vv) * u * u + 3;
          ctx.globalAlpha = Math.min(1, 3 * u) * (0.4 + 0.6 * vv); ctx.strokeStyle = l.acc ? "#8b7bff" : "#8f9ab3"; ctx.lineWidth = 0.8 + 2.2 * u; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(160 + R * Math.cos(l.a), 100 + R * Math.sin(l.a)); ctx.lineTo(160 + (R + len) * Math.cos(l.a), 100 + (R + len) * Math.sin(l.a)); ctx.stroke();
        });
        ctx.globalAlpha = 1; ctx.fillStyle = "#e8ebf3"; ctx.beginPath(); ctx.arc(160, 100, 3, 0, 2 * Math.PI); ctx.fill();
        if (w) gsap.set(w, { scale: 1 + 0.08 * vv, x: vv > 0.9 ? (Math.floor(t * 30) % 2 ? 0.75 : -0.75) * S.k : 0 });
      });
    },
    options: { lines: "radial lines (40), every 6th in the accent", cycles: "passes per loop (6)", loop: "s of the loop (4.2): speed ramps up 0.3-1.1 s and down 3.2-3.9 s", seed: "angles and phases" },
    defaults: { lines: 40, cycles: 6, loop: 4.2, seed: 11 },
    demo: { ...G(`<div class="w" style="font-size:150px;color:#fff;z-index:2">LAO TỚI</div>`, ".gm .w { position: absolute; z-index: 2; }"), run: run("backgroundSpeedLinesTunnel"), duration: 4.2 },
  }),

  T("effect/parry-freeze-sparks", {
    uses: ["drive", "rand", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), ctx = S.ctx, inn = gsap.parseEase("power2.in"), out = gsap.parseEase("power2.out"), ex = gsap.parseEase("expo.out"), r = MW.rand(o.seed), sp = [];
      for (var i = 0; i < o.sparks; i++) sp.push({ a: -Math.PI / 2 + (-1.28 + 2.56 * i / (o.sparks - 1)) + (r() * 2 - 1) * 0.1, v: 90 + r() * 60 });
      var c = o.contactAt, f = o.freeze;
      var blade = function (px, ang, dir) { ctx.save(); ctx.translate(px, 150); ctx.rotate(dir * ang); ctx.fillStyle = "#c9d2ea"; ctx.fillRect(-3, -96, 6, 96); ctx.fillStyle = "#ffd23d"; ctx.fillRect(-10, -4, 20, 8); ctx.fillStyle = "#6a4cf0"; ctx.fillRect(-3, 0, 6, 20); ctx.restore(); };
      return MW.drive(tl, at, c + f + 1.2, function (t) {
        S.clear();
        var ang = t < 0.25 ? -0.35 : t < c ? -0.35 + (0.785 + 0.35) * inn((t - 0.25) / (c - 0.25)) : t < c + f ? 0.785 : (function () { var d = t - c - f; return 0.785 + (-0.62 - 0.785) * ex(Math.min(1, d / 0.45)) + 0.08 * Math.exp(-6 * d) * Math.sin(30 * d); })();
        blade(100, ang, 1); blade(220, ang, -1);
        if (t >= c && t < c + f + 0.35) {
          var d0 = t - c, g = out(Math.min(1, d0 / 0.12)), L = 6 + 144 * g, sc = t < c + f ? 1 : 1 - (t - c - f) / 0.35, cx = 160, cy = 150 - 96 * Math.cos(0.785) + 0;
          ctx.strokeStyle = "#e8ebf3"; ctx.lineWidth = 1.5; ctx.globalAlpha = sc; [-6, 6].forEach(function (dy) { ctx.beginPath(); ctx.moveTo(cx - L, cy + dy); ctx.lineTo(cx + L, cy + dy); ctx.stroke(); });
          ctx.fillStyle = "#ffd23d"; ctx.beginPath(); for (var j = 0; j < 8; j++) { var a = j * Math.PI / 4, rr = j % 2 ? 4 * sc : 18 * sc; ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); } ctx.fill(); ctx.globalAlpha = 1;
        }
        var ds = t - c - f;
        if (ds > 0 && ds < 0.6) sp.forEach(function (s) { var x = 160 + s.v * Math.cos(s.a) * ds, y = 82 + s.v * Math.sin(s.a) * ds + 200 * ds * ds, vx = s.v * Math.cos(s.a), vy = s.v * Math.sin(s.a) + 400 * ds, m = Math.hypot(vx, vy) || 1;
          ctx.globalAlpha = 1 - ds / 0.6; ctx.strokeStyle = "#ffd23d"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx / m * 6, y - vy / m * 6); ctx.stroke(); });
        ctx.globalAlpha = 1;
      });
    },
    options: { contactAt: "s (0.62)", freeze: "s time stands still (0.3)", sparks: "sparks (9), fanning ±73° upward, 400 units/s² gravity", seed: "spark spread" },
    defaults: { contactAt: 0.62, freeze: 0.3, sparks: 9, seed: 2 },
    demo: { ...G(`<div class="lab" style="position:absolute;left:0;right:0;top:120px;text-align:center;font-size:120px;color:#fff;font-weight:900">ĐỠ</div>`), run: run("effectParryFreezeSparks"), duration: 2.4 },
  }),

  T("effect/element-burst", {
    uses: ["drive", "spring", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), ctx = S.ctx, inq = gsap.parseEase("power1.in"), out = gsap.parseEase("power2.out"), inn = gsap.parseEase("power2.in"), sp = MW.spring(300, 14), dots = [];
      for (var i = 0; i < 20; i++) dots.push({ a: (i / 20) * 2 * Math.PI, R: 62 + ((i * 7) % 10) / 9 * 26, c: i % 2 ? o.colors[1] : o.colors[0] });
      var star = function (x, y, r, rot) { ctx.beginPath(); for (var j = 0; j < 10; j++) { var a = rot + j * Math.PI / 5 - Math.PI / 2, rr = j % 2 ? r * 0.45 : r; ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } ctx.closePath(); ctx.fill(); };
      return MW.drive(tl, at, o.outAt + 0.4, function (t) {
        S.clear(); var fade = t > o.outAt ? 1 - inn(Math.min(1, (t - o.outAt) / 0.4)) : 1; ctx.globalAlpha = fade;
        if (t >= o.chargeAt && t < o.burstAt) {
          var u = (t - o.chargeAt) / (o.burstAt - o.chargeAt), R = 36 - 30 * inq(u);
          [0, Math.PI].forEach(function (ph, i) { ctx.fillStyle = o.colors[i]; ctx.beginPath(); ctx.arc(160 + R * Math.cos(9 * t + ph), 100 + R * 0.7 * Math.sin(9 * t + ph), 4, 0, 2 * Math.PI); ctx.fill(); });
          ctx.fillStyle = "#e8ebf3"; star(160, 100, 8 + 6 * u, 2 * t);
        }
        var d = t - o.burstAt;
        if (d >= 0) {
          var q = out(Math.min(1, d / 0.9));
          dots.forEach(function (p) { var x = 160 + p.R * q * Math.cos(p.a), y = 100 + p.R * 0.82 * q * Math.sin(p.a), s = 4.5 - 2 * q;
            if (q < 1) { ctx.strokeStyle = p.c; ctx.globalAlpha = fade * 0.4 * (1 - q); ctx.lineWidth = s; ctx.beginPath(); ctx.moveTo(160 + p.R * q * 0.6 * Math.cos(p.a), 100 + p.R * 0.82 * q * 0.6 * Math.sin(p.a)); ctx.lineTo(x, y); ctx.stroke(); }
            ctx.globalAlpha = fade; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(x, y, s, 0, 2 * Math.PI); ctx.fill(); });
          if (d < 0.4) { var g = out(d / 0.4); ctx.globalAlpha = fade * (1 - g); ctx.strokeStyle = "#e8ebf3"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(160, 100, 10 + 40 * g, 0, 2 * Math.PI); ctx.stroke(); }
          ctx.globalAlpha = fade; ctx.fillStyle = "#e8ebf3"; star(160, 100, 14 * (1.6 + (1 - 1.6) * sp.at(d)), 2 * t);
        }
        ctx.globalAlpha = 1;
      });
    },
    options: { chargeAt: "s (0.2)", burstAt: "s (0.65)", colors: "the two elements' colours (ice, fire)", outAt: "s (3.5)" },
    defaults: { chargeAt: 0.2, burstAt: 0.65, colors: ["#5fd7ff", "#ff7a3d"], outAt: 3.5 },
    demo: { ...G(`<div class="lab" style="position:absolute;left:0;right:0;bottom:120px;text-align:center"><span style="color:#5fd7ff">Băng</span> · <span style="color:#ff7a3d">Lửa</span></div>`), run: run("effectElementBurst"), duration: 4 },
  }),

  T("motion/recoil-kick", {
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var out = gsap.parseEase("power2.out"), sp = MW.spring(220, 18), ring = o.muzzle ? MW.el(o.muzzle) : null, hm = o.marker ? MW.el(o.marker) : null, am = o.ammo ? MW.el(o.ammo) : null, io = gsap.parseEase("power2.inOut");
      return MW.drive(tl, at, o.shots[o.shots.length - 1] + 1, function (t) {
        var k = 0, n = 0, last = -9;
        o.shots.forEach(function (s) { var d = t - s; if (d < 0) return; n++; last = s; k += d < 0.05 ? out(d / 0.05) : 1 - sp.at(d - 0.05); });
        gsap.set(el, { x: o.kx * k, y: -o.ky * k, rotation: -o.kr * k });
        var d = t - last;
        if (ring) { var u = Math.min(1, d / 0.3); gsap.set(ring, { scale: 0.25 + 0.75 * io(u) }); ring.style.opacity = d >= 0 && d < 0.3 ? String(1 - u) : "0"; }
        if (hm) hm.style.opacity = d >= 0 && d < 0.15 ? "1" : "0";
        if (am) am.firstChild.nodeValue = o.ammoText + (o.ammoFrom - n);
      });
    },
    options: { shots: "seconds of each shot ([0.5, 1.2, 1.9])", kx: "px (20)", ky: "px up (45)", kr: "degrees (0.57)", muzzle: "the muzzle ring (in the world)", marker: "the hit marker on the crosshair", ammo: "the ammo readout", ammoText: "its label", ammoFrom: "rounds (30)" },
    defaults: { shots: [0.5, 1.2, 1.9], kx: 20, ky: 45, kr: 0.57, muzzle: null, marker: null, ammo: null, ammoText: "ĐẠN ", ammoFrom: 30 },
    notes: "Call it on the world group only: the HUD stays fixed.",
    demo: {
      duration: 3,
      css: `#demo { background: #0b0d12; color: #e8ebf3; font-family: Inter, sans-serif; overflow: hidden; }
.wd { position: absolute; inset: -80px; background: linear-gradient(180deg, #1c2550 0%, #2b2357 60%, #171a2e 60%, #10121f 100%); }
.wd .bld { position: absolute; bottom: 40%; width: 160px; background: #11142a; } .wd .mz { position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; margin: -60px; border-radius: 50%; border: 8px solid #ffd23d; opacity: 0; }
.hudc { position: absolute; inset: 60px; pointer-events: none; } .hudc i { position: absolute; width: 90px; height: 90px; border: 0 solid rgba(255,255,255,0.6); }
.hudc i:nth-child(1) { left: 0; top: 0; border-left-width: 6px; border-top-width: 6px; } .hudc i:nth-child(2) { right: 0; top: 0; border-right-width: 6px; border-top-width: 6px; }
.hudc i:nth-child(3) { left: 0; bottom: 0; border-left-width: 6px; border-bottom-width: 6px; } .hudc i:nth-child(4) { right: 0; bottom: 0; border-right-width: 6px; border-bottom-width: 6px; }
.xh { position: absolute; left: 50%; top: 50%; width: 80px; height: 80px; margin: -40px; } .xh b { position: absolute; background: #fff; } .xh .h { left: 0; right: 0; top: 37px; height: 6px; } .xh .v { top: 0; bottom: 0; left: 37px; width: 6px; }
.hm { position: absolute; left: 50%; top: 50%; width: 140px; height: 140px; margin: -70px; opacity: 0; background: linear-gradient(45deg, transparent 46%, #ff5d6c 46% 54%, transparent 54%), linear-gradient(-45deg, transparent 46%, #ff5d6c 46% 54%, transparent 54%); }
.ammo { position: absolute; right: 120px; bottom: 110px; font-size: 64px; font-weight: 900; letter-spacing: 0.04em; }`,
      html: `<div class="wd">${[180, 420, 700, 1020, 1300, 1600, 1850].map((x, i) => `<div class="bld" style="left:${x}px;height:${200 + (i * 97) % 260}px"></div>`).join("")}<div class="mz"></div></div>
<div class="hudc"><i></i><i></i><i></i><i></i></div><div class="xh"><b class="h"></b><b class="v"></b></div><div class="hm"></div><div class="ammo">ĐẠN 30</div>`,
      run: `MW.motionRecoilKick(q(".wd"), tl, 0, { muzzle: ".mz", marker: ".hm", ammo: ".ammo" });`,
    },
  }),

  T("motion/afterimage-dash", {
    uses: ["drive", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), body = el.querySelector(".bd"), k = S.k, ex = gsap.parseEase("expo.out"), copies = [], puffs = el.querySelectorAll(".puff");
      S.put(body, o.from, 138);
      var ctx = S.ctx; S.clear(); ctx.strokeStyle = "#3a4260"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, 152); ctx.lineTo(300, 152); ctx.stroke();
      for (var i = 0; i < 8; i++) { var c = body.cloneNode(true); c.className = "bd-copy"; c.style.boxShadow = "inset 0 0 0 " + (1.5 * k) + "px rgba(255,255,255,0.6)"; el.insertBefore(c, body); copies.push(c); }
      var X = function (d, dir) { var a = dir > 0 ? o.from : o.from + o.distance; return a + dir * o.distance * ex(Math.max(0, Math.min(1, d / o.duration))); };
      return MW.drive(tl, at, o.backAt + 1.4, function (t) {
        var back = t >= o.backAt, s0 = back ? o.backAt : o.at, dir = back ? -1 : 1, d = t - s0, x = t < o.at ? o.from : X(d, dir);
        var v = Math.abs(X(d + 0.005, dir) - X(d - 0.005, dir)) / 0.01, st = d > 0 && d < o.duration ? 1 + 0.5 * Math.min(1, v / 1600) : 1;
        var sq = d > 0.3 && d < 0.55 ? 0.15 * Math.exp(-10 * (d - 0.3)) * Math.sin(Math.PI * (d - 0.3) / 0.25) : 0;
        gsap.set(body, { x: (x - o.from) * k, scaleX: st * (1 + sq), scaleY: (1 / st) * (1 - sq), transformOrigin: "50% 100%" });
        copies.forEach(function (c, i) {
          var ci = i * 0.035, on = d >= ci && t >= o.at, fade = Math.max(0, Math.min(1, (d - (0.45 + 0.06 * i)) / 0.2));
          gsap.set(c, { x: (X(ci, dir) - o.from) * k }); c.style.opacity = on ? String((0.12 + 0.3 * i / 7) * (1 - fade)) : "0";
        });
        Array.prototype.forEach.call(puffs, function (p, i) { var u = (d - o.duration * 0.8) / 0.5; var px = x + (dir > 0 ? 14 : -14) * (i ? 1 : 0.5); S.put(p, px, 150); gsap.set(p, { scale: u > 0 && u < 1 ? 0.5 + u : 0, x: (i ? 1 : -1) * 18 * k * Math.max(0, u) }); p.style.opacity = u > 0 && u < 1 ? String(1 - u) : "0"; });
      });
    },
    options: { at: "s of the dash (0.5)", backAt: "s of the dash back (2.5)", from: "units, start x of 320 (60)", distance: "units (200)", duration: "s, expo.out (0.35)" },
    defaults: { at: 0.5, backAt: 2.5, from: 60, distance: 200, duration: 0.35 },
    demo: { ...G(`<div class="bd" style="width:140px;height:140px;border-radius:35px;background:linear-gradient(160deg,#a693ff,#6a4cf0)"></div><div class="puff" style="width:70px;height:40px;border-radius:50%;background:#8f9ab3;opacity:0"></div><div class="puff" style="width:70px;height:40px;border-radius:50%;background:#8f9ab3;opacity:0"></div>`, ".bd-copy { position: absolute; }"), run: run("motionAfterimageDash"), duration: 4 },
  }),

  T("text/slam-long-hold", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var inq = gsap.parseEase("power1.in"), ex = gsap.parseEase("expo.out"), inn = gsap.parseEase("power2.in"), rules = o.rules ? Array.prototype.slice.call(document.querySelectorAll(o.rules)) : [];
      return MW.drive(tl, at, o.outAt + 0.4, function (t) {
        var L = o.landAt, d = t - L, s = t < L - o.land ? o.from : t < L ? o.from + (1 - o.from) * inq((t - L + o.land) / o.land) : 1;
        var wob = d > 0 ? o.wobble * Math.exp(-14 * d) * Math.cos(34 * d) : 0, sh = d > 0 && d < 0.14 ? 12 * (1 - d / 0.14) : 0, out = t > o.outAt ? inn(Math.min(1, (t - o.outAt) / 0.35)) : 0;
        gsap.set(el, { scaleX: s * (1 + wob), scaleY: s * (1 - wob), x: sh * Math.sin(t * 190), y: sh * Math.cos(t * 160) });
        el.style.opacity = String(Math.min(1, Math.max(0, (t - L + o.land) / 0.08)) * (1 - out));
        rules.forEach(function (r, i) { var g = d > 0 ? ex(Math.min(1, d / 0.4)) : 0, f = t < 0.78 ? 1 : Math.max(0, 1 - (t - 0.78) / 0.4); gsap.set(r, { x: (i ? 1 : -1) * (o.gap + o.reach * g), scaleX: g }); r.style.opacity = d > 0 ? String(f) : "0"; });
      });
    },
    options: { landAt: "s of the contact (0.58)", from: "start scale (2.6)", land: "s of the slam, ease-in quad (0.18)", wobble: "squash at contact (0.14)", outAt: "s it leaves after the long hold (4.6)", rules: "selector of the two side rules", gap: "px from centre where the rules start (200)", reach: "px they grow outward (500)" },
    defaults: { landAt: 0.58, from: 2.6, land: 0.18, wobble: 0.14, outAt: 4.6, rules: null, gap: 200, reach: 500 },
    demo: { css: `#demo { background: radial-gradient(100% 100% at 50% 45%, #2a1f55, #0b0d12); font-family: Inter, sans-serif; } .vh { position: absolute; inset: 0; display: grid; place-items: center; }
.vw { font-size: 210px; font-weight: 900; color: #a99bff; letter-spacing: -0.02em; text-shadow: 0 0 50px rgba(139,123,255,0.5); } .rule { position: absolute; left: 50%; top: 50%; width: 300px; height: 10px; margin: -5px 0 0 -150px; background: #ffd23d; border-radius: 5px; opacity: 0; }`,
      html: `<div class="vh"><div class="rule"></div><div class="rule"></div><div class="vw">CHIẾN THẮNG</div></div>`, run: `MW.textSlamLongHold(q(".vw"), tl, 0, { rules: ".rule" });`, duration: 5.2 },
  }),

  T("effect/loot-light-beam", {
    kind: "block",
    uses: ["drive", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), ctx = S.ctx, gem = el.querySelector(".gem"), ex = gsap.parseEase("expo.out"), bo = gsap.parseEase("bounce.out"), inn = gsap.parseEase("power2.in"), gy = 150;
      return MW.drive(tl, at, o.retractAt + 0.4, function (t) {
        var u = Math.max(0, Math.min(1, (t - o.dropAt) / 0.5)), y = 30 + (gy - 12 - 30) * bo(u); S.put(gem, 160, y); gem.style.opacity = t >= o.dropAt ? "1" : "0";
        S.clear(); ctx.strokeStyle = "#3a4260"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(20, gy); ctx.lineTo(300, gy); ctx.stroke();
        var g = t < o.beamAt ? 0 : ex(Math.min(1, (t - o.beamAt) / 0.45)), top = 0;
        if (t > o.retractAt) top = inn(Math.min(1, (t - o.retractAt) / 0.35));
        if (g > 0 && top < 1) {
          var Hb = o.height * g, wv = 16 + 2 * Math.sin(8 * t), yTop = gy - Hb, yCut = yTop + Hb * top;
          var gr = ctx.createLinearGradient(0, gy, 0, gy - o.height); gr.addColorStop(0, "rgba(139,123,255,0.8)"); gr.addColorStop(1, "rgba(139,123,255,0)");
          ctx.fillStyle = gr; ctx.fillRect(160 - wv / 2, yCut, wv, gy - yCut);
          ctx.save(); ctx.shadowColor = "#d6ccff"; ctx.shadowBlur = 12; ctx.strokeStyle = "#f2eeff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(160, gy); ctx.lineTo(160, Math.max(yCut, gy - Hb * 0.75)); ctx.stroke(); ctx.restore();
          var rr = 20 + 4 * Math.sin(6 * t); ctx.strokeStyle = "#8b7bff"; ctx.lineWidth = 4; ctx.globalAlpha = 1 - top; ctx.beginPath(); ctx.ellipse(160, gy, rr, rr * 0.3, 0, 0, 2 * Math.PI); ctx.stroke();
          for (var i = 0; i < 10; i++) { var ph = ((t - o.beamAt) / 1.43 + i / 10) % 1, sy = gy - o.height * ph; if (sy < yCut) continue; ctx.globalAlpha = (1 - ph) * (1 - top); ctx.fillStyle = "#ffd23d"; ctx.beginPath(); ctx.arc(160 + 6 * Math.sin(i * 2.3 + t * 3), sy, 1.6, 0, 2 * Math.PI); ctx.fill(); }
          ctx.globalAlpha = 1;
        }
      });
    },
    options: { dropAt: "s (0.3)", beamAt: "s (0.9)", height: "units of the beam (140 of 200)", retractAt: "s (3.55)" },
    defaults: { dropAt: 0.3, beamAt: 0.9, height: 140, retractAt: 3.55 },
    demo: { ...G(`<div class="gem" style="width:120px;height:120px;transform:rotate(45deg);background:linear-gradient(135deg,#d6ccff,#8b7bff 50%,#4a33b8);border-radius:14px;opacity:0"></div>`), run: run("effectLootLightBeam"), duration: 4 },
  }),

  T("title/warning-stripe-slam", {
    kind: "block",
    uses: ["drive", "spring", "stage320"],
    fn: function (el, tl, at, o) {
      var S = MW.stage320(el), k = S.k, bands = el.querySelectorAll(".band"), w = el.querySelector(".w"), sp = MW.spring(380, 24), ex = gsap.parseEase("expo.out"), ei = gsap.parseEase("expo.in");
      S.put(bands[0], 160, 63); S.put(bands[1], 160, 133); S.put(w, 160, 98);
      var land = o.inAt + 0.22;
      return MW.drive(tl, at, o.exitAt + 0.3, function (t) {
        var p = t < o.inAt ? 0 : sp.at(t - o.inAt), off = (1 - p) * 360 * k, ex2 = t > o.exitAt ? ei(Math.min(1, (t - o.exitAt) / 0.28)) * 400 * k : 0, d = t - land;
        var sq = d > 0 ? 1 - 0.35 * Math.exp(-16 * d) : 1, sh = d > 0 && d < 0.12 ? 4 * k * (1 - d / 0.12) : 0;
        gsap.set(bands[0], { x: -off - ex2, scaleY: sq }); gsap.set(bands[1], { x: off + ex2, scaleY: sq });
        bands[0].style.backgroundPosition = (t * 18 * k) + "px 0"; bands[1].style.backgroundPosition = (-t * 18 * k) + "px 0";
        gsap.set(el, { x: sh * Math.sin(t * 200), y: sh * Math.cos(t * 170) });
        var u = Math.max(0, Math.min(1, (t - land - o.textDelay) / 0.18)); gsap.set(w, { scale: (1.3 - 0.3 * ex(u)) * (t > o.exitAt ? 1 - Math.min(1, (t - o.exitAt) / 0.28) : 1) }); w.style.opacity = String(Math.min(1, u * 3));
      });
    },
    options: { inAt: "s the bands rush in (0.3), spring k380 d24", textDelay: "s after landing that the word slams (0.12)", exitAt: "s (3.5)" },
    defaults: { inAt: 0.3, textDelay: 0.12, exitAt: 3.5 },
    demo: { ...G(`<div class="band"></div><div class="band"></div><div class="w" style="font-size:150px;color:#fff">NGUY HIỂM</div>`,
      `.band { width: 2600px; height: 100px; background: repeating-linear-gradient(-45deg, #ffd23d 0 45px, #111 45px 90px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }`), run: run("titleWarningStripeSlam"), duration: 4 },
  }),

  T("ui/shield-recharge-ring", {
    kind: "block",
    uses: ["drive", "spring"],
    fn: function (el, tl, at, o) {
      var arc = el.querySelector(".arc"), dot = el.querySelector(".hd"), pct = el.querySelector(".pct"), sh = el.querySelector(".shf"), fl = el.querySelector(".fl"), sp = MW.spring(300, 13), out = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut");
      var R = 250, C = 2 * Math.PI * R; arc.setAttribute("stroke-dasharray", C + " " + C);
      return MW.drive(tl, at, o.outAt + 0.4, function (t) {
        var u = Math.max(0, Math.min(1, (t - o.start) / o.sweep)), e = t > o.outAt ? 1 - io(Math.min(1, (t - o.outAt) / 0.35)) : 1, a = -Math.PI / 2 + u * 2 * Math.PI;
        arc.setAttribute("stroke-dashoffset", String(C * (1 - u))); dot.setAttribute("cx", 300 + R * Math.cos(a)); dot.setAttribute("cy", 300 + R * Math.sin(a)); dot.style.opacity = u > 0 && u < 1 ? "1" : "0";
        var done = t >= o.start + o.sweep, d = t - o.start - o.sweep;
        pct.firstChild.nodeValue = done ? o.label : Math.round(u * 100) + "%";
        gsap.set(sh, { scale: done ? sp.at(d) : 0, transformOrigin: "50% 50%" });
        var q = done ? out(Math.min(1, d / 0.5)) : 0; fl.setAttribute("r", 250 + 100 * q); fl.setAttribute("stroke-width", 20 - 18 * q); fl.style.opacity = done && d < 0.5 ? String(1 - q) : "0";
        el.style.opacity = String(e);
      });
    },
    options: { start: "s (0.4)", sweep: "s for one turn, linear (1.6)", label: "text when full", outAt: "s (3.6)" },
    defaults: { start: 0.4, sweep: 1.6, label: "ĐÃ BẬT", outAt: 3.6 },
    demo: {
      duration: 4,
      css: `#demo { background: radial-gradient(100% 100% at 50% 45%, #1a1f33, #0b0d12); font-family: Inter, sans-serif; color: #e8ebf3; } .shr { position: absolute; left: 660px; top: 190px; width: 600px; height: 600px; }
.pct { position: absolute; left: 0; right: 0; top: 640px; text-align: center; font-size: 64px; font-weight: 900; letter-spacing: 0.06em; }`,
      html: `<div class="shr"><svg viewBox="0 0 600 600" width="600" height="600"><circle cx="300" cy="300" r="250" fill="none" stroke="#2a3142" stroke-width="20"/>
<circle class="arc" cx="300" cy="300" r="250" fill="none" stroke="#8b7bff" stroke-width="20" stroke-linecap="round" transform="rotate(-90 300 300)"/><circle class="hd" cx="300" cy="50" r="16" fill="#f2eeff"/>
<path d="M300 150 L410 195 V300 C410 380 360 430 300 460 C240 430 190 380 190 300 V195 Z" fill="none" stroke="#6c778b" stroke-width="8" stroke-dasharray="18 14"/>
<path class="shf" d="M300 150 L410 195 V300 C410 380 360 430 300 460 C240 430 190 380 190 300 V195 Z" fill="#8b7bff"/><circle class="fl" cx="300" cy="300" r="250" fill="none" stroke="#d6ccff" stroke-width="20" style="opacity:0"/></svg>
<div class="pct">0%</div></div>`,
      run: `MW.uiShieldRechargeRing(q(".shr"), tl, 0, {});`,
    },
  }),

  T("text/stamp-punch", {
    uses: ["drive", "rand"],
    fn: function (el, tl, at, o) {
      var inq = gsap.parseEase("power1.in"), out = gsap.parseEase("power2.out"), page = o.page ? MW.el(o.page) : el.parentNode, r = MW.rand(o.seed), dots = [];
      for (var i = 0; i < 7; i++) { var d = document.createElement("i"), a = r() * 2 * Math.PI, R = 230 + r() * 90, s = 5 + r() * 10; d.style.cssText = "position:absolute;left:50%;top:50%;border-radius:50%;pointer-events:none;background:" + o.color + ";width:" + s + "px;height:" + s + "px;opacity:0;"; el.appendChild(d); dots.push({ d: d, x: R * Math.cos(a), y: R * 0.6 * Math.sin(a) }); }
      var hit = o.at + o.drop;
      return MW.drive(tl, at, o.fadeAt + 0.3, function (t) {
        var s = t < o.at ? o.from : t < hit ? o.from + (1 - o.from) * inq((t - o.at) / o.drop) : 1 - 0.06 * Math.exp(-18 * (t - hit)) * Math.cos(40 * (t - hit));
        var f = t > o.fadeAt ? 1 - Math.min(1, (t - o.fadeAt) / 0.3) : 1;
        gsap.set(el, { scale: s, rotation: o.tilt }); el.style.opacity = String(Math.min(1, Math.max(0, (t - o.at) / 0.1)) * f);
        var lift = Math.max(0, s - 1); el.style.filter = t < hit ? "drop-shadow(" + (10 + lift * 50) + "px " + (20 + lift * 70) + "px 0 rgba(0,0,0,0.35))" : "";
        var d = t - hit, sh = d > 0 && d < 0.14 ? 15 * (1 - d / 0.14) : 0; if (page) gsap.set(page, { x: sh * Math.sin(t * 190), y: sh * Math.cos(t * 170) });
        dots.forEach(function (p) { var q = d > 0 ? out(Math.min(1, d / 0.12)) : 0; gsap.set(p.d, { x: p.x * q, y: p.y * q }); p.d.style.opacity = d > 0 ? "1" : "0"; });
      });
    },
    options: { at: "s the stamp starts down (0.6)", from: "start scale (2.6)", drop: "s, ease-in quad (0.22)", tilt: "degrees (−12.6)", color: "ink colour", page: "the page that shakes (the stamp's parent)", seed: "ink dots", fadeAt: "s (3.6)" },
    defaults: { at: 0.6, from: 2.6, drop: 0.22, tilt: -12.6, color: "#8b7bff", page: null, seed: 4, fadeAt: 3.6 },
    demo: {
      duration: 4,
      css: `#demo { background: #0b0d12; font-family: Inter, sans-serif; } .pg { position: absolute; left: 560px; top: 120px; width: 800px; height: 840px; border-radius: 30px; background: #f4f1ea; padding: 70px 80px; box-sizing: border-box; color: #2a2a35; }
.pg h3 { margin: 0 0 40px; font-size: 54px; } .pg .it { display: flex; align-items: center; gap: 26px; font-size: 38px; margin: 26px 0; } .pg .it b { width: 44px; height: 44px; border-radius: 10px; border: 4px solid #8b7bff; display: grid; place-items: center; box-sizing: border-box; }
.pg .it b::after { content: ""; width: 10px; height: 20px; border: solid #8b7bff; border-width: 0 5px 5px 0; transform: rotate(45deg); margin-top: -6px; }
.stp { position: absolute; left: 50%; top: 58%; width: 480px; height: 190px; margin: -95px 0 0 -240px; border: 15px solid #8b7bff; border-radius: 22px; display: grid; place-items: center; color: #8b7bff; font-size: 66px; font-weight: 900; letter-spacing: 0.06em; opacity: 0; box-sizing: border-box; }
.stp::after { content: ""; position: absolute; inset: 18px; border: 5px solid #8b7bff; border-radius: 10px; }`,
      html: `<div class="pg"><h3>Nhiệm vụ hôm nay</h3><div class="it"><b></b>Viết kịch bản</div><div class="it"><b></b>Thu giọng đọc</div><div class="it"><b></b>Dựng phim</div><div class="stp">HOÀN THÀNH</div></div>`,
      run: `MW.textStampPunch(q(".stp"), tl, 0, { page: ".pg" });`,
    },
  }),

  T("text/split-halves-cut", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var html = el.innerHTML, A = document.createElement("span"), B = document.createElement("span"), line = document.createElement("div"), lab = o.label ? MW.el(o.label) : null;
      el.innerHTML = ""; el.style.position = "relative"; A.innerHTML = html; B.innerHTML = html; A.style.display = "block"; B.style.cssText = "display:block;position:absolute;left:0;top:0;width:100%;";
      A.style.clipPath = "inset(-0.4em -0.3em 50% -0.3em)"; B.style.clipPath = "inset(50% -0.3em -0.3em -0.3em)";
      line.style.cssText = "position:absolute;left:0;top:50%;height:" + o.line + "px;margin-top:-" + o.line / 2 + "px;background:" + o.color + ";pointer-events:none;"; el.appendChild(A); el.appendChild(B); el.appendChild(line);
      var ex = gsap.parseEase("expo.out"), ei = gsap.parseEase("expo.in"), io = gsap.parseEase("power2.inOut"), out = gsap.parseEase("power2.out");
      return MW.drive(tl, at, o.outAt + 0.4, function (t) {
        var W = el.offsetWidth, u = Math.max(0, Math.min(1, (t - o.at) / o.duration)), D = o.from * (1 - ex(u)), n = t > 0.9 ? 15 * Math.exp(-10 * (t - 0.9)) * Math.cos(30 * (t - 0.9)) : 0;
        var e = t > o.outAt ? ei(Math.min(1, (t - o.outAt) / 0.35)) * o.from : 0;
        gsap.set(A, { x: -D + n - e }); gsap.set(B, { x: D - n + e }); A.style.opacity = B.style.opacity = t < o.at ? "0" : "1";
        var h = io(Math.max(0, Math.min(1, (t - 0.85) / 0.2))), tl2 = out(Math.max(0, Math.min(1, (t - 0.85) / 0.35))), x0 = -0.05 * W + 1.1 * W * tl2 * 0.999, x1 = -0.05 * W + 1.1 * W * h;
        line.style.left = Math.min(x0, x1) + "px"; line.style.width = Math.max(0, x1 - x0) + "px"; line.style.opacity = t > 0.85 && x1 - x0 > 1 ? "1" : "0";
        if (lab) lab.style.opacity = String(Math.max(0, Math.min(1, (t - 1.1) / 0.3)) * (t > o.outAt ? 0 : 1));
      });
    },
    options: { at: "s (0.4)", duration: "s, expo.out (0.45)", from: "px each half starts away (1800, ~94 % of the frame)", line: "px of the slash along the seam (8)", color: "slash colour", label: "the small label (K.O.)", outAt: "s the halves fly apart (3.5)" },
    defaults: { at: 0.4, duration: 0.45, from: 1800, line: 8, color: "#8b7bff", label: null, outAt: 3.5 },
    demo: { css: `#demo { background: radial-gradient(100% 100% at 50% 45%, #2a1f55, #0b0d12); font-family: Inter, sans-serif; color: #fff; } .fc { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
.fcw { font-size: 230px; font-weight: 900; letter-spacing: -0.02em; margin: 0; } .ko { font-size: 60px; font-weight: 800; color: #ffd23d; letter-spacing: 0.2em; margin-top: 30px; opacity: 0; }`,
      html: `<div class="fc"><div><div class="fcw">KẾT LIỄU</div><div class="ko">K.O.</div></div></div>`, run: `MW.textSplitHalvesCut(q(".fcw"), tl, 0, { label: ".ko" });`, duration: 4 },
  }),
];

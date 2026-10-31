// Attention & Emphasis (batch 3.1): small moves that point at one thing, written here. Distances are film pixels (the small DOM demo × 3).
import { T } from "../../moworks/define.mjs";
import { ui, demo, CURSOR } from "../../moworks/stages.mjs";

const BELL = `<svg viewBox="0 0 48 48" width="150" height="150"><path d="M24 6c-7 0-12 5.5-12 12.5V27l-4 6h32l-4-6v-8.5C36 11.5 31 6 24 6z" fill="#ffd27a"/><circle cx="24" cy="38" r="4.5" fill="#ffb547"/></svg>`;
const SMILE = `<svg viewBox="0 0 48 48" width="130" height="130"><circle cx="24" cy="24" r="20" fill="#fff4cc"/><circle cx="17" cy="20" r="3" fill="#3a2a00"/><circle cx="31" cy="20" r="3" fill="#3a2a00"/><path d="M15 29 Q24 37 33 29" stroke="#3a2a00" stroke-width="3.2" fill="none" stroke-linecap="round"/></svg>`;

export default [
  T("motion/nudge", {
    uses: ["keys"],
    fn: function (el, tl, at, o) { return MW.keys(tl, el, at, { x: [[0, 0], [0.18, o.amp], [0.33, -o.back], [0.52, 0]] }); },
    options: { amp: "px to the side (27; 9 in the small demo)", back: "px of the counter-move (9)" }, defaults: { amp: 27, back: 9 },
    demo: demo(ui(`<div class="ui-card" style="width:900px"><p class="ui-h">Bước 2 trên 3</p><p class="ui-p">Chọn kiểu video rồi bấm Tiếp để đi tiếp.</p>
<div style="display:flex;gap:28px;margin-top:44px;justify-content:flex-end"><div class="ui-btn ghost">Bỏ qua</div><div class="ui-btn nx">Tiếp</div></div></div>`),
      `MW.motionNudge(q(".nx"), tl, 0.6, {}); MW.motionNudge(q(".nx"), tl, 1.9, {});`, 3),
  }),

  T("motion/attention-hop", {
    uses: ["drive", "keys"],
    fn: function (el, tl, at, o) {
      var sh = o.shadow ? MW.el(o.shadow) : null, sine = gsap.parseEase("sine.inOut"), H = o.height;
      var Y = [[0, 0], [0.26, -H], [0.43, H / 8], [0.62, 0]];
      gsap.set(el, { transformOrigin: "50% 100%" });
      return MW.drive(tl, at - 0.08, 0.7, function (s) {
        var t = s - 0.08, y = 0;
        for (var i = 1; i < Y.length; i++) if (t >= Y[i - 1][0] && t <= Y[i][0]) { y = Y[i - 1][1] + (Y[i][1] - Y[i - 1][1]) * sine((t - Y[i - 1][0]) / (Y[i][0] - Y[i - 1][0])); break; }
        // a small crouch around take-off (-80 .. +20 ms), a landing squash (360 .. 560 ms), volume kept: scaleX = 1 / scaleY
        var sy = 1;
        if (t >= -0.08 && t <= 0.02) sy -= 0.04 * Math.sin(Math.PI * (t + 0.08) / 0.1);
        if (t >= 0.36 && t <= 0.56) sy -= (1 - o.squash) * Math.sin(Math.PI * (t - 0.36) / 0.2);
        gsap.set(el, { y: y, scaleY: sy, scaleX: 1 / sy });
        if (sh) { var h = Math.max(0, -y) / H; gsap.set(sh, { scaleX: 1 - 0.35 * h, opacity: 1 - 0.5 * h }); }
      });
    },
    options: { height: "px of the hop (48; 16 in the small demo)", squash: "landing scaleY (0.92)", shadow: "the contact shadow under it (shrinks and fades with height)" },
    defaults: { height: 48, squash: 0.92, shadow: null },
    demo: demo(ui(`<div class="ui-card" style="display:flex;gap:70px;align-items:flex-end;padding:56px 80px">
<div style="width:120px;height:20px;border-radius:10px;background:#2a3142"></div><div style="width:120px;height:20px;border-radius:10px;background:#2a3142"></div>
<div style="position:relative;display:grid;justify-items:center"><div class="bell">${BELL}</div><div class="bsh" style="width:120px;height:18px;border-radius:50%;background:rgba(0,0,0,0.45);margin-top:6px"></div></div></div>`),
      `MW.motionAttentionHop(q(".bell"), tl, 0.7, { shadow: ".bsh" }); MW.motionAttentionHop(q(".bell"), tl, 2.0, { shadow: ".bsh" });`, 3),
  }),

  T("ui/corner-badge-pop", {
    uses: ["keys"],
    fn: function (el, tl, at, o) {
      var k = o.duration / 0.56;
      gsap.set(el, { transformOrigin: "50% 50%" });
      return MW.keys(tl, el, at, { scale: [[0, 0], [0.285 * k, o.peak], [0.43 * k, 0.95], [0.56 * k, 1]], rotation: [[0, o.rotation], [0.285 * k, 5], [0.43 * k, -2], [0.56 * k, 0]], opacity: [[0, 0], [0.285 * k, 1]] });
    },
    options: { duration: "s (0.56)", peak: "overshoot scale (1.2)", rotation: "starting angle (−18°)" }, defaults: { duration: 0.56, peak: 1.2, rotation: -18 },
    demo: demo(ui(`<div class="ui-card" style="width:620px;display:flex;align-items:center;gap:34px"><div class="ui-dot" style="width:110px;height:110px;border-radius:30px;background:#2a3350"></div>
<div><p class="ui-h">Hộp thư</p><p class="ui-p">Thư mới từ khách hàng</p></div>
<div class="bdg" style="position:absolute;right:-34px;top:-34px;width:96px;height:96px;border-radius:50%;background:#ff5d8f;color:#fff;display:grid;place-items:center;font-size:44px;font-weight:800;box-shadow:0 10px 24px rgba(255,93,143,.45)">3</div></div>`),
      `MW.uiCornerBadgePop(q(".bdg"), tl, 0.6, {});`, 2.4),
  }),

  T("effect/focus-halo", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = el.parentNode, rings = [], out = gsap.parseEase("power2.out");
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      [[o.stroke, 1, 0], [o.soft, 0.35, o.soft / 2]].forEach(function (r) {
        var d = document.createElement("div");
        d.style.cssText = "position:absolute;pointer-events:none;border-radius:50%;box-sizing:border-box;border:" + r[0] + "px solid " + o.color + ";filter:" + (r[2] ? "blur(" + r[2] / 2 + "px)" : "none") + ";";
        host.insertBefore(d, el); rings.push({ d: d, k: r[1] });
      });
      return MW.drive(tl, at, o.duration, function (t) {
        var u = t / o.duration, p = out(u), s = o.from + (o.to - o.from) * p, w = el.offsetWidth, h = el.offsetHeight;
        rings.forEach(function (r) {
          r.d.style.left = el.offsetLeft + "px"; r.d.style.top = el.offsetTop + "px"; r.d.style.width = w + "px"; r.d.style.height = h + "px";
          gsap.set(r.d, { scale: s }); r.d.style.opacity = u > 0 && u < 1 ? String(o.opacity * (1 - p) * r.k) : "0";
        });
        gsap.set(el, { scale: t < o.duration / 2 ? 1 + (o.bump - 1) * Math.sin(Math.PI * t / (o.duration / 2)) : 1 });
      });
    },
    options: { duration: "s (0.9), ease-out cubic", from: "ring start scale (0.75)", to: "ring end scale (1.9)", opacity: "ring start opacity (0.7)", stroke: "px (7.5)", soft: "px of the soft copy (30)", bump: "the subject's scale bump (1.04)", color: "ring colour" },
    defaults: { duration: 0.9, from: 0.75, to: 1.9, opacity: 0.7, stroke: 7.5, soft: 30, bump: 1.04, color: "#8b7bff" },
    demo: demo(ui(`<div style="display:flex;gap:120px;align-items:center;position:relative"><div class="ui-avatar grey">H</div><div class="ui-avatar av">M</div><div class="ui-avatar grey">T</div></div>`),
      `MW.effectFocusHalo(q(".av"), tl, 0.5, {}); MW.effectFocusHalo(q(".av"), tl, 1.7, {});`, 3),
  }),

  T("effect/highlight-sweep", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var band = document.createElement("div"), io = gsap.parseEase("power2.inOut");
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      el.style.overflow = "hidden";
      band.style.cssText = "position:absolute;top:-20%;bottom:-20%;pointer-events:none;width:" + o.width + "px;background:linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.95), rgba(255,255,255,0));";
      el.appendChild(band);
      return MW.drive(tl, at, o.duration, function (t) {
        var u = t / o.duration, W = el.offsetWidth, x = (o.from + (o.to - o.from) * io(u)) * W;
        gsap.set(band, { x: x - o.width / 2, skewX: o.skew }); band.style.opacity = u > 0 && u < 1 ? String(o.opacity * Math.sin(Math.PI * u)) : "0";
      });
    },
    options: { duration: "s (0.82)", width: "px of the band (96)", skew: "degrees (−18)", opacity: "peak, half-way (0.75)", from: "start, × the row width (−0.65)", to: "end (1.15)" },
    defaults: { duration: 0.82, width: 96, skew: -18, opacity: 0.75, from: -0.65, to: 1.15 },
    demo: demo(ui(`<div class="ui-card" style="width:980px"><p class="ui-h" style="margin-bottom:24px">Đơn hàng hôm nay</p>
<div class="ui-row"><div class="ui-dot"></div>Hà Nội · 12 đơn</div><div class="ui-row hl" style="background:#262448;border:3px solid #8b7bff;color:#fff"><div class="ui-dot" style="background:#8b7bff"></div>Đà Nẵng · 9 đơn · vừa cập nhật</div><div class="ui-row"><div class="ui-dot"></div>TP. Hồ Chí Minh · 21 đơn</div></div>`),
      `MW.effectHighlightSweep(q(".hl"), tl, 0.6, {}); MW.effectHighlightSweep(q(".hl"), tl, 1.9, {});`, 3),
  }),

  T("line/border-chase", {
    kind: "block",
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var NS = "http://www.w3.org/2000/svg", w = el.offsetWidth, h = el.offsetHeight, r = o.radius, P = 2 * (w + h) - 8 * r + 2 * Math.PI * r;
      var svg = document.createElementNS(NS, "svg"); svg.setAttribute("width", w + 40); svg.setAttribute("height", h + 40);
      svg.style.cssText = "position:absolute;left:-20px;top:-20px;pointer-events:none;overflow:visible;";
      if (getComputedStyle(el).position === "static") el.style.position = "relative";
      var dashes = [[0.26, 0.25, o.width * 0.67, 0], [0.16, 0.55, o.width * 0.83, 0], [0.08, 1, o.width, o.glow]].map(function (d) {
        var rc = document.createElementNS(NS, "rect");
        rc.setAttribute("x", 20); rc.setAttribute("y", 20); rc.setAttribute("width", w); rc.setAttribute("height", h); rc.setAttribute("rx", r); rc.setAttribute("fill", "none");
        rc.setAttribute("stroke", o.color); rc.setAttribute("stroke-width", d[2]); rc.setAttribute("stroke-linecap", "round"); rc.setAttribute("opacity", d[1]);
        if (d[3]) rc.style.filter = "drop-shadow(0 0 " + d[3] / 2 + "px " + o.color + ")";
        rc.setAttribute("stroke-dasharray", d[0] * P + " " + (1 - d[0]) * P); svg.appendChild(rc); return { rc: rc, len: d[0] * P };
      });
      el.appendChild(svg);
      return MW.drive(tl, at, o.lap * o.laps, function (t) {
        // every dash ends at the same head, which runs clockwise from the top-left corner's end
        var head = (t / o.lap) * P; dashes.forEach(function (d) { d.rc.setAttribute("stroke-dashoffset", String(d.len - head)); });
      });
    },
    options: { lap: "s per lap, linear (1)", laps: "laps (3)", radius: "px, the card's corner radius (36)", width: "px of the brightest dash (6)", glow: "px glow (20)", color: "colour" },
    defaults: { lap: 1, laps: 3, radius: 36, width: 6, glow: 20, color: "#a99bff" },
    demo: demo(ui(`<div style="display:flex;gap:56px"><div class="ui-card" style="width:400px;height:300px"><p class="ui-h">Cơ bản</p><p class="ui-p">5 dự án</p></div>
<div class="ui-card sel" style="width:400px;height:300px;border-color:#3a3566"><p class="ui-h">Chuyên nghiệp</p><p class="ui-p">Không giới hạn</p></div>
<div class="ui-card" style="width:400px;height:300px"><p class="ui-h">Studio</p><p class="ui-p">Cả nhóm</p></div></div>`),
      `MW.lineBorderChase(q(".sel"), tl, 0, { laps: 3 });`, 3),
  }),

  T("ui/press-feedback", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var out = gsap.parseEase("power2.out"), down = o.down, hold = 0.06, up = o.up;
      return MW.drive(tl, at, down + hold + up, function (t) {
        var k = t < down ? out(t / down) : t < down + hold ? 1 : 1 - out((t - down - hold) / up), d = o.depth * (1 - (1 - o.shadow) * k);
        gsap.set(el, { scale: 1 - (1 - o.scale) * k, y: (o.depth - d) });
        el.style.boxShadow = "0 " + d + "px 0 " + o.slab + ", 0 " + (d * 2.5) + "px " + (d * 4) + "px rgba(0,0,0," + (0.45 * (1 - 0.75 * k)) + ")";
      });
    },
    options: { scale: "pressed scale (0.94)", down: "s to press, ease-out (0.12)", up: "s back (0.3)", depth: "px of the slab under the button (18)", shadow: "slab and shadow while pressed, × (0.25)", slab: "slab colour" },
    defaults: { scale: 0.94, down: 0.12, up: 0.3, depth: 18, shadow: 0.25, slab: "#4a33b8" },
    demo: demo(ui(`<div class="ui-btn pb" style="width:396px;height:138px;border-radius:42px;font-size:44px;box-shadow:0 18px 0 #4a33b8, 0 45px 72px rgba(0,0,0,0.45)">Xác nhận</div>${CURSOR}`),
      `var c = q(".ui-cursor"); tl.fromTo(c, { x: 1300, y: 760 }, { x: 1000, y: 560, duration: 0.45, ease: "power2.inOut", immediateRender: true }, 0.4);
tl.to(c, { scale: 0.9, duration: 0.08, yoyo: true, repeat: 1 }, 0.9);
MW.uiPressFeedback(q(".pb"), tl, 0.9, {});
tl.to(c, { scale: 0.9, duration: 0.08, yoyo: true, repeat: 1 }, 2.0); MW.uiPressFeedback(q(".pb"), tl, 2.0, {});`, 3),
  }),

  T("motion/jelly-emphasis", {
    uses: ["keys"],
    fn: function (el, tl, at, o) {
      var sx = [[0, 1], [0.26, 1.25], [0.43, 0.88], [0.59, 1.06], [0.76, 1]], sy = [[0, 1], [0.26, 0.78], [0.43, 1.12], [0.59, 0.96], [0.76, 1]];
      gsap.set(el, { transformOrigin: "50% 100%" });
      if (o.shadow) MW.keys(tl, MW.el(o.shadow), at, { scaleX: sx });
      return MW.keys(tl, el, at, { scaleX: sx, scaleY: sy });
    },
    options: { shadow: "the contact shadow (its width follows scaleX)" }, defaults: { shadow: null },
    demo: demo(ui(`<div style="position:relative;display:grid;justify-items:center"><div class="jel" style="width:300px;height:260px;border-radius:90px 90px 46px 46px;background:linear-gradient(170deg,#9af2ff,#2bb7e6);position:relative">
<div style="position:absolute;left:80px;top:96px;width:30px;height:42px;border-radius:15px;background:#0b2a3a"></div><div style="position:absolute;right:80px;top:96px;width:30px;height:42px;border-radius:15px;background:#0b2a3a"></div></div>
<div class="jsh" style="width:320px;height:30px;border-radius:50%;background:rgba(0,0,0,0.45);margin-top:-6px"></div></div>`),
      `MW.motionJellyEmphasis(q(".jel"), tl, 0.5, { shadow: ".jsh" }); MW.motionJellyEmphasis(q(".jel"), tl, 1.8, { shadow: ".jsh" });`, 3),
  }),

  T("motion/color-pulse", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var bg = gsap.utils.interpolate(o.from, o.to), bd = gsap.utils.interpolate(o.borderFrom, o.borderTo), tx = gsap.utils.interpolate(o.textFrom, o.textTo);
      return MW.drive(tl, at, o.duration, function (t) {
        var k = Math.sin(Math.PI * Math.min(1, t / o.duration));
        el.style.backgroundColor = bg(k); el.style.borderColor = bd(k); el.style.color = tx(k);
      });
    },
    options: { duration: "s (0.76): blue → green → blue as one bump", from: "background (#294c68)", to: "background at the peak (#337b60)", borderFrom: "#6499bd", borderTo: "#a6efd0", textFrom: "#c4deed", textTo: "#e4fff3" },
    defaults: { duration: 0.76, from: "#294c68", to: "#337b60", borderFrom: "#6499bd", borderTo: "#a6efd0", textFrom: "#c4deed", textTo: "#e4fff3" },
    demo: demo(ui(`<div class="ui-pill cp" style="background:#294c68;border:4px solid #6499bd;color:#c4deed">TRẠNG THÁI: ĐANG XỬ LÝ</div>`),
      `MW.motionColorPulse(q(".cp"), tl, 0.5, {}); MW.motionColorPulse(q(".cp"), tl, 1.7, {});`, 3),
  }),

  T("motion/icon-nod", {
    uses: ["keys"],
    fn: function (el, tl, at, o) {
      gsap.set(el, { transformOrigin: "50% 12%" });
      return MW.keys(tl, el, at, { rotation: [[0, 0], [0.22, o.angle], [0.44, -o.back], [0.62, 0]] });
    },
    options: { angle: "degrees of the nod (16)", back: "degrees of the counter-swing (5)" }, defaults: { angle: 16, back: 5 },
    demo: demo(ui(`<div class="ui-icon nod" style="width:260px;height:260px;border-radius:64px">${SMILE}</div>`),
      `MW.motionIconNod(q(".nod"), tl, 0.6, {}); MW.motionIconNod(q(".nod"), tl, 1.8, {});`, 3),
  }),

  T("effect/spotlight-focus", {
    uses: ["drive"],
    fn: function (el, tl, at, o) {
      var host = o.context ? MW.el(o.context) : el.parentNode, shade = document.createElement("div"), ring = document.createElement("div"), out = gsap.parseEase("power2.out"), io = gsap.parseEase("power2.inOut");
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      shade.style.cssText = "position:absolute;inset:-400px;pointer-events:none;z-index:4;opacity:0;";
      ring.style.cssText = "position:absolute;pointer-events:none;z-index:6;border-radius:50%;box-sizing:border-box;border:" + o.ring + "px solid " + o.color + ";opacity:0;";
      host.appendChild(shade); host.appendChild(ring);
      el.style.position = el.style.position || "relative"; el.style.zIndex = "5";
      var end = o.duration + (o.hold == null ? 0 : o.hold + 0.4);
      return MW.drive(tl, at, end, function (t) {
        var cx = el.offsetLeft + el.offsetWidth / 2 + 400, cy = el.offsetTop + el.offsetHeight / 2 + 400, r0 = Math.hypot(el.offsetWidth, el.offsetHeight) / 2 * o.hole, r1 = r0 * 1.33;
        var k = t < o.duration ? out(t / o.duration) : o.hold == null || t < o.duration + o.hold ? 1 : 1 - io((t - o.duration - o.hold) / 0.4);
        shade.style.background = "radial-gradient(circle at " + cx + "px " + cy + "px, rgba(8,9,14,0) " + r0 + "px, rgba(8,9,14,1) " + r1 + "px)";
        shade.style.opacity = String(o.dim * k);
        var rr = r0 * (1.38 - 0.28 * Math.min(1, out(t / o.duration)));
        ring.style.left = (cx - 400 - rr) + "px"; ring.style.top = (cy - 400 - rr) + "px"; ring.style.width = ring.style.height = 2 * rr + "px"; ring.style.opacity = String(k);
      });
    },
    options: { duration: "s (0.6), ease-out", dim: "shade opacity (0.86)", hole: "the clear hole's radius, × half the subject's diagonal (1); full shade at 1.33 ×", ring: "px of the accent ring (4.5)", hold: "s before the shade lifts (1.3; null keeps it)", color: "ring colour", context: "the element the shade covers (the subject's parent)" },
    defaults: { duration: 0.6, dim: 0.86, hole: 1, ring: 4.5, hold: 1.3, color: "#8b7bff", context: null },
    demo: demo(ui(`<div class="wall" style="display:grid;grid-template-columns:repeat(3,330px);gap:36px">${Array.from({ length: 9 }, (_, i) => `<div class="ui-card${i === 4 ? " fc" : ""}" style="height:210px;padding:30px 36px${i === 4 ? ";background:#262448;border-color:#8b7bff" : ""}"><p class="ui-h" style="font-size:36px">${["Kịch bản", "Giọng đọc", "Nhạc nền", "Phân cảnh", "Dựng phim", "Màu sắc", "Phụ đề", "Kiểm tra", "Xuất file"][i]}</p><p class="ui-p">Bước ${i + 1}</p></div>`).join("")}</div>`),
      `MW.effectSpotlightFocus(q(".fc"), tl, 0.5, {});`, 3.2),
  }),

  T("motion/error-shake", {
    uses: ["keys", "drive"],
    fn: function (el, tl, at, o) {
      var msg = o.message ? MW.el(o.message) : null, badge = o.badge ? MW.el(o.badge) : null, a = o.amp / 12;
      MW.drive(tl, at, 0.55, function (t) {
        var k = Math.min(1, t / 0.12);
        el.style.borderColor = t > 0 ? gsap.utils.interpolate(o.base, o.color, k) : o.base; el.style.borderWidth = (o.width + (o.widthError - o.width) * k) + "px";
        if (badge) { badge.style.opacity = String(k); gsap.set(badge, { scale: 0.6 + 0.4 * k }); }
        if (msg) { var m = Math.max(0, Math.min(1, (t - 0.3) / 0.25)); msg.style.opacity = String(m); gsap.set(msg, { y: -o.slide * (1 - m) }); }
      });
      return MW.keys(tl, el, at, { x: [[0, 0], [0.09, -12 * a], [0.2, 10 * a], [0.31, -6 * a], [0.42, 4 * a], [0.54, 0]] });
    },
    options: { amp: "px of the first swing (36; 12 in the small demo), then 10 / 6 / 4 in proportion", color: "error outline colour", base: "outline colour before", width: "px before (3)", widthError: "px in error (5)", message: "the error line (fades in sliding down)", badge: "the ! badge", slide: "px the message slides (12)" },
    defaults: { amp: 36, color: "#ff5d6c", base: "#36405a", width: 3, widthError: 5, message: null, badge: null, slide: 12 },
    demo: demo(ui(`<div class="ui-card" style="width:900px"><p class="ui-h">Đăng nhập</p><p class="ui-p" style="margin-bottom:34px">Dùng email công ty của bạn</p>
<div class="ui-field ef" style="position:relative;width:100%">ten@congty<div class="eb" style="position:absolute;right:28px;width:56px;height:56px;border-radius:50%;background:#ff5d6c;color:#fff;display:grid;place-items:center;font-weight:800;opacity:0">!</div></div>
<div class="em" style="color:#ff8a94;font-size:30px;margin-top:16px;opacity:0">Email chưa đúng định dạng</div>
<div class="ui-btn lg" style="margin-top:30px;width:100%">Đăng nhập</div></div>${CURSOR}`),
      `var c = q(".ui-cursor"); tl.fromTo(c, { x: 1400, y: 900 }, { x: 1000, y: 760, duration: 0.45, ease: "power2.inOut", immediateRender: true }, 0.3);
tl.to(c, { scale: 0.9, duration: 0.08, yoyo: true, repeat: 1 }, 0.8);
MW.motionErrorShake(q(".ef"), tl, 0.85, { message: ".em", badge: ".eb" });`, 2.6),
  }),
];

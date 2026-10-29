// Magic UI smooth-cursor (apps/www/registry/magicui/smooth-cursor.tsx at efe76fc): a custom arrow cursor (upstream's 50 x 54 SVG at
// scale 0.5: black fill, white 2.258 px stroke, 8 % drop shadow) following the pointer on springs (x / y stiffness 400, damping 45, mass
// 1), turning to face where it travels (heading atan2(v) + 90°, updated above 0.1 px/ms and accumulated so it never jumps a turn; rotation
// spring 300 / 60) and dipping to scale 0.95 while it moves (back to 1 after 150 ms; spring 500 / 35). Port: the pointer becomes a
// scripted path [t, x, y]; velocity from the path, springs integrated at 240 Hz from the start, so every frame is exact.
export default {
  id: "smooth-cursor",
  kind: "motion",
  title: "Smooth Cursor",
  sub: "Con trỏ lướt mượt, xoay theo hướng đi",
  desc: "An arrow cursor glides between points on springs, turns to face where it travels and dips slightly while moving: the driver for 'a cursor uses the app' shots.",
  category: "Movement & loops",
  tags: ["cursor", "pointer", "path", "spring", "ui demo", "magicui"],
  source: { path: "apps/www/registry/magicui/smooth-cursor.tsx" },
  notes: "el is a layer over the scene (position absolute, inset 0); the cursor is drawn in it. path: [[t, x, y], ...] in s after `at` and px of el, linear between points (the springs smooth it). Any element can replace the arrow (put it inside el with class mw-sc-cursor).",
  options: { path: "[[t, x, y], ...]", springConfig: "{ stiffness: 400, damping: 45, mass: 1 }", scale: "cursor size (1)", fadeIn: "s (0.15)" },
  defaults: { path: [[0, 400, 300], [1.5, 1400, 700]], springConfig: { stiffness: 400, damping: 45, mass: 1 }, scale: 1, fadeIn: 0.15 },
  css: `.mw-smooth-cursor { position: absolute; inset: 0; pointer-events: none; z-index: 100; overflow: hidden; }
.mw-smooth-cursor > .mw-sc-cursor { position: absolute; left: 0; top: 0; will-change: transform; }`,
  markup: `<div class="mw-smooth-cursor"></div>`,
  fn: function (el, tl, at, o) {
    var cur = el.querySelector(".mw-sc-cursor");
    if (!cur) {
      cur = document.createElement("div"); cur.className = "mw-sc-cursor";
      cur.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="54" viewBox="0 0 50 54" fill="none" style="scale:0.5;display:block"><g filter="url(#mw-sc-shadow)">' +
        '<path d="M42.6817 41.1495L27.5103 6.79925C26.7269 5.02557 24.2082 5.02558 23.3927 6.79925L7.59814 41.1495C6.75833 42.9759 8.52712 44.8902 10.4125 44.1954L24.3757 39.0496C24.8829 38.8627 25.4385 38.8627 25.9422 39.0496L39.8121 44.1954C41.6849 44.8902 43.4884 42.9759 42.6817 41.1495Z" fill="black"/>' +
        '<path d="M43.7146 40.6933L28.5431 6.34306C27.3556 3.65428 23.5772 3.69516 22.3668 6.32755L6.57226 40.6778C5.3134 43.4156 7.97238 46.298 10.803 45.2549L24.7662 40.109C25.0221 40.0147 25.2999 40.0156 25.5494 40.1082L39.4193 45.254C42.2261 46.2953 44.9254 43.4347 43.7146 40.6933Z" stroke="white" stroke-width="2.25825"/></g>' +
        '<defs><filter id="mw-sc-shadow" x="0.602397" y="0.952444" width="49.0584" height="52.428" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/>' +
        '<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="2.25825"/><feGaussianBlur stdDeviation="2.25825"/>' +
        '<feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>' +
        '<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/></filter></defs></svg>';
      el.appendChild(cur);
    }
    var P = o.path, cw = 50, ch = 54;
    var at2 = function (t) {
      if (t <= P[0][0]) return [P[0][1], P[0][2]];
      for (var k = 1; k < P.length; k++) if (t <= P[k][0]) { var a = P[k - 1], b = P[k], f = (t - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
      return [P[P.length - 1][1], P[P.length - 1][2]];
    };
    var end = P[P.length - 1][0] + 1, dt = 1 / 240, N = Math.ceil(end / dt) + 1, X = new Float64Array(N), Y = new Float64Array(N), R = new Float64Array(N), S = new Float64Array(N);
    var sc = o.springConfig, p0 = at2(0), x = p0[0], y = p0[1], vx = 0, vy = 0, rot = 0, vr = 0, s = 1, vs = 0, acc = 0, prevA = 0, scaleTarget = 1, lastMove = -1;
    for (var i = 0; i < N; i++) {
      var t = i * dt, q = at2(t), q1 = at2(Math.max(0, t - 1 / 60)), mvx = (q[0] - q1[0]) * 60 / 1000, mvy = (q[1] - q1[1]) * 60 / 1000, sp = Math.sqrt(mvx * mvx + mvy * mvy);
      if (sp > 0.1) {                                    // px per ms, as upstream measures it
        var a = Math.atan2(mvy, mvx) * 180 / Math.PI + 90, d = a - prevA;
        if (d > 180) d -= 360; if (d < -180) d += 360;
        acc += d; prevA = a; scaleTarget = 0.95; lastMove = t;
      } else if (lastMove >= 0 && t - lastMove > 0.15) scaleTarget = 1;
      vx += ((sc.stiffness * (q[0] - x) - sc.damping * vx) / sc.mass) * dt; x += vx * dt;
      vy += ((sc.stiffness * (q[1] - y) - sc.damping * vy) / sc.mass) * dt; y += vy * dt;
      vr += ((300 * (acc - rot) - 60 * vr) / sc.mass) * dt; rot += vr * dt;
      vs += ((500 * (scaleTarget - s) - 35 * vs) / sc.mass) * dt; s += vs * dt;
      X[i] = x; Y[i] = y; R[i] = rot; S[i] = s;
    }
    var st = { t: 0 }, set = function () {
      var i = Math.max(0, Math.min(N - 1, Math.round(st.t / dt)));
      cur.style.transform = "translate(" + (X[i] - cw / 2) + "px, " + (Y[i] - ch / 2) + "px) rotate(" + R[i] + "deg) scale(" + S[i] * o.scale + ")";
      cur.style.opacity = Math.min(1, st.t / Math.max(0.001, o.fadeIn));
    };
    set();
    tl.fromTo(st, { t: 0 }, { t: end, duration: end, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + end;
  },
  demo: {
    duration: 6,
    css: `.ui { display: grid; grid-template-columns: repeat(3, 360px); gap: 50px; } .tile { height: 240px; border-radius: 28px; background: #18181b; border: 2px solid #27272a; display: grid; place-items: center; font-size: 40px; font-weight: 600; }`,
    html: `<div class="center"><div class="ui"><div class="tile">Dự án</div><div class="tile">Thư viện</div><div class="tile">Xuất video</div><div class="tile">Âm thanh</div><div class="tile">Phụ đề</div><div class="tile">Cài đặt</div></div></div><div class="mw-smooth-cursor"></div>`,
    run: `MW.smoothCursor(q(".mw-smooth-cursor"), tl, 0.2, { scale: 2.4, path: [[0, 300, 900], [0.8, 560, 400], [1.4, 560, 400], [2.2, 1360, 400], [2.8, 1360, 400], [3.6, 960, 690], [4.2, 960, 690], [5, 1500, 860]] });`,
  },
};

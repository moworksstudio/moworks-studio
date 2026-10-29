// Magic UI scroll-based-velocity (apps/www/registry/magicui/scroll-based-velocity.tsx at efe76fc): rows of big text moving endlessly
// (baseVelocity 5 = % of one copy's width per second; direction 1 left, -1 right; copies max(3, ceil(container / copy) + 2), wrapped);
// the page's scroll speed, smoothed by a spring (damping 50, stiffness 400), gives factor sign x min(5, |v| / 1000 x 5): the rows run
// 1 + |factor| times faster and follow the scroll's sign when |factor| > 0.1. Port: the scroll becomes authored speed keys (`scroll`,
// px/s of a virtual page) on the film's time; the same spring and integral are stepped once at 240 Hz, so any frame seeks exactly.
export default {
  id: "scroll-based-velocity",
  kind: "motion",
  title: "Scroll Based Velocity",
  sub: "Hàng chữ lớn chạy ngược chiều, tăng tốc",
  desc: "Rows of big text scrolling endlessly in opposite directions; bursts of speed (authored, like a scroll) make them race and can flip their direction.",
  category: "Text & titles",
  tags: ["marquee", "ticker", "big type", "speed", "band", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/scroll-based-velocity.tsx" },
  notes: "scroll: [[t, px/s], ...] relative to `at`, linear between keys (a page scrolled at 1000 px/s gives factor 5: six times the speed). Without keys the rows run at the base speed. Side fades as upstream's demo: 1/4 of the width.",
  options: { baseVelocity: "% of a copy per second (5)", direction: "1 left, -1 right (1)", scroll: "[[t, px/s], ...] (none)", hold: "seconds (8)" },
  defaults: { baseVelocity: 5, direction: 1, scroll: [], hold: 8 },
  uses: ["spring"],
  css: `.mw-scroll-based-velocity { width: 100%; overflow: hidden; white-space: nowrap; }
.mw-scroll-based-velocity > .mw-sv-track { display: inline-flex; align-items: center; will-change: transform; }
.mw-scroll-based-velocity .mw-sv-copy { display: inline-flex; flex-shrink: 0; align-items: center; }`,
  markup: `<div class="mw-scroll-based-velocity"><span class="mw-sv-copy">Moworks Studio · </span></div>`,
  fn: function (el, tl, at, o) {
    var copy = el.querySelector(".mw-sv-copy");
    if (!copy) { copy = document.createElement("span"); copy.className = "mw-sv-copy"; copy.textContent = el.textContent; el.textContent = ""; el.appendChild(copy); }
    var track = document.createElement("div"); track.className = "mw-sv-track"; el.insertBefore(track, copy); track.appendChild(copy);
    var bw = copy.getBoundingClientRect().width, cw = el.getBoundingClientRect().width, copies = Math.max(3, Math.ceil(cw / bw) + 2);
    for (var i = 1; i < copies; i++) { var c = copy.cloneNode(true); c.setAttribute("aria-hidden", "true"); track.appendChild(c); }
    // virtual scroll speed -> spring -> factor, integrated once at 240 Hz
    var keys = o.scroll || [], dt = 1 / 240, N = Math.ceil(o.hold / dt) + 1, X = new Float64Array(N);
    var vAt = function (t) { if (!keys.length) return 0; if (t <= keys[0][0]) return keys[0][1]; for (var k = 1; k < keys.length; k++) if (t <= keys[k][0]) { var a = keys[k - 1], b = keys[k]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); } return keys[keys.length - 1][1]; };
    var y = 0, vy = 0, x = 0, dir = o.direction, base = o.direction;
    for (var f = 0; f < N; f++) {
      X[f] = x;
      var target = vAt(f * dt);
      vy += (400 * (target - y) - 50 * vy) * dt; y += vy * dt;          // spring (mass 1) chasing the scroll speed
      var vf = (y < 0 ? -1 : 1) * Math.min(5, Math.abs(y) / 1000 * 5), av = Math.min(5, Math.abs(vf));
      if (av > 0.1) dir = base * (vf >= 0 ? 1 : -1);
      x += dir * (bw * o.baseVelocity / 100) * (1 + av) * dt;
    }
    var wrap = function (v) { return ((v % bw) + bw) % bw; };
    var s = { t: 0 };
    var draw = function () { var i = Math.max(0, Math.min(N - 1, Math.round(s.t / dt))); track.style.transform = "translateX(" + (-wrap(X[i])) + "px)"; };
    draw();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: draw, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    css: `.rows { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; gap: 30px; }
.mw-scroll-based-velocity { font-size: 150px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2; }
.fade { position: absolute; top: 0; bottom: 0; width: 25%; pointer-events: none; } .fade.l { left: 0; background: linear-gradient(to right, var(--bg), transparent); } .fade.r { right: 0; background: linear-gradient(to left, var(--bg), transparent); }`,
    html: `<div class="rows"><div class="mw-scroll-based-velocity r1"><span class="mw-sv-copy">Chuyển động có chủ đích&nbsp;·&nbsp;</span></div>
<div class="mw-scroll-based-velocity r2" style="color:#a78bfa"><span class="mw-sv-copy">Làm video nhanh hơn&nbsp;·&nbsp;</span></div></div><div class="fade l"></div><div class="fade r"></div>`,
    run: `var burst = [[0, 0], [2.4, 0], [2.8, 900], [3.6, 900], [4.0, 0], [5.6, 0], [5.9, -700], [6.6, -700], [6.9, 0]];
MW.scrollBasedVelocity(q(".r1"), tl, 0, { baseVelocity: 20, direction: 1, scroll: burst, hold: 8 });
MW.scrollBasedVelocity(q(".r2"), tl, 0, { baseVelocity: 20, direction: -1, scroll: burst, hold: 8 });`,
  },
};

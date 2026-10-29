// Magic UI orbiting-circles (apps/www/registry/magicui/orbiting-circles.tsx at efe76fc): children spread evenly on a ring (start angle
// 360 / n x i), each turning rotate(angle) translateY(radius px) rotate(-angle) -> +360°, so icons stay upright; duration 20 s / speed,
// linear, forever (reverse: the other way); an optional 1 px ring path at 10 % opacity. Port: the same transform, angle from the film's
// time.
export default {
  id: "orbiting-circles",
  kind: "motion",
  title: "Orbiting Circles",
  sub: "Biểu tượng bay quanh vòng quỹ đạo",
  desc: "Icons orbit a centre on a ring, evenly spaced and staying upright (one lap every 20 s), with a faint orbit line; stack rings for depth.",
  category: "Movement & loops",
  tags: ["orbit", "ring", "integrations", "icons", "loop", "magicui"],
  source: { path: "apps/www/registry/magicui/orbiting-circles.tsx" },
  notes: "el holds the orbiting children (each gets position absolute at the centre). The path ring is drawn behind them.",
  options: { radius: "px (160)", duration: "s per lap (20)", speed: "1", reverse: "false", iconSize: "px (30)", path: "true", pathColor: "rgba(255,255,255,0.1)", hold: "seconds (20)" },
  defaults: { radius: 160, duration: 20, speed: 1, reverse: false, iconSize: 30, path: true, pathColor: "rgba(255,255,255,0.1)", hold: 20 },
  css: `.mw-orbiting-circles { position: absolute; inset: 0; pointer-events: none; }
.mw-orbiting-circles > * { position: absolute; left: 50%; top: 50%; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
.mw-orbiting-circles > svg.mw-orbit-path { left: 0; top: 0; width: 100%; height: 100%; border-radius: 0; overflow: visible; }`,
  markup: `<div class="mw-orbiting-circles"><span>●</span><span>●</span><span>●</span></div>`,
  fn: function (el, tl, at, o) {
    var kids = Array.prototype.slice.call(el.children).filter(function (k) { return !k.classList.contains("mw-orbit-path"); });
    if (o.path) {
      var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg"); svg.setAttribute("class", "mw-orbit-path");
      var c = document.createElementNS(NS, "circle"); c.setAttribute("cx", "50%"); c.setAttribute("cy", "50%"); c.setAttribute("r", o.radius);
      c.setAttribute("fill", "none"); c.setAttribute("stroke", o.pathColor); c.setAttribute("stroke-width", "1"); svg.appendChild(c); el.insertBefore(svg, el.firstChild);
    }
    var D = o.duration / o.speed, dir = o.reverse ? -1 : 1;
    kids.forEach(function (k) { k.style.width = k.style.height = o.iconSize + "px"; k.style.margin = (-o.iconSize / 2) + "px 0 0 " + (-o.iconSize / 2) + "px"; });
    var s = { t: 0 };
    var set = function () {
      for (var i = 0; i < kids.length; i++) {
        var a = (360 / kids.length) * i + dir * 360 * (s.t / D);
        kids[i].style.transform = "rotate(" + a + "deg) translateY(" + o.radius + "px) rotate(" + -a + "deg)";
      }
    };
    set();
    tl.fromTo(s, { t: 0 }, { t: o.hold, duration: o.hold, ease: "none", onUpdate: set, immediateRender: false }, at);
    return at + o.hold;
  },
  demo: {
    duration: 8,
    css: `.stage { position: relative; width: 900px; height: 900px; }
.core { position: absolute; left: 50%; top: 50%; width: 150px; height: 150px; margin: -75px; border-radius: 40px; background: linear-gradient(135deg,#8b5cf6,#ec4899); display: grid; place-items: center; font-size: 80px; font-weight: 800; }
.dot { background: #18181b; border: 2px solid #3f3f46; } .dot svg { width: 58%; height: 58%; }`,
    html: `<div class="center"><div class="stage"><div class="core">M</div>
  <div class="mw-orbiting-circles outer">
    <span class="dot"><svg viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8"/></svg></span>
    <span class="dot"><svg viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2"><path d="M4 5h16v11H8l-4 4z"/></svg></span>
    <span class="dot"><svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/></svg></span>
    <span class="dot"><svg viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2"><path d="M3 12h4l3 7 4-14 3 7h4"/></svg></span>
    <span class="dot"><svg viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg></span>
  </div>
  <div class="mw-orbiting-circles inner">
    <span class="dot"><svg viewBox="0 0 24 24" fill="#a78bfa"><circle cx="12" cy="12" r="6"/></svg></span><span class="dot"><svg viewBox="0 0 24 24" fill="#38bdf8"><rect x="6" y="6" width="12" height="12" rx="3"/></svg></span>
    <span class="dot"><svg viewBox="0 0 24 24" fill="#f472b6"><path d="M12 4l8 14H4z"/></svg></span><span class="dot"><svg viewBox="0 0 24 24" fill="#facc15"><path d="m12 3 2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.7 6.4 20l1.5-6.3L3 9.5 9.4 9z"/></svg></span>
  </div></div></div>`,
    run: `MW.orbitingCircles(q(".outer"), tl, 0, { radius: 380, iconSize: 104, pathColor: "rgba(255,255,255,0.14)", hold: 8 });
MW.orbitingCircles(q(".inner"), tl, 0, { radius: 230, iconSize: 78, reverse: true, speed: 2, pathColor: "rgba(255,255,255,0.14)", hold: 8 });`,
  },
};

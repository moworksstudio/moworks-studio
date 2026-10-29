// The Projects intro: shown while there is no project yet, in place of the empty box's buttons
// (New project and Import project stay at the top right; in The Studio the pitch card on the left, so it passes its own `hint`). A five-second logo sting that shows what the app is for: motion graphics.
// Drawn here, nothing downloaded: the lockup is the studio's own outlined logo (glyphs.js), moved with the browser's Web Animations
// API, plus one canvas of sparks. With reduced motion the finished lockup shows at once. A click on the logo plays it again.
//
// 0.00-0.85  a scan line crosses the stage; the outlines of the shield and its M draw themselves while sparks fly in
//            (the badge must appear, not be there from frame 1)
// 0.85-1.15  the shapes fill, the outlines fade
// 1.15-1.45  the M punches: shock rings, a flash, a short shake, an accent echo, the sparks burst out
// 1.75-2.45  the badge settles to the left; MOWORKS rises letter by letter with an accent trail
// 2.60-3.50  "AI motion studio" focuses in under the lockup, letter by letter; an accent rule wipes under the name
// 3.35-4.05  a glint runs across the lockup; the hint comes up; the corner timecode stops at 00:00:05:00
// then        the hint keeps fading in and out to point at New project
//
// The badge sits on the same centre line as MOWORKS, and the line under the logo is "AI motion studio",
// centred below it (the logo file's "production studio" is not used).
import { useCallback, useLayoutEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { BADGE_M, BADGE_MATRIX, BADGE_RING, WORD } from "./glyphs.js";
import AiMark from "./AiMark.jsx";
import "./intro.css";

const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
const IN_OUT = "cubic-bezier(0.76, 0, 0.24, 1)";
const SLAM = "cubic-bezier(0.34, 1.45, 0.5, 1)";
// The lockup copies the top bar: badge box 46 units = 2rem, MOWORKS 1.05rem high, 0.625rem apart, both on
// one centre line (y 30). So MOWORKS (y 414.275-443.797 in the file) is scaled 0.818 and starts 14.37 units after the badge box.
const START_X = 61;             // badge centre (23) to the lockup centre (84), in lockup units
const WORD_AT = "translate(60.37 17.925) scale(0.818)";
const SUB = " motion studio";   // after the drawn AI (AiMark)
const IMPACT = 1300;            // ms: the M lands
const FPS = 30;
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const COPY = { hint: "Start with New project, top right.", again: "Play again" };

function Badge({ cls = "" }) {
  return (
    <g transform="translate(-9 -2)"><g className={"i-badge " + cls}><g transform={BADGE_MATRIX}>
      <path className="i-ring-echo" d={BADGE_RING} />
      <path className="i-m-echo" d={BADGE_M} />
      <path className="i-ring-fill" d={BADGE_RING} />
      <path className="i-ring-line" d={BADGE_RING} pathLength="1" />
      <path className="i-m" d={BADGE_M} />
      <path className="i-m-line" d={BADGE_M} pathLength="1" />
    </g></g></g>
  );
}

export default function Intro({ hint = COPY.hint }) {
  const root = useRef(null);
  const canvas = useRef(null);
  const raf = useRef(0);

  const play = useCallback(() => {
    const el = root.current;
    if (!el) return;
    el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
    cancelAnimationFrame(raf.current);
    if (still()) { el.classList.add("is-still"); return; }
    el.classList.remove("is-still");
    const $ = (s) => el.querySelector(s), $$ = (s) => [...el.querySelectorAll(s)];
    const go = (node, frames, delay, duration, easing = EXPO) => node?.animate(frames, { delay, duration, easing, fill: "both" });

    // stage furniture
    go($(".i-scan"), [{ transform: "scaleX(0)", opacity: 1 }, { transform: "scaleX(1)", opacity: 1, offset: 0.55 }, { transform: "scaleX(1)", opacity: 0 }], 60, 900, IN_OUT);
    $$(".i-hud").forEach((h, i) => go(h, [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none", offset: 0.12 }, { opacity: 1, offset: 0.82 }, { opacity: 0 }], 80 + i * 60, 4900, "linear"));
    $$(".i-orbit").forEach((o, i) => go(o, [{ opacity: 0, transform: `rotate(${i ? 40 : -30}deg) scale(.85)` }, { opacity: 0.9, offset: 0.3 }, { opacity: 0, transform: `rotate(${i ? -150 : 160}deg) scale(1.15)` }], 250 + i * 120, 1900, "cubic-bezier(.3,.1,.2,1)"));

    // the badge: big in the centre, its outlines drawn, then filled, the M punched, then off to its place
    go($(".i-badge-pos"), [{ transform: `translateX(${START_X}px)` }, { transform: `translateX(${START_X}px)`, offset: 0.001 }, { transform: "none" }], 1750, 700, IN_OUT);
    go($(".i-badge"), [{ transform: "scale(1.9)" }, { transform: "scale(1.9)", offset: 0.001 }, { transform: "scale(1)" }], 1750, 700, IN_OUT);
    go($(".i-ring-line"), [{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: 0.72 }, { strokeDashoffset: 0, opacity: 0 }], 40, 1080, "cubic-bezier(.65,0,.35,1)");
    go($(".i-m-line"), [{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: 0.7 }, { strokeDashoffset: 0, opacity: 0 }], 160, 1000, "cubic-bezier(.65,0,.35,1)");
    go($(".i-ring-fill"), [{ opacity: 0 }, { opacity: 1 }], 850, 300, "ease-out");
    go($(".i-m"), [{ opacity: 0, transform: "scale(1)" }, { opacity: 1, transform: "scale(1)", offset: 0.5 }, { opacity: 1, transform: "scale(0.86)", offset: 0.78 }, { opacity: 1, transform: "scale(1)" }], 900, IMPACT + 120 - 900, SLAM);

    // impact
    $$(".i-shock").forEach((s, i) => go(s, [{ opacity: 0.95, transform: "scale(.35)" }, { opacity: 0, transform: `scale(${i ? 3.2 : 5})` }], IMPACT + i * 90, 760, "cubic-bezier(.1,.7,.3,1)"));
    go($(".i-flash"), [{ opacity: 0 }, { opacity: 0.55, offset: 0.12 }, { opacity: 0 }], IMPACT, 620, "ease-out");
    go($(".i-shake"), [0, -5, 4, -3, 2, -1, 0].map((x, i) => ({ transform: `translate(${x}px, ${i % 2 ? 2 : -2}px)` })).concat([{ transform: "none" }]), IMPACT, 260, "linear");
    go($(".i-logo"), [{ transform: "scale(1)" }, { transform: "scale(1.07)", offset: 0.18 }, { transform: "scale(1)" }], IMPACT, 520, EXPO);     // camera punch-in
    // the echoes only exist from the impact on (fill "forwards": nothing of them shows before it)
    $(".i-m-echo")?.animate([{ opacity: 0.9, transform: "scale(1)" }, { opacity: 0, transform: "scale(2.1)" }], { delay: IMPACT, duration: 560, easing: "cubic-bezier(.1,.7,.3,1)", fill: "forwards" });
    $(".i-ring-echo")?.animate([{ opacity: 0.8, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.45)" }], { delay: IMPACT + 40, duration: 640, easing: "cubic-bezier(.1,.7,.3,1)", fill: "forwards" });

    // the name
    $$(".i-word .i-l").forEach((l, i) => go(l, [{ transform: "translateY(38px) rotate(-7deg)" }, { transform: "none" }], 2150 + i * 55, 720));
    $$(".i-trail .i-l").forEach((l, i) => go(l, [{ transform: "translateY(38px)", opacity: 0.95 }, { transform: "translateY(-3px)", opacity: 0.7, offset: 0.6 }, { transform: "translateY(-5px)", opacity: 0 }], 2210 + i * 55, 760));
    $$(".i-sub .i-ch").forEach((c, i) => go(c, [{ opacity: 0, transform: "translateY(0.4em)", filter: "blur(6px)" }, { opacity: 1, transform: "none", filter: "blur(0px)" }], 2650 + i * 32, 560));
    $$(".i-ai .ai-a, .i-ai .ai-i").forEach((s, i) => go(s, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], 2650 + i * 140, 520, IN_OUT));
    $$(".i-ai .ai-spark, .i-ai .ai-dot").forEach((s, i) => go(s, [{ opacity: 0, transform: "scale(0) rotate(-90deg)" }, { opacity: 1, transform: "none" }], 3050 + i * 90, 520, SLAM));
    go($(".i-rule"), [{ transform: "scaleX(0)", transformOrigin: "0% 50%" }, { transform: "scaleX(1)", transformOrigin: "0% 50%", offset: 0.45 },
      { transform: "scaleX(1)", transformOrigin: "100% 50%", offset: 0.5 }, { transform: "scaleX(0)", transformOrigin: "100% 50%" }], 2550, 980, IN_OUT);

    // finish
    go($(".i-glint"), [{ transform: "translateX(-60px) skewX(-20deg)" }, { transform: "translateX(220px) skewX(-20deg)" }], 3350, 700, "cubic-bezier(.45,0,.25,1)");
    go($(".i-hint"), [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], 4050, 600);
    $(".i-hint")?.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { delay: 4900, duration: 2400, iterations: Infinity, easing: "ease-in-out" });
    go($(".i-again"), [{ opacity: 0 }, { opacity: 1 }], 4600, 400, "ease-out");
    go($(".i-glow"), [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1.1)", offset: 0.4 }, { opacity: 0.55, transform: "scale(1)" }], IMPACT - 100, 3600, "ease-out");

    sparks(el, canvas.current, raf);
    el.dispatchEvent(new Event("intro-play"));      // the corner timecode starts again from 0
  }, []);

  useLayoutEffect(() => { play(); const r = raf; return () => cancelAnimationFrame(r.current); }, [play]);

  const word = (cls, inner) => (
    <g className={cls} clipPath="url(#i-clip)">{WORD.map((g, i) => <path key={i} className="i-l" d={g.d} />)}{inner}</g>
  );
  return (
    <section className="intro-stage" ref={root} aria-label="Moworks">
      <canvas className="i-sparks" ref={canvas} aria-hidden="true" />
      <div className="i-glow" aria-hidden="true" />
      <div className="i-flash" aria-hidden="true" />
      <i className="i-scan" aria-hidden="true" />
      <span className="i-hud i-tl" aria-hidden="true">MOWORKS<b>/</b>INTRO</span>
      <span className="i-hud i-tr num" aria-hidden="true"><Timecode /></span>
      <span className="i-hud i-bl" aria-hidden="true">1920 × 1080<b>·</b>{FPS} FPS</span>
      <div className="i-shake">
        <button type="button" className="i-logo" onClick={play} aria-label={COPY.again}>
          <svg className="i-svg" viewBox="0 0 168 60" role="img" aria-label="Moworks AI motion studio">
            <defs>
              <clipPath id="i-clip" clipPathUnits="userSpaceOnUse"><rect x="200" y="404" width="148" height="46" /></clipPath>
              <linearGradient id="i-glint-g" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".95" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
              <mask id="i-mask" maskUnits="userSpaceOnUse" x="-20" y="-20" width="210" height="100">
                <g fill="#fff"><g transform="translate(-9 -2)"><g transform={BADGE_MATRIX}><path d={BADGE_RING} /><path d={BADGE_M} /></g></g>
                  <g transform={WORD_AT}><g transform="translate(-208.567 -414.275)">{WORD.map((g, i) => <path key={i} d={g.d} />)}</g></g></g>
              </mask>
            </defs>
            <g className="i-orbits" transform="translate(84 30)">
              <circle className="i-orbit" r="34" /><circle className="i-orbit b" r="41" />
            </g>
            <g transform="translate(84 30)"><circle className="i-shock" r="20" /><circle className="i-shock b" r="20" /></g>
            <g className="i-badge-pos"><Badge /></g>
            <g transform={WORD_AT}><g transform="translate(-208.567 -414.275)">
              {word("i-trail")}
              {word("i-word")}
              <rect className="i-rule" x="208.567" y="447.6" width="130.763" height="1.6" rx=".8" />
            </g></g>
            <g mask="url(#i-mask)"><rect className="i-glint" x="-40" y="-10" width="34" height="80" fill="url(#i-glint-g)" /></g>
          </svg>
        </button>
        <div className="i-below">
          <p className="i-sub" aria-hidden="true"><AiMark className="i-ch i-ai" />{[...SUB].map((c, i) => <span key={i} className="i-ch">{c === " " ? " " : c}</span>)}</p>
          <p className="i-hint">{hint}</p>
        </div>
      </div>
      <button type="button" className="btn ghost sm i-again" onClick={play}><RotateCcw size={13} />{COPY.again}</button>
    </section>
  );
}

/** The corner timecode: hh:mm:ss:ff at 30 fps, from 0 to 5 s, written straight to the DOM (no re-render per frame). */
function Timecode() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (ms) => { const f = Math.min(150, Math.floor(ms / (1000 / FPS))); return `00:00:${String(Math.floor(f / FPS)).padStart(2, "0")}:${String(f % FPS).padStart(2, "0")}`; };
    if (still()) { el.textContent = fmt(5000); return; }
    let id = 0, t0 = 0;
    const host = el.closest(".intro-stage");
    const restart = () => { t0 = performance.now(); cancelAnimationFrame(id); id = requestAnimationFrame(tick); };
    const tick = (now) => { const ms = now - t0; el.textContent = fmt(ms); if (ms < 5000) id = requestAnimationFrame(tick); };
    restart();
    host?.addEventListener("intro-play", restart);
    return () => { cancelAnimationFrame(id); host?.removeEventListener("intro-play", restart); };
  }, []);
  return <span ref={ref}>00:00:00:00</span>;
}

/** Sparks: they fly in from the edges to the badge until the impact, then burst out and fade. One canvas, additive light, ~3 s. */
function sparks(stage, cv, raf) {
  if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const box = stage.getBoundingClientRect(), svg = stage.querySelector(".i-svg").getBoundingClientRect();
  cv.width = Math.round(box.width * dpr); cv.height = Math.round(box.height * dpr);
  const ctx = cv.getContext("2d");
  const css = getComputedStyle(stage);
  const accent = css.getPropertyValue("--accent").trim() || "#E4602A";
  const ink = css.getPropertyValue("--text-primary").trim() || "#F7F5F0";
  const cx = (svg.left + svg.width / 2 - box.left) * dpr, cy = (svg.top + svg.height / 2 - box.top) * dpr;
  const R = Math.hypot(cv.width, cv.height) * 0.55;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const inbound = Array.from({ length: 120 }, () => {
    const a = rnd() * Math.PI * 2, r = R * (0.75 + rnd() * 0.35);
    return { a, r, t0: 120 + rnd() * 560, dur: 520 + rnd() * 380, w: (0.6 + rnd() * 1.4) * dpr, c: rnd() < 0.7 ? accent : ink };
  });
  const burst = Array.from({ length: 140 }, () => {
    const a = rnd() * Math.PI * 2, v = (2.5 + rnd() * 10) * dpr;
    return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 600 + rnd() * 900, w: (0.6 + rnd() * 1.8) * dpr, c: rnd() < 0.6 ? accent : ink };
  });
  const t0 = performance.now();
  let last = t0;
  const frame = (now) => {
    const t = now - t0, dt = Math.min(48, now - last) / 16.67;
    last = now;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,0,0.28)";              // short trails: the stage behind the canvas is dark in both themes
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (const p of inbound) {
      const k = (t - p.t0) / p.dur;
      if (k < 0 || k > 1) continue;
      const e = k * k * k, e0 = Math.max(0, k - 0.08) ** 3;
      const r1 = p.r * (1 - e), r0 = p.r * (1 - e0);
      ctx.strokeStyle = p.c; ctx.globalAlpha = 0.25 + 0.75 * k; ctx.lineWidth = p.w;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(p.a) * r0, cy + Math.sin(p.a) * r0); ctx.lineTo(cx + Math.cos(p.a) * r1, cy + Math.sin(p.a) * r1); ctx.stroke();
    }
    if (t > IMPACT) {
      const age = t - IMPACT;
      for (const p of burst) {
        if (age > p.life) continue;
        const x0 = p.x, y0 = p.y;
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.93 ** dt; p.vy = p.vy * 0.93 ** dt + 0.05 * dpr * dt;
        ctx.strokeStyle = p.c; ctx.globalAlpha = 1 - age / p.life; ctx.lineWidth = p.w;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    if (t < 3200) raf.current = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, cv.width, cv.height);
  };
  ctx.clearRect(0, 0, cv.width, cv.height);
  raf.current = requestAnimationFrame(frame);
}

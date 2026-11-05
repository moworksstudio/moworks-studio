// collage.tsx — the paper-collage visual kit: off-white grid paper, black-and-white halftone cut-outs with a thin
// white paper edge, ONE loud accent (red) + a yellow highlighter, condensed caps (Anton) mixed with a serif italic
// (Playfair Display) and typewriter labels (Special Elite), hand-drawn marks, print grain.
// Motion: moves are smooth 60-fps springs; the TEXTURE boils at 12 fps (grain, cut-out jitter) — that is what gives
// the look its hand-made feel. Everything derives from t = frame / fps. Every component reads the frame size from
// useVideoConfig, so the same kit works at 1080×1920 (9:16), 1920×1080 (16:9) and 1080×1080 (1:1).
import React from "react";
import { Img, spring, staticFile, useVideoConfig } from "remotion";
import { getLength } from "@remotion/paths";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadElite } from "@remotion/google-fonts/SpecialElite";

const anton = loadAnton("normal", { weights: ["400"], subsets: ["latin"] });
const playfair = loadPlayfair("italic", { weights: ["500", "800"], subsets: ["latin"] });
const elite = loadElite("normal", { weights: ["400"], subsets: ["latin"] });
export const VF = { caps: anton.fontFamily, serif: playfair.fontFamily, type: elite.fontFamily };

/** colour ROLES — one accent per job, never decoration (CREATIVE-DIRECTION §7) */
export const V = {
  paper: "#ECE8DF", // the page
  ink: "#171615", // text, people, neutral things
  red: "#D3271F", // THE point / the alarm (one red word group per line)
  yellow: "#F3D21C", // the highlighter behind a key word, stamp labels
  white: "#F7F4EC", // torn paper, tags, labels, panels
  night: "#141414", // dark pages
  money: "#2F7A4D", // money objects only — never grey money
  moneyLight: "#7FAF7A",
};
/** CSS filter that tints a black-and-white cut-out of cash dollar-green */
export const GREEN_CUT = "sepia(1) saturate(1.7) hue-rotate(50deg) brightness(0.86) contrast(1.1)";

// ── time helpers ─────────────────────────────────────────────────────────────────────────────────
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const ease = {
  out: (k: number) => 1 - Math.pow(1 - k, 3),
  in: (k: number) => k * k * k,
  inOut: (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outBack: (k: number) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2),
};
/** 0→1 between a and b (seconds), eased */
export const ramp = (t: number, a: number, b: number, e: (k: number) => number = ease.out) => e(clamp01((t - a) / (b - a)));
/** a physical spring that starts at `at` (s): 0 → 1 with a natural overshoot */
export const springAt = (t: number, at: number, fps: number, config: { damping?: number; mass?: number; stiffness?: number } = {}) =>
  t < at ? 0 : spring({ frame: (t - at) * fps, fps, config: { damping: 12, mass: 0.7, stiffness: 150, ...config } });
/** a decaying wobble that starts at `at`: 0 → 1 → -0.4 … → 0 (recoil, flex, wiggle) */
export const kick = (t: number, at: number, freq = 5, decay = 6) => (t < at ? 0 : Math.sin((t - at) * freq * 2 * Math.PI) * Math.exp(-(t - at) * decay));

// ── the 12-fps boil ──────────────────────────────────────────────────────────────────────────────
export const BOIL_FPS = 12;
export const boilStep = (t: number) => Math.floor(t * BOIL_FPS);
/** hand-made jitter for a cut-out (px / deg), re-rolled 12× a second */
export const boil = (t: number, seed: number, amp = 1) => {
  const s = boilStep(t);
  return { x: (hash(s * 7.13 + seed) - 0.5) * 2 * amp, y: (hash(s * 3.31 + seed * 1.7) - 0.5) * 2 * amp, r: (hash(s * 5.97 + seed * 2.3) - 0.5) * 0.5 * amp };
};

// ── backgrounds & finish ─────────────────────────────────────────────────────────────────────────
/** the grid-paper page, `cover`-fitted to the frame; the default texture matches the frame's orientation */
export const GridPaper: React.FC<{ src?: string; dark?: boolean }> = ({ src, dark }) => {
  const { width, height } = useVideoConfig();
  const file = src ?? (height > width * 1.2 ? "textures/paper-grid-9x16.jpg" : width > height * 1.2 ? "textures/paper-grid-16x9.jpg" : "textures/paper-grid-1x1.jpg");
  return (
    <Img
      src={staticFile(file)}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        objectFit: "cover",
        filter: dark ? "invert(1) brightness(0.6) contrast(1.25) sepia(0.12)" : undefined,
      }}
    />
  );
};

/** print grain (overlay blend, re-rolled at 12 fps) + a soft paper vignette */
export const PrintFinish: React.FC<{ t: number; grain?: number; vignette?: number }> = ({ t, grain = 0.42, vignette = 0.22 }) => {
  const s = boilStep(t);
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${staticFile("textures/grain.png")})`,
          backgroundPosition: `${Math.floor(hash(s) * 512)}px ${Math.floor(hash(s + 0.5) * 512)}px`,
          mixBlendMode: "overlay",
          opacity: grain,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(30,22,12,${vignette}) 100%)`,
          pointerEvents: "none",
        }}
      />
    </>
  );
};

// ── cut-outs ─────────────────────────────────────────────────────────────────────────────────────
/** a halftone cut-out placed by its CENTRE; lift (0–1) raises its shadow as if held above the page */
export const Cutout: React.FC<{
  src: string;
  x: number;
  y: number;
  w: number;
  rot?: number;
  scale?: number;
  opacity?: number;
  lift?: number;
  t: number;
  seed: number;
  boilAmp?: number;
  shadow?: boolean;
  origin?: string;
  style?: React.CSSProperties;
}> = ({ src, x, y, w, rot = 0, scale = 1, opacity = 1, lift = 0, t, seed, boilAmp = 0.8, shadow = true, origin = "50% 50%", style }) => {
  const b = boil(t, seed, boilAmp);
  const sh = 4 + lift * 22;
  return (
    <Img
      src={staticFile(src)}
      style={{
        position: "absolute",
        left: x - w / 2,
        top: y,
        width: w,
        transform: `translate(${b.x}px, calc(-50% + ${b.y}px)) rotate(${rot + b.r}deg) scale(${scale})`,
        transformOrigin: origin,
        opacity,
        filter: shadow ? `drop-shadow(${sh * 0.35}px ${sh}px ${sh * 0.8}px rgba(20,14,6,${0.3 - lift * 0.1}))` : undefined,
        ...style,
      }}
    />
  );
};

// ── torn paper ───────────────────────────────────────────────────────────────────────────────────
/** a torn-edge rectangle outline (SVG path in its own w×h box) — every edge ragged */
export const tornRect = (w: number, h: number, seed: number, jag = 6, stepPx = 11) => {
  const pts: [number, number][] = [];
  const j = (i: number) => (hash(seed * 13.7 + i * 1.91) - 0.5) * 2 * jag;
  let i = 0;
  for (let x = 0; x < w; x += stepPx) pts.push([x, jag + j(i++)]);
  for (let y = 0; y < h; y += stepPx) pts.push([w - jag + j(i++), y]);
  for (let x = w; x > 0; x -= stepPx) pts.push([x, h - jag + j(i++)]);
  for (let y = h; y > 0; y -= stepPx) pts.push([jag + j(i++), y]);
  return "M" + pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" L") + " Z";
};

/** a ragged edge as offsets every `stepPx` along its length (for the TornSheet clip-path) */
export const tornEdge = (len: number, seed: number, jag = 14, stepPx = 16) => {
  const out: number[] = [];
  for (let p = 0, i = 0; p <= len + stepPx; p += stepPx, i++) out.push((hash(seed * 9.1 + i * 2.17) - 0.5) * 2 * jag + (hash(seed + i * 0.37) - 0.5) * jag * 0.6);
  return out;
};

export const TornPaper: React.FC<{ w: number; h: number; seed: number; fill?: string; shadow?: boolean; style?: React.CSSProperties; children?: React.ReactNode }> = ({
  w,
  h,
  seed,
  fill = V.white,
  shadow = true,
  style,
  children,
}) => (
  <div style={{ position: "absolute", width: w, height: h, ...style }}>
    <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible", filter: shadow ? "drop-shadow(2px 5px 4px rgba(20,14,6,0.28))" : undefined }}>
      <path d={tornRect(w, h, seed)} fill={fill} />
    </svg>
    <div style={{ position: "absolute", inset: 0 }}>{children}</div>
  </div>
);

/** a typewritten label on a torn paper strip with a red square bullet (pops with a spring) */
export const Tag: React.FC<{ text: string; x: number; y: number; t: number; at: number; fps: number; seed: number; size?: number; rot?: number }> = ({
  text,
  x,
  y,
  t,
  at,
  fps,
  seed,
  size = 34,
  rot = -2,
}) => {
  const p = springAt(t, at, fps, { damping: 11, stiffness: 190 });
  if (t < at) return null;
  const w = text.length * size * 0.62 + size * 1.9;
  const h = size * 1.75;
  const b = boil(t, seed, 0.6);
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y, transform: `translate(${b.x}px, ${(1 - p) * -16 + b.y}px) rotate(${rot + (1 - p) * 8 + b.r}deg) scale(${0.85 + 0.15 * p})`, opacity: clamp01((t - at) / 0.06) }}>
      <TornPaper w={w} h={h} seed={seed}>
        <div style={{ position: "absolute", left: size * 0.55, top: h / 2 - size * 0.22, width: size * 0.44, height: size * 0.44, background: V.red }} />
        <div style={{ position: "absolute", left: size * 1.25, top: 0, height: h, display: "flex", alignItems: "center", fontFamily: VF.type, fontSize: size, color: V.ink, letterSpacing: "0.02em" }}>
          {text}
        </div>
      </TornPaper>
    </div>
  );
};

// ── type ─────────────────────────────────────────────────────────────────────────────────────────
/** typewriter text: characters strike on at `cps`, each a hair off the baseline with uneven ink */
export const TypeOn: React.FC<{ text: string; t: number; at: number; cps?: number; size: number; color?: string; style?: React.CSSProperties }> = ({
  text,
  t,
  at,
  cps = 24,
  size,
  color = V.ink,
  style,
}) => {
  const n = Math.floor((t - at) * cps);
  return (
    <div style={{ position: "absolute", fontFamily: VF.type, fontSize: size, color, whiteSpace: "pre", letterSpacing: "0.06em", ...style }}>
      {text.split("").map((ch, i) => (
        <span key={i} style={{ opacity: i < n ? 0.82 + 0.18 * hash(i * 3.1) : 0, display: "inline-block", transform: `translateY(${(hash(i * 7.7) - 0.5) * 3}px)` }}>
          {ch}
        </span>
      ))}
    </div>
  );
};

/** serif-italic words that rise in one by one on their spoken word times */
export const SerifWords: React.FC<{
  words: { w: string; at: number; bold?: boolean; mark?: React.ReactNode }[];
  t: number;
  size: number;
  color?: string;
  out?: number;
  style?: React.CSSProperties;
}> = ({ words, t, size, color = V.ink, out, style }) => {
  const gone = out !== undefined ? ramp(t, out, out + 0.22) : 0;
  return (
    <div style={{ position: "absolute", fontFamily: VF.serif, fontStyle: "italic", fontSize: size, lineHeight: 1.15, color, whiteSpace: "nowrap", opacity: 1 - gone, filter: gone > 0 ? `blur(${gone * 10}px)` : undefined, ...style }}>
      {words.map((wd, i) => {
        const k = ramp(t, wd.at, wd.at + 0.24);
        return (
          <span key={i} style={{ position: "relative", display: "inline-block", marginRight: size * 0.24, fontWeight: wd.bold ? 800 : 500, opacity: k, transform: `translateY(${(1 - k) * size * 0.3}px)` }}>
            {wd.mark}
            <span style={{ position: "relative" }}>{wd.w}</span>
          </span>
        );
      })}
    </div>
  );
};

// ── marker marks ─────────────────────────────────────────────────────────────────────────────────
/** a yellow highlighter swipe behind a word (put it as `mark` of a word) */
export const Highlight: React.FC<{ t: number; at: number; color?: string; dur?: number }> = ({ t, at, color = V.yellow, dur = 0.24 }) => {
  const k = ramp(t, at, at + dur, ease.inOut);
  return (
    <span
      style={{
        position: "absolute",
        left: "-0.12em",
        right: "-0.12em",
        top: "0.18em",
        bottom: "0.02em",
        background: color,
        transform: `scaleX(${k}) rotate(-1.2deg) skewX(-6deg)`,
        transformOrigin: "0% 50%",
        borderRadius: "0.08em 0.2em 0.12em 0.25em",
      }}
    />
  );
};

/** a red marker bar that strikes a word out: ONE confident stroke drawn left → right, slightly angled. Put it inside
 *  the word's (position: relative) span, or as a child of RiseWord, so it is always exactly as wide as the word.
 *  (Never an SVG dash-array stroke on a stretched path — it renders as broken dashes.) Dim the struck word to ~0.35. */
export const Strike: React.FC<{ t: number; at: number; color?: string; dur?: number; angle?: number; thickness?: number }> = ({
  t,
  at,
  color = V.red,
  dur = 0.22,
  angle = -4,
  thickness = 0.09,
}) => {
  const k = ramp(t, at, at + dur, ease.inOut);
  return (
    <span
      style={{
        position: "absolute",
        left: "-6%",
        right: "-6%",
        top: "50%",
        height: `${thickness}em`,
        marginTop: `${-thickness / 2}em`,
        background: color,
        borderRadius: "0.05em",
        transform: `rotate(${angle}deg) scaleX(${k})`,
        transformOrigin: "0% 50%",
        zIndex: 2,
      }}
    />
  );
};

/** a marker underline under a word (same rules as Strike: a drawn bar, a child of the word) */
export const Underline: React.FC<{ t: number; at: number; color?: string; dur?: number; angle?: number; thickness?: number }> = ({
  t,
  at,
  color = V.red,
  dur = 0.22,
  angle = -1.5,
  thickness = 0.07,
}) => {
  const k = ramp(t, at, at + dur, ease.inOut);
  return (
    <span
      style={{
        position: "absolute",
        left: "-3%",
        right: "-3%",
        top: "96%",
        height: `${thickness}em`,
        background: color,
        borderRadius: "0.05em",
        transform: `rotate(${angle}deg) scaleX(${k})`,
        transformOrigin: "0% 50%",
      }}
    />
  );
};

/** a hand-drawn marker loop around a point (a bit more than one turn, wobbly radius) */
export const MarkerCircle: React.FC<{ cx: number; cy: number; rx: number; ry: number; t: number; at: number; dur?: number; color?: string; width?: number; seed?: number }> = ({
  cx,
  cy,
  rx,
  ry,
  t,
  at,
  dur = 0.45,
  color = V.red,
  width = 7,
  seed = 3,
}) => {
  const { width: FW, height: FH } = useVideoConfig();
  const n = 64;
  const turns = 1.12;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a = -2.2 + (i / n) * turns * Math.PI * 2;
    const wob = 1 + (hash(seed + i * 0.13) - 0.5) * 0.05 + (i / n) * 0.07;
    pts.push(`${(cx + Math.cos(a) * rx * wob).toFixed(1)},${(cy + Math.sin(a) * ry * wob).toFixed(1)}`);
  }
  const d = "M" + pts.join(" L");
  const L = 1000;
  const k = ramp(t, at, at + dur, ease.inOut);
  return (
    <svg width={FW} height={FH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={L} strokeDasharray={`${L} ${L}`} strokeDashoffset={L * (1 - k)} />
    </svg>
  );
};

/** the red dotted trajectory, drawn on from its start (k = 0…1) — the hero line of the style */
export const DottedPath: React.FC<{ d: string; k: number; color?: string; dot?: number; gap?: number; id: string; opacity?: number }> = ({ d, k, color = V.red, dot = 8, gap = 22, id, opacity = 1 }) => {
  const { width: FW, height: FH } = useVideoConfig();
  const L = getLength(d);
  return (
    <svg width={FW} height={FH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity }}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-400} y={-400} width={FW + 800} height={FH + 800}>
          <path d={d} fill="none" stroke="#fff" strokeWidth={dot * 4} strokeDasharray={`${L} ${L + 10}`} strokeDashoffset={L * (1 - clamp01(k))} />
        </mask>
      </defs>
      <path d={d} fill="none" stroke={color} strokeWidth={dot} strokeLinecap="round" strokeDasharray={`0.1 ${gap}`} mask={`url(#${id})`} />
    </svg>
  );
};

/** a hand-cut paper burst (muzzle flash / impact): jagged star, red over yellow, re-cut every 12-fps step */
export const Burst: React.FC<{ x: number; y: number; r: number; t: number; seed: number; spikes?: number; scale?: number; opacity?: number }> = ({
  x,
  y,
  r,
  t,
  seed,
  spikes = 11,
  scale = 1,
  opacity = 1,
}) => {
  const s = boilStep(t);
  const star = (rad: number, salt: number) => {
    const pts: string[] = [];
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 + hash(seed + s) * 0.4;
      const rr = (i % 2 ? 0.42 : 1) * rad * (0.75 + 0.5 * hash(seed * 3 + i + s * 1.3 + salt));
      pts.push(`${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`);
    }
    return pts.join(" ");
  };
  return (
    <svg width={r * 2.4} height={r * 2.4} viewBox={`${-r * 1.2} ${-r * 1.2} ${r * 2.4} ${r * 2.4}`} style={{ position: "absolute", left: x - r * 1.2, top: y - r * 1.2, overflow: "visible", transform: `scale(${scale})`, opacity }}>
      <polygon points={star(r, 0)} fill={V.red} />
      <polygon points={star(r * 0.55, 7)} fill={V.yellow} />
    </svg>
  );
};

/** a sheet of paper sliding over the scene with a torn leading edge (the scene-change transition).
 *  `k` 0 → 1 = off-screen → covering. dir "left": enters from the right; "up": enters from the bottom. */
export const TornSheet: React.FC<{ k: number; dir: "left" | "up"; seed: number; edge?: string; children: React.ReactNode }> = ({ k, dir, seed, edge = V.white, children }) => {
  const { width: FW, height: FH } = useVideoConfig();
  if (k <= 0) return null;
  const horiz = dir === "left";
  const len = horiz ? FH : FW;
  const jag = tornEdge(len, seed);
  const stepPx = 16;
  // the sheet travels 40 px past its rest so the ragged edge ends off-screen; the content is held back by the
  // same amount, so it settles exactly in place
  const over = 40 * k;
  const off = (1 - k) * (horiz ? FW + 60 : FH + 60) - over;
  // clip polygon in the sheet's own coords: ragged leading edge at 0, flat everywhere else
  const pts = jag.map((j, i) => (horiz ? `${Math.max(0, j + 14)}px ${i * stepPx}px` : `${i * stepPx}px ${Math.max(0, j + 14)}px`));
  const poly = horiz
    ? `polygon(${pts.join(",")}, ${FW + 180}px ${FH + 120}px, ${FW + 180}px -100px)`
    : `polygon(${pts.join(",")}, ${FW + 180}px ${FH + 120}px, -100px ${FH + 120}px)`;
  const fibre = jag.map((j, i) => (horiz ? `${(j + 4).toFixed(1)},${i * stepPx}` : `${i * stepPx},${(j + 4).toFixed(1)}`)).join(" ");
  const tr = horiz ? `translateX(${off}px)` : `translateY(${off}px)`;
  return (
    <div style={{ position: "absolute", inset: 0, transform: tr }}>
      {/* shadow cast on the page underneath */}
      <div
        style={{
          position: "absolute",
          ...(horiz ? { left: -60, top: 0, width: 80, height: FH, background: "linear-gradient(to left, rgba(20,14,6,0.32), rgba(20,14,6,0))" } : { left: 0, top: -60, width: FW, height: 80, background: "linear-gradient(to top, rgba(20,14,6,0.32), rgba(20,14,6,0))" }),
        }}
      />
      {/* the white torn fibre band along the edge */}
      <svg width={FW} height={FH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <polyline points={fibre} fill="none" stroke={edge} strokeWidth={22} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", left: 0, top: 0, width: FW + 80, height: FH + 80, clipPath: poly, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: FW, height: FH, transform: horiz ? `translateX(${over}px)` : `translateY(${over}px)` }}>{children}</div>
      </div>
    </div>
  );
};

// ── counters & pointers ──────────────────────────────────────────────
/** a money counter in condensed caps with FIXED-width digit cells, so ticking digits never shift the layout */
export const MoneyCounter: React.FC<{ value: number; size: number; color?: string; prefix?: string; style?: React.CSSProperties }> = ({
  value,
  size,
  color = V.ink,
  prefix = "$",
  style,
}) => {
  const txt = prefix + Math.max(0, Math.floor(value)).toLocaleString("en-US");
  return (
    <div style={{ position: "absolute", display: "flex", fontFamily: VF.caps, fontSize: size, lineHeight: 1, color, whiteSpace: "pre", ...style }}>
      {txt.split("").map((ch, i) => (
        <span key={i} style={{ display: "inline-block", width: ch === "," ? size * 0.2 : ch === "$" ? size * 0.5 : size * 0.52, textAlign: "center" }}>
          {ch}
        </span>
      ))}
    </div>
  );
};

/** a hand-drawn marker arrow (curved shaft + two-stroke head) drawn on from its tail.
 *  USE RARELY: only when the eye would otherwise miss the target and nothing else points at it (CREATIVE-DIRECTION §10). */
export const MarkerArrow: React.FC<{
  from: [number, number];
  to: [number, number];
  bend?: number;
  t: number;
  at: number;
  dur?: number;
  color?: string;
  width?: number;
}> = ({ from, to, bend = 0.2, t, at, dur = 0.4, color = V.red, width = 6 }) => {
  const { width: FW, height: FH } = useVideoConfig();
  const [x0, y0] = from;
  const [x1, y1] = to;
  const mx = (x0 + x1) / 2 - (y1 - y0) * bend;
  const my = (y0 + y1) / 2 + (x1 - x0) * bend;
  const ang = Math.atan2(y1 - my, x1 - mx);
  const hl = 26 + width * 2;
  const h1 = [x1 - Math.cos(ang - 0.45) * hl, y1 - Math.sin(ang - 0.45) * hl];
  const h2 = [x1 - Math.cos(ang + 0.45) * hl, y1 - Math.sin(ang + 0.45) * hl];
  const k = ramp(t, at, at + dur, ease.inOut);
  const kh = ramp(t, at + dur * 0.85, at + dur + 0.12, ease.out);
  const L = 1000;
  return (
    <svg width={FW} height={FH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={`M ${x0} ${y0} Q ${mx} ${my} ${x1} ${y1}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={L} strokeDasharray={`${L} ${L}`} strokeDashoffset={L * (1 - k)} />
      <path
        d={`M ${h1[0]} ${h1[1]} L ${x1} ${y1} L ${h2[0]} ${h2[1]}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={L}
        strokeDasharray={`${L} ${L}`}
        strokeDashoffset={L * (1 - kh)}
      />
    </svg>
  );
};

/** THE display-word animation: letters rise out of a baseline mask on springs, no tilt.
 *  The optional highlighter is a child of the word, so it is always exactly as wide as the word. */
export const RiseWord: React.FC<{
  text: string;
  t: number;
  at: number;
  fps: number;
  size: number;
  color?: string;
  font?: "caps" | "serif";
  stagger?: number;
  tracking?: number;
  highlight?: { at: number; color?: string; dur?: number };
  dim?: number; // 0–1, fades the word back (e.g. after a strike)
  out?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode; // extra marks drawn over the word (Strike etc.)
}> = ({ text, t, at, fps, size, color = V.ink, font = "caps", stagger = 0.028, tracking = 0.01, highlight, dim = 0, out, style, children }) => {
  const gone = out !== undefined ? ramp(t, out, out + 0.24, ease.in) : 0;
  const hk = highlight ? ramp(t, highlight.at, highlight.at + (highlight.dur ?? 0.2), ease.inOut) : 0;
  return (
    <div style={{ position: "absolute", whiteSpace: "pre", opacity: (1 - gone) * (1 - 0.65 * dim), filter: gone > 0 ? `blur(${gone * 14}px)` : undefined, ...style }}>
      <span style={{ position: "relative", display: "inline-flex", fontFamily: font === "caps" ? VF.caps : VF.serif, fontStyle: font === "serif" ? "italic" : undefined, fontWeight: font === "serif" ? 800 : undefined, fontSize: size, lineHeight: 1.04, letterSpacing: `${tracking}em`, color }}>
        {highlight && (
          <span
            style={{
              position: "absolute",
              left: "-0.1em",
              right: "-0.1em",
              top: "0.06em",
              bottom: "-0.02em",
              background: highlight.color ?? V.yellow,
              transform: `scaleX(${hk}) rotate(-0.8deg)`,
              transformOrigin: "0% 50%",
              borderRadius: "0.05em 0.12em 0.08em 0.14em",
            }}
          />
        )}
        {text.split("").map((ch, i) => {
          const p = springAt(t, at + i * stagger, fps, { damping: 13, stiffness: 190, mass: 0.6 });
          return (
            <span key={i} style={{ position: "relative", display: "inline-block", overflow: "hidden", verticalAlign: "top", paddingTop: "0.06em" }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - p) * 110}%)` }}>{ch === " " ? " " : ch}</span>
            </span>
          );
        })}
        {children}
      </span>
    </div>
  );
};

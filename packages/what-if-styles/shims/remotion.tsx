// The What If engine's `remotion` (the Remotion calls a What If film may use, written for
// HyperFrames from Remotion's public documentation (remotion.dev/docs), never from its code (the Remotion License is not MIT). No
// Remotion package: esbuild maps `import ... from "remotion"` here (hf-edit/whatIfBuild.mjs). HyperFrames owns time: the host page
// (host.tsx) draws the frame HF asks for through FrameContext, so everything here is a pure function of that frame.
//   time        useCurrentFrame, useVideoConfig, Sequence, Series, Loop, Freeze, getInputProps
//   motion      interpolate, interpolateColors, spring, measureSpring, Easing, random
//   layers      AbsoluteFill, Img
//   media       Audio, Html5Audio, Video, OffthreadVideo draw nothing: sound and video go on HyperFrames' own timeline (index.html)
//   files       staticFile: a file of the project's assets/
//   waiting     delayRender, continueRender, cancelRender: the host waits for every handle before READY
//   studio      Composition, Still, registerRoot, Folder: Remotion Studio's registry, nothing to do in a film
import React from "react";

// ---- time
export const FrameContext = React.createContext(0);
export type VideoConfig = { id: string; width: number; height: number; fps: number; durationInFrames: number; defaultProps: Record<string, unknown>; props: Record<string, unknown> };
export const VideoConfigContext = React.createContext<VideoConfig>({ id: "main", width: 1920, height: 1080, fps: 30, durationInFrames: 1, defaultProps: {}, props: {} });

/** The frame being drawn, counted from the start of the enclosing Sequence (0 at the film's start outside any). */
export const useCurrentFrame = () => React.useContext(FrameContext);
/** The film's size, rate and length (the composition's, also inside a Sequence). */
export const useVideoConfig = () => React.useContext(VideoConfigContext);
export const getInputProps = () => ({});
export const useCurrentScale = () => 1;

type Layout = "absolute-fill" | "none";
type SequenceProps = { from?: number; durationInFrames?: number; name?: string; layout?: Layout; style?: React.CSSProperties; className?: string; children?: React.ReactNode };
/** Its children only while from <= frame < from + durationInFrames; inside, the frame counts from `from`. */
export const Sequence: React.FC<SequenceProps> = ({ from = 0, durationInFrames = Infinity, layout = "absolute-fill", style, className, children }) => {
  if (!Number.isFinite(from)) throw new TypeError(`Sequence: "from" must be a finite number, got ${from}`);
  if (!(durationInFrames > 0)) throw new TypeError(`Sequence: "durationInFrames" must be positive, got ${durationInFrames}`);
  const parent = useCurrentFrame();
  const local = parent - from;
  if (local < 0 || local >= durationInFrames) return null;
  const inner = <FrameContext.Provider value={local}>{children}</FrameContext.Provider>;
  return layout === "none" ? inner : <AbsoluteFill style={style} className={className}>{inner}</AbsoluteFill>;
};

type SeriesSequenceProps = { durationInFrames: number; offset?: number; layout?: Layout; style?: React.CSSProperties; className?: string; children?: React.ReactNode };
const SeriesSequence: React.FC<SeriesSequenceProps> = () => null;          // read by Series, never drawn by itself
/** Its Series.Sequence children one after another, each `offset` frames later (or earlier) than the end of the one before. */
export const Series: React.FC<{ children?: React.ReactNode }> & { Sequence: React.FC<SeriesSequenceProps> } = Object.assign(
  ({ children }: { children?: React.ReactNode }) => {
    let at = 0;
    const out: React.ReactNode[] = [];
    React.Children.forEach(children, (c, i) => {
      if (!React.isValidElement(c)) return;
      if (c.type !== SeriesSequence) throw new TypeError("Series: only <Series.Sequence> children");
      const p = c.props as SeriesSequenceProps;
      if (!(p.durationInFrames > 0)) throw new TypeError(`Series.Sequence: "durationInFrames" must be positive, got ${p.durationInFrames}`);
      at += p.offset ?? 0;
      out.push(<Sequence key={c.key ?? i} from={at} durationInFrames={p.durationInFrames} layout={p.layout} style={p.style} className={p.className}>{p.children}</Sequence>);
      at += p.durationInFrames;
    });
    return <>{out}</>;
  },
  { Sequence: SeriesSequence },
);

/** Its children again and again, each pass `durationInFrames` long, `times` passes (for ever by default). */
export const Loop: React.FC<{ durationInFrames: number; times?: number; layout?: Layout; style?: React.CSSProperties; children?: React.ReactNode }> = ({ durationInFrames, times = Infinity, layout = "absolute-fill", style, children }) => {
  if (!(durationInFrames > 0)) throw new TypeError(`Loop: "durationInFrames" must be positive, got ${durationInFrames}`);
  const f = useCurrentFrame();
  if (f < 0 || f >= durationInFrames * times) return null;
  const inner = <FrameContext.Provider value={f % durationInFrames}>{children}</FrameContext.Provider>;
  return layout === "none" ? inner : <AbsoluteFill style={style}>{inner}</AbsoluteFill>;
};

/** Its children held at `frame` (while active). */
export const Freeze: React.FC<{ frame: number; active?: boolean | ((f: number) => boolean); children?: React.ReactNode }> = ({ frame, active = true, children }) => {
  const f = useCurrentFrame();
  const on = typeof active === "function" ? active(f) : active;
  return on ? <FrameContext.Provider value={frame}>{children}</FrameContext.Provider> : <>{children}</>;
};

// ---- motion
type Extrapolate = "extend" | "clamp" | "identity" | "wrap";
type InterpolateOptions = { easing?: (t: number) => number; extrapolateLeft?: Extrapolate; extrapolateRight?: Extrapolate };
/** Maps `input` from inputRange onto outputRange, piece by piece, with an easing per piece; outside the range "extend" (default) goes on
 *  in the same line, "clamp" holds the end, "identity" returns the input, "wrap" starts the range again. */
export function interpolate(input: number, inputRange: readonly number[], outputRange: readonly number[], options: InterpolateOptions = {}): number {
  if (inputRange.length !== outputRange.length) throw new TypeError(`interpolate: inputRange (${inputRange.length}) and outputRange (${outputRange.length}) must have the same length`);
  if (inputRange.length < 2) throw new TypeError("interpolate: the ranges need at least 2 values");
  for (let i = 1; i < inputRange.length; i++) if (!(inputRange[i] > inputRange[i - 1])) throw new TypeError(`interpolate: inputRange must be strictly increasing, got [${inputRange.join(", ")}]`);
  for (const v of [...inputRange, ...outputRange]) if (typeof v !== "number" || Number.isNaN(v)) throw new TypeError("interpolate: the ranges must hold numbers");
  if (typeof input !== "number" || Number.isNaN(input)) throw new TypeError(`interpolate: input must be a number, got ${input}`);
  const { easing = (t: number) => t, extrapolateLeft = "extend", extrapolateRight = "extend" } = options;
  const first = inputRange[0], last = inputRange[inputRange.length - 1];
  let x = input;
  if (x < first) {
    if (extrapolateLeft === "identity") return x;
    if (extrapolateLeft === "clamp") x = first;
    if (extrapolateLeft === "wrap") x = first + ((((x - first) % (last - first)) + (last - first)) % (last - first));
  }
  if (x > last) {
    if (extrapolateRight === "identity") return x;
    if (extrapolateRight === "clamp") x = last;
    if (extrapolateRight === "wrap") x = first + ((x - first) % (last - first));
  }
  let i = 1;
  while (i < inputRange.length - 1 && x > inputRange[i]) i++;
  const a = inputRange[i - 1], b = inputRange[i];
  const t = (x - a) / (b - a);
  // inside the piece the easing shapes the progress; past the ends ("extend") the line goes on unshaped
  const e = t >= 0 && t <= 1 ? easing(t) : t;
  return outputRange[i - 1] + (outputRange[i] - outputRange[i - 1]) * e;
}

/** CSS colour → [r, g, b, a] (0-255, a 0-1): #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba(), hsl(), hsla(), a few names. */
const NAMED: Record<string, string> = { transparent: "#0000", black: "#000", white: "#fff", red: "#f00", green: "#008000", blue: "#00f", yellow: "#ff0", cyan: "#0ff", magenta: "#f0f", gray: "#808080", grey: "#808080", orange: "#ffa500" };
export function parseColor(c: string): [number, number, number, number] {
  const s = (NAMED[c.trim().toLowerCase()] ?? c).trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m && [3, 4, 6, 8].includes(m[1].length)) {
    const h = m[1].length <= 4 ? m[1].split("").map((x) => x + x).join("") : m[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(s);
  if (m) return [+m[1], +m[2], +m[3], m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4]];
  m = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(s);
  if (m) {
    const h = (+m[1] % 360) / 360, sat = +m[2] / 100, l = +m[3] / 100;
    const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat, p = 2 * l - q;
    const ch = (t: number) => { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p); };
    return [ch(h + 1 / 3), ch(h), ch(h - 1 / 3), m[4] == null ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4]];
  }
  throw new TypeError(`interpolateColors: cannot read the colour "${c}"`);
}
/** The colour at `input` between the colours of outputRange (each channel interpolated, clamped at both ends): "rgba(r, g, b, a)". */
export function interpolateColors(input: number, inputRange: readonly number[], outputRange: readonly string[]): string {
  if (inputRange.length !== outputRange.length) throw new TypeError("interpolateColors: inputRange and outputRange must have the same length");
  const cs = outputRange.map(parseColor);
  const ch = (k: number) => interpolate(input, inputRange, cs.map((c) => c[k]), { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return `rgba(${Math.round(ch(0))}, ${Math.round(ch(1))}, ${Math.round(ch(2))}, ${+ch(3).toFixed(3)})`;
}

export type SpringConfig = { damping: number; mass: number; stiffness: number; overshootClamping: boolean };
const SPRING: SpringConfig = { damping: 10, mass: 1, stiffness: 100, overshootClamping: false };
/** A damped spring from 0 to 1 after `t` seconds (the closed form of m x'' + c x' + k x = 0, starting at rest at 0, aiming at 1). */
function springAt(t: number, { damping: c, mass: m, stiffness: k }: SpringConfig): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k / m), zeta = c / (2 * Math.sqrt(k * m));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const s = w0 * Math.sqrt(zeta * zeta - 1), r1 = -zeta * w0 + s, r2 = -zeta * w0 - s;
  return 1 + (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r1 - r2);
}
/** The frames a spring takes to settle (within `threshold` of its end, and staying there). */
export function measureSpring({ fps, config = {}, threshold = 0.005 }: { fps: number; config?: Partial<SpringConfig>; threshold?: number }): number {
  const cfg = { ...SPRING, ...config };
  let last = 0;
  for (let f = 0; f < fps * 600; f++) if (Math.abs(springAt(f / fps, cfg) - 1) > threshold) last = f + 1;
  return last;
}
/** A spring's value at `frame` (from `from` to `to`), after `delay` frames; `durationInFrames` stretches it to settle on that frame;
 *  `reverse` plays it backwards; `overshootClamping` stops it at its end. */
export function spring({ frame, fps, config = {}, from = 0, to = 1, delay = 0, durationInFrames, reverse = false }: {
  frame: number; fps: number; config?: Partial<SpringConfig>; from?: number; to?: number; delay?: number; durationInFrames?: number; reverse?: boolean;
}): number {
  if (!(fps > 0)) throw new TypeError(`spring: fps must be positive, got ${fps}`);
  const cfg = { ...SPRING, ...config };
  if (!(cfg.mass > 0) || !(cfg.stiffness > 0) || !(cfg.damping >= 0)) throw new TypeError("spring: mass and stiffness must be positive, damping not negative");
  const natural = durationInFrames != null ? measureSpring({ fps, config: cfg }) : 0;
  let f = frame - delay;
  if (durationInFrames != null) {
    if (!(durationInFrames > 0)) throw new TypeError(`spring: durationInFrames must be positive, got ${durationInFrames}`);
    if (reverse) f = durationInFrames - f;
    f = (f / durationInFrames) * natural;
  } else if (reverse) f = natural - f;
  let p = springAt(f / fps, cfg);
  if (cfg.overshootClamping) p = Math.min(p, 1);
  return from + (to - from) * p;
}

/** Remotion's easing functions (the same shapes as React Native's Easing), each t in 0-1 → progress. */
const bezier = (x1: number, y1: number, x2: number, y2: number) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (s: number) => ((ax * s + bx) * s + cx) * s, Y = (s: number) => ((ay * s + by) * s + cy) * s, dX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) { const d = dX(s); if (Math.abs(d) < 1e-6) break; s -= (X(s) - t) / d; }
    if (s < 0 || s > 1 || Math.abs(X(s) - t) > 1e-6) { let lo = 0, hi = 1; s = t; for (let i = 0; i < 60; i++) { if (X(s) < t) lo = s; else hi = s; s = (lo + hi) / 2; } }
    return Y(s);
  };
};
export const Easing = {
  linear: (t: number) => t,
  ease: bezier(0.42, 0, 1, 1),
  quad: (t: number) => t * t,
  cubic: (t: number) => t * t * t,
  poly: (n: number) => (t: number) => Math.pow(t, n),
  sin: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  circle: (t: number) => 1 - Math.sqrt(1 - t * t),
  exp: (t: number) => Math.pow(2, 10 * (t - 1)),
  elastic: (bounciness = 1) => { const p = bounciness * Math.PI; return (t: number) => 1 - Math.pow(Math.cos((t * Math.PI) / 2), 3) * Math.cos(t * p); },
  back: (s = 1.70158) => (t: number) => t * t * ((s + 1) * t - s),
  bounce: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) { const u = t - 1.5 / 2.75; return 7.5625 * u * u + 0.75; }
    if (t < 2.5 / 2.75) { const u = t - 2.25 / 2.75; return 7.5625 * u * u + 0.9375; }
    const u = t - 2.625 / 2.75; return 7.5625 * u * u + 0.984375;
  },
  bezier,
  in: (e: (t: number) => number) => e,
  out: (e: (t: number) => number) => (t: number) => 1 - e(1 - t),
  inOut: (e: (t: number) => number) => (t: number) => (t < 0.5 ? e(t * 2) / 2 : 1 - e((1 - t) * 2) / 2),
};

/** A number in [0, 1) that is always the same for the same seed (a string or a number). Not Remotion's own sequence: the same seed
 *  gives a different number here than in Remotion. null throws, as Remotion asks for an explicit seed. */
export function random(seed: string | number | null): number {
  if (seed === null || seed === undefined) throw new TypeError("random: pass a seed (a string or a number) so every frame draws the same");
  let h = 2166136261 >>> 0;
  for (const ch of String(seed)) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 16777619) >>> 0; }
  // mulberry32 on the hash
  let x = (h + 0x6d2b79f5) >>> 0;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

// ---- layers
type DivProps = React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties };
/** A full-size layer over its parent: absolute, all four edges at 0, a column flex box (Remotion's AbsoluteFill). */
export const AbsoluteFill = React.forwardRef<HTMLDivElement, DivProps>(({ style, children, ...rest }, ref) => (
  <div ref={ref} {...rest} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", ...style }}>
    {children}
  </div>
));
AbsoluteFill.displayName = "AbsoluteFill";

/** An <img> the host waits for before READY (Remotion's Img waits the same way). */
export const Img = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(({ onLoad, onError, ...rest }, ref) => {
  const handle = React.useRef<number | null>(null);
  if (handle.current === null && typeof window !== "undefined") handle.current = delayRender(`Img ${rest.src ?? ""}`);
  const done = () => { if (handle.current !== null) { continueRender(handle.current); handle.current = -1; } };
  return <img ref={ref} {...rest} onLoad={(e) => { done(); onLoad?.(e); }} onError={(e) => { done(); onError?.(e); }} />;
});
Img.displayName = "Img";

// ---- media: HyperFrames places sound and video on its own timeline, so in the picture they are nothing
export const Audio: React.FC<Record<string, unknown>> = () => null;
export const Html5Audio = Audio;
export const Video: React.FC<Record<string, unknown>> = () => null;
export const OffthreadVideo = Video;
export const Html5Video = Video;

// ---- files
/** A file of the project's assets/ (Remotion's public/). */
export const staticFile = (p: string) => `assets/${String(p).replace(/^\/+/, "")}`;

// ---- waiting
const pending = new Map<number, string>();
let nextHandle = 1, failed: Error | null = null;
const waiters: (() => void)[] = [];
/** Hold READY until continueRender(handle) (fonts, images, data). */
export function delayRender(label = "") { const h = nextHandle++; pending.set(h, label); return h; }
export function continueRender(handle: number) {
  pending.delete(handle);
  if (!pending.size) waiters.splice(0).forEach((w) => w());
}
/** Stop the film with an error (it shows as a script error in HyperFrames' check). */
export function cancelRender(err: unknown): never { failed = err instanceof Error ? err : new Error(String(err)); throw failed; }
/** For the host: resolves when no delayRender handle is left, rejects after cancelRender. */
export function whenRendered(): Promise<void> {
  if (failed) return Promise.reject(failed);
  if (!pending.size) return Promise.resolve();
  return new Promise((ok) => waiters.push(ok));
}
export const pendingRenders = () => [...pending.values()];

// ---- Remotion Studio's registry: a film has one composition, the host's; these do nothing
export const Composition: React.FC<Record<string, unknown>> = () => null;
export const Still = Composition;
export const Folder: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;
export const registerRoot = (_root: unknown) => {};

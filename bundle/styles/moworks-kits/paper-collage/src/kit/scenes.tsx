// scenes.tsx — the building blocks of a paper-collage motion graphic. Every block takes the clock `t` (seconds) and
// the time of the beat it lands on, so each move hits on time. When to use each one, with code:
// .claude/skills/motion-graphic/references/RECIPES.md. Blocks that lay themselves out read the frame size, so they
// work at 9:16, 16:9 and 1:1.
//
//   page & sequence:  Page · SceneStack (scenes that tear in over each other) · DarkGrid · Centre
//   type:             Lockup (the big two-line phrase) · TitleCard · SourceLine
//   objects:          DropObject (a cut-out lands) · PhotoPrint (the user's photo on a torn print) · CtaButton
//   scenes:           PanelStack (a list) · PowerWordScene (the hook) · IdeaBurst · OrbitCards · FocusRow · LineChart
//   marks:            Stamp (a verdict stamp)
//   helpers:          gone / outK · REL · Gear / Bulb / Spark / PersonIcon
import React from "react";
import { AbsoluteFill, Img, getInputProps, staticFile, useVideoConfig } from "remotion";
import { Burst, Cutout, DottedPath, GridPaper, MarkerCircle, PrintFinish, RiseWord, TornPaper, TornSheet, TypeOn, V, VF, boil, clamp01, ease, kick, lerp, ramp, springAt } from "./collage";

export const REL: React.CSSProperties = { position: "relative" };
/** 0 → 1 over `d` s from `at` (ease-in) — feed it to `gone` for an exit */
export const outK = (t: number, at: number | undefined, d = 0.25) => (at === undefined ? 0 : ramp(t, at, at + d, ease.in));
/** the house exit: fade + blur (k 0 → 1) */
export const gone = (k: number): React.CSSProperties => (k > 0 ? { opacity: 1 - k, filter: `blur(${k * 16}px)` } : {});

// ── page & sequence ──────────────────────────────────────────────────────────────────────────────
/** the page: grid paper under the content, print grain + vignette over it. `transparent` drops both (for an overlay
 *  rendered with an alpha channel); `dark` uses the dark grid. For GIF exports (input prop `gif`) the grain holds
 *  still, so the GIF only stores what moves (≈ 3× smaller). */
export const Page: React.FC<{ t: number; transparent?: boolean; dark?: boolean; grain?: number; children?: React.ReactNode }> = ({ t, transparent, dark, grain = 0.3, children }) => {
  const gif = Boolean((getInputProps() as { gif?: boolean }).gif);
  return (
    <AbsoluteFill>
      {!transparent && (dark ? <DarkGrid /> : <GridPaper />)}
      {children}
      {!transparent && <PrintFinish t={gif ? 0 : t} grain={grain} vignette={0.14} />}
    </AbsoluteFill>
  );
};

/** the dark grid page — for power moments and endings (contrast against the paper scenes) */
export const DarkGrid: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      background: "#191816",
      backgroundImage: "linear-gradient(rgba(255,255,255,0.075) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.075) 2px, transparent 2px)",
      backgroundSize: "64px 64px",
      backgroundPosition: "-2px -2px",
    }}
  >
    {children}
  </AbsoluteFill>
);

export type Scene = {
  at: number; // when the scene starts (s) — its transition begins here
  enter?: "up" | "left" | "blur" | "cut"; // torn sheet from the bottom / from the right, a blur-in, or a hard cut
  seed?: number; // the torn edge's shape — give every scene its own
  edge?: string; // colour of the torn fibre edge (use "#d9d4c8" when the scene is dark)
  render: () => React.ReactNode;
};
/** scenes in a row: each new scene TEARS IN over the previous one (0.33 s), the previous one unmounts once covered.
 *  Scene 0 is on screen from frame 0. Alternate "up" and "left"; "tear" sound at each `at − 0.02`. */
export const SceneStack: React.FC<{ t: number; scenes: Scene[] }> = ({ t, scenes }) => {
  const T = 0.33;
  return (
    <>
      {scenes.map((s, i) => {
        const next = scenes[i + 1]?.at ?? Infinity;
        if (t < s.at || t >= next + T + 0.02) return null;
        const enter = i === 0 ? "cut" : s.enter ?? (i % 2 ? "left" : "up");
        if (enter === "cut") return <AbsoluteFill key={i}>{s.render()}</AbsoluteFill>;
        if (enter === "blur") {
          const k = ramp(t, s.at, s.at + 0.27, ease.out);
          return (
            <AbsoluteFill key={i} style={{ opacity: k, filter: k < 1 ? `blur(${(1 - k) * 18}px)` : undefined }}>
              {s.render()}
            </AbsoluteFill>
          );
        }
        return (
          <TornSheet key={i} k={ramp(t, s.at, s.at + T, ease.inOut)} dir={enter} seed={s.seed ?? 11 + i * 6} edge={s.edge}>
            {s.render()}
          </TornSheet>
        );
      })}
    </>
  );
};

/** centres its children horizontally at a given top y */
export const Centre: React.FC<{ y: number; children: React.ReactNode }> = ({ y, children }) => {
  const { width } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 0, top: y, width, display: "flex", justifyContent: "center" }}>
      <div style={REL}>{children}</div>
    </div>
  );
};

// ── type ─────────────────────────────────────────────────────────────────────────────────────────
export type LockupLine = { text: string; at: number; color?: string; highlight?: boolean; size?: number };
/** THE big phrase: one or two display lines rising on their beats, centred. Habit: first line red (the point),
 *  second line ink on the highlighter (CURIOUS / MIND). Sizes default to the frame (≈ 0.19 × width, max 230). */
export const Lockup: React.FC<{ t: number; fps: number; y: number; lines: LockupLine[]; gap?: number; out?: number }> = ({ t, fps, y, lines, gap = 1.08, out }) => {
  const { width } = useVideoConfig();
  let top = y;
  return (
    <>
      {lines.map((l, i) => {
        const size = l.size ?? Math.min(230, (width - 140) / Math.max(4, l.text.length * 0.5), width * 0.19);
        const el = (
          <Centre key={i} y={top}>
            <RiseWord
              text={l.text}
              t={t}
              at={l.at - 0.06}
              fps={fps}
              size={size}
              color={l.color ?? (i === 0 && lines.length > 1 ? V.red : V.ink)}
              stagger={l.text.length > 8 ? 0.022 : 0.028}
              highlight={l.highlight ? { at: l.at - 0.1, dur: 0.18 } : undefined}
              out={out}
              style={REL}
            />
          </Centre>
        );
        top += size * gap;
        return el;
      })}
    </>
  );
};

/** a typed eyebrow + a big title on a torn paper card (an opening card, a chapter card, a name) */
export const TitleCard: React.FC<{
  t: number;
  fps: number;
  eyebrow: string; // "CHAPTER ONE"
  title: string; // "THE MAP"
  titleAt: number; // when the title rises (s)
  x: number; // card left
  y: number; // card top
  outAt?: number;
  w?: number;
  titleSize?: number;
  inAt?: number; // < 0 = already arriving at frame 0
  seed?: number;
}> = ({ t, fps, eyebrow, title, titleAt, x, y, outAt, w, titleSize = 130, inAt = -0.25, seed = 3 }) => {
  if (outAt !== undefined && t > outAt + 0.3) return null;
  const p = springAt(t, inAt, fps, { damping: 13 });
  const cw = w ?? Math.max(eyebrow.length * 38 * 0.66 + 110, title.length * titleSize * 0.56 + 110);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translateY(${(1 - p) * 120}px) rotate(-2deg)`, opacity: clamp01((t - inAt) / 0.08), ...gone(outK(t, outAt)) }}>
      <TornPaper w={cw} h={titleSize + 100} seed={seed}>
        <TypeOn text={eyebrow} t={t} at={inAt + 0.13} cps={22} size={38} style={{ left: 48, top: 30, letterSpacing: "0.12em" }} />
        <RiseWord text={title} t={t} at={titleAt - 0.06} fps={fps} size={titleSize} color={V.red} style={{ left: 40, top: 72 }} />
      </TornPaper>
    </div>
  );
};

/** a tiny typewriter source / footnote line at the bottom-left — on every scene that shows a fact or a figure */
export const SourceLine: React.FC<{ t: number; at: number; text: string }> = ({ t, at, text }) => {
  const { width, height } = useVideoConfig();
  return <TypeOn text={text} t={t} at={at} cps={60} size={22} color={V.ink} style={{ left: Math.round(width * 0.065), top: height - 80, opacity: 0.8 }} />;
};

// ── objects ──────────────────────────────────────────────────────────────────────────────────────
/** a cut-out springs up onto the page on its beat (lifting shadow); optional paper slips fly out of it later */
export const DropObject: React.FC<{
  t: number;
  fps: number;
  src: string; // under public/, e.g. "library/book.png"
  at: number;
  x: number; // centre x
  y: number; // centre y
  w: number;
  outAt?: number;
  seed?: number;
  slipsAt?: number;
}> = ({ t, fps, src, at, x, y, w, outAt, seed = 7, slipsAt }) => {
  if (t < at - 0.1 || (outAt !== undefined && t > outAt + 0.35)) return null;
  const p = springAt(t, at - 0.05, fps, { damping: 12, stiffness: 150 });
  return (
    <div style={{ position: "absolute", inset: 0, ...gone(outK(t, outAt)) }}>
      {slipsAt !== undefined &&
        [0, 1, 2, 3, 4].map((i) => {
          const sAt = slipsAt + i * 0.09;
          const q = ramp(t, sAt, sAt + 0.7, ease.out);
          if (t < sAt) return null;
          const dx = (i - 2) * 120;
          return (
            <div key={i} style={{ position: "absolute", left: x + dx * q - 60, top: y - 70 - 260 * q, transform: `rotate(${(i - 2) * 9 * q}deg)`, opacity: 1 - ramp(t, sAt + 0.5, sAt + 0.9) }}>
              <TornPaper w={120} h={80} seed={20 + i}>
                {[0, 1, 2].map((r) => (
                  <div key={r} style={{ position: "absolute", left: 14, top: 16 + r * 18, width: 92 - r * 18, height: 6, borderRadius: 3, background: "#cfc8ba" }} />
                ))}
              </TornPaper>
            </div>
          );
        })}
      <Cutout src={src} x={x} y={y + (1 - p) * 220} w={w} rot={(1 - p) * 10 - 3} scale={0.85 + 0.15 * p} opacity={clamp01((t - at + 0.05) / 0.06)} lift={1 - p} t={t} seed={seed} />
    </div>
  );
};

/** the user's photo / screenshot on a torn white print that lands with a spring. `mono` (default) turns a PHOTO
 *  black-and-white with print contrast so it belongs to the page; a SCREENSHOT must be shown untouched: mono={false}. */
export const PhotoPrint: React.FC<{
  t: number;
  fps: number;
  src: string; // under public/
  at: number;
  x: number; // print left
  y: number; // print top
  w: number; // photo width
  h: number; // photo height
  rot?: number;
  mono?: boolean;
  caption?: string; // typewriter caption under the photo
  outAt?: number;
  seed?: number;
}> = ({ t, fps, src, at, x, y, w, h, rot = -2, mono = true, caption, outAt, seed = 41 }) => {
  if (t < at - 0.1 || (outAt !== undefined && t > outAt + 0.35)) return null;
  const p = springAt(t, at - 0.05, fps, { damping: 13, stiffness: 160 });
  const b = boil(t, seed, 0.6);
  const pad = 22;
  const capH = caption ? 64 : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + (1 - p) * 160,
        transform: `translate(${b.x}px, ${b.y}px) rotate(${rot + (1 - p) * 6 + b.r}deg) scale(${0.9 + 0.1 * p})`,
        opacity: clamp01((t - at + 0.05) / 0.06),
        ...gone(outK(t, outAt)),
      }}
    >
      <TornPaper w={w + pad * 2} h={h + pad * 2 + capH} seed={seed}>
        <Img src={staticFile(src)} style={{ position: "absolute", left: pad, top: pad, width: w, height: h, objectFit: "cover", filter: mono ? "grayscale(1) contrast(1.25) brightness(1.04)" : undefined }} />
        {caption && <TypeOn text={caption} t={t} at={at + 0.2} cps={40} size={28} style={{ left: pad, top: h + pad + 18 }} />}
      </TornPaper>
    </div>
  );
};

/** a red pill button that springs up on its beat; a cursor glides in and presses it 0.2 s later ("click" there) */
export const CtaButton: React.FC<{ t: number; fps: number; at: number; x: number; y: number; label?: string; outAt?: number; w?: number; h?: number; color?: string }> = ({
  t,
  fps,
  at,
  x,
  y,
  label = "FOLLOW",
  outAt,
  w = 520,
  h = 160,
  color = V.red,
}) => {
  const { width, height } = useVideoConfig();
  if (t < at - 0.15 || (outAt !== undefined && t > outAt + 0.45)) return null;
  const p = springAt(t, at - 0.12, fps, { damping: 12, stiffness: 180 });
  const press = at + 0.2;
  const down = t >= press ? Math.max(0, 1 - (t - press) / 0.14) : 0;
  const cur = ramp(t, at - 0.05, press, ease.inOut);
  return (
    <div style={{ position: "absolute", inset: 0, ...gone(outK(t, outAt, 0.2)) }}>
      <div
        style={{
          position: "absolute",
          left: x,
          top: y + (1 - p) * 200,
          width: w,
          height: h,
          borderRadius: h / 2,
          background: color,
          boxShadow: `0 ${14 - 10 * down}px ${26 - 14 * down}px rgba(20,14,6,0.35)`,
          transform: `scale(${(0.8 + 0.2 * p) * (1 - 0.07 * down)})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: h * 0.16,
          opacity: clamp01((t - at + 0.15) / 0.06),
        }}
      >
        <div style={{ fontFamily: VF.caps, fontSize: h * 0.65, color: V.white, lineHeight: 1 }}>+</div>
        <div style={{ fontFamily: VF.caps, fontSize: h * 0.6, color: V.white, lineHeight: 1, letterSpacing: "0.04em" }}>{label}</div>
      </div>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <g transform={`translate(${x + w + 80 - 280 * cur} ${y + h * 2 - 210 * cur}) scale(${1 - 0.12 * down})`} opacity={clamp01((t - at + 0.05) / 0.1)}>
          <path d="M 0 0 L 0 62 L 16 47 L 27 72 L 39 66 L 28 42 L 49 42 Z" fill={V.white} stroke={V.ink} strokeWidth={4} strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
};

// ── scenes ───────────────────────────────────────────────────────────────────────────────────────
export type Panel = {
  at: number; // its beat (s)
  label: string; // "HISTORY"
  img?: string; // a cut-out under public/ …
  imgW?: number; // … and its width in the panel (9:16 scale)
  glyph?: string; // … or a big serif glyph instead ("?")
  color?: string; // label colour (red = the odd one out / the point)
};
/** a LIST: a typed eyebrow + one torn panel per item, landing on its beat. Portrait and square frames stack panels
 *  top to bottom (sliding in from alternating sides); landscape puts them side by side (rising in). 2–4 items. */
export const PanelStack: React.FC<{ t: number; fps: number; eyebrow: string; eyebrowAt: number; items: Panel[]; from?: number; to?: number }> = ({
  t,
  fps,
  eyebrow,
  eyebrowAt,
  items,
  from,
  to,
}) => {
  const { width: W, height: H } = useVideoConfig();
  const tall = H >= W;
  const drift = from !== undefined && to !== undefined ? 1 + 0.03 * ramp(t, from, to, ease.inOut) : 1;
  const n = items.length;
  const region = 0.75 * H; // y 0.17 H … 0.92 H
  const ph = tall ? Math.min(0.23 * H, (region - (n - 1) * 60) / n) : 0.56 * H;
  const pw = tall ? W - 180 : (W - 220 - (n - 1) * 50) / n;
  const top0 = tall ? 0.17 * H + (region - (n * ph + (n - 1) * 60)) / 2 : 0.28 * H;
  const s = tall ? Math.min(1, ph / 440) : 1;
  return (
    <AbsoluteFill style={{ transform: `scale(${drift})`, transformOrigin: `${W / 2}px ${H / 2}px` }}>
      <TypeOn text={eyebrow} t={t} at={eyebrowAt - 0.04} cps={22} size={tall ? 44 : 40} style={{ left: Math.round(W * (tall ? 0.085 : 0.057)), top: Math.round(H * (tall ? 0.1 : 0.14)), letterSpacing: "0.14em" }} />
      {items.map((pn, i) => {
        if (t < pn.at - 0.1) return null;
        const p = springAt(t, pn.at - 0.1, fps, { damping: 12, stiffness: 160 });
        const side = i % 2 === 0 ? -1 : 1;
        const left = tall ? 90 + side * (W + 20) * (1 - p) : 110 + i * (pw + 50);
        const top = tall ? top0 + i * (ph + 60) : top0 + (1 - p) * H * 0.85;
        const imgLeft = i % 2 === 0;
        const imgBox = 350 * s;
        const labelSize = tall ? Math.min(pn.label.length > 7 ? 112 : 130, ph * 0.46, (pw - imgBox - 120) / (pn.label.length * 0.5)) : Math.min(130, (pw - 60) / (pn.label.length * 0.5));
        const media = pn.img ? (
          <Img src={staticFile(pn.img)} style={{ width: (pn.imgW ?? 300) * s, maxHeight: tall ? ph - 60 : ph * 0.55, objectFit: "contain", filter: "drop-shadow(3px 6px 4px rgba(20,14,6,0.25))" }} />
        ) : (
          <div style={{ fontFamily: VF.serif, fontStyle: "italic", fontWeight: 800, fontSize: (tall ? ph : ph * 0.62) * 0.75, lineHeight: 1, color: V.red }}>{pn.glyph ?? "?"}</div>
        );
        return (
          <div key={i} style={{ position: "absolute", left, top, transform: `rotate(${[-2, 1.5, -1.5, 1.2][i % 4] + (1 - p) * 6 * side}deg)` }}>
            <TornPaper w={pw} h={ph} seed={50 + i}>
              {tall ? (
                <>
                  <div style={{ position: "absolute", top: 30, height: ph - 60, left: imgLeft ? 30 : pw - 30 - imgBox, width: imgBox, display: "flex", alignItems: "center", justifyContent: "center" }}>{media}</div>
                  <div style={{ position: "absolute", top: 0, height: ph, left: imgLeft ? 50 + imgBox : 50, width: pw - imgBox - 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <RiseWord text={pn.label} t={t} at={pn.at + 0.02} fps={fps} size={labelSize} color={pn.color ?? V.ink} style={REL} />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ position: "absolute", top: 30, height: ph * 0.62, left: 0, width: pw, display: "flex", alignItems: "center", justifyContent: "center" }}>{media}</div>
                  <div style={{ position: "absolute", top: ph * 0.66, height: ph * 0.3, left: 0, width: pw, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <RiseWord text={pn.label} t={t} at={pn.at + 0.02} fps={fps} size={labelSize} color={pn.color ?? V.ink} style={REL} />
                  </div>
                </>
              )}
            </TornPaper>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** the POWER MOMENT (the hook / the twist): a dark grid page, the lead typed slowly in white, then the power word
 *  SLAMS on a yellow highlighter over a burst, with a short shake and a red flash. Sound: "stamp" −4 dB + "impact"
 *  −11 dB together at wordAt − 0.06. Keep the word ≤ 8 characters. */
export const PowerWordScene: React.FC<{ t: number; fps: number; lead: string; leadAt: number; word: string; wordAt: number; wordSize?: number }> = ({ t, fps, lead, leadAt, word, wordAt, wordSize }) => {
  const { width, height } = useVideoConfig();
  const size = wordSize ?? Math.min(250, (width - 120) / (word.length * 0.52));
  const slam = springAt(t, wordAt - 0.02, fps, { damping: 8, stiffness: 240 });
  const hit = t >= wordAt - 0.02;
  const shake = hit ? kick(t, wordAt - 0.02, 9, 9) : 0;
  const flash = hit ? 1 - ramp(t, wordAt - 0.02, wordAt + 0.16) : 0;
  const burst = springAt(t, wordAt - 0.04, fps, { damping: 10, stiffness: 200 });
  const wordTop = height / 2 - size * 0.56;
  return (
    <DarkGrid>
      <AbsoluteFill style={{ transform: `translate(${shake * 16}px, ${shake * -10}px) rotate(${shake * 0.8}deg)` }}>
        <Centre y={wordTop - Math.min(260, height * 0.22)}>
          <TypeOn text={lead} t={t} at={leadAt} cps={11} size={Math.min(120, width * 0.11)} color={V.white} style={{ ...REL, letterSpacing: "0.16em" }} />
        </Centre>
        {hit && <Burst x={width / 2} y={height / 2} r={Math.min(430, width * 0.4)} t={t} seed={4} scale={0.3 + 0.7 * burst} opacity={0.9} />}
        {t >= wordAt - 0.16 && (
          <div style={{ position: "absolute", left: 0, top: wordTop, width, display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", transform: `scale(${1.35 - 0.35 * slam}) rotate(-3deg)` }}>
              <RiseWord text={word} t={t} at={wordAt - 0.04} fps={fps} size={size} color={V.ink} stagger={0.02} highlight={{ at: wordAt - 0.16, dur: 0.12 }} style={REL} />
            </div>
          </div>
        )}
      </AbsoluteFill>
      {flash > 0 && <AbsoluteFill style={{ background: V.red, opacity: 0.4 * flash, mixBlendMode: "screen" }} />}
    </DarkGrid>
  );
};

// glyphs drawn in code
export const Gear: React.FC<{ s: number }> = ({ s }) => {
  const teeth = 9;
  const pts: string[] = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2;
    const r = i % 4 < 2 ? 50 : 40;
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return (
    <svg width={s} height={s} viewBox="-55 -55 110 110" style={{ overflow: "visible" }}>
      <polygon points={pts.join(" ")} fill={V.ink} />
      <circle r={16} fill={V.paper} />
    </svg>
  );
};
export const Bulb: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s * 1.3} viewBox="-50 -60 100 130" style={{ overflow: "visible" }}>
    <path d="M -22 22 C -46 2, -38 -50, 0 -52 C 38 -50, 46 2, 22 22 L 20 36 L -20 36 Z" fill={V.yellow} stroke={V.ink} strokeWidth={6} strokeLinejoin="round" />
    <rect x={-20} y={40} width={40} height={10} rx={3} fill={V.ink} />
    <rect x={-16} y={54} width={32} height={9} rx={3} fill={V.ink} />
    <path d="M -10 24 L -10 4 L 0 12 L 10 4 L 10 24" fill="none" stroke={V.ink} strokeWidth={4} strokeLinejoin="round" />
  </svg>
);
export const Spark: React.FC<{ s: number }> = ({ s }) => (
  <svg width={s} height={s} viewBox="-50 -50 100 100" style={{ overflow: "visible" }}>
    <path d="M 0 -48 L 12 -12 L 48 0 L 12 12 L 0 48 L -12 12 L -48 0 L -12 -12 Z" fill={V.yellow} stroke={V.ink} strokeWidth={5} strokeLinejoin="round" />
  </svg>
);
/** a person, drawn as a simple ink figure (head + shoulders) — crowds, "one in five", the viewer */
export const PersonIcon: React.FC<{ s: number; color?: string }> = ({ s, color = V.ink }) => (
  <svg width={s} height={s * 1.25} viewBox="-50 -62 100 125" style={{ overflow: "visible" }}>
    <circle cx={0} cy={-30} r={24} fill={color} />
    <path d="M -44 62 C -44 18, -26 4, 0 4 C 26 4, 44 18, 44 62 Z" fill={color} />
  </svg>
);

export type Idea = { kind: "bulb" | "q" | "gear" | "spark"; dx: number; dy: number; s: number; rot?: number; d: number };
/** the approved burst: a bulb on top, question marks, gears and sparks fanning up and out */
export const IDEAS: Idea[] = [
  { kind: "bulb", dx: 10, dy: -330, s: 150, d: 0.0 },
  { kind: "q", dx: -300, dy: -250, s: 190, rot: -14, d: 0.04 },
  { kind: "gear", dx: 270, dy: -270, s: 130, d: 0.07 },
  { kind: "q", dx: 360, dy: -60, s: 140, rot: 12, d: 0.1 },
  { kind: "spark", dx: -380, dy: -40, s: 80, d: 0.08 },
  { kind: "gear", dx: -170, dy: -350, s: 90, d: 0.13 },
  { kind: "spark", dx: 180, dy: -370, s: 64, d: 0.15 },
  { kind: "q", dx: -440, dy: -330, s: 110, rot: -6, d: 0.17 },
];
/** ideas BURST out of one point (the top of a head, a book, a box) on a beat, then float. Sound: "pop". */
export const IdeaBurst: React.FC<{ t: number; fps: number; at: number; x: number; y: number; items?: Idea[]; scale?: number }> = ({ t, fps, at, x, y, items = IDEAS, scale = 1 }) => (
  <>
    {items.map((it, i) => {
      const iat = at + it.d;
      if (t < iat) return null;
      const p = springAt(t, iat, fps, { damping: 10, stiffness: 170 });
      const b = boil(t, 300 + i, 1.2);
      const float = Math.sin((t - iat) * 2.2 + i) * 8;
      const s = it.s * scale;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x + it.dx * scale * p,
            top: y + it.dy * scale * p + float,
            transform: `translate(-50%, -50%) translate(${b.x}px, ${b.y}px) rotate(${(it.rot ?? 0) + (1 - p) * 40 + (it.kind === "gear" ? (t - iat) * 60 : 0)}deg) scale(${0.3 + 0.7 * p})`,
            opacity: clamp01((t - iat) / 0.05),
          }}
        >
          {it.kind === "q" && <div style={{ fontFamily: VF.serif, fontStyle: "italic", fontWeight: 800, fontSize: s, lineHeight: 1, color: V.red }}>?</div>}
          {it.kind === "gear" && <Gear s={s} />}
          {it.kind === "bulb" && <Bulb s={s} />}
          {it.kind === "spark" && <Spark s={s} />}
        </div>
      );
    })}
  </>
);

export type OrbitItem = { img?: string; w?: number; glyph?: string; a0: number };
/** a red dotted orbit draws around a centre object (pass it as `centre`), then small torn cards pop onto the orbit
 *  and travel along it — "the world is full of …", "everything connects to …" */
export const OrbitCards: React.FC<{
  t: number;
  fps: number;
  id: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  drawAt: number;
  at: number;
  items: OrbitItem[];
  centre?: React.ReactNode;
  speed?: number;
}> = ({ t, fps, id, cx, cy, rx, ry, drawAt, at, items, centre, speed = 0.35 }) => {
  const d = `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy}`;
  return (
    <>
      <DottedPath d={d} k={ramp(t, drawAt, drawAt + 0.7, ease.inOut)} id={id} dot={10} gap={24} />
      {centre}
      {items.map((m, i) => {
        const iat = at + i * 0.09;
        if (t < iat) return null;
        const p = springAt(t, iat, fps, { damping: 11, stiffness: 190 });
        const a = m.a0 + (t - iat) * speed;
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry;
        return (
          <div key={i} style={{ position: "absolute", left: x - 85, top: y - 85, transform: `scale(${0.3 + 0.7 * p}) rotate(${(i % 2 ? 6 : -6) * p}deg)`, opacity: clamp01((t - iat) / 0.05), zIndex: Math.sin(a) > 0 ? 2 : 0 }}>
            <TornPaper w={170} h={170} seed={80 + i}>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {m.img ? (
                  <Img src={staticFile(m.img)} style={{ width: m.w ?? 120 }} />
                ) : (
                  <div style={{ fontFamily: VF.serif, fontStyle: "italic", fontWeight: 800, fontSize: 130, color: V.red, lineHeight: 1 }}>{m.glyph ?? "?"}</div>
                )}
              </div>
            </TornPaper>
          </div>
        );
      })}
    </>
  );
};

/** the FOCUS MOVE: a row of people pops in; on `at` the others slide ASIDE sideways and dim, the chosen one lifts,
 *  and a red marker circle hugs just that one. Sound: "circle" when the circle draws. No arrow. */
export const FocusRow: React.FC<{
  t: number;
  fps: number;
  inAt: number; // the row pops in from here
  at: number; // the focus beat
  count: number;
  chosen: number; // index of the singled-out one
  y: number; // centre y of the row
  size?: number; // figure width
  label?: string; // optional typewriter tag under the chosen one ("YOU")
}> = ({ t, fps, inAt, at, count, chosen, y, size = 120, label }) => {
  const { width } = useVideoConfig();
  const gap = Math.min(size * 1.35, (width - 160) / count);
  const x0 = width / 2 - ((count - 1) * gap) / 2;
  const f = springAt(t, at, fps, { damping: 14, stiffness: 140 });
  const cx = x0 + chosen * gap;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const p = springAt(t, inAt + i * 0.05, fps, { damping: 12, stiffness: 190 });
        if (t < inAt + i * 0.05) return null;
        const d = i - chosen;
        const push = d === 0 ? 0 : Math.sign(d) * (130 - Math.min(60, Math.abs(d) * 12)) * f;
        const dim = d === 0 ? 1 : 1 - 0.45 * f;
        const lift = d === 0 ? 1 + 0.08 * f : 1;
        const b = boil(t, 500 + i, 0.6);
        return (
          <div key={i} style={{ position: "absolute", left: x0 + i * gap + push - size / 2, top: y - size * 0.62 + (1 - p) * 60, opacity: clamp01((t - inAt - i * 0.05) / 0.06) * dim, transform: `translate(${b.x}px, ${b.y}px) scale(${(0.6 + 0.4 * p) * lift})` }}>
            <PersonIcon s={size} color={d === 0 && f > 0.5 ? V.red : V.ink} />
          </div>
        );
      })}
      <MarkerCircle cx={cx} cy={y} rx={size * 0.78} ry={size * 0.92} t={t} at={at + 0.35} dur={0.34} width={5} />
      {label && t >= at + 0.5 && <TypeOn text={label} t={t} at={at + 0.5} cps={20} size={34} style={{ left: cx - label.length * 11, top: y + size * 0.95, letterSpacing: "0.12em" }} />}
    </>
  );
};


// ── marks & data ─────────────────────────────────────────────────────────────────────────────────
/** a rubber-stamp verdict ("PROJECTED", "BIGGEST BILL", "MYTH"): red caps in a red frame, rotated, slamming from
 *  1.6× to 1× on its beat. Never let it cover the number it qualifies. Sound: "stamp". */
export const Stamp: React.FC<{ t: number; fps: number; at: number; text: string; x: number; y: number; size?: number; rot?: number; color?: string }> = ({
  t,
  fps,
  at,
  text,
  x,
  y,
  size = 54,
  rot = -8,
  color = V.red,
}) => {
  if (t < at - 0.02) return null;
  const p = springAt(t, at - 0.02, fps, { damping: 9, stiffness: 260 });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${1.6 - 0.6 * p})`,
        opacity: clamp01((t - at + 0.02) / 0.05) * 0.92,
        border: `${Math.max(4, size * 0.09)}px solid ${color}`,
        borderRadius: size * 0.12,
        padding: `${size * 0.12}px ${size * 0.3}px ${size * 0.06}px`,
        fontFamily: VF.caps,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "0.06em",
        color,
        whiteSpace: "nowrap",
        mixBlendMode: "multiply",
      }}
    >
      {text}
    </div>
  );
};

export type ChartPoint = { x: number; y: number }; // e.g. { x: 1990, y: 3.2 }
/** a REAL-DATA line chart that draws itself like a story: ink axes, named x labels, the red line drawn by a pen that
 *  carries an x bubble (the year), event markers popping as the pen passes, a dot on the end. Data must be real and
 *  sourced (add a SourceLine). Sound: "marker-long" while it draws, "chip" on event markers (only the important ones). */
export const LineChart: React.FC<{
  t: number;
  fps: number;
  data: ChartPoint[];
  from: number; // the line starts drawing (s)
  dur: number; // drawing time (s)
  box: { x: number; y: number; w: number; h: number }; // plot area in frame px
  yMax: number;
  yMin?: number;
  xTicks: number[]; // the x values to name under the axis (e.g. years)
  yTicks?: number[];
  yFormat?: (v: number) => string; // "$20T"
  events?: { x: number; label: string }[];
  bubble?: (x: number) => string; // the pen's bubble text (default: rounded x)
  color?: string;
}> = ({ t, fps, data, from, dur, box, yMax, yMin = 0, xTicks, yTicks = [], yFormat = (v) => String(v), events = [], bubble = (x) => String(Math.round(x)), color = V.red }) => {
  const x0 = data[0].x;
  const x1 = data[data.length - 1].x;
  const X = (x: number) => box.x + ((x - x0) / (x1 - x0)) * box.w;
  const Y = (y: number) => box.y + box.h - ((y - yMin) / (yMax - yMin)) * box.h;
  const k = ramp(t, from, from + dur, ease.inOut);
  const penX = lerp(x0, x1, k);
  // points up to the pen (interpolate the last segment)
  const pts: [number, number][] = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].x <= penX) pts.push([X(data[i].x), Y(data[i].y)]);
    else {
      const a = data[i - 1];
      const b = data[i];
      const f = (penX - a.x) / (b.x - a.x);
      pts.push([X(penX), Y(lerp(a.y, b.y, f))]);
      break;
    }
  }
  const pen = pts[pts.length - 1];
  const axisIn = ramp(t, from - 0.5, from - 0.1, ease.out);
  return (
    <>
      <svg width={box.x + box.w + 200} height={box.y + box.h + 120} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {yTicks.map((v, i) => (
          <line key={i} x1={box.x} x2={box.x + box.w * axisIn} y1={Y(v)} y2={Y(v)} stroke={V.ink} strokeOpacity={0.12} strokeWidth={2} />
        ))}
        <line x1={box.x} x2={box.x + box.w * axisIn} y1={box.y + box.h} y2={box.y + box.h} stroke={V.ink} strokeWidth={4} strokeLinecap="round" />
        <line x1={box.x} x2={box.x} y1={box.y + box.h} y2={box.y + box.h - box.h * axisIn} stroke={V.ink} strokeWidth={4} strokeLinecap="round" />
        {pts.length > 1 && <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />}
        {t >= from && <circle cx={pen[0]} cy={pen[1]} r={11} fill={color} stroke={V.white} strokeWidth={4} />}
      </svg>
      {xTicks.map((x, i) => (
        <div key={i} style={{ position: "absolute", left: X(x), top: box.y + box.h + 16, transform: "translateX(-50%)", fontFamily: VF.type, fontSize: 26, color: V.ink, opacity: axisIn * (x <= penX + (x1 - x0) * 0.02 || k === 0 ? 1 : 0.35) }}>
          {x}
        </div>
      ))}
      {yTicks.map((v, i) => (
        <div key={i} style={{ position: "absolute", left: box.x - 16, top: Y(v), transform: "translate(-100%, -50%)", fontFamily: VF.type, fontSize: 24, color: V.ink, opacity: axisIn * 0.8 }}>
          {yFormat(v)}
        </div>
      ))}
      {events.map((e, i) => {
        if (penX < e.x) return null;
        const at = from + ((e.x - x0) / (x1 - x0)) * dur;
        const p = springAt(t, at, fps, { damping: 12, stiffness: 200 });
        const ex = X(e.x);
        const lift = 70 + (i % 2) * 54; // stagger the leaders so labels never collide
        return (
          <div key={i} style={{ position: "absolute", left: ex, top: box.y - lift, transform: `translateX(-50%) scale(${0.6 + 0.4 * p})`, opacity: clamp01((t - at) / 0.08), textAlign: "center" }}>
            <div style={{ fontFamily: VF.type, fontSize: 24, background: V.white, padding: "4px 10px", boxShadow: "1px 3px 3px rgba(20,14,6,0.25)", whiteSpace: "nowrap" }}>{e.label}</div>
            <div style={{ width: 2, height: lift - 30, margin: "0 auto", background: V.ink, opacity: 0.5 }} />
          </div>
        );
      })}
      {t >= from && k < 1.0001 && (
        <div style={{ position: "absolute", left: pen[0], top: pen[1] - 64, transform: "translateX(-50%)", fontFamily: VF.caps, fontSize: 34, color: V.white, background: V.ink, padding: "4px 12px", borderRadius: 6 }}>{bubble(penX)}</div>
      )}
    </>
  );
};

/** re-exported so a graphic can import most of what it needs from one place */
export { Cutout, GridPaper, PrintFinish, RiseWord, TypeOn, V, VF, springAt, ramp, ease, clamp01 };

// The model sheet and the checks of a What If character (owner #1287-#1293: MW Character Sheet v1): the app's own episode, drawn by FreshStack's What If
// engine as shipped (its Hero, its KitDefs) with the app's cast layer (wi-cast.tsx: the back view, the laugh, angry and talk faces, the poses), in a
// small staged project (wi-page.mjs copies this file to whatif/episode.tsx with __ID__ and __SHIPPED__ filled in, and the character's file to
// whatif/cast/__ID__.ts). Seconds 0-24: the sheet's 24 cells, one a second (views, faces, poses, the walk's phases, the two hands; wi-page.mjs lays them on the one sheet frame); 24-30: the life clip (idle with a
// blink, a turn through the views, a walk, a talk). The name and the labels are the sheet's only text (#1290). The gate's lines are worked out when
// the page loads (window.__wiLines, window.__wiRecord).
import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { useCurrentFrame } from "remotion";
import { KitDefs, LOOKS, FONT, basePose, walkPose, LEG_LEN, type Look, type Pose } from "what-if";
import { AppHero, STANDARD_FACES, POSES, posed, talkFace } from "mw:wi-cast";
import { CHARACTER } from "./cast/__ID__";

const ID = "__ID__";
const SHIPPED: boolean = __SHIPPED__;
const FPS = 30, LIFE_S = 6, W = 1920, H = 1080, FLOOR = 900;
const C: any = CHARACTER;
/** The sheet draws every character at 1.7 times its scale on the rig, so the sizes keep to one another (Sis smaller than Pip). */
const K = 1.7, S = (Number(C?.scale) > 0 ? Number(C.scale) : 0.82) * K, look: Look = C?.look;
const ROWS = [
  { title: "Views", cols: ["front", "three-quarter", "profile", "back"] },
  { title: "Faces", cols: Object.keys(STANDARD_FACES) },
  { title: "Poses", cols: ["stand", "walk", "point", "wave", "reach", "sit"] },
  { title: "Walk", cols: ["contact", "pass", "contact", "pass"] },
  { title: "Hands", cols: ["open", "point"] },
];
/** The sheet's cells one a second, the character alone in the middle (the one sheet frame of every engine; wi-page.mjs cuts each still's
 *  middle into its cell). */
const CELLS = ROWS.flatMap((r) => r.cols.map((col, i) => ({ row: r.title, col, i }))), ROWS_S = CELLS.length;
const hipY = (s: number) => FLOOR - LEG_LEN * s;
const colX = (_i: number, _n: number) => W / 2;

function Figure({ row, col, i, n }: { row: string; col: string; i: number; n: number }) {
  const x = colX(i, n), y = hipY(S);
  if (row === "Views") {
    const yaw = [0, 0.62, 1, 0][i];
    return <AppHero look={look} pose={{ ...basePose, x, y, scale: S, yaw, look: yaw * 0.6 }} view={col === "back" ? "back" : "front"} />;
  }
  if (row === "Faces") return <AppHero look={look} pose={{ ...basePose, x, y, scale: S, blink: col === "blink" ? 1 : 0 }} face={STANDARD_FACES[col]} />;
  if (row === "Poses") {
    if (col === "walk") return <AppHero look={look} pose={walkPose(x, 1.2, FLOOR, S)} />;
    return (
      <g>
        {col === "sit" ? <rect x={x - 40 * S} y={hipY(S) + 72 * S + 6 * S} width={66 * S} height={LEG_LEN * S - 78 * S} rx={8} fill="#6B4E3A" stroke={look.line} strokeWidth={4} /> : null}
        <AppHero look={look} pose={posed(col, x, y, S)} face={(POSES[col]?.expr as any) ?? "neutral"} />
      </g>
    );
  }
  if (row === "Hands") {
    // the hand close: the figure larger, its upper body in the cell, the right hand in that shape (open: the wave; point: the point)
    const k = S * 1.6, px = col === "point" ? x - 190 : x - 40;
    return <AppHero look={look} pose={posed(col === "open" ? "wave" : "point", px, hipY(k) + 330, k)} face="neutral" />;
  }
  return <AppHero look={look} pose={walkPose(x, (i * Math.PI) / 2, FLOOR, S)} />;
}

function Main() {
  const f = useCurrentFrame(), T = f / FPS;
  const bg = (
    <>
      <rect width={W} height={H} fill="#2A2438" />
      <rect y={FLOOR + 4} width={W} height={H - FLOOR} fill="#3A3248" />
    </>
  );
  if (!look) return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>{bg}</svg>;
  if (T < ROWS_S) {
    const cell = CELLS[Math.floor(T)];
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <KitDefs />
        {bg}
        <Figure row={cell.row} col={cell.col} i={cell.i} n={1} />
      </svg>
    );
  }
  // the life clip: idle with a blink, a turn (front, three-quarter, profile, back), a walk on the spot, a talk with a wave
  const t = T - ROWS_S, x = W / 2, y = hipY(S);
  let el: React.ReactNode;
  if (t < 1.5) el = <AppHero look={look} pose={{ ...basePose, x, y: y + 3 * Math.sin(t * 5), scale: S, blink: t > 0.8 && t < 0.95 ? 1 : 0 }} />;
  else if (t < 3.5) { const k = Math.min(3, Math.floor((t - 1.5) / 0.5)); el = <AppHero look={look} pose={{ ...basePose, x, y, scale: S, yaw: [0, 0.62, 1, 0][k] }} view={k === 3 ? "back" : "front"} face={t > 2.2 && t < 3 ? "happy" : "neutral"} />; }
  else if (t < 5) el = <AppHero look={look} pose={walkPose(x, (t - 3.5) * 9, FLOOR, S)} />;
  else el = <AppHero look={look} pose={posed("wave", x, y, S, { armR: { a: 150, b: 35 + 18 * Math.sin(t * 9) } })} face={talkFace(t)} />;
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}><KitDefs />{bg}{el}</svg>;
}

export default { id: `sheet-${ID}`, total: (ROWS_S + LIFE_S) * FPS, Main };

// ---- the gate, worked out once the page loads
const HEX = /^#[0-9a-f]{6}$/i;
const KEYS = ["skin", "skinShade", "hand", "jacket", "jacketShade", "accent", "limb", "line", "shoe", "face", "hair"];
const EXTRAS = ["hood", "curls", "bunches", "bob", "suit"];
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dist = (a: string, b: string) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
function gate(): string[] {
  const out: string[] = [], ok = (pass: boolean, what: string, why = "") => out.push(`${pass ? "PASS" : "FAIL"}  ${what}${!pass && why ? `: ${why}` : ""}`);
  ok(!!C && typeof C === "object", "the file exports CHARACTER");
  if (!C) return out;
  ok(C.id === ID, "the character's id is its file's name", `id "${C.id}", file "${ID}"`);
  ok(typeof C.name === "string" && C.name.trim().length > 0 && C.name.length <= 40, "a name of 1-40 letters");
  ok(typeof C.about === "string" && C.about.trim().length >= 10 && C.about.length <= 300, "about: one line on who it is (10-300 letters)");
  ok(Number(C.heightM) >= 0.5 && Number(C.heightM) <= 2.3, "its real height in metres (heightM, 0.5-2.3)", `heightM ${C.heightM}`);
  ok(Number(C.scale) >= 0.5 && Number(C.scale) <= 1.2, "its size on the rig (scale, 0.5-1.2: the cast is 0.68-0.82)", `scale ${C.scale}`);
  const L = C.look ?? {};
  const bad = KEYS.filter((k) => !HEX.test(String(L[k] ?? "")));
  ok(!bad.length, "look: every colour of the rig's Look as #rrggbb", bad.join(", "));
  ok(L.extra == null || EXTRAS.includes(L.extra), `look: an extra piece the rig draws, or none (${EXTRAS.join(", ")})`, `extra ${L.extra}`);
  const cast = Object.entries(LOOKS as Record<string, Look>);
  if (SHIPPED) ok(ID.startsWith("moworks-"), "a shipped character's id takes the prefix moworks-");
  else {
    const same = cast.find(([, x]) => KEYS.every((k) => String((x as any)[k]).toLowerCase() === String(L[k]).toLowerCase()) && (x.extra ?? null) === (L.extra ?? null));
    ok(!same, "an original: not one of the rig's own looks", same ? `it is ${same[0]}` : "");
    const near = HEX.test(String(L.jacket ?? "")) ? cast.find(([, x]) => dist(x.jacket, L.jacket) < 30 && (x.extra ?? null) === (L.extra ?? null)) : null;
    ok(!near, "a jacket colour and piece none of the cast wears together (contrast)", near ? `too close to ${near[0]}` : "");
  }
  // every view, face and pose of the sheet draws (the rig and the app's layer, rendered off screen)
  const host = document.createElement("div"), root = createRoot(host), broken: string[] = [];
  const tries: [string, React.ReactNode][] = [
    ...["front", "back"].map((v) => [v, <AppHero look={L} pose={{ ...basePose, scale: S }} view={v as any} />] as [string, React.ReactNode]),
    ...Object.entries(STANDARD_FACES).map(([k, e]) => [k, <AppHero look={L} pose={{ ...basePose, scale: S }} face={e} />] as [string, React.ReactNode]),
    ...Object.keys(POSES).map((k) => [k, <AppHero look={L} pose={posed(k, 960, 600, S)} />] as [string, React.ReactNode]),
    ["walk", <AppHero look={L} pose={walkPose(960, 1, FLOOR, S)} />],
  ];
  for (const [n, el] of tries) { try { flushSync(() => root.render(<svg>{el}</svg>)); if (!host.querySelector("g")) broken.push(n); } catch (e) { broken.push(`${n}: ${String((e as Error)?.message ?? e).split("\n")[0]}`); } }
  root.unmount();
  ok(!broken.length, "every view (front, three-quarter, profile, back), face and pose of the sheet draws", broken.join("; "));
  return out;
}
try { (window as any).__wiLines = gate(); } catch (e) { (window as any).__wiLines = [`FAIL  the checks ran: ${String((e as Error)?.message ?? e).split("\n")[0]}`]; }
(window as any).__wiRecord = C ? { id: C.id ?? null, name: C.name ?? null, about: C.about ?? null, heightM: Number(C.heightM) || null, scale: Number(C.scale) || null, look: C.look ?? null } : null;

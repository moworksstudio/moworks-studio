// What If's characters outside a film (owner #1287-#1293: MW Character Sheet v1): the character checks (the gate), the model sheet and the life clip, for
// the Character creator's lab (tools/wi-check.mjs, tools/wi-sheet.mjs), a film's character gate and the tests. A character is one TypeScript module,
// characters/<id>.ts, exporting CHARACTER = { id, name, about, heightM, scale, look } where look is the rig's Look (its colours and one extra piece).
// It is drawn by FreshStack's engine as shipped with the app's cast layer (wi-cast.tsx): a small staged What If film of the app's wi-sheet.tsx, finished
// as every What If film is (finalize: whatIfBuild.mjs) and opened on HyperFrames' own page (its stills; the gate's lines read from the page). Only
// folders made here are removed.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_ROOT } from "../version-manager/index.mjs";
import { ffmpegExe } from "../looks-library/index.mjs";
import { openFilmPage } from "../hf-qa/filmPage.mjs";
import { snapshotAtAsync } from "../hf-qa/cli.mjs";
import { cellsOf, composeSheet } from "../character-kit/sheet-compose.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SHEET = join(HERE, "wi-sheet.tsx");
/** The sheet's cells, one a second of wi-sheet.tsx (the character alone), in the one sheet frame's order; the life clip the 6 s after them. */
export const SHEET_ROWS = Object.freeze([
  { title: "Views", cols: ["front", "three-quarter", "profile", "back"] },
  { title: "Faces", cols: ["neutral", "happy", "laugh", "surprised", "worried", "angry", "talk", "blink"] },
  { title: "Poses", cols: ["stand", "walk", "point", "wave", "reach", "sit"] },
  { title: "Walk", cols: ["contact", "pass", "contact", "pass"] },
  { title: "Hands", cols: ["open", "point"] },
]);
export const ROWS_S = SHEET_ROWS.reduce((a, r) => a + r.cols.length, 0), LIFE_S = 6, LIFE_FPS = 15;
const CELL_CROP = { x: 640, y: 0, w: 640, h: 1078 };
/** What a What If character's rig really drives in a film (MW Character Sheet v1), kept in its character.json as `can`. */
export const CAN = Object.freeze({
  views: ["front", "three-quarter", "profile", "back"],
  viewNotes: "the rig's own yaw (-1 profile left, 0 front, 1 profile right); back is the app's (AppHero view \"back\", mw:wi-cast)",
  faces: ["neutral", "happy", "laugh", "surprised", "worried", "angry", "talk", "blink"],
  faceNotes: "the rig's Expr (happy, shock = surprised, worried, smug, oops, cool, dizzy, tired) and the app's laugh, angry and talk (AppHero face)",
  poses: ["stand", "walk", "point", "wave", "reach", "sit"],
  poseNotes: "limb angles on the rig's Pose (armL, armR, legL, legR), POSES from mw:wi-cast; the walk is the engine's walkPose; poseAt keys",
  hands: ["open", "point"],
  walk: "walkPose(x, phase, ground, scale) in profile",
  talk: "talkFace(t): the open mouth and the closed one by turns; no lip sync",
});
/** The palette a record shows: the Look's main colours. */
export const paletteOf = (look) => Object.fromEntries(["jacket", "skin", "hair", "accent", "shoe"].filter((k) => look?.[k]).map((k) => [k, look[k]]));
const ID = /^[a-z][a-z0-9-]*$/;
const ff = (root, args) => new Promise((ok) => execFile(ffmpegExe(root), ["-v", "error", "-y", ...args], { windowsHide: true }, (e) => ok(!e)));
const PAGE = (dur) => `<!doctype html><html><head><meta charset="utf-8"></head><body><div id="main" data-composition-id="main" data-start="0" data-duration="${dur}" data-width="1920" data-height="1080" data-fps="30">
<div id="stage" class="clip" data-start="0" data-duration="${dur}" data-track-index="1"></div></div><script src="compositions/whatif/film.js"></script></body></html>\n`;

/** A staged What If project for one character file, finished: { dir, id, report, close() }. */
export async function stageCharacter(file, { root = APP_ROOT } = {}) {
  const id = basename(file).replace(/\.tsx?$/, "");
  if (!ID.test(id)) throw Object.assign(new Error(`${basename(file)}: a character's file is characters/<id>.ts, its id lower-case letters, digits and dashes`), { code: "INVALID" });
  const dir = mkdtempSync(join(tmpdir(), "mw-wi-"));
  const close = () => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* left in temp */ } };
  try {
    mkdirSync(join(dir, ".moworks"), { recursive: true });
    writeFileSync(join(dir, ".moworks", "project.json"), JSON.stringify({ name: `sheet-${id}`, style: { id: "what-if" } }));
    writeFileSync(join(dir, "hyperframes.json"), `{ "name": "sheet-${id}" }\n`);
    writeFileSync(join(dir, "index.html"), PAGE(ROWS_S + LIFE_S));
    mkdirSync(join(dir, "whatif", "cast"), { recursive: true });
    cpSync(file, join(dir, "whatif", "cast", `${id}.ts`));
    writeFileSync(join(dir, "whatif", "episode.tsx"), readFileSync(SHEET, "utf8").replaceAll("__ID__", id).replaceAll("__SHIPPED__", String(id.startsWith("moworks-"))));
    const { finalize } = await import("../hf-edit/finalize.mjs");
    const report = await finalize(dir);
    return { dir, id, report, close };
  } catch (e) { close(); throw e; }
}

function textLines(src) {
  const out = [], ok = (c, t, why) => out.push(c ? `PASS  ${t}` : `FAIL  ${t}${why ? `: ${why}` : ""}`);
  const from = [...src.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((m) => m[1]), odd = from.filter((p) => p !== "what-if");
  ok(!odd.length, 'imports only the What If engine ("what-if")', odd.join(", "));
  ok(/\bexport\s+const\s+CHARACTER\b/.test(src), "one export: CHARACTER");
  ok(!/\b(Math\.random|Date\.now|performance\.now|new Date)\b/.test(src), "deterministic: no random numbers, no clock");
  ok(!/<text\b|fillText/.test(src), "no words on the character (a film writes its own; never a brand)");
  ok(!/\b(fetch|XMLHttpRequest|import\s*\()/.test(src), "nothing loaded from elsewhere");
  return out;
}

/** The checks of one character file (the gate): { id, passed, failed, lines, record: { id, name, about, heightM, scale, look } }. */
export async function checkCharacter(file, { root = APP_ROOT, open = openFilmPage } = {}) {
  const lines = textLines(readFileSync(file, "utf8"));
  let record = null, st = null;
  try {
    st = await stageCharacter(file, { root });
    const err = st.report?.whatIf?.error;
    if (err || !st.report?.whatIf) lines.push(`FAIL  the file builds with the What If engine: ${err ?? "nothing to build"}`);
    else {
      lines.push("PASS  the file builds with the What If engine");
      const errors = [];
      const page = await open(st.dir, { beforeLoad: (tab) => tab.on("pageerror", (e) => errors.push(String(e?.message ?? e).split("\n")[0])) });
      try {
        await page.tab.waitForFunction(() => Array.isArray(window.__wiLines), { timeout: 120000, polling: 250 });
        const got = await page.tab.evaluate(() => ({ lines: window.__wiLines, record: window.__wiRecord ?? null }));
        lines.push(...got.lines);
        record = got.record;
      } catch { lines.push(`FAIL  the checks ran: ${errors[0] ?? "the page gave no result"}`); }
      finally { await page.close(); }
    }
  } catch (e) { lines.push(`FAIL  the checks ran: ${String(e?.message ?? e).split("\n")[0]}`); }
  finally { st?.close(); }
  const failed = lines.filter((l) => l.startsWith("FAIL")).length;
  return { id: basename(file).replace(/\.tsx?$/, ""), passed: lines.length - failed, failed, lines, record };
}

async function stills(st, seconds, out) {
  mkdirSync(out, { recursive: true });
  if (st.report?.whatIf?.error) throw new Error(`The character does not build: ${st.report.whatIf.error}`);
  const r = await snapshotAtAsync(st.dir, seconds, out, { belowNormal: false, timeoutMs: 600000 });
  const pngs = readdirSync(out).filter((f) => /^frame-.*\.png$/i.test(f)).sort();
  if (r.exitCode !== 0 || pngs.length < seconds.length) throw new Error(`HyperFrames did not take the stills (${pngs.length} of ${seconds.length}): ${(r.stderrTail ?? []).join(" ").slice(0, 300)}`);
  return pngs.map((f) => join(out, f));
}
/** The model sheet as one PNG on the one sheet frame every engine keeps: a still a cell, laid out by composeSheet. */
export async function drawSheet(file, out, { root = APP_ROOT } = {}) {
  const st = await stageCharacter(file, { root });
  try {
    const cells = cellsOf(SHEET_ROWS), shots = await stills(st, cells.map((c) => c.index + 0.5), join(st.dir, "sheet"));
    mkdirSync(dirname(out), { recursive: true });
    const name = /\bname\s*:\s*["'`]([^"'`]+)["'`]/.exec(readFileSync(file, "utf8"))?.[1] ?? st.id;
    const rows = SHEET_ROWS.map((r) => ({ title: r.title, items: cells.filter((c) => c.row === r.title).map((c) => ({ label: c.label, file: shots[c.index] })) }));
    return await composeSheet({ name, rows, crop: CELL_CROP, colours: { ground: "#211c2e", cell: "#2A2438", ink: "#F6EFE3" } }, out, { root });
  } finally { st.close(); }
}
/** The life clip's frames (frame-0000.png …, LIFE_FPS, 6 s: idle with a blink, a turn, a walk, a talk) into `dir`. */
export async function drawLife(file, dir, { root = APP_ROOT } = {}) {
  const st = await stageCharacter(file, { root });
  try {
    const n = LIFE_S * LIFE_FPS, times = Array.from({ length: n }, (_, i) => +(ROWS_S + (i + 0.5) / LIFE_FPS).toFixed(4));
    const shots = await stills(st, times, join(st.dir, "life"));
    mkdirSync(dir, { recursive: true });
    shots.forEach((p, i) => cpSync(p, join(dir, `frame-${String(i).padStart(4, "0")}.png`)));
    return dir;
  } finally { st.close(); }
}

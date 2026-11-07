// 3D Cartoon's characters outside a film (owner #1267, audit/111 B6): the character checks (the gate), the model sheet and the life clip, for the
// Character creator's lab (tools/c3-check.mjs, tools/c3-sheet.mjs), a film's character gate and the tests. A character is one TypeScript module,
// characters/<id>.ts, exporting CHARACTER = { id, name, about, heightM, def (the source skill's CharDef), build() } where build() makes it with
// the source skill's own buildCharacter (and its costume and accessories, in the source skill's way: character-builder's SKILL.md). It is drawn by
// the source skill as shipped: a small staged project (a 3D Cartoon film of the app's c3d-sheet.tsx) bundled as every 3D Cartoon film is
// (build.mjs) and opened on HyperFrames' own page (its stills; the check twin with ?skill-check=1). Only folders made here are removed.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_ROOT } from "../version-manager/index.mjs";
import { ffmpegExe } from "../looks-library/index.mjs";
import { openFilmPage } from "../hf-qa/filmPage.mjs";
import { snapshotAtAsync } from "../hf-qa/cli.mjs";
import { placeStyle } from "./index.mjs";
import { cellsOf, composeSheet } from "../character-kit/sheet-compose.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const SHEET = join(HERE, "c3d-sheet.tsx");
/** The sheet's film (c3d-sheet.tsx): its 22 cells take seconds 0-22, one a second (the character alone, c3d-sheet.tsx CELLS), the life clip
 *  the 6 after them, taken at this rate. SHEET_ROWS: the cells in that order, for the one sheet frame (../character-kit/sheet-frame.js). */
export const SHEET_ROWS = Object.freeze([
  { title: "Views", cols: ["front", "three-quarter", "profile", "back"] },
  { title: "Faces", cols: ["neutral", "happy", "laugh", "surprised", "worried", "angry", "talk", "blink"] },
  { title: "Poses", cols: ["stand", "walk", "point", "wave", "reach", "sit"] },
  { title: "Walk", cols: ["contact", "pass", "contact", "pass"] },
]);
export const ROWS_S = SHEET_ROWS.reduce((a, r) => a + r.cols.length, 0), LIFE_S = 6, LIFE_FPS = 15;
/** The part of each 1920 x 1080 still a cell keeps: the middle, the cell's own shape (292 x 492), the full height. */
const CELL_CROP = { x: 640, y: 0, w: 640, h: 1078 };
/** MW Character Sheet v1 (owner #1287-#1293): what a 3D Cartoon character's rig really drives in a film, kept in its character.json as `can`. */
export const CAN = Object.freeze({
  views: "any angle (a 3D rig): front, three-quarter, profile, back and between",
  faces: ["neutral", "happy", "laugh", "surprised", "worried", "angry", "talk", "blink", "calm", "eager"],
  faceNotes: "happy = the source skill's smile, surprised = alarmed, worried = wince; laugh and angry are the app's (mw:c3d-cast setFace)",
  poses: ["stand", "walk", "point", "wave", "reach", "sit"],
  poseNotes: "setPose with the source skill's STAND, SIT, walkPose, mixPose; poseReach and legIK (two-bone IK); POINT and WAVE from mw:c3d-cast",
  hands: "n/a: hand spheres, gripping a prop at its userData.grip",
  walk: "walkPose(phase) with legIK for planted feet",
  talk: "one open mouth (talk), flapped by talkFace(t); no lip sync",
});
/** The palette a record shows: the CharDef's own colours. */
export const paletteOf = (def) => Object.fromEntries(["top", "skin", "hair"].filter((k) => def?.[k]).map((k) => [k, def[k]]));
const ID = /^[a-z][a-z0-9-]*$/;
const ff = (root, args) => new Promise((ok) => execFile(ffmpegExe(root), ["-v", "error", "-y", ...args], { windowsHide: true }, (e) => ok(!e)));

/** A staged 3D Cartoon project for one character file: { dir, id, build, close() }. */
export async function stageCharacter(file, { root = APP_ROOT } = {}) {
  const id = basename(file).replace(/\.ts$/, "");
  if (!ID.test(id)) throw Object.assign(new Error(`${basename(file)}: a character's file is characters/<id>.ts, its id lower-case letters, digits and dashes`), { code: "INVALID" });
  const dir = mkdtempSync(join(tmpdir(), "mw-c3d-"));
  const close = () => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* left in temp */ } };
  try {
    mkdirSync(join(dir, ".moworks"), { recursive: true });
    writeFileSync(join(dir, ".moworks", "project.json"), JSON.stringify({ name: `sheet-${id}`, style: { id: "cartoon-3d" } }));
    writeFileSync(join(dir, "hyperframes.json"), `{ "name": "sheet-${id}" }\n`);
    const page = readFileSync(join(HERE, "scaffold", "cartoon-3d", "index.html"), "utf8").replace(/data-duration="[\d.]+"/, `data-duration="${ROWS_S + LIFE_S}"`);
    writeFileSync(join(dir, "index.html"), page);
    mkdirSync(join(dir, "src", "videos", "film", "cast"), { recursive: true });
    cpSync(file, join(dir, "src", "videos", "film", "cast", `${id}.ts`));
    writeFileSync(join(dir, "src", "videos", "film", "Video.tsx"), readFileSync(SHEET, "utf8").replaceAll("__ID__", id).replaceAll("__SHIPPED__", String(id.startsWith("moworks-"))));
    const placed = await placeStyle(dir, "index.html", { root, force: true });
    return { dir, id, build: placed?.build ?? null, close };
  } catch (e) { close(); throw e; }
}

/** What the file is, read as text: its own lines of the gate. */
function textLines(src) {
  const out = [], ok = (c, t, why) => out.push(c ? `PASS  ${t}` : `FAIL  ${t}${why ? `: ${why}` : ""}`);
  const from = [...src.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((m) => m[1]), odd = from.filter((p) => p !== "three" && !/^cartoon-3d\/kit\/[\w/-]+$/.test(p));
  ok(!odd.length, 'imports only three and the source skill\'s kit ("cartoon-3d/kit/…")', odd.join(", "));
  ok(/\bexport\s+const\s+CHARACTER\b/.test(src), "one export: CHARACTER");
  ok(!/\b(Math\.random|Date\.now|performance\.now|new Date)\b/.test(src), "deterministic: no random numbers, no clock");
  ok(!/\b(fillText|strokeText)\s*\(/.test(src), "no words on the character (a film writes its own; never a brand)");
  ok(!/\b(fetch|XMLHttpRequest|import\s*\()/.test(src), "nothing loaded from elsewhere");
  return out;
}

/** The checks of one character file (the gate): { id, passed, failed, lines: ["PASS  …" | "FAIL  …"], record: { id, name, about, heightM, def } }. */
export async function checkCharacter(file, { root = APP_ROOT, open = openFilmPage } = {}) {
  const src = readFileSync(file, "utf8"), lines = textLines(src);
  let record = null, st = null;
  try {
    st = await stageCharacter(file, { root });
    if (!st.build || st.build.error) lines.push(`FAIL  the file builds with the source skill's code: ${st.build?.error ?? "nothing to build"}`);
    else {
      lines.push("PASS  the file builds with the source skill's code");
      const errors = [];
      let got = { record: null };
      const page = await open(st.dir, { query: "?skill-check=1", beforeLoad: (tab) => tab.on("pageerror", (e) => errors.push(String(e?.message ?? e).split("\n")[0])) });
      try {
        await page.tab.waitForFunction(() => window.READY === true || !!window.__skillError || Array.isArray(window.__c3Lines), { timeout: 120000, polling: 250 });
        // the record as the page built it (a shipped character's CharDef is the source skill's CAST.<name>, not a literal in its file)
        got = await page.tab.evaluate(() => ({ lines: window.__c3Lines ?? null, record: window.__c3Record ?? null, error: window.__skillError ?? null }));
        if (got.lines) lines.push(...got.lines); else lines.push(`FAIL  the checks ran: ${got.error ?? errors[0] ?? "nothing came back"}`);
      } finally { await page.close(); }
      const m = /export\s+const\s+CHARACTER\s*=\s*\{([\s\S]*?)\bbuild\b/.exec(src)?.[1] ?? "";
      const str = (k) => new RegExp(`\\b${k}\\s*:\\s*["'\`]([^"'\`]*)["'\`]`).exec(m)?.[1] ?? null;
      record = got.record ?? { id: str("id"), name: str("name"), about: str("about"), heightM: Number(/\bheightM\s*:\s*([\d.]+)/.exec(m)?.[1]) || null,
        def: Object.fromEntries(["top", "skin", "hair", "style"].map((k) => [k, new RegExp(`\\b${k}\\s*:\\s*["']([^"']+)["']`).exec(src)?.[1] ?? null])) };
    }
  } catch (e) { lines.push(`FAIL  the checks ran: ${String(e?.message ?? e).split("\n")[0]}`); }
  finally { st?.close(); }
  const failed = lines.filter((l) => l.startsWith("FAIL")).length;
  return { id: basename(file).replace(/\.ts$/, ""), passed: lines.length - failed, failed, lines, record };
}

/** Stills of the staged film at these seconds, in order: [png paths] in `out`. */
async function stills(st, seconds, out) {
  mkdirSync(out, { recursive: true });
  // finished as every film is (R-LEMO's bridge on the page: HyperFrames' time drives the frame), then HyperFrames' own stills
  const { finalize } = await import("../hf-edit/finalize.mjs");
  const rep = await finalize(st.dir);
  if (rep?.filmStyle?.error) throw new Error(`The character does not build: ${rep.filmStyle.error}`);
  const r = await snapshotAtAsync(st.dir, seconds, out, { belowNormal: false, timeoutMs: 600000 });
  const pngs = readdirSync(out).filter((f) => /^frame-.*\.png$/i.test(f)).sort();
  if (r.exitCode !== 0 || pngs.length < seconds.length) throw new Error(`HyperFrames did not take the stills (${pngs.length} of ${seconds.length}): ${(r.stderrTail ?? []).join(" ").slice(0, 300)}`);
  return pngs.map((f) => join(out, f));
}

/** The model sheet as one PNG on the one sheet frame every engine keeps: a still a cell, laid out by composeSheet (Hands n/a: hand spheres). */
export async function drawSheet(file, out, { root = APP_ROOT } = {}) {
  const st = await stageCharacter(file, { root });
  try {
    if (!st.build || st.build.error) throw new Error(`The character does not build: ${st.build?.error ?? "nothing to build"}`);
    const cells = cellsOf(SHEET_ROWS), shots = await stills(st, cells.map((c) => c.index + 0.5), join(st.dir, "sheet"));
    mkdirSync(dirname(out), { recursive: true });
    const name = /\bname\s*:\s*["'`]([^"'`]+)["'`]/.exec(readFileSync(file, "utf8"))?.[1] ?? st.id;
    const rows = SHEET_ROWS.map((r) => ({ title: r.title, items: cells.filter((c) => c.row === r.title).map((c) => ({ label: c.label, file: shots[c.index] })) }));
    return await composeSheet({ name, rows, crop: CELL_CROP, colours: { ground: "#f3ead8", cell: "#efe3cc", ink: "#241726" } }, out, { root });
  } finally { st.close(); }
}

/** The life clip's frames (frame-0000.png …, LIFE_FPS, 6 s: idle with a blink, a turn, a walk, a talk) into `dir`. */
export async function drawLife(file, dir, { root = APP_ROOT } = {}) {
  const st = await stageCharacter(file, { root });
  try {
    if (!st.build || st.build.error) throw new Error(`The character does not build: ${st.build?.error ?? "nothing to build"}`);
    const n = LIFE_S * LIFE_FPS, times = Array.from({ length: n }, (_, i) => +(ROWS_S + (i + 0.5) / LIFE_FPS).toFixed(4));
    const shots = await stills(st, times, join(st.dir, "life"));
    mkdirSync(dir, { recursive: true });
    shots.forEach((p, i) => cpSync(p, join(dir, `frame-${String(i).padStart(4, "0")}.png`)));
    return dir;
  } finally { st.close(); }
}

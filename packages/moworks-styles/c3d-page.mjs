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

const HERE = dirname(fileURLToPath(import.meta.url));
export const SHEET = join(HERE, "c3d-sheet.tsx");
/** The life clip: seconds 3-7 of the sheet's film, at this rate. */
export const LIFE_FPS = 15;
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
    const page = readFileSync(join(HERE, "scaffold", "cartoon-3d", "index.html"), "utf8").replace(/data-duration="[\d.]+"/, 'data-duration="7"');
    writeFileSync(join(dir, "index.html"), page);
    mkdirSync(join(dir, "src", "videos", "film", "cast"), { recursive: true });
    cpSync(file, join(dir, "src", "videos", "film", "cast", `${id}.ts`));
    writeFileSync(join(dir, "src", "videos", "film", "Video.tsx"), readFileSync(SHEET, "utf8").replaceAll("__ID__", id));
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
      const page = await open(st.dir, { query: "?skill-check=1", beforeLoad: (tab) => tab.on("pageerror", (e) => errors.push(String(e?.message ?? e).split("\n")[0])) });
      try {
        await page.tab.waitForFunction(() => window.READY === true || !!window.__skillError || Array.isArray(window.__c3Lines), { timeout: 120000, polling: 250 });
        const got = await page.tab.evaluate(() => ({ lines: window.__c3Lines ?? null, error: window.__skillError ?? null }));
        if (got.lines) lines.push(...got.lines); else lines.push(`FAIL  the checks ran: ${got.error ?? errors[0] ?? "nothing came back"}`);
      } finally { await page.close(); }
      const m = /export\s+const\s+CHARACTER\s*=\s*\{([\s\S]*?)\bbuild\b/.exec(src)?.[1] ?? "";
      const str = (k) => new RegExp(`\\b${k}\\s*:\\s*["'\`]([^"'\`]*)["'\`]`).exec(m)?.[1] ?? null;
      record = { id: str("id"), name: str("name"), about: str("about"), heightM: Number(/\bheightM\s*:\s*([\d.]+)/.exec(m)?.[1]) || null,
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

/** The model sheet (views, faces, poses: one row each) as one PNG. */
export async function drawSheet(file, out, { root = APP_ROOT } = {}) {
  const st = await stageCharacter(file, { root });
  try {
    if (!st.build || st.build.error) throw new Error(`The character does not build: ${st.build?.error ?? "nothing to build"}`);
    const rows = await stills(st, [0.5, 1.5, 2.5], join(st.dir, "sheet"));
    mkdirSync(dirname(out), { recursive: true });
    if (!(await ff(root, [...rows.flatMap((r) => ["-i", r]), "-filter_complex", "[0][1][2]vstack=inputs=3", out]))) throw new Error("The sheet's rows could not be put together");
    return out;
  } finally { st.close(); }
}

/** The life clip's frames (frame-0000.png …, LIFE_FPS, 4 s: a turn, then a walk) into `dir`. */
export async function drawLife(file, dir, { root = APP_ROOT } = {}) {
  const st = await stageCharacter(file, { root });
  try {
    if (!st.build || st.build.error) throw new Error(`The character does not build: ${st.build?.error ?? "nothing to build"}`);
    const n = 4 * LIFE_FPS, times = Array.from({ length: n }, (_, i) => +(3 + (i + 0.5) / LIFE_FPS).toFixed(4));
    const shots = await stills(st, times, join(st.dir, "life"));
    mkdirSync(dir, { recursive: true });
    shots.forEach((p, i) => cpSync(p, join(dir, `frame-${String(i).padStart(4, "0")}.png`)));
    return dir;
  } finally { st.close(); }
}

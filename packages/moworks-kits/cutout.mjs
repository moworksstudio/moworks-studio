// Paper Collage's cut-outs (owner 04/11/2026 #946): the kit's own image tools, run by the app as shipped (bundle/styles/moworks-kits/
// paper-collage/tools): cutout.py takes a flat green or white background out of a picture (or re-shapes a transparent PNG's edge), trims it
// and sizes it; halftone.py turns it into the look's cut-out, a black-and-white halftone print with a thin white paper edge (IMAGES.md §1).
// The owner's picture is never changed: each run writes a NEW file in the film's assets/graphics/cutouts/ (staticFile("graphics/cutouts/…"))
// and a row in its INDEX.md (the kit's library index: the file, what it was made from, how, the day). Python is the app's (setup/python.mjs:
// numpy and pillow, already app components). Only a Paper Collage film (its page's data-kit), through Claude's paper_cutout tool.
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { APP_ROOT, loadPins } from "../version-manager/index.mjs";
import { pyLibs, pythonExe } from "../setup/python.mjs";
import { pageKit } from "./index.mjs";

export const CUTOUT_STYLE = "paper-collage";
export const CUTOUT_DIR = "assets/graphics/cutouts";
const IMAGE = /\.(png|jpe?g|webp)$/i;
const kitTools = (root) => join(loadPins(root).moworksKits?.root ?? join(root, "bundle", "styles", "moworks-kits"), "paper-collage", "tools");
const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "cutout";
const inside = (dir, p) => { const r = relative(dir, p); return !!r && !r.startsWith("..") && !/^[a-zA-Z]:/.test(r); };

/** Run one of the kit's scripts as shipped with the app's Python (its libraries on the path; -I: nothing from the folder it runs in). */
function runKit(root, script, args, { timeoutMs = 120000 } = {}) {
  const exe = pythonExe(root);
  if (!exe) return Promise.resolve({ ok: false, error: "Python is not set up on this computer (Settings › System)" });
  const file = join(kitTools(root), script), cwd = mkdtempSync(join(tmpdir(), "mw-cutout-"));
  const code = "import os, sys, runpy\np = os.environ.get('MW_PYLIBS')\nif p and os.path.isdir(p): sys.path.insert(0, p)\nsys.argv = sys.argv[1:]\nrunpy.run_path(sys.argv[0], run_name='__main__')";
  return new Promise((done) => execFile(exe, ["-I", "-B", "-c", code, file, ...args],
    { cwd, env: { ...process.env, MW_PYLIBS: pyLibs(root), PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" }, windowsHide: true, timeout: timeoutMs, maxBuffer: 4 << 20 },
    (err, stdout, stderr) => {
      rmSync(cwd, { recursive: true, force: true });
      const out = String(stdout ?? "").trim(), bad = /^✗ /m.exec(out);
      if (err || bad) done({ ok: false, out, error: bad ? out.split("\n").find((l) => l.startsWith("✗")).slice(2) : (String(stderr ?? "").trim().split(/\r?\n/).pop() || err.message) });
      else done({ ok: true, out });
    }));
}

/** Make a cut-out of one picture of the film. file: its path in the project (the owner's, never changed). mode: "halftone" (the look's
 *  cut-out: background out, then the halftone print with its paper edge) or "clean" (background out only, its colours kept: a picture shown
 *  as it is). key: auto | none | green | white (cutout.py). cell / angle / border / max: halftone.py's. name: the new file's name.
 *  Returns { ok, file (project-relative), from, key, size } or { ok: false, error }. */
export async function makeCutout(projectDir, { file, mode = "halftone", key = "auto", cell, angle, border, max, name } = {}, { root = APP_ROOT } = {}) {
  let html = ""; try { html = readFileSync(join(projectDir, "index.html"), "utf8"); } catch { /* checked below */ }
  if (pageKit(html) !== CUTOUT_STYLE) return { ok: false, error: "Cut-outs are the Paper Collage style's own: this film is not a Paper Collage film" };
  const dir = resolve(projectDir), src = resolve(dir, String(file ?? ""));
  if (!file || !inside(dir, src)) return { ok: false, error: "Give the picture's path in the project, e.g. assets/images/globe.png" };
  if (!existsSync(src) || !statSync(src).isFile()) return { ok: false, error: `${file}: there is no such file in the project` };
  if (!IMAGE.test(src)) return { ok: false, error: `${file}: a PNG, JPEG or WebP picture only` };
  if (!["halftone", "clean"].includes(mode)) return { ok: false, error: "mode is halftone or clean" };
  if (!["auto", "none", "green", "white"].includes(key)) return { ok: false, error: "key is auto, none, green or white" };
  const num = (v, lo, hi) => (v == null ? null : Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Number(v))) : null);
  const outDir = join(dir, ...CUTOUT_DIR.split("/"));
  mkdirSync(outDir, { recursive: true });
  // a new file, never the original: a name of its own, numbered when taken
  const stem = slug(name || basename(src, extname(src))) + (mode === "clean" ? "-clean" : "");
  let out = join(outDir, `${stem}.png`);
  for (let i = 2; existsSync(out) || resolve(out) === src; i++) out = join(outDir, `${stem}-${i}.png`);
  const tmp = mkdtempSync(join(tmpdir(), "mw-cut-")), cut = join(tmp, "cut.png");
  try {
    const m = num(max, 200, 2400);
    const c = await runKit(root, "cutout.py", [src, mode === "clean" ? out : cut, "--key", key, ...(m ? ["--max", String(m)] : [])]);
    if (!c.ok) return { ok: false, error: `The kit's cutout.py: ${c.error}` };
    const used = /--key (\w+)/.exec(c.out)?.[1] ?? key;
    if (mode === "halftone") {
      const extra = [["--cell", num(cell, 3, 40)], ["--angle", num(angle, -90, 90)], ["--border", num(border, 0, 60)], ["--max", m]].filter(([, v]) => v != null).flatMap(([k, v]) => [k, String(Math.round(v * 100) / 100)]);
      const h = await runKit(root, "halftone.py", [cut, out, ...extra]);
      if (!h.ok) return { ok: false, error: `The kit's halftone.py: ${h.error}` };
    }
    if (!existsSync(out)) return { ok: false, error: "The kit's tools wrote no picture" };
    const rel = relative(dir, out).split(sep).join("/"), from = relative(dir, src).split(sep).join("/");
    const size = sizeOf(out);
    // the kit's library index (public/library/INDEX.md's columns), beside the cut-outs
    const index = join(outDir, "INDEX.md");
    if (!existsSync(index)) writeFileSync(index, "# Cut-outs\n\nMade by the Paper Collage kit's own tools (tools/cutout.py, tools/halftone.py) from the film's pictures, which stay as they were.\n\n| File | Made from | How | Date |\n|---|---|---|---|\n");
    appendFileSync(index, `| ${basename(out)} | ${from} | ${mode === "halftone" ? "cutout.py, halftone.py" : "cutout.py"} (--key ${used}) | ${new Date().toISOString().slice(0, 10)} |\n`);
    return { ok: true, file: rel, from, mode, key: used, keyed: used !== "none" || hasAlpha(src), size };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

/** Whether a picture has transparency of its own (what cutout.py's --key none keeps): a PNG with an alpha channel or a tRNS chunk, a WebP
 *  with alpha; never a JPEG. */
export function hasAlpha(file) {
  const b = readFileSync(file);
  if (b.length > 26 && b.toString("ascii", 1, 4) === "PNG") return b[25] === 4 || b[25] === 6 || b.includes("tRNS");
  if (b.length > 30 && b.toString("ascii", 8, 12) === "WEBP") return b.includes("ALPH") || (b.toString("ascii", 12, 16) === "VP8X" && (b[20] & 0x10) !== 0) || b.toString("ascii", 12, 16) === "VP8L";
  return false;
}
/** A PNG's size from its header: { width, height } or null. */
function sizeOf(file) {
  const b = readFileSync(file);
  return b.length > 24 && b.toString("ascii", 12, 16) === "IHDR" ? { width: b.readUInt32BE(16), height: b.readUInt32BE(20) } : null;
}

/** The result in words, for Claude. */
export function cutoutText(r) {
  if (!r.ok) return `No cut-out was made: ${r.error}.`;
  const how = r.mode === "halftone" ? "a halftone cut-out with its white paper edge" : "the picture without its background, its colours kept";
  const whole = r.keyed === false ? " Nothing was keyed out (the picture had no flat green or white background and no transparency), so the whole rectangle is the print: for a photo use PhotoPrint with the original instead, and for an object ask the owner for a transparent PNG." : "";
  return `Made ${r.file}${r.size ? ` (${r.size.width}×${r.size.height})` : ""}: ${how}, from ${r.from} (--key ${r.key}); the original is unchanged. Use it as staticFile("${r.file.replace(/^assets\//, "")}") with Cutout or DropObject, and look at it on the paper in a still before keeping it.${whole}`;
}

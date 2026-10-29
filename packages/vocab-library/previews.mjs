// Previews of the Vocabulary items (Shohei Ohtaki's 168 cards), each one a real film the way the intake
// previews are made (../intake-library/previews.mjs): the author's Canvas sample (his kit and element code, unchanged: runScript) becomes a
// project's index.html, a code-film page drawing second t (window.render, R-LEMO's bridge drives it from HyperFrames' timeline), the app's
// finalize runs, then gatedRender (the export checks, the render worker at 24 fps, draft quality) for one cycle of the move; encoded for the
// cards like every library store (see ../library/preview-media.mjs) with a WebP poster. Kept beside the store, by item, with the item's
// hash (<storeRoot>/previews/<id>.json, .mp4, .webp), so a rebuilt store keeps them and only a changed item is rendered again.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { encodePoster, encodeVideo, PREVIEW, posterAt } from "../library/preview-media.mjs";
import { finalize } from "../hf-edit/finalize.mjs";
import { gatedRender } from "../render-pipeline/index.mjs";
import { gsapFile } from "../offline-assets/index.mjs";
import { currentStore, items, runScript, storeRoot } from "./index.mjs";

export const METHOD = "rendered here as a film: the author's Canvas sample on a HyperFrames page, the app's finalize and export checks, then the render worker (24 fps draft, web encode)";
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
export const previewsDir = (root = APP_ROOT) => join(storeRoot(root), "previews");

/** The HyperFrames page of one item: its canvas at the author's size, one cycle long, drawn at second t by his cell function. */
export function previewPage(it, st) {
  // the author's documentation links (in his comments and one string of the kit) are never fetched: written https:/\/ the string is the
  // same and the offline check (G-REMOTE) does not read them as a load; the item's credit keeps the links
  const offline = (s) => s.replace(/(https?:\/)\//g, "$1\\/");
  const js = offline(runScript(it, st)).replace(/<\/script/gi, "<\\/script"), dur = Math.max(1, Math.round(it.cycle * 1000) / 1000);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${it.title}</title>
<style>html,body{margin:0;width:${it.width}px;height:${it.height}px;overflow:hidden;background:#fff}#main,#c{position:absolute;inset:0;width:${it.width}px;height:${it.height}px}</style></head>
<body><div id="main" data-composition-id="main" data-start="0" data-duration="${dur}" data-width="${it.width}" data-height="${it.height}" data-fps="24">
<canvas id="c" class="clip" data-start="0" data-duration="${dur}" data-track-index="1" width="${it.width}" height="${it.height}"></canvas></div>
<script src="assets/vendor/gsap.min.js"></script>
<script>
${offline(it.credit.line)}
const M = ${js}, k = document.getElementById("c").getContext("2d");
window.render = function (t) { k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, M.w, M.h); k.save(); M.cell(k, M.w, M.h, Math.max(0, t) % M.cycle); k.restore(); };
window.render(0);
window.READY = true;
</script></body></html>
`;
}

/** Check and render one item; writes previews/<id>.json and its media, returns the result. */
export async function previewOne(it, { root = APP_ROOT, signal = null, timeoutMs = 300_000, keep = false } = {}) {
  const st = currentStore(root), out = previewsDir(root);
  mkdirSync(out, { recursive: true });
  const resFile = join(out, `${it.id}.json`), res = { id: it.id, uid: it.uid, hash: it.hash, at: new Date().toISOString() };
  let dir = null;
  const t0 = Date.now();
  try {
    dir = mkdtempSync(join(tmpdir(), "mw-vocab-"));
    writeFileSync(join(dir, "index.html"), previewPage(it, st));
    mkdirSync(join(dir, "assets", "vendor"), { recursive: true });
    copyFileSync(gsapFile(root), join(dir, "assets", "vendor", "gsap.min.js"));
    writeFileSync(join(dir, "hyperframes.json"), JSON.stringify({ name: `vocab-${it.id}` }) + "\n");
    await finalize(dir, { googleFonts: false });
    const master = join(dir, "_master.mp4");
    const sig = AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(timeoutMs)]);
    const r = await gatedRender({ projectDir: dir, outputPath: master, fps: 24, quality: "draft", format: "mp4", strictness: "best-effort" }, { signal: sig, workDir: join(dir, ".gates"), blank: false });
    res.check = { pass: !!r.gates?.pass, failures: r.gates?.blockingFailures ?? [] };
    if (r.type !== "done" || !existsSync(master)) throw new Error(r.type === "blocked" ? `Export checks failed: ${r.blockingFailures.join(", ")}` : `${r.code ?? r.type}: ${String(r.message ?? "").slice(0, 300)}`);
    const mp4 = `${it.id}.mp4`, poster = `${it.id}.webp`;
    encodeVideo(master, join(out, `${mp4}.part.mp4`), { root });
    encodePoster(join(out, `${mp4}.part.mp4`), join(out, poster), { root, at: posterAt(it.cycle) });
    renameSync(join(out, `${mp4}.part.mp4`), join(out, mp4));
    res.preview = { video: mp4, poster, method: METHOD, hfVersion: r.hfVersion ?? null, sha256: createHash("sha256").update(readFileSync(join(out, mp4))).digest("hex"),
      size: statSync(join(out, mp4)).size, encode: PREVIEW.label, seconds: Math.round((Date.now() - t0) / 100) / 10 };
  } catch (err) {
    res.error = String(err.message ?? err).slice(0, 400);
    const old = readJson(resFile, null);
    if (old?.preview && existsSync(join(out, old.preview.video))) res.preview = old.preview;       // the older preview stays until a new one works
  } finally {
    if (dir && !keep) rmSync(dir, { recursive: true, force: true });
  }
  writeFileSync(`${resFile}.part`, JSON.stringify(res, null, 2));
  renameSync(`${resFile}.part`, resFile);
  return res;
}

/** Items with no preview of them as they are now (or, retryFailed, one that failed last time). */
export function todo(root = APP_ROOT, { force = false, only = null, retryFailed = false } = {}) {
  return items(root).filter((it) => {
    if (only && !only.includes(it.id)) return false;
    if (force) return true;
    const r = readJson(join(previewsDir(root), `${it.id}.json`), null);
    return !r || r.hash !== it.hash || (retryFailed && !!r.error) || (!r.preview && !r.error);
  });
}

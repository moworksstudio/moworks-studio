// Previews of the intake items, each one a real film: the item's demo.html becomes a project's index.html with GSAP from assets/vendor,
// the app's finalize runs (R-CSP offline policy, R-RUNTIME, R-FONTS from the bundled fonts only, R-BG), then gatedRender: the same export
// checks a film passes (G-HF-LINT and G-HF-SCRIPT from `hyperframes check`, G-REMOTE, G-FONT, G-GLYPH for Vietnamese letters), then the
// render worker at 24 fps, draft quality. Encoded for the cards like every library store (at most 640 px wide, 24 fps, H.264 CRF 30, no
// sound; ../library/preview-media.mjs) with a WebP poster at min(3 s, 60 % of the length). A result per item (previews/<slug>.json) so several
// lanes (separate processes: the checks run HF's CLI synchronously) can work at once; mergePreviews() folds them into the catalog.
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { encodePoster, encodeVideo, PREVIEW, posterAt } from "../library/preview-media.mjs";
import { finalize } from "../hf-edit/finalize.mjs";
import { gatedRender } from "../render-pipeline/index.mjs";
import { gsapFile } from "../offline-assets/index.mjs";
import { VI } from "../hf-qa/gates.mjs";
import { currentStore, slugOf } from "./index.mjs";

export const METHOD = "rendered here as a film: the app's finalize and export checks, then the render worker (24 fps draft, web encode)";
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };

/** The demo's visible text (scripts and styles removed), NFC. */
export function demoText(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<title[\s\S]*?<\/title>/gi, "").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").normalize("NFC");
}
const hasVietnamese = (text) => [...text].some((c) => VI.has(c) && !"aeiouyAEIOUY".includes(c));

/** A temp project for one built item: index.html (its demo), GSAP, its assets. */
export function prepareProject(itemDir, root = APP_ROOT) {
  const dir = mkdtempSync(join(tmpdir(), "mw-intake-"));
  copyFileSync(join(itemDir, "demo.html"), join(dir, "index.html"));
  mkdirSync(join(dir, "assets", "vendor"), { recursive: true });
  copyFileSync(gsapFile(root), join(dir, "assets", "vendor", "gsap.min.js"));
  if (existsSync(join(itemDir, "assets"))) cpSync(join(itemDir, "assets"), join(dir, "assets"), { recursive: true });
  return dir;
}

function encode(root, master, mp4, poster, seconds) {
  encodeVideo(master, mp4, { root });
  encodePoster(mp4, poster, { root, at: posterAt(seconds) });
}

/** Check and render one catalog item; writes previews/<slug>.json (and the media) and returns the result. */
export async function previewOne(it, { root = APP_ROOT, signal, timeoutMs = 300_000, keep = false } = {}) {
  const st = currentStore(root);
  const slug = slugOf(it.uid);
  const resFile = join(st.dir, "previews", `${slug}.json`);
  const itemDir = join(st.dir, it.folder);
  const html = readFileSync(join(itemDir, "demo.html"), "utf8");
  const viText = hasVietnamese(demoText(html));
  const res = { uid: it.uid, hash: it.hash, at: new Date().toISOString() };
  let dir = null;
  const t0 = Date.now();
  try {
    dir = prepareProject(itemDir, root);
    const fin = await finalize(dir, { googleFonts: false });
    const master = join(dir, "_master.mp4");
    const sig = AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(timeoutMs)]);
    const r = await gatedRender({ projectDir: dir, outputPath: master, fps: 24, quality: "draft", format: "mp4", strictness: "best-effort" }, { signal: sig, workDir: join(dir, ".gates"), blank: false });
    const gates = r.gates?.gates ?? [];
    res.check = { pass: !!r.gates?.pass, failures: r.gates?.blockingFailures ?? [], findings: gates.filter((g) => !g.pass).map((g) => ({ id: g.id, findings: (g.findings ?? []).slice(0, 4) })),
      fonts: fin.fontsAdded.map((f) => f.family), unresolvedFonts: fin.unresolvedFonts.map((u) => u.stack.join(", ")) };
    const glyph = gates.find((g) => g.id === "G-GLYPH");
    res.vi = !viText ? "no-text" : glyph?.pass ? "ok" : "missing";
    if (r.type !== "done" || !existsSync(master)) throw new Error(r.type === "blocked" ? `Export checks failed: ${r.blockingFailures.join(", ")}` : `${r.code ?? r.type}: ${String(r.message ?? "").slice(0, 300)}`);
    const mp4 = `previews/${slug}.mp4`, png = `previews/${slug}.webp`;
    encode(root, master, join(st.dir, mp4 + ".part.mp4"), join(st.dir, png), r.duration ?? it.duration);
    renameSync(join(st.dir, mp4 + ".part.mp4"), join(st.dir, mp4));
    const buf = readFileSync(join(st.dir, mp4));
    res.preview = { video: mp4, poster: png, method: METHOD, hfVersion: r.hfVersion ?? null, sha256: createHash("sha256").update(buf).digest("hex"), size: statSync(join(st.dir, mp4)).size,
      encode: PREVIEW.label, seconds: Math.round((Date.now() - t0) / 100) / 10 };
  } catch (err) {
    res.error = String(err.message ?? err).slice(0, 400);
    const old = readJson(resFile, null);
    if (old?.preview && existsSync(join(st.dir, old.preview.video))) res.preview = old.preview;       // the older preview stays until a new one works
  } finally {
    if (dir && !keep) rmSync(dir, { recursive: true, force: true });
  }
  writeFileSync(resFile + ".part", JSON.stringify(res, null, 2));
  renameSync(resFile + ".part", resFile);
  return res;
}

/** Items that need a preview: none yet, made from older files, or (retryFailed) failed last time. */
export function todo(items, root = APP_ROOT, { force = false, only = null, retryFailed = false } = {}) {
  const st = currentStore(root);
  return items.filter((it) => {
    if (only && !only.includes(it.uid)) return false;
    if (force) return true;
    const r = readJson(join(st.dir, "previews", `${slugOf(it.uid)}.json`), null);
    if (!r || r.hash !== it.hash) return true;
    return retryFailed && !!r.error;
  });
}

/** Check and render every preview that is missing or out of date, in `lanes` processes at once (HF's check runs synchronously, so each
 *  lane is its own process); results merge into the catalog at the end. Progress { done, total, failed, uid }. */
export async function renderPreviews({ root = APP_ROOT, lanes = 3, only = null, author = null, force = false, retryFailed = false, signal, onProgress = () => {} } = {}) {
  const { buildStore, items, mergePreviews, reloadItems } = await import("./index.mjs");
  const { fork } = await import("node:child_process");
  await buildStore({ root });
  reloadItems();
  const list = todo(items(root).filter((x) => !author || x.author === author), root, { force, only, retryFailed });
  const n = Math.max(1, Math.min(6, lanes, list.length || 1));
  let done = 0, failed = 0;
  const kids = [];
  const abort = () => { for (const c of kids) try { c.kill(); } catch { /* gone */ } };
  signal?.addEventListener?.("abort", abort, { once: true });
  await Promise.all(Array.from({ length: list.length ? n : 0 }, (_, i) => new Promise((ok) => {
    const mine = list.filter((_, k) => k % n === i).map((x) => x.uid);
    const c = fork(join(import.meta.dirname, "cli.mjs"), ["lane", mine.join(",")], { stdio: ["ignore", "ignore", "inherit", "ipc"], env: { ...process.env }, windowsHide: true });
    kids.push(c);
    c.on("message", (m) => { done++; if (m.error) failed++; onProgress({ done, total: list.length, failed, uid: m.uid, error: m.error, seconds: m.seconds, vi: m.vi }); });
    c.on("exit", ok);
  })));
  signal?.removeEventListener?.("abort", abort);
  mergePreviews(root);
  if (signal?.aborted) throw Object.assign(new Error("Cancelled"), { code: "CANCELLED" });
  return { total: list.length, done, failed };
}

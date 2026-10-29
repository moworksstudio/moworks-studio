// Preview media for every library store (one size for all):
// videos the first 10 s, at most 640 px wide, 24 fps, H.264 CRF 30 (preset slow), faststart, no sound (the cards play them muted on hover,
// as the kit's gallery does); posters WebP at most 640 px wide, quality 72. Never scaled up: a source narrower than 640 px keeps its width.
// One place, so the Blocks, Looks, Motion and intake tools encode alike, and recodePreview() brings an existing store to the same size with
// its original files kept in <store>/previews-original/ until the user has looked.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";

export const PREVIEW = { width: 640, fps: 24, crf: 30, seconds: 10, posterQuality: 72, label: "D40: 640 px, 24 fps, H.264 CRF 30, 10 s at most, WebP poster q72" };
export const ffmpegExe = (root = APP_ROOT) => join(expandEnv(loadPins(root).ffmpeg.dir), "ffmpeg.exe");
const run = (root, args) => execFileSync(ffmpegExe(root), ["-v", "error", "-y", ...args], { windowsHide: true, stdio: "ignore" });
const scale = `scale='min(${PREVIEW.width},iw)':-2`;

/** Encode a video (a render master or a bigger preview) for the cards. */
export function encodeVideo(src, dst, { root = APP_ROOT } = {}) {
  run(root, ["-i", src, "-t", String(PREVIEW.seconds), "-vf", `${scale},fps=${PREVIEW.fps}`, "-c:v", "libx264", "-profile:v", "high", "-crf", String(PREVIEW.crf), "-preset", "slow",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", dst]);
}

/** A WebP poster from a picture, or from a video at `at` seconds. */
export function encodePoster(src, dst, { root = APP_ROOT, at = null } = {}) {
  run(root, [...(at == null ? [] : ["-ss", String(at)]), "-i", src, "-frames:v", "1", "-vf", scale, "-c:v", "libwebp", "-quality", String(PREVIEW.posterQuality), dst]);
}

/** The poster time the stores use: min(3 s, 60 % of the length). */
export const posterAt = (seconds) => Math.max(0, Math.min(3, (seconds || 5) * 0.6));
export const webpName = (rel) => rel.replace(/\.(png|jpe?g)$/i, ".webp");
export const sha256Of = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** Bring one preview { video, poster } of a store to the preview size. The originals are copied to previews-original/ first (once; a second run
 *  encodes from them again, so the loss never compounds); the video is replaced in place and the poster written beside the old one as .webp,
 *  so a running app keeps serving the old paths until it reloads the catalog (tidyStore() then removes the old posters). `keepOriginals:
 *  false` (a fresh download) keeps no copy and removes the old poster. A failed encode leaves the preview as it was and throws. Returns
 *  { preview, before, after } (bytes) or null if there is nothing to do. */
export function recodePreview(storeDir, preview, { root = APP_ROOT, seconds = null, keepOriginals = true } = {}) {
  if (!preview?.video && !preview?.poster) return null;
  const keep = join(storeDir, "previews-original"), base = (rel) => rel.split("/").pop();
  const kept = (rel) => { const b = base(rel).replace(/\.[^.]+$/, ""); return [base(rel), `${b}.png`, `${b}.jpg`, `${b}.jpeg`].map((n) => join(keep, n)).find((p) => existsSync(p) && !p.endsWith(".webp")) ?? null; };
  if (preview.encode === PREVIEW.label && !(preview.video && existsSync(join(keep, base(preview.video))))) return null;    // made at that size already
  const original = (rel) => { const k = kept(rel); if (k) return k; const cur = join(storeDir, rel); if (!existsSync(cur) || /\.webp$/i.test(rel)) return null;
    if (!keepOriginals) return cur; mkdirSync(keep, { recursive: true }); const o = join(keep, base(rel)); copyFileSync(cur, o); return o; };
  let before = 0, after = 0;
  const out = { ...preview }, parts = [];
  try {
    if (preview.video) {
      const o = original(preview.video);
      if (o) {
        const dst = join(storeDir, preview.video), part = dst + ".part.mp4"; parts.push(part);
        before += statSync(o).size; encodeVideo(o, part, { root }); renameSync(part, dst);
        out.size = statSync(dst).size; after += out.size;
        if (preview.source !== "hf") out.sha256 = sha256Of(dst);              // an official HF video keeps the hash of the file HF publishes
      }
    }
    const pSrc = preview.poster ? original(preview.poster) : null, rel = webpName(preview.poster ?? preview.video.replace(/\.mp4$/i, ".png")), dst = join(storeDir, rel);
    if (pSrc || (!existsSync(dst) && preview.video)) {
      const part = dst + ".part.webp"; parts.push(part);
      if (pSrc) { before += statSync(pSrc).size; encodePoster(pSrc, part, { root }); }
      else encodePoster(join(storeDir, preview.video), part, { root, at: posterAt(seconds) });
      rmSync(dst, { force: true }); renameSync(part, dst);
      if (!keepOriginals && preview.poster && preview.poster !== rel) rmSync(join(storeDir, preview.poster), { force: true });
    }
    if (existsSync(dst)) { out.poster = rel; after += statSync(dst).size; }
  } catch (err) { for (const p of parts) rmSync(p, { force: true }); throw err; }
  out.encode = PREVIEW.label;
  return { preview: out, before, after };
}

/** After the app has reloaded: remove from previews/ the old posters (PNG / JPEG) whose WebP is in use and whose original is kept. */
export function tidyStore(storeDir, referenced) {
  const pd = join(storeDir, "previews"), keep = join(storeDir, "previews-original"), used = new Set(referenced.map((r) => r.split("/").pop()));
  let removed = 0, bytes = 0;
  if (!existsSync(pd)) return { removed, bytes };
  for (const f of readdirSync(pd)) if (/\.(png|jpe?g)$/i.test(f) && !used.has(f) && existsSync(join(keep, f))) { bytes += statSync(join(pd, f)).size; rmSync(join(pd, f)); removed++; }
  return { removed, bytes };
}

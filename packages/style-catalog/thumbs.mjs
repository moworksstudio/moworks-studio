// Gallery thumbnails (the tiles loaded 114 full stills, 31 MB): a WebP of each style's still at the poster size (at most
// 640 px wide, quality 72; packages/library/preview-media.mjs), made once from the still and kept in <work>/library/thumbs/<source>/,
// made again only when the still is newer. The still itself stays for the details panel. Encoded one at a time without blocking the
// server (an async ffmpeg); the server makes them all in the background at start, and any missing one on its first request.
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { workRoot } from "../project-service/index.mjs";
import { ffmpegExe, PREVIEW } from "../library/preview-media.mjs";

export const thumbRoot = (root = APP_ROOT) => process.env.MW_THUMBS_ROOT ?? join(workRoot(root), "library", "thumbs");
/** The thumbnail URL for a still URL: Lemo-Opuscar and mg-styles-15 stills and the app's own (/styles/…) get one; anidoodle's cards
 *  are already small (392 px tiles), so they are their own thumbnail. */
export function thumbUrl(image) {
  if (!image) return null;
  if (/^\/media\/(lemo|mg)\//.test(image)) return image.replace(/^\/media\//, "/media/thumb/");
  if (image.startsWith("/styles/")) return `/media/thumb/ui${image}`;
  return image;
}

let queue = Promise.resolve();
const running = new Map();
const encode = (src, dst, root) => new Promise((ok, no) => {
  execFile(ffmpegExe(root), ["-v", "error", "-y", "-i", src, "-frames:v", "1", "-vf", `scale='min(${PREVIEW.width},iw)':-2`, "-c:v", "libwebp", "-quality", String(PREVIEW.posterQuality), dst],
    { windowsHide: true }, (e) => (e ? no(e) : ok()));
});
/** The thumbnail of a still (absolute path) for source ("lemo" | "mg" | "ui") and its path in that source: made if missing or older. */
export function thumbFile(source, rel, original, root = APP_ROOT) {
  const dst = join(thumbRoot(root), source, `${rel.replace(/[\\/]/g, "__").replace(/\.\w+$/, "")}.webp`);
  const fresh = () => existsSync(dst) && statSync(dst).mtimeMs >= statSync(original).mtimeMs;
  if (fresh()) return Promise.resolve(dst);
  if (running.has(dst)) return running.get(dst);
  const job = (queue = queue.catch(() => {}).then(async () => {
    if (fresh()) return dst;
    mkdirSync(join(dst, ".."), { recursive: true });
    const tmp = `${dst}.part.webp`;
    try { await encode(original, tmp, root); renameSync(tmp, dst); } catch (e) { rmSync(tmp, { force: true }); throw e; }
    return dst;
  })).finally(() => running.delete(dst));
  running.set(dst, job);
  return job;
}

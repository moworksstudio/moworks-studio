// A render's file: its name (the date, the film's name, the time) and the film's last render while it is of the film as it is now. Export
// Video and Export to AE share them (audit/112b b6.3: ae.mjs imported them from production.mjs, which imported ae.mjs).
import { existsSync } from "node:fs";
import { join } from "node:path";
import { stampBase, stampParts } from "../render-names/index.mjs";
import { filmHash, filmParts } from "../project-service/film-hash.mjs";

/** A render's name (sorted by date first, then the film's name, then the time of the render):
 *  <YYMMDD>_<name>_<HHMM><ext> at local time; the seconds join when that name is taken, then -2, -3…; never
 *  a "", never an existing file. `ext` "" names a folder (Export to AE). */
export function stampedName(dir, name, ext = "", now = new Date()) {
  const { day, hm, sec } = stampParts(now), base = stampBase(name);          // the rule itself is shared with the Render dialog (packages/render-names)
  const stem = (tail) => `${day}_${base}_${tail}`;
  for (const s of [stem(hm), stem(hm + sec)]) if (!existsSync(join(dir, s + ext))) return s + ext;
  for (let i = 2; ; i++) { const s = stem(`${hm}${sec}-${i}`); if (!existsSync(join(dir, s + ext))) return s + ext; }
}

/** The film's last Render when it is of the film as it is now (its hash, kept by the export) and still there, else null: what Export to AE
 *  takes for a canvas film when no background render is fresh (audit/112b b1.11: a Review running or a 3D film waiting on its question left
 *  AE with "Render the film, then export again" while the file just rendered sat in renders/). picture: what After Effects takes of it, its
 *  picture only (its sound is the audio layers, the video layer's sound off): a sound changed since the Render keeps the file good for AE
 *  (audit/112d d4: a fader moved in Final Mix made the export render the whole film again). A Render from before the picture's key: its hash. */
export function lastRender(p, fps, { picture = false } = {}) {
  const x = p.meta?.lastExport;
  if (!x?.file || !x.hash || !["mp4", "mov"].includes(x.format)) return null;
  // a Render from before the picture's key: its whole hash, as before (audit/112d second look, n2: such a Render was never AE's any more)
  const byPicture = picture && !!x.picture;
  let now = null; try { now = byPicture ? filmParts(p.path, Number(fps) || null).picture : filmHash(p.path, Number(fps) || null); } catch { return null; }
  const f = join(p.path, ...String(x.file).split("/"));
  return (byPicture ? x.picture : x.hash) === now && existsSync(f) ? f : null;
}

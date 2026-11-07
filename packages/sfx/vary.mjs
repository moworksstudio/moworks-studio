// A sound heard again is never the very same (owner 05/11/2026 #1096 A, audit/103): a sound that plays more than once in a film gets two
// copies a little higher or lower and softer, made once with FFmpeg next to it (assets/3_audio/sfx/<file>~p1.ogg, ~p2), and each repeat
// takes one of them (auto.mjs withVariants). The copies are the same sound: the cap of repeats counts them as their original (auto.mjs
// `of`), and the credit is the original's.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { APP_ROOT } from "../version-manager/index.mjs";
import { ffmpegExe } from "../version-manager/index.mjs";
import { patchState, readState } from "./index.mjs";

const run = promisify(execFile);
/** The two copies: pitch (by playing rate, a semitone is 1.0595) and level. */
export const VARY = Object.freeze([{ key: "p1", rate: 1.06, gainDb: -1 }, { key: "p2", rate: 0.945, gainDb: -2 }]);
const r3 = (n) => Math.round(n * 1000) / 1000;
const copyName = (file, key) => file.replace(/(\.[a-z0-9]+)$/i, `~${key}.ogg`);

/** Make the copies of one file (when missing): [{ key, file, rate, gainDb }] of those that exist. */
export async function varyFile(dir, file, { root = APP_ROOT } = {}) {
  const src = join(dir, ...file.split("/")), out = [];
  if (!existsSync(src)) return out;
  for (const v of VARY) {
    const rel = copyName(file, v.key), dst = join(dir, ...rel.split("/"));
    if (!existsSync(dst)) {
      try {
        await run(ffmpegExe(root), ["-hide_banner", "-nostats", "-y", "-i", src, "-map", "0:a:0", "-af", `asetrate=44100*${v.rate},aresample=44100,volume=${v.gainDb}dB`, "-c:a", "libvorbis", "-q:a", "5", dst],
          { windowsHide: true, timeout: 60000 });
      } catch { continue; }
    }
    if (existsSync(dst)) out.push({ ...v, file: rel });
  }
  return out;
}

/** Give each named sound that plays more than once (counts: Map name -> uses) and has fewer than three files its two copies, recorded as
 *  variants of the sound ({ id: <file's id>~p1, file, of: the original's file }). The owner's own sounds stay as they are. Returns the names varied. */
export async function varySounds(dir, counts, { root = APP_ROOT } = {}) {
  const st = readState(dir), done = [];
  // a file heard more than once by any names (T38b-10: three names each once on one tick played it three times the same): every name on it varies
  const byFile = new Map();
  for (const [name, n] of counts) { const f = st.sounds[name]?.file; if (f) byFile.set(f, (byFile.get(f) ?? 0) + n); }
  for (const [name, n] of counts) {
    const s = st.sounds[name];
    if (!s || s.source === "owner" || !s.file || Math.max(n, byFile.get(s.file) ?? 0) < 2) continue;
    const own = (s.variants ?? []).filter((v) => !v.of);
    if (own.length >= 3 || (s.variants ?? []).some((v) => v.of)) continue;
    const base = own.length ? own : [{ id: String(s.id).replace(/^[a-z]+:/, ""), title: s.title, family: s.family, file: s.file, durationS: s.durationS ?? null, lufs: s.lufs ?? null, onset: s.onset ?? 0, credit: s.credit ?? null }];
    const added = [];
    for (const b of base.slice(0, 2)) {
      for (const c of await varyFile(dir, b.file, { root })) added.push({ ...b, id: `${b.id}~${c.key}`, file: c.file, of: b.file, rate: c.rate, gainDb: c.gainDb,
        durationS: b.durationS != null ? r3(b.durationS / c.rate) : null, onset: r3((b.onset ?? 0) / c.rate), lufs: b.lufs != null ? b.lufs + c.gainDb : null });
    }
    if (!added.length) continue;
    patchState(dir, (x) => { const t = x.sounds[name]; if (t) t.variants = [...(t.variants?.length ? t.variants : base), ...added]; });
    done.push(name);
  }
  return done;
}

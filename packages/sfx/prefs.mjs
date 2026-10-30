// The owner's sound choices for one film, kept in .moworks/sfx-prefs.json and honoured by every placement (Test 24: the owner said
// "no whoosh", Claude said it was done, and the next placement put the whooshes back). Claude sets them with the app's sfx_prefs tool;
// the Final Mix sets the density and takes single sounds out.
//   { off: ["whoosh", "footstep", "all"…],   families or sound names the film never gets ("all": no sound effects at all)
//     ambience: true | false,                  false: no ambience beds
//     density: "low" | "normal" | "lively",    how many sounds a second (default lively: owner 30/10, a sound on every action)
//     skip: ["<cue id>"…] }                    single sounds taken out in the Final Mix, kept out when the sounds are placed again
// And what else asks for silence or fewer sounds: the brief, and the film style's own sound section (which wins over the house rule).
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FAMILIES, words } from "./library.mjs";

export const DENSITIES = Object.freeze(["low", "normal", "lively"]);
export const DEFAULT_DENSITY = "lively";
const prefsFile = (dir) => join(dir, ".moworks", "sfx-prefs.json");
const list = (v) => (Array.isArray(v) ? [...new Set(v.map((x) => String(x).trim().toLowerCase()).filter(Boolean))].slice(0, 300) : []);

/** The prefs, cleaned: only known keys and values. */
export function cleanPrefs(p = {}) {
  const out = {};
  const off = list(p?.off);
  if (off.length) out.off = off;
  if (typeof p?.ambience === "boolean") out.ambience = p.ambience;
  if (DENSITIES.includes(p?.density)) out.density = p.density;
  const skip = list(p?.skip);
  if (skip.length) out.skip = skip;
  return out;
}
export function readPrefs(dir) {
  try { return cleanPrefs(JSON.parse(readFileSync(prefsFile(dir), "utf8"))); } catch { return {}; }
}
/** Change the prefs. patch: off / on (families or names to turn off, or on again; on: ["all"] turns every one on again), ambience,
 *  density, skip (cue ids to take out), unskip (ids to bring back, or true for all). Returns the prefs written. */
export function updatePrefs(dir, patch = {}) {
  const cur = readPrefs(dir), on = new Set(list(patch.on));
  let off = [...new Set([...(cur.off ?? []), ...list(patch.off)])].filter((o) => !on.has(o) && !on.has("all"));
  // "on" names a family or a word of an off name: that one is on again ("whoosh" on again after "whooshes" off)
  off = off.filter((o) => ![...on].some((x) => familyWord(x) && familyWord(x) === familyWord(o)));
  let skip = [...new Set([...(cur.skip ?? []), ...list(patch.skip)])];
  if (patch.unskip === true) skip = [];
  else if (Array.isArray(patch.unskip)) { const u = new Set(list(patch.unskip)); skip = skip.filter((s) => !u.has(s)); }
  const next = cleanPrefs({ off, skip, ambience: typeof patch.ambience === "boolean" ? patch.ambience : cur.ambience,
    density: DENSITIES.includes(patch.density) ? patch.density : cur.density });
  mkdirSync(join(dir, ".moworks"), { recursive: true });
  writeFileSync(prefsFile(dir) + ".tmp", JSON.stringify({ ...next, at: new Date().toISOString() }, null, 2) + "\n");
  renameSync(prefsFile(dir) + ".tmp", prefsFile(dir));
  return next;
}

/** The prefs in plain words, for Claude's tool answer ("off: whoosh; no ambience; density low; 2 sounds taken out"). */
export function prefsText(p = {}) {
  const parts = [p.off?.length ? (p.off.includes("all") ? "no sound effects at all" : `off: ${p.off.join(", ")}`) : "every family on",
    p.ambience === false ? "no ambience" : "ambience under every place", `density ${p.density ?? DEFAULT_DENSITY}`];
  if (p.skip?.length) parts.push(`${p.skip.length} single sound(s) taken out in the Final Mix`);
  return parts.join("; ");
}

/** The family a pref word names: a family's own name or its plural or synonym ("whooshes", "swoosh", "footsteps"); null otherwise. */
export function familyWord(w) {
  const ws = words(w);
  return ws.length === 1 && FAMILIES.includes(ws[0]) ? ws[0] : null;
}
/** Is this cue turned off by the prefs? A family off takes every sound of it ("whoosh" takes "swoosh" and "whoosh out"); a name off takes
 *  the cues whose names hold its words. */
export function isOff(prefs, { name = "", family = null } = {}) {
  const off = prefs?.off ?? [];
  if (!off.length) return false;
  if (off.includes("all")) return true;
  const n = String(name).toLowerCase().trim(), own = new Set(words(n));
  return off.some((o) => {
    const f = familyWord(o);
    if (f) return f === family || own.has(f);
    const ws = words(o);
    return o === n || (ws.length > 0 && ws.every((w) => own.has(w)));
  });
}

// Words that ask for no sound effects, or for fewer, in a brief or a style's sound section (the style's own wins over the house rule)
const SILENT = /\b(no|without|zero)\s+(sound[\s-]*effects?|sfx|foley)\b|\bsilent\s+(film|movie|piece|video)\b|\bsound[\s-]*effects?\s*:\s*none\b|không\s+(có\s+)?(hiệu ứng âm thanh|sfx|sound[\s-]*effects?)|phim câm/i;
const FEWER = /\b(few(er)?|minimal|sparse|sparing(ly)?)\s+(sound[\s-]*effects?|sfx|sounds|foley)\b|\b(sound[\s-]*effects?|sfx|foley)\s+(sparingly|only on (the )?(key|big|main))|ít\s+(hiệu ứng|âm thanh|sfx|sound)/i;
const NO_AMBIENCE = /\bno\s+(ambien(ce|t)|room tone|background (sound|noise)s?)\b|không\s+(có\s+)?(âm thanh nền|tiếng nền|ambience)/i;
/** What the film's sound effects follow: { silent: null | "owner" | "style" | "brief", density, ambience }. The owner's prefs first, then
 *  the style's sound section, then the brief; otherwise every action sounds (lively) with ambience under every place. */
export function soundPolicy({ prefs = {}, brief = "", palette = "" } = {}) {
  const silent = (prefs.off ?? []).includes("all") ? "owner" : SILENT.test(palette) ? "style" : SILENT.test(brief) ? "brief" : null;
  const density = prefs.density ?? (FEWER.test(palette) || FEWER.test(brief) ? "low" : DEFAULT_DENSITY);
  const ambience = typeof prefs.ambience === "boolean" ? prefs.ambience : !silent && !NO_AMBIENCE.test(palette) && !NO_AMBIENCE.test(brief);
  return { silent, density, ambience };
}

/** The brief's words: New project's brief and direction, and BRIEF.md. */
export function briefOf(dir) {
  let meta = {}; try { meta = JSON.parse(readFileSync(join(dir, ".moworks", "project.json"), "utf8")); } catch { /* no project file */ }
  const file = join(dir, "BRIEF.md");
  return [meta.brief?.text, meta.brief?.direction, existsSync(file) ? readFileSync(file, "utf8") : ""].filter(Boolean).join("\n");
}

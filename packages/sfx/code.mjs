// Sound effects made by code, the films' first source (owner 04/11/2026 #888, #889, #899, #909, #910). Nothing of it is on screen: a placed
// sound shows by its name like any other, and is credited in the film's CREDITS.md. Where each sound comes from, the app decides in code
// (index.mjs resolveCues), never Claude. Since owner 05/11 #1034 every film asks the library and the search first (auto.mjs) and comes here only
// for the cues they have not; for those:
//   - a film of one of the owner's kit styles (KIT_STYLES): code only, its kit's own sounds first. The kits' own sound rules make every
//     sound in code and forbid downloaded ones and outside libraries; the library and the search come in only when this computer cannot
//     run the code (no Python with numpy and scipy), so the film is never silent.
//   - any other film: the kits' neutral sounds, then a new sound made by code, then the offline library, then Openverse / Freesound.
// The recipes (code-recipes.mjs) are matched to a cue by its words as the library is (library.mjs matchLocal). Each film gets its own takes
// of a recipe (the seed comes from the film and the cue's name), up to four, so a sound repeated in a film varies and two films never share
// one file; the same film made again gets the same samples. Python (the app's 3.12 with numpy and scipy, setup/python.mjs) makes them:
// tools/sfx-code/make.py. A recipe Claude writes for a film (.moworks/sfx-recipes/<name>.py) runs in its restricted runner (sandbox.py);
// one that made a sound the checks pass is kept in the library (library/sfx-recipes), so the library grows.
import { execFile } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";
import { pyLibs, pythonExe } from "../setup/python.mjs";
import { KIT_STYLES, RECIPES, SIGNATURE, kitRecipe } from "./code-recipes.mjs";
import { FAMILIES, familyOf, fromCatalog, libraryDir, matchLocal, stepsRun, sustainedCue } from "./library.mjs";

/** Raised when a recipe changes what it makes: every film's takes are made again. */
export const CODE_VERSION = 1;
export const MAX_TAKES = 4;
/** The longest sound a sustained cue's take is made for, s (index.mjs MAX_AUTO_S: a clip plays at most that long). */
const LONGEST_S = 6;
const SCRIPT = ["tools", "sfx-code", "make.py"];
export const isKitStyle = (styleId) => KIT_STYLES.includes(String(styleId ?? ""));
const kitsDir = (root) => join(root, "bundle", "styles", "moworks-kits");
/** Where the recipes Claude wrote and that passed are kept for every film (MW_SFX_RECIPES: tests). */
export function keptRecipesDir(root = APP_ROOT) {
  if (process.env.MW_SFX_RECIPES) return process.env.MW_SFX_RECIPES;
  // the app's work folder, as project-service workRoot finds it (MW_WORK_ROOT: tests)
  const work = process.env.MW_WORK_ROOT ? resolve(process.env.MW_WORK_ROOT) : resolve(expandEnv(loadPins(root).storage?.workRoot ?? join(root, "..")));
  return join(work, "library", "sfx-recipes");
}
const filmRecipesDir = (dir) => join(dir, ".moworks", "sfx-recipes");

// ---- can this computer make sounds? (Python 3.12 with numpy and scipy; MW_CODE_SFX=off: as if not, for tests)
let probe = null;
/** true when the app's Python imports numpy and scipy.signal (checked once a run of the app; a failed check is asked again after a minute). */
export async function codeRuns(root = APP_ROOT) {
  if (process.env.MW_CODE_SFX === "off") return false;
  if (probe && (probe.ok || Date.now() - probe.at < 60000) && probe.root === root) return probe.ok;
  const exe = pythonExe(root);
  const ok = !!exe && await new Promise((done) => execFile(exe, ["-I", "-c", "import os,sys\np=os.environ.get('MW_PYLIBS')\nif p and os.path.isdir(p): sys.path.insert(0,p)\nimport numpy, scipy.signal\nprint('ok')"],
    { env: { ...process.env, MW_PYLIBS: pyLibs(root) }, windowsHide: true, timeout: 60000 }, (e, so) => done(!e && /ok/.test(String(so)))));
  probe = { ok, at: Date.now(), root };
  return ok;
}

// ---- the recipes a film may use
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
const pins = (root) => { try { return loadPins(root).moworksKits?.kits ?? {}; } catch { return {}; } };
const KIT_DIR = { pc: "paper-collage", sm: "story", iv: "story", c3: "cartoon-3d", x2: "explainer-2d", rc: "ricks-clip" };
/** A recipe file's own words: { family, tags, duration } from its sidecar (<name>.json), or from its FAMILY / TAGS lines. */
function recipeMeta(file) {
  const side = readJson(file.replace(/\.py$/i, ".json"), null);
  if (side?.tags?.length) return side;
  const src = (() => { try { return readFileSync(file, "utf8"); } catch { return ""; } })();
  const family = /^FAMILY\s*=\s*["']([a-z]+)["']/m.exec(src)?.[1] ?? null;
  const tags = [...(/^TAGS\s*=\s*\[([^\]]*)\]/m.exec(src)?.[1] ?? "").matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
  const dur = Number(/^DURATION\s*=\s*([\d.]+)/m.exec(src)?.[1]);
  return { family, tags, duration: Number.isFinite(dur) ? dur : 1 };
}
const recipeFiles = (folder, kind) => (existsSync(folder) ? readdirSync(folder).filter((f) => /^[a-z0-9][a-z0-9-]{0,60}\.py$/i.test(f)).map((f) => {
  const file = join(folder, f), m = recipeMeta(file), name = f.replace(/\.py$/i, "").toLowerCase();
  return m.tags?.length && FAMILIES.includes(m.family) ? { id: `${kind}-${name}`, recipe: `user:${file}`, params: {}, family: m.family, tags: [name.replace(/-/g, " "), ...m.tags], duration: Number(m.duration) || 1, [kind]: true, file } : null;
}).filter(Boolean) : []);

/** The code library of one film: the kits' sounds it may take (its own kit's all, the others' neutral ones), the app's recipes, the recipes kept
 *  from earlier films and the film's own. run false: only the kits' sounds already made (no Python to make a new one). A library object for
 *  matchLocal ({ dir, sounds }); each entry keeps its recipe and, for a kit's sound, its file (path). */
export function codeLibrary({ kit = null, root = APP_ROOT, dir = null, run = true } = {}) {
  const libDir = libraryDir(root), all = catalogOf(libDir);          // the catalog with no style left out: the kits' sounds are picked here
  // a kit style's film takes its own kit's sounds only (owner #909: "the kit's sounds, then new ones by its code"; Test 38's 2D Explainer had
  // Stickman's chime and jet, Inner Voice's whisper, T38-3); any other film the kits' neutral ones
  const own = isKitStyle(kit);
  const prebuilt = all.filter((s) => s.source?.kind === "code" && kitRecipe(s.id) && (s.kit === kit || (!own && !SIGNATURE.has(s.id))))
    .map((s) => ({ ...s, recipe: kitRecipe(s.id), prebuilt: true, own: s.kit === kit, kitDir: KIT_DIR[s.id.slice(0, 2)], params: {} }));
  const sounds = run ? [...prebuilt, ...RECIPES.map((e) => ({ ...e })), ...recipeFiles(keptRecipesDir(root), "kept"), ...(dir ? recipeFiles(filmRecipesDir(dir), "film") : [])]
    : prebuilt;
  return fromCatalog({ sounds }, libDir);
}
let catCache = null;
const catalogOf = (libDir) => { const f = join(libDir, "catalog.json"); if (catCache?.f !== f) catCache = { f, sounds: readJson(f, { sounds: [] }).sounds ?? [] }; return catCache.sounds; };

const FITS = new WeakMap();
/** The code's answer for a cue name: matchLocal's ({ entry, choices, good, right, exact, closeness, generic? }) over the film's code library,
 *  or null. A run of steps takes a walk or a run, one step takes one step (stepsRun). */
export function matchCode(name, { kit = null, family = null, root = APP_ROOT, dir = null, run = true, library = null } = {}) {
  const lib = library ?? codeLibrary({ kit, root, dir, run });
  const sus = sustainedCue(name), steps = stepsRun(name);
  if (!FITS.has(lib)) FITS.set(lib, new Map());
  const byRun = FITS.get(lib);
  if (!byRun.has(steps)) byRun.set(steps, fromCatalog({ sounds: lib.sounds.filter((s) => (s.run == null || s.run === steps) && !(s.loop || s.duration > LONGEST_S + 2)) }, lib.dir));
  const fit = byRun.get(steps);
  // a place's word in an action's name ("crayon night scribble": the night is where, the scribble is the sound): the action is matched
  let q = name, fam = family;
  if ((fam ?? familyOf(name)) === "ambience") {
    const ws = String(name).split(/[^\p{L}\p{N}-]+/u).filter((w) => w && familyOf(w) !== "ambience");
    if (ws.length) { q = ws.join(" "); fam = familyOf(q); }
  }
  let m = null;
  try { m = matchLocal(q, { family: fam, library: fit, kit, oneShot: true, minDuration: sus ? 0.8 : 0 }); } catch { m = null; }
  return m;
}
/** How well a match answers its cue: 3 exact, 2 good (its own tags say it), 1 right (of the cue's kind: a family's plain sound too), 0 none. */
export const tierOf = (m) => (!m ? 0 : m.exact && !m.generic ? 3 : m.good && !m.generic ? 2 : m.right ? 1 : 0);
/** Does the code take this cue before the library? A kit style takes any answer of the code (its kits forbid the others while the code runs);
 *  any other film the code's answer when it is at least as close as the library's (`lib`: its matchLocal, or null) and of the cue's kind. */
export function codeFirst(code, lib, { kitStyle = false } = {}) {
  if (!code) return false;
  if (kitStyle) return true;
  const c = tierOf(code);
  return c >= 1 && c >= tierOf(lib);
}

// ---- takes: one film's own sounds of a recipe
const fnv = (s) => { let h = 0x811c9dc5; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
/** The film's own key: its project id when it has one, else its folder's name (the seed's start). */
export function filmKey(dir) {
  const meta = readJson(join(dir, ".moworks", "project.json"), {});
  return String(meta.id ?? meta.projectId ?? basename(dir));
}
/** Take k of a recipe for a cue name: { seed, pitch, bright, kitSeed }. A kit's sound itself is take 0 (its own file); the others are new seeds,
 *  a little higher or lower and brighter or darker, so the repeats of one sound vary. */
export function takeOf(film, name, entryId, k) {
  const h = fnv(`${film}|${name}|${entryId}|${k}|v${CODE_VERSION}`);
  const j = (n) => ((h >>> n) % 1000) / 1000 - 0.5;
  return { seed: h, pitch: k ? Math.round(j(3) * 1.6 * 100) / 100 : 0, bright: k ? Math.round(j(13) * 0.3 * 100) / 100 : 0 };
}
const takeFile = (entry, take, dur) => `assets/3_audio/sfx/code-${String(entry.id).replace(/^code-/, "").replace(/[^a-z0-9-]/gi, "-").slice(0, 50)}-${(take.seed ^ fnv(`${dur ?? ""}|${entry.recipe}|${JSON.stringify(entry.params ?? {})}`)).toString(36)}.wav`;
/** What the sound is called on screen and in the credits: plain words, never a path ("Crayon writing", "Door knock wood 2"). */
const titleOf = (entry, k) => `${String(entry.tags?.[0] ?? entry.id).replace(/[^\p{L}\p{N} ]+/gu, " ").trim().replace(/^./, (c) => c.toUpperCase())}${k ? ` ${k + 1}` : ""}`;

/** The credit of a code-made sound (index.mjs creditLine reads it). */
function creditOf(entry, root) {
  const p = pins(root);
  if (entry.prebuilt || String(entry.recipe).startsWith("kit:")) {
    const [, builder, fn] = /^kit:([^:]+):(.+)$/.exec(entry.recipe) ?? [];
    const kitDir = String(builder ?? "").split("/")[0], pin = p[kitDir] ?? {};
    // Ricks Clip's synths are in its worked example's audio.py (the skill folder's kit/), the others in each kit's own builder
    const file = kitDir === "ricks-clip" ? "ricks-clip/kit/example/soldier/audio.py" : `${builder}.py`;
    return { name: `the owner's ${pin.title ?? kitDir} ${pin.version ?? ""}`.replace(/\s+/g, " ").trim(), author: "Moworks Studio (the owner's own code)", licence: "the owner's own",
      how: `made by code from the owner's synthesis: the kit's own recipe ${fn} (bundle/styles/moworks-kits/${file}, the kit pinned at SHA-256 ${String(pin.sha256 ?? "").slice(0, 12)}), numpy/scipy, the film's own seed` };
  }
  const story = p.story ?? {};
  const own = entry.kept || entry.film;
  return { name: own ? "a recipe written for a film" : "the app's sound recipes", author: "Moworks Studio", licence: "the owner's own",
    how: `made by code from the owner's synthesis: ${own ? "a recipe written for a film, run in the app's restricted runner" : `Moworks Studio's recipe "${entry.recipe}" (tools/sfx-code/recipes.py)`} with the owner's sfxlib (bundle/styles/moworks-kits/story/tools/sfx/sfxlib.py, ${story.title ?? "Story Animation Kit"} ${story.version ?? ""} pinned at SHA-256 ${String(story.sha256 ?? "").slice(0, 12)}), numpy/scipy, the film's own seed` };
}

/** Run make.py on jobs, split over a few processes: { made: Map out -> stats, failed: [{ out, error }] }. */
async function runMake(root, jobs, { signal = null, timeoutMs = 180000 } = {}) {
  const exe = pythonExe(root), made = new Map(), failed = [];
  if (!exe || !jobs.length) return { made, failed: jobs.map((j) => ({ out: j.out, error: "Python is not on this computer" })).filter(() => !exe) };
  const tmp = mkdtempSync(join(tmpdir(), "mw-code-sfx-")), parts = Math.min(3, Math.ceil(jobs.length / 12));
  try {
    await Promise.all(Array.from({ length: parts }, (_, i) => new Promise((done) => {
      // a recipe Claude wrote runs in a process of its own: whatever it does, the others are made
      const mine = jobs.filter((_, k) => k % parts === i), file = join(tmp, `jobs-${i}.json`);
      writeFileSync(file, JSON.stringify({ kits: kitsDir(root), jobs: mine }));
      const c = execFile(exe, ["-I", "-B", join(root, ...SCRIPT), file], { env: { ...process.env, MW_PYLIBS: pyLibs(root), PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" }, cwd: tmp, windowsHide: true, timeout: timeoutMs, maxBuffer: 16 << 20 },
        (e, so) => {
          let ans = null; try { ans = JSON.parse(String(so).trim().split(/\r?\n/).pop()); } catch { /* no answer */ }
          for (const m of ans?.made ?? []) made.set(m.out, m);
          for (const f of ans?.failed ?? []) failed.push(f);
          if (!ans) for (const j of mine) failed.push({ out: j.out, error: e ? String(e.message).split("\n")[0] : "no answer" });
          done();
        });
      signal?.addEventListener("abort", () => c.kill(), { once: true });
    })));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  return { made, failed };
}
/** A made sound that would play wrong: silent, clipped, DC offset, or starting or ending on a step (a click). */
const badTake = (m) => !m || !(m.seconds > 0.01) || !(m.peak_db <= -0.9) || !(m.mmax > -60) || m.dc > 0.01 || m.edge > 0.02;

/** Make (or find, from an earlier placement) the takes of each cue name the code answers and record them in the film's sfx.json: asks
 *  [{ name, entry, takes, dur }] (dur: how long a sustained sound must last). Returns { used: Map name -> record, failed: [names] }. */
export async function makeCodeSounds(dir, asks, { root = APP_ROOT, signal = null, run = true } = {}) {
  const film = filmKey(dir), jobs = [], plan = [];
  for (const a of asks) {
    const e = a.entry, n = Math.max(1, Math.min(MAX_TAKES, a.takes ?? 1)), list = [];
    const dur = e.sustained ? Math.round(Math.min(LONGEST_S, Math.max(Number(e.duration) || 1, Number(a.dur) || 0)) * 100) / 100 : null;
    for (let k = 0; k < n; k++) {
      if (k === 0 && e.prebuilt && e.path && existsSync(e.path)) { list.push({ k, prebuilt: true }); continue; }
      if (!run || (e.prebuilt && !e.recipe)) continue;
      const take = takeOf(film, a.name, e.id, k), rel = takeFile(e, take, dur);
      list.push({ k, rel, take });
      if (!existsSync(join(dir, ...rel.split("/")))) jobs.push({ recipe: e.recipe, params: { ...(e.params ?? {}), ...(dur ? { dur } : {}) }, seed: take.seed, pitch: take.pitch, bright: take.bright, out: join(dir, ...rel.split("/")), rel });
    }
    plan.push({ a, list });
  }
  mkdirSync(join(dir, "assets", "3_audio", "sfx"), { recursive: true });
  const res = jobs.length ? await runMake(root, jobs.map(({ rel, ...j }) => j), { signal }) : { made: new Map(), failed: [] };
  const bad = new Set();
  for (const j of jobs) { const m = res.made.get(j.out); if (badTake(m)) { bad.add(j.rel); try { rmSync(j.out, { force: true }); } catch { /* gone */ } } }
  const st = readJson(join(dir, ".moworks", "sfx.json"), { sounds: {} }), used = new Map(), failed = [];
  for (const { a, list } of plan) {
    const e = a.entry, cr = creditOf(e, root);
    const vs = list.map((x) => {
      if (x.prebuilt) {
        const rel = `assets/3_audio/sfx/${e.id}.ogg`;
        if (!existsSync(join(dir, ...rel.split("/")))) copyFileSync(e.path, join(dir, ...rel.split("/")));
        return { id: e.id, title: titleOf(e, x.k), family: e.family, file: rel, durationS: e.duration ?? null, lufs: e.lufs ?? null, onset: e.onset ?? 0, credit: cr };
      }
      if (bad.has(x.rel) || !existsSync(join(dir, ...x.rel.split("/")))) return null;
      const m = res.made.get(join(dir, ...x.rel.split("/")));
      return { id: `${e.id}#${x.k}`, title: titleOf(e, x.k), family: e.family, file: x.rel, durationS: m?.seconds ?? e.duration ?? null, onset: 0, seed: x.take.seed, credit: cr };
    }).filter(Boolean);
    if (!vs.length) { failed.push(a.name); continue; }
    retire(st, st.sounds[a.name]);
    st.sounds[a.name] = { ...vs[0], id: `code:${e.id}`, source: "code", recipe: e.recipe, creator: cr.author, licence: cr.licence, why: a.why ?? null,
      ...(vs.length > 1 ? { variants: vs } : {}), addedAt: new Date().toISOString() };
    used.set(a.name, st.sounds[a.name]);
    // a recipe written for this film that made a sound the checks pass: kept for every film (the library grows)
    if (e.film && e.file) keepRecipe(e.file, root);
  }
  mkdirSync(join(dir, ".moworks"), { recursive: true });
  writeFileSync(join(dir, ".moworks", "sfx.json"), JSON.stringify(st, null, 2) + "\n");
  return { used, failed, made: jobs.length - bad.size, broken: [...bad].length, errors: res.failed };
}
/** The files of a record the app replaces stay the app's (st.retired): a sound it downloaded for a name (frog-croak.mp3) is never read as the
 *  user's own sound of that name the next time (auto.mjs applyOwnerSounds; Assets marks it as the app's). */
export function retire(st, old) {
  if (!old || old.source === "owner") return;
  const files = [old.file, ...(old.variants ?? []).map((v) => v.file)].filter(Boolean);
  st.retired = [...new Set([...(st.retired ?? []), ...files])].slice(-2000);
}
function keepRecipe(file, root) {
  try {
    const to = keptRecipesDir(root);
    mkdirSync(to, { recursive: true });
    const dest = join(to, basename(file));
    if (!existsSync(dest)) { copyFileSync(file, dest); const side = file.replace(/\.py$/i, ".json"); if (existsSync(side)) copyFileSync(side, dest.replace(/\.py$/i, ".json")); }
  } catch { /* kept next time */ }
}

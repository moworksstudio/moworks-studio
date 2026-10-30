// Project service: the projects the app knows, on the HF project folder as the source of truth.
// A project = an HF project folder (index.html, compositions/, STORYBOARD.md) + `.moworks/project.json` (our metadata: brief, format, style,
// voice, stages, activity). New projects are made by hf-edit's scaffold (HF's own storyboard parser); existing HF folders can be opened.
// The list lives in runtime/state/projects.json (paths only); a folder that has moved shows as "missing", never recreated or dropped.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { randomBytes } from "node:crypto";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";
import { scaffold } from "../hf-edit/scaffold.mjs";
import { isStarterPage } from "../hf-edit/shots.mjs";
import { filmLength } from "../hf-edit/ending.mjs";
import { APP_OWN, LAYOUT_VERSION, appSounds, migrateLayout } from "./layout.mjs";
import { showInExplorer } from "./explorer.mjs";
import { designChoice, keepAskedKit, writeDesign } from "./design.mjs";
import { styleFpsRule } from "../style-catalog/fps.mjs";
export { A as LAYOUT, APP_OWN, LAYOUT_VERSION } from "./layout.mjs";

export const ASPECTS = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080], "4:5": [1080, 1350] };
export const STAGES = ["brief", "storyboard", "motionPlan", "build", "review", "export"];
/** General style only: how Claude uses what the user imported (the kit's "what did the user give"). */
export const INPUT_MODES = ["auto", "keep", "relayout", "free", "reference", "remake"];

export function workRoot(root = APP_ROOT) {
  if (process.env.MW_WORK_ROOT) return resolve(process.env.MW_WORK_ROOT);    // tests: a temp work folder
  const p = loadPins(root).storage;
  return resolve(expandEnv(p?.workRoot ?? join(root, "..")));
}
export const projectsRoot = (root = APP_ROOT) => join(workRoot(root), "projects");
const storageFile = (root) => join(process.env.MW_STATE_DIR ?? join(root, "runtime", "state"), "storage.json");
/** Where New project saves by default (Settings): the user's choice, else the app's projects folder. */
export function defaultLocation(root = APP_ROOT) {
  const s = readJson(storageFile(root), {});
  return s.projectsLocation && existsSync(s.projectsLocation) ? s.projectsLocation : projectsRoot(root);
}
export function setDefaultLocation(path, root = APP_ROOT) {
  const dir = resolve(String(path ?? ""));
  if (!path || !existsSync(dir) || !statSync(dir).isDirectory()) throw Object.assign(new Error(`Folder not found: ${dir}`), { code: "NOT_FOUND" });
  writeJson(storageFile(root), { ...readJson(storageFile(root), {}), projectsLocation: dir });
  return { location: dir };
}
const registryFile = (root) => join(process.env.MW_STATE_DIR ?? join(root, "runtime", "state"), "projects.json");
const metaFile = (dir) => join(dir, ".moworks", "project.json");

function readJson(p, dflt) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return dflt; } }
function writeJson(p, v) { mkdirSync(dirname(p), { recursive: true }); const tmp = p + ".tmp"; writeFileSync(tmp, JSON.stringify(v, null, 2) + "\n"); renameSync(tmp, p); }

function readRegistry(root) { return readJson(registryFile(root), { projects: [] }); }
function writeRegistry(root, reg) { writeJson(registryFile(root), reg); }

/** A safe folder name from a title (letters, digits, dashes; Vietnamese marks removed). */
export function slugify(title) {
  const s = String(title ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return s || "project";
}

/** The film's own answers kept with the brief: its kind (What If for every style, config/film-kinds.json; an anidoodle medium's own
 *  kinds too: config/anidoodle-pipeline.json filmKinds; no answer is a film as the brief says). */
export const ANSWER_KEYS = ["filmKind"];
/** The film kinds a style offers: every style's (config/film-kinds.json), and an anidoodle medium's own. */
function kindsOf(styleId) {
  const keys = (f, sub) => { try { const j = JSON.parse(readFileSync(join(APP_ROOT, "config", f), "utf8")); return Object.keys(sub ? j[sub] ?? {} : j).filter((k) => !k.startsWith("_")); } catch { return []; } };
  return [...keys("film-kinds.json"), ...(/^anidoodle-[A-Za-z0-9]+$/.test(String(styleId ?? "")) ? keys("anidoodle-pipeline.json", "filmKinds") : [])];
}
export function cleanAnswers(a, styleId = null) {
  const out = {};
  for (const k of ANSWER_KEYS) { const v = a?.[k]; if (typeof v === "string" && v.trim()) out[k] = v.trim().slice(0, 600); else if (typeof v === "boolean") out[k] = v; }
  if (styleId && out.filmKind && !kindsOf(styleId).includes(out.filmKind)) delete out.filmKind;          // a kind this style does not offer
  return out;
}

export const countWords = (text) => (String(text ?? "").trim().match(/\S+/g) ?? []).length;
/** The longest brief the app keeps (PATCH /brief); Claude and the chat get all of it (Test 24: a 4,369-character brief was cut at 4,000,
 *  inside its voice-over script). */
export const BRIEF_MAX = 20000;

function isHfProject(dir) {
  const f = join(dir, "index.html");
  return existsSync(f) && /data-composition-id=/.test(readFileSync(f, "utf8"));
}

function rootInfo(dir) {
  try {
    const html = readFileSync(join(dir, "index.html"), "utf8");
    const tag = /<[^>]*\bdata-composition-id="[^"]*"[^>]*>/.exec(html)?.[0] ?? "";
    const num = (a) => Number(new RegExp(`\\b${a}="([\\d.]+)"`).exec(tag)?.[1] ?? NaN);
    const scenes = (html.match(/data-composition-src=/g) ?? []).length;
    // the new project's starter film (one 3 s title card, data-no-timeline) until the Build writes the real one
    // (the flag and the starter's one scene, never a built film that kept the flag: hf-edit/shots.mjs isStarterPage)
    return { width: num("data-width"), height: num("data-height"), duration: num("data-duration"), scenes, starter: isStarterPage(html) };
  } catch { return null; }
}

function summary(entry) {
  const dir = entry.path;
  if (!existsSync(dir)) return { id: entry.id, path: dir, missing: true, title: entry.title ?? basename(dir) };
  const m = readJson(metaFile(dir), {});
  const r = rootInfo(dir) ?? {};
  const st = statSync(dir);
  return {
    id: entry.id, path: dir, missing: false,
    title: m.title ?? entry.title ?? basename(dir),
    style: m.style ? { id: m.style.id, title: m.style.title } : null,
    // a film not built yet is as long as New project planned it (the 3 s starter said 0:03 on a 40 s film's card), with the ending's fade after it
    aspect: m.format?.aspect ?? null, width: r.width, height: r.height, duration: r.starter && m.targetDurationSec ? filmLength(m, { dir }).total : r.duration, scenes: r.scenes,
    // before the Build the root is the 3 s starter: the Editor can say "not built yet" with the planned length, not a white 3 s film
    built: r.starter === undefined ? null : !r.starter, ...(r.starter ? { plannedDuration: filmLength(m, { dir }).total } : {}),
    status: statusOf(m, dir), stage: currentStage(m), progress: m.pipelineSummary ? { done: m.pipelineSummary.done, total: m.pipelineSummary.total, needsYou: m.pipelineSummary.needsYou ?? 0, unit: m.pipelineSummary.unit ?? "steps" } : null,
    thumbnail: m.thumbnail?.file ?? null,
    updatedAt: m.updatedAt ?? st.mtime.toISOString(), openedAt: entry.openedAt ?? null,
  };
}

/** The card's state: "exported" once a render exists on disk, "needs_review" when a pipeline step waits for the user, else
 *  what the metadata says ("draft"). The step counts come from the pipeline, saved in meta.pipelineSummary when the Editor reads it. */
function statusOf(m, dir) {
  const f = m.lastExport?.file;
  if (f && existsSync(join(dir, ...String(f).split(/[\\/]/)))) return "exported";
  if ((m.pipelineSummary?.needsYou ?? 0) > 0) return "needs_review";
  return m.status ?? "draft";
}

/** Save the pipeline's counts on the project when they changed (the Projects card shows them without computing the pipeline). Design review
 *  The card counts the Pipeline's 5 stages (stagesOf), as the Pipeline column does, never the steps (07/08, 01/06). */
export function savePipelineSummary(id, state, root = APP_ROOT, stages = null) {
  const vis = state.filter((s) => s.visible && !s.hidden);
  const needsYou = vis.filter((s) => s.status === "needs-you").length;
  const sum = stages ? { done: stages.filter((s) => s.status === "done").length, total: stages.length, needsYou, unit: "stages" }
    : { done: vis.filter((s) => s.status === "done" || s.status === "skipped").length, total: vis.length, needsYou, unit: "steps" };
  const old = getProject(id, root)?.meta?.pipelineSummary;
  if (old && old.done === sum.done && old.total === sum.total && (old.needsYou ?? 0) === sum.needsYou && (old.unit ?? "steps") === sum.unit) return sum;
  updateMeta(id, (m) => { m.pipelineSummary = { ...sum, at: new Date().toISOString() }; }, root);
  return sum;
}

function currentStage(m) {
  const s = m.stages ?? {};
  return STAGES.find((k) => (s[k]?.status ?? "not_started") !== "done") ?? "export";
}

export function listProjects(root = APP_ROOT) {
  const reg = readRegistry(root);
  return reg.projects.filter((p) => !p.removed).map(summary);
}

export function getProject(id, root = APP_ROOT) {
  const e = readRegistry(root).projects.find((p) => p.id === id && !p.removed);
  if (!e) return null;
  const s = summary(e);
  if (s.missing) return s;
  const meta = readJson(metaFile(e.path), {});
  const rule = meta.format?.fps ? fpsRuleOf(meta) : null;          // a film made before its style's rate rule reads as the style allows
  if (rule?.allowed?.length && !rule.allowed.includes(Number(meta.format.fps))) meta.format = { ...meta.format, fps: fitFps(meta.format.fps, rule) };
  return { ...s, meta };
}

function addEntry(root, dir, title, { fresh = false } = {}) {
  const reg = readRegistry(root);
  if (fresh) reg.projects = reg.projects.filter((p) => resolve(p.path) !== resolve(dir));     // a new film at a reused path is a new project (new id)
  const found = reg.projects.find((p) => resolve(p.path) === resolve(dir));
  if (found) { found.removed = false; found.openedAt = new Date().toISOString(); writeRegistry(root, reg); return found; }
  const e = { id: randomBytes(6).toString("hex"), path: resolve(dir), title, addedAt: new Date().toISOString(), openedAt: new Date().toISOString() };
  reg.projects.unshift(e);
  writeRegistry(root, reg);
  return e;
}

function activity(m, kind, text) {
  m.activity = [{ at: new Date().toISOString(), kind, text }, ...(m.activity ?? [])].slice(0, 200);
}

/** The opening storyboard for a new project: one title frame (HF STORYBOARD.md format), so the project is a valid HF film at once. */
export function starterStoryboard({ title, aspect, durationSec, width = null, height = null }) {
  const [w, h] = width && height ? [width, height] : ASPECTS[aspect] ?? ASPECTS["16:9"];
  return `---\nformat: ${w}x${h}\nduration: ${Math.round(durationSec)}s\nmessage: ${title.replace(/\n/g, " ")}\n---\n\n## Frame 1 — ${title.replace(/\n/g, " ")}\n- duration: 3s\n- scene: Title card (placeholder until the storyboard is written)\n`;
}

/**
 * Create a project: folder under projects/, HF film from the starter storyboard (hf-edit scaffold), our metadata.
 * input: { title, brief, briefMode: "script" | "idea", aspect, durationSec, brand, style: { id, title, source, rules }, voice: { source } }
 */
/** The checks a new project's own fields need (name, aspect ratio, save folder), without the style; throws INVALID / NOT_FOUND.
 *  Returns { title, base }. The API runs it before it asks Claude Code whether it is signed in, so a wrong request is answered at once. */
export const MAX_DURATION_SEC = 3600;
/** Names Windows keeps for devices: a folder with one of them (or with one as its stem) cannot be made or removed normally. */
export const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

// ---- the film's frame rate: chosen in New project; HyperFrames reads it from the root composition's
// data-fps (its player steps and its render default follow it), so the app writes it there and renders at it.
// 24 · 25 · 30 · 60 for every style, the author's rate by default, else 30 (style-catalog styleFormat)
export const FPS_CHOICES = [24, 25, 30, 60];
// a style may hold its films to its own rates (Brush cartoon 24, 25 or 30, 24 by default, never 50 / 60): { allowed, default }
const ANY_FPS = [24, 25, 30, 60];
/** The rate a style allows nearest to `fps` (its default when none is given); `fps` itself when the style has no rule. */
export function fitFps(fps, rule) {
  const n = Number(fps) > 0 ? Number(fps) : null;
  if (!rule?.allowed?.length) return n;
  if (n == null) return Number(rule.default) || rule.allowed[0];
  return rule.allowed.includes(n) ? n : [...rule.allowed].sort((a, b) => Math.abs(a - n) - Math.abs(b - n) || a - b)[0];
}
const ROOT_TAG = /<[a-z][\w-]*\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i;
/** The root composition's data-fps in index.html, or null. */
export function rootFps(dir) {
  try { const tag = ROOT_TAG.exec(readFileSync(join(dir, "index.html"), "utf8"))?.[0]; const v = Number(/\bdata-fps="([^"]+)"/.exec(tag ?? "")?.[1]); return v > 0 ? v : null; }
  catch { return null; }
}
/** Write the frame rate on the root composition (data-fps), keeping everything else of the tag. */
export function setRootFps(dir, fps) { return setRootAttrs(dir, { "data-fps": fps }); }
/** Write data-* attributes on the root composition (data-fps, data-width, data-height), keeping everything else of the tag. */
function setRootAttrs(dir, attrs) {
  const f = join(dir, "index.html");
  if (!existsSync(f)) return false;
  const html = readFileSync(f, "utf8");
  const tag = ROOT_TAG.exec(html)?.[0];
  if (!tag) return false;
  let next = tag;
  for (const [k, v] of Object.entries(attrs)) {
    const re = new RegExp(`\\b${k}="[^"]*"`);
    next = re.test(next) ? next.replace(re, `${k}="${v}"`) : next.replace(/\s*\/?>$/, (end) => ` ${k}="${v}"${end.trim()}`);
  }
  if (next !== tag) writeFileSync(f, html.replace(tag, next));
  return true;
}
// a project made before its style had a rate rule follows the style's rule too ("never 50 / 60" holds for every Brush film, whenever it
// was made); read at once from the style's config (style-catalog/fps.mjs imports nothing of ours, so no import cycle and no late loading)
const fpsRuleOf = (meta) => meta?.format?.fpsRule ?? (() => { try { return styleFpsRule(meta?.style?.id); } catch { return null; } })();
/** A project's frame rate: what New project stored, else the root composition's data-fps, else 30; held to the style's rates. */
export const projectFps = (p) => { const r = fpsRuleOf(p?.meta); const v = Number(p?.meta?.format?.fps) || (p?.path ? rootFps(p.path) : null) || (r ? null : 30); return r?.allowed?.length ? fitFps(v, r) : v; };
/** Writes the project's rate back on the root composition: Claude may rewrite index.html and lose or change data-fps, and then
 *  HF's player, `hyperframes check` and snapshots fall back to 30 while the timeline and render use the project's. Returns the rate. */
export function keepRootFps(p) {
  const fps = projectFps(p);
  if (p?.path) setRootFps(p.path, fps);
  return fps;
}

/** The film's length in seconds (New project's Length is an After Effects-style timecode): a number of seconds, or a timecode string
 *  "H:MM:SS:FF" or "MM:SS" read at the film's fps and rounded to whole frames. NaN when it is neither. */
export function lengthSeconds(v, fps = 30) {
  if (typeof v === "number") return v;
  const t = String(v ?? "").trim();
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  const r = Number(fps) > 0 ? Number(fps) : 30;
  const tc = /^(\d+):(\d{1,2}):(\d{1,2}):(\d{1,2})$/.exec(t), ms = /^(\d+):(\d{1,2})$/.exec(t);
  if (!tc && !ms) return NaN;
  const [h, m, sec, fr] = tc ? tc.slice(1).map(Number) : [0, Number(ms[1]), Number(ms[2]), 0];
  return Math.round(((h * 60 + m) * 60 + sec) * r + fr) / r;
}

/** A size the user typed: even numbers (the encoder needs them), the long side at most 3840, the short one at
 *  least 320. Returns { width, height, aspect } (aspect: the ratio in its lowest terms, "64:27"), or throws INVALID. */
export const MAX_SIDE = 3840;
export function customSize(width, height) {
  const w = Number(width), h = Number(height);
  if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) throw Object.assign(new Error("Size: two whole numbers, width × height"), { code: "INVALID" });
  if (w % 2 || h % 2) throw Object.assign(new Error("Size: even numbers only (e.g. 1920 × 1080)"), { code: "INVALID" });
  if (Math.max(w, h) > MAX_SIDE) throw Object.assign(new Error(`Size: the long side is at most ${MAX_SIDE}`), { code: "INVALID" });
  if (Math.min(w, h) < 320) throw Object.assign(new Error("Size: the short side is at least 320"), { code: "INVALID" });
  const gcd = (a, b) => (b ? gcd(b, a % b) : a), g = gcd(w, h);
  return { width: w, height: h, aspect: `${w / g}:${h / g}` };
}
/** The film's size from New project's fields: a preset aspect, or "custom" with width and height. { aspect, width, height, custom }. */
export function sizeOf(input) {
  // New project sends width and height with the nearest preset's aspect: a size that is not that preset is a typed one
  const typed = input.width != null && input.height != null && !(ASPECTS[input.aspect] && ASPECTS[input.aspect][0] === Number(input.width) && ASPECTS[input.aspect][1] === Number(input.height));
  if (input.aspect === "custom" || typed) return { ...customSize(input.width, input.height), custom: true };
  if (!ASPECTS[input.aspect]) throw Object.assign(new Error(`Unknown aspect ratio ${input.aspect}`), { code: "INVALID" });
  const [width, height] = ASPECTS[input.aspect];
  return { aspect: input.aspect, width, height, custom: false };
}

export function checkProjectInput(input, root = APP_ROOT) {
  const title = String(input.title ?? "").trim();
  if (!title) throw Object.assign(new Error("Project name is required"), { code: "INVALID" });
  sizeOf(input);
  const stem = slugify(input.folderName || title);
  if (WINDOWS_RESERVED.test(stem)) throw Object.assign(new Error(`“${stem.toUpperCase()}” is a name Windows keeps for itself: choose another project name`), { code: "INVALID" });
  if (lengthSeconds(input.durationSec, input.fps) > MAX_DURATION_SEC) throw Object.assign(new Error("The longest film is 60:00"), { code: "INVALID" });
  if (input.fps != null && !ANY_FPS.includes(Number(input.fps))) throw Object.assign(new Error("Frame rate: 24, 25, 30 or 60"), { code: "INVALID" });
  const base = input.location ? resolve(String(input.location)) : defaultLocation(root);      // any folder; default from Settings
  if (input.location && (!existsSync(base) || !statSync(base).isDirectory())) throw Object.assign(new Error(`Folder not found: ${base}`), { code: "NOT_FOUND" });
  return { title, base };
}

/** The folder a new project would really get: its name (the title's slug, "-2", "-3" when taken), its path, and whether the plain name was taken. */
export function projectFolder(input, root = APP_ROOT) {
  const { base } = checkProjectInput(input, root);
  const slug = slugify(input.folderName || input.title);
  let name = slug, k = 2;
  while (existsSync(join(base, name))) name = `${slug}-${k++}`;
  return { name, path: join(base, name), base, taken: name !== slug, wanted: slug };
}

export async function createProject(input, { root = APP_ROOT, scaffoldFn = scaffold } = {}) {
  const { title, base } = checkProjectInput(input, root);
  if (!input.style?.id) throw Object.assign(new Error("Choose a style"), { code: "INVALID" });
  // a style's own rates: { allowed, default } from the style's config
  const fpsRule = (() => { try { return styleFpsRule(input.style.id, root); } catch { return null; } })();
  if (!fpsRule?.allowed?.length && input.fps != null && !FPS_CHOICES.includes(Number(input.fps))) throw Object.assign(new Error("Frame rate: 24, 25, 30 or 60"), { code: "INVALID" });
  // the style's sizes and rate: a typed size only where the style draws any size; the author's rate when none is given
  const size = sizeOf(input);
  const form = await (async () => { try { const { formatOf } = await import("../style-catalog/index.mjs"); return formatOf(input.style.id, root); } catch { return null; } })();
  if (form && size.custom && !form.sizes.custom) throw Object.assign(new Error("This film style draws only its own sizes: choose one of them"), { code: "INVALID" });
  if (form && !size.custom && !form.sizes.aspects.includes(size.aspect)) throw Object.assign(new Error(`This film style is drawn in ${form.sizes.aspects.join(", ")}`), { code: "INVALID" });
  mkdirSync(base, { recursive: true });
  const { path: dir } = projectFolder(input, root);
  const durationSec = Math.max(5, Math.min(MAX_DURATION_SEC, lengthSeconds(input.durationSec, input.fps) || 60));
  const pins = loadPins(root);
  const registryRoot = expandEnv(pins.hyperframes.registryRoot ?? "");
  await scaffoldFn(dir, starterStoryboard({ title, aspect: size.aspect, durationSec, width: size.width, height: size.height }), { registryRoot });
  const fps = fpsRule?.allowed?.length ? fitFps(input.fps ?? form?.fps.default, fpsRule) : FPS_CHOICES.includes(Number(input.fps)) ? Number(input.fps) : form?.fps.default ?? 30;
  setRootFps(dir, fps);          // HF's player and render read the film's rate here
  if (size.custom) setRootAttrs(dir, { "data-width": size.width, "data-height": size.height });
  const m = readJson(metaFile(dir), {});
  const now = new Date().toISOString();
  const settings = input.settings ?? {};
  Object.assign(m, {
    title, createdAt: m.createdAt ?? now, updatedAt: now, status: "draft",
    // one brief (the story and the direction live in it); New project asks no film kind (the brief says it; What If is coming
    // soon), so a new film has no answers (a film made before keeps its own: cleanAnswers)
    brief: { text: String(input.brief ?? ""), mode: input.briefMode === "script" ? "script" : "idea", words: countWords(input.brief),
      direction: String(input.direction ?? "").slice(0, 4000), answers: {}, editedAt: now },
    format: { aspect: size.aspect, width: size.width, height: size.height, ...(size.custom ? { custom: true } : {}), fps, ...(fpsRule?.allowed?.length ? { fpsRule: { allowed: fpsRule.allowed, default: fpsRule.default } } : {}) },
    targetDurationSec: durationSec, brand: String(input.brand ?? ""),
    style: { ...input.style, appliedAt: now },
    ...(input.style.id === "general" && INPUT_MODES.includes(input.inputMode) ? { inputMode: input.inputMode } : {}),
    flags: { characters: !!input.flags?.characters },
    settings: Object.fromEntries(Object.entries({ model: settings.model, effort: settings.effort, voice: settings.voice, mode: settings.mode, web: settings.web })
      .filter(([, v]) => typeof v === "string" && v && v !== "global")),
    // no voice-over source until the user chooses one (the dialog sends none: "none" made every new film skip the wait for the voice)
    voice: input.voice?.source === "none" ? { source: "none", noVoice: { at: now } } : input.voice?.source ? { source: input.voice.source } : {},
    pipeline: { marks: {}, skips: {}, ran: {} },
    layout: LAYOUT_VERSION,          // assets/ in the app's folders from the start
    ...(input.kickoff ? { kickoff: { pending: true, at: now } } : {}),
    stages: Object.fromEntries(STAGES.map((k) => [k, { status: k === "brief" && String(input.brief ?? "").trim() ? "draft" : "not_started" }])),
  });
  activity(m, "created", `Project created with style "${input.style.title ?? input.style.id}"`);
  // the design the user chose: the Look IS the film's design, written now as frame.md (a plain copy); a style that turns design
  // off (designLocked) takes none
  const { look } = await writeDesign(dir, designChoice(input, { locked: input.designLocked === true }), { root, now });
  if (look) m.look = look; else delete m.look;
  if (input.designLocked === true) {
    m.designLocked = true;          // the style's own design: the prompt says so
    // a Brand Kit chosen there all the same is kept, not applied: Prepare asks how to use it (T25: it was dropped without a word)
    const kit = await keepAskedKit(dir, input.look, { root, now });
    if (kit) m.brandKitAsk = kit; else delete m.brandKitAsk;
  }
  // the film's language (the voice-over and the words on screen) from the brief when it says it; else Prepare asks
  { const lang = briefLanguage(input.brief); if (lang) m.language = { id: lang, by: "brief", at: now }; }
  // the user's saved characters, for a film whose style has characters: those picked in New project (`characters: [ids]`) and those
  // the brief names ("reuse Tofu"), in CHARACTERS.json from the start, so the Character step builds on them and nobody is asked
  const cast = await castFromLibrary(dir, input, root);
  if (cast.length) m.characters = { from: "library", as: existsSync(join(dir, "assets", "_app", "characters")) ? "reference" : "cast", ids: cast, at: now };
  writeJson(metaFile(dir), m);
  const e = addEntry(root, dir, title, { fresh: true });
  return getProject(e.id, root);
}

/** Whether the brief names a saved character: its name written as a name, with its capital, mid-sentence ("cùng Theo đi chợ").
 *  "tiếng gạch cạch theo nhịp" (theo: "along with") once brought Theo into a Lemo film; a capital at a sentence's start is no name
 *  either ("Theo số liệu…"). */
export function namedIn(brief, name) {
  const n = String(name ?? "").normalize("NFC").trim();
  if (!n || n[0] === n[0].toLowerCase()) return false;
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, "gu");
  const text = String(brief ?? "").normalize("NFC");
  for (const m of text.matchAll(re)) {
    const before = text.slice(0, m.index + m[1].length).trimEnd();
    if (before && !/[.!?:…\n"“]$/.test(before)) return true;          // mid-sentence: a name
  }
  return false;
}
/** The library characters a new film starts with: the picked ids and the user's saved characters its brief names. A style with a Character
 *  step takes them in CHARACTERS.json; any other style as a reference to draw them in its own design (assets/_app/characters/).
 *  Returns the ids. (imported here, not above: the kit and the catalog read this module's work root) */
async function castFromLibrary(dir, input, root) {
  let has = false;
  try { const { stylePipeline } = await import("../style-catalog/index.mjs"); has = (stylePipeline(input.style.id, root) ?? []).some((s) => s.id === "character"); } catch { return []; }
  let kit; try { kit = await import("../character-kit/index.mjs"); } catch { return []; }
  // the character layer's selectable ones, and the user's anidoodle humans (a reference in most films, a cast member in a human-hand one)
  const lib = [...(() => { try { return kit.characters(root); } catch { return []; } })().filter((c) => c.selectable),
    ...(() => { try { return kit.humanCharacters(root).map((c) => ({ ...c, group: "yours" })); } catch { return []; } })()];
  const picked = Array.isArray(input.characters) ? input.characters : Array.isArray(input.characters?.ids) ? input.characters.ids : [];          // [ids] or { ids }
  const want = new Set(picked.map(String).filter((id) => lib.some((c) => c.id === id)));
  for (const c of lib) if (c.group === "yours" && namedIn(input.brief, c.name)) want.add(c.id);
  if (!want.size) return [];
  // the author's rigged characters (Bit, the cheetah) come into any anidoodle film as their rig (the engine is staged there),
  // also in a medium with no Character step; the other picked characters stay references there
  const rigs = !has && /^anidoodle-[A-Za-z0-9]+$/.test(String(input.style.id)) ? [...want].filter((id) => kit.humanCharacters(root).some((c) => c.id === id && c.rig)) : [];
  if (rigs.length) {
    try { const humans = await import("../character-kit/humans.mjs"); await humans.useHumans(dir, rigs, { styleId: input.style.id, root }); } catch { return []; }
    const rest = [...want].filter((id) => !rigs.includes(id));
    let refs = []; if (rest.length) { try { const { stageReference } = await import("../character-kit/reference.mjs"); refs = stageReference(dir, rest, root); } catch { /* the rigs are in */ } }
    return [...rigs, ...(Array.isArray(refs) ? refs : [])];
  }
  if (!has) { try { const { stageReference } = await import("../character-kit/reference.mjs"); return stageReference(dir, [...want], root); } catch { return []; } }
  // a human-hand anidoodle film: its people come in as real characters with their engine module (useHumans)
  try {
    const { humanHandOf } = await import("../style-catalog/hands.mjs");
    if (humanHandOf(input.style.id, root)) {
      const humans = await import("../character-kit/humans.mjs");
      const ids = [...want].filter((id) => kit.humanCharacters(root).some((c) => c.id === id));
      if (ids.length && humans.useHumans) { await humans.useHumans(dir, ids, { styleId: input.style.id, root }); return ids; }
      return [];
    }
  } catch { return []; }
  const kitIds = [...want].filter((id) => kit.getCharacter(id, root));          // a Brush film: the character layer's ones
  if (!kitIds.length) return [];
  try { kit.useCharacters(dir, kitIds, root); return kitIds; } catch { return []; }
}

/** Open an existing HF project folder (index.html with a composition root). Adds our metadata file if it has none. */
/**
 * A project made before the current folder layout, moved into it once: its files into 1_design, 2_footage, 3_audio and the
 * app's hidden _app, and every path that names them (layout.mjs, migrateLayout). Recorded in the metadata (`layout`); a file that could not
 * be moved keeps the project on the old version, so the next opening tries again. Returns the result, or null when there was nothing to do.
 */
export function ensureLayout(id, root = APP_ROOT) {
  const p = getProject(id, root);
  if (!p || p.missing || (p.meta?.layout ?? 0) >= LAYOUT_VERSION) return null;
  const r = migrateLayout(p.path, { classify: classifyAsset, sequenceOf });
  updateMeta(id, (m) => {
    if (!r.failed.length) m.layout = LAYOUT_VERSION;
    m.layoutMove = { at: new Date().toISOString(), moved: r.moved.length, failed: r.failed.slice(0, 50) };
  }, root);
  return r;
}

export function openProject(path, root = APP_ROOT) {
  const dir = resolve(String(path ?? ""));
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw Object.assign(new Error(`Folder not found: ${dir}`), { code: "NOT_FOUND" });
  if (!isHfProject(dir)) throw Object.assign(new Error("Not a HyperFrames project: no index.html with a composition root"), { code: "INVALID" });
  const mf = metaFile(dir);
  const m = readJson(mf, null) ?? { schemaVersion: 1, createdAt: new Date().toISOString() };
  m.title ??= basename(dir);
  m.updatedAt ??= new Date().toISOString();
  m.stages ??= Object.fromEntries(STAGES.map((k) => [k, { status: "not_started" }]));
  const fresh = !existsSync(mf);
  if (!m.format?.fps) { (m.format ??= {}).fps = rootFps(dir) ?? 30; if (!fresh) writeJson(mf, m); }          // an imported film keeps its own rate
  if (fresh) { activity(m, "opened", "Opened an existing HyperFrames project"); writeJson(mf, m); }
  const e = addEntry(root, dir, m.title);
  return getProject(e.id, root);
}

/** Change title or style (style change is recorded with the previous style kept for rollback). */
export function updateProject(id, patch, root = APP_ROOT) {
  const p = getProject(id, root);
  if (!p || p.missing) throw Object.assign(new Error("Project not found"), { code: "NOT_FOUND" });
  const m = p.meta;
  if (patch.title != null) {
    const t = String(patch.title).trim();
    if (!t) throw Object.assign(new Error("Project name is required"), { code: "INVALID" });
    // a storyboard note (several sentences) became the film's name; a name is one line of at most 120 characters
    if (t.length > 120 || /[\r\n]/.test(t)) throw Object.assign(new Error("A film name is one line of 120 characters at most"), { code: "INVALID" });
    activity(m, "renamed", `Renamed to "${t}"`); m.title = t;
  }
  if (patch.style) {
    m.styleHistory = [...(m.styleHistory ?? []), m.style].filter(Boolean);
    m.style = { ...patch.style, appliedAt: new Date().toISOString() };
    activity(m, "style", `Style set to "${patch.style.title ?? patch.style.id}"`);
  }
  m.updatedAt = new Date().toISOString();
  writeJson(metaFile(p.path), m);
  const reg = readRegistry(root); const e = reg.projects.find((x) => x.id === id); if (e) { e.title = m.title; writeRegistry(root, reg); }
  return getProject(id, root);
}

/** The film's output after it was made: the New project fields win over the brief, unless the user answers Claude's
 *  question for what the brief says. { aspect, fps, durationSec (seconds or a timecode), by } → the project with `changed` (the fields that
 *  moved). The fps is held to the style's rates; the shape changes only before the build (a built film is drawn in its shape). The root
 *  composition's size and rate follow, and meta.formatChanges keeps each change (the last 20). */
export function setOutputFormat(id, input = {}, root = APP_ROOT) {
  const bad = (msg) => Object.assign(new Error(msg), { code: "INVALID" });
  const p = getProject(id, root);
  if (!p || p.missing) throw Object.assign(new Error("Project not found"), { code: "NOT_FOUND" });
  const m = readJson(metaFile(p.path), {});
  const from = { aspect: m.format?.aspect ?? null, fps: Number(m.format?.fps) || null, durationSec: m.targetDurationSec ?? null };
  const to = { ...from };
  let typed = null;          // a typed size: { width, height } with or without aspect "custom"
  if (input.width != null && input.height != null && (input.aspect == null || input.aspect === "custom")) typed = customSize(input.width, input.height);
  // Brush paints 1920 × 1080 only (style-catalog styleFormat; anidoodle draws any size)
  if (typed && m.style?.id === "brush-cartoon") throw bad("This film style draws only its own sizes");
  if (typed && (typed.width !== m.format?.width || typed.height !== m.format?.height)) {
    if (m.pipeline?.ran?.build) throw bad(`The film is already built in ${from.aspect}: a new shape needs a new storyboard and build`);
    to.aspect = typed.aspect;
  } else if (!typed && input.aspect != null && input.aspect !== from.aspect) {
    if (!ASPECTS[input.aspect]) throw bad(`Unknown aspect ratio ${input.aspect} (${Object.keys(ASPECTS).join(", ")})`);
    if (m.pipeline?.ran?.build) throw bad(`The film is already built in ${from.aspect}: a new shape needs a new storyboard and build`);
    to.aspect = input.aspect;
  }
  if (input.fps != null) {
    const n = Number(input.fps), rule = fpsRuleOf(m), ok = rule?.allowed?.length ? rule.allowed : FPS_CHOICES;
    if (!ok.includes(n)) throw bad(`${input.fps} fps is not a rate this film style allows (${ok.join(", ")})`);
    to.fps = n;
  }
  if (input.durationSec != null) {
    const s = lengthSeconds(input.durationSec, to.fps ?? 30);
    if (!(s >= 5 && s <= 3600)) throw bad("The length is 5 s to 60 min, in seconds or as a timecode (0:30, 0:00:30:00)");
    to.durationSec = s;
  }
  const changed = Object.keys(to).filter((k) => to[k] !== from[k]);
  if (typed && (typed.width !== m.format?.width || typed.height !== m.format?.height) && !changed.includes("aspect")) changed.push("aspect");
  if (!changed.length) return { ...p, changed };
  const [w, h] = typed ? [typed.width, typed.height] : ASPECTS[to.aspect] ?? [m.format?.width, m.format?.height];
  m.format = { ...(m.format ?? {}), aspect: to.aspect, width: w, height: h, fps: to.fps };
  if (typed) m.format.custom = true; else if (changed.includes("aspect")) delete m.format.custom;
  m.targetDurationSec = to.durationSec;
  setRootAttrs(p.path, { ...(changed.includes("aspect") ? { "data-width": w, "data-height": h } : {}), ...(changed.includes("fps") ? { "data-fps": to.fps } : {}) });
  const at = new Date().toISOString();
  m.formatChanges = [...(m.formatChanges ?? []), { at, by: input.by === "claude" ? "claude" : "owner", from, to }].slice(-20);
  activity(m, "format", `Output set to ${to.aspect} · ${to.fps} fps · ${to.durationSec} s`);
  m.updatedAt = at;
  writeJson(metaFile(p.path), m);
  return { ...getProject(id, root), changed };
}

/** Remove from the list only; the folder and its files stay. */
export function removeFromList(id, root = APP_ROOT) {
  const reg = readRegistry(root); const e = reg.projects.find((x) => x.id === id);
  if (!e) throw Object.assign(new Error("Project not found"), { code: "NOT_FOUND" });
  e.removed = true; writeRegistry(root, reg); return { ok: true };
}

/** Point a missing project at its new folder. */
export function relocateProject(id, path, root = APP_ROOT) {
  const dir = resolve(String(path ?? ""));
  if (!isHfProject(dir)) throw Object.assign(new Error("Not a HyperFrames project folder"), { code: "INVALID" });
  const reg = readRegistry(root); const e = reg.projects.find((x) => x.id === id);
  if (!e) throw Object.assign(new Error("Project not found"), { code: "NOT_FOUND" });
  e.path = dir; writeRegistry(root, reg); return getProject(id, root);
}

/** Show the folder in Windows Explorer, its window brought to the front. */
export function revealProject(id, root = APP_ROOT) {
  const p = getProject(id, root);
  if (!p || p.missing) throw Object.assign(new Error("Project folder not found"), { code: "NOT_FOUND" });
  showInExplorer(p.path);
  return { ok: true };
}


/** Change our metadata of a project with fn(meta); returns the project. */
export function updateMeta(id, fn, root = APP_ROOT) {
  const p = getProject(id, root);
  if (!p || p.missing) throw Object.assign(new Error("Project not found"), { code: "NOT_FOUND" });
  const m = p.meta ?? {};
  fn(m);
  writeJson(metaFile(p.path), m);
  return getProject(id, root);
}

// ---- Import assets: every file is COPIED into the project, sorted by kind;
// the user's original stays untouched. Folders (layout.mjs): assets/1_design (PSD, PPTX, PDF, AI, guidelines:
// the film does not play them; Claude reads them through the scan; git does not track them) with 1_design/images (pictures, logos) and
// 1_design/fonts, 2_footage (a numbered image sequence in 2_footage/<name>/), 3_audio/voiceover|music|sfx (sorted by the app). Older
// projects are moved into this layout when they are opened (migrateLayout).
const EXT = {
  images: /\.(png|jpe?g|webp|gif|avif|bmp|tiff?|heic|svg|exr)$/i,
  video: /\.(mp4|mov|webm|m4v|mkv|avi)$/i,
  audio: /\.(mp3|wav|m4a|flac|ogg|aac|opus)$/i,
  fonts: /\.(ttf|otf|woff2?)$/i,
};
export const AUDIO_ROLES = ["voiceover", "music", "sfx"];
export const MAX_ASSET_BYTES = 4 * 1024 ** 3;
export const DESIGN_DIR = "1_design";          // its top level: images/ and fonts/ below it are the film's own files (isDesignPath)
/** A design file (1_design's top level, or a folder of it other than images/ and fonts/; the old sources/ too). */
export const isDesignPath = (rel) => /^sources\//.test(rel) || (/^assets\/1_design\//.test(rel) && !/^assets\/1_design\/(images|fonts)\//.test(rel)) || /^assets\/5_design\//.test(rel);
/** A frame of a numbered image sequence (frame_0001.png, shot 012.jpg): { base } with the name before its number, or null. */
export const sequenceOf = (name) => { const m = /^(.*?)[\s._-]*(\d{3,})\.(png|jpe?g|webp|tiff?|exr)$/i.exec(String(name ?? "")); return m ? { base: (m[1] || "sequence").trim() || "sequence" } : null; };
/** An audio file's folder by its name (the user can move it in the Assets tab; a sound under ~3 s goes to sfx after it is measured). */
export function audioFolder(name, role = null) {
  if (AUDIO_ROLES.includes(role)) return role;
  const n = String(name ?? "").normalize("NFC").toLowerCase();
  if (/(^|[^a-z])(vo|voice|voiceover|voice-over|narration|narrator|giong|giọng|thoai|thoại|loi ?doc|lời ?đọc|doc ?loi|đọc ?lời)([^a-z]|$)/.test(n)) return "voiceover";
  if (/(sfx|whoosh|swoosh|swish|click|pop|ding|impact|riser|hit|boom|transition|ui ?sound)/.test(n)) return "sfx";
  return "music";
}

/** Where a file goes: { area: "assets", folder, kind } (folder under assets/). role (audio, or a talking-head video): voiceover | music | sfx. */
export function classifyAsset(name, role = null) {
  const n = String(name ?? "");
  if (EXT.audio.test(n)) return { area: "assets", folder: `3_audio/${audioFolder(n, role)}`, kind: "audio" };
  if (EXT.video.test(n)) return { area: "assets", folder: "2_footage", kind: "video" };
  if (EXT.fonts.test(n)) return { area: "assets", folder: "1_design/fonts", kind: "font" };
  const seq = sequenceOf(n);
  if (seq && EXT.images.test(n)) return { area: "assets", folder: `2_footage/${safeFileName(seq.base, "sequence").slice(0, 60)}`, kind: "image", sequence: true };
  if (EXT.images.test(n)) return { area: "assets", folder: "1_design/images", kind: "image" };
  return { area: "assets", folder: DESIGN_DIR, kind: /\.(psd|psb)$/i.test(n) ? "psd" : /\.(pptx?|key)$/i.test(n) ? "slides" : /\.pdf$/i.test(n) ? "pdf" : /\.(ai|eps|sketch|fig|xd|indd)$/i.test(n) ? "design" : "document" };
}

/** A file name safe on Windows (Vietnamese letters kept), at most 120 characters. */
export const safeFileName = (s, fallback = "file") => String(s ?? "").normalize("NFC").replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().replace(/^\.+/, "").slice(0, 120) || fallback;

/** The path a new file takes in the project: its kind's folder, with " (2)", " (3)"… when the name is taken. */
export function assetDestination(dir, name, role = null) {
  const c = classifyAsset(name, role);
  const clean = safeFileName(name);
  const folder = c.area === "sources" ? join(dir, "sources") : join(dir, "assets", ...c.folder.split("/"));
  mkdirSync(folder, { recursive: true });
  const dot = clean.lastIndexOf(".");
  const base = dot > 0 ? clean.slice(0, dot) : clean, ext = dot > 0 ? clean.slice(dot) : "";
  let dest = join(folder, clean);
  for (let i = 2; existsSync(dest) || existsSync(dest + ".part"); i++) dest = join(folder, `${base} (${i})${ext}`);
  return { ...c, path: dest, rel: relative(dir, dest).split(sep).join("/") };
}

/** What the project holds, for Claude and the Editor: counts per folder and the file names (sources/ included). */
export function inventory(dir) {
  const out = { assets: {}, sources: [], total: 0 };
  const walk = (d, fn) => { if (!existsSync(d)) return; for (const n of readdirSync(d)) { if (/^desktop\.ini$/i.test(n)) continue; const f = join(d, n), s = statSync(f); if (s.isDirectory()) walk(f, fn); else fn(f, s); } };
  const placed = appSounds(dir);
  walk(join(dir, "assets"), (f, s) => {
    const rel = relative(dir, f).split(sep).join("/");
    // the app's own copies (GSAP, fonts it embeds, sounds it placed)
    if (APP_OWN.test(rel) || /^assets\/sfx\//.test(rel) || placed.has(rel)) return;
    if (isDesignPath(rel)) { out.sources.push({ path: rel, size: s.size }); out.total++; return; }          // reference files, like sources/
    const parts = rel.split("/");
    const folder = parts[1] === "1_design" ? `1_design/${parts[2]}` : parts[1] ?? "";
    (out.assets[folder] ??= []).push({ path: rel, size: s.size }); out.total++;
  });
  walk(join(dir, "sources"), (f, s) => { out.sources.push({ path: relative(dir, f).split(sep).join("/"), size: s.size }); out.total++; });
  return out;
}

// ---- Chat notes: short app lines in the Claude chat ("Added 3 files: …", "Render finished"). Claude reads the ones
// that came after its last task with the next request.
const notesFile = (dir) => join(dir, ".moworks", "notes.json");
export function readNotes(dir) { return readJson(notesFile(dir), { notes: [] }).notes; }
/** Add a note; an "assets" note within 60 s of the last one of the same kind grows it instead (one line per batch of files). */
export function addNote(dir, note) {
  const notes = readNotes(dir);
  const now = new Date().toISOString();
  const last = notes.at(-1);
  if (note.kind === "assets" && last?.kind === "assets" && Date.now() - Date.parse(last.updatedAt ?? last.at) < 60000) {
    last.files = [...new Set([...(last.files ?? []), ...(note.files ?? [])])].slice(0, 500); last.updatedAt = now;
  } else notes.push({ id: randomBytes(4).toString("hex"), at: now, ...note });
  writeJson(notesFile(dir), { notes: notes.slice(-300) });
  return notes.at(-1);
}

/** Change the notes that match (the gate's older "found problems" cards close once it passes). Returns how many changed. */
export function updateNotes(dir, match, patch) {
  const notes = readNotes(dir);
  let n = 0;
  for (const x of notes) if (match(x)) { Object.assign(x, patch); n++; }
  if (n) writeJson(notesFile(dir), { notes });
  return n;
}

/** The user's message answered Claude's question: its "Answer Claude" cards (waiting notes that open the chat) are closed, kept as
 *  "answered" (the chat shows no card for them). Returns how many. */
export const closeChatWaits = (dir) => updateNotes(dir, (n) => n.kind === "waiting" && n.open === "chat", { kind: "answered", answeredAt: new Date().toISOString() });

/** The film's language as the brief says it (when it says none, Prepare asks the user): "en" or
 *  "vi" when it names one ("tiếng Anh", "in English", "voice in Vietnamese"), "vi" when it is written in Vietnamese, else null (Prepare asks). */
export function briefLanguage(text) {
  const t = String(text ?? "").normalize("NFC");
  const en = /tiếng\s*anh|\benglish\b|\bin\s+eng\b|\beng\s+voice\b/i.test(t), vi = /tiếng\s*việt|\bvietnamese\b/i.test(t);
  if (en !== vi) return en ? "en" : "vi";
  if (en && vi) return null;          // both named (a bilingual film, or a question): the user says which is spoken
  return /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i.test(t) ? "vi" : null;
}

/** Set the film's language (the user's answer to Prepare's question, or a change in the Editor): "vi" or "en". */
export function setLanguage(id, lang, by = "owner", root = APP_ROOT) {
  if (!["vi", "en"].includes(lang)) throw Object.assign(new Error("The language is vi or en"), { code: "INVALID" });
  updateMeta(id, (m) => { m.language = { id: lang, by, at: new Date().toISOString() }; }, root);
  return getProject(id, root);
}

// Moworks Studio backend: one Node process on 127.0.0.1 Serves the built UI (ui/dist) and the JSON API, and starts
// the separate preview origin (packages/hf-preview, 07 S-05).
// Security: binds loopback only; every /api request needs the per-session token (header X-MW-Token); the Host header must be this server's
// own address (no DNS rebinding) and a write from another site's Origin is refused. The UI gets the token from the launch URL (?t=...).
// Claude Code's MCP channel (packages/agent/permit-mcp.mjs) gets a token of its own, good for AGENT_API only: Claude's Bash sees that
// environment, and with the session token it could call any API.
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { pipeline as streamPipeline } from "node:stream/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { APP_ROOT, GPU_CHOICES, renderSettings, saveRenderSettings } from "../version-manager/index.mjs";
import * as projects from "../project-service/index.mjs";
import { styleTraits } from "../style-catalog/traits.mjs";
import { filmLength } from "../hf-edit/ending.mjs";
import { getStyle, listStyles, selection, styleDesign, styleList, stylePipeline, warmCatalog } from "../style-catalog/index.mjs";
import { thumbFile } from "../style-catalog/thumbs.mjs";
import { runtimeStatusAsync } from "../system-status/index.mjs";
import { cachedCheck } from "./checkCache.mjs";
import { showInExplorer } from "../project-service/explorer.mjs";
import { placedShots, readShots } from "../hf-edit/shots.mjs";
import { finalize } from "../hf-edit/finalize.mjs";
import { viCatalog } from "../hf-edit/googleFontsVi.mjs";
// a character demo's stills off the server's thread, at the priority the sync snapshotAt had (T27-3)
import { snapshotAtAsync, snapshotAtForeground as snapshotAt } from "../hf-qa/cli.mjs";
import { render as renderFilm } from "../hf-render-worker/client.mjs";
import { encodePoster, tidyStore } from "../library/preview-media.mjs";
import * as characterKit from "../character-kit/index.mjs";
import { startPreviewServer } from "../hf-preview/index.mjs";
import * as rev from "../revisions/index.mjs";
import { Agent, EFFORTS, MODELS, MODES, WEB, agentSettings, effectiveSettings, projectSettingsPatch, saveAgentSettings, usageTotals } from "../agent/index.mjs";
import { status as backupStatus } from "../backup/index.mjs";
import * as blocks from "../blocks-library/index.mjs";
import { renderMissing } from "../blocks-library/previews.mjs";
import * as offlineAssets from "../offline-assets/index.mjs";
import * as looks from "../looks-library/index.mjs";
import * as customLooks from "../looks-library/custom.mjs";
import * as lemo from "../lemo-styles/index.mjs";
import * as mgStyles from "../mg-styles/index.mjs";
import * as whatIfStyles from "../what-if-styles/index.mjs";
import * as anidoodle from "../anidoodle-styles/index.mjs";
import * as library from "../library/index.mjs";
import * as intake from "../intake-library/index.mjs";
import * as vocab from "../vocab-library/index.mjs";
import { renderPreviews as renderIntakePreviews } from "../intake-library/previews.mjs";
import * as plan from "../motion-plan/index.mjs";
import * as pipe from "../pipeline/index.mjs";
import { scanAssets } from "../project-service/scan.mjs";
import { isOption, listRounds, nextLetter, ownerRoundOf, ownerRounds, pendingRevision, recordPick } from "../hf-edit/boards.mjs";
import { spawn } from "node:child_process";
import { createJobs } from "./jobs.mjs";
import { plainMessage } from "./plainError.mjs";
import { RESUME, createAutopilot, createRenderQueue, estimateMinutes, estimateNow, hasCast, isFinished, reviewRounds } from "./autopilot.mjs";
import { productionRoutes } from "./production.mjs";
import { boardRoutes, etaWords, runningEstimate, stillsBehind } from "./boards.mjs";
import { readState as readSfxState } from "../sfx/index.mjs";
import { editorRoutes } from "./editor.mjs";
import { assetRoutes } from "./assets.mjs";
import { characterRoutes } from "./characters.mjs";
import { proxyRoutes } from "./proxy.mjs";
import { styleAeRoutes } from "./styleAe.mjs";
import { prefsRoutes } from "./prefs.mjs";
import { chatNotes } from "./filmNotes.mjs";
import * as hfSkills from "../setup/hf-skills.mjs";
import * as pySetup from "../setup/python.mjs";
import * as firstRun from "../setup/first-run.mjs";
import * as cuda from "../voice/cuda.mjs";
import { claudeService } from "./claude.mjs";
import { pickFolder } from "./folder-picker.mjs";
import { gitKind, isDrivePath, moveGitOutAsync } from "../revisions/drive.mjs";
import * as appUpdate from "../app-update/index.mjs";
import { createUpdateChecker } from "../app-update/schedule.mjs";
import * as characterMaker from "../character-maker/index.mjs";

/** Backups to Drive run as child processes (tools/backup.mjs), so the server never waits on git or Drive: the app and the user's characters once at start and
 *  from Settings (the git hook backs it up after each commit too). Projects and models are never backed up. */
function backupJobs(root, enabled) {
  let running = 0, last = null;
  const run = (args) => {
    if (!enabled) return;
    running++;
    const c = spawn(process.execPath, [join(root, "tools", "backup.mjs"), ...args], { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let out = ""; c.stdout.on("data", (d) => { out += d; }); c.stderr.on("data", (d) => { out += d; });
    c.on("close", (code) => { running--; last = { at: new Date().toISOString(), ok: code === 0, output: out.trim().split(/\r?\n/).slice(-6) }; });
  };
  return {
    all() { run([]); },          // the app and the characters: projects and models are never backed up
    info() { return { ...backupStatus(root), running: running > 0, last, automatic: enabled }; },
  };
}

/** The old PNG / JPEG posters a library store keeps beside the WebP that replaced them (recodePreview with the originals kept aside)
 *  go once the app runs on the WebP: tidyStore() for the Blocks, Looks and intake stores, in the background after start. */
export function tidyPreviews(root = APP_ROOT) {
  for (const st of [blocks.currentStore(root), looks.currentStore(root), intake.currentStore(root)]) {
    if (!st) continue;
    try {
      const items = JSON.parse(readFileSync(join(st.dir, "catalog.json"), "utf8")).items ?? [];          // every item, a hidden one too
      const r = tidyStore(st.dir, items.flatMap((x) => [x.preview?.video, x.preview?.poster]).filter(Boolean));
      if (r.removed) console.log(`[library] ${r.removed} old poster(s) removed (${(r.bytes / 1e6).toFixed(1)} MB)`);
    } catch { /* a store being written: the next start */ }
  }
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".ttf": "font/ttf", ".woff2": "font/woff2", ".json": "application/json", ".ico": "image/x-icon", ".txt": "text/plain" };

class HttpError extends Error { constructor(status, code, message) { super(message); this.status = status; this.code = code; } }
const STATUS = { NOT_FOUND: 404, INVALID: 400, BUSY: 409, RENDERING: 409, CONFLICT: 409, NO_CLAUDE: 503, CLAUDE_SIGNED_OUT: 412, STEP_BLOCKED: 409, MODEL_MISSING: 409, AE_NOT_RUNNING: 409, TOO_LARGE: 413,
  PROVIDER: 502, PROVIDER_OFFLINE: 502, HF_IMPORT: 500 };
// the message the UI shows: a system error (ENOENT…) in plain words, no path of this computer (plainError.mjs)
const fail = (e) => { const s = STATUS[e.code] ?? e.status ?? 500; return [s, { error: { code: e.code ?? "ERROR", message: plainMessage(e) } }]; };
// the voice list's samples play in the page: ElevenLabs serves them from its API (previews/audio, US or main host) and its public
// bucket; nothing else of those hosts is allowed
export const VOICE_SAMPLES = "https://api.elevenlabs.io https://api.us.elevenlabs.io https://storage.googleapis.com/eleven-public-prod/";
const sha = (s) => createHash("sha256").update(s).digest("hex");
/** What Claude Code's own token may call: its permission questions and the app's tools. */
const AGENT_API = /^\/api\/agent\/(?:permit|permit\/wait|tool)$/;
/** A style's pipeline straight from config/styles.json, or config/lemo-pipeline.json for a Lemo-Opuscar style (cheap enough to read on
 *  every poll; the style catalog also hashes rule files). */
/** the status button says only Idle, Working, Downloading or Updating. The app's own update wins, then a download
 *  (first run, models, the offline files, a style source, Python's components), then any Claude task or other job. */
const DOWNLOADS = new Set(["first-run", "offline-assets", "style-source", "setup-python", "setup-hf-skills", "model-install"]);
/** The app's own update check waits while one of these runs: the update itself, an export, the film's pre-render. */
const UPDATE_WAITS_FOR = new Set(["app-update", "export", "preview-proxy"]);
export const updateCheckWaits = (jobs, renders) => jobs.running().some((j) => UPDATE_WAITS_FOR.has(j.kind)) || !!renders?.status().running;
export function appState(r) {
  const jobs = r.jobs ?? [], up = jobs.find((j) => j.kind === "app-update"), dl = jobs.find((j) => DOWNLOADS.has(j.kind));
  const state = up ? "updating" : dl ? "downloading" : r.tasks.length || jobs.length ? "working" : "idle";
  return { ...r, state, about: up?.title ?? dl?.title ?? null };
}
export function pipelineSteps(styleId, root = APP_ROOT) { return stylePipeline(styleId, root); }
/** The settings plus the lists the UI offers (Bypass only while the experiment is on). */
const agentChoices = (s) => ({ ...s, models: MODELS.map(([k, label]) => [k, label]), efforts: EFFORTS, web: s.web, webChoices: WEB,
  modes: MODES.filter(([k]) => k !== "bypassPermissions" || s.allowBypass) });
/** Text files at the project root the Editor may show and edit (Story, Script, Brief, design notes). */
const DOCS = ["STORY.md", "SCRIPT.md", "BRIEF.md", "frame.md", "design.md", "DESIGN.md", "CHARACTERS.md",
  // what the steps of the new pipelines leave: every result has a dialog that shows it
  "NOTES.md", "ASSETS.md", "STYLE-GUIDE.md", "SHOTS.md", "QC-REVIEW.md"];
/** Documents a step approves as files (the style guide, the shot list): their approval name. */
const APPROVE_DOCS = { styleGuide: "STYLE-GUIDE.md", shots: "SHOTS.md", characters: "CHARACTERS.json" };          // characters: the Brush cartoon's Character step

async function body(req) {
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > 1e6) throw new HttpError(413, "TOO_LARGE", "Request too large"); chunks.push(c); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new HttpError(400, "INVALID", "Body is not JSON"); }
}

const mustProject = (id, root) => {
  const p = projects.getProject(id, root);
  if (!p) throw new HttpError(404, "NOT_FOUND", "Project not found");
  if (p.missing) throw new HttpError(404, "NOT_FOUND", "Project folder not found");
  return p;
};

/** A project of an older folder layout, moved into the user's folders when it is opened: not while Claude changes it or it
 *  renders; committed as one revision; a file that could not be moved is said in the chat (it stays where it was). */
async function relayout(ctx, id, root) {
  if (ctx.agent?.running?.has(id) || ctx.renders?.isRendering(id)) return null;
  let r = null;
  try { r = projects.ensureLayout(id, root); } catch (e) { console.error(`[layout] ${id}: ${e.message}`); return null; }
  if (!r) return null;
  const p = projects.getProject(id, root);
  // recorded beside the server's thread, in the project's git queue (T22-5)
  if (r.moved.length) { try { await rev.saveAsync(p.path, `Assets moved into the new folders (${r.moved.length} file(s))`); } catch { /* revisions optional */ } }
  if (r.failed.length) {
    try { projects.addNote(p.path, { kind: "assets", status: "warning", text: "{n} file(s) could not be moved into the new folders and stay where they are: {list}", vars: { n: r.failed.length, list: r.failed.slice(0, 5).map((f) => f.path).join(", ") } }); } catch { /* notes are best effort */ }
  }
  return r;
}

/** Posters: one HF still per shot (hyperframes snapshot at each shot's middle), cached per project revision. */
function posterJobs(root, previewBase, stopSignal = null) {
  const jobs = new Map();
  const dirFor = (p, r) => join(p.path, ".moworks", "cache", "posters", (r ?? "none").slice(0, 12));
  const files = (p, r, shots) => {
    const d = dirFor(p, r);
    if (!existsSync(d)) return null;
    const list = readdirSync(d).filter((f) => /^frame-\d+-at-[\d.]+s\.png$/.test(f)).sort();
    if (list.length < shots.length) return null;
    return shots.map((s, i) => ({ number: s.number, url: `${previewBase()}/p/${p.id}/.moworks/cache/posters/${(r ?? "none").slice(0, 12)}/${list[i]}` }));
  };
  // the shots a poster is taken of: the mounted ones (a code film draws no frame of its own here: its posters are its storyboard stills)
  const posterShots = (p, shots) => shots.filter((s) => s.start != null);
  /** Each shot's approved storyboard still: the newest draft that holds the approved option, frame N for shot N. [{ number, url }] */
  const boardPosters = (p) => {
    const opt = p.meta?.approvals?.storyboard?.option;
    if (!isOption(opt)) return [];
    const o = [...listRounds(p.path)].reverse().map((r) => r.options.find((x) => x.option === opt && x.stills.length)).find(Boolean);
    if (!o) return [];
    return o.stills.map((rel, i) => ({ number: o.frames[i]?.n ?? i + 1, url: `${previewBase()}/p/${p.id}/${rel}`, board: true }));
  };
  return {
    async get(id) {
      const p = mustProject(id, root);
      const { shots } = await readShots(p.path);
      const r = (await rev.headAsync(p.path)) ?? "none";
      // a code film (one page, which a snapshot here cannot draw for each shot): its approved storyboard stills
      if (pipe.isCodeFilm(p.meta?.style?.id)) { const b = boardPosters(p); return { revision: r, posters: b, status: b.length ? "ready" : "missing", error: null, from: "boards" }; }
      const placed = posterShots(p, shots);
      const ready = placed.length ? files(p, r, placed) : null;
      const j = jobs.get(id);
      // a shot with no poster yet (before the build) shows its approved storyboard still
      const boards = boardPosters(p);
      const posters = ready ?? boards;
      return { revision: r, posters, status: ready ? "ready" : j?.status === "running" && j.rev === r ? "running" : j?.status === "failed" && j.rev === r ? "failed" : "missing", error: j?.error ?? null,
        ...(ready ? {} : boards.length ? { from: "boards" } : {}) };
    },
    async start(id) {
      const p = mustProject(id, root);
      if (pipe.isCodeFilm(p.meta?.style?.id)) return { status: "ready", posters: boardPosters(p), from: "boards" };
      if (jobs.get(id)?.status === "running") return { status: "running" };
      try { await rev.saveAsync(p.path, "Changes before posters"); } catch { /* not a git folder yet */ }
      const r = (await rev.headAsync(p.path)) ?? "none";
      const { shots } = await readShots(p.path);
      const placed = posterShots(p, shots);
      if (!placed.length) return { status: "ready", posters: boardPosters(p) };
      const times = placed.map((s) => +(s.start + Math.min(Math.max((s.duration ?? 1) * 0.5, 0.05), Math.max((s.duration ?? 1) - 0.05, 0.05))).toFixed(3));
      const out = dirFor(p, r);
      mkdirSync(out, { recursive: true });
      const job = { status: "running", rev: r, error: null };
      jobs.set(id, job);
      snapshotAtAsync(p.path, times, out, { signal: stopSignal }).then((x) => { job.status = x.exitCode === 0 ? "done" : "failed"; if (x.exitCode !== 0) job.error = x.stderrTail.join(" ").slice(-300); });
      return { status: "running" };
    },
  };
}

/** Project thumbnails: once a film has built shots, HF stills at the middle of up to 5 shots, and the one with the most detail
 *  (the largest PNG: flat frames compress small) becomes the card's picture. Made again only when the film's pictures changed (a new
 *  revision of compositions / index.html / assets, the Editor's element ids left out); one project at a time, in the background, never per
 *  keystroke: asked for when the project list is read and after a Claude task. */
function thumbnailJobs(root, enabled, stopSignal = null) {
  const queue = [], queued = new Set();
  let busy = false;
  const work = async (id) => {
    const p = projects.getProject(id, root);
    if (!p || p.missing || !existsSync(join(p.path, ".git"))) return;
    const workRev = await rev.lastWorkRevAsync(p.path);
    if (!workRev || p.meta?.thumbnail?.rev === workRev) return;
    const { shots, root: comp } = await readShots(p.path).catch(() => ({ shots: [] }));
    if (pipe.isStarter(shots)) return;
    const placed = placedShots(shots, comp?.duration).filter((s) => s.duration);          // a one-page code film: its planned shots
    if (!placed.length) return;
    const pick = placed.length <= 5 ? placed : [0, 1, 2, 3, 4].map((i) => placed[Math.round((i * (placed.length - 1)) / 4)]);
    const dir = join(p.path, ".moworks", "cache", "posters", "thumb-work");
    rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    await snapshotAtAsync(p.path, pick.map((s) => +(s.start + s.duration / 2).toFixed(3)), dir, { signal: stopSignal });
    const best = readdirSync(dir).filter((f) => f.endsWith(".png")).map((f) => ({ f, size: statSync(join(dir, f)).size })).sort((a, b) => b.size - a.size)[0];
    if (!best) return;
    const file = `thumb-${workRev.slice(0, 12)}.png`, posters = join(p.path, ".moworks", "cache", "posters");
    for (const old of readdirSync(posters).filter((f) => /^thumb-[0-9a-f]+\.png$/.test(f))) rmSync(join(posters, old), { force: true });
    renameSync(join(dir, best.f), join(posters, file));
    rmSync(dir, { recursive: true, force: true });
    projects.updateMeta(id, (m) => { m.thumbnail = { file, rev: workRev, at: new Date().toISOString() }; }, root);
  };
  const next = async () => {
    if (busy || !queue.length) return;
    busy = true;
    const id = queue.shift(); queued.delete(id);
    try { await work(id); } catch { /* a still that fails keeps the old picture */ } finally { busy = false; setTimeout(next, 200); }
  };
  return {
    ask(id) { if (!enabled || queued.has(id)) return; queued.add(id); queue.push(id); next(); },
    url: (p, base) => (p.thumbnail ? `${base}/p/${p.id}/.moworks/cache/posters/${p.thumbnail}` : null),
  };
}

/** The API routes: [method, pattern, handler(params, body, query)]. */
export function routes(ctx) {
  const { root } = ctx;
  // a project whose style id the catalog does not have is a project with no style: it is answered with none (no title shown);
  // the catalog is read once it is built (ctx.catalogReady: the worker at start, so the first page is not held on this thread)
  const knownStyle = (s) => (s?.id && getStyle(s.id, root) ? s : null);
  const catalogReady = () => Promise.resolve(ctx.catalogReady).catch(() => {});
  /** The project's pipeline now: the style's steps judged on its files, metadata, running jobs and the running Claude task. */
  const pipelineOf = async (id) => {
    const p = mustProject(id, root);
    const steps = pipelineSteps(p.meta?.style?.id, root);
    const { shots } = await readShots(p.path).catch(() => ({ shots: [] }));
    const git = existsSync(join(p.path, ".git"));
    // git's answers beside the server's thread, in the project's queue (T22-5: each read held every request on a busy computer)
    const [head, workAt, qaStale] = git ? await Promise.all([rev.headAsync(p.path), rev.lastWorkChangeAsync(p.path, "compositions"),
      p.meta?.lastQa ? rev.changedSinceAsync(p.path, p.meta.lastQa.revision) : undefined]) : [null, undefined, undefined];
    const tid = ctx.agent.running.get(id);
    // a message being sent (its task starts after the sign-in check) answers the question and keeps Claude busy already
    const answering = !tid && !!ctx.agent.starting?.has(id);
    const lastTasks = {};          // each step's last Claude task (a Stop shows as "stopped")
    const all = ctx.agent.list(id);
    // `asked`: it ended with a question to the user and is the last task of the film (nobody answered yet)
    for (const t of all) if (t.step) lastTasks[t.step] = { status: t.status, at: t.updatedAt ?? t.createdAt, id: t.id,
      asked: !answering && t.status === "done" && t.id === all.at(-1)?.id && (pipe.appAsked(t) || pipe.asksOwner(t.resultText)) };
    // the film's last task is a chat turn that ended with a question to the user (e.g. which font): nobody answered yet
    const lastAll = all.at(-1), chatAsked = !answering && !!lastAll && !lastAll.step && lastAll.status === "done" && pipe.asksOwner(lastAll.resultText);
    const facts = pipe.gatherFacts(p, { shots, head, jobs: ctx.jobs.list({ projectId: id }), runningTask: tid ? ctx.agent.get(tid) : answering ? { id: "starting", step: null, status: "running", starting: true } : null, lastTasks,
      workAt, qaStale,
      extra: { chatAsked, revisionAsked: !tid && !!pendingRevision(p.path) } });
    const state = pipe.computePipeline(steps, facts);
    return { p, steps, state, facts };
  };
  ctx.pipelineOf = pipelineOf;
  /** The films whose pipeline was read since the app started: the autopilot goes on once for each. */
  const resumedOnOpen = new Set();
  /** The earlier step whose change asks this approved step to be done again (redo with canKeep), by its title, else null. */
  const movedSince = async (id, stepId) => {
    try { const s = (await pipelineOf(id)).state.find((x) => x.id === stepId); return s?.status === "redo" && s.canKeep ? s.reason?.vars?.step ?? "an earlier step" : null; }
    catch { return null; }
  };
  /** Refuse an action whose step is not open yet (STEP_BLOCKED: the server refuses to jump ahead). */
  const mustOpen = async (id, stepId) => {
    const { state } = await pipelineOf(id);
    if (!state.some((x) => x.id === stepId)) return;           // a style without this step (older projects): nothing to hold
    const why = pipe.blockedReason(state, stepId);
    if (why) throw Object.assign(new HttpError(409, "STEP_BLOCKED", pipe.fill(why.key, why.vars ?? {})), { detail: { step: stepId, reason: why } });
  };
  const mark = (id, fn) => projects.updateMeta(id, (m) => { m.pipeline ??= {}; for (const k of ["marks", "skips", "ran"]) m.pipeline[k] ??= {}; fn(m.pipeline, m); }, root);
  const P = "([0-9a-f]+)", T = "([0-9a-f]{12})";
  const r = (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn];
  return [
    r("GET", "/health", () => ({ ok: true, app: "Moworks Studio", time: new Date().toISOString() })),
    // Exit (top bar): what would be stopped, then stop everything and close the app window (only when started by the launcher)
    r("GET", "/app", () => ({ canExit: !!ctx.onExit, running: ctx.running() })),
    r("POST", "/app/exit", () => {
      if (!ctx.onExit) throw new HttpError(404, "NOT_FOUND", "Exit works when the app was started from its launcher");
      setTimeout(() => ctx.onExit(), 300);                 // answer first, then stop
      return { ok: true, stopping: ctx.running() };
    }),
    // Settings › Update: the app's own version from the user's GitHub repo; an update ends with a restart. The read answers from the
    // last check (the app's own, every six hours, or "Check for updates"): the top bar's notice and the panel never wait on GitHub
    r("GET", "/app/update", async () => ({ ...(await appUpdate.status(root)), ...(ctx.updates?.notice() ?? {}), check: ctx.updates?.answer() ?? null })),
    r("POST", "/app/update/check", () => (ctx.updates ? ctx.updates.run() : appUpdate.check(root))),
    r("POST", "/app/update/apply", () => {
      const busy = ctx.running().filter((x) => !x.idle);
      if (busy.length) throw new HttpError(409, "BUSY", `Update when nothing is running: ${busy.map((x) => x.title).join(", ")}`);
      return ctx.jobs.start("app-update", { title: "Updating Moworks Studio" }, async (job) => {
        const res = await appUpdate.apply(root, { signal: job.signal, onStep: (stage) => job.update({ stage }) });
        if (ctx.onRestart) setTimeout(() => ctx.onRestart(), 2000);          // the window reads "done" first; the new version opens a new window
        return { ...res, restarting: !!ctx.onRestart };
      });
    }),
    // Claude sign-in: the top-bar chip reads it; sign in / out run Claude Code's own `auth login` / `auth logout`
    r("GET", "/claude/status", (_p, _b, q) => ctx.claude.status({ refresh: q.get("refresh") === "1" })),
    r("POST", "/claude/login", () => ctx.claude.startLogin()),
    r("POST", "/claude/login/code", (_p, b) => ctx.claude.sendCode(b.code)),
    r("POST", "/claude/login/cancel", () => ctx.claude.cancelLogin()),
    r("POST", "/claude/logout", () => ctx.claude.logout()),
    // Claude's settings: model (5.5 only), effort, mode (as in Claude Code; Bypass only with the experiment on), web
    r("GET", "/agent/settings", () => agentChoices(agentSettings(root))),
    r("PATCH", "/agent/settings", (_p, b) => agentChoices(saveAgentSettings(b, root))),
    // rendering on the GPU: auto (the GPU when this computer has a usable one, checked with a test frame per export) or always CPU
    r("GET", "/render/settings", () => ({ ...renderSettings(root), choices: GPU_CHOICES })),
    r("PATCH", "/render/settings", (_p, b) => {
      try { return { ...saveRenderSettings({ gpu: b?.gpu }, root), choices: GPU_CHOICES }; } catch (e) { throw new HttpError(400, "INVALID", e.message); }
    }),
    // a question from Claude Code through the app's MCP permission tool (packages/agent/permit-mcp.mjs): answered when the user answers
    r("POST", "/agent/permit", async (_p, b) => ctx.agent.permit(String(b.task ?? ""), { tool_name: String(b.tool_name ?? ""), input: b.input ?? {} })),
    r("POST", "/agent/permit/wait", async (_p, b) => ctx.agent.waitAnswer(String(b.id ?? ""))),
    // one of the app's own tools, called by Claude through the same MCP server (packages/agent/permit-mcp.mjs)
    r("POST", "/agent/tool", async (_p, b) => ctx.agent.callTool(String(b.task ?? ""), String(b.name ?? ""), b.arguments ?? {})),
    // off the server's thread; answered at once with the last result while it runs again (?fresh=1 waits for the new one)
    r("GET", "/system", (_p, _b, q) => ctx.checks.system.get({ fresh: q.get("fresh") === "1" })),
    // the Google Fonts that draw Vietnamese: the pinned list with each family's author, licence and size, for a font picker
    r("GET", "/fonts/google-vi", () => viCatalog()),
    r("POST", "/setup/assets", () => ctx.installAssets()),
    // HyperFrames' skills and registry at the pinned commit (thin git fetch), and the app's Python components (pip, pinned)
    r("POST", "/setup/hf-skills", () => ctx.jobs.start("setup-hf-skills", { title: "HyperFrames skills" }, async (job) => {
      const r0 = await hfSkills.fetchSkills(root, { onLine: (l) => job.update({ stage: l }) });
      const v = hfSkills.verifySkills(root, { fresh: true });
      if (!v.ok) throw Object.assign(new Error("The fetched skills do not match HyperFrames' manifest"), { code: "INTEGRITY" });
      return { ...r0, skills: Object.keys(v.skills).length };
    })),
    // first run on a new computer: the list of everything beyond the repository with sizes, one "Download all", the work
    // folder, one style author's source at its pinned commit
    // off the server's thread; the last list at once while it is checked again (?fresh=1 waits)
    r("GET", "/setup/first-run", async (_p, _b, q) => ({ ...(await ctx.checks.firstRun.get({ fresh: q.get("fresh") === "1" })), bundle: firstRun.bundleManifest(root) })),
    r("POST", "/setup/first-run", (_p, b) => ctx.jobs.start("first-run", { title: "Setting up Moworks Studio" }, async (job) =>
      firstRun.firstRunAll({ root, ids: Array.isArray(b.ids) ? b.ids.map(String) : null, signal: job.signal, onProgress: ({ id, stage }) => job.update({ stage: `${id}: ${stage}` }) }))),
    r("POST", "/setup/work-folder", (_p, b) => firstRun.setWorkFolder(b.path, root)),
    // Whisper on the graphics card. GET: the card, the pack (name, source, size, licence), installed or not, `ask` (asked once on
    // a computer past its first run), the device Whisper uses and the last run's. POST { answer: yes | no }: yes installs it (a job)
    r("GET", "/setup/whisper-gpu", () => cuda.gpuState(root)),
    r("POST", "/setup/whisper-gpu", (_p, b) => {
      const a = String(b?.answer ?? "");
      if (a === "yes" && !cuda.eligible(cuda.detectGpu())) throw new HttpError(409, "NO_GPU", "This computer has no NVIDIA card for it");
      cuda.answer(a, root);
      if (a !== "yes") return cuda.gpuState(root);
      return ctx.jobs.start("first-run", { title: cuda.PACK.title }, async (job) =>
        firstRun.firstRunAll({ root, ids: [cuda.PACK.id], signal: job.signal, onProgress: ({ id, stage }) => job.update({ stage: `${id}: ${stage}` }) }));
    }),
    r("DELETE", "/setup/whisper-gpu", () => ({ pack: cuda.remove(root) })),
    r("POST", "/setup/style-source/(lemo|mgStyles|anidoodle|characterKit|whatIf)", ([key]) => ctx.jobs.start("style-source", { title: `Style source ${key}`, key }, async (job) =>
      firstRun.fetchStyleSource(key, { root, onLine: (l) => job.update({ stage: l }) }))),
    r("POST", "/setup/python", () => ctx.jobs.start("setup-python", { title: "Python components" }, async (job) => {
      const r0 = await pySetup.install(root, { onLine: (l) => job.update({ stage: l.slice(0, 120) }), signal: job.signal });
      return { installed: r0.installed, ready: (await pySetup.statusAsync(root)).ready };
    })),
    // The whole library as the user arranges it: author, then kind (Motions / Blocks / Looks), then category
    r("GET", "/library", (_p, _b, q) => ({ ...library.search({ q: q.get("q") ?? "", author: q.get("author") ?? "all", kind: q.get("kind") ?? "all",
      category: q.get("category") ?? "all", ids: q.get("ids") ? q.get("ids").split(",") : null, offset: Number(q.get("offset") ?? 0), limit: Math.min(60, Number(q.get("limit") ?? 12)),
        kinds: q.get("kinds") ? q.get("kinds").split(",") : null }, root),
      stores: { blocks: blocks.currentStore(root)?.manifest ?? null, looks: looks.currentStore(root)?.manifest ?? null,
        intake: intake.currentStore(root)?.manifest ?? null, vocab: vocab.currentStore(root)?.manifest ?? null },
      importing: false, blocksJob: ctx.jobs.list({ kind: "blocks-import" })[0] ?? null,
      previewJob: ctx.jobs.list({ kind: "blocks-previews" })[0] ?? null, looksJob: ctx.jobs.list({ kind: "looks-import" })[0] ?? null })),
    r("GET", "/library/item", (_p, _b, q) => { const it = library.getItem(q.get("uid") ?? "", root); if (!it) throw new HttpError(404, "NOT_FOUND", "Library item not found"); return it; }),
    // Library intake (Magic UI, Codrops, TakayuStudio written as HyperFrames components; built and rendered by its cli.mjs):
    // delete for good (cards with deletable: true); restore puts it back: built again, its preview rendered again
    r("POST", "/library/intake/delete", (_p, b) => { const r0 = intake.deleteItem(String(b?.uid ?? ""), root); library.reload(); return r0; }),
    r("GET", "/library/intake/deleted", () => ({ items: intake.deletedList(root) })),
    r("POST", "/library/intake/restore", async (_p, b) => {
      const uid = String(b?.uid ?? ""), r0 = intake.restoreItem(uid, root);
      await intake.buildStore({ root }); intake.reloadItems(); library.reload();
      const job = ctx.jobs.start("intake-previews", { title: "Rendering the restored item's preview" }, async (j) => {
        const res = await renderIntakePreviews({ root, only: [uid], signal: j.signal }); library.reload(); return res;
      });
      return { ...r0, job };
    }),
    r("POST", "/library/looks/import", () => ctx.jobs.start("looks-import", { title: "Preparing HyperFrames looks" }, async (job) => {
      const st = await looks.importLooks({ root, onProgress: ({ done, total }) => job.update({ progress: Math.floor((done / total) * 100), stage: `${done} of ${total}` }) });
      return st.manifest;
    })),
    // Looks HF's frame presets and the user's own Looks in one list; a user's Look is made from a guideline
    // (create, upload its files, scan: a job) and kept with versions
    r("GET", "/looks", () => customLooks.apiLooks(root)),
    r("GET", "/looks/((?:frame|custom)/[a-z0-9-]+)", ([id]) => customLooks.apiLook(id, root)),
    r("POST", "/looks", (_p, b) => customLooks.publicLook(customLooks.createLook(b, root))),
    r("POST", "/looks/(custom/[a-z0-9-]+)/scan", ([id]) => {
      const m = customLooks.getCustom(id, root);
      if (!m) throw new HttpError(404, "NOT_FOUND", "Brand Kit not found");
      if (!m.files.length) throw new HttpError(400, "INVALID", "Add the guideline's files first");
      return ctx.jobs.start("look-scan", { title: `Scanning ${m.title}`, key: id }, async (job) => customLooks.publicLook(await customLooks.scanLook(id, { root, signal: job.signal,
        onProgress: ({ stage, progress }) => job.update({ stage, progress }) })));
    }),
    r("PATCH", "/looks/(custom/[a-z0-9-]+)", async ([id], b) => customLooks.publicLook(await customLooks.patchLook(id, b, { root }))),
    r("POST", "/looks/(custom/[a-z0-9-]+)/versions/(\d+)/restore", async ([id, v]) => customLooks.publicLook(await customLooks.restoreVersion(id, v, { root }))),
    r("DELETE", "/looks/(custom/[a-z0-9-]+)/files", ([id], _b, q) => customLooks.publicLook(customLooks.removeFile(id, q.get("name") ?? "", root))),
    r("DELETE", "/looks/(custom/[a-z0-9-]+)", ([id]) => customLooks.deleteLook(id, root)),
    // Characters the character layer's characters, each with its credit, whether a project may use it (Clawd: a demo
    // only, never), and its demo media (the views and emotions sheets, a short showreel) made through HyperFrames by a job
    r("GET", "/characters", () => characterKit.apiCharacters(root)),
    // a character's demo media through HyperFrames, also called by the Character creator after it saves a Brush character
    ...(() => { ctx.characterDemo = (id, { signal = null } = {}) => characterKit.renderDemo(id, { root, signal, finalize, snapshotAt, render: (j, o) => renderFilm(j, { ...o, root }), encodePoster }); return []; })(),
    r("POST", "/characters/([a-z0-9-]+)/demo", ([id]) => {
      const c = characterKit.getCharacter(id);
      if (!c) throw new HttpError(404, "NOT_FOUND", "No such character");
      return ctx.jobs.start("character-demo", { title: `Drawing ${c.name}'s demo`, key: id }, async (job) => characterKit.renderDemo(id, { root, signal: job.signal,
        finalize, snapshotAt, render: (j, o) => renderFilm(j, { ...o, root }), encodePoster, onProgress: ({ stage, progress }) => job.update({ stage, progress }) }));
    }),
    // Blocks: HyperFrames registry blocks and components, from the pinned registry (listed through /library)
    r("POST", "/library/blocks/import", () => ctx.jobs.start("blocks-import", { title: "Importing HyperFrames blocks" }, async (job) => {
      job.update({ stage: "reading the registry, downloading previews", progress: 0 });
      const st = await blocks.importFromRegistry({ root, signal: job.signal, onProgress: ({ done, total }) => job.update({ progress: Math.floor((done / total) * 100), stage: `item ${done} of ${total}` }) });
      return st.manifest;
    })),
    // previews for the items HF publishes none for, rendered here the way HF renders its own (one at a time; resumes where it stopped)
    r("POST", "/library/blocks/previews", () => ctx.jobs.start("blocks-previews", { title: "Rendering block previews" }, async (job) => {
      job.update({ stage: "starting", progress: 0 });
      const res = await renderMissing({ root, signal: job.signal, onProgress: ({ done, total, ok, failed }) =>
        job.update({ progress: Math.floor((done / Math.max(1, total)) * 100), stage: `${done} of ${total} (${ok} made, ${failed.length} failed)` }) });
      return { made: res.ok, failed: res.failed.length, total: res.total };
    })),
    r("GET", "/backup", () => ctx.backups.info()),
    r("POST", "/backup", () => { ctx.backups.all(); return ctx.backups.info(); }),
    r("GET", "/styles", () => listStyles(root)),
    // the gallery's and New project's light list, and one style in full when it is picked
    r("GET", "/styles/list", () => styleList(root)),
    r("GET", "/styles/([A-Za-z0-9][A-Za-z0-9-]*)", ([id]) => { const s = getStyle(id, root); if (!s) throw new HttpError(404, "NOT_FOUND", "No such style"); return s; }),
    // OPUSCAR 98's style prompts: New project's sample prompts (with the author's frame of each; not styles)
    r("GET", "/library/lemo/sample-prompts", () => lemo.samplePrompts(root)),
    r("GET", "/projects", async () => {
      let list = projects.listProjects(root);
      // design review #1: a card saved with the old step count is counted again in the 5 stages, once
      const old = list.filter((p) => !p.missing && p.progress && p.progress.unit !== "stages");
      if (old.length) {
        await Promise.all(old.map(async (p) => { try { const { state, facts } = await pipelineOf(p.id); projects.savePipelineSummary(p.id, state, root, pipe.stagesOf(state, facts)); } catch { /* counted on its next open */ } }));
        list = projects.listProjects(root);
      }
      for (const p of list) if (!p.missing) ctx.thumbs.ask(p.id);          // a stale or missing picture is made again in the background
      if (list.some((p) => p.style)) await catalogReady();
      return { projects: list.map((p) => ({ ...p, ...(p.style ? { style: knownStyle(p.style) } : {}), thumbnailUrl: ctx.thumbs.url(p, ctx.preview.base), drive: isDrivePath(p.path) })), root: projects.defaultLocation(root) };
    }),
    // the folder a new project would get (the dialog shows it): the real name when the plain one is taken, or why the name cannot be used
    r("POST", "/projects/folder", (_p, b) => {
      const max = projects.MAX_DURATION_SEC;
      try { return { ok: true, maxDurationSec: max, ...projects.projectFolder({ aspect: "16:9", ...b, title: String(b.title ?? "") }, root) }; }
      catch (e) { if (e.code === "INVALID" || e.code === "NOT_FOUND") return { ok: false, code: e.code, message: e.message, maxDurationSec: max }; throw e; }
    }),
    r("POST", "/projects", async (_p, b) => {
      // the request's own fields first: a wrong one is answered at once, not after Claude Code's sign-in check (up to 20 s when it is slow)
      const style = getStyle(b.styleId, root);
      if (!style || style.hidden) throw new HttpError(400, "INVALID", "Choose a style");      // a hidden style serves only the projects made with it
      if (!style.available) throw new HttpError(400, "INVALID", `The rules of style "${style.title}" are not available on this computer`);
      projects.checkProjectInput(b, root);
      if (b.kickoff) await ctx.claude.requireSignedIn();      // the first message (brief + the style's skill) only goes to a Claude that is ready
      // a style whose catalog turns design off (look: false) takes no Look, whatever the dialog sent
      const p = await projects.createProject({ ...b, style: selection(style), designLocked: style.look === false || styleDesign(style) === "author" }, { root });          // only General and the seven HyperFrames type styles take a design (DESIGN_OPEN)
      try { await rev.ensureRepoAsync(p.path); } catch { /* git missing: revisions unavailable, the project still works */ }
      return p;
    }),
    // Import project the folder stays where it is, the app only remembers its path. A project on Google Drive with its own
    // .git folder is offered to move that history to this PC (moveGit), never silently.
    r("POST", "/projects/open", async (_p, b) => {
      const p0 = projects.openProject(b.path, root);
      await relayout(ctx, p0.id, root);
      const p = projects.getProject(p0.id, root) ?? p0;
      return { ...p, drive: isDrivePath(p.path), gitOnDrive: isDrivePath(p.path) && gitKind(p.path).kind === "folder" };
    }),
    r("POST", `/projects/${P}/move-git`, async ([id]) => {
      const p = mustProject(id, root);
      if (ctx.agent.running.has(id)) throw new HttpError(409, "BUSY", "Wait until Claude has finished");
      return { gitdir: await rev.inRepo(p.path, () => moveGitOutAsync(p.path, root)) };          // no other git of the film while its history moves
    }),
    // where New project saves (Settings and the dialog); a Drive folder is allowed, its history is kept on this PC
    r("GET", "/storage/location", () => { const l = projects.defaultLocation(root); return { location: l, standard: projects.projectsRoot(root), drive: isDrivePath(l) }; }),
    r("PATCH", "/storage/location", (_p, b) => { const r0 = projects.setDefaultLocation(b.path, root); return { ...r0, drive: isDrivePath(r0.location) }; }),
    // the Projects folder opened in Explorer from Settings › General (no path shown in the UI); MW_NO_OPEN: tests
    r("POST", "/storage/location/open", () => {
      const l = projects.defaultLocation(root);
      if (!existsSync(l)) throw new HttpError(404, "NOT_FOUND", "The Projects folder is not on this computer any more");
      if (process.env.MW_NO_OPEN !== "1") showInExplorer(l);
      return { ok: true };
    }),
    r("POST", "/dialog/folder", async (_p, b) => { const path = await pickFolder({ title: String(b.title ?? ""), initial: String(b.initial ?? "") }); return { path, drive: path ? isDrivePath(path) : false }; }),
    r("GET", `/projects/${P}`, async ([id]) => {
      const p0 = projects.getProject(id, root);
      if (!p0) throw new HttpError(404, "NOT_FOUND", "Project not found");
      if (!p0.missing && (p0.meta?.layout ?? 0) < projects.LAYOUT_VERSION) await relayout(ctx, id, root);
      const p = { ...projects.getProject(id, root) };
      // a style the catalog does not have: the project is answered with no style (and no "follows the film style" design)
      if (p.meta?.style) { await catalogReady(); if (!knownStyle(p.meta.style)) { const { designLocked, ...m } = p.meta; p.meta = { ...m, style: null }; if (p.style) p.style = null; } }
      // what the Editor needs of the style: a film cut to a song (Lyrics, Music map)
      p.styleInfo = styleTraits(p.meta?.style?.id, root);
      // the film's whole length: New project's content and the ending's fade after it (house rules §9), what the music must cover
      p.length = filmLength(p.meta, { dir: p.path, root });
      // a film not built yet is as long as its storyboard's frames (Claude timed them to the voice: 40 → 47.5 s), placed as the
      // timeline places them; the length New project set stands only while the storyboard is the starter's placeholder
      if (p.built === false) {
        try {
          const s = await readShots(p.path);
          const frames = pipe.isStarter(s.shots) ? [] : placedShots(s.shots);
          const sec = frames.length ? Math.round(Math.max(...frames.map((x) => x.start + x.duration)) * 1000) / 1000 : 0;
          if (sec > 0) return { ...p, plannedDuration: sec, duration: sec };
        } catch { /* the storyboard cannot be read: the planned length stands */ }
      }
      return p;
    }),
    r("PATCH", `/projects/${P}`, ([id], b) => {
      const patch = {};
      if (b.title != null) patch.title = b.title;
      if (b.styleId) { const s = getStyle(b.styleId, root); if (!s) throw new HttpError(400, "INVALID", "Unknown style"); patch.style = selection(s); }
      return projects.updateProject(id, patch, root);
    }),
    r("POST", `/projects/${P}/reveal`, ([id]) => projects.revealProject(id, root)),
    r("POST", `/projects/${P}/relocate`, ([id], b) => projects.relocateProject(id, b.path, root)),
    r("DELETE", `/projects/${P}`, ([id]) => projects.removeFromList(id, root)),

    // shots and storyboard
    r("GET", `/projects/${P}/shots`, async ([id]) => {
      const p = mustProject(id, root);
      const s = await readShots(p.path);
      const sbFile = join(p.path, "STORYBOARD.md");
      const approval = p.meta?.approvals?.storyboard ?? null;
      const text = existsSync(sbFile) ? readFileSync(sbFile, "utf8") : null;
      const changed = !!approval && (approval.contentHash ? approval.contentHash !== (text == null ? null : pipe.storyboardHash(text)) : approval.hash !== (text == null ? null : sha(text)));
      // the placeholder title card a new project starts with is not a shot of the storyboard: listed apart, under `placeholder`
      const starter = pipe.isStarter(s.shots);
      // an earlier step changed after this approval (redo, canKeep): the dialog offers "Approve again" too, beside the Pipeline's Keep
      const moved = approval ? await movedSince(id, "storyboard") : null;
      return { ...s, ...(starter ? { shots: [], placeholder: s.shots } : {}), approval, changedSinceApproval: changed || !!moved, movedBy: moved, starter };
    }),
    r("POST", `/projects/${P}/storyboard/approve`, async ([id], b) => {
      // the step that records this approval for the film's way of working: Storyboard, or Rebuild your frames for keep / re-layout
      // (checking the hidden Storyboard step refused every approval with "This step does not apply to this film")
      const { state } = await pipelineOf(id);
      await mustOpen(id, state.find((x) => !x.hidden && x.done?.kind === "approval" && x.done.name === "storyboard" && !x.done.file)?.id ?? "storyboard");
      const p = mustProject(id, root);
      const sbFile = join(p.path, "STORYBOARD.md");
      // approving the Storyboard with a picked option: the option's storyboard becomes the film's, no Claude turn needed; a mix is
      // written by Claude in the chat first
      const picked = isOption(String(b?.option ?? "")) ? String(b.option) : null;          // A, B, a revision B2
      let roundNo = null;
      if (picked) {
        if (ctx.agent.running.has(id)) throw new HttpError(409, "BUSY", "Wait until Claude has finished");
        // never from pictures older than the option's board (b.anyway: the user approves them as shown, knowingly)
        const behind = b?.anyway === true ? null : stillsBehind(ctx, p, picked);
        if (behind) throw new HttpError(409, behind.code, behind.message);
        // round + option: the option as that round showed it, so B of round 3 is never round 2's B. The round's copy goes back
        // to boards/<option>/ too, where the motion step poses the frames from; without a round, the option as it is now
        let src = join(p.path, "boards", picked, "STORYBOARD.md");
        if (b?.round != null) {          // b.round: the draft the dialog showed; the user's round number is worked out from it
          const rd = listRounds(p.path).find((x) => x.id === String(b.round));
          if (!rd) throw new HttpError(404, "NOT_FOUND", "No such round");
          const from = join(p.path, "boards", "rounds", rd.id, picked);
          if (!existsSync(join(from, "STORYBOARD.md"))) throw new HttpError(404, "NOT_FOUND", `Option ${picked} is not in round ${rd.id}`);
          mkdirSync(join(p.path, "boards", picked), { recursive: true });
          for (const f of ["STORYBOARD.md", "index.html"]) if (existsSync(join(from, f))) writeFileSync(join(p.path, "boards", picked, f), readFileSync(join(from, f)));
          src = join(from, "STORYBOARD.md");
          roundNo = ownerRoundOf(p.path, rd.id, picked);
          recordPick(p.path, rd.id, { option: picked, note: "", ...(roundNo ? { round: roundNo } : {}) });
        }
        if (!existsSync(src)) throw new HttpError(404, "NOT_FOUND", `Option ${picked} has no storyboard`);
        writeFileSync(sbFile, readFileSync(src));
      }
      if (!existsSync(sbFile)) throw new HttpError(400, "INVALID", "There is no storyboard to approve");
      const at = await rev.saveAsync(p.path, "Storyboard approved");
      ctx.backupProject(id);
      const option = picked ?? listRounds(p.path).filter((x) => x.picked?.option).at(-1)?.picked.option ?? null;          // the option the user picked ("B", "mix")
      setTimeout(() => ctx.autopilot.storyboardApproved(id, option && option !== "mix" ? option : null), 0);          // on to the motion
      return projects.updateMeta(id, (m) => {
        (m.approvals ??= {}).storyboard = { at: new Date().toISOString(), by: "owner", revision: at, hash: sha(readFileSync(sbFile)), contentHash: pipe.storyboardHash(readFileSync(sbFile, "utf8")),
          ...(option ? { option } : {}), ...(roundNo ? { round: roundNo } : {}) };
        (m.stages ??= {}).storyboard = { status: "done" };
        if ((m.stages.brief?.status ?? "not_started") !== "done") m.stages.brief = { status: "done" };
        (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "approval", text: `Storyboard approved (revision ${String(at).slice(0, 7)})` });
      }, root);
    }),
    r("GET", `/projects/${P}/motion-plan`, async ([id]) => {
      const p = mustProject(id, root);
      const mp = plan.read(p.path);
      const approval = p.meta?.approvals?.motionPlan ?? null;
      const moved = approval ? await movedSince(id, "motionSpec") : null;          // as the storyboard's
      return { ...mp, approval, changedSinceApproval: (!!approval && approval.hash !== mp.hash) || !!moved, movedBy: moved, types: plan.TYPES,
        noCamera: mp.error ? [] : plan.missingCamera(mp.plan) };          // the shots with no camera row, flagged
    }),
    r("PUT", `/projects/${P}/motion-plan/shots/(\\d+)`, async ([id, n], b) => {
      const p = mustProject(id, root);
      const out = plan.setShot(p.path, Number(n), b.motions, typeof b.says === "string" ? b.says : undefined);          // the shot's plain words, kept unless sent
      try { await rev.saveAsync(p.path, `Motion plan: shot ${n}`); } catch { /* revisions optional */ }
      ctx.backupProject(id);
      return out;
    }),
    r("POST", `/projects/${P}/motion-plan/approve`, async ([id]) => {
      await mustOpen(id, "motionSpec");
      const p = mustProject(id, root);
      const mp = plan.read(p.path);
      if (!mp.exists || mp.error || !mp.plan.shots.length) throw new HttpError(400, "INVALID", mp.error ?? "There is no motion plan to approve");
      const at = await rev.saveAsync(p.path, "Motion plan approved");
      ctx.backupProject(id);
      const out = projects.updateMeta(id, (m) => {
        (m.approvals ??= {}).motionPlan = { at: new Date().toISOString(), by: "owner", revision: at, hash: mp.hash };
        (m.stages ??= {}).motionPlan = { status: "done" };
        (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "approval", text: `Motion plan approved (revision ${String(at).slice(0, 7)})` });
      }, root);
      // the Motion Library items the plan cites are copied into the project for the build (like `hyperframes add`)
      const refs = [...new Set(mp.plan.shots.flatMap((s) => s.motions).filter((x) => x.source?.kind === "library" && x.source.id).map((x) => x.source.id))];
      const staged = [], missing = [], retired = [];
      for (const ref of refs) { if (library.isRetired(ref)) { retired.push(ref); continue; } try { const r0 = library.stageItem(p.path, ref, root); if (r0) staged.push(r0); else missing.push(ref); } catch { missing.push(ref); } }
      // one short line in the chat: how many, no paths (Claude finds them in .moworks/library/, its rules say so); an item of the
      // removed Moworks kit is said as "no longer in the library" (an older plan; the film keeps what it copied), not as a missing one
      if (staged.length || missing.length || retired.length) projects.addNote(p.path, { kind: "library", text: retired.length ? "Motion plan approved: {n} library item(s) ready for the build, {g} no longer in the library"
        : missing.length ? "Motion plan approved: {n} library item(s) ready for the build, {k} not found" : "Motion plan approved: {n} library item(s) ready for the build",
        vars: { n: staged.length, k: missing.length, g: retired.length } });
      const estimate = ctx.autopilot.motionApproved(id);          // the time the build will take, the line in the chat, the build
      return { ...out, staged: staged.map((x) => x.uid), missing, retired, estimate };
    }),
    r("GET", `/projects/${P}/posters`, ([id]) => ctx.posters.get(id)),
    r("POST", `/projects/${P}/posters`, ([id]) => ctx.posters.start(id)),
    r("GET", `/projects/${P}/preview`, ([id]) => { mustProject(id, root); return { url: `${ctx.preview.base}/p/${id}/__preview`, origin: ctx.preview.origin }; }),
    r("GET", `/projects/${P}/revisions`, async ([id]) => { const p = mustProject(id, root); return { revisions: existsSync(join(p.path, ".git")) ? await rev.logAsync(p.path, 100) : [] }; }),

    // ---- the pipeline in the Editor state from the server, the Editor only shows it
    r("GET", `/projects/${P}/pipeline`, async ([id]) => {
      const { p, state, facts } = await pipelineOf(id);
      try { projects.savePipelineSummary(id, state, root, pipe.stagesOf(state, facts)); } catch { /* the card's count is best effort */ }
      // the autopilot goes on where it was the first time the film is opened after the app started (its steps' needs met by a
      // change made before the restart, e.g. a new rule): nothing started Build until the user wrote in the chat. Only what the user
      // set going (resumeOnOpen); not when the last task was cut by Exit or a step was stopped.
      if (!resumedOnOpen.has(id)) {
        resumedOnOpen.add(id);
        if (!ctx.agent.running.has(id) && pipe.nextAuto(state)) setTimeout(() => ctx.autopilot.resumeOnOpen(id).catch(() => {}), 0);
      }
      const first = pipe.firstClaudeStep(state);
      const stages = pipe.stagesOf(state, facts);
      // the Storyboard and the Motion Plan say their time left while Claude works on them, as the Build does
      const runId = ctx.agent.running.get(id), tasks = runId ? ctx.agent.list(id) : [];
      const stepEta = runningEstimate(tasks.find((x) => x.id === runId), tasks, p.meta?.style?.id);
      const etaStage = stepEta && stages.find((x) => x.id === stepEta.stage && x.status === "running" && x.line);
      if (etaStage) etaStage.line = `${etaStage.line} · ${etaWords(stepEta)}`;
      const building = stages.find((x) => x.id === "build");
      const asking = state.find((x) => x.asking);
      // a step's reason also comes filled in (`text`) for whatever reads it raw; the Editor still fills `key` with `vars` itself
      const reasonOf = (r) => (r?.key ? { ...r, text: pipe.fill(r.key, r.vars ?? {}) } : r);
      return { steps: state.map(({ done, ...s }) => ({ ...s, reason: reasonOf(s.reason), doneKind: done?.kind ?? null, auto: !!done?.auto })), vars: pipe.promptVars(p.meta),
        kickoff: p.meta?.kickoff ?? null, firstStep: first?.id ?? null, claudeBusy: ctx.agent.running.has(id),
        // each line also filled in (`lineText`)
        stages: stages.map((x) => (x.line ? { ...x, lineText: pipe.fill(x.line, x.lineVars ?? {}) } : x)),
        autopilot: { on: p.meta?.pipeline?.autopilot !== false, running: facts.runningStep, next: pipe.nextAuto(state)?.id ?? null,
          stopped: (() => { const s = state.find((x) => x.stopped); return s ? { step: s.id, at: s.stopped.at } : null; })() },
        stepEstimate: etaStage ? stepEta : null,
        // what the Storyboard waits for before it draws (the Editor opens the Voice or Lyrics dialog by itself on make / check / failed / lyrics)
        voiceWait: state.find((x) => x.id === "storyboard" && x.voiceWait)?.voiceWait ?? null,
        // with the build's start, for "about N min left"
        // worked out again from the steps left once the Build is done, the Review by its rounds (T23-11), and past the plan
        estimate: building && building.status !== "done" && p.meta?.pipeline?.build?.estimate
          ? { ...estimateNow(p.meta.pipeline.build.estimate, state, { startedAt: p.meta.pipeline.build.startedAt,
            review: (() => { const t = tasks.find((x) => x.id === runId); return (t?.step ?? t?.continues) === "qcReview" ? reviewRounds(t) : null; })() }),
          startedAt: p.meta.pipeline.build.startedAt ?? null } : null,
        // the app's own work between two steps (the music and sound effects after Claude's music task, ~3 min that looked idle)
        // the last task was stopped by Exit and nothing ran since: the Editor offers to run it again (POST …/tasks/<id>/again)
        interrupted: ctx.agent.interrupted(id),
        appBusy: (() => { const j = ctx.jobs.list({ kind: "mix" }).find((x) => x.projectId === id && x.status === "running"); if (j) return { stage: "build", key: "Placing the music and sound effects", jobId: j.id };
          // the sound effects placed again (the Final Mix's Place, or after a chat turn changed the storyboard's cues)
          const fx = ctx.jobs.list({ kind: "mix-sfx" }).find((x) => x.projectId === id && x.status === "running"); if (fx) return { stage: "finalMix", key: "Placing the sound effects", jobId: fx.id };
          // the app reads the user's files (audio, decks, PSD) before Prepare
          const sc = ctx.jobs.list({ kind: "scan" }).find((x) => x.projectId === id && x.status === "running"); if (sc) return { stage: "prepare", key: "Reading your files", jobId: sc.id };
          // the voice being made or transcribed is the app at work too; when it ends the Editor loads the timeline again (NARRATION)
          const tts = ctx.jobs.list({ kind: "tts" }).find((x) => x.projectId === id && x.status === "running"); if (tts) return { stage: "prepare", key: "Making the voice-over", jobId: tts.id };
          const tr = ctx.jobs.list({ kind: "transcribe" }).find((x) => x.projectId === id && x.status === "running"); return tr ? { stage: "prepare", key: "Transcribing the voice-over", jobId: tr.id } : null; })(),
        // the film is done (stage 4 ran to the end) and the self-check's score card
        finished: isFinished(p.meta) ? (p.meta.pipeline.finished ?? p.meta.pipeline.delivered) : null, qc: pipe.reviewCard(p.path),
        // the background checks for the Editor's one card: what would stop the render, and whether Claude is fixing it now
        // (the autopilot's one fix per build: autoFix set and Claude at work) or already tried (autoFix set, Claude idle, still failing)
        checks: { pass: facts.qa?.pass ?? null, blocking: facts.qa?.blocking ?? 0, at: facts.qa?.at ?? null, running: !!facts.qaRunning,
          warnings: pipe.qaWarnings(p.meta?.lastQa, p.path),          // the Pipeline's "Tech checks · N warnings"
          notChecked: pipe.qaNotChecked(p.meta?.lastQa, p.path),          // checks that could not run: no pass and no warning (T21-5)
          fixing: !!p.meta?.pipeline?.autoFix && ctx.agent.running.has(id), tried: !!p.meta?.pipeline?.autoFix && !ctx.agent.running.has(id) },
        // what the Motion dialog's confirm says before the approval: the same estimate for the plan's shots as it is now
        estimateIfApproved: facts.motionShots ? estimateMinutes(facts.motionShots, root, { seconds: p.meta?.targetDurationSec, styleId: p.meta?.style?.id }) : null,
        question: p.meta?.pipeline?.briefChanged ? { kind: "brief-changed", at: p.meta.pipeline.briefChanged.at }
          : asking ? { kind: p.meta?.style?.id === "general" && existsSync(join(p.path, "ASSETS.md")) && !pipe.chosenWay(p.path) ? "way" : "missing" }
          // Claude's question in the chat is open (a font to choose, a revision's notes): the user answers there
          : facts.chatAsked || facts.revisionAsked ? { kind: "chat" } : null,
        // the sound effects as last placed: the Editor reads the Final Mix and the timeline again when `at` changes (the dialog showed
        // 26 after only 6 were left: it read them once, 4 s after Place, while the placement still searched)
        sfx: (() => { const s = readSfxState(p.path); return { placed: (s.mounted ?? []).length, at: s.placedAt ?? null }; })(),
        render: ctx.renders.status() };
    }),
    // a step's own work: its Claude task (the text the Editor sends, else the step's prompt, the way's own one for General) or its job (the checks)
    r("POST", `/projects/${P}/pipeline/([a-zA-Z]+)/run`, async ([id, stepId], b) => {
      const { p, state } = await pipelineOf(id);
      const s = state.find((x) => x.id === stepId);
      if (!s) throw new HttpError(404, "NOT_FOUND", "This style has no such step");
      // the Editor's kickoff starts the film's first task only; once any task ran (the autopilot started Prepare when the film opened),
      // a kickoff starts nothing
      if (b.kickoff && (!p.meta?.kickoff?.pending || ctx.agent.list(id).length)) return { alreadyStarted: true, step: stepId };
      const why = pipe.blockedReason(state, stepId);
      if (why) throw Object.assign(new HttpError(409, "STEP_BLOCKED", pipe.fill(why.key, why.vars ?? {})), { detail: { step: stepId, reason: why } });
      if (s.action?.kind !== "claude" && s.action?.kind !== "job" && !String(b.text ?? "").trim()) throw new HttpError(400, "INVALID", "This step opens in the Editor");
      // the Character dialog's "Go on to the storyboard" ran the Storyboard step again, though option B was picked and approved:
      // a step already done is not redone without the user's own words; the pipeline goes on from there instead
      if (s.status === "done" && !String(b.text ?? "").trim()) {
        setTimeout(() => ctx.autopilot.advance(id).catch(() => {}), 0);
        return { alreadyDone: true, step: stepId, next: pipe.nextAuto(state)?.id ?? null };
      }
      // the Final Mix asks Claude for music on mixkit.co: with the web off for this project Claude could only say it cannot
      if (stepId === "finalMix" && effectiveSettings(p.meta ?? {}, root).web === "off")
        throw new HttpError(409, "WEB_OFF", "The web is off for this project, so Claude cannot look for music on Mixkit. Turn the web on for this project, then ask again.");
      const out = await ctx.autopilot.startStep(id, s, { text: String(b.text ?? "").trim() || null, kickoff: !!b.kickoff });
      // never an empty answer the Editor reads as started (T25-2: 200 null, and the Final Mix said "Claude is looking on Mixkit")
      if (!out) throw new HttpError(409, "NOT_STARTED", `Nothing could start for “${s.title ?? stepId}”. Try again, or ask Claude in the chat.`);
      return out;
    }),
    // carry on a step the user stopped (the chat's "continue" does the same)
    r("POST", `/projects/${P}/pipeline/resume`, async ([id], b) => (await ctx.autopilot.resume(id, String(b.text ?? ""))) ?? { idle: true }),
    // named versions: made when the film is first built, after each round of changes, at each render, before a redo
    r("GET", `/projects/${P}/versions`, ([id]) => ({ versions: [...(mustProject(id, root).meta?.versions ?? [])].reverse() })),
    r("POST", `/projects/${P}/versions/([\\w.-]+)/restore`, ([id, vid]) => { mustProject(id, root); return ctx.autopilot.openVersion(id, decodeURIComponent(vid)); }),
    // the brief changed after the film was built: the user's choice
    r("POST", `/projects/${P}/brief/after-change`, async ([id], b) => { mustProject(id, root); return ctx.autopilot.briefChanged(id, String(b.choice ?? "")); }),
    // the Storyboard dialog's "Make another": one more option, one row at a time, every earlier one kept (one option by default, another only when asked).
    // `text`: what the user wants different, if they said
    r("POST", `/projects/${P}/boards/more`, async ([id], b = {}) => {
      const { state } = await pipelineOf(id);
      const s = state.find((x) => x.id === "storyboard");
      if (!s || s.status === "blocked") throw new HttpError(409, "STEP_BLOCKED", "Finish the preparation first");
      const all = listRounds(mustProject(id, root).path);
      const next = ownerRounds(all, all.at(-1)).length + 1;          // the user's round this option becomes
      const want = String(b.text ?? "").trim().slice(0, 1000);
      // the next letter, a clearly different option (a revision of one is its Feedback, not this)
      const letter = nextLetter(mustProject(id, root).path);
      if (!letter) throw new HttpError(409, "FULL", "Eight options already: approve one or give feedback on one");
      return { option: letter, task: await ctx.agent.start(id, { scope: { kind: "project" }, step: "storyboard", ...(want ? { shown: want } : {}),
        text: `Make one more storyboard option, Option ${letter} (boards/${letter}/), the same way as the first one and as your rules say, clearly different from every earlier option${want ? `; the owner asks: ${want}` : ""}; keep every earlier option as it is. Set its heading to "# Option ${letter} · \"<its name>\"": a short name for its idea, in the language of the chat (#455). Take its stills with board_stills, fix what does not hold, then stop: the owner approves one in the Storyboard dialog.` }) };
    }),
    r("POST", `/projects/${P}/pipeline/([a-zA-Z]+)/(skip|unskip|confirm|undo|keep)`, async ([id, stepId, act]) => {
      const { state } = await pipelineOf(id);
      const s = state.find((x) => x.id === stepId);
      if (!s) throw new HttpError(404, "NOT_FOUND", "This style has no such step");
      if ((act === "skip" || act === "unskip") && !s.skippable) throw new HttpError(400, "INVALID", "This step cannot be skipped");
      if ((act === "confirm" || act === "undo") && s.done?.kind !== "mark") throw new HttpError(400, "INVALID", "This step is done by its own result, not by a confirmation");
      if (act === "confirm") { const why = pipe.blockedReason(state, stepId); if (why) throw new HttpError(409, "STEP_BLOCKED", pipe.fill(why.key, why.vars ?? {})); }
      if (act === "keep" && !s.canKeep) throw new HttpError(400, "INVALID", "Only a done step that an earlier change asks to redo can be kept as it is");
      const now = new Date().toISOString();
      mark(id, (pl) => {
        if (act === "skip") pl.skips[stepId] = { at: now }; else if (act === "unskip") delete pl.skips[stepId];
        else if (act === "confirm") pl.marks[stepId] = { at: now, by: "owner" }; else if (act === "keep") (pl.keeps ??= {})[stepId] = { at: now };
        else { delete pl.marks[stepId]; delete pl.ran[stepId]; }
      });
      return (await pipelineOf(id)).state.find((x) => x.id === stepId);
    }),
    // the brief, its direction and the imported files (the Brief & assets dialog)
    r("GET", `/projects/${P}/inputs`, ([id]) => { const p = mustProject(id, root); return { brief: p.meta?.brief ?? null, inputMode: p.meta?.inputMode ?? null, look: p.meta?.look ?? null,
      way: p.meta?.way ?? null, flags: p.meta?.flags ?? {}, inventory: projects.inventory(p.path) }; }),
    // the Assets analysis Claude's ASSETS.md, the way it proposes, the way the user chose
    r("GET", `/projects/${P}/analysis`, ([id]) => { const p = mustProject(id, root); const f = join(p.path, "ASSETS.md");
      return { text: existsSync(f) ? readFileSync(f, "utf8") : "", proposed: pipe.proposedWay(p.path), way: p.meta?.way ?? null, ways: pipe.WAYS,
        general: p.meta?.style?.id === "general", inventory: projects.inventory(p.path) }; }),
    r("PATCH", `/projects/${P}/way`, ([id], b) => {
      if (!pipe.WAYS.includes(b.way)) throw new HttpError(400, "INVALID", "Choose free, keep or reference");
      const out = projects.updateMeta(id, (m) => { const was = m.way?.id; m.way = { id: b.way, at: new Date().toISOString(), by: "owner" };
        (m.activity ??= []).unshift({ at: m.way.at, kind: "way", text: was && was !== b.way ? `Way of working: ${was} → ${b.way}` : `Way of working: ${b.way}` }); }, root);
      return { way: out.meta.way };
    }),
    // approve a document a step wrote (the style guide, the shot list): the file as it is now
    r("POST", `/projects/${P}/approve/(styleGuide|shots|characters)`, async ([id, name]) => { const p = mustProject(id, root); const f = join(p.path, APPROVE_DOCS[name]);
      if (!existsSync(f)) throw new HttpError(400, "INVALID", `${APPROVE_DOCS[name]} is not written yet`);
      // the cast is approved only once every member passes its checks (the approval was asked while the turtle failed); every cast
      // has a gate now, Brush's too
      if (name === "characters" && ctx.characterGate && hasCast(p.path)) {
        const g = await Promise.resolve(ctx.characterGate(id)).catch(() => null);
        if (g && !g.pass) {
          const bad = (g.characters ?? []).filter((c) => (Number(c.failed) || 0) > 0 || c.passed === false).map((c) => c.name ?? c.id).join(", ");
          throw new HttpError(409, "NOT_READY", `${bad || "A character"} still fails its checks: Claude fixes it first, then you approve`);
        }
      }
      const out = projects.updateMeta(id, (m) => { (m.approvals ??= {})[name] = { at: new Date().toISOString(), hash: sha(readFileSync(f)) }; }, root);
      setTimeout(() => ctx.autopilot.advance(id), 0);          // on to the next step, as after the storyboard
      return { approval: out.meta.approvals[name] }; }),
    r("PATCH", `/projects/${P}/brief`, ([id], b) => projects.updateMeta(id, (m) => {
      const old = m.brief ?? {};
      m.brief = { ...old, ...(typeof b.text === "string" ? { text: b.text.slice(0, projects.BRIEF_MAX), words: projects.countWords(b.text) } : {}),
        ...(b.mode === "script" || b.mode === "idea" ? { mode: b.mode } : {}), ...(typeof b.direction === "string" ? { direction: b.direction.slice(0, 4000) } : {}),
        ...(b.answers && typeof b.answers === "object" ? { answers: projects.cleanAnswers(b.answers, m.style?.id) } : {}) };
      if (m.brief.text !== old.text || m.brief.mode !== old.mode || m.brief.direction !== old.direction || JSON.stringify(m.brief.answers ?? {}) !== JSON.stringify(old.answers ?? {})) {
        m.brief.editedAt = new Date().toISOString();   // the steps after it ask for a redo
        if (m.pipeline?.delivered) m.pipeline.briefChanged = { at: m.brief.editedAt };          // built already: the user chooses what follows
      }
      if (typeof b.characters === "boolean") m.flags = { ...(m.flags ?? {}), characters: b.characters };
      const len = projects.lengthSeconds(b.durationSec, m.format?.fps ?? 30);          // seconds or a timecode, kept to whole frames
      if (len >= 5) m.targetDurationSec = Math.min(3600, len);
    }, root).meta.brief),
    // Story, Script, Brief…: the text files at the project root a step writes (shown and edited in the Editor)
    r("GET", `/projects/${P}/doc`, ([id], _b, q) => {
      const p = mustProject(id, root);
      const names = (q.get("path") ?? "").split(",");          // "frame.md,design.md": the first that exists
      if (!names.every((n) => DOCS.includes(n))) throw new HttpError(400, "INVALID", "Not a document of this project");
      const name = names.find((n) => existsSync(join(p.path, ...n.split("/")))) ?? names[0];
      const f = join(p.path, ...name.split("/"));
      return { path: name, exists: existsSync(f), text: existsSync(f) ? readFileSync(f, "utf8") : "", at: existsSync(f) ? statSync(f).mtime.toISOString() : null };
    }),
    r("PUT", `/projects/${P}/doc`, async ([id], b) => {
      const p = mustProject(id, root); const name = String(b.path ?? "");
      if (!DOCS.includes(name)) throw new HttpError(400, "INVALID", "Not a document of this project");
      if (ctx.agent.running.has(id)) throw new HttpError(409, "BUSY", "Wait until Claude has finished");
      const f = join(p.path, ...name.split("/"));
      mkdirSync(join(f, ".."), { recursive: true });
      writeFileSync(f + ".tmp", String(b.text ?? "").normalize("NFC")); renameSync(f + ".tmp", f);
      try { await rev.saveAsync(p.path, `${name} edited by hand`); } catch { /* revisions optional */ }
      if (name === "BRIEF.md" && p.meta?.pipeline?.delivered) projects.updateMeta(id, (m) => { m.pipeline.briefChanged = { at: new Date().toISOString() }; }, root);
      return { path: name, exists: true, at: statSync(f).mtime.toISOString() };
    }),

    // Claude tasks (and the app's short lines in the chat: files added, render finished…)
    r("GET", `/projects/${P}/tasks`, ([id]) => { const p = mustProject(id, root); const tasks = ctx.agent.list(id);
      return { tasks, notes: projects.readNotes(p.path).slice(-100), running: ctx.agent.running.get(id) ?? null, usage: usageTotals(tasks),
        settings: effectiveSettings(p.meta ?? {}, root), own: p.meta?.settings ?? {} }; }),
    // the user's answer to a question Claude is waiting on: allow (this once), project (the web for this project), deny
    r("POST", `/projects/${P}/tasks/${T}/permission`, ([id, tid], b) => { const t = ctx.agent.answer(id, tid, String(b.id ?? ""), String(b.decision ?? "")); return { ok: true, task: t.id }; }),
    // this project's own model / effort / mode / web ("global" = as in Settings)
    r("PATCH", `/projects/${P}/settings`, ([id], b) => { const p = mustProject(id, root);
      const next = projectSettingsPatch(p.meta ?? {}, b, root);
      const out = projects.updateMeta(id, (m) => { m.settings = next; }, root);
      return { own: out.meta.settings ?? {}, settings: effectiveSettings(out.meta, root) }; }),
    r("POST", `/projects/${P}/tasks`, async ([id], b) => {
      // the user's answer after Prepare asked about a Google Slides link it could not read ("done, it is shared now"): read them again first
      { const p0 = projects.getProject(id, root); if (Object.values(p0?.meta?.links ?? {}).some((v) => !v?.ok)) { try { await ctx.slidesFromBrief?.(p0); } catch { /* Claude is told what still fails */ } } }
      // notes pinned on the film come in the message: a still of each note's frame, its shot and place for Claude, drawn on the card
      // the user's message answers Claude's question: its "Answer Claude" card closes (it stood after the answer)
      const answered = (t) => { try { projects.closeChatWaits(mustProject(id, root).path); } catch { /* the card is best effort */ } return t; };
      { const n = await chatNotes(ctx, mustProject(id, root), b); if (n) return answered(await ctx.agent.start(id, { text: n.text, scope: b.scope, shown: n.shown, media: n.media })); }
      // "continue" after the user stopped a pipeline step carries that step on
      if (RESUME.test(String(b.text ?? "")) && !ctx.agent.running.has(id)) {
        const { state } = await pipelineOf(id);
        if (state.some((x) => x.stopped)) { const r0 = await ctx.autopilot.resume(id, String(b.text).replace(RESUME, "").trim()); if (r0?.task) return answered(r0.task); }
      }
      // the user's answer to Claude's question about a revision's notes goes on with that revision
      const rv = !ctx.agent.running.has(id) ? pendingRevision(mustProject(id, root).path) : null;
      // the answer to a step's question goes on with that step (the Storyboard drew 18 min with an empty row): it says so
      const prev = ctx.agent.list(id).filter((t) => t.status !== "running").at(-1), was = prev?.step ?? prev?.continues;
      const continues = was && prev.status === "done" && pipe.asksOwner(prev.resultText) ? was : null;
      return answered(await ctx.agent.start(id, { text: b.text, scope: b.scope, ...(rv ? { label: "Storyboard · revision" } : {}), ...(continues ? { continues } : {}) }));
    }),
    // the status button's one word (state: idle | working | downloading | updating) with what it is about (job title)
    r("GET", "/tasks/running", () => appState({ tasks: [...ctx.agent.running.entries()].map(([projectId, taskId]) => {
      const t = ctx.agent.get(taskId); return { projectId, taskId, kind: "claude", stage: t?.stage ?? null, title: projects.getProject(projectId, root)?.title ?? "" }; }),
      jobs: ctx.jobs.running().map((j) => ({ id: j.id, kind: j.kind, projectId: j.projectId, title: j.title, stage: j.stage, progress: j.progress,
        project: j.projectId ? projects.getProject(j.projectId, root)?.title ?? "" : null })) })),
    r("GET", `/tasks/${T}`, ([tid]) => { const t = ctx.agent.get(tid); if (!t) throw new HttpError(404, "NOT_FOUND", "Task not found"); return t; }),
    r("POST", `/tasks/${T}/cancel`, ([tid]) => ctx.agent.cancel(tid)),
    // a task Exit stopped, run again as it was ("Resume / Send again")
    r("POST", `/projects/${P}/tasks/${T}/again`, async ([id, tid]) => { mustProject(id, root); return { task: await ctx.agent.again(id, tid) }; }),
    r("POST", `/projects/${P}/tasks/${T}/revert`, ([id, tid]) => ctx.agent.revert(id, tid)),
  ];
}

export async function startServer({ port = 0, root = APP_ROOT, token = randomBytes(24).toString("hex"), uiDir = join(root, "ui", "dist"),
  autoBackup = process.env.MW_NO_BACKUP !== "1", autoLibrary = process.env.MW_NO_LIBRARY_IMPORT !== "1", autoAssets = process.env.MW_NO_ASSET_INSTALL !== "1",
  onExit = null, onRestart = null, onWindowGone = null, windowGraceMs = Number(process.env.MW_WINDOW_GRACE_MS ?? 10000), thumbnails = false,
  updateCheck = false } = {}) {          // updateCheck: the app checks for its own new version by itself (the launcher; never in tests)
  const ctx = { root, preview: null, onExit, onRestart, lastSeen: Date.now() };
  const agentToken = randomBytes(24).toString("hex");          // Claude Code's (AGENT_API only)
  const server = createServer(async (req, res) => {
    const addr = server.address();
    const own = [`127.0.0.1:${addr.port}`, `localhost:${addr.port}`];
    const send = (status, obj, headers = {}) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers });
      res.end(JSON.stringify(obj));
    };
    const host = (req.headers.host ?? "").toLowerCase();
    if (!own.includes(host)) return send(403, { error: { code: "FORBIDDEN", message: "Not this server's address" } });
    const url = new URL(req.url, `http://${host}`);
    if (url.pathname.startsWith("/api/")) {
      const origin = (req.headers.origin ?? "").toLowerCase();
      if (req.method !== "GET" && origin && !own.map((h) => `http://${h}`).includes(origin)) return send(403, { error: { code: "FORBIDDEN", message: "Request from another site" } });
      const t = req.headers["x-mw-token"];
      if (t !== token && !(t === agentToken && AGENT_API.test(url.pathname))) return send(401, { error: { code: "UNAUTHORIZED", message: "Missing or wrong session token" } });
      ctx.lastSeen = Date.now();                             // an app window is open (the background service stops when none calls for a while)
      for (const [method, re, fn] of ctx.raw) {           // streaming routes: the request body or the response is a file
        const m = re.exec(url.pathname);
        if (!m || method !== req.method) continue;
        try { const out = await fn(m.slice(1), req, url.searchParams, res); if (out !== null) return send(200, out); return; }
        catch (e) { if (res.headersSent) return res.destroy(); const [st, o] = fail(e); req.resume(); return send(st, o, { Connection: "close" }); }
      }
      for (const [method, re, fn] of ctx.table) {
        const m = re.exec(url.pathname);
        if (!m || method !== req.method) continue;
        try { return send(200, await fn(m.slice(1), req.method === "GET" ? {} : await body(req), url.searchParams)); }
        catch (e) { const [s, o] = fail(e); return send(s, o); }
      }
      return send(404, { error: { code: "NOT_FOUND", message: "No such API" } });
    }
    // static UI: files under ui/dist, everything else -> index.html (single-page app)
    if (req.method !== "GET" && req.method !== "HEAD") return send(405, { error: { code: "METHOD", message: "Method not allowed" } });
    if (url.pathname.startsWith("/media/blocks/") || url.pathname.startsWith("/media/looks/") || url.pathname.startsWith("/media/intake/")) {   // Blocks, Looks and intake previews (the app's own stores)
      const prefix = ["/media/blocks/", "/media/looks/", "/media/intake/"].find((x) => url.pathname.startsWith(x));
      const store = prefix === "/media/looks/" ? looks : prefix === "/media/intake/" ? intake : blocks;
      const f = store.mediaFile(decodeURIComponent(url.pathname.slice(prefix.length)), root);
      if (!f) return send(404, { error: { code: "NOT_FOUND", message: "No such file" } });
      res.writeHead(200, { "Content-Type": MIME[extname(f).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Length": statSync(f).size });
      return res.end(req.method === "HEAD" ? undefined : readFileSync(f));
    }
    if (url.pathname.startsWith("/media/vocab/")) {          // Vocabulary: the author's Canvas sample of an item as a page (<id>.html) or a script (<id>.js), from the app's own store
      const m = vocab.media(decodeURIComponent(url.pathname.slice("/media/vocab/".length)), root);
      if (!m) return send(404, { error: { code: "NOT_FOUND", message: "No such file" } });
      res.writeHead(200, { "Content-Type": m.type, "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Length": Buffer.byteLength(m.body) });
      return res.end(req.method === "HEAD" ? undefined : m.body);
    }
    if (url.pathname.startsWith("/media/lemo/")) {           // Lemo-Opuscar's poster and styleframe of each style, from the pinned clone (CC BY 4.0)
      const f = lemo.mediaFile(decodeURIComponent(url.pathname.slice("/media/lemo/".length)), root);
      if (!f) return send(404, { error: { code: "NOT_FOUND", message: "No such file" } });
      // the pinned clone's JPEG, or the 960 px WebP of the copy bundled with the app
      res.writeHead(200, { "Content-Type": MIME[extname(f).toLowerCase()] ?? "image/jpeg", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Length": statSync(f).size });
      return res.end(req.method === "HEAD" ? undefined : readFileSync(f));
    }
    if (url.pathname.startsWith("/media/mg/")) {             // mg-styles-15's film card of each style, from the pinned clone (MIT)
      const f = mgStyles.mediaFile(decodeURIComponent(url.pathname.slice("/media/mg/".length)), root);
      if (!f) return send(404, { error: { code: "NOT_FOUND", message: "No such file" } });
      res.writeHead(200, { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Length": statSync(f).size });
      return res.end(req.method === "HEAD" ? undefined : readFileSync(f));
    }
    if (url.pathname.startsWith("/media/thumb/")) {          // a style's gallery tile: a 640 px WebP of its still, made once
      const [, source, ...parts] = decodeURIComponent(url.pathname.slice("/media/thumb".length)).split("/"), rel = parts.join("/");
      const original = source === "lemo" ? lemo.mediaFile(rel, root) : source === "mg" ? mgStyles.mediaFile(rel, root)
        : source === "ui" && /^styles\/[\w.-]+\.(jpe?g|png|webp)$/.test(rel) && existsSync(join(uiDir, ...rel.split("/"))) ? join(uiDir, ...rel.split("/")) : null;
      if (!original) return send(404, { error: { code: "NOT_FOUND", message: "No such file" } });
      let f;
      try { f = await thumbFile(source, rel, original, root); } catch { f = original; }          // a failed encode serves the still itself
      res.writeHead(200, { "Content-Type": MIME[extname(f).toLowerCase()] ?? "image/webp", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff", "Content-Length": statSync(f).size });
      return res.end(req.method === "HEAD" ? undefined : readFileSync(f));
    }
    if (url.pathname.startsWith("/media/characters/")) {     // a character's demo media (sheets as WebP, the showreel as MP4)
      const f = characterKit.mediaFile(decodeURIComponent(url.pathname.slice("/media/characters/".length)), root);
      if (!f) return send(404, { error: { code: "NOT_FOUND", message: "No such file" } });
      res.writeHead(200, { "Content-Type": MIME[extname(f).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff", "Content-Length": statSync(f).size });
      return res.end(req.method === "HEAD" ? undefined : readFileSync(f));
    }
    if (url.pathname.startsWith("/media/character-styles/")) {          // the Character creator's style tiles: Mira walking in each hand (anidoodle, Apache-2.0)
      const f = characterMaker.thumbFile(decodeURIComponent(url.pathname.slice("/media/character-styles/".length)));
      if (!f) return send(404, { error: { code: "NOT_FOUND", message: "No such file" } });
      res.writeHead(200, { "Content-Type": "image/webp", "Cache-Control": "max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Length": statSync(f).size });
      return res.end(req.method === "HEAD" ? undefined : readFileSync(f));
    }
    if (url.pathname.startsWith("/media/what-if/")) {        // What If's demo film and its poster, made by the app in the style
      const f = whatIfStyles.mediaFile(decodeURIComponent(url.pathname.slice("/media/what-if/".length)), root);
      if (!f) return send(404, { error: { code: "NOT_FOUND", message: "No such file" } });
      res.writeHead(200, { "Content-Type": MIME[extname(f).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Length": statSync(f).size });
      return res.end(req.method === "HEAD" ? undefined : readFileSync(f));
    }
    if (url.pathname.startsWith("/media/anidoodle/")) {      // anidoodle's medium card: its tile cut once from the author's style sheet (Apache-2.0)
      const f = anidoodle.mediaFile(decodeURIComponent(url.pathname.slice("/media/anidoodle/".length)), root);
      if (!f) return send(404, { error: { code: "NOT_FOUND", message: "No such file" } });
      res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff", "Content-Length": statSync(f).size });
      return res.end(req.method === "HEAD" ? undefined : readFileSync(f));
    }
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^[\\/]+/, "");
    let file = resolve(uiDir, rel || "index.html");
    if (!file.startsWith(resolve(uiDir) + sep) && file !== resolve(uiDir)) return send(403, { error: { code: "FORBIDDEN", message: "Outside the UI folder" } });
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(uiDir, "index.html");
    if (!existsSync(file)) return send(503, { error: { code: "UI_NOT_BUILT", message: "UI not built: run npm run build" } });
    // the preview origin is any loopback port: a page loaded before the server started again (a fixed port: dev, tests) still
    // reaches the new preview server's port (its storyboard frames went black, T21-1); the page talks only to the app (connect-src)
    const pv = "http://127.0.0.1:*";
    res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream", "Cache-Control": file.endsWith("index.html") ? "no-store" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": `default-src 'self'; img-src 'self' data: blob: ${pv}; media-src 'self' blob: ${pv} https://cdn.freesound.org ${VOICE_SAMPLES}; frame-src ${pv}; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'` });
    res.end(req.method === "HEAD" ? undefined : readFileSync(file));
  });
  await new Promise((ok) => server.listen(port, "127.0.0.1", ok));
  const p = server.address().port;
  const uiOrigin = `http://127.0.0.1:${p}`;
  ctx.preview = await startPreviewServer({ uiOrigin, resolveProject: (id) => {
    const x = projects.getProject(id, root);
    return x && !x.missing ? { dir: x.path, width: x.width ?? x.meta?.format?.width, height: x.height ?? x.meta?.format?.height } : null;
  } });
  ctx.stopping = new AbortController();          // aborted when the app stops: every still being taken ends with it
  ctx.posters = posterJobs(root, () => ctx.preview.base, ctx.stopping.signal);
  ctx.thumbs = thumbnailJobs(root, thumbnails, ctx.stopping.signal);
  ctx.backups = backupJobs(root, autoBackup);
  ctx.backupProject = () => {};          // backups are the app only; a project folder is copied to move a film
  ctx.claude = claudeService(root);
  ctx.renders = createRenderQueue();          // one render at a time in the app
  ctx.scanAssets = (dir) => scanAssets(dir, { root });
  /** Stop a project's running smooth preview (preview-proxy job), if any. */
  ctx.cancelPreview = (id) => { for (const j of ctx.jobs.list({ kind: "preview-proxy", projectId: id })) if (j.status === "running") { try { ctx.jobs.cancel(j.id); } catch { /* ended meanwhile */ } } };
  ctx.agent = new Agent({ root, getProject: (id) => projects.getProject(id, root), readShots: (d) => readShots(d),
    updateMeta: (id, fn) => projects.updateMeta(id, fn, root),
    // then a voice-over that landed during the task is checked (voiceCheckDue: only when nothing else started meanwhile)
    onFinished: (id, task) => { ctx.backupProject(id); ctx.thumbs.ask(id); setTimeout(() => ctx.autopilot.taskEnded(id, task).catch(() => {}).then(() => ctx.autopilot.voiceCheckDue(id)).catch(() => {}), 0); },
    // a project being rendered is not changed
    // a new change by Claude stops the code film's smooth preview (it would show the film half-changed), and a
    // preview never holds Claude back: only a real render does
    guard: (id) => { ctx.cancelPreview(id); if (ctx.renders.isRendering(id)) throw Object.assign(new Error("Wait until the render finishes"), { code: "RENDERING" }); },
    signIn: () => ctx.claude.requireSignedIn(), onSignedOut: () => ctx.claude.signedOutSeen(),
    pipeline: async (id) => pipe.promptBlock((await ctx.pipelineOf(id)).state),
    stepOf: (meta, stepId, all = false) => (all ? pipelineSteps(meta?.style?.id, root) : pipelineSteps(meta?.style?.id, root).find((x) => x.id === stepId) ?? null),
    permitUrl: `http://127.0.0.1:${p}/api/agent/permit`, permitToken: agentToken });
  // a setup or download job that ends changes what Settings › System finds: its checks run again on the next read
  ctx.jobs = createJobs({ ended: (job) => { if (DOWNLOADS.has(job.kind) || job.kind === "app-update") { ctx.checks?.system.clear(); ctx.checks?.firstRun.clear(); } } });
  // the app's own check for a new version: a minute after start, then every six hours; never while it updates itself or renders
  ctx.updates = createUpdateChecker({ root, log: (line) => console.log(line), busy: () => updateCheckWaits(ctx.jobs, ctx.renders) });
  if (updateCheck) ctx.updates.start();
  // the bundled fonts, GSAP and three.js (24 MB, pinned upstream files): downloaded at the first start, or from Settings > Health
  ctx.installAssets = () => ctx.jobs.start("offline-assets", { title: "Downloading fonts, GSAP and three.js" }, async (job) => {
    const r = await offlineAssets.install({ root, signal: job.signal, onProgress: ({ done, total }) => job.update({ progress: Math.floor((done / total) * 100), stage: `${done} of ${total} files` }) });
    if (r.failed.length) throw Object.assign(new Error(`${r.failed.length} files could not be downloaded`), { code: "DOWNLOAD_FAILED", detail: r.failed.slice(0, 5) });
    return { downloaded: r.downloaded, ready: r.ready };
  });
  if (autoAssets && !offlineAssets.status(root).ready) try { ctx.installAssets(); } catch { /* already running */ }
  // Settings › System's slow checks, answered from their last result while they run again
  ctx.checks = { system: cachedCheck("system", () => runtimeStatusAsync(root), { root }), firstRun: cachedCheck("first-run", () => firstRun.firstRunItemsAsync(root), { root }) };
  if (thumbnails) setTimeout(() => ctx.checks.system.get().catch(() => {}), 5000).unref?.();          // the app (not tests): System ready before it is opened
  ctx.table = routes(ctx);
  const prod = productionRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([0-9a-f]+)", mustProject, HttpError });
  ctx.table.push(...prod.routes);
  const boards = boardRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([0-9a-f]+)", mustProject, HttpError });
  ctx.table.push(...boards.routes);
  ctx.table.push(...editorRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([0-9a-f]+)", mustProject, HttpError }).routes);
  const assets = assetRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([0-9a-f]+)", mustProject, HttpError });
  ctx.table.push(...assets.routes);
  const chars = characterRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([0-9a-f]+)", mustProject, HttpError });
  ctx.table.push(...chars.routes);
  ctx.table.push(...proxyRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn], P: "([0-9a-f]+)", mustProject }).routes);          // a code film's smooth preview
  ctx.table.push(...styleAeRoutes(ctx).routes);          // the styles' After Effects badges (measured in the background, no route)
  ctx.table.push(...prefsRoutes(ctx, { r: (m, path, fn) => [m, new RegExp(`^/api${path}$`), fn] }).routes);          // the UI's settings on this computer (the port changes each start)
  ctx.agent.appTools = { ...boards.tools, ...assets.tools, ...chars.tools,
    // the user chose the brief's output over the New project fields (Claude asked in Prepare): the project's output changes
    // the film's language, the user's answer when the brief did not say it
    film_language: ({ project, args }) => {
      const p = projects.setLanguage(project.id, args.language, "claude", root);
      return `The film's language is now ${p.meta.language.id === "en" ? "English" : "Vietnamese"}: the voice-over, its transcript and every word on screen.`;
    },
    project_format: ({ project, args }) => {
      const p = projects.setOutputFormat(project.id, { aspect: args.aspect, fps: args.fps, durationSec: args.durationSec, by: "claude" }, root);
      const f = p.meta.format ?? {};
      return p.changed.length ? `The film's output is now ${f.aspect} (${f.width}x${f.height}), ${f.fps} fps, ${p.meta.targetDurationSec} s (changed: ${p.changed.join(", ")}).` : "Nothing changed: the output already is that.";
    } };          // board_stills, qc_sheets: Claude calls them through the MCP channel
  // the app window holds this stream open (the window's X is Exit). When the last window has gone for windowGraceMs (so a
  // reload or F5 does not stop anything), onWindowGone stops every task, job and the service. A stream, not a heartbeat: a hidden
  // or minimized window's timers are throttled by the browser, its open connection is not.
  ctx.presence = { open: 0, timer: null };
  const presence = ["GET", /^\/api\/app\/presence$/, async (_p, req, _q, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    res.write("open\n");
    ctx.presence.open++; clearTimeout(ctx.presence.timer); ctx.presence.timer = null;
    const keep = setInterval(() => res.write(".\n"), 20000);
    req.on("close", () => {
      clearInterval(keep);
      ctx.presence.open = Math.max(0, ctx.presence.open - 1);
      if (!ctx.presence.open && onWindowGone) ctx.presence.timer = setTimeout(() => { if (!ctx.presence.open) onWindowGone(); }, windowGraceMs);
    });
    return null;
  }];
  // a guideline file for one of the user's Looks: the body is the file (X-File-Name), as for project assets
  const lookFile = ["POST", /^\/api\/looks\/(custom\/[a-z0-9-]+)\/files$/, async ([id], req) => {
    const dest = customLooks.fileTarget(id, decodeURIComponent(req.headers["x-file-name"] ?? ""), root);
    if (Number(req.headers["content-length"] ?? 0) > customLooks.MAX_FILE) throw new HttpError(413, "TOO_LARGE", "The file is over 500 MB");
    let n = 0;
    const limit = async function* (src) { for await (const c of src) { n += c.length; if (n > customLooks.MAX_FILE) throw new HttpError(413, "TOO_LARGE", "The file is over 500 MB"); yield c; } };
    try { await streamPipeline(req, limit, createWriteStream(dest + ".part")); } catch (e) { rmSync(dest + ".part", { force: true }); throw e; }
    renameSync(dest + ".part", dest);
    return customLooks.publicLook(customLooks.fileAdded(id, dest, root));
  }];
  ctx.raw = [presence, lookFile, ...prod.raw, ...boards.raw];
  ctx.startQa = prod.startQa;
  ctx.slidesFromBrief = prod.slidesFromBrief;          // the brief's Google Slides links, read before Prepare
  ctx.placeMusic = prod.placeMusic;
  ctx.useVoice = prod.useVoice;
  ctx.autopilot = createAutopilot(ctx);          // the pipeline runs itself between the user's gates
  if (autoBackup) setTimeout(() => ctx.backups.all(), 5000).unref();
  if (autoLibrary) { try { firstRun.libraryFromBundle(root); } catch (e) { console.error(`[library] from the bundle: ${e.message}`); } }          // a new computer's library
  // the style catalog is built once in the background, so the Style Gallery's first load reads it from memory
  // and its tiles' thumbnails after it, one at a time (with the other background imports: not in tests)
  // built in a worker (1.6 s on the server's thread held the app window's first page: a white window)
  ctx.catalogReady = warmCatalog(root).catch(() => {});          // the project reads wait for it to tell a style the catalog has
  ctx.catalogReady.then(() => {
    if (!autoLibrary || ctx.stopping.signal.aborted) return;
    try { styleList(root); } catch { return; /* the gallery's own call reports it */ }
    for (const s of styleList(root).styles) {
      const th = s.preview?.thumb, m = th && /^\/media\/thumb\/(lemo|mg|ui)\/(.+)$/.exec(th);
      if (!m) continue;
      const original = m[1] === "lemo" ? lemo.mediaFile(m[2], root) : m[1] === "mg" ? mgStyles.mediaFile(m[2], root) : join(uiDir, ...m[2].split("/"));
      if (original && existsSync(original)) thumbFile(m[1], m[2], original, root).catch(() => {});
    }
    tidyPreviews(root);          // the stores' old posters: this start serves the WebP that replaced them
    // the styles' After Effects badges: a new style or a pinned source at another commit is measured on its demo
    setTimeout(() => { if (!ctx.stopping.signal.aborted) ctx.styleAe?.measure(); }, 60000).unref?.();
  });
  // Exit hung about 4.5 min while the app window held connections; every part stops within a few seconds, open connections
  // are cut (the app's own and the preview's), and a part that does not answer in time is left to the process's end
  const within = (p, ms) => Promise.race([Promise.resolve(p).catch(() => {}), new Promise((r) => setTimeout(r, ms).unref?.())]);
  const close = async () => {
    ctx.claude.stop();
    ctx.updates.stop();
    // the preview and the server stop side by side (one after the other, Exit took 17-27 s)
    await Promise.all([within(ctx.preview.close(), 3000),
      within(new Promise((r) => { server.close(() => r()); server.closeAllConnections?.(); }), 3000),
      within(rev.settled(), 5000)]);          // a film's commit asked for before is let finish (git runs beside the server's thread: T22-5)
  };
  /** What Exit (or closing the window) stops, per project: Claude tasks, background jobs (render, transcription with its Whisper model,
   *  checks, Export to AE, downloads). */
  ctx.running = () => {
    const name = (id) => (id ? projects.getProject(id, root)?.title ?? id : null);
    return [
      ...[...ctx.agent.running.keys()].map((projectId) => ({ kind: "claude", project: name(projectId), title: `Claude is working on "${name(projectId)}"`, label: "Claude task" })),
      // the app's own background work (the film's pre-render, checks it runs after a change) is stopped too, but is no task the
      // user started: Exit's "Stop N task(s)" leaves it out (idle)
      ...ctx.jobs.running().map((j) => ({ kind: j.kind, project: name(j.projectId), title: j.projectId ? `${j.title} (${name(j.projectId)})` : j.title, label: j.title,
        ...(j.kind === "preview-proxy" || j.background ? { idle: true } : {}) })),
    ];
  };
  /** Stop running Claude tasks and jobs, then the servers (Exit, or idle in the background). */
  ctx.shutdown = async () => {
    ctx.stopping.abort();
    for (const taskId of ctx.agent.running.values()) { try { ctx.agent.cancel(taskId, { reason: "exit" }); } catch { /* already ending */ } }
    for (const j of ctx.jobs.running()) { try { ctx.jobs.cancel(j.id); } catch { /* already ending */ } }
    await new Promise((r) => setTimeout(r, 800));
    server.closeAllConnections?.();
    await close();
  };
  return { server, port: p, token, url: `${uiOrigin}/?t=${token}`, preview: ctx.preview, agent: ctx.agent, jobs: ctx.jobs, close, shutdown: ctx.shutdown,
    lastSeen: () => ctx.lastSeen, busy: () => ctx.running().length > 0 };
}

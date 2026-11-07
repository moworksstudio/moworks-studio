// Agent gateway. Claude is the production brain; this module decides what it may do.
// One task at a time per project, an auditable record of every task in .moworks/tasks.json, and a project revision before and after
// each task (packages/revisions), so every change can be reviewed and undone.
//
// Claude runs as the user's own Claude Code (personal use, the user's sign-in; no API key is passed) in print mode with
// --restricted: file tools confined to the project folder, no commands, no user / project / local settings, skills, plugins or CLAUDE.md
// (checked on Claude Code 2.1.299: --restricted alone loads none of them; --safe-mode is not used because it also drops the app's own
// MCP server). The web (WebFetch, WebSearch) is per project: off, ask (the user answers the first time, in the chat), on.
// Modes as in Claude Code: auto (default), manual, acceptEdits, plan; bypassPermissions only when the user turns the experiment on in
// Settings, and then Claude runs unrestricted (Claude Code refuses bypass under --restricted). Permission questions reach the user through
// the app's MCP tool (packages/agent/permit-mcp.mjs → the server's /api/agent/permit). Each pipeline step has its own Claude session;
// a chat message continues the session of the step it follows. The style's rules are copied into .moworks/rules/ and named in the system
// prompt. After Claude: the app's own finalize (Moworks rules: fonts, CSP, runtime, LCD layers) and the deterministic gates, then a revision.
import { writeJson } from "../util/json.mjs";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { claudeEnv, findClaude } from "../system-status/index.mjs";
import { OAUTH_RACE, claudeJson, claudeRunEnv, killTree } from "../system-status/claude-run.mjs";
import * as rev from "../revisions/index.mjs";
import { finalize, fontMap } from "../hf-edit/finalize.mjs";
import { fitMusicToFilm } from "../hf-edit/tracks.mjs";
import { viLine, viOptionsText, viSuggest, viVerified } from "../hf-edit/googleFontsVi.mjs";
import { stageForProject as stageVocab } from "../vocab-library/index.mjs";
import { stageForProject as stageBlock, ensureHosted, registryItems } from "../blocks-library/index.mjs";
import { stageForProject as stageLook } from "../looks-library/index.mjs";
import { stageForProject as stageIntake } from "../intake-library/index.mjs";
import { MAP_STYLE_ID, placeEngine as placeMapEngine } from "../map-explainer/index.mjs";
import { isMoworksStyle, placeStyle } from "../moworks-styles/index.mjs";
import { SIGNED_OUT_TEXT } from "../server/claude.mjs";
/** Claude Code's own message when another of its processes is refreshing the sign-in at the same moment: passing, worth one retry. */
export { OAUTH_RACE };          // system-status/claude-run.mjs
const RETRY_MS = Number(process.env.MW_CLAUDE_RETRY_MS ?? 5000);
import { addNote, classifyAsset, readNotes, keepRootFps, sequenceOf } from "../project-service/index.mjs";
import { cutNote, cutOf, followCut, outputCap, readTranscriptCuts, resumeText } from "./output-limit.mjs";
import { migrateLayout } from "../project-service/layout.mjs";
import { moveDocs } from "../project-service/docs.mjs";
import { rulePath, stageRoot } from "../project-service/shared-stage.mjs";
import { missingLine, missingReads, requiredReads } from "./reads.mjs";
import { briefAt, followApprovals, keepApprovedStoryboard, smallBriefEdit, storyboardHash } from "../pipeline/index.mjs";
import { read as readMotionPlan } from "../motion-plan/index.mjs";
import { keepAlive } from "./keepalive.mjs";
import { checkArgv, promptFile } from "./argv.mjs";

/** The deterministic gates (packages/hf-qa) in a child process, so the server keeps answering while HF's check runs. `signal` ends the
 *  whole tree (the gates and the HyperFrames processes they started): the promise then rejects with code DROPPED. */
export function gatesAsync(dir, { signal = null, script = join(import.meta.dirname, "..", "hf-qa", "gates-cli.mjs") } = {}) {
  return new Promise((ok, no) => {
    const c = spawn(process.execPath, [script, dir], { windowsHide: true });
    const kill = () => killTree(c);
    if (signal?.aborted) kill(); else signal?.addEventListener("abort", kill, { once: true });
    let out = "", err = "";
    c.stdout.on("data", (d) => { out += d; }); c.stderr.on("data", (d) => { err = (err + d).slice(-2000); });
    c.on("close", (code) => {
      signal?.removeEventListener("abort", kill);
      if (signal?.aborted) return no(Object.assign(new Error("checks dropped: the film is being changed again"), { code: "DROPPED" }));
      try { ok(JSON.parse(out)); } catch { no(new Error(`checks failed (exit ${code}) ${err.split(/\r?\n/).slice(-2).join(" ")}`)); }
    });
  });
}

/** Whether a task of `step` gets the film's checks after it: a chat task or a step from the Build on, never a step before it. */
export function checksAfter(stepIds, step) {
  const at = stepIds.indexOf(step), build = stepIds.indexOf("build");
  return !step || at < 0 || build < 0 || at >= build;
}

const TOOLS = "Read,Edit,Write,Glob,Grep";
const WEB_TOOLS = "WebFetch,WebSearch";
/** The music step's site: taking music from Mixkit is part of the approved pipeline, so a project whose web is
 *  "Ask first" does not ask for it: a fetch on mixkit.co (its pages, assets.mixkit.co's tracks) or a search kept to mixkit.co. */
const MUSIC_HOST = /(^|\.)mixkit\.co$/i;
export function musicSiteRequest(tool, input = {}) {
  const host = (u) => { try { return new URL(String(u)).hostname; } catch { return ""; } };
  if (tool === "WebFetch") return MUSIC_HOST.test(host(input.url));
  if (tool === "WebSearch") {
    const only = Array.isArray(input.allowed_domains) && input.allowed_domains.length > 0 && input.allowed_domains.every((d) => MUSIC_HOST.test(String(d).replace(/^\*\./, "")));
    return only || /\bsite:(\w+\.)?mixkit\.co\b/i.test(String(input.query ?? ""));
  }
  return false;
}
// the owner's Claude settings and the effort a step runs at: agent/settings.mjs (kept importable from here)
import { MODELS, EFFORTS, MODES, WEB, agentSettings, saveAgentSettings, projectSettingsPatch, effectiveSettings, MIN_EFFORT, stepEffort } from "./settings.mjs";
export { MODELS, EFFORTS, MODES, WEB, agentSettings, saveAgentSettings, projectSettingsPatch, effectiveSettings, MIN_EFFORT, stepEffort };

const invalid = (m) => Object.assign(new Error(m), { code: "INVALID" });

const stateDir = (root) => process.env.MW_STATE_DIR ?? join(root, "runtime", "state");

/** The Claude Code arguments for a task (exported for the tests): tools, mode, web, the app's MCP permission tool when there is one, and
 *  the shared stage (`stage`: runtime/stage, the style's rules and engines the film's .moworks/ links to) as a working directory Claude
 *  reads and never edits. systemPromptFile: the system prompt's file (argv.mjs promptFile); the text itself never goes on the command
 *  line (T27-14). */
export function claudeArgs({ settings, systemPromptFile, sessionArgs, mcpConfig = null, appTools = [], guard = null, webGuard = null, stage = null }) {
  const bypass = settings.mode === "bypassPermissions";
  const web = settings.web !== "off";
  const args = ["-p", "--output-format", "stream-json", "--verbose", "--strict-mcp-config", "--disable-slash-commands"];
  if (bypass) args.push("--setting-sources", "", "--permission-mode", "bypassPermissions");          // the user's experiment: unrestricted
  else {
    args.push("--restricted", "--tools", web ? `${TOOLS},${WEB_TOOLS}` : TOOLS, "--permission-mode", settings.mode);
    if (mcpConfig) args.push("--permission-prompts", "host", "--permission-prompt-tool", "mcp__mw__permit");
    if (mcpConfig && appTools.length) args.push("--allowedTools", appTools.map((n) => `mcp__mw__${n}`).join(","));          // the app's tools never ask
    else args.push("--permission-prompts", "none");
  }
  // --settings: the web asked first ("ask"), and the read guard as a PreToolUse hook before every write or edit
  const extra = {};
  if (!bypass && web && settings.web === "ask") extra.permissions = { ask: WEB_TOOLS.split(",") };
  // the stage itself, and the film's links to it (Claude Code resolves a link to its stage path, the film's path is denied as well)
  if (stage) {
    if (!bypass) args.push("--add-dir", stage);
    extra.permissions = { ...(extra.permissions ?? {}), deny: [`Edit(${rulePath(stage)}/**)`, "Edit(.moworks/rules/**)", "Edit(.moworks/library/**)"] };
  }
  if (guard) extra.hooks = { PreToolUse: [{ matcher: "Write|Edit|MultiEdit|NotebookEdit", hooks: [{ type: "command", command: guard, timeout: 30 }] }] };
  // a product's features are searched only after the owner's yes (web-guard.mjs)
  if (webGuard && web && !bypass) (extra.hooks ??= { PreToolUse: [] }).PreToolUse.push({ matcher: "WebSearch", hooks: [{ type: "command", command: webGuard, timeout: 30 }] });
  if (Object.keys(extra).length) args.push("--settings", JSON.stringify(extra));
  if (mcpConfig) args.push("--mcp-config", mcpConfig);
  // read from a file: passed as text, a film past its Final Mix (33K of rules and steps) went over Windows' 32,767-character command
  // line and every chat message failed with "spawn ENAMETOOLONG" (T27-14)
  args.push("--append-system-prompt-file", systemPromptFile, ...sessionArgs);
  const model = MODELS.find(([k]) => k === settings.model)?.[2];
  if (model) args.push("--model", model);
  if (settings.effort) args.push("--effort", settings.effort);
  return args;
}

/** What Claude reads back from font_check. */
export function fontCheckText(r) {
  const fams = r?.families ?? [];
  if (!fams.length) return "Name the font families to check.";
  // a family of the pinned Vietnamese list shows its author, licence and size; one that fails gets the nearest of the list
  return [...fams.map((f) => {
    const fails = !f.available || f.vi === false, v = viVerified(f.family);
    const credit = !fails && f.vi && viLine(f.family) ? `${viLine(f.family)}${Object.keys(fontMap()).some((k) => k.toLowerCase() === f.family.toLowerCase()) ? "; comes with the app" : v ? `; all ${v.checked} marked letters checked` : "; Google lists its Vietnamese: the app checks every letter when the film first downloads it"}` : "";
    const near = fails ? viSuggest(f.family).map((x) => x.line) : [];
    return `${f.family}: ${!f.available ? "the app cannot get it (not bundled, not on Google Fonts, no file in assets/)" : f.vi === false ? `no Vietnamese letters${f.missing ? ` (the app checked it: ${[...f.missing].length} marked letters are missing, e.g. ${[...f.missing].slice(0, 6).join(" ")})` : ""}` : f.vi === null ? "the app can get it; its Vietnamese letters are not known: check them on a still" : "OK, draws Vietnamese"}${credit ? ` (${credit})` : ""}${near.length ? `. Nearest that draw Vietnamese: ${near.join("; ")}` : ""}`;
  }),
  `Vietnamese fonts the app bundles: ${Object.keys(fontMap()).join(", ")}; or a Google Fonts family with Vietnamese.`, viOptionsText()].join("\n");
}

/** The usage Claude Code reports at the end of a run: tokens by kind, the API-equivalent cost (its list price), time, turns. */
export function usageOf(result) {
  const u = result?.usage ?? {};
  return { input: u.input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, output: u.output_tokens ?? 0,
    costUsd: typeof result?.total_cost_usd === "number" ? result.total_cost_usd : null, turns: result?.num_turns ?? null, durationMs: result?.duration_ms ?? null,
    models: Object.keys(result?.modelUsage ?? {}) };
}
/** API list prices, $ per million tokens (input, 5-minute cache write, cache read, output): the cost of a run that ended with no result of
 *  Claude Code's own (a Storyboard task stopped after 6 min used to be recorded at $0). Longest prefix first. */
const PRICES = [["claude-fable-5", [10, 12.5, 0.25, 50]], ["claude-mythos-5", [10, 12.5, 0.25, 50]], ["claude-opus-5-5", [4, 5, 0.2, 20]],
  ["claude-opus-5", [5, 6.25, 0.5, 25]], ["claude-opus-4", [5, 6.25, 0.5, 25]], ["claude-sonnet-5", [2, 2.5, 0.2, 10]], ["claude-sonnet-4", [3, 3.75, 0.3, 15]],
  ["claude-haiku-5", [0.1, 0.125, 0.01, 0.5]], ["claude-haiku-4", [1, 1.25, 0.1, 5]]];
/** What a run used so far, from the usage on each of Claude's messages (kept per message: its stream repeats a message once per block). */
export function liveUsage(perMessage, { durationMs = null } = {}) {
  const t = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0, costUsd: 0, turns: 0, durationMs, models: [], estimated: true };
  for (const { model, u } of Object.values(perMessage ?? {})) {
    const k = { input: u.input_tokens ?? 0, cacheWrite: u.cache_creation_input_tokens ?? 0, cacheRead: u.cache_read_input_tokens ?? 0, output: u.output_tokens ?? 0 };
    for (const f of ["input", "cacheWrite", "cacheRead", "output"]) t[f] += k[f];
    t.turns++;
    if (model && !t.models.includes(model)) t.models.push(model);
    const price = PRICES.find(([id]) => String(model ?? "").startsWith(id))?.[1] ?? PRICES.find(([id]) => id === "claude-opus-5-5")[1];
    t.costUsd += (k.input * price[0] + k.cacheWrite * price[1] + k.cacheRead * price[2] + k.output * price[3]) / 1e6;
  }
  t.costUsd = Math.round(t.costUsd * 1e6) / 1e6;
  return t;
}
/** A project's totals over its tasks (each task's usage, summed). */
export function usageTotals(tasks) {
  const t = { tasks: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0, costUsd: 0, durationMs: 0, turns: 0 };
  // every task counts, a stopped one with no usage recorded too; the sums are what was recorded
  t.tasks = tasks.length;
  for (const x of tasks) if (x.usage) { for (const k of ["input", "cacheWrite", "cacheRead", "output", "costUsd", "durationMs", "turns"]) t[k] += x.usage[k] ?? 0; }
  t.costUsd = Math.round(t.costUsd * 10000) / 10000;
  return t;
}

/** A chat message does not resume a conversation larger than this (tokens it re-reads each turn): the chat starts small. */
export const CHAT_FRESH_AT = 120000;
/** Which Claude session a task continues: a pipeline step has its own; a chat message continues the session of the last step. */
export function sessionKey(conv, step) {
  if (step) return step;
  return conv.current ?? "chat";
}
/** The session a task runs in: { key, fresh }. A chat message whose conversation grew past CHAT_FRESH_AT starts the chat's own new one. */
export function taskSession(conv, step) {
  const key = sessionKey(conv, step);
  return !step && (conv.sessions?.[key]?.context ?? 0) > CHAT_FRESH_AT ? { key: "chat", fresh: true } : { key, fresh: false };
}
/** .moworks/claude.json, the older single-session form read as the chat's session. */
export function readConversation(dir) {
  const c = readJson(join(dir, ".moworks", "claude.json"), {});
  if (c.sessions) return c;
  return c.sessionId ? { sessions: { chat: { sessionId: c.sessionId, model: c.model ?? null, at: c.at ?? null } }, current: "chat" } : { sessions: {}, current: null };
}

// the style's rules and sources Claude reads: packages/agent/rules.mjs (kept importable from here)
import { prepareRules, stageFor, whatIfRuleText } from "./rules.mjs";
import { readJson } from "../util/json.mjs";
import { APP_TOOLS } from "./tools.mjs";
import { brandKitFonts, pickedCastLine, systemPrompt, taskLanguage, taskRequest, toolReminder } from "./prompt.mjs";
export { APP_TOOLS } from "./tools.mjs";          // the app's tools and what Claude is told: their own files (audit/112 2.9)
export * from "./prompt.mjs";
export { prepareRules, stageFor, whatIfRuleText };

// a secret the owner typed in the chat (a PDF's password) leaves the app's records of the film; a short one is no secret worth blanking every "2026" for
const SECRET_MIN = 6, SECRET_MASK = "••••";
const maskIn = (json, secret) => json.split(JSON.stringify(secret).slice(1, -1)).join(SECRET_MASK);
const masked = (value, secret) => JSON.parse(maskIn(JSON.stringify(value), secret));
/** The film's saved chat and task list without the secret, in place. Claude Code's own session log on this computer is not the app's to change. */
export function scrubRecords(dir, secret) {
  const s = String(secret ?? "");
  if (s.length < SECRET_MIN) return;
  for (const name of ["tasks.json", "notes.json"]) {
    const f = join(dir, ".moworks", name);
    try { const was = readFileSync(f, "utf8"), now = maskIn(was, s); if (now !== was) writeFileSync(f, now); } catch { /* none yet */ }
  }
}
function maskTask(task, secret) {
  for (const k of ["text", "shown", "resultText"]) if (typeof task[k] === "string") task[k] = task[k].split(secret).join(SECRET_MASK);
  task.events = masked(task.events, secret);
}

/** What Claude is doing now, for the Editor's progress (one line once stood 10-16 min and looked like a hang): a kind the UI words
 *  plainly (read · write · edit · search · web · app with its tool · run), and since when. Never a file name. */
export function doingOf(name, at = new Date().toISOString()) {
  const n = String(name ?? "");
  if (n.startsWith("mcp__mw__")) return { kind: "app", tool: n.slice(9), at };
  const kind = { Read: "read", Write: "write", Edit: "edit", MultiEdit: "edit", NotebookEdit: "edit", Grep: "search", Glob: "search", WebFetch: "web", WebSearch: "web", Bash: "run" }[n] ?? "work";
  return { kind, at };
}
const describeTool = (name, input = {}) => {
  const target = input.file_path ?? input.path ?? input.pattern ?? input.url ?? input.query ?? "";
  const short = String(target).replace(/\\/g, "/").replace(/^.*?\/(compositions|assets|index\.html|STORYBOARD\.md|\.moworks)/, "$1");
  const verb = { Read: "Reading", Edit: "Editing", MultiEdit: "Editing", Write: "Writing", Glob: "Looking for", Grep: "Searching", WebFetch: "Reading the web:", WebSearch: "Searching the web:" }[name] ?? name;
  return { tool: name, label: `${verb} ${short}`.trim(), path: short };
};

export class Agent {
  /** signIn(): resolves when Claude Code is signed in, else throws CLAUDE_SIGNED_OUT; onSignedOut(): a task met Claude's sign-in error.
   *  pipeline(projectId): the pipeline as Claude reads it (text); stepOf(meta, stepId): that step's definition from config/styles.json. */
  /** permitUrl / permitToken: where the app's MCP permission tool sends Claude Code's questions (the server's /api/agent/permit); without them
   *  nothing can be asked, so the web is only given to "on" projects and Manual falls back to Accept edits. */
  constructor({ root = APP_ROOT, getProject, readShots, updateMeta, onFinished, signIn = null, onSignedOut = null, pipeline = null, stepOf = null,
    permitUrl = null, permitToken = null, appTools = {}, guard = null } = {}) {
    // guard(projectId): throws when no task may start now (the project is being rendered)
    Object.assign(this, { root, getProject, readShots, updateMeta, onFinished, signIn, onSignedOut, pipeline, stepOf, permitUrl, permitToken, appTools, guard });
    this.tasks = new Map();      // id -> task (live)
    this.procs = new Map();      // id -> child process
    this.running = new Map();    // projectId -> task id
    this.starting = new Set();    // projects whose message is being sent (the sign-in check before the task exists)
    this.permits = new Map();    // question id -> { taskId, resolve, timer }
    this.lateChecks = new Map(); // task id -> project folder: its checks, run once the task has ended
    this.lateRuns = new Map();   // projectId -> AbortController of the late checks running now
  }

  /** One of the app's tools, called by Claude through permit-mcp.mjs: { text }. The task must be running; the handler gets the project. */
  async callTool(taskId, name, args = {}) {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "running") return { text: "This task is not running.", error: true };
    const h = this.appTools[name];
    if (!h || !APP_TOOLS[name]) return { text: `The app has no tool "${name}".`, error: true };
    const p = this.getProject(task.projectId);
    this.event(task, { kind: "status", text: `App: ${name}…` });
    try {
      const text = await h({ task, project: p, args, root: this.root });
      this.event(task, { kind: "tool", tool: `app:${name}`, path: "" });
      // the owner's language after the tool's English (T27-8: the Build's notes turned English after the first pose check)
      const remind = task.lang ? toolReminder(task.lang) : "";
      return { text: remind && typeof text === "string" ? `${text}\n\n${remind}` : text };
    } catch (e) { return { text: `The app could not do it: ${e.message}`, error: true }; }
  }

  /** A permission question from Claude Code (through permit-mcp.mjs): shown on the task until the user answers (or 30 min pass: no). */
  permit(taskId, { tool_name, input = {} }) {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "running") return Promise.resolve({ behavior: "deny", message: "This task is not running." });
    const p = this.getProject(task.projectId);
    const s = effectiveSettings(p?.meta ?? {}, this.root);
    const web = /^Web(Fetch|Search)$/.test(tool_name);
    if (web && s.web === "on") return Promise.resolve({ behavior: "allow" });
    if (web && s.web === "off") return Promise.resolve({ behavior: "deny", message: "The web is off for this project." });
    if (web && musicSiteRequest(tool_name, input)) return Promise.resolve({ behavior: "allow" });          // Mixkit, the music step's site
    const id = randomBytes(4).toString("hex");
    const what = web ? String(input.url ?? input.query ?? "") : String(input.file_path ?? input.path ?? input.pattern ?? "");
    const info = { id, tool: tool_name, what: what.slice(0, 300), web, at: new Date().toISOString() };
    if (!task.permission) task.permission = info;          // Claude may ask several at once (parallel web searches): one shows, the rest queue
    task.stage = "waiting"; this.event(task, { kind: "status", text: `Waiting for the owner: ${tool_name} ${what}`.slice(0, 200) });
    const promise = new Promise((resolve) => {
      const timer = setTimeout(() => { try { this.answer(task.projectId, taskId, id, "deny", "No answer within 30 minutes."); } catch { /* answered meanwhile */ } }, 30 * 60 * 1000);
      timer.unref?.();
      this.permits.set(id, { taskId, resolve, timer, promise: null, info });
    });
    this.permits.get(id).promise = promise;
    return this.waitAnswer(id);
  }
  /** Wait up to `ms` for the user's answer; still open: { pending: id } (the MCP tool asks again, so no HTTP request outlives fetch's limits). */
  waitAnswer(id, ms = 50000) {
    const q = this.permits.get(id);
    if (!q) return Promise.resolve({ behavior: "deny", message: "The question is closed." });
    let h; const later = new Promise((ok) => { h = setTimeout(() => ok({ pending: id }), ms); h.unref?.(); });
    return Promise.race([q.promise, later]).finally(() => clearTimeout(h));
  }
  /** The user's answer: allow (this once), project (the web for this project from now on), deny. */
  answer(projectId, taskId, id, decision, message = null) {
    const q = this.permits.get(id);
    const task = this.tasks.get(taskId);
    if (!q || q.answered || q.taskId !== taskId || !task || task.projectId !== projectId) throw Object.assign(new Error("There is no such question"), { code: "NOT_FOUND" });
    if (!["allow", "project", "deny"].includes(decision)) throw invalid("Answer allow, project or deny");
    clearTimeout(q.timer); setTimeout(() => this.permits.delete(id), 120000).unref?.();      // kept a while for a late "ask again"
    q.answered = true;
    const tool = q.info?.tool ?? task.permission?.tool ?? "";
    this.event(task, { kind: "status", text: decision === "deny" ? `The owner said no: ${tool}` : `The owner allowed ${tool}${decision === "project" ? " for this project" : ""}` });
    q.resolve(decision === "deny" ? { behavior: "deny", message: message ?? "The owner said no." } : { behavior: "allow" });
    const waiting = () => [...this.permits.entries()].filter(([, x]) => x.taskId === taskId && !x.answered);
    if (decision === "project" && q.info?.web) {          // the web for this project from now on: the other web questions waiting now are yes too
      this.updateMeta?.(projectId, (m) => { m.settings = { ...(m.settings ?? {}), web: "on" }; });
      for (const [qid, x] of waiting()) if (x.info?.web) { clearTimeout(x.timer); x.answered = true; x.resolve({ behavior: "allow" }); setTimeout(() => this.permits.delete(qid), 120000).unref?.(); }
    }
    const next = waiting()[0];
    task.permission = next ? next[1].info : null;
    if (!next && task.status === "running") task.stage = "working";
    return task;
  }

  tasksFile(dir) { return join(dir, ".moworks", "tasks.json"); }
  list(projectId) {
    const p = this.getProject(projectId);
    if (!p || p.missing) return [];
    const saved = readJson(this.tasksFile(p.path), { tasks: [] }).tasks;
    const live = [...this.tasks.values()].filter((t) => t.projectId === projectId);
    const byId = new Map(saved.map((t) => [t.id, t]));
    for (const t of live) byId.set(t.id, t);
    return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  get(taskId) {
    if (this.tasks.has(taskId)) return this.tasks.get(taskId);
    return null;
  }
  /** The project's last task when Exit stopped it and nothing ran since: { taskId, text, step, scope, at } or null. */
  interrupted(projectId) {
    const last = this.list(projectId).at(-1);
    return last?.interrupted && !last.interrupted.handled && last.status !== "running" ? { taskId: last.id, text: last.text, step: last.step ?? null, scope: last.scope ?? null, at: last.interrupted.at } : null;
  }
  /** Run an interrupted task again (its own text, scope and step); the old one is marked handled. */
  async again(projectId, taskId) {
    const old = this.list(projectId).find((t) => t.id === taskId);
    if (!old?.interrupted) throw Object.assign(new Error("This task was not interrupted"), { code: "INVALID" });
    const task = await this.start(projectId, { text: old.text, scope: old.scope ?? { kind: "project" }, step: old.step ?? null, by: old.by ?? null });
    this.persist({ ...old, interrupted: { ...old.interrupted, handled: { at: new Date().toISOString(), by: task.id } } });
    return task;
  }
  /** A PDF's password the owner typed in the chat: out of the film's records, and out of what is written from now on (this run only: it is kept in memory). */
  forgetSecret(projectId, secret) {
    const s = String(secret ?? "");
    if (s.length < SECRET_MIN) return;
    const set = (this.secrets ??= new Map()).get(projectId) ?? new Set();
    this.secrets.set(projectId, set.add(s));
    for (const t of this.tasks.values()) if (t.projectId === projectId) maskTask(t, s);
    const p = this.getProject(projectId);
    if (p && !p.missing) scrubRecords(p.path, s);
  }
  persist(task) {
    const p = this.getProject(task.projectId);
    if (!p || p.missing) return;
    for (const s of this.secrets?.get(task.projectId) ?? []) maskTask(task, s);
    const f = this.tasksFile(p.path);
    const all = readJson(f, { tasks: [] }).tasks.filter((t) => t.id !== task.id);
    all.push({ ...task, events: task.events.slice(-400) });
    writeJson(f, { tasks: all.slice(-200) });
  }
  event(task, e) { task.events.push({ at: new Date().toISOString(), ...e }); task.updatedAt = new Date().toISOString(); }

  /** Start a task. scope: { kind: "project" | "shot", shot?: { number, title, src, start, duration }, object?: string }; step: the pipeline step it
   *  works on (a Pipeline button), kickoff: the first message after Create project. */
  // shown: the user's own words, for the chat to show as their message when `text` is the app's longer instruction (storyboard
  // feedback)
  // label: what the chat calls the task when it is not a step's own (the turn answering a revision's question is "Storyboard · revision")
  // continues: the step whose question this chat turn answers: the Pipeline shows that step at work; the turn stays a chat turn
  // resumeOf: the task whose reply was cut at the output limit before it was done (T23-2): this one goes on in its conversation
  async start(projectId, { text, scope = { kind: "project" }, step = null, kickoff = false, retryOf = null, shown = null, label = null, media = null, asks = null, continues = null, resumeOf = null, by = null, size = null }) {
    const msg = String(text ?? "").trim();
    if (!msg) throw Object.assign(new Error("Write what you want Claude to do"), { code: "INVALID" });
    if (this.running.has(projectId)) throw Object.assign(new Error("Claude is still working on this project. Stop it or wait for it to finish."), { code: "BUSY" });
    this.guard?.(projectId);
    const p = this.getProject(projectId);
    if (!p || p.missing) throw Object.assign(new Error("Project not found"), { code: "NOT_FOUND" });
    // (claudeExe and spawnClaude: a test's stand-in for Claude Code, as gates is for the checks)
    const exe = this.claudeExe ?? findClaude(this.root);
    if (!exe) throw Object.assign(new Error("Claude Code was not found on this computer"), { code: "NO_CLAUDE" });
    // refused before anything starts, so no task runs half-way without a sign-in. The check takes seconds; meanwhile the
    // Pipeline counts the message as sent (no "Waiting for you: answer Claude" on a question just answered)
    this.starting.add(projectId);
    try { if (this.signIn) await this.signIn(); } finally { this.starting.delete(projectId); }
    if (this.running.has(projectId)) throw Object.assign(new Error("Claude is still working on this project. Stop it or wait for it to finish."), { code: "BUSY" });
    this.lateRuns.get(projectId)?.abort();          // the last task's checks are of a film this task changes again
    const dir = p.path, meta = p.meta ?? {};
    const settings = effectiveSettings(meta, this.root);
    if (!this.permitUrl && settings.mode === "manual") settings.mode = "acceptEdits";          // nobody to ask (a run without the server)
    if (!this.permitUrl && settings.web === "ask") settings.web = "off";
    const se = stepEffort(settings.effort, step ? this.stepOf?.(meta, step) ?? null : null);
    settings.effort = se.effort;
    const conv = readConversation(dir);
    // a chat message after a long conversation (a Build's 358K) does not resume it (a label fix re-read 46K and cost $0.85):
    // it opens the chat's own small conversation, with what happened just before in the request; the files carry the rest
    const { key, fresh: freshChat } = taskSession(conv, step);
    const task = { id: randomBytes(6).toString("hex"), projectId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: "running",
      stage: "preparing", text: msg, scope, events: [], resultText: "", error: null, changed: [], qa: null, model: null, modelSetting: settings.model, outcome: null,
      settings: { mode: settings.mode, effort: settings.effort, ...(se.rule ? { effortRule: se.rule } : {}), web: settings.web }, session: { key, fresh: !!step || freshChat || !conv.sessions[key] },
      ...(step ? { step } : {}), ...(by === "app" ? { by } : {}), ...(kickoff ? { kickoff: true } : {}), ...(retryOf ? { retryOf } : {}), ...(resumeOf ? { resumeOf } : {}), ...(shown ? { shown: String(shown).slice(0, 20000) } : {}), ...(label ? { label: String(label).slice(0, 80) } : {}), ...(asks ? { asks: String(asks).slice(0, 80) } : {}), ...(continues && !step ? { continues: String(continues).slice(0, 40) } : {}),
      // the Adaptation step's size (server/sizes.mjs): the pipeline shows it running, its end marks it Ready
      ...(size && step === "adaptation" ? { size: String(size).slice(0, 8) } : {}),
      // pictures the chat card shows with the user's words (each film note's frame: { url, t, shot, text }), never a file path
      ...(Array.isArray(media) && media.length ? { media: media.slice(0, 200) } : {}) };
    this.tasks.set(task.id, task);
    this.running.set(projectId, task.id);
    let spFile = null;
    try {
      // the film's first task ends the kickoff, whoever started it (the autopilot on open, or the Editor): a later Editor never
      // takes a pending kickoff for its own first step (it ran the Character step a second time)
      if (kickoff || meta.kickoff?.pending) this.updateMeta?.(projectId, (m) => { m.kickoff = { pending: false, taskId: task.id, at: task.createdAt }; });
      // the app's documents in docs/ before Claude reads them (a film restored to an older version has them at the root again)
      try { await rev.inRepo(dir, () => moveDocs(dir)); } catch { /* one that cannot move is read where it is */ }
      // git beside the server's thread, in the project's queue (T22-5): every change asked for before is recorded first
      task.revBefore = await rev.saveAsync(dir, "Changes before Claude task " + task.id);
      task.briefAt = briefAt(dir, meta);
      // the style's rules and its own sources for this step, as the Writers' Room's and the Thumbnails' labs stage them (rules.mjs stageFor)
      const { style, files: rules, first, qc, staged } = stageFor(dir, meta.style?.id, { step, root: this.root });
      const { shots } = await this.readShots(dir);
      if (meta.look?.id && !scope.motion) { try { stageLook(dir, meta.look.id, this.root); } catch { /* the look store is not imported: the name is enough */ } }
      for (const text of staged) this.event(task, { kind: "status", text });
      // the Map Explainer's engine, and the owner's styles' engine and faces, beside the film's page too once it has one, so a Build can see its
      // frames before the app's finish
      if (meta.style?.id === MAP_STYLE_ID) { try { placeMapEngine(dir); } catch { /* the staged engine is enough */ } }
      if (isMoworksStyle(meta.style?.id)) await placeStyle(dir, "index.html").catch(() => null);
      const pipeline = this.pipeline ? await this.pipeline(projectId).catch(() => "") : "";
      const prev = this.list(projectId).filter((x) => x.id !== task.id).at(-1);
      const news = readNotes(dir).filter((n) => !prev || (n.updatedAt ?? n.at) > prev.createdAt).map((n) => n.kind === "assets" ? `the owner added ${n.files?.length ?? 0} file(s): ${(n.files ?? []).slice(0, 20).join(", ")}` : n.text.replace(/\{(\w+)\}/g, (m0, k) => n.vars?.[k] ?? m0));
      const newsText = news.length ? `New since your last task: ${news.join("; ")}.` : "";
      // a pipeline step starts a fresh conversation each time it runs ("Make two more options" once resumed the first storyboard task's
      // 49 turns and its pictures, 2.5 M tokens re-read); the project's files carry the work across. The chat keeps its conversation.
      // a step taken up after its reply was cut goes on in the conversation it was cut in (its reads and its work so far)
      const own = (step && !resumeOf) || freshChat ? null : conv.sessions[key];
      const before = freshChat && prev ? `Just before (this chat starts a new, small conversation; the project's files hold the work): ${prev.step ? `the ${prev.step} step` : `the request "${String(prev.text ?? "").split("\n")[0].slice(0, 200)}"`} ended with: ${String(prev.resultText ?? "").slice(0, 1500)}\nRead only the files this request needs, the part you change (Grep for it, then Edit).` : "";
      const sessionArgs = own?.sessionId ? ["--resume", own.sessionId] : ["--session-id", randomUUID()];
      const target = scope.kind === "selection" && scope.selection      // an element picked in the Editor's preview: its own request block (HF's format)
        ? `Target: the element selected in the Editor's preview${scope.shot ? ` (shot ${scope.shot.number} "${scope.shot.title}")` : ""}. Change only this element unless the request says otherwise.\n${String(scope.selection).slice(0, 6000)}`
        : scope.kind === "shot" && scope.shot
        ? `Target: Shot ${scope.shot.number} "${scope.shot.title}" (${scope.shot.src ?? "no file yet"}, ${scope.shot.start ?? "?"}-${scope.shot.start != null && scope.shot.duration != null ? +(scope.shot.start + scope.shot.duration).toFixed(2) : "?"} s)${scope.object ? `, object: ${scope.object}` : ""}. Change only this shot unless the request says otherwise.`
        : "Target: the whole project.";
      // the Film Editor's size switch on one of the film's other sizes (the Adaptation step): the request is for that size's picture
      const sizeTo = scope.size && /^(9:16|16:9|1:1|4:5)$/.test(String(scope.size)) && scope.size !== meta.format?.aspect ? String(scope.size) : null;
      const sizeLine = sizeTo ? `
Size: the owner is editing the ${sizeTo} size: change its root page index.${sizeTo.replace(":", "x")}.html and the files of that size alone (".${sizeTo.replace(":", "x")}." in their names), as .moworks/rules/adaptation/SKILL.md says; the master (index.html) and the other sizes stay as they are. A change to the sound is the master's and every size's: the sound is shared.` : "";
      let motion = "";
      if (scope.motion?.id && scope.motion.library === "blocks") {     // a HyperFrames registry block / component, used as shipped
        const entry = registryItems(this.root).find((e) => e.id === scope.motion.id);
        if (entry) await ensureHosted(entry, { root: this.root }).catch(() => {});     // images it lists by URL (offline: staged without them)
        const staged = stageBlock(dir, scope.motion.id, this.root);
        motion = `\nHyperFrames ${staged.item.kind} "${staged.item.title}" (registry ${staged.item.kind}s/${staged.item.name}, ${staged.item.credit.commit.slice(0, 12)}). Read it before editing: ${staged.files.join(", ")}.`
          + " Use it as HyperFrames ships it (copy its composition and assets into the project, mount it like the other sub-compositions, set its text and variables);"
          + (staged.item.vi.status === "missing" || staged.item.vi.status === "mixed" ? ` its font ${staged.item.vi.families.filter((f) => f.vi !== true).map((f) => f.family).join(", ")} has no Vietnamese letters: use a font that has them for Vietnamese text.` : " keep its look.");
        this.event(task, { kind: "status", text: `Blocks: ${staged.item.title}` });
      } else if (scope.motion?.id && scope.motion.library === "intake") {     // Magic UI / Codrops / the studio's own, written here as a HyperFrames component
        const staged = stageIntake(dir, scope.motion.id, this.root);
        const it = staged.item;
        motion = `\nMotion Library ${it.kind}: "${it.title}" by ${it.credit.author} (${it.credit.licence}, ${it.credit.made}${it.credit.link ? `; ${it.credit.link}` : ""}). Read it before editing: ${staged.files.join(", ")}.`
          + ` Use it the HyperFrames way: copy the snippet's markup, CSS and script into the shot's composition (and any file it lists under assets/), then call ${it.fn}(element, tl, time, options) on the shot's own paused timeline, as the snippet's comment and demo.html show. Keep its timings and look; set the text and options the request asks for.`
          + (it.vi === "missing" ? " Its demo font lacks Vietnamese letters: use a font that has them for Vietnamese text." : "");
        this.event(task, { kind: "status", text: `Motion Library: ${it.title}` });
      } else if (scope.motion?.id && scope.motion.library === "looks") {     // a HyperFrames look (frame preset)
        const staged = stageLook(dir, scope.motion.id, this.root);
        motion = `\nHyperFrames look "${staged.item.title}" (${staged.item.category}, HyperFrames' frame presets at ${staged.item.credit.commit.slice(0, 12)}). Read it before editing: ${staged.files.join(", ")}.`
          + " Adopt it the HyperFrames way: copy its FRAME.md to the project as frame.md and restyle the film to it (look.md, \"The project's design spec\", explains how); keep the content, timing and narration."
          + (staged.item.vi?.status === "missing" ? ` Its font ${staged.item.vi.families.filter((f) => f.vi === false).map((f) => f.family).join(", ")} has no Vietnamese letters: use a font that has them for Vietnamese text.` : "");
        this.event(task, { kind: "status", text: `Brand Kit: ${staged.item.title}` });
      } else if (scope.motion?.id && scope.motion.library === "vocab") {     // Motion Prompt's names and numbers: words for Claude, not a motion to copy
        const staged = stageVocab(dir, scope.motion.id, this.root);
        motion = `\nMotion Library vocabulary: "${staged.item.title}" by ${staged.item.credit.author} (${staged.item.credit.licence}, ${staged.item.credit.made}; ${staged.item.credit.link}). Read its numbers before editing: ${staged.files.join(", ")}.`
          + " These are words and numbers, not code to paste: write the move with GSAP on the shot's own paused timeline from them (ease, durations, amounts scaled to the film's size).";
        this.event(task, { kind: "status", text: `Motion Library: ${staged.item.title}` });
      }
      motion += pickedCastLine(scope.characters);
      // the user's language (taskLanguage), kept on the task for the reminder after each app tool
      const lang = taskLanguage({ step, by, text: msg, shown, earlier: this.list(projectId).filter((x) => x.id !== task.id), brief: meta.brief?.text });
      task.lang = lang;
      // the pipeline and the news live in the request only (they change every task; the system prompt carries what holds for the project);
      // the request ends with the language of the replies (replyLanguage)
      const prompt = taskRequest({ target: target + sizeLine, motion, pipeline, news: newsText, before, msg, lang });
      const tools = this.permitUrl ? Object.keys(this.appTools).filter((n) => APP_TOOLS[n]) : [];
      // the rule files this step must read (reads.mjs, after HF's own mandatory reads): named in the prompt, checked before the first edit
      const required = requiredReads(dir, { styleId: meta.style?.id, first, step });
      task.requiredReads = required;
      // an app file the step should read and cannot (a rules file renamed, a source not staged): in the log and on the task, never dropped in silence
      const missing = missingReads(dir, { styleId: meta.style?.id, first, step });
      if (missing.length) {
        task.missingReads = missing; console.error(`[rules] ${meta.style?.id ?? "no style"} ${step ?? "chat"}: not found ${missing.join(", ")}`);
        this.event(task, { kind: "status", text: missingLine(missing.length) });          // said in the chat too, without a path (audit/112 3.3)
      }
      // the Brand Kit's fonts, checked by the app before Prepare and the chat: a font it lacks or without Vietnamese stops
      const brandFonts = meta.look?.id && (!step || step === "brief")
        ? await Promise.race([brandKitFonts(dir), new Promise((ok) => setTimeout(() => ok(null), 8000))]).catch(() => null) : null;
      const sp = systemPrompt({ meta, style, rules, first, qc, shots, dir, step, lang, settings, tools, required, brandFonts,
        motionSpec: !this.stepOf || (this.stepOf(meta, null, true) ?? []).some((s) => s.done?.kind === "approval" && s.done.name === "motionPlan") });
      const mcpConfig = this.permitUrl ? JSON.stringify({ mcpServers: { mw: { command: process.execPath, args: [join(import.meta.dirname, "permit-mcp.mjs")] } } }) : null;
      const guard = required.length ? `"${process.execPath}" "${join(import.meta.dirname, "read-guard.mjs")}"` : null;
      // the system prompt in a file of the app's state (outside the project and its revisions), removed when the run ends; the task's
      // cache pings read the same file while it runs
      spFile = promptFile(join(stateDir(this.root), "claude-prompts"), task.id, sp);
      const stage = stageRoot(this.root);
      try { mkdirSync(stage, { recursive: true }); } catch { /* the rules were copied: nothing to read there */ }
      const webGuard = this.permitUrl ? `"${process.execPath}" "${join(import.meta.dirname, "web-guard.mjs")}"` : null;
      const args = claudeArgs({ settings, systemPromptFile: spFile.path, sessionArgs, mcpConfig, appTools: tools, guard, webGuard, stage });
      // Claude's Bash sees this environment: the owner's sign-in only, never the app's session token (MW_TOKEN of a dev or test start), only
      // the permit token, which the server takes for Claude's questions and the app's tools alone (system-status/claude-run.mjs)
      const env = claudeRunEnv(this.root);
      Object.assign(env, { MW_REQUIRED_READS: JSON.stringify(required), MW_TASK: task.id, MW_PROJECT: dir });
      // the most one reply of this step may hold, its thinking included (Opus 5.5's thinking has no budget of its own: output-limit.mjs)
      const cap = outputCap(step);
      if (cap) { env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = String(Math.min(cap, Number(env.CLAUDE_CODE_MAX_OUTPUT_TOKENS) || cap)); task.settings.outputCap = Number(env.CLAUDE_CODE_MAX_OUTPUT_TOKENS); }
      if (this.permitUrl) Object.assign(env, { MW_PERMIT_URL: this.permitUrl, MW_PERMIT_TOKEN: this.permitToken ?? "", MW_PERMIT_TASK: task.id, MCP_TOOL_TIMEOUT: String(35 * 60 * 1000),
        MW_APP_TOOLS: JSON.stringify(tools.map((n) => ({ name: n, ...APP_TOOLS[n] }))) });
      task.stage = "working";
      this.event(task, { kind: "status", text: `Target: ${scope.kind === "shot" && scope.shot ? `Shot ${scope.shot.number}` : "Project"}` });
      this.event(task, { kind: "status", text: `${own?.sessionId ? "Continuing" : "New"} conversation for ${key === "chat" ? "the chat" : `step ${key}`} · ${settings.mode} · ${settings.model} · effort ${settings.effort}${se.rule === "step" ? " (this step's own)" : se.rule === "min" ? " (at least high)" : ""} · web ${settings.web}` });
      // a command line over the budget is refused here in plain words (its largest part logged), never Windows' ENAMETOOLONG
      checkArgv(exe, args);
      const spawnFn = this.spawnClaude ?? spawn;
      const child = spawnFn(exe, args, { cwd: dir, env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
      this.procs.set(task.id, child);
      child.stdin.end(prompt, "utf8");
      // a long think or a long app tool (QC sheets, board stills) would let the 5-minute cache lapse; a one-word ping of a
      // copy of the conversation keeps it (its tokens are added to the task's usage)
      const ka = keepAlive({ exe, args, sessionId: sessionArgs[1], cwd: dir, env, spawnFn, onPing: ({ ok, usage }) => {
        const k = task.keepAlive ??= { pings: 0, ok: 0, cacheRead: 0, cacheWrite: 0, output: 0, costUsd: 0 };
        k.pings++; if (ok) k.ok++;
        if (usage) { const [pi, pw, pr, po] = PRICES.find(([id]) => id === "claude-opus-5-5")[1];
          for (const f of ["cacheRead", "cacheWrite", "output"]) k[f] += usage[f];
          k.costUsd = Math.round((k.costUsd + (usage.input * pi + usage.cacheWrite * pw + usage.cacheRead * pr + usage.output * po) / 1e6) * 1e6) / 1e6; }
      } });
      let buf = "", errTail = "";
      child.stdout.on("data", (d) => {
        buf += d.toString("utf8");
        let i;
        while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); ka.touch(line); this.onLine(task, line, dir, key); }
      });
      child.stderr.on("data", (d) => { errTail = (errTail + d.toString("utf8")).slice(-4000); });
      child.on("close", (code) => { ka.stop(); spFile.drop(); this.procs.delete(task.id); this.finish(task, dir, code, errTail).catch((e) => this.fail(task, e)); });
      child.on("error", (e) => { spFile.drop(); this.fail(task, e); });
    } catch (e) { spFile?.drop(); this.fail(task, e); }
    return task;
  }

  onLine(task, line, dir, key = "chat") {
    let e; try { e = JSON.parse(line); } catch { return; }
    // a reply cut at the output limit (or dropped mid-stream) after minutes of thinking: said in the chat as it happens (T23-2)
    // (Claude Code goes on by itself after a cut reply; a run that stops on it is said when it ends, finishInner)
    const cut = followCut(task, e);
    if (cut && (cut.from === "reply" || cut.from === "nudge")) this.cutSaid(task, dir, cut, { then: "going" });
    if (e.type === "system" && e.subtype === "init") {
      task.model = e.model ?? null;
      if (e.session_id) task.sessionId = e.session_id;
      if (e.session_id) {          // this step's session, and the one the next chat message continues
        const conv = readConversation(dir);
        // Claude Code's total_cost_usd counts the whole session, earlier runs of a resumed one too (a 2-turn chat once showed $1.51):
        // the session's total so far is kept, and this run's cost is what it adds
        const prev = conv.sessions[key];
        task.costBase = prev?.sessionId === e.session_id ? prev.costTotal ?? 0 : 0;
        conv.sessions[key] = { sessionId: e.session_id, model: e.model ?? null, at: new Date().toISOString(), ...(task.costBase ? { costTotal: task.costBase } : {}) };
        conv.current = key;
        writeJson(join(dir, ".moworks", "claude.json"), conv);
      }
      return;
    }
    if (e.type === "assistant") {
      // the conversation's size at this turn (what the next turn re-reads): kept with the session at the end
      const u = e.message?.usage;
      if (u) task.context = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
      // each message's usage (the latest seen: its stream repeats the message once per block), for a run stopped before its result
      if (u && e.message?.id) { const m = (task.liveUsage ??= {}), prev = m[e.message.id]?.u ?? {}; m[e.message.id] = { model: e.message.model ?? null, u: Object.fromEntries(["input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"].map((f) => [f, Math.max(prev[f] ?? 0, u[f] ?? 0)])) }; }
      for (const b of e.message?.content ?? []) {
        if (b.type === "text" && b.text?.trim()) this.event(task, { kind: "text", text: b.text });
        if (b.type === "tool_use") { this.event(task, { kind: "tool", ...describeTool(b.name, b.input) }); task.doing = doingOf(b.name); }
        else if (b.type === "thinking") task.doing = { kind: "think", at: new Date().toISOString() };
      }
    } else if (e.type === "user") {
      // (a user line of Claude Code's own, its nudge after a cut reply, may carry its words as a plain string)
      const blocks = Array.isArray(e.message?.content) ? e.message.content : [];
      for (const b of blocks) if (b?.type === "tool_result" && b.is_error) this.event(task, { kind: "tool-error", text: String(typeof b.content === "string" ? b.content : JSON.stringify(b.content)).slice(0, 400) });
      // a tool's answer is back, so Claude is thinking now (its thinking may stream nothing): the bar said "Font check for
      // 15m 47s" through a 16-minute thinking turn; and after Claude Code's nudge too
      if (blocks.some((b) => b?.type === "tool_result") || cutOf(e)) task.doing = { kind: "think", at: new Date().toISOString() };
    } else if (e.type === "result") {
      task.resultText = e.result ?? "";
      task.claudeError = e.is_error ? (e.result || e.subtype) : null;
      task.durationMs = e.duration_ms ?? null;
      task.usage = usageOf(e);          // tokens, the API-equivalent cost, turns (shown under each task)
      if (typeof e.total_cost_usd === "number") {          // this run's own cost, not the resumed session's total
        const base = task.costBase ?? 0;
        task.usage.costUsd = e.total_cost_usd >= base ? Math.round((e.total_cost_usd - base) * 1e6) / 1e6 : e.total_cost_usd;
        try {
          const conv = readConversation(dir);
          if (conv.sessions[key]?.sessionId === e.session_id || !e.session_id) { conv.sessions[key] = { ...conv.sessions[key], costTotal: e.total_cost_usd, ...(task.context ? { context: task.context } : {}) }; writeJson(join(dir, ".moworks", "claude.json"), conv); }
        } catch { /* the next run counts from zero */ }
      }
    }
  }

  /** A reply cut at the output limit or mid-stream, in one plain chat line (a "pipeline" note) and in the task's record: the minutes
   *  and the money a lost think took are said, never a silent 20 minutes (T23-2). then: cutNote's (what follows the cut). */
  cutSaid(task, dir, cut, { then = "going" } = {}) {
    const price = (PRICES.find(([id]) => String(task.model ?? "").startsWith(id))?.[1] ?? PRICES.find(([id]) => id === "claude-opus-5-5")[1])[3] / 1e6;
    const stepId = task.step ?? task.continues ?? null;
    const title = stepId ? this.stepOf?.(this.getProject(task.projectId)?.meta ?? {}, stepId)?.title ?? null : null;
    const n = cutNote(cut, { then, step: title, price, said: !!cut.said });
    if (!cut.said) this.event(task, { kind: "status", text: `A reply was ${cut.kind === "stream" ? "cut off mid-stream" : "cut at the output limit"} after ${cut.minutes} min${cut.output ? ` (${cut.output} output tokens)` : ""}` });
    cut.said = true;
    try { addNote(dir, { kind: "pipeline", text: n.text, vars: n.vars }); } catch { /* notes are best effort */ }
  }

  /** The run ended on a cut reply before its work was written or said done: one plain line, and a pipeline step (or the chat turn
   *  going on with one) is taken up again once, in its own conversation, with the nudge to work in small pieces; a second cut stops and
   *  says how to go on. The task itself is not done (the pipeline never takes it for its step's result). */
  cutEnded(task, dir, head, wrote) {
    const stepId = task.step ?? task.continues ?? null;
    const goOn = !!stepId && !task.resumeOf;
    this.cutSaid(task, dir, task.cut.list.at(-1), { then: goOn ? "again" : stepId ? "stop" : "chat" });
    task.revAfter = head; task.changed = wrote; task.errorCode = "OUTPUT_LIMIT";
    if (goOn) {
      task.retrying = true;
      const again = { text: resumeText(task), scope: task.scope ?? { kind: "project" }, step: stepId, resumeOf: task.id, ...(task.label ? { label: task.label } : {}) };
      setTimeout(() => {
        this.start(task.projectId, again).catch((e) => { this.event(task, { kind: "error", text: `Going on failed: ${e.message}` }); try { this.persist(task); } catch { /* the project may be gone */ } });
      }, RETRY_MS).unref?.();
    }
    return this.fail(task, new Error("This reply reached the most one reply can hold before the work was done."));
  }

  /** A task that ends while Claude waits for an answer: the question is closed with a no. */
  closeQuestions(taskId) {
    for (const [id, q] of this.permits) if (q.taskId === taskId) { clearTimeout(q.timer); this.permits.delete(id); q.resolve({ behavior: "deny", message: "The task ended." }); }
    const t = this.tasks.get(taskId); if (t) t.permission = null;
  }

  async finish(task, dir, code, errTail) {
    this.closeQuestions(task.id);
    try { await this.finishInner(task, dir, code, errTail); }
    finally {
      if (this.running.get(task.projectId) === task.id) this.running.delete(task.projectId);
      try { this.onFinished?.(task.projectId, task); } catch { /* backups are best effort */ }
      this.runLateChecks(task);
    }
  }

  /** The checks of a task's film, after the task ended: its result in task.qa, persisted; the film is free meanwhile. */
  async runLateChecks(task) {
    const dir = this.lateChecks.get(task.id);
    if (!dir) return;
    this.lateChecks.delete(task.id);
    // the build's checks (25 min on one film) ran beside the Review's first QC round, both HyperFrames on the same film: the
    // round's stills and check gave nothing after 15 min. The project's next task changes the film again, so its start drops them (start())
    const stop = new AbortController();
    this.lateRuns.set(task.projectId, stop);
    try {
      const g = await (this.gates ?? gatesAsync)(dir, { signal: stop.signal });
      const brief = (x) => ({ id: x.id, count: x.findings?.length ?? 0, first: x.findings?.[0] ? JSON.stringify(x.findings[0]).slice(0, 240) : "" });
      task.qa = { pass: g.pass, blocking: g.gates.filter((x) => x.blocking && !x.pass).map(brief), warnings: g.gates.filter((x) => !x.blocking && !x.pass).map(brief),
        passed: g.gates.filter((x) => x.pass).map((x) => x.id), checks: g.gates.length };
    } catch (e) { task.qa = stop.signal.aborted ? null : { error: e.message }; if (stop.signal.aborted) task.qaDropped = true; }
    if (this.lateRuns.get(task.projectId) === stop) this.lateRuns.delete(task.projectId);
    delete task.qaPending;
    try { this.persist(task); } catch { /* the project may be gone */ }
  }

  async finishInner(task, dir, code, errTail) {
    // a run stopped (or failed) before Claude Code's result still costs what its messages used
    if (!task.usage && task.liveUsage) task.usage = liveUsage(task.liveUsage, { durationMs: Date.now() - Date.parse(task.createdAt ?? new Date().toISOString()) });
    if (task.durationMs == null && task.usage?.estimated) task.durationMs = task.usage.durationMs;
    delete task.liveUsage;
    // the cache pings are part of what the task cost (task.keepAlive keeps them apart)
    if (task.usage && task.keepAlive?.costUsd) { task.usage.costUsd = Math.round(((task.usage.costUsd ?? 0) + task.keepAlive.costUsd) * 1e6) / 1e6;
      for (const f of ["cacheRead", "cacheWrite", "output"]) task.usage[f] = (task.usage[f] ?? 0) + task.keepAlive[f]; }
    if (task.status === "cancelling") {
      task.revAfter = await rev.commitAllAsync(dir, `Cancelled Claude task ${task.id} (partial changes)`);
      task.changed = await rev.changedFilesAsync(dir, task.revBefore, task.revAfter);
      task.status = "cancelled"; task.stage = "cancelled";
      task.outcome = task.changed.length ? "partial" : "none";
      this.event(task, { kind: "status", text: task.changed.length ? "Stopped. Partial changes were kept as a revision you can undo." : "Stopped. No file was changed." });
      return this.persist(task);
    }
    // replies cut at the output limit (T23-2): Claude Code holds a cut reply back from its stream while it goes on, so a run whose stream
    // showed none is read again in its transcript; each cut not said yet is said now. A run that ended on one before its work was
    // written or said done is not done: cutEnded
    if (!task.cut?.list?.length && task.sessionId) {
      const t = readTranscriptCuts(dir, task.sessionId, task.createdAt, claudeEnv());
      if (t.list.length) task.cut = { ...t, fromTranscript: true };
    }
    const cuts = task.cut?.list ?? [];
    for (const [i, c] of cuts.entries()) if (!c.said && !(task.cut.open && i === cuts.length - 1)) this.cutSaid(task, dir, c, { then: "after" });
    if (task.cut?.open && cuts.length) {
      const head = await rev.commitAllAsync(dir, `Claude: ${String(task.text ?? "").split("\n")[0].slice(0, 70)}`);
      const wrote = await rev.changedFilesAsync(dir, task.revBefore, head);
      if (!wrote.length || task.claudeError || !String(task.resultText ?? "").trim()) return this.cutEnded(task, dir, head, wrote);
    }
    if (code !== 0 || task.claudeError) {
      task.revAfter = await rev.commitAllAsync(dir, `Claude task ${task.id} (failed)`);
      task.changed = await rev.changedFilesAsync(dir, task.revBefore, task.revAfter);
      const msg = task.claudeError || errTail.split(/\r?\n/).filter(Boolean).slice(-3).join(" ") || `Claude stopped (exit ${code})`;
      if (SIGNED_OUT_TEXT.test(msg)) { this.onSignedOut?.(); task.errorCode = "CLAUDE_SIGNED_OUT"; }
      // two Claude Code processes refreshing the sign-in at once is passing; the same request runs again once, a few seconds later
      if (OAUTH_RACE.test(msg) && !task.retryOf) {
        task.errorCode = "CLAUDE_BUSY_RETRY"; task.retrying = true;
        const again = { text: task.text, scope: task.scope, step: task.step ?? null, retryOf: task.id, by: task.by ?? null };
        setTimeout(() => { this.start(task.projectId, again).catch((e) => this.event(task, { kind: "error", text: `Trying again failed: ${e.message}` })); }, RETRY_MS).unref?.();
        return this.fail(task, new Error("Claude Code was busy refreshing its sign-in: trying again in a few seconds"));
      }
      return this.fail(task, new Error(msg));
    }
    const edited = await rev.changedFilesAsync(dir, task.revBefore, await rev.commitAllAsync(dir, `Claude: ${task.text.split("\n")[0].slice(0, 70)}`));
    if (edited.length) {
      task.stage = "checking"; task.doing = { kind: "rules", at: new Date().toISOString() }; this.event(task, { kind: "status", text: "Applying studio rules and checking the film" });
      // sound effects are placed at Final Mix only, once the picture is locked, not after every task
      // the film's data-fps back on the root if Claude's rewrite of index.html lost or changed it: HF's player and checks read it
      try { keepRootFps(this.getProject(task.projectId) ?? { path: dir }); } catch (e) { this.event(task, { kind: "tool-error", text: `Frame rate: ${e.message}` }); }
      // the music ends with the film as it is now, fading down with the picture (hf-edit/ending.mjs)
      try { fitMusicToFilm(dir); } catch (e) { this.event(task, { kind: "tool-error", text: `Music: ${e.message}` }); }
      // a file Claude put outside the app's folders (a loose picture in assets/, an older folder name) goes where it belongs, the film's
      // paths with it
      try {
        const lr = migrateLayout(dir, { classify: classifyAsset, sequenceOf });
        if (lr.moved.length) this.event(task, { kind: "status", text: `Files sorted into the asset folders: ${lr.moved.map(([, t]) => t).slice(0, 5).join(", ")}` });
        // a document Claude wrote at the root from habit: into docs/, where the steps read it
        if (lr.docs?.length) this.event(task, { kind: "status", text: `Documents moved into docs/: ${lr.docs.map(([f]) => f).join(", ")}` });
      }
      catch (e) { this.event(task, { kind: "tool-error", text: `Folders: ${e.message}` }); }
      try {
        const rep = await finalize(dir);
        // a film whose source does not compile keeps its older bundle: said at once, kept for the pipeline and the autopilot
        const bad = rep?.anidoodle?.error ?? (rep?.filmStyle ?? rep?.kit)?.error ?? null;
        if (bad) this.event(task, { kind: "tool-error", text: `The film's code does not compile: ${bad}` });
        this.updateMeta?.(task.projectId, (m) => { const pl = (m.pipeline ??= {}); if (bad) pl.buildError = { at: new Date().toISOString(), error: bad, taskId: task.id }; else delete pl.buildError; });
      } catch (e) { this.event(task, { kind: "tool-error", text: `Finalize: ${e.message}` }); }
      await rev.commitAllAsync(dir, `Studio rules after Claude task ${task.id}`);
      // the checks (HyperFrames' check, the pose check: minutes on a long code film) no longer hold the task open: Render once stayed
      // grey ("Claude is changing the film") for 6+ min after Claude's last word. They run after the task ends; their result joins the task
      // none before the Build (Prepare, Characters, Storyboard, Motion Plan): the film is not written yet, so a finding there ("To fix
      // before the build: Composition files" under a Motion Plan's draft frames) is nothing the user can act on; the Storyboard checks its
      // boards in board_stills
      if (checksAfter((this.stepOf?.(this.getProject(task.projectId)?.meta ?? {}, null, true) ?? []).map((x) => x.id), task.step)) {
        task.qa = null; task.qaPending = true;          // (the Editor shows nothing until the result comes)
        this.lateChecks.set(task.id, dir);
      }
    }
    task.revAfter = await rev.headAsync(dir);
    task.changed = await rev.changedFilesAsync(dir, task.revBefore, task.revAfter);
    // Claude's wording fix in the brief keeps its date: the steps approved after it stay approved. Prepare's own turns and the app's "the owner
    // changed the brief" task write the brief itself
    if (task.briefAt != null && (task.step ?? task.continues) !== "brief" && task.by !== "app" && task.changed.some((c) => c.path === "BRIEF.md")) {
      try {
        const was = await rev.fileAtAsync(dir, task.revBefore, "BRIEF.md"), f = join(dir, "BRIEF.md");
        if (was != null && smallBriefEdit(was, readFileSync(f, "utf8"))) this.updateMeta?.(task.projectId, (m) => { (m.pipeline ??= {}).briefFix = { mtime: statSync(f).mtimeMs, at: task.briefAt, taskId: task.id }; });
      } catch { /* it asks again, as it did */ }
    }
    task.outcome = task.changed.length ? "applied" : "proposal";
    task.status = "done"; task.stage = "done";
    this.persist(task);
    if (task.step) {           // a Pipeline step's task: Claude has done its part; steps that need no confirmation are done now
      const def = this.stepOf?.(this.getProject(task.projectId)?.meta ?? {}, task.step);
      const order = (this.stepOf?.(this.getProject(task.projectId)?.meta ?? {}, null, true) ?? []).map((x) => x.id);
      let sb = existsSync(join(dir, "STORYBOARD.md")) ? readFileSync(join(dir, "STORYBOARD.md"), "utf8") : null;
      // a step after the approved storyboard (Motion Plan, Build, Review, sound) never rewrites it (the Build moved shot 2 from
      // 3.32 s to 1.787 s): its frames go back as approved, the step's own status / src / sfx lines kept; a timing it needs lives in the
      // Motion Plan or the build. The user's chat turns still change it (they are the user's own request).
      const approvedSb = this.getProject(task.projectId)?.meta?.approvals?.storyboard;
      if (sb != null && approvedSb && task.revBefore && order.indexOf(task.step) > order.indexOf("storyboard") && order.indexOf("storyboard") >= 0) {
        const before = await rev.fileAtAsync(dir, task.revBefore, "STORYBOARD.md");
        if (before != null && storyboardHash(before) !== storyboardHash(sb)) {
          sb = keepApprovedStoryboard(before, sb);
          writeFileSync(join(dir, "STORYBOARD.md"), sb.endsWith("\n") ? sb : sb + "\n");
          try { await rev.commitAllAsync(dir, `The approved storyboard kept as approved (task ${task.id} had changed it)`); } catch { /* the file is right either way */ }
          this.event(task, { kind: "status", text: "The approved storyboard was put back as you approved it (this step had changed its frames)" });
          task.storyboardKept = true;
        }
      }
      this.updateMeta?.(task.projectId, (m) => {
        const moved = followApprovals(m, { storyboardText: sb, motionPlanHash: readMotionPlan(dir).hash, stepId: task.step, taskId: task.id, order });
        if (moved.length) { this.event(task, { kind: "status", text: `Approvals kept, adjusted by this step: ${moved.join(", ")}` }); task.adjustedApprovals = moved; }
        const pl = (m.pipeline ??= { marks: {}, skips: {}, ran: {} });
        (pl.ran ??= {})[task.step] = { at: new Date().toISOString(), taskId: task.id };
        if (def?.done?.kind === "mark" && def.done.auto && (!def.done.file || existsSync(join(dir, ...def.done.file.split("/"))))) (pl.marks ??= {})[task.step] = { at: new Date().toISOString(), by: "claude", taskId: task.id };
      });
      if (task.adjustedApprovals) this.persist(task);
    } else if (task.changed?.length) {
      // the feedback loop, and from the first approval on (the Motion Plan is approved once; feedback on the right never asks for it again):
      // a chat turn that changes the storyboard or the motion
      // (a timing moved, a longer film) is the user's own request: the approvals follow it, with a note of the change, never a new gate
      const pm = this.getProject(task.projectId)?.meta ?? {};
      if (pm.approvals?.storyboard || pm.approvals?.motionPlan) {
        const order = [...(this.stepOf?.(pm, null, true) ?? []).map((x) => x.id), "feedback"];
        const sb = existsSync(join(dir, "STORYBOARD.md")) ? readFileSync(join(dir, "STORYBOARD.md"), "utf8") : null;
        this.updateMeta?.(task.projectId, (m) => {
          const moved = followApprovals(m, { storyboardText: sb, motionPlanHash: readMotionPlan(dir).hash, stepId: "feedback", taskId: task.id, order, what: String(task.text ?? "").split("\n")[0] || null });
          if (moved.length) task.adjustedApprovals = moved;
        });
        if (task.adjustedApprovals) this.persist(task);
      }
    }
    this.updateMeta?.(task.projectId, (m) => { m.updatedAt = new Date().toISOString(); (m.activity ??= []).unshift({ at: new Date().toISOString(), kind: "claude",
      text: task.outcome === "applied" ? `Claude changed ${task.changed.length} file(s): ${task.text.split("\n")[0].slice(0, 80)}` : `Claude replied: ${task.text.split("\n")[0].slice(0, 80)}` }); });
  }

  fail(task, e) {
    this.closeQuestions(task.id);
    if (this.running.get(task.projectId) === task.id) this.running.delete(task.projectId);
    this.procs.get(task.id)?.kill?.();
    task.status = "failed"; task.stage = "failed"; task.error = String(e?.message ?? e);
    this.event(task, { kind: "error", text: task.error });
    this.persist(task);
  }

  /** Stop a running task (the process tree is ended; changes so far become a revision you can undo). reason "exit": the app is closing:
   *  the task is marked interrupted at once, on disk, so the next start can offer to run it again. */
  cancel(taskId, { reason = null } = {}) {
    const t = this.tasks.get(taskId);
    if (!t || t.status !== "running") throw Object.assign(new Error("This task is not running"), { code: "INVALID" });
    if (reason === "exit") { t.interrupted = { by: "exit", at: new Date().toISOString() }; try { this.persist(t); } catch { /* the cancel still runs */ } }
    t.status = "cancelling"; t.stage = "cancelling";
    this.closeQuestions(taskId);
    const c = this.procs.get(taskId);
    if (c) killTree(c);
    return t;
  }

  /** Undo a finished task's changes with a new revision (git beside the server's thread, in the project's queue). */
  async revert(projectId, taskId) {
    const p = this.getProject(projectId);
    const all = this.list(projectId);
    const t = all.find((x) => x.id === taskId);
    if (!t) throw Object.assign(new Error("Task not found"), { code: "NOT_FOUND" });
    if (!t.changed?.length || !t.revAfter) throw Object.assign(new Error("This task changed no file"), { code: "INVALID" });
    if (t.reverted) throw Object.assign(new Error("Already undone"), { code: "INVALID" });
    if (this.running.has(projectId)) throw Object.assign(new Error("Wait until Claude has finished"), { code: "BUSY" });
    const log = await rev.logAsync(p.path, 400);
    const span = []; let inside = false;
    for (const c of log) { if (c.rev === t.revAfter) inside = true; if (c.rev === t.revBefore) break; if (inside) span.push(c.rev); }
    // the app's own follow-up to the change: the sound effects it placed again right after it (autopilot: cuesAgain / timesAgain, a commit
    // of their own). They go with it, newest first (T41-12: the twinkle Claude's change had named stayed after its Undo). Only the ones
    // straight after the change, within 10 minutes of it, with nothing newer on top: a Final Mix the user ran later stays
    const end = log.findIndex((c) => c.rev === t.revAfter);
    if (span.length && end > 0) {
      const at0 = Date.parse(log[end].at), follow = [];
      for (let i = end - 1; i >= 0; i--) {
        const c = log[i];
        if (!String(c.message).startsWith(`${rev.SOUND_MIX}: sound effects`) || !(Date.parse(c.at) - at0 <= 10 * 60 * 1000)) break;
        follow.unshift(c.rev);
      }
      if (follow.length && follow[0] === log[0].rev) span.unshift(...follow);
    }
    let r = null;
    for (const c of span) r = await rev.revertAsync(p.path, c);     // newest first
    t.reverted = { at: new Date().toISOString(), rev: r };
    // the approvals the change had moved with it follow the Undo back (T43-5, T41-13: after an Undo the Storyboard and the Motion Plan
    // asked to be approved again): the Undo is the user's own request, as the change was
    const pm = this.getProject(projectId)?.meta ?? {};
    if (pm.approvals?.storyboard || pm.approvals?.motionPlan) {
      const order = [...(this.stepOf?.(pm, null, true) ?? []).map((x) => x.id), "feedback"];
      const sb = existsSync(join(p.path, "STORYBOARD.md")) ? readFileSync(join(p.path, "STORYBOARD.md"), "utf8") : null;
      try { this.updateMeta?.(projectId, (m) => { followApprovals(m, { storyboardText: sb, motionPlanHash: readMotionPlan(p.path).hash, stepId: "feedback", taskId: t.id, order, what: "Undo" }); }); } catch { /* the Pipeline asks again */ }
    }
    const live = this.tasks.get(taskId); if (live) live.reverted = t.reverted;
    this.persist(live ?? { ...t, events: t.events ?? [] });
    return t;
  }
}

/** Fresh eyes (moworks-qc §5): a separate short Claude run that sees only the given sheets (its folder is the QC round's), says in one
 *  sentence what the film tells and lists the 3 worst problems. Returns the text, or null when it could not run. */
export async function freshEyes({ dir, sheets, root = APP_ROOT, model = "sonnet" }) {
  if (!findClaude(root) || !sheets.length) return null;
  const names = sheets.map((f) => f.split("/").pop());
  const prompt = `You see a short film only as these contact sheets (read each with Read): ${names.join(", ")}. The beats sheet is one still per shot in order; the cuts sheet shows 4 frames across each shot change; a long film has more pages of each (beats-2, cuts-2…), in order. You know nothing else about the film. Answer in Vietnamese, in two parts: 1) one sentence: what does this film tell its viewer? 2) the 3 worst problems you see (which shot or cut, what, why), most serious first. Nothing else.`;
  const cwd = join(dir, ...sheets[0].split("/").slice(0, -1));
  const r = await claudeJson(prompt, { cwd, root, tools: "Read", mode: "auto", model: MODELS.find(([k]) => k === model)?.[2] ?? "claude-sonnet-5-5", effort: "low", timeoutMs: 5 * 60 * 1000 });
  return r.ok ? r.result || null : null;
}


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
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { APP_ROOT, expandEnv, loadPins } from "../version-manager/index.mjs";
import { claudeEnv, findClaude } from "../system-status/index.mjs";
import { getStyle } from "../style-catalog/index.mjs";
import * as rev from "../revisions/index.mjs";
import { finalize, fontMap } from "../hf-edit/finalize.mjs";
import { fitMusicToFilm } from "../hf-edit/tracks.mjs";
import { filmLength } from "../hf-edit/ending.mjs";
import { frameFonts, vietnameseCheck } from "../looks-library/index.mjs";
import { viLine, viOptionsText, viSuggest, viVerified } from "../hf-edit/googleFontsVi.mjs";
import { stageForProject as stageVocab } from "../vocab-library/index.mjs";
import { stageForProject as stageBlock, ensureHosted, registryItems } from "../blocks-library/index.mjs";
import { stageForProject as stageLook } from "../looks-library/index.mjs";
import { stageForProject as stageIntake } from "../intake-library/index.mjs";
import { lemoSlug, ruleText as lemoRuleText, stageDemo as stageLemoDemo } from "../lemo-styles/index.mjs";
import { mgSlug, ruleText as mgRuleText, stageDemo as stageMgDemo } from "../mg-styles/index.mjs";
import { anidoodleId, ruleText as anidoodleRuleText, stageEngine as stageAnidoodle } from "../anidoodle-styles/index.mjs";
import { readCast, ruleText as brushRuleText, stageGuide as stageBrushGuide } from "../character-kit/index.mjs";
import { stageEngine as stageWhatIf, whatIfSource } from "../what-if-styles/index.mjs";
import { status as secretsStatus } from "../secrets/index.mjs";
import { PROMPT as MOTION_PLAN_PROMPT } from "../motion-plan/index.mjs";
import * as sfx from "../sfx/index.mjs";
import { SIGNED_OUT_TEXT } from "../server/claude.mjs";
/** Claude Code's own message when another of its processes is refreshing the sign-in at the same moment: passing, worth one retry. */
export const OAUTH_RACE = /another Claude Code process is refreshing|Failed to refresh OAuth token/i;
const RETRY_MS = Number(process.env.MW_CLAUDE_RETRY_MS ?? 5000);
import { classifyAsset, inventory, readNotes, keepRootFps, sequenceOf } from "../project-service/index.mjs";
import { migrateLayout } from "../project-service/layout.mjs";
import { filmKind, requiredReads } from "./reads.mjs";
import { followApprovals, keepApprovedStoryboard, storyboardHash } from "../pipeline/index.mjs";
import { read as readMotionPlan } from "../motion-plan/index.mjs";
import { voiceFitText } from "./voice-fit.mjs";
import { canvasTextLine } from "./canvas-text.mjs";
import { keepAlive } from "./keepalive.mjs";

/** The deterministic gates (packages/hf-qa) in a child process, so the server keeps answering while HF's check runs. `signal` ends the
 *  whole tree (the gates and the HyperFrames processes they started): the promise then rejects with code DROPPED. */
export function gatesAsync(dir, { signal = null, script = join(import.meta.dirname, "..", "hf-qa", "gates-cli.mjs") } = {}) {
  return new Promise((ok, no) => {
    const c = spawn(process.execPath, [script, dir], { windowsHide: true });
    const kill = () => { try { spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true }); } catch { c.kill(); } };
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
/** Only the 5.5 models (nothing older); the full id is passed so the version is certain. */
export const MODELS = [["opus", "Opus 5.5", "claude-opus-5-5"], ["sonnet", "Sonnet 5.5", "claude-sonnet-5-5"], ["haiku", "Haiku 5.5", "claude-haiku-5-5"]];
export const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
/** Claude Code's permission modes; bypassPermissions only when the user turned the experiment on (agent settings allowBypass). */
export const MODES = [["auto", "Auto"], ["manual", "Manual"], ["acceptEdits", "Accept edits"], ["plan", "Plan"], ["bypassPermissions", "Bypass permissions"]];
export const WEB = ["ask", "on", "off"];
const invalid = (m) => Object.assign(new Error(m), { code: "INVALID" });

const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
const writeJson = (p, v) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p + ".tmp", JSON.stringify(v, null, 2) + "\n"); renameSync(p + ".tmp", p); };
const stateDir = (root) => process.env.MW_STATE_DIR ?? join(root, "runtime", "state");

/** The user's Claude settings for the app (Settings, the default of every project): model, effort, mode, web, the Bypass experiment. */
export function agentSettings(root = APP_ROOT) {
  // web on by default, so Claude can research; a project that stored "ask" keeps it
  // high by default: only the Motion Plan runs at medium, by its own step
  const s = { model: "opus", effort: "high", mode: "auto", web: "on", allowBypass: false, ...readJson(join(stateDir(root), "agent.json"), {}) };
  if (!MODELS.some(([k]) => k === s.model)) s.model = "opus";             // "default" and older names: Opus 5.5
  if (s.mode === "bypassPermissions" && !s.allowBypass) s.mode = "auto";
  return s;
}
function checkSettings(patch, { allowBypass }) {
  if (patch.model != null && !MODELS.some(([k]) => k === patch.model)) throw invalid("Unknown model");
  if (patch.effort != null && !EFFORTS.includes(patch.effort)) throw invalid("Unknown effort level");
  if (patch.mode != null && !MODES.some(([k]) => k === patch.mode)) throw invalid("Unknown mode");
  if (patch.mode === "bypassPermissions" && !allowBypass) throw invalid("Bypass permissions is an experiment: turn it on in Settings first");
  if (patch.web != null && !WEB.includes(patch.web)) throw invalid("Web is ask, on or off");
}
export function saveAgentSettings(patch, root = APP_ROOT) {
  const cur = agentSettings(root);
  const allowBypass = typeof patch.allowBypass === "boolean" ? patch.allowBypass : cur.allowBypass;
  checkSettings(patch, { allowBypass });
  const next = { ...cur, ...Object.fromEntries(Object.entries(patch).filter(([k]) => ["model", "effort", "mode", "web", "allowBypass"].includes(k))) };
  if (next.mode === "bypassPermissions" && !next.allowBypass) next.mode = "auto";
  writeJson(join(stateDir(root), "agent.json"), next);
  return next;
}
/** A project's own choices over the global ones ("global" or null clears one). */
export function projectSettingsPatch(meta, patch, root = APP_ROOT) {
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => ["model", "effort", "mode", "web"].includes(k)));
  const set = Object.fromEntries(Object.entries(clean).filter(([, v]) => v != null && v !== "global"));
  checkSettings(set, agentSettings(root));
  const s = { ...(meta.settings ?? {}) };
  for (const [k, v] of Object.entries(clean)) { if (v == null || v === "global") delete s[k]; else s[k] = v; }
  return s;
}
/** What a task of this project runs with: the global settings, the project's own on top (a project's bypass needs the experiment on). */
export function effectiveSettings(meta, root = APP_ROOT) {
  const g = agentSettings(root), p = meta?.settings ?? {};
  const s = { model: g.model, effort: g.effort, mode: g.mode, web: g.web };
  for (const k of ["model", "effort", "mode", "web"]) if (p[k] != null && p[k] !== "global") s[k] = p[k];
  if (!MODELS.some(([k]) => k === s.model)) s.model = "opus";
  if (s.mode === "bypassPermissions" && !g.allowBypass) s.mode = "auto";
  return s;
}
/** The effort a step runs at: a step that sets its own in the pipeline config runs at it (only the Motion Plan,
 *  "medium": it mostly reads the library); every other step and the chat run at the project's effort, never below "high" (storyboard and
 *  build are heavy tasks that need care). { effort, rule: "step" | "min" | null } (rule: why it is not the project's). */
export const MIN_EFFORT = "high";
export function stepEffort(effort, stepDef = null) {
  if (stepDef?.effort && EFFORTS.includes(stepDef.effort)) return { effort: stepDef.effort, rule: stepDef.effort === effort ? null : "step" };
  if (EFFORTS.indexOf(effort) < EFFORTS.indexOf(MIN_EFFORT)) return { effort: MIN_EFFORT, rule: "min" };
  return { effort, rule: null };
}

/** The Claude Code arguments for a task (exported for the tests): tools, mode, web, the app's MCP permission tool when there is one. */
export function claudeArgs({ settings, systemPrompt, sessionArgs, mcpConfig = null, appTools = [], guard = null }) {
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
  if (guard) extra.hooks = { PreToolUse: [{ matcher: "Write|Edit|MultiEdit|NotebookEdit", hooks: [{ type: "command", command: guard, timeout: 30 }] }] };
  if (Object.keys(extra).length) args.push("--settings", JSON.stringify(extra));
  if (mcpConfig) args.push("--mcp-config", mcpConfig);
  args.push("--append-system-prompt", systemPrompt, ...sessionArgs);
  const model = MODELS.find(([k]) => k === settings.model)?.[2];
  if (model) args.push("--model", model);
  if (settings.effort) args.push("--effort", settings.effort);
  return args;
}

/** The app's own tools on the MCP channel: the app does what Claude cannot (take stills, run HyperFrames' check,
 *  search the whole Motion Library) and answers in text with the paths of the pictures it made. Handlers live in the server. */
export const APP_TOOLS = {
  board_stills: { description: "Takes one still per frame of the storyboard options you wrote (boards/A, B…) at the film's size, runs HyperFrames' check on each board (layout, contrast, script errors), keeps them as a new draft (the owner never sees drafts: never name one in your reply), and returns each option's check result and its sheets (3 × 3 frames each). Call it once after writing the boards and read the sheets once; after fixing a real problem, call it again with option and frames (only the frames you changed).",
    inputSchema: { type: "object", properties: { option: { type: "string", description: "Only with frames: the option you fixed, e.g. \"B\"" },
      frames: { type: "array", items: { type: "number" }, description: "Only the frame numbers you changed, e.g. [2, 4]; leave out for every frame of every option" } } } },
  qc_sheets: { description: "One QC round: takes stills of the film and returns the paths of the beats, cuts and phone sheets, with every finding of HyperFrames' check (layout, contrast, motion, lint, script errors). The first round of a task adds a fresh-eyes look. Call it once per review round.",
    inputSchema: { type: "object", properties: {} } },
  library_search: { description: "Searches the whole Motion Library (HyperFrames registry blocks and components, the studio's motions, Magic UI, Codrops, TakayuStudio, HyperFrames looks) for what a shot needs, in plain words. Returns 5-10 items: the id to cite in MOTION-PLAN.json (the app copies that item's code into the project), its name and what it is. Call it once per shot, before writing any new move for that shot.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "What the shot needs, e.g. \"headline letters slam in one by one\"" },
      kind: { type: "string", enum: ["motion", "block", "look", "vocab", "any"], description: "motion (how things move), block (a whole layout), look (a Brand Kit), vocab (a move's name and the author's numbers for it, from the motion vocabulary file: words and numbers to write from, never code to copy); default any (never vocab)" },
      limit: { type: "number", description: "5-10, default 8" } }, required: ["query"] } },
  character_sheet: { description: "Draws the model sheets of the project's characters (CHARACTERS.json: the five views, the moves and hats; all 31 emotions) through HyperFrames and returns their paths, or says what is wrong with a definition. Call it once after writing CHARACTERS.json; after fixing a real problem, call it again once (ids: only those characters).",
    inputSchema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, description: "Only these characters, e.g. [\"bao\"]; leave out for all" } } } },
  character_gate: { description: "Runs each character's OWN gate. A Brush cartoon character (a definition for the app's character layer): the Brush gate (the schema, never Clawd, colours that separate and read on a light and a dark ground, the face on the body, legs under it reaching the ground, arms at its sides, the key views, its sheets drawn and not blank). An anidoodle character (CHARACTERS.json \"check\", a module under anidoodle/ exporting run()): for a person on the human engine the author's checks (canon, every library pose inside the joint limits and balanced, hands, identity per view, palette roles for the film's hand, planted feet); for an animal or a thing on its own rig, the rules its module checks (never the human ones). Returns PASS / FAIL per check and character, and why a gate could not run. Run it after making or changing a character; Build starts only when every gate passes.",
    inputSchema: { type: "object", properties: { ids: { type: "array", items: { type: "string" }, description: "Only these characters, e.g. [\"mira\"]; leave out for the whole cast" } } } },
  voice_check: { description: "Measures the film's mix under its voice-over: lists every spoken word (from the reviewed transcript) where the sound effects or the music come within 3 dB of the voice, with its second. A warning to fix (move the effect into the pause after its word, lower it, or lower or stop the music), never a block. Call it after the sound is placed and after a sound fix.",
    inputSchema: { type: "object", properties: {} } },
  music_stop: { description: "Stops the film's music track at a second of the film, or plays it to its end again (with its fade out) with at: null. The music plays to the film's end by default: stop it only in a What If film (at the turn) or when the owner or the brief asks for it. Only when the film has music on the timeline; the owner can change it in the Final Mix.",
    inputSchema: { type: "object", properties: { at: { type: ["number", "null"], description: "The second of the film where the music stops; null to let it play to its end" } }, required: ["at"] } },
  font_check: { description: "Checks fonts before you name them anywhere (BRIEF.md, ASSETS.md, design.md, frame.md, a board, the film): for each family, whether the app can serve it in this project (bundled, on Google Fonts, or a font file in assets/) and whether it draws Vietnamese letters, with Vietnamese fonts the app bundles to choose from. Call it in Prepare and whenever you choose a font (Test 10 #435).",
    inputSchema: { type: "object", properties: { families: { type: "array", items: { type: "string" }, maxItems: 12 } }, required: ["families"] } },
  voice_off: { description: "Takes the voice-over off the film's timeline when the owner chose not to use it (Test 10 #434): its audio element is removed from index.html, the Editor no longer shows it or its words, the file stays in the project's assets. Never only mute the voice instead.",
    inputSchema: { type: "object", properties: {} } },
  whatif_plan: { description: "A What If film's shot list on the voice (the author's plan.py, in the app): resolves whatif/episode.json's edit cues (a word, word#2, +N frames, s:4.2, f:126; reverse, from, to, look) and fx against the voice-over's word times (whatif/words.json, written by the app from the checked transcript; none in a film with no narration), writes whatif/timeline.json (the timeline the engine reads) and whatif/shotlist.md, and returns the pace report (cuts a minute, the first 10 s, the longest hold) with what to fix. Call it after writing or changing shots, edit or fx.",
    inputSchema: { type: "object", properties: {} } },
  pose_check: { description: "Draws EVERY frame of the project's anidoodle film (anidoodle/page.ts) without a browser and lists each pose outside its joint limits, each error the film throws or logs (console.error is a script error for HyperFrames and stops the render) and each rig point that is not a number, with the times. Call it after the Build and after fixing a pose; the Review's qc_sheets includes it.",
    inputSchema: { type: "object", properties: {} } },
  film_language: { description: "Sets the film's language (the voice-over and the words on screen): vi or en. Call it only with the owner's answer when the brief did not say it and you asked (the app says when). Returns the language set.",
    inputSchema: { type: "object", properties: { language: { type: "string", enum: ["vi", "en"] } }, required: ["language"] } },
  project_format: { description: "Changes the film's output (aspect ratio, frame rate, length) after New project. Call it only when the owner, asked about a conflict between the New project fields and the brief or the voice-over's length, chose what the brief or the voice says. Returns the new output.",
    inputSchema: { type: "object", properties: { aspect: { type: "string", enum: ["16:9", "9:16", "1:1", "4:5"] }, fps: { type: "number", description: "24, 30 or 60 (the film style may allow fewer)" },
      durationSec: { type: "number", description: "The length in seconds" } } } },
  psd_layers: { description: "Exports one frame of a Photoshop file (an artboard or a group, as named in the scan's PSD.md) as its visible layers, back to front, each a PNG at the film's width, with layout.json (position, size, opacity, blend mode, and the text, font, size and colour of text layers), into assets/psd/<frame>/. Use it to rebuild the owner's design (keep design, re-layout); a text layer is rebuilt as live text, not as its picture.",
    inputSchema: { type: "object", properties: { file: { type: "string", description: "The PSD / PSB path in the project, e.g. sources/key.psb" }, frame: { type: "string", description: "The artboard or group name (\"document\" for the whole file)" },
      width: { type: "number", description: "Pixels across the frame (default the film's width)" } }, required: ["file", "frame"] } },
  music_options: { description: "Hands the owner up to three music tracks you found on mixkit.co for the Final Mix: the app downloads them into the project for the owner to listen to (its answer says what the film's music will be). Give each track's title, artist, its page on mixkit.co and the direct https://assets.mixkit.co/… .mp3 link (the track page's preview link).",
    inputSchema: { type: "object", properties: { tracks: { type: "array", maxItems: 3, items: { type: "object", properties: { title: { type: "string" }, artist: { type: "string" }, page: { type: "string" }, url: { type: "string" } }, required: ["title", "url"] } } }, required: ["tracks"] } },
  hf_script: { description: "Runs one of the HyperFrames scripts the app allows (carve: the voiceover carve on the music bed; locate: find a point in an image, its `auto` mode goes online) or an allowed hyperframes CLI command (capture, beats, audio, normalize-audio, timeline, compositions, info, lint, validate, inspect, keyframes, media-treatment, add, catalog), as HyperFrames ships it, in the project folder. Other skill scripts are not run: the app makes the voice-over, the music and the sound mix itself. capture, add, catalog and locate auto follow the project's web setting. Returns its output.",
    inputSchema: { type: "object", properties: { script: { type: "string", description: "The script name (\"carve\") or \"hyperframes <command>\"" },
      args: { type: "array", items: { type: "string" }, description: "Its arguments, paths relative to the project folder" } }, required: ["script"] } },
  copy_to_assets: { description: "Copies a file that is already in the project (a picture from the app's scan in .moworks/scan, a page or clip captured in capture/, a reference file) into assets/, where the film may use it. You cannot copy pictures or video yourself: use this. Without a folder the app sorts it (assets/1_design/images, 2_footage, 3_audio…). Returns the new path.",
    inputSchema: { type: "object", properties: { from: { type: "string", description: "The file's path in the project, e.g. .moworks/scan/deck-pptx/media/image3.png" },
      folder: { type: "string", description: "Optional folder under assets/, e.g. assets/1_design/images/pptx" }, name: { type: "string", description: "Optional new file name" } }, required: ["from"] } },
};
/** Fonts are the app's job: Claude names them, the app embeds them (finalize, and before board stills). */
const FONTS_LINE = "Fonts: write the families you want in the CSS (any Google Fonts family, e.g. Be Vietnam Pro, or one the app bundles, e.g. Inter or Roboto Flex); the app downloads and embeds them (files under assets/_app/fonts, @font-face) after your task and before it takes board stills; the owner's own font files are in assets/1_design/fonts. Never ask the owner for the font files of a Google Fonts family; ask only for a commercial font the brand names. Before you name a font anywhere (BRIEF.md, ASSETS.md, design.md, a board, the film), call the app's font_check with it (Test 10 #435). A font that fails (no Vietnamese letters, or the app cannot get it): when the owner's material asks for it (the brief, a guideline, their pictures or captions), that is a conflict: stop and ask (moworks-studio §2b) with 2-3 Vietnamese fonts the app can use, the nearest first; your own choice: choose one that passes.";
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
/** three.js is the app's job too: pinned in config/pins.json, copied and mapped by finalize R-THREE; the film may not go online. */
const THREE_LINE = "three.js (for a real 3D scene, when the brief or the design needs one; DOM / CSS / GSAP stays the default because it reaches After Effects as layers, a WebGL canvas only as a picture: say so to the owner at the storyboard): r184 is on this computer and the app copies it into the film and writes the import map after your task and before board stills. Import `three` and its addons by bare name, `import * as THREE from \"three\"` and `\"three/addons/<folder>/<File>.js\"`, never a CDN URL, even when a HyperFrames skill or lint hint shows one (the film is offline). Addons there: postprocessing EffectComposer, RenderPass, ShaderPass, MaskPass, UnrealBloomPass, OutputPass, FilmPass, BokehPass; shaders RGBShiftShader, VignetteShader, FilmShader, CopyShader, LuminosityHighPassShader, OutputShader, BokehShader; geometries RoundedBoxGeometry, TextGeometry; loaders GLTFLoader, FontLoader; environments RoomEnvironment; utils BufferGeometryUtils, SkeletonUtils. Ask the owner before any other addon. Follow HyperFrames' references/runtimes.md (Three.js, WebGPU, p5, canvas): draw every frame from HyperFrames time (the hf-seek event / window.__hfThreeTime, or one paused GSAP timeline), never requestAnimationFrame, Date.now() or a clock; anything that falls or flies is computed from t, every random value seeded, film grain seeded from t; data-duration on the root; renderer.setPixelRatio(1) at the film's size; set window.THREE = THREE when a loader fetches files; register window.__hf.buildReady for fonts, canvas textures and shader warm-up.";
/** The project's folders (packages/project-service/layout.mjs). */
const FOLDERS_LINE = "assets/ folders: 1_design/ (the owner's design files: PSD, PPTX, PDF, guidelines; the film does not play them) with 1_design/images/ (every picture and logo) and 1_design/fonts/; 2_footage/ (video; a numbered picture sequence in 2_footage/<name>/); 3_audio/voiceover/, 3_audio/sfx/, 3_audio/music/; _app/ holds the app's own copies (GSAP, three.js, runtime, embedded fonts): link to them, never edit them. Put a new file in its folder; a file anywhere else is moved there after your task.";
// named in full: the steps and rules write the short name ("call library_search"), and Claude called it bare, "No such tool available",
// up to 8 times a Motion Plan (QC hf214 films)
const toolsLine = (names) => names.length ? `The app's tools (MCP server mw), use them instead of asking the owner for pictures. Call each by its full name, mcp__mw__<name>: the steps and rules write only the short name ("call library_search" means mcp__mw__library_search). ${names.map((n) => `mcp__mw__${n} (${APP_TOOLS[n].description.split(". ")[0].toLowerCase()})`).join("; ")}.` : "";

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

const hashDir = (d) => {
  const h = createHash("sha256");
  const walk = (x) => { for (const n of readdirSync(x).sort()) { const p = join(x, n); if (statSync(p).isDirectory()) walk(p); else h.update(relative(d, p)).update(readFileSync(p)); } };
  walk(d); return h.digest("hex");
};

/** Copy the project style's rule files into .moworks/rules/ (inside the folder Claude may read). Returns the SKILL.md paths to read:
 *  files (the style's rules), first (of those, the ones read before anything else, when the style names them) and qc (the Moworks QC
 *  review every style carries, read only in the QC step). A film with no style, or a style id the catalog does not have, has no
 *  rules: an earlier copy is removed, so nothing stale is named or read. */
export function prepareRules(dir, styleId, root = APP_ROOT) {
  const style = styleId ? getStyle(styleId, root) : null;
  const base = join(dir, ".moworks", "rules");
  if (!style) { rmSync(base, { recursive: true, force: true }); return { style: null, files: [], first: [], qc: [] }; }
  const want = style.rules.map((r) => ({ name: r.name, from: dirname(r.path), hash: r.hash, kind: r.kind, role: r.role ?? null, slug: r.slug ?? null }));
  const index = readJson(join(base, "index.json"), { styleId: null, rules: [] });
  const same = index.styleId === style.id && index.rules.length === want.length
    && want.every((w) => index.rules.some((x) => x.name === w.name && x.hash === w.hash) && existsSync(join(base, w.name, "SKILL.md")));
  if (!same) {
    rmSync(base, { recursive: true, force: true });
    for (const w of want) {
      // a Lemo-Opuscar style: its STYLE.md only, as SKILL.md under a credit header (its folder also holds the demo, staged at the build)
      // (an mg-styles-15 style: its prompt the same way; an anidoodle medium: its reference)
      // (the Brush cartoon style: the character kit's ANIMATION_GUIDE.md, under a "never Clawd" header)
      // (the What If animation style: the author's SKILL.md under a credit header, its references/ beside it; never its studio or scripts)
      const own = { "lemo-style": lemoRuleText, "mg-style": mgRuleText, "anidoodle-style": anidoodleRuleText, "brush-style": (_slug, r) => brushRuleText(r),
        "what-if-style": () => whatIfRuleText(w.from, root) }[w.kind];
      if (own) {
        mkdirSync(join(base, w.name), { recursive: true });
        writeFileSync(join(base, w.name, "SKILL.md"), own(w.slug, root) ?? "");
        if (w.kind === "what-if-style" && existsSync(join(w.from, "references"))) cpSync(join(w.from, "references"), join(base, w.name, "references"), { recursive: true });
      }
      else cpSync(w.from, join(base, w.name), { recursive: true, filter: (s) => !/desktop\.ini$/i.test(s) });
    }
    writeJson(join(base, "index.json"), { styleId: style.id, rules: want.map(({ name, hash, kind, role }) => ({ name, hash, kind, ...(role ? { role } : {}), copiedHash: hashDir(join(base, name)) })), at: new Date().toISOString() });
  }
  const path = (w) => `.moworks/rules/${w.name}/SKILL.md`;
  const main = want.filter((w) => w.role !== "qc" && w.role !== "kind" && w.role !== "vocab");          // a film kind's rule is read only when the kind is chosen (reads.mjs)
  return { style, files: main.map(path), first: main.filter((w) => style.readFirst?.includes(w.name)).map(path), qc: want.filter((w) => w.role === "qc").map(path) };
}

/** The What If animation skill as Claude reads it in a project: the author's SKILL.md as shipped, under a header that says how the app
 *  runs its steps (the what-if-style pack: no Remotion, no Python, no ElevenLabs). */
export function whatIfRuleText(dir, root = APP_ROOT) {
  const src = whatIfSource(root), text = (() => { try { return readFileSync(join(dir, "SKILL.md"), "utf8"); } catch { return ""; } })();
  return `<!-- What If animation by FreshStack (kelano86), MIT, ${src ? `https://github.com/${src.repo}/tree/${src.commit}` : "pinned copy"}, as shipped.
In Moworks Studio its steps run as .moworks/rules/what-if-style/SKILL.md says: no Remotion, no Python scripts, no ElevenLabs; its
references/ are beside this file; its engine is staged in .moworks/library/what-if/. -->

${text}`;
}

/** How Claude uses what the user imported (General style), in the words Claude reads. */
const INPUT_MODE = {
  auto: "Choose yourself how to use the imported files and say which way you took.",
  keep: "Keep the design the owner gave (their frames, PSD or slides): animate it as it is; do not change the layout.",
  relayout: "Re-lay out the design the owner gave to fit this format and brief; keep its look and content.",
  free: "Design freely; the imported files are material (logos, pictures, text), not a layout to follow.",
  reference: "Follow the reference video or pictures for look and pacing; make it this brief's own film.",
  remake: "Remake the reference 1:1, as close as the tools allow (the owner accepted that this costs more time).",
};
const kb = (n) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
function inputsBlock(dir) {
  const inv = inventory(dir);
  if (!inv.total) return "Imported files: none yet.";
  const parts = Object.entries(inv.assets).map(([k, xs]) => `assets/${k}/: ${xs.slice(0, 12).map((x) => x.path.split("/").pop()).join(", ")}${xs.length > 12 ? ` (+${xs.length - 12})` : ""}`);
  if (inv.sources.length) parts.push(`sources/ (reference files the film does not play; read images, PDF and text; PSD, PSB, AI and PPTX are read through the app's scan, never ask for an export): ${inv.sources.slice(0, 12).map((x) => `${x.path.split("/").pop()} (${kb(x.size)})`).join(", ")}`);
  const scan = existsSync(join(dir, ".moworks", "scan", "INDEX.md")) ? " The app scanned them for you (video contact sheets, lengths, sizes): .moworks/scan/INDEX.md." : "";
  return `Imported files (copied into this project): ${parts.join("; ")}.${scan}`;
}

/** One line of what a rule file is for: its frontmatter's description, cut at the first sentence (the names and purposes are
 *  given, the files are opened when a step needs them). */
export function rulePurpose(dir, rel) {
  try {
    const head = readFileSync(join(dir, ...rel.split("/")), "utf8").slice(0, 3000);
    const d = /^description:\s*(.+)$/m.exec(head)?.[1]?.replace(/^["']|["']$/g, "").trim() ?? "";
    const one = d.split(/(?<=[a-z0-9)])\.\s|\s-\s/i)[0].trim();
    return one.length > 160 ? `${one.slice(0, 157)}…` : one;
  } catch { return ""; }
}

/** Which rule files Claude reads when (after HF's own loading: an entry SKILL.md, mandatory reads per stage, the rest on demand):
 *  the files this step requires (reads.mjs; checked before the first edit), read in the first turn; every other rule file listed with its
 *  purpose and opened only when the work needs it, through each SKILL.md's own routing; the QC review only in its step. */
function rulesLine(rules, first = [], qc = [], dir = null, required = []) {
  const must = required.length ? required : first;
  const rest = rules.filter((r) => !must.includes(r));
  const named = (xs) => xs.map((r) => { const p = dir ? rulePurpose(dir, r) : ""; return p ? `${r} (${p})` : r; }).join("; ");
  return [
    must.length ? `Required for this task, read them all in your first turn, in one batch (the app checks them before your first edit; do not replace them with recollection): ${must.join(", ")}. Every other rule file, opened only when the work needs it (follow each SKILL.md's own "read X when Y" routing): ${named(rest)}.`
      : rules.length ? `The style's rule files, each with what it is for; open only what the current step needs, and the files they link only when you need them: ${named(rules)}.` : "",
    qc.length ? `The Moworks QC rules (${qc.join(", ")}) are read only in the pipeline's Review step or when the owner asks you to review the film; it never changes how this style designs or builds.` : "",
  ].filter(Boolean).join("\n");
}

/** The text files at the project root a step reads or writes (each step is a fresh conversation: these carry the work across). */
const STEP_FILES = /^(BRIEF|STORY|SCRIPT|NOTES|ASSETS|STORYBOARD|STYLE-GUIDE|SHOTS|QC-REVIEW|CHARACTERS|DESIGN)\.md$|^(frame|design)\.md$|^(MOTION-PLAN|QC-REVIEW)\.json$/;
function projectFiles(dir) {
  try { return readdirSync(dir).filter((n) => STEP_FILES.test(n)).sort(); } catch { return []; }
}
/** What Claude may do, in words, for the task's mode and the project's web setting. */
function powersLine(settings) {
  if (settings.mode === "bypassPermissions") return "What you can do: this project runs in the owner's Bypass experiment: you may run commands, but keep every change inside this project folder.";
  const web = settings.web === "off" ? "You cannot use the web in this project."
    : `You may use WebFetch and WebSearch when the work needs it (research for the content, the client's website, a pull request)${settings.web === "ask" ? "; the owner is asked first and may say no: then go on without it (mixkit.co for the music is allowed without asking: fetch its pages, or search with site:mixkit.co)" : ""}.`;
  // the web is for Claude's research; the film itself renders offline (G-REMOTE), which is a rule of the film, not of Claude
  const offline = "The film itself renders offline: everything a composition loads (scripts, libraries, fonts, pictures, sound) must be a file inside the project, never a CDN or web URL. When this matters, say it that way (\"phim phải mang thư viện của nó bên trong project\"), never that you cannot use the web.";
  return `What you can do: read and edit files in this folder only. You cannot run commands or install anything. ${web} ${offline}`;
}

/** The Brand Kit's fonts as the app can serve them: [{ family, available, vi }] from the project's frame.md;
 *  available: bundled, on Google Fonts or a font file in the project's assets; vi: true | false | null (not known). null without one. */
export async function brandKitFonts(dir, { google } = {}) {
  let text = ""; try { text = readFileSync(join(dir, "frame.md"), "utf8"); } catch { return null; }
  const fams = frameFonts(text);
  if (!fams.length) return null;
  return checkFonts(dir, fams, { google });
}
/** Any fonts as the app can serve them in this project (Prepare once chose a font the film could not draw in Vietnamese, and
 *  only the checks an hour later said so): { families: [{ family, available, vi }] }, as brandKitFonts. */
export async function checkFonts(dir, fams, { google } = {}) {
  const files = [];
  const walk = (x, depth) => { if (depth > 4) return; for (const n of (() => { try { return readdirSync(x); } catch { return []; } })()) {
    const p = join(x, n); if (/\.(ttf|otf|woff2?)$/i.test(n)) files.push(n.toLowerCase().replace(/[^a-z0-9]/g, "")); else if (!/\./.test(n)) walk(p, depth + 1); } };
  walk(join(dir, "assets"), 0);
  const vc = await vietnameseCheck(fams, google ? { google } : {});
  return { families: vc.families.map((f) => {
    const own = files.some((n) => n.includes(f.family.toLowerCase().replace(/[^a-z0-9]/g, "")));
    // a family of the pinned list that was downloaded before: its letters were checked then (Google's "vietnamese" subset is not all of them)
    const v = viVerified(f.family), lacks = v?.missing ? v.missing : null;
    return { family: f.family, available: f.via !== "not on Google Fonts" || own, vi: lacks ? false : f.vi ?? null, ...(lacks ? { missing: lacks } : {}) };
  }) };
}

/** The film's design. New project's Brand Kit field is "From brief" unless the user chose one there. A chosen Brand Kit wins for its
 *  parts (colours, type, layout) and the brief's design words for them are left aside (a brief that asks otherwise is a conflict: Claude
 *  stops and asks); the rest follows what the brief describes, or is Claude's to design when the brief says nothing. The chosen Brand Kit
 *  is written by the app into frame.md. */
export function designLines(meta, dir, brandFonts = null) {
  const has = (f) => !!dir && existsSync(join(dir, f));
  if (meta.designLocked) return ["Design: the style's author's own (its rules set the colours, type and layout); no Brand Kit is chosen for it. Brand colours, fonts or a look the brief or the chat asks for that differ from the author's are a conflict: stop, list each point with its choices and wait for the owner (moworks-studio §2b), then follow what they chose; apply a Brand Kit only when the owner asks, saying first what it changes."];
  const look = meta.look?.id ? meta.look : null;
  const hint = "HyperFrames' frame presets are there as hints, as its references/look.md says (\"Presets\")";
  if (!look) return [`Design: from the brief (no Brand Kit chosen): follow the design the brief describes (colours, type, look and feel, motion); what it leaves open is yours to design (${hint}). A brand guideline in the assets is followed (suggest the owner save it as a Brand Kit in the app).`];
  const lines = [];
  lines.push(look.frame && has("frame.md")
    ? `Brand Kit chosen by the owner: ${look.title}: the film's colours, type and layout. The app wrote it to frame.md (HyperFrames' design spec): read it and design to it; never write or change frame.md. A brand guideline in the assets that differs from it is a conflict: stop and ask (moworks-studio §2b).`
    : `Brand Kit chosen by the owner: ${look.title} (HyperFrames look ${look.id}; its files are in .moworks/library/looks/): the film's colours, type and layout. A brand guideline in the assets that differs from it is a conflict: stop and ask (moworks-studio §2b).`);
  // a Brand Kit value is never changed silently: a font with no Vietnamese letters, a font the app lacks or a colour asked to change is a
  // stop, because a brand guideline matters and Claude asks before changing it
  lines.push(`A Brand Kit value (a font, a colour) is never changed by you: a Brand Kit font that cannot draw the Vietnamese letters the film writes or that the app does not have, and a Brand Kit colour the brief, a guideline or the chat asks to change, are conflicts: stop and ask (moworks-studio §2b). For a font, offer 2-3 fonts that draw Vietnamese and the app can use, the nearest first, each with a short reason (bundled with the app: ${Object.keys(fontMap()).join(", ")}; or a Google Fonts family with Vietnamese), plus "upload the font file" when the app does not have it, plus "keep it and accept the missing accents" only when the font exists.`);
  const bad = (brandFonts?.families ?? []).filter((f) => !f.available || f.vi === false);
  if (bad.length) lines.push(`The app checked the Brand Kit's fonts: ${bad.map((f) => `${f.family}: ${!f.available ? "the app does not have it (no file in the project, not on Google Fonts)" : "it has no Vietnamese letters"}`).join("; ")}. Stop in Prepare with those choices before the storyboard. Nearest that draw Vietnamese, from the app's list of Google Fonts (each downloads when the film uses it): ${bad.map((f) => `for ${f.family}: ${viSuggest(f.family).map((x) => x.line).join("; ")}`).join(" | ")}.`);
  // the motion, which the Brand Kit does not set, follows the brief
  lines.push(`What the owner chose wins for its parts: leave the brief's design words for those parts aside (a brief that asks otherwise for one of them is a conflict: stop and ask, moworks-studio §2b). The rest (motion) comes from the brief: follow what it describes; what it leaves open is yours to design (${hint}).`);
  return lines;
}

/** Pictures in the scene and actors: what Prepare checks in the brief, and what this style can do
 *  with an actor: its own character engine (Brush; anidoodle: people in its human-hand media, animals and things in all of them), a
 *  character drawn again in the film's design (with a word that it is redrawn), or, in Evidence Films and Edit & Documentary, none. */
export const NO_REDRAW = ["Evidence Films", "Edit & Documentary"];
export function actorsLine(meta) {
  const id = String(meta?.style?.id ?? "");
  if (!id) return "";
  let s = null; try { s = getStyle(id); } catch { /* the style's words only */ }
  const engine = id === "brush-cartoon" || !!anidoodleId(id) || !!s?.characters;
  const how = engine
    ? "this style has its own character engine. When the brief has actors and none of them is in this film yet (CHARACTERS.json, the characters the owner picked in New project), ask one question with three choices and stop: 1) pick them from the owner's library (the Characters page), 2) you make them with the Character creator, 3) go on without them (they appear as pictures in the scene). A character from the library used in its own author's style is never redrawn and never asked about again (#406). A new character is shown for approval only once its checks pass, and is approved once. When the owner chose that you make them, end Prepare by writing CHARACTERS.json with one entry per new actor ({ \"id\", \"name\", \"about\", \"kind\": \"human\" | \"animal\" | \"thing\" }, plus the owner's library picks already in it): the app's Character step then makes them and the owner approves them once, before the Storyboard. Never make a character in the Storyboard or the Build (Test 11 #447)."
      // the anidoodle-human value names anidoodle's engine for every actor; an animal's gate is its own rig
      + (anidoodleId(id) ? " The Character step completes each entry. A person: no rig, its check \"check-<id>.ts\". An animal or a thing on anidoodle's engine: { id, name, about, engine: \"anidoodle-human\" (the app's name for anidoodle's engine, people and animals alike), kind: \"animal\" or \"thing\", rig: \"<id>\", import: \"./characters/<id>\", check: \"characters/<id>/check.ts\", hand }; its gate checks its own rig (bone lengths, its own joint ranges, planted feet), never the human limits." : "")
    : NO_REDRAW.includes(s?.category)
      ? `this style's category (${s.category}) never redraws a character: an actor appears only from a real picture or footage the owner gave, else as a picture in the scene; say so in one line.`
      : "this style has no character engine: an actor is drawn again in the film's own design (from the owner's saved character when there is one), and your reply says once that it is redrawn in this style, not the original.";
  return `Pictures and actors (Prepare): sort the brief's people, animals and things into two kinds. Pictures in the scene (an object, a crowd, a figure that does not act) never stop the film: draw them in the style. Actors (a character who acts, speaks or is followed through the film): ${how} Never drop a character silently: when one cannot be an actor, say in one line in ASSETS.md and in your reply how it appears instead.`;
}

/** A What If film's narration as the app has it: a voice-over in the project, and whether a voice service can read the script. */
export function narrationLine(meta, root = APP_ROOT) {
  let keys = []; try { keys = Object.entries(secretsStatus(root)).filter(([, v]) => v.saved).map(([k]) => ({ elevenlabs: "ElevenLabs", fishaudio: "Fish Audio" })[k] ?? k); } catch { /* none */ }
  return `Narration (the app says): ${meta.voice?.file ? "a voice-over is in the project" : "no voice-over in the project yet"}; ${keys.length ? `a voice service can read the script (${keys.join(", ")})` : "no voice service key is set"}.`;
}

/** The characters already in the film: the user's saved ones come with their sheets; Claude uses them and never asks. */
function castLine(dir) {
  // saved characters given to a film without a character layer, as a reference to draw in the film's own design
  const refDir = dir ? join(dir, "assets", "_app", "characters") : null;
  const refs = refDir && existsSync(refDir) ? readdirSync(refDir).filter((n) => existsSync(join(refDir, n, "CHARACTER.md"))) : [];
  const refLine = refs.length ? `The owner's saved characters for this film, as a reference: ${refs.map((n) => `assets/_app/characters/${n}/ (CHARACTER.md, poster and sheets)`).join("; ")}. Read each CHARACTER.md and look at its pictures, then draw the character in this film's own design (its Brand Kit, type, colours and motion), keeping its silhouette, distinguishing features and key colours. They are already here: never ask the owner to add them from the library.` : "";
  if (!dir || !existsSync(join(dir, "CHARACTERS.json"))) return refLine;
  let list = []; try { list = readCast(dir).characters ?? []; } catch { return ""; }
  if (!list.length) return "";
  const from = list.filter((c) => c.from?.library);
  return `Characters already in this film (CHARACTERS.json): ${list.map((c) => `${c.name ?? c.id}${c.from?.library ? " (from the owner's library)" : ""}`).join(", ")}.`
    + (from.length ? " Use the ones from the owner's library as they are (their definitions and sheets stand): never ask whether to add, redraw or replace them; design only the characters the brief adds." : "")
    // the author's rigged characters (Bit, the cheetah) come with their own rig, not the human engine
    + (list.some((c) => c.rig && c.made === "as shipped") ? ` anidoodle's own rigged characters, as shipped: ${list.filter((c) => c.rig && c.made === "as shipped").map((c) => `${c.name ?? c.id} (rig ${c.rig}, import from ${c.import})`).join(", ")}. Pose them only through their own rig, never by hand; the cheetah's marks are this film's medium (her own painted look only when the owner asks), Bit keeps his own; a model sheet is anidoodle/films/sheet-<id>.ts with the rig's key poses (the anidoodle pack, §3e).` : "")
    // an animal or a thing made for the film is on a rig of its own and checked by its own gate, never as a person
    + (list.some((c) => c.rig && c.made !== "as shipped") ? ` Characters on a rig of their own, made for this film (not people): ${list.filter((c) => c.rig && c.made !== "as shipped").map((c) => `${c.name ?? c.id} (import from ${c.import ?? `./characters/${c.id}`}${c.check ? `, its gate anidoodle/${String(c.check).replace(/^anidoodle\//, "")}` : ", NO GATE YET"})`).join(", ")}. Pose them only through their rig; their gate checks that rig's own rules (bone lengths, its own joint ranges, planted feet), never the human limits (the anidoodle pack, §3e3).` : "")
    + (list.some((c) => c.engine === "anidoodle-human" && !c.rig) ? ` Human characters on anidoodle's human engine: ${list.filter((c) => c.engine === "anidoodle-human" && !c.rig).map((c) => `${c.name ?? c.id} (import from ${c.import ?? c.module ?? `./characters/${c.id}`}${c.check ? `, its gate anidoodle/${c.check}` : ""}${c.needsPalette ? `; it has no palette for this film's hand${c.filmHand ? ` (${c.filmHand})` : ""}: add one in the film's copy, from its palette roles` : ""})`).join(", ")}. Pose them as the author's recipe says (references/workflows/character-consistency.md): toScene(pose, camera) with poses from the character's own library kept inside its joint limits, walks from footsteps (planWalk / walkAt), its palette for this film's hand; never redraw them by hand. Run the app's character_gate tool after changing a character: Build starts only when every gate passes.` : "");
}

/** The user's language: their last chat message, else the ones before, else their brief; Vietnamese letters → "vi", a
 *  sentence of English (3 words or more) → "en"; a short word with no accent ("ok", "B", "yes", "1") decides nothing (a reply
 *  of that kind once turned a Vietnamese chat to English), so the earlier messages and the brief do; none → "vi". */
export function ownerLanguage(texts) {
  for (const x of texts) {
    const t = String(x ?? "").trim();
    if (!t) continue;
    if (/[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i.test(t)) return "vi";
    if ((t.match(/[a-z]{2,}/gi) ?? []).length >= 3) return "en";
  }
  return "vi";
}

/** The film's length as Claude is told it (house rules §9): the content New project set, and the ending's fade after it or inside it. */
export function lengthLine(meta, dir = null) {
  const L = filmLength(meta, { dir });
  if (!L.content) return "? s";
  if (L.own) return `${L.content} s, the style author's own ending inside it (house rules §9: nothing added after it; the root's data-duration is ${L.total} s)`;
  if (L.inside) return `${L.content} s exactly, the ending's ${L.fade} s fade inside it (the brief asks for no more: MOTION-PLAN.json's ending.inside; the root's data-duration is ${L.total} s)`;
  return `${L.content} s of content, then the ending's ${L.fade} s fade after it (house rules §9): the whole film, the root's data-duration, the storyboard's frames and the plan's shots add up to ${L.total} s. Only a brief that asks for exactly or at most ${L.content} s puts the fade inside it (MOTION-PLAN.json's ending.inside: true)`;
}

export function systemPrompt({ meta, style, rules, first = [], qc = [], shots, dir, step = null, lang = "vi", motionSpec = true, settings = { mode: "auto", web: "off" }, tools = [], required = [], brandFonts = null }) {
  const f = meta.format ?? {};
  // the film's style as the catalog has it (prepareRules' style; looked up when not given): a style id the catalog does not have is
  // a film with no style, so its name is not printed and no author's design is claimed for it
  const known = style !== undefined ? style : (() => { try { return meta.style?.id ? getStyle(meta.style.id) : null; } catch { return null; } })();
  const styleTitle = known ? meta.style?.title : null;
  return [
    "You are the production brain of Moworks Studio, a local motion graphics studio app. The working folder is one HyperFrames project:",
    "index.html (root composition), compositions/*.html (one sub-composition per shot), STORYBOARD.md (HyperFrames storyboard format), assets/.",
    `Project: "${meta.title ?? ""}". Format ${f.width ?? "?"}x${f.height ?? "?"} (${f.aspect ?? "?"}), ${f.fps ?? 30} fps (the root composition's data-fps="${f.fps ?? 30}" says so: keep it; frame-based timings are counted at this rate), target length ${lengthLine(meta, dir)}.`,
    // the New project fields win over the brief, and Claude clarifies with the user when a field contradicts it
    "The New project fields win over the brief: this format, rate and length, and the Brand Kit below. When the brief says otherwise for one of them (e.g. 16:9 or 60 fps against 9:16 and 30 fps here, another length, another brand's colours against the chosen Brand Kit), that is a conflict (moworks-studio §2b, owner 26/10): in one message, one numbered point per conflict with its choices (keep the New project field / follow the brief / a mix where it fits, your suggestion first), with every other conflict and missing thing of the step, then stop without writing BRIEF.md. When the owner picks the brief for the format, rate or length, call the app's project_format tool with the new values, then go on; for a design part, follow what they chose and write it in ASSETS.md. No conflict: the fields, with no question.",
    // the frame first (Style, then the design chosen), then the brief that goes into it
    known ? `Style: ${meta.style.title} (${meta.style.source}).` : "No style chosen.",
    ...designLines(known || !meta.style ? meta : { ...meta, designLocked: undefined }, dir, brandFonts),
    castLine(dir),
    !step || ["brief", "character"].includes(step) ? actorsLine(meta) : "",
    meta.style?.id === "what-if" && (!step || step === "brief") ? narrationLine(meta) : "",
    !step || step === "brief" ? voiceLine(meta) : "",          // making the voice here comes first when a key is saved
    VOICE_SETTINGS_RULE,
    (!step || step === "brief") ? linksLine(meta) : "",
    step === "sound" ? musicLine(meta) : "",          // the style's own music palette and the story's arc
    !step || ["brief", "storyboard", "motionSpec"].includes(step) ? lyricsLine(dir) : "",          // lyrics are timed by the app, never placed by guess
    // a chat fix on a built film was once never looked at, and the user was told to render again though the app had
    // already bundled the change and made the film's render again
    !step && (meta.pipeline?.finished || meta.pipeline?.ran?.build) ? "A change you make to the built film in the chat: look at it before you reply. Call qc_sheets once (the app bundles the film as you left it first) and read the shots you changed; say what you saw, and fix what does not hold. After your turn the app makes the film ready to render again by itself (its preview and its checks): never tell the owner to render again or that the render is old; say the change is in the film and Render takes it." : "",
    canvasTextLine(meta, dir, step),          // a canvas film's plain text in HTML over it, its performed text as the author ships it
    meta.brief?.text ? `${meta.brief.mode === "script" ? "Brief (narration script)" : "Brief from the owner (one box: topic, idea, narration if any, notes, links, direction)"}: ${meta.brief.text.slice(0, 4000)}` : "No brief yet.",
    meta.brief?.direction ? `Direction from the owner: ${meta.brief.direction.slice(0, 2000)}` : "",
    // the film's kind (the brief's only kept answer): an anidoodle medium's own (config/anidoodle-pipeline.json) or one every style offers
    // (What If, config/film-kinds.json)
    (dir && ((k) => (k?.scope === "anidoodle" && !anidoodleId(meta.style?.id) ? "" : k?.says))(filmKind(dir))) || "",
    meta.way?.id ? `Way of working the owner chose at the Assets analysis: ${meta.way.id}. ${INPUT_MODE[meta.way.id] ?? ""}`
      : meta.inputMode ? `How to use the imported files: ${INPUT_MODE[meta.inputMode] ?? INPUT_MODE.auto}` : "",
    meta.music?.file ? `Music: ${meta.music.file} is on the timeline (<audio id="el-music" data-timeline-role="music">, from 0 s)${meta.music.beats ? `; its beats, measured by HyperFrames, are in ${meta.music.beats}` : ""}. Time the film to it; never add another music element.` : "",
    dir ? inputsBlock(dir) : "",
    // the user chose not to use the voice-over; it stays a file, off the timeline (the voice_off tool), never only muted
    meta.voice?.file && meta.voice.offTimeline ? `Voice-over: ${meta.voice.file} is off the timeline (the owner chose not to use it): the film has no narration; do not time the film to its words.`
    : meta.voice?.file ? `Voice-over: ${meta.voice.file} (${meta.voice.info?.duration ?? "?"} s, ${meta.voice.source === "upload" ? "uploaded" : `read by ${meta.voice.source}`}). When the owner chooses not to use it, call the app's voice_off tool (it takes it off the timeline and keeps the file); never only mute it. ${meta.voice.transcript?.status === "saved"
      ? "Its reviewed transcript is transcript.json (HyperFrames word timings: [{id, text, start, end}], film seconds): time shots, captions and kinetic text to it; never edit it." + (meta.voice.from ? "" : " It is on the timeline already (<audio id=\"el-voice\">, from 0 s): never add another voice element.")
      : "Its transcript is not reviewed yet: do not time the film to it until the owner saves it."}${meta.voice.transcript?.status === "saved" ? " With no SCRIPT.md, the transcript is the script." : ""}` : "",
    voiceFitText(meta),          // a voice longer than the set length is the user's choice, never a film stretched to it
    rulesLine(rules, first, qc, dir, required),
    // fewer turns: each turn re-reads the whole conversation
    "Work in few turns: each turn re-reads the whole conversation. Put independent reads in one turn (several Read calls at once) and independent edits in one turn; never read a file again that you already read in this task unless it changed; never Glob or Grep for a rule file whose path you were given.",
    "Each pipeline step runs in its own conversation, so what an earlier step decided lives only in the project's files: read NOTES.md and the",
    "files of the earlier steps before you start, and write every decision a later step needs into NOTES.md (one short dated line each) as you make it.",
    `Project files now: ${projectFiles(dir).join(", ") || "none yet"}. The pipeline, what is new and the request come in the message.`,
    `Shots now: ${shots.length ? shots.map((s) => `${s.number}. ${s.title} [${s.start ?? "?"}-${s.start != null && s.duration != null ? +(s.start + s.duration).toFixed(2) : "?"} s, ${s.src ?? "no file"}]`).join("; ") : "none"}.`,
    powersLine(settings),
    toolsLine(tools),
    FONTS_LINE,
    THREE_LINE,
    FOLDERS_LINE,
    // the tops of the letters showed at 0 s because the mask had padding and the rise was only yPercent 100
    "Text that rises out of a clipping mask: give the mask no padding, or start the rise beyond 100% plus that padding, so no part of a letter shows before its entrance.",
    "The app previews, renders, checks (HyperFrames lint, fonts, glyphs, remote URLs) and exports the film after your edits, and applies the studio's finalize rules.",
    // a logo written as PNG%20Logo.png read as a missing file
    "Write a file's path as its real name, letters and spaces as they are on disk (assets/1_design/images/PNG Logo.png), never URL-encoded (%20, %C3%A1).",
    // Build once read the Motion step's five compositions again (106K, two of them twice); a file read twice is paid twice
    "Read each file once in a task. To change part of a file you have read, Grep for that part and Edit it; never read the whole file again. A file you are about to rewrite whole needs no reading first.",
    "Never mention or run hyperframes CLI, npx, kit.py or film.json. Keep every edit inside the requested scope; do not change other shots.",
    "Files under .moworks/ are the app's: read .moworks/rules/ and .moworks/library/ but never edit anything under .moworks/ or .git/.",
    "When the request is a question or needs the user's choice (an approval gate, missing information), answer or ask in text and change no file.",
    motionSpec ? MOTION_PLAN_PROMPT : "",          // only styles whose pipeline has a motion spec
    "Sound effects (the app's sfx cues): to add one, write an `- sfx:` line on the shot's frame in STORYBOARD.md with short sound names, comma-separated",
    "(e.g. `- sfx: whoosh, pop`; `pop@0.8` = 0.8 s into the shot; `none` = silent). Do not write <audio> elements for sound effects and do not edit assets/3_audio/sfx/",
    "or CREDITS.md: after your turn the app finds each sound (free Freesound sounds, CC0 / CC BY, credited), places it at the shot's start at volume 0.35 and lists its credit.",
    // Answer in the language the user writes in, never from the UI's language or the app's own step messages (English).
    // The app decides the language (Claude once chose per step and mixed them): one language in every reply
    `Reply to the owner in ${lang === "en" ? "English" : "Vietnamese"} only (the language the owner writes in), every sentence of every reply; never mix languages in one reply. The app's own step messages are in English and do not change it.`,
    "This is for your chat replies only: file names, code and comments stay in English, and the film's on-screen text and voice follow the film's language (below).",
    // the film's language from the brief, or asked in Prepare when the brief does not say it; never a guess
    filmLanguageLine(meta, step),
    // frame titles once mixed the two languages ("Cáo asleep under the moon", "The workshop: 16 bước · 1 đội")
    `The words the owner reads in the app's dialogs follow the same rule: the storyboard's frame titles and scene lines, each option's name, the Motion Plan's shot names and notes, a character's name and about line: in ${lang === "en" ? "English" : "Vietnamese"} only, never two languages in one title (a name the brief gives, a brand or a word on screen stays as it is).`,
    // a note between tool calls showed live as "Now the engine code I need: the film contract, the page
    // host, Mira's module…": every text you write is a reply the user reads at once, in any step and any film style
    `Every line of text you write outside files, the short notes between your tool calls too, shows to the owner at once as your progress: write each in ${lang === "en" ? "English" : "Vietnamese"}, in plain words, saying who does what and why for the film (e.g. "${lang === "en" ? "I'm reading how the Storybook style draws and the author's Mira examples, so Mira comes out in the right hand." : "Tôi đang đọc cách vẽ kiểu Storybook và các mẫu Mira của tác giả để vẽ Mira đúng nét."}"). Never a file name, a path, code or the app's and engines' own words (contract, host, module, engine code, rig, gate, pipeline step ids) in them. Notes to yourself go in your thinking, not in text.`,
    // short replies; never list the files read or written; "video style", never "skill"
    "Keep replies short: at most about 60 words, 1-3 plain lines saying what you did; ask only what the pipeline needs from the owner.",
    `No tables, no headings, no file names, never say which files you read or wrote, never say "skill" (say "film style${styleTitle ? ` ${styleTitle}` : ""}").`,
    // one name per thing, the same as the app's menus, kept in English in a Vietnamese reply too
    "Call the app's things by the names its screens use, in English as they are, in every language: Film style (the style the film is made in), Brand Kit (colours, type and layout of a brand), Motion Library, Characters, Storyboard, Motion Plan (never \"motion spec\"), Review (Claude's director's review of the film, never \"QC review\" or \"self-check\"), Tech checks, Final Mix, Render. The pipeline goes on by itself: never end a step asking the owner to tell you when to start the next one (the Storyboard starts by itself after Prepare), and write every sentence whole (Test 10 #442). The app runs the Tech checks again by itself after a change to a film that has failed them (and before a render): never ask the owner to run them, and never tell the owner to press a button or open a menu you have not seen on a screen (Test 10 #436).",
    // numbered questions, in every style
    "When you ask the owner something, put each question on its own line, numbered 1., 2., 3. (one short sentence each, with the choices in it), after one line saying why you ask.",
    "Speak as \"tôi\" and call the owner \"bạn\". Every progress line says who does what and where the work stands: what you have finished, what you are doing now, what the owner gets and when to wait, e.g. \"Tôi đã đọc xong quy tắc và brief của bạn, giờ đang dựng 2 phương án storyboard A và B cho bạn duyệt, vui lòng chờ trong giây lát.\"",
    "Write details and decisions into the project's files, not the chat. When you begin a long piece of work, say first in one such line what it is (e.g. \"Tôi đang dựng 4 shot theo motion bạn đã duyệt, xong tôi sẽ tự chấm và báo bạn.\").",
    "In each message, bold 1-3 key words with Markdown **…**: an option's name (**A \"Đường sáng\"**), a number (**10 s**), the action the owner must take (**chọn A hoặc B**). Never bold a whole sentence; no other formatting.",
  ].filter(Boolean).join("\n");
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
      return { text };
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
    const task = await this.start(projectId, { text: old.text, scope: old.scope ?? { kind: "project" }, step: old.step ?? null });
    this.persist({ ...old, interrupted: { ...old.interrupted, handled: { at: new Date().toISOString(), by: task.id } } });
    return task;
  }
  persist(task) {
    const p = this.getProject(task.projectId);
    if (!p || p.missing) return;
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
  async start(projectId, { text, scope = { kind: "project" }, step = null, kickoff = false, retryOf = null, shown = null, label = null, media = null, asks = null, continues = null }) {
    const msg = String(text ?? "").trim();
    if (!msg) throw Object.assign(new Error("Write what you want Claude to do"), { code: "INVALID" });
    if (this.running.has(projectId)) throw Object.assign(new Error("Claude is still working on this project. Stop it or wait for it to finish."), { code: "BUSY" });
    this.guard?.(projectId);
    const p = this.getProject(projectId);
    if (!p || p.missing) throw Object.assign(new Error("Project not found"), { code: "NOT_FOUND" });
    const exe = findClaude(this.root);
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
      ...(step ? { step } : {}), ...(kickoff ? { kickoff: true } : {}), ...(retryOf ? { retryOf } : {}), ...(shown ? { shown: String(shown).slice(0, 20000) } : {}), ...(label ? { label: String(label).slice(0, 80) } : {}), ...(asks ? { asks: String(asks).slice(0, 80) } : {}), ...(continues && !step ? { continues: String(continues).slice(0, 40) } : {}),
      // pictures the chat card shows with the user's words (each film note's frame: { url, t, shot, text }), never a file path
      ...(Array.isArray(media) && media.length ? { media: media.slice(0, 200) } : {}) };
    this.tasks.set(task.id, task);
    this.running.set(projectId, task.id);
    try {
      // the film's first task ends the kickoff, whoever started it (the autopilot on open, or the Editor): a later Editor never
      // takes a pending kickoff for its own first step (it ran the Character step a second time)
      if (kickoff || meta.kickoff?.pending) this.updateMeta?.(projectId, (m) => { m.kickoff = { pending: false, taskId: task.id, at: task.createdAt }; });
      rev.ensureRepo(dir);
      task.revBefore = rev.commitAll(dir, "Changes before Claude task " + task.id);
      const { style, files: rules, first, qc } = prepareRules(dir, meta.style?.id, this.root);
      const { shots } = await this.readShots(dir);
      if (meta.look?.id && !scope.motion) { try { stageLook(dir, meta.look.id, this.root); } catch { /* the look store is not imported: the name is enough */ } }
      // a Lemo-Opuscar style's demo source, from the build on (its own rule: the treatment first, the demo only to learn techniques)
      // (a style cut from real material has its demo's material tools from the first step: AGENTS.md, "Treatment first")
      const lemoId = lemoSlug(meta.style?.id);
      if (lemoId && ["build", "qcReview"].includes(step) && !existsSync(join(dir, ".moworks", "library", "lemo", lemoId, "DEMO.md"))) {
        try { const st = stageLemoDemo(dir, lemoId, this.root); this.event(task, { kind: "status", text: `Lemo-Opuscar demo: ${st.item.en}` }); } catch { /* the style's rules are enough */ }
      } else if (lemoId && !existsSync(join(dir, ".moworks", "library", "lemo", lemoId))) {
        try { const st = stageLemoDemo(dir, lemoId, this.root, { toolsOnly: true }); if (st.files.length) this.event(task, { kind: "status", text: `Lemo-Opuscar material tools: ${st.item.en}` }); } catch { /* none */ }
      }
      // an mg-styles-15 style's demo source, from the build on
      const mgId = mgSlug(meta.style?.id);
      if (mgId && ["build", "qcReview"].includes(step) && !existsSync(join(dir, ".moworks", "library", "mg", mgId, "CREDIT.md"))) {
        try { const st = stageMgDemo(dir, mgId, this.root); this.event(task, { kind: "status", text: `mg-styles-15 demo: ${st.item.en}` }); } catch { /* the style's rules are enough */ }
      }
      // an anidoodle medium: the pinned engine and the author's guides from the first step (the engine draws every board and the film)
      if (anidoodleId(meta.style?.id)) {
        try { if (stageAnidoodle(dir, this.root).files.length) this.event(task, { kind: "status", text: "anidoodle engine staged" }); } catch { /* the rules are enough */ }
      }
      // the What If animation style: the pinned engine, its settings, the two worked episodes and the cast sheet, from the first step
      if (meta.style?.id === "what-if") {
        try { if (stageWhatIf(dir, this.root).files.length) this.event(task, { kind: "status", text: "What If engine staged" }); } catch { /* the rules are enough */ }
      }
      // the Brush cartoon style: the character kit (its guide, the layer's code, an example definition; never clawd.js) from the first step
      if (meta.style?.id === "brush-cartoon") {
        try { if (stageBrushGuide(dir, this.root).files.length) this.event(task, { kind: "status", text: "character kit staged" }); } catch { /* the rules are enough */ }
      }
      const pipeline = this.pipeline ? await this.pipeline(projectId).catch(() => "") : "";
      const prev = this.list(projectId).filter((x) => x.id !== task.id).at(-1);
      const news = readNotes(dir).filter((n) => !prev || (n.updatedAt ?? n.at) > prev.createdAt).map((n) => n.kind === "assets" ? `the owner added ${n.files?.length ?? 0} file(s): ${(n.files ?? []).slice(0, 20).join(", ")}` : n.text.replace(/\{(\w+)\}/g, (m0, k) => n.vars?.[k] ?? m0));
      const newsText = news.length ? `New since your last task: ${news.join("; ")}.` : "";
      // a pipeline step starts a fresh conversation each time it runs ("Make two more options" once resumed the first storyboard task's
      // 49 turns and its pictures, 2.5 M tokens re-read); the project's files carry the work across. The chat keeps its conversation.
      const own = step || freshChat ? null : conv.sessions[key];
      const before = freshChat && prev ? `Just before (this chat starts a new, small conversation; the project's files hold the work): ${prev.step ? `the ${prev.step} step` : `the request "${String(prev.text ?? "").split("\n")[0].slice(0, 200)}"`} ended with: ${String(prev.resultText ?? "").slice(0, 1500)}\nRead only the files this request needs, the part you change (Grep for it, then Edit).` : "";
      const sessionArgs = own?.sessionId ? ["--resume", own.sessionId] : ["--session-id", randomUUID()];
      const target = scope.kind === "selection" && scope.selection      // an element picked in HyperFrames Studio: its own request block (HF's format)
        ? `Target: the element selected in HyperFrames Studio${scope.shot ? ` (shot ${scope.shot.number} "${scope.shot.title}")` : ""}. Change only this element unless the request says otherwise.\n${String(scope.selection).slice(0, 6000)}`
        : scope.kind === "shot" && scope.shot
        ? `Target: Shot ${scope.shot.number} "${scope.shot.title}" (${scope.shot.src ?? "no file yet"}, ${scope.shot.start ?? "?"}-${scope.shot.start != null && scope.shot.duration != null ? +(scope.shot.start + scope.shot.duration).toFixed(2) : "?"} s)${scope.object ? `, object: ${scope.object}` : ""}. Change only this shot unless the request says otherwise.`
        : "Target: the whole project.";
      let motion = "";
      if (scope.motion?.id && scope.motion.library === "blocks") {     // a HyperFrames registry block / component, used as shipped
        const entry = registryItems(this.root).find((e) => e.id === scope.motion.id);
        if (entry) await ensureHosted(entry, { root: this.root }).catch(() => {});     // images it lists by URL (offline: staged without them)
        const staged = stageBlock(dir, scope.motion.id, this.root);
        motion = `\nHyperFrames ${staged.item.kind} "${staged.item.title}" (registry ${staged.item.kind}s/${staged.item.name}, ${staged.item.credit.commit.slice(0, 12)}). Read it before editing: ${staged.files.join(", ")}.`
          + " Use it as HyperFrames ships it (copy its composition and assets into the project, mount it like the other sub-compositions, set its text and variables);"
          + (staged.item.vi.status === "missing" || staged.item.vi.status === "mixed" ? ` its font ${staged.item.vi.families.filter((f) => f.vi !== true).map((f) => f.family).join(", ")} has no Vietnamese letters: use a font that has them for Vietnamese text.` : " keep its look.");
        this.event(task, { kind: "status", text: `Blocks: ${staged.item.title}` });
      } else if (scope.motion?.id && scope.motion.library === "intake") {     // Magic UI / Codrops / TakayuStudio, written here as a HyperFrames component
        const staged = stageIntake(dir, scope.motion.id, this.root);
        const it = staged.item;
        motion = `\nMotion Library ${it.kind}: "${it.title}" by ${it.credit.author} (${it.credit.licence}, ${it.credit.made}; ${it.credit.link}). Read it before editing: ${staged.files.join(", ")}.`
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
      // the pipeline and the news live in the request only (they change every task; the system prompt carries what holds for the project)
      const prompt = `${target}${motion}${pipeline ? `\n\n${pipeline}` : ""}${newsText ? `\n${newsText}` : ""}${before ? `\n\n${before}` : ""}\n\nRequest:\n${msg}`;
      const tools = this.permitUrl ? Object.keys(this.appTools).filter((n) => APP_TOOLS[n]) : [];
      // the rule files this step must read (reads.mjs, after HF's own mandatory reads): named in the prompt, checked before the first edit
      const required = requiredReads(dir, { styleId: meta.style?.id, first, step });
      task.requiredReads = required;
      // the user's language: this chat message, else their last chat message, else the brief
      const lang = ownerLanguage([step ? null : msg, ...this.list(projectId).filter((x) => !x.step && x.id !== task.id).map((x) => x.text).reverse(), meta.brief?.text]);
      // the Brand Kit's fonts, checked by the app before Prepare and the chat: a font it lacks or without Vietnamese stops
      const brandFonts = meta.look?.id && (!step || step === "brief")
        ? await Promise.race([brandKitFonts(dir), new Promise((ok) => setTimeout(() => ok(null), 8000))]).catch(() => null) : null;
      const sp = systemPrompt({ meta, style, rules, first, qc, shots, dir, step, lang, settings, tools, required, brandFonts,
        motionSpec: !this.stepOf || (this.stepOf(meta, null, true) ?? []).some((s) => s.done?.kind === "approval" && s.done.name === "motionPlan") });
      const mcpConfig = this.permitUrl ? JSON.stringify({ mcpServers: { mw: { command: process.execPath, args: [join(import.meta.dirname, "permit-mcp.mjs")] } } }) : null;
      const guard = required.length ? `"${process.execPath}" "${join(import.meta.dirname, "read-guard.mjs")}"` : null;
      const args = claudeArgs({ settings, systemPrompt: sp, sessionArgs, mcpConfig, appTools: tools, guard });
      const pins = loadPins(this.root);
      const env = claudeEnv();
      for (const k of Object.keys(env)) if (/^ANTHROPIC_(API_KEY|AUTH_TOKEN|BASE_URL)$/i.test(k) || (pins.stripEnv ?? []).includes(k.toUpperCase())) delete env[k];
      Object.assign(env, { MW_REQUIRED_READS: JSON.stringify(required), MW_TASK: task.id, MW_PROJECT: dir });
      if (this.permitUrl) Object.assign(env, { MW_PERMIT_URL: this.permitUrl, MW_PERMIT_TOKEN: this.permitToken ?? "", MW_PERMIT_TASK: task.id, MCP_TOOL_TIMEOUT: String(35 * 60 * 1000),
        MW_APP_TOOLS: JSON.stringify(tools.map((n) => ({ name: n, ...APP_TOOLS[n] }))) });
      task.stage = "working";
      this.event(task, { kind: "status", text: `Target: ${scope.kind === "shot" && scope.shot ? `Shot ${scope.shot.number}` : "Project"}` });
      this.event(task, { kind: "status", text: `${own?.sessionId ? "Continuing" : "New"} conversation for ${key === "chat" ? "the chat" : `step ${key}`} · ${settings.mode} · ${settings.model} · effort ${settings.effort}${se.rule === "step" ? " (this step's own)" : se.rule === "min" ? " (at least high)" : ""} · web ${settings.web}` });
      const child = spawn(exe, args, { cwd: dir, env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
      this.procs.set(task.id, child);
      child.stdin.end(prompt, "utf8");
      // a long think or a long app tool (QC sheets, board stills) would let the 5-minute cache lapse; a one-word ping of a
      // copy of the conversation keeps it (its tokens are added to the task's usage)
      const ka = keepAlive({ exe, args, sessionId: sessionArgs[1], cwd: dir, env, onPing: ({ ok, usage }) => {
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
      child.on("close", (code) => { ka.stop(); this.procs.delete(task.id); this.finish(task, dir, code, errTail).catch((e) => this.fail(task, e)); });
      child.on("error", (e) => this.fail(task, e));
    } catch (e) { this.fail(task, e); }
    return task;
  }

  onLine(task, line, dir, key = "chat") {
    let e; try { e = JSON.parse(line); } catch { return; }
    if (e.type === "system" && e.subtype === "init") {
      task.model = e.model ?? null;
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
      for (const b of e.message?.content ?? []) if (b?.type === "tool_result" && b.is_error) this.event(task, { kind: "tool-error", text: String(typeof b.content === "string" ? b.content : JSON.stringify(b.content)).slice(0, 400) });
      // a tool's answer is back, so Claude is thinking now (its thinking may stream nothing): the bar said "Font check for
      // 15m 47s" through a 16-minute thinking turn
      if ((e.message?.content ?? []).some((b) => b?.type === "tool_result")) task.doing = { kind: "think", at: new Date().toISOString() };
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
      task.revAfter = rev.commitAll(dir, `Cancelled Claude task ${task.id} (partial changes)`);
      task.changed = rev.changedFiles(dir, task.revBefore, task.revAfter);
      task.status = "cancelled"; task.stage = "cancelled";
      task.outcome = task.changed.length ? "partial" : "none";
      this.event(task, { kind: "status", text: task.changed.length ? "Stopped. Partial changes were kept as a revision you can undo." : "Stopped. No file was changed." });
      return this.persist(task);
    }
    if (code !== 0 || task.claudeError) {
      task.revAfter = rev.commitAll(dir, `Claude task ${task.id} (failed)`);
      task.changed = rev.changedFiles(dir, task.revBefore, task.revAfter);
      const msg = task.claudeError || errTail.split(/\r?\n/).filter(Boolean).slice(-3).join(" ") || `Claude stopped (exit ${code})`;
      if (SIGNED_OUT_TEXT.test(msg)) { this.onSignedOut?.(); task.errorCode = "CLAUDE_SIGNED_OUT"; }
      // two Claude Code processes refreshing the sign-in at once is passing; the same request runs again once, a few seconds later
      if (OAUTH_RACE.test(msg) && !task.retryOf) {
        task.errorCode = "CLAUDE_BUSY_RETRY"; task.retrying = true;
        const again = { text: task.text, scope: task.scope, step: task.step ?? null, retryOf: task.id };
        setTimeout(() => { this.start(task.projectId, again).catch((e) => this.event(task, { kind: "error", text: `Trying again failed: ${e.message}` })); }, RETRY_MS).unref?.();
        return this.fail(task, new Error("Claude Code was busy refreshing its sign-in: trying again in a few seconds"));
      }
      return this.fail(task, new Error(msg));
    }
    const edited = rev.changedFiles(dir, task.revBefore, (() => { rev.commitAll(dir, `Claude: ${task.text.split("\n")[0].slice(0, 70)}`); return rev.head(dir); })());
    if (edited.length) {
      task.stage = "checking"; task.doing = { kind: "rules", at: new Date().toISOString() }; this.event(task, { kind: "status", text: "Applying studio rules and checking the film" });
      // sound effects are placed at the Final Mix only, once the picture is locked, not after every task
      // the film's data-fps back on the root if Claude's rewrite of index.html lost or changed it: HF's player and checks read it
      try { keepRootFps(this.getProject(task.projectId) ?? { path: dir }); } catch (e) { this.event(task, { kind: "tool-error", text: `Frame rate: ${e.message}` }); }
      // the music ends with the film as it is now, fading down with the picture (hf-edit/ending.mjs)
      try { fitMusicToFilm(dir); } catch (e) { this.event(task, { kind: "tool-error", text: `Music: ${e.message}` }); }
      // a file Claude put outside the app's folders (a loose picture in assets/, an older folder name) goes where it belongs, the film's
      // paths with it
      try { const lr = migrateLayout(dir, { classify: classifyAsset, sequenceOf }); if (lr.moved.length) this.event(task, { kind: "status", text: `Files sorted into the asset folders: ${lr.moved.map(([, t]) => t).slice(0, 5).join(", ")}` }); }
      catch (e) { this.event(task, { kind: "tool-error", text: `Folders: ${e.message}` }); }
      try {
        const rep = await finalize(dir);
        // a film whose source does not compile keeps its older bundle: said at once, kept for the pipeline and the autopilot
        const bad = rep?.anidoodle?.error ?? null;
        if (bad) this.event(task, { kind: "tool-error", text: `The film's code does not compile: ${bad}` });
        this.updateMeta?.(task.projectId, (m) => { const pl = (m.pipeline ??= {}); if (bad) pl.buildError = { at: new Date().toISOString(), error: bad, taskId: task.id }; else delete pl.buildError; });
      } catch (e) { this.event(task, { kind: "tool-error", text: `Finalize: ${e.message}` }); }
      rev.commitAll(dir, `Studio rules after Claude task ${task.id}`);
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
    task.revAfter = rev.head(dir);
    task.changed = rev.changedFiles(dir, task.revBefore, task.revAfter);
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
        const before = rev.fileAt(dir, task.revBefore, "STORYBOARD.md");
        if (before != null && storyboardHash(before) !== storyboardHash(sb)) {
          sb = keepApprovedStoryboard(before, sb);
          writeFileSync(join(dir, "STORYBOARD.md"), sb.endsWith("\n") ? sb : sb + "\n");
          try { rev.commitAll(dir, `The approved storyboard kept as approved (task ${task.id} had changed it)`); } catch { /* the file is right either way */ }
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
    if (c) spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    return t;
  }

  /** Undo a finished task's changes with a new revision. */
  revert(projectId, taskId) {
    const p = this.getProject(projectId);
    const all = this.list(projectId);
    const t = all.find((x) => x.id === taskId);
    if (!t) throw Object.assign(new Error("Task not found"), { code: "NOT_FOUND" });
    if (!t.changed?.length || !t.revAfter) throw Object.assign(new Error("This task changed no file"), { code: "INVALID" });
    if (t.reverted) throw Object.assign(new Error("Already undone"), { code: "INVALID" });
    if (this.running.has(projectId)) throw Object.assign(new Error("Wait until Claude has finished"), { code: "BUSY" });
    const log = rev.log(p.path, 400);
    const span = []; let inside = false;
    for (const c of log) { if (c.rev === t.revAfter) inside = true; if (c.rev === t.revBefore) break; if (inside) span.push(c.rev); }
    let r = null;
    for (const c of span) r = rev.revert(p.path, c);     // newest first
    t.reverted = { at: new Date().toISOString(), rev: r };
    const live = this.tasks.get(taskId); if (live) live.reverted = t.reverted;
    this.persist(live ?? { ...t, events: t.events ?? [] });
    return t;
  }

  accept(projectId, taskId) {
    const t = this.list(projectId).find((x) => x.id === taskId);
    if (!t) throw Object.assign(new Error("Task not found"), { code: "NOT_FOUND" });
    t.accepted = { at: new Date().toISOString() };
    const live = this.tasks.get(taskId); if (live) live.accepted = t.accepted;
    this.persist(live ?? t);
    return t;
  }

  /** Forget the Claude conversation of a project (the task history stays). */
  newConversation(projectId) {
    const p = this.getProject(projectId);
    if (this.running.has(projectId)) throw Object.assign(new Error("Wait until Claude has finished"), { code: "BUSY" });
    const conv = readConversation(p.path);          // the conversation the next chat message would continue starts again; the history stays
    if (conv.current) delete conv.sessions[conv.current];
    conv.current = null;
    writeJson(join(p.path, ".moworks", "claude.json"), conv);
    return { ok: true };
  }
}

/** Fresh eyes (moworks-qc §5): a separate short Claude run that sees only the given sheets (its folder is the QC round's), says in one
 *  sentence what the film tells and lists the 3 worst problems. Returns the text, or null when it could not run. */
export async function freshEyes({ dir, sheets, root = APP_ROOT, model = "sonnet" }) {
  const exe = findClaude(root);
  if (!exe || !sheets.length) return null;
  const env = claudeEnv();
  for (const k of Object.keys(env)) if (/^ANTHROPIC_(API_KEY|AUTH_TOKEN|BASE_URL)$/i.test(k)) delete env[k];
  const names = sheets.map((f) => f.split("/").pop());
  const prompt = `You see a short film only as these contact sheets (read each with Read): ${names.join(", ")}. The beats sheet is one still per shot in order; the cuts sheet shows 4 frames across each shot change. You know nothing else about the film. Answer in Vietnamese, in two parts: 1) one sentence: what does this film tell its viewer? 2) the 3 worst problems you see (which shot or cut, what, why), most serious first. Nothing else.`;
  const args = ["-p", "--output-format", "json", "--restricted", "--tools", "Read", "--permission-mode", "auto", "--permission-prompts", "none", "--strict-mcp-config",
    "--disable-slash-commands", "--model", MODELS.find(([k]) => k === model)?.[2] ?? "claude-sonnet-5-5", "--effort", "low", "--no-session-persistence"];
  const cwd = join(dir, ...sheets[0].split("/").slice(0, -1));
  return new Promise((ok) => {
    const c = spawn(exe, args, { cwd, env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    const t = setTimeout(() => c.kill(), 5 * 60 * 1000);
    c.stdout.on("data", (d) => { out += d; });
    c.stderr.resume();
    c.stdin.end(prompt, "utf8");
    c.on("close", () => { clearTimeout(t); try { const j = JSON.parse(out); ok(j.is_error ? null : String(j.result ?? "").trim() || null); } catch { ok(null); } });
    c.on("error", () => ok(null));
  });
}

/** The Google Slides links the app could not read : a missing thing for Prepare, with the two ways on. */
export function linksLine(meta) {
  const bad = Object.entries(meta?.links ?? {}).filter(([, v]) => v && !v.ok);
  if (!bad.length) return "";
  const why = (r) => (r === "not-shared" ? "not shared by link (Google answered with its sign-in page)" : r === "not-found" ? "no deck at this link" : r === "too-large" ? "over 300 MB" : "Google could not be reached");
  return `Google Slides links in the brief the app could not read: ${bad.map(([url, v]) => `${url} (${why(v.reason)})`).join("; ")}. Each is a missing thing (moworks-studio §2b): offer the ways on (in Google Slides, Share › Anyone with the link, then say "done"; or upload the deck as a PPTX with the Assets button; or go on without it) with the other points in one message, and stop.`;
}

// the voice settings stay the user's choice (Claude once told the user to set speed 0.85)
const VOICE_SETTINGS_RULE = "The voice's settings (speed, stability and the rest) are the owner's to set on the Voice screen and start at the voice service's own defaults: never set, suggest or name a number for them unless the owner asks.";

/** The ways to a voice-over the app offers, in every style (with the ElevenLabs key saved, Prepare once offered only "record and
 *  upload" or "no narration"; Claude once asked for a speed the Voice screen did not have). Empty when the film already has one. */
export function voiceLine(meta, root = APP_ROOT) {
  if (meta?.voice?.file) return "";
  let keys = []; try { keys = Object.entries(secretsStatus(root)).filter(([, v]) => v.saved).map(([k]) => ({ elevenlabs: "ElevenLabs", fishaudio: "Fish Audio" })[k] ?? k); } catch { /* none */ }
  return keys.length
    ? `Voice-over (the app says): none in the project yet, and ${keys.join(" and ")} is set up. When the brief already says which way (e.g. the voice made in the app), take it without asking (QC4-4). A film with a narration (made here or recorded by the owner) gets its words to read in VOICEOVER.md, the words only, one line per scene: the app then holds the Storyboard until the voice is made and its words are timed, so the Storyboard is timed to them in one pass (D39); never ask the owner to tell you when it is made. A film with no narration gets no VOICEOVER.md. When the brief wants a narration and does not say how, offer the ways on in this order: 1) make it here: the owner opens the Voice screen, picks a voice (a Vietnamese one for Vietnamese) and the app reads the script with ${keys[0]}; you write the words to read into VOICEOVER.md (the words only, one line per scene: the Voice screen's Script box is filled with them); 2) upload a recording with the Assets button; 3) no narration.`
    : "Voice-over (the app says): none in the project yet, and no voice service is set up. When the brief wants a narration, offer the ways on: upload a recording with the Assets button, add an ElevenLabs or Fish Audio key in Settings › Voice to make it here, or no narration. A film with a narration (made here or recorded by the owner) gets its words to read in VOICEOVER.md, the words only, one line per scene: the app then holds the Storyboard until the voice is made and its words are timed, so the Storyboard is timed to them in one pass (D39); never ask the owner to tell you when it is made. A film with no narration gets no VOICEOVER.md.";
}

/** The user's lyrics (lyrics.txt) are placed only by the app's timing (LYRICS-TIMED.md, .moworks/lyrics/words.json), never by guess (Claude once
 *  planned to place each line on the beat for a song with no singing). Untimed or timed
 *  before the lyrics changed: say what the user presses and stop. Empty when the film has no lyrics. */
export function lyricsLine(dir) {
  let text = "", timedAt = null, textAt = 0;
  try { text = readFileSync(join(dir, "lyrics.txt"), "utf8").trim(); textAt = statSync(join(dir, "lyrics.txt")).mtimeMs; } catch { return ""; }
  if (!text) return "";
  try { timedAt = Date.parse(JSON.parse(readFileSync(join(dir, ".moworks", "lyrics", "words.json"), "utf8")).at); } catch { /* not timed */ }
  if (timedAt && textAt <= timedAt + 1000) return "The owner's lyrics are timed by the app: LYRICS-TIMED.md (each line's start) and .moworks/lyrics/words.json (each word). Place every line exactly at its time there; never move a line by guess.";
  return "The owner gave lyrics (lyrics.txt) and the app has not timed them yet" + (timedAt ? " (they changed after the last timing)" : "") + ". Never place lyrics by guess, on the beat or anywhere, even for a track with no singing: the app times them to the track. Tell the owner in one line to open Lyrics and press Time the lyrics (it needs the music track in the film first), and stop; the storyboard places the lines once LYRICS-TIMED.md is there.";
}

/** The style author's own music line (its sound palette), for the music step (once three wedding harps were chosen for an HD-2D adventure whose
 *  palette is strings, horns, low choir and timpani with an arc). Empty when the style's file has no sound section. */
export function musicLine(meta, root = APP_ROOT) {
  let text = ""; try { const s = getStyle(meta?.style?.id, root); const r = s?.rules?.find((x) => /-style$/.test(x.kind) && x.path); text = r ? readFileSync(r.path, "utf8") : ""; } catch { return ""; }
  const sec = /^#{2,3}[^\n]*(sound|music|audio)[^\n]*\n([\s\S]*?)(?=^#{1,3}\s|(?![\s\S]))/im.exec(text)?.[2] ?? "";
  const music = sec.split(/\r?\n/).map((l) => l.replace(/[*_`]/g, "").replace(/^\s*[-•]\s*/, "").trim()).filter((l) => /^music\b|music:/i.test(l)).join(" ").slice(0, 600);
  const palette = music ? `The style's author on the music: "${music}" ` : "";
  return `${palette}Choose the three tracks for the story's arc (its opening, its rise, its climax and the quiet before the hit), searching mixkit.co by the palette's instruments and that arc (e.g. "cinematic", "adventure", "epic", "fantasy"), not by one instrument alone; three different moods for the owner to choose from, never a piece made for another occasion (a wedding, a baby, a corporate presentation) (Test 13 #479).`;
}

/** The film's language: the voice-over and the words on screen, set from the brief or by the user's answer. When nobody said
 *  it, Prepare (and a chat turn before it is set) asks it with its other questions and records it with film_language. */
export function filmLanguageLine(meta, step = null) {
  const id = meta?.language?.id;
  if (id) return `The film's language (the voice-over and every word on screen): ${id === "en" ? "English" : "Vietnamese"}.`;
  if (step && step !== "brief") return "The film's language is not set yet: write the words on screen in the brief's language and ask the owner in your reply which language the film speaks.";
  return "The brief does not say the film's language. Ask it with your other questions in one message (moworks-studio §2b): \"Lời đọc và chữ trên phim: tiếng Việt hay tiếng Anh?\" (Vietnamese first when the owner writes Vietnamese), and stop; when the owner answers, call film_language with vi or en before you go on.";
}

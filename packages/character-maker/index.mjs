// The Character creator: one character made outside any film, from a description (and a reference
// picture), in one drawing style, by one Claude Code run (Opus) in a lab folder outside git, then saved to the user's library.
// - anidoodle-human, in one of the 9 hands of anidoodle's human engine: the author's recipe exactly
//   (the pinned engine staged as shipped, the character as a module, the author's gate with negative twins, a model sheet and a walk);
//   saved in <work>/library/characters/anidoodle-human/<id>/.
// - brush-kit (Brush cartoon): a definition for the app's character layer on ClaudeAnimationBase's kit; its sheets drawn as
//   the Character step draws them; saved in <work>/library/characters/user/ like a character saved from a film.
// Change with Claude is the same run, starting from the saved character (the version before is kept). The prompts, styles and the
// measured estimates are in config/character-maker.json. Renders run light (the caller's workers, below-normal priority), as the lab
// tools do. The HyperFrames calls stay in the lab tools (child processes) or come from the caller, so this package is outside that
// boundary.
import { execFile, spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path";
import { docPath } from "../project-service/docs.mjs";
import { rulePath, stageRoot } from "../project-service/shared-stage.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";
import * as kit from "../character-kit/index.mjs";
import { brushGate } from "../character-kit/brushgate.mjs";
import { anidoodleSource, stageEngine } from "../anidoodle-styles/index.mjs";
import { claudeEnv, findClaude } from "../system-status/index.mjs";
import { checkArgv } from "../agent/argv.mjs";
import { ffmpegExe } from "../library/preview-media.mjs";

const TOOLS = join(import.meta.dirname, "lab-tools");
const readJson = (f, d = null) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };
export const config = (root = APP_ROOT) => readJson(join(root, "config", "character-maker.json"), {});
export const labRoot = (root = APP_ROOT) => join(kit.mediaRoot(root), "_lab");
/** Labs left behind (a stopped run, a server that ended mid-run): gone after a day; a failed run's lab stays that long for a look. */
export function sweepLabs(root = APP_ROOT, maxAgeMs = 24 * 3600000) {
  const d = labRoot(root), gone = [];
  if (!existsSync(d)) return gone;
  for (const n of readdirSync(d)) { const p = join(d, n); try { if (Date.now() - statSync(p).mtimeMs > maxAgeMs) { rmSync(p, { recursive: true, force: true }); gone.push(n); } } catch { /* in use */ } }
  return gone;
}

/** A style's tile (packages/character-maker/thumbs/<hand>.webp: Mira walking in that hand, cut from anidoodle's own code's render, Apache-2.0
 *  with its NOTICE), or null. */
export const thumbFile = (name) => (/^[a-z]+.webp$/.test(name) && existsSync(join(import.meta.dirname, "thumbs", name)) ? join(import.meta.dirname, "thumbs", name) : null);
/** The kinds of character an engine draws: [{ id: "human"|"animal"|"thing"|"robot", label, about }], its default first. A person
 *  is on anidoodle's human engine with the author's human gate; an animal or a thing gets a rig and a gate of its own. */
export function rigsFor(engine, root = APP_ROOT) {
  const r = config(root).rigs ?? {}, def = r.default?.[engine];
  return Object.entries(r).filter(([id, x]) => !id.startsWith("_") && id !== "default" && x.engines?.includes(engine))
    .map(([id, x]) => ({ id, label: x.label, about: x.about })).sort((a, b) => (b.id === def) - (a.id === def));
}
/** The kind a run makes: the one asked for (when the engine draws it), a change keeps the saved one, else the engine's default. */
export function rigOf(engine, asked, saved, root = APP_ROOT) {
  const ok = rigsFor(engine, root).map((x) => x.id);
  if (saved) return saved;
  if (asked == null || asked === "") return ok[0] ?? null;
  if (!ok.includes(asked)) throw Object.assign(new Error(`${engine === "brush-kit" ? "Brush cartoon" : "anidoodle"} does not draw this kind of character: ${asked} (it draws ${ok.join(", ")})`), { code: "INVALID" });
  return asked;
}
/** The styles the creator offers: { engine, hand, label, example?, thumb, thumbCredit, rigs } (the 9 anidoodle hands and Brush cartoon),
 *  each with its estimate and the kinds of character it draws. */
export function styles(root = APP_ROOT) {
  const c = config(root);
  return (c.styles ?? []).map((s) => ({ ...s, estimate: c.estimate?.[s.engine] ?? null, rigs: rigsFor(s.engine, root),
    thumb: s.engine === "brush-kit" ? "/media/characters/clawd/poster.webp" : thumbFile(`${s.hand}.webp`) ? `/media/character-styles/${s.hand}.webp` : null,
    thumbCredit: s.engine === "brush-kit" ? "Clawd, the demo character of ClaudeAnimationBase's kit (John Heibel, MIT; Anthropic's mascot), drawn by the app's character layer to show the look: never in a film" : "Mira, anidoodle's character by Alex Greenshpun (Apache-2.0), in this hand" }));
}
export const styleOf = (engine, hand, root = APP_ROOT) => styles(root).find((s) => s.engine === engine && (engine === "brush-kit" || s.hand === hand)) ?? null;

/** A free id for a new character from its name or description: lowercase letters, digits and dashes, not taken in either store. */
export function newId(text, root = APP_ROOT) {
  const base = String(text ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, " ").trim()
    .split(" ").filter((w) => !["a", "an", "the", "with", "and", "of", "in", "wearing"].includes(w)).slice(0, 3).join("-").replace(/^[^a-z]+/, "") || "character";
  const taken = new Set([...kit.characters(root).map((c) => c.id), ...kit.humanCharacters(root).map((c) => c.id), "user", "clawd"]);
  let id = base.slice(0, 28);
  for (let n = 2; taken.has(id); n++) id = `${base.slice(0, 25)}-${n}`;
  return id;
}

const fill = (t, v) => Object.entries(v).reduce((s, [k, x]) => s.split(`{{${k}}}`).join(x ?? ""), t);
/** Is `p` a file inside `dir` (links followed, so a junction cannot lead out)? */
const inside = (dir, p) => { try { const rel = relative(realpathSync(dir), realpathSync(p)); return !!rel && !rel.startsWith("..") && !isAbsolute(rel); } catch { return false; } };
/** A reference picture into the lab (a data: URL, as the creator sends it, or a file in the character library): its path relative to
 *  the lab, or null. A file anywhere else on the disk is refused. */
function placePicture(lab, image, root) {
  if (!image) return null;
  mkdirSync(join(lab, "reference"), { recursive: true });
  const m = /^data:image\/(png|jpe?g|webp);base64,(.+)$/s.exec(String(image));
  if (m) { const f = `reference/picture.${m[1].replace("jpeg", "jpg")}`; writeFileSync(join(lab, f), Buffer.from(m[2], "base64")); return f; }
  if (/\.(png|jpe?g|webp)$/i.test(image) && inside(kit.mediaRoot(root), image)) { const f = `reference/picture${extname(image).toLowerCase()}`; cpSync(image, join(lab, f)); return f; }
  throw Object.assign(new Error("The reference picture must be a PNG, JPEG or WebP added in the creator"), { code: "INVALID" });
}
function copyTools(lab, names, root) {
  mkdirSync(join(lab, "tools"), { recursive: true });
  for (const n of names) cpSync(join(TOOLS, n), join(lab, "tools", n));
  writeFileSync(join(lab, "tools", "app-root.txt"), `${root}\n`);
}

/** Stage a lab for one run: { lab, brief, allowed } (the Bash commands Claude may run there). */
export function prepareLab(job, root = APP_ROOT) {
  const { engine, hand, id, name, description, image, change, from } = job, c = config(root), st = styleOf(engine, hand, root);
  const rig = job.rig ?? rigOf(engine, null, null, root), rigLabel = { human: "a person", animal: "an animal", thing: "a thing (neither a person nor an animal)" }[rig] ?? rig;
  if (!st) throw Object.assign(new Error(`No such style: ${engine}${hand ? ` / ${hand}` : ""}`), { code: "INVALID" });
  const lab = join(labRoot(root), job.jobId);
  rmSync(lab, { recursive: true, force: true }); mkdirSync(lab, { recursive: true });
  const pic = placePicture(lab, image, root);
  const vars = { DESCRIPTION: description, ID: id, NAME: name ? `${name} (use exactly this name, in its name and wherever its about names it)` : "(choose one from the description, and use it in its name and its about)", HAND: hand ?? "brush", HAND_LABEL: st.label, RIG_LABEL: rigLabel, RENDER: st.render ?? "",
    REFERENCE: pic ? `A reference picture: \`${pic}\` (look at it with Read; the character must read as it).\n` : "",
    CHANGE: change ? `\nThis character already exists (its files are in place, from the library): change it as asked, keep everything else as it is. The change: ${change}\nDraw the sheet again after the change and look at it: the change must show. End your reply with one line \`Changed: <what you changed>\`, and, for any part you could not do, one line \`Could not: <what, and why: e.g. the character layer has no such part>\`. Keep the two labels \`Changed:\` and \`Could not:\` in English (the app reads them); write what follows them in the language of the description.\n` : "" };
  if (engine === kit.HUMAN_ENGINE) {
    for (const d of ["anidoodle/films", "out", "reference"]) mkdirSync(join(lab, ...d.split("/")), { recursive: true });
    copyTools(lab, ["mw.mjs", "still.mjs", "render.mjs", "gate.mjs"], root);
    const src = anidoodleSource(root);
    if (!src) throw Object.assign(new Error("anidoodle is not pinned"), { code: "NOT_FOUND" });
    cpSync(join(src.skillDir, "engine", "tools", "character-check.entry.ts"), join(lab, "reference", "character-check.entry.ts"));
    stageEngine(lab, root);
    if (from) {          // Change with Claude: the saved module back in place
      const saved = join(kit.humanDir(root), from, "module");
      cpSync(join(saved, from), join(lab, "anidoodle", "characters", from), { recursive: true });
      for (const f of ["check.ts", "LEDGER.md"]) if (existsSync(join(saved, f))) cpSync(join(saved, f), join(lab, "anidoodle", f));
      for (const f of ["sheet.ts", "walk.ts"]) if (existsSync(join(saved, "films", f))) { mkdirSync(join(lab, "anidoodle", "films"), { recursive: true }); cpSync(join(saved, "films", f), join(lab, "anidoodle", "films", f)); }
      const cj = readJson(join(kit.humanDir(root), from, "character.json"));
      if (cj) writeFileSync(join(lab, "anidoodle", "character.json"), JSON.stringify({ id: cj.id, name: cj.name, about: cj.about }, null, 2) + "\n");
    }
    // a person: the author's human recipe and gate; an animal or a thing: a rig and a gate of its own
    return { lab, brief: fill(c.prompts[rig === "human" ? kit.HUMAN_ENGINE : "anidoodle-rig"], vars), allowed: ["Bash(node tools/still.mjs:*)", "Bash(node tools/gate.mjs:*)", "Bash(node tools/render.mjs:*)"] };
  }
  copyTools(lab, ["brush-sheets.mjs"], root);
  kit.stageGuide(lab, root);
  const rules = join(lab, ".moworks", "rules");
  mkdirSync(join(rules, "brush-cartoon"), { recursive: true }); mkdirSync(join(rules, "brush-cartoon-app"), { recursive: true });
  writeFileSync(join(rules, "brush-cartoon", "SKILL.md"), kit.ruleText(root) ?? "");
  cpSync(join(root, "config", "rules", "brush-cartoon-app", "SKILL.md"), join(rules, "brush-cartoon-app", "SKILL.md"));
  if (from) {
    const { group, demo, selectable, ...def } = kit.getCharacter(from, root) ?? {};
    writeFileSync(join(lab, kit.CAST_FILE), JSON.stringify({ characters: [def] }, null, 2) + "\n");
  }
  return { lab, brief: fill(c.prompts["brush-kit"], vars), allowed: ["Bash(node tools/brush-sheets.mjs:*)"] };
}

/** The Claude Code arguments of a lab run. The brief is not among them: it goes on stdin (the description and the change are the
 *  owner's own words, of any length; on the command line they could pass Windows' 32,767 characters, T27-14). */
export function labArgs({ allowed, model, effort, stage = null }) {
  // the anidoodle engine is linked from the shared stage (runtime/stage): Claude reads it there and never edits it
  const shared = stage ? ["--add-dir", stage, "--settings", JSON.stringify({ permissions: { deny: [`Edit(${rulePath(stage)}/**)`] } })] : [];
  return ["-p", "--output-format", "stream-json", "--verbose", "--model", model, "--effort", effort, "--permission-mode", "acceptEdits",
    "--tools", "Read,Edit,Write,Glob,Grep,Bash", "--allowedTools", ...allowed, ...shared, "--strict-mcp-config", "--disable-slash-commands", "--no-session-persistence"];
}

/** One Claude Code run in the lab (stream-json): onEvent({ kind: "tool"|"text", ... }) as it works. { ok, result, turns, costUsd, usage, ms }. */
export function runClaude({ lab, brief, allowed, root = APP_ROOT, model, effort, env = {}, signal = null, onEvent = () => {} }) {
  const exe = findClaude(root);
  if (!exe) return Promise.resolve({ ok: false, error: "Claude Code is not installed" });
  const args = labArgs({ allowed, model, effort, stage: stageRoot(root) });
  try { checkArgv(exe, args); } catch (e) { return Promise.resolve({ ok: false, error: e.message }); }
  const t0 = Date.now();
  return new Promise((ok) => {
    const c = spawn(exe, args, { cwd: lab, env: { ...claudeEnv(), MW_APP_ROOT: root, ...env }, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    c.stdin.on("error", () => { /* a run that ended at once: its close says why */ });
    c.stdin.end(brief, "utf8");
    let buf = "", final = null, err = "";
    c.stdout.on("data", (d) => {
      buf += d;
      for (let i = buf.indexOf("\n"); i >= 0; i = buf.indexOf("\n")) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line) continue;
        let m; try { m = JSON.parse(line); } catch { continue; }
        if (m.type === "result") final = m;
        if (m.type === "assistant") for (const part of m.message?.content ?? []) {
          if (part.type === "tool_use") onEvent({ kind: "tool", name: part.name, command: part.input?.command ?? null, file: part.input?.file_path ?? null });
          else if (part.type === "text" && part.text?.trim()) onEvent({ kind: "text", text: part.text.trim().slice(0, 400) });
        }
      }
    });
    c.stderr.on("data", (d) => { err = (err + d).slice(-4000); });
    const kill = () => spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true });
    signal?.addEventListener("abort", kill, { once: true });
    c.on("close", (code) => {
      signal?.removeEventListener("abort", kill);
      ok({ ok: code === 0 && !!final && !final.is_error, exitCode: code, result: final?.result ?? null, turns: final?.num_turns ?? null, costUsd: final?.total_cost_usd ?? null,
        usage: final?.usage ?? null, ms: Date.now() - t0, error: code === 0 ? null : (err.trim().split(/\r?\n/).pop() || `Claude stopped (exit ${code})`) });
    });
  });
}

/** A lab tool as a child process: { code, out } (below-normal priority comes from the tools' own render calls). */
function tool(lab, args, { root, env = {}, signal = null, timeout = 1200000 } = {}) {
  return new Promise((ok) => {
    const c = execFile(process.execPath, args, { cwd: lab, env: { ...process.env, MW_APP_ROOT: root, ...env }, windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024 },
      (e, out, errOut) => ok({ code: e ? (e.code ?? 1) : 0, out: `${out ?? ""}${errOut ?? ""}` }));
    signal?.addEventListener("abort", () => { try { spawnSync("taskkill", ["/PID", String(c.pid), "/T", "/F"], { windowsHide: true }); } catch { /* gone */ } }, { once: true });
  });
}
// resolves true when FFmpeg made the file; off the event loop (the creator runs in the server's own process)
const ff = (root, args) => new Promise((ok) => execFile(ffmpegExe(root), ["-v", "error", "-y", ...args], { windowsHide: true }, (e) => ok(!e)));
const toWebp = (root, src, out, w = 1600) => ff(root, ["-i", src, "-vf", `scale='min(${w},iw)':-1`, "-c:v", "libwebp", "-quality", "82", out]);

/** Make (or change) a character: the whole run. onStep(stage, progress) for the job; log(line). Returns the saved character's summary. */
export async function makeCharacter(input, { root = APP_ROOT, jobId, signal = null, onStep = () => {}, log = () => {}, env = {}, renderDemo = null, claude = runClaude } = {}) {
  const engine = input.engine === "brush-kit" ? "brush-kit" : kit.HUMAN_ENGINE, hand = engine === "brush-kit" ? "brush" : input.hand;
  const c = config(root), est = c.estimate?.[engine] ?? null, expectMs = est ? ((est.minutes[0] + est.minutes[1]) / 2) * 60000 : 20 * 60000;
  const from = input.from ?? null;
  if (from && engine === kit.HUMAN_ENGINE && !kit.humanCharacters(root).some((x) => x.id === from && x.credit?.made !== "as shipped"))
    throw Object.assign(new Error("Only the owner's own anidoodle characters can be changed (Mira and Theo are the author's, as shipped)"), { code: "INVALID" });
  if (from && engine === "brush-kit" && kit.getCharacter(from, root)?.group !== "yours") throw Object.assign(new Error("Only your own Brush characters can be changed"), { code: "INVALID" });
  const id = from ?? newId(input.name || input.description, root);
  if (!String(input.description ?? "").trim() && !from) throw Object.assign(new Error("Describe the character first"), { code: "INVALID" });
  const savedRec = from && engine === kit.HUMAN_ENGINE ? kit.humanCharacters(root).find((x) => x.id === from) : null, savedHand = savedRec ? savedRec.hand ?? savedRec.hands?.[0] ?? null : null;
  const beforeRec = from ? (engine === kit.HUMAN_ENGINE ? readJson(join(kit.humanDir(root), from, "character.json")) : kit.getCharacter(from, root)) : null;
  const rig = rigOf(engine, input.rig, from ? beforeRec?.kind ?? (engine === kit.HUMAN_ENGINE ? "human" : "thing") : null, root);
  const job = { jobId, engine, rig, hand: savedHand ?? hand, id, name: input.name || beforeRec?.name || null, description: input.description || beforeRec?.description || beforeRec?.about || "",
    image: input.image ?? null, change: from ? (input.text || input.change || "") : null, from };
  onStep("preparing the lab", 2);
  sweepLabs(root);
  const { lab, brief, allowed } = prepareLab(job, root);
  signal?.addEventListener("abort", () => setTimeout(() => rmSync(lab, { recursive: true, force: true }), 3000), { once: true });          // a stopped run leaves nothing
  // Claude's run: the progress follows the measured time; the stage says what it is doing
  onStep("Claude is reading the recipe", 4);
  const t0 = Date.now(), pct = () => Math.min(85, 5 + Math.round(((Date.now() - t0) / expectMs) * 80));
  const run = await claude({ lab, brief, allowed, root, model: c.model ?? "claude-opus-5-5", effort: c.effort ?? "medium", env, signal, onEvent: (e) => {
    if (e.kind === "tool") {
      const cmd = e.command ?? "";
      const stage = /gate\.mjs/.test(cmd) ? "Claude is running the character gate" : /still\.mjs|brush-sheets/.test(cmd) ? "Claude is drawing the model sheet"
        : /render\.mjs/.test(cmd) ? "Claude is rendering a test" : ["Write", "Edit"].includes(e.name) ? "Claude is writing the character" : "Claude is studying the examples";
      onStep(stage, pct());
      log(`${e.name}${cmd ? `: ${cmd}` : e.file ? `: ${basename(e.file)}` : ""}`);
    } else log(e.text);
  } });
  if (signal?.aborted) throw Object.assign(new Error("Stopped"), { code: "CANCELLED" });
  if (!run.ok) throw Object.assign(new Error(`Claude could not make the character: ${run.error ?? "no result"}`), { code: "CLAUDE_FAILED", detail: { lab } });
  const runInfo = { model: c.model ?? "claude-opus-5-5", effort: c.effort ?? "medium", minutes: Math.round(run.ms / 6000) / 10, turns: run.turns, costUsd: run.costUsd == null ? null : Math.round(run.costUsd * 100) / 100,
    tokens: run.usage ? { input: run.usage.input_tokens, output: run.usage.output_tokens, cacheRead: run.usage.cache_read_input_tokens, cacheWrite: run.usage.cache_creation_input_tokens } : null };
  const says = saysOf(run.result);
  let changes = null;
  if (from) {
    if (engine === kit.HUMAN_ENGINE) {
      const a = filesOf(join(kit.humanDir(root), from, "module", from)), b = filesOf(join(lab, "anidoodle", "characters", from));
      changes = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]);
    } else {
      const cast = kit.readCast(lab), after = cast.characters.find((x) => x.id === from) ?? cast.characters[0] ?? null;
      changes = after ? diffPaths(beforeRec, after) : [];
    }
    log(changes.length ? `changed: ${changes.join(", ")}` : "nothing in the character changed");
    if (!changes.length) {          // nothing to save: the character stays as it was, and the user is told why
      const history = kit.addHistory(id, { kind: "change", text: job.change, outcome: "unchanged", says, ...runInfo }, root);
      rmSync(lab, { recursive: true, force: true });
      onStep("done", 100);
      return { id, engine, hand: job.hand, name: beforeRec?.name ?? id, outcome: "unchanged", changes: [], says, summary: run.result, run: runInfo, history };
    }
    onStep("keeping the version before", 86);
    snapshot(id, `before: ${job.change}`, root);
  }
  const saved = engine === kit.HUMAN_ENGINE ? await saveHuman({ job, lab, run, runInfo, root, env, signal, onStep, log, before: beforeRec })
    : await saveBrush({ job, lab, runInfo, root, env, signal, onStep, log, renderDemo, before: beforeRec });
  const outcome = !from ? "created" : says.couldNot ? "partly" : "changed";
  const history = kit.addHistory(id, { kind: from ? "change" : "create", text: job.change ?? job.description, outcome, changes, says, ...runInfo }, root);
  rmSync(lab, { recursive: true, force: true });
  onStep("done", 100);
  return { ...saved, outcome, changes, says, summary: run.result, run: runInfo, history };
}

/** The anidoodle character: the gate again (the app's own run), the sheet and the walk rendered, everything into the store. */
export async function saveHuman({ job, lab, run, runInfo, root, env, signal, onStep, log, before = null }) {
  const { id, hand } = job, mod = join(lab, "anidoodle", "characters", id);
  if (!existsSync(mod)) throw Object.assign(new Error(`Claude did not write anidoodle/characters/${id}/`), { code: "CLAUDE_FAILED", detail: { lab } });
  onStep("checking the character gate", 87);
  const g = await tool(lab, ["tools/gate.mjs", "check.ts"], { root, env, signal });
  const m = /(\d+) passed, (\d+) failed/.exec(g.out), gate = m ? { passed: +m[1], failed: +m[2] } : { passed: 0, failed: null };
  log(`gate: ${m ? m[0] : "did not run"}`);
  if (g.code !== 0 || !m || gate.failed) throw Object.assign(new Error(`The character gate did not pass (${m ? m[0] : g.out.trim().split(/\r?\n/).pop()})`), { code: "GATE_FAILED", detail: { lab } });
  onStep("drawing the model sheet", 90);
  const s = await tool(lab, ["tools/still.mjs", "films/sheet.ts", "out/sheet.png"], { root, env, signal });
  if (s.code !== 0) throw Object.assign(new Error(`The model sheet could not be drawn: ${s.out.trim().split(/\r?\n/).pop()}`), { code: "RENDER_FAILED", detail: { lab } });
  onStep("rendering the walk", 94);
  const w = await tool(lab, ["tools/render.mjs", "films/walk.ts", "out/walk.mp4"], { root, env, signal });
  if (w.code !== 0) throw Object.assign(new Error(`The walk could not be rendered: ${w.out.trim().split(/\r?\n/).pop()}`), { code: "RENDER_FAILED", detail: { lab } });
  onStep("saving to the library", 98);
  if (kit.userStoreInRepo(root)) throw Object.assign(new Error("The characters store is inside the app's repository: a user's characters are never kept there"), { code: "INVALID" });
  const dir = join(kit.humanDir(root), id);
  rmSync(dir, { recursive: true, force: true });          // a change: the version before was kept first (snapshot)
  mkdirSync(join(dir, "module", "films"), { recursive: true });
  cpSync(mod, join(dir, "module", id), { recursive: true });
  for (const f of ["check.ts", "LEDGER.md"]) if (existsSync(join(lab, "anidoodle", f))) cpSync(join(lab, "anidoodle", f), join(dir, "module", f));
  for (const f of readdirSync(join(lab, "anidoodle", "films"))) cpSync(join(lab, "anidoodle", "films", f), join(dir, "module", "films", f), { recursive: true });
  await toWebp(root, join(lab, "out", "sheet.png"), join(dir, "sheet.webp"));
  cpSync(join(lab, "out", "walk.mp4"), join(dir, "walk.mp4"));
  await ff(root, ["-ss", "1.5", "-i", join(dir, "walk.mp4"), "-frames:v", "1", "-vf", "scale=640:-1", "-c:v", "libwebp", "-quality", "82", join(dir, "poster.webp")]);
  const own = readJson(join(lab, "anidoodle", "character.json"), {});
  const src = anidoodleSource(root);
  const savedName = job.name || before?.name || own.name || id;
  // its real height for The Studio's height chart: Claude's, a person's checked against its spec by heightFields
  const height = Number(own.heightM) > 0 ? { heightM: Number(own.heightM), heightBy: own.heightBy === "description" ? "description" : "inferred", heightNote: own.heightNote ?? null }
    : before?.heightM ? { heightM: before.heightM, heightBy: before.heightBy ?? "inferred", heightNote: before.heightNote ?? null } : {};
  const record = { id, name: savedName, about: alignAbout(own.about || before?.about || job.description, savedName), engine: kit.HUMAN_ENGINE, kind: job.rig ?? "human", ...height, hand, hands: [hand],
    description: job.description, version: (before?.version ?? 0) + 1, changes: [...(before?.changes ?? []), ...(job.change ? [{ at: new Date().toISOString(), text: job.change }] : [])],
    credit: { author: "The owner (made by Claude the author's way)", link: null, licence: "the owner's own; built on anidoodle (Apache-2.0)", made: "written from the idea",
      engine: src ? { repo: src.repo, commit: src.commit, link: `https://github.com/${src.repo}/tree/${src.commit}` } : null, run: before?.credit?.run ?? runInfo, gate },
    module: readdirSync(join(dir, "module"), { recursive: true }).map(String), savedAt: new Date().toISOString() };
  writeFileSync(join(dir, "character.json"), JSON.stringify(record, null, 2) + "\n");
  return { id, engine: kit.HUMAN_ENGINE, kind: record.kind, hand, name: record.name, gate };
}

/** The Brush character: its sheets drawn (when Claude did not), saved as a character from a film is, its showreel made. */
async function saveBrush({ job, lab, runInfo, root, env, signal, onStep, log, renderDemo, before = null }) {
  const { id } = job, cast = kit.readCast(lab);
  if (cast.problems.length) throw Object.assign(new Error(`CHARACTERS.json: ${cast.problems.join("; ")}`), { code: "CLAUDE_FAILED", detail: { lab } });
  const def = cast.characters.find((x) => x.id === id) ?? (cast.characters.length === 1 ? cast.characters[0] : null);
  if (!def) throw Object.assign(new Error(`Claude did not write the character "${id}"`), { code: "CLAUDE_FAILED", detail: { lab } });
  if (def.id !== id) { def.id = id; writeFileSync(join(lab, kit.CAST_FILE), JSON.stringify({ characters: [def] }, null, 2) + "\n"); }
  if (!["views", "emotions"].every((s) => existsSync(join(lab, "characters", "sheets", `${id}-${s}.png`)))) {
    onStep("drawing the model sheets", 88);
    const s = await tool(lab, ["tools/brush-sheets.mjs"], { root, env, signal });
    log(s.out.trim().split(/\r?\n/).pop() ?? "");
    if (s.code !== 0) throw Object.assign(new Error(`The model sheets could not be drawn: ${s.out.trim().split(/\r?\n/).pop()}`), { code: "RENDER_FAILED", detail: { lab } });
  }
  // the Brush gate: a new character is saved only after a pass, as an anidoodle one after its own gate
  onStep("checking the character gate", 90);
  const { stillStd } = await import("../hf-qa/gates.mjs");
  const g = brushGate(def, { sheetsDir: join(lab, "characters", "sheets"), still: stillStd, drawn: true }), gate = { passed: g.passed, failed: g.failed };
  log(`gate: ${g.passed} passed, ${g.failed} failed`);
  if (g.failed) throw Object.assign(new Error(`The character gate did not pass: ${g.lines.filter((l) => l.startsWith("FAIL")).map((l) => l.slice(6)).join(" | ")}`), { code: "GATE_FAILED", detail: { lab } });
  onStep("saving to the library", 92);
  const credit = { author: "The owner (made by Claude)", link: null, licence: "the owner's own", made: "written from the idea", madeNote: "a definition for the app's character layer on ClaudeAnimationBase's kit", run: runInfo };
  def.credit = { ...(before?.credit ?? credit), gate }; def.version = (before?.version ?? 0) + 1; def.description = before?.description || job.description;
  def.name = job.name || before?.name || def.name; def.about = alignAbout(def.about, def.name);          // the saved name everywhere
  def.kind = job.rig ?? before?.kind ?? "thing";          // an animal, a thing or a robot, as the layer draws it
  // its real height: Claude's in the definition, else the one saved before; marked as Claude gave it or inferred
  if (!(Number(def.heightM) > 0) && before?.heightM) Object.assign(def, { heightM: before.heightM, heightBy: before.heightBy ?? "inferred", heightNote: before.heightNote ?? null });
  if (Number(def.heightM) > 0) { def.heightM = Number(def.heightM); def.heightBy = def.heightBy === "description" ? "description" : "inferred"; } else delete def.heightM;
  writeFileSync(join(lab, kit.CAST_FILE), JSON.stringify({ characters: [def] }, null, 2) + "\n");
  const saved = kit.saveCharacter(lab, id, root);
  if (renderDemo) { onStep("rendering the showreel", 95); try { await renderDemo(id, { signal }); } catch (e) { log(`showreel: ${e.message}`); } }
  return { id, engine: "brush-kit", kind: def.kind, hand: "brush", name: saved?.name ?? def.name, gate };
}

// ---- versions and Undo: before a change is saved, the character as it was goes to <store>/_versions/<id>/<n>/ (the last 5 kept)
const engineOf = (id, root) => (kit.humanCharacters(root).some((c) => c.id === id) ? kit.HUMAN_ENGINE : kit.getCharacter(id, root)?.group === "yours" ? "brush-kit" : null);
/** Keep the character as it is now as a version: its n. */
export function snapshot(id, label, root = APP_ROOT) {
  const engine = engineOf(id, root);
  if (!engine) return null;
  const vd = join(kit.versionsDir(root), id), n = (kit.characterVersions(id, root).at(-1)?.n ?? 0) + 1, d = join(vd, String(n));
  mkdirSync(d, { recursive: true });
  if (engine === kit.HUMAN_ENGINE) cpSync(join(kit.humanDir(root), id), join(d, "human"), { recursive: true });
  else {
    cpSync(join(kit.userDir(root), `${id}.json`), join(d, "user.json"));
    if (existsSync(join(kit.mediaRoot(root), id))) cpSync(join(kit.mediaRoot(root), id), join(d, "media"), { recursive: true, filter: (s) => !/[\\/]work([\\/]|$)/.test(s.slice(join(kit.mediaRoot(root), id).length)) });
  }
  const rec = engine === kit.HUMAN_ENGINE ? readJson(join(kit.humanDir(root), id, "character.json")) : kit.getCharacter(id, root);
  writeFileSync(join(d, "version.json"), JSON.stringify({ at: new Date().toISOString(), label, engine, version: rec?.version ?? null }, null, 2) + "\n");
  for (const v of kit.characterVersions(id, root).slice(0, -5)) rmSync(join(vd, String(v.n)), { recursive: true, force: true });
  return n;
}
/** Undo the last change: the newest kept version back in place (and taken off the list). */
export function undo(id, root = APP_ROOT) {
  const v = kit.characterVersions(id, root).at(-1);
  if (!v) throw Object.assign(new Error("There is no earlier version to go back to"), { code: "NOT_FOUND" });
  const d = join(kit.versionsDir(root), id, String(v.n));
  if (existsSync(join(d, "human"))) { rmSync(join(kit.humanDir(root), id), { recursive: true, force: true }); cpSync(join(d, "human"), join(kit.humanDir(root), id), { recursive: true }); }
  else {
    cpSync(join(d, "user.json"), join(kit.userDir(root), `${id}.json`));
    rmSync(join(kit.mediaRoot(root), id), { recursive: true, force: true });
    if (existsSync(join(d, "media"))) cpSync(join(d, "media"), join(kit.mediaRoot(root), id), { recursive: true });
  }
  rmSync(d, { recursive: true, force: true });
  kit.addHistory(id, { kind: "undo", text: `back to the version of ${v.at ?? "before"}`, restored: v.version ?? null }, root);
  return { id, restored: v };
}

// ---- did a change happen: the definition (Brush) or the module's files (anidoodle) before and after, and what Claude says
const META = new Set(["credit", "version", "description", "savedAt", "from", "runs", "group", "demo", "selectable", "kind", "ownStyle", "heightM", "heightBy", "heightNote"]);          // not the character itself
function diffPaths(a, b, path = "", out = []) {
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!(path === "" && META.has(k))) diffPaths(a[k], b[k], path ? `${path}.${k}` : k, out);
    return out;
  }
  out.push(path || "(all)");
  return out;
}
function filesOf(dir, base = "") {
  if (!existsSync(dir)) return {};
  return Object.fromEntries(readdirSync(dir, { withFileTypes: true }).flatMap((x) => x.isDirectory() ? Object.entries(filesOf(join(dir, x.name), `${base}${x.name}/`))
    : [[`${base}${x.name}`, readFileSync(join(dir, x.name), "utf8")]]));
}
/** Claude's own last word on the change: { changed, couldNot } from its "Changed: …" / "Could not: …" lines. */
export function saysOf(text) {
  const t = String(text ?? ""), line = (k) => [...t.matchAll(new RegExp(`^\\W*${k}\\W*:\\s*(.+)$`, "gim"))].map((m) => m[1].replace(/^[*_s]+/, "").trim()).join(" ");
  // the labels in English as asked, or in Vietnamese when Claude wrote the whole reply in the user's language
  return { changed: line("(?:Changed|Đã đổi)") || null, couldNot: line("(?:Could not|Không làm được|Chưa làm được)") || null };
}

/** What a cast member is, for its gate: "shipped-rig" (the author's Bit or cheetah, as shipped), "rig" (an animal or a thing on a rig of its
 *  own, made for the film), "human" (a person on the human engine). */
export const kindOf = (c) => (c?.rig && c.made === "as shipped" && kit.AUTHOR_RIGS.some((a) => a.id === c.rig) ? "shipped-rig" : c?.rig || kit.ownRig(c?.kind) ? "rig" : "human");

/** The character gate of an anidoodle film's cast: each member's own gate (the author's runner, as in the lab), once per
 *  gate file. { pass, characters: [{ id, kind, check, passed, failed, lines }] }. A member is checked by its OWN gate, whatever it is
 *  (a turtle is not a person): a person on the human engine, an animal or a thing on its own rig. Only the author's rigs as
 *  shipped (Bit, the cheetah) need none; any other member without a gate fails, and every failure says why. A Brush cartoon member
 *  (a definition for the app's character layer) is checked by the Brush gate (brushgate.mjs, its sheets included), so a
 *  new Brush character is approved only after a pass too. Each member says whether it came from the library in its own style
 *  (ownStyle, only its gate to run). */
export async function filmGate(projectDir, { root = APP_ROOT, signal = null } = {}) {
  // a bare list in CHARACTERS.json is the cast too (kit.readCast reads both)
  const all = kit.readCast(projectDir).characters, runs = new Map(), out = [];
  const cast = all.filter((c) => c?.engine === kit.HUMAN_ENGINE), brush = all.filter((c) => c && c.engine !== kit.HUMAN_ENGINE);
  if (brush.length) {
    const { stillStd } = await import("../hf-qa/gates.mjs");
    for (const c of brush) out.push({ ...brushGate(c, { sheetsDir: join(projectDir, "characters", "sheets"), still: stillStd, drawn: true }), kind: "brush", check: "brush-gate", ownStyle: !!c.ownStyle });
  }
  for (const c0 of cast) {
    const kind = kindOf(c0);
    // a gate left out of CHARACTERS.json but written where the recipe puts it is the character's gate
    const found = !c0.check && kind !== "shipped-rig" ? [`characters/${c0.id}/check.ts`, `check-${c0.id}.ts`].find((f) => existsSync(join(projectDir, "anidoodle", ...f.split("/")))) : null;
    const c = found ? { ...c0, check: found } : c0;
    if (!c.check && kind === "shipped-rig") { out.push({ id: c.id, kind, check: null, passed: 1, failed: 0, lines: ["the author's own rig, as shipped (audit 73 Q8): no gate of its own"], ownStyle: !!c.ownStyle }); continue; }
    if (!c.check) { out.push({ id: c.id, kind, check: null, passed: 0, failed: 1, lines: [`FAIL  no gate: write anidoodle/characters/${c.id}/check.ts exporting run() with ${kind === "rig" ? "this character's own rig rules (its bones keep their lengths, its joints stay in its own ranges, planted feet never slide)" : "the author's human checks (canon, poses inside the joint limits, hands, identity per view)"}, and name it in CHARACTERS.json "check"`] }); continue; }
    if (!runs.has(c.check)) runs.set(c.check, await tool(projectDir, [join(TOOLS, "gate.mjs"), c.check], { root, signal, timeout: 300000 }));
    const g = runs.get(c.check), m = /(\d+) passed, (\d+) failed/.exec(g.out), lines = g.out.split(/\r?\n/);
    const said = lines.filter((l) => /FAIL|passed, /.test(l)).slice(0, 40);
    // a gate that died without its verdict: its own last words, never an empty reason
    const why = m ? said : [...said, `FAIL  the gate did not finish: ${lines.map((l) => l.trim()).filter((l) => l && !/^at |^node:|^\^|^\s*$/.test(l)).slice(0, 4).join(" | ").slice(0, 600) || "no output"}`];
    out.push({ id: c.id, kind, check: c.check, passed: m ? +m[1] : 0, failed: m ? +m[2] : 1, lines: why, ownStyle: !!c.ownStyle });
  }
  return { pass: out.every((x) => !x.failed), characters: out };
}

/** One frame of a film module of a project (an anidoodle film's character sheet) as a PNG, through the lab's still tool: { ok, error }. */
export async function filmStill(projectDir, film, out, { root = APP_ROOT, env = {}, signal = null } = {}) {
  // drawn in a scratch copy: the lab tools write their own index.html and anidoodle/page.ts, never the film's; the copy holds the
  // film's modules, its cast, the staged engine and its design pictures
  const work = mkdtempSync(join(tmpdir(), "mw-sheet-"));
  try {
    const take = (rel) => { const from = join(projectDir, ...rel.split("/")); if (existsSync(from)) cpSync(from, join(work, ...rel.split("/")), { recursive: true }); };
    ["anidoodle", "assets/1_design/images"].forEach(take);
    stageEngine(work, root);          // the engine linked as in the film (a copy of the film's link would be a symlink: EPERM)
    // the cast where the lab tools read it, at the copy's root (the film keeps it in docs/)
    const cast = docPath(projectDir, kit.CAST_FILE);
    if (existsSync(cast)) cpSync(cast, join(work, kit.CAST_FILE));
    const r = await tool(work, [join(TOOLS, "still.mjs"), film, resolve(out)], { root, env, signal, timeout: 600000 });
    if (r.code !== 0) return { ok: false, error: sheetError(r.out) };
    // the words the sheet drew, read in the page the still tool left (labels on each other or on the drawing)
    const { sheetLabels } = await import("./sheetLabels.mjs");
    return { ok: true, labels: await sheetLabels(work, { root }) };
  } finally { rmSync(work, { recursive: true, force: true }); }
}
/** The tool's failure in one plain line (HyperFrames' own long warning would otherwise reach the user as the reason). */
export function sheetError(out) {
  const lines = String(out ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.some((l) => /sub_timeline_readiness_timeout|did not become ready/i.test(l))) return "the sheet page never got ready to draw (its module must export its film, or call mountFilm(film))";
  const line = lines.find((l) => !/^at |^-\s/.test(l)) ?? lines.at(-1);
  return line ? line.replace(/^render (failed|cancelled):\s*/i, "").slice(0, 240) : "the sheet could not be drawn";
}

/** The saved name everywhere: an `about` that opens with another name ("Kimchi, a small …", "Kimchi is …", "Kimchi the …") opens
 *  with the saved one instead. */
export function alignAbout(about, name) {
  const a = String(about ?? ""), n = String(name ?? "").trim();
  if (!n) return a;
  const m = /^([A-Z][\p{L}'’-]*(?: [A-Z][\p{L}'’-]*){0,2})(?=,| is | the )/u.exec(a);
  return m && m[1] !== n ? n + a.slice(m[1].length) : a;
}

/** Delete one of the user's anidoodle characters (Mira and Theo, the author's, stay). */
export function deleteHuman(id, root = APP_ROOT) {
  const c = kit.humanCharacters(root).find((x) => x.id === id);
  if (!c) throw Object.assign(new Error("No such character"), { code: "NOT_FOUND" });
  if (c.credit?.made === "as shipped") throw Object.assign(new Error(`${c.name} is anidoodle's own (as shipped): it stays`), { code: "INVALID" });
  rmSync(join(kit.humanDir(root), id), { recursive: true, force: true }); rmSync(join(kit.humanDir(root), `.previous-${id}`), { recursive: true, force: true });
  kit.forgetHistory(id, root);
  return { deleted: id };
}

// Claude's runs: the settings a task runs with, the Claude Code arguments for each mode and web choice, one session per
// pipeline step, usage, the user's answers to Claude's questions, and the app's MCP permission tool speaking JSON-RPC to Claude Code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-agent-"));
process.env.MW_STATE_DIR = join(T, "state");
const A = await import("../packages/agent/index.mjs");

test("settings: 5.5 models only, auto by default, a project's own choices on top, Bypass only with the experiment", () => {
  assert.deepEqual(A.MODELS.map((m) => m[2]), ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"]);
  const g = A.agentSettings();
  assert.equal(g.mode, "auto"); assert.equal(g.web, "on", "the web is on by default (owner 21/10, QC #178)"); assert.equal(g.model, "opus");
  assert.equal(g.effort, "high", "QC4-8: high by default, as New project; only the Motion Plan's own step runs at medium");
  assert.throws(() => A.saveAgentSettings({ model: "fable" }), { code: "INVALID" });
  assert.throws(() => A.saveAgentSettings({ mode: "bypassPermissions" }), { code: "INVALID" }, "bypass needs the experiment");
  A.saveAgentSettings({ allowBypass: true, mode: "bypassPermissions" });
  assert.equal(A.agentSettings().mode, "bypassPermissions");
  A.saveAgentSettings({ allowBypass: false });
  assert.equal(A.agentSettings().mode, "auto", "turning the experiment off leaves bypass");
  const own = A.projectSettingsPatch({ settings: { model: "haiku" } }, { effort: "high", web: "on", model: "global" });
  assert.deepEqual(own, { effort: "high", web: "on" });
  assert.deepEqual(A.effectiveSettings({ settings: own }), { model: "opus", effort: "high", mode: "auto", web: "on" });
  assert.equal(A.effectiveSettings({ settings: { model: "default" } }).model, "opus", "old 'Account default' runs Opus 5.5");
});

test("Claude Code arguments: restricted with file tools; web as the project says; the app's permission tool; bypass unrestricted", () => {
  const base = { systemPrompt: "SP", sessionArgs: ["--session-id", "x"] };
  const off = A.claudeArgs({ ...base, settings: { mode: "auto", web: "off", model: "opus", effort: "medium" } });
  assert.ok(off.includes("--restricted") && !off.includes("--safe-mode"));
  assert.equal(off[off.indexOf("--tools") + 1], "Read,Edit,Write,Glob,Grep");
  assert.equal(off[off.indexOf("--permission-prompts") + 1], "none");
  assert.equal(off[off.indexOf("--model") + 1], "claude-opus-5-5");
  const ask = A.claudeArgs({ ...base, mcpConfig: "{}", settings: { mode: "auto", web: "ask", model: "haiku", effort: "low" } });
  assert.match(ask[ask.indexOf("--tools") + 1], /WebFetch,WebSearch/);
  assert.equal(ask[ask.indexOf("--permission-prompt-tool") + 1], "mcp__mw__permit");
  assert.deepEqual(JSON.parse(ask[ask.indexOf("--settings") + 1]), { permissions: { ask: ["WebFetch", "WebSearch"] } }, "Auto still asks before the web");
  const on = A.claudeArgs({ ...base, mcpConfig: "{}", settings: { mode: "manual", web: "on", model: "sonnet", effort: "high" } });
  assert.ok(!on.includes("--settings"));
  assert.equal(on[on.indexOf("--permission-mode") + 1], "manual");
  const bp = A.claudeArgs({ ...base, settings: { mode: "bypassPermissions", web: "on", model: "opus", effort: "max" } });
  assert.ok(!bp.includes("--restricted") && !bp.includes("--tools") && bp.includes("bypassPermissions"));
});

test("one Claude session per pipeline step; a chat message continues the last step's; the older single session is the chat's", () => {
  const d = join(T, "p1"); mkdirSync(join(d, ".moworks"), { recursive: true });
  assert.deepEqual(A.readConversation(d), { sessions: {}, current: null });
  writeFileSync(join(d, ".moworks", "claude.json"), JSON.stringify({ sessionId: "old", model: "m" }));
  const c = A.readConversation(d);
  assert.equal(c.sessions.chat.sessionId, "old"); assert.equal(c.current, "chat");
  assert.equal(A.sessionKey(c, "storyboard"), "storyboard");
  assert.equal(A.sessionKey({ sessions: { storyboard: {} }, current: "storyboard" }, null), "storyboard");
  assert.equal(A.sessionKey({ sessions: {}, current: null }, null), "chat");
  // A chat change after a long step opens the chat's own small conversation; a short one is continued; a step is its own
  assert.deepEqual(A.taskSession({ sessions: { build: { context: 358000 } }, current: "build" }, null), { key: "chat", fresh: true });
  assert.deepEqual(A.taskSession({ sessions: { brief: { context: 38000 } }, current: "brief" }, null), { key: "brief", fresh: false });
  assert.deepEqual(A.taskSession({ sessions: { build: { context: 358000 } }, current: "build" }, "qcReview"), { key: "qcReview", fresh: false });
});

test("the notes between tool calls show live, so they are in the user's language, plain, with no file or engine words", () => {
  const sp = (lang) => A.systemPrompt({ meta: { title: "x" }, rules: [], shots: [], dir: process.cwd(), lang });
  assert.match(sp("vi"), /notes between your tool calls too, shows to the owner at once[^\n]*write each in Vietnamese[^\n]*Tôi đang đọc cách vẽ kiểu Storybook/);
  assert.match(sp("vi"), /Never a file name, a path, code or the app's and engines' own words \(contract, host, module, engine code/);
  assert.match(sp("en"), /write each in English[^\n]*I'm reading how the Storybook style draws/);
});

test("usage: Claude Code's result read as tokens, API-equivalent cost and turns; a project's totals", () => {
  const u = A.usageOf({ total_cost_usd: 0.25, num_turns: 4, duration_ms: 9000, modelUsage: { "claude-opus-5-5": {} },
    usage: { input_tokens: 10, cache_creation_input_tokens: 2000, cache_read_input_tokens: 30000, output_tokens: 500 } });
  assert.deepEqual(u, { input: 10, cacheWrite: 2000, cacheRead: 30000, output: 500, costUsd: 0.25, turns: 4, durationMs: 9000, models: ["claude-opus-5-5"] });
  const t = A.usageTotals([{ usage: u }, { usage: { ...u, costUsd: 0.5 } }, {}]);
  assert.equal(t.tasks, 3, "Test 12: a task with no usage recorded (stopped) still counts"); assert.equal(t.costUsd, 0.75); assert.equal(t.cacheRead, 60000);
});

test("questions: the web in an 'ask' project waits for the user; 'project' turns the web on; a closed task answers no", async () => {
  let meta = { settings: { web: "ask" } };
  const agent = new A.Agent({ getProject: () => ({ meta }), updateMeta: (id, fn) => fn(meta), permitUrl: "x" });
  const task = { id: "t1", projectId: "p", status: "running", events: [] };
  agent.tasks.set("t1", task);
  const asked = agent.permit("t1", { tool_name: "WebFetch", input: { url: "https://example.com" } });
  assert.equal(task.permission.tool, "WebFetch");
  assert.ok((await agent.waitAnswer(task.permission.id, 20)).pending, "still waiting for the owner");
  assert.equal(task.permission.what, "https://example.com");
  const id = task.permission.id;
  const waiting = agent.waitAnswer(id, 5000);
  agent.answer("p", "t1", id, "project");
  assert.deepEqual(await waiting, { behavior: "allow" });
  assert.deepEqual(await asked, { behavior: "allow" });
  assert.equal(meta.settings.web, "on");
  assert.throws(() => agent.answer("p", "t1", id, "allow"), { code: "NOT_FOUND" }, "answered once");
  assert.deepEqual(await agent.permit("t1", { tool_name: "WebSearch", input: { query: "q" } }), { behavior: "allow" }, "web on: no question");
  meta = { settings: { web: "ask" } };
  const p = agent.permit("t1", { tool_name: "Write", input: { file_path: "a.txt" } });
  agent.closeQuestions("t1");
  assert.equal((await p).behavior, "deny");
});

test("the app's MCP permission tool: initialize, tools/list, a call answered by the app (asked again while pending)", { timeout: 20000 }, async () => {
  let calls = 0;
  const srv = createServer(async (req, res) => {
    let b = ""; for await (const c of req) b += c;
    calls++;
    assert.equal(req.headers["x-mw-token"], "tok");
    const body = JSON.parse(b);
    res.setHeader("Content-Type", "application/json");
    if (req.url.endsWith("/wait")) return res.end(JSON.stringify({ behavior: "allow" }));
    assert.equal(body.task, "task9"); assert.equal(body.tool_name, "WebFetch");
    res.end(JSON.stringify({ pending: "q1" }));
  });
  await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
  const c = spawn(process.execPath, [join(import.meta.dirname, "..", "packages", "agent", "permit-mcp.mjs")],
    { env: { ...process.env, MW_PERMIT_URL: `http://127.0.0.1:${srv.address().port}/api/agent/permit`, MW_PERMIT_TOKEN: "tok", MW_PERMIT_TASK: "task9" }, windowsHide: true });
  const replies = new Map(); let buf = "";
  c.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); replies.get(m.id)?.(m); } });
  const rpc = (id, method, params) => new Promise((ok) => { replies.set(id, ok); c.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"); });
  assert.equal((await rpc(1, "initialize", { protocolVersion: "2025-06-18" })).result.serverInfo.name, "mw");
  assert.equal((await rpc(2, "tools/list", {})).result.tools[0].name, "permit");
  const r = await rpc(3, "tools/call", { name: "permit", arguments: { tool_name: "WebFetch", input: { url: "https://example.com" } } });
  assert.deepEqual(JSON.parse(r.result.content[0].text), { behavior: "allow", updatedInput: { url: "https://example.com" } });
  assert.equal(calls, 2, "asked, then asked again");
  c.kill(); srv.close();
});

test("each step names the rule files it must read (with HyperFrames' references for the work); the guard blocks the first edit once until they are read", async () => {
  const { requiredReads } = await import("../packages/agent/reads.mjs");
  const { readsIn, decide } = await import("../packages/agent/read-guard.mjs");
  const d = join(T, "reads");
  for (const f of ["general-style/SKILL.md", "general-style/references/story.md", "general-style/references/inputs.md", "general-style/references/storyboard.md",
    "hyperframes/references/storyboard-format.md", "hyperframes/SKILL.md", "hyperframes/references/look.md", "hyperframes/references/spec.md",
    "hyperframes/references/types/launch.md", "moworks-qc/SKILL.md",
    // every HyperFrames reference a step names, so each exact list below says what the step requires when the project has them all
    "hyperframes/references/story.md", "hyperframes/references/storyboard.md", "hyperframes/references/motion.md", "hyperframes/references/format.md",
    "hyperframes/references/runtimes.md", "hyperframes/references/review.md"]) {
    const p = join(d, ".moworks", "rules", ...f.split("/")); mkdirSync(join(p, ".."), { recursive: true }); writeFileSync(p, "---\ndescription: x\n---\n");
  }
  assert.deepEqual(requiredReads(d, { styleId: "general", step: "brief" }), [".moworks/rules/general-style/SKILL.md", ".moworks/rules/general-style/references/story.md", ".moworks/rules/general-style/references/inputs.md",
    ".moworks/rules/hyperframes/references/story.md"]);
  const sb = requiredReads(d, { styleId: "general", step: "storyboard" });
  assert.ok(sb.includes(".moworks/rules/hyperframes/references/storyboard-format.md") && sb.includes(".moworks/rules/hyperframes/SKILL.md") && sb.includes(".moworks/rules/hyperframes/references/look.md"),
    "HyperFrames' references for a storyboard: the board format, the contract, the look");
  assert.deepEqual(requiredReads(d, { styleId: "general", step: "motionSpec" }), [".moworks/rules/general-style/SKILL.md", ".moworks/rules/hyperframes/references/motion.md"], "only the files the project has");
  assert.deepEqual(requiredReads(d, { styleId: "hf-launch", first: [".moworks/rules/hyperframes/SKILL.md"], step: "build" }),
    [".moworks/rules/hyperframes/SKILL.md", ".moworks/rules/hyperframes/references/types/launch.md", ".moworks/rules/hyperframes/references/format.md",
      ".moworks/rules/hyperframes/references/runtimes.md", ".moworks/rules/hyperframes/references/motion.md"], "a HyperFrames film type: the entry and its type's file in every step; the build's references");
  assert.deepEqual(requiredReads(d, { styleId: "hf-launch", first: [".moworks/rules/hyperframes/SKILL.md"], step: "storyboard" }),
    [".moworks/rules/hyperframes/SKILL.md", ".moworks/rules/hyperframes/references/types/launch.md", ".moworks/rules/hyperframes/references/spec.md",
      ".moworks/rules/hyperframes/references/look.md", ".moworks/rules/hyperframes/references/storyboard.md", ".moworks/rules/hyperframes/references/storyboard-format.md"],
    "its storyboard: the spec, the look, the storyboard and the board format");
  assert.deepEqual(requiredReads(d, { styleId: "hf-launch", first: [".moworks/rules/hyperframes/SKILL.md"], step: "qcReview" }),
    [".moworks/rules/moworks-qc/SKILL.md", ".moworks/rules/hyperframes/references/review.md"], "its Review: the QC review and HyperFrames' review reference");
  // a Lemo-Opuscar style: its STYLE.md and the app's lemo pack in every step; the demo from the build on, once staged
  for (const f of ["lemo-ink-wash/SKILL.md", "lemo-opuscar/SKILL.md"]) {
    const p = join(d, ".moworks", "rules", ...f.split("/")); mkdirSync(join(p, ".."), { recursive: true }); writeFileSync(p, "---\ndescription: x\n---\n");
  }
  const lemoSb = requiredReads(d, { styleId: "lemo-ink-wash", step: "storyboard" });
  assert.deepEqual(lemoSb.slice(0, 2), [".moworks/rules/lemo-ink-wash/SKILL.md", ".moworks/rules/lemo-opuscar/SKILL.md"]);
  assert.ok(lemoSb.includes(".moworks/rules/hyperframes/references/storyboard-format.md") && !lemoSb.some((p) => p.includes("library/lemo")), "no demo before the build");
  assert.ok(!requiredReads(d, { styleId: "lemo-ink-wash", step: "build" }).some((p) => p.includes("library/lemo")), "a demo not staged is not required");
  const demo = join(d, ".moworks", "library", "lemo", "ink-wash", "DEMO.md"); mkdirSync(join(demo, ".."), { recursive: true }); writeFileSync(demo, "# demo\n");
  assert.ok(requiredReads(d, { styleId: "lemo-ink-wash", step: "build" }).includes(".moworks/library/lemo/ink-wash/DEMO.md"));
  assert.deepEqual(requiredReads(d, { styleId: "lemo-ink-wash", step: "qcReview" }), [".moworks/rules/moworks-qc/SKILL.md", ".moworks/rules/lemo-ink-wash/SKILL.md", ".moworks/library/lemo/ink-wash/DEMO.md"]);
  // the Look the app wrote: frame.md is read in the steps that design, move, build and check the picture, never in the brief
  writeFileSync(join(d, "frame.md"), "---\nname: Coral\n---\n");
  assert.ok(requiredReads(d, { styleId: "general", step: "storyboard" }).includes("frame.md"));
  assert.ok(requiredReads(d, { styleId: "hf-launch", first: [".moworks/rules/hyperframes/SKILL.md"], step: "build" }).includes("frame.md"));
  assert.ok(!requiredReads(d, { styleId: "general", step: "brief" }).includes("frame.md"));
  assert.ok(readsIn(JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: join(d, "frame.md") } }] } }), d).has("frame.md"), "the guard sees it read");
  unlinkSync(join(d, "frame.md"));
  const line = (p) => JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: p } }] } });
  const read = readsIn([line(join(d, ".moworks", "rules", "general-style", "SKILL.md")), line(".moworks/rules/general-style/references/story.md")].join("\n"), d);
  const req = requiredReads(d, { styleId: "general", step: "brief" });
  const first = decide({ required: req, read, warned: false });
  assert.equal(first.block, true); assert.deepEqual(first.missing, [".moworks/rules/general-style/references/inputs.md", ".moworks/rules/hyperframes/references/story.md"]);
  assert.match(first.message, /inputs\.md/);
  assert.equal(decide({ required: req, read, warned: true }).block, false, "told once; the work is never stopped twice");
  read.add(".moworks/rules/general-style/references/inputs.md"); read.add(".moworks/rules/hyperframes/references/story.md");
  assert.equal(decide({ required: req, read, warned: false }).block, false);
  const args = A.claudeArgs({ settings: { mode: "auto", web: "ask" }, systemPrompt: "SP", sessionArgs: [], guard: "\"node\" \"g.mjs\"" });
  const st = JSON.parse(args[args.indexOf("--settings") + 1]);
  assert.deepEqual(st.permissions, { ask: ["WebFetch", "WebSearch"] });
  assert.equal(st.hooks.PreToolUse[0].matcher, "Write|Edit|MultiEdit|NotebookEdit");
  assert.equal(st.hooks.PreToolUse[0].hooks[0].command, "\"node\" \"g.mjs\"");
});

test("a task's checks run after it ends (the film is free for Render meanwhile); their result joins the task", { timeout: 300000 }, async () => {
  const { cpSync } = await import("node:fs");
  const dir = join(T, "late-checks"); cpSync(join(import.meta.dirname, "fixtures", "minimal"), dir, { recursive: true });
  const meta = {};
  const agent = new A.Agent({ getProject: () => ({ id: "p", path: dir, meta }), updateMeta: (id, fn) => fn(meta) });
  const task = { id: "t9", projectId: "p", status: "done", events: [], qa: null, qaPending: true };
  agent.lateChecks.set("t9", dir);
  assert.equal(agent.running.has("p"), false, "nothing holds the film while the checks run");
  await agent.runLateChecks(task);
  assert.equal(typeof task.qa?.pass, "boolean", JSON.stringify(task.qa));
  assert.ok(task.qa.checks > 0);
  assert.equal(agent.lateChecks.has("t9"), false);
});

test("what Claude is doing now, for the Editor's progress: a plain kind and since when, never a file", () => {
  assert.deepEqual(A.doingOf("Read", "t"), { kind: "read", at: "t" });
  assert.deepEqual(A.doingOf("MultiEdit", "t"), { kind: "edit", at: "t" });
  assert.deepEqual(A.doingOf("mcp__mw__board_stills", "t"), { kind: "app", tool: "board_stills", at: "t" });
  assert.equal(A.doingOf("Something", "t").kind, "work");
});

test("a short reply with no accent keeps the chat's language; a sentence decides", () => {
  assert.equal(A.ownerLanguage(["ok", "Giữ 9:16 nha", "Phim về chú báo"]), "vi", "\"ok\" in a Vietnamese chat");
  assert.equal(A.ownerLanguage(["B", null, "Phim về chú báo"]), "vi");
  assert.equal(A.ownerLanguage(["Please make the logo bigger", "Phim về chú báo"]), "en", "an English sentence");
  assert.equal(A.ownerLanguage(["yes", "Make it a cheetah film"]), "en");
  assert.equal(A.ownerLanguage([]), "vi");
});

test("Prepare sorts pictures in the scene from actors; one question with three choices only where the style has a character engine; a library character in its own style is never redrawn", () => {
  const brush = A.actorsLine({ style: { id: "brush-cartoon" } });
  assert.match(brush, /never stop the film/);
  assert.match(brush, /three choices.*library.*Character creator.*go on without/);
  assert.match(brush, /never redrawn and never asked about again \(#406\)/);
  assert.match(A.actorsLine({ style: { id: "general" } }), /no character engine: an actor is drawn again/);
  assert.match(A.actorsLine({ style: { id: "lemo-archive-lighttable" } }), /never redraws a character/);
  for (const x of [brush, A.actorsLine({ style: { id: "general" } })]) assert.match(x, /Never drop a character silently/);
  const sp = (step) => A.systemPrompt({ meta: { title: "x", style: { id: "general", title: "General Style", source: "x" } }, rules: [], shots: [], dir: process.cwd(), step });
  assert.match(sp("brief"), /Pictures and actors/); assert.doesNotMatch(sp("build"), /Pictures and actors/);
});

test("the 5-minute prompt cache for every Claude call; effort per step: only the Motion Plan at medium, every other step and the chat at least high", async () => {
  const { claudeEnv } = await import("../packages/system-status/index.mjs");
  assert.equal(claudeEnv({}).FORCE_PROMPT_CACHING_5M, "1");
  assert.deepEqual([claudeEnv({}).HYPERFRAMES_NO_TELEMETRY, claudeEnv({}).DO_NOT_TRACK], ["1", "1"], "HF's usage data off in Claude's Bash too");
  assert.deepEqual(A.stepEffort("high", { id: "motionSpec", effort: "medium" }), { effort: "medium", rule: "step" });
  assert.deepEqual(A.stepEffort("max", { id: "motionSpec", effort: "medium" }), { effort: "medium", rule: "step" }, "a higher project effort: the Motion Plan stays medium");
  assert.deepEqual(A.stepEffort("medium", { id: "storyboard" }), { effort: "high", rule: "min" });
  assert.deepEqual(A.stepEffort("low", null), { effort: "high", rule: "min" }, "the chat too");
  assert.deepEqual(A.stepEffort("xhigh", { id: "build" }), { effort: "xhigh", rule: null }, "never lowered");
  const { stylePipeline } = await import("../packages/style-catalog/index.mjs");
  for (const id of ["general", "brush-cartoon"]) assert.deepEqual(stylePipeline(id).filter((s) => s.effort).map((s) => [s.id, s.effort]), [["motionSpec", "medium"]], id);
});

test("one stop-and-ask rule for every conflict and missing thing; no prompt decides one and goes on", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const studio = readFileSync(join(import.meta.dirname, "..", "config", "rules", "moworks-studio", "SKILL.md"), "utf8");
  assert.match(studio, /### 2b\. A conflict or a missing thing: stop/);
  const cfg = join(import.meta.dirname, "..", "config");
  for (const f of readdirSync(cfg).filter((n) => /(styles|pipeline)\.json$/.test(n))) {
    const t = readFileSync(join(cfg, f), "utf8");
    for (const bad of ["say so in one line in ASSETS.md", "wins for its part, with no question", "truly cannot be made without"]) assert.ok(!t.includes(bad), `${f}: ${bad}`);
  }
  const locked = A.designLines({ designLocked: true }, null).join(" ");
  assert.match(locked, /conflict: stop/); assert.doesNotMatch(locked, /in one line, the owner confirms/);
  const kit = A.designLines({ look: { id: "frame/x", title: "X" } }, null).join(" ");
  assert.match(kit, /differs from it is a conflict: stop and ask/);
  const sp = A.systemPrompt({ meta: { title: "x" }, rules: [], shots: [], dir: process.cwd(), step: "brief" });
  assert.match(sp, /that is a conflict \(moworks-studio §2b/); assert.doesNotMatch(sp, /follow the brief for that part and say so in one line/);
});

test("Claude never asks to be told when the next step starts (the Storyboard starts by itself) and writes whole sentences", () => {
  const sp = A.systemPrompt({ meta: { title: "x" }, rules: [], shots: [], dir: process.cwd(), step: "brief" });
  assert.match(sp, /never end a step asking the owner to tell you when to start the next one/);
  assert.match(sp, /write every sentence whole/);
});

test("the words the user reads in the dialogs (frame titles, option names, shot names) follow the chat's language, one per title", () => {
  const sp = (lang) => A.systemPrompt({ meta: { title: "x" }, rules: [], shots: [], dir: process.cwd(), lang });
  assert.match(sp("vi"), /storyboard's frame titles and scene lines, each option's name, the Motion Plan's shot names[^.]*: in Vietnamese only, never two languages in one title/);
  assert.match(sp("en"), /: in English only, never two languages in one title/);
});

test("an anidoodle film's actors line gives the animal or thing entry (anidoodle's engine, its own rig and check); Brush's does not", () => {
  const ani = A.actorsLine({ style: { id: "anidoodle-fox" } });
  assert.match(ani, /An animal or a thing on anidoodle's engine: \{ id, name, about, engine: "anidoodle-human"[^}]*rig: "<id>", import: "\.\/characters\/<id>", check: "characters\/<id>\/check\.ts", hand \}/);
  assert.match(ani, /never the human limits/);
  assert.match(ani, /A person: no rig, its check "check-<id>\.ts"/);
  assert.doesNotMatch(A.actorsLine({ style: { id: "brush-cartoon" } }), /anidoodle's engine/);
});

test("an author's font with no Vietnamese letters is a stop with choices in Prepare, never a swap (the rules and the gallery note)", async () => {
  const read = (f) => readFileSync(new URL(`../config/rules/${f}`, import.meta.url), "utf8");
  assert.match(read("lemo-opuscar/SKILL.md"), /when the style's face has none, that is a conflict with the author's\s+design \(moworks-studio §2b[^]*never swap it on your own/);
  assert.doesNotMatch(read("lemo-opuscar/SKILL.md"), /take the closest face that has them and\s+say so/);
  assert.match(read("mg-styles/SKILL.md"), /a stop in Prepare with choices \(moworks-studio §2b, #458\), never a swap/);
  assert.match(read("moworks-studio/SKILL.md"), /the film style's own font \(the author's\s+face\) when it cannot draw the Vietnamese letters[^]*never swap it/);
  assert.doesNotMatch(readFileSync(new URL("../packages/style-catalog/index.mjs", import.meta.url), "utf8"), /Claude uses the closest face/);
});

test("a task stopped before Claude Code's result still records what its messages used, at the model's list price", async () => {
  const { cpSync } = await import("node:fs");
  const dir = join(T, "stopped-cost"); cpSync(join(import.meta.dirname, "fixtures", "minimal"), dir, { recursive: true });
  (await import("../packages/revisions/index.mjs")).ensureRepo(dir);
  const meta = {};
  const agent = new A.Agent({ getProject: () => ({ id: "p", path: dir, meta }), updateMeta: (id, fn) => fn(meta) });
  const task = { id: "t10", projectId: "p", status: "running", events: [], createdAt: new Date(Date.now() - 371000).toISOString() };
  const msg = (id, usage) => JSON.stringify({ type: "assistant", message: { id, model: "claude-opus-5-5", usage, content: [{ type: "text", text: "x" }] } });
  agent.onLine(task, msg("m1", { input_tokens: 10, cache_creation_input_tokens: 20000, cache_read_input_tokens: 0, output_tokens: 100 }), dir);
  agent.onLine(task, msg("m1", { input_tokens: 10, cache_creation_input_tokens: 20000, cache_read_input_tokens: 0, output_tokens: 900 }), dir);          // the same message, a later block
  agent.onLine(task, msg("m2", { input_tokens: 5, cache_creation_input_tokens: 1000, cache_read_input_tokens: 200000, output_tokens: 2000 }), dir);
  task.status = "cancelling";
  await agent.finishInner(task, dir, 1, "");
  assert.equal(task.status, "cancelled");
  // (15 × 4 + 21000 × 5 + 200000 × 0.2 + 2900 × 20) / 1e6
  assert.deepEqual([task.usage.costUsd, task.usage.turns, task.usage.output, task.usage.estimated], [0.20306, 2, 2900, true]);
  assert.ok(task.durationMs >= 371000);
  assert.equal(task.liveUsage, undefined, "the per-message record is not kept");
  assert.equal(A.liveUsage({ a: { model: "claude-sonnet-5-5", u: { input_tokens: 1e6 } } }).costUsd, 2);
});

test("a chat fix on a built film is looked at with qc_sheets, and the user is never told to render again", () => {
  const sp = (meta, step = null) => A.systemPrompt({ meta: { title: "x", ...meta }, rules: [], shots: [], dir: process.cwd(), step });
  assert.match(sp({ pipeline: { finished: { at: "t" } } }), /Call qc_sheets once[^]*never tell the owner to render again/);
  assert.match(sp({ pipeline: { ran: { build: { at: "t" } } } }), /never tell the owner to render again/);
  assert.doesNotMatch(sp({}), /never tell the owner to render again/, "before the build there is nothing to look at");
  assert.doesNotMatch(sp({ pipeline: { finished: { at: "t" } } }, "qcReview"), /never tell the owner to render again/, "steps have their own rules");
});

test("a step after the approved storyboard never rewrites its frames: they go back as approved, the step's status lines kept", async () => {
  const { cpSync } = await import("node:fs");
  const { readFileSync: rf } = await import("node:fs");
  const P = await import("../packages/pipeline/index.mjs");
  const dir = join(T, "keep-sb"); cpSync(join(import.meta.dirname, "fixtures", "minimal"), dir, { recursive: true });
  const rev = await import("../packages/revisions/index.mjs");
  const approved = "# Film\n\n## Frame 1 — Open\n\n- duration: 2s\n- scene: a desk\n\n## Frame 2 — Hook\n\n- duration: 3.32s\n- scene: the cup\n";
  writeFileSync(join(dir, "STORYBOARD.md"), approved);
  rev.ensureRepo(dir); const before = rev.commitAll(dir, "approved") ?? rev.head(dir);
  const meta = { approvals: { storyboard: { at: new Date().toISOString(), contentHash: P.storyboardHash(approved) } } };
  const order = ["brief", "storyboard", "motionSpec", "build"];
  const agent = new A.Agent({ getProject: () => ({ id: "p", path: dir, meta }), updateMeta: (id, fn) => fn(meta), stepOf: (m, s, all) => (all ? order.map((id) => ({ id })) : { id: s }) });
  // the Build moved shot 2 and marked both frames built
  writeFileSync(join(dir, "STORYBOARD.md"), approved.replace("3.32s", "1.787s").replace("- scene: a desk", "- scene: a desk\n- status: built").replace("- scene: the cup", "- scene: the cup\n- status: built"));
  const task = { id: "tb", projectId: "p", step: "build", status: "running", events: [], text: "Build", createdAt: new Date().toISOString(), revBefore: before };
  await agent.finishInner(task, dir, 0, "");
  const now = rf(join(dir, "STORYBOARD.md"), "utf8");
  assert.match(now, /- duration: 3\.32s/, "the approved timing is back");
  assert.equal((now.match(/- status: built/g) ?? []).length, 2, "the Build's status lines stay");
  assert.equal(P.storyboardHash(now), meta.approvals.storyboard.contentHash, "the approval holds as it was");
  assert.equal(task.storyboardKept, true);
  // while Claude works on a later step, the approval is not judged (no 1/5 "approve again" for 30 s)
  const f = { approvals: meta.approvals, storyboard: { real: true, hash: "other", rawHash: "other" }, claudeBusy: true, runningStep: "build" };
  assert.equal(P.judge({ kind: "approval", name: "storyboard" }, f, "storyboard").changed, false);
  assert.equal(P.judge({ kind: "approval", name: "storyboard" }, { ...f, claudeBusy: false, runningStep: null }, "storyboard").changed, true);
});

test("with a voice service set up, Prepare offers making the voice here first; the Voice screen's settings only", async () => {
  const secrets = await import("../packages/secrets/index.mjs");
  const root = mkdtempSync(join(T, "voice-root-"));
  assert.match(A.voiceLine({}, root), /no voice service is set up[^]*upload a recording[^]*Settings › General › Voice-over/);
  assert.equal(A.voiceLine({ voice: { file: "v.mp3" } }, root), "", "a film with its voice: nothing to offer");
  try { secrets.setSecret("elevenlabs", "sk_test", root); } catch (e) { return; }          // the secret store needs Windows
  const line = A.voiceLine({}, root);
  assert.ok(line.includes("ElevenLabs is set up") && line.indexOf("1) make it here: the owner opens the Voice screen") < line.indexOf("2) upload") && line.includes("3) no narration"), line);
  assert.ok(!/0\.7 to 1\.2|speed \(/.test(line), "no numbers for the voice's settings");
  assert.ok(A.systemPrompt({ meta: { title: "x" }, rules: [], shots: [], dir: process.cwd(), step: "brief" }).includes("Voice-over (the app says)"));
});

test("every step's prompt says the voice's settings are the user's, at the service's defaults, and Claude names no number", () => {
  for (const step of ["brief", "build", null]) {
    const sp = A.systemPrompt({ meta: { title: "x", voice: { file: "v.mp3" } }, rules: [], shots: [], dir: process.cwd(), step });
    assert.ok(sp.includes("are the owner's to set on the Voice screen and start at the voice service's own defaults: never set, suggest or name a number for them unless the owner asks"), String(step));
  }
});

test("the music step carries the style author's own music line and asks for three tracks on the story's arc, never another occasion's", () => {
  const line = A.musicLine({ style: { id: "lemo-hd-2d" } });
  if (!line.includes("The style's author on the music")) return;          // Lemo-Opuscar not pinned here
  assert.ok(line.includes("low choir, timpani") && line.includes("the story's arc") && line.includes("never a piece made for another occasion (a wedding"), line);
  assert.ok(!A.musicLine({ style: { id: "general" } }).includes("The style's author"), "a style with no sound section: the arc rule only");
  assert.ok(A.systemPrompt({ meta: { title: "x", style: { id: "lemo-hd-2d", title: "HD-2D", source: "x" } }, rules: [], shots: [], dir: process.cwd(), step: "sound" }).includes("the story's arc"));
});

test("once a tool's answer is back, Claude is thinking: the bar says so, not the tool's name, through a long thinking turn", () => {
  const agent = new A.Agent({ getProject: () => ({ id: "p", path: process.cwd(), meta: {} }), updateMeta: () => {} });
  const task = { id: "t71", projectId: "p", status: "running", events: [] };
  agent.onLine(task, JSON.stringify({ type: "assistant", message: { id: "m1", content: [{ type: "tool_use", name: "mcp__mw__font_check", input: {} }] } }), process.cwd());
  assert.deepEqual([task.doing.kind, task.doing.tool], ["app", "font_check"]);
  agent.onLine(task, JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", content: "ok" }] } }), process.cwd());
  assert.equal(task.doing.kind, "think");
});

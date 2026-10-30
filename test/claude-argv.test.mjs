// T27-14: in a film past its Final Mix every chat message failed in 3 s with "spawn ENAMETOOLONG". The app passed the whole system
// prompt on Claude Code's command line (--append-system-prompt) and Windows takes at most 32,767 characters: the late steps, which carry
// the most rules, went over it. The system prompt now goes in a file (--append-system-prompt-file), the character creator's brief on
// stdin, and a guard measures the command line before every start. A stand-in for Claude Code (node and a script that writes down its
// arguments, the prompt file and its stdin) runs instead of the real one: nothing here calls Claude.
// Run: node --test test/claude-argv.test.mjs
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-argv-"));
process.env.MW_STATE_DIR = join(T, "state");
after(() => rmSync(T, { recursive: true, force: true }));
const A = await import("../packages/agent/index.mjs");
const { ARGV_BUDGET, WINDOWS_MAX, checkArgv, commandLineLength, promptFile, quoteArg } = await import("../packages/agent/argv.mjs");
const { labArgs } = await import("../packages/character-maker/index.mjs");
const { getStyle } = await import("../packages/style-catalog/index.mjs");
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const PROMPTS = join(T, "state", "claude-prompts");

// the stand-in: writes { args, system, stdin } to MW_FAKE_CLAUDE_OUT, then answers in Claude Code's stream-json
const FAKE = join(T, "fake-claude.mjs");
writeFileSync(FAKE, `import { readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const at = args.indexOf("--append-system-prompt-file");
const system = at >= 0 ? readFileSync(args[at + 1], "utf8") : null;
let stdin = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => { stdin += d; });
process.stdin.on("end", () => {
  if (process.env.MW_FAKE_CLAUDE_OUT) writeFileSync(process.env.MW_FAKE_CLAUDE_OUT, JSON.stringify({ args, system, stdin }));
  const say = (o) => process.stdout.write(JSON.stringify(o) + "\\n");
  say({ type: "system", subtype: "init", session_id: "fake-session", model: "claude-opus-5-5" });
  say({ type: "assistant", message: { id: "m1", model: "claude-opus-5-5", content: [{ type: "text", text: "Tôi đã đổi tiếng ủng." }], usage: { input_tokens: 1, output_tokens: 1 } } });
  say({ type: "result", subtype: "success", is_error: false, result: system == null ? "no system prompt file" : "Tôi đã đổi tiếng ủng.", session_id: "fake-session", total_cost_usd: 0, num_turns: 1, usage: { input_tokens: 1, output_tokens: 1 } });
});
`);
/** Runs the stand-in with these arguments: { code } when it ran, { error } when Windows refused to start it. */
const runFake = (args, out, stdin = "the request") => new Promise((ok) => {
  let c;
  try { c = spawn(process.execPath, [FAKE, ...args], { windowsHide: true, env: { ...process.env, MW_FAKE_CLAUDE_OUT: out }, stdio: ["pipe", "ignore", "ignore"] }); }
  catch (error) { return ok({ error }); }
  c.on("error", (error) => ok({ error }));
  c.on("close", (code) => ok({ code }));
  c.stdin.on("error", () => {});
  c.stdin.end(stdin, "utf8");
});
/** The command line as it was before T27-14: the prompt file's text itself as --append-system-prompt. */
const inlined = (args, text) => args.flatMap((a, i) => (a === "--append-system-prompt-file" ? ["--append-system-prompt", text] : args[i - 1] === "--append-system-prompt-file" ? [] : [a]));

test("T27-14: a 40,000-character system prompt goes in a file; Claude Code starts and reads it whole (as text on the command line, Windows refuses to start it)", async () => {
  const text = "Quy tắc của phim \"Bơ và Hạt Tiêu\": mọi chữ tiếng Việt giữ đủ dấu, C:\\đường\\dẫn\\. " + "x".repeat(40000);
  const f = promptFile(PROMPTS, "t-huge", text);
  const mcpConfig = JSON.stringify({ mcpServers: { mw: { command: process.execPath, args: [join(import.meta.dirname, "..", "packages", "agent", "permit-mcp.mjs")] } } });
  const args = A.claudeArgs({ settings: { mode: "auto", web: "ask", model: "opus", effort: "high" }, systemPromptFile: f.path, sessionArgs: ["--session-id", "8a1d5c1e-4b7f-4d4e-9a65-2b1f0e7c9d31"],
    mcpConfig, appTools: Object.keys(A.APP_TOOLS), guard: `"${process.execPath}" "${join(import.meta.dirname, "..", "packages", "agent", "read-guard.mjs")}"` });
  assert.ok(!args.includes("--append-system-prompt") && !args.some((a) => a.includes("xxxxxxxxxx")), "the text is not on the command line");
  assert.equal(args[args.indexOf("--append-system-prompt-file") + 1], f.path);
  const n = checkArgv(process.execPath, args);
  assert.ok(n < 3000 && n < ARGV_BUDGET, `the command line holds the app's flags only: ${n} characters`);
  const out = join(T, "huge.json");
  assert.deepEqual(await runFake(args, out), { code: 0 });
  const seen = JSON.parse(readFileSync(out, "utf8"));
  assert.equal(seen.system, text, "the whole prompt, its marks, quotes and backslashes too");
  assert.equal(seen.stdin, "the request");
  assert.deepEqual(seen.args, args);
  f.drop();
  assert.equal(existsSync(f.path), false, "removed after the run");
  if (process.platform === "win32") {
    const old = inlined(args, text);
    assert.ok(commandLineLength(process.execPath, [FAKE, ...old]) > WINDOWS_MAX);
    const r = await runFake(old, join(T, "old.json"));
    assert.equal(r.error?.code, "ENAMETOOLONG", `the way it was: ${r.error?.message ?? `started (${r.code})`}`);
  }
});

test("the guard: a command line over the budget is refused in plain words, its largest part named in the log; lengths as Windows counts them", () => {
  // libuv's quoting (quote_cmd_arg): bare, quoted, quotes escaped, backslashes before a quote or the closing quote doubled
  assert.equal(quoteArg("Read,Edit,Write"), "Read,Edit,Write");
  assert.equal(quoteArg(""), "\"\"");
  assert.equal(quoteArg("D:\\Moworks Studio\\app"), "\"D:\\Moworks Studio\\app\"");
  assert.equal(quoteArg("{\"a\":1}"), "\"{\\\"a\\\":1}\"");
  assert.equal(quoteArg("C:\\dir with space\\"), "\"C:\\dir with space\\\\\"");
  assert.equal(quoteArg("a\\\"b"), "\"a\\\\\\\"b\"");
  assert.equal(commandLineLength("claude.exe", ["-p", "a b"]), "claude.exe -p \"a b\"".length);
  const logs = [];
  const big = ["-p", "--output-format", "stream-json", "--allowedTools", `mcp__mw__${"x".repeat(9000)}`, "--model", "claude-opus-5-5"];
  assert.throws(() => checkArgv("C:\\claude\\claude.exe", big, { log: (l) => logs.push(l) }), (e) => {
    assert.equal(e.code, "ARGV_TOO_LONG");
    assert.equal(e.part.name, "--allowedTools");
    assert.match(e.message, /^Claude could not be started: this request is too large to hand to Claude Code \(9,\d{3} characters, the most is 8,000\)\. Nothing was changed\.$/);
    assert.doesNotMatch(e.message, /ENAMETOOLONG|--allowedTools/, "plain words for the owner");
    return true;
  });
  assert.equal(logs.length, 1);
  assert.match(logs[0], /command line is 9,\d{3} characters \(budget 8,000, Windows' limit 32,767\); the largest part is --allowedTools, 9,0\d\d characters/);
  assert.ok(checkArgv("C:\\claude\\claude.exe", big.slice(0, 3), { log: () => assert.fail("no log under the budget") }) < 100);
  // the character creator: the owner's description and change go on stdin, never on the command line
  const lab = labArgs({ allowed: ["Bash(node tools/still.mjs:*)", "Bash(node tools/gate.mjs:*)"], model: "claude-opus-5-5", effort: "medium" });
  assert.equal(lab[0], "-p"); assert.equal(lab[1], "--output-format", "no prompt after -p");
  assert.ok(checkArgv("C:\\claude\\claude.exe", lab) < 1000);
});

// ---- a film past its Final Mix, as Test 27's: the Marker comic style (anidoodle), 75 s, 12 shots, two characters, music, the sounds
// placed, the Review and the Final Mix done; the owner asks in the chat to change a sound
const STYLE = "anidoodle-koi";
const style = getStyle(STYLE);
function finalMixFilm(dir) {
  cpSync(join(import.meta.dirname, "fixtures", "minimal"), dir, { recursive: true });
  const files = {
    "BRIEF.md": "# Brief\n\nMận dạy chú cá koi nhỏ nhất ao nhảy lên đớp mồi.\n", "ASSETS.md": "# Assets\n\nNhạc từ Mixkit.\n", "NOTES.md": "- 30/10 Final Mix: tiếng đã đặt.\n",
    "STORYBOARD.md": "# Mận và Vừng\n\n## Frame 1 — Ao buổi sáng\n\n- duration: 6s\n- sfx: water lap\n- ambience: pond morning\n", "MOTION-PLAN.json": "{\"shots\":[]}\n",
    "QC-REVIEW.md": "# Review\n\n8/10\n", "QC-REVIEW.json": "{\"score\":8}\n", "CREDITS.md": "# Credits\n", "frame.md": "---\nname: Marker comic\n---\n",
    "CHARACTERS.json": JSON.stringify({ characters: [
      { id: "man", name: "Mận", about: "Mận là cô bé bảy tuổi, tóc ngắn, áo đỏ, ủng xanh lá quá cỡ, đeo túi vải màu kem.", engine: "anidoodle-human", hand: "marker", filmHand: "marker", import: "./characters/man", check: "check-man.ts", made: "written from the idea", from: { library: true } },
      { id: "vung", name: "Vừng", about: "Vừng là con cá koi nhỏ nhất ao, màu cam, có một chấm đen trên đầu.", engine: "anidoodle-human", rig: "koi", import: "./characters/vung", check: "characters/vung/check.ts", made: "written from the idea" },
    ] }, null, 2),
  };
  for (const [n, t] of Object.entries(files)) writeFileSync(join(dir, n), t);
  mkdirSync(join(dir, "assets", "3_audio", "music"), { recursive: true }); writeFileSync(join(dir, "assets", "3_audio", "music", "1-playground-fun.mp3"), "");
  mkdirSync(join(dir, "assets", "3_audio", "sfx"), { recursive: true });
  for (let i = 1; i <= 58; i++) writeFileSync(join(dir, "assets", "3_audio", "sfx", `${["footstep-grass", "water-splash", "cloth-rustle", "impact-soft", "click"][i % 5]}-${i}.ogg`), "");
  const done = (taskId) => ({ at: "2026-10-30T00:35:17.317Z", taskId });
  return {
    title: "Mận và Vừng", format: { aspect: "16:9", width: 1920, height: 1080, fps: 30 }, targetDurationSec: 75, designLocked: true, brand: "",
    style: { id: STYLE, title: style.title, source: "anidoodle medium", author: "Alex Greenshpun (10x Company)", commit: "f746cbd8a7032463bd0bc88ee8ff852599193b8c" },
    brief: { mode: "idea", text: [
      "Phim hoạt hình 75 giây, không lời đọc, chữ trên hình chỉ có tên phim và câu kết.",
      "Mận, cô bé bảy tuổi, muốn dạy Vừng, con cá koi nhỏ nhất ao, nhảy lên khỏi mặt nước đớp mồi như những con cá to.",
      "Cô tự nhảy lò cò bên bờ để làm mẫu, gửi một nắm cơm trên chiếc thuyền lá, rồi gõ nhịp bằng hai chiếc thìa: lần nào cũng hỏng, và đàn cá to tranh mất phần.",
      "Chiếc kẹp tóc hình cá của Mận rơi xuống ao. Đàn cá to quay đi. Vừng lặn xuống, rồi nhảy cao nhất ao để trả chiếc kẹp.",
      "Câu kết: \"Có những cú nhảy không vì miếng ăn.\" Nhạc vui, xylophone, ve sầu buổi trưa, tiếng nước dưới ao.",
    ].join("\n") },
    language: { id: "vi", by: "brief" }, characters: { from: "library", as: "cast", ids: ["man"] }, voice: {}, settings: { model: "opus", effort: "high", web: "on" },
    music: { file: "assets/3_audio/music/1-playground-fun.mp3", duration: 75, beats: "beats/assets/3_audio/music/1-playground-fun.mp3.json", title: "Playground Fun", artist: "Ahjay Stelino" },
    approvals: { characters: { at: "t" }, storyboard: { at: "t", by: "owner" }, motionPlan: { at: "t", by: "owner" } },
    pipeline: { marks: { brief: done("b1"), sound: done("s1") }, skips: {}, ran: Object.fromEntries(["brief", "character", "storyboard", "motionSpec", "build", "qcReview", "sound"].map((s) => [s, done(s)])),
      finished: { at: "2026-10-30T00:41:15.886Z", score: 8 }, reviewed: { at: "2026-10-30T00:32:33.739Z" }, delivered: { at: "2026-10-30T00:41:15.886Z" } },
  };
}
const SHOTS = Array.from({ length: 12 }, (_, i) => ({ number: i + 1, title: ["Ao buổi sáng", "Mận gọi Vừng", "Nhảy lò cò", "Thuyền lá", "Đàn cá tranh mồi", "Hai chiếc thìa", "Kẹp tóc rơi", "Đàn cá quay đi", "Vừng lặn", "Cú nhảy", "Trả kẹp", "Câu kết"][i],
  start: i * 6.25, duration: 6.25, src: `compositions/shot-${String(i + 1).padStart(2, "0")}.html` }));
const filmAgent = (dir, meta) => {
  const agent = new A.Agent({ getProject: (id) => ({ id, path: dir, meta }), readShots: async () => ({ shots: SHOTS }), updateMeta: (id, fn) => fn(meta),
    permitUrl: "http://127.0.0.1:9/api/agent/permit", permitToken: "tok", appTools: Object.fromEntries(Object.keys(A.APP_TOOLS).map((n) => [n, async () => "ok"])) });
  agent.claudeExe = process.execPath;
  return agent;
};
const until = async (fn, ms = 60000) => { const t0 = Date.now(); while (!fn()) { if (Date.now() - t0 > ms) return false; await wait(50); } return true; };

test("T27-14: the chat after the Final Mix works again: its system prompt, built by the app for the film, reaches Claude Code whole, from a file", { timeout: 180000, skip: !style && `${STYLE} is not in the catalog here` }, async (t) => {
  const dir = join(T, "film"), meta = finalMixFilm(dir);
  const agent = filmAgent(dir, meta);
  const out = join(T, "film.json");
  let started = null;
  agent.spawnClaude = (exe, args, opts) => {
    started = { exe, args, file: args[args.indexOf("--append-system-prompt-file") + 1] };
    return spawn(process.execPath, [FAKE, ...args], { ...opts, windowsHide: true, env: { ...opts.env, MW_FAKE_CLAUDE_OUT: out } });
  };
  const msg = "Thay tiếng bíp điện tử ở bước ủng cao su bằng tiếng ủng thật, và cho cú nhảy của Vừng một tiếng nước bắn.";
  const task = await agent.start("p", { text: msg });
  assert.ok(await until(() => task.status !== "running"), "the task ended");
  assert.equal(task.status, "done", `${task.error ?? ""}`);
  assert.equal(task.resultText, "Tôi đã đổi tiếng ủng.");
  const seen = JSON.parse(readFileSync(out, "utf8"));
  // the app's own prompt for this film: the house rules, the style, the sounds, the cast, the shots, the chat's own rule after a build
  for (const part of ["You are the production brain of Moworks Studio", `Style: ${style.title}`, "Sound effects (the house rules, \"A sound on every action\")", "Characters already in this film (docs/CHARACTERS.json): Mận",
    "12. Câu kết", "Call qc_sheets once", "mcp__mw__sfx_prefs"]) assert.ok(seen.system.includes(part), part);
  assert.ok(seen.system.length > 25000, `a late step's prompt: ${seen.system.length} characters`);
  assert.match(seen.stdin, /Thay tiếng bíp điện tử/);
  // as text on the command line it would not have started (T27-14); from the file, the command line is the app's flags only
  const old = commandLineLength(started.exe, inlined(seen.args, seen.system));
  assert.ok(old > WINDOWS_MAX, `before: ${old} characters`);
  const now = commandLineLength(started.exe, seen.args);
  assert.ok(now < 3000, `now: ${now} characters`);
  t.diagnostic(`system prompt ${seen.system.length} characters; command line before ${old}, now ${now}`);
  assert.equal(existsSync(started.file), false, "the prompt file is removed when the run ends");
  assert.deepEqual(readdirSync(PROMPTS).filter((n) => n.startsWith(task.id)), []);
});

test("a start whose command line is over the budget is refused before Claude Code runs, in plain words, and leaves no prompt file", { timeout: 120000, skip: !style && `${STYLE} is not in the catalog here` }, async () => {
  const dir = join(T, "film-guard"), meta = finalMixFilm(dir);
  const agent = filmAgent(dir, meta);
  agent.claudeExe = `C:\\${"a-very-long-folder\\".repeat(500)}claude.exe`;          // an install path long enough to pass the budget
  let spawned = 0;
  agent.spawnClaude = () => { spawned++; throw new Error("must not start"); };
  const logs = [], warn = console.warn; console.warn = (l) => logs.push(String(l));
  let task;
  try { task = await agent.start("p", { text: "Đổi tiếng ủng." }); } finally { console.warn = warn; }
  assert.equal(task.status, "failed");
  assert.equal(spawned, 0, "Claude Code is never started");
  assert.match(task.error, /^Claude could not be started: this request is too large to hand to Claude Code/);
  assert.doesNotMatch(task.error, /ENAMETOOLONG/);
  assert.match(logs.join("\n"), /the largest part is the program's path/);
  assert.equal(agent.running.has("p"), false, "the project is free again");
  assert.deepEqual(readdirSync(PROMPTS).filter((n) => n.startsWith(task.id)), [], "its prompt file is removed");
});

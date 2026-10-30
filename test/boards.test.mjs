// Storyboard boards (stills per round, history, the pick, the PDF), the QC review (times, the score the
// pipeline reads), loudness, and the app's own tools on Claude's MCP channel (listed, forwarded to the server, answered).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { boardFrames, currentOptions, listRounds, ownerRounds, recordPick, roundPdf, takeStills } from "../packages/hf-edit/boards.mjs";
import { qcTimes } from "../packages/hf-qa/qc.mjs";
import { loudness } from "../packages/hf-qa/loudness.mjs";
import { ffmpegExe } from "../packages/library/preview-media.mjs";
import * as pipe from "../packages/pipeline/index.mjs";
import { APP_TOOLS, Agent, claudeArgs } from "../packages/agent/index.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-boards-"));
after(() => rmSync(T, { recursive: true, force: true }));
const board = (o, color, frames) => `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="root" data-composition-id="board-${o}" data-start="0" data-duration="${frames}" data-width="640" data-height="360" style="position:relative;width:640px;height:360px;overflow:hidden">
${Array.from({ length: frames }, (_, i) => `<div class="clip" data-start="${i}" data-duration="1" data-track-index="1" style="position:absolute;inset:0;background:${color};color:#fff;font:700 64px sans-serif;display:flex;align-items:center;justify-content:center">${o}${i + 1}</div>`).join("\n")}
<script>window.__timelines = window.__timelines || {}; window.__timelines["board-${o}"] = { duration: () => ${frames}, time: () => 0, seek() {}, pause() {}, play() {}, totalDuration: () => ${frames} };</script>
</div></body></html>`;
const md = (o, frames) => `# Option ${o}: test ${o}\n\n- idea: option ${o} in one line\n\n${Array.from({ length: frames }, (_, i) => `## Frame ${i + 1} — Beat ${i + 1}\n- duration: 1s\n- status: outline\n`).join("\n")}`;

test("boards: frames and options are read from what Claude wrote", () => {
  assert.deepEqual(boardFrames("## Frame 1 — Hook\n- x\n## Frame 2: Pain\n"), [{ n: 1, title: "Hook" }, { n: 2, title: "Pain" }]);
  const d = join(T, "read");
  for (const o of ["A", "B"]) { mkdirSync(join(d, "boards", o), { recursive: true }); writeFileSync(join(d, "boards", o, "STORYBOARD.md"), md(o, 2)); }
  writeFileSync(join(d, "boards", "A", "index.html"), board("A", "#a33", 2));
  const cur = currentOptions(d);
  assert.deepEqual(cur.map((x) => [x.option, x.ready, x.frames.length]), [["A", true, 2], ["B", false, 2]]);
  assert.equal(cur[0].heading, "Option A: test A"); assert.equal(cur[0].idea, "option A in one line");
});

test("boards: the user's rounds are the sets of options as they arrived, never Claude's drafts", () => {
  const d = (id, letters, taskId = null) => ({ id, at: id, taskId, options: [...letters].map((option) => ({ option })) });
  // first set drafted twice by Claude (t1), the dialog's stills (no task), then "Make two more" drafted C alone, then C and D (t2)
  const all = [d("R1", "AB", "t1"), d("R2", "AB", "t1"), d("R3", "AB"), d("R4", "ABC", "t2"), d("R5", "ABCD", "t2"), d("R6", "ABCDEF", "t3")];
  assert.deepEqual(ownerRounds(all, all[4]).map((g) => [g.no, g.letters.join("")]), [[1, "AB"], [2, "CD"]]);
  assert.deepEqual(ownerRounds(all, all[5]).map((g) => [g.no, g.letters.join(""), g.at]), [[1, "AB", "R1"], [2, "CD", "R4"], [3, "EF", "R6"]]);
  assert.deepEqual(ownerRounds([d("R1", "ABC")], d("R1", "ABC")).map((g) => g.letters.join("")), ["ABC"], "a project made with three options: one round");
  assert.deepEqual(ownerRounds(all, null), []);
});

test("boards: stills per round at the board's size; an unchanged board keeps its round; a change makes R2 and reuses the stills of what did not change; the pick and the PDF", { timeout: 300000 }, async () => {
  const d = join(T, "film");
  for (const [o, c] of [["A", "#a33"], ["B", "#36a"]]) { mkdirSync(join(d, "boards", o), { recursive: true }); writeFileSync(join(d, "boards", o, "STORYBOARD.md"), md(o, 2)); writeFileSync(join(d, "boards", o, "index.html"), board(o, c, 2)); }
  const prog = [];
  const r1 = await takeStills(d, { onProgress: (x) => prog.push(x) });
  assert.equal(r1.fresh, true); assert.deepEqual(r1.failed, []);
  assert.deepEqual([prog[0], prog.at(-1)], [{ done: 0, total: 4 }, { done: 4, total: 4 }], "frames taken / all, for the dialog's waiting line (QC #191)");
  assert.ok(prog.every((x, i) => i === 0 || x.done >= prog[i - 1].done));
  assert.equal(r1.round.id, "R1");
  assert.deepEqual(r1.round.options.map((o) => [o.option, o.stills.length]), [["A", 2], ["B", 2]]);
  const png = readFileSync(join(d, ...r1.round.options[0].stills[0].split("/")));
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [640, 360], "a still is the board's own size");
  assert.equal((await takeStills(d)).fresh, false, "nothing changed: the same round");
  writeFileSync(join(d, "boards", "B", "index.html"), board("B", "#3a6", 2));
  const r2 = await takeStills(d);
  assert.equal(r2.round.id, "R2");
  assert.deepEqual(readFileSync(join(d, ...r2.round.options[0].stills[0].split("/"))), png, "A did not change: its stills were copied");
  assert.equal(listRounds(d).length, 2, "R1 is kept");
  assert.ok(existsSync(join(d, "boards", "rounds", "R1", "B", "index.html")), "each round keeps a copy of the board");
  assert.equal(recordPick(d, "R2", { option: "B", note: "chữ to hơn" }).option, "B");
  assert.equal(listRounds(d)[1].picked.note, "chữ to hơn");
  const pdf = readFileSync(join(d, ...(await roundPdf(d, "R2", null, {})).split("/")), "latin1");
  assert.ok(pdf.startsWith("%PDF-1.4")); assert.ok(pdf.trimEnd().endsWith("%%EOF"));
  assert.equal(pdf.match(/\/Type \/Page /g).length, 4, "one page per still");
  assert.match(pdf, /\/MediaBox \[0 0 320 180\]/);
  assert.equal(readFileSync(join(d, ...(await roundPdf(d, "R2", "A", {})).split("/")), "latin1").match(/\/Type \/Page /g).length, 2);
  assert.equal(await roundPdf(d, "R2", ["B"], { no: 2 }), "boards/rounds/R2/storyboard-option-B.pdf", "named by its option, never a round (owner 26/10, spec §1)");
  // Each option has the app's sheet (3 × 3 frames, long edge at most about 1500 px), and a retake of only the frames that changed
  const jpgSize = (f) => { const b = readFileSync(f); for (let i = 2; i < b.length;) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1]; if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + b.readUInt16BE(i + 2); } return null; };
  const sh = listRounds(d)[1].options[0];
  assert.equal(sh.sheets.length, 1); assert.equal(sh.sheet, sh.sheets[0]);
  const [sw, shh] = jpgSize(join(d, ...sh.sheet.split("/")));
  assert.ok(sw <= 1510 && sw > shh, `a landscape sheet of 2 frames side by side (${sw}x${shh})`);
  writeFileSync(join(d, "boards", "A", "index.html"), board("A", "#3a3", 2));
  const r3 = await takeStills(d, { retake: { option: "A", frames: [2] } });
  assert.equal(r3.round.id, "R3");
  const a3 = r3.round.options.find((o) => o.option === "A");
  assert.equal(a3.stills.length, 2, "both frames are there");
  assert.deepEqual(readFileSync(join(d, ...a3.stills[0].split("/"))), png, "frame 1 was not taken again");
  assert.notDeepEqual(readFileSync(join(d, ...a3.stills[1].split("/"))), readFileSync(join(d, ...listRounds(d)[1].options[0].stills[1].split("/"))), "frame 2 was");
  assert.ok(!existsSync(join(d, "boards", "rounds", "R3", "A", "stills", ".retake")));
});

test("boards of HyperFrames' styles: each still at its frame's own seconds (poster in film seconds, from the frame's start, or the middle); a retake lands on its frame", { timeout: 300000 }, async () => {
  const d = join(T, "film-times"), spans = [[0, 2, "#a33"], [2, 3, "#3a3"], [3, 6, "#33a"]];
  mkdirSync(join(d, "boards", "A"), { recursive: true });
  writeFileSync(join(d, "boards", "A", "STORYBOARD.md"), `# Option A: timed

- idea: frames of their own lengths

## Frame 1 — Open (0-2s)
- duration: 2s

## Frame 2 — Turn (2-3s)
- duration: 1s
- poster: 2.2

## Frame 3 — End (3-6s)
- duration: 3s
- poster: 1
`);
  writeFileSync(join(d, "boards", "A", "index.html"), `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="root" data-composition-id="board-A" data-start="0" data-duration="6" data-width="640" data-height="360" style="position:relative;width:640px;height:360px;overflow:hidden">
${spans.map(([a, b, c], i) => `<div class="clip" data-start="${a}" data-duration="${b - a}" data-track-index="1" style="position:absolute;inset:0;background:${c};color:#fff;font:700 64px sans-serif;display:flex;align-items:center;justify-content:center">A${i + 1}</div>`).join("\n")}
<script>window.__timelines = window.__timelines || {}; window.__timelines["board-A"] = { duration: () => 6, time: () => 0, seek() {}, pause() {}, play() {}, totalDuration: () => 6 };</script>
</div></body></html>`);
  const at = (r) => r.round.options[0].stills.map((s) => Number(/-at-([\d.]+)s\.png$/.exec(s)[1]));
  const r1 = await takeStills(d, { filmTimes: true });
  assert.deepEqual(r1.failed, []);
  assert.deepEqual(at(r1), [1, 2.2, 4], "the middle of 0-2 s, the poster 2.2 s, the poster 1 s from the frame's start");
  const red = (f) => { const raw = execFileSync(ffmpegExe(), ["-v", "error", "-i", join(d, ...f.split("/")), "-vf", "crop=1:1:20:20", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { windowsHide: true }); return [...raw]; };
  assert.ok(red(r1.round.options[0].stills[2])[2] > 120, "frame 3's still shows frame 3 (blue), not the one at 2.5 s");
  writeFileSync(join(d, "boards", "A", "index.html"), readFileSync(join(d, "boards", "A", "index.html"), "utf8").replace("#33a", "#3aa"));
  const r2 = await takeStills(d, { filmTimes: true, retake: { option: "A", frames: [3] } });
  assert.deepEqual(at(r2), [1, 2.2, 4], "the retake of frame 3 replaces frame 3's still");
  const r3 = await takeStills(d, { force: true });
  assert.deepEqual(at(r3), [0.5, 1.5, 2.5], "another author's board: one frame a second");
});

test("QC review: the times of the sheets, and the final score the pipeline reads (8 or more passes; under 8 waits for the user)", () => {
  const { beats, cuts } = qcTimes([{ number: 1, start: 0, duration: 4 }, { number: 2, start: 4, duration: 2 }, { number: 3, start: 6, duration: 4 }], 10);
  assert.deepEqual(beats.map((b) => b.t), [2.4, 5.2, 8.4]);
  assert.deepEqual(cuts.map((c) => c.ts), [[3.75, 3.92, 4.08, 4.25], [5.75, 5.92, 6.08, 6.25]]);
  const d = join(T, "review"); mkdirSync(d, { recursive: true });
  assert.equal(pipe.reviewScore(d), null);
  writeFileSync(join(d, "QC-REVIEW.md"), "## Round 1\nFinal score: 6/10\n## Round 3\n**Final score: 8.5 / 10**\n");
  assert.equal(pipe.reviewScore(d).score, 8.5, "the last final score counts");
  const steps = [{ id: "build", title: "Build", done: { kind: "built" }, action: { kind: "claude" } },
    { id: "qcReview", title: "QC review", needs: ["build"], skippable: true, done: { kind: "review", file: "QC-REVIEW.md" }, action: { kind: "claude" } }];
  const f = (review, extra = {}) => ({ built: { ok: true, at: 1 }, review, ran: {}, skips: {}, marks: {}, keeps: {}, approvals: {}, voice: {}, flags: {}, file: () => null, ...extra });
  const st = (x) => pipe.computePipeline(steps, x).find((s) => s.id === "qcReview");
  assert.equal(st(f({ score: 8.5, at: 5 })).status, "done");
  assert.equal(st(f({ score: 7, at: 5 })).status, "needs-you");
  assert.equal(st(f({ score: 7, at: 5 })).reason.vars.n, 7);
  assert.equal(st(f(null)).status, "ready");
  assert.equal(st(f(null, { ran: { qcReview: { at: new Date(9).toISOString() } } })).status, "failed");
  assert.equal(st(f({ score: 7, at: 5 }, { skips: { qcReview: { at: new Date(9).toISOString() } } })).status, "skipped");
});

test("loudness of a render: LUFS and true peak with FFmpeg's EBU R128; no sound, nothing to measure", { timeout: 60000 }, async () => {
  const tone = join(T, "tone.wav"), mute = join(T, "mute.mp4");
  execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=4", "-af", "volume=-10dB", tone], { windowsHide: true });
  execFileSync(ffmpegExe(), ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=black:s=64x36:d=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", mute], { windowsHide: true });
  const l = await loudness(tone);
  assert.ok(l.lufs < -25 && l.lufs > -40, String(l.lufs));          // the lavfi sine is at -18 dBFS, then -10 dB
  assert.ok(typeof l.truePeak === "number");
  assert.equal(typeof l.ok, "boolean");
  assert.deepEqual(await loudness(mute), { silent: true });
});

test("the app's tools on Claude's MCP channel: listed with the permission tool, a call goes to the server, the answer comes back; allowed without a question", { timeout: 30000 }, async () => {
  const calls = [];
  const srv = createServer((req, res) => { let b = ""; req.on("data", (d) => { b += d; }); req.on("end", () => {
    calls.push({ url: req.url, token: req.headers["x-mw-token"], body: JSON.parse(b) });
    res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ text: "Round R1 (new)." })); }); });
  await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
  const port = srv.address().port;
  const tools = ["board_stills", "qc_sheets"].map((n) => ({ name: n, ...APP_TOOLS[n] }));
  const c = spawn(process.execPath, [join(import.meta.dirname, "..", "packages", "agent", "permit-mcp.mjs")], { env: { ...process.env,
    MW_PERMIT_URL: `http://127.0.0.1:${port}/api/agent/permit`, MW_PERMIT_TOKEN: "tk", MW_PERMIT_TASK: "task1", MW_APP_TOOLS: JSON.stringify(tools) }, stdio: ["pipe", "pipe", "inherit"], windowsHide: true });
  const answers = new Map(); let buf = "";
  c.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); answers.get(m.id)?.(m); } });
  const ask = (id, method, params) => new Promise((ok) => { answers.set(id, ok); c.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"); });
  await ask(1, "initialize", { protocolVersion: "2025-06-18" });
  const list = await ask(2, "tools/list", {});
  assert.deepEqual(list.result.tools.map((x) => x.name), ["permit", "board_stills", "qc_sheets"]);
  const r = await ask(3, "tools/call", { name: "board_stills", arguments: {} });
  assert.equal(r.result.content[0].text, "Round R1 (new).");
  assert.deepEqual(calls.map((x) => [x.url, x.token, x.body.task, x.body.name]), [["/api/agent/tool", "tk", "task1", "board_stills"]]);
  c.kill(); srv.close();
  const args = claudeArgs({ settings: { mode: "auto", web: "off", model: "opus", effort: "medium" }, systemPromptFile: "x.md", sessionArgs: [], mcpConfig: "{}", appTools: ["board_stills", "qc_sheets"] });
  assert.equal(args[args.indexOf("--allowedTools") + 1], "mcp__mw__board_stills,mcp__mw__qc_sheets");
  // the Agent runs the handler only for a running task, with its project
  const agent = new Agent({ root: T, getProject: (id) => ({ id, path: T, meta: {} }), appTools: { board_stills: async ({ project }) => `stills of ${project.id}` } });
  assert.equal((await agent.callTool("nope", "board_stills")).error, true);
  agent.tasks.set("t1", { id: "t1", projectId: "p1", status: "running", events: [] });
  assert.equal((await agent.callTool("t1", "board_stills")).text, "stills of p1");
  assert.equal((await agent.callTool("t1", "qc_sheets")).error, true, "no handler: no tool");
});

test("permission questions Claude asks at the same time queue: one shows, the next after an answer; 'for this project' answers the waiting web ones", async () => {
  const meta = { settings: { web: "ask" } };
  const agent = new Agent({ root: T, getProject: (id) => ({ id, path: T, meta }), updateMeta: (id, fn) => fn(meta) });
  agent.tasks.set("t9", { id: "t9", projectId: "p9", status: "running", events: [] });
  const a = agent.permit("t9", { tool_name: "WebSearch", input: { query: "one" } });
  const b = agent.permit("t9", { tool_name: "WebSearch", input: { query: "two" } });
  const c = agent.permit("t9", { tool_name: "WebFetch", input: { url: "https://mixkit.co/x" } });
  const task = agent.tasks.get("t9");
  assert.equal(task.permission.what, "one");
  agent.answer("p9", "t9", task.permission.id, "allow");
  assert.equal((await a).behavior, "allow");
  assert.equal(task.permission.what, "two", "the next question shows");
  agent.answer("p9", "t9", task.permission.id, "project");
  assert.equal((await b).behavior, "allow");
  assert.equal((await c).behavior, "allow", "the waiting web question is answered by 'for this project'");
  assert.equal(task.permission, null);
  assert.equal(meta.settings.web, "on");
});

test("an app tool that takes long still gets its answer; a closed app is said in words, not as a bare 'fetch failed'", { timeout: 30000 }, async () => {
  // hf_script waiting for the user's yes to go online (web "ask") held one request for 5 minutes, and fetch gave up at 300 s
  const src = readFileSync(join(import.meta.dirname, "..", "packages", "agent", "permit-mcp.mjs"), "utf8");
  assert.ok(!/\bfetch\(/.test(src), "permit-mcp must not use fetch (undici's 300 s header timeout)");
  const srv = createServer((req, res) => { let b = ""; req.on("data", (d) => { b += d; }); req.on("end", () => setTimeout(() => {
    res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ text: "late but here" })); }, 1500)); });
  await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
  const run = (port) => new Promise((ok) => {
    const c = spawn(process.execPath, [join(import.meta.dirname, "..", "packages", "agent", "permit-mcp.mjs")], { env: { ...process.env,
      MW_PERMIT_URL: `http://127.0.0.1:${port}/api/agent/permit`, MW_PERMIT_TOKEN: "tk", MW_PERMIT_TASK: "t", MW_APP_TOOLS: JSON.stringify([{ name: "hf_script", description: "x", inputSchema: { type: "object" } }]) }, stdio: ["pipe", "pipe", "inherit"], windowsHide: true });
    let buf = "";
    c.stdout.on("data", (d) => { buf += d; const i = buf.indexOf("\n"); if (i >= 0) { c.kill(); ok(JSON.parse(buf.slice(0, i))); } });
    c.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "hf_script", arguments: {} } }) + "\n");
  });
  const slow = await run(srv.address().port);
  assert.equal(slow.result.content[0].text, "late but here");
  const port = srv.address().port; srv.close();
  const gone = await run(port);
  assert.equal(gone.result.isError, true);
  assert.match(gone.result.content[0].text, /The app is not answering/);
  assert.ok(!/fetch failed/.test(gone.result.content[0].text));
});

test("the stills' hashes are the boards after the app's own edits (no re-take on the next opening); a new take keeps the user's pick", { timeout: 300000 }, async () => {
  const d = join(T, "keep-pick");
  for (const [o, c] of [["A", "#a33"], ["B", "#36a"]]) {
    mkdirSync(join(d, "boards", o), { recursive: true }); writeFileSync(join(d, "boards", o, "STORYBOARD.md"), md(o, 2));
    // a CDN script the app vendors for the stills: the board file changes while the stills are taken
    writeFileSync(join(d, "boards", o, "index.html"), board(o, c, 2).replace("<head>", "<head><script src=\"https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js\"></script>"));
  }
  const r1 = await takeStills(d);
  const now = currentOptions(d);
  assert.deepEqual(now.map((x) => x.hash), r1.round.options.map((o) => o.hash), "the round's hashes are the files as they are after the take");
  assert.equal((await takeStills(d)).fresh, false, "opening the dialog again takes nothing");
  recordPick(d, r1.round.id, { option: "B", note: "" });
  const r2 = await takeStills(d, { force: true });
  assert.equal(r2.round.picked?.option, "B", "the pick goes on to the new draft");
});

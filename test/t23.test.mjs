// Test 23's fixes: a reply cut at the output limit is said and taken up again once (T23-2), the Tech checks group one kind of warning
// and keep what the Review meant (T23-3), the music step reads its own rules and the read guard says how to go on (T23-7), and the
// estimates come from the films of Tests 17-24 (T23-11). No real Claude call.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-t23-"));
process.env.MW_STATE_DIR = join(T, "state");
process.env.MW_CLAUDE_RETRY_MS = "0";
process.env.MW_CLAUDE_CONFIG_DIR = join(T, "claude-config");
const A = await import("../packages/agent/index.mjs");
const O = await import("../packages/agent/output-limit.mjs");
const rev = await import("../packages/revisions/index.mjs");
const at = (min) => new Date(Date.parse("2026-10-29T17:00:00Z") + min * 60000).toISOString();
const line = (o) => JSON.stringify(o);
const toolResult = { type: "user", message: { content: [{ type: "tool_result", content: "ok" }] } };
const thinkingCut = { type: "assistant", message: { id: "m9", model: "claude-opus-5-5", stop_reason: "max_tokens", usage: { output_tokens: 128000 }, content: [{ type: "thinking", thinking: "" }] } };
const nudge = { type: "user", isSynthetic: true, message: { content: "Output token limit hit. Resume directly — no apology, no recap of what you were doing. Pick up mid-thought if that is where the cut happened. Break remaining work into smaller pieces." } };
const wrote = { type: "assistant", message: { id: "m10", content: [{ type: "tool_use", name: "Write", input: { file_path: "compositions/f1.html" } }] } };

test("T23-2: a reply cut at the output limit is one cut, with its minutes of thinking and its tokens, whichever lines show it", () => {
  assert.equal(O.cutOf(toolResult), null);
  assert.deepEqual(O.cutOf(thinkingCut), { kind: "limit", from: "reply", output: 128000 });
  assert.equal(O.cutOf(nudge).from, "nudge");
  assert.equal(O.cutOf({ type: "user", message: { content: [{ type: "text", text: "Your response above was cut off mid-stream. Resume directly" }] } }).kind, "stream");
  assert.equal(O.cutOf({ type: "result", is_error: true, result: "API Error: Claude's response exceeded the 96000 output token maximum." }).from, "result");
  assert.equal(O.cutOf({ type: "result", stop_reason: "max_tokens" }).kind, "limit");
  assert.equal(O.cutOf({ type: "result", stop_reason: "end_turn", result: "Done" }), null);
  // Test 23's Build: a tool's answer at 00:01:05, 21 min of thinking cut at 128,000 tokens (its two lines), Claude Code's nudge
  // (Test 14: 4.8 min later), then work again
  const task = { createdAt: at(0) };
  assert.equal(O.followCut(task, toolResult, at(1.1)), null);
  const cut = O.followCut(task, thinkingCut, at(21.9));
  assert.deepEqual(cut, { at: at(21.9), kind: "limit", minutes: 20.8, output: 128000, from: "reply" });
  assert.equal(O.followCut(task, thinkingCut, at(21.9)), null, "the reply's second line");
  assert.equal(O.followCut(task, nudge, at(26.7)), null, "Claude Code's nudge after it is the same cut");
  assert.equal(task.cut.open, true);
  O.followCut(task, wrote, at(30));
  assert.equal(task.cut.open, false, "it wrote again");
  // a reply cut again after the nudge is a new cut, timed from the nudge
  const again = { createdAt: at(0) };
  O.followCut(again, toolResult, at(1)); O.followCut(again, thinkingCut, at(15)); O.followCut(again, nudge, at(15.1));
  assert.equal(O.followCut(again, { ...thinkingCut, message: { ...thinkingCut.message, id: "m11" } }, at(30.1)).minutes, 15);
  assert.equal(again.cut.list.length, 2);
  // a stream whose cut reply Claude Code held back: the nudge alone is the cut
  const held = { createdAt: at(0) };
  O.followCut(held, toolResult, at(2));
  assert.equal(O.followCut(held, nudge, at(14)).minutes, 12);
  // the result alone: the run ended on it
  const end = { createdAt: at(0) };
  O.followCut(end, toolResult, at(1));
  assert.equal(O.followCut(end, { type: "result", stop_reason: "max_tokens" }, at(9)).from, "result");
  assert.equal(end.cut.open, true);
});

test("T23-2: Claude Code's transcript finds the same cuts (Test 23's Build and Storyboard), and reads nothing line by line without one", () => {
  const ts = (min, o) => line({ ...o, timestamp: at(min) });
  const build = [ts(0, { type: "user", message: { content: "Target: the whole project." } }), ts(1.1, toolResult), ts(21.9, thinkingCut), ts(21.9, thinkingCut), ts(21.91, { ...nudge, isMeta: true }), ts(37, wrote)].join("\n");
  assert.deepEqual(O.transcriptCuts(build, at(0)).list.map((c) => [c.kind, c.minutes, c.output]), [["limit", 20.8, 128000]]);
  // the Storyboard's reply cut mid-stream: its two lines of thinking come at the cut, the nudge 10 s later
  const sb = [ts(0, toolResult), ts(14.9, { type: "assistant", message: { id: "s1", stop_reason: "end_turn", content: [{ type: "thinking" }] } }),
    ts(15.1, { type: "user", isMeta: true, message: { content: "Your response above was cut off mid-stream. Resume directly from where it stops" } }), ts(30, wrote)].join("\n");
  const s = O.transcriptCuts(sb);
  assert.deepEqual([s.list[0].kind, s.list[0].minutes, s.open], ["stream", 15.1, false]);
  assert.deepEqual(O.transcriptCuts([ts(0, toolResult), ts(3, wrote)].join("\n")), { list: [], open: false });
  assert.equal(O.transcriptCuts(build, at(25)).list.length, 0, "only the run's own lines (a resumed session holds the runs before)");
  assert.equal(O.transcriptFile(join(T, "nowhere"), "abc", {}), null);
});

test("T23-2: each step's reply has its own limit (the Build 96,000, the Storyboard Claude Code's own), and the step is told to write as it goes", () => {
  assert.equal(O.outputCap("build"), 96000);
  assert.equal(O.outputCap("qcReview"), 32000);
  assert.equal(O.outputCap("storyboard"), null, "a Storyboard reply that wrote a board ran to 112K");
  assert.equal(O.outputCap(null), null, "the chat keeps Claude Code's own");
  const sp = (step) => A.systemPrompt({ meta: { title: "x" }, rules: [], shots: [], dir: process.cwd(), step });
  assert.match(sp("build"), /at most about 96,000 tokens, your thinking included[^]*write each file \(a shot, a board, a part of the plan\) as soon as it is designed/);
  assert.match(sp("storyboard"), /at most about 128,000 tokens/);
  const src = readFileSync(new URL("../packages/agent/index.mjs", import.meta.url), "utf8");
  assert.match(src, /const cap = outputCap\(step\);\s*\n\s*if \(cap\) \{ env\.CLAUDE_CODE_MAX_OUTPUT_TOKENS = /);
  assert.match(src, /const own = \(step && !resumeOf\) \|\| freshChat \? null : conv\.sessions\[key\];/, "a taken-up step goes on in its own conversation");
  // the effort plan holds: the Motion Plan at its own medium, every other step at least high
  assert.deepEqual(A.stepEffort("high", { effort: "medium" }), { effort: "medium", rule: "step" });
  assert.deepEqual(A.stepEffort("low", null), { effort: "high", rule: "min" });
});

const project = (name) => {
  const dir = join(T, name); cpSync(join(import.meta.dirname, "fixtures", "minimal"), dir, { recursive: true });
  rev.ensureRepo(dir); const before = rev.commitAll(dir, "before") ?? rev.head(dir);
  const meta = {};
  const agent = new A.Agent({ getProject: () => ({ id: "p", path: dir, meta }), updateMeta: (id, fn) => fn(meta),
    stepOf: (m, s, all) => (all ? [{ id: "build" }] : { id: s, title: { build: "Build", storyboard: "Storyboard" }[s] ?? s }) });
  const started = [];
  agent.start = async (pid, opts) => { started.push({ pid, ...opts }); return { id: "next" }; };
  const notes = () => (existsSync(join(dir, ".moworks", "notes.json")) ? JSON.parse(readFileSync(join(dir, ".moworks", "notes.json"), "utf8")).notes : []);
  return { dir, before, meta, agent, started, notes };
};
const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? "");
const tick = () => new Promise((ok) => setTimeout(ok, 30));

test("T23-2: the chat says a cut as it happens, with its minutes and money; a run that goes on and writes is done as usual", async () => {
  const { dir, before, agent, started, notes } = project("cut-going");
  const task = { id: "tg", projectId: "p", step: "build", status: "running", events: [], text: "Build the film", createdAt: new Date(Date.now() - 30 * 60000).toISOString(), revBefore: before, model: "claude-opus-5-5" };
  agent.onLine(task, line(toolResult), dir);
  agent.onLine(task, line(thinkingCut), dir);
  agent.onLine(task, line(nudge), dir);
  const said = notes().filter((n) => n.kind === "pipeline");
  assert.equal(said.length, 1, "one line for one cut");
  assert.match(fill(said[0].text, said[0].vars), /^Claude thought for \d+ min \(\$2\.56\) and reached the most one reply can hold, so that reply was lost\. It is going on by itself, in smaller pieces\.$/);
  assert.match(task.events.at(-1).text, /cut at the output limit/);
  agent.onLine(task, line(wrote), dir);
  writeFileSync(join(dir, "NOTES.md"), "- 29/10: the build\n");
  agent.onLine(task, line({ type: "result", subtype: "success", is_error: false, stop_reason: "end_turn", result: "Đã dựng xong phim." }), dir);
  await agent.finishInner(task, dir, 0, "");
  assert.equal(task.status, "done");
  assert.equal(notes().filter((n) => n.kind === "pipeline").length, 1, "said once");
  await tick(); assert.equal(started.length, 0);
});

test("T23-2: a step that ends on a cut before it wrote anything is not done: the app takes it up once, in its conversation, and says so", async () => {
  const { dir, before, agent, started, notes } = project("cut-end");
  const task = { id: "te", projectId: "p", step: "build", status: "running", events: [], text: "Build the film from the approved Motion Plan.", scope: { kind: "project" },
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(), revBefore: before };
  agent.onLine(task, line(toolResult), dir);
  agent.onLine(task, line({ type: "assistant", error: "max_output_tokens", message: { id: "e1", content: [{ type: "text", text: "API Error: Claude's response exceeded the 96000 output token maximum." }] } }), dir);
  agent.onLine(task, line({ type: "result", subtype: "success", is_error: true, stop_reason: "max_tokens", result: "API Error: Claude's response exceeded the 96000 output token maximum." }), dir);
  assert.equal(notes().filter((n) => n.kind === "pipeline").length, 0, "Claude Code stopped: nothing said as \"going on\"");
  await agent.finishInner(task, dir, 0, "");
  assert.deepEqual([task.status, task.errorCode], ["failed", "OUTPUT_LIMIT"]);
  const n = notes().filter((x) => x.kind === "pipeline").at(-1);
  assert.match(fill(n.text, n.vars), /reached the most one reply can hold, so that reply was lost\. Build stopped there before it was done: the app starts it again from where the work is, in smaller pieces\./);
  await tick();
  assert.equal(started.length, 1);
  assert.deepEqual([started[0].step, started[0].resumeOf], ["build", "te"]);
  assert.match(started[0].text, /^Your last reply reached the most one reply can hold[^]*write each file[^]*The request, as before:\nBuild the film from the approved Motion Plan\./);
  // taken up once: the same again stops and says how to go on
  const second = { id: "te2", projectId: "p", step: "build", status: "running", events: [], text: started[0].text, resumeOf: "te", createdAt: new Date().toISOString(), revBefore: rev.head(dir) };
  agent.onLine(second, line(toolResult), dir); agent.onLine(second, line({ type: "result", is_error: false, stop_reason: "max_tokens", result: "" }), dir);
  await agent.finishInner(second, dir, 0, "");
  assert.equal(second.status, "failed");
  const n2 = notes().filter((x) => x.kind === "pipeline").at(-1);
  assert.match(fill(n2.text, n2.vars), /Build stopped there again before it was done: write “continue” in the chat to go on/);
  await tick(); assert.equal(started.length, 1, "never a second time by itself");
  // a chat turn of the owner's own is never sent again in their name: the line says how to go on
  const chat = { id: "tc", projectId: "p", status: "running", events: [], text: "đổi màu nền", createdAt: new Date().toISOString(), revBefore: rev.head(dir) };
  agent.onLine(chat, line(toolResult), dir); agent.onLine(chat, line(thinkingCut), dir);
  agent.onLine(chat, line({ type: "result", is_error: true, stop_reason: "max_tokens", result: "API Error" }), dir);
  await agent.finishInner(chat, dir, 0, "");
  const n3 = notes().filter((x) => x.kind === "pipeline").at(-1);
  assert.match(fill(n3.text, n3.vars), /Claude stopped there before it was done: write “continue” in the chat/);
  await tick(); assert.equal(started.length, 1);
});

test("T23-2: a run whose stream showed no cut is read again in Claude Code's transcript, and the cut it finds is said", async () => {
  const { dir, before, agent, notes } = project("cut-transcript");
  const sid = "11111111-2222-3333-4444-555555555555", t0 = Date.now() - 40 * 60000;
  const folder = join(process.env.MW_CLAUDE_CONFIG_DIR, "projects", dir.replace(/[^a-zA-Z0-9]/g, "-")); mkdirSync(folder, { recursive: true });
  const ts = (min, o) => line({ ...o, timestamp: new Date(t0 + min * 60000).toISOString() });
  writeFileSync(join(folder, `${sid}.jsonl`), [ts(0.5, toolResult), ts(18.5, thinkingCut), ts(18.6, { ...nudge, isMeta: true }), ts(30, wrote)].join("\n"));
  writeFileSync(join(dir, "NOTES.md"), "- 29/10: the build\n");
  const task = { id: "tt", projectId: "p", step: "build", status: "running", events: [], text: "Build", createdAt: new Date(t0).toISOString(), revBefore: before, sessionId: sid, resultText: "Xong." };
  await agent.finishInner(task, dir, 0, "");
  assert.equal(task.status, "done");
  assert.equal(task.cut.fromTranscript, true);
  const n = notes().filter((x) => x.kind === "pipeline").at(-1);
  assert.match(fill(n.text, n.vars), /^Claude thought for 18 min \(\$2\.56\) and reached the most one reply can hold, so that reply was lost\. It went on by itself, in smaller pieces\.$/);
});

test("T23-3: one kind of warning in many shots is one line with its shots; what the Review kept on purpose and a measuring slip are no warning", async () => {
  const { plainFinding, measuringSlip } = await import("../packages/hf-qa/plain.mjs");
  const L = await import("../packages/hf-qa/look.mjs");
  const frame = { width: 1080, height: 1920 };
  const slip = { code: "off_pivot_rotation", selector: "svg.art > g > line:nth-of-type(4)", time: 17.354, message: "Gauge/dial pointer rotates about a point 35200px from the dial hub" };
  assert.equal(measuringSlip(slip, frame), true);
  assert.equal(measuringSlip({ ...slip, message: "… 1912px from the dial hub" }, frame), false, "inside twice the frame's longer side");
  assert.match(plainFinding(slip, { shot: { number: 6, start: 15.9, duration: 2.6 }, frame }), /^Shot 6 \(0:15\.9–0:18\.5\): HyperFrames measured an element turning around a point 35,200 px away, far outside the frame\. That is a slip of the measurement, not a fault in the film/);
  assert.equal(L.shotsWords([3, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23]), "Shots 1–11, 13–21 and 23");
  assert.equal(L.shotsWords([11, 17]), "Shots 11 and 17");
  assert.equal(L.shotsWords([6]), "Shot 6");
  // Test 23's layout check: the art group of every shot (two lines in shot 1), three swings, the slip
  const shots = [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23];
  const sh = (n) => ({ number: n, start: n * 3, duration: 3 });
  const findings = () => [
    ...shots.map((n, i) => ({ code: "container_overflow", selector: i === 1 ? "#f1-rig" : `#f${n} > div > svg > g`, shot: n, time: n * 3 })),
    ...[[11, 33.89, 51], [17, 55.54, 162], [17, 55.54, 192]].map(([n, t, px]) => ({ code: "rotation_pivot_drift", selector: "svg.art g", shot: n, time: t, message: `drifts ${px}px across rotation` })),
    { ...slip, shot: 6 }].map((f) => ({ ...f, plain: plainFinding(f, { shot: sh(f.shot), frame }), ...(measuringSlip(f, frame) ? { artefact: true } : {}) }));
  const report = (fs) => ({ pass: true, checks: [{ id: "G-HF-LAYOUT", blocking: false, pass: true, kind: "deterministic", title: "Layout", findings: fs }] });
  const plainLook = L.lookAt(report(findings()));
  assert.equal(plainLook.count, 2, "26 warnings were 26 lines; now the overflow and the swings, the slip apart");
  assert.deepEqual(plainLook.warnings[0].items.map((x) => [x.shot, x.count]), [[null, 22], [null, 3]]);
  assert.equal(plainLook.warnings[0].items[0].plain, "Shots 1–11, 13–21 and 23: parts of the picture run outside the boxes that crop them, so some of each is cut off. Ask Claude to fit them inside, or ignore this if the cut is meant.");
  assert.match(plainLook.warnings[0].items[1].plain, /^Shots 11 and 17: things spin around a point away from their own centre/);
  assert.deepEqual(plainLook.intended[0].items.map((x) => x.shot), [6], "the slip: meant this way, not a warning");
  // the Review's own words (Test 23's QC-REVIEW.md, as written)
  const md = "## Round 4\n\nKept on purpose (HyperFrames check warnings): container_overflow on every shot's art group (the drawing is wider than the frame so the camera can push and pan); rotation_pivot_drift / off_pivot_rotation at 17.35, 33.89, 55.54 s (pendulums and baskets swing about their knot or nail, not their own centre); lint nested_structure on #grain and #endfade (two plain root overlays, not shots).\n\nFinal score: 8/10\n";
  const kept = L.keptOnPurpose({ md });
  assert.deepEqual(kept.slice(0, 3).map((k) => [k.code, k.at]), [["container_overflow", null], ["rotation_pivot_drift", [17.35, 33.89, 55.54]], ["off_pivot_rotation", [17.35, 33.89, 55.54]]]);
  assert.equal(kept[0].why, "the drawing is wider than the frame so the camera can push and pan");
  assert.equal(L.keptFor({ code: "rotation_pivot_drift", time: 40 }, kept), null, "only at its seconds");
  assert.deepEqual(L.keptOnPurpose({ json: { kept: [{ code: "container_overflow", shots: [2, 3], why: "the pan" }, "rotation_pivot_drift", { code: "not a code" }] } }).map((k) => [k.code, k.shots]),
    [["container_overflow", [2, 3]], ["rotation_pivot_drift", null]]);
  const marked = findings().map((f) => { const k = L.keptFor(f, kept); return k ? { ...f, intended: true, why: k.why } : f; });
  const meant = L.lookAt(report(marked));
  assert.equal(meant.count, 0, "no red warning for what the Review kept");
  assert.deepEqual(meant.warnings, []);
  assert.equal(meant.visual.at(-1).title, "Meant this way", "shown in the sheet, neutral");
  const lines = meant.intended[0].items.map((x) => x.plain);
  assert.ok(lines.includes("Shots 1–11, 13–21 and 23: parts of the picture run outside the boxes that crop them, so some of each is cut off. The Review kept this on purpose: the drawing is wider than the frame so the camera can push and pan."), lines.join("\n"));
  // a blocking check stays blocking whatever the Review kept
  assert.equal(L.lookAt({ checks: [{ id: "G-FONT", blocking: true, pass: false, findings: [{ code: "font_missing", intended: true }] }] }).blocking.length, 1);
  // the server marks them when it writes the report, the Review is told how to keep one
  const prod = readFileSync(new URL("../packages/server/production.mjs", import.meta.url), "utf8");
  assert.match(prod, /const kept = keptOnPurpose\(reviewFiles\(p\.path\)\);/);
  assert.match(prod, /\.\.\.\(measuringSlip\(f, frame\) \? \{ artefact: true \} : \{\}\), \.\.\.\(k \? \{ intended: true/);
  const qc = readFileSync(new URL("../config/rules/moworks-qc/SKILL.md", import.meta.url), "utf8").replace(/\s+/g, " ");
  assert.match(qc, /"kept": \[\{"code": "container_overflow", "why": "the painting is wider than the frame so the camera can pan"\}\]/);
  assert.match(qc, /version: 1\.1\.2/);
  const { reviewFiles } = await import("../packages/server/production.mjs");
  const rd = join(T, "review"); mkdirSync(rd, { recursive: true }); writeFileSync(join(rd, "QC-REVIEW.md"), md);
  assert.equal(L.keptOnPurpose(reviewFiles(rd)).length, 4);
});

test("T23-7: the music step reads the house rules and its style's own file, and the read guard says to make the same edit again", async () => {
  const { requiredReads } = await import("../packages/agent/reads.mjs");
  const d = join(T, "reads");
  for (const f of ["moworks-studio/SKILL.md", "hyperframes/SKILL.md", "hyperframes/references/types/vertical.md", "hyperframes/references/format.md", "slideshow/SKILL.md"]) {
    const p = join(d, ".moworks", "rules", ...f.split("/")); mkdirSync(join(p, ".."), { recursive: true }); writeFileSync(p, "---\ndescription: x\n---\n");
  }
  const first = [".moworks/rules/hyperframes/SKILL.md"];
  assert.deepEqual(requiredReads(d, { styleId: "hf-vertical", first, step: "sound" }), [".moworks/rules/moworks-studio/SKILL.md", ".moworks/rules/hyperframes/references/types/vertical.md"],
    "Test 23's music step was given HyperFrames' entry skill too, read none and could not write NOTES.md");
  assert.deepEqual(requiredReads(d, { styleId: "slideshow", first: [".moworks/rules/slideshow/SKILL.md", ...first], step: "sound" }), [".moworks/rules/moworks-studio/SKILL.md", ".moworks/rules/slideshow/SKILL.md"]);
  assert.ok(requiredReads(d, { styleId: "hf-vertical", first, step: "build" }).includes(".moworks/rules/hyperframes/SKILL.md"), "the steps that write the film keep it");
  // the guard as Claude Code runs it: the first edit of NOTES.md before the rules is stopped once, with how to go on
  const guard = join(import.meta.dirname, "..", "packages", "agent", "read-guard.mjs");
  const transcript = join(d, "t.jsonl");
  const run = (task, reads) => {
    writeFileSync(transcript, reads.map((r) => line({ type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: { file_path: join(d, ...r.split("/")) } }] } })).join("\n") + "\n");
    return spawnSync(process.execPath, [guard], { input: line({ transcript_path: transcript, tool_name: "Edit", tool_input: { file_path: join(d, "NOTES.md") } }),
      env: { ...process.env, MW_REQUIRED_READS: JSON.stringify(requiredReads(d, { styleId: "hf-vertical", first, step: "sound" })), MW_TASK: task, MW_PROJECT: d }, encoding: "utf8", windowsHide: true });
  };
  const blocked = run("music-1", []);
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /Read them all in one turn, then make this same edit again: it goes through[^]*NOTES\.md and this step's own files included/);
  assert.doesNotMatch(blocked.stderr, /hyperframes\/SKILL\.md/);
  assert.equal(run("music-1", []).status, 0, "stopped once only");
  assert.equal(run("music-2", [".moworks/rules/moworks-studio/SKILL.md", ".moworks/rules/hyperframes/references/types/vertical.md"]).status, 0, "its own rules read: NOTES.md is written");
  assert.ok(existsSync(join(d, ".moworks", "cache", "read-guard.json")));
});

test("T23-11: the Storyboard, the Motion Plan and the Review estimate from Tests 17-24, as ranges; the Review's time left holds a second round", async () => {
  const { boardEstimates, runningEstimate } = await import("../packages/server/boards.mjs");
  const e = boardEstimates([], "hf-vertical");
  assert.deepEqual(e.option, { minutes: 22, high: 33, costUsd: 4.4, costHigh: 5.5, basis: "usual", runs: 0 }, "Test 23's first storyboard said about 10 min and took 39.6");
  assert.deepEqual(e.motion, { minutes: 5, high: 8, costUsd: 1.3, costHigh: 1.8, basis: "usual", runs: 0 }, "the Motion Plan said about $1.20 and cost $1.70");
  assert.deepEqual(boardEstimates([], "anidoodle-midCentury").option, { minutes: 25, high: 38, costUsd: 6.5, costHigh: 8.1, basis: "usual", runs: 0 });
  assert.equal(runningEstimate({ step: "storyboard", status: "running", text: "Make one storyboard option", createdAt: at(0) }, []).minutes, 22);
  const A2 = await import("../packages/server/autopilot.mjs");
  assert.deepEqual(A2.reviewRounds({ createdAt: at(0), events: [{ kind: "status", text: "App: qc_sheets…", at: at(16) }, { kind: "tool", tool: "app:qc_sheets" }, { kind: "status", text: "App: qc_sheets…", at: at(30) }] }),
    { startedAt: at(0), rounds: 2, roundAt: at(30) });
  // Test 23: the stage planned at 80 min; the Build done at 38.7 min; the Review's rounds at 55, 69, 79 and 85 min, done at 95.6
  const est = { minutes: 80, high: 120 }, t0 = Date.parse(at(0)), rounds = [55, 69, 79, 85];
  const left = (m) => {
    const st = (id) => ({ build: m < 38.7 ? "running" : "done", qcReview: m < 38.7 ? "waiting" : m < 95.6 ? "running" : "done", sound: m < 95.6 ? "waiting" : "running", checks: "waiting" })[id];
    const k = rounds.filter((r) => r <= m);
    const x = A2.estimateNow(est, ["build", "qcReview", "sound", "checks"].map((id) => ({ id, status: st(id) })), { startedAt: at(0), now: t0 + m * 60000,
      review: { startedAt: at(38.7), rounds: k.length, roundAt: k.length ? at(k.at(-1)) : null } });
    return { low: x.minutes - m, high: x.high - m };
  };
  assert.equal(Math.round(left(39).low), 24, "the Review and what follows, not the plan's 41");
  let prev = left(38.7);
  for (let m = 38.8; m < 95.6; m += 0.1) {
    const now = left(m);
    assert.ok(now.low - prev.low <= 7.01, `at ${m.toFixed(1)} min it jumped from ${prev.low.toFixed(1)} to ${now.low.toFixed(1)} (Test 23: 5 to 39)`);
    assert.ok(now.low <= prev.high + 0.01, `at ${m.toFixed(1)} min the new time left ${now.low.toFixed(1)} is inside the range said before (${prev.high.toFixed(1)})`);
    prev = now;
  }
  assert.ok(left(60).high - left(60).low >= 7, "the range's top holds one round more");
});

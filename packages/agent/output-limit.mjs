// A reply of Claude's cut at the output limit (T23-2). Opus 5.5 thinks adaptively: Claude Code (checked on 2.1.309) sends
// thinking: { type: "adaptive" } for it and leaves MAX_THINKING_TOKENS aside (the API refuses budget_tokens on Opus 5.5), so the thinking of
// one reply cannot be capped apart. What bounds it is the effort (the owner's plan: Motion Plan medium; Storyboard, Character and Build at
// least high) and the reply's own limit, CLAUDE_CODE_MAX_OUTPUT_TOKENS (its thinking included). Test 23's Build thought 21 minutes, reached
// Claude Code's 128,000 tokens with no text and no tool call, and all of it was lost; seven Builds of Tests 14-24 did the same (each a
// 128,000-token reply of thinking only), while no Build reply that wrote something went past 86,844 tokens.
// This module: the limit per step, what a stream line says about a cut, and what the app tells the user and asks Claude afterwards.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** The most one reply of a step may hold (CLAUDE_CODE_MAX_OUTPUT_TOKENS), from the largest replies that wrote something in Tests 11-24
 *  (Claude Code's own transcripts): Prepare 6.7K, Character 43K, Motion Plan 31K, Build 87K, Review 9K, music 8K, so a runaway think stops
 *  at a third to a quarter of the 128K it ran to. The Storyboard (112K replies that wrote a board) and the chat keep Claude Code's own limit. */
export const OUTPUT_CAPS = { brief: 32000, character: 64000, motionSpec: 64000, build: 96000, qcReview: 32000, sound: 32000 };
export const CLAUDE_LIMIT = 128000;
export const outputCap = (step) => OUTPUT_CAPS[step] ?? null;

/** The words a step's Claude reads about the limit (the system prompt): think in short stretches and write as it goes. */
export function limitLine(step) {
  const cap = outputCap(step) ?? CLAUDE_LIMIT;
  return `One reply of yours holds at most about ${cap.toLocaleString("en")} tokens, your thinking included, and a reply that reaches it is lost whole, with all its thinking (Test 23: a Build thought for 21 minutes, reached it and wrote nothing). Never design the whole film in one think: think in short stretches, write each file (a shot, a board, a part of the plan) as soon as it is designed, then go on to the next.`;
}

// Claude Code's own nudges when it goes on after a cut reply (2.1.309), a user line of the stream
const LIMIT_NUDGE = /^(Output token limit hit|Your response was cut off because it exceeded the output token limit)/;
const STREAM_NUDGE = /^Your response above was cut off mid-stream/;
// its error once it stops trying ("Claude's response exceeded the 128000 output token maximum")
const LIMIT_ERROR = /exceeded the \d+ output token maximum|max_output_tokens/i;
const textOf = (c) => (typeof c === "string" ? c : Array.isArray(c) ? c.filter((b) => b?.type === "text").map((b) => b.text ?? "").join("\n") : "");

/** What one line of Claude Code's stream says about a cut reply: null, or { kind: "limit" (the output limit) | "stream" (the
 *  connection dropped the reply), from: "reply" | "nudge" | "error" | "result", output (the reply's output tokens, when the line has them) }. */
export function cutOf(e) {
  if (!e || typeof e !== "object") return null;
  if (e.type === "assistant") {
    if (e.message?.stop_reason === "max_tokens") return { kind: "limit", from: "reply", output: e.message?.usage?.output_tokens ?? null };
    if (e.error === "max_output_tokens" || (e.error && LIMIT_ERROR.test(textOf(e.message?.content)))) return { kind: "limit", from: "error", output: null };
    return null;
  }
  if (e.type === "user") {
    const t = textOf(e.message?.content).trim();
    if (LIMIT_NUDGE.test(t)) return { kind: "limit", from: "nudge", output: null };
    if (STREAM_NUDGE.test(t)) return { kind: "stream", from: "nudge", output: null };
    return null;
  }
  if (e.type === "result" && (e.stop_reason === "max_tokens" || (e.is_error && LIMIT_ERROR.test(`${e.result ?? ""} ${JSON.stringify(e.errors ?? [])}`)))) return { kind: "limit", from: "result", output: null };
  return null;
}
/** Whether an assistant line carries something Claude made (words or a tool call), not thinking alone. */
const madeSomething = (e) => e?.type === "assistant" && !e.error && (e.message?.content ?? []).some((b) => (b?.type === "text" && String(b.text ?? "").trim()) || b?.type === "tool_use");

/** One reply cut shows as several lines: the reply (twice, its blocks, within this many ms), then Claude Code's nudge (Test 14: 4.8 min
 *  later), or its error, then the result. A reply cut after a nudge is a new cut. */
const SAME_CUT_MS = 30000;
/** Follow one stream line of a task (its state in task.cut): the cut it shows when it is a new one ({ at, kind, minutes, output }), else
 *  null. task.cut.open: the last cut has had nothing made after it (the run that ends so ended on the cut); turnAt: when the reply that was
 *  cut was asked for (the last user line: a tool's answer or Claude Code's nudge; a reply's own lines, thinking cut mid-stream among
 *  them, come when it ends). */
export function followCut(task, e, at = new Date().toISOString()) {
  const c = (task.cut ??= { turnAt: task.createdAt ?? at, open: false, list: [] });
  const cut = cutOf(e);
  let fresh = null;
  if (cut) {
    const last = c.list.at(-1), reply = cut.from === "reply" || cut.from === "error";
    const same = !!last && (cut.from === "result" ? c.open
      : reply ? c.phase === "reply" && Date.parse(at) - Date.parse(c.lastAt ?? last.at) < SAME_CUT_MS
      : c.phase === "reply");
    if (same) {
      if (cut.output && !last.output) last.output = cut.output;
      if (cut.kind === "limit") last.kind = "limit";
    } else {
      const minutes = Math.max(0, Math.round(((Date.parse(at) - Date.parse(c.turnAt)) / 60000) * 10) / 10);
      fresh = { at, kind: cut.kind, minutes, output: cut.output ?? null, from: cut.from };
      c.list.push(fresh);
    }
    c.open = true; c.lastAt = at;
    if (cut.from !== "result") c.phase = reply ? "reply" : "nudged";
  } else if (madeSomething(e)) { c.open = false; c.phase = null; }
  else if (e?.type === "user") c.phase = null;          // a tool's answer: the next reply is a new request
  if (e?.type === "user" || (e?.type === "system" && e.subtype === "init")) c.turnAt = at;
  return fresh;
}

/** The cuts of a run as Claude Code's transcript (its session's JSONL) recorded them since `since`, for a run whose stream did not show
 *  them (Claude Code holds a cut reply back while it decides to go on): { list: [{ at, kind, minutes, output }], open }. */
const CUT_WORDS = /"stop_reason":"max_tokens"|Output token limit hit|cut off mid-stream|exceeded the output token limit|max_output_tokens/;
export function transcriptCuts(text, since = null) {
  const s = String(text ?? "");
  if (!CUT_WORDS.test(s)) return { list: [], open: false };          // most runs: nothing to read line by line
  const t0 = since ? Date.parse(since) : -Infinity, task = { createdAt: since ?? new Date(0).toISOString() };
  for (const line of s.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (!e?.timestamp || Date.parse(e.timestamp) < t0) continue;
    if (e.type === "assistant" || e.type === "user") followCut(task, e, e.timestamp);
  }
  return { list: task.cut?.list ?? [], open: !!task.cut?.open };
}
/** Claude Code's transcript of a session run in `cwd` (its projects folder names the folder with every other character a dash). */
export function transcriptFile(cwd, sessionId, env = process.env) {
  if (!cwd || !sessionId) return null;
  const base = env.CLAUDE_CONFIG_DIR || env.MW_CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
  const f = join(base, "projects", String(cwd).replace(/[^a-zA-Z0-9]/g, "-"), `${sessionId}.jsonl`);
  return existsSync(f) ? f : null;
}
export function readTranscriptCuts(cwd, sessionId, since, env = process.env) {
  const f = transcriptFile(cwd, sessionId, env);
  if (!f) return { list: [], open: false };
  try { return transcriptCuts(readFileSync(f, "utf8"), since); } catch { return { list: [], open: false }; }
}

const usd = (x) => `$${x.toFixed(2)}`;
/** The plain chat line for a cut (a note of kind "pipeline"): { text, vars }. then: what follows it: "going" (Claude Code goes on by
 *  itself), "after" (it went on; said at the end), "again" (the app starts the step again), "stop" (it stopped again), "chat" (a chat turn
 *  stopped); said: the cut itself was said already, so only what follows is. `price`: $ per output token of the run's model. */
export function cutNote(cut, { then = "going", step = null, price = 20e-6, said = false } = {}) {
  const vars = { min: Math.max(1, Math.round(cut.minutes ?? 0)), usd: cut.output ? usd(cut.output * price) : "", step: step || "The step" };
  const what = cut.kind === "stream"
    ? (cut.output ? "Claude's reply was cut off after {min} min of thinking ({usd}), so that thinking was lost." : "Claude's reply was cut off after {min} min of thinking, so that thinking was lost.")
    : (cut.output ? "Claude thought for {min} min ({usd}) and reached the most one reply can hold, so that reply was lost." : "Claude thought for {min} min and reached the most one reply can hold, so that reply was lost.");
  const next = { going: "It is going on by itself, in smaller pieces.", after: "It went on by itself, in smaller pieces.",
    again: "{step} stopped there before it was done: the app starts it again from where the work is, in smaller pieces.",
    stop: "{step} stopped there again before it was done: write “continue” in the chat to go on, or ask for a smaller part.",
    chat: "Claude stopped there before it was done: write “continue” in the chat to go on, in smaller pieces." }[then] ?? "";
  return { text: said ? next : `${what} ${next}`.trim(), vars };
}

/** What Claude is asked when the app takes up a step whose reply was cut before it wrote anything or said it was done. */
export function resumeText(task) {
  return "Your last reply reached the most one reply can hold, before you wrote anything more or said the work was done, so its thinking was lost. "
    + "Go on with the same request from where the project's files are now: read again only what you need and what changed, then work in small pieces: "
    + "think briefly, write each file (a shot, a board, a part of the plan) as soon as it is designed, then go on to the next. Never plan the whole film in one think."
    + `\n\nThe request, as before:\n${String(task?.text ?? "").slice(0, 20000)}`;
}

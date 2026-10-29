// The 5-minute prompt cache kept warm through a long wait inside one task. A request that starts more than 5 minutes
// after the last one that read the conversation's cache writes the whole conversation again: a ten-minute think in Build re-wrote
// 170K tokens ($0.85), and the Review's QC sheets on a busy machine (15 minutes each) re-wrote half of a film's cache writes
// ($4.2-6.6 a film). While the task waits that long (no line from Claude Code for KEEP_ALIVE_AFTER_MS), a one-turn copy of the
// conversation (--resume <id> --fork-session --no-session-persistence, the same arguments: same tools, system prompt, model, effort) is
// asked for one word: its request reads the cache, which keeps it alive for the task's next request. Measured: a resume 8 min
// after the last request read 397K from the cache after a ping at 4 min. The copy is never saved and can use no tool; the 5-minute cache
// stays the standard one (no 1-hour cache).
import { spawn } from "node:child_process";

export const KEEP_ALIVE_AFTER_MS = 4 * 60 * 1000;
const PING = "Reply with the single word OK. Use no tool.";

/** The task's Claude Code arguments for a ping of its session: the session flags swapped for a fork that is not saved, one turn, and a
 *  hook that refuses every tool (hooks are not part of the prompt, so the request's prefix is the task's own). */
export function pingArgs(args, sessionId, node = process.execPath) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--session-id" || args[i] === "--resume") { i++; continue; }
    if (args[i] === "--settings") { const s = JSON.parse(args[++i]); out.push("--settings", JSON.stringify({ ...s, hooks: denyAll(node) })); continue; }
    out.push(args[i]);
  }
  if (!out.includes("--settings")) out.push("--settings", JSON.stringify({ hooks: denyAll(node) }));
  return [...out, "--resume", sessionId, "--fork-session", "--no-session-persistence", "--max-turns", "1"];
}
const denyAll = (node) => ({ PreToolUse: [{ matcher: "*", hooks: [{ type: "command", command: `"${node}" -e "process.stderr.write('keep-alive ping: no tools');process.exit(2)"`, timeout: 10 }] }] });

/** The usage of a ping from its stream-json lines (the result event), or null. */
export function pingUsage(text) {
  for (const line of String(text).split("\n").reverse()) {
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e?.type === "result" && e.usage) return { cacheRead: e.usage.cache_read_input_tokens ?? 0, cacheWrite: e.usage.cache_creation_input_tokens ?? 0, output: e.usage.output_tokens ?? 0, input: e.usage.input_tokens ?? 0 };
  }
  return null;
}

/** Watch one running task: touch() on every line it prints; once its conversation exists (ready()) and it has been quiet for `after`,
 *  ping once, then again after the next quiet `after`. onPing({ ok, usage, ms }) after each. stop() when the task ends. */
export function keepAlive({ exe, args, sessionId, cwd, env, after = KEEP_ALIVE_AFTER_MS, every = 15000, onPing = () => {}, spawnFn = spawn, now = Date.now }) {
  let last = now(), ready = false, child = null, stopped = false;
  const tick = () => {
    if (stopped || !ready || child || now() - last < after) return;
    const t0 = now(); let out = "";
    child = spawnFn(exe, pingArgs(args, sessionId), { cwd, env: { ...env, MW_TASK: "keepalive", MW_PERMIT_TASK: "keepalive" }, windowsHide: true, stdio: ["pipe", "pipe", "ignore"] });
    child.stdout?.on("data", (d) => { out += d.toString("utf8"); });
    child.on("close", (code) => { child = null; last = now(); const usage = pingUsage(out); onPing({ ok: code === 0 && !!usage, usage, ms: now() - t0 }); });
    child.on("error", () => { child = null; last = now(); onPing({ ok: false, usage: null, ms: now() - t0 }); });
    child.stdin?.end(PING, "utf8");
  };
  const timer = setInterval(tick, every);
  timer.unref?.();
  return {
    touch(line = "") { last = now(); if (!ready && /"type":"assistant"/.test(line)) ready = true; },
    tick,
    stop() { stopped = true; clearInterval(timer); if (child) { try { child.kill(); } catch { /* gone */ } } },
  };
}

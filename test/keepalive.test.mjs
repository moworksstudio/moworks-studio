// The 5-minute cache kept warm through a long wait inside a task (a fake Claude Code and a fake clock; the real ping was measured
// by hand: a resume 8 min after the last request read 397K from the cache after a ping at 4 min).
import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { keepAlive, pingArgs, pingUsage, KEEP_ALIVE_AFTER_MS } from "../packages/agent/keepalive.mjs";
import { claudeArgs } from "../packages/agent/index.mjs";

test("a ping is the task's own arguments on a fork that is not saved, one turn, every tool refused by a hook", () => {
  const settings = { mode: "acceptEdits", web: "off", model: "opus", effort: "high" };
  const args = claudeArgs({ settings, systemPrompt: "SP", sessionArgs: ["--session-id", "abc"], guard: "\"node\" guard.mjs" });
  const p = pingArgs(args, "abc", "node");
  assert.ok(!p.includes("--session-id"));
  assert.deepEqual(p.slice(-6), ["--resume", "abc", "--fork-session", "--no-session-persistence", "--max-turns", "1"]);
  // what reaches the model is the same: system prompt, tools, model, effort, permission mode
  for (const flag of ["--append-system-prompt", "--tools", "--model", "--effort", "--permission-mode"]) assert.equal(p[p.indexOf(flag) + 1], args[args.indexOf(flag) + 1], flag);
  const hooks = JSON.parse(p[p.indexOf("--settings") + 1]).hooks.PreToolUse;
  assert.deepEqual(hooks.map((h) => h.matcher), ["*"]);
  assert.match(hooks[0].hooks[0].command, /process\.exit\(2\)/);
  // a resumed chat pings its own conversation
  const r = pingArgs(claudeArgs({ settings, systemPrompt: "SP", sessionArgs: ["--resume", "chat-1"] }), "chat-1", "node");
  assert.equal(r.filter((x) => x === "--resume").length, 1);
  assert.ok(r.includes("--settings"));
});

test("a ping's usage is read from its result line", () => {
  const out = [JSON.stringify({ type: "assistant", message: {} }), JSON.stringify({ type: "result", usage: { cache_read_input_tokens: 396622, cache_creation_input_tokens: 120, output_tokens: 4, input_tokens: 2 } })].join("\n");
  assert.deepEqual(pingUsage(out), { cacheRead: 396622, cacheWrite: 120, output: 4, input: 2 });
  assert.equal(pingUsage("not json"), null);
});

test("pings only once the conversation exists and the task has been quiet for 4 minutes, then every quiet 4 minutes; never after stop", async () => {
  let t = 0;
  const spawned = [];
  const spawnFn = (exe, args, opts) => {
    const c = new EventEmitter();
    c.stdout = new EventEmitter(); c.stdin = { end: (text) => { c.text = text; } }; c.kill = () => { c.killed = true; };
    spawned.push({ exe, args, opts, c });
    return c;
  };
  const pings = [];
  const ka = keepAlive({ exe: "claude", args: ["-p", "--session-id", "s1"], sessionId: "s1", cwd: ".", env: { A: "1" }, every: 1e9, spawnFn, now: () => t, onPing: (x) => pings.push(x) });
  t = KEEP_ALIVE_AFTER_MS + 1; ka.tick();
  assert.equal(spawned.length, 0, "no conversation yet: nothing to keep");
  ka.touch(JSON.stringify({ type: "assistant", message: { id: "m1" } }));
  t += KEEP_ALIVE_AFTER_MS - 1000; ka.tick();
  assert.equal(spawned.length, 0, "quiet for less than 4 minutes");
  t += 2000; ka.tick();
  assert.equal(spawned.length, 1);
  const s = spawned[0];
  assert.deepEqual(s.args.slice(-6), ["--resume", "s1", "--fork-session", "--no-session-persistence", "--max-turns", "1"]);
  assert.deepEqual([s.opts.env.A, s.opts.env.MW_TASK, s.opts.env.MW_PERMIT_TASK], ["1", "keepalive", "keepalive"]);
  assert.match(s.c.text, /single word OK/);
  ka.tick();
  assert.equal(spawned.length, 1, "one ping at a time");
  s.c.stdout.emit("data", Buffer.from(JSON.stringify({ type: "result", usage: { cache_read_input_tokens: 200000, cache_creation_input_tokens: 50, output_tokens: 3 } }) + "\n"));
  t += 9000; s.c.emit("close", 0);
  assert.deepEqual(pings.map((p) => [p.ok, p.usage.cacheRead, p.ms]), [[true, 200000, 9000]]);
  t += KEEP_ALIVE_AFTER_MS - 1; ka.tick();
  assert.equal(spawned.length, 1, "the ping kept the cache: the next one 4 minutes after it");
  t += 2; ka.tick();
  assert.equal(spawned.length, 2);
  ka.stop();
  assert.equal(spawned[1].c.killed, true, "the task ended: its ping goes too");
  t += KEEP_ALIVE_AFTER_MS * 3; ka.tick();
  assert.equal(spawned.length, 2);
});

// Running Claude Code, the same way for every part of the app (audit/112 2.2): the environment it gets (the owner's own sign-in only, never an
// API key, a token or another endpoint of this computer, never the app's session token), how a run is stopped (its whole process tree), the
// sign-in race that is passing, and the one-shot run that answers with JSON (the Review's fresh eyes, the Brand Kit's writer). A film's task
// (agent/index.mjs), the Casting, Writers' Room and Thumbnails labs (character-maker runClaude) start from here.
import { spawn } from "node:child_process";
import { killTree } from "./kill-tree.mjs";
import { APP_ROOT, loadPins } from "../version-manager/index.mjs";
import { claudeEnv, findClaude } from "./index.mjs";

/** Two Claude Code processes refreshing the sign-in at once: passing; the run is tried again a few seconds later. */
export const OAUTH_RACE = /another Claude Code process is refreshing|Failed to refresh OAuth token/i;

/** Claude Code's environment for a run: claudeEnv, without ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, ANTHROPIC_BASE_URL or a variable the
 *  pins strip, and without the app's session token (MW_TOKEN of a dev or test start): Claude's Bash sees this environment. */
export function claudeRunEnv(root = APP_ROOT, extra = {}) {
  const env = claudeEnv(), strip = (loadPins(root).stripEnv ?? []).map((k) => String(k).toUpperCase());
  for (const k of Object.keys(env)) if (/^ANTHROPIC_(API_KEY|AUTH_TOKEN|BASE_URL)$/i.test(k) || strip.includes(k.toUpperCase())) delete env[k];
  delete env.MW_TOKEN;
  return Object.assign(env, extra);
}

// killTree: system-status/kill-tree.mjs, the one way every part of the app stops a process tree (audit/112 r2.1)
export { killTree };

/** One run that answers with JSON (`claude -p --output-format json`): { ok, result, json, raw }. tools: Claude's tools ("Read", "Read,Write");
 *  mode: its permission mode; stopped by `signal` or after timeoutMs (its tree). A sign-in race is tried once more. */
export async function claudeJson(prompt, { cwd, root = APP_ROOT, tools = "Read", mode = "auto", model = "claude-sonnet-5-5", effort = "low", timeoutMs = 5 * 60 * 1000, signal = null } = {}) {
  const exe = findClaude(root);
  if (!exe) return { ok: false, result: null, json: null, raw: "", error: "Claude Code is not installed" };
  const args = ["-p", "--output-format", "json", "--restricted", "--tools", tools, "--permission-mode", mode, "--permission-prompts", "none", "--strict-mcp-config",
    "--disable-slash-commands", "--model", model, "--effort", effort, "--no-session-persistence"];
  const env = claudeRunEnv(root);
  const once = () => new Promise((ok) => {
    const c = spawn(exe, args, { cwd, env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let raw = "";
    const stop = () => killTree(c), t = setTimeout(stop, timeoutMs);
    signal?.addEventListener("abort", stop, { once: true });
    c.stdout.on("data", (d) => { raw += d; });
    c.stderr.resume();
    c.stdin.on("error", () => { /* a run that ended at once: its close says why */ });
    c.stdin.end(prompt, "utf8");
    c.on("close", () => {
      clearTimeout(t); signal?.removeEventListener("abort", stop);
      let json = null; try { json = JSON.parse(raw); } catch { /* not JSON: its last words are the answer */ }
      ok({ ok: !!json && !json.is_error, result: json ? String(json.result ?? "").trim() : raw.slice(-300), json, raw });
    });
    c.on("error", (e) => ok({ ok: false, result: null, json: null, raw, error: e.message }));
  });
  let r = await once();
  if (!r.ok && OAUTH_RACE.test(`${r.result ?? ""} ${r.raw}`) && !signal?.aborted) { await new Promise((ok) => setTimeout(ok, 5000)); r = await once(); }
  return r;
}

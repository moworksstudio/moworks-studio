// The owner's Claude settings for the app and a project's own (Studio Settings, New production, the Editor's chat): model, effort, mode,
// web, the Bypass experiment, and the effort a step runs at. Moved out of agent/index.mjs (audit/112 2.9), which still exports them.
import { writeJson } from "../util/json.mjs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { readJson } from "../util/json.mjs";

const stateDir = (root) => process.env.MW_STATE_DIR ?? join(root, "runtime", "state");

/** Only the 5.5 models (nothing older); the full id is passed so the version is certain. */
export const MODELS = [["opus", "Opus 5.5", "claude-opus-5-5"], ["sonnet", "Sonnet 5.5", "claude-sonnet-5-5"], ["haiku", "Haiku 5.5", "claude-haiku-5-5"]];
export const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
/** Claude Code's permission modes; bypassPermissions only when the user turned the experiment on (agent settings allowBypass). */
export const MODES = [["auto", "Auto"], ["manual", "Manual"], ["acceptEdits", "Accept edits"], ["plan", "Plan"], ["bypassPermissions", "Bypass permissions"]];
export const WEB = ["ask", "on", "off"];
const invalid = (m) => Object.assign(new Error(m), { code: "INVALID" });

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
  if (patch.mode === "bypassPermissions" && !allowBypass) throw invalid("Bypass permissions is an experiment: turn it on in Studio Settings first");
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

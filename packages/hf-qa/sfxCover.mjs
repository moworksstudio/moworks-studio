// G-SFX: a sound on every action (the house rules §7b, owner 30/10). Lists the visible motions of the approved Motion Plan (an entrance,
// an exit, a landing, a step, a door…: the rows the app's own placement gives a sound, packages/sfx/actions.mjs) that have no sound
// within about 0.3 s once the sound effects are placed, unless the owner's choices (prefs.mjs), the brief or the film style ask for silence
// or keep that kind of sound out. A sound the placement moved off a spoken word, or thinned to keep the mix clear, counts as placed. A
// warning, never a block; nothing before the sound effects are placed.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { placedShots, readShots } from "../hf-edit/shots.mjs";
import { read as readPlan } from "../motion-plan/index.mjs";
import { readState, sfxNone } from "../sfx/index.mjs";
import { briefOf, isOff, readPrefs, soundPolicy } from "../sfx/prefs.mjs";
import { isSongFilm } from "../style-catalog/traits.mjs";
import { motionCues, placeOf } from "../sfx/actions.mjs";
import { whooshInto } from "../sfx/auto.mjs";

export const NEAR_S = 0.3;
const r2 = (n) => Math.round(n * 100) / 100;

/** The check on shots and a plan as given: { ran, why?, findings: [{ shot, time, motion, type, want }] }. ran false: nothing to check (no
 *  placement yet, no plan) or silence asked (why). */
export function sfxCover(dir, shots, plan) {
  const st = readState(dir);
  if (!st.placedAt) return { ran: false, findings: [] };
  const prefs = readPrefs(dir), policy = soundPolicy({ prefs, brief: briefOf(dir), song: isSongFilm(null, { dir }) });
  const silent = policy.silent ?? st.policy?.silent ?? null;
  if (silent) return { ran: false, why: silent, findings: [] };
  if (!plan?.shots?.length) return { ran: false, findings: [] };
  const whoosh = st.policy?.whoosh !== false && !isOff(prefs, { family: "whoosh" });
  const allow = (f) => (f !== "whoosh" || whoosh) && !isOff(prefs, { family: f });
  // what sounds now: the app's placed cues (by their moment and their id), the owner's own clips, and what the placement chose to leave
  // out (thinned for the density, taken off by the owner)
  const html = existsSync(join(dir, "index.html")) ? readFileSync(join(dir, "index.html"), "utf8") : "";
  const clips = [...html.matchAll(/<audio\b[^>]*\bid="el-clip-\d+"[^>]*>/gi)].map((m) => Number(/data-start="([^"]+)"/.exec(m[0])?.[1])).filter(Number.isFinite);
  const times = [...(st.mounted ?? []).map((m) => m.start), ...clips, ...(st.thinned ?? []).map((m) => m.start), ...(st.muted ?? []).map((m) => m.start)];
  const ids = new Set([...(st.mounted ?? []), ...(st.thinned ?? [])].map((m) => m.id).filter(Boolean));
  const skip = new Set(prefs.skip ?? []);
  const placed = (shots ?? []).filter((s) => s.start != null && s.duration).sort((a, b) => a.start - b.start), findings = [], seen = new Set();
  placed.forEach((s, i) => {
    if (sfxNone(s)) return;          // the storyboard says this shot is silent
    const motions = plan.shots.find((x) => x.shot === s.number)?.motions ?? [];
    const cut = i > 0 && whooshInto(s, placed[i - 1], plan);
    for (const c of motionCues(s, motions, { allow, surface: placeOf(s)?.surface ?? null, skipCut: cut })) {
      const base = c.id.replace(/:\d+$/, "");          // a walk's steps are one motion
      if (c.alt || c.small || seen.has(base) || isOff(prefs, c) || skip.has(c.id) || skip.has(base)) continue;
      if (ids.has(c.id) || times.some((t) => Math.abs(t - c.start) <= NEAR_S)) { seen.add(base); continue; }
      seen.add(base);
      const m = motions.find((x) => base.endsWith(`:${String(x.id ?? "").toLowerCase()}`));
      findings.push({ shot: s.number, time: r2(c.start), motion: m?.name ?? null, type: m?.type ?? null, want: c.name });
    }
  });
  return { ran: true, findings };
}

const KIND = { entrance: "an entrance", exit: "an exit", text: "a text", transition: "a transition", emphasis: "an emphasis", other: "a motion" };
const message = (x) => `Shot ${x.shot} at ${x.time} s: ${x.motion ? `"${x.motion}" (${KIND[x.type] ?? "a motion"})` : KIND[x.type] ?? "a motion"} has no sound (the app's would be "${x.want}"); place the sound effects again in the Final Mix, or name its sound`;

/** The Tech checks gate: a warning, never a block; null before the sound effects are placed or when the film has no Motion Plan. */
export async function gateSfx(projectDir) {
  if (!readState(projectDir).placedAt) return null;
  const mp = readPlan(projectDir);
  if (!mp.exists || mp.error || !mp.plan.shots?.length) return null;
  let shots;
  try { const r = await readShots(projectDir); shots = placedShots(r.shots, r.root?.duration); }
  catch (e) { return { id: "G-SFX", blocking: false, pass: false, notChecked: true, findings: [{ severity: "warning", code: "not_checked", message: `The sound check could not run: ${String(e.message ?? e).split("\n")[0]}` }] }; }
  const r = sfxCover(projectDir, shots, mp.plan);
  if (!r.ran) return r.why ? { id: "G-SFX", blocking: false, pass: true, findings: [], skipped: r.why === "owner" ? "The owner asked for no sound effects" : r.why === "style" ? "The film style asks for no sound effects" : r.why === "song" ? "A film made for its song has no sound effects" : "The brief asks for no sound effects" } : null;
  // each finding's own sentence is what Tech checks shows (`plain`; Tests 25 and 26 read "Something here may look wrong" for each, while
  // Render named the motion and its sound); no kind code, so the shots are never merged under one motion's words
  return { id: "G-SFX", blocking: false, pass: r.findings.length === 0, warnings: r.findings.length,
    findings: r.findings.map((x) => ({ severity: "warning", shot: x.shot, time: x.time, message: message(x), plain: `${message(x)}.` })) };
}

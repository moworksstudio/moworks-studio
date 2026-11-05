// Claude picks the sound (owner 05/11/2026 #1096 C, audit/103): the library is matched by the words of a sound's tags, and a word can mean
// another thing ("bicycle pump squeak" took an animal's squeak; nine names fell on one pop). For every sound the storyboard or the Motion Plan
// names that the library has no exact sound for, the app shows Claude, in one short run for the whole film, the shot it plays in, what moves,
// and the library's closest sounds (at most PICK_CANDIDATES); Claude picks the one a sound designer would use there, or says none is that
// sound and describes it, and the app makes it with ElevenLabs (generate.mjs) when the owner has a key. Claude's answer is kept in the film
// (sfx.json picks): the next placement asks again only for a cue whose shot, name or candidates changed.
// Order of a named sound (owner #1096): the library's exact sound -> Claude's pick of the library -> made by ElevenLabs -> online -> code.
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { claudeEnv, findClaude } from "../system-status/index.mjs";
import { patchState, readState, useLibrarySound } from "./index.mjs";
import { SUSTAINED_MIN_S, familyOf, matchLocal, rankLocal, sustainedCue, variantsOf } from "./library.mjs";

export const PICK_CANDIDATES = 8;
/** At most this many names in one run (a long film's named sounds; the rest keep the library's own match). */
export const PICK_MAX = 80;
export const PICK_TIMEOUT_MS = 4 * 60 * 1000;

const SKIP_KEYS = new Set(["sfx", "sound", "number", "index", "start", "duration", "end", "id", "frames", "cuts", "image", "images"]);
/** A shot in a few plain words for the prompt: its own text fields, at most 320 characters. */
export function shotText(s) {
  if (!s) return "";
  const parts = Object.entries(s).filter(([k, v]) => !SKIP_KEYS.has(k) && typeof v === "string" && v.trim()).map(([k, v]) => `${k}: ${v.trim().replace(/\s+/g, " ")}`);
  const t = parts.join("; ");
  return t.length > 320 ? `${t.slice(0, 317)}…` : t;
}
/** What a cue's moment is: the shot and the motion it sounds. */
const momentOf = (c, shots) => {
  const s = (shots ?? []).find((x) => x.number === c.shot);
  const motion = [c.motion, c.what, c.label, c.action].find((x) => typeof x === "string" && x.trim());
  return [`shot ${c.shot ?? "?"}${c.start != null ? ` at ${Number(c.start).toFixed(1)} s` : ""}`, motion ? `the move: ${motion}` : null, shotText(s)].filter(Boolean).join(" — ");
};
const secondsOf = (cues) => { const h = Math.max(0, ...cues.map((c) => Number(c.hold) || 0)); return h > 0 ? Math.min(6, h) : sustainedCue(cues[0].name) ? 3 : 1; };
const hash = (x) => createHash("sha1").update(JSON.stringify(x)).digest("hex").slice(0, 12);

/** The names Claude is asked about: named (the storyboard's or the Motion Plan's), not the owner's, not kept as the user left them, and with
 *  no exact sound in the library. Each with its moments, its family and the library's candidates. */
export function pickAsks(dir, cues, shots, { root = APP_ROOT, style = null, styleId = null, families = null, keep = null } = {}) {
  const st = readState(dir), by = new Map();
  for (const c of cues) if ((c.prio ?? 0) < 2) by.set(c.name, [...(by.get(c.name) ?? []), c]);
  const out = [];
  for (const [name, list] of by) {
    const s = st.sounds[name];
    if (s?.source === "owner" || (keep?.has(name) && s)) continue;
    const family = families?.get?.(name) ?? familyOf(name);
    const opts = { family, style, root, filmStyle: styleId, oneShot: true, minDuration: sustainedCue(name) ? SUSTAINED_MIN_S : 0 };
    let m = null; try { m = matchLocal(name, opts); } catch { /* no library */ }
    // the library's own sound only when its tags say every word of the name (T38b-14: "magnet clack" took a typewriter on "clack",
    // "paper sheet rustle" a cloth on "rustle", and Claude never saw them)
    if (m?.exact && m.closeness >= 1) continue;
    let ranked = []; try { ranked = rankLocal(name, opts).slice(0, PICK_CANDIDATES).map((r) => r.entry); } catch { /* no library */ }
    for (const e of m?.choices ?? []) if (!ranked.some((x) => x.id === e.id) && ranked.length < PICK_CANDIDATES) ranked.push(e);
    out.push(askOf(name, list, shots, ranked, family));
    if (out.length >= PICK_MAX) break;
  }
  return out;
}

/** One name to ask about: its moments (at most 3), its length, the library's candidates, and the key its answer is kept by. */
export const askOf = (name, list, shots, candidates, family = null) => ({ name, family, moments: list.slice(0, 3).map((c) => momentOf(c, shots)), seconds: secondsOf(list), candidates,
  ctx: hash([name, list.map((c) => momentOf(c, shots)), candidates.map((e) => e.id)]) });

/** Claude's answers for some asks (one short run), or, with no Claude, a sound made from the name's own words where `makeAll` (or the library
 *  has nothing of its kind): Map name -> { pick } | { make, seconds }. */
export async function askClaude(asks, { ask = null, maker = null, dir, style = null, root = APP_ROOT, filmStyle = null, makeAll = false } = {}) {
  if (!asks.length) return new Map();
  if (ask) return readPicks(await ask(pickPrompt(asks, { style }), { cwd: join(dir, ".moworks") }).catch(() => null), asks);
  const out = new Map();
  if (maker) for (const a of asks) { let m = null; if (!makeAll) try { m = matchLocal(a.name, { family: a.family, root, filmStyle, oneShot: true }); } catch { /* none */ }
    if (makeAll || !m?.good) out.set(a.name, { make: a.name, seconds: a.seconds }); }
  return out;
}

/** Put the answers in the film: a pick becomes the name's sound (with its own numbered variants), a description is made (maker). mark: how the
 *  record says it came ("claude", "made"). { settled, picked, made, none }. */
export async function settleAsks(dir, asks, answers, { root = APP_ROOT, maker = null } = {}) {
  const settled = new Set(), picked = [], made = [], none = [];
  for (const a of asks) {
    const r = answers.get(a.name);
    if (!r) continue;
    if (r.pick) {
      const e = a.candidates.find((x) => x.id === r.pick);
      let vs = [e]; try { vs = [e, ...variantsOf(e, { root }).filter((x) => x.id !== e.id && !a.exclude?.has(x.id))].slice(0, 4); } catch { /* the one */ }
      if (useLibrarySound(dir, a.name, vs)) { patchState(dir, (x) => { x.sounds[a.name].picked = "claude"; (x.picks ??= {})[a.name] = { ctx: a.ctx, pick: r.pick }; }); settled.add(a.name); picked.push(a.name); }
      continue;
    }
    const s = maker ? await maker.make(a.name, r.make, r.seconds) : null;
    if (s) { patchState(dir, (x) => { x.sounds[a.name].picked = "made"; (x.picks ??= {})[a.name] = { ctx: a.ctx, make: r.make, seconds: r.seconds }; }); settled.add(a.name); made.push(a.name); }
    else none.push(a.name);
  }
  return { settled, picked, made, none };
}

/** The prompt of one run: every name, its moments and candidates; the answer is JSON only. */
export function pickPrompt(asks, { style = null } = {}) {
  const rows = asks.map((a, i) => ({ n: i + 1, name: a.name, family: a.family ?? undefined, moments: a.moments, seconds: a.seconds,
    library: a.candidates.map((e) => ({ id: e.id, is: [...new Set([...(e.tags ?? []), e.family].filter(Boolean))].slice(0, 8).join(", "), s: e.duration != null ? Math.round(e.duration * 10) / 10 : undefined })) }));
  return `You are the sound designer of a short motion-graphics film${style ? ` (its style: ${style})` : ""}. Each cue below is a sound the storyboard names, with the moment it plays (the shot and what moves) and the closest sounds of the studio's library (id, what the sound is, its length in seconds).
For each cue, pick the library sound you would really use for that moment: it must be that kind of sound made by that thing (a bicycle pump's squeak is not an animal's squeak; a soft pop for a coin landing is wrong). If none of them is, answer "make" with a short English description of the exact sound for a sound-effect generator (what makes it, how it sounds, how many hits; no music, no voice) and its length in seconds (0.5 to 6).
Answer with JSON only, no other text: {"cues":[{"n":1,"pick":"<library id>"},{"n":2,"make":"<description>","seconds":1.2}]}

${JSON.stringify(rows)}`;
}

/** Claude's answer read: Map name -> { pick } | { make, seconds }; a pick that is no candidate's id is left out. */
export function readPicks(text, asks) {
  const out = new Map();
  let j = null;
  try { j = JSON.parse(String(text ?? "").slice(String(text).indexOf("{"), String(text).lastIndexOf("}") + 1)); } catch { return out; }
  for (const r of j?.cues ?? []) {
    const a = asks[Number(r?.n) - 1];
    if (!a) continue;
    if (typeof r.pick === "string" && a.candidates.some((e) => e.id === r.pick)) out.set(a.name, { pick: r.pick });
    else if (typeof r.make === "string" && r.make.trim()) out.set(a.name, { make: r.make.trim().slice(0, 300), seconds: Math.min(6, Math.max(0.5, Number(r.seconds) || a.seconds)) });
  }
  return out;
}

/** One short Claude run with no tools of use (the owner's Claude, as freshEyes): the text it answers, or null. */
export async function claudeOnce(prompt, { root = APP_ROOT, model = "claude-sonnet-5-5", effort = "low", cwd = process.cwd(), timeoutMs = PICK_TIMEOUT_MS } = {}) {
  const exe = findClaude(root);
  if (!exe) return null;
  const env = claudeEnv();
  for (const k of Object.keys(env)) if (/^ANTHROPIC_(API_KEY|AUTH_TOKEN|BASE_URL)$/i.test(k)) delete env[k];
  const args = ["-p", "--output-format", "json", "--restricted", "--tools", "Read", "--permission-mode", "auto", "--permission-prompts", "none", "--strict-mcp-config",
    "--disable-slash-commands", "--model", model, "--effort", effort, "--no-session-persistence"];
  return new Promise((ok) => {
    const c = spawn(exe, args, { cwd, env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    const t = setTimeout(() => c.kill(), timeoutMs);
    c.stdout.on("data", (d) => { out += d; });
    c.stderr.resume();
    c.stdin.end(prompt, "utf8");
    c.on("close", () => { clearTimeout(t); try { const j = JSON.parse(out); ok(j.is_error ? null : String(j.result ?? "").trim() || null); } catch { ok(null); } });
    c.on("error", () => ok(null));
  });
}

/** The app's asker for a placement, or null in a test or with MW_SFX_PICK=none. */
export const pickAsker = (root = APP_ROOT) => (process.env.NODE_TEST_CONTEXT || process.env.MW_SFX_PICK === "none" ? null : (prompt, { cwd } = {}) => claudeOnce(prompt, { root, cwd }));

/** Settle the named sounds the library has no exact sound for (above). ask(prompt): Claude's answer text (pickAsker), or null: then a name
 *  the library matches only loosely (not `good`) is made when it can be; maker: generate.mjs soundMaker, or null. Returns { settled: Set of
 *  names now on Claude's pick or a made sound, asked, picked, made: [names], none: [names Claude said none for that nothing made] }. */
export async function pickSounds(dir, cues, shots, { root = APP_ROOT, ask = null, maker = null, style = null, styleTitle = null, styleId = null, families = null, keep = null } = {}) {
  const asks = pickAsks(dir, cues, shots, { root, style, styleId, families, keep });
  const settled = new Set(), picked = [], made = [], none = [];
  if (!asks.length) return { settled, asked: 0, picked, made, none };
  const st = readState(dir);
  const has = (n) => !!st.sounds[n] && existsSync(join(dir, ...String(st.sounds[n].file).split("/")));
  // Claude's earlier answer for the same moment and candidates stands (no second run), while its sound is in the film
  const fresh = asks.filter((a) => !(st.picks?.[a.name]?.ctx === a.ctx && has(a.name) && st.sounds[a.name].picked));
  for (const a of asks) if (!fresh.includes(a)) settled.add(a.name);
  const answers = fresh.length ? await askClaude(fresh, { ask, maker, dir, style: styleTitle ?? style, root, filmStyle: styleId }) : new Map();
  const asked = ask ? fresh.length : 0;
  const done = await settleAsks(dir, fresh, answers, { root, maker });
  for (const n of done.settled) settled.add(n);
  picked.push(...done.picked); made.push(...done.made); none.push(...done.none);
  return { settled, asked, picked, made, none };
}

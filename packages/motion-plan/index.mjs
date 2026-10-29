// Motion Plan: the planned motion of each shot, reviewed and approved before a build. HyperFrames has no plan format, so it
// is a small JSON file in the project root, MOTION-PLAN.json, which Claude may write when asked and the app reads, edits and validates.
// The composition itself stays HF-native HTML / GSAP; "planned" vs "built" is a field of each row. Approval lives in .moworks/project.json.
//   { "version": 1, "dynamic"?, "groove"?, "banned"?: [..], "qa"?: [..],
//     "shots": [ { "shot": 1, "motions": [ { "id", "target", "type", "start", "duration", "ease", "behavior",
//       "source": { "kind": "library" | "hf" | "style" | "claude" | "manual", "id"?, "version"? }, "status": "planned" | "built" } ] } ] }
// The plan-level fields are the Moworks motion spec's row 0 and its two lines: the dynamic level, the groove, the defaults
// this film bans, and what will be checked on the built film. "hf" = a move HyperFrames' motion reference describes ("motion.md#<section>": skills/hyperframes/references at the pinned commit).
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ENDINGS } from "../hf-edit/ending.mjs";

export const FILE = "MOTION-PLAN.json";
export const TYPES = ["entrance", "emphasis", "exit", "transition", "loop", "camera", "text", "other"];
export const SOURCES = ["library", "hf", "style", "claude", "manual"];
const strList = (v) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 40) : []);
/** The plan-level fields (row 0 and the BANNED / QA lines), cleaned; absent ones are left out. */
function header(j) {
  const out = {};
  if (typeof j.dynamic === "string" && j.dynamic.trim()) out.dynamic = j.dynamic.trim().slice(0, 200);
  if (typeof j.groove === "string" && j.groove.trim()) out.groove = j.groove.trim().slice(0, 400);
  if (strList(j.banned).length) out.banned = strList(j.banned);
  if (strList(j.qa).length) out.qa = strList(j.qa);
  if (typeof j.approving === "string" && j.approving.trim()) out.approving = j.approving.trim().slice(0, 400);          // what the user approves
  // the film second where the music cuts out (the twist); the app stops the music there when it puts it on the timeline
  if (Number(j.musicStop) > 0) out.musicStop = Math.round(Number(j.musicStop) * 1000) / 1000;
  // outside a What If film the music plays to the end; a stop there needs the brief's or the user's own words asking for it
  if (typeof j.musicStopAsked === "string" && j.musicStopAsked.trim()) out.musicStopAsked = j.musicStopAsked.trim().slice(0, 300);
  // how the film ends (hf-edit/ending.mjs): its kind and the fade's seconds; an end card shortens the music's fade too
  if (ENDINGS.includes(j.ending?.kind)) out.ending = { kind: j.ending.kind, ...(Number(j.ending.fade) > 0 ? { fade: Math.round(Number(j.ending.fade) * 100) / 100 } : {}),
    inside: j.ending.inside === true };          // inside: the fade within the set length (the brief asks for exactly or at most it)
  return out;
}

const num = (v, d = null) => (v === "" || v == null || Number.isNaN(Number(v)) ? d : Math.round(Number(v) * 1000) / 1000);

/** Clean one row; throws INVALID with a plain message on bad input. */
export function cleanMotion(m) {
  const target = String(m.target ?? "").trim();
  if (!target) throw Object.assign(new Error("Each motion needs a target (which element moves)"), { code: "INVALID" });
  const type = TYPES.includes(m.type) ? m.type : "other";
  const start = num(m.start, 0), duration = num(m.duration, null);
  if (start < 0) throw Object.assign(new Error("Start cannot be negative"), { code: "INVALID" });
  if (duration != null && duration <= 0) throw Object.assign(new Error("Length must be more than 0"), { code: "INVALID" });
  // a Vocabulary item Claude cites ("vocab", from library_search) is a Library
  // item; another kind Claude names is its own (New); "By you" only for a row with no source at all (the user's own, from the dialog)
  // a section of HyperFrames' motion reference ("motion.md#<section>") is HF's whatever kind it was given, never a Library item to look up
  const hfRef = /(^|\/)motion\.md#/.test(String(m.source?.id ?? ""));
  const k = hfRef ? "hf" : m.source?.kind === "vocab" ? "library" : m.source ? (SOURCES.includes(m.source.kind) ? m.source.kind : "claude") : "manual";
  const sid = k === "claude" && m.source?.kind !== "claude" ? null          // a kind the app does not know: its id means nothing here
    : m.source?.kind === "vocab" && m.source.id && !/^vocab[/:]/.test(String(m.source.id)) ? `vocab/${m.source.id}` : m.source?.id;
  const src = { kind: k, ...(sid ? { id: String(sid) } : {}), ...(m.source?.version ? { version: String(m.source.version) } : {}) };
  // what the user reads in the dialog: the element in words (`target` is a selector, never shown) and one plain sentence
  const name = String(m.name ?? "").trim().slice(0, 60), plain = String(m.plain ?? "").trim().slice(0, 300);
  return { id: m.id ? String(m.id) : "m" + randomBytes(3).toString("hex"), target, ...(name ? { name } : {}), type, start, duration, ease: String(m.ease ?? "").trim(),
    behavior: String(m.behavior ?? "").trim(), ...(plain ? { plain } : {}), source: src, status: m.status === "built" ? "built" : "planned" };
}

export function read(dir) {
  const f = join(dir, FILE);
  if (!existsSync(f)) return { exists: false, plan: { version: 1, shots: [] }, hash: null, error: null };
  const text = readFileSync(f, "utf8");
  try {
    const j = JSON.parse(text);
    const shots = (Array.isArray(j.shots) ? j.shots : []).map((s) => ({ shot: Number(s.shot), ...says(s), motions: (s.motions ?? []).map((m) => { try { return cleanMotion(m); } catch { return null; } }).filter(Boolean) }))
      .filter((s) => Number.isFinite(s.shot)).sort((a, b) => a.shot - b.shot);
    return { exists: true, plan: { version: 1, ...header(j), shots }, hash: createHash("sha256").update(text).digest("hex"), error: null };
  } catch (e) {
    return { exists: true, plan: { version: 1, shots: [] }, hash: createHash("sha256").update(text).digest("hex"), error: `${FILE} is not valid JSON: ${e.message}` };
  }
}

/** The shots whose motion has no camera row (the Motion Plan runs at medium effort, which left a shot without one in
 *  trial runs; moworks-alive: the camera moves on every hold). Shot numbers, in order. */
export const missingCamera = (plan) => (plan?.shots ?? []).filter((s) => !(s.motions ?? []).some((m) => m.type === "camera")).map((s) => s.shot);

/** A shot's plain words for the user, next to its numbers; absent when Claude wrote none. */
const says = (s) => (typeof s?.says === "string" && s.says.trim() ? { says: s.says.trim().slice(0, 400) } : {});

/** Replace the motions of one shot (the rest of the plan is kept; its plain words too, unless `text` gives new ones). */
export function setShot(dir, shot, motions, text = undefined) {
  const cur = read(dir);
  if (cur.error) throw Object.assign(new Error(cur.error), { code: "INVALID" });
  const rows = (motions ?? []).map(cleanMotion);
  const was = cur.plan.shots.find((s) => s.shot === Number(shot));
  const shots = cur.plan.shots.filter((s) => s.shot !== Number(shot));
  if (rows.length) shots.push({ shot: Number(shot), ...says(text === undefined ? was : { says: text }), motions: rows });
  shots.sort((a, b) => a.shot - b.shot);
  const f = join(dir, FILE);
  const { version: _v, shots: _old, ...head } = cur.plan;
  writeFileSync(f + ".tmp", JSON.stringify({ version: 1, ...head, shots }, null, 2) + "\n");
  renameSync(f + ".tmp", f);
  return read(dir);
}

/** What Claude is told about the file (appended to its system prompt). */
export const PROMPT = `Motion plan: when asked to plan or draft the motion, write ${FILE} in the project root (JSON): {"version":1,"dynamic":"light|strong","groove":"none|<where>","banned":["<defaults this film never shows>"],"qa":["<what you will check on the built film>"],"approving":"<one line in the owner's language: what the owner approves here>","musicStop":<the film second where the music cuts out, or null>,"musicStopAsked":"<the brief's or the owner's own words that ask for that stop, or empty>","ending":{"kind":"fade|endCard|author","fade":<seconds>,"inside":false},"shots":[{"shot":<number>,"says":"<one plain line in the owner's language: what moves and how strongly, e.g. kính xoay nhẹ quanh bà, trôi rõ>","motions":[{"target":"<element's selector>","name":"<the element in 1-3 words in the owner's language, e.g. Tiêu đề, Tấm kính>","type":"${TYPES.join("|")}","start":<s within the shot>,"duration":<s>,"ease":"<GSAP ease>","behavior":"<what it does, concrete numbers>","plain":"<a few plain words in the owner's language, no numbers or code words, e.g. trồi lên nhẹ rồi đứng yên>","source":{"kind":"library|hf|claude","id":"<the id library_search gave, or motion.md#<section> of HyperFrames' motion reference>"},"status":"planned"}]}]}. Every element held on screen, the background, the camera and every character keep moving between the moves (the studio's moworks-alive rule: loop / camera / idle rows with their amplitude and period; nothing still for more than 2 s). A move named from the motion vocabulary (.moworks/rules/motion-vocab: camera moves, motion techniques) may cite its id ("vocab:<number>") as a library source: the app then copies the author's numbers into the project; write your own numbers for this film in the row. The music plays to the film's end and fades out there (the app sets the fade): leave musicStop null. Only a What If film (its rule: the music stops at the turn) or a film whose brief or owner asks for the music to stop at a moment gets a musicStop; for the second kind, quote the brief's or the owner's words in musicStopAsked (the app applies no stop without them, outside What If). Write that second in a pause of the voice-over (between two words of transcript.json, after the sentence that turns), never on a spoken word: the app stops the music there as soon as the music is on the timeline, moved into the nearest pause if it falls on a word (never leave it to the owner). The film never stops dead (the studio's house rules, "The ending"): fill "ending" and give the last shot its ending rows. The fade comes after the length set in New project (the content): a 60 s film is a 65 s file, 10 s is 11.5 s; the shots add up to the content plus the fade, and the last shot carries the fade at its end. "inside": true only when the brief or the owner asks for exactly or at most that length ("exactly 60 s", "no longer than 60 s", a platform's limit): then the fade is within the set length and the shots add up to it; say so in "approving". With no end card or logo ("fade"): the last shot holds and keeps moving gently, and the picture fades out over the last "fade" seconds while the music fades down with it; the fade is 12 % of the content, at least 1.5 s, 3-5 s for 30 s or more, at most 5 s (10 s: 1.5, 20 s: 2.4, 30 s: 3.6, 60 s and longer: 5). With an end card or a logo ("endCard"): the card is part of the content, lands and holds (HyperFrames: 2-3 s), then a shorter fade after it, half of that and at least 1 s. A style whose author gives its own ending ("author": its end card, its last beat) keeps it as shipped, adds nothing to the length and writes no fade row; the app fades the music within that ending. The fade's row in the last shot: {"target":"<the film's root or its stage>","name":"<Kết phim in the owner's language>","type":"exit","start":<the shot's length minus the fade>,"duration":<the fade>,"ease":"power1.in","behavior":"opacity 1 → 0 (to the film's background) over the last <fade> s, with the music fading down together"}. The app fits the music to the whole length and sets its fade to the same seconds. Planning writes only ${FILE}: no composition and no index.html; the Build writes the film once, when asked.`;

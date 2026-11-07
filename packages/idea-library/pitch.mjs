// The Idea Library's pitch (owner #1101, audit/102 §12): Claude pitches ten film ideas for one film style, the owner keeps the ones they
// want (none is saved by default: Save one, Save all), asks for ten more, and has Claude write the script of an idea they kept.
// Two layers (audit/101): the house's (config/rules/idea-pitch/SKILL.md: ten cards, checked sources, nothing saved for the owner, the
// house bans) and the film style's own (what an idea looks like, its length, its voice, its script formula): the files the style's
// Prepare step reads (agent/reads.mjs requiredReads, step "brief"), staged read-only in a lab as a project would have them. A style whose
// files say nothing about ideas gets the general pitch in its own voice and length.
// - A run: a lab folder in the app's state (runtime/state/idea-labs/<job>), Claude Code there (character-maker runClaude) with Read, Write,
//   Glob, Grep, the web (when Settings has it on) and two check tools; the app checks ideas.json / script.json again after the run and asks
//   Claude once more to fix what is wrong, then takes the file and removes the lab.
// - The round in hand: pitch.json beside ideas.json (MW_STATE_DIR), kept until the next Pitch, so closing the dialog loses nothing.
//   Its cards are the owner's to keep, never saved by the app on its own.
// The checks (checkIdeas, checkScript) are plain functions with no import of the app's heavy parts: the lab tools import this file.
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PITCH_COUNT = 10;
export const TRUTHS = ["true", "disputed", "legend", "fiction", "unchecked"];
export const LANGS = ["vi", "en"];
const MAX_TITLE = 120, MAX_TEXT = 1500, MAX_TOPIC = 2000, MAX_FIELDS = 8, MAX_SOURCES = 8, MAX_SCENES = 60;
// words a second the script check allows (a Vietnamese word is one syllable): wide, the style's own pace sits inside (Ricks Clip 3.7 in English)
export const PACE = { en: [2.2, 3.9], vi: [3.0, 4.6] };

// a test's stand-in for Claude Code (the routes run the real one, character-maker runClaude, when none is set)
let STAND_IN = null;
export const setClaudeStandIn = (fn) => { STAND_IN = fn ?? null; };
export const claudeStandIn = () => STAND_IN;

const stateDir = (root) => process.env.MW_STATE_DIR ?? join(root, "runtime", "state");
export const pitchFile = (root) => join(stateDir(root), "pitch.json");
const labsDir = (root) => join(stateDir(root), "idea-labs");
/** Every run of the Writers Room, kept whatever the round in hand becomes (T41-17): [{ at, kind: "pitch"|"script", styleId, round?, ideaId?,
 *  ms, costUsd }], the newest last, at most 500. Claude Code's own figure of the run's cost (its total_cost_usd). */
export const runsFile = (root) => join(stateDir(root), "idea-runs.json");
export function readRuns(root) { try { const j = JSON.parse(readFileSync(runsFile(root), "utf8")); return Array.isArray(j?.runs) ? j.runs : []; } catch { return []; } }
function keepRun(root, run) {
  try { const f = runsFile(root); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify({ version: 1, runs: [...readRuns(root), run].slice(-500) }, null, 1) + "\n"); } catch { /* the round keeps its own */ }
}
const str = (v) => (typeof v === "string" ? v.trim() : "");
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// an English label: Latin letters with no Vietnamese tone marks or letters (đ, ơ, ư, ă, â, ê, ô) and nothing outside Latin-1 letters
const ENGLISH_LABEL = /^[A-Za-z0-9 '’&/(),.:+-]+$/;
// the same idea under another title (T41-5: "…Changed Every Kitchen" after "…Changed Kitchens"): the title's words, without the small
// ones and a plural's s, mostly the same
const SMALL = new Set("a an the of to and in on at for with by from that who which what how why when his her its their our your is was were be been every one two".split(" "));
const keyWords = (t) => new Set(norm(t).split(" ").filter((w) => (w.length > 1 || /\d/.test(w)) && !SMALL.has(w)).map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w)));
export function sameIdea(a, b) {
  const x = keyWords(a), y = keyWords(b);
  if (!x.size || !y.size) return norm(a) === norm(b);
  const both = [...x].filter((w) => y.has(w)).length;
  return both / (x.size + y.size - both) >= 0.6 || (both >= 3 && both === Math.min(x.size, y.size));          // or every word of the shorter one
}
const isUrl = (u) => { try { const x = new URL(u); return x.protocol === "https:" || x.protocol === "http:"; } catch { return false; } };

/** ideas.json's checks: { ok, problems: [line], ideas: [clean card] }. round: { web: bool, avoid: [earlier titles] }. */
export function checkIdeas(data, { web = true, avoid = [] } = {}) {
  const problems = [], ideas = [];
  const list = Array.isArray(data?.ideas) ? data.ideas : null;
  if (!list) return { ok: false, problems: ['ideas.json has no "ideas" list'], ideas };
  if (list.length !== PITCH_COUNT) problems.push(`${list.length} ideas: write exactly ${PITCH_COUNT}`);
  const titles = [];
  list.forEach((x, i) => {
    const n = `Idea ${i + 1}`, title = str(x?.title), hook = str(x?.hook), truth = str(x?.truth);
    if (!title) problems.push(`${n}: no title`);
    else if (title.length > MAX_TITLE) problems.push(`${n}: the title is over ${MAX_TITLE} characters`);
    else if (titles.some((x) => sameIdea(x, title))) problems.push(`${n}: "${title}" is in this round twice`);
    else { const was = avoid.find((x) => sameIdea(x, title)); if (was) problems.push(`${n}: "${title}" is the same idea as "${was}", pitched or kept before: give a different idea`); }
    titles.push(title);
    if (!hook) problems.push(`${n}: no hook`);
    else if (hook.length > MAX_TEXT) problems.push(`${n}: the hook is over ${MAX_TEXT} characters`);
    const fields = Array.isArray(x?.fields) ? x.fields.map((f) => ({ label: str(f?.label), text: str(f?.text) })) : [];
    if (!fields.length) problems.push(`${n}: no fields (the style's items for a card)`);
    if (fields.length > MAX_FIELDS) problems.push(`${n}: ${fields.length} fields: keep to ${MAX_FIELDS}`);
    fields.forEach((f, j) => {
      if (!f.label || !f.text) problems.push(`${n}: field ${j + 1} needs a label and a text`);
      else if (f.text.length > MAX_TEXT) problems.push(`${n}: "${f.label}" is over ${MAX_TEXT} characters`);
      // a label is the app's interface, English for every language (owner 27/10); only the text is in the cards' language
      if (f.label && !ENGLISH_LABEL.test(f.label)) problems.push(`${n}: the label "${f.label}" must be in English (the text stays in the cards' language)`);
    });
    if (!TRUTHS.includes(truth)) problems.push(`${n}: truth must be one of ${TRUTHS.join(", ")}`);
    if (!web && (truth === "true" || truth === "disputed")) problems.push(`${n}: the web is off, so nothing was checked: mark it "unchecked" (or legend, fiction)`);
    if (web && truth === "unchecked") problems.push(`${n}: the web is on: check it, then mark it true, disputed, legend or fiction`);
    const sources = Array.isArray(x?.sources) ? x.sources.map((s) => ({ title: str(s?.title), url: str(s?.url) })) : [];
    sources.forEach((s, j) => { if (!isUrl(s.url)) problems.push(`${n}: source ${j + 1} has no web link`); });
    if ((truth === "true" || truth === "disputed") && !sources.some((s) => isUrl(s.url))) problems.push(`${n}: told as ${truth}, so it needs the sources you checked`);
    const len = Number(x?.lengthSec);
    ideas.push({ title, hook, fields: fields.filter((f) => f.label && f.text).slice(0, MAX_FIELDS), truth: TRUTHS.includes(truth) ? truth : "unchecked",
      sources: sources.filter((s) => isUrl(s.url)).slice(0, MAX_SOURCES).map((s) => ({ title: s.title || s.url, url: s.url })),
      lengthSec: Number.isFinite(len) && len >= 5 && len <= 3600 ? Math.round(len) : null });
  });
  const rules = Array.isArray(data?.rules) ? data.rules.map(str).filter(Boolean).slice(0, 20) : [];
  return { ok: problems.length === 0, problems, ideas, rules };
}

/** A narration's spoken words: each line without its speaker label ("EM: …", [EM: "…"]) and the quotes around the words (T40-7). */
export const SPEAKER = /^\s*(?:\[\s*([^\]:\n]{1,30}):\s*|(\p{Lu}[\p{L}\p{N}.'’-]*(?: [\p{L}\p{N}.'’-]+){0,2}):\s+(?=["“])|(\p{Lu}[\p{Lu}\p{N} .'’-]{0,24}):\s+)/u;
export const spoken = (text) => String(text ?? "").split("\n").map((l) => { const m = SPEAKER.exec(l); return m ? l.slice(m[0].length).replace(/^["“]|["”]\s*\]?\s*$/g, "").trim() : l; }).join("\n");
/** A film style's own rules for each line of its script, from its source skill (T42-1, T42-2: Inner Voice Short's STORY.md "Line rules"). */
export const STYLE_LINES = Object.freeze({
  "inner-voice-short": { narratorWords: 7, voiceWords: 4, voiceLabel: "BÓNG ĐEN", voice: /^(bóng đen|bong den|shadow|the shadow|inner voice|giọng (trong đầu|bên trong)|tiếng (trong đầu|lòng))$/i },
});
/** The words a script has (Vietnamese: one syllable a word). */
export const countWords = (text) => (String(text ?? "").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
/** script.json's checks (#1111: a script is scenes, each with its time, the narration and the picture): { ok, problems, scenes, words,
 *  seconds, text }. round: { lang, lengthSec, sources (how many sources the idea has), styleId }. */
export function checkScript(data, { lang = "vi", lengthSec = 30, sources = 0, styleId = null } = {}) {
  const problems = [], [lo, hi] = PACE[lang] ?? PACE.en;
  const rule = STYLE_LINES[styleId] ?? null;
  const list = Array.isArray(data?.scenes) ? data.scenes : null;
  if (!list || !list.length) return { ok: false, problems: ['script.json has no "scenes" list'], scenes: [], words: 0, seconds: 0, text: "" };
  if (list.length > MAX_SCENES) problems.push(`${list.length} scenes: keep to ${MAX_SCENES}`);
  const scenes = list.slice(0, MAX_SCENES).map((x, i) => {
    const n = `Scene ${i + 1}`, start = Number(x?.start), end = Number(x?.end), narration = str(x?.narration).replace(/\r\n/g, "\n"), picture = str(x?.picture);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) problems.push(`${n}: start and end must be seconds, end after start`);
    if (!picture) problems.push(`${n}: no picture (what the viewer sees, in a line)`);
    if (/^\s*#/m.test(narration)) problems.push(`${n}: the narration has a heading: write only what the voice says`);
    if (/^\s*[([].*[)\]]\s*$/m.test(narration)) problems.push(`${n}: the narration has a line in brackets (a stage direction?): put it in the picture`);
    const refs = Array.isArray(x?.sources) ? x.sources.map(Number) : [];
    for (const k of refs) if (!Number.isInteger(k) || k < 1 || k > sources) problems.push(`${n}: source ${k} is not one of the idea's ${sources} sources`);
    // the style's own line rules (Inner Voice Short's STORY.md: a white line at most 7 words, a red one at most 4, lower case, ending "." or "…")
    if (rule) for (const line of narration.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const m = SPEAKER.exec(line), label = (m?.[1] ?? m?.[2] ?? m?.[3] ?? "").trim(), said = spoken(line), wn = countWords(said);
      if (!wn) continue;
      const red = rule.voice.test(label);
      if (red && wn > rule.voiceWords) problems.push(`${n}: the ${label} line "${said}" has ${wn} words: a red line is at most ${rule.voiceWords}`);
      if (red && (said !== said.toLowerCase() || !/[.…]$/.test(said))) problems.push(`${n}: the ${label} line "${said}" is lower case and ends "." or "…"`);
      if (!red && wn > rule.narratorWords) problems.push(`${n}: the line "${said}" has ${wn} words: a white line is at most ${rule.narratorWords} (one per screen)`);
      if (!red && wn <= rule.voiceWords && said === said.toLowerCase() && /[.…]$/.test(said) && label) problems.push(`${n}: "${said}" reads as a red line (short, lower case): label it ${rule.voiceLabel}, not ${label}`);
    }
    const w = countWords(spoken(narration)), dur = end - start;          // a speaker's label is not read
    if (Number.isFinite(dur) && dur > 0 && w > dur * hi * 1.25 + 3) problems.push(`${n}: ${w} words do not fit in ${Math.round(dur * 10) / 10} s: lengthen the scene or say less`);
    return { start: Math.round(start * 100) / 100, end: Math.round(end * 100) / 100, narration, picture, sources: refs.filter((k) => Number.isInteger(k) && k >= 1 && k <= sources) };
  });
  if (scenes.length && Math.abs(scenes[0].start) > 0.25) problems.push("Scene 1 must start at 0");
  for (let i = 1; i < scenes.length; i++) if (Math.abs(scenes[i].start - scenes[i - 1].end) > 0.25) problems.push(`Scene ${i + 1} must start where scene ${i} ends (${scenes[i - 1].end} s)`);
  const total = scenes.at(-1)?.end ?? 0;
  // the scenes run the length asked for, near enough (T40-2: 45 s of scenes for a 60 s film)
  if (Math.abs(total - lengthSec) > Math.max(2, lengthSec * 0.1)) problems.push(`the scenes run ${total} s: make them about ${lengthSec} s`);
  const text = scenes.map((x) => x.narration).filter(Boolean).join("\n"), words = countWords(spoken(text));
  const min = Math.floor(lengthSec * lo), max = Math.ceil(lengthSec * hi);
  if (!words) problems.push("no scene has narration");
  else if (words < min) problems.push(`${words} words is short for ${lengthSec} s: write about ${min}-${max}`);
  else if (words > max) problems.push(`${words} words is long for ${lengthSec} s: write about ${min}-${max}`);
  return { ok: problems.length === 0, problems, scenes, words, seconds: Math.round(total), text };
}
/** A saved script's scenes: an older script (narration only, before #1111) reads as one scene. */
export const scenesOf = (script) => (Array.isArray(script?.scenes) && script.scenes.length ? script.scenes
  : script?.text ? [{ start: 0, end: script.seconds || script.lengthSec || 0, narration: script.text, picture: "", sources: [] }] : []);

// ---- the round in hand (pitch.json)
export function readPitch(root) {
  try { const j = JSON.parse(readFileSync(pitchFile(root), "utf8")); return j && Array.isArray(j.ideas) ? j : null; } catch { return null; }
}
function writePitch(root, p) {
  const f = pitchFile(root);
  mkdirSync(dirname(f), { recursive: true });
  if (p == null) { rmSync(f, { force: true }); return null; }
  writeFileSync(f + ".tmp", JSON.stringify(p, null, 1) + "\n");
  renameSync(f + ".tmp", f);
  return p;
}
export const clearPitch = (root) => { writePitch(root, null); return { ok: true }; };

// the brief's own labels: English in every language, as the app's interface is (owner 27/10); the idea's words are its own language
const LABELS = { truth: "True or legend", sources: "Sources", length: "Length", about: "about {n} s",
  t: { true: "documented (checked)", disputed: "a disputed account", legend: "a legend", fiction: "made up for the film", unchecked: "not checked (the web was off)" } };
/** A card as the brief My ideas keeps: its title, hook, the style's items, true or legend, the sources and the length. */
export function ideaBrief(card) {
  const L = LABELS;
  return [card.title, "", card.hook, "", ...card.fields.map((f) => `${f.label}: ${f.text}`), `${L.truth}: ${L.t[card.truth] ?? card.truth}`,
    ...(card.sources.length ? [`${L.sources}:`, ...card.sources.map((s) => `- ${s.title}: ${s.url}`)] : []),
    ...(card.lengthSec ? [`${L.length}: ${L.about.replace("{n}", card.lengthSec)}`] : [])].join("\n").trim();
}

// ---- the lab
/** The film style a pitch is for, with what the request says of it: { id, title, author, description, intendedUse, lengthSec }. */
async function styleFor(styleId, root) {
  const { getStyle, selection } = await import("../style-catalog/index.mjs");
  const s = getStyle(String(styleId ?? ""), root);
  if (!s) throw Object.assign(new Error("Choose a film style"), { code: "INVALID" });
  return { id: s.id, title: s.title, author: selection(s).author ?? null, description: s.description ?? "", intendedUse: s.intendedUse ?? "", lengthSec: Number(s.defaultLength) || null };
}

/** The lab of one run, staged as a film of this style would be for its Prepare step: { lab, reads } (lab-relative paths). */
export async function stageLab(dir, styleId, root) {
  mkdirSync(join(dir, "tools"), { recursive: true });
  for (const f of ["check-ideas.mjs", "check-script.mjs"]) cpSync(join(HERE, "lab-tools", f), join(dir, "tools", f));
  writeFileSync(join(dir, "tools", "app-root.txt"), `${root}\n`);
  // the style's rules and its own sources (source skill, engine and the author's guides) as a film's brief step stages them (agent/rules.mjs)
  const { stageFor } = await import("../agent/rules.mjs");
  const { first } = stageFor(dir, styleId, { step: "brief", root });
  const { requiredReads, missingReads } = await import("../agent/reads.mjs");
  const pack = join(dir, ".moworks", "pitch", "SKILL.md");
  mkdirSync(dirname(pack), { recursive: true });
  cpSync(join(root, "config", "rules", "idea-pitch", "SKILL.md"), pack);
  // a rules file the step should read and cannot: said in the run's log by the caller, never dropped in silence (audit/112 3.3)
  return { lab: dir, reads: [".moworks/pitch/SKILL.md", ...requiredReads(dir, { styleId, first, step: "brief" })], missing: missingReads(dir, { styleId, first, step: "brief" }) };
}

const LANG_NAME = { vi: "Vietnamese", en: "English" };
const list = (xs) => xs.map((p) => `- ${p}`).join("\n");
function pitchRequest({ style, reads, topic, lang, lengthSec, web, avoid }) {
  return `Pitch ${PITCH_COUNT} film ideas for the film style "${style.title}"${style.author ? ` (by ${style.author})` : ""}, as .moworks/pitch/SKILL.md says (read it first).

The film style: ${style.description}${style.intendedUse ? `\nIts intended use: ${style.intendedUse}` : ""}
Read these files of the style (its rules and source skill, as its Prepare step reads them) and follow what they say about ideas, topics, formats and the script:
${list(reads.slice(1))}

The owner's topic or direction: ${topic || "(none: mix them as the style's own way says)"}
Language of the cards: ${LANG_NAME[lang]}. Film length: about ${lengthSec} s.
The web: ${web ? "on (check every story told as true, and keep the links you opened)" : "off (search nothing; mark every true story unchecked)"}.
${avoid.length ? `Pitched before or kept in My ideas (give none of these again, nor the same story under another title):\n${list(avoid)}\n` : ""}
Write ideas.json, run node tools/check-ideas.mjs until it says OK, then reply with one short line.`;
}
function scriptRequest({ style, reads, idea, sources, lang, lengthSec }) {
  return `Write the script of this film idea for the film style "${style.title}"${style.author ? ` (by ${style.author})` : ""}, as .moworks/pitch/SKILL.md §4 says (read it first).

Read these files of the style and follow its script formula and pace:
${list(reads.slice(1))}

The idea the owner kept:
${idea.brief}
${sources.length ? `\nIts sources, numbered as the scenes cite them:\n${sources.map((x, i) => `${i + 1}. ${x.title}: ${x.url}`).join("\n")}\n` : ""}
Language: ${LANG_NAME[lang]}. Length: about ${lengthSec} s.
Write script.json, run node tools/check-script.mjs until it says OK, then reply with one short line.`;
}

const ALLOWED = ["Bash(node tools/check-ideas.mjs:*)", "Bash(node tools/check-script.mjs:*)"];
// the steps a run shows (Writers Room's running panel, audit/104 §7c): plain words, a count of the pages read, never a command or a path
const STEPS = {
  pitch: [["style", "Reading the film style"], ["web", "Searching the web"], ["write", "Writing the ideas"], ["check", "Checking the ideas"]],
  script: [["style", "Reading the film style"], ["write", "Writing the scenes"], ["check", "Checking the script"]],
};
// how long each step takes of a whole run (Test 40's runs: the reading is short, the writing long), and a run's usual length (the middle of
// PITCH_ESTIMATE / SCRIPT_ESTIMATE): the percent moves through the running step with the time it has taken (owner #1324, T42-3: the chip
// said 0% through the whole first step, and stood still through the long writing)
export const STEP_SHARE = { style: 0.08, web: 0.35, write: 0.4, check: 0.17 };
export const RUN_MS = { pitch: 7.5 * 60000, script: 3.5 * 60000 };
/** The percent of a run: the share of the steps done (a skipped one gives its share to the others), and of the running step as much of its
 *  share as its time so far is of its usual time, at most 90 % of it (it ends when Claude's call says so, not the clock). */
export function runPercent(steps, kind, now = Date.now()) {
  const live = steps.filter((x) => x.state !== "skip"), sum = live.reduce((a, x) => a + (STEP_SHARE[x.id] ?? 0.2), 0) || 1;
  let p = 0;
  for (const x of live) {
    const w = (STEP_SHARE[x.id] ?? 0.2) / sum;
    if (x.state === "done") p += w;
    else if (x.state === "run" && x.at) p += w * Math.min(0.9, (now - x.at) / (w * (RUN_MS[kind] ?? 5 * 60000)));
  }
  return Math.min(99, Math.floor(100 * p));
}
/** The run's steps, kept on the job, moved only by what Claude really did (T41-1): set(id) runs that step and finishes the ones before
 *  it that ran (one that never ran, a search with no page read, is left out, not ticked); read() counts a page read. onProgress(stage,
 *  percent): the job's stage and its percent (0-100) for the top bar's chip (T41-2), moving every two seconds while a step runs and never
 *  going back. stop() ends the ticking. */
function stepper(kind, web, onSteps, onProgress) {
  const steps = STEPS[kind].filter(([id]) => web || id !== "web").map(([id, label]) => ({ id, label, state: "todo", count: 0 }));
  let last = 0, ended = false;
  const send = () => {
    onSteps(steps.map(({ at: _at, ...x }) => ({ ...x })));
    const cur = steps.find((x) => x.state === "run");
    last = ended ? 100 : Math.max(last, runPercent(steps, kind));
    onProgress(cur?.label ?? "Done", last);
  };
  const tick = setInterval(() => { if (!ended && steps.some((x) => x.state === "run")) { const cur = steps.find((x) => x.state === "run"); last = Math.max(last, runPercent(steps, kind)); onProgress(cur.label, last); } }, 2000);
  tick.unref?.();
  return {
    set(id) {
      // forward only: a page read after the ideas were begun counts, it does not take the run back (T40-1)
      const i = steps.findIndex((x) => x.id === id), cur = steps.findIndex((x) => x.state === "run");
      if (i < 0 || steps[i].state === "run" || steps[i].state === "done" || (cur >= 0 && i < cur)) return;
      steps.forEach((x, k) => { x.state = k < i ? (x.state === "todo" || x.state === "skip" ? "skip" : "done") : k === i ? "run" : x.state === "done" ? "done" : "todo"; });
      steps[i].at = Date.now(); send();
    },
    read() { const w = steps.find((x) => x.id === "web"); if (!w) return; w.count++; if (w.state === "todo") this.set("web"); else send(); },
    done() { steps.forEach((x) => { x.state = x.state === "skip" || (x.state === "todo" && x.id === "web") ? "skip" : "done"; }); ended = true; clearInterval(tick); send(); },
    stop() { clearInterval(tick); },
  };
}
/** What one of Claude's tool calls is, from the call itself (T41-1): the round's own file written, its own check run, the web; anything
 *  else (a note, another command, a read) moves no step. */
export function toolKind(e, file) {
  const name = String(e?.name ?? ""), base = String(e?.file ?? "").split(/[\\/]/).pop();
  if (name === "WebSearch") return "search";
  if (name === "WebFetch") return "page";
  if (/^(Write|Edit|MultiEdit)$/.test(name)) return base === file ? "write" : "notes";
  if (name === "Bash") return /node\s+tools[\\/]check-(ideas|script)\.mjs/.test(String(e?.command ?? "")) ? "check" : "other";
  return "read";
}
const SAY = { search: "Searching the web", page: "Reading a source", notes: "Taking notes", check: "Checking", other: "Working", read: "Reading the film style's rules" };
export const RETRY_MS = () => Number(process.env.MW_IDEA_RETRY_MS ?? 5000);
async function run({ kind, root, jobId, styleId, request, round, file, check, claude, signal, onStep, onSteps = () => {}, log, web }) {
  const lab = join(labsDir(root), jobId);
  rmSync(lab, { recursive: true, force: true }); mkdirSync(lab, { recursive: true });
  const steps = stepper(kind, web, onSteps, onStep);
  try {
    steps.set("style");
    const st = await stageLab(lab, styleId, root);
    if (st.missing.length) {
      const { missingLine } = await import("../agent/reads.mjs");
      log(missingLine(st.missing.length)); console.error(`[rules] ${styleId ?? "no style"} ${kind}: not found ${st.missing.join(", ")}`);
    }
    writeFileSync(join(lab, "tools", "round.json"), JSON.stringify(round, null, 1) + "\n");
    const { agentSettings } = await import("../agent/index.mjs"), { OAUTH_RACE } = await import("../system-status/claude-run.mjs");
    const s = agentSettings(root);
    const tools = `Read,Write,Edit,Glob,Grep,Bash${web ? ",WebSearch,WebFetch" : ""}`, allowed = [...ALLOWED, ...(web ? ["WebSearch", "WebFetch"] : [])];
    const ask = async (brief) => {
      const once = () => claude({ lab, brief, allowed, root, model: s.model, effort: "high", tools, signal, onEvent: (e) => {
        if (e.kind !== "tool") return;
        // what Claude is doing in plain words: never a command, a file's name or its path (the UI shows no paths; #1110)
        const k = toolKind(e, file);
        log(k === "write" ? (kind === "pitch" ? "Writing the ideas" : "Writing the script") : SAY[k]);
        if (k === "search") steps.set("web"); else if (k === "page") steps.read(); else if (k === "write") steps.set("write"); else if (k === "check") steps.set("check");
      } });
      let r = await once();
      // two Claude Code runs refreshing the sign-in at once (a film's step beside this one) is passing: once more, a few seconds later
      if (!r.ok && !signal?.aborted && OAUTH_RACE.test(String(r.error ?? ""))) {
        log("Claude Code was busy refreshing its sign-in: trying again");
        await new Promise((ok) => setTimeout(ok, RETRY_MS()));
        if (!signal?.aborted) r = await once();
      }
      if (signal?.aborted) throw Object.assign(new Error("Stopped"), { code: "CANCELLED" });
      if (!r.ok) throw Object.assign(new Error(r.error ?? "Claude could not finish"), { code: "CLAUDE" });
      return r;
    };
    const watch = setInterval(() => {
      try { if (existsSync(join(lab, file))) steps.set("write"); if (existsSync(join(lab, "tools", ".checked"))) steps.set("check"); } catch { /* the lab is going */ }
    }, 700);
    let first;
    try { first = await ask(request(st.reads)); } finally { clearInterval(watch); }
    let got = check(join(lab, file));
    let cost = first.costUsd ?? 0, ms = first.ms ?? 0;
    if (!got.ok) {          // one more go at what is wrong
      log(`Asking Claude to fix: ${got.problems.slice(0, 3).join("; ")}`);
      steps.set("check");
      const again = await ask(`The app's check of ${file} found:\n${list(got.problems)}\nFix ${file} (keep what is right), run the check again until it says OK, then reply with one line.`);
      cost += again.costUsd ?? 0; ms += again.ms ?? 0;
      got = check(join(lab, file));
      if (!got.ok) throw Object.assign(new Error(`Claude's ${kind === "pitch" ? "ideas" : "script"} did not pass the check: ${got.problems.slice(0, 3).join("; ")}`), { code: "CHECK", detail: got.problems });
    }
    steps.done();
    return { ...got, costUsd: cost, ms, reads: st.reads };
  } finally { steps.stop(); rmSync(lab, { recursive: true, force: true }); }
}
const readJsonFile = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };

/** A round of ten: the first of a new pitch, or ten more for the one in hand (`more`). input: { styleId, topic, lang, lengthSec, more }.
 *  Returns the pitch in hand. */
export async function pitchIdeas(input, { root, jobId, claude, signal = null, onStep = () => {}, onSteps = () => {}, log = () => {} }) {
  const was = input.more ? readPitch(root) : null;
  if (input.more && !was) throw Object.assign(new Error("There is no pitch to add to: pitch first"), { code: "INVALID" });
  const styleId = was?.styleId ?? String(input.styleId ?? "");
  const style = await styleFor(styleId, root);
  const lang = was?.lang ?? (LANGS.includes(input.lang) ? input.lang : "vi");
  const lengthSec = was?.lengthSec ?? Math.max(5, Math.min(3600, Math.round(Number(input.lengthSec) || style.lengthSec || 30)));
  const topic = was?.topic ?? String(input.topic ?? "").trim().slice(0, MAX_TOPIC);
  const { agentSettings } = await import("../agent/index.mjs");
  const web = agentSettings(root).web !== "off";
  // none of this round's cards, nor an idea already kept in My ideas (T41-5), again
  const { readIdeas } = await import("./index.mjs");
  const avoid = [...new Set([...(was ? was.ideas.map((x) => x.title) : []), ...readIdeas(root).map((x) => x.name)])].slice(0, 300);
  const round = { web, avoid, lang, lengthSec };
  const res = await run({ kind: "pitch", root, jobId, styleId, round, file: "ideas.json", web, claude, signal, onStep, onSteps, log,
    request: (reads) => pitchRequest({ style, reads, topic, lang, lengthSec, web, avoid }), check: (f) => checkIdeas(readJsonFile(f), round) });
  const now = new Date().toISOString(), n = was ? was.rounds + 1 : 1;
  const cards = res.ideas.map((c) => ({ id: randomBytes(5).toString("hex"), round: n, ...c, lengthSec: c.lengthSec ?? lengthSec, savedAs: null }));
  keepRun(root, { at: now, kind: "pitch", styleId, round: n, ms: res.ms, costUsd: res.costUsd });
  return writePitch(root, {
    version: 1, styleId, styleTitle: style.title, author: style.author, topic, lang, lengthSec, web, rounds: n,
    rules: [...new Set([...(was?.rules ?? []), ...res.rules])], startedAt: was?.startedAt ?? now, at: now,
    ideas: [...(was?.ideas ?? []), ...cards], runs: [...(was?.runs ?? []), { round: n, at: now, ms: res.ms, costUsd: res.costUsd }],
  });
}

/** Keep cards of the pitch in hand in My ideas (ids, or every card not kept yet when `all`): each once. Returns { ideas: [saved], pitch }. */
export async function savePitched(root, { ids = [], all = false } = {}) {
  const p = readPitch(root);
  if (!p) throw Object.assign(new Error("There is no pitch in hand any more"), { code: "NOT_FOUND" });
  const want = all ? p.ideas.filter((x) => !x.savedAs) : p.ideas.filter((x) => ids.includes(x.id) && !x.savedAs);
  if (!all && !ids.every((id) => p.ideas.some((x) => x.id === id))) throw Object.assign(new Error("That idea is not in the pitch any more"), { code: "NOT_FOUND" });
  const { createIdea } = await import("./index.mjs");
  const saved = [];
  for (const card of want) {
    const idea = createIdea(root, { name: card.title, brief: ideaBrief(card), styleId: p.styleId },
      { pitch: { styleId: p.styleId, style: p.styleTitle, author: p.author, rules: p.rules, truth: card.truth, sources: card.sources, lang: p.lang, lengthSec: card.lengthSec, at: p.at,
        card: { title: card.title, hook: card.hook, fields: card.fields, truth: card.truth, sources: card.sources, lengthSec: card.lengthSec } } });
    card.savedAs = idea.id;
    saved.push(idea);
  }
  writePitch(root, p);
  return { ideas: saved, pitch: p };
}

/** Write the script of an idea in My ideas, for its film style (or the one given): saved on the idea. input: { styleId?, lang?, lengthSec? }. */
export async function scriptIdea(id, input, { root, jobId, claude, signal = null, onStep = () => {}, onSteps = () => {}, log = () => {} }) {
  const { readIdeas, setScript } = await import("./index.mjs");
  const idea = readIdeas(root).find((x) => x.id === id);
  if (!idea) throw Object.assign(new Error("That idea is not here any more."), { code: "NOT_FOUND" });
  const styleId = String(input.styleId || idea.styleId || "general");
  const style = await styleFor(styleId, root);
  const lang = LANGS.includes(input.lang) ? input.lang : idea.pitch?.lang ?? "vi";
  const lengthSec = Math.max(5, Math.min(3600, Math.round(Number(input.lengthSec) || idea.pitch?.lengthSec || style.lengthSec || 30)));
  const { agentSettings } = await import("../agent/index.mjs");
  const sources = idea.pitch?.sources ?? [];
  // the script is written from the idea and the style's own rules (the steps show no search: the facts were checked at the pitch)
  const web = agentSettings(root).web !== "off", round = { lang, lengthSec, sources: sources.length, styleId };
  const res = await run({ kind: "script", root, jobId, styleId, round, file: "script.json", web, claude, signal, onStep, onSteps, log,
    request: (reads) => scriptRequest({ style, reads, idea, sources, lang, lengthSec }), check: (f) => checkScript(readJsonFile(f), round) });
  keepRun(root, { at: new Date().toISOString(), kind: "script", styleId, ideaId: id, ms: res.ms, costUsd: res.costUsd });
  return setScript(root, id, { scenes: res.scenes, text: res.text, words: res.words, seconds: res.seconds, lang, lengthSec, styleId, style: style.title, author: style.author,
    at: new Date().toISOString(), by: "claude", run: { ms: res.ms, costUsd: res.costUsd } });
}

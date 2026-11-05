// The Idea Library's pitch (owner #1101, audit/102 §12): Claude pitches ten film ideas for one film style, the owner keeps the ones they
// want (none is saved by default: Save one, Save all), asks for ten more, and has Claude write the script of an idea they kept.
// Two layers (audit/101): the house's (config/rules/idea-pitch/SKILL.md: ten cards, checked sources, nothing saved for the owner, the
// house bans) and the film style's own (what an idea looks like, its length, its voice, its script formula): the files the style's
// Prepare step reads (agent/reads.mjs requiredReads, step "brief"), staged read-only in a lab as a project would have them. A style whose
// files say nothing about ideas gets the general pitch in its own voice and length.
// - A run: a lab folder in the app's state (runtime/state/idea-labs/<job>), Claude Code there (character-maker runClaude) with Read, Write,
//   Glob, Grep, the web (when Settings has it on) and two check tools; the app checks ideas.json / script.md again after the run and asks
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
const MAX_TITLE = 120, MAX_TEXT = 1500, MAX_TOPIC = 2000, MAX_FIELDS = 8, MAX_SOURCES = 8;
// words a second the script check allows (a Vietnamese word is one syllable): wide, the style's own pace sits inside (Ricks Clip 3.7 in English)
export const PACE = { en: [2.2, 3.9], vi: [3.0, 4.6] };

// a test's stand-in for Claude Code (the routes run the real one, character-maker runClaude, when none is set)
let STAND_IN = null;
export const setClaudeStandIn = (fn) => { STAND_IN = fn ?? null; };
export const claudeStandIn = () => STAND_IN;

const stateDir = (root) => process.env.MW_STATE_DIR ?? join(root, "runtime", "state");
export const pitchFile = (root) => join(stateDir(root), "pitch.json");
const labsDir = (root) => join(stateDir(root), "idea-labs");
const str = (v) => (typeof v === "string" ? v.trim() : "");
const norm = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const isUrl = (u) => { try { const x = new URL(u); return x.protocol === "https:" || x.protocol === "http:"; } catch { return false; } };

/** ideas.json's checks: { ok, problems: [line], ideas: [clean card] }. round: { web: bool, avoid: [earlier titles] }. */
export function checkIdeas(data, { web = true, avoid = [] } = {}) {
  const problems = [], ideas = [];
  const list = Array.isArray(data?.ideas) ? data.ideas : null;
  if (!list) return { ok: false, problems: ['ideas.json has no "ideas" list'], ideas };
  if (list.length !== PITCH_COUNT) problems.push(`${list.length} ideas: write exactly ${PITCH_COUNT}`);
  const seen = new Set(avoid.map(norm)), titles = new Set();
  list.forEach((x, i) => {
    const n = `Idea ${i + 1}`, title = str(x?.title), hook = str(x?.hook), truth = str(x?.truth);
    if (!title) problems.push(`${n}: no title`);
    else if (title.length > MAX_TITLE) problems.push(`${n}: the title is over ${MAX_TITLE} characters`);
    else if (titles.has(norm(title))) problems.push(`${n}: "${title}" is in this round twice`);
    else if (seen.has(norm(title))) problems.push(`${n}: "${title}" was pitched before: give a different idea`);
    titles.add(norm(title));
    if (!hook) problems.push(`${n}: no hook`);
    else if (hook.length > MAX_TEXT) problems.push(`${n}: the hook is over ${MAX_TEXT} characters`);
    const fields = Array.isArray(x?.fields) ? x.fields.map((f) => ({ label: str(f?.label), text: str(f?.text) })) : [];
    if (!fields.length) problems.push(`${n}: no fields (the style's items for a card)`);
    if (fields.length > MAX_FIELDS) problems.push(`${n}: ${fields.length} fields: keep to ${MAX_FIELDS}`);
    fields.forEach((f, j) => { if (!f.label || !f.text) problems.push(`${n}: field ${j + 1} needs a label and a text`); else if (f.text.length > MAX_TEXT) problems.push(`${n}: "${f.label}" is over ${MAX_TEXT} characters`); });
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

/** The words a script has (Vietnamese: one syllable a word). */
export const countWords = (text) => (String(text ?? "").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
/** script.md's checks: { ok, problems, words, seconds, text }. round: { lang, lengthSec }. */
export function checkScript(text, { lang = "vi", lengthSec = 30 } = {}) {
  const clean = String(text ?? "").replace(/\r\n/g, "\n").trim(), problems = [];
  const words = countWords(clean), [lo, hi] = PACE[lang] ?? PACE.en;
  if (!clean) return { ok: false, problems: ["script.md is empty"], words: 0, seconds: 0, text: "" };
  if (/^\s*#/m.test(clean)) problems.push("script.md has a heading: write the narration only");
  if (/^\s*[([].*[)\]]\s*$/m.test(clean)) problems.push("script.md has a line in brackets (a stage direction?): write only what the voice says");
  const min = Math.floor(lengthSec * lo), max = Math.ceil(lengthSec * hi);
  if (words < min) problems.push(`${words} words is short for ${lengthSec} s: write about ${min}-${max}`);
  if (words > max) problems.push(`${words} words is long for ${lengthSec} s: write about ${min}-${max}`);
  const mid = (lo + hi) / 2;
  return { ok: problems.length === 0, problems, words, seconds: Math.round(words / mid), text: clean };
}

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

const LABELS = {
  en: { truth: "True or legend", sources: "Sources", length: "Length", about: "about {n} s",
    t: { true: "documented (checked)", disputed: "a disputed account", legend: "a legend", fiction: "made up for the film", unchecked: "not checked (the web was off)" } },
  vi: { truth: "Thật hay truyền thuyết", sources: "Nguồn", length: "Độ dài", about: "khoảng {n} giây",
    t: { true: "có thật (đã kiểm)", disputed: "còn tranh cãi", legend: "truyền thuyết", fiction: "hư cấu cho phim", unchecked: "chưa kiểm (web đang tắt)" } },
};
/** A card as the brief My ideas keeps: its title, hook, the style's items, true or legend, the sources and the length. */
export function ideaBrief(card, lang = "vi") {
  const L = LABELS[lang] ?? LABELS.en;
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
  const { prepareRules } = await import("../agent/index.mjs");
  const { first } = prepareRules(dir, styleId, root);
  // the style's source skill or engine guide where a film reads it (only the owner's styles and What If name files there in the brief step)
  try {
    const ms = await import("../moworks-styles/index.mjs");
    if (ms.isMoworksStyle(styleId)) ms.stageGuide(dir, styleId, root);
    else if (styleId === "what-if") (await import("../what-if-styles/index.mjs")).stageEngine(dir, root);
  } catch { /* the rules are enough */ }
  const { requiredReads } = await import("../agent/reads.mjs");
  const pack = join(dir, ".moworks", "pitch", "SKILL.md");
  mkdirSync(dirname(pack), { recursive: true });
  cpSync(join(root, "config", "rules", "idea-pitch", "SKILL.md"), pack);
  return { lab: dir, reads: [".moworks/pitch/SKILL.md", ...requiredReads(dir, { styleId, first, step: "brief" })] };
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
${avoid.length ? `Pitched before (give none of these again, nor the same story under another title):\n${list(avoid)}\n` : ""}
Write ideas.json, run node tools/check-ideas.mjs until it says OK, then reply with one short line.`;
}
function scriptRequest({ style, reads, idea, lang, lengthSec }) {
  return `Write the script of this film idea for the film style "${style.title}"${style.author ? ` (by ${style.author})` : ""}, as .moworks/pitch/SKILL.md §4 says (read it first).

Read these files of the style and follow its script formula and pace:
${list(reads.slice(1))}

The idea the owner kept:
${idea.brief}

Language: ${LANG_NAME[lang]}. Length: about ${lengthSec} s.
Write script.md, run node tools/check-script.mjs until it says OK, then reply with one short line.`;
}

const ALLOWED = ["Bash(node tools/check-ideas.mjs:*)", "Bash(node tools/check-script.mjs:*)"];
async function run({ kind, root, jobId, styleId, request, round, file, check, claude, signal, onStep, log, web }) {
  const lab = join(labsDir(root), jobId);
  rmSync(lab, { recursive: true, force: true }); mkdirSync(lab, { recursive: true });
  try {
    onStep("Reading the film style", 0.05);
    const st = await stageLab(lab, styleId, root);
    writeFileSync(join(lab, "tools", "round.json"), JSON.stringify(round, null, 1) + "\n");
    const { agentSettings } = await import("../agent/index.mjs");
    const s = agentSettings(root);
    const tools = `Read,Write,Edit,Glob,Grep,Bash${web ? ",WebSearch,WebFetch" : ""}`, allowed = [...ALLOWED, ...(web ? ["WebSearch", "WebFetch"] : [])];
    const ask = async (brief, at) => {
      onStep(kind === "pitch" ? (web ? "Researching and pitching" : "Pitching") : "Writing the script", at);
      const r = await claude({ lab, brief, allowed, root, model: s.model, effort: "high", tools, signal, onEvent: (e) => {
        // what Claude is doing in plain words: never a command, a file's name or its path (the UI shows no paths; #1110)
        if (e.kind === "tool") log(e.name === "WebSearch" ? "Searching the web" : e.name === "WebFetch" ? "Reading a source"
          : /^(Write|Edit|MultiEdit)$/.test(e.name ?? "") ? (kind === "pitch" ? "Writing the ideas" : "Writing the script") : "Reading the film style's rules");
      } });
      if (signal?.aborted) throw Object.assign(new Error("Stopped"), { code: "CANCELLED" });
      if (!r.ok) throw Object.assign(new Error(r.error ?? "Claude could not finish"), { code: "CLAUDE" });
      return r;
    };
    const first = await ask(request(st.reads), 0.15);
    let got = check(join(lab, file));
    let cost = first.costUsd ?? 0, ms = first.ms ?? 0;
    if (!got.ok) {          // one more go at what is wrong
      log(`Asking Claude to fix: ${got.problems.slice(0, 3).join("; ")}`);
      const again = await ask(`The app's check of ${file} found:\n${list(got.problems)}\nFix ${file} (keep what is right), run the check again until it says OK, then reply with one line.`, 0.8);
      cost += again.costUsd ?? 0; ms += again.ms ?? 0;
      got = check(join(lab, file));
      if (!got.ok) throw Object.assign(new Error(`Claude's ${kind === "pitch" ? "ideas" : "script"} did not pass the check: ${got.problems.slice(0, 3).join("; ")}`), { code: "CHECK", detail: got.problems });
    }
    onStep("Done", 1);
    return { ...got, costUsd: cost, ms, reads: st.reads };
  } finally { rmSync(lab, { recursive: true, force: true }); }
}
const readJsonFile = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };

/** A round of ten: the first of a new pitch, or ten more for the one in hand (`more`). input: { styleId, topic, lang, lengthSec, more }.
 *  Returns the pitch in hand. */
export async function pitchIdeas(input, { root, jobId, claude, signal = null, onStep = () => {}, log = () => {} }) {
  const was = input.more ? readPitch(root) : null;
  if (input.more && !was) throw Object.assign(new Error("There is no pitch to add to: pitch first"), { code: "INVALID" });
  const styleId = was?.styleId ?? String(input.styleId ?? "");
  const style = await styleFor(styleId, root);
  const lang = was?.lang ?? (LANGS.includes(input.lang) ? input.lang : "vi");
  const lengthSec = was?.lengthSec ?? Math.max(5, Math.min(3600, Math.round(Number(input.lengthSec) || style.lengthSec || 30)));
  const topic = was?.topic ?? String(input.topic ?? "").trim().slice(0, MAX_TOPIC);
  const { agentSettings } = await import("../agent/index.mjs");
  const web = agentSettings(root).web !== "off";
  const avoid = was ? was.ideas.map((x) => x.title) : [];
  const round = { web, avoid, lang, lengthSec };
  const res = await run({ kind: "pitch", root, jobId, styleId, round, file: "ideas.json", web, claude, signal, onStep, log,
    request: (reads) => pitchRequest({ style, reads, topic, lang, lengthSec, web, avoid }), check: (f) => checkIdeas(readJsonFile(f), round) });
  const now = new Date().toISOString(), n = was ? was.rounds + 1 : 1;
  const cards = res.ideas.map((c) => ({ id: randomBytes(5).toString("hex"), round: n, ...c, lengthSec: c.lengthSec ?? lengthSec, savedAs: null }));
  return writePitch(root, {
    version: 1, styleId, styleTitle: style.title, author: style.author, topic, lang, lengthSec, web, rounds: n,
    rules: [...new Set([...(was?.rules ?? []), ...res.rules])], startedAt: was?.startedAt ?? now, at: now,
    ideas: [...(was?.ideas ?? []), ...cards], runs: [...(was?.runs ?? []), { at: now, ms: res.ms, costUsd: res.costUsd }],
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
    const idea = createIdea(root, { name: card.title, brief: ideaBrief(card, p.lang), styleId: p.styleId },
      { pitch: { styleId: p.styleId, style: p.styleTitle, author: p.author, rules: p.rules, truth: card.truth, sources: card.sources, lang: p.lang, lengthSec: card.lengthSec, at: p.at } });
    card.savedAs = idea.id;
    saved.push(idea);
  }
  writePitch(root, p);
  return { ideas: saved, pitch: p };
}

/** Write the script of an idea in My ideas, for its film style (or the one given): saved on the idea. input: { styleId?, lang?, lengthSec? }. */
export async function scriptIdea(id, input, { root, jobId, claude, signal = null, onStep = () => {}, log = () => {} }) {
  const { readIdeas, setScript } = await import("./index.mjs");
  const idea = readIdeas(root).find((x) => x.id === id);
  if (!idea) throw Object.assign(new Error("That idea is not here any more."), { code: "NOT_FOUND" });
  const styleId = String(input.styleId || idea.styleId || "general");
  const style = await styleFor(styleId, root);
  const lang = LANGS.includes(input.lang) ? input.lang : idea.pitch?.lang ?? "vi";
  const lengthSec = Math.max(5, Math.min(3600, Math.round(Number(input.lengthSec) || idea.pitch?.lengthSec || style.lengthSec || 30)));
  const { agentSettings } = await import("../agent/index.mjs");
  const web = agentSettings(root).web !== "off", round = { lang, lengthSec };
  const res = await run({ kind: "script", root, jobId, styleId, round, file: "script.md", web, claude, signal, onStep, log,
    request: (reads) => scriptRequest({ style, reads, idea, lang, lengthSec }), check: (f) => checkScript(existsSync(f) ? readFileSync(f, "utf8") : "", round) });
  return setScript(root, id, { text: res.text, words: res.words, seconds: res.seconds, lang, lengthSec, styleId, style: style.title, author: style.author, at: new Date().toISOString() });
}

// Sound effects, the app's own cue format: storyboard frames carry `sfx:` cues ("whoosh, pop"); each cue name resolves to one file
// in assets/sfx/; the film's root document gets one <audio id="el-sfx-N"> per cue at the frame's start (+ offset), track 20 and up, volume 0.35 (under voice and music); a cue that
// finds nothing is skipped, never a blocker. HF asks a host app to bring its own SFX source; this app's is Openverse's Freesound section
// (no key), CC0 and CC BY only (client videos: no NC licences), and, offline, the Pixabay sounds HF ships in its media-use skill
// (Pixabay's, under the Pixabay Content License; HF only bundles them).
// Every sound is credited (title, author, page, licence, Openverse's attribution line) in .moworks/sfx.json and CREDITS.md.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { APP_ROOT, expandEnv, loadPins, sourceHead } from "../version-manager/index.mjs";

export const OPENVERSE = "https://api.openverse.org/v1/audio/";
const LICENCES = { cc0: "CC0", by: "CC BY" };
export const VOLUME = 0.35, TRACK = 20, MAX_AUTO_S = 6;
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
export const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "sound";
const r3 = (n) => Math.round(n * 1000) / 1000;

/** Openverse search, Freesound only, CC0 / CC BY only. Each result: { id, title, creator, licence, licenceUrl, page, url, durationS, attribution }. */
export async function search(q, { limit = 12, fetchImpl = fetch, signal } = {}) {
  const u = new URL(OPENVERSE);
  u.search = new URLSearchParams({ q: String(q).trim(), source: "freesound", license: "cc0,by", mature: "false", page_size: String(Math.min(20, limit)) });     // 20 is the most Openverse gives without a key (more answers 401)
  const r = await fetchImpl(u.href, { signal, headers: { "User-Agent": "MoworksStudio/1.0 (personal studio app)" } });
  if (!r.ok) throw Object.assign(new Error(`Openverse answered ${r.status}`), { code: "SFX_SEARCH" });
  const j = await r.json();
  return (j.results ?? []).filter((x) => LICENCES[x.license] && /^https:\/\//.test(x.url ?? "")).map((x) => ({
    id: x.id, source: "openverse", title: x.title ?? "", creator: x.creator ?? "", creatorUrl: x.creator_url ?? null,
    licence: `${LICENCES[x.license]} ${x.license_version ?? ""}`.trim(), licenceUrl: x.license_url ?? null, page: x.foreign_landing_url ?? null,
    url: x.url, durationS: x.duration != null ? x.duration / 1000 : null, attribution: x.attribution ?? null, provider: x.provider ?? "freesound" }));
}

/** One Openverse sound by its id, read again on the server (the browser only sends the id): null when it is not CC0 / CC BY. */
export async function details(id, { fetchImpl = fetch, signal, root = APP_ROOT } = {}) {
  if (String(id).startsWith("pixabay:")) return bundled(root).find((b) => b.id === id) ?? null;
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
  const r = await fetchImpl(`${OPENVERSE}${id}/`, { signal, headers: { "User-Agent": "MoworksStudio/1.0 (personal studio app)" } });
  if (!r.ok) return null;
  const x = await r.json();
  if (!LICENCES[x.license] || !/^https:\/\//.test(x.url ?? "")) return null;
  return { id: x.id, source: "openverse", title: x.title ?? "", creator: x.creator ?? "", creatorUrl: x.creator_url ?? null,
    licence: `${LICENCES[x.license]} ${x.license_version ?? ""}`.trim(), licenceUrl: x.license_url ?? null, page: x.foreign_landing_url ?? null,
    url: x.url, durationS: x.duration != null ? x.duration / 1000 : null, attribution: x.attribution ?? null, provider: x.provider ?? "freesound" };
}

/** The offline set: Pixabay sounds that HyperFrames ships in its media-use skill (media-use/audio/assets/sfx at the pinned clone; HF's
 *  CREDITS.md: "sourced from Pixabay … Pixabay Content License"). They are Pixabay's, not HyperFrames': credited to Pixabay, with the
 *  permalink of the copy HF ships. */
let bundledCache = null;
export function bundled(root = APP_ROOT) {
  const pins = loadPins(root), skills = expandEnv(pins.hyperframes.skillsRoot);
  const dir = join(skills, "media-use", "audio", "assets", "sfx");
  if (bundledCache?.dir === dir) return bundledCache.list;
  // the skills' own commit (their clone's .git, or bundle/hf/PINNED): never git in the folder above, which is the app's own repo on a new computer
  const commit = sourceHead(dirname(skills)) ?? pins.hyperframes.source?.commit ?? `v${pins.hyperframes.default}`;
  const list = Object.entries(readJson(join(dir, "manifest.json"), {})).map(([key, v]) => ({
    id: `pixabay:${key}`, source: "pixabay", title: key, creator: "Pixabay", creatorUrl: "https://pixabay.com/sound-effects/", licence: "Pixabay Content License",
    licenceUrl: "https://pixabay.com/service/license-summary/", page: "https://pixabay.com/sound-effects/", file: join(dir, v.file),
    via: `the copy HyperFrames ships in its media-use skill: https://github.com/${pins.hyperframes.repo}/blob/${commit}/skills/media-use/audio/assets/sfx/${v.file}`,
    durationS: v.duration ?? null, description: v.description ?? "", attribution: `"${key}" from Pixabay, Pixabay Content License (https://pixabay.com/service/license-summary/).` }));
  bundledCache = { dir, list };
  return list;
}
/** HF's matching rule for the bundled set: manifest key, file name, or slug. */
export function matchBundled(name, list) {
  const n = String(name).toLowerCase(), s = slug(name);
  return list.find((b) => b.title === n || `${b.title}.mp3` === n || slug(b.title) === s) ?? null;
}

/** Cues of the storyboard: [{ shot, index, name, offset }] ("whoosh@0.4" = 0.4 s after the shot starts; "none" = no sound). */
export function cuesOf(shots) {
  const out = [];
  for (const s of shots) for (const part of String(s.sfx ?? "").split(",")) {
    const m = /^\s*(.+?)\s*(?:@\s*([\d.]+)\s*s?)?\s*$/.exec(part);
    if (!m || !m[1] || /^none$/i.test(m[1])) continue;
    out.push({ shot: s.number, index: s.index, name: m[1].toLowerCase(), offset: m[2] ? Number(m[2]) : 0, start: s.start });
  }
  return out;
}

const stateFile = (dir) => join(dir, ".moworks", "sfx.json");
export const readState = (dir) => readJson(stateFile(dir), { sounds: {} });
function saveState(dir, st) { mkdirSync(join(dir, ".moworks"), { recursive: true }); writeFileSync(stateFile(dir), JSON.stringify(st, null, 2) + "\n"); }

/** Put one sound into the project (assets/3_audio/sfx/<name>.mp3, the user's folder layout; never over another file) and record
 *  it for this cue name. */
export async function useSound(dir, name, item, { fetchImpl = fetch, signal } = {}) {
  const st = readState(dir);
  const taken = new Set(Object.entries(st.sounds).filter(([n]) => n !== name).map(([, s]) => s.file));
  let rel = `assets/3_audio/sfx/${slug(name)}.mp3`;
  for (let i = 2; taken.has(rel) || (existsSync(join(dir, rel)) && st.sounds[name]?.file !== rel); i++) rel = `assets/3_audio/sfx/${slug(name)}-${i}.mp3`;
  mkdirSync(join(dir, "assets", "3_audio", "sfx"), { recursive: true });
  if (item.source === "pixabay") copyFileSync(item.file, join(dir, rel));
  else {
    const r = await fetchImpl(item.url, { signal });
    if (!r.ok) throw Object.assign(new Error(`Download failed (${r.status})`), { code: "SFX_DOWNLOAD" });
    writeFileSync(join(dir, rel), Buffer.from(await r.arrayBuffer()));
  }
  const { file: _f, ...meta } = item;
  st.sounds[name] = { ...meta, file: rel, addedAt: new Date().toISOString() };
  saveState(dir, st);
  return st.sounds[name];
}

/** A sound the user gave (in assets/3_audio/…), used for this cue name where it is (no copy); credited as the user's own. */
export function useOwnerSound(dir, name, srcRel, { durationS = null } = {}) {
  const st = readState(dir);
  const rel = srcRel;
  const base = srcRel.split("/").pop();
  st.sounds[name] = { id: `owner:${srcRel}`, source: "owner", title: base, creator: "the owner", licence: "provided by the owner", file: rel, durationS,
    attribution: `"${base}" provided by the owner (${srcRel}).`, addedAt: new Date().toISOString() };
  saveState(dir, st);
  return st.sounds[name];
}

/** Find a sound for every cue that has none yet: Openverse first (the first result of at most 6 s, else the first), HF's bundled set when
 *  offline or nothing is found. Returns { added: [names], missing: [names], offline }. */
export async function resolveCues(dir, cues, { fetchImpl = fetch, signal, root = APP_ROOT, online = true } = {}) {
  const st = readState(dir), local = bundled(root), added = [], missing = [];
  const names = [...new Set(cues.map((c) => c.name))].filter((name) => !(st.sounds[name] && existsSync(join(dir, st.sounds[name].file))));
  // the searches run four at a time (one at a time took about 5 minutes), each tried twice; one failed search no longer sends
  // every other sound offline (the automatic pass placed 0 of 13 that way): offline only after three names in a row could not be searched
  const hits = new Map();
  let offline = !online, failedInRow = 0;
  const one = async (name) => {
    for (let k = 0; k < 2 && !offline; k++) {
      try { const h = await search(name, { limit: 10, fetchImpl, signal }); failedInRow = 0; return h; }
      catch (e) { if (signal?.aborted) throw e; if (k === 1 && ++failedInRow >= 3) offline = true; }
    }
    return null;
  };
  if (!offline) {
    const queue = [...names];
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => { while (queue.length && !offline) { const n = queue.shift(); hits.set(n, await one(n)); } }));
  }
  for (const name of names) {
    const h = hits.get(name) ?? null;
    let item = h ? h.find((x) => x.durationS != null && x.durationS <= MAX_AUTO_S) ?? h[0] ?? null : null;
    item ??= matchBundled(name, local);
    if (!item) { missing.push(name); continue; }
    try { await useSound(dir, name, item, { fetchImpl, signal }); added.push(name); }
    catch (e) {
      if (signal?.aborted) throw e;
      const b = item.source !== "pixabay" && matchBundled(name, local);      // a failed download: the offline sound of that name, if any
      if (b) { await useSound(dir, name, b); added.push(name); } else missing.push(name);
    }
  }
  // offline: no search answered at all (the bundled sounds were the only source)
  return { added, missing, offline: offline || (online && names.length > 0 && [...hits.values()].every((h) => h == null)) };
}

const BEGIN = "<!-- mw:sfx (Moworks Studio: the storyboard's sfx: cues; rewritten on every change) -->", END = "<!-- /mw:sfx -->";

const attrsOf = (s) => Object.fromEntries([...s.matchAll(/([^\s=/]+)(?:\s*=\s*"([^"]*)")?/g)].map((m) => [m[1], m[2] ?? ""]));
const ALWAYS_KEPT = new Set(["data-volume"]);          // a volume set by hand in HyperFrames Studio survives a re-timed cue too

/**
 * Write the <audio> elements of the cues into index.html (the app's own block), replacing the previous block. HyperFrames Studio
 * edits these elements too (HF first), so an element that is still there with the same sound keeps what Studio wrote: its
 * data-hf-id and any other attribute the app does not set, its volume, and, while the storyboard has not moved that cue, its timing.
 */
export function mount(dir, cues, { filmEnd = null } = {}) {
  const st = readState(dir), f = join(dir, "index.html");
  let html = readFileSync(f, "utf8");
  // a 181 s "film-projector" clip went into a 40 s film from 0 s and covered the whole SFX lane. A clip plays at most
  // MAX_AUTO_S (an effect, not a bed; the user's own sounds keep their length) and never past the film's end when the caller knows it
  // (autoSfx: the shots' end; a starter page's data-duration is no measure of the film)
  const end = Number(filmEnd) > 0 ? Number(filmEnd) : null;
  const blockRe = new RegExp(`\\s*${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s\\S]*?)${END}`);
  const old = new Map([...(blockRe.exec(html)?.[1] ?? "").matchAll(/<audio\b([^>]*)>/gi)].map((m) => attrsOf(m[1])).filter((a) => a.id).map((a) => [a.id, a]));
  const before = new Map((st.mounted ?? []).map((p, i) => [`el-sfx-${i}`, p]));
  html = html.replace(blockRe, "");
  const lines = [], placed = [];
  const muted = new Set((st.muted ?? []).map((m) => `${m.name}@${m.start}`));          // taken off the timeline by the user
  cues.forEach((c) => {
    const s = st.sounds[c.name];
    if (!s || c.start == null || !existsSync(join(dir, s.file))) return;
    if (muted.has(`${c.name}@${r3(c.start + c.offset)}`)) return;
    // `at` is the cue's moment; under a voice-over the clip starts its onset earlier, so its attack lands on the cue
    const i = placed.length, at = r3(c.start + c.offset), start = r3(Math.max(0, at - (Number(c.onset) || 0))), id = `el-sfx-${i}`;
    if (end != null && start >= end) return;
    const dur = r3(Math.max(0.05, Math.min(s.durationS ?? 1, s.source === "owner" ? Infinity : MAX_AUTO_S, end != null ? end - start : Infinity)));
    const volume = String(s.volume ?? VOLUME);          // the sound's level from the Final Mix (packages/sfx/auto.mjs), else the default
    const ours = { id, src: s.file, "data-start": String(start), "data-duration": String(dur), "data-track-index": String(TRACK + i), "data-volume": volume };
    const was = old.get(id)?.src === s.file ? old.get(id) : null;
    const unmoved = before.get(id)?.name === c.name && before.get(id)?.start === at;
    // a volume the user set by hand stays; the app's own earlier level follows the new one
    const byHand = (k, v) => k === "data-volume" && v !== String(before.get(id)?.volume ?? VOLUME);
    const a = {};
    for (const [k, v] of Object.entries(was ?? {})) a[k] = k === "id" || k === "src" ? ours[k] : !(k in ours) || (ALWAYS_KEPT.has(k) && byHand(k, v)) || (unmoved && k !== "data-volume") ? v : ours[k];
    for (const [k, v] of Object.entries(ours)) if (!(k in a)) a[k] = v;
    if (!(Number(a["data-duration"]) <= dur)) a["data-duration"] = String(dur);          // a kept timing never runs past the cap either
    lines.push(`<audio ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}></audio>`);
    placed.push({ ...c, file: s.file, start: at, ...(start !== at ? { placedAt: start } : {}), duration: dur, volume: Number(volume) });          // the app's own level (a hand-set one differs from it)
  });
  if (lines.length) {
    const root = /<[a-z]+\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(html);
    if (!root) throw Object.assign(new Error("index.html has no root composition"), { code: "INVALID" });
    const at = root.index + root[0].length;
    html = `${html.slice(0, at)}\n    ${BEGIN}\n    ${lines.join("\n    ")}\n    ${END}${html.slice(at)}`;
  }
  writeFileSync(f, html);
  st.mounted = placed;
  saveState(dir, st);
  return placed;
}

/** The Final Mix's "Place" again: the cues the user took off come back. */
export function unmuteAll(dir) { const st = readState(dir); if (st.muted?.length) { delete st.muted; saveState(dir, st); } }

/** The user took the app's sound `el-sfx-<i>` off the timeline: that cue stays off when the cues are placed again. */
export function muteMounted(dir, id) {
  const i = Number(/^el-sfx-(\d+)$/.exec(id)?.[1]);
  const st = readState(dir);
  const p = Number.isInteger(i) ? st.mounted?.[i] : null;
  if (!p) return null;
  st.muted = [...(st.muted ?? []).filter((m) => !(m.name === p.name && m.start === p.start)), { name: p.name, start: p.start, at: new Date().toISOString() }];
  saveState(dir, st);
  return { name: p.name, start: p.start };
}

/** One credit line. A Pixabay sound is one of the set HyperFrames bundles in its media-use skill: HF does not record the sound's own Pixabay
 *  page, so the line says so and links the exact file at the pinned HF commit instead of a generic Pixabay link. */
export function creditLine(s) {
  if (s.source === "pixabay") return `"${s.title}", from the Pixabay sound set that HyperFrames bundles in its media-use skill (Pixabay Content License, ${s.licenceUrl}); HyperFrames does not record the sound's own Pixabay page. File: ${String(s.via ?? "").replace(/^.*?(https:\/\/\S+)$/, "$1")}`;
  if (s.source === "owner") return s.attribution;
  return `${s.attribution ?? `"${s.title}" by ${s.creator}, ${s.licence}`}${s.page ? ` Source: ${s.page}` : ""}`;
}

/** CREDITS.md: a "Sound effects" section for the sounds in use (other content of the file is kept). */
export function writeCredits(dir) {
  const st = readState(dir), f = join(dir, "CREDITS.md");
  const used = [...new Set((st.mounted ?? []).map((m) => m.name))].map((n) => [n, st.sounds[n]]).filter(([, s]) => s);
  const body = used.map(([n, s]) => `- **${n}** (\`${s.file}\`): ${creditLine(s)}`);
  const section = `<!-- mw:sfx-credits -->\n## Sound effects\n\n${body.length ? body.join("\n") : "None."}\n<!-- /mw:sfx-credits -->`;
  const old = existsSync(f) ? readFileSync(f, "utf8") : "# Credits\n";
  const next = /<!-- mw:sfx-credits -->[\s\S]*?<!-- \/mw:sfx-credits -->/.test(old)
    ? old.replace(/<!-- mw:sfx-credits -->[\s\S]*?<!-- \/mw:sfx-credits -->/, section) : `${old.trimEnd()}\n\n${section}\n`;
  writeFileSync(f, next);
  return used.length;
}

/** The whole pass for a project: cues from the storyboard shots, sounds found, elements written, credits. */
export async function apply(dir, shots, opts = {}) {
  const cues = cuesOf(shots);
  const st = readState(dir);
  if (!cues.length && !(st.mounted ?? []).length) return { cues: 0, placed: 0, added: [], missing: [] };
  const res = await resolveCues(dir, cues, opts);
  const placed = mount(dir, cues);
  writeCredits(dir);
  return { cues: cues.length, placed: placed.length, ...res };
}

/** Set the level of each sound by name ({ name: 0-1 }) before mounting (the Final Mix levels). */
export function setVolumes(dir, levels) {
  const st = readState(dir);
  for (const [n, v] of Object.entries(levels)) if (st.sounds[n] && Number.isFinite(v)) st.sounds[n].volume = Math.round(v * 100) / 100;
  saveState(dir, st);
}

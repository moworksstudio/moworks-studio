// The user's own audio on the timeline: a voice-over (once its words are checked) and a music track, each placed in the
// root composition from 0 s on its own track, the way HyperFrames marks them (data-timeline-role "voiceover" / "music"), so HyperFrames
// Studio shows them at once and `hyperframes beats` finds the music. Attributes Studio or the user changed later (data-hf-id, the start,
// the volume) are kept when the same file is placed again. The music's beats: HyperFrames' own analyser (Node, no Python), written by HF
// to beats/<audio path>.json.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolveRuntime } from "../version-manager/index.mjs";
import { cliEntry } from "../hf-qa/cli.mjs";
import { endFade, fadeOfTotal, filmLength, planEnding } from "./ending.mjs";
import { isStarterPage } from "./shots.mjs";
import { styleTraits } from "../style-catalog/traits.mjs";

const ROLES = { voice: { id: "el-voice", role: "voiceover", track: 10, volume: 1 }, music: { id: "el-music", role: "music", track: 11, volume: 0.6 } };
const BEGIN = "<!-- mw:tracks -->", END = "<!-- /mw:tracks -->";
const attrsOf = (s) => Object.fromEntries([...s.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));
const r3 = (n) => Math.round(n * 1000) / 1000;
/** The music plays to the film's end and fades down with the picture (ending.mjs): HyperFrames' own clip-edge fade (data-fade-out,
 *  core/src/audioFade.ts at the pinned version: linear, anchored at the clip's end, honoured in Studio's preview and in the render). HF's render
 *  trims every track at the film's end (engine audioMixer.ts), so a song longer than the film would lose its fade: the clip is fitted to end
 *  with the film (its file's length kept in data-mw-track), so the song covers the content and the fade after it; its fade the ending's
 *  (ending.mjs fadeOfTotal: of the content, shorter after an end card, inside the film's length when MOTION-PLAN.json's ending.inside says
 *  so or the style's author ends the film), a quarter of a song that ends sooner. What the app fitted is kept in data-mw-fit ("length
 *  fade"): a length or fade the user changed since (Studio) stays theirs; a stopped music (a cut) and a film placed before the fade are left
 *  as they are. */
const r2 = (n) => Math.round(n * 100) / 100;
const metaOf = (dir) => { try { return JSON.parse(readFileSync(join(dir, ".moworks", "project.json"), "utf8")); } catch { return {}; } };
const endingOf = (dir) => {
  const e = planEnding(dir);
  return { endCard: e.kind === "endCard", inside: e.inside === true || e.kind === "author" || styleTraits(metaOf(dir).style?.id ?? null).ownEnding };
};
function fitMusic(a, film, { endCard = false, inside = false } = {}) {
  if (a["data-mw-stop"] != null || a["data-fade-out"] == null) return a;
  if (a["data-mw-fit"] != null && a["data-mw-fit"] !== `${a["data-duration"]} ${a["data-fade-out"]}`) return a;          // the user's own
  const start = Number(a["data-start"]) || 0, from = Number(a["data-media-start"]) || 0;
  const plays = Math.max(0.1, (Number(a["data-mw-track"]) || Number(a["data-duration"]) || 0) - from);
  const len = film > start ? Math.min(plays, film - start) : plays;
  const toEnd = film > 0 && start + len >= film - 0.05;
  a["data-duration"] = String(r3(len));
  a["data-fade-out"] = String(r2(toEnd ? fadeOfTotal(film, { endCard, inside }) : Math.min(film ? fadeOfTotal(film, { endCard, inside }) : endFade(len, { endCard }), len / 4)));
  a["data-mw-fit"] = `${a["data-duration"]} ${a["data-fade-out"]}`;
  return a;
}
// the film's whole length: its root's; before the Build (the starter page) the length New project set with the ending's fade after it
const filmOf = (html, dir) => (isStarterPage(html) ? filmLength(metaOf(dir), { dir }).total || 0
  : Number(attrsOf(/<[a-z]+\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(html)?.[0] ?? "")["data-duration"]) || 0);
const audioLine = (a) => `<audio ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}>`;

/** Fit the film's music to the film as it is now (its length and ending): before a render and the checks, after the film was built.
 *  Returns the music's attributes, or null when nothing changed (no music, a stop, the user's own fade). */
export function fitMusicToFilm(dir) {
  const f = join(dir, "index.html");
  let html; try { html = readFileSync(f, "utf8"); } catch { return null; }
  const old = new RegExp(`<audio\\b[^>]*\\bid="${ROLES.music.id}"[^>]*>`, "i").exec(html);
  if (!old) return null;
  const a = fitMusic(attrsOf(old[0]), filmOf(html, dir), endingOf(dir));
  if (audioLine(a) === old[0]) return null;
  writeFileSync(f, html.replace(old[0], audioLine(a)));
  return a;
}

/** Place (or move) one track: { kind: "voice" | "music", src: project-relative path, duration: seconds }. Returns the attributes written. */
export function placeTrack(dir, { kind, src, duration, start = null }) {
  const def = ROLES[kind];
  if (!def) throw Object.assign(new Error("A track is a voice or a music"), { code: "INVALID" });
  const f = join(dir, "index.html");
  let html = readFileSync(f, "utf8");
  const tagRe = new RegExp(`\\s*<audio\\b[^>]*\\bid="${def.id}"[^>]*>(?:\\s*</audio>)?`, "i");
  const old = tagRe.exec(html);
  const was = old ? attrsOf(old[0]) : null;
  if (old) html = html.replace(tagRe, "");
  const ours = { id: def.id, src, "data-start": "0", "data-duration": String(r3(duration)), "data-track-index": String(def.track), "data-volume": String(def.volume), "data-timeline-role": def.role };
  if (kind === "music") Object.assign(ours, { "data-fade-out": "0", "data-mw-track": ours["data-duration"] });
  const same = was?.src === src;
  const a = { ...ours };
  if (same) { for (const [k, v] of Object.entries(was)) if (k !== "src" && k !== "data-duration" && k !== "data-mw-track") a[k] = v; }       // the user's / Studio's changes stay
  // what the app fitted last is fitted again to the new length; a fade the user changed stays
  if (same && kind === "music" && was["data-mw-fit"] != null && was["data-mw-fit"] === `${was["data-duration"]} ${was["data-fade-out"]}`) delete a["data-mw-fit"];
  // the same track placed again keeps its fade as it was: none on a film placed before the fade, none while it is stopped (a cut)
  if (same && kind === "music" && was["data-fade-out"] == null) delete a["data-fade-out"];
  // the music stopped at a second (the twist) stays stopped when the same track is placed again
  if (same && was["data-mw-stop"] != null) a["data-duration"] = String(r3(Math.max(0.1, Math.min(Number(ours["data-duration"]), Number(was["data-mw-stop"]) - Number(a["data-start"] ?? 0)))));
  else if (was?.["data-hf-id"]) a["data-hf-id"] = was["data-hf-id"];
  if (start != null && Number.isFinite(Number(start))) a["data-start"] = String(r3(Math.max(0, Number(start))));          // where the user dropped it
  if (kind === "music") fitMusic(a, filmOf(html, dir), endingOf(dir));
  const line = `<audio ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}></audio>`;
  const block = new RegExp(`(${BEGIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})([\\s\\S]*?)(${END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`);
  if (block.test(html)) html = html.replace(block, (m0, b, inner, e) => `${b}${inner.replace(/\s*$/, "")}\n    ${line}\n    ${e}`);
  else {
    const root = /<[a-z]+\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(html);
    if (!root) throw Object.assign(new Error("index.html has no root composition"), { code: "INVALID" });
    const at = root.index + root[0].length;
    html = `${html.slice(0, at)}\n    ${BEGIN}\n    ${line}\n    ${END}${html.slice(at)}`;
  }
  writeFileSync(f, html);
  return a;
}

/** Stop the music at `at` seconds of the film (a What If film's turn, or where the user or the brief asks), or play it again to its end with `at` null: the
 *  music track's data-duration ends there (HyperFrames plays an <audio> only within its data-duration); the second is kept on the element
 *  (data-mw-stop) and its full length too (data-mw-full), so placing the same track again keeps the stop. Returns { at, start, duration }. */
/** The part of the music track the film plays, in the song's own seconds: { start, end }. From the music on the timeline (its data-media-start, start and length, cut at the
 *  film's end), else the song from 0 for the film's length; null when neither the film's length nor the track's is known. */
export function musicUsed(dir, { trackDuration = null } = {}) {
  let html = ""; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return null; }
  const rootTag = /<[a-z]+\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(html)?.[0] ?? "";
  const film = Number(attrsOf(rootTag)["data-duration"]) || null;
  const tag = new RegExp(`<audio\\b[^>]*\\bid="${ROLES.music.id}"[^>]*>`, "i").exec(html)?.[0];
  const a = tag ? attrsOf(tag) : {};
  const from = Number(a["data-media-start"]) || 0, at = Number(a["data-start"]) || 0, len = Number(a["data-duration"]) || null;
  const plays = [len, film != null ? film - at : null, trackDuration != null ? trackDuration - from : null].filter((x) => x != null && Number.isFinite(x));
  if (!plays.length) return null;
  return { start: r3(from), end: r3(from + Math.max(0, Math.min(...plays))) };
}

export function stopMusic(dir, at) {
  const f = join(dir, "index.html");
  let html = readFileSync(f, "utf8");
  const tagRe = new RegExp(`<audio\\b[^>]*\\bid="${ROLES.music.id}"[^>]*>`, "i");
  const old = tagRe.exec(html);
  if (!old) throw Object.assign(new Error("The film has no music track"), { code: "INVALID" });
  const a = attrsOf(old[0]), start = Number(a["data-start"] ?? 0) || 0, full = Number(a["data-mw-full"] ?? a["data-duration"]) || 0;
  if (at == null) {
    delete a["data-mw-stop"]; delete a["data-mw-full"]; a["data-duration"] = String(r3(full));
    if (a["data-mw-fade-out"] != null) { a["data-fade-out"] = a["data-mw-fade-out"]; delete a["data-mw-fade-out"]; }          // its fade out back at the end
    fitMusic(a, filmOf(html, dir), endingOf(dir));
  } else {
    const t = Number(at);
    if (!Number.isFinite(t) || t <= start) throw Object.assign(new Error(`Stop the music after it starts (${start} s)`), { code: "INVALID" });
    a["data-mw-full"] = String(r3(full)); a["data-mw-stop"] = String(r3(t)); a["data-duration"] = String(r3(Math.max(0.1, Math.min(full, t - start))));
    // a stop is a cut (What If: the hit lands in silence); the end's fade out is kept aside for "play to the end"
    if (a["data-fade-out"] != null) { a["data-mw-fade-out"] = a["data-fade-out"]; delete a["data-fade-out"]; }
  }
  html = html.replace(old[0], audioLine(a));
  writeFileSync(f, html);
  return { at: at == null ? null : r3(Number(at)), start, duration: Number(a["data-duration"]) };
}

/** HyperFrames' beat analysis of the film's music track (the <audio data-timeline-role="music">): { ok, file, message }. */
export function analyseBeats(dir, src, { version = null } = {}) {
  const rt = resolveRuntime(version);
  const r = spawnSync(process.execPath, [cliEntry(rt.dir), "beats", resolve(dir)], { env: { ...rt.env, NO_COLOR: "1" }, encoding: "utf8", timeout: 180000, windowsHide: true });
  const file = `beats/${src}.json`;
  return { ok: r.status === 0 && existsSync(join(dir, ...file.split("/"))), file, message: (r.stderr || r.stdout || "").trim().split(/\r?\n/).slice(-2).join(" ") };
}

// ---- Sounds put on the timeline from the Assets tab, on their lane, in HyperFrames' model (HF at the pinned version): a sound
// is an <audio> in the root composition with data-start / data-duration / data-track-index (core/src/runtime/timeline.ts reads the track
// verbatim). Moving one and taking it off is HF's own source mutation (editor.mjs → handEdit.mjs setAudio / removeAudio: Studio's
// patchElementInHtml / removeElementFromHtml in studio-server/src/helpers/sourceMutation.ts). Lanes are data-timeline-role: "voiceover",
// "music", "sfx" (the app's older sound effects carry none).
const CLIPS_BEGIN = "<!-- mw:clips (Moworks Studio: sounds the owner put on the timeline) -->", CLIPS_END = "<!-- /mw:clips -->";
const CLIP_TRACK = 40, CLIP_VOLUME = 0.8;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The lane a sound goes on, from its folder (3_audio/voiceover | music | sfx, and the older assets/voiceover | sfx | audio), else its name
 *  the way the importer sorts it (classify: the project service's classifyAsset). */
export function laneOfFile(rel, classify = null) {
  const p = String(rel ?? "").replace(/\\/g, "/");
  if (/(^|\/)voiceover\//i.test(p)) return "voiceover";
  if (/(^|\/)sfx\//i.test(p)) return "sfx";
  if (/(^|\/)music\//i.test(p)) return "music";
  const f = classify?.(p.split("/").pop())?.folder ?? "";
  return /voiceover/.test(f) ? "voiceover" : /sfx/.test(f) ? "sfx" : "music";
}
/** Put a sound effect on the timeline at `start`: its own <audio> on its own track in the user's block, so the app's sfx block (rewritten
 *  from the storyboard's cues) never takes it away. Returns the attributes written. */
export function placeClip(dir, { src, duration, start = 0 }) {
  const f = join(dir, "index.html");
  let html = readFileSync(f, "utf8");
  const used = [...html.matchAll(/\bid="el-clip-(\d+)"/g)].map((m) => Number(m[1]));
  const n = used.length ? Math.max(...used) + 1 : 1;
  const a = { id: `el-clip-${n}`, src, "data-start": String(r3(Math.max(0, Number(start) || 0))), "data-duration": String(r3(duration)),
    "data-track-index": String(CLIP_TRACK + n), "data-volume": String(CLIP_VOLUME), "data-timeline-role": "sfx" };
  const line = `<audio ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}></audio>`;
  const block = new RegExp(`(${esc(CLIPS_BEGIN)})([\\s\\S]*?)(${esc(CLIPS_END)})`);
  if (block.test(html)) html = html.replace(block, (m0, b, inner, e) => `${b}${inner.replace(/\s*$/, "")}\n    ${line}\n    ${e}`);
  else {
    const root = /<[a-z]+\b[^>]*\bdata-composition-id="[^"]*"[^>]*>/i.exec(html);
    if (!root) throw Object.assign(new Error("index.html has no root composition"), { code: "INVALID" });
    const at = root.index + root[0].length;
    html = `${html.slice(0, at)}\n    ${CLIPS_BEGIN}\n    ${line}\n    ${CLIPS_END}${html.slice(at)}`;
  }
  writeFileSync(f, html);
  return a;
}


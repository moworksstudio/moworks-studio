// Shots of a project for the editor and the storyboard screen: STORYBOARD.md read with HF's own parser, joined with the scenes actually
// mounted in index.html (start, duration, composition file). Storyboard edits go through HF's setFrameField / setFrameStatus /
// setFrameVoiceover, so the file stays in HF's format.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { loadHf } from "./load.mjs";
import { resolveRuntime } from "../version-manager/index.mjs";

// the attribute itself, never the end of a longer name (the id of `<audio data-hf-id="hf-k4k5" id="el-music">` is el-music, Test 22)
const attr = (tag, a) => { const m = new RegExp(`(?<![\\w-])${a}="([^"]*)"`).exec(tag); return m ? m[1] : null; };

/** A one-page code film's own cut table: the first `SHOTS = [ { a, b }, … ]` of its scripts (compositions/**), every entry with seconds a
 *  < b, as [[a, b], …] in order; null when it has none. Read with Babel's parser (HyperFrames' runtime has it). */
export function codeCuts(dir) {
  let parse;
  try { parse = createRequire(join(resolveRuntime().dir, "node_modules", "@babel", "parser", "package.json"))("@babel/parser").parse; } catch { return null; }
  const walk = (d) => (existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : /\.m?js$/.test(e.name) && !/\.min\.js$/.test(e.name) ? [join(d, e.name)] : [])) : []);
  const num = (n) => (n?.type === "NumericLiteral" ? n.value : n?.type === "UnaryExpression" && n.operator === "-" && n.argument.type === "NumericLiteral" ? -n.argument.value : null);
  const key = (p) => (p.key?.type === "Identifier" ? p.key.name : p.key?.value);
  for (const f of walk(join(dir, "compositions")).filter((x) => !/[\\/](whatif|anidoodle)[\\/]film\.js$/.test(x))) {
    let ast; try { ast = parse(readFileSync(f, "utf8"), { sourceType: "unambiguous", errorRecovery: true, plugins: ["jsx"] }); } catch { continue; }
    let found = null;
    const visit = (n) => {
      if (found || !n || typeof n.type !== "string") return;
      const named = (n.type === "VariableDeclarator" && n.id?.name === "SHOTS" && n.init) || (n.type === "AssignmentExpression" && (n.left?.property?.name ?? n.left?.name) === "SHOTS" && n.right);
      const arr = named ? (n.type === "VariableDeclarator" ? n.init : n.right) : null;
      if (arr?.type === "ArrayExpression" && arr.elements.length) {
        const cuts = arr.elements.map((e) => { if (e?.type !== "ObjectExpression") return null; const p = Object.fromEntries(e.properties.filter((q) => q.type === "ObjectProperty").map((q) => [key(q), num(q.value)])); return p.a != null && p.b != null && p.b > p.a ? [p.a, p.b] : null; });
        if (cuts.every(Boolean)) { found = cuts; return; }
      }
      for (const k of Object.keys(n)) { if (k === "loc") continue; const v = n[k]; if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v.type === "string") visit(v); }
    };
    visit(ast.program);
    if (found) return found;
  }
  return null;
}

/** Is this index.html still the new project's starter film (scaffold.mjs: a root with data-no-timeline holding its one 3 s title card,
 *  compositions/f1.html)? Not every root that kept the flag (a built film of 12 scenes once kept it and the Editor said "Not
 *  built" and would not play): the flag and the starter's one scene, nothing else. */
export function isStarterPage(html) {
  const rootTag = /<[^>]*\bdata-composition-id="[^"]*"[^>]*>/.exec(html)?.[0] ?? "";
  if (!/\bdata-no-timeline\b/.test(rootTag)) return false;
  const srcs = [...html.matchAll(/\bdata-composition-src="([^"]*)"/g)].map((m) => m[1]);
  return srcs.length === 1 && /^(\.\/)?compositions\/f1\.html$/.test(srcs[0]);
}

/** A mounted scene's track kind, by HyperFrames' own rule (parsers trackKindOf): its data-track-kind, else "captions" for the legacy
 *  captions host (composition id "captions" or a caption-* class), else "graphics". */
const TRACK_KINDS = ["video", "audio", "captions", "graphics"];
function trackKind(tag) {
  const k = attr(tag, "data-track-kind")?.trim().toLowerCase();
  if (k && TRACK_KINDS.includes(k)) return k;
  return attr(tag, "data-composition-id") === "captions" || /(?:^|\s)caption[-_]/.test(attr(tag, "class") ?? "") ? "captions" : "graphics";
}

/** Scenes mounted at the root of index.html (in order) and the film's audio clips. */
export function readMounts(dir) {
  const html = readFileSync(join(dir, "index.html"), "utf8");
  const rootTag = /<[^>]*\bdata-composition-id="[^"]*"[^>]*>/.exec(html)?.[0] ?? "";
  const num = (v) => (v == null ? null : Number(v));
  const root = { id: attr(rootTag, "data-composition-id"), width: num(attr(rootTag, "data-width")), height: num(attr(rootTag, "data-height")), duration: num(attr(rootTag, "data-duration")),
    // the new project's starter film (scaffold.mjs: one 3 s title card, data-no-timeline), never built yet
    ...(isStarterPage(html) ? { starter: true } : {}) };
  const mounts = [];
  for (const m of html.matchAll(/<(div|section)\b[^>]*\bdata-start="[^"]*"[^>]*>/g)) {
    const tag = m[0];
    if (tag === rootTag || !/data-composition-(src|id)=/.test(tag)) continue;
    mounts.push({ id: attr(tag, "id") ?? attr(tag, "data-composition-id"), compositionId: attr(tag, "data-composition-id"), src: attr(tag, "data-composition-src"),
      start: num(attr(tag, "data-start")) ?? 0, duration: num(attr(tag, "data-duration")), track: num(attr(tag, "data-track-index")), kind: trackKind(tag) });
  }
  // each sound with its part of the file (a voice cut into one clip a line plays from its data-media-start), its lane, its edge fades and
  // its volume lane (HF's data-automation: the music ducked under the words), [{ t, v }] in the clip's own seconds
  const laneOf = (tag) => { try { return JSON.parse(String(attr(tag, "data-automation") ?? "").replace(/&quot;/g, '"')).lanes?.find((l) => l.target === "volume")?.points ?? null; } catch { return null; } };
  const audio = [...html.matchAll(/<audio\b[^>]*>/g)].map((m) => ({ id: attr(m[0], "id"), src: attr(m[0], "src"), start: num(attr(m[0], "data-start")) ?? 0,
    duration: num(attr(m[0], "data-duration")), volume: num(attr(m[0], "data-volume")) ?? 1, mediaStart: num(attr(m[0], "data-media-start")) ?? 0,
    role: attr(m[0], "data-timeline-role"), fadeIn: num(attr(m[0], "data-fade-in")) ?? 0, fadeOut: num(attr(m[0], "data-fade-out")) ?? 0, lane: laneOf(m[0]) }));
  return { root, mounts, audio };
}

/** A frame heading without the seconds Claude wrote into it ("Vì sao? (6.3-7.7s)"): they go stale once the film is timed to the voice or
 *  built ("(6.3-7.7s)" beside the real 1.9 s), and the Shots column says the film's own times. */
export function untimedTitle(title) {
  const t = "\\d+(?::\\d{1,2})?(?:[.,]\\d+)?\\s*s?";
  return String(title ?? "").replace(new RegExp(`\\s*[([]\\s*${t}\\s*[-–—]\\s*${t}\\s*[)\\]]\\s*$`, "u"), "").trim();
}

/** Shots: one per storyboard frame (its `src` names the mounted scene), else one per mounted scene. A layer over the film is no shot
 *  (Test 23: its captions, 0-62.7 s, and a closing card over the last three shots were listed as shots 2 and 25 of 23): HyperFrames'
 *  captions track, and, once the storyboard's frames are mounted, a scene on a track none of them is on that lies over them. Those
 *  come apart as `layers` (the Assets tab names the shots a layer's files lie over). */
export async function readShots(dir, { version = null } = {}) {
  const { root, mounts, audio } = readMounts(dir);
  const sbFile = join(dir, "STORYBOARD.md");
  let frames = [], globals = {}, warnings = [];
  if (existsSync(sbFile)) {
    const hf = await loadHf(version);
    const sb = hf.storyboard.parseStoryboard(readFileSync(sbFile, "utf8"));
    frames = sb.frames; globals = sb.globals; warnings = sb.warnings ?? [];
  }
  const used = new Set();
  const scenes = mounts.filter((m) => m.kind !== "captions");          // the captions are never a frame's scene
  const shots = frames.map((f, i) => {
    const src = f.extra?.src ?? f.src ?? null;
    // by place only when there is a mounted scene for every frame (a code film's one text overlay, words.html at 16.5 s, was
    // once taken for frame 1, so the film showed one shot and the Review took its stills there only)
    const byPlace = scenes.length >= frames.length && scenes[i] && !used.has(scenes[i]) ? scenes[i] : null;
    let m = mounts.find((x) => src && x.src === src && !used.has(x)) ?? byPlace;
    if (m) used.add(m);
    return { index: f.index, number: f.number ?? i + 1, title: untimedTitle(f.title) || `Shot ${i + 1}`, status: f.status ?? "outline", scene: f.scene ?? "",
      narrative: f.narrative ?? "", voiceover: f.voiceover ?? "", plannedDuration: f.durationSeconds ?? null,
      start: m?.start ?? null, duration: m?.duration ?? f.durationSeconds ?? null, src: m?.src ?? src, mountId: m?.id ?? null, block: f.extra?.block ?? null,
      sfx: f.extra?.sfx ?? null,          // the app's per-frame sound-effect cues ("whoosh, pop"), resolved and mounted by packages/sfx
      // what the sound effects also read: a `- sound:` line (cues when it is a list of names), HF's `transition_in`, a `- location:`
      sound: f.extra?.sound ?? null, transitionIn: f.transitionIn ?? null, location: f.extra?.location ?? null,
      ambience: f.extra?.ambience ?? null };          // the scene's ambience bed (`- ambience: rain`, `none`), placed by packages/sfx
  });
  // a What If film is one page whose cuts the engine reads from whatif/timeline.json (the app's whatif_plan): frame N is the timeline's
  // shot N (the storyboard is one frame per shot in the edit's order), placed where it is first cut in, not by the frames' planned seconds
  // (up to 0.65 s off, so the Review's stills and the sound effects missed the cuts)
  let wi = null; try { wi = JSON.parse(readFileSync(join(dir, "whatif", "timeline.json"), "utf8")); } catch { /* not a What If film */ }
  if (wi?.fps > 0 && Array.isArray(wi.shots) && !mounts.length) shots.forEach((s, i) => {
    const t = wi.shots[i];
    if (t && Number.isFinite(t.first) && t.len > 0) Object.assign(s, { start: Math.round((t.first / wi.fps) * 1000) / 1000, duration: Math.round((t.len / wi.fps) * 1000) / 1000 });
  });
  // any other film that is one page of code (mg, lemo): its own cut table, a SHOTS array of { a, b } seconds, when it has one shot a frame
  // (once the Motion Plan moved the cuts, 55 → 46 s, and the Review, the Shots column and the timeline kept the storyboard's
  // stretched seconds: shot 7, the climax, was never in a Review sheet)
  if (!wi && !mounts.length && frames.length) {
    const cuts = codeCuts(dir);
    if (cuts?.length === shots.length) shots.forEach((s, i) => Object.assign(s, { start: cuts[i][0], duration: Math.round((cuts[i][1] - cuts[i][0]) * 1000) / 1000 }));
  }
  // a layer over the film: the captions, or a scene on a track no mounted frame is on that lies over them (a closing card on track 3)
  const framed = mounts.filter((m) => used.has(m)), tracks = new Set(framed.map((m) => m.track));
  const over = (m) => framed.some((x) => x.start < m.start + (Number(m.duration) || 0) - 0.01 && x.start + (Number(x.duration) || 0) > m.start + 0.01);
  const isLayer = (m) => m.kind === "captions" || (framed.length > 0 && !tracks.has(m.track) && over(m));
  const extra = (m) => ({ index: null, title: m.compositionId ?? m.id, status: "built", scene: "", narrative: "", voiceover: "", plannedDuration: null,
    start: m.start, duration: m.duration, src: m.src, mountId: m.id, block: null, notInStoryboard: true });
  // the starter's 3 s title card is no shot of a film whose storyboard is written ("f1 · 3 s · 0 motions", 7 shots of 6)
  const left = mounts.filter((m) => !used.has(m) && !(root.starter && frames.length));
  left.filter((m) => !isLayer(m)).forEach((m) => shots.push({ ...extra(m), number: shots.length + 1 }));
  const layers = left.filter(isLayer).map((m) => ({ ...extra(m), number: null, layer: true, kind: m.kind, track: m.track }));
  shots.sort((a, b) => (a.start ?? 1e9) - (b.start ?? 1e9) || a.number - b.number);
  return { root, shots, layers, audio, storyboard: { exists: existsSync(sbFile), globals, warnings } };
}

/** Frames of a STORYBOARD.md with no length in seconds ("duration: (the same shot goes on)" once made shot 2 "? s" in the Motion
 *  Plan, and 11 frames for 10 cuts). Every frame is one shot of the film with its own seconds. */
export async function untimedFrames(file, { version = null } = {}) {
  if (!existsSync(file)) return [];
  const sb = (await loadHf(version)).storyboard.parseStoryboard(readFileSync(file, "utf8"));
  return sb.frames.filter((f) => !(Number(f.durationSeconds) > 0)).map((f, i) => ({ number: f.number ?? f.index ?? i + 1, title: f.title ?? "", duration: f.duration ?? null }));
}

/** The second each board still is taken at, as HyperFrames' storyboard.md says ("each shot's seconds", in film order): a frame's
 *  poster (its key moment, in film seconds or from the frame's own start) or the middle of its span. Null when a frame has no length
 *  in seconds: the board keeps the one-second rule. */
export async function stillSeconds(file, { version = null } = {}) {
  if (!existsSync(file)) return null;
  const sb = (await loadHf(version)).storyboard.parseStoryboard(readFileSync(file, "utf8"));
  let t = 0;
  const out = [];
  for (const f of sb.frames) {
    const d = Number(f.durationSeconds), p = Number(f.poster);
    if (!(d > 0)) return null;
    const at = Number.isFinite(p) && p >= t && p < t + d ? p : Number.isFinite(p) && p >= 0 && p < d ? t + p : t + d / 2;
    out.push(Math.round(at * 1000) / 1000);
    t += d;
  }
  return out.length ? out : null;
}

/** The moments a film's card picture is looked for: the middle of its first shots, inside its first quarter, at most `max` of them, evenly. Never
 *  later: a film's turn comes later, and a card must not give it away (T28-20: the richest frame of the whole film was ~96 s of 125 s, the word the
 *  film builds up to). */
export function earlyStills(shots, total = null, max = 4) {
  const placed = (shots ?? []).filter((s) => s.start != null && s.duration);
  if (!placed.length) return [];
  const end = Number(total) || Math.max(...placed.map((s) => s.start + s.duration));
  const mid = (s) => +(s.start + s.duration / 2).toFixed(3);
  const early = placed.filter((s) => mid(s) <= end * 0.25);
  const from = early.length ? early : placed.slice(0, 1);
  return from.length <= max ? from.map(mid) : Array.from({ length: max }, (_, i) => mid(from[Math.round((i * (from.length - 1)) / (max - 1))]));
}

/** The shots on a time line: the mounted ones as they are; before the build, or in a film that is one page of code (no
 *  frame mounted), the storyboard's frames one after another by their planned length, marked `planned`, scaled to the film's length when
 *  it is known. The timeline, the self-check's stills and the sound effects read the same times. */
export function placedShots(shots, total = null) {
  const mounted = shots.filter((x) => x.start != null);
  // the mounted shots when the storyboard's frames are mounted; a film whose only mounts are layers over it (a code film's titles) is
  // placed by its frames
  if (mounted.some((x) => x.index != null) || (mounted.length && !shots.some((x) => x.index != null))) return mounted;
  let t = 0;
  const out = shots.filter((x) => x.index != null).map((x) => { const d = Number(x.plannedDuration ?? x.duration) || 2; const o = { ...x, start: Math.round(t * 1000) / 1000, duration: d, planned: true }; t += d; return o; });
  const k = Number(total) > 0 && t > 0 && Math.abs(t - Number(total)) > 0.05 ? Number(total) / t : 1;
  if (k !== 1) for (const o of out) { o.start = Math.round(o.start * k * 1000) / 1000; o.duration = Math.round(o.duration * k * 1000) / 1000; }
  return out;
}

/** The title is the text of the frame's `## ` heading (HF has no writer for it): replace it on the index-th frame heading, keep the label. */
function setHeading(text, index, title) {
  let n = 0;
  return text.replace(/^(##\s+)(.*)$/gm, (line, hashes, rest) => {
    if (++n !== index) return line;
    const m = /^((?:Frame|Shot|Scene)\s*\d+\s*[—–:-]\s*)/i.exec(rest);
    return hashes + (m ? m[1] : "") + title.replace(/\s*\n\s*/g, " ");
  });
}

/** Edit one storyboard frame through HF's own writers (the heading title by our own one-line edit).
 *  fields: { title?, scene?, duration?, status?, voiceover?, sfx? } (sfx: the app's comma-separated sound-effect cues; "" writes "none") */
export async function updateFrame(dir, index, fields, { version = null } = {}) {
  const hf = await loadHf(version);
  const f = join(dir, "STORYBOARD.md");
  let text = readFileSync(f, "utf8");
  for (const [k, v] of Object.entries(fields)) {
    if (v == null) continue;
    if (k === "title") { text = setHeading(text, index, String(v)); continue; }
    if (k === "status" && !hf.storyboard.FRAME_STATUSES.includes(v)) throw Object.assign(new Error(`Status must be one of ${hf.storyboard.FRAME_STATUSES.join(", ")}`), { code: "INVALID" });
    if (k === "status") text = hf.storyboard.setFrameStatus(text, index, v);
    else if (k === "voiceover") text = hf.storyboard.setFrameVoiceover(text, index, v);
    else if (k === "duration") text = hf.storyboard.setFrameField(text, index, "duration", `${Number(v)}s`);
    else if (k === "scene") text = hf.storyboard.setFrameField(text, index, k, String(v).replace(/\s*\n\s*/g, " "));
    else if (k === "sfx") text = hf.storyboard.setFrameField(text, index, "sfx", String(v).replace(/\s*\n\s*/g, " ").trim() || "none");
    else throw Object.assign(new Error(`Field ${k} cannot be edited here`), { code: "INVALID" });
  }
  writeFileSync(f, text);
  return readShots(dir, { version });
}

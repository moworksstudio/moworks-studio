// The Editor's Assets tab: the project's
// files with "missing" / "new", and what the user does with one: relink a missing file, delete (to .moworks/trash, never for good), move
// to another folder (the film's paths follow), transcribe any audio (it becomes the voice the film is timed to), put an audio file on the
// timeline. No change while the film is being rendered or Claude is changing it.
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, normalize, sep } from "node:path";
import * as projects from "../project-service/index.mjs";
import { listAssets, referencedFiles, rememberAssets, rewriteRefs } from "../project-service/assets.mjs";
import { unlockPdf } from "../project-service/scan.mjs";
import { readShots } from "../hf-edit/shots.mjs";
import { fetchImagery, imageryCredit } from "../map-explainer/index.mjs";
import { docPath } from "../project-service/docs.mjs";
import { audioKind, fitToFilm, laneOfFile, placeClip, placeTrack, removeRepeats, trackClips } from "../hf-edit/tracks.mjs";
import { filmLength } from "../hf-edit/ending.mjs";
import { ADDED, muteMounted, readState as readSfx, writeCredits } from "../sfx/index.mjs";
import { placeAdded } from "../sfx/added.mjs";
import { updatePrefs } from "../sfx/prefs.mjs";
import { levelTracks } from "../sfx/mixlevels.mjs";

/** After a sound was taken off the timeline (the Editor's Remove; the element itself is removed by HF's own source mutation in
 *  editor.mjs): the music stops being the film's music, the voice-over stays off the timeline until it is put back (its words are kept),
 *  one of the app's own sound effects (el-sfx-N) stays off when the sound effects are placed again, and so does a scene's ambience bed
 *  (el-amb-N: the owner's sound choices keep it out). `sound`: { id, src }. */
export function soundTakenOff(p, { id = null, src = null, cue = null } = {}, root) {
  const m0 = p.meta ?? {};
  // one clip of a voice cut into one clip a line taken off leaves the voice on the timeline (T22-11); the song's own clip taken off takes
  // its repeats with it (tracks.mjs musicLoop), one repeat taken off leaves the music
  let html = ""; try { html = readFileSync(join(p.path, "index.html"), "utf8"); } catch { /* no film page yet */ }
  const left = (kind) => trackClips(html, kind).filter((c) => c.src === src && !(id && c.id === id));          // the clip taken off is gone
  if (src && m0.music?.file === src && !left("music").some((c) => c.id === "el-music")) { removeRepeats(p.path); projects.updateMeta(p.id, (m) => { delete m.music; }, root); }
  if (src && m0.voice?.file === src && !left("voice").length) projects.updateMeta(p.id, (m) => { if (m.voice) m.voice.offTimeline = true; }, root);
  const bed = id && /^el-amb-\d+$/.test(id) ? readSfx(p.path).ambience?.placed?.[Number(id.slice(7))] : null;
  if (bed?.key) updatePrefs(p.path, { skip: [bed.key] });
  const muted = id && /^el-sfx-\d+$/.test(id) ? muteMounted(p.path, id, { cue }) : bed?.key ? { name: bed.name, start: bed.start } : null;
  if (id && /^el-clip-\d+$/.test(id)) writeCredits(p.path);          // a sound from the Sounds drawer leaves the credits with its clip
  return { music: !!(src && m0.music?.file === src), voice: !!(src && m0.voice?.file === src), muted };
}
/** The lane an <audio> shows on (as the Editor's timeline: Narration, Music, else SFX). a: the tag's attributes. */
const laneOfTag = (a) => {
  const role = String(a["data-timeline-role"] ?? "").toLowerCase(), id = String(a.id ?? "");
  return role === "voiceover" || role === "voice" ? "voiceover" : role === "music" ? "music" : role ? "sfx" : /^el-voice/.test(id) ? "voiceover" : /^el-music/.test(id) ? "music" : "sfx";
};
const tagAttrs = (tag) => Object.fromEntries([...tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g)].map((m) => [m[1], m[2]]));
/** Whether a sound from `start` for `length` seconds would lie over a sound already on that lane of the page (owner #933: on Narration and Music
 *  a drop onto sound is refused, never moved). A clip that names no length runs to the film's end. */
export function laneBusy(html, lane, start, length, film = 0) {
  const s = Math.max(0, Number(start) || 0), e = s + Math.max(0.05, Number(length) || 0);
  return [...String(html ?? "").matchAll(/<audio\b[^>]*>/gi)].map((m) => tagAttrs(m[0])).filter((a) => laneOfTag(a) === lane).some((a) => {
    const a0 = Number(a["data-start"]) || 0, d = Number(a["data-duration"]), a1 = d > 0 ? a0 + d : Math.max(film, a0 + 1);
    return a0 < e - 0.01 && s < a1 - 0.01;
  });
}
/** Every clip of the film's voice-over ("voice": the app's el-voice, or the clips the Build cut it into, el-voice-01…, one a line, T22-11) or of its music
 *  ("music": el-music and its repeats) off the page, the files kept; a clip the user added beside them (el-clip-N) stays. Returns whether the page changed. */
function filmClipsOff(p, kind = "voice") {
  const f = join(p.path, "index.html");
  let html = ""; try { html = readFileSync(f, "utf8"); } catch { return false; }
  const own = kind === "voice" ? /^el-voice(?:-[\w-]+)?$/ : /^el-music(?:-[\w-]+)?$/, file = kind === "voice" ? p.meta?.voice?.file : p.meta?.music?.file;
  const out = html.replace(/[ \t]*<audio\b[^>]*>(?:\s*<\/audio>)?[ \t]*\r?\n?/g, (tag) => {
    const a = tagAttrs(tag);
    return audioKind(a) === kind && (a.src === file || own.test(a.id ?? "")) ? "" : tag;
  });
  if (out !== html) writeFileSync(f, out);
  return out !== html;
}
import { extractAudio, probe } from "../voice/audio.mjs";
import * as rev from "../revisions/index.mjs";

const AUDIO = /\.(mp3|wav|m4a|flac|ogg|aac|opus)$/i, VIDEO = /\.(mp4|mov|webm|m4v|mkv|avi)$/i;
const AUDIO_FOLDERS = { voiceover: "assets/3_audio/voiceover", music: "assets/3_audio/music", sfx: "assets/3_audio/sfx" };
/** A project-relative path under assets/ (or the old sources/), no "..": else null. */
export function safeAssetPath(p) {
  const rel = normalize(String(p ?? "").replace(/\\/g, "/")).split(sep).join("/").replace(/^\.\//, "");
  return /^(assets|sources)\/[^]+$/.test(rel) && !rel.split("/").includes("..") ? rel : null;
}

export function assetRoutes(ctx, { r, P, mustProject, HttpError }) {
  const { root } = ctx;
  const free = (id) => {
    if (ctx.renders?.isRendering(id)) throw new HttpError(409, "RENDERING", "The film is being rendered: wait until the render finishes");
    if (ctx.agent?.running?.has(id)) throw new HttpError(409, "BUSY", "Claude is changing the film: wait until it finishes");
  };
  const must = (p, rel, { exists = true } = {}) => {
    const x = safeAssetPath(rel);
    if (!x) throw new HttpError(400, "INVALID", "Not a file of this project's assets");
    if (exists && !existsSync(join(p.path, ...x.split("/")))) throw new HttpError(404, "NOT_FOUND", "File not found");
    return x;
  };
  // recorded beside the server's thread, in the project's git queue (T22-5); never rejects
  const commit = async (p, msg) => { try { await rev.saveAsync(p.path, msg); } catch { /* revisions optional */ } };
  /** Another voice than the one Version 1 was timed to (owner #920): recorded, so the Review looks for a picture off the new voice and says so. Claude does
   *  not re-time the film by itself. */
  const replacedVoice = (p, from, to) => {
    if (!from || from === to || !p.meta?.pipeline?.version1?.at) return;
    projects.updateMeta(p.id, (m) => { if (m.voice) m.voice.replaced = { at: new Date().toISOString(), from, afterVersion1: true }; }, root);
  };

  const routes = [
    r("GET", `/projects/${P}/assets`, async ([id]) => {
      const p = mustProject(id, root);
      const { shots, layers } = await readShots(p.path).catch(() => ({ shots: [], layers: [] }));
      const out = listAssets(p.path, { shots, layers, meta: p.meta ?? {} });
      if (out.fresh.length) {          // copied in Explorer: Claude is told too, and goes on when it was waiting for them
        projects.addNote(p.path, { kind: "assets", text: "Added {n} file(s)", files: out.fresh });
        try { ctx.autopilot?.filesAdded?.(id, out.fresh); } catch { /* the note stands */ }
      }
      return { items: out.items, groups: out.groups };          // groups: the tab's order; each item has its `group`
    }),
    r("POST", `/projects/${P}/assets/relink`, async ([id], b) => {
      const p = mustProject(id, root); free(id);
      const from = must(p, b.from, { exists: false }), to = must(p, b.to);
      if (!referencedFiles(p.path).has(from)) throw new HttpError(400, "INVALID", "The film does not use this path");
      const changed = rewriteRefs(p.path, from, to);
      await commit(p, `Relinked ${from} → ${to}`);
      return { changed };
    }),
    r("POST", `/projects/${P}/assets/delete`, async ([id], b) => {
      const p = mustProject(id, root); free(id);
      const rel = must(p, b.path);
      const users = referencedFiles(p.path).get(rel) ?? [];
      if (users.length && b.force !== true) throw Object.assign(new HttpError(409, "IN_USE", "The film uses this file"), { detail: { usedIn: users } });
      const trash = join(p.path, ".moworks", "trash", `${Date.now()}-${basename(rel)}`);          // never deleted for good from the app
      mkdirSync(dirname(trash), { recursive: true });
      renameSync(join(p.path, ...rel.split("/")), trash);
      await commit(p, `Asset removed: ${rel}`);
      return { removed: rel, usedIn: users };
    }),
    r("POST", `/projects/${P}/assets/move`, async ([id], b) => {
      const p = mustProject(id, root); free(id);
      const rel = must(p, b.path);
      // the Assets menu names an audio folder by its key ("voiceover", "music", "sfx"), or gives the folder's path
      const key = String(b.folder ?? "").replace(/\/+$/, "");
      const folder = must(p, `${AUDIO_FOLDERS[key] ?? key}/x`, { exists: false }).slice(0, -2);
      let to = `${folder}/${basename(rel)}`;
      for (let i = 2; existsSync(join(p.path, ...to.split("/"))); i++) to = `${folder}/${basename(rel, extname(rel))} (${i})${extname(rel)}`;
      mkdirSync(join(p.path, ...folder.split("/")), { recursive: true });
      renameSync(join(p.path, ...rel.split("/")), join(p.path, ...to.split("/")));
      const changed = rewriteRefs(p.path, rel, to);
      projects.updateMeta(id, (m) => { if (m.voice?.file === rel) m.voice.file = to; if (m.music?.file === rel) m.music.file = to; }, root);
      rememberAssets(p.path, [to]);
      await commit(p, `Moved ${rel} → ${to}`);
      return { path: to, changed };
    }),
    // any audio file (or a clip's sound) becomes the voice the film is timed to, transcribed at once
    r("POST", `/projects/${P}/assets/transcribe`, async ([id], b) => {
      const p = mustProject(id, root); free(id);
      const rel = must(p, b.path);
      const abs = join(p.path, ...rel.split("/"));
      if (!AUDIO.test(rel) && !VIDEO.test(rel)) throw new HttpError(400, "INVALID", "Choose an audio file or a clip");
      let audio = abs, from = null;
      if (VIDEO.test(rel)) {          // the clip's sound, for the transcript (the clip stays where it is)
        audio = projects.assetDestination(p.path, basename(abs, extname(abs)) + ".m4a", "voiceover").path;
        await extractAudio(abs, audio, root); from = rel;
      }
      const old = p.meta?.voice?.file ?? null, voice = await ctx.useVoice(p, audio, await probe(audio, root), { source: "upload", size: statSync(audio).size, from });
      replacedVoice(p, old, voice?.voice?.file ?? rel);
      return voice;
    }),
    // an audio file onto the timeline, on its lane: the first voice-over as the voice (transcribed first when its words are not
    // checked yet), the first music as the music track, a sound effect as its own clip; on a lane the film's voice or music already holds it is a
    // clip beside them, never in their place (T37-1, T37-3); `start` (seconds) is where the user dropped it, else 0
    r("POST", `/projects/${P}/assets/timeline`, async ([id], b) => {
      const p = mustProject(id, root); free(id);
      const rel = must(p, b.path);
      if (!AUDIO.test(rel)) throw new HttpError(400, "INVALID", "Choose an audio file");
      const abs = join(p.path, ...rel.split("/"));
      const info = await probe(abs, root);
      const start = b.start != null && Number.isFinite(Number(b.start)) ? Math.max(0, Number(b.start)) : null;
      const lane = ["voiceover", "music", "sfx"].includes(b.lane) ? b.lane : laneOfFile(rel, projects.classifyAsset);
      // inside the film: a long sound stops at its end (T37-4)
      const clipHere = async (role, says) => {
        const fit = fitToFilm(p.path, start ?? 0, Number(info?.duration) || 1);
        const clip = placeClip(p.path, { src: rel, duration: fit.duration, start: fit.start, role });
        await commit(p, `${says} on the timeline: ${rel}`);
        return { lane, clip, ...(fit.cut ? { cut: true } : {}) };
      };
      let html = ""; try { html = readFileSync(join(p.path, "index.html"), "utf8"); } catch { /* no film page yet */ }
      const taken = (kind) => trackClips(html, kind).length > 0;
      // Narration and Music hold one sound at a time (owner #933): onto sound already there the drop is refused and nothing moves; the SFX lane
      // stacks its sounds on rows of their own as before
      if (lane !== "sfx") {
        const film = filmLength(p.meta ?? {}, { dir: p.path }).total || 0, fit = fitToFilm(p.path, start ?? 0, Number(info?.duration) || 1);
        if (laneBusy(html, lane, fit.start, fit.duration, film)) throw new HttpError(409, "LANE_BUSY", lane === "music" ? "Music already has sound there" : "Narration already has sound there");
      }
      if (lane === "voiceover") {
        const v = p.meta?.voice;
        // the film's voice taken off comes back; on a lane that holds a voice, the same file too, it is a clip beside it; on an empty lane (the film's
        // voice taken off) another file becomes the film's voice (owner #937), the Editor having said once that the picture was timed to the old one
        if (taken("voice") || (v?.file && v.file !== rel && !v.offTimeline)) return clipHere("voiceover", "Sound beside the voice-over");
        if (v?.file === rel && v.transcript?.status === "saved") {          // its words are checked: straight back on the timeline
          placeTrack(p.path, { kind: "voice", src: rel, duration: Number(info?.duration ?? v.info?.duration) || 1, start });
          projects.updateMeta(id, (m) => { if (m.voice) delete m.voice.offTimeline; }, root);
          await levelTracks(p.path, { root }).catch(() => null);          // the voice at its level, the music ducked under its words
          await commit(p, `Voice-over on the timeline: ${rel}`);
          return { lane, voice: { file: rel } };
        }
        const voice = await ctx.useVoice(p, abs, info, { source: "upload", size: statSync(abs).size });
        replacedVoice(p, v?.file, rel);
        return { lane, voice };
      }
      if (lane === "music") {
        if (taken("music")) return clipHere("music", "Sound beside the music");
        const music = await ctx.placeMusic(p, rel, info, { start });
        await commit(p, `Music on the timeline: ${rel}`);
        return { lane, music };
      }
      // a sound added from the Sounds drawer and taken off comes back with its level and its credit
      const added = Object.entries(readSfx(p.path).sounds ?? {}).find(([n, s]) => n.startsWith(ADDED) && s.file === rel)?.[0];
      if (added) { const x = await placeAdded(p.path, added, { at: start ?? 0, root }); await commit(p, `Sound effect on the timeline: ${rel}`); return { lane, clip: x.tag }; }
      return clipHere("sfx", "Sound effect");
    }),
    // "Use as the film's voice-over" / "Use as the film's music" (owner 03/11, 2a): the only way to replace them. The old voice or music leaves the timeline
    // (its file stays in Assets) and this file takes its place from 0 s: a voice is transcribed first, as any new voice; a music gets its beats and its level.
    // Clips the user added beside them stay where they are.
    r("POST", `/projects/${P}/assets/use`, async ([id], b) => {
      const p = mustProject(id, root); free(id);
      const rel = must(p, b.path);
      if (!AUDIO.test(rel)) throw new HttpError(400, "INVALID", "Choose an audio file");
      if (!["voiceover", "music"].includes(b.as)) throw new HttpError(400, "INVALID", "A file is used as the voice-over or the music");
      const abs = join(p.path, ...rel.split("/"));
      const info = await probe(abs, root);
      let html = ""; try { html = readFileSync(join(p.path, "index.html"), "utf8"); } catch { /* no film page yet */ }
      if (b.as === "voiceover") {
        const v = p.meta?.voice;
        if (v?.file === rel && !v.offTimeline && trackClips(html, "voice").some((c) => c.src === rel)) throw new HttpError(409, "SAME", "It is already the film's voice-over");
        if (v?.file) { filmClipsOff(p, "voice"); soundTakenOff(p, { id: "el-voice", src: v.file }, root); }
        if (v?.file === rel && v.transcript?.status === "saved") {          // its words are checked: straight back on the timeline
          placeTrack(p.path, { kind: "voice", src: rel, duration: Number(info?.duration ?? v.info?.duration) || 1 });
          projects.updateMeta(id, (m) => { if (m.voice) delete m.voice.offTimeline; }, root);
          await levelTracks(p.path, { root }).catch(() => null);
          await commit(p, `The film's voice-over: ${rel}`);
          return { as: "voiceover", voice: { file: rel } };
        }
        const voice = await ctx.useVoice(p, abs, info, { source: "upload", size: statSync(abs).size });
        replacedVoice(p, v?.file, rel);
        return { as: "voiceover", voice };
      }
      const m0 = p.meta?.music;
      if (m0?.file === rel && trackClips(html, "music").some((c) => c.src === rel && c.id === "el-music")) throw new HttpError(409, "SAME", "It is already the film's music");
      removeRepeats(p.path);          // the old song and its repeats go; placeTrack puts this one in el-music's place
      if (m0?.file) filmClipsOff(p, "music");
      const music = await ctx.placeMusic(p, rel, info, {});
      await commit(p, `The film's music: ${rel}`);
      return { as: "music", music };
    }),
  ];

  /** The app tool for Claude: copy a file that is already in the project (a picture from the scan, a captured
   *  page, a layer) into assets/. Claude cannot copy a binary file itself (it cannot run commands). */
  const tools = {
    // The user chose not to use the voice-over: off the timeline (its element out of index.html, meta.voice.offTimeline so
    // the Editor drops its lane and words and nothing puts it back), the file kept; Claude had only muted it (data-volume="0")
    // Every font Claude names is checked first (Vietnamese letters, whether the app can serve it)
    font_check: async ({ project, args }) => {
      const fams = (Array.isArray(args?.families) ? args.families : []).map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
      const { checkFonts, fontCheckText } = await import("../agent/index.mjs");
      return fontCheckText(fams.length ? await checkFonts(project.path, fams) : null);
    },
    // a locked PDF, with the password the owner gave in the chat: it goes to one reading and leaves the chat's records, right or wrong
    unlock_pdf: async ({ project, args }) => {
      const password = String(args?.password ?? "");
      ctx.agent?.forgetSecret?.(project.id, password);
      const r = await unlockPdf(project.path, args?.file, password, { root });
      if (r.ok) return `"${r.name}" is open, ${r.pages} page(s). All its words: ${r.text.join(", ")}. Every page small and numbered on sheets: ${r.sheets.join(", ")}. Read them now. The password is not kept: write it nowhere.`;
      if (r.reason === "wrong") return `That password does not open "${r.name}". Say so to the owner and ask again; never guess one.`;
      if (r.reason === "none") return `No PDF named "${r.name}" has a password here: .moworks/scan/INDEX.md names the locked ones.`;
      return `The app could not read "${r.name}": ${r.reason}`;
    },
    voice_off: async ({ project }) => {
      const p = projects.getProject(project.id, root);
      if (!p?.meta?.voice?.file) return "This film has no voice-over.";
      if (ctx.renders?.isRendering(project.id)) return "The film is being rendered: try again when it finishes.";
      filmClipsOff(p, "voice");          // every clip of it: the app's el-voice, or the clips the Build cut it into
      soundTakenOff(p, { id: "el-voice", src: p.meta.voice.file }, root);
      await commit(p, `Voice-over off the timeline: ${p.meta.voice.file} (kept in the assets)`);
      return `The voice-over ${basename(p.meta.voice.file)} is off the timeline (the file stays in the assets): the film has no narration.`;
    },
    // The Map Explainer style's real ground. No network or no answer: the owner is told, on a card and through Claude, and the film keeps the drawn ground.
    map_imagery: async ({ project, args }) => {
      const views = Array.isArray(args?.views) ? args.views : [];
      if (ctx.renders?.isRendering(project.id)) return "The film is being rendered: try again when it finishes.";
      const r = await fetchImagery(project.path, { views, center: Number(args?.center) || 0 });
      if (!r.ok) {
        try { projects.addNote(project.path, { kind: "imagery", status: "warning", text: `The satellite pictures could not be fetched (${r.reason}). Check the internet connection: this film uses the ground drawn in code until they come.` }); } catch { /* notes are best effort */ }
        return `The satellite pictures could not be fetched: ${r.reason}. The film uses the ground the engine draws, with its "drawn" corner note. Tell the owner this in your reply, in plain words, and that it needs the internet to use the real pictures.`;
      }
      try { imageryCredit(docPath(project.path, "CREDITS.md")); } catch { /* the page's own corner line still carries it */ }
      return r.reused ? "The satellite pictures for these views are already in the film." : `Fetched ${r.levels} satellite mosaic(s), ${Math.round(r.bytes / 1e6)} MB. The engine lays them out by itself and writes EOX's credit in the corner note of each close shot: keep a .drawn note in those shots.`;
    },
    copy_to_assets: async ({ project, args }) => {
      const from = normalize(String(args.from ?? "").replace(/\\/g, "/")).split(sep).join("/");
      if (!from || from.split("/").includes("..") || /^(\.git|\.moworks\/(tasks|claude|notes)\.json)/.test(from)) return `"${args.from}" is not a file of this project.`;
      const src = join(project.path, ...from.split("/"));
      if (!existsSync(src) || statSync(src).isDirectory()) return `No file "${from}" in the project.`;
      if (ctx.renders?.isRendering(project.id)) return "The film is being rendered: try again when it finishes.";
      const name = String(args.name ?? basename(from));
      let dest;
      if (args.folder) {
        const folder = safeAssetPath(`${String(args.folder).replace(/\/+$/, "")}/x`)?.slice(0, -2);
        if (!folder || !folder.startsWith("assets/")) return `"${args.folder}" is not a folder under assets/.`;
        mkdirSync(join(project.path, ...folder.split("/")), { recursive: true });
        let to = `${folder}/${projects.safeFileName(name)}`;
        for (let i = 2; existsSync(join(project.path, ...to.split("/"))); i++) to = `${folder}/${basename(name, extname(name))} (${i})${extname(name)}`;
        dest = { path: join(project.path, ...to.split("/")), rel: to };
      } else dest = projects.assetDestination(project.path, name);
      copyFileSync(src, dest.path);
      rememberAssets(project.path, [dest.rel]);
      return `Copied to ${dest.rel}.`;
    },
  };
  return { routes, tools };
}

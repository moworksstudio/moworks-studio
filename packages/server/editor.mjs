// The Editor's own routes: hand edits (words, colour, size, font of one element; a shot's length and speed) through
// HyperFrames' source mutation (packages/hf-edit/handEdit.mjs), the timeline the Editor draws (shots, voice-over lines, sound effects,
// music with its waveform), a still of the frame on screen saved into the project, and the font lists of the edit card.
// Nothing here edits while Claude works on the same project (409 CLAUDE_BUSY): the user's edit and Claude's would cross.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as rev from "../revisions/index.mjs";
import { placedShots, readShots } from "../hf-edit/shots.mjs";
import { isStarter } from "../pipeline/index.mjs";
import * as hand from "../hf-edit/handEdit.mjs";
import { readState as readSfxState, shiftPlaced, soundTitles } from "../sfx/index.mjs";
import { soundMoved } from "../sfx/added.mjs";
import { fitEffects } from "../sfx/voicefit.mjs";
import { turnsPerFilm } from "./sounds.mjs";
import { listLocalFonts, useLocalFont } from "../hf-edit/localFonts.mjs";
import { declaredFamilies, finalize, fontMap, htmlFiles, usedFamilies } from "../hf-edit/finalize.mjs";
import { snapshotAtAsync } from "../hf-qa/cli.mjs";
import * as transcript from "../voice/transcript.mjs";
import { peaks } from "../voice/audio.mjs";
import * as library from "../library/index.mjs";
import * as codeText from "../hf-edit/codeText.mjs";
import { freshFilm } from "../hf-edit/codeFilm.mjs";
import { codeGlyphs } from "../hf-qa/codeGlyphs.mjs";

const r3 = (n) => Math.round(n * 1000) / 1000;
const readJson = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };

/** The folders of a project that hold the user's own font files (assets/1_design/fonts; older projects: 4_fonts, fonts/). */
const fontDirs = (dir) => ["assets/1_design/fonts", "assets/4_fonts", "assets/fonts"].map((x) => join(dir, ...x.split("/"))).filter((d) => existsSync(d));

/** Findings of the last Checks run that name a moment of the film: dots on the timeline (a click jumps there). */
function qcDots(dir) {
  const last = readJson(join(dir, ".moworks", "cache", "qa", "last.json"), null);
  if (!last?.checks) return [];
  const out = [];
  for (const c of last.checks) for (const f of c.findings ?? []) {
    const t = Number(f.time ?? f.t ?? f.at ?? f.seconds ?? NaN);
    if (Number.isFinite(t)) out.push({ time: r3(t), check: c.id, title: c.title, blocking: !!c.blocking, text: String(f.message ?? f.text ?? f.summary ?? f.id ?? "").slice(0, 200),
      ...(f.plain ? { plain: f.plain } : {}), shot: f.shot ?? null });          // the user's line, and the shot it is in
  }
  return out.slice(0, 200);
}

export function editorRoutes(ctx, { r, P, mustProject, HttpError }) {
  const root = ctx.root;
  const busy = (id) => {
    if (ctx.agent?.running?.has(id)) throw new HttpError(409, "CLAUDE_BUSY", "Claude is changing the film: wait until it finishes");
    if (ctx.renders?.isRendering(id)) throw new HttpError(409, "RENDERING", "The film is being rendered: wait until the render finishes");
  };
  const fail = (e) => {
    if (e instanceof HttpError) throw e;
    const status = { NOT_FOUND: 404, INVALID: 400, NOT_EDITABLE: 422 }[e.code];
    if (status) throw new HttpError(status, e.code, e.message);
    throw e;
  };
  // recorded beside the server's thread, in the project's git queue (T22-5); never rejects
  const commit = async (p, id, message) => { try { await rev.saveAsync(p.path, message); } catch { /* revisions optional */ } ctx.backupProject?.(id); };
  const short = (s) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  // a sound moved or taken off: one at a time on a film, with the Sounds drawer's Add (each reads and writes the page and the sound record, and the fit takes seconds:
  // a second drag in that time must not be written over), never while the app places the sounds
  const inTurn = (ctx.soundTurn ??= turnsPerFilm());
  const busySound = (id) => {
    busy(id);
    if (ctx.jobs?.list?.({ kind: "mix-sfx" }).some((j) => j.projectId === id && j.status === "running")) throw new HttpError(409, "BUSY", "The sound effects are being placed: change this one when that finishes");
  };

  return { routes: [
    // the Editor opens: HF's element ids pinned into every composition (the picker and the hand edits address elements by them). Committed
    // under the message the pipeline already treats as "not a change of the film" (the ids do not change what renders)
    r("POST", `/projects/${P}/edit/prepare`, async ([id]) => {
      const p = mustProject(id, root);
      if (ctx.agent?.running?.has(id)) return { ok: true, skipped: "claude" };
      // what was already changed is committed as itself first, so only the ids go under the "not a change of the film" message. The git
      // calls run beside the server (T26-3: this took 138 s on a busy computer, and every request of the page waited behind it)
      try { await rev.ensureRepoAsync(p.path); if (await rev.isDirtyAsync(p.path)) await rev.commitAllAsync(p.path, "Changes found when the Editor opened"); } catch { /* revisions optional */ }
      try { await hand.stampIds(p.path); } catch (e) { return { ok: false, error: e.message }; }
      // changed: the ids changed the film's files (the Editor, which did not wait for this, loads the film once more)
      let changed = false;
      try { changed = await rev.isDirtyAsync(p.path); if (changed) await rev.commitAllAsync(p.path, rev.STUDIO_IDS); } catch { /* revisions optional */ }
      return { ok: true, changed };
    }),
    r("GET", `/projects/${P}/edit/parts`, async ([id], _b, q) => {
      const p = mustProject(id, root);
      try { return await hand.partsOf(p.path, q.get("file"), q.get("hf")); } catch (e) { fail(e); }
    }),
    r("GET", `/projects/${P}/edit/texts`, async ([id], _b, q) => {
      const p = mustProject(id, root);
      try { return await hand.textsOf(p.path, q.get("file")); } catch (e) { fail(e); }
    }),
    r("POST", `/projects/${P}/edit/text`, async ([id], b) => {
      const p = mustProject(id, root); busy(id);
      try {
        const out = await hand.setText(p.path, b.file, b.hfId, b.text);
        if (out.changed) await commit(p, id, `Hand edit: text "${short(b.text)}" (${out.file})`);
        return out;
      } catch (e) { fail(e); }
    }),
    // a film drawn by code: its words read from its source, shot by shot (hf-edit/codeText.mjs), and one written back
    // by hand with no Claude; the film's code is bundled again at once (What If 0.6 s, anidoodle 0.1 s; lemo and mg as they are). Words that
    // are not found there are pinned as a note for Claude (the Editor's Pin a note)
    r("GET", `/projects/${P}/edit/code-texts`, async ([id]) => {
      const p = mustProject(id, root);
      const { shots, root: comp } = await readShots(p.path);
      return codeText.codeTexts(p.path, { shots: placedShots(shots, comp?.duration) });
    }),
    r("POST", `/projects/${P}/edit/code-text`, async ([id], b) => {
      const p = mustProject(id, root); busy(id);
      const { shots, root: comp } = await readShots(p.path);
      const placed = placedShots(shots, comp?.duration);
      const item = codeText.codeTexts(p.path, { shots: placed }).items.find((x) => x.id === b.id);
      // the files a save may write, kept so a film that no longer builds goes back as it was
      const kept = [item?.file, "whatif/episode.json"].filter(Boolean).map((rel) => [join(p.path, ...rel.split("/")), existsSync(join(p.path, ...rel.split("/"))) ? readFileSync(join(p.path, ...rel.split("/"))) : null]);
      let out;
      try { out = codeText.setCodeText(p.path, b.id, b.text, { was: b.was ?? null, shots: placed }); } catch (e) {
        if (e.code === "STALE") throw new HttpError(409, "STALE", e.message);
        fail(e);
      }
      if (!out.changed) return { ...out, built: null };
      const t0 = Date.now(), film = await freshFilm(p.path);
      if (film?.error) {
        for (const [f, data] of kept) if (data) writeFileSync(f, data);
        await freshFilm(p.path);
        throw new HttpError(422, "NOT_EDITABLE", `These words could not be written into the film's code (${String(film.error).split("\n")[0].slice(0, 160)}): pin a note for Claude instead`);
      }
      // Vietnamese letters the film's face lacks, said at once
      const glyphs = codeGlyphs(p.path).findings.filter((f) => f.file === out.file && f.line === out.item.line).map((f) => `"${f.text}" is set in ${f.face}, which has no ${f.missing}: ${f.why}`);
      await commit(p, id, `Hand edit: text "${short(out.item.text)}" (${out.file})`);
      try { ctx.previewProxy?.(id); } catch { /* the next change asks again */ }
      return { ...out, warnings: [...out.warnings, ...glyphs], built: film ? { kind: film.kind, ms: Date.now() - t0 } : null };
    }),
    // a What If word's font and size, on its own tag; a family must be one the app can serve here and, for Vietnamese
    // words, one that draws them (G-GLYPH's rule, checked first as font_check does); its faces are installed when the film is made again
    r("POST", `/projects/${P}/edit/code-style`, async ([id], b) => {
      const p = mustProject(id, root); busy(id);
      const { shots, root: comp } = await readShots(p.path);
      const placed = placedShots(shots, comp?.duration);
      const item = codeText.codeTexts(p.path, { shots: placed }).items.find((x) => x.id === b.id);
      if (!item) throw new HttpError(404, "NOT_FOUND", "These words are no longer in the film (it changed): look again");
      const font = b.font ? String(b.font).trim() : null, size = b.size != null && b.size !== "" ? Number(b.size) : null;
      if (font) {
        const { checkFonts } = await import("../agent/index.mjs");
        const f = (await checkFonts(p.path, [font]))?.families?.[0];
        const vi = /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/iu.test(item.text);
        if (!f?.available) throw new HttpError(422, "NOT_EDITABLE", `${font} is not a font the app can get here (bundled, on Google Fonts or a file in the project's fonts)`);
        if (vi && f.vi === false) throw new HttpError(422, "NOT_EDITABLE", `${font} has no Vietnamese letters${f.missing ? ` (${f.missing})` : ""}: choose a font that draws them`);
      }
      const kept = [[join(p.path, ...item.file.split("/")), readFileSync(join(p.path, ...item.file.split("/")))]];
      let out;
      try { out = codeText.setCodeStyle(p.path, b.id, { size, font }, { shots: placed }); } catch (e) { fail(e); }
      const t0 = Date.now(), film = await freshFilm(p.path);
      if (film?.error) {
        for (const [f, data] of kept) writeFileSync(f, data);
        await freshFilm(p.path);
        throw new HttpError(422, "NOT_EDITABLE", `This could not be written into the film's code (${String(film.error).split("\n")[0].slice(0, 160)}): pin a note for Claude instead`);
      }
      let fonts = null;
      if (font) { const rep = await finalize(p.path); fonts = { added: rep.fontsAdded.map((f) => f.family), unresolved: rep.unresolvedFonts }; }          // R-WHATIF names the face, R-FONTS installs it
      await commit(p, id, `Hand edit: ${[font ? `font ${font}` : null, size != null ? `size ${Math.round(size)}` : null].filter(Boolean).join(", ")} of "${short(item.text)}" (${out.file})`);
      try { ctx.previewProxy?.(id); } catch { /* the next change asks again */ }
      return { ...out, fonts, built: film ? { kind: film.kind, ms: Date.now() - t0 } : null };
    }),
    r("POST", `/projects/${P}/edit/style`, async ([id], b) => {
      const p = mustProject(id, root); busy(id);
      try {
        const out = await hand.setStyle(p.path, b.file, b.hfId, b.style ?? {});
        let fonts = null;
        // a new family: one of this PC's own fonts is copied into the project first; then the app finds it (project, bundled, Google Fonts
        // once) and declares it, as after a Claude task
        if (out.changed && b.style?.["font-family"]) {
          const fam = String(b.style["font-family"]);
          const known = Object.keys(fontMap()).some((k) => k.toLowerCase() === fam.toLowerCase());
          // the project's own font files first, then this PC's fonts; each is declared once in the film
          let local = null;
          if (!known) for (const d of fontDirs(p.path)) { local = useLocalFont(p.path, fam, { dir: d }); if (local) break; }
          if (!known && !local) local = useLocalFont(p.path, fam);
          const rep = await finalize(p.path);
          fonts = { added: [...(local ? [local.family] : []), ...rep.fontsAdded.map((f) => f.family)], unresolved: rep.unresolvedFonts, local };
        }
        if (out.changed) await commit(p, id, `Hand edit: ${Object.keys(b.style ?? {}).join(", ")} (${out.file})`);
        return { ...out, fonts };
      } catch (e) { fail(e); }
    }),
    r("POST", `/projects/${P}/edit/reset`, async ([id], b) => {
      const p = mustProject(id, root); busy(id);
      try {
        const out = await hand.reset(p.path, b.file, b.hfId);
        if (out.changed) await commit(p, id, `Hand edit reset (${out.file})`);
        return out;
      } catch (e) { fail(e); }
    }),
    // a shot's length (later shots and their sound effects move with it) and speed. STORYBOARD.md is left as approved: a hand change of
    // timing asks for Checks again (the film changed), not for a new storyboard, motion spec and build
    r("POST", `/projects/${P}/edit/shot`, async ([id], b) => {
      const p = mustProject(id, root); busy(id);
      try {
        const out = await hand.setShotTiming(p.path, b.mountId, { duration: b.duration ?? null, rate: b.rate ?? null });
        shiftPlaced(p.path, out.movedFrom, out.delta);          // the sounds that moved with their shots: no move of the user's
        await commit(p, id, `Hand edit: shot ${b.number ?? ""} ${b.duration != null ? `${r3(b.duration)} s` : ""}${b.rate != null ? ` speed ${b.rate}x` : ""}`.replace(/\s+/g, " ").trim());
        return out;
      } catch (e) { fail(e); }
    }),
    // what the Editor's timeline draws: shots, voice-over lines, sound effects and the music (waveform cached per file)
    r("GET", `/projects/${P}/timeline`, async ([id]) => {
      const p = mustProject(id, root);
      const s = await readShots(p.path);
      const html = existsSync(join(p.path, "index.html")) ? readFileSync(join(p.path, "index.html"), "utf8") : "";
      const tags = html.match(/<audio\b[^>]*>/g) ?? [];
      // the attribute itself, never the end of a longer name: the id of `<audio data-hf-id="hf-k4k5" id="el-sfx-3">` is el-sfx-3, the src of a scene's
      // data-composition-src is no src (T29-1: every sound on the timeline had its HF id as its id)
      const attr = (t, a) => new RegExp(`(?<![\\w-])${a}="([^"]*)"`).exec(t)?.[1] ?? null;
      const clips = tags.map((t) => ({ id: attr(t, "id"), hfId: attr(t, "data-hf-id"), src: attr(t, "src"), role: attr(t, "data-timeline-role"), track: attr(t, "data-track-index") != null ? Number(attr(t, "data-track-index")) : null, start: Number(attr(t, "data-start") ?? 0),
        mediaStart: attr(t, "data-media-start") != null ? Number(attr(t, "data-media-start")) : null, duration: attr(t, "data-duration") != null ? Number(attr(t, "data-duration")) : null }));
      // each sound's lane: its role, else its folder (voiceover / music / sound effects), as the Assets tab sorts them
      const laneOf = (c) => (c.role === "voiceover" ? "voice" : c.role === "music" ? "music" : c.role === "sfx" ? "sfx"
        : /(^|\/)voiceover\//.test(c.src ?? "") ? "voice" : /(^|\/)music\//.test(c.src ?? "") ? "music" : "sfx");
      const rates = Object.fromEntries((html.match(/<(?:div|section)\b[^>]*data-composition-src="[^"]*"[^>]*>/g) ?? []).map((t) => [attr(t, "data-composition-src"), Number(attr(t, "data-playback-rate") ?? 1)]));
      // what the app itself calls this clip's sound: an effect left on a track's lane by an older drag is no voice line and no music of the film
      const effect = (c) => hand.isEffectClip({ id: c.id, src: c.src, "data-timeline-role": c.role ?? undefined });
      const music = clips.find((c) => laneOf(c) === "music" && !/^el-(sfx|clip|amb)-/.test(c.id ?? "")) ?? null;          // the waveform of the first sound on the Music lane
      let musicPeaks = null;
      if (music?.src && existsSync(join(p.path, music.src))) {
        const f = join(p.path, music.src), st = statSync(f);
        const key = createHash("sha1").update(`${music.src}|${st.size}|${st.mtimeMs}`).digest("hex").slice(0, 12);
        const cache = join(p.path, ".moworks", "cache", `peaks-${key}.json`);
        musicPeaks = readJson(cache, null);
        if (!musicPeaks) { try { musicPeaks = await peaks(f, 800); mkdirSync(join(cache, ".."), { recursive: true }); writeFileSync(cache, JSON.stringify(musicPeaks)); } catch { musicPeaks = null; } }
      }
      const tr = transcript.read(p.path);
      // each line at the place its clip plays it in the film (e.g. one file cut into three clips at 3.5, 21 and 32 s)
      const voiceClips = clips.filter((c) => c.role === "voiceover" && !/^el-(sfx|clip|amb)-/.test(c.id ?? ""));
      const titles = soundTitles(readSfxState(p.path));          // each sound's name as the Sounds drawer gives it
      // before the build (or in a film that is one page of code, with no frame mounted) the storyboard's frames are the shots,
      // one after another by their planned length, marked `planned`
      // before the build the root is the 3 s starter: the planned shots keep the storyboard's own lengths, never scaled to it
      // (12 shots of a 34 s film fell into 0-2.9 s)
      const total = s.root?.starter ? null : s.root?.duration;
      const mounted = isStarter(s.shots) ? s.shots.filter((x) => x.start != null) : placedShots(s.shots, total);
      // a captions track (HF's data-track-kind): the groups written in its file, in film seconds, for the Captions row
      const captions = await Promise.all((html.match(/<(?:div|section)\b[^>]*\bdata-track-kind="captions"[^>]*>/g) ?? []).map(async (t) => {
        const start = Number(attr(t, "data-start") ?? 0), file = attr(t, "data-composition-src");
        const cues = file ? await hand.captionCues(p.path, file).catch(() => []) : [];
        return { id: attr(t, "id"), file, start, duration: attr(t, "data-duration") != null ? Number(attr(t, "data-duration")) : null, cues: cues.map((c) => ({ ...c, start: r3(start + c.start) })) };
      }));
      return {
        duration: total ?? Math.max(0, ...mounted.map((x) => (x.start ?? 0) + (x.duration ?? 0))),
        shots: mounted.map((x) => ({ number: x.number, index: x.index, title: x.title, start: x.start, duration: x.duration, src: x.src, mountId: x.mountId,
          rate: rates[x.src] ?? 1, ...(x.planned ? { planned: true } : {}) })),
        voice: tr?.segments?.length && !p.meta?.voice?.offTimeline ? transcript.onFilm(tr.segments, voiceClips) : [],
        audio: clips.map((c) => ({ id: c.id, hfId: c.hfId, src: c.src, start: c.start, duration: c.duration, lane: laneOf(c), track: c.track, name: (c.src ?? "").split("/").pop(), title: titles.get(c.src) ?? null, effect: effect(c) })),
        sfx: clips.filter((c) => !c.role && /\/sfx\//.test(c.src ?? "")).map((c) => ({ start: c.start, duration: c.duration, name: (c.src ?? "").split("/").pop().replace(/\.[^.]+$/, "") })),
        music: music ? { start: music.start, duration: music.duration, name: (music.src ?? "").split("/").pop(), peaks: musicPeaks } : null,
        captions,
        qc: qcDots(p.path),
      };
    }),
    // a sound on the timeline: moved (start, lane) or taken off (the file stays in Assets); HF's own source mutation (handEdit.mjs)
    r("POST", `/projects/${P}/edit/audio`, ([id], b) => inTurn(id, async () => {
      const p = mustProject(id, root); busySound(id);
      const what = `sound ${b.name ?? b.id ?? b.hfId ?? ""}${b.start != null ? ` at ${r3(b.start)} s` : ""}${b.lane ? ` on ${b.lane}` : ""}`.replace(/\s+/g, " ").trim();
      try {
        // a sound-only revision, as the Final Mix's: the picture's checks hold, and a finished film gets the new sound mixed onto its render in seconds
        const { changed } = await ctx.mix.change(p, what, async () => {
          // the sound is named by its HF id or id, else by its src and its present start (`at`); `start` is where it goes
          const out = await hand.setAudio(p.path, { hfId: b.hfId, id: b.id, src: b.src, start: b.at }, { start: b.start ?? null, lane: b.lane ?? null });
          if (!out.changed) return out;
          // what it was at its old place (the ending's fade, a cut at the film's end) follows it; every effect under the words is fitted again, wherever it came from
          if (b.start != null && hand.isEffectClip(out.now)) await soundMoved(p.path, out.was, out.now, { root }).catch(() => null);
          await fitEffects(p.path, { root }).catch(() => null);
          return out;
        });
        if (changed) ctx.backupProject?.(id);
        return { changed };
      } catch (e) { fail(e); }
    })),
    r("POST", `/projects/${P}/edit/audio/remove`, ([id], b) => inTurn(id, async () => {
      const p = mustProject(id, root); busySound(id);
      try {
        const out = await ctx.mix.change(p, `sound ${b.name ?? b.id ?? b.hfId ?? ""} taken off the timeline`.replace(/\s+/g, " ").trim(), async () => {
          const x = await hand.removeAudio(p.path, { hfId: b.hfId, id: b.id, src: b.src, start: b.at });
          // assets.mjs keeps the record: the music forgotten, the voice kept off when its words are saved again, an app cue muted (by the tag's own id: the Editor
          // names a sound by its HF id first)
          try { (await import("./assets.mjs")).soundTakenOff?.(p, { id: x.was.id ?? b.id, src: x.was.src ?? b.src, cue: x.was["data-mw-cue"] ?? null }, root); } catch { /* the edit stands */ }
          return x;
        });
        ctx.backupProject?.(id);
        return { changed: out.changed };
      } catch (e) { fail(e); }
    })),
    // several sounds taken off at once (a box drawn on the timeline): one revision. One gone already is no failure
    r("POST", `/projects/${P}/edit/audio/remove-many`, ([id], b) => inTurn(id, async () => {
      const p = mustProject(id, root); busySound(id);
      const clips = Array.isArray(b.clips) ? b.clips.slice(0, 500) : [];
      if (!clips.length) throw new HttpError(400, "INVALID", "No sound was named");
      try {
        let removed = 0;
        const out = await ctx.mix.change(p, `${clips.length} sounds taken off the timeline`, async () => {
          const { soundTakenOff } = await import("./assets.mjs");
          for (const c of clips) {
            let x;
            try { x = await hand.removeAudio(p.path, { hfId: c.hfId, id: c.id, src: c.src, start: c.at }); } catch (e) { if (e.code === "NOT_FOUND") continue; throw e; }
            removed++;
            try { soundTakenOff(p, { id: x.was.id ?? c.id, src: x.was.src ?? c.src, cue: x.was["data-mw-cue"] ?? null }, root); } catch { /* the edit stands */ }
          }
          return { changed: removed > 0 };
        });
        ctx.backupProject?.(id);
        return { changed: out.changed, removed };
      } catch (e) { fail(e); }
    })),
    // every motion and block of the library, small cards for the Editor's motion drawer (looks stay apart: they are a whole video's look)
    r("GET", "/editor/motions", () => ({ items: library.all(root).filter((x) => x.kind !== "look" && x.kind !== "vocab").map((x) => ({ uid: x.uid, kind: x.kind, title: x.title, author: x.author,
      category: x.category, desc: (x.desc ?? "").slice(0, 160), poster: x.poster, video: x.video, vi: x.vi, tags: (x.tags ?? []).slice(0, 8) })) })),
    // the frame on screen, saved into the project's stills/ (HF's own snapshot at that second)
    r("POST", `/projects/${P}/edit/still`, async ([id], b) => {
      const p = mustProject(id, root);
      const t = Math.max(0, Number(b.time) || 0);
      const work = join(p.path, ".moworks", "cache", "still-work");          // HF also writes a contact sheet: only the frame goes to stills/
      rmSync(work, { recursive: true, force: true });
      mkdirSync(work, { recursive: true });
      const x = await snapshotAtAsync(p.path, [r3(t)], work, { signal: ctx.stopping?.signal });
      const made = readdirSync(work).filter((f) => /\.png$/i.test(f));
      if (x.exitCode !== 0 || !made.length) throw new HttpError(500, "STILL_FAILED", `HyperFrames could not take the still: ${x.stderrTail.join(" ").slice(-200)}`);
      const out = join(p.path, "stills");
      mkdirSync(out, { recursive: true });
      const shot = (await readShots(p.path)).shots.find((s) => s.start != null && t >= s.start && t < s.start + (s.duration ?? 0));
      let name = `${shot ? `shot-${shot.number}-` : ""}${t.toFixed(2)}s`, n = 1;
      while (existsSync(join(out, `${name}${n > 1 ? `-${n}` : ""}.png`))) n++;
      name = `${name}${n > 1 ? `-${n}` : ""}.png`;
      renameSync(join(work, made[0]), join(out, name));
      rmSync(work, { recursive: true, force: true });
      return { file: `stills/${name}`, time: r3(t) };
    }),
    // the edit card's fonts: the families this project already declares or uses, and the app's bundled set (each passed the Vietnamese
    // check), the fonts the user installed on this PC (copied into the project when used), and a Google Fonts family typed by name (fetched
    // once when it is applied)
    r("GET", `/projects/${P}/edit/fonts`, ([id]) => {
      const p = mustProject(id, root);
      const names = new Map();          // lower-case name -> name as written
      for (const f of htmlFiles(p.path)) {
        const h = readFileSync(join(p.path, f), "utf8");
        for (const [k, v] of usedFamilies(h)) names.set(k, v);
        for (const k of declaredFamilies(h)) if (!names.has(k)) names.set(k, k);
      }
      const bundled = Object.keys(fontMap()).sort((a, b) => a.localeCompare(b));
      const project = [...names].map(([k, v]) => bundled.find((b) => b.toLowerCase() === k) ?? v).sort((a, b) => a.localeCompare(b));
      let local = [], assets = [];
      try { local = listLocalFonts().map((x) => ({ family: x.family, vi: x.vi })); } catch { /* no fontkit or no folder: the list stays empty */ }
      // the font files the user added to this project (Assets: 4_fonts, or the older fonts/), usable once the card declares them
      for (const d of fontDirs(p.path)) { try { for (const x of listLocalFonts({ dir: d })) if (!assets.some((a) => a.family === x.family)) assets.push({ family: x.family, vi: x.vi }); } catch { /* skip */ } }
      return { project, bundled, local, assets };
    }),
  ] };
}

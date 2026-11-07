// Finding a sound for every cue (resolveCues: the offline library first, then the online services, then HF's set), a sound put in the film (useSound, useLibrarySound, useOwnerSound), and the placement's line for the chat.
// (audit/112a B11: one of the files packages/sfx/index.mjs was split into; index.mjs is still the package's door.)
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SUSTAINED_MIN_S, matchLocal, plainName, stepsRun, sustainedCue, sustainedQuery, sustainedStandIn, words } from "./library.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";
import { MAX_TAKES, codeFirst, codeLibrary, codeRuns, isMoworksStyle, makeCodeSounds, matchCode, retire, tierOf } from "./code.mjs";
import { patchState, readState, saveState, slug } from "./state.mjs";
import { DOWNLOAD_TIMEOUT_MS, SEARCH_TIMEOUT_MS, offTone, onlineSources, within } from "./sources.mjs";
import { MAX_AUTO_S } from "./mount.mjs";
import { bundled, matchBundled, nearBundled } from "./shipped.mjs";

/** One placement asks online for at most this many names the library only has something like, and downloads at most this many sounds: SFXMint lets one network have 20
 *  different sounds a day (past that its download answers 429), and Openverse is often down. What it does not get stays on the library's stand-in, said so. */
// how many of a placement's names the library only half answers are looked up online, and downloaded (T38b-5: 24 and 6 left 75 of a 3-minute
// film's 132 sounds on stand-ins, "bicycle pump squeak" playing a cute animal); a sound once found online stays, so a film pays this once
export const ONLINE_LOOKUPS = 120, ONLINE_DOWNLOADS = 40;

/** Use the offline library's sound for a cue name: each choice (the best and its close variants, matchLocal) copied once into
 *  assets/3_audio/sfx/<id>.ogg, shared by every name that uses it; the first is the name's sound, all of them its variants (a film's
 *  repeats of one sound vary). weak: the library only had a loose match, looked up online again the next time the search may answer. */
export function useLibrarySound(dir, name, choices, { weak = false } = {}) {
  // one sound and its own numbered takes only, never a neighbour of its family (T38b-15: a pop that appears rotated to one that drops); the
  // copies a little higher and lower give the variety (vary.mjs)
  const own = (e) => String(e?.id ?? "").replace(/-\d+$/, "");
  const list = (choices ?? []).filter((e) => e?.path && existsSync(e.path)).filter((e, _, xs) => own(e) === own(xs[0])).slice(0, 4);
  if (!list.length) return null;
  mkdirSync(join(dir, "assets", "3_audio", "sfx"), { recursive: true });
  const vs = list.map((e) => {
    const rel = `assets/3_audio/sfx/${e.id}.ogg`;
    if (!existsSync(join(dir, ...rel.split("/")))) copyFileSync(e.path, join(dir, ...rel.split("/")));
    return { id: e.id, title: e.id, family: e.family, file: rel, durationS: e.duration ?? null, lufs: e.lufs ?? null, onset: e.onset ?? 0, loop: !!e.loop, credit: e.source ?? null };
  });
  const st = readState(dir), c = vs[0].credit ?? {};
  st.sounds[name] = { ...vs[0], id: `library:${vs[0].id}`, source: "library", creator: c.author ?? "", licence: c.licence ?? "", licenceUrl: c.licenceUrl ?? null, page: c.url ?? null,
    ...(vs.length > 1 ? { variants: vs } : {}), ...(weak ? { weak: true } : {}), addedAt: new Date().toISOString() };
  saveState(dir, st);
  return st.sounds[name];
}

/** Names whose plain word ties many sounds, looked up by a narrower one (a cut's whoosh is a soft one of a second, not a 4 s thruster or a
 *  2.6 s swell that peaks after the cut). */
export const LIBRARY_QUERY = Object.freeze({ whoosh: "soft whoosh", footstep: "footstep wood", footsteps: "footstep wood", impact: "soft thud",
  rain: "steady rain", wind: "mild wind", crowd: "crowd murmur" });

/** Put one sound into the project (assets/3_audio/sfx/<name>.mp3, the user's folder layout; never over another file) and record
 *  it for this cue name. fileName: the file's name when it is not the cue's. */
export async function useSound(dir, name, item, { fetchImpl = fetch, signal, fileName = null } = {}) {
  const st = readState(dir), base = slug(fileName ?? name).slice(0, 60).replace(/-$/, "");          // a sound's title can run long; the film's paths stay short
  const taken = new Set(Object.entries(st.sounds).filter(([n]) => n !== name).map(([, s]) => s.file));
  let rel = `assets/3_audio/sfx/${base}.mp3`;
  for (let i = 2; taken.has(rel) || (existsSync(join(dir, rel)) && st.sounds[name]?.file !== rel); i++) rel = `assets/3_audio/sfx/${base}-${i}.mp3`;
  mkdirSync(join(dir, "assets", "3_audio", "sfx"), { recursive: true });
  if (item.source === "pixabay") copyFileSync(item.file, join(dir, rel));
  else {
    const r = await fetchImpl(item.url, { signal: within(signal, DOWNLOAD_TIMEOUT_MS) });
    if (r.status === 429) throw Object.assign(new Error("The sound service's download allowance for today is used"), { code: "SFX_LIMIT" });
    if (!r.ok) throw Object.assign(new Error(`Download failed (${r.status})`), { code: "SFX_DOWNLOAD" });
    const bytes = Buffer.from(await r.arrayBuffer());
    if (!bytes.length) throw Object.assign(new Error("The download was empty"), { code: "SFX_DOWNLOAD" });
    writeFileSync(join(dir, rel), bytes);
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

/** The results a cue may take by their length, best first as the service ranks them: those of at most MAX_AUTO_S, else those of unknown length; for a sustained action those
 *  that last (at least SUSTAINED_MIN_S; a longer recording is cut to the clip's length, up to half a minute), else those of unknown length. */
function fittingItems(results, name) {
  const fits = sustainedCue(name) ? (x) => x.durationS >= SUSTAINED_MIN_S && x.durationS <= 30 : (x) => x.durationS <= MAX_AUTO_S;
  const known = results.filter((x) => x.durationS != null && fits(x));
  return known.length ? known : results.filter((x) => x.durationS == null);
}

/** The share of a cue's words a result's title says. A title is what can be checked: SFXMint's `full` also reaches for a like meaning ("hurried footsteps": a chair set down). */
const titleShare = (x, name) => { const said = words(name), has = new Set(words(x.title)); return said.length ? said.filter((w) => has.has(w)).length / said.length : 1; };

/** The first that fits with the most of the cue's words in its title: { item, share }, or null. A run of steps takes only steps that last ("footsteps slowing stop" is no car
 *  skidding to a stop, and one short step is what it had). */
function closestItem(results, name) {
  let top = null;
  const steps = stepsRun(name);
  for (const item of fittingItems(results, name)) {
    if (steps && (!words(item.title).some((w) => w === "footstep" || w === "step") || item.durationS < SUSTAINED_MIN_S)) continue;
    const share = titleShare(item, name);
    if (!top || share > top.share) top = { item, share };
  }
  return top;
}

/** Find a sound for every cue that has none yet: Openverse first (the first result of at most 6 s, else one of unknown length: never a long
 *  recording, which is a bed), SFXMint when it is down or has none that fits (onlineSources), HF's bundled set when offline or nothing is found. While the search does not answer (online, but every try
 *  failed), a name that only sounds like one of the bundled set ("lamp ting": the chime) gets that sound as a stand-in, looked up again the
 *  next time the search may answer.
 *  The offline library is asked first (audit/112a D1: the one way the placement uses), for one-shots only (its ambience loops are the beds'): a name
 *  it matches well, or with a sound of the cue's own kind, never goes to the search (and an older pick of the search or of HF's set is
 *  replaced by it; the library's own picks are matched again on every placement, so a better match replaces an old one); any other name
 *  goes to the search, and when the search finds nothing or does not answer, the library's best match stands in, before HF's set (Test 26:
 *  five cues were left out while the search did not answer, and "Place them again" left them out again).
 *  A sustained action (sustainedCue: a roll, a long slide, a pour) takes only a sound that lasts: from the library when it has one, else from
 *  the search (all of its name, then the thing and its action alone), else a sound of the library that lasts as a stand-in, said so and looked
 *  up again later (Test 28: the library has no rolling sound, and fifteen marbles were short ticks that nobody was told about).
 *  A name the storyboard or the Motion Plan gives that the library only has something of the same kind for (not all its words: "bus door air hiss" a sci-fi door,
 *  "hurried footsteps" one step) is looked up online before the library's sound is settled for, the least matched first, at most ONLINE_LOOKUPS names: the result whose title
 *  says most of its words, as many as the library's sound at least, and a result without all of them is said to be a stand-in. A name the library has nothing for takes the
 *  closest the services have, said so too, before it is left out (T29-12, T29-13, T28-2). Such a name downloads at most ONLINE_DOWNLOADS sounds, the closest first and after
 *  those with nothing else, none from SFXMint once it answers 429; a sound once found online stays. No search and no download can fail a placement.
 *  style: the library's style hint; families: Map name -> family (the action's own); keep: names whose sound stays as it is (a cue of theirs the user moved).
 *  Returns { added: [names], missing: [names], offline, near: [{ name, as, lasting? }] } (near: the cues on a stand-in now; lasting: a stand-in
 *  for a sound that lasts). */
export const shorterQuery = (name) => { const ws = String(name ?? "").trim().split(/\s+/); return ws.length > 2 ? ws.slice(-2).join(" ") : null; };

export async function resolveCues(dir, cues, { fetchImpl = fetch, signal, root = APP_ROOT, online = true, timeoutMs = SEARCH_TIMEOUT_MS, style = null, families = null, keep = null, tone = false, styleId = null, code = true, exclude = null } = {}) {
  let st = readState(dir);
  const local = bundled(root), added = [], missing = [], failed = [], near = [];
  const has = (name) => !!st.sounds[name] && existsSync(join(dir, st.sounds[name].file));
  const toned = (choices) => (tone ? choices.filter((x) => !offTone(x)) : choices);
  const lib = new Map();
  const libOf = (name) => {
    if (!lib.has(name)) { let m = null; try { m = matchLocal(LIBRARY_QUERY[name] ?? name, { family: families?.get?.(name) ?? null, style, root, filmStyle: styleId, oneShot: true, exclude: exclude ?? [], minDuration: sustainedCue(name) ? SUSTAINED_MIN_S : 0 }); } catch { /* no library */ } lib.set(name, m); }
    return lib.get(name);
  };
  // the code's sounds (code.mjs) where this run asks for them: autoSfx's first pass asks for none, and a later pass only for what the
  // library, ElevenLabs and the search left (#1034, #1042); where asked, a film of the owner's styles takes the code while this computer can run it
  // code false or MW_CODE_SFX=none: no code at all (the tests of the library's and the search's own ways)
  const useCode = code !== false && process.env.MW_CODE_SFX !== "none";
  const runs = useCode ? await codeRuns(root) : false, ownStyle = useCode && isMoworksStyle(styleId) && runs;
  const codeLib = useCode ? codeLibrary({ filmStyle: styleId, root, dir, run: runs }) : null, codeM = new Map();
  const codeOf = (name) => {
    if (!codeLib) return null;
    if (!codeM.has(name)) { let m = null; try { m = matchCode(name, { filmStyle: styleId, family: families?.get?.(name) ?? null, library: codeLib }); } catch { /* no recipe */ } codeM.set(name, m && tone && offTone(m.entry) ? null : m); }
    return codeM.get(name);
  };
  const codeTakes = (name) => !!codeLib && codeFirst(codeOf(name), ownStyle ? null : libOf(name), { ownStyle });
  // the library answers well enough: a good match, or a sound of the cue's own kind (not worth waiting on the search)
  const enough = (name) => { const m = libOf(name); return !!m && (m.good || m.right); };
  // a name someone wrote (the storyboard's, the Motion Plan's: the app's own automatic names are the library's words) that the library answers only with something like it
  const written = new Set(cues.filter((c) => (c.prio ?? 0) < 2).map((c) => c.name));
  const likeOnly = (name) => written.has(name) && enough(name) && !libOf(name).exact;
  let names = [...new Set(cues.map((c) => c.name))].filter((name) => {
    if (keep?.has(name) && has(name)) return false;
    if (!has(name)) return true;
    const s = st.sounds[name];
    if (s.source === "owner") return false;
    if (s.source === "code" || codeTakes(name)) return true;          // matched again on every placement: its takes are kept in the film, made once
    if (online && (s.near || s.weak)) return true;
    if (s.source === "library") return true;
    return enough(name) && !likeOnly(name);          // a sound found online for such a name stays: never downloaded twice
  });
  let look = new Set(), coded = null;
  if (codeLib) {
    const want = names.filter(codeTakes), count = new Map(), hold = new Map();
    for (const c of cues) { count.set(c.name, (count.get(c.name) ?? 0) + 1); if (Number(c.hold) > 0) hold.set(c.name, Math.max(hold.get(c.name) ?? 0, Number(c.hold))); }
    const asks = want.map((name) => { const m = codeOf(name);
      return { name, entry: m.entry, takes: Math.min(MAX_TAKES, count.get(name) ?? 1), dur: hold.get(name) ?? null,
        why: ownStyle ? "the film style's source skill makes every sound in code" : ["", "the code's sound of its kind, as close as the library's", "the code's recipe is named for it", "the code makes this very sound"][tierOf(m)] }; });
    coded = asks.length ? await makeCodeSounds(dir, asks, { root, signal, run: runs }) : { used: new Map(), failed: [], made: 0, broken: 0, errors: [] };
    for (const n of coded.used.keys()) added.push(n);
    names = names.filter((n) => !coded.used.has(n));
    // a film of the owner's styles: a name the code has no recipe for is left out (Claude can name it otherwise, or write a recipe); one whose making failed falls back
    if (ownStyle) { for (const n of names.filter((x) => !want.includes(x))) missing.push(n); names = names.filter((x) => want.includes(x)); }
    st = readState(dir);
    // a sound made by code earlier that the code no longer gives: found again below
    const gone = names.filter((n) => st.sounds[n]?.source === "code");
    if (gone.length) st = patchState(dir, (x) => { for (const n of gone) { retire(x, x.sounds[n]); delete x.sounds[n]; } });
  }
  {
    // a pick the library would no longer give (Test 26: a plug for "thread pull", a loop of birds for "needle park") is dropped, not kept
    const stale = names.filter((name) => st.sounds[name]?.source === "library" && !enough(name) && (!st.sounds[name].weak || !libOf(name)));
    if (stale.length) st = patchState(dir, (x) => { for (const n of stale) delete x.sounds[n]; });
    if (online) look = new Set(names.filter(likeOnly).sort((a, b) => libOf(a).closeness - libOf(b).closeness).slice(0, ONLINE_LOOKUPS));
    // the library's answers: no search for them. One only like the name, past the lookups a placement makes, stands in
    names = names.filter((name) => {
      if (!enough(name) || look.has(name) || !useLibrarySound(dir, name, toned(libOf(name).choices))) return true;
      added.push(name);
      if (online && likeOnly(name)) near.push({ name, as: plainName(libOf(name).entry) });
      return false;
    });
    st = readState(dir);
  }
  // the searches run four at a time (one at a time took about 5 minutes), each tried twice, each at most SEARCH_TIMEOUT_MS; one failed
  // search no longer sends every other sound offline (the automatic pass placed 0 of 13 that way), but three searches in a row that fail
  // leave that service out for the rest of this placement (Test 24: every query hung 15-20 s, and Final Mix waited on each): SFXMint
  // answers without another wait on Openverse, and with both down the built-in sounds stand in
  const hits = new Map(), sources = onlineSources({ fetchImpl, signal, timeoutMs, closest: "any" });
  let offline = !online;
  // what the search's answer gives a name. Without all its words in the title it is a stand-in, said so. A name the library has something like takes
  // it only when it says more than the library's sound does, or as much of a good half of them, or the library's is of another kind; a run of steps takes any steps, one step
  // being none ("pen nib hatching" is no ship's hatch for one word in common). A name with nothing else takes what the service gives, unless the service itself says it is only
  // close and the title says none of its words
  const best = (h, name) => {
    const top = closestItem(tone ? h.filter((x) => !offTone(x)) : h, name);
    if (!top) return null;
    const stand = top.share < 1 ? { ...top.item, near: top.item.title } : top.item;
    if (!look.has(name)) return top.item.fit === "closest" ? (top.share > 0 ? stand : null) : top.item;
    const share = Math.round(top.share * 100) / 100, lib = libOf(name);
    return share > 0 && (stepsRun(name) || share > lib.closeness || (share === lib.closeness && (share >= 0.5 || !lib.right))) ? stand : null;
  };
  // an answer the service gives is the one to keep when one of the results that can serve a cue (fittingItems: its length) says all of the
  // name: a 60 s recording with the right title is no answer, and the next service is asked (it stopped the search, and the cue went missing)
  const exactly = (h, name) => fittingItems(h, name).some((x) => titleShare(x, name) === 1);
  const one = async (query, name) => {
    for (let k = 0; k < 2 && !offline; k++) {
      const h = await sources.find(query, { limit: 10, useful: (x) => exactly(x, name) });
      if (h) return h;
      if (sources.down()) offline = true;
    }
    return null;
  };
  if (!offline) {
    const queue = [...names];
    await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (queue.length && !offline) {
        const n = queue.shift();
        let h = await one(n, n);
        // nothing that lasts for all of a sustained cue's name ("marble rolling long brass rail"): the thing and its action; nothing for a run of steps: steps
        const q = h && !best(h, n) ? (sustainedCue(n) ? sustainedQuery(n) : stepsRun(n) ? "footsteps" : null) : null;
        if (q && q !== n) h = [...((await one(q, n)) ?? []), ...h];
        // nothing for all of its words: the words that name the sound ("big fan whirr": "fan whirr", T36-9: left out even with the search answering)
        const short = h && !best(h, n) ? shorterQuery(n) : null;
        if (short) h = [...((await one(short, n)) ?? []), ...h];
        hits.set(n, h);
      }
    }));
  }
  // a stand-in for a name the search could not look up (online, and it gave no answer); none in the bundled-only pass (online false)
  const standIn = (name) => { const b = nearBundled(name, local); return b ? { ...b, near: b.title } : null; };
  let downloads = 0, limited = false;
  const held = new Set();          // names whose download this placement could not make
  const closeOf = (name) => { const h = hits.get(name); return look.has(name) && h ? closestItem(h, name)?.share ?? 0 : 2; };          // a name with nothing else first, then the closest
  for (const name of [...names].sort((a, b) => closeOf(b) - closeOf(a))) {
    const h = hits.get(name) ?? null;          // null: the search failed or never ran (offline); []: it answered with nothing
    let item = h ? best(h, name) : null;
    // the same sound found again: it stays, no second download
    if (item && has(name) && st.sounds[name].id === item.id) { added.push(name); if (item.near) near.push({ name, as: item.near }); continue; }
    if (item && ((look.has(name) && downloads >= ONLINE_DOWNLOADS) || (limited && item.source === "sfxmint"))) { item = null; held.add(name); }
    // the library's best match before HF's set; while the search had no answer, or it is not the name's own sound, it stands in (said so), looked up online again later
    const m = libOf(name), unanswered = online && !h;
    if (!item && m && useLibrarySound(dir, name, toned(m.choices), { weak: h == null })) { added.push(name); if (online) near.push({ name, as: plainName(m.entry) }); continue; }
    // a sound that lasts, or a stand-in that lasts: never HF's ticks and pings for it, and never left out while a stand-in can sound
    if (!item && sustainedCue(name)) {
      const stand = sustainedStandIn(name, { root });
      if (stand.length && useLibrarySound(dir, name, stand, { weak: true })) { added.push(name); near.push({ name, as: plainName(stand[0]), lasting: true }); continue; }
      missing.push(name); if (unanswered) failed.push(name);
      continue;
    }
    item ??= matchBundled(name, local);
    // a stand-in already in use stays until the search finds the sound itself
    if (!item && has(name)) { near.push({ name, as: st.sounds[name].near }); continue; }
    if (!item && (unanswered || held.has(name))) item = standIn(name);
    // its search failed, or today's downloads are used: said apart from a name the search found nothing for
    if (!item) { missing.push(name); if (unanswered || held.has(name)) failed.push(name); continue; }
    try { if (item.source !== "pixabay") downloads++; await useSound(dir, name, item, { fetchImpl, signal }); added.push(name); if (item.near) near.push({ name, as: item.near }); }
    catch (e) {
      if (signal?.aborted) throw e;
      if (e.code === "SFX_LIMIT") limited = true;
      // a failed download: the library's sound like it, the offline sound of that name, else one that sounds like it
      if (m && useLibrarySound(dir, name, m.choices, { weak: true })) { added.push(name); near.push({ name, as: plainName(m.entry) }); continue; }
      const b = item.source !== "pixabay" ? matchBundled(name, local) ?? standIn(name) : null;
      if (b) { await useSound(dir, name, b); added.push(name); if (b.near) near.push({ name, as: b.near }); } else { missing.push(name); failed.push(name); }
    }
  }
  // why each sound came from where it did (code.mjs: the code's own reason is on its record already)
  if (codeLib && added.length) patchState(dir, (x) => { for (const n of added) { const s = x.sounds[n]; if (s && !s.why) s.why = s.source === "library" ? (codeOf(n) ? "the library's sound is closer than the code's" : "the code has no recipe for it")
    : s.source === "owner" ? null : "neither the code nor the library has it"; } });
  // offline: no search answered at all (the bundled sounds were the only source)
  return { added, missing, failed, near, offline: offline || (online && names.length > 0 && [...hits.values()].every((h) => h == null)),
    code: coded ? { runs, ownStyle, names: [...coded.used.keys()], made: coded.made, broken: coded.broken, errors: coded.errors.length } : null };
}

/** Final Mix's line about a placement, for the chat: what was placed, which named sounds use a stand-in and which could not be found
 *  (the search did not answer, or found nothing), in plain words with no paths. A sound left out or on a stand-in makes it a warning, which
 *  the chat always shows (Test 20: "placed 6 (pop, typing, whoosh)" and seven named sounds gone without a word). { text, vars, status? } */
export function placedNote(res) {
  const quote = (xs) => xs.map((x) => `"${x}"`).join(", ");
  const heard = (res.near ?? []).filter((x) => !res.names || res.names.includes(x.name));
  const near = heard.filter((x) => !x.lasting), lasting = heard.filter((x) => x.lasting);
  const some = (xs, max = 10) => (xs.length > max ? `${xs.slice(0, max).join(", ")} and ${xs.length - max} more` : xs.join(", "));
  const failed = (res.missing ?? []).filter((m) => (res.failed ?? []).includes(m)), none = (res.missing ?? []).filter((m) => !failed.includes(m));
  if (res.silent === "song") return { text: "No sound effects placed: this film is made for its song, so the song is what is heard. Tell Claude if you want some." };
  if (res.silent) return { text: "No sound effects placed: {why} asks for none", vars: { why: res.silent === "owner" ? "your choice" : res.silent === "style" ? "the film style's sound" : "the brief" } };
  const names = res.names ?? [], shown = names.length > 12 ? `${names.slice(0, 12).join(", ")} and ${names.length - 12} more` : names.join(", ");
  const parts = [`Sound effects placed by the app: {n} ({names})${res.ambience ? ", with an ambience bed under {beds} place(s)" : ""}`];
  const vars = { n: res.placed ?? 0, names: names.length ? shown : "none", ...(res.ambience ? { beds: res.ambience } : {}) };
  // who chose (owner #1096): Claude's picks of the library, the sounds made with ElevenLabs and the credits' seconds they took, and why making stopped
  const pk = res.picks ?? null;
  if (pk?.picked?.length) { parts.push("Claude picked {picked} of the library's sounds for their moments"); vars.picked = pk.picked.length; }
  if (pk?.made?.length) { parts.push("Made with ElevenLabs Sound Effects: {made} ({secs} s of your credits)"); vars.made = pk.made.length; vars.secs = Math.round((res.madeSeconds ?? 0) * 10) / 10; }
  if (res.makeStopped) { parts.push("No more sounds were made: {stop}"); vars.stop = res.makeStopped; }
  if (near.length) { parts.push("A close sound stands in for now: {near}"); vars.near = some(near.map((x) => `"${x.name}" (${x.as})`)); }
  // said plainly, name by name: these are not the sound the film asks for (Test 28: fifteen marbles were ticks and the note only said "close")
  if (lasting.length) { parts.push("The app has no such sound of its own and the sound search found none, so these are stand-ins, not the real sound: {lasting}. Press Place them again in Final Mix to search again, or add your own"); vars.lasting = lasting.map((x) => `"${x.name}" plays ${x.as}`).join(", "); }
  if (failed.length) { parts.push("Left out because the sound search did not answer: {failed}. Press Place them again in Final Mix later"); vars.failed = quote(failed); }
  if (none.length) { parts.push("No sound found for {missing}: ask Claude for other names"); vars.missing = quote(none); }
  const warn = near.length || lasting.length || failed.length || none.length || res.makeStopped;
  return parts.length > 1 ? { text: `${parts.join(". ")}.`, vars, ...(warn ? { status: "warning" } : {}) } : { text: parts[0], vars };
}

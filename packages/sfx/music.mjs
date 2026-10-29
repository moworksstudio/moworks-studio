// Music for the Final Mix: Claude looks on mixkit.co for tracks that fit the brief (the web, asked first per
// project) and hands the app three; the app downloads them into the project (audio/music-options/R<n>/), measures them, and the user
// listens in the Final Mix dialog, picks one (the app puts it on the timeline, measures its beats, credits it) or asks for three others.
// Only Mixkit's own hosts are downloaded from. Mixkit's free music (mixkit.co/free-stock-music, read 18/10/2026): royalty free, online use
// (YouTube, social, websites, podcasts, online ads), attribution appreciated not required; NOT in CDs, DVDs, video games or TV & radio
// broadcasts. The app says so wherever a track is chosen and in the credit.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { probe } from "../voice/audio.mjs";
import { slug } from "./index.mjs";

export const LICENCE = { name: "Mixkit Stock Music Free License", url: "https://mixkit.co/license/#musicFree",
  limits: "online use only: not for TV or radio broadcast, CDs, DVDs or video games" };
const HOST = /^https:\/\/([a-z0-9-]+\.)*mixkit\.co\//i;
const MAX = 40 * 1024 * 1024;
const file = (dir) => join(dir, ".moworks", "music-options.json");
export const readOptions = (dir) => { try { return JSON.parse(readFileSync(file(dir), "utf8")); } catch { return { rounds: [] }; } };

/** Download up to 3 tracks: [{ title, artist?, page?, url }] → the new round { id, at, tracks: [{ …, file, duration }], failed }. */
export async function saveOptions(dir, tracks, { fetchImpl = fetch, signal = null, root } = {}) {
  const st = readOptions(dir);
  const id = `R${st.rounds.length + 1}`;
  const out = { id, at: new Date().toISOString(), tracks: [], failed: [] };
  const rel = `audio/music-options/${id}`;
  mkdirSync(join(dir, ...rel.split("/")), { recursive: true });
  for (const [i, t] of (tracks ?? []).slice(0, 3).entries()) {
    const url = String(t?.url ?? "");
    if (!HOST.test(url) || !/\.(mp3|m4a|wav|ogg)(\?|$)/i.test(url)) { out.failed.push({ title: t?.title ?? url, why: "not a Mixkit audio file link (https://…mixkit.co/…mp3)" }); continue; }
    try {
      const r = await fetchImpl(url, { signal });
      if (!r.ok) throw new Error(`download failed (${r.status})`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > MAX || buf.length < 1000) throw new Error("not a usable audio file");
      const ext = (/\.(mp3|m4a|wav|ogg)(\?|$)/i.exec(url)[1] ?? "mp3").toLowerCase();
      const name = `${rel}/${i + 1}-${slug(t.title ?? "track").slice(0, 50)}.${ext}`;
      writeFileSync(join(dir, ...name.split("/")), buf);
      let duration = null;
      try { duration = (await probe(join(dir, ...name.split("/")), root)).duration; } catch { /* still listenable */ }
      out.tracks.push({ title: String(t.title ?? "").slice(0, 120), artist: String(t.artist ?? "").slice(0, 120) || null, page: /^https:\/\//.test(t.page ?? "") ? t.page : null, url, file: name, duration, licence: LICENCE.name, licenceUrl: LICENCE.url });
    } catch (e) { if (signal?.aborted) throw e; out.failed.push({ title: t?.title ?? url, why: e.message }); }
  }
  st.rounds.push(out);
  mkdirSync(join(dir, ".moworks"), { recursive: true });
  writeFileSync(file(dir), JSON.stringify(st, null, 2));
  return out;
}

/** CREDITS.md: a "Music" section for the track on the timeline (other sections kept). */
export function creditMusic(dir, track) {
  const f = join(dir, "CREDITS.md");
  const body = track ? `- **${track.title}**${track.artist ? ` by ${track.artist}` : ""} (\`${track.file}\`), ${track.licence ?? LICENCE.name} (${track.licenceUrl ?? LICENCE.url}; ${LICENCE.limits}).${track.page ? ` Source: ${track.page}` : ""}` : "None.";
  const section = `<!-- mw:music-credits -->\n## Music\n\n${body}\n<!-- /mw:music-credits -->`;
  const old = existsSync(f) ? readFileSync(f, "utf8") : "# Credits\n";
  const re = /<!-- mw:music-credits -->[\s\S]*?<!-- \/mw:music-credits -->/;
  writeFileSync(f, re.test(old) ? old.replace(re, section) : `${old.trimEnd()}\n\n${section}\n`);
}

/** The text Claude reads after handing tracks over. In the music step the app, when the turn ends, puts track 1 on the timeline (a film
 *  with no music yet: `placeMusic`) and places the sound effects (`placeSfx`), as the user takes it (the picked track and the
 *  sound effects). It once said "the user picks one" while the app put track 1 and 8 sound effects in the film, and
 *  Claude told the user to choose; now Claude is told what the film will have, so its words and the film agree. */
export function optionsText(round, { placeMusic = false, placeSfx = false, placedNow = false, stopAt = null } = {}) {
  const sfx = placeSfx ? " and places the sound effects" : "";
  // the Motion Plan's stop at the twist is the app's to apply; Claude says it, never sends the user to the Final Mix for it
  const stop = stopAt ? ` It stops the music at ${stopAt} s, as the Motion Plan says: say so; never ask the owner to set it.` : "";
  const end = !round.tracks.length ? "None could be saved: give direct https://assets.mixkit.co/… .mp3 links (the preview link on each track page)."
    // before the build the Final Mix is closed: track 1 is on the timeline already; never send the user to the Final Mix to listen first
    : placedNow ? `Track 1 ("${round.tracks[0].title}") is on the timeline now as the film's music, its beats measured: the owner plays it on the Editor's MUSIC lane or in the Music map. Say that plainly. The other tracks wait in the Final Mix, which opens after the build: the owner can switch there, or ask you now for three others. Do not say the owner listens in the Final Mix before the build.${stop}`
    : placeMusic ? `Stop here. When your turn ends the app puts track 1 ("${round.tracks[0].title}") on the timeline as the film's music${sfx}. Say that plainly: track 1 is the film's music now${placeSfx ? " and the app adds the sound effects" : ""}; the owner can listen to the others and change it in the Final Mix, or ask for three others. Do not ask the owner to choose first.${stop}`
    : `Stop here. The film keeps the music it has${placeSfx ? "; when your turn ends the app places the sound effects" : ""}. Say that plainly: the owner listens to these in the Final Mix and picks one there if they want it instead, or asks for three others.`;
  return [`Round ${round.id}: ${round.tracks.length} track(s) saved${placedNow ? "" : " for the owner to listen to in the Final Mix dialog"}.`,
    ...round.tracks.map((t, i) => `${i + 1}. "${t.title}"${t.artist ? ` by ${t.artist}` : ""}: ${t.file}, ${t.duration ?? "?"} s`),
    ...round.failed.map((f) => `- not saved: ${f.title} (${f.why})`), end].join("\n");
}

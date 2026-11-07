// The sound effects' credits: one line a sound (its title, author, page, licence, the date read), written into docs/CREDITS.md (project-service/credits.mjs).
// (audit/112a B11: one of the files packages/sfx/index.mjs was split into; index.mjs is still the package's door.)
import { writeCreditSection } from "../project-service/credits.mjs";
import { ADDED, addedNow, readState } from "./state.mjs";

/** One credit line. A Pixabay sound is one of the set HyperFrames bundles in its media-use skill: HF does not record the sound's own Pixabay
 *  page, so the line says so and links the exact file at the pinned HF commit instead of a generic Pixabay link. A sound of the app's
 *  library is credited from its catalog source (CC0 and public domain need none; it is listed all the same). */
export function creditLine(s) {
  if (s.source === "pixabay") return `"${s.title}", from the Pixabay sound set that HyperFrames bundles in its media-use skill (Pixabay Content License, ${s.licenceUrl}); HyperFrames does not record the sound's own Pixabay page. File: ${String(s.via ?? "").replace(/^.*?(https:\/\/\S+)$/, "$1")}`;
  if (s.source === "owner") return s.attribution;
  // made by code for this film (code.mjs): the recipe and the owner's code it came from
  if (s.source === "code") { const c = s.credit ?? {}; return `"${s.title}", Moworks Studio, made by code from the owner's synthesis (${c.name ?? "the app's sound recipes"}), ${c.licence ?? "the owner's own"}${c.how ? `; ${c.how}` : ""}.`; }
  if (s.source === "library") {
    const c = s.credit ?? {};
    return `"${s.title}", from ${c.name ?? "the app's sound library"} by ${c.author ?? s.creator ?? "unknown"}, ${c.licence ?? s.licence}${c.licenceUrl ? ` (${c.licenceUrl})` : ""}. Source: ${c.url ?? s.page ?? ""}${c.file ? `; original file: ${c.file}` : ""}${c.how ? `; ${c.how}` : ""}.`;
  }
  const read = s.read ?? String(s.addedAt ?? "").slice(0, 10);
  return `${s.attribution ?? `"${s.title}" by ${s.creator}, ${s.licence}`}${s.page ? ` Source: ${s.page}` : ""}${read ? ` (read ${read})` : ""}`;
}

/** CREDITS.md: a "Sound effects" section for the sounds in use, one line a file (a sound's variants each), the ambience beds too (other
 *  content of the file is kept). */
export function writeCredits(dir) {
  const st = readState(dir);
  const rows = new Map(), copies = new Map();
  const add = (name, file) => {
    const s = st.sounds[name];
    if (!s) return;
    const v = (s.variants ?? []).find((x) => x.file === file), rec = v ? { ...s, ...v } : s;
    const key = v?.of ?? rec.file;          // a copy a little higher or lower (vary.mjs) is credited once, as its original
    if (!rows.has(key)) rows.set(key, [name, v?.of ? { ...rec, file: v.of } : rec]);
    if (v?.of) copies.set(key, new Set([...(copies.get(key) ?? []), v.file]));
  };
  for (const m of st.mounted ?? []) add(m.name, m.file);
  for (const a of st.ambience?.placed ?? []) add(a.name, a.file);
  for (const a of addedNow(dir)) add(a.name, a.file);
  const body = [...rows.entries()].map(([k, [n, s]]) => { const cp = [...(copies.get(k) ?? [])].sort();
    return `- **${n.startsWith(ADDED) ? s.title : n}** (\`${s.file}\`${cp.length ? `, also played a little higher or lower as ${cp.map((x) => `\`${x}\``).join(", ")}` : ""}): ${creditLine(s)}`; });
  writeCreditSection(dir, "sfx", `## Sound effects\n\n${body.length ? body.join("\n") : "None."}`);          // project-service/credits.mjs
  return rows.size;
}

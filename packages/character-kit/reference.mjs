// A saved character in a film whose style has no character layer (General, HyperFrames, Lemo, mg, anidoodle): the app copies its
// poster, model sheets and description into the film as a reference (assets/_app/characters/<id>/), and Claude draws the character in that
// film's own design, keeping its shape and key colours. A Brush cartoon film takes it as a definition instead (useCharacters, CHARACTERS.json).
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";
import { characterFile, getCharacter, humanCharacters, humanFolder } from "./index.mjs";

export const REF_DIR = "assets/_app/characters";

/** A character any film may take as a reference: a selectable one of the character layer, or an anidoodle human, the user's or the app's (its
 *  poster and its sheets in each hand). { c, file: (picture) => its path or null, pictures } or null. */
function referenceOf(id, root) {
  const k = getCharacter(id, root);
  if (k?.selectable) return { c: k, file: (f) => characterFile(k.id, f, root), pictures: ["poster.webp", "views.webp", "emotions.webp", "sheets/views.png", "sheets/emotions.png"] };
  const h = humanCharacters(root).find((x) => x.id === id);
  if (!h) return null;
  const src = humanFolder(h.id, root);
  return { c: h, file: (f) => { const p = join(src, ...f.split("/")); return existsSync(p) ? p : null; },
    pictures: ["poster.webp", ...(existsSync(src) ? readdirSync(src).filter((n) => /^sheet(-[a-z]+)?\.webp$/.test(n)).sort() : [])] };
}

/** Copy each character's reference into the film. Returns the ids staged (a missing or demo-only character is skipped). */
export function stageReference(projectDir, ids, root = APP_ROOT) {
  const out = [];
  for (const id of ids ?? []) {
    const r = referenceOf(String(id), root);
    if (!r) continue;
    const { c } = r, dest = join(projectDir, ...REF_DIR.split("/"), c.id);
    mkdirSync(dest, { recursive: true });
    const files = [];
    for (const f of r.pictures) {
      const from = r.file(f);
      if (!from) continue;
      const to = f.replace("sheets/", "sheet-");
      cpSync(from, join(dest, to)); files.push(to);
    }
    const colors = Object.entries(c.colors ?? {}).map(([k, v]) => `${k} ${v}`).join(", ");
    writeFileSync(join(dest, "CHARACTER.md"), [
      `# ${c.name ?? c.id}`, "",
      c.about ? `${c.about}` : "", "",
      colors ? `Key colours: ${colors}.` : "",
      `Pictures here: ${files.join(", ") || "none"}.`, "",
      "The owner's saved character, given to this film as a reference (Moworks Studio). This film's style has no character layer: draw the",
      "character in the film's own design (its Brand Kit, type, colours and motion), keeping its silhouette, its distinguishing features and its key",
      "colours, so it is recognisably the same character. Never ask the owner to add it from the library: it is already here.", "",
    ].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n"));
    out.push(c.id);
  }
  return out;
}

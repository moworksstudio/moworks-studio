// The film's design as the New project dialog chose it: Style → Look. The app writes it into the project when the project is made,
// so Claude reads it before the brief and never makes it up again:
//   a Look   frame.md: the Look's FRAME.md as it is (HyperFrames' frame preset, or the user's Look at its version); Claude never
//            changes it.
//   Free     nothing: the design is Claude's.
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";

const pick = (x) => (x?.id ? { id: String(x.id), ...(x.title ? { title: String(x.title) } : {}) } : null);

/** What the project takes from the dialog. A style that turns design off (catalog `look: false`: Slideshow and the author styles, whose
 *  own rules set colours and type) takes none; the old `design` field is read as the Look. */
export function designChoice(input = {}, { locked = false } = {}) {
  if (locked) return { look: null };
  return { look: pick(input.look ?? input.design) };
}

const hash = (t) => createHash("sha256").update(t).digest("hex").slice(0, 16);

/** Write frame.md for the choice; returns the metadata: { look } (null when not chosen). */
export async function writeDesign(dir, choice, { root = APP_ROOT, now = new Date().toISOString() } = {}) {
  if (!choice.look) return { look: null };
  // imported here: the looks library reads the project service's work root
  const lib = await import("../looks-library/index.mjs");
  const fr = (() => { try { return lib.lookFrame(choice.look.id, root); } catch { return null; } })();
  const look = { id: choice.look.id, title: fr?.title ?? choice.look.title ?? choice.look.id };
  if (fr?.text) {
    const text = fr.text.replace(/\s*$/, "\n");
    writeFileSync(join(dir, "frame.md"), text);
    Object.assign(look, { version: fr.version ?? null, hash: hash(text), frame: { at: now } });
  }
  return { look };
}

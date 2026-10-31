// The film's design as the New project dialog chose it: Style → Look. The app writes it into the project when the project is made,
// so Claude reads it before the brief and never makes it up again:
//   a Look   frame.md: the Look's FRAME.md as it is (HyperFrames' frame preset, or the user's Look at its version); Claude never
//            changes it. The user's Look also brings its logos (assets/1_design/images/brand-kit/) and fonts (assets/1_design/fonts/<family>/,
//            declared in index.html): the film's own copies, a change to the kit later never reaches them.
//   Free     nothing: the design is Claude's.
//   Asked    a Brand Kit chosen for a style with its author's design: kept in meta.brandKitAsk (its spec, logos and fonts in
//            .moworks/brand-kit/), never applied; Prepare asks how to use it.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
    try { lib.placeKit(choice.look.id, dir, { root, now }); } catch (e) { console.error(`[brand kit] logos and fonts not copied: ${e.message}`); }
  }
  return { look };
}

/** Where the Brand Kit asked about is kept: a reference for Prepare, never the film's design (frame.md). */
export const ASKED_KIT_FILE = ".moworks/brand-kit/FRAME.md";
/** A Brand Kit chosen in New project for a film style with its author's design: it is not applied (the author's design is the
 *  film's), and it is not dropped either: it is recorded, with its spec copied as a reference, so Prepare asks how to use it
 *  (house rules §2b). Returns { id, title, version?, file?, at } (null when none was chosen). */
export async function keepAskedKit(dir, choice, { root = APP_ROOT, now = new Date().toISOString() } = {}) {
  const kit = pick(choice);
  if (!kit) return null;
  const lib = await import("../looks-library/index.mjs");
  const fr = (() => { try { return lib.lookFrame(kit.id, root); } catch { return null; } })();
  const out = { id: kit.id, title: fr?.title ?? kit.title ?? null, at: now };
  if (fr?.text) {
    const file = join(dir, ...ASKED_KIT_FILE.split("/"));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, fr.text.replace(/\s*$/, "\n"));
    Object.assign(out, { version: fr.version ?? null, file: ASKED_KIT_FILE });
    // its logos and fonts wait beside the spec: "only its logo" is one of Prepare's choices
    let placed = null; try { placed = lib.placeKit(kit.id, dir, { root, now, asked: true }); } catch (e) { console.error(`[brand kit] logos and fonts not copied: ${e.message}`); }
    if (placed?.logos.length || placed?.fonts.length) out.files = { logos: placed.logos, fonts: placed.fonts };
  }
  return out;
}

// Edit session on one composition file through @hyperframes/sdk (open / edit / undo / save).
// Moworks rules on top of the SDK: text is set on leaf elements only (setText on a container replaces its children),
// and elements are addressed by their authored id attribute.
import { readFileSync } from "node:fs";
import { loadHf } from "./load.mjs";

export class LeafOnlyError extends Error {
  constructor(id) { super(`#${id} has child elements; set text on a leaf element instead`); this.name = "LeafOnlyError"; }
}

export async function openFile(projectDir, file = "index.html", { version = null } = {}) {
  const hf = await loadHf(version);
  const html = readFileSync(`${projectDir}/${file}`, "utf8");
  const comp = await hf.sdk.openComposition(html, { persist: hf.fs.createFsAdapter({ root: projectDir }), persistPath: file });
  const flat = (list) => list.flatMap((e) => [e, ...flat(e.children ?? [])]);
  const byId = (id) => {
    const el = flat(comp.getRootElements()).find((e) => e.attributes?.id === id);
    if (!el) throw new Error(`no element with id="${id}" in ${file}`);
    return el;
  };
  return {
    hfVersion: hf.version,
    elements: () => flat(comp.getRootElements()),
    setText(id, value) {
      const el = byId(id);
      if ((el.children ?? []).length) throw new LeafOnlyError(id);
      comp.setText(el.id, value);
    },
    setStyle(id, styles) { comp.setStyle(byId(id).id, styles); },
    setTiming(id, timing) { comp.setTiming(byId(id).id, timing); },
    addTween(id, tween) { return comp.addGsapTween(byId(id).id, tween); },
    undo() { comp.undo(); },
    redo() { comp.redo(); },
    canUndo: () => comp.canUndo(),
    serialize: () => comp.serialize(),
    async save() { await comp.flush(); },
    close() { comp.dispose(); },
  };
}

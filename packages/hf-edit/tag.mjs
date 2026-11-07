// One reader and one writer for the attributes of a tag on the film's page (audit/112a B5: six copies, two kinds; the kind that dropped a
// name with no value would have lost a clip's `loop` or `muted` when the voice fit or Balance again wrote the tag back). Values stay as the
// page has them (entities such as &quot; untouched); a name with no value reads "" and is written back as name="" (the same to a browser).

const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*"([^"]*)")?/g;

/** The attributes of a tag (`<audio …>`, or only its inside: ` id="x" loop`), in their order: { name: value }. */
export function attrsOf(tag) {
  const body = String(tag ?? "").replace(/^\s*<\s*[a-zA-Z][-a-zA-Z0-9]*/, "").replace(/\/?\s*>[\s\S]*$/, "");
  return Object.fromEntries([...body.matchAll(ATTR)].map((m) => [m[1], m[2] ?? ""]));
}

/** An `<audio>` tag from its attributes (close: with its `</audio>`). */
export const audioLine = (a, { close = false } = {}) => `<audio ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}>${close ? "</audio>" : ""}`;

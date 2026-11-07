// Where a film style id comes from (audit/112 2.7): the id rules every reader wrote again, once. Pure, imports nothing.
/** { family: "lemo" | "mg" | "anidoodle" | "hf" | "general" | "map" | "brush" | "what-if" | "other", slug } (slug: the source's own name: a
 *  Lemo-Opuscar slug, an mg-styles-15 id, an anidoodle medium, a HyperFrames film type). The owner's six styles are "other" here: their
 *  list is moworks-styles' (isMoworksStyle). */
export function styleFamily(id) {
  const s = String(id ?? "");
  let m;
  if ((m = /^lemo-([a-z0-9-]+)$/.exec(s))) return { family: "lemo", slug: m[1] };
  if ((m = /^mg-(\d\d-[a-z0-9-]+)$/.exec(s))) return { family: "mg", slug: m[1] };
  if ((m = /^anidoodle-([A-Za-z0-9]+)$/.exec(s))) return { family: "anidoodle", slug: m[1] };
  if ((m = /^hf-([a-z0-9]+)$/.exec(s))) return { family: "hf", slug: m[1] };
  const own = { general: "general", "map-explainer": "map", "brush-cartoon": "brush", "what-if": "what-if" }[s];
  return own ? { family: own, slug: null } : { family: "other", slug: null };
}

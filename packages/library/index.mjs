// The library as the user arranges it: author first, then the kinds that author has, then categories.
//   HyperFrames  Motions = HF registry components, Blocks = HF registry blocks, Looks = the hyperframes skill's frame presets
//   Magic UI, Codrops, TakayuStudio: the library intake (packages/intake-library): each item written as a HyperFrames component
//   Shohei Ohtaki: Vocabulary (packages/vocab-library): Motion Prompt's names and numbers, words for Claude
// The Moworks Motion kit's motion group (100 items: the studio's own, anime.js, iart.ai, claude-animation and 18 copies of HF skill templates) was
// removed. Kinds stay apart (video styles / looks vs motions vs blocks);
// the API answers one list with three facets: authors, kinds, categories.
import { APP_ROOT } from "../version-manager/index.mjs";
import * as blocks from "../blocks-library/index.mjs";
import * as looks from "../looks-library/index.mjs";
import * as intake from "../intake-library/index.mjs";
import * as vocab from "../vocab-library/index.mjs";

export const KINDS = { motion: "Motions", block: "Blocks", look: "Looks", vocab: "Vocabulary" };
const KIND_ORDER = ["motion", "block", "look", "vocab"];

/** A reference to an item of the removed Moworks Motion kit ("kit:text/land-in", or an older plain kit id with no author prefix) that an old
 *  Motion Plan or favourite may still carry: said as "no longer in the library", never as an error. */
export const isRetired = (ref) => /^kit:/.test(String(ref ?? ""));

let cache = null;
/** Every item as a card: { uid, origin, kind, author, category, title, sub, desc, poster, video, vi, viFamilies, credit, previewNote }. */
export function all(root = APP_ROOT) {
  const bs = blocks.currentStore(root), ls = looks.currentStore(root), is = intake.currentStore(root), vs = vocab.currentStore(root);
  const key = [bs?.dir, ls?.dir ?? "clone", is?.dir, is?.manifest?.builtAt, intake.items(root).length, vs?.dir, vs?.manifest?.builtAt].join("|");
  if (cache?.key === key) return cache.list;
  const hfItems = blocks.items(root);
  const list = [];
  for (const it of hfItems) {
    list.push({ uid: `hf:${it.id}`, origin: "hf", id: it.id, kind: it.kind === "component" ? "motion" : "block", author: it.collection, category: it.category,
      title: it.title, sub: it.kind === "component" ? "HyperFrames component" : "", desc: it.description, poster: it.preview?.poster ? `/media/blocks/${it.preview.poster}` : null,
      video: it.preview?.video ? `/media/blocks/${it.preview.video}` : null, vi: it.vi?.status ?? null, viFamilies: (it.vi?.families ?? []).filter((f) => f.vi !== true).map((f) => f.family),
      credit: it.credit, previewNote: it.preview?.source === "rendered" ? "Preview rendered here the way HyperFrames makes its own" : null, tags: it.tags });
  }
  for (const it of looks.items(root)) {
    list.push({ uid: `look:${it.id}`, origin: "look", id: it.id, kind: "look", author: "HyperFrames", category: it.category, title: it.title,
      sub: it.category.replace(/s$/, ""), desc: it.description, poster: it.preview?.poster ? `/media/looks/${it.preview.poster}` : null,
      video: it.preview?.video ? `/media/looks/${it.preview.video}` : null, vi: it.vi?.status ?? null, viFamilies: (it.vi?.families ?? []).filter((f) => f.vi !== true).map((f) => f.family),
      credit: it.credit, previewNote: it.preview?.method ? `Preview: ${it.preview.method}` : null, tags: [it.kind, ...(it.fonts ?? [])], colors: it.colors?.slice(0, 8) ?? [] });
  }
  for (const it of intake.items(root)) {        // the intake: one author each (Magic UI, Codrops, TakayuStudio)
    const third = (it.thirdParty ?? []).map((t) => `${t.name} (${t.licence})`).join("; ");
    list.push({ uid: it.uid, origin: "intake", id: it.uid, kind: it.kind, author: it.collection, category: it.category, title: it.title, sub: it.sub, desc: it.desc,
      poster: it.preview?.poster ? `/media/intake/${it.preview.poster}` : null, video: it.preview?.video ? `/media/intake/${it.preview.video}` : null, vi: it.vi === "no-text" ? null : it.vi,
      viFamilies: [], credit: it.credit, previewNote: [it.preview ? "Preview rendered here as a film (the export checks passed)" : "No preview yet", third ? `Uses ${third}` : ""].filter(Boolean).join(". "),
      tags: it.tags, deletable: true });
  }
  for (const it of vocab.items(root)) {        // Vocabulary: Motion Prompt's names and numbers, a fourth type under its author; words for Claude, not runnable motions
    // its card's picture and film, rendered here from the author's own Canvas sample (vocab-library/previews.mjs); the sample stays to play live
    const pv = vocab.previewOf(it, root);
    list.push({ uid: it.uid, origin: "vocab", id: it.id, kind: "vocab", author: it.credit.collection, category: it.category, title: it.title, sub: it.packTitle?.en ?? "",
      desc: `${it.meaning.en}. ${it.summary.en}`, poster: pv ? `/media/vocab/previews/${pv.poster}` : null, video: pv ? `/media/vocab/previews/${pv.video}` : null,
      canvas: { page: `/media/vocab/${it.id}.html`, w: it.width, h: it.height, cycle: it.cycle },
      vi: null, viFamilies: [], credit: it.credit, previewNote: pv ? "Preview rendered here as a film from the author's own Canvas sample (the export checks passed)" : "The author's own Canvas sample, played live",
      tags: [it.pack, ...(it.tags ?? [])], note: it.studioNote ?? null });
  }
  const authorRank = (a) => (a === "HyperFrames" ? 0 : a === "Moworks" ? 1 : 2);
  list.sort((a, b) => authorRank(a.author) - authorRank(b.author) || a.author.localeCompare(b.author)
    || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.title.localeCompare(b.title));
  cache = { key, list };
  return list;
}

const count = (arr, f) => { const o = {}; for (const x of arr) o[f(x)] = (o[f(x)] ?? 0) + 1; return o; };

/** One page and the three facets: authors (whole library), kinds (within the author), categories (within author and kind). `kinds`: only
 *  these kinds at all (the Motion Library shows motions and blocks; HyperFrames' Looks have their own page). */
export function search({ q = "", author = "all", kind = "all", category = "all", ids = null, offset = 0, limit = 12, kinds = null } = {}, root = APP_ROOT) {
  const words = String(q).toLowerCase().normalize("NFC").split(/\s+/).filter(Boolean);
  const list0 = all(root).filter((x) => !kinds || kinds.includes(x.kind));
  const byAuthor = list0.filter((x) => author === "all" || x.author === author);
  const byKind = byAuthor.filter((x) => kind === "all" || x.kind === kind);
  let list = byKind.filter((x) => (category === "all" || x.category === category) && (!ids || ids.includes(x.uid))
    && words.every((w) => `${x.title} ${x.sub ?? ""} ${x.desc ?? ""} ${(x.tags ?? []).join(" ")} ${x.id} ${x.author}`.toLowerCase().normalize("NFC").includes(w)));
  if (ids) list = ids.map((id) => list.find((x) => x.uid === id)).filter(Boolean);
  return { total: list.length, offset, items: list.slice(offset, offset + limit), authors: count(list0, (x) => x.author), kinds: count(byAuthor, (x) => x.kind),
    categories: count(byKind, (x) => x.category) };
}

/** Read the stores again on the next call (after an import or a delete). */
export function reload() { cache = null; intake.reloadItems(); vocab.reloadItems(); }

/** The full item with the text for Claude and how the agent stages it (`library`: motion | blocks | looks | intake | vocab). */
export function getItem(uid, root = APP_ROOT) {
  const card = all(root).find((x) => x.uid === uid);
  if (!card) return null;
  if (card.origin === "vocab") { const it = vocab.getItem(card.uid, root); return { ...card, library: "vocab", version: it.credit?.commit ?? null, spec: vocab.specText(it), numbers: it.spec, names: it.names, meanings: it.meaning, asks: it.ask, use: it.use,
    hfSame: it.hfSame, studioNote: it.studioNote, size: { w: it.width, h: it.height, cycle: it.cycle } }; }
  if (card.origin === "intake") { const it = intake.getItem(card.uid, root); return { ...card, library: "intake", version: it.credit?.commit ?? it.credit?.read ?? null, spec: intake.specText(it) }; }
  if (card.origin === "hf") { const it = blocks.getItem(card.id, root); return { ...card, library: "blocks", version: it.credit?.commit ?? null, spec: blocks.specText(it) }; }
  const it = looks.getItem(card.id, root);
  return { ...card, library: "looks", version: it.credit?.commit ?? null, spec: looks.specText(it) };
}

/** Copy one item into a project for Claude (the files under .moworks/library/, as the Editor's motion picker does); `ref` is a library
 *  uid ("hf:component/count-up") or an id with no prefix ("component/count-up"). A retired kit id gives null. Returns { uid, title, files } or null. */
export function stageItem(projectDir, ref, root = APP_ROOT) {
  if (isRetired(ref)) return null;
  const list = all(root);
  const card = list.find((x) => x.uid === ref) ?? list.find((x) => x.uid === `hf:${ref}` || x.uid === `look:${ref}` || x.uid === `vocab:${String(ref).replace(/^vocab:|^#/, "")}`);
  if (!card) return null;
  const staged = card.origin === "hf" ? blocks.stageForProject(projectDir, card.id, root)
    : card.origin === "intake" ? intake.stageForProject(projectDir, card.uid, root) : card.origin === "vocab" ? vocab.stageForProject(projectDir, card.uid, root) : looks.stageForProject(projectDir, card.id, root);
  return { uid: card.uid, title: card.title, author: card.author, files: staged?.files ?? [] };
}

// library_search, Claude's tool for the motion spec: one query over the whole Motion Library (HyperFrames registry, the
// studio's store, Magic UI, Codrops, HyperFrames looks). The HyperFrames part keeps the order of `hyperframes catalog`
// (HF's own search: by meaning when its on-device model is on, else by name, title, description and tags); every item is also scored by
// how many of the query's words it carries (title, tags, then description), so a request in plain words still finds something.
// Answers 5-10 items, each with its id for MOTION-PLAN.json (the app copies that item's code into the project), what it is in about 100
// characters, and a word when its font lacks Vietnamese letters; no author, licence or "made" (Claude only needs to choose).
// A Vocabulary item (kind "vocab") answers with the author's numbers too, because the Motion Plan is written before anything is copied
// into the project: its spec lines (verbatim) and the app's HyperFrames-first and studio notes.
import { all } from "./index.mjs";
import * as vocab from "../vocab-library/index.mjs";
import { runHfJsonAsync } from "../hf-qa/cli.mjs";
import { APP_ROOT } from "../version-manager/index.mjs";

const STOP = new Set("a an the and or of to in on at for with by from as is are be it its this that into over under then than very more most some any each per via vs one two three what which how when where who use using make made film video shot shots scene scenes motion animation animated move moves moving".split(" "));
const fold = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
export const words = (q) => [...new Set(fold(q).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w)))];
const stem = (w) => (w.length > 5 ? w.slice(0, w.length - (/(ing|ed|es|s)$/.exec(w)?.[0].length ?? 0)) : w);

/** Score one card for the query words: title 3, tags 2, category / kind 1.5, description 1; a word counts by its stem. */
export function scoreCard(card, ws) {
  const title = fold(`${card.title} ${card.sub ?? ""} ${card.id}`), tags = fold((card.tags ?? []).join(" ")), cat = fold(`${card.category} ${card.kind}`), desc = fold(card.desc);
  let s = 0, hit = 0;
  for (const w of ws) {
    const t = stem(w);
    const v = (title.includes(t) ? 3 : 0) + (tags.includes(t) ? 2 : 0) + (cat.includes(t) ? 1.5 : 0) + (desc.includes(t) ? 1 : 0);
    if (v) { s += v; hit++; }
  }
  return ws.length ? s * (hit / ws.length) : 0;          // items that carry more of the words rank higher
}

/** [{ uid, title, author, kind, category, licence, vi, desc, score }] best first. kind: motion | block | look | vocab | any (any leaves the Vocabulary out:
 *  Motion Prompt's names and numbers are asked for with "vocab"). */
export async function librarySearch(query, { kind = "any", limit = 8, root = APP_ROOT, hfRank = true } = {}) {
  const ws = words(query);
  if (!ws.length) return [];
  let rank = new Map();
  if (hfRank) {          // HF's own search for its registry items: the earlier in its answer, the bigger the bonus
    const r = await runHfJsonAsync("catalog", root, ["--query", String(query).slice(0, 200)], { timeoutMs: 60000 }).catch(() => null);
    (r?.json?.results ?? []).slice(0, 40).forEach((x, i) => rank.set(`hf:${x.type}/${x.name}`, 40 - i));
  }
  const list = all(root).filter((c) => kind === "any" ? c.kind !== "vocab" : c.kind === kind);          // names and numbers are asked for by kind "vocab", so they never crowd out a runnable motion
  const scored = list.map((c) => ({ c, s: scoreCard(c, ws) + (rank.get(c.uid) ?? 0) / 8 })).filter((x) => x.s > 0);
  scored.sort((a, b) => b.s - a.s || a.c.title.localeCompare(b.c.title));
  return scored.slice(0, Math.max(1, Math.min(10, limit))).map(({ c, s }) => ({ uid: c.uid, title: c.title, author: c.author, kind: c.kind, category: c.category,
    licence: c.credit?.licence ?? null, made: c.credit?.made ?? null, vi: c.vi, viFamilies: c.viFamilies ?? [], desc: String(c.desc ?? "").replace(/\s+/g, " ").slice(0, 220), score: Math.round(s * 10) / 10,
    preview: !!(c.video || c.poster || c.canvas), ...(c.kind === "vocab" ? { vocab: vocab.getItem(c.uid, root) } : {}) }));
}

/** About n characters, cut at a word. */
export const short = (t, n = 100) => { const s = String(t ?? "").replace(/\s+/g, " ").trim(); if (s.length <= n) return s; const cut = s.slice(0, n); return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), n * 0.6)).replace(/[\s,;:.\-–—]+$/, "")}…`; };

/** A Vocabulary item's numbers under its line: the author's spec lines, then the app's notes (HyperFrames first, the studio's rules). */
export function vocabLines(v) {
  return [...vocab.specLines(v).map((l) => `\n   - ${l}`),
    v.hfSame ? `\n   App note (HyperFrames first): HyperFrames' registry has this: ${v.hfSame}. Cite that Library item (source kind "library") and use these numbers only for what it lacks.` : "",
    v.studioNote ? `\n   Studio note: ${v.studioNote}` : ""].join("");
}

/** The answer as Claude reads it: the id to cite, the name, what it is (about 100 characters); a font without Vietnamese letters is said. */
export function searchText(query, items) {
  if (!items.length) return `Nothing in the Motion Library matches "${query}". Use a move HyperFrames' motion reference describes (source kind "hf", id "motion.md#<section>") or write it new (kind "claude").`;
  const vi = (x) => x.vi === "missing" ? "; its font lacks Vietnamese letters" : x.vi === "mixed" ? "; some fonts lack Vietnamese letters" : "";
  return [`Library results for "${query}", best first. Cite one in docs/MOTION-PLAN.json as "source": {"kind": "library", "id": "<id>"}: the app copies its code into .moworks/library/ when the owner approves.`,
    ...items.map((x, i) => `${i + 1}. ${x.uid} "${x.title}" (${x.kind}${vi(x)}): ${short(x.desc)}${x.vocab ? vocabLines(x.vocab) : ""}`)].join("\n");
}

// Image sequences in Tech checks and the Review (config/rules/moworks-alive/sequence.md), written from the idea of the Moworks Motion kit's engine/qa/buildlint.py jump and
// product checks (Moworks, commit 0a4a0a3), and from what Test 30 measured:
//   crawl    under 1 picture a film frame outside a rest pose, or one picture held too long (T30-18)
//   jump     one film frame that skips far more pictures than the frames around it, where the two pictures differ: not a fast move (no ceiling on those), a teleport
//   product  the product's box outside the frame, outside a marked close-up (T30-21), sampled on HF's own page with its own seeks
//   player   a sequence named in the film's code but not played by the app's player (a hand-written one blended two pictures)
// Warnings, never a render stop. Every number is the player's own maths (hf-edit/seq-player.js), so the check reads the picture the film shows.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "../hf-edit/seq-player.js";
import { htmlFiles } from "../hf-edit/finalize.mjs";
import { openFilmPage } from "./filmPage.mjs";

const { keyAt, pictureAt, snap } = globalThis.__mwSeqMath;
export const SEQ = { crawlRunS: 0.12, holdS: 0.1, jumpMin: 4, jumpOver: 3, sameDiff: 0.006, productStep: 0.2, margin: 2 };
const r2 = (n) => Math.round(n * 100) / 100;
const readJson = (f, d = null) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return d; } };
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const attr = (tag, name) => { const m = new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`).exec(tag); return m ? unescape(m[1] ?? m[2]) : null; };

/** Every data-mw-sequence element of the film's files: [{ id, file, start, duration, o }] (a broken one with `broken`). */
export function filmSequences(dir) {
  const out = [];
  for (const file of htmlFiles(dir)) {
    const html = readFileSync(join(dir, file), "utf8");
    for (const m of html.matchAll(/<[a-z][\w-]*\b(?:[^>"']|"[^"]*"|'[^']*')*\bdata-mw-sequence=(?:"[^"]*"|'[^']*')(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
      const tag = m[0]; let o = null, broken = null;
      try { o = JSON.parse(attr(tag, "data-mw-sequence")); } catch (e) { broken = e.message; }
      out.push({ id: attr(tag, "id") ?? "", file, start: Number(attr(tag, "data-start")) || 0, duration: Number(attr(tag, "data-duration")) || null, o, broken });
    }
  }
  return out;
}

/** What the scan read of the sequence this one plays: { rests, portals, boxes, numbers, thumb, tiny (a Buffer), at } or null. */
export function posesOf(dir, o) {
  const seqs = readJson(join(dir, ".moworks", "scan", "index.json"))?.sequences ?? [];
  const s = seqs.find((x) => x.first?.startsWith(o?.dir ?? "\0") || (x.members ?? [])[0]?.startsWith(o?.dir ?? "\0"));
  if (!s?.poses?.json) return null;
  const p = readJson(join(dir, ...s.poses.json.split("/")));
  if (!p) return null;
  let tiny = null; try { tiny = readFileSync(join(dir, ...s.poses.json.split("/").slice(0, -1), "thumbs.bin")); } catch { /* no thumbs */ }
  return { ...p, tiny };
}
/** How far apart two pictures look, 0..1 (at 32 px, premultiplied, as the scan keeps them); null when not known. */
export function pictureDiff(p, a, b) {
  if (!p?.tiny) return null;
  const ia = p.numbers.indexOf(a), ib = p.numbers.indexOf(b), [w, h] = p.thumb, n = w * h * 4;
  if (ia < 0 || ib < 0 || (Math.max(ia, ib) + 1) * n > p.tiny.length) return null;
  let d = 0;
  for (let i = 0; i < n; i++) d += Math.abs(p.tiny[ia * n + i] - p.tiny[ib * n + i]);
  return d / (n * 255);
}
const inRest = (rests, f) => rests?.some(([a, b]) => f >= a - 1 && f <= b + 1);

/** The sequence frame by film frame: the numbers of Test 30's measure and the runs that break the rules. cuts: the film's shot starts (a jump there is a cut). */
export function measureSequence(seq, { fps = 30, poses = null, cuts = [] } = {}) {
  const K = seq.o?.keys ?? [], t0 = Math.max(seq.start ?? 0, 0), lastKey = K.at(-1)?.[0] ?? t0;
  const end = seq.duration ? t0 + seq.duration : lastKey;
  const n = Math.max(0, Math.round((end - t0) * fps));
  const rests = poses?.rests ?? null;
  const out = { fps, frames: n, turning: 0, under1: 0, under025: 0, longestHold: 0, nearStops: 0, steps: [], crawl: [], holds: [], jumps: [] };
  const crawlRun = Math.max(2, Math.round(SEQ.crawlRunS * fps)), holdRun = Math.max(2, Math.round(SEQ.holdS * fps));
  let slow = null, hold = null, wasFast = false;
  const close = (arr, run, min) => { if (run && run.n >= min) arr.push({ from: r2(run.t0), to: r2(run.t1), a: run.a, b: run.b, frames: run.n }); };
  let prevPic = null;
  const vals = [], pics = [];
  for (let i = 0; i <= n; i++) { const T = snap(t0 + i / fps, fps); vals.push(keyAt(K, T)?.[0] ?? 0); pics.push(pictureAt(seq.o, T, fps)); }
  for (let i = 0; i < n; i++) {
    const T = snap(t0 + i / fps, fps), v = Math.abs(vals[i + 1] - vals[i]), pic = pics[i], rest = inRest(rests, pic);
    if (v > 1e-6) {
      out.turning++;
      if (v < 1) out.under1++;
      if (v < 0.25) out.under025++;
      if (v >= 0.5) wasFast = true; else if (wasFast && v < 0.1) { out.nearStops++; wasFast = false; }
    }
    if (v > 1e-6 && v < 1 && !rest) { slow ??= { t0: T, a: pic, n: 0 }; slow.t1 = T + 1 / fps; slow.b = pics[i + 1]; slow.n++; }
    else { close(out.crawl, slow, crawlRun); slow = null; }
    // one picture on show, however the keys get there: a held picture counts only outside a rest pose, and only where the scan named rest poses
    if (pic === prevPic) { hold ??= { t0: T - 1 / fps, a: pic, b: pic, n: 1 }; hold.t1 = T + 1 / fps; hold.n++; out.longestHold = Math.max(out.longestHold, rest ? 0 : hold.n); }
    else { if (hold && rests && !inRest(rests, hold.a)) close(out.holds, hold, holdRun); hold = null; }
    prevPic = pic;
  }
  close(out.crawl, slow, crawlRun);
  if (hold && rests && !inRest(rests, hold.a)) close(out.holds, hold, holdRun);
  for (let i = 1; i < n; i++) {
    const d = Math.abs(pics[i] - pics[i - 1]), before = i > 1 ? Math.abs(pics[i - 1] - pics[i - 2]) : 0, after = Math.abs(pics[i + 1] - pics[i]);
    if (d < SEQ.jumpMin || d <= SEQ.jumpOver * before || d <= SEQ.jumpOver * after) continue;
    const T = snap(t0 + i / fps, fps);
    if (cuts.some((c) => Math.abs(c - T) <= 1.5 / fps)) continue;          // a cut of the film: the hero's jump is the cut's
    const diff = pictureDiff(poses, pics[i - 1], pics[i]);
    if (diff != null && diff < SEQ.sameDiff) continue;                     // a portal
    out.jumps.push({ at: r2(T), a: pics[i - 1], b: pics[i], ...(diff != null ? { diff: r2(diff * 100) } : {}) });
  }
  return out;
}

const shotStarts = (dir) => {
  let html = ""; try { html = readFileSync(join(dir, "index.html"), "utf8"); } catch { return []; }
  return [...html.matchAll(/<[a-z][\w-]*\b[^>]*\bdata-composition-src=[^>]*>/gi)].map((m) => Number(attr(m[0], "data-start"))).filter(Number.isFinite);
};
const filmFps = (dir) => { try { return Number(/<[^>]*\bdata-composition-id="[^"]*"[^>]*>/.exec(readFileSync(join(dir, "index.html"), "utf8"))?.[0].match(/\bdata-fps="([\d.]+)"/)?.[1]) || 30; } catch { return 30; } };

/** Numbered sequences the scan found that the film's code names without the app's player: their folders. */
export function handWritten(dir) {
  const seqs = readJson(join(dir, ".moworks", "scan", "index.json"))?.sequences ?? [];
  const usedBy = new Set(filmSequences(dir).map((s) => s.o?.dir).filter(Boolean));
  const out = [];
  for (const s of seqs) {
    const first = s.first ?? ""; if (!first) continue;
    const folder = first.slice(0, first.lastIndexOf("/") + 1);
    if ([...usedBy].some((d) => first.startsWith(d))) continue;
    for (const f of htmlFiles(dir)) { if (readFileSync(join(dir, f), "utf8").includes(folder)) { out.push(folder); break; } }
  }
  return out;
}

/** The product's box against the frame, on HF's own page: [{ id, from, to, over }] (`over`: how far outside, px) and the samples taken. */
export async function measureProduct(dir, seqs, { step = SEQ.productStep, open = openFilmPage, signal = null } = {}) {
  const live = seqs.filter((s) => s.o);
  if (!live.length) return { samples: 0, cut: [] };
  const poses = new Map(live.map((s) => [s.id, posesOf(dir, s.o)]));
  const page = await open(dir);
  try {
    const { tab, total, size } = page, cut = [];
    let cur = new Map(), samples = 0;
    for (let t = 0; t < total; t += step) {
      if (signal?.aborted) break;
      const seen = await tab.evaluate(async (time) => {
        window.__hf.seek(time);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        await window.__mwSeq?.settled();
        return window.__mwSeq?.report() ?? [];
      }, t);
      samples++;
      const now = new Map();
      for (const x of seen) {
        if (!x.visible || !x.frame || !(x.rect[2] > 0) || x.closeUps?.some(([a, b]) => t >= a && t <= b)) continue;
        const p = poses.get(x.id), i = p?.numbers?.indexOf(x.frame) ?? -1, b = i >= 0 ? p.boxes[i] : [0, 0, 1, 1];
        if (!(b[2] > b[0])) continue;
        // the picture, contained in its box; the opaque part of it, on the stage
        const [rx, ry, rw, rh] = x.rect, [nw, nh] = x.natural[0] ? x.natural : [rw, rh], k = Math.min(rw / nw, rh / nh), ox = rx + (rw - nw * k) / 2, oy = ry + (rh - nh * k) / 2;
        const box = [ox + b[0] * nw * k, oy + b[1] * nh * k, ox + b[2] * nw * k, oy + b[3] * nh * k];
        const over = Math.max(-box[0], -box[1], box[2] - size.width, box[3] - size.height);
        if (over > SEQ.margin) now.set(x.id, Math.round(over));
      }
      for (const [id, over] of now) {
        const run = cur.get(id);
        if (run) { run.to = r2(t + step); run.over = Math.max(run.over, over); } else { const r = { id, from: r2(t), to: r2(t + step), over }; cur.set(id, r); cut.push(r); }
      }
      for (const id of [...cur.keys()]) if (!now.has(id)) cur.delete(id);
    }
    return { samples, cut };
  } finally { await page.close(); }
}

/** Every number of the film's sequences, the cheap part (no browser): { sequences: [{ id, ...measure }], handWritten, broken }; null for a film with no sequence. */
export function sequenceReport(dir) {
  const seqs = filmSequences(dir), hand = handWritten(dir);
  if (!seqs.length && !hand.length) return null;
  const fps = filmFps(dir), cuts = shotStarts(dir);
  return { fps, handWritten: hand, broken: seqs.filter((s) => s.broken).map((s) => s.id || s.file),
    sequences: seqs.filter((s) => s.o).map((s) => { const poses = posesOf(dir, s.o); return { id: s.id, poses: !!poses, ...measureSequence(s, { fps, poses, cuts }) }; }) };
}

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
/** The block of the Review's QC round (Claude reads it; moworks-qc §2b). */
export function sequenceLines(r, product = null) {
  if (!r) return [];
  const lines = ["Image sequence (the app's measure, moworks-alive/sequence.md; a crawl keeps Motion at 6 at most):"];
  for (const f of r.handWritten) lines.push(`- ${f}: named in the film's code without the app's player. Replace the hand-written player with one element with data-mw-sequence.`);
  for (const b of r.broken) lines.push(`- ${b}: its data-mw-sequence is not valid JSON.`);
  for (const s of r.sequences) {
    lines.push(`- #${s.id}, ${s.fps} fps: ${s.turning} turning frames, ${pct(s.under1, s.turning)} % under 1 picture a frame, ${pct(s.under025, s.turning)} % under 0.25; longest hold outside a rest pose ${s.longestHold} frames${s.poses ? "" : " (its poses are not read yet, so holds are not judged)"}.`);
    for (const c of s.crawl.slice(0, 8)) lines.push(`  - Crawl ${c.from}-${c.to} s: pictures ${c.a}-${c.b} under 1 a frame. Move faster, or hold on a rest pose and move the box.`);
    for (const c of s.holds.slice(0, 8)) lines.push(`  - Held ${c.from}-${c.to} s on picture ${c.a} (${c.frames} frames), no rest pose. Hold only on a rest pose of POSES.md.`);
    for (const j of s.jumps.slice(0, 8)) lines.push(`  - Jump at ${j.at} s: picture ${j.a} to ${j.b} in one frame${j.diff != null ? `, the pictures ${j.diff} % apart` : ""}. Ease it, or cut on a portal.`);
  }
  for (const c of product?.cut ?? []) lines.push(`- Product cut by the frame ${c.from}-${c.to} s (#${c.id}, up to ${c.over} px outside): place it by its widest pose, or mark the shot in closeUps if it is meant.`);
  if (product?.failed) lines.push(`- The product's place was not measured: ${product.failed}`);
  return lines;
}

/** The Tech checks entries. `product`: measureProduct's answer, or { failed }. */
export function sequenceGates(r, product = null) {
  if (!r) return [];
  const crawl = [], jump = [], prod = [];
  for (const f of r.handWritten) crawl.push({ message: `The sequence in ${f} is played by a player written for this film. Ask Claude to use the app's player: it never blends two pictures.`, plain: `A sequence is played by a player written for this film, not the app's. Ask Claude to use the app's player.` });
  for (const s of r.sequences) {
    for (const c of s.crawl) { const message = `Between ${c.from} and ${c.to} s the turn crawls under 1 picture a film frame (pictures ${c.a}-${c.b}), so it looks like it stutters. Ask Claude to turn it faster, or hold on a rest pose and move the camera.`; crawl.push({ from: c.from, to: c.to, message, plain: message }); }
    for (const c of s.holds) { const message = `From ${c.from} to ${c.to} s one picture (${c.a}) holds for ${c.frames} frames where the product is mid-turn, so it stops dead. Ask Claude to hold only on a rest pose.`; crawl.push({ from: c.from, to: c.to, message, plain: message }); }
    for (const j of s.jumps) { const message = `At ${j.at} s the product jumps from picture ${j.a} to ${j.b} in one frame. Ask Claude to ease that move, or to cut where the two pictures match.`; jump.push({ at: j.at, message, plain: message }); }
  }
  for (const c of product?.cut ?? []) { const message = `From ${c.from} to ${c.to} s the frame cuts off the product (up to ${c.over} px outside). Ask Claude to keep all of it inside, or to mark the shot as a close-up if it is meant.`; prod.push({ from: c.from, to: c.to, message, plain: message }); }
  const gate = (id, findings, extra = {}) => ({ id, blocking: false, pass: findings.length === 0, warnings: findings.length, findings, ...extra });
  return [gate("G-SEQ-CRAWL", crawl), gate("G-SEQ-JUMP", jump), gate("G-SEQ-PRODUCT", prod, product?.failed ? { skipped: `Not measured: ${product.failed}` } : {})];
}
/** Tech checks: the cheap numbers, and the product's place on HF's page. */
export async function gateSequence(dir, opts = {}) {
  const r = sequenceReport(dir);
  if (!r) return [];
  let product;
  try { product = await measureProduct(dir, filmSequences(dir), opts); } catch (e) { product = { cut: [], failed: String(e.message).split("\n")[0] }; }
  return sequenceGates(r, product);
}

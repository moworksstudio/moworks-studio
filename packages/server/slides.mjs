// A Google Slides link the user pastes: read like a PowerPoint file, through Google's own public export
// (…/presentation/d/<id>/export/pptx), only when the user pastes the link (in Add files, or in the brief of New project). A deck that is
// not shared by link answers with Google's sign-in page, not a file: that is a missing thing for Prepare to stop on:
// "make it viewable by anyone with the link, or upload the PPTX".
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const LINK = /https?:\/\/docs\.google\.com\/presentation\/(?:u\/\d+\/)?d\/([\w-]{20,})[^\s)"'<>\]]*/g;
const PPTX = /presentationml|application\/vnd\.ms-powerpoint|application\/octet-stream/i;

/** The Google Slides links in a text, each once: [{ url, id }]. */
export function slidesLinks(text) {
  const seen = new Set(), out = [];
  for (const m of String(text ?? "").matchAll(LINK)) if (!seen.has(m[1])) { seen.add(m[1]); out.push({ url: m[0], id: m[1] }); }
  return out;
}

/** The deck as a PPTX: { ok: true, bytes, name } or { ok: false, reason: "not-shared" | "not-found" | "offline" | "too-large", status? }. */
export async function fetchSlides(id, { fetchFn = fetch, maxBytes = 300 * 1024 * 1024, timeoutMs = 60000 } = {}) {
  const url = `https://docs.google.com/presentation/d/${encodeURIComponent(id)}/export/pptx`;
  let r;
  try { r = await fetchFn(url, { redirect: "follow", signal: AbortSignal.timeout(timeoutMs) }); }
  catch { return { ok: false, reason: "offline" }; }
  const type = r.headers?.get?.("content-type") ?? "";
  // not shared: Google answers 401/403, or sends its sign-in page (HTML, after a redirect to accounts.google.com)
  if (r.status === 401 || r.status === 403 || /accounts\.google\.com|ServiceLogin/.test(String(r.url ?? "")) || (r.ok && /text\/html/i.test(type))) return { ok: false, reason: "not-shared", status: r.status };
  if (r.status === 404) return { ok: false, reason: "not-found", status: 404 };
  if (!r.ok || (type && !PPTX.test(type))) return { ok: false, reason: "not-shared", status: r.status };
  const bytes = Buffer.from(await r.arrayBuffer());
  if (bytes.length > maxBytes) return { ok: false, reason: "too-large" };
  if (bytes.slice(0, 2).toString("latin1") !== "PK") return { ok: false, reason: "not-shared", status: r.status };          // a PPTX is a zip
  const cd = r.headers?.get?.("content-disposition") ?? "";
  const named = /filename\*=UTF-8''([^;]+)/i.exec(cd)?.[1] ?? /filename="([^"]+)"/i.exec(cd)?.[1] ?? null;
  let name = named ? decodeURIComponent(named) : `Google Slides ${id.slice(0, 8)}.pptx`;
  if (!/\.pptx$/i.test(name)) name += ".pptx";
  return { ok: true, bytes, name };
}

/** Write the deck where the project keeps its design files. dest: projects.assetDestination's answer. */
export function saveSlides(dest, bytes) { mkdirSync(dirname(dest.path), { recursive: true }); writeFileSync(dest.path, bytes); return dest; }


// One-time Google Fonts download: when a project uses a family that neither the project nor the kit serves,
// fetch it once at build time (finalize), keep it in a machine cache and in the project, and declare it with @font-face.
// Render never touches the network. Only the latin, latin-ext and vietnamese subsets are kept.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROOT } from "../version-manager/index.mjs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const KEEP = new Set(["latin", "latin-ext", "vietnamese"]);
const CACHE = join(APP_ROOT, "runtime", "fonts", "google");

export const slug = (family) => family.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// The weight list HF's own compiler asks for (packages/core/src/fonts/deterministicFonts.ts:1562), then simpler forms for
// families that do not have every weight (Google answers 400 to a weight a family lacks).
function cssUrls(family) {
  const f = encodeURIComponent(family).replace(/%20/g, "+");
  return [
    `https://fonts.googleapis.com/css2?family=${f}:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=block`,
    `https://fonts.googleapis.com/css2?family=${f}:wght@400;700&display=block`,
    `https://fonts.googleapis.com/css2?family=${f}&display=block`,
  ];
}

/** Download (or reuse from the cache) one family. Returns { family, dir, faces, files } or null when Google has no such family. */
export async function fetchGoogleFamily(family, { fetchImpl = fetch } = {}) {
  const dir = join(CACHE, slug(family));
  const cssPath = join(dir, "font.css");
  if (existsSync(cssPath)) return { family, dir, css: readFileSync(cssPath, "utf8"), cached: true };
  let css = null;
  for (const url of cssUrls(family)) {
    const r = await fetchImpl(url, { headers: { "User-Agent": UA } });
    if (r.ok) { css = await r.text(); break; }
  }
  if (!css) return null;
  const blocks = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*{[^}]*})/g)].filter((m) => KEEP.has(m[1]));
  if (!blocks.length) return null;
  mkdirSync(dir, { recursive: true });
  const out = [];
  for (const [, subset, block] of blocks) {
    const src = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/.exec(block)?.[1];
    if (!src) continue;
    const name = `${subset}-${src.split("/").pop()}`;
    if (!existsSync(join(dir, name))) {
      const r = await fetchImpl(src, { headers: { "User-Agent": UA } });
      if (!r.ok) throw new Error(`font file download failed (${r.status}) for ${family}: ${src}`);
      writeFileSync(join(dir, name), Buffer.from(await r.arrayBuffer()));
    }
    out.push(`/* ${subset} */\n${block.replace(src, `__DIR__/${name}`)}`);
  }
  const local = out.join("\n");
  writeFileSync(cssPath, local);
  writeFileSync(join(dir, "source.json"), JSON.stringify({ family, fetchedAt: new Date().toISOString(), from: "fonts.googleapis.com", license: "see fonts.google.com (OFL / Apache for Google Fonts families)" }, null, 2));
  return { family, dir, css: local, cached: false };
}

/** Copy a cached family into the project and return its @font-face CSS pointing at the project's files (project-root paths). */
export function installGoogleFamily(projectDir, fetched) {
  const rel = `assets/_app/fonts/google/${slug(fetched.family)}`;
  const dst = join(projectDir, ...rel.split("/"));
  mkdirSync(dst, { recursive: true });
  for (const n of readdirSync(fetched.dir)) if (n.endsWith(".woff2") && !existsSync(join(dst, n))) copyFileSync(join(fetched.dir, n), join(dst, n));
  return fetched.css.replaceAll("__DIR__", rel).replace(/font-family:\s*'[^']+'/g, `font-family: "${fetched.family}"`);
}

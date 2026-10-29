// Install a HyperFrames registry block from the pinned local registry source into a project, in the `hyperframes add` layout
// (files at their registry-item.json targets; mount snippet = data-composition-src + data-duration + size, packages/cli/src/commands/add.ts).
// The original file is used; the only Moworks change is pointing the CDN libraries it loads at the app's pinned copies (GSAP,
// three.js, clipper-lib, the Draco decoder, fontsource faces: vendorLibs.mjs), because no remote URL may reach a render.
// An item that still references the network after that is refused.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { rewriteRemoteLibs, vendorInto } from "./vendorLibs.mjs";

const REMOTE = /https?:\/\/(?!www\.w3\.org)[^\s"'()<>]+/g;

export function installBlock(registryRoot, name, projectDir, gsapFile) {
  const dir = join(registryRoot, "blocks", name);
  const itemPath = join(dir, "registry-item.json");
  if (!existsSync(itemPath)) throw new Error(`registry block "${name}" not found in ${registryRoot}`);
  const item = JSON.parse(readFileSync(itemPath, "utf8"));
  for (const f of item.files) {
    const dst = join(projectDir, f.target);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(join(dir, f.path), dst);
  }
  const target = (item.files.find((f) => f.type === "hyperframes:composition") ?? item.files[0]).target;
  const original = readFileSync(join(projectDir, target), "utf8");
  const { text: html, needs } = rewriteRemoteLibs(original);          // paths in mounted compositions resolve from the project root
  if (html !== original) {
    vendorInto(projectDir, { ...needs, gsap: false });
    const vendor = join(projectDir, "assets", "_app", "vendor", "gsap.min.js");
    if (needs.gsap && !existsSync(vendor)) { mkdirSync(dirname(vendor), { recursive: true }); cpSync(gsapFile, vendor); }
    writeFileSync(join(projectDir, target), html);
  }
  const remaining = [...new Set(html.match(REMOTE) ?? [])];
  if (remaining.length) throw new Error(`registry block "${name}" still references remote URLs: ${remaining.slice(0, 3).join(", ")}`);
  const rootId = /data-composition-id="([^"]+)"/.exec(html)?.[1];
  return { name, target, rootId, duration: item.duration, width: item.dimensions?.width, height: item.dimensions?.height, license: item.license ?? null };
}

export function mountSnippet(b, { id, start, duration }) {
  return `<div id="${id}" data-composition-id="${b.rootId}" data-composition-src="${b.target}" data-start="${start}" data-duration="${duration}"${b.width ? ` data-width="${b.width}" data-height="${b.height}"` : ""} data-track-index="1"></div>`;
}

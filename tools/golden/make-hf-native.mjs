// Builds the HF-native golden film: scenes as sub-compositions (two registry blocks installed the way `hyperframes add`
// lays them out, from a local HyperFrames clone) + one templated sub-composition with Vietnamese text.
// Kept as provenance: test/golden/hf-native was made once with this script, its Inter font and GSAP taken from the vendor folder of the
// Moworks Motion kit. The kit is retired and gone, so the script cannot run again as written; the golden film is not remade.
// node tools/golden/make-hf-native.mjs <hyperframes clone> <kit vendor dir> <out dir>
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [clone, kitVendor, out] = process.argv.slice(2);
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "assets", "fonts"), { recursive: true });
mkdirSync(join(out, "assets", "vendor"), { recursive: true });

/** Copy a registry item's files to their `target` paths (HF installer layout, packages/cli/src/registry/installer.ts). */
function installBlock(name) {
  const dir = join(clone, "registry", "blocks", name);
  const item = JSON.parse(readFileSync(join(dir, "registry-item.json"), "utf8"));
  for (const f of item.files) {
    const dst = join(out, f.target);
    mkdirSync(dirname(dst), { recursive: true });
    cpSync(join(dir, f.path), dst);
  }
  const target = (item.files.find((f) => f.type === "hyperframes:composition") ?? item.files[0]).target;
  // vendor the CDN GSAP the way the library importer must (no remote URL may reach a render):
  // paths in a mounted composition resolve from the project root (docs/concepts/compositions.mdx)
  let html = readFileSync(join(out, target), "utf8");
  const vendored = html.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@[0-9.]+\/dist\/gsap\.min\.js/g, "assets/vendor/gsap.min.js");
  if (vendored !== html) { html = vendored; writeFileSync(join(out, target), html); }
  if (/https?:\/\/(?!www\.w3\.org)/.test(html)) throw new Error(`${name} still references a remote URL`);
  const rootId = /data-composition-id="([^"]+)"/.exec(html)?.[1];
  return { name, target, rootId, duration: item.duration, width: item.dimensions?.width, height: item.dimensions?.height };
}

const blocks = [installBlock("code-slice-hero"), installBlock("apple-money-count")];
cpSync(join(kitVendor, "fonts", "google", "Inter"), join(out, "assets", "fonts", "Inter"), { recursive: true });
cpSync(join(kitVendor, "gsap", "gsap.min.js"), join(out, "assets", "vendor", "gsap.min.js"));

// own scene: <template> sub-composition, Vietnamese text, background on its own layer
mkdirSync(join(out, "compositions"), { recursive: true });
writeFileSync(join(out, "compositions", "vi-end.html"), `<template id="vi-end-template">
  <div data-composition-id="vi-end" data-width="1920" data-height="1080">
    <div class="vi-bg"></div>
    <h1 class="vi-title">Cảm ơn đã xem – ạ ặ ễ ộ ữ ỹ đ Ơ Ư</h1>
    <p class="vi-small">Chữ nhỏ 16px: Tiếng Việt rõ nét, không viền màu</p>
    <style>
      @font-face { font-family: "VI Inter"; src: url("assets/fonts/Inter/Inter[opsz,wght].ttf"); font-weight: 100 900; }
      [data-composition-id="vi-end"] { position: relative; width: 1920px; height: 1080px; overflow: hidden; font-family: "VI Inter"; }
      [data-composition-id="vi-end"] .vi-bg { position: absolute; inset: 0; background: #14161c; will-change: transform; }
      [data-composition-id="vi-end"] .vi-title { position: absolute; left: 160px; top: 420px; margin: 0; font-size: 96px; color: #f5f5f2; }
      [data-composition-id="vi-end"] .vi-small { position: absolute; left: 160px; top: 600px; margin: 0; font-size: 16px; color: #f5f5f2; }
    </style>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.fromTo('[data-composition-id="vi-end"] .vi-title', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, 0.2);
      tl.to({}, { duration: 4 }, 0);
      window.__timelines["vi-end"] = tl;
    </script>
  </div>
</template>
`);

let t = 0;
const mounts = blocks.map((b, i) => {
  const m = `  <div id="scene${i + 1}" data-composition-id="${b.rootId}" data-composition-src="${b.target}" data-start="${t}" data-duration="${b.duration}" data-width="${b.width}" data-height="${b.height}" data-track-index="1"></div>`;
  t += b.duration;
  return m;
});
mounts.push(`  <div id="scene3" data-composition-id="vi-end" data-composition-src="compositions/vi-end.html" data-start="${t}" data-duration="4" data-track-index="1"></div>`);
t += 4;
const fontFile = "Inter[opsz,wght].ttf";
writeFileSync(join(out, "index.html"), `<!doctype html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob: 'unsafe-inline' 'unsafe-eval'">
<meta name="viewport" content="width=1920, height=1080" />
<script src="assets/vendor/gsap.min.js"></script>
<style>
@font-face { font-family: "VI Inter"; src: url("assets/fonts/Inter/${fontFile}"); font-weight: 100 900; }
body { margin: 0; }
#root { position: relative; width: 1920px; height: 1080px; overflow: hidden; }
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${t}" data-width="1920" data-height="1080" data-no-timeline>
${mounts.join("\n")}
</div>
</body>
</html>
`);
writeFileSync(join(out, "hyperframes.json"), JSON.stringify({ registry: "https://hyperframes.heygen.com/registry", paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
  registryItems: blocks.map((b) => ({ name: b.name, type: "hyperframes:block", target: b.target })) }, null, 2));
console.log(JSON.stringify({ duration: t, blocks }, null, 1));

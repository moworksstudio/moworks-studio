// scaffold(projectDir, storyboardText, opts): a new HF-native film from a STORYBOARD.md, parsed with HF's own parser.
// Each frame becomes one sub-composition mounted in order: a registry block when the frame has `block: <name>` (an extra key HF keeps),
// else a templated scene with the frame's title and caption. STORYBOARD.md is written back with each frame's `src`. Then finalize().
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gsapFile as pinnedGsap } from "../offline-assets/index.mjs";
import { finalize } from "./finalize.mjs";
import { hideAppFolder } from "../project-service/layout.mjs";
import { loadHf } from "./load.mjs";
import { installBlock, mountSnippet } from "./registry.mjs";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function sceneTemplate(id, frame, w, h) {
  const bg = frame.extra.bg ?? "#ffffff";
  const fg = frame.extra.fg ?? "#111111";
  const font = frame.extra.font ?? "Roboto Flex";
  return `<template id="${id}-template">
  <div data-composition-id="${id}" data-width="${w}" data-height="${h}" style="position: relative; width: ${w}px; height: ${h}px; overflow: hidden; background: ${bg}; font-family: '${font}';">
    <h1 class="mw-title" style="position: absolute; left: 160px; top: ${Math.round(h * 0.38)}px; margin: 0; font-size: 96px; font-weight: 700; color: ${fg};">${esc(frame.title ?? "")}</h1>
    <p class="mw-caption" style="position: absolute; left: 160px; top: ${Math.round(h * 0.38) + 150}px; margin: 0; font-size: 28px; color: ${fg};">${esc(frame.scene ?? "")}</p>
    <script>
      const tl = gsap.timeline({ paused: true });
      tl.fromTo('[data-composition-id="${id}"] .mw-title', { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, 0.2);
      tl.fromTo('[data-composition-id="${id}"] .mw-caption', { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.6);
      window.__timelines["${id}"] = tl;
    </script>
  </div>
</template>
`;
}

export async function scaffold(projectDir, storyboardText, { registryRoot, version = null } = {}) {
  const hf = await loadHf(version);
  const sb = hf.storyboard.parseStoryboard(storyboardText);
  const [w, h] = (sb.globals.format ?? "1920x1080").split("x").map(Number);
  const gsapFile = pinnedGsap();       // GSAP at the pinned version, downloaded once
  mkdirSync(join(projectDir, "compositions"), { recursive: true });
  mkdirSync(join(projectDir, "assets", "_app", "vendor"), { recursive: true });
  cpSync(gsapFile, join(projectDir, "assets", "_app", "vendor", "gsap.min.js"));
  hideAppFolder(projectDir);          // the app's own copies, out of the user's way in Explorer
  let text = storyboardText;
  let t = 0;
  const mounts = [];
  const installed = [];
  for (const frame of sb.frames) {
    const id = `f${frame.index}`;
    let duration = frame.durationSeconds;
    let snippet;
    if (frame.extra.block) {
      const b = installBlock(registryRoot, frame.extra.block, projectDir, gsapFile);
      installed.push(b);
      duration ??= b.duration;
      snippet = mountSnippet(b, { id, start: t, duration });
      text = hf.storyboard.setFrameField(text, frame.index, "src", b.target);
    } else {
      duration ??= 3;
      const src = `compositions/${id}.html`;
      writeFileSync(join(projectDir, src), sceneTemplate(id, frame, w, h));
      snippet = `<div id="${id}" data-composition-id="${id}" data-composition-src="${src}" data-start="${t}" data-duration="${duration}" data-track-index="1"></div>`;
      text = hf.storyboard.setFrameField(text, frame.index, "src", src);
    }
    mounts.push(`  ${snippet}`);
    t += duration;
  }
  writeFileSync(join(projectDir, "index.html"), `<!doctype html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${w}, height=${h}" />
<script src="assets/_app/vendor/gsap.min.js"></script>
<style>body { margin: 0; } #root { position: relative; width: ${w}px; height: ${h}px; overflow: hidden; }</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${t}" data-width="${w}" data-height="${h}" data-no-timeline>
${mounts.join("\n")}
</div>
</body>
</html>
`);
  writeFileSync(join(projectDir, "STORYBOARD.md"), text);
  writeFileSync(join(projectDir, "hyperframes.json"), JSON.stringify({ registry: "https://hyperframes.heygen.com/registry",
    paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
    registryItems: installed.map((b) => ({ name: b.name, type: "hyperframes:block", target: b.target })) }, null, 2) + "\n");
  mkdirSync(join(projectDir, ".moworks"), { recursive: true });
  writeFileSync(join(projectDir, ".moworks", "project.json"), JSON.stringify({ schemaVersion: 1, hfVersion: hf.version, createdAt: new Date().toISOString(),
    pins: installed.map((b) => ({ id: b.name, source: "hf-registry", hfVersion: hf.version, target: b.target })), approvals: {} }, null, 2) + "\n");
  const fin = await finalize(projectDir, { version });
  return { duration: t, frames: sb.frames.length, warnings: sb.warnings, installed: installed.map((b) => b.name), finalize: fin };
}

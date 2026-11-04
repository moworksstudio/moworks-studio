#!/usr/bin/env node
// qa.mjs — the collision check of a video: steps through EVERY frame, poses the world exactly as the render does, and
// tests every character's body against solid furniture (box and cylinder meshes) and against each other.
//   node tools/qa.mjs <CompositionId>
// Prints "COLLISION none" (exit 0) or one line per problem: who ↔ what | frames | max depth in metres (exit 1).
// Run it after every change to the blocking (positions, walks, poses), and before every render.
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { GL, ROOT } from "./lib.mjs";

const require = createRequire(path.join(ROOT, "package.json"));
const { bundle } = require("@remotion/bundler");
const { renderStill, selectComposition } = require("@remotion/renderer");

const [id] = process.argv.slice(2);
if (!id) {
  console.error("usage: node tools/qa.mjs <CompositionId>");
  process.exit(1);
}
const check = id.endsWith("-Check") ? id : `${id}-Check`;
const serveUrl = await bundle({ entryPoint: path.join(ROOT, "src/index.ts"), rootDir: ROOT, publicDir: path.join(ROOT, "public") });
process.on("exit", () => {
  try {
    if (serveUrl.includes("remotion-webpack-bundle-")) fs.rmSync(serveUrl, { recursive: true, force: true });
  } catch {}
});
const chromiumOptions = { gl: GL() };
const composition = await selectComposition({ serveUrl, id: check, chromiumOptions });
const lines = [];
const tmp = path.join(ROOT, "out", "_qa", `${check}.png`);
fs.mkdirSync(path.dirname(tmp), { recursive: true });
await renderStill({
  serveUrl,
  composition,
  frame: 0,
  output: tmp,
  chromiumOptions,
  logLevel: "warn", // the page's own log lines come through onBrowserLog below
  onBrowserLog: (log) => {
    if (log.text.startsWith("COLLISION")) lines.push(log.text);
  },
});
if (!lines.length) {
  console.error(`✗ ${check} printed nothing: is it a collision-check composition (src/kit/collision.tsx)?`);
  process.exit(2);
}
console.log(lines.join("\n"));
process.exit(lines.length === 1 && lines[0] === "COLLISION none" ? 0 : 1);

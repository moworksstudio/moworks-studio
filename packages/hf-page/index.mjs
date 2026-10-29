// hf-page: serve a HyperFrames project the way HF itself opens it for stills and renders, for tools that drive the page themselves (the
// AE export's recorder). Two HF pieces, both unmodified and exported by HF:
//   1. @hyperframes/core/compiler bundleToSingleHtml: sub-compositions inlined, their asset paths rewritten to the project root (what
//      `hyperframes snapshot` / `layout` / `validate` open);
//   2. @hyperframes/producer createFileServer: HF's render file server (the verified HF runtime, render-mode script and the window.__hf
//      seek bridge), with the bundled page as its compiled index.html and the project folder for every other file.
// The project folder is not written to; the bundle lives in a temp folder removed by close().
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveRuntime } from "../version-manager/index.mjs";

const load = (runtimeDir, pkg, file) => import(pathToFileURL(join(runtimeDir, "node_modules", "@hyperframes", pkg, "dist", file)).href);

/** Start the page for `projectDir`. fps = {num, den}. Returns { url (index.html), port, chromium, version, close() }. */
export async function servePage(projectDir, { version = null, fps = { num: 30, den: 1 } } = {}) {
  const rt = resolveRuntime(version);
  const dir = resolve(projectDir);
  const [{ bundleToSingleHtml }, producer] = await Promise.all([load(rt.dir, "core", "compiler/index.js"), load(rt.dir, "producer", "index.js")]);
  const compiledDir = mkdtempSync(join(tmpdir(), "mw-hf-page-"));
  writeFileSync(join(compiledDir, "index.html"), await bundleToSingleHtml(dir), "utf8");
  const h = await producer.createFileServer({ projectDir: dir, compiledDir, port: 0, fps });
  const base = h.url.endsWith("/") ? h.url : h.url + "/";
  return {
    url: base + "index.html", port: h.port, chromium: rt.chromium, version: rt.version,
    close: () => { h.close(); rmSync(compiledDir, { recursive: true, force: true }); },
  };
}

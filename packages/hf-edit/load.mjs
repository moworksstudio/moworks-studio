// Loads the pinned HyperFrames SDK, fs adapter, storyboard parser and linkedom from one installed version folder.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveRuntime } from "../version-manager/index.mjs";

const cache = new Map();

export async function loadHf(version = null) {
  const rt = resolveRuntime(version);
  if (cache.has(rt.dir)) return cache.get(rt.dir);
  const nm = join(rt.dir, "node_modules");
  const imp = (...p) => import(pathToFileURL(join(nm, ...p)).href);
  const hf = {
    version: rt.version,
    dir: rt.dir,
    sdk: await imp("@hyperframes", "sdk", "dist", "index.js"),
    fs: await imp("@hyperframes", "sdk", "dist", "adapters", "fs.js"),
    storyboard: await imp("@hyperframes", "core", "dist", "storyboard", "index.js"),
    linkedom: await imp("linkedom", "esm", "index.js"),
    fontAliases: (await imp("@hyperframes", "core", "dist", "fonts", "aliases.js")).FONT_ALIAS_MAP,
    runtimeFile: join(nm, "@hyperframes", "core", "dist", "hyperframe.runtime.iife.js"),
  };
  cache.set(rt.dir, hf);
  return hf;
}

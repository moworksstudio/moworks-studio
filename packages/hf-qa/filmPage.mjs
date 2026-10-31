// The film open on HyperFrames' own page (packages/hf-page: HF's bundle, HF's file server, HF's seeks), for a check that reads what is on screen at a time: where the product is,
// whether a sung word shows. Its own headless browser, closed after.
import { createRequire } from "node:module";
import { join } from "node:path";
import { resolveRuntime } from "../version-manager/index.mjs";
import { servePage } from "../hf-page/index.mjs";

/** { tab, total, size: { width, height }, close() }. */
export async function openFilmPage(dir, { version = null } = {}) {
  const page = await servePage(dir, { version });
  let browser = null;
  try {
    const rt = resolveRuntime(version);
    const puppeteer = createRequire(join(rt.dir, "node_modules", "puppeteer-core", "package.json"))("puppeteer-core");
    browser = await puppeteer.launch({ executablePath: page.chromium, headless: true, args: ["--hide-scrollbars"] });
    const tab = await browser.newPage();
    await tab.goto(page.url, { waitUntil: "load", timeout: 60000 });
    await tab.waitForFunction(() => window.__hf && typeof window.__hf.seek === "function" && window.__hf.duration > 0, { timeout: 60000 });
    const info = await tab.evaluate(() => { const r = document.querySelector("[data-composition-id]"); return { width: +r?.getAttribute("data-width") || 1920, height: +r?.getAttribute("data-height") || 1080, total: window.__hf.duration }; });
    await tab.setViewport({ width: info.width, height: info.height });
    return { tab, total: info.total, size: { width: info.width, height: info.height }, close: async () => { await browser.close().catch(() => {}); page.close(); } };
  } catch (e) { await browser?.close().catch(() => {}); page.close(); throw e; }
}

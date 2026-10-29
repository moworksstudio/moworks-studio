// HF's contrast check measured the sticker's white outline pass, not the words. The film draws each
// sticker twice: a copy of the art (text included) painted white with a thick white stroke, marked aria-hidden="true", then the art itself
// on top. HF's audit walks every text element, so it measured the white copy's white fill against the white sticker ("MOON TREE" 1.36,
// "?" 1.17, "Artemis I" 1.06) while the dark words over it read clearly. HF's check stays as shipped: its own opt-out is
// data-layout-ignore, which this film did not use. Here, on our side, each contrast finding is looked up again on HF's own page at its
// time (packages/hf-page: HF's bundle and file server, HF seeks), and a finding whose text sits inside an aria-hidden="true" subtree is
// dropped: aria-hidden marks it as not content for anyone, so it is not words a viewer has to read. Anything not found again is kept.
import { createRequire } from "node:module";
import { join } from "node:path";
import { resolveRuntime } from "../version-manager/index.mjs";
import { servePage } from "../hf-page/index.mjs";

/** The contrast findings of `hyperframes check --json` that HF measured on aria-hidden decoration, found again on HF's page:
 *  [{ index, text, time, selector }] (index into j.contrast.findings). Empty when there is nothing to look up or the page cannot open. */
export async function decorationContrast(j, projectDir, { version = null } = {}) {
  const xs = (j?.contrast?.findings ?? []).map((x, index) => ({ index, text: x.text ?? "", time: x.time ?? 0, selector: x.selector ?? "" }))
    .filter((x) => x.selector);
  if (!xs.length) return [];
  let page = null, browser = null;
  try {
    page = await servePage(projectDir, { version });
    const rt = resolveRuntime(version);
    const puppeteer = createRequire(join(rt.dir, "node_modules", "puppeteer-core", "package.json"))("puppeteer-core");
    browser = await puppeteer.launch({ executablePath: page.chromium, headless: true, args: ["--hide-scrollbars"] });
    const tab = await browser.newPage();
    await tab.goto(page.url, { waitUntil: "load", timeout: 60000 });
    await tab.waitForFunction(() => window.__hf && typeof window.__hf.seek === "function" && window.__hf.duration > 0, { timeout: 60000 });
    const size = await tab.evaluate(() => { const r = document.querySelector("[data-composition-id]"); return { width: +r?.getAttribute("data-width") || 1920, height: +r?.getAttribute("data-height") || 1080 }; });
    await tab.setViewport(size);
    const out = [];
    for (const x of xs) {
      const hidden = await tab.evaluate(async ({ time, selector, text }) => {
        window.__hf.seek(time);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        // HF's selector: an id, or the element path from <body> (cli/src/utils/checkBrowser.ts selectorFor)
        let el = null;
        try { el = selector.startsWith("#") ? document.querySelector(selector) : document.body.querySelector(":scope > " + selector); } catch { return false; }
        if (!el || (text && !String(el.textContent ?? "").includes(String(text).trim().slice(0, 40)))) return false;
        return !!el.closest('[aria-hidden="true"]');
      }, x);
      if (hidden) out.push(x);
    }
    return out;
  } catch {
    return [];
  } finally {
    await browser?.close().catch(() => {});
    page?.close();
  }
}

/** HF's check JSON with the decoration findings taken out of its contrast section (counts kept in step); the dropped ones are listed
 *  under contrast.decoration so the record says what was not shown. Returns the same object. */
export async function dropDecorationContrast(j, projectDir, opts = {}) {
  const deco = await decorationContrast(j, projectDir, opts);
  if (!deco.length) return j;
  const drop = new Set(deco.map((x) => x.index));
  const gone = j.contrast.findings.filter((_, i) => drop.has(i));
  j.contrast.findings = j.contrast.findings.filter((_, i) => !drop.has(i));
  for (const [sev, key] of [["error", "errorCount"], ["warning", "warningCount"], ["info", "infoCount"]])
    if (typeof j.contrast[key] === "number") j.contrast[key] = Math.max(0, j.contrast[key] - gone.filter((x) => x.severity === sev).length);
  if (!j.contrast.findings.some((x) => x.severity === "error")) j.contrast.ok = true;
  j.contrast.decoration = deco.map(({ text, time, selector }) => ({ text, time, selector }));
  return j;
}

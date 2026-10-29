// The Studio (data-theme="studio"): every outer page and the shell render their first frame in both themes without an error, and
// The Studio's branch is the one drawn when the theme is set. Rendered on the server through Vite like ui-render.test.mjs; effects do not
// run, so nothing is fetched (each page shows its loading state).
import { join } from "node:path";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

const store = new Map();
globalThis.location ??= { hash: "", href: "http://127.0.0.1/", origin: "http://127.0.0.1", search: "" };
globalThis.localStorage ??= { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.sessionStorage ??= globalThis.localStorage;
globalThis.addEventListener ??= () => {};
globalThis.removeEventListener ??= () => {};
globalThis.innerWidth ??= 1600;
globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.document ??= { documentElement: { dataset: {}, style: { setProperty() {} }, setAttribute() {} }, addEventListener() {}, removeEventListener() {}, getElementById: () => null, hidden: false };

const vite = await createServer({ configFile: join(import.meta.dirname, "..", "ui", "vite.config.js"), server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent",
  optimizeDeps: { noDiscovery: true } });
after(() => vite.close());
const load = (p) => vite.ssrLoadModule(p).then((m) => m.default ?? m);
async function render(el) {
  const { LangProvider } = await vite.ssrLoadModule("/src/i18n.jsx");
  const { ToastProvider } = await vite.ssrLoadModule("/src/lib.jsx");
  return renderToString(h(LangProvider, null, h(ToastProvider, { render: () => null }, el)));
}
const setTheme = (id) => { if (id === "pelagra") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = id; };

const PAGES = [["Projects", "/src/screens/Projects.jsx", "st-projects"], ["Film Styles", "/src/screens/StyleGallery.jsx", "st-styles"],
  ["Characters", "/src/screens/Characters.jsx", "st-chars"], ["Brand Kits", "/src/screens/Looks.jsx", "st-kits"], ["Motion Library", "/src/screens/Library.jsx", "st-motionlib"]];
for (const [name, file, mark] of PAGES) {
  test(`${name} renders in The Desk and in The Studio, and The Studio draws its own layout`, async () => {
    const C = await load(file);
    setTheme("pelagra");
    const desk = await render(h(C));
    assert.ok(desk.length > 0);
    assert.ok(!desk.includes(mark), "The Desk must not draw The Studio's layout");
    setTheme("studio");
    const studio = await render(h(C));
    assert.ok(studio.includes(mark), `The Studio's ${name} has its ${mark} root`);
    setTheme("pelagra");
  });
}

test("the shell: The Studio hangs the pages from the peg bar and has no rail; The Desk keeps its rail", async () => {
  const { Shell } = await vite.ssrLoadModule("/src/App.jsx");
  const { ClaudeProvider } = await vite.ssrLoadModule("/src/workflow/claude.jsx");
  const App = () => h(ClaudeProvider, null, h(Shell));          // App itself opens the presence stream, which keeps a test process alive
  setTheme("studio");
  const studio = await render(h(App));
  assert.match(studio, /class="topbar pegbar"/);
  assert.match(studio, /class="peg-tab"/);
  assert.doesNotMatch(studio, /class="rail"/);
  setTheme("pelagra");
  const desk = await render(h(App));
  assert.match(desk, /class="rail"/);
  assert.doesNotMatch(desk, /pegbar|peg-tab/);
});

test("the theme list offers The Desk first and The Studio, and useThemeId reads the page's theme", async () => {
  const { THEMES } = await vite.ssrLoadModule("/src/theme.jsx");
  assert.deepEqual(THEMES.map((x) => [x.id, x.name]), [["pelagra", "The Desk"], ["studio", "The Studio"]]);
});

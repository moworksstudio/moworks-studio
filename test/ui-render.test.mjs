// A screen that uses a hook it never imported blanked the whole UI, and no test rendered the sheets. Each sheet of the
// Editor and the error boundary are loaded through Vite (the app's own build tool) and rendered once on the server: a missing import or a
// first-render error fails here. Effects do not run, so nothing is fetched.
import { join } from "node:path";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { createElement as h } from "react";
import { renderToString } from "react-dom/server";

// the few browser globals the modules read while they load or render the first time
const store = new Map();
globalThis.location ??= { hash: "", href: "http://127.0.0.1/", origin: "http://127.0.0.1", search: "" };
globalThis.localStorage ??= { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.sessionStorage ??= globalThis.localStorage;
globalThis.addEventListener ??= () => {};
globalThis.removeEventListener ??= () => {};
globalThis.innerWidth ??= 1600;
globalThis.document ??= { documentElement: { dataset: {}, style: {}, setAttribute() {} }, addEventListener() {}, removeEventListener() {}, getElementById: () => null, hidden: false };

const vite = await createServer({ configFile: join(import.meta.dirname, "..", "ui", "vite.config.js"), server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "silent",
  optimizeDeps: { noDiscovery: true } });
after(() => vite.close());
const load = (p) => vite.ssrLoadModule(p).then((m) => m.default ?? m);

async function wrap(el) {
  const { LangProvider } = await vite.ssrLoadModule("/src/i18n.jsx");
  const { ToastProvider } = await vite.ssrLoadModule("/src/lib.jsx");
  return h(LangProvider, null, h(ToastProvider, { render: () => null }, el));
}

for (const [name, file] of [["Checks", "/src/screens/Qa.jsx"], ["Storyboard", "/src/screens/Storyboard.jsx"], ["Motion plan", "/src/screens/MotionPlan.jsx"],
  ["Voice-over", "/src/screens/Voice.jsx"], ["Export to AE", "/src/screens/PortAE.jsx"]]) {
  test(`the ${name} sheet renders its first frame without an error`, async () => {
    const C = await load(file);
    const html = renderToString(await wrap(h(C, { id: "abc123" })));
    assert.ok(html.length > 0);
  });
}

test("the error boundary shows a message and the error instead of a blank screen", async () => {
  const Boundary = await load("/src/ErrorBoundary.jsx");
  const Bad = () => { throw new Error("boom: useStage is not defined"); };
  // renderToString does not run componentDidCatch; getDerivedStateFromError is what the boundary uses to switch to its message
  const state = Boundary.getDerivedStateFromError(new Error("boom"));
  assert.equal(state.error.message, "boom");
  const b = new Boundary({ name: "Checks", children: null });
  b.state = state;
  const html = renderToString(await wrap(b.render()));
  assert.match(html, /role="alert"/);
  assert.match(html, /Something went wrong in Checks/);
  assert.match(html, /boom/);
  assert.equal(typeof Bad, "function");
});

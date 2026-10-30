// The update notice in the shell, in both themes: when the app's own check found a new version, a dot on the way to Settings (the
// rail's Settings item in The Desk, the gear on the peg bar in The Studio) and the slim line "A new version is ready · Update" in the
// top bar, its Update opening Settings › Update; "Later" hides the line for that version only (kept per viewer); the first start after
// an update says once "Updated to the version of {date}". No hash on screen. Rendered on the server through Vite like studio-ui.test.mjs:
// effects do not run, so the shell starts from the answer the test gives it.
import { join } from "node:path";
import { test, after, beforeEach } from "node:test";
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
async function render(el) {
  const { LangProvider } = await vite.ssrLoadModule("/src/i18n.jsx");
  const { ToastProvider } = await vite.ssrLoadModule("/src/lib.jsx");
  return renderToString(h(LangProvider, null, h(ToastProvider, { render: () => null }, el)));
}
const setTheme = (id) => { if (id === "pelagra") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = id; };
async function shell(update) {
  const { Shell } = await vite.ssrLoadModule("/src/App.jsx");
  const { ClaudeProvider } = await vite.ssrLoadModule("/src/workflow/claude.jsx");
  return render(h(ClaudeProvider, null, h(Shell, { update })));
}
const between = (html, from, to) => { const a = html.indexOf(from); assert.ok(a >= 0, `has ${from}`); const b = html.indexOf(to, a + from.length); return html.slice(a, b < 0 ? undefined : b); };

const HASH = "c0ffee12";
const READY = { git: true, configured: true, current: { hash: "a".repeat(40), short: "aaaaaaaa", date: "2026-10-29T10:00:00+07:00", subject: "Old" },
  available: true, latest: { id: HASH, date: "2026-10-30T09:00:00+07:00", subject: "Sound effects in the chat" }, ahead: 2, checkedAt: "2026-10-30T08:01:00.000Z",
  checkError: null, updated: null, check: null };
beforeEach(() => { localStorage.removeItem("mw-update-later"); localStorage.removeItem("mw-update-seen"); setTheme("pelagra"); });

test("a new version: the dot on Settings and the slim line in the top bar, in The Desk and The Studio; none without one", async () => {
  const desk = await shell(READY);
  const line = between(desk, 'class="upd-notice', "</div>");
  assert.match(line, /A new version is ready/);
  assert.match(line, /<a class="upd-go" href="#\/settings\/update"[^>]*>Update<\/a>/, "Update opens Settings › Update");
  assert.match(line, /<button type="button" class="upd-later"[^>]*>Later<\/button>/);
  assert.ok(between(desk, 'class="topbar"', "</header>").includes('class="upd-notice'), "the line is in the top bar");
  assert.match(between(desk, 'class="rail-bottom"', "</nav>"), /href="#\/settings"[\s\S]*class="upd-dot"/, "the dot on the rail's Settings");
  assert.ok(!desk.includes(HASH), "no hash on screen");

  setTheme("studio");
  const studio = await shell(READY);
  assert.match(between(studio, 'class="topbar pegbar"', "</header>"), /class="upd-notice [\s\S]*A new version is ready/);
  assert.match(between(studio, "peg-gear", "</a>"), /class="upd-dot"/, "the dot on the gear");
  assert.match(studio, /aria-label="Settings · A new version is ready"/);
  assert.ok(!studio.includes(HASH));

  for (const theme of ["pelagra", "studio"]) {
    setTheme(theme);
    for (const none of [null, { ...READY, available: false }]) {
      const html = await shell(none);
      assert.ok(!html.includes("upd-notice") && !html.includes("upd-dot"), `${theme}: nothing without a new version`);
    }
  }
});

test("Later hides the line for that version only; the dot stays; a newer version shows the line again", async () => {
  const { useUpdateNotice } = await vite.ssrLoadModule("/src/workflow/UpdateNotice.jsx");
  let notice = null;
  const Probe = () => { notice = useUpdateNotice(READY); return null; };
  await render(h(Probe));
  assert.equal(notice.show, "ready");
  notice.later();          // what the Later button does
  assert.equal(localStorage.getItem("mw-update-later"), HASH, "the version put off is kept for this viewer");

  const later = await shell(READY);
  assert.ok(!later.includes("upd-notice"), "the line is hidden for this version");
  assert.match(between(later, 'class="rail-bottom"', "</nav>"), /class="upd-dot"/, "the dot stays, the way back to it");
  const newer = await shell({ ...READY, latest: { id: "facade34", date: "2026-11-02T09:00:00+07:00", subject: "Newer" } });
  assert.match(newer, /class="upd-notice [\s\S]*A new version is ready/, "a newer version shows the line again");
});

test("Later works without browser storage: the line goes for this window, nothing throws", async () => {
  const { noticeOf } = await vite.ssrLoadModule("/src/workflow/UpdateNotice.jsx");
  assert.equal(noticeOf(READY), "ready");
  assert.equal(noticeOf(READY, { later: HASH }), null);
  assert.equal(noticeOf(READY, { later: "older000" }), "ready");
  assert.equal(noticeOf({ ...READY, available: false }), null);
  assert.equal(noticeOf(null), null);
  const real = globalThis.localStorage;
  const locked = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } };
  Object.defineProperty(globalThis, "localStorage", { value: locked, configurable: true, writable: true });
  try {
    const { useUpdateNotice } = await vite.ssrLoadModule("/src/workflow/UpdateNotice.jsx");
    let notice = null;
    await render(h(() => { notice = useUpdateNotice(READY); return null; }));
    assert.equal(notice.show, "ready");
    assert.doesNotThrow(() => notice.later());
  } finally { Object.defineProperty(globalThis, "localStorage", { value: real, configurable: true, writable: true }); }
});

test("after an update: 'Updated to the version of {date}' once, then not again", async () => {
  const updated = { ...READY, available: false, updated: { id: HASH, date: "2026-10-30T09:00:00+07:00", subject: "Sound effects in the chat" } };
  for (const theme of ["pelagra", "studio"]) {
    setTheme(theme);
    const html = await shell(updated);
    const line = between(html, 'class="upd-notice done', "</div>");
    assert.match(line, /Updated to the version of \d{1,2} [A-Z][a-z]{2} 2026/);
    assert.ok(!html.includes(HASH));
  }
  localStorage.setItem("mw-update-seen", HASH);          // what the line writes once it has been shown
  assert.ok(!(await shell(updated)).includes("upd-notice"));
});

test("Settings: the Update section carries the dot too", async () => {
  const Settings = (await vite.ssrLoadModule("/src/screens/Settings.jsx")).default;
  const props = { section: "update", claude: { loggedIn: true }, onRecheckClaude: () => {} };
  const on = await render(h(Settings, { ...props, updateReady: true }));
  assert.match(between(on, 'class="settings-nav"', "</nav>"), /Update<\/span>[\s\S]*class="upd-dot"/);
  assert.ok(!(await render(h(Settings, props))).includes("upd-dot"));
});

// scrubbing a code film with a fresh smooth preview shows the preview's frame at once and draws the exact frame live only once the
// seeks stop; a stale preview or none seeks live as before; anything that needs the live frame (a click, play, a step) draws it first.
// The preview's host script runs here in a small stand-in for its page (node:vm), with the test's own clock.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const SRC = readFileSync(join(import.meta.dirname, "..", "packages", "hf-preview", "host.js"), "utf8");
const UI = "http://ui.test";

function page() {
  let now = 0, seq = 0;
  const timers = new Map();
  const setTimeout = (fn, ms) => { const id = ++seq; timers.set(id, { at: now + ms, fn }); return id; };
  const clearTimeout = (id) => { timers.delete(id); };
  const advance = (ms) => {
    const end = now + ms;
    for (;;) {
      const next = [...timers.entries()].filter(([, x]) => x.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      timers.delete(next[0]); now = next[1].at; next[1].fn();
    }
    now = end;
  };
  const listeners = (o) => { const ls = {}; o.addEventListener = (k, f) => { (ls[k] ??= []).push(f); }; o.fire = (k, e = {}) => (ls[k] ?? []).forEach((f) => f(e)); return o; };
  const seeks = [];
  const p = listeners({ paused: true, currentTime: 0, duration: 30, playbackRate: 1, muted: false, _runtimeFps: 24,
    seek(t) { seeks.push(t); this.currentTime = t; }, play() { this.paused = false; }, pause() { this.paused = true; },
    iframeElement: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }), contentWindow: { __renderReady: true }, contentDocument: null } });
  const vid = listeners({ style: {}, readyState: 0, currentTime: 0, duration: 30, paused: true, attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return k === "src" ? this.src ?? null : this.attrs[k] ?? null; },
    play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; } });
  const ov = listeners({});
  const sent = [];
  const win = listeners({});
  const document = {
    body: { dataset: { ui: UI, w: "1920", h: "1080", src: "/p/x/index.html" }, insertBefore() {} },
    getElementById: (id) => (id === "p" ? p : id === "ov" ? ov : { textContent: "", appendChild() {} }),
    createElement: (k) => (k === "video" ? vid : { style: {}, appendChild() {}, set textContent(_) {} }),
  };
  Object.assign(win, { document, setTimeout, clearTimeout, performance: { now: () => now }, requestAnimationFrame: () => 0, CSS: { escape: (s) => s },
    parent: { postMessage: (m) => sent.push(m) } });
  vm.runInNewContext(SRC, win);
  const msg = (type, data = {}) => win.fire("message", { origin: UI, data: { source: "mw-ui", type, ...data } });
  return { p, vid, ov, seeks, sent, msg, advance };
}

test("a fresh preview: fast seeks show the preview's frame, the exact frame is drawn live once, 250 ms after the last", () => {
  const { p, vid, seeks, msg, advance } = page();
  msg("proxy", { url: "/p/x/.moworks/cache/proxy/a.mp4", fresh: true, duration: 30 });
  vid.readyState = 4;
  for (const t of [1, 1.5, 2, 2.5, 3]) { msg("seek", { time: t }); advance(40); }
  assert.deepEqual(seeks, [], "no live draw while the mouse moves");
  assert.equal(vid.style.display, "block");
  assert.equal(vid.currentTime, 3, "the preview shows the last frame asked for");
  advance(250);
  assert.deepEqual(seeks, [3], "one live draw, at the last time");
  assert.equal(p.currentTime, 3);
  advance(2600);
  assert.equal(vid.style.display, "none", "the preview's frame goes once the page has drawn its own");
});

test("no preview, a stale one, or one not loaded yet: every seek is drawn live at once, as before", () => {
  for (const setup of [() => {}, (x) => x.msg("proxy", { url: "/a.mp4", fresh: false }), (x) => x.msg("proxy", { url: "/a.mp4", fresh: true })]) {
    const x = page();
    setup(x);          // the third: fresh, but its video has no frame yet (readyState 0)
    x.msg("seek", { time: 2 }); x.msg("seek", { time: 4 });
    assert.deepEqual(x.seeks, [2, 4]);
    assert.notEqual(x.vid.style.display, "block");
  }
});

test("what needs the live frame draws a waiting scrub first: a click on the film, a step, play from where the scrub stopped", () => {
  const a = page();
  a.msg("proxy", { url: "/a.mp4", fresh: true, duration: 30 }); a.vid.readyState = 4;
  a.msg("seek", { time: 5 });
  a.ov.fire("pointerdown");
  assert.deepEqual(a.seeks, [5], "a click picks on the exact frame");

  const b = page();
  b.msg("proxy", { url: "/a.mp4", fresh: true, duration: 30 }); b.vid.readyState = 4;
  b.msg("seek", { time: 5 });
  b.msg("step", { frames: 1 });
  assert.equal(b.seeks[0], 5);
  assert.equal(b.seeks.at(-1), 5 + 1 / 24, "one frame on from the scrubbed time");
  assert.equal(b.vid.style.display, "none");

  const c = page();
  c.msg("proxy", { url: "/a.mp4", fresh: true, duration: 30 }); c.vid.readyState = 4;
  c.msg("seek", { time: 7 });
  c.msg("play");
  assert.equal(c.vid.currentTime, 7, "the preview plays from the scrubbed time");
  assert.equal(c.vid.paused, false);
  c.advance(1000);
  assert.deepEqual(c.seeks, [7], "no second live draw after play began");
});

test("while the smooth preview plays or a scrub waits, the live player's own time never reaches the UI (the clock flashed back)", async () => {
  const a = page();
  a.msg("proxy", { url: "/a.mp4", fresh: true, duration: 30 }); a.vid.readyState = 4;
  a.p.currentTime = 12;
  a.msg("play");
  await Promise.resolve();
  a.vid.currentTime = 13.5;
  for (let k = 0; k < 5; k++) { a.advance(100); a.p.fire("timeupdate"); a.p.fire("pause"); }          // HF reports its paused time on its own
  const stale = a.sent.filter((m) => m.type === "time" && m.time === 12 && m.paused);
  assert.deepEqual(stale, [], "no message carries the live player's paused time");
  assert.ok(a.sent.some((m) => m.type === "time" && m.paused === false), "the preview's time does");
  a.msg("pause");
  a.advance(100); a.p.fire("timeupdate");
  assert.equal(a.sent.filter((m) => m.type === "time").at(-1).time, 13.5, "on pause the live player follows, at the preview's time");

  const b = page();
  b.msg("proxy", { url: "/a.mp4", fresh: true, duration: 30 }); b.vid.readyState = 4;
  b.msg("seek", { time: 8 });
  b.advance(100); b.p.fire("timeupdate");
  assert.deepEqual(b.sent.filter((m) => m.type === "time").map((m) => m.time), [8], "a waiting scrub keeps its time");
});

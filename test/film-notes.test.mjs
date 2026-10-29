// Notes pinned to a time in the film, sent with the user's chat message: each note's time, shot, place and still for Claude
// (a note that does not fit is Claude's to ask about first, §2b), its frame for the chat card. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chatNotes, cleanNote, noteProblems, shotAt } from "../packages/server/filmNotes.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-film-notes-"));
after(() => rmSync(T, { recursive: true, force: true }));
const SHOTS = [{ number: 1, title: "Open", start: 0, duration: 2 }, { number: 2, title: "Middle", start: 2, duration: 2 }, { number: 3, title: "End", start: 4, duration: 2 }];

test("a note's shot comes from its time; its point and box stay on the frame; what does not fit is named", () => {
  assert.equal(shotAt(SHOTS, 2.5).number, 2); assert.equal(shotAt(SHOTS, 0).number, 1); assert.equal(shotAt(SHOTS, 9).number, 3);
  const n = cleanNote({ t: 3.237, x: 1.4, y: 0.5, text: "Cho logo to hơn" }, SHOTS);
  assert.deepEqual([n.t, n.shot, n.x, n.y, n.text], [3.24, 2, 1, 0.5, "Cho logo to hơn"]);
  assert.match(n.id, /^[0-9a-f]{10}$/);
  assert.deepEqual(cleanNote({ t: 1, box: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 }, text: "x" }, SHOTS).box, { x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
  assert.deepEqual(noteProblems(cleanNote({ t: 3, text: "cảnh 2 sáng hơn" }, SHOTS), SHOTS, 6), []);
  assert.match(noteProblems(cleanNote({ t: 3, text: "@Shot_3: chữ to hơn" }, SHOTS), SHOTS, 6)[0], /names shot 3, but at 0:03.0 the film shows shot 2/);
  assert.match(noteProblems(cleanNote({ t: 3, text: "shot 7" }, SHOTS), SHOTS, 6)[0], /names shot 7, and the film has 3 shots/);
  assert.match(noteProblems(cleanNote({ t: 8, text: "x" }, SHOTS), SHOTS, 6)[0], /past the film's end/);
});

function film(name) {
  const d = join(T, name);
  mkdirSync(join(d, "compositions"), { recursive: true });
  writeFileSync(join(d, "index.html"), '<div id="main" data-composition-id="main" data-start="0" data-duration="6" data-width="1920" data-height="1080" data-fps="30"></div>');
  writeFileSync(join(d, "STORYBOARD.md"), ["# Film", "", ...SHOTS.flatMap((s) => [`## Frame ${s.number} — ${s.title}`, "", "- duration: 2s", ""])].join("\n"));
  return d;
}

test("notes pinned on the film go in the chat message: Claude gets each note's time, shot, place and still, the card its frame with the point or box", async () => {
  const d = film("chat");
  const snap = async (_dir, times, out) => { times.forEach((t, i) => writeFileSync(join(out, `frame-${String(i).padStart(2, "0")}-at-${t}s.png`), "png")); return { exitCode: 0, stderrTail: [] }; };
  const ctx = { preview: { base: "http://x" }, stopping: { signal: null }, agent: { running: new Map() } };
  const p = { id: "abc300", path: d, meta: {} };
  assert.equal(await chatNotes(ctx, p, { text: "Sửa giúp" }), null, "a message with no notes: a chat message as before");
  assert.equal(await chatNotes(ctx, p, { text: "x", notes: [{ t: 1, text: " " }] }, { snap }), null, "notes with no words: nothing to pin");
  const said = "[0:03.4 · Shot 2] Logo lệch phải\n[0:09.0 · Shot 5] Chữ nhỏ quá";
  const n = await chatNotes(ctx, p, { text: said, notes: [{ t: 9, x: 0.5, y: 0.5, text: "Chữ nhỏ quá" }, { t: 3.4, box: { x: 0.6, y: 0.1, w: 0.3, h: 0.2 }, text: "Logo lệch phải" }] }, { snap });
  assert.equal(n.shown, said, "the chat shows the message as the owner wrote it");
  assert.ok(n.text.startsWith(said) && n.text.includes("pinned 2 note(s)"));
  assert.ok(n.text.includes('1. At 0:03.4 (shot 2 "Middle"), the box at 60 % across, 10 % down, 30 × 20 % of the frame: Logo lệch phải\n   Still of that frame: .moworks/cache/posters/notes/'));
  assert.ok(n.text.includes("2. At 0:09.0 (shot 3 \"End\"), the point 50 % across and 50 % down the frame: Chữ nhỏ quá"));
  assert.ok(n.text.includes("is a conflict (moworks-studio §2b)") && n.text.includes("note 2: its time 0:09.0 is past the film's end (0:06.0)"), "past the end: Claude checks it first");
  assert.deepEqual(n.media.map((m) => [m.t, m.shot, m.text, m.box ?? null, m.x ?? null]), [[3.4, 2, "Logo lệch phải", { x: 0.6, y: 0.1, w: 0.3, h: 0.2 }, null], [9, 3, "Chữ nhỏ quá", null, 0.5]]);
  assert.ok(n.media.every((m) => m.url.startsWith("http://x/p/abc300/.moworks/cache/posters/notes/")), "URLs, never a path");
  ctx.agent.running.set("abc300", "t9");
  await assert.rejects(chatNotes(ctx, p, { text: "x", notes: [{ t: 1, text: "a" }] }, { snap }), /still working/);
  ctx.agent.running.clear();
  await assert.rejects(chatNotes(ctx, p, { text: "x", notes: Array.from({ length: 51 }, () => ({ t: 1, text: "a" })) }, { snap }), /At most 50/);
});

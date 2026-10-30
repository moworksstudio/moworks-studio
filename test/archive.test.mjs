// Imported archives (Test 25: a .rar of fonts and a .zip of logos stayed archives): unpacked with Windows' tar, their files listed for the
// normal import, programs and a Mac's own files left out, and the guards: no entry outside the folder (zip-slip), caps on the count and the
// unpacked size, a file tar cannot read said in plain words. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { archiveMessage, listArchive, tarPath, unpackArchive, unsafeEntry } from "../packages/project-service/archive.mjs";
import { storedZip } from "./support/zip.mjs";

const T = mkdtempSync(join(tmpdir(), "mw-archive-"));
after(() => rmSync(T, { recursive: true, force: true }));
const skip = !existsSync(tarPath()) && "Windows' tar.exe is not on this computer";
const zip = (name, entries) => { const f = join(T, name); writeFileSync(f, storedZip(entries)); return f; };

test("an entry name that would land outside its folder", () => {
  for (const n of ["../evil.txt", "a/../../evil.txt", "..\\evil.txt", "/etc/passwd", "\\abs.txt", "C:/Windows/x.dll", "c:x.txt"]) assert.equal(unsafeEntry(n), true, n);
  for (const n of ["logo.png", "fonts/Bebas Neue.ttf", "a..b.txt", "..hidden/x.txt", "Thư mục/ảnh.png"]) assert.equal(unsafeEntry(n), false, n);
});

test("a zip is unpacked: its files with their sizes, folders read, programs and a Mac's own files left out", { skip }, async () => {
  const f = zip("pack.zip", [{ name: "logo.png", data: "png" }, { name: "fonts/Brand Sans.ttf", data: "ttf!" }, { name: "Readme.txt", data: "read me" },
    { name: "__MACOSX/._logo.png", data: "x" }, { name: ".DS_Store", data: "x" }, { name: "tools/setup.exe", data: "MZ" }]);
  const l = await listArchive(f);
  assert.equal(l.ok, true);
  assert.deepEqual(l.entries.find((e) => e.name === "fonts/Brand Sans.ttf"), { name: "fonts/Brand Sans.ttf", dir: false, size: 4 });
  const u = await unpackArchive(f);
  try {
    assert.equal(u.ok, true, JSON.stringify(u));
    assert.deepEqual(u.files.map((x) => [x.rel, x.name, x.size]).sort(), [["Readme.txt", "Readme.txt", 7], ["fonts/Brand Sans.ttf", "Brand Sans.ttf", 4], ["logo.png", "logo.png", 3]]);
    assert.equal(readFileSync(u.files.find((x) => x.name === "logo.png").abs, "utf8"), "png");
    assert.deepEqual(u.skipped, ["setup.exe"]);
  } finally { u.cleanup?.(); }
  assert.ok(!existsSync(u.dir), "its folder is removed");
});

test("the guards: zip-slip, too many files, too large unpacked, an archive tar cannot read; nothing is left on disk", { skip }, async () => {
  const before = readdirSync(tmpdir()).filter((n) => n.startsWith("mw-unpack-")).length;
  const slip = await unpackArchive(zip("slip.zip", [{ name: "ok.txt", data: "ok" }, { name: "../evil.txt", data: "evil" }]));
  assert.deepEqual([slip.ok, slip.reason], [false, "unsafe"]);
  assert.ok(!existsSync(join(T, "evil.txt")) && !existsSync(join(tmpdir(), "evil.txt")), "nothing written outside");
  const two = zip("two.zip", [{ name: "a.txt", data: "aaaa" }, { name: "b.txt", data: "bbbb" }]);
  assert.deepEqual([(await unpackArchive(two, { maxFiles: 1 })).reason, (await unpackArchive(two, { maxBytes: 5 })).reason], ["too-many", "too-large"]);
  const bad = join(T, "Font Bebas Nue.rar"); writeFileSync(bad, Buffer.from("this is no archive at all, just text"));
  assert.deepEqual([(await unpackArchive(bad)).ok, (await unpackArchive(bad)).reason], [false, "unreadable"]);
  assert.equal((await unpackArchive(zip("empty.zip", [{ name: "folder/", data: "" }]))).reason, "empty");
  assert.equal(readdirSync(tmpdir()).filter((n) => n.startsWith("mw-unpack-")).length, before, "no unpack folder left behind");
});

test("what the import result says about an archive it could not open: its name, plain words, never a path", () => {
  assert.equal(archiveMessage("Font Bebas Nue.rar", "unreadable"), "Could not open Font Bebas Nue.rar; unpack it and add the files.");
  assert.equal(archiveMessage("x.zip", "timeout"), "Could not open x.zip; unpack it and add the files.");
  assert.match(archiveMessage("x.zip", "unsafe"), /^Did not open x\.zip: it has files that point outside it\. Unpack it and add the files\.$/);
  assert.match(archiveMessage("x.zip", "too-many"), /over 2000 files/);
  assert.match(archiveMessage("x.zip", "too-large"), /over 4 GB unpacked/);
  assert.equal(archiveMessage("x.zip", "empty"), "x.zip has no files to add.");
});

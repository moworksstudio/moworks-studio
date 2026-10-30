// The user's characters backed up beside the app (owner 30/10: "back up luôn library nhân vật của tao, trừ models"): one archive
// (characters.tar, Windows' own tar.exe) written only when a file changed, the restore note saying how to unpack it. Run: npm test
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const T = mkdtempSync(join(tmpdir(), "mw-backup-chars-"));
after(() => rmSync(T, { recursive: true, force: true }));
process.env.MW_BACKUP_ROOT = join(T, "drive", "backup");
process.env.MW_CHARACTERS_ROOT = join(T, "library", "characters");
mkdirSync(join(T, "drive"), { recursive: true });

test("the characters go to the backup folder as one archive, again only when they change; it unpacks to the same files", async () => {
  const { backupCharacters, status } = await import("../packages/backup/index.mjs");
  const { tarPath } = await import("../packages/project-service/archive.mjs");
  assert.equal(backupCharacters().skipped, "no characters yet");
  const c = join(process.env.MW_CHARACTERS_ROOT, "user", "bo");
  mkdirSync(c, { recursive: true });
  writeFileSync(join(c, "character.json"), JSON.stringify({ name: "Bơ" }));
  writeFileSync(join(c, "sheet.webp"), Buffer.alloc(2048, 7));
  const a = backupCharacters();
  assert.equal(a.written, true);
  assert.equal(a.files, 2);
  assert.equal(backupCharacters().skipped, "unchanged");
  writeFileSync(join(c, "walk.mp4"), Buffer.alloc(1024, 3));
  assert.equal(backupCharacters().files, 3, "a new file: written again");
  assert.equal(status().characters.files, 3);
  const out = join(T, "restored"); mkdirSync(out);
  execFileSync(tarPath(), ["-xf", join(process.env.MW_BACKUP_ROOT, "characters.tar"), "-C", out], { windowsHide: true });
  assert.equal(JSON.parse(readFileSync(join(out, "user", "bo", "character.json"), "utf8")).name, "Bơ");
  assert.match(readFileSync(join(process.env.MW_BACKUP_ROOT, "README.md"), "utf8"), /tar -xf "characters\.tar"/);
});

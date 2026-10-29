// Does the app need `npm install`? (the launcher runs it on a new computer and after package-lock.json changes.)
// Exit code 1: yes (no node_modules yet, or package-lock.json is newer than the install npm recorded); 0: no.
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, ".."), lock = join(root, "package-lock.json"), done = join(root, "node_modules", ".package-lock.json");
process.exitCode = !existsSync(done) || (existsSync(lock) && statSync(lock).mtimeMs > statSync(done).mtimeMs) ? 1 : 0;

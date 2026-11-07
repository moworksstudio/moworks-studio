// A JSON file written whole or not at all, one way for the app (audit/112 2.8, its second look r2.4: five copies of it): to a file beside
// it, then moved in place, so a reader never meets half a file (a check's results cut off mid-write read as an error the next time).
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** v as pretty JSON at p (its folder made when missing). */
export function writeJson(p, v) {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p + ".tmp", JSON.stringify(v, null, 2) + "\n");
  renameSync(p + ".tmp", p);
}

/** The JSON at p, or `d` (null when not given) when it is missing or not JSON: the one reader for the app (audit/112 2.8: 41 copies). */
export function readJson(p, d = null) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; }
}

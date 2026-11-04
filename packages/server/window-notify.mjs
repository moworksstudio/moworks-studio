// The app window's answer to "Allow notifications?" (audit/96). The browser keeps it per address, and the app has a new port at every
// start, so the window would ask again each time. Before the window opens, the launcher (cli.mjs) carries the user's last answer
// (Allow or Block, given once) to this start's address in the app profile's own settings. Nothing is written when the user never
// answered; the answers for the app's older ports are dropped. Only this computer's own addresses are touched.
import { readFileSync, writeFileSync } from "node:fs";

const OURS = /^http:\/\/(127\.0\.0\.1|localhost):\d+,\*$/;

/** True when the profile's settings file was changed. `prefsPath`: <profile>/Default/Preferences; `url`: the app's address this start. */
export function carryNotifyAnswer(prefsPath, url) {
  let origin; try { const u = new URL(url); origin = `${u.protocol}//${u.host}`; } catch { return false; }
  let j; try { j = JSON.parse(readFileSync(prefsPath, "utf8")); } catch { return false; }
  const n = j?.profile?.content_settings?.exceptions?.notifications;
  if (!n || typeof n !== "object") return false;
  const ours = Object.keys(n).filter((k) => OURS.test(k) && Number.isInteger(n[k]?.setting));
  if (!ours.length) return false;
  const key = `${origin},*`;
  const last = ours.map((k) => ({ k, at: Number(n[k].last_modified ?? 0) })).sort((a, b) => b.at - a.at)[0].k;
  if (ours.length === 1 && last === key) return false;
  const keep = n[last];
  for (const k of ours) delete n[k];
  n[key] = keep;
  try { writeFileSync(prefsPath, JSON.stringify(j)); return true; } catch { return false; }
}

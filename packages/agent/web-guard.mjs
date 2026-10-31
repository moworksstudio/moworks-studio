// Claude Code PreToolUse hook on WebSearch: a product's features are searched only after the owner's yes (moworks-studio §2c). The answer is read from the project at the moment of the
// search, so a yes in this conversation opens the search at once. Asked nothing yet: blocked with what to do; a film that shows no product says so with one call. No: blocked, but for
// the music step's own site. Env: MW_PROJECT (the project folder).
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MUSIC_ONLY = (input = {}) => {
  const host = (d) => /(^|\.)mixkit\.co$/i.test(String(d).replace(/^\*\./, ""));
  return (Array.isArray(input.allowed_domains) && input.allowed_domains.length > 0 && input.allowed_domains.every(host)) || /\bsite:(\w+\.)?mixkit\.co\b/i.test(String(input.query ?? ""));
};
/** { block: false } or { block: true, message }. answer: the project's research answer ("yes", "no", "not-product") or null. */
export function decideSearch(answer, input) {
  if (answer === "yes" || answer === "not-product" || MUSIC_ONLY(input)) return { block: false };
  if (answer === "no") return { block: true, message: "Not searched: the owner said no to searching the web for this film. Work from what they gave you; say so in one line if something is missing." };
  return { block: true, message: "Not searched yet. If this film shows a product the owner brought, its features are searched only after the owner's yes: ask them, as moworks-studio §2c says, and record their answer with the app's product_research tool. If the film shows no product, call product_research with \"not-product\", then search again." };
}
async function main() {
  let text = "";
  for await (const ch of process.stdin) text += ch;
  let ev = {}; try { ev = JSON.parse(text); } catch { process.exit(0); }
  let answer = null;
  try { answer = JSON.parse(readFileSync(join(process.env.MW_PROJECT || ev.cwd || process.cwd(), ".moworks", "project.json"), "utf8")).research?.answer ?? null; } catch { /* no project: no rule */ process.exit(0); }
  const d = decideSearch(answer, ev.tool_input);
  if (d.block) { process.stderr.write(d.message); process.exit(2); }
  process.exit(0);
}
if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) main();

// node tools/gate.mjs <check module under anidoodle/>: the character gate, the author's way (see mw.mjs); exit 1 on any failure
import { gate } from "./mw.mjs";
const [entry] = process.argv.slice(2);
if (!entry) { console.error("usage: node tools/gate.mjs <check module>"); process.exit(2); }
try { const r = await gate(process.cwd(), entry); process.exit(r.fail ? 1 : 0); }
catch (e) { console.error(e.stack ?? e.message); process.exit(1); }

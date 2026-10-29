// npm run hf -- status | install <v> | smoke <v> | switch <v> | rollback | remove <v>
// switch always runs the smoke test first and refuses on failure.
import { join } from "node:path";
import * as vm from "./index.mjs";
import { smoke } from "../hf-render-worker/client.mjs";

const [cmd, arg] = process.argv.slice(2);
const FIXTURE = join(vm.APP_ROOT, "test", "fixtures", "minimal");
const OUT = join(vm.APP_ROOT, "test-output");

async function runSmoke(v) {
  const s = await smoke(v, FIXTURE, OUT);
  console.log(`smoke ${v}: ${s.ok ? "PASS" : "FAIL"} (${s.result.type}${s.result.code ? " " + s.result.code : ""}, ${s.result.totalFrames ?? "-"} frames, ${s.result.wallMs} ms)`);
  return s.ok;
}

try {
  if (cmd === "status" || !cmd) {
    const st = vm.readState();
    console.log(JSON.stringify({ installed: vm.installed(), current: st.current, previous: st.previous, default: vm.loadPins().hyperframes.default }, null, 2));
  } else if (cmd === "install") {
    console.log(JSON.stringify(vm.install(arg)));
  } else if (cmd === "smoke") {
    process.exitCode = (await runSmoke(arg)) ? 0 : 1;
  } else if (cmd === "switch") {
    const ok = await runSmoke(arg);
    const st = vm.switchTo(arg, { smokeOk: ok });
    console.log(`current ${st.current}, previous ${st.previous}`);
  } else if (cmd === "rollback") {
    const st = vm.rollback();
    console.log(`rolled back: current ${st.current}, previous ${st.previous}`);
  } else if (cmd === "remove") {
    vm.remove(arg);
    console.log(`removed ${arg}`);
  } else {
    console.log("usage: npm run hf -- status | install <v> | smoke <v> | switch <v> | rollback | remove <v>");
    process.exitCode = 2;
  }
} catch (e) {
  console.error(`hf ${cmd}: ${e.message}`);
  process.exitCode = 1;
}

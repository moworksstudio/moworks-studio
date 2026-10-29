// node packages/intake-library/cli.mjs build                       build the store from items/ (no browser)
// node packages/intake-library/cli.mjs previews [--lanes 3] [--only uid,uid] [--author magicui] [--force] [--retry-failed]
//                                                                   check and render the previews that are missing or out of date
// node packages/intake-library/cli.mjs status                      counts and the items that failed
// Lanes are separate processes (HF's check runs synchronously); each takes every n-th item, results merge into the catalog at the end.
import { buildStore, currentStore, items, mergePreviews } from "./index.mjs";

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k, d = null) => { const i = args.indexOf(`--${k}`); return i < 0 ? d : args[i + 1]; };
const flag = (k) => args.includes(`--${k}`);

async function previews() {
  const { renderPreviews } = await import("./previews.mjs");
  const t0 = Date.now();
  const r = await renderPreviews({ lanes: Number(opt("lanes", 3)), only: opt("only")?.split(",") ?? null, author: opt("author"), force: flag("force"), retryFailed: flag("retry-failed"),
    onProgress: (m) => console.log(`[${m.done}/${m.total}] ${m.uid} ${m.error ? "FAILED " + m.error : `${m.seconds}s ${m.vi}`}`) });
  console.log(`previews: ${r.done} done, ${r.failed} failed, ${Math.round((Date.now() - t0) / 1000)} s`);
}

async function lane() {
  const { previewOne } = await import("./previews.mjs");
  const uids = (args[1] ?? "").split(",").filter(Boolean);
  for (const uid of uids) {
    const it = items().find((x) => x.uid === uid);
    if (!it) continue;
    const r = await previewOne(it);
    process.send?.({ uid, error: r.error ?? null, seconds: r.preview?.seconds ?? null, vi: r.vi ?? null });
  }
}

if (cmd === "build") console.log(JSON.stringify(await buildStore()));
else if (cmd === "previews") await previews();
else if (cmd === "lane") await lane();
else if (cmd === "status") {
  mergePreviews();
  const st = currentStore();
  console.log(JSON.stringify(st?.manifest ?? null, null, 2));
  for (const x of items().filter((x) => x.previewError || (x.check && !x.check.pass))) console.log(`${x.uid}: ${x.previewError ?? ""} ${JSON.stringify(x.check?.findings ?? [])}`.slice(0, 600));
} else console.log("usage: build | previews [--lanes n] [--only uids] [--author a] [--force] [--retry-failed] | status");

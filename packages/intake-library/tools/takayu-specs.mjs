// node packages/intake-library/tools/takayu-specs.mjs <motion-reference-takayustudio-manifest.json> > packages/intake-library/takayu/specs.json
// The TakayuStudio intake's own words: for each of the 782 motions of motion-reference.takayustudio.jp (read 12/10/2026), the checked
// spec written in the intake report (names, timings, eases and values: ideas and numbers, never the site's code), its Vietnamese title and
// description, tags and the site's category. Kept in the app so the build does not read the Drive. The retired kit is no longer named:
// "Kit đã có: ..." sentences are dropped from the descriptions.
import { readFileSync } from "node:fs";

const src = JSON.parse(readFileSync(process.argv[2], "utf8"));
const clean = (s = "") => s.replace(/\s*Kit (?:đã )?có[^.]*\.?/g, "").replace(/\s+/g, " ").trim();
const out = src.items.map((x) => ({
  name: x.name, site: x.site_id, category: x.site_category, batch: x.batch, lib: x.lib, kind: x.kind, title: x.title, titleVi: x.title_vi,
  descVi: clean(x.desc_vi), paramsVi: x.params_vi ?? "", tags: x.tags ?? [], spec: x.spec, demo: x.demo ?? "", lesson: x.status === "skip",
  upstream: x.upstream_credit ?? null,
}));
process.stdout.write(JSON.stringify({ source: "motion-reference.takayustudio.jp, read 2026-10-12; specs from the intake report (reference/intake, 2026-10-12)", items: out }, null, 1) + "\n");

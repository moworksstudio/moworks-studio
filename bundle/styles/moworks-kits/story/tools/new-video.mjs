#!/usr/bin/env node
// new-video.mjs — start a new video in one command, in either style:
//   node tools/new-video.mjs <slug> --style stickman|inner-voice [--seconds 20] [--title "What If You Could Fly?"]
// Creates (never overwrites):
//   src/videos/<slug>/<Name>.tsx     the Remotion wrapper (fonts, the canvas stage, cues, SOUND)
//   src/videos/<slug>/<slug>.js      the scenes + the time table (stickman: shot table S · inner-voice: beat table T)
//   projects/<slug>/PLAN.md          the plan to fill in (script + shot list, or story + beat sheet) and the QC report
// registers the composition in src/Root.tsx and src/soundtracks.ts (between the @videos markers) and runs the syntax
// check. Then: write the script/story, replace the time table, build the shots, check stills.
import fs from "fs";
import path from "path";
import { ROOT, args, pascal, run } from "./lib.mjs";

const o = args(process.argv.slice(2));
const [raw] = o._;
const style = o.style;
if (!raw || !["stickman", "inner-voice"].includes(style)) {
  console.error('usage: node tools/new-video.mjs <slug> --style stickman|inner-voice [--seconds 20] [--title "…"]');
  process.exit(1);
}
const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
if (!/^[a-z]/.test(slug)) {
  console.error("✗ the slug must start with a letter (e.g. could-fly)");
  process.exit(1);
}
const name = pascal(slug);
const seconds = Number(o.seconds || (style === "stickman" ? 40 : 20));
const title = o.title || name.replace(/([a-z])([A-Z])/g, "$1 $2");
// the title card's two lines (stickman): "WHAT IF YOU COULD" / "FLY?"
const words = title.replace(/[?!.]+$/, "").toUpperCase().split(/\s+/);
const payoff = `${words.length > 1 ? words.pop() : words[0]}?`;
const line1 = words.length ? words.join(" ") : "WHAT IF";
const fill = (s) =>
  s
    .replaceAll("__NAME__", name)
    .replaceAll("__SLUG__", slug)
    .replaceAll("__TITLE__", title.replace(/"/g, "'"))
    .replaceAll("__SECONDS__", String(seconds))
    .replaceAll("__TITLE_LINE1__", line1.replace(/"/g, ""))
    .replaceAll("__TITLE_PAYOFF__", payoff.replace(/"/g, ""));
const tpl = (f) => fs.readFileSync(path.join(ROOT, "templates", style, f), "utf8");
const write = (rel, text) => {
  const dst = path.join(ROOT, rel);
  if (fs.existsSync(dst)) {
    console.log(`  kept   ${rel} (exists)`);
    return;
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, text);
  console.log(`  wrote  ${rel}`);
};

write(`src/videos/${slug}/${name}.tsx`, fill(tpl("Video.template.tsx")));
write(`src/videos/${slug}/${slug}.js`, fill(tpl("video.template.js")));
const plan =
  style === "stickman"
    ? `# ${slug}: "${title}" (Stickman Explainer, about ${seconds} s)\n\nComposition \`${name}\` · src/videos/${slug}/ · voice public/videos/${slug}/voice.wav · words projects/${slug}/words.json\n\n` +
      `## Script (one paragraph per act; SCRIPT.md)\n…\n\n## Facts (claim · as spoken · source · checked)\n| | | | |\n|---|---|---|---|\n\n` +
      `## Voice (VOICE.md: tool, voices, cost)\n…\n\n## Shots (one spoken line = one shot; the table S)\n| s | Line | Picture |\n|---|---|---|\n| 0 | … | … |\n\n## QC\n(filled in after the render: tools/qc.mjs)\n`
    : `# ${slug}: "${title}" (Inner Voice Short, ${seconds} s)\n\nComposition \`${name}\` · src/videos/${slug}/\n\n` +
      `## Story\nPremise, want, the voice's excuse, the arc (STORY.md → the formula).\n\n` +
      `## Beats (the table T)\n| t (s) | Picture | Words | Sound |\n|---|---|---|---|\n| 0–3 | black | white: … | room tone |\n\n## QC\n(filled in after the render: tools/qc.mjs)\n`;
write(`projects/${slug}/PLAN.md`, plan);

// register (idempotent)
const rootF = path.join(ROOT, "src/Root.tsx");
let root = fs.readFileSync(rootF, "utf8");
const id = `V_${slug.replace(/-/g, "_")}`;
if (!root.includes(`./videos/${slug}/${name}"`)) {
  root = root.replace("// @videos-imports", `import * as ${id} from "./videos/${slug}/${name}";\n// @videos-imports`);
  root = root.replace(
    "{/* @videos-compositions */}",
    `<Composition id="${name}" component={${id}.${name}} durationInFrames={${id}.FRAMES} fps={${id}.FPS} width={${id}.WIDTH} height={${id}.HEIGHT} />\n      {/* @videos-compositions */}`,
  );
  fs.writeFileSync(rootF, root);
  console.log(`  registered ${name} in src/Root.tsx`);
}
const stF = path.join(ROOT, "src/soundtracks.ts");
let st = fs.readFileSync(stF, "utf8");
if (!st.includes(`./videos/${slug}/${name}"`)) {
  st = st.replace("// @videos-soundtracks", `export { SOUND as ${name} } from "./videos/${slug}/${name}";\n// @videos-soundtracks`);
  fs.writeFileSync(stF, st);
  console.log(`  registered ${name} in src/soundtracks.ts`);
}
run(process.execPath, [path.join(ROOT, "tools/check.mjs")]);
const skill = style === "stickman" ? "stickman-explainer" : "inner-voice-short";
console.log(`\n✓ ${name} (${style === "stickman" ? "Stickman Explainer" : "Inner Voice Short"}) is ready to build.
  next: follow .claude/skills/${skill}/SKILL.md; plan in projects/${slug}/PLAN.md, scenes in src/videos/${slug}/${slug}.js,
        then: node tools/stills.mjs ${name} out/${slug}/stills-1 auto --sheet`);

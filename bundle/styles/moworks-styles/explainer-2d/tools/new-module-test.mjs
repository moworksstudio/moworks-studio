// new-module-test.mjs: make (or refresh) a test page for one art module, so it can be snapshotted alone.
//   node tools/new-module-test.mjs videos/<slug> <module> [--format wide|tall] [--key <name>] [--with a,b] [--reset]
// <module> is the file name in story/ without .js (e.g. inj-clinic). The page goes to videos/<slug>/tests/<module>/:
//   index.html   engine/harness/index.html at the video's size (or --format), with the module's script tag
//   test.js      the states to draw, one per second (written once; edit it freely)
//   ex/          the engine, fonts and GSAP (synced by tools/sync-engine.mjs)
//   story/       copies of the video's story/film-pal.js, story/<module>.js and any --with scripts
// Run it again after every edit of the module: it refreshes ex/ and the copies and keeps your test.js.
// --key names the module on window.HOUSE (default: the part after the first dash, inj-clinic → clinic).
// --reset rewrites index.html and test.js from the harness. --with adds other story scripts the module needs.
import fs from "node:fs";
import path from "node:path";
import { ROOT, args, fail, filmOf, run, videoDirOf } from "./lib.mjs";

const USAGE = "usage: node tools/new-module-test.mjs videos/<slug> <module> [--format wide|tall] [--key <name>] [--with a,b] [--reset]";
const o = args(process.argv.slice(2), ["reset"]);
const [dirArg, modArg] = o._;
const video = videoDirOf(dirArg, USAGE);
if (!modArg) fail(USAGE);
const mod = path.basename(modArg).replace(/\.js$/, "");
if (!/^[a-z0-9][a-z0-9_-]*$/i.test(mod)) fail(`"${mod}" is not a module file name (letters, digits, - and _ only, e.g. inj-clinic)`);
const key = o.key || (mod.includes("-") ? mod.slice(mod.indexOf("-") + 1) : mod).replace(/[-_]([a-z0-9])/gi, (_, c) => c.toUpperCase());
if (o.format && !["wide", "tall"].includes(o.format)) fail("--format must be wide (1920×1080) or tall (1080×1920)");

const harness = path.join(ROOT, "engine/harness");
const test = path.join(video, "tests", mod);
const rel = (p) => path.relative(ROOT, p) || ".";
fs.mkdirSync(path.join(test, "story"), { recursive: true });

// the size: --format, else the video's own root
const film = filmOf(video);
let [W, H] = [film.width, film.height];
if (o.format === "wide") [W, H] = [1920, 1080];
if (o.format === "tall") [W, H] = [1080, 1920];

const setSize = (html) =>
  html
    .replace(/data-resolution="\w+"/, `data-resolution="${W >= H ? "landscape" : "portrait"}"`)
    .replace(/content="width=\d+, height=\d+"/, `content="width=${W}, height=${H}"`)
    .replace(/width: \d+px;(\s*)height: \d+px;/g, `width: ${W}px;$1height: ${H}px;`)
    .replace(/data-width="\d+" data-height="\d+"/, `data-width="${W}" data-height="${H}"`)
    .replace(/(<canvas id="ex-stage") width="\d+" height="\d+"/, `$1 width="${W}" height="${H}"`);

// index.html: from the harness on first run or --reset; the size again when --format is given
const pageF = path.join(test, "index.html");
const fresh = o.reset || !fs.existsSync(pageF);
let page = fresh ? fs.readFileSync(path.join(harness, "index.html"), "utf8") : fs.readFileSync(pageF, "utf8");
if (fresh || o.format) page = setSize(page);
const scripts = [...(o.with ? String(o.with).split(",").map((s) => path.basename(s.trim()).replace(/\.js$/, "")).filter(Boolean) : []), mod];
for (const s of scripts) {
  const tag = `<script src="story/${s}.js"></script>`;
  if (!page.includes(tag)) page = page.replace(/(\n(\s*)<script src="test\.js"><\/script>)/, `\n$2${tag}$1`);
}
fs.writeFileSync(pageF, page);
if (fresh || !fs.existsSync(path.join(test, "package.json"))) fs.copyFileSync(path.join(harness, "package.json"), path.join(test, "package.json"));

// test.js: written once (or on --reset); it is the module author's to edit
const testF = path.join(test, "test.js");
if (fresh || !fs.existsSync(testF)) {
  const js = fs.readFileSync(path.join(harness, "test.js"), "utf8").replaceAll("__MODULE__", mod).replaceAll("__KEY__", key);
  fs.writeFileSync(testF, js);
}

// story copies: film-pal.js, the module and --with scripts
const copyStory = (name) => {
  const src = path.join(video, "story", `${name}.js`);
  const dst = path.join(test, "story", `${name}.js`);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    return true;
  }
  return false;
};
if (!copyStory("film-pal")) fs.writeFileSync(path.join(test, "story/film-pal.js"), "/* this video has no story/film-pal.js yet */\n");
const missing = scripts.filter((s) => !copyStory(s));

// ex/: the same engine the video uses
run(process.execPath, [path.join(ROOT, "tools/sync-engine.mjs"), test]);

console.log(`${fresh ? "made" : "refreshed"} ${rel(test)}/ (${W}×${H}, HOUSE.${key}${o.with ? ", with " + scripts.slice(0, -1).join(", ") : ""})`);
for (const s of missing) console.log(`  ! story/${s}.js does not exist yet: the page will say so until you write it and run this again`);
console.log(`  edit   ${rel(testF)} (STATES: one per second; set data-duration in index.html to at least their count)
  look   node tools/snapshot.mjs ${rel(test)} --every 1     (sandbox disabled)
  again  node tools/new-module-test.mjs ${rel(video)} ${mod}   (after every edit of story/${mod}.js)`);

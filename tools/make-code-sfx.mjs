// The owner's code-made sound effects (owner 04/11/2026 #882, #887): every sound the owner's kits synthesise in Python (numpy / scipy, fixed
// seeds, no samples), built from the pinned kits (bundle/styles/moworks-kits) and added to the offline library (bundle/sfx) in its format:
//   one-shots  silence trimmed (4 ms kept before the attack), -16 LUFS-I with true peak at most -1.5 dBTP (plain gain), mono, 44.1 kHz,
//              Ogg Vorbis q4, at most 4 s (beds 8 s); a 20 s bed is a loop at -28 LUFS, stereo, q3 (as tools/make-sfx-library.mjs)
// as bundle/sfx/<family>/<id>.ogg, ids by kit (pc- Paper Collage, sm- Stickman Explainer, iv- Inner Voice Short, c3- 3D Cartoon, x2- 2D
// Explainer) and `kit` the style id (only that style's films get them, first), each entry's source.kind "code" (credit: the owner's own code, made by synthesis); catalog.json keeps every other entry, and
// tools/make-sfx-library.mjs keeps these when it remakes the packs. The kits' "opt-in" whooshes stay whooshes (family whoosh).
// Usage: node tools/make-code-sfx.mjs   (needs uv; Python 3.11 with numpy, scipy, and for the 2D Explainer soundfile and pyloudnorm)
import { execFile } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { APP_ROOT, loadPins } from "../packages/version-manager/index.mjs";
import { ffmpegExe } from "../packages/library/preview-media.mjs";
import { FAMILIES } from "../packages/sfx/library.mjs";

const run = promisify(execFile);
const KITS = join(APP_ROOT, "bundle", "styles", "moworks-kits"), OUT = join(APP_ROOT, "bundle", "sfx");
const ONE = { lufs: -16, tp: -1.5, q: 4, max: 4 }, LOOP = { lufs: -28, q: 3, len: 20, xfade: 1.5 };
const READ = new Date().toISOString().slice(0, 10);

// [kit folder, builder (relative to the kit), its output folder, id prefix, style words (tags), the style's title]
const BUILDS = [
  ["paper-collage", "tools/sfx/build_kit.py", "public/sfx/kit", "pc", "paper collage, paper", "Paper Collage"],
  ["story", "tools/sfx/build_stickman.py", "public/sfx/stickman", "sm", "stickman explainer, stickman", "Stickman Explainer"],
  ["story", "tools/sfx/build_inner_voice.py", "public/sfx/inner-voice", "iv", "inner voice short, inner voice", "Inner Voice Short"],
  ["cartoon-3d", "tools/sfx/build_sounds.py", "public/sfx/kit", "c3", "3d cartoon, toon", "3D Cartoon"],
  ["explainer-2d", "tools/audio/sfx.py", "public/sfx/explainer", "x2", "2d explainer, explainer", "2D Explainer"],
];
// the 2D Explainer synthesises its effects per film from a cue sheet: one instance of each kind, rendered alone (t 1.5 s in a 5 s sheet)
const X2_KINDS = { pop: 0.4, pop_big: 0.4, tick: 0.4, counter_roll: 1.0, whoosh_pullback: 1.2, whoosh_dive: 1.1, impact: 0.4, reveal: 2.0, light_hit: 0.4, sparkle: 0.4, swish: 0.4, title: 4.0 };
const X2_USE = { pop: "soft bubbly UI pop: a label pill pops in", pop_big: "a heavier pop with a low thump: a big pill or the title word slams", tick: "a short soft woody, glassy tick",
  counter_roll: "an accelerating run of ticks: a counter counts up", whoosh_pullback: "an airy rising and falling sweep: the camera pulls back", whoosh_dive: "a darker falling sweep: the camera dives in",
  impact: "a deep soft boom: an impact, a big beat", reveal: "a shimmering riser into a warm bloom: a reveal", light_hit: "a bright airy shimmer: a light comes on, a hit of light",
  sparkle: "five tiny glassy chimes: a sparkle, the film's glowing accent", swish: "a short whoosh for a slide or a cut", title: "a soft warm chord swell and a bell: the title lands" };

// the library family of each sound (kit prefix + name); loop: a bed long enough to repeat (20 s), bed: a longer one-shot (8 s at most)
const FAMILY = {
  "pc-paper-land": "paper", "pc-tear": "paper", "pc-stamp": "impact", "pc-scribble": "paper", "pc-strike": "paper", "pc-circle": "paper", "pc-marker-long": "paper",
  "pc-slam": "impact", "pc-cash": "paper", "pc-scatter": "paper", "pc-flip": "mechanical", "pc-ticker": "mechanical", "pc-pluck": "pop", "pc-shot": "impact",
  "pc-launch": "whoosh", "pc-impact": "impact", "pc-count": "click", "pc-lock": "click", "pc-chip": "pop", "pc-tick": "click", "pc-click": "click", "pc-pop": "pop",
  "pc-ding": "bell", "pc-typing": "typing", "pc-whoosh": "whoosh", "pc-whoosh-up": "whoosh", "pc-whoosh-deep": "whoosh", "pc-zoom": "whoosh",
  "sm-screen-on": "electronic", "sm-snap-out": "whoosh", "sm-chip-seat": "click", "sm-led": "electronic", "sm-wire": "mechanical", "sm-door": "door", "sm-signal": "bell",
  "sm-boom": "impact", "sm-swell": "magic", "sm-shimmer": "magic", "sm-ui": "electronic", "sm-crack": "impact", "sm-flythrough": "whoosh", "sm-reveal": "magic",
  "sm-traffic": "ambience", "sm-honk": "mechanical", "sm-office": "ambience", "sm-dawn": "ambience", "sm-takeoff": "whoosh", "sm-papers": "paper", "sm-wind": "wind",
  "sm-pass": "whoosh", "sm-pigeon": "animal", "sm-pop": "pop", "sm-timer": "click", "sm-ding": "bell", "sm-swish": "whoosh", "sm-crowd": "crowd", "sm-steps": "footstep",
  "sm-thud": "impact", "sm-cheer": "crowd", "sm-up": "whoosh", "sm-prop": "mechanical", "sm-jet": "mechanical", "sm-cloud": "wind", "sm-bite": "impact",
  "sm-frost": "magic", "sm-chatter": "click", "sm-breath": "wind", "sm-thermo": "electronic", "sm-chime": "bell", "sm-flock": "animal", "sm-ping": "electronic",
  "sm-alert": "electronic", "sm-tag-d": "bell", "sm-tag-fs": "bell", "sm-tag-a": "bell",
  "iv-room": "ambience", "iv-tap": "click", "iv-alarm": "electronic", "iv-harmonics": "bell", "iv-whisper": "wind", "iv-clock-spin": "mechanical", "iv-strum-sour": "pop",
  "iv-string-mute": "impact", "iv-dread": "ambience",
  "c3-impact": "impact", "c3-vs": "impact", "c3-blip-up": "electronic", "c3-blip-down": "electronic", "c3-tick": "click", "c3-count": "click", "c3-lock": "click",
  "c3-win": "bell", "c3-glitch": "electronic", "c3-slice": "impact", "c3-chip": "pop", "c3-resolve": "bell", "c3-click": "click",
  "x2-pop": "pop", "x2-pop-big": "pop", "x2-tick": "click", "x2-counter-roll": "click", "x2-whoosh-pullback": "whoosh", "x2-whoosh-dive": "whoosh", "x2-impact": "impact",
  "x2-reveal": "magic", "x2-light-hit": "magic", "x2-sparkle": "magic", "x2-swish": "whoosh", "x2-title": "bell",
};
// the film style whose films get each kit's sounds (packages/sfx/library.mjs loadLibrary({ kit })): a style's own sounds stay in its own films
const KIT_OF = { pc: "paper-collage", sm: "stickman-explainer", iv: "inner-voice-short", c3: "cartoon-3d", x2: "explainer-2d" };
const LOOPS = new Set(["iv-room"]), BEDS = new Set(["sm-traffic", "sm-office", "sm-dawn", "sm-wind", "sm-crowd", "sm-cheer", "sm-cloud", "iv-dread", "sm-boom", "sm-reveal"]);

const FF = ffmpegExe(), FFPROBE = FF.replace(/ffmpeg(\.exe)?$/i, (m, e) => `ffprobe${e ?? ""}`);
const r1 = (n) => Math.round(n * 10) / 10, r3 = (n) => Math.round(n * 1000) / 1000;
const ff = (args) => run(FF, ["-hide_banner", "-nostats", ...args], { windowsHide: true, maxBuffer: 64 << 20 }).then((r) => r.stderr, (e) => { if (e.code && e.code !== 0) throw new Error(String(e.stderr).slice(-600)); return String(e.stderr ?? ""); });
const duration = async (f) => Number((await run(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f], { windowsHide: true })).stdout.trim());
async function loudness(f) {
  const e = await ff(["-i", f, "-af", "apad=pad_dur=1,ebur128=peak=true", "-f", "null", "-"]), sum = e.split("Summary:").pop();
  return { I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1]), TP: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(sum)?.[1]) };
}
async function onset(f) {
  const e = await ff(["-i", f, "-map", "0:a:0", "-t", "3", "-af", "silencedetect=noise=-40dB:d=0.005", "-f", "null", "-"]);
  const first = /silence_start:\s*(-?[\d.]+)/.exec(e), end = /silence_end:\s*([\d.]+)/.exec(e);
  return first && Number(first[1]) <= 0.001 && end ? Math.min(1, r3(Number(end[1]))) : 0;
}
/** The use of each sound, from the INDEX.md the kit's builder writes (| `name` | length | loudness | use |). */
function uses(file) {
  const out = {};
  try { for (const m of readFileSync(file, "utf8").matchAll(/^\| `([^`]+)` \|[^|]*\|[^|]*\| (.+?) \|\s*$/gm)) out[m[1]] = m[2].replace(/\s*\|\s*/g, " ").trim(); } catch { /* none */ }
  return out;
}
const TAG_STOP = new Set(["a", "an", "the", "of", "on", "in", "to", "and", "or", "it", "is", "its", "s", "for", "with", "by", "at", "under", "into", "out", "up", "one", "two", "opt", "family", "use", "sparingly", "not", "every", "only", "when", "asked", "this", "that", "from", "over", "m", "max", "lufs", "db"]);
const tagsOf = (name, use, styleWords) => [...new Set([name.replace(/[-_]/g, " "), ...name.split(/[-_]/), ...String(use).toLowerCase().replace(/opt-in[^:]*:/g, "").split(/[^a-z]+/).filter((w) => w.length > 2 && !TAG_STOP.has(w)),
  ...styleWords.split(",").map((s) => s.trim()), "code made", "synth"])].filter(Boolean);

async function make({ id, wav, family, tags, kitTitle, builder, use, kit }) {
  const loop = LOOPS.has(id), max = BEDS.has(id) ? 8 : ONE.max, tmp = `${wav}.mw.wav`, out = join(OUT, family, `${id}.ogg`);
  let how;
  if (loop) {
    const len = await duration(wav), X = LOOP.xfade, D = Math.min(LOOP.len - X, r3(len - X - 0.05));
    await ff(["-i", wav, "-filter_complex", `[0:a]atrim=end=${r3(D + X)},asetpts=PTS-STARTPTS,aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,asplit[a][b];` +
      `[a]atrim=end=${D},asetpts=PTS-STARTPTS,afade=t=in:d=${X}:curve=qsin[m];[b]atrim=start=${D},asetpts=PTS-STARTPTS,afade=t=out:d=${X}:curve=qsin[t];[m][t]amix=inputs=2:duration=first:normalize=0[o]`,
    "-map", "[o]", "-c:a", "pcm_f32le", "-y", tmp]);
    how = `made by synthesis with the owner's code (${builder}, numpy/scipy, a fixed seed), then a ${r1(D)} s loop (its next ${X} s cross-faded into the start), ${LOOP.lufs} LUFS, stereo, Ogg Vorbis q${LOOP.q}`;
  } else {
    const base = ["aresample=44100", "aformat=sample_fmts=fltp:channel_layouts=mono"];
    const v = await ff(["-i", wav, "-af", [...base, "volumedetect"].join(","), "-f", "null", "-"]);
    const peak = Number(/max_volume:\s*(-?[\d.]+) dB/.exec(v)?.[1] ?? -6), thr = Math.max(-60, Math.min(-30, peak - 35));
    await ff(["-i", wav, "-af", [...base, `silenceremove=start_periods=1:start_threshold=${thr}dB:start_silence=0.004:detection=peak`, "areverse",
      `silenceremove=start_periods=1:start_threshold=${thr - 5}dB:start_silence=0.05:detection=peak`, "areverse"].join(","), "-c:a", "pcm_f32le", "-y", tmp]);
    how = `made by synthesis with the owner's code (${builder}, numpy/scipy, a fixed seed), then silence trimmed, ${ONE.lufs} LUFS (true peak at most ${ONE.tp} dBTP), mono, Ogg Vorbis q${ONE.q}`;
  }
  const m = await loudness(tmp);
  if (!Number.isFinite(m.I) || m.I <= -69) throw new Error(`${id}: silent`);
  let dur = await duration(tmp), gain = loop ? LOOP.lufs - m.I : Math.min(ONE.lufs - m.I, ONE.tp - m.TP);
  const tail = loop ? ["alimiter=limit=0.794:attack=5:release=120:level=false"] : [];
  if (!loop) {
    let fadeOut = 0.02;
    if (dur > max) { tail.push(`atrim=end=${max}`); dur = max; fadeOut = 0.25; how += `, cut at ${max} s with a fade`; }
    tail.push(`afade=t=out:st=${r3(Math.max(0, dur - fadeOut))}:d=${fadeOut}`);
  }
  mkdirSync(join(OUT, family), { recursive: true });
  let fin;
  for (let i = 0; i < 3; i++) {
    await ff(["-i", tmp, "-af", [`volume=${r3(gain)}dB`, ...tail].join(","), "-ar", "44100", "-c:a", "libvorbis", "-q:a", String(loop ? LOOP.q : ONE.q), "-map_metadata", "-1",
      "-metadata", `title=${id}`, "-metadata", "artist=Moworks Studio", "-metadata", "copyright=the owner's own code, made by synthesis", "-y", out]);
    fin = await loudness(out);
    if (fin.TP <= -1) break;
    gain -= fin.TP + 1.2;
  }
  const pin = loadPins().moworksKits?.kits?.[kit] ?? {};
  return { id, file: `${family}/${id}.ogg`, family, kit: KIT_OF[id.slice(0, 2)], tags, duration: r3(await duration(out)), loop, onset: loop ? 0 : await onset(out), lufs: r1(fin.I), peak: r1(fin.TP),
    source: { kind: "code", name: `${kitTitle}: the kit's sound kit (${pin.title ?? kit} ${pin.version ?? ""})`.trim(), url: null, author: "Moworks Studio (the owner's own code)",
      licence: "the owner's own", licenceUrl: null, file: `bundle/styles/moworks-kits/${kit}/${builder} › ${id.slice(3)}`, use, read: READ, how } };
}

const isMain = process.argv[1] && /make-code-sfx\.mjs$/.test(process.argv[1]);
if (isMain) {
  const TMP = mkdtempSync(join(tmpdir(), "mw-code-sfx-")), py = ["run", "--python", "3.11", "--with", "numpy", "--with", "scipy"];
  const env = { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" };
  const jobs = [];
  for (const [kit, builder, outRel, pre, styleWords, title] of BUILDS) {
    const root = join(TMP, kit);
    if (!existsSync(join(root, "tools"))) cpSync(join(KITS, kit, "tools"), join(root, "tools"), { recursive: true });
    const outDir = join(root, ...outRel.split("/"));
    let use = {};
    if (pre === "x2") {
      mkdirSync(outDir, { recursive: true });
      for (const [k, d] of Object.entries(X2_KINDS)) {
        const sheet = join(root, `${k}.json`), dir = join(root, "one", k);
        writeFileSync(sheet, JSON.stringify({ duration: 5 + (k === "title" ? 3 : 0), sr: 48000, seed: 1234, cues: [{ t: 1.5, kind: k, dur: d }] }));
        mkdirSync(dir, { recursive: true });
        await run("uv", [...py, "--with", "soundfile==0.13.1", "--with", "pyloudnorm==0.2.0", "python", join(root, builder), "--cues", sheet, "--out-dir", dir], { cwd: root, env, windowsHide: true, maxBuffer: 64 << 20 });
        cpSync(join(dir, "sfx.wav"), join(outDir, `${k}.wav`));
      }
      use = X2_USE;
    } else {
      await run("uv", [...py, "python", join(root, builder)], { cwd: root, env, windowsHide: true, maxBuffer: 64 << 20 });
      use = uses(join(outDir, "INDEX.md"));
    }
    for (const name of Object.keys(pre === "x2" ? X2_KINDS : use)) {
      const id = `${pre}-${name.replace(/_/g, "-")}`, family = FAMILY[id];
      if (!family || !FAMILIES.includes(family)) throw new Error(`${id}: no family (add it to FAMILY)`);
      jobs.push({ id, wav: join(outDir, `${name}.wav`), family, tags: tagsOf(name, use[name] ?? "", styleWords), kitTitle: title, builder, use: use[name] ?? "", kit });
    }
    console.log(`${title}: ${Object.keys(pre === "x2" ? X2_KINDS : use).length} sounds built`);
  }
  const made = [];
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => { while (next < jobs.length) { const j = jobs[next++]; made.push(await make(j)); process.stdout.write("."); } }));
  rmSync(TMP, { recursive: true, force: true });
  console.log("");
  // the catalog: every other entry as it was, these replaced (the same ids again) and sorted by family like the packs
  const file = join(OUT, "catalog.json"), cat = JSON.parse(readFileSync(file, "utf8"));
  const ids = new Set(made.map((m) => m.id)), order = (s) => FAMILIES.indexOf(s.family);
  cat.sounds = [...cat.sounds.filter((s) => !ids.has(s.id) && s.source?.kind !== "code"), ...made].sort((a, b) => order(a) - order(b) || a.id.localeCompare(b.id, "en", { numeric: true }));
  if (!/owner's own code/.test(cat.about)) cat.about += " Sounds whose source.kind is \"code\" are the owner's own code-made effects (the kits' Python synthesis, made by tools/make-code-sfx.mjs; ids pc-, sm-, iv-, c3-, x2-).";
  writeFileSync(file, JSON.stringify(cat, null, 1) + "\n");
  // CREDITS.md: one block for the code-made sounds, replaced each time
  const credits = join(OUT, "CREDITS.md"), block = ["<!-- mw:code-sfx -->", "## The owner's code-made sounds (Moworks Studio)", "",
    `- ${made.length} sounds synthesised by the Python code of the owner's own kits (numpy / scipy, fixed seeds, no samples or recordings), built on ${READ} by \`tools/make-code-sfx.mjs\` from the pinned kits in \`bundle/styles/moworks-kits\` (config/pins.json moworksKits).`,
    "- Licence: the owner's own work. Credit: Moworks Studio.",
    ...BUILDS.map(([kit, builder, , pre, , title]) => `- ${title}, \`${kit}/${builder}\`: ${made.filter((m) => m.id.startsWith(`${pre}-`)).map((m) => `\`${m.id}\``).sort().join(", ")}`), "<!-- /mw:code-sfx -->"].join("\n");
  let text = readFileSync(credits, "utf8");
  const re = /<!-- mw:code-sfx -->[\s\S]*?<!-- \/mw:code-sfx -->/;
  writeFileSync(credits, re.test(text) ? text.replace(re, block) : `${text.trimEnd()}\n\n${block}\n`);
  const bytes = made.reduce((a, m) => a + statSync(join(OUT, ...m.file.split("/"))).size, 0);
  console.log(`code-made sounds: ${made.length}, ${(bytes / 1048576).toFixed(2)} MB; library now ${cat.sounds.length} sounds`);
}

// The film's checks in one place (audit/112 2.1, owner #1295): each check's name and what it looks at for the owner (CHECKS: the Tech
// checks sheet), its name as a problem (PROBLEM: the render's list of what stops it, said in a few words), what stops a render
// (renderVerdict: the same list every caller reads), and the two states a check can end in that are neither a pass nor a problem (a check
// HF never ran, the script check that ran out of time). The logic of each check stays in its own file (gates.mjs, stillness.mjs, …); what
// is said about it, and whether it blocks, is here only. Pure (no Node imports): the server and the UI both import it.

/** What stops a render, besides HF's lint and script errors: a film that does not build, a remote URL, a font not here or without
 *  Vietnamese letters, an anidoodle film that breaks its contract (and G-POSE unless it could not run). Every other finding warns. */
export const RENDER_BLOCKING = Object.freeze(["G-BUILD", "G-REMOTE", "G-FONT", "G-GLYPH", "G-CONTRACT"]);
/** A finding of HF's script check that only says the check ran out of its time (no script error was found before it stopped). */
export const lateFinding = (f) => f.code === "check_timed_out" || (f.code === "check_runtime_failure" && outOfTimeText(f.message));          // its words: outOfTimeText below (b2.2)
/** A check HF never ran (its browser stages skipped), or the script check that ran out of its time: neither a pass nor a problem in the film. */
export const unchecked = (g) => g.notChecked === true || (g.id === "G-HF-SCRIPT" && (g.skippedReason === "lint" || g.skippedReason === "failed"));
export const outOfTime = (g) => g.id === "G-HF-SCRIPT" && (g.skippedReason === "deadline" || g.timedOut === true
  || ((g.findings ?? []).length > 0 && g.findings.every((f) => f.code === "check_timed_out")));

/** Render any time: only what would break the render stops it (script errors, missing files, remote URLs, fonts that are not here or
 *  lack Vietnamese letters); every other finding is a warning shown next to the result. */
export const RENDER_LINT = new Set(["missing_local_asset", "placeholder_media_url"]);
export function renderVerdict(gates) {
  const blocking = [], warnings = [];
  for (const g of gates.gates ?? []) {
    if (g.pass) continue;
    if (g.id === "G-HF-LINT") {
      const hard = (g.findings ?? []).filter((f) => !f.code || RENDER_LINT.has(f.code));          // no code: HF's check gave no answer at all
      const soft = (g.findings ?? []).filter((f) => !hard.includes(f));
      if (hard.length) blocking.push({ ...g, findings: hard });
      if (soft.length) warnings.push({ ...g, blocking: false, findings: soft });
    } else if (g.id === "G-HF-SCRIPT") {          // a check that ran out of time is a warning (results saved before the fix too)
      const hard = g.blocking === false ? [] : (g.findings ?? []).filter((f) => !lateFinding(f));
      const soft = (g.findings ?? []).filter(lateFinding);
      if (hard.length || (!soft.length && g.blocking !== false)) blocking.push({ ...g, findings: hard.length ? hard : g.findings });
      if (soft.length) warnings.push({ ...g, blocking: false, findings: soft.map((f) => ({ ...f, severity: "warning", code: "check_timed_out", message: "Could not finish checking the scripts in time: no script error was found before the check stopped." })) });
    } else if (RENDER_BLOCKING.includes(g.id) || (g.id === "G-POSE" && g.blocking !== false)) blocking.push(g);
    else warnings.push({ ...g, blocking: false });
  }
  return { pass: blocking.length === 0, blocking, warnings };
}


/** Plain words for each check (deterministic checks apart from heuristic visual review). */
export const CHECKS = {
  "G-HF-LINT": { title: "Composition files", explain: "The film's files are well formed: their structure, timing and settings.", kind: "deterministic" },
  "G-HF-SCRIPT": { title: "Scripts in the preview", explain: "Plays the film in the background and looks for errors in its code.", kind: "deterministic" },
  "G-REMOTE": { title: "Works offline", explain: "Nothing is loaded from the internet while rendering (fonts, pictures, scripts must be local).", kind: "deterministic" },
  "G-FONT": { title: "Fonts available", explain: "Every font the film uses is on this computer.", kind: "deterministic" },
  "G-GLYPH": { title: "Vietnamese characters", explain: "Each font has every character the film writes, Vietnamese tone marks included.", kind: "deterministic" },
  "G-GLYPH-CODE": { title: "Vietnamese characters in the film's code", explain: "Words a film drawn by code writes (What If, anidoodle) in a face that lacks some Vietnamese letters: they would show in another face, or as a dash in anidoodle's drawn capitals. Read from the code: a warning, never a block.", kind: "heuristic" },
  "G-VI-MARKS": { title: "Vietnamese written without its marks", explain: "Words on screen in a Vietnamese film that are Vietnamese with their tone marks left off (NHAT KY for NHẬT KÝ), whatever the style's look. Read from the film's pages and code: a warning, never a block.", kind: "heuristic" },
  "G-BUILD": { title: "The film's code compiles", explain: "A film drawn by code is built from its source first; a source that does not build would leave an older film to render.", kind: "deterministic" },
  "G-VOICE": { title: "The voice stays clear", explain: "Under a voice-over, on every spoken word the effects stay at least 8 dB under the voice, and over every spoken passage the music stays at least 10 dB under it. A warning, never a block.", kind: "deterministic" },
  "G-SFX": { title: "A sound on every action", explain: "Once the sound effects are placed, every visible action of the Motion Plan (an entrance, an exit, a landing, a step, a door…) has a sound within about 0.3 s, unless you, the brief or the film style asked for silence or keep that kind of sound out. A warning, never a block.", kind: "deterministic" },
  "G-POSE": { title: "Poses inside their limits", explain: "Draws every frame of an anidoodle film and checks each character's pose against its joint limits, and that nothing throws or logs an error.", kind: "deterministic" },
  "G-COLLISION": { title: "Nothing walks through anything", explain: "A 3D Cartoon film, every frame: no character walks through furniture or another character, and no foot goes below the floor (the style's own check). A warning, never a block.", kind: "deterministic" },
  "G-CUTS": { title: "Cuts on the shot table", explain: "A film in one of the owner's film styles, once it is rendered: the hard cuts in the picture match the cuts its own shot table declares (an Inner Voice film has none: every change is a fade). A warning, never a block.", kind: "deterministic" },
  "G-CONTRACT": { title: "Same film every time", explain: "An anidoodle film draws each frame the same way every time, so the render matches what you saw.", kind: "deterministic" },
  "G-HF-LAYOUT": { title: "Layout", explain: "At every cut: text that overlaps, hides, is cut off or runs out of the frame or its box.", kind: "deterministic" },
  "G-HF-CONTRAST": { title: "Contrast", explain: "Every text stands out enough from what is behind it to read easily.", kind: "deterministic" },
  "G-HF-MOTION": { title: "Motion", explain: "The moves the Motion Plan asks for are in the film.", kind: "deterministic" },
  "G-BLANK": { title: "Empty-looking scenes", explain: "Takes a few stills of each scene and flags a scene whose stills are all flat. A heuristic: it can miss or misjudge.", kind: "heuristic" },
  "G-END": { title: "The ending", explain: "Compares a still half a second before the end with the last frame: a film whose picture is still full and lit on its last frame stops dead. The picture should fade out with the music (or after the end card). In a style whose author's ending the Motion Plan names and plays, a dark screen, a dot or a held end card ends the film too.", kind: "deterministic" },
  "G-SYNC": { title: "Moves on their words", explain: "A move of the Motion Plan that names a spoken word starts or lands on it, within about 3 frames, and the word is said in that shot. A warning, never a block.", kind: "deterministic" },
  "G-ANATOMY": { title: "Anatomy", explain: "Reads the film's code for the characters' bodies. Today: in an Inner Voice Short film, a hand raised to or above the shoulder bends its elbow down, under the forearm (the film style's rule). More body parts and film styles to come. A warning, never a block.", kind: "deterministic" },
  "G-SOUND-SHAPE": { title: "The sound from start to end", explain: "Reads the sound of the film's render in 100 ms steps: it should start with the picture, never drop out to silence in the middle (a room tone or a quiet bed counts as sound), and last to the film's end. It needs a render of the film as it is. A warning, never a block.", kind: "deterministic" },
  "G-FLICKER": { title: "Flicker in the render", explain: "Reads every frame of the film's render: a part of the picture that jumps to another picture for one frame and back, again and again (two surfaces at the same height in 3D, a light that blinks). It needs a render of the film as it is: the preview made after the Build and after each change. A warning, never a block.", kind: "deterministic" },
  "G-CANVAS-TEXT": { title: "Text drawn into the picture", explain: "Finds text the film's code draws into its picture (a canvas), or writes in its React code in a film style that After Effects gets as a picture, which Studio and After Effects cannot edit. Text the film style performs (its own drawing) may stay, with a line saying so in the film's notes. A warning, never a block.", kind: "deterministic" },
  "G-AUDIO-FILES": { title: "Sound files that are missing", explain: "Every sound the film plays has its file. A missing one is left out of the render and said; place it again, relink it, or remove it. A warning, never a block.", kind: "deterministic" },
  "G-LYRIC": { title: "The sung words", explain: "In a lyrics video: each word sung is on screen, with the count sung, and shows around its sung time (the times are a draft, so only clear misses are named). A warning, never a block.", kind: "deterministic" },
  "G-SEQ-CRAWL": { title: "Image sequence: smooth turns", explain: "A product sequence turning under 1 picture a film frame, or one picture held where the product is mid-turn: it looks like it stutters. A warning, never a block.", kind: "deterministic" },
  "G-SEQ-JUMP": { title: "Image sequence: no sudden jump", explain: "One film frame that skips far more pictures than the frames around it, where the two pictures differ. Fast turns are fine; a cut of the film is fine. A warning, never a block.", kind: "deterministic" },
  "G-SEQ-PRODUCT": { title: "Image sequence: the whole product in the frame", explain: "Reads where the product is on screen every 0.2 s: the frame must not cut it, outside a shot marked as a close-up. A warning, never a block.", kind: "deterministic" },
  "G-STILL": { title: "Still stretches", explain: "Takes a still every 0.25 s and flags where the film's objects hold still for more than 2 s (the final hold excepted): the film should never look like a slideshow. A drift of a few pixels or a slight tilt counts as still. A heuristic: it can misjudge.", kind: "heuristic" },
};

// the check named as what went wrong (the render's list); the checks with none here are named by their title
export const PROBLEM = { "G-AUDIO-FILES": "Sound files that are missing", "G-CANVAS-TEXT": "Text drawn into the picture", "G-FLICKER": "Flicker in the render", "G-SOUND-SHAPE": "The sound from start to end", "G-HF-LINT": "Composition files", "G-HF-SCRIPT": "Script errors in the preview", "G-REMOTE": "Loads something from the internet",
  "G-FONT": "A font that is not on this computer", "G-GLYPH": "A font without Vietnamese letters",
  "G-GLYPH-CODE": "A font without Vietnamese letters in the film's code", "G-VI-MARKS": "Vietnamese written without its marks", "G-BLANK": "Scenes that look empty",
  "G-HF-LAYOUT": "Layout: text overlapping, hidden or cut", "G-HF-CONTRAST": "Contrast too low to read", "G-HF-MOTION": "Motion",
  "G-VOICE": "Effects or music over the voice", "G-SFX": "Actions with no sound", "G-LYRIC": "Sung words off their time", "G-SYNC": "Moves off their words", "G-SEQ-CRAWL": "A sequence that crawls", "G-SEQ-JUMP": "A sequence that jumps", "G-SEQ-PRODUCT": "A product cut by the frame" };          // warnings, never a block
/** What a check that did not run would have looked at. */
export const NOT_CHECKED_WORDS = { "G-HF-LAYOUT": "layout", "G-HF-CONTRAST": "contrast", "G-HF-MOTION": "motion", "G-FLICKER": "flicker (waiting for the preview)", "G-SOUND-SHAPE": "the sound from start to end (waiting for the preview)" };

/** A run of checks judged as a Render judges it (audit/112b b1.1): { pass, blockingFailures, gates }, each failing gate's `blocking` saying
 *  whether it stops the render. Tech checks, the pipeline's count and the library's previews read the same verdict as Render: a lint
 *  that does not break the render is a warning everywhere (#1109). */
export function judge(gates) {
  const v = renderVerdict({ gates }), stop = new Set(v.blocking.map((g) => g.id));
  return { pass: v.pass, blockingFailures: [...stop], gates: gates.map((g) => (g.pass ? g : { ...g, blocking: stop.has(g.id) })) };
}
/** The checks that read the sound or the render, run again when only the sound changed (the picture's results stand). */
export const SOUND_CHECKS = Object.freeze(["G-AUDIO-FILES", "G-VOICE", "G-SFX", "G-CUTS", "G-FLICKER", "G-SOUND-SHAPE"]);
/** Where each check runs today (audit/112b b2.1), in one place to read: before a render (gates.mjs runGates), in Tech checks (the same and
 *  G-BLANK, G-STILL, G-END: production.mjs startQa), in the Review's sheets (qc.mjs, boards.mjs qc_sheets), and again when only the sound
 *  changed. No check is added to a set here; a set that should hold one more is the owner's call. */
const BEFORE_RENDER = ["G-BUILD", "G-HF-LINT", "G-HF-SCRIPT", "G-HF-LAYOUT", "G-HF-CONTRAST", "G-HF-MOTION", "G-REMOTE", "G-AUDIO-FILES", "G-CANVAS-TEXT", "G-FONT", "G-GLYPH",
  "G-GLYPH-CODE", "G-VI-MARKS", "G-CONTRACT", "G-POSE", "G-COLLISION", "G-ANATOMY", "G-VOICE", "G-SFX", "G-SYNC", "G-CUTS", "G-FLICKER", "G-SOUND-SHAPE",
  "G-SEQ-CRAWL", "G-SEQ-JUMP", "G-SEQ-PRODUCT", "G-LYRIC"];
export const RUN_IN = Object.freeze({
  render: BEFORE_RENDER,
  checks: [...BEFORE_RENDER, "G-BLANK", "G-STILL", "G-END"],
  review: ["G-HF-LINT", "G-HF-SCRIPT", "G-HF-LAYOUT", "G-HF-CONTRAST", "G-HF-MOTION", "G-STILL", "G-SEQ-CRAWL", "G-SEQ-JUMP", "G-SEQ-PRODUCT", "G-LYRIC", "G-SYNC",
    "G-VOICE", "G-POSE", "G-COLLISION", "G-FLICKER", "G-GLYPH-CODE", "G-VI-MARKS"],
  sound: SOUND_CHECKS,
});
/** A message of HF's check that says it ran out of its time ("deadline", "timed out"): the one rule (audit/112b b2.2). */
export const outOfTimeText = (message) => /deadline|timed? ?out/i.test(String(message ?? ""));

/** The check's name as a problem, for the render's list (its title where none is written). */
// a gate saved without its title (runGates keeps none) falls back to the registry: never the code on the screen (audit/112b b1.5: G-POSE, G-CONTRACT)
// a title that is only the id (a report saved while the registry had no words for it) is no title (audit/112c's third look, #1439)
export const checkProblem = (g) => PROBLEM[g.id] ?? (g.title && g.title !== g.id ? g.title : null) ?? CHECKS[g.id]?.title ?? UNNAMED.title;
/** The words of a check the registry has none for: never its id on the screen. */
export const UNNAMED = Object.freeze({ title: "Another check", explain: "", kind: "deterministic" });
/** A check's words for the screen: the registry's, else UNNAMED. */
export const checkWords = (id) => CHECKS[id] ?? UNNAMED;
/** A saved report's checks with the registry's words as they are now (an older report kept the words of its day, or the id where the
 *  registry had none then: "G-CANVAS-TEXT" on the Tech checks page); a check the registry does not know keeps words of its own, never an id. */
export const withWords = (checks) => checks.map((c) => (CHECKS[c.id] ? { ...c, ...CHECKS[c.id] }
  : !c.title || c.title === c.id ? { ...c, title: UNNAMED.title, explain: c.explain ?? "" } : c));

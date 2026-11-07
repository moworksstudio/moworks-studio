// Sound effects, the app's own cue format: storyboard frames carry `sfx:` cues ("whoosh, pop"); each cue name resolves to one file
// in assets/3_audio/sfx/; the film's root document gets one <audio id="el-sfx-N"> per cue at the frame's start (+ offset), on sound-effect
// lanes from track 20, at its family's level (actions.mjs LEVELS: under the music and the voice), and the scenes' ambience beds on
// tracks 12-14 (<audio id="el-amb-N">); a cue that finds nothing is skipped, never a blocker. HF asks a host app to bring its own SFX
// source; this app's is first its offline library (bundle/sfx, library.mjs: CC0 and public domain), then Openverse's Freesound section
// (no key), CC0 and CC BY only (client videos: no NC licences), SFXMint when Openverse is down or finds nothing useful (no key, CC0 as the
// site states it, onlineSources), and the Pixabay sounds HF ships in its media-use skill (Pixabay's, under the Pixabay Content License; HF
// only bundles them). Every sound is credited (title, author, page, licence, Openverse's attribution line, the date read) in
// .moworks/sfx.json and CREDITS.md.
//
// The package's door (audit/112a B11): the code lives in files by why it changes, each named below; what the rest of the app imports from
// here is the same as before.
export { DOWNLOAD_TIMEOUT_MS, DOWN_AFTER, OPENVERSE, SEARCH_TIMEOUT_MS, SFXMINT, details, libraryTitle, offTone, onlineSources, search, searchMint } from "./sources.mjs";
export { SOUND_GROUPS, SOUND_GROUP_TITLES, bundled, localFile, localSounds, matchBundled, nearBundled } from "./shipped.mjs";
export { cueIdOf, cueKey, cuesChanged, cuesOf, sfxNone, timeKey, timesChanged } from "./cues.mjs";
export { ADDED, addedNow, patchState, readState, slug } from "./state.mjs";
export { LIBRARY_QUERY, ONLINE_DOWNLOADS, ONLINE_LOOKUPS, placedNote, resolveCues, shorterQuery, useLibrarySound, useOwnerSound, useSound } from "./resolve.mjs";
export { AMB_LANES, AMB_TRACK, LANES, MAX_AUTO_S, TRACK, VARIANT_KEY, VOLUME, handMoves, mount, mountAmbience, mountedNow, muteMounted, saysNear, setVolumes, shiftPlaced, soundTitles, unmuteAll } from "./mount.mjs";
export { creditLine, writeCredits } from "./credits-sfx.mjs";

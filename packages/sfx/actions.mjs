// A sound on every action (the owner, 30/10: "every film in every style must have full sound effects on every action in the film, for a
// lively mood"). What sound each action of the Motion Plan gets and when, how loud each family plays, how many sounds a second a film
// carries, the place of a scene for its ambience bed, and the material a film style's sounds are made of. Pure: the placement
// (auto.mjs) and Tech checks (G-SFX, hf-qa/sfxCover.mjs) read the same rules.
//
// The sound rules' door (audit/112a B11): the code lives in files by why it changes, each named below; what the rest of the app imports from
// here is the same as before.
export { boostOf, hitVolume, mixShift, trackGains, volumeFor } from "./gains.mjs";
export { DENSITY, KEY_DENSITY, MERGE_S, NAMED_NEAR_S, NAMED_TWIN_S, SAME_MOMENT_S, thin } from "./density.mjs";
export { styleHint } from "./material.mjs";
export { placeOf } from "./places.mjs";
export { TYPING, motionCues, motionSound } from "./motion-sounds.mjs";
export { FIRST_FADE, XFADE, ambienceBeds, tiles } from "./beds.mjs";
export { DUCK_RELEASE, SPEECH_GAP, dipLane, duckLane, sig, speechSpans } from "./envelopes.mjs";

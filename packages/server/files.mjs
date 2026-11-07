// Three small helpers the production routes share (production.mjs, voice.mjs, ae.mjs: audit/112 §2.9 split them out of one file):
// a JSON file read with a fallback, one written whole (a temp file renamed over it, so a reader never finds half of it), and an Error
// with the app's code.

export { readJson } from "../util/json.mjs";          // one reader of a JSON file for the app (audit/112 2.8)
export { writeJson } from "../util/json.mjs";          // one writer of a whole JSON file for the app (audit/112 r2.4)
export const err = (code, message) => Object.assign(new Error(message), { code });

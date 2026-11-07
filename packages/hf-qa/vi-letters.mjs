// The Vietnamese letters and the two tests made of them, written once (audit/112 2.4, its second look r2.1). Pure: it imports nothing, so
// the server, the checks and the UI read the same letters (hf-qa/vietnamese.mjs adds the font reader for the server).
const BASES = "aăâeêioôơuưyAĂÂEÊIOÔƠUƯY", TONES = ["", "̀", "́", "̉", "̃", "̣"];
/** Every Vietnamese letter: each vowel with each tone mark (NFC), and đ Đ. */
export const VI = new Set([...[...BASES].flatMap((b) => TONES.map((t) => (b + t).normalize("NFC"))), "đ", "Đ"]);
/** The letters a font must draw for Vietnamese: VI without the plain vowels every font has. */
export const VI_MARKED = Object.freeze([...VI].filter((c) => !/^[a-zA-Z]$/.test(c)));
/** A marked Vietnamese letter (either case): the film's words, a code film's strings, a font's test. */
export const VI_MARKED_RE = new RegExp(`[${VI_MARKED.join("")}]`, "u");
// the marked letters French, Spanish, Portuguese or Italian write too (à é ñ… São): a word with only these is no sign of Vietnamese
const SHARED = new Set([..."àáãèéìíĩòóõùúũýÀÁÃÈÉÌÍĨÒÓÕÙÚŨÝ"]);
/** A letter only Vietnamese writes: the language of a text (the voice-over's, a brief's), never fooled by "café" or "São Paulo". */
export const VI_ONLY_RE = new RegExp(`[${VI_MARKED.filter((c) => !SHARED.has(c)).join("")}]`, "u");
/** A film in Vietnamese (its meta): its language when it has one, else its brief's letters (before Prepare asks). */
export const metaIsVietnamese = (meta) => (meta?.language?.id ? meta.language.id === "vi" : VI_ONLY_RE.test(String(meta?.brief?.text ?? "")));

// ElevenLabs' audio tags (Eleven v3 and v4, owner 05/11/2026 #1062-#1063): directions in square brackets inside the words to read
// ("[excited] Bạn có biết…", "[whispers]", "[quick, light pace]"). The voice follows them and never says them, so every check that holds the
// words to read against the voice, and every word on screen, reads the text without them. Docs: elevenlabs.io/docs/overview/capabilities/
// text-to-speech/best-practices#prompting-eleven-v4 (read 05/11/2026).
/** One tag: a short direction in square brackets on one line. */
export const TAG = /\[[^\[\]\n]{1,80}\]/g;
/** The words to read without their tags, spaces closed up. */
export const spokenText = (text) => String(text ?? "").replace(TAG, " ").replace(/[ \t]{2,}/g, " ").replace(/ +([,.!?…;:])/g, "$1").replace(/^ +| +$/gm, "");
/** How many tags a text has. */
export const tagCount = (text) => (String(text ?? "").match(TAG) ?? []).length;

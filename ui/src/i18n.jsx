// The interface is English only; the Vietnamese layer
// (vi*.js, the EN | VI switch) is gone. t() stays as every screen calls it: it returns the English text with its {name} placeholders
// filled from the second argument. Vietnamese in the films (their language, fonts with Vietnamese letters, the voice-over, Whisper, the
// spoken language) and Claude's replies in Vietnamese are content, not this layer.
const fill = (s, vars) => (vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : s);

/** The text outside a component (helpers); inside one, useT(). */
export const tr = (en, vars) => fill(en, vars);

/** t() inside a component: the same fill (one language, so no context or provider around the app: audit/112c c4.5). */
export const useT = () => fill;

// THE FIREFIGHTER'S PALETTE ROLES, mapped per hand. A role is fixed for the character ("coat" is
// the turnout red); each hand decides how that role is MADE in its medium. check.ts holds every
// mapping to the role's hue family, and the white / charcoal / black roles to their value.
import type { Palette } from "anidoodle/canvas-core/character/render/storybook";

// marker comic: saturated cel flats, a hard shadow a clear step darker
export const FF_MARKER: Palette = {
  coat: { base: "#e1252b", shade: "#a3121a" }, pants: { base: "#b91c22", shade: "#7d0f15" }, band: { base: "#e4f23a", shade: "#bccb12" }, silver: { base: "#e3e8ec", shade: "#b5bec6" },
  helmet: { base: "#ffffff", shade: "#c5d0dd" }, trim: { base: "#9aa6b2", shade: "#66727e" }, glass: { base: "#bfe6f6", shade: "#8cc6de" }, visorIn: { base: "#2c3448", shade: "#1a2030" },
  badge: { base: "#e1252b", shade: "#a3121a" }, gloves: { base: "#44464d", shade: "#2a2c31" }, boots: { base: "#2b2b31", shade: "#141418" }, sole: { base: "#55565c", shade: "#38393e" },
  clasp: { base: "#15122a", shade: "#15122a" }, skin: { base: "#f3c39c", shade: "#d89470" }, nail: { base: "#44464d", shade: "#2a2c31" }, hair: { base: "#3e2a1f", shade: "#22160f" },
  pupil: { base: "#3b2a1e", shade: "#22160f" }, white: { base: "#ffffff", shade: "#dfe6ee" }, blush: { base: "#f08a84", shade: "#d0645f" }, mouth: { base: "#7a1f2a", shade: "#5a1119" }, lip: { base: "#d8706c", shade: "#b5504c" },
  hose: { base: "#efe4c8", shade: "#c9b98f" }, nozzle: { base: "#d0d8de", shade: "#8a96a0" },
};
// storybook pencil + watercolour: transparent washes, the shadow cooler than the lit colour
export const FF_STORYBOOK: Palette = {
  coat: { base: "#d9413f", shade: "#a8282d" }, pants: { base: "#b5363a", shade: "#85232a" }, band: { base: "#e2ec5c", shade: "#bcc63a" }, silver: { base: "#e6e9ec", shade: "#bcc3ca" },
  helmet: { base: "#fdfcf8", shade: "#ccd3dd" }, trim: { base: "#a3acb5", shade: "#757f8a" }, glass: { base: "#c9e6f2", shade: "#9cc8db" }, visorIn: { base: "#3a4256", shade: "#262c3c" },
  badge: { base: "#d9413f", shade: "#a8282d" }, gloves: { base: "#4c4d53", shade: "#33343a" }, boots: { base: "#2f2e33", shade: "#1c1b20" }, sole: { base: "#5c5c61", shade: "#424247" },
  clasp: { base: "#2a2629", shade: "#2a2629" }, skin: { base: "#f2c9a6", shade: "#dc9f80" }, nail: { base: "#4c4d53", shade: "#33343a" }, hair: { base: "#4a3427", shade: "#2c1e16" },
  pupil: { base: "#4a3a2c", shade: "#2c2118" }, white: { base: "#fffaf3", shade: "#e8e0d4" }, blush: { base: "#ec9a90", shade: "#cf7a70" }, mouth: { base: "#7a3434", shade: "#5a2222" }, lip: { base: "#cf7c72", shade: "#ad5e55" },
  hose: { base: "#efe5cd", shade: "#cbbd98" }, nozzle: { base: "#c9d1d8", shade: "#909ca6" },
};

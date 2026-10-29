// The Brush character gate: a Brush cartoon character is checked automatically, like an anidoodle
// character by its own gate, before anyone is asked to approve it. The app's character layer draws a definition (character.js: the
// body from its ground point up, the face on it, legs under it, arms at its sides, three colours for body, shade and light), so the
// gate holds a definition to what that drawing needs, as PASS / FAIL lines with the reason: the schema, never Clawd, colours that
// separate from each other and from a light and a dark ground, a face on the body, legs that stand under it and reach the ground, arms
// that attach, key views that agree, and (when they are drawn) model sheets that are not blank. Units are u, the body unit; negative
// y is up.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { checkCharacter } from "./index.mjs";

const PAPER = "#F3EBDC", DARK = "#22201E";          // the kit's page and a dark ground
const CLAWD = ["#D97757", "#A84D33", "#F5B394"];
const lum = (hex) => {
  const n = parseInt(String(hex).slice(1), 16), ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
/** The contrast ratio of two colours (WCAG), 1 to 21. */
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const r2 = (v) => Math.round(v * 100) / 100;

/**
 * Check one definition: { id, passed, failed, lines: ["PASS  …" | "FAIL  … : why"] }. sheetsDir and still (a PNG's grey spread, the app's
 * stillStd) add the sheets' check when the sheets are expected (drawn: true).
 */
export function brushGate(def, { sheetsDir = null, still = null, drawn = false } = {}) {
  const lines = [], ok = (name) => lines.push(`PASS  ${name}`), bad = (name, why) => lines.push(`FAIL  ${name}: ${why}`);
  const check = (name, problems) => (problems.length ? bad(name, problems.join("; ")) : ok(name));
  const id = def?.id ?? "?";
  const schema = checkCharacter(def);
  check("the definition can be drawn (the schema of character.js)", schema);
  if (schema.length) return { id, passed: lines.filter((l) => l.startsWith("PASS")).length, failed: lines.filter((l) => l.startsWith("FAIL")).length, lines };
  const { colors: c, body, face, head, legs, arms } = def, top = body.bottom - body.h, half = body.w / 2;

  check("never Clawd (Anthropic's mascot): not its colours, not its body", [
    ...(Object.values(c).some((x) => CLAWD.includes(String(x).toUpperCase())) ? ["a colour is Clawd's: choose the character's own"] : []),
    ...(body.shape === "box" && legs.xs.length === 4 && Math.abs(body.w - 10) < 1.5 && Math.abs(body.h - 6) < 1.5 ? ["a wide box on four legs is Clawd's body: give the character its own shape"] : []),
  ]);
  check("its three colours separate (body, shade darker, light lighter)", [
    ...(lum(c.dk) >= lum(c.col) ? [`the shade ${c.dk} is not darker than the body ${c.col}`] : contrast(c.col, c.dk) < 1.25 ? [`the shade ${c.dk} is too close to the body ${c.col} (contrast ${r2(contrast(c.col, c.dk))}, at least 1.25)`] : []),
    ...(lum(c.lt) <= lum(c.col) ? [`the light ${c.lt} is not lighter than the body ${c.col}`] : contrast(c.col, c.lt) < 1.03 ? [`the light ${c.lt} is too close to the body ${c.col} (contrast ${r2(contrast(c.col, c.lt))}, at least 1.03)`] : []),
  ]);
  check("it reads on a light and on a dark ground (phone size)", [PAPER, DARK].flatMap((g) => {
    const best = Math.max(contrast(c.col, g), contrast(c.dk, g));
    return best < 1.5 ? [`on ${g === PAPER ? "the light page" : "a dark ground"} ${g} neither the body nor its shade stands out (best contrast ${r2(best)}, at least 1.5)`] : [];
  }));
  check("the face sits on the body", [
    ...(!(face.y > top && face.y < body.bottom) ? [`the eye line y ${face.y} is off the body (its top is ${r2(top)}, its bottom ${body.bottom})`] : []),
    ...(!(face.dx > 0 && face.dx < half) ? [`the eyes at ±${face.dx} are outside the body's half width ${r2(half)}`] : []),
    ...(head.top > top + 0.5 ? [`the head top ${head.top} is below the body's top ${r2(top)} (hats and over-head emotes would sit inside the body)`] : head.top < top - 4 ? [`the head top ${head.top} floats far above the body's top ${r2(top)}`] : []),
    ...(head.width > body.w * 1.6 || head.width < body.w * 0.4 ? [`the head width ${head.width} does not fit a body ${body.w} wide`] : []),
  ]);
  check("its legs stand under the body and reach the ground", [
    ...legs.xs.filter((x) => Math.abs(x) > half + 0.5).map((x) => `a leg at x ${x} is outside the body (half width ${r2(half)})`),
    ...(Math.abs(legs.h - -body.bottom) > 0.8 ? [`the legs are ${legs.h} long but the body's bottom is ${-body.bottom} above the ground: they ${legs.h < -body.bottom ? "float" : "sink into the body"}`] : []),
    ...(legs.xs.length === 0 ? [] : legs.w <= 0 ? ["legs.w must be more than 0"] : []),
  ]);
  check("its arms attach at its sides", [
    ...(Math.abs(Math.abs(arms.x) - half) > 1.2 ? [`the arms at x ±${arms.x} are not at the body's side (±${r2(half)})`] : []),
    ...(!(arms.y > top && arms.y < body.bottom) ? [`the arms at y ${arms.y} are off the body (${r2(top)} to ${body.bottom})`] : []),
    ...(arms.len <= 0 || arms.th <= 0 ? ["arms.len and arms.th must be more than 0"] : []),
  ]);
  if (def.views && typeof def.views === "object") {
    check("its key views agree", Object.entries(def.views).flatMap(([k, v]) => [
      ...(!(Number(v?.L) < Number(v?.R)) ? [`${k}: L must be left of R`] : []),
      ...(Array.isArray(v?.legs) && legs.xs.length && v.legs.length !== legs.xs.length ? [`${k}: ${v.legs.length} legs, the body has ${legs.xs.length}`] : []),
      ...(v?.face === null && ["front", "q", "side"].includes(k) ? [`${k}: a view from the front side has no face`] : []),
    ]));
  }
  if (drawn && sheetsDir) {
    check("its model sheets are drawn and not blank", ["views", "emotions"].flatMap((s) => {
      const f = join(sheetsDir, `${id}-${s}.png`), w = join(sheetsDir, `${id}-${s}.webp`), file = existsSync(f) ? f : existsSync(w) ? w : null;
      if (!file) return [`no ${s} sheet: draw the sheets (character_sheet)`];
      if (!still) return [];
      let sd = 0; try { sd = still(file); } catch (e) { return [`the ${s} sheet cannot be read: ${String(e.message ?? e).split("\n")[0]}`]; }
      return sd < 2 ? [`the ${s} sheet is blank (grey spread ${r2(sd)})`] : [];
    }));
  }
  return { id, passed: lines.filter((l) => l.startsWith("PASS")).length, failed: lines.filter((l) => l.startsWith("FAIL")).length, lines };
}

// Small helpers the sound rules share: a number to the thousandth, kept in bounds; words without their accents.
// (audit/112a B11: one of the files packages/sfx/actions.mjs was split into; actions.mjs is still their door.)


export const r3 = (n) => Math.round(n * 1000) / 1000;

export const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

export const any = (ws, list) => list.split(" ").some((w) => ws.has(w));

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

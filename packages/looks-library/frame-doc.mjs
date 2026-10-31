// A Brand Kit's FRAME.md as something a screen can show and change: its YAML tokens and prose sections read line by line, and each edit made on
// the text itself, so what the screen did not touch stays as it was, byte for byte: a token's alignment, its "# inferred", its source
// "(Guide p. 66)". No YAML library: the text is the kit's truth (Claude reads it, a film copies it), and a parse and dump would lose the comments.
// Pure, no node modules: the server and the Brand Kit page (ui/src/screens/BrandKit.jsx) both load it.

const normal = (md) => String(md ?? "").replace(/\r\n/g, "\n");
const INDENT = (l) => /^[ \t]*/.exec(l)[0].length;
const KEY = /^([ \t]*)([A-Za-z0-9][\w.-]*):[ \t]*/;

/** A value and its comment on one line, with where the value starts and ends: a # after a space and outside quotes starts the comment. */
function splitValue(line, from) {
  let quote = null, end = line.length, comment = "";
  for (let i = from; i < line.length; i++) {
    const c = line[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = null; continue; }
    if (c === "\"" || c === "'") quote = c;
    else if (c === "#" && (i === from || /\s/.test(line[i - 1]))) { end = i; comment = line.slice(i + 1).trim(); break; }
  }
  while (end > from && /\s/.test(line[end - 1])) end--;
  return { from, to: end, raw: line.slice(from, end), comment };
}
const unquote = (s) => { const t = String(s).trim(); return /^".*"$/.test(t) ? t.slice(1, -1).replace(/\\"/g, "\"") : /^'.*'$/.test(t) ? t.slice(1, -1) : t; };
const quoted = (v) => `"${String(v).replace(/"/g, "\\\"")}"`;

/** { fontFamily: "Archivo", cqw: 0.85, upper: true } as [[key, value]], in its order; numbers and booleans as such. */
export function parseMap(raw) {
  const body = String(raw).trim().replace(/^\{/, "").replace(/\}$/, ""), parts = [];
  let cur = "", quote = null, depth = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) { cur += c; if (c === quote) quote = null; continue; }
    if (c === "\"" || c === "'") { quote = c; cur += c; continue; }
    if (c === "(" || c === "[") depth++; else if (c === ")" || c === "]") depth--;
    if (c === "," && depth === 0) { parts.push(cur); cur = ""; } else cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => {
    const at = p.indexOf(":"), k = p.slice(0, at).trim(), v = p.slice(at + 1).trim();
    return [k, /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : /^(true|false)$/.test(v) ? v === "true" : unquote(v)];
  }).filter(([k]) => k);
}
const dumpMap = (entries) => `{ ${entries.map(([k, v]) => `${k}: ${typeof v === "string" ? quoted(v) : v}`).join(", ")} }`;

/** A comment's or a sentence's sources: "(Guide pp. 61, 67; Memo p. 13)" as [{ doc, pages, label }]. */
export function refsIn(text) {
  const out = [];
  for (const g of String(text ?? "").matchAll(/\(([^()]*\bpp?\.\s*\d[^()]*)\)/g)) out.push(...refGroup(g[1]));
  return out;
}
/** "Guide pp. 61, 67; Memo p. 13" as refs; a part with no document name takes the one before it. */
export function refGroup(text) {
  const out = [];
  let doc = null;
  for (const part of String(text).split(";")) {
    const m = /^\s*(.*?)\s*\bpp?\.\s*([\d][\d\s,–-]*)/.exec(part);
    if (!m) continue;
    doc = m[1].replace(/[,:]\s*$/, "").trim() || doc;
    if (!doc) continue;
    const pages = m[2].split(",").flatMap((x) => { const r = /(\d+)\s*[–-]\s*(\d+)/.exec(x); return r ? Array.from({ length: Math.min(200, Math.max(1, r[2] - r[1] + 1)) }, (_, i) => Number(r[1]) + i) : [parseInt(x, 10)]; }).filter(Boolean);
    if (pages.length) out.push({ doc, pages, label: `${doc} ${pages.length > 1 || /[–-]/.test(m[2]) ? "pp." : "p."} ${m[2].trim().replace(/\s+/g, " ")}` });
  }
  return out;
}
const isInferred = (s) => /\binferred\b/i.test(String(s ?? ""));

/** What a kit's text holds: { meta, groups, colors, typography, components, sections, frontEnd }. A group: { key, items, notes, line }. An item:
 *  { key, value, map (an inline map's entries), kids (a nested block's items), comment, inferred, refs, line, label (the "# — x —" above it) }. */
export function parseDoc(md) {
  const text = normal(md), lines = text.split("\n"), doc = { text, meta: {}, groups: [], sections: [], frontEnd: -1 };
  if (lines[0]?.trim() === "---") for (let i = 1; i < lines.length; i++) if (lines[i].trim() === "---") { doc.frontEnd = i; break; }
  const item = (m, line, i, label) => {
    const v = splitValue(line, m[0].length), inline = /^\{.*\}$/.test(v.raw);
    return { key: m[2], value: inline ? null : unquote(v.raw), map: inline ? parseMap(v.raw) : null, kids: null, comment: v.comment, inferred: isInferred(v.comment), refs: refsIn(`(${v.comment})`).length ? refsIn(`(${v.comment})`) : refsIn(v.comment), line: i, from: v.from, to: v.to, label };
  };
  for (let i = 1; i < doc.frontEnd; i++) {
    const line = lines[i], m = KEY.exec(line);
    if (!m || m[1].length) continue;
    const v = splitValue(line, m[0].length);
    if (v.raw === ">" || v.raw === "|" || v.raw === ">-" || v.raw === "|-") {
      const body = [];
      let j = i + 1;
      while (j < doc.frontEnd && (!lines[j].trim() || INDENT(lines[j]) > 0)) body.push(lines[j++].trim());
      doc.meta[m[2]] = { value: body.filter(Boolean).join(" "), line: i, end: j - 1, block: true, comment: "" };
      i = j - 1;
      continue;
    }
    if (v.raw && !/^\{.*\}$/.test(v.raw)) { doc.meta[m[2]] = { value: unquote(v.raw), line: i, end: i, from: v.from, to: v.to, comment: v.comment }; continue; }
    const group = { key: m[2], items: [], notes: [], line: i, end: i };
    if (v.raw) group.items = parseMap(v.raw).map(([key, value]) => ({ key, value: String(value), map: null, kids: null, comment: "", inferred: false, refs: [], line: i, inline: true, label: null }));
    else {
      let label = null, cur = null;
      for (let j = i + 1; j < doc.frontEnd; j++) {
        const l = lines[j];
        if (!l.trim()) continue;
        if (INDENT(l) === 0) break;
        group.end = j;
        const note = /^\s*#\s*(.*)$/.exec(l)?.[1];
        if (note !== undefined) {
          const named = /^[—–-]+\s*(.*?)\s*[—–-]*$/.exec(note);
          if (named) { label = named[1]; cur = null; } else group.notes.push(note);
          continue;
        }
        const k = KEY.exec(l);
        if (!k) continue;
        if (cur && k[1].length > cur.indent) {
          const kid = item(k, l, j, null);
          cur.kids.push(kid); cur.end = j;
        } else {
          const it = item(k, l, j, label);
          if (it.value === "" && !it.map) { it.kids = []; it.indent = k[1].length; it.end = j; cur = it; } else cur = null;
          group.items.push(it);
        }
      }
      i = group.end;
    }
    doc.groups.push(group);
  }
  // the prose: each ## with its body, each ### inside it
  let cur = null;
  const close = (end) => { if (cur) { cur.end = end; cur.body = lines.slice(cur.line + 1, end + 1).join("\n").trim(); doc.sections.push(cur); cur = null; } };
  for (let i = doc.frontEnd + 1; i < lines.length; i++) {
    const m = /^##[ \t]+(.+?)[ \t]*$/.exec(lines[i]);
    if (m) { close(i - 1); cur = { title: m[1], line: i }; }
  }
  close(lines.length - 1);
  const by = (k) => doc.groups.find((g) => g.key === k);
  doc.colors = (by("colors")?.items ?? []).map((x) => ({ ...x, name: x.key, css: x.value, hex: /^#[0-9a-fA-F]{6}$/.test(x.value ?? "") ? x.value.toUpperCase() : null }));
  doc.typography = (by("typography")?.items ?? []).filter((x) => x.map).map((x) => ({ ...x, role: x.key, style: Object.fromEntries(x.map), family: Object.fromEntries(x.map).fontFamily ?? null }));
  doc.families = [...new Set(doc.typography.map((x) => x.family).filter(Boolean))];
  doc.components = (by("components")?.items ?? []).map((x) => ({ ...x, name: x.key, fields: x.kids ?? [] }));
  return doc;
}

/** One ## section's parts: { intro, subs: [{ title, body }] }. */
export function subsOf(body) {
  const out = { intro: [], subs: [] };
  for (const l of String(body ?? "").split("\n")) {
    const m = /^###[ \t]+(.+?)[ \t]*$/.exec(l);
    if (m) out.subs.push({ title: m[1], lines: [] });
    else (out.subs.at(-1)?.lines ?? out.intro).push(l);
  }
  return { intro: out.intro.join("\n").trim(), subs: out.subs.map((s) => ({ title: s.title, body: s.lines.join("\n").trim() })) };
}
/** The Guideline checklist's lines: "- G12 [product] The device stays whole. (Guide p. 66)" as { id, tag, text, refs }. */
export function checklistRows(body) {
  return [...String(body ?? "").matchAll(/^[-*]\s+(G\d+)\s+\[([\w -]+)\]\s+(.+)$/gm)].map((m) => ({ id: m[1], tag: m[2].toLowerCase(), text: m[3].replace(/\s*\([^()]*\bpp?\.\s*\d[^()]*\)\s*$/, "").trim(), refs: refsIn(m[3]) }));
}
/** The Guideline map: { shorts: { Guide: "0. Acme brand guide" }, topics: [{ topic, refs }] }. */
export function guidelineMap(body) {
  const shorts = {}, topics = [];
  for (const m of String(body ?? "").matchAll(/^Short names[^:]*:\s*(.+)$/gm)) for (const p of m[1].split(";")) { const at = p.indexOf(" = "); if (at > 0) shorts[p.slice(0, at).trim()] = p.slice(at + 3).trim().replace(/\.$/, ""); }
  for (const m of String(body ?? "").matchAll(/^[-*]\s+(.+?):\s+(.+)$/gm)) { const refs = refGroup(m[2]); if (refs.length) topics.push({ topic: m[1], refs }); }
  return { shorts, topics };
}
/** A source's short name as one of the kit's PDFs. docs: [{ name }]. */
export function docOf(name, docs, shorts = {}) {
  const low = (s) => String(s ?? "").toLowerCase().replace(/\.[a-z0-9]+$/, "");
  const long = low(shorts[name] ?? name);
  return docs.find((d) => low(d.name) === long) ?? docs.find((d) => low(d.name).includes(long) || long.includes(low(d.name))) ?? null;
}

// ---- what the tokens look like
const lum = (hex) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const sat = (hex) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255]; return (Math.max(...c) - Math.min(...c)) / 255; };
/** Which token is the ground, the ink and the accent (by name first, then by lightness and saturation). */
export function roles(colors) {
  const by = (re) => colors.find((c) => re.test(c.name))?.hex;
  const sorted = [...colors].sort((a, b) => lum(b.hex) - lum(a.hex));
  const bg = by(/^(paper|background|bg|ground|canvas|base|surface|white|light)/i) ?? sorted[0]?.hex ?? "#FFFFFF";
  const ink = by(/^(ink|text|fg|foreground|black|dark|primary-text)/i) ?? sorted.at(-1)?.hex ?? "#111111";
  const rest = colors.filter((c) => c.hex !== bg && c.hex !== ink).sort((a, b) => sat(b.hex) - sat(a.hex));
  return { bg, ink, accent: by(/^(accent|brand|primary|highlight)/i) ?? rest[0]?.hex ?? ink };
}
/** Black or white, whichever reads on this colour. */
export const inkOn = (hex) => (/^#[0-9a-fA-F]{6}$/.test(hex ?? "") && lum(hex) < 0.36 ? "#FFFFFF" : "#000000");
/** A role's size in pixels on a 1920 wide frame, from its cqw or px; null when it has neither. */
export function sizeAt1920(style) {
  if (typeof style?.cqw === "number") return Math.round(style.cqw * 19.2 * 10) / 10;
  if (typeof style?.px === "number") return style.px;
  return null;
}
/** A token's length in pixels on a 1920 wide frame: the first "4cqw", "55px" in its value, else null. */
export function lengthAt1920(value) {
  const m = /(-?\d+(?:\.\d+)?)\s*(cqw|px)\b/.exec(String(value ?? ""));
  return m ? Math.round(Number(m[1]) * (m[2] === "cqw" ? 19.2 : 1) * 10) / 10 : null;
}
const FORMATS = [["16:9", /16\s*[:×x]\s*9|1920\s*[×x]\s*1080/], ["9:16", /9\s*[:×x]\s*16|1080\s*[×x]\s*1920/], ["1:1", /\b1\s*:\s*1\b|1080\s*[×x]\s*1080/], ["4:5", /\b4\s*:\s*5\b|1080\s*[×x]\s*1350/]];
/** The frame shapes a kit documents. */
export const formatsIn = (text) => FORMATS.filter(([, re]) => re.test(String(text ?? ""))).map(([f]) => f);
/** {colors.x} as its colour; other {group.x} tokens stay. */
export function withColors(value, doc) {
  return String(value ?? "").replace(/\{colors\.([\w-]+)\}/g, (all, n) => doc.colors.find((c) => c.name === n)?.css ?? all);
}
function balanced(s, at) {
  let d = 0;
  for (let i = s.indexOf("(", at); i >= 0 && i < s.length; i++) { if (s[i] === "(") d++; else if (s[i] === ")" && --d === 0) return s.slice(at, i + 1); }
  return null;
}
const COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:black|white|transparent)\b/g;
/** What a component's background is as CSS: a gradient as written, a gradient in words ("linear gradient, head to foot: a · b · c", "radial gradient a → b on c"),
 *  or one colour; null when its words give none. */
export function backgroundCss(value, doc) {
  const s = withColors(value, doc), css = /(?:linear|radial|conic)-gradient\(/.exec(s);
  if (css) return balanced(s, css.index);
  const [head, ...on] = s.split(/\s+on\s+/), colours = [...head.matchAll(COLOUR)].map((m) => m[0]);
  const base = on.length ? [...on.join(" ").matchAll(COLOUR)].map((m) => m[0])[0] : null;
  if (/gradient/i.test(head) && colours.length >= 2) return `${/radial/i.test(head) ? `radial-gradient(circle, ${colours.join(", ")})` : `linear-gradient(to bottom, ${colours.join(", ")})`}${base ? `, ${base}` : ""}`;
  return colours[0] ?? base ?? null;
}
/** How to draw a component: { background, color, role (a typography token), radius, border, shadow }, each only when its fields say so. */
export function componentLook(c, doc) {
  const f = (re) => c.fields.find((x) => re.test(x.key))?.value;
  const roleName = /\{typography\.([\w-]+)\}/.exec(f(/^typography$/i) ?? "")?.[1];
  const color = /#[0-9a-fA-F]{3,8}\b/.exec(withColors(f(/^(textColor|color)$/i), doc))?.[0] ?? null;
  const border = withColors(f(/^(border|outline)$/i), doc), shadow = withColors(f(/^(shadow|boxShadow)$/i), doc);
  return { background: backgroundCss(f(/^(background|backgroundColor|bg|fill|ground)$/i), doc), color, role: doc.typography.find((t) => t.role === roleName) ?? null,
    radius: lengthAt1920(f(/^(rounded|radius|borderRadius)$/i)), border: /\d+px\s+\w+/.test(border) ? /\d+px\s+\w+\s+\S+/.exec(border)?.[0] ?? null : null, shadow: /\d+px/.test(shadow) ? shadow : null };
}
/** How many places in the text use a colour token. */
export const usesOf = (text, name) => [...String(text).matchAll(new RegExp(`\\{colors\\.${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\}`, "g"))].length;

// ---- edits: each takes the text and gives the text back
const withLines = (text, fn) => { const lines = normal(text).split("\n"); fn(lines); return lines.join("\n"); };
const groupOf = (doc, key) => doc.groups.find((g) => g.key === key);
const itemOf = (doc, group, key) => groupOf(doc, group)?.items.find((x) => x.key === key);
const splice = (line, it, raw) => line.slice(0, it.from) + raw + line.slice(it.to);

/** A token's value, in place. An item of a one-line map ({ a: "1", b: "2" }) rewrites that map. */
export function setToken(text, group, key, value) {
  const doc = parseDoc(text), it = itemOf(doc, group, key);
  if (!it) return addToken(text, group, key, value);
  return withLines(text, (ls) => {
    if (it.inline) {
      const v = splitValue(ls[it.line], KEY.exec(ls[it.line])[0].length), map = parseMap(v.raw).map(([k, x]) => [k, k === key ? value : x]);
      ls[it.line] = ls[it.line].slice(0, v.from) + dumpMap(map) + ls[it.line].slice(v.to);
    } else ls[it.line] = splice(ls[it.line], it, quoted(value));
  });
}
/** A new token at the end of its group; the group is added before the closing --- when the kit has none. */
export function addToken(text, group, key, value) {
  const doc = parseDoc(text), g = groupOf(doc, group);
  return withLines(text, (ls) => {
    if (g) ls.splice(g.end + 1, 0, `  ${key}: ${quoted(value)}`);
    else ls.splice(doc.frontEnd, 0, "", `${group}:`, `  ${key}: ${quoted(value)}`);
  });
}
export function removeToken(text, group, key) {
  const doc = parseDoc(text), it = itemOf(doc, group, key);
  if (!it || it.inline) return normal(text);
  return withLines(text, (ls) => ls.splice(it.line, (it.end ?? it.line) - it.line + 1));
}
/** A colour, in place: where the prose writes the old code, it follows, unless another token has that same code. */
export function setColor(text, name, value) {
  const doc = parseDoc(text), c = doc.colors.find((x) => x.name === name);
  let out = setToken(text, "colors", name, value);
  if (c?.hex && /^#[0-9a-fA-F]{6}$/.test(value) && !doc.colors.some((x) => x.name !== name && x.hex === c.hex)) {
    const after = parseDoc(out), lines = after.text.split("\n"), hex = new RegExp(c.hex, "gi");
    for (let i = 0; i < lines.length; i++) if (i > after.frontEnd || (i < (groupOf(after, "colors")?.line ?? 0))) lines[i] = lines[i].replace(hex, value.toUpperCase());
    out = lines.join("\n");
  }
  return out;
}
/** One field of a type role ({ fontFamily, cqw, weight, … }); undefined or "" takes the field off. */
export function setTypeField(text, role, field, value) {
  const doc = parseDoc(text), it = itemOf(doc, "typography", role);
  if (!it?.map) return normal(text);
  const gone = value === undefined || value === "" || value === false;
  const raw = (v) => (typeof v === "string" ? quoted(v) : String(v));
  return withLines(text, (ls) => {
    const cur = ls[it.line].slice(it.from, it.to), had = new RegExp(`\\b${field}:\\s*("(?:[^"\\\\]|\\\\.)*"|'[^']*'|[^,}]+?)(\\s*[,}])`);
    // the other fields stay as written ("cqw: 5.0")
    const next = gone ? dumpMap(it.map.filter(([k]) => k !== field)) : had.test(cur) ? cur.replace(had, (_, __, end) => `${field}: ${raw(value)}${end}`) : cur.replace(/\s*\}$/, `, ${field}: ${raw(value)} }`);
    ls[it.line] = splice(ls[it.line], it, next);
  });
}
/** A font replaced in the whole kit: the roles that use it and the words that name it. */
export function replaceFamily(text, from, to) {
  if (!from || !to || from === to) return normal(text);
  return normal(text).replace(new RegExp(`(?<![\\w-])${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "g"), to);
}
/** One field of a component, in place; a new field goes under its last one; "" takes it off. */
export function setComponentField(text, name, field, value) {
  const doc = parseDoc(text), c = itemOf(doc, "components", name);
  if (!c?.kids) return normal(text);
  const kid = c.kids.find((k) => k.key === field);
  return withLines(text, (ls) => {
    if (kid && value === "") ls.splice(kid.line, 1);
    else if (kid) ls[kid.line] = splice(ls[kid.line], kid, quoted(value));
    else if (value !== "") { const at = c.kids.at(-1)?.line ?? c.line; ls.splice(at + 1, 0, `${" ".repeat((c.indent ?? 2) + 2)}${field}: ${quoted(value)}`); }
  });
}
/** A line of the head: description, unit, principle. */
export function setMeta(text, key, value) {
  const doc = parseDoc(text), m = doc.meta[key], v = String(value).replace(/\s+/g, " ").trim();
  return withLines(text, (ls) => {
    if (!m) { ls.splice(doc.frontEnd > 0 ? doc.frontEnd : 0, 0, `${key}: ${quoted(v)}`); return; }
    if (m.block) ls.splice(m.line, m.end - m.line + 1, `${key}: >`, ...wrap(v, 96).map((x) => `  ${x}`));
    else ls[m.line] = ls[m.line].slice(0, m.from) + (/[:#{}]/.test(v) ? quoted(v) : v) + ls[m.line].slice(m.to);
  });
}
function wrap(s, w) {
  const out = [];
  let cur = "";
  for (const word of s.split(" ")) { if (cur && cur.length + word.length + 1 > w) { out.push(cur); cur = word; } else cur = cur ? `${cur} ${word}` : word; }
  if (cur) out.push(cur);
  return out;
}
/** A ## section's body. */
export function setSection(text, title, body) {
  const doc = parseDoc(text), s = doc.sections.find((x) => x.title === title);
  if (!s) return `${normal(text).trimEnd()}\n\n## ${title}\n\n${String(body).trim()}\n`;
  return withLines(text, (ls) => {
    ls.splice(s.line + 1, s.end - s.line, "", ...String(body).trim().split("\n"), "");
  });
}

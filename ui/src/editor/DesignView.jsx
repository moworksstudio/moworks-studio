// The Design step's document as a page to look at:
// design.md / frame.md is the film's design system, written in the DESIGN.md format HyperFrames uses (YAML front matter: name,
// description, colors, typography, spacing, components; then prose). Here it reads as swatches, type samples and rules; the raw text stays
// one click away (Edit). Only the front matter's simple lines are read; anything else shows in the text below.
import { useMemo } from "react";
import Markdown from "./Markdown.jsx";
import { useT } from "../i18n.jsx";

const unq = (s) => String(s ?? "").trim().replace(/^["']|["']$/g, "");

/** { meta: { name, description, unit, principle }, sections: { colors: [...], typography: [...], spacing: [...], components: [...] }, body } */
export function parseDesign(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text ?? "");
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  const meta = {}, sections = {};
  let cur = null, block = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const top = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (top) {
      const [, k, v] = top;
      cur = null; block = null;
      if (v === ">" || v === "|") { block = k; meta[k] = ""; continue; }
      if (v === "") { cur = k; sections[k] = []; continue; }
      meta[k] = unq(v.replace(/\s+#.*$/, ""));
      continue;
    }
    if (block && /^\s+\S/.test(line)) { meta[block] += (meta[block] ? " " : "") + line.trim(); continue; }
    if (!cur) continue;
    const item = /^\s{2}([\w.-]+):\s*(.*?)\s*$/.exec(line);
    if (!item) { if (/^\s{4,}\S/.test(line) && sections[cur].length) sections[cur].at(-1).more.push(line.trim()); continue; }
    const [, name, rest] = item;
    const note = /\s#\s*(.*)$/.exec(rest)?.[1] ?? "";
    const value = rest.replace(/\s+#.*$/, "").trim();
    const fields = {};
    const obj = /^\{(.*)\}$/.exec(value);
    if (obj) for (const f of obj[1].matchAll(/(\w+):\s*("(?:[^"\\]|\\.)*"|[^,]+)/g)) fields[f[1]] = unq(f[2]);
    sections[cur].push({ name, value: obj ? "" : unq(value), fields, note, more: [] });
  }
  return { meta, sections, body: m[2] };
}

const isColor = (v) => /^#[0-9a-f]{3,8}$/i.test(v) || /^(rgb|hsl)a?\(/i.test(v);

export default function DesignView({ text }) {
  const t = useT();
  const d = useMemo(() => parseDesign(text), [text]);
  if (!d) return <Markdown text={text} className="md" />;
  const { meta, sections } = d;
  const colors = (sections.colors ?? []).filter((c) => isColor(c.value));
  const type = (sections.typography ?? []).filter((x) => x.fields.fontFamily);
  const families = [...new Set(type.map((x) => x.fields.fontFamily))];
  const spacing = sections.spacing ?? [];
  const comps = sections.components ?? [];
  return <div className="dv">
    <header className="dv-head">
      <span className="dv-kicker">{t("The film's design: the colours, letters and rules every scene follows")}</span>
      {meta.name && <h3 className="dv-name">{meta.name}</h3>}
      {meta.description && <p className="dv-desc">{meta.description}</p>}
      {(meta.unit || meta.principle) && <dl className="dv-kv">{meta.unit && <><dt>{t("Frame")}</dt><dd>{meta.unit}</dd></>}{meta.principle && <><dt>{t("Principle")}</dt><dd>{meta.principle}</dd></>}</dl>}
    </header>
    {colors.length > 0 && <section><h4>{t("Colours")}</h4>
      <ul className="plain dv-colors">{colors.map((c) => <li key={c.name}><span className="dv-swatch" style={{ background: c.value }} /><span className="dv-cname">{c.name}</span>
        <span className="dv-hex mono">{c.value}</span>{c.note && <span className="dv-note">{c.note}</span>}</li>)}</ul></section>}
    {type.length > 0 && <section><h4>{t("Letters")}</h4>
      <p className="hint">{t("Families: {list}. The samples use the font when this PC has it.", { list: families.join(", ") })}</p>
      <ul className="plain dv-type">{type.map((x) => <li key={x.name}>
        <span className="dv-tname mono">{x.name}</span>
        <span className="dv-sample" style={{ fontFamily: `"${x.fields.fontFamily}", var(--font-body)`, fontWeight: Number(x.fields.weight) || 400, textTransform: x.fields.upper === "true" ? "uppercase" : "none",
          letterSpacing: x.fields.tracking || "normal" }}>{"Aa · Tiếng Việt có dấu · 0123"}</span>
        <span className="dv-tmeta">{x.fields.fontFamily} · {x.fields.px ? `${x.fields.px}px` : ""}{x.fields.weight ? ` · ${x.fields.weight}` : ""}{x.fields.note ? ` · ${x.fields.note}` : ""}</span>
      </li>)}</ul></section>}
    {spacing.length > 0 && <section><h4>{t("Spacing and corners")}</h4>
      <ul className="plain dv-chips">{spacing.map((x) => <li key={x.name}><span className="mono">{x.name}</span> {x.value}{x.note ? <span className="dv-note"> · {x.note}</span> : null}</li>)}</ul></section>}
    {comps.length > 0 && <section><h4>{t("Parts the scenes are built from")}</h4>
      <ul className="plain dv-comps">{comps.map((x) => <li key={x.name}><b>{x.name}</b>{x.more.filter((l) => /^description:/.test(l)).map((l) => <span key={l}> {unq(l.replace(/^description:\s*/, ""))}</span>)}</li>)}</ul></section>}
    {d.body.trim() && <section><h4>{t("Notes")}</h4><Markdown text={d.body} className="md" /></section>}
  </div>;
}

// ---- a JSON plan as a page (the Design step used to show raw JSON) ---------------------------------------------------------------
const human = (k) => String(k).replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
const prim = (v) => v === null || ["string", "number", "boolean"].includes(typeof v);
const allColors = (o) => Object.values(o).length > 0 && Object.values(o).every((x) => typeof x === "string" && isColor(x));

function Value({ v, depth }) {
  if (prim(v)) return <span className="pv-val">{typeof v === "string" && isColor(v) ? <><span className="dv-swatch sm" style={{ background: v }} /> <code>{v}</code></> : String(v)}</span>;
  if (Array.isArray(v)) {
    if (v.every(prim)) return <ul className="plain pv-list">{v.map((x, i) => <li key={i}><Value v={x} depth={depth + 1} /></li>)}</ul>;
    return <div className="pv-cards">{v.map((x, i) => <div key={i} className="pv-card"><Value v={x} depth={depth + 1} /></div>)}</div>;
  }
  if (allColors(v)) return <ul className="plain dv-colors">{Object.entries(v).map(([k, c]) => <li key={k}><span className="dv-swatch" style={{ background: c }} /><span className="dv-cname">{human(k)}</span><span className="dv-hex mono">{c}</span></li>)}</ul>;
  return <dl className={"pv-dl d" + Math.min(depth, 3)}>{Object.entries(v).map(([k, x]) => <div key={k} className="pv-row"><dt>{human(k)}</dt><dd><Value v={x} depth={depth + 1} /></dd></div>)}</dl>;
}

/** A JSON document read as labelled sections; text that is not JSON shows as it is. */
export function PlanView({ text }) {
  let data;
  try { data = JSON.parse(text); } catch { return <pre className="doc-raw">{text}</pre>; }
  if (data === null || typeof data !== "object") return <pre className="doc-raw">{text}</pre>;
  return <div className="dv pv"><Value v={data} depth={0} /></div>;
}

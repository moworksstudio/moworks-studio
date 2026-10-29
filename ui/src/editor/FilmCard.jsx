// The Studio's "This film" tab: what the film was made with, in one place beside the light table: its film style
// (with the author's "by" line and tag, and a way to change it: Film Styles' own "Change the film style?" dialog), its design (Brand Kit,
// or "Follows film style" for an author's style), its format, its characters and its versions
// (Open asks first, as the strip's Versions menu does). Read from project.meta; nothing here is new data.
import { useMemo } from "react";
import { get } from "../api.js";
import { clock, go, useData } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { AUTHORS, AuthorBadge } from "../authors.jsx";
import { designParts } from "../screens/Editor.jsx";
import Versions from "./Versions.jsx";

/** The author a project's style belongs to: the style's own author id, else its "by" name (meta.style.author is the credit line). */
export function authorOfStyle(style) {
  if (!style) return null;
  if (style.authorId && AUTHORS[style.authorId]) return style.authorId;
  if (AUTHORS[style.author]) return style.author;
  const by = String(style.author ?? "").toLowerCase();
  const hit = Object.entries(AUTHORS).find(([, a]) => by && (by.includes(a.by.toLowerCase()) || by.includes(a.title.toLowerCase())));
  if (hit) return hit[0];
  if (style.id === "general") return "moworks";
  return /hyperframes|heygen/i.test(`${style.source ?? ""} ${style.author ?? ""}`) ? "heygen" : null;
}

export default function FilmCard({ id, project, locked, onRestored }) {
  const t = useT();
  const m = project?.meta ?? {};
  const ids = m.characters?.ids ?? [];
  const cast = useData(() => (ids.length ? get("/api/characters") : Promise.resolve({ characters: [] })), [ids.join(",")]);
  const names = useMemo(() => ids.map((x) => cast.data?.characters?.find((c) => c.id === x)?.name).filter(Boolean), [ids, cast.data]);
  const au = authorOfStyle(m.style);
  const parts = designParts(m, t).filter(Boolean);
  const f = m.format ?? {};
  const format = [f.width && f.height ? `${f.width} × ${f.height}` : null, f.aspect ?? null, f.fps ? `${f.fps} fps` : null, m.targetDurationSec ? clock(m.targetDurationSec) : null].filter(Boolean).join(" · ");
  return <div className="fc">
    <section><h4>{t("Film style")}</h4>
      <p>{m.style?.title ? t(m.style.title) : t("No style")}</p>
      {au && <p className="fc-by">{t("by {name}", { name: AUTHORS[au].by })} <AuthorBadge a={au} /></p>}
      <button type="button" className="clink" disabled={locked} onClick={() => go(`/styles?project=${id}`)}>{t("Change the film style")}</button></section>
    <section><h4>{t("Design")}</h4>
      {m.designLocked ? <><dl><dt>{t("Brand Kit")}</dt><dd>{t("Follows film style")}</dd></dl>
        <p className="fc-line">{t("Design follows the film style. You can describe the Brand Kit in the Brief.")}</p></>
        : parts.length ? <ul className="plain fc-list">{parts.map((x) => <li key={x}>{x}</li>)}</ul>
          : <p className="fc-line">{t("Design follows the Brief.")}</p>}</section>
    {format && <section><h4>{t("Format")}</h4><p className="num">{format}</p></section>}
    <section><h4>{t("Characters")}</h4>
      <p>{!ids.length ? <span className="fc-line">{t("None")}</span> : names.length ? names.join(" · ") : <span className="skeleton" style={{ display: "inline-block", width: "6rem", height: "1em" }} />}</p></section>
    <section><h4>{t("Versions")}</h4><Versions projectId={id} locked={locked} onRestored={onRestored} inline /></section>
  </div>;
}

// Film style authors as the app names them: line 1 the set's name with its count ("Anidoodle (35)"), line 2
// "by" the person who made it and a coloured tag. What If belongs to FreshStack and shows "Coming soon" until its engine exists.
// The server's author list (GET /api/styles/list `authors`) wins for any field it sends: title, by, tag; this table fills the rest.
import { useT } from "./i18n.jsx";

export const AUTHORS = {
  moworks: { title: "Moworks", by: "Moworks", tag: "MW" },
  heygen: { title: "HyperFrames", by: "HeyGen", tag: "HF" },
  lemomo: { title: "Lemo Opuscar", by: "Lemomo", tag: "LEMO" },
  vincentwei: { title: "MG Styles", by: "Vincentwei1021", tag: "MG" },
  alexgreensh: { title: "Anidoodle", by: "Alex Greenshpun", tag: "ANI" },
  johnheibel: { title: "Brush Cartoon", by: "John Heibel", tag: "JH" },
  freshstack: { title: "What If", by: "FreshStack", tag: "FS", comingSoon: true },
};
export const AUTHOR_ORDER = ["moworks", "heygen", "lemomo", "vincentwei", "alexgreensh", "johnheibel", "freshstack"];
/** Which author a character belongs to, by the engine that draws it (actors stay with their author). */
export const ENGINE_AUTHOR = { "brush-kit": "johnheibel", "anidoodle-human": "alexgreensh" };

/** An author with its display fields: { id, title, by, tag, count, comingSoon }, from the server's entry `a` (or just an id). */
export function authorView(a, count) {
  const id = typeof a === "string" ? a : a?.id;
  const own = AUTHORS[id] ?? {};
  const srv = typeof a === "object" && a ? a : {};
  // the display names ("Lemo Opuscar", "MG Styles", "Brush Cartoon") win over the server's repo-like titles
  return { ...srv, id, title: own.title ?? srv.title ?? srv.name ?? id, by: own.by ?? srv.by ?? srv.org ?? srv.name ?? id, tag: own.tag ?? srv.tag ?? String(id ?? "?").slice(0, 4).toUpperCase(),
    count: count ?? srv.count ?? null, comingSoon: srv.comingSoon ?? own.comingSoon ?? false };
}

/** The coloured tag (MW, HF, LEMO, MG, ANI, JH, FS); each author keeps one colour everywhere. */
export function AuthorBadge({ a }) {
  const v = authorView(a);
  return <span className={"au-badge au-" + v.id} title={`${v.title} · ${v.by}`}>{v.tag}</span>;
}

/** The two lines: "Anidoodle (35)" and "by Alex Greenshpun ANI". `count` false leaves the number out. */
// `tagBeside` puts the author's tag on the name's line ("Moworks [MW]") and "by …" alone under it: two lines at most
export function AuthorName({ a, count, className = "", tagBeside = false }) {
  const t = useT();
  const v = authorView(a);
  const n = count === false ? null : count ?? v.count;
  return <span className={"au-name " + className + (tagBeside ? " tag-beside" : "")}><b>{tagBeside ? <span className="au-t">{v.title}</span> : v.title}{v.comingSoon ? ` · ${t("Coming soon")}` : n != null ? ` (${n})` : ""}{tagBeside && <AuthorBadge a={v} />}</b>
    <small><span className="who" title={t("by {who}", { who: v.by })}>{t("by {who}", { who: v.by })}</span>{!tagBeside && <AuthorBadge a={v} />}</small></span>;
}

// Characters: the character layer's characters, each drawn by the app from a definition through
// HyperFrames: a views sheet, a sheet of emotions and a short showreel. Clawd is Anthropic's mascot, the author kit's demo: labelled, and never offered for a project.
// Laid out like the Look page: a grid in groups (Moworks, yours, demo), the character in hand beside it. Data: GET /api/characters.
// The user's own characters (saved from a film's Characters dialog) sit here too; any usable character goes into a
// project with "Use in a project", and the user's own can be deleted.
// Laid out as a character tab: a create bar on top (a description and
// "Design with Claude"), a grid of big character cards, the character in hand on the right. No "Draw demo": the app's
// demo media are prebuilt and a character is drawn when it is made; one saved without sheets gets "Redraw". A drawing shows on its card.
// The flat-human kit's parts (Random character, Use as default, a fitting room) are dropped.
// The page becomes a Character creator: (1) describe the character, with an optional reference picture; (2) choose how
// it is drawn: one of anidoodle's hands that draw people, or Brush cartoon (a mascot); (3) "Create with Claude" with an honest
// estimate, then the run's stages and progress; (4) the character lands in the library (Yours / Moworks / anidoodle / Demo) with its
// pictures, Use in a project, Change with Claude, Delete. The server's API: GET /api/characters/styles, POST /api/characters/create and …/change.
// Laid out like the other galleries: a filter column (library, drawing style), the shared 3-row grid with its pager,
// the character in hand beside it. "Create a character" (top right) opens a dialog: the brief, a name and a reference picture, the drawing
// style; "Create" shows a short summary to confirm, and confirming starts Claude and closes the dialog. While Claude works, a tile holds
// the character's place at the top of the grid (name, %, a slim bar) and a chip in the page head shows it too; both open the live steps.
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, FolderPlus, History, ImagePlus, Loader2, Pencil, Play, Plus, RefreshCw, RotateCcw, Search, SlidersHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { del, get, post, watchJob } from "../api.js";
import { BackButton, Banner, Dialog, Pager, useGalleryGrid } from "../components.jsx";
import { ago, go, useData, usePref, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { CreditLine } from "./StyleGallery.jsx";
import { AUTHOR_ORDER, AuthorBadge, AuthorName, authorView, ENGINE_AUTHOR } from "../authors.jsx";
import { useThemeId } from "../theme.jsx";
import CharacterLineup from "../studio/CharacterLineup.jsx";

// characters belong to the author whose engine draws them, and the page is sorted by author first; a rig
// type says what the character is. What If's characters come with its engine ("Coming soon").
const authorOfChar = (c) => ENGINE_AUTHOR[c.engine] ?? "moworks";
const RIGS = [["human", "Human"], ["animal", "Animal"], ["thing", "Thing"], ["robot", "Robot"]];          // The four kinds (Bit is a robot)
/** What the character is (the server sends `kind` on every character; `rig` is an author's rig id such as "cheetah", not the kind). */
const kindOf = (c) => c.kind ?? null;

// how an item was made, and its hover, live with CreditLine (StyleGallery.jsx)
/** A row's group: the server's, or (for older data) Clawd's demo flag. */
const groupOf = (c) => (c.group === "anidoodle" && c.credit?.made && c.credit.made !== "as shipped" ? "yours" : c.group ?? (c.demo ? "demo" : "app"));
/** Can go into a film: the selectable ones, and anidoodle's human characters (the server routes them). */
export const usable = (c) => !c.demo && (c.selectable || c.engine === "anidoodle-human");
/** How a character lives in a film: the line the pickers show. film.human: the style draws anidoodle's people (catalog characterEngine,
 * or a project's humanHand); film.layer: the style has a Character step. A human is animated by its own engine in a human-hand film, a
 * Brush character by the character layer in a Brush film; anywhere else it is a reference drawn in the film's style. */
export const howIn = (c, film) => (c.engine === "anidoodle-human" ? (film.human ? "Animated with the human engine" : "Drawn in this film's style")
  : film.layer && !film.human ? null : "Drawn in this film's style");
/** Characters Claude made for the user can be changed and deleted; the app's and the authors' as shipped cannot. */
const ownOf = (c) => groupOf(c) === "yours";

function Swatches({ colors }) {
  const list = Object.values(colors ?? {});
  if (!list.length) return null;
  return <span className="lk-sw big ch-sw" aria-hidden="true">{list.map((c) => <i key={c} style={{ background: c }} />)}</span>;
}

// the author is its own tag; on a card it reads "Author", the app's own word ("From the author" ran onto two lines and was cut)
const TAG = { yours: "Yours", app: "Moworks", demo: "Demo only", anidoodle: "Author" };
const LIB = [["yours", "Yours"], ["app", "Moworks"], ["anidoodle", "From the author"], ["demo", "Demo"]];
const range = (r, unit) => (Array.isArray(r) ? (r[0] === r[1] ? `${r[0]}${unit}` : `${r[0]}–${r[1]}${unit}`) : r != null ? `${r}${unit}` : "");
/** A cost range in dollars: "$7–$11", "$0.30–$1.50" (the chosen style's own, from the server's measured runs). */
const usd = (r) => { const f = (n) => `$${Number(n) < 10 && Number(n) % 1 ? Number(n).toFixed(2) : Math.round(Number(n))}`; return Array.isArray(r) ? (r[0] === r[1] ? f(r[0]) : `${f(r[0])}–${f(r[1])}`) : r != null ? f(r) : ""; };
const readImage = (file) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file); });
const picOf = (c) => c.media?.poster ?? c.media?.views ?? c.media?.sheet ?? null;

function CharacterCard({ c, on, fresh, job, onPick }) {
  const t = useT();
  const g = groupOf(c);
  return <button type="button" className={"sgb-card ch-card" + (on ? " on" : "")} aria-pressed={on} onClick={() => onPick(c)}>
    <span className="shot">{picOf(c) ? <img src={picOf(c)} alt="" loading="lazy" /> : <span className="lk-noimg ch-none"><Swatches colors={c.colors} /><small>{t("No sheets yet")}</small></span>}
      {job && <span className="ch-drawing"><Loader2 size={16} className="spin" />{job.progress != null ? `${job.progress}%` : t("Drawing…")}</span>}
      {(on || fresh) && <span className={"chk" + (fresh ? " fresh" : "")} title={fresh ? t("Just made") : undefined}><Check size={13} /></span>}</span>
    <span className="nm">{c.name}</span>
    <span className="by"><AuthorBadge a={authorOfChar(c)} /><span className={"ch-tag k-" + g}>{t(TAG[g] ?? g)}</span>{kindOf(c) && <span className="ch-tag">{t(RIGS.find(([k]) => k === kindOf(c))?.[1] ?? kindOf(c))}</span>}
      {!c.selectable && c.engine !== "anidoodle-human" && g !== "demo" && <span className="tech bad"><AlertTriangle size={11} />{t("Not for films")}</span>}</span>
  </button>;
}

/** The pictures and clips of a character, as small thumbnails: Views and Emotions (Brush), the sheet and walk per drawing hand
 *  (anidoodle's people), the showreel. Each opens full size in the viewer. */
function mediaOf(c, t) {
  const m = c.media ?? {}, v = m.madeAt ? `?v=${encodeURIComponent(m.madeAt)}` : "";            // a redrawn character keeps its file names
  const cap = (h) => (h ? h[0].toUpperCase() + h.slice(1) : "");
  const out = [];
  if (m.views) out.push({ key: "views", label: t("Views"), src: m.views + v });
  if (m.emotions) out.push({ key: "emotions", label: t("Emotions"), src: m.emotions + v });
  const sets = [[null, m.sheet, m.walk], ...(c.hands ?? []).map((h) => [h, m["sheet" + cap(h)], m["walk" + cap(h)]])], seen = new Set();
  for (const [h, sheet, walk] of sets) {
    if (sheet && !seen.has(sheet)) { seen.add(sheet); out.push({ key: "sheet" + (h ?? ""), label: h ? `${t("Sheet")} · ${t(cap(h))}` : t("Sheet"), src: sheet }); }
    if (walk && !seen.has(walk)) { seen.add(walk); out.push({ key: "walk" + (h ?? ""), label: h ? `${t("Walk")} · ${t(cap(h))}` : t("Walk"), src: walk, video: true }); }
  }
  return out;
}

/** One picture or clip full size, over the page. */
function Viewer({ item, name, onClose }) {
  return <Dialog wide title={`${name} · ${item.label}`} onClose={onClose}>
    <div className="ch-viewer">{item.video ? <video src={item.src} controls autoPlay muted loop playsInline /> : <img src={item.src} alt={`${name} · ${item.label}`} />}</div>
  </Dialog>;
}

/** Every run that made or changed the character: when, what, how it went, minutes and $; opened from a small link. */
function RunHistory({ c, onUndone, onClose }) {
  const t = useT();
  const toast = useToast();
  const h = [...(c.history ?? [])].reverse();
  const OUT = { created: "Made", changed: "Changed", partly: "Partly changed", unchanged: "Not changed" };
  const undo = async () => { try { await post(`/api/characters/${c.id}/undo`); toast(t("{name} is back as it was", { name: c.name })); onUndone(); onClose(); } catch (e) { toast(e.message, "error"); } };
  return <Dialog title={t("{name} · history", { name: c.name })} onClose={onClose} footer={<><span className="spacer" />
    {ownOf(c) && c.versions?.length > 0 && <button type="button" className="btn" onClick={undo}><RotateCcw size={14} />{t("Undo the last change")}</button>}
    <button className="btn" onClick={onClose}>{t("Close")}</button></>}>
    <ol className="plain ch-hist">{h.map((x, i) => <li key={i}><span className="muted">{ago(x.at)}</span>
      <b>{t(x.kind === "undo" ? "Undo" : OUT[x.outcome] ?? (x.kind === "create" ? "Made" : "Changed"))}</b>
      {x.text && x.kind !== "undo" && <span className="ch-hist-t" title={x.text}>{x.text}</span>}
      <span className="muted num">{x.minutes != null ? `${Math.max(1, Math.round(x.minutes))} min` : ""}{x.costUsd != null ? ` · ${usd(x.costUsd)}` : ""}</span></li>)}</ol>
  </Dialog>;
}

/** The description under the character's own name: a definition written before the user named it ("Kimchi, a small round
 *  paper-lantern…" on Lantern) reads with the saved name. */
const aboutOf = (c) => {
  const a = c.about ?? "", m = /^([A-Z][\w'’-]+)(?=,| is | the )/.exec(a);
  return m && c.name && m[1] !== c.name && !c.name.includes(m[1]) ? c.name + a.slice(m[1].length) : a;
};

/** The character in hand, fitting its column with no scroll: a short preview, name and library, the description, colours, the
 *  pictures as thumbnails, one row of actions (Use in a project, Edit, Delete), History as a link, the credit. */
function CharacterDetails({ c, job, onRedraw, onDeleted, onChange, onReload }) {
  const t = useT();
  const toast = useToast();
  const [use, setUse] = useState(false);          // "Use in a project": the project picker
  const [ask, setAsk] = useState(false);          // delete one of the user's own
  const [view, setView] = useState(null);         // a thumbnail open full size
  const [hist, setHist] = useState(false);
  const m = c.media ?? {};
  const v = m.madeAt ? `?v=${encodeURIComponent(m.madeAt)}` : "";
  const g = groupOf(c);
  const media = mediaOf(c, t);
  const runs = c.history ?? [], spent = runs.reduce((n, x) => n + (Number(x.costUsd) || 0), 0);
  return <>
    <div className="sgb-big ch-reel">{m.clip ? <video key={m.clip + v} src={m.clip + v} poster={m.poster ? m.poster + v : undefined} controls muted loop playsInline preload="metadata" />
      : picOf(c) ? <img src={picOf(c) + v} alt="" /> : <span className="lk-noimg ch-none"><Swatches colors={c.colors} /><small>{t("No sheets yet")}</small></span>}
      {job && <span className="ch-drawing"><Loader2 size={16} className="spin" />{job.stage ? t(job.stage) : t("Drawing…")}{job.progress != null ? ` · ${job.progress}%` : ""}</span>}</div>
    <div className="sgb-head"><h2 className="sgb-title">{c.name}</h2>
      <p className="sgb-sub"><AuthorName a={authorOfChar(c)} count={false} className="ch-au" /><span className={"ch-tag k-" + g}>{t(TAG[g] ?? g)}</span>{m.madeAt && <span>{t("drawn {when}", { when: ago(m.madeAt) })}</span>}
        {runs.length > 0 && <button type="button" className="clink ch-hist-link" onClick={() => setHist(true)}><History size={12} />{t("History")} <span className="num">{runs.length}{spent ? ` · ${usd(spent)}` : ""}</span></button>}</p></div>
    {c.label && <p className="warn-note"><AlertTriangle size={13} />{t(c.label)}</p>}
    {c.about && <p className="sgb-desc ch-about" title={aboutOf(c)}>{t(aboutOf(c))}</p>}
    <Swatches colors={c.colors} />
    {media.length > 0 && <div className="ch-thumbs">{media.map((x) => <button key={x.key} type="button" className="ch-thumb" onClick={() => setView(x)} title={t("Open full size")}>
      <span className="pic">{x.video ? <video src={x.src + "#t=0.5"} muted playsInline preload="metadata" /> : <img src={x.src} alt="" />}{x.video && <Play size={14} className="play" />}</span>
      <span className="cap">{x.label}</span></button>)}</div>}
    <div className="ch-acts ch-acts-row">
      {usable(c) && <button className="btn primary" onClick={() => setUse(true)}><FolderPlus size={14} />{t("Use in a project")}</button>}
      {g === "yours" && c.engine !== "anidoodle-human" && !m.views && !job && <button className="btn" onClick={() => onRedraw(c)}><RefreshCw size={14} />{t("Redraw")}</button>}
      {ownOf(c) && <button className="btn" onClick={() => onChange(c)} disabled={!!job} title={t("Change it with Claude")}><Pencil size={14} />{t("Edit")}</button>}
      {ownOf(c) && <button className="btn ghost icon" onClick={() => setAsk(true)} aria-label={t("Delete {name}", { name: c.name })} title={t("Delete")}><Trash2 size={15} /></button>}
    </div>
    {/* no "Made by Claude in … min · $…": one credit line, in this column only */}
    {c.credit && <div className="ch-credits"><CreditLine author={c.credit.author} licence={c.credit.licence} link={c.credit.link} commit={c.credit.commit} made={c.credit.made} title={c.credit.summary || undefined} /></div>}
    {use && <UseInProject c={c} onClose={() => setUse(false)} />}
    {view && <Viewer item={view} name={c.name} onClose={() => setView(null)} />}
    {hist && <RunHistory c={c} onUndone={onReload} onClose={() => setHist(false)} />}
    {ask && <Dialog title={t("Delete “{title}”?", { title: c.name })} danger onClose={() => setAsk(false)} footer={<><span className="spacer" />
      <button className="btn" onClick={() => setAsk(false)}>{t("Cancel")}</button>
      <button className="btn danger" onClick={async () => { try { await del(`/api/characters/${c.id}`); toast(t("Deleted “{title}”", { title: c.name })); setAsk(false); onDeleted(); } catch (e) { toast(e.message, "error"); } }}><Trash2 size={14} />{t("Delete")}</button></>}>
      {/* one idea a line, the loss in red */}
      <div className="dlg-lines"><p className="dlg-warn">{t("“{title}” leaves your characters.", { title: c.name })}</p><p>{t("Films that already use it keep their copy.")}</p></div></Dialog>}
  </>;
}

/** The projects a character can go into: every film; `characters: false` means the film draws it as a reference. */
const eligible = () => get("/api/characters/projects");

/** Pick a project and put the character in it (POST /api/projects/<id>/characters/use): the film's CHARACTERS.json gets it. Only projects
 *  whose style acts with characters are offered. */
function UseInProject({ c, onClose }) {
  const t = useT();
  const toast = useToast();
  const q = useData(eligible, []);
  const [pid, setPid] = useState(null);
  const [busy, setBusy] = useState(false);
  const list = (q.data?.projects ?? []).filter((p) => !p.missing);
  const ok = async () => {
    setBusy(true);
    try { await post(`/api/projects/${pid}/characters/use`, { ids: [c.id] }); toast(t("{name} is in the project", { name: c.name })); onClose(); go(`/projects/${pid}/character`); }
    catch (e) { toast(e.message, "error"); setBusy(false); }
  };
  return <Dialog title={t("Use {name} in a project", { name: c.name })} onClose={onClose} footer={<><span className="hint">{t("The project's Characters dialog opens with it.")}</span><span className="spacer" />
    <button className="btn" onClick={onClose}>{t("Cancel")}</button>
    <button className="btn primary" onClick={ok} disabled={!pid || busy}>{busy ? <Loader2 size={14} className="spin" /> : <FolderPlus size={14} />}{t("Use")}</button></>}>
    {q.error ? <Banner kind="error">{q.error.message}</Banner> : !q.data ? <div className="skeleton" style={{ height: "8rem" }} />
      : list.length === 0 ? <p className="hint">{t("No project yet.")}</p>
      : <ul className="plain ch-projects" role="radiogroup" aria-label={t("Projects")}>{list.map((p) => <li key={p.id}>
        <button type="button" role="radio" aria-checked={pid === p.id} className={pid === p.id ? "on" : ""} onClick={() => setPid(p.id)}>
          <b>{p.title}</b><span className="muted">{[p.style?.title ?? p.style, (() => { const h = howIn(c, { human: !!p.humanHand, layer: !!p.characters }); return h && t(h); })()].filter(Boolean).join(" · ")}</span>{pid === p.id && <Check size={14} />}</button></li>)}</ul>}
  </Dialog>;
}

/** The drawing styles a character can be made in: anidoodle's hands that draw people, and Brush cartoon (GET /api/characters/styles). */
function StyleGrid({ styles, value, onPick }) {
  const t = useT();
  return <div className="cc-styles" role="radiogroup" aria-label={t("Drawing style")}>
    {styles.map((x) => { const id = `${x.engine}:${x.hand}`, on = value === id;
      return <button key={id} type="button" role="radio" aria-checked={on} className={"cc-style" + (on ? " on" : "")} onClick={() => onPick(id)} title={x.example ? t(x.example) : undefined}>
        <span className="cc-pic">{x.thumb ? <img src={x.thumb} alt="" loading="lazy" /> : <span className="cc-noimg">{x.engine === "brush-kit" ? "Brush" : x.hand}</span>}{on && <span className="chk"><Check size={12} /></span>}</span>
        <span className="cc-nm">{t(x.label)}</span><span className="cc-est num">{range(x.estimate?.minutes, " min")}{x.estimate?.usd != null ? ` · ${usd(x.estimate.usd)}` : ""}</span></button>; })}
    {(() => { const credit = styles.find((x) => x.thumbCredit)?.thumbCredit; return credit ? <p className="credit-line cc-credit">{t("Pictures: {credit}", { credit })}</p> : null; })()}
  </div>;
}

/** What a change did: Claude's "Changed / Could not" in its words, or why nothing changed; Undo when it changed. */
function ChangeResult({ r, onUndo, onClose }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const changed = r.outcome === "changed" || r.outcome === "partly";
  return <div className={"cc-result " + (changed ? (r.outcome === "partly" ? "partly" : "ok") : "none")} role="status">
    <div className="cc-result-h"><b>{changed ? t("{name} changed", { name: r.name }) : t("{name} was not changed", { name: r.name })}</b>
      {r.run && <span className="muted num">{t("{min} min, {usd}", { min: Math.max(1, Math.round(r.run.minutes ?? 0)), usd: usd(r.run.costUsd) })}</span>}
      <span className="spacer" />
      {changed && <button type="button" className="btn sm" disabled={busy} onClick={async () => { setBusy(true); try { await onUndo(); } finally { setBusy(false); } }}>{busy ? <Loader2 size={13} className="spin" /> : <RotateCcw size={13} />}{t("Undo")}</button>}
      <button type="button" className="btn ghost icon sm" onClick={onClose} aria-label={t("Close")}><X size={14} /></button></div>
    {r.says?.changed && <p className="state-line ok"><Check size={13} />{r.says.changed}</p>}
    {r.says?.couldNot && <p className="state-line run"><AlertTriangle size={13} />{t("Could not")}: {r.says.couldNot}</p>}
    {!changed && !r.says?.couldNot && <p className="state-line run"><AlertTriangle size={13} />{t("Claude did not change anything it could see; nothing was saved.")}</p>}
  </div>;
}

/** Create a character, or change one of the user's: the brief, a name and a reference picture, then the drawing style (its picture,
 *  minutes and cost); "Create" shows a short summary to confirm; confirming starts Claude and the dialog closes by itself. */
function CreateDialog({ styles, changing, onClose, onStarted }) {
  const t = useT();
  const toast = useToast();
  const [desc, setDesc] = useState("");
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);          // { name, url } as a data: URL
  const [rig, setRig] = usePref("characters:rig", "human");          // Human, Animal or Thing (the server reads it)
  const [style, setStyle] = usePref("characters:style-v2", "brush-kit:brush");          // Brush cartoon first: minutes, not half an hour
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const pickFile = useRef(null);
  // from a human-hand film's picker: the creator opens in that film's hand
  useEffect(() => { const h = new URLSearchParams(location.hash.split("?")[1] ?? "").get("hand"); if (h && styles.some((x) => x.engine === "anidoodle-human" && x.hand === h)) setStyle(`anidoodle-human:${h}`); }, []);          // eslint-disable-line react-hooks/exhaustive-deps
  const st = styles.find((x) => `${x.engine}:${x.hand}` === style) ?? styles[0];
  // The engine first, then what the character is (the kinds that engine draws, its default first), then the hand
  const engines = [...new Set(styles.map((x) => x.engine))];
  const kinds = st?.rigs?.length ? st.rigs : RIGS.map(([id, label]) => ({ id, label }));
  useEffect(() => { if (st?.rigs?.length && !st.rigs.some((r) => r.id === rig)) setRig(st.rigs[0].id); }, [st?.engine, st?.hand]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickEngine = (e) => { const first = styles.find((x) => x.engine === e); if (first) setStyle(`${first.engine}:${first.hand}`); };
  // a change costs about what making it in its own style did
  const ownStyle = changing ? styles.find((x) => x.engine === changing.engine && (x.hand === changing.hand || x.engine === "brush-kit")) : null;
  const est = (changing ? ownStyle : st)?.estimate;
  const addImage = async (f) => { if (!f) return; if (!/^image\/(png|jpe?g|webp)$/i.test(f.type)) { toast(t("Use a PNG, JPEG or WebP picture"), "error"); return; } setImage({ name: f.name, url: await readImage(f) }); };
  const start = async () => {
    setErr(null); setBusy(true);
    try {
      const body = changing ? { text: desc.trim(), image: image?.url } : { description: desc.trim(), name: name.trim() || undefined, image: image?.url, rig, engine: st.engine, hand: st.engine === "anidoodle-human" ? st.hand : undefined };
      const r = await post(changing ? `/api/characters/${changing.id}/change` : "/api/characters/create", body);
      onStarted({ job: r.job ?? r, name: changing ? changing.name : name.trim() || null, changing: changing?.id ?? null });
    } catch (e) { setErr(e.status === 409 ? t("Another character is being made; wait for it to finish.") : e.message); setBusy(false); }
  };
  const title = changing ? t("Edit {name}", { name: changing.name }) : t("Create a character");
  const footer = confirm
    ? <>{err && <span className="state-line stop"><AlertTriangle size={14} />{t(err)}</span>}<span className="spacer" />
      <button className="btn" onClick={() => setConfirm(false)} disabled={busy}>{t("Back")}</button>
      <button className="btn primary" onClick={start} disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}{changing ? t("Edit with Claude") : t("Create with Claude")}</button></>
    : <>{est && <span className="hint">{t("About {min} · about {usd}", { min: range(est.minutes, " min"), usd: usd(est.usd) })}</span>}<span className="spacer" />
      <button className="btn" onClick={onClose}>{t("Cancel")}</button>
      <button className="btn primary" onClick={() => setConfirm(true)} disabled={!desc.trim() || (!changing && !st)}>{changing ? t("Edit") : t("Create")}</button></>;
  return <Dialog wide title={title} onClose={busy ? undefined : onClose} footer={footer}>
    {confirm ? <div className="cc-confirm">
      {!changing && st?.thumb && <img className="cc-confirm-pic" src={st.thumb} alt="" />}
      <dl className="kv">
        <dt>{t("Name")}</dt><dd>{changing ? changing.name : name.trim() || t("Claude names it")}</dd>
        {!changing && <><dt>{t("Type")}</dt><dd>{t(RIGS.find(([k]) => k === rig)?.[1] ?? rig)}</dd><dt>{t("Drawing style")}</dt><dd>{t(st.label)}</dd></>}
        <dt>{changing ? t("What to change") : t("Brief")}</dt><dd className="cc-confirm-brief">{desc.trim()}</dd>
        {image && <><dt>{t("Reference")}</dt><dd>{image.name}</dd></>}
        {est && <><dt>{t("Time")}</dt><dd><b>{t("about {min}", { min: range(est.minutes, " min") })}</b></dd><dt>{t("Cost")}</dt><dd><b>{t("about {usd}", { usd: usd(est.usd) })}</b> <span className="muted">{t("of your plan's usage")}</span></dd></>}
      </dl>
      <p className="hint">{t("Claude works on it in the background; the Characters page shows how far it is. You can keep working.")}</p>
    </div>
    : <div className={"cc-form" + (changing ? " one" : "")}>
      <div className="cc-left">
        <label className="np2-l" htmlFor="cc-desc">{changing ? t("What to change") : t("Brief")}</label>
        <textarea id="cc-desc" className="textarea cc-desc" spellCheck={false} autoFocus value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={changing ? t("e.g. a yellow raincoat and shorter hair") : t("Who they are and how they look: age, build, hair, clothes, colours, what they carry. e.g. a retired firefighter in a red turnout coat, grey moustache, kind eyes.")} />
        <div className="cc-row">
          {!changing && <input className="input" spellCheck={false} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Name (optional)")} aria-label={t("Name")} />}
          {image ? <span className="cc-img"><img src={image.url} alt="" /><span>{image.name}</span><button type="button" className="btn ghost icon sm" onClick={() => setImage(null)} aria-label={t("Remove")}><X size={13} /></button></span>
            : <button type="button" className="btn sm" onClick={() => pickFile.current?.click()}><ImagePlus size={14} />{t("Reference picture (optional)")}</button>}
          <input ref={pickFile} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </div>
      {!changing && <div className="cc-right">
        {engines.length > 1 && <div className="cc-rig"><span className="np2-l" id="cc-eng-l">{t("Author")}</span>
          <span className="segmented sm" role="radiogroup" aria-labelledby="cc-eng-l">{engines.map((e) => <button key={e} type="button" role="radio" aria-checked={st?.engine === e} aria-pressed={st?.engine === e}
            onClick={() => pickEngine(e)}>{authorView(ENGINE_AUTHOR[e] ?? e).title}</button>)}</span></div>}
        <div className="cc-rig"><span className="np2-l" id="cc-rig-l">{t("Type")}</span>
          <span className="segmented sm" role="radiogroup" aria-labelledby="cc-rig-l">{kinds.map((k) => <button key={k.id} type="button" role="radio" aria-checked={rig === k.id} aria-pressed={rig === k.id}
            onClick={() => setRig(k.id)} title={k.about ? t(k.about) : undefined}>{t(k.label ?? k.id)}</button>)}</span></div>
        <span className="np2-l">{t("Drawing style")}</span><StyleGrid styles={styles.filter((x) => x.engine === st?.engine)} value={style} onPick={setStyle} /></div>}
    </div>}
  </Dialog>;
}

/** The run in progress, step by step: its stage, progress and the latest lines Claude wrote. */
function RunSteps({ run, onClose }) {
  const t = useT();
  const j = run.job;
  return <Dialog title={run.changing ? t("Editing {name}", { name: run.name }) : t("Making {name}", { name: run.name ?? t("a new character") })} onClose={onClose}
    footer={<><span className="hint">{t("It goes on if you close this.")}</span><span className="spacer" /><button className="btn" onClick={onClose}>{t("Close")}</button></>}>
    <p className="state-line run"><Loader2 size={14} className="spin" />{t(j.stage ?? "Starting…")}{j.progress != null ? ` · ${j.progress}%` : ""}</p>
    <div className="ch-bar"><span style={{ transform: `scaleX(${Math.max(3, j.progress ?? 3) / 100})` }} /></div>
    {Array.isArray(j.log) && j.log.length > 0 && <ol className="plain cc-log">{j.log.slice(-10).map((l, i) => <li key={i}>{l}</li>)}</ol>}
  </Dialog>;
}

/** The tile that holds the place of the character Claude is making: its name, how far, a slim bar; it opens the live steps. */
function MakingTile({ run, onOpen }) {
  const t = useT();
  const p = run.job.progress;
  return <button type="button" className="sgb-card ch-making" onClick={onOpen} title={t("See the steps")}>
    <span className="shot"><span className="ch-making-in"><Loader2 size={18} className="spin" /><b className="num">{p != null ? `${p}%` : t("Starting…")}</b>
      <span className="ch-bar"><span style={{ transform: `scaleX(${Math.max(3, p ?? 3) / 100})` }} /></span></span></span>
    <span className="nm">{run.name ?? t("New character")}</span>
    <span className="by"><span className="ch-tag k-yours">{t(run.changing ? "Changing" : "Making")}</span></span>
  </button>;
}

const F0 = { authors: [], rigs: [], libs: [], styles: [], q: "" };
const styleKeyOf = (c) => (c.engine === "anidoodle-human" ? `anidoodle-human:${c.hand ?? c.hands?.[0] ?? ""}` : "brush-kit:brush");
function Box({ on }) { return <span className="sgb-box" aria-hidden="true">{on && <Check size={11} />}</span>; }

export default function Characters() {
  const t = useT();
  const toast = useToast();
  const studio = useThemeId() === "studio";
  const q = useData(() => get("/api/characters"), []);
  const [cur, setCur] = usePref("characters:current", null);
  const [fp, setFp] = usePref("characters:facets", F0);
  const f = { ...F0, ...fp };
  const [panel, setPanel] = useState(null);           // narrow window: "filters" or "style" (the character) over the grid
  const [jobs, setJobs] = useState({});               // character id → its drawing job, shown on its card and in the details
  const [make, setMake] = useState(null);             // the create dialog: { changing } or null
  const [run, setRun] = useState(null);               // Claude making or changing a character: { job, name, changing }
  const [steps, setSteps] = useState(false);
  const [fresh, setFresh] = useState(null);           // the character just made: a green check on its tile
  const [result, setResult] = useState(null);         // the last change's outcome
  const sq = useData(() => get("/api/characters/styles").catch(() => ({ styles: [] })), []);
  const styles = sq.data?.styles ?? [];
  const list = q.data?.characters ?? [];
  const set = (x) => setFp((o) => ({ ...F0, ...o, ...x }));
  const toggle = (xs, x) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
  const label = (k) => { const s = styles.find((x) => `${x.engine}:${x.hand}` === k); return s ? t(s.label).replace(/\s*\([^)]*\)$/, "") : k.split(":")[1] || t("Other"); };          // "Brush cartoon (a mascot…)" → "Brush cartoon"
  const passes = (c, skip) => (skip === "authors" || !f.authors.length || f.authors.includes(authorOfChar(c))) && (skip === "rigs" || !f.rigs.length || f.rigs.includes(kindOf(c)))
    && (skip === "libs" || !f.libs.length || f.libs.includes(groupOf(c))) && (skip === "styles" || !f.styles.length || f.styles.includes(styleKeyOf(c)))
    && (!f.q || [c.name, c.about].join(" ").toLowerCase().includes(f.q.toLowerCase()));
  const rank = (c) => AUTHOR_ORDER.indexOf(authorOfChar(c)) * 10 + LIB.findIndex(([k]) => k === groupOf(c));
  const shown = list.filter((c) => passes(c)).sort((a, b) => rank(a) - rank(b));
  const count = (skip, key) => { const m = new Map(); for (const c of list.filter((x) => passes(x, skip))) m.set(key(c), (m.get(key(c)) ?? 0) + 1); return m; };
  const byLib = count("libs", groupOf), byStyle = count("styles", styleKeyOf), byAuthor = count("authors", authorOfChar), byRig = count("rigs", kindOf);
  const charAuthors = AUTHOR_ORDER.filter((a) => list.some((c) => authorOfChar(c) === a));
  const styleKeys = [...new Set(list.map(styleKeyOf))].sort((a, b) => label(a).localeCompare(label(b)));
  const sel = shown.find((c) => c.id === cur) ?? shown.find(usable) ?? shown[0] ?? null;
  // the shared 3-row grid; the tile of a character being made takes the first place
  const grid = useGalleryGrid(), slots = grid.size - (run && !run.changing ? 1 : 0);
  const [pg, setPg] = useState(0);
  useEffect(() => { setPg(0); }, [fp]);
  const pick = (c) => { setCur(c.id); if (matchMedia("(max-width: 1100px)").matches) setPanel("style"); };
  useEffect(() => { if (!panel) return undefined; const esc = (e) => { if (e.key === "Escape") setPanel(null); }; addEventListener("keydown", esc); return () => removeEventListener("keydown", esc); }, [panel]);

  // follow a run: started here, or already running when the page opens (another visit, another window)
  const follow = (r) => {
    setRun(r);
    watchJob(r.job.id, (x) => {
      if (!x) return;
      if (x.status === "running") { setRun((o) => (o ? { ...o, job: { ...o.job, ...x } } : o)); return; }
      setRun(null); setSteps(false); q.reload();
      if (x.status === "done") {
        const id = x.result?.id ?? x.characterId ?? r.changing, runInfo = x.result?.run;
        if (r.changing) setResult({ ...x.result, id: r.changing, name: x.result?.name ?? r.name });
        else toast(t("“{name}” is in your characters", { name: x.result?.name ?? r.name ?? "" }) + (runInfo ? ` · ${t("{min} min, {usd}", { min: Math.max(1, Math.round(runInfo.minutes ?? 0)), usd: usd(runInfo.costUsd) })}` : ""));
        if (id) { setCur(id); setFresh(id); setPg(0); }
      } else if (x.status === "failed") toast(x.error?.message ?? t("Claude could not finish the character."), "error");
    }, 2000);
  };
  useEffect(() => {
    get("/api/tasks/running").then((r) => { const j = (r.jobs ?? []).find((x) => x.kind === "character-create"); if (j) follow({ job: j, name: (j.title ?? "").replace(/^(Making|Changing) | with Claude$/g, "") || null, changing: /^Changing /.test(j.title ?? "") ? "?" : null }); }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const redraw = async (c) => {
    try {
      const r = await post(`/api/characters/${c.id}/demo`); const j = r.job ?? r; setJobs((x) => ({ ...x, [c.id]: j }));
      watchJob(j.id, (x) => { if (!x) return; setJobs((o) => ({ ...o, [c.id]: x }));
        if (x.status !== "running") { setJobs((o) => { const n = { ...o }; delete n[c.id]; return n; }); q.reload(); if (x.status === "failed") toast(x.error?.message ?? t("The sheets were not drawn."), "error"); } }, 1500);
    } catch (e) { toast(e.message, "error"); }
  };
  const undo = async () => { try { await post(`/api/characters/${result.id}/undo`); toast(t("{name} is back as it was", { name: result.name })); setResult(null); q.reload(); } catch (e) { toast(e.message, "error"); } };
  const pills = [...f.authors.map((k) => [authorView(k).title, { authors: f.authors.filter((x) => x !== k) }]), ...f.rigs.map((k) => [t(RIGS.find(([x]) => x === k)?.[1] ?? k), { rigs: f.rigs.filter((x) => x !== k) }]),
    ...f.libs.map((k) => [t(LIB.find(([x]) => x === k)?.[1] ?? k), { libs: f.libs.filter((x) => x !== k) }]), ...f.styles.map((k) => [label(k), { styles: f.styles.filter((x) => x !== k) }]),
    ...(f.q ? [[`“${f.q}”`, { q: "" }]] : [])];
  const row = (key, on, onClick, text, n) => <button key={key} type="button" className={"sgb-opt" + (on ? " on" : "")} role="checkbox" aria-checked={on} onClick={onClick}>
    <Box on={on} /><span className="l">{text}</span><span className="n num">{n ?? 0}</span></button>;
  const canCreate = styles.length > 0;
  const dialogs = <>
    {make && <CreateDialog styles={styles} changing={make.changing} onClose={() => setMake(null)} onStarted={(r) => { setMake(null); setFresh(null); setResult(null); follow(r); }} />}
    {steps && run && <RunSteps run={run} onClose={() => setSteps(false)} />}</>;
  // The Studio: the same state and data, laid out as a line-up by author with a model sheet (studio/CharacterLineup.jsx)
  if (studio) return <CharacterLineup list={list} shown={shown} passes={passes} kindOf={kindOf} groupOf={groupOf} authorOfChar={authorOfChar} usable={usable} f={f} set={set}
    styleKeys={styleKeys} label={label} run={run} jobs={jobs} fresh={fresh} canCreate={canCreate} error={q.error} loading={!q.data && !q.error} onReload={q.reload}
    onCreate={() => setMake({ changing: null })} onSteps={() => setSteps(true)} dialogs={dialogs}
    sheetFor={(c, close) => <>{result && result.id === c.id && <ChangeResult r={result} onUndo={undo} onClose={() => setResult(null)} />}
      <CharacterDetails c={c} job={jobs[c.id] ?? (run?.changing === c.id ? run.job : null)} onRedraw={redraw} onDeleted={() => { close(); setCur(null); q.reload(); }} onReload={q.reload}
        onChange={(x) => setMake({ changing: x })} /></>} />;
  return <div className="page lk-page ch-page gal-page">
    <div className="page-head"><div><BackButton /><h1>{t("Characters")}</h1><p className="lead">{t("Describe a character, choose how it is drawn, and Claude makes it: model sheets and a walk, the same in every shot.")}</p></div>
      <div className="actions">
        {run && <button type="button" className="chip-status ch-run-chip" onClick={() => setSteps(true)} title={t("See the steps")}><span className="dot busy" />{run.changing ? t("Editing {name}", { name: run.name ?? "" }) : t("Making {name}", { name: run.name ?? t("a new character") })}{run.job.progress != null ? ` · ${run.job.progress}%` : ""}</button>}
        {canCreate && <button className="btn primary" onClick={() => setMake({ changing: null })} disabled={!!run} title={run ? t("Wait for the character being made") : undefined}><Plus size={15} />{t("Create a character")}</button>}
      </div></div>
    {q.error?.status === 404 ? <div className="empty"><p>{t("Characters are not available on this computer yet.")}</p></div>
      : q.error && <Banner kind="error" action={<button className="btn sm" onClick={q.reload}>{t("Retry")}</button>}>{q.error.message}</Banner>}
    {!q.data && !q.error ? <div className="sgb-layout"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> : q.data && <div className={"sgb-layout" + (panel ? " panel-" + panel : "")}>
      {panel && <div className="sgb-scrim" onClick={() => setPanel(null)} />}
      <aside className="sgb-facets" aria-label={t("Filters")}>
        <div className="search"><Search size={14} /><input className="input" placeholder={t("Search characters")} value={f.q} onChange={(e) => set({ q: e.target.value })} aria-label={t("Search characters")} /></div>
        <div className="sgb-fg" role="group" aria-label={t("Author")}><span className="sgb-fl">{t("Author")}</span>
          {charAuthors.map((k) => <button key={k} type="button" className={"sgb-opt au-opt" + (f.authors.includes(k) ? " on" : "")} role="checkbox" aria-checked={f.authors.includes(k)} onClick={() => set({ authors: toggle(f.authors, k) })}>
            <Box on={f.authors.includes(k)} /><AuthorName a={k} count={false} className="l" tagBeside /><span className="n num">{byAuthor.get(k) ?? 0}</span></button>)}</div>
        {list.some(kindOf) && <div className="sgb-fg" role="group" aria-label={t("Type")}><span className="sgb-fl">{t("Type")}</span>
          {RIGS.filter(([k]) => list.some((c) => kindOf(c) === k)).map(([k, l]) => row(k, f.rigs.includes(k), () => set({ rigs: toggle(f.rigs, k) }), t(l), byRig.get(k)))}</div>}
        <div className="sgb-fg" role="group" aria-label={t("Library")}><span className="sgb-fl">{t("Library")}</span>
          {LIB.filter(([k]) => list.some((c) => groupOf(c) === k)).map(([k, l]) => row(k, f.libs.includes(k), () => set({ libs: toggle(f.libs, k) }), t(l), byLib.get(k)))}</div>
        <div className="sgb-fg" role="group" aria-label={t("Drawing style")}><span className="sgb-fl">{t("Drawing style")}</span>
          {styleKeys.map((k) => row(k, f.styles.includes(k), () => set({ styles: toggle(f.styles, k) }), label(k), byStyle.get(k)))}</div>
      </aside>
      <section className="sgb-center" aria-label={t("Characters")}>
        <div className="sgb-bar">
          <button type="button" className="btn sm sgb-filters-btn" onClick={() => setPanel("filters")}><SlidersHorizontal size={13} />{t("Filters")}{pills.length > 0 && <span className="num"> · {pills.length}</span>}</button>
          <span className="count num" aria-live="polite">{shown.length === list.length ? t("{n} characters", { n: list.length }) : t("{n} of {total} characters", { n: shown.length, total: list.length })}</span>
          {pills.map(([l, x], i) => <button key={i} type="button" className="sgb-pill" onClick={() => set(x)} aria-label={t("Remove filter {name}", { name: l })}>{l}<X size={12} /></button>)}
          {pills.length > 0 && <button type="button" className="btn ghost sm" onClick={() => setFp(F0)}>{t("Clear filters")}</button>}
        </div>
        {shown.length === 0 && !run && <div className="empty"><p>{t("No character matches.")}</p>{pills.length > 0 && <button className="btn" onClick={() => setFp(F0)}>{t("Clear filters")}</button>}</div>}
        <div className="sgb-grid ch-grid" ref={grid.ref} style={grid.style}>
          {run && !run.changing && pg === 0 && <MakingTile run={run} onOpen={() => setSteps(true)} />}
          {shown.slice(pg === 0 ? 0 : pg * slots, (pg + 1) * slots).map((c) => <CharacterCard key={c.id} c={c} on={sel?.id === c.id} fresh={fresh === c.id} job={jobs[c.id] ?? (run?.changing === c.id ? run.job : null)} onPick={pick} />)}
        </div>
        <Pager keep page={pg} size={slots} total={shown.length} onPage={setPg} />
      </section>
      <aside className="sgb-insp" aria-label={sel ? sel.name : t("Characters")}>
        {panel === "style" && <BackButton className="insp" onClick={() => setPanel(null)} />}
        {sel ? <div className="insp-in" key={sel.id}>
          {result && result.id === sel.id && <ChangeResult r={result} onUndo={undo} onClose={() => setResult(null)} />}
          <CharacterDetails c={sel} job={jobs[sel.id] ?? (run?.changing === sel.id ? run.job : null)} onRedraw={redraw} onDeleted={() => { setCur(null); q.reload(); }} onReload={q.reload}
            onChange={(c) => setMake({ changing: c })} /></div> : <p className="hint">{t("Choose a character to see it here.")}</p>}
      </aside>
    </div>}
    {make && <CreateDialog styles={styles} changing={make.changing} onClose={() => setMake(null)} onStarted={(r) => { setMake(null); setFresh(null); setResult(null); follow(r); }} />}
    {steps && run && <RunSteps run={run} onClose={() => setSteps(false)} />}
  </div>;
}

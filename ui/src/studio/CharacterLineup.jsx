// The Studio's Characters: the line-up, by author, since an actor stays with its author.
// Anidoodle's people stand at their real height in front of a height chart, its rigs (Bit, the cheetah) beside them; Brush Cartoon's
// mascots stand on their own, Clawd with a dashed edge as the author kit's demo (never in a film); What If's cast comes with its engine.
// The paper tabs filter by type (Human, Animal, Thing: the others fade); the label maker searches; Library and Drawing style are chips.
// A click lays the character's model sheet on the table: The Desk's details (pictures, Use in a project, Edit, Redraw, History, Delete,
// credit) on paper. A character Claude is making stands as a pencil card at the head of the line-up and in the page head.
// The state and the data are The Desk's (screens/Characters.jsx passes them in); only the layout is the studio's.
import { useEffect, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Banner, NoPreview } from "../components.jsx";
import { useT } from "../i18n.jsx";
import { AUTHOR_ORDER, AuthorName } from "../authors.jsx";
import { CreditLine } from "../screens/StyleGallery.jsx";

const RIGS = [["human", "Human"], ["animal", "Animal"], ["thing", "Thing"], ["robot", "Robot"]];          // the four kinds
const LIB = [["yours", "Yours"], ["app", "Moworks"], ["anidoodle", "From the author"], ["demo", "Demo"]];
const picOf = (c) => c.media?.poster ?? c.media?.views ?? c.media?.sheet ?? null;
/** A person's real height in metres (heightM on every character, from its spec, its description or inferred). */
const heightOf = (c) => (c.heightM > 0 ? c.heightM : null);

/** The Front figure of a person's model sheet (media.frontBox { sheet, box } in that sheet's pixels), or null. */
const frontOf = (c) => { const f = c.media?.frontBox, src = f && c.media?.[f.sheet]; return src && f.box?.[2] > 0 && f.box?.[3] > 0 ? { src, box: f.box } : null; };
/** The sheet placed so that only its Front figure shows: the card has the figure's proportions, so head and feet meet its edges. */
function FrontCut({ src, box: [x, y, w, h] }) {
  const [size, setSize] = useState(null);
  const st = size ? { width: `${(size[0] / w) * 100}%`, height: `${(size[1] / h) * 100}%`, left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` } : { opacity: 0 };
  return <img className="st-front" src={src} alt="" loading="lazy" style={st} onLoad={(e) => setSize([e.currentTarget.naturalWidth, e.currentTarget.naturalHeight])} />;
}

/** A standing character: a person on the chart (by height; its model sheet's Front figure when there is one, else its poster) or a
 *  mascot / rig (round top). */
function Figure({ c, kind, tag, off, job, fresh, onOpen }) {
  const t = useT();
  const h = heightOf(c);
  const person = kind === "human";          // people stand on the height chart; animals, things and robots (their rigs) beside it
  const front = person ? frontOf(c) : null;
  return <button type="button" className={"st-fig" + (person ? " person" : " toon") + (front ? " front" : "") + (c.demo ? " demo" : "") + (off ? " off" : "") + (fresh ? " fresh" : "")}
    style={person ? { "--h": h ?? 1.6, ...(front ? { "--fw": front.box[2] / front.box[3] } : {}) } : undefined} onClick={() => onOpen(c)} aria-label={t("{name}, model sheet", { name: c.name })}>
    <span className="st-card">{front ? <FrontCut {...front} /> : picOf(c) ? <img src={picOf(c)} alt="" loading="lazy" /> : <NoPreview text={t("No sheets yet")} />}
      {job && <span className="st-drawing"><Loader2 size={15} className="spin" />{job.progress != null ? `${job.progress}%` : t("Drawing…")}</span>}</span>
    <span className="st-tag"><b>{c.name}</b>
      <small>{person ? [h && `${h.toFixed(2)} m`, kind && t("Human"), tag].filter(Boolean).join(" · ") : [kind && t(RIGS.find(([k]) => k === kind)?.[1] ?? kind), tag].filter(Boolean).join(" · ")}</small></span>
  </button>;
}

export default function CharacterLineup({ list, shown, passes, kindOf, groupOf, authorOfChar, usable, f, set, styleKeys, label, kit, run, jobs, fresh, canCreate, error, loading,
  onReload, onCreate, onSteps, sheetFor, dialogs }) {
  const t = useT();
  const [open, setOpen] = useState(null);
  const cur = open ? list.find((c) => c.id === open) : null;
  useEffect(() => { if (!open) return undefined; const esc = (e) => { if (e.key === "Escape") setOpen(null); }; addEventListener("keydown", esc); return () => removeEventListener("keydown", esc); }, [open]);
  const type = f.rigs.length === 1 ? f.rigs[0] : "";
  // the type tabs fade the others; library, drawing style and the search hide them
  const visible = f.rigs.length ? list.filter((c) => passes(c, "rigs")) : shown;
  const authors = AUTHOR_ORDER.filter((a) => a !== "freshstack" && visible.some((c) => authorOfChar(c) === a));
  const libTag = (c) => ({ yours: t("Yours"), app: "Moworks", demo: t("Author's demo · not used in films"), anidoodle: null })[groupOf(c)] ?? null;
  const fig = (c) => <Figure key={c.id} c={c} kind={kindOf(c)} tag={libTag(c)} off={type && kindOf(c) !== type} job={jobs[c.id] ?? (run?.changing === c.id ? run.job : null)} fresh={fresh === c.id} onOpen={(x) => setOpen(x.id)} />;
  const making = run && !run.changing && <button type="button" className="st-fig toon making" onClick={onSteps} title={t("See the steps")}>
    <span className="st-card"><span className="st-making-in"><Loader2 size={18} className="spin" /><b className="num">{run.job.progress != null ? `${run.job.progress}%` : t("Starting…")}</b></span></span>
    <span className="st-tag"><b>{run.name ?? t("New character")}</b><small>{t("Making")}</small></span></button>;
  const libs = LIB.filter(([k]) => list.some((c) => groupOf(c) === k));
  const total = list.length;

  return <div className="st-room st-chars">
    <div className="st-head"><h1>{t("Characters")}</h1><span className="st-aside">{t("who acts in your films, by author")}</span>
      <div className="st-acts">
        <div className="st-cats st-types" role="group" aria-label={t("Type")}>{[["", "All"], ...RIGS.filter(([k]) => list.some((c) => kindOf(c) === k))].map(([k, l]) =>
          <button key={k || "all"} type="button" aria-pressed={type === k && (!!k || !f.rigs.length)} onClick={() => set({ rigs: k ? [k] : [] })}>{t(l)}</button>)}</div>
        {run && <button type="button" className="chip-status" onClick={onSteps} title={t("See the steps")}><span className="dot busy" />{run.changing ? t("Editing {name}", { name: run.name ?? "" }) : t("Making {name}", { name: run.name ?? t("a new character") })}{run.job.progress != null ? ` · ${run.job.progress}%` : ""}</button>}
        {canCreate && <button className="btn primary" onClick={onCreate} disabled={!!run} title={run ? t("Wait for the character being made") : undefined}><Plus size={15} />{t("Create a character")}</button>}
      </div></div>
    {error?.status === 404 ? <p className="st-hand">{t("Characters are not available on this computer yet.")}</p>
      : error && <Banner kind="error" action={<button className="btn sm" onClick={onReload}>{t("Retry")}</button>}>{error.message}</Banner>}
    <div className="st-finder">
      <label className="st-labelmaker"><Search size={15} aria-hidden="true" /><input value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder={t("Search characters")} aria-label={t("Search characters")} />
        {f.q && <button type="button" onClick={() => set({ q: "" })} aria-label={t("Clear")}><X size={13} /></button>}</label>
      {libs.length > 1 && <div className="st-cats" role="group" aria-label={t("Library")}>{libs.map(([k, l]) =>
        <button key={k} type="button" aria-pressed={f.libs.includes(k)} onClick={() => set({ libs: f.libs.includes(k) ? f.libs.filter((x) => x !== k) : [...f.libs, k] })}>{t(l)}</button>)}</div>}
      {styleKeys.length > 1 && <div className="st-cats" role="group" aria-label={t("Drawing style")}>{styleKeys.map((k) =>
        <button key={k} type="button" aria-pressed={f.styles.includes(k)} onClick={() => set({ styles: f.styles.includes(k) ? f.styles.filter((x) => x !== k) : [...f.styles, k] })}>{label(k)}</button>)}</div>}
      <span className="st-count num" aria-live="polite">{shown.length === total ? t("{n} characters", { n: total }) : t("{n} of {total} characters", { n: shown.length, total })}</span>
    </div>
    {loading ? <div className="st-table st-skel st-lineup" /> : <section className="st-table studio-paper st-lineup" aria-label={t("Characters by author")}>
      {authors.length === 0 && !making && <div className="st-empty"><p className="st-hand">{t("No character matches.")}</p></div>}
      <div className="st-lu">{authors.map((a, ai) => {
        const cs = visible.filter((c) => authorOfChar(c) === a), people = cs.filter((c) => kindOf(c) === "human"), rest = cs.filter((c) => kindOf(c) !== "human");
        return <div key={a} className={"st-lu-au" + (people.length ? " has-people" : "")}>
          <div className="st-lu-head"><AuthorName a={a} count={false} />{people.length > 0 && <span className="st-note">{t("people stand at their real height")}</span>}</div>
          {people.length > 0 && <div className="st-chart">{[0.5, 1, 1.5, 2].map((m) => <span key={m} className="st-tick" style={{ "--at": m }}>{m.toFixed(1)} m</span>)}
            <div className="st-people">{people.map(fig)}</div></div>}
          {(rest.length > 0 || (ai === 0 && making)) && <div className="st-toons">{ai === 0 && making}{rest.map(fig)}</div>}
        </div>; })}
        <div className="st-lu-au st-soon"><div className="st-lu-head"><AuthorName a="freshstack" count={false} /></div>
          <p className="st-hand">{t("Its stick-figure cast comes with the engine.")}</p></div>
      </div>
      {kit && <div className="st-kit"><CreditLine author={t("Character layer: ClaudeAnimationBase")} licence={kit.licence} link={kit.link} commit={kit.commit} /></div>}
    </section>}
    {cur && <div className="st-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(null); }}>
      <div className="st-table studio-paper st-modelsheet" role="dialog" aria-modal="true" aria-label={t("{name}, model sheet", { name: cur.name })}>
        <div className="st-ms-top"><span className="st-hand">{t("model sheet")}</span>{!usable(cur) && cur.demo && <span className="st-stamp">{t("Demo only")}</span>}
          <button type="button" className="btn ghost icon sm" onClick={() => setOpen(null)} aria-label={t("Close")}><X size={16} /></button></div>
        <div className="st-ms-body insp-in">{sheetFor(cur, () => setOpen(null))}</div>
      </div></div>}
    {dialogs}
  </div>;
}

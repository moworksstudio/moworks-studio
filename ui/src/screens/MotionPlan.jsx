// Motion dialog: under each frame, the motion Claude proposes, one row per motion (target, type, timing, what it does,
// where it comes from). "Library" opens the Motion Library and writes the chosen item into that row; a row the user changed is tinted; "Approve
// motion" asks once (with the time the build takes) and starts the build. Approval records revision and file hash; a later change shows "Changed
// since approval". No raw GSAP is shown; the composition stays HF-native. A row from the library shows the item's real preview,
// and on approval the app copies the cited items into the project.
// The frames sit in rows like the Storyboard dialog (4-5 a row), each with its approved storyboard still;
// clicking a frame opens its motion table right under its row (the rows after it move down) and closes the one open before; one green
// outline wraps the frame and its table; each motion is one line. A HyperFrames formula row reads "HF formula", not like a library
// item; "Library" is a small replace button on every row. No "Ask Claude to draft": Claude drafts the plan as the step runs.
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Film, Library, Loader2, Pencil, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { get, post, api } from "../api.js";
import { Banner, Dialog } from "../components.jsx";
import { ago, useData, usePref, useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";
import { useClaudeDone, useCloseGuard, useStage } from "../workflow/stage.jsx";
import MotionLibrary from "../editor/MotionLibrary.jsx";
import UsageHint, { minutesOf } from "../workflow/usage.jsx";

// where a row comes from, as one short tag: the Motion Library, a move HyperFrames' motion.md describes, the style's own STYLE.md,
// written new by Claude, or a row the user added
const SRC = { library: "Library", hf: "HF formula", style: "Film style", claude: "New", manual: "By you" };
// what each source means, on hover and for screen readers
const SRC_HINT = { library: "Motions taken from the Motion Library", hf: "From HyperFrames' own motion recipes", style: "Written from this film style's rules",
  claude: "New motions Claude wrote for this film", manual: "Motions you changed" };
const srcOf = (m) => (SRC[m.source?.kind] ? m.source.kind : "claude");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** The library item a row cites: its preview (the clip plays on hover) and its name in the library (name and the library's own
 *  description, no source text). */
function LibrarySource({ card }) {
  const t = useT();
  const [hover, setHover] = useState(false);
  if (!card) return <span className="chip amber">{t("Library item not found")}</span>;          // never the item's id
  return <div className="mp-src" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
    <span className="mp-src-thumb">{hover && card.video ? <video src={card.video} autoPlay muted loop playsInline /> : card.poster ? <img src={card.poster} alt="" loading="lazy" /> : <Film size={14} />}</span>
    <span className="mp-src-t"><b>{card.title}</b></span>
  </div>;
}

/** A selector in words, until Claude names the element itself: ".f1-bill" → "Bill", ".f1-head .ln:nth-child(2)" → "Head, line 2". */
export function nameOf(target) {
  const x = String(target ?? "").trim();
  if (!x) return "";
  if (!/^[.#[]|[:>]|\s[.#]/.test(x)) return x;          // already words
  const words = x.split(/[\s,>]+/).map((part) => {
    const n = part.match(/nth-(?:child|of-type)\((\d+)\)/)?.[1];
    const base = part.replace(/:.*$/, "").replace(/^[.#]/, "").split(/[.#]/).pop().split(/[-_]+/).filter((w) => w && !/^(f|s|shot)\d+$/i.test(w))
      .map((w) => ({ ln: "line", hl: "highlight", txt: "text", bg: "background", img: "image", btn: "button", av: "badge", cta: "call to action" })[w.toLowerCase()] ?? w).join(" ");
    return [base, n ? n : null].filter(Boolean).join(" ");
  }).filter(Boolean);
  const s = words.join(", ");
  return s ? s[0].toUpperCase() + s.slice(1) : x;
}

const blank = () => ({ id: "", target: "", type: "entrance", start: 0, duration: 0.6, ease: "power3.out", behavior: "", source: { kind: "manual" }, status: "planned" });
const FIELDS = ["target", "type", "start", "duration", "ease", "behavior"];
const sameRow = (a, b) => !!a && !!b && FIELDS.every((k) => String(a[k] ?? "") === String(b[k] ?? "")) && (a.source?.id ?? "") === (b.source?.id ?? "") && (a.source?.kind ?? "") === (b.source?.kind ?? "");

/** What Claude proposed, as far as this browser knows: kept until the plan changes by someone else (Claude), so "changed" means the user changed it. */
function useBaseline(projectId, mp) {
  const key = `mw-mp-base:${projectId}`;
  return useMemo(() => {
    if (!mp?.exists || mp.error) return null;
    const own = (() => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } })();
    if (own && own.ownHash === mp.hash) return own.base;          // the last write was ours: the baseline stays Claude's
    const base = Object.fromEntries(mp.plan.shots.map((s) => [s.shot, s.motions]));
    try { localStorage.setItem(key, JSON.stringify({ base, ownHash: null })); } catch { /* private window */ }
    return base;
  }, [key, mp?.hash]); // eslint-disable-line react-hooks/exhaustive-deps
}
const keepOwnHash = (projectId, hash) => { try { const k = `mw-mp-base:${projectId}`, v = JSON.parse(localStorage.getItem(k)); if (v) localStorage.setItem(k, JSON.stringify({ ...v, ownHash: hash })); } catch { /* ignore */ } };

/** One frame as a tile in the row: its still, number, title, length and how many motions it has. */
function FrameTile({ shot, still, count, changed, open, onOpen, says = "", noCamera = false }) {
  const t = useT();
  return <button type="button" className={"mo-tile" + (open ? " open" : "")} aria-expanded={open} onClick={onOpen}>
    {/* the shot number in the title row, never over the still's own text (both themes) */}
    <span className="mo-still">{still ? <img src={still} alt="" loading="lazy" /> : <Film size={18} />}</span>
    <span className="mo-tile-t"><span className="mo-tile-n num">{shot.number}</span><b>{shot.title}</b><span className="muted num">{shot.duration ?? shot.plannedDuration ?? "?"} s</span></span>
    {/* the shot's motion in one plain line, Claude's (the server's shots[].says) */}
    {says && <span className="mo-says">{says}</span>}
    <span className="mo-tile-m">{count === 1 ? t("1 motion") : t("{n} motions", { n: count })}{changed > 0 && <span className="chip amber">{t("Changed")}</span>}
      {/* a shot still without a camera row after Claude's own pass */}
      {noCamera && <span className="chip amber" title={t("Claude adds a camera move to every shot; this one still has none.")}>{t("No camera move in this shot")}</span>}<ChevronDown size={14} className="mo-chev" /></span>
  </button>;
}

/** The open frame's motion table, under its row. Edits stay here until Save (or a Library pick, which saves). */
function ShotCard({ shot, motions, base, types, cardOf, projectId, onSaved, onDirty, onLibrary, showNums = false, says = "" }) {
  const t = useT();
  const toast = useToast();
  const [rows, setRows] = useState(() => motions.map((m) => ({ ...m })));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);       // the row index whose details are open
  const [full, setFull] = useState(null);             // the row whose description shows in full
  useEffect(() => { if (!dirty) setRows(motions.map((m) => ({ ...m }))); }, [motions]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onDirty(shot.number, dirty); }, [dirty]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (i, k, v) => { setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x))); setDirty(true); };
  const save = async (next = rows, msg = t("Motion saved")) => {
    setBusy(true);
    try { const r = await api("PUT", `/api/projects/${projectId}/motion-plan/shots/${shot.number}`, { motions: next }); keepOwnHash(projectId, r.hash); setDirty(false); toast(msg); onSaved(); }
    catch (e) { toast(e.message, "error"); } finally { setBusy(false); }
  };
  useEffect(() => { onLibrary.current[shot.number] = (item, index) => {         // a Library pick: write the row's source (or add a row), save at once
    const source = { kind: "library", id: item.uid ?? (item.library === "blocks" ? `hf:${item.id}` : item.id), version: item.version ?? item.credit?.commit?.slice(0, 7) };
    const behavior = `${item.title}: ${item.desc ?? item.description ?? ""}`.slice(0, 400);
    const grp = String(item.group ?? item.category ?? "").toLowerCase();
    const next = index != null ? rows.map((x, j) => (j === index ? { ...x, source, behavior } : x))
      : [...rows, { ...blank(), target: t("New motion"), type: /transition/.test(grp) ? "transition" : /text|caption|title/.test(grp) ? "text" : "entrance", behavior, source }];
    setRows(next);
    return save(next, t("Changed to “{title}”", { title: item.title }));
  }; }); // eslint-disable-line react-hooks/exhaustive-deps
  const changed = (m, i) => !base || !sameRow(base[shot.number]?.[i], m);       // by position: a row Claude wrote has no id of its own until it is saved
  return <section className="mo-shot" aria-label={t("Shot {n}: {title}", { n: shot.number, title: shot.title })}>
    <div className={"mo-rows" + (showNums ? " nums" : "")}>
      {/* the open shot's motion in the user's words, first (the server's shots[].says); the rows below are the detail */}
      {says && <p className="mo-shot-says">{says}</p>}
      {rows.length === 0 && <p className="muted">{t("Nothing planned for this shot yet.")}</p>}
      {/* a table, every column at the same x on every row: element · [timing] · what it does · where it comes from · actions */}
      {rows.length > 0 && <div className="mo-line mo-head" aria-hidden="true"><span>{t("Element")}</span>{showNums && <span>{t("Timing")}</span>}<span>{t("What it does")}</span><span>{t("From")}</span><span /></div>}
      {rows.map((m, i) => <div key={m.id || i} className={"mo-row" + (base && changed(m, i) ? " changed" : "")}>
        <div className="mo-line">
          {/* the element in words first (Claude's `name`, else one read off the selector); the selector itself is a technical field, with the timing
              (no internal ids on screen) */}
          <span className="mo-c mo-c-name"><b className="mo-target" title={showNums ? undefined : m.target}>{m.name || nameOf(m.target) || <span className="muted">{t("No target")}</span>}</b>
            {base && changed(m, i) && <span className="mo-changed" title={t("Changed by you")} aria-label={t("Changed by you")} />}</span>
          {showNums && <span className="mo-c mo-c-tech"><span className="chip">{t(m.type)}</span><span className="muted num mo-when">{Number(m.start ?? 0)} s · {m.duration ?? "?"} s{m.ease ? ` · ${m.ease}` : ""}</span>
            {m.target && <code className="mo-sel" title={m.target}>{m.target}</code>}</span>}
          {/* what the user approves, in plain words first (Claude's `plain`), the technical notes after; one line, the
              whole of it on hover or a click */}
          {(() => { const what = m.plain || (m.source?.kind === "library" ? cardOf(m.source.id)?.desc || m.behavior : m.behavior);
            return <button type="button" className={"mo-c mo-c-desc" + (full === i ? " full" : "")} onClick={() => setFull(full === i ? null : i)} aria-expanded={full === i}
              title={m.plain && m.behavior ? `${m.plain}\n\n${m.behavior}` : what}><span className={"mo-what" + (m.plain ? " plain" : "")}>{what}</span></button>; })()}
          <span className="mo-c mo-c-src">{m.source?.kind === "library" ? <LibrarySource card={cardOf(m.source.id)} /> : <span className={"src-tag k-" + srcOf(m)} title={t(SRC_HINT[srcOf(m)])}>{t(SRC[srcOf(m)])}</span>}</span>
          <span className="mo-c mo-c-act">
            <button className="btn ghost icon sm" onClick={() => onLibrary.open(shot.number, i)} title={t("Replace with a motion from the library")} aria-label={t("Replace with a motion from the library")}><Library size={14} /></button>
            <button className="btn ghost icon sm" onClick={() => setEditing(editing === i ? null : i)} aria-expanded={editing === i} aria-label={t("Edit this motion")} title={t("Edit this motion")}><Pencil size={14} /></button></span>
        </div>
        {editing === i && <div className="mo-edit">
          <label className="field"><span>{t("Target")}</span><input className={"input" + (!m.target ? " invalid" : "")} value={m.target} onChange={(e) => set(i, "target", e.target.value)} placeholder={t("e.g. Title")} /></label>
          <label className="field"><span>{t("Type")}</span><select className="select" value={m.type} onChange={(e) => set(i, "type", e.target.value)}>{types.map((x) => <option key={x} value={x}>{t(x)}</option>)}</select></label>
          <label className="field"><span>{t("Start (s)")}</span><input className="input num" type="number" step="0.1" min="0" value={m.start ?? 0} onChange={(e) => set(i, "start", e.target.value)} /></label>
          <label className="field"><span>{t("Length (s)")}</span><input className="input num" type="number" step="0.1" min="0.05" value={m.duration ?? ""} onChange={(e) => set(i, "duration", e.target.value)} /></label>
          <label className="field"><span>{t("Ease")}</span><input className="input" value={m.ease} onChange={(e) => set(i, "ease", e.target.value)} /></label>
          <label className="field mo-wide"><span>{t("What it does")}</span><textarea className="textarea" rows={2} value={m.behavior} onChange={(e) => set(i, "behavior", e.target.value)} /></label>
          <div className="row"><button className="btn ghost sm" onClick={() => { setRows((r) => r.filter((_, j) => j !== i)); setDirty(true); setEditing(null); }}><Trash2 size={14} />{t("Remove this motion")}</button></div>
        </div>}
      </div>)}
      <div className="row">
        <button className="btn sm" onClick={() => { setRows((r) => [...r, blank()]); setDirty(true); setEditing(rows.length); }}><Plus size={14} />{t("Add motion")}</button>
        <span className="spacer" />
        {dirty && <span className="hint">{t("Unsaved changes")}</span>}
        {dirty && <button className="btn primary sm" onClick={() => save()} disabled={busy || rows.some((m) => !String(m.target).trim())}>{busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />}{t("Save")}</button>}
      </div>
    </div>
  </section>;
}

export default function MotionPlan({ id, setCrumbs = () => {} }) {
  const t = useT();
  const stage = useStage(id);
  const toast = useToast();
  const project = useData(() => get(`/api/projects/${id}`), [id]);
  const sb = useData(() => get(`/api/projects/${id}/shots`), [id]);
  const mp = useData(() => get(`/api/projects/${id}/motion-plan`), [id]);
  const posters = useData(() => get(`/api/projects/${id}/posters`), [id]);
  const pipe = useData(() => get(`/api/projects/${id}/pipeline`).catch(() => null), [id]);
  const [dirtyShots, setDirtyShots] = useState({});
  const [lib, setLib] = useState(null);                // { shot, index } while the Library is open
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);              // the frame whose motion table is open (one at a time)
  const [showNums, setShowNums] = usePref("motion-plan:numbers", false);          // the timing and easing, folded away by default
  const boards = useData(() => get(`/api/projects/${id}/boards`).catch(() => null), [id]);
  const pick = useState(() => ({ current: {} }))[0];  // shot number → the card's Library-pick writer
  const libIds = [...new Set((mp.data?.plan.shots ?? []).flatMap((s) => s.motions).filter((m) => m.source?.kind === "library" && m.source.id).map((m) => m.source.id))].join(",");
  const cards = useData(() => (libIds ? get(`/api/library?ids=${encodeURIComponent(libIds)}&limit=60`) : Promise.resolve({ items: [] })), [libIds]);
  const cardOf = (uid) => cards.data?.items?.find((x) => x.uid === uid) ?? null;
  const base = useBaseline(id, mp.data);
  useEffect(() => { setCrumbs(project.data ? [t("Projects"), project.data.title, t("Motion Plan")] : null); }, [project.data, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const shots = sb.data?.shots ?? [];
  const planOf = (n) => mp.data?.plan.shots.find((s) => s.shot === n)?.motions ?? [];
  const saysOf = (n) => String(mp.data?.plan.shots.find((s) => s.shot === n)?.says ?? "").trim();
  const total = (mp.data?.plan.shots ?? []).reduce((n, s) => n + s.motions.length, 0);
  const changedCount = base ? (mp.data?.plan.shots ?? []).flatMap((s) => s.motions.filter((m, i) => !sameRow(base[s.shot]?.[i], m))).length : 0;
  const approval = mp.data?.approval;
  const anyDirty = Object.values(dirtyShots).some(Boolean);
  useCloseGuard(anyDirty);
  // Claude finished writing, or the Motion Plan step changed (written, approved, asked again): show it without closing the dialog. Test 24:
  // the dialog sat on "Not approved · 0 planned motions" with no frame and no Approve while the server held all 100 motions
  const reloadAll = () => { mp.reload(); sb.reload(); posters.reload(); pipe.reload(); };
  useClaudeDone(id, reloadAll, (p) => { const s = p.steps?.find((x) => x.id === "motionSpec"); return s ? `${s.status}|${s.asking ? 1 : 0}|${s.reason?.key ?? ""}` : ""; });
  // a read the server did not answer (a busy computer) is asked again by itself, a few times, and said with a Retry meanwhile
  const loadError = mp.error ?? sb.error ?? null;
  const tries = useRef(0);
  useEffect(() => {
    if (!loadError || tries.current >= 5) return undefined;
    const h = setTimeout(() => { tries.current++; if (mp.error) mp.reload(); if (sb.error) sb.reload(); }, 3000);
    return () => clearTimeout(h);
  }, [loadError]); // eslint-disable-line react-hooks/exhaustive-deps
  const loading = (!mp.data || !sb.data) && !loadError;
  const canApprove = total > 0 && !anyDirty && !mp.data?.error && !(approval && !mp.data?.changedSinceApproval);
  // the server's estimate (measured rates per style, { minutes, high, covers }); none is invented here
  const est = pipe.data?.estimateIfApproved?.minutes ? pipe.data.estimateIfApproved : pipe.data?.estimate?.minutes ? pipe.data.estimate : null;
  const approve = async () => {
    setBusy(true);
    try { const r = await post(`/api/projects/${id}/motion-plan/approve`); setAsk(false); toast(r?.estimate?.minutes ? t("Motion Plan approved. Building the film, about {n} minutes.", { n: minutesOf(r.estimate) }) : t("Motion Plan approved")); mp.reload(); pipe.reload(); project.reload(); stage.close(); }
    catch (e) { toast(e.message, "error"); setAsk(false); } finally { setBusy(false); }
  };
  // a frame's picture: the built shot's poster, else the approved storyboard option's still for that frame
  // the approved option: the round's pick, else the letter the storyboard approval recorded (a later take of the stills can drop the
  // round's pick), found in the newest round that has it
  const rounds = boards.data?.rounds ?? [];
  const picked = [...rounds].reverse().find((r) => r.picked?.option && r.picked.option !== "mix");
  const letter = picked?.picked.option ?? sb.data?.approval?.option ?? null;
  const pickedOpt = letter ? [...rounds].reverse().flatMap((r) => r.options).find((o) => o.option === letter && o.stillUrls?.length) ?? null : null;
  const stillOf = (n) => {
    const built = posters.data?.posters?.find((x) => x.number === n)?.url;
    if (built || !pickedOpt) return built ?? null;
    const k = pickedOpt.frames?.findIndex((f) => Number(f.n) === Number(n)) ?? -1;
    return pickedOpt.stillUrls[k >= 0 ? k : n - 1] ?? null;
  };
  const changedIn = (n) => (base ? planOf(n).filter((m, i) => !sameRow(base[n]?.[i], m)).length : 0);
  useEffect(() => { if (open == null && shots.length) setOpen(shots[0].number); }, [shots.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const strip = useRef(null);
  useEffect(() => {          // the open frame stays in view in the sideways row
    const box = strip.current, el = box?.querySelector(".mo-tile.open");
    if (!el) return;
    const left = el.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
    if (left < box.scrollLeft || left + el.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollTo({ left: left - (box.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [open]);
  const onLibrary = Object.assign(pick, { open: (shot, index) => setLib({ shot, index }) });
  const counts = (mp.data?.plan?.shots ?? []).flatMap((s) => s.motions ?? []).reduce((c, m) => ({ ...c, [srcOf(m)]: (c[srcOf(m)] ?? 0) + 1 }), {});
  // An earlier step changed after this approval: approve again here, or keep it as it is from the Pipeline
  const chip = !approval ? <span className="chip">{t("Not approved")}</span> : mp.data?.changedSinceApproval ? <span className="chip amber"><AlertTriangle size={11} />{mp.data?.movedBy ? t("“{step}” changed after you approved this", { step: t(mp.data.movedBy) }) : t("Changed since approval")}</span>
    : <span className="state-badge ok"><ShieldCheck size={14} />{t("Approved {ago}", { ago: ago(approval.at) })}</span>;
  // A shot's still keeps the film's own shape (9:16, 1:1, 4:5…), never a 16:9 crop, on both themes
  const [aw, ah] = String(project.data?.meta?.format?.aspect ?? "16:9").split(":").map(Number);
  return <div className="page mo2" style={aw && ah ? { "--mo-ar": String(aw / ah) } : undefined}>
    <div className="page-head">
      <div><div style={{ display: "flex", gap: "0.5333rem", alignItems: "center", flexWrap: "wrap" }}>{/* nothing said about the plan before it is read */}
        {mp.data ? chip : null}
        {mp.data ? <span className="muted" style={{ fontSize: "var(--fs-meta)" }}>{t("{n} planned motions", { n: total })}</span> : loading ? <span className="muted"><Loader2 size={12} className="spin" /> {t("Loading the Motion Plan…")}</span> : null}
        {Object.keys(SRC).some((k) => counts[k]) && <span className="muted mp-src-l">{t("Where they come from:")}</span>}
        {Object.keys(SRC).filter((k) => counts[k]).map((k) => <span key={k} className={"src-tag k-" + k} title={t(SRC_HINT[k])} aria-label={`${t(SRC_HINT[k])}: ${counts[k]}`}>{t(SRC[k])} <span className="num">{counts[k]}</span></span>)}
        {changedCount > 0 && <span className="chip amber">{changedCount === 1 ? t("1 changed by you") : t("{n} changed by you", { n: changedCount })}</span>}
        <span className="spacer" />
        <button className="btn ghost sm" onClick={() => setShowNums(!showNums)} aria-pressed={showNums}>{showNums ? t("Hide timing") : t("Show timing")}</button></div>
        {/* what the user approves: Claude's line for this plan (the server's plan.approving), else the app's own */}
        <p className="mo-intro">{String(mp.data?.plan?.approving ?? "").trim() || t("Approve how each shot moves: what comes in, how it moves and how strongly. Open a frame to read or change its motions; nothing is built until you approve.")}</p></div>
    </div>
    {mp.data?.error && <Banner kind="error">{mp.data.error}</Banner>}
    {loadError && <Banner kind="error" action={<button className="btn sm" onClick={() => { tries.current = 0; reloadAll(); }}>{t("Retry")}</button>}>{t("The Motion Plan could not be loaded: {why}", { why: loadError.message })}</Banner>}
    {loading && <div className="mo-strip" aria-busy="true">{[0, 1, 2, 3].map((i) => <span key={i} className="mo-tile skeleton" aria-hidden="true" />)}</div>}
    {sb.data && !shots.length && <div className="empty"><Film size={26} /><h2>{t("No shots yet")}</h2><p>{t("Write and approve the storyboard first; the plan is made per shot.")}</p>
      <div className="row"><button className="btn primary" onClick={() => stage.open("storyboard")}>{t("Open storyboard")}</button></div></div>}
    {/* the frames in one row, six in view; more shots scroll sideways and the open one is kept in view; its table right under the row */}
    {shots.length > 0 && <div className="mo-strip" ref={strip}>{shots.map((s) => <FrameTile key={"f" + s.number} shot={s} still={stillOf(s.number)} count={planOf(s.number).length} changed={changedIn(s.number)}
      open={open === s.number} says={saysOf(s.number)} noCamera={(mp.data?.noCamera ?? []).includes(s.number)} onOpen={() => setOpen((o) => (o === s.number ? null : s.number))} />)}</div>}
    {shots.filter((s) => s.number === open).map((s) => <div key={"t" + s.number} className="mo-open"><ShotCard shot={s} motions={planOf(s.number)} base={base} types={mp.data?.types ?? []}
      cardOf={cardOf} projectId={id} onSaved={mp.reload} onDirty={(n, d) => setDirtyShots((x) => (x[n] === d ? x : { ...x, [n]: d }))} onLibrary={onLibrary} showNums={showNums} says={saysOf(s.number)} /></div>)}
    {shots.length > 0 && <div className="sb-bar">
      <span className="sb-bar-t">{anyDirty ? t("Save the shots you changed first") : approval && !mp.data?.changedSinceApproval ? <span className="state-badge ok"><ShieldCheck size={15} />{t("The Motion Plan is approved")}</span> : t("{n} planned motions", { n: total })}</span>
      <span className="spacer" />
      <button className="btn ok" onClick={() => setAsk(true)} disabled={!canApprove || busy}>{busy ? <Loader2 size={16} className="spin" /> : <Check size={16} />}{t("Approve Motion Plan")}</button>
    </div>}
    {lib && <Dialog title={t("Choose a motion")} wide onClose={() => setLib(null)}>
      <MotionLibrary pickLabel={t("Use this")} onPick={async (item) => { const w = onLibrary.current[lib.shot]; setLib(null); if (w) await w(item, lib.index); }} onClose={() => setLib(null)}
        note={lib.index != null ? t("The chosen motion replaces this row's; its target and timing stay.") : t("The chosen motion is added to this shot as a row; nothing is built.")} />
    </Dialog>}
    {ask && <Dialog title={t("Approve the Motion Plan for {n} shots?", { n: shots.length })} onClose={() => setAsk(false)} footer={<><span className="spacer" />
      <button className="btn" onClick={() => setAsk(false)}>{t("Look again")}</button>
      <button className="btn ok" onClick={approve} disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <Check size={15} />}{t("Approve and build")}</button></>}>
      {/* What happens and how long in one line (the server's covers: "build, review, music and checks"), what the film used so far */}
      <UsageHint projectId={id} used line={est ? t("{what}: about {n} min.", { what: est.covers ? cap(t(est.covers)) : t("Building the film"), n: minutesOf(est) })
        : t("Claude builds and reviews the film.")} /></Dialog>}
  </div>;
}

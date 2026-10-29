// The motion drawer: opens in the timeline's place, as tall as the timeline, so the film keeps its size.
// First row: what Claude chose for the selected shot in the motion plan (MOTION-PLAN.json rows from the library), so the user starts from
// Claude's pick and swaps it. Then the whole library (motions and blocks; looks stay apart, they are a whole video's look) in one row of
// kinds and a search, bigger cards, the video playing under the pointer. A card puts one line in the chat for Claude (nothing runs until
// Send). × or Escape closes it and the timeline comes back.
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import { get } from "../api.js";
import { usePref } from "../lib.jsx";
import { useT } from "../i18n.jsx";

// the library's categories (HF's, the intake's and the kit's) gathered into the kinds a motion designer looks for
const GROUPS = [
  ["all", "All", null],
  ["text", "Text", /text|title|caption|number|counter|lower third|japanese/i],
  ["inout", "In & out", /entrance|exit|reveal|mask|swap/i],
  ["transition", "Transitions", /transition/i],
  ["move", "Movement", /motion|movement|travel|spring|easing|principles|attention|loop|cursor|pointer/i],
  ["bg", "Backgrounds & effects", /background|effect|light|glow|particle|texture|glitch|film|overlay|shape|line|path|hand-drawn/i],
  ["logo", "Logos", /logo/i],
  ["ui", "UI & data", /ui|data|chart|mockup|device|code|map/i],
];
const groupOf = (cat) => GROUPS.slice(1).find(([, , re]) => re.test(cat ?? ""))?.[0] ?? "other";
const fold = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

let cache = null;          // the library list, once per app session

function Card({ it, onPick, note }) {
  const t = useT();
  const [hover, setHover] = useState(false);
  return <button className="mdr-card" onClick={() => onPick(it)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}
    title={`${it.title} · ${it.author}${it.desc ? `\n${it.desc}` : ""}`}>
    <span className="mdr-media">{it.poster ? <img src={it.poster} alt="" loading="lazy" /> : <span className="mdr-noposter">{it.title}</span>}
      {hover && it.video && <video src={it.video} autoPlay muted loop playsInline disablePictureInPicture controlsList="nodownload nopictureinpicture" aria-hidden="true" />}
      {note && <span className="mdr-note">{note}</span>}</span>
    <span className="mdr-name">{it.title}</span><span className="mdr-by">{it.author}{it.vi === "missing" ? ` · ${t("no Vietnamese")}` : ""}</span>
  </button>;
}

export default function MotionDrawer({ projectId, shot, target, targetText = null, onPick, onClose }) {
  const t = useT();
  const [items, setItems] = useState(cache);
  const [plan, setPlan] = useState(null);
  const [group, setGroup] = usePref("editor:drawer-group", "all");
  const [q, setQ] = useState("");
  const [n, setN] = useState(40);
  const row = useRef(null);
  useEffect(() => { if (!cache) get("/api/editor/motions").then((r) => { cache = r.items; setItems(r.items); }).catch(() => setItems([])); }, []);
  useEffect(() => { get(`/api/projects/${projectId}/motion-plan`).then(setPlan).catch(() => setPlan(null)); }, [projectId]);
  useEffect(() => { const k = (e) => { if (e.key === "Escape" && !document.querySelector(".sheet-overlay")) onClose(); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, [onClose]);
  useEffect(() => { setN(40); row.current?.scrollTo({ top: 0 }); }, [group, q]);
  // Claude's picks for this shot: the plan rows that come from the library; with an element picked in the film, the rows planned for that
  // element when the plan names it (a cursor motion planned for the shot was otherwise offered for the title)
  const picks = useMemo(() => {
    const rows = plan?.plan?.shots?.find((s) => s.shot === shot?.number)?.motions ?? [];
    const byUid = new Map((items ?? []).map((x) => [x.uid, x]));
    const out = [];
    for (const m of rows) {
      const id = m.source?.kind === "library" ? m.source.id : null;
      const it = id && (byUid.get(id) ?? byUid.get(`hf:${id}`));          // motions of the retired kit are no longer in the Library: an old plan's item is skipped
      if (it && !out.some((o) => o.it.uid === it.uid)) out.push({ it, note: [m.target, m.type].filter(Boolean).join(" · "), target: m.target });
    }
    const words = fold(targetText).split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
    const mine = words.length ? out.filter((o) => words.some((w) => fold(o.target).includes(w))) : [];
    return mine.length ? mine : out;
  }, [plan, items, shot?.number, targetText]);
  const list = useMemo(() => {
    const ws = fold(q).split(/\s+/).filter(Boolean);
    return (items ?? []).filter((x) => (group === "all" || groupOf(x.category) === group)
      && ws.every((w) => fold(`${x.title} ${x.author} ${x.category} ${x.desc} ${(x.tags ?? []).join(" ")}`).includes(w)));
  }, [items, group, q]);
  // rows that wrap and scroll down; more cards load near the end
  const more = (e) => { const el = e.currentTarget; if (el.scrollTop + el.clientHeight > el.scrollHeight - 300 && n < list.length) setN((x) => x + 40); };
  return <div className="mdr" role="dialog" aria-label={t("Motions")}>
    <div className="mdr-head">
      <b className="mdr-title">{t("Motion")}</b>
      <div className="mdr-groups" role="group" aria-label={t("Kind")}>{GROUPS.map(([k, label]) => <button key={k} className="mdr-chip" aria-pressed={group === k} onClick={() => setGroup(k)}>{t(label)}</button>)}</div>
      <label className="mdr-search"><Search size={13} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search motions")} aria-label={t("Search the motions")} /></label>
      <span className="mdr-for">{target ? t("For: {target}", { target }) : t("For the whole video")}</span>
      <span className="mdr-count num">{list.length}</span>
      <button className="btn ghost icon sm" onClick={onClose} aria-label={t("Close the motions")} title={t("Close (Esc)")}><X size={15} /></button>
    </div>
    <div className="mdr-row" ref={row} onScroll={more}>
      {items === null && Array.from({ length: 6 }, (_, i) => <span key={i} className="mdr-card skeleton" />)}
      {picks.length > 0 && !q && group === "all" && <>
        <span className="mdr-sep"><Sparkles size={13} />{t("Claude's picks for shot {n}", { n: shot?.number })}</span>
        {picks.map(({ it, note }) => <Card key={"p" + it.uid} it={it} note={note} onPick={onPick} />)}
        <span className="mdr-sep">{t("Library")}</span>
      </>}
      {list.slice(0, n).map((it) => <Card key={it.uid} it={it} onPick={onPick} />)}
      {items && !list.length && <span className="mdr-empty">{t("Nothing matches. Try another word or kind.")}</span>}
    </div>
  </div>;
}

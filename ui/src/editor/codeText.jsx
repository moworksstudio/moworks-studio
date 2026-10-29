// The words of a film drawn by code: the server reads them from the film's source (GET edit/code-texts, hf-edit/codeText.mjs) and writes one back
// (POST edit/code-text), bundling the film again; no Claude. The edit card on the picture and the Shots tab show them as the same slim
// fields as an HTML film's words; what is not among them is pinned as a note for Claude.
import { useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { get, post } from "../api.js";
import { useToast } from "../lib.jsx";
import { useT } from "../i18n.jsx";

const norm = (s) => String(s ?? "").normalize("NFC").replace(/\s+/g, " ").trim();

// kept per film for the session: read again when the film's version changes (the Shots tab passes the Editor's
// version) or a word is saved here; the edit card on the picture reads what is kept
const kept = new Map();          // projectId -> { version, data }
const NONE = { engine: null, items: [] };

/** The film's code words ({ engine, items }; engine null for a HyperFrames film). `version` null: what is kept, else read once; a version
 *  not kept yet reads them again. `enabled` false reads nothing (the picked element's words are edited the HTML way). */
export function useCodeTexts(projectId, version = null, enabled = true) {
  const hit = kept.get(projectId), fresh = hit && (version == null || hit.version === version) ? hit.data : null;
  const [data, setData] = useState(fresh);
  const load = useCallback(() => {
    get(`/api/projects/${projectId}/edit/code-texts`).then((d) => { kept.set(projectId, { version, data: d }); setData(d); })
      .catch(() => setData(NONE));
  }, [projectId, version]);
  useEffect(() => { if (!enabled) return; if (fresh) setData(fresh); else load(); }, [enabled, load]); // eslint-disable-line react-hooks/exhaustive-deps
  return [enabled ? data : null, load];
}
const forget = (projectId) => kept.delete(projectId);

/** The code words a picked element shows: the same words, else the longest that it holds (a pill's words and its live suffix), this shot's
 *  first. */
export function matchCodeText(items, textContent, shot = null) {
  const t = norm(textContent);
  if (!t || !items?.length) return null;
  const rank = (x) => (x.shot === shot ? 0 : x.shot == null ? 1 : 2);
  const same = items.filter((x) => norm(x.text) === t).sort((a, b) => rank(a) - rank(b));
  if (same.length) return same[0];
  const held = items.filter((x) => norm(x.text).length >= 2 && t.includes(norm(x.text))).sort((a, b) => rank(a) - rank(b) || norm(b.text).length - norm(a.text).length);
  return held[0] ?? null;
}

/** One field of code words: saved when the field is left (the film is bundled again and loads anew). */
export function CodeWord({ projectId, item, locked, onSaved, className = "input sm pe-text" }) {
  const t = useT();
  const toast = useToast();
  const [val, setVal] = useState(item.text);
  const [busy, setBusy] = useState(false);
  useEffect(() => setVal(item.text), [item.id, item.text]);
  const save = async () => {
    const v = norm(val);
    if (!v || v === norm(item.text)) { setVal(item.text); return; }
    setBusy(true);
    try {
      const r = await post(`/api/projects/${projectId}/edit/code-text`, { id: item.id, was: item.text, text: v });
      for (const w of r.warnings ?? []) toast(w);
      if (r.changed) { forget(projectId); onSaved?.(t("Words saved")); }
    } catch (e) { toast(e.message, "error"); setVal(item.text); onSaved?.(null); } finally { setBusy(false); }
  };
  // the same slim field as an HTML film's words; while the film is made again it is disabled with the pending (amber) edge (editor.css)
  return <input className={className + (busy ? " cw-busy" : "")} value={val} disabled={locked || busy} aria-label={t("Words")} aria-busy={busy || undefined} title={busy ? t("Saving") : undefined}
    onChange={(e) => setVal(e.target.value)} onBlur={save}
    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setVal(item.text); e.currentTarget.blur(); } }} />;
}

/** The Shots tab's words of one shot of a code film: this shot's, then the whole film's (words the code shows across shots). */
export function CodeWords({ projectId, shot, locked, onChanged, version, onPin }) {
  const t = useT();
  const [data] = useCodeTexts(projectId, version);
  if (data === null) return <div className="skeleton" style={{ height: "1.6rem" }} />;
  const mine = data.items.filter((x) => x.shot === shot.number), film = data.items.filter((x) => x.shot == null);
  const saved = (label) => onChanged?.(!!label);
  if (!mine.length && !film.length) return <p className="sl-note">{t("This shot has no words to edit here.")}{onPin ? " " : ""}{onPin && <PinButton onPin={onPin} />}</p>;
  return <div className="sl-words">
    {mine.map((x) => <CodeWord key={x.id} projectId={projectId} item={x} locked={locked} onSaved={saved} className="input sm sl-word" />)}
    {film.length > 0 && <><p className="sl-note">{t("Words of the whole film")}</p>
      {film.map((x) => <CodeWord key={x.id} projectId={projectId} item={x} locked={locked} onSaved={saved} className="input sm sl-word" />)}</>}
  </div>;
}

/** Pin a note on the picture for Claude: the next click on the picture places it. */
export function PinButton({ onPin, onBefore = null }) {
  const t = useT();
  return <button className="btn ghost sm" onClick={() => { onBefore?.(); onPin(); }}><MapPin size={13} />{t("Pin a note")}</button>;
}

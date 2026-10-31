// The notice of a new version, an easy-to-see button as Claude Desktop and Viber have it (owner 31/10). The service checks by itself (a minute after it starts, then every six
// hours) and GET /api/app/update answers from that check without asking GitHub. When a new version is ready: a dot on Settings (the
// rail's item in The Desk, the gear on the peg bar in The Studio, and the Update section inside Settings) and one slim line in the top
// bar, "A new version is ready" and a solid Update button. Update opens Settings › Update with the check's answer already there. "Later" hides the line
// until a newer version (the version put off is kept per viewer); the dot stays, the quiet way back to it. The first start after an
// update says once "Updated to the version of {date}". No hash or path is shown: a version is its date and subject.
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { get } from "../api.js";
import { useT } from "../i18n.jsx";

const LATER = "mw-update-later";          // the version "Later" put off (its commit; never shown)
const SEEN = "mw-update-seen";            // the version "Updated to…" was said for
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage locked: this window only */ } };
/** Settings › Update after its own check: the notice reads the answer again at once. */
export const UPDATE_CHANGED = "mw-update-changed";
const POLL_MS = 2 * 60 * 1000;            // the read is the service's kept answer: cheap, no GitHub
const SAID_MS = 30 * 1000;                // "Updated to…" goes by itself after this

export const versionDay = (d) => { try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };

/** What the top bar shows: "updated" (the version just installed, once), "ready" (a new version not put off) or null. */
export function noticeOf(info, { later = null, seen = null } = {}) {
  if (info?.updated?.id && info.updated.id !== seen) return "updated";
  if (info?.available && info.latest?.id && info.latest.id !== later) return "ready";
  return null;
}

/** The notice's state for the shell: the service's answer (polled), what this viewer put off. `initial`: an answer to start from
 *  (the render tests; the app starts empty and reads it). */
export function useUpdateNotice(initial = null) {
  const [info, setInfo] = useState(initial);
  const [later, setLater] = useState(() => read(LATER));
  const [seen, setSeen] = useState(() => read(SEEN));
  useEffect(() => {
    let alive = true, timer = null;
    const load = async () => {
      clearTimeout(timer);
      try { const r = await get("/api/app/update"); if (alive) setInfo(r); } catch { /* an older service or offline: no notice */ }
      if (alive) timer = setTimeout(load, POLL_MS);
    };
    load();
    addEventListener(UPDATE_CHANGED, load);
    return () => { alive = false; clearTimeout(timer); removeEventListener(UPDATE_CHANGED, load); };
  }, []);
  const show = noticeOf(info, { later, seen });
  const said = show === "updated" ? info.updated.id : null;
  useEffect(() => {          // said once: a reload or the next window does not say it again; it goes by itself
    if (!said) return undefined;
    write(SEEN, said);
    const t = setTimeout(() => setSeen(said), SAID_MS);
    return () => clearTimeout(t);
  }, [said]);
  return {
    info, show,
    ready: !!info?.available,          // the dot: a new version is there, put off or not
    later: () => { const id = info?.latest?.id; if (!id) return; write(LATER, id); setLater(id); },
    close: () => { if (said) setSeen(said); },
  };
}

/** The slim line in the top bar (both themes; The Studio draws it as a slip of paper pinned to the peg bar, so it carries studio-paper:
 *  the paper's inks there, nothing in The Desk). */
export function UpdateLine({ notice }) {
  const t = useT();
  if (notice?.show === "ready") {
    return <div className="upd-notice studio-paper" role="status">
      <span className="dot ok" aria-hidden="true" />
      <span className="upd-say">{t("A new version is ready")}</span>
      <a className="btn primary sm upd-go" href="#/settings/update" title={notice.info?.latest?.date ? t("The version of {date}", { date: versionDay(notice.info.latest.date) }) : undefined}>{t("Update")}</a>
      <button type="button" className="upd-later" onClick={notice.later} title={t("Hide this until the next new version")}>{t("Later")}</button>
    </div>;
  }
  if (notice?.show === "updated") {
    return <div className="upd-notice done studio-paper" role="status">
      <Check size={14} aria-hidden="true" />
      <span className="upd-say">{t("Updated to the version of {date}", { date: versionDay(notice.info.updated.date) })}</span>
      <button type="button" className="upd-later icon" onClick={notice.close} aria-label={t("Close")} title={t("Close")}><X size={13} /></button>
    </div>;
  }
  return null;
}

/** The dot on the way to Settings: an <i>, so the rail's folded strip (which hides its words, the <span>s) keeps it. */
export function UpdateDot({ on }) {
  const t = useT();
  return on ? <i className="upd-dot" role="img" aria-label={t("A new version is ready")} /> : null;
}

// The Editor's sheets (audit/112c c2.2: they lived inside the Editor's one 630-line function): which sheet is open, opening, closing and
// changing it (a sheet with unsaved edits asks first in The Studio), the address (a sheet closed takes its name off it), The Studio's
// onion skin when one sheet replaces another, and the Desk's rule that what lies behind a sheet takes no focus. Moved as it was (the sizes the Editor shows: filmSizes.js).
import { useEffect, useRef, useState } from "react";
import { goReplace } from "../lib.jsx";

export function useSheets({ id, studio, openFromRoute = null }) {
  const [sheet, setSheet] = useState(openFromRoute ? { kind: openFromRoute, opts: {} } : null);
  // a sheet is modal: what lies behind it takes no focus and no typing (words meant for the storyboard reached the film's
  // name box behind the dialog, and its blur renamed the film)
  // In The Studio the sheet lies on the light table beside the chat and the timeline, which stay in use: nothing is made inert
  useEffect(() => { document.querySelectorAll(".ed > .ed-strip, .ed > .ed-body, .ed > .ed-narrow").forEach((el) => { el.inert = !!sheet && !studio; }); }, [sheet, studio]);
  // The Studio's onion skin (only the change between two sheets): the sheet that lay on the table lifts away as a
  // faint blue copy in half a second. The copy is a still of its markup: no film, no video, no ids.
  const tableRef = useRef(null);
  const [ghost, setGhost] = useState(null);
  const lifted = useRef({ studio, kind: sheet?.kind ?? null });
  lifted.current.studio = studio;
  const lift = (next) => {
    const was = lifted.current.kind;
    lifted.current.kind = next;
    if (!lifted.current.studio || was === next || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = tableRef.current?.querySelector(":scope > .lt-sheet") ?? tableRef.current?.querySelector(":scope > .lt-film");
    if (!el) return;
    const c = el.cloneNode(true);
    c.querySelectorAll("iframe, video, audio, canvas").forEach((x) => x.replaceWith(document.createElement("div")));
    [c, ...c.querySelectorAll("[id]")].forEach((x) => x.removeAttribute("id"));
    setGhost({ html: c.outerHTML, n: Date.now() });
  };
  useEffect(() => { if (!ghost) return undefined; const h = setTimeout(() => setGhost(null), 700); return () => clearTimeout(h); }, [ghost]);
  // a sheet closed takes its name off the address (/projects/<id>/mix): a reload, or the same Open again, finds the Editor without it (audit/112c c1.1);
  // so does another sheet laid over it (c8.2: Storyboard over Final Mix left .../mix, and a notice's Open for Final Mix did nothing)
  const putSheet = (x) => { lift(x?.kind ?? null); setSheet(x);
    const named = location.hash.replace(/^#/, "").split("?")[0].split("/").filter(Boolean)[2] ?? null;
    if (named && named !== x?.kind) goReplace(`/projects/${id}`); };
  // a station, a card or the slate lays another sheet on the table: one with unsaved edits asks first (the Desk's sheet is modal: it cannot)
  const sheetHandle = useRef(null);
  const sheetRef = useRef(sheet);
  sheetRef.current = sheet;
  const switchSheet = (x) => { if (studio && sheetRef.current && sheetHandle.current?.dirty()) sheetHandle.current.ask(() => putSheet(x)); else putSheet(x); };
  // the address names a sheet (/projects/<id>/mix): it opens
  useEffect(() => { if (openFromRoute) putSheet({ kind: openFromRoute, opts: {} }); }, [openFromRoute]); // eslint-disable-line react-hooks/exhaustive-deps
  return { sheet, putSheet, switchSheet, sheetHandle, sheetRef, tableRef, ghost };
}

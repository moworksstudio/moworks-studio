// The Editor's film as rows (audit/112c c2.2: they lived inside the Editor's one 630-line function): the timeline of the size shown, the
// shots' pictures (made again after a change, only while Claude is not working) and the shot list. Moved as it was.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { get, post } from "../api.js";

/** { tl, loadTimeline, posters, loadPosters, shots } for the film `id` at the size `sizeTag` (null: the master); p: the project as the
 *  Editor read it; locked: Claude works or the film renders (no pictures are made then). */
export function useFilmShots({ id, sizeTag, p, locked }) {
  const [tl, setTl] = useState(null);
  const [posters, setPosters] = useState(null);
  // the shot row follows the size shown (a vertical may add cuts); the sound lanes are the master's, shared by every size
  const loadTimeline = useCallback(() => get(`/api/projects/${id}/timeline${sizeTag ? `?size=${sizeTag}` : ""}`).then(setTl).catch(() => {}), [id, sizeTag]);
  useEffect(() => { loadTimeline(); }, [loadTimeline]);
  // shot pictures: HF stills of each shot, made again after a change (only when Claude is not working)
  const loadPosters = useCallback(async () => {
    try {
      const r = await get(`/api/projects/${id}/posters`);
      setPosters(r.posters ?? []);
      if (r.status === "missing" && !locked) await post(`/api/projects/${id}/posters`);
      if (r.status === "missing" || r.status === "running") setTimeout(() => get(`/api/projects/${id}/posters`).then((x) => x.status === "ready" && setPosters(x.posters)).catch(() => {}), 8000);
    } catch { /* no pictures yet */ }
  }, [id, locked]);
  useEffect(() => { loadPosters(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  // the storyboard approved: its stills are the shots' pictures until the Build (they waited for a reload of the page)
  const sbOption = p ? p.meta?.approvals?.storyboard?.option ?? "" : null, lastSb = useRef(null);
  useEffect(() => {
    if (sbOption == null) return;
    if (lastSb.current != null && sbOption && sbOption !== lastSb.current) loadPosters();
    lastSb.current = sbOption;
  }, [sbOption]); // eslint-disable-line react-hooks/exhaustive-deps
  // a title appears once per screen: before the Build the one starter shot is named after the film, which the page head says
  const shots = useMemo(() => tl?.shots?.map((s) => (p?.built === false && s.title?.trim() === p?.title?.trim() ? { ...s, title: "" } : s)) ?? null, [tl, p?.built, p?.title]);
  return { tl, loadTimeline, posters, loadPosters, shots };
}

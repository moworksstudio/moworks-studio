// What After Effects gets of a film style: the server's `ae: { level }` on each style, said as a badge in the status colours, green
// (text and shapes come as layers), yellow (some parts come as video), red (one video layer). A style without `ae` has no badge.
// The mark is the AE Export button's own "Ae" tile, tinted per level.
import { useT } from "../i18n.jsx";

export const AE_LEVELS = {
  editable: { label: "AE editable", tip: "After Effects gets text and shapes as layers you can edit." },
  partial: { label: "AE partly editable", tip: "Some parts come into After Effects as video." },
  video: { label: "AE video only", tip: "After Effects gets this film as one video layer." },
};
/** The style's level when it is one the app knows, else null (no badge). */
export const aeLevel = (s) => (AE_LEVELS[s?.ae?.level] ? s.ae.level : null);
/** The level as a status: a notice about what After Effects gets takes the badge's colour, so the two never disagree. */
export const AE_STATE = { editable: "ok", partial: "run", video: "stop" };
/** The tooltip; a level not measured yet (`ae.unmeasured`) says so; a canvas style whose titles and captions the app
 *  writes as HTML (`ae.textLayers`, partial) says which parts come as layers. */
export const aeTip = (s, t = (x) => x) => {
  const k = aeLevel(s);
  if (!k) return "";
  const tip = k === "partial" && s.ae.textLayers ? "Titles and captions come as text layers; the drawing comes as video." : AE_LEVELS[k].tip;
  return t(tip) + (s.ae.unmeasured ? " " + t("Not checked yet.") : "");
};

/** The AE Export button's "Ae" tile (editor.css .ae-tile); in a badge it takes the badge's colour. */
export function AeMark() {
  return <span className="ae-tile" aria-hidden="true">Ae</span>;
}

/** The badge: the mark and its words; `compact` (a tile's picture) is the mark alone, its words in the tooltip and for screen readers. */
export default function AeBadge({ s, compact = false }) {
  const t = useT();
  const k = aeLevel(s);
  if (!k) return null;
  const { label } = AE_LEVELS[k], tip = aeTip(s, t);
  return <span className={"ae-badge " + k + (compact ? " compact" : "")} title={tip} {...(compact ? { role: "img", "aria-label": `${t(label)}: ${tip}` } : {})}>
    <AeMark />{!compact && t(label)}</span>;
}

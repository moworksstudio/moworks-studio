// What a step takes, said before it starts: an approval that sets Claude to work says how long. Time only, never money: the app runs on the user's Claude plan (owner 31/10, #697, #698).
import { Clock } from "lucide-react";
import { useT } from "../i18n.jsx";

/** An estimate's minutes as the confirm says them: "5–8" when the server gives a `high` above the minutes (a shared machine runs
 *  slower: a build estimated at 15 min took 26), else "5". */
export const minutesOf = (e) => (e?.high > e?.minutes ? `${e.minutes}–${e.high}` : String(e?.minutes ?? ""));

/** What the step does and what it takes, in one sentence: "Claude writes the motion for 12 shots: about 5–8 min." `what` is already in words; `estimate` is the server's
 *  { minutes, high }. */
export function stepLine(t, what, estimate) {
  if (!estimate?.minutes) return t("{what}: a few minutes.", { what });
  return t("{what}: about {min} min.", { what, min: minutesOf(estimate) });
}

/** The time line of a confirm, in the dialog's normal text (red is only for a warning: the time is not one, Test 20);
 *  under it at most one more short line (`children`). */
export default function UsageHint({ line, children = null }) {
  return <div className="usage-hint"><Clock size={14} aria-hidden="true" />
    <div className="dlg-lines"><p className="usage-line">{line}</p>{children}</div></div>;
}

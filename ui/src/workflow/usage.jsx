// What a step costs, said before it starts: an approval that sets Claude to work says how long and what it costs at API list
// price (the user's Claude plan does not bill it separately; it counts towards the plan's usage), and where it helps, what the film used so far.
// Data: GET /api/projects/<id>/tasks `usage` (the same totals the Claude panel's model chip shows).
import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { get } from "../api.js";
import { useT } from "../i18n.jsx";

export const usd = (x) => (x == null ? "" : x < 0.01 ? "<$0.01" : `$${x.toFixed(2)}`);
/** An estimate's minutes as the confirm says them: "5–8" when the server gives a `high` above the minutes (a shared machine runs
 *  slower: a build estimated at 15 min took 26), else "5". */
export const minutesOf = (e) => (e?.high > e?.minutes ? `${e.minutes}–${e.high}` : String(e?.minutes ?? ""));

/** An estimate's cost: "$2.43–$3.00" when the server gives a `costHigh` above it (one price was half the truth for a long film, T28-13), else "$1.20". */
const costOf = (e) => (e.costHigh > e.costUsd ? `${usd(e.costUsd)}–${usd(e.costHigh)}` : usd(e.costUsd));
/** What the step does and what it takes, in one sentence:
 *  "Claude writes the motion for 12 shots: about 5–8 min, about $1.30–$1.60." `what` is already in words; `estimate` is the server's
 *  { minutes, high, costUsd, costHigh }. */
export function stepLine(t, what, estimate) {
  if (!estimate?.minutes) return t("{what}: a few minutes.", { what });
  return estimate.costUsd != null ? t("{what}: about {min} min, about {usd}.", { what, min: minutesOf(estimate), usd: costOf(estimate) })
    : t("{what}: about {min} min.", { what, min: minutesOf(estimate) });
}

/** The cost line of a confirm, in the dialog's normal text (red is only for a warning: the time and price are not one, Test 20);
 *  under it at most one more short line (`children`), and with `used` what the film used so far. */
export default function UsageHint({ projectId, line, used = false, children = null }) {
  const t = useT();
  const [u, setU] = useState(null);
  useEffect(() => { if (used) get(`/api/projects/${projectId}/tasks`).then((r) => setU(r.usage ?? null)).catch(() => setU(null)); }, [projectId, used]);
  return <div className="usage-hint"><Coins size={14} aria-hidden="true" />
    <div className="dlg-lines"><p className="usage-line">{line}</p>{children}
      {used && u?.costUsd != null && <p className="hint">{t("Used so far: {usd}", { usd: usd(u.costUsd) })}</p>}</div></div>;
}

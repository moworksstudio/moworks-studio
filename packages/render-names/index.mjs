// A render's name: <YYMMDD>_<name>_<HHMM>, local time (date first, then the film's name, then the render time).
// The rule alone, with no file system, so the server (stampedName, which adds the
// seconds or -2 when a name is taken) and the Render dialog's preview say the same name.

const p2 = (n) => String(n).padStart(2, "0");

/** The film's own part of a name: a stamp it already carries (this one, or the day-after-name one of 957d09df) or a "(2)" comes off. */
export function stampBase(name) {
  return String(name ?? "").trim().replace(/[ _]*\(\d+\)$/, "").replace(/_\d{4}-\d{2}-\d{2}_\d{4,6}(-\d+)?$/, "").replace(/^\d{6}_(.+)_\d{4,6}(-\d+)?$/, "$1") || "film";
}

/** { day: "261025", hm: "0031", sec: "07" } at `now`. */
export function stampParts(now = new Date()) {
  return { day: `${p2(now.getFullYear() % 100)}${p2(now.getMonth() + 1)}${p2(now.getDate())}`, hm: `${p2(now.getHours())}${p2(now.getMinutes())}`, sec: p2(now.getSeconds()) };
}

/** The name a render made now gets, before any clash: <YYMMDD>_<name>_<HHMM><ext>. */
export function stampName(name, ext = "", now = new Date()) {
  const { day, hm } = stampParts(now);
  return `${day}_${stampBase(name)}_${hm}${ext}`;
}

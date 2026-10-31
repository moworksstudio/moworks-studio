// The one alias of an older id. The studio's own motions were listed under another author key until 30/10/2026 (the key is in a few item ids
// too), and a film's docs/MOTION-PLAN.json, a favourite, a recent or the deleted list may still cite it. Everywhere an id is resolved it is
// read with today's id, so those keep working; what is saved next carries the new one. The old key stays here and nowhere else.
const OLD = "takayu", NEW = "moworks";
export const OLD_UID_PREFIX = `in:${OLD}/`;

/** Today's id of a library reference; anything else comes back as it is. */
export const currentUid = (ref) => (typeof ref === "string" && ref.startsWith(OLD_UID_PREFIX) ? ref.replaceAll(OLD, NEW) : ref);

/** The same inside a saved text (a JSON list of favourites, a kept copy of a plan). */
export const currentUidsIn = (text) => text.replace(new RegExp(`${OLD_UID_PREFIX}[a-z0-9-]+`, "g"), (uid) => currentUid(uid));

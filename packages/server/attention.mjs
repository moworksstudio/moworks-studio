// The moments the app waits for the user (audit/96, owner #911-#913): Claude asks, a Storyboard or a Motion Plan to approve, characters
// to check, the voice-over's words to check, Version 1 ready, the Review done, a render finished, a step stopped on an error. Each is
// kept here once, as it happens, from the server's own waiting cards and "done" events; the window reads them with the top bar's
// status (GET /tasks/running), so nothing new polls. The window says them in Windows only while it is not the window in use
// (ui/src/workflow/attention.js). Kept in memory while the app runs, the last 30.
import { randomBytes } from "node:crypto";

/** moment -> the line Windows shows, and the Editor sheet a click opens (null: the film and its chat). */
export const MOMENTS = {
  ask: { text: "Claude has a question for you", open: null },
  storyboard: { text: "The Storyboard is ready to approve", open: "storyboard" },
  "motion-plan": { text: "The Motion Plan is ready to approve", open: "motion-plan" },
  character: { text: "Your characters are ready to check", open: "character" },
  voice: { text: "The voice-over needs your check", open: "voice" },
  version1: { text: "Version 1 is ready to watch", open: null },
  review: { text: "Review and checks are done", open: null },
  render: { text: "Your film is rendered", open: "render" },
  error: { text: "A step stopped: it needs you", open: null },
};

/** A waiting card's `open` (autopilot waitCard) -> its moment. */
export const WAIT_MOMENT = { chat: "ask", storyboard: "storyboard", "motion-plan": "motion-plan", character: "character", voice: "voice", lyrics: "voice" };

/** `same`: the same moment of the same film again within this time is the same wait, said once. */
export function createAttention({ keep = 30, same = 60000, now = () => Date.now() } = {}) {
  const items = [];
  return {
    /** One moment of one film; `open` overrides the moment's own sheet (the lyrics' timing opens Lyrics). Returns the item, or null when it was said just now. */
    add(projectId, moment, { title = "", open } = {}) {
      const m = MOMENTS[moment];
      if (!m || !projectId) return null;
      const t = now();
      if (items.some((x) => x.projectId === projectId && x.moment === moment && t - x.t < same)) return null;
      const item = { id: randomBytes(6).toString("hex"), t, at: new Date(t).toISOString(), projectId, title: String(title ?? ""), moment, text: m.text,
        open: open === undefined ? m.open : open };
      items.push(item);
      if (items.length > keep) items.splice(0, items.length - keep);
      return item;
    },
    list: () => items.map(({ t, ...x }) => x),          // eslint-disable-line no-unused-vars
  };
}

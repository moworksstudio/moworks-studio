// The Tech checks' findings in one plain English line each, for the user (the raw `message` and `fixHint` stay, for Claude).
// HyperFrames writes for an engineer ("bounding-box center drifts 701px … check transformOrigin/svgOrigin"); a newcomer reads what is
// wrong, where (the shot, its times, the element by its name) and what to do. And where HF mistakes an element (a kite taken for a
// dial's needle because it turns near a round shape), the line says so instead of calling the kite a clock hand.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const clock = (s) => { const t = Math.max(0, Number(s) || 0), m = Math.floor(t / 60), r = t - m * 60; return `${m}:${(Math.round(r * 10) / 10).toFixed(1).padStart(4, "0")}`; };

/** The element's name from its selector: "#s6-kite" → "kite", "#f7-wind_arrow" → "wind arrow"; null when it names no one element. */
export function elementName(selector) {
  const id = /^#([\w-]+)$/.exec(String(selector ?? "").trim())?.[1];
  if (!id) return null;
  const name = id.replace(/^(?:s|f|shot|scene)\d+[-_]/i, "").replace(/^hf-[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  return name || null;
}

/** The shot a finding belongs to: HF names index.html for every element it tracks in the page (its rotation checks always do), so the
 *  element is looked up by its id in the shots' own files; else by its file; else by its time. `placed`: [{ number, start, duration, src }]. */
export function findingShot(f, placed, dir) {
  const id = /^#([\w-]+)$/.exec(String(f?.selector ?? "").trim())?.[1];
  if (id && dir) for (const s of placed) {
    if (!s.src) continue;
    let html = ""; try { html = readFileSync(join(dir, ...s.src.split("/")), "utf8"); } catch { continue; }
    if (html.includes(`id="${id}"`)) return { shot: s, file: s.src };
  }
  const file = String(f?.file ?? "").replace(/\\/g, "/");
  const byFile = file && file !== "index.html" ? placed.find((s) => s.src && file.endsWith(s.src)) : null;
  if (byFile) return { shot: byFile, file: byFile.src };
  const t = f?.time == null ? NaN : Number(f.time);
  const byTime = Number.isFinite(t) ? [...placed].reverse().find((s) => t >= s.start - 1e-3 && t < s.start + (s.duration ?? 0) + 1e-3) : null;
  return { shot: byTime ?? null, file: f?.file };
}

const TAG_WORDS = { svg: "a drawing", path: "a drawing", g: "a drawing", canvas: "a drawing", img: "a picture", image: "a picture", picture: "a picture", video: "a video" };
const POINTER = /needle|hand|pointer|arrow|dial|gauge|sweep|clock|kim/i;

/** One line for the user: where, what is wrong, what to do. `shot`: { number, start, duration } or null; `check`: the check's title. */
export function plainFinding(f, { shot = null, check = "" } = {}) {
  const t = f?.time == null ? NaN : Number(f.time);
  const where = shot ? `Shot ${shot.number} (${clock(shot.start)}–${clock(shot.start + (shot.duration ?? 0))})`
    : Number.isFinite(t) ? `At ${clock(t)}` : "In the film";
  const name = elementName(f?.selector);
  const it = name ? `the ${name}` : "an element";
  // HF gives an element without words its tag ("svg"): said for what it is, never the tag
  const tag = TAG_WORDS[String(f?.text ?? "").trim().toLowerCase()];
  const words = tag ?? (String(f?.text ?? "").trim() ? `the words "${String(f.text).trim().slice(0, 60)}"` : null);
  const is = words && !tag ? "are" : "is";
  const said = tag ? null : words;          // the checks of words name only words
  const px = /(\d+)\s*px/.exec(String(f?.message ?? ""))?.[1];
  const far = px ? `${px} px` : "far";
  switch (f?.code) {
    case "rotation_pivot_drift":
      return `${where}: ${it} spins around a point ${far} away from its own centre, so it slides across the frame as it turns. If it should turn in place, ask Claude to make it turn around its centre; if it swings from one end on purpose (a kite on its string, a needle on its dial), ignore this.`;
    case "off_pivot_rotation":
      return name && !POINTER.test(name)
        ? `${where}: HyperFrames took ${it} for the needle of a dial (it turns near a round shape) and says it turns around the wrong point. A ${name} is not a needle: ignore this unless it looks wrong when you play the shot.`
        : `${where}: ${it} turns around a point ${far} from the centre of its dial, so it points to the wrong place. Ask Claude to make it turn around the dial's centre.`;
    case "container_overflow":
      return `${where}: ${words ?? it} ${words && is === "are" ? "run" : "runs"} outside the box that crops ${words && is === "are" ? "them" : "it"}, so part of ${words && is === "are" ? "them" : "it"} is cut off. Ask Claude to fit ${words && is === "are" ? "them" : "it"} inside, or ignore this if the cut is meant.`;
    case "canvas_overflow": case "frame_out_of_frame":
      return `${where}: part of ${words ?? it} is outside the frame and cannot be seen. Ask Claude to move it into the frame.`;
    case "text_box_overflow":
      return `${where}: ${said ?? "some words"} run out of their box. Ask Claude to make the box bigger or the words smaller.`;
    case "clipped_text":
      return `${where}: ${said ?? "some words"} are cut off. Ask Claude to give them room.`;
    case "text_occluded": case "content_overlap":
      return `${where}: ${words ?? it} ${words ? is : "is"} covered by something else in the shot. Ask Claude to move one of them.`;
    case "text_not_painted":
      return `${where}: ${said ?? "some words"} do not show on screen. Ask Claude to check their colour and layer.`;
    case "caption_zone_collision":
      return `${where}: ${words ?? it} ${words && is === "are" ? "sit" : "sits"} where the subtitles go, so the two would cover each other. Ask Claude to move ${words && is === "are" ? "them" : "it"} up.`;
    case "contrast_aa_failure":
      return `${where}: ${said ?? "some words"} are hard to read against their background${f.ratio ? ` (contrast ${f.ratio}, needs ${f.required})` : ""}. Ask Claude to make them stand out more.`;
    case "motion_frozen": case "sweep_static":
      return `${where}: nothing moves here. Ask Claude to add movement.`;
    case "motion_off_frame":
      return `${where}: ${it} moves out of the frame. Ask Claude to keep it inside.`;
    case "motion_appears_late":
      return `${where}: ${it} comes in later than planned. Ask Claude to bring it in on time.`;
    case "motion_out_of_order":
      return `${where}: things move in a different order than planned. Ask Claude to check the order.`;
    case "transition_seams_not_sampled":
      return "The check ran out of time at the cuts between shots, so it checked fewer moments. Nothing is wrong; the cuts were not checked closely.";
    case "check_timed_out":
      return "The check of the film's code ran out of time. No error was found before it stopped.";
    case "not_checked":
      return "Part of the check did not run, so this part of the film was not checked. Run Tech checks again.";
    default:
      return `${where}: the ${String(check || "Tech").toLowerCase()} check found a problem with ${words ?? it}. Ask Claude to look at it.`;
  }
}

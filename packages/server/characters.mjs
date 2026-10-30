// Characters in a project the Brush cartoon style's Character step. Claude writes the project's
// CHARACTERS.json (definitions for the app's character layer), the app draws each character's model sheets through HyperFrames (the
// character_sheet tool Claude calls, or the Character dialog's "Draw again"), the user approves the file (POST …/approve/characters, in
// index.mjs). Characters come from the library too (the app's own, the user's saved ones; never the Clawd demo) and a project's character
// can be saved to the user's library. The library itself (GET /api/characters, the demo media) is in index.mjs.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import * as projects from "../project-service/index.mjs";
import * as kit from "../character-kit/index.mjs";
import { REF_DIR, stageReference } from "../character-kit/reference.mjs";
import { useHumans } from "../character-kit/humans.mjs";
import { humanHandOf } from "../style-catalog/hands.mjs";
import * as maker from "../character-maker/index.mjs";
import { labelLines } from "../character-maker/sheetLabels.mjs";
import { bgWorkers } from "./proxy.mjs";
import { finalize } from "../hf-edit/finalize.mjs";
// the sheets' stills off the server's thread: the sync snapshotAt held every request 20-60 s while a film's sheets were drawn (T27-3)
import { snapshotAtForeground as snapshotAt } from "../hf-qa/cli.mjs";
import { stylePipeline } from "../style-catalog/index.mjs";
import { poseCheck, poseText } from "../anidoodle-styles/posecheck.mjs";

/** Does this project's style have a Character step (Brush cartoon)? Only those take characters. */
export const usesCharacters = (meta, root) => { try { return (stylePipeline(meta?.style?.id, root) ?? []).some((s) => s.id === "character"); } catch { return false; } };

export function characterRoutes(ctx, { r, P, mustProject, HttpError }) {
  const root = ctx.root;
  const url = (id, rel) => `${ctx.preview.base}/p/${id}/${rel}`;
  const busy = new Map();          // projectId → the running sheets promise (one at a time per project)
  const sheets = (p, only = null) => {
    if (busy.has(p.id)) return busy.get(p.id);
    const run = kit.characterSheets(p.path, { root, finalize, snapshotAt, only }).finally(() => busy.delete(p.id));
    busy.set(p.id, run);
    return run;
  };
  /** The Character dialog's view: the cast, what is wrong with it, each character's sheets, the approval. */
  const view = (p) => {
    const cast = kit.readCast(p.path), f = join(p.path, kit.CAST_FILE), a = p.meta?.approvals?.characters ?? null;
    // the full PNG Claude's character_sheet draws, else the library's WebP a reused character brought along
    const sheet = (cid, scene) => {
      const rel = [`characters/sheets/${cid}-${scene}.png`, `characters/sheets/${cid}-${scene}.webp`].find((x) => existsSync(join(p.path, ...x.split("/"))));
      return rel ? { url: url(p.id, rel), at: statSync(join(p.path, ...rel.split("/"))).mtime.toISOString(), small: rel.endsWith(".webp") } : null;
    };
    // hash: the file as it is now, the same hash the approval keeps (changed: edited since the user approved it)
    const hash = existsSync(f) ? createHash("sha256").update(readFileSync(f)).digest("hex") : null;
    const savedHumans = new Set(kit.humanCharacters(root).map((h) => h.id));          // the user's anidoodle library
    return { file: kit.CAST_FILE, exists: existsSync(f), at: existsSync(f) ? statSync(f).mtime.toISOString() : null, hash, changed: !!a && !!hash && a.hash !== hash, problems: cast.problems,
      characters: cast.characters.map((c) => c.engine === kit.HUMAN_ENGINE
        // an anidoodle film's cast member: its model sheet in its own hand and its poster; the gate checks it, not a redraw
        ? { id: c.id, name: c.name, about: c.about ?? "", engine: c.engine, hand: c.hand ?? null, filmHand: c.filmHand ?? null, needsPalette: !!c.needsPalette, made: c.made ?? null,
            // in the user's library only when it is there (one taken from it, or one saved to it), never a new one before approval
            from: c.from ?? null, sheets: { sheet: sheet(c.id, "sheet"), poster: sheet(c.id, "poster") }, saved: savedHumans.has(c.id) }
        : { id: c.id, name: c.name, about: c.about ?? "", colors: c.colors, from: c.from ?? null,
            sheets: { views: sheet(c.id, "views"), emotions: sheet(c.id, "emotions") }, saved: kit.getCharacter(c.id, root)?.group === "yours" }),
      humanHand: humanHandOf(p.meta?.style?.id, root),
      approval: a, drawing: busy.has(p.id) };
  };
  const sheetsText = (res) => {
    if (res.problems.length) return `${kit.CAST_FILE} cannot be drawn yet:\n- ${res.problems.join("\n- ")}\nFix the definitions and call character_sheet again.`;
    const lines = res.characters.map((c) => c.error ? `- ${c.id} (${c.name}): ${c.error}` : `- ${c.id} (${c.name}): ${c.views} (the five views, moves and hats) and ${c.emotions} (all 31 emotions)`);
    return [`The model sheets of ${res.characters.length} character(s):`, ...lines, "",
      // the user was asked to approve a "Thumbs Up Guy" with no hair, shirt or thumb: the sheet is checked against the brief first
      "Read each sheet once and hold it against the character's description and its reference picture, if it has one: every feature they name (hair, clothes, a prop or something held, its colours) must show on the sheet. Add what is missing to the definition, and fix a real problem (a face off the body, a part that does not read, colours that do not separate), then call character_sheet again once at most. A feature the character layer cannot draw: say so in one line per character in your reply, so the owner knows before approving. Then stop: the owner approves the characters in the Character dialog."].join("\n");
  };

  /** An anidoodle film's people: each one's gate, and its sheet drawn from the film's own sheet module
   *  (anidoodle/films/sheet-<id>.ts, written in the Character step like the creator's films/sheet.ts) into characters/sheets/<id>-sheet.png. */
  const humanSheets = async (p, only) => {
    const g = await maker.filmGate(p.path, { root });
    // the sheets at once and at normal priority: someone waits for them (Draw all again took 11.5 min, one after the other at
    // below-normal priority while three films rendered)
    const out = await Promise.all(g.characters.filter((x) => !only || only.includes(x.id)).map(async (c) => {
      const film = `films/sheet-${c.id}.ts`, png = join(p.path, "characters", "sheets", `${c.id}-sheet.png`);
      const drawn = existsSync(join(p.path, "anidoodle", ...film.split("/"))) ? await maker.filmStill(p.path, film, png, { root, env: { MW_BG_WORKERS: String(bgWorkers()), MW_RENDER_FOREGROUND: "1" } }) : { ok: false, error: `write anidoodle/${film} (the model sheet in this film's hand) first` };
      return { ...c, sheet: drawn.ok ? `characters/sheets/${c.id}-sheet.png` : null, sheetError: drawn.ok ? null : drawn.error, labels: labelLines(drawn.labels) };
    }));
    return { pass: g.pass, characters: out };
  };
  const humanSheetsText = (r) => [r.pass ? "Every character's gate passed." : "A character's gate FAILED: fix it in the film's copy (anidoodle/characters/<id>/), never by redrawing it.",
    ...r.characters.map((c) => `- ${c.id}: gate ${c.passed} passed, ${c.failed} failed; sheet: ${c.sheet ?? c.sheetError}${c.labels?.length ? `\n  its words (T15-25): ${c.labels.join("; ")}` : ""}`), "",
    "Read each sheet once and hold it against the character's description and the owner's pictures: every feature they name must show."].join("\n");
  /** every cast member has the sheets the Characters dialog's Approve needs (an anidoodle human: its sheet; else views and emotions). */
  ctx.characterSheetsDrawn = (projectId) => {
    const v = view(mustProject(projectId, root));
    return v.characters.length > 0 && v.characters.every((c) => (c.engine === kit.HUMAN_ENGINE ? c.sheets.sheet : c.sheets.views && c.sheets.emotions));
  };
  /** Is this project's cast drawn by anidoodle? Its cast says so (an entry on anidoodle's engine: a person, an animal or a
   *  thing of the Character step), or its style is an anidoodle medium; not only a medium whose hand draws people (humanHandOf): a Rubber
   *  hose or fox film's animals were sent to the Brush layer's sheet page and never drawn. */
  const anidoodleCast = (p) => !!humanHandOf(p.meta?.style?.id, root) || /^anidoodle-/.test(p.meta?.style?.id ?? "")
    || kit.readCast(p.path).characters.some((c) => c.engine === kit.HUMAN_ENGINE);
  /** The Character dialog's "Draw again" for an anidoodle cast, in the shape the dialog reads: a failure is said, per character. */
  const castSheets = async (p, only) => {
    const r = await humanSheets(p, only), names = Object.fromEntries(kit.readCast(p.path).characters.map((c) => [c.id, c.name]));
    return { problems: [], characters: r.characters.map((c) => ({ id: c.id, name: names[c.id] ?? c.id, sheet: c.sheet, ...(c.sheetError ? { error: c.sheetError } : {}),
      ...(c.failed ? { gate: `${c.failed} of its own checks failed` } : {}) })) };
  };
  ctx.characterGate = async (projectId) => { const p = mustProject(projectId, root); return maker.filmGate(p.path, { root }); };          // the pipeline, before Build
  /** The cast's gates: each anidoodle human's own, before Build and whenever Claude asks. */
  const gateText = (g) => [g.pass ? "The character gate passed for every character." : "The character gate FAILED: fix what it names in the film's copy of the character (anidoodle/characters/<id>/; a Brush character: its definition in CHARACTERS.json), never by redrawing it, then call character_gate again.",
    ...g.characters.map((c) => `- ${c.id}: ${c.passed} passed, ${c.failed} failed${c.failed ? `\n  ${c.lines.filter((l) => /FAIL/.test(l)).slice(0, 12).join("\n  ")}` : ""}`)].join("\n");
  const tools = {
    character_gate: async ({ project }) => {
      const g = await maker.filmGate(project.path, { root });
      // a pass closes the earlier "found problems" cards (they stood in the chat after the gate had passed)
      if (g.pass) projects.updateNotes(project.path, (n) => n.kind === "characters" && n.status === "warning", { status: "done", resolvedAt: new Date().toISOString() });
      projects.addNote(project.path, { kind: "characters", status: g.pass ? "done" : "warning", text: g.pass ? "The character gate passed" : "The character gate found problems: Claude fixes them" });
      return gateText(g);
    },
    // every frame of an anidoodle film drawn, each pose checked against its joint limits
    pose_check: async ({ project }) => poseText(await poseCheck(project.path)) || "No anidoodle film in this project yet (anidoodle/page.ts).",
    character_sheet: async ({ project, args = {} }) => {
      const only = Array.isArray(args.ids) && args.ids.length ? args.ids.map(String) : null;
      if (anidoodleCast(project)) return humanSheetsText(await humanSheets(project, only));          // an anidoodle film's cast (its animals too)
      const res = await sheets(project, only);
      projects.addNote(project.path, { kind: "characters", text: "Claude drew the characters' model sheets" });
      return sheetsText(res);
    },
  };

  /** The creator's job (one at a time): its estimate (measured, config/character-maker.json) on the job for the page to show. */
  const create = (input, name = null) => {
    if (!input.from && !input.description) throw new HttpError(400, "INVALID", "Describe the character first");
    if (input.engine !== "brush-kit" && !maker.styleOf(kit.HUMAN_ENGINE, input.hand, root)) throw new HttpError(400, "INVALID", "Choose a drawing style");
    // what it is: Human, Animal or Thing, as the engine draws them (a change keeps the saved kind)
    if (!input.from) try { maker.rigOf(input.engine === "brush-kit" ? "brush-kit" : kit.HUMAN_ENGINE, input.rig, null, root); } catch (e) { throw new HttpError(400, "INVALID", e.message); }
    const est = maker.styles(root).find((s) => s.engine === (input.engine === "brush-kit" ? "brush-kit" : kit.HUMAN_ENGINE))?.estimate ?? null;
    const title = input.from ? `Changing ${name ?? input.from} with Claude` : `Making ${input.name || input.description.slice(0, 40)}`;
    const job = ctx.jobs.start("character-create", { title, estimate: est, engine: input.engine === "brush-kit" ? "brush-kit" : kit.HUMAN_ENGINE, hand: input.hand, rig: input.rig ?? null, from: input.from ?? null }, async (j) => {
      const res = await maker.makeCharacter(input, { root, jobId: `cc-${Date.now().toString(36)}`, signal: j.signal, env: { MW_BG_WORKERS: String(bgWorkers()) },
        onStep: (stage, progress) => j.update({ stage, progress }), log: (line) => j.log(line), renderDemo: ctx.characterDemo ?? null });
      j.update({ characterId: res.id });
      return res;
    });
    return { job, estimate: est };
  };
  const routes = [
    // the cast's gates (anidoodle humans): the Character dialog's "Check" and the pipeline before Build
    r("POST", `/projects/${P}/characters/gate`, async ([id]) => { const p = mustProject(id, root); const g = await maker.filmGate(p.path, { root }); return { ...g, text: gateText(g) }; }),
    r("GET", `/projects/${P}/characters`, ([id]) => view(mustProject(id, root))),
    // the Character dialog's "Draw again" (after the user or Claude changed CHARACTERS.json)
    r("POST", `/projects/${P}/characters/sheets`, async ([id], b) => {
      const p = mustProject(id, root);
      if (!existsSync(join(p.path, kit.CAST_FILE))) throw new HttpError(400, "INVALID", `${kit.CAST_FILE} is not written yet: Claude writes it in the Character step`);
      const only = Array.isArray(b.ids) ? b.ids.map(String) : null;
      const job = ctx.jobs.start("character-sheets", { title: "Drawing the characters", projectId: id }, async (j) => {
        j.update({ stage: "Drawing the model sheets" });
        if (anidoodleCast(p)) return castSheets(p, only);          // anidoodle draws its own cast, people and animals alike
        // a sheet that came out with no picture is a failure the dialog says, never a quiet "Not drawn yet"
        const res = await sheets(p, only);
        for (const c of res.characters ?? []) if (!c.error && !["views", "emotions"].every((s) => existsSync(join(p.path, "characters", "sheets", `${c.id}-${s}.png`))))
          c.error = "the sheet page drew nothing (no picture came out): ask Claude to look at the character's definition";
        return res;
      });
      return { job };
    }),
    // characters from the library into the project (the Characters page's "Use in project", New project's characters)
    r("POST", `/projects/${P}/characters/use`, ([id], b) => {
      const p = mustProject(id, root);
      if (!Array.isArray(b.ids) || !b.ids.length) throw new HttpError(400, "INVALID", "Choose one or more characters");
      // an anidoodle film whose hand draws people: the human characters themselves (their modules), any other as a reference
      if (humanHandOf(p.meta?.style?.id, root)) {
        const humans = new Set(kit.humanCharacters(root).map((c) => c.id)), ids = b.ids.map(String);
        const added = useHumans(p.path, ids.filter((x) => humans.has(x)), { styleId: p.meta?.style?.id, root });
        const refs = stageReference(p.path, ids.filter((x) => !humans.has(x)), root);
        if (!added.length && !refs.length) throw new HttpError(400, "INVALID", "None of these characters can be used in a film");
        if (added.length) projects.addNote(p.path, { kind: "characters", text: "{names} joined this film: Claude poses and animates them with anidoodle's human engine", vars: { names: added.map((x) => kit.humanCharacters(root).find((c) => c.id === x)?.name ?? x).join(", ") } });
        return { ...view(mustProject(id, root)), reference: refs };
      }
      // a film whose style has no character layer takes them as a reference to draw in its own design (never a CHARACTERS.json)
      if (!usesCharacters(p.meta, root)) {
        const ids = stageReference(p.path, b.ids.map(String), root);
        if (!ids.length) throw new HttpError(400, "INVALID", "None of these characters can be used in a film");
        projects.updateMeta(id, (m) => { const was = m.characters?.ids ?? []; m.characters = { from: "library", as: "reference", ids: [...new Set([...was, ...ids])], at: new Date().toISOString() }; }, root);
        projects.addNote(p.path, { kind: "characters", text: "{names} added to this film as a reference: Claude draws them in the film's own design", vars: { names: ids.map((x) => kit.getCharacter(x, root)?.name ?? x).join(", ") } });
        return { reference: ids, dir: REF_DIR, characters: [] };
      }
      kit.useCharacters(p.path, b.ids.map(String), root);
      return view(mustProject(id, root));
    }),
    // one of the project's characters kept in the user's library, to use in another film
    r("POST", `/projects/${P}/characters/([a-z][a-z0-9-]*)/save`, ([id, cid]) => {
      const p = mustProject(id, root);
      const c = kit.saveCharacter(p.path, cid, root);
      return { character: { id: c.id, name: c.name, group: c.group } };
    }),
    r("DELETE", "/characters/([a-z][a-z0-9-]*)", ([cid]) => (kit.humanCharacters(root).some((c) => c.id === cid) ? maker.deleteHuman(cid, root) : kit.deleteUserCharacter(cid, root))),
    // the Character creator: a character made outside any film by one Claude run, saved to the library
    r("GET", "/characters/styles", () => ({ styles: maker.styles(root) })),
    // Undo the last change of one of the user's characters: the version kept before it back in place
    r("POST", "/characters/([a-z][a-z0-9-]*)/undo", ([cid]) => {
      if (ctx.jobs.running().some((j) => j.kind === "character-create" && j.from === cid)) throw new HttpError(409, "BUSY", "Claude is changing this character: wait for it");
      return maker.undo(cid, root);
    }),
    r("POST", "/characters/create", (_p, b) => create({ description: String(b.description ?? "").trim(), name: b.name ? String(b.name).trim() : null, image: b.image ?? null,
      engine: b.engine, hand: b.hand ? String(b.hand) : null })),
    r("POST", "/characters/([a-z][a-z0-9-]*)/change", ([cid], b) => {
      const human = kit.humanCharacters(root).find((c) => c.id === cid), brush = kit.getCharacter(cid, root);
      if (!human && brush?.group !== "yours") throw new HttpError(400, "INVALID", "Only your own characters can be changed with Claude");
      if (!String(b.text ?? "").trim()) throw new HttpError(400, "INVALID", "Say what to change");
      return create({ from: cid, text: String(b.text).trim(), image: b.image ?? null, engine: human ? kit.HUMAN_ENGINE : "brush-kit", hand: human?.hand ?? human?.hands?.[0] ?? null }, human?.name ?? brush?.name);
    }),
    // the Characters page's "Use in a project": every film; `characters` true where the style draws it with the character layer,
    // false where it becomes a reference drawn in the film's own design
    r("GET", "/characters/projects", () => ({ projects: projects.listProjects(root).filter((p) => !p.missing).map((p) => ({ p, full: projects.getProject(p.id, root) }))
      .filter(({ full }) => full).map(({ p, full }) => ({ id: p.id, title: p.title, style: full.meta?.style?.title ?? full.meta?.style?.id ?? null, characters: usesCharacters(full.meta, root),
        humanHand: humanHandOf(full.meta?.style?.id, root) })) })),          // a human-hand anidoodle film animates anidoodle humans with the engine
  ];
  return { routes, tools };
}

// The Brand Kits (audit/112 §2.9: they lived in server/index.mjs): HyperFrames' frame presets and the user's own kits in one list, a
// kit made from a guideline (created, its files uploaded, scanned as a job) and kept with versions. Moved as they were.
import * as looks from "../looks-library/index.mjs";
import * as customLooks from "../looks-library/custom.mjs";

export function looksRoutes(ctx, { r, HttpError }) {
  const { root } = ctx;
  return [
    // Looks HF's frame presets and the user's own Looks in one list; a user's Look is made from a guideline
    // (create, upload its files, scan: a job) and kept with versions
    r("GET", "/looks", () => customLooks.apiLooks(root)),
    r("POST", "/looks/fonts", (_p, b) => customLooks.kitFontFaces(b, { root })),
    r("GET", "/looks/((?:frame|custom)/[a-z0-9-]+)", ([id]) => customLooks.apiLook(id, root)),
    r("GET", "/looks/(frame/[a-z0-9-]+)/frames", async ([id]) => ({ frames: await looks.showcaseFrames(id, root) })),
    r("POST", "/looks/(frame/[a-z0-9-]+)/copy", async ([id]) => customLooks.publicLook(await customLooks.copyLook(id, { root }), root)),
    r("POST", "/looks", (_p, b) => customLooks.publicLook(customLooks.createLook(b, root), root)),
    r("POST", "/looks/(custom/[a-z0-9-]+)/new-version", async ([id], b) => customLooks.publicLook(await customLooks.newVersion(id, b, { root }), root)),
    r("POST", "/looks/(custom/[a-z0-9-]+)/scan", ([id], b) => {
      const m = customLooks.getCustom(id, root);
      if (!m) throw new HttpError(404, "NOT_FOUND", "Brand Kit not found");
      if (!m.files.length) throw new HttpError(400, "INVALID", "Add the guideline's files first");
      return ctx.jobs.start("look-scan", { title: `Scanning ${m.title}`, key: id }, async (job) => customLooks.publicLook(await customLooks.scanLook(id, { root, signal: job.signal, withoutLocked: !!b?.withoutLocked,
        onProgress: ({ stage, progress }) => job.update({ stage, progress }) })));
    }),
    r("PATCH", "/looks/(custom/[a-z0-9-]+)", async ([id], b) => customLooks.publicLook(await customLooks.patchLook(id, b, { root }), root)),
    r("POST", "/looks/(custom/[a-z0-9-]+)/versions/(\\d+)/restore", async ([id, v]) => customLooks.publicLook(await customLooks.restoreVersion(id, v, { root }), root)),
    r("DELETE", "/looks/(custom/[a-z0-9-]+)/files", ([id], _b, q) => customLooks.publicLook(customLooks.removeFile(id, q.get("name") ?? "", root), root)),
    r("DELETE", "/looks/(custom/[a-z0-9-]+)", ([id]) => customLooks.deleteLook(id, root)),
  ];
}

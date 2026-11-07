// Settings › System and the first run on a new computer (audit/112 §2.9: they lived in server/index.mjs among 116 routes): the system's
// checks, the Vietnamese Google Fonts, the bundled fonts and libraries, HyperFrames' skills, the first run's list and its one Download all,
// Whisper on the graphics card, the free voice's Remove and the Python components. Moved as they were.
import * as hfSkills from "../setup/hf-skills.mjs";
import * as pySetup from "../setup/python.mjs";
import * as firstRun from "../setup/first-run.mjs";
import * as cuda from "../voice/cuda.mjs";
import * as kokoro from "../voice/kokoro.mjs";
import { viCatalog } from "../hf-edit/googleFontsVi.mjs";

export function setupRoutes(ctx, { r, HttpError }) {
  const { root } = ctx;
  return [
    // off the server's thread; answered at once with the last result while it runs again (?fresh=1 waits for the new one)
    r("GET", "/system", (_p, _b, q) => ctx.checks.system.get({ fresh: q.get("fresh") === "1" })),
    // the Google Fonts that draw Vietnamese: the pinned list with each family's author, licence and size, for a font picker
    r("GET", "/fonts/google-vi", () => viCatalog()),
    r("POST", "/setup/assets", () => ctx.installAssets()),
    // HyperFrames' skills and registry at the pinned commit (thin git fetch), and the app's Python components (pip, pinned)
    r("POST", "/setup/hf-skills", () => ctx.jobs.start("setup-hf-skills", { title: "HyperFrames skills" }, async (job) => {
      const r0 = await hfSkills.fetchSkills(root, { onLine: (l) => job.update({ stage: l }) });
      const v = hfSkills.verifySkills(root, { fresh: true });
      if (!v.ok) throw Object.assign(new Error("The fetched skills do not match HyperFrames' manifest"), { code: "INTEGRITY" });
      return { ...r0, skills: Object.keys(v.skills).length };
    })),
    // first run on a new computer: the list of everything beyond the repository with sizes, one "Download all", the work
    // folder, one style author's source at its pinned commit
    // off the server's thread; the last list at once while it is checked again (?fresh=1 waits)
    r("GET", "/setup/first-run", async (_p, _b, q) => ({ ...(await ctx.checks.firstRun.get({ fresh: q.get("fresh") === "1" })), bundle: firstRun.bundleManifest(root) })),
    r("POST", "/setup/first-run", (_p, b) => ctx.jobs.start("first-run", { title: "Setting up Moworks Studio" }, async (job) =>
      firstRun.firstRunAll({ root, ids: Array.isArray(b.ids) ? b.ids.map(String) : null, extras: Array.isArray(b.extras) ? b.extras.map(String) : [], signal: job.signal, onProgress: ({ id, stage, progress }) => job.update({ stage: `${id}: ${stage}`, progress }) }))),
    // Whisper on the graphics card: the card, the pack (name, source, size, licence), installed or not, the device Whisper uses and the
    // last run's. Its Install is POST /setup/first-run { ids: ["whisper-gpu"] } (112a D6: a route of its own nobody called)
    r("GET", "/setup/whisper-gpu", () => cuda.gpuState(root)),
    r("DELETE", "/setup/whisper-gpu", () => ({ pack: cuda.remove(root) })),
    // the free voice's Remove (its Install is POST /setup/first-run { ids: ["kokoro"] }); a voice-over being read holds it
    r("DELETE", "/setup/kokoro", () => {
      if (ctx.jobs.running().some((j) => j.kind === "tts")) throw new HttpError(409, "BUSY", "A voice-over is being read: wait until it ends");
      return { pack: kokoro.remove(root) };
    }),
    r("POST", "/setup/python", () => ctx.jobs.start("setup-python", { title: "Python components" }, async (job) => {
      const r0 = await pySetup.install(root, { onLine: (l) => job.update({ stage: l.slice(0, 120) }), signal: job.signal });
      return { installed: r0.installed, ready: (await pySetup.statusAsync(root)).ready };
    })),
  ];
}

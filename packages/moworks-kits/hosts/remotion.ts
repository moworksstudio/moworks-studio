// `remotion` for a film in one of the owner's kits: the app's stand-in (what-if-styles/shims/remotion.tsx, written from Remotion's public
// documentation, no Remotion package) with the kits' public folder mapped into the film: a kit's own files (Paper Collage's paper and grain
// textures, made by its tools/textures.py) are in assets/_app/<style>/, everything else is the project's assets/ (the stand-in's staticFile).
export * from "mw-remotion-shim";

declare const __MW_KIT__: string;
const OWN = /^(textures)\//;
export const staticFile = (p: string) => {
  const s = String(p).replace(/^\/+/, "");
  return OWN.test(s) ? `assets/_app/${__MW_KIT__}/${s}` : `assets/${s}`;
};

// `remotion` for a film in one of the owner's film styles: the app's stand-in (what-if-styles/shims/remotion.tsx, written from Remotion's public
// documentation, no Remotion package) with the source skills' public folder mapped into the film: a source skill's own files (Paper Collage's paper and grain
// textures, made by its tools/textures.py) are in assets/_app/<style>/, everything else is the project's assets/ (the stand-in's staticFile).
export * from "mw-remotion-shim";

declare const __MW_STYLE__: string;
const OWN = /^(textures)\//;
export const staticFile = (p: string) => {
  const s = String(p).replace(/^\/+/, "");
  return OWN.test(s) ? `assets/_app/${__MW_STYLE__}/${s}` : `assets/${s}`;
};

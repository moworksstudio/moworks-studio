// Stand-in for @remotion/fonts: a What If film's faces are files of the project, declared by @font-face in its index.html
// (offline, G-REMOTE), so loadFont has nothing left to fetch; it answers { fontFamily } like Remotion's, and the host page waits for the
// faces before READY. Each @remotion/google-fonts/<Family> import is a module the build writes with that family's name
// (hf-edit/whatIfBuild.mjs googleFontModule), and the app installs the family into the project.
export const loadFont = (opts?: { family?: string }) => {
  const fontFamily = opts?.family ?? "";
  return { fontFamily, loaded: Promise.resolve(), waitUntilDone: () => Promise.resolve() };
};

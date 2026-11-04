import { Config } from "@remotion/cli/config";

// Remotion Studio / CLI defaults (tools/render.mjs and tools/stills.mjs set their own options, WebGL included)
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setChromiumOpenGlRenderer("angle");

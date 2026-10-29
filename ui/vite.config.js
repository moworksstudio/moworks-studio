// Vite for the Moworks Studio UI. Build: ui/dist (served by packages/server). Dev: `npm run dev:ui` proxies /api (and /media, the stills
// served from read-only clones) to the backend started with MW_PORT / MW_TOKEN (see package.json).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
  server: { port: 5173, strictPort: true, proxy: { "/api": `http://127.0.0.1:${process.env.MW_PORT ?? 4310}`, "/media": `http://127.0.0.1:${process.env.MW_PORT ?? 4310}` } },
});

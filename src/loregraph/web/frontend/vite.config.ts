import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Minimal ambient declaration so tsc (which type-checks this config) knows
// about `process.env` without pulling in all of @types/node.
declare const process: { env: Record<string, string | undefined> };

// Two build targets:
// * default (`npm run build`)      → outDir ../static, base "/" — served
//   by FastAPI's StaticFiles mount for the all-in-one `loregraph view`.
// * demo (`npm run build:demo`)    → outDir dist, base "/LoreGraph/",
//   VITE_DEMO_MODE=1 — a self-contained no-backend bundle for GitHub
//   Pages (yunyueli.github.io/LoreGraph/).
const isDemo = process.env.VITE_DEMO_MODE === "1";

export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
  build: {
    outDir: isDemo ? "dist" : "../static",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/healthz": "http://127.0.0.1:8000",
    },
  },
});

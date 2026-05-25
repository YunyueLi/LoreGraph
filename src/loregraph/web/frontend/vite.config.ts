import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build output lands in src/loregraph/web/static (one level up + static),
// so FastAPI's StaticFiles mount picks it up automatically.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../static",
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

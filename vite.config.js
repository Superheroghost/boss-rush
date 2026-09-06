import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    // Allow the sandbox/preview host (and any other host) to load the game.
    allowedHosts: true,
  },
  build: {
    // dev.html is the editable dev entry; `npm run build` inlines everything
    // into dist/index.html, which scripts/standalone.mjs then copies to the
    // root index.html so the game runs as a single static file.
    rollupOptions: {
      input: path.resolve(__dirname, "dev.html"),
    },
  },
});

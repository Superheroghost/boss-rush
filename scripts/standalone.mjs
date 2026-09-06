// Copies the single-file build (dist/index.html) to the repository root as
// index.html, so opening index.html directly shows the whole game.
// Usage: node scripts/standalone.mjs  (run automatically by `npm run build`)
import { copyFileSync, existsSync, statSync } from "node:fs";

const src = new URL("../dist/dev.html", import.meta.url);
const dest = new URL("../index.html", import.meta.url);

if (!existsSync(src)) {
  console.error("dist/index.html not found — run `vite build` first.");
  process.exit(1);
}

copyFileSync(src, dest);
console.log(
  `index.html updated (${(statSync(dest).size / 1024).toFixed(1)} KB, fully self-contained).`
);

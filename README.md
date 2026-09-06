# Ashen Gauntlet — Soulslike Boss Rush

A single-file boss rush game. All source is plain JavaScript (no TypeScript).

## Play it

Just open **`index.html`** — it is a fully self-contained build of the entire
game (game code + styles all inlined), so it works straight from disk or any
static file host. No server or build step required.

## Development

- `src/` — plain JS / JSX source (`npm run dev` uses `dev.html` as its entry).
- `dev.html` — editable dev entry point served by Vite at `/dev.html`.
- `index.html` — generated single-file build. `npm run build` re-creates it.
- `npm run dev` — start Vite (open `/dev.html` for the live source version).
- `npm run build` — bundle and inline everything into `index.html`.
- `npm run sim` / `npm run mech` — headless engine smoke/simulation scripts.

## Features

- All **11 bosses** are available for practice from the start (Boss Practice +
  Campfire bestiary challenges).
- All **4 weapons** (longsword, katana, greataxe, spear) are unlocked from the
  start, including for pre-existing saves.

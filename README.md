# D&D Maps

A lightweight, browser-based virtual tabletop inspired by D&D Beyond Maps. Grid-based battle maps with player/enemy tokens and fog of war, split across a Game Master view and a Spectator view running on the same device.

## Development

```bash
npm install
npm run dev
```

Then open:

- `http://localhost:5173/` — landing page
- `http://localhost:5173/gm.html` — GM view
- `http://localhost:5173/spectator.html` — spectator view

## Build

```bash
npm run build
npm run preview
```

## Deploy

Pushes to `main` deploy automatically to GitHub Pages via `.github/workflows/deploy.yml`. The `base` path in `vite.config.ts` must match the repository name.

## Architecture

See the original implementation plan for the full design. Phases are tracked in git history — one commit per phase.

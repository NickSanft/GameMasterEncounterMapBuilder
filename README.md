# GM Encounter Maps

A lightweight, browser-based virtual tabletop for Game Masters. Grid-based battle maps with player/enemy tokens and fog of war, split across a GM view and a Spectator view running on the same device. Deploys as a static site.

## Usage

From the landing page, open the **GM View** on your own screen and the **Spectator View** on the screen facing your players. Both tabs share state live via `BroadcastChannel`; refresh-safe via `localStorage`.

### GM toolbar

| Tool | Shortcut | Purpose |
|---|---|---|
| Select | `S` | Click a token to select, drag to move. Right-click to edit. Delete/Backspace removes the selected token. |
| Token | `T` | Click any grid cell to drop a token. **Alt+click** stamps the most recently placed token (same label, color, border, image). |
| Reveal | `R` | Drag to clear fog. Rect or freehand; brush size 1–3. |
| Hide | `H` | Drag to re-cover fog. Same shape/size controls. |
| Map | `M` | Drag to reposition the background, scroll to scale. |
| Note | `N` | Click to drop a map annotation (colored pin + text). Right-click a pin to edit/share/hide/delete. |
| Ruler | `L` | Drag to measure distance — shows squares, feet (D&D 5ft rule), and diagonal. Ephemeral. Also available on Spectator via its left toolbar. |
| AoE | `Y` | Drag to place a sphere / cone / line / cube template. Pick shape, color, visibility in the side panel. Right-click a placed template to toggle visibility or delete. |

### Session menu (top-right)

- **Upload Map** — drops an image under the grid (auto-stretched to grid bounds).
- **Preset Maps** — pick a bundled forest / dungeon / cavern / grassland background.
- **Export** — downloads the current session (state + images) as JSON.
- **Import** — restores a session from an exported JSON file.
- **Notes** — toggle the private Session Notes drawer (GM only; saves locally, never synced).
- **Shortcuts** — open the keyboard shortcut overlay (or press `?`).
- **Settings** — grid, appearance (dark/light theme), camera, accessibility, diagnostics.
- **New Session** — clears tokens, fog, and background.

### Global controls

- **Space + drag** or **middle-mouse drag** — pan the camera.
- **Mouse wheel** — zoom to cursor. (In Map tool mode the wheel scales the background image instead.)
- **Right-click** — contextual menu. On a token: Edit / Duplicate / Copy / Cut / Delete. On empty space: Place token / Paste / Reveal or Hide 5×5 / Fit / Reset camera.
- **Shift+click** a token to add or remove it from the current selection; **click-drag on empty space** to rubber-band select multiple tokens (hold **Shift** to add to existing selection).
- **Ctrl/Cmd+Z** — undo (up to 50 steps). **Ctrl/Cmd+Shift+Z** or **Ctrl/Cmd+Y** — redo.
- **Ctrl/Cmd+C / V / X** — copy, paste, cut selected tokens. **Ctrl/Cmd+D** — duplicate selection in place (offset one cell).
- **Arrow keys / WASD** — move selected tokens by one cell (hold **Shift** for five). Drag/drop moves broadcast only on release.
- **?** — open the on-screen shortcut reference.
- **Right-click → Ping here** — flashes a ring on both GM and Spectator; ephemeral, not persisted.
- **Escape** — close the token editor.

### Token editor

Triggered by right-clicking a token in the GM view. Edit its label, fill color, size (1/2/3 grid cells), upload a custom image, or delete the token. Changes sync live to the Spectator view.

## Development

```bash
npm install
npm run dev
```

Open:
- `http://localhost:5173/` — landing page
- `http://localhost:5173/gm.html` — GM view
- `http://localhost:5173/spectator.html` — Spectator view

## Build

```bash
npm run build
npm run preview
```

## Testing

```bash
npm test              # vitest unit tests
npm run test:e2e      # Playwright end-to-end tests (includes visual regression)
npm run size          # bundle-size budget check (runs against dist/)
```

### Bundle-size budget

`npm run size` checks the production build against per-surface budgets defined in the `size-limit` block of `package.json`. All numbers are brotli-compressed (the compression modern CDNs + Cloudflare Pages / GitHub Pages Fastly serve):

| Surface | Budget | Why |
|---|---|---|
| `dist/assets/*.js` total | 75 KB | Catches accidental import of a big library into any entry |
| `dist/assets/*.css` total | 8 KB | Styles shouldn't snowball from adding new modals / panels |
| `dist/*.html` entries | 2 KB | Vite injects `<script>` + `<link>` tags; anything more is a regression |
| `dist/sw.js` + `manifest.webmanifest` | 2.5 KB | PWA shell should stay tiny for first-paint cost on slow mobile |

The CI workflow (`.github/workflows/ci.yml`) runs `npm run size` as the last step of the `Typecheck, test, build` job, so any push that blows a budget red-marks the PR. To intentionally raise a limit, edit the `limit` field in `package.json` alongside the code change so the budget bump lands with the feature that needed it.

### Visual regression baselines

`e2e/visual-regression.spec.ts` screenshots key surfaces (empty GM canvas, tokens + fog, Settings modal, shortcut overlay, light-theme chrome) and diffs them against baseline PNGs committed under `e2e/visual-regression.spec.ts-snapshots/`. Baselines are **platform-specific** — Playwright suffixes each PNG with `-chromium-<platform>.png`. The repo ships both Windows (`-win32.png`) and Linux (`-linux.png`) baselines so `npm run test:e2e` passes on Windows dev machines AND the Ubuntu GitHub Actions runner.

To update the baselines intentionally (e.g. you changed a rendering surface):

**On your own platform** — straightforward:
```bash
npx playwright test e2e/visual-regression.spec.ts --update-snapshots
```

**Cross-platform** — e.g. regenerate the Linux baselines from a Windows dev box. Use the official Playwright Docker image so the fonts + AA match the CI runner bit-for-bit:
```bash
docker run --rm \
  -v "$(pwd):/work" \
  -v "/work/node_modules" \
  -w /work \
  mcr.microsoft.com/playwright:v1.59.1-jammy \
  bash -c "npm ci --no-audit --no-fund && \
           npx playwright test e2e/visual-regression.spec.ts --update-snapshots"
```
(On Windows Git Bash prefix the command with `MSYS_NO_PATHCONV=1` so the `/work` path isn't mangled.) The anonymous volume at `/work/node_modules` keeps the container's Linux deps from overwriting your host's Windows `node_modules`.

Inspect the resulting PNGs manually, then commit both platforms' baselines alongside the code change. When a diff fails unexpectedly, `test-results/` holds side-by-side comparison images and Playwright traces.

## Deploy

Push to `main`; `.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages. The `base` path in `vite.config.ts` must match the repository name.

## Architecture

- **Vite** multi-page build — three independent HTML entries, no client-side router.
- **TypeScript**, vanilla DOM, no framework.
- **HTML5 Canvas** renderer with layered draws: background → grid → tokens → fog → fog-preview.
- **BroadcastChannel** (`gm-encounter-maps-session`) for same-origin cross-tab sync. GM is authoritative; Spectator listens.
- **localStorage** holds the serialized session state (debounced 200ms). **IndexedDB** holds image blobs.
- Session export is JSON + base64 image data, fully self-contained and portable.

See `src/state/types.ts` for the full state contract and `src/util/constants.ts` for storage identifiers.

## Known limitations

- Default sync is single-origin via `BroadcastChannel` (GM + Spectator on the same machine / browser profile). Cross-network play is opt-in via the **Remote Play** modal (Phase 64+); both sides must be online and exchange a one-shot signaling code to establish the WebRTC peer connection.
- `BroadcastChannel` is disabled in some private-browsing modes; the Spectator shows a warning banner when that's the case.
- IndexedDB has a per-origin quota; large libraries of uploaded maps will eventually hit it.
- Hex grid: distance, token snap, walls, and manual fog reveal are hex-aware (v1.4 → v1.7); auto-reveal still rasterizes into the rectangular fog buffer (visible stair-stepping along curved viewer perimeters in hex mode). A truly hex-grain fog buffer is a future major bump.

## Changelog

### Rename to GM Encounter Maps
Storage identifiers were renamed from `dnd-maps-*` to `gm-encounter-maps-*`. Sessions saved before the rename won't load automatically; import an exported JSON to restore them, or start fresh.

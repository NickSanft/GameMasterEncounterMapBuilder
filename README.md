# GM Encounter Maps

A lightweight, browser-based virtual tabletop for Game Masters. Grid-based battle maps with player/enemy tokens and fog of war, split across a GM view and a Spectator view running on the same device. Deploys as a static site.

## Usage

From the landing page, open the **GM View** on your own screen and the **Spectator View** on the screen facing your players. Both tabs share state live via `BroadcastChannel`; refresh-safe via `localStorage`.

### GM toolbar

| Tool | Shortcut | Purpose |
|---|---|---|
| Select | `S` | Click a token to select, drag to move. Right-click to edit. Delete/Backspace removes the selected token. |
| Token | `T` | Click any grid cell to drop a token. |
| Reveal | `R` | Drag to clear fog. Rect or freehand; brush size 1–3. |
| Hide | `H` | Drag to re-cover fog. Same shape/size controls. |
| Map | `M` | Drag to reposition the background, scroll to scale. |

### Session menu (top-right)

- **Upload Map** — drops an image under the grid (auto-stretched to grid bounds).
- **Export** — downloads the current session (state + images) as JSON.
- **Import** — restores a session from an exported JSON file.
- **New Session** — clears tokens, fog, and background.

### Global controls

- **Space + drag** or **middle-mouse drag** — pan the camera.
- **Mouse wheel** — zoom to cursor. (In Map tool mode the wheel scales the background image instead.)
- **Right-click** — contextual menu. On a token: Edit / Duplicate / Copy / Cut / Delete. On empty space: Place token / Paste / Reveal or Hide 5×5 / Fit / Reset camera.
- **Shift+click** a token to add or remove it from the current selection; **click-drag on empty space** to rubber-band select multiple tokens (hold **Shift** to add to existing selection).
- **Ctrl/Cmd+Z** — undo (up to 50 steps). **Ctrl/Cmd+Shift+Z** or **Ctrl/Cmd+Y** — redo.
- **Ctrl/Cmd+C / V / X** — copy, paste, cut selected tokens. **Ctrl/Cmd+D** — duplicate selection in place (offset one cell).
- **Arrow keys / WASD** — move selected tokens by one cell (hold **Shift** for five). Drag/drop moves broadcast only on release.
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

- Single-device only — no network sync across browsers. By design.
- No dice, initiative, measurement, or drawing tools. By design.
- `BroadcastChannel` is disabled in some private-browsing modes; the Spectator shows a warning banner when that's the case.
- IndexedDB has a per-origin quota; large libraries of uploaded maps will eventually hit it.

## Changelog

### Rename to GM Encounter Maps
Storage identifiers were renamed from `dnd-maps-*` to `gm-encounter-maps-*`. Sessions saved before the rename won't load automatically; import an exported JSON to restore them, or start fresh.

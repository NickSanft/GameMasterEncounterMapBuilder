# GM Encounter Maps

A lightweight, browser-based virtual tabletop for Game Masters. Grid-based battle maps with player/enemy tokens, walls, fog of war, dynamic line-of-sight, scenes, dice, and a remote-play option — all in a static site you can host on GitHub Pages. Designed for one GM at the keyboard with players watching either the **same screen** (split-tab Spectator view) or **across the internet** (opt-in WebRTC remote play).

Currently at **v1.55.0** (Phases 1 → 180 shipped; see `CHANGELOG.md` for the full history).

## Highlights

- **Two views, one origin.** GM tab + Spectator tab on the same browser sync via `BroadcastChannel`. Or pair across machines via the opt-in **Remote Play** WebRTC bridge.
- **Square or hex grid.** Hex mode is feature-complete for tokens, walls, and manual fog (v1.4 → v1.7).
- **Walls + dynamic line-of-sight** with sight-blocking + movement-blocking flags, segment + block + hex-shaped + door variants, and per-token `losRadius` for "what each viewer sees."
- **Multiple scenes per session** with rotating snapshot history (Phase 97) — restore any scene to a snapshot from up to 8 prior auto-saves, or rewind from a specific combat-log entry.
- **Initiative tracker** with auto-roll, per-condition round timers, death-save tracker, drag-handle reorder, auto-skip dead tokens, and a hover popover showing portrait + HP + conditions.
- **Tokens with depth.** Per-token HP / conditions / aura / vision modes / lock / parent (vehicle) / target reticle / GM notes / tags / auto-numbering / lighting / death saves / ownership / spectator-side per-token visibility.
- **Authoring polish.** Drawings, annotations, AoE templates (sphere / cone / line / cube), tile-paint dungeon mode, travel-route polylines with distance labels, wall presets including 5e cover terminology, background fill color or image, recent-backgrounds switcher, drag-and-drop / paste-to-upload, auto-grid detection.
- **Combat log** with damage / heal / condition / death-save / turn / turn-skip events, exportable, click-to-rewind to the nearest snapshot.
- **Saved encounter library** (Phase 180) — build a "Goblin Ambush" once, drop it into any scene with fresh ids.
- **Camera tools.** Pan / zoom, named bookmarks (Alt+1..9 quick-jump), fit-to-content + fit-to-selection (`F`), smooth tween between jumps, optional auto-pan to the active turn.
- **Player surfaces.** Player chat panel (per-message GM/shared visibility), player-side annotation suggestions (GM approves), per-spectator hidden tokens, owned-token spectator drag.
- **Dice.** 3D animated polyhedrals, `/roll`-style slash commands, dice history recall, broadcast to remote peers.
- **Accessibility.** Keyboard-navigable canvas selection, ARIA outline panel, focus-visible rings per-theme, WCAG AA contrast pass, `prefers-reduced-motion` + `prefers-contrast: more` mappings, live-region announcement budget.
- **PWA.** Service-worker offline cache, install hint, offline banner, "update available" prompt on new releases.
- **Themes.** 5 built-in (Dark / Light / Parchment / Console / Purple Dusk).

## Usage

From the landing page (`index.html`), open the **GM View** on your own screen and the **Spectator View** on the screen facing your players. Both tabs share state live via `BroadcastChannel`; refresh-safe via `localStorage` + `IndexedDB`.

Cross-machine play: Session menu → **Remote play…** → share the one-shot signaling code with the other side. The connection is direct WebRTC; no server required.

### GM toolbar

Tool keybindings are configurable in **Settings → Keybindings**. Defaults:

| Tool | Default key | Purpose |
|---|---|---|
| Select | `S` | Click to select, drag to move, right-click for actions. **Shift+click** to multi-select; **Alt+click** to cycle through stacked tokens. |
| Token | `T` | Drop a token. **Alt+click** stamps the most recently placed; auto-suffixes duplicate labels (Phase 137). |
| Reveal | `R` | Drag to clear fog. Rect / freehand brush 1×1 → 5×5. |
| Hide | `H` | Drag to re-cover fog. Same shape / size controls. |
| Map | `M` | Drag the background image. Right-click for rotate / flip / fill color. |
| Note | `N` | Drop a colored pin with text. |
| Ruler | `L` | Drag to measure (square / feet / 5e diagonals). Ephemeral; touch two-finger rotate also wired (Phase 104). |
| AoE | `Y` | Sphere / cone / line / cube template. Two-finger rotate on touch. |
| Draw | `K` | Freehand ink with width + color + per-stroke visibility. |
| Walls | `W` | Click vertices to build a chain; `Esc` / right-click ends. Block-mode = drag a rectangle (or hex). Wall presets in the editor. |
| Paint | `P` | Tile-paint dungeon mode (floor / wall / water / rough / pit). Optional coupling to block walls (Phase 150). |
| Travel | `G` | Drop waypoints to mark a journey route with a total-distance label. |

### Right-click menus

- **On a token**: Edit, Distance to…, Damage / Heal, Set as target / Clear target, Duplicate, Copy, Cut, Save as template, Delete. Also stack-here picker when the cell holds 2+ tokens.
- **On a wall**: Edit, Open / Close door, Apply preset, Delete.
- **On an AoE template**: Toggle visibility, Delete.
- **On an annotation**: Edit, Toggle visibility, Delete.
- **On empty space**: Place token / annotation, Ping here, Reveal / Hide 5×5, Fit to screen, Reset camera. With Map tool active: Rotate / flip / fill-color the background.
- **On a recent-tokens-strip slot**: Right-click to evict.

### Session menu (top-right)

Upload Map · Preset Maps · Scenes · Token Library · Template Library · Initiative · Export · Export Image · Import · Import VTT (`.dd2vtt` / `.uvtt`) · Notes · Combat Log · Snapshots · Clear Drawings · Shortcuts · Take the tour · Remote play · Permissions

### Settings

Tabbed modal — open via the gear icon, or `Ctrl+K → Open Settings`. Includes:

- **Appearance.** Theme · Label size · Distance unit (squares / feet) · Diagonal rule (5e / 5e-alt / Chebyshev / Euclidean) · Feet per square · Auto-suffix duplicate token labels · Tile-paint → block-wall coupling · Clip auras by sight-blocking walls · Scene lighting tint.
- **Grid.** Cols / rows / cell size · Show grid lines · Square / hex shape · Show A–Z column + 1–N row labels · Dynamic line-of-sight mode · Auto-reveal from viewer LoS.
- **Camera.** Persist camera position · Broadcast my camera (GM) / Follow GM camera (Spectator) · Per-turn timer duration · Auto-pan to active turn · Auto-skip dead tokens on Next turn.
- **Accessibility.** Reduced motion · High contrast · Voice transcription mic in Notes · Show diagnostics overlay.
- **Keybindings.** Rebind the 12 tool-activation shortcuts to any letter / digit.

### Global controls

| Action | Shortcut |
|---|---|
| Pan camera | Space + drag, or middle-mouse drag |
| Zoom to cursor | Mouse wheel (Map tool: scales background instead) |
| Fit content / selection | `F` (fits selection when set, else whole map) |
| Reset camera | `0` |
| Camera bookmarks | Alt+1 … Alt+9 (Phase 102) |
| Recent scenes quick-switch | Ctrl+1 … Ctrl+9 (Phase 75) |
| Undo / redo (whole state) | Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z (or Ctrl+Y) |
| Move-undo (last token move only) | `Z` (Phase 122) |
| Copy / paste / cut tokens | Ctrl/Cmd+C / V / X |
| Duplicate selection | Ctrl/Cmd+D |
| Move selection by 1 cell | Arrow keys / WASD |
| Move selection by 5 cells | Shift + Arrow / WASD |
| Edit selected token | `E` |
| Quick-HP adjust | `+` / `-` (Shift = ±5) |
| Open command palette | Ctrl+K |
| Slash command | `/` (chat / dice / quick actions) |
| Show shortcut overlay | `?` |
| Open initiative tracker | (icon / palette) |
| Ping at cursor | Right-click → Ping here |
| Cancel pick / close modal | Escape |

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

`npm run build` runs `node scripts/check-no-null-bytes.mjs && tsc --noEmit && vite build`.

## Testing

```bash
npm test                  # vitest unit tests (~1700 specs)
npm run test:e2e          # Playwright end-to-end (~410 specs incl. visual-regression)
npm run test:e2e:install  # one-time chromium fetch for Playwright
npm run size              # bundle-size budget check (runs against dist/)
npm run extract:whats-new # regenerate src/state/whats-new-entries.generated.ts from CHANGELOG.md
```

### Bundle-size budgets

`npm run size` checks the production build against per-surface budgets defined in the `size-limit` block of `package.json`. All numbers are brotli-compressed:

| Surface | Budget | Why |
|---|---|---|
| JS initial-load (excluding lazy chunks) | 122 KB | Cap on what every user pays for on first paint |
| JS lazy chunks (help / settings / remote-play / dice / what's-new) | 28 KB | Per-modal split-out |
| All CSS | 15 KB | Catches accidental style snowballing |
| HTML entries | 2 KB | Vite-injected `<script>`/`<link>` overhead only |
| Service worker + manifest | 2.5 KB | PWA shell stays tiny for first-paint cost |

The budget is a guardrail, not a target. The CI workflow runs `npm run size` as the last build step; intentional limit bumps land alongside the feature commit that needed them (look for "+0.X KB" lines in CHANGELOG entries).

### Visual regression baselines

`e2e/visual-regression.spec.ts` screenshots key surfaces (empty boot, tokens + fog, Settings modal, shortcut overlay, light theme) and diffs against committed PNGs in `e2e/visual-regression.spec.ts-snapshots/`. Baselines are **platform-specific** — Windows (`-win32.png`) and Linux (`-linux.png`) ship side-by-side so `npm run test:e2e` passes on both Windows dev machines and the Ubuntu GitHub Actions runner.

To update baselines intentionally:

**On your own platform**:
```bash
npx playwright test e2e/visual-regression.spec.ts --update-snapshots
```

**Cross-platform** (e.g. regen Linux baselines from a Windows dev box) — use the official Playwright Docker image so fonts + AA match CI:
```bash
docker run --rm \
  -v "$(pwd):/work" \
  -v "/work/node_modules" \
  -w /work \
  mcr.microsoft.com/playwright:v1.59.1-jammy \
  bash -c "npm ci --no-audit --no-fund && \
           npx playwright test e2e/visual-regression.spec.ts --update-snapshots"
```

The `npm run baselines` script wraps the regen flow.

## Deploy

Push to `main`; `.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages. The `base` path in `vite.config.ts` must match the repository name.

## Architecture

- **Vite** multi-page build — three independent HTML entries (`index.html`, `gm.html`, `spectator.html`); no client-side router.
- **TypeScript**, vanilla DOM, no framework.
- **HTML5 Canvas** renderer with layered passes: background → grid → tile paint → tokens (auras → bodies → labels → status → owners → reticle) → AoE templates → strokes → annotations → travel routes → walls → fog (with worker-rasterized rectangles) → lighting → measurement / pings / drag overlays.
- **State** lives in a single `SessionState` blob with a defensive deserializer for forward-only schema growth (24 wire-format additions across the lifetime, all back-compatible). Mutations go through a `StatePatch` discriminated union; the store coalesces consecutive same-key patches into one undo step (50-step history; coalesce window 400 ms).
- **BroadcastChannel** (`gm-encounter-maps-session`) for same-origin cross-tab sync. **WebRTC** (Phase 64+) for cross-network remote play; signaling via copy-pasted handshake string.
- **localStorage** holds the serialized session state (debounced 200 ms), per-scene notes / panel-open state, preferences, identity, recent backgrounds, camera bookmarks, wall presets, "what's new" last-seen version, and other small configs.
- **IndexedDB** (`gm-encounter-maps`) holds image blobs, scenes, snapshot history, encounter library, token catalog, template catalog. DB v6.
- **Service Worker** caches the app shell for offline use; `controllerchange` triggers a one-click reload to the new version.
- Session export is JSON + base64 image data, fully self-contained. Per-scene export / import (Phase 98) and Universal VTT (`.dd2vtt` / `.uvtt`) import (Phase 141) for cross-tool interop.

See `src/state/types.ts` for the full state contract, `src/util/constants.ts` for storage identifiers, and `CHANGELOG.md` for the per-phase design history.

## Known limitations

- Default sync is single-origin via `BroadcastChannel` (GM + Spectator on the same machine / browser profile). Cross-network play is opt-in via the **Remote Play** modal (Phase 64+); both sides must be online and exchange a one-shot signaling code to establish the WebRTC peer connection.
- `BroadcastChannel` is disabled in some private-browsing modes; the Spectator shows a warning banner when that's the case.
- IndexedDB has a per-origin quota; large libraries of uploaded maps can hit it. The app surfaces low-quota warnings via the save-status pill.
- **Hex grid** has feature-complete support for tokens, walls (segment + hex-block), distance, ruler, movement indicator, and manual fog reveal (v1.4 → v1.7). Auto-reveal-from-viewers (Phase 58) still rasterizes into the rectangular fog buffer (visible stair-stepping along curved viewer perimeters in hex mode). A truly hex-grain fog buffer is a future major bump.
- **Vision modes** (darkvision / blindsight / tremorsense / truesight, Phase 178) are visual-only — fog math still keys off `Token.losRadius`. Mechanical effect is a future polish.
- **Snapshot rewind** is at-or-before the clicked combat-log entry's timestamp, capped to the rotating 8-snapshot history per scene. Mid-snapshot precision isn't possible — restore the nearest, then re-apply what you want to keep.
- The "Save scene as encounter…" library doesn't bundle background images; encounters carry tokens + walls only. Drop into a scene that already has the background you want.

## Releases

Every release is an annotated git tag (`vX.Y.Z`) on the commit that introduced it. The full per-phase history with design notes lives in `CHANGELOG.md`.

The "What's new" modal in-app surfaces the most-recent version-bump highlights pulled directly from `CHANGELOG.md` headers (Phase 161); the most-recent 4 entries also embed the full release-notes body for click-to-expand reading (Phase 173).

To preserve the auto-generated `src/state/whats-new-entries.generated.ts`: run `npm run extract:whats-new` after appending a new release entry to `CHANGELOG.md`. CI verifies the generated file matches what the script would produce; out-of-sync state never reaches main.

## Versioning

Pre-1.0 (Phases 1 → 125): minor version tracked the phase number; patch versions for small follow-ups inside a phase.

Post-1.0 (1.0.0 onwards, shipped 2026-04-27): standard semver — major for breaking changes (none yet), minor for new features (every phase ships as a minor), patch for bug fixes and doc-only changes.

## License

See `LICENSE`.

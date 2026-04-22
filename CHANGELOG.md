# Changelog

All notable changes to **GM Encounter Maps** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning scheme

While pre-1.0:

- **Minor version** (`0.X.0`) tracks the **phase number** from the development plan. Each phase ships as a minor release.
- **Patch version** (`0.X.Y`) is used for smaller follow-ups inside a phase (bug fixes, small UX additions that don't warrant a whole phase).
- **1.0.0** will be cut when the app ships its first stable, remote-play-capable release.

Every release is an annotated git tag (`vX.Y.Z`) on the commit that introduced the feature.

---

## [Unreleased]

Post-1.0 roadmap. Phase 56 landed as *Selectable walls* (requested
during testing); the originally-planned lighting phase + later work
shift up by one:

- **0.57.0** — Token lighting sources + bright/dim radius
- **0.58.0** — Follow-the-fog exploration mode
- **0.59.0** — Theme variants (parchment / console / purple dusk)
- **0.60.0** — Voice transcription → notes
- **0.61.0** — Onboarding tour
- **0.62.0** — Network sync: WebRTC transport
- **0.63.0** — Rooms + player identity
- **0.64.0** — Reconnection + conflict resolution

---

## [0.56.1] — 2026-04-22 — Delete-on-wall handler-ordering fix

### Fixed
- **Delete key on a selected wall unselected the wall instead of removing it.** The Select tool had its own window-level `Delete`/`Backspace` keydown handler (pre-existing, pre-Phase-56) that *only* knew about tokens / annotations / AoE. When the Phase 56 work added a second handler in `gm.ts` (which does know about walls), both listeners were on the window — and the Select tool's listener fires first under the Select-active-at-boot ordering. It cleared `selection.ids` (wall matched nothing it recognized → no patch), then gm.ts's handler ran, saw an empty selection, and no-op'd. Net effect: wall unselected, wall remained.
- **Fix**: remove the duplicate handler in `tool-select.ts`. gm.ts is now the single source of truth for `Delete`/`Backspace` (already covered tokens + annotations + walls + the live-region announcer since Phase 56; grown an AoE case here to preserve the old behaviour).
- **Why the bug passed CI**: the existing walls-selection e2e used a helper that pressed `w` then `s` during setup. Activating the Walls tool deactivates Select → removes its keydown listener; reactivating Select re-adds the listener *after* gm.ts's. Handler order inverted → gm.ts fired first → wall deleted. Masked the bug in tests but not in real use where no tool-switch happens.

### Regression test added
- New Playwright spec *`Regression (0.56.1): Delete removes a wall WITHOUT switching tools after boot`* inlines the wall-drawing steps (without the `w` → `s` dance) to pin the failure mode. Covers handler-ordering bugs of this shape going forward.

### No other changes
- Zero state / rendering / visual-baseline movement. `e2e/walls-selection.spec.ts` count: 5 → 6. Total Playwright: 123 → 124. Unit tests unchanged at 512.

---

## [0.56.0] — 2026-04-22 — Selectable walls

### Added
- **Walls are now first-class selectable scene objects** with the Select tool (`S`). Everything tokens / annotations / AoE can do, walls can too:
  - **Click** a wall to select it; **Shift+click** another to add to the selection.
  - **Lasso-drag** an empty region — any wall whose segment touches the rectangle (endpoint inside OR any edge crossed) joins the selection. Mixed selections (tokens + walls + annotations + AoE) all compose in the same drag.
  - **Highlight** — selected walls render in a brighter yellow with a soft glow; endpoint dots match. Easy to spot at any zoom.
  - **Drag to translate** — both endpoints move together with the cursor (no grid snap — walls live in world pixels, same freedom as annotations). Preview updates live during the drag.
  - **Arrow keys / WASD** translate selected walls by one grid cell at a time (+Shift = 5). Shares the same binding as token nudge, so mixed selections all move in sync.
  - **Right-click** a wall (or a multi-wall selection) → new *Wall actions* group menu with **Disable / Enable sight blocking (N)** and **Delete wall (N)** — `N` reflects the selection size, sight-blocking decision uses "disable if any block, else enable all."
- **Delete / Backspace** key now removes every selected token, annotation, *and* wall. (This binding was documented in the shortcut overlay since Phase 17 but the keydown handler had never been wired — long-standing gap fixed alongside Phase 56.)

### Implementation notes
- `collectWallLassoHits` + `segmentIntersectsRect` live in `src/input/lasso.ts`. Standard parametric segment-segment test against the lasso's four edges, plus an early endpoint-inside check for cheap common cases.
- `tool-select.ts` gains a `wallHit` branch below `aoeHit` in the pointer-down hit chain (so tokens / annotations / AoE remain visually on top when layers overlap). The commit-drag path grew a wall case that translates both endpoints by the overlay's `(deltaX, deltaY)` without grid rounding.
- `layer-walls.ts` now accepts `highlightIds` + `dragOverlay`. Selected walls render through three passes: soft glow, base-color unselected strokes, highlight-color selected strokes — selected on top so they never get hidden beneath crossing unselected walls. Mid-drag selected walls offset by the overlay delta for live preview.
- Group context-menu item label suffix (`" (N)"`) only appears when N > 1, matching the existing token-context-menu style.
- Sight-blocking group toggle target is deterministic: *disable* when any selected wall has `blocksSight: true`, *enable* when all are off — avoids the ambiguous "mixed" state.

### Tests
- **9 new unit tests** in `src/input/lasso.test.ts` covering `segmentIntersectsRect` (inside / edge-cross / fully-outside / parallel-skim) and `collectWallLassoHits` (crossing / inside / outside / normalized rect). Total unit-test count: **512** (+9 lasso, no other changes).
- **5 new Playwright specs** in `e2e/walls-selection.spec.ts`: click + Delete, shift+click 2 walls + Delete w/ group menu label, lasso-catch, drag-translate (old midpoint becomes Map, new midpoint becomes Wall), group sight-blocking toggle wording flip.
- Visual-regression baselines unchanged — highlight rendering only activates with a non-empty selection and no baseline includes that state.

### Bundle
- JS: 63.7 KB → **64.3 KB brotli** (+0.6 KB, budget 75 KB).

---

## [0.55.1] — 2026-04-22 — LoS recomputes during a viewer drag

### Fixed
- **Visibility polygon now updates while a viewer token is being dragged**, instead of staying frozen at the pre-drag position until pointerup. Phase 55 read viewer positions straight from `state.tokens`, but the Select-tool drag works through a *drag overlay* (a delta applied at render time) — the store doesn't change until the drag completes. So between pointer-down and pointer-up the LoS recompute saw stale positions and the yellow outline / Spectator fog didn't move with the token.
- `collectViewers` now accepts an optional `dragOverlay` parameter; viewers in the overlay's id set get their world-space center shifted by the overlay's `(deltaX, deltaY)` before being shipped to the worker.
- The GM entry hooks `renderer.onFrame` and re-fires `refreshLos()` whenever the drag overlay's signature changes — i.e. every move tick during an active drag, never otherwise. The fog-worker client's input-signature cache means non-drag frames cost nothing.
- Spectator follows the patch firehose like before; it sees the corrected position when GM commits the move on pointerup. (Mid-drag streaming to Spectator would need a new sync-message type — out of scope for this patch.)

### Tests
- **9 new unit tests** in `src/state/los-compose.test.ts` for `collectViewers` (size-aware center, drag-overlay shifts, drag of non-viewer, empty-ids back-compat, null-overlay back-compat) + `collectSightWalls` + `spectatorEffectiveFog`. Total unit-test count: 503.
- All 117 Playwright tests green (1 pre-existing scenes flake — passes in isolation).
- Visual regression baselines unchanged on Windows + Linux.

### No behavior change for non-drag flows
- Click-to-place + arrow-key + token-editor → patch path unchanged.
- LoS-off path unchanged.
- Spectator sync flow unchanged (still patch-driven).
- Bundle: 63.6 KB → 63.7 KB brotli (well under 75 KB budget).

---

## [0.55.0] — 2026-04-21 — Dynamic line of sight

### Added
- **Ray-cast visibility polygons** (`src/state/los.ts`) — pure module with `computeVisibilityPolygon(viewer, radius, walls)`, `rayHitSegment`, `filterWallsInRange`, `pointInPolygon`, and `rasterizeVisibility`. Implements the standard angular-sweep algorithm: cast 3 rays per wall endpoint (plus ε offsets on either side for corner diffraction) plus 48 uniform samples so a viewer in an open area still sees a smooth circular horizon. Runs entirely off the main thread inside the fog worker.
- **`Token.losRadius: number | null`** — new nullable field; `null` = not a viewer, a number (world pixels) = max sight distance. Backwards-compatible: the sync + persistence deserializer defaults missing values to `null`. Phase 54's walls are consumed via the `blocksSight` flag, so the GM gets full control over which segments matter.
- **Token editor — Sight fieldset** with a "This token is a viewer" checkbox and a radius input in feet. The editor reads `feetPerSquare` from preferences so the field stays grid-agnostic; default radius on enable is 30 ft (torch-light distance).
- **Preference `losMode: 'off' | 'revealed-and-visible'`** (default `'off'`, so Phase 54 users see zero behavioral change until they opt in). Exposed in Settings → Grid as "Dynamic line of sight".
- **Fog worker gets a second message**: `compute-los` posts viewers + walls and returns one polygon per viewer. `createFogWorkerClient` exposes `requestLos` / `getLatestPolygons` / `onLosUpdate` alongside the existing fog-compaction API. Input-signature caching dedupes identical requests without a worker round-trip.
- **Spectator fog clipping** — new `spectatorEffectiveFog` helper bitwise-ANDs the GM-revealed fog with a rasterized polygon mask; the Spectator fog worker gets that combined buffer, so the existing fog renderer needs zero changes. When `losMode === 'off'`, the helper returns the input buffer unchanged for zero overhead.
- **GM-side polygon outline** — new `drawLosPolygons` layer paints each visibility polygon as a translucent yellow outline on the GM canvas so the GM sees at a glance what every viewer can currently see. No-op on Spectator.
- **Help overlay** gets a new *Line of sight (optional)* section documenting the enable path, viewer setup, Spectator vs GM visual behavior, and the sight-blocking-wall interaction.

### Tests
- **18 new unit tests** for `src/state/los.ts` covering ray-segment intersection (forward/backward/miss/parallel), wall-in-range filtering, open-space polygon approximation, single-wall occlusion, behind-the-viewer no-op, point-in-polygon (inside/outside/degenerate), and polygon rasterization (covered / uncovered / union of multiple / empty).
- **3 new Playwright specs** (`e2e/line-of-sight.spec.ts`): preference lives on the Grid tab + persists across reload, token editor exposes working Sight fieldset with radius gating, enabling LoS + placing a viewer + a sight-blocking wall doesn't throw console errors on either the fog worker or the main thread.

### Visual regression
Baselines unchanged: `losMode: 'off'` is the default, so the empty-boot / tokens-and-fog / chrome / modal snapshots all produce pixel-identical output.

### Scope flagged for review
- **Walls still flow to Spectator** — decision deferred from Phase 54. Given LoS now runs on the Spectator too (for symmetric client-side masking), both the walls and the viewer tokens with `losRadius` need to be known there. The alternative (GM computes polygons + ships those) is cleaner privacy-wise but adds a new sync message type and a second copy of the polygons on the wire. If the "don't leak floor plans to players who devtool-inspect the state" concern matters more than the plumbing simplicity, we'd swap this in a follow-up phase.
- **GM canvas paints raw fog** — the GM is the painter, so their view intentionally ignores LoS clipping. The yellow polygon outlines let them eyeball what viewers see without losing their own map awareness.

### Bundle + perf
- JS bundle: ~60.9 KB → ~62.5 KB brotli (budget 75 KB).
- `fog-worker-*.js` chunk ~+1 KB gzipped for the LoS algorithm.
- `rasterizeVisibility` runs on the main thread per frame when polygons change — O(cols × rows × #polygons). On a 30×20 grid with 4 viewers it's 2 400 point-in-polygon tests per frame, each ~6 segments = ~15 000 float compares. Comfortably under 1 ms.

---

## [0.54.0] — 2026-04-21 — Walls: state model + tool + GM rendering

### Added
- **Wall state slice** — new `Wall` type in `src/state/types.ts` with `id`, endpoint coordinates `(x1, y1)`–`(x2, y2)` in world pixels, and two flags: `blocksSight` (consumed in Phase 55 for dynamic LoS) and `blocksMovement` (reserved for a future grid-pathing feature). `SessionState.walls: Wall[]` flows through the existing serialize / deserialize / persistence / sync pipelines automatically.
- **Four new store patches**: `wall-add`, `wall-update` (partial changes), `wall-remove`, `walls-clear`. All covered by the existing undo / redo / coalescing / batch machinery.
- **Walls tool** (`src/input/tool-walls.ts`) with shortcut **W**: click to drop chain vertices; each click commits a discrete `wall-add` patch so undo peels back one segment at a time. Double-click, Escape, or right-click ends the chain. Space-pan and two-finger pinch still work while the tool is active.
- **GM-only render layer** (`src/render/layer-walls.ts`) — walls draw as solid teal lines with small endpoint dots; the in-progress chain shows a dashed rubber-band preview from the last vertex to the cursor. Line widths scale inversely with camera zoom so they read consistently from any viewpoint. The layer is a no-op on the Spectator canvas.
- **Right-click a wall** (Select tool active) surfaces a new *Wall actions* context menu with *Disable / Enable sight blocking* and *Delete wall*. Hit-test tolerance is a 6-pixel band around the segment so clicks don't demand pixel-perfect aim.
- **Partial import integration** — new *Walls* checkbox in the import-options modal, disabled when the file contains zero walls.
- **Helpers** (`src/state/walls.ts`) — `createWall()`, `distanceSquaredToSegment()` (segment-clamped projection, `Math.sqrt`-free), `hitTestWalls()` (most-recently-drawn wins on overlap), `wallLength()`. All pure, fully unit-tested.

### Why split walls from line-of-sight?
The original plan bundled walls + LoS into a single phase. Separating them keeps each commit reviewable and each release independently useful: 0.54.0 gives GMs a way to *describe* maps, 0.55.0 teaches the fog layer to *consume* the description. Each phase also cuts its own CI-green review cycle under the new per-phase workflow.

### Sync + visibility note
Walls live in the serialized session state and flow through full-state + patch messages, so conflict-recovery and scene-switching work unchanged. Spectator receives them but the renderer ignores the data. Phase 55 will decide the Spectator-data question properly (ship walls directly, or ship derived LoS polygons) — for now Spectator sees no wall UI.

### Tests
- **16 new unit tests** in `src/state/walls.test.ts` covering `createWall` defaults + id uniqueness, `distanceSquaredToSegment` across all clamp / degenerate cases, `hitTestWalls` precedence + tolerance behavior, `wallLength`, and a `WALL_HIT_TOLERANCE_PX` sanity bound.
- **5 new Playwright specs** in `e2e/walls-tool.spec.ts`: W shortcut activates + toolbar reflects it, two-click commit + right-click opens *Wall actions*, delete-via-context-menu removes the wall (falls back to *Map actions*), sight-blocking toggle flips the wording, Escape during a chain commits no dangling segment.

### Bundle + size
- JS: ~59.7 KB → ~60.4 KB brotli (budget 75 KB, +0.7 KB headroom consumed).

---

## [0.53.0] — 2026-04-21 — Cached background layer via OffscreenCanvas

### Added
- **`src/render/background-cache.ts`** — a new bitmap cache for the static background layer (fallback fill + optional image at its offset/scale). The first paint draws into an `OffscreenCanvas` sized to the world grid; subsequent frames `drawImage(cache, 0, 0)` the cached bitmap and skip the per-frame fill + image composite entirely.
- **Cache invalidation** is keyed off the narrow slice of state that affects the bitmap: grid dimensions, theme, and the background image's `imageId` / load-state / offset / scale. Every other state change — camera pans, token mutations, fog edits, preference toggles unrelated to theme — reuses the cached bitmap.
- **Image-load coordination**: the key includes `bgImageLoaded` so the cache invalidates automatically the first frame after an IDB-backed image finishes loading. No special wiring needed — the existing `imageLoader.get(id)` transition from `null` → `HTMLImageElement` flips the key on its own.
- **Graceful fallback** for environments without `OffscreenCanvas` (jsdom, very old browsers, workers without the feature flag) — `getBitmap()` returns `null` and the renderer falls through to the inline `drawBackground()` path used in Phases 32–52.
- **Oversized-grid guard** — `MAX_CACHE_EDGE_PX = 4096` (Safari's historical `OffscreenCanvas` cap). Grids whose world dimensions exceed 4096 px on either edge skip the cache and render inline, same as today.

### Why background only (not grid)?
Grid lines are cheap to paint each frame (O(cols + rows) stroke ops, GPU-accelerated) and stay crisp at any zoom because they're still vector. Caching them into the bitmap would make them bilinear-interpolated (fuzzy) at zoom > 1× for marginal wins. The actual hotspot is the `ctx.drawImage(backgroundImg, offsetX, offsetY, w, h)` composite — which is what the cache amortises.

### Tests
- **21 new unit tests** in `src/render/background-cache.test.ts`:
  - `backgroundCacheKeyOf()` faithfully copies every field the cache depends on.
  - `cacheKeyEquals()` returns false for each of the 10 fields individually (parametrised test).
  - In jsdom (no `OffscreenCanvas` global) `getBitmap()` returns `null` on the live codepath.
  - With a stubbed `OffscreenCanvas`, the cache rebuilds once on first call and reuses the bitmap on identical keys, rebuilds on theme change, refuses oversized grids, and honours `invalidate()`.
- **Visual regression**: all 5 committed snapshots (both Windows + Linux) pass unchanged — the cached bitmap is pixel-identical to the inline path, so no baseline bump needed.
- **Full Playwright suite**: 110/110 on Windows + 5/5 Linux visual specs under the Playwright Jammy container.

### Bundle + perf notes
- No measurable bundle impact: `gm-*.js` gzipped size held at 30.00 KB (well under the 75 KB budget).
- The cache module is tiny (~130 LOC incl. types + JSDoc).
- On-device profiling will tell the real perf story, but in principle the cache replaces a `fill + image-composite` per frame with a single `drawImage` — a win on tablets and any mobile with a weaker rasterizer.

### Renderer integration
- `createRenderer` instantiates a cache at startup and destroys it in `destroy()`.
- The cache is a renderer-internal detail — neither `gm.ts` nor `spectator.ts` need to change.

---

## [0.52.0] — 2026-04-21 — Bundle-size budget

### Added
- **`size-limit` bundle-size guard** enforced in CI. Every push to `main` (and every PR) runs `npm run size` as the last step of the `Typecheck, test, build` job; budgets blown over by even a byte red-mark the build. Budgets are expressed in **brotli-compressed** bytes (what modern CDNs serve), configured in the `size-limit` block of `package.json`:
  | Surface | Budget | Currently |
  |---|---|---|
  | `dist/assets/*.js` total | **75 KB** | 59.4 KB |
  | `dist/assets/*.css` total | **8 KB** | 6.3 KB |
  | `dist/*.html` entries | **2 KB** | 1.3 KB |
  | `dist/sw.js` + `manifest.webmanifest` | **2.5 KB** | 2.1 KB |
- **`npm run size` script** for local checks — `size-limit` + `@size-limit/file` landed as dev deps (~8 packages, no runtime cost).
- **README *Bundle-size budget* section** under Testing: table of budgets, rationale for each, and the escalation path when a limit needs to move (edit the `limit` field alongside the code change).

### Why brotli not gzip?
`size-limit` v12's `@size-limit/file` preset defaults to brotli. Vite's build output report is gzip, so the numbers won't match — brotli runs ~12–18 % denser on our asset mix. The CDNs fronting GitHub Pages (Fastly) + most Cloudflare Pages / Vercel edges negotiate brotli when the client advertises it, so brotli is the more honest measurement of over-the-wire bytes.

### Headroom rationale
Budgets sit roughly 20–30 % above current totals — enough for Phases 53–62 to land in full without bumps, tight enough to catch accidental regressions (e.g. a stray `import * as lodash from 'lodash'`). If a phase legitimately needs more, the limit bumps in the same commit as the feature so the growth is auditable in `git log`.

### No behavior changes
Pure infra. `src/`, `e2e/`, and `tests/` untouched; 436 unit tests + 110 Playwright tests unchanged.

---

## [0.51.2] — 2026-04-21 — CI fix: run e2e inside the Playwright container

### Fixed
- **`ubuntu-latest` runner drift broke visual baselines even with Linux PNGs committed.** Phase 0.51.1 shipped `-chromium-linux.png` baselines generated against `mcr.microsoft.com/playwright:v1.59.1-jammy` (Ubuntu 22.04), but GitHub's `ubuntu-latest` label currently resolves to Ubuntu 24.04 Noble — the two emit slightly different font metrics, making the Settings modal render 24px shorter on Noble and blowing past the 2% pixel threshold on several surfaces.
- **Fix: pin the e2e job to run *inside* the Playwright Jammy container**, the same image the baselines were generated in. CI now matches Windows local dev (via Docker) bit-for-bit.
- Removed the now-redundant Playwright browser cache and `playwright install` steps — the container ships with browsers and system deps pre-installed.

### No code changes under `src/`
Pure CI hardening. Local `npm test` / `npm run test:e2e` are unaffected.

---

## [0.51.1] — 2026-04-21 — CI fix: Linux visual-regression baselines

### Fixed
- **Linux baselines for the visual-regression suite.** Phase 51 committed Windows baselines (`-chromium-win32.png`) only; when CI ran on `ubuntu-latest`, Playwright looked for `-chromium-linux.png`, couldn't find them, and all five visual tests failed. Linux counterparts are now committed alongside the Windows PNGs, generated via the official Playwright Docker image (`mcr.microsoft.com/playwright:v1.59.1-jammy`) so fonts + AA match the CI runner bit-for-bit.
- **`playwright-report/` missing-artifact warning.** The CI reporter was `[['github'], ['list']]` — no HTML reporter, so the `Upload Playwright report` step always warned "no files found". Added the HTML reporter to the CI branch of `playwright.config.ts`, plus a second upload step for `test-results/` (per-test traces, screenshots) that only fires on failure.
- **Node 20 deprecation noise.** `ci.yml` pinned `setup-node` to Node 20; bumped to Node 22 so the project's build + tests run on the new LTS. (The GitHub Actions runner's own Node is orthogonal — the runner's Node 24 migration is already handled by the `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` env var.)
- **Defensive `if-no-files-found: ignore`** on both artifact uploads so future path typos or empty-dir scenarios don't red-mark the build.

### Docs
- README's *Visual regression baselines* section now covers cross-platform re-baselining via Docker (with the `MSYS_NO_PATHCONV=1` + anonymous-volume trick for Git Bash on Windows), alongside the existing native `--update-snapshots` recipe.

### No code changes under `src/`
Pure CI + tooling fix. No unit or e2e behavior changed; all 436 unit tests + 110 Playwright tests (109 reliable + 1 pre-existing scenes flake) remain green.

---

## [0.51.0] — 2026-04-21 — Visual regression tests

### Added
- **`e2e/visual-regression.spec.ts`** — a screenshot-based Playwright suite that diffs five key rendering surfaces against committed baselines:
  - GM empty boot (dark theme, default grid) — catches any drift in canvas background, grid lines, toolbar chrome.
  - GM with two tokens + a partially revealed fog region — catches token rendering, fog compositing, and layer ordering regressions.
  - Settings modal on the Appearance tab — catches form layout, tab styling, button-group spacing.
  - Shortcut overlay (`?`) — catches typography + grid-layout regressions for the help content.
  - Light theme — snapshots just the session menu (theme swaps already covered by the empty-dark full-page shot for canvas pixels; the chrome has the widest contrast difference).
- **Committed baselines** under `e2e/visual-regression.spec.ts-snapshots/` with the standard Playwright `-chromium-<platform>.png` suffix. Cross-platform runners (Linux CI, etc.) regenerate their own baselines on first run with `--update-snapshots`; the workflow is documented in README.md.
- **README section** for visual regression covering how to re-baseline intentionally + where Playwright stores the side-by-side diff images when a test fails.

### Determinism strategy
Every snapshot test seeds the full Preferences object via `page.addInitScript(localStorage.setItem)` BEFORE the entry script runs. This fixes:
- Theme (`dark` by default, explicit `light` for the chrome comparison).
- `reducedMotion: true` so CSS transitions don't fire during the first paint.
- All diagnostic + mini-map toggles off.
- Scene-lighting opacity 0, grid labels off — no extra pass of compositing that could flicker between runs.

`animations: 'disabled'` on every `toHaveScreenshot` call also disables Playwright's wait-for-animations heuristic and freezes CSS animations at their zero state — belt and suspenders. A 250 ms post-boot settle gives the fog WebWorker one full message round-trip plus a rAF tick before the pixel grab.

### Why screenshot-diff the canvas at all?
All prior e2e tests assert on DOM state (aria-labels, dialog contents, context-menu labels). The rendered canvas pixels — token colors, fog opacity, label positioning, grid stroke widths, scene-tint math — only show up if something visually wrong lands. The five snapshots picked here cover the largest regression surfaces without being so broad that trivial refactors break the suite every week.

### Tally
- 5 new Playwright tests (all passing twice in a row against the committed baselines, confirming determinism).
- Total Playwright count: **110** across all specs (5 visual + 105 behavior).
- Suite duration: the visual specs add ~6 seconds — still well within the existing ~15 s full-suite budget.

### The 20-phase plan is complete
Phases 32 through 51 — token HP/conditions, rotation, movement indicator, stacking, dice, ruler presets, draw tool, IDB persistence, scenes, conflict detection, partial import, grid labels/tint, mini-map, export snapshot, a11y polish, mobile/touch, PWA, WebWorker fog, more e2e, and this visual regression suite — shipped over that span. The app has been at feature parity with most small-team VTTs since Phase 44; Phases 45–51 were quality, polish, and durability.

---

## [0.50.0] — 2026-04-21 — Additional e2e behavior tests

### Added

Four new Playwright specs closing gaps in the end-to-end coverage that previously lived only in unit tests. All assertions ride on observable DOM state (canvas `aria-label`, dialog contents, context-menu labels) rather than peeking into in-memory store state.

- **`e2e/undo-redo.spec.ts`** (6 tests) — exercises the undo/redo state machine through the actions the GM runs every session:
  - Ctrl+Z undoes a token placement and Ctrl+Y redoes it.
  - Ctrl+Shift+Z also redoes (common editor mapping).
  - Undo after token deletion restores the token.
  - Undo after a fog-reveal drag brings the revealed percentage back to zero.
  - Undo after arrow-key token movement puts the token back at its original grid cell.
  - Toolbar Undo / Redo buttons drive the same flow and reflect their enabled/disabled state correctly.
- **`e2e/aoe-tool.spec.ts`** (5 tests) — AoE tool had no e2e coverage at all before this phase:
  - `Y` shortcut activates the tool and the settings panel exposes all four preset shapes (Sphere / Cone / Line / Cube).
  - Clicking a shape button flips its active class (default is Sphere).
  - Dragging on the canvas places a template; right-clicking it surfaces the context menu titled *AoE actions* with the expected menu items.
  - Delete-via-context-menu removes the template (subsequent right-click falls back to the *Map actions* menu).
  - Visibility toggle flips the context-menu wording between *Make AoE GM-only* and *Share AoE with Spectator*.
- **`e2e/annotations.spec.ts`** (5 tests) — the Note tool + annotation editor lacked behavior coverage:
  - `N` + click drops an annotation and opens the editor focused on the (empty) text area.
  - Typed text auto-saves on input — closing and re-opening the editor preserves the text.
  - Visibility toggle flips the context-menu wording between *Make GM-only* and *Share with Spectator*.
  - Delete via context menu removes the annotation (subsequent right-click surfaces *Map actions*).
  - Clicking a preset color swatch marks it as active in the editor.
- **`e2e/lasso-multi-select.spec.ts`** (4 tests) — multi-token workflows:
  - Rubber-banding a region containing two tokens selects both — confirmed via the editor's *cycle-controls* row showing `1 of 2`.
  - Shift+drag over an additional token adds it to the current selection additively.
  - Arrow-key movement shifts every selected token by the same grid delta (`1 / 1`), including the second token verified via the editor's cycle-next shortcut.
  - Lassoing an empty region clears the selection (a subsequent `E` does not open the editor).

### Implementation notes
- Assertions avoid fragile pixel-color reads from the canvas. Instead they lean on:
  - The GM entry's canvas `aria-label` that tracks token count + fog-revealed percentage (already in place since Phase 25).
  - Dialog fields (`data-field="x"`, `data-field="y"`, `data-field="text"`, `data-field="counter"`).
  - Context-menu `aria-label` values (`Map actions`, `AoE actions`, `Annotation actions`) set by gm.ts per hit-test outcome.
- Where a test needed before/after readings of a token's coordinates it opens the editor, reads the value, and closes it — a natural pattern that exercises the editor's focus-restore path as a bonus.
- One fix along the way: the Undo / Redo toolbar buttons carry their shortcut in the `title` attribute, so the spec matches on `button[title^="Undo"]` / `button[title^="Redo"]` rather than the glyphed visible text, which Playwright's role-name resolution normalised inconsistently.

### Tally
Total e2e count: **20 new tests** across four new spec files. Combined with prior phases, the Playwright suite is now at 102 passing tests; the previously-flaky *Scenes › switching scenes swaps token state* test remains flaky in parallel runs (passes in isolation) — same behaviour as in Phases 45–49.

---

## [0.49.0] — 2026-04-20 — Fog WebWorker

### Added
- **Off-main-thread fog compaction.** A new `src/render/fog-worker.ts` runs in a dedicated Web Worker; it owns the fog grid and emits a list of run-length-compacted rectangles back to the main thread. The renderer paints those rects directly, skipping the per-frame scan through the fog grid that previously ran on the UI thread. On large maps (≥ 4 000 cells, ~63×63) this keeps frame budgets under control during heavy reveal-paint sessions.
- **Pure helper** `src/render/fog-rects.ts` — `compactFogRects(fog, cols, rows)` returns `{x, y, w}[]` (one rect per row of contiguous hidden cells); `drawCompactedFogRects(ctx, rects, cellSize)` paints them; `fogEquals(a, b)` is the cheap byte-by-byte equality check the worker client uses to skip redundant requests. Same code runs both in the worker and as the synchronous fallback, so the two paths are guaranteed to produce identical output.
- **Worker client** `src/render/fog-worker-client.ts` — `createFogWorkerClient({ workerFactory, useWorkerThreshold? })` wraps the worker behind a `request(fog, cols, rows)` / `getLatest()` / `onUpdate(listener)` API. Features:
  - Cache hit (identical fog vs last request) returns the cached rects immediately, no worker round-trip.
  - Worker requests carry a monotonically-increasing `requestId`; stale responses (when the user paints faster than the worker replies) are silently discarded.
  - Fog buffer is shipped via `postMessage`'s Transferable list (zero-copy) — even a 200×200 grid (40 KB) is essentially free to dispatch.
  - Synchronous fallback when `Worker` is unavailable (jsdom, file:// origins, blocked CSP) or when grid cell count is below the configurable threshold (default 4 000).
- **Renderer integration.** `createRenderer` accepts an optional `getFogRects()` callback; `drawFog` honours `precomputedRects` over its inline scan. Both `gm.ts` and `spectator.ts` mount a fog worker client at boot, kick a refresh on every `store.subscribe` (the byte-equality cache makes non-fog patches free), and re-paint the canvas when the worker delivers fresh rects.

### Tests
- **12 unit tests** for `compactFogRects` + `fogEquals` covering: empty grids, mixed runs within a row, all-hidden, all-revealed, non-zero-treated-as-revealed, no-merge-across-rows, checkerboard, trailing-hidden, identical-buffer equality, byte-mismatch, length-mismatch, two-empty equality.
- **10 unit tests** for `createFogWorkerClient` covering the inline-fallback path (forceFallback, cache reuse, cache invalidation on fog change, threshold-based fallback, getLatest semantics, safe destroy) and the worker path with a mocked `Worker` (postMessage shape + Transferable, response delivery + listener notification, stale-response filtering, terminate on destroy).
- **3 Playwright specs** (`e2e/fog-worker.spec.ts`): GM page boots without fog-related console errors; the existing reveal-fog drag flow still functions end-to-end (canvas aria-label updates with the new revealed-cell percentage); a dedicated `fog-worker-*.js` chunk is served on page load.

### Implementation notes
- Vite's `?worker` import handles bundling: `import FogWorker from '../render/fog-worker.js?worker'` produces a constructor that creates a real Worker pointing at the dedicated chunk. Build output now includes a tiny `fog-worker-*.js` (~0.5 KB after minification + gzip) — the helper itself, no DOM dependencies.
- `useWorkerThreshold` (default 4 000 cells) prevents the worker round-trip cost from outweighing the inline compaction win on small grids — the default 30×20 grid (600 cells) stays on the main thread, where it has always been fast.
- The pure helper / worker / client split sets the stage for future LOS (line-of-sight) computations to ride the same pipeline without re-architecting the renderer.

---

## [0.48.0] — 2026-04-20 — PWA / service worker

### Added
- **Installable Progressive Web App.** A new `public/manifest.webmanifest` declares GM Encounter Maps as a standalone-display PWA (reusing the existing SVG favicon as an `any maskable` icon), with two app-launcher shortcuts: *Open GM View* and *Open Spectator View*. Users on Chrome / Edge / mobile Safari can install the app to their home screen / dock; it launches in its own window with a matching dark `theme-color`. Categories list it under games / entertainment / utilities for app-store-style surfaces.
- **Offline-capable service worker** (`public/sw.js`) wired up on all three entries (`gm.html`, `spectator.html`, landing). Strategy:
  - **Install:** precache the app shell — index / GM / Spectator HTML, favicon, manifest. Failures on individual assets don't abort install.
  - **Activate:** delete caches not matching the current `APP_VERSION` and `clients.claim()` open tabs so the new worker is in charge immediately.
  - **HTML navigations:** network-first with a cache fallback, then a shell-fallback — so online users always see the freshest build, and fully-offline users still boot into the app.
  - **Static assets (JS / CSS / images / fonts):** stale-while-revalidate — cache hits serve instantly, a background fetch refreshes the cache for next launch.
  - **Message channel** listens for `{type: 'SKIP_WAITING'}` from the page so the user can choose when the update applies.
- **Update-available banner.** Extended `status-banners.ts` with an optional primary action button and wired the PWA registration to pop an *"A new version of GM Encounter Maps is available — Reload to update"* banner when a new worker is waiting. Clicking Reload posts `SKIP_WAITING` to the waiting worker; a `controllerchange` listener (only attached when there was a prior controller so first installs don't self-reload) handles the reload into the new bundle. An assertive aria-live announcement mirrors the banner for screen-reader users.
- **PWA registration helper** (`src/util/pwa.ts`) — `registerPwa({ onUpdateReady, onOfflineReady, swUrl? })`. Pure control-flow split out from navigator calls so the update-detection logic is unit-testable (see tests). No-ops gracefully when `navigator.serviceWorker` is missing or the context is insecure.
- **HTML polish.** `link rel="manifest"`, `link rel="apple-touch-icon"`, and `meta name="theme-color"` on all three entries. (Viewport / `mobile-web-app-capable` metas landed in Phase 47.)

### Tests
- **5 unit tests** for `attachUpdateListeners` + `registerPwa`: waiting-worker-at-registration fires immediately (and its reload callback posts `SKIP_WAITING`); missing `onUpdateReady` is a no-op; installing → installed transitions only fire when there's a prior controller (so first-install doesn't falsely signal an update); registration in an unsupported environment returns a well-typed no-op handle.
- **4 Playwright specs** (`e2e/pwa.spec.ts`): manifest is served + parses with expected fields; `sw.js` is served and contains the expected `APP_VERSION` constant + lifecycle handlers; the service worker registers successfully on `gm.html` (verified via `navigator.serviceWorker.ready`); apple-touch-icon + theme-color metas are present.

### Implementation notes
- The SW lives in `public/sw.js` so Vite copies it verbatim into `dist/`. Its scope is derived from its URL (`new URL('./sw.js', location)`) so it naturally matches the `/GameMasterEncounterMapBuilder/` base path on GitHub Pages and the vite-preview dev port.
- `APP_VERSION` in the SW is bumped manually alongside `package.json` — each phase's version change triggers a new SW bytes hash, which causes the browser to detect the update and fire `onUpdateReady` in the banner.
- The first-install reload hazard (where `clients.claim()` would fire `controllerchange` on an uncontrolled page and trigger `window.location.reload()`) is avoided by only attaching the reload listener when there was a controller at the moment of registration — proven out by the e2e suite (which wasn't seeing spurious reloads after the fix).
- No new runtime dependencies. Workbox was considered but the precache list is small enough, and the stale-while-revalidate helper is ~15 lines.

---

## [0.47.0] — 2026-04-20 — Mobile / touch support

### Added
- **Two-finger pinch + pan** on the canvas. Spreading or pinching two fingers zooms around the midpoint between them (the world point under the centroid stays stationary, same trick as wheel-zoom-to-cursor). Dragging both fingers together pans the camera without changing zoom. Zoom clamps to the same `[0.1, 8]` range as wheel-zoom.
- **Automatic tool cancellation when pinch starts.** The moment the second finger lands, pan-zoom synthesises a `pointercancel` event on the canvas for every tracked finger — so any in-flight Select drag, Draw stroke, fog paint, or AoE template is cleanly reset. Lifting back down to one finger returns control to the active tool.
- **`PanZoomHandle.isPinching()`** — threaded through the InputContext so tools can optionally consult the pinch state (e.g. to suppress re-engaging a gesture mid-pinch). Safe default of `false` for non-touch contexts.
- **Responsive CSS.**
  - `@media (max-width: 720px)`: toolbar lays out horizontally and scrolls instead of stacking off-screen; session menu becomes a scrollable drawer; modals fill the viewport; mini-map, view badge, scene indicator, and zoom controls all shrink to stay out of the way. Shortcut overlay collapses to a single column so its grid doesn't overflow.
  - `@media (hover: none) and (pointer: coarse)`: every button + close glyph bumps to a 44px minimum tap target with a larger font, matching mobile Safari / Chrome guidelines.
- **Mobile viewport metadata** on `gm.html`, `spectator.html`, and `index.html`: `viewport-fit=cover`, `user-scalable=no`, `theme-color` for iOS Safari status-bar colouring, and `mobile-web-app-capable` for the forthcoming PWA phase.

### New pure helper
- `src/input/pinch.ts` — `pinchStart(a, b, camera)` captures a snapshot (centroid, distance, camera, and world-space anchor under the centroid). `pinchUpdate(snapshot, a, b, options?)` turns the current finger positions into a new camera — `scale = currentDist / startDist`, clamped to `[minZoom, maxZoom]`. Pan is derived so the anchor stays put. `centroidOf` and `distanceBetween` are exported too for reuse.

### Tests
- **9 unit tests** for the pinch helpers — identity (no movement = no change), zoom-in / zoom-out direction, zoom clamping, anchor preservation during spread, pure translational pan, and the degenerate zero-start-distance guard.
- **4 Playwright specs** under the *Pixel 5* device profile (narrow viewport + `hasTouch: true`): toolbar is horizontal on narrow viewports, CDP-dispatched pinch gesture doesn't crash, single-finger tap with the Token tool drops a token (via `touchscreen.tap`), and viewport meta declares `user-scalable=no` + `viewport-fit=cover`.

### Implementation notes
- The pan-zoom tracker keeps a `Map<pointerId, {x,y}>` of active touch pointers so it can detect two-finger scenarios without relying on gestureevent (which is Safari-only). Mouse / middle-button panning is unchanged — the touch branch only fires when `e.pointerType === 'touch'`.
- Responsive rules override (rather than replace) the desktop layout, so wide-viewport workflows aren't disturbed. The `!important` flag is used sparingly (only on modal `min-width` / `max-width` where specific modals already pin those values).

---

## [0.46.0] — 2026-04-20 — Keyboard focus + aria-live

### Added
- **Skip-to-canvas link** on both `gm.html` and `spectator.html`. Visually hidden by default; the first Tab reveals it at the top-left, and pressing Enter drops focus directly on the battle map — keyboard users no longer have to Tab through the entire session menu + toolbar to reach the canvas.
- **Focusable canvas.** The `<canvas>` now carries `tabindex="0"` so screen-reader users land on it naturally during Tab order traversal (it already had the `role="img"` label from Phase 25 onward). The global `:focus-visible` rule already styled a red outline around `[tabindex]:focus-visible`, so a crisp focus ring is visible immediately.
- **Central aria-live announcer** (`src/util/announcer.ts`). Two visually-hidden regions — `polite` (default) and `assertive` — are injected at entry boot. The `announce(message, priority?)` API routes to the right region and flips a trailing non-breaking-space toggle so that identical repeats (e.g. "Token placed" after another "Token placed") still register as a change for assistive tech.
- **Narrated user events.** The following now emit live-region announcements so screen-reader users hear what changed without having to re-read the canvas:
  - Tool switches → *"{Tool} tool active"* (polite) — covers S/T/R/H/M/N/L/Y/K and the Spectator Ruler.
  - Context-menu token placement → *"Token N placed."*
  - Selection delete → *"Deleted N token(s) and M annotation(s)."*
  - Damage/Heal apply → *"Dealt 7 HP to Thrain."* / *"Healed 3 HP to 2 tokens."*
  - Scene switch → *"Switched to scene: Forest clearing."*
  - New session → *"New session started. All tokens, fog, and background cleared."*
  - Clear Drawings → *"3 drawings cleared."*
  - Export / Export Image / Import success → brief confirmation; failures emit *assertive* errors.
  - Dice rolls (local and remote from the other tab) → *"You rolled 1d20+5: 17."* / *"GM rolled 4d6kh3: 14."*
  - GM-tab conflict detected → *"Warning: another GM tab is open."* (assertive — same severity as the banner).

### Focus management
- **Context menu** now remembers the triggering element (usually the canvas) and restores focus on dismiss, so Escape-ing a right-click menu lands the user back where they started instead of on `<body>`.
- `damage-heal-dialog` exposes an optional `onAnnounce(summary)` hook so the GM entry can forward results into its announcer without coupling the dialog to the announcer module.
- Full audit of the 14 `role="dialog"` modals confirms each one already uses the `attachFocusTrap` + `rememberFocus` / `restoreFocus` primitives introduced back in Phase 17.

### CSS
- New `.sr-only` utility class (the widely-used visually-hidden recipe) — used by the announcer regions.
- New `.skip-link` visual — slides in from off-screen on focus, themed with `var(--accent)` so it works in both dark and light themes. Honours `body.reduced-motion` by disabling the transition.

### Tests
- **5 unit tests** for the announcer — region mounting, polite / assertive routing, repeat-text toggling, and `destroy()` DOM cleanup.
- **6 Playwright specs** covering: Tab-from-body reveals the skip link (both GM + Spectator), skip-link activation focuses the canvas, live regions are mounted with the right ARIA attributes, tool-switch updates the polite region, context-menu token placement announces "Token 1 placed", and canvas shows a visible focus ring when keyboard-focused.

### Implementation notes
- The announcer writes `role="status"` + `aria-atomic="true"` on both regions so partial updates aren't concatenated by the screen reader; each announce replaces the region text wholesale.
- Announcements are best-effort hints: they're safe to drop if the browser strips the live-region semantics (e.g. rarely-used engines), and they never block user actions.

---

## [0.45.0] — 2026-04-19 — Export snapshot (PNG)

### Added
- **Export Image…** entry in the session menu. Opens a new dialog with three knobs:
  - **Scope** — *Whole map* (render every grid cell at the chosen scale, independent of the current camera) or *Visible area* (capture exactly what the main canvas is showing right now — handy for zoomed-in cutouts).
  - **Fog of war** — *GM view* (translucent fog so hidden cells remain visible-but-dimmed, useful for DM handouts between sessions) or *Spectator view* (opaque fog matching what players actually see).
  - **Resolution scale** — *1×* (standard), *2×* (crisp on Retina displays), or *4×* (print-quality, large file).
- **Filename field** — sensible default (`gm-encounter-maps-YYYY-MM-DD`); the app always appends `.png`.
- **New offscreen renderer** `src/render/snapshot.ts` — paints the full visible layer stack (background, grid, tokens, AoE, fog, strokes, annotations, grid labels, scene tint) into a detached canvas at the chosen resolution, then converts to a PNG blob via `canvas.toBlob`. Live-only overlays (pings, measurement ruler, lasso, drag ghost, movement indicator, Spectator-viewport rectangle) are intentionally excluded — this is a print-quality snapshot, not a screenshot.
- **Shared pure helper** `planSnapshot()` derives the output pixel dimensions and virtual camera from scope+scale+live-camera state. Factored out of the renderer so we could unit-test the geometry in isolation (jsdom doesn't implement `getContext('2d')`, so the rendering itself is covered by Playwright).

### Tests
- **7 unit tests** for `planSnapshot()` covering both scopes, scale multiplication, live-camera override semantics, zero-/NaN-dimension guards, and the 1-pixel floor.
- **3 Playwright specs**: modal renders with all three radio groups + default values; Export PNG produces a download whose suggested filename respects the chosen stem; Cancel closes without triggering a download.
- Help overlay's *Session menu* section gets a new *Export Image…* entry so the feature is discoverable without having to click into the menu.

### Implementation notes
- The `SnapshotOptions` `mode` parameter controls only fog rendering — GM-only tokens are still filtered out when you export in Spectator mode, so an Export-Image → Spectator from the GM tab produces exactly what your players see (no leaking of hidden-cell token labels).
- Downloads flow through a transient `<a download>` element attached to `document.body`; the blob URL is revoked immediately after click so there's no long-lived memory handle.
- Errors surface as `window.alert()` with the underlying message (e.g. *"Grid has zero dimensions — nothing to export."*) rather than silently failing.

---

## [0.44.0] — 2026-04-20 — Mini-map

### Added
- **Mini-map component** (`src/ui/mini-map.ts`) — a 200×140 floating canvas pinned to the bottom-right (above the zoom controls). Renders a stylized thumbnail of the whole grid: the background image if loaded, fog of war (darkened hidden cells), every token as a colored dot with border hint, and — crucially — a yellow rectangle showing the main canvas's current viewport. Clicking anywhere inside the mini-map recenters the main camera on that world point while preserving zoom.
- **Both views** (GM + Spectator) get the mini-map. On Spectator, the fog overlay is fully opaque (matching the main canvas), and fully-hidden tokens are filtered out — so the mini-map never leaks information.
- **Notes-panel awareness** — the mini-map slides inward when the notes drawer is open, matching the existing zoom-control and `?`-button behavior.
- **New preference** `showMiniMap: boolean` (default `false`) with a Settings → Grid checkbox + explanatory hint. Persists through localStorage and cross-tab syncs (so toggling it on the GM shows it on the Spectator tab too, live).
- **Pre-0.44 behavior preserved** — mini-map is off by default; users with no configured preference see no visual change until they opt in.

### Implementation notes
- Render is fully cleared + redrawn every tick at 200×140 — cheap enough that we don't bother diffing. Redraws are rAF-throttled and subscribed to both store and camera events.
- Uses the same `viewportFromCamera` helper introduced in Phase 29 for the Spectator-viewport indicator, so the world-space math is shared.
- `setEnabled(false)` cleanly unsubscribes store + camera listeners, so leaving the mini-map off has zero ongoing cost.

### Tests
- **3 new Playwright specs**: hidden-by-default + Settings toggle reveals it; preference persists across reload + click-to-move camera stays responsive; Spectator view exposes the same mini-map surface.
- Help overlay's Zoom-controls section gets a new *Mini-map* entry pointing users at the Settings toggle and explaining the click-to-recenter behavior.

---

## [0.43.0] — 2026-04-20 — Grid labels + scene lighting

### Added
- **Optional grid labels.** New *Show coordinate labels* checkbox in Settings → Grid renders chess-style column letters (A, B, …, Z, AA, AB, …) along the top gutter and row numbers (1, 2, …) along the left gutter. Great for saying "the trap is at D6" during play. Labels auto-skip every Nth slot at low zoom so they never overlap.
- **Scene lighting tint.** New *Scene lighting* subgroup on Settings → Appearance with a color picker and a 0–100% darkness slider. Multiplies a semi-transparent overlay over the whole canvas — perfect for "the cave is dim," "it's midnight," or "the temple glows red" moods without changing the underlying map art. The Spectator view honors the same preference so the mood matches both tabs.
- **Three new preferences**: `showGridLabels` (default `false`), `sceneLightColor` (default `#0a0530` — a deep indigo so the default slider tick darkens toward "moonlit"), `sceneLightOpacity` (default `0`). All persisted through the existing preferences store.

### Pure helpers
- `src/render/grid-labels.ts` — `columnLetter(n)` (1 → A, 26 → Z, 27 → AA, 702 → ZZ, 703 → AAA), `rowLabel(n)`, `cellName(col, row)`.
- `src/render/layer-grid-labels.ts` — `drawGridLabels()` and `drawSceneTint()` layer helpers. Fonts / gutter offsets scale inversely with zoom so labels read at a consistent size. Tint is clamped to `[0, 1]` and is a free no-op at `0`.

### Tests
- **8 new unit tests** cover the column-letter rollover at 26/27/52/702/703 and non-finite input handling.
- **2 new Playwright specs** verify the new Grid-tab checkbox persists across reload and that the Appearance-tab slider updates the `%` readout and persists.

---

## [0.42.0] — 2026-04-20 — Partial import

### Added
- **Import options modal.** Picking a JSON file from the session menu now opens a dialog with one checkbox per category — Background, Tokens, Fog of war, Annotations, AoE templates, Initiative, Drawings, Grid dimensions — instead of blowing the current scene away. Every box defaults to checked (reproducing the pre-0.42 replace-all behavior). Unchecking a category preserves whatever is already in the current scene for that slice.
- **Auto-coupled Fog + Grid.** Because the fog Uint8Array is keyed by grid dimensions, importing Fog automatically imports Grid too — the Grid checkbox shows as locked + a small hint explains why.
- **Empty-category row disabling.** Categories with zero rows in the source file (e.g. an export with no AoE templates) render disabled + strikethrough so the user doesn't accidentally "import nothing."
- **Count preview** per row — "3 tokens", "12 / 600 cells revealed", "4 × 30" grid dimensions — so the user can eyeball the incoming content before committing.
- **Pure merge helper** `src/state/import-merge.ts` (`mergeImportState`, `summarizeImport`, `DEFAULT_IMPORT_SELECTION`). Non-mutating, returns a fresh `SessionState` — fog buffer is a new `Uint8Array`, tokens / annotations / strokes are deep-copied.
- **9 new unit tests** cover default-selection replace-all, all-false preserve-base, selective merges, fog-auto-pulls-grid coupling, non-mutation, and fresh-buffer invariants. Plus `summarizeImport` categorization.
- **4 new Playwright specs** covering modal rendering, "uncheck tokens to preserve local token" round-trip, disabled-checkbox state for empty categories, and the Fog+Grid coupling toggle.
- Help overlay's *Import* entry updated to describe the new dialog.

---

## [0.41.0] — 2026-04-20 — Conflict detection + crash recovery

### Added
- **GM-tab conflict detection.** Every GM tab generates a random `tabId` on load and broadcasts a `gm-heartbeat` message over the existing sync channel every 2 seconds. Any other GM tab that sees a heartbeat with a different `tabId` surfaces a persistent red status banner: *"Another GM tab is open — changes from both tabs will overwrite each other. Close the other tab, or switch to Spectator."* The banner auto-clears when the peer stops heartbeating (staleness window: 6 s).
- **Crash-recovery banner.** A one-shot boot-time banner — *"Your last session wasn't closed cleanly. It's been restored from the autosave — no action needed."* — appears when the previous session ended without running `beforeunload` (force-close, browser crash, laptop sleep, etc.). Dismiss button hides it; it does not come back unless another unclean shutdown occurs.
- **Pure helpers:**
  - `src/state/conflict-detector.ts` — `createConflictDetector({ stalenessMs })` with `noteHeartbeat`, `hasConflict(now)`, `reset`, `peers`. Pure / time-injected, so unit tests drive scenarios without real timers.
  - `src/state/dirty-flag.ts` — `consumeDirtyFlag()` (atomic read-and-set), `markDirty()` (idempotent), `markClean()` (clear-on-graceful-exit), backed by the localStorage key `gm-encounter-maps-dirty`.
- **Shared status-banners component** (`src/ui/status-banners.ts`) — one element pinned top-center, two variants (`warn` for conflict, `info` for recovery), optional Dismiss button. Conflict banner takes precedence; only one banner is visible at a time.
- **Sync protocol**: new `gm-heartbeat` `SyncMessage` with a `tabId: string` payload.

### Changed
- `beforeunload` now calls `markClean()` after flushing the persist queue, signalling a graceful shutdown for the next boot.
- Store subscribers keep the dirty flag set on every state change (idempotent after the first write).

### Tests
- **13 new unit tests** — 7 for `conflict-detector` (own-tab ignore, peer tracking, staleness window, multiple peers, reset) + 6 for `dirty-flag` (boot semantics, idempotent mark-dirty, crash lifecycle, string-coercion robustness).
- **3 new Playwright specs** in `e2e/conflict-recovery.spec.ts`:
  - Crash-recovery banner appears when the dirty flag is seeded before boot, and the Dismiss button hides it.
  - No banner on a clean load.
  - Conflict banner appears when a second GM tab is simulated via direct BroadcastChannel posts, and clears once the peer stops heartbeating.

---

## [0.40.0] — 2026-04-20 — Scenes / multiple encounters

### Added
- **Scene system.** A session can now contain many **Scenes** — each one a full snapshot of background, grid, tokens, fog, annotations, AoE templates, drawings, and initiative. Switching scenes saves the outgoing state and loads the incoming one in a single atomic swap. Undo history is per-scene (undo after a switch can't roll state back into the previous scene).
- **Scenes modal** (session menu → *Scenes…*, or the new Scene indicator). Lists every scene newest-first with a thumbnail, name, and "Updated N min ago" subtitle. Buttons per row: **Switch**, **Rename**, **Duplicate**, **Delete** (disabled when it would leave zero scenes). The "+ New scene" button prompts for a name, creates the scene, and switches to it.
- **Scene indicator** — a small clickable badge next to the "GM View" label showing `Scene: {name}` and a count pill when there's more than one scene. Clicking it opens the Scenes modal; it also keeps the current scene name visible at all times.
- **Thumbnail capture** — every scene switch grabs a 240 px-wide JPEG of the canvas before swap, stored in the scene record so the Scenes modal shows a visual preview rather than a placeholder.
- **Pure helpers** `src/state/scenes.ts`: `createScene`, `listScenes` (metadata-only projection), `getScene`, `getSceneState`, `renameScene`, `deleteScene`, `duplicateScene`, `saveScene`, `getActiveSceneId` / `setActiveSceneId` (localStorage pointer), `ensureActiveScene` (boot-time bootstrap that auto-promotes legacy Phase 39 records + auto-creates a blank scene on fresh installs), and `captureThumbnail`. **17 unit tests** cover CRUD, ordering, pointer round-trip, stale-pointer recovery, and legacy-record promotion.
- **Store**: new `store.clearHistory()` clears the undo/redo stacks — called on every scene switch.
- **IDB**: `sessions` object store now holds full `SceneRecord { id, name, state, thumbnail, createdAt, updatedAt }` rows keyed by scene id. The Phase 39 `'active'` key still works as a read-once legacy path and is deleted on first boot after the upgrade. DB_VERSION bumped to **4** (no schema change vs 3) so the idempotent `onupgradeneeded` handler re-runs for anyone whose browser reached v3 without the `sessions` store (from a partial upgrade). Added a defensive guard in `runTx` that throws a clear, actionable error when a store is unexpectedly missing — rather than an opaque `DOMException`.
- **Active-scene pointer** lives in localStorage (`gm-encounter-maps-active-scene-id`) so it's tiny and survives independently of the session blob.
- **Sync**: after a scene switch the GM broadcasts a fresh `full-state` to the Spectator so it mirrors the new scene.

### Changed
- `loadPersistedState()` now loads the **active** scene (not the singleton Phase 39 record). Fresh installs get a blank `Untitled scene` auto-created.
- `saveState()` routes through `ensureActiveScene` + `saveScene(activeId, ...)` — same fire-and-forget API as 0.39, just now scoped per scene.
- `clearPersistedState()` wipes the **active scene's** record + localStorage backup (plus the legacy Phase 39 key if it still exists). It does not delete other scenes; those are managed via the Scenes modal.
- Session-menu ordering tweaked: the new *Scenes…* button sits between *Preset Maps* and *Token Library* so scene switching is just below the map-picker.
- `persistence.test.ts` updated for the new "always have an active scene" semantics — a fresh DB + no stored state now yields a blank default scene rather than `null`.

### Tests
- **17 new unit tests** in `src/state/scenes.test.ts`.
- **5 new Playwright specs** in `e2e/scenes.spec.ts`:
  - Scene indicator + session-menu entry + modal render with the seeded scene.
  - Creating a new scene via the prompt → indicator updates + modal shows 2 rows.
  - Switching scenes swaps token state end-to-end: place token → create empty scene → token gone → switch back → token restored.
  - Rename updates both the card and the scene indicator.
  - Duplicate produces an independent `(copy)` row.

### Help overlay
- New *Scenes…* entry in the GM session-menu section explaining the per-scene isolation and how to jump back to the modal via the Scene indicator.

---

## [0.39.0] — 2026-04-20 — Session persistence → IndexedDB

### Added
- **IDB-backed session persistence.** New `sessions` object store (DB_VERSION bumped 2 → 3) now holds the serialized session state as the primary source of truth. localStorage remains as a small backup, used only when the serialized blob fits under ~4 MB. Unblocks arbitrarily large sessions (big fog grids, many tokens, rich libraries) that would previously hit the localStorage quota.
- **Three new persistence APIs** in `src/state/persistence.ts`:
  - `saveState(state)` — async; writes to IDB first, writes a localStorage backup if it fits under the 4 MB limit.
  - `saveStateSync(state)` — synchronous; localStorage-only, for `beforeunload` where IDB writes can't complete.
  - `loadPersistedState()` — async; reads from IDB first, falls back to localStorage. When LS wins (legacy pre-0.39 sessions), backfills IDB on the next `saveState` call so subsequent loads are IDB-fast.
- **Migration path** is automatic — users upgrading from 0.38 with only a localStorage blob will have their session transparently loaded and copied into IDB on the first page load. No user action required.
- **`beforeunload` fallback** — GM + Spectator entries now call `saveStateSync(store.getState())` in addition to `persist.flush()`. The flushed IDB write can't beat the unload, but the sync LS backup writes before the page dies. Next load prefers IDB, so on a clean shutdown this is a no-op.

### Changed
- `createStore()` on GM + Spectator now starts with the default state for instant first paint; `loadPersistedState()` hydrates in the background as soon as IDB resolves. Tokens/fog/etc. from the last session pop in once the async load completes (typically <50 ms).
- `saveState()` is now `Promise<void>`; existing debounced callers already use it fire-and-forget with `void`.
- `clearPersistedState()` now clears both IDB and localStorage; it's async.

### Tests
- `src/state/persistence.test.ts` expanded from 5 sync tests to **8 async tests** covering the IDB round-trip, legacy-LS migration + backfill, the `saveStateSync` LS-only path, and the oversize-state fallback (when a blob exceeds the LS quota, IDB still has it but LS is cleared rather than overwriting a stale copy).
- New Playwright spec `e2e/persistence.spec.ts` verifies the end-to-end round-trip: place a token → reload the page → the token is restored and editable.

### Notes
- Phase 40 ("Scenes — multiple encounters") will introduce per-scene keyed session records on top of this store. The `ACTIVE_SESSION_ID = 'active'` constant is already parameterized so the diff will be minor.

---

## [0.38.0] — 2026-04-20 — Freehand draw tool

### Added
- **Freehand draw tool** (`K`) — new tool on the GM toolbar. Drag anywhere on the canvas to paint a polyline. Release commits a single undoable `stroke-add` patch. A click without drag leaves a dot-shaped stroke.
- **Draw settings panel** (matches the AoE/ruler/fog panel style, shown beside the toolbar while Draw is active) with:
  - Six preset color swatches (gold / red / green / blue / white / black) plus a custom-color picker.
  - Four width buttons (2 / 4 / 6 / 10 px).
  - Shared / GM-only visibility toggle.
- **Shared vs GM-only strokes** — GM-only strokes never render on the Spectator canvas. On the GM canvas they're drawn with a subtle dashed white halo so the GM can tell at a glance which ink is hidden from players.
- **Right-click a stroke** (with Select active) → "Stroke actions" menu with "Make stroke GM-only" / "Share stroke with Spectator" toggle and "Delete stroke". Uses the new `hitTestStrokes` helper that tests against each segment with a `width/2 + slop` tolerance so thin strokes remain clickable.
- **Session menu "Clear Drawings"** — confirms and wipes every stroke in a single undoable `strokes-clear` patch.
- **Schema & sync** — new `DrawStroke` type, `SessionState.strokes[]`, four new `StatePatch` kinds (`stroke-add`, `stroke-update`, `stroke-remove`, `strokes-clear`), coalescing for mid-drag updates, and a migration in `deserializeState` that drops malformed points and clamps invalid widths/colors/visibilities. Broadcast to the Spectator via the existing patch-sync channel; no new message type needed.
- **Pure helpers** `src/state/draw.ts`: `appendStrokePoint` (distance-threshold dedupe), `hitTestStroke` / `hitTestStrokes`, `DEFAULT_STROKE_COLOR`, `DEFAULT_STROKE_WIDTH`. **13 new unit tests** cover point-appending behavior, hit-test geometry at endpoints and midpoints, single-point strokes, and empty strokes.
- **6 new Playwright specs** cover the toolbar button + `K` shortcut, the settings-panel controls, color-swatch active state, drag-to-draw-a-stroke verified via right-click, the Clear Drawings session-menu entry, and the full draw → right-click → delete round-trip.
- **Help & Shortcut overlays** updated — new "K — Draw" tool entry, a Draw tutorial entry in the Help overlay, and a Clear Drawings entry in the session-menu tutorial section.

### Notes
- Strokes are *not* selectable via the Select tool's lasso or arrow-key move in this phase — right-click remains the interaction. A future phase can promote them to first-class selectables if the need arises.

---

## [0.37.0] — 2026-04-20 — Ruler presets

### Added
- **Ruler preset panel** — while the Ruler tool is active, a new side panel (matching the AoE/fog panel style) offers six buttons: Free, 5 ft, 30 ft, 60 ft, 90 ft, 120 ft. Clicking a preset clamps the ruler endpoint to exactly that radius from the start so the GM can measure "does this enemy fit in my 30-ft thunderwave?" with one drag.
- **Preset ring** — while a preset is active, a faint dashed circle at the target radius is drawn around the drag origin on the canvas, so the valid endpoints are visually obvious even before you drag there.
- **Keyboard shortcuts** — while Ruler is active: `1`–`5` snap to the five feet presets; `0` returns to Free. Gated so the `0` binding only short-circuits camera-reset when Ruler is the active tool.
- **Ruler label** now honors the distance preferences introduced in 0.34.0: `distanceUnit` (squares / feet), `feetPerSquare`, and `diagonalRule` (chebyshev / alternating). Appends `· preset` when a clamp target is set so there's no ambiguity. The Euclidean measurement (`N sq diag`) is still shown for completeness.
- **Spectator parity** — the Spectator's Ruler tool gets the same preset panel and hotkeys, so players measuring their own ranges match what the GM sees.
- **Pure helpers** `src/state/ruler.ts`: `RULER_PRESETS`, `clampToRadius`, `feetToWorldPx`, `formatRulerLabel`. Non-mutating, safe against zero-length / non-finite inputs.
- **13 new unit tests** cover the preset catalog, clamp math (scale up + down, negative direction, zero-length no-op), feet→world-px conversion with fps fallbacks, and label formatting.
- **6 new Playwright specs** cover: panel visibility gating, default-Free active class, click-to-change preset, keyboard `1`–`5`/`0` updating active class, `0` not resetting camera while Ruler is active, switching away from Ruler preserving the preset for next time, and Spectator-view parity.

### Changed
- `drawMeasurement` now takes an options object (`diagonalRule`, `distanceUnit`, `feetPerSquare`, `targetFeet`). Defaults to the pre-0.37 behavior when no options are passed so the test-only callsites don't need changes.
- `mountRulerSettings` decoupled from `ToolManager` so it can be driven by either the GM's tool system or the Spectator's simpler `rulerActive` boolean.

---

## [0.36.0] — 2026-04-20 — Dice roller

### Added
- **Dice roller panel** — new floating 🎲 button pinned to the bottom-left (above the `?` help button, below the notes panel when it's open). Opens a focused modal with quick-pick d4/d6/d8/d10/d12/d20/d100 buttons, a monospace custom-expression input, inline parse-error feedback, and a scrolling 20-entry history with totals and per-die breakdowns.
- **Expression parser + roller** (`src/state/dice.ts`). Pure, RNG-injectable, non-mutating. Supports:
  - Basic: `1d20`, `2d6`, `1d20+5`, `2d6-2`
  - Multiple groups: `1d20+1d4+3`, `1d8-1d4`
  - Keep-highest / keep-lowest: `4d6kh3` (stat rolls), `2d20kh1` (advantage), `2d20kl1` (disadvantage)
  - Leading negative: `-1d4`
  - Whitespace and mixed case tolerated
  - Clear `DiceParseError` messages for bad input.
- **`formatRoll()`** renders a compact breakdown, e.g. `[15] +5 = 20` or `[5, 6, 4, ~2~] = 15` (tildes mark dropped dice).
- **Crit highlighting** — a kept natural 20 on a single `d20` lights up the history row green; a natural 1 goes red.
- **Sync** — new `dice-roll` `SyncMessage` with `{ source, from: 'gm' | 'spectator', total, breakdown, id }`. GM rolls show on the Spectator and vice versa, prefixed with `GM ·` or `Spectator ·` and a colored left border. Self-echo and duplicate-by-id are both filtered out.
- **Help overlay** documents the dice panel in both the GM and Spectator tutorials.
- **22 new unit tests** cover parser edge cases, deterministic rolls via seeded RNG, keep-high/low masking, negative-sign groups, and the formatter.
- **7 new Playwright specs** cover panel open/empty state, d20 quick-roll bounds, custom expression + Enter commit, inline error on malformed input, Clear history, Escape close, and the Spectator-view dice button.

### Notes
- Rolls do not persist across page reloads — history is intentionally session-local so it doesn't balloon IDB or leak into exports.

---

## [0.35.0] — 2026-04-20 — Token stacking affordance

### Added
- **Stack-count badge** — whenever two or more tokens share an origin cell, a small gold-bordered dark badge with the stack size (e.g. "3") is rendered in the top-right corner of the top token. Respects fog of war on the Spectator view (hidden cells don't leak a stack count) and follows drag overlays in real time so dragging one token onto another updates the badge mid-drag.
- **Alt+click on the Select tool** cycles selection down through a stacked cell — top → middle → bottom → wraps back to top — without starting a drag. Makes digging through a pile of minis keyboard-free.
- **Right-click "Stack here"** — when the clicked cell holds two or more tokens, the context menu prefixes its token actions with a `Stack here (N):` label followed by one entry per token (top-most first; the currently-hit one is marked `→ (current)`). Clicking an entry selects that specific token so subsequent actions (Edit, Damage/Heal, Duplicate, etc.) target it.
- **Pure helpers** `src/state/token-stack.ts` — `stackKey`, `groupTokensByStack`, `tokensInStackAt`, `cycleStackSelection`. **13 new unit tests** cover grouping, cell sharing, draw-order preservation, and stack cycling (including the wrap-around and "current id not in stack" fallback).
- **Shortcut overlay + Help overlay** updated with the Alt+click-cycle affordance.

### Notes
- Two tokens "stack" iff they share an integer `(x, y)` origin cell. Size is ignored — a size-2 that *visually overlaps* a size-1 in the next cell is not treated as a stack. This keeps grouping cheap and deterministic for the badge pass.

---

## [0.34.0] — 2026-04-20 — Movement-remaining indicator

### Added
- **Movement indicator overlay** — while the GM is dragging a token, a dashed yellow line is drawn from the origin cell center through the current pointer position, with a distance pill showing how many squares or feet have been traveled. Dashes and stroke widths scale inversely with zoom so the line stays visually consistent. The pill sits 14px off the cursor (world-space) to stay out of the way. Drags that haven't crossed a full cell don't show the label (prevents a "0 sq" flicker while arming a drag).
- **Pure distance helpers** `src/state/distance.ts` — `chebyshevDistance` (5e default), `alternatingDistance` (PHB optional 5/10 rule), `gridDistance` dispatcher, and `formatDistance` for "N sq" / "N ft" labels. **15 new unit tests** cover orthogonal, diagonal, mixed, negative, and fractional inputs plus unit formatting and non-finite fallbacks.
- **Three new preferences**: `distanceUnit` (`'squares'` | `'feet'`, default squares), `feetPerSquare` (integer 1–99, default 5), `diagonalRule` (`'chebyshev'` | `'alternating'`, default chebyshev).
- **Settings → Appearance** gains a *Distance* subgroup with radios for unit + diagonal rule and a number input for feet-per-square. All three persist through localStorage.
- **Help overlay** gets a new "Drag a token" entry explaining the indicator under Canvas interactions.
- **3 new Playwright specs**: subgroup renders + defaults correct; feet + feet-per-square persist across reload; diagonal-rule toggle persists across reload.

---

## [0.33.0] — 2026-04-20 — Token facing / rotation

### Added
- **Token schema extension**: `rotation: number` in radians, clockwise from "up" (north). Migration in `deserializeState` defaults legacy tokens to `0`.
- **Facing notch** rendered on the canvas — a small outward-pointing triangle at the token's rotation angle. Uses the token's border color when set; gold otherwise. Only drawn when `rotation !== 0` so unrotated tokens stay visually clean.
- **Token editor**: new *Facing* fieldset with a freeform degree input (0–359), a live compass readout (N / NE / E / … / NW), five quick-snap buttons (↺ 90°, ↺ 45°, ↻ 45°, ↻ 90°, and an "N" reset), and Enter-to-commit on the numeric field.
- **Keyboard shortcuts** on the GM canvas: `,` rotates the selection 45° counter-clockwise, `.` rotates 45° clockwise. `Shift+,` (`<`) and `Shift+.` (`>`) step by 90°. Every rotation snaps to the 45° grid so repeated presses from an arbitrary starting angle stay tidy.
- **Pure helpers** `src/state/token-rotation.ts` — `normalizeRotation`, `rotateBy`, `snapRotation`, `snapTo45`, `snapTo90`, `degreesToRadians` / `radiansToDegrees`, and `compass8Direction`. **15 new unit tests** covering normalization, round-trip conversion, snap behavior with non-finite input, and compass direction rounding.
- **3 new Playwright specs** covering the editor UI (field + compass + quick-snap round trip), the `, / . / < / >` canvas shortcuts, and typing a custom degree value with Enter-to-commit.
- Shortcut overlay + Help overlay updated with the new rotation surface.

### Fixed
- Token editor's `close()` now blurs any focused input/button inside the modal before hiding the backdrop. Without this, closing the editor while the rotation or HP field had focus left focus trapped on a hidden element, silently swallowing canvas keyboard shortcuts like `E` and `, / .`.

---

## [0.32.0] — 2026-04-20 — Token HP & conditions

### Added
- **Token schema extensions**: `hp: { current, max, visibility: 'gm' | 'shared' } | null` and `conditions: string[]`. Migration in `deserializeState` defaults both to safe values on legacy saves.
- **HP bar + numeric readout** rendered under the token's label, green → yellow → orange → red by fraction. GM-only HP is tagged `(GM)` on the GM view and hidden entirely from the Spectator.
- **Condition chips** — small colored dots above the token, one per active condition, with a text glyph at large cell sizes.
- **Token editor**: new *Hit points* fieldset with Track-HP toggle, Current/Max numeric inputs, and Shared/GM-only visibility radios. New *Conditions* fieldset with pill-style toggle chips for every standard D&D 5e condition (Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious) plus Concentrating and Bloodied.
- **Damage / Heal dialog** — right-click a token (or a multi-selection with HP-tracked tokens) → "Damage / Heal…" opens a focused modal. Positive = damage, negative = healing. Arrow Up/Down nudge by 1, `− Heal 5` / `+ Damage 5` quick buttons, Enter applies, Escape cancels. Applies to every HP-tracked token in the selection in a single undoable batch.
- **Pure helpers** `src/state/token-hp.ts` (`applyDamage`, `applyHealing`, `setHpCurrent`, `setHpMax`, `normalizeHp`, `hpBarColor`, `hpFraction`, `isBloodied`, `isDown`) and `src/state/conditions.ts` (`CONDITION_PRESETS`, `addCondition`, `removeCondition`, `hasCondition`, `toggleCondition`, `getConditionPreset`).
- **Help overlay** picks up a new "HP & conditions" section.
- **26 new unit tests** across `token-hp` (17) and `conditions` (9), plus **3 new e2e tests** covering the editor fields, bulk damage via the right-click dialog, and the disabled-state when no HP-tracked tokens are selected.

### Changed
- The renderer now draws status (HP + conditions) in a dedicated pass on top of labels so the bar/chips remain legible beneath selection rings and the active-turn glow.

---

## [0.31.1] — 2026-04-19

### Added
- **Quick-tutorial help overlay.** New floating circular `?` button pinned to the bottom-left of both GM and Spectator views. Opens a modal that describes every toolbar button, session-menu entry, zoom control, initiative-bar control, and canvas interaction in plain English. Content is tailored per view (Spectator omits GM-only tools). Escape / backdrop click / `×` close the modal; full focus-trap.
- 3 new Playwright e2e specs covering GM tutorial content, Spectator tutorial content, and backdrop-to-close behavior.

### Changed
- `.help-button` nudges inward when the notes panel is open so it stays in view.

---

## [0.31.0] — 2026-04-18 — Playwright e2e tests

### Added
- **Playwright test harness.** `@playwright/test` added as a dev dependency, Chromium-only project, runs against `vite preview` so base-path behavior matches GitHub Pages exactly. Trace-on-failure + screenshots on failure.
- `e2e/` directory with **13 smoke tests across 4 spec files**: landing page, GM view (canvas/toolbar/session-menu/shortcuts overlay/settings tabs/diagnostics toggles/preset maps scroll/token & template library empty states/initiative), Spectator view, and a token-placement flow (Token tool place → right-click edit → E shortcut → border-swatch radiogroup).
- `e2e/tsconfig.json` keeps e2e types separate from the app bundle.
- CI job runs e2e after the unit test + build job, caches Playwright browsers, uploads the HTML report as an artifact.

### Fixed
- `.token-editor-cycle { display: flex }` was overriding `[hidden]`, leaving the Prev/Next cycle group visible on single-selection. Added an explicit `[hidden]` rule to honor the attribute. (Caught by the new e2e suite on first run.)

---

## [0.30.0] — 2026-04-18 — Keyboard-friendly token editor

### Added
- **Cycle helper** (`src/ui/token-editor-cycle.ts`) — `tokensInSelectionOrder`, `cycleIndex`, `cycleTo` pure helpers with 12 unit tests covering wrap-around, negative deltas, unknown-id fallbacks, and filtering annotation / AoE ids from token selections.
- **X/Y/Size numeric inputs** in the token editor. Values clamp to grid bounds on commit (change / Enter / blur); editor auto-re-syncs position fields if the token is nudged externally.
- **Header counter** "Token N of M" + `‹` / `›` Prev/Next cycle buttons for multi-selection editing. Deleting mid-batch cycles to the next remaining selection instead of closing.
- **Border swatch radiogroup** — `role="radiogroup"` with `role="radio"` children, roving tabindex, Arrow keys / Home / End to navigate, Space/Enter to select, `:focus-visible` outline.
- **`E` shortcut** on GM canvas opens the editor for the first selected token.
- **`Ctrl/Cmd+←` / `Ctrl/Cmd+→`** cycle through selection while editor is open. **`Ctrl/Cmd+Enter`** closes.
- Shortcut overlay gained a "Token editor" section.

---

## [0.29.0] — 2026-04-18 — Diagnostics overlay + Spectator viewport indicator

### Added
- **Preferences**: `showDiagnostics`, `showSpectatorViewport` (both default `false`).
- **Diagnostics overlay** — floating pointer-events-none panel pinned top-right. Shows View, FPS (30-sample rolling avg), Frame time, Canvas px, Camera (x, y, ×zoom), Grid dimensions, Token/AoE/Annotation counts, Fog revealed %, and (GM only) a remote-viewport row.
- **Spectator viewport indicator** — dashed rectangle rendered on the GM canvas showing where the Spectator tab is currently looking, with stroke widths that scale inversely with zoom so the ring keeps a constant visual weight.
- New sync message `spectator-viewport` with an `rafThrottle`-d broadcaster on the Spectator, a 15-second staleness timeout on the GM, and GM `hello` so already-open Spectator tabs re-announce.
- `viewportFromCamera()` pure helper with 5 unit tests + 3 new preference tests.

### Changed
- `Renderer` now exposes `cssWidth` / `cssHeight` getters and an `onFrame(sample)` hook (only costs work when a listener is attached).

---

## [0.28.0] — 2026-04-18 — Token + Template libraries + IDB cleanup

### Added
- **Shared IDB infrastructure** (`src/state/idb.ts`) — `openDB()` + `runTx(store, mode, fn)`. DB bumped to v2, adding `tokenCatalog` and `templateCatalog` stores.
- **Token Library**: Save a token's appearance (label, color, size, border, image) for reuse. New Token Library modal with searchable card grid. "Save to Library" button in the token editor. Click a saved token to drop it at viewport center.
- **Template Library**: Save the current multi-selection as a named template, preserving relative positions. Right-click a multi-selection → "Save as template…". Template Library modal with auto-generated SVG previews.
- **IDB cleanup** — Settings → Diagnostics → "Scan and remove unused images" reports orphaned IDB images not referenced by any token / map / library entry / template, with confirm-to-delete.
- 19 new unit tests across `token-catalog`, `template-catalog`, and `idb-cleanup`.

---

## [0.27.0] — 2026-04-18 — Six new preset maps

### Added
- **Tavern**, **Sewer**, **Ship deck**, **Crossroads**, **Swamp**, **Throne room** SVG preset backgrounds added to the Preset Maps modal.
- Modal body now has `overflow-y: auto` and `max-height: 85vh` so the expanded gallery scrolls.

---

## [0.26.0] — 2026-04-18 — Initiative tracker

### Added
- Initiative schema additions to `SessionState`: `order[]`, `activeId`, `round`.
- **Initiative modal** (session-menu → Initiative) — add / remove entries, link to tokens, edit value, start / next / prev controls.
- **Initiative bar** — compact top-center strip showing round number + active combatant, with `‹` / `›` controls. Read-only on Spectator.
- **Active-turn token glow** — the token linked to the active initiative entry gets a gold ring on the canvas.
- Initiative-related sync patches + pure `sortByValue` / `advanceInitiative` / `retreatInitiative` helpers with unit tests.

---

## [0.25.0] — 2026-04-18 — Measure tool + AoE templates

### Added
- **Ruler tool** (`L`) — drag to measure distance in grid squares; overlay shows the live distance.
- **AoE tool** (`Y`) — drag to place a template. Four shapes: **sphere**, **cone**, **line**, **cube**. Per-template color and GM-only / shared visibility toggles.
- AoE-settings panel beside the toolbar when the tool is active. AoE templates are selectable, draggable, and deletable like tokens.
- `aoePlacementFromDrag` / `isAoeDragTrivial` pure helpers with unit tests.

---

## [0.24.0] — 2026-04-18 — Map annotations

### Added
- **Note tool** (`N`) — click the canvas to drop a text annotation with optional color.
- Annotations can be toggled **GM-only** vs **shared with Spectator** via the right-click menu.
- GM-only annotations render with a dashed outline; shared annotations render solid.
- Annotations are selectable / draggable / deletable alongside tokens and AoE templates.

---

## [0.23.0] — 2026-04-18 — Pings, notes panel, shortcut overlay

### Added
- **Pings** — right-click → "Ping here" broadcasts an animated ring to the Spectator.
- **Notes panel** — toggleable right-side drawer with a plain-text scratchpad persisted to localStorage.
- **Keyboard shortcut overlay** — triggered by `?`, modal cheat-sheet of every shortcut (per-view GM vs Spectator).

---

## [0.22.0] — 2026-04-18 — Alt+click stamp + batched undo

### Added
- **Alt+click** with the Token tool stamps a copy of the most-recently-placed token (label, color, image, border, size).
- **Store batching** — `store.batch(fn)` groups multiple patches into a single undo step so bulk operations (paste, delete-many, keyboard nudge-many) are single-undoable.

---

## [0.20.0 + 0.21.0] — 2026-04-18 — Multi-select lasso + context menu

### Added
- **Rubber-band lasso** — drag the Select tool over empty canvas to select tokens inside the rectangle; Shift+drag adds to the existing selection.
- **Right-click context menu** — contextual actions depending on what's under the cursor (token / annotation / AoE / empty grid), keyboard navigable with Esc to close.

---

## [0.19.0] — 2026-04-17 — Keyboard movement + drag overlay

### Added
- **Arrow keys / WASD** nudge the selected tokens one cell at a time (Shift = 5 cells).
- **Delayed drag sync via overlay** — while dragging, an in-memory `DragOverlay` renders the moving tokens without mutating state; the store only commits on pointer-up. Eliminates patch spam and keeps undo history clean.

---

## [0.18.0] — 2026-04-17 — Preset background gallery

### Added
- Four built-in preset backgrounds: **forest**, **dungeon**, **cavern**, **grassland**.
- Preset Maps modal, session-menu entry, and `resolvePresetUrl` helper.

---

## [0.17.0] — 2026-04-17 — Token clipboard

### Added
- **Ctrl+C / Ctrl+V / Ctrl+X / Ctrl+D** on token selections — copy, paste (offset by one cell), cut, duplicate-in-place. Paste keeps the selection on the new copies.

---

## [0.16.0] — 2026-04-17 — Fog panel + Spectator visibility

### Added
- Fog tool options panel (brush size) appears beside the toolbar when Reveal/Hide is active.
- **Spectator no longer renders tokens under fully-fogged cells.** The `aria-label` distinguishes "visible" vs. "total" tokens.

### Tests
- Vitest test suite (**102 tests**) + GitHub Actions CI workflow introduced in this window.

---

## [0.15.0] — 2026-04-17 — Accessibility pass

### Added
- Focus rings on all interactive controls, ARIA labels and roles across modals, focus trap for every modal, and a live aria description on the canvas element that updates with token count + fog % revealed.

---

## [0.14.0] — 2026-04-17 — Camera broadcast + follow

### Added
- GM can **broadcast** their camera to Spectator tabs (preference-gated).
- Spectator can **follow** the GM's camera (preference-gated); manual pan/zoom pauses follow for 2 seconds.

---

## [0.13.0] — 2026-04-17 — Toolbar undo/redo + zoom controls

### Added
- Undo / Redo buttons in the toolbar with disabled-when-unavailable state.
- Zoom controls (bottom-right): `+` / `−` / Fit / Reset, with keyboard parity (`+` / `-` / `F` / `0`).

---

## [0.12.0] — 2026-04-17 — Selection polish

### Added
- Selection hit-priority ordering so overlapping tokens resolve predictably.
- Per-token **border color** (with D&D team presets: Ally, Enemy, NPC, Neutral).
- **Freehand fog hover preview** shows which cells will flip before you release.
- **Colorblind markers** — optional shape badges on tokens with preset team borders.

---

## [0.11.0] — 2026-04-17 — Preferences + Settings modal

### Added
- Persistent `Preferences` store (`localStorage`) with theme (dark/light), label size, high-contrast grid, reduced-motion honoring `prefers-reduced-motion`.
- **Settings modal** with tabs: Grid, Appearance, Camera, Accessibility, Diagnostics.

---

## [0.10.0] — 2026-04-17 — Rebrand to GM Encounter Maps

### Changed
- Project renamed from "D&D Maps" to **GM Encounter Maps**.
- All storage identifiers centralized in `src/util/constants.ts` so future renames are one-line changes.

---

## [0.9.0] — 2026-04-17 — Keyboard shortcuts + undo/redo

### Added
- Full keyboard shortcut coverage for tools (`S`/`T`/`R`/`H`/`M`), camera (`+` / `-` / `F` / `0`), and Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z undo/redo.
- Store undo/redo with coalesced repeated patches.

---

## [0.8.0] — 2026-04-17 — Export / import + freehand fog

### Added
- **Export Session** — download the whole session as a JSON file (state + base64-encoded images).
- **Import Session** — load a previously exported JSON back into the app.
- Freehand fog painting (click-drag to reveal/hide cell-by-cell).

---

## [0.7.0] — 2026-04-17 — Map backgrounds

### Added
- Upload a background image; drag (Map tool) to offset; scroll wheel to scale.
- Background stored in IDB, referenced by id in session state.

---

## [0.6.0] — 2026-04-17 — IndexedDB images + token editor

### Added
- IndexedDB `images` store for binary blobs (avoids localStorage quota).
- Per-token PNG/SVG image assignment via the Token Editor modal.

---

## [0.5.0] — 2026-04-17 — Fog of war

### Added
- `Uint8Array` fog backing per session; `fog-set` patch kind.
- Reveal (`R`) and Hide (`H`) tools with rectangle drag.
- Spectator renders fully-opaque fog; GM renders semi-transparent over hidden cells so the map stays legible.

---

## [0.4.0] — 2026-04-17 — Persistence + New Session

### Added
- Debounced localStorage persistence of `SessionState`.
- "New Session" button clears all state with a confirmation prompt.

---

## [0.3.0] — 2026-04-17 — GM ↔ Spectator sync

### Added
- `BroadcastChannel` wrapper with typed `SyncMessage` union.
- GM broadcasts patches; Spectator mirrors state in real time.

---

## [0.2.0] — 2026-04-17 — State store + tokens

### Added
- Central `Store` with reducer-style `applyPatch`, subscribers, and undo/redo.
- Token rendering layer; Select + Token tools.

---

## [0.1.0] — 2026-04-17 — Canvas + grid

### Added
- HTML5 Canvas renderer, grid draw layer, and pan/zoom input via Pointer Events.

---

## [0.0.0] — 2026-04-17 — Scaffold

### Added
- Vite multi-page project scaffold with `index.html` (landing), `gm.html` (GM view), `spectator.html` (Spectator view), and TypeScript strict-mode tsconfig.

---

[Unreleased]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.56.1...HEAD
[0.56.1]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.56.0...v0.56.1
[0.56.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.55.1...v0.56.0
[0.55.1]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.55.0...v0.55.1
[0.55.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.54.0...v0.55.0
[0.54.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.53.0...v0.54.0
[0.53.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.52.0...v0.53.0
[0.52.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.51.2...v0.52.0
[0.51.2]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.51.1...v0.51.2
[0.51.1]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.51.0...v0.51.1
[0.51.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.50.0...v0.51.0
[0.50.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.49.0...v0.50.0
[0.49.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.48.0...v0.49.0
[0.48.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.47.0...v0.48.0
[0.47.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.46.0...v0.47.0
[0.46.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.45.0...v0.46.0
[0.45.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.44.0...v0.45.0
[0.44.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.43.0...v0.44.0
[0.43.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.42.0...v0.43.0
[0.42.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.41.0...v0.42.0
[0.41.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.40.0...v0.41.0
[0.40.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.39.0...v0.40.0
[0.39.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.38.0...v0.39.0
[0.38.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.37.0...v0.38.0
[0.37.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.36.0...v0.37.0
[0.36.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.35.0...v0.36.0
[0.35.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.34.0...v0.35.0
[0.34.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.33.0...v0.34.0
[0.33.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.32.0...v0.33.0
[0.32.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.31.1...v0.32.0
[0.31.1]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.31.0...v0.31.1
[0.31.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.30.0...v0.31.0
[0.30.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.29.0...v0.30.0
[0.29.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.28.0...v0.29.0
[0.28.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.27.0...v0.28.0
[0.27.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.26.0...v0.27.0
[0.26.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.25.0...v0.26.0
[0.25.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.24.0...v0.25.0
[0.24.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.23.0...v0.24.0
[0.23.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.22.0...v0.23.0
[0.22.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.21.0...v0.22.0
[0.20.0 + 0.21.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.19.0...v0.21.0
[0.19.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.18.0...v0.19.0
[0.18.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.0.0...v0.1.0
[0.0.0]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/releases/tag/v0.0.0

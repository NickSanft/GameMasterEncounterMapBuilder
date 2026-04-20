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

Planned work for the remaining phases. See the plan conversation for full scope.
- **0.35.0** — Token stacking affordance
- **0.36.0** — Dice roller
- **0.37.0** — Ruler presets
- **0.38.0** — Freehand draw tool
- **0.39.0** — Session persistence → IndexedDB
- **0.40.0** — Scenes (multiple encounters)
- **0.41.0** — Conflict detection + crash recovery
- **0.42.0** — Partial import
- **0.43.0** — Grid labels + map tint
- **0.44.0** — Mini-map
- **0.47.0** — Mobile / touch support
- **0.48.0** — PWA / service worker
- **0.49.0** — WebWorker-ize fog
- **0.50.0** — Additional e2e behavior tests
- **0.51.0** — Visual regression tests

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

[Unreleased]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.46.0...HEAD
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

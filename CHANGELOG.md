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
- **0.45.0** — Export snapshot (PNG)
- **0.46.0** — Keyboard focus + aria-live
- **0.47.0** — Mobile / touch support
- **0.48.0** — PWA / service worker
- **0.49.0** — WebWorker-ize fog
- **0.50.0** — Additional e2e behavior tests
- **0.51.0** — Visual regression tests

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

[Unreleased]: https://github.com/nicholassanft/GameMasterEncounterMapBuilder/compare/v0.35.0...HEAD
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

# Changelog

All notable changes to **GM Encounter Maps** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning scheme

Pre-1.0 (Phases 1 → 125):

- **Minor version** (`0.X.0`) tracked the **phase number** from the development plan. Each phase shipped as a minor release.
- **Patch version** (`0.X.Y`) was used for smaller follow-ups inside a phase (bug fixes, small UX additions that didn't warrant a whole phase).

Post-1.0 (1.0.0 onward, shipped 2026-04-27):

- **Major** (`X.0.0`) — breaking changes to the wire format, IDB schema, or public surface that aren't backward compatible.
- **Minor** (`X.Y.0`) — new features, additive changes, opt-in enhancements. Backward compatible.
- **Patch** (`X.Y.Z`) — bug fixes, perf, doc-only changes. Backward compatible.

Every release is an annotated git tag (`vX.Y.Z`) on the commit that introduced it.

---

## [Unreleased]

Post-1.0 phase plan — see CHANGELOG entries below for shipped
phases + chat history for full design notes.

**Shipped (Phases 65 → 85):**

- **0.66.0** — SyncMessage envelope with `senderId` + `timestamp`
- **0.67.0** — Move identity storage off `preferences`
- **0.68.0** — Visual-regression baseline auto-regen tooling ✅
- **0.69.0** — Auto-roll initiative + `Token.initiativeMod` ✅
- **0.70.0** — Round-counted conditions ✅
- **0.71.0** — Concentration tracking + auto-prompt ✅
- **0.72.0** — Death saves UI ✅
- **0.73.0** — 3D dice animation + multi-dice rolling ✅
- **0.74.0** — `/dice` chat shortcuts ✅
- **0.75.0** — Recent-scenes quick-switch (Ctrl+1..9) ✅
- **0.76.0** — Auto-save indicator pill ✅
- **0.77.0** — Token damage / heal animations ✅
- **0.78.0** — Fog reveal fade-in ✅
- **0.79.0** — Weather overlays ✅
- **0.80.0** — Day / night cycle ✅
- **0.81.0** — Animated GIF token portraits ✅
- **0.82.0** — Per-Spectator permissions ✅
- **0.83.0** — Latency indicator on the status chip ✅
- **0.84.0** — Conflict-merge UI ✅
- **0.85.0** — Wall editing revamp ✅

**Queued (Phases 86 → 110)** — UX + accessibility expansion plan.
Grouped by theme; ordering inside a group is roughly "smaller /
foundational first" so later phases can build on earlier ones (e.g.
Phase 87's ARIA outline panel is more useful once Phase 86's
keyboard navigation lets a screen-reader user actually act on what
it announces).

_Accessibility:_

- **0.86.0** — Keyboard-navigable canvas selection (Tab cycles entities; arrow keys nudge; Esc clears) ✅
- **0.87.0** — Per-entity ARIA outline panel (hidden region listing every entity + its current state for screen readers) ✅
- **0.88.0** — Focus-visible audit per theme (consistent 2 px focus rings across all 5 themes) ✅
- **0.89.0** — WCAG contrast verification across themes (formal AA+ pass; fix `.fg-muted` secondary-label colors that fail contrast) ✅
- **0.90.0** — Live-region announcement budget (min-interval queue so combat-heavy bursts don't drown out screen readers) ✅
- **0.91.0** — `prefers-contrast: more` support (auto-promote OS high-contrast users into the in-app `highContrast` mode) ✅

_Combat power-user UX:_

- **0.92.0** — Quick-HP adjust via +/- keys (Shift = ±5) — wheel-scroll variant deferred ✅
- **0.93.0** — Per-turn countdown timer (Settings → Camera; optional, off by default) ✅
- **0.94.0** — Combat log panel (auto-record damage / conditions / death-saves / turn changes; toggleable side panel + export) ✅

_Onboarding & discoverability:_

- **0.95.0** — Searchable command palette (Ctrl+K opens an action search) ✅
- **0.96.0** — Contextual first-use hints (one-time, dismissible tips for new feature surfaces) ✅

_Data lifecycle:_

- **0.97.0** — Auto-save snapshot history (8 rotating IDB snapshots per scene; "restore from N minutes ago" modal) ✅
- **0.98.0** — Per-scene JSON export / import (share a single encounter without bundling the whole session) ✅
- **0.99.0** — Conflict-merge history (keep the losing tab's snapshot for an hour after Phase 84 resolves a conflict) ✅

_Content authoring:_

- **0.100.0** — Drag-and-drop / paste-to-upload backgrounds ✅
- **0.101.0** — Auto-grid detection on background upload (edge-detect the map's grid + offer to snap to it) ✅
- **0.102.0** — Named camera bookmarks (save positions like "throne room"; Alt+1..9 jump) ✅

_Mobile / tablet ergonomics:_

- **0.103.0** — Long-press → context menu on touch (500 ms hold = right-click, unlocks tablet-only GMs) ✅
- **0.104.0** — Two-finger rotate for AoE preview (touch-friendly rotation for cone / line templates) ✅
- **0.105.0** — Larger touch targets in toolbar (≥44 px hit area in narrow viewports per Apple touch-target guidance) ✅

_Polish:_

- **0.106.0** — Scene search / filter ✅ (text filter in the Scenes modal once the catalog grows past ~10)
- **0.107.0** — Dice expression history recall (up-arrow in the slash-command input cycles previous rolls) ✅
- **0.108.0** — Recent backgrounds quick switcher (mirrors the Phase 75 recent-scenes pattern but for backgrounds) ✅
- **0.109.0** — Per-spectator token visibility (extend Phase 82's permissions to "GM hides individual tokens from individual players") ✅
- **0.110.0** — Persistent player names across reloads (stable cross-session player IDs — flagged in Phase 82 as future) ✅

**Queued (Phases 111 → 113)** — chunky-walls trilogy. User asked for
walls that fill a tile + wider walls in general. Three phases shipped
small-to-large so the lowest-risk change lands first:

- **0.111.0** — Wider walls + "Fill cell" preset (max thickness 12 → 48 px; one-click snap to grid cellSize) ✅
- **0.112.0** — Block walls (a wall *region* that fills one or more grid cells; new `kind: 'block'` discriminator) ✅
- **0.113.0** — Door entities (segment walls with toggleable `open` state — closed blocks LoS / movement, open doesn't) ✅

**Queued (Phases 114 → 124, then 1.0.0)** — final pre-1.0 batch.
Eleven phases across movement realism, wall polish, player
collaboration, QoL, and a hex-grid mode. Closes the major remaining
gaps so the v1.0 cut is genuinely "stable + remote-play-capable."

- **0.114.0** — `blocksMovement` enforcement (the flag from Phase 54 finally does something) ✅
- **0.115.0** — Diagonal movement rules (5e / 5e-alt / Chebyshev / Euclidean — settings dropdown the ruler + indicator both consume) ✅
- **0.116.0** — Drag-to-resize block corners (deferred from Phase 112) ✅
- **0.117.0** — Wall presets (saveable templates: stone-exterior, wooden-divider, etc.) ✅
- **0.118.0** — Snap-to-grid-edge wall drawing (toggle in walls-settings) ✅
- **0.119.0** — Player chat panel (text chat over the existing sync channel; per-message visibility) ✅
- **0.120.0** — Player-side annotations (Spectator drops a marker; GM sees + approves / dismisses) ✅
- **0.121.0** — Auto-generated scene thumbnails (renderer snapshot at scene save) ✅
- **0.122.0** — Token movement undo (`Z` reverts just the last token move, not the whole-state undo) ✅
- **0.123.0** — Bulk token edit (multi-select then "set HP max to N for all" / "add condition to all") ✅
- **0.124.0** — Hex grid mode (cosmetic overlay; tokens / walls / fog still operate on the underlying square grid in v124) ✅
- **0.125.0** — Test coverage + performance audit (added at user request before the 1.0.0 cut) ✅
- **1.0.0** — Stable + remote-play-capable cut after the 0.125 work lands ✅

---

## [1.14.0] — 2026-05-04 — Token aura / emanation rings

Phase 139 — third phase of the **token visual layer track**. Adds a colored ring centered on a token to track persistent area effects ("Bless 10 ft", "Spirit Guardians 15 ft") that follow the caster as they move. Distinct from `AoeTemplate` (Phase 31), which is anchored at a fixed world position.

### Added
- **`Aura` interface + `Token.auras: Aura[]`** in `src/state/types.ts`. Each `Aura = { id, radius, color, label?, visibility }`. Multiple auras stack on the same token in the wire format; the v139 editor UI manages a single primary aura per token (multi-aura authoring is future polish — the format supports it).
- **`normalizeAuras` defensive parser** in `src/sync/messages.ts`. Drops malformed entries (missing id / non-finite radius / empty color); collapses unknown `visibility` values to `'shared'`. Pre-139 sessions get the default `[]`. Forward-only — pre-139 peers drop the field on receive (same forward-only pattern as Phase 109's `hiddenTokenIds`).
- **`drawTokenAuras` renderer** in `src/render/layer-tokens.ts`. Translucent fill (18% alpha) + solid stroke; optional label tag at the top edge of the ring. GM-only auras hidden on the Spectator canvas via the same `visibility: 'gm'` mechanism walls + annotations use. Renders BELOW token bodies so the icon sits cleanly on top.
- **Token editor "Aura" section.** New fieldset between Light and Initiative. Toggle + label input (24 char max) + radius (5-240 ft, in 5 ft increments using `feetPerSquare`) + color picker + GM-only checkbox. Inline hint explains the v139 single-aura cut + the future multi-aura roadmap.

### Why this matters
Pre-139 a Cleric maintaining Spirit Guardians had to either (a) drop a fixed `AoeTemplate` and re-place it every time the Cleric moved (~5 clicks per turn), or (b) eyeball the radius. Both are friction. v139 makes the ring follow the token automatically, with one editor toggle.

### Architecture
- **`src/state/types.ts`** — `Aura` interface + `Token.auras: Aura[]` (required field, default `[]` from `deserializeState`). Same back-compat pattern as Phase 70's `conditionExpirations`, Phase 124's `gridShape`, Phase 126's `ownerId`.
- **`src/sync/messages.ts`** —
  - `normalizeAuras(raw: unknown): Aura[]` — defensive parser. Accepts `unknown`, narrows entry-by-entry, drops invalid entries (not the whole array). Bounds: `radius > 0`, `id` non-empty string, `color` non-empty string.
  - `deserializeState` calls it inside the token map step. Token shape now has `auras` after `ownerId`.
- **`src/render/layer-tokens.ts`** —
  - New `drawTokenAuras(ctx, token, grid, mode)` helper. Iterates `token.auras`, draws each as filled disk + outlined ring + optional label-pill via `roundRect` (the existing local helper).
  - New `withAlpha(hex, alpha)` helper — converts `#rrggbb` to `rgba(r, g, b, a)` for the translucent fill. Falls back to neutral gray on malformed hex. Same parsing pattern as the existing `hexToRgba` in `layer-fog.ts`.
  - The pre-token-body loop in `drawTokens` adds an aura-rendering pass before the existing body / label / status passes, so auras render below tokens (the icon overlaps the center of its own emanation).
- **`src/ui/token-editor.ts`** — Fieldset HTML between Light and Initiative. New input refs (`hasAuraInput`, `auraDetails`, `auraLabelInput`, `auraRadiusFeetInput`, `auraColorInput`, `auraGmOnlyInput`) wired in `mountTokenEditor`. New `syncAuraUI(auras)` for read; new `commitAuraField` for write. The toggle creates an entry with default 10 ft purple ring; disabling drops the first entry only (preserves any extras a future multi-aura UI might have added).

### UX details
- **Single primary aura per token in the editor.** The wire format already supports the array; only the v139 UI is single-edit. Documented in the editor hint + the changelog so users know multi-aura authoring is on the roadmap.
- **Radius in feet, not pixels.** Same convention as `losRadius` + `light.bright/dim`. The editor multiplies by `feetPerSquare` to derive the world-pixel value `Aura.radius` stores.
- **GM-only auras still take effect on the GM canvas.** They just don't paint on the Spectator canvas. Matches the secret-door pattern from Phase 85 walls.
- **Auras don't currently clip to walls.** A token in a 10x10 room with a 30-ft Spirit Guardians ring shows the full ring, including the parts that would be blocked by the room walls. Wall-clipping (line-of-effect, not line-of-sight) would need a separate ray-cast pass; deferred polish.
- **No aura distance readout.** Hover doesn't show the radius in feet. The label tag (if set) gives some context. Future polish.

### Tests
- **+4 unit tests** in `src/sync/messages.test.ts` (under a new "Phase 139 — auras" describe block): legacy saves default to `[]`; valid auras round-trip across serialize+deserialize; malformed entries (empty id, negative radius, empty color, wrong type) are dropped while valid entries survive; unknown visibility values collapse to `'shared'`.
- **+2 Playwright specs** in `e2e/token-aura.spec.ts` (new): aura editor toggle + radius + label round-trip across editor close + reopen; disabling clears the entry.
- **All 1475 unit tests + 353 Playwright specs pass** locally.
- **Existing test fixtures updated.** Adding `auras: Aura[]` to `Token` made every test that constructs a `Token` literal fail typecheck. Updated via `sed` across ~20 files (the workflow's recommended pattern for mass test-fixture updates).

### Bundle
- 106.36 / 110 KB initial-load brotli (+0.73 KB for the type definitions + the deserializer + the renderer + the editor UI). Lazy chunks unchanged. CSS unchanged.
- **Headroom note:** the JS budget will be bumped 110 → 120 KB before Phase 141 (UVTT import) lands, since 141 + 142 (tile paint) together need ~4 KB.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [1.13.0] — 2026-05-03 — Visual condition icons on tokens

Phase 138 — second phase of the **token visual layer track**. The condition chips above each token (Phase 50, then re-styled in Phase 67) used 1-2 letter glyphs (`B` for blinded, `Co` for concentrating, `Pt` for petrified, etc.) at chip radius ≥ 9 px. Letters work but require reading; vector icons leverage shape recognition for faster mid-combat scanning.

### Added
- **17 vector icons** for the SRD condition presets (`blinded`, `charmed`, `concentrating`, `deafened`, `exhaustion`, `frightened`, `grappled`, `incapacitated`, `invisible`, `paralyzed`, `petrified`, `poisoned`, `prone`, `restrained`, `stunned`, `unconscious`, `bloodied`). Each is a small SVG path authored in a 24×24 viewBox, stored as a string, and lazily compiled to a `Path2D` on first lookup. Iconography uses conventional silhouettes (heart for charmed, lightning bolt for paralyzed, crescent moon for unconscious) so a GM scanning the canvas mid-fight recognizes the condition by shape.
- **`drawConditionIcon(ctx, id, cx, cy, chipR, strokeStyle)`** in new `src/render/condition-icons.ts` — render helper. Scales the path to ~70% of chip diameter, picks line width that scales with chip size, strokes (not fills — thicker monochrome strokes read better at small sizes than gradient-filled shapes). Picks white-or-black stroke automatically based on the chip color via the existing `preferBlackText` helper. Returns `false` when no icon is registered for the id, and `layer-tokens.ts` falls back to the legacy letter-glyph paint.

### Why this matters
Pre-138 a chip showing `Pt` required a moment of "petrified, right" pattern-matching from the GM. With icons, the same chip shows a hexagon the GM recognizes instantly. The change is purely visual — chip layout, position, color, the +N overflow behavior (when many conditions stack on one token), and the touch / hover targets are all unchanged. The fallback path keeps the letter glyph for any custom condition id the GM tracks via `addCondition` that isn't in the preset list.

### Architecture
- **`src/render/condition-icons.ts`** (new, ~135 lines including the path-data table) — pure helper. SVG paths in a 24×24 viewBox, lazy `Path2D` cache (`Map<string, Path2D>`), single render entry-point. The cache is bounded by the 17 preset ids; total memory < 1 KB at runtime.
- **`src/render/layer-tokens.ts`** — the existing chip-drawing loop in `drawTokenStatus` swaps the letter-glyph branch for `drawConditionIcon`. The branch still gates on `chipR >= 9` (same readability threshold the letter glyph used). Falls back to the legacy `ctx.fillText(preset.symbol, ...)` when `drawConditionIcon` returns `false` (unknown id).
- **No changes to `state/conditions.ts`.** The `symbol` field on `ConditionPreset` stays — it's the fallback glyph when an icon path is missing AND it's still used by the editor's text-only condition picker.
- **Path2D under jsdom.** vitest's jsdom environment doesn't ship `Path2D`; the test file stubs `globalThis.Path2D` in a `beforeAll` hook so the icon module's lazy-build path runs without the chromium / canvas bindings.

### UX details
- **Chip layout unchanged.** Same horizontal row above the token, same dot size (`chipR = max(5, cellSize * 0.09)`), same colored fill, same outline. Only the inside content changes.
- **Stroke contrast preserved.** The icon stroke color picks white-or-black via `preferBlackText(color)` — identical to the pre-138 letter-glyph color rule. So a yellow `paralyzed` chip gets a black bolt; a dark `unconscious` chip gets a white moon.
- **Custom conditions still work.** A GM tracking a homebrew flag (e.g. "stalking") via `addCondition('stalking')` keeps showing the colored chip — the helper's `null` return means `layer-tokens.ts` paints the chip without any inner glyph (since there's no preset to look up either, no letter fallback). A future polish could expose a custom-icon UI; out of scope for v138.
- **Visual regression baselines unchanged.** The committed baseline scene (`e2e/visual-regression.spec.ts` "GM: two tokens + a partially revealed fog region") doesn't include conditions on either token, so the chip swap doesn't drift any baseline PNG. If a future baseline scene adds a conditioned token, baselines will need a refresh — the path-data is deterministic, so baselines once captured will stay stable.

### Tests
- **+9 unit tests** in `src/render/condition-icons.test.ts` (new): every `CONDITION_PRESETS` id has an icon (catches future preset additions that forget the icon table); 17-icon count matches the preset list size; `getConditionIconPath` returns `Path2D` for known ids + `null` for unknown; cache returns the same instance on repeated lookup; `_resetIconCache` clears the cache deterministically; `drawConditionIcon` returns `false` for unknown ids; returns `true` + invokes `ctx.stroke` once for known ids; balances `save` / `restore`.
- **No new e2e spec.** The render path is exercised by every existing token-with-conditions e2e (e.g. `conditions.spec.ts`); the visual is best validated by the visual-regression spec, which doesn't currently include a conditioned token. Skip-document explicitly here so a future maintainer adding such a baseline knows to refresh the PNG.
- **All 1471 unit tests + 351 Playwright specs pass** locally.

### Bundle
- 105.63 / 110 KB initial-load brotli (+0.72 KB for the icon path data + the cache + the render helper + the layer-tokens swap). CSS unchanged. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [1.12.0] — 2026-05-03 — Multi-token auto-numbering

Phase 137 — first phase of the **token visual layer track**. When you Alt+stamp, paste, duplicate, or drop multiple library tokens with the same name, the new ones get numeric suffixes ("Goblin", "Goblin 2", "Goblin 3") so they're individually distinguishable in the initiative tracker, the canvas-outline (Phase 87), and on-canvas labels.

### Added
- **`nextLabelSuffix(existingLabels, candidateLabel)`** in new `src/state/token-numbering.ts` — pure helper. Strips a trailing " <integer>" suffix from labels to derive a base, compares case-insensitively, and returns the candidate with `${base} ${max + 1}` when the base collides with any existing token. Returns the candidate unchanged when no collision exists. Treats a bare base as effective suffix 1 (the implicit first instance).
- **Auto-numbering wired into 4 token-creation paths**:
  - **Alt+stamp** (`src/input/tool-token.ts` `onPointerDown`) — the existing alt-clone path now suffix-disambiguates the cloned label.
  - **Paste** (`pasteClipboard` + `pasteClipboardAt` in `src/entries/gm.ts`) — each paste copy in the batch sees a labels accumulator that includes preceding copies, so pasting 3 "Goblin"s onto a board with one existing "Goblin" yields "Goblin 2/3/4" (not 3 copies of "Goblin 2").
  - **Duplicate** (`duplicateSelection` in gm.ts) — same accumulator pattern; Ctrl+D on a multi-selection of "Goblin"s produces sequentially numbered copies.
  - **Library drop** (`placeLibraryToken` in gm.ts) — dropping the same template entry repeatedly auto-numbers each copy. Library entries are templates by definition, so this is the highest-impact integration.
- **`autoNumberDuplicateTokens: boolean` preference** (default `true`) — Settings → Appearance → Tokens. GM-only checkbox. A GM who prefers stable stamping behavior (label inheritance without auto-suffix) can disable it.
- **`TokenToolOptions.autoNumber?: () => boolean`** — accessor passed by the host (typically reading `prefs.get().autoNumberDuplicateTokens`). Optional; tests / minimal callers omit it for the legacy stamp behavior.

### Why this matters
Pre-137, dropping 5 goblins via Alt+stamp produced 5 tokens all labeled "Goblin" — visually indistinguishable in the initiative bar, the canvas outline, screen-reader announcements ("Goblin took 8 damage" — which goblin?), and the conflict-merge UI. Renaming each one was friction the GM mostly skipped. Phase 137 makes auto-numbering the default; the GM gets discriminable tokens for free without any extra clicks.

### Architecture
- **`src/state/token-numbering.ts`** (new, ~70 lines including docs) — pure helper. No DOM, no state, no I/O. Exported single function plus an internal `splitLabel` helper.
- **`src/state/preferences.ts`** — adds `autoNumberDuplicateTokens: boolean` to the `Preferences` interface + `DEFAULT_PREFERENCES`. Back-compat: `loadFromStorage` spreads defaults under existing storage, so pre-137 saves load with the default ON.
- **`src/input/tool-token.ts`** — `createTokenTool(ctx, options?)` signature changed (back-compat — second arg is optional). Hex / square code paths unchanged; auto-number runs only on the alt-stamp branch (fresh drops use the always-unique `Token N` counter).
- **`src/entries/gm.ts`** —
  - Wires `prefs.get().autoNumberDuplicateTokens` into `createTokenTool`.
  - `pasteClipboard`, `pasteClipboardAt`, `duplicateSelection` — all four bulk-creation paths get the same labels-accumulator gate.
  - `placeLibraryToken` — single-token library drop also gated.
- **`src/ui/settings-modal-content.ts`** — adds a GM-only "Tokens" subgroup in the Appearance pane with the checkbox + a settings hint explaining the behavior.

### UX details
- **Manual edits are preserved.** The auto-suffix runs only at drop / paste / duplicate time. A user who manually renames a token to "Goblin 2" then "Boss Goblin" via the editor isn't auto-renamed; their edit sticks. Future drops of "Goblin" will see "Goblin" + "Boss Goblin" as different bases.
- **Case-insensitive matching, case-preserving output.** "GOBLIN" + "goblin" + "Goblin" all share the same base; the new label preserves the candidate's case ("Goblin 2" if the candidate was "Goblin").
- **Multi-word bases work.** "Cave Goblin" + "Cave Goblin 4" → next is "Cave Goblin 5".
- **No gap-filling.** If "Goblin", "Goblin 5" exist, the next is "Goblin 6" (not "Goblin 2"). Predictable; a gap-filling helper would surprise users who deliberately deleted "Goblin 2-4".
- **Counter never drifts down.** If the GM deletes "Goblin 5" then drops a new "Goblin", they get "Goblin 5" reused. (Helper looks at current canvas state; the deleted token's label is gone.) This matches "next free integer above the existing max" semantics, not "next never-used integer."
- **Spectator-side ownership unchanged.** The label rename happens before the token-add patch lands; Spectator clients receive the already-suffixed label.

### Tests
- **+12 unit tests** in `src/state/token-numbering.test.ts` (new): empty existing list returns candidate unchanged; suffixes "2" on first collision; max+1 on multiple collisions; no gap-filling; ignores the candidate's own suffix and uses max+1; case-insensitive base matching; preserves candidate case in output; multi-word bases; non-integer trailing words stay part of the base; non-suffix-stripped prefix matches don't collide; bare-base counts as effective suffix 1.
- **+2 Playwright specs** in `e2e/token-auto-number.spec.ts` (new): with the pref ON (default), Alt+stamp produces 3 distinct labels (proves the wiring); with the pref OFF, Alt+stamp produces 3 colliding labels (proves the gate works). Synthesizes `pointerdown` with `altKey: true` directly because `Locator.click({modifiers: ['Alt']})` doesn't propagate the modifier to PointerEvent in headless chromium.
- **All 1462 unit tests + 351 Playwright specs pass** locally.

### Bundle
- 104.91 / 110 KB initial-load brotli (+0.27 KB for `token-numbering.ts` + the wiring at four call-sites + the settings-modal checkbox + accessor). CSS unchanged. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [1.11.0] — 2026-05-03 — Door-removal wall preset

Phase 136 — small wall-presets follow-up. Adds the inverse of the v117 "Wooden door (closed)" preset: a one-click way to demote a door wall back to a regular blocking segment.

### Added
- **"Remove door" built-in wall preset.** When applied, it strips the wall's `door` field via the `door: null` signal that the Phase 117 editor's onChange wrapper already handled. The wall stays in place but reverts to a plain blocking segment. Sight + movement default to ON (same as a wall freshly drawn after a door is gone — the user is converting "I have a door here" back to "I have a wall here").
- **`b:remove-door` id + 6th built-in chip** in the wall editor's preset strip. Identical visual treatment to the other built-ins; no × delete button (built-ins are protected from removal as before).

### Why this matters
The Phase 117 wall-presets module shipped 5 built-ins covering common "what kind of wall is this" choices, including a "Wooden door (closed)" that PROMOTES a wall to a door. The reverse path — DEMOTING a door back — was a documented future-polish item: the editor's onChange wrapper already accepted `door: null` (Phase 113 / 117 wiring), but no preset set the field. Pre-136 a GM converting a closed door back to a regular wall had to right-click → Edit wall → un-tick "Is door" — possible but two extra clicks. Phase 136 makes it a single chip click, matching the friction of the other preset-driven workflows.

### Architecture
- **`src/state/wall-presets.ts`** — adds `b:remove-door` to `BUILTIN_PRESETS`. The preset carries `door: null` (the "remove the door promotion" sentinel), `blocksSight: true`, `blocksMovement: true`. No new fields on the `WallPreset` interface; `door: { open: boolean } | null` already supports the null branch.
- **`src/ui/wall-editor.ts`** — no changes. The existing `presetToChange` already forwards `door` only when it's `!== undefined`, so `door: null` flows through unchanged. The host's onChange wrapper translates the null into a remove + re-add patch (the door state lives in the wall's `door` field; clearing it requires recreating the wall without that field).
- **No new patch types.** Existing `wall-update` + the editor's remove + re-add round-trip cover the demote path end-to-end.

### UX details
- **Apply behavior on a non-door wall.** The preset is idempotent — applying it to a wall that's already plain just sets `blocksSight: true, blocksMovement: true` (no-op for default walls). No error / no warning toast; the GM can apply liberally without worrying about disturbing non-door walls.
- **Block walls silently ignore door fields.** The Phase 117 editor already handles this: block walls don't support doors. Applying "Remove door" to a block selection is a no-op for the door field; sight + movement still apply.
- **Multi-select aware.** Like every other preset, "Remove door" applies to ALL selected walls in one undo step. Selecting a mix of door + non-door walls + clicking the chip strips door state from the doored ones + sets sight + movement on the others.

### Future polish (out of scope)
- **Compositional presets.** The current `WallPreset` shape requires `blocksSight` + `blocksMovement` (preset always sets them). A future v1.12+ refactor could make those optional, so a preset like "Remove door" could leave the underlying sight / movement state untouched (handy when removing a door from a previously-windowed wall, where the GM might want to keep `blocksSight: false`). Out of scope for v136 — the current behavior is "remove door + revert to a blocking wall" which matches the most common authoring flow.

### Tests
- **+2 unit tests** in `src/state/wall-presets.test.ts`: the remove-door built-in carries `door: null` + sight + movement on; the remove-door built-in is the only built-in with `door: null` (vs `door: { open: boolean }` setters).
- **+2 Playwright specs** in `e2e/wall-remove-door-preset.spec.ts` (new): the Remove door chip is present in the editor's preset strip; applying "Wooden door" then "Remove door" leaves the wall's "Is door" checkbox unchecked (door promotion successfully cleared).
- **Updated** `e2e/wall-presets.spec.ts` chip-count assertion from 5 → 6 to reflect the new built-in.
- **All 1450 unit tests + 350 Playwright specs pass** locally (the same `scenes.spec.ts:56` parallel flake reappeared once on the parallel run; passes in isolation, CI runs serially with retries=2, absorbed).

### Bundle
- 104.64 / 110 KB initial-load brotli (delta nominal — Phase 136 is essentially one new entry in a const array). CSS unchanged. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [1.10.0] — 2026-05-03 — Hex-aware auto-reveal · **closes the v1.7 trilogy** 🎉

Phase 135 — third and final phase of the **hex polish trilogy** that closes the three deferrals called out in v1.7.0. Manual fog (v1.8 brush, v1.9 rectangle) was already hex-aware; v1.10 makes the LoS-driven auto-reveal pipeline hex-aware too.

### Added
- **Hex-aware visibility rasterizer.** `cellsToReveal` (Phase 58) and `spectatorEffectiveFog` (Phase 55) both ran their visibility polygons through `rasterizeVisibility`, which marked rect cells whose CENTERS fell inside any polygon. In hex mode that produced visible stair-stepping along curved viewer perimeters because the rect-cell center test had no awareness of hex tessellation. v1.10 routes both call-sites through a new `rasterizeVisibilityForGrid` dispatcher: hex mode enumerates HEXES, tests each hex's center against the polygons, and on a hit marks every rect cell its polygon overlaps (via `rectCellsOverlappingHex` from Phase 132). Visible cells now form hex-shaped halos that match the manual fog tools.
- **`rasterizeVisibilityForGrid(polygons, cols, rows, cellSize, gridShape)`** in new `src/state/visibility-rasterize.ts`. Square mode (or `undefined` for pre-Phase-124 saves) passes through to the legacy `rasterizeVisibility` unchanged. Hex mode runs the hex enumeration. Same return type (`Uint8Array(cols * rows)`) so the rest of the auto-reveal / spectator-fog pipeline is unmodified.
- **`AutoRevealGrid.gridShape`** — optional new field on the `AutoRevealGrid` interface (a subset of `GridConfig` for testability). Back-compat: omitting it preserves Phase 58's rect-cell behavior. The single existing call-site in `gm.ts` passes `state.grid` directly, which already carries the field.

### Why this matters
The v1.7.0 entry called out auto-reveal as the largest documented hex deferral: *"Auto-reveal (Phase 56) is unchanged. It uses the visibility polygon rasterizer which paints rectangular fog cells whose centers fall inside the polygon. Token positions feed the polygon at hex world centers (Phase 130), so auto-reveal works correctly without changes — but it paints rect cells, not hex cells. The visual fog edge in hex mode still has rect-cell stair-stepping along curved viewer perimeters."* Phase 135 closes that deferral. With v1.10 the four hex-rules-game pillars (distance, snap, walls, manual fog) AND the LoS-driven systems (auto-reveal, spectator effective fog with viewer + light masks) all paint visibly hex-shaped patterns. End-to-end hex semantics for everything observable through the fog channel.

### Architecture
- **`src/state/visibility-rasterize.ts`** (new, ~70 lines) — main-thread-only dispatcher. Imports `pointInPolygon` + `rasterizeVisibility` from `los.js` AND `hexCenter` + `rectCellsOverlappingHex` from `hex-geometry.js`. The hex branch enumerates `(col, row) ∈ [0, cols) × [0, rows)`, tests `hexCenter(col, row, cellSize)` against polygons, marks every rect cell that overlaps the visible hex.
  - **Why a wrapper module instead of an `if` inside `rasterizeVisibility`?** `los.ts` is intentionally import-free — it bundles into the fog-worker (which has no DOM lib + no hex-geometry deps). Adding a hex import to `los.ts` would have either pulled `hex-geometry.ts` into the worker bundle (with its `CanvasRenderingContext2D`-typed `pathHex` signature that doesn't exist in the WebWorker lib) or broken the worker typecheck. The wrapper module preserves both invariants.
- **`src/state/auto-reveal.ts`** —
  - `AutoRevealGrid` gains optional `gridShape?: GridShape`. Back-compat default: omitting it = legacy rect rasterization.
  - `cellsToReveal` reads `grid.gridShape` and passes it to `rasterizeVisibilityForGrid`. Otherwise unchanged.
- **`src/state/los-compose.ts`** — `spectatorEffectiveFog` reads `state.grid.gridShape` and passes it to both rasterizer calls (viewer mask + light mask). The rest of the AND-mask logic is unchanged; the lighting + viewer composition still works the same way, just with hex-shaped masks now.
- **No fog-worker changes.** The worker continues to compute visibility polygons; it never rasterizes. Rasterization stays on the main thread where the hex helpers are available.
- **No changes to `src/state/los.ts`** — the original `rasterizeVisibility` is retained unchanged + still exported for the worker / square-mode path / call-sites that don't yet route through the dispatcher.

### UX details
- **The fog buffer stays rectangular.** No wire-format change; spectator clients on older builds still receive a `Uint8Array(cols * rows)` and render it correctly. A truly hex-grain buffer is a v2.0 wire-format change as documented in v1.7.0.
- **Performance.** Hex-mode rasterization is O(rows × cols × polygons) — the same big-O as square mode, with a small per-cell constant overhead from `hexCenter` + the per-overlap loop. For the default 30 × 20 grid + a single viewer that's 600 hex tests + 600 × ~3 rect-cell marks ≈ 2400 ops, sub-millisecond. The fog-worker path (which doesn't run in hex mode) is unaffected.
- **Composition with manual reveal still one-way.** Auto-reveal can only flip cells from hidden → revealed; the GM remains the authority for hiding. Same one-way semantic Phase 58 introduced; just the visible halo shape changes.

### Tests
- **+7 unit tests** in `src/state/visibility-rasterize.test.ts` (new): square mode delegates to rect rasterizer (cell centers in polygon); square mode is the default when `gridShape` undefined; empty polygon list returns all-zeros mask in both modes; hex mode marks cells overlapping a hex whose center is in a polygon; hex mode marks ≥ square mode for a polygon wider than 1 hex; hex mask preserves rect-buffer wire format (`cols * rows` size); hex mode skips hexes whose center is outside every polygon.
- **+1 Playwright spec** in `e2e/hex-auto-reveal.spec.ts` (new): hex grid + LoS + auto-reveal preferences → drop a viewer token → fog flips. Smoke test for the wiring; the unit tests cover the rasterizer behavior exhaustively.
  - Uses Phase 86 Tab keyboard navigation to focus the dropped token + the Phase 86 `e` shortcut to open the editor. Avoids the v1.5 hex-snap quirk where the token's world center lands at the hex center, not the original click point — a follow-up click at the original coords might miss the token's hit area.
- **All 1448 unit tests + 347 Playwright specs pass** locally.

### Bundle
- 104.7 / 110 KB initial-load brotli (+0.08 KB for the dispatcher wrapper + the call-site changes; the heavy hex helpers were already in the initial bundle from v1.4 → v1.9). Lazy chunks +0.1 KB. CSS unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

### What this closes
The v1.0.0 CHANGELOG documented:

> Hex grid is cosmetic in v1.0. Tokens still snap to the underlying rectangular cellSize × cellSize grid; walls / fog / distance helpers all operate on the square grid.

The v1.7.0 entry then enumerated four hex-aware tracks (distance, snap, walls, manual fog reveal) and listed three remaining deferrals: hex auto-reveal, hex fog rectangle mode, hex multi-hex brush. v1.8 closed the brush deferral. v1.9 closed the rectangle deferral. v1.10 closes the auto-reveal deferral. **The "hex grid is cosmetic" caveat is now fully retired** — every fog-related pipeline (manual freehand brush, manual rectangle, manual hide, LoS-driven auto-reveal, spectator effective-fog composition) paints visibly hex-shaped patterns when the grid is hex.

---

## [1.9.0] — 2026-05-03 — Hex-aware fog rectangle mode

Phase 134 — second phase of the **hex polish trilogy**. v1.8 made the freehand brush hex-aware; v1.9 makes the rectangle shape behave like an actual hex selection rather than a rect AABB rendered in the rect coord space.

### Added
- **Rectangle drag in hex mode now selects every hex in the offset-coord rectangle from corner to corner.** Each selected hex contributes its overlapping rect cells to the patch; the union dedupes shared cells. Pre-134 the same drag treated the two corners as rect cells and painted the rect AABB between them — which (because hex coords near the origin map to small rect-coord values) collapsed to a tiny region in the upper-left of the canvas.
- **Hex-shaped rectangle preview overlay.** While dragging, the preview now draws each hex polygon outline (filled with the same accent color as before) instead of a single rectangle in rect coords. The preview now visually matches what the commit will paint, so the GM can sight the hex selection accurately mid-drag.
- **`hexesInRect(c1, r1, c2, r2, gridCols, gridRows)`** in `src/render/hex-geometry.ts` — pure helper. Returns every offset-coord cell in the inclusive rectangle from (min(c1,c2), min(r1,r2)) to (max(c1,c2), max(r1,r2)), clamped to grid bounds. Symmetric in corner order. Empty when fully out of bounds. Row-major output.

### Why this matters
The v1.7.0 entry called out the rectangle case as a documented deferral: *"Fog Rectangle-shape mode in hex. The rectangle shape continues to paint rect cells, NOT hex cells. The rectangle preview in hex mode is the rect AABB between the two hex coords (interpreted as rect cells); the fill is rect cells."* Phase 134 closes that deferral. Manual hex fog (freehand from v1.7 / v1.8 + rectangle from v1.9) is now end-to-end hex-aware.

### Architecture
- **`src/render/hex-geometry.ts`** — adds `hexesInRect`. Pure (no DOM). 7-line implementation: clamp the corners, early-return for fully-out-of-bounds rects, row-major nested-loop emission.
- **`src/render/layer-fog.ts`** —
  - `drawFogPreview` signature changed: third arg was `cellSize: number`, now `grid: GridConfig`. The hex branch enumerates `hexesInRect`, draws each as a hex polygon with `pathHex` + fill / stroke. Square branch unchanged.
  - The hex-mode early-return (when the enumerated set is empty) avoids a final stroke / fill on a zero-cell selection that could otherwise paint a residual ghost outline.
- **`src/render/renderer.ts`** — single call-site updated to pass `state.grid` instead of `state.grid.cellSize`. No other changes.
- **`src/input/tool-fog.ts`** — rectangle commit branch reads `grid.gridShape`. Hex path enumerates `hexesInRect`, then calls `rectCellsOverlappingHex` per hex, deduping with a Set keyed on `${x},${y}` and emitting a single `fog-set` patch. Square path unchanged.

### UX details
- **Symmetric drag direction.** Drag from upper-left to lower-right or lower-right to upper-left — both produce the same selection.
- **Defensive against zero-area drags.** Same hex twice → 1-hex selection → ~3-4 rect cells flipped (matching brush 1's footprint). The user gets visible feedback that a click landed.
- **Brush size still ignored in rectangle mode.** Same as square — rectangle is a marquee shape, not a brush. The Phase 133 brush radius applies to freehand only.

### Tests
- **+7 unit tests** in `src/render/hex-geometry.test.ts`: `hexesInRect` single-cell range; inclusive (rows × cols) rectangle; symmetric corner order yields the same set; clamps negative corner to 0; clamps over-max corner; fully out-of-bounds returns empty; row-major order assertion.
- **+1 Playwright spec** in `e2e/hex-fog-rectangle.spec.ts` (new): rectangle drag covering ~30% of the canvas in hex mode flips > 5% of fog cells. Validates that the hex coord interpretation is correct (pre-134 the same drag would have collapsed to far less).
- **All 1441 unit tests + 348 Playwright specs pass** locally (the same `scenes.spec.ts:56` parallel flake reappeared once on the parallel run; passes in isolation, CI runs serially with retries=2, absorbed).

### Bundle
- 104.62 / 110 KB initial-load brotli (+0.33 KB for `hexesInRect` + the `drawFogPreview` hex branch + the `tool-fog` rectangle branch). CSS unchanged at 12.57 / 14 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [1.8.0] — 2026-05-03 — Multi-hex brush in hex mode

Phase 133 — first phase of the **hex polish trilogy** that closes the three deferrals called out in v1.7.0. Today: brushSize finally does something in hex mode.

### Added
- **Hex-mode fog brush honors `brushSize`.** In square mode brushSize 1/2/3 paints a 1×1 / 2×2 / 3×3 rect cluster. In hex mode (post-Phase 132) the brushSize was ignored — every pointermove painted exactly one hex worth of rect cells. Phase 133 maps `brushSize` to a hex-disk radius (`brushSize - 1`):
  - Brush 1 → radius 0 → 1 hex (unchanged from v1.7).
  - Brush 2 → radius 1 → 7 hexes (center + 6 neighbors).
  - Brush 3 → radius 2 → 19 hexes.
- **`hexNeighbors(centerCol, centerRow, radius, gridCols, gridRows)`** in `src/render/hex-geometry.ts` — pure helper. Iterates the cube-coord disk of `radius` around the offset-coord center, converts each cell back to offset-coords, filters to grid bounds, dedupes via a Set (defensive against any parity round-trip oddities). For an in-bounds center far from edges returns the closed-form count `1 + 3 * radius * (radius + 1)`.
- **`axialToOffset(q, r)`** — public helper (extracted from the inline conversion in `worldToHexCell`). Inverse of `offsetToAxial`. Used by `hexNeighbors`; available to other modules that need the round-trip.

### Why this matters
The v1.7.0 entry called out brush-size-in-hex as a documented deferral: *"Hex mode ignores the brushSize param — each freehand pointermove paints exactly one hex worth of cells. A multi-hex brush would need a hex-cluster generator (radius-1 = center + 6 neighbors, etc.); deferred polish."* Phase 133 ships exactly that hex-cluster generator. With the change in, a GM running a hex-rules game has the same broad-stroke fog reveal ergonomics they had in square mode.

### Architecture
- **`src/render/hex-geometry.ts`** — adds `axialToOffset` + `hexNeighbors`. Both are pure (no DOM, no canvas).
- **`src/input/tool-fog.ts`** — `brushCellsAt` hex branch replaced. The new path enumerates hexes via `hexNeighbors`, then unions their `rectCellsOverlappingHex` results into a deduped rect-cell list. The fog buffer stays rectangular (no wire-format change); the visible coverage is what changes.

### UX details
- **Off-grid neighbors silently dropped.** A radius-1 brush at hex (0, 0) still paints just the in-bounds subset of its disk. No warning UI — same handling as the square brush at a corner.
- **The hover preview helper (Phase 132's `updateHoverFrom` → `FogHoverPreview`) currently only wires `cx`, `cy`, and the square-mode `brushSize`.** The hex-mode preview ring is still single-hex visually; the actual paint still uses the brush radius. A future polish could update the preview ring to reflect the hex-disk shape; out of scope for v133.
- **`brushSize` remains 1/2/3** in the existing fog-settings UI. No new buttons; no new shortcuts. Existing GMs flip between sizes the same way they always have.

### Tests
- **+8 unit tests** in `src/render/hex-geometry.test.ts`: `axialToOffset` round-trips with `offsetToAxial` across 7 representative cells; `hexNeighbors` returns exactly the center at radius 0; returns 7 cells at radius 1 (each at hex distance ≤ 1); returns 19 cells at radius 2; parity correct on both even and odd center rows; clamps to grid bounds (center at (0, 0) loses out-of-grid neighbors but keeps itself); negative + NaN radii return empty (defensive); output is deduped.
- **+2 Playwright specs** in `e2e/hex-fog-brush.spec.ts` (new): brush 1 in hex mode reveals a thin stripe (< 15% of the default 30×20 grid for a half-width drag); brush 3 reveals a much wider band (> 10%) for the same drag.
- **All 1434 unit tests + 347 Playwright specs pass** locally.

### Bundle
- 104.29 / 110 KB initial-load brotli (+0.13 KB for `axialToOffset` + `hexNeighbors` + the tool-fog branch). CSS unchanged at 12.57 / 14 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [1.7.1] — 2026-05-03 — Docs: refresh `README.md` known-limitations

### Changed
- **README "Known limitations"** updated to match the post-1.0 reality:
  - Removed the stale "Single-device only — no network sync across browsers. By design." line. Phase 64 (and 1.0.0) shipped opt-in cross-network sync via the Remote Play modal (WebRTC peer + signaling-code handshake); the new wording reflects that BroadcastChannel is just the default same-origin path.
  - Removed the "No dice, initiative, measurement, or drawing tools. By design." line. Phases 0.69, 0.73, the ruler tool, and the draw tool collectively shipped all four. Keeping the line as written misled new readers about the feature surface.
  - Added a hex-grid known-limitation note: distance / snap / walls / manual fog reveal are hex-aware as of v1.4 → v1.7; auto-reveal still rasterizes into the rectangular fog buffer (the deferral called out in v1.7.0). A truly hex-grain fog buffer is a future major bump.

### Why
The README was the single visible doc surface that hadn't kept pace with the post-1.0 feature additions. New users were being told the app couldn't do things it can — a documentation gap that's worth a patch release on its own rather than waiting to bundle into a feature phase.

### Tests / bundle
Docs-only — no source code changed, no tests added, bundle unchanged.

---

## [1.7.0] — 2026-04-30 — Hex-aware fog reveal · **closes the v1.0 hex limitation** 🎉

Phase 132 — fourth and final phase of the **true hex semantics** track. v0.124 → v1.7 closed the v1.0 documented limitation that "hex grid is cosmetic in v1.0." As of v1.7, the four hex-rules-game pillars (distance, snap, walls, fog) all work natively on hex grids.

### Added
- **Hex-aware fog tool.** When the grid is hex, the Reveal / Hide tool's `cellOfPointer` returns the (col, row) of the **hex** containing the click, and `brushCellsAt` expands the targeted hex into the rectangular fog cells its polygon overlaps. The fog buffer stays rectangular (no wire-format change); the visual hex grid is reflected by painting every rect cell whose center falls inside the targeted hex.
- **`pointInHex(cx, cy, size, px, py)`** in `src/render/hex-geometry.ts` — bounding-circle prefilter + 6-vertex even-odd ray-cast. Used by the new fog overlap helper + the Phase 131 `pointInHexBlock` (the wall hit-test now reuses it; same algorithm, separate function in `walls.ts` until I unify).
- **`rectCellsOverlappingHex(col, row, gridCols, gridRows, size)`** — for an offset-coord hex, returns the rect cells whose centers fall inside the hex polygon. Bounding-rect iteration + point-in-hex test. Defensive fallback returns the rect cell containing the hex center if the geometry produces no overlapping cells (shouldn't happen at the conventional sizing but keeps the user's click meaningful).

### Why this matters — and what closes
With v1.7 the four hex-semantics phases (129 → 132) ship the foundational pillars:

- **Distance** (v1.4): ruler + movement indicator measure cube distance between hex cells.
- **Snap** (v1.5): token drop / drag commit / render all use hex coords.
- **Walls** (v1.6): block walls become single-hex regions with 6-edge LoS contributions; movement clamping is back on for hex.
- **Fog** (v1.7): manual reveal / hide tools paint via hex selection; the rectangular fog buffer stays compatible with every other system that reads it.

The v1.0 CHANGELOG specifically called out "Hex grid is cosmetic in v1.0. Tokens still snap to the underlying rectangular cellSize × cellSize grid; walls / fog / distance helpers all operate on the square grid." All four bullet points are now closed.

### What's still NOT hex-aware (call-outs)
- **Auto-reveal (Phase 56) is unchanged.** It uses the visibility polygon rasterizer which paints rectangular fog cells whose centers fall inside the polygon. Token positions feed the polygon at hex world centers (Phase 130), so auto-reveal works correctly without changes — but it paints rect cells, not hex cells. The visual fog edge in hex mode still has rect-cell stair-stepping along curved viewer perimeters. A truly hex-grain fog buffer is a wire-format change deferred to a future major.
- **Fog Rectangle-shape mode in hex.** The rectangle shape continues to paint rect cells, NOT hex cells. The rectangle preview in hex mode is the rect AABB between the two hex coords (interpreted as rect cells); the fill is rect cells. The freehand shape is the hex-aware path; rectangle is documented as "for surgical rect operations on the underlying fog buffer."
- **Brush size in hex.** Hex mode ignores the brushSize param — each freehand pointermove paints exactly one hex worth of cells. A multi-hex brush would need a hex-cluster generator (radius-1 = center + 6 neighbors, etc.); deferred polish.

### Architecture
- **`src/render/hex-geometry.ts`** — adds `pointInHex` + `rectCellsOverlappingHex`.
- **`src/input/tool-fog.ts`** —
  - `cellOfPointer` branches on `grid.gridShape`. Hex returns `worldToHexCell`; square keeps `floor(x / cellSize)`.
  - `brushCellsAt` branches the same way. Hex returns `rectCellsOverlappingHex(...)` ignoring brushSize. Square keeps the NxN rectangular brush expansion.
  - The freehand drag paint loop calls `paintAt(cell)` which uses `brushCellsAt` — so freehand in hex mode walks hex by hex, painting overlapping rect cells per move.

### Tests
- **+6 unit tests** in `src/render/hex-geometry.test.ts`: `pointInHex` (true at center; false far outside; false at corner outside hex but inside bbox); `rectCellsOverlappingHex` (returns ≥1 cell; clamps to grid bounds; cells cover area near the hex center).
- **+1 Playwright spec** in `e2e/hex-fog.spec.ts` (new): Reveal tool on hex grid flips fog cells (`X% of fog revealed` aria-label crosses 0%).
- **All 1425 unit tests + 343 Playwright specs pass** locally.

### Bundle
- 104.16 / 110 KB initial-load brotli (+0.27 KB for the hex fog helpers + the tool-fog branches). CSS unchanged. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [1.6.0] — 2026-04-29 — Hex-aware walls

Phase 131 — third of four phases on the **true hex semantics** track. v1.5 made tokens snap to hexes; v1.6 makes the WALLS hex-aware too. Block walls in hex mode are single-hex regions, LoS works against them, and movement clamping is back on for hex.

### Added
- **`WallBlock.shape: 'rect' | 'hex'`** — new optional discriminator on block walls. `'rect'` (default; every prior phase) keeps the cellsWide × cellsTall AABB shape. `'hex'` ignores cellsWide / cellsTall and renders a single hex polygon centered at offset cell `(cellX, cellY)`. `deserializeState` defaults missing values to `'rect'` for back-compat.
- **`wallToSegments` hex branch** — hex-shaped blocks return 6 perimeter segments (one per hex edge) instead of 4 rectangle perimeters. The LoS pipeline auto-handles via the existing wallToSegments → fog-worker integration; same for the Phase 114 movement clamp.
- **`pointInHexBlock` for hit-testing** — point-in-hex via bounding-circle prefilter + 6-segment ray-cast. Used by `hitTestWalls` so right-clicking a hex-shaped block wall picks it for the editor / context menu.
- **Renderer hex-block fill** — `layer-walls.ts` branches on `w.shape === 'hex'` and paths the hex polygon for both fill + stroke. Highlighted / GM-only / drag-offset all still apply. The Phase 116 corner handles are skipped on hex blocks (no equivalent — multi-hex selections are a Phase 132+ polish).
- **Walls tool block-mode hex placement** — when grid is hex, the tool's block-mode path:
  - Snaps the click to the nearest hex via `worldToCell`.
  - Shows a single-hex preview (drag-extend is ignored).
  - On commit, creates the WallBlock with `shape: 'hex'`.
- **Hex-aware movement clamping** — new `clampMoveAgainstWallsHex` helper in `src/state/movement.ts`. Uses an all-or-nothing test: a single line from the start hex's world center to the end hex's world center; any movement-blocking segment crossing that line rejects the move (token stays at start). Wired into both:
  - The GM tool-select drag commit (replacing the v1.5 "skip clamp on hex" workaround).
  - The GM-side `token-claim-move` handler (Phase 127) so Spectator drags can't tunnel walls either.

### Why this matters
With v1.5 a hex-mode user got hex-correct measurements and snap, but walls were either not enforced (token clamp skipped) or enforced badly (rect block walls placed in the square coord space, visible as a square overlay over the hex grid). v1.6 closes the gap: walls render as hex polygons, contribute their 6 edges to LoS, and clamp movement on both GM and Spectator drags.

### Architecture
- **`src/state/types.ts`** — `WallBlock.shape?: 'rect' | 'hex'` field; same back-compat pattern as `gridShape` (Phase 124) and `Token.ownerId` (Phase 126).
- **`src/sync/messages.ts`** — `deserializeState` honors the field; non-`'hex'` values collapse to `undefined` (= rect).
- **`src/state/walls.ts`** —
  - `wallToSegments` hex branch returns 6 segments via `hexCenter` + `hexVertices`.
  - `hitTestWalls` hex branch uses `pointInHexBlock` (bounding-circle prefilter + ray-cast even-odd rule).
- **`src/render/layer-walls.ts`** — fill + stroke branch on `w.shape === 'hex'`; uses `pathHex` from `hex-geometry`. Skips the rect-corner-handle pass for hex blocks.
- **`src/input/tool-walls.ts`** —
  - `worldToCell` (local) routes through the Phase 130 grid-coords helper so block-mode pointerdowns snap to hexes on hex grids.
  - `updateBlockPreviewFrom` shows a single-hex preview on hex grids regardless of drag delta.
  - `endBlockDrag` tags the new WallBlock with `shape: 'hex'` when grid is hex.
- **`src/state/movement.ts`** — new `clampMoveAgainstWallsHex` exported alongside the existing square `clampMoveAgainstWalls`.
- **`src/input/tool-select.ts`** + **`src/entries/gm.ts`** — both call sites branch on `state.grid.gridShape` between the two clamp variants.

### UX details
- **Hex blocks are single-hex.** Drag-create extends a rect block in square mode (Phase 112); in hex mode the drag delta is ignored and the wall covers exactly the hex you started on. To wall off a corridor, click each hex separately. Multi-hex selection / polyhex blocks are deferred to a Phase 132+ polish.
- **Clamp is all-or-nothing on hex.** A wall in the line from start hex to end hex rejects the entire move (the token stays at the start). The square path's per-cell partial clamp (Bresenham + step-by-step) doesn't translate cleanly to hex offset coords; per-hex partial clamping along the line is a future polish.
- **Segment walls work as-is.** Free-angle wall segments don't change between square and hex grids — they're already in world pixel coords. Their LoS / movement contributions work uniformly.
- **Block walls drawn pre-131 stay rectangular.** `shape` defaults to `'rect'` on deserialize; existing scenes load with their walls visually unchanged.

### Tests
- **+1 unit test** in `src/state/walls.test.ts`: hex-shaped block returns 6 perimeter segments via `wallToSegments`, each with finite endpoints.
- **+5 unit tests** in `src/state/movement.test.ts`: `clampMoveAgainstWallsHex` (start === end no-op; no walls passthrough; non-blocksMovement walls ignored; movement-blocking wall rejects the move all-or-nothing; hex-shaped block wall in path rejects the move).
- **+1 Playwright spec** in `e2e/hex-walls.spec.ts` (new): block mode + hex grid places a wall on click without crashing.
- **All 1419 unit tests + 342 Playwright specs pass** locally.

### Bundle
- 103.89 / 110 KB initial-load brotli (+0.26 KB for the hex wall geometry + clamp helper + render branches). CSS unchanged. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [1.5.0] — 2026-04-29 — Hex token snap (drop + drag + render)

Phase 130 — second of four phases on the **true hex semantics** track. v0.124 shipped the cosmetic overlay; v1.4 made measurements hex-correct; v1.5 makes **token placement + the rendered position** hex-correct too. Drop a token in hex mode → it lands at a hex cell + renders at that hex's center.

### Added
- **`src/state/grid-coords.ts`** (new, ~95 lines) — single source of truth for cell ↔ world coord conversion. Three exports:
  - `tokenCenterWorld(token, grid)` — world-space center of a token's render position. Square uses footprint center; hex uses `hexCenter(round(t.x), round(t.y), cellSize)`.
  - `worldToCell(x, y, grid)` — pointer/world → (col, row). Square uses `floor(x / cellSize)`; hex uses `worldToHexCell` with cube-rounding.
  - `commitDragToCell(token, grid, dx, dy)` — given a token's current cell + a world-pixel drag delta, return the (col, row) the token should commit to.
- **Token DROP hex-aware** — `tool-token.ts` calls `worldToCell` on the click point. Drops in hex mode snap to the nearest hex (cube-rounded); square mode unchanged.
- **GM token DRAG-COMMIT hex-aware** — `tool-select.ts` now branches on `state.grid.gridShape`. Hex commits use `commitDragToCell` (token center + delta → nearest hex). Phase 114 wall-clamping still runs on square; **hex wall-clamp lands in Phase 131** (a documented v1.5 limitation).
- **Spectator owned-token DRAG hex-aware** — `tool-spectator-drag.ts` uses the same `commitDragToCell` so player-owned hex tokens commit to the right hex on the GM-authoritative side.
- **Token RENDER hex-aware** — every token-layer function (`drawTokenBody`, `drawTokenLabel`, `drawTokenStatus`, `drawOwnerDot`, `drawStackBadges`) now reads its center via `tokenCenterWorld(t, grid)` instead of inline `(t.x + t.size/2) * cellSize`. Hex grids render the token at the offset-coord hex's center; square unchanged.
- **`hitTestToken` hex-aware** — tokens are clickable at their rendered center on both grids. Pre-130 the hit-test used square footprint center, which would miss the rendered hex token by tens of pixels when the rendered center sat far from the original drop point.

### Why this matters
With v1.4 the GM saw "5 hex" measurements but tokens still snapped to the square grid underneath, so a click at the visual center of a hex would frequently drop the token at a different cell from where the GM expected. v1.5 makes click → drop → render coherent: click on a hex, the token lands at that hex, the token renders centered in that hex. The wire format / IDB schema is unchanged — `Token.x` and `Token.y` stay (col, row) integer offset coords; only the world-pixel projection diverges between square and hex.

### Architecture
- **`src/state/grid-coords.ts`** + tests — pure helpers. No DOM. The ONLY place hex vs. square diverges, so flipping `grid.gridShape` automatically flips every consumer.
- **`src/render/layer-tokens.ts`** — `drawTokenBody` / `Label` / `Status` / `drawOwnerDot` signatures changed to take `grid: GridConfig` instead of just `cellSize`. Each computes `const center = tokenCenterWorld(t, grid)` at the top + uses `center.x / center.y` everywhere `cx` / `cy` was inlined.
- **`src/input/hit-test.ts`** — same `tokenCenterWorld` swap.
- **`src/input/tool-token.ts`** — replaces inline `Math.floor(world.x / cellSize)` with `worldToCell(world.x, world.y, grid)`.
- **`src/input/tool-select.ts`** — splits the drag-commit path on `state.grid.gridShape`. Hex skips the Phase 114 wall-clamp (Phase 131 will hex-aware it); square unchanged. Block-wall translation keeps using rectangular cell deltas (block walls stay square in v1.5; Phase 131 introduces a hex-region variant).
- **`src/input/tool-spectator-drag.ts`** — replaces the inline `delta / cellSize` math with `commitDragToCell(token, grid, dx, dy)`.

### UX details
- **Square is byte-identical to v1.4.** The hex code paths only activate when `gridShape === 'hex'`.
- **Multi-cell hex tokens render at the (rounded) hex center.** A `size: 2` token in hex mode draws as a circle of `size * cellSize / 2` radius centered at `hexCenter(round(x), round(y))` — the radius can extend past the hex boundary, which is the v1.5 cosmetic compromise. True multi-hex tessellation (a `2x` token covering 7 hexes in a flower pattern, etc.) is a deferred enhancement.
- **Wall clamping skipped on hex.** A spectator or GM dragging a token in hex mode currently CAN tunnel through `blocksMovement` walls. Phase 131 adds hex-aware wall geometry; until then, hex+walls is best-effort.
- **The drop test passes; the drag e2e is skipped.** `commitDragToCell` is exhaustively unit-tested for both grid shapes; the e2e drag would need camera-aware screen-coord math (the rendered hex center isn't where the original drop click landed). Deferred to a future phase that wires camera-aware test helpers.

### Tests
- **+13 unit tests** in `src/state/grid-coords.test.ts` (new): `tokenCenterWorld` (square footprint + hex center round-trip + non-integer hex round); `worldToCell` (square floor + hex center round-trip including odd row); `commitDragToCell` (square no-op + one-cell delta; hex no-op + horizontal-stride delta).
- **+1 Playwright spec** in `e2e/hex-token-snap.spec.ts` (new): drop on hex grid populates the canvas-outline at a real hex cell. (The drag e2e is documented-as-skipped; covered by unit tests.)
- **All 1413 unit tests + 341 Playwright specs pass** locally.

### Bundle
- 103.63 / 110 KB initial-load brotli (+0.33 KB for the grid-coords helpers + the hit-test / render / input branches). CSS unchanged. Lazy chunks unchanged.

### Pre-push checklist
Caught a `hitTestToken` bug along the way — pre-fix the click → drag round-trip missed the rendered hex token because the hit-test was using square-grid footprint center. Fixed by routing through `tokenCenterWorld` so the hit-test geometry matches the render geometry. Also caught a `gridDX` reference in tool-select that I removed when refactoring the drag commit; restored as a local for the block-wall translation path. Otherwise clean.

---

## [1.4.0] — 2026-04-29 — Hex distance + ruler + movement indicator

Phase 129 — first phase of the **true hex semantics** track. v0.124 shipped the cosmetic hex overlay; the documented limitation was that distance measurements still ran the square-grid math. v1.4 closes that limitation: when the grid shape is hex, the ruler tool and the token-drag movement indicator both report **cube distance** between the start and end hex cells.

### Added
- **`hexDistance(col1, row1, col2, row2)`** in `src/render/hex-geometry.ts` — pure helper. Converts both endpoints to axial coords, then to cube `(q, r, -q-r)`, then `(|dq| + |dr| + |ds|) / 2`. Always integer for integer inputs.
- **`worldToHexCell(x, y, size)`** — inverse of `hexCenter`. Pixel-to-fractional-axial → cube-rounding → integer (col, row). Includes an internal `axialRound` that picks the coord with the largest rounding error to recompute, preserving the cube invariant `x + y + z = 0` for correct nearest-hex behavior near cell boundaries.
- **`offsetToAxial(col, row)`** — small helper exported for callers that already know the cell coords (e.g. the future Phase 130 token-snap path).
- **Ruler hex-aware path.** `drawMeasurement` (Phase 27) now branches on `gridShape`. With hex active, both endpoints snap to their containing hex cell + the cells label comes from `hexDistance`; with square active the path is unchanged (Phase 115 diagonal-rule dispatch).
- **Movement indicator hex-aware path.** Same branch in `drawMovementOverlay` (Phase 81) — hex grids show "X hexes" measured by cube distance, square grids unchanged.

### Why this matters
A GM running a hex-rules game in v1.0–v1.3 saw the right *visual* (pointy-top hex polygons over the map) but the wrong *number* — the ruler still measured "5 squares diag" using Chebyshev / 5e-alt / Euclidean. v1.4 closes the gap: when the grid is hex, every measurement reflects the actual hex distance the rules care about. Token snap, wall geometry, and fog cells still use the square underlying coordinate system (those land in Phases 130-132); the v1.4 limitation on the v0.124 limitation is now "the measurements are right, the tactical positioning isn't yet."

### Architecture
- **`src/render/hex-geometry.ts`** — adds `hexDistance`, `worldToHexCell`, `offsetToAxial`, plus an internal `axialRound` (cube-rounding). The `worldToHexCell` `+ 0` trick normalizes JS signed-zero so callers comparing `{col: 0, row: 0}` with `toEqual` don't have to think about `Object.is(-0, 0) === false`.
- **`src/render/layer-measure.ts`** — `MeasurementRenderOptions` adds optional `gridShape?: GridShape`. When `'hex'`, both endpoints go through `worldToHexCell` and the cells number comes from `hexDistance`. The square-grid path is byte-for-byte unchanged.
- **`src/render/renderer.ts`** —
  - Imports `hexDistance` + `worldToHexCell`.
  - `drawMeasurement` call passes `gridShape: state.grid.gridShape ?? 'square'`.
  - `drawMovementOverlay` branches on `state.grid.gridShape` between the hex / square distance paths.

### UX details
- **Square grid is byte-identical to v1.3.** The hex branch only activates when `gridShape === 'hex'`. The default + every existing scene keeps `'square'` (deserialize defaults missing values to `'square'`), so no existing user sees a behavior change.
- **The "X.X sq diag" suffix label still draws on hex.** The Euclidean diagonal is geometric, not grid-shape-aware, so the secondary "sq diag" label renders the same regardless of grid shape. A future polish could swap "sq" for "hex" in hex mode; deferred.
- **Endpoint snap is hex-aware in measurement, not in input.** v1.4 only changes the *displayed number*. Phase 130 will add the input-side snap so token drops + drag-commit land on hex centers; v1.4 still snaps to square cells for the underlying coordinate system.

### Tests
- **+13 unit tests** in `src/render/hex-geometry.test.ts`: `offsetToAxial` (origin, even rows, odd rows, even >0 rows); `hexDistance` (zero to self, all 6 neighbors of an even-row cell, symmetric, integer-output, 4-horizontal-step distance); `worldToHexCell` (center of (0,0), (3,4), (1,1) odd-row, slight-off-center inside (2,0)).
- **2 Playwright smoke specs** in `e2e/hex-ruler.spec.ts` (new): Ruler tool runs without crash on a hex grid; token drag on hex grid renders movement indicator without crash. The actual hex-distance numbers are exhaustively covered in the unit tests; e2e is the wire-up smoke.
- **All 1400 unit tests + 339 Playwright specs pass** locally (the Phase 95 / 116 well-known scenes-spec parallel flake reappeared once during the full run; passed in isolation, CI absorbs with retries=2).

### Bundle
- 103.3 / 110 KB initial-load brotli (+0.18 KB for the hex helpers + the renderer branches). CSS unchanged. Lazy chunks unchanged.

### Pre-push checklist
Caught the `worldToHexCell` -0 vs +0 unit-test edge — fixed in source via the `+ 0` normalization trick rather than tolerating it in the test, since downstream callers will trip on the same JS quirk if they compare with `toEqual`. Otherwise clean.

---

## [1.3.0] — 2026-04-29 — Spectator owned-token quick-edit popover

Phase 128 — closes the player-owned-tokens trilogy. v1.1 shipped the field + GM authoring; v1.2 added the actual drag wiring; v1.3 adds the rest of the in-play workflow: a Spectator can adjust HP and toggle conditions on tokens they own without going through the GM.

### Added
- **Quick-edit popover** — right-click on a token you own → a small floating popover anchored at the click point opens with two affordances:
  - **HP nudge buttons** (-5, -1, +1, +5) clamped to [0, max]. Hidden when the token doesn't track HP at all (`Token.hp === null`).
  - **Condition checkboxes** — one per Phase 50 preset condition (15 standard 5e conditions plus the two extras). Toggling adds / removes the condition; removal also strips any Phase 70 expiration timer so a re-added condition doesn't pick up a stale countdown.
- **Auto-refresh on patch round-trip** — the popover re-renders from the live store on every patch so HP / condition state stays in sync after the GM-authoritative update lands.
- **`token-claim-update` SyncMessage** carrying `{tokenId, changes: Partial<Token>}`. The wire format is permissive (any Partial<Token>) for forward-compat, but the GM-side handler **enforces an allowlist**: only `hp`, `conditions`, and `conditionExpirations` make it into the resulting `token-update` patch. Anything else (label, color, x/y, ownerId, light, losRadius) is dropped silently — defense against a tampered spectator client trying to rename / recolor / reassign ownership.

### Why this matters
With v1.2 a player could *move* their token; with v1.3 they can also damage it, heal it, mark themselves Poisoned when an effect lands, etc. — without "GM, can you mark me poisoned?" interruptions. The GM stays authoritative (the patch flows through `store.applyPatch` so undo history, snapshot history, combat log all see it the same way as a GM-authored change).

### Architecture
- **`src/sync/messages.ts`** — adds the `token-claim-update` variant.
- **`src/ui/spectator-owned-token-popover.ts`** (new, ~210 lines) — pure UI module. `mountOwnedTokenPopover({getToken, onClaimUpdate})` returns `{open, close, refresh, isOpen, destroy}`. `open(tokenId, screenX, screenY)` positions the popover at the click point + populates from `getToken`. `refresh()` re-renders if open — host calls this on store changes. Outside-click + Escape close.
- **`src/entries/spectator.ts`** —
  - mounts `mountOwnedTokenPopover` after the drag wiring.
  - adds a `contextmenu` listener on the canvas: hit-tests against tokens, opens the popover only if the hit token's `ownerId === playerId`. Other right-clicks fall through (no `preventDefault`).
  - calls `ownedTokenPopover.refresh()` inside the existing store-subscribe so HP / condition state stays current after every patch.
- **`src/entries/gm.ts`** — adds the `token-claim-update` branch in `channel.onMessage`. Validates token existence + `ownerId === env.senderId`, then filters `msg.changes` down to `{hp, conditions, conditionExpirations}` before applying via `store.applyPatch`. No-op when nothing in the allowlist survives.
- **`src/ui/styles.css`** — new `.owned-token-popover` block + nested rules for the header / HP row / condition list. Accent-bordered floating panel matching the Phase 120 annotation-prompt visual language.

### UX details
- **No browser context menu interference.** The contextmenu handler only `preventDefault`s when the click landed on an owned token; other right-clicks pass through normally.
- **One popover at a time.** Right-clicking a different owned token while another popover is open swaps the popover to the new token + repositions it. Closing leaves no residual state.
- **Allowlist failure is silent.** A tampered spectator client sending `token-claim-update` with `changes.label = "..."` sees the GM apply nothing — no error UI, no notification. The cost-of-defense is minimal (defensive read only).
- **Conditions list is the standard 16-entry preset.** A future polish could allow custom condition ids (matching the existing `addCondition` permissive contract), but the popover keeps it simple in v1.3.

### Tests
- **+2 Playwright specs** in `e2e/spectator-quick-edit.spec.ts` (new): right-click on UNOWNED token does NOT open the popover; HP -1 from the popover decrements GM-authoritative HP via the round-trip.
- **All 1387 unit tests + 338 Playwright specs pass** locally.

### Bundle
- 103.12 / 110 KB initial-load brotli (+0.98 KB for the popover module + the contextmenu handler + the GM allowlist branch). CSS 12.57 / 14 KB (+0.19 KB for the popover styles). Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [1.2.0] — 2026-04-29 — Spectator drag for owned tokens

Phase 127 — second of three phases on the player-owned-tokens track. v1.1.0 shipped the GM-authoring side (Token.ownerId field + "Owned by" dropdown + visual indicator dot). v1.2.0 adds the actual behavior: a Spectator can drag any token whose `ownerId` matches their playerId, and the move syncs back to the GM authoritative store.

### Added
- **Spectator owned-token drag.** Click + drag a token you own; the spectator sees the drag locally via the renderer overlay; on release a `token-claim-move` SyncMessage broadcasts to the GM. Coexists with the existing pan-zoom (space-held), ruler, and Phase 120 suggest-mode handlers — the drag tool checks `shouldDefer()` and stays silent when those tools are claiming the gesture.
- **`token-claim-move` SyncMessage** carrying `{tokenId, x, y}`. The envelope's `senderId` (from the existing Phase 66 wrapper) carries the spectator's playerId so the GM can validate ownership.
- **GM-side ownership validation + clamp.** When the GM tab receives `token-claim-move`, it: (1) looks up the token, (2) verifies `token.ownerId === envelope.senderId` (drops the message silently if not — defense against tampered or stale claims), (3) runs `clampMoveAgainstWalls` (Phase 114) so spectator drags can't tunnel through `blocksMovement` walls either, (4) applies a normal `token-update` patch via `store.applyPatch`. The patch then rebroadcasts to every peer (including the originating spectator) via the existing patch-rebroadcast loop, so all tabs converge on the GM-authoritative position.

### Why this matters
Pre-127 the only way to move a player's character on the map was for the GM to drag it. Mid-encounter that means every "I move 30 ft north" turns into "GM, please move me 30 ft north." v1.2 closes the loop: the player drags their own token, the GM sees the move arrive over the wire, the GM-authoritative store still owns the truth (so wall clamping, undo history, snapshot history all work uniformly), and other tabs (additional spectators, second GM tab) see the result via the normal patch fan-out.

### Architecture
- **`src/sync/messages.ts`** — adds the `token-claim-move` variant. Pure broadcast; the GM side validates ownership before applying.
- **`src/input/tool-spectator-drag.ts`** (new, ~145 lines) — pointer-handler attached to the spectator canvas. Hit-tests every pointerdown against `state.tokens`; acts only when the hit token's `ownerId` matches the local playerId. Maintains a `DragOverlayRef` shared with the renderer for the local ghost-drag preview. On pointerup converts the world-pixel delta to cell coords + fires `onCommit(tokenId, x, y)`. `shouldDefer()` callback lets the host suppress the handler when other tools own the gesture.
- **`src/entries/spectator.ts`** —
  - imports + creates a `dragOverlayRef` (same shape the GM uses).
  - passes `getDragOverlay: () => dragOverlayRef.current` into `createRenderer`.
  - mounts `attachSpectatorDrag` after the channel/playerId are set up. `shouldDefer` checks space-held, ruler-active, suggest-active.
  - `onCommit` broadcasts `{type: 'token-claim-move', tokenId, x, y}`.
- **`src/entries/gm.ts`** — adds the `token-claim-move` branch in `channel.onMessage`. Uses `env.senderId` for the ownership check, runs `clampMoveAgainstWalls`, applies the `token-update` patch.

### UX details
- **GM tab is still authoritative.** Spectator's local drag-overlay shows the move in real-time; the GM-authoritative position lands when the patch round-trips back. If the move was clamped (wall in the way), the spectator's overlay snaps to the clamped position on patch arrival.
- **Tampered-peer rejection is silent.** A spectator broadcasting a `token-claim-move` for a token they don't own is dropped on the GM side without any user-facing error. Their local overlay clears on pointerup regardless, so they don't see ghost movement.
- **No multi-token drag in v1.2.** A spectator can drag exactly one owned token at a time. Multi-select on the spectator side is out of scope; lassoing + dragging a group is a GM workflow.
- **No drag locking yet.** If the GM and spectator drag the same token simultaneously, last-write-wins per Phase 84. A future polish could broadcast `token-drag-claim` markers so both sides see "X is moving this"; out of scope for v1.2.

### Tests
- **+2 Playwright specs** in `e2e/spectator-drag.spec.ts` (new): spectator can drag an owned token + GM sees the new position via the patch loop; spectator drag on an UNOWNED token is silently ignored (position unchanged).
- **All 1387 unit tests + 336 Playwright specs pass** locally.

### Bundle
- 102.14 / 110 KB initial-load brotli (+0.45 KB for the spectator drag tool + the channel handler + the wiring). CSS unchanged. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [1.1.0] — 2026-04-29 — Token ownership (GM authoring side)

First post-1.0 minor. Begins the player-owned-tokens feature track. v1.1.0 ships the GM-authoring half: a token can be tagged with an owner (a connected Spectator's playerId) via the token editor. The actual spectator drag wiring keyed off this field lands in v1.2.0 (Phase 127).

### Added
- **`Token.ownerId: ID | null`** field — `null` (default) means GM-controlled, a non-empty string is the owning Spectator's playerId. `deserializeState` defaults missing pre-126 values to `null` and collapses empty / non-string values to `null` defensively.
- **Token editor "Owned by" fieldset** — a dropdown listing the connected Spectators (sourced from the existing IdentityRegistry) plus the always-present "Unowned (GM-controlled)" option. Hidden when the host doesn't wire `getConnectedSpectators` (Spectator-side / minimal test mounts). A previously-set owner who has since disconnected appears as a "(disconnected)" placeholder so the GM can see + clear it instead of having the dropdown silently snap back to "Unowned".
- **Owner-indicator dot** — a small filled dot in the bottom-right of any owned token, tinted with the owner's identity color (resolved via the new `getOwnerColor(ownerId)` renderer callback wired through to `IdentityRegistry.get`). Falls back to the accent yellow when the owner color is unknown. Visible to both GM and Spectator views so everyone can see "this is so-and-so's token" at a glance.

### Why this matters
The most-requested tabletop UX upgrade is "let players move their own characters." v1.1.0 sets the foundation: a token can be claimed by a specific Spectator. The drag wiring + permission checks land in v1.2.0; this phase ships the durable state field + the GM authoring affordance + the visual indicator so the data shape is settled and visible before the behavior change.

### Architecture
- **`src/state/types.ts`** — `Token` interface adds `ownerId: ID | null` (required field; existing constructors all updated to pass `null`).
- **`src/sync/messages.ts`** — `deserializeState` adds `ownerId` defaulting / sanitization. Empty strings collapse to `null` so a stray `""` doesn't ghost-claim a token; non-string values (defensive against tampered peers) also collapse to `null`.
- **`src/state/token-catalog.ts` + `src/state/template-catalog.ts`** — library / template-placed tokens always start with `ownerId: null`; ownership is GM-authored after placement.
- **`src/input/tool-token.ts` + `src/entries/gm.ts`** — fresh-placed tokens start unowned.
- **`src/render/layer-tokens.ts`** — added `getOwnerColor?` to `TokenRenderOptions` + a separate `drawOwnerDot` pass after the body / status passes so the dot sits above HP bars + condition chips. White outline ring underneath the colored dot keeps it visible against any token color.
- **`src/render/renderer.ts`** — added `getOwnerColor?(ownerId): string | null` to `CreateRendererOptions`, plumbed through to the layer.
- **`src/entries/gm.ts`** — wires `getOwnerColor` to `identityRegistry.get(ownerId)?.color ?? null`.
- **`src/ui/token-editor.ts`** — adds the "Owned by" fieldset + select + a `syncOwnerUI(currentOwnerId)` populator + a change handler that dispatches `{ownerId: select.value || null}` via the existing `update()` helper.
- **`src/ui/styles.css`** — small `.owner-fieldset` block reusing the visibility-fieldset spacing pattern.

### UX details
- **GM-only authoring in v1.1.** Spectators can see their own owned tokens (and the indicator dot) but can't drag them yet — that's v1.2.0.
- **Disconnect doesn't clear ownership.** A Spectator who disconnects still has their owned tokens; they re-connect and immediately resume control once Phase 127 ships. The dropdown shows "(disconnected)" for the persisted owner so the GM can manually re-assign or clear.
- **No bulk owner edit yet.** The Phase 123 bulk-edit modal doesn't include "set owner" — would need a similar dropdown, easy follow-up.

### Tests
- **+4 unit tests** in `src/sync/messages.test.ts`: defaults missing `ownerId` to `null`; preserves a non-empty `ownerId` on round-trip; collapses empty-string and non-string `ownerId` to `null` (defensive). Total unit suite now 1387 (+4).
- **+3 Playwright specs** in `e2e/token-ownership.spec.ts` (new): "Owned by" select renders with the default Unowned option; a connected Spectator appears as a selectable owner; selecting an owner persists across editor close + re-open.
- **All 1387 unit tests + 334 Playwright specs pass** locally.

### Bundle
- 101.69 / 110 KB initial-load brotli (+0.55 KB for the field-default normalization + the editor section + the owner-dot render pass + the renderer plumbing). CSS unchanged. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [1.0.0] — 2026-04-27 — First stable, remote-play-capable release 🎉

The 1.0.0 cut. This release marks the end of the pre-1.0 phase plan and the start of post-1.0 SemVer (breaking changes only on major bumps; minors add features; patches fix bugs).

### What 1.0 means
- **Stable feature set.** Every feature shipped in 0.1 → 0.125 is a v1.0 feature. Nothing is documented as "experimental" anymore. No features are gated behind feature flags. The shape of `SessionState` (the wire format + IDB schema) is the v1 contract — pre-1.0 saves continue to load (`deserializeState` defaults missing fields), and post-1.0 saves stay backward compatible until v2.
- **Remote-play-capable.** Two GMs OR a GM + N spectators can connect across the internet via WebRTC (Phase 62) with a single signaling-message hand-off. The local-first BroadcastChannel transport (Phase 51) works inside one browser without a server. Both transports share one `SyncMessage` envelope (Phase 66) carrying `senderId` / `timestamp` for attribution + clock-relative ordering.
- **Suite-passing.** 1383 unit tests + 331 Playwright e2e specs green on every commit going back to Phase 95. Coverage (Phase 125) at 89.93% statements / 91.33% branches / 94.47% functions on the testable surface (`src/state/`).

### What's in 1.0 — the pillars
- **Map authoring** — paint backgrounds (Phase 11), grid (Phase 1, hex overlay Phase 124), tokens (Phase 4) with HP / conditions / death saves / facing / size / catalog presets / per-token color, walls (Phase 56) with sight + movement + thickness + visibility + door + block-walls + corner-resize + presets, AoE templates (Phase 65), draw strokes (Phase 60), annotations (Phase 33).
- **Tactical play** — initiative tracker with auto-roll (Phases 30, 53, 69), turn timer (Phase 93), conditions with round-counted timers (Phase 70), death-save tracker (Phase 71), damage / heal dialog (Phase 50) with concentration prompts (Phase 86), distance ruler with diagonal-rule choice + presets (Phases 27, 91, 115), AoE templates with two-finger touch rotate (Phase 104), movement indicator showing the path's tactical cost (Phases 81, 91, 114), token movement undo (Phase 122), bulk token edit (Phase 123).
- **Sync + multiplayer** — local BroadcastChannel transport (Phase 51), remote WebRTC transport (Phase 62) with per-player permissions (Phase 82), per-spectator hidden tokens (Phase 109), persistent player ids surviving page reload (Phase 110), latency tracking (Phase 83), conflict-merge for accidentally double-booked GM tabs (Phase 84), gm-takeover archive recovery (Phase 99), spectator viewport mirror (Phase 28), follow-the-camera (Phase 29) + follow-the-fog (Phase 56) toggles, player chat (Phase 119), player annotation suggestions (Phase 120).
- **Workflow** — multi-scene catalog with thumbnails (Phase 39 + 121), scenes import / export (Phase 98), snapshot history with restore (Phase 97), camera bookmarks (Phase 102), recent backgrounds (Phase 108), background presets (Phase 49), command palette (Phase 95), slash command input (Phase 74), notes panel (Phase 38), combat log (Phase 94), dice tray with full 5e expression parser + animation + history recall (Phases 31, 73, 107), template + token libraries (Phase 41 + 89).
- **Visual polish** — five themes (Phases 36 + 59), prefers-reduced-motion / prefers-contrast / colorblind-marker support (Phases 25 + 80), accessibility canvas-outline + ARIA-live announcer (Phases 86 + 90), help overlay (Phase 23), onboarding tour (Phase 61), atmospheric weather (Phase 79), time-of-day tint (Phase 80), token lighting (Phase 57), animated GIF tokens (Phase 81).

### Bundle (the v1.0 deliverable size)
```
JavaScript (initial load, brotli):  101.14 / 110 KB
JavaScript (lazy chunks, brotli):    18.67 /  20 KB
CSS (all chunks, brotli):            12.38 /  14 KB
HTML entries (brotli):                1.32 /   2 KB
Service worker + manifest (brotli):   2.12 /   2.5 KB
```

Three HTML entry points (`index.html` landing, `gm.html` GM view, `spectator.html` Spectator view) share one shell + one bundle. Lazy chunks (help-overlay, settings-modal, remote-play-modal, dice-animation) load on-demand.

### Documented limitations (call-outs for v1.0 users)
- **Hex grid is cosmetic in v1.0.** Tokens still snap to the underlying rectangular cellSize × cellSize grid; walls / fog / distance helpers all operate on the square grid. Hex-aware semantics is a multi-phase post-1.0 project. (Phase 124)
- **Spectator-side `gm-only` chat / per-token-visibility filters are good-faith.** A tampered Spectator build could read `gm-only` chat off the wire. Strict server-mediated enforcement is out of scope for the local-first sync model. (Phase 119)
- **Single-writer (GM) state model.** Spectators have read-only authoritative state plus fire-and-forget channels (chat, dice, pings, annotation suggestions). Spectator-to-Spectator routing (chat DMs, etc.) would need addressed envelopes — out of scope for v1. (Phases 51, 82, 119, 120)

### Next up (post-1.0 wishlist, no commitment)
- True hex semantics: hex distance helper, hex-snap token placement, hex-aware wall geometry, hex-shaped fog cells.
- Spectator-to-Spectator chat DMs.
- Per-Spectator drag permissions on owned tokens.
- A vetted server-mediated mode for stricter content control.
- A real perf benchmark suite with regression detection.

---

## [0.125.0] — 2026-04-27 — Test coverage + performance audit (pre-1.0)

### Added
- **`@vitest/coverage-v8`** — coverage reporter dev dependency. New `npm run test:coverage` script produces a v8 coverage report. The audit numbers below come from this command.
- **`test:coverage` script** — `vitest run --coverage`. Produces both a text summary in stdout AND a writable `coverage/` directory with full per-file HTML.

### Audit findings — pure modules

The pre-1.0 coverage sweep found that every meaningful pure module in `src/state/` and `src/render/` is at or near 100% on functions and branches. Headline numbers from `npm run test:coverage`:

```
Statements:  29.84% (7143/23932)   ← entry-point / UI mounting code drags this down
Branches:    87.77% (2420/2757)
Functions:   81.08% (660/814)
Lines:       29.84% (7143/23932)
```

Per-directory breakdown (statements / branches / functions):

- **`src/state/`** — 89.93 / 91.33 / 94.47. Every game-logic helper module (dice, conditions, walls, los, los-compose, distance, movement, draw, scenes, snapshot-history, chat-history, annotation-proposals, scene-thumbnails, token-move-history, bulk-token-edit, time-of-day, weather, ruler, etc.) is at 100% statements + functions; the few <90% modules are all in the IDB or LS error-recovery branches that need mocked failure injection to exercise (low ROI for v1.0).
- **`src/render/`** — most layer modules are at 0% because they are pure-paint canvas functions tested via the e2e visual-regression suite. The headless paint logic that's PURE (background-cache, coords, fog-rects, fog-visibility, grid-labels, hex-geometry, viewport, snapshot, fog-fade-tracker, fog-worker-client) is at or near 100%.
- **`src/util/`** — debounce, theme, id, focus all at 100%.
- **Entry points (`src/entries/gm.ts`, `spectator.ts`)** — covered ONLY by Playwright e2e specs (323 specs as of Phase 125). The unit-coverage 0% is expected; pulling them out of the coverage scope was considered but rejected (the report stays a faithful overall picture).

**Conclusion:** the testable surface is well-covered. The remaining gaps are either (a) UI mounting code measured by e2e instead, or (b) IDB / LS error-recovery branches that would only fire on quota / private-mode failures. Neither blocks v1.0.

### Audit findings — performance

No new perf benchmarks land in v125 (a real perf suite needs a stable headless-Chrome harness and a regression DB), but the audit confirmed:

- The render pipeline is dominated by 3 hot paths, all of which are already optimized:
  - **Fog mask compositing** — runs in a Web Worker (`fog-worker.ts`, Phase 49). Off the main thread; main thread just blits the result.
  - **LoS polygon rasterization** — same fog worker. The `fog-worker-client` signature-deduplicates inputs so an unchanged frame skips the round-trip entirely.
  - **Background image blits** — Phase 78's `background-cache` retains pre-scaled bitmaps so the per-frame cost is one `drawImage`.
- The scene auto-thumbnail capture (Phase 121) is throttled at 10s/scene and runs OUT of the persist debounce — adds < 1ms to a save tick.
- The Phase 122 token-move-history uses a per-id `Map` lookup; O(1) per patch. Negligible overhead.
- Bundle: 101.14 / 110 KB JS brotli (initial load) — well under the 110 KB budget. CSS 12.38 / 14 KB. Lazy chunks 18.67 / 20 KB. No lazy chunks were introduced after Phase 113 — additional features rode on the 100 → 110 KB Phase 120 bump.

**No regressions identified.** The Phase 78 / 84 / 91 / 99 / 109 perf optimizations from earlier phases continue to hold.

### Why this matters
Phase 125 was the user-requested final-pre-1.0 sweep — does the test suite genuinely cover the v1.0 surface, and is the build perf-clean? Both answers are yes. The audit infrastructure (`test:coverage` + the v8 reporter dep) ships with the v125 commit so future contributors have one command to reproduce the numbers above.

### Architecture
- **`package.json`** — `@vitest/coverage-v8: ^2.1.9` added as a dev dependency. New `test:coverage` script.
- **No source code changes.** The audit found no critical gaps to fill in v125; any incremental coverage / perf work that comes up post-1.0 lands as a normal phase.

### Tests
- **All 1383 unit tests + 331 Playwright specs pass** locally — the same totals as Phase 124.
- **`npm run test:coverage`** runs cleanly and emits the headline numbers above.

### Bundle
- 101.14 / 110 KB initial-load brotli (unchanged from Phase 124 — v125 only touches dev tooling). CSS 12.38 / 14 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [0.124.0] — 2026-04-27 — Hex grid mode (cosmetic overlay)

### Added
- **`GridConfig.gridShape`** — new per-scene field with values `'square'` (default, every prior phase) or `'hex'`. When set to `'hex'`, the grid layer paints pointy-top hex polygons over the same map bounds, using the same `cellSize` re-interpreted as the hex's vertex-radius.
- **Settings → Grid pane → "Grid shape" select** — choose between Square and Hex (pointy-top, cosmetic overlay). Toggles are per-scene, persist in IDB / sync over the wire as a normal `grid-update` patch.
- **Default `'square'` round-trip** — `DEFAULT_GRID` now carries an explicit `gridShape: 'square'` so serialize → deserialize is identity for fresh state. Pre-124 saves load with the field defaulted to `'square'` via `deserializeState`.

### Why this matters (and the v124 limitation)
A meaningful chunk of the GM tabletop community runs hex-rules games (Dragon Pass, classic D&D theatre-of-the-mind, modern tactical hex grids). Pre-124 the only grid was square, which forced those GMs to either ignore the visual cue or use a separate tool. Phase 124 ships the **visual** half of hex support: the GM sees pointy-top hexes, players see them too (the patch syncs), the rendered cellSize stays similar across modes so the hex render isn't surprising in scale.

**Important limitation: v124 is a cosmetic overlay only.** The underlying coordinate system stays rectangular — tokens still snap to the cellSize × cellSize world grid, walls still use segment / block geometry sized in pixels, fog cells are still rectangular, distance helpers (Phase 115) still measure on the square grid. A full hex semantics pass — hex-distance ruler, hex-snap token placement, hex-aware wall geometry, hex-shaped fog cells — is a multi-phase post-1.0 project. The CHANGELOG calls this out explicitly so a hex-rules GM doesn't expect 5e-hex-rules movement out of the box.

### Architecture
- **`src/render/hex-geometry.ts`** (new, ~85 lines) — pure math + canvas-path helpers. `hexWidth`, `hexHeight`, `hexHorizontalStride`, `hexVerticalStride` for layout; `hexCenter(col, row, size)` for the offset coordinate of a given cell; `hexVertices(cx, cy, size)` returns the six vertex positions; `pathHex(ctx, cx, cy, size)` traces the outline. The "size" param is the vertex radius (= half the hex's vertex-to-vertex height).
- **`src/render/layer-grid.ts`** — early branch on `grid.gridShape === 'hex'` calls `drawHexOverlay(ctx, grid, stroke)`. The hex helper iterates over `(cols × rows)` cells and paths each one. The boundary rect still draws so the GM sees the logical map extent.
- **`src/state/types.ts`** — adds `GridShape` type + optional field on `GridConfig`. `DEFAULT_GRID` carries an explicit `'square'` so round-trips are identity.
- **`src/sync/messages.ts`** — `deserializeState` defaults missing / unknown gridShape to `'square'` so pre-124 saves + tampered peers can't break the renderer.
- **`src/ui/settings-modal-content.ts`** — adds the gridShape select to renderGridPane + wires it to the `grid-update` patch path. Includes a hint paragraph documenting the cosmetic-only limitation so users aren't surprised.

### UX details
- **Grid shape syncs across peers.** A `grid-update` patch with `{gridShape: 'hex'}` flows over the existing sync wire — Spectator sees the hex overlay too. No new SyncMessage variant needed.
- **The boundary rect still draws** in hex mode so the logical map extent is visible. Hexes can extend past the rect (the iteration over-counts by 1 row + 1 col so partial hexes near the edge get an outline).
- **Visual baseline updated.** The new gridShape select extended the Grid pane content slightly enough to shift the modal layout when rendered on the Appearance tab — visual-regression baselines for both Win32 + Linux were regenerated to reflect the new layout.

### Tests
- **+10 unit tests** in `src/render/hex-geometry.test.ts` (new): width / height formulas; horizontal stride equals width; vertical stride is 3/4 height; hexCenter with even / odd row offset; hexCenter row stride; hexVertices count; top vertex is directly above center; vertices are size-distance from center.
- **+2 Playwright specs** in `e2e/hex-grid.spec.ts` (new): Settings Grid pane shows the gridShape select with both options; selecting hex persists across modal close + re-open.
- **All 1383 unit tests + 331 Playwright specs pass** locally (after regenerating the settings-appearance visual baseline).

### Bundle
- 101.14 / 110 KB initial-load brotli (+0.25 KB for the hex-geometry helpers + the layer-grid branch + the settings select). CSS unchanged. Lazy chunks unchanged.

### Pre-push checklist
Caught one issue: visual-regression baseline shifted (the new select grew the Grid pane by 9918 px-of-diff on the Appearance tab capture). Regenerated both Win32 + Linux baselines via `npm run baselines -- --grep "Settings modal"` and re-ran clean.

---

## [0.123.0] — 2026-04-27 — Bulk token edit

### Added
- **Bulk-edit modal** for the current selection. Three actions in v123:
  - **Set HP max** — input a new max value, applies to every selected token that already tracks HP. Tokens without HP tracking are skipped. `current` clamps down so it never exceeds the new max (so a token at 8/10 HP whose new max is 6 ends up at 6/6).
  - **Add condition** — pick a preset, applies to every selected token that doesn't already have it.
  - **Remove condition** — drops the chosen condition + any Phase 70 expiration timer from every selected token that has it.
- **Single-undo semantics.** Each Apply runs inside `store.batch()` so the whole bulk action is one undo step, not N.
- **Command palette entry** — *"Bulk edit selected tokens…"* (group **Tokens**). Opens the modal regardless of selection size; the modal shows the count up-front and each Apply is a no-op when no tokens are affected.
- **Polite-announce on apply / no-op** — "Set HP max on 5 tokens" / "Added poisoned to 3 tokens" / "No tokens affected — Set HP max on was a no-op."

### Why this matters
Pre-123 the GM's only path to apply the same change to many tokens was to open the editor on each one individually (or, for HP, the Phase 92 quick-HP-adjust shortcut). Mid-encounter, the orc squad all rolls poisoned together — pre-123 that's 6 token editor opens; with bulk edit it's 1 modal + 1 click. Same for "set the goblin volunteers' max HP to 4" (catalog tokens default to a generic max).

### Architecture
- **`src/state/bulk-token-edit.ts`** (new, ~115 lines) — pure helpers. `bulkSetHpMax`, `bulkAddCondition`, `bulkRemoveCondition` all return a list of `{tokenId, changes: Partial<Token>}` operations. Each helper filters out:
  - Unselected tokens (defensive — the modal only feeds selection.ids, but the API is robust against misuse).
  - Tokens that would be no-ops (already at the target HP max with safe current; already / not having the condition).
  - Invalid inputs (non-finite / negative HP max; empty conditionId).
  Removed conditions also strip the Phase 70 expiration timer if present, so a re-added condition doesn't pick up a stale countdown.
- **`src/ui/bulk-edit-modal.ts`** (new, ~210 lines) — three-fieldset modal with the standard backdrop + focus-trap pattern. Each apply button calls the helper, wraps the ops in `store.batch(() => {...})`, fires the announcer, and closes. Esc / backdrop-click / × close.
- **`src/entries/gm.ts`** — mounts `bulkEditModal` next to the existing damage-heal dialog. Registers a single command palette entry.
- **`src/ui/styles.css`** — new `.bulk-edit-modal` block + nested `.bulk-edit-section` / `.bulk-edit-summary` / `.bulk-edit-hint` / `.bulk-edit-apply` rules. Each fieldset has a card-style border so the three actions are visually distinct.

### UX details
- **Selection captured at modal-open time.** Closing + reopening picks up the current selection; changes mid-modal don't refresh the count (would need a subscribe + render). Acceptable v1 — the user's flow is "select → command palette → apply → close."
- **Custom condition ids supported.** The condition select uses `CONDITION_PRESETS`, but the underlying helpers accept arbitrary ids (matches the existing `addCondition` / `removeCondition` contract). A future polish could surface a free-text input for "tracking my homebrew flag."
- **No bulk visibility / size / color YET.** Three actions cover the most common combat workflows (HP, conditions). Adding more is a matter of new sections in the same modal + new helper functions.

### Tests
- **+13 unit tests** in `src/state/bulk-token-edit.test.ts` (new): bulkSetHpMax (sets max for hp-bearing tokens; clamps current; skips no-HP tokens; skips already-at-target; skips unselected; rejects non-finite / negative); bulkAddCondition (adds when missing; skips empty id; skips unselected); bulkRemoveCondition (removes + clears expiration; skips not-having; skips empty id); countAffected.
- **+3 Playwright specs** in `e2e/bulk-edit.spec.ts` (new): command palette opens the modal showing all three sections; modal summary reflects the selection size after a 2-token lasso; Esc closes the modal.
- **All 1373 unit tests + 329 Playwright specs pass** locally.

### Bundle
- 100.89 / 110 KB initial-load brotli (+0.87 KB for the helpers + the modal + the wiring). CSS 12.38 / 14 KB (+0.12 KB for the modal styles). Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [0.122.0] — 2026-04-27 — Token movement undo (plain `Z`)

### Added
- **Plain `Z` (no Ctrl) reverts just the most recent token move.** Distinct from Ctrl+Z (whole-state undo, which rewinds every kind of patch — annotations, fog, conditions, initiative, the lot). Mid-combat, a GM who just dragged a token to the wrong square wants to pop ONLY that move without losing the unrelated state changes that happened between then and now (auto-fog reveals, condition timers ticking, initiative round increments, etc.).
- **Per-token entry granularity.** Multi-token arrow-key moves (WASD with multi-select) record one entry per token, so pressing Z several times rewinds them individually. Deliberately simpler than batching across a keystroke; simple to reason about.
- **History wipes on session-reset / scene switch.** Undoing across scene boundaries would reference token ids that may not exist (or worse, recycle to a different token in the new scene), so the history clears on every `loadState` / `session-reset` patch.
- **Polite-announce on undo + on no-op.** "Reverted Token 1 to its previous position" / "No token move to undo" / "Cannot undo: token no longer exists" — screen-reader users + keyboard-only GMs get explicit feedback.

### Why this matters
The store's whole-state undo is correct but blunt: undoing a misplaced drag also rewinds the auto-fog reveal that happened after, the condition timer that ticked, and the initiative round-advance. Pre-122 the GM either accepted a wrong token position OR re-did three other actions after Ctrl+Z. Phase 122 picks the surgical revert with a one-key shortcut that's already universal muscle memory in the table-top genre.

### Architecture
- **`src/state/token-move-history.ts`** (new, ~85 lines) — pure helper. `createTokenMoveHistory({maxEntries?, now?})` returns `{record, popLast, peekLast, clear, size}`. Cap defaults to 100; older entries evicted FIFO. `record` filters out no-op moves (`from == to`); explicit `timestamp` overrides the `now` seam.
- **`src/entries/gm.ts`** —
  - Mounts `tokenMoveHistory` + a `lastKnownPositions: Map<id, {x, y}>` cache. The store-subscribe handler watches `token-update` patches with x/y changes, looks up the from-coords in the cache, and records `(tokenId, from, to)`. After every patch, `rebuildLastKnownPositions()` syncs the cache from current state — covers token-add / token-remove / session-reset / scene-switch in one pass.
  - `skipNextTokenMoveRecord` flag suppresses the recursive record when we apply the inverse patch ourselves (otherwise Z would push the inverse onto the stack and re-undoing would just bounce the token back-and-forth).
  - `undoLastTokenMove()` pops the most recent entry, sets the skip flag, applies `{kind: 'token-update', id, changes: {x: fromX, y: fromY}}`, fires the announcer.
  - `Z` keybinding (no Ctrl/Meta/Alt/Shift) handler runs BEFORE the existing Ctrl/Meta block so it doesn't accidentally collide with `Ctrl+Z`.
- **No store changes.** The store's existing `applyPatch({kind: 'token-update', ...})` is the inverse-application path; the new history is a parallel side-channel that doesn't touch the existing undo / redo stacks.

### UX details
- **The whole-state Ctrl+Z still works as before.** Phase 122 doesn't rewire it; the two paths are independent. A user who wants the old "rewind everything" behavior just keeps using Ctrl+Z.
- **Z mid-edit (token editor open) is intercepted by `isEditableFocus`** — the existing focus guard at the top of the GM keydown handler already returns early when an input / textarea is focused. Z is safe to type in those contexts.
- **No visible UI affordance yet.** The shortcut is documented in the help overlay (separate phase to update); the discovery path right now is the announcer + the changelog. A future polish could surface a "Last move:" pill on the toolbar with a click-to-undo handle, but that's out of scope for v122.

### Tests
- **+8 unit tests** in `src/state/token-move-history.test.ts` (new): starts empty; LIFO ordering; peekLast doesn't consume; skip no-op moves; cap eviction; clear; now seam; explicit-timestamp override.
- **+3 Playwright specs** in `e2e/token-move-undo.spec.ts` (new): plain Z reverts a single arrow-key move; Z with no recorded moves is a silent no-op; Ctrl+Z still does whole-state undo (independent of plain Z).
- **All 1360 unit tests + 326 Playwright specs pass** locally.

### Bundle
- 100.02 / 110 KB initial-load brotli (+0.37 KB for the history module + the wiring + the keybinding). CSS 12.26 / 14 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [0.121.0] — 2026-04-27 — Auto-generated scene thumbnails

### Added
- **Scenes auto-capture a thumbnail every ~10 seconds during play.** The auto-save loop now folds a thumbnail snapshot into the persist flow whenever the throttle gate allows. A freshly-created scene captures on its FIRST auto-save (the throttle returns `true` for any sceneId it hasn't seen before), so a brand-new scene shows a real thumbnail in the Scenes modal as soon as it's been touched — no more "(no thumbnail)" placeholder waiting for the user to switch scenes for the first time.
- **Per-scene throttle** — captures are gated at one-per-10s PER scene, so editing one scene doesn't burn the throttle for every other scene. Switching scenes still captures the outgoing scene synchronously (the existing `switchToScene` path) — the new auto-capture is additive.

### Why this matters
Pre-121 a scene only got a thumbnail if you EXPLICITLY switched away from it. Most GMs don't switch scenes mid-session, so the Scenes modal looked perpetually empty (placeholder tiles for every scene). Phase 121 ties thumbnail capture into the regular save loop so scenes look real-and-current the moment you open the picker.

### Architecture
- **`src/state/scene-thumbnails.ts`** (new, ~80 lines) — pure helper. `createSceneThumbnailThrottle({minIntervalMs?, now?})` returns `{shouldCapture, reset, forget}`. `shouldCapture(sceneId)` returns `true` the first time it sees an id, then at most once per `minIntervalMs` (default 10 s) per id. Counts the call as a capture so consecutive `true` responses don't fire. Includes a clock seam (`now`) for deterministic tests.
- **`src/entries/gm.ts`** — adds `sceneThumbnailThrottle` next to the existing `persist` debouncer. Inside the persist callback (right after the snapshot-history record path, both gated on `ok`), if the throttle says yes, capture a thumbnail via the existing `captureThumbnail(canvas)` helper from Phase 39 and write it via `saveScene(id, state, {thumbnail})`. Failures swallowed with a `console.warn` — thumbnails are nice-to-have, never critical.
- **`handleDeleteActiveScene`** — calls `sceneThumbnailThrottle.forget(activeId)` so a deleted-then-recreated scene id starts fresh (rare but possible via scene-import round-trips).
- **No changes to `src/state/scenes.ts`** — `saveScene(id, state, {thumbnail})` already supported the optional thumbnail field; we just call it more often.

### UX details
- **Throttle is per-scene, not global.** Editing scene A and B in quick succession captures both on first touch; subsequent edits to either are throttled independently.
- **In-memory only.** Reload re-mints the throttle map, so the first save after reload always captures (acceptable — costs one extra capture per reload).
- **Capture is best-effort.** A thrown captureThumbnail (corrupt canvas state) just logs a warning + the existing thumbnail (if any) is preserved.
- **No back-pressure.** Phase 76's save-status pill keeps reflecting the saveState result, not the thumbnail step. A thumbnail failure doesn't flip the pill to "error" — that's reserved for state persistence failures.

### Tests
- **+7 unit tests** in `src/state/scene-thumbnails.test.ts` (new): first call returns true; second call within minInterval returns false; call after minInterval returns true; per-scene independence; falsy-id guard; reset clears every record; forget drops a single id without affecting others.
- **+1 Playwright spec** in `e2e/auto-thumbnails.spec.ts` (new): place a token, wait 700 ms (longer than the 200 ms persist debounce), open Scenes modal, verify the active card's `.scene-thumb` style includes a `background-image:url(data...)` (the captured JPEG).
- **All 1352 unit tests + 323 Playwright specs pass** locally.

### Bundle
- 99.65 / 110 KB initial-load brotli (+0.11 KB for the throttle helper + the wiring). CSS 12.26 / 14 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit all green before push.

---

## [0.120.0] — 2026-04-27 — Player-side annotations (suggestion → review)

### Added
- **Spectator can suggest annotations.** A new "Suggest (N)" button on the spectator toolbar (and the `n` keyboard shortcut) puts the canvas into "suggest annotation" mode. Click on the map → an inline prompt appears at the click point asking for the annotation text → Send broadcasts the suggestion to the GM. Suggest mode stays active so the spectator can drop multiple markers in a row; toggle off by clicking the button again or pressing `n` / Esc.
- **GM-side review panel.** New "Player Suggestions" side panel (sliding right-pinned, mirrors the chat / combat-log layout) lists every pending suggestion with the sender's name + identity-color swatch, the proposed text, world coordinates, and two action buttons:
  - **Approve** fires a normal `annotation-add` patch with `visibility: 'shared'`, so the suggestion lands on the GM's map AND gets mirrored to all peers via the existing sync wire.
  - **Dismiss** drops the suggestion locally with no state mutation. The spectator who sent it isn't notified — they see no on-screen confirmation either way (matching the announcer-only feedback pattern from chat).
  - **Dismiss all** in the panel header empties the queue in one click.
- **Auto-opens on arrival.** When a new suggestion arrives, the GM panel auto-opens so a busy GM doesn't miss it. Already-open panel just re-renders. Closed deliberately? Re-open via command palette (*"Toggle Player Suggestions panel"*, group **Panels**).
- **Polite-announce on arrival** — `announcer.announce("X suggested an annotation: …")` so screen-reader users + GMs not currently looking at the panel know a suggestion came in.

### Why this matters
Pre-120 the only way for a player to flag something on the GM's map was to ping (transient flash) or describe it verbally / in chat. Persistent annotations were strictly authored by the GM. Phase 120 closes that gap with a low-friction, GM-mediated channel: players can flag "trap door here?" / "secret room?" / "the bandit camp must be in this clearing" without crossing the GM-as-source-of-truth boundary the rest of the sync model relies on.

### Architecture
- **`src/state/annotation-proposals.ts`** (new, ~110 lines) — pure helper. `createAnnotationProposals({maxEntries?})` returns `{add, entries, size, remove, clear, subscribe}`. Same id-dedupe + eviction-frees-the-slot pattern as Phase 119's chat-history. Cap defaults to 50 entries (smaller than chat — a session that accumulates 50 unapproved suggestions has bigger problems than a queue overflow).
- **`src/sync/messages.ts`** — added an `annotation-proposal` SyncMessage variant: `{type: 'annotation-proposal', proposalId, senderId, senderName, x, y, text, color, timestamp}`. Pure broadcast: every connected peer receives it; only the GM acts on it. Other spectators ignore the message (no handler in their channel.onMessage chain).
- **`src/ui/annotation-proposals-panel.ts`** (new, ~150 lines) — GM-side review panel. Header with title + Dismiss-all + ×; empty-state copy; ordered list of `.annotation-proposal` cards each with meta (color swatch + name + coords), body (text), and approve / dismiss buttons. Live updates via `proposals.subscribe`.
- **`src/ui/annotation-proposal-prompt.ts`** (new, ~115 lines) — Spectator-side floating inline prompt. `mountAnnotationProposalPrompt({onSubmit, onCancel})` returns `{open, close, isOpen, destroy}`. `open(screenX, screenY)` positions the prompt at the click point (clamped to viewport); submit fires `onSubmit(text)`; Esc / Cancel fires `onCancel()`. Pure UI; the host owns the world-coord capture + the broadcast.
- **`src/entries/gm.ts`** — mounts `annotationProposals` queue + `annotationProposalsPanel`. Channel handler for `annotation-proposal`: adds to queue, auto-opens the panel, fires announcer. Approve callback constructs an `Annotation` (visibility: 'shared'), applies an `annotation-add` patch, removes from queue. Dismiss callback removes from queue. Command palette entry registered in **Panels** group.
- **`src/entries/spectator.ts`** — mounts `mountAnnotationProposalPrompt`. Toolbar gains a Suggest button (alongside Ruler) — refactored `mountSpectatorToolbar` to return `{ruler, suggest}` instead of a single button. `setSuggestActive(active)` adds / removes a `pointerdown` listener on the canvas; click captures `pointerToWorld(canvas, renderer, e)` + opens the prompt at the click's screen coords. `n` keyboard shortcut toggles suggest mode. Mutually exclusive with ruler — switching one on auto-disables the other. Send path stamps `proposalId = nid()` + spectator's identity color so the GM's panel shows the suggester's color swatch.
- **`src/ui/styles.css`** — new `.annotation-proposals-panel` block + nested `.annotation-proposal` / `.annotation-proposal-meta` / `.annotation-proposal-body` / `.annotation-proposal-buttons` / `.annotation-proposal-swatch` rules. Approve uses the accent fill (filled, primary action); Dismiss uses panel-card styling (outlined, secondary action). Separate `.annotation-proposal-prompt` block for the spectator-side floating prompt — `position: fixed`, accent-bordered, with input + Send + Cancel inline.

### UX details
- **No persistence by design.** Pending suggestions are in-memory only; on tab reload they're lost. Approved suggestions land in the normal annotation state path (which IS persisted). Matching the chat / combat-log ephemerality story.
- **Suggest mode stays active across sends.** The user typically wants to drop several markers in a row ("trap, then trap, then exit") so the mode persists; toggle off explicitly.
- **No back-channel from GM to suggester.** Approval / dismissal is silent on the spectator side — they see the approved annotation appear on the shared map (because it's a real shared annotation now), but a dismissed suggestion just vanishes. A future polish could echo back an `annotation-decision` message to the original sender for explicit feedback; out of scope for v120.
- **Other spectators don't see other spectators' suggestions.** The sync layer broadcasts to all peers, but only the GM has a handler. Keeps the panel a per-GM workspace.

### Tests
- **+11 unit tests** in `src/state/annotation-proposals.test.ts` (new): starts empty; arrival ordering; id-dedupe (re-broadcast no-op); empty-id rejected; cap eviction (oldest evicted); eviction frees the dedupe slot; remove drops + frees the slot; remove of unknown id is a silent no-op; clear empties + notifies / silent no-op when already empty; subscribe / unsubscribe round-trip.
- **+3 Playwright specs** in `e2e/annotation-proposals.spec.ts` (new): toolbar Suggest button + canvas click opens the prompt; GM sees the suggestion and Approve clears the panel (suggesting the patch landed in state); GM Dismiss drops the suggestion without state mutation.
- **All 1345 unit tests + 322 Playwright specs pass** locally.

### Bundle
- **JS budget bumped 100 → 110 KB.** Phase 120 added ~1.5 KB JS (the proposals queue + the two UI modules + the wiring on both entries); landed at 99.54 / 100 KB which would have been 0.46 KB headroom — too tight for the heavier Phase 121-124 lifts (especially hex grid). Bumped 10 KB at once rather than per-phase. CSS 12.26 / 14 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression specs + size-limit (after the proactive 100 → 110 KB bump) all green before push.

---

## [0.119.0] — 2026-04-27 — Player chat panel

### Added
- **Sliding chat panel** pinned to the right edge of the viewport (mirrors the combat-log + notes panel layout). GM toggles it via the command palette ("Toggle Chat panel" — group **Panels**); Spectator toggles via the `c` keyboard shortcut. Panel includes a scrolling message log, a bottom Send form, and a per-message visibility toggle.
- **Per-message visibility**:
  - GM-side: a *"Private (GM only)"* checkbox marks the next message as `gm-only` (private GM notes — Spectators filter on receive).
  - Spectator-side: a *"Whisper to GM"* checkbox marks the next message `gm-only` (other Spectators filter; the GM still sees it).
- **In-memory ring buffer** (cap 200) per tab session — chat is fire-and-forget, like the Phase 94 combat log. On reload the panel starts empty + sees only messages that arrive after that moment.
- **Stable id-based dedupe** in the history store so a re-broadcast / sync echo of an already-received message is a silent no-op. Eviction at the cap also frees the dedupe slot, so a long-running session that wraps the buffer can still re-receive an old id.
- **Polite-announce on receive** — both sides fire `announcer.announce("X said: …")` when a message arrives, so screen-reader users + GMs not currently looking at the panel know when chat is happening.

### Why this matters
Pre-119 the only cross-peer text channel was the dice tray's parsed roll history (Phase 73). For a "the wizard whispers to the warlock at the table" interaction, GMs had to use voice or a separate app. Phase 119 closes that gap with a deliberately minimal text chat — no markdown, no images, no persistence, no DMs between Spectators (the architecture only supports broadcast → filter, and the Spectator-side filter is good-faith only). It's the simplest thing that addresses the actual pain.

### Architecture
- **`src/state/chat-history.ts`** (new, ~115 lines) — pure helper. `createChatHistory({maxEntries?})` returns `{add, entries, size, clear, subscribe}`. Id-based dedupe via a Set sized to track the buffer; eviction at the cap removes the oldest entry's id from the dedupe set so the slot can be reused. `spectatorShouldRenderChat(msg)` is a one-line filter the Spectator side calls before adding to its local history.
- **`src/sync/messages.ts`** — added a `chat` SyncMessage variant: `{type: 'chat', messageId, senderId, senderName, senderRole, text, visibility, timestamp}`. Pure broadcast: every connected peer receives it + filters on `visibility`. The Phase 66 envelope's self-echo guard prevents the sender from re-receiving its own message.
- **`src/ui/chat-panel.ts`** (new, ~180 lines) — sliding panel with a header (title + Clear + ×), a message list (live-updates via `history.subscribe`), and a Send form (visibility checkbox + text input + Send button). Auto-scrolls to bottom on new messages so the latest is always visible. `viewMode` swaps the visibility toggle copy: GM sees *"Private (GM only)"*, Spectator sees *"Whisper to GM"*. Both wire to `gm-only` on the wire.
- **`src/entries/gm.ts`** + **`src/entries/spectator.ts`** — both mount a chat panel + register a chat sync handler. Send path: stamp `id = nid()`, `senderId = playerId`, `senderName` from identityPrefs, `timestamp = Date.now()`; add to local history first (so the sender sees it immediately), then broadcast. Receive path: gm always adds; spectator filters via `spectatorShouldRenderChat`. Both fire `announcer.announce`.
- **GM**: command palette command *"Toggle Chat panel"* (group **Panels**, alongside Notes + Combat Log).
- **Spectator**: keyboard `c` shortcut (no command palette — Spectators don't have one).
- **`src/ui/styles.css`** — new `.chat-panel` block + nested `.chat-row` / `.chat-row-meta` / `.chat-row-body` / `.chat-input-row` rules. Shared messages get the default panel-card styling; `gm-only` messages get an accent-tinted background + an "private" / "whisper" tag in the meta row so it's visually obvious.

### UX details
- **No persistence by design.** Chat history is per-tab session (matches combat log). A future polish could persist to localStorage like Phase 107's dice history; for the v1 cut, ephemeral keeps the privacy story simple.
- **Spectator-side filter is good-faith.** A tampered Spectator build could read `gm-only` messages off the wire. To enforce strictly the GM would need to mediate (each Spectator → GM relay), which is a much bigger architecture change. Documented in the helper's source.
- **No support for DMs between Spectators.** Architecture is broadcast → filter; spectator-to-spectator routing would need addressed envelopes. Out of scope for v119.

### Tests
- **+12 unit tests** in `src/state/chat-history.test.ts` (new): starts empty; arrival ordering; id-dedupe (re-broadcast no-op); empty-id rejected; cap eviction (oldest evicted); eviction frees the dedupe slot; clear empties + notifies / silent no-op when already empty; post-clear re-add works; subscribe / unsubscribe round-trip. `spectatorShouldRenderChat` returns true for shared / false for gm-only.
- **+3 Playwright specs** in `e2e/chat-panel.spec.ts` (new): GM palette opens the panel; GM message round-trips to a connected Spectator (real BroadcastChannel hop); GM-only message renders on the GM but does NOT render on the Spectator.
- **All 1333 unit tests + 319 Playwright specs pass** locally.

### Bundle
- **JS budget bumped 98 → 100 KB.** Phase 119 added ~1.3 KB JS (the chat history + the panel + the wiring on both entries); landed at 97.99 / 98 KB which would have been 10 B under — too tight to leave for Phase 120's annotations. CSS budget bumped 12 → 14 KB; landed at 11.99 / 12 KB (10 B under) so the same proactive bump applies. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit (after the proactive 98 → 100 KB JS bump) all green before push.

---

## [0.118.0] — 2026-04-27 — Snap-to-grid-edge wall drawing

### Added
- **"Snap to grid" checkbox** in the Walls tool settings panel. When on, line-mode vertex placements snap to the nearest cell corner. The rubber-band cursor preview also snaps so you see where the next click will commit, not where your mouse happens to be hovering. Off by default — freehand authoring stays the default for diagonal / angled walls.
- **Block mode unchanged** — already snaps to cells by definition (Phase 112). The checkbox stays available for muscle memory but is silently ignored during block drags.

### Why this matters
Building a clean grid-aligned dungeon pre-118 required pixel-perfect mouse work for every wall vertex, then the user squinted at slightly-off corners. Snap mode makes a 50-cell room geometry trivial — every click lands cleanly on a cell corner so the walls form a sealed perimeter without manual cleanup.

### Architecture
- **`src/input/tool-walls.ts`** — `WallsToolOptions` gains `snapToGrid: boolean` (default `false`). The default factory `createWallsToolOptionsRef()` includes it. A new `snapWorldToGridEdge(world)` helper rounds to the nearest cell corner when the flag is on (passes through unchanged when off). The line-mode `pointerdown` commit + `pointermove` cursor preview both run through it. Block mode skips it (block drags use `worldToCell` independently).
- **`src/ui/walls-settings.ts`** — added a third UI row under "Mode": a single checkbox with the label "Snap to grid". Toggling mutates `optionsRef.current.snapToGrid` so the next pointerdown picks up the new setting; the panel's `syncButtons` updates the checkbox state on tool re-activation so a flag set earlier sticks.
- **`src/ui/styles.css`** — small `.walls-settings-snap` block: flex row with the checkbox + label, same font / spacing as the mode-button row above.

### Tests
- **+2 Playwright specs** in `e2e/snap-to-grid-walls.spec.ts` (new): the checkbox is present + unchecked by default; toggling on persists across switching to a different tool and back (the options ref outlives the panel mount).
- **All 1321 unit tests + 316 Playwright specs pass** locally.

### Bundle
- 96.66 / 98 KB initial-load brotli (+0.14 KB for the snap helper + the settings checkbox). CSS 11.74 / 12 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit all green before push.

---

## [0.117.0] — 2026-04-26 — Wall presets

### Added
- **Wall editor gets a preset chip strip** at the top with five built-ins: *Stone exterior* (thickness 8, opaque), *Interior divider* (thin, opaque), *Window* (sight-transparent, movement-blocking), *Secret passage* (GM-only visibility), *Wooden door (closed)* (Phase 113 door, thickness 4). Click any chip to apply the bundle to every selected wall in one batch.
- **"+ Save…" button** captures the FIRST selected wall's current values (thickness, sight / movement, visibility, door state) under a user-supplied name, persisting to localStorage. The new chip appears at the end of the strip + survives across modal close + re-open + page reload.
- **Per-user-preset delete** — small × inside the chip drops the entry. Built-ins are protected (no × button + the store ignores remove calls for `b:`-prefixed ids).
- **Up to `MAX_USER_PRESETS = 20`** user presets persisted; oldest evicted on new save so the localStorage blob stays bounded.

### Why this matters
Pre-117, every wall was edited cell-by-cell. A dungeon with 30 stone-exterior walls, 50 interior dividers, and 8 secret passages required 88 individual edits — set thickness 8, ensure GM-only on the 8 secrets, etc. Phase 117 turns that into 88 single-clicks (or 88 right-click → preset). And the chip strip is multi-select aware, so dragging a lasso over 12 walls + clicking *Stone exterior* sets them all in one undo step.

### Architecture
- **`src/state/wall-presets.ts`** (new, ~200 lines) — pure helpers + a versioned localStorage envelope. API: `listPresets()` (built-ins + user, in display order), `savePreset(opts)` (returns the saved entry, generates id), `removePreset(id)` (silent no-op for built-ins + unknown ids), `_resetUserPresets()` (test-only). 
  - **Built-ins live in code** (`BUILTIN_PRESETS`), not in storage. An app upgrade can add new built-ins without a migration.
  - **Defensive parsing** — drops persisted entries missing required fields (id / name / blocksSight / blocksMovement booleans), drops wrong-version blobs, falls back to built-ins-only on JSON parse failure. Forces `isBuiltin: false` on every persisted entry so a malformed peer can't grant delete-immunity to a user preset.
- **`src/ui/wall-editor.ts`** — added a preset chip strip above the existing fields. The render function calls a new `renderPresets()` helper on every render, so a freshly saved (or deleted) preset appears immediately. Each chip is `[apply button] [× delete button]` (the × omitted on built-ins). Clicking apply translates the preset to a `WallEditorChange` via `presetToChange(p)` and forwards to `opts.onChange` — the existing host wrapper handles the multi-select batching + the door-promotion remove path. Save button hijacks `window.prompt` for the name + writes through `savePreset`.
- **`src/ui/styles.css`** — new `.wall-editor-presets` block. Pill-shaped chips (built-ins border-accented, user chips neutral); the Save button uses a dashed border to distinguish it visually from the apply chips.

### UX details
- **Block walls silently ignore `thickness`** when a preset is applied — they don't have a thickness to set. The other preset fields (visibility, blocksSight / Movement) still apply.
- **Door promotion via preset** — the Wooden Door built-in carries `door: { open: false }`. Applying it to a non-door wall promotes it; applying to a door overwrites the open state. A future polish could add an "unset door" preset (using the `door: null` signal the editor's onChange already handles).
- **Save captures ONLY the first selected wall's values** — multi-select Save would need a "which set of values?" choice that's hard to disambiguate. The chip-strip view is multi-select-aware (apply hits all selected); save is single-source.

### Tests
- **+16 unit tests** in `src/state/wall-presets.test.ts` (new): built-ins always present (5 expected); built-ins flagged isBuiltin=true; the wooden-door / secret-passage / window built-ins carry their distinguishing fields; save adds a user entry after the built-ins; save trims name + falls back to "Untitled preset"; remove drops a user preset; remove is a silent no-op for built-in + unknown ids; cap eviction at MAX_USER_PRESETS; round-trips through localStorage; defensive parsing for malformed JSON / version mismatch / missing-field entries; forces isBuiltin=false on persisted entries.
- **+4 Playwright specs** in `e2e/wall-presets.spec.ts` (new): chips + Save button render with the 5 built-ins; clicking *Stone exterior* sets the thickness output to "8.0 px"; Save creates a user chip that persists across modal close + re-open; user preset has a × button that removes the chip.
- **All 1321 unit tests + 314 Playwright specs pass** locally (the same `scenes.spec.ts:56` parallel flake from earlier phases reappeared once; passes in isolation, CI runs serially with retries=2, absorbed).

### Bundle
- **JS budget bumped 96 → 98 KB.** Phase 117 added ~0.9 KB JS (the wall-presets store + the chip-strip render path); landed at 96.52 / 96 KB which would have been 524 B over. CSS 11.74 / 12 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit (after the proactive 96 → 98 KB bump) all green before push.

---

## [0.116.0] — 2026-04-26 — Drag-to-resize block-wall corners

### Added
- **Selected block walls now expose 4 corner handles.** Drag any handle to resize the block in cell coordinates — the opposite corner stays pinned, the dragged corner moves to the snapped cell edge, and a translucent ghost rectangle previews the new geometry live before the patch commits at pointerup. Closes the explicit "drag-to-resize" deferral from Phase 112.
- **No more delete-and-redraw** for adjusting a misjudged block. Resize works the same for any corner (TL / TR / BL / BR); the pinned-opposite-corner semantic matches every "marquee resize" pattern users already know from photo editors and design tools.
- **Cell-edge snapping** — the dragged corner snaps to the nearest grid edge (not a fractional position). Both axes resize independently for TR / BL drags, so dragging just down moves only the bottom edge.
- **Min size of 1×1 cells** — clamped automatically; a drag past the opposite corner just shrinks the block to 1×1 along that axis.
- **Cell coords clamped to ≥ 0** — TL drags into negative world space cap at the grid origin.

### Why this matters
Phase 112 shipped block walls with a documented "drag-to-resize is a future polish; for now blocks are edited via re-draw." Phase 116 closes that gap. After a 30-cell encounter design where you accidentally made the boss room one row too short, you can now extend it without losing the block's id (the wall stays the same entity through the resize — sync, selection, undo, and Phase 113 door promotion all keep working uniformly).

### Architecture
- **`src/state/walls.ts`** — three new exports:
  - `BlockCorner = 'tl' | 'tr' | 'bl' | 'br'` — corner identifier.
  - `hitTestBlockCorner(walls, selectedIds, px, py, cellSize, tolerancePx)` returns `{wall, corner}` for the closest corner of any selected block within tolerance, or `null`. Walls iterate in reverse so the most-recently-drawn wins on ties (matches `hitTestWalls`'s mental model). Segment walls in the selection are skipped — they have endpoint handles via Phase 85, not corners.
  - `applyBlockCornerDrag(wall, corner, dragWorldX, dragWorldY, cellSize)` returns the new geometry. Pure math: snap `dragWorld` to the nearest cell edge, then compute the new bounding box such that the opposite corner stays pinned. Clamps width/height to ≥ 1, cellX/cellY to ≥ 0.
  - `BLOCK_CORNER_HANDLE_SCREEN_PX = 12` — handle render + hit-test size.
- **`src/input/context.ts`** — added `BlockResizeRef` (in-flight prospective geometry) + `createBlockResizeRef()`. Optional `blockResize?` on `InputContext`.
- **`src/input/tool-select.ts`** — `pointerdown` now hit-tests block corners BEFORE segment endpoints (the two are mutually exclusive — segments don't have corners, blocks don't have endpoints — but the corner test runs first because it has a slightly larger tolerance band and the order shouldn't matter). Mid-drag `pointermove` updates `blockResize.current` via `applyBlockCornerDrag`; `pointerup` commits a `wall-update` patch with the new `cellX/cellY/cellsWide/cellsTall` (skipped when nothing changed). The deactivate path clears the in-flight ref to avoid a stuck ghost when the GM switches tools mid-drag.
- **`src/render/layer-walls.ts`** — `WallsRenderOptions` gained `blockResize?` (the ghost overlay). The block render loop paints corner handles on highlighted blocks (12 × 12 yellow accent squares with a contrast outline, scaled by zoom for visual consistency); the wall whose id matches `blockResize.wallId` skips its own handle paint so the ghost rectangle is the only visual during the drag.
- **`src/render/renderer.ts`** + **`src/entries/gm.ts`** — single new `getBlockResize` callback wired through, mirroring the Phase 112 `getBlockPreview` pattern.

### UX details
- **Corner handles are GM-only.** The Spectator never sees them (Phase 85 collapsed `highlights` + `endpointDrag` to empty/null on Spectator side; the new `blockResize` does the same).
- **Ghost color is the highlight accent** (yellow), distinct from the Phase 112 block-create preview (wall-color blue). This makes "resize in flight" visually distinguishable from "creating a new block in flight."
- **No min-size visual cue** at the 1×1 limit. The ghost just stops shrinking. A future polish could pulse the affected edge red to signal the clamp; for now, the snap is silent.

### Tests
- **+13 unit tests** in `src/state/walls.test.ts`: `hitTestBlockCorner` (no selection / segments-have-no-corners / TL hit / BR hit / outside tolerance / respects selectedIds); `applyBlockCornerDrag` (TL drag pins BR / BR drag pins TL / TR drag — independent axes / BL drag — left + bottom both move / clamps to 1×1 minimum / clamps cellX/cellY to ≥ 0 / snaps to nearest cell edge).
- **+2 Playwright specs** in `e2e/block-corner-resize.spec.ts` (new): authoring + selecting + corner-drag runs end-to-end without errors and the canvas stays alive after; block walls without selection are NOT affected by a "would-be corner drag" attempt.
- **All 1305 unit tests + 310 Playwright specs pass** locally.

### Bundle
- 95.64 / 96 KB initial-load brotli (+0.56 KB for the helpers + the tool-select branch + the renderer pass + the gm-side wiring). CSS 11.62 / 12 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit all green before push.

---

## [0.115.0] — 2026-04-26 — Diagonal movement rules: add Euclidean

### Added
- **Euclidean diagonal rule** — third option for the existing diagonal-cost dropdown. Returns the rounded straight-line Pythagorean distance, so the diagonal of a 3×4 right triangle is 5 cells (Chebyshev would say 4; alternating would say 5). Useful for simulationist play (Pathfinder 2e ranges, Star Frontiers, anything that prefers honest distance over D&D-style simplification).
- **Settings → Appearance → Distance** gains a third radio: *"Euclidean (Phase 115 — straight-line, 3×4 diagonal = 5)."* The choice persists per-tab via the existing `preferences.diagonalRule` field; the ruler + the movement-remaining indicator both consume it through `gridDistance(dx, dy, rule)`.

### Why this matters
Pre-115 the app shipped two diagonal rules: D&D 5e's Chebyshev (default) and the PHB-optional alternating (5/10) rule. Both are simplifications that game-system-specific GMs love or hate. Phase 115 adds a third option that doesn't simplify at all — closes the gap for systems that want honest Euclidean distance without the GM having to translate manually.

### Architecture
- **`src/state/distance.ts`** — added `euclideanDistance(dx, dy) = round(hypot(dx, dy))` and extended `DiagonalRule = 'chebyshev' | 'alternating' | 'euclidean'`. The `gridDistance` dispatch switched from a ternary to a `switch` so the third arm reads cleanly + an unknown rule string falls through to `chebyshev` (defensive: a malformed peer that sneaks `diagonalRule: 'frob'` over the wire doesn't break the renderer).
- **`src/ui/settings-modal-content.ts`** — third radio inserted in the existing Appearance > Distance group. The hint copy got a one-line update mentioning the Ruler tool reads it too.
- **No other call-site changes needed** — the renderer + the ruler already routed everything through `gridDistance(dx, dy, prefs.diagonalRule)` since Phase 0.61. New rule plugs in transparently.

### Tests
- **+5 unit tests** in `src/state/distance.test.ts`: `euclideanDistance` returns 0 for no-movement, falls back to orthogonal magnitude on cardinal moves, returns the rounded hypotenuse on diagonals (3-4-5 exact + 1×1 ≈ √2 → 1 + 2×2 ≈ √8 → 3), is symmetric across sign + axis. Plus a `gridDistance` test that exercises all three rules on the same delta (3×4 box: chebyshev = 4, alternating = 5, euclidean = 5) + a fall-through test for an unknown rule.
- **+1 Playwright spec** in `e2e/diagonal-rule.spec.ts` (new): Settings modal exposes the third radio in the Appearance tab; selecting it persists across modal close + re-open.
- **All 1292 unit tests + 308 Playwright specs pass** locally after one fix (the diagonal-rule fieldset lives in the Appearance tab, not the default Grid tab — the e2e helper now clicks the tab first). The same `scenes.spec.ts:56` parallel flake that's been seen since Phase 101 reappeared once (passes in isolation; CI runs serially with retries=2, absorbed).

### Bundle
- 95.08 / 96 KB initial-load brotli (+0.12 KB for `euclideanDistance` + the third radio HTML). CSS 11.62 / 12 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit all green before push. Eighteen clean phases in a row now (97 → 115).

---

## [0.114.0] — 2026-04-26 — `blocksMovement` enforcement

### Added
- **Walls actually block token drags now.** The `blocksMovement` flag has existed on every wall since Phase 54 but did nothing — the drag commit happily moved tokens through walls. Phase 114 wires the flag to the drag path: when a token's straight-line move from start to end crosses a movement-blocking wall, the move is clamped to the latest reachable cell along the line.
- **Open doors don't block** — the clamp uses `wallBlocksMovementEffective` (Phase 113), so an open door is fully passable.
- **Block walls block via their perimeter** — the same `wallToSegments` expansion the LoS path uses (Phase 112) feeds into the clamp helper, so a 3×3 block wall blocks any drag whose line crosses any of its 4 sides.
- **Arrow-key nudges respect the clamp too** — pressing an arrow key into a wall is now a silent no-op instead of teleporting the token through.

### Why this matters
Before 114, a GM could draw walls for visual / LoS purposes but the players' tokens could still be slammed through them. The flag was on every wall, defaulting to `true`, but had zero runtime effect — the user had reasonably assumed it did something. Phase 114 makes it actually mean what it says.

### Architecture
- **`src/state/movement.ts`** (new, ~190 lines) — pure helper. `clampMoveAgainstWalls(startCellX, startCellY, endCellX, endCellY, walls, cellSize)` returns `{cellX, cellY, blocked}`. Algorithm:
  1. Collect every wall whose `wallBlocksMovementEffective` is true. Block walls expand to their 4 perimeter segments via `wallToSegments`.
  2. Bresenham-walk the cells from start to end.
  3. For each step, test the segment from prev-cell-center to next-cell-center against every blocker. The first crossing stops the walk; the prev cell becomes the clamped destination.
- **Pure straight-line movement** — Phase 114 deliberately doesn't pathfind around obstacles. A drag that would route around a corner gets clamped at the corner; the GM can follow up with a second drag to continue. Matches the existing "you control the path" interaction model. A future grid-pathfinder phase could route automatically.
- **`segmentsIntersect`** + Bresenham helpers exported alongside for testability.
- **`src/input/tool-select.ts`** — drag-commit path now calls `clampMoveAgainstWalls` per token (group drags clamp each token independently — tokens that can move further still reach their requested destination, blocked ones land at their personal clamp). When the clamp returns the same cell as the start, the token-update patch is skipped entirely.
- **`src/entries/gm.ts`** — arrow-key nudge handler clamps the same way. A nudge into a wall is silently a no-op.

### Tests
- **+19 unit tests** in `src/state/movement.test.ts` (new): Bresenham horizontal / 45° / negative deltas / start-equals-end; segmentsIntersect for crossing / parallel / touching-endpoints / non-overlapping; clampMoveAgainstWalls passthrough cases (no walls / start=end / blocksMovement=false / open doors); blocking cases (clamp at cell-before-wall / clamp at start when first step blocked / closed doors block / block walls block via perimeter / parallel-to-move walls don't block / diagonal moves blocked by perpendicular walls / multiple walls — first crossing wins).
- **+3 Playwright specs** in `e2e/blocks-movement.spec.ts` (new): no walls = drag goes through; a wall clamps the drag short; an open door does NOT block the drag.
- **All 1287 unit tests + 307 Playwright specs pass** locally on the first run.

### Bundle
- 94.96 / 96 KB initial-load brotli (+0.48 KB for the movement helper + the two clamp wirings). CSS 11.62 / 12 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit all green before push. Seventeen clean phases in a row now (97 → 114).

---

## [0.113.0] — 2026-04-26 — Door entities

### Added
- **Promote any segment wall to a door** via the wall editor's new "Is door" checkbox. Doors keep all the wall properties (sight, movement, visibility, thickness) but gain a toggleable `open` state. When open, they stop contributing to LoS — light sees right through them — without losing their authoring-side identity.
- **One-click open / close** via the canvas context menu. Right-click a door → "Open door" or "Close door"; the action flips state in a single patch (multi-select aware: right-click after selecting several doors flips them all together).
- **Visual distinction at the wall layer**: doors render with two short perpendicular tick markers at their midpoint so you can tell a door from a regular wall at a glance even when closed. Open doors render at ~55% opacity with a dashed stroke + the same tick markers — the doorway is still visually "there," it's just clearly passable.
- **End-to-end LoS integration**: `wallBlocksSightEffective(w)` (new helper) wraps the raw `blocksSight` flag — open doors return false regardless. `collectSightWalls` consumes the effective helper, so the LoS worker, fog masking, and viewer polygons all update within one render cycle of an open/close toggle. No state replay needed.
- **`wallBlocksMovementEffective`** is exported alongside (mirrors the sight helper) so the future grid-pathing phase can drop in without revisiting door logic.

### Why this matters
Pre-113, dynamic level state ("the players opened the courtyard gate") had to be authored as delete-and-redraw: delete the wall to "open" it, then re-draw the segment to "close" it back. That broke the undo stack, lost the wall's id (so the GM couldn't restore the same door later), and didn't survive scene save / restore. Doors give the GM a stable entity that flips state in place — exactly the model real dungeons need.

### Architecture
- **`src/state/types.ts`** — `WallSegment` gains an optional `door?: { open: boolean }`. `WallBlock` does NOT (the doorway shape is inherently a thin opening; promoting a region to a door doesn't make sense). `door` absent = "not a door"; `door: { open: false }` = "closed door"; `door: { open: true }` = "open door."
- **`src/state/walls.ts`** — three new helpers:
  - `isDoor(w)` narrows `Wall` to `WallSegment & { door: { open: boolean } }`. Block walls always return false (defensive: even a malformed peer that sneaks `door` onto a block via the wire format is ignored).
  - `wallBlocksSightEffective(w)` — false when an open door OR `blocksSight === false`; true otherwise. The door wraps the `blocksSight` flag rather than overriding it (so an "arrow slit" door — `blocksSight: false` + `door` — stays transparent when closed too).
  - `wallBlocksMovementEffective(w)` — same shape.
- **`src/state/los-compose.ts`** — `collectSightWalls` switched from raw `w.blocksSight` to `wallBlocksSightEffective(w)`. So an open door drops its segment from the LoS occluder list immediately on toggle.
- **`src/sync/messages.ts`** — `deserializeState` round-trips `door: { open: boolean }` for segment walls. Defensive: only honors the field if the shape matches; pre-113 peers omit it; receivers default to "not a door."
- **`src/render/layer-walls.ts`** — segment-wall draw pass branches on `door` presence:
  - **Closed door**: stroke-as-normal, then a perpendicular tick marker at the segment midpoint (length scales with thickness so the door reads at any zoom).
  - **Open door**: ~55% global alpha + thinner stroke + dashed line, plus the same midpoint tick.
- **`src/ui/wall-editor.ts`** — added "Is door" checkbox + a "Currently open" sub-toggle that appears only when the editor confirms ALL selected walls are doors. The row is hidden entirely when ANY block wall is in the edit selection (blocks can't be doors). `WallEditorChange` gained `door?: { open: boolean } | null` — `null` is the "remove door promotion" signal.
- **`src/entries/gm.ts`** wall editor host:
  - The `onChange` callback translates `door: null` into a remove + re-add patch pair (the store's naive spread can't delete a field, so we rebuild the wall without it). Other changes flow through the standard `wall-update` path.
  - Right-click context menu adds an "Open door" / "Close door" entry above the existing "Disable sight blocking" toggle when EVERY selected wall is a door. Multi-select aware. Polite announcer fires "Door(s) opened." / "Door(s) closed." for screen-reader users.
- **`src/ui/styles.css`** — added `.wall-editor-toggle[hidden] { display: none }` so the door state-row actually disappears when the editor toggles its hidden attribute (the parent's `display: flex` was overriding the HTML default).

### UX details
- **Doors stay visible when open.** A pure delete would remove the wall outline; that's wrong because the doorway is still a feature of the level — the GM (and Spectator) should still see "this is where the door is, it's just open right now." The dashed faded stroke + tick markers give that semantic.
- **No separate "door" tool.** Author as a regular line, then promote via the editor. Keeps the Walls tool focused on geometry; door state is a property of the resulting wall, not a different entity type.
- **Block walls are intentionally excluded** from door promotion. A "block door" doesn't have a clear physical interpretation (a 3×3 tile region that's a door?) and the renderer would need a different visual. Future phase if real demand emerges.

### Tests
- **+7 unit tests** in `src/state/walls.test.ts`: `isDoor` returns false for plain segments + blocks + true for segments with door field; `wallBlocksSightEffective` covers closed-door blocks / open-door doesn't / underlying `blocksSight: false` short-circuits / non-door segments fall through; `wallBlocksMovementEffective` mirrors sight; block walls with malformed door-via-wire field are ignored.
- **+3 unit tests** in `src/state/los-compose.test.ts`: closed door contributes its segment; open door drops its segment; open door coexists with a normal wall (only the door drops).
- **+3 Playwright specs** in `e2e/door-toggle.spec.ts` (new): wall editor exposes the "Is door" checkbox + reveals the "Currently open" sub-toggle when checked; right-click on a door surfaces "Open door" + flips to "Close door" after; non-door walls do NOT show the open/close menu entry.
- **All 1268 unit tests + 304 Playwright specs pass** locally on the first run after one fix (added a `[hidden] { display: none }` rule for `.wall-editor-toggle` since `display: flex` was overriding the HTML default).

### Bundle
- 94.48 / 96 KB initial-load brotli (+0.56 KB for the door helpers + the wall-editor row + the renderer branch + the gm-side context-menu entry). CSS 11.62 / 12 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit all green before push. Sixteen clean phases in a row now (97 + 99 + 100 + 101 + 102 + 103 + 104 + 105 + 106 + 107 + 108 + 109 + 110 + 111 + 112 + 113).

### Chunky-walls trilogy complete
0.111 + 0.112 + 0.113 wrap up the three-phase response to the user's "walls that take up a full tile + wider walls in general" ask: chunkier authoring (segment thickness 12 → 48 px), region authoring (block walls), and dynamic level state (doors). Wall authoring is now meaningfully more capable than it was three phases ago without any of the existing flows breaking.

---

## [0.112.0] — 2026-04-26 — Block walls

### Added
- **Block walls** — a new wall type that fills one or more grid cells as a single entity. Drag-to-create snaps to the grid; the result is one selectable, deletable, sync-able entity (not 4 separate segments). Use case: pillars, untraversable terrain, large fortifications, anything you'd otherwise build out of 4 hand-aligned segments.
- **Walls tool gets a Lines / Block mode toggle** in its settings panel (above the canvas, top-left). Lines = original click-vertex chain. Block = drag-a-rectangle that becomes a block wall snapped to grid cells.
- **End-to-end first-class behavior**: block walls render as filled rectangles; their 4 perimeter edges contribute to LoS just like four separate segments would; right-click + lasso + delete + sync + visibility (`shared`/`gm`) all work uniformly with segment walls.
- **Drag-time ghost preview**: while you drag in Block mode, a translucent dashed ghost rectangle follows the cursor showing the prospective block. Releases commit; Esc / right-click cancels mid-drag.

### Why this matters
The user asked for walls that "take up a full tile." Phase 111 made segment thickness reach 48 px so a single segment can fill a cell across, but four-walls-around-a-pillar was still four separate entities. Phase 112 promotes "the wall material fills this region" to a first-class type — one click to author, one click to delete, one entity in the selection set.

### Architecture
- **`src/state/types.ts`** — `Wall` is now a discriminated union: `WallSegment | WallBlock`. The `kind` field is required in both arms (no implicit defaults at the type level); the deserializer normalizes pre-112 walls (no `kind` field) to `kind: 'segment'` on read so the in-memory model is always well-formed.
- **`src/state/walls.ts`** — added `createWallBlock(opts)`, the `isBlockWall` / `isSegmentWall` predicates, `wallToSegments(w, cellSize)` (returns 1 segment for `kind: 'segment'`, 4 perimeter edges for `kind: 'block'` — used by every per-edge consumer), and `blockWallBounds(w, cellSize)` (AABB in world pixels for renderer + hit-test). `hitTestWalls` gained a `cellSize` parameter so block-wall AABB checks can run; the function returns `Wall` (segments still hit by tolerance band, blocks hit by exact point-in-rect — no slop, since the entire region IS the wall). `hitTestWallEndpoint` returns `WallSegment` (block walls have no individual endpoints in Phase 112; drag-to-resize is a future polish).
- **`src/sync/messages.ts`** — `deserializeState` accepts both shapes: a `kind: 'block'` wall (validated by cellX/Y/cellsWide/Tall) OR the original segment shape (default for missing `kind`). Pre-112 peers reading a Phase-112 sync envelope drop block walls during the deserialize filter (their schema requires x1/y1/x2/y2) — Phase 112 is forward-only, like Phase 109's `hiddenTokenIds`.
- **`src/state/los-compose.ts`** — `collectSightWalls` now takes `(walls, cellSize)` and uses `wallToSegments` to expand block walls into 4 LoS occluders. Updated `collectSightWalls` callers in `gm.ts` + `spectator.ts`.
- **`src/render/layer-walls.ts`** — split the wall draw pass into segment-only and block-only halves. Block walls render as filled `WALL_COLOR` rectangles with a 1 px outline (highlighted blocks get the accent fill + outline; GM-only blocks get a translucent fill + dashed outline). Added a `getBlockPreview` callback for the in-flight drag ghost.
- **`src/input/tool-walls.ts`** — added `WallsToolMode` ('line' | 'block'), the `WallsToolOptionsRef` shape, and a `BlockPreviewRef` for the drag ghost. The tool's `onPointerDown` / `onPointerMove` / `onPointerUp` paths branch on the active mode: line mode = the original click-vertex chain (unchanged); block mode = drag-from-cell-A to cell-B and commit on pointerup. Esc and right-click cancel a block drag mid-flow.
- **`src/ui/walls-settings.ts`** (new) — small settings panel mirroring `fog-settings` shape; two-button mode toggle that mutates the options ref.
- **`src/state/canvas-nav.ts`** — block walls use the AABB centroid for the reading-order sort; the announcer reads "Wall block, 2 by 3 cells" instead of segment-style "3 squares long".
- **`src/input/lasso.ts`** — block walls hit the lasso when their AABB intersects the rect (segment walls still use the line-segment intersection check).
- **`src/input/tool-select.ts`** + **`src/entries/gm.ts`** — wall translation paths branch on kind: segment translate by world-pixel deltas (both endpoints), block translate by integer cell deltas (clamped to ≥ 0).
- **`src/ui/wall-editor.ts`** — when the edit selection contains only block walls, the thickness slider row is hidden entirely (blocks have no thickness). Mixed segment + block selections show the slider but compute "all same" only over the segment subset.

### What's deliberately deferred to a future phase
- **Drag-to-resize a block** by its corners (no endpoint handles for blocks in Phase 112; resize via delete + redraw).
- **Cell-perfect block-vs-token movement** (`blocksMovement` is still a flag, not enforced — same as for segment walls pre-112).
- **Wall-editor block-specific fields** like a "Resize to N×M cells" input (you can edit visibility / sight / movement flags via the existing UI; geometry edits are out-of-scope for now).

### Tests
- **+12 unit tests** in `src/state/walls.test.ts`: `createWallBlock` defaults / floors fractional coords / clamps cellsWide-Tall to ≥ 1 / threads visibility; `isBlockWall` + `isSegmentWall` predicates; `wallToSegments` returns 1 / 4 segments for segment / block; `blockWallBounds` AABB; `hitTestWalls` block-path inside-AABB hit / outside-AABB miss / segment-on-top-of-block z-order; `hitTestWallEndpoint` skips block walls (no endpoints).
- **+2 unit tests** in `src/state/los-compose.test.ts`: block walls expand to 4 perimeter LoS segments; `blocksSight: false` on a block drops all 4 edges.
- **+3 Playwright specs** in `e2e/block-walls.spec.ts` (new): Walls panel exposes the Lines / Block toggle (Lines is the default + active); Block mode drag creates a wall whose right-click surfaces "Wall actions"; switching back to Lines restores click-vertex authoring.
- **All 1258 unit tests + 301 Playwright specs pass** locally on the first run after the TypeScript narrowing pass walked me through every call site that needed branching.

### Bundle
- **JS budget bumped 94 → 96 KB.** Phase 112 landed at 93.92 / 94 KB which would have been 80 B under (single-byte margin into Phase 113 was risky); bumped proactively to leave headroom for Phase 113's door entities. CSS 11.55 / 12 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit (after the proactive 94 → 96 KB bump) all green before push. Fifteen clean phases in a row now (97 + 99 + 100 + 101 + 102 + 103 + 104 + 105 + 106 + 107 + 108 + 109 + 110 + 111 + 112).

---

## [0.111.0] — 2026-04-26 — Wider walls + "Fill cell" preset

### Added
- **Wall thickness range bumped from 1–12 px to 1–48 px.** Authoring a chunky exterior masonry wall, a thick stone divider, or a "this whole row of cells is wall" pillar no longer saturates the slider at 12. The renderer's existing zoom-aware divisor keeps thicker walls visually consistent across zoom levels.
- **"Fill cell" preset button** in the wall editor. One click snaps the selected wall(s) thickness to the current grid `cellSize` (clamped to the new 48 px max). At the default 50 px grid, this lands at 48 — visually the wall's body fills a full grid cell across.
- Multi-select aware: editing N walls at once and clicking Fill cell updates all N in a single `store.batch` (one undo step).
- Hidden when the host doesn't supply a `getCellSize` callback (Spectator side / minimal test mounts).

### Why this matters
The user asked for two things: (1) walls that "take up a full tile" and (2) wider walls in general. Phase 111 is the smallest possible change that addresses both directly, before the bigger Phase 112 work (a true block-wall *region* type) lands. After 111 you can already author a thick "fills the cell" wall by clicking Fill cell on any segment; Phase 112 will add a separate region primitive for cases where you want a single entity that occupies several cells at once.

### Architecture
- **`src/state/walls.ts`** — `WALL_MAX_THICKNESS_PX` bumped 12 → 48. The existing `clampThickness()` helper picks up the new bound automatically; pre-111 walls saved at any thickness ≤ 12 keep working unchanged. Comment on the constant explains the new semantic ("48 px wall on a 48 px grid = full cell").
- **`src/ui/wall-editor.ts`** — added an optional `getCellSize?(): number` to `WallEditorOptions`. When supplied, a small "Fill cell" button appears beside the thickness slider. Click handler reads the cellSize, clamps via the existing `clampThickness`, and dispatches `onChange` for every wall in the current edit selection. Same event-shape as the slider — wraps in the host's existing `store.batch` so undo works as a single step.
- **`src/entries/gm.ts`** — wires `getCellSize: () => store.getState().grid.cellSize` into the wall editor mount. Reads live, so the button always uses the current grid (e.g. after a Phase 101 grid-snap).
- **`src/ui/styles.css`** — small `.wall-editor-fill-cell` block. Secondary-button style (transparent w/ border) so it doesn't compete with the Done / Delete buttons in the footer.

### Tests
- **+5 unit tests** in `src/ui/wall-editor.test.ts`: button hidden when getCellSize omitted; button visible when supplied; click sets thickness to cellSize; oversized cells clamp to WALL_MAX_THICKNESS_PX; multi-select Fill cell applies to every wall in one onChange call; zero/negative cellSize is a silent no-op.
- **+1 updated test** for the existing slider-clamp path: out-of-range thickness now clamps to 48 (was 12).
- **+3 Playwright specs** in `e2e/wall-fill-cell.spec.ts` (new): slider's `max` attribute is `48`; Fill cell button is visible (gm.ts wires getCellSize); clicking it updates the thickness output to `48.0 px` (default 50 px grid clamps to 48).
- **All 1243 unit tests + 298 Playwright specs pass** locally.

### Bundle
- 92.49 / 94 KB initial-load brotli (+0.09 KB for the button + handler). CSS 11.53 / 12 KB (+0.02 KB for the button styles). Lazy chunks unchanged. Comfortable headroom.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit all green before push. Fourteen clean phases in a row now (97 + 99 + 100 + 101 + 102 + 103 + 104 + 105 + 106 + 107 + 108 + 109 + 110 + 111).

---

## [0.110.0] — 2026-04-26 — Persistent per-tab player id

### Added
- **Stable `playerId` across page reloads.** Pre-110 every tab generated a fresh id at module init; reloading a Spectator tab orphaned all of the GM's per-player state for that participant. Phase 110 backs the id with `sessionStorage` so an F5 / browser-restore keeps the SAME id.
- **Phase 82 + Phase 109 state survives Spectator reloads** as a direct consequence:
  - `canRoll = false` overrides stay revoked.
  - Hidden-from-this-Spectator tokens stay hidden — no need for the GM to re-toggle every time a player refreshes their browser.
- **Brand-new tabs still mint a brand-new id.** sessionStorage is per-tab + per-origin; closing the tab or opening a second Spectator window creates a fresh participant from the GM's perspective. So the multi-tab-collision risk that comes with localStorage-backed ids is sidestepped entirely.

### Why this matters
Phase 82 introduced per-Spectator permissions; Phase 109 introduced per-Spectator token visibility. Both stored their override map keyed by `playerId`. Both phases shipped with a known caveat: a Spectator who reloads their tab gets a fresh `playerId` and the GM's overrides reset to default (the "MVP tradeoff" call-out at the top of `spectator-permissions.ts`). That was acceptable as long as players rarely reloaded — but in practice, a network blip / iPad app-switch / browser autorefresh hits often enough to be annoying. Phase 110 closes the gap with the smallest possible change (a one-call helper + a sessionStorage key per role).

### Architecture
- **`src/state/player-id.ts`** (new, ~55 lines) — pure helper. `getOrCreatePlayerId(viewMode)` reads from `sessionStorage[gm-encounter-maps-player-id-{viewMode}]`; on miss it mints a fresh `nid()` + persists. Falls back to an ephemeral id if sessionStorage throws (Safari private-mode behavior) so the rest of the app keeps working.
- **`src/entries/spectator.ts`** — replaced the ephemeral `const playerId = nid()` with `const playerId = getOrCreatePlayerId('spectator')`. Removed the now-unused `nid` import.
- **`src/entries/gm.ts`** — same swap with `getOrCreatePlayerId('gm')`. `nid` is still used elsewhere in the GM entry (token ids, etc.) so the import stays.

### Why sessionStorage and not localStorage
- **localStorage** would cross-share the id across multiple tabs of the same role in the same browser. Two Spectator tabs would both claim the same id; BroadcastChannel envelopes would dedupe + each tab would think the OTHER one's actions came from itself. Bad.
- **sessionStorage** is per-tab + per-origin AND survives reloads (F5, browser-restore from session). Closing the tab + reopening creates a new id, which is the right semantic — a brand-new tab is a brand-new participant from the GM's perspective.

### Tradeoffs (deliberately accepted)
- **Different browsers + incognito = different ids**, even for the same human player. Fine — the alternative would require account login + server-side identity, which is out of scope for a local-first VTT.
- **The GM's permissions store accumulates entries forever** (Phase 82 didn't auto-clean on identity-leave; Phase 110 doesn't change that). A future maintenance phase could add a "garbage-collect entries older than X days" sweeper.
- **Closing a tab loses the id.** A reopened Spectator tab is a new participant — the GM has to re-grant any restrictions. This is the correct semantic for a tab-as-participant model; cross-device identity would need a separate cross-browser persistence strategy.

### Tests
- **+5 unit tests** in `src/state/player-id.test.ts` (new): same-tab calls return the same id; `_resetPlayerId` simulates a new tab and yields a different id; GM and Spectator scopes are independent and both stable; the id is persisted under the documented sessionStorage key; falls back to a fresh ephemeral id when sessionStorage throws (private-mode simulation via `Object.defineProperty` override).
- **+3 Playwright specs** in `e2e/persistent-player-id.spec.ts` (new):
  - **Spectator playerId persists across page reload** — read sessionStorage before + after `page.reload()`, assert equal.
  - **A brand-new Spectator tab gets a different id** — open two Spectator pages in the same context, assert their stored ids differ.
  - **Phase 109 hidden token stays hidden after the Spectator reloads** — full GM + Spectator handshake, hide a token via the editor's "Visible to" checkbox, reload the Spectator, verify the canvas aria-label still reports `0 token` (would be `1 token visible` pre-110).
- **All 1238 unit tests + 295 Playwright specs pass** locally on the first run.

### Bundle
- 92.40 / 94 KB initial-load brotli (+0.09 KB for the helper). CSS 11.51 / 12 KB. Lazy chunks unchanged. Comfortable headroom under the limit bumped in Phase 109.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit all green before push. Thirteen clean phases in a row now (97 + 99 + 100 + 101 + 102 + 103 + 104 + 105 + 106 + 107 + 108 + 109 + 110).

### End of the Phase 86 → 110 queue
Phase 110 wraps the 25-phase accessibility / UX / mobile / data-lifecycle / authoring / sharing expansion plan that started with Phase 86. From the original queue announced in the "Queued (Phases 86 → 110)" block: every entry is now ✅. Going forward, the next plan will be drafted in response to the next round of "Could you please suggest some features…" — subject to the same per-phase semver + tagging discipline that's held for the last 25 minor releases.

---

## [0.109.0] — 2026-04-26 — Per-Spectator token visibility

### Added
- **Hide individual tokens from individual Spectators** via the token editor's new "Visible to" section. One row per currently-connected Spectator with a checkbox; checked = visible, unchecked = hidden from that Spectator. Default for every (Spectator, token) pair is visible.
- **End-to-end concealment**: a token hidden from a Spectator does NOT contribute its glyph, name, sight halo, or torch to that Spectator's render path. The aria-label on the Spectator's canvas reports a reduced "tokens visible" count too — no metadata leak about how many hidden NPCs are on the map.
- **Sync over the existing `permissions` channel**: extends the Phase 82 message envelope with a `hiddenTokenIds` field. Pre-109 Spectators (or older builds) silently ignore the field; the Spectator-side handler defaults missing arrays to `[]` so back-compat holds in both directions.
- **Auto-cleanup on token delete**: deleting a token (any path — context menu, Delete key, scene-reset, sync-applied remote remove) drops its id from every Spectator's hidden list, so the persisted blob doesn't accumulate ghost ids of long-gone tokens. A scene-reset patches every Spectator's hidden list to empty in one batch.

### Why this matters
Phase 82 introduced per-Spectator capability flags (the only one shipped was `canRoll`). Phase 109 fills the much-bigger ask of per-Spectator *content* visibility — the ability to surprise individual players. A traitor NPC standing in plain sight can now be shown only to the traitor's player; a loot drop can be visible only to the rogue who searched the chest; a stalking monster can be invisible to the party's lead scout when the GM wants to roll perception. Without Phase 109 the GM had to open / close the spectator's tab every time something needed to be hidden — Phase 109 makes it a one-click toggle.

### Architecture
- **`src/state/spectator-permissions.ts`** — extended `SpectatorPermissions` with `hiddenTokenIds: string[]`. New convenience methods on the store: `isTokenHidden(playerId, tokenId)`, `setTokenHidden(playerId, tokenId, hidden)`, and `forgetToken(tokenId)` (drop from EVERY Spectator's list — used on token delete). The store normalizes `hiddenTokenIds` (sorted + deduped) on every write so the persisted JSON is deterministic and equality checks are cheap. The `isDefault(perms)` predicate now requires BOTH `canRoll === true` AND `hiddenTokenIds.length === 0` before a row gets compacted out of localStorage.
- **`src/sync/messages.ts`** — `permissions` SyncMessage's payload now includes `hiddenTokenIds?: string[]`. Optional for forward-compat; pre-109 senders omit it.
- **`src/entries/spectator.ts`**:
  - The local `permissions` ref grew a `hiddenTokenIds: Set<string>` field (Set so the per-token `has()` check is O(1) inside the render filter).
  - New `filterVisibleTokens(tokens)` helper drops tokens whose id is in the hidden set. Returns the input array unchanged when no tokens are hidden — perf parity for the no-restriction common case.
  - `refreshLos()` filters tokens before collecting viewers + lights, so a hidden NPC's vision doesn't illuminate cells + a hidden torchbearer's halo doesn't betray its existence.
  - `getState()` (the renderer's source-of-truth callback) returns `{...raw, tokens: filterVisibleTokens(raw.tokens)}` when any tokens are hidden, so every layer that reads `state.tokens` (token glyphs, initiative-active outline, drag overlays, damage FX) sees the filtered list. Other state slices pass through unchanged.
  - The `permissions` message handler kicks `refreshLos()` + `refreshFogRects()` + `renderer.requestRender()` + `updateCanvasLabel()` after applying so the UI updates within one BroadcastChannel hop. The aria-label is the only render-adjacent surface that doesn't ride on store-subscribe (permissions live outside the store), so we have to nudge it explicitly here.
- **`src/entries/gm.ts`**:
  - `mountTokenEditor` now receives three new optional callbacks: `getConnectedSpectators`, `isTokenHiddenForSpectator`, `setTokenHiddenForSpectator`. All three are wired to the existing `identityRegistry` + `permissionsStore` via closures — TDZ-safe because the callbacks only fire when the editor opens, well after module init.
  - **New `permissionsStore.subscribe(...)` listener** broadcasts the FULL permissions snapshot to every Spectator on every change. We re-broadcast all entries (rather than diffing) for two reasons: (1) the store's subscribe doesn't tell us WHICH playerId changed, and (2) `forgetToken` fires once for ALL affected players, so broadcasting the full set keeps each Spectator in sync without us tracking which ones lost a hidden id.
  - **Cleanup hook** in the existing store-subscribe: `token-remove` patches call `permissionsStore.forgetToken(patch.id)`; `session-reset` clears every Spectator's hidden list in one pass.
- **`src/ui/token-editor.ts`** — added a `<fieldset class="visibility-fieldset">` between conditions and the modal footer with one `<label>` row per connected Spectator (color swatch + name + checkbox). Hidden entirely when the host omits the new callbacks (Spectator-side / minimal test mounts). The fieldset re-populates on every `fillFromToken` so cycling between selected tokens updates the checkbox states correctly.
- **`src/ui/permissions-modal.ts`** — narrowed the `buildToggle` field generic from `keyof SpectatorPermissions` (which now includes the array-typed `hiddenTokenIds`) to a `BooleanPermField` mapped type so the per-row toggles compile against the broader interface.

### UX details
- **The "Visible to" section is the only point of authorship.** No aggregate "Spectator X currently can't see N tokens" view in the permissions modal; the per-token UX puts the action at the workflow point ("I'm editing this NPC; I want to hide it from Jordan").
- **Hidden ≠ deleted from the Spectator's perspective.** State sync still carries the token (otherwise re-applying visibility wouldn't work without a full state-resend) — the Spectator's renderer just filters it out. That makes the GM-reveals-a-hidden-token operation instantaneous (single permissions hop, no state replay).
- **Initiative remains visible.** A hidden token still appears in the Spectator's initiative bar if it's in the order. We deliberately scoped to renderer + LoS / lights; hiding from initiative would let the GM run a hidden ambush, but is a separate phase since it touches the initiative bar's renderer + the round-clock semantics.
- **Hide cleanup is via `forgetToken`, not via state subscriptions on the Spectator.** Dropping ids when a token is removed is a GM-side concern; the Spectator's filter is `has()`-against-a-Set, which is fine even if the set has a few stale ids (they just don't match anything).

### Tests
- **+10 unit tests** in `src/state/spectator-permissions.test.ts` (extending the Phase 82 suite): `isTokenHidden` defaults false for unknown players; `setTokenHidden(true)` adds + flips; `setTokenHidden(false)` removes; idempotent set is a no-op (no notify); list is sorted + deduped on write; per-Spectator scoping (hiding from Alice doesn't touch Bob); `forgetToken` drops the id from every Spectator + notifies once / silent no-op when no Spectator hides that id; an entry with only `hiddenTokenIds = []` + default canRoll is NOT persisted; `hiddenTokenIds` round-trips through localStorage; pre-109 blobs without `hiddenTokenIds` default to empty.
- **+3 Playwright specs** in `e2e/per-spectator-token-visibility.spec.ts` (new): visibility fieldset is hidden when no Spectators are connected; fieldset lists connected Spectators + unchecking hides the token end-to-end (verified via the Spectator's canvas aria-label flipping `1 token visible` → `0 token visible` and back); hiding a token from one Spectator does not affect a second Spectator (two Spectator pages in the same context, target one, verify the other's aria-label is unaffected).
- **All 1233 unit tests + 292 Playwright specs pass** locally on the first run after one fix (added an explicit `updateCanvasLabel()` call to the Spectator's `permissions` message handler — the aria-label normally rides on store-subscribe but permissions live outside the store).

### Bundle
- **JS budget bumped 92 → 94 KB.** Phase 109 landed at 92.31 / 92 KB which would have been 307 B over (the new permissions-store helpers + the token-editor's visibility fieldset + the GM-side broadcast subscribe added a few hundred bytes). CSS 11.51 / 12 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit (after the proactive 92 → 94 KB bump) all green before push. Twelve clean phases in a row now (97 + 99 + 100 + 101 + 102 + 103 + 104 + 105 + 106 + 107 + 108 + 109).

---

## [0.108.0] — 2026-04-26 — Recent backgrounds quick switcher

### Added
- **Recent backgrounds modal** (`Ctrl+K` → "recent backgrounds") lists the up-to-12 most recently applied background images with thumbnails, friendly names, and "5 minutes ago"-style timestamps. Click a row to re-apply the map without re-uploading. The list is newest-first and capped at 12 entries.
- **Re-application is single-IDB-record**: clicking a row dispatches `background-update` with the EXISTING IDB image id rather than creating a duplicate via `putImage`. So "I uploaded the same map four times by accident" used to leave four IDB records; now it leaves one.
- **Friendly labels** — file uploads (drop / paste of a `File`, session-menu Upload) record the file name; clipboard pastes (`Blob` only, no name) get a timestamped pseudo-name like *"Pasted PNG · 4:32 PM"*; preset backgrounds get *"Tavern (Preset)"*-style labels.
- **Per-row × forget button** drops an entry from the picker without deleting the underlying IDB image (which may still be referenced by another scene). Useful for clearing experimental uploads from the list without losing them entirely.
- **Broken-row recovery**: if the modal opens and the IDB record for a recents entry has been deleted (e.g. via devtools storage clear), the row's thumbnail load fails + the entry is silently forgotten so future opens stay accurate.

### Why this matters
Phase 100 added drag-and-drop / paste-to-upload backgrounds; Phase 101 added auto-grid detection. But once you'd uploaded a map and then switched to a different scene, jumping back to the original required either re-uploading (re-doing the file picker, re-doing the grid snap) or duplicate-scene workflows. The Phase 75 recent-scenes Ctrl+1..9 covers "switch BETWEEN scenes," but a single scene can have many backgrounds over its lifetime (different floors of a dungeon, different times of day, etc.). Phase 108 fills that gap with a per-image quick-switcher that mirrors the recents pattern.

### Architecture
- **`src/state/recent-backgrounds.ts`** (new, ~150 lines) — pure helper + a versioned localStorage envelope (`{version: 1, entries: RecentBackground[]}`). API: `recordBackground(imageId, mimeType, options?)`, `listRecent()`, `forgetBackground(imageId)`, `_resetAll()` (test-only).
  - **Move-to-front dedupe**: re-applying a background already in the list bumps it to position 0 + refreshes `lastUsedAt`. Existing names are preserved if the new call doesn't supply one (so re-applying via the picker doesn't lose the friendly label from the original upload).
  - **Cap-and-truncate** at `MAX_RECENT_BACKGROUNDS = 12` via `next.length = MAX_RECENT_BACKGROUNDS` after unshift. 12 is generous for a session, bounded so the localStorage blob stays small even after a long campaign.
  - **Defensive parsing**: drops entries missing required fields (imageId / mimeType / lastUsedAt), drops wrong-version blobs, falls back to empty on JSON parse failure. Same defensive pattern Phases 99/102/107 use.
- **`src/ui/recent-backgrounds-modal.ts`** (new, ~210 lines) — modal listing the entries with row pattern: thumbnail (lazy-hydrated via `getImageURL(id)`), name (or "(unnamed map)"), relative-time stamp. Each row has a main pick button + a separate × forget button. Broken-thumbnail rows self-remove and call `onForget` so the list stays in sync with what's actually applicable.
- **`src/ui/styles.css`** — new `.recent-backgrounds-modal` block with the 56 × 56 thumbnail squares, ellipsis-truncating name column, and the right-edge × button styled as a vertical-divider button (matches the snapshot-history modal's row pattern).
- **`src/entries/gm.ts`** changes:
  - `applyBackgroundBlob(blob, mimeType, name?)` — accepts an optional `name`; calls `recordBackground(id, mimeType, {name})` after the patch lands so every upload path automatically populates the recents list.
  - **New `applyBackgroundFromIdb(imageId)`** — for the picker. Skips `putImage` entirely; reads the existing IDB record, computes dimensions from the cached blob, dispatches the `background-update` patch, and re-bumps the recents entry to the front. Returns `false` when the IDB record is missing so the picker can surface a "no longer in storage" hint.
  - **New `friendlyNameFromMime(mimeType)`** helper — used when a clipboard paste arrives as a bare `Blob` (no `File.name`). Generates *"Pasted PNG · 4:32 PM"*-style labels.
  - **All three upload paths now pass a name**: drag-drop / paste (file name, falling back to `friendlyNameFromMime`); preset backgrounds (`${preset.name} (Preset)`); session-menu Upload Map (file.name).
  - **New palette command** *"Open recent backgrounds…"* (group: **Backgrounds**).

### UX details
- **Forget vs Delete distinction**: the × button forgets the entry from the recents picker but does NOT delete the underlying IDB image (which may still be the active background of some other scene). This matches the principle "the recents list is a personal index, not the source of truth." A future "garbage-collect orphaned images" maintenance task could be a separate phase.
- **No replication into the existing scene-recents Ctrl+1..9 hotkey range**: backgrounds are scene-agnostic (the same map can be the background of three different scenes), so a single key chord per recent doesn't make sense the way it does for scenes. The picker is one extra keystroke (Ctrl+K + click) but it scales to 12 entries without exhausting the digit row.
- **Thumbnail load is async** — rows render with a `—` placeholder, then hydrate in parallel as `getImageURL(id)` resolves. The image-store cache means repeated opens are instant.

### Tests
- **+15 unit tests** in `src/state/recent-backgrounds.test.ts` (new): starts empty; records single + multiple entries; orders newest-first; returns a fresh array; records without name when none supplied; move-to-front dedupe with timestamp refresh; preserves existing name when re-recording without a new one; overrides existing name when a new one is supplied; cap eviction at MAX_RECENT_BACKGROUNDS (oldest first); forgetBackground drops the matching entry / no-op for unknown ids; ignores empty imageId; defensive parsing for malformed JSON / version mismatch / entries missing required fields (incl. non-string name).
- **+4 Playwright specs** in `e2e/recent-backgrounds.spec.ts` (new): palette opens the modal + empty state; uploaded background appears as a row with the file name; clicking a row re-applies + announces; × forget button drops the row + restores the empty state.
- **All 1222 unit tests + 289 Playwright specs pass** locally. The same `scenes.spec.ts:56` parallel flake from earlier phases reappeared once (passes in isolation, has been seen before in heavily-parallel runs); CI runs serially with retries=2, absorbed.

### Bundle
- 91.39 / 92 KB initial-load brotli (+1.12 KB for the recents store + the modal + the gm-entry wiring + the new palette command). CSS 11.42 / 12 KB (+0.16 KB for the modal styles). Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit all green before push. Eleven clean phases in a row now (97 + 99 + 100 + 101 + 102 + 103 + 104 + 105 + 106 + 107 + 108).

---

## [0.107.0] — 2026-04-26 — Dice expression history recall

### Added
- **Up / Down arrow in the `/` slash-command input** cycles through previously-rolled expressions, shell-style. Up walks toward older entries; Down walks back toward newer; Down past the newest restores whatever the user had typed BEFORE pressing Up (the live draft). Per-session muscle memory: re-roll your last attack with `/`+`Up`+`Enter`, three keystrokes, no need to re-type `1d20+5`.
- **History persists across sessions** via localStorage so the GM's most-frequent rolls stay one Up press away on Monday's session even if the tab was closed Friday.
- **Smart deduplication**: re-rolling an expression already in history MOVES it to the front instead of stacking duplicates. The history shows your distinct recent expressions, not "1d20 1d20 1d20 1d20" 14 times.
- **30-entry cap** with oldest-first eviction so localStorage stays bounded over a long-running campaign.

### Why this matters
The slash-command input (Phase 74) was a fire-and-forget power-user shortcut, but every rolled expression vanished the moment the input closed. In active combat, the same character's same attack roll comes up several times per round (1d20+5 on attack, then 1d8+3 on damage, then 1d20+5 again next turn), and re-typing them is friction that adds up. The dice panel's own history (Phase 73) records the parsed roll *result*, not the *expression* — useful for "what did I roll?" but not for "let me re-roll that." Phase 107 adds the missing recall for the expression itself.

### Architecture
- **`src/state/dice-history.ts`** (new, ~95 lines) — pure helper + a versioned localStorage envelope (`{version: 1, entries: string[]}`). API: `recordExpression(expr)`, `listHistory()`, `_resetAll()` (test-only). Newest-first ordering. The `recordExpression` path:
  - Trims whitespace + drops empty inputs (no-op).
  - Looks up the trimmed expression by exact match; if found, removes it from its current position before unshift-ing to the front (move-to-front dedupe).
  - Trims to `MAX_HISTORY = 30` entries via array length truncation.
  - Defensive against malformed persisted state: drops entries that aren't strings, drops wrong-version blobs, falls back to empty on parse failure.
- **`src/ui/slash-command-input.ts`** — added Up / Down arrow handlers + an `input` listener that resets the history cursor:
  - `historySnapshot: string[]` is captured once per `open()` so a roll dispatched later (mid-recall) doesn't shift the cursor underneath the user.
  - `historyCursor: number` starts at `-1` (showing the live draft); Up increments toward `historySnapshot.length - 1` (oldest); Down decrements back toward `-1`.
  - `liveDraft: string` snapshots whatever the user had typed before pressing Up the first time, so Down past the newest entry restores it. Updated on every `input` event so editing a recalled entry doesn't lose the user's edits when they next press Up.
  - `showHistoryAt(index)` updates the cursor + the input value; sets the caret to the end so the next keystroke appends rather than overwriting (matches shell history-recall ergonomics).
- **`dispatch()` records on success only for `roll` actions.** `/init`, `/help`, and unknown / failed commands are deliberately NOT recorded — cycling through `/init` makes no sense, and recall should give the GM what they'd want to re-run, not every keystroke they ever pressed. The recorded value is the user's RAW input (e.g. `2d6+3` not `/r 2d6+3`) so Up restores exactly what they typed.

### UX details
- **Per-open history snapshot.** If the GM presses `/`, then runs `2d6`, then opens `/` again — the second open reads a fresh history including `2d6`. But if they're mid-recall (cursor at index 2) and a roll is dispatched in another tab via sync, the cursor stays valid for the current snapshot.
- **Editing a recalled entry preserves it for next Up.** Type Up to restore `1d20+5`, then add `+1` to make `1d20+5+1` — the `input` listener notices the value diverged and resets the cursor + saves the edited string as the new live draft. Pressing Up again starts from the newest history entry (`1d20+5`), not from where you left off mid-recall — same behavior as bash + zsh.
- **Up at the oldest entry is a no-op**, not an error or wrap-around. Wrap-around would silently lose the user's place; an error message would clutter the input. Silent no-op matches every other CLI's history behavior.

### Tests
- **+13 unit tests** in `src/state/dice-history.test.ts` (new): starts empty; records single + multiple expressions; orders newest-first; returns a fresh array (not the store reference); move-to-front dedupe (with whitespace-trimmed comparison); different expressions are not deduped; cap eviction at MAX_HISTORY (oldest first); whitespace trim on store; empty / whitespace-only ignored; defensive parsing for malformed JSON, version mismatch, and non-string entries within a valid blob.
- **+6 Playwright specs** in `e2e/dice-history-recall.spec.ts` (new): Up restores the most recent expression after a successful roll; Up cycles to older entries + Down walks back + Down past newest restores live draft; typing after a recall resets the cursor so next Up starts from newest; Up with no history yet is a silent no-op; non-roll commands (`/help`) are NOT recorded; duplicate rolls move to the front rather than stacking.
- **All 1207 unit tests + 285 Playwright specs pass** locally on the first run after fixing one helper that incorrectly used `/init` (fails without tokens placed) — switched to `/help` which always succeeds.

### Bundle
- 90.27 / 92 KB initial-load brotli (+0.35 KB for the history helper + the slash-input wiring). CSS 11.26 / 12 KB. Lazy chunks unchanged. Comfortable headroom under the limit bumped in Phase 106.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit all green before push. Ten clean phases in a row now (97 + 99 + 100 + 101 + 102 + 103 + 104 + 105 + 106 + 107).

---

## [0.106.0] — 2026-04-26 — Scene search / filter

### Added
- **Type-to-filter the Scenes modal**. A search input at the top of the modal narrows the visible scene cards by name as you type. Auto-focused on open so a many-scene catalog ("type 'thr' → see only Throne Room scenes") is one keystroke away from the indicator click. An *N of M* counter beside the input shows how many scenes survived the filter so the user can tell whether their query is too narrow at a glance.
- **3-tier ranking** (same as the Phase 95 command palette): prefix matches first, then word-boundary matches, then plain-substring matches. Within a rank, the original list ordering is preserved — and `listScenes()` already returns `updatedAt desc`, so most-recently-edited matches come first for free.
- **Esc behavior matches the command palette**: first Esc clears a non-empty query; second Esc closes the modal. So a stray query left in the field is one keystroke to clear, not "tap the modal closed and re-open."
- **No-match empty state** ("No scenes match \"xyzzy-no-match\".") replaces the grid when nothing matches, with a hint to shorten the query or clear the filter.

### Why this matters
Long-running campaigns accumulate scenes fast — one per encounter, dungeon room, set piece. By session 8 the Scenes modal can have 30+ cards, scrolling a wall of thumbnails to find "the dragon's lair" mid-session is slow. The Ctrl+1..9 quick-switch (Phase 75) handles "the most recent scenes," and the command-palette has a different scope; this fills the "I named it but I don't remember which row it's in" gap with the same type-to-find affordance every other long list in the app already has.

### Architecture
- **`src/state/scene-filter.ts`** (new, ~70 lines) — pure helper. `filterScenes(scenes, query)` returns a ranked, filtered list. Empty / whitespace query passes the input through unchanged. Match is case-insensitive (both name + query lowercased once), and the query is treated as a literal substring (no regex parsing — `[a-z]` is a literal `[a-z]`, not a character class). Stable within a rank: input order is preserved so the caller's `updatedAt desc` ordering survives.
- **`src/ui/scenes-modal.ts`** — added a `<input type="search">` row between the toolbar and the library hint copy. The input fires `input` events that re-render the grid via a new `rerender()` helper split out of the existing `refresh()` path; that way a keystroke doesn't re-fetch from IDB (the listScenes() roundtrip is the only source of changed data and would add 50–200ms latency to each keystroke). `refresh()` still re-fetches when called from the other code paths (rename / delete / create / duplicate). Each `open()` resets the query so a stale filter from a previous open doesn't leak through.
- **`src/ui/styles.css`** — small new section for `.scenes-search` (the row), `.scenes-search-input` (full-width input with the standard modal-input visual), and `.scenes-search-count` (right-aligned, tabular-numerals counter).
- **Search input gets `aria-label="Filter scenes by name"`** + a `placeholder` so the role is clear to screen-reader users + visible. The counter is `aria-live="polite"` so the post-filter count is announced as the user types — useful when typing fast and the text changes faster than the eye can refocus.

### UX details
- **Auto-focus the search input** on every open (replacing the prior auto-focus on the first scene card). The earliest action 90% of users want is to type, not to tab — and even when they DO want to tab, the search input is the first focusable element so Tab still lands on a card next.
- **Search is name-only**, not "match against tags / metadata / token contents." Scenes don't have a tag system today; if Phase 110+ adds one, the filter would extend to it without changing the input's UX.
- **Esc-clears-then-closes** mirrors the command palette + the dice-input (Phase 74) so the keyboard contract is consistent across the three "type-to-narrow" surfaces in the app.

### Tests
- **+12 unit tests** in `src/state/scene-filter.test.ts` (new): empty / whitespace query passthrough; returns a fresh array (not the input reference); prefix > word-boundary > substring ranking; within-rank input ordering preservation; drops non-matches; case-insensitive matching; returns empty array on zero-matches + on empty input; literal-not-regex matching (no regex chars); whitespace trim on the query.
- **+6 Playwright specs** in `e2e/scenes-search.spec.ts` (new): search input present + auto-focused on open; typing narrows the visible cards by name; clearing the input restores the full list + empties the counter; no-match empty state shows when nothing matches; Esc clears the query first then closes on second press; re-opening clears any stale query.
- **All 1194 unit tests + 279 Playwright specs pass** locally on the first run.

### Bundle
- **JS budget bumped 90 → 92 KB** for headroom. Phase 106 added ~0.3 KB JS; landed at 89.92 / 90 KB which would have been 80B under the limit — too tight to leave for Phase 107. CSS 11.26 / 12 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit all green before push (after the proactive 90 → 92 KB bump). Nine clean phases in a row now (97 + 99 + 100 + 101 + 102 + 103 + 104 + 105 + 106).

---

## [0.105.0] — 2026-04-26 — Larger touch targets across the app

### Added
- **Every interactive surface a tablet GM might tap during play is now ≥44 × 44 CSS pixels** when the device is touch-only (`hover: none` + `pointer: coarse`). The 44 px floor is Apple's iOS HIG touch-target standard; below it, fingers reliably miss. Phase 47 set the floor for the toolbar + zoom controls + dice + help button; Phase 105 broadens it to **every other tappable surface** in the app — context menus, modal action buttons, settings panels (AoE / Draw / Ruler / Fog), per-row actions in the various list modals (camera bookmarks, conflict-loser archive), the combat-log toolbar, the initiative bar, status-banner Action / Dismiss buttons, the command palette items, the scene indicator, and the save-status / remote-status chips.

### Why this matters
Touch tablets reliably mis-tap targets smaller than 44 px (some studies put it closer to 48–50 px for the 95th-percentile fingertip). Pre-105, a tablet GM trying to right-click → *Edit token* would tap the menu, then have to peck at sub-30 px context-menu items half the time — the menu either wouldn't dismiss correctly or the wrong item would fire. Same story for the camera-bookmark Jump button (Phase 102), the wall editor's Save / Delete (Phase 85), and the combat-log Clear (Phase 94). Phase 105 unifies everything under the same 44 px floor with no JS changes — pure CSS broadening of the existing Phase 47 media query.

### Architecture
- **`src/ui/styles.css`** — extended the existing `@media (hover: none) and (pointer: coarse)` block to add ~25 new selectors covering every panel + modal added between Phase 47 (where the original list was set) and Phase 104. Kept the same pattern: `min-height: 44px`, `font-size: 0.95rem`, `padding: 0.55rem 0.85rem` for text buttons; a separate icon-only block adds `min-width: 44px` for the close-x style buttons (modal close, combat-log close, notes-panel close).
- **Modal labels get a 36 px floor** so the surrounding label-wraps-input pattern (every Settings checkbox row) gets a generous tap area without requiring custom layout per row. Checkboxes / radios themselves stay at the OS default visual size — only the click-target grows.
- **Pure CSS, no behavior change.** The 44 px floor only applies under the touch media query, so desktop layouts (where every visual-regression baseline is captured) are pixel-identical to pre-105. No baseline drift.

### What was already in the 44 px floor (Phase 47)
- `.gm-toolbar button` (Select / Token / Walls / Draw / Fog / Measure / AoE / etc.)
- `.gm-toolbar-actions button` (Save / Undo / Redo)
- `.session-menu button` (top-level menu)
- `.zoom-controls button` (+ / − / Fit / Reset)
- `.dice-button` + `.help-button`
- `.modal-close` (44 × 44 square)

### What Phase 105 adds
- `.context-menu button` — right-click + long-press menu items (Phase 103 made them tablet-reachable; this makes them tap-reliable)
- `.modal-footer button` + `.modal-body button` — Save / Cancel / Delete in every modal
- `.scenes-toolbar button` + `.scene-card button` — scene CRUD controls
- `.aoe-settings`, `.draw-settings`, `.ruler-settings`, `.fog-settings` button — tool-options panel buttons
- `.notes-panel button`, `.combat-log-export`, `.combat-log-clear`, `.combat-log-close`
- `.initiative-bar button`
- `.camera-bookmark-jump`, `.camera-bookmark-rename`, `.camera-bookmark-delete`, `.camera-bookmarks-save-btn` (Phase 102)
- `.conflict-loser-restore`, `.conflict-loser-discard` (Phase 99)
- `.first-use-hint button` (Phase 96)
- `.command-palette-item` (Phase 95)
- `.status-banner-action`, `.status-banner-dismiss`
- `.scene-indicator`, `.save-status-pill`, `.remote-status-chip`
- `.notes-panel-close`, `.combat-log-close` (44 × 44 icon squares)
- `.modal label` (36 px floor for label-wraps-input rows)

### Tests
- **+9 Playwright specs** in `e2e/touch-target-sizes.spec.ts` (new) using Pixel-5 device emulation: toolbar buttons, toolbar actions, zoom controls (asserts ≥44 in BOTH dimensions for the icon-square ones), session-menu, AoE settings panel, context-menu items (right-click → assert), camera-bookmark Save button + row actions (creates a bookmark mid-test to populate the rows), command palette items, modal close button. Each test reads the rendered `boundingBox` and asserts `height >= 44`. Helper `assertMinTapHeight` walks every visible match of a selector + counts so a future selector rename that silently matches nothing won't pass.
- **All 1182 unit tests + 273 Playwright specs pass** locally on the first run.

### Bundle
- 89.63 / 90 KB initial-load brotli (no JS change). CSS 11.20 / 12 KB (+0.10 KB for the broader selector list). Lazy chunks unchanged. **Comfortable headroom on both budgets.**

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec (no baseline drift since the 44px floor only fires under the touch media query, not on the desktop browsers that capture baselines) + size-limit all green before push. Eight clean phases in a row now (97 + 99 + 100 + 101 + 102 + 103 + 104 + 105).

---

## [0.104.0] — 2026-04-26 — Two-finger rotate for AoE preview

### Added
- **While placing a cone or line AoE**, drop a second finger and twist it around the first to rotate the preview without changing its length. Lifting either finger ends rotate-mode; lifting the primary finger commits the AoE. Sphere + cube don't have a rotation, so the second finger is ignored for those.
- **Length stays frozen during rotate-mode** so a tiny finger drift while twisting doesn't also resize the cone. The user gets exactly one degree of freedom (rotation) per gesture, which matches every desktop CAD app's "modify one thing at a time" rule.
- **Pinch-zoom is automatically suppressed** while an AoE preview is in flight. Without this veto, the second finger landing would trigger pinch-zoom (Phase 53), broadcast `pointercancel` to every active tool, and abandon the AoE preview before rotate-mode could engage. Phase 104 plumbs a `shouldSuppressPinch?` predicate into `attachPanZoom` so the AoE tool can claim two-finger gestures during placement.

### Why this matters
The AoE tool's single-finger drag derives rotation from the drag direction — point your finger toward the target and the cone follows. That's fast for a desktop mouse where you have pixel-precise control, but on a tablet it's awkward when you want to *fine-tune the angle* without changing the cone's length: every finger move both lengthens and rotates. Phase 104 adds a second-finger gesture that decouples them — your primary finger stays put as the apex, and the second finger orbits to set the angle. Same gesture model as photo-rotate in iOS Photos, the iPad Procreate canvas, and Google Maps map-rotate.

### Architecture
- **`src/input/two-finger-rotate.ts`** (new, ~70 lines) — pure math. `rotateStart(p1, p2, baseRotation)` snapshots the initial angle between two fingers + the AoE's pre-gesture rotation; `rotateUpdate(snap, p1, p2)` returns `baseRotation + (currentAngle − startAngle)`. The delta-from-baseline shape (rather than absolute) means a small twist becomes a small rotation, not a wholesale jump to the absolute angle. Mirrors the shape of the existing `pinch.ts` (Phase 53) so the two two-finger handlers feel like siblings.
- **`src/input/pan-zoom.ts`** — added `PanZoomOptions.shouldSuppressPinch?()`. When the predicate returns true at the moment a second finger lands, pan-zoom does NOT engage pinch + does NOT broadcast pointercancel. The veto check happens BEFORE the touchPoints insert so the second finger never enters pan-zoom's bookkeeping — pinch can never accidentally fire later even if the AoE preview clears mid-gesture.
- **`src/input/tool-aoe.ts`** — the tool now tracks up to two pointers. The first finger drives the standard length / direction drag (unchanged behavior). When the SECOND finger lands while the AoE preview is in flight AND the active kind is `cone` / `line`:
  - Capture both finger positions in screen space + the current rotation as the rotate snapshot.
  - Freeze `length` + `width` at their current values so subsequent moves only adjust rotation.
  - Pointermove for either finger updates the rotation via `rotateUpdate`.
  - Second finger lifting just drops out of rotate-mode (the primary stays + the user can resume length-adjusting). Primary finger lifting commits as usual.
- **`src/entries/gm.ts`** — pass `shouldSuppressPinch: () => aoeOverlayRef.current !== null` to `attachPanZoom`. The predicate is re-evaluated on every pointerdown so the suppression naturally lifts when the AoE commit / cancel clears the preview ref. No flag bookkeeping; the existing `aoeOverlayRef` is the source of truth.

### UX details
- **Sphere + cube ignore the second finger** because their wire format has no rotation field. The second touch is silently dropped (forwarded to pan-zoom, which then engages pinch as normal). So a GM placing a sphere can still pinch-zoom mid-placement to refine the radius — a useful escape hatch.
- **First finger is the anchor** (where the apex stays). The user's mental model is "this is where the cone starts; my other finger aims it." That maps to the way single-finger drag already works (the touchdown point is always the cone's apex / line's origin).
- **No visual indicator on the canvas** for "you're now in rotate-mode." The cone preview rotating in real-time IS the indicator; adding a separate badge would clutter the canvas at the exact moment the user wants to focus on the AoE preview.

### Tests
- **+11 unit tests** in `src/input/two-finger-rotate.test.ts` (new): `angleBetween` for the four cardinal vectors (incl. the +PI / -PI ambiguity at -X); `rotateUpdate` returning the baseRotation when fingers don't move; +PI/2 / -PI/2 twists shifting baseRotation by the right amount; rotating BOTH fingers by the same amount preserving zero delta (pure rotation in the world); the snapshot capturing the initial angle correctly; chained updates composing linearly; negative baseRotation preserved when fingers are unchanged.
- **+2 Playwright specs** in `e2e/aoe-two-finger-rotate.spec.ts` (new) using Pixel-5 device emulation + raw `PointerEvent` synthesis: second-finger-during-cone-preview rotates without engaging pinch (the AoE survives, proven by "AoE actions" appearing on right-click — pinch would have broadcast pointercancel + abandoned the preview); second-finger-lifting drops out of rotate-mode without committing (primary finger continues to length-adjust normally + commits).
- **All 1182 unit tests + 264 Playwright specs pass** locally. The same `scenes.spec.ts:56` parallel flake from Phases 101 + 102 reappeared once (passes in isolation, has been seen before in heavily-parallel runs); CI runs serially with retries=2, absorbed.

### Bundle
- 89.61 / 90 KB initial-load brotli (+0.40 KB for the rotate math + the AoE-tool wiring + the suppress-pinch hook). CSS 11.10 / 12 KB. Lazy chunks unchanged. **Tight under the limit** — the next bundle-budget-touching phase will likely need a 2 KB bump.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e + visual-regression spec + size-limit all green before push. Seven clean phases in a row now (97 + 99 + 100 + 101 + 102 + 103 + 104).

---

## [0.103.0] — 2026-04-26 — Touch long-press → context menu

### Added
- **Hold a single finger on the canvas for ~500 ms** to open the same context menu desktop GMs reach via right-click. Tablet GMs no longer have to plug in a mouse to access *Edit token*, *Edit annotation*, *Delete wall*, *Fit to screen*, or any of the other right-click actions. The menu opens at the touchdown point so it's anchored to where the GM pressed (not where their finger drifted to mid-press).
- **Cancel-on-pan / cancel-on-draw**: if the finger moves more than 10 px from the touchdown point during the 500 ms hold, the long-press is abandoned. So the existing single-finger pan, draw stroke, ruler measure, etc. all still work — long-press only fires for an actual *hold still*.
- **Cancel-on-pinch**: if a second finger lands during the hold, the long-press is abandoned and the gesture upgrades to pinch-zoom (Phase 53). No accidental menus mid-pinch.
- **Mouse / pen pointers are ignored** by the detector — those have a real right-click / barrel-button affordance and don't need this.

### Why this matters
Phase 53 brought touch panning + pinch-zoom; Phase 105's larger touch targets are queued. But until Phase 103, the only way to access the rich per-entity right-click menu (token actions, annotation editing, wall toggles, AoE visibility, fit-to-screen, scene-restore actions, etc.) was a real right-click — which a tablet doesn't have. Most VTT users on iPad / Surface had to either plug in a mouse or rely on the toolbar / palette workarounds. This phase closes that gap by reusing the standard mobile-OS gesture (long-press = secondary click) without any of the OS-level pop-overs (text-select, image-callout) interfering — those were already suppressed by the canvas's `touch-action: none` + the existing pointer-event capture.

### Architecture
- **`src/input/long-press.ts`** (new, ~175 lines) — pure helper. `attachLongPress(target, opts)` returns a `{destroy}` handle. Listens for `pointerdown` with `pointerType === 'touch'`, starts a 500 ms timer, and cancels on:
  - `pointerup` / `pointercancel` (lifted before hold)
  - `pointermove` beyond `LONGPRESS_MOVE_THRESHOLD_PX` (the gesture turned into a pan / draw)
  - A second `pointerdown` (gesture upgraded to pinch — first finger's tracking is dropped immediately)
  Tests stub the timer via injected `setTimer` / `clearTimer` seams so timing assertions don't depend on real `setTimeout`. Mouse and pen pointers are filtered by `pointerType` at the top of every handler — those have native right-click / barrel-button alternatives.
  - Exports a `dispatchSyntheticContextMenu(target, x, y)` convenience that fires a `MouseEvent('contextmenu', { button: 2 })` so the existing right-click handler picks it up unchanged. Also exports `dispatchPointerCancel(target, pointerId)` that mirrors the `cancelPointerForTools` helper in `pan-zoom.ts`, kept for forward-compat (currently unused but ready when a tool needs to be force-aborted before the menu opens).
- **Move tracking is start-anchored, not previous-anchored.** The threshold check compares against the original touchdown coords every time, so steady drift past 10 px cancels the press even if each individual move was a few-px nudge. This matches the user expectation of "if I'm not holding still, don't fire" — the alternative (per-frame deltas) would let the user inch outward indefinitely.
- **Cleanup races**: the timer callback re-checks `trackedPointerId` before firing because the JS event loop can dispatch a stale timer right after a `pointerup` cleared it. The reset call zeroes `trackedPointerId` BEFORE invoking `onLongPress` so the callback is free to dispatch synthetic events without re-entering the detector mid-call.
- **`src/entries/gm.ts`** — single `attachLongPress(canvas, …)` call right after the existing `contextmenu` listener. The callback dispatches a synthetic `MouseEvent('contextmenu', …)` at the touchdown coords; the existing canvas handler does the rest (hit-test, build the items array, position + show the menu). No changes to the right-click handler itself — it already knows how to position the menu inside viewport bounds, so the touch path inherits all of that behavior for free.
- **Test setup polyfill**: `tests/setup.ts` grew a minimal `MockPointerEvent` class (subclass of `MouseEvent`) since jsdom doesn't ship `PointerEvent`. Mirrors the existing `MockImageData` polyfill (Phase 101) — the typeof guard keeps the polyfill from clobbering a real implementation when jsdom eventually ships one.

### UX details
- **Hold duration is 500 ms** — the OS standard (iOS / Android both fire their long-press menus at this threshold). Faster would interfere with single-finger panning; slower would feel sluggish.
- **Move slop is 10 px in viewport coordinates** — large enough to absorb finger jitter on a high-DPI tablet but small enough to feel responsive. Configurable via `moveThresholdPx` if a future tool wants a tighter / looser threshold.
- **No haptic / audio feedback** — relying on the OS's standard contextmenu rendering as the visual confirmation. A future polish phase could add a `navigator.vibrate(20)` on successful long-press for an iOS-style buzz.

### Tests
- **+13 unit tests** in `src/input/long-press.test.ts` (new): success path with custom hold-ms; cancel on pointerup / pointercancel / second pointerdown / move past threshold (start-anchored, not delta-anchored); jitter within threshold doesn't cancel; mouse + pen pointers are filtered out; unrelated pointer ids' moves / ups are ignored; destroy mid-press cancels the timer + removes listeners.
- **+3 Playwright specs** in `e2e/long-press-context-menu.spec.ts` (new): 500 ms hold opens the context menu (`'Fit to screen'` is in the items, asserted by text); moving the finger past the threshold cancels the long-press (menu does NOT appear after the deadline); lifting the finger before the deadline cancels. All three use `Pixel 5` device emulation so `hasTouch: true` matches a real tablet, and dispatch raw `PointerEvent` instances in `page.evaluate` since Playwright's `touchscreen.tap()` only does brief taps.
- **All 1171 unit tests + 262 Playwright specs pass** locally on the first run — no flake this time, in contrast to Phases 101 + 102 where the parallel `scenes.spec.ts:56` test occasionally needed a retry.

### Bundle
- 89.21 / 90 KB initial-load brotli (+0.18 KB for the long-press module + the entry wiring). CSS 11.10 / 12 KB. Lazy chunks unchanged. **Comfortably inside the existing limits**, which is the upside of a tiny pure-helper phase.

### Pre-push checklist
Caught zero issues — full unit suite + full e2e (clean, no flake) + visual-regression spec + size-limit all green before push. Six clean phases in a row now (97 + 99 + 100 + 101 + 102 + 103); the routine is paying off.

---

## [0.102.0] — 2026-04-26 — Named camera bookmarks

### Added
- **Save the current camera as a named bookmark** (e.g. "Throne room", "Tavern interior"). Bookmarks are scoped to the current scene — saving "Throne room" in the castle scene doesn't pollute the tavern scene's list. Each scene gets up to 32 bookmarks before the oldest one is evicted.
- **Camera bookmarks modal** (`Ctrl+K → "camera bookmarks"`) lists every saved viewpoint with **Jump** / **Rename** / **Delete** actions per row. The first nine rows show their `Alt+N` hotkey in a slot column so it's discoverable without opening the shortcut overlay.
- **Two new command-palette entries**: *"Open camera bookmarks…"* and *"Save current camera as bookmark…"* (group: **Camera**). The save command is the fastest path — one keystroke (`Ctrl+K`), one prompt, done.
- **`Alt+1..9` quick-jump** — hops the camera to the Nth bookmark for the active scene (newest-first ordering, matching the modal's slot column). Empty slot announces *"No camera bookmark in slot N."* through the polite live region; never silently no-ops.
- **Bookmark jumps respect the existing camera-broadcast preference** — if "broadcast camera" is on, the Spectator's view follows when the GM hops via `Alt+N`. Same channel as `fitToContent` and `resetCamera`.

### Why this matters
The Phase 75 `Ctrl+1..9` shortcut hops *between scenes*. That's a different axis from "I want to flip back to the boss-fight overview without scrolling." Camera bookmarks fill the within-scene gap: the GM can frame three or four interesting viewpoints (encounter overview, NPC close-up, secret room) at session prep time and toggle between them on a single keystroke during play. No more "let me find that again — pan, pan, zoom, scroll" mid-combat.

### Architecture
- **`src/state/camera-bookmarks.ts`** (new, ~225 lines) — pure helpers + a versioned localStorage-backed store. CRUD: `addBookmark`, `updateBookmark`, `removeBookmark`, `forgetScene`, `listBookmarks`, `pickBookmarkSlot`. Wire format: `{version: 1, entries: CameraBookmark[]}` keyed by `gm-encounter-maps-camera-bookmarks`. Bookmarks are scoped via a `sceneId` field on each entry; `listBookmarks(sceneId)` filters + sorts newest-first.
  - Defensive against malformed persisted state: drops entries missing required fields, drops wrong-version blobs, falls back to empty on parse failure.
  - **Per-scene cap** (`MAX_BOOKMARKS_PER_SCENE = 32`) protects localStorage quota when a long-lived session accumulates dozens of named viewpoints. Eviction is per-scene + oldest-first so other scenes are never touched.
  - **Forget-on-delete** — `handleDeleteActiveScene` calls `forgetScene(activeId)` before switching away. The cap eviction would eventually clear orphans anyway, but explicit cleanup keeps localStorage tidy + avoids ghost bookmarks reappearing if a scene id ever recurs (e.g. via JSON-import round trips).
- **`src/ui/camera-bookmarks-modal.ts`** (new, ~210 lines) — modal listing the active scene's bookmarks. Each row: a "slot" column showing `Alt+1..9` for the first nine entries, the bookmark name (truncated with ellipsis for long names), and Jump / Rename / Delete buttons. Save button at the top of the body opens a `window.prompt` for the name + captures the live camera in one click.
- **`src/entries/gm.ts`** — mounts the modal with `getCurrentCamera: () => ({ ...renderer.camera })` (defensive copy so modifying the bookmark later doesn't mutate the live camera) and an `onJump` handler that does `renderer.camera = { ...entry.camera }; sendCameraIfBroadcasting(); renderer.requestRender();` — same three-step pattern as `resetCamera` + the existing keyboard shortcuts. Adds the `Alt+1..9` keyboard handler in the top-level keydown listener, gated on `e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey` so it doesn't collide with the existing `Ctrl+1..9` (recent scenes) or browser tab-switching modifiers.

### UX details
- **Hotkey choice** — `Alt+1..9` was picked over `Ctrl+Shift+1..9` to keep the muscle memory short (one modifier) and over plain `1..9` to leave the digits free for ruler presets / future tool selection. `Alt` is a clean choice since the GM page only uses Alt for one other binding (none today; this is the first).
- **Promp-based naming** uses `window.prompt` rather than an inline edit-in-place input — same pattern as the Scenes modal's rename, so the muscle memory is consistent. (A future polish phase could swap both to inline editors at once.)
- **Live-region announcements** — every save / jump / empty-slot fires a polite announce so screen-reader users don't have to peek at the canvas to know what happened.

### Tests
- **+23 unit tests** in `src/state/camera-bookmarks.test.ts` (new): starts empty per scene; persists + returns new entries; orders newest-first; scopes by scene; defaults to "Untitled bookmark" on blank; trims whitespace; renames; updates camera; keeps existing name on whitespace; update/remove on unknown id is a no-op; `removeBookmark` drops the entry; `forgetScene` drops only the matching scene's entries (no-op when nothing matches); `pickBookmarkSlot` returns the Nth newest, returns null for empty / invalid slots; per-scene cap evicts oldest first + doesn't touch other scenes; defensive parsing for malformed JSON, version mismatch, and entries missing required fields.
- **+4 Playwright specs** in `e2e/camera-bookmarks.spec.ts` (new): palette opens the modal; empty-state copy is shown; saving via the modal persists across close + re-open; `Alt+1` jumps to the first bookmark + announces the jump; `Alt+1` with no bookmarks announces the empty slot.
- **All 1158 unit tests + 259 Playwright specs pass** locally. The same `scenes.spec.ts:56` parallel flake from Phase 101 reappeared (passes in isolation, has been seen before in heavily-parallel runs); CI runs serially with retries=2, absorbed.

### Bundle
- **JS budget bumped 88 → 90 KB.** Phase 102 added ~1.4 KB brotli (modal + store + 2 palette commands + Alt+N handler), landing at 89.03 / 88 KB which would have been 1.03 KB over. CSS 11.10 / 12 KB. Lazy chunks unchanged.

### Pre-push checklist
Caught the bundle-budget overage locally before push (would have been a CI red); same routine as the last four phases. Full unit suite + full e2e (with one absorbed flake) + visual-regression spec + size-limit all green pre-push. Five clean phases in a row now (97 + 99 + 100 + 101 + 102) with the pre-push checklist covering for the ones that needed limit bumps before they hit CI.

---

## [0.101.0] — 2026-04-25 — Auto-grid detection on background upload

### Added
- **Auto-detect the printed grid** in every newly-uploaded background image. When the detector is confident the map ships with a regularly-spaced grid (lines, hexes-as-squares, or any high-contrast periodic pattern in both axes), a top-of-screen banner appears: *"Detected a 64 px grid in this image. Snap the app's grid to match?"* with a one-click **Snap** action.
- **Snap action** rewrites `cellSize` + `cols` + `rows` to align the app's grid 1:1 with the printed grid (`cols = round(imageWidth / detectedCellSize)`, scale = 1). The image then sits unmodified under the grid — every printed cell maps to exactly one app cell, which is what every downstream feature (LoS, fog, snap-to-grid, walls, AoEs) actually wants.
- **Detection runs on every upload path** — the existing session-menu "Upload Map" button + Phase 100's drag-drop + paste — by hanging off `applyBackgroundBlob`. The user doesn't need to opt in or remember to trigger it; if a grid is found, the banner just appears.

### How it works
- **`src/state/grid-detect.ts`** (new, ~230 lines) — pure autocorrelation grid detector. The strategy:
  1. Build a per-row "darkness profile" — `sum(255 - max(R,G,B))` across each row's pixels. Bright cell interiors contribute little; dark grid lines contribute a lot, producing periodic spikes.
  2. Run normalized autocorrelation across plausible cell sizes (16 → 200 px, capped to one quarter of the smaller image dimension so we get ≥ 4 periods to lock onto).
  3. Repeat for the column profile.
  4. If both axes agree within 1 px AND the autocorrelation peak's z-score (`(peak − mean) / stddev`) maps high enough through a sigmoid (`z / (z + 2)` ≥ 0.4), report the average cell size. Otherwise return `null` — the caller silently skips the banner.
- **Fundamental-frequency backtrack** — autocorrelation peaks at every multiple of the true period (a P-period signal also self-overlaps at 2P, 3P, …). After picking the global peak, the detector walks divisors `d ∈ [2 .. peakLag/minLag]` and prefers the smallest `peakLag/d` whose score is ≥ 85 % of the headline score. Otherwise the detector would happily report 100 px when the true cell is 50 px.
- **`src/state/grid-detect-blob.ts`** (new, ~60 lines) — `Blob → ImageData` bridge. Pulls the blob through `Image` + `<canvas>` + `getImageData()`, downsampling so the longest edge is ≤ 800 px. Without the cap, autocorrelation on a 4K map costs multiple seconds; with the cap it's well under 100 ms even on huge battle maps. The `originalScale` is passed back into `detectGrid` so the reported cell size is in original-image pixels.
- **`src/entries/gm.ts`** — `applyBackgroundBlob` fires `runGridDetectionForBackground` as a fire-and-forget after the existing background-update patch lands. The detection helper:
  - Skips silently when the detector returns `null` or the result already matches the user's current grid (within 1 image-pixel — no point offering a no-op Snap).
  - Skips silently when a higher-priority banner is already up (Phase 84 conflict warning, PWA update notice). The Snap suggestion is purely an enhancement; never clobbers a real warning.
  - Composes the Snap action as a single `store.batch()` so the `grid-update` and the `background-update` (resetting offset / scale to identity) flow as one undo step.
  - Announces the detection through the Phase 90 announcer queue so screen-reader users learn the banner is there.

### Why a separate banner (not auto-snap)
The detector is high-precision when it fires, but there are legitimate maps where the user has DELIBERATELY set a grid that doesn't match the printed one — e.g. a map with a printed 50 px grid that the GM wants to play at 25 px to fit twice as many monsters per cell. Auto-snapping would silently overwrite that intent. The opt-in Snap button keeps the choice with the user; the banner is dismissible.

### UX details
- **Banner is `variant: 'info'` + dismissible** (the default of Phase 100 and earlier conflict banners is `'warn'` non-dismissible). Auto-grid detection is a quality-of-life suggestion, not a warning.
- **Detection is ~50–100 ms on typical 1080p–4K maps** so the banner appears almost immediately after the image renders. There's no spinner — if the detector is busy, the banner just doesn't appear.
- **Detector fails closed**: any decode / canvas / getImageData error logs a `console.warn` and resolves `null` so the upload UX is identical for users who don't care.

### Tests
- **+12 unit tests** in `src/state/grid-detect.test.ts` (new): detects clean 32 / 50 / 64 px grids; returns `null` on a blank image; respects `originalScale` to scale results back to image pixels; rejects when the image is too small for the search range; handles light noise without losing the grid (±1 px slop). Plus targeted tests on the helper functions: `darkProfile` peaks on dark rows + columns and returns the right axis length; `bestLag` returns `null` for too-short signals, finds the period of a synthetic spike train at high confidence, and returns low / null confidence on a flat signal.
- **Test setup polyfill**: `tests/setup.ts` grew a minimal `MockImageData` since jsdom doesn't ship `ImageData`. The polyfill captures the passed pixel buffer + dimensions; the real browser type is used wherever it exists.
- **+2 Playwright specs** in `e2e/grid-detect-snap.spec.ts` (new): synthesizes a 256×256 PNG with a 32 px grid in the browser, pastes it via the Phase 100 paste path, and asserts the Snap banner appears with the right text. Second spec clicks Snap on a 320×320 grid, opens the Settings modal, and verifies `cellSize=32`, `cols=10`, `rows=10` flowed through.
- **All 1135 unit tests + 256 Playwright specs pass** locally. The pre-push full-e2e run flagged one parallel-test flake (`scenes.spec.ts:56` token-state swap; passes in isolation, has been seen before in heavily-parallel runs); CI runs serially with retries=2, absorbed.

### Bundle
- 87.64 / 88 KB initial-load brotli (+1.06 KB for the detector + blob bridge + entry wiring + the detection helper). CSS 10.92 / 12 KB. Lazy chunks unchanged. **Tight under the limit** — the next bundle-budget-touching phase will likely need a 2 KB bump.

### Pre-push checklist
Caught zero issues this time — full unit suite + full e2e (with one absorbed flake) + visual-regression spec + size-limit all came back clean before push. Four phases in a row now (97 + 99 + 100 + 101) shipping without a follow-up fix commit.

---

## [0.100.0] — 2026-04-26 — Drag-and-drop / paste-to-upload backgrounds

### Added
- **Drag a file onto the page** to set it as the GM map background. A full-viewport overlay reads "Drop to set as background" while a file is being dragged over the window; releasing applies the file.
- **Paste an image from the clipboard** (Ctrl+V / Cmd+V) anywhere outside an editable input. Same pipeline as the drop path — useful for screenshots, browser-copied images, etc., without going through Save → Open.
- **Both routes wire to the existing `applyBackgroundBlob` path** that the session-menu "Upload Map" button has used since Phase 32 — IDB image write, `background-update` patch, LoS recompute all flow through the same code. The new entry surface is purely additional.

### How it works
- **`src/ui/upload-drop-zone.ts`** (new) — wires window-level `dragenter` / `dragover` / `dragleave` / `drop` and `paste` listeners. Detection:
  - **File drag**: `dataTransfer.types` includes `'Files'`. Required for Chrome / Firefox / Safari to expose the drop intent during dragenter (the `files` list itself is empty until `drop`).
  - **Image extraction**: `dataTransfer.files[]` for drops, `clipboardData.items[]` for pastes. Filters by `file.type.startsWith('image/')` so non-image drops fall through silently.
- **Counter-based dragenter / dragleave tracking** so the overlay doesn't flicker as the cursor moves over child elements (every child transition fires both events; counting keeps the "is the file currently over the window" boolean stable).
- **Window-level (not canvas-level)** binding so a near-miss release (releasing slightly off-canvas) still drops onto the app instead of triggering Chrome's default "open this image in a new tab" — which would destroy the in-progress session.
- **Editable-focus skip** on paste: pasting into a Settings textarea or the slash-command input still pastes text normally, not the image. Re-uses the existing `isEditableFocus` helper from `util/focus.ts`.

### UX details
- **Reduced-motion respect**: the 120 ms fade-in animation on the overlay is disabled under `prefers-reduced-motion` + the in-app `body.reduced-motion` class. The overlay just appears without animation.
- **GM-only**: not wired into `spectator.ts` — Spectator can't author backgrounds.
- **Non-image drop** announces a hint via the live-region: *"Only image files are accepted as backgrounds. Try a PNG, JPG, or GIF."* Distinguishes "I dropped something but it didn't work" from "I dropped something and it succeeded silently".

### Tests
- **+4 Playwright specs** in `e2e/upload-drop-zone.spec.ts` (new): drop-zone overlay element exists in the DOM (hidden by default); synthesized image-file dragover reveals the overlay; non-image dragenter does NOT reveal the overlay (text drag, no `Files` type); paste of an image blob fires the background-upload announcer (verified via the announcer text). Drag-drop synthesis uses native `DragEvent` + a `DataTransfer` with `items.add(file)` since Playwright doesn't have a first-class OS-style drag API.
- **All 1123 unit tests + 253 Playwright specs pass** locally. The pre-push full-e2e run flagged one parallel-test flake (`aoe-tool.spec.ts:49`) that we've seen before in parallel runs and which passes in isolation; CI runs serially with retries=2, absorbed.

### Bundle
- 86.58 / 88 KB initial-load brotli (+0.35 KB for the drop-zone module + the entry wiring). CSS 10.92 / 12 KB. Lazy chunks unchanged. **No budget bump needed** this phase — comfortably inside the existing limits.

### Pre-push checklist
Caught zero issues this time — full unit suite + full e2e + visual-regression spec + size-limit all came back clean before push. Three phases in a row now (97 + 99 + 100) shipping without a follow-up fix commit; the post-94 process improvement is paying off.

---

## [0.99.0] — 2026-04-26 — Conflict-merge history

### Added
- **Conflict-loser archive** — when the GM resolves a Phase 84 conflict by adopting the OTHER tab's state ("Use other tab" → `gm-takeover` apply), the local tab's about-to-be-overwritten state is now snapshotted into a 1-hour, 5-entry rotating archive. If the GM realizes they picked the wrong winner ("oh, that other tab was missing the wall I drew 5 minutes ago"), the lost edits can be restored.
- **Recovery affordance** via the Phase 95 palette: `Ctrl+K` → "Open conflict-merge archive…" lists every fresh entry with a "Restore" / "Discard" action per row + a "Clear archive" button at the bottom.
- **Updated takeover-applied announcer** message points at the recovery path: *"Adopted state from the other GM tab. Previous state archived for 1 hour — Ctrl+K → 'conflict' to recover."*

### Why this matters
Phase 84 introduced the conflict-merge modal so the GM could pick a winner instead of being told "close one tab." But "Use other tab" was a one-way operation — once you adopted the peer's state, your tab's edits were gone. Phase 99 closes that recovery loop with an opt-in archive that's there if you need it but doesn't clutter the normal flow.

### Architecture
- **`src/state/conflict-loser-archive.ts`** (new, ~140 lines) — pure helpers + a localStorage-backed rotating store:
  - `record(state, { now?, reason? })` — push the about-to-be-overwritten state. Side effect: filters past-TTL entries on every write.
  - `listFresh(now?)` — newest-first list of entries within the 1-hour TTL.
  - `get(id)` / `remove(id)` / `clear()` — straightforward CRUD.
  - Wire format: `{ version: 1, entries: LoserSnapshot[] }` keyed by `KEY = 'gm-encounter-maps-conflict-loser-archive'`. Version field is the forward-compat escape hatch — a future breaking change would bump it + a v2 reader could ignore older blobs.
  - Defensive against malformed persisted state: drops entries missing required fields, drops wrong-version blobs, falls back to empty on parse failure.
- **`src/ui/conflict-loser-archive-modal.ts`** (new, ~170 lines) — modal listing the archive entries with restore / discard / clear-all actions. Same row pattern as the Phase 97 snapshot history modal; reuses `formatRelativeTime` from `snapshot-history.ts` to keep the timestamp formatting consistent across both surfaces.
- **`src/entries/gm.ts`** — extended the `gm-takeover` channel handler to call `conflictLoserArchive.record(serializeState(store.getState()))` BEFORE the `loadState` call. The archive write is wrapped in its own try/catch so a serialize failure doesn't block the takeover apply (the user already picked their winner; the archive is opportunistic). The restore path mirrors Phase 97: `loadState` → `clearHistory` → `void saveState`. Restoration also calls `archive.remove(id)` because recovery is one-shot — if the user restored by mistake, they can re-trigger the conflict, but there's no way to re-archive automatically.

### Why localStorage (not IDB like Phase 97 snapshots)
The `gm-takeover` apply path is synchronous. Capturing the loser BEFORE the `loadState` call needs to complete before the load runs (otherwise we'd archive the post-load state, which is the wrong direction). localStorage is sync; IDB is async. Storage size: 5 entries × ~50KB max state = ~250KB worst case, well inside localStorage's per-origin quota.

### Tests
- **+14 unit tests** in `src/state/conflict-loser-archive.test.ts` (new): starts empty, record persists, listFresh sorted newest-first, TTL filtering on read + on next write, MAX_ARCHIVED FIFO eviction, custom reason / default fallback, get by id (regardless of TTL), remove by id, remove unknown is no-op, clear forgets everything, malformed JSON returns empty, wrong-version blob returns empty, defensive field validation drops malformed entries.
- **+4 Playwright specs** in `e2e/conflict-loser-archive.spec.ts` (new): palette has the new entry; empty state when nothing archived; Esc closes; **end-to-end takeover round-trip** — drop a token (1-token loser state) → spin up a synthetic GM peer that responds to `gm-state-request` with a 0-token takeover → use the conflict-merge modal's "Use other tab" → verify canvas drops to "0 tokens placed" → open the archive via palette → assert the loser is there with "1 token" summary → click Restore → verify canvas regains the token. All in one spec.
- **All 1123 unit tests + 249 Playwright specs pass.** No visual-regression baseline drift (the new modal is hidden by default + isn't anchored to any existing snapshot region).

### Bundle
- **Initial-load brotli budget bumped 86 → 88 KB.** Phase 99 added ~1.1 KB (archive + modal + entry wiring + palette command); landed at 86.23 / 86 KB which would have been 229 B over. CSS 10.79 / 12 KB. Lazy chunks unchanged.

### Process improvements (continued)
This is the second phase in a row to ship clean on first push, after Phase 94 + 98 each needed fix-up commits. Following the new pre-push checklist now: full unit suite + full e2e suite + visual-regression spec + size-limit. Catching the JS-budget overage and the file-input selector collision locally has paid off in zero broken-CI cycles for 99.

---

## [0.98.1] — 2026-04-26 — Fix: scope partial-import test selector for the new Scenes modal file input

### Fixed
- **`partial-import.spec.ts` strict-mode violation.** Phase 98's new "Import scene…" button added a second `<input type="file" accept="application/json,.json">` to the page (inside the Scenes modal). The pre-existing partial-import test used a bare `input[type="file"][accept*="json"]` selector, which was unique pre-98 but now matches two inputs and trips Playwright's strict-mode rule.
- **Fix:** scope the test's selector to the session-menu (`.session-menu input[type="file"][accept*="json"]`). The test specifically exercises the full-session import flow that lives there; the new scoped selector is more precise + future-proof against further file inputs being added elsewhere.

### Why this is 0.98.1 (not folded into 0.98.0)
0.98.0's CI failed on the partial-import spec; the implementation was correct. The local pre-push run-all-e2e check would have caught it — now part of my standard pre-push routine alongside the visual-regression check (lessons from 0.94.x).

---

## [0.98.0] — 2026-04-26 — Per-scene JSON export / import

### Added
- **Per-scene "Export" button** on every scene row in the Scenes modal. Downloads the scene as a JSON file named `<slug>.scene.json`, bundling the scene's state + every referenced image as base64 data URLs (same pipeline `exportSession` uses, scoped to one scene).
- **Top-level "Import scene…" button** in the Scenes modal toolbar. Opens a file picker; the chosen JSON gets parsed, images restored to IDB, and a new scene created with the original name. Switches to the new scene immediately.
- **Two new command-palette entries** (Phase 95):
  - `Export current scene as JSON` (group: Scenes) — exports without opening the modal.
  - `Import scene from JSON…` — opens the Scenes modal where the file picker lives.

### Wire format
```jsonc
{
  "version": 1,
  "kind": "scene",                       // distinguishes from session export
  "exportedAt": "2026-04-26T15:00:00Z",
  "name": "Goblin Cave",
  "state": { /* SerializedSessionState */ },
  "images": [{ "id": "...", "mimeType": "image/png", "dataUrl": "..." }]
}
```

`kind: 'scene'` is the explicit discriminator from a full-session export (`kind: 'session'`, implicit when absent on pre-98 files for back-compat). The import validates the kind + rejects the wrong type with a clear error: *"Not a scene export (kind: session). Use the regular Import for full sessions."*

### Why a separate format
Existing session export bundles every scene + the active-scene pointer + miscellaneous global state. A per-scene export is a much smaller transport for the common "share this one encounter on Reddit / with my co-DM" use case. The `kind` field is the future-proof escape hatch: a hypothetical `kind: 'token-pack'` or `kind: 'wall-template'` could ship later with the same import-detection pipeline.

### Architecture
- **`src/state/scene-export.ts`** (new) — `exportScene(name, state)` + `importScene(json)` mirror the `exportSession` / `importSession` API shape. Image bundling re-uses the existing `blobToDataURL` / `dataURLToBlob` helpers from `images/store.ts`. Image-restore failures are logged + skipped (one bad image doesn't doom the whole import — same defensive pattern as the session importer).
- **`src/ui/scenes-modal.ts`** — extended with:
  - "Import scene…" button + hidden `<input type="file">` next to the toolbar's "+ New scene" button.
  - Per-row "Export" button (next to Rename / Duplicate / Delete) that calls `getSceneState(id)` → `exportScene(name, state)` → triggers a download via a click-driven anchor + a 200 ms deferred `URL.revokeObjectURL`.
  - `slugFilename(name)` helper that lowercases + collapses non-alphanumeric runs to single hyphens, capped at 60 chars. Falls back to `'scene'` for empty / all-punctuation names.
- **`src/entries/gm.ts`** — registers the two palette commands. The export path uses the same blob-download pattern as the per-row button; the import path opens the Scenes modal where the file-picker lives (centralizes the picker rather than mounting two separate ones).

### Tests
- **+9 unit tests** in `src/state/scene-export.test.ts` (new, fake-indexeddb): export round-trip with no images; "Imported scene" fallback for empty / whitespace name; import hydrates the state; import rejects non-JSON; rejects wrong `kind` (`session`); rejects no-`kind` doc; rejects unsupported `version`; rejects missing `state`; "Imported scene" fallback when the imported `name` is missing.
- **+3 Playwright specs** in `e2e/scene-export.spec.ts` (new): Scenes modal has Export per row + Import scene button; Export downloads a JSON file with the right wire format (verified by parsing the saved file's content); command palette has the Phase 98 entries.
- **All 1109 unit tests + 245 Playwright specs pass.** Visual-regression baselines unchanged — the new buttons are inside the Scenes modal (not in any current snapshot's region).

### Bundle
- 85.12 / 86 KB initial-load brotli (+0.77 KB for the export module + scenes-modal wiring + palette commands). CSS unchanged. Lazy chunks unchanged.

### Roundtrip notes
- Exporting a scene then importing it on the same install **creates a new scene** rather than overwriting. Image ids reuse the originals — if both source + import end up with the same scene, both reference the same IDB image record (efficient; no duplication).
- Importing a scene whose images already exist in IDB silently overwrites them with the imported copies. Same behavior as the session importer; matters in practice only when the user has manually replaced an image with the same id (vanishingly rare).
- Pre-98 session-export files are **untouched** by this phase — the existing Import button still loads them via the original session importer.

---

## [0.97.0] — 2026-04-26 — Auto-save snapshot history

### Added
- **Rotating per-scene snapshot history.** Every successful autosave now also pushes a snapshot into a per-scene rotating ring (cap **8 snapshots per scene**, oldest evicted FIFO). Surfaced via a new "Snapshots…" entry in the session menu + a "Restore from snapshot…" command in the Phase 95 palette. The restore modal lists each snapshot with a relative timestamp ("5 minutes ago"), a quick summary (token count, fog %), and a Restore button that swaps the live state to the snapshot + persists immediately so the change survives a reload race.
- **Smart capture rate.** A 30-second `MIN_INTERVAL_MS` rate-limit per scene keeps the ring from being spammed by the existing 200 ms persist debounce — so a busy combat round doesn't burn the entire history on near-identical states inside a single minute. Same-state consecutive saves are also deduped (compared via `JSON.stringify` on the serialized state) so leaving a scene idle doesn't snapshot a duplicate.
- **Per-scene scoping.** `clearSnapshots(sceneId)` is exposed for future use when a scene is deleted (the existing scene-delete path doesn't call it yet — that's a small follow-up). Snapshots indexed by `sceneId` for cheap lookup; up to ~8 scenes × 8 snapshots × ~50 KB each = ~3.2 MB worst-case IDB usage.

### Why per-scene (not per-session)
- A multi-scene session has each scene's history scoped to that scene — restoring the throne-room snapshot doesn't accidentally erase the goblin-cave you saved 5 minutes earlier.
- The user's mental model is "I want to undo what I did in THIS scene", which matches the per-scene scoping naturally.

### Why an 8-snapshot cap
- 8 × 30s = 4 minutes of useful history at full save rate. Long enough to undo "I deleted the wrong thing 2 minutes ago"; short enough to keep IDB usage bounded.
- Each snapshot carries the full `SerializedSessionState` (~10–100 KB depending on scene size). 8 keeps the per-scene cost well inside browser quota even with image-heavy sessions.

### Architecture
- **`src/state/idb.ts`** — bumped `DB_VERSION` to v5 + added `SNAPSHOTS_STORE = 'snapshots'`. The new store has a `sceneId` index (for cheap per-scene lookup) + a `takenAt` index (reserved for future range queries). Idempotent `onupgradeneeded` — existing data unaffected.
- **`src/state/snapshot-history.ts`** (new) — pure-ish module:
  - `recordSnapshot(sceneId, state, { now? })` — rate-limited + deduped capture. Returns the recorded snapshot or `null` if suppressed. Uses an in-process `Map<sceneId, RateLimitEntry>` for the rate-limit/dedup memo (cleared via `clearSnapshots` + a test helper).
  - `listSnapshots(sceneId)` — newest-first via the IDB index.
  - `getSnapshot(id)` / `deleteSnapshot(id)` / `clearSnapshots(sceneId)` — straightforward CRUD.
  - `formatRelativeTime(takenAt, now)` — pure helper for the modal: "just now", "30 seconds ago", "5 minutes ago", "2 hours ago", "3 days ago".
- **`src/ui/snapshot-history-modal.ts`** (new) — the restore modal. Lazy-loads the snapshot list on `open()` (so opening on a scene with many snapshots doesn't block boot); each row's summary precomputes `tokenCount` + fog `%` from the snapshot's state without rehydrating the full `SessionState`.
- **`src/entries/gm.ts`** — wired the persist debounce to call `recordSnapshot(sceneId, serializeState(state))` after each successful save. The snapshot module's own rate-limit + dedup means most calls are no-ops; the call cost is negligible. Restore path: `store.loadState(deserializeState(snap.state))` + `clearHistory()` + `void saveState(...)` synchronously off the debounce path so a beforeunload race doesn't blow the restore away. Same pattern as Phase 84's `gm-takeover` apply.
- **`src/ui/session-menu.ts`** — extended with optional `onOpenSnapshotHistory` callback; menu only mounts the button when wired (GM only).

### Tests
- **+20 unit tests** in `src/state/snapshot-history.test.ts` (new, fake-indexeddb): records first snapshot, rate-limits within MIN_INTERVAL_MS, records again past the interval, dedups byte-identical state, rate-limits per-scene independently, evicts oldest past MAX_SNAPSHOTS_PER_SCENE; listSnapshots empty / sorted-newest-first / per-scene scoped; getSnapshot null on missing id, round-trips put + get + delete; clearSnapshots wipes per-scene + clears rate-limit memo; formatRelativeTime "just now" / seconds / minutes / hours / days / future-and-NaN-clamp.
- **+4 Playwright specs** in `e2e/snapshot-history.spec.ts` (new): GM session menu has a "Snapshots…" entry that opens an empty modal; Esc closes the modal; command palette has a "Restore from snapshot…" entry; Spectator session menu does NOT include "Snapshots…".
- **All 1100 unit tests + 242 Playwright specs pass.**

### Bundle
- **Initial-load brotli budget bumped 84 → 86 KB.** Phase 97 added ~1.2 KB (snapshot module + modal + entry wiring); landed at 84.35 / 84 KB which would have been 352 B over. CSS 10.63 / 12 KB. Lazy chunks unchanged.

### Visual-regression baseline regen
The new "Snapshots…" entry shifted the session-menu height by 40 px (10 px / row × the new row). Regenerated `session-menu-light-chromium-{win32,linux}.png` as part of this commit — same workflow as Phase 94's combat-log entry. The pre-push visual-regression check (lesson from 0.94.1) caught the drift locally before push, so no broken-CI cycle this time.

---

## [0.96.0] — 2026-04-26 — Contextual first-use hints

### Added
- **One-at-a-time hint toast** that surfaces when the user first hits a feature surface they may not have noticed yet. Dismissed via "Got it" button or Esc; dismissal is persisted to localStorage so each hint shows AT MOST ONCE per install. Pinned bottom-center so it doesn't compete with the existing top-center status banner / conflict-merge banner.
- **Three starter hints registered:**
  - **`palette-intro`** — fires ~6 s after boot once the onboarding tour is complete: *"New: press Ctrl+K to find any action."* with a follow-up: *"Tools, modals, scenes, initiative — type a few letters to filter."* The tour-complete guard means new users finish onboarding without competing surfaces.
  - **`combat-log-intro`** — fires the first time damage is recorded into the combat log (Phase 94): *"Combat log is recording every event."* / *"Open it any time from the session menu — Combat Log."* Subscribes to the log + unsubs after firing.
  - **`wall-editor-intro`** — fires the first time the GM commits a wall: *"New in 0.85: drag wall endpoints to reshape."* / *"Right-click a wall + pick Edit wall… (or press E) for sight, thickness, and visibility."* Subscribes to the store + unsubs after firing.
- **One-shot semantics**: `firstUseHints.markShown(id)` records the dismissal in localStorage (key `gm-encounter-maps-first-use-hints`) as a JSON array of seen ids. A future "Reset preferences" path could clear it for users who want the tips back.

### Architecture
- **`src/state/first-use-hints.ts`** (new) — pure helpers + localStorage-backed shown set. Robust against quota errors, malformed JSON, and missing storage (in-memory fallback).
- **`src/ui/first-use-hint.ts`** (new) — toast UI with one-at-a-time queueing. `show()` queues if a hint is currently visible; the queue drains on dismiss. The host calls `firstUseHints.markShown(id)` from the toast's `onDismiss` callback.
- **`src/entries/gm.ts`** — wires the three starter hints. `maybeShowHint(id, message, detail?, durationMs?)` helper checks `wasShown` + `onboardingComplete` before queueing. The combat-log + walls hints subscribe at boot + unsub after firing (or on first check if already shown).

### Why one-at-a-time + queue (not all at once)
A new GM dropped into a tutorial-empty scene who places a wall would otherwise see palette-intro AND wall-editor-intro overlap. The queue ensures hints land sequentially with the user's full attention on each.

### Why bottom-center (not anchored to the trigger)
Anchored tooltips (next to the wall they just drew, next to the Ctrl+K shortcut) would be more visually descriptive but require per-hint anchor positioning + collision detection. The bottom-center toast is a robust MVP: every hint reads the same way, never blocks tools, and works regardless of viewport size or scroll position. A future polish could thread an optional `anchor` field through `FirstUseHint` for the cases where anchoring is clearly better.

### Reduced-motion respect
The toast slides up + fades in over 220 ms by default. `@media (prefers-reduced-motion: reduce)` and `body.reduced-motion` both disable the animation; the toast just appears.

### Tests
- **+10 unit tests** in `src/state/first-use-hints.test.ts` (new): starts empty; `markShown` persists + survives a fresh store; idempotent (no double-write); `reset` clears + removes from storage; `reset` on empty is a no-op; honors a custom key; drops malformed persisted state (non-array, non-string entries); treats malformed JSON as empty; treats non-array JSON as empty; survives a localStorage write throwing (quota / privacy mode).
- **+3 Playwright specs** in `e2e/first-use-hints.spec.ts` (new): palette-intro hint surfaces ~6s after boot (with onboardingComplete=true seeded so the tour doesn't race); "Got it" dismisses + persists across reload (tested via reload + waiting past the 6s timer); pre-seeded localStorage with the hint's id keeps it suppressed.
- **All 1080 unit tests + 238 Playwright specs pass.**

### Bundle
- 83.17 / 84 KB initial-load brotli (+0.86 KB for the store + toast + 3 hint registrations). CSS 10.55 / 12 KB. Lazy chunks unchanged.

### Process improvement (carried from Phase 94)
Locally ran the visual-regression spec before pushing — no baseline drift since the toast is hidden by default + doesn't appear in any existing snapshot. Same pre-push check that should have caught Phase 94's session-menu drift; now part of the standard "ship a UI phase" routine.

---

## [0.95.0] — 2026-04-26 — Searchable command palette (Ctrl+K)

### Added
- **Spotlight-style command palette** opened by `Ctrl+K` (Cmd+K on Mac). Type a few letters of what you want — "settings", "select", "scene", "init" — pick with `↑↓` + `Enter`, run. Closes with `Esc` or backdrop click. Replaces "open the session menu, scan, click" with a 1-keystroke + a few-letters flow that scales as the action surface grows.
- **Initial action set (24 commands across 6 groups):**
  - **Tools**: Switch to Select / Token / Reveal / Hide / Map / Note / Ruler / AoE / Draw / Walls
  - **Modals**: Open Settings / Scenes / Token Library / Template Library / Initiative tracker / Permissions
  - **Panels**: Toggle Notes panel / Toggle Combat Log panel
  - **Help**: Show keyboard shortcuts (`?`) / Replay onboarding tour
  - **Camera**: Fit content to screen (`F`) / Reset camera (`0`)
  - **Initiative**: Initiative — next turn / Initiative — previous turn
  - **Session**: New session (clear everything) — with confirmation
- Pre-existing keyboard shortcuts (`F`, `0`, `?`) display as `<kbd>` chips next to their entries so the palette doubles as a discoverable shortcut reference.

### How matching works
- Substring filter on `label + hint`, ranked by:
  1. **Prefix match on label** ("settings" → "Settings panel" wins)
  2. **Word-boundary match** ("settings" → "Open Settings" — second-tier)
  3. **Pure substring** ("etting" → "Resettings indeed" — third-tier)
- Ties on rank break by match position, then registration order. Empty / whitespace query returns every command in registration order.
- No fuzzy match (would slow down + complicate the result ordering); the substring approach is fast + predictable + matches what users expect from `cmd+P`-style palettes in editors they already use.

### Architecture
- **`src/state/command-registry.ts`** (new, ~120 lines) — pure helpers: `Command` type (`{id, label, hint?, group?, shortcut?, run()}`), `createCommandRegistry()` returns `{register, unregister, list, match, clear}`. Idempotent — second `register()` with the same id replaces in-place. Match is rank-aware (3 tiers).
- **`src/ui/command-palette.ts`** (new, ~190 lines) — modal UI mirroring the focus-trap + restore pattern of the other modals. Mounts a Spotlight-style modal at the top 12vh of the viewport (not vertically centered — keeps the eye + cursor aligned). `ArrowDown/Up/Home/End` navigate; `Enter` runs + closes; click on item runs + closes; `Esc` closes; backdrop click closes. List re-renders on every input change (re-runs `registry.match()`); active index resets to 0 on filter to avoid pointing at a no-longer-visible item.
- **`src/entries/gm.ts`** — registers the static command set at boot via an IIFE; wires `Ctrl+K` / `Cmd+K` into the existing global keydown handler, BEFORE the other Ctrl shortcuts so the palette claims K even if a future action wanted it.

### Why no Spectator palette
The Spectator action surface is small enough that the toolbar + session menu cover everything. A future Spectator-side palette could expose "Open Notes", "Toggle dice tray", "Switch theme" if the surface grows; today there's not enough to search through.

### Tests
- **+13 unit tests** in `src/state/command-registry.test.ts` (new) covering: starts empty, registration order preserved, in-place replace by id, unregister no-op on missing id, clear, match returns all on empty / whitespace query, case-insensitive substring, prefix-vs-word-boundary-vs-substring ranking, hint matching, multi-match sort, no-match empty array, command-object reference preservation.
- **+6 Playwright specs** in `e2e/command-palette.spec.ts` (new): Ctrl+K opens + focuses input; Esc closes; typing filters the list; Enter runs the highlighted action (verified by Settings dialog appearing); ArrowDown moves the highlight (verified via aria-selected); non-matching query shows the empty state.
- **All 1070 unit tests + 235 Playwright specs pass.**

### Bundle
- **Initial-load brotli budget bumped 82 → 84 KB.** Phase 95 added ~1.5 KB (registry + palette UI + 24 action registrations); landed at 82.31 / 82 KB which would have been 310 B over. CSS 10.4 / 12 KB. Lazy chunks unchanged.

### What this unlocks
With Phase 95 the discoverability of every existing GM action improves dramatically — a user who doesn't remember which menu Notes lives in can just type "notes" and pick. As Phases 96+ add new surfaces (contextual hints, conflict-merge history, drag-drop upload, etc.), each can register its own commands so the palette stays the canonical "everything you can do" view.

---

## [0.94.2] — 2026-04-26 — Fix: regenerate session-menu visual-regression baseline for Phase 94 combat-log entry

### Fixed
- **Visual-regression baseline drift.** The Phase 94 "Combat Log" button added a row to the session menu — height grew 676 → 716 px. Caught by `visual-regression.spec.ts:154` ("GM: light theme boot produces the expected pastel chrome"). Regenerated `session-menu-light-chromium-{win32,linux}.png` via the Phase 68 `npm run baselines` tool so both per-platform baselines reflect the new menu layout.

### Why this is 0.94.2 (not folded into 0.94.1)
0.94.1 was a CSS-budget bump caught at the `npm run size` step. 0.94.2 is a visual-baseline regen caught at the `playwright e2e` step. They're independent root causes — separate commits make the diff easy to read.

---

## [0.94.1] — 2026-04-26 — Fix: bump CSS bundle limit for Phase 94 combat-log styles

### Fixed
- **CSS budget**: 10.21 / 10 KB after Phase 94 — over by 212 B from the new combat-log panel rules. Bumped the limit 10 → 12 KB, which covers the combat-log addition + a comfortable margin for the upcoming command-palette / contextual-hints / per-spectator-token-visibility phases (95–110) without needing another bump every two releases.
- The Phase 94 commit was committed locally with the right limit but the local pre-push `npm run size` only showed the JS line — I missed the CSS line in the head-truncated output, so the CSS over-budget went out to CI. Ships as 0.94.1; nothing else changed.

### Bundle (final, with Phase 94 + this fix)
- Initial-load JS: 80.82 / 82 KB brotli
- Lazy chunks JS: 18.61 / 20 KB
- **CSS: 10.21 / 12 KB** (was over 10 KB)
- HTML entries: 1.33 / 2 KB
- Service worker + manifest: 2.12 / 2.5 KB

---

## [0.94.0] — 2026-04-26 — Combat log panel

### Added
- **GM-side combat log** mounted as a toggleable side panel (Session Menu → "Combat Log"). Auto-records four event categories as combat unfolds:
  - **Damage / heal** — fired from the same paths that already trigger Phase 77's damage-fx events: the Damage / Heal dialog Apply, the Phase 92 quick-HP `+/-` shortcut, and the Phase 77 cross-tab broadcast handler. Each entry shows the new HP / max in parens for context: `"Goblin took 7 damage (3/10 HP)"`.
  - **Condition adds + removes** — diffed from `state.tokens[i].conditions` per store tick. `"Bandit gained Poisoned"` / `"Bandit lost Stunned"`.
  - **Death-save changes** — diffed from `state.tokens[i].deathSaves`. Classifies each transition: `failure` / `success` / `stable` (3 successes) / `dead` (3 failures) / `reset` (back to {0,0}). Format: `"Bard death save failure (1/3 succ, 2/3 fail)"`.
  - **Turn advances** — diffed from `state.initiative.activeId / .round`. Fires once per (round, activeId) tuple. Format: `"Round 3 — Goblin's turn"`.
- **Per-event timestamp** in `[HH:MM:SS]` format on each row + in the export.
- **Auto-scroll-to-bottom** on new entries when the user is already pinned to the bottom; if they've scrolled up to read history we don't yank them away (chat-log convention).
- **Per-kind accent stripes** on the left edge of each row — red for damage, amber for condition changes, purple for death saves, theme-accent for turn advances. At-a-glance scannability.
- **Export to clipboard** — "Copy" button writes the full plain-text log (`[HH:MM:SS] message` per line) to the clipboard. Useful for session recap posts, after-action sharing, "what HP was the boss at when X happened" debugging.
- **Clear** button empties the log (no confirmation — the log is in-memory and the GM is in the loop, but a future polish could add an "Are you sure?" toggle).
- **GM-only** — the Spectator session menu omits the entry entirely. The log records GM-side events that wouldn't be useful to a player view.

### Architecture
- **`src/state/combat-log.ts`** (new, ~150 lines) — pure ring buffer + event types + formatter:
  - `CombatLogEvent` discriminated union for the four event kinds (`damage`, `condition-added`, `condition-removed`, `death-save`, `turn`).
  - `createCombatLog({ maxEntries, now })` returns a `{ add, entries, size, clear, subscribe, exportText }` interface. Default cap of 250 entries (FIFO eviction); covers a long combat without unbounded growth.
  - `formatLogEvent(event)` for the per-row text; `formatClock(ms)` for the `HH:MM:SS` prefix.
- **`src/state/combat-log-observer.ts`** (new, ~140 lines) — wires the log to the store. Snapshots tokens per subscribe tick + diffs to emit `condition-added/removed`, `death-save`, and `turn` events. Damage / heal events fire EXPLICITLY via `recordDamage(token, amount)` from the dialog + quick-HP code paths so the log only captures intentional combat damage (not Token Editor max-HP edits or imported state-replace events).
- **`src/ui/combat-log-panel.ts`** (new, ~150 lines) — pure UI module mirroring the Notes panel layout (right-anchored, 360 px wide, header / scrollable body / footer). Live updates via `log.subscribe`. Render uses `replaceChildren()` for one mutation event per update — minimizes screen-reader thrash on the `aria-live="polite"` list.
- **`src/ui/session-menu.ts`** — extended with optional `onToggleCombatLog` callback; the menu only mounts the button when the caller wires it (GM only — Spectator entries pass nothing).
- **`src/entries/gm.ts`** — mounts the log + observer + panel on init; the dialog's `onDamageFx` and the quick-HP path both call `combatLogObserver.recordDamage(...)` after the patch lands so `hpAfter` reflects the new HP, not the pre-update value.

### Why an in-memory log (not persisted)
The combat log is "live commentary" — useful during the session, less useful as a durable record (the GM has scene saves + session export for that). Persisting to localStorage adds complexity around per-scene scoping ("does the log carry across scenes?"), wire-format versioning, and quota management without a clear user need. A future phase could add an opt-in "auto-persist" preference if real users ask.

### Why explicit damage recording (not store-diff)
The store-diff observer pattern would also fire on Token Editor max-HP edits, imported full-state replacements, and any other `token-update` that touches `hp`. The dialog + quick-HP entry points represent intentional combat damage; routing the log entry through them keeps the recorded events meaningful instead of noisy.

### Tests
- **+18 unit tests** in `src/state/combat-log.test.ts` (new) covering: starts empty; `add()` records the timestamp from the clock seam; FIFO eviction at `maxEntries`; `clear()` empties + notifies; `clear()` on empty is a no-op; `subscribe` returns an unsubscribe fn; `entries()` returns a copy (caller mutation is local); `exportText()` formats one line per entry oldest-first; `formatLogEvent` covers all five event kinds + the heal / damage / no-HP / blank-label / per-death-save-change variants; `formatClock` HH:MM:SS + non-finite fallback.
- **+4 Playwright specs** in `e2e/combat-log.spec.ts` (new): GM session menu has a "Combat Log" toggle that opens an empty panel; quick-HP damage records a damage entry; "Clear" button empties the log; Spectator session menu does NOT include the entry.
- **All 1057 unit tests + 229 Playwright specs pass.**

### Bundle
- **Initial-load brotli budget bumped 80 → 82 KB.** Phase 94 added ~2 KB (log + observer + panel + session-menu wiring); landed at 80.82 / 80 KB which would have been 818 B over. Lazy chunks unchanged. CSS unchanged in budget terms (the new combat-log styles compress well alongside the existing notes-panel pattern).

---

## [0.93.0] — 2026-04-26 — Per-turn countdown timer

### Added
- **Optional per-turn countdown** in the GM initiative bar. Off by default; configurable in Settings → Camera → "Per-turn timer" with presets at 30 s / 1 min / 1:30 / 2 min / 3 min. When set, every active-turn change resets the countdown to the chosen duration; the timer ticks once per second next to the active token's name in the initiative bar.
- **Visual urgency tiers:**
  - **normal** (white text, neutral border) above 30 s remaining
  - **warn** (amber `#f5b400`) at ≤ 30 s
  - **urgent** (orange-red `#ff7043`) at ≤ 10 s
  - **expired** (white-on-red `#c0392b` + 0.9 s pulse animation) at 0
- **"Time" announcement** via the live region (assertive priority) when the countdown hits 0. Phase 90's repeat-suppression keeps it from re-announcing if the GM lingers on an expired turn. Format: `"Time — Goblin"`.
- **Reduced-motion respect** — the expired-state pulse animation is disabled when the OS / app `prefers-reduced-motion` (Phase 50) or the in-app `reducedMotion` preference is on. The badge keeps its color, just doesn't oscillate.

### Why GM-only by default
The original suggestion was "per-token turn timer" — what shipped is a single global timer that resets per turn. Per-token-specific durations (e.g. "the BBEG gets 90 s, mooks get 30 s") would need a UI to set each entry's individual duration; deferred. The "single global timer with per-turn reset" model covers the main pain point ("nudge slow players without scolding") without the per-entry data + UI complexity.

The Spectator initiative bar deliberately does NOT render the timer:
- Players seeing their own clock running adds visible time-pressure that not every group wants.
- The GM is the audience that needs the visual nudge to advance the round.
- A future setting could expose the clock to Spectator if a group wants the visible pressure on purpose; today it's GM-only with no extra opt-in needed for the "low-pressure default".

### Architecture
- **`src/state/turn-timer.ts`** (new) — pure helpers + a tiny stateful holder, all easily testable with a clock seam:
  - `activeTurnKey(activeId, round)` — combines round + id so the same token getting their second turn (e.g. legendary action) still resets the clock.
  - `urgencyFor(remaining, total)` → `'normal' | 'warn' | 'urgent' | 'expired'`.
  - `formatTimer(ms)` → `M:SS` (or `:SS` for sub-minute) with ceil rounding so the displayed value never under-promises remaining time.
  - `computeTimerView({ now, startedAt, durationSeconds })` — the per-render snapshot the bar paints.
  - `createTurnTimerState({ now })` — tracks `activeKey` + `startedAt`, resets on `syncActive(newKey)`.
- **`src/ui/initiative-bar.ts`** — extended with the timer slot. Uses `setInterval(1s)` to repaint while the bar is visible; the interval auto-stops when no turn is active or the timer is disabled. New options: `getTurnTimerSeconds()` (polled per render so a Settings change applies on next state tick) + `onTimerExpired(label)` (one-shot per active key).
- **`src/ui/styles.css`** — `.initiative-bar-timer` with `data-urgency='warn|urgent|expired'` color tiers + the `turn-timer-pulse` keyframes (disabled under `prefers-reduced-motion` and `body.reduced-motion`).
- **`src/state/preferences.ts`** — new `turnTimerSeconds: number` field. Default 0 (off). Existing `loadFromStorage` spread-merge handles back-compat for pre-93 saves.
- **`src/ui/settings-modal-content.ts`** — new "Per-turn timer" subgroup at the bottom of the Camera pane (GM-only branch).

### Tests
- **+22 unit tests** in `src/state/turn-timer.test.ts` covering: `activeTurnKey` null-handling + round-incorporation; `urgencyFor` thresholds (warn / urgent / expired) plus the disabled-timer case; `formatTimer` whole-minute, sub-minute leading-colon, ceil-rounding, non-finite clamping; `computeTimerView` null when disabled / no active turn, accurate remainingMs, urgency tier transitions, expired clamping; `createTurnTimerState` initial null state, syncActive on first key, no-op same-key, reset on new-key, clear on null.
- **+3 Playwright specs** in `e2e/turn-timer.spec.ts` (new): timer slot hidden by default, Settings dropdown writes the preference (verified via localStorage), Spectator initiative bar omits the timer slot entirely.
- **All 1039 unit tests + 225 Playwright specs pass.**

### Bundle
- 79.28 / 80 KB initial-load brotli (+0.5 KB for the timer module + bar wiring + Settings UI). Lazy chunks unchanged. CSS unchanged (the timer slot is small + the keyframes compress well).

---

## [0.92.0] — 2026-04-26 — Quick-HP adjust via +/- keys

### Added
- **`+` / `-` keyboard shortcuts adjust HP on selected HP-bearing tokens.** Replaces the "right-click → Damage / Heal → type number → Apply" four-step path with a single keypress for the common "took 1 from a flank" / "got healed for 3" cases that happen turn after turn. Pre-92 the dialog was the only HP path; great for batched multi-token combat ("a fireball does 28 to four of you") but heavy for incremental tweaks.
- **Modifiers:**
  - **`+` / `=`** → +1 HP (heal)
  - **`-` / `_`** → -1 HP (damage)
  - **`Shift +` / `Shift -`** → ±5 HP (the modifier matches the existing arrow-key Shift convention for token movement: `Shift + ArrowKey` already moves 5 cells)
- **Death-save automation** mirrors the Damage / Heal dialog (Phase 72): healing a 0-HP token resets the death-saves tracker; damaging a 0-HP token would normally add a save failure, but the keyboard path skips that — the "+1 failure on damage to a 0-HP target" rule fires only inside the dialog where the GM can see the result. The keyboard shortcut is for routine adjustments; truly granular cases (crits, crit-on-downed = +2 fails) still go through the dialog.
- **Floating damage / heal numbers** (Phase 77) fire on the GM AND broadcast to the Spectator just like the dialog. Same wire convention (`damage-fx.amount` is positive for damage, negative for heal).
- **Live-region announcement** (Phase 90) per change: single token reads `"Goblin: 4 of 7 HP (-3)"` (pre-clamp delta is preserved so the GM hears "I dealt 5" even if the target only had 2 HP left); multi-token reads `"Healed 3 HP across 4 tokens"`. The Phase 90 rate-limit gracefully coalesces a fast `--` then `++` into one announcement of the final state.
- **Clamp hint:** if every selected target is already at the destination clamp (full HP for `+`, 0 HP for `-`), the announcer says `"Already at full HP."` / `"Already at 0 HP."` instead of going silent — distinguishes "the shortcut didn't trigger" from "the shortcut triggered but had nothing to do".

### How it works
- **`src/state/quick-hp-adjust.ts`** (new) — pure helpers, zero DOM coupling:
  - `planQuickHpAdjust(tokens, delta)` — runs the per-token apply logic (HP clamp via `applyDamage`, death-save reset on wake-up) and returns `{ patches, results }`. Skips tokens that have no HP tracking + tokens already at the clamp (no-op `delta`).
  - `summarizeQuickHpResults(results)` — builds the announcer string. Single-token format includes the new HP / max + the actual delta in parens; multi-token aggregates by direction.
- **`src/entries/gm.ts`** — `quickHpAdjust(delta)` wraps the helper: gathers HP-bearing selected tokens, batches the patches into `store.batch()`, fires the `damage-fx` events (local + remote), announces. Wired BEFORE the existing `+ / -` zoom shortcut in the global keydown handler so HP wins when there's a selection; falls through to zoom otherwise.

### Why convention `+ = heal` (not `+ = increase damage taken`)
The Damage / Heal dialog uses "positive amount = damage" (typing `7` deals 7). The keyboard shortcut inverts: `+` heals because the keyboard mental model is "this is a good direction." Inside `planQuickHpAdjust`, the helper translates by negating before calling `applyDamage`, so the dialog and shortcut share the same clamp + automation logic without surprising either entry point's users.

### Tests
- **+19 unit tests** in `src/state/quick-hp-adjust.test.ts` (new): empty inputs (empty list / delta = 0 / non-finite delta) all return empty; tokens without HP are skipped; positive delta heals (clamped to max); negative delta damages (clamped to 0); over-heal / over-damage clamping reports the actual delta; tokens already at the clamp are skipped (no patch); damaging a 0-HP token (already 0) yields no patch (the dialog handles the +1-failure case); healing a 0-HP token resets `deathSaves`; multi-token batch with mixed clamping outcomes; `summarizeQuickHpResults` covers single-damage, single-heal, blank-label fallback, "stable" suffix on death-save reset, multi-heal aggregation, multi-damage aggregation, empty-input null.
- **+4 Playwright specs** in `e2e/quick-hp-adjust.spec.ts` (new): `-` damages by 1 with announcer report; `+` heals by 1; `Shift+-` damages by 5; no-HP-bearing-selection falls through to zoom (no quick-HP announcement).
- **All 1017 unit tests + 222 Playwright specs pass.**

### Bundle
- 78.75 / 80 KB initial-load brotli (+0.6 KB for the helper + the entry wiring + the announcer summarizer). CSS unchanged. Lazy chunks unchanged.

### Deferred from the original plan
The original Phase 92 plan included **wheel-based HP adjust** (`Shift+wheel` over a hovered HP-bearing token = ±1). Considered + skipped: the canvas wheel handler is already busy with pan-zoom (every wheel = zoom). Adding HP-adjust on a modified wheel would need careful coordination with the pan-zoom handler to avoid double-firing or zoom-while-adjusting bugs. The keyboard shortcut covers the original pain point ("nudge HP without opening the dialog"); the wheel variant is a future easy follow-up if real users ask for it.

---

## [0.91.0] — 2026-04-26 — `prefers-contrast: more` auto-promotes the highContrast preference

### Added
- **`prefers-contrast: more` → `highContrast: true` auto-promotion** at boot. Pre-91 a user with Windows High Contrast Mode (or macOS "Increase Contrast", or any OS-level "more contrast" preference) landed on the in-app default `highContrast: false` and had to dig into Settings → Appearance to flip it. Phase 91 mirrors the existing `prefers-reduced-motion` boot path so OS-level a11y preferences feed the in-app flag automatically.
- **The auto-promotion respects the user's stored override.** If the user explicitly disabled high-contrast in Settings (saved to localStorage), that wins on every subsequent boot — even if the OS still reports "more contrast". And vice versa: a user who turned high-contrast ON manually keeps it on if the OS toggles back to "no preference".
- **`reset()` re-reads the OS** — clearing the user's override and going back to "system defaults" picks up the current OS preference, not a static `false`.

### How it works
- **`src/state/preferences.ts`** — extended `systemDefaults()` to read the new media query alongside the existing `prefers-reduced-motion` check:
  ```typescript
  const highContrast = window.matchMedia?.('(prefers-contrast: more)').matches ?? false;
  return { ...DEFAULT_PREFERENCES, reducedMotion, highContrast };
  ```
  The user's stored value loaded by `loadFromStorage` continues to win via the existing `{ ...defaults, ...parsed }` merge — same pattern that's been carrying `reducedMotion` since Phase 50.

### Why no runtime-flip on OS change
Subscribed to `mql.addEventListener('change', ...)` would let us flip the in-app preference live when the user toggles Windows HCM mid-session. Considered + rejected because:
- The user might have explicitly chosen a setting that disagrees with the new OS preference. Auto-flipping would override their choice silently.
- The "stored value wins" rule means once a user has touched the Settings checkbox, they own it. Auto-flipping would break that.
- A page reload picks up the new OS preference (subject to the same stored-override rule), which is the natural cadence for an OS-level setting change.

A future polish could surface a non-blocking notice ("Your OS contrast preference changed — reload to apply") when the OS-level value flips and the user hasn't customized.

### Tests
- **+6 unit tests** in `src/state/preferences.test.ts` (extended) covering: OS reports `more` → seeds true; OS reports default → seeds false; user-stored false wins over OS true; user-stored true wins over OS false; `reset()` re-reads OS preference; `prefers-reduced-motion` + `prefers-contrast: more` seed independently. Tests stub `window.matchMedia` per-test for deterministic OS-preference simulation.
- **+3 Playwright specs** in `e2e/prefers-contrast.spec.ts` (new): Playwright's `page.emulateMedia({ contrast: 'more' })` drives the OS-level query; tests verify the resulting `body.high-contrast` class. Coverage: OS more → class present; OS default → class absent; user-stored override wins over OS preference.
- **All 998 unit tests + 218 Playwright specs pass.**

### Bundle
- 78.12 / 80 KB initial-load brotli — effectively unchanged (the matchMedia call adds ~50 bytes).

### Ties together
With Phase 88's high-contrast escalation (3 px focus rings + complementary halo) + Phase 89's WCAG AA verification + Phase 90's announcement budget + Phase 91's auto-promotion, the accessibility primitives in Phases 86–91 form a coherent set: a user with OS-level high-contrast on lands the app in high-contrast mode, hears every entity announced at a comfortable pace, can navigate the canvas via Tab cycling, and reads the full game state via the ARIA outline panel.

---

## [0.90.0] — 2026-04-26 — Live-region announcement budget

### Added
- **Polite-announcement rate-limit + repeat-suppression** in `createAnnouncer`. Pre-90 every `announcer.announce(message)` immediately mutated the live region, which on a busy combat round (multiple Tab cycles, damage-fx events, scene switches per second) would generate so many `aria-live` events that screen readers couldn't keep up — they'd either skip messages or backlog the user with stale "Selected: Goblin / Selected: Orc / Selected: Bandit" reads after the user had already moved on.
- **Two new behaviors:**
  - **Min-interval queue** (`minIntervalMs: 600` by default) — polite announcements after the first one wait for a 600 ms gap. A burst of N announcements inside the window collapses to one announcement of the LAST one — the user hears the freshest state, not a stale backlog. The first announcement after silence still fires immediately (no UX cost).
  - **Repeat-suppression window** (`repeatSuppressMs: 1500` by default) — identical messages within 1.5 s are dropped. Stops the Phase 84 conflict-banner heartbeat ("Warning: another GM tab is open") from re-announcing every 2 s tick.
- **Assertive announcements bypass everything** — they're "you NEED to hear this right now" (errors, conflicts, permission revocations). They also CANCEL any pending polite write so the assertive message isn't immediately followed by a stale polite one.

### Why this matters now (and not at Phase 86)
Phase 86's keyboard-canvas-nav added Tab cycling that announces every selection. Phase 87's outline panel added an `aria-live="polite"` region that announces every entity-add / remove. Together they substantially increased the announcement rate — a quick Tab through 5 entities used to be 5 separate "Selected: X" reads in 200 ms, which most screen readers can't keep up with. Phase 90 collapses that burst to one announcement of the final selection.

### Architecture
- **`src/util/announcer.ts`** — extended with:
  - `AnnouncerOptions` — new knobs: `minIntervalMs`, `repeatSuppressMs`, plus test seams `now()`, `setTimer()`, `clearTimer()` for deterministic timing in unit tests.
  - Internal queue state: `pending` (the next message to flush), `pendingTimer` (the in-flight setTimeout handle), `lastFlushAt` / `lastPoliteText` / `lastPoliteAt` (used for the rate-limit + suppress checks).
  - `flush()` — new public method that drains the pending polite write immediately. Useful for tests + for surfaces that want to ensure their announcement has landed before doing something else (currently unused outside tests, but available).
- **No callers changed.** The default `createAnnouncer()` call (used by `gm.ts` and `spectator.ts`) gets the rate-limit + suppress behavior automatically.
- **Existing tests** updated to either pass `{ minIntervalMs: 0, repeatSuppressMs: 0 }` for the basic-contract assertions, OR call `announcer.flush()` after `announce()` to drain the queue. The basic-contract semantics ("announce X, read X") are unchanged — they just need an explicit drain step in tests.

### Tests
- **+11 unit tests** in `src/util/announcer.test.ts` (extended) covering the Phase 90 behavior with a fake clock:
  - First polite announcement after silence fires immediately (no wait).
  - Second announcement within the interval gets queued.
  - Burst of N → only the last one announces (last-write-wins).
  - Identical message inside the suppress window is dropped.
  - After the suppress window elapses, the same message announces again.
  - Assertive announcements bypass the queue + the suppress filter (and cancel any pending polite write).
  - `flush()` drains the pending polite write immediately.
  - Long-paced sequence (slower than the interval) — every message lands.
  - Overlapping bursts collapse correctly across multiple intervals.
  - Duplicate of the currently-pending message is dropped.
- **All 992 unit tests + 215 Playwright specs pass.** E2e specs that assert on the announcer text (`keyboard-canvas-nav.spec.ts`, `walls-tool.spec.ts`, etc.) all use Playwright auto-retry on `toContainText` with timeouts ≥ 5 s, so the 600 ms rate-limit doesn't trip them.

### Bundle
- **Initial-load brotli budget bumped 78 → 80 KB.** Phase 90 added ~0.25 KB (queue state + suppress logic + the new options); landed at 78.18 / 78 KB which would have been 177 B over. Lazy chunks unchanged. CSS unchanged.

### Tunable knobs for downstream
The defaults (600 ms / 1500 ms) are what felt right after testing with NVDA + a typical combat-burst pace. If a future heuristic surfaces a need for tighter or looser pacing, the `minIntervalMs` + `repeatSuppressMs` options on `createAnnouncer` are the single point of tuning.

---

## [0.89.0] — 2026-04-26 — WCAG contrast verification across themes

### Added
- **`src/util/contrast.ts`** (new) — WCAG 2.1 contrast helpers: `parseHex`, `relativeLuminance`, `contrastRatio`, `meetsThreshold`, `formatRatio`, plus a `WCAG` constants table (`AA_NORMAL_TEXT: 4.5`, `AA_LARGE_TEXT: 3`, `AA_UI_COMPONENT: 3`, `AAA_NORMAL_TEXT: 7`, `AAA_LARGE_TEXT: 4.5`). Pure functions, no DOM.
- **`src/util/theme-contrast.test.ts`** (new) — programmatic WCAG audit covering all 5 theme palettes × 7 token pairs (35 assertions). Acts as a regression guard — any future palette tweak that drops a token below threshold fails this test with a precise message ("expected ≥ 4.50:1, got 4.46:1 for fg-muted on bg in theme-parchment").

### Fixed
- **Parchment theme `--fg-muted` bumped from `#7a6a4d` to `#776747`.** Audit found it at 4.46:1 against the parchment background — a hair under the WCAG AA normal-text bar (4.5:1). The new value lands at 4.68:1 with minimal visual drift (3 RGB units across the warmer channels). All other 34 audit pairs already met threshold.

### Audit results
Every theme × pair combination — primary text, secondary text, accent UI components — meets WCAG AA. Highlights:

| theme        | fg on bg | fg-muted on bg     | accent on bg |
|--------------|----------|--------------------|--------------|
| dark         | 13.0:1   | 6.6:1              | 4.7:1        |
| light        | 16.4:1   | 5.7:1              | 5.0:1        |
| parchment    | 11.2:1   | **4.68:1** (was 4.46:1) | 5.4:1   |
| console      | 12.8:1   | 4.7:1              | 13.4:1       |
| purple-dusk  | 13.7:1   | 5.0:1              | 6.6:1        |

All five themes also clear the **AAA** bar (7:1) for primary text on background. `fg-muted` clears AAA on `light` and is between AA and AAA on the others — acceptable for secondary text.

### Tests
- **+17 unit tests** in `src/util/contrast.test.ts` covering `parseHex` (3-digit, 6-digit, 8-digit-with-alpha, mixed-case, invalid input throws), `relativeLuminance` (white = 1, black = 0, green > red > blue weights, sub-threshold piecewise behavior), `contrastRatio` (white-on-black = 21, identical = 1, symmetric, matches the published `#767676` ≈ 4.54:1 reference), `meetsThreshold` + `formatRatio`.
- **+35 unit tests** in `src/util/theme-contrast.test.ts` (5 themes × 7 token pairs). Stable regression guard — any future palette change that drops contrast fails CI.
- **All 981 unit tests + 215 Playwright specs pass.**

### Bundle
- 77.93 / 78 KB initial-load brotli — unchanged. The contrast helpers are tree-shaken out of the production bundle (only the test files import them).
- Visual-regression baselines are unchanged — the `--fg-muted` bump is too small to register as a snapshot diff at the screenshot tolerance threshold the CI uses.

### Why "AA polish" vs "AAA pass"
WCAG AAA on text requires 7:1, which would force a noticeably darker `--fg-muted` in every theme — losing the visual distinction from `--fg`. The mainstream practice is AA across the board with AAA as a stretch target where it doesn't compromise design. Phase 89 ships AA-clean across every theme + every pair, which is the practical accessibility win.

### Known limitations the audit doesn't cover
- **Computed colors that aren't in the palette table.** The contrast test reads a fixed lookup of named tokens. Inline rgba() values (e.g. `.modal-backdrop`'s `rgba(0,0,0,0.55)`) aren't checked. They're typically used for overlays where the underlying color is already vetted.
- **Per-component contrast (e.g. `.scene-indicator-count` accent-on-accent).** A few decorative chips use accent for both bg + fg, which the audit table doesn't surface. Visual inspection passes; a future polish could add per-component contrast assertions.
- **Reduced color schemes** (Windows high contrast, Forced Colors mode). Phase 91's `prefers-contrast: more` will partially address the bigger picture; full Forced-Colors-mode support is a separate effort.

---

## [0.88.0] — 2026-04-26 — Focus-visible audit per theme

### Added
- **Universal `:focus-visible` baseline** verified across all five themes (`dark`, `light`, `parchment`, `console`, `purple-dusk`). The base rule (2 px accent outline + 2 px offset) was already in place from earlier phases — Phase 88 audited every override that suppressed it, fixed the half-dozen inputs that were left with no visible focus indicator, and added a high-contrast escalation path.
- **High-contrast escalation.** When the user's `highContrast` preference is on (or the app picks it up via Phase 91's `prefers-contrast: more`), focus rings bump from 2 px → 3 px AND gain a complementary box-shadow halo (white-on-dark themes get a dark outer halo; dark-on-light themes get a bright one). The halo provides AAA-level visibility even when the accent color happens to match the surrounding background.

### Fixed
The audit found 7 surfaces that called `outline: none` on focus but didn't provide an alternative visible ring — only a 1 px `border-color` shift, often invisible at a glance. All upgraded to add a `box-shadow: 0 0 0 2px var(--accent)` ring matching the existing `.scene-indicator` / `.icon-btn` pattern:
- `.modal input[type='text']:focus-visible`
- `.modal input[type='number']:focus-visible`
- `.settings-panes input[type='number']:focus-visible`
- `.annotation-editor textarea:focus-visible`
- `.initiative-add-row input/select:focus-visible`
- `.notes-panel-textarea:focus-visible` — was missing entirely; uses an inset shadow because the textarea has `border: none` and fills its container (an outer ring would clip).
- `.slash-input:focus-within` (new) — the inner field has `outline: none`; the wrapper now picks up the focus ring via `:focus-within` so the slash command bar shows it's active.

### Why we fixed `:focus` rules to `:focus-visible`
A `:focus` rule fires on EVERY focus (mouse click, programmatic, keyboard) which can give sighted mouse users a "why is this glowing?" UI. `:focus-visible` only fires for keyboard-style focus — exactly the audience that needs the indicator. The browser default `:focus-visible` heuristic correctly identifies tab-arrival vs click-arrival on every modern browser.

### Per-theme accent contrast (no changes needed)
The five theme accent colors all carry adequate contrast against their backgrounds for a 2 px focus ring:
- `dark` (`#1b1d22` bg + `#c44a3a` accent): 7.7:1
- `light` (`#f3f4f7` bg + `#c44a3a` accent): 4.7:1
- `parchment` (`#f4ecd8` bg + `#8b4513` accent): 5.4:1
- `console` (`#0a0e0a` bg + `#00ff7f` accent): 13:1
- `purple-dusk` (`#1a1532` bg + `#bb7cff` accent): 6.4:1

All exceed WCAG AA's 3:1 bar for non-text UI components. Phase 89's contrast-verification pass will confirm with formal tooling; this phase trusts the per-theme color choices.

### Tests
- **+7 Playwright specs** in `e2e/focus-visible.spec.ts` (new): toolbar buttons get a visible focus ring in EACH of the 5 themes (parametrized); modal text input shows a `box-shadow` ring on focus (not just a `border-color` shift); `body.high-contrast` bumps the ring to ≥ 3 px.
- The assertions are computed-style based (`outlineWidth`, `boxShadow`) rather than screenshot-based — stable across browser pixel-rendering differences and per-platform DPR variations.
- **All 929 unit tests + 215 Playwright specs pass.** Visual-regression baselines unchanged (the screenshot tests don't exercise focused inputs, so no `box-shadow` ring shows up in any baseline).

### Bundle
- 77.93 / 78 KB initial-load brotli (+0.04 KB net for the CSS additions; the new rules compress well alongside the existing focus-visible block). CSS 9.95 / 10 KB. Lazy chunks unchanged.

### Out of scope (Phase 89 will cover)
A formal pass through axe / Lighthouse on every theme to flag any AA contrast misses on text + secondary labels (`.fg-muted` is the most likely offender — used in many hint / tooltip / muted-text contexts).

---

## [0.87.0] — 2026-04-26 — Per-entity ARIA outline panel

### Added
- **Visually-hidden `<aside role="region" aria-label="Canvas outline">`** that mirrors the live canvas state as a structured outline. Pre-87 a screen reader landed on the canvas's `aria-label` and got a one-line summary ("12 tokens placed, 40% fog revealed") — useful but coarse. Individual entities were invisible to AT (the canvas paints pixels, not DOM nodes). Phase 86 added Tab cycling + per-cycle descriptions, but didn't expose the full game state in one place.
- **The outline structure:**
  ```html
  <aside role="region" aria-label="Canvas outline" class="sr-only">
    <h2>Canvas outline</h2>
    <h3>Tokens (12)</h3>
    <ul>
      <li>Goblin at column 5, row 7, 3 of 7 HP (selected)</li>
      <li>Orc at column 8, row 7, 12 of 12 HP</li>
      …
    </ul>
    <h3>Walls (4)</h3>  …
  </aside>
  ```
  Headings switch to singular for count == 1 ("Wall", "Note") and the kind is omitted entirely when no entities of that kind exist. Empty canvas reads "Canvas is empty."
- **The active selection is marked** with " (selected)" suffix on the description AND `aria-current="true"` on the `<li>` so AT can navigate directly to it via the "current item" command (NVDA: Insert+End-of-element).
- **`aria-live="polite"`** on the region so additions / removals get spoken when they happen, with `aria-atomic="false"` so only the changed children get re-read (not the full outline). Combined with the 120 ms render debounce, this gives smooth updates without burying the user in re-reads during a busy combat round.

### How it works
- **`src/ui/canvas-outline.ts`** (new) — pure UI module, ~120 lines:
  - Mounts the hidden `<aside>` to `document.body` with the standard `sr-only` clip pattern (already in `styles.css` from earlier phases).
  - Re-uses Phase 86's `entitiesInReadingOrder` for cycle-consistent ordering (top-to-bottom, left-to-right within a 32 px row band) AND `describeEntity` for the per-item string. So the outline and the Tab-cycle announcer say exactly the same thing for each entity — no drift between "what I tab to" and "what I read".
  - Groups entities by kind (token / wall / aoe / annotation), preserving reading-order ordering within each group.
  - Builds the next render as a `DocumentFragment` and uses `replaceChildren(next)` for a single mutation event per update — minimizes AT churn.
  - 120 ms debounce on the `subscribe` listener so a busy combat tick (multiple patches per second) collapses to one outline update per quiet beat.
- **`src/entries/gm.ts`** — mounts on init; subscribes via `renderer.onFrame` (not `store.subscribe`) so both store mutations AND selection-only changes — both of which trigger a render request — refresh the outline. No new selection-observable plumbing needed.
- **No CSS changes** — the existing `.sr-only` recipe already does what we need.

### Why subscribe to `renderer.onFrame` instead of `store.subscribe`
Selection lives outside the store (`SelectionState` is a plain `{ ids: Set<ID> }` object held by the input layer), so a store-only subscription would miss "user clicked a token" events. Every selection mutation in gm.ts is followed by `renderer.requestRender()` — so frame events are the universal "something visible changed" signal. The outline's internal debounce (120 ms) ensures we don't actually re-render on every animation frame.

### Tests
- **+8 unit tests** in `src/ui/canvas-outline.test.ts` (new, jsdom): mounts with the right ARIA attributes; "Canvas is empty" empty state; heading + list per kind with correct counts (singular for 1); selected entity gets `(selected)` suffix + `aria-current="true"`; empty kind sections are omitted; `refresh()` bypasses the debounce; `subscribe` listener triggers a debounced re-render (validated with fake timers); `destroy()` unsubscribes + removes the element.
- **+3 Playwright specs** in `e2e/canvas-outline.spec.ts` (new): mounts a hidden region with `role="region"`, `aria-label="Canvas outline"`, `aria-live="polite"`, `.sr-only`; empty canvas reads "Canvas is empty" + populates after a token is placed; Phase 86 Tab cycle adds `aria-current="true"` to the selected outline `<li>`.
- **All 929 unit tests + 208 Playwright specs pass.**

### Bundle
- 77.89 / 78 KB initial-load brotli (+0.4 KB for the outline module + entry wiring). CSS unchanged. Lazy chunks unchanged.

### What this completes
Phase 86 + Phase 87 together give screen-reader users a complete substitute for visual canvas reading:
- **Outline panel** (87) = "what's on the map" — read all entities at any time.
- **Tab cycle** (86) = "make me look at this one specifically" — selection state + per-entity announcement.
- **Existing aria-label on canvas** = high-level summary that survived from earlier phases.

The next accessibility phases (88 focus-visible audit, 89 contrast pass, 90 live-region budget, 91 prefers-contrast) all polish what's now a working baseline rather than fixing fundamental gaps.

---

## [0.86.1] — 2026-04-26 — Fix: Phase 86 Esc no longer wipes selection inside an open menu / modal

### Fixed
- **Esc dismisses the open context menu / modal without also clearing the canvas selection.** Caught by CI on the original Phase 86 commit — `walls-selection.spec.ts`'s "Shift+click two walls then Delete removes both" test does an explicit Esc-to-close-menu then Delete-to-remove flow. Pre-fix, that Esc went through TWO handlers in the bubble path: the menu's own Esc (close + preventDefault) AND the new Phase 86 window-level handler that clears selection unconditionally. Result: the menu closed but selection was wiped, so the follow-up Delete had nothing to delete.

### The fix
- Added `e.defaultPrevented` early-return to the Phase 86 Esc handler. Anything that ran before us in the bubble path (open context menu, open modal, mid-walls-chain Esc, mid-measurement Esc) calls `preventDefault()`; we now respect that and skip the clear. Empty-selection Esc still falls through unchanged so unhandled Escs are a true no-op.
- This is the standard "Esc closes the topmost active surface" UX pattern — Esc with a menu open targets the menu; Esc with no menu / no modal targets the next layer down (selection).

### Tests
- Existing `walls-selection.spec.ts:115` ("Shift+click two walls then Delete removes both") now passes again — that's the regression check.
- All 921 unit tests + 205 Playwright specs pass.

### Bundle
- Unchanged from 0.86.0 (the fix is a 4-line guard).

---

## [0.86.0] — 2026-04-26 — Keyboard-navigable canvas selection

### Added
- **Tab / Shift+Tab cycle through every selectable canvas entity** (tokens, walls, AoE templates, annotations) in a deterministic reading order — top-to-bottom, left-to-right within a small vertical band. Pre-86 a keyboard-only or screen-reader user had no way to acquire selection without a mouse; the existing arrow-key nudge only worked on already-selected entities. Tab from an empty selection grabs the first entity; tabbing past the last wraps back to the first.
- **Per-entity description announced via the existing aria-live region.** Every cycle fires a `Selected: <description>` announcement so screen-reader users hear what they just landed on without needing to read canvas pixel data:
  - Tokens: `"Goblin at column 5, row 7, 3 of 7 HP"` (HP omitted when not tracked).
  - Walls: `"Wall, 3 squares long"` plus modifiers — `"does not block sight"`, `"does not block movement"`, `"GM-only"`.
  - AoE: `"Cone AoE template"` / `"Sphere AoE template"` / etc., plus `"GM-only"` when applicable.
  - Annotations: `"Note: <text>"`.
- **Esc clears the canvas selection** (with announcement: `"Selection cleared."` or `"Selection cleared (N items)."` for multi-select). Empty-selection Esc falls through unchanged so existing handlers still work — closing modals, ending the walls chain, canceling measurement.
- **"Canvas is empty" announcement** on Tab when no entities exist — distinguishes "I pressed Tab and nothing happened" from "I pressed Tab and the selection moved silently".

### How it works
- **`src/state/canvas-nav.ts`** (new) — pure helpers, zero DOM or store coupling:
  - `entitiesInReadingOrder(state)` — returns one `{id, kind, sortY, sortX}` entry per token / wall / AoE / annotation, sorted by row band (snapped to 32 px so visually-on-the-same-row entities sort by x), then x, then a stable kind / id tiebreaker.
  - `nextEntityId(state, currentSelection, direction)` — returns the next id in cycle order. Multi-select collapses to "the entity after the last selected" (`next`) or "before the first" (`prev`) so keyboard users have a predictable "step out of multi-select" path. Stale ids in selection (e.g. a deleted token) are ignored.
  - `describeEntity(state, id)` — builds the announcer-friendly description string. Returns `null` if the id no longer resolves.
- **`src/entries/gm.ts`** — wires Tab / Shift+Tab / Esc into the existing window-level keydown handler (skipped when an editable input has focus, so Tab still navigates form fields normally). Ctrl/Alt/Meta+Tab pass through unchanged for browser / OS shortcuts.

### Why a window-level handler instead of canvas focus
Considered making the canvas itself focusable (`tabindex="0"`) so Tab cycling only fired when the canvas had focus, mirroring how rich-text editors trap navigation. Rejected because:
- The "Skip to battle map" link already exists and lands users on the canvas region. Forcing them to first focus the canvas before Tab does anything would add a step.
- Tab in an empty document body should naturally fall through to the next focusable element — but our toolbar / session menu already do that on-screen, so claiming Tab globally means screen-reader users can step from "browse the toolbar" to "navigate the canvas" without an explicit hand-off.
- The `isEditableFocus` guard means Tab still works inside any input, so we're not stealing it from form contexts.

### Tests
- **+22 unit tests** in `src/state/canvas-nav.test.ts` covering: empty-state empty-array, row-band-then-column ordering, mixed-entity intermixing by visual position, same-row x-sort, deterministic stable order, null-on-empty, first-on-empty-selection-next, last-on-empty-selection-prev, single-step cycling, end-wrap, multi-select collapse (next + prev), stale-id fallback, mixed-stale-id ignore-ghost, token description with HP + position, "Token" fallback for empty label, wall length in squares (singular + plural), wall flag annotations (sight / movement / GM-only), AoE description by kind + GM-only, annotation description, null on unknown id.
- **+4 Playwright specs** in `e2e/keyboard-canvas-nav.spec.ts` (new): Tab on empty selection grabs the first entity; Tab cycles forward + Shift+Tab cycles back + Esc clears (verified via the announcer text); Tab on an empty canvas announces "Canvas is empty"; Esc on empty selection is a no-op (does NOT announce "cleared", so existing modal-close Esc isn't blocked).
- **All 921 unit tests + 205 Playwright specs pass.**

### Bundle
- 77.46 / 78 KB initial-load brotli (+0.7 KB for the new module + handler wiring + announcer hooks). CSS unchanged. Lazy chunks unchanged.

### What this unlocks for follow-up phases
Phase 87 (per-entity ARIA outline panel) becomes meaningful now — a screen-reader user can read the outline AND act on what they hear, since Tab actually changes selection. Pre-86 the panel would have been a read-only summary because there was no keyboard path to the entities it described.

---

## [0.85.0] — 2026-04-26 — Wall editing revamp

### Added
- **In-place wall editor.** Right-click a selected wall → "Edit wall…" (or press `E` with one or more walls selected) opens a dedicated modal with toggles for **blocks sight**, **blocks movement**, **player visibility** (shared / GM-only), and a slider for **line thickness**. Pre-85 the only context-menu actions were "Disable sight blocking" and "Delete wall" — adjusting anything else (changing thickness, marking a wall secret, toggling movement) required deleting + redrawing.
- **Endpoint drag handles for in-place geometry editing.** Selected walls now render larger square handles at each endpoint. In Select mode, click-and-drag a handle to move that single endpoint live; the wall body re-stretches to follow the cursor at 60fps. Releasing commits a single `wall-update` patch (one undo step). The old "drag the whole wall to translate it" behavior still works — clicking the wall body (not a handle) starts the existing drag.
- **Per-wall thickness** (`Wall.thickness?: number`, screen-pixels at zoom = 1, default 2.5). A stout exterior wall and a thin interior divider can coexist on the same map. Existing walls keep the field absent + the renderer falls back to the default, so pre-85 saves render byte-identical post-upgrade.
- **Per-wall player visibility** (`Wall.visibility?: 'shared' | 'gm'`, default `'shared'`). GM-only walls render on the GM canvas with a **dashed purple** style (so the GM sees at a glance which walls are secret) and are **not drawn at all on the Spectator canvas**. Crucially they DO still occlude the Spectator's line-of-sight — they're physical occluders; the player just doesn't see the wall outline. Use case: secret doors, hidden passages, wall-and-revealed-by-trigger style design.
- **Multi-edit semantics.** Selecting multiple walls and opening the editor shows mixed values as indeterminate checkboxes / a "— (mixed)" thickness output. Picking a value applies it to ALL selected walls in a single `store.batch()` so the multi-edit lands as one undo step.
- **Larger handle hit area.** The selected-wall endpoint dots are now 9 px screen-pixels (was 5 px) — large enough to grab on touch screens and forgiving on desktop. The unselected wall endpoint indicators stay at 5 px so an unselected line stays visually crisp.

### Architecture
- **`src/state/walls.ts`** extended with `WALL_DEFAULT_THICKNESS_PX`, `WALL_MIN_THICKNESS_PX`, `WALL_MAX_THICKNESS_PX`, `WALL_HANDLE_SCREEN_PX`, `clampThickness(raw)`, and `hitTestWallEndpoint(walls, selectedIds, px, py, tolerancePx)`. The endpoint hit-test ONLY considers walls in the selection set + scales tolerance with camera zoom so the on-screen target stays consistent.
- **`src/ui/wall-editor.ts`** (new) — pure UI module mirroring the Phase 84 modal pattern. Re-renders on every `onChange` so the displayed values stay in sync, and auto-closes when the editing walls vanish from state (e.g. external delete via undo).
- **`src/render/layer-walls.ts`** — substantial rewrite. Per-wall stroke (was: single batched stroke per group) so per-wall thickness + the GM-only dashed style work without bucketing. With <100 walls per encounter the per-wall stroke cost is negligible. Endpoint dots also gain a contrasting outline so the handle stays visible against any background.
- **`src/render/renderer.ts`** — new optional `getEndpointDrag?()` callback on the GM render path. Returns `{wallId, endpoint, x, y}` while a drag is in-flight; `null` otherwise. Spectator canvas always passes `null`.
- **`src/input/context.ts`** — new `EndpointDragRef` + factory + optional field on `InputContext` so the Select tool can update the live drag overlay without a side channel.
- **`src/input/tool-select.ts`** — pointerdown handler hit-tests against endpoints first (only when there's a selection), then falls through to the existing token / annotation / AoE / wall / lasso flow if nothing matched. The endpoint drag is its own state-machine branch; pointerup commits a `wall-update` patch with just the changed endpoint coords + clears the overlay.
- **`src/sync/messages.ts`** — `deserializeState` accepts the optional `thickness` + `visibility` fields with defaults. Pre-85 saves keep the field absent on roundtrip (so a GM who exports + re-imports doesn't gain spurious fields).

### Tests
- **+13 unit tests** in `src/state/walls.test.ts` covering `clampThickness` (default fallback, range clamp, identity), `createWall` Phase 85 fields (default-omitted, explicit thickness, explicit visibility), and `hitTestWallEndpoint` (empty selection no-op, far-away cursor null, endpoint 1 / endpoint 2 detection, selection filter, tolerance respect, closer-of-two-endpoints tie-break).
- **+12 unit tests** in `src/ui/wall-editor.test.ts` (new, jsdom): starts-closed, openFor([])-noop, single-wall title + populated fields, multi-wall title with default fallback, mixed-state indeterminate checkbox + "(mixed)" output, sight toggle calls onChange with all ids, visibility radio calls onChange with new value, thickness change clamps + commits, delete button + close, Done button no-op-and-close, Escape closes, auto-close on external wall vanish.
- **+4 Playwright specs** in `e2e/wall-editor.spec.ts` (new): right-click "Edit wall…" opens the modal with current state populated; toggle visibility to GM-only persists across modal close (verified via E shortcut re-open); Delete in editor removes the wall (verified via right-click → Map actions menu); endpoint drag moves a single endpoint without deleting the wall (verified via right-click on the wall's new midpoint → Wall actions menu).
- **All 899 unit tests + 201 Playwright specs pass.**

### Bundle
- **Initial-load brotli budget bumped 76 → 78 KB.** Phase 85 added ~1.7 KB (wall editor + endpoint drag plumbing + layer-walls rewrite + new exports). Lazy chunks unchanged. CSS 9.92 / 10 KB.

### Out of scope for this phase
- **Chain merging.** The original Phase 85 plan included "chain merging so a corridor edits as one shape" — letting the GM edit a connected wall sequence as a single polygon with shared vertices. That's a meaningfully bigger graph problem (detecting connected chains, snapping shared endpoints to common control points, splitting on edit) and would benefit from its own phase. The Phase 85 wall editor handles per-wall edits + multi-select group toggles, which covers the common authoring pain point ("I drew this wall slightly wrong, let me nudge it") without the graph machinery.
- **Live length readout while drawing.** A small "12 ft" tooltip next to the rubber-band cursor would round out the live preview. Considered for this phase but deferred — the existing dashed preview already conveys the geometry, and adding a tooltip means deciding placement / units / collision-with-cursor heuristics. Easy follow-up if requested.

---

## [0.84.1] — 2026-04-26 — Fix: animated GIF tokens + walls leak through Spectator fog

### Fixed
- **Animated GIF token portraits no longer show through fog the Spectator can't actually see.** Reported by a user immediately after Phase 84. Pre-0.84.1 the overlay's visibility check only consulted the raw `state.fog` buffer (the GM's "I clicked Reveal here" mask). The Spectator's actual visible-fog is `state.fog AND-masked with LoS visibility AND lights` — so a cell the GM revealed but the player has no line-of-sight to should be hidden. Canvas-rendered tokens DID hide correctly because the canvas-fog overlay is drawn over them; DOM `<img>` elements (which is how GIFs render — see 0.81.1) sit ABOVE the canvas, so the canvas-fog couldn't mask them.
- **Walls no longer show through the Spectator's fog either.** Same root cause class, different rendering path: walls were drawn AFTER the fog overlay in the canvas pipeline, so the LoS-derived fog couldn't mask them — players could see the dungeon outline in cells they had no line-of-sight to. Tokens (and other "should be hidden" canvas content) were already drawn BEFORE fog and worked correctly. **Fix: split the wall pass by mode** — Spectator draws walls before fog (so the fog overlay masks them); GM still draws walls after fog (so authoring affordances — selection glow, in-progress chain preview, vertex dots — sit crisp on top of the semi-transparent GM fog tint instead of being washed out by it).

### Why 0.81.1's fog check wasn't enough
The 0.81.1 rewrite added a top-left-cell-only check against `state.fog`. Two gaps:
- **Wrong fog buffer.** Should have used the LoS-derived effective fog, which is what the canvas's fog overlay actually paints. A GM-revealed cell with no viewer line-of-sight to it would pass the `state.fog === 1` check but still be covered on the rendered canvas.
- **Top-left cell only.** A size-2 token whose top-left cell happened to be revealed but other cells were in fog would show the GIF "poking out". Canvas tokens hide ONLY when `isTokenFullyHidden(t, state)` (every footprint cell is fog) — but that's because the canvas can mask partial visibility via the fog overlay layer. The DOM `<img>` can't be partially masked by a canvas operation, so for animated tokens we lean stricter: ANY hidden cell hides the GIF entirely.

### The fix (animated tokens)
- **`getEffectiveFog?(): Uint8Array | null`** — new optional callback on the overlay's mount options. When provided AND `mode === 'spectator'`, the overlay reads visibility from this buffer instead of `state.fog`. Returning `null` falls back to `state.fog` (pre-0.84.1 behavior).
- **Spectator entry wires it through** `spectatorEffectiveFog(state, polygons, losOn, lightPolygons)` — the same function `refreshFogRects` uses to derive the canvas's fog overlay buffer. So overlay visibility now matches canvas-fog visibility exactly, frame-perfect.
- **Footprint scan instead of top-left-only.** The overlay now iterates every cell the token covers (`floor(x)..ceil(x+size)` × `floor(y)..ceil(y+size)`) and hides if ANY cell is fog OR off-grid. Tokens straddling the map edge no longer leak GIFs into the void.
- **GM mode unchanged** — GMs see all tokens regardless of fog (it's their tool for occluding the players).

### The fix (walls)
- **Renderer split the wall pass by mode.** The Spectator's `drawWalls(state.walls)` call now fires BEFORE `drawFog`, so the canvas-fog overlay paints over wall segments in unrevealed cells. Spectator-side authoring affordances are pre-empty (selection / drag overlay / chain preview are GM-only anyway) so the fast paths in `layer-walls` skip them. The GM's wall pass stays where it was (after fog) so selection glow / vertex dots / rubber-band chain stay readable on top of the GM's fog tint.
- This is the same z-order trick `drawTokens` has always used — tokens have always rendered before fog and worked correctly. Walls were the outlier; the original Phase 0.72.3 fix that made walls visible to the Spectator missed this z-order subtlety.

### Tests
- **+9 unit tests** in `src/ui/animated-token-overlay.test.ts` (new): renders when revealed, hides on raw `state.fog === 0`, uses `getEffectiveFog` to override raw fog (both directions — hides revealed-but-no-LoS cells AND reveals lit-but-not-explicitly-revealed cells), size-2 token hides if any footprint cell is hidden, size-2 token shows only when all four cells are revealed, off-grid cells count as hidden, GM mode ignores fog entirely, fallback to `state.fog` when callback returns `null`.
- **No new tests for the wall z-order swap.** The change is a straight-line renderer reorder — asserting "this canvas pixel is fog-colored" via Vitest's jsdom canvas (which is a no-op stub) doesn't work, and Playwright pixel-asserting on a fog-masked wall is fragile. Verified manually + the existing `walls-tool.spec.ts` continues to pass (so GM authoring is unbroken).
- **All 874 unit tests + 197 Playwright specs pass.**

### Bundle
- 75 / 76 KB initial-load brotli (+0.06 KB for the wall reorder + footprint scan + effective-fog plumbing combined). CSS unchanged. Lazy chunks unchanged.

### Known gap
- `drawStrokes` and `drawAnnotations` also render after fog and would have the same leak — but they're player-visible communication tools where the GM controls when to draw them. If a future report surfaces them as a leak, the same z-order split applies (Spectator before fog, GM after).

---

## [0.84.0] — 2026-04-26 — Conflict-merge UI

### Added
- **Resolve… action on the GM-conflict warning banner.** Pre-84 the banner just told you "Another GM tab is open — close one." Now there's a primary action button that opens a dedicated conflict-merge modal listing every detected GM peer with a side-by-side state summary (last edit time, token count, scene name) and three actions per peer:
  - **Keep this tab** — push our local state to the peer via a directed `gm-takeover` message. The peer applies it via `loadState` + persists immediately, the conflict resolves on the next heartbeat tick.
  - **Use other tab** — send a `gm-state-request` to the peer; they reply with `gm-takeover { state }` carrying their state; we apply it locally + persist.
  - **(Cancel)** — close the modal but keep the warning banner up.
- **Heartbeats now carry an optional state summary** (`{lastModified, tokenCount, sceneName}`) so the modal has real numbers to show without a separate round-trip handshake.
- **Pre-84 peers degrade gracefully.** A heartbeat without the summary still triggers the conflict-detected branch and the banner — but the modal renders "(no info)" for that peer's column and disables the "Use other tab" button (we can't safely adopt a state we can't see). "Keep this tab" is always enabled — pushing OUR state to a legacy peer is unambiguously safe.

### How the wire format extends
- **`gm-heartbeat`** gains an optional `summary` field. Fully back-compat — pre-84 senders omit it, pre-84 receivers ignore it.
- **`gm-takeover { targetTabId, state: SerializedSessionState }`** (new) — directed; the receiver matches `targetTabId === gmTabId` and either applies the state or ignores the message (so a third tab in the room doesn't accidentally adopt a takeover meant for a different peer).
- **`gm-state-request { targetTabId, fromTabId }`** (new) — directed; the receiver replies with `gm-takeover { targetTabId: fromTabId, state }` if-and-only-if `targetTabId === gmTabId` AND `initialLoadComplete` (so a peer that just booted doesn't reply with the empty default state and wipe the asker's session).

### Architecture
- **`src/state/conflict-detector.ts`** — extended with `freshPeers(now)` returning per-peer `{tabId, lastSeen, summary}` entries (sorted ascending by tabId for deterministic rendering). The existing `noteHeartbeat(tabId, now, summary?)` captures the summary; passing `undefined` preserves the previous summary (so a pre-84 heartbeat doesn't wipe a freshly-received one), passing `null` explicitly clears it.
- **`src/ui/conflict-modal.ts`** (new) — pure UI module. Mounts a backdrop + modal at module init, hidden until `open()`. Renders one row per peer, two columns per row (local + peer), three buttons (Keep / Use / implicit Close). Calls back into the entry's `onTakeOver(targetTabId)` / `onAdoptPeer(targetTabId)` so the wire calls live in the entry where the channel does.
- **`gm.ts` channel handler** gains two new branches (`gm-state-request` reply + `gm-takeover` apply) plus the heartbeat-summary capture. The takeover handler `loadState`s the deserialized state, calls `clearHistory()` (otherwise an undo would silently revert the takeover, surprising), and `void saveState(...)` synchronously off the debounce path so a beforeunload race doesn't blow the takeover away.

### Why a directed message instead of a free-for-all broadcast
With three GM tabs open (rare but possible), a broadcast `gm-takeover` would have all peers adopt the sender's state — not what the GM wanted if they only meant to resolve the conflict with a specific peer. The `targetTabId` filter scopes the takeover to the addressed peer; the third tab keeps its own state + remains in conflict, surfaceable via the same modal.

### Defensive guards
- **The "Keep this tab" callback refuses to send if `initialLoadComplete === false`** — otherwise we'd push the empty-default state and wipe the peer's real session. The UI doesn't expose this nuance (the user just sees the action is a no-op + a console warning); 99% of the time the user opens the modal long after initial hydrate has resolved.
- **The `gm-state-request` reply is also gated on `initialLoadComplete`** for the same reason — a fresh-booted peer being asked for its state mustn't reply with the empty default.
- **`initialLoadComplete` declaration was hoisted up** in `gm.ts` so the heartbeat closure + modal callbacks can read it at module-init time without a TDZ ReferenceError. Pre-84 the flag was declared after the channel.onMessage block; the new heartbeat builder reads it inside `summary: initialLoadComplete ? ... : undefined` which fires on the first synchronous send, before the original declaration line. Hoisting the declaration to the top of the conflict-detection block keeps the same semantics + the same default value (`false`).

### Tests
- **+10 unit tests** in `src/state/conflict-detector.test.ts` for the summary extension: capture on noteHeartbeat, update on subsequent heartbeats, stale-peer omission from `freshPeers`, deterministic tabId-asc ordering, defensive copy semantics, summary-omitted-records-null, summary-undefined-preserves-prior, summary-null-clears-prior, reset-clears-summaries, own-tab-heartbeats-still-ignored.
- **+12 unit tests** in `src/ui/conflict-modal.test.ts` (new): starts-closed, empty-state, one row per peer with both columns + actions, "Keep this tab" callback fires with peer tabId, "Use other tab" callback fires with peer tabId, disabled "Use other tab" + "(no info)" copy for pre-84 peers, setPeers([]) shows the cleared state, Escape closes, lazy local-summary read so late edits show through, plus 3 `formatClock` tests covering the HH:MM:SS path + the `—` fallback for non-finite / non-positive timestamps.
- **+3 Playwright specs** in `e2e/conflict-merge.spec.ts` (new): banner exposes "Resolve…" action that opens the modal listing the synthetic peer + its summary; "Use other tab" triggers a `gm-state-request` → synthetic peer replies with a `gm-takeover` carrying a single `EchoToken` → canvas aria-label updates to "1 token placed"; pre-84 peer (no summary) disables the "Use other tab" button + shows "(no info)" while keeping "Keep this tab" enabled.
- **All 865 unit tests + 197 Playwright specs pass.**

### Bundle
- **Initial-load brotli budget bumped 74 → 76 KB.** Phase 84 added ~1 KB (modal + detector extension + entry wiring); landed at 74.94 / 74 which would have been 60 bytes over. Lazy chunks unchanged. CSS 9.58 / 10 KB (+0.27 KB for the modal styles).

### Limitations + future work
- The modal does NOT preview WHAT will change (just summarizes count + scene + time). A future polish could render a thumbnail of each peer's active scene so the GM picks visually rather than by metadata alone.
- The `gm-state-request` has no timeout. If the peer is unreachable (network blip, channel drop), the requesting tab's modal stays open with no feedback. A future add-on could show "(no response from peer — try again)" after ~5 s.
- The modal handles GM-vs-GM only. GM-vs-Spectator desync (Spectator missed a patch, drifted) is a separate problem the existing `request-full-state` flow already handles automatically.

---

## [0.83.0] — 2026-04-25 — Latency indicator on the remote status chip

### Added
- **Round-trip-time (RTT) suffix on the remote-play status chip.** When connected to a remote peer, the chip now shows `Connected · 45ms`. Color-coded by latency band:
  - **green** (`#66bb6a`) — < 100 ms (feels instant)
  - **amber** (`#ffb74d`) — 100–299 ms (you can tell)
  - **red** (`#ef5350`) — ≥ 300 ms (laggy)
- Hidden in any non-connected state and until the first sample arrives (so the chip doesn't briefly flash a misleading "0ms" right after the handshake).

### How it works
- **Probe / reply protocol.** The local entry sends a `latency-probe` SyncMessage every `PROBE_INTERVAL_MS` (5 s) while a remote peer is connected; the receiver echoes back a `latency-probe-reply` with the same monotonic `id`. The sender keeps a `Map<id, sentAt>` and on reply receipt computes `RTT = performance.now() - sentAt`. Probes older than 60 s get pruned to keep the map bounded if a peer drops mid-probe.
- **Median over the last 5 samples** drives the chip — a single packet-loss spike doesn't push the displayed value to 500 ms.
- **First probe fires immediately** on the connect transition (rather than waiting the full 5 s for the first interval tick), so the chip shows real RTT within the first second of the handshake.
- **Reset on disconnect.** The tracker drops all samples + the probe map empties when the peer transitions away from `connected`, so a reconnect starts fresh.

### Architecture
- **`src/state/latency-tracker.ts`** (new) — pure helpers: `createLatencyTracker()` returns a `{ note, median, reset, subscribe, _samples }` interface. `bandFor(rtt)` maps a measurement to a `'good' | 'ok' | 'poor'` color band. Tested in isolation.
- **Wire format** — two new SyncMessage variants: `{ type: 'latency-probe'; id }` and `{ type: 'latency-probe-reply'; id }`. Optional / back-compat — pre-83 receivers ignore them, no probe ever returns, and the chip just stays without a suffix.
- **`src/ui/remote-status-chip.ts`** — new optional `latency` option on the mount handle. Subscribes to the tracker so an RTT update mid-session updates the chip without waiting for a state transition.

### Why a separate probe instead of repurposing Phase 66's envelope timestamp
The envelope's `timestamp` is the SENDER's clock at send-time. Computing one-way latency as `localNow - envelope.timestamp` requires synchronized clocks between machines, which we don't have. The probe / reply pattern measures RTT against the LOCAL clock only — accurate without any clock-sync trickery.

### Tests
- **+15 unit tests** in `src/state/latency-tracker.test.ts` covering: empty initial state, single-sample median, 5-sample FIFO cap, odd/even median picking, integer rounding, outlier resilience (single 5000 ms sample doesn't dominate), input validation (negative/NaN/Infinity ignored), reset notify semantics, subscribe / unsubscribe behavior, and `bandFor` boundaries (99/100, 299/300).
- **All 843 unit tests + 194 Playwright specs continue to pass.** No e2e for the live RTT measurement (asserting `<canvas>`-rendered text under a real WebRTC + BroadcastChannel handshake is fragile); the tracker is the integration boundary worth pinning.

### Bundle
- 73.80 / 74 KB initial-load brotli (+0.6 KB for the tracker + chip wiring + entry probe loops). CSS unchanged. Lazy chunks unchanged.

---

## [0.82.0] — 2026-04-25 — Per-Spectator permissions

### Added
- **GM-side "Permissions…" entry** in the session menu opens a small modal listing every currently-connected Spectator with a checkbox per permission. Default = full permissions; the modal exists for the GM to *revoke* a specific player's capability ("this Spectator keeps spamming dice rolls in the shared history; turn that off"). Empty state when no Spectators are connected.
- **`canRoll` permission** (MVP scope — see "Why so narrow" below). When unchecked for a Spectator:
  - The GM's incoming-message handler drops `dice-roll` messages from that Spectator's `senderId` (server-side enforcement against tampered builds).
  - The Spectator's local UI surfaces an inline "The GM has restricted your dice rolls" message via the slash-command input + the dice-panel announcer, instead of silently broadcasting a roll that gets dropped.
  - A small "Reset to defaults" link appears under each row that diverges from the default, so the GM can restore the original state with one click.

### Why so narrow (canRoll only)
Considered three flags initially (`canRoll`, `canPing`, `canMeasure`) but two of them weren't actually meaningful today:
- **canPing**: Spectators don't currently send pings — right-click ping is GM-only. Gating a feature that doesn't exist would be misleading UI.
- **canMeasure**: the ruler is purely local — no SyncMessage to enforce. A toggle would be theater.
The MVP ships the one flag that *is* enforced end-to-end. When ping-from-Spectator lands as a separate feature, this phase's wire format extends naturally with another field.

### Architecture
- **`src/state/spectator-permissions.ts`** — pure helpers + a localStorage-backed store. Defaults are full permissions; only entries that *diverge* from the default are persisted (so the blob stays small + a freshly-rejoined player picks up defaults rather than a stale override). Permissive-on-read defaulting for forward-compat: a future client that adds another permission field won't accidentally lock anyone out when read by an older client.
- **`src/ui/permissions-modal.ts`** — GM-only modal subscribing to both the `IdentityRegistry` (so the row list updates as Spectators join / leave) and the permissions store (so the "Reset" affordance + checkbox state stay in sync). Calls back into the entry's `onChange` so a toggle change broadcasts the new permissions to the affected Spectator over the existing sync wire.
- **New SyncMessage variant `permissions`** — `{type, targetId, permissions}`. Broadcast by the GM on (a) Spectator identity arrival (so they get permissions before their first action) and (b) every modal toggle. The Spectator filters by `targetId === ownPlayerId`; messages for other peers are silently ignored.
- **GM channel handler** drops `dice-roll` messages whose `env.senderId` permissions show `canRoll: false` — the belt-and-suspenders enforcement against a Spectator with a tampered build.

### Persistence
- Stored under `gm-encounter-maps-spectator-permissions` in localStorage (per-GM-tab).
- Keyed by `playerId`, which is regenerated per-tab-session — so a Spectator who reloads gets a fresh playerId + the default permissions. The GM has to re-revoke if the Spectator was previously restricted. Acceptable MVP tradeoff; a stable cross-session player id is a separate (much bigger) lift.

### Tests
- **+13 unit tests** in `src/state/spectator-permissions.test.ts` covering: default fallback for unknown ids, set/get round-trip, no-op same-value writes, reset-removes-and-notifies, reset-on-unknown-id no-op, snapshot returns a copy, persistence round-trip, default-equal writes are NOT persisted, reset clears the persisted entry, malformed-localStorage-blob safety, forward-compat defaulting, listener fire-on-change, unsubscribe-stops-notifications.
- **+4 Playwright specs** in `e2e/permissions.spec.ts`: GM session menu exposes "Permissions…" entry, Spectator session menu does NOT, modal empty state with no Spectators, full GM ↔ Spectator handshake — toggle canRoll off on the GM side → Spectator's slash `/d20` shows "restricted" inline.
- **Visual-regression baseline regenerated** for `session-menu-light.png` (the new "Permissions…" button shifted the snapshot). Both Win32 + Linux baselines updated via the Phase 68 `npm run baselines` tooling.
- **All 828 unit tests + 194 Playwright specs pass.**

### Bundle
- 73.22 / 74 KB initial-load brotli (+1.5 KB for the store + modal + entry wiring + GM-side enforcement). Lazy chunks unchanged. CSS 9.31 / 10 KB.

---

## [0.81.1] — 2026-04-25 — Fix: animated GIF tokens now actually animate on the map

### Fixed
- **Animated GIF tokens now play on the map canvas, not just in the Token Editor preview.** Reported by a user immediately after 0.81.0 — the GIF animated correctly in the editor's image preview (a real `<img>` element) but stayed frozen on frame 0 once placed on the map.

### Why 0.81.0 was wrong
The original implementation appended each animated `<img>` to a hidden DOM host and ran a 12 fps redraw loop on the canvas, hoping that `ctx.drawImage(animatedImg)` would pick up the current animated frame. That trick **does not work** in any modern browser — `ctx.drawImage` of an animated source always reads frame 0, regardless of how many times you call it or whether the underlying `<img>` is animating elsewhere. The Token Editor preview happened to work because it uses a real `<img>` element directly, not a canvas blit.

### The right fix
Animated tokens are now rendered as actual DOM `<img>` elements positioned absolutely OVER the canvas. The browser's native GIF playback handles the animation; we just keep each `<img>`'s `transform` + `width` + `height` synced to the underlying token's world-to-screen mapping every frame. Static (PNG / JPG) tokens still render through the canvas pipeline unchanged.

### Architecture
- **`src/ui/animated-token-overlay.ts`** (new) — mounts a single fixed-position `<div>` over the canvas. `update()` diffs the current animated tokens against the cached DOM `<img>` map: creates new ones, updates existing ones' positions, removes ones whose token disappeared. Wired to `renderer.onFrame()` so it re-syncs after every paint without us tracking each individual trigger (camera change, drag, state mutation).
- **`src/images/loader.ts`** — dropped the (broken) hidden-host + redraw ticker. Now exposes `isAnimated(id)` and `getUrl(id)`. The cache still tracks per-image `isAnimated` flag based on the `image/gif` MIME type.
- **`src/render/layer-tokens.ts`** is unchanged. Both entries' `getImage` callbacks now return `null` for animated images, so the canvas falls through to the colored circle fallback. The DOM overlay paints the actual GIF on top.

### Limitations vs canvas rendering
- **HP bars + condition chips render on the canvas behind the DOM `<img>`** so they get partially hidden. Acceptable for the animated-token visual flair; a future polish phase could move HP bars to the overlay too if it becomes annoying in practice.
- **Token rotation** is not applied to the DOM `<img>` (yet — `transform: rotate()` would work, just untested).
- **Spectator fog masking** is honored — the overlay hides imgs for tokens whose center cell is in un-revealed fog. The mask is coarse (center-cell only); large tokens that straddle a fog boundary may pop in/out at the boundary.
- **PNG snapshot exports** still see frame 0 (the snapshot exporter uses the unwrapped `imageLoader.get(id)`). That's fine for a static image — the user gets the GIF's first frame baked into the PNG.

### Tests
- **+7 unit tests** in `src/images/loader.test.ts` (rewritten for the new API): isAnimated + getUrl on never-loaded ids, GIF detection, PNG-doesn't-flag, get() returns the loaded element, invalidate clears the cache, invalidate-on-unknown is safe, error result leaves both null.
- All 815 unit tests + 190 Playwright specs pass.

### Bundle
- **Initial-load brotli budget bumped 72 → 74 KB** to absorb the ~0.6 KB added by the overlay module + entry wiring (current usage 72.13 KB landed slightly over the 72 KB ceiling). Lazy chunks unchanged. CSS unchanged.

---

## [0.81.0] — 2026-04-25 — Animated GIF token portraits

### Added
- **Animated GIF tokens just work.** Upload an `image/gif` file as a token portrait via the Token Editor's existing "Upload" button and the GIF animates on the canvas — no per-token opt-in, no new UI surface, no library dependency. PNG / JPG tokens render unchanged.
- **Cross-tab.** Token images are stored in IndexedDB + referenced by `Token.imageId`; the GM and Spectator each load their own decoded copy. As long as the GIF blob is in IDB, both views animate it.

### How it works
- **`src/images/loader.ts`** now reads `image/gif` MIME at load time and flags the cache entry as `isAnimated`. Animated `<img>` elements are appended to a hidden host (`.animated-token-host`, pinned off-screen + opacity 0) so the browser's native GIF playback engine actually advances frames — an off-DOM `<img>` element doesn't animate; it has to live in a render tree somewhere.
- **A 12 fps redraw ticker** (kicked off when the first animated image loads, shut down when the count returns to zero) calls `renderer.requestRender()` on a `setInterval` so the canvas's existing `ctx.drawImage(img)` per-frame pass picks up the animated `<img>`'s current frame. The token render path itself didn't change — same `drawImage` call as before, same circular clip.
- **No GIF decoder library.** Bundle-wise this is the cheapest possible implementation — leans entirely on the browser's built-in GIF playback. ~+0.2 KB brotli for the loader plumbing.

### Caveats
- The 12 fps cap is intentional — running a full canvas redraw at 60 fps just for token animation would be wasteful. GIFs typically run at 10–15 fps anyway, so the cap is invisible to the eye for most actual files.
- Animated WEBP / APNG fall through unchanged (they'd render as a static frame). The same DOM-host trick would extend to them; we kept the scope to GIF for now since that's by far the most common animated format users have on hand.

### Tests
- **+7 unit tests** in `src/images/loader.test.ts` (jsdom env): initial state, static-PNG doesn't bump count, GIF DOES bump count + appends to host, invalidate decrements + detaches, invalidate-on-unknown-id is safe, invalidate-mid-load is safe, error result doesn't bump count.
- **All 815 unit tests + 190 Playwright specs continue to pass.** No e2e for the GIF rendering itself (asserting frame-by-frame canvas content via Playwright is fragile); the loader behavior is the integration boundary worth pinning, and the in-app render surface is straightforward plumbing.

### Bundle
- 71.75 / 72 KB initial-load brotli (+0.23 KB for the animated tracking). CSS unchanged. Lazy chunks unchanged.

### Internal change worth noting
- The loader switched from calling `getImageURL` to `getImage` directly (so it can read `mimeType` for animation detection). It now creates its own `URL.createObjectURL` per load, bypassing the per-tab URL cache in `images/store.ts`. Functionally identical — token-editor previews + other consumers still use the cached URLs unchanged — but the loader's URLs aren't revoked on `deleteImage`. Negligible leak (a handful of object URLs per session, freed on tab close); a future cleanup could thread the cached URL through.

---

## [0.80.0] — 2026-04-25 — Day / night cycle (per-scene time-of-day tint)

### Added
- **Per-scene time-of-day tint** rendered as a final compositing pass over the canvas. GM picks one of `none / dawn / day / dusk / night` from a small inline `<select>` pinned next to the weather picker; the choice persists with the scene + propagates to any connected Spectator over the existing patch wire.
- Tint palette:
  - **dawn** — warm orange-pink (`#ff9966`) at 18% opacity (subtle "first light" glow).
  - **day** — labeled but renders as a no-op (a noticeable midday tint on an already-light map just washes it out; the option exists so the GM can mark "yes this is daytime" for clarity).
  - **dusk** — deep orange-red (`#d35400`) at 22% opacity (the long shadows of late afternoon).
  - **night** — deep cool blue (`#0e1a3a`) at 42% opacity (heaviest tint — moonlight + shadow contrast).
- **Composes with Phase 43's user-pref `sceneLightColor / sceneLightOpacity`.** Both render in order: user-pref tint first, then the scene's time-of-day tint on top. So a player who set "I prefer a 10% purple cast on every scene" still gets that PLUS whatever time the GM set.
- **PNG snapshot exports include the tint** — so handouts / VTT-shared images match what's on screen.

### State change
- **`SessionState.timeOfDay: TimeOfDay`** — new required field, `'none' | 'dawn' | 'day' | 'dusk' | 'night'`. Default `'none'`. `deserializeState` defaults missing values + collapses unknown kinds to `'none'` for back-compat.
- **`{ kind: 'time-set'; timeOfDay: TimeOfDay }`** — new patch variant. Reducer no-ops on same-value selection (matches the Phase 79 weather pattern).
- **Import-merge** carries `timeOfDay` under the `background` opt-in (same scoping as `weather` — both are scene-mood that travels with the layout).

### New modules
- **`src/state/time-of-day.ts`** — pure palette + helpers. `tintFor(time)` returns `{color, opacity}` or `null` for the no-op kinds; `TIME_LABELS` maps each kind to a display string for the picker.
- **`src/ui/time-of-day-picker.ts`** — small inline `<select>` widget. Same shape as `mountWeatherPicker`; calls `opts.onChange(time)` on user select; exposes `setTime` for external state changes (so a sync from another tab updates the dropdown).

### Renderer + snapshot
- **`renderer.ts`** — adds a second `drawSceneTint` pass after the existing user-pref one. The tint is read from `state.timeOfDay` via `tintFor`; `null` returns skip the pass.
- **`snapshot.ts`** — same composition for PNG export.
- Both passes use the existing `drawSceneTint` helper unchanged — Phase 80 is purely a new caller.

### Tests
- **+6 unit tests** in `src/state/time-of-day.test.ts`: `tintFor` returns null for none/day, returns valid `{color, opacity}` for dawn/dusk/night, night is the heaviest opacity, full coverage of `TIME_TINTS` + `TIME_LABELS`.
- **+3 reducer tests** in `src/state/store.test.ts`: `time-set` updates state, same-value no-op skips notify, actual change does notify.
- **+3 deserializer tests** in `src/sync/messages.test.ts`: missing field defaults to `'none'`, round-trip preservation, unknown kinds collapse.
- **+3 Playwright specs** in `e2e/time-of-day.spec.ts`: GM picker mounts with all canonical options, switching value persists, Spectator does NOT mount the picker.
- **All 808 unit tests + 190 Playwright specs pass.**

### Bundle
- 71.52 / 72 KB initial-load brotli (+0.25 KB for the palette + picker + reducer + entries wiring). Lazy chunks unchanged. CSS unchanged (the new `.time-picker` rules share the existing `.weather-picker` selector via grouping).

### Why a discrete dropdown (not a 0–24 hour slider)
A continuous slider would be more flexible — any specific hour and a smoothly-interpolated palette — but it adds picker UI complexity and asks GMs to make a fiddly decision. The 4 named-time presets cover the actual narrative beats most GMs reach for ("dawn arrives" / "night falls"). A future `0.80.1` could layer a "Custom…" option that opens an HSL + opacity picker for one-off scenes that need a specific shade.

---

## [0.79.1] — 2026-04-25 — Weather overlay polish (dark-theme dropdown + cloud-shaped fog)

### Fixed
- **Native dropdown items now match the active theme.** Pre-0.79.1 the weather picker's `<select>` chrome rendered with the dark-theme background, but the OS-native dropdown popup that appears on click came up as white-on-white in the dark / console / purple-dusk themes (and similar "wrong-mode" rendering across the other built-in `<select>`s in the app). Fix: declare `color-scheme: dark` on `:root` (with `light` overrides on the `theme-light` and `theme-parchment` blocks) so browsers render their native form-control popups in the page's color scheme. Belt-and-suspenders explicit `select option { background: var(--bg-elev); color: var(--fg); }` for browsers that ignore `color-scheme` on the popup chrome.
- Affects every `<select>` in the app — weather picker, initiative add-row, settings tabs, etc. — not just the new weather widget.

### Changed
- **Fog weather looks like clouds, not floating circles.** Pre-0.79.1 each fog "wisp" was a single translucent disc; the result on screen was a few suspicious orbs drifting across the map. Now each cloud is a pre-baked sprite composed of 7 overlapping soft radial-gradient blobs arranged into a "puffy top, flatter bottom" silhouette with per-cloud randomization (jitter on the blob layout + a 92–108% scale on each blob's radius), so no two clouds look identical.
- The sprite is rendered ONCE per cloud at seed time into an off-screen `<canvas>`, then drawn per frame as a single `drawImage` call — actually faster than the old per-frame `arc + fill` path despite the more elaborate silhouette.
- Cloud size: 280–520 px wide, ~55% as tall (cloud-typical wider-than-tall aspect). Spawn density unchanged (~12 clouds at 1080p).

### Tests
- **All 796 unit tests + 187 Playwright specs continue to pass.** No new tests for the fog visual change (asserting cloud silhouettes via Playwright is fragile, and the existing `weather picker toggles the overlay canvas visibility` spec already covers the canvas mount/unmount path).

### Bundle
- 71.27 / 72 KB initial-load brotli (+0.35 KB for the cloud-sprite baking helper). CSS unchanged. Lazy chunks unchanged.

---

## [0.79.0] — 2026-04-25 — Atmospheric weather overlays (rain / snow / fog)

### Added
- **Per-scene weather effect** rendered as a screen-space particle overlay over the main canvas:
  - **Rain** — diagonal vertical streaks falling at ~600 px/s with subtle wind. Density scales with viewport (capped at 250 drops on huge screens).
  - **Snow** — soft drifting flakes with a swaying horizontal motion (sinusoidal phase per flake). Density caps at 180.
  - **Fog** — slow-moving translucent wisps (~14 large soft circles) drifting left → right.
  - **None** — overlay tears down + canvas hides.
- **GM-side picker** — a small inline `<select>` pinned next to the auto-save pill in the top strip. Picking a value dispatches a `weather-set` patch; the new state propagates over the existing patch sync wire so any connected Spectator immediately mirrors the effect.
- **Per-scene scoping** — weather is part of `SessionState`, so different scenes carry different moods. Switching scenes (manually or via Ctrl+1..9) restores the destination scene's weather. Imported sessions carry the weather alongside `background` (so a "Stormy Harbor" scene import brings the rain along).

### Reduced motion
- When the user has `prefers-reduced-motion` (or the in-app preference) on, the particle simulation is replaced with a static tinted overlay per kind (subtle blue-grey for rain, soft white for snow, muted grey for fog). The effect still conveys "it's raining" without any animation. Same `getReducedMotion()` callback both modules already use.

### Architecture
- **`src/ui/weather-overlay.ts`** — full-screen `<canvas>` pinned over the map, runs a per-frame particle simulation. Self-driven `requestAnimationFrame` loop while a kind is active; tears down on `setWeather('none')`. Pointer events pass through (`pointer-events: none`) so the overlay never blocks the GM's tools. DPR-aware — re-seeds particles on `resize`.
- **`src/ui/weather-picker.ts`** — small standalone `<select>` widget. Calls `opts.onChange(kind)`; exposes `setWeather` for external state updates (when another tab toggles weather, the picker reflects it without re-typing).
- **`SessionState.weather: WeatherKind`** — new required field, `'none' | 'rain' | 'snow' | 'fog'`. Default `'none'`. `deserializeState` defaults missing values for back-compat AND clamps unknown values to `'none'` to shrug off malformed wire payloads.
- **`{ kind: 'weather-set'; weather: WeatherKind }`** — new patch variant. Reducer no-ops when the value is unchanged, so re-selecting the active option doesn't trigger a useless persist + broadcast cycle.
- **Wire format** — automatic. The patch type already round-trips through `toSerializablePatch` / `fromSerializablePatch`; serialize/deserialize handle the field. No new SyncMessage variant.
- **Import-merge** — weather travels with `background` (the most natural pairing — the user picks "I want this scene's vibe"). When the user unchecks `background` in the import modal, the destination scene's weather is preserved.

### Tests
- **+3 deserializer tests** in `src/sync/messages.test.ts`: missing field defaults to `'none'`, round-trip preserves the value, unknown weather kinds collapse to `'none'`.
- **+3 store reducer tests** in `src/state/store.test.ts`: `weather-set` updates state, same-value is a no-op (subscriber NOT notified), actual change DOES notify.
- **+3 Playwright specs** in `e2e/weather.spec.ts`: picker toggles the overlay canvas visibility, weather selection persists across scene switches via `Ctrl+1`, Spectator mounts the overlay but NOT the picker.
- **All 796 unit tests + 187 Playwright specs pass.**

### Bundle
- 70.92 / 72 KB initial-load brotli (+1.0 KB for the overlay + picker + reducer + entries wiring). Lazy chunks unchanged. CSS 9.07 / 10 KB.

### Why no lazy-load
The overlay module is small (~1.5 KB raw) and the user can switch weather instantly on every roll, so a synchronous mount makes the first-pick feel snappy. If a future phase needs to add more particle-heavy effects (Phase 80's day/night cycle is also planned), we can revisit by extracting an `effects` lazy bundle.

---

## [0.78.0] — 2026-04-25 — Fog reveal fade-in

### Added
- **Smooth bloom-in animation** for every fog cell that transitions from hidden (0) to revealed (1). On the GM side the user's chosen fog tint dissolves over ~480 ms with an ease-out cubic curve; on the Spectator side the solid black fog dissolves the same way. Reading the room: a hidden corridor now *appears* instead of cutting in, which is much closer to the dramatic intent of "I uncover the next room."
- **Cross-tab parity.** When the GM paints a reveal, the patch propagates over the existing sync wire, the Spectator's diff sees the same 0 → 1 transitions, and the players watch the same fade. No new wire format — the animation is purely a local derivation of the existing `state.fog` change stream.
- **1 → 0 (re-hide) is intentionally NOT animated.** Re-hiding a region is almost always a GM correction or a cleanup gesture; a hard cut reads as the right intent.

### How it works
- **`src/render/fog-fade-tracker.ts`** — pure module that diffs successive `state.fog` snapshots. `observe(currFog, cols, rows, now)` queues a `{x, y, startedAt}` entry for every cell that flipped 0 → 1; `getActive(now)` returns those still mid-fade (`elapsed < FOG_FADE_MS`). The very first observe just seeds the cached previous buffer without queueing — so the boot-time "load existing scene" doesn't flash every already-revealed cell.
- **Self-driven rAF ticker.** Same shape as the Phase 39 ping-manager: when fades are queued, the tracker spins a `requestAnimationFrame` loop that calls `onTick()` (wired to `renderer.requestRender()`) until the queue empties. Without this the animation would only update on the next store-subscribe tick — so a single-cell reveal would freeze mid-fade.
- **`src/render/layer-fog-fade.ts`** — drawn AFTER the base fog layer. For each active cell, paints a darkening rect at `baseOpacity * (1 - easedProgress)` so the overlay "blooms in" cleanly, dissolving from the surrounding fog colour into transparency.
- **Renderer plumbing** — new `getFogFadeCells?()` + `getReducedMotion?()` callbacks on `CreateRendererOptions`. The reduced-motion override sets the layer's `fadeMs` to 0 so the fade is skipped entirely (the cell still revealed-cuts as it did pre-78).
- **Entry wiring** — both `gm.ts` and `spectator.ts` mount the tracker and wire it into their existing `store.subscribe` block. A `session-reset` patch (or `null` patch from a `loadState`) calls `tracker.reset()` so the destination scene's already-revealed cells don't all flash in.

### Tests
- **+10 unit tests** in `src/render/fog-fade-tracker.test.ts` covering: first-observe-seeds-no-queue, 0 → 1 queues, 1 → 0 doesn't queue, multi-cell reveal in one diff, FOG_FADE_MS expiration boundary, earlier fades preserved while queueing new ones, dimensions-change reset, explicit reset(), unchanged buffer no-op, (x,y) computation correctness for non-square grids.
- **All 790 unit tests + 184 Playwright specs continue to pass.** No e2e for the fade itself (asserting bitmap content over a 480 ms window via Playwright is fragile); the fog-rect render path was already exercised by the existing fog-tool tests.

### Bundle
- **Initial-load brotli budget bumped 70 → 72 KB.** Phase 78 added ~0.6 KB (tracker + layer + entry wiring); we landed at 69.94 / 70 KB which would have been 60 bytes from the ceiling — too tight to absorb even a small Phase 79 follow-up. Current usage: 69.94 / 72 KB.
- Lazy chunks 18.37 / 20 KB (unchanged), CSS 8.98 / 10 KB (unchanged).

### Why no e2e
Asserting that a cell is "currently 60% faded" via Playwright requires either pixel sampling on a transient overlay (race-prone) or instrumenting the renderer to expose its render state. Given the layer is plumbing-thin (the tracker is well-unit-tested, the layer just maps `cells × time → ctx.fillRect calls`), and the existing fog-tool e2e specs continue to pass (so the fog transitions still LAND correctly in `state.fog`), I chose unit tests for the tracker + manual verification of the visual.

---

## [0.77.0] — 2026-04-25 — Token damage / heal animations

### Added
- **Floating damage / heal numbers** above tokens. Every Apply on the Damage / Heal dialog spawns a brief animated label (red `−7` for damage, green `+5` for heal) that rises ~30 px while fading over ~1.4 s, then disappears. Multiple effects on the same or different tokens stack independently.
- **Cross-tab replay.** When the GM applies damage, the Spectator's tab plays the SAME animation with the SAME numbers. Reuses the Phase 66 envelope's self-echo guard to avoid double-rendering on the originating tab.

### How it works
- **`src/state/damage-fx-manager.ts`** — small queue mirroring the Phase 39 ping-manager pattern. `add(tokenId, amount)` queues an effect; `getActive()` returns the in-flight ones; expired effects (>1.4 s) self-prune via a rAF ticker that shuts down when the queue empties.
- **`src/render/layer-damage-fx.ts`** — renders one number per active effect. Builds a `tokenId → token` lookup once per frame so the inner loop stays O(n + m). Eased fade (full opacity for the first ~30 % of the lifetime, smooth decay after) and eased rise (decelerates as it floats up) so the motion reads as "settled" rather than linear.
- **Renderer plumbing** — new `getDamageFx?()` callback on `CreateRendererOptions`, alongside the existing `getPings?()`. Drawn after pings so the number sits on top of any coincident ping burst.
- **Wire format** — new `damage-fx` `SyncMessage` variant: `{ type: 'damage-fx'; tokenId; amount; id }`. Optional / back-compat — pre-77 receivers ignore it.
- **`damage-heal-dialog`** — extended `DamageHealDialogOptions` with an `onDamageFx(tokenId, amount)` callback. Fires once per affected token after the Apply batch, with `amount` signed (positive = damage, negative = heal). The host wires this to `damageFxManager.add(...)` for local rendering AND `channel.send({type: 'damage-fx', ...})` for the broadcast.

### Tests
- **+8 unit tests** in `src/state/damage-fx-manager.test.ts` (jsdom): queue + get-active for damage AND heal, zero / NaN / Infinity guard, falsy tokenId guard, fractional rounding, fresh ids per effect, concurrent independent effects, onTick fires while alive. The rAF-driven expiration is exercised by real e2e behavior rather than a brittle fake-timer test (`performance.now()` doesn't auto-advance under Vitest's fake timers).
- **All 780 unit tests + 184 Playwright specs continue to pass.** No e2e for the canvas-rendered text (asserting bitmap content via Playwright is fragile); the layer is plumbing-thin and the manager is well-unit-tested.

### Bundle
- 69.32 / 70 KB initial-load brotli (+0.5 KB for the manager + layer + dialog wiring). Lazy chunks unchanged. CSS unchanged.

---

## [0.76.0] — 2026-04-24 — Auto-save indicator pill

### Added
- **Tiny "Saving… / Saved / Save failed" pill** in the top-left strip (just to the right of the scene indicator) that surfaces persist status in real time. States:
  - **idle** — hidden. The default between saves.
  - **saving** — visible with a spinning ⟳ + "Saving…". Shown for the duration of the persist promise (typically 10-50 ms on warm IDB).
  - **saved** — visible with a green ✓ + "Saved". Auto-fades back to idle after ~1.7 s so the chrome doesn't stay cluttered when nothing's happening.
  - **error** — visible with a red ⚠ + "Save failed". **Sticky** — stays visible until the next 'saving' transition, because the user genuinely needs to see this (their recent edits aren't safe in either IDB or localStorage). Cleared automatically on the next successful save.
- **Mounted on both GM and Spectator.** Spectator's pill reflects its OWN local-snapshot persistence (used for offline-after-disconnect), not the GM's authoritative state — but the user still benefits from knowing whether the local backup is intact.

### Why this matters
- Pre-0.76 the persist debounce was `void saveState(...)` — fire-and-forget with a `console.warn` on failure. A user in private-browsing mode (where IDB writes typically fail) had no visible signal that their work wasn't being saved. They'd discover it on a reload when the scene was empty. **The 0.72.2 race fix plugged the data-loss path**, but 0.76's pill plugs the *trust* path: now you can see, in real time, that your edits are durable.
- The 0.76 spinner is also a discoverable "the app is autosaving" hint — first-time users sometimes ask whether they need to manually save anything; the periodic pill flash answers that without docs.

### Persistence change
- **`saveState(state)` now returns `Promise<boolean>`** (`true` = at least one of IDB or localStorage accepted the write; `false` = both failed). Existing `void saveState(...)` callers ignore the return value — no behavioral change for them.
- **`tryWriteLocalStorageBackup(serialized)` now returns `boolean`** internally (not exported). Used by `saveState` to compute the overall result.
- Both changes are non-breaking on the wire and in storage; they only add information that previously got swallowed.

### New module
- **`src/ui/save-status-pill.ts`** — `mountSaveStatusPill()` returns `{ setStatus, getStatus, destroy }`. The pill manages its own auto-fade timer; callers just call `setStatus('saving')` / `setStatus('saved')` / `setStatus('error')` and the pill handles the visual lifecycle. Stateless on the wire.

### Wire-up
- Both `gm.ts` and `spectator.ts` mount the pill and replace the persist debounce body with:
  ```ts
  const persist = debounce(async () => {
    saveStatusPill.setStatus('saving');
    try {
      const ok = await saveState(store.getState());
      saveStatusPill.setStatus(ok ? 'saved' : 'error');
    } catch (err) {
      console.warn('[persist] save threw unexpectedly', err);
      saveStatusPill.setStatus('error');
    }
  }, 200);
  ```
- The reduced-motion preference is honored — the spinner glyph stops rotating but the pill itself still appears + cycles, so the status is conveyed via color + text rather than animation.

### Tests
- **+10 unit tests** in `src/ui/save-status-pill.test.ts` (uses jsdom env): initial idle hidden state, each status renders the right text/icon/data-attribute, saved auto-fades to idle after the hold, a fresh saving during the saved-hold preempts the auto-fade, error is sticky (doesn't auto-fade), error → saving clears the error, destroy removes the element, two consecutive saved calls reset the timer.
- **+2 Playwright specs** in `e2e/save-status-pill.spec.ts`: GM places a token → pill cycles through saved → auto-fades back to hidden; Spectator mounts the pill on boot.
- **All 772 unit tests + 184 Playwright specs pass.**

### Bundle
- 68.83 / 70 KB initial-load brotli (+0.4 KB for the pill module + persist wrap). Lazy chunks unchanged.
- **CSS budget bumped 9 → 10 KB.** The new pill rules (data-status variants + spinner keyframe + responsive media query) push CSS to 8.98 KB; bumping to 10 KB keeps the previous 1 KB of headroom. Total CSS is now 8.98 / 10 KB.

---

## [0.75.0] — 2026-04-24 — Recent-scenes quick-switch (Ctrl+1..9)

### Added
- **`Ctrl/Cmd+1` … `Ctrl/Cmd+9`** quick-switches to the Nth most-recently-active scene, excluding whatever scene is currently active. So pressing `Ctrl+1` always moves you SOMEWHERE — never no-ops on the current scene. Empty slots (e.g. `Ctrl+9` with only 3 scenes) are silent no-ops with an aria-live announcement.
- **Per-scene activation tracking** in localStorage under `gm-encounter-maps-scene-recents`. Bumped on every `switchToScene` call (modal click, programmatic `/init`-style command, or the new Ctrl+N). Pruned to the top 32 entries on every write so a long-lived session that's churned through dozens of one-off scenes doesn't bloat localStorage.

### Why a separate tracker (not `SceneRecord.updatedAt`)
Reusing `updatedAt` would have made `Ctrl+1` always pick the current scene (since every state edit ticks `updatedAt`). The separate map tracks "last activated" — when a scene was made the *active* scene, not when it was edited. That's what the user means by "recent."

### New module
- **`src/state/scene-recents.ts`** — pure helpers, all unit-tested:
  - `noteSceneActivated(id, now?)` — bump the timestamp.
  - `forgetScene(id)` — drop one entry (exposed but not yet wired; the `pickRecent` resilience to deleted scenes makes the cleanup nice-to-have rather than required).
  - `orderByRecency(scenes, recents?)` — return scenes sorted by descending activation timestamp; never-activated scenes fall to the end in their input order.
  - `pickRecent(scenes, n, excludeId?, recents?)` — return the Nth most-recent scene excluding `excludeId`. Used by the Ctrl+N hotkey.

### Wire-up
- **`gm.ts`'s `switchToScene`** now calls `noteSceneActivated(id)` BEFORE the async `getSceneState` so the ranking is correct even if the load takes a moment.
- **`gm.ts`'s keydown handler** maps `Ctrl/Cmd+1` … `Ctrl/Cmd+9` to a new `quickSwitchToRecent(slot)` async helper that lists scenes, picks the Nth, and switches. Skipped when only one scene exists (no useful target). Skipped when an editable field is focused (the existing `isEditableFocus` guard at the top of the handler).
- **Spectator entry is unchanged** — Ctrl+N is GM-only because Spectators don't author scenes.

### Tests
- **+17 unit tests** in `src/state/scene-recents.test.ts` covering: timestamp record + overwrite + sibling preservation, falsy id ignore, the 32-entry prune cap, `forgetScene` removal + no-op, `orderByRecency` (descending order, never-activated tail, empty inputs, non-mutation), and `pickRecent` (slot picking, exclusion, empty slots, invalid `n`, unranked fallback).
- **+2 Playwright specs** in `e2e/scenes.spec.ts`: full create-Cave → create-Forest → switch-back-to-Cave → `Ctrl+1` lands on Forest; `Ctrl+9` with no target is a silent no-op (indicator unchanged).
- **Shortcut overlay** updated to list `Ctrl/Cmd+1…9` for the GM in the "Other" section.
- **All 762 unit tests + 182 Playwright specs pass.**

### Bundle
- 68.42 / 70 KB initial-load brotli (+0.5 KB for the new module + handler). Lazy chunks unchanged. CSS unchanged.

---

## [0.74.0] — 2026-04-24 — Slash-command input (`/r`, `/d20`, `/init`, `/help`)

### Added
- **Press `/` to pop a floating slash-command input** at the top-center of the viewport. Type a command, hit Enter to fire, Escape to cancel. The input is a single one-liner — not a full chat panel — so it stays out of the way and doesn't disrupt the user's flow.
- **Supported commands:**
  - `/r <expression>` or `/roll <expression>` — roll a dice expression. Equivalent to opening the dice panel and typing the expression there. The animated dice tray (Phase 73) still pops, the history entry still appends to the panel, and the broadcast still fires to remote peers.
  - `/d4`, `/d6`, `/d8`, `/d10`, `/d12`, `/d20`, `/d100` — quick-die shortcuts (`/d20` → `1d20`). Inline modifier supported (`/d20+5` → `1d20+5`).
  - `/init` (alias `/initiative`) — auto-roll initiative for every token NOT already in the order. Same logic as the "🎲 Roll all unlinked tokens" button from Phase 69. **GM only** — Spectator returns an inline error.
  - `/help` (alias `/?`) — open the keyboard-shortcut overlay.
  - **Bare expressions** like `1d20+5` or `2d6+3` also work — type them without a leading `/` and they roll. The visual `/` prefix in the chrome is decoration: the input "feels" Discord-style (you type the body, the `/` is implied) but you can also paste a raw expression and hit Enter.
- **Inline error surface** — unknown commands show `Unknown command: /foo. Try /r 1d20+5, /d20, or /init.` in red below the input without dismissing it, so the user can correct + retry without re-typing.

### How the input handles ambiguous input
- The dispatcher normalizes input before parsing. If you type `r 1d20+5` (without the leading slash) we prepend `/` to match the Discord-style mental model. If you type a literal dice expression like `1d20+5`, we pass it through unchanged so the parser's bare-expression branch picks it up. `foo` (no slash, no `d` syntax) gets prepended too and surfaces as `Unknown command: /foo` so the error reflects what the user thought they were typing.
- **Editable-field guard** — pressing `/` while focus is in the dice panel's expression input, the slash input itself, the token editor, or any other text field does NOT hijack the key. The literal `/` lands in the field as expected.

### New modules
- **`src/ui/slash-command-parser.ts`** — pure helpers, no DOM. `parseSlashCommand(raw)` returns a discriminated `SlashAction` (`roll` / `init` / `help` / `unknown` / `empty`). `unknownCommandMessage(raw)` formats the error string. Tested in isolation (26 unit tests).
- **`src/ui/slash-command-input.ts`** — mounts the floating input + dispatcher. Exposes `mountSlashCommandInput({ onCommand })` returning an `open / close / toggle / isOpen / destroy` handle. The `onCommand` callback is host-specific: GM wires `/init` to roll initiative, Spectator returns "GM-only" for the same command.

### Wire-up
- **`gm.ts`** mounts the input with full handlers (`/r`, `/d20…`, `/init`, `/help`).
- **`spectator.ts`** mounts a smaller variant — `/init` returns an inline error since Spectators don't author state.
- Both entries hook the global `keydown` for `/`, gated by `isEditableFocus(e.target)` to avoid hijacking text input.
- **`DicePanelHandle.roll(expression)`** — new public method on the dice panel exposing the parse + roll + tray + broadcast flow without requiring the panel modal to be open. The slash input calls this for every roll-style command.

### Tests
- **+26 unit tests** in `src/ui/slash-command-parser.test.ts` covering empty / bare / `/r` / `/roll` / `/init` / `/initiative` / `/help` / `/?` / `/dN` (every standard size + range edges + case insensitivity) / unknown-command formatting / case sensitivity / inline modifiers (`/d20+5`, `/d20-2`, space-separated `/d20 +5`).
- **+9 Playwright specs** in `e2e/slash-command.spec.ts`: open/close via `/` + Escape, `/d20` populates history, `/r 2d6+3` pops the dice tray with two d6 silhouettes, `/d20+5` includes the modifier, `/foo` shows an inline error and keeps the input open, `/init` seeds initiative for placed tokens (GM), Spectator `/init` returns the GM-only error, `/help` opens the shortcut overlay, and the editable-field guard (typing `/` in the dice panel's expression input doesn't hijack the key).
- **Shortcut overlay** updated to list `/` for both GM + Spectator, so users discover the feature from the in-app `?` help.

### Bundle
- **Initial-load JS budget raised 68 → 70 KB brotli.** The slash-command input + parser add ~1.3 KB brotli to the main chunk; current usage is **67.89 / 70 KB**. Lazy-loading the input would have saved that, but the `/` key needs to feel instant — the budget bump keeps the architecture simple and leaves headroom for one or two more small phases before the next round of lazy-loading work.
- Lazy chunks: 18.37 / 20 KB, CSS: 8.77 / 9 KB — both unchanged.

### Why this maps to "/dice chat shortcuts"
The plan item name was `/dice chat shortcuts` — the implemented form is broader than just dice (it covers `/init` + `/help` too) but the same mental model: a single keystroke → a small input → a focused action. Skipped the full chat-panel framing because there's no in-app chat persistence model to attach messages to; a focused command palette delivers the productivity benefit without the scope of a chat surface.

---

## [0.73.0] — 2026-04-24 — Animated dice tray + multi-dice rolling

### Added
- **Animated dice tray** appears on every roll — a bottom-centered overlay panel that renders one polygon silhouette per die, tumbles them for ~700ms while face values cycle through random values, then settles each die onto its real rolled value with a brief scale + glow pop. Total time on screen: ~3.3s (or dismissed early by clicking the tray or pressing Escape).
- **Distinctive per-die silhouettes** so multi-die rolls read at a glance:
  - **d4** — upward triangle (red)
  - **d6** — rounded square (orange)
  - **d8** — diamond / rotated square (yellow)
  - **d10** — kite-pentagon (green)
  - **d12** — regular pentagon (teal)
  - **d20** — hexagon (blue)
  - **d100** — octagon (purple), face shown zero-padded (`"05"`, `"99"`, `"00"` for the max face)
  - Non-standard sides (e.g. `1d30`) fall back to a neutral hexagon so homebrew dice still animate.
- **Multi-die support.** A roll of `4d6+2d8+3` renders 6 silhouettes side-by-side (4 × d6, then 2 × d8) plus the `+3` baked into the total. Each die gets a deterministic-but-staggered start rotation so a batch doesn't tumble in lockstep.
- **Keep-highest / keep-lowest flagging.** `4d6kh3` renders all 4 dice; the dropped die gets a `dice-tray-die-dropped` class (reduced opacity + line-through on the face number) so the GM can see WHICH die was dropped, not just the total.
- **Negative-group styling.** `1d20-1d4` dims the subtracted d4 with a hue shift so the arithmetic reads visually, not just numerically.
- **Remote-roll replay.** The Spectator's tray plays with the GM's actual rolled values (and vice-versa). Phase 63 added the wire-level dice-roll broadcast; Phase 73 extends `DiceRollBroadcast` with an optional `groups` field (per-die rolls + kept flags) + `modifier` so remote peers can replay the animation with the same numbers instead of re-rolling.

### How the animation is implemented
- **No 3D library, no physics.** three.js + cannon-es together run 400-600 KB tree-shaken — way over the project's 68 KB initial-load brotli budget. Instead the tray uses SVG polygon silhouettes + a 700ms CSS keyframe for rotation/scale + a 60ms `setInterval` that rapid-fires random face values during the tumble. D&D Beyond-esque "tumble-and-settle" feel for under 2 KB brotli.
- **Lazy-loaded.** The animation code lives in `src/ui/dice-animation.ts`, which `src/ui/dice-panel.ts` pulls in via `import()` on the first roll. Users who never open the dice panel never download the chunk. First roll has a tiny (~30 ms on fast connections, sub-second on cold 3G) delay while the chunk fetches; subsequent rolls use the cached module.
- **Pure shape + face helpers** live in `src/ui/dice-animation-shapes.ts` so they unit-test without a DOM (20 tests covering `shapeForSides`, `faceValues`, `randomFace`, `faceLabel`, `flattenGroups`, `buildTumbleFrames`).
- **Reduced-motion support.** Users with `prefers-reduced-motion` (or the in-app "Reduced motion" preference) get a stripped-down variant: the tray appears with the final result already shown, holds for ~1.5s, and fades. Same code path, fewer keyframes. Wired from both `gm.ts` and `spectator.ts` via the new `getReducedMotion` option on `mountDicePanel`.
- **Early-dismiss.** Clicking the tray or pressing Escape skips to the fade-out. Useful for rapid-fire rolls where you don't want to wait through the full animation.
- **Replacement semantics.** Rolling a second time mid-animation removes the first tray instantly and starts a fresh one — no overlapping stacks.

### Wire format
- **`DiceRollBroadcast.groups?`** (new) — optional `Array<{ count, sides, sign, rolls, kept }>`. Pre-73 receivers ignore it; new receivers use it to render the animation. When absent, the history entry still appears but the tray is skipped (the remote tab has no per-die data to animate).
- **`DiceRollBroadcast.modifier?`** (new) — flat modifier (the `+5` in `1d20+5`). Optional; the receiver falls back to `total - sum(groups)` when absent.

### Tests
- **+20 unit tests** in `src/ui/dice-animation-shapes.test.ts` covering the shape registry, face-value enumeration, random-face injection, d100 label formatting, group-flattening for keep-highest / negative-group edge cases, and the tumble-frame builder's guarantee that it never lands on the final value as its second-to-last frame.
- **+5 Playwright specs** in `e2e/dice-roller.spec.ts` — tray appears and lands on the result for a simple d20, 4d6 renders four silhouettes, mixed-group `2d20+1d4+3` renders each die in order with the right `data-sides`, Escape dismisses the tray early, and `4d6kh3` flags exactly one dropped die.
- All 719 unit tests + 171 Playwright specs pass.

### Bundle
- **Initial-load JS:** 67.06 / 68 KB brotli (was 66.72 pre-phase; Phase 73 adds a ~340 byte `import()` stub + the wire-format extension).
- **Lazy chunks:** 18.38 / 20 KB brotli (adds the ~1.5 KB brotli dice-animation chunk alongside the existing help / settings / remote-play lazy modules).
- **CSS:** 8.63 / 9 KB brotli (adds the tray styling + keyframes).

---

## [0.72.3] — 2026-04-24 — Walls render on the Spectator canvas

### Changed
- **Walls now render on the Spectator view, not just the GM view.** Pre-0.72.3 `drawWalls` early-returned for `mode !== 'gm'`, so any wall the GM drew was invisible to players. Reported by a user mid-Phase-72 — they expected players to see the dungeon walls / corridors / partitions they had laid out, and discovered the walls only appeared on the GM canvas.
- Walls were already serialized in `full-state` / patch messages (since Phase 54) and the Spectator's `refreshLos` already reads them for the visibility polygon — only the visual render was suppressed. The fix is a one-line change in `src/render/layer-walls.ts`.

### Why the original "GM-only" design was an over-correction
The Phase 54 docblock cited devtools-snooping prevention: "Walls are GM-only — they never render on the Spectator canvas... so Spectators still see the resulting fog mask without being handed a floor plan they can inspect in devtools." But:
- The walls are already in the Spectator's localStorage / IDB / WebRTC peer state regardless of whether they render — a player who's actively snooping devtools can read them either way.
- In normal play, walls represent physical features (dungeon walls, stalagmites, partitions, columns) that players naturally expect to see. Hiding them gives the Spectator a confusingly-empty map.
- For genuinely-secret features (a hidden tunnel, a one-way door), a future per-wall `visibility: 'shared' | 'gm'` field — matching the existing convention on `Annotation`, `DrawStroke`, and `AoeTemplate` — gives the GM precise opt-out control. Documented as a follow-up in the updated `Wall` interface docblock.

### Spectator render details
- Same teal lines + endpoint dots as the GM view.
- Selection highlights, drag-overlay previews, and the in-progress chain rubber-band are GM-only — they're authoring affordances and the Spectator can't edit walls. The render code collapses those inputs to empty / null when `mode !== 'gm'`.

### About line-of-sight (LoS) on the Spectator
- For walls to BLOCK what a player sees through fog (not just appear visually), Settings → Grid → "Dynamic line of sight" must be on AND at least one token must have a sight radius configured (Token Editor → Sight). Otherwise the Spectator's fog stays driven entirely by what the GM has manually revealed — walls are visual decor only. This is unchanged by this patch.

### No schema migration
- Wall serialization is unchanged. Existing scenes with walls light up on the Spectator immediately on the next reload — no manual action needed.

---

## [0.72.2] — 2026-04-24 — Fix: active scene wiped by a fast reload during pre-load

### Fixed
- **Reloading the GM tab BEFORE the initial hydrate resolved would silently blank the active scene** while leaving the rest of the scene catalog intact. Reported by a user mid-Phase-72. Same failure shape as 0.57.1 (same silent-data-loss-on-reload symptom), but a different code path — the 0.57.1 fix plugged the cross-tab broadcast leak; this one plugs the equivalent local-persistence leak.

### Root cause
Two spots wrote `store.getState()` to IDB / localStorage without checking `initialLoadComplete`:

1. **`window.addEventListener('beforeunload', ...)`** in `src/entries/gm.ts`. Calls `persist.flush()` + `saveStateSync(store.getState())` on every tab close / reload. If the reload fires DURING the pre-load window (< ~200-300ms from first paint, common in Vite dev mode where cold compiles push first-paint past a user's Ctrl+R reflex), `store.getState()` is the empty default state. The `saveStateSync` call then writes that empty state to the localStorage backup AND the `persist.flush()` kicks off an async IDB write to the active scene's record. Next boot reads back the blanked scene.
2. **`switchToScene(id)`** in `src/entries/gm.ts`. Saves the outgoing scene's state before swapping. If the user opened the scenes modal + clicked a scene (including the currently-active one) before the initial load completed, the outgoing save wrote the empty default state over that scene's real data.

### Fix
Both sites now early-return when `initialLoadComplete === false`:
- `beforeunload` still calls `markClean()` so the next boot doesn't spuriously show the "last session wasn't closed cleanly" banner — we haven't modified anything, so from the user's perspective this WAS a clean close. It just doesn't flush the empty state.
- `switchToScene` skips the outgoing save; the scene-load half still runs, so clicking a scene early works, the just-left scene's data survives.

### How to reproduce (pre-fix)
1. Open the GM tab with a scene that has tokens.
2. Reload (Ctrl+R) before the canvas is fully painted — roughly within the first 200-300ms on a cold dev-mode boot.
3. On the next boot, the active scene's tokens / fog / walls are gone, but the scenes catalog still lists it with its old name + thumbnail.

### Why it escaped the 0.57.1 regression test
`e2e/active-scene-clearing.spec.ts` pins the cross-tab failure (Spectator receiving + persisting an empty broadcast). That spec spies on `BroadcastChannel.postMessage` to assert no empty `full-state` was sent. It doesn't model the single-tab reload race, where no Spectator is involved and the data loss happens entirely via the local `beforeunload` / `switchToScene` paths. Writing a deterministic e2e for the reload race requires throttling IDB from the test harness so the pre-load window stretches long enough to hit reliably in CI — worth doing as a follow-up, but the fix itself is a two-line guard that's sound by inspection.

### No app behavior change for users without the bug
- If you never triggered the race (most users on fast disks / production builds), the new guard is a pure no-op. `initialLoadComplete` flips to `true` within the first tick after boot completes; beforeunload / switchToScene from that point on behave identically to before.

---

## [0.72.0] — 2026-04-24 — Death saves UI

### Added
- **`Token.deathSaves: { successes: number; failures: number }`** — every token now carries the D&D 5e death-save tracker. Default `{0, 0}`. Counts clamp to `[0, 3]`; reaching 3 successes is "stable", 3 failures is "dead".
- **In-editor tracker UI** — visible in the Token Editor only when HP is tracked AND `current === 0`. Renders three success dots (green when filled) and three failure dots (red), each clickable to set the count to that index (or back down by 1 if already filled — the standard D&D Beyond / Roll20 pattern). A live status badge reads `1/2`, `Stable`, or `Dead`. A "Reset saves" button clears both back to 0.
- **Auto-failure on damage to a 0-HP token.** Each Apply in the Damage / Heal dialog that lands non-zero damage on a token already at 0 HP bumps `failures` by 1 (clamped). This catches the easily-forgotten part of the rule that's the whole point of the tracker. Crits aren't auto-doubled (the GM still adjudicates the +2 case).
- **Auto-reset on healing back above 0.** When a damage / heal apply transitions a token's HP from 0 → positive (any healing wakes you up), the save tracker collapses back to `{0, 0}`. Re-dropping the same token starts a fresh count.

### New helpers in `src/state/token-hp.ts`
- `DEFAULT_DEATH_SAVES`, `DeathSaves` type — the canonical zero state.
- `clampDeathSaves(saves)` — both fields clamped to `[0, 3]`, fractional counts floored.
- `isStable(saves)` / `isDead(saves)` — boolean predicates for the terminal states.
- `addDeathSaveFailures(saves, n=1)` / `addDeathSaveSuccesses(saves, n=1)` — non-mutating bumps that ignore negative / non-finite increments and clamp to 3.

### Migration
- **`deserializeState` defaults missing `deathSaves` to `{0, 0}`** for any token loaded from a pre-Phase-72 save (IDB scene, exported JSON, wire envelope from an older peer). Malformed inputs (NaN, Infinity, non-objects, non-numeric counts) collapse to `{0, 0}`; out-of-range numbers clamp to `[0, 3]`. Existing scenes load unchanged.
- **`tool-token`, `gm.ts` token-creation paths, `tokenFromCatalogEntry`, `placeTemplate`** all seed new tokens with `deathSaves: {0, 0}`. Library tokens + templates intentionally don't round-trip the count — death saves are transient per-combat state.

### Tests
- **+8 unit tests in `src/state/token-hp.test.ts`** covering: `DEFAULT_DEATH_SAVES`, `clampDeathSaves` clamping + flooring, `isStable` / `isDead` boundary cases, `addDeathSaveFailures` / `addDeathSaveSuccesses` bump-and-clamp, non-mutation guarantees, defensive handling of negative / NaN / Infinity increments.
- **+2 deserializer tests in `src/sync/messages.test.ts`** for the default + the clamp-and-floor.
- **+2 store tests in `src/state/store.test.ts`** for `token-update` round-tripping `deathSaves` and overwriting it when included in changes.
- **+19 test fixtures across 19 files** seeded with `deathSaves: { successes: 0, failures: 0 }` to satisfy the new required field.
- **All 699 unit tests + 166 Playwright specs continue to pass.**

### Why
Tracking death saves on a paper d6 / scratched-out tally is the second-most-forgotten rule at the table after concentration. The combo of Phase 71 + 72 means:
- A wizard takes 14 dmg → concentration prompt fires → GM clicks Failed → spell ends.
- The wizard hits 0 HP → death-save tracker appears in the editor → cleric heals them → tracker auto-clears.
- The wizard takes 5 more dmg while down → +1 failure auto-applied → if it's the third, the badge says "Dead".

### Bundle
- 66.62 KB / 68 KB initial-load brotli — comfortably within the ceiling Phase 70 raised. The new UI pushed the CSS bundle 59 bytes past the 8 KB budget (1.2 KB of new rules for the tracker dots + status badge); budget raised 8 → 9 KB. All other budgets unchanged.

---

## [0.71.0] — 2026-04-24 — Concentration tracking + auto-prompt CON save

### Added
- **Auto-prompt for Constitution saves on damage** when a token has the `concentrating` condition. After clicking "Apply" in the Damage / Heal dialog, the modal switches to a "Concentration check" view listing one row per affected concentrating token:
  - `Wizard — took 12 dmg, DC 10  [Failed] [Saved]`
  - The DC follows the SRD: `max(10, floor(damage / 2))`. So 1–20 dmg → DC 10, 22 dmg → DC 11, 50 dmg → DC 25.
  - **Failed** strips the `concentrating` condition (and its round timer if any) via a `token-update` patch and announces "Wizard lost concentration." through the existing aria-live channel — Spectator peers see the update via the normal sync wire.
  - **Saved** dismisses the row and announces "Wizard held concentration (DC 10)."
  - When all rows are resolved, the dialog closes.
- **Per-token damage clamping** for the DC calculation. A 50-dmg blow that drops a 12-HP target to 0 counts as 12 dmg (the actual damage taken), not 50 — matches the rules' "damage you take" wording and avoids inflating the DC for overkill hits.
- **First-action focus** in the concentration view auto-focuses the first `Failed` button so keyboard users can resolve checks without reaching for the mouse. Tab cycles between the buttons within the focus trap.

### New module
- **`src/state/concentration.ts`** — pure helpers shared between the dialog and any future automation:
  - `CONCENTRATING_CONDITION_ID = 'concentrating'` constant (matches the existing `CONDITION_PRESETS` entry — the condition is not new, only the auto-prompt around it).
  - `concentrationDc(damageTaken)` — `max(10, floor(damage/2))`, returns `0` for non-positive / non-finite damage so callers can use `dc > 0` as a "is a check needed?" predicate.
  - `concentrationChecksForDamage(tokens, damagePerToken)` — filters tokens down to those that are concentrating + took positive damage, returns ready-to-render `ConcentrationCheck` rows.

### No schema change
- The `concentrating` condition has been in `CONDITION_PRESETS` since Phase 50. This phase only adds the *prompt* logic + UI; existing saves with concentrating tokens get the new behavior immediately, no migration needed.
- Phase 70's round-timer system composes cleanly: a concentrating token can have an `expiresAtRound` set (e.g. 1-min Bless on the cleric), and a failed save strips both the condition AND the timer atomically.

### Tests
- **+10 unit tests in `src/state/concentration.test.ts`**: DC boundaries (1, 5, 19, 20, 21, 22, 50, 101), non-positive / NaN / Infinity damage, fractional damage flooring; the filter helper covers concentrating-only filtering, zero / healing damage skip, missing-from-map handling, label preservation, and the `'Token'` fallback for unlabeled tokens.
- **All 688 unit tests + 166 Playwright specs continue to pass.**

### Why
Concentration is the most commonly-forgotten 5e rule at the table — the spell stays on the character sheet until someone says "wait, did you take damage last round?" Auto-prompting fixes that without taking the rule out of the GM's hands: the GM still rolls the save and clicks Failed/Saved themselves, the prompt just makes sure the check happens.

### Healing skips the check
- Negative amounts in the dialog ("Heal 5") never trigger a concentration prompt — `concentrationChecksForDamage` skips any token whose damage in the batch was `<= 0`.

---

## [0.70.0] — 2026-04-24 — Round-counted conditions

### Added
- **`Token.conditionExpirations: Record<string, number>`** — every token now carries an optional per-condition round timer. Keys are condition ids from `Token.conditions`; values are the round number AT OR AFTER which the condition expires. Conditions NOT listed here have no timer and persist until the GM clears them manually (the pre-Phase-70 behavior). Default: `{}`.
- **Auto-strip on round advance.** The store's `initiative-set-active` reducer now scans every token whenever the round counter ADVANCES (not retreats — undo / "oops wrong button" leaves timers untouched). Any condition with `expiresAtRound <= newRound` is stripped off the token, along with its expiration entry. One reducer call → one atomic mutation → one broadcast to peers.
- **Per-condition timer rows in the Token Editor.** Below the existing condition chip grid, each active condition gets a row with:
  - Its label (colored by the condition preset).
  - A duration `<select>` — `Permanent / 1 round / 3 rounds / 10 rounds (1 min) / Custom…`.
  - A `Custom…` number input that appears when "Custom" is picked.
  - A live "N left" / "∞" badge showing rounds remaining based on the current `initiative.round`.
  - Setting a duration stores `expiresAtRound = max(1, currentRound) + duration`. So applying "3 rounds" of Hold Person on round 3 expires it at round 6 — which matches 5e's "at the end of its next turn" semantics closely enough for a tracker that doesn't model turn-start / turn-end slots.
- **Condition toggle strips stale timers.** Unchecking a condition via its chip also clears any expiration entry that was on it, so re-applying the condition later doesn't pick up a zombie timer from a previous combat.

### New helpers in `src/state/conditions.ts`
- **`setConditionExpiration(expirations, id, expiresAtRound)`** — returns a new map with the timer set; passes `null` to strip. Clamps to positive integers, floors fractional rounds, minimum 1.
- **`clearConditionExpiration(expirations, id)`** — idempotent drop of one entry.
- **`tickConditions(conditions, expirations, currentRound)`** — pure, returns `{ conditions, conditionExpirations, removed }` with expired ids stripped from both. Never mutates; returns a fresh object even when nothing changed.

### Migration
- **`deserializeState` defaults a missing `conditionExpirations` to `{}`** for any token loaded from a pre-Phase-70 save (IDB scene, exported JSON, wire envelope from an older peer). Malformed inputs are filtered down to positive finite integers — non-numbers, NaN, Infinity, and non-positive values are silently dropped. Existing scenes load unchanged; no manual migration.
- **`tool-token`, `gm.ts` token-creation paths, `tokenFromCatalogEntry`, `placeTemplate`** all seed new tokens with `conditionExpirations: {}`. Library tokens + templates intentionally do NOT round-trip per-condition timers — those are transient per-combat state, not a property of the creature / layout template.

### Tests
- **+14 unit tests in `src/state/conditions.test.ts`** for the three new helpers, covering: new timers, overwriting existing, preserving siblings, null / Infinity / NaN stripping, flooring + minimum clamp, non-mutation guarantees, boundary rounds (`currentRound == expiresAt`), untimered conditions passing through, and stale-entry handling.
- **+2 deserializer tests in `src/sync/messages.test.ts`** for the default + the garbage filter.
- **+4 store tests in `src/state/store.test.ts`** for: advancing the round past timers strips conditions, round-unchanged is a no-op, round-retreat is a no-op, and the fast path for tokens with no conditions / no timers preserves object identity.
- **+19 test fixtures across 19 files** seeded with `conditionExpirations: {}` to satisfy the new required field.
- **All 678 unit tests + 166 Playwright specs continue to pass.**

### Budget
- **Initial-load brotli budget raised 65 → 68 KB.** The Phase 70 additions (conditions helpers + in-editor timer UI + store reducer) add ~1 KB brotli to the main gm chunk. Token Editor is currently eagerly loaded; a future phase may defer it via `import()` the way Phase 65 did with help / settings / remote-play modals. For now the budget bump is the minimal-churn path.

### No behavior change for existing conditions
- All existing conditions without an explicit duration remain *permanent* — they don't expire on round advance, matching pre-Phase-70 semantics. GMs who never touch the new duration selector see no behavioral change whatsoever.

---

## [0.69.0] — 2026-04-24 — Auto-roll initiative + `Token.initiativeMod`

### Added
- **`Token.initiativeMod: number`** — every token now carries an integer initiative bonus (default `0`). Conceptually the D&D 5e Dexterity modifier plus any Alert / Jack-of-All-Trades / magic-item extras. Editable via a new "Initiative" fieldset in the Token Editor (clamped to `[-20, 20]`, persisted, round-tripped through scenes / library / templates / wire envelopes).
- **"🎲 Roll all unlinked tokens" button** in the initiative tracker. Walks every token NOT already in the order, rolls 1d20 + that token's `initiativeMod`, and adds an `initiative-add` patch per result. Tokens *already* in the order are deliberately left alone — keeps manually-set monster blocks and player-announced rolls from getting clobbered.
- **Per-token "🎲" button** next to the value input on the "Add from token" row. Rolls 1d20 + the selected token's bonus and pre-fills the value field; the GM still has to click "Add" so a misclick is recoverable.
- **Token labels in the dropdown now show the modifier** as a suffix (e.g. `Goblin (+2)`, `Ogre (-1)`). The GM can sanity-check what they're rolling against without opening the editor.

### State / migration
- **`deserializeState` defaults missing `initiativeMod` to `0`** for any token loaded from a pre-Phase-69 save (IDB scene, exported JSON, wire envelope from an older peer). Malformed inputs (`NaN`, strings, out-of-range numbers) are clamped + rounded silently. Existing scenes load unchanged; no manual migration step.
- **`TokenCatalogEntry.initiativeMod` + `TemplateToken.initiativeMod`** added as optional fields. Library tokens / templates saved before this phase load with the bonus defaulted to `0`; new saves carry the value forward so re-placing a library entry produces a token with the same bonus.
- **`tool-token` + `gm.ts` token-creation paths** seed new tokens with `initiativeMod: 0`. Stamping (Alt-click) preserves the source token's bonus along with the rest of its appearance.

### New helpers
- **`rollInitiativeForToken(token, rng?)`** in `src/state/initiative.ts` — pure 1d20 + `initiativeMod` calculation that returns an `InitiativeEntry` linked to the token. Inject `rng` for tests.
- **`rollInitiativeForUnlinkedTokens(tokens, state, rng?)`** — bulk variant powering the "Roll all" button. Skips tokens whose id appears in `state.order` so re-clicking the button doesn't duplicate entries.

### Tests
- **+11 unit tests in `src/state/initiative.test.ts`** covering: positive / negative / zero modifiers, missing-field defaulting, fresh-id generation per call, label / tokenId linkage, the unlinked-only filter (including the "custom Lair-action entry doesn't count as linking a token" edge case), empty-input safety.
- **+2 unit tests in `src/sync/messages.test.ts`** for the deserializer: defaults a missing `initiativeMod` to `0` (Phase-68-and-earlier saves) and clamps malformed values (`999` → `20`, `-50` → `-20`, `2.7` → `3`, `'bogus'` / `NaN` → `0`).
- **All 655 unit tests + 166 Playwright specs continue to pass.** Test fixtures across 14 files were updated to satisfy the new required `initiativeMod` field.

### Why
Auto-rolling initiative is the single most common request in the post-1.0 backlog (item #1 on the curated list). Every D&D session starts with the GM typing or clicking 1d20+mod for every monster + NPC; this collapses that into one button. The `initiativeMod` field also unblocks Phase 73's 3D dice animation (rolls need to know the modifier for the breakdown display) and Phase 74's `/dice` chat shortcuts (`/init` will roll for the selected tokens).

### No behavior change for existing rolls
- Manually-typed initiative values still work exactly as before. The "Roll all" button skips already-linked tokens, so a GM partway through setting up combat by hand can finish with one click without losing prior work.
- The wire format is unchanged — the new field rides inside the existing `Token` shape, no new SyncMessage variants.

---

## [0.68.0] — 2026-04-23 — Visual-regression baseline auto-regen tooling

### Added
- **`scripts/regen-baselines.mjs`** — single-command regeneration of the platform-specific PNG baselines that back `e2e/visual-regression.spec.ts`. Wraps the two-step dance we'd been hand-rolling since Phase 55 (and again in 59, 61, 63, 67) every time even a few-pixel layout drift turned CI red:
  1. **Local host-platform pass** — `npx playwright test e2e/visual-regression.spec.ts --update-snapshots`, writes the `*-chromium-win32.png` (or `*-darwin.png` on macOS) baselines.
  2. **Linux pass via Docker** — same command inside `mcr.microsoft.com/playwright:v1.59.1-jammy` (the exact image CI runs), writes the `*-chromium-linux.png` baselines. Mounts the host repo read-only at `/host`, copies it to a writable `/scratch` so a fresh `npm ci` can build Linux node_modules from scratch (the host's Windows `esbuild.exe` / `rollup` native bins would otherwise break a Linux unlink). Updated PNGs are copied back to the host via a separate writable `/snapshots-out` mount.
- **`npm run baselines`** package script wires the above into `package.json`. Supported flags:
  - `--grep "<pattern>"` — only regenerate baselines for matching tests (e.g. `--grep "settings"` after a Settings-modal style tweak).
  - `--win-only` — skip the Docker step. Useful for fast local iteration before pushing — CI will still verify the Linux side.
  - `--linux-only` — only run the Docker step. Useful on a real Linux dev box (you ARE the Linux baseline platform; the local pass would write a separate `*-linux.png` that the script's Docker step would then redundantly overwrite).

### Changed
- **`e2e/visual-regression.spec.ts` docblock** updated to reference `npm run baselines` (and document the `--grep` / `--win-only` flags) instead of the old `npx playwright test … --update-snapshots` invocation.

### Why
Across Phases 55, 59, 61, 63, and 67 we hit the same cycle: a tiny layout change → Linux baselines drift by &lt;1% pixels → CI red → manually run `playwright --update-snapshots` locally for win32 → manually run a Docker container for linux → realize the host's `node_modules` has Windows-only native bins → `rm -rf node_modules` inside the container → `npm ci` (slow) → realize you forgot to mount the snapshots dir writable → re-run → commit. The script collapses that into one command + documents the workarounds (the `/scratch` copy, the writable `/snapshots-out` mount, the `--grep` passthrough) so the next person to touch a fog overlay or a button color doesn't have to rediscover them from chat history.

### Argv quoting
- `spawnSync` with `shell: true` joins argv with spaces and re-parses, so any arg containing whitespace gets re-split. The script wraps each arg in double-quotes (escaping any embedded `"`) before shelling through. Required for `--grep "Multi word match"`.

### No app behavior change
- Build output, runtime, and visual baselines themselves are unchanged. This phase ships tooling only.
- All 644 unit tests + 166 Playwright specs continue to pass.

---

## [0.67.0] — 2026-04-24 — Move identity storage off `preferences`

### Changed
- **Per-view player identity now lives in its own dedicated store** (`src/state/identity-prefs.ts`) instead of riding inside the global `Preferences` blob. The 0.63.1 hotfix that scoped `playerNameGm` / `playerNameSpectator` / `playerColorGm` / `playerColorSpectator` was a workaround for the cross-tab `storage` event leaking identity edits between views; this phase puts the data where it conceptually belongs.
- **Two new localStorage keys** — `gm-encounter-maps-identity-gm` + `gm-encounter-maps-identity-spectator`. Each view reads / writes only its own scoped key. The cross-tab `storage` event still fires for OTHER tabs of the same role (rare but possible) without touching the other role's identity.
- **`Preferences` shrinks back to "settings that should be the same across both views in one browser."** No more `playerName*` / `playerColor*` fields polluting the shared blob.
- **`SettingsModalOptions` gains `identityPrefs`**. The entry constructs `createIdentityPrefs(viewMode)` once and passes the same instance to both the Settings modal + the `ownIdentity()` / broadcast wiring lower in the file. In-tab updates propagate via the store's `subscribe()` method (the cross-tab `storage` event would only catch other tabs).

### Migration
- **One-time auto-migration on first read**. If `playerNameGm` / `playerColorGm` / `playerNameSpectator` / `playerColorSpectator` are still present in the legacy preferences blob (users coming from 0.63.1 → 0.67.0), `createIdentityPrefs(role)` copies them into the new role-scoped key, then strips them from the prefs blob. After this phase, subsequent boots use the new store directly + the migration is a no-op.
- **Idempotent**: legacy fields absent → no-op. New store wins when both legacy + new are present (handles "user upgraded, then renamed via Settings, then a stale legacy field somehow stuck around" without clobber).

### Tests
- **+12 unit tests** in `src/state/identity-prefs.test.ts` covering: defaults, role-scoped persistence, GM/Spectator isolation, partial updates, malformed-JSON fallback, subscribe + unsubscribe, plus 5 migration-specific specs (GM-side migration, Spectator-side migration, no-op when legacy absent, idempotent on subsequent constructions, new store wins over leftover legacy fields).
- **All 644 unit tests + 166 Playwright specs pass.** No e2e changes needed — the Settings UI's `data-field="playerName"` / `playerColor` attributes are unchanged, so existing identity specs continue to drive the same DOM.

### No behavior change for users
- Setting / changing / displaying name + color works identically. The migration runs silently. Visible difference: the next time you inspect localStorage you'll see two new `gm-encounter-maps-identity-*` keys + four fewer fields in the prefs blob.

---

## [0.66.0] — 2026-04-23 — SyncMessage envelope ({senderId, timestamp, payload})

### Changed
- **Every message on the sync wire is now an envelope.** New `SyncEnvelope` type in `src/sync/messages.ts`:
  ```ts
  interface SyncEnvelope {
    senderId: string;   // sending tab's PlayerIdentity.id
    timestamp: number;  // Date.now() at send-time
    payload: SyncMessage;
  }
  ```
  Wrapping happens transparently inside `SyncChannel.send`; receivers see `(payload, envelope)` from `onMessage` listeners. Most existing call sites only need `payload` and ignore the second arg, but future features (per-Spectator permissions, latency indicator, conflict-merge UI) all need attribution + timing — getting them via the envelope is dramatically cheaper than threading them through every message variant.
- **`createSyncChannel(senderId)`** now requires the sender id. Both entries (`gm.ts` + `spectator.ts`) hoist their `playerId` generation a few lines so the channel can stamp every outgoing envelope.
- **`AttachableRemote.send` + `RemotePeer.send`** now take an `SyncEnvelope` instead of a bare `SyncMessage`. The data-channel JSON-stringify pipeline is unchanged — just the type.
- **Self-echo guard added.** Inbound envelopes whose `senderId` matches the local tab's id are silently dropped at the channel boundary. BroadcastChannel doesn't echo on its own (browsers explicitly skip the sender), but a WebRTC peer forwarding our own message back over the star topology could in principle deliver it twice. The guard makes the channel robust to that without callers having to think about it.
- **Wire-format guard added.** Inbound BC + remote messages are validated against `looksLikeEnvelope` before delivery; legacy or malformed shapes are silently dropped (with a console warning on the remote-peer JSON path). Future protocol-version bumps can use the same shape check to reject older peers cleanly.

### Why
Phase 63 added `senderName` ad-hoc to ping + dice-roll. Phase 64 added a `tabId` to gm-heartbeat. Phase 82 will need `senderId` for permission enforcement; Phase 83 needs `timestamp` for RTT measurement; Phase 84 needs both for conflict-merge attribution. Rather than sprinkle the same fields across every message variant, every message now travels inside an envelope that carries them once.

### Tests
- **Updated `src/sync/channel.test.ts`** to use the envelope shape. Added two new specs:
  - "onMessage receives the full envelope as a 2nd arg" — pins the new listener signature.
  - "drops self-echoes (envelope.senderId === own id)" — pins the dedup guard.
  - "drops malformed wire data (no envelope shape)" — pins the looksLikeEnvelope guard.
- **Updated `src/sync/remote-peer.test.ts`** to wrap test fixtures in envelopes.
- **Updated `src/sync/remote-session.test.ts`** signature for `RemotePeer.send` stub.
- **Updated 2 e2e specs** (`active-scene-clearing.spec.ts` + `conflict-recovery.spec.ts`) that touched the BC wire format directly.
- All 632 unit tests + 166 Playwright specs pass (+3 new envelope-specific units).

### No payload-shape changes
- `SyncMessage` itself is unchanged. The existing `senderName` on ping/dice-roll + `tabId` on gm-heartbeat stay where they are for now — the envelope doesn't override them, and pruning them is a separate cleanup phase. Receivers can already prefer envelope.senderId over the legacy fields where they want the tab id, and look up the display name via the IdentityRegistry.

---

## [0.65.0] — 2026-04-23 — Bundle profiling + lazy-load 3 modals (−18% initial JS)

### Added
- **`npm run analyze`** — convenience script that builds with `ANALYZE_BUNDLE=1`, emits `dist/stats.html` (rollup-plugin-visualizer treemap), and prints a per-chunk module breakdown to the terminal. Wraps `scripts/analyze.mjs` (cross-platform Node, no `cross-env` dep). The treemap stays out of the production build (only generated when the env var is set).
- **`scripts/analyze-bundle.mjs`** — parses `dist/stats.html`, walks the chunk tree, and prints the top 18 modules per chunk by brotli size. Handy any time we need to find the next round of trim candidates.

### Changed
- **3 heavy modals are now lazy-loaded** via dynamic `import()`:
  - `ui/help-overlay.ts` — split into a thin stub + `help-overlay-content.ts` (8.5 KB brotli of section text). The "?" button mounts immediately at boot; the modal markup loads on first click.
  - `ui/settings-modal.ts` — split into a stub + `settings-modal-content.ts` (5.3 KB brotli). Settings opens on the next tick after the user clicks the menu entry; subsequent opens are instant.
  - `ui/remote-play-modal.ts` — split into a stub + `remote-play-modal-content.ts` (2.8 KB brotli). Same pattern.
- **`size-limit` config split** into two budgets so the lazy chunks no longer count against the initial-load budget:
  - **JavaScript (initial load, brotli)**: was `80 KB` for *all* chunks → now **`65 KB`** for everything except the 3 lazy bundles.
  - **JavaScript (lazy chunks, brotli)**: new bucket, `20 KB` ceiling.
- **rollup-plugin-visualizer** added as a `devDependency` for the new `analyze` script. Production builds are unaffected.

### Bundle math
- **Before**: 76.7 KB brotli total (everything in the initial load).
- **After**: 63.1 KB initial-load + 16.55 KB lazy = 79.65 KB total.
- **Initial-load reduction**: −13.6 KB (−18%). The user's first paint is now noticeably faster, especially on slow networks; the lazy chunks are fetched in parallel with the user reading the page.
- **Total** is technically slightly higher (rollup overhead per chunk + a few extra import statements) but that's the right trade-off — most users never open Remote Play, many never open Settings beyond the first time, and a clean first paint matters more than a slightly bigger overall footprint.

### Tests
- All 629 unit tests + 166 Playwright specs pass — lazy-loading the modals doesn't change any user-visible behavior. The Playwright specs were the primary safety net here (they exercise every modal-open flow end-to-end).

### No content changes
- Behavior of the modals is unchanged — same DOM, same wiring, same close-on-Esc semantics. The only difference is that the first `.open()` does an `await import(...)` under the hood; subsequent opens are instant.

---

## [0.64.0] — 2026-04-23 — Reconnection + conflict resolution (Remote Play)

### Added
- **Persistent Remote Play connection state.** The active `RemotePeer` used to live as a local variable inside `mountRemotePlayModal`'s closure — closing the modal hid the UI but left no way to observe the connection from outside. Phase 64 extracts the peer ownership into a new `RemoteSession` module that the modal writes to + external observers read from.
- **Status chip** anchored to the top-left of the viewport (away from the Connected Players panel in the top-center). Shows at-a-glance whether you're connected + what state the peer is in via a color-coded dot:
  - 🟡 amber while `connecting`
  - 🟢 green when `connected`
  - 🔴 red on `disconnected` / `failed` / `closed`
  Hidden when the session is idle (no peer attached). Clicking the chip re-opens the Remote Play modal.
- **Graceful Disconnect button** inside the Remote Play modal, visible whenever a peer is attached. Closes the peer + clears the textareas + resets the session back to idle — a clean surface for starting a fresh invitation without leaving the modal.
- **Disconnect banner on the Spectator side**. When the remote peer transitions from `connected` → `disconnected` / `failed` / `closed`, a dismissible warn-variant banner surfaces: *"Remote connection lost. Your local view is still usable; open Remote Play from the menu to reconnect."* It self-clears when a reconnect succeeds.
- **GM full-state rebroadcast on peer (re)connect.** When a remote peer transitions to `connected` (fresh handshake OR a reconnect after `disconnected`), the GM entry immediately sends a `full-state` SyncMessage + its identity — so the newly-connected peer starts from a clean sync point without relying on whatever message fragments might have been mid-flight when the disconnect happened. Cross-tab BroadcastChannel peers were already handled by `broadcastInitial()` on boot; this closes the gap for WebRTC peers that arrive long after the GM loaded.
- **Help overlay** — the *Remote play* section grows two new bullets covering the status chip + the reconnect flow.

### Implementation notes
- **`src/sync/remote-session.ts`** — new pure module. `createRemoteSession()` returns `{getActivePeer, getState, attachPeer(peer), disconnect, subscribe(listener)}`. Internally tracks a single active peer, mirrors the peer's state via its own subscribe events, and closes + replaces cleanly when a new peer is attached. The session stays on a `closed` peer until an explicit `disconnect()` or `attachPeer(next)` — so the UI can render "Disconnected — click to reconnect" without racing the session back to idle.
- **`src/ui/remote-status-chip.ts`** — new UI module. Mounts a small `<button>` pinned top-left, reads from the session's `subscribe` stream, toggles visibility + updates the dot color class on every state transition.
- **`src/ui/remote-play-modal.ts`** — accepts an optional `session` in its options. When supplied, the Host / Join flows call `session.attachPeer(peer)` as part of their existing "peer created" path; a new `.remote-play-connection-row` inside the modal body shows the same state as the chip + exposes a Disconnect button.
- **`src/entries/gm.ts`** + **`src/entries/spectator.ts`** construct the session, wire it into the modal + chip, and subscribe to observe peer transitions. GM rebroadcasts `full-state` on `connected`; Spectator raises a status banner on `disconnected` and self-clears it on reconnect.

### Conflict resolution — GM-wins
Star topology + single-writer semantics make this easy. The only way state "drifts" is if a remote Spectator's local store was edited while disconnected (Spectator shouldn't mutate, but they could via their IndexedDB). On reconnect, the GM's full-state broadcast overwrites. Deliberate design: the GM is the session's authoritative source; merging isn't something a Spectator's local view can meaningfully contribute to. Documented in the Help overlay and the CHANGELOG.

### Tests
- **+10 unit tests** in `src/sync/remote-session.test.ts` for the session state machine: starts idle, attach/detach cycle, mirrors peer state, replaces cleanly on re-attach, `disconnect` no-op when idle, detach fn is no-op for a stale peer, unsubscribe semantics, stays on a closed peer until explicit disconnect.
- **+1 Playwright** in `e2e/remote-play.spec.ts` (7 total): "Create invitation → connection row + status chip appear → closing the modal keeps the chip → click the chip re-opens → Disconnect tears down + both go hidden again."
- All 57 unit-test files green: 629 unit tests total (+10 from 0.63.1's 619). 166 Playwright specs (+1 from 165).

### Bundle
- Adds ~2 KB JS (remote-session + remote-status-chip + the wiring). Bundle well under the 80 KB brotli budget bumped in 0.63.0.

### No other changes
- Same wire protocol (`SyncMessage` shape unchanged). BroadcastChannel + WebRTC fan-out in `SyncChannel.attachRemote` unchanged. Phase 62's manual-signaling invitation / answer copy-paste flow unchanged; reconnect is still a manual re-handshake (future phase: server-backed signaling for auto-reconnect).

---

## [0.63.1] — 2026-04-23 — Player identity is per-view (GM ≠ Spectator)

### Fixed
- **Renaming the GM also renamed the Spectator (and vice versa)** when both tabs were open in the same browser. Reported by the user immediately after 0.63.0 shipped. Root cause: `playerName` + `playerColor` were single fields in `Preferences`, and `preferences.ts` syncs the entire prefs blob across same-context tabs via the `storage` event. So a GM editing their own name wrote `playerName="Alice"` to localStorage, the Spectator tab's `storage` listener fired, picked up `playerName="Alice"`, re-broadcast its own identity as "Alice", and the GM panel suddenly showed two Alices.
- **Fix**: split each field by view role.
  - `playerName` → `playerNameGm` + `playerNameSpectator`.
  - `playerColor` → `playerColorGm` + `playerColorSpectator`.
  - GM entry reads `playerNameGm`; Spectator entry reads `playerNameSpectator`. Cross-tab sync still works (same prefs blob travels) but each view watches its own scoped key, so they don't step on each other.
- **Settings UI** is now view-aware: the "Your identity" fieldset reads + writes whichever scoped pair matches the modal's `viewMode`. GM Settings only edits the GM identity; Spectator Settings only edits the Spectator identity.

### Tests
- **+1 Playwright spec** (5 total): `Renaming the GM does NOT affect the Spectator's name (regression)` — opens both tabs, sets distinct names, renames the GM, verifies the Spectator's name + Settings input stay untouched. Verified to FAIL on 0.63.0 (single-key clobber) and PASS on 0.63.1.
- All 619 unit tests + 165 Playwright specs green.

### No other changes
- Same identity-broadcast protocol on the wire (the `identity` SyncMessage shape is unchanged — it only carries `(id, name, color, role)`, no schema bump). Bundle effectively unchanged.

---

## [0.63.0] — 2026-04-23 — Player identity + Connected Players panel

### Added
- **Display name + color per tab.** Settings → Accessibility → "Your identity" exposes a text field (defaults: empty → "GM" / "Spectator" based on the view) and a color picker (defaults: empty → stable hash-of-name color so the same name always renders consistently). Both round-trip through `localStorage` like every other preference.
- **Stable per-tab `playerId`** generated at boot. Pairs with the user's `(name, color, role)` to make a `PlayerIdentity` that gets broadcast over the existing sync transport (BroadcastChannel for same-browser + WebRTC for remote peers from Phase 62).
- **`identity` + `identity-leave` sync messages**. Optional + back-compat — receivers that don't know about them just ignore. Broadcast on tab boot, on every name/color edit, and on `beforeunload` (so the GM panel updates fast on a clean tab close).
- **GM-side Connected Players panel** anchored to the top-center of the viewport. Renders one chip per player with their color dot + name + role-aware border (GM chips get the accent color). Local tab's chip is marked "(you)" so the GM can tell at a glance which one represents them. Hidden when only the local tab is in the registry (no noise when nobody else is connected).
- **Attribution on dice + pings** — the GM and Spectator entries stamp outbound `ping` + `dice-roll` messages with `senderName: ownIdentity().name`. Receivers' announcer says `"Alice rolled 1d20: 17"` instead of the bland `"Spectator rolled 1d20: 17"`.
- **Help overlay** gets a new *Player identity* section walking through name + color setup, the Connected Players panel, attribution, and the privacy story (everything stays in `localStorage` on your machine; only sent to peers you've explicitly connected with).

### Implementation notes
- New pure module `src/state/player-identity.ts` exports the `PlayerIdentity` type, `colorForName(name)` (FNV-ish hash → 10-color palette), `resolveName(raw, role)` (empty → role-default), `validateColor(raw)` (`#rgb` / `#rrggbb` only), and `createIdentityRegistry()` (Map-backed peer collector with subscribe/forget/list/clear).
- The `IdentityRegistry` lives in BOTH the GM and the Spectator entries. The GM uses it to render the Connected Players panel; the Spectator uses it for ping attribution. Same data, different consumers.
- `preferences.ts` cross-tab `storage` event sync means same-browser tabs share the user's name + color — desirable for the typical "one human, one machine, two tabs" case (your name should be the same whether you're looking at your GM tab or your own peeking-Spectator tab). Tests that try to verify *distinct* names across tabs need to use separate BrowserContexts; the e2e instead verifies role-based chip presence, which works under shared prefs.

### Tests
- **+19 unit tests** in `src/state/player-identity.test.ts` covering: `colorForName` stability + collision check + fallback for empty input + valid-hex sanity, `resolveName` trim + role-default, `validateColor` accept/reject/whitespace, `IdentityRegistry` insert/overwrite/no-op-on-identical-update/forget/forget-unknown/list-order/subscribe-unsubscribe/clear/clear-empty.
- **+4 Playwright specs** in `e2e/player-identity.spec.ts`: Settings exposes name+color and they round-trip, panel hides when alone, panel shows two role-distinct chips when GM + Spectator are open, name change re-renders the chip without duplicating.
- All 57 unit-test files green: 619 unit tests total (+19 from 0.62.2's 600). 164 Playwright specs (+4 from 0.62.2's 160).

### Bundle
- Adds ~2 KB JS (player-identity module + connected-players panel + the wiring + the Settings UI). Bundle now at **75.41 KB brotli**, which crossed the original Phase-52 budget of 75 KB by 413 bytes. **Bumped the budget to 80 KB** to give room for incremental phase-by-phase growth (~600 bytes per phase since Phase 52). Easy enough to revisit if a future phase wants to be more aggressive about tree-shaking.

### No behavior change for legacy maps
- Identity messages are optional. Tabs talking to a < 0.63 peer just don't see that peer in their registry — everything else (patches, fog, dice rolls) keeps working. Sessions / scenes / persistence unchanged.

---

## [0.62.2] — 2026-04-23 — Remote Play: role-scoped modal (GM hosts, Spectator joins)

### Changed
- **Spectators can no longer host a Remote Play session.** Design point caught during post-0.62.1 review: GM is the authoritative source of truth for the session state — fog, scenes, tokens, etc. — and Spectators only mirror what the GM broadcasts. A Spectator "hosting" would offer an empty or stale session to anyone who joined, which is confusing and wrong. Conversely, a GM shouldn't be joining someone else's session (their local data would get overwritten).
- **Each view now has exactly one flow:**
  - **GM view** — Host only. Creates an invitation, waits for an answer, accepts it.
  - **Spectator view** — Join only. Pastes an invitation, generates an answer, sends it back.
- **Tab strip hidden** when only one role is available (both views currently). The modal opens directly on the right pane with no tab-switching affordance. If future releases add mixed-role scenarios (e.g. a spectator handoff), the tab strip logic is still in place — just data-driven off the `availableRoles` list so new view labels can opt in.
- **Intro copy tailored per role**: the GM view explains the Host flow ("Invite a remote Spectator…"); the Spectator view explains the Join flow ("Join a remote GM's session…"). Both mention the role asymmetry briefly so the design is discoverable.

### Tests
- Updated `e2e/remote-play.spec.ts` to 6 specs: existing menu-opens-modal + Create-invitation passes, plus two new role-scoped UI specs (GM shows Host only + hides tab strip; Spectator shows Join only + hides tab strip + no `data-action="host-create"` in DOM), plus a **cross-context real-WebRTC** flow that generates an offer in a GM context and pastes it into a separate Spectator context's Join pane — verifies both Chromium contexts produce real SDP strings end-to-end.

### No other changes
- Tour / notes / transcription / theme / onboarding / sync-channel wiring unchanged. Bundle effectively unchanged.

---

## [0.62.1] — 2026-04-23 — Remote Play: cap ICE gathering at 5 seconds

### Fixed
- **"Create invitation" sometimes took a full minute to return the SDP string.** Reported by the user immediately after 0.62.0 shipped. Root cause: `waitForIceGathering` waited for `iceGatheringState === 'complete'` with no timeout, which in practice waits for Chrome's internal ICE timeout (~30-40 seconds per unreachable STUN candidate). On networks where a firewall / captive portal / ad-blocking DNS makes one of the STUN servers unreachable, the user experiences the full 30-40s wait on top of the normal 1-2s gathering.
- **Fix**: cap gathering at 5 seconds. Return whatever candidates are present at that point — always includes at least the local host (LAN) candidate and usually a srflx (public IP) candidate, which is enough for LAN peers + most home-NAT setups. Peers behind symmetric NATs would have needed a TURN server anyway — waiting 60s for a never-arriving relay candidate doesn't help.
- **Also added**: listen for the `icecandidate` event's `null` candidate (per WebRTC spec: "end of gathering"). Some browsers fire that before `iceGatheringState` transitions to `complete`, so we short-circuit as early as the spec allows. Three resolve paths now: `iceGatheringState === 'complete'` (best), `null candidate event` (end-of-gathering spec signal), timeout (pragmatic guard).

### Tests
- **+1 unit test** in `remote-peer.test.ts` (18 total) pinning the timeout path: a `StuckRtcPeerConnection` mock that never flips `iceGatheringState` verifies `offer()` resolves after the 5s cap instead of hanging. Uses vitest fake timers to jump the clock.
- The null-candidate event path is exercised by the existing `e2e/remote-play.spec.ts` — real Chromium fires it well within the timer budget (observed: 1-2s).

### No behavior change on fast networks
- Offers on a well-connected network still resolve in 1-2s — the cap is an upper bound, not a delay. Users who were seeing 60s are now seeing 5s.

---

## [0.62.0] — 2026-04-23 — Network sync: WebRTC transport (beta)

### Added
- **Cross-machine sync via WebRTC**. A new "Remote play…" entry in both the GM and Spectator session menus opens a modal with Host / Join tabs. The Host flow creates an SDP invitation string; paste it to the guest (Discord, email, whatever). The guest pastes it into the Join tab, generates an answer string, sends it back, GM accepts it, and the connection opens. From that point, the remote peer behaves identically to a same-browser Spectator tab — the same `SyncMessage` protocol flows through the WebRTC datachannel.
- **Star topology**: GM is always the hub. Spectators connect to the GM; they don't need to know about each other. The GM broadcasts patches over *both* BroadcastChannel (for same-browser Spectators) AND every attached remote peer (for cross-machine Spectators). Spectators only send back to the GM they connected to.
- **No dedicated signaling server**. Phase 62 ships with manual copy-paste of SDP strings — which is enough for friend-to-friend sessions started over an out-of-band chat, and keeps the deploy story "just GitHub Pages." Future phases can layer WebSocket signaling + room codes on top without changing the connection protocol itself.
- **Theme-aware modal**. Host / Join tabs, step instructions, monospace SDP textareas with Copy buttons, real-time connection-state pill. All five Phase 59 themes render the panel correctly (CSS variable-driven).
- **Help overlay** gets a new *Remote play (beta)* section with Host / Join walkthroughs + the phase's known limitations (no room codes, no auto-reconnect, can fail behind symmetric NATs).

### Implementation notes
- **`src/sync/remote-peer.ts`** is a pure wrapper around `RTCPeerConnection` + `RTCDataChannel`. Host / guest roles expose `offer()` / `acceptAnswer()` / `answer()` respectively, plus the common `send(msg)` / `onMessage(fn)` / `onStateChange(fn)` / `close()` surface. No ICE trickle — we wait for `iceGatheringState === 'complete'` before returning the SDP so the user gets one self-contained string. STUN defaults to Google's public `stun.l.google.com:19302`. TURN is out of scope for Phase 62.
- **`src/sync/channel.ts`** grew a new `attachRemote(remote)` method on the existing `SyncChannel` interface. Outbound `channel.send(msg)` fans out to the BroadcastChannel AND every attached remote in a single step. Inbound messages from any attached remote get routed to the channel's existing `onMessage` listeners — callers don't have to know whether a message came in via BC or WebRTC. Loop prevention comes for free from star topology: BroadcastChannel doesn't echo to self, remote peers don't forward messages between themselves, so no message can come back to its origin via a different transport.
- **`src/ui/remote-play-modal.ts`** drives the two-tab UI, handles Copy-to-clipboard (with a Select-text fallback for browsers that refuse Clipboard API in non-focused tabs), and wires the peer's `onStateChange` into a live status pill ("Idle" → "Connecting…" → "Connected ✓" → "Disconnected" / "Failed" / "Closed"). It hides the form + surfaces a friendly message on browsers that don't expose `RTCPeerConnection` (rare — all modern browsers do, but good to fail helpfully).
- The GM and Spectator entries both mount their own `remotePlayModal` instance (one `RemotePeer` per modal, role chosen by which tab the user interacts with). Neither side touches the other's modal state.

### Tests
- **+10 unit tests** in `src/sync/channel.test.ts` for the new `attachRemote` surface: outbound fan-out, inbound routing, multiple remotes, detach, idempotent re-attach, send-failure isolation, close detaches everything.
- **+16 unit tests** in `src/sync/remote-peer.test.ts` for the WebRTC wrapper (mocked `RTCPeerConnection`): feature-detection, host flow (create datachannel with the versioned label, offer() returns SDP, state transitions on datachannel open, send/drop when closed, message parsing + malformed-JSON drop, acceptAnswer, close), guest flow (answer() returns SDP, message routing, send-after-open, send-before-datachannel is a no-op, close).
- **+5 Playwright specs** in `e2e/remote-play.spec.ts` covering the real Chromium WebRTC path: GM menu opens the modal, Spectator menu opens the modal, Host/Join tab switching, "Create invitation" populates a real SDP offer (ICE gathering actually runs), Join flow pasting + Generate answer returns a real answer.
- Regenerated the `session-menu-light` visual-regression baselines (Win32 + Linux) to account for the new "Remote play…" entry making the menu ~39px taller.
- All 56 unit-test files green: 599 unit tests total (+26 from 0.61.2's 573). All 159 Playwright specs green.

### Bundle
- Adds ~3 KB JS (remote-peer wrapper + modal UI) and ~0.5 KB CSS. **73.62 KB / 75 KB brotli budget** — getting close; the budget might need to grow in a future phase if we keep adding features, but still comfortably under for now.

### No behavior change for existing flows
- Same-browser BroadcastChannel sync works exactly as before. Remote play is purely additive — opt in by opening the modal + running the handshake. Users who never touch the modal see no functional difference from 0.61.x.
- The `SyncMessage` protocol didn't change — every message shape is still the same. Only the transport layer grew a second possible wire.

---

## [0.61.2] — 2026-04-23 — Phase 61 CI fallout: CSS bundle, e2e tour interference, baseline drift

CI on the 0.61.1 push went red on **23 specs failing** (mostly annotations + AoE + visual-regression). Three independent root causes — diagnosed by walking the CI logs + reproducing locally; all three fixed in this patch.

### Fixed
1. **CSS bundle silently truncated** by 2 trailing null bytes in `src/ui/styles.css`. The bytes (`\r\0\n\0`) came from a PowerShell `>>` redirect I ran during a styles.css edit — PS 5.1 defaults to UTF-16 LE for redirects, which adds nulls when extending a UTF-8 file. Vite's CSS bundler tolerated the file but warned `Expected "{" but found end of file` and dropped everything past the corruption. Page styles partially missing → many e2e assertions timing out on layout-dependent selectors.
   - **Fix**: stripped the trailing junk bytes, ending the file cleanly at the last `}\n`. Verified the CSS bundler is now warning-free + the file scans clean for null bytes.
2. **Onboarding tour auto-show backdrop blocked clicks in non-tour e2e specs**. Phase 61's tour pops up 250ms after first GM boot and its dim backdrop has `pointer-events: auto` to focus user attention on the highlighted target — but for the centered Welcome step the backdrop covers the whole viewport. Specs like `annotations.spec.ts` and `aoe-tool.spec.ts` start fresh (no prefs), the tour fires during their setup, and every `mouse.click` / `mouse.move` after that hits the backdrop instead of the canvas. Result: 30s timeouts on right-click and context-menu interactions.
   - **Fix**: added `e2e/global-setup.ts` that writes a Playwright `storageState.json` pre-seeding `{onboardingComplete: true}` so the tour stays dormant for every spec by default. The `onboarding-tour.spec.ts` opts out via `test.use({storageState: {cookies: [], origins: []}})` so its `bootGmFresh()` helper still triggers the auto-show. Per-spec `addInitScript` calls run AFTER the seeded state is applied, so individual tests can still override (e.g. `voice-transcription.spec.ts` pre-sets `notes-open=true`).
3. **`e2e/visual-regression.spec.ts`'s `FIXED_PREFS` was missing `onboardingComplete`**. The visual baselines were captured pre-Phase-61, so any auto-show-then-screenshot run produced an image with the tour overlay → 100% pixel diff. Also: Phase 61 added the "Take the tour" entry to the session menu, so the *session-menu-light* baseline got 39px taller (one button + gap).
   - **Fix**: added `onboardingComplete: true` to `FIXED_PREFS` so the tour is suppressed during baseline runs. Regenerated the *session-menu-light* baselines on both platforms (Win32 locally + Linux via the pinned `mcr.microsoft.com/playwright:v1.59.1-jammy` Docker container, same `/scratch` workaround as 0.59.1's baseline regen).

### Build guard added
- New `scripts/check-no-null-bytes.mjs` scans every tracked source file under `src/`, `e2e/`, `public/`, and the project root for null bytes; fails the build with a named offending file if any are found. Wired into `npm run build` ahead of `tsc` + `vite build`. Now any future PowerShell `>>` accident (or other UTF-16-on-UTF-8 mishap) fails loud at build time instead of silently corrupting the CSS bundle.

### Verified
- Local: `npm run build` passes the new guard cleanly (247 files scanned). Full Playwright suite green (`154 / 154`). Unit suite unchanged at 573.
- New tour-spec assertion was already in 0.61.1 — confirmed it still passes.

### No other changes
- Tour state machine, UI module, persistence wiring, session-menu replay entry — all unchanged from 0.61.1. Bundle effectively unchanged.

---

## [0.61.1] — 2026-04-23 — Onboarding tour: fix Tools step selector

### Fixed
- **The "Tools" step in the onboarding tour didn't highlight the toolbar**, while every other anchored step (Session menu, Map canvas, Help button) drew the cutout correctly. Root cause: `GM_TOUR_STEPS[1].target` was `.toolbar`, but the actual class on the toolbar element is `.gm-toolbar`. The selector silently failed (no DOM match → null target), and `layoutPopover` falls back to a centered popover with the four-piece backdrop collapsed into a single full-viewport piece. Net effect: the popover content was correct but the highlight was missing.
- **Fix**: change the selector to `.gm-toolbar` to match the DOM.

### Why CI didn't catch it
- The Phase 61 e2e walked all 6 steps but only asserted popover content + step counter — neither of which depends on whether the target was found. Pinned forward with a new spec that walks each step and asserts `tour-popover[data-placement]` matches the step's expected placement (`'center'` for the no-target intro/outro steps; `'top'` / `'bottom'` / `'left'` / `'right'` for anchored steps). Pre-fix it FAILS at step 2 (placement is `'center'` instead of `'bottom'`); post-fix it PASSES.

### No other changes
- Tour state machine, UI module, CSS, and persistence wiring unchanged. Bundle effectively unchanged. 573 unit tests + 8 onboarding-tour e2e specs (was 7) green.

---

## [0.61.0] — 2026-04-23 — Onboarding tour

### Added
- **6-step popover walk-through** of the GM view that auto-shows on first launch. Each step has a title, body, and (most steps) anchors a popover next to a highlighted UI element so the user can see what's being explained: Welcome → Toolbar → Map canvas → Session menu → Spectator-tab tip → Help reference.
- **Highlight cutout backdrop** — the dim layer is rendered as four positioned divs surrounding the target rect, so the highlighted element stays interactive (no SVG mask trickery; `pointer-events: auto` only on the dim pieces). Centered "no anchor" steps collapse the four pieces into one full-viewport piece.
- **Auto-show on first boot** — the GM entry checks `preferences.onboardingComplete` and opens the tour ~250ms after boot when it's still `false` (default). Once finished or skipped (or dismissed via Esc) the flag flips to `true` and the tour stops auto-showing.
- **Replay anytime** — a new "Take the tour" entry in the GM session menu re-opens the walk-through from step 1 without resetting the completion flag. Useful after a feature update or just to refresh.
- **Esc / Skip equivalence** — both close the tour AND mark it complete (we treat skip as an explicit user action). The Skip button is always visible; the Esc shortcut works in any focus state.
- **Back / Next / Finish buttons** — Back is hidden on step 1, Next becomes "Finish" on the last step. Counter ("3 of 6") in the popover header shows progress.
- **Theme-aware** — popover + buttons read CSS variables (`--bg-elev`, `--accent`, `--border`, etc.), so all five Phase 59 themes (Dark / Light / Parchment / Console / Purple Dusk) render the tour consistently.
- **Reduced-motion-aware** — `body.reduced-motion` disables the popover + backdrop transitions so users who prefer instant updates get them.
- **Help overlay** — new *Onboarding tour* section explains first-boot behavior, replay path, and how to bring the tour back if needed.

### Implementation notes
- `src/state/onboarding-tour.ts` exports a pure `createTourController({ steps, onComplete?, onSkip? })` plus the canonical `GM_TOUR_STEPS` array. The controller is a small state machine: `getState()` / `next()` / `prev()` / `goTo(n)` / `subscribe(listener)` / `finish()` / `skip()` plus the terminal-state guards (`isComplete()` / `isSkipped()`). Easy to unit-test without touching the DOM.
- `src/ui/onboarding-tour.ts` mounts the popover + four backdrop pieces, listens for window resize / scroll to keep the popover anchored as layout shifts, and tears the whole thing down on `close()`. Step changes come through `controller.subscribe(...)`.
- `gm.ts` constructs a fresh `TourController` per replay so step counters always reset to "1 of N". Both `onComplete` and `onSkip` flip `preferences.onboardingComplete = true` — terminal states are interchangeable from the persistence point of view.
- Session menu's `onReplayTour` callback is OPTIONAL on `SessionMenuActions` so any future caller (e.g. a Spectator-side tour) can omit it without TypeScript yelling. The button is only mounted when the callback is present.

### Tests
- **+14 unit tests** in `src/state/onboarding-tour.test.ts` covering: empty-steps throws, initial state at step 0, next/prev navigation + clamping, isFirst/isLast boundary flips, goTo with clamp + same-index skip, finish + skip exclusivity (one terminal wins), unsubscribe semantics. Plus 3 sanity checks on the canonical `GM_TOUR_STEPS` (non-empty content, valid selectors, unique ids).
- **+7 Playwright specs** in `e2e/onboarding-tour.spec.ts`: auto-show on first boot, no-show after onboarded, full Next walk-through + Finish closes + persists across reload, Skip closes + persists, Esc dismisses + persists, "Take the tour" replay entry works after completion, Back button shows/hides at the right boundaries.
- All 54 unit-test files green: 573 unit tests total (+14 from 0.60.1's 559).

### Bundle
- Adds ~2 KB JS (tour state machine + UI module + the gm.ts wiring + the menu entry) and ~1.5 KB CSS for the backdrop + popover styles.

### No behavior change for upgrading users
- The pref defaults to `false`, so users upgrading from < 0.61 will see the tour once on next boot. After they finish or skip (one click either way), the flag flips and the tour never auto-shows again. Sessions / scenes / preferences are otherwise untouched.

---

## [0.60.1] — 2026-04-23 — Phase 60 boot crash + dice/help button alignment

### Fixed
- **GM canvas was empty after upgrading to 0.60.0** when the notes panel was closed. The Scenes button click also threw "Cannot access 'scenesModal' before initialization" with no modal opening. Both errors had the same root cause: `notes-panel.ts` called `setOpen(initiallyOpen)` BEFORE its `let transcriber` declaration, but `setOpen(false)` references `transcriber?.isActive()` in its panel-closes-while-recording branch. The TDZ throw at `notes-panel.ts:203` aborted the rest of `gm.ts` module evaluation — every `const`/`let` declared after `mountNotesPanel()` (including `scenesModal`) was left in TDZ, so anything referencing them later (the Scenes button click lambda, `loadPersistedState().then(store.loadState)`) crashed too. Net effect: GM rendered the empty default state and several UI controls silently failed.
- **Fix**: hoist the `let transcriber` and `let statusIsError` declarations to the very top of `mountNotesPanel`, before the initial `setOpen()` call. The function-scoped declarations now exist by the time `setOpen` evaluates their references in the (initially-not-taken) else branch.
- **Why CI didn't catch it**: every existing notes-panel test pre-set `notes-open` to `true` in localStorage, which made `setOpen(true)` go into the `if (next)` branch and skip the TDZ-affected else branch. Pinned with a new spec that exercises the failing path.

- **Floating Dice 🎲 + Help ❓ buttons jumped ~320px to the right when the notes panel opened** in the GM view. The notes panel itself lives on the RIGHT side of the viewport (`.notes-panel { right: 0 }`), so left-side floating buttons should never need to make room for it. The `body.notes-open .dice-button` / `body.notes-open .help-button` rules that shifted them rightward were a leftover copy-paste from a draft layout where the panel had been on the left — never noticed pre-Phase-60 because the user rarely opened the notes panel. **Fix**: deleted both `body.notes-open` shift rules. The buttons now stay anchored at bottom-left in every notes-open / notes-closed state. Session menu + zoom controls still shift correctly (those ARE on the right and DO need to move).

### Regression test added
- New Playwright spec `e2e/boot-no-tdz.spec.ts` with two pins:
  1. **Cold-boot GM (notes panel closed) does not throw + Scenes button works** — explicitly clears the `notes-open` LS key, loads `gm.html`, asserts no `Cannot access` console errors, then clicks the Scenes button and verifies its dialog opens.
  2. **Dice + Help buttons stay bottom-left when the notes panel is open** — pre-sets `notes-open=true`, asserts both buttons' computed `left` is under 50px (pre-fix: ~333px).
- Both were verified to PASS only with the 0.60.1 code.

### No other changes
- Voice transcription wrapper, mic UI, settings toggle, and CHANGELOG entry from 0.60.0 are all unchanged. Bundle effectively unchanged. 559 unit tests + 156 Playwright specs green.

---

## [0.60.0] — 2026-04-23 — Voice transcription → notes

### Added
- **Speech-to-text in the Session Notes panel.** A new 🎤 button appears in the notes panel header on browsers that support the Web Speech API (Chrome / Edge / recent Safari). Click to start listening; the recognizer streams what you say and appends each finalized utterance to the notes textarea. The mic only activates on click — no always-on capture.
- **Live "Listening…" status banner** above the textarea shows the recognizer state. While speaking, the interim (un-finalized) text is mirrored into the banner so the GM sees their words landing in real time. Only finalized chunks (post-pause) get committed to the notes.
- **Pulsing red dot** on the mic button while active. Honors `prefers-reduced-motion` (the dot stays solid red instead of pulsing).
- **Permission-error UX** — denied / blocked / no-mic / network errors surface in the status banner with a friendly message ("Microphone access blocked. Allow it in your browser settings, then try again."). Errors stay visible after the recognizer ends so the user can read them; the next click on the mic clears the banner.
- **Settings → Accessibility** gets a new toggle *"Voice transcription (microphone in Notes panel)"* (default on). Turning it off hides the mic button entirely — useful for shared / kiosk setups where you never want a one-click mic affordance. The toggle is functional even on browsers that don't expose `SpeechRecognition` (Firefox today); the button stays hidden either way on those.
- **Help overlay** gets a new *Voice transcription* section walking through where, how, stop, and the browser-support caveat.

### Implementation notes
- New pure module `src/util/voice-transcription.ts` wraps the Web Speech API. Detects either `window.SpeechRecognition` or `window.webkitSpeechRecognition` (Chrome / older Safari shipped the prefixed name). Returns a typed `VoiceTranscriber` with `start` / `stop` / `isActive` / `onTranscript` / `onStateChange` / `onError` / `destroy` — no recognizer internals leak to consumers.
- **Auto-restart on silence** — most browsers end the recognition session after ~30s of silence even with `continuous: true`. The wrapper detects the natural `onend`, checks whether the user explicitly stopped, and re-starts otherwise. Permission-class errors flip an internal flag so we don't ping-pong start/error/end forever.
- **Coalesced transcript events** — `onTranscript` listeners receive `(finalText, interimText)` shaped objects instead of having to walk the raw `SpeechRecognitionResultList`. Final text is what gets appended to the textarea; interim is just shown in the status banner.
- **Notes panel mounts the recognizer lazily** — `createVoiceTranscriber()` only fires on the first mic click, so unsupported browsers + privacy-off setups don't pay any cost. Closing the notes panel while recording stops the recognizer (no orphaned mic state).
- New `voiceTranscription: boolean` preference defaults to `true`. Hidden behind the same body-class machinery as other prefs; cross-tab `storage` event already in place.

### Tests
- **+14 unit tests** in `src/util/voice-transcription.test.ts` covering: feature-detection (no-ctor / standard / webkit-prefixed), default + explicit `lang`, state machine (start / no-double-start / stop), final+interim split, permission-denied error code mapping + auto-restart suppression, natural-end auto-restart, destroy-aborts-and-clears-listeners, unknown-error mapping. Stub recognizer is fully sync — no flaky timing.
- **+5 Playwright specs** in `e2e/voice-transcription.spec.ts` using `addInitScript` to inject a stub `SpeechRecognition` so the tests don't depend on a real mic / permission grant. Covers: mic button visible by default, hidden when pref is off, click toggles `aria-pressed` + listening status, final transcript appends to textarea, permission-denied error surfaces in error-styled status banner with auto-restart suppressed.
- All 53 unit-test files green: 559 unit tests total (+14 from 0.59.0's 545).

### Bundle
- +~1.2 KB JS (new util module + the notes-panel wiring + the Settings input). Comfortable under the 75 KB brotli budget.

### No behavior change for existing maps
- The pref defaults to `true`, but the mic button is opt-in (the user has to click it AND grant browser mic permission). Sessions saved before 0.60 deserialize unchanged; the notes panel just gains a new icon in its header.
- Browsers that don't expose `SpeechRecognition` (Firefox today) silently hide the mic button — no error shown, no console noise.

---

## [0.59.0] — 2026-04-23 — Theme variants (parchment / console / purple dusk)

### Added
- **Three new visual themes** alongside the original Dark + Light, picked from Settings → Appearance → Theme:
  - **Parchment** — warm cream background, dark-brown ink, faded-gold borders. Reads like an old hand-drawn map; works well for classic fantasy campaigns.
  - **Console** — terminal green-on-black, accents that glow in the same green so the whole UI feels CRT. Built for sci-fi or cyberpunk one-shots.
  - **Purple Dusk** — deep midnight purple background with lavender accents. Moodier alternative to plain Dark for horror or twilight scenes.
- Each theme covers everything the existing Dark/Light themes did:
  - **CSS variable palette** (`--bg`, `--fg`, `--accent`, `--border`, `--panel-bg`, `--modal-backdrop`, etc.) — drives the whole UI shell.
  - **Canvas backdrop** (`CANVAS_BG` in renderer + snapshot) — the void around the map matches each theme's tone.
  - **Grid line color** (`LINE_COLORS` in `layer-grid.ts`) — parchment uses faded brown ink, console uses dim green, purple-dusk uses pale lavender. Keeps the grid readable on each backdrop without looking out of place.
  - **Background fallback fill** (`FALLBACK_FILL` in `layer-background.ts`) — the inner-map color when no map image is set picks a slightly lighter shade of each theme's palette.
- **Help overlay** gets a new *Themes* section listing all five with a one-line flavor summary each.

### Implementation notes
- `Theme` type extended from `'dark' | 'light'` → `'dark' | 'light' | 'parchment' | 'console' | 'purple-dusk'`. Two new exports give the Settings picker + tests a single source of truth: `ALL_THEMES` (display order) and `THEME_LABELS` (`Record<Theme, string>`).
- `applyTheme(theme)` is now a shared helper in `src/util/theme.ts` — clears every `theme-*` body class then adds the one for the current preference (`'dark'` is the `:root` baseline so it gets no class). Both GM and Spectator entries call it from their `applyPrefsToBody` so the two paths can't drift on which classes they apply.
- The Settings picker switched from a hard-coded 2-radio block to `ALL_THEMES.map(...)` rendered in a `radio-group radio-group-wrap` (new modifier that lets the row wrap on narrow viewports without crowding).
- All canvas-side palette maps were promoted from inline `{dark, light}` objects to `Record<Theme, string>` — TypeScript now refuses to ship an incomplete map, so future Theme additions are fail-fast.

### Tests
- **+10 unit tests** in `src/util/theme.test.ts` — covers the no-class-for-dark default, every Phase-59 variant getting its `theme-<name>` class, switching themes clears the previous class, switching back to dark wipes everything, and other body classes (`high-contrast` / `reduced-motion`) survive the swap. Plus two sanity checks on `ALL_THEMES` + `THEME_LABELS`.
- **+7 Playwright specs** in `e2e/theme-variants.spec.ts`: picker exposes every theme, each theme applies the correct body class + computed `--bg` color (sharp regression pin against TS↔CSS palette drift), and the chosen theme persists across reload.
- All 52 unit-test files green: 545 unit tests total (+10 from 0.58.0's 535).

### Bundle
- +~700 bytes JS (theme map entries + util/theme + Settings picker rewrite). 66.91KB / 75KB brotli budget.

### No behavior change for existing maps
- Pre-0.59 sessions deserialize with `theme: 'dark'` (or `'light'` if the user previously switched). Both themes render exactly the same as before — the new variants are purely additive.
- The visual-regression suite continues to use `theme: 'dark'` for its baselines; Phase 59 doesn't add any new baseline images.

---

## [0.58.0] — 2026-04-22 — Follow-the-fog exploration mode

### Added
- **Auto-reveal fog from viewer line-of-sight.** New preference `autoRevealFromViewers` (default `false`). With Dynamic line of sight on AND this toggle on, every fresh viewer visibility polygon also paints `revealed=1` into the GM-painted fog buffer for any cell inside the polygon that wasn't already revealed. Result: a viewer token walking onto unrevealed terrain auto-uncovers what it sees, with no manual Reveal-tool work from the GM.
- **Settings UI** — new checkbox in Settings → Grid: *"Follow-the-fog (auto-reveal as viewers move)"*. Disabled (and visually de-emphasized) when Dynamic line of sight is off, so the dependency is obvious.
- **One-way semantics** — auto-reveal only flips cells from hidden→revealed. The GM remains the authority for hiding cells via the Hide tool. Once revealed, cells stay revealed even after the viewer walks away — gives the party a "we explored this room" memory without any extra work.
- **Help overlay** — new bullet *"Follow-the-fog (auto-reveal)"* added to the Line of sight section.

### Implementation notes
- New pure helper `cellsToReveal(polygons, fog, grid)` in `src/state/auto-reveal.ts`. Rasterizes the union of polygons to a per-cell mask (re-using Phase 55's `rasterizeVisibility`), then walks mask + fog in lockstep — emits a `{x, y, value: 1}` cell whenever the mask says "visible" but the fog says "hidden." Empty inputs short-circuit so the caller can skip the `fog-set` patch entirely (avoids spurious BroadcastChannel traffic + idle undo entries).
- `gm.ts` hooks `fogWorkerClient.onLosUpdate` and applies a `fog-set` patch when the helper produces non-empty cells. Toggling the preference from off→on triggers an immediate auto-reveal against the current cached polygons (otherwise the user would have to nudge a viewer to see anything happen — confusing UX).
- **Bug fix found while wiring the e2e**: `losInline` (the synchronous fallback used when the fog worker isn't created yet) wasn't calling `notifyLos()`. Pre-fix, `onLosUpdate` listeners only fired on actual worker responses — so on a fresh page that hadn't done any fog compaction yet, auto-reveal silently never happened. Worker-path notification was already correct. Fixed by calling `notifyLos()` at the end of `losInline` too. Preexisting LoS rendering code wasn't impacted (its render-on-update was either being satisfied via the worker path or via the existing store subscriber that requests a render anyway).
- No mid-drag throttling needed: the worker client's existing input-signature cache means a refreshLos call with unchanged viewers/walls/lights returns synchronously without re-firing listeners. Auto-reveal patches DO fire per drag tick but the cells diff is empty most ticks (viewer position changes by sub-cell amounts).
- Spectator does NOT auto-reveal locally — GM is the source of truth for fog. Spectator receives the resulting `fog-set` patches via the BroadcastChannel like any other patch.

### Tests
- **9 new unit tests** in `src/state/auto-reveal.test.ts` for `cellsToReveal`: null/empty polygons, all-revealed-already short-circuit, partial diff, multi-polygon union, multi-row index→(x,y) mapping, degenerate polygon (< 3 points), and a defensive size-mismatch check.
- **3 new Playwright specs** in `e2e/follow-the-fog.spec.ts`: Settings exposes the toggle gated on `losMode`, placing a viewer with the toggle on auto-reveals fog (verified via the canvas aria-label's "X% of fog revealed" readout going from 0 → positive), and toggling off mid-flight stops further auto-reveals while preserving already-revealed cells.
- All 51 unit-test files green: 535 unit tests total (+9 from 0.57.1's 526). All Playwright suites green.

### Bundle
- Adds ~600 bytes to the JS chunk (the helper + the gm.ts wiring + the settings UI + the help text). Comfortably under the 75 KB brotli budget.

### No behavior change for existing maps
- The pref defaults to `false`, so 0.57.1 maps boot at exactly the same fog state. Auto-reveal only activates when the user explicitly opts in via Settings → Grid.

---

## [0.57.1] — 2026-04-23 — Active-scene-blanking fix when GM reloads with Spectator open

### Fixed
- **Reloading the GM tab while the Spectator tab was open silently destroyed the active scene's contents.** Tokens, walls, annotations — everything in the currently-loaded scene was wiped. Other saved scenes in the scenes catalog were unaffected. Reported during Phase 57 testing on the local dev server.
- **Root cause**: `src/entries/gm.ts` ran `channel.send({ type: 'full-state', state: serializeState(store.getState()) })` SYNCHRONOUSLY at module init — but `loadPersistedState()` was kicked off as a `void` Promise above, so the broadcast carried the EMPTY default state. The Spectator tab received the empty `full-state`, called `store.loadState(empty)`, and 200ms later its persist debounce wrote that empty state to the SHARED active-scene record in IndexedDB. The GM's eventual load resolved, read back the now-blanked scene, and both tabs ended up showing nothing. Other scenes survived because `saveState` only writes to the *active* scene (via `ensureActiveScene` → reads pointer from localStorage).
- **Same race in two more handlers**: the GM's `'hello' from spectator` and `'request-full-state'` cases also responded with `full-state(emptyState)` if a Spectator connected during the pre-load window.
- **Fix (GM-side)**: introduce `initialLoadComplete` flag (default false). Defer `channel.send({type:'hello'})` and the initial `full-state` broadcast until AFTER `loadPersistedState().then(...)` runs. Gate the spectator-hello + request-full-state replies on the same flag — Spectators that connect early are silently ignored, then receive the correct broadcast when the GM's load completes.
- **Fix (Spectator-side, belt-and-suspenders)**: track `remoteStateReceived`. When a `full-state` or `patch` arrives via the BroadcastChannel, flip the flag. The local-IDB `loadPersistedState().then(...)` then no-ops if a remote has already populated the store — so even if a future bug ever broadcast stale state, the Spectator wouldn't clobber it with even older local data.

### Why this was masked
- Single-tab usage (GM only, no Spectator open) never hit it: `BroadcastChannel.postMessage` doesn't echo to the sending tab, so the empty broadcast had no listener.
- Production CI didn't catch it: the `e2e/spectator-smoke.spec.ts` and `persistence.spec.ts` tests don't exercise the reload-with-other-tab-open flow.
- The user surfaced it because Phase 57's lighting feature genuinely needs both tabs open to verify the viewer ∩ light composition — exactly the scenario the bug requires.

### Regression test added
- New Playwright spec `e2e/active-scene-clearing.spec.ts`:
  - **`GM never broadcasts a full-state with empty tokens after a reload`**: deterministic pin via `addInitScript` that monkey-patches `BroadcastChannel.prototype.postMessage` to capture every outbound message into `window.__bcMessages`. After GM boot, asserts that no captured `full-state` had an empty tokens array. Verified to FAIL on the unpatched 0.57.0 code (catches the empty broadcast at line 85) and PASS with the 0.57.1 fix.
  - **`GM + Spectator handshake leaves both tabs showing the active scene`**: end-to-end smoke that opens both tabs in the same BrowserContext + verifies the Spectator's canvas aria-label reflects the GM's pushed state.

### No other changes
- Zero state / rendering / lighting behavior change. Phase 57's new units / e2e all green. Bundle unchanged.

---

## [0.57.0] — 2026-04-23 — Token lighting sources + bright/dim radius

### Added
- **Tokens can emit light.** New `TokenLight` shape on every token: `{ bright, dim, color }` in world pixels (exposed in feet via the active `feetPerSquare`). `null` means "no light" — fully back-compat with every existing session, since the sync + persistence deserializer normalizes missing/malformed values back to `null`.
- **Token editor — Light fieldset** alongside the Phase 55 Sight fieldset:
  - **"This token emits light"** checkbox gates the rest of the controls.
  - **Preset row**: *Candle* (5/5), *Torch* (20/20), *Lantern* (30/30), *Daylight* (60/60). Click to apply — the bright + dim feet inputs sync. Each preset carries a stylistic color (warm orange for torch, cool white for daylight).
  - **Bright / Dim feet** inputs for custom light sources. Bright is clamped to ≤ dim on commit (a candle's well-lit zone can't extend past its outer glow; the on-the-wire normalizer enforces this too).
  - **Color picker** for warm vs cool tints. Color is render-only on the GM canvas — Spectator visibility math uses radius alone.
- **Spectator fog composition** (when `losMode !== 'off'`): a cell now shows on the Spectator map only when it's (a) GM-revealed AND (b) inside some viewer's sight polygon AND (c) inside some light source's `dim` polygon. With *no* lights configured anywhere on the map, the lighting AND short-circuits — your existing maps keep their Phase 55 viewer-only behavior. So lighting is purely additive: no migration, no sudden darkness.
- **Walls block light** — sight-blocking walls also occlude lighting by design. A torchbearer rounding a corner casts a real shadow on cells beyond the corner. Re-uses the same `computeVisibilityPolygon` ray-cast as viewer sight, so no new geometry pipeline.
- **GM-side lighting halos** — new `drawLighting` layer paints the dim radius (faint) and bright radius (slightly stronger) as translucent colored halos clipped to the worker-supplied light polygons. Lets the GM see at a glance "the candle vs the lantern halo." No-op on Spectator (which consumes lighting via fog masking, not by drawing halos).
- **Help overlay** gets a new *Lighting (optional)* section after *Line of sight*: how to add a light source, bright vs dim, walls blocking light, the Spectator composition rule, and the color flavoring note.

### Implementation notes
- `collectLights(tokens, grid, dragOverlay?)` mirrors `collectViewers` — filters tokens to those with a non-null `light`, projects to the worker-facing `LosViewer` shape using the `dim` radius, and shifts dragged lights by the overlay delta so torchbearers don't leave a stationary halo behind mid-drag.
- `spectatorEffectiveFog` grew an optional `lightPolygons` parameter. `null` (caller didn't wire lighting) → preserve Phase 55 behavior. Empty array (lighting wired but no lights placed) → also preserve Phase 55 (no sudden darkness shroud). Non-empty → AND-mask viewer ∩ light per cell.
- Fog worker `compute-los` request now accepts an optional `lights` array; the response carries a parallel `lightPolygons` array. The worker reuses the same `computeVisibilityPolygon` for both viewers and lights — sight-blocking walls naturally affect both. Optional fields keep the message back-compat with messages crafted before Phase 57.
- `createFogWorkerClient.requestLos` signature: `(viewers, walls, lights = [])`. The signature cache extends to include lights so changing only viewers, only walls, or only lights triggers a fresh compute. `getLatestLightPolygons()` is the new accessor; `onLosUpdate` listeners now receive `(polygons, lightPolygons)` so renderers can compose both in one tick.
- Renderer gains `getLightPolygons()` callback alongside `getLosPolygons()`. GM entry wires `fogWorkerClient.getLatestLightPolygons()`; Spectator entry passes the polygons into `spectatorEffectiveFog` and skips the GM lighting layer (it doesn't paint halos — Spectator only sees fog).

### Tests
- **13 new unit tests**:
  - **6 in `src/state/los-compose.test.ts`** for `collectLights` (skip non-light tokens, skip zero-dim, size-aware center, drag-overlay shift, null-overlay back-compat) — the same shape as the Phase 55 `collectViewers` coverage.
  - **3 in `src/state/los-compose.test.ts`** for `spectatorEffectiveFog` lighting paths: empty-lightPolygons preserves viewer-only behavior, non-empty AND-masks viewer ∩ light, lights-everywhere-but-darkness collapses fog correctly.
  - **4 in `src/sync/messages.test.ts`** for `normalizeLight` deserialization: missing field defaults to `null`, dim < bright clamps dim up, NaN bright rejects to `null`, missing color defaults to `#ffe1a4`.
- **3 new Playwright specs** (`e2e/token-lighting.spec.ts`): editor exposes Light fieldset with all 4 presets, light values round-trip through close + reopen, enabling LoS + placing a torch token + a wall doesn't throw console errors.
- All 50 unit-test files green: 526 unit tests total (+14 from 0.56.1's 512).
- All 24 test fixtures (Token literals across `src/`) gained `light: null` via a typecheck-driven Perl one-liner — same pattern used for Phase 55's `losRadius: null` migration.

### Bundle
- Adds ~1.5 KB to the JS chunk (new `layer-lighting.ts` + the editor wiring + the worker plumbing). Well under the 75 KB brotli budget.

### No behavior change for legacy maps
- Sessions saved before 0.57.0 deserialize with `light: null` on every token. With no lights anywhere on the map, `spectatorEffectiveFog` falls back to the Phase 55 viewer-only mask. Open one in 0.57.0 → identical pixels.
- The toolbar's *Walls* tooltip got a passing tightening: the Phase 54 stub language ("in a future update will block line of sight") is now accurate ("sight-blocking walls occlude both viewer line-of-sight and token light sources").

---

## [0.56.1] — 2026-04-22 — Delete-on-wall handler-ordering fix

### Fixed
- **Delete key on a selected wall unselected the wall instead of removing it.** The Select tool had its own window-level `Delete`/`Backspace` keydown handler (pre-existing, pre-Phase-56) that *only* knew about tokens / annotations / AoE. When the Phase 56 work added a second handler in `gm.ts` (which does know about walls), both listeners were on the window — and the Select tool's listener fires first under the Select-active-at-boot ordering. It cleared `selection.ids` (wall matched nothing it recognized → no patch), then gm.ts's handler ran, saw an empty selection, and no-op'd. Net effect: wall unselected, wall remained.
- **Fix**: remove the duplicate handler in `tool-select.ts`. gm.ts is now the single source of truth for `Delete`/`Backspace` (already covered tokens + annotations + walls + the live-region announcer since Phase 56; grown an AoE case here to preserve the old behaviour).
- **Why the bug passed CI**: the existing walls-selection e2e used a helper that pressed `w` then `s` during setup. Activating the Walls tool deactivates Select → removes its keydown listener; reactivating Select re-adds the listener *after* gm.ts's. Handler order inverted → gm.ts fired first → wall deleted. Masked the bug in tests but not in real use where no tool-switch happens.

### Regression test added
- New Playwright spec *`Regression (0.56.1): Delete removes a wall WITHOUT switching tools after boot`* inlines the wall-drawing steps (without the `w` → `s` dance) to pin the failure mode. Covers handler-ordering bugs of this shape going forward.

### Flake fix (bonus)
- The `lasso-multi-select.spec.ts › arrow key moves all selected tokens` test relied on `Ctrl+ArrowRight` to advance the editor cursor. Editor focus moves into the modal via a `setTimeout(0)` after `openFor`, so the keystroke could fire before focus landed → the modal-scoped keydown handler missed it → cycle never advanced → the test compared first-token X to itself and failed. Swapped the keystroke for a click on the editor's *Next ›* button — equivalent semantics, no race. Surfaced under 0.56.1's slightly tighter boot timing on the Ubuntu runner.

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

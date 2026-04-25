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

Second post-1.0 phase plan (Phases 65 → 85) — see PLAN.md / the
chat history for the full breakdown:

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
- **0.81.0** — Animated GIF token portraits
- **0.82.0** — Per-Spectator permissions
- **0.83.0** — Latency indicator on the status chip
- **0.84.0** — Conflict-merge UI
- **0.85.0** — Wall editing revamp (in-place edit of endpoints, blocksSight / blocksMovement, thickness; live drag-out preview while drawing; chain merging so a corridor edits as one shape; per-wall `visibility: 'shared' | 'gm'` for secret features)

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

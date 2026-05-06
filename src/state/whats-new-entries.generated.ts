/**
 * Phase 161 — AUTO-GENERATED from CHANGELOG.md.
 * Do NOT edit by hand. Run `npm run extract:whats-new` to regenerate.
 *
 * Source: `CHANGELOG.md` version-header lines like
 * `## [1.35.0] — 2026-05-05 — Wall-clipping for auras`.
 *
 * Each entry's `highlights` array contains exactly one string —
 * the section-title text after the date em-dash. Multi-line richer
 * summaries can be added in a future phase by extending the
 * extractor.
 */

import type { WhatsNewEntry } from './whats-new.js';

export const GENERATED_WHATS_NEW_ENTRIES: readonly WhatsNewEntry[] = [
  {
    version: '1.51.0',
    date: '2026-05-06',
    highlights: ['Drag-handle reorder in initiative tracker'],
    body: "Phase 176 — fifteenth of the v1.37 → v1.55 batch. The initiative tracker modal's rows are now drag-reorderable. Each row gets a `⋮⋮` handle + `draggable=true`; dropping on another row inserts before/after based on cursor position relative to the row's vertical midline. The new `'initiative-reorder'` patch kind preserves entry `value` fields (drag is order-only, doesn't rewrite rolls).\n\n### Added\n- **`'initiative-reorder' { kind, order: ID[] }` patch kind** in `src/state/types.ts`. The store handler validates the new order contains the same id set as the existing order (same length post-dedup; unknown ids dropped silently); same-shape no-op fast-path.\n- **Drag handle + `data-id` per row** in `src/ui/initiative-modal.ts`. The handle (`⋮⋮`) is visual; the entire row is `draggable`.\n- **One-shot DOM listeners** on `listEl` (delegation) for `dragstart` / `dragover` / `drop` / `dragend`. Survive across renders since the listeners attach to the parent, not children. Visual indicator: a 2 px accent-colored line above (drop-before) or below (drop-after) the hovered row.\n- **CSS** — `.initiative-list-handle`, `.initiative-list-row-dragging`, `.initiative-list-row-drop-before/-after::*` rules. Uses existing `--accent` variable.\n\n### Why this matters\nPre-176: reordering meant editing the `value` fields manually (1d20 + mod) so the auto-sort produced the right order. Tedious for \"I want this token to act before that one\" tactical adjustments mid-combat. Post-176: drag the row.\n\nUse cases:\n- **Held actions / readied actions**: drag the held character to the position they'll act in.\n- **Surprise rounds**: rearrange the order to put surprised tokens at the back.\n- **GM judgment calls**: \"the dragon went before the rogue this round\" — drag to swap.\n\n### Architecture\n- **Order-only reorder.** The `value` field is the d20 + mod that determined the sort. Drag-reorder doesn't touch values — moving a row is a deliberate \"ignore the math, use this order\" move. (If the GM wants the math back, they can roll again or edit values manually.)\n- **Validation in store.** The store handler de-dups input, drops unknown ids, requires count to match existing. Bails on mismatch (no partial reorder). Same-shape input is an early no-op (no notify, no undo step).\n- **Delegated listeners.** `listEl.innerHTML = ''` clears children every render, but listeners on `listEl` itself persist. The single set of listeners delegates via `closest('li.initiative-list-row')`.\n- **Insertion semantics.** Cursor above row's midline → insert before; below → insert after. Matches every standard reorder UI.\n\n### Tests\n- **+5 unit tests** in `src/state/store.test.ts`: replaces the order array preserving entries, drops unknown ids when count still matches, bails on missing entries, bails on duplicates, no-op on same-shape (no notify).\n- **All 1692 unit tests + 411 Playwright specs pass** locally (the flaky `scenes.spec.ts` test recovered on rerun — pre-existing).\n\n### Bundle\n- 119.16 / 120 KB initial-load brotli (+0.35 KB for the patch handler + drag listeners + CSS).\n- Lazy chunks unchanged. CSS 13.98 / 14 KB (+0.12 KB for the DnD handle + drop-indicator pseudo-element styles). Close to the cap; future phases adding CSS may need a small bump.\n\n### Pre-push checklist\n- typecheck: clean.\n- unit suite: 1692 passing.\n- e2e suite: 411 passing.\n- visual regression: all baselines green.\n- size-limit: all 5 budgets green.",
  },
  {
    version: '1.50.0',
    date: '2026-05-05',
    highlights: ['Toast stack with Undo'],
    body: "Phase 175 — fourteenth of the v1.37 → v1.55 batch. New `mountToastStack()` mounts a fixed bottom-right notification stack. Wired into the destructive operations (Delete selection, Clear drawings, Clear travel routes) so each fires a \"Deleted N tokens — Undo\" pill that reverts via `store.undo()` if clicked within 5 seconds.\n\n### Added\n- **`src/ui/toast-stack.ts`** (new, ~110 lines) — `mountToastStack()` returns `{ show, clear }`. Each `show({ message, actionLabel?, onAction?, durationMs? })` creates a styled pill with optional action button + dismiss `×`, auto-dismissing after `durationMs` (default 5 s; set 0 for sticky). Caps visible toasts at 5; oldest evicts FIFO so a burst can't fill the screen.\n- **CSS** — `.toast-stack`, `.toast`, `.toast-message`, `.toast-action`, `.toast-close`, `.toast-leaving` rules + a `toast-enter` keyframe for the slide-in / fade-in. Uses existing `--surface` / `--fg` / `--border` / `--accent` variables so it adapts to all 5 themes.\n- **Wired into 3 destructive operations**:\n  - `deleteSelection()` — toast with \"Undo\" → `store.undo()` reverts the batched delete in one step.\n  - \"Clear all drawings\" command palette / session-menu action — toast with \"Undo\".\n  - \"Clear all travel routes\" command palette action (Phase 158) — toast with \"Undo\".\n- **Mounted early in `gm.ts`** so any sub-module can use the `toasts` reference.\n\n### Why this matters\nPre-175: a misclicked Delete or Clear could only be undone via Ctrl+Z, which most users discover late. The screen-reader announcement (\"Deleted 3 tokens.\") was the only visual feedback. Post-175: a visible toast persists for 5 seconds with a one-click Undo button. Foundry / Roll20 ship the same affordance; this is the lightweight equivalent.\n\n### Architecture\n- **`store.undo()` is the action target.** Each destructive operation already runs as a single batched patch (one undo step). The toast's Undo button calls `store.undo()` — no need for the toast to remember what was deleted; the store's undo stack carries the pre-delete snapshot.\n- **No new patch types.** The toast is a UI-only affordance; reverting goes through the existing undo path.\n- **`pointer-events: none` on the container, `auto` on toasts.** The container layer doesn't block clicks on the canvas underneath; individual toasts capture clicks for their action / dismiss buttons.\n- **Stack cap with FIFO eviction.** Bursts (e.g. clearing 5+ different layers in quick succession) evict the oldest so the newest is always visible.\n\n### UX details\n- **5-second window.** Long enough for \"wait, I didn't mean that\" reaction; short enough not to clutter.\n- **Slide-in / slide-out animation.** ~200 ms on each end. Reduced-motion users still see the toasts (just without the animation if their browser respects `prefers-reduced-motion` on transitions — a future polish could explicitly gate the keyframe).\n- **× to dismiss** for users who want to clear toasts immediately.\n\n### Tests\n- **+10 unit tests** in `src/ui/toast-stack.test.ts` (new): mounts container, renders message, action button click + callback, action-button absent when not supplied, auto-dismiss after default duration, custom duration, sticky (durationMs 0), × dismiss, MAX_VISIBLE cap with FIFO eviction, clear() dismisses all.\n- **All 1687 unit tests + 411 Playwright specs pass** locally.\n\n### Bundle\n- 118.81 / 120 KB initial-load brotli (+0.50 KB for the toast helper + wiring).\n- Lazy chunks 26.21 / 28 KB unchanged. CSS 13.86 / 14 KB (+0.17 KB for toast styles).\n\n### Pre-push checklist\n- typecheck: clean.\n- unit suite: 1687 passing.\n- e2e suite: 411 passing.\n- visual regression: all baselines green (toasts only render on user action, not in default-state baselines).\n- size-limit: all 5 budgets green.",
  },
  {
    version: '1.49.0',
    date: '2026-05-05',
    highlights: ['Combat target reticle'],
    body: "Phase 174 — thirteenth of the v1.37 → v1.55 batch. Right-click a token → \"Set as target\" → a red corner-bracket reticle pulses on that token. Useful for \"the wizard targets the goblin\"-style telegraphing during combat. The target id is transient (not persisted) so a tab refresh clears it.\n\n### Added\n- **`TokenRenderOptions.targetTokenId?: ID | null`** field. When set + matching a real token, the renderer paints a corner-bracket reticle over that token's body circle.\n- **`drawTargetReticle` helper** in `src/render/layer-tokens.ts`. Four L-shaped corner brackets framing an imaginary bounding box around the token. Red (`#ff4d4d`), 2.5 px line, round caps. Pulses between 0.65 and 1.0 alpha at ~1 Hz when motion is allowed; static at full alpha for reduced-motion users.\n- **`getTargetTokenId` renderer hook** added to the `CreateRendererOptions` interface; pulled each frame from the GM-entry's `targetTokenRef` so the ref change applies on the next paint.\n- **`targetTokenRef` in `src/entries/gm.ts`**: `{ current: ID | null }`. Set / cleared via the right-click menu's contextual entry; auto-cleared when the targeted token is removed (`token-remove` patch) or the session is reset.\n- **Right-click menu entry** \"Set as target\" (default) / \"Clear target\" (when the right-clicked token is already the current target). One menu item that toggles, so the GM never needs to scroll a separate \"current target\" submenu.\n\n### Why this matters\nPre-174: the GM had no visual way to telegraph \"this token is being attacked.\" Players watching the screen scrolled to find which goblin the wizard meant. Post-174: a single right-click + menu pick frames the target with a clear reticle.\n\nUse cases:\n- **Telegraphing the active turn's attack target.** Reticle marks the goblin the cleric just declared as the spell-target.\n- **Multi-target ambiguity.** \"I shoot the closest one\" — GM marks the resolved target so everyone agrees on which token took damage.\n- **Streaming visual cue.** The pulse is subtle but visible at low resolutions / over screen-share.\n\n### Architecture\n- **Transient ref, not state.** The target id lives in a closure ref (`targetTokenRef`) outside `SessionState`. Doesn't sync to Spectators, doesn't persist across reloads. This is intentional — a target is a \"right-now\" combat affordance, not durable scene data. (A future polish could opt-in sync via a remote-play message if a group wants Spectators to see the reticle too.)\n- **Reuses the Phase 144 reduced-motion + `now` plumbing.** The reticle's pulse is computed from the same `performance.now()` value the active-turn ring uses; reduced-motion users get a static reticle without animation churn.\n- **Auto-clear on token-remove.** Subscribing to `token-remove` (and `session-reset`) prevents an orphan reticle floating over an empty cell. Cheap O(1) check inside the existing store-subscribe block.\n- **No new layer pass.** The reticle is drawn at the very end of `drawTokens` — after stack badges, after owner dots — so it always sits on top regardless of paint order. No re-architecture of the token paint pipeline.\n\n### UX details\n- **Pulse subtle, not distracting.** Alpha cycles 0.65 → 1.0 at 1 Hz. Reduced-motion users see static full opacity.\n- **One toggle, not two menu entries.** The menu reads \"Set as target\" or \"Clear target\" depending on current state, so the GM doesn't have to find a separate \"Clear target\" entry that's only valid sometimes.\n- **Esc cancels canvas selection.** The existing Esc handler doesn't touch the target ref — clearing target is intentionally a deliberate menu action, not a side effect of \"deselect everything.\"\n\n### Tests\n- **+2 Playwright specs** in `e2e/token-target.spec.ts` (new): right-click shows \"Set as target\", post-set the menu reads \"Clear target\".\n- The reticle render itself is purely additive on the canvas; visual regression baselines stay green (no token-target is set in default-state baselines).\n- **All 1677 unit tests + 411 Playwright specs pass** locally.\n\n### Bundle\n- 118.31 / 120 KB initial-load brotli (+0.04 KB for the reticle helper + ref + menu wire — most of it the menu's contextual label).\n- Lazy chunks 26.21 / 28 KB brotli — bumped from 26 → 28 KB for headroom. CSS unchanged.\n\n### Pre-push checklist\n- typecheck: clean.\n- unit suite: 1677 passing.\n- e2e suite: 411 passing.\n- visual regression: all baselines green.\n- size-limit: all 5 budgets green.",
  },
  {
    version: '1.48.0',
    date: '2026-05-05',
    highlights: ['What\'s-new modal: full release notes on click'],
    body: "Phase 173 — twelfth of the v1.37 → v1.55 batch. The what's-new modal now renders the full markdown body of the most-recent 4 release entries behind a `<details>` \"Read full notes\" expand toggle. Older entries keep just the one-line title. The entries module is dynamic-imported on first open so the markdown bodies don't bloat the main bundle.\n\n### Added\n- **`MAX_ENTRIES_WITH_BODY = 4`** in `scripts/extract-whats-new.mjs`. The most-recent 4 entries get their full markdown body captured (everything between the `## [vX.Y.Z]` header and the next `---` separator); older entries stay title-only.\n- **`WhatsNewEntry.body?: string`** on the type. Carries the captured markdown for entries that have one. Older entries (and entries without bodies in CHANGELOG) leave it `undefined`.\n- **`loadWhatsNewEntries()` async helper** in `src/state/whats-new.ts`. Replaces the static `WHATS_NEW_ENTRIES` re-export with a dynamic import wrapped in a cached promise. Keeps the modal's lazy-loading transparent to callers (single `await` on first open; subsequent calls hit the cache).\n- **`src/util/micro-markdown.ts`** (new, ~85 lines) — minimal markdown-to-HTML renderer supporting the small subset the CHANGELOG uses (`### h3`, `- bullets`, `**bold**`, `` `code` ``, `---` rules). Plain-text everything else with HTML-escaping for XSS safety. **+12 unit tests** in `src/util/micro-markdown.test.ts`: empty input, plain text, HTML-escape, bullets, list-close on non-bullet, headings, bold, code, code-wins-over-bold, hr, XSS-safe.\n- **Dynamic-imported micro-markdown** inside the modal's first-open path, parallel-fetched alongside the entries via `Promise.all` so the lazy chunks load together.\n- **`<details>` expand toggle per entry with body** — `summary: \"Read full notes\"`, click expands inline. CSS rules added for `.whats-new-version-details`, `.whats-new-version-body`, and the body's child elements (h3 / h4 / ul / p / code / hr).\n- **Loading skeleton** — \"Loading recent updates…\" placeholder shown until the lazy chunks arrive (typically <50 ms on second open due to caching).\n\n### Why this matters\nPre-173: the modal showed one-line highlights only. Users wanting \"what exactly changed in v1.45?\" had to leave the app and read GitHub's CHANGELOG.md. Post-173: same modal, expandable details right there.\n\nThe lazy-load architecture means the bundle size stays flat for users who never open the modal — the markdown bodies are paid for only when actually read. ~6 KB brotli savings on the main bundle vs. eagerly importing 4 release notes.\n\n### Architecture\n- **Bundle splitting via dynamic import.** Vite hoists `import('./whats-new-entries.generated.js')` into its own chunk. `loadWhatsNewEntries` caches the resulting Promise so concurrent opens share the fetch; Vite's runtime caches the parsed module, so subsequent `import()` calls are sync.\n- **Tokenize-then-transform inline parser.** The micro-markdown bold transformer would otherwise interpret `**foo**` inside `<code>...**foo**...</code>`. Inline-code spans are tokenized into placeholders first, then bold runs over the tokenless string, then placeholders are restored. ~15 lines for safety.\n- **HTML escape before transform.** All raw input goes through `escapeHtml` before the inline transforms run, so user-authored markdown can't smuggle scripts. The `<code>` and `<strong>` tags we emit are introduced AFTER escaping; they don't get re-escaped.\n- **Size-limit config update.** Added `whats-new-entries.generated-*.js` to the lazy-chunks pattern (excluded from initial-load) + bumped lazy-chunks budget from 21 → 26 KB to accommodate the new chunk plus future growth.\n\n### UX details\n- **4-entry body cap.** Most users care about \"what changed since I last opened the app\" — usually 1-3 versions. Capping at 4 keeps the modal load fast + the lazy chunk small (~6 KB brotli for 4 entries vs. ~12 KB for 8).\n- **Older entries link out implicitly.** They keep just the title; users wanting full history go to GitHub CHANGELOG.md (link added in a future polish phase).\n- **Loading placeholder visible briefly.** On a slow connection, the first open shows \"Loading recent updates…\" until the chunk arrives. Subsequent opens are instant (cached).\n\n### Tests\n- **+12 unit tests** in `src/util/micro-markdown.test.ts` (new): full coverage of the micro-markdown subset including XSS safety + the code-wins-over-bold edge case.\n- **Updated `src/state/whats-new.test.ts`** to use the async `loadWhatsNewEntries()` instead of the removed static `WHATS_NEW_ENTRIES` export. Both the original tests (current APP_VERSION first; well-formed shapes) preserved.\n- **All 1677 unit tests + 408 Playwright specs pass** locally.\n\n### Bundle\n- 118.27 / 120 KB initial-load brotli (down from pre-173's \"would be 123\" — the lazy split saved ~5 KB on initial).\n- Lazy chunks 25.48 / 26 KB brotli — bumped from 21 → 26 KB to fit the new entries chunk (~6.1 KB) + the existing modals/dice/help-overlay (~19.4 KB combined). The lazy budget was already filling up; this bump gives the next 7 phases comfortable headroom.\n- CSS 13.69 / 14 KB (+0.31 KB for `.whats-new-version-details` + body styles).\n\n### Pre-push checklist\n- typecheck: clean.\n- unit suite: 1677 passing.\n- e2e suite: 408 passing.\n- visual regression: all baselines green (the modal isn't in the default-state baseline).\n- size-limit: all 5 budgets green after the lazy-chunks bump.",
  },
  {
    version: '1.47.0',
    date: '2026-05-05',
    highlights: ['PWA install prompt + offline banner'],
  },
  {
    version: '1.46.0',
    date: '2026-05-05',
    highlights: ['Per-scene Notes panel open-state'],
  },
  {
    version: '1.45.0',
    date: '2026-05-05',
    highlights: ['D&D 5e cover wall presets'],
  },
  {
    version: '1.44.0',
    date: '2026-05-05',
    highlights: ['Per-scene background fill color'],
  },
  {
    version: '1.43.0',
    date: '2026-05-05',
    highlights: ['Right-click "Distance to…"'],
  },
  {
    version: '1.42.0',
    date: '2026-05-05',
    highlights: ['Fit-to-selection (`F`) + contextual fit'],
  },
  {
    version: '1.41.0',
    date: '2026-05-05',
    highlights: ['Smooth camera tween on bookmark jumps'],
  },
  {
    version: '1.40.0',
    date: '2026-05-05',
    highlights: ['Auto-pan camera to the active initiative token'],
  },
  {
    version: '1.39.0',
    date: '2026-05-05',
    highlights: ['Hover popover on the active initiative entry'],
  },
  {
    version: '1.38.0',
    date: '2026-05-05',
    highlights: ['Token thumbnail in initiative-bar pip'],
  },
  {
    version: '1.37.0',
    date: '2026-05-05',
    highlights: ['Per-token GM notes scratchpad'],
  },
  {
    version: '1.36.0',
    date: '2026-05-05',
    highlights: ['Auto-extracted "what\'s new" from CHANGELOG'],
  },
  {
    version: '1.35.0',
    date: '2026-05-05',
    highlights: ['Wall-clipping for auras'],
  },
  {
    version: '1.34.0',
    date: '2026-05-05',
    highlights: ['Aura presets'],
  },
  {
    version: '1.33.0',
    date: '2026-05-05',
    highlights: ['Travel route polylines'],
  },
  {
    version: '1.32.0',
    date: '2026-05-05',
    highlights: ['Per-scene GM notes'],
  },
  {
    version: '1.31.0',
    date: '2026-05-05',
    highlights: ['Token vehicle / parent-child relationships'],
  },
  {
    version: '1.30.0',
    date: '2026-05-05',
    highlights: ['Initiative auto-skip on dead tokens'],
  },
  {
    version: '1.29.0',
    date: '2026-05-05',
    highlights: ['Token lock (drag prevention)'],
  },
  {
    version: '1.28.0',
    date: '2026-05-04',
    highlights: ['Customizable tool-activation keybindings'],
  },
];

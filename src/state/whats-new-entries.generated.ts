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
    version: '1.53.0',
    date: '2026-05-06',
    highlights: ['D&D vision modes (visual indicators)'],
    body: "Phase 178 — seventeenth of the v1.37 → v1.55 batch. New optional `Token.visionModes?: VisionMode[]` field tracks D&D-style sight modes (darkvision / blindsight / tremorsense / truesight). The renderer paints a faint dashed disk per mode at its radius — visual reminder for the GM. Editor exposes a list-row UI similar to auras.\n\n### Added\n- **`VisionModeKind`** type union: `'darkvision' | 'blindsight' | 'tremorsense' | 'truesight'`. Covers the 4 SRD-named senses.\n- **`VisionMode { kind: VisionModeKind; radiusFt: number }`** type. Radius in feet (SRD vocab); editor converts to world pixels via the active `feetPerSquare`.\n- **`Token.visionModes?: VisionMode[]`** field. Optional + back-compat. Pre-178 tokens carry no field; the deserializer drops malformed entries (unknown kind, non-finite / non-positive radius) and returns `undefined` for non-array input.\n- **`normalizeVisionModes(raw)`** in `src/sync/messages.ts`. Defensive parser used by the deserialize path.\n- **Render layer** in `src/render/layer-tokens.ts` — `drawTokenVisionModes` paints a faint dashed disk per mode in a kind-specific color (darkvision=warm yellow, blindsight=red, tremorsense=orange, truesight=violet). GM-only render — Spectators don't see the GM's vision-range reminders.\n- **Token editor list-row UI** mirroring auras: kind dropdown + radius input + remove button + \"+ Add vision\" button. Default new entry: `darkvision 60 ft`.\n- **CSS** — `.vision-mode-row`, `.vision-mode-remove`, etc. styles added.\n\n### Why this matters\nPre-178: GMs running NPCs with SRD sight modes (the dragon has blindsight 30 ft, the drow has darkvision 120 ft, the elemental has tremorsense 60 ft) had no visual reminder of those reach circles. Post-178: each vision mode gets a faint dashed disk so the GM sees at a glance \"the goblin can detect the rogue from this distance via tremorsense.\"\n\nUse cases:\n- **Encounter prep**: the GM tags the demon with `truesight 120 ft` — visual reminder during play that this NPC sees through invisibility.\n- **Stealth checks**: faint blindsight disk tells the GM whether the rogue is in range.\n- **Tremorsense reminders**: see at a glance which tokens detect each other through walls.\n\n### Architecture\n- **Visual-only in v1.53.** The fog / LoS pipeline still keys off `Token.losRadius` for actual visibility math; vision modes don't currently influence what cells are revealed. Adding mechanical effect would require:\n  - `blindsight` ignores walls — skip the visibility-polygon clamp.\n  - `tremorsense` only reveals tokens (not terrain) within radius — different rule than fog.\n  - `truesight` reveals invisibility-flagged tokens — needs a new `Token.invisible` field.\n  \n  Each is a viable future polish; v1.53 ships the data + visual reminders.\n- **GM-only render gate.** The `drawTokenVisionModes` pass is wrapped in `options.mode === 'gm'`. Spectators don't see the GM's vision reminders — the disks would otherwise leak \"this NPC can see X far\" to players.\n- **Dashed stroke + alpha 0.55.** Faint enough not to compete with auras (Phase 139) for visual real estate; dashed pattern distinguishes from the solid aura outlines.\n- **Per-mode colors.** Each kind gets a distinct hue so a token with multiple modes (darkvision 120 + truesight 30) shows two distinct dashed rings rather than one ambiguous combined ring.\n\n### Tests\n- **+5 unit tests** in `src/sync/messages.test.ts`: pre-178 missing default, round-trip multi-mode, drop unknown kinds, drop non-finite/non-positive radii, non-array → undefined.\n- **All 1702 unit tests + 411 Playwright specs pass** locally.\n\n### Bundle\n- 120.39 / 122 KB initial-load brotli — bumped from 120 → 122 KB to fit the editor UI + render layer + helpers.\n- Lazy chunks 26.18 / 28 KB unchanged. CSS 14.06 / 15 KB — bumped from 14 → 15 KB to fit the `.vision-mode-*` styles + cumulative growth across the batch.\n\n### Pre-push checklist\n- typecheck: clean.\n- unit suite: 1702 passing.\n- e2e suite: 411 passing.\n- visual regression: all baselines green (vision modes only render when authored on a token; default-state baselines have none).\n- size-limit: all 5 budgets green after the JS + CSS bumps.",
  },
  {
    version: '1.52.0',
    date: '2026-05-06',
    highlights: ['Token tags for selection groups'],
    body: "Phase 177 — sixteenth of the v1.37 → v1.55 batch. Optional `Token.tags?: string[]` field, comma-separated input in the editor, and a \"Select by tag…\" command-palette action that selects every token sharing a tag in one click.\n\n### Added\n- **`Token.tags?: string[]`** field. Optional + back-compat. Pre-177 tokens carry no field; the deserializer normalizes input (lowercase + trim + dedupe + drop-empties + cap at 16).\n- **`normalizeTokenTags(raw)`** in `src/sync/messages.ts`. Defensive parser used by the deserialize path. Returns `undefined` for non-array / empty input; otherwise produces a sanitized array.\n- **Tags input** in the token editor — a single comma-separated text input. Commits on blur with the same normalization the deserializer uses; re-canonicalizes the visible value on commit so a malformed typed string (\"Goblin, GOBLIN, \") shows the cleaned form.\n- **\"Select by tag…\" command-palette action** (group: Tokens) in `src/entries/gm.ts`. `window.prompt` for the tag string; sets `selection.ids` to every token whose `tags` array includes the (lowercased) input. Announces the count via the live region.\n\n### Why this matters\nPre-177: multi-selecting \"every goblin\" required either a lasso (works only when the goblins are spatially clustered) or shift-clicking each individually. Post-177: tag every goblin with `goblin` once → `Ctrl+K` → \"Select by tag…\" → \"goblin\" → all 8 selected.\n\nUse cases:\n- **Mob selection.** Tag minions; select-all-minions for damage waves, mass moves.\n- **Encounter grouping.** Tag tokens by `encounter-1` / `encounter-2` so prep'd groups can be selected together when their wave triggers.\n- **Faction grouping.** `pcs`, `npcs`, `enemies` for global commands (\"hide all enemies from spectators\" via the Phase 109 visibility system).\n\n### Architecture\n- **Lowercased throughout.** Deserialize + editor commit both lowercase, so \"Goblin\" / \"goblin\" / \"GOBLIN\" are the same tag. Display in the editor shows the canonical lowercase form after commit.\n- **No state-side dedupe at apply time.** The editor's commit path normalizes BEFORE dispatching the patch, and the deserializer normalizes the wire shape. The store stays naive — same pattern as Phase 50's `conditions` array.\n- **Optional, not required.** Tokens without tags carry no field (`undefined`). Empty arrays collapse to undefined on commit so the in-memory shape stays clean for round-trips.\n- **`MAX_TAGS = 16` cap.** Prevents a malformed peer from blowing up the array. 16 is more than any realistic encounter needs; future polish could expose this as a Settings preference.\n\n### UX details\n- **Comma-separated, not chip UI.** Faster to author for keyboard users; visually consistent with how most form-style tag inputs work. A future polish could swap in a chip control with autocomplete from the existing tag set.\n- **`window.prompt` for the palette action.** Quick-and-cheap; future polish: a styled modal with autocomplete from the current scene's tag set.\n\n### Tests\n- **+5 unit tests** in `src/sync/messages.test.ts`: pre-177 missing default, round-trip normalized list, lowercase + dedup + drop-empties, cap at 16, non-array → undefined.\n- **All 1697 unit tests + 411 Playwright specs pass** locally.\n\n### Bundle\n- 119.64 / 120 KB initial-load brotli (+0.48 KB for the field + helper + editor input + palette action).\n- Lazy chunks 26.21 / 28 KB unchanged. CSS unchanged.\n\n### Pre-push checklist\n- typecheck: clean.\n- unit suite: 1697 passing.\n- e2e suite: 411 passing.\n- visual regression: all baselines green.\n- size-limit: all 5 budgets green.",
  },
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
  },
  {
    version: '1.48.0',
    date: '2026-05-05',
    highlights: ['What\'s-new modal: full release notes on click'],
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
];

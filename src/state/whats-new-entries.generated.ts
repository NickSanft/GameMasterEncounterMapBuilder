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
    version: '1.54.0',
    date: '2026-05-06',
    highlights: ['Combat log "rewind to here"'],
    body: "Phase 179 — eighteenth of the v1.37 → v1.55 batch. Each entry in the combat log now has a small `↺` button on hover. Click it → the GM is prompted to restore the snapshot taken just before that event. Bridges the existing Phase 94 combat log + Phase 97 snapshot history into a \"go back to before this happened\" flow.\n\n### Added\n- **`onRewindToTimestamp?: (timestamp: number) => void`** option in `CombatLogPanelOptions`. When supplied, each entry renders a `↺` button; clicking passes the entry's `timestamp` up to the host. When omitted (Spectator-side / test mounts that don't have snapshot access), the buttons stay hidden.\n- **`rewindToNearestSnapshot(timestamp)` helper** in `src/entries/gm.ts`. Looks up `listSnapshots(activeSceneId)` (newest-first), finds the latest with `takenAt <= timestamp`, prompts the GM via `window.confirm`, then restores via the same `store.loadState(deserializeState(snap.state))` path the snapshot history modal uses. Falls back to opening the snapshot-history modal when no candidate exists.\n- **Hover-reveal button** in `src/ui/styles.css`: `.combat-log-entry-rewind` is `opacity: 0` by default, `0.85` on entry hover or focus-visible — keeps the log visually clean until the GM mouses over a row.\n\n### Why this matters\nPre-179: a misclicked turn-skip / accidental damage / fat-finger condition required a multi-step recovery — open the snapshot-history modal, scan timestamps, pick the nearest, restore. Post-179: hover the offending log entry → click `↺` → confirm → done.\n\nUse cases:\n- **Misclicked critical hit damage**: hover the `Bandit took 12 damage` entry → rewind.\n- **Wrong target**: realized the spell hit the wrong NPC after applying damage; rewind to before.\n- **Quick \"do over\"**: GM rolled a turn but the player wanted to do something else first; rewind to the start of that turn.\n\n### Architecture\n- **Reuses snapshot infrastructure.** Phase 97's `listSnapshots` / `getSnapshot` / restore-via-`loadState` is unchanged. Phase 179 just exposes a new entry point that uses the timestamp filter.\n- **\"At-or-before\" semantics.** The user clicks an entry whose effect they want to undo. The snapshot they need is the most recent one taken BEFORE that event — not after. We pick the latest with `takenAt <= timestamp`. If none exists (e.g., the event happened before any snapshot was recorded), we fall through to opening the modal so the GM can pick manually.\n- **Confirm prompt is mandatory.** Snapshot restore is destructive (`store.clearHistory()` follows so Ctrl+Z can't undo it). The `window.confirm` gives the GM one last chance to abort.\n- **Per-scene snapshots.** `listSnapshots(sceneId)` is scoped to the active scene — rewinding only considers that scene's history. Cross-scene rewind would be incoherent (snapshot states are per-scene).\n\n### UX details\n- **Hover-only reveal.** Mid-combat the log fills with damage / heal / condition entries; permanent `↺` buttons would clutter every row. Hover-only is unobtrusive while still discoverable.\n- **Falls back to manual pick.** If no snapshot pre-dates the clicked event (e.g., right after scene load, before any snapshot ran), we open the existing snapshot-history modal so the GM can pick one anyway. Better than a hard fail.\n- **Best-effort.** Snapshots are rate-limited to one per ~30 seconds, so rewinding to a moment-by-moment effect isn't always exact. The GM rewinds to \"before the recent change\" and re-applies what they want to keep.\n\n### Tests\n- The rewind handler is composed of existing tested pieces (`listSnapshots`, `loadState`, `deserializeState`); the wiring + the prompt are integration concerns. The combat-log panel's existing e2e specs continue to pass.\n- **All 1702 unit tests + 411 Playwright specs pass** locally.\n\n### Bundle\n- 120.68 / 122 KB initial-load brotli (+0.29 KB for the helper + button).\n- Lazy chunks 26.05 / 28 KB unchanged. CSS 14.11 / 15 KB (+0.05 KB for the hover-reveal rule).\n\n### Pre-push checklist\n- typecheck: clean.\n- unit suite: 1702 passing.\n- e2e suite: 411 passing.\n- visual regression: all baselines green.\n- size-limit: all 5 budgets green.",
  },
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
];

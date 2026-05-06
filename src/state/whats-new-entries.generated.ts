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
    body: "Phase 172 — eleventh of the v1.37 → v1.55 batch. Adds two opt-in PWA polish surfaces: an install-as-app hint card (when the browser supports `beforeinstallprompt`) and an offline banner (when `navigator.onLine` flips to false).\n\n### Added\n- **`src/ui/pwa-install-hint.ts`** (new, ~150 lines) — `mountPwaInstallHint()` returns a handle that owns:\n  - **Install hint card** in the bottom-right corner. Listens for `beforeinstallprompt`, intercepts the auto-mini-bar (so we control timing), and shows a small dismissible card with `Install` / `Not now` buttons. `Install` triggers the cached event's `prompt()` to open the browser-native install flow. `Not now` writes a persistent `gm-encounter-maps-pwa-install-dismissed` flag so the card doesn't reappear.\n  - **Offline banner** centered at the bottom. Listens for `online` / `offline` window events; shows the banner when offline so the GM knows remote-play sync to Spectators is paused (changes still save locally; resume on reconnect). Also runs once at mount time so the banner shows immediately if the page boots offline.\n- **CSS** — `.pwa-install-hint`, `.pwa-install-hint-body`, `.pwa-install-hint-actions`, `.pwa-install-hint-accept`, `.pwa-install-hint-dismiss`, `.pwa-offline-banner` rules added to `src/ui/styles.css`. Uses existing CSS variables (`--surface`, `--fg`, `--border`, `--accent`) so it adapts to all 5 themes.\n- **Wired in `src/entries/gm.ts`** — `mountPwaInstallHint()` runs alongside the existing `registerPwa()` SW registration.\n\n### Why this matters\nPre-172: users installing the app had to dig into the browser's address-bar install button. Most don't know it exists. Post-172: when Chromium fires `beforeinstallprompt`, a small, dismissible card invites the user to install. Same flow Foundry / Owlbear Rodeo use.\n\nThe offline banner is similarly low-touch but high-value: a GM mid-session who briefly loses Wi-Fi gets immediate visual feedback that sync is paused, and reassurance that local saves continue. No more \"did my notes save?\" moments.\n\n### Architecture\n- **Cache the prompt event.** `beforeinstallprompt` fires once and is consumed once. Caching the event lets us surface the prompt at our chosen UX moment instead of the browser's automatic mini-bar.\n- **Persistent dismiss.** The `Not now` flag prevents repeated nags. (To re-prompt, the user can clear the localStorage key OR reinstall the browser, OR Chrome's heuristics may eventually re-fire `beforeinstallprompt` if usage patterns change.)\n- **Pure DOM, no framework.** The hint + banner are minimal `<div>`s appended to body. No React-equivalent overhead.\n- **Initial-state sync.** The offline banner runs `syncOnlineStatus()` at mount so a page that boots offline shows the banner immediately (otherwise the user has to toggle online/offline once to see it).\n\n### Tests\n- **+3 Playwright specs** in `e2e/pwa-install-hint.spec.ts` (new): banner element present + hidden by default, install card present + hidden until `beforeinstallprompt`, synthetic `offline` / `online` events toggle the banner.\n- The actual install flow (`prompt()` → user clicks Install in the OS dialog) requires a real browser + manifest registration; out of scope for headless e2e.\n- **All 1665 unit tests + 409 Playwright specs pass** locally.\n\n### Bundle\n- 117.95 / 120 KB initial-load brotli (~unchanged — the new module displaces some duplicate work).\n- Lazy chunks 20.39 / 21 KB unchanged. CSS 13.55 / 14 KB (+0.17 KB for hint + banner styles).\n\n### Pre-push checklist\n- typecheck: clean.\n- unit suite: 1665 passing.\n- e2e suite: 409 passing.\n- visual regression: all baselines green (the hint + banner only render on specific events, not in default-state baselines).\n- size-limit: all 5 budgets green.",
  },
  {
    version: '1.46.0',
    date: '2026-05-05',
    highlights: ['Per-scene Notes panel open-state'],
    body: "Phase 171 — tenth of the v1.37 → v1.55 batch. Phase 157 made the Notes panel CONTENT per-scene; Phase 171 makes its OPEN-STATE per-scene too. A user who keeps Notes open in scene A but closed in scene B sees that distinction preserved across switches.\n\n### Added\n- **`NOTES_OPEN_KEY_PREFIX = 'gm-encounter-maps-notes-open:'`** in `src/util/constants.ts`. Per-scene open state under `${NOTES_OPEN_KEY_PREFIX}${sceneId}`.\n- **`activeOpenKey()` + `readOpenState()` helpers** in `src/ui/notes-panel.ts`. Same fallback pattern as the per-scene text key from Phase 157: per-scene wins; legacy global `NOTES_OPEN_KEY` serves as the default for scenes the user hasn't opened/closed Notes in yet.\n- **`notifySceneSwitched` extension**: now also saves the OUTGOING scene's open state to its per-scene key before swapping, then loads the INCOMING scene's open state via `readOpenState()` + `setOpen({ persist: false })` (skip persist so we don't double-write the value we just read).\n- **Direct `panel.hidden` read in the outgoing-save path.** `setOpen` would persist under the NEW active key (wrong — we're saving the outgoing); we read the DOM element's hidden flag directly.\n\n### Why this matters\nPre-171: switch to scene B, Notes panel stays open even if you closed it in scene B last session. The mental model \"per-scene state stays with the scene\" was incomplete — content was per-scene (Phase 157) but the panel's visibility was global.\n\nPost-171: each scene \"remembers\" whether the GM had Notes open. Especially useful for:\n- **Combat-heavy scenes** where Notes are open to track per-NPC reminders.\n- **Theatre-of-the-mind scenes** where Notes are closed (no map clutter).\n- **Quick-reference scenes** (rules cheatsheet) where Notes always opens.\n\n### Architecture\n- **Open-state shape mirrors text-state shape.** Both are scene-keyed strings ('true' / 'false' for open, the textarea value for content). Both use the same `NOTES_*_KEY` (legacy) → `NOTES_*_KEY_PREFIX:sceneId` (per-scene) layout.\n- **`setOpen({ persist: false })` on incoming load.** Reads the new scene's saved open state and reflects it in the DOM without writing through (we just read it). Mirrors the textarea's pattern.\n- **Outgoing-save uses cached `lastSceneId`.** Same pattern as Phase 157 — the active-scene pointer has already flipped to the new scene by the time `notifySceneSwitched()` runs, so we cache the outgoing id internally.\n\n### UX details\n- **Migration is invisible.** First boot post-171: scene-A's Notes uses the legacy global state (whatever it was). On first close/open in scene-A, the per-scene record is created. Subsequent scene-A loads use the per-scene record.\n- **No new UI.** The behavior is implicit — the user just sees \"the panel I closed in scene B stays closed when I come back.\"\n\n### Tests\n- **+4 unit tests** in `src/ui/notes-panel.test.ts`: per-scene open key honored, legacy global fallback, distinct per scene survives notifySceneSwitched, outgoing scene's open state saved on switch.\n- **Updated `e2e/scene-notes.spec.ts`** to reflect the new behavior — switching to a fresh scene now closes Notes (the new scene has no per-scene \"open\" record); the test re-opens Notes after the switch and verifies the per-scene textarea content + open-state restore on switch-back.\n- **All 1665 unit tests + 406 Playwright specs pass** locally.\n\n### Bundle\n- 117.99 / 120 KB initial-load brotli (+0.14 KB for the new helpers + key).\n- Lazy chunks unchanged. CSS unchanged.\n\n### Pre-push checklist\n- typecheck: clean.\n- unit suite: 1665 passing.\n- e2e suite: 406 passing.\n- visual regression: all baselines green.\n- size-limit: all 5 budgets green.",
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
  {
    version: '1.27.0',
    date: '2026-05-04',
    highlights: ['"What\'s new" modal'],
  },
  {
    version: '1.26.0',
    date: '2026-05-04',
    highlights: ['Multi-aura UI in token editor'],
  },
];

/**
 * Phase 110 — persistent per-tab player id.
 *
 * Pre-110, every tab generated a fresh `nid()` for its `playerId` at
 * module init. That id was broadcast over the identity channel + used
 * as the key for per-Spectator features (Phase 82 permissions, Phase
 * 109 hidden tokens). A page reload (F5) created a NEW id, so the
 * GM's "this player is Jordan" associations evaporated:
 *
 *   - Phase 82 `canRoll = false` overrides reset to default.
 *   - Phase 109 hidden tokens became visible again.
 *
 * Phase 110 stabilises the id WITHIN a tab session. Strategy:
 *   - Store the id in `sessionStorage` (per-tab + per-origin).
 *   - On first load, mint a fresh id + persist.
 *   - On reload (F5, browser-restore), read the existing id back.
 *   - On tab close + reopen (Ctrl+W → reopen), sessionStorage is gone
 *     → new id. That's the right semantic: a brand-new tab is a
 *     brand-new participant from the GM's perspective.
 *
 * Why NOT localStorage: it would cross-share the id across multiple
 * tabs of the same role in the same browser. Two Spectator tabs
 * would both claim the same id → BroadcastChannel envelopes would
 * dedupe + both tabs would think the OTHER one's actions came from
 * themselves. sessionStorage's per-tab scope sidesteps that entirely.
 *
 * Pure module — no DOM, no IDB. Testable with the standard
 * sessionStorage mock that jsdom ships.
 */

import { nid } from '../util/id.js';
import type { ViewMode } from './types.js';

const KEY_PREFIX = 'gm-encounter-maps-player-id-';

function storageKeyFor(viewMode: ViewMode): string {
  return KEY_PREFIX + viewMode;
}

/**
 * Returns the tab's player id for `viewMode`, creating + persisting
 * one if absent. The id survives reloads of the same tab; a brand-
 * new tab (or a different browser) gets a brand-new id.
 *
 * On any sessionStorage failure (private mode, quota, etc.) we
 * fall back to an ephemeral id — the rest of the app keeps working,
 * the user just loses the per-reload stability.
 */
export function getOrCreatePlayerId(viewMode: ViewMode): string {
  const key = storageKeyFor(viewMode);
  try {
    const existing = sessionStorage.getItem(key);
    if (existing && existing.length > 0) return existing;
    const fresh = nid();
    sessionStorage.setItem(key, fresh);
    return fresh;
  } catch (err) {
    console.warn('[player-id] sessionStorage unavailable; using ephemeral id', err);
    return nid();
  }
}

/** Test-only: drop the persisted id so the next call re-mints. */
export function _resetPlayerId(viewMode: ViewMode): void {
  try {
    sessionStorage.removeItem(storageKeyFor(viewMode));
  } catch {
    /* ignored */
  }
}

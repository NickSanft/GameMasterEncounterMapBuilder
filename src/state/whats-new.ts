/**
 * Phase 152 — "what's new" badge + modal helpers.
 *
 * Compares `localStorage[WHATS_NEW_LAST_SEEN_KEY]` to the current
 * `APP_VERSION`. If the user hasn't seen the current version (or
 * any version older than the current — so a v1.10 user upgrading to
 * v1.27 sees the badge), the GM page shows a pulsing dot on the
 * help-overlay button + an opt-in modal listing recent versions.
 *
 * Version compare is semver-aware: "1.27.0" > "1.10.0" (numeric
 * compare per part), not lexicographic ("1.10.0" > "1.2.0" the
 * lexicographic way is wrong).
 */

import { APP_VERSION, WHATS_NEW_LAST_SEEN_KEY } from '../util/constants.js';

/**
 * Parse a "X.Y.Z" version string into [X, Y, Z] numbers. Returns
 * [0, 0, 0] for unparseable input (defensive — a malformed
 * localStorage value should fall through to "show the badge" rather
 * than crash).
 */
export function parseVersion(s: string): [number, number, number] {
  const m = s.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * Returns `true` if `current` is strictly newer than `lastSeen`.
 * Used to decide whether the badge should pulse on boot.
 */
export function isNewer(current: string, lastSeen: string): boolean {
  const [c0, c1, c2] = parseVersion(current);
  const [l0, l1, l2] = parseVersion(lastSeen);
  if (c0 !== l0) return c0 > l0;
  if (c1 !== l1) return c1 > l1;
  return c2 > l2;
}

/**
 * Read the user's last-seen version from localStorage. Returns
 * empty string if never set (so a fresh install treats every new
 * version as new — matches the post-onboarding "you should know
 * about features" pattern).
 */
export function getLastSeenVersion(): string {
  try {
    return localStorage.getItem(WHATS_NEW_LAST_SEEN_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Mark the current version as "seen" so the badge stops pulsing
 * (the next render cycle reads the updated value).
 */
export function markCurrentVersionSeen(): void {
  try {
    localStorage.setItem(WHATS_NEW_LAST_SEEN_KEY, APP_VERSION);
  } catch (err) {
    console.warn('[whats-new] persist failed', err);
  }
}

/**
 * Convenience predicate: should the badge be visible right now?
 * `true` when the current version is newer than the last seen,
 * `false` when they match (or last-seen is somehow newer — which
 * shouldn't happen in normal flow but is defensive against
 * downgrades).
 */
export function shouldShowWhatsNew(): boolean {
  const lastSeen = getLastSeenVersion();
  // Empty lastSeen → fresh install. By Phase 96's onboarding design,
  // first-launch users see the onboarding tour, not the what's-new
  // badge. We mirror that: empty last-seen treats this version as
  // "already seen" so the badge doesn't double up with the tour.
  if (lastSeen === '') return false;
  return isNewer(APP_VERSION, lastSeen);
}

/**
 * Static summary of recent updates the modal renders. Keep this
 * short — a few highlights per version, not the full CHANGELOG.
 * Newest first.
 */
export interface WhatsNewEntry {
  version: string;
  date: string;
  highlights: string[];
}

export const WHATS_NEW_ENTRIES: readonly WhatsNewEntry[] = [
  {
    version: '1.28.0',
    date: '2026-05-04',
    highlights: [
      'Customizable tool-activation keybindings — Settings → Keybindings tab.',
    ],
  },
  {
    version: '1.27.0',
    date: '2026-05-04',
    highlights: ['"What\'s new" modal — see this on each version bump.'],
  },
  {
    version: '1.26.0',
    date: '2026-05-04',
    highlights: ['Multi-aura UI in the token editor — Bless + Spirit Guardians on the same caster.'],
  },
  {
    version: '1.25.0',
    date: '2026-05-04',
    highlights: ['Tile-paint → block-wall coupling (opt-in in Settings).'],
  },
  {
    version: '1.24.0',
    date: '2026-05-04',
    highlights: ['Movement budget HUD — drag-distance flips red when a token exceeds its speed.'],
  },
  {
    version: '1.23.0',
    date: '2026-05-04',
    highlights: ['Recently-used tokens strip — last 6 templates, click to stamp.'],
  },
  {
    version: '1.22.0',
    date: '2026-05-04',
    highlights: ['Initiative-bar pip — colored swatch matching the active token.'],
  },
  {
    version: '1.21.0',
    date: '2026-05-04',
    highlights: ['Player ping attribution — pings now show "Alice pointed there".'],
  },
  {
    version: '1.20.0',
    date: '2026-05-04',
    highlights: ['Scene-switch loading overlay — no more gray-flash on slow IDB hits.'],
  },
  {
    version: '1.19.0',
    date: '2026-05-04',
    highlights: ['Active-turn ring pulses gently to draw the eye.'],
  },
  {
    version: '1.18.0',
    date: '2026-05-04',
    highlights: ['Z-order fix — dragged token now paints fully on top.'],
  },
  {
    version: '1.17.0',
    date: '2026-05-04',
    highlights: ['Tile-based dungeon paint mode (Paint tool, P shortcut).'],
  },
  {
    version: '1.16.0',
    date: '2026-05-04',
    highlights: ['Universal VTT (.dd2vtt / .uvtt) import — single-file Dungeondraft / Foundry import.'],
  },
];

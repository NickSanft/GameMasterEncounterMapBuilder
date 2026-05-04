/**
 * Phase 148 — recently-used token templates.
 *
 * Every fresh drop / Alt+stamp / library-drop / paste / duplicate is
 * recorded here; the GM-side strip UI (`src/ui/recent-tokens-strip.ts`)
 * shows the most recent 6 templates so the GM can re-stamp without
 * a keyboard shortcut. Distinct from the explicit Phase ? token
 * catalog (which the GM populates manually via "Save as token");
 * recent-tokens is the implicit per-tab record of what the GM has
 * actually used recently.
 *
 * Storage: localStorage under `gm-encounter-maps-recent-tokens`.
 * Same versioned-envelope pattern Phase 117 wall-presets / Phase 75
 * scene-recents use. Defensive parsing: a malformed entry drops out
 * silently rather than failing the whole load.
 *
 * Dedup key: `templateOf(token)` — a string that uniquely identifies
 * the "template" portion of a token (label + color + imageId + size
 * + borderColor). Re-dropping the same template moves it to the
 * front (most-recent-used) instead of stacking duplicates.
 */

import type { Token } from './types.js';

const KEY = 'gm-encounter-maps-recent-tokens';
const VERSION = 1;
export const MAX_RECENT_TOKENS = 6;

/** The fields preserved when stamping a recent token onto the canvas. */
export interface RecentTokenEntry {
  /** Stable dedupe key. Derived from template fields. */
  templateId: string;
  label: string;
  color: string;
  imageId: string | null;
  size: number;
  borderColor: string | null;
  /** `Date.now()` at the most recent use. */
  lastUsedAt: number;
}

/**
 * Compute the dedupe key for a token. Two tokens with the same
 * label + color + imageId + size + borderColor are considered the
 * "same" template and collapse to one strip slot.
 */
export function templateOf(
  token: Pick<Token, 'label' | 'color' | 'imageId' | 'size' | 'borderColor'>,
): string {
  // `|` is not a legal char in any of these fields' display values,
  // so a raw join is safe (no escape needed for the dedupe to work).
  return [
    token.label,
    token.color,
    token.imageId ?? '',
    String(token.size),
    token.borderColor ?? '',
  ].join('|');
}

interface Envelope {
  version: number;
  entries: RecentTokenEntry[];
}

function isEntry(v: unknown): v is RecentTokenEntry {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.templateId === 'string' &&
    e.templateId.length > 0 &&
    typeof e.label === 'string' &&
    typeof e.color === 'string' &&
    (e.imageId === null || typeof e.imageId === 'string') &&
    typeof e.size === 'number' &&
    Number.isFinite(e.size) &&
    (e.borderColor === null || typeof e.borderColor === 'string') &&
    typeof e.lastUsedAt === 'number' &&
    Number.isFinite(e.lastUsedAt)
  );
}

const listeners = new Set<() => void>();

function read(): RecentTokenEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<Envelope>;
    if (!parsed || parsed.version !== VERSION || !Array.isArray(parsed.entries)) {
      return [];
    }
    return parsed.entries.filter(isEntry);
  } catch {
    return [];
  }
}

function persist(entries: RecentTokenEntry[]): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: VERSION, entries } satisfies Envelope),
    );
  } catch (err) {
    console.warn('[recent-tokens] persist failed', err);
  }
  for (const l of listeners) l();
}

/**
 * Record a token as just-used. Moves an existing matching entry to
 * the front (most-recent-used) or inserts a new one. Trimmed to
 * `MAX_RECENT_TOKENS` so a long-running session doesn't grow the
 * blob unboundedly.
 */
export function recordTokenUse(
  token: Pick<Token, 'label' | 'color' | 'imageId' | 'size' | 'borderColor'>,
  now: number = Date.now(),
): void {
  const id = templateOf(token);
  const existing = read();
  const filtered = existing.filter((e) => e.templateId !== id);
  const next: RecentTokenEntry = {
    templateId: id,
    label: token.label,
    color: token.color,
    imageId: token.imageId,
    size: token.size,
    borderColor: token.borderColor,
    lastUsedAt: now,
  };
  const out = [next, ...filtered];
  if (out.length > MAX_RECENT_TOKENS) out.length = MAX_RECENT_TOKENS;
  persist(out);
}

/**
 * Return the most-recently-used templates, newest first. Capped at
 * `MAX_RECENT_TOKENS` (the persist already enforces this; the cap
 * here is a defensive belt + suspenders for malformed storage).
 */
export function listRecentTokens(): RecentTokenEntry[] {
  const all = read();
  all.sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  if (all.length > MAX_RECENT_TOKENS) all.length = MAX_RECENT_TOKENS;
  return all;
}

/**
 * Remove the entry with the given template id (right-click → evict).
 * Silent no-op for unknown ids.
 */
export function removeRecentToken(templateId: string): void {
  const existing = read();
  const filtered = existing.filter((e) => e.templateId !== templateId);
  if (filtered.length === existing.length) return;
  persist(filtered);
}

/**
 * Subscribe to changes. Listeners are notified after every persist.
 * Returns an unsubscribe fn.
 */
export function subscribeRecentTokens(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only: drop everything. */
export function _resetRecentTokens(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignored */
  }
  for (const l of listeners) l();
}

/**
 * Phase 93 — per-turn countdown timer.
 *
 * The state model is intentionally tiny: at any point we know
 *   - which initiative entry is "active" (key derived from
 *     `state.initiative.activeId` + round, so a re-entry of the same
 *     id in a different round resets the clock)
 *   - when that turn started (ms timestamp from a clock the caller owns)
 *   - the configured duration (from `preferences.turnTimerSeconds`)
 *
 * Pure functions over those inputs:
 *   - `computeTimerView(...)` returns `{ remainingMs, totalMs, urgency }`
 *     that the bar renders directly.
 *   - `formatTimer(ms)` returns the `0:30` / `:08` display string.
 *   - `urgencyFor(remainingMs, totalMs)` returns `'normal' | 'warn' | 'urgent' | 'expired'`.
 *
 * The bar maintains the "started-at" state via a tiny stateful helper
 * (`createTurnTimerState`) that only ever stores two fields. Reset is
 * driven by the active-key changing.
 */

export type TurnTimerUrgency = 'normal' | 'warn' | 'urgent' | 'expired';

export interface TurnTimerView {
  /** Milliseconds remaining (clamped >= 0). */
  remainingMs: number;
  /** Configured duration in ms (the starting countdown value). */
  totalMs: number;
  urgency: TurnTimerUrgency;
}

export const TURN_TIMER_WARN_MS = 30_000;
export const TURN_TIMER_URGENT_MS = 10_000;

/**
 * Build the active "key" used to detect turn changes. Includes round
 * so the same token getting their second turn (e.g. legendary action)
 * still triggers a reset. Returns `null` when initiative isn't running.
 */
export function activeTurnKey(
  activeId: string | null,
  round: number,
): string | null {
  if (!activeId || round <= 0) return null;
  return `${round}:${activeId}`;
}

export function urgencyFor(
  remainingMs: number,
  totalMs: number,
): TurnTimerUrgency {
  if (totalMs <= 0) return 'normal';
  if (remainingMs <= 0) return 'expired';
  if (remainingMs <= TURN_TIMER_URGENT_MS) return 'urgent';
  if (remainingMs <= TURN_TIMER_WARN_MS) return 'warn';
  return 'normal';
}

/**
 * Format milliseconds as `M:SS` (or `:SS` when no minutes). Negative /
 * NaN clamps to `0:00`. The leading `:` for sub-minute is intentional
 * — gives the timer a consistent column-width so the bar doesn't shift
 * sideways when the value crosses 60s.
 */
export function formatTimer(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, '0');
  return minutes > 0 ? `${minutes}:${ss}` : `:${ss}`;
}

/**
 * Compute the renderable view given the current clock + the turn's
 * start time + the configured duration. Returns `null` when the timer
 * is disabled or there's no active turn.
 */
export function computeTimerView(opts: {
  now: number;
  startedAt: number | null;
  durationSeconds: number;
}): TurnTimerView | null {
  const { now, startedAt, durationSeconds } = opts;
  if (durationSeconds <= 0 || startedAt === null) return null;
  const totalMs = durationSeconds * 1000;
  const elapsed = Math.max(0, now - startedAt);
  const remainingMs = Math.max(0, totalMs - elapsed);
  return {
    remainingMs,
    totalMs,
    urgency: urgencyFor(remainingMs, totalMs),
  };
}

export interface TurnTimerStateOptions {
  now?(): number;
}

export interface TurnTimerState {
  /**
   * Synchronize against the latest active-turn key. Resets `startedAt`
   * to `now()` when the key changed; clears it when the key is null.
   * Returns `true` if anything changed.
   */
  syncActive(activeKey: string | null): boolean;
  /** Current `startedAt` ms (or `null` when no turn is running). */
  startedAt(): number | null;
  /** The active key currently being timed. */
  activeKey(): string | null;
}

/**
 * Build a tiny stateful helper that the initiative bar uses to track
 * "when did the current turn start". Pure clock seam (`now`) for tests.
 */
export function createTurnTimerState(
  opts: TurnTimerStateOptions = {},
): TurnTimerState {
  const now = opts.now ?? (() => Date.now());
  let lastKey: string | null = null;
  let startedAt: number | null = null;

  return {
    syncActive(activeKey) {
      if (activeKey === lastKey) return false;
      lastKey = activeKey;
      startedAt = activeKey === null ? null : now();
      return true;
    },
    startedAt: () => startedAt,
    activeKey: () => lastKey,
  };
}

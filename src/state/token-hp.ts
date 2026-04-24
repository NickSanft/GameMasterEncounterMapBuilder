import type { TokenHp } from './types.js';

/**
 * Clamp an HP object so `current` is in `[0, max]` and `max` is non-negative.
 * Returns a *new* object; never mutates.
 */
export function normalizeHp(hp: TokenHp): TokenHp {
  const max = Math.max(0, Math.floor(hp.max));
  const current = Math.max(0, Math.min(max, Math.floor(hp.current)));
  return { current, max, visibility: hp.visibility };
}

/**
 * Apply `amount` damage. Clamps to 0. Passing a negative amount is treated
 * as healing (so `applyDamage(hp, -3)` === `applyHealing(hp, 3)`), matching
 * the convention of the in-game "damage/heal" input field which accepts
 * negative numbers.
 */
export function applyDamage(hp: TokenHp, amount: number): TokenHp {
  if (!Number.isFinite(amount)) return normalizeHp(hp);
  const delta = Math.floor(amount);
  return normalizeHp({ ...hp, current: hp.current - delta });
}

/** Apply `amount` healing. Clamps to `max`. Negative = damage. */
export function applyHealing(hp: TokenHp, amount: number): TokenHp {
  return applyDamage(hp, -amount);
}

/**
 * Set `current` directly. Clamps to `[0, max]`.
 */
export function setHpCurrent(hp: TokenHp, current: number): TokenHp {
  return normalizeHp({ ...hp, current: Math.floor(current) });
}

/**
 * Resize `max`. If `current` would exceed the new max, it's clamped down.
 * Widening `max` leaves `current` alone (no free healing).
 */
export function setHpMax(hp: TokenHp, max: number): TokenHp {
  return normalizeHp({ ...hp, max: Math.floor(max) });
}

/**
 * Return a color for the HP bar given a 0..1 fraction. Transitions from
 * green (full) → yellow (~40%) → red (low/zero).
 */
export function hpBarColor(fraction: number): string {
  const f = Math.max(0, Math.min(1, fraction));
  if (f > 0.6) return '#4caf50';
  if (f > 0.3) return '#f1c40f';
  if (f > 0) return '#e67e22';
  return '#c0392b';
}

/** Convenience: fraction of max HP remaining, in `[0, 1]`. */
export function hpFraction(hp: TokenHp): number {
  if (hp.max <= 0) return 0;
  return Math.max(0, Math.min(1, hp.current / hp.max));
}

/** Bloodied = ≤ 50% HP remaining (a common TTRPG convention). */
export function isBloodied(hp: TokenHp): boolean {
  return hp.max > 0 && hp.current / hp.max <= 0.5;
}

/** Dropped: current HP is 0 (but `max` still intact). */
export function isDown(hp: TokenHp): boolean {
  return hp.current <= 0;
}

/**
 * Phase 72 — D&D 5e death-save tracker helpers. The save state is
 * a `{successes, failures}` pair, both clamped to `[0, 3]`.
 *
 * Stable: 3 successes (the creature stops rolling, still at 0 HP).
 * Dead:   3 failures.
 *
 * The store applies these automatically:
 *   - When HP transitions from 0 → positive (healing wakes you up),
 *     reset to {0, 0}.
 *   - When damage is applied to a 0-HP token, +1 failure.
 *
 * GMs can also click the tracker dots in the Token Editor to set
 * the count by hand (a player makes their own roll + announces it).
 */
export interface DeathSaves {
  successes: number;
  failures: number;
}

export const DEFAULT_DEATH_SAVES: DeathSaves = { successes: 0, failures: 0 };

export function clampDeathSaves(saves: DeathSaves): DeathSaves {
  const successes = Math.max(0, Math.min(3, Math.floor(saves.successes)));
  const failures = Math.max(0, Math.min(3, Math.floor(saves.failures)));
  return { successes, failures };
}

/** True if the tracker has reached "stable" (3 successes). */
export function isStable(saves: DeathSaves): boolean {
  return saves.successes >= 3;
}

/** True if the tracker has reached "dead" (3 failures). */
export function isDead(saves: DeathSaves): boolean {
  return saves.failures >= 3;
}

/** Internal: clamp `n` to a non-negative integer; non-finite → 0. */
function safePositiveInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

/**
 * Add `n` failures (default 1). Clamped to 3. Used by the store
 * when damage is applied to a 0-HP token. Returns a new object;
 * never mutates.
 */
export function addDeathSaveFailures(
  saves: DeathSaves,
  n = 1,
): DeathSaves {
  return clampDeathSaves({
    successes: saves.successes,
    failures: saves.failures + safePositiveInt(n),
  });
}

/** Add successes (default 1). Used when a player rolls 10+ on a save. */
export function addDeathSaveSuccesses(
  saves: DeathSaves,
  n = 1,
): DeathSaves {
  return clampDeathSaves({
    successes: saves.successes + safePositiveInt(n),
    failures: saves.failures,
  });
}

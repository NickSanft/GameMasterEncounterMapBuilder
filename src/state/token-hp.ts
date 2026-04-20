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

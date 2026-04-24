/**
 * Phase 71 — D&D 5e concentration check helpers.
 *
 * Concentration is a long-running spell condition: the caster picks a
 * concentration spell (Hold Person, Bless, Hex, etc.), and any time
 * they TAKE DAMAGE while the spell is active they must succeed on a
 * Constitution saving throw or the spell ends. We model it as the
 * existing `concentrating` condition (already in CONDITION_PRESETS)
 * + a follow-up prompt in the damage-heal dialog.
 *
 * SRD wording:
 *   "Whenever you take damage while you are concentrating on a
 *    spell, you must make a Constitution saving throw to maintain
 *    your concentration. The DC equals 10 or half the damage you
 *    take, whichever number is higher."
 *
 * The "per source of damage" part of the rule maps cleanly onto our
 * damage dialog: each "Apply" = one damage source, so we emit one
 * prompt per concentrating token that took damage in this batch.
 */

import type { Token } from './types.js';
import { hasCondition } from './conditions.js';

/**
 * Canonical id for the concentrating condition. Matches the
 * `CONDITION_PRESETS` entry — kept here as a constant so the
 * damage / dialog code doesn't sprinkle the magic string around.
 */
export const CONCENTRATING_CONDITION_ID = 'concentrating';

/**
 * Compute the Constitution save DC for a given amount of damage
 * taken from a single source. Per the SRD: `max(10, floor(dmg/2))`.
 *
 * Returns 0 for non-positive / non-finite damage so callers can
 * use `dc > 0` as a "is a check actually needed?" predicate without
 * a separate guard.
 */
export function concentrationDc(damageTaken: number): number {
  if (!Number.isFinite(damageTaken) || damageTaken <= 0) return 0;
  return Math.max(10, Math.floor(damageTaken / 2));
}

export interface ConcentrationCheck {
  tokenId: string;
  /** Display label at the time of the check (token may be renamed later). */
  label: string;
  /** Damage taken from this source (always positive). */
  damage: number;
  /** Constitution save DC the caster needs to beat. */
  dc: number;
}

/**
 * Given the tokens in the scene + a per-token damage map (from the
 * damage / heal dialog's "Apply" pass), return the concentration
 * checks that need prompting. Skips:
 *   - tokens not flagged with the concentrating condition,
 *   - tokens that took 0 damage (or were healed — negative input),
 *   - unknown ids in the damage map.
 */
export function concentrationChecksForDamage(
  tokens: readonly Token[],
  damagePerToken: ReadonlyMap<string, number>,
): ConcentrationCheck[] {
  const out: ConcentrationCheck[] = [];
  for (const t of tokens) {
    if (!hasCondition(t.conditions, CONCENTRATING_CONDITION_ID)) continue;
    const dmg = damagePerToken.get(t.id) ?? 0;
    if (dmg <= 0) continue;
    out.push({
      tokenId: t.id,
      label: t.label || 'Token',
      damage: dmg,
      dc: concentrationDc(dmg),
    });
  }
  return out;
}

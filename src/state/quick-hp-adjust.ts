/**
 * Phase 92 — quick-HP adjustment helpers.
 *
 * Pre-92 the GM had to open the Damage / Heal dialog (R-click → Edit
 * → Damage/Heal) for every HP change, even +/- 1 from a flank or a
 * single attack. The full dialog is great for batched multi-token
 * combat ("a fireball does 28 to 4 of you") but feels heavy for the
 * "just took 3 from a Bite" cases that happen turn after turn.
 *
 * Phase 92 adds a fast keyboard path: with HP-bearing tokens selected,
 * `+` adds 1 HP, `-` subtracts. `Shift +` / `Shift -` does ±5. This
 * module is the per-token apply logic shared between the keyboard
 * shortcut and any future wheel / right-click-drag entry point.
 *
 * Conventions:
 *   - `delta > 0` = HEAL by `delta`
 *   - `delta < 0` = DAMAGE by `|delta|`
 *
 * (Inverse of the wire-format `damage-fx.amount`, which uses positive
 * for damage to match the pre-92 dialog convention. The keyboard
 * shortcut feels more natural with `+` = good = heal.)
 *
 * Death-save automation mirrors the dialog (Phase 72):
 *   - HP transitions from 0 → positive: reset deathSaves to {0, 0}.
 *   - Damage applied to a 0-HP token (still 0 after): +1 failure.
 *   - Healing or no-op never adds failures.
 *
 * Returns one `QuickHpResult` per affected token so the caller can
 * fire damage-fx events + announce.
 */

import type { ID, Token } from './types.js';
import {
  applyDamage,
  addDeathSaveFailures,
  DEFAULT_DEATH_SAVES,
} from './token-hp.js';

export interface QuickHpResult {
  token: Token;
  /** New HP — already clamped via `applyDamage` / `normalizeHp`. */
  nextHpCurrent: number;
  /** `nextHp.current - oldHp.current`. Positive = healed, negative = damage. */
  delta: number;
  /** True iff death-save state changed (woke up or +1 failure). */
  deathSavesChanged: boolean;
}

export interface QuickHpPatch {
  id: ID;
  changes: Partial<Token>;
}

/**
 * Compute the per-token patch + result for a quick HP adjust. Returns
 * empty array if `tokens` is empty or `delta` is 0 (the caller should
 * skip the batch + the announcement).
 *
 * Pure — does NOT mutate the store. The caller wraps these in
 * `store.batch()` and applies each patch.
 */
export function planQuickHpAdjust(
  tokens: readonly Token[],
  delta: number,
): { patches: QuickHpPatch[]; results: QuickHpResult[] } {
  if (tokens.length === 0 || delta === 0 || !Number.isFinite(delta)) {
    return { patches: [], results: [] };
  }
  const patches: QuickHpPatch[] = [];
  const results: QuickHpResult[] = [];
  // applyDamage uses the convention "positive amount = damage". We
  // pass `-delta` so a positive `delta` (heal) becomes negative damage.
  const damageAmount = -delta;

  for (const t of tokens) {
    if (!t.hp) continue;
    const nextHp = applyDamage(t.hp, damageAmount);
    const actualDelta = nextHp.current - t.hp.current;
    if (actualDelta === 0) continue; // already at floor / ceiling

    const changes: Partial<Token> = { hp: nextHp };
    let deathSavesChanged = false;

    if (t.hp.current === 0 && nextHp.current > 0) {
      // Wake up — reset the tracker.
      changes.deathSaves = { ...DEFAULT_DEATH_SAVES };
      deathSavesChanged = true;
    } else if (
      t.hp.current === 0 &&
      nextHp.current === 0 &&
      damageAmount > 0
    ) {
      // Damage on a downed token → +1 failure.
      changes.deathSaves = addDeathSaveFailures(t.deathSaves, 1);
      deathSavesChanged = true;
    }

    patches.push({ id: t.id, changes });
    results.push({
      token: t,
      nextHpCurrent: nextHp.current,
      delta: actualDelta,
      deathSavesChanged,
    });
  }

  return { patches, results };
}

/**
 * Build a screen-reader-friendly summary of a quick-HP adjustment.
 *
 * Single token: "Goblin: 4 of 7 HP (-3)"
 * Multi-token:  "Healed 5 HP across 3 tokens" / "Dealt 2 damage to 4 tokens"
 *
 * Returns `null` for an empty results array (nothing happened).
 */
export function summarizeQuickHpResults(
  results: readonly QuickHpResult[],
): string | null {
  if (results.length === 0) return null;
  if (results.length === 1) {
    const r = results[0]!;
    const name = r.token.label?.trim() || 'Token';
    const max = r.token.hp?.max ?? 0;
    const sign = r.delta > 0 ? '+' : '';
    const tail = r.deathSavesChanged ? r.delta > 0 ? ', stable' : ', death save failed' : '';
    return `${name}: ${r.nextHpCurrent} of ${max} HP (${sign}${r.delta})${tail}`;
  }
  // Multi-token. Aggregate.
  const totalHeal = results.reduce((acc, r) => acc + (r.delta > 0 ? r.delta : 0), 0);
  const totalDamage = results.reduce((acc, r) => acc + (r.delta < 0 ? -r.delta : 0), 0);
  if (totalHeal > 0 && totalDamage === 0) {
    return `Healed ${totalHeal} HP across ${results.length} tokens.`;
  }
  if (totalDamage > 0 && totalHeal === 0) {
    return `Dealt ${totalDamage} damage to ${results.length} tokens.`;
  }
  // Mixed (shouldn't happen for a single-delta adjust but defensive).
  return `${results.length} tokens updated.`;
}

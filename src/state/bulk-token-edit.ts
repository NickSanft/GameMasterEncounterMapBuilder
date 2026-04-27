/**
 * Phase 123 — bulk token edit helpers.
 *
 * Pure helpers that compute the token-update patches for the bulk
 * actions exposed in the Phase 123 modal. Each function takes the
 * full token list + a Set of selected ids + the action parameters,
 * and returns the list of `{tokenId, changes}` operations the host
 * should apply to the store.
 *
 * Why pure helpers instead of folding the logic into the store?
 *   - Easy to unit-test against fixtures (no DOM, no IDB).
 *   - Bulk semantics (skip token if already at target / clamp HP /
 *     dedupe conditions) live in one auditable place.
 *   - Host wraps the patches in a `store.batch(() => ...)` so the
 *     whole bulk action is one undo step, not N.
 *
 * The action enumeration is deliberately small: setHpMax,
 * addCondition, removeCondition. Other obvious bulk actions
 * (set border color, set size, set color) can come later — the
 * modal exposes the same shape for them, but keeping v123 to
 * three actions cuts the test surface to something maintainable.
 */

import type { Token } from './types.js';
import { addCondition, removeCondition } from './conditions.js';

export interface TokenUpdateOp {
  tokenId: string;
  changes: Partial<Token>;
}

/**
 * Set the `max` HP for every selected token that already tracks HP.
 * Tokens with `hp: null` are SKIPPED (you can't set max on a token
 * that has no HP block — call setHpMaxAndCurrent if you want to
 * also create the HP block).
 *
 * `current` is clamped down so it never exceeds the new max — a
 * token at 8/10 HP whose new max is 6 ends up at 6/6.
 */
export function bulkSetHpMax(
  tokens: readonly Token[],
  selectedIds: ReadonlySet<string>,
  newMax: number,
): TokenUpdateOp[] {
  if (!Number.isFinite(newMax) || newMax < 0) return [];
  const safeMax = Math.max(0, Math.floor(newMax));
  const ops: TokenUpdateOp[] = [];
  for (const t of tokens) {
    if (!selectedIds.has(t.id)) continue;
    if (!t.hp) continue;
    if (t.hp.max === safeMax && t.hp.current <= safeMax) continue;
    ops.push({
      tokenId: t.id,
      changes: {
        hp: {
          ...t.hp,
          max: safeMax,
          current: Math.min(t.hp.current, safeMax),
        },
      },
    });
  }
  return ops;
}

/**
 * Add a condition to every selected token. Tokens that already have
 * the condition are skipped (no-op patch). Custom condition ids are
 * allowed (matches `addCondition`'s permissive contract).
 */
export function bulkAddCondition(
  tokens: readonly Token[],
  selectedIds: ReadonlySet<string>,
  conditionId: string,
): TokenUpdateOp[] {
  if (!conditionId) return [];
  const ops: TokenUpdateOp[] = [];
  for (const t of tokens) {
    if (!selectedIds.has(t.id)) continue;
    if (t.conditions.includes(conditionId)) continue;
    ops.push({
      tokenId: t.id,
      changes: { conditions: addCondition(t.conditions, conditionId) },
    });
  }
  return ops;
}

/**
 * Remove a condition from every selected token. Tokens that don't
 * have the condition are skipped (no-op patch). Also strips the
 * condition's expiration timer (Phase 70) so a re-added condition
 * doesn't pick up a stale countdown.
 */
export function bulkRemoveCondition(
  tokens: readonly Token[],
  selectedIds: ReadonlySet<string>,
  conditionId: string,
): TokenUpdateOp[] {
  if (!conditionId) return [];
  const ops: TokenUpdateOp[] = [];
  for (const t of tokens) {
    if (!selectedIds.has(t.id)) continue;
    if (!t.conditions.includes(conditionId)) continue;
    const nextConditions = removeCondition(t.conditions, conditionId);
    const changes: Partial<Token> = { conditions: nextConditions };
    if (t.conditionExpirations[conditionId] !== undefined) {
      const nextExpirations = { ...t.conditionExpirations };
      delete nextExpirations[conditionId];
      changes.conditionExpirations = nextExpirations;
    }
    ops.push({ tokenId: t.id, changes });
  }
  return ops;
}

/**
 * Count how many selected tokens would be ACTUALLY affected by the
 * given action. Useful for the modal's "Apply to N tokens" button
 * label so the user knows up-front whether their action is a no-op.
 */
export function countAffected(ops: readonly TokenUpdateOp[]): number {
  return ops.length;
}

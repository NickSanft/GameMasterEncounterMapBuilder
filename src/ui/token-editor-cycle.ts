import type { ID, Token } from '../state/types.js';

/**
 * Given the canonical token order and a set of selected ids, return the
 * subset of selected ids in canonical order. Annotations / AoE ids in the
 * selection set are ignored (they won't be found among tokens).
 */
export function tokensInSelectionOrder(
  tokens: readonly Token[],
  selectedIds: ReadonlySet<ID>,
): ID[] {
  return tokens.filter((t) => selectedIds.has(t.id)).map((t) => t.id);
}

/**
 * Wrap an index by `delta` (positive or negative). Returns `-1` when `len`
 * is 0; otherwise always returns a value in [0, len).
 */
export function cycleIndex(len: number, current: number, delta: number): number {
  if (len <= 0) return -1;
  const n = ((current + delta) % len + len) % len;
  return n;
}

/**
 * Given the cycle order and the currently-open id, return the id `delta`
 * positions away. If the current id isn't in the order, returns the first
 * (on positive delta) or last (on negative delta) id. Returns null for an
 * empty order.
 */
export function cycleTo(
  order: readonly ID[],
  currentId: ID | null,
  delta: number,
): ID | null {
  if (order.length === 0) return null;
  const idx = currentId ? order.indexOf(currentId) : -1;
  if (idx < 0) {
    return delta >= 0 ? order[0]! : order[order.length - 1]!;
  }
  const next = cycleIndex(order.length, idx, delta);
  return order[next]!;
}

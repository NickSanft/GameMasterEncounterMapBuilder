/**
 * Phase 156 — token vehicle / parent-child relationships.
 *
 * Pure helpers for traversing the `parentId` tree. No DOM, no I/O.
 * The relationship is one-way: parent → children. Dragging a parent
 * cascades to its descendants; dragging a child only moves the
 * child (rider shifts in saddle, treasure slides on chest, etc.).
 *
 * Cycles are normally prevented authoring-side (the token editor's
 * "Carried by" dropdown filters out the candidate's own
 * descendants), but every traversal here also uses a visited set
 * so a malformed wire payload (or hand-edited save file) can't
 * make us infinite-loop.
 */

import type { ID, Token } from './types.js';

/**
 * Returns the ids of every token that is (recursively) parented to
 * `rootId`. Order is breadth-first; the root itself is NOT included.
 * Cycles are skipped via the visited set.
 *
 * Stable for empty input — returns `[]` if `rootId` doesn't match
 * any token.
 */
export function descendantsOf(
  tokens: readonly Token[],
  rootId: ID,
): ID[] {
  const out: ID[] = [];
  const visited = new Set<ID>([rootId]);
  const queue: ID[] = [rootId];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const t of tokens) {
      if (t.parentId !== cur) continue;
      if (visited.has(t.id)) continue;
      visited.add(t.id);
      out.push(t.id);
      queue.push(t.id);
    }
  }
  return out;
}

/**
 * Returns true if assigning `candidateParentId` as the parent of
 * `tokenId` would create a cycle. Used by the token editor to
 * filter the "Carried by" dropdown.
 *
 * Cycle = candidateParentId is the token itself OR is one of the
 * token's descendants.
 */
export function wouldCreateCycle(
  tokens: readonly Token[],
  tokenId: ID,
  candidateParentId: ID,
): boolean {
  if (tokenId === candidateParentId) return true;
  const descendants = descendantsOf(tokens, tokenId);
  return descendants.includes(candidateParentId);
}

/**
 * Expand a set of token ids to include all their descendants. Used
 * by the select tool's drag commit so a parent drag picks up its
 * carried tokens automatically. Order: input ids first (preserved),
 * then descendants in BFS order. Duplicates are de-duplicated.
 */
export function expandWithDescendants(
  tokens: readonly Token[],
  ids: readonly ID[],
): ID[] {
  const result: ID[] = [];
  const seen = new Set<ID>();
  for (const id of ids) {
    if (!seen.has(id)) {
      result.push(id);
      seen.add(id);
    }
    for (const child of descendantsOf(tokens, id)) {
      if (!seen.has(child)) {
        result.push(child);
        seen.add(child);
      }
    }
  }
  return result;
}

import type { ID, InitiativeEntry, InitiativeState, Token } from './types.js';
import type { Rng } from './dice.js';
import { nid } from '../util/id.js';

/** Stable-sort a list of entries by value descending. */
export function sortByValue(order: readonly InitiativeEntry[]): InitiativeEntry[] {
  return [...order].sort((a, b) => b.value - a.value);
}

export interface AdvanceResult {
  activeId: ID | null;
  round: number;
  wrapped: boolean;
}

/** Move to the next entry in turn order. Wraps around; increments round on wrap. */
export function advanceInitiative(state: InitiativeState): AdvanceResult {
  if (state.order.length === 0) {
    return { activeId: null, round: 0, wrapped: false };
  }
  if (state.activeId === null) {
    // Starting combat — first entry and round 1 if not already set
    return {
      activeId: state.order[0]!.id,
      round: Math.max(1, state.round),
      wrapped: false,
    };
  }
  const idx = state.order.findIndex((e) => e.id === state.activeId);
  if (idx === -1) {
    return {
      activeId: state.order[0]!.id,
      round: Math.max(1, state.round),
      wrapped: false,
    };
  }
  const nextIdx = (idx + 1) % state.order.length;
  const wrapped = nextIdx === 0;
  return {
    activeId: state.order[nextIdx]!.id,
    round: state.round + (wrapped ? 1 : 0),
    wrapped,
  };
}

/** Move to the previous entry. Wraps around backward; decrements round on wrap (floor at 1). */
export function retreatInitiative(state: InitiativeState): AdvanceResult {
  if (state.order.length === 0) {
    return { activeId: null, round: 0, wrapped: false };
  }
  if (state.activeId === null) {
    return {
      activeId: state.order[state.order.length - 1]!.id,
      round: Math.max(1, state.round),
      wrapped: false,
    };
  }
  const idx = state.order.findIndex((e) => e.id === state.activeId);
  if (idx === -1) {
    return {
      activeId: state.order[state.order.length - 1]!.id,
      round: Math.max(1, state.round),
      wrapped: false,
    };
  }
  const prevIdx = idx === 0 ? state.order.length - 1 : idx - 1;
  const wrapped = idx === 0;
  return {
    activeId: state.order[prevIdx]!.id,
    round: wrapped ? Math.max(1, state.round - 1) : state.round,
    wrapped,
  };
}

/** Returns the initiative entry whose token matches the given token id, or null. */
export function findEntryForToken(
  state: InitiativeState,
  tokenId: ID,
): InitiativeEntry | null {
  return state.order.find((e) => e.tokenId === tokenId) ?? null;
}

/**
 * Phase 69 — roll 1d20 + `token.initiativeMod` and produce a fresh
 * `InitiativeEntry` linked to the token. The value is clamped to the
 * usual range (1d20 + a [-20, 20] mod yields [-19, 40]).
 *
 * Inject `rng` for tests; defaults to `Math.random`. The resulting
 * entry has a fresh nid, the token's current label (so renaming the
 * token after rolling doesn't change the existing entry), and the
 * tokenId for cross-reference + active-token glow.
 */
export function rollInitiativeForToken(
  token: Token,
  rng: Rng = Math.random,
): InitiativeEntry {
  // 1d20 — Math.random is in [0, 1); +1 makes it [1, 20].
  const die = Math.floor(rng() * 20) + 1;
  const value = die + (token.initiativeMod ?? 0);
  return {
    id: nid(),
    tokenId: token.id,
    label: token.label,
    value,
  };
}

/**
 * Phase 69 — roll initiative for every token NOT already in the
 * initiative order. Used by the "Roll all" button in the tracker:
 * rolling for tokens already in the order would clobber values the
 * GM may have manually set for NPC monsters or for players who
 * announced their own roll. Returns the fresh entries; the caller
 * is responsible for dispatching `initiative-add` for each one.
 */
export function rollInitiativeForUnlinkedTokens(
  tokens: readonly Token[],
  state: InitiativeState,
  rng: Rng = Math.random,
): InitiativeEntry[] {
  const linked = new Set(
    state.order.map((e) => e.tokenId).filter(Boolean) as ID[],
  );
  const fresh: InitiativeEntry[] = [];
  for (const t of tokens) {
    if (linked.has(t.id)) continue;
    fresh.push(rollInitiativeForToken(t, rng));
  }
  return fresh;
}

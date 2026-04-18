import type { ID, InitiativeEntry, InitiativeState } from './types.js';

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

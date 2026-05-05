import type { ID, InitiativeEntry, InitiativeState, Token } from './types.js';
import type { Rng } from './dice.js';
import { nid } from '../util/id.js';
import { isDead } from './token-hp.js';

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

export interface AdvanceWithSkipResult extends AdvanceResult {
  /**
   * Initiative entries skipped on the way to `activeId`. Order
   * matches the skip sequence — caller can log them in order, in the
   * combat log or elsewhere. Empty when no skip happened.
   */
  skipped: InitiativeEntry[];
}

/**
 * Phase 155 — `advanceInitiative` + auto-skip past dead tokens.
 * Repeatedly advances while the next active entry's token is dead
 * (`deathSaves.failures >= 3`). Returns the final landing point plus
 * the list of skipped entries (so the caller can log them).
 *
 * Termination: caps at one full lap. If every entry's token is dead
 * (or every linked token is missing — defensive against a stale
 * initiative pointing at a removed token), we stop after walking the
 * full order once and land on the original advance target. This
 * matches D&D table experience — if literally everyone in the
 * initiative is dead, the GM probably wants to call the encounter
 * rather than spin forever.
 *
 * Entries with `tokenId: null` (manual entries — "Spell effect ends"
 * markers) are NEVER skipped. Skipping requires a linked token AND
 * `isDead(token.deathSaves)`. Sleep / unconscious-but-not-dying are
 * not auto-skipped — those are 5e "still has a turn" cases.
 */
export function advanceInitiativeSkippingDead(
  state: InitiativeState,
  tokens: readonly Token[],
): AdvanceWithSkipResult {
  const first = advanceInitiative(state);
  if (state.order.length === 0 || first.activeId === null) {
    return { ...first, skipped: [] };
  }
  const tokenById = new Map(tokens.map((t) => [t.id, t]));
  const skipped: InitiativeEntry[] = [];
  let cursor = first;
  // Cap at order.length iterations — we've walked the whole order
  // without finding a live target.
  for (let i = 0; i < state.order.length; i++) {
    const entry = state.order.find((e) => e.id === cursor.activeId);
    // Manual entries (no linked token) and stale pointers are never
    // skipped — they're authored markers the GM put in deliberately.
    if (!entry || entry.tokenId === null) {
      return { ...cursor, skipped };
    }
    const token = tokenById.get(entry.tokenId);
    if (!token || !isDead(token.deathSaves)) {
      return { ...cursor, skipped };
    }
    // Cursor's token is dead — record the skip and advance one more
    // step. Preserve the cumulative wrap flag once we've wrapped.
    skipped.push(entry);
    const next = advanceInitiative({
      ...state,
      activeId: cursor.activeId,
      round: cursor.round,
    });
    cursor = { ...next, wrapped: cursor.wrapped || next.wrapped };
  }
  // Walked the whole order without finding a live target — every
  // linked token is dead. Bail and return the original advance with
  // no skips, so the GM can see the result and resolve manually.
  return { ...first, skipped: [] };
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

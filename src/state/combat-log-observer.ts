/**
 * Phase 94 — observe state changes + emit combat-log events.
 *
 * The combat log captures four event categories:
 *
 *   - **damage / heal** — fired DIRECTLY by the GM entry from the same
 *     paths that already trigger Phase 77's `damage-fx` events
 *     (Damage / Heal dialog Apply, Phase 92 quick-HP +/-). The observer
 *     does NOT diff HP itself: that would also fire on Token Editor
 *     edits where the GM is just adjusting a max-HP typo, not actually
 *     dealing damage. Routing through the existing fire points
 *     guarantees we only log "real combat damage."
 *
 *   - **conditions** — diffed from `state.tokens` per subscribe tick.
 *     `state.tokens[i].conditions` is a string[]; comparing the
 *     before/after snapshots yields added + removed.
 *
 *   - **death-save changes** — diffed from `state.tokens[i].deathSaves`.
 *     Single-bump heuristic: only one delta per turn (failure +1 or
 *     success +1, possibly cascading to stable / dead). A reset to
 *     {0,0} is logged as `'reset'`.
 *
 *   - **turn advance** — diffed from `state.initiative.activeId` /
 *     `.round`. Fires once per (round, activeId) tuple.
 *
 * The observer owns the per-tick previous-snapshot state so the gm.ts
 * entry just `subscribe(store, log)` and forgets it.
 */

import type { Store } from './store.js';
import type { CombatLog, CombatLogEvent } from './combat-log.js';
import type { ID, SessionState, Token } from './types.js';
import { activeTurnKey } from './turn-timer.js';

interface ObserverSnapshot {
  /** id → { conditions: Set, deathSaves: {s,f}, label } for diffing. */
  tokens: Map<
    ID,
    {
      label: string;
      conditions: Set<string>;
      deathSaves: { successes: number; failures: number };
    }
  >;
  /** activeTurnKey from the previous tick, for turn-advance edge detection. */
  turnKey: string | null;
}

function snapshotState(state: SessionState): ObserverSnapshot {
  const tokens = new Map<ID, ObserverSnapshot['tokens'] extends Map<ID, infer V> ? V : never>();
  for (const t of state.tokens) {
    tokens.set(t.id, {
      label: t.label,
      conditions: new Set(t.conditions),
      deathSaves: { ...t.deathSaves },
    });
  }
  return {
    tokens,
    turnKey: activeTurnKey(state.initiative.activeId, state.initiative.round),
  };
}

function classifyDeathSaveChange(
  prev: { successes: number; failures: number },
  next: { successes: number; failures: number },
): CombatLogEvent['kind'] extends 'death-save'
  ? never
  : 'failure' | 'success' | 'stable' | 'dead' | 'reset' | null {
  // Reset takes priority: any transition TO {0,0} from non-zero counts.
  if (
    next.successes === 0 &&
    next.failures === 0 &&
    (prev.successes > 0 || prev.failures > 0)
  ) {
    return 'reset';
  }
  // Terminal states. We classify the FIRST transition into them as
  // stable/dead (so a manual GM tick from 2 → 3 fails fires "dead",
  // not "failure" — the latter would technically be true too but
  // less informative).
  if (next.successes >= 3 && prev.successes < 3) return 'stable';
  if (next.failures >= 3 && prev.failures < 3) return 'dead';
  // Single-bump heuristic.
  if (next.failures > prev.failures) return 'failure';
  if (next.successes > prev.successes) return 'success';
  return null;
}

export interface CombatLogObserverOptions {
  store: Store;
  log: CombatLog;
}

export interface CombatLogObserverHandle {
  /**
   * Push a damage / heal event explicitly. Called from the dialog +
   * quick-HP code paths so the log only records intentional combat
   * damage, not Token Editor max-HP edits.
   *
   * `amount` follows Phase 77's wire convention (positive = damage,
   * negative = heal) so the call site can pass the same value it
   * sends into `damageFxManager`.
   */
  recordDamage(token: Token, amount: number): void;
  destroy(): void;
}

/**
 * Subscribe to the store + start emitting combat-log events. Returns
 * a handle with `recordDamage(token, amount)` for the explicit
 * damage / heal pathway plus `destroy()` to unsubscribe.
 */
export function attachCombatLogObserver(
  opts: CombatLogObserverOptions,
): CombatLogObserverHandle {
  const { store, log } = opts;
  let snap: ObserverSnapshot = snapshotState(store.getState());

  const unsub = store.subscribe(() => {
    const next = store.getState();
    const nextSnap = snapshotState(next);

    // -- Conditions diff (per-token).
    for (const t of next.tokens) {
      const prev = snap.tokens.get(t.id);
      if (!prev) continue; // brand-new token; skip — placement isn't a "combat event"
      const nextSet = new Set(t.conditions);
      // Added.
      for (const c of nextSet) {
        if (!prev.conditions.has(c)) {
          log.add({
            kind: 'condition-added',
            tokenId: t.id,
            tokenLabel: t.label,
            condition: c,
          });
        }
      }
      // Removed.
      for (const c of prev.conditions) {
        if (!nextSet.has(c)) {
          log.add({
            kind: 'condition-removed',
            tokenId: t.id,
            tokenLabel: t.label,
            condition: c,
          });
        }
      }
    }

    // -- Death-save diff.
    for (const t of next.tokens) {
      const prev = snap.tokens.get(t.id);
      if (!prev) continue;
      const change = classifyDeathSaveChange(prev.deathSaves, t.deathSaves);
      if (change) {
        log.add({
          kind: 'death-save',
          tokenId: t.id,
          tokenLabel: t.label,
          change,
          successes: t.deathSaves.successes,
          failures: t.deathSaves.failures,
        });
      }
    }

    // -- Turn advance.
    if (nextSnap.turnKey !== snap.turnKey && nextSnap.turnKey !== null) {
      const active = next.initiative.order.find(
        (e) => e.id === next.initiative.activeId,
      );
      const linkedToken = active?.tokenId
        ? next.tokens.find((t) => t.id === active.tokenId)
        : null;
      log.add({
        kind: 'turn',
        round: next.initiative.round,
        tokenId: active?.tokenId ?? null,
        tokenLabel:
          linkedToken?.label || active?.label || '',
      });
    }

    snap = nextSnap;
  });

  return {
    recordDamage(token, amount) {
      if (amount === 0 || !Number.isFinite(amount)) return;
      const entry: CombatLogEvent = {
        kind: 'damage',
        tokenId: token.id,
        tokenLabel: token.label,
        amount,
      };
      if (token.hp) {
        entry.hpAfter = { current: token.hp.current, max: token.hp.max };
      }
      log.add(entry);
    },
    destroy() {
      unsub();
    },
  };
}

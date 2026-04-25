/**
 * Phase 77 — transient damage / heal visual effect tracker.
 *
 * Mirrors the Phase 39 ping-manager pattern: small queue of in-flight
 * effects, each self-expiring after `DAMAGE_FX_DURATION_MS`. Drives a
 * floating-number-over-token renderer in `src/render/layer-damage-fx.ts`.
 *
 * Effects are seeded by the damage-heal dialog (one per affected
 * token after a successful `Apply`) AND by the cross-tab `damage-fx`
 * sync message so spectators see the same numbers float up.
 */

import { nid } from '../util/id.js';

export interface DamageFx {
  /** Stable id per effect for renderer keying / de-dup. */
  id: string;
  /** Token the number floats over. */
  tokenId: string;
  /**
   * Signed magnitude:
   *   - positive = damage (renders red, prefixed `−`)
   *   - negative = heal (renders green, prefixed `+`)
   * Stored signed (rather than two fields) so the wire stays minimal.
   */
  amount: number;
  /** `performance.now()` at queue-time, used to drive the rise + fade. */
  startedAt: number;
}

export const DAMAGE_FX_DURATION_MS = 1400;
export const DAMAGE_FX_RISE_PX = 30;

export interface DamageFxManager {
  /** Queue an effect. Zero amounts are silently ignored. */
  add(tokenId: string, amount: number): void;
  /** Snapshot of active effects (those whose elapsed time < duration). */
  getActive(): readonly DamageFx[];
}

export function createDamageFxManager(onTick: () => void): DamageFxManager {
  let fxs: DamageFx[] = [];
  let ticking = false;

  function startTickerIfNeeded() {
    if (ticking) return;
    ticking = true;
    const step = () => {
      const now = performance.now();
      const next: DamageFx[] = [];
      for (const f of fxs) {
        if (now - f.startedAt < DAMAGE_FX_DURATION_MS) next.push(f);
      }
      fxs = next;
      onTick();
      if (fxs.length === 0) {
        ticking = false;
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return {
    add(tokenId, amount) {
      if (!tokenId) return;
      if (!Number.isFinite(amount) || amount === 0) return;
      fxs.push({
        id: nid(),
        tokenId,
        amount: Math.round(amount),
        startedAt: performance.now(),
      });
      startTickerIfNeeded();
    },
    getActive() {
      return fxs;
    },
  };
}

/**
 * Phase 78 — fog reveal fade-in tracker.
 *
 * Maintains a side-buffer copy of the previous fog grid; on every
 * `observe(currFog)` call (driven by the entry's store-subscribe
 * handler), diffs the two buffers and queues a fade entry for every
 * cell that transitioned 0 → 1 (hidden → revealed). Hide transitions
 * (1 → 0) are NOT tracked — re-hiding a region is usually a GM
 * correction and a hard cut reads as the right intent.
 *
 * The renderer queries `getActive(now)` per frame and overlays a
 * fading-out dark patch on each cell so the *reveal* animates in
 * smoothly. Once a cell's elapsed time crosses `FOG_FADE_MS` it falls
 * off the active list and the cell sits at its normal "revealed"
 * (transparent) appearance.
 *
 * Pure module: no DOM, no setTimeout, no rAF — the renderer drives
 * the clock by passing `performance.now()` into `getActive`. Easy
 * to unit-test against synthetic time.
 */

export const FOG_FADE_MS = 480;

export interface FogFadeCell {
  /** Grid column. */
  x: number;
  /** Grid row. */
  y: number;
  /** `performance.now()` at the moment the reveal landed. */
  startedAt: number;
}

export interface FogFadeTracker {
  /**
   * Diff `currFog` against the cached previous buffer. For every
   * 0 → 1 transition, queue a fade-in entry stamped with `now`.
   * Caches a copy of `currFog` for the next call. The very first
   * call (no cached previous) just seeds the cache without
   * queueing — we don't fade in cells that were already revealed
   * at boot.
   */
  observe(
    currFog: ArrayLike<number>,
    cols: number,
    rows: number,
    now: number,
  ): void;
  /** Snapshot of cells still mid-fade, with their start times. */
  getActive(now: number): readonly FogFadeCell[];
  /**
   * Drop everything (cached prev buffer + active fades). Useful on
   * scene switch / session-reset so the new scene's existing
   * revealed cells don't get treated as "fresh reveals".
   */
  reset(): void;
  /** Test hook — current queue size. */
  _activeCount(): number;
}

/**
 * Optional callback for `createFogFadeTracker`. When supplied, the
 * tracker keeps a self-driven rAF loop running while fades are
 * in-flight, calling `onTick` each frame so the host renderer can
 * `requestRender()`. Without this, the renderer would have to
 * already be running its own rAF loop for fades to animate
 * between store-subscribe ticks.
 *
 * In tests we omit `onTick` (the ticker just no-ops) so the unit
 * tests stay deterministic without rAF mocks.
 */
export function createFogFadeTracker(
  onTick?: () => void,
): FogFadeTracker {
  let prev: Uint8Array | null = null;
  let active: FogFadeCell[] = [];
  let ticking = false;

  function startTickerIfNeeded() {
    if (ticking || !onTick) return;
    if (typeof requestAnimationFrame !== 'function') return;
    ticking = true;
    const step = () => {
      onTick();
      // Drop expired entries; if any remain, schedule the next frame.
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      const cutoff = now - FOG_FADE_MS;
      const next: FogFadeCell[] = [];
      for (const c of active) {
        if (c.startedAt > cutoff) next.push(c);
      }
      active = next;
      if (active.length === 0) {
        ticking = false;
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return {
    observe(currFog, cols, rows, now) {
      const expected = cols * rows;
      // If dimensions change (scene with a different grid), reset.
      if (prev && prev.length !== currFog.length) {
        prev = null;
        active = [];
      }
      if (!prev) {
        // Seed without queueing — the first observation establishes
        // the baseline; we don't want to fade in every already-
        // revealed cell on boot.
        prev = new Uint8Array(currFog as ArrayLike<number>);
        return;
      }
      // Defensive: input length should match cols*rows. Just iterate
      // the shorter of the two if they ever disagree.
      const len = Math.min(prev.length, currFog.length, expected);
      let queued = false;
      for (let i = 0; i < len; i++) {
        const before = prev[i] ?? 0;
        const after = currFog[i] ?? 0;
        if (before === 0 && after === 1) {
          active.push({
            x: i % cols,
            y: Math.floor(i / cols),
            startedAt: now,
          });
          queued = true;
        }
      }
      // Re-cache the new state for the next diff.
      prev = new Uint8Array(currFog as ArrayLike<number>);
      if (queued) startTickerIfNeeded();
    },
    getActive(now) {
      // Prune in-place — keep only cells whose fade hasn't expired.
      const cutoff = now - FOG_FADE_MS;
      if (active.length === 0) return active;
      const next: FogFadeCell[] = [];
      for (const c of active) {
        if (c.startedAt > cutoff) next.push(c);
      }
      active = next;
      return active;
    },
    reset() {
      prev = null;
      active = [];
    },
    _activeCount() {
      return active.length;
    },
  };
}

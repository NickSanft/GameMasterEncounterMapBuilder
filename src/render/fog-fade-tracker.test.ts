import { describe, it, expect } from 'vitest';
import {
  createFogFadeTracker,
  FOG_FADE_MS,
} from './fog-fade-tracker.js';

function fog(values: number[]): Uint8Array {
  return new Uint8Array(values);
}

describe('createFogFadeTracker', () => {
  it('seeds the baseline without queueing on the first observe', () => {
    const t = createFogFadeTracker();
    t.observe(fog([1, 0, 1, 0]), 2, 2, 1000);
    // First call establishes the baseline — no fades queued for
    // already-revealed cells.
    expect(t.getActive(1000)).toEqual([]);
  });

  it('queues a fade for a 0 → 1 transition', () => {
    const t = createFogFadeTracker();
    t.observe(fog([0, 0, 0, 0]), 2, 2, 1000);
    t.observe(fog([0, 1, 0, 0]), 2, 2, 1100);
    const active = t.getActive(1100);
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ x: 1, y: 0, startedAt: 1100 });
  });

  it('does NOT queue a 1 → 0 transition (hides are hard cuts)', () => {
    const t = createFogFadeTracker();
    t.observe(fog([1, 0]), 2, 1, 1000);
    t.observe(fog([0, 0]), 2, 1, 1100);
    expect(t.getActive(1100)).toEqual([]);
  });

  it('handles a multi-cell reveal in one diff', () => {
    const t = createFogFadeTracker();
    t.observe(fog([0, 0, 0, 0]), 2, 2, 1000);
    t.observe(fog([1, 1, 0, 1]), 2, 2, 1100);
    const active = t.getActive(1100);
    expect(active).toHaveLength(3);
    expect(active.map((c) => `${c.x},${c.y}`).sort()).toEqual([
      '0,0',
      '1,0',
      '1,1',
    ]);
  });

  it('expires entries after FOG_FADE_MS', () => {
    const t = createFogFadeTracker();
    t.observe(fog([0, 0]), 2, 1, 1000);
    t.observe(fog([1, 0]), 2, 1, 1100);
    expect(t.getActive(1100)).toHaveLength(1);
    // Just before the cutoff: still active.
    expect(t.getActive(1100 + FOG_FADE_MS - 1)).toHaveLength(1);
    // Past the cutoff: pruned.
    expect(t.getActive(1100 + FOG_FADE_MS + 1)).toEqual([]);
  });

  it('preserves earlier fades while queueing new ones', () => {
    const t = createFogFadeTracker();
    t.observe(fog([0, 0, 0]), 3, 1, 1000);
    t.observe(fog([1, 0, 0]), 3, 1, 1050);
    t.observe(fog([1, 1, 0]), 3, 1, 1200);
    const active = t.getActive(1200);
    expect(active).toHaveLength(2);
    expect(active.find((c) => c.x === 0)?.startedAt).toBe(1050);
    expect(active.find((c) => c.x === 1)?.startedAt).toBe(1200);
  });

  it('resets when grid dimensions change', () => {
    const t = createFogFadeTracker();
    t.observe(fog([0, 0, 0, 0]), 2, 2, 1000);
    // Fog buffer with different length triggers a reset.
    t.observe(fog([0, 0, 0, 0, 0, 0]), 3, 2, 1100);
    // Next observe should be the SECOND one's baseline; no fades.
    t.observe(fog([1, 0, 0, 0, 0, 0]), 3, 2, 1200);
    const active = t.getActive(1200);
    expect(active).toHaveLength(1);
    expect(active[0]?.x).toBe(0);
  });

  it('reset() drops everything', () => {
    const t = createFogFadeTracker();
    t.observe(fog([0, 0]), 2, 1, 1000);
    t.observe(fog([1, 1]), 2, 1, 1100);
    expect(t.getActive(1100)).toHaveLength(2);
    t.reset();
    expect(t.getActive(1100)).toEqual([]);
    // Next observe re-seeds (no queue from the seeded state).
    t.observe(fog([1, 1]), 2, 1, 1200);
    expect(t.getActive(1200)).toEqual([]);
  });

  it('does not queue when the buffer is unchanged', () => {
    const t = createFogFadeTracker();
    t.observe(fog([0, 1, 0]), 3, 1, 1000);
    t.observe(fog([0, 1, 0]), 3, 1, 1100);
    expect(t.getActive(1100)).toEqual([]);
  });

  it('computes (x, y) correctly for 1D index', () => {
    const t = createFogFadeTracker();
    t.observe(fog([0, 0, 0, 0, 0, 0]), 3, 2, 1000);
    // Reveal index 4 → x=1, y=1 (since cols=3, idx 4 = row 1 col 1).
    t.observe(fog([0, 0, 0, 0, 1, 0]), 3, 2, 1100);
    const active = t.getActive(1100);
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({ x: 1, y: 1 });
  });
});

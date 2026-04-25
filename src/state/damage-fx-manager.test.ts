/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDamageFxManager } from './damage-fx-manager.js';

describe('createDamageFxManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Make rAF synchronous(-ish) under fake timers so the ticker can
    // be exercised without real timing.
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(performance.now()), 16),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('queues a damage effect and exposes it via getActive', () => {
    const m = createDamageFxManager(() => {});
    m.add('tok-a', 7);
    const active = m.getActive();
    expect(active).toHaveLength(1);
    expect(active[0]?.tokenId).toBe('tok-a');
    expect(active[0]?.amount).toBe(7);
  });

  it('queues a heal effect (negative amount)', () => {
    const m = createDamageFxManager(() => {});
    m.add('tok-a', -5);
    expect(m.getActive()[0]?.amount).toBe(-5);
  });

  it('ignores zero / non-finite amounts', () => {
    const m = createDamageFxManager(() => {});
    m.add('tok-a', 0);
    m.add('tok-a', Number.NaN);
    m.add('tok-a', Number.POSITIVE_INFINITY);
    expect(m.getActive()).toHaveLength(0);
  });

  it('ignores empty / falsy tokenId', () => {
    const m = createDamageFxManager(() => {});
    m.add('', 5);
    expect(m.getActive()).toHaveLength(0);
  });

  it('rounds fractional amounts to integers', () => {
    const m = createDamageFxManager(() => {});
    m.add('tok-a', 7.7);
    expect(m.getActive()[0]?.amount).toBe(8);
  });

  it('mints a fresh id per effect', () => {
    const m = createDamageFxManager(() => {});
    m.add('tok-a', 5);
    m.add('tok-a', 3);
    const active = m.getActive();
    expect(active[0]?.id).not.toBe(active[1]?.id);
  });

  // The rAF-driven expiration uses `performance.now()` which doesn't
  // auto-advance under vi.useFakeTimers(); the live behavior is
  // covered by an e2e test instead. This unit test just pins that
  // onTick fires while effects are alive (next test below).

  it('keeps multiple concurrent effects independent', () => {
    const m = createDamageFxManager(() => {});
    m.add('tok-a', 5);
    m.add('tok-b', -3);
    m.add('tok-c', 12);
    expect(m.getActive()).toHaveLength(3);
    const ids = m.getActive().map((f) => f.tokenId).sort();
    expect(ids).toEqual(['tok-a', 'tok-b', 'tok-c']);
  });

  it('fires onTick at least once per frame while effects are alive', () => {
    const onTick = vi.fn();
    const m = createDamageFxManager(onTick);
    m.add('tok-a', 5);
    vi.advanceTimersByTime(50); // ~3 frames
    expect(onTick).toHaveBeenCalled();
  });
});

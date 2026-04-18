import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPingManager, PING_DURATION_MS } from './ping-manager.js';

describe('createPingManager', () => {
  let rafHandlers: Array<() => void>;
  let originalRaf: typeof window.requestAnimationFrame;
  let originalNow: typeof performance.now;
  let nowValue: number;

  beforeEach(() => {
    rafHandlers = [];
    originalRaf = window.requestAnimationFrame;
    // Replace rAF with a queue we flush manually so tests control timing.
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafHandlers.push(() => cb(nowValue));
      return 1 as unknown as number;
    }) as typeof window.requestAnimationFrame;

    originalNow = performance.now.bind(performance);
    nowValue = 1000;
    (performance as { now(): number }).now = () => nowValue;
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRaf;
    (performance as { now(): number }).now = originalNow;
  });

  function flushRaf() {
    const queued = rafHandlers;
    rafHandlers = [];
    for (const cb of queued) cb();
  }

  it('starts with no active pings', () => {
    const mgr = createPingManager(() => {});
    expect(mgr.getActive()).toEqual([]);
  });

  it('add() exposes the ping until it expires', () => {
    const mgr = createPingManager(() => {});
    mgr.add(100, 200);
    expect(mgr.getActive().length).toBe(1);
    expect(mgr.getActive()[0]!.x).toBe(100);

    // Advance time past duration and flush the scheduled frame.
    nowValue = 1000 + PING_DURATION_MS + 10;
    flushRaf();
    expect(mgr.getActive()).toEqual([]);
  });

  it('honours a custom color', () => {
    const mgr = createPingManager(() => {});
    mgr.add(0, 0, '#ff0000');
    expect(mgr.getActive()[0]!.color).toBe('#ff0000');
  });

  it('calls onTick each frame while pings are active', () => {
    const onTick = vi.fn();
    const mgr = createPingManager(onTick);
    mgr.add(0, 0);

    nowValue = 1000 + 100;
    flushRaf();
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(mgr.getActive()).toHaveLength(1);

    nowValue = 1000 + 500;
    flushRaf();
    expect(onTick).toHaveBeenCalledTimes(2);

    nowValue = 1000 + PING_DURATION_MS + 50;
    flushRaf();
    // After the final tick that clears pings, onTick fires one last time.
    expect(onTick).toHaveBeenCalledTimes(3);
    expect(mgr.getActive()).toEqual([]);
  });

  it('multiple pings coexist and expire independently', () => {
    const mgr = createPingManager(() => {});
    mgr.add(10, 10);
    nowValue = 1000 + 500;
    mgr.add(20, 20);
    expect(mgr.getActive()).toHaveLength(2);

    // Advance so the first ping has expired but second is still live.
    nowValue = 1000 + PING_DURATION_MS + 50;
    flushRaf();
    const active = mgr.getActive();
    expect(active).toHaveLength(1);
    expect(active[0]!.x).toBe(20);
  });
});

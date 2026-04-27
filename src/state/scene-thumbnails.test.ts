/**
 * Phase 121 — scene-thumbnails throttle tests.
 */
import { describe, it, expect } from 'vitest';
import { createSceneThumbnailThrottle } from './scene-thumbnails.js';

describe('createSceneThumbnailThrottle', () => {
  it('first call for a scene id returns true (fresh scene → capture immediately)', () => {
    let t = 1000;
    const throttle = createSceneThumbnailThrottle({
      minIntervalMs: 5000,
      now: () => t,
    });
    expect(throttle.shouldCapture('a')).toBe(true);
  });

  it('second call within minInterval returns false', () => {
    let t = 1000;
    const throttle = createSceneThumbnailThrottle({
      minIntervalMs: 5000,
      now: () => t,
    });
    expect(throttle.shouldCapture('a')).toBe(true);
    t = 4999;
    expect(throttle.shouldCapture('a')).toBe(false);
  });

  it('call after minInterval elapses returns true', () => {
    let t = 1000;
    const throttle = createSceneThumbnailThrottle({
      minIntervalMs: 5000,
      now: () => t,
    });
    expect(throttle.shouldCapture('a')).toBe(true);
    t = 6000;
    expect(throttle.shouldCapture('a')).toBe(true);
  });

  it('per-scene independence — different ids do not share a throttle', () => {
    let t = 1000;
    const throttle = createSceneThumbnailThrottle({
      minIntervalMs: 5000,
      now: () => t,
    });
    expect(throttle.shouldCapture('a')).toBe(true);
    expect(throttle.shouldCapture('b')).toBe(true);
    t = 2000;
    expect(throttle.shouldCapture('a')).toBe(false);
    expect(throttle.shouldCapture('b')).toBe(false);
  });

  it('empty / falsy sceneId returns false (defensive guard)', () => {
    const throttle = createSceneThumbnailThrottle();
    expect(throttle.shouldCapture('')).toBe(false);
  });

  it('reset clears every per-scene record', () => {
    let t = 1000;
    const throttle = createSceneThumbnailThrottle({
      minIntervalMs: 5000,
      now: () => t,
    });
    throttle.shouldCapture('a');
    throttle.shouldCapture('b');
    t = 2000;
    expect(throttle.shouldCapture('a')).toBe(false);
    throttle.reset();
    // Post-reset, both ids should look fresh again.
    expect(throttle.shouldCapture('a')).toBe(true);
    expect(throttle.shouldCapture('b')).toBe(true);
  });

  it('forget drops a single id without affecting others', () => {
    let t = 1000;
    const throttle = createSceneThumbnailThrottle({
      minIntervalMs: 5000,
      now: () => t,
    });
    throttle.shouldCapture('a');
    throttle.shouldCapture('b');
    t = 2000;
    throttle.forget('a');
    expect(throttle.shouldCapture('a')).toBe(true); // freshly capture-eligible
    expect(throttle.shouldCapture('b')).toBe(false); // still throttled
  });
});

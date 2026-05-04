/**
 * Phase 145 — scene-switch loading overlay tests.
 */
import { describe, it, expect } from 'vitest';
import { shouldShowOverlay } from './scene-loading-overlay.js';

describe('shouldShowOverlay (Phase 145)', () => {
  it('returns false when no background image is set (id null)', () => {
    expect(shouldShowOverlay(null, 'unknown')).toBe(false);
    expect(shouldShowOverlay(null, 'loading')).toBe(false);
    expect(shouldShowOverlay(null, 'loaded')).toBe(false);
    expect(shouldShowOverlay(null, 'error')).toBe(false);
  });

  it('returns false when status is loaded (image is ready)', () => {
    expect(shouldShowOverlay('img-1', 'loaded')).toBe(false);
  });

  it('returns false when status is error (better than perpetual spinner)', () => {
    expect(shouldShowOverlay('img-1', 'error')).toBe(false);
  });

  it('returns true while status is loading', () => {
    expect(shouldShowOverlay('img-1', 'loading')).toBe(true);
  });

  it("returns true while status is unknown (the renderer's `get()` will trigger loading on the next frame)", () => {
    expect(shouldShowOverlay('img-1', 'unknown')).toBe(true);
  });
});

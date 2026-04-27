/**
 * Phase 110 — persistent per-tab player id tests.
 *
 * sessionStorage is the per-tab + per-origin web primitive. jsdom
 * ships a working mock; we just clear it between tests so each case
 * starts with a fresh "tab."
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getOrCreatePlayerId, _resetPlayerId } from './player-id.js';

beforeEach(() => {
  _resetPlayerId('gm');
  _resetPlayerId('spectator');
});

describe('getOrCreatePlayerId', () => {
  it('returns the same id when called twice (within the same tab)', () => {
    const a = getOrCreatePlayerId('gm');
    const b = getOrCreatePlayerId('gm');
    expect(a).toBe(b);
  });

  it('mints a fresh id after _resetPlayerId (simulates a new tab)', () => {
    const a = getOrCreatePlayerId('gm');
    _resetPlayerId('gm');
    const b = getOrCreatePlayerId('gm');
    expect(a).not.toBe(b);
  });

  it('GM and Spectator scopes are independent', () => {
    const gm = getOrCreatePlayerId('gm');
    const spec = getOrCreatePlayerId('spectator');
    expect(gm).not.toBe(spec);
    // Both stable on subsequent calls.
    expect(getOrCreatePlayerId('gm')).toBe(gm);
    expect(getOrCreatePlayerId('spectator')).toBe(spec);
  });

  it('persists in sessionStorage under a stable key', () => {
    const id = getOrCreatePlayerId('spectator');
    expect(sessionStorage.getItem('gm-encounter-maps-player-id-spectator')).toBe(id);
  });

  it('falls back to a fresh ephemeral id when sessionStorage throws', () => {
    // Re-define sessionStorage's getItem to throw — simulates Safari's
    // privacy-mode behavior where the API is present but unusable.
    const original = sessionStorage;
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('storage unavailable');
      },
    });
    try {
      const a = getOrCreatePlayerId('gm');
      const b = getOrCreatePlayerId('gm');
      // Each call mints a fresh id since we can't persist.
      expect(a).not.toBe(b);
      expect(a).toBeTruthy();
      expect(b).toBeTruthy();
    } finally {
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        value: original,
      });
    }
  });
});

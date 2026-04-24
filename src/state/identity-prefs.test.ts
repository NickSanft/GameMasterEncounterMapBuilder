import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createIdentityPrefs } from './identity-prefs.js';
import {
  IDENTITY_PREFS_GM_KEY,
  IDENTITY_PREFS_SPECTATOR_KEY,
  PREFERENCES_KEY,
} from '../util/constants.js';

beforeEach(() => {
  localStorage.clear();
});

describe('createIdentityPrefs', () => {
  it('starts with empty defaults when no key is set', () => {
    const store = createIdentityPrefs('gm');
    expect(store.get()).toEqual({ name: '', color: '' });
  });

  it('persists writes to the role-scoped localStorage key', () => {
    const store = createIdentityPrefs('gm');
    store.update({ name: 'Alice', color: '#ff0000' });
    const raw = localStorage.getItem(IDENTITY_PREFS_GM_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual({ name: 'Alice', color: '#ff0000' });
    // Spectator key is untouched.
    expect(localStorage.getItem(IDENTITY_PREFS_SPECTATOR_KEY)).toBeNull();
  });

  it('reads back what was previously stored', () => {
    localStorage.setItem(
      IDENTITY_PREFS_GM_KEY,
      JSON.stringify({ name: 'Bob', color: '#00ff00' }),
    );
    const store = createIdentityPrefs('gm');
    expect(store.get()).toEqual({ name: 'Bob', color: '#00ff00' });
  });

  it('subscribe fires after each update + returns an unsubscribe', () => {
    const store = createIdentityPrefs('spectator');
    const fired = vi.fn();
    const unsub = store.subscribe(fired);
    store.update({ name: 'Alice' });
    store.update({ color: '#00f' });
    expect(fired).toHaveBeenCalledTimes(2);
    unsub();
    store.update({ name: 'Carol' });
    expect(fired).toHaveBeenCalledTimes(2);
  });

  it('GM + Spectator instances are completely isolated', () => {
    const gm = createIdentityPrefs('gm');
    const spec = createIdentityPrefs('spectator');
    gm.update({ name: 'GameMaster' });
    spec.update({ name: 'Player1' });
    expect(gm.get().name).toBe('GameMaster');
    expect(spec.get().name).toBe('Player1');
    expect(JSON.parse(localStorage.getItem(IDENTITY_PREFS_GM_KEY)!).name).toBe(
      'GameMaster',
    );
    expect(
      JSON.parse(localStorage.getItem(IDENTITY_PREFS_SPECTATOR_KEY)!).name,
    ).toBe('Player1');
  });

  it('falls back to defaults on malformed JSON in storage', () => {
    localStorage.setItem(IDENTITY_PREFS_GM_KEY, 'not-json');
    const store = createIdentityPrefs('gm');
    expect(store.get()).toEqual({ name: '', color: '' });
  });

  it('partial update preserves the other field', () => {
    const store = createIdentityPrefs('gm');
    store.update({ name: 'Alice', color: '#ff0000' });
    store.update({ color: '#0000ff' });
    expect(store.get()).toEqual({ name: 'Alice', color: '#0000ff' });
  });
});

describe('migration from legacy preferences keys', () => {
  it('migrates playerNameGm + playerColorGm out of preferences on first read', () => {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        theme: 'dark',
        playerNameGm: 'Alice',
        playerColorGm: '#ff0000',
        playerNameSpectator: 'Bob',
      }),
    );
    const store = createIdentityPrefs('gm');
    expect(store.get()).toEqual({ name: 'Alice', color: '#ff0000' });
    // The new store's key is now populated.
    expect(JSON.parse(localStorage.getItem(IDENTITY_PREFS_GM_KEY)!)).toEqual({
      name: 'Alice',
      color: '#ff0000',
    });
    // The legacy keys are stripped from the prefs blob, but
    // unrelated prefs (theme, the OTHER role's name) survive.
    const remaining = JSON.parse(localStorage.getItem(PREFERENCES_KEY)!);
    expect(remaining.theme).toBe('dark');
    expect(remaining.playerNameSpectator).toBe('Bob'); // not GM's role
    expect(remaining.playerNameGm).toBeUndefined();
    expect(remaining.playerColorGm).toBeUndefined();
  });

  it('migrates the Spectator-side fields independently', () => {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({
        playerNameSpectator: 'Bob',
        playerColorSpectator: '#0000ff',
      }),
    );
    const spec = createIdentityPrefs('spectator');
    expect(spec.get()).toEqual({ name: 'Bob', color: '#0000ff' });
    expect(
      JSON.parse(localStorage.getItem(IDENTITY_PREFS_SPECTATOR_KEY)!),
    ).toEqual({ name: 'Bob', color: '#0000ff' });
    const remaining = JSON.parse(localStorage.getItem(PREFERENCES_KEY)!);
    expect(remaining.playerNameSpectator).toBeUndefined();
    expect(remaining.playerColorSpectator).toBeUndefined();
  });

  it('migration is a no-op when legacy fields are absent', () => {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ theme: 'dark', labelSize: 'large' }),
    );
    const store = createIdentityPrefs('gm');
    expect(store.get()).toEqual({ name: '', color: '' });
    // Prefs blob is preserved as-is (no spurious key).
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!)).toEqual({
      theme: 'dark',
      labelSize: 'large',
    });
  });

  it('migration is idempotent — subsequent constructions read from the new store', () => {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ playerNameGm: 'Alice' }),
    );
    createIdentityPrefs('gm'); // first call migrates
    const second = createIdentityPrefs('gm'); // should read from new key
    expect(second.get()).toEqual({ name: 'Alice', color: '' });
  });

  it('the new store wins when both legacy + new keys are present', () => {
    // If a previous boot already migrated and the user then edited
    // their identity, the new store has the latest value. A leftover
    // legacy field in prefs should NOT clobber it.
    localStorage.setItem(
      IDENTITY_PREFS_GM_KEY,
      JSON.stringify({ name: 'Carol', color: '#00ff00' }),
    );
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ playerNameGm: 'StaleAlice' }),
    );
    const store = createIdentityPrefs('gm');
    expect(store.get().name).toBe('Carol');
  });
});

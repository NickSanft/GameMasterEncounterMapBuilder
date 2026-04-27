import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSpectatorPermissionsStore,
  DEFAULT_PERMISSIONS,
  _resetPermissionsStorage,
} from './spectator-permissions.js';

beforeEach(() => {
  _resetPermissionsStorage();
});

describe('createSpectatorPermissionsStore — basics', () => {
  it("returns DEFAULT_PERMISSIONS for an id we've never seen", () => {
    const store = createSpectatorPermissionsStore();
    expect(store.get('alice')).toEqual(DEFAULT_PERMISSIONS);
  });

  it('set + get round-trips an override', () => {
    const store = createSpectatorPermissionsStore();
    store.set('alice', { canRoll: false, hiddenTokenIds: [] });
    expect(store.get('alice')).toEqual({ canRoll: false, hiddenTokenIds: [] });
  });

  it('set with the same value is a no-op (no notify)', () => {
    const store = createSpectatorPermissionsStore();
    let calls = 0;
    store.subscribe(() => calls++);
    store.set('alice', DEFAULT_PERMISSIONS);
    expect(calls).toBe(0);
    store.set('alice', { canRoll: false, hiddenTokenIds: [] });
    expect(calls).toBe(1);
    store.set('alice', { canRoll: false, hiddenTokenIds: [] });
    expect(calls).toBe(1); // unchanged → no notify
  });

  it('reset removes an override + notifies', () => {
    const store = createSpectatorPermissionsStore();
    store.set('alice', { canRoll: false, hiddenTokenIds: [] });
    let calls = 0;
    store.subscribe(() => calls++);
    store.reset('alice');
    expect(calls).toBe(1);
    expect(store.get('alice')).toEqual(DEFAULT_PERMISSIONS);
  });

  it('reset on an unknown id is a no-op', () => {
    const store = createSpectatorPermissionsStore();
    let calls = 0;
    store.subscribe(() => calls++);
    store.reset('nobody');
    expect(calls).toBe(0);
  });

  it('snapshot returns a copy (mutating it does not affect the store)', () => {
    const store = createSpectatorPermissionsStore();
    store.set('alice', { canRoll: false, hiddenTokenIds: [] });
    const snap = store.snapshot();
    delete snap.alice;
    expect(store.get('alice')).toEqual({ canRoll: false, hiddenTokenIds: [] });
  });
});

describe('createSpectatorPermissionsStore — persistence', () => {
  it('persists overrides to localStorage', () => {
    const a = createSpectatorPermissionsStore();
    a.set('alice', { canRoll: false, hiddenTokenIds: [] });
    // A fresh store reads from localStorage on construction.
    const b = createSpectatorPermissionsStore();
    expect(b.get('alice')).toEqual({ canRoll: false, hiddenTokenIds: [] });
  });

  it('default-equal writes are NOT persisted (storage stays empty)', () => {
    const a = createSpectatorPermissionsStore();
    a.set('alice', DEFAULT_PERMISSIONS);
    const b = createSpectatorPermissionsStore();
    expect(b.snapshot()).toEqual({});
  });

  it('reset clears the persisted entry', () => {
    const a = createSpectatorPermissionsStore();
    a.set('alice', { canRoll: false, hiddenTokenIds: [] });
    a.reset('alice');
    const b = createSpectatorPermissionsStore();
    expect(b.snapshot()).toEqual({});
  });

  it('survives a malformed localStorage blob (returns empty)', () => {
    localStorage.setItem(
      'gm-encounter-maps-spectator-permissions',
      'not json',
    );
    const store = createSpectatorPermissionsStore();
    expect(store.snapshot()).toEqual({});
  });

  it("defaults missing fields to permissive on read (forward-compat)", () => {
    // Simulate a forward-compat scenario where a future version added
    // a new permission field — older clients should treat the missing
    // field as the default ("permissive on read" — don't lock anyone
    // out by accident). Likewise here: a stored entry whose only
    // recognized field is something we don't know about + lacks
    // `canRoll` should round-trip as "default canRoll".
    localStorage.setItem(
      'gm-encounter-maps-spectator-permissions',
      JSON.stringify({ alice: { someFutureField: false } }),
    );
    const store = createSpectatorPermissionsStore();
    expect(store.get('alice')).toEqual({ canRoll: true, hiddenTokenIds: [] });
  });

  it("Phase 109 — `hiddenTokenIds` defaults to empty for pre-109 blobs", () => {
    // Pre-109 stored entries had no `hiddenTokenIds` field at all.
    // The read path should treat that as "no tokens hidden" rather
    // than throw on the missing array.
    localStorage.setItem(
      'gm-encounter-maps-spectator-permissions',
      JSON.stringify({ alice: { canRoll: false } }),
    );
    const store = createSpectatorPermissionsStore();
    expect(store.get('alice')).toEqual({ canRoll: false, hiddenTokenIds: [] });
  });
});

describe('createSpectatorPermissionsStore — Phase 109 hiddenTokenIds', () => {
  it('isTokenHidden returns false for an unknown player', () => {
    const store = createSpectatorPermissionsStore();
    expect(store.isTokenHidden('nobody', 'tok-1')).toBe(false);
  });

  it('setTokenHidden(true) adds the id; isTokenHidden flips', () => {
    const store = createSpectatorPermissionsStore();
    store.setTokenHidden('alice', 'tok-1', true);
    expect(store.isTokenHidden('alice', 'tok-1')).toBe(true);
    expect(store.get('alice').hiddenTokenIds).toEqual(['tok-1']);
  });

  it('setTokenHidden(false) removes the id', () => {
    const store = createSpectatorPermissionsStore();
    store.setTokenHidden('alice', 'tok-1', true);
    store.setTokenHidden('alice', 'tok-1', false);
    expect(store.isTokenHidden('alice', 'tok-1')).toBe(false);
    expect(store.get('alice').hiddenTokenIds).toEqual([]);
  });

  it('setTokenHidden is a no-op when the state already matches', () => {
    const store = createSpectatorPermissionsStore();
    let calls = 0;
    store.subscribe(() => calls++);
    store.setTokenHidden('alice', 'tok-1', true);
    expect(calls).toBe(1);
    store.setTokenHidden('alice', 'tok-1', true); // already hidden
    expect(calls).toBe(1);
    store.setTokenHidden('alice', 'tok-1', false);
    expect(calls).toBe(2);
    store.setTokenHidden('alice', 'tok-1', false); // already visible
    expect(calls).toBe(2);
  });

  it('hiddenTokenIds list is sorted + deduped on write', () => {
    const store = createSpectatorPermissionsStore();
    store.set('alice', {
      canRoll: true,
      hiddenTokenIds: ['c', 'a', 'b', 'a', ''], // duplicates + empty
    });
    expect(store.get('alice').hiddenTokenIds).toEqual(['a', 'b', 'c']);
  });

  it('hiding a token from one Spectator does not affect another', () => {
    const store = createSpectatorPermissionsStore();
    store.setTokenHidden('alice', 'tok-1', true);
    expect(store.isTokenHidden('alice', 'tok-1')).toBe(true);
    expect(store.isTokenHidden('bob', 'tok-1')).toBe(false);
  });

  it('forgetToken drops the id from every Spectator + notifies once', () => {
    const store = createSpectatorPermissionsStore();
    store.setTokenHidden('alice', 'tok-1', true);
    store.setTokenHidden('alice', 'tok-2', true);
    store.setTokenHidden('bob', 'tok-1', true);
    let calls = 0;
    store.subscribe(() => calls++);
    store.forgetToken('tok-1');
    expect(calls).toBe(1);
    expect(store.get('alice').hiddenTokenIds).toEqual(['tok-2']);
    expect(store.get('bob').hiddenTokenIds).toEqual([]);
  });

  it('forgetToken is a silent no-op when no Spectator hides that id', () => {
    const store = createSpectatorPermissionsStore();
    store.setTokenHidden('alice', 'tok-1', true);
    let calls = 0;
    store.subscribe(() => calls++);
    store.forgetToken('does-not-exist');
    expect(calls).toBe(0);
  });

  it('an entry with only `hiddenTokenIds = []` + default canRoll is NOT persisted', () => {
    // After setting + resetting a hidden token, the entry should
    // collapse back to defaults and clear from localStorage.
    const a = createSpectatorPermissionsStore();
    a.setTokenHidden('alice', 'tok-1', true);
    a.setTokenHidden('alice', 'tok-1', false);
    const b = createSpectatorPermissionsStore();
    expect(b.snapshot()).toEqual({});
  });

  it('hiddenTokenIds round-trips through localStorage', () => {
    const a = createSpectatorPermissionsStore();
    a.setTokenHidden('alice', 'tok-1', true);
    a.setTokenHidden('alice', 'tok-2', true);
    const b = createSpectatorPermissionsStore();
    expect(b.get('alice').hiddenTokenIds).toEqual(['tok-1', 'tok-2']);
  });
});

describe('createSpectatorPermissionsStore — subscribe', () => {
  it('listeners fire on every actual change', () => {
    const store = createSpectatorPermissionsStore();
    let calls = 0;
    store.subscribe(() => calls++);
    store.set('alice', { canRoll: false, hiddenTokenIds: [] });
    store.set('bob', { canRoll: false, hiddenTokenIds: [] });
    expect(calls).toBe(2);
  });

  it('unsubscribe stops further notifications', () => {
    const store = createSpectatorPermissionsStore();
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.set('alice', { canRoll: false, hiddenTokenIds: [] });
    off();
    store.set('bob', { canRoll: false, hiddenTokenIds: [] });
    expect(calls).toBe(1);
  });
});

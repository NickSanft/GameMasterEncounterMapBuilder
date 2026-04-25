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
    store.set('alice', { canRoll: false });
    expect(store.get('alice')).toEqual({ canRoll: false });
  });

  it('set with the same value is a no-op (no notify)', () => {
    const store = createSpectatorPermissionsStore();
    let calls = 0;
    store.subscribe(() => calls++);
    store.set('alice', DEFAULT_PERMISSIONS);
    expect(calls).toBe(0);
    store.set('alice', { canRoll: false });
    expect(calls).toBe(1);
    store.set('alice', { canRoll: false });
    expect(calls).toBe(1); // unchanged → no notify
  });

  it('reset removes an override + notifies', () => {
    const store = createSpectatorPermissionsStore();
    store.set('alice', { canRoll: false });
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
    store.set('alice', { canRoll: false });
    const snap = store.snapshot();
    delete snap.alice;
    expect(store.get('alice')).toEqual({ canRoll: false });
  });
});

describe('createSpectatorPermissionsStore — persistence', () => {
  it('persists overrides to localStorage', () => {
    const a = createSpectatorPermissionsStore();
    a.set('alice', { canRoll: false });
    // A fresh store reads from localStorage on construction.
    const b = createSpectatorPermissionsStore();
    expect(b.get('alice')).toEqual({ canRoll: false });
  });

  it('default-equal writes are NOT persisted (storage stays empty)', () => {
    const a = createSpectatorPermissionsStore();
    a.set('alice', DEFAULT_PERMISSIONS);
    const b = createSpectatorPermissionsStore();
    expect(b.snapshot()).toEqual({});
  });

  it('reset clears the persisted entry', () => {
    const a = createSpectatorPermissionsStore();
    a.set('alice', { canRoll: false });
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
    expect(store.get('alice')).toEqual({ canRoll: true });
  });
});

describe('createSpectatorPermissionsStore — subscribe', () => {
  it('listeners fire on every actual change', () => {
    const store = createSpectatorPermissionsStore();
    let calls = 0;
    store.subscribe(() => calls++);
    store.set('alice', { canRoll: false });
    store.set('bob', { canRoll: false });
    expect(calls).toBe(2);
  });

  it('unsubscribe stops further notifications', () => {
    const store = createSpectatorPermissionsStore();
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.set('alice', { canRoll: false });
    off();
    store.set('bob', { canRoll: false });
    expect(calls).toBe(1);
  });
});

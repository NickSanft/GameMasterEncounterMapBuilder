import { describe, it, expect, vi } from 'vitest';
import {
  colorForName,
  resolveName,
  validateColor,
  createIdentityRegistry,
  type PlayerIdentity,
} from './player-identity.js';

const ALICE: PlayerIdentity = {
  id: 'a',
  name: 'Alice',
  color: '#e57373',
  role: 'spectator',
};
const BOB: PlayerIdentity = {
  id: 'b',
  name: 'Bob',
  color: '#64b5f6',
  role: 'spectator',
};

describe('colorForName', () => {
  it('returns a stable color for a given name', () => {
    expect(colorForName('Alice')).toBe(colorForName('Alice'));
    expect(colorForName('Bob')).toBe(colorForName('Bob'));
  });

  it('returns different colors for different names (collision allowed but rare)', () => {
    // Two distinct short names — not guaranteed to differ (10-slot
    // palette → ~10% chance of collision) but "Alice" / "Bob" happen
    // to land in different buckets under the FNV hash we use.
    expect(colorForName('Alice')).not.toBe(colorForName('Bob'));
  });

  it('falls back to gray for an empty / falsy name', () => {
    expect(colorForName('')).toBe('#9e9e9e');
  });

  it('returns a valid hex color for any input', () => {
    for (const name of ['Alice', 'Bob', 'x', '日本語', '🎲']) {
      expect(colorForName(name)).toMatch(/^#[0-9a-f]{3,6}$/);
    }
  });
});

describe('resolveName', () => {
  it('returns the trimmed name when non-empty', () => {
    expect(resolveName('  Alice  ', 'spectator')).toBe('Alice');
  });

  it('falls back to "GM" / "Spectator" based on role for empty input', () => {
    expect(resolveName('', 'gm')).toBe('GM');
    expect(resolveName('   ', 'spectator')).toBe('Spectator');
  });
});

describe('validateColor', () => {
  it('accepts #rgb + #rrggbb case-insensitive', () => {
    expect(validateColor('#abc')).toBe('#abc');
    expect(validateColor('#ABC')).toBe('#ABC');
    expect(validateColor('#aabbcc')).toBe('#aabbcc');
    expect(validateColor('#AABBCC')).toBe('#AABBCC');
  });

  it('rejects everything else', () => {
    expect(validateColor('red')).toBeNull();
    expect(validateColor('rgb(1,2,3)')).toBeNull();
    expect(validateColor('#ff')).toBeNull();
    expect(validateColor('#abcde')).toBeNull();
    expect(validateColor('#abcdefg')).toBeNull();
    expect(validateColor('')).toBeNull();
  });

  it('trims whitespace before validating', () => {
    expect(validateColor('  #abc  ')).toBe('#abc');
  });
});

describe('createIdentityRegistry', () => {
  it('starts empty', () => {
    const r = createIdentityRegistry();
    expect(r.list()).toEqual([]);
  });

  it('update inserts by id', () => {
    const r = createIdentityRegistry();
    r.update(ALICE);
    r.update(BOB);
    expect(r.list()).toEqual([ALICE, BOB]);
    expect(r.get('a')).toEqual(ALICE);
  });

  it('update overwrites an existing entry with the same id', () => {
    const r = createIdentityRegistry();
    r.update(ALICE);
    r.update({ ...ALICE, name: 'Alicia' });
    expect(r.list()).toEqual([{ ...ALICE, name: 'Alicia' }]);
  });

  it('update with an identical payload is a no-op (no notify)', () => {
    const r = createIdentityRegistry();
    const fired = vi.fn();
    r.subscribe(fired);
    r.update(ALICE);
    r.update(ALICE); // same data
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('forget removes by id + notifies', () => {
    const r = createIdentityRegistry();
    r.update(ALICE);
    r.update(BOB);
    const fired = vi.fn();
    r.subscribe(fired);
    r.forget('a');
    expect(r.list()).toEqual([BOB]);
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('forget on an unknown id is a no-op', () => {
    const r = createIdentityRegistry();
    r.update(ALICE);
    const fired = vi.fn();
    r.subscribe(fired);
    r.forget('nonexistent');
    expect(fired).not.toHaveBeenCalled();
  });

  it('list preserves insertion order', () => {
    const r = createIdentityRegistry();
    r.update(BOB);
    r.update(ALICE);
    expect(r.list().map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('subscribe returns an unsubscribe', () => {
    const r = createIdentityRegistry();
    const fired = vi.fn();
    const unsub = r.subscribe(fired);
    r.update(ALICE);
    expect(fired).toHaveBeenCalledTimes(1);
    unsub();
    r.update(BOB);
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('clear wipes all entries + fires once', () => {
    const r = createIdentityRegistry();
    r.update(ALICE);
    r.update(BOB);
    const fired = vi.fn();
    r.subscribe(fired);
    r.clear();
    expect(r.list()).toEqual([]);
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('clear on an empty registry is a no-op', () => {
    const r = createIdentityRegistry();
    const fired = vi.fn();
    r.subscribe(fired);
    r.clear();
    expect(fired).not.toHaveBeenCalled();
  });
});

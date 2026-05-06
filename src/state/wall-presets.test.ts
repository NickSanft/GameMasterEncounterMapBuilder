/**
 * Phase 117 — wall-presets store tests.
 *
 * Pure helper + localStorage-backed; the test setup wipes
 * localStorage between cases.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  listPresets,
  savePreset,
  removePreset,
  BUILTIN_PRESETS,
  MAX_USER_PRESETS,
  _resetUserPresets,
} from './wall-presets.js';

beforeEach(() => {
  _resetUserPresets();
});

describe('wall-presets: built-ins always present', () => {
  it('listPresets returns the built-ins on a fresh install', () => {
    const list = listPresets();
    expect(list).toHaveLength(BUILTIN_PRESETS.length);
    for (const b of BUILTIN_PRESETS) {
      expect(list.find((p) => p.id === b.id)).toBeTruthy();
    }
  });

  it('built-ins are flagged isBuiltin=true', () => {
    for (const p of listPresets()) {
      expect(p.isBuiltin).toBe(true);
    }
  });

  it('the wooden-door built-in carries the door field', () => {
    const door = BUILTIN_PRESETS.find((p) => p.id === 'b:wooden-door-closed');
    expect(door).toBeTruthy();
    expect(door!.door).toEqual({ open: false });
  });

  it('the secret-passage built-in is GM-only', () => {
    const secret = BUILTIN_PRESETS.find((p) => p.id === 'b:secret-passage');
    expect(secret).toBeTruthy();
    expect(secret!.visibility).toBe('gm');
  });

  it('the window built-in is sight-transparent + movement-blocking', () => {
    const win = BUILTIN_PRESETS.find((p) => p.id === 'b:window');
    expect(win).toBeTruthy();
    expect(win!.blocksSight).toBe(false);
    expect(win!.blocksMovement).toBe(true);
  });

  it('the remove-door built-in (Phase 136) clears the door field with door: null', () => {
    const remove = BUILTIN_PRESETS.find((p) => p.id === 'b:remove-door');
    expect(remove).toBeTruthy();
    expect(remove!.door).toBe(null);
    // Reverts to a plain blocking wall — sight + movement on.
    expect(remove!.blocksSight).toBe(true);
    expect(remove!.blocksMovement).toBe(true);
  });

  it('the remove-door built-in is the only one with door: null (vs door: {open})', () => {
    const closeable = BUILTIN_PRESETS.filter((p) => p.door !== undefined);
    const setters = closeable.filter((p) => p.door !== null);
    const removers = closeable.filter((p) => p.door === null);
    expect(setters.length).toBeGreaterThan(0); // wooden-door-closed exists
    expect(removers.length).toBe(1); // only remove-door clears
    expect(removers[0]!.id).toBe('b:remove-door');
  });

  // Phase 170 — D&D 5e cover terminology presets.
  it('the half-cover built-in blocks movement but not sight', () => {
    const hc = BUILTIN_PRESETS.find((p) => p.id === 'b:half-cover');
    expect(hc).toBeTruthy();
    expect(hc!.blocksSight).toBe(false);
    expect(hc!.blocksMovement).toBe(true);
  });

  it('the three-quarter cover built-in blocks both sight and movement', () => {
    const tq = BUILTIN_PRESETS.find((p) => p.id === 'b:three-quarter-cover');
    expect(tq).toBeTruthy();
    expect(tq!.blocksSight).toBe(true);
    expect(tq!.blocksMovement).toBe(true);
  });

  it('the cliff-edge built-in blocks movement but not sight, thicker than half-cover', () => {
    const cliff = BUILTIN_PRESETS.find((p) => p.id === 'b:cliff-edge');
    const hc = BUILTIN_PRESETS.find((p) => p.id === 'b:half-cover');
    expect(cliff).toBeTruthy();
    expect(cliff!.blocksSight).toBe(false);
    expect(cliff!.blocksMovement).toBe(true);
    // Thickness ordering — cliff visually thicker so the GM
    // can tell a cliff from a low wall at a glance.
    expect(cliff!.thickness ?? 0).toBeGreaterThan(hc!.thickness ?? 0);
  });
});

describe('wall-presets: save + remove', () => {
  it('savePreset adds a user preset after the built-ins', () => {
    const saved = savePreset({
      name: 'My wall',
      blocksSight: true,
      blocksMovement: true,
      thickness: 5,
    });
    expect(saved.id).toBeTruthy();
    expect(saved.isBuiltin).toBe(false);
    const list = listPresets();
    expect(list).toHaveLength(BUILTIN_PRESETS.length + 1);
    expect(list[list.length - 1]!.id).toBe(saved.id);
  });

  it('savePreset trims the name + falls back to "Untitled preset"', () => {
    const a = savePreset({
      name: '  Trimmed  ',
      blocksSight: true,
      blocksMovement: true,
    });
    expect(a.name).toBe('Trimmed');
    const b = savePreset({
      name: '   ',
      blocksSight: true,
      blocksMovement: true,
    });
    expect(b.name).toBe('Untitled preset');
  });

  it('removePreset drops a user preset by id', () => {
    const saved = savePreset({
      name: 'Temp',
      blocksSight: true,
      blocksMovement: true,
    });
    expect(listPresets().some((p) => p.id === saved.id)).toBe(true);
    removePreset(saved.id);
    expect(listPresets().some((p) => p.id === saved.id)).toBe(false);
  });

  it('removePreset is a silent no-op for built-in ids', () => {
    removePreset('b:stone-exterior');
    expect(listPresets().some((p) => p.id === 'b:stone-exterior')).toBe(true);
  });

  it('removePreset is a silent no-op for unknown ids', () => {
    expect(() => removePreset('does-not-exist')).not.toThrow();
  });

  it('caps user presets at MAX_USER_PRESETS (oldest evicted)', () => {
    for (let i = 0; i < MAX_USER_PRESETS + 5; i++) {
      savePreset({
        name: `P${i}`,
        blocksSight: true,
        blocksMovement: true,
      });
    }
    const list = listPresets();
    const userList = list.slice(BUILTIN_PRESETS.length);
    expect(userList).toHaveLength(MAX_USER_PRESETS);
    expect(userList[0]!.name).toBe('P5');
    expect(userList[userList.length - 1]!.name).toBe(`P${MAX_USER_PRESETS + 4}`);
  });
});

describe('wall-presets: persistence', () => {
  it('user presets round-trip through localStorage', () => {
    savePreset({
      name: 'Persistent',
      blocksSight: true,
      blocksMovement: true,
      thickness: 12,
    });
    const list = listPresets();
    const persistent = list.find((p) => p.name === 'Persistent');
    expect(persistent).toBeTruthy();
    expect(persistent!.thickness).toBe(12);
  });

  it('returns just built-ins when localStorage holds malformed JSON', () => {
    localStorage.setItem('gm-encounter-maps-wall-presets', '{not json');
    expect(listPresets()).toHaveLength(BUILTIN_PRESETS.length);
  });

  it('returns just built-ins when version mismatch', () => {
    localStorage.setItem(
      'gm-encounter-maps-wall-presets',
      JSON.stringify({ version: 999, entries: [] }),
    );
    expect(listPresets()).toHaveLength(BUILTIN_PRESETS.length);
  });

  it('drops persisted entries missing required fields', () => {
    localStorage.setItem(
      'gm-encounter-maps-wall-presets',
      JSON.stringify({
        version: 1,
        entries: [
          { id: 'good', name: 'OK', blocksSight: true, blocksMovement: true },
          { name: 'no-id', blocksSight: true, blocksMovement: true },
          { id: 'no-flags', name: 'X' },
          'not-an-object',
        ],
      }),
    );
    const list = listPresets();
    const userList = list.slice(BUILTIN_PRESETS.length);
    expect(userList).toHaveLength(1);
    expect(userList[0]!.id).toBe('good');
  });

  it('forces isBuiltin=false on persisted entries (defensive)', () => {
    // A malformed peer that promotes a user preset to built-in via the
    // wire would otherwise grant it delete-immunity. Defensive read
    // forces isBuiltin: false.
    localStorage.setItem(
      'gm-encounter-maps-wall-presets',
      JSON.stringify({
        version: 1,
        entries: [
          {
            id: 'sneaky',
            name: 'Sneaky',
            blocksSight: true,
            blocksMovement: true,
            isBuiltin: true,
          },
        ],
      }),
    );
    const sneaky = listPresets().find((p) => p.id === 'sneaky')!;
    expect(sneaky.isBuiltin).toBe(false);
  });
});

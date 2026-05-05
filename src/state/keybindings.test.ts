/**
 * Phase 153 — keybindings helper tests.
 */
import { describe, it, expect } from 'vitest';
import {
  TOOL_KEYBINDING_ACTIONS,
  getEffectiveKey,
  lookupTool,
  validateKey,
  setBinding,
} from './keybindings.js';

describe('TOOL_KEYBINDING_ACTIONS (Phase 153)', () => {
  it('lists 12 tool-activation actions', () => {
    // Phase 158 added `tool-travel` (default 'g') to the original
    // 11 tool-activation actions.
    expect(TOOL_KEYBINDING_ACTIONS.length).toBe(12);
  });

  it('every action has a unique id', () => {
    const ids = new Set(TOOL_KEYBINDING_ACTIONS.map((a) => a.id));
    expect(ids.size).toBe(TOOL_KEYBINDING_ACTIONS.length);
  });

  it('every action has a unique default key', () => {
    const keys = new Set(TOOL_KEYBINDING_ACTIONS.map((a) => a.defaultKey));
    expect(keys.size).toBe(TOOL_KEYBINDING_ACTIONS.length);
  });

  it('every default key is a single lowercase letter', () => {
    for (const action of TOOL_KEYBINDING_ACTIONS) {
      expect(action.defaultKey).toMatch(/^[a-z]$/);
    }
  });
});

describe('getEffectiveKey (Phase 153)', () => {
  it('returns default when no override exists', () => {
    expect(getEffectiveKey('tool-select', {})).toBe('s');
    expect(getEffectiveKey('tool-tile-paint', {})).toBe('p');
  });

  it('returns the override when set + valid', () => {
    expect(getEffectiveKey('tool-select', { 'tool-select': 'q' })).toBe('q');
  });

  it('falls back to default when override is malformed (multi-char)', () => {
    expect(getEffectiveKey('tool-select', { 'tool-select': 'ab' })).toBe('s');
  });

  it('falls back to default when override is non-alphanumeric', () => {
    expect(getEffectiveKey('tool-select', { 'tool-select': '!' })).toBe('s');
  });

  it('returns empty string for unknown action ids', () => {
    expect(getEffectiveKey('not-a-real-action', {})).toBe('');
  });
});

describe('lookupTool (Phase 153)', () => {
  it("returns the toolId bound to the key (default mappings)", () => {
    expect(lookupTool('s', {})).toBe('select');
    expect(lookupTool('t', {})).toBe('token');
    expect(lookupTool('p', {})).toBe('tile-paint');
  });

  it('returns null for keys not bound to any action', () => {
    expect(lookupTool('z', {})).toBeNull();
    expect(lookupTool('', {})).toBeNull();
  });

  it("respects user overrides", () => {
    // Rebind tool-select from 's' to 'q'
    const bindings = { 'tool-select': 'q' };
    expect(lookupTool('q', bindings)).toBe('select');
    // 's' falls through (no longer bound to select; not a default
    // for any other action).
    expect(lookupTool('s', bindings)).toBeNull();
  });

  it('is case-insensitive (Capital S → select)', () => {
    expect(lookupTool('S', {})).toBe('select');
  });
});

describe('validateKey (Phase 153)', () => {
  it("returns null for valid + non-conflicting keys", () => {
    expect(validateKey('tool-select', 's', {})).toBeNull();
    expect(validateKey('tool-select', 'q', {})).toBeNull();
  });

  it('rejects empty / multi-char input', () => {
    expect(validateKey('tool-select', '', {})).toMatch(/single/i);
    expect(validateKey('tool-select', 'ab', {})).toMatch(/single/i);
  });

  it('rejects symbols', () => {
    expect(validateKey('tool-select', '!', {})).toMatch(/letters/i);
  });

  it('reports conflicts with other actions', () => {
    // 't' is bound to tool-token by default; binding 'tool-select'
    // to 't' should conflict.
    expect(validateKey('tool-select', 't', {})).toMatch(/already bound/i);
  });

  it('does NOT consider self-binding a conflict', () => {
    // Re-binding tool-select to 's' (its own default) is fine.
    expect(validateKey('tool-select', 's', {})).toBeNull();
  });
});

describe('setBinding (Phase 153)', () => {
  it('adds an override', () => {
    const next = setBinding('tool-select', 'q', {});
    expect(next['tool-select']).toBe('q');
  });

  it('does NOT mutate the input', () => {
    const original: Record<string, string> = {};
    const next = setBinding('tool-select', 'q', original);
    expect(original).toEqual({});
    expect(next).not.toBe(original);
  });

  it('lowercases the candidate key', () => {
    const next = setBinding('tool-select', 'Q', {});
    expect(next['tool-select']).toBe('q');
  });

  it('clears the override when candidate is null / empty', () => {
    const next = setBinding('tool-select', null, { 'tool-select': 'q' });
    expect(next['tool-select']).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import { duplicateTokens } from './token-clipboard.js';
import type { Token } from './types.js';

function token(overrides: Partial<Token>): Token {
  return {
    id: overrides.id ?? 'orig',
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    label: overrides.label ?? 'Hero',
    color: overrides.color ?? '#ff8800',
    imageId: overrides.imageId ?? 'img-1',
    size: overrides.size ?? 2,
    borderColor: overrides.borderColor ?? '#4caf50',
    hp: overrides.hp ?? null,
    conditions: overrides.conditions ?? [],
    rotation: overrides.rotation ?? 0,
    losRadius: overrides.losRadius ?? null,
    light: overrides.light ?? null,
    initiativeMod: overrides.initiativeMod ?? 0,
  };
}

describe('duplicateTokens', () => {
  it('returns an empty array for empty input', () => {
    expect(duplicateTokens([])).toEqual([]);
  });

  it('assigns a fresh id to each copy', () => {
    const originals = [token({ id: 'a' }), token({ id: 'b' })];
    const copies = duplicateTokens(originals);
    expect(copies[0]!.id).not.toBe('a');
    expect(copies[1]!.id).not.toBe('b');
    expect(copies[0]!.id).not.toBe(copies[1]!.id);
  });

  it('offsets x and y by (1, 1) by default', () => {
    const [copy] = duplicateTokens([token({ x: 3, y: 5 })]);
    expect(copy!.x).toBe(4);
    expect(copy!.y).toBe(6);
  });

  it('honours custom offsets', () => {
    const [copy] = duplicateTokens([token({ x: 3, y: 5 })], 0, 2);
    expect(copy!.x).toBe(3);
    expect(copy!.y).toBe(7);
  });

  it('preserves every other field', () => {
    const original = token({
      id: 'orig',
      label: 'Boss',
      color: '#8e24aa',
      imageId: 'img-42',
      size: 3,
      borderColor: '#e53935',
    });
    const [copy] = duplicateTokens([original]);
    expect(copy!.label).toBe('Boss');
    expect(copy!.color).toBe('#8e24aa');
    expect(copy!.imageId).toBe('img-42');
    expect(copy!.size).toBe(3);
    expect(copy!.borderColor).toBe('#e53935');
  });

  it('does not mutate the originals', () => {
    const originals = [token({ x: 3, y: 5 })];
    duplicateTokens(originals, 10, 20);
    expect(originals[0]!.x).toBe(3);
    expect(originals[0]!.y).toBe(5);
  });
});

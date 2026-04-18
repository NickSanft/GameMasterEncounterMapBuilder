import { describe, it, expect } from 'vitest';
import { hitTestAoe, isAoeVisible } from './hit-test-aoe.js';
import type { AoeTemplate } from '../state/types.js';

function aoe(partial: Partial<AoeTemplate> & { id: string; kind: AoeTemplate['kind'] }): AoeTemplate {
  return {
    id: partial.id,
    kind: partial.kind,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    length: partial.length ?? 100,
    width: partial.width ?? 10,
    rotation: partial.rotation ?? 0,
    color: partial.color ?? '#ff7043',
    visibility: partial.visibility ?? 'shared',
  };
}

describe('hitTestAoe', () => {
  it('sphere: point inside radius', () => {
    const t = aoe({ id: 's', kind: 'sphere', x: 100, y: 100, length: 50 });
    expect(hitTestAoe([t], 120, 100)?.id).toBe('s');
    expect(hitTestAoe([t], 200, 200)).toBeNull();
  });

  it('cube: axis-aligned bounds', () => {
    const t = aoe({ id: 'c', kind: 'cube', x: 0, y: 0, length: 100, width: 50 });
    expect(hitTestAoe([t], 50, 25)?.id).toBe('c');
    expect(hitTestAoe([t], 120, 25)).toBeNull();
  });

  it('cone: inside aperture and reach', () => {
    const t = aoe({
      id: 'cone',
      kind: 'cone',
      x: 0,
      y: 0,
      length: 100,
      width: 60, // aperture deg
      rotation: 0, // facing +x
    });
    // Straight ahead
    expect(hitTestAoe([t], 80, 0)?.id).toBe('cone');
    // Inside aperture
    expect(hitTestAoe([t], 80, 20)?.id).toBe('cone');
    // Outside aperture
    expect(hitTestAoe([t], 80, 80)).toBeNull();
    // Beyond reach
    expect(hitTestAoe([t], 150, 0)).toBeNull();
  });

  it('line: inside thickness and length', () => {
    const t = aoe({
      id: 'l',
      kind: 'line',
      x: 0,
      y: 0,
      length: 100,
      width: 20,
      rotation: 0,
    });
    expect(hitTestAoe([t], 50, 5)?.id).toBe('l');
    expect(hitTestAoe([t], 50, 15)).toBeNull();
    expect(hitTestAoe([t], 120, 5)).toBeNull();
  });

  it('returns topmost when multiple templates overlap', () => {
    const a = aoe({ id: 'a', kind: 'sphere', x: 0, y: 0, length: 50 });
    const b = aoe({ id: 'b', kind: 'sphere', x: 0, y: 0, length: 50 });
    expect(hitTestAoe([a, b], 10, 0)?.id).toBe('b');
  });
});

describe('isAoeVisible', () => {
  const cols = 10;
  const rows = 10;
  const cellSize = 50;

  function newFog() {
    return new Uint8Array(cols * rows);
  }

  it('GM sees every template', () => {
    const t = aoe({
      id: 't',
      kind: 'sphere',
      x: 25,
      y: 25,
      visibility: 'gm',
    });
    expect(isAoeVisible(t, newFog(), cols, rows, cellSize, 'gm')).toBe(true);
  });

  it('Spectator hides GM-only templates even on revealed cells', () => {
    const t = aoe({
      id: 't',
      kind: 'sphere',
      x: 25,
      y: 25,
      visibility: 'gm',
    });
    const fog = newFog();
    fog[0] = 1;
    expect(isAoeVisible(t, fog, cols, rows, cellSize, 'spectator')).toBe(false);
  });

  it('Spectator shows shared templates only on revealed cells', () => {
    const t = aoe({ id: 't', kind: 'sphere', x: 25, y: 25 });
    const fog = newFog();
    expect(isAoeVisible(t, fog, cols, rows, cellSize, 'spectator')).toBe(false);
    fog[0] = 1;
    expect(isAoeVisible(t, fog, cols, rows, cellSize, 'spectator')).toBe(true);
  });
});

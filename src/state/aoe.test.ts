import { describe, it, expect } from 'vitest';
import {
  AOE_PRESETS,
  DEFAULT_AOE_COLOR,
  DEFAULT_CONE_APERTURE_DEG,
  DEFAULT_LINE_THICKNESS,
  aoePlacementFromDrag,
  isAoeDragTrivial,
} from './aoe.js';

describe('AOE_PRESETS', () => {
  it('contains four kinds with unique ids', () => {
    expect(AOE_PRESETS).toHaveLength(4);
    const ids = new Set(AOE_PRESETS.map((p) => p.id));
    expect(ids.size).toBe(4);
    expect(ids.has('sphere')).toBe(true);
    expect(ids.has('cone')).toBe(true);
    expect(ids.has('line')).toBe(true);
    expect(ids.has('cube')).toBe(true);
  });
});

describe('aoePlacementFromDrag', () => {
  const color = DEFAULT_AOE_COLOR;

  it('sphere uses radius from origin to cursor', () => {
    const p = aoePlacementFromDrag(100, 100, 130, 140, { kind: 'sphere', color });
    expect(p.kind).toBe('sphere');
    expect(p.x).toBe(100);
    expect(p.y).toBe(100);
    expect(p.length).toBeCloseTo(50); // sqrt(30^2 + 40^2)
  });

  it('cone aims toward cursor and uses default aperture', () => {
    const p = aoePlacementFromDrag(0, 0, 100, 0, { kind: 'cone', color });
    expect(p.kind).toBe('cone');
    expect(p.length).toBe(100);
    expect(p.width).toBe(DEFAULT_CONE_APERTURE_DEG);
    expect(p.rotation).toBeCloseTo(0);
  });

  it('line sets length and default thickness', () => {
    const p = aoePlacementFromDrag(0, 0, 0, 100, { kind: 'line', color });
    expect(p.kind).toBe('line');
    expect(p.length).toBe(100);
    expect(p.width).toBe(DEFAULT_LINE_THICKNESS);
    expect(p.rotation).toBeCloseTo(Math.PI / 2);
  });

  it('cube normalizes to top-left corner regardless of drag direction', () => {
    const p = aoePlacementFromDrag(200, 200, 100, 50, { kind: 'cube', color });
    expect(p.kind).toBe('cube');
    expect(p.x).toBe(100);
    expect(p.y).toBe(50);
    expect(p.length).toBe(100);
    expect(p.width).toBe(150);
  });
});

describe('isAoeDragTrivial', () => {
  it('flags tiny sphere drags as trivial', () => {
    const p = aoePlacementFromDrag(0, 0, 2, 1, {
      kind: 'sphere',
      color: '#000',
    });
    expect(isAoeDragTrivial(p)).toBe(true);
  });

  it('accepts meaningful sphere drags', () => {
    const p = aoePlacementFromDrag(0, 0, 100, 0, {
      kind: 'sphere',
      color: '#000',
    });
    expect(isAoeDragTrivial(p)).toBe(false);
  });

  it('flags micro-cubes as trivial', () => {
    const p = aoePlacementFromDrag(0, 0, 2, 2, { kind: 'cube', color: '#000' });
    expect(isAoeDragTrivial(p)).toBe(true);
  });
});

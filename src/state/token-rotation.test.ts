import { describe, it, expect } from 'vitest';
import {
  normalizeRotation,
  radiansToDegrees,
  degreesToRadians,
  rotateBy,
  snapRotation,
  snapTo45,
  snapTo90,
  compass8Direction,
  TAU,
} from './token-rotation.js';

const EPS = 1e-9;

describe('normalizeRotation', () => {
  it('leaves values in [0, 2π) alone', () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(Math.PI)).toBeCloseTo(Math.PI, 9);
  });

  it('wraps values past 2π', () => {
    expect(normalizeRotation(TAU)).toBeCloseTo(0, 9);
    expect(normalizeRotation(TAU + 1)).toBeCloseTo(1, 9);
    expect(normalizeRotation(TAU * 3 + 0.5)).toBeCloseTo(0.5, 9);
  });

  it('wraps negative values into the positive range', () => {
    expect(normalizeRotation(-Math.PI)).toBeCloseTo(Math.PI, 9);
    expect(normalizeRotation(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 9);
  });

  it('coerces non-finite input to 0', () => {
    expect(normalizeRotation(NaN)).toBe(0);
    expect(normalizeRotation(Infinity)).toBe(0);
    expect(normalizeRotation(-Infinity)).toBe(0);
  });
});

describe('radiansToDegrees / degreesToRadians', () => {
  it('is a round-trip for multiples of 45°', () => {
    for (const deg of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const radians = degreesToRadians(deg);
      expect(radiansToDegrees(radians)).toBeCloseTo(deg, 6);
    }
  });

  it('reports degrees in [0, 360)', () => {
    expect(radiansToDegrees(0)).toBe(0);
    expect(radiansToDegrees(TAU)).toBeCloseTo(0, 6);
    expect(radiansToDegrees(-Math.PI / 4)).toBeCloseTo(315, 6);
  });

  it('tolerates non-finite degree input', () => {
    expect(degreesToRadians(NaN)).toBe(0);
  });
});

describe('rotateBy', () => {
  it('adds deltaRadians and wraps', () => {
    expect(rotateBy(0, Math.PI)).toBeCloseTo(Math.PI, EPS);
    expect(rotateBy(Math.PI, Math.PI)).toBeCloseTo(0, EPS);
    expect(rotateBy(Math.PI / 4, -Math.PI / 4)).toBeCloseTo(0, EPS);
  });

  it('wraps negative results correctly', () => {
    // Start facing North, rotate -45° (counter-clockwise) → NW = 315°.
    const nw = rotateBy(0, -Math.PI / 4);
    expect(radiansToDegrees(nw)).toBeCloseTo(315, 6);
  });
});

describe('snapRotation', () => {
  it('snaps to the nearest multiple of the step', () => {
    const step = Math.PI / 4; // 45°
    expect(radiansToDegrees(snapRotation(degreesToRadians(10), step))).toBeCloseTo(0, 6);
    expect(radiansToDegrees(snapRotation(degreesToRadians(22), step))).toBeCloseTo(0, 6);
    expect(radiansToDegrees(snapRotation(degreesToRadians(23), step))).toBeCloseTo(45, 6);
    expect(radiansToDegrees(snapRotation(degreesToRadians(359), step))).toBeCloseTo(0, 6);
  });

  it('returns the normalized value when step is invalid', () => {
    expect(snapRotation(Math.PI, 0)).toBeCloseTo(Math.PI, 6);
    expect(snapRotation(Math.PI, -1)).toBeCloseTo(Math.PI, 6);
    expect(snapRotation(Math.PI, NaN)).toBeCloseTo(Math.PI, 6);
  });
});

describe('snapTo45 / snapTo90', () => {
  it('snapTo45 produces one of the 8 compass bearings', () => {
    for (const deg of [0, 45, 90, 135, 180, 225, 270, 315]) {
      expect(radiansToDegrees(snapTo45(degreesToRadians(deg + 2)))).toBeCloseTo(deg, 6);
    }
  });

  it('snapTo90 produces one of the 4 cardinal bearings', () => {
    for (const deg of [0, 90, 180, 270]) {
      expect(radiansToDegrees(snapTo90(degreesToRadians(deg + 10)))).toBeCloseTo(deg, 6);
    }
  });
});

describe('compass8Direction', () => {
  it('maps the 8 bearings to their letter codes', () => {
    const pairs: Array<[number, string]> = [
      [0, 'N'],
      [45, 'NE'],
      [90, 'E'],
      [135, 'SE'],
      [180, 'S'],
      [225, 'SW'],
      [270, 'W'],
      [315, 'NW'],
    ];
    for (const [deg, label] of pairs) {
      expect(compass8Direction(degreesToRadians(deg))).toBe(label);
    }
  });

  it('rounds intermediate bearings to the nearest compass point', () => {
    expect(compass8Direction(degreesToRadians(10))).toBe('N');
    expect(compass8Direction(degreesToRadians(30))).toBe('NE');
    expect(compass8Direction(degreesToRadians(359))).toBe('N');
  });
});

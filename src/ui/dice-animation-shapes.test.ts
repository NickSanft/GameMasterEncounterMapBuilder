import { describe, it, expect } from 'vitest';
import {
  shapeForSides,
  faceValues,
  randomFace,
  faceLabel,
  flattenGroups,
  buildTumbleFrames,
} from './dice-animation-shapes.js';

describe('shapeForSides', () => {
  it('returns the canonical shape for each standard die', () => {
    for (const sides of [4, 6, 8, 10, 12, 20, 100]) {
      const s = shapeForSides(sides);
      expect(s.id).toBe(`d${sides}`);
      expect(s.points.length).toBeGreaterThan(0);
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('falls back to the generic hexagon for non-standard sides', () => {
    expect(shapeForSides(7).id).toBe('other');
    expect(shapeForSides(30).id).toBe('other');
    expect(shapeForSides(1).id).toBe('other');
  });

  it('each standard shape has distinct points (no accidental duplicates)', () => {
    const points = new Set(
      [4, 6, 8, 10, 12, 20, 100].map((s) => shapeForSides(s).points),
    );
    expect(points.size).toBe(7);
  });
});

describe('faceValues', () => {
  it('returns [1..sides] for standard dice', () => {
    expect(faceValues(4)).toEqual([1, 2, 3, 4]);
    expect(faceValues(6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(faceValues(100).length).toBe(100);
    expect(faceValues(100)[0]).toBe(1);
    expect(faceValues(100)[99]).toBe(100);
  });

  it('returns empty for non-positive / non-finite sides', () => {
    expect(faceValues(0)).toEqual([]);
    expect(faceValues(-5)).toEqual([]);
    expect(faceValues(Number.NaN)).toEqual([]);
    expect(faceValues(Number.POSITIVE_INFINITY)).toEqual([]);
  });

  it('caps runaway sides at 9999 to prevent browser hangs', () => {
    expect(faceValues(50000).length).toBe(9999);
  });
});

describe('randomFace', () => {
  it('produces values in [1, sides]', () => {
    for (let i = 0; i < 100; i++) {
      const v = randomFace(20);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(20);
    }
  });

  it('uses the injected rng deterministically', () => {
    const rng = () => 0.5; // always 0.5
    expect(randomFace(6, rng)).toBe(4); // floor(0.5*6)+1 = 4
    expect(randomFace(20, rng)).toBe(11); // floor(0.5*20)+1 = 11
  });

  it('returns 0 for invalid sides', () => {
    expect(randomFace(0)).toBe(0);
    expect(randomFace(-1)).toBe(0);
    expect(randomFace(Number.NaN)).toBe(0);
  });
});

describe('faceLabel', () => {
  it('renders most dice as the bare number', () => {
    expect(faceLabel(20, 17)).toBe('17');
    expect(faceLabel(6, 1)).toBe('1');
  });

  it('renders d100 as a zero-padded two-digit string', () => {
    expect(faceLabel(100, 5)).toBe('05');
    expect(faceLabel(100, 99)).toBe('99');
  });

  it('renders d100 max (100) as "00" per the classic TTRPG convention', () => {
    expect(faceLabel(100, 100)).toBe('00');
  });
});

describe('flattenGroups', () => {
  it('expands every group into one FlatRoll per die in order', () => {
    const groups = [
      { sides: 20, sign: 1 as const, rolls: [15], kept: [true] },
      { sides: 6, sign: 1 as const, rolls: [3, 5, 2], kept: [true, true, true] },
    ];
    const flat = flattenGroups(groups);
    expect(flat).toHaveLength(4);
    expect(flat[0]).toEqual({ sides: 20, value: 15, kept: true, sign: 1 });
    expect(flat[1]).toEqual({ sides: 6, value: 3, kept: true, sign: 1 });
    expect(flat[3]).toEqual({ sides: 6, value: 2, kept: true, sign: 1 });
  });

  it('preserves the kept flag (keep-highest / keep-lowest)', () => {
    const groups = [
      {
        sides: 6,
        sign: 1 as const,
        rolls: [1, 6, 3, 4],
        kept: [false, true, true, true],
      },
    ];
    const flat = flattenGroups(groups);
    expect(flat.map((f) => f.kept)).toEqual([false, true, true, true]);
  });

  it('propagates the sign onto every die in a negative group', () => {
    const groups = [
      { sides: 4, sign: -1 as const, rolls: [2, 3], kept: [true, true] },
    ];
    const flat = flattenGroups(groups);
    expect(flat.every((f) => f.sign === -1)).toBe(true);
  });

  it('defaults missing kept entries to true', () => {
    const groups = [{ sides: 6, sign: 1 as const, rolls: [4], kept: [] }];
    const flat = flattenGroups(groups);
    expect(flat[0]?.kept).toBe(true);
  });
});

describe('buildTumbleFrames', () => {
  it('produces frameCount entries', () => {
    const frames = buildTumbleFrames(20, 15, 10);
    expect(frames).toHaveLength(10);
    expect(frames.every((f) => f >= 1 && f <= 20)).toBe(true);
  });

  it('never lands on the final value as its last frame', () => {
    // With a seeded rng that WOULD produce the final value, verify
    // the helper rejects it and loops until it finds something else.
    let call = 0;
    const rng = () => {
      call++;
      // Alternate between a value that maps to finalValue and one that doesn't.
      // floor(0.95*6)+1 = 6; floor(0.0*6)+1 = 1.
      return call % 2 === 1 ? 0.95 : 0.0;
    };
    const frames = buildTumbleFrames(6, 6, 8, rng);
    expect(frames[frames.length - 1]).not.toBe(6);
  });

  it('degenerates gracefully for 1-sided dice', () => {
    // No variety → just repeat the final value.
    const frames = buildTumbleFrames(1, 1, 5);
    expect(frames).toEqual([1, 1, 1, 1, 1]);
  });

  it('returns [] for zero frameCount', () => {
    expect(buildTumbleFrames(6, 3, 0)).toEqual([]);
  });
});

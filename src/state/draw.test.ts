import { describe, it, expect } from 'vitest';
import {
  appendStrokePoint,
  hitTestStroke,
  hitTestStrokes,
  STROKE_MIN_POINT_DISTANCE,
} from './draw.js';
import type { DrawStroke } from './types.js';

function stroke(
  overrides: Partial<DrawStroke> & { points: Array<{ x: number; y: number }> },
): DrawStroke {
  return {
    id: overrides.id ?? 'stroke-' + Math.random().toString(36).slice(2, 7),
    color: overrides.color ?? '#ff0000',
    width: overrides.width ?? 4,
    visibility: overrides.visibility ?? 'shared',
    points: overrides.points,
  };
}

describe('appendStrokePoint', () => {
  it('seeds an empty stroke with the given point', () => {
    const out = appendStrokePoint([], 5, 7);
    expect(out).toEqual([{ x: 5, y: 7 }]);
  });

  it('appends when the new point is far enough', () => {
    const out = appendStrokePoint([{ x: 0, y: 0 }], 10, 0);
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual({ x: 10, y: 0 });
  });

  it('drops points below the minimum distance threshold', () => {
    const input = [{ x: 0, y: 0 }];
    const out = appendStrokePoint(input, STROKE_MIN_POINT_DISTANCE / 2, 0);
    expect(out).toHaveLength(1);
    expect(out).not.toBe(input);
  });

  it('respects the custom minDistance argument', () => {
    const out1 = appendStrokePoint([{ x: 0, y: 0 }], 3, 0, 5);
    expect(out1).toHaveLength(1);
    const out2 = appendStrokePoint([{ x: 0, y: 0 }], 5, 0, 5);
    expect(out2).toHaveLength(2);
  });

  it('does not mutate the input array', () => {
    const input: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
    appendStrokePoint(input, 10, 0);
    expect(input).toEqual([{ x: 0, y: 0 }]);
  });
});

describe('hitTestStroke', () => {
  const s = stroke({
    width: 4,
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
  });

  it('returns true for a point near the segment (within width/2 + slop)', () => {
    expect(hitTestStroke(s, 50, 0)).toBe(true);
    expect(hitTestStroke(s, 50, 5)).toBe(true); // within 4/2 + 4 = 6
  });

  it('returns false for a point well away from the segment', () => {
    expect(hitTestStroke(s, 50, 40)).toBe(false);
  });

  it('includes the endpoints', () => {
    expect(hitTestStroke(s, 0, 0)).toBe(true);
    expect(hitTestStroke(s, 100, 0)).toBe(true);
  });

  it('handles single-point strokes', () => {
    const dot = stroke({ width: 6, points: [{ x: 10, y: 10 }] });
    expect(hitTestStroke(dot, 10, 12)).toBe(true);
    expect(hitTestStroke(dot, 10, 40)).toBe(false);
  });

  it('returns false for an empty stroke', () => {
    const empty = stroke({ points: [] });
    expect(hitTestStroke(empty, 0, 0)).toBe(false);
  });

  it('scales hitbox with stroke width', () => {
    const thin = stroke({ width: 1, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] });
    const thick = stroke({ width: 30, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] });
    expect(hitTestStroke(thin, 50, 12)).toBe(false);
    expect(hitTestStroke(thick, 50, 12)).toBe(true);
  });
});

describe('hitTestStrokes', () => {
  it('returns the top-most stroke under the point', () => {
    const bottom = stroke({
      id: 'bot',
      color: '#bbb',
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    });
    const top = stroke({
      id: 'top',
      color: '#fff',
      points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    });
    expect(hitTestStrokes([bottom, top], 50, 0)?.id).toBe('top');
  });

  it('returns null on a miss', () => {
    const s1 = stroke({ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] });
    expect(hitTestStrokes([s1], 500, 500)).toBeNull();
  });
});

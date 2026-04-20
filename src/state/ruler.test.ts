import { describe, it, expect } from 'vitest';
import {
  RULER_PRESETS,
  clampToRadius,
  feetToWorldPx,
  formatRulerLabel,
} from './ruler.js';

describe('RULER_PRESETS', () => {
  it('has a "Free" entry with feet=null bound to the 0 shortcut', () => {
    const free = RULER_PRESETS.find((p) => p.shortcut === '0');
    expect(free).toBeDefined();
    expect(free!.feet).toBeNull();
  });

  it('has five feet-valued presets covering common 5e reaches', () => {
    const feets = RULER_PRESETS.filter((p) => p.feet !== null).map((p) => p.feet);
    expect(feets).toEqual([5, 30, 60, 90, 120]);
  });

  it('uses unique keyboard shortcuts', () => {
    const shortcuts = RULER_PRESETS.map((p) => p.shortcut);
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });
});

describe('clampToRadius', () => {
  it('scales the endpoint to exactly the target length along the same direction', () => {
    const out = clampToRadius(0, 0, 30, 40, 10);
    // Original length = 50, scale = 10/50 = 0.2. So endX = 6, endY = 8.
    expect(out.endX).toBeCloseTo(6, 6);
    expect(out.endY).toBeCloseTo(8, 6);
    expect(Math.hypot(out.endX, out.endY)).toBeCloseTo(10, 6);
  });

  it('preserves negative direction', () => {
    const out = clampToRadius(100, 100, 80, 100, 10);
    expect(out.endX).toBeCloseTo(90, 6);
    expect(out.endY).toBeCloseTo(100, 6);
  });

  it('returns start when vector length is zero', () => {
    const out = clampToRadius(5, 7, 5, 7, 10);
    expect(out).toEqual({ endX: 5, endY: 7 });
  });

  it('returns start when target is non-positive / non-finite', () => {
    expect(clampToRadius(0, 0, 30, 40, 0)).toEqual({ endX: 0, endY: 0 });
    expect(clampToRadius(0, 0, 30, 40, -5)).toEqual({ endX: 0, endY: 0 });
    expect(clampToRadius(0, 0, 30, 40, NaN)).toEqual({ endX: 0, endY: 0 });
  });

  it('can extend a short vector (scale > 1)', () => {
    const out = clampToRadius(0, 0, 3, 4, 50);
    expect(Math.hypot(out.endX, out.endY)).toBeCloseTo(50, 6);
  });
});

describe('feetToWorldPx', () => {
  it('converts feet → squares → world pixels using feetPerSquare + cellSize', () => {
    expect(feetToWorldPx(30, 5, 50)).toBe(300); // 6 squares × 50px
    expect(feetToWorldPx(5, 5, 50)).toBe(50);
    expect(feetToWorldPx(120, 10, 40)).toBe(480); // 12 squares × 40px
  });

  it('falls back to 5 ft/square for non-finite or non-positive feetPerSquare', () => {
    expect(feetToWorldPx(30, 0, 50)).toBe(300);
    expect(feetToWorldPx(30, NaN, 50)).toBe(300);
    expect(feetToWorldPx(30, -3, 50)).toBe(300);
  });
});

describe('formatRulerLabel', () => {
  it('uses formatDistance for the base string (squares unit)', () => {
    expect(formatRulerLabel(6, 'squares', 5, null)).toBe('6 sq');
  });

  it('uses formatDistance for the base string (feet unit)', () => {
    expect(formatRulerLabel(6, 'feet', 5, null)).toBe('30 ft');
  });

  it('appends "· preset" when a preset is active', () => {
    expect(formatRulerLabel(6, 'feet', 5, 30)).toBe('30 ft · preset');
  });
});

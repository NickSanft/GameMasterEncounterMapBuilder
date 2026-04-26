import { describe, it, expect } from 'vitest';
import {
  parseHex,
  relativeLuminance,
  contrastRatio,
  meetsThreshold,
  formatRatio,
  WCAG,
} from './contrast.js';

describe('parseHex', () => {
  it('parses 6-digit hex with leading #', () => {
    expect(parseHex('#ff0000')).toEqual([255, 0, 0]);
  });

  it('parses 6-digit hex without leading #', () => {
    expect(parseHex('ff0000')).toEqual([255, 0, 0]);
  });

  it('parses 3-digit hex (each digit doubled)', () => {
    expect(parseHex('#f00')).toEqual([255, 0, 0]);
    expect(parseHex('#abc')).toEqual([0xaa, 0xbb, 0xcc]);
  });

  it('ignores alpha in 8-digit hex', () => {
    expect(parseHex('#ff000080')).toEqual([255, 0, 0]);
  });

  it('handles uppercase + mixed-case', () => {
    expect(parseHex('#FF00ff')).toEqual([255, 0, 255]);
  });

  it('throws on garbage input', () => {
    expect(() => parseHex('blue')).toThrow(/not a hex color/);
    expect(() => parseHex('#12')).toThrow(/not a hex color/);
    expect(() => parseHex('')).toThrow(/not a hex color/);
  });
});

describe('relativeLuminance', () => {
  it('is 1 for pure white', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 6);
  });

  it('is 0 for pure black', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
  });

  it('weights green most, blue least (WCAG coefficients)', () => {
    const r = relativeLuminance([255, 0, 0]);
    const g = relativeLuminance([0, 255, 0]);
    const b = relativeLuminance([0, 0, 255]);
    expect(g).toBeGreaterThan(r);
    expect(r).toBeGreaterThan(b);
  });

  it('respects the 0.03928 sRGB-piecewise threshold', () => {
    // Just above the linear-segment threshold (10/255 ≈ 0.0392, just under).
    const low = relativeLuminance([10, 10, 10]);
    expect(low).toBeGreaterThan(0);
    expect(low).toBeLessThan(0.005);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for pure white on pure black', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 1);
  });

  it('is 1:1 for identical colors', () => {
    expect(contrastRatio('#abcdef', '#abcdef')).toBeCloseTo(1, 6);
  });

  it('is symmetric (order-independent)', () => {
    const a = contrastRatio('#ff0000', '#000000');
    const b = contrastRatio('#000000', '#ff0000');
    expect(a).toBeCloseTo(b, 10);
  });

  // Spot-check a known WCAG example value (medium grey #767676 on white
  // is a famous "right at AA" example — ~4.54:1).
  it('matches a published reference value (#767676 on white ≈ 4.54:1)', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 1);
  });
});

describe('meetsThreshold + WCAG constants', () => {
  it('returns true when the ratio meets/exceeds the threshold', () => {
    expect(meetsThreshold('#000000', '#ffffff', WCAG.AAA_NORMAL_TEXT)).toBe(true);
    expect(meetsThreshold('#000000', '#ffffff', WCAG.AA_NORMAL_TEXT)).toBe(true);
  });

  it('returns false when below the threshold', () => {
    // Light grey on white: ~1.6:1 — well below AA.
    expect(meetsThreshold('#dddddd', '#ffffff', WCAG.AA_NORMAL_TEXT)).toBe(false);
  });
});

describe('formatRatio', () => {
  it('renders with two decimals + ":1" suffix', () => {
    expect(formatRatio(4.52349)).toBe('4.52:1');
    expect(formatRatio(1)).toBe('1.00:1');
    expect(formatRatio(21)).toBe('21.00:1');
  });
});

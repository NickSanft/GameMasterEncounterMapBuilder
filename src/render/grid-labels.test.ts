import { describe, it, expect } from 'vitest';
import { columnLetter, rowLabel, cellName } from './grid-labels.js';

describe('columnLetter', () => {
  it('returns single letters for 1–26', () => {
    expect(columnLetter(1)).toBe('A');
    expect(columnLetter(2)).toBe('B');
    expect(columnLetter(26)).toBe('Z');
  });

  it('rolls over into two letters at 27', () => {
    expect(columnLetter(27)).toBe('AA');
    expect(columnLetter(28)).toBe('AB');
    expect(columnLetter(52)).toBe('AZ');
    expect(columnLetter(53)).toBe('BA');
  });

  it('handles 3-letter ranges', () => {
    // 26 + 26*26 = 702 → ZZ. 703 → AAA.
    expect(columnLetter(702)).toBe('ZZ');
    expect(columnLetter(703)).toBe('AAA');
  });

  it('returns empty string for non-positive or non-finite input', () => {
    expect(columnLetter(0)).toBe('');
    expect(columnLetter(-5)).toBe('');
    expect(columnLetter(NaN)).toBe('');
    expect(columnLetter(Infinity)).toBe('');
  });

  it('floors fractional input', () => {
    expect(columnLetter(2.9)).toBe('B');
  });
});

describe('rowLabel', () => {
  it('stringifies positive integers', () => {
    expect(rowLabel(1)).toBe('1');
    expect(rowLabel(27)).toBe('27');
    expect(rowLabel(100)).toBe('100');
  });

  it('returns empty for non-positive / non-finite', () => {
    expect(rowLabel(0)).toBe('');
    expect(rowLabel(-1)).toBe('');
    expect(rowLabel(NaN)).toBe('');
  });
});

describe('cellName', () => {
  it('combines column-letter and row-number', () => {
    expect(cellName(0, 0)).toBe('A1');
    expect(cellName(3, 2)).toBe('D3');
    expect(cellName(26, 9)).toBe('AA10');
  });
});

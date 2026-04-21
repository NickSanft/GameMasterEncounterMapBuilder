import { describe, it, expect } from 'vitest';
import { compactFogRects, fogEquals } from './fog-rects.js';

function fogFromRows(rows: string[]): Uint8Array {
  // Each row: '0' or '1' chars. '0' = hidden, '1' = revealed.
  const cols = rows[0]?.length ?? 0;
  const fog = new Uint8Array(cols * rows.length);
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y]!;
    for (let x = 0; x < cols; x++) fog[y * cols + x] = row[x] === '0' ? 0 : 1;
  }
  return fog;
}

describe('compactFogRects', () => {
  it('returns empty for zero-sized grids', () => {
    expect(compactFogRects(new Uint8Array(), 0, 0)).toEqual([]);
    expect(compactFogRects(new Uint8Array([0]), 0, 0)).toEqual([]);
    expect(compactFogRects(new Uint8Array([0]), 1, 0)).toEqual([]);
  });

  it('emits one rect per contiguous hidden run within a row', () => {
    // 5 cols × 1 row, hidden = 0:  0 0 1 0 0
    const fog = fogFromRows(['00100']);
    expect(compactFogRects(fog, 5, 1)).toEqual([
      { x: 0, y: 0, w: 2 },
      { x: 3, y: 0, w: 2 },
    ]);
  });

  it('handles all-hidden rows as a single full-width rect', () => {
    const fog = fogFromRows(['0000', '0000']);
    expect(compactFogRects(fog, 4, 2)).toEqual([
      { x: 0, y: 0, w: 4 },
      { x: 0, y: 1, w: 4 },
    ]);
  });

  it('handles all-revealed grids as no rects at all', () => {
    const fog = fogFromRows(['111', '111']);
    expect(compactFogRects(fog, 3, 2)).toEqual([]);
  });

  it('treats anything other than 0 as revealed', () => {
    // Manually set a value of 2 (should be treated as revealed).
    const fog = new Uint8Array([0, 2, 0]);
    expect(compactFogRects(fog, 3, 1)).toEqual([
      { x: 0, y: 0, w: 1 },
      { x: 2, y: 0, w: 1 },
    ]);
  });

  it('does not merge runs across row boundaries', () => {
    // 2×2 fully hidden — two separate row rects, not one merged block.
    const fog = fogFromRows(['00', '00']);
    expect(compactFogRects(fog, 2, 2)).toEqual([
      { x: 0, y: 0, w: 2 },
      { x: 0, y: 1, w: 2 },
    ]);
  });

  it('matches expectations on a checkerboard', () => {
    // 4×2 checker, top row 0101, bottom 1010 (hidden = 0).
    const fog = fogFromRows(['0101', '1010']);
    expect(compactFogRects(fog, 4, 2)).toEqual([
      { x: 0, y: 0, w: 1 },
      { x: 2, y: 0, w: 1 },
      { x: 1, y: 1, w: 1 },
      { x: 3, y: 1, w: 1 },
    ]);
  });

  it('emits the trailing-hidden rect when the row ends inside a run', () => {
    // 5 cols, hidden tail of length 3.
    const fog = fogFromRows(['11000']);
    expect(compactFogRects(fog, 5, 1)).toEqual([
      { x: 2, y: 0, w: 3 },
    ]);
  });
});

describe('fogEquals', () => {
  it('returns true on identical buffers', () => {
    const a = new Uint8Array([0, 1, 0, 1]);
    const b = new Uint8Array([0, 1, 0, 1]);
    expect(fogEquals(a, b)).toBe(true);
  });

  it('returns false when any byte differs', () => {
    const a = new Uint8Array([0, 1, 0, 1]);
    const b = new Uint8Array([0, 1, 1, 1]);
    expect(fogEquals(a, b)).toBe(false);
  });

  it('returns false on different lengths', () => {
    expect(fogEquals(new Uint8Array([0, 1]), new Uint8Array([0, 1, 0]))).toBe(false);
  });

  it('returns true for two empty buffers', () => {
    expect(fogEquals(new Uint8Array(), new Uint8Array())).toBe(true);
  });
});

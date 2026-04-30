/**
 * Phase 130 — grid-coords helper tests.
 */
import { describe, it, expect } from 'vitest';
import {
  tokenCenterWorld,
  worldToCell,
  commitDragToCell,
} from './grid-coords.js';
import type { GridConfig, Token } from './types.js';
import { hexCenter } from '../render/hex-geometry.js';

const SQUARE_GRID: GridConfig = {
  cols: 30,
  rows: 20,
  cellSize: 50,
  showGridLines: true,
  gridShape: 'square',
};

const HEX_GRID: GridConfig = {
  cols: 30,
  rows: 20,
  cellSize: 50,
  showGridLines: true,
  gridShape: 'hex',
};

function tk(over: Partial<Token> = {}): Token {
  return {
    id: over.id ?? 't',
    x: over.x ?? 0,
    y: over.y ?? 0,
    label: '',
    color: '#888',
    imageId: null,
    size: over.size ?? 1,
    borderColor: null,
    hp: null,
    conditions: [],
    rotation: 0,
    losRadius: null,
    light: null,
    initiativeMod: 0,
    conditionExpirations: {},
    deathSaves: { successes: 0, failures: 0 },
    ownerId: null,
  };
}

describe('tokenCenterWorld — square', () => {
  it('size-1 token at (0,0) centers at (cellSize/2, cellSize/2)', () => {
    expect(tokenCenterWorld(tk({ x: 0, y: 0, size: 1 }), SQUARE_GRID)).toEqual({
      x: 25,
      y: 25,
    });
  });

  it('size-2 token at (3, 4) centers at the footprint center', () => {
    // (3 + 1) * 50 = 200; (4 + 1) * 50 = 250
    expect(tokenCenterWorld(tk({ x: 3, y: 4, size: 2 }), SQUARE_GRID)).toEqual({
      x: 200,
      y: 250,
    });
  });
});

describe('tokenCenterWorld — hex', () => {
  it('hex-mode size-1 token at (0,0) matches hexCenter(0, 0)', () => {
    expect(tokenCenterWorld(tk({ x: 0, y: 0 }), HEX_GRID)).toEqual(
      hexCenter(0, 0, 50),
    );
  });

  it('hex-mode size-1 token at (3, 4) matches hexCenter(3, 4)', () => {
    expect(tokenCenterWorld(tk({ x: 3, y: 4 }), HEX_GRID)).toEqual(
      hexCenter(3, 4, 50),
    );
  });

  it('hex-mode rounds non-integer x/y before passing to hexCenter', () => {
    // A token with fractional x/y still picks an integer hex (the
    // rounded one). Pre-130 code never produced fractional Token.x
    // for hex but defending against it keeps the helper robust.
    expect(tokenCenterWorld(tk({ x: 2.7, y: 4.3 }), HEX_GRID)).toEqual(
      hexCenter(3, 4, 50),
    );
  });
});

describe('worldToCell — square', () => {
  it('floors x/y by cellSize', () => {
    expect(worldToCell(120, 270, SQUARE_GRID)).toEqual({ col: 2, row: 5 });
  });

  it('exact cell boundary returns the lower cell', () => {
    expect(worldToCell(100, 100, SQUARE_GRID)).toEqual({ col: 2, row: 2 });
  });
});

describe('worldToCell — hex', () => {
  it('center of a hex round-trips through worldToCell', () => {
    const c = hexCenter(3, 4, 50);
    expect(worldToCell(c.x, c.y, HEX_GRID)).toEqual({ col: 3, row: 4 });
  });

  it('center of (1, 1) (odd row) round-trips', () => {
    const c = hexCenter(1, 1, 50);
    expect(worldToCell(c.x, c.y, HEX_GRID)).toEqual({ col: 1, row: 1 });
  });
});

describe('commitDragToCell — square', () => {
  it('no-op delta returns the same cell', () => {
    expect(commitDragToCell(tk({ x: 5, y: 5 }), SQUARE_GRID, 0, 0)).toEqual({
      col: 5,
      row: 5,
    });
  });

  it('one-cell delta lands one cell over', () => {
    // size=1 center at (5.5, 5.5)*50 = (275, 275). +50 = 325 → cell 6.
    expect(commitDragToCell(tk({ x: 5, y: 5 }), SQUARE_GRID, 50, 0)).toEqual({
      col: 6,
      row: 5,
    });
  });
});

describe('commitDragToCell — hex', () => {
  it('hex no-op delta returns the same cell', () => {
    expect(commitDragToCell(tk({ x: 5, y: 5 }), HEX_GRID, 0, 0)).toEqual({
      col: 5,
      row: 5,
    });
  });

  it('hex horizontal-stride delta lands on the next col, same row', () => {
    // Pointy-top hex horizontal stride = sqrt(3) * size ≈ 86.6
    expect(
      commitDragToCell(tk({ x: 3, y: 4 }), HEX_GRID, Math.sqrt(3) * 50, 0),
    ).toEqual({ col: 4, row: 4 });
  });
});

import { describe, it, expect } from 'vitest';
import {
  collectLassoHits,
  collectAnnotationLassoHits,
  collectAoeLassoHits,
  collectWallLassoHits,
  segmentIntersectsRect,
} from './lasso.js';
import type { Annotation, AoeTemplate, Token, Wall } from '../state/types.js';

function wall(partial: Partial<Wall> & { id: string }): Wall {
  return {
    id: partial.id,
    x1: partial.x1 ?? 0,
    y1: partial.y1 ?? 0,
    x2: partial.x2 ?? 100,
    y2: partial.y2 ?? 0,
    blocksSight: partial.blocksSight ?? true,
    blocksMovement: partial.blocksMovement ?? true,
  };
}

function annot(partial: Partial<Annotation> & { id: string }): Annotation {
  return {
    id: partial.id,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    text: partial.text ?? '',
    color: partial.color ?? '#fdd835',
    visibility: partial.visibility ?? 'shared',
  };
}

function token(partial: Partial<Token> & { id: string }): Token {
  return {
    id: partial.id,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    label: partial.label ?? partial.id,
    color: partial.color ?? '#ffffff',
    imageId: partial.imageId ?? null,
    size: partial.size ?? 1,
    borderColor: partial.borderColor ?? null,
    hp: partial.hp ?? null,
    conditions: partial.conditions ?? [],
    rotation: partial.rotation ?? 0,
    losRadius: partial.losRadius ?? null,
    light: partial.light ?? null,
    initiativeMod: partial.initiativeMod ?? 0,
  };
}

describe('collectLassoHits', () => {
  const cellSize = 50;

  it('returns empty when the rectangle has zero area', () => {
    const tokens = [token({ id: 'a', x: 3, y: 3 })];
    expect(
      collectLassoHits(tokens, cellSize, { x1: 100, y1: 100, x2: 100, y2: 100 }),
    ).toEqual([]);
  });

  it('selects tokens whose centers fall inside the rectangle', () => {
    const tokens = [
      token({ id: 'a', x: 3, y: 3 }), // center at (175, 175)
      token({ id: 'b', x: 5, y: 5 }), // center at (275, 275)
      token({ id: 'c', x: 10, y: 10 }), // center at (525, 525)
    ];
    const hits = collectLassoHits(tokens, cellSize, {
      x1: 100,
      y1: 100,
      x2: 300,
      y2: 300,
    });
    expect(hits.sort()).toEqual(['a', 'b']);
  });

  it('normalizes inverted rectangles', () => {
    const tokens = [token({ id: 'a', x: 3, y: 3 })];
    const hits = collectLassoHits(tokens, cellSize, {
      x1: 300,
      y1: 300,
      x2: 100,
      y2: 100,
    });
    expect(hits).toEqual(['a']);
  });

  it('counts centers of large tokens correctly', () => {
    // Size-2 token at (0,0) has center at (cellSize, cellSize) = (50, 50)
    const tokens = [token({ id: 'big', x: 0, y: 0, size: 2 })];
    expect(
      collectLassoHits(tokens, cellSize, { x1: 0, y1: 0, x2: 60, y2: 60 }),
    ).toEqual(['big']);
    expect(
      collectLassoHits(tokens, cellSize, { x1: 100, y1: 100, x2: 150, y2: 150 }),
    ).toEqual([]);
  });

  it('ignores tokens entirely outside the rectangle', () => {
    const tokens = [
      token({ id: 'far', x: 25, y: 25 }),
      token({ id: 'near', x: 2, y: 2 }),
    ];
    const hits = collectLassoHits(tokens, cellSize, {
      x1: 0,
      y1: 0,
      x2: 200,
      y2: 200,
    });
    expect(hits).toEqual(['near']);
  });
});

describe('collectAnnotationLassoHits', () => {
  it('selects annotations whose anchor is inside the rectangle', () => {
    const annotations = [
      annot({ id: 'a', x: 50, y: 50 }),
      annot({ id: 'b', x: 300, y: 300 }),
      annot({ id: 'c', x: 150, y: 150 }),
    ];
    const hits = collectAnnotationLassoHits(annotations, {
      x1: 0,
      y1: 0,
      x2: 200,
      y2: 200,
    });
    expect(hits.sort()).toEqual(['a', 'c']);
  });

  it('returns empty for a zero-area rectangle', () => {
    const annotations = [annot({ id: 'a', x: 50, y: 50 })];
    expect(
      collectAnnotationLassoHits(annotations, { x1: 0, y1: 0, x2: 0, y2: 0 }),
    ).toEqual([]);
  });

  it('normalizes inverted rectangles', () => {
    const annotations = [annot({ id: 'a', x: 50, y: 50 })];
    expect(
      collectAnnotationLassoHits(annotations, { x1: 200, y1: 200, x2: 0, y2: 0 }),
    ).toEqual(['a']);
  });
});

function aoe(partial: Partial<AoeTemplate> & { id: string; kind: AoeTemplate['kind'] }): AoeTemplate {
  return {
    id: partial.id,
    kind: partial.kind,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    length: partial.length ?? 100,
    width: partial.width ?? 50,
    rotation: partial.rotation ?? 0,
    color: partial.color ?? '#ff7043',
    visibility: partial.visibility ?? 'shared',
  };
}

describe('collectAoeLassoHits', () => {
  it('selects non-cube AoEs by origin point', () => {
    const templates = [
      aoe({ id: 's', kind: 'sphere', x: 50, y: 50 }),
      aoe({ id: 'c', kind: 'cone', x: 300, y: 50 }),
    ];
    const hits = collectAoeLassoHits(templates, {
      x1: 0,
      y1: 0,
      x2: 200,
      y2: 200,
    });
    expect(hits).toEqual(['s']);
  });

  it('selects cubes by center point, not top-left corner', () => {
    // Cube with top-left (200,200) and size 100x100 → center (250,250)
    const templates = [aoe({ id: 'cube', kind: 'cube', x: 200, y: 200, length: 100, width: 100 })];
    // Lasso covering only the center area, not the corner
    const hits = collectAoeLassoHits(templates, {
      x1: 220,
      y1: 220,
      x2: 260,
      y2: 260,
    });
    expect(hits).toEqual(['cube']);
  });
});

describe('segmentIntersectsRect', () => {
  // Test rect: (10, 10)–(50, 50)
  const r = { minX: 10, minY: 10, maxX: 50, maxY: 50 };

  it('returns true when both endpoints are inside the rect', () => {
    expect(segmentIntersectsRect(20, 20, 40, 40, r.minX, r.minY, r.maxX, r.maxY)).toBe(true);
  });

  it('returns true when one endpoint is inside the rect', () => {
    expect(segmentIntersectsRect(20, 20, 100, 100, r.minX, r.minY, r.maxX, r.maxY)).toBe(true);
  });

  it('returns true when both endpoints are outside but the segment crosses an edge', () => {
    // Diagonal cuts through the rect from upper-left to lower-right.
    expect(segmentIntersectsRect(0, 30, 100, 30, r.minX, r.minY, r.maxX, r.maxY)).toBe(true);
  });

  it('returns false when the segment is entirely outside and doesn\'t cross any edge', () => {
    expect(segmentIntersectsRect(60, 60, 80, 80, r.minX, r.minY, r.maxX, r.maxY)).toBe(false);
  });

  it('returns false for a parallel segment skimming alongside (no crossing)', () => {
    expect(segmentIntersectsRect(0, 60, 100, 60, r.minX, r.minY, r.maxX, r.maxY)).toBe(false);
  });
});

describe('collectWallLassoHits', () => {
  it('catches walls whose segment crosses the lasso rect', () => {
    const walls = [
      wall({ id: 'crosses', x1: 0, y1: 30, x2: 100, y2: 30 }),
      wall({ id: 'inside', x1: 20, y1: 20, x2: 40, y2: 40 }),
      wall({ id: 'outside', x1: 100, y1: 100, x2: 200, y2: 200 }),
    ];
    const hits = collectWallLassoHits(walls, { x1: 10, y1: 10, x2: 50, y2: 50 });
    expect(hits.sort()).toEqual(['crosses', 'inside']);
  });

  it('returns an empty array when no walls touch the lasso', () => {
    const walls = [wall({ id: 'far', x1: 100, y1: 100, x2: 200, y2: 100 })];
    const hits = collectWallLassoHits(walls, { x1: 0, y1: 0, x2: 50, y2: 50 });
    expect(hits).toEqual([]);
  });

  it('catches walls with one endpoint inside the rect', () => {
    const walls = [wall({ id: 'half', x1: 30, y1: 30, x2: 200, y2: 30 })];
    const hits = collectWallLassoHits(walls, { x1: 10, y1: 10, x2: 50, y2: 50 });
    expect(hits).toEqual(['half']);
  });

  it('handles a normalized-or-not lasso rect (x1>x2, y1>y2)', () => {
    const walls = [wall({ id: 'inside', x1: 20, y1: 20, x2: 40, y2: 40 })];
    // Reversed corners — lasso normalisation should still pick it up.
    const hits = collectWallLassoHits(walls, { x1: 50, y1: 50, x2: 10, y2: 10 });
    expect(hits).toEqual(['inside']);
  });
});

import { describe, it, expect } from 'vitest';
import { collectLassoHits, collectAnnotationLassoHits } from './lasso.js';
import type { Annotation, Token } from '../state/types.js';

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

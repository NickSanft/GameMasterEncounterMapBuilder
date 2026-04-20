import { describe, it, expect } from 'vitest';
import {
  collectLassoHits,
  collectAnnotationLassoHits,
  collectAoeLassoHits,
} from './lasso.js';
import type { Annotation, AoeTemplate, Token } from '../state/types.js';

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

import { describe, it, expect } from 'vitest';
import { hitTestAnnotation, isAnnotationVisible } from './hit-test-annotation.js';
import type { Annotation } from '../state/types.js';

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

describe('hitTestAnnotation', () => {
  it('hits the annotation at its anchor', () => {
    const a = annot({ id: 'a', x: 100, y: 200 });
    expect(hitTestAnnotation([a], 100, 200)?.id).toBe('a');
  });

  it('misses outside the radius', () => {
    const a = annot({ id: 'a', x: 100, y: 200 });
    expect(hitTestAnnotation([a], 200, 200)).toBeNull();
  });

  it('returns the topmost annotation when overlapping', () => {
    const a = annot({ id: 'a', x: 100, y: 100 });
    const b = annot({ id: 'b', x: 100, y: 100 });
    expect(hitTestAnnotation([a, b], 100, 100)?.id).toBe('b');
  });
});

describe('isAnnotationVisible', () => {
  const cols = 10;
  const rows = 10;
  const cellSize = 50;

  function makeFog(): Uint8Array {
    return new Uint8Array(cols * rows);
  }

  it('GM sees every annotation', () => {
    const a = annot({ id: 'a', x: 25, y: 25, visibility: 'gm' });
    expect(isAnnotationVisible(a, makeFog(), cols, rows, cellSize, 'gm')).toBe(true);
  });

  it('Spectator never sees GM-only annotations, even if the cell is revealed', () => {
    const a = annot({ id: 'a', x: 25, y: 25, visibility: 'gm' });
    const fog = makeFog();
    fog[0] = 1;
    expect(isAnnotationVisible(a, fog, cols, rows, cellSize, 'spectator')).toBe(false);
  });

  it('Spectator sees shared annotations only if the cell is revealed', () => {
    const a = annot({ id: 'a', x: 25, y: 25, visibility: 'shared' });
    const fog = makeFog();
    expect(isAnnotationVisible(a, fog, cols, rows, cellSize, 'spectator')).toBe(false);
    fog[0] = 1;
    expect(isAnnotationVisible(a, fog, cols, rows, cellSize, 'spectator')).toBe(true);
  });

  it('Spectator hides annotations off the grid', () => {
    const a = annot({ id: 'a', x: -10, y: -10, visibility: 'shared' });
    expect(isAnnotationVisible(a, makeFog(), cols, rows, cellSize, 'spectator')).toBe(false);
  });
});

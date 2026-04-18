import type { Annotation } from '../state/types.js';

const HIT_RADIUS = 14;

export function hitTestAnnotation(
  annotations: readonly Annotation[],
  wx: number,
  wy: number,
  radius = HIT_RADIUS,
): Annotation | null {
  const r2 = radius * radius;
  for (let i = annotations.length - 1; i >= 0; i--) {
    const a = annotations[i]!;
    const dx = wx - a.x;
    const dy = wy - a.y;
    if (dx * dx + dy * dy <= r2) return a;
  }
  return null;
}

export function isAnnotationVisible(
  a: Annotation,
  fog: Uint8Array,
  cols: number,
  rows: number,
  cellSize: number,
  mode: 'gm' | 'spectator',
): boolean {
  if (mode === 'gm') return true;
  if (a.visibility === 'gm') return false;
  const gx = Math.floor(a.x / cellSize);
  const gy = Math.floor(a.y / cellSize);
  if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return false;
  return fog[gy * cols + gx] === 1;
}

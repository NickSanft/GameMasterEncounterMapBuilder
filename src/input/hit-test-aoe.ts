import type { AoeTemplate } from '../state/types.js';

function insideSphere(t: AoeTemplate, wx: number, wy: number): boolean {
  const dx = wx - t.x;
  const dy = wy - t.y;
  return dx * dx + dy * dy <= t.length * t.length;
}

function insideCube(t: AoeTemplate, wx: number, wy: number): boolean {
  return (
    wx >= t.x && wx <= t.x + t.length && wy >= t.y && wy <= t.y + t.width
  );
}

function insideCone(t: AoeTemplate, wx: number, wy: number): boolean {
  const dx = wx - t.x;
  const dy = wy - t.y;
  const distSq = dx * dx + dy * dy;
  if (distSq > t.length * t.length) return false;
  const angle = Math.atan2(dy, dx);
  const aperture = (t.width * Math.PI) / 180;
  let delta = Math.abs(angle - t.rotation);
  if (delta > Math.PI) delta = 2 * Math.PI - delta;
  return delta <= aperture / 2;
}

function insideLine(t: AoeTemplate, wx: number, wy: number): boolean {
  // Rotate the test point into the line's local frame (origin at t.x, t.y, axis along +x).
  const dx = wx - t.x;
  const dy = wy - t.y;
  const cos = Math.cos(-t.rotation);
  const sin = Math.sin(-t.rotation);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  return (
    localX >= 0 &&
    localX <= t.length &&
    Math.abs(localY) <= t.width / 2
  );
}

function pointInTemplate(t: AoeTemplate, wx: number, wy: number): boolean {
  switch (t.kind) {
    case 'sphere':
      return insideSphere(t, wx, wy);
    case 'cube':
      return insideCube(t, wx, wy);
    case 'cone':
      return insideCone(t, wx, wy);
    case 'line':
      return insideLine(t, wx, wy);
  }
}

/**
 * Returns the topmost AoE template whose shape contains the world-space point.
 * Searched in reverse draw order so tokens stacked later win.
 */
export function hitTestAoe(
  templates: readonly AoeTemplate[],
  wx: number,
  wy: number,
): AoeTemplate | null {
  for (let i = templates.length - 1; i >= 0; i--) {
    const t = templates[i]!;
    if (pointInTemplate(t, wx, wy)) return t;
  }
  return null;
}

export function isAoeVisible(
  t: AoeTemplate,
  fog: Uint8Array,
  cols: number,
  rows: number,
  cellSize: number,
  mode: 'gm' | 'spectator',
): boolean {
  if (mode === 'gm') return true;
  if (t.visibility === 'gm') return false;
  // Anchor cell — same rule as annotations. If the origin cell is revealed, show.
  const gx = Math.floor(t.x / cellSize);
  const gy = Math.floor(t.y / cellSize);
  if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return false;
  return fog[gy * cols + gx] === 1;
}

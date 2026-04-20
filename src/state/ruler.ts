import {
  gridDistance,
  formatDistance,
  type DiagonalRule,
  type DistanceUnit,
} from './distance.js';

/**
 * Common D&D 5e reach presets in feet. `null` = freeform (no clamp).
 */
export interface RulerPreset {
  /** Keyboard shortcut while Ruler is active (1–5, 0 for Free). */
  shortcut: string;
  /** Display label for the settings button. */
  label: string;
  /** Target radius in feet, or null for freeform. */
  feet: number | null;
}

export const RULER_PRESETS: readonly RulerPreset[] = [
  { shortcut: '0', label: 'Free',   feet: null },
  { shortcut: '1', label: '5 ft',   feet: 5 },
  { shortcut: '2', label: '30 ft',  feet: 30 },
  { shortcut: '3', label: '60 ft',  feet: 60 },
  { shortcut: '4', label: '90 ft',  feet: 90 },
  { shortcut: '5', label: '120 ft', feet: 120 },
];

/**
 * Scale the vector from (startX, startY) → (endX, endY) so its length
 * exactly equals `targetPx` in world pixels. If the vector has zero
 * length, returns the start point (caller decides what to do).
 *
 * Preserves direction. Pure function; no side effects.
 */
export function clampToRadius(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  targetPx: number,
): { endX: number; endY: number } {
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.hypot(dx, dy);
  if (len === 0 || !Number.isFinite(targetPx) || targetPx <= 0) {
    return { endX: startX, endY: startY };
  }
  const scale = targetPx / len;
  return {
    endX: startX + dx * scale,
    endY: startY + dy * scale,
  };
}

/**
 * Convert a feet target to world-pixel radius. Feet → squares (via
 * `feetPerSquare`) → world-px (via `cellSize`).
 */
export function feetToWorldPx(
  feet: number,
  feetPerSquare: number,
  cellSize: number,
): number {
  const fps = Number.isFinite(feetPerSquare) && feetPerSquare > 0 ? feetPerSquare : 5;
  const squares = feet / fps;
  return squares * cellSize;
}

/**
 * Format the ruler label. When a preset is active, adds a "· preset"
 * suffix so the GM sees at a glance that the endpoint is snapped.
 */
export function formatRulerLabel(
  cells: number,
  unit: DistanceUnit,
  feetPerSquare: number,
  targetFeet: number | null,
): string {
  const base = formatDistance(cells, unit, feetPerSquare);
  if (targetFeet === null) return base;
  return `${base} · preset`;
}

/**
 * Convenience re-export so callers can grab everything from this one
 * module while implementing the ruler.
 */
export { gridDistance, type DiagonalRule, type DistanceUnit };

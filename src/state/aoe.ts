import type { AoeKind, AoeTemplate } from './types.js';

export interface AoePreset {
  id: AoeKind;
  label: string;
}

export const AOE_PRESETS: readonly AoePreset[] = [
  { id: 'sphere', label: 'Sphere' },
  { id: 'cone', label: 'Cone' },
  { id: 'line', label: 'Line' },
  { id: 'cube', label: 'Cube' },
];

export const DEFAULT_AOE_COLOR = '#ff7043';
export const DEFAULT_CONE_APERTURE_DEG = 60;
export const DEFAULT_LINE_THICKNESS = 10;

export interface AoeFromDragOptions {
  kind: AoeKind;
  color: string;
}

/**
 * Given an AoE kind and a drag from (startX, startY) to (cursorX, cursorY),
 * returns the placement that makes sense for that kind. The result is missing
 * id and visibility — callers fill those in.
 */
export function aoePlacementFromDrag(
  startX: number,
  startY: number,
  cursorX: number,
  cursorY: number,
  options: AoeFromDragOptions,
): Omit<AoeTemplate, 'id' | 'visibility'> {
  const dx = cursorX - startX;
  const dy = cursorY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  switch (options.kind) {
    case 'sphere':
      return {
        kind: 'sphere',
        x: startX,
        y: startY,
        length: dist,
        width: 0,
        rotation: 0,
        color: options.color,
      };
    case 'cone':
      return {
        kind: 'cone',
        x: startX,
        y: startY,
        length: dist,
        width: DEFAULT_CONE_APERTURE_DEG,
        rotation: Math.atan2(dy, dx),
        color: options.color,
      };
    case 'line':
      return {
        kind: 'line',
        x: startX,
        y: startY,
        length: dist,
        width: DEFAULT_LINE_THICKNESS,
        rotation: Math.atan2(dy, dx),
        color: options.color,
      };
    case 'cube':
      return {
        kind: 'cube',
        x: Math.min(startX, cursorX),
        y: Math.min(startY, cursorY),
        length: Math.abs(dx),
        width: Math.abs(dy),
        rotation: 0,
        color: options.color,
      };
  }
}

/** True when the drag delta is too small to commit a meaningful AoE. */
export function isAoeDragTrivial(
  placement: Omit<AoeTemplate, 'id' | 'visibility'>,
  minPx = 8,
): boolean {
  switch (placement.kind) {
    case 'sphere':
    case 'cone':
    case 'line':
      return placement.length < minPx;
    case 'cube':
      return placement.length < minPx && placement.width < minPx;
  }
}

import type { Camera } from '../state/types.js';

export interface Point {
  x: number;
  y: number;
}

export function screenToWorld(camera: Camera, sx: number, sy: number): Point {
  return {
    x: sx / camera.zoom + camera.x,
    y: sy / camera.zoom + camera.y,
  };
}

export function worldToScreen(camera: Camera, wx: number, wy: number): Point {
  return {
    x: (wx - camera.x) * camera.zoom,
    y: (wy - camera.y) * camera.zoom,
  };
}

export function worldToGrid(cellSize: number, wx: number, wy: number): Point {
  return { x: wx / cellSize, y: wy / cellSize };
}

export function gridToWorld(cellSize: number, gx: number, gy: number): Point {
  return { x: gx * cellSize, y: gy * cellSize };
}

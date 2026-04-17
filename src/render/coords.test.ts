import { describe, it, expect } from 'vitest';
import {
  screenToWorld,
  worldToScreen,
  worldToGrid,
  gridToWorld,
} from './coords.js';

describe('screenToWorld / worldToScreen', () => {
  it('screenToWorld at zoom=1 adds camera offset', () => {
    const camera = { x: 10, y: 20, zoom: 1 };
    expect(screenToWorld(camera, 5, 5)).toEqual({ x: 15, y: 25 });
  });

  it('screenToWorld at zoom=2 divides screen by zoom', () => {
    const camera = { x: 0, y: 0, zoom: 2 };
    expect(screenToWorld(camera, 100, 200)).toEqual({ x: 50, y: 100 });
  });

  it('worldToScreen inverses screenToWorld', () => {
    const camera = { x: 13.5, y: -7.25, zoom: 2.5 };
    const s = worldToScreen(camera, 100, 200);
    const w = screenToWorld(camera, s.x, s.y);
    expect(w.x).toBeCloseTo(100);
    expect(w.y).toBeCloseTo(200);
  });

  it('worldToScreen at zoom=0.5 halves world distances', () => {
    const camera = { x: 0, y: 0, zoom: 0.5 };
    expect(worldToScreen(camera, 200, 400)).toEqual({ x: 100, y: 200 });
  });
});

describe('worldToGrid / gridToWorld', () => {
  it('worldToGrid divides by cellSize', () => {
    expect(worldToGrid(50, 150, 100)).toEqual({ x: 3, y: 2 });
  });

  it('gridToWorld multiplies by cellSize', () => {
    expect(gridToWorld(50, 3, 2)).toEqual({ x: 150, y: 100 });
  });

  it('gridToWorld and worldToGrid are inverses for integer coords', () => {
    const cellSize = 37;
    const w = gridToWorld(cellSize, 5, 11);
    const g = worldToGrid(cellSize, w.x, w.y);
    expect(g).toEqual({ x: 5, y: 11 });
  });

  it('worldToGrid supports fractional coords', () => {
    expect(worldToGrid(50, 75, 25)).toEqual({ x: 1.5, y: 0.5 });
  });
});

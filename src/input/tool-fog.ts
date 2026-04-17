import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import type { FogHoverPreview, FogMode, FogPreview } from '../render/layer-fog.js';

export type FogShape = 'rectangle' | 'freehand';

export interface FogOptions {
  shape: FogShape;
  brushSize: number;
}

export interface FogOptionsRef {
  current: FogOptions;
}

export function createFogOptionsRef(): FogOptionsRef {
  return { current: { shape: 'rectangle', brushSize: 1 } };
}

export interface FogPreviewRef {
  current: FogPreview | null;
}

export function createFogPreviewRef(): FogPreviewRef {
  return { current: null };
}

export interface FogHoverRef {
  current: FogHoverPreview | null;
}

export function createFogHoverRef(): FogHoverRef {
  return { current: null };
}

export function createFogTool(
  ctx: InputContext,
  mode: FogMode,
  previewRef: FogPreviewRef,
  optionsRef: FogOptionsRef,
  hoverRef: FogHoverRef,
): Tool {
  const { canvas, renderer, store } = ctx;
  let startCell: { x: number; y: number } | null = null;
  let lastCell: { x: number; y: number } | null = null;
  let activePointerId: number | null = null;
  let activeShape: FogShape = 'rectangle';
  const painted = new Set<string>();

  function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v));
  }

  function cellOfPointer(e: PointerEvent): { x: number; y: number } {
    const world = pointerToWorld(canvas, renderer, e);
    const grid = store.getState().grid;
    return {
      x: clamp(Math.floor(world.x / grid.cellSize), 0, grid.cols - 1),
      y: clamp(Math.floor(world.y / grid.cellSize), 0, grid.rows - 1),
    };
  }

  function brushCellsAt(cell: { x: number; y: number }): Array<{ x: number; y: number }> {
    const n = optionsRef.current.brushSize;
    const half = Math.floor((n - 1) / 2);
    const far = n - 1 - half;
    const { cols, rows } = store.getState().grid;
    const out: Array<{ x: number; y: number }> = [];
    for (let dy = -half; dy <= far; dy++) {
      for (let dx = -half; dx <= far; dx++) {
        const x = cell.x + dx;
        const y = cell.y + dy;
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        out.push({ x, y });
      }
    }
    return out;
  }

  function paintAt(cell: { x: number; y: number }) {
    const value: 0 | 1 = mode === 'reveal' ? 1 : 0;
    const cells: Array<{ x: number; y: number; value: 0 | 1 }> = [];
    for (const c of brushCellsAt(cell)) {
      const key = `${c.x},${c.y}`;
      if (painted.has(key)) continue;
      painted.add(key);
      cells.push({ x: c.x, y: c.y, value });
    }
    if (cells.length > 0) {
      store.applyPatch({ kind: 'fog-set', cells });
    }
  }

  function paintLine(
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) {
    let x = from.x;
    let y = from.y;
    const dx = Math.abs(to.x - x);
    const dy = Math.abs(to.y - y);
    const sx = x < to.x ? 1 : -1;
    const sy = y < to.y ? 1 : -1;
    let err = dx - dy;
    while (true) {
      paintAt({ x, y });
      if (x === to.x && y === to.y) break;
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  function clearHover() {
    if (hoverRef.current) {
      hoverRef.current = null;
      renderer.requestRender();
    }
  }

  function updateHoverFrom(cell: { x: number; y: number }) {
    if (optionsRef.current.shape !== 'freehand') {
      clearHover();
      return;
    }
    hoverRef.current = {
      cx: cell.x,
      cy: cell.y,
      brushSize: optionsRef.current.brushSize,
      mode,
    };
    renderer.requestRender();
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const cell = cellOfPointer(e);
    startCell = cell;
    lastCell = cell;
    activePointerId = e.pointerId;
    activeShape = optionsRef.current.shape;
    painted.clear();
    canvas.setPointerCapture(e.pointerId);
    clearHover();
    if (activeShape === 'rectangle') {
      previewRef.current = { x1: cell.x, y1: cell.y, x2: cell.x, y2: cell.y, mode };
      renderer.requestRender();
    } else {
      paintAt(cell);
    }
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!startCell || e.pointerId !== activePointerId) {
      if (activePointerId === null) {
        updateHoverFrom(cellOfPointer(e));
      }
      return;
    }
    const cell = cellOfPointer(e);
    if (activeShape === 'rectangle') {
      previewRef.current = {
        x1: startCell.x,
        y1: startCell.y,
        x2: cell.x,
        y2: cell.y,
        mode,
      };
      renderer.requestRender();
    } else if (lastCell && (cell.x !== lastCell.x || cell.y !== lastCell.y)) {
      paintLine(lastCell, cell);
      lastCell = cell;
    }
  }

  function onPointerLeave() {
    clearHover();
  }

  function endDrag(e: PointerEvent) {
    if (!startCell || e.pointerId !== activePointerId) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
    const shape = activeShape;
    const preview = previewRef.current;
    previewRef.current = null;
    startCell = null;
    lastCell = null;
    activePointerId = null;
    painted.clear();

    if (shape === 'rectangle' && preview) {
      const x1 = Math.min(preview.x1, preview.x2);
      const x2 = Math.max(preview.x1, preview.x2);
      const y1 = Math.min(preview.y1, preview.y2);
      const y2 = Math.max(preview.y1, preview.y2);
      const value: 0 | 1 = mode === 'reveal' ? 1 : 0;
      const cells: Array<{ x: number; y: number; value: 0 | 1 }> = [];
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          cells.push({ x, y, value });
        }
      }
      if (cells.length > 0) {
        store.applyPatch({ kind: 'fog-set', cells });
      } else {
        renderer.requestRender();
      }
    } else {
      renderer.requestRender();
    }
  }

  return {
    name: mode === 'reveal' ? 'fog-reveal' : 'fog-hide',
    cursor: 'crosshair',
    activate() {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);
      canvas.addEventListener('pointerleave', onPointerLeave);
    },
    deactivate() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      if (previewRef.current) {
        previewRef.current = null;
        renderer.requestRender();
      }
      clearHover();
      startCell = null;
      lastCell = null;
      activePointerId = null;
      painted.clear();
    },
  };
}

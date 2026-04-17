import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import type { FogMode, FogPreview } from '../render/layer-fog.js';

export interface FogPreviewRef {
  current: FogPreview | null;
}

export function createFogPreviewRef(): FogPreviewRef {
  return { current: null };
}

export function createFogTool(
  ctx: InputContext,
  mode: FogMode,
  previewRef: FogPreviewRef,
): Tool {
  const { canvas, renderer, store } = ctx;
  let startCell: { x: number; y: number } | null = null;
  let activePointerId: number | null = null;

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

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const cell = cellOfPointer(e);
    startCell = cell;
    activePointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    previewRef.current = {
      x1: cell.x,
      y1: cell.y,
      x2: cell.x,
      y2: cell.y,
      mode,
    };
    renderer.requestRender();
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!startCell || e.pointerId !== activePointerId) return;
    const cell = cellOfPointer(e);
    previewRef.current = {
      x1: startCell.x,
      y1: startCell.y,
      x2: cell.x,
      y2: cell.y,
      mode,
    };
    renderer.requestRender();
  }

  function endDrag(e: PointerEvent) {
    if (!startCell || e.pointerId !== activePointerId) return;
    const preview = previewRef.current;
    previewRef.current = null;
    startCell = null;
    activePointerId = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }

    if (!preview) {
      renderer.requestRender();
      return;
    }

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
  }

  return {
    name: mode === 'reveal' ? 'fog-reveal' : 'fog-hide',
    cursor: 'crosshair',
    activate() {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);
    },
    deactivate() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      if (previewRef.current) {
        previewRef.current = null;
        renderer.requestRender();
      }
      startCell = null;
      activePointerId = null;
    },
  };
}

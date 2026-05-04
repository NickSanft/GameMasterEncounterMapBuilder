/**
 * Phase 142 — tile-paint tool.
 *
 * Click or drag to paint tiles in the active brush kind (or erase
 * if `mode === 'erase'`). The tool's pointer state machine:
 *   - pointerdown: paint the cell at the pointer.
 *   - pointermove (while pressed): paint each new cell the pointer
 *     enters. Same `painted` Set pattern the fog tool uses to avoid
 *     redundant patches when the pointer hovers a single cell.
 *   - pointerup: end the drag.
 *
 * Erase mode removes EVERY tile on the targeted cell (regardless of
 * kind) — simpler than per-kind erasing and matches the user's
 * "wipe this cell clean" intent.
 *
 * Pure tool wiring. No DOM globals; reads the active options via
 * the ref pattern the existing fog / draw / aoe tools use.
 */
import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import { nid } from '../util/id.js';
import type { TilePaintKind } from '../state/types.js';

export type TilePaintMode = 'paint' | 'erase';

export interface TilePaintOptions {
  mode: TilePaintMode;
  kind: TilePaintKind;
}

export interface TilePaintOptionsRef {
  current: TilePaintOptions;
}

export function createTilePaintOptionsRef(): TilePaintOptionsRef {
  return { current: { mode: 'paint', kind: 'floor' } };
}

export function createTilePaintTool(
  ctx: InputContext,
  optionsRef: TilePaintOptionsRef,
): Tool {
  const { canvas, renderer, store } = ctx;
  let activePointerId: number | null = null;
  let lastCell: { x: number; y: number } | null = null;
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

  function paintCell(cell: { x: number; y: number }) {
    const key = `${cell.x},${cell.y}`;
    if (painted.has(key)) return;
    painted.add(key);
    const opts = optionsRef.current;
    if (opts.mode === 'paint') {
      store.applyPatch({
        kind: 'tile-paint-add',
        tile: {
          id: nid(),
          cellX: cell.x,
          cellY: cell.y,
          kind: opts.kind,
        },
      });
    } else {
      // Erase: remove every tile on this cell, regardless of kind.
      const matches = store
        .getState()
        .tilePaints.filter((t) => t.cellX === cell.x && t.cellY === cell.y);
      if (matches.length === 0) return;
      store.batch(() => {
        for (const tile of matches) {
          store.applyPatch({ kind: 'tile-paint-remove', id: tile.id });
        }
      });
    }
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    activePointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    painted.clear();
    const cell = cellOfPointer(e);
    lastCell = cell;
    paintCell(cell);
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    const cell = cellOfPointer(e);
    if (!lastCell || cell.x !== lastCell.x || cell.y !== lastCell.y) {
      paintCell(cell);
      lastCell = cell;
    }
  }

  function endDrag(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
    activePointerId = null;
    lastCell = null;
    painted.clear();
  }

  return {
    name: 'tile-paint',
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
      activePointerId = null;
      lastCell = null;
      painted.clear();
    },
  };
}

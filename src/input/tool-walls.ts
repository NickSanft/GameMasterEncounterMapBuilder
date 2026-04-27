import type { InputContext, WallsOverlayRef } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import { createWall, createWallBlock } from '../state/walls.js';

/**
 * Phase 112 — Walls tool mode. `'line'` is the original click-vertex
 * chain authoring path; `'block'` is the new drag-a-rectangle path
 * that produces a block wall snapped to grid cells.
 */
export type WallsToolMode = 'line' | 'block';

export interface WallsToolOptions {
  mode: WallsToolMode;
}

export interface WallsToolOptionsRef {
  current: WallsToolOptions;
}

export function createWallsToolOptionsRef(
  options: WallsToolOptions = { mode: 'line' },
): WallsToolOptionsRef {
  return { current: options };
}

/**
 * Phase 112 — block-mode in-progress drag preview. The renderer reads
 * this via `getBlockPreview` so a translucent ghost rectangle follows
 * the cursor while the GM drags. `null` when not actively dragging.
 */
export interface BlockPreview {
  cellX: number;
  cellY: number;
  cellsWide: number;
  cellsTall: number;
}

export interface BlockPreviewRef {
  current: BlockPreview | null;
}

export function createBlockPreviewRef(): BlockPreviewRef {
  return { current: null };
}

export interface WallsToolContext extends InputContext {
  wallsOverlay: WallsOverlayRef;
  /** Phase 112 — current tool mode (line / block). */
  wallsToolOptions: WallsToolOptionsRef;
  /** Phase 112 — drag-time block-wall preview rect, in cells. */
  blockPreview: BlockPreviewRef;
}

/**
 * Walls tool — click to drop vertices; each click commits the segment
 * from the previous vertex to the new one as a separate `Wall` patch
 * so undo can peel back one vertex at a time. Double-click, Escape, or
 * right-click closes the current chain.
 *
 * Ignores pointer drags entirely — walls are click-to-place, not
 * drag-to-place, matching standard VTT editors (DungeonDraft, Foundry,
 * Roll20). Space-drag camera pan still works because this tool's
 * pointerdown handler defers to `ctx.isSpaceHeld()`.
 */
export function createWallsTool(ctx: WallsToolContext): Tool {
  const { canvas, renderer, store, wallsOverlay, wallsToolOptions, blockPreview } = ctx;

  function ensureOverlay(): { vertices: Array<{ x: number; y: number }>; cursor: { x: number; y: number } | null } {
    if (!wallsOverlay.current) {
      wallsOverlay.current = { vertices: [], cursor: null };
    }
    return wallsOverlay.current;
  }

  function finishChain(): void {
    if (wallsOverlay.current) {
      wallsOverlay.current = null;
      renderer.requestRender();
    }
  }

  /**
   * Phase 112 — block-mode drag state. We track the touchdown cell +
   * the latest hover cell in CELL coordinates (not world pixels) so
   * the preview ghost snaps to grid edges and the committed block has
   * integer cell geometry. `null` when not dragging.
   */
  let blockDrag: { startCellX: number; startCellY: number } | null = null;
  let blockActivePointerId: number | null = null;

  function worldToCell(world: { x: number; y: number }): { cx: number; cy: number } {
    const cs = store.getState().grid.cellSize;
    return {
      cx: Math.floor(world.x / cs),
      cy: Math.floor(world.y / cs),
    };
  }

  function updateBlockPreviewFrom(currentCell: { cx: number; cy: number }) {
    if (!blockDrag) return;
    const minX = Math.min(blockDrag.startCellX, currentCell.cx);
    const minY = Math.min(blockDrag.startCellY, currentCell.cy);
    const maxX = Math.max(blockDrag.startCellX, currentCell.cx);
    const maxY = Math.max(blockDrag.startCellY, currentCell.cy);
    blockPreview.current = {
      cellX: minX,
      cellY: minY,
      // +1 so a single-cell drag (start === current) renders 1×1.
      cellsWide: maxX - minX + 1,
      cellsTall: maxY - minY + 1,
    };
    renderer.requestRender();
  }

  function endBlockDrag(commit: boolean) {
    if (!blockDrag) return;
    const preview = blockPreview.current;
    blockDrag = null;
    blockActivePointerId = null;
    blockPreview.current = null;
    if (commit && preview) {
      store.applyPatch({
        kind: 'wall-add',
        wall: createWallBlock(preview),
      });
    }
    renderer.requestRender();
  }

  function onPointerDown(e: PointerEvent) {
    // Right-click = end the chain (line mode) or cancel a block drag.
    if (e.button === 2) {
      finishChain();
      endBlockDrag(false);
      e.preventDefault();
      return;
    }
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    if (ctx.isPinching?.()) return;

    const world = pointerToWorld(canvas, renderer, e);

    if (wallsToolOptions.current.mode === 'block') {
      // Phase 112 — drag-create a block wall snapped to the grid.
      const cell = worldToCell(world);
      blockDrag = { startCellX: cell.cx, startCellY: cell.cy };
      blockActivePointerId = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* capture can fail on synthetic events; non-fatal */
      }
      updateBlockPreviewFrom(cell);
      e.preventDefault();
      return;
    }

    const overlay = ensureOverlay();
    const prev = overlay.vertices[overlay.vertices.length - 1];
    if (prev) {
      // Commit the segment prev → world as a concrete Wall patch.
      store.applyPatch({
        kind: 'wall-add',
        wall: createWall({ x1: prev.x, y1: prev.y, x2: world.x, y2: world.y }),
      });
    }
    overlay.vertices = [...overlay.vertices, { x: world.x, y: world.y }];
    overlay.cursor = { x: world.x, y: world.y };
    renderer.requestRender();
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (blockDrag && e.pointerId === blockActivePointerId) {
      const world = pointerToWorld(canvas, renderer, e);
      updateBlockPreviewFrom(worldToCell(world));
      return;
    }
    const overlay = wallsOverlay.current;
    if (!overlay || overlay.vertices.length === 0) return;
    const world = pointerToWorld(canvas, renderer, e);
    overlay.cursor = { x: world.x, y: world.y };
    renderer.requestRender();
  }

  function onPointerUp(e: PointerEvent) {
    if (blockDrag && e.pointerId === blockActivePointerId) {
      endBlockDrag(true);
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
    }
  }

  function onPointerCancel(e: PointerEvent) {
    if (blockDrag && e.pointerId === blockActivePointerId) {
      endBlockDrag(false);
    }
  }

  function onDoubleClick(e: MouseEvent) {
    // Double-click is a common "end the shape" affordance (matching
    // polygon tools in most editors). The first click of the double
    // already committed a segment via onPointerDown; this one ends it.
    finishChain();
    e.preventDefault();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      let handled = false;
      if (wallsOverlay.current) {
        finishChain();
        handled = true;
      }
      if (blockDrag) {
        endBlockDrag(false);
        handled = true;
      }
      if (handled) e.preventDefault();
    }
  }

  return {
    name: 'walls',
    cursor: 'crosshair',
    activate() {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerCancel);
      canvas.addEventListener('dblclick', onDoubleClick);
      window.addEventListener('keydown', onKeyDown);
    },
    deactivate() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener('keydown', onKeyDown);
      finishChain();
      endBlockDrag(false);
    },
  };
}

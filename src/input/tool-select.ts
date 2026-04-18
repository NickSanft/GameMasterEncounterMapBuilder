import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { hitTestToken } from './hit-test.js';
import { pointerToWorld } from './context.js';
import { collectLassoHits } from './lasso.js';
import type { ID } from '../state/types.js';

interface LassoInProgress {
  startWorldX: number;
  startWorldY: number;
  additive: boolean;
  startSelection: Set<ID>;
}

export function createSelectTool(ctx: InputContext): Tool {
  const { canvas, renderer, store, selection, dragOverlay, lassoOverlay } = ctx;
  let draggingAnchorId: string | null = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let activePointerId: number | null = null;
  let lasso: LassoInProgress | null = null;

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const world = pointerToWorld(canvas, renderer, e);
    const state = store.getState();
    const hit = hitTestToken(state.tokens, state.grid, world.x, world.y);

    if (hit) {
      if (e.shiftKey) {
        const next = new Set(selection.ids);
        if (next.has(hit.id)) {
          next.delete(hit.id);
          selection.ids = next;
          renderer.requestRender();
          return; // removed from selection; no drag
        }
        next.add(hit.id);
        selection.ids = next;
      } else if (!selection.ids.has(hit.id)) {
        selection.ids = new Set([hit.id]);
      }
      // Begin a group drag anchored at the clicked token.
      draggingAnchorId = hit.id;
      activePointerId = e.pointerId;
      const gridX = world.x / state.grid.cellSize;
      const gridY = world.y / state.grid.cellSize;
      dragOffsetX = gridX - hit.x;
      dragOffsetY = gridY - hit.y;
      dragOverlay.current = {
        ids: Array.from(selection.ids),
        deltaX: 0,
        deltaY: 0,
      };
      canvas.setPointerCapture(e.pointerId);
      renderer.requestRender();
      e.preventDefault();
    } else {
      // Empty-space interaction — start lasso.
      lasso = {
        startWorldX: world.x,
        startWorldY: world.y,
        additive: e.shiftKey,
        startSelection: new Set(selection.ids),
      };
      activePointerId = e.pointerId;
      lassoOverlay.current = {
        x1: world.x,
        y1: world.y,
        x2: world.x,
        y2: world.y,
        additive: e.shiftKey,
      };
      canvas.setPointerCapture(e.pointerId);
      renderer.requestRender();
      e.preventDefault();
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;

    if (draggingAnchorId !== null) {
      const world = pointerToWorld(canvas, renderer, e);
      const state = store.getState();
      const anchor = state.tokens.find((t) => t.id === draggingAnchorId);
      if (!anchor) return;
      const targetGridX = world.x / state.grid.cellSize - dragOffsetX;
      const targetGridY = world.y / state.grid.cellSize - dragOffsetY;
      dragOverlay.current = {
        ids: dragOverlay.current?.ids ?? [draggingAnchorId],
        deltaX: targetGridX - anchor.x,
        deltaY: targetGridY - anchor.y,
      };
      renderer.requestRender();
      return;
    }

    if (lasso) {
      const world = pointerToWorld(canvas, renderer, e);
      lassoOverlay.current = {
        x1: lasso.startWorldX,
        y1: lasso.startWorldY,
        x2: world.x,
        y2: world.y,
        additive: lasso.additive,
      };
      renderer.requestRender();
    }
  }

  function endPointer(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;

    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }

    if (draggingAnchorId !== null) {
      const id = draggingAnchorId;
      const overlay = dragOverlay.current;
      draggingAnchorId = null;
      dragOverlay.current = null;

      if (overlay && (overlay.deltaX !== 0 || overlay.deltaY !== 0)) {
        const snappedDX = Math.round(overlay.deltaX);
        const snappedDY = Math.round(overlay.deltaY);
        if (snappedDX !== 0 || snappedDY !== 0) {
          const state = store.getState();
          for (const tid of overlay.ids) {
            const token = state.tokens.find((t) => t.id === tid);
            if (!token) continue;
            store.applyPatch({
              kind: 'token-update',
              id: tid,
              changes: { x: token.x + snappedDX, y: token.y + snappedDY },
            });
          }
        }
      }
      renderer.requestRender();
      void id; // silence unused-var
      return;
    }

    if (lasso) {
      const rect = lassoOverlay.current;
      const additive = lasso.additive;
      const startSel = lasso.startSelection;
      lasso = null;
      lassoOverlay.current = null;

      if (rect) {
        const state = store.getState();
        const hits = collectLassoHits(state.tokens, state.grid.cellSize, rect);
        if (additive) {
          const merged = new Set(startSel);
          for (const id of hits) merged.add(id);
          selection.ids = merged;
        } else if (hits.length === 0) {
          selection.ids = new Set();
        } else {
          selection.ids = new Set(hits);
        }
      }
      renderer.requestRender();
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    if (selection.ids.size === 0) return;
    if (isEditableTarget(e.target)) return;
    for (const id of selection.ids) {
      store.applyPatch({ kind: 'token-remove', id });
    }
    selection.ids = new Set();
    renderer.requestRender();
    e.preventDefault();
  }

  function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (target.isContentEditable) return true;
    return false;
  }

  return {
    name: 'select',
    cursor: 'default',
    activate() {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', endPointer);
      canvas.addEventListener('pointercancel', endPointer);
      window.addEventListener('keydown', onKeyDown);
    },
    deactivate() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endPointer);
      canvas.removeEventListener('pointercancel', endPointer);
      window.removeEventListener('keydown', onKeyDown);
      if (selection.ids.size > 0) {
        selection.ids = new Set();
        renderer.requestRender();
      }
      if (dragOverlay.current) {
        dragOverlay.current = null;
        renderer.requestRender();
      }
      if (lassoOverlay.current) {
        lassoOverlay.current = null;
        renderer.requestRender();
      }
      draggingAnchorId = null;
      activePointerId = null;
      lasso = null;
    },
  };
}

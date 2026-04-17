import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { hitTestToken } from './hit-test.js';
import { pointerToWorld } from './context.js';

export function createSelectTool(ctx: InputContext): Tool {
  const { canvas, renderer, store, selection, dragOverlay } = ctx;
  let draggingId: string | null = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let activePointerId: number | null = null;

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const world = pointerToWorld(canvas, renderer, e);
    const state = store.getState();
    const hit = hitTestToken(state.tokens, state.grid, world.x, world.y);

    if (hit) {
      selection.ids = new Set([hit.id]);
      draggingId = hit.id;
      activePointerId = e.pointerId;
      const gridX = world.x / state.grid.cellSize;
      const gridY = world.y / state.grid.cellSize;
      dragOffsetX = gridX - hit.x;
      dragOffsetY = gridY - hit.y;
      dragOverlay.current = { id: hit.id, deltaX: 0, deltaY: 0 };
      canvas.setPointerCapture(e.pointerId);
      renderer.requestRender();
      e.preventDefault();
    } else if (selection.ids.size > 0) {
      selection.ids = new Set();
      renderer.requestRender();
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (draggingId === null || e.pointerId !== activePointerId) return;
    const world = pointerToWorld(canvas, renderer, e);
    const state = store.getState();
    const token = state.tokens.find((t) => t.id === draggingId);
    if (!token) return;
    const targetGridX = world.x / state.grid.cellSize - dragOffsetX;
    const targetGridY = world.y / state.grid.cellSize - dragOffsetY;
    dragOverlay.current = {
      id: draggingId,
      deltaX: targetGridX - token.x,
      deltaY: targetGridY - token.y,
    };
    renderer.requestRender();
  }

  function endDrag(e: PointerEvent) {
    if (draggingId === null || e.pointerId !== activePointerId) return;
    const id = draggingId;
    const overlay = dragOverlay.current;
    draggingId = null;
    activePointerId = null;
    dragOverlay.current = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }

    if (overlay && (overlay.deltaX !== 0 || overlay.deltaY !== 0)) {
      const token = store.getState().tokens.find((t) => t.id === id);
      if (token) {
        const snappedX = Math.round(token.x + overlay.deltaX);
        const snappedY = Math.round(token.y + overlay.deltaY);
        if (snappedX !== token.x || snappedY !== token.y) {
          store.applyPatch({
            kind: 'token-update',
            id,
            changes: { x: snappedX, y: snappedY },
          });
        }
      }
    }
    renderer.requestRender();
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
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);
      window.addEventListener('keydown', onKeyDown);
    },
    deactivate() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('keydown', onKeyDown);
      if (selection.ids.size > 0) {
        selection.ids = new Set();
        renderer.requestRender();
      }
      if (dragOverlay.current) {
        dragOverlay.current = null;
        renderer.requestRender();
      }
      draggingId = null;
      activePointerId = null;
    },
  };
}

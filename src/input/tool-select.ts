import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { hitTestToken } from './hit-test.js';
import { pointerToWorld } from './context.js';

export function createSelectTool(ctx: InputContext): Tool {
  const { canvas, renderer, store, selection } = ctx;
  let draggingId: string | null = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let activePointerId: number | null = null;

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const world = pointerToWorld(canvas, renderer, e);
    const grid = store.getState().grid;
    const tokens = store.getState().tokens;
    const hit = hitTestToken(tokens, grid, world.x, world.y);

    if (hit) {
      selection.ids = new Set([hit.id]);
      draggingId = hit.id;
      activePointerId = e.pointerId;
      const gridX = world.x / grid.cellSize;
      const gridY = world.y / grid.cellSize;
      dragOffsetX = gridX - hit.x;
      dragOffsetY = gridY - hit.y;
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
    const grid = store.getState().grid;
    const gridX = world.x / grid.cellSize - dragOffsetX;
    const gridY = world.y / grid.cellSize - dragOffsetY;
    store.applyPatch({
      kind: 'token-update',
      id: draggingId,
      changes: { x: gridX, y: gridY },
    });
  }

  function endDrag(e: PointerEvent) {
    if (draggingId === null || e.pointerId !== activePointerId) return;
    const token = store.getState().tokens.find((t) => t.id === draggingId);
    if (token) {
      const snappedX = Math.round(token.x);
      const snappedY = Math.round(token.y);
      if (snappedX !== token.x || snappedY !== token.y) {
        store.applyPatch({
          kind: 'token-update',
          id: draggingId,
          changes: { x: snappedX, y: snappedY },
        });
      }
    }
    draggingId = null;
    activePointerId = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
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
      draggingId = null;
      activePointerId = null;
    },
  };
}

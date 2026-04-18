import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { hitTestToken } from './hit-test.js';
import { hitTestAnnotation } from './hit-test-annotation.js';
import { hitTestAoe } from './hit-test-aoe.js';
import { pointerToWorld } from './context.js';
import {
  collectLassoHits,
  collectAnnotationLassoHits,
  collectAoeLassoHits,
} from './lasso.js';
import type { ID } from '../state/types.js';

interface LassoInProgress {
  startWorldX: number;
  startWorldY: number;
  additive: boolean;
  startSelection: Set<ID>;
}

export function createSelectTool(ctx: InputContext): Tool {
  const { canvas, renderer, store, selection, dragOverlay, lassoOverlay } = ctx;
  let activePointerId: number | null = null;
  let isDragging = false;
  let dragStartWorldX = 0;
  let dragStartWorldY = 0;
  let lasso: LassoInProgress | null = null;

  function beginDrag(e: PointerEvent, worldX: number, worldY: number) {
    isDragging = true;
    activePointerId = e.pointerId;
    dragStartWorldX = worldX;
    dragStartWorldY = worldY;
    dragOverlay.current = {
      ids: Array.from(selection.ids),
      deltaX: 0,
      deltaY: 0,
    };
    canvas.setPointerCapture(e.pointerId);
    renderer.requestRender();
    e.preventDefault();
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const world = pointerToWorld(canvas, renderer, e);
    const state = store.getState();
    const tokenHit = hitTestToken(state.tokens, state.grid, world.x, world.y);
    const annotHit = tokenHit
      ? null
      : hitTestAnnotation(state.annotations, world.x, world.y);
    const aoeHit = tokenHit || annotHit
      ? null
      : hitTestAoe(state.aoeTemplates, world.x, world.y);

    if (tokenHit) {
      handleHitSelect(tokenHit.id, e.shiftKey);
      beginDrag(e, world.x, world.y);
      return;
    }

    if (annotHit) {
      handleHitSelect(annotHit.id, e.shiftKey);
      beginDrag(e, world.x, world.y);
      return;
    }

    if (aoeHit) {
      handleHitSelect(aoeHit.id, e.shiftKey);
      beginDrag(e, world.x, world.y);
      return;
    }

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

  function handleHitSelect(id: ID, shift: boolean) {
    if (shift) {
      const next = new Set(selection.ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      selection.ids = next;
    } else if (!selection.ids.has(id)) {
      selection.ids = new Set([id]);
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;

    if (isDragging) {
      const world = pointerToWorld(canvas, renderer, e);
      dragOverlay.current = {
        ids: dragOverlay.current?.ids ?? Array.from(selection.ids),
        deltaX: world.x - dragStartWorldX,
        deltaY: world.y - dragStartWorldY,
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

    if (isDragging) {
      const overlay = dragOverlay.current;
      isDragging = false;
      dragOverlay.current = null;

      if (overlay && (overlay.deltaX !== 0 || overlay.deltaY !== 0)) {
        const state = store.getState();
        const cellSize = state.grid.cellSize;
        const gridDX = Math.round(overlay.deltaX / cellSize);
        const gridDY = Math.round(overlay.deltaY / cellSize);
        store.batch(() => {
          for (const id of overlay.ids) {
            const t = state.tokens.find((x) => x.id === id);
            if (t) {
              if (gridDX !== 0 || gridDY !== 0) {
                store.applyPatch({
                  kind: 'token-update',
                  id,
                  changes: { x: t.x + gridDX, y: t.y + gridDY },
                });
              }
              continue;
            }
            const a = state.annotations.find((x) => x.id === id);
            if (a) {
              store.applyPatch({
                kind: 'annotation-update',
                id,
                changes: { x: a.x + overlay.deltaX, y: a.y + overlay.deltaY },
              });
              continue;
            }
            const aoe = state.aoeTemplates.find((x) => x.id === id);
            if (aoe) {
              store.applyPatch({
                kind: 'aoe-update',
                id,
                changes: {
                  x: aoe.x + overlay.deltaX,
                  y: aoe.y + overlay.deltaY,
                },
              });
            }
          }
        });
      }
      renderer.requestRender();
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
        const tokenHits = collectLassoHits(state.tokens, state.grid.cellSize, rect);
        const annotHits = collectAnnotationLassoHits(state.annotations, rect);
        const aoeHits = collectAoeLassoHits(state.aoeTemplates, rect);
        const hits = [...tokenHits, ...annotHits, ...aoeHits];
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
    const ids = Array.from(selection.ids);
    const state = store.getState();
    store.batch(() => {
      for (const id of ids) {
        if (state.tokens.some((t) => t.id === id)) {
          store.applyPatch({ kind: 'token-remove', id });
        } else if (state.annotations.some((a) => a.id === id)) {
          store.applyPatch({ kind: 'annotation-remove', id });
        } else if (state.aoeTemplates.some((aoe) => aoe.id === id)) {
          store.applyPatch({ kind: 'aoe-remove', id });
        }
      }
    });
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
      isDragging = false;
      activePointerId = null;
      lasso = null;
    },
  };
}

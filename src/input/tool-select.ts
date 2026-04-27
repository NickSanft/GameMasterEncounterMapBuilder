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
  collectWallLassoHits,
} from './lasso.js';
import { tokensInStackAt, cycleStackSelection } from '../state/token-stack.js';
import {
  hitTestWalls,
  hitTestWallEndpoint,
  WALL_HANDLE_SCREEN_PX,
} from '../state/walls.js';
import type { ID } from '../state/types.js';

interface LassoInProgress {
  startWorldX: number;
  startWorldY: number;
  additive: boolean;
  startSelection: Set<ID>;
}

export function createSelectTool(ctx: InputContext): Tool {
  const { canvas, renderer, store, selection, dragOverlay, lassoOverlay } = ctx;
  const endpointDrag = ctx.endpointDrag;
  let activePointerId: number | null = null;
  let isDragging = false;
  let isEndpointDrag = false;
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

    // Phase 85 — endpoint-handle hit-test FIRST when there are
    // selected walls. The handle's hit area is generously sized at
    // ~12 world-pixels so the GM doesn't have to be pixel-perfect at
    // any zoom level. World-space tolerance scales inversely with
    // zoom so the on-screen target stays consistent — matches how
    // the renderer paints the handle (`WALL_HANDLE_SCREEN_PX / zoom`).
    if (endpointDrag && selection.ids.size > 0) {
      const tolerance = (WALL_HANDLE_SCREEN_PX + 3) / Math.max(renderer.camera.zoom, 0.05);
      const hit = hitTestWallEndpoint(
        state.walls,
        selection.ids,
        world.x,
        world.y,
        tolerance,
      );
      if (hit) {
        // Endpoint drag — set the live overlay and capture the pointer.
        // Selection is unchanged (the endpoint belongs to a wall already
        // in the selection set). Phase 112 — `hitTestWallEndpoint`
        // only returns segment walls (blocks have no endpoints), so
        // `hit.wall` is narrowed to WallSegment here.
        endpointDrag.current = {
          wallId: hit.wall.id,
          endpoint: hit.endpoint,
          x: hit.endpoint === 1 ? hit.wall.x1 : hit.wall.x2,
          y: hit.endpoint === 1 ? hit.wall.y1 : hit.wall.y2,
        };
        isEndpointDrag = true;
        activePointerId = e.pointerId;
        canvas.setPointerCapture(e.pointerId);
        renderer.requestRender();
        e.preventDefault();
        return;
      }
    }

    const tokenHit = hitTestToken(state.tokens, state.grid, world.x, world.y);
    const annotHit = tokenHit
      ? null
      : hitTestAnnotation(state.annotations, world.x, world.y);
    const aoeHit = tokenHit || annotHit
      ? null
      : hitTestAoe(state.aoeTemplates, world.x, world.y);
    // Walls hit-test last — tokens / annotations / AoE all sit visually
    // on top, so a click that lands on both should pick the upper layer.
    const wallHit = tokenHit || annotHit || aoeHit
      ? null
      : hitTestWalls(state.walls, world.x, world.y, state.grid.cellSize);

    if (tokenHit) {
      // Alt+click on a stacked cell cycles selection down through the stack
      // without starting a drag, so GMs can dig into a pile of tokens one
      // layer at a time.
      if (e.altKey && !e.shiftKey) {
        const stack = tokensInStackAt(state.tokens, tokenHit.x, tokenHit.y);
        if (stack.length > 1) {
          const current =
            selection.ids.size === 1
              ? stack.find((t) => selection.ids.has(t.id))?.id ?? tokenHit.id
              : tokenHit.id;
          const nextId = cycleStackSelection(stack, current);
          if (nextId) {
            selection.ids = new Set([nextId]);
            renderer.requestRender();
          }
          e.preventDefault();
          return;
        }
      }
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

    if (wallHit) {
      handleHitSelect(wallHit.id, e.shiftKey);
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

    if (isEndpointDrag && endpointDrag?.current) {
      const world = pointerToWorld(canvas, renderer, e);
      endpointDrag.current = {
        ...endpointDrag.current,
        x: world.x,
        y: world.y,
      };
      renderer.requestRender();
      return;
    }

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

    if (isEndpointDrag && endpointDrag?.current) {
      const drag = endpointDrag.current;
      isEndpointDrag = false;
      endpointDrag.current = null;
      const state = store.getState();
      const w = state.walls.find((x) => x.id === drag.wallId);
      // Phase 112 — endpoint drag only applies to segment walls.
      // Block walls have no individual endpoints; the hit-test in
      // pointerdown filters them out, so this find should always
      // resolve to a segment when an endpoint drag is in flight.
      if (w && w.kind === 'segment') {
        const same = drag.endpoint === 1
          ? drag.x === w.x1 && drag.y === w.y1
          : drag.x === w.x2 && drag.y === w.y2;
        if (!same) {
          store.applyPatch({
            kind: 'wall-update',
            id: drag.wallId,
            changes:
              drag.endpoint === 1
                ? { x1: drag.x, y1: drag.y }
                : { x2: drag.x, y2: drag.y },
          });
        }
      }
      renderer.requestRender();
      return;
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
              continue;
            }
            const w = state.walls.find((x) => x.id === id);
            if (w) {
              if (w.kind === 'segment') {
                // Walls translate continuously (both endpoints) — like
                // annotations / AoE, no grid snapping.
                store.applyPatch({
                  kind: 'wall-update',
                  id,
                  changes: {
                    x1: w.x1 + overlay.deltaX,
                    y1: w.y1 + overlay.deltaY,
                    x2: w.x2 + overlay.deltaX,
                    y2: w.y2 + overlay.deltaY,
                  },
                });
              } else {
                // Phase 112 — block walls translate by GRID-SNAPPED
                // deltas (their geometry is integer cell coords). Snap
                // to the nearest cell so a small drag still lands.
                if (gridDX !== 0 || gridDY !== 0) {
                  store.applyPatch({
                    kind: 'wall-update',
                    id,
                    changes: {
                      cellX: Math.max(0, w.cellX + gridDX),
                      cellY: Math.max(0, w.cellY + gridDY),
                    },
                  });
                }
              }
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
        const wallHits = collectWallLassoHits(state.walls, rect, state.grid.cellSize);
        const hits = [...tokenHits, ...annotHits, ...aoeHits, ...wallHits];
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

  // Delete / Backspace handling lives in the GM entry's global keydown
  // handler (see src/entries/gm.ts). Phase 56 unified it there so walls
  // and AoE + the live-region announcement all flow through one path.
  // The Select tool used to have its own window-level handler; that
  // duplicate caused a handler-ordering bug where Delete-on-wall
  // unselected without removing — removed in 0.56.1.

  return {
    name: 'select',
    cursor: 'default',
    activate() {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', endPointer);
      canvas.addEventListener('pointercancel', endPointer);
    },
    deactivate() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endPointer);
      canvas.removeEventListener('pointercancel', endPointer);
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
      if (endpointDrag?.current) {
        endpointDrag.current = null;
        renderer.requestRender();
      }
      isDragging = false;
      isEndpointDrag = false;
      activePointerId = null;
      lasso = null;
    },
  };
}

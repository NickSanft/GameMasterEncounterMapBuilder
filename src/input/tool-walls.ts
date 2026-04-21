import type { InputContext, WallsOverlayRef } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import { createWall } from '../state/walls.js';

export interface WallsToolContext extends InputContext {
  wallsOverlay: WallsOverlayRef;
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
  const { canvas, renderer, store, wallsOverlay } = ctx;

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

  function onPointerDown(e: PointerEvent) {
    // Right-click = end the chain without committing the last segment.
    if (e.button === 2) {
      finishChain();
      e.preventDefault();
      return;
    }
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    if (ctx.isPinching?.()) return;

    const world = pointerToWorld(canvas, renderer, e);
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
    const overlay = wallsOverlay.current;
    if (!overlay || overlay.vertices.length === 0) return;
    const world = pointerToWorld(canvas, renderer, e);
    overlay.cursor = { x: world.x, y: world.y };
    renderer.requestRender();
  }

  function onDoubleClick(e: MouseEvent) {
    // Double-click is a common "end the shape" affordance (matching
    // polygon tools in most editors). The first click of the double
    // already committed a segment via onPointerDown; this one ends it.
    finishChain();
    e.preventDefault();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && wallsOverlay.current) {
      finishChain();
      e.preventDefault();
    }
  }

  return {
    name: 'walls',
    cursor: 'crosshair',
    activate() {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('dblclick', onDoubleClick);
      window.addEventListener('keydown', onKeyDown);
    },
    deactivate() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('dblclick', onDoubleClick);
      window.removeEventListener('keydown', onKeyDown);
      finishChain();
    },
  };
}

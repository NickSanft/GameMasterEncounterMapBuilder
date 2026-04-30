/**
 * Phase 127 — Spectator-side owned-token drag tool.
 *
 * Pre-127 the Spectator entry's pointerdown wiring was limited to
 * pan-zoom (drag map), the ruler tool (measure), and the Phase 120
 * suggest-annotation prompt. v1.2 carves out a fourth path: if the
 * spectator clicks on a token whose `ownerId === playerId`, they
 * can drag it just like the GM drags any token. On pointerup the
 * tool broadcasts a `token-claim-move` SyncMessage; the GM tab
 * validates ownership + applies a normal `token-update` patch.
 *
 * The drag overlay (a `DragOverlayRef`) is the same shape the GM
 * Select tool uses — the renderer's existing token layer reads it
 * and offsets the dragged token's render position so the spectator
 * sees the move locally, before the GM's authoritative
 * `token-update` patch round-trips back.
 *
 * Coexists with pan-zoom + ruler + suggest mode. Each handler
 * checks "should I act on this pointerdown?" — if the click misses
 * an owned token, this tool stays silent and pan-zoom owns the gesture.
 */

import type { Renderer } from '../render/renderer.js';
import { pointerToWorld } from './context.js';
import type { DragOverlayRef } from './context.js';
import { hitTestToken } from './hit-test.js';
import type { Store } from '../state/store.js';

export interface SpectatorDragOptions {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  store: Store;
  /** This tab's stable playerId (compared against `Token.ownerId`). */
  getPlayerId(): string;
  /**
   * Returns true when another tool already owns the gesture (pan-
   * zoom space-held, ruler-active, suggest-mode-active). When true,
   * this tool's pointerdown is a no-op so the other tool's handler
   * can claim it without interference.
   */
  shouldDefer(): boolean;
  /** Drag-overlay ref shared with the renderer. */
  dragOverlay: DragOverlayRef;
  /**
   * Fired on pointerup with the FINAL world coords of the dragged
   * token. The host typically broadcasts a `token-claim-move`
   * message + clears the overlay. Skipped when the drag was a no-op
   * (zero delta).
   */
  onCommit(tokenId: string, x: number, y: number): void;
}

export interface SpectatorDragHandle {
  destroy(): void;
}

export function attachSpectatorDrag(
  opts: SpectatorDragOptions,
): SpectatorDragHandle {
  const { canvas, renderer, store, getPlayerId, shouldDefer, dragOverlay, onCommit } = opts;

  let activePointerId: number | null = null;
  let dragTokenId: string | null = null;
  let dragStartWorldX = 0;
  let dragStartWorldY = 0;

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    if (shouldDefer()) return;
    const world = pointerToWorld(canvas, renderer, e);
    const state = store.getState();
    const hit = hitTestToken(state.tokens, state.grid, world.x, world.y);
    if (!hit) return;
    if (hit.ownerId !== getPlayerId()) return;
    activePointerId = e.pointerId;
    dragTokenId = hit.id;
    dragStartWorldX = world.x;
    dragStartWorldY = world.y;
    dragOverlay.current = {
      ids: [hit.id],
      deltaX: 0,
      deltaY: 0,
    };
    canvas.setPointerCapture(e.pointerId);
    renderer.requestRender();
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== activePointerId || dragTokenId === null) return;
    const world = pointerToWorld(canvas, renderer, e);
    dragOverlay.current = {
      ids: [dragTokenId],
      deltaX: world.x - dragStartWorldX,
      deltaY: world.y - dragStartWorldY,
    };
    renderer.requestRender();
  }

  function endDrag(e: PointerEvent) {
    if (e.pointerId !== activePointerId || dragTokenId === null) return;
    const overlay = dragOverlay.current;
    const tokenId = dragTokenId;
    activePointerId = null;
    dragTokenId = null;
    dragOverlay.current = null;
    canvas.releasePointerCapture(e.pointerId);
    renderer.requestRender();
    if (!overlay) return;
    if (overlay.deltaX === 0 && overlay.deltaY === 0) return;
    // Convert the delta from world pixels back to grid cells (matching
    // the Token coordinate system) + add to the token's pre-drag
    // position. We re-look up the token for fresh state in case the
    // GM's last patch shifted it mid-drag.
    const state = store.getState();
    const token = state.tokens.find((t) => t.id === tokenId);
    if (!token) return;
    const cellSize = state.grid.cellSize;
    const newX = token.x + overlay.deltaX / cellSize;
    const newY = token.y + overlay.deltaY / cellSize;
    onCommit(tokenId, newX, newY);
  }

  function onPointerCancel(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    dragTokenId = null;
    dragOverlay.current = null;
    canvas.releasePointerCapture(e.pointerId);
    renderer.requestRender();
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', onPointerCancel);

  return {
    destroy() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', onPointerCancel);
    },
  };
}

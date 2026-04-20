import type { InputContext, DrawOverlayRef } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import { nid } from '../util/id.js';
import { appendStrokePoint } from '../state/draw.js';
import type {
  DrawStroke,
  DrawStrokeVisibility,
} from '../state/types.js';

export interface DrawToolOptions {
  color: string;
  /** Stroke width in world pixels at zoom=1. */
  width: number;
  visibility: DrawStrokeVisibility;
}

export interface DrawToolOptionsRef {
  current: DrawToolOptions;
}

export function createDrawToolOptionsRef(initial: DrawToolOptions): DrawToolOptionsRef {
  return { current: { ...initial } };
}

export interface DrawToolContext extends InputContext {
  drawOverlay: DrawOverlayRef;
  drawOptions: DrawToolOptionsRef;
}

/**
 * Freehand drawing tool. Each pointer drag produces one committed
 * `DrawStroke`. While drawing, points accumulate into the `drawOverlay`
 * ref so the in-progress stroke renders without touching store state
 * on every pointermove.
 */
export function createDrawTool(ctx: DrawToolContext): Tool {
  const { canvas, renderer, store, drawOverlay, drawOptions } = ctx;
  let activePointerId: number | null = null;

  function newStroke(wx: number, wy: number): DrawStroke {
    const { color, width, visibility } = drawOptions.current;
    return {
      id: nid(),
      color,
      width,
      visibility,
      points: [{ x: wx, y: wy }],
    };
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const world = pointerToWorld(canvas, renderer, e);
    activePointerId = e.pointerId;
    drawOverlay.current = newStroke(world.x, world.y);
    canvas.setPointerCapture(e.pointerId);
    renderer.requestRender();
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    const inProgress = drawOverlay.current;
    if (!inProgress) return;
    const world = pointerToWorld(canvas, renderer, e);
    const nextPoints = appendStrokePoint(
      inProgress.points,
      world.x,
      world.y,
    );
    if (nextPoints.length !== inProgress.points.length) {
      drawOverlay.current = { ...inProgress, points: nextPoints };
      renderer.requestRender();
    }
  }

  function endDrag(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
    const stroke = drawOverlay.current;
    drawOverlay.current = null;
    if (!stroke) {
      renderer.requestRender();
      return;
    }
    // Commit only if the user actually drew something — a click without
    // movement leaves a single-point stroke, which is still worth
    // committing (useful as a dot). But a zero-point stroke (shouldn't
    // happen) would be dropped.
    if (stroke.points.length === 0) {
      renderer.requestRender();
      return;
    }
    store.applyPatch({ kind: 'stroke-add', stroke });
    renderer.requestRender();
  }

  return {
    name: 'draw',
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
      if (drawOverlay.current) {
        drawOverlay.current = null;
        renderer.requestRender();
      }
      activePointerId = null;
    },
  };
}

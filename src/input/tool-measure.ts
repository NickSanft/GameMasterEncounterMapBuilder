import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import type { MeasurementOverlayRef } from './context.js';
import type { Renderer } from '../render/renderer.js';
import { clampToRadius, feetToWorldPx } from '../state/ruler.js';

export interface RulerToolOptions {
  /** Target clamp radius in feet, or null for freeform. */
  targetFeet: number | null;
}

export interface RulerToolOptionsRef {
  current: RulerToolOptions;
}

export function createRulerToolOptionsRef(
  initial: RulerToolOptions = { targetFeet: null },
): RulerToolOptionsRef {
  return { current: { ...initial } };
}

export interface MeasureToolContext {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  measurementOverlay: MeasurementOverlayRef;
  isSpaceHeld(): boolean;
  /** Optional — when omitted the ruler is freeform. */
  rulerOptions?: RulerToolOptionsRef;
  /** Optional — feet-per-square for converting target feet → world px. */
  getFeetPerSquare?(): number;
  /** Optional — cell size for the same conversion. */
  getCellSize?(): number;
}

export function createMeasureTool(ctx: MeasureToolContext): Tool {
  const { canvas, renderer, measurementOverlay } = ctx;
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;

  function clampedEnd(endX: number, endY: number): { endX: number; endY: number } {
    const targetFeet = ctx.rulerOptions?.current.targetFeet ?? null;
    if (targetFeet === null) return { endX, endY };
    const feetPerSquare = ctx.getFeetPerSquare?.() ?? 5;
    const cellSize = ctx.getCellSize?.() ?? 50;
    const radiusPx = feetToWorldPx(targetFeet, feetPerSquare, cellSize);
    return clampToRadius(startX, startY, endX, endY, radiusPx);
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const world = pointerToWorld(canvas, renderer, e);
    startX = world.x;
    startY = world.y;
    activePointerId = e.pointerId;
    const clamped = clampedEnd(world.x, world.y);
    measurementOverlay.current = {
      startX,
      startY,
      endX: clamped.endX,
      endY: clamped.endY,
    };
    canvas.setPointerCapture(e.pointerId);
    renderer.requestRender();
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    const world = pointerToWorld(canvas, renderer, e);
    const clamped = clampedEnd(world.x, world.y);
    measurementOverlay.current = {
      startX,
      startY,
      endX: clamped.endX,
      endY: clamped.endY,
    };
    renderer.requestRender();
  }

  function endDrag(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    measurementOverlay.current = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
    renderer.requestRender();
  }

  return {
    name: 'measure',
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
      if (measurementOverlay.current) {
        measurementOverlay.current = null;
        renderer.requestRender();
      }
      activePointerId = null;
    },
  };
}

import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import type { MeasurementOverlayRef } from './context.js';
import type { Renderer } from '../render/renderer.js';

export interface MeasureToolContext {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  measurementOverlay: MeasurementOverlayRef;
  isSpaceHeld(): boolean;
}

export function createMeasureTool(ctx: MeasureToolContext): Tool {
  const { canvas, renderer, measurementOverlay } = ctx;
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const world = pointerToWorld(canvas, renderer, e);
    startX = world.x;
    startY = world.y;
    activePointerId = e.pointerId;
    measurementOverlay.current = {
      startX,
      startY,
      endX: world.x,
      endY: world.y,
    };
    canvas.setPointerCapture(e.pointerId);
    renderer.requestRender();
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    const world = pointerToWorld(canvas, renderer, e);
    measurementOverlay.current = {
      startX,
      startY,
      endX: world.x,
      endY: world.y,
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

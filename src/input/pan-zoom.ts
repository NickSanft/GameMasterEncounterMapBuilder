import type { Renderer } from '../render/renderer.js';
import { screenToWorld } from '../render/coords.js';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.1;

export interface PanZoomHandle {
  destroy(): void;
  isPanning(): boolean;
}

export function attachPanZoom(renderer: Renderer): PanZoomHandle {
  const canvas = renderer.canvas;
  let spaceHeld = false;
  let panning = false;
  let lastX = 0;
  let lastY = 0;
  let activePointerId: number | null = null;

  function canvasPoint(e: PointerEvent | WheelEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const { x: sx, y: sy } = canvasPoint(e);
    const camera = renderer.camera;
    const before = screenToWorld(camera, sx, sy);
    const direction = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * direction));
    if (newZoom === camera.zoom) return;
    const newCamX = before.x - sx / newZoom;
    const newCamY = before.y - sy / newZoom;
    renderer.camera = { x: newCamX, y: newCamY, zoom: newZoom };
  }

  function shouldStartPan(e: PointerEvent): boolean {
    if (e.button === 1) return true;
    if (e.button === 0 && spaceHeld) return true;
    return false;
  }

  function onPointerDown(e: PointerEvent) {
    if (!shouldStartPan(e)) return;
    panning = true;
    activePointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!panning || e.pointerId !== activePointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    const camera = renderer.camera;
    renderer.camera = {
      x: camera.x - dx / camera.zoom,
      y: camera.y - dy / camera.zoom,
      zoom: camera.zoom,
    };
  }

  function endPan(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    panning = false;
    activePointerId = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
    canvas.style.cursor = spaceHeld ? 'grab' : '';
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' && !spaceHeld) {
      spaceHeld = true;
      if (!panning) canvas.style.cursor = 'grab';
      if (e.target === document.body) e.preventDefault();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') {
      spaceHeld = false;
      if (!panning) canvas.style.cursor = '';
    }
  }

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();
  }

  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endPan);
  canvas.addEventListener('pointercancel', endPan);
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return {
    destroy() {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endPan);
      canvas.removeEventListener('pointercancel', endPan);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
    isPanning() {
      return panning;
    },
  };
}

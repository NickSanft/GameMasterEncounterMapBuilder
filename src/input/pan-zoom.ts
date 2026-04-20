import type { Renderer } from '../render/renderer.js';
import { screenToWorld } from '../render/coords.js';
import { pinchStart, pinchUpdate, type PinchSnapshot } from './pinch.js';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.1;

export interface PanZoomHandle {
  destroy(): void;
  isPanning(): boolean;
  isSpaceHeld(): boolean;
  /**
   * True while a two-finger pinch is in progress. Tools consult this to
   * suppress their own single-finger logic (e.g. the Token tool should
   * not drop a token mid-pinch).
   */
  isPinching(): boolean;
  setWheelEnabled(enabled: boolean): void;
}

export function attachPanZoom(renderer: Renderer): PanZoomHandle {
  const canvas = renderer.canvas;
  let spaceHeld = false;
  let panning = false;
  let wheelEnabled = true;
  let lastX = 0;
  let lastY = 0;
  let activePointerId: number | null = null;

  // Touch-state: map of active touch pointers, plus the pinch snapshot
  // taken when the second finger lands.
  const touchPoints = new Map<number, { x: number; y: number }>();
  let pinchSnapshot: PinchSnapshot | null = null;

  function canvasPoint(e: PointerEvent | WheelEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onWheel(e: WheelEvent) {
    if (!wheelEnabled) return;
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

  function cancelPointerForTools(pointerId: number) {
    // Synthesise a pointercancel so active tools (Select drag, Draw
    // stroke, Measure ruler, etc.) reset their state when a second
    // finger lands and the gesture switches to pinch.
    const ev = new PointerEvent('pointercancel', {
      pointerId,
      pointerType: 'touch',
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(ev);
  }

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'touch') {
      touchPoints.set(e.pointerId, canvasPoint(e));
      // If the second finger just landed, capture a pinch snapshot and
      // cancel any in-flight single-finger pan/tool gesture.
      if (touchPoints.size === 2) {
        const pts = Array.from(touchPoints.values());
        pinchSnapshot = pinchStart(pts[0]!, pts[1]!, renderer.camera);
        if (panning) {
          panning = false;
          activePointerId = null;
        }
        // Broadcast pointercancel for each tracked finger so tools
        // let go of their single-touch state machines.
        for (const id of touchPoints.keys()) cancelPointerForTools(id);
        e.preventDefault();
      }
      return;
    }
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
    if (e.pointerType === 'touch') {
      if (touchPoints.has(e.pointerId)) {
        touchPoints.set(e.pointerId, canvasPoint(e));
      }
      if (pinchSnapshot && touchPoints.size >= 2) {
        const pts = Array.from(touchPoints.values());
        renderer.camera = pinchUpdate(pinchSnapshot, pts[0]!, pts[1]!, {
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
        });
        e.preventDefault();
      }
      return;
    }
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
    if (e.pointerType === 'touch') {
      touchPoints.delete(e.pointerId);
      if (touchPoints.size < 2) {
        // Dropping below two fingers ends the pinch.
        pinchSnapshot = null;
      }
      return;
    }
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
    isSpaceHeld() {
      return spaceHeld;
    },
    isPinching() {
      return pinchSnapshot !== null;
    },
    setWheelEnabled(enabled: boolean) {
      wheelEnabled = enabled;
    },
  };
}

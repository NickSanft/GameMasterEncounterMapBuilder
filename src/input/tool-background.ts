import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { screenToWorld } from '../render/coords.js';

const MIN_SCALE = 0.05;
const MAX_SCALE = 20;
const SCALE_STEP = 1.05;

export function createBackgroundTool(ctx: InputContext): Tool {
  const { canvas, renderer, store } = ctx;
  let dragging = false;
  let lastClientX = 0;
  let lastClientY = 0;
  let activePointerId: number | null = null;

  function hasBackground(): boolean {
    return store.getState().background.imageId !== null;
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    if (!hasBackground()) return;
    dragging = true;
    activePointerId = e.pointerId;
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || e.pointerId !== activePointerId) return;
    const dx = e.clientX - lastClientX;
    const dy = e.clientY - lastClientY;
    lastClientX = e.clientX;
    lastClientY = e.clientY;
    const zoom = renderer.camera.zoom || 1;
    const bg = store.getState().background;
    store.applyPatch({
      kind: 'background-update',
      changes: {
        offsetX: bg.offsetX + dx / zoom,
        offsetY: bg.offsetY + dy / zoom,
      },
    });
  }

  function endDrag(e: PointerEvent) {
    if (!dragging || e.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
  }

  function onWheel(e: WheelEvent) {
    if (!hasBackground()) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(renderer.camera, sx, sy);
    const bg = store.getState().background;
    const factor = e.deltaY < 0 ? SCALE_STEP : 1 / SCALE_STEP;
    const newScaleX = Math.min(MAX_SCALE, Math.max(MIN_SCALE, bg.scaleX * factor));
    const newScaleY = Math.min(MAX_SCALE, Math.max(MIN_SCALE, bg.scaleY * factor));
    if (newScaleX === bg.scaleX && newScaleY === bg.scaleY) return;
    const imageX = (world.x - bg.offsetX) / bg.scaleX;
    const imageY = (world.y - bg.offsetY) / bg.scaleY;
    store.applyPatch({
      kind: 'background-update',
      changes: {
        scaleX: newScaleX,
        scaleY: newScaleY,
        offsetX: world.x - imageX * newScaleX,
        offsetY: world.y - imageY * newScaleY,
      },
    });
  }

  return {
    name: 'background',
    cursor: 'move',
    activate() {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      ctx.setWheelEnabled(false);
    },
    deactivate() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      canvas.removeEventListener('wheel', onWheel);
      ctx.setWheelEnabled(true);
      dragging = false;
      activePointerId = null;
    },
  };
}

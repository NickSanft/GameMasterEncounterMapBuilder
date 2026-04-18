import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import { nid } from '../util/id.js';
import type { AoeKind, AoeVisibility } from '../state/types.js';
import { aoePlacementFromDrag, isAoeDragTrivial } from '../state/aoe.js';

export interface AoeToolOptions {
  kind: AoeKind;
  color: string;
  visibility: AoeVisibility;
}

export interface AoeToolOptionsRef {
  current: AoeToolOptions;
}

export function createAoeToolOptionsRef(options: AoeToolOptions): AoeToolOptionsRef {
  return { current: options };
}

export function createAoeTool(
  ctx: InputContext,
  optionsRef: AoeToolOptionsRef,
): Tool {
  const { canvas, renderer, store, aoeOverlay } = ctx;
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const world = pointerToWorld(canvas, renderer, e);
    startX = world.x;
    startY = world.y;
    activePointerId = e.pointerId;
    aoeOverlay.current = aoePlacementFromDrag(startX, startY, world.x, world.y, {
      kind: optionsRef.current.kind,
      color: optionsRef.current.color,
    });
    canvas.setPointerCapture(e.pointerId);
    renderer.requestRender();
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    const world = pointerToWorld(canvas, renderer, e);
    aoeOverlay.current = aoePlacementFromDrag(startX, startY, world.x, world.y, {
      kind: optionsRef.current.kind,
      color: optionsRef.current.color,
    });
    renderer.requestRender();
  }

  function endDrag(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    const preview = aoeOverlay.current;
    activePointerId = null;
    aoeOverlay.current = null;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }

    if (preview && !isAoeDragTrivial(preview)) {
      store.applyPatch({
        kind: 'aoe-add',
        template: {
          id: nid(),
          kind: preview.kind,
          x: preview.x,
          y: preview.y,
          length: preview.length,
          width: preview.width,
          rotation: preview.rotation,
          color: preview.color,
          visibility: optionsRef.current.visibility,
        },
      });
    }
    renderer.requestRender();
  }

  return {
    name: 'aoe',
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
      if (aoeOverlay.current) {
        aoeOverlay.current = null;
        renderer.requestRender();
      }
      activePointerId = null;
    },
  };
}

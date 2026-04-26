import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import { nid } from '../util/id.js';
import type { AoeKind, AoeVisibility } from '../state/types.js';
import { aoePlacementFromDrag, isAoeDragTrivial } from '../state/aoe.js';
import {
  rotateStart,
  rotateUpdate,
  type RotateSnapshot,
} from './two-finger-rotate.js';

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

/** AoE kinds that actually use rotation (cone + line). Sphere + cube ignore. */
function rotationApplies(kind: AoeKind): boolean {
  return kind === 'cone' || kind === 'line';
}

export function createAoeTool(
  ctx: InputContext,
  optionsRef: AoeToolOptionsRef,
): Tool {
  const { canvas, renderer, store, aoeOverlay } = ctx;
  let activePointerId: number | null = null;
  let startX = 0;
  let startY = 0;

  // Phase 104 — two-finger rotate state. When a second touch lands
  // during an active AoE preview, capture both fingers + the AoE's
  // current rotation. While both fingers are down, rotation is
  // driven by the angle between them; length stays frozen at the
  // value it had at gesture start. Lifting EITHER finger ends the
  // rotate mode and (if the primary finger was the one lifted)
  // commits the AoE.
  let rotateSnap: RotateSnapshot | null = null;
  let secondPointerId: number | null = null;
  let firstFingerScreen = { x: 0, y: 0 };
  let secondFingerScreen = { x: 0, y: 0 };
  let frozenLength = 0;
  let frozenWidth = 0;

  function screenPoint(e: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: PointerEvent) {
    // Phase 104 — second touch landing during an active preview
    // upgrades the gesture to rotate-mode. Only honored for AoE kinds
    // that actually have a rotation (cone + line); sphere + cube ignore.
    if (
      e.pointerType === 'touch' &&
      activePointerId !== null &&
      e.pointerId !== activePointerId &&
      secondPointerId === null &&
      aoeOverlay.current !== null &&
      rotationApplies(optionsRef.current.kind)
    ) {
      secondPointerId = e.pointerId;
      secondFingerScreen = screenPoint(e);
      rotateSnap = rotateStart(
        firstFingerScreen,
        secondFingerScreen,
        aoeOverlay.current.rotation,
      );
      // Freeze length + width at gesture-start so a tiny finger drift
      // doesn't also resize the AoE while the user is rotating.
      frozenLength = aoeOverlay.current.length;
      frozenWidth = aoeOverlay.current.width;
      e.preventDefault();
      return;
    }
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const world = pointerToWorld(canvas, renderer, e);
    startX = world.x;
    startY = world.y;
    activePointerId = e.pointerId;
    firstFingerScreen = screenPoint(e);
    aoeOverlay.current = aoePlacementFromDrag(startX, startY, world.x, world.y, {
      kind: optionsRef.current.kind,
      color: optionsRef.current.color,
    });
    canvas.setPointerCapture(e.pointerId);
    renderer.requestRender();
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    // Phase 104 — when rotate-mode is active, either finger moving
    // drives the rotation. The first finger's anchor (`startX/Y`)
    // doesn't change; only the angle between the two fingers.
    if (rotateSnap !== null) {
      if (e.pointerId === activePointerId) {
        firstFingerScreen = screenPoint(e);
      } else if (e.pointerId === secondPointerId) {
        secondFingerScreen = screenPoint(e);
      } else {
        return;
      }
      const newRotation = rotateUpdate(
        rotateSnap,
        firstFingerScreen,
        secondFingerScreen,
      );
      const preview = aoeOverlay.current;
      if (preview) {
        aoeOverlay.current = {
          ...preview,
          rotation: newRotation,
          length: frozenLength,
          width: frozenWidth,
        };
      }
      renderer.requestRender();
      return;
    }
    if (e.pointerId !== activePointerId) return;
    const world = pointerToWorld(canvas, renderer, e);
    aoeOverlay.current = aoePlacementFromDrag(startX, startY, world.x, world.y, {
      kind: optionsRef.current.kind,
      color: optionsRef.current.color,
    });
    renderer.requestRender();
  }

  function endRotate() {
    rotateSnap = null;
    secondPointerId = null;
  }

  function endDrag(e: PointerEvent) {
    // Phase 104 — second finger lifting just drops out of rotate-mode
    // without committing. The first finger remains and the user can
    // continue to length-adjust by moving it.
    if (rotateSnap !== null && e.pointerId === secondPointerId) {
      endRotate();
      e.preventDefault();
      return;
    }
    if (e.pointerId !== activePointerId) return;
    // Ensure rotate-mode is fully torn down whichever finger lifts
    // first (e.g. the primary finger lifts before the rotate finger).
    endRotate();
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
      endRotate();
    },
  };
}

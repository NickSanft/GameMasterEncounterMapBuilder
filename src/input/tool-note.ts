import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import { nid } from '../util/id.js';
import type { Annotation } from '../state/types.js';
import { DEFAULT_ANNOTATION_COLOR } from '../state/annotation-presets.js';

export function createNoteTool(
  ctx: InputContext,
  onAnnotationCreated: (a: Annotation) => void,
): Tool {
  const { canvas, renderer, store } = ctx;

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const world = pointerToWorld(canvas, renderer, e);
    const annotation: Annotation = {
      id: nid(),
      x: world.x,
      y: world.y,
      text: '',
      color: DEFAULT_ANNOTATION_COLOR,
      visibility: 'shared',
    };
    store.applyPatch({ kind: 'annotation-add', annotation });
    onAnnotationCreated(annotation);
    renderer.requestRender();
    e.preventDefault();
  }

  return {
    name: 'note',
    cursor: 'crosshair',
    activate() {
      canvas.addEventListener('pointerdown', onPointerDown);
    },
    deactivate() {
      canvas.removeEventListener('pointerdown', onPointerDown);
    },
  };
}

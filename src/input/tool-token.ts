import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import { nid } from '../util/id.js';
import { nextTokenColor } from '../state/token-colors.js';

export function createTokenTool(ctx: InputContext): Tool {
  const { canvas, renderer, store } = ctx;

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const world = pointerToWorld(canvas, renderer, e);
    const grid = store.getState().grid;
    const gx = Math.floor(world.x / grid.cellSize);
    const gy = Math.floor(world.y / grid.cellSize);
    if (gx < 0 || gy < 0 || gx >= grid.cols || gy >= grid.rows) return;
    const count = store.getState().tokens.length;
    store.applyPatch({
      kind: 'token-add',
      token: {
        id: nid(),
        x: gx,
        y: gy,
        label: `Token ${count + 1}`,
        color: nextTokenColor(count),
        imageId: null,
        size: 1,
        borderColor: null,
      },
    });
    e.preventDefault();
  }

  return {
    name: 'token',
    cursor: 'crosshair',
    activate() {
      canvas.addEventListener('pointerdown', onPointerDown);
    },
    deactivate() {
      canvas.removeEventListener('pointerdown', onPointerDown);
    },
  };
}

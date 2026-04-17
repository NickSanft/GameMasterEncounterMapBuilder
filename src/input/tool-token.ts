import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import { nid } from '../util/id.js';

const TOKEN_COLORS = [
  '#e06c75',
  '#98c379',
  '#61afef',
  '#c678dd',
  '#e5c07b',
  '#56b6c2',
];

export function createTokenTool(ctx: InputContext): Tool {
  const { canvas, renderer, store } = ctx;

  function nextColor(): string {
    const count = store.getState().tokens.length;
    return TOKEN_COLORS[count % TOKEN_COLORS.length]!;
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const world = pointerToWorld(canvas, renderer, e);
    const grid = store.getState().grid;
    const gx = Math.floor(world.x / grid.cellSize);
    const gy = Math.floor(world.y / grid.cellSize);
    if (gx < 0 || gy < 0 || gx >= grid.cols || gy >= grid.rows) return;
    const n = store.getState().tokens.length + 1;
    store.applyPatch({
      kind: 'token-add',
      token: {
        id: nid(),
        x: gx,
        y: gy,
        label: `Token ${n}`,
        color: nextColor(),
        imageId: null,
        size: 1,
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

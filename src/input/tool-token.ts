import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import { nid } from '../util/id.js';
import { nextTokenColor } from '../state/token-colors.js';
import { worldToCell } from '../state/grid-coords.js';

export function createTokenTool(ctx: InputContext): Tool {
  const { canvas, renderer, store } = ctx;

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || ctx.isSpaceHeld()) return;
    const world = pointerToWorld(canvas, renderer, e);
    const grid = store.getState().grid;
    // Phase 130 — hex-aware drop. Square grids floor by cellSize;
    // hex grids snap to the nearest hex via cube-rounding.
    const { col: gx, row: gy } = worldToCell(world.x, world.y, grid);
    if (gx < 0 || gy < 0 || gx >= grid.cols || gy >= grid.rows) return;

    const stampTemplate = e.altKey ? ctx.lastPlaced.current : null;
    let newToken;
    if (stampTemplate) {
      newToken = { ...stampTemplate, id: nid(), x: gx, y: gy };
    } else {
      const count = store.getState().tokens.length;
      newToken = {
        id: nid(),
        x: gx,
        y: gy,
        label: `Token ${count + 1}`,
        color: nextTokenColor(count),
        imageId: null,
        size: 1,
        borderColor: null,
        hp: null,
        conditions: [],
        rotation: 0,
        losRadius: null,
        light: null,
        initiativeMod: 0,
        conditionExpirations: {},
        deathSaves: { successes: 0, failures: 0 },
        ownerId: null,
      };
    }
    store.applyPatch({ kind: 'token-add', token: newToken });
    ctx.lastPlaced.current = newToken;
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

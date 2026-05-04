import type { InputContext } from './context.js';
import type { Tool } from './tool-manager.js';
import { pointerToWorld } from './context.js';
import { nid } from '../util/id.js';
import { nextTokenColor } from '../state/token-colors.js';
import { worldToCell } from '../state/grid-coords.js';
import { nextLabelSuffix } from '../state/token-numbering.js';

/**
 * Phase 137 — optional helpers from the host. `autoNumber()` gates
 * the alt-stamp auto-suffix behavior on `preferences.autoNumberDuplicateTokens`.
 * Omitted in tests / minimal callers → defaults to OFF (legacy
 * stamp behavior, identical to pre-137).
 */
export interface TokenToolOptions {
  autoNumber?: () => boolean;
}

export function createTokenTool(
  ctx: InputContext,
  options: TokenToolOptions = {},
): Tool {
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
      // Phase 137 — auto-number alt-stamped duplicates. Fresh
      // drops use the existing `Token N` counter (always unique);
      // alt-stamps copy the source label and would collide.
      if (options.autoNumber?.()) {
        const existing = store.getState().tokens.map((t) => t.label);
        newToken.label = nextLabelSuffix(existing, stampTemplate.label);
      }
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

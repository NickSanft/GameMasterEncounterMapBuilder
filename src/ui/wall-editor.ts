/**
 * Phase 85 — GM-side wall editor modal.
 *
 * Pre-85 the GM could only adjust a wall by deleting + re-creating it
 * (the sole context-menu actions were "Disable sight blocking" and
 * "Delete wall"). This modal exposes everything the wall stores in
 * one place: sight blocking, movement blocking, visibility (shared
 * vs GM-only secret), and the new per-wall thickness slider.
 *
 * Multi-edit semantics — when more than one wall is selected, every
 * field shows a "mixed" / "—" state if the values diverge across the
 * selection, and applying the change writes it to ALL selected walls
 * via a `store.batch()` so undo peels back the multi-update as a
 * single step. Toggling a multi-edit checkbox sets every wall to the
 * NEW value (not the inverse of each one's current state).
 */

import type { Wall } from '../state/types.js';
import {
  WALL_DEFAULT_THICKNESS_PX,
  WALL_MIN_THICKNESS_PX,
  WALL_MAX_THICKNESS_PX,
  clampThickness,
} from '../state/walls.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface WallEditorHandle {
  /**
   * Open the editor for the given walls. The list is captured by
   * value at open-time; subsequent state mutations re-fetch via
   * `getWallsById` so the displayed values stay live.
   */
  openFor(walls: readonly Wall[]): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface WallEditorChange {
  blocksSight?: boolean;
  blocksMovement?: boolean;
  thickness?: number;
  visibility?: 'shared' | 'gm';
  /**
   * Phase 113 — door promotion / state. `null` removes the door
   * promotion entirely; `{open}` sets / updates it. Block walls
   * silently ignore the field (the editor hides the door row when
   * any block is in the edit selection).
   */
  door?: { open: boolean } | null;
}

export interface WallEditorOptions {
  /**
   * Resolve the live state of a wall by id. Called whenever the modal
   * re-renders so a concurrent wall-update from elsewhere (drag, undo)
   * is reflected in the UI.
   */
  getWallById(id: string): Wall | null;
  /**
   * Apply `changes` to every wall in `ids`. The host wraps the calls
   * in `store.batch` so undo treats the multi-edit as a single step.
   */
  onChange(ids: readonly string[], changes: WallEditorChange): void;
  /**
   * Delete every wall in `ids`. Closes the modal on success — the
   * walls no longer exist to edit.
   */
  onDelete(ids: readonly string[]): void;
  /**
   * Phase 111 — current grid cell size in world pixels. Used by the
   * "Fill cell" preset button to set thickness to (cellSize, clamped
   * to WALL_MAX_THICKNESS_PX) so the wall renders at exactly one
   * grid cell wide. Optional; the button is hidden when omitted.
   */
  getCellSize?(): number;
}

export function mountWallEditor(opts: WallEditorOptions): WallEditorHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal wall-editor';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Edit wall');
  modal.innerHTML = `
    <div class="modal-header">
      <h2 data-field="title">Edit wall</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p class="wall-editor-hint" data-field="hint">
        Toggle behavior + adjust the line thickness. Drag the endpoint
        handles on the canvas to move the wall in place.
      </p>

      <div class="wall-editor-row">
        <label class="wall-editor-toggle">
          <input type="checkbox" data-field="sight" />
          <span>Blocks sight (line-of-sight)</span>
        </label>
      </div>

      <div class="wall-editor-row">
        <label class="wall-editor-toggle">
          <input type="checkbox" data-field="movement" />
          <span>Blocks movement (reserved for pathing)</span>
        </label>
      </div>

      <div class="wall-editor-row">
        <fieldset class="wall-editor-fieldset">
          <legend>Visibility to players</legend>
          <label class="wall-editor-radio">
            <input type="radio" name="wall-vis" value="shared" data-field="vis-shared" />
            <span>Shared — players see the wall outline</span>
          </label>
          <label class="wall-editor-radio">
            <input type="radio" name="wall-vis" value="gm" data-field="vis-gm" />
            <span>GM-only — wall blocks LoS but stays hidden (secret door / passage)</span>
          </label>
        </fieldset>
      </div>

      <div class="wall-editor-row">
        <label class="wall-editor-slider">
          <span>Line thickness</span>
          <input type="range" data-field="thickness"
                 min="${WALL_MIN_THICKNESS_PX}" max="${WALL_MAX_THICKNESS_PX}" step="0.5" />
          <output data-field="thickness-out">—</output>
        </label>
        <!-- Phase 111 — one-click preset that snaps thickness to the
             current grid cell size (clamped to MAX). Hidden when
             getCellSize wasn't supplied. -->
        <button type="button" class="wall-editor-fill-cell" data-field="fill-cell"
          title="Snap thickness to one full grid cell (Phase 111)" hidden>
          Fill cell
        </button>
      </div>

      <!-- Phase 113 — door promotion. Hidden when the edit selection
           contains any block walls (blocks can't be doors). -->
      <div class="wall-editor-row" data-field="door-row" hidden>
        <label class="wall-editor-toggle">
          <input type="checkbox" data-field="door" />
          <span>Door — toggles open / closed mid-session</span>
        </label>
        <label class="wall-editor-toggle wall-editor-door-state" data-field="door-state-row" hidden>
          <input type="checkbox" data-field="door-open" />
          <span>Currently open (no LoS / movement contribution)</span>
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn-danger" data-field="delete">Delete</button>
      <span class="modal-spacer"></span>
      <button type="button" class="btn-primary" data-field="done">Done</button>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const titleEl = modal.querySelector<HTMLHeadingElement>('[data-field="title"]')!;
  const sightEl = modal.querySelector<HTMLInputElement>('[data-field="sight"]')!;
  const movementEl = modal.querySelector<HTMLInputElement>('[data-field="movement"]')!;
  const visSharedEl = modal.querySelector<HTMLInputElement>('[data-field="vis-shared"]')!;
  const visGmEl = modal.querySelector<HTMLInputElement>('[data-field="vis-gm"]')!;
  const thicknessEl = modal.querySelector<HTMLInputElement>('[data-field="thickness"]')!;
  const thicknessOut = modal.querySelector<HTMLOutputElement>('[data-field="thickness-out"]')!;
  const fillCellBtn = modal.querySelector<HTMLButtonElement>('[data-field="fill-cell"]')!;
  // Phase 113 — door promotion controls.
  const doorRow = modal.querySelector<HTMLDivElement>('[data-field="door-row"]')!;
  const doorEl = modal.querySelector<HTMLInputElement>('[data-field="door"]')!;
  const doorStateRow = modal.querySelector<HTMLLabelElement>('[data-field="door-state-row"]')!;
  const doorOpenEl = modal.querySelector<HTMLInputElement>('[data-field="door-open"]')!;
  // Phase 111 — surface the Fill-cell preset only when the host wired
  // a `getCellSize` provider. Tests / minimal mounts can omit it.
  if (opts.getCellSize) {
    fillCellBtn.hidden = false;
  }
  const deleteBtn = modal.querySelector<HTMLButtonElement>('[data-field="delete"]')!;
  const doneBtn = modal.querySelector<HTMLButtonElement>('[data-field="done"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  let triggerFocus: HTMLElement | null = null;
  let editingIds: string[] = [];

  function liveWalls(): Wall[] {
    const out: Wall[] = [];
    for (const id of editingIds) {
      const w = opts.getWallById(id);
      if (w) out.push(w);
    }
    return out;
  }

  function render() {
    const walls = liveWalls();
    if (walls.length === 0) {
      // Walls vanished while editing (e.g. undo). Close — there's
      // nothing to edit and no useful UI to show.
      close();
      return;
    }

    titleEl.textContent =
      walls.length === 1 ? 'Edit wall' : `Edit walls (${walls.length})`;

    // ---- Mixed-state helpers ----
    function allSame<T>(get: (w: Wall) => T): T | null {
      const first = get(walls[0]!);
      for (let i = 1; i < walls.length; i++) {
        if (get(walls[i]!) !== first) return null;
      }
      return first;
    }

    const sightSame = allSame((w) => w.blocksSight);
    sightEl.checked = sightSame ?? false;
    sightEl.indeterminate = sightSame === null;

    const movementSame = allSame((w) => w.blocksMovement);
    movementEl.checked = movementSame ?? false;
    movementEl.indeterminate = movementSame === null;

    const visSame = allSame((w) => w.visibility ?? 'shared');
    visSharedEl.checked = visSame === 'shared';
    visGmEl.checked = visSame === 'gm';
    // Mixed selection — neither radio reads as "checked"; the GM has
    // to pick one explicitly to apply it to all selected walls.

    // Phase 112 — thickness slider + Fill cell preset only apply to
    // segment walls. Mixed segment + block selections show the slider
    // but compute thickness only over the segments; an all-block
    // selection hides the slider row entirely (blocks have no
    // thickness — the region IS the wall).
    const segmentWalls = walls.filter((w): w is import('../state/types.js').WallSegment =>
      w.kind === 'segment',
    );
    const thicknessRow = thicknessEl.closest('.wall-editor-row') as HTMLDivElement | null;
    if (segmentWalls.length === 0) {
      // All blocks. Hide the thickness row entirely.
      if (thicknessRow) thicknessRow.hidden = true;
    } else {
      if (thicknessRow) thicknessRow.hidden = false;
      const thickSame = (() => {
        const first = segmentWalls[0]!.thickness ?? WALL_DEFAULT_THICKNESS_PX;
        for (let i = 1; i < segmentWalls.length; i++) {
          const v = segmentWalls[i]!.thickness ?? WALL_DEFAULT_THICKNESS_PX;
          if (v !== first) return null;
        }
        return first;
      })();
      if (thickSame !== null) {
        thicknessEl.value = String(thickSame);
        thicknessOut.textContent = `${thickSame.toFixed(1)} px`;
      } else {
        thicknessEl.value = String(WALL_DEFAULT_THICKNESS_PX);
        thicknessOut.textContent = '— (mixed)';
      }
    }

    // Phase 113 — door promotion controls. Hidden when ANY block wall
    // is in the edit selection (blocks can't be doors). Mixed segment
    // + block selections also hide the row to avoid confusion.
    if (segmentWalls.length === 0 || segmentWalls.length !== walls.length) {
      doorRow.hidden = true;
    } else {
      doorRow.hidden = false;
      const doorSame = (() => {
        const first = segmentWalls[0]!.door !== undefined;
        for (let i = 1; i < segmentWalls.length; i++) {
          if ((segmentWalls[i]!.door !== undefined) !== first) return null;
        }
        return first;
      })();
      doorEl.checked = doorSame ?? false;
      doorEl.indeterminate = doorSame === null;
      // The "currently open" sub-toggle only makes sense when ALL
      // selected walls ARE doors. Hide otherwise.
      if (doorSame === true) {
        doorStateRow.hidden = false;
        const openSame = (() => {
          const first = segmentWalls[0]!.door!.open;
          for (let i = 1; i < segmentWalls.length; i++) {
            if (segmentWalls[i]!.door!.open !== first) return null;
          }
          return first;
        })();
        doorOpenEl.checked = openSame ?? false;
        doorOpenEl.indeterminate = openSame === null;
      } else {
        doorStateRow.hidden = true;
      }
    }
  }

  function open(walls: readonly Wall[]) {
    editingIds = walls.map((w) => w.id);
    if (editingIds.length === 0) return;
    if (!backdrop.hidden) {
      // Already open — just re-target.
      render();
      return;
    }
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    render();
    window.setTimeout(() => sightEl.focus(), 0);
  }

  function close() {
    if (backdrop.hidden) return;
    if (modal.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    backdrop.hidden = true;
    editingIds = [];
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  // ---- Event wiring ----
  sightEl.addEventListener('change', () => {
    opts.onChange(editingIds, { blocksSight: sightEl.checked });
    render();
  });
  movementEl.addEventListener('change', () => {
    opts.onChange(editingIds, { blocksMovement: movementEl.checked });
    render();
  });
  visSharedEl.addEventListener('change', () => {
    if (visSharedEl.checked) {
      opts.onChange(editingIds, { visibility: 'shared' });
      render();
    }
  });
  visGmEl.addEventListener('change', () => {
    if (visGmEl.checked) {
      opts.onChange(editingIds, { visibility: 'gm' });
      render();
    }
  });
  thicknessEl.addEventListener('input', () => {
    const v = clampThickness(parseFloat(thicknessEl.value));
    thicknessOut.textContent = `${v.toFixed(1)} px`;
  });
  thicknessEl.addEventListener('change', () => {
    const v = clampThickness(parseFloat(thicknessEl.value));
    opts.onChange(editingIds, { thickness: v });
    render();
  });

  // Phase 111 — Fill cell snaps thickness to the current grid cell
  // size so the wall body fills exactly one cell across. The
  // `clampThickness` call below caps to WALL_MAX_THICKNESS_PX —
  // grids larger than the cap render at the cap (still chunky).
  fillCellBtn.addEventListener('click', () => {
    const cellSize = opts.getCellSize?.() ?? 0;
    if (cellSize <= 0) return;
    const v = clampThickness(cellSize);
    opts.onChange(editingIds, { thickness: v });
    render();
  });

  // Phase 113 — door promotion. Checking the box adds a `door`
  // sub-object (defaulting to closed); unchecking removes it
  // entirely. The host's `onChange` interprets `door: null` as the
  // remove signal.
  doorEl.addEventListener('change', () => {
    if (doorEl.checked) {
      opts.onChange(editingIds, { door: { open: false } });
    } else {
      opts.onChange(editingIds, { door: null });
    }
    render();
  });
  // Phase 113 — toggle the door's open/closed state. Only meaningful
  // when at least one selected wall is already a door (the row is
  // hidden otherwise).
  doorOpenEl.addEventListener('change', () => {
    opts.onChange(editingIds, { door: { open: doorOpenEl.checked } });
    render();
  });

  deleteBtn.addEventListener('click', () => {
    const ids = editingIds.slice();
    if (ids.length === 0) return;
    opts.onDelete(ids);
    close();
  });

  doneBtn.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.hidden) {
      close();
      e.preventDefault();
    }
  });

  return {
    openFor: open,
    close,
    isOpen: () => !backdrop.hidden,
    destroy() {
      backdrop.remove();
    },
  };
}

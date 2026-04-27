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
import {
  listPresets,
  savePreset,
  removePreset,
  type WallPreset,
} from '../state/wall-presets.js';

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

      <!-- Phase 117 — preset chips. Built-ins ship with the app
           (stone-exterior, interior-divider, window, secret-passage,
           wooden-door-closed); user-saved presets append after.
           Click to apply to every selected wall in one batch. -->
      <div class="wall-editor-presets" data-field="presets-row">
        <span class="wall-editor-presets-label">Presets</span>
        <div class="wall-editor-presets-chips" data-field="presets-chips" role="group" aria-label="Wall property presets"></div>
        <button type="button" class="wall-editor-presets-save" data-field="presets-save"
          title="Save the current values as a reusable preset">+ Save…</button>
      </div>

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
  // Phase 117 — preset chip strip + Save-as-preset button.
  const presetsChips = modal.querySelector<HTMLDivElement>('[data-field="presets-chips"]')!;
  const presetsSaveBtn = modal.querySelector<HTMLButtonElement>('[data-field="presets-save"]')!;
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

  /**
   * Phase 117 — paint the chip strip from `listPresets()`. Built-ins
   * + user presets, in display order. User chips get a small × inside
   * for delete; built-ins do not (they're protected by the store).
   */
  function renderPresets(): void {
    const presets = listPresets();
    presetsChips.replaceChildren();
    for (const preset of presets) {
      const chip = document.createElement('div');
      chip.className = `wall-editor-preset-chip${preset.isBuiltin ? ' is-builtin' : ' is-user'}`;
      chip.dataset.presetId = preset.id;

      const apply = document.createElement('button');
      apply.type = 'button';
      apply.className = 'wall-editor-preset-apply';
      apply.textContent = preset.name;
      apply.title = describePreset(preset);
      apply.addEventListener('click', () => {
        if (editingIds.length === 0) return;
        opts.onChange(editingIds, presetToChange(preset));
        render();
      });
      chip.appendChild(apply);

      if (!preset.isBuiltin) {
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'wall-editor-preset-delete';
        del.setAttribute('aria-label', `Delete preset ${preset.name}`);
        del.title = 'Delete this preset';
        del.textContent = '×';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          removePreset(preset.id);
          renderPresets();
        });
        chip.appendChild(del);
      }
      presetsChips.appendChild(chip);
    }
  }

  /**
   * Phase 117 — turn a preset into the editor's onChange diff. The
   * `door: null` signal removes the door promotion (the host's
   * onChange wrapper translates that into a remove + re-add patch).
   */
  function presetToChange(p: WallPreset): import('./wall-editor.js').WallEditorChange {
    const change: import('./wall-editor.js').WallEditorChange = {
      blocksSight: p.blocksSight,
      blocksMovement: p.blocksMovement,
    };
    if (p.thickness !== undefined) change.thickness = p.thickness;
    if (p.visibility !== undefined) change.visibility = p.visibility;
    // door is tri-state on the preset: undefined = leave alone,
    // {open} = set, null = remove. The editor's WallEditorChange
    // mirrors the same shape; we only forward `door` when it's
    // explicitly set on the preset (presets that don't mention
    // doors leave the wall's door state untouched).
    if (p.door !== undefined) change.door = p.door;
    return change;
  }

  function describePreset(p: WallPreset): string {
    const parts: string[] = [];
    if (p.thickness !== undefined) parts.push(`thickness ${p.thickness}px`);
    if (!p.blocksSight) parts.push('sight-transparent');
    if (!p.blocksMovement) parts.push('movement-transparent');
    if (p.visibility === 'gm') parts.push('GM-only');
    if (p.door) parts.push(p.door.open ? 'open door' : 'closed door');
    return parts.length === 0 ? 'Default wall' : parts.join(', ');
  }

  function render() {
    const walls = liveWalls();
    if (walls.length === 0) {
      // Walls vanished while editing (e.g. undo). Close — there's
      // nothing to edit and no useful UI to show.
      close();
      return;
    }

    // Phase 117 — refresh the chip strip on every render so a newly
    // saved (or deleted) preset shows up immediately.
    renderPresets();

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

  // Phase 117 — Save as preset. Captures the FIRST selected wall's
  // values (the same ones the editor's slider / checkboxes show)
  // under a user-supplied name, so a "stout wood door (open)" can
  // be re-applied to other walls in one click later.
  presetsSaveBtn.addEventListener('click', () => {
    const walls = liveWalls();
    if (walls.length === 0) return;
    const w = walls[0]!;
    const name = window.prompt('Name for the new preset:', '');
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const preset: Parameters<typeof savePreset>[0] = {
      name: trimmed,
      blocksSight: w.blocksSight,
      blocksMovement: w.blocksMovement,
    };
    if (w.kind === 'segment' && w.thickness !== undefined) {
      preset.thickness = w.thickness;
    }
    if (w.visibility !== undefined) preset.visibility = w.visibility;
    if (w.kind === 'segment' && w.door !== undefined) preset.door = w.door;
    savePreset(preset);
    renderPresets();
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

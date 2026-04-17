import type { PreferencesStore, Preferences, LabelSize } from '../state/preferences.js';
import type { Store } from '../state/store.js';
import type { ViewMode } from '../state/types.js';

export interface SettingsModalHandle {
  open(): void;
  close(): void;
}

export interface SettingsModalOptions {
  viewMode: ViewMode;
  preferences: PreferencesStore;
  store: Store;
}

export function mountSettingsModal(
  opts: SettingsModalOptions,
): SettingsModalHandle {
  const { viewMode, preferences, store } = opts;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal settings-modal';
  modal.innerHTML = renderModalHTML(viewMode);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const colsInput = modal.querySelector<HTMLInputElement>('[data-field="cols"]')!;
  const rowsInput = modal.querySelector<HTMLInputElement>('[data-field="rows"]')!;
  const cellSizeInput = modal.querySelector<HTMLInputElement>('[data-field="cellSize"]')!;
  const showGridLinesInput = modal.querySelector<HTMLInputElement>('[data-field="showGridLines"]')!;
  const persistCameraInput = modal.querySelector<HTMLInputElement>('[data-field="persistCamera"]')!;
  const reducedMotionInput = modal.querySelector<HTMLInputElement>('[data-field="reducedMotion"]')!;
  const highContrastInput = modal.querySelector<HTMLInputElement>('[data-field="highContrast"]')!;
  const colorblindInput = modal.querySelector<HTMLInputElement>('[data-field="colorblindMarkers"]')!;
  const labelSizeRadios = Array.from(
    modal.querySelectorAll<HTMLInputElement>('input[name="settings-label-size"]'),
  );
  const gmFogColorInput = modal.querySelector<HTMLInputElement>('[data-field="gmFogColor"]');
  const gmFogOpacityInput = modal.querySelector<HTMLInputElement>('[data-field="gmFogOpacity"]');
  const gmFogOpacityLabel = modal.querySelector<HTMLSpanElement>('[data-field="gmFogOpacityValue"]');
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;
  const broadcastCameraInput = modal.querySelector<HTMLInputElement>('[data-field="broadcastCamera"]');
  const followGmCameraInput = modal.querySelector<HTMLInputElement>('[data-field="followGmCamera"]');

  function populate() {
    const state = store.getState();
    const prefs = preferences.get();
    colsInput.value = String(state.grid.cols);
    rowsInput.value = String(state.grid.rows);
    cellSizeInput.value = String(state.grid.cellSize);
    showGridLinesInput.checked = state.grid.showGridLines;
    persistCameraInput.checked = prefs.persistCamera;
    reducedMotionInput.checked = prefs.reducedMotion;
    highContrastInput.checked = prefs.highContrast;
    colorblindInput.checked = prefs.colorblindMarkers;
    for (const r of labelSizeRadios) r.checked = r.value === prefs.labelSize;
    if (gmFogColorInput) gmFogColorInput.value = prefs.gmFogColor;
    if (gmFogOpacityInput) gmFogOpacityInput.value = String(Math.round(prefs.gmFogOpacity * 100));
    if (gmFogOpacityLabel) gmFogOpacityLabel.textContent = `${Math.round(prefs.gmFogOpacity * 100)}%`;
    if (broadcastCameraInput) broadcastCameraInput.checked = prefs.broadcastCamera;
    if (followGmCameraInput) followGmCameraInput.checked = prefs.followGmCamera;
  }

  function open() {
    populate();
    backdrop.hidden = false;
  }

  function close() {
    backdrop.hidden = true;
  }

  function dispatchGrid(changes: Partial<Preferences>, gridChanges: Record<string, unknown>) {
    if (Object.keys(changes).length > 0) preferences.update(changes);
    if (Object.keys(gridChanges).length > 0) {
      store.applyPatch({ kind: 'grid-update', changes: gridChanges as never });
    }
  }

  function parseInt100(v: string, min: number, max: number): number | null {
    const n = parseInt(v, 10);
    if (Number.isNaN(n) || n < min || n > max) return null;
    return n;
  }

  colsInput.addEventListener('change', () => {
    const n = parseInt100(colsInput.value, 1, 200);
    if (n === null) {
      populate();
      return;
    }
    dispatchGrid({}, { cols: n });
  });

  rowsInput.addEventListener('change', () => {
    const n = parseInt100(rowsInput.value, 1, 200);
    if (n === null) {
      populate();
      return;
    }
    dispatchGrid({}, { rows: n });
  });

  cellSizeInput.addEventListener('change', () => {
    const n = parseInt100(cellSizeInput.value, 10, 400);
    if (n === null) {
      populate();
      return;
    }
    dispatchGrid({}, { cellSize: n });
  });

  showGridLinesInput.addEventListener('change', () => {
    dispatchGrid({}, { showGridLines: showGridLinesInput.checked });
  });

  persistCameraInput.addEventListener('change', () => {
    preferences.update({ persistCamera: persistCameraInput.checked });
  });

  reducedMotionInput.addEventListener('change', () => {
    preferences.update({ reducedMotion: reducedMotionInput.checked });
  });

  highContrastInput.addEventListener('change', () => {
    preferences.update({ highContrast: highContrastInput.checked });
  });

  colorblindInput.addEventListener('change', () => {
    preferences.update({ colorblindMarkers: colorblindInput.checked });
  });

  for (const r of labelSizeRadios) {
    r.addEventListener('change', () => {
      if (r.checked) preferences.update({ labelSize: r.value as LabelSize });
    });
  }

  if (gmFogColorInput) {
    gmFogColorInput.addEventListener('change', () => {
      preferences.update({ gmFogColor: gmFogColorInput.value });
    });
  }

  if (gmFogOpacityInput) {
    gmFogOpacityInput.addEventListener('input', () => {
      const v = parseInt(gmFogOpacityInput.value, 10) / 100;
      preferences.update({ gmFogOpacity: v });
      if (gmFogOpacityLabel) gmFogOpacityLabel.textContent = `${gmFogOpacityInput.value}%`;
    });
  }

  if (broadcastCameraInput) {
    broadcastCameraInput.addEventListener('change', () => {
      preferences.update({ broadcastCamera: broadcastCameraInput.checked });
    });
  }

  if (followGmCameraInput) {
    followGmCameraInput.addEventListener('change', () => {
      preferences.update({ followGmCamera: followGmCameraInput.checked });
    });
  }

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

  store.subscribe((patch) => {
    if (backdrop.hidden) return;
    if (!patch || patch.kind === 'grid-update' || patch.kind === 'session-reset') {
      populate();
    }
  });

  preferences.subscribe(() => {
    if (!backdrop.hidden) populate();
  });

  return { open, close };
}

function renderModalHTML(viewMode: ViewMode): string {
  const gmOnly = viewMode === 'gm'
    ? `
        <label>Fog color (GM view)
          <input type="color" data-field="gmFogColor" />
        </label>
        <label>Fog opacity (GM view)
          <div class="slider-row">
            <input type="range" min="5" max="100" step="1" data-field="gmFogOpacity" />
            <span class="slider-value" data-field="gmFogOpacityValue">35%</span>
          </div>
        </label>`
    : '';

  const syncSection = viewMode === 'gm'
    ? `
      <section class="settings-section">
        <h3>Sync</h3>
        <label class="check">
          <input type="checkbox" data-field="broadcastCamera" />
          <span>Broadcast my camera to Spectator</span>
        </label>
        <p class="settings-hint">When on, your pan/zoom is mirrored to any Spectator tab that has "Follow GM camera" enabled.</p>
      </section>`
    : `
      <section class="settings-section">
        <h3>Sync</h3>
        <label class="check">
          <input type="checkbox" data-field="followGmCamera" />
          <span>Follow GM's camera</span>
        </label>
        <p class="settings-hint">Requires the GM view to enable "Broadcast my camera". Panning or zooming here pauses following for 2 seconds.</p>
      </section>`;

  return `
    <div class="modal-header">
      <h2>Settings</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body settings-body">
      <section class="settings-section">
        <h3>Grid</h3>
        <div class="grid-row">
          <label>Columns
            <input type="number" data-field="cols" min="1" max="200" />
          </label>
          <label>Rows
            <input type="number" data-field="rows" min="1" max="200" />
          </label>
          <label>Cell size (px)
            <input type="number" data-field="cellSize" min="10" max="400" />
          </label>
        </div>
        <label class="check">
          <input type="checkbox" data-field="showGridLines" />
          <span>Show grid lines</span>
        </label>
      </section>
      <section class="settings-section">
        <h3>View</h3>
        <label class="check">
          <input type="checkbox" data-field="persistCamera" />
          <span>Persist camera position on refresh</span>
        </label>
        <label class="check">
          <input type="checkbox" data-field="reducedMotion" />
          <span>Reduced motion</span>
        </label>
      </section>
      <section class="settings-section">
        <h3>Appearance</h3>
        <label>Label size
          <div class="radio-group">
            <label><input type="radio" name="settings-label-size" value="small" /> Small</label>
            <label><input type="radio" name="settings-label-size" value="medium" /> Medium</label>
            <label><input type="radio" name="settings-label-size" value="large" /> Large</label>
          </div>
        </label>
        <label class="check">
          <input type="checkbox" data-field="highContrast" />
          <span>High contrast grid</span>
        </label>
        <label class="check">
          <input type="checkbox" data-field="colorblindMarkers" />
          <span>Colorblind-friendly team markers</span>
        </label>
        ${gmOnly}
      </section>
      ${syncSection}
    </div>
  `;
}

import type { PreferencesStore, LabelSize, Theme } from '../state/preferences.js';
import type { Store } from '../state/store.js';
import type { ViewMode } from '../state/types.js';
import { attachFocusTrap, rememberFocus, restoreFocus, getFocusables } from '../util/focus.js';
import { scanUnusedImages, removeUnusedImages } from '../state/idb-cleanup.js';

export interface SettingsModalHandle {
  open(): void;
  close(): void;
}

export interface SettingsModalOptions {
  viewMode: ViewMode;
  preferences: PreferencesStore;
  store: Store;
}

const TAB_IDS = ['grid', 'appearance', 'camera', 'accessibility', 'diagnostics'] as const;
type TabId = (typeof TAB_IDS)[number];

const TAB_LABELS: Record<TabId, string> = {
  grid: 'Grid',
  appearance: 'Appearance',
  camera: 'Camera',
  accessibility: 'Accessibility',
  diagnostics: 'Diagnostics',
};

export function mountSettingsModal(
  opts: SettingsModalOptions,
): SettingsModalHandle {
  const { viewMode, preferences, store } = opts;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal settings-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Settings');
  modal.innerHTML = renderModalHTML(viewMode);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  attachFocusTrap(modal);

  let triggerFocus: HTMLElement | null = null;

  // Field refs
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
  const themeRadios = Array.from(
    modal.querySelectorAll<HTMLInputElement>('input[name="settings-theme"]'),
  );
  const gmFogColorInput = modal.querySelector<HTMLInputElement>('[data-field="gmFogColor"]');
  const gmFogOpacityInput = modal.querySelector<HTMLInputElement>('[data-field="gmFogOpacity"]');
  const gmFogOpacityLabel = modal.querySelector<HTMLSpanElement>('[data-field="gmFogOpacityValue"]');
  const broadcastCameraInput = modal.querySelector<HTMLInputElement>('[data-field="broadcastCamera"]');
  const followGmCameraInput = modal.querySelector<HTMLInputElement>('[data-field="followGmCamera"]');
  const resetBtn = modal.querySelector<HTMLButtonElement>('[data-action="reset-prefs"]')!;
  const scanImagesBtn = modal.querySelector<HTMLButtonElement>('[data-action="scan-images"]');
  const scanImagesStatus = modal.querySelector<HTMLDivElement>('[data-field="scan-images-status"]');
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  // Tab refs
  const tabs = Array.from(modal.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = Array.from(modal.querySelectorAll<HTMLElement>('[role="tabpanel"]'));

  function activateTab(id: TabId, focus = false) {
    for (const tab of tabs) {
      const selected = tab.dataset.tab === id;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    }
    for (const panel of panels) {
      panel.hidden = panel.dataset.tab !== id;
    }
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      activateTab(tab.dataset.tab as TabId);
    });
    tab.addEventListener('keydown', (e) => {
      const idx = tabs.indexOf(tab);
      let nextIdx = -1;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = tabs.length - 1;
      else return;
      const nextTab = tabs[nextIdx]!;
      activateTab(nextTab.dataset.tab as TabId, true);
      e.preventDefault();
    });
  }

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
    for (const r of themeRadios) r.checked = r.value === prefs.theme;
    if (gmFogColorInput) gmFogColorInput.value = prefs.gmFogColor;
    if (gmFogOpacityInput) gmFogOpacityInput.value = String(Math.round(prefs.gmFogOpacity * 100));
    if (gmFogOpacityLabel) gmFogOpacityLabel.textContent = `${Math.round(prefs.gmFogOpacity * 100)}%`;
    if (broadcastCameraInput) broadcastCameraInput.checked = prefs.broadcastCamera;
    if (followGmCameraInput) followGmCameraInput.checked = prefs.followGmCamera;
  }

  function open() {
    triggerFocus = rememberFocus();
    activateTab('grid');
    populate();
    backdrop.hidden = false;
    window.setTimeout(() => {
      const focusables = getFocusables(modal);
      if (focusables.length > 0) focusables[0]!.focus();
    }, 0);
  }

  function close() {
    backdrop.hidden = true;
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
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
    store.applyPatch({ kind: 'grid-update', changes: { cols: n } });
  });

  rowsInput.addEventListener('change', () => {
    const n = parseInt100(rowsInput.value, 1, 200);
    if (n === null) {
      populate();
      return;
    }
    store.applyPatch({ kind: 'grid-update', changes: { rows: n } });
  });

  cellSizeInput.addEventListener('change', () => {
    const n = parseInt100(cellSizeInput.value, 10, 400);
    if (n === null) {
      populate();
      return;
    }
    store.applyPatch({ kind: 'grid-update', changes: { cellSize: n } });
  });

  showGridLinesInput.addEventListener('change', () => {
    store.applyPatch({
      kind: 'grid-update',
      changes: { showGridLines: showGridLinesInput.checked },
    });
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

  for (const r of themeRadios) {
    r.addEventListener('change', () => {
      if (r.checked) preferences.update({ theme: r.value as Theme });
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

  resetBtn.addEventListener('click', () => {
    const ok = window.confirm(
      'Reset all local preferences (theme, label size, contrast, etc.) to defaults? Session state is unaffected.',
    );
    if (!ok) return;
    preferences.reset();
  });

  if (scanImagesBtn && scanImagesStatus) {
    scanImagesBtn.addEventListener('click', async () => {
      scanImagesBtn.disabled = true;
      const originalLabel = scanImagesBtn.textContent ?? 'Scan';
      try {
        scanImagesStatus.textContent = 'Scanning…';
        const report = await scanUnusedImages(store.getState());
        const orphanCount = report.orphans.length;
        scanImagesStatus.textContent =
          `${report.total} image${report.total === 1 ? '' : 's'} stored, ${report.referenced} referenced, ` +
          `${orphanCount} orphan${orphanCount === 1 ? '' : 's'}.`;
        if (orphanCount === 0) {
          scanImagesBtn.textContent = originalLabel;
          return;
        }
        const ok = window.confirm(
          `Found ${orphanCount} orphaned image${orphanCount === 1 ? '' : 's'} not referenced by any token, map, library entry, or template. Delete them from IndexedDB?`,
        );
        if (!ok) {
          scanImagesBtn.textContent = originalLabel;
          return;
        }
        scanImagesStatus.textContent = 'Deleting…';
        const removed = await removeUnusedImages(report.orphans);
        scanImagesStatus.textContent = `Removed ${removed} orphan${removed === 1 ? '' : 's'}.`;
      } catch (err) {
        console.error('[settings] scan-images failed', err);
        scanImagesStatus.textContent = 'Scan failed — check the console.';
      } finally {
        scanImagesBtn.textContent = originalLabel;
        scanImagesBtn.disabled = false;
      }
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
  return `
    <div class="modal-header">
      <h2>Settings</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body settings-tabbed">
      <div class="settings-tabs" role="tablist" aria-label="Settings categories">
        ${TAB_IDS.map(
          (id, i) => `<button
            role="tab"
            id="settings-tab-${id}"
            aria-controls="settings-panel-${id}"
            aria-selected="${i === 0 ? 'true' : 'false'}"
            tabindex="${i === 0 ? 0 : -1}"
            data-tab="${id}"
            type="button"
          >${TAB_LABELS[id]}</button>`,
        ).join('')}
      </div>
      <div class="settings-panes">
        ${renderGridPane()}
        ${renderAppearancePane(viewMode)}
        ${renderCameraPane(viewMode)}
        ${renderAccessibilityPane()}
        ${renderDiagnosticsPane()}
      </div>
    </div>
  `;
}

function paneAttrs(id: TabId, first: boolean): string {
  return `role="tabpanel" id="settings-panel-${id}" aria-labelledby="settings-tab-${id}" data-tab="${id}"${first ? '' : ' hidden'}`;
}

function renderGridPane(): string {
  return `
    <section ${paneAttrs('grid', true)}>
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
      <p class="settings-hint">Changing grid dimensions preserves fog state for cells that still exist after the resize.</p>
    </section>
  `;
}

function renderAppearancePane(viewMode: ViewMode): string {
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

  return `
    <section ${paneAttrs('appearance', false)}>
      <label>Theme
        <div class="radio-group">
          <label><input type="radio" name="settings-theme" value="dark" /> Dark</label>
          <label><input type="radio" name="settings-theme" value="light" /> Light</label>
        </div>
      </label>
      <label>Label size
        <div class="radio-group">
          <label><input type="radio" name="settings-label-size" value="small" /> Small</label>
          <label><input type="radio" name="settings-label-size" value="medium" /> Medium</label>
          <label><input type="radio" name="settings-label-size" value="large" /> Large</label>
        </div>
      </label>
      ${gmOnly}
    </section>
  `;
}

function renderCameraPane(viewMode: ViewMode): string {
  const syncRow = viewMode === 'gm'
    ? `
        <label class="check">
          <input type="checkbox" data-field="broadcastCamera" />
          <span>Broadcast my camera to Spectator</span>
        </label>
        <p class="settings-hint">When on, your pan/zoom is mirrored to any Spectator tab with "Follow GM camera" enabled.</p>`
    : `
        <label class="check">
          <input type="checkbox" data-field="followGmCamera" />
          <span>Follow GM's camera</span>
        </label>
        <p class="settings-hint">Requires the GM view to enable "Broadcast my camera". Panning or zooming here pauses following for 2 seconds.</p>`;

  return `
    <section ${paneAttrs('camera', false)}>
      <label class="check">
        <input type="checkbox" data-field="persistCamera" />
        <span>Persist camera position on refresh</span>
      </label>
      ${syncRow}
    </section>
  `;
}

function renderAccessibilityPane(): string {
  return `
    <section ${paneAttrs('accessibility', false)}>
      <label class="check">
        <input type="checkbox" data-field="reducedMotion" />
        <span>Reduced motion</span>
      </label>
      <label class="check">
        <input type="checkbox" data-field="highContrast" />
        <span>High contrast grid</span>
      </label>
      <label class="check">
        <input type="checkbox" data-field="colorblindMarkers" />
        <span>Colorblind-friendly team markers</span>
      </label>
      <p class="settings-hint">Markers add a small shape badge to tokens with a preset team border color (Ally, Enemy, etc.).</p>
    </section>
  `;
}

function renderDiagnosticsPane(): string {
  return `
    <section ${paneAttrs('diagnostics', false)}>
      <div>
        <button type="button" data-action="scan-images">Scan and remove unused images</button>
      </div>
      <p class="settings-hint">Finds images in IndexedDB that aren't referenced by any token, map, library entry, or template, and offers to delete them.</p>
      <div class="settings-hint" data-field="scan-images-status" role="status" aria-live="polite"></div>
      <hr />
      <div>
        <button type="button" class="danger" data-action="reset-prefs">Reset preferences to defaults</button>
      </div>
      <p class="settings-hint">Restores every appearance, accessibility, and camera setting to its default. Session content (tokens, map, fog) is unaffected.</p>
    </section>
  `;
}

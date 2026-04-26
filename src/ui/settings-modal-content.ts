import type {
  PreferencesStore,
  LabelSize,
  Theme,
  DistanceUnit,
  DiagonalRule,
} from '../state/preferences.js';
import { ALL_THEMES, THEME_LABELS } from '../state/preferences.js';
import type { IdentityPrefsStore } from '../state/identity-prefs.js';
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
  /**
   * Phase 67 — per-role identity store (created in the entry once
   * + passed both to the modal and to `ownIdentity()` + the
   * broadcast subscriber, so all three observe the same write).
   */
  identityPrefs: IdentityPrefsStore;
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

/**
 * Heavy implementation entry point. Called by the lazy stub in
 * `./settings-modal.ts` on first `.open()` invocation. Builds the
 * full DOM + wires every input listener + subscribes to prefs.
 */
export function buildSettingsModal(
  opts: SettingsModalOptions,
): SettingsModalHandle {
  const { viewMode, preferences, store, identityPrefs } = opts;

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
  const showGridLabelsInput = modal.querySelector<HTMLInputElement>('[data-field="showGridLabels"]')!;
  const showMiniMapInput = modal.querySelector<HTMLInputElement>('[data-field="showMiniMap"]')!;
  const losModeInput = modal.querySelector<HTMLInputElement>('[data-field="losMode"]')!;
  const autoRevealInput = modal.querySelector<HTMLInputElement>('[data-field="autoRevealFromViewers"]')!;
  const sceneLightColorInput = modal.querySelector<HTMLInputElement>('[data-field="sceneLightColor"]')!;
  const sceneLightOpacityInput = modal.querySelector<HTMLInputElement>('[data-field="sceneLightOpacity"]')!;
  const sceneLightOpacityLabel = modal.querySelector<HTMLSpanElement>('[data-field="sceneLightOpacityValue"]')!;
  const persistCameraInput = modal.querySelector<HTMLInputElement>('[data-field="persistCamera"]')!;
  const reducedMotionInput = modal.querySelector<HTMLInputElement>('[data-field="reducedMotion"]')!;
  const highContrastInput = modal.querySelector<HTMLInputElement>('[data-field="highContrast"]')!;
  const colorblindInput = modal.querySelector<HTMLInputElement>('[data-field="colorblindMarkers"]')!;
  const voiceTranscriptionInput = modal.querySelector<HTMLInputElement>('[data-field="voiceTranscription"]')!;
  const playerNameInput = modal.querySelector<HTMLInputElement>('[data-field="playerName"]')!;
  const playerColorInput = modal.querySelector<HTMLInputElement>('[data-field="playerColor"]')!;
  const labelSizeRadios = Array.from(
    modal.querySelectorAll<HTMLInputElement>('input[name="settings-label-size"]'),
  );
  const themeRadios = Array.from(
    modal.querySelectorAll<HTMLInputElement>('input[name="settings-theme"]'),
  );
  const distanceUnitRadios = Array.from(
    modal.querySelectorAll<HTMLInputElement>('input[name="settings-distance-unit"]'),
  );
  const diagonalRuleRadios = Array.from(
    modal.querySelectorAll<HTMLInputElement>('input[name="settings-diagonal-rule"]'),
  );
  const feetPerSquareInput = modal.querySelector<HTMLInputElement>('[data-field="feetPerSquare"]')!;
  const gmFogColorInput = modal.querySelector<HTMLInputElement>('[data-field="gmFogColor"]');
  const gmFogOpacityInput = modal.querySelector<HTMLInputElement>('[data-field="gmFogOpacity"]');
  const gmFogOpacityLabel = modal.querySelector<HTMLSpanElement>('[data-field="gmFogOpacityValue"]');
  const broadcastCameraInput = modal.querySelector<HTMLInputElement>('[data-field="broadcastCamera"]');
  const followGmCameraInput = modal.querySelector<HTMLInputElement>('[data-field="followGmCamera"]');
  // Phase 93 — turn-timer duration. Only present in the GM view.
  const turnTimerSecondsInput = modal.querySelector<HTMLSelectElement>('[data-field="turnTimerSeconds"]');
  const resetBtn = modal.querySelector<HTMLButtonElement>('[data-action="reset-prefs"]')!;
  const scanImagesBtn = modal.querySelector<HTMLButtonElement>('[data-action="scan-images"]');
  const scanImagesStatus = modal.querySelector<HTMLDivElement>('[data-field="scan-images-status"]');
  const showDiagnosticsInput = modal.querySelector<HTMLInputElement>('[data-field="showDiagnostics"]');
  const showSpectatorViewportInput = modal.querySelector<HTMLInputElement>('[data-field="showSpectatorViewport"]');
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
    showGridLabelsInput.checked = prefs.showGridLabels;
    showMiniMapInput.checked = prefs.showMiniMap;
    losModeInput.checked = prefs.losMode !== 'off';
    autoRevealInput.checked = prefs.autoRevealFromViewers;
    // Follow-the-fog only makes sense with LoS on; disable + visually
    // de-emphasize the checkbox when losMode is off so the user sees
    // why it has no effect.
    autoRevealInput.disabled = prefs.losMode === 'off';
    sceneLightColorInput.value = prefs.sceneLightColor;
    sceneLightOpacityInput.value = String(Math.round(prefs.sceneLightOpacity * 100));
    sceneLightOpacityLabel.textContent = `${Math.round(prefs.sceneLightOpacity * 100)}%`;
    persistCameraInput.checked = prefs.persistCamera;
    reducedMotionInput.checked = prefs.reducedMotion;
    highContrastInput.checked = prefs.highContrast;
    colorblindInput.checked = prefs.colorblindMarkers;
    voiceTranscriptionInput.checked = prefs.voiceTranscription;
    // Phase 67 — identity now lives in its own per-role store; the
    // Settings modal reads it from `identityPrefs.get()` instead of
    // peeling out scoped fields from `preferences`.
    const identity = identityPrefs.get();
    playerNameInput.value = identity.name;
    // Color input needs a concrete hex; fall back to a placeholder
    // gray when the user hasn't picked a custom color.
    playerColorInput.value = identity.color || '#9e9e9e';
    for (const r of labelSizeRadios) r.checked = r.value === prefs.labelSize;
    for (const r of themeRadios) r.checked = r.value === prefs.theme;
    if (gmFogColorInput) gmFogColorInput.value = prefs.gmFogColor;
    if (gmFogOpacityInput) gmFogOpacityInput.value = String(Math.round(prefs.gmFogOpacity * 100));
    if (gmFogOpacityLabel) gmFogOpacityLabel.textContent = `${Math.round(prefs.gmFogOpacity * 100)}%`;
    if (broadcastCameraInput) broadcastCameraInput.checked = prefs.broadcastCamera;
    if (followGmCameraInput) followGmCameraInput.checked = prefs.followGmCamera;
    if (turnTimerSecondsInput) turnTimerSecondsInput.value = String(prefs.turnTimerSeconds);
    if (showDiagnosticsInput) showDiagnosticsInput.checked = prefs.showDiagnostics;
    if (showSpectatorViewportInput) showSpectatorViewportInput.checked = prefs.showSpectatorViewport;
    for (const r of distanceUnitRadios) r.checked = r.value === prefs.distanceUnit;
    for (const r of diagonalRuleRadios) r.checked = r.value === prefs.diagonalRule;
    feetPerSquareInput.value = String(prefs.feetPerSquare);
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

  showGridLabelsInput.addEventListener('change', () => {
    preferences.update({ showGridLabels: showGridLabelsInput.checked });
  });

  losModeInput.addEventListener('change', () => {
    preferences.update({
      losMode: losModeInput.checked ? 'revealed-and-visible' : 'off',
    });
  });
  autoRevealInput.addEventListener('change', () => {
    preferences.update({ autoRevealFromViewers: autoRevealInput.checked });
  });
  showMiniMapInput.addEventListener('change', () => {
    preferences.update({ showMiniMap: showMiniMapInput.checked });
  });

  sceneLightColorInput.addEventListener('change', () => {
    preferences.update({ sceneLightColor: sceneLightColorInput.value });
  });

  sceneLightOpacityInput.addEventListener('input', () => {
    const v = parseInt(sceneLightOpacityInput.value, 10) / 100;
    preferences.update({ sceneLightOpacity: v });
    sceneLightOpacityLabel.textContent = `${sceneLightOpacityInput.value}%`;
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

  voiceTranscriptionInput.addEventListener('change', () => {
    preferences.update({ voiceTranscription: voiceTranscriptionInput.checked });
  });

  // Phase 67 — writes go through the per-role identity store. The
  // GM and Spectator views each construct their own
  // `createIdentityPrefs(viewMode)` so cross-tab `storage` events
  // only fire other tabs of the SAME role.
  playerNameInput.addEventListener('change', () => {
    identityPrefs.update({ name: playerNameInput.value.trim() });
  });
  playerColorInput.addEventListener('change', () => {
    identityPrefs.update({ color: playerColorInput.value });
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

  for (const r of distanceUnitRadios) {
    r.addEventListener('change', () => {
      if (r.checked) preferences.update({ distanceUnit: r.value as DistanceUnit });
    });
  }

  for (const r of diagonalRuleRadios) {
    r.addEventListener('change', () => {
      if (r.checked) preferences.update({ diagonalRule: r.value as DiagonalRule });
    });
  }

  feetPerSquareInput.addEventListener('change', () => {
    const n = parseInt(feetPerSquareInput.value, 10);
    if (!Number.isFinite(n) || n < 1 || n > 99) {
      populate();
      return;
    }
    preferences.update({ feetPerSquare: n });
  });

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

  if (turnTimerSecondsInput) {
    turnTimerSecondsInput.addEventListener('change', () => {
      const v = parseInt(turnTimerSecondsInput.value, 10);
      // Defensive: collapse non-numeric / negative values to 0 (off).
      // The <option> values are static integers so this normally
      // won't fire, but a future "Custom" entry would benefit.
      const next = Number.isFinite(v) && v >= 0 ? v : 0;
      preferences.update({ turnTimerSeconds: next });
    });
  }

  if (showDiagnosticsInput) {
    showDiagnosticsInput.addEventListener('change', () => {
      preferences.update({ showDiagnostics: showDiagnosticsInput.checked });
    });
  }

  if (showSpectatorViewportInput) {
    showSpectatorViewportInput.addEventListener('change', () => {
      preferences.update({ showSpectatorViewport: showSpectatorViewportInput.checked });
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
        ${renderDiagnosticsPane(viewMode)}
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
      <label class="check">
        <input type="checkbox" data-field="showGridLabels" />
        <span>Show coordinate labels (A1, B2, …)</span>
      </label>
      <p class="settings-hint">Chess-style A–Z column + 1–N row labels in the gutters. Useful for verbal reference during play ("there's a trap at D6").</p>
      <label class="check">
        <input type="checkbox" data-field="showMiniMap" />
        <span>Show mini-map</span>
      </label>
      <p class="settings-hint">Floating bottom-right thumbnail of the whole map — background, fog, tokens, plus a ring showing your current viewport. Click anywhere in the mini-map to recenter the main camera there.</p>
      <label class="check">
        <input type="checkbox" data-field="losMode" />
        <span>Dynamic line of sight</span>
      </label>
      <p class="settings-hint">When on, Spectator fog is clipped to the visibility polygons of tokens with a sight radius (configured in the token editor). Walls marked as sight-blocking (Walls tool, right-click) occlude vision. Turning this off reverts to the classic GM-painted fog behavior.</p>
      <label class="check">
        <input type="checkbox" data-field="autoRevealFromViewers" />
        <span>Follow-the-fog (auto-reveal as viewers move)</span>
      </label>
      <p class="settings-hint">When on, viewer tokens automatically reveal the cells they can see — no need to chase them with the Reveal tool. One-way: cells stay revealed even after the viewer walks away (use the Hide tool to take them back). Requires <em>Dynamic line of sight</em>.</p>
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
        <div class="radio-group radio-group-wrap">
          ${ALL_THEMES.map(
            (t) =>
              `<label><input type="radio" name="settings-theme" value="${t}" /> ${THEME_LABELS[t]}</label>`,
          ).join('')}
        </div>
      </label>
      <p class="settings-hint">Pick a base theme. <em>Parchment</em> reads like an old hand-drawn map; <em>Console</em> goes terminal green-on-black for sci-fi; <em>Purple Dusk</em> is a moodier midnight-purple variant.</p>
      <label>Label size
        <div class="radio-group">
          <label><input type="radio" name="settings-label-size" value="small" /> Small</label>
          <label><input type="radio" name="settings-label-size" value="medium" /> Medium</label>
          <label><input type="radio" name="settings-label-size" value="large" /> Large</label>
        </div>
      </label>
      <fieldset class="settings-subgroup">
        <legend>Distance</legend>
        <label>Movement indicator unit
          <div class="radio-group">
            <label><input type="radio" name="settings-distance-unit" value="squares" /> Squares</label>
            <label><input type="radio" name="settings-distance-unit" value="feet" /> Feet</label>
          </div>
        </label>
        <label>Feet per square
          <input type="number" data-field="feetPerSquare" min="1" max="99" step="1" />
        </label>
        <label>Diagonal rule
          <div class="radio-group">
            <label><input type="radio" name="settings-diagonal-rule" value="chebyshev" /> Chebyshev (5e default — diagonals count as 1)</label>
            <label><input type="radio" name="settings-diagonal-rule" value="alternating" /> Alternating (PHB optional — every other diagonal counts as 2)</label>
          </div>
        </label>
        <p class="settings-hint">Used by the yellow movement indicator that appears while you drag a token on the map.</p>
      </fieldset>
      <fieldset class="settings-subgroup">
        <legend>Scene lighting</legend>
        <label>Tint color
          <input type="color" data-field="sceneLightColor" />
        </label>
        <label>Darkness
          <div class="slider-row">
            <input type="range" min="0" max="100" step="1" data-field="sceneLightOpacity" />
            <span class="slider-value" data-field="sceneLightOpacityValue">0%</span>
          </div>
        </label>
        <p class="settings-hint">Multiplies a semi-transparent color over the whole canvas. Handy for "the cave is dim" or "it's midnight" mood without changing the map art.</p>
      </fieldset>
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

  // Phase 93 — turn timer subgroup (GM only). Spectator doesn't see
  // the timer in the bar, so the setting wouldn't do anything for
  // them either.
  const turnTimerRow = viewMode === 'gm'
    ? `
      <fieldset class="settings-subgroup">
        <legend>Per-turn timer</legend>
        <label>Duration
          <select data-field="turnTimerSeconds">
            <option value="0">Off</option>
            <option value="30">30 seconds</option>
            <option value="60">1 minute</option>
            <option value="90">1 minute 30</option>
            <option value="120">2 minutes</option>
            <option value="180">3 minutes</option>
          </select>
        </label>
        <p class="settings-hint">Shows a countdown next to the active token in the initiative bar. Resets every turn. Counts down silently to 30 s, turns amber, then red at 10 s, and pulses + announces "Time" when it hits zero. Spectator doesn't see the clock.</p>
      </fieldset>`
    : '';

  return `
    <section ${paneAttrs('camera', false)}>
      <label class="check">
        <input type="checkbox" data-field="persistCamera" />
        <span>Persist camera position on refresh</span>
      </label>
      ${syncRow}
      ${turnTimerRow}
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
      <label class="check">
        <input type="checkbox" data-field="voiceTranscription" />
        <span>Voice transcription (microphone in Notes panel)</span>
      </label>
      <p class="settings-hint">Adds a 🎤 button to the Session Notes panel that uses your browser's speech recognition to transcribe what you say into the notes textarea. The mic only activates when you click the button. Hidden automatically on browsers that don't support speech recognition (e.g. Firefox today).</p>
      <fieldset class="settings-subgroup">
        <legend>Your identity (this view)</legend>
        <label>Display name
          <input type="text" data-field="playerName" maxlength="32" placeholder="(empty = GM / Spectator)" />
        </label>
        <label>Color
          <input type="color" data-field="playerColor" />
        </label>
        <p class="settings-hint">Shown to other players in the Connected Players panel + on dice rolls and pings. The color falls back to a stable hash of your name if you don't pick one explicitly. The name + color here only affect <em>this</em> view — a GM tab and a Spectator tab in the same browser keep independent identities, so you can test both sides without one renaming the other.</p>
      </fieldset>
    </section>
  `;
}

function renderDiagnosticsPane(viewMode: ViewMode): string {
  const gmSpectatorViewport = viewMode === 'gm'
    ? `
      <label class="check">
        <input type="checkbox" data-field="showSpectatorViewport" />
        <span>Show Spectator viewport overlay</span>
      </label>
      <p class="settings-hint">Draws a dashed rectangle showing what the Spectator tab currently sees. Requires a Spectator tab to be open in the same browser.</p>`
    : '';

  return `
    <section ${paneAttrs('diagnostics', false)}>
      <label class="check">
        <input type="checkbox" data-field="showDiagnostics" />
        <span>Show diagnostics overlay (FPS, counts, camera)</span>
      </label>
      <p class="settings-hint">Floats a small panel in the top-right showing frame timing, state counts, and camera info.</p>
      ${gmSpectatorViewport}
      <hr />
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

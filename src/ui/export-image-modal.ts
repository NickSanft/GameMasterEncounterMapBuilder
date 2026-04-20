import type { ViewMode } from '../state/types.js';
import type { SnapshotScope } from '../render/snapshot.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface ExportImageOptions {
  scope: SnapshotScope;
  scale: 1 | 2 | 4;
  /**
   * Whose fog-of-war to render. 'gm' uses the GM's translucent fog,
   * 'spectator' renders opaque fog (what players see).
   */
  mode: ViewMode;
  /** Suggested filename (no extension). */
  filename: string;
}

export interface ExportImageModalHandle {
  /** Show the modal and resolve with the chosen options, or null on cancel. */
  open(defaults: ExportImageOptions): Promise<ExportImageOptions | null>;
}

export function mountExportImageModal(): ExportImageModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal export-image-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Export image');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Export image (PNG)</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <label>Scope
        <div class="radio-group">
          <label><input type="radio" name="export-scope" value="whole-map" /> Whole map (all cells + current fog)</label>
          <label><input type="radio" name="export-scope" value="visible-area" /> Visible area (what the main canvas shows right now)</label>
        </div>
      </label>
      <label>Fog of war
        <div class="radio-group">
          <label><input type="radio" name="export-mode" value="gm" /> GM view (translucent fog — you see hidden cells dimmed)</label>
          <label><input type="radio" name="export-mode" value="spectator" /> Spectator view (opaque fog — matches what players see)</label>
        </div>
      </label>
      <label>Resolution scale
        <div class="radio-group">
          <label><input type="radio" name="export-scale" value="1" /> 1× (standard)</label>
          <label><input type="radio" name="export-scale" value="2" /> 2× (for Retina displays)</label>
          <label><input type="radio" name="export-scale" value="4" /> 4× (print-quality, large file)</label>
        </div>
      </label>
      <label>Filename (no extension)
        <input type="text" data-field="filename" maxlength="80" autocomplete="off" spellcheck="false" />
      </label>
      <p class="settings-hint" data-field="dimensions-hint"></p>
      <hr />
      <div class="modal-footer">
        <button type="button" data-action="cancel">Cancel</button>
        <button type="button" class="primary" data-action="export">Export PNG</button>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const scopeRadios = Array.from(
    modal.querySelectorAll<HTMLInputElement>('input[name="export-scope"]'),
  );
  const modeRadios = Array.from(
    modal.querySelectorAll<HTMLInputElement>('input[name="export-mode"]'),
  );
  const scaleRadios = Array.from(
    modal.querySelectorAll<HTMLInputElement>('input[name="export-scale"]'),
  );
  const filenameInput = modal.querySelector<HTMLInputElement>('[data-field="filename"]')!;
  const dimensionsHint = modal.querySelector<HTMLParagraphElement>('[data-field="dimensions-hint"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;
  const cancelBtn = modal.querySelector<HTMLButtonElement>('[data-action="cancel"]')!;
  const exportBtn = modal.querySelector<HTMLButtonElement>('[data-action="export"]')!;

  let triggerFocus: HTMLElement | null = null;
  let resolveCurrent: ((v: ExportImageOptions | null) => void) | null = null;
  let lastDefaults: ExportImageOptions | null = null;

  function settle(result: ExportImageOptions | null): void {
    if (!resolveCurrent) return;
    const fn = resolveCurrent;
    resolveCurrent = null;
    close();
    fn(result);
  }

  function close(): void {
    if (modal.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    backdrop.hidden = true;
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  closeBtn.addEventListener('click', () => settle(null));
  cancelBtn.addEventListener('click', () => settle(null));
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) settle(null);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.hidden) {
      settle(null);
      e.preventDefault();
    }
  });

  function readForm(): ExportImageOptions {
    const scope = (scopeRadios.find((r) => r.checked)?.value ?? 'whole-map') as SnapshotScope;
    const mode = (modeRadios.find((r) => r.checked)?.value ?? 'gm') as ViewMode;
    const scaleStr = scaleRadios.find((r) => r.checked)?.value ?? '2';
    const scale = (Number(scaleStr) as 1 | 2 | 4);
    const filename = filenameInput.value.trim() || (lastDefaults?.filename ?? 'gm-encounter-maps');
    return { scope, mode, scale, filename };
  }

  exportBtn.addEventListener('click', () => {
    settle(readForm());
  });

  // Keep the dimensions hint fresh as the user picks radios — uses
  // the most recently-passed `defaults` for live pixel-size previews.
  function updateHint(): void {
    if (!lastDefaults) return;
    // Can't call the snapshot fn from here without threading state;
    // just show "~{scale}× your grid" as a rough cue.
    const opts = readForm();
    dimensionsHint.textContent = `Output will be PNG at ${opts.scale}× resolution.`;
  }

  for (const r of [...scopeRadios, ...modeRadios, ...scaleRadios]) {
    r.addEventListener('change', updateHint);
  }

  function open(defaults: ExportImageOptions): Promise<ExportImageOptions | null> {
    return new Promise((resolve) => {
      resolveCurrent = resolve;
      lastDefaults = defaults;
      triggerFocus = rememberFocus();

      for (const r of scopeRadios) r.checked = r.value === defaults.scope;
      for (const r of modeRadios) r.checked = r.value === defaults.mode;
      for (const r of scaleRadios) r.checked = Number(r.value) === defaults.scale;
      filenameInput.value = defaults.filename;
      updateHint();

      backdrop.hidden = false;
      window.setTimeout(() => exportBtn.focus(), 0);
    });
  }

  return { open };
}

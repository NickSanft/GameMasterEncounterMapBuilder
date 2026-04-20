import type { SessionState } from '../state/types.js';
import {
  DEFAULT_IMPORT_SELECTION,
  summarizeImport,
  type ImportSelection,
} from '../state/import-merge.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface ImportOptionsModalHandle {
  /**
   * Show the modal for an incoming session. Resolves when the user
   * clicks "Import" (with the chosen selection) or closes it
   * (`null`).
   */
  open(imported: SessionState): Promise<ImportSelection | null>;
}

export function mountImportOptionsModal(): ImportOptionsModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal import-options-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Import options');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Import session</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p class="library-hint">Pick which slices of the imported file to merge into the current scene. Unchecked categories keep your current data.</p>
      <ul class="import-options-list" data-field="options"></ul>
      <p class="settings-hint" data-field="fog-note" hidden>
        Fog dimensions must match the grid, so importing Fog also imports Grid.
      </p>
      <hr />
      <div class="modal-footer">
        <button type="button" data-action="cancel">Cancel</button>
        <button type="button" class="primary" data-action="apply">Import</button>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const list = modal.querySelector<HTMLUListElement>('[data-field="options"]')!;
  const fogNote = modal.querySelector<HTMLParagraphElement>('[data-field="fog-note"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;
  const cancelBtn = modal.querySelector<HTMLButtonElement>('[data-action="cancel"]')!;
  const applyBtn = modal.querySelector<HTMLButtonElement>('[data-action="apply"]')!;

  let triggerFocus: HTMLElement | null = null;
  let resolveCurrent: ((sel: ImportSelection | null) => void) | null = null;
  // Track the checkbox refs by category key so we can read + sync state.
  const inputs = new Map<keyof ImportSelection, HTMLInputElement>();

  function settle(result: ImportSelection | null): void {
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

  applyBtn.addEventListener('click', () => {
    const selection: ImportSelection = { ...DEFAULT_IMPORT_SELECTION };
    for (const [key, input] of inputs) {
      selection[key] = input.checked;
    }
    settle(selection);
  });

  function open(imported: SessionState): Promise<ImportSelection | null> {
    return new Promise((resolve) => {
      resolveCurrent = resolve;
      triggerFocus = rememberFocus();
      const summary = summarizeImport(imported);

      // Build the option rows fresh each time (counts come from the
      // imported snapshot and can change between opens).
      list.innerHTML = '';
      inputs.clear();

      const rows: Array<{
        key: keyof ImportSelection;
        label: string;
        count: string;
        disabled?: boolean;
      }> = [
        {
          key: 'background',
          label: 'Background',
          count: summary.hasBackground ? 'Present' : 'None',
          disabled: !summary.hasBackground,
        },
        { key: 'tokens', label: 'Tokens', count: `${summary.tokenCount}`, disabled: summary.tokenCount === 0 },
        {
          key: 'fog',
          label: 'Fog of war',
          count: `${summary.fogRevealed} / ${summary.fogTotal} cells revealed`,
        },
        {
          key: 'annotations',
          label: 'Annotations',
          count: `${summary.annotationCount}`,
          disabled: summary.annotationCount === 0,
        },
        {
          key: 'aoeTemplates',
          label: 'AoE templates',
          count: `${summary.aoeCount}`,
          disabled: summary.aoeCount === 0,
        },
        {
          key: 'initiative',
          label: 'Initiative',
          count: `${summary.initiativeCount} entries`,
          disabled: summary.initiativeCount === 0,
        },
        {
          key: 'strokes',
          label: 'Drawings',
          count: `${summary.strokeCount}`,
          disabled: summary.strokeCount === 0,
        },
        { key: 'grid', label: 'Grid dimensions', count: summary.gridLabel },
      ];

      for (const row of rows) {
        const li = document.createElement('li');
        li.className = 'import-options-row';
        const id = `import-opt-${row.key}`;
        li.innerHTML = `
          <label class="check" for="${id}">
            <input type="checkbox" id="${id}" data-key="${row.key}" />
            <span class="import-options-label">${escapeText(row.label)}</span>
            <span class="import-options-count">${escapeText(row.count)}</span>
          </label>
        `;
        const input = li.querySelector<HTMLInputElement>('input')!;
        input.checked = !row.disabled && DEFAULT_IMPORT_SELECTION[row.key];
        if (row.disabled) {
          input.disabled = true;
        }
        inputs.set(row.key, input);
        list.appendChild(li);
      }

      // If fog is imported, grid auto-imports too (dimensions must
      // match). Disable the grid checkbox while fog is checked so
      // the UI reflects the coupling.
      const fogInput = inputs.get('fog')!;
      const gridInput = inputs.get('grid')!;
      function syncGridCoupling(): void {
        if (fogInput.checked) {
          gridInput.checked = true;
          gridInput.disabled = true;
          fogNote.hidden = false;
        } else {
          gridInput.disabled = false;
          fogNote.hidden = true;
        }
      }
      fogInput.addEventListener('change', syncGridCoupling);
      syncGridCoupling();

      backdrop.hidden = false;
      window.setTimeout(() => applyBtn.focus(), 0);
    });
  }

  return { open };
}

function escapeText(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

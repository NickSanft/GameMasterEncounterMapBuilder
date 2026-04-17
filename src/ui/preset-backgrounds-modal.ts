import {
  PRESET_BACKGROUNDS,
  resolvePresetUrl,
  type PresetBackground,
} from '../state/preset-backgrounds.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface PresetBackgroundsModalHandle {
  open(): void;
  close(): void;
}

export interface PresetBackgroundsModalOptions {
  onPick(preset: PresetBackground): void | Promise<void>;
}

export function mountPresetBackgroundsModal(
  opts: PresetBackgroundsModalOptions,
): PresetBackgroundsModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal preset-maps-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Choose Preset Map');

  const cards = PRESET_BACKGROUNDS.map((preset) => {
    const url = resolvePresetUrl(preset);
    return `
      <button type="button" class="preset-card" data-preset="${preset.id}" aria-label="${preset.name}: ${preset.description}">
        <div class="preset-thumb" style="background-image:url('${url}')"></div>
        <div class="preset-label">
          <div class="preset-name">${preset.name}</div>
          <div class="preset-desc">${preset.description}</div>
        </div>
      </button>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="modal-header">
      <h2>Choose Preset Map</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <div class="preset-grid">${cards}</div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  let triggerFocus: HTMLElement | null = null;

  function open() {
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    window.setTimeout(() => {
      const first = modal.querySelector<HTMLButtonElement>('.preset-card');
      first?.focus();
    }, 0);
  }

  function close() {
    backdrop.hidden = true;
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  modal.querySelectorAll<HTMLButtonElement>('.preset-card').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.preset;
      const preset = PRESET_BACKGROUNDS.find((p) => p.id === id);
      if (!preset) return;
      close();
      await opts.onPick(preset);
    });
  });

  modal.querySelector<HTMLButtonElement>('.modal-close')!.addEventListener('click', close);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.hidden) {
      close();
      e.preventDefault();
    }
  });

  return { open, close };
}

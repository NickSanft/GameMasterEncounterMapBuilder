import type { Store } from '../state/store.js';
import type { Annotation, ID } from '../state/types.js';
import {
  ANNOTATION_PRESETS,
  DEFAULT_ANNOTATION_COLOR,
} from '../state/annotation-presets.js';
import {
  attachFocusTrap,
  rememberFocus,
  restoreFocus,
} from '../util/focus.js';

export interface AnnotationEditorHandle {
  openFor(a: Annotation): void;
  close(): void;
}

export interface AnnotationEditorOptions {
  store: Store;
}

export function mountAnnotationEditor(
  opts: AnnotationEditorOptions,
): AnnotationEditorHandle {
  const { store } = opts;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal annotation-editor';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Edit Annotation');

  const swatches = ANNOTATION_PRESETS.map(
    (p) =>
      `<button type="button" class="swatch" data-color="${p.color}" style="background:${p.color}" title="${p.label}" aria-label="${p.label}"></button>`,
  ).join('');

  modal.innerHTML = `
    <div class="modal-header">
      <h2>Edit Annotation</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <label>Text
        <textarea rows="3" data-field="text" placeholder="Drop a note…" maxlength="200"></textarea>
      </label>
      <label>Color
        <div class="border-row" data-field="color-swatches" role="group" aria-label="Annotation color">
          ${swatches}
          <input type="color" class="border-color-input" data-field="color" title="Custom color" aria-label="Custom annotation color" />
        </div>
      </label>
      <label>Visibility
        <div class="radio-group">
          <label><input type="radio" name="annot-visibility" value="shared" /> Shared</label>
          <label><input type="radio" name="annot-visibility" value="gm" /> GM only</label>
        </div>
      </label>
      <p class="settings-hint">Shared annotations appear on the Spectator view once the cell is revealed. GM-only annotations are never shown to players.</p>
      <hr />
      <div class="modal-footer">
        <button type="button" class="danger" data-action="delete">Delete</button>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const textArea = modal.querySelector<HTMLTextAreaElement>('[data-field="text"]')!;
  const colorInput = modal.querySelector<HTMLInputElement>('[data-field="color"]')!;
  const colorSwatches = Array.from(
    modal.querySelectorAll<HTMLButtonElement>(
      '[data-field="color-swatches"] .swatch',
    ),
  );
  const visibilityRadios = Array.from(
    modal.querySelectorAll<HTMLInputElement>('input[name="annot-visibility"]'),
  );
  const deleteBtn = modal.querySelector<HTMLButtonElement>('[data-action="delete"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  let currentId: ID | null = null;
  let triggerFocus: HTMLElement | null = null;

  function currentAnnotation(): Annotation | null {
    if (!currentId) return null;
    return store.getState().annotations.find((a) => a.id === currentId) ?? null;
  }

  function syncColorSwatches(color: string) {
    const normalized = color.toLowerCase();
    let matched = false;
    for (const s of colorSwatches) {
      const swatchColor = (s.dataset.color ?? '').toLowerCase();
      const active = swatchColor === normalized;
      s.classList.toggle('active', active);
      if (active) matched = true;
    }
    colorInput.value = color;
    colorInput.classList.toggle('active', !matched);
  }

  function openFor(a: Annotation) {
    triggerFocus = rememberFocus();
    currentId = a.id;
    textArea.value = a.text;
    syncColorSwatches(a.color || DEFAULT_ANNOTATION_COLOR);
    for (const r of visibilityRadios) r.checked = r.value === a.visibility;
    backdrop.hidden = false;
    window.setTimeout(() => textArea.focus(), 0);
  }

  function close() {
    currentId = null;
    backdrop.hidden = true;
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  function update(changes: Partial<Annotation>) {
    if (!currentId) return;
    store.applyPatch({ kind: 'annotation-update', id: currentId, changes });
  }

  textArea.addEventListener('input', () => update({ text: textArea.value }));

  colorInput.addEventListener('change', () => {
    update({ color: colorInput.value });
    syncColorSwatches(colorInput.value);
  });

  for (const s of colorSwatches) {
    s.addEventListener('click', () => {
      const color = s.dataset.color;
      if (!color) return;
      update({ color });
      syncColorSwatches(color);
      s.blur();
    });
  }

  for (const r of visibilityRadios) {
    r.addEventListener('change', () => {
      if (r.checked) update({ visibility: r.value as 'gm' | 'shared' });
    });
  }

  deleteBtn.addEventListener('click', () => {
    if (!currentId) return;
    store.applyPatch({ kind: 'annotation-remove', id: currentId });
    close();
  });

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
    if (
      patch?.kind === 'annotation-remove' &&
      patch.id === currentId
    ) {
      close();
    } else if (patch?.kind === 'session-reset') {
      close();
    } else if (!patch && currentAnnotation() === null) {
      close();
    }
  });

  return { openFor, close };
}

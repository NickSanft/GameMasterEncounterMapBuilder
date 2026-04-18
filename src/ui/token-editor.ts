import type { Store } from '../state/store.js';
import type { SelectionState } from '../input/context.js';
import type { ID, Token } from '../state/types.js';
import { putImage, getImageURL } from '../images/store.js';
import type { ImageLoader } from '../images/loader.js';
import { TEAM_PRESETS } from '../state/team-colors.js';
import { saveTokenToLibrary } from '../state/token-catalog.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface TokenEditorHandle {
  openFor(token: Token): void;
  close(): void;
}

export interface TokenEditorOptions {
  store: Store;
  selection: SelectionState;
  imageLoader: ImageLoader;
  onAfterChange?(): void;
}

export function mountTokenEditor(opts: TokenEditorOptions): TokenEditorHandle {
  const { store, selection, imageLoader } = opts;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal token-editor';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Edit Token');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Edit Token</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <label>Label
        <input type="text" data-field="label" maxlength="40" />
      </label>
      <label>Color
        <input type="color" data-field="color" />
      </label>
      <label>Size
        <div class="radio-group" data-field="size">
          <label><input type="radio" name="te-size" value="1" /> 1</label>
          <label><input type="radio" name="te-size" value="2" /> 2</label>
          <label><input type="radio" name="te-size" value="3" /> 3</label>
        </div>
      </label>
      <label>Image
        <div class="image-row">
          <div class="image-preview" data-field="image-preview"></div>
          <div class="image-buttons">
            <button type="button" data-action="upload">Upload…</button>
            <button type="button" data-action="remove-image" disabled>Remove</button>
          </div>
          <input type="file" accept="image/*" data-field="file" hidden />
        </div>
      </label>
      <label>Border
        <div class="border-row" data-field="border-swatches" role="group" aria-label="Token border color">
          <button type="button" class="swatch swatch-none" data-border="" title="No border" aria-label="No border">×</button>
          ${TEAM_PRESETS.map(
            (p) =>
              `<button type="button" class="swatch" data-border="${p.color}" style="background:${p.color}" title="${p.label}" aria-label="${p.label} border"></button>`,
          ).join('')}
          <input type="color" class="border-color-input" data-field="borderColor" title="Custom color" aria-label="Custom border color" />
        </div>
      </label>
      <hr />
      <div class="modal-footer">
        <button type="button" data-action="save-library" title="Save this token's appearance to the library for reuse">Save to Library</button>
        <button type="button" class="danger" data-action="delete">Delete Token</button>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const labelInput = modal.querySelector<HTMLInputElement>('[data-field="label"]')!;
  const colorInput = modal.querySelector<HTMLInputElement>('[data-field="color"]')!;
  const sizeRadios = Array.from(
    modal.querySelectorAll<HTMLInputElement>('input[name="te-size"]'),
  );
  const preview = modal.querySelector<HTMLDivElement>('[data-field="image-preview"]')!;
  const fileInput = modal.querySelector<HTMLInputElement>('[data-field="file"]')!;
  const uploadBtn = modal.querySelector<HTMLButtonElement>('[data-action="upload"]')!;
  const removeImageBtn = modal.querySelector<HTMLButtonElement>('[data-action="remove-image"]')!;
  const deleteBtn = modal.querySelector<HTMLButtonElement>('[data-action="delete"]')!;
  const saveLibraryBtn = modal.querySelector<HTMLButtonElement>('[data-action="save-library"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;
  const borderInput = modal.querySelector<HTMLInputElement>('[data-field="borderColor"]')!;
  const borderSwatches = Array.from(
    modal.querySelectorAll<HTMLButtonElement>('[data-field="border-swatches"] .swatch'),
  );

  let currentId: ID | null = null;
  let triggerFocus: HTMLElement | null = null;

  attachFocusTrap(modal);

  function currentToken(): Token | null {
    if (!currentId) return null;
    return store.getState().tokens.find((t) => t.id === currentId) ?? null;
  }

  function updatePreview(imageId: ID | null) {
    if (!imageId) {
      preview.style.backgroundImage = '';
      preview.classList.add('empty');
      removeImageBtn.disabled = true;
      return;
    }
    preview.classList.remove('empty');
    removeImageBtn.disabled = false;
    void getImageURL(imageId).then((url) => {
      if (currentToken()?.imageId !== imageId) return;
      preview.style.backgroundImage = url ? `url(${CSS.escape(url)})` : '';
    });
  }

  function openFor(token: Token) {
    triggerFocus = rememberFocus();
    currentId = token.id;
    labelInput.value = token.label;
    colorInput.value = token.color;
    for (const r of sizeRadios) r.checked = Number(r.value) === token.size;
    updatePreview(token.imageId);
    syncBorderUI(token.borderColor);
    backdrop.hidden = false;
    window.setTimeout(() => labelInput.focus(), 0);
  }

  function syncBorderUI(borderColor: string | null) {
    const normalized = (borderColor ?? '').toLowerCase();
    let matched = false;
    for (const s of borderSwatches) {
      const swatchColor = (s.dataset.border ?? '').toLowerCase();
      const isActive = swatchColor === normalized;
      s.classList.toggle('active', isActive);
      if (isActive) matched = true;
    }
    borderInput.value = borderColor ?? '#ffffff';
    borderInput.classList.toggle('active', !matched && borderColor !== null);
  }

  function close() {
    currentId = null;
    backdrop.hidden = true;
    fileInput.value = '';
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  function update(changes: Partial<Token>) {
    if (!currentId) return;
    store.applyPatch({ kind: 'token-update', id: currentId, changes });
    opts.onAfterChange?.();
  }

  labelInput.addEventListener('input', () => {
    update({ label: labelInput.value });
  });

  colorInput.addEventListener('change', () => {
    update({ color: colorInput.value });
  });

  for (const r of sizeRadios) {
    r.addEventListener('change', () => {
      if (r.checked) update({ size: Number(r.value) });
    });
  }

  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file || !currentId) return;
    try {
      const id = await putImage(file, file.type || 'image/png');
      imageLoader.invalidate(id);
      update({ imageId: id });
      updatePreview(id);
    } catch (err) {
      console.error('[token-editor] upload failed', err);
      window.alert('Image upload failed — check the console for details.');
    }
  });

  removeImageBtn.addEventListener('click', () => {
    update({ imageId: null });
    updatePreview(null);
  });

  for (const s of borderSwatches) {
    s.addEventListener('click', () => {
      const raw = s.dataset.border ?? '';
      const next = raw === '' ? null : raw;
      update({ borderColor: next });
      syncBorderUI(next);
      s.blur();
    });
  }

  borderInput.addEventListener('change', () => {
    update({ borderColor: borderInput.value });
    syncBorderUI(borderInput.value);
  });

  deleteBtn.addEventListener('click', () => {
    if (!currentId) return;
    const id = currentId;
    store.applyPatch({ kind: 'token-remove', id });
    if (selection.ids.has(id)) {
      selection.ids = new Set();
    }
    close();
    opts.onAfterChange?.();
  });

  saveLibraryBtn.addEventListener('click', async () => {
    const token = currentToken();
    if (!token) return;
    saveLibraryBtn.disabled = true;
    const originalLabel = saveLibraryBtn.textContent ?? 'Save to Library';
    try {
      await saveTokenToLibrary(token);
      saveLibraryBtn.textContent = 'Saved ✓';
      window.setTimeout(() => {
        saveLibraryBtn.textContent = originalLabel;
        saveLibraryBtn.disabled = false;
      }, 1200);
    } catch (err) {
      console.error('[token-editor] save-to-library failed', err);
      window.alert('Could not save token to the library.');
      saveLibraryBtn.disabled = false;
    }
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
    if (!patch) {
      if (currentToken() === null) close();
      return;
    }
    if (patch.kind === 'token-remove' && patch.id === currentId) {
      close();
    } else if (patch.kind === 'session-reset') {
      close();
    }
  });

  return { openFor, close };
}

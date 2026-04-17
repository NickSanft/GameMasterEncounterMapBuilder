import type { Store } from '../state/store.js';
import type { SelectionState } from '../input/context.js';
import type { ID, Token } from '../state/types.js';
import { putImage, getImageURL } from '../images/store.js';
import type { ImageLoader } from '../images/loader.js';

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
      <hr />
      <div class="modal-footer">
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
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;

  let currentId: ID | null = null;

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
    currentId = token.id;
    labelInput.value = token.label;
    colorInput.value = token.color;
    for (const r of sizeRadios) r.checked = Number(r.value) === token.size;
    updatePreview(token.imageId);
    backdrop.hidden = false;
    window.setTimeout(() => labelInput.focus(), 0);
  }

  function close() {
    currentId = null;
    backdrop.hidden = true;
    fileInput.value = '';
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

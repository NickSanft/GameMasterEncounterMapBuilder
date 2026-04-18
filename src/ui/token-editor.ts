import type { Store } from '../state/store.js';
import type { SelectionState } from '../input/context.js';
import type { ID, Token } from '../state/types.js';
import { putImage, getImageURL } from '../images/store.js';
import type { ImageLoader } from '../images/loader.js';
import { TEAM_PRESETS } from '../state/team-colors.js';
import { saveTokenToLibrary } from '../state/token-catalog.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';
import {
  cycleTo,
  tokensInSelectionOrder,
} from './token-editor-cycle.js';

export interface TokenEditorHandle {
  openFor(token: Token): void;
  close(): void;
  /** True if the modal is currently visible. */
  isOpen(): boolean;
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
      <div class="token-editor-title">
        <h2>Edit Token</h2>
        <span class="token-editor-counter" data-field="counter" aria-live="polite"></span>
      </div>
      <div class="token-editor-cycle" data-field="cycle-group" role="group" aria-label="Cycle selection">
        <button type="button" class="icon-btn" data-action="prev" title="Previous in selection (Ctrl+Left)" aria-label="Previous token in selection">‹</button>
        <button type="button" class="icon-btn" data-action="next" title="Next in selection (Ctrl+Right)" aria-label="Next token in selection">›</button>
      </div>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <label>Label
        <input type="text" data-field="label" maxlength="40" />
      </label>
      <div class="grid-row">
        <label>X (col)
          <input type="number" data-field="x" step="1" />
        </label>
        <label>Y (row)
          <input type="number" data-field="y" step="1" />
        </label>
        <label>Size
          <div class="radio-group" data-field="size">
            <label><input type="radio" name="te-size" value="1" /> 1</label>
            <label><input type="radio" name="te-size" value="2" /> 2</label>
            <label><input type="radio" name="te-size" value="3" /> 3</label>
          </div>
        </label>
      </div>
      <label>Color
        <input type="color" data-field="color" />
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
        <div class="border-row" data-field="border-swatches" role="radiogroup" aria-label="Token border color">
          <button type="button" class="swatch swatch-none" role="radio" data-border="" title="No border" aria-label="No border">×</button>
          ${TEAM_PRESETS.map(
            (p) =>
              `<button type="button" class="swatch" role="radio" data-border="${p.color}" style="background:${p.color}" title="${p.label}" aria-label="${p.label} border"></button>`,
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
  const xInput = modal.querySelector<HTMLInputElement>('[data-field="x"]')!;
  const yInput = modal.querySelector<HTMLInputElement>('[data-field="y"]')!;
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
  const prevBtn = modal.querySelector<HTMLButtonElement>('[data-action="prev"]')!;
  const nextBtn = modal.querySelector<HTMLButtonElement>('[data-action="next"]')!;
  const cycleGroup = modal.querySelector<HTMLDivElement>('[data-field="cycle-group"]')!;
  const counter = modal.querySelector<HTMLSpanElement>('[data-field="counter"]')!;

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

  function syncBorderUI(borderColor: string | null) {
    const normalized = (borderColor ?? '').toLowerCase();
    let matched = false;
    for (const s of borderSwatches) {
      const swatchColor = (s.dataset.border ?? '').toLowerCase();
      const isActive = swatchColor === normalized;
      s.classList.toggle('active', isActive);
      s.setAttribute('aria-checked', isActive ? 'true' : 'false');
      // Roving tabindex: only the active swatch is in the tab order; if
      // nothing matches, the "no border" swatch gets the roving focus.
      s.tabIndex = isActive ? 0 : -1;
      if (isActive) matched = true;
    }
    if (!matched) {
      // No preset matched — put roving focus on the "no border" swatch so
      // arrow keys have a predictable entry point.
      const none = borderSwatches[0]!;
      none.tabIndex = 0;
    }
    borderInput.value = borderColor ?? '#ffffff';
    borderInput.classList.toggle('active', !matched && borderColor !== null);
  }

  function syncCounter() {
    const state = store.getState();
    const order = tokensInSelectionOrder(state.tokens, selection.ids);
    const multi = order.length > 1;
    cycleGroup.hidden = !multi;
    if (!multi) {
      counter.textContent = '';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }
    const idx = currentId ? order.indexOf(currentId) : -1;
    if (idx < 0) {
      counter.textContent = '';
    } else {
      counter.textContent = `${idx + 1} of ${order.length}`;
    }
    prevBtn.disabled = false;
    nextBtn.disabled = false;
  }

  function fillFromToken(token: Token) {
    currentId = token.id;
    labelInput.value = token.label;
    colorInput.value = token.color;
    xInput.value = String(token.x);
    yInput.value = String(token.y);
    for (const r of sizeRadios) r.checked = Number(r.value) === token.size;
    updatePreview(token.imageId);
    syncBorderUI(token.borderColor);
    syncCounter();
  }

  function openFor(token: Token) {
    triggerFocus = rememberFocus();
    fillFromToken(token);
    backdrop.hidden = false;
    window.setTimeout(() => {
      labelInput.focus();
      labelInput.select();
    }, 0);
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

  function cycle(delta: number) {
    const state = store.getState();
    const order = tokensInSelectionOrder(state.tokens, selection.ids);
    if (order.length <= 1) return;
    const nextId = cycleTo(order, currentId, delta);
    if (!nextId) return;
    const nextToken = state.tokens.find((t) => t.id === nextId);
    if (!nextToken) return;
    fillFromToken(nextToken);
    // Keep focus on the label so rapid cycling feels keyboard-native.
    labelInput.focus();
    labelInput.select();
  }

  labelInput.addEventListener('input', () => {
    update({ label: labelInput.value });
  });

  colorInput.addEventListener('change', () => {
    update({ color: colorInput.value });
  });

  function parseIntOr(v: string, fallback: number, min: number, max: number): number {
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function commitX() {
    const token = currentToken();
    if (!token) return;
    const grid = store.getState().grid;
    const n = parseIntOr(xInput.value, token.x, 0, grid.cols - 1);
    if (n !== token.x) update({ x: n });
    xInput.value = String(n);
  }
  function commitY() {
    const token = currentToken();
    if (!token) return;
    const grid = store.getState().grid;
    const n = parseIntOr(yInput.value, token.y, 0, grid.rows - 1);
    if (n !== token.y) update({ y: n });
    yInput.value = String(n);
  }

  xInput.addEventListener('change', commitX);
  yInput.addEventListener('change', commitY);
  // Enter commits + keeps focus; blur also commits via 'change'.
  xInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitX();
      e.preventDefault();
    }
  });
  yInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      commitY();
      e.preventDefault();
    }
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
    });
    s.addEventListener('keydown', (e) => {
      const idx = borderSwatches.indexOf(s);
      let nextIdx = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextIdx = (idx + 1) % borderSwatches.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        nextIdx = (idx - 1 + borderSwatches.length) % borderSwatches.length;
      } else if (e.key === 'Home') {
        nextIdx = 0;
      } else if (e.key === 'End') {
        nextIdx = borderSwatches.length - 1;
      } else if (e.key === ' ' || e.key === 'Enter') {
        const raw = s.dataset.border ?? '';
        const next = raw === '' ? null : raw;
        update({ borderColor: next });
        syncBorderUI(next);
        e.preventDefault();
        return;
      } else {
        return;
      }
      const target = borderSwatches[nextIdx]!;
      // Update roving tabindex so the newly-focused swatch is tab-stoppable.
      for (const other of borderSwatches) other.tabIndex = -1;
      target.tabIndex = 0;
      target.focus();
      e.preventDefault();
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
      const next = new Set(selection.ids);
      next.delete(id);
      selection.ids = next;
    }
    // If there's still a selection, cycle to the next token rather than
    // closing the modal — keeps keyboard-only batch editing fast.
    const order = tokensInSelectionOrder(store.getState().tokens, selection.ids);
    if (order.length > 0) {
      const nextToken = store.getState().tokens.find((t) => t.id === order[0]!);
      if (nextToken) {
        fillFromToken(nextToken);
        labelInput.focus();
        labelInput.select();
        opts.onAfterChange?.();
        return;
      }
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

  prevBtn.addEventListener('click', () => cycle(-1));
  nextBtn.addEventListener('click', () => cycle(1));

  closeBtn.addEventListener('click', close);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  // Cycle + close shortcuts scoped to the modal so they don't interfere
  // with the canvas keymap when the editor is hidden.
  modal.addEventListener('keydown', (e) => {
    if (backdrop.hidden) return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'ArrowLeft') {
        cycle(-1);
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowRight') {
        cycle(1);
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter') {
        close();
        e.preventDefault();
        return;
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.hidden) {
      close();
      e.preventDefault();
    }
  });

  store.subscribe((patch) => {
    if (backdrop.hidden) {
      return;
    }
    if (!patch) {
      if (currentToken() === null) close();
      else syncCounter();
      return;
    }
    if (patch.kind === 'token-remove' && patch.id === currentId) {
      close();
    } else if (patch.kind === 'session-reset') {
      close();
    } else if (
      patch.kind === 'token-add' ||
      patch.kind === 'token-remove' ||
      patch.kind === 'token-update'
    ) {
      syncCounter();
      // If the currently-open token changed externally (e.g. arrow-key
      // nudge on the canvas), re-sync position fields unless the user is
      // actively editing them.
      if (patch.kind === 'token-update' && patch.id === currentId) {
        const t = currentToken();
        if (t) {
          if (document.activeElement !== xInput) xInput.value = String(t.x);
          if (document.activeElement !== yInput) yInput.value = String(t.y);
        }
      }
    }
  });

  return {
    openFor,
    close,
    isOpen: () => !backdrop.hidden,
  };
}

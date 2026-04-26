/**
 * Phase 102 — camera bookmarks modal.
 *
 * Lists every bookmark in the active scene, newest-first. Each row
 * has a "Jump" button that restores the camera, "Rename" that opens
 * an inline rename, and "Delete." A "Save current camera as
 * bookmark…" button at the top captures the live camera with a
 * GM-supplied name.
 *
 * Slot numbers (1–9) are shown in front of the first nine entries so
 * users can see what `Alt+N` will jump to. Slots 10+ exist but are
 * not bound to a hotkey; the modal is the way to reach them.
 *
 * Pure UI module. The host wires the data getters + action callbacks
 * to `src/state/camera-bookmarks.ts` + the renderer's camera setter.
 */

import type { Camera } from '../state/types.js';
import type { CameraBookmark } from '../state/camera-bookmarks.js';
import { HOTKEY_SLOTS } from '../state/camera-bookmarks.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface CameraBookmarksModalHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface CameraBookmarksModalOptions {
  /** Bookmarks for the currently-active scene, newest-first. */
  getEntries(): CameraBookmark[];
  /** Live camera at the moment "Save current camera…" is clicked. */
  getCurrentCamera(): Camera;
  /** Called with a (already-trimmed) name + the captured camera. */
  onSave(name: string, camera: Camera): void;
  /** Called with the bookmark id to jump to. Modal closes after. */
  onJump(id: string): void;
  /** Called with id + new name (rename). */
  onRename(id: string, name: string): void;
  /** Called with id (delete). */
  onDelete(id: string): void;
}

export function mountCameraBookmarksModal(
  opts: CameraBookmarksModalOptions,
): CameraBookmarksModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal camera-bookmarks-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Camera bookmarks');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Camera bookmarks</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p class="camera-bookmarks-hint">
        Save named camera positions to jump back to during play. The
        first nine bookmarks are bound to <kbd>Alt</kbd>+<kbd>1</kbd>..<kbd>9</kbd>.
        Bookmarks are scoped to the current scene.
      </p>
      <button type="button" class="camera-bookmarks-save-btn" data-action="save-current">
        Save current camera as bookmark…
      </button>
      <ol class="camera-bookmarks-list" data-field="list" aria-label="Saved bookmarks"></ol>
      <p class="camera-bookmarks-empty" data-field="empty" hidden>
        No camera bookmarks for this scene yet. Pan / zoom to a spot
        you want to remember and click "Save current camera as
        bookmark…" above.
      </p>
    </div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const list = modal.querySelector<HTMLOListElement>('[data-field="list"]')!;
  const empty = modal.querySelector<HTMLParagraphElement>('[data-field="empty"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;
  const saveBtn = modal.querySelector<HTMLButtonElement>('[data-action="save-current"]')!;

  let isOpen = false;
  let triggerFocus: HTMLElement | null = null;

  function refresh() {
    const entries = opts.getEntries();
    if (entries.length === 0) {
      list.replaceChildren();
      list.hidden = true;
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    list.hidden = false;
    list.replaceChildren(...entries.map((e, idx) => renderRow(e, idx)));
  }

  function renderRow(entry: CameraBookmark, idx: number): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'camera-bookmark-row';
    li.dataset.bookmarkId = entry.id;

    const slot = document.createElement('span');
    slot.className = 'camera-bookmark-slot';
    if (idx < HOTKEY_SLOTS) {
      slot.textContent = `Alt+${idx + 1}`;
      slot.title = `Hotkey: Alt+${idx + 1}`;
    } else {
      slot.textContent = '';
      slot.classList.add('camera-bookmark-slot-empty');
    }

    const name = document.createElement('span');
    name.className = 'camera-bookmark-name';
    name.textContent = entry.name;
    name.title = `Camera: x=${Math.round(entry.camera.x)}, y=${Math.round(entry.camera.y)}, zoom=${entry.camera.zoom.toFixed(2)}`;

    const actions = document.createElement('div');
    actions.className = 'camera-bookmark-actions';

    const jumpBtn = document.createElement('button');
    jumpBtn.type = 'button';
    jumpBtn.className = 'camera-bookmark-jump';
    jumpBtn.textContent = 'Jump';
    jumpBtn.setAttribute('aria-label', `Jump to ${entry.name}`);
    jumpBtn.addEventListener('click', () => {
      opts.onJump(entry.id);
      close();
    });

    const renameBtn = document.createElement('button');
    renameBtn.type = 'button';
    renameBtn.className = 'camera-bookmark-rename';
    renameBtn.textContent = 'Rename';
    renameBtn.setAttribute('aria-label', `Rename ${entry.name}`);
    renameBtn.addEventListener('click', () => {
      const next = window.prompt('New name for this bookmark:', entry.name);
      if (next === null) return;
      const trimmed = next.trim();
      if (!trimmed) return;
      opts.onRename(entry.id, trimmed);
      refresh();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'camera-bookmark-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', `Delete ${entry.name}`);
    deleteBtn.addEventListener('click', () => {
      opts.onDelete(entry.id);
      refresh();
    });

    actions.appendChild(jumpBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(slot);
    li.appendChild(name);
    li.appendChild(actions);
    return li;
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    refresh();
    window.setTimeout(() => saveBtn.focus(), 0);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (modal.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    backdrop.hidden = true;
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  saveBtn.addEventListener('click', () => {
    const name = window.prompt('Name for this bookmark:', '');
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    opts.onSave(trimmed, opts.getCurrentCamera());
    refresh();
  });
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  window.addEventListener('keydown', (e) => {
    if (isOpen && e.key === 'Escape' && !e.defaultPrevented) {
      close();
      e.preventDefault();
    }
  });

  return {
    open,
    close,
    isOpen: () => isOpen,
    destroy() {
      backdrop.remove();
    },
  };
}

import type { ID } from '../state/types.js';
import {
  listScenes,
  createScene,
  renameScene,
  deleteScene,
  duplicateScene,
  type SceneSummary,
} from '../state/scenes.js';
import { attachFocusTrap, rememberFocus, restoreFocus } from '../util/focus.js';

export interface ScenesModalHandle {
  open(): void;
  close(): void;
  refresh(): Promise<void>;
}

export interface ScenesModalOptions {
  /** Scene id that's currently active. Used to highlight the row. */
  getActiveId(): ID | null;
  /** Called when the user clicks a scene row other than the active one. */
  onSwitch(id: ID): void | Promise<void>;
  /** Called after "New scene" finishes — receives the new id. */
  onCreated(id: ID): void | Promise<void>;
  /** Called after "Duplicate" finishes — receives the new id. */
  onDuplicated(id: ID): void | Promise<void>;
  /** Called when the active scene is about to be deleted. */
  onDeleteActive(): void | Promise<void>;
  /** Called after any rename / delete / create / duplicate finishes — host
   *  refreshes any UI that mirrors scene metadata (e.g. the Scene
   *  indicator). Optional; modal self-refreshes regardless. */
  onChanged?(): void | Promise<void>;
}

export function mountScenesModal(opts: ScenesModalOptions): ScenesModalHandle {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.hidden = true;

  const modal = document.createElement('div');
  modal.className = 'modal scenes-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Scenes');
  modal.innerHTML = `
    <div class="modal-header">
      <h2>Scenes</h2>
      <button type="button" class="modal-close" aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <div class="scenes-toolbar">
        <button type="button" class="primary" data-action="new-scene">+ New scene</button>
      </div>
      <p class="library-hint">
        Save a scene per encounter, dungeon room, or set piece. Switching scenes persists the one you're leaving and loads the one you pick. Undo history resets per scene.
      </p>
      <div class="scenes-grid" data-field="grid" role="list"></div>
      <div class="library-empty" data-field="empty" hidden>
        <p>No scenes yet.</p>
        <p class="settings-hint">Click "New scene" above to create your first one.</p>
      </div>
    </div>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  attachFocusTrap(modal);

  const grid = modal.querySelector<HTMLDivElement>('[data-field="grid"]')!;
  const empty = modal.querySelector<HTMLDivElement>('[data-field="empty"]')!;
  const closeBtn = modal.querySelector<HTMLButtonElement>('.modal-close')!;
  const newBtn = modal.querySelector<HTMLButtonElement>('[data-action="new-scene"]')!;

  let triggerFocus: HTMLElement | null = null;
  let scenes: SceneSummary[] = [];

  async function refresh(): Promise<void> {
    scenes = await listScenes();
    grid.innerHTML = '';
    if (scenes.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    const activeId = opts.getActiveId();
    for (const s of scenes) {
      grid.appendChild(renderCard(s, s.id === activeId));
    }
  }

  function renderCard(s: SceneSummary, isActive: boolean): HTMLElement {
    const card = document.createElement('div');
    card.className = 'scene-card';
    if (isActive) card.classList.add('active');
    card.setAttribute('role', 'listitem');
    card.dataset.sceneId = s.id;

    const thumbStyle = s.thumbnail
      ? `background-image:url(${CSS.escape(s.thumbnail)});background-size:cover;background-position:center`
      : '';

    card.innerHTML = `
      <button type="button" class="scene-card-main" data-action="switch" ${isActive ? 'aria-current="true"' : ''}>
        <div class="scene-thumb" style="${thumbStyle}">${s.thumbnail ? '' : renderPlaceholder()}</div>
        <div class="scene-meta">
          <div class="scene-name" data-field="name">${escapeText(s.name)}</div>
          <div class="scene-sub">${isActive ? '✓ Active' : `Updated ${formatTime(s.updatedAt)}`}</div>
        </div>
      </button>
      <div class="scene-actions">
        <button type="button" class="scene-action" data-action="rename" title="Rename scene">Rename</button>
        <button type="button" class="scene-action" data-action="duplicate" title="Duplicate scene">Duplicate</button>
        <button type="button" class="scene-action danger" data-action="delete" title="Delete scene">Delete</button>
      </div>
    `;

    card
      .querySelector<HTMLButtonElement>('[data-action="switch"]')!
      .addEventListener('click', async () => {
        if (isActive) {
          close();
          return;
        }
        close();
        await opts.onSwitch(s.id);
      });

    card
      .querySelector<HTMLButtonElement>('[data-action="rename"]')!
      .addEventListener('click', async (e) => {
        e.stopPropagation();
        const next = window.prompt('Scene name:', s.name);
        if (next === null) return;
        const trimmed = next.trim();
        if (!trimmed || trimmed === s.name) return;
        await renameScene(s.id, trimmed);
        await refresh();
        await opts.onChanged?.();
      });

    card
      .querySelector<HTMLButtonElement>('[data-action="duplicate"]')!
      .addEventListener('click', async (e) => {
        e.stopPropagation();
        const dup = await duplicateScene(s.id);
        await opts.onDuplicated(dup.id);
        await refresh();
        await opts.onChanged?.();
      });

    card
      .querySelector<HTMLButtonElement>('[data-action="delete"]')!
      .addEventListener('click', async (e) => {
        e.stopPropagation();
        if (scenes.length === 1) {
          window.alert('Cannot delete the last remaining scene.');
          return;
        }
        const ok = window.confirm(
          `Delete scene "${s.name}"? This cannot be undone.`,
        );
        if (!ok) return;
        if (isActive) {
          // Tell the host to switch away before we nuke the record.
          await opts.onDeleteActive();
        }
        await deleteScene(s.id);
        await refresh();
        await opts.onChanged?.();
      });

    return card;
  }

  function renderPlaceholder(): string {
    return `<span class="scene-thumb-placeholder">(no thumbnail)</span>`;
  }

  newBtn.addEventListener('click', async () => {
    const name = window.prompt('Name for the new scene:', 'New scene');
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const record = await createScene(trimmed);
    // Close the modal first — the host immediately switches to the new
    // scene, and leaving the modal open would hide the fresh map.
    close();
    await opts.onCreated(record.id);
    await opts.onChanged?.();
  });

  closeBtn.addEventListener('click', () => close());
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !backdrop.hidden) {
      close();
      e.preventDefault();
    }
  });

  function open() {
    triggerFocus = rememberFocus();
    backdrop.hidden = false;
    void refresh().then(() => {
      const first = modal.querySelector<HTMLButtonElement>('[data-action="switch"]');
      (first ?? closeBtn).focus();
    });
  }

  function close() {
    if (modal.contains(document.activeElement)) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
    backdrop.hidden = true;
    const prior = triggerFocus;
    triggerFocus = null;
    restoreFocus(prior);
  }

  return { open, close, refresh };
}

function escapeText(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const now = Date.now();
  const diffSec = Math.round((now - ms) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.round(diffSec / 60)} min ago`;
  if (diffSec < 86_400) return `${Math.round(diffSec / 3600)} h ago`;
  return d.toLocaleDateString();
}

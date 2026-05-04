/**
 * Phase 142 — tile-paint tool side panel.
 *
 * Shown only when the tile-paint tool is active. Exposes the brush
 * kind picker (5 kinds) + a Paint / Erase toggle + a "Clear all
 * tiles" affordance. Mirrors the fog-settings.ts pattern so the
 * UI feels consistent with the other tool side panels.
 */
import type { Store } from '../state/store.js';
import type { TilePaintKind } from '../state/types.js';
import type {
  TilePaintMode,
  TilePaintOptionsRef,
} from '../input/tool-tile-paint.js';
import type { ToolManager } from '../input/tool-manager.js';

interface KindEntry {
  id: TilePaintKind;
  label: string;
}

const KINDS: readonly KindEntry[] = [
  { id: 'floor', label: 'Floor' },
  { id: 'wall', label: 'Wall' },
  { id: 'water', label: 'Water' },
  { id: 'rough', label: 'Rough' },
  { id: 'pit', label: 'Pit' },
];

const MODES: ReadonlyArray<{ id: TilePaintMode; label: string }> = [
  { id: 'paint', label: 'Paint' },
  { id: 'erase', label: 'Erase' },
];

export function mountTilePaintSettings(
  container: HTMLElement,
  optionsRef: TilePaintOptionsRef,
  toolManager: ToolManager,
  store: Store,
): void {
  const panel = document.createElement('div');
  panel.className = 'tile-paint-settings';

  const modeLabel = document.createElement('div');
  modeLabel.className = 'tile-paint-settings-label';
  modeLabel.textContent = 'Mode';
  panel.appendChild(modeLabel);

  const modeRow = document.createElement('div');
  modeRow.className = 'tile-paint-settings-row';
  const modeButtons = new Map<TilePaintMode, HTMLButtonElement>();
  for (const m of MODES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = m.label;
    b.addEventListener('click', () => {
      optionsRef.current = { ...optionsRef.current, mode: m.id };
      syncButtons();
      b.blur();
    });
    modeRow.appendChild(b);
    modeButtons.set(m.id, b);
  }
  panel.appendChild(modeRow);

  const kindLabel = document.createElement('div');
  kindLabel.className = 'tile-paint-settings-label';
  kindLabel.textContent = 'Kind';
  panel.appendChild(kindLabel);

  const kindRow = document.createElement('div');
  kindRow.className = 'tile-paint-settings-row';
  const kindButtons = new Map<TilePaintKind, HTMLButtonElement>();
  for (const k of KINDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = k.label;
    b.dataset.kind = k.id;
    b.addEventListener('click', () => {
      optionsRef.current = { ...optionsRef.current, kind: k.id, mode: 'paint' };
      syncButtons();
      b.blur();
    });
    kindRow.appendChild(b);
    kindButtons.set(k.id, b);
  }
  panel.appendChild(kindRow);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.textContent = 'Clear all tiles';
  clearBtn.className = 'tile-paint-settings-clear';
  clearBtn.addEventListener('click', () => {
    if (store.getState().tilePaints.length === 0) {
      clearBtn.blur();
      return;
    }
    const ok = window.confirm(
      'Clear every painted tile on this scene? This can be undone.',
    );
    if (ok) store.applyPatch({ kind: 'tile-paint-clear' });
    clearBtn.blur();
  });
  panel.appendChild(clearBtn);

  function syncButtons() {
    for (const [id, btn] of modeButtons) {
      btn.classList.toggle('active', id === optionsRef.current.mode);
    }
    for (const [id, btn] of kindButtons) {
      btn.classList.toggle('active', id === optionsRef.current.kind);
    }
  }

  function syncVisibility(toolId: string | null) {
    panel.style.display = toolId === 'tile-paint' ? '' : 'none';
  }

  syncButtons();
  syncVisibility(toolManager.getActive());
  toolManager.onChange(syncVisibility);

  container.appendChild(panel);
}

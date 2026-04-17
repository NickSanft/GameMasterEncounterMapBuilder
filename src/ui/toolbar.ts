import type { ToolManager } from '../input/tool-manager.js';

export interface ToolbarEntry {
  id: string;
  label: string;
  title?: string;
}

export interface ToolbarAction {
  id: string;
  label: string;
  title?: string;
  onClick(): void;
  isEnabled?(): boolean;
}

export interface ToolbarHandle {
  refreshActions(): void;
}

export function mountToolbar(
  container: HTMLElement,
  manager: ToolManager,
  tools: ToolbarEntry[],
  actions: ToolbarAction[] = [],
): ToolbarHandle {
  const bar = document.createElement('div');
  bar.className = 'gm-toolbar';

  const actionButtons = new Map<string, HTMLButtonElement>();
  if (actions.length > 0) {
    const actionSection = document.createElement('div');
    actionSection.className = 'gm-toolbar-actions';
    for (const action of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = action.label;
      if (action.title) btn.title = action.title;
      btn.addEventListener('click', () => {
        action.onClick();
        btn.blur();
      });
      actionSection.appendChild(btn);
      actionButtons.set(action.id, btn);
    }
    bar.appendChild(actionSection);

    const divider = document.createElement('div');
    divider.className = 'gm-toolbar-divider';
    bar.appendChild(divider);
  }

  const toolButtons = new Map<string, HTMLButtonElement>();
  for (const entry of tools) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = entry.label;
    btn.dataset.tool = entry.id;
    if (entry.title) btn.title = entry.title;
    btn.addEventListener('click', () => {
      manager.setActive(entry.id);
      btn.blur();
    });
    bar.appendChild(btn);
    toolButtons.set(entry.id, btn);
  }

  container.appendChild(bar);

  function syncTools(name: string | null) {
    for (const [id, btn] of toolButtons) {
      btn.classList.toggle('active', id === name);
    }
  }

  function refreshActions() {
    for (const action of actions) {
      const btn = actionButtons.get(action.id);
      if (!btn) continue;
      if (action.isEnabled) btn.disabled = !action.isEnabled();
    }
  }

  syncTools(manager.getActive());
  refreshActions();
  manager.onChange(syncTools);

  return { refreshActions };
}

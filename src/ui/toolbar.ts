import type { ToolManager } from '../input/tool-manager.js';

interface ToolbarEntry {
  id: string;
  label: string;
  title?: string;
}

export function mountToolbar(
  container: HTMLElement,
  manager: ToolManager,
  entries: ToolbarEntry[],
): void {
  const bar = document.createElement('div');
  bar.className = 'gm-toolbar';

  const buttons = new Map<string, HTMLButtonElement>();
  for (const entry of entries) {
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
    buttons.set(entry.id, btn);
  }

  container.appendChild(bar);

  function sync(name: string | null) {
    for (const [id, btn] of buttons) {
      btn.classList.toggle('active', id === name);
    }
  }

  sync(manager.getActive());
  manager.onChange(sync);
}

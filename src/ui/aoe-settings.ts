import type { AoeToolOptionsRef } from '../input/tool-aoe.js';
import type { ToolManager } from '../input/tool-manager.js';
import { AOE_PRESETS } from '../state/aoe.js';
import type { AoeKind, AoeVisibility } from '../state/types.js';

export function mountAoeSettings(
  container: HTMLElement,
  optionsRef: AoeToolOptionsRef,
  toolManager: ToolManager,
): void {
  const panel = document.createElement('div');
  panel.className = 'aoe-settings';

  const kindLabel = document.createElement('div');
  kindLabel.className = 'fog-settings-label';
  kindLabel.textContent = 'Shape';
  panel.appendChild(kindLabel);

  const kindRow = document.createElement('div');
  kindRow.className = 'fog-settings-row aoe-kinds';
  const kindButtons = new Map<AoeKind, HTMLButtonElement>();
  for (const preset of AOE_PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = preset.label;
    b.title = preset.label;
    b.addEventListener('click', () => {
      optionsRef.current = { ...optionsRef.current, kind: preset.id };
      syncKind();
      b.blur();
    });
    kindRow.appendChild(b);
    kindButtons.set(preset.id, b);
  }
  panel.appendChild(kindRow);

  const colorLabel = document.createElement('div');
  colorLabel.className = 'fog-settings-label';
  colorLabel.textContent = 'Color';
  panel.appendChild(colorLabel);

  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.className = 'aoe-color-input';
  colorInput.addEventListener('change', () => {
    optionsRef.current = { ...optionsRef.current, color: colorInput.value };
  });
  panel.appendChild(colorInput);

  const visibilityLabel = document.createElement('div');
  visibilityLabel.className = 'fog-settings-label';
  visibilityLabel.textContent = 'Visibility';
  panel.appendChild(visibilityLabel);

  const visibilityRow = document.createElement('div');
  visibilityRow.className = 'fog-settings-row';
  const visibilityButtons = new Map<AoeVisibility, HTMLButtonElement>();
  for (const v of [
    { id: 'shared' as const, label: 'Shared' },
    { id: 'gm' as const, label: 'GM only' },
  ]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = v.label;
    b.addEventListener('click', () => {
      optionsRef.current = { ...optionsRef.current, visibility: v.id };
      syncVisibility();
      b.blur();
    });
    visibilityRow.appendChild(b);
    visibilityButtons.set(v.id, b);
  }
  panel.appendChild(visibilityRow);

  function syncKind() {
    for (const [id, btn] of kindButtons) {
      btn.classList.toggle('active', id === optionsRef.current.kind);
    }
  }

  function syncVisibility() {
    for (const [id, btn] of visibilityButtons) {
      btn.classList.toggle('active', id === optionsRef.current.visibility);
    }
  }

  function syncColor() {
    colorInput.value = optionsRef.current.color;
  }

  function sync() {
    syncKind();
    syncVisibility();
    syncColor();
  }

  function syncVisibilityToTool(toolId: string | null) {
    panel.style.display = toolId === 'aoe' ? '' : 'none';
  }

  sync();
  syncVisibilityToTool(toolManager.getActive());
  toolManager.onChange(syncVisibilityToTool);

  container.appendChild(panel);
}

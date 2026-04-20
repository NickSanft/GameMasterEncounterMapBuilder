import type { DrawToolOptionsRef } from '../input/tool-draw.js';
import type { ToolManager } from '../input/tool-manager.js';
import type { DrawStrokeVisibility } from '../state/types.js';

const COLOR_PRESETS = [
  '#ffd966', // gold
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#ffffff', // white
  '#111111', // black
];

const WIDTHS = [2, 4, 6, 10];

export function mountDrawSettings(
  container: HTMLElement,
  optionsRef: DrawToolOptionsRef,
  toolManager: ToolManager,
): void {
  const panel = document.createElement('div');
  panel.className = 'draw-settings';

  const colorLabel = document.createElement('div');
  colorLabel.className = 'fog-settings-label';
  colorLabel.textContent = 'Color';
  panel.appendChild(colorLabel);

  const colorRow = document.createElement('div');
  colorRow.className = 'draw-color-row';
  const colorButtons = new Map<string, HTMLButtonElement>();
  for (const hex of COLOR_PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'draw-color-swatch';
    b.style.background = hex;
    b.title = hex;
    b.setAttribute('aria-label', `Color ${hex}`);
    b.addEventListener('click', () => {
      optionsRef.current = { ...optionsRef.current, color: hex };
      syncColor();
      b.blur();
    });
    colorRow.appendChild(b);
    colorButtons.set(hex, b);
  }

  const customColor = document.createElement('input');
  customColor.type = 'color';
  customColor.className = 'draw-custom-color';
  customColor.title = 'Custom color';
  customColor.setAttribute('aria-label', 'Custom stroke color');
  customColor.addEventListener('input', () => {
    optionsRef.current = { ...optionsRef.current, color: customColor.value };
    syncColor();
  });
  colorRow.appendChild(customColor);
  panel.appendChild(colorRow);

  const widthLabel = document.createElement('div');
  widthLabel.className = 'fog-settings-label';
  widthLabel.textContent = 'Width';
  panel.appendChild(widthLabel);

  const widthRow = document.createElement('div');
  widthRow.className = 'fog-settings-row draw-widths';
  const widthButtons = new Map<number, HTMLButtonElement>();
  for (const w of WIDTHS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(w);
    b.title = `${w} px width`;
    b.addEventListener('click', () => {
      optionsRef.current = { ...optionsRef.current, width: w };
      syncWidth();
      b.blur();
    });
    widthRow.appendChild(b);
    widthButtons.set(w, b);
  }
  panel.appendChild(widthRow);

  const visibilityLabel = document.createElement('div');
  visibilityLabel.className = 'fog-settings-label';
  visibilityLabel.textContent = 'Visibility';
  panel.appendChild(visibilityLabel);

  const visibilityRow = document.createElement('div');
  visibilityRow.className = 'fog-settings-row';
  const visibilityButtons = new Map<DrawStrokeVisibility, HTMLButtonElement>();
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

  function syncColor() {
    const active = optionsRef.current.color.toLowerCase();
    let matchedPreset = false;
    for (const [hex, btn] of colorButtons) {
      const isActive = hex.toLowerCase() === active;
      btn.classList.toggle('active', isActive);
      if (isActive) matchedPreset = true;
    }
    customColor.value = optionsRef.current.color;
    customColor.classList.toggle('active', !matchedPreset);
  }

  function syncWidth() {
    for (const [w, btn] of widthButtons) {
      btn.classList.toggle('active', w === optionsRef.current.width);
    }
  }

  function syncVisibility() {
    for (const [id, btn] of visibilityButtons) {
      btn.classList.toggle('active', id === optionsRef.current.visibility);
    }
  }

  function sync() {
    syncColor();
    syncWidth();
    syncVisibility();
  }

  function setVisible(toolId: string | null) {
    panel.style.display = toolId === 'draw' ? '' : 'none';
  }

  sync();
  setVisible(toolManager.getActive());
  toolManager.onChange(setVisible);
  container.appendChild(panel);
}

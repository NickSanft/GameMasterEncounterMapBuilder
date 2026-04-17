import type { FogOptionsRef, FogShape } from '../input/tool-fog.js';
import type { ToolManager } from '../input/tool-manager.js';

export function mountFogSettings(
  container: HTMLElement,
  optionsRef: FogOptionsRef,
  toolManager: ToolManager,
): void {
  const panel = document.createElement('div');
  panel.className = 'fog-settings';

  const shapes: Array<{ id: FogShape; label: string }> = [
    { id: 'rectangle', label: 'Rect' },
    { id: 'freehand', label: 'Free' },
  ];
  const sizes = [1, 2, 3];

  const shapeLabel = document.createElement('div');
  shapeLabel.className = 'fog-settings-label';
  shapeLabel.textContent = 'Shape';
  panel.appendChild(shapeLabel);

  const shapeRow = document.createElement('div');
  shapeRow.className = 'fog-settings-row';
  const shapeButtons = new Map<FogShape, HTMLButtonElement>();
  for (const s of shapes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.label;
    b.addEventListener('click', () => {
      optionsRef.current = { ...optionsRef.current, shape: s.id };
      syncButtons();
      b.blur();
    });
    shapeRow.appendChild(b);
    shapeButtons.set(s.id, b);
  }
  panel.appendChild(shapeRow);

  const sizeLabel = document.createElement('div');
  sizeLabel.className = 'fog-settings-label';
  sizeLabel.textContent = 'Brush';
  panel.appendChild(sizeLabel);

  const sizeRow = document.createElement('div');
  sizeRow.className = 'fog-settings-row';
  const sizeButtons = new Map<number, HTMLButtonElement>();
  for (const s of sizes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(s);
    b.addEventListener('click', () => {
      optionsRef.current = { ...optionsRef.current, brushSize: s };
      syncButtons();
      b.blur();
    });
    sizeRow.appendChild(b);
    sizeButtons.set(s, b);
  }
  panel.appendChild(sizeRow);

  function syncButtons() {
    for (const [id, btn] of shapeButtons) {
      btn.classList.toggle('active', id === optionsRef.current.shape);
    }
    for (const [size, btn] of sizeButtons) {
      btn.classList.toggle('active', size === optionsRef.current.brushSize);
    }
  }

  function syncVisibility(toolId: string | null) {
    const isFog = toolId === 'fog-reveal' || toolId === 'fog-hide';
    panel.style.display = isFog ? '' : 'none';
  }

  syncButtons();
  syncVisibility(toolManager.getActive());
  toolManager.onChange(syncVisibility);

  container.appendChild(panel);
}

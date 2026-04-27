/**
 * Phase 112 — Walls tool settings panel.
 *
 * Two-button mode toggle (Lines / Block) shown only while the Walls
 * tool is active. Lines mode = the original click-vertex chain
 * authoring path. Block mode = drag-a-rectangle that becomes a block
 * wall snapped to grid cells.
 *
 * Mirrors the shape of fog-settings / aoe-settings: a small `<div>`
 * with two `<button>` children that toggle an `optionsRef.current`
 * field. The Walls tool reads the ref on every pointerdown to pick
 * its behavior.
 */

import type { ToolManager } from '../input/tool-manager.js';
import type { WallsToolMode, WallsToolOptionsRef } from '../input/tool-walls.js';

export function mountWallsSettings(
  container: HTMLElement,
  optionsRef: WallsToolOptionsRef,
  toolManager: ToolManager,
): void {
  const panel = document.createElement('div');
  panel.className = 'walls-settings';

  const modes: Array<{ id: WallsToolMode; label: string; title: string }> = [
    { id: 'line', label: 'Lines', title: 'Click to drop vertices, chained as wall segments' },
    { id: 'block', label: 'Block', title: 'Drag to create a full-cell wall region' },
  ];

  const modeLabel = document.createElement('div');
  modeLabel.className = 'walls-settings-label';
  modeLabel.textContent = 'Mode';
  panel.appendChild(modeLabel);

  const modeRow = document.createElement('div');
  modeRow.className = 'walls-settings-row';
  const modeButtons = new Map<WallsToolMode, HTMLButtonElement>();
  for (const m of modes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = m.label;
    b.title = m.title;
    b.addEventListener('click', () => {
      optionsRef.current = { ...optionsRef.current, mode: m.id };
      syncButtons();
      b.blur();
    });
    modeRow.appendChild(b);
    modeButtons.set(m.id, b);
  }
  panel.appendChild(modeRow);

  // Phase 118 — snap-to-grid-edge toggle. Only meaningful in line
  // mode (block mode already snaps to cells by definition); the
  // checkbox stays available in both modes for muscle-memory but the
  // tool ignores it during block drags.
  const snapLabel = document.createElement('div');
  snapLabel.className = 'walls-settings-label';
  snapLabel.textContent = 'Snap';
  panel.appendChild(snapLabel);

  const snapRow = document.createElement('label');
  snapRow.className = 'walls-settings-snap';
  const snapInput = document.createElement('input');
  snapInput.type = 'checkbox';
  snapInput.dataset.field = 'snap-to-grid';
  snapInput.title = 'Snap line-mode vertices to the nearest cell corner';
  const snapText = document.createElement('span');
  snapText.textContent = 'Snap to grid';
  snapRow.appendChild(snapInput);
  snapRow.appendChild(snapText);
  snapRow.addEventListener('change', () => {
    optionsRef.current = { ...optionsRef.current, snapToGrid: snapInput.checked };
  });
  panel.appendChild(snapRow);

  function syncButtons() {
    for (const [id, btn] of modeButtons) {
      btn.classList.toggle('active', id === optionsRef.current.mode);
    }
    snapInput.checked = optionsRef.current.snapToGrid;
  }

  function syncVisibility(toolId: string | null) {
    panel.style.display = toolId === 'walls' ? '' : 'none';
  }

  syncButtons();
  syncVisibility(toolManager.getActive());
  toolManager.onChange(syncVisibility);

  container.appendChild(panel);
}

import type { RulerToolOptionsRef } from '../input/tool-measure.js';
import { RULER_PRESETS } from '../state/ruler.js';

export interface RulerSettingsHandle {
  /** Force the panel's active-button class to match the ref (after
   * external modifications, e.g. keyboard shortcuts). */
  sync(): void;
  /** Show/hide the panel without touching tool activation state. */
  setVisible(visible: boolean): void;
}

/**
 * Small panel that sits beside the toolbar while the Ruler tool is
 * active. Lets the GM pick a preset distance that clamps the ruler's
 * endpoint to a fixed radius from the start point.
 *
 * Visibility is controlled externally — GM uses its ToolManager hooks,
 * Spectator uses its simple `rulerActive` boolean. Keeping the panel
 * agnostic lets both entries share it.
 */
export function mountRulerSettings(
  container: HTMLElement,
  optionsRef: RulerToolOptionsRef,
): RulerSettingsHandle {
  const panel = document.createElement('div');
  panel.className = 'ruler-settings';

  const label = document.createElement('div');
  label.className = 'fog-settings-label';
  label.textContent = 'Preset';
  panel.appendChild(label);

  const row = document.createElement('div');
  row.className = 'fog-settings-row ruler-presets';
  const buttons = new Map<string, HTMLButtonElement>();
  for (const preset of RULER_PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = preset.label;
    b.title =
      preset.feet === null
        ? `Freeform — no clamp (${preset.shortcut})`
        : `Snap endpoint to ${preset.feet} ft (${preset.shortcut})`;
    b.addEventListener('click', () => {
      optionsRef.current = { ...optionsRef.current, targetFeet: preset.feet };
      sync();
      b.blur();
    });
    row.appendChild(b);
    buttons.set(preset.shortcut, b);
  }
  panel.appendChild(row);

  const hint = document.createElement('div');
  hint.className = 'ruler-hint';
  hint.textContent = 'Press 1–5 for presets, 0 for free.';
  panel.appendChild(hint);

  function sync() {
    for (const preset of RULER_PRESETS) {
      const btn = buttons.get(preset.shortcut);
      if (!btn) continue;
      btn.classList.toggle('active', preset.feet === optionsRef.current.targetFeet);
    }
  }

  function setVisible(visible: boolean) {
    panel.style.display = visible ? '' : 'none';
  }

  sync();
  // Hidden by default; caller flips it on when the Ruler tool activates.
  setVisible(false);

  container.appendChild(panel);

  return { sync, setVisible };
}

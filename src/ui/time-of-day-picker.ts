/**
 * Phase 80 — GM-side time-of-day picker.
 *
 * Mirrors `mountWeatherPicker` in shape: small inline `<select>`
 * pinned in the top strip. Picking a value dispatches a `time-set`
 * patch; the renderer + any connected Spectator pick up the change
 * via the normal patch sync.
 *
 * Spectators don't mount this — they're consumers only.
 */

import { TIME_LABELS } from '../state/time-of-day.js';
import type { TimeOfDay } from '../state/types.js';

const ORDERED: TimeOfDay[] = ['none', 'dawn', 'day', 'dusk', 'night'];

export interface TimeOfDayPickerHandle {
  setTime(time: TimeOfDay): void;
  getTime(): TimeOfDay;
  destroy(): void;
}

export interface TimeOfDayPickerOptions {
  onChange(time: TimeOfDay): void;
}

export function mountTimeOfDayPicker(
  opts: TimeOfDayPickerOptions,
): TimeOfDayPickerHandle {
  const wrap = document.createElement('div');
  wrap.className = 'time-picker';
  wrap.title = 'Time-of-day tint for the current scene';

  const label = document.createElement('label');
  label.htmlFor = 'time-picker-select';
  label.textContent = 'Time:';
  wrap.appendChild(label);

  const select = document.createElement('select');
  select.id = 'time-picker-select';
  select.setAttribute('aria-label', 'Time of day');
  for (const value of ORDERED) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = TIME_LABELS[value];
    select.appendChild(o);
  }
  wrap.appendChild(select);
  document.body.appendChild(wrap);

  let current: TimeOfDay = 'none';

  select.addEventListener('change', () => {
    const next = select.value as TimeOfDay;
    if (next === current) return;
    current = next;
    opts.onChange(next);
    select.blur();
  });

  return {
    setTime(time) {
      if (time === current) return;
      current = time;
      select.value = time;
    },
    getTime: () => current,
    destroy() {
      wrap.remove();
    },
  };
}

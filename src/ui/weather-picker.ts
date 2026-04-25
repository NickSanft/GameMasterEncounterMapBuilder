/**
 * Phase 79 — GM-side weather picker.
 *
 * Small inline `<select>` widget pinned in the top strip (next to
 * the scene indicator + save-status pill). Lets the GM pick the
 * active weather effect for the current scene; the overlay + any
 * connected Spectators react via the normal patch sync.
 *
 * Spectators do NOT mount this — they're consumers, not authors.
 */

import type { WeatherKind } from '../state/types.js';

const OPTIONS: Array<{ value: WeatherKind; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'rain', label: 'Rain' },
  { value: 'snow', label: 'Snow' },
  { value: 'fog', label: 'Fog' },
];

export interface WeatherPickerHandle {
  /** Reflect external state changes (e.g. another tab toggled it). */
  setWeather(kind: WeatherKind): void;
  /** Test / debug — current selected value. */
  getWeather(): WeatherKind;
  destroy(): void;
}

export interface WeatherPickerOptions {
  onChange(kind: WeatherKind): void;
}

export function mountWeatherPicker(
  opts: WeatherPickerOptions,
): WeatherPickerHandle {
  const wrap = document.createElement('div');
  wrap.className = 'weather-picker';
  wrap.title = 'Atmospheric weather effect for the current scene';

  const label = document.createElement('label');
  label.htmlFor = 'weather-picker-select';
  label.textContent = 'Weather:';
  wrap.appendChild(label);

  const select = document.createElement('select');
  select.id = 'weather-picker-select';
  select.setAttribute('aria-label', 'Weather effect');
  for (const opt of OPTIONS) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    select.appendChild(o);
  }
  wrap.appendChild(select);
  document.body.appendChild(wrap);

  let current: WeatherKind = 'none';

  select.addEventListener('change', () => {
    const next = select.value as WeatherKind;
    if (next === current) return;
    current = next;
    opts.onChange(next);
    select.blur();
  });

  return {
    setWeather(kind) {
      if (kind === current) return;
      current = kind;
      select.value = kind;
    },
    getWeather: () => current,
    destroy() {
      wrap.remove();
    },
  };
}

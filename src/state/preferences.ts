import { PREFERENCES_KEY } from '../util/constants.js';
import type { DiagonalRule, DistanceUnit } from './distance.js';

export type LabelSize = 'small' | 'medium' | 'large';
export type Theme = 'dark' | 'light';

export type { DiagonalRule, DistanceUnit };

export interface Preferences {
  theme: Theme;
  persistCamera: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  labelSize: LabelSize;
  colorblindMarkers: boolean;
  gmFogColor: string;
  gmFogOpacity: number;
  followGmCamera: boolean;
  broadcastCamera: boolean;
  showDiagnostics: boolean;
  showSpectatorViewport: boolean;
  /** Unit used in the movement-remaining indicator. */
  distanceUnit: DistanceUnit;
  /** Feet per grid square (5e default: 5). Used when distanceUnit = 'feet'. */
  feetPerSquare: number;
  /** How diagonals are counted when computing movement distance. */
  diagonalRule: DiagonalRule;
  /** Show A–Z column + 1–N row labels along the grid gutters. */
  showGridLabels: boolean;
  /** Scene-lighting tint color (applied as a semi-transparent overlay). */
  sceneLightColor: string;
  /** Scene-lighting opacity, 0..1. 0 = fully lit (no tint). */
  sceneLightOpacity: number;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: 'dark',
  persistCamera: true,
  reducedMotion: false,
  highContrast: false,
  labelSize: 'medium',
  colorblindMarkers: false,
  gmFogColor: '#ff0000',
  gmFogOpacity: 0.35,
  followGmCamera: false,
  broadcastCamera: false,
  showDiagnostics: false,
  showSpectatorViewport: false,
  distanceUnit: 'squares',
  feetPerSquare: 5,
  diagonalRule: 'chebyshev',
  showGridLabels: false,
  sceneLightColor: '#0a0530',
  sceneLightOpacity: 0,
};

export interface PreferencesStore {
  get(): Preferences;
  update(changes: Partial<Preferences>): void;
  reset(): void;
  subscribe(listener: (prefs: Preferences) => void): () => void;
}

export function createPreferences(): PreferencesStore {
  let prefs = loadFromStorage();
  const listeners = new Set<(p: Preferences) => void>();

  function save() {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (err) {
      console.warn('[preferences] save failed', err);
    }
  }

  function notify() {
    for (const l of listeners) l(prefs);
  }

  // Cross-tab sync — the browser fires a `storage` event in *other*
  // tabs (not the tab that made the write) whenever localStorage
  // changes for our origin. Re-reading our key on that signal means
  // the Spectator tab picks up the GM's preference edits live (e.g.
  // Scene lighting) without needing a reload.
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== PREFERENCES_KEY) return;
      const next = loadFromStorage();
      const before = prefs;
      prefs = next;
      // Skip a notify when the reload produced an identical blob
      // (defensive — browsers occasionally fire spurious events).
      if (JSON.stringify(before) === JSON.stringify(next)) return;
      notify();
    });
  }

  return {
    get: () => prefs,
    update(changes: Partial<Preferences>) {
      prefs = { ...prefs, ...changes };
      save();
      notify();
    },
    reset() {
      prefs = systemDefaults();
      save();
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function loadFromStorage(): Preferences {
  const defaults = systemDefaults();
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...defaults, ...parsed };
  } catch (err) {
    console.warn('[preferences] load failed', err);
    return defaults;
  }
}

function systemDefaults(): Preferences {
  const reducedMotion = typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    : false;
  return { ...DEFAULT_PREFERENCES, reducedMotion };
}

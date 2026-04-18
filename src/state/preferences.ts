import { PREFERENCES_KEY } from '../util/constants.js';

export type LabelSize = 'small' | 'medium' | 'large';
export type Theme = 'dark' | 'light';

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

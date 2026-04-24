import { PREFERENCES_KEY } from '../util/constants.js';
import type { DiagonalRule, DistanceUnit } from './distance.js';

export type LabelSize = 'small' | 'medium' | 'large';
/**
 * Visual theme. The original `'dark'` and `'light'` themes are the
 * sober defaults; Phase 59 adds three flavored variants for table
 * mood-setting:
 *   - `'parchment'` — warm sepia / cream, dark-brown ink. Reads like
 *     an old hand-drawn map.
 *   - `'console'` — terminal green-on-black, for sci-fi / cyberpunk
 *     campaigns.
 *   - `'purple-dusk'` — deep midnight purple with lavender accents,
 *     for moodier sessions.
 *
 * Theme switching is purely visual — same layout, same components,
 * same canvas math; only the CSS variable palette + a few canvas
 * fill colors change.
 */
export type Theme = 'dark' | 'light' | 'parchment' | 'console' | 'purple-dusk';

/**
 * Every theme value, in display order. Used by the Settings UI to
 * render the picker without duplicating the list.
 */
export const ALL_THEMES: readonly Theme[] = [
  'dark',
  'light',
  'parchment',
  'console',
  'purple-dusk',
];

/**
 * Human-readable label for each theme — single source of truth for
 * the picker UI + the help overlay.
 */
export const THEME_LABELS: Record<Theme, string> = {
  dark: 'Dark',
  light: 'Light',
  parchment: 'Parchment',
  console: 'Console',
  'purple-dusk': 'Purple Dusk',
};
/**
 * Dynamic line-of-sight mode.
 *   - `'off'` — fog is driven entirely by the GM's manual Reveal / Hide
 *     tool. Viewer tokens' `losRadius` is ignored. Backward-compatible
 *     behavior for Phases 32–54.
 *   - `'revealed-and-visible'` — Spectator fog shows a cell iff (a) the
 *     GM has revealed it manually AND (b) at least one viewer token's
 *     visibility polygon covers it. Turns walls + `losRadius` into a
 *     dynamic "who can see what right now" layer.
 */
export type LosMode = 'off' | 'revealed-and-visible';

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
  /** Show the floating bottom-right mini-map. */
  showMiniMap: boolean;
  /** Dynamic line-of-sight mode (see LosMode for semantics). */
  losMode: LosMode;
  /**
   * Phase 58 — "Follow-the-fog" exploration mode. When true (and
   * `losMode !== 'off'`), every fresh viewer line-of-sight polygon
   * also paints `revealed=1` into the manual fog buffer for any cell
   * inside the polygon that wasn't already revealed. Effect: a
   * viewer token walking onto unrevealed terrain auto-uncovers the
   * cells it can see, without the GM having to reach for the Reveal
   * tool. One-way (never re-hides), so the GM can still paint over
   * with the Hide tool if they want to obscure something post-hoc.
   *
   * Default `false` so existing maps don't suddenly get auto-revealed
   * on first boot of 0.58.
   */
  autoRevealFromViewers: boolean;
  /**
   * Phase 60 — voice transcription → notes. When true, a 🎤 button
   * appears in the Session Notes panel header; clicking it starts
   * the browser's SpeechRecognition pipeline and appends finalized
   * transcripts to the notes textarea. Default true (it's a privacy-
   * neutral default — the mic only activates when the user clicks
   * the button), but the toggle is exposed in Settings → Accessibility
   * for users who want to suppress the button entirely on shared
   * devices or never-mic-please setups.
   *
   * The mic button is also automatically hidden when the browser
   * doesn't expose `SpeechRecognition` (Firefox today) — this pref
   * only controls the show/hide behavior on supported browsers.
   */
  voiceTranscription: boolean;
  /**
   * Phase 61 — onboarding tour completion flag. Set to `true` once
   * the user has either finished or skipped the tour. While `false`,
   * the GM entry auto-opens the tour on boot. Users can replay the
   * tour anytime from the session menu's "Take the tour" entry — that
   * doesn't reset this flag (it just opens the modal again).
   *
   * Default `false` so first-time users see the walk-through; users
   * upgrading from < 0.61 also see it once because the spread-defaults
   * loadFromStorage path treats missing keys as the default value.
   */
  onboardingComplete: boolean;
  // Phase 67 — `playerNameGm`, `playerNameSpectator`,
  // `playerColorGm`, `playerColorSpectator` moved out of Preferences
  // into the dedicated `IdentityPrefsStore` (`state/identity-prefs.ts`).
  // The legacy keys are auto-migrated on first read of the new
  // store. Preferences now sticks to its original purpose: settings
  // that should be the same across both views in one browser.
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
  showMiniMap: false,
  losMode: 'off',
  autoRevealFromViewers: false,
  voiceTranscription: true,
  onboardingComplete: false,
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

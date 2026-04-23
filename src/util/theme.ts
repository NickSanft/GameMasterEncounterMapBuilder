/**
 * Body-class application for the visual theme (Phase 59).
 *
 * Themes are expressed in CSS as `body.theme-<name>` blocks; the
 * default (`dark`) is the `:root` baseline so it doesn't need a class.
 * `applyTheme` removes any prior `theme-*` class then adds the one
 * for the current preference — handles both first-paint and live
 * preference edits correctly.
 *
 * Lives in `util/` (not in either entry) so the GM and Spectator
 * paths can't drift apart on which theme classes they apply.
 */

import type { Theme } from '../state/preferences.js';
import { ALL_THEMES } from '../state/preferences.js';

/**
 * Set the body's theme class based on the supplied preference. The
 * default (`dark`) gets no class — the `:root` block in styles.css
 * is the baseline. Any other theme gets a `theme-<name>` class with
 * the previous theme class (if any) cleared first.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  for (const t of ALL_THEMES) {
    document.body.classList.remove(`theme-${t}`);
  }
  if (theme !== 'dark') {
    document.body.classList.add(`theme-${theme}`);
  }
}

/**
 * Phase 76 — auto-save indicator pill.
 *
 * Tiny floating chip (top-left, after the scene indicator) that
 * surfaces persistence status in real time. Four states:
 *
 *   - **idle**:    hidden. The default between saves.
 *   - **saving**:  visible with a "Saving…" label + spinner. Shown
 *                  while `saveState()` is in flight.
 *   - **saved**:   visible with a "Saved" label + ✓. Auto-fades back
 *                  to **idle** after ~1500 ms so the chrome stays
 *                  uncluttered when nothing's happening.
 *   - **error**:   visible with a "Save failed" label + ⚠. Sticky
 *                  until the next 'saving' transition — the user
 *                  needs to actually see this so they know their
 *                  recent edits aren't safe.
 *
 * Stateless on the wire — purely a local UI mirror of the persist
 * promise. No remote sync, no per-peer state.
 */

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const SAVED_HOLD_MS = 1500;
const SAVED_FADE_MS = 200;

export interface SaveStatusPillHandle {
  setStatus(status: SaveStatus): void;
  /** Test / debug hook — read the current visible state. */
  getStatus(): SaveStatus;
  destroy(): void;
}

export function mountSaveStatusPill(): SaveStatusPillHandle {
  const pill = document.createElement('div');
  pill.className = 'save-status-pill';
  pill.setAttribute('role', 'status');
  pill.setAttribute('aria-live', 'polite');
  pill.dataset.status = 'idle';
  pill.hidden = true;

  // Children: an icon span + a label span. We update both in setStatus.
  const icon = document.createElement('span');
  icon.className = 'save-status-icon';
  icon.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'save-status-label';

  pill.appendChild(icon);
  pill.appendChild(label);
  document.body.appendChild(pill);

  let status: SaveStatus = 'idle';
  let savedHideTimer: number | null = null;

  function clearSavedTimer() {
    if (savedHideTimer !== null) {
      window.clearTimeout(savedHideTimer);
      savedHideTimer = null;
    }
  }

  function applyStatus(s: SaveStatus): void {
    status = s;
    pill.dataset.status = s;
    if (s === 'idle') {
      pill.hidden = true;
      label.textContent = '';
      icon.textContent = '';
      return;
    }
    pill.hidden = false;
    if (s === 'saving') {
      icon.textContent = '⟳';
      label.textContent = 'Saving…';
    } else if (s === 'saved') {
      icon.textContent = '✓';
      label.textContent = 'Saved';
    } else {
      icon.textContent = '⚠';
      label.textContent = 'Save failed';
    }
  }

  function setStatus(next: SaveStatus): void {
    clearSavedTimer();
    if (next === 'saved') {
      applyStatus('saved');
      // After the hold, fade back to idle. We DON'T add a fade
      // animation class — the simple `hidden` toggle is enough; the
      // CSS can give it a brief opacity transition if desired.
      savedHideTimer = window.setTimeout(() => {
        // Only fade out if we're STILL on 'saved'. If a fresh
        // 'saving' arrived during the hold, applyStatus already
        // ran and we shouldn't clobber it.
        if (status === 'saved') applyStatus('idle');
        savedHideTimer = null;
      }, SAVED_HOLD_MS + SAVED_FADE_MS);
      return;
    }
    applyStatus(next);
  }

  return {
    setStatus,
    getStatus: () => status,
    destroy() {
      clearSavedTimer();
      pill.remove();
    },
  };
}

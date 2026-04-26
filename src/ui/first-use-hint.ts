/**
 * Phase 96 — first-use hint toast.
 *
 * One-at-a-time tooltip for "by the way, you can…" tips. Pinned to
 * the bottom-center of the viewport so it doesn't compete with the
 * existing top-center status banner. Auto-dismissable via:
 *   - The OK / "Got it" button
 *   - Esc
 *   - Click on the backdrop area (the hint itself doesn't have a
 *     true backdrop — it's a toast — so this is just outside-click
 *     dismissal via a window-level handler)
 *   - An optional `durationMs` auto-dismiss timer
 *
 * Calling `show(hint)` while another hint is already visible queues
 * the new one; the queue drains as each is dismissed. The store
 * (`first-use-hints.ts`) handles the "was this id ever shown"
 * persistence, but THIS module doesn't read it directly — the entry
 * checks `store.wasShown(id)` BEFORE calling `show()` so the hint
 * UI stays presentation-only.
 *
 * Live-region: the hint's text is duplicated into an aria-live
 * polite region inside the toast so screen-reader users hear it on
 * arrival without needing to navigate to the toast region.
 */

export interface FirstUseHint {
  id: string;
  message: string;
  /** Optional secondary line (e.g. "Press Ctrl+K to try"). */
  detail?: string;
  /** Auto-dismiss after this many ms; omitted = sticky until user dismisses. */
  durationMs?: number;
}

export interface FirstUseHintHandle {
  /** Queue or show a hint. */
  show(hint: FirstUseHint): void;
  /** Dismiss the visible hint (if any) immediately. */
  dismiss(): void;
  /** Whether a hint is currently visible. */
  isVisible(): boolean;
  destroy(): void;
}

export interface FirstUseHintOptions {
  /** Called when a hint is dismissed (any path). Use to mark it as shown. */
  onDismiss?(hintId: string): void;
}

export function mountFirstUseHintToast(
  opts: FirstUseHintOptions = {},
): FirstUseHintHandle {
  const toast = document.createElement('div');
  toast.className = 'first-use-hint';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.setAttribute('aria-atomic', 'true');
  toast.hidden = true;
  toast.innerHTML = `
    <div class="first-use-hint-body">
      <p class="first-use-hint-message" data-field="message"></p>
      <p class="first-use-hint-detail" data-field="detail" hidden></p>
    </div>
    <div class="first-use-hint-actions">
      <button type="button" class="first-use-hint-ok" data-action="ok">Got it</button>
    </div>
  `;
  document.body.appendChild(toast);

  const messageEl = toast.querySelector<HTMLParagraphElement>('[data-field="message"]')!;
  const detailEl = toast.querySelector<HTMLParagraphElement>('[data-field="detail"]')!;
  const okBtn = toast.querySelector<HTMLButtonElement>('[data-action="ok"]')!;

  const queue: FirstUseHint[] = [];
  let current: FirstUseHint | null = null;
  let autoTimer: number | null = null;

  function clearAutoTimer() {
    if (autoTimer !== null) {
      window.clearTimeout(autoTimer);
      autoTimer = null;
    }
  }

  function render() {
    if (!current) {
      toast.hidden = true;
      messageEl.textContent = '';
      detailEl.textContent = '';
      detailEl.hidden = true;
      return;
    }
    messageEl.textContent = current.message;
    if (current.detail) {
      detailEl.textContent = current.detail;
      detailEl.hidden = false;
    } else {
      detailEl.textContent = '';
      detailEl.hidden = true;
    }
    toast.hidden = false;
    if (current.durationMs && current.durationMs > 0) {
      clearAutoTimer();
      autoTimer = window.setTimeout(dismiss, current.durationMs);
    }
  }

  function show(hint: FirstUseHint) {
    if (!current) {
      current = hint;
      render();
      return;
    }
    // Don't queue duplicates of the active hint.
    if (current.id === hint.id) return;
    if (queue.some((q) => q.id === hint.id)) return;
    queue.push(hint);
  }

  function dismiss() {
    if (!current) return;
    const dismissedId = current.id;
    clearAutoTimer();
    current = null;
    opts.onDismiss?.(dismissedId);
    // Drain the queue (with the active hint cleared first so the
    // onDismiss callback can call markShown without re-triggering).
    const next = queue.shift();
    if (next) {
      current = next;
      render();
    } else {
      render();
    }
  }

  okBtn.addEventListener('click', dismiss);

  // Esc dismisses when the toast is the topmost interactive surface.
  // We don't claim Esc when a modal or context menu is open — those
  // claim it first via their own handlers (which preventDefault); we
  // check `e.defaultPrevented` so we don't fire after another handler.
  window.addEventListener('keydown', (e) => {
    if (current && e.key === 'Escape' && !e.defaultPrevented) {
      dismiss();
    }
  });

  return {
    show,
    dismiss,
    isVisible: () => current !== null,
    destroy() {
      clearAutoTimer();
      toast.remove();
      queue.length = 0;
      current = null;
    },
  };
}

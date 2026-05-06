/**
 * Phase 175 — toast stack with optional undo action.
 *
 * Mounts a fixed-position container at the bottom-right that
 * stacks transient notifications. Each toast has a message,
 * optional `Undo` (or other) action button, and auto-dismisses
 * after `durationMs` (default 5 s — long enough for the user to
 * react to "Deleted 3 tokens" with an undo click). Earlier
 * toasts shift up as new ones arrive; the stack caps at
 * `MAX_VISIBLE` so a burst of patches doesn't fill the screen.
 *
 * Style: small horizontal pills with the action right-aligned.
 * Uses CSS variables (--surface, --fg, --accent) so it adapts to
 * all 5 themes.
 */

const MAX_VISIBLE = 5;
const DEFAULT_DURATION_MS = 5000;

export interface ToastSpec {
  message: string;
  /** Optional action button label (e.g. "Undo"). Omit for info-only toasts. */
  actionLabel?: string;
  /** Fired when the user clicks the action button. */
  onAction?: () => void;
  /** Auto-dismiss delay in ms. Defaults to 5000. Set 0 for sticky. */
  durationMs?: number;
}

export interface ToastStackHandle {
  show(spec: ToastSpec): void;
  /** Dismiss every visible toast immediately. */
  clear(): void;
}

export function mountToastStack(): ToastStackHandle {
  const container = document.createElement('div');
  container.className = 'toast-stack';
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  document.body.appendChild(container);

  const liveToasts: Array<{ el: HTMLElement; timer: number | null }> = [];

  function dismiss(entry: { el: HTMLElement; timer: number | null }): void {
    if (entry.timer !== null) {
      window.clearTimeout(entry.timer);
      entry.timer = null;
    }
    // Slide-out animation; remove after the CSS transition.
    entry.el.classList.add('toast-leaving');
    window.setTimeout(() => entry.el.remove(), 200);
    const idx = liveToasts.indexOf(entry);
    if (idx >= 0) liveToasts.splice(idx, 1);
  }

  function show(spec: ToastSpec): void {
    // Cap visible — drop the OLDEST when full so the newest is
    // always visible.
    while (liveToasts.length >= MAX_VISIBLE) {
      const oldest = liveToasts[0]!;
      dismiss(oldest);
    }

    const el = document.createElement('div');
    el.className = 'toast';

    const msg = document.createElement('span');
    msg.className = 'toast-message';
    msg.textContent = spec.message;
    el.appendChild(msg);

    const entry: { el: HTMLElement; timer: number | null } = {
      el,
      timer: null,
    };

    if (spec.actionLabel && spec.onAction) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'toast-action';
      btn.textContent = spec.actionLabel;
      btn.addEventListener('click', () => {
        spec.onAction?.();
        dismiss(entry);
      });
      el.appendChild(btn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast-close';
    closeBtn.setAttribute('aria-label', 'Dismiss notification');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => dismiss(entry));
    el.appendChild(closeBtn);

    container.appendChild(el);
    liveToasts.push(entry);

    const duration = spec.durationMs ?? DEFAULT_DURATION_MS;
    if (duration > 0) {
      entry.timer = window.setTimeout(() => dismiss(entry), duration);
    }
  }

  function clear(): void {
    while (liveToasts.length > 0) dismiss(liveToasts[0]!);
  }

  return { show, clear };
}

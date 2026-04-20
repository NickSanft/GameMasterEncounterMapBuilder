/**
 * A very small wrapper around a single status-banner element pinned to
 * the top-center of the viewport. Used for conflict-detection warnings
 * ("Another GM tab is open") and crash-recovery notices ("Restored
 * from autosave"). The same element is reused for both so at most one
 * banner is visible at a time — conflicts take precedence.
 */

export type BannerVariant = 'warn' | 'info';

export interface BannerShowOptions {
  message: string;
  variant?: BannerVariant;
  /** When true, renders a "Dismiss" button. */
  dismissible?: boolean;
  /** Called when the user clicks Dismiss. */
  onDismiss?(): void;
}

export interface StatusBannersHandle {
  /** Show or replace the current banner. */
  show(opts: BannerShowOptions): void;
  /** Hide the banner. */
  hide(): void;
  /** Whether a banner is currently visible. */
  isVisible(): boolean;
}

export function mountStatusBanners(): StatusBannersHandle {
  const banner = document.createElement('div');
  banner.className = 'status-banner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.hidden = true;
  banner.innerHTML = `
    <span class="status-banner-msg" data-field="msg"></span>
    <button type="button" class="status-banner-dismiss" data-action="dismiss" hidden>Dismiss</button>
  `;
  document.body.appendChild(banner);

  const msgEl = banner.querySelector<HTMLSpanElement>('[data-field="msg"]')!;
  const dismissBtn = banner.querySelector<HTMLButtonElement>('[data-action="dismiss"]')!;

  let dismissHandler: (() => void) | null = null;

  dismissBtn.addEventListener('click', () => {
    dismissHandler?.();
  });

  function show(opts: BannerShowOptions): void {
    msgEl.textContent = opts.message;
    banner.classList.remove('status-banner-warn', 'status-banner-info');
    banner.classList.add(`status-banner-${opts.variant ?? 'warn'}`);
    dismissBtn.hidden = !opts.dismissible;
    dismissHandler = opts.onDismiss ?? null;
    banner.hidden = false;
  }

  function hide(): void {
    banner.hidden = true;
    dismissHandler = null;
  }

  return {
    show,
    hide,
    isVisible: () => !banner.hidden,
  };
}

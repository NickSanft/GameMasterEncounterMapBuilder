/**
 * Phase 172 — PWA install-prompt + offline-hint UI.
 *
 * Two behaviors live in this small mount:
 *   1. **Install hint.** When Chrome / Edge fires
 *      `beforeinstallprompt`, we show a small dismissible card in
 *      the bottom-right inviting the user to install. Click
 *      "Install" → the cached event's `prompt()` triggers the
 *      browser's native install flow. Click "Not now" → we set a
 *      persistent flag so the card doesn't reappear on future
 *      boots. The card auto-hides after a successful install.
 *   2. **Offline banner.** Listens to `online` / `offline` window
 *      events. Shows a small toast when offline so the GM knows
 *      remote-play sync won't reach Spectators (they're cached
 *      locally; resume on reconnect). Hides on reconnect.
 *
 * Designed to be minimally intrusive — both surfaces are
 * dismissible / auto-hiding, and the install hint only shows once
 * per opt-out (or until the user dismisses again after clearing
 * the flag).
 */

const INSTALL_DISMISS_KEY = 'gm-encounter-maps-pwa-install-dismissed';

/**
 * `beforeinstallprompt` is non-standard but supported in
 * Chromium-based browsers. We type it minimally — the only
 * methods we use are `preventDefault()` (block the auto-prompt
 * so we control timing) and `prompt()` (open the native flow on
 * user gesture).
 */
interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

export interface PwaInstallHintHandle {
  /** Hide both surfaces + remove all listeners. */
  destroy(): void;
}

export function mountPwaInstallHint(): PwaInstallHintHandle {
  // ─── Install hint ──────────────────────────────────────────────
  let cachedPrompt: BeforeInstallPromptEvent | null = null;
  const card = document.createElement('div');
  card.className = 'pwa-install-hint';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Install GM Encounter Maps as an app');
  card.hidden = true;
  card.innerHTML = `
    <div class="pwa-install-hint-body">
      <strong>Install as an app?</strong>
      <p>Faster boot + offline support. You can always uninstall later.</p>
    </div>
    <div class="pwa-install-hint-actions">
      <button type="button" class="pwa-install-hint-dismiss">Not now</button>
      <button type="button" class="pwa-install-hint-accept">Install</button>
    </div>
  `;
  const acceptBtn = card.querySelector<HTMLButtonElement>(
    '.pwa-install-hint-accept',
  )!;
  const dismissBtn = card.querySelector<HTMLButtonElement>(
    '.pwa-install-hint-dismiss',
  )!;
  document.body.appendChild(card);

  function showInstallHint(): void {
    if (localStorage.getItem(INSTALL_DISMISS_KEY) === 'true') return;
    if (!cachedPrompt) return;
    card.hidden = false;
  }

  function hideInstallHint(): void {
    card.hidden = true;
  }

  function onBeforeInstallPrompt(e: Event): void {
    // Block the browser's automatic mini-bar so we control timing.
    e.preventDefault();
    cachedPrompt = e as BeforeInstallPromptEvent;
    showInstallHint();
  }

  function onAppInstalled(): void {
    cachedPrompt = null;
    hideInstallHint();
  }

  acceptBtn.addEventListener('click', () => {
    if (!cachedPrompt) {
      hideInstallHint();
      return;
    }
    void cachedPrompt.prompt();
    void cachedPrompt.userChoice.then(() => {
      cachedPrompt = null;
      hideInstallHint();
    });
  });

  dismissBtn.addEventListener('click', () => {
    try {
      localStorage.setItem(INSTALL_DISMISS_KEY, 'true');
    } catch {
      /* ignore quota / storage errors */
    }
    hideInstallHint();
  });

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);

  // ─── Offline banner ────────────────────────────────────────────
  const offlineBanner = document.createElement('div');
  offlineBanner.className = 'pwa-offline-banner';
  offlineBanner.setAttribute('role', 'status');
  offlineBanner.setAttribute('aria-live', 'polite');
  offlineBanner.textContent = 'Offline — changes saved locally.';
  offlineBanner.hidden = true;
  document.body.appendChild(offlineBanner);

  function syncOnlineStatus(): void {
    offlineBanner.hidden = navigator.onLine;
  }

  window.addEventListener('online', syncOnlineStatus);
  window.addEventListener('offline', syncOnlineStatus);
  // Initial state — when the page boots offline, show immediately.
  syncOnlineStatus();

  return {
    destroy() {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      window.removeEventListener('online', syncOnlineStatus);
      window.removeEventListener('offline', syncOnlineStatus);
      card.remove();
      offlineBanner.remove();
    },
  };
}

/**
 * Service-worker registration + update detection.
 *
 * Separated from the entry point so unit tests can exercise the pure
 * control flow (state transitions, onUpdateReady firing) without
 * touching `navigator.serviceWorker` directly.
 */

export interface PwaRegisterOptions {
  /**
   * URL of the service worker script, relative to the current document
   * base (Vite rewrites this at build time via `import.meta.env.BASE_URL`
   * in the entry — pass the resolved URL in). Defaults to `./sw.js`.
   */
  swUrl?: string;
  /**
   * Called when a new SW has installed and is waiting to activate.
   * The handler gets a `reload()` fn that tells the waiting SW to
   * `skipWaiting()` + reloads the page when it takes over.
   */
  onUpdateReady?(reload: () => void): void;
  /**
   * Called on the first successful install (no prior SW). Useful for
   * surfacing "App installed and ready offline" toasts.
   */
  onOfflineReady?(): void;
}

export interface PwaHandle {
  /** True when a SW is currently registered for the page. */
  isRegistered(): boolean;
  /**
   * Force check for a new SW immediately. Returns the ServiceWorker
   * registration promise (or null if unsupported).
   */
  update(): Promise<ServiceWorkerRegistration | null>;
}

/**
 * Register the service worker. Safe to call multiple times; only the
 * first call attaches listeners.
 *
 * In environments without `navigator.serviceWorker` (tests, older
 * browsers, insecure contexts) this is a no-op and returns a handle
 * whose `isRegistered()` is false.
 */
export function registerPwa(options: PwaRegisterOptions = {}): PwaHandle {
  const { swUrl = './sw.js', onUpdateReady, onOfflineReady } = options;

  // Opt out of SW registration in dev / non-secure contexts — the
  // registration call throws in `http:` and we don't want
  // dev-server hot-reload to fight with the SW cache.
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !window.isSecureContext
  ) {
    return {
      isRegistered: () => false,
      update: async () => null,
    };
  }

  let registration: ServiceWorkerRegistration | null = null;
  let settled = false;

  const register = async () => {
    try {
      registration = await navigator.serviceWorker.register(swUrl);
      settled = true;
      if (!navigator.serviceWorker.controller && onOfflineReady) {
        // First-ever install (page hasn't been taken over yet).
        onOfflineReady();
      }
      attachUpdateListeners(registration, onUpdateReady);
      // Reload once the waiting worker becomes the controller so the
      // page starts hitting the new bundle immediately.
      attachControllerChange();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[pwa] SW registration failed', err);
    }
  };

  // Registering on `load` avoids competing with the initial page
  // paint + resource fetches.
  if (document.readyState === 'complete') {
    void register();
  } else {
    window.addEventListener('load', () => void register(), { once: true });
  }

  return {
    isRegistered: () => settled,
    update: async () => {
      if (!registration) return null;
      await registration.update();
      return registration;
    },
  };
}

/** Attach listeners that fire `onUpdateReady` when a new SW is waiting. */
export function attachUpdateListeners(
  registration: ServiceWorkerRegistration,
  onUpdateReady?: PwaRegisterOptions['onUpdateReady'],
): void {
  if (!onUpdateReady) return;

  function notify() {
    if (!registration.waiting) return;
    const waiting = registration.waiting;
    onUpdateReady?.(() => {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    });
  }

  // Case 1: a waiting worker already exists on registration (the user
  // left the tab open across a deploy).
  if (registration.waiting) notify();

  // Case 2: a new worker starts installing after we registered — fire
  // once it reaches the "installed" state, meaning it's ready to take
  // over on next navigation.
  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        notify();
      }
    });
  });
}

let controllerChangeAttached = false;

/**
 * Reload the page when the active service worker is REPLACED.
 *
 * We only fire a reload when there was already a controller at the
 * moment we attached — i.e. an update. The first-ever install also
 * fires `controllerchange` (because `clients.claim()` in the SW's
 * activate handler takes over a previously-uncontrolled page), but we
 * explicitly ignore that one so new visitors don't see their page
 * reload at boot.
 */
export function attachControllerChange(): void {
  if (controllerChangeAttached) return;
  controllerChangeAttached = true;
  const hadController = !!navigator.serviceWorker.controller;
  if (!hadController) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

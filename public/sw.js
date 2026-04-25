/* eslint-disable no-restricted-globals */
/**
 * GM Encounter Maps — service worker.
 *
 * Strategy:
 *  - Precache the app shell (the three HTML entries, manifest, favicon)
 *    so the app boots offline after a single successful visit.
 *  - Runtime-cache hashed assets (CSS / JS / fonts / images) with a
 *    stale-while-revalidate policy: serve the cached copy immediately,
 *    then fetch in the background and update the cache for next time.
 *  - Network-first for anything we can't safely cache (preset background
 *    images fetched on-demand, BroadcastChannel traffic is in-memory so
 *    not relevant here).
 *
 * Versioning:
 *  - Bump `APP_VERSION` each phase. A new SW is installed, and on
 *    activate it deletes any cache not matching the current version.
 *  - The registration code in `src/util/pwa.ts` listens for a waiting
 *    SW and surfaces an "update available" banner; clicking it posts
 *    {type: 'SKIP_WAITING'} so the new worker takes over + the page
 *    reloads.
 */

const APP_VERSION = '0.78.0';
const PRECACHE = `gm-maps-precache-${APP_VERSION}`;
const RUNTIME = `gm-maps-runtime-${APP_VERSION}`;

// The scope resolves to the directory the SW lives in. Both GitHub Pages
// (`/GameMasterEncounterMapBuilder/`) and `vite preview` (same path under
// the dev port) share the base, so we construct absolute URLs relative
// to the SW file. `new URL('./x', location)` handles that correctly.
const PRECACHE_URLS = [
  './',
  './index.html',
  './gm.html',
  './spectator.html',
  './favicon.svg',
  './manifest.webmanifest',
].map((p) => new URL(p, self.location.href).toString());

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // `addAll` is atomic — if any entry fails, install fails. Use
      // individual adds so a transient 404 on one icon doesn't kill the
      // whole install.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(url);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[sw] precache failed for', url, err);
          }
        }),
      );
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const keep = new Set([PRECACHE, RUNTIME]);
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/**
 * Message channel: the page calls `postMessage({type: 'SKIP_WAITING'})`
 * after the user clicks "Reload to update" — we skip the wait + the
 * activate handler above will claim all open clients.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only handle same-origin traffic — external fetches (CORS) pass
  // through unchanged so we never accidentally break them.
  if (url.origin !== self.location.origin) return;

  // HTML navigations: network-first so users see new releases as soon
  // as they come online, with a cache fallback for full offline support.
  if (
    request.mode === 'navigate' ||
    (request.headers.get('accept') ?? '').includes('text/html')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else (JS, CSS, images, fonts): stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    // Last-ditch: serve the root shell so the SPA-like startup still runs.
    const shell = await caches.match('./', { ignoreSearch: true });
    if (shell) return shell;
    return new Response('Offline and no cached page available.', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  // Return cached hit immediately when we have one; otherwise wait on
  // the network.
  return cached ?? (await networkFetch) ?? new Response('', { status: 504 });
}

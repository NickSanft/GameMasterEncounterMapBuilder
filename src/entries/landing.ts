// The landing page is static HTML + CSS. The only script work here is
// registering the PWA service worker so the app installs + caches
// itself on the first visit.
import { registerPwa } from '../util/pwa.js';

registerPwa();

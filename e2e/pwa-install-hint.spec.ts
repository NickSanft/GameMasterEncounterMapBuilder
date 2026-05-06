/**
 * Phase 172 — PWA install hint + offline banner smoke.
 *
 * The install hint only appears when the browser fires
 * `beforeinstallprompt`, which is Chromium-only. We can't fire
 * that synthetically without registering the manifest, so the e2e
 * focuses on the offline-banner path which is event-driven and
 * doesn't depend on browser-specific APIs.
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 172 — PWA offline banner', () => {
  test('offline banner element exists in the DOM (hidden by default)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const banner = page.locator('.pwa-offline-banner');
    await expect(banner).toBeAttached();
    // Online by default in CI / local — banner stays hidden.
    await expect(banner).toBeHidden();
  });

  test('install hint card exists in the DOM (hidden until beforeinstallprompt)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const card = page.locator('.pwa-install-hint');
    await expect(card).toBeAttached();
    // No `beforeinstallprompt` fires synthetically in headless
    // chromium, so the card stays hidden.
    await expect(card).toBeHidden();
  });

  test('offline event toggles the banner', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const banner = page.locator('.pwa-offline-banner');
    await expect(banner).toBeHidden();

    // Dispatch the synthetic offline event.
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => false,
      });
      window.dispatchEvent(new Event('offline'));
    });
    await expect(banner).toBeVisible();

    // Reverse → online.
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => true,
      });
      window.dispatchEvent(new Event('online'));
    });
    await expect(banner).toBeHidden();
  });
});

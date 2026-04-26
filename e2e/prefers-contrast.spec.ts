/**
 * Phase 91 — `prefers-contrast: more` auto-promotes the in-app
 * `highContrast` preference at boot.
 *
 * Playwright lets us emulate the OS-level CSS media query via
 * `page.emulateMedia({ contrast: 'more' })`. We then reload the page
 * and assert the body's `high-contrast` class is set — which is the
 * Phase 88 wiring that the `highContrast` preference flips.
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 91 — prefers-contrast: more', () => {
  test('OS prefers-contrast: more seeds the highContrast preference', async ({
    page,
  }) => {
    // Make sure we have no stored preference yet (so the OS query wins).
    await page.context().clearCookies();
    await page.emulateMedia({ contrast: 'more' });
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // body.high-contrast is the Phase 88 class wired off the
    // `highContrast` preference. Its presence proves the boot path
    // picked up the OS preference.
    await expect(page.locator('body')).toHaveClass(/high-contrast/);
  });

  test('default OS contrast leaves highContrast off', async ({ page }) => {
    await page.context().clearCookies();
    await page.emulateMedia({ contrast: 'no-preference' });
    // localStorage can only be cleared once we're on the app's origin
    // (about:blank denies access). Clear via addInitScript so it runs
    // before the page's own boot script.
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('gm-encounter-maps-prefs');
      } catch {
        /* first-paint about:blank — ignore */
      }
    });
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await expect(page.locator('body')).not.toHaveClass(/high-contrast/);
  });

  test('user explicitly disabling highContrast wins over OS prefers-contrast: more', async ({
    page,
  }) => {
    await page.emulateMedia({ contrast: 'more' });
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // Auto-promoted on first boot.
    await expect(page.locator('body')).toHaveClass(/high-contrast/);

    // Explicitly turn it off via the same path the Settings UI would
    // (write to localStorage + reload). Mimics: open Settings → uncheck
    // High contrast → close.
    await page.evaluate(() => {
      const raw = localStorage.getItem('gm-encounter-maps-prefs');
      const prev = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'gm-encounter-maps-prefs',
        JSON.stringify({ ...prev, highContrast: false }),
      );
    });
    await page.reload();
    await page.waitForSelector('#canvas');

    // Stored override wins — class is gone even though the OS still
    // reports "more contrast".
    await expect(page.locator('body')).not.toHaveClass(/high-contrast/);
  });
});

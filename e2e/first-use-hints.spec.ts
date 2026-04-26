/**
 * Phase 96 — first-use hint toast.
 *
 * Validates:
 *   - Palette-intro hint surfaces on a fresh install (after the
 *     onboarding tour is complete) within ~7 s of boot.
 *   - "Got it" dismisses the toast + persists the dismissal so a
 *     subsequent reload doesn't re-show.
 *   - Hint never shows when the same id is in localStorage.
 */
import { test, expect } from '@playwright/test';

const HINTS_KEY = 'gm-encounter-maps-first-use-hints';
const PREFS_KEY = 'gm-encounter-maps-prefs';

async function bootWithCleanStorage(
  page: import('@playwright/test').Page,
  /** Pre-seed the prefs blob (we want onboardingComplete=true so the
   * tour doesn't auto-show + race the hint). */
  prefs?: object,
) {
  // addInitScript runs on every navigation (including reloads) — so
  // we only re-seed prefs (idempotent) here. Clearing hints state
  // happens once via `clearHintsOnce`; reloads preserve the hint
  // dismissal record (which is exactly what the second test wants
  // to verify).
  const seedPrefs = JSON.stringify(prefs ?? { onboardingComplete: true });
  await page.addInitScript(
    ({ prefsKey, seed }) => {
      try {
        localStorage.setItem(prefsKey, seed);
      } catch {
        /* about:blank — ignore */
      }
    },
    { prefsKey: PREFS_KEY, seed: seedPrefs },
  );
}

async function clearHintsOnce(page: import('@playwright/test').Page) {
  await page.evaluate((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, HINTS_KEY);
}

test.describe('Phase 96 — first-use hints', () => {
  test('palette-intro hint surfaces on a fresh install (~6s)', async ({ page }) => {
    await bootWithCleanStorage(page);
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await clearHintsOnce(page);
    await page.reload();
    await page.waitForSelector('#canvas');

    // The palette-intro hint fires 6 s after boot. Wait for it +
    // a small margin.
    const toast = page.locator('.first-use-hint');
    await expect(toast).toBeVisible({ timeout: 8_000 });
    await expect(toast).toContainText(/Ctrl\+K/);
  });

  test('"Got it" dismisses + persists across reloads', async ({ page }) => {
    await bootWithCleanStorage(page);
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await clearHintsOnce(page);
    await page.reload();
    await page.waitForSelector('#canvas');

    const toast = page.locator('.first-use-hint');
    await expect(toast).toBeVisible({ timeout: 8_000 });
    await toast.getByRole('button', { name: 'Got it' }).click();
    await expect(toast).toBeHidden();

    // localStorage should now record the dismissal.
    const stored = await page.evaluate((k) => localStorage.getItem(k), HINTS_KEY);
    expect(stored).toContain('palette-intro');

    // Reload — the hint must NOT re-appear.
    await page.reload();
    await page.waitForSelector('#canvas');
    // Wait past the 6 s timer to be sure.
    await page.waitForTimeout(7_000);
    await expect(toast).toBeHidden();
  });

  test('hint never shows when its id is already persisted', async ({ page }) => {
    await page.addInitScript(
      ({ prefsKey, hintsKey }) => {
        try {
          localStorage.setItem(
            prefsKey,
            JSON.stringify({ onboardingComplete: true }),
          );
          localStorage.setItem(hintsKey, JSON.stringify(['palette-intro']));
        } catch {
          /* about:blank — ignore */
        }
      },
      { prefsKey: PREFS_KEY, hintsKey: HINTS_KEY },
    );
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Wait past the 6 s timer + a margin; hint should remain hidden.
    await page.waitForTimeout(7_500);
    await expect(page.locator('.first-use-hint')).toBeHidden();
  });
});

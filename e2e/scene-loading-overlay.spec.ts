/**
 * Phase 145 — scene-switch loading overlay smoke test.
 *
 * The overlay element is mounted on every GM page boot. We verify
 * its DOM presence + role/label without trying to time-trace the
 * actual loading flash (the IDB hit usually completes in <50 ms,
 * making the overlay's brief visibility hard to observe reliably).
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 145 — scene loading overlay', () => {
  test('overlay element is mounted with the right ARIA role', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const overlay = page.locator('.scene-loading-overlay');
    await expect(overlay).toHaveCount(1);
    await expect(overlay).toHaveAttribute('role', 'status');
    await expect(overlay).toHaveAttribute(
      'aria-label',
      /Loading scene background/i,
    );
  });

  test('overlay is hidden when no background is set on a fresh boot', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // No background → overlay hidden.
    const overlay = page.locator('.scene-loading-overlay');
    await expect(overlay).toBeHidden();
  });

  test('spectator mounts its own overlay too', async ({ page }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');
    await expect(page.locator('.scene-loading-overlay')).toHaveCount(1);
  });
});

/**
 * Phase 152 — what's-new modal e2e.
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 152 — what\'s new modal', () => {
  test('does NOT auto-open on a fresh install (no last-seen-version)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#canvas');
    // Fresh install → no badge auto-opens.
    await expect(
      page.getByRole('dialog', { name: /What's new/i }),
    ).toHaveCount(0, { timeout: 1000 }).catch(() => {
      // Accept any count — we just want NOT visible.
    });
    await expect(
      page.getByRole('dialog', { name: /What's new/i }),
    ).toBeHidden();
  });

  test('auto-opens when last-seen-version is older than current', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    // Set last-seen to a stale value, then reload so the boot
    // logic re-evaluates.
    await page.evaluate(() => {
      localStorage.setItem('gm-encounter-maps-last-seen-version', '1.0.0');
    });
    await page.reload();
    await page.waitForSelector('#canvas');
    await expect(
      page.getByRole('dialog', { name: /What's new/i }),
    ).toBeVisible({ timeout: 3000 });
  });

  test('closing the modal marks the version seen (no re-open on next reload)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.evaluate(() => {
      localStorage.setItem('gm-encounter-maps-last-seen-version', '1.0.0');
    });
    await page.reload();
    await page.waitForSelector('#canvas');
    const dialog = page.getByRole('dialog', { name: /What's new/i });
    await expect(dialog).toBeVisible();
    // Close via the × button.
    await dialog.locator('.modal-close').click();
    await expect(dialog).toBeHidden();
    // Reload — modal does NOT auto-open again.
    await page.reload();
    await page.waitForSelector('#canvas');
    await expect(
      page.getByRole('dialog', { name: /What's new/i }),
    ).toBeHidden();
  });
});

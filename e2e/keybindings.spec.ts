/**
 * Phase 153 — keybindings tab smoke test.
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 153 — keybindings tab', () => {
  test('Keybindings tab is present in the Settings modal with 11 rows', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('tab', { name: 'Keybindings' }).click();
    await expect(dialog.locator('.keybinding-row')).toHaveCount(11);
    // Every row has a label + key + Rebind button.
    await expect(dialog.locator('.keybinding-key').first()).toBeVisible();
    await expect(dialog.locator('.keybinding-rebind').first()).toBeVisible();
  });

  test('Reset all keybindings button is present', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Keybindings' }).click();
    await expect(
      dialog.getByRole('button', { name: /Reset all keybindings/i }),
    ).toBeVisible();
  });
});

/**
 * Phase 165 — auto-pan-to-active-turn Settings toggle smoke.
 *
 * The actual camera-tween logic is exercised by the existing
 * camera-controls test surface; the integration risk for Phase
 * 165 is the Settings UI wiring + the preference persistence,
 * so this e2e focuses on the toggle.
 */
import { test, expect, type Page } from '@playwright/test';

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Phase 165 — auto-pan to active turn toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('Settings → Camera → Initiative exposes the toggle, default OFF', async ({
    page,
  }) => {
    const dialog = await openSettings(page);
    await dialog.getByRole('tab', { name: 'Camera' }).click();
    const autoPan = dialog.locator('input[data-field="autoPanToActiveTurn"]');
    await expect(autoPan).toBeVisible();
    await expect(autoPan).not.toBeChecked();
  });

  test('toggling persists across a reload', async ({ page }) => {
    let dialog = await openSettings(page);
    await dialog.getByRole('tab', { name: 'Camera' }).click();
    const autoPan = dialog.locator('input[data-field="autoPanToActiveTurn"]');
    await autoPan.check();
    await expect(autoPan).toBeChecked();
    await page.keyboard.press('Escape');
    await page.reload();
    await page.waitForSelector('#canvas');
    dialog = await openSettings(page);
    await dialog.getByRole('tab', { name: 'Camera' }).click();
    await expect(
      dialog.locator('input[data-field="autoPanToActiveTurn"]'),
    ).toBeChecked();
  });
});

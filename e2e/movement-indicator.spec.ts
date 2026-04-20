import { test, expect } from '@playwright/test';

test.describe('Movement indicator preferences', () => {
  test('Settings → Appearance exposes Distance subgroup with all three controls', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('tab', { name: 'Appearance' }).click();

    // Distance subgroup is present with the three controls.
    await expect(dialog.locator('legend', { hasText: 'Distance' })).toBeVisible();
    await expect(dialog.locator('input[name="settings-distance-unit"][value="squares"]')).toBeChecked();
    await expect(dialog.locator('input[name="settings-distance-unit"][value="feet"]')).not.toBeChecked();
    await expect(dialog.locator('input[data-field="feetPerSquare"]')).toHaveValue('5');
    await expect(dialog.locator('input[name="settings-diagonal-rule"][value="chebyshev"]')).toBeChecked();
  });

  test('selecting Feet + editing feet-per-square persists across reload', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Appearance' }).click();

    // Flip to feet + change to 10 ft/square.
    await dialog.locator('input[name="settings-distance-unit"][value="feet"]').check();
    const fps = dialog.locator('input[data-field="feetPerSquare"]');
    await fps.fill('10');
    await fps.press('Enter');
    await fps.blur();

    // Reload the page — preferences are localStorage-backed, so the new
    // values should stick.
    await page.reload();
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Appearance' }).click();

    await expect(page.locator('input[name="settings-distance-unit"][value="feet"]')).toBeChecked();
    await expect(page.locator('input[data-field="feetPerSquare"]')).toHaveValue('10');
  });

  test('Diagonal rule toggle updates preference', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Appearance' }).click();

    const alternating = dialog.locator('input[name="settings-diagonal-rule"][value="alternating"]');
    await alternating.check();
    await expect(alternating).toBeChecked();

    // Reload and confirm persistence.
    await page.reload();
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Appearance' }).click();
    await expect(page.locator('input[name="settings-diagonal-rule"][value="alternating"]')).toBeChecked();
  });
});

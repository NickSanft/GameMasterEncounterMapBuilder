import { test, expect } from '@playwright/test';

test.describe('Grid labels + scene tint preferences', () => {
  test('Grid labels checkbox lives on the Grid tab and persists across reload', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('tab', { name: 'Grid' }).click();
    const labelsCheckbox = dialog.locator('input[data-field="showGridLabels"]');
    await expect(labelsCheckbox).toBeVisible();
    await expect(labelsCheckbox).not.toBeChecked();

    await labelsCheckbox.check();
    await expect(labelsCheckbox).toBeChecked();

    // Reload — preference persists in localStorage.
    await page.reload();
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Grid' }).click();
    await expect(page.locator('input[data-field="showGridLabels"]')).toBeChecked();
  });

  test('Scene lighting controls live on the Appearance tab; slider updates the % label', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Appearance' }).click();

    await expect(dialog.locator('legend', { hasText: 'Scene lighting' })).toBeVisible();
    const slider = dialog.locator('input[data-field="sceneLightOpacity"]');
    const label = dialog.locator('[data-field="sceneLightOpacityValue"]');
    await expect(label).toHaveText('0%');

    // Nudge the slider.
    await slider.fill('45');
    await slider.dispatchEvent('input');
    await expect(label).toHaveText('45%');

    // Reload — the 45% persists.
    await page.reload();
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Appearance' }).click();
    await expect(page.locator('[data-field="sceneLightOpacityValue"]')).toHaveText('45%');
  });
});

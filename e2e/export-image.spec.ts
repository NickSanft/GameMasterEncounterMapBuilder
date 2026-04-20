import { test, expect } from '@playwright/test';

test.describe('Export image (PNG)', () => {
  test('modal opens, shows all three radio groups + filename field', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Export Image…', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Export image' });
    await expect(dialog).toBeVisible();

    // All three radio groups should be present.
    await expect(dialog.locator('input[name="export-scope"]')).toHaveCount(2);
    await expect(dialog.locator('input[name="export-mode"]')).toHaveCount(2);
    await expect(dialog.locator('input[name="export-scale"]')).toHaveCount(3);

    // Defaults: whole-map / gm / 2×.
    await expect(
      dialog.locator('input[name="export-scope"][value="whole-map"]'),
    ).toBeChecked();
    await expect(
      dialog.locator('input[name="export-mode"][value="gm"]'),
    ).toBeChecked();
    await expect(
      dialog.locator('input[name="export-scale"][value="2"]'),
    ).toBeChecked();

    // Filename is pre-filled and editable.
    const filenameInput = dialog.locator('input[data-field="filename"]');
    const fn = await filenameInput.inputValue();
    expect(fn).toMatch(/^gm-encounter-maps-/);

    // Escape closes without exporting.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Export PNG triggers a download with .png filename', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Export Image…', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Export image' });
    await expect(dialog).toBeVisible();

    // Override the filename so we can assert the exact stem.
    const filenameInput = dialog.locator('input[data-field="filename"]');
    await filenameInput.fill('my-encounter');

    // Smallest / fastest option — 1× visible-area — to keep the test snappy.
    await dialog.locator('input[name="export-scope"][value="visible-area"]').check();
    await dialog.locator('input[name="export-scale"][value="1"]').check();

    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Export PNG' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('my-encounter.png');
    await expect(dialog).toBeHidden();
  });

  test('Cancel closes without triggering a download', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Export Image…', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Export image' });
    await expect(dialog).toBeVisible();

    // Start a download watcher with a short timeout so the assertion fails
    // *only* if a download fires after Cancel. The happy path is a timeout.
    let downloadFired = false;
    page.on('download', () => {
      downloadFired = true;
    });

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();

    // A short wait gives any rogue download event a chance to surface.
    await page.waitForTimeout(200);
    expect(downloadFired).toBe(false);
  });
});

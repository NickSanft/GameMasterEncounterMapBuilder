import { test, expect } from '@playwright/test';

test.describe('Spectator view smoke', () => {
  test('canvas + Spectator badge + minimal session menu render', async ({ page }) => {
    await page.goto('./spectator.html');

    await expect(page.locator('#canvas')).toBeVisible();
    await expect(page.locator('.view-badge')).toHaveText('Spectator View');

    // Spectator session menu only includes Shortcuts + Settings (no Upload, Export, etc).
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Shortcuts', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload Map', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'New Session', exact: true })).toHaveCount(0);

    // Ruler toolbar
    await expect(page.getByRole('button', { name: /Ruler/i })).toBeVisible();
  });

  test('? opens shortcuts overlay with Spectator-only sections', async ({ page }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');

    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    });
    const dialog = page.getByRole('dialog', { name: /Keyboard shortcuts/i });
    await expect(dialog).toBeVisible();

    // Spectator overlay should NOT contain GM-only sections.
    await expect(dialog.locator('.shortcut-section h3', { hasText: 'Selection & editing' })).toHaveCount(0);
    await expect(dialog.locator('.shortcut-section h3', { hasText: 'Token editor' })).toHaveCount(0);
    // It SHOULD contain Camera + Tools.
    await expect(dialog.locator('.shortcut-section h3', { hasText: 'Camera' })).toBeVisible();
  });

  test('Settings modal hides GM-only fog controls', async ({ page }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('tab', { name: 'Appearance' }).click();
    // Fog color is GM-only; it should NOT appear in the Spectator settings.
    await expect(dialog.locator('input[data-field="gmFogColor"]')).toHaveCount(0);

    await dialog.getByRole('tab', { name: 'Diagnostics' }).click();
    // Diagnostics overlay toggle is shared.
    await expect(dialog.getByRole('checkbox', { name: /Show diagnostics overlay/i })).toBeVisible();
    // Spectator viewport overlay is GM-only.
    await expect(dialog.getByRole('checkbox', { name: /Show Spectator viewport overlay/i })).toHaveCount(0);
  });
});

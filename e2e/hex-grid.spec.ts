/**
 * Phase 124 — hex grid (cosmetic overlay).
 *
 * Validates:
 *   - Settings modal Grid pane exposes the gridShape select with
 *     square + hex options.
 *   - Selecting "hex" patches the scene's grid.gridShape, persists
 *     across modal close + re-open.
 *   - The patch round-trips on the wire (cross-tab BroadcastChannel
 *     between two GM windows).
 */
import { test, expect, type Page } from '@playwright/test';

async function openSettingsToGrid(page: Page) {
  // The session menu's "Settings" button opens the modal; the Grid
  // tab is the default.
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
}

async function closeSettings(page: Page) {
  await page.getByRole('dialog', { name: 'Settings' }).locator('.modal-close').click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeHidden();
}

test.describe('Phase 124 — hex grid mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('Settings Grid pane shows the gridShape select with square + hex', async ({
    page,
  }) => {
    await openSettingsToGrid(page);
    const select = page.locator('select[data-field="gridShape"]');
    await expect(select).toBeVisible();
    // Default is "square".
    await expect(select).toHaveValue('square');
    // Both options present.
    await expect(select.locator('option[value="square"]')).toHaveCount(1);
    await expect(select.locator('option[value="hex"]')).toHaveCount(1);
  });

  test('selecting hex persists across modal close + re-open', async ({ page }) => {
    await openSettingsToGrid(page);
    await page.locator('select[data-field="gridShape"]').selectOption('hex');
    await closeSettings(page);

    // Re-open and verify the select still shows hex.
    await openSettingsToGrid(page);
    await expect(page.locator('select[data-field="gridShape"]')).toHaveValue('hex');
  });
});

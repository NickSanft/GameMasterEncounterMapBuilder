/**
 * Phase 155 — initiative auto-skip on dead tokens.
 *
 * The unit tests in `src/state/initiative.test.ts` cover the
 * `advanceInitiativeSkippingDead` helper across all the scenarios
 * (single skip, multi-skip, wrap, manual entries, all-dead bail,
 * stale tokenId). These e2e specs validate the user-visible
 * integration:
 *   - Settings → Initiative subgroup exposes the auto-skip checkbox
 *     (GM-only, default ON).
 *   - Toggling the checkbox persists into preferences and survives
 *     a reload (the change handler writes through to localStorage).
 */
import { test, expect, type Page } from '@playwright/test';

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Phase 155 — initiative auto-skip setting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('Settings exposes the auto-skip checkbox (default ON, GM-only)', async ({
    page,
  }) => {
    const dialog = await openSettings(page);
    // The pref toggle lives in the Camera tab's Initiative subgroup.
    await dialog.getByRole('tab', { name: 'Camera' }).click();
    const autoSkip = dialog.locator('input[data-field="autoSkipDeadInInitiative"]');
    await expect(autoSkip).toBeVisible();
    // Default is ON.
    await expect(autoSkip).toBeChecked();
  });

  test('Spectator does NOT show the auto-skip checkbox (GM-only setting)', async ({
    page,
  }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.locator('input[data-field="autoSkipDeadInInitiative"]'),
    ).toHaveCount(0);
  });

  test('toggling the checkbox persists across a reload', async ({ page }) => {
    // Toggle OFF.
    let dialog = await openSettings(page);
    await dialog.getByRole('tab', { name: 'Camera' }).click();
    const autoSkip = dialog.locator(
      'input[data-field="autoSkipDeadInInitiative"]',
    );
    await autoSkip.uncheck();
    await expect(autoSkip).not.toBeChecked();

    // Close + reload.
    await page.keyboard.press('Escape');
    await page.reload();
    await page.waitForSelector('#canvas');

    // Re-open settings → still off.
    dialog = await openSettings(page);
    await dialog.getByRole('tab', { name: 'Camera' }).click();
    await expect(
      dialog.locator('input[data-field="autoSkipDeadInInitiative"]'),
    ).not.toBeChecked();
  });
});

/**
 * Phase 160 — wall-clipping for auras (Settings toggle smoke).
 *
 * The render-side clipping (canvas `clip()` against the
 * `computeVisibilityPolygon` output) is purely visual + heavily
 * exercised by the Phase 55 LoS test suite. The integration risk
 * is the Settings UI wiring + the preference flow, so the e2e
 * focuses on:
 *   - The toggle is present in Settings → Appearance → Auras (GM
 *     view; the subgroup is gated alongside the existing tile-paint
 *     subgroup on `viewMode === 'gm'`).
 *   - Default OFF.
 *   - Toggling persists across a reload.
 */
import { test, expect, type Page } from '@playwright/test';

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Phase 160 — aura wall-clipping toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('Settings → Appearance exposes the Clip auras toggle, default OFF', async ({
    page,
  }) => {
    const dialog = await openSettings(page);
    // The pref toggle lives in the Appearance pane's Auras subgroup.
    await dialog.getByRole('tab', { name: 'Appearance' }).click();
    const clipAuras = dialog.locator('input[data-field="clipAurasByWalls"]');
    await expect(clipAuras).toBeVisible();
    await expect(clipAuras).not.toBeChecked();
  });

  test('toggling the checkbox persists across a reload', async ({ page }) => {
    let dialog = await openSettings(page);
    await dialog.getByRole('tab', { name: 'Appearance' }).click();
    const clipAuras = dialog.locator('input[data-field="clipAurasByWalls"]');
    await clipAuras.check();
    await expect(clipAuras).toBeChecked();
    await page.keyboard.press('Escape');
    await page.reload();
    await page.waitForSelector('#canvas');
    dialog = await openSettings(page);
    await dialog.getByRole('tab', { name: 'Appearance' }).click();
    await expect(
      dialog.locator('input[data-field="clipAurasByWalls"]'),
    ).toBeChecked();
  });
});

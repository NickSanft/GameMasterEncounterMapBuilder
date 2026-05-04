/**
 * Phase 139 — token aura/emanation rings.
 *
 * Smoke test: drop a token, focus it via Phase 86 keyboard nav,
 * open the editor with `e`, enable the aura, set a radius + label,
 * close. Verify the canvas-outline reflects the token (we don't
 * pixel-check the ring; the visual regression spec covers paint).
 */
import { test, expect, type Page } from '@playwright/test';

test.describe('Phase 139 — token auras', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('aura editor toggle + radius + label round-trip', async ({ page }) => {
    // Drop a token at the canvas center.
    await page.keyboard.press('t');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Tab to focus the token, then 'e' to open the editor.
    await page.locator('#canvas').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('e');
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();

    // Aura section.
    const hasAura = dialog.locator('input[data-field="hasAura"]');
    await expect(hasAura).not.toBeChecked();
    await hasAura.check();
    await expect(
      dialog.locator('div[data-field="aura-details"]'),
    ).toBeVisible();

    // Set a label + radius. Default is 10 ft; bump to 15.
    const labelInput = dialog.locator('input[data-field="auraLabel"]');
    await labelInput.fill('Bless');
    await labelInput.dispatchEvent('change');

    const radiusInput = dialog.locator('input[data-field="auraRadiusFeet"]');
    await radiusInput.fill('15');
    await radiusInput.dispatchEvent('change');

    // Close + reopen — values should persist.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await page.locator('#canvas').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('e');
    await expect(dialog).toBeVisible();

    await expect(dialog.locator('input[data-field="hasAura"]')).toBeChecked();
    await expect(dialog.locator('input[data-field="auraLabel"]')).toHaveValue(
      'Bless',
    );
    await expect(
      dialog.locator('input[data-field="auraRadiusFeet"]'),
    ).toHaveValue('15');
  });

  test('disabling the aura clears the entry', async ({ page }) => {
    await page.keyboard.press('t');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    await page.locator('#canvas').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('e');
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await dialog.locator('input[data-field="hasAura"]').check();
    await dialog.locator('input[data-field="hasAura"]').uncheck();
    await expect(
      dialog.locator('div[data-field="aura-details"]'),
    ).toBeHidden();
  });
});

/**
 * Phase 159 — aura preset picker.
 *
 * Validates:
 *   - The token editor's aura section exposes a "From preset…"
 *     dropdown with the canonical AURA_PRESETS entries.
 *   - Selecting a preset stamps a fresh aura row with the preset's
 *     label.
 */
import { test, expect, type Page } from '@playwright/test';

async function placeTokenAtCenter(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function openEditorAtCenter(page: Page) {
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    button: 'right',
  });
  const editItem = page.getByRole('menuitem', { name: /Edit token/i });
  await expect(editItem).toBeVisible();
  await editItem.click();
  await expect(page.getByRole('dialog', { name: 'Edit Token' })).toBeVisible();
}

test.describe('Phase 159 — aura presets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('Aura section exposes the preset dropdown with multiple presets', async ({
    page,
  }) => {
    await placeTokenAtCenter(page);
    await openEditorAtCenter(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    const select = dialog.locator('select[data-field="aura-preset-select"]');
    await expect(select).toBeVisible();
    // Placeholder + at least 4 presets (Bless, Bane, Spirit Guardians,
    // and a few more) — assert >= 5 options total.
    const options = select.locator('option');
    expect(await options.count()).toBeGreaterThanOrEqual(5);
    // The first option is the placeholder.
    await expect(options.nth(0)).toHaveText(/From preset/);
  });

  test('selecting "Bless" adds an aura row with that label', async ({
    page,
  }) => {
    await placeTokenAtCenter(page);
    await openEditorAtCenter(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await dialog
      .locator('select[data-field="aura-preset-select"]')
      .selectOption('bless');
    // The aura list now has 1 row whose label input contains "Bless".
    await expect(dialog.locator('.aura-row')).toHaveCount(1);
    await expect(
      dialog.locator('.aura-row .aura-row-label'),
    ).toHaveValue(/Bless/);
  });

  test('the dropdown resets to the placeholder after a stamp (re-stamp same preset)', async ({
    page,
  }) => {
    await placeTokenAtCenter(page);
    await openEditorAtCenter(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    const select = dialog.locator('select[data-field="aura-preset-select"]');
    await select.selectOption('bless');
    await expect(select).toHaveValue('');
    // Stamp a second time → 2 rows.
    await select.selectOption('bless');
    await expect(dialog.locator('.aura-row')).toHaveCount(2);
  });
});

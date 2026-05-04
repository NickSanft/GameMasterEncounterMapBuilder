/**
 * Phase 139 / 151 — token aura/emanation rings.
 *
 * Phase 151 replaced the single-aura editor section with a
 * list-row UI ("+ Add aura" button + per-row inputs + remove). The
 * tests below exercise the post-151 UI.
 */
import { test, expect, type Page } from '@playwright/test';

async function dropAndOpenEditor(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.locator('#canvas').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('e');
  const dialog = page.getByRole('dialog', { name: 'Edit Token' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Phase 139 / 151 — token auras', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('empty state shows "No auras." hint', async ({ page }) => {
    const dialog = await dropAndOpenEditor(page);
    await expect(dialog.locator('.aura-empty')).toBeVisible();
    await expect(dialog.locator('.aura-row')).toHaveCount(0);
  });

  test('Add aura appends a row; row inputs round-trip across editor close+reopen', async ({
    page,
  }) => {
    const dialog = await dropAndOpenEditor(page);
    await dialog.locator('.aura-add').click();
    await expect(dialog.locator('.aura-row')).toHaveCount(1);

    // Edit the label + radius on the new row.
    await dialog.locator('.aura-row-label').fill('Bless');
    await dialog.locator('.aura-row-label').dispatchEvent('change');
    await dialog.locator('.aura-row-radius').fill('15');
    await dialog.locator('.aura-row-radius').dispatchEvent('change');

    // Close + reopen — values persist + the row count is stable.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.locator('#canvas').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('e');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.aura-row')).toHaveCount(1);
    await expect(dialog.locator('.aura-row-label')).toHaveValue('Bless');
    await expect(dialog.locator('.aura-row-radius')).toHaveValue('15');
  });

  test('Add aura twice creates two stacked rows', async ({ page }) => {
    const dialog = await dropAndOpenEditor(page);
    await dialog.locator('.aura-add').click();
    await dialog.locator('.aura-add').click();
    await expect(dialog.locator('.aura-row')).toHaveCount(2);
  });

  test('row × Remove drops the entry', async ({ page }) => {
    const dialog = await dropAndOpenEditor(page);
    await dialog.locator('.aura-add').click();
    await dialog.locator('.aura-add').click();
    await expect(dialog.locator('.aura-row')).toHaveCount(2);
    await dialog.locator('.aura-row-remove').first().click();
    await expect(dialog.locator('.aura-row')).toHaveCount(1);
  });
});

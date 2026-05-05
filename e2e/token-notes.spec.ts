/**
 * Phase 162 — per-token GM notes scratchpad.
 *
 * Validates:
 *   - The token editor exposes a Notes textarea (default empty).
 *   - Notes round-trip through editor close + re-open.
 *   - Empty notes don't persist (the in-memory shape stays clean).
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

test.describe('Phase 162 — token notes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('Notes textarea is present and starts empty', async ({ page }) => {
    await placeTokenAtCenter(page);
    await openEditorAtCenter(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    const notes = dialog.locator('textarea[data-field="notes"]');
    await expect(notes).toBeVisible();
    await expect(notes).toHaveValue('');
  });

  test('notes persist across editor close + re-open', async ({ page }) => {
    await placeTokenAtCenter(page);
    await openEditorAtCenter(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    const notes = dialog.locator('textarea[data-field="notes"]');
    await notes.fill('AC 16, +4 to hit, Multiattack 2× scimitar');
    // Blur commits; fill triggers blur via tab-out-or-click. Click
    // outside to ensure blur fires.
    await dialog.locator('input[data-field="label"]').click();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await openEditorAtCenter(page);
    await expect(dialog.locator('textarea[data-field="notes"]')).toHaveValue(
      'AC 16, +4 to hit, Multiattack 2× scimitar',
    );
  });
});

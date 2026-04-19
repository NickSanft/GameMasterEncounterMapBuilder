import { test, expect, type Page } from '@playwright/test';

async function placeTokenAtCanvasCenter(page: Page) {
  // Switch to the Token tool, then click the canvas at its center to drop one.
  await page.keyboard.press('t');
  const canvas = page.locator('#canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe('Token placement + editor flow', () => {
  test('Token tool places a token; right-click opens editor with cycle controls hidden', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenAtCanvasCenter(page);

    // Right-click the same spot to open the contextual menu, then choose "Edit token…"
    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });

    // The context menu is a role="menu" with the items we added in earlier phases.
    const editItem = page.getByRole('menuitem', { name: /Edit token/i });
    await expect(editItem).toBeVisible();
    await editItem.click();

    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();
    // X / Y / Size grid we added in Phase 30.
    await expect(dialog.locator('input[data-field="x"]')).toBeVisible();
    await expect(dialog.locator('input[data-field="y"]')).toBeVisible();
    // Single-selection: the cycle group should be hidden.
    await expect(dialog.locator('[data-field="cycle-group"]')).toBeHidden();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('E shortcut opens the editor for the selected token', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenAtCanvasCenter(page);

    // Switch back to Select tool and click the token to select it.
    await page.keyboard.press('s');
    const canvas = page.locator('#canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Press E to open the editor.
    await page.keyboard.press('e');
    await expect(page.getByRole('dialog', { name: 'Edit Token' })).toBeVisible();

    // Modify label via keyboard.
    const labelInput = page.locator('input[data-field="label"]');
    await expect(labelInput).toBeFocused();
    await labelInput.fill('Boss');
    await expect(labelInput).toHaveValue('Boss');

    // Ctrl+Enter saves and closes.
    await page.keyboard.press('Control+Enter');
    await expect(page.getByRole('dialog', { name: 'Edit Token' })).toBeHidden();
  });

  test('Border swatch row exposes a radiogroup for keyboard nav', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenAtCanvasCenter(page);
    await page.keyboard.press('s');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.press('e');

    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();
    const swatchGroup = dialog.locator('[data-field="border-swatches"]');
    await expect(swatchGroup).toHaveAttribute('role', 'radiogroup');

    // At least the "no border" + each TEAM_PRESET swatch should be present.
    const swatches = swatchGroup.locator('button.swatch');
    expect(await swatches.count()).toBeGreaterThanOrEqual(2);
    // All have role="radio".
    for (let i = 0; i < (await swatches.count()); i++) {
      await expect(swatches.nth(i)).toHaveAttribute('role', 'radio');
    }
  });
});

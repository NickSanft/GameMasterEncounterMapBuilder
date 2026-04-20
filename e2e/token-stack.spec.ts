import { test, expect, type Page } from '@playwright/test';

/** Place two tokens at the same grid cell (the canvas center). */
async function placeTwoStackedTokens(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy);
  await page.mouse.click(cx, cy);
  // Back to Select and return the center in page coords for reuse.
  await page.keyboard.press('s');
  return { cx, cy };
}

test.describe('Token stacking affordance', () => {
  test('right-clicking a stacked cell shows a "Stack here" section with every member', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const { cx, cy } = await placeTwoStackedTokens(page);
    // Click to select the top-most.
    await page.mouse.click(cx, cy);

    // Right-click to open the context menu.
    await page.mouse.click(cx, cy, { button: 'right' });

    // Stack header + one item per token (default labels "Token 1" and "Token 2").
    await expect(
      page.getByRole('menuitem', { name: /Stack here \(2\):/ }),
    ).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Token 1/ })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Token 2/ })).toBeVisible();
  });

  test('Alt+click on a stacked cell cycles selection without opening the editor', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const { cx, cy } = await placeTwoStackedTokens(page);
    // Click selects top (Token 2). Opening the editor confirms that.
    await page.mouse.click(cx, cy);
    await page.keyboard.press('e');
    let dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();
    await expect(page.locator('input[data-field="label"]')).toHaveValue('Token 2');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Alt+click cycles down the stack — should now select Token 1.
    await page.keyboard.down('Alt');
    await page.mouse.click(cx, cy);
    await page.keyboard.up('Alt');
    await page.keyboard.press('e');
    dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();
    await expect(page.locator('input[data-field="label"]')).toHaveValue('Token 1');
    await page.keyboard.press('Escape');

    // Alt+click again wraps back to the top.
    await page.keyboard.down('Alt');
    await page.mouse.click(cx, cy);
    await page.keyboard.up('Alt');
    await page.keyboard.press('e');
    await expect(page.locator('input[data-field="label"]')).toHaveValue('Token 2');
  });

  test('clicking a "Stack here" entry selects that specific token', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const { cx, cy } = await placeTwoStackedTokens(page);
    await page.mouse.click(cx, cy);

    // Right-click → click the bottom-of-stack entry.
    await page.mouse.click(cx, cy, { button: 'right' });
    await page.getByRole('menuitem', { name: /Token 1/ }).click();

    // Pressing E now opens the editor for Token 1 (the selection target).
    await page.keyboard.press('e');
    await expect(page.getByRole('dialog', { name: 'Edit Token' })).toBeVisible();
    await expect(page.locator('input[data-field="label"]')).toHaveValue('Token 1');
  });
});

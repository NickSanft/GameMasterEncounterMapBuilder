import { test, expect, type Page } from '@playwright/test';

async function activateDrawTool(page: Page) {
  await page.waitForSelector('#canvas');
  await page.locator('button[data-tool="draw"]').click();
}

async function strokeFromCenter(page: Page) {
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // Drag a short horizontal stroke through the canvas center.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 20, cy, { steps: 5 });
  await page.mouse.move(cx + 40, cy, { steps: 5 });
  await page.mouse.move(cx + 60, cy, { steps: 5 });
  await page.mouse.up();
  return { cx: cx + 30, cy };
}

test.describe('Freehand draw tool', () => {
  test('toolbar has Draw button and K shortcut activates it', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const drawBtn = page.locator('button[data-tool="draw"]');
    await expect(drawBtn).toBeVisible();
    await expect(drawBtn).toHaveAttribute('aria-pressed', 'false');

    // K activates the Draw tool.
    await page.locator('#canvas').click();
    await page.keyboard.press('k');
    await expect(drawBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('draw settings panel renders with color swatches, widths, and visibility buttons', async ({ page }) => {
    await page.goto('./gm.html');
    await activateDrawTool(page);

    const panel = page.locator('.draw-settings');
    await expect(panel).toBeVisible();

    // Six color swatches (+ custom color input).
    await expect(panel.locator('.draw-color-swatch')).toHaveCount(6);
    await expect(panel.locator('.draw-custom-color')).toBeVisible();

    // Four width buttons.
    await expect(panel.locator('.draw-widths button')).toHaveCount(4);

    // Visibility buttons.
    await expect(panel.getByRole('button', { name: 'Shared', exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'GM only', exact: true })).toBeVisible();
  });

  test('clicking a color swatch flips its active class', async ({ page }) => {
    await page.goto('./gm.html');
    await activateDrawTool(page);

    const panel = page.locator('.draw-settings');
    const red = panel.locator('.draw-color-swatch').nth(1); // #ef4444
    await red.click();
    await expect(red).toHaveClass(/active/);
  });

  test('drawing on the canvas commits a stroke visible via right-click', async ({ page }) => {
    await page.goto('./gm.html');
    await activateDrawTool(page);

    const { cx, cy } = await strokeFromCenter(page);

    // Switch back to Select to avoid extra strokes from right-click motion.
    await page.locator('button[data-tool="select"]').click();

    // Right-click near the middle of the stroke — should get a "Stroke actions" menu.
    await page.mouse.click(cx, cy, { button: 'right' });
    await expect(
      page.getByRole('menuitem', { name: /Delete stroke/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: /Make stroke GM-only/ }),
    ).toBeVisible();
  });

  test('session menu "Clear Drawings" button exists and confirms before clearing', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Clear Drawings button lives in the session menu alongside Notes / Shortcuts.
    await expect(
      page.getByRole('button', { name: 'Clear Drawings', exact: true }),
    ).toBeVisible();
  });

  test('deleting a stroke via the context menu removes it', async ({ page }) => {
    await page.goto('./gm.html');
    await activateDrawTool(page);
    const { cx, cy } = await strokeFromCenter(page);

    // Back to Select, right-click the stroke, Delete.
    await page.locator('button[data-tool="select"]').click();
    await page.mouse.click(cx, cy, { button: 'right' });
    await page.getByRole('menuitem', { name: /Delete stroke/ }).click();

    // Right-click the same spot again — should now hit empty map, not a stroke.
    await page.mouse.click(cx, cy, { button: 'right' });
    await expect(
      page.getByRole('menuitem', { name: /Delete stroke/ }),
    ).toHaveCount(0);
  });
});

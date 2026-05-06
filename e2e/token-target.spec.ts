/**
 * Phase 174 — combat target indicator.
 *
 * Validates the right-click "Set as target" / "Clear target"
 * toggle is wired through the canvas context menu. The reticle
 * itself renders to canvas; visual checking is out of scope here
 * (covered by visual-regression baselines on demand).
 */
import { test, expect, type Page } from '@playwright/test';

async function placeTokenAtCenter(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function rightClickCenter(page: Page) {
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    button: 'right',
  });
}

test.describe('Phase 174 — combat target indicator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('right-clicking a token shows "Set as target"', async ({ page }) => {
    await placeTokenAtCenter(page);
    await rightClickCenter(page);
    await expect(
      page.getByRole('menuitem', { name: 'Set as target' }),
    ).toBeVisible();
  });

  test('after setting, the menu reads "Clear target"', async ({ page }) => {
    await placeTokenAtCenter(page);
    await rightClickCenter(page);
    await page.getByRole('menuitem', { name: 'Set as target' }).click();
    await rightClickCenter(page);
    await expect(
      page.getByRole('menuitem', { name: 'Clear target' }),
    ).toBeVisible();
  });
});

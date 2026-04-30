/**
 * Phase 131 — hex-aware walls.
 *
 * Validates:
 *   - With hex grid active + Walls tool in Block mode, clicking on
 *     the canvas places a hex-shaped block wall (renders without
 *     crashing; the canvas-outline gains a wall entry).
 */
import { test, expect, type Page } from '@playwright/test';

async function selectHexGrid(page: Page) {
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  await dialog.locator('select[data-field="gridShape"]').selectOption('hex');
  await dialog.locator('.modal-close').click();
  await expect(dialog).toBeHidden();
}

async function setBlockMode(page: Page) {
  // Walls tool already activates the wall settings panel; flip to Block mode.
  const blockBtn = page.locator('button', { hasText: 'Block' }).first();
  await blockBtn.click();
}

test.describe('Phase 131 — hex-aware walls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('Block mode + hex grid places a wall on click without crashing', async ({
    page,
  }) => {
    await selectHexGrid(page);
    await page.keyboard.press('w');
    await setBlockMode(page);

    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    // Click + release to place a single-hex block wall.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.up();

    // Outline should pick up the wall.
    await expect
      .poll(
        async () =>
          await page.locator('.canvas-outline li', { hasText: 'wall' }).count(),
      )
      .toBeGreaterThan(0);
    await expect(page.locator('#canvas')).toBeVisible();
  });
});

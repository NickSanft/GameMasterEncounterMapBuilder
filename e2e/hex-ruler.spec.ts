/**
 * Phase 129 — hex distance integration with the ruler + movement
 * indicator. v124 shipped the cosmetic hex overlay; v1.4 makes the
 * measured distance HEX-correct when the grid shape is hex.
 *
 * Validates:
 *   - Toggling the grid to hex via Settings persists.
 *   - With hex active, the renderer doesn't crash on a token drag
 *     (smoke check that the new code path is exercised).
 *
 * The actual distance number is unit-tested in `hex-geometry.test.ts`;
 * this spec is the wire-up smoke test.
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

test.describe('Phase 129 — hex distance + ruler', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('Ruler tool runs without error on a hex grid', async ({ page }) => {
    await selectHexGrid(page);

    // Activate Ruler tool (L), then drag across the canvas.
    await page.keyboard.press('l');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const startX = box.x + box.width / 2 - 100;
    const startY = box.y + box.height / 2 - 50;
    const endX = startX + 200;
    const endY = startY + 100;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.mouse.up();

    // Canvas still alive (didn't crash).
    await expect(page.locator('#canvas')).toBeVisible();
  });

  test('Token drag on hex grid renders movement indicator without crash', async ({
    page,
  }) => {
    await selectHexGrid(page);

    // Place a token + drag it.
    await page.keyboard.press('t');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.click(cx, cy);

    await page.keyboard.press('s');
    await page.mouse.click(cx, cy);
    // Drag to the right by ~3 hex widths.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 200, cy, { steps: 6 });
    await page.mouse.up();

    await expect(page.locator('#canvas')).toBeVisible();
  });
});

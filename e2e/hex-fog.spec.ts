/**
 * Phase 132 — hex-aware fog reveal.
 *
 * Validates:
 *   - Reveal tool (R) in freehand mode + hex grid clicks paint at
 *     least one fog cell — verified via the canvas's aria-label fog
 *     percentage flipping above 0%.
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

async function setFreehandFog(page: Page) {
  // Fog options panel exposes shape buttons. Click the freehand
  // option so each click paints rather than rect-drag.
  const freehandBtn = page.locator('button', { hasText: 'Freehand' }).first();
  if (await freehandBtn.isVisible()) {
    await freehandBtn.click();
  }
}

test.describe('Phase 132 — hex-aware fog reveal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('Reveal tool on hex grid flips fog cells without crashing', async ({
    page,
  }) => {
    await selectHexGrid(page);
    await page.keyboard.press('r');
    await setFreehandFog(page);

    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    // Drag a short freehand stroke through the canvas center.
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx - 50, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 50, cy, { steps: 5 });
    await page.mouse.up();

    // Canvas aria-label format: "GM battle map. … X% of fog revealed."
    // Wait for the aria-label to update with > 0%.
    await expect.poll(async () => {
      const label = await page.locator('#canvas').getAttribute('aria-label');
      const m = label?.match(/(\d+)% of fog revealed/);
      return m ? Number(m[1]) : 0;
    }).toBeGreaterThan(0);
  });
});

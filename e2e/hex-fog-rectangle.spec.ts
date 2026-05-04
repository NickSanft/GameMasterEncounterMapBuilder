/**
 * Phase 134 — fog rectangle-shape mode in hex.
 *
 * Validates that a rectangle-shape drag in hex grid mode treats the
 * two corners as inclusive offset-coord hex bounds, painting every
 * hex in the range (not the rect AABB the v1.7 implementation
 * mistakenly painted in the rect coord space).
 *
 * The check is indirect via the canvas's reveal-percentage aria
 * suffix: a small rectangle drag in hex mode flips a measurable
 * fraction of fog cells, AND the resulting reveal pattern doesn't
 * collapse to ~0 (the pre-134 hex-coord-as-rect-coord bug pattern
 * — where painting hex(2, 3) → hex(5, 7) only flipped a few rect
 * cells in the upper-left of the canvas because hex coords near
 * the origin map to small rect-coord values).
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

async function setRectangleFog(page: Page) {
  // Default is rectangle, but ensure it explicitly.
  const rectBtn = page.locator('button', { hasText: 'Rect' }).first();
  if (await rectBtn.isVisible()) await rectBtn.click();
}

async function getFogRevealedPct(page: Page): Promise<number> {
  const label = await page.locator('#canvas').getAttribute('aria-label');
  const m = label?.match(/(\d+)% of fog revealed/);
  return m ? Number(m[1]) : 0;
}

test.describe('Phase 134 — hex fog rectangle mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await selectHexGrid(page);
    await page.keyboard.press('r');
    await setRectangleFog(page);
  });

  test('rectangle drag in hex mode flips a meaningful number of cells', async ({
    page,
  }) => {
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    // Drag a rectangle covering roughly 30% of the canvas area.
    const x1 = box.x + box.width * 0.25;
    const y1 = box.y + box.height * 0.25;
    const x2 = box.x + box.width * 0.6;
    const y2 = box.y + box.height * 0.6;
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    await page.mouse.move(x2, y2, { steps: 5 });
    await page.mouse.up();

    await expect.poll(() => getFogRevealedPct(page)).toBeGreaterThan(5);
  });
});

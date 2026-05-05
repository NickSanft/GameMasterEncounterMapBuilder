/**
 * Phase 168 — right-click "Distance to…" smoke test.
 *
 * Validates the menu entry appears on a token's right-click menu.
 * The actual measurement flow is announced via `aria-live`; the
 * announcement isn't a stable assertion target across themes /
 * timing, so we focus on the menu wiring here.
 */
import { test, expect, type Page } from '@playwright/test';

async function placeTokenAtCenter(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe('Phase 168 — distance to token', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('right-clicking a token shows a "Distance to…" menu item', async ({
    page,
  }) => {
    await placeTokenAtCenter(page);
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
      button: 'right',
    });
    await expect(
      page.getByRole('menuitem', { name: /Distance to/i }),
    ).toBeVisible();
  });
});

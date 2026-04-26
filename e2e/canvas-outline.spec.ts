/**
 * Phase 87 — visually-hidden ARIA outline of the canvas state.
 *
 * The outline is sr-only by design (clip + position absolute), so
 * it's invisible to a sighted user but lives in the accessibility
 * tree. Playwright's accessibility-tree assertions are flaky cross-
 * browser; this spec instead asserts on the DOM directly (the
 * outline is in `document.body` whether visible or not).
 */
import { test, expect, type Page } from '@playwright/test';

async function placeTokenAt(
  page: Page,
  fracX: number,
  fracY: number,
): Promise<void> {
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width * fracX, box.y + box.height * fracY);
}

test.describe('Phase 87 — canvas outline (a11y region)', () => {
  test('mounts a hidden region with the right ARIA attributes', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const outline = page.locator('aside.canvas-outline');
    await expect(outline).toHaveAttribute('role', 'region');
    await expect(outline).toHaveAttribute('aria-label', 'Canvas outline');
    await expect(outline).toHaveAttribute('aria-live', 'polite');

    // sr-only class — visually hidden but in the a11y tree.
    await expect(outline).toHaveClass(/sr-only/);
  });

  test('starts with "Canvas is empty" + populates as tokens are added', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const outline = page.locator('aside.canvas-outline');
    await expect(outline).toContainText('Canvas is empty');

    await page.keyboard.press('t');
    await placeTokenAt(page, 0.4, 0.4);

    // Allow the 120 ms render debounce to settle, then assert.
    await expect(outline).toContainText(/Token/, { timeout: 5_000 });
    await expect(outline).not.toContainText('Canvas is empty');
  });

  test('marks the active selection with "(selected)"', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('t');
    await placeTokenAt(page, 0.4, 0.4);

    // Phase 86 keyboard cycle to select the token.
    await page.keyboard.press('s');
    await page.mouse.click(20, 20);
    await page.keyboard.press('Tab');

    // sr-only — toBeVisible returns false (1x1 clipped). Assert on
    // count + text content instead.
    const outline = page.locator('aside.canvas-outline');
    await expect(outline.locator('li[aria-current="true"]')).toHaveCount(1, {
      timeout: 5_000,
    });
    await expect(outline).toContainText('(selected)');
  });
});

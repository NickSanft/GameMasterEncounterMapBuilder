/**
 * Phase 103 — touch long-press → context menu.
 *
 * Validates that holding a single finger on the canvas for ~500 ms
 * opens the same context menu desktop GMs reach via right-click.
 * Synthesizes raw `PointerEvent` instances rather than going through
 * Playwright's `touchscreen.tap()` (which only fires a brief tap, not
 * a hold). Uses a Pixel-5 emulated device so `hasTouch: true` and
 * the canvas behavior matches a real tablet.
 */
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 5'] });

test.describe('Phase 103 — touch long-press context menu', () => {
  test('500 ms hold opens the context menu at the touchdown point', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const tx = Math.round(box.x + box.width * 0.5);
    const ty = Math.round(box.y + box.height * 0.5);

    // Dispatch the touch pointerdown directly. Then wait past the
    // 500 ms hold threshold and assert the context menu appeared.
    await page.evaluate(
      ([x, y]) => {
        const canvas = document.getElementById('canvas')!;
        canvas.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerId: 1,
            pointerType: 'touch',
            bubbles: true,
            cancelable: true,
            clientX: x as number,
            clientY: y as number,
          }),
        );
      },
      [tx, ty],
    );

    // Default hold is 500 ms; allow generous slack for slow CI runners.
    await expect(page.locator('.context-menu')).toBeVisible({ timeout: 2_500 });
    await expect(page.locator('.context-menu')).toContainText(/Fit to screen/i);
  });

  test('moving the finger past the threshold cancels the long-press', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const tx = Math.round(box.x + box.width * 0.5);
    const ty = Math.round(box.y + box.height * 0.5);

    // pointerdown then a big move, well before the hold timer would fire.
    await page.evaluate(
      ([x, y]) => {
        const canvas = document.getElementById('canvas')!;
        canvas.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerId: 2,
            pointerType: 'touch',
            bubbles: true,
            clientX: x as number,
            clientY: y as number,
          }),
        );
        canvas.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerId: 2,
            pointerType: 'touch',
            bubbles: true,
            clientX: (x as number) + 80,
            clientY: y as number,
          }),
        );
      },
      [tx, ty],
    );

    // Wait past the would-be hold deadline; the menu must NOT appear.
    await page.waitForTimeout(800);
    await expect(page.locator('.context-menu')).toHaveCount(0);
  });

  test('lifting the finger before 500 ms cancels the long-press', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const tx = Math.round(box.x + box.width * 0.5);
    const ty = Math.round(box.y + box.height * 0.5);

    await page.evaluate(
      ([x, y]) => {
        const canvas = document.getElementById('canvas')!;
        canvas.dispatchEvent(
          new PointerEvent('pointerdown', {
            pointerId: 3,
            pointerType: 'touch',
            bubbles: true,
            clientX: x as number,
            clientY: y as number,
          }),
        );
        // Lift well before the 500 ms hold timer.
        canvas.dispatchEvent(
          new PointerEvent('pointerup', {
            pointerId: 3,
            pointerType: 'touch',
            bubbles: true,
            clientX: x as number,
            clientY: y as number,
          }),
        );
      },
      [tx, ty],
    );

    await page.waitForTimeout(800);
    await expect(page.locator('.context-menu')).toHaveCount(0);
  });
});

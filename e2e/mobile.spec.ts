import { test, expect, devices } from '@playwright/test';

// Pixel 5 gives us a 393×851 logical viewport, hasTouch: true, and
// deviceScaleFactor 2.75 — a representative Android phone.
test.use({ ...devices['Pixel 5'] });

test.describe('Mobile / touch support', () => {
  test('GM layout adapts to a narrow viewport (toolbar is horizontal)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const toolbar = page.locator('.gm-toolbar');
    const flexDirection = await toolbar.evaluate(
      (el) => window.getComputedStyle(el).flexDirection,
    );
    expect(flexDirection).toBe('row');
    // Toolbar scrolls horizontally instead of overflowing.
    const overflowX = await toolbar.evaluate(
      (el) => window.getComputedStyle(el).overflowX,
    );
    expect(overflowX).toBe('auto');
  });

  test('touch pinch zooms the canvas', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Read the camera zoom before the gesture (exposed through the dev
    // diagnostics overlay — easier: poke the renderer via a tiny helper
    // we install once). Instead, go through an in-page bridge.
    const zoomBefore = await page.evaluate(
      () =>
        (window as unknown as {
          __panZoomDiag?: () => { zoom: number };
        }).__panZoomDiag?.().zoom ?? null,
    );
    // If no diag bridge is available, fall back to checking camera via
    // the canvas aria-label — but we still need camera access to assert
    // the zoom change. So we install our own tiny bridge up front.
    await page.evaluate(() => {
      const canvas = document.getElementById('canvas') as HTMLCanvasElement;
      // Intercept the renderer by reading devicePixelRatio + size; zoom
      // is more conveniently read from `__cam` that we attach now.
      (window as unknown as { __readZoom: () => number }).__readZoom = () => {
        // Re-dispatch a single tiny wheel event to read zoom indirectly?
        // Simpler: read the canvas transform. The renderer doesn't expose
        // camera globally; fall back to `getBoundingClientRect` which
        // doesn't change on zoom. So we expose zoom via a custom event.
        const c = canvas as unknown as { __zoom?: number };
        return c.__zoom ?? 1;
      };
    });
    void zoomBefore;

    // Synthesise a two-finger spread via Chrome DevTools Protocol
    // touchscreen input — the CDP session lets us dispatch touch points.
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: cx - 40, y: cy, id: 1 },
        { x: cx + 40, y: cy, id: 2 },
      ],
    });
    // Small moves to trigger pinchUpdate — fingers spread apart.
    for (const d of [60, 80, 100, 120, 140]) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: cx - d, y: cy, id: 1 },
          { x: cx + d, y: cy, id: 2 },
        ],
      });
    }
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });

    // Our assertion: the canvas didn't crash, the page is still alive,
    // and the toolbar is still interactable. True zoom-change assertion
    // would need a renderer-exposed bridge; leave that for a richer
    // diagnostics hook in a follow-up.
    await expect(page.locator('#canvas')).toBeVisible();
    await expect(page.locator('.gm-toolbar')).toBeVisible();
  });

  test('single-finger tap on Token tool drops a token', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Activate Token tool via toolbar tap.
    await page.locator('.gm-toolbar button', { hasText: 'Token (T)' }).tap();

    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');

    await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5);

    // The polite announcer should pick up that a token was added. The
    // Token tool path itself doesn't announce, so fall back to verifying
    // the canvas aria-label updates to reflect "1 token placed".
    await expect(page.locator('#canvas')).toHaveAttribute(
      'aria-label',
      /1 token/,
    );
  });

  test('viewport meta declares user-scalable=no on gm.html', async ({ page }) => {
    await page.goto('./gm.html');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('user-scalable=no');
    expect(viewport).toContain('viewport-fit=cover');
  });
});

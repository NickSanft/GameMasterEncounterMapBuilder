import { test, expect } from '@playwright/test';

test.describe('Fog WebWorker', () => {
  test('GM page boots without console errors related to the fog worker', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // Give the worker a moment to register + respond to the initial
    // refreshFogRects() call.
    await page.waitForTimeout(200);

    expect(errors.filter((e) => /fog/i.test(e))).toEqual([]);
  });

  test('fog reveal flow still functions (drag with Reveal tool changes fog state)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Switch to Reveal tool (R) and drag across a cell range.
    await page.keyboard.press('r');

    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const x1 = box.x + box.width * 0.3;
    const y1 = box.y + box.height * 0.4;
    const x2 = box.x + box.width * 0.6;
    const y2 = box.y + box.height * 0.6;
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    await page.mouse.move(x2, y2, { steps: 4 });
    await page.mouse.up();

    // The canvas aria-label includes "X% of fog revealed". After the
    // drag the percentage must move off zero.
    await expect(page.locator('#canvas')).toHaveAttribute(
      'aria-label',
      /[1-9]\d*% of fog revealed/,
    );
  });

  test('a dedicated fog-worker chunk is built into dist/', async ({ page }) => {
    // The chunk filename is hashed but matches `fog-worker-*.js`. Pull
    // the network log: any successful response with that filename
    // pattern proves the worker module shipped.
    const requests: string[] = [];
    page.on('request', (req) => requests.push(req.url()));

    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // Workers boot lazily after the main module loads.
    await page.waitForTimeout(300);

    const fogWorkerHits = requests.filter((u) => /fog-worker-[\w-]+\.js/.test(u));
    expect(fogWorkerHits.length).toBeGreaterThan(0);
  });
});

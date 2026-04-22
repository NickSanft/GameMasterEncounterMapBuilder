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
    // The worker is constructed lazily — only when the grid is large
    // enough to warrant worker round-trip OR when LoS is enabled — so we
    // can't reliably observe the worker URL on the network log of a
    // default-grid + losMode-off boot. Instead, scrape the served HTML
    // for the GM entry's compiled JS and grep it for the worker chunk
    // filename Vite stamped in. That proves the chunk SHIPS regardless
    // of whether it's instantiated this session.
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // The fog-worker URL is stamped into whichever chunk Vite chose to
    // wrap the `?worker` import — that's typically the shared chunk
    // (which the entry script doesn't reference by name in its source,
    // only via static `import`s the browser resolves transparently).
    // BFS through the import graph: start with the entry <script src>s,
    // greedy-grep their bodies for any `assets/<hash>.js` URL, fetch
    // those too, until we find a `fog-worker-<hash>.js` reference or
    // run out of unvisited chunks.
    const seedUrls = await page.locator('script[src]').evaluateAll((els) =>
      els.map((el) => (el as HTMLScriptElement).src),
    );
    expect(seedUrls.length).toBeGreaterThan(0);

    const visited = new Set<string>();
    const queue: string[] = [...seedUrls];
    let foundReference = false;
    let iterations = 0;
    while (queue.length > 0 && !foundReference && iterations < 20) {
      iterations++;
      const url = queue.shift()!;
      if (visited.has(url)) continue;
      visited.add(url);
      const response = await page.request.get(url);
      if (!response.ok()) continue;
      const body = await response.text();
      if (/fog-worker-[\w-]+\.js/.test(body)) {
        foundReference = true;
        break;
      }
      // Discover further hashed-chunk URLs referenced inside. Vite's
      // ES-module imports usually look like `from"./los-compose-XYZ.js"`
      // (relative to the chunk's own URL) but absolute paths under the
      // base also appear in worker constructor strings.
      const refs =
        body.match(/(?:\.\.?\/|\/[\w-/]*\/)?[\w-]+-[\w-]{6,}\.js/g) ?? [];
      for (const ref of refs) {
        try {
          const abs = new URL(ref, url).toString();
          if (!visited.has(abs)) queue.push(abs);
        } catch {
          /* malformed — skip */
        }
      }
    }
    expect(foundReference).toBe(true);
  });
});

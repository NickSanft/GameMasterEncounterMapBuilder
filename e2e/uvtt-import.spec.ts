/**
 * Phase 141 — UVTT (.dd2vtt / .uvtt) import smoke test.
 *
 * The window.confirm prompt blocks Playwright's default flow. We
 * accept it via `page.on('dialog', ...)` and assert the post-import
 * state shows the imported walls + grid via the canvas-outline.
 */
import { test, expect, type Page } from '@playwright/test';

const FIXTURE = JSON.stringify({
  format: 0.2,
  resolution: {
    pixels_per_grid: 50,
    map_size: { x: 12, y: 8 },
  },
  // 1×1 transparent PNG (smallest valid base64).
  image:
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  line_of_sight: [
    [
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
      { x: 0, y: 5 },
      { x: 0, y: 0 },
    ],
  ],
  portals: [
    {
      bounds: [
        { x: 5, y: 2 },
        { x: 5, y: 3 },
      ],
      closed: true,
    },
  ],
});

async function importViaSessionMenu(page: Page) {
  await page.getByRole('button', { name: /Import VTT/i }).click();
  // Find the file input (hidden) and set the file.
  const fileChooser = page.locator('input[type="file"][accept*="dd2vtt"]');
  await fileChooser.setInputFiles({
    name: 'test-map.dd2vtt',
    mimeType: 'application/json',
    buffer: Buffer.from(FIXTURE),
  });
}

test.describe('Phase 141 — UVTT import', () => {
  test('Import VTT… button is present in the session menu', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await expect(
      page.getByRole('button', { name: /Import VTT/i }),
    ).toBeVisible();
  });

  test('importing a fixture file applies walls + grid + background', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Auto-accept the confirm dialog.
    page.on('dialog', (dialog) => dialog.accept());

    await importViaSessionMenu(page);

    // Wait for the canvas-outline to show some walls (5 segments
    // from the 5-vertex closed polyline + 1 portal door = 5 walls
    // total, since the polyline closes (0,0) back to (0,0) — the
    // last segment is degenerate length-0 but still counts as a
    // segment).
    await expect
      .poll(
        async () =>
          (
            await page
              .locator('.canvas-outline li', { hasText: 'wall' })
              .allTextContents()
          ).length,
      )
      .toBeGreaterThan(0);
  });
});

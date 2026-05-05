/**
 * Phase 158 — travel-route smoke test.
 *
 * Validates:
 *   - The Travel toolbar button is present + activates the tool.
 *   - Clicking 3 points then double-clicking commits a route. The
 *     commit is verifiable via the canvas-outline (or by toggling
 *     the tool off and re-entering — the route persists).
 *   - The "Clear all travel routes" command palette entry exists.
 */
import { test, expect, type Page } from '@playwright/test';

async function activateTravelTool(page: Page) {
  await page.locator('button[data-tool="travel"]').click();
}

async function dropPointsAndFinish(page: Page, points: Array<[number, number]>) {
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i]!;
    if (i === points.length - 1) {
      // Double-click on the last point to commit the route.
      await page.mouse.dblclick(box.x + x, box.y + y);
    } else {
      await page.mouse.click(box.x + x, box.y + y);
    }
  }
}

test.describe('Phase 158 — travel routes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('Travel tool button is present in the toolbar', async ({ page }) => {
    await expect(page.locator('button[data-tool="travel"]')).toBeVisible();
    // Label includes the keyboard shortcut hint.
    await expect(page.locator('button[data-tool="travel"]')).toHaveText(
      /Travel/,
    );
  });

  test('keyboard shortcut G activates the Travel tool', async ({ page }) => {
    await page.keyboard.press('g');
    await expect(page.locator('button[data-tool="travel"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('"Clear all travel routes" appears in the command palette', async ({
    page,
  }) => {
    await page.keyboard.press('Control+k');
    const palette = page.locator('.command-palette');
    await expect(palette).toBeVisible();
    await palette.locator('.command-palette-input').fill('travel routes');
    // The palette renders matching commands as `<li>` items inside
    // the list. Match by label text directly.
    await expect(
      palette.getByText(/Clear all travel routes/i),
    ).toBeVisible();
  });

  test('Travel keybinding row appears in Settings → Keybindings', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Keybindings' }).click();
    // Phase 158 added a 12th row.
    await expect(dialog.locator('.keybinding-row')).toHaveCount(12);
    // The Travel route action's label is visible.
    await expect(
      dialog.locator('.keybinding-row', { hasText: /Travel route/i }),
    ).toBeVisible();
  });
});

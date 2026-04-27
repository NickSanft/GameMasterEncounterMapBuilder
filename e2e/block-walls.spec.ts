/**
 * Phase 112 — block walls.
 *
 * Validates the new authoring flow end-to-end:
 *   - The Walls tool's settings panel shows a Lines / Block toggle.
 *   - In Block mode, drag-to-create produces a wall whose right-click
 *     surfaces "Wall actions" (proves it landed in state.walls).
 *   - Default mode is Lines (the original click-vertex chain still
 *     works after a fresh page load).
 *   - Switching back to Lines after authoring a block keeps the
 *     line-drawing path working.
 */
import { test, expect, type Page } from '@playwright/test';

async function activateWalls(page: Page) {
  await page.keyboard.press('w');
  await expect(page.locator('[data-announcer="polite"]')).toHaveText(
    /Walls tool active/,
  );
}

async function selectBlockMode(page: Page) {
  await page
    .locator('.walls-settings button', { hasText: 'Block' })
    .click();
  await expect(
    page.locator('.walls-settings button.active', { hasText: 'Block' }),
  ).toBeVisible();
}

test.describe('Phase 112 — block walls', () => {
  test('Walls settings panel exposes a Lines / Block toggle', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await activateWalls(page);
    const panel = page.locator('.walls-settings');
    await expect(panel).toBeVisible();
    await expect(panel.locator('button', { hasText: 'Lines' })).toBeVisible();
    await expect(panel.locator('button', { hasText: 'Block' })).toBeVisible();
    // Lines is the default + active.
    await expect(
      panel.locator('button.active', { hasText: 'Lines' }),
    ).toBeVisible();
  });

  test('Block mode: drag creates a block wall (right-click → Wall actions)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await activateWalls(page);
    await selectBlockMode(page);

    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width * 0.5;
    const cy = box.y + box.height * 0.5;

    // Drag a small rectangle (10–20 px is enough to span at least one cell
    // at the default 50 px grid + a few cells either side at higher zooms).
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 80, cy + 80, { steps: 5 });
    await page.mouse.up();

    // Switch to Select so right-click hit-tests the placed block.
    await page.keyboard.press('s');
    await page.mouse.click(cx + 40, cy + 40, { button: 'right' });

    // The context menu's aria-label is "Wall actions" when the right-
    // click hit a wall (Phase 54 + Phase 85). Same handler works for
    // block walls — they go through hitTestWalls just like segments.
    await expect(
      page.getByRole('menu', { name: 'Wall actions' }),
    ).toBeVisible();
    // Dismiss the menu before next test.
    await page.keyboard.press('Escape');
  });

  test('switching back to Lines restores click-vertex authoring', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await activateWalls(page);
    await selectBlockMode(page);

    // Switch back to Lines.
    await page
      .locator('.walls-settings button', { hasText: 'Lines' })
      .click();
    await expect(
      page.locator('.walls-settings button.active', { hasText: 'Lines' }),
    ).toBeVisible();

    // Now click two vertices — this should produce a segment wall.
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const x1 = box.x + box.width * 0.4;
    const y1 = box.y + box.height * 0.5;
    const x2 = box.x + box.width * 0.6;
    const y2 = box.y + box.height * 0.5;
    await page.mouse.click(x1, y1);
    await page.mouse.click(x2, y2);
    await page.keyboard.press('Escape');

    // Right-click the segment midpoint → Wall actions menu.
    await page.keyboard.press('s');
    await page.mouse.click((x1 + x2) / 2, y1, { button: 'right' });
    await expect(
      page.getByRole('menu', { name: 'Wall actions' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
